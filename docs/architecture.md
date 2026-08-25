# Architecture

WebGuard is built as a TypeScript Monorepo using npm workspaces.

## Directory Structure
- `/apps/api`: Express.js backend responsible for orchestrating scans, saving to MongoDB, and exposing REST APIs.
- `/apps/web`: Next.js frontend providing the user dashboard and report generation.
- `/packages/scanner`: The core scanning engine, completely decoupled from the API or database. It contains the Crawler, Passive Checks, and Active Checks.
- `/packages/shared`: Shared TypeScript interfaces (e.g., `Scan`, `Finding`) used by both the frontend, backend, and scanner.
- `/security-lab`: An intentionally vulnerable Express application used for testing and validating the scanner's detection capabilities.

## Data Flow
1. User submits a URL via the UI.
2. The UI POSTs to the API.
3. The API creates a `Scan` record in MongoDB and triggers the `ScannerEngine` asynchronously.
4. The `ScannerEngine` initializes the `Crawler` to discover the attack surface.
5. Passive modules scan the discovered pages.
6. Active modules inject payloads into the discovered parameters.
7. Findings are returned to the API, severity is aggregated, and the `Scan` record is updated.
8. The UI polls the API and updates the dashboard in real-time.
