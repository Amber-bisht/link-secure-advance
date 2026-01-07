// Original Base64 encoding (used for app.name/string)
export function encodeLink(url: string): string {
  try {
    // Simple Base64 encoding with URL-safe replacements
    const base64 = Buffer.from(url).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Error encoding link:', e);
    return '';
  }
}

export function decodeLink(slug: string): string {
  try {
    // Reverse URL-safe replacements and decode Base64
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    console.error('Error decoding link:', e);
    return '';
  }
}

// V1 Logic: ROT13 + Base64 encoding
export function encodeLinkV1(url: string): string {
  try {
    // Apply ROT13 transformation first
    const rot13 = url.replace(/[a-zA-Z]/g, (char) => {
      const code = char.charCodeAt(0);
      const base = code >= 97 ? 97 : 65;
      return String.fromCharCode(((code - base + 13) % 26) + base);
    });

    // Then Base64 encode
    const base64 = Buffer.from(rot13).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Error encoding link V1:', e);
    return '';
  }
}

export function decodeLinkV1(slug: string): string {
  try {
    // Reverse URL-safe replacements and decode Base64
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');

    // Reverse ROT13 (ROT13 is its own inverse)
    return decoded.replace(/[a-zA-Z]/g, (char) => {
      const code = char.charCodeAt(0);
      const base = code >= 97 ? 97 : 65;
      return String.fromCharCode(((code - base + 13) % 26) + base);
    });
  } catch (e) {
    console.error('Error decoding link V1:', e);
    return '';
  }
}

// V2 Logic: XOR cipher + Base64 encoding
const XOR_KEY = 'codewalt2026'; // Secret key for XOR

export function encodeLinkV2(url: string): string {
  try {
    // Apply XOR cipher
    let xored = '';
    for (let i = 0; i < url.length; i++) {
      xored += String.fromCharCode(
        url.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
      );
    }

    // Then Base64 encode
    const base64 = Buffer.from(xored).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Error encoding link V2:', e);
    return '';
  }
}

export function decodeLinkV2(slug: string): string {
  try {
    // Reverse URL-safe replacements and decode Base64
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');

    // Reverse XOR cipher (XOR is its own inverse)
    let original = '';
    for (let i = 0; i < decoded.length; i++) {
      original += String.fromCharCode(
        decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
      );
    }
    return original;
  } catch (e) {
    console.error('Error decoding link V2:', e);
    return '';
  }
}
