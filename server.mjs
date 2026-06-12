import http from 'http';
import { doLogin } from './login.mjs';
import { doVerify } from './verify.mjs';

const PORT = process.env.PORT || 8080;

// The Playwright page object returned by doLogin().
// Null until /login completes; used by /verify to reach the already-open browser.
let activePage = null;

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve(body); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const payload = await readBody(req);

  // ── POST /login ─────────────────────────────────────────────────────────────
  // Opens Chrome, navigates to the Clalbit login page, fills ID + phone number,
  // and submits the first form. Returns immediately; doLogin() runs in background.
  if (req.url === '/login') {
    console.log('[/login] payload:', JSON.stringify(payload, null, 2));

    const { idNumber, phoneNumber } = payload;
    if (!idNumber || !phoneNumber) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'idNumber and phoneNumber are required' }));
      return;
    }

    doLogin(idNumber, phoneNumber)
      .then(page => {
        activePage = page;
        console.log('[/login] Credentials submitted. OTP page is ready.');
      })
      .catch(err => {
        console.error('[/login] Error:', err);
        activePage = null;
      });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'triggered' }));
    return;
  }

  // ── POST /verify ────────────────────────────────────────────────────────────
  // Types the OTP into the open browser page and submits the second form.
  if (req.url === '/verify') {
    console.log('[/verify] payload:', JSON.stringify(payload, null, 2));

    const otp = payload.otp ? String(payload.otp) : null;
    if (!otp) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'otp is required' }));
      return;
    }
    if (!activePage) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no active login session — call /login first' }));
      return;
    }

    doVerify(activePage, otp)
      .then(() => console.log('[/verify] OTP submitted successfully.'))
      .catch(err => console.error('[/verify] Error:', err));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'triggered' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);
});
