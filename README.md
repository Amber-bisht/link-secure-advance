# Link Secure Advance

A premium, multi-layered link protection and generation service built to defend your URLs from bots, scrapers, and bypass attempts. 

Built by **Amber Bisht** (amberbisht.me)  
Owner: **Amber Bisht**

---

## 🚀 Features

- **Multiple Protection Layers:** Supports spanning protections from simple JavaScript challenges to Google reCAPTCHA v3, Cloudflare Turnstile, and interactive gamified challenges (Archery).
- **Gamified Captcha (V5):** A custom-built, highly secure interactive archery game using HTML5 Canvas and HMAC signatures to prevent script bypassing.
- **Advanced Obfuscation:** Uses custom encryption methods (XOR, Caesar ciphers, byte shuffling) for link slugs to prevent reverse engineering.
- **Bot Filtering:** Intercepts and blocks automated traffic before it reaches your real destination URL.
- **Premium User Tier:** Google OAuth authentication to restrict access for the generation of secured links.

---

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 & Framer Motion for beautiful glassmorphism UI
- **Database:** MongoDB (with Mongoose & NextAuth Adapter)
- **Authentication:** NextAuth.js (v5 Beta)
- **Security Integrations:** Cloudflare Turnstile, Google reCAPTCHA

---

## 🔐 Environment Variables (.env)

Create a `.env` file in the root directory. Below is the example configuration, along with instructions on where to get each key:

```env
# -----------------------------------------------------------------------------
# 1. Cloudflare Turnstile (Bot Protection)
# Get keys from: https://dash.cloudflare.com/ (Turnstile section)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key

# -----------------------------------------------------------------------------
# 2. NextAuth & Google OAuth 
# Generate AUTH_SECRET: run `openssl rand -base64 32` in your terminal
# Get Google keys from: https://console.cloud.google.com/apis/credentials
# -----------------------------------------------------------------------------
AUTH_SECRET=your_generated_random_secret_string
AUTH_GOOGLE_ID=your_google_oauth_client_id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret

# -----------------------------------------------------------------------------
# 3. MongoDB Configuration
# Get URI from: https://cloud.mongodb.com/ (Create cluster -> Connect -> Drivers)
# -----------------------------------------------------------------------------
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/links

# -----------------------------------------------------------------------------
# 4. Google reCAPTCHA (v3)
# Get keys from: https://www.google.com/recaptcha/admin/create
# -----------------------------------------------------------------------------
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# -----------------------------------------------------------------------------
# 5. Application Specific Keys & Secrets
# You can generate random hashes for these using any secure generator
# -----------------------------------------------------------------------------
CAPTCHA_ADMIN_KEY=your_captcha_admin_key_for_internal_api
CAPTCHA_API_URL=https://your-custom-captcha-service.com/api/image
TRAP_COOKIE_NAME=cf_trap_proof_v4
CHALLENGE_SECRET=your_random_64_character_hex_string_for_hmac

# -----------------------------------------------------------------------------
# 6. Link Encryption Keys (Change these carefully, it breaks existing links if changed)
# -----------------------------------------------------------------------------
V2_XOR_KEY=
V4_SECRET_SHIFT=
V4_SHUFFLE_PATTERN=
V41_SECRET_SHIFT=
V41_XOR_KEY=
V41_SHUFFLE_PATTERN=
```

---

## 💻 Full Setup & Run Instructions

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- A MongoDB Cluster (Atlas or local)
- Google Cloud Console Project (for OAuth)

### 2. Clone the Repository
```bash
git clone https://github.com/Amber-bisht/link-secure-advance.git
cd link-secure-advance
```

### 3. Install Dependencies
Install all required Node.js packages:
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 4. Configure Environment Variables
Copy the environment variables example above, create a `.env` file in the root of the project, and fill in your actual production keys from Google, Cloudflare, and MongoDB.

### 5. Run the Development Server
Start the Next.js development server:
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### 6. Build for Production
To create an optimized production build:
```bash
npm run build
npm run start
```

---

## 🎯 Architecture Overview

- `/src/app`: Contains the Next.js App Router pages (Homepage, Shortener Dashboard, Terms, Privacy, FAQ).
- `/src/app/v[1-5]/[slug]`: The dynamic routing infrastructure defining the respective verification flow for each link security version.
- `/src/app/api`: Backend routes handling link generation, OAuth, token HMAC validation, and reCAPTCHA/Turnstile verifications.
- `/src/components`: UI components, including the canvas-based `ArcheryCaptcha.tsx`. 
- `/src/utils`: Cryptography logic (`linkWrapper.ts`), server-side challenge verifiers, and middleware helpers.

---

> **Note:** The security integrations strictly rely on server-side validation. Bypassing frontend checks will still result in failed backend signature validations.

<br>
<p align="center">
  <i>Designed and Built by <a href="https://amberbisht.me">Amber Bisht</a></i>
</p>
