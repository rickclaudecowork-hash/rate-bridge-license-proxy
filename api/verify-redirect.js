// Vercel serverless function — the actual license-check entry point used by
// the Rate Bridge artifact's "Unlock" button.
//
// Claude artifacts cannot make outbound fetch()/XHR calls to any external
// server (confirmed by direct testing — this is a platform sandbox
// restriction, not a CORS issue). So instead of the artifact calling an API
// and reading a JSON response, the "Unlock" button opens THIS endpoint as a
// normal page navigation (which the sandbox does allow). This endpoint:
//   1. Verifies the license key against Gumroad server-to-server.
//   2. On success, redirects back to the artifact with a signed token in the
//      URL fragment (#unlock=<key>&token=<hmac>).
//   3. The artifact's own JS reads that fragment on load, recomputes the
//      same HMAC client-side (Web Crypto, no network call needed) and
//      unlocks if it matches.
//
// SHARED_SECRET has to be embedded in the artifact's own client-side JS too,
// since that JS is what verifies the token — so this is an integrity check,
// not a confidentiality one. Anyone who reads the artifact's source could in
// principle mint their own token without paying. That's an inherent limit of
// doing verification in a purely static, sandboxed artifact with no server
// component on the artifact's own side; flagged and accepted as a reasonable
// trade-off for a low-volume, low-price internal tool.
import crypto from 'crypto';

const SHARED_SECRET = 'rb-9f3a1c7e-8b2d-4e5f-a016-verify-v1';

function sign(key) {
  return crypto.createHmac('sha256', SHARED_SECRET).update(key).digest('hex');
}

  export default async function handler(req, res) {
    const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
      const artifact = typeof req.query.artifact === 'string' ? req.query.artifact : '';
    const artifactUrl = artifact.startsWith('https://claude.ai/artifact/') ? artifact : null;

                                            if (!artifactUrl) {
                                              res.status(400).send('Missing or invalid "artifact" parameter.');
                                                  return;
                                            }
                                              if (!key) {
                                                res.writeHead(302, { Location: artifactUrl + '#unlock_failed=1' });
                                                res.end();
                                                    return;
                                              }

                                                try {
                                                  const params = new URLSearchParams({
                                                          product_permalink: 'rate-bridge',
                                                          license_key: key,
                                                          increment_uses_count: 'false'
                                                  });
                                                  const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
                                                                                       method: 'POST',
                                                                                 headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                                                                 body: params.toString()
                                                                                 });
                                                                                 const data = await gumroadRes.json();

                                                                                 if (data && data.success) {
                                                                                   const token = sign(key);
                                                                                   const hash = '#unlock=' + encodeURIComponent(key) + '&token=' + token;
                                                                                   res.writeHead(302, { Location: artifactUrl + hash });
                                                                                   res.end();
                                                                                 } else {
                                                                                   res.writeHead(302, { Location: artifactUrl + '#unlock_failed=1' });
                                                                                   res.end();
                                                                                 }
                                                                                   } catch (e) {
                                                                                     res.writeHead(302, { Location: artifactUrl + '#unlock_failed=1' });
                                                                                     res.end();
                                                                                   }
                                                                                   }
                                                                                   
