const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  cartItems: [
    {
      productId: String,
      name: String,
      quantity: Number
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
