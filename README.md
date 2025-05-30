# Sefaria Book Reader

A Vue 3 application that integrates with the Sefaria API to display Jewish texts with Hebrew and English translations side by side.

## Features

- Browse and search through Sefaria's collection of Jewish texts
- View Hebrew and English text side by side
- Pagination support for longer texts
- Responsive design with PrimeVue components

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
```bash
git clone [your-repository-url]
cd sefaria-tutor
```

2. Install dependencies:
```bash
npm install
```

## Development

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technologies Used

- Vue 3
- PrimeVue 4
- Vite
- Sefaria API

## API Documentation

This project uses the Sefaria API. For more information about the API, visit:
[developers.sefaria.org](https://developers.sefaria.org/)

## Using Sefaria API with CORS (Cloudflare Worker Proxy)

Sefaria's API does not support CORS for some endpoints (like /api/table_of_contents). To use this app, you must set up a Cloudflare Worker as a proxy.

### Step-by-Step: Deploy the Proxy with Wrangler CLI

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   # or, on macOS:
   brew install wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```
   This will open a browser window for authentication.

3. **Initialize a Worker Project**
   ```bash
   wrangler init sefaria-proxy-worker
   cd sefaria-proxy-worker
   ```
   - When prompted, choose the **Hello World (JavaScript)** template.

4. **Copy the Proxy Code**
   - Copy the contents of `cloudflare-sefaria-proxy.js` from this repo into your Worker project directory.
   - Replace the generated `src/index.js` (or `src/index.mjs`) with your `cloudflare-sefaria-proxy.js` file, or rename it as needed.

5. **Update `wrangler.toml`**
   Edit `wrangler.toml` to set your Worker's name and entry file:
   ```toml
   name = "sefaria-proxy-worker"
   main = "src/index.js"
   compatibility_date = "2024-05-01"
   ```

6. **Deploy the Worker**
   ```bash
   wrangler deploy
   ```
   This will deploy your Worker and give you a URL like:
   ```
   https://sefaria-proxy-worker.<your-account>.workers.dev
   ```

7. **Update your API calls in the app**
   Use your Worker URL for Sefaria API endpoints, for example:
   - `https://sefaria-proxy-worker.<your-account>.workers.dev/proxy/api/table_of_contents`
   - `https://sefaria-proxy-worker.<your-account>.workers.dev/proxy/api/texts/Siddur%20Ashkenaz`

This will allow your app to access all Sefaria API endpoints without CORS issues.

## License

[Your chosen license] 