// Vercel serverless function — proxies Gumroad's license verify API so it
// can be called from the browser (Gumroad's own API blocks cross-origin
// fetch calls from a page, so this small server-side hop is required).
//
// Deployed URL will look like: https://<your-project>.vercel.app/api/verify-license
// The Rate Bridge artifact POSTs { license_key } to this endpoint as JSON.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
  }

  if (req.method !== 'POST') {
        res.status(405).json({ success: false, message: 'Method not allowed' });
        return;
  }

  try {
        const licenseKey = req.body && req.body.license_key;
        if (!licenseKey) {
                res.status(400).json({ success: false, message: 'Missing license_key' });
                return;
        }

      const params = new URLSearchParams({
              product_permalink: 'rate-bridge',
              license_key: licenseKey,
              increment_uses_count: 'false'
      });

      const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
      });

      const data = await gumroadRes.json();
        res.status(200).json(data);
  } catch (e) {
        res.status(500).json({ success: false, message: 'Proxy error: ' + e.message });
  }
}
