const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamId: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  selectedRoute: { type: String, enum: ['A', 'B', 'C'], default: null },
  currentCheckpoint: { type: Number, default: 0 }, // 0 = start, 1 = QR1, 4 = Final
  isCompleted: { type: Boolean, default: false },
  startTime: { type: Date, default: null },
  completionTime: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
