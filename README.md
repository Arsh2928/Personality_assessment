# OCEAN Personality Assessment Platform

A full-stack web application for a Big Five (OCEAN) personality assessment service, built for the HRM301 university assignment role-playing as **Industrial Psychology Consultants**.

---

## Project Structure

```
CA1/
├── backend/          # Node / Express / MongoDB API
└── frontend/         # React + Vite + Tailwind frontend
```

---

## Prerequisites

- **Node.js** 18+ and npm 9+
- **MongoDB** — local instance or Atlas cluster

---

## 1. MongoDB Setup

### Option A — Local MongoDB

1. [Install MongoDB Community Edition](https://www.mongodb.com/try/download/community)
2. Start the service: `mongod` (or use MongoDB Compass to start it)
3. The default connection string `mongodb://localhost:27017/personality_assessment` works as-is

### Option B — MongoDB Atlas (Cloud)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user (username + password)
3. Whitelist your IP in Network Access
4. Copy the connection string (looks like `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/personality_assessment`)
5. Paste it as `MONGODB_URI` in `backend/.env`

---

## 2. Backend Setup

```bash
cd backend
npm install
```

### Configure `.env`

The file `backend/.env` already exists with working placeholder values. Edit it to match your environment:

```env
MONGODB_URI=mongodb://localhost:27017/personality_assessment
PORT=5000

ADMIN_EMAIL=admin@ocean.local
ADMIN_PASSWORD=admin123
JWT_SECRET=ocean_assessment_jwt_secret_2024_change_in_prod

# Google Sheets sync (optional — leave placeholders if not needed)
GOOGLE_SERVICE_ACCOUNT_EMAIL=placeholder@placeholder.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nPLACEHOLDER\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=placeholder_sheet_id

# Payment
UPI_ID=yourname@upi
PAYMENT_AMOUNT=99
```

> **Note:** Google Sheets sync is optional. Submissions succeed even when it's unconfigured — the sync error is caught and logged without blocking the response.

### Start the backend

```bash
npm run dev
```

Server runs on `http://localhost:5000`

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies all `/api` calls to `localhost:5000`.

---

## 4. Admin Panel

Navigate to `http://localhost:5173/admin`

Default credentials (from `.env`):
- **Email:** `admin@ocean.local`
- **Password:** `admin123`

> Change these in `.env` before sharing the app publicly.

---

## 5. Google Sheets Live Sync (Optional)

To enable real-time syncing of every submission to a Google Sheet:

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Create a new project
2. Enable the **Google Sheets API** in APIs & Services
3. Go to **IAM & Admin → Service Accounts** → Create a new service account → Generate a JSON key
4. Open your target Google Sheet → **Share** → paste the service account's `client_email` → give **Editor** access
5. Create a tab named exactly `Responses` in that sheet
6. Copy credentials from the JSON key into `backend/.env`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email` field
   - `GOOGLE_PRIVATE_KEY` = `private_key` field (keep the `\n` escaping)
   - `GOOGLE_SHEET_ID` = the ID in your sheet's URL between `/d/` and `/edit`

---

## 6. UPI Payment (Production)

In `frontend/src/data/questionnaire.js`, update `UPI_ID` to your real UPI ID.

Generate a UPI deep-link QR code at any QR generator using:
```
upi://pay?pa=YOUR_UPI_ID&pn=Industrial+Psychology+Consultants&am=99&cu=INR
```

Replace the QR code placeholder in `frontend/src/pages/Results.jsx` (`PaymentSection` component) with a real `<img>` pointing to your generated QR image.

---

## 7. API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/assessment/submit` | None | Submit 25 answers, get scores |
| GET | `/api/assessment/:id` | None | Get result by ID |
| POST | `/api/assessment/:id/payment-proof` | None | Upload payment screenshot |
| GET | `/api/assessment/:id/report-pdf` | None* | Download PDF (requires paid status) |
| POST | `/api/admin/login` | None | Get admin JWT |
| GET | `/api/admin/responses` | JWT | Paginated response list |
| GET | `/api/admin/stats` | JWT | Participant count + revenue |
| GET | `/api/admin/export` | JWT | Download Excel file |

*PDF endpoint checks `paymentStatus === 'paid'` internally.

---

## 8. Running Both Servers

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Routing | React Router v6 |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| File upload | Multer |
| PDF export | PDFKit |
| Excel export | ExcelJS |
| Google Sheets | googleapis |
