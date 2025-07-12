import React, { useState } from 'react';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [publicKey, setPublicKey] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setMessage('');
    setPublicKey('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.msg);
        setPublicKey(data.publicKey);
      } else {
        setMessage(data.msg || data.error || 'Login failed');
      }
    } catch (err) {
      setMessage('Error: Could not connect to server');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <br />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <br />
        <button type="submit">Login</button>
      </form>
      <p>{message}</p>
      {publicKey && (
        <div>
          <h4>Your Public Key:</h4>
          <pre>{publicKey}</pre>
        </div>
      )}
    </div>
  );
}

export default Login;
