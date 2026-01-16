const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  customerId: String, // Display ID
  name: String,
  mobile: String,
  place: String,
  category: String, // 'Local Sale', 'Door Delivery'
  deliveryBoyId: String,
  branchId: String,
  saleRate: Number,
  saleRateMethod: String, // 'Liters', 'Kgs'
  scheduleQty: Number,
  assignedBranches: [String] // Array of branch IDs
});

module.exports = mongoose.model('Customer', customerSchema);
