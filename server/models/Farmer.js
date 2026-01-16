const mongoose = require('mongoose');

const slabSchema = new mongoose.Schema({
  minFat: Number, maxFat: Number,
  minSnf: Number, maxSnf: Number,
  minQty: Number, maxQty: Number,
  rate: Number,
  method: String, // 'liter', 'kg_fat', 'kg_snf'
  fromDate: String, toDate: String,
  fromShift: String, toShift: String
});

const farmerSchema = new mongoose.Schema({
  id: { type: String, unique: true }, // Keep string ID for compatibility
  code: String,
  name: String,
  mobile: String,
  rateMethod: String,
  village: String,
  category: String,
  routeId: String,
  branchId: String,
  
  // Banking
  accountHolderName: String,
  bankName: String,
  branchName: String,
  accountNumber: String,
  ifscCode: String,

  // Rate Settings
  extraRateType: String,
  extraRateAmount: Number,
  extraFromDate: String, extraToDate: String,
  extraFromShift: String, extraToShift: String,

  cartageType: String,
  cartageAmount: Number,
  cartageFromDate: String, cartageToDate: String,
  cartageFromShift: String, cartageToShift: String,

  // Incentives/Deductions Global Overrides
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
  bonusSlabs: [slabSchema]
});

module.exports = mongoose.model('Farmer', farmerSchema);
