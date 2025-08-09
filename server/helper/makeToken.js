const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },           // minimal payload
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

module.exports = { signToken };