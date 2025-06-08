# Sefaria Book Reader

A Vue 3 application that integrates with the Sefaria API to display Jewish texts in Hebrew and English, side by side.

After navigating to a text, clicking on any sentence sends it to ChatGPT, which returns a table breaking down each word with its translation, root, and grammatical forms.

In the next release, you'll be able to click on a root to view its full conjugation along with usage examples.

## Features

- Browse and search through Sefaria's collection of Jewish texts
- View Hebrew and English text side by side
- Pagination support for longer texts
- Responsive design with PrimeVue components

## Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)
- Cloudflare account

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

The application will be available at `https://sefaria-tutor.cogitations.com`

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

### Step 1: Deploy the Proxy Worker

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Create and Deploy Proxy Worker**
   ```bash
   # Create a new directory for the worker
   mkdir sefaria-proxy-worker
   cd sefaria-proxy-worker

   # Initialize a new worker project
   wrangler init

   # Deploy the worker
   wrangler deploy
   ```

   Save the worker URL (e.g., `https://sefaria-proxy-worker.<your-account>.workers.dev`) for the next steps.

### Step 2: Deploy the Main Application

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare Pages**
   ```bash
   wrangler pages deploy dist
   ```

3. **Configure Environment Variables**
   In the Cloudflare Pages dashboard:
   - Go to your project
   - Navigate to Settings > Environment variables
   - Add the following variables:
     - `VITE_API_AUTH_TOKEN`: Your API authentication token
     - `NODE_VERSION`: 18

### Step 3: Configure Custom Domain (Optional)

If you want to use a custom domain (e.g., sefaria-tutor.yourdomain.com):

1. **Set up Custom Domain in Cloudflare**
   - Go to Pages > your project > Settings > Custom domains
   - Click "Set up a custom domain"
   - Enter your domain name
   - Follow the DNS configuration instructions

2. **Configure SSL/TLS**
   - Go to SSL/TLS section
   - Set encryption mode to "Full" or "Full (Strict)"
   - Enable "Always Use HTTPS"
   - Enable "Automatic HTTPS Rewrites"

3. **Update DNS Records**
   - A CNAME record will be automatically created
   - Verify the record points to your Pages deployment
   - Ensure the proxy status is enabled (orange cloud)

4. **Verify Configuration**
   - Check that the SSL certificate is issued
   - Test the domain with HTTPS
   - Verify all assets and API calls work correctly

## Technologies Used

- Vue 3
- PrimeVue 4
- Vite
- Sefaria API
- Cloudflare Workers
- Cloudflare Pages

## API Documentation

This project uses the Sefaria API. For more information about the API, visit:
[developers.sefaria.org](https://developers.sefaria.org/)

## Troubleshooting

### Common Issues

1. **SSL/TLS Errors**
   - Verify SSL/TLS encryption mode is set to "Full"
   - Check that the SSL certificate is properly issued
   - Ensure all assets are served over HTTPS

2. **API Connection Issues**
   - Verify the proxy worker URL is correct
   - Check that the proxy worker is deployed and running
   - Ensure CORS headers are properly set

3. **Build Failures**
   - Check Node.js version (should be 18 or higher)
   - Verify all dependencies are installed
   - Check build logs in Cloudflare Pages dashboard

## License

This project is licensed under the MIT License.

The MIT License is a permissive open-source license with the following key features:

Free Use: Anyone can use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software.

Attribution Required: The original license and copyright notice must be included in all copies or substantial portions of the software.  Please attribute to Irv Shapiro, Cogitations, LLC.

No Warranty: The software is provided "as is", without warranty of any kind—express or implied—including but not limited to warranties of merchantability or fitness for a particular purpose.
