import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Register() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setMessage('Generating keys, please wait...');

        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["encrypt", "decrypt"]
            );

            const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
            const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

            const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
            const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

            const blob = new Blob([privateKeyBase64], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${form.email}-private-key.txt`;
            a.click();
            URL.revokeObjectURL(url);

            localStorage.setItem("userEmail", form.email);

            const res = await fetch('https://securechat-n501.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email.toLowerCase(),
                    password: form.password,
                    publicKey: publicKeyBase64
                })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage('Registered successfully! Your private key has been downloaded.');
                navigate('/send-message');
            } else {
                setMessage(data.msg || data.error || 'Something went wrong');
            }
        } catch (err) {
            console.error(err);
            setMessage('Error during key generation or registration');
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
