# V4 / V4.1 Security Notes (Hardening Checklist)

This repo has multiple “layers” of bot protection (Cloudflare Turnstile / reCAPTCHA, plus a server-issued challenge). **Most real-world bypasses happen when secrets are missing or when endpoints “fail open”.** This doc lists the safe defaults for `v4` and `v4.1`.

## Required environment variables (production)

### Cloudflare Turnstile (recommended)
- **`TURNSTILE_SECRET_KEY`**: server secret used by `src/utils/turnstile.ts` to verify tokens
- **`NEXT_PUBLIC_TURNSTILE_SITE_KEY`**: public site key used by the client pages (`src/app/v4/[slug]/page.tsx`, `src/app/v4.1/[slug]/page.tsx`)

**Rule**: If `TURNSTILE_SECRET_KEY` is missing, **requests must be rejected** (fail-closed).  
Current behavior: `verifyTurnstile()` returns `false` when the secret is missing (safe).

### Google reCAPTCHA (if used)
- **`RECAPTCHA_SECRET_KEY`**: server secret used by `src/utils/captcha.ts`
- **`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`**: client site key (if the UI uses reCAPTCHA)

**Rule**: In production, if `RECAPTCHA_SECRET_KEY` is missing, verification must return **false** (fail-closed).  
Current behavior: `verifyCaptcha()` allows only in non-production when missing (safe).

### Challenge system (anti-bot proof)
- **`CHALLENGE_SECRET`**: server secret used by `src/utils/challenge.ts` for signing/verifying challenge nonces

**Rule**: In production, if `CHALLENGE_SECRET` is missing, the challenge system is effectively disabled → treat that as misconfiguration and reject protected requests.

## “Fail closed” rules (do this everywhere)

- **Never return 200** for bot/security failures. Use **`403`** (or `401` for auth) so WAF/logging/monitoring can reliably detect blocks.
- **Do not accept missing CAPTCHA/Turnstile tokens** for protected endpoints.
- **Do not allow a request to succeed if a server secret is missing** (Turnstile/ReCAPTCHA/Challenge).

## V4 flow (what must be protected)

### Protect the redirect API
`v4` redirect is handled by:
- `src/app/api/v4/redirect/route.ts`

Security layers to keep:
- **Server challenge** (`x-client-proof` + `challenge_id` + PoW inputs)
- **CAPTCHA/Turnstile verification** (server-side)
- **Rate limiting / suspicious IP logging**

## V4.1 flow (what must be protected)

V4.1 is session-based:
- `src/app/api/v4.1/visit/route.ts` (creates/uses session, issues shortener callback link)
- `src/app/api/v4.1/verify/route.ts` (validates token + CAPTCHA)
- `src/app/api/v4.1/complete/route.ts` (final “handoff”, checks cookie + IP pinning + anti-replay)

### Critical hardening points
- **`/visit` must be protected**: Turnstile + challenge + strict status codes.
- **`/complete` must not be callable without a valid session**:
  - Use a strong random token (already done)
  - Enforce `used` anti-replay (already done)
  - Keep cookie checks in production (already done)

## Important note about “secret rotation”

If you are referring to the rotating secret in `src/utils/challenge.ts`:
- The challenge uses **server-only secrets** (HMAC) and rotates by **time-slot**.  
- You do **not** need to store rotating secrets in DB if your `CHALLENGE_SECRET` is stable and strong.

If you are referring to “secrets” inside `src/utils/linkWrapper.ts`:
- There are **hardcoded keys/shifts** used for obfuscation. This is not cryptographic security.
- Recommended: replace this with **authenticated encryption (AES-256-GCM)** using a secret from env (and include a version byte so you can rotate keys safely).

## Quick “production safe” checklist

- **Turnstile enabled** (`CAPTCHA_CONFIG.own === 2`) AND both Turnstile keys configured
- **CHALLENGE_SECRET set** (strong random, long)
- **All bot blocks return 403**
- **No hardcoded secrets** for link encoding (use env + key rotation strategy)

