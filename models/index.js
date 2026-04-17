/**
 * Central model registry.
 *
 * Associations live here — not inside the model files — to avoid circular
 * imports. (Painting would need ExhibitionPhoto, ExhibitionPhoto would need
 * Exhibition, Exhibition would need ExhibitionPhoto, etc.)
 *
 * Any file that needs models imports from here, never from the individual
 * model files directly.
 */
const Painting       = require('./Painting');
const Exhibition     = require('./Exhibition');
const ExhibitionPhoto = require('./ExhibitionPhoto');

Exhibition.hasMany(ExhibitionPhoto, {
  foreignKey: 'exhibitionId',
  as: 'photos',
  // Cascade deletes so removing an exhibition also removes its photos from
  // the DB. We still clean up the image files manually before the DB delete.
  onDelete: 'CASCADE'
});

ExhibitionPhoto.belongsTo(Exhibition, {
  foreignKey: 'exhibitionId',
  as: 'exhibition'
});

module.exports = { Painting, Exhibition, ExhibitionPhoto };
