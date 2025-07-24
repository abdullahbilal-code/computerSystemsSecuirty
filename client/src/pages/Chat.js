import React, { useState } from 'react';

function Chat() {
    const [fromEmail, setFromEmail] = useState('');
    const [toEmail, setToEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');

    const handleSend = async e => {
        e.preventDefault();
        setStatus('Encrypting...');

        try {
            // 1. Fetch recipient's publicKey
            const userRes = await fetch(`https://securechat-n501.onrender.com/api/auth/user/${encodeURIComponent(toEmail.toLocaleLowerCase())}`)
            const userData = await userRes.json();

            if (!userRes.ok || !userData.publicKey) {
                setStatus('Recipient not found or has no public key');
                return;
            }

            // 2. Import public key
            const publicKeyRaw = Uint8Array.from(atob(userData.publicKey), c => c.charCodeAt(0));
            const importedKey = await window.crypto.subtle.importKey(
                'spki',
                publicKeyRaw,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256',
                },
                true,
                ['encrypt']
            );

            // 3. Encrypt the message
            const encodedMsg = new TextEncoder().encode(message);
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: 'RSA-OAEP' },
                importedKey,
                encodedMsg
            );

            const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));

            // 4. Send encrypted message to backend
            const res = await fetch('https://securechat-n501.onrender.com/api/message/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: fromEmail.toLocaleLowerCase(), to: toEmail.toLocaleLowerCase(), message: encryptedBase64 })
            });

            const data = await res.json();
            setStatus(data.msg || data.error || 'Message sent');
            setMessage('');
        } catch (err) {
            console.error(err);
            setStatus('Encryption or sending failed');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
            <h2>Encrypted Chat</h2>

            <form onSubmit={handleSend} style={{ marginBottom: '20px' }}>
                <input
                    type="email"
                    placeholder="Your Email"
                    value={fromEmail}
                    onChange={e => setFromEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                />
                <input
                    type="email"
                    placeholder="Send To (Receiver Email)"
                    value={toEmail}
                    onChange={e => setToEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                />
                <textarea
                    placeholder="Your Message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={4}
                    style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
                />
                <button type="submit" style={{ padding: '10px 20px' }}>Send</button>
            </form>

            <p>{status}</p>
        </div>
    );
}

export default Chat;
