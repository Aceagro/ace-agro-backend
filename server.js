require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer'); // Add Nodemailer

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Connect to MongoDB using .env
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err.message));

// Define Order Schema
const orderSchema = new mongoose.Schema({
  orderId: String, // Added orderId field
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
    user: process.env.EMAIL_USER, // Use email from .env
    pass: process.env.EMAIL_PASS, // Use App Password from .env
  },
});

// API Endpoint to Save Order and Send Email
app.post('/api/orders', async (req, res) => {
  try {
    const { orderId, name, email, address, city, pincode, mobile, cartItems, totalAmount, paymentId } = req.body;
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
    console.log('Order saved:', order); // Debug log

    // Prepare email content
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

    // Send email to both Ace Agro Tech and customer
    await transporter.sendMail({
      from: '"Ace Agro Tech" <' + process.env.EMAIL_USER + '>',
      to: ['contact.ace.agro@gmail.com', email],
      subject: 'Order Confirmation - Ace Agro Tech',
      text: emailContent,
    });

    console.log('Email sent successfully');
    res.status(201).json({ message: 'Order saved successfully', order });
  } catch (error) {
    console.error('Error saving order or sending email:', error.message); // Debug log
    res.status(500).json({ message: 'Error saving order or sending email', error: error.message });
  }
});

// Start the Server with Error Handling
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try changing PORT in .env to another value (e.g., 5001).`);
  } else {
    console.error('Server startup error:', err.message);
  }
});