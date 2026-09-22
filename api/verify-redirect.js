// Vercel serverless function — the actual license-check entry point used by
// the Rate Bridge artifact's "Unlock" button.
//
// Claude artifacts cannot make outbound fetch()/XHR calls to any external
// server (confirmed by direct testing — this is a platform sandbox
// restriction, not a CORS issue). A redirect back to the artifact URL with
// data in the URL hash/query doesn't work either — the artifact renders
// inside a sandboxed cross-origin iframe, which does NOT see the parent
// tab's address-bar hash or query string (confirmed by direct testing too).
//
// So instead: "Unlock" opens this endpoint in a NEW TAB via window.open()
// (popups are allowed out of the sandbox). This page checks the license key
// against Gumroad server-to-server, then uses window.opener.postMessage()
// to send the result directly back into the artifact's own iframe — the
// exact JS context that called window.open() — and closes itself. postMessage
// isn't restricted by the sandbox's fetch/XHR block, so this works.
//
// NOTE: Gumroad requires product_id (not product_permalink) for this
// product — confirmed via a debug call that returned Gumroad's own error
// naming the required product_id. This is the product's permanent id and
// won't change even if the Gumroad listing's URL slug does.
export default async function handler(req, res) {
  const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
  let ok = false;

if (key) {
  try {
    const params = new URLSearchParams({
      product_id: '3CRNt-QgdIQcS4ywOsVIFg==',
      license_key: key,
      increment_uses_count: 'false'
    });
    const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await gumroadRes.json();
    ok = !!(data && data.success);
  } catch (e) {
    ok = false;
  }
}

const html = '<!doctype html><html><head><meta charset="utf8"></head>' +
  '<body style="font-family:-apple-system,system-ui,sans-serif;padding:32px;max-width:480px;margin:0 auto;text-align:center;color:#12181D">' +
  '<p id="msg" style="font-size:15px;line-height:1.5">' +
  (ok ? 'Verified! Sending you back to Rate Bridge&hellip;' : 'That license key did not verify. Check it against your purchase email, then close this tab and try again.') +
  '</p>' +
  '<script>' +
  'try{ if (window.opener) { window.opener.postMessage({ source: "rate-bridge-verify", ok: ' + (ok ? 'true' : 'false') + ' }, "*"); } }catch(e){}' +
  (ok ? 'setTimeout(function(){ try{ window.close(); }catch(e){} }, 1000);' : '') +
  '</script>' +
  '</body></html>';

res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
