const Order = require('../models/Order');

exports.createOrder = async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.status(201).json({ message: 'Order saved successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save order.', error });
  }
};
