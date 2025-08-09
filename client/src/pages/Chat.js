import { useEffect, useState } from 'react';
import { authHeaders } from '../helper/api';

function Chat() {
    const [fromEmail, setFromEmail] = useState('');
    const [toEmail, setToEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const email = localStorage.getItem("userEmail");
        if (email) setFromEmail(email);
    }, []);

    const handleSend = async e => {
        e.preventDefault();
        if (fromEmail.toLowerCase() === toEmail.toLowerCase()) {
            setStatus('You cannot send a message to yourself');
            return;
        }

        setIsSending(true);
        setStatus('Encrypting...');

        try {
            const [receiverRes, senderRes] = await Promise.all([
                fetch(`https://securechat-n501.onrender.com/api/auth/user/${encodeURIComponent(toEmail.toLowerCase())}`),
                fetch(`https://securechat-n501.onrender.com/api/auth/user/${encodeURIComponent(fromEmail.toLowerCase())}`)
            ]);
            const receiverData = await receiverRes.json();
            const senderData = await senderRes.json();

            if (!receiverData.publicKey || !senderData.publicKey) {
                setStatus('Missing public key(s)');
                return;
            }

            const aesKey = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encodedMsg = new TextEncoder().encode(message);
            const encryptedMessageBuffer = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                aesKey,
                encodedMsg
            );
            const encryptedMessage = btoa(String.fromCharCode(...new Uint8Array(encryptedMessageBuffer)));
            const ivBase64 = btoa(String.fromCharCode(...iv));
            const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);
            const importKey = async (keyBase64) => {
                const raw = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
                return await crypto.subtle.importKey(
                    'spki',
                    raw,
                    { name: 'RSA-OAEP', hash: 'SHA-256' },
                    true,
                    ['encrypt']
                );
            };

            const receiverKey = await importKey(receiverData.publicKey);
            const senderKey = await importKey(senderData.publicKey);

            const [encryptedKeyForReceiver, encryptedKeyForSender] = await Promise.all([
                crypto.subtle.encrypt({ name: "RSA-OAEP" }, receiverKey, rawAesKey),
                crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderKey, rawAesKey),
            ]);

            const aesKeyForReceiver = btoa(String.fromCharCode(...new Uint8Array(encryptedKeyForReceiver)));
            const aesKeyForSender = btoa(String.fromCharCode(...new Uint8Array(encryptedKeyForSender)));

            const res = await fetch('https://securechat-n501.onrender.com/api/message/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    from: fromEmail.toLowerCase(),
                    to: toEmail.toLowerCase(),
                    encryptedMessage,
                    aesKeyForReceiver,
                    aesKeyForSender,
                    iv: ivBase64
                }),
            });

            const data = await res.json();
            setStatus(data.msg || data.error || 'Message sent');
            setMessage('');
        } catch (err) {
            console.error(err);
            setStatus('Encryption or sending failed');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="register-container">
            <h2 className="register-heading">Encrypted Chat</h2>
            <form onSubmit={handleSend}>
                <input
                    type="email"
                    placeholder="Your Email"
                    value={fromEmail}
                    disabled
                    className="register-input"
                />
                <input
                    type="email"
                    placeholder="Send To (Receiver Email)"
                    value={toEmail}
                    onChange={e => setToEmail(e.target.value)}
                    required
                    className="register-input"
                />
                <textarea
                    placeholder="Your Message"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={4}
                    className="register-input"
                    style={{ resize: 'vertical' }}
                />
                <button type="submit" className="register-button" disabled={isSending}>
                    {isSending ? 'Sending...' : 'Send'}
                </button>
            </form>
            {status && (
                <p
                    className="register-message"
                    style={{ color: status.includes('cannot') ? 'red' : 'green' }}
                >
                    {status}
                </p>
            )}
        </div>
    );
}

export default Chat;
