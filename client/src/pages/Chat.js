import { useEffect, useState } from 'react';
import { authHeaders } from '../helper/api';

function Chat() {
    const [fromEmail, setFromEmail] = useState('');
    const [toEmail, setToEmail] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('');
    const [isSending, setIsSending] = useState(false);

    // signing key import UI
    const [signKeyInput, setSignKeyInput] = useState('');
    const [signingKey, setSigningKey] = useState(null); // CryptoKey (ECDSA private)

    useEffect(() => {
        const email = localStorage.getItem('userEmail');
        if (email) setFromEmail(email);
    }, []);

    // --- helpers ---
    const b64ToBytes = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const bytesToB64 = (u8) => btoa(String.fromCharCode(...u8));

    const sha256Hex = async (bytes) => {
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const importRsaSpki = (b64) =>
        crypto.subtle.importKey(
            'spki',
            b64ToBytes(b64),
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['encrypt']
        );

    const importEcdsaPkcs8 = (b64) =>
        crypto.subtle.importKey(
            'pkcs8',
            b64ToBytes(b64),
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
        );

    const signEcdsa = (privKey, bytes) =>
        crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, bytes);

    const checkAndStoreFingerprint = async (emailLc, publicKeyB64) => {
        const spkiBytes = b64ToBytes(publicKeyB64);
        const fullHex = await sha256Hex(spkiBytes);
        const shortFp = fullHex.slice(0, 8);

        let trusted = {};
        try {
            trusted = JSON.parse(localStorage.getItem('trustedKeys') || '{}');
        } catch {
            trusted = {};
        }
        const prev = trusted[emailLc];
        if (!prev) {
            trusted[emailLc] = shortFp;
            localStorage.setItem('trustedKeys', JSON.stringify(trusted));
            return { ok: true, fp: shortFp };
        }
        if (prev !== shortFp) {
            return { ok: false, prev, fp: shortFp };
        }
        return { ok: true, fp: shortFp };
    };

    const handleImportSigningKey = async () => {
        try {
            const key = await importEcdsaPkcs8(signKeyInput.trim());
            setSigningKey(key);
            setStatus('✅ Signing key imported. You can send securely now.');
            // Optional convenience (comment out if you don’t want any storage):
            // localStorage.setItem('signingPrivateKey', signKeyInput.trim());
            setSignKeyInput('');
        } catch (e) {
            console.error(e);
            setStatus('Invalid signing private key (expected base64 PKCS8 for ECDSA P-256).');
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();

        const peer = toEmail.trim().toLowerCase();
        const me = fromEmail.trim().toLowerCase();

        if (!me || !peer) {
            setStatus('Please enter both emails');
            return;
        }
        if (me === peer) {
            setStatus('You cannot send a message to yourself');
            return;
        }
        if (!signingKey) {
            setStatus('Please import your signing private key first.');
            return;
        }

        setIsSending(true);
        setStatus('Encrypting...');

        try {
            // 1) fetch RSA public keys (receiver + me)
            const [receiverRes, senderRes] = await Promise.all([
                fetch(`https://securechat-n501.onrender.com/api/auth/user/${peer}`),
                fetch(`https://securechat-n501.onrender.com/api/auth/user/${me}`)
            ]);
            const receiverData = await receiverRes.json();
            const senderData = await senderRes.json();

            if (!receiverData?.publicKey || !senderData?.publicKey) {
                setStatus('Missing public key(s)');
                setIsSending(false);
                return;
            }

            // 2) fingerprint trust check on receiver key
            const fp = await checkAndStoreFingerprint(peer, receiverData.publicKey);
            if (!fp.ok) {
                setStatus(`⚠️ Recipient key changed! Stored: ${fp.prev}, Now: ${fp.fp}. Aborting send.`);
                setIsSending(false);
                return;
            }

            // 3) import RSA keys
            const [receiverKey, senderKey] = await Promise.all([
                importRsaSpki(receiverData.publicKey),
                importRsaSpki(senderData.publicKey),
            ]);

            // 4) AES key + encrypt message
            const aesKey = await crypto.subtle.generateKey(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const plaintext = new TextEncoder().encode(message);
            const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);

            const encryptedMessage = bytesToB64(new Uint8Array(ctBuf));
            const ivBase64 = bytesToB64(iv);
            const rawAesKey = await crypto.subtle.exportKey('raw', aesKey);

            // 5) wrap AES key for both parties
            const [kForReceiver, kForSender] = await Promise.all([
                crypto.subtle.encrypt({ name: 'RSA-OAEP' }, receiverKey, rawAesKey),
                crypto.subtle.encrypt({ name: 'RSA-OAEP' }, senderKey, rawAesKey),
            ]);
            const aesKeyForReceiver = bytesToB64(new Uint8Array(kForReceiver));
            const aesKeyForSender = bytesToB64(new Uint8Array(kForSender));

            // 6) sign (to || iv || encryptedMessage)
            const toBytes = new TextEncoder().encode(peer);
            const ivBytes = b64ToBytes(ivBase64);
            const encBytes = b64ToBytes(encryptedMessage);
            const payload = new Uint8Array(toBytes.length + ivBytes.length + encBytes.length);
            payload.set(toBytes, 0);
            payload.set(ivBytes, toBytes.length);
            payload.set(encBytes, toBytes.length + ivBytes.length);

            const sig = await signEcdsa(signingKey, payload);
            const signature = bytesToB64(new Uint8Array(sig));

            // 7) POST
            const res = await fetch('https://securechat-n501.onrender.com/api/message/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({
                    from: me,
                    to: peer,
                    encryptedMessage,
                    aesKeyForReceiver,
                    aesKeyForSender,
                    iv: ivBase64,
                    signature, // required for MITM/tamper protection
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

            {/* Import signing private key (ECDSA P-256, PKCS8 base64) */}
            {!signingKey && (
                <div style={{ marginBottom: 12 }}>
                    <textarea
                        placeholder="Paste your base64 ECDSA signing private key (PKCS8)"
                        value={signKeyInput}
                        onChange={(e) => setSignKeyInput(e.target.value)}
                        className="register-input"
                        style={{ height: 90, resize: 'vertical' }}
                    />
                    <button type="button" onClick={handleImportSigningKey} className="register-button">
                        Import Signing Key
                    </button>
                </div>
            )}

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
                    onChange={(e) => setToEmail(e.target.value)}
                    required
                    className="register-input"
                />
                <textarea
                    placeholder="Your Message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
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
                    style={{ color: status.includes('cannot') || status.includes('⚠️') ? 'red' : 'green' }}
                >
                    {status}
                </p>
            )}
        </div>
    );
}

export default Chat;
