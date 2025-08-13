const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,                   // bcrypt
    publicKey: String,                  // RSA-OAEP SPKI (base64)
    signingPublicKey: String            // ECDSA P-256 SPKI (base64)  <-- NEW
});

module.exports = mongoose.model('User', UserSchema);