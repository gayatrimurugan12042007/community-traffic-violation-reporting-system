# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

### Install dependencies

From the project root:

```bash
npm install
```

### Run the app (development)

Starts the Express server with `nodemon`, serving the static frontend from `web-client-public/` and APIs under `/api`.

```bash
npm run dev
```

The default URL is:

- Public reporter portal: http://localhost:4000/
- Police portal: http://localhost:4000/police.html
- Owner portal: http://localhost:4000/owner.html

### Run the app (production-style)

```bash
npm start
```

### Tests

There is no automated test suite wired up (`npm test` is a placeholder). For changes that need verification, prefer adding focused scripts or test harnesses near the relevant code and document them in this file if they become stable.

### Environment setup

Copy the example env file and adjust as needed:

```bash
cp .env.example .env
# edit .env for MONGODB_URI, PORT, POSTMARK_API_TOKEN
```

The backend expects `MONGODB_URI` to point to a running MongoDB instance and uses `PORT` for the Express server port.

## High-level architecture

### Overview

This is a small full-stack Node.js application for reporting traffic violations:

- **Backend**: Express + Mongoose app under `server-app/`, exposing REST APIs under `/api` and serving static assets.
- **Frontend**: Static HTML/CSS/JS under `web-client-public/` with three portals (public, police, owner) using Leaflet for maps and a Cloudscape-like CSS CDN for styling.
- **Data store**: MongoDB via Mongoose models for users, OTPs, violation reports, and fines.

The root `package.json` scripts (`start`, `dev`) are the single entrypoint for both backend and frontend.

### Backend (`server-app/`)

- `index.js`
  - Loads environment variables via `dotenv`.
  - Configures Express middleware: CORS, JSON body parsing, request logging (`morgan`).
  - Serves uploaded media from `/uploads` and static frontend assets from `web-client-public/`.
  - Mounts the API router from `routes.js` under `/api`.
  - Connects to MongoDB using `MONGODB_URI`, then starts the HTTP server on `PORT` (default `4000`).

- `models.js`
  - Defines the core Mongoose models:
    - `User`: basic profile (name, email, phone, role: `public` | `police` | `owner`).
    - `Otp`: one-time codes tied to an email and expiration time.
    - `Report`: a violation report including reporter, vehicle number, violation type, optional description, status (`Pending Review`/`Approved`/`Rejected`), media file paths, and location data (lat/lng/address).
    - `Fine`: fine records referencing a `Report`, with amount, status (`Unpaid`/`Paid`), and payment method.

- `routes.js`
  - Configures `multer` for storing uploaded media under `server-app/uploads/` and exposes them via `/uploads/...`.
  - Adds rate limiting (`express-rate-limit`) for OTP and report submission endpoints.
  - Public-facing endpoints:
    - `POST /api/auth/register`: create a basic public user.
    - `POST /api/auth/request-otp`: generate and persist a 6-digit OTP (email delivery currently simulated; integration with Postmark is left as a TODO using `POSTMARK_API_TOKEN`).
    - `POST /api/auth/verify-otp`: validate OTP and return a pseudo session token.
    - `POST /api/reports`: submit a violation report with required media files and optional GPS coordinates.
    - `GET /api/reports/search`: look up reports by `reportId` or `vehicleNumber`.
  - Police portal endpoints:
    - `GET /api/police/reports/pending`: list reports with `status = "Pending Review"`.
    - `POST /api/police/reports/:id/decision`: approve/reject a report and optionally create an associated fine on approval.
  - Owner portal endpoints:
    - `GET /api/owner/fines?vehicleNumber=...`: list fines by vehicle number, populating the underlying `Report`.
    - `POST /api/owner/fines/:id/pay`: simulate payment by marking a fine as `Paid` and recording a payment method.

When adding new backend routes, prefer keeping all API handlers in `routes.js` and all schemas in `models.js` to maintain the current separation.

### Frontend (`web-client-public/`)

The frontend is entirely static and assumes the backend is available at the same origin (`/api/...`).

- `index.html` + `main.js`
  - Main public reporter portal.
  - Renders a violation submission form, integrates Leaflet to show the user’s current location, and provides navigation buttons to the police and owner portals.
  - `main.js` handles:
    - Initializing the Leaflet map and requesting browser geolocation.
    - Submitting the report form: registering the user via `/api/auth/register`, falling back to requesting an OTP if the user already exists, and then posting a multipart request to `/api/reports` with media files and GPS coordinates.

- `police.html` + `police.js`
  - Police review interface.
  - `police.js` loads pending reports from `/api/police/reports/pending`, renders them in a table, shows media links, and uses Leaflet to visualize report locations.
  - Provides approve/reject actions that call `/api/police/reports/:id/decision` and optionally prompt for a fine amount.

- `owner.html` + `owner.js`
  - Owner portal for viewing and simulating payment of fines.
  - `owner.js` searches fines by vehicle number via `/api/owner/fines` and renders them in a table with a Pay button that calls `/api/owner/fines/:id/pay`.

### Media and uploads

- Uploaded files are written under `server-app/uploads/` and exposed at runtime via the `/uploads/...` path.
- Frontend media links (e.g., in the police portal) are generated from these paths, so any refactor that moves or renames the uploads directory must keep the Express static mapping in sync.

## Notes for future Warp usage

- Prefer using the existing `npm run dev` flow when making iterative backend or frontend changes so that static assets and APIs stay in sync.
- When adding tests or new tooling (linting, formatting), wire them into `package.json` scripts and update this file’s **Commands** section so agents can invoke them consistently.
