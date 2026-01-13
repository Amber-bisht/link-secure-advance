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

// V3 Logic: Linkshortify converter + V2 XOR cipher + Base64 encoding
export function encodeLinkV3(url: string): string {
  try {
    // Check if it's a lksfy.com link
    const lksfyMatch = url.match(/https?:\/\/lksfy\.com\/([a-zA-Z0-9]+)/);

    if (!lksfyMatch) {
      throw new Error('Invalid lksfy.com URL format');
    }

    const extractedId = lksfyMatch[1]; // Extract the ID (e.g., "QDuafv")

    // Convert to sharclub.in format
    const convertedUrl = `https://web.sharclub.in/?id=${extractedId}&plan_id=1`;

    // Apply V2 XOR cipher
    let xored = '';
    for (let i = 0; i < convertedUrl.length; i++) {
      xored += String.fromCharCode(
        convertedUrl.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
      );
    }

    // Then Base64 encode
    const base64 = Buffer.from(xored).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Error encoding link V3:', e);
    return '';
  }
}

export function decodeLinkV3(slug: string): string {
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
    console.error('Error decoding link V3:', e);
    return '';
  }
}

// V4 Logic: Multi-layer encryption (CAPTCHA Protected)
// Layer 1: Caesar cipher with dynamic shift
// Layer 2: Reverse string
// Layer 3: Byte shuffling with pattern
// Layer 4: Base64 encoding
const V4_SECRET_SHIFT = 17; // Caesar cipher shift
const V4_SHUFFLE_PATTERN = [2, 0, 3, 1]; // Byte shuffle pattern

export function encodeLinkV4(url: string): string {
  try {
    // Layer 1: Apply Caesar cipher with dynamic shift based on length
    const shift = V4_SECRET_SHIFT + (url.length % 10);
    let caesarEncoded = '';
    for (let i = 0; i < url.length; i++) {
      const charCode = url.charCodeAt(i);
      // Shift all printable ASCII characters
      if (charCode >= 32 && charCode <= 126) {
        const shiftedCode = ((charCode - 32 + shift) % 95) + 32;
        caesarEncoded += String.fromCharCode(shiftedCode);
      } else {
        caesarEncoded += url.charAt(i);
      }
    }

    // Layer 2: Reverse the string
    const reversed = caesarEncoded.split('').reverse().join('');

    // Layer 3: Byte shuffling - split into chunks and shuffle
    const chunks: string[] = [];
    for (let i = 0; i < reversed.length; i += 4) {
      const chunk = reversed.slice(i, i + 4);
      if (chunk.length === 4) {
        // Shuffle bytes according to pattern
        const shuffled = V4_SHUFFLE_PATTERN.map(idx => chunk[idx] || '').join('');
        chunks.push(shuffled);
      } else {
        // Last chunk might be shorter, don't shuffle
        chunks.push(chunk);
      }
    }
    const shuffled = chunks.join('');

    // Layer 4: Base64 encode with URL-safe characters
    const base64 = Buffer.from(shuffled).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Error encoding link V4:', e);
    return '';
  }
}

export function decodeLinkV4(slug: string): string {
  try {
    // Layer 4: Decode Base64
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');

    // Layer 3: Reverse byte shuffling
    const chunks: string[] = [];
    for (let i = 0; i < decoded.length; i += 4) {
      const chunk = decoded.slice(i, i + 4);
      if (chunk.length === 4) {
        // Reverse shuffle: find original positions
        const unshuffled = new Array(4);
        for (let j = 0; j < 4; j++) {
          unshuffled[V4_SHUFFLE_PATTERN[j]] = chunk[j];
        }
        chunks.push(unshuffled.join(''));
      } else {
        // Last chunk wasn't shuffled
        chunks.push(chunk);
      }
    }
    const unshuffled = chunks.join('');

    // Layer 2: Reverse the string back
    const unreversed = unshuffled.split('').reverse().join('');

    // Layer 1: Reverse Caesar cipher
    const shift = V4_SECRET_SHIFT + (unreversed.length % 10);
    let original = '';
    for (let i = 0; i < unreversed.length; i++) {
      const charCode = unreversed.charCodeAt(i);
      if (charCode >= 32 && charCode <= 126) {
        // Reverse the shift
        let originalCode = charCode - 32 - shift;
        while (originalCode < 0) originalCode += 95;
        originalCode = (originalCode % 95) + 32;
        original += String.fromCharCode(originalCode);
      } else {
        original += unreversed.charAt(i);
      }
    }

    return original;
  } catch (e) {
    console.error('Error decoding link V4:', e);
    return '';
  }
}

// V4.1 Logic: Enhanced multi-layer encryption for iframe cookie preservation
// Different cipher parameters to ensure V4 and V4.1 generate different slugs
// Layer 1: Enhanced Caesar cipher with different shift
// Layer 2: XOR with secret key
// Layer 3: Reverse string
// Layer 4: Different byte shuffling pattern
// Layer 5: Base64 encoding
const V41_SECRET_SHIFT = 23; // Different shift from V4
const V41_XOR_KEY = 'iframe2026shield'; // XOR key for additional security
const V41_SHUFFLE_PATTERN = [3, 1, 0, 2]; // Different pattern from V4

export function encodeLinkV41(url: string): string {
  try {
    // Layer 1: Enhanced Caesar cipher with different shift
    const shift = V41_SECRET_SHIFT + (url.length % 13);
    let caesarEncoded = '';
    for (let i = 0; i < url.length; i++) {
      const charCode = url.charCodeAt(i);
      if (charCode >= 32 && charCode <= 126) {
        const shiftedCode = ((charCode - 32 + shift) % 95) + 32;
        caesarEncoded += String.fromCharCode(shiftedCode);
      } else {
        caesarEncoded += url.charAt(i);
      }
    }

    // Layer 2: XOR with secret key
    let xored = '';
    for (let i = 0; i < caesarEncoded.length; i++) {
      xored += String.fromCharCode(
        caesarEncoded.charCodeAt(i) ^ V41_XOR_KEY.charCodeAt(i % V41_XOR_KEY.length)
      );
    }

    // Layer 3: Reverse the string
    const reversed = xored.split('').reverse().join('');

    // Layer 4: Byte shuffling with different pattern
    const chunks: string[] = [];
    for (let i = 0; i < reversed.length; i += 4) {
      const chunk = reversed.slice(i, i + 4);
      if (chunk.length === 4) {
        const shuffled = V41_SHUFFLE_PATTERN.map(idx => chunk[idx] || '').join('');
        chunks.push(shuffled);
      } else {
        chunks.push(chunk);
      }
    }
    const shuffled = chunks.join('');

    // Layer 5: Base64 encode
    const base64 = Buffer.from(shuffled).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Error encoding link V4.1:', e);
    return '';
  }
}

export function decodeLinkV41(slug: string): string {
  try {
    // Layer 5: Decode Base64
    let base64 = slug.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');

    // Layer 4: Reverse byte shuffling
    const chunks: string[] = [];
    for (let i = 0; i < decoded.length; i += 4) {
      const chunk = decoded.slice(i, i + 4);
      if (chunk.length === 4) {
        const unshuffled = new Array(4);
        for (let j = 0; j < 4; j++) {
          unshuffled[V41_SHUFFLE_PATTERN[j]] = chunk[j];
        }
        chunks.push(unshuffled.join(''));
      } else {
        chunks.push(chunk);
      }
    }
    const unshuffled = chunks.join('');

    // Layer 3: Reverse the string back
    const unreversed = unshuffled.split('').reverse().join('');

    // Layer 2: Reverse XOR
    let unxored = '';
    for (let i = 0; i < unreversed.length; i++) {
      unxored += String.fromCharCode(
        unreversed.charCodeAt(i) ^ V41_XOR_KEY.charCodeAt(i % V41_XOR_KEY.length)
      );
    }

    // Layer 1: Reverse Caesar cipher
    const shift = V41_SECRET_SHIFT + (unxored.length % 13);
    let original = '';
    for (let i = 0; i < unxored.length; i++) {
      const charCode = unxored.charCodeAt(i);
      if (charCode >= 32 && charCode <= 126) {
        let originalCode = charCode - 32 - shift;
        while (originalCode < 0) originalCode += 95;
        originalCode = (originalCode % 95) + 32;
        original += String.fromCharCode(originalCode);
      } else {
        original += unxored.charAt(i);
      }
    }

    return original;
  } catch (e) {
    console.error('Error decoding link V4.1:', e);
    return '';
  }
}

