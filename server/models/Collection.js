const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  date: String,
  shift: String,
  farmerId: String,
  qtyKg: Number,
  qty: Number, // Liters
  fat: Number,
  snf: Number,
  clr: Number,
  kgFat: Number,
  kgSnf: Number,
  rate: Number,
  amount: Number,
  milkValue: Number,
  
  // Breakdown
  fatIncentive: Number,
  fatDeduction: Number,
  snfIncentive: Number,
  snfDeduction: Number,
  extraRateAmount: Number,
  cartageAmount: Number,
  qtyIncentiveAmount: Number,
  bonusAmount: Number
});

module.exports = mongoose.model('Collection', collectionSchema);
