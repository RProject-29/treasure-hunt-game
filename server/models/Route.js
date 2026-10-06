const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeId: { type: String, required: true, unique: true }, // 'A', 'B', or 'C'
  name: { type: String, required: true }, // 'Mystery', 'Shadow', 'Legacy'
  routeDescription: { type: String, required: false }, // Card clue for the route
  clues: [{
    step: { type: Number, required: true }, // 1 to 6
    text: { type: String, required: false },
    qrToken: { type: String, required: false }, // The physical QR code token needed to unlock the next step
    qrImageBase64: { type: String, required: false }, // The original QR image uploaded by Admin
    mapImageUrl: { type: String, required: false }, // Image URL for the map piece (can also be base64 data URL)
    mapImageBase64: { type: String, required: false } // Stored base64 image data for map
  }]
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
