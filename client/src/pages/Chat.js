import React, { useState } from 'react';

function Chat() {
    const [fromEmail, setFromEmail] = useState('');
    const [toEmail, setToEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');

    const handleSend = async e => {
        e.preventDefault();
        setStatus('');

        try {
            const res = await fetch('http://localhost:5000/api/message/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: fromEmail, to: toEmail, message })
            });

            const data = await res.json();
            setStatus(data.msg || data.error || 'Something went wrong');
            setMessage('');
        } catch (err) {
            setStatus('Server error');
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
            <h2>🔐 Encrypted Chat</h2>

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
