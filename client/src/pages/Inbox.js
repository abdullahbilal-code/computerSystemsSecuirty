import { useState, useEffect } from 'react';
import { authHeaders } from '../helper/api';

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
        if (storedEmail) setEmail(storedEmail);
    }, []);

    const loadInbox = async () => {
        if (!email || !privateKey) return;

        setLoadingInbox(true);
        try {
            const res = await fetch(`https://securechat-n501.onrender.com/api/message/inbox/${email}`, {
                headers: { ...authHeaders() }
            });
            const data = await res.json();
            setInbox(data);
        } catch (err) {
            console.error('Failed to load inbox:', err);
        } finally {
            setLoadingInbox(false);
        }
    };

    const decryptMessages = async () => {
        if (!privateKey || inbox.length === 0) return;

        setLoadingDecrypt(true);
        const decrypted = {};

        for (const msg of inbox) {
            try {
                const isReceiver = msg.to.toLowerCase() === email.toLowerCase();
                const encryptedAESKeyBase64 = isReceiver ? msg.aesKeyForReceiver : msg.aesKeyForSender;
                const encryptedMessageBase64 = msg.encryptedMessage;
                const ivBase64 = msg.iv;

                if (!encryptedAESKeyBase64 || !encryptedMessageBase64 || !ivBase64) {
                    decrypted[msg._id] = '[Missing encrypted content]';
                    continue;
                }

                const encryptedAESKey = Uint8Array.from(atob(encryptedAESKeyBase64), c => c.charCodeAt(0));
                const encryptedMessage = Uint8Array.from(atob(encryptedMessageBase64), c => c.charCodeAt(0));
                const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

                const rawAesKey = await crypto.subtle.decrypt(
                    { name: "RSA-OAEP" },
                    privateKey,
                    encryptedAESKey
                );

                const aesKey = await crypto.subtle.importKey(
                    "raw",
                    rawAesKey,
                    { name: "AES-GCM" },
                    false,
                    ["decrypt"]
                );

                const decryptedBuffer = await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv },
                    aesKey,
                    encryptedMessage
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
            <h2 className="register-heading">Encrypted Inbox</h2>

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
                    <button
                        onClick={async () => {
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
                        }}
                        className="register-button"
                    >
                        Import Private Key
                    </button>
                </div>
            )}

            <hr />
            {loadingInbox && <p>Loading inbox...</p>}
            {loadingDecrypt && <p>Decrypting messages...</p>}

            {inbox.length === 0 && !loadingInbox ? (
                <p>No messages yet.</p>
            ) : (
                inbox?.map((msg, i) => {
                    const isSentByMe = msg?.from?.toLowerCase() === email?.toLowerCase();
                    return (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                justifyContent: isSentByMe ? 'flex-end' : 'flex-start',
                                marginBottom: '12px',
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: isSentByMe ? '#e6f7ff' : '#f0fff4',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    maxWidth: '80%',
                                    border: '1px solid #ccc',
                                    textAlign: 'left',
                                }}
                            >
                                <strong>{isSentByMe ? 'To:' : 'From:'}</strong> {isSentByMe ? msg.to : msg.from}
                                <br />
                                <br />
                                <strong>Message:</strong>
                                <pre
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        wordWrap: 'break-word',
                                        marginTop: '5px',
                                        fontSize: '14px',
                                    }}
                                >
                                    {decryptedMessages[msg._id] || '[Decrypting...]'}
                                </pre>
                                <small style={{ color: '#888' }}>{new Date(msg.timestamp).toLocaleString()}</small>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default Inbox;
