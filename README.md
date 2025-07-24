# Secure Chat App End-to-End Encrypted 

This project is built for our Computer Systems Security module.

It is a secure communication web app that allows two users to send and receive end-to-end encrypted messages using RSA public/private key pairs. Keys are generated in the browser and only public keys are shared with the backend.


Tech Stack

- Frontend: React (create-react-app)
- Backend: Express.js + Node.js
- Database: MongoDB (via Mongoose)
- Encryption: Web Crypto API (RSA-OAEP with SHA-256)


Features

- User registration & login
- RSA key pair generation in the browser
- Public key saved to server, private key kept locally
- Messages encrypted before sending
- Decryption only possible with correct private key
- Inbox displays both encrypted and decrypted messages
- Simple and clean UI with minimal styling


How It Works

1. On registration: the frontend generates a key pair using `crypto.subtle.generateKey()`
2. Only the public key is sent to the backend and stored in MongoDB.
3. When sending a message, the sender fetches the recipient’s public key and encrypts the message in the browser.
4. Message is stored encrypted in the database.
5. Inbox decrypts the message using the private key stored in `localStorage`.


How to Run / Start Project: 

Backend
cd server
npm install if not installed already
npm start
