const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Exhibition = sequelize.define('Exhibition', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:       { type: DataTypes.STRING,  allowNull: false, validate: { notEmpty: true, len: [1, 255] } },
  description: { type: DataTypes.TEXT,    defaultValue: '' },
  date:        { type: DataTypes.DATE,    allowNull: false },
  location:    { type: DataTypes.STRING,  allowNull: true },
  order:       { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'exhibitions',
  timestamps: true
});

module.exports = Exhibition;
