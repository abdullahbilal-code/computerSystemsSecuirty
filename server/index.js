const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');


const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS Middleware for connecting to the server from frontend applications
app.use(cors());
app.use(express.json());


// Server Routes
app.get('/', (req, res) => {
  res.send('Server is running securely 🚀');
});
app.use('/api/auth', authRoutes);
app.use('/api/message', messageRoutes);


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected ✅'))
  .catch(err => console.error('MongoDB connection failed ❌', err));


// Start Server
app.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});
