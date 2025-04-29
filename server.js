require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit if connection fails
  });

// Define Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  name: String,
  email: String,
  address: String,
  city: String,
  pincode: String,
  mobile: String,
  cartItems: [
    {
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  totalAmount: Number,
  paymentId: String,
  orderDate: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// API Endpoint to Save Order
app.post('/api/orders', async (req, res) => {
  try {
    const { orderId, name, email, address, city, pincode, mobile, cartItems, totalAmount, paymentId } = req.body;

    // Validate required fields
    if (!orderId || !name || !email || !address || !city || !pincode || !mobile || !cartItems || !totalAmount || !paymentId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: 'Database connection error' });
    }

    const order = new Order({
      orderId,
      name,
      email,
      address,
      city,
      pincode,
      mobile,
      cartItems,
      totalAmount,
      paymentId,
    });
    await order.save();
    console.log('Order saved:', order);

    // Send email
    try {
      const emailContent = `
        Order Confirmation - Ace Agro Tech

        Order ID: ${orderId}
        Name: ${name}
        Email: ${email}
        Address: ${address}
        City: ${city}
        Pincode: ${pincode}
        Mobile: ${mobile}

        Cart Items:
        ${cartItems.map(item => `- ${item.name}: ₹${item.price} x ${item.quantity}`).join('\n')}

        Total Amount: ₹${totalAmount}
        Payment ID: ${paymentId}

        Thank you for your purchase!
      `;

      await transporter.sendMail({
        from: '"Ace Agro Tech" <' + process.env.EMAIL_USER + '>',
        to: ['contact.ace.agro@gmail.com', email],
        subject: 'Order Confirmation - Ace Agro Tech',
        text: emailContent,
      });
      console.log('Email sent successfully');
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      // Continue despite email failure
    }

    res.status(201).json({ message: 'Order saved successfully', order });
  } catch (error) {
    if (error.name === 'ValidationError') {
      console.error('Validation error:', error.message);
      res.status(400).json({ message: 'Validation error', error: error.message });
    } else {
      console.error('Error saving order:', error.message);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
});

// Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try changing PORT in .env to another value (e.g., 5001).`);
  } else {
    console.error('Server startup error:', err.message);
  }
});