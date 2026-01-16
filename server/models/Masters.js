const mongoose = require('mongoose');

exports.Branch = mongoose.model('Branch', new mongoose.Schema({
  id: { type: String, unique: true },
  branchCode: String, branchName: String, shortName: String,
  address: String, contactPerson: String, mobile: String
}));

exports.MilkRoute = mongoose.model('MilkRoute', new mongoose.Schema({
  id: { type: String, unique: true },
  routeCode: String, routeName: String, description: String, branchId: String
}));

exports.DeliveryBoy = mongoose.model('DeliveryBoy', new mongoose.Schema({
  id: { type: String, unique: true },
  name: String, mobile: String, address: String
}));

exports.BillPeriod = mongoose.model('BillPeriod', new mongoose.Schema({
  id: { type: String, unique: true },
  name: String, startDay: String, endDay: String
}));

exports.LockedPeriod = mongoose.model('LockedPeriod', new mongoose.Schema({
  periodId: String // Just storing the ID string e.g. "0-2026-1"
}));

exports.AdditionsDeduction = mongoose.model('AdditionsDeduction', new mongoose.Schema({
  id: { type: String, unique: true },
  headName: String, type: String, defaultValue: Number,
  farmerId: String, billPeriod: String, description: String, details: String
}));

exports.AccountHead = mongoose.model('AccountHead', new mongoose.Schema({
  id: { type: String, unique: true },
  name: String, type: String // Income/Expense
}));
