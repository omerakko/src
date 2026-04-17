const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ExhibitionPhoto = sequelize.define('ExhibitionPhoto', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  exhibitionId:{ type: DataTypes.INTEGER, allowNull: false },
  title:       { type: DataTypes.STRING,  allowNull: true },
  imageurl:    { type: DataTypes.STRING,  allowNull: false },
  order:       { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'exhibition_photos',
  timestamps: true
});

module.exports = ExhibitionPhoto;
