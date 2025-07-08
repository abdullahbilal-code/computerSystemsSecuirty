const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');


const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS Middleware for connecting to the server from frontend applications
app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
  res.send('Server is running securely 🚀');
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected ✅'))
  .catch(err => console.error('MongoDB connection failed ❌', err));


// Start Server
app.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});
