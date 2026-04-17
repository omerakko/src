const { Sequelize } = require('sequelize');

/**
 * Single shared Sequelize instance for the whole application.
 *
 * Keeping this in its own module means every model and route imports the
 * same connection pool instead of each creating their own — a common
 * mistake that quietly exhausts DB connections under load.
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  // Only log queries in development; query logs expose data and are noise in prod.
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,    // keep small — most Node apps don't need more
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;
