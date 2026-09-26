#!/usr/bin/env bash
# deploy.sh — Ship the current main branch to production (OVH VPS).
#
#   1. Build the Angular frontend locally (dist/ is gitignored, so it is uploaded separately)
#   2. Push main to GitHub
#   3. On the server: git pull, reinstall deps if package files changed,
#      swap in the new frontend build, pm2 restart
#   4. Smoke-test the live site
#
# Requires the "nilufer-prod" host alias in ~/.ssh/config (key-based auth).
# Usage (Git Bash, from src/):  ./deploy.sh
set -euo pipefail

SSH_HOST="nilufer-prod"
REMOTE_DIR="/var/www/Portfolio_NiluferOrel/src"
DIST_DIR="frontend/dist"
DIST_NAME="nilufer-orel-portfolio"   # contains browser/ (static files) and server/ (SSR bundle)
SITE_URL="https://orelnilufer.com"

cd "$(dirname "$0")"
step() { printf '\n==> %s\n' "$*"; }

step "Pre-flight checks"
branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "main" ] || { echo "Not on main (on '$branch'). Aborting."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Uncommitted changes — commit them first."; git status --short; exit 1; }
ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_HOST" true \
  || { echo "Cannot SSH to $SSH_HOST without a password. See the deploy setup notes."; exit 1; }

step "Building frontend"
(cd frontend && npm run build)

step "Pushing main to GitHub"
git push origin main

step "Uploading frontend build"
tar -C "$DIST_DIR" -czf - "$DIST_NAME" \
  | ssh "$SSH_HOST" "rm -rf '$REMOTE_DIR/$DIST_DIR/$DIST_NAME.new' && mkdir -p '$REMOTE_DIR/$DIST_DIR/$DIST_NAME.new' \
      && tar -xzf - -C '$REMOTE_DIR/$DIST_DIR/$DIST_NAME.new' --strip-components=1"

step "Updating server"
ssh "$SSH_HOST" bash -s <<EOF
set -euo pipefail
cd '$REMOTE_DIR'
before=\$(git rev-parse HEAD)
sudo -n git pull --ff-only origin main
if ! git diff --quiet "\$before" HEAD -- package.json package-lock.json; then
  echo "Dependencies changed — installing"
  sudo -n npm ci --omit=dev
fi
cd '$DIST_DIR'
rm -rf '$DIST_NAME.prev'
[ -d '$DIST_NAME' ] && mv '$DIST_NAME' '$DIST_NAME.prev'
mv '$DIST_NAME.new' '$DIST_NAME'
pm2 restart all
# Pre-generate resized image variants for anything new; skips existing ones.
cd '$REMOTE_DIR' && nohup node scripts/warm-image-cache.js > /tmp/warm-image-cache.log 2>&1 &
echo "Server now at \$(git -C '$REMOTE_DIR' log -1 --oneline)"
EOF

step "Smoke test"
sleep 3
code=$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL/")
api=$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL/api/paintings" || true)
map=$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL/sitemap.xml" || true)
echo "$SITE_URL/ -> $code   /api/paintings -> $api   /sitemap.xml -> $map"
[ "$code" = "200" ] || { echo "Site is not returning 200! Previous build kept at $DIST_NAME.prev on the server."; exit 1; }

# Server-rendered pages carry the painting grid in the HTML itself; an empty
# shell means SSR fell back to client rendering and Google sees no artworks.
if curl -s "$SITE_URL/paintings" | grep -q 'class="artwork-img"'; then
  echo "SSR OK: /paintings contains rendered artworks"
else
  echo "SSR CHECK FAILED: /paintings has no rendered artworks — check 'pm2 logs' on the server."; exit 1
fi

step "Deployed $(git log -1 --oneline)"
