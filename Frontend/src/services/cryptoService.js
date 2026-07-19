// Web Crypto API Service for End-to-End Encryption (E2EE)
// Uses ECDH P-256 for key agreement and AES-256-GCM for payload encryption/decryption

export const generateKeyPair = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
};

export const exportPublicKey = async (publicKey) => {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  const exportedString = String.fromCharCode.apply(null, new Uint8Array(exported));
  return btoa(exportedString);
};

export const importPublicKey = async (base64Key) => {
  const binaryDerString = atob(base64Key);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    []
  );
};

export const deriveSharedKey = async (privateKey, peerPublicKey) => {
  return await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptText = async (key, text) => {
  if (!text) return { ciphertext: '', iv: '' };
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return { ciphertext, iv: ivBase64 };
};

export const decryptText = async (key, ciphertext, ivBase64) => {
  if (!ciphertext || !ivBase64) return ciphertext;
  try {
    const cipherBuffer = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      cipherBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '[Decryption Error: Encrypted Message]';
  }
};
