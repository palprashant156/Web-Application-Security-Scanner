# WebGuard — Web Application Security Assessment Platform

WebGuard is a professional, portfolio-grade Dynamic Application Security Testing (DAST) platform designed to automatically map attack surfaces and detect common web vulnerabilities in authorized targets.

## Features
- **Attack Surface Discovery**: Custom web crawler to discover endpoints, forms, and parameters.
- **Passive Misconfiguration Scanning**: Detects missing security headers, insecure cookies, CORS misconfigurations, and information disclosure.
- **Active Vulnerability Scanning**: Non-destructive detection of Reflected XSS and SQL Injection indicators.
- **Security Dashboard**: Next.js-based UI providing scan history, severity distribution, finding filtering, and printable PDF reports.
- **Security Lab**: Includes a built-in intentionally vulnerable application (`security-lab`) for safe, legal testing and validation.

## Architecture
See [docs/architecture.md](docs/architecture.md) for a detailed breakdown of the monorepo structure.

## Installation & Running Locally

The easiest way to run the entire WebGuard ecosystem (Database, API, Dashboard, and Security Lab) is via Docker.

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/webguard.git
cd webguard

# 2. Start all services using Docker Compose
docker compose up -d

# 3. Access the Dashboard
# Open http://localhost:3000 in your browser
```

## Demo Instructions
1. Open `http://localhost:3000`.
2. Enter the Security Lab URL: `http://localhost:4000/vulnerable-xss?name=test`
3. Click **Start Scan**.
4. Observe the crawler mapping the attack surface and the active scanners detecting the Reflected XSS vulnerability.
5. Click **Export Report PDF** to generate a professional assessment report.

## Responsible Use Statement
WebGuard is designed strictly for educational purposes and authorized security testing. You must only scan applications and infrastructure that you own or have explicit, documented permission to test. The developers of WebGuard are not responsible for any misuse or damage caused by this software.

## Documentation
- [Scanner Methodology](docs/scanner-methodology.md)
- [Threat Model](docs/threat-model.md)
- [Security Model](docs/security-model.md)
- [Security Lab](docs/security-lab.md)
- [Limitations](docs/limitations.md)
