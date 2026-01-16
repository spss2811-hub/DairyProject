const mongoose = require('mongoose');

exports.DairySale = mongoose.model('DairySale', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, customerName: String, qty: Number, rate: Number, amount: Number
}));

exports.LocalSale = mongoose.model('LocalSale', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, saleUnit: String,
  customerId: String, customerName: String, customerCategory: String,
  deliveryBoyId: String, qtyType: String,
  qty: Number, rate: Number, amount: Number,
  fat: Number, clr: Number, snf: Number
}));

exports.Sale = mongoose.model('Sale', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, customerId: String, qty: Number, rate: Number, amount: Number
}));

exports.Transaction = mongoose.model('Transaction', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, type: String, category: String, description: String, amount: Number
}));

// Placeholder for future if needed
exports.CommonSaleRate = mongoose.model('CommonSaleRate', new mongoose.Schema({
  id: { type: String, unique: true },
  name: String, rate: Number
}));

exports.IndividualSaleRate = mongoose.model('IndividualSaleRate', new mongoose.Schema({
  id: { type: String, unique: true },
  customerId: String, rate: Number
}));
