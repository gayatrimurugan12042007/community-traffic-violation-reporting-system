# Community Traffic Violation Reporting System (Full Stack)

A full-stack demo web application where the public can report traffic violations with mandatory photo/video evidence and live GPS location (Leaflet map), police can review and approve/reject reports, and vehicle owners can view and simulate payment of fines.

> **Important:** This project is for educational purposes only. It does **not** issue automatic fines. All fines are created only after manual police approval.

## Stack

- **Frontend:** HTML, CSS, vanilla JS, AWS UI (Cloudscape-like) styling via CDN, Leaflet.js maps
- **Backend:** Node.js, Express
- **Database:** MongoDB via Mongoose
- **Auth:** Simple email-based OTP flow (Postmark token configured via `.env`, with simulated sending in code)

## Folder structure

```text
CommunityTrafficViolationSystemFullStack/
  server-app/           # Express server, MongoDB models & routes
  web-client-public/    # Static frontend (public, police, owner portals)
  uploads/              # Uploaded media (created at runtime)
```

## Prerequisites

- Node.js LTS installed
- MongoDB running locally (or via MongoDB Compass) on `mongodb://localhost:27017`

## Environment configuration

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your values:

   - `MONGODB_URI=mongodb://localhost:27017/community_traffic_violation_db`
   - `PORT=4000` (or any free port)
   - `POSTMARK_API_TOKEN=your_postmark_api_token_here`

> Keep your real Postmark API token secret and **never** commit it to git.

## Install & run

From the project root:

```bash
npm install
npm run dev
```

Then open in your browser:

- Public reporter portal: http://localhost:4000/
- Police portal: http://localhost:4000/police.html
- Owner portal: http://localhost:4000/owner.html

## Features

- Public users can:
  - Fill in their name, email, phone
  - Enter Indian vehicle number (e.g., `TN01AB1234`)
  - Select violation type and description
  - Upload **required** photo/video media (stored under `uploads/`)
  - Automatically capture GPS location and show it on a Leaflet map
  - Submit report to backend API (`status = "Pending Review"`)

- Police portal:
  - View all `Pending Review` reports, including media links and map location
  - Approve or reject reports
  - On approval, optionally create a fine record (amount in INR)

- Owner portal:
  - Search fines by vehicle number
  - View fine details and status
  - Simulate payment via simple button and choice of method (e.g., UPI, card, net banking)

## Abuse safeguards

- Basic rate limiting for OTP requests and report submissions
- Legal note on the homepage clarifying that **no automatic fines** are issued without police approval
- CAPTCHA is not implemented, but you can extend the form with a CAPTCHA or similar validation.

## Testing steps (VS Code)

1. Open this folder in VS Code.
2. Run MongoDB locally.
3. In the integrated terminal:

   ```bash
   npm install
   cp .env.example .env
   # update .env with your local settings
   npm run dev
   ```

4. Use the built-in VS Code browser (or external browser) to hit `http://localhost:4000`.
5. Submit a sample report with a test image and verify it appears in the police portal and owner portal.
