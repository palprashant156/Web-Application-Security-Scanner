const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 4000;

app.use(cookieParser());
app.use(express.json());

// Intentionally vulnerable CORS configuration
app.use('/vulnerable-cors', cors({
  origin: '*',
  credentials: true
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'security-lab' });
});

// 1. Reflected XSS
app.get('/vulnerable-xss', (req, res) => {
  const name = req.query.name || 'Guest';
  // VULNERABILITY: Directly reflecting user input into HTML without encoding
  res.send(`
    <html>
      <body>
        <h1>Hello ${name}</h1>
        <p>Welcome to the vulnerable XSS page.</p>
        <a href="/vulnerable-xss?name=test">Test Link</a>
      </body>
    </html>
  `);
});

// 2. SQL Injection
app.get('/vulnerable-sqli', (req, res) => {
  const id = req.query.id;
  // VULNERABILITY: Simulating a bad SQL query that throws an error when quotes are injected
  if (id && (id.includes("'") || id.includes('"') || id.includes('\\'))) {
    res.status(500).send('SQL syntax error: You have an error in your SQL syntax near ...');
  } else {
    res.json({ id: id || 1, name: 'Sample User' });
  }
});

// 3. CSRF (Missing Token)
app.post('/vulnerable-csrf/change-password', (req, res) => {
  // VULNERABILITY: Changing state without a CSRF token
  res.json({ status: 'Password changed successfully' });
});

app.get('/vulnerable-csrf', (req, res) => {
  res.send(`
    <html><body>
      <form action="/vulnerable-csrf/change-password" method="POST">
        <input type="password" name="new_password" />
        <button type="submit">Change Password</button>
      </form>
    </body></html>
  `);
});

// 4. Insecure Cookies & Auth
app.get('/login', (req, res) => {
  res.cookie('session_id', 'admin_12345'); // VULNERABILITY: Missing HttpOnly, Secure
  res.send(`
    <html><body>
      <h2>Login Page over HTTP</h2>
      <form action="/login" method="POST">
        <input type="text" name="username" />
        <input type="password" name="password" />
        <button type="submit">Login</button>
      </form>
    </body></html>
  `);
});

app.post('/login', (req, res) => {
  res.send('Logged in');
});

// 5. CORS Misconfiguration is handled by the middleware above
app.get('/vulnerable-cors', (req, res) => {
  res.json({ secret: 'Super secret data' });
});

// 6. Missing Security Headers (Default Express behavior lacks them)
app.get('/vulnerable-headers', (req, res) => {
  res.send('Missing security headers here.');
});

// 7. Info Disclosure (Framework & Stack Trace)
app.get('/vulnerable-info', (req, res) => {
  // VULNERABILITY: Express sends X-Powered-By by default.
  // We also intentionally leak a stack trace.
  res.status(500).send(`
    <html><body>
    <h1>Internal Server Error</h1>
    <pre>
      Error: java.lang.Exception: Database connection failed
      at node:internal/modules/cjs/loader:1146:27
      at Function.Module._load (node:internal/modules/cjs/loader:987:27)
    </pre>
    </body></html>
  `);
});

app.listen(port, () => {
  console.log(`Security lab listening on port ${port}`);
});
