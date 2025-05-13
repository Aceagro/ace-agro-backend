require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();

// Middleware
const corsOptions = {
  origin: 'https://aceagrotech.netlify.app', // Allow only your Netlify domain
  methods: ['GET', 'POST'], // Allow only GET and POST requests
  optionsSuccessStatus: 200 // For legacy browser support
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Connect to MongoDB with retry logic
const connectWithRetry = () => {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      console.log('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
    });
};
connectWithRetry();

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

// Load pin codes from CSV
const pinCodes = [];
fs.createReadStream('pin_codes.csv')
  .pipe(csv())
  .on('data', (row) => {
    pinCodes.push(row.pincode);
  })
  .on('end', () => {
    console.log('Pin codes loaded:', pinCodes.length);
  })
  .on('error', (error) => {
    console.error('Error reading pin_codes.csv:', error);
  });

// Pincode check endpoint
app.get('/api/check-pincode', (req, res) => {
  const pin = req.query.pin;
  if (!pin || !/^\d{6}$/.test(pin)) {
    return res.status(400).json({ error: 'Invalid pincode' });
  }

  const isAvailable = pinCodes.includes(pin);
  res.json({ available: isAvailable });
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

// Endpoint to handle custom quote submission
app.post('/submit-quote', async (req, res) => {
  try {
    const { index_name, index_email, index_requirements, index_phone } = req.body;

    // Validate required fields
    if (!index_name || !index_email || !index_requirements) {
      return res.status(400).json({ message: 'Missing required fields: name, email, and requirements are required' });
    }

    // Email content for the quote request
    const emailContent = `
      New Custom Quote Request - Ace Agro Tech

      Date: ${new Date().toLocaleString()}
      Name: ${index_name}
      Email: ${index_email}
      Phone: ${index_phone || 'Not provided'}
      Requirements: ${index_requirements}
    `;

    // Send email using the existing transporter
    await transporter.sendMail({
      from: '"Ace Agro Tech" <' + process.env.EMAIL_USER + '>',
      to: 'contact.ace.agro@gmail.com', // Send to your business email
      subject: 'New Custom Quote Request - Ace Agro Tech',
      text: emailContent,
    });
    console.log('Quote request email sent successfully');

    res.status(200).json({ message: 'Quote request sent successfully' });
  } catch (error) {
    console.error('Error sending quote request email:', error.message);
    res.status(500).json({ message: 'Failed to send quote request', error: error.message });
  }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
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