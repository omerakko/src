/**
 * server.js — Entry point.
 *
 * Responsibilities: load env, authenticate DB, sync schema in dev, start
 * listening. Nothing else. All application logic lives in app.js and below.
 */
require('dotenv').config();

const app      = require('./app');
const sequelize = require('./db');

// Importing models/index.js registers all model definitions and associations
// with the shared Sequelize instance before we attempt to sync or query.
require('./models');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[db] Connected to PostgreSQL');

    if (process.env.NODE_ENV === 'development') {
      // alter:true updates existing columns to match the model definition.
      // Never use this in production — it can silently drop data. Run proper
      // migrations instead (e.g. sequelize-cli).
      await sequelize.sync({ alter: true });
      console.log('[db] Schema synchronized (development)');
    }

    app.listen(PORT, () => {
      console.log(`[server] Listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

// Give open connections a chance to finish before the process exits.
process.on('SIGINT', async () => {
  console.log('[server] Shutting down...');
  await sequelize.close();
  process.exit(0);
});

start();
