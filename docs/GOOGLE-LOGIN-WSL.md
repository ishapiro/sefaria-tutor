# Google login: Mac vs WSL troubleshooting

When Google login works on Mac (`npm run dev` → http://localhost:8787) but not on Surface Pro under WSL, the callback URL or environment usually differs. Use this checklist to compare both machines.

## 1. Run the OAuth diagnostic

With the app running on the **failing** machine (WSL):

```bash
curl -s http://localhost:8787/api/auth/oauth-diagnostic | jq
```

(Or open http://localhost:8787/api/auth/oauth-diagnostic in the browser.)

Compare with the same on the **working** machine (Mac). Check:

- **`redirectUrl`** – Should be `http://localhost:8787/api/auth/google`. If `null` or different, the server is not seeing `NUXT_OAUTH_GOOGLE_REDIRECT_URL`.
- **`redirectUrlSource`** – Whether it comes from `process.env` or `cloudflare.env`. If `none`, `.dev.vars` is not being loaded.
- **`redirectUrlLastCharCode`** – Should be `103` (letter `g`). If it is `13`, the value has a trailing `\r` (Windows line ending); see step 2.
- **`requestHost`** – Should be `localhost:8787` when you call from the same machine. If you call from Windows browser to WSL, it should still be `localhost:8787`.

## 2. Fix .dev.vars location and line endings (WSL)

- **File location**  
  `.dev.vars` must be in the **project root** (same directory as `wrangler.toml`). From the directory where you run `npm run dev`, confirm:
  ```bash
  ls -la .dev.vars
  ```

- **Line endings**  
  If the diagnostic shows `redirectUrlLastCharCode: 13` or the hint about trailing CR:
  1. Open `.dev.vars` in your editor.
  2. Save with **LF** line endings only (no CRLF). In VS Code: bottom right → “CRLF” → switch to “LF”.
  3. Or fix from WSL:
     ```bash
     sed -i 's/\r$//' .dev.vars
     ```

- **Exact content**  
  Redirect URL line should be exactly:
  ```
  NUXT_OAUTH_GOOGLE_REDIRECT_URL=http://localhost:8787/api/auth/google
  ```
  No spaces around `=`, no trailing space or `\r`.

## 3. Ensure .dev.vars is loaded by Wrangler

When you run `npx wrangler dev`, Wrangler loads `.dev.vars` from the current working directory. Always start dev from the project root:

```bash
cd /path/to/sefaria-tutor
npm run dev
```

If you start from a subdirectory or a different path, `.dev.vars` may not be found.

## 4. Google Cloud Console

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 Client ID → **Authorized redirect URIs**, ensure you have **exactly**:

- `http://localhost:8787/api/auth/google`

If the browser uses `http://127.0.0.1:8787` (e.g. some WSL setups), add that too:

- `http://127.0.0.1:8787/api/auth/google`

## 5. Same .dev.vars on both machines

You mentioned the same `.dev.vars` exists on both machines. Confirm:

- **Same keys** – At least: `NUXT_OAUTH_GOOGLE_CLIENT_ID`, `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`, `NUXT_OAUTH_GOOGLE_REDIRECT_URL`.
- **Same redirect URL** – Exactly `http://localhost:8787/api/auth/google` for local dev.
- **No CRLF on WSL** – After copying from Mac, run `sed -i 's/\r$//' .dev.vars` on WSL or re-save with LF.

## 6. “Page not found” on callback (browser shows /api/auth/google?code=...)

If the **browser** ends up on a “Page not found” for `/api/auth/google?code=...`, the request is being handled as a client route instead of by the server. That is often a **hosting/routing** issue (e.g. the request never hits the Worker). For **local** `npm run dev` on WSL:

- Use the same URL as on Mac: **http://localhost:8787** (from Windows browser or WSL browser).
- If you must use `127.0.0.1`, add `http://127.0.0.1:8787/api/auth/google` to Google’s Authorized redirect URIs and set in `.dev.vars`:
  ```
  NUXT_OAUTH_GOOGLE_REDIRECT_URL=http://127.0.0.1:8787/api/auth/google
  ```

After any change to `.dev.vars`, restart `npm run dev` and run the diagnostic again.
