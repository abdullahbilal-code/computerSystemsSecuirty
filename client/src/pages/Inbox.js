// updated by chatgpt
import React, { useState, useEffect } from 'react';

function Inbox() {
    const [email, setEmail] = useState('');
    const [inbox, setInbox] = useState([]);
    const [privateKey, setPrivateKey] = useState(null);
    const [decryptedMessages, setDecryptedMessages] = useState({});

    // Load privateKey from localStorage and import
    const loadPrivateKey = async () => {
        try {
            const keyBase64 = localStorage.getItem('privateKey');
            if (!keyBase64) return;

            const keyBuffer = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
            const importedKey = await window.crypto.subtle.importKey(
                'pkcs8',
                keyBuffer,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256',
                },
                true,
                ['decrypt']
            );
            setPrivateKey(importedKey);
        } catch (err) {
            console.error('Failed to load private key:', err);
        }
    };

    // Load inbox messages
    const loadInbox = async () => {
        try {
            const res = await fetch(`https://securechat-n501.onrender.com/api/message/inbox/${email}`);
            const data = await res.json();
            setInbox(data);
        } catch (err) {
            console.error('Failed to load inbox:', err);
        }
    };

    // Decrypt all messages
    const decryptMessages = async () => {
        if (!privateKey || inbox.length === 0) return;

        const decrypted = {};

        for (const msg of inbox) {
            try {
                const encryptedBuffer = Uint8Array.from(atob(msg.content), c => c.charCodeAt(0));
                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    { name: 'RSA-OAEP' },
                    privateKey,
                    encryptedBuffer
                );
                const decryptedText = new TextDecoder().decode(decryptedBuffer);
                decrypted[msg._id] = decryptedText;
            } catch (err) {
                decrypted[msg._id] = '[Failed to decrypt]';
            }
        }

        setDecryptedMessages(decrypted);
    };

    // Initial load
    useEffect(() => {
        loadPrivateKey();
    }, []);

    useEffect(() => {
        if (email) loadInbox();
    }, [email]);

    useEffect(() => {
        if (privateKey && inbox.length > 0) {
            decryptMessages();
        }
    }, [privateKey, inbox]);


    return (
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
            <h2>📥 Encrypted Inbox</h2>
            <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
            />
            {inbox.length === 0 ? (
                <p>No messages yet.</p>
            ) : (
                inbox.map((msg, i) => (
                    <div key={i} style={{ marginBottom: '10px', border: '1px solid #ccc', padding: '10px' }}>
                        <strong>From:</strong> {msg.from}<br />
                        <strong>Encrypted:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{msg.content}</pre>
                        <strong>Decrypted:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                            {decryptedMessages[msg._id] || '[Decrypting...]'}
                        </pre>
                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                ))
            )}
        </div>
    );
}

export default Inbox;
