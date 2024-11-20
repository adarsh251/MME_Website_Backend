const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const path = require('path');
const cookieParser=require('cookie-parser');
const blogRoutes = require('./routes/blogRoutes');
const corsOptions=require('./config/corsOptions')
app.use(cookieParser());
// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Backend' });
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Models
const Booking = require('./models/Booking');
const Admin = require('./models/Admin');

// Middleware to verify admin token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'New Lab Booking Request',
      text: `
        New booking request received:
        Name: ${req.body.name}
        Email: ${req.body.email}
        Lab: ${req.body.lab}
        Date: ${req.body.date}
        Time: ${req.body.startTime} - ${req.body.endTime}
        Faculty: ${req.body.selectedFaculty.join(', ')}
        Equipment: ${req.body.equipment.join(', ')}
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(201).json({ message: 'Booking request submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting booking request' });
  }
});

app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;
  
    // Check if all fields are provided
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }
  
    try {
      // Check if the username or email is already registered
      const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
      if (existingAdmin) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
  
      // Create a new admin
      const newAdmin = new Admin({ username, password, email });
      
      // Save admin with hashed password
      await newAdmin.save();
  
      res.status(201).json({ message: 'Admin registered successfully!' });
    } catch (error) {
      console.error('Error registering admin:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });


app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(username,password);
    const admin = await Admin.findOne({ username });
    console.log(await admin.comparePassword(password));
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Error during login' });
  }
});

app.get('/api/bookings/pending', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'pending' });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

app.post('/api/bookings/:id/:action', verifyToken, async (req, res) => {
  try {
    const { id, action } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = action === 'approve' ? 'approved' : 'rejected';
    await booking.save();

    // Send email to user
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: booking.email,
      subject: `Lab Booking ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      text: `
        Your lab booking request has been ${action === 'approve' ? 'approved' : 'rejected'}.
        
        Booking details:
        Lab: ${booking.lab}
        Date: ${booking.date}
        Time: ${booking.startTime} - ${booking.endTime}
        ${action === 'approve' ? 'Please arrive on time.' : 'Please submit another request if needed.'}
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: `Booking ${action}d successfully` });
  } catch (err) {
    res.status(500).json({ message: `Error ${req.params.action}ing booking` });
  }
});
console.log("blogs route");
app.use('/api', blogRoutes);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;