const mongoose = require('mongoose');

exports.MilkReceipt = mongoose.model('MilkReceipt', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, shift: String, fromBranch: String, toBranch: String,
  qty: Number, fat: Number, snf: Number, clr: Number
}));

exports.MilkDispatch = mongoose.model('MilkDispatch', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, shift: String, fromBranch: String, toBranch: String,
  qty: Number, fat: Number, snf: Number, clr: Number
}));

exports.MilkClosingBalance = mongoose.model('MilkClosingBalance', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, shift: String, branchId: String,
  qty: Number, fat: Number, snf: Number, clr: Number
}));

exports.MilkReconciliation = mongoose.model('MilkReconciliation', new mongoose.Schema({
  id: { type: String, unique: true },
  date: String, shift: String, branchId: String,
  systemQty: Number, physicalQty: Number, diffQty: Number, reason: String
}));
