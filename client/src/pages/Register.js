import React, { useState } from 'react';

function Register() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setMessage('');

        try {
            const res = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            setMessage(data.msg || data.error || 'Something went wrong');
        } catch (err) {
            setMessage('Error: Could not connect to server');
        }
    };

    return (
        <div className="register-container">
            <h2 className="register-heading">Register</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    onChange={handleChange}
                    required
                    className="register-input"
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    onChange={handleChange}
                    required
                    className="register-input"
                />
                <button type="submit" className="register-button">Register</button>
            </form>
            {message && <p className="register-message">{message}</p>}
        </div>
    );
}

export default Register;
