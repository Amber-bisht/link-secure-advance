/**
 * Proof-of-Work Utility for Next.js Client
 * Solves SHA-256 challenges provided by the CAPTCHA server
 */

/**
 * Solve a PoW challenge by finding a nonce that produces the required number of leading zeros
 */
export async function solvePoW(nonce: string, difficulty: number): Promise<string> {
    const prefix = '0'.repeat(difficulty);
    let counter = 0;

    // Performance: Use a starting point for the counter to avoid predictable patterns
    let solution = Math.floor(Math.random() * 1000000);

    while (true) {
        const text = nonce + solution.toString();
        const hash = await sha256(text);

        if (hash.startsWith(prefix)) {
            return solution.toString();
        }

        solution++;
        counter++;

        // Safety break to prevent infinite loops (should never happen with reasonable difficulty)
        if (counter > 10000000) {
            throw new Error("PoW complexity exceeded limit");
        }
    }
}

/**
 * Browser-native SHA-256 hashing
 */
async function sha256(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}
