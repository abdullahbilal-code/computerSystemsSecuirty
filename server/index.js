const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS Middleware for connecting to the server from frontend applications
app.use(cors());
app.use(express.json());

// Test Route
app.get('/', (req, res) => {
  res.send('Server is running securely 🚀');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is live at http://localhost:${PORT}`);
});
