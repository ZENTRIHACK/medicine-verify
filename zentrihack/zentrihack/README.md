# MediScan frontend

A React + Vite + Tailwind CSS frontend prototype for medicine-pack verification.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ (required by the Vite version in this project).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To build the production frontend:

```bash
npm run build
npm run preview
```

## Current features

- Dashboard and recent scan history
- Medicine image upload and mobile camera capture
- Verification-result and medicine-detail views
- Browser-local scan history with search, filters, and deletion
- Searchable sample medicine registry
- Safety information page
- Settings page, including local history clearing and navigation-message preference
- Responsive desktop sidebar and mobile bottom navigation
- Brief informational messages when main navigation links are selected

## Important demo limitations

- The OCR service and live medicine registry/backend API are **not connected**. Submitting a photo leads to an explicit message explaining that verification has not run; it must not be treated as an authenticity decision.
- Registry entries and some result examples are fictional demonstration data.
- Scan history and the navigation-message preference are stored in the current browser only. They are not uploaded or synchronized to a server.
- Authentication, role-based manufacturer/distributor/pharmacy dashboards, and server-side audit events are not implemented in this frontend package.
- A registry match cannot prove the medicine's chemical contents, quality, or effectiveness.

## Backend integration points

Connect `src/pages/ScanMedicine.jsx` to the team's OCR endpoint in `handleContinue`, then navigate to the result page with the actual API response (rather than the current `demo=unreadable` flow). Replace the fictional entries in `src/pages/MedicineRegistry.jsx` and the demonstration records in `src/pages/VerificationResult.jsx` / `src/pages/MedicineDetails.jsx` with trusted backend responses. Do not display a successful verification status unless the backend has confirmed it.
