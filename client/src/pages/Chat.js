import React, { useEffect, useState } from 'react';

function Chat() {
    const [fromEmail, setFromEmail] = useState('');
    const [toEmail, setToEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const email = localStorage.getItem("userEmail");
        if (email) {
            setFromEmail(email);
        }
    }, []);

    const handleSend = async e => {
        e.preventDefault();

        if (fromEmail.toLowerCase() === toEmail.toLowerCase()) {
            setStatus('You cannot send a message to yourself');
            return;
        }

        setStatus('Encrypting...');
        setIsSending(true);

        try {
            const [receiverRes, senderRes] = await Promise.all([
                fetch(`https://securechat-n501.onrender.com/api/auth/user/${encodeURIComponent(toEmail.toLowerCase())}`),
                fetch(`https://securechat-n501.onrender.com/api/auth/user/${encodeURIComponent(fromEmail.toLowerCase())}`)
            ]);
            const receiverData = await receiverRes.json();
            const senderData = await senderRes.json();

            if (!receiverRes.ok || !receiverData.publicKey) {
                setStatus('Recipient not found or has no public key');
                setIsSending(false);
                return;
            }

            if (!senderRes.ok || !senderData.publicKey) {
                setStatus('Your account does not have a public key');
                setIsSending(false);
                return;
            }

            const importPublicKey = async (keyBase64) => {
                const raw = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
                return await window.crypto.subtle.importKey(
                    'spki',
                    raw,
                    { name: 'RSA-OAEP', hash: 'SHA-256' },
                    true,
                    ['encrypt']
                );
            };

            const receiverKey = await importPublicKey(receiverData.publicKey);
            const senderKey = await importPublicKey(senderData.publicKey);

            const encodedMsg = new TextEncoder().encode(message);

            const [encryptedForReceiver, encryptedForSender] = await Promise.all([
                window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, receiverKey, encodedMsg),
                window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, senderKey, encodedMsg)
            ]);

            const base64Receiver = btoa(String.fromCharCode(...new Uint8Array(encryptedForReceiver)));
            const base64Sender = btoa(String.fromCharCode(...new Uint8Array(encryptedForSender)));

            const res = await fetch('https://securechat-n501.onrender.com/api/message/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: fromEmail.toLowerCase(),
                    to: toEmail.toLowerCase(),
                    contentForReceiver: base64Receiver,
                    contentForSender: base64Sender,
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
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
            <h2>Encrypted Chat</h2>

            <form onSubmit={handleSend} style={{ marginBottom: '20px' }}>
                <input
                    type="email"
                    placeholder="Your Email"
                    value={fromEmail}
                    disabled={fromEmail}
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
                <button type="submit" style={{ padding: '10px 20px' }} disabled={isSending}>
                    {isSending ? 'Sending...' : 'Send'}
                </button>
            </form>
            {status && (
                <p style={{ color: status.includes('cannot') ? 'red' : 'green' }}>{status}</p>
            )}
        </div>
    );
}

export default Chat;
