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
            const res = await fetch('https://securechat-n501.onrender.com/api/auth/login', {
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
        <div className="register-container">
            <h2 className="register-heading">Login</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    onChange={handleChange}
                    required
                    className="register-input"
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    onChange={handleChange}
                    required
                    className="register-input"
                />
                <button type="submit" className="register-button">Login</button>
            </form>
            {message && <p className="register-message">{message}</p>}

            {publicKey && (
                <div style={{ marginTop: '20px' }}>
                    <h4>Your Public Key:</h4>
                    <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {publicKey}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default Login;
