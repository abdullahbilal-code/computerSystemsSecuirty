// updated by chatgpt
import React, { useState, useEffect } from 'react';

function Inbox() {
    const [email, setEmail] = useState('');
    const [inbox, setInbox] = useState([]);

    const loadInbox = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/message/inbox/${email}`);
            const data = await res.json();
            setInbox(data);
        } catch (err) {
            console.error('Failed to load inbox:', err);
        }
    };

    useEffect(() => {
        if (email) {
            loadInbox();
        }
    }, [email]);

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
                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                ))
            )}
        </div>
    );
}

export default Inbox;
