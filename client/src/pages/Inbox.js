import { useState, useEffect } from 'react';

function Inbox() {
    const [email, setEmail] = useState('');
    const [inbox, setInbox] = useState([]);
    const [privateKey, setPrivateKey] = useState(null);
    const [keyInput, setKeyInput] = useState('');
    const [decryptedMessages, setDecryptedMessages] = useState({});
    const [loadingInbox, setLoadingInbox] = useState(false);
    const [loadingDecrypt, setLoadingDecrypt] = useState(false);

    useEffect(() => {
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) {
            setEmail(storedEmail);
        }
    }, []);

    const loadInbox = async () => {
        if (!email || !privateKey) return;

        setLoadingInbox(true);
        try {
            const res = await fetch(`https://securechat-n501.onrender.com/api/message/inbox/${email}`);
            const data = await res.json();
            setInbox(data);
        } catch (err) {
            console.error('Failed to load inbox:', err);
        } finally {
            setLoadingInbox(false);
        }
    };

    // Decrypt all messages
    const decryptMessages = async () => {
        if (!privateKey || inbox.length === 0) return;

        setLoadingDecrypt(true);

        const decrypted = {};

        for (const msg of inbox) {
            try {
                let encryptedContent;

                if (msg.to.toLowerCase() === email.toLowerCase()) {
                    encryptedContent = msg.contentForReceiver;
                } else if (msg.from.toLowerCase() === email.toLowerCase()) {
                    encryptedContent = msg.contentForSender;
                } else {
                    decrypted[msg._id] = '[Not authorized to decrypt]';
                    continue;
                }

                const encryptedBuffer = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
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
        setLoadingDecrypt(false);
    };

    useEffect(() => {
        if (email && privateKey) {
            loadInbox();
        }
    }, [email, privateKey]);

    useEffect(() => {
        if (privateKey && inbox.length > 0) {
            decryptMessages();
        }
    }, [inbox]);

    return (
        <div className="register-container">
            <h2 className="register-heading">📥 Encrypted Inbox</h2>

            <input
                type="email"
                placeholder="Your Email"
                value={email}
                disabled
                className="register-input"
            />

            {!privateKey && (
                <div>
                    <textarea
                        placeholder="Paste your base64 private key here"
                        value={keyInput}
                        onChange={e => setKeyInput(e.target.value)}
                        className="register-input"
                        style={{ height: '100px', resize: 'vertical' }}
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
                    }} className="register-button">Import Private Key</button>
                </div>
            )}

            <hr />
            {loadingInbox && <p>Loading inbox...</p>}
            {loadingDecrypt && <p>Decrypting messages...</p>}

            {inbox.length === 0 && !loadingInbox ? (
                <p>No messages yet.</p>
            ) : (
                inbox.map((msg, i) => (
                    <div key={i} className="register-input" style={{ marginBottom: '15px' }}>
                        <strong>From:</strong> {msg.from}<br />
                        <strong>To:</strong> {msg.to}<br />
                        <strong>Decrypted:</strong>
                        <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', marginTop: '5px' }}>
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
