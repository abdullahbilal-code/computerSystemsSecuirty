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

  // OTP UI
  const [otpCode, setOtpCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);

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

  const importEcdsaSpkiForVerify = (b64) =>
    crypto.subtle.importKey(
      'spki',
      b64ToBytes(b64),
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['verify']
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
      setSignKeyInput('');
    } catch (e) {
      console.error(e);
      setStatus('Invalid signing private key (expected base64 PKCS8 for ECDSA P-256).');
    }
  };

  // ----- Pairing buttons -----
  const requestOtp = async () => {
    const me = (fromEmail || '').trim().toLowerCase();
    const peer = (toEmail || '').trim().toLowerCase();
    if (!me || !peer) return setStatus('Enter both emails before requesting OTP.');
    setIsPairing(true);
    try {
      const res = await fetch('https://securechat-n501.onrender.com/api/pair/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ to: peer }),
      });
      const data = await res.json();
      setStatus(data.msg || 'OTP requested. (Check server console/email per your setup.)');
    } catch (e) {
      setStatus('Failed to request OTP');
    } finally {
      setIsPairing(false);
    }
  };

  // 🔧 OTP input sanitizer: allow digits only, max 6
  const handleOtpChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(digitsOnly);
  };

  const verifyOtp = async () => {
    const peer = (toEmail || '').trim().toLowerCase();
    if (!peer || otpCode.length !== 6) return setStatus('Enter the 6‑digit OTP and recipient email.');
    setIsPairing(true);
    try {
      const res = await fetch('https://securechat-n501.onrender.com/api/pair/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ withEmail: peer, code: otpCode }),
      });
      const data = await res.json();
      setStatus(data.msg || 'Pair verified');
    } catch (e) {
      setStatus('Failed to verify OTP');
    } finally {
      setIsPairing(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    const peer = toEmail.trim().toLowerCase();
    const me = fromEmail.trim().toLowerCase();

    if (!me || !peer) return setStatus('Please enter both emails');
    if (me === peer) return setStatus('You cannot send a message to yourself');
    if (!signingKey) return setStatus('Please import your signing private key first.');

    setIsSending(true);
    setStatus('Encrypting...');

    try {
      // 1) fetch keys
      const [receiverRes, senderRes] = await Promise.all([
        fetch(`https://securechat-n501.onrender.com/api/auth/user/${peer}`),
        fetch(`https://securechat-n501.onrender.com/api/auth/user/${me}`)
      ]);
      const receiverData = await receiverRes.json();
      const senderData = await senderRes.json();

      if (!receiverData?.publicKey || !senderData?.publicKey || !senderData?.signingPublicKey) {
        setStatus('Missing public key(s)');
        setIsSending(false);
        return;
      }

      // 2) recipient fingerprint trust
      const fp = await checkAndStoreFingerprint(peer, receiverData.publicKey);
      if (!fp.ok) {
        setStatus(`⚠️ Recipient key changed! Stored: ${fp.prev}, Now: ${fp.fp}. Aborting send.`);
        setIsSending(false);
        return;
      }

      // 3) client preflight: prove our signing key matches DB
      const verifyKey = await importEcdsaSpkiForVerify(senderData.signingPublicKey);
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const proofSig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, challenge);
      const ok = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        verifyKey,
        proofSig,
        challenge
      );
      if (!ok) {
        setStatus('Your pasted signing private key does NOT match the account’s public signing key.');
        setIsSending(false);
        return;
      }

      // 4) import RSA keys
      const [receiverKey, senderKey] = await Promise.all([
        importRsaSpki(receiverData.publicKey),
        importRsaSpki(senderData.publicKey),
      ]);

      // 5) AES + encrypt
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

      // 6) wrap AES key for both parties
      const [kForReceiver, kForSender] = await Promise.all([
        crypto.subtle.encrypt({ name: 'RSA-OAEP' }, receiverKey, rawAesKey),
        crypto.subtle.encrypt({ name: 'RSA-OAEP' }, senderKey, rawAesKey),
      ]);
      const aesKeyForReceiver = bytesToB64(new Uint8Array(kForReceiver));
      const aesKeyForSender = bytesToB64(new Uint8Array(kForSender));

      // 7) sign (to || iv || encryptedMessage)
      const toBytes = new TextEncoder().encode(peer);
      const ivBytes = b64ToBytes(ivBase64);
      const encBytes = b64ToBytes(encryptedMessage);
      const payload = new Uint8Array(toBytes.length + ivBytes.length + encBytes.length);
      payload.set(toBytes, 0);
      payload.set(ivBytes, toBytes.length);
      payload.set(encBytes, toBytes.length + ivBytes.length);

      const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, payload);
      const signature = bytesToB64(new Uint8Array(sig));

      // 8) POST
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
          signature,
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
        <input type="email" placeholder="Your Email" value={fromEmail} disabled className="register-input" />
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

        {/* Pairing controls (fixed OTP input) */}
        <div style={{ display: 'flex', gap: 8, margin: '8px 0', alignItems: 'center' }}>
          <button type="button" onClick={requestOtp} className="register-button" disabled={isPairing || !toEmail}>
            {isPairing ? 'Requesting…' : 'Request OTP'}
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="6‑digit OTP"
            value={otpCode}
            onChange={handleOtpChange}
            className="register-input"
            style={{ width: 140, textAlign: 'center', letterSpacing: '2px' }}
          />
          <button
            type="button"
            onClick={verifyOtp}
            className="register-button"
            disabled={isPairing || otpCode.length !== 6}
            title={otpCode.length !== 6 ? 'Enter 6 digits' : 'Verify OTP'}
          >
            {isPairing ? 'Verifying…' : 'Verify OTP'}
          </button>
        </div>

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
