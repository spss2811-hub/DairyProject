const mongoose = require('mongoose');

const slabSchema = new mongoose.Schema({
  minFat: Number, maxFat: Number,
  minSnf: Number, maxSnf: Number,
  minQty: Number, maxQty: Number,
  rate: Number,
  method: String,
  fromDate: String, toDate: String,
  fromShift: String, toShift: String
});

const rateConfigSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  fromDate: String,
  toDate: String,
  fromShift: String,
  toShift: String,
  purchaseMethod: String, // 'formula', 'kg_fat', 'liter'
  
  standardFat: Number,
  standardSnf: Number,
  standardRate: Number,
  kgFatRate: Number,
  minFat: Number,
  minSnf: Number,
  
  cartagePerLiter: Number,
  fixedCartagePerShift: Number,
  
  extraRate: Number, // Flat extra

  // Global Defaults
  fatIncThreshold: Number, fatIncMethod: String, fatIncRate: Number,
  fatIncFromDate: String, fatIncToDate: String, fatIncFromShift: String, fatIncToShift: String,

  fatDedThreshold: Number, fatDedMethod: String, fatDedRate: Number,
  fatDedFromDate: String, fatDedToDate: String, fatDedFromShift: String, fatDedToShift: String,

  snfIncThreshold: Number, snfIncMethod: String, snfIncRate: Number,
  snfIncFromDate: String, snfIncToDate: String, snfIncFromShift: String, snfIncToShift: String,

  snfDedThreshold: Number, snfDedMethod: String, snfDedRate: Number,
  snfDedFromDate: String, snfDedToDate: String, snfDedFromShift: String, snfDedToShift: String,

  qtyIncThreshold: Number, qtyIncMethod: String, qtyIncRate: Number,
  qtyIncFromDate: String, qtyIncToDate: String, qtyIncFromShift: String, qtyIncToShift: String,

  // Slabs
  fatIncentiveSlabs: [slabSchema],
  fatDeductionSlabs: [slabSchema],
  snfIncentiveSlabs: [slabSchema],
  snfDeductionSlabs: [slabSchema],
  qtyIncentiveSlabs: [slabSchema],
  bonusSlabs: [slabSchema],
  
  // For 'liter' method chart
  baseRates: [{ fat: Number, snf: Number, rate: Number }]
});

module.exports = mongoose.model('RateConfig', rateConfigSchema);
