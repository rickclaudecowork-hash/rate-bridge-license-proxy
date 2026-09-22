// TEMPORARY debug endpoint — returns Gumroad's raw response so we can see
// exactly why a real license key is failing. Delete this file once fixed.
export default async function handler(req, res) {
  const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
  const params = new URLSearchParams({
    product_permalink: 'rate-bridge',
    license_key: key,
    increment_uses_count: 'false'
  });
  try {
    const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await gumroadRes.json();
    res.status(200).json({ sentKey: key, status: gumroadRes.status, gumroadResponse: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
