import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

function Register() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const downloadText = (filename, text) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Generating keys, please wait...');

        try {
            // ---------- 1) RSA-OAEP (encryption) keypair ----------
            const rsaPair = await window.crypto.subtle.generateKey(
                {
                    name: 'RSA-OAEP',
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: 'SHA-256',
                },
                true,
                ['encrypt', 'decrypt']
            );

            // ---------- 2) ECDSA (signing) keypair ----------
            const signPair = await window.crypto.subtle.generateKey(
                { name: 'ECDSA', namedCurve: 'P-256' },
                true,
                ['sign', 'verify']
            );

            // ---------- 3) Export public keys (SPKI) ----------
            const rsaPubSpki = await window.crypto.subtle.exportKey('spki', rsaPair.publicKey);
            const signPubSpki = await window.crypto.subtle.exportKey('spki', signPair.publicKey);

            const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(rsaPubSpki)));
            const signingPublicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(signPubSpki)));

            // ---------- 4) Export private keys (PKCS8) & download ----------
            const rsaPrivPkcs8 = await window.crypto.subtle.exportKey('pkcs8', rsaPair.privateKey);
            const signPrivPkcs8 = await window.crypto.subtle.exportKey('pkcs8', signPair.privateKey);

            const rsaPrivateKeyB64 = btoa(String.fromCharCode(...new Uint8Array(rsaPrivPkcs8)));
            const signingPrivateKeyB64 = btoa(String.fromCharCode(...new Uint8Array(signPrivPkcs8)));

            // Download both private keys as files
            downloadText(`${form.email}-rsa-private-key.txt`, rsaPrivateKeyB64);
            downloadText(`${form.email}-signing-private-key.txt`, signingPrivateKeyB64);

            // For demo convenience ONLY (optional): keep signing key handy
            // localStorage.setItem('signingPrivateKey', signingPrivateKeyB64);

            // ---------- 5) Persist login identity locally (lower-cased) ----------
            const emailLc = form.email.toLowerCase();
            localStorage.setItem('userEmail', emailLc);

            // ---------- 6) Register with backend (send BOTH public keys) ----------
            const res = await fetch('https://securechat-n501.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: emailLc,
                    password: form.password,
                    publicKey: publicKeyBase64,         // RSA-OAEP public key (base64 SPKI)
                    signingPublicKey: signingPublicKeyB64, // ECDSA public key (base64 SPKI)
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage('Registered successfully! Your private keys have been downloaded.');
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

            {message && (
                <p className="register-message">
                    {message}
                    <br />
                    <small>
                        Keep both downloaded files safe. You’ll need the <strong>RSA private key</strong> to decrypt and the
                        <strong> signing private key</strong> to sign messages.
                    </small>
                </p>
            )}
        </div>
    );
}

export default Register;
