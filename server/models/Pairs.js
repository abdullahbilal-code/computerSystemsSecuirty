const mongoose = require('mongoose');

const PairSchema = new mongoose.Schema({
  a: { type: String, required: true }, 
  b: { type: String, required: true },
  verified: { type: Boolean, default: false },
  otpHash: { type: String, default: null },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

PairSchema.index({ a: 1, b: 1 }, { unique: true });

module.exports = mongoose.model('Pair', PairSchema);