const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Painting = sequelize.define('Painting', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:       { type: DataTypes.STRING,  allowNull: false, validate: { notEmpty: true, len: [1, 255] } },
  // medium is nullable — not every piece has a recorded medium
  medium:      { type: DataTypes.STRING,  allowNull: true },
  year:        { type: DataTypes.STRING,  allowNull: false },
  imageurl:    { type: DataTypes.STRING,  allowNull: true },
  // PostgreSQL native array column. Using GIN index below for O(1) containment checks.
  categories:  { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  description: { type: DataTypes.TEXT,    defaultValue: '' },
  price:       { type: DataTypes.DECIMAL(10, 2), validate: { min: 0 } },
  isavailable: { type: DataTypes.BOOLEAN, defaultValue: true },
  // "order" is a reserved SQL word — Sequelize quotes it automatically, but we
  // make the mapping explicit so it's obvious when reading the model.
  order:       { type: DataTypes.INTEGER, defaultValue: 0, field: 'order' },
  featured:    { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'paintings',
  timestamps: true,
  indexes: [
    // GIN index makes `categories @> ARRAY[...]` containment queries fast.
    { fields: ['categories'], using: 'gin' },
    { fields: ['year'] },
    { fields: ['isavailable'] }
  ]
});

module.exports = Painting;
