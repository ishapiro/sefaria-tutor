# Authentication and Authorization Implementation Plan

This document outlines the design for implementing a robust authentication and authorization system for the Sefaria Tutor application using NuxtHub, Cloudflare, and Resend.

## 1. User Roles and Capabilities

The system defines four classes of users with escalating permissions:

| Class | Authentication State | Description |
| :--- | :--- | :--- |
| **Guest** | Unauthenticated | Can browse public content and access the homepage/dictionary. |
| **General** | Authenticated (Verified) | Can use the AI tutor, save history, and join a team. |
| **Team** | Authenticated (Verified) | A leader/teacher. Can create/manage teams and view student progress. |
| **Admin** | Authenticated (Verified) | Full system access, global statistics, and user management. |

---

## 2. Technical Stack

- **Framework**: Nuxt 3 (via NuxtHub)
- **Auth Engine**: `nuxt-auth-utils` (Session-based, encrypted cookies)
- **Database**: Cloudflare D1 (SQL-based storage for users and teams)
- **OAuth Provider**: Google Cloud Console
- **Email Service**: Resend (for verification emails)
- **Deployment**: Cloudflare Workers/Pages

---

## 3. Database Schema (Cloudflare D1)

We will use the following schema to manage users and their relationships:

### `users` Table
- `id`: TEXT (Primary Key - UUID or Google Sub ID)
- `email`: TEXT (Unique)
- `name`: TEXT
- `role`: TEXT (Default: 'general')
- `password_hash`: TEXT (NULL for Google users)
- `is_verified`: BOOLEAN (Default: FALSE)
- `verification_token`: TEXT
- `token_expires_at`: INTEGER (Timestamp)
- `team_id`: TEXT (Foreign Key to `teams.id`)
- `created_at`: INTEGER (Timestamp)

### `teams` Table
- `id`: TEXT (Primary Key)
- `name`: TEXT
- `leader_id`: TEXT (Foreign Key to `users.id`)
- `invite_code`: TEXT (Unique)

---

## 4. Authentication Flows

### Google OAuth Flow
1. User clicks "Login with Google".
2. Redirected to Google; after success, redirected back to `/api/auth/google`.
3. If user is new: Create D1 record with `is_verified = true`.
4. If user exists: Update last login.
5. Create encrypted session cookie.

### Email/Password Flow with Verification
1. **Registration**: User submits email/password.
2. Server hashes password (using `scrypt`), generates a `verification_token`, and creates a `users` record with `is_verified = false`.
3. System sends a verification email via **Resend**.
4. **Verification**: User clicks the link in the email (`/auth/verify?token=...`).
5. Server validates token, sets `is_verified = true`, and initiates the session.

---

## 5. Resend Setup Instructions

To enable email verification, follow these steps:

1. **Create Account**: Sign up at [resend.com](https://resend.com).
2. **Verify Domain**: 
   - Go to "Domains" in the Resend dashboard.
   - Add your domain (e.g., `tutor.yourdomain.com`).
   - Add the provided DNS records (MX, SPF, and DKIM) to your domain provider (usually Cloudflare or your registrar).
3. **Generate API Key**:
   - Go to "API Keys".
   - Create a new key with "Sending" permissions.
4. **Configure Application**:
   - Use the Wrangler command (below) to add the key to your production environment.

---

## 6. Cloudflare Configuration (Wrangler)

Use these commands to configure the necessary secrets and database.

### Set Authentication Secrets
```bash
# Encrypted session password (min 32 chars)
npx wrangler secret put NUXT_SESSION_PASSWORD

# Google OAuth Credentials
npx wrangler secret put NUXT_OAUTH_GOOGLE_CLIENT_ID
npx wrangler secret put NUXT_OAUTH_GOOGLE_CLIENT_SECRET

# Resend API Key
npx wrangler secret put NUXT_RESEND_API_KEY
```

### Initialize Database
```bash
# Create the D1 database
npx wrangler d1 create sefaria-tutor-db

# Run migrations (once the SQL files are created)
npx wrangler d1 migrations apply sefaria-tutor-db --remote
```

---

## 7. Implementation Strategy for Feature Limiting

- **Server-Side**: A utility function `requireUserRole(event, roles[])` will be used in API routes to check both the session and the D1 database role.
- **Client-Side**: A global Nuxt middleware will protect routes (e.g., `/admin/**` or `/team/**`).
- **UI Logic**: A `useAuth()` composable will provide reactive properties like `isAdmin`, `isTeamLeader`, and `isVerified` to conditionally render components.

---
