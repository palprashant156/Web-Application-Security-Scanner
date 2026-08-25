# Scanner Methodology

WebGuard approaches Dynamic Application Security Testing (DAST) in three distinct phases:

## 1. Attack Surface Discovery (Crawling)
Before scanning, WebGuard uses a breadth-first search crawler to map the target. It looks for:
- Navigation links (`<a>` tags) to discover endpoints.
- Forms (`<form>`) to discover state-changing endpoints, methods, and required inputs.
- URL Parameters (`?key=value`) to identify injection vectors.

*Constraint:* The crawler strictly enforces same-origin policies to prevent the scanner from escaping the authorized target scope.

## 2. Passive Scanning
Once the attack surface is mapped, WebGuard analyzes the HTTP responses without sending malicious payloads.
- **Security Headers**: Checks for missing defensive headers (HSTS, CSP).
- **Cookies**: Analyzes `Set-Cookie` headers for missing `Secure` or `HttpOnly` flags.
- **CORS**: Analyzes `Access-Control-Allow-Origin` for overly permissive policies.
- **Information Disclosure**: Greps response bodies for stack traces and checks server headers.

## 3. Active Scanning
Active scanning involves injecting benign test payloads into the parameters discovered in Phase 1.
- **Reflected XSS**: Injects a random alphanumeric marker and checks if it reflects in the HTML without encoding.
- **SQL Injection**: Injects syntax breakers (e.g., `'`) and looks for database error signatures or HTTP 500 crashes.

*Safety:* WebGuard's active scanners are designed for detection, not exploitation. They will not extract data, dump databases, or drop web shells.
