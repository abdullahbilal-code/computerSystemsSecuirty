import React, { useState, useEffect } from 'react';

function Inbox() {
    const [email, setEmail] = useState('');
    const [inbox, setInbox] = useState([]);
    const [privateKey, setPrivateKey] = useState(null);
    const [keyInput, setKeyInput] = useState('');
    const [decryptedMessages, setDecryptedMessages] = useState({});

    // Load inbox messages only when both email and privateKey are available
    const loadInbox = async () => {
        if (!email || !privateKey) return;

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

    // Load inbox + decrypt when both conditions are satisfied
    useEffect(() => {
        if (email && privateKey) {
            loadInbox();
        }
    }, [email, privateKey]);

    // Run decryption when inbox is updated
    useEffect(() => {
        if (privateKey && inbox.length > 0) {
            decryptMessages();
        }
    }, [inbox]);

    return (
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
            <h2>📥 Encrypted Inbox</h2>

            {/* Email input */}
            <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />

            {/* Paste Private Key UI */}
            {!privateKey && (
                <div>
                    <textarea
                        placeholder="Paste your base64 private key here"
                        value={keyInput}
                        onChange={e => setKeyInput(e.target.value)}
                        style={{ width: '100%', height: '100px', marginBottom: '10px' }}
                    />
                    <button onClick={async () => {
                        try {
                            const keyBuffer = Uint8Array.from(atob(keyInput), c => c.charCodeAt(0));
                            const importedKey = await window.crypto.subtle.importKey(
                                'pkcs8',
                                keyBuffer,
                                { name: 'RSA-OAEP', hash: 'SHA-256' },
                                true,
                                ['decrypt']
                            );
                            setPrivateKey(importedKey);
                        } catch (err) {
                            alert('Invalid private key format');
                        }
                    }}>Import Private Key</button>
                </div>
            )}

            <hr />

            {/* Inbox */}
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
