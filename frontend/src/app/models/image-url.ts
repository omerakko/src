/**
 * Maps an uploaded image's URL to the backend's resized-WebP endpoint
 * (see lib/imageVariants.js). Anything that isn't one of our uploads is
 * returned untouched.
 */
export type ImageWidth = 480 | 960 | 1600;
export const IMAGE_WIDTHS: readonly ImageWidth[] = [480, 960, 1600];

const OPTIMIZABLE = /^\/?assets\/(images|banner)\/([^/?#]+)$/;

/**
 * Older uploads have spaces in their names ("WhatsApp Image ….jpeg"). A space
 * is the separator inside srcset, so the name must be percent-encoded; the
 * server decodes it again before looking the file up.
 */
function variant(folder: string, file: string, width: ImageWidth): string {
  return `/img/${width}/${folder}/${encodeURIComponent(file)}`;
}

export function imageUrl(url: string | null | undefined, width: ImageWidth): string {
  const m = (url ?? '').match(OPTIMIZABLE);
  return m ? variant(m[1], m[2], width) : (url ?? '');
}

/** srcset with every width, or null (attribute omitted) for non-upload URLs. */
export function imageSrcset(url: string | null | undefined, widths: readonly ImageWidth[] = IMAGE_WIDTHS): string | null {
  const m = (url ?? '').match(OPTIMIZABLE);
  if (!m) return null;
  return widths.map(w => `${variant(m[1], m[2], w)} ${w}w`).join(', ');
}
