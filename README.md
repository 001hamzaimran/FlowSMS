# Scheduled SMS Automation Platform

A modern SaaS application that connects **Google Sheets** with **Twilio** to automate personalized, deduplicated SMS campaigns on one-time or timezone-aware recurring schedules.

---

## Features

- **Google Drive Picker API**: Seamlessly pick Google Sheets from your Drive with minimal OAuth scopes (`drive.file` and `spreadsheets.readonly`).
- **Dynamic Column & Merge Field Mapping**: Auto-detects phone columns, supports separate country code columns, and provides a live 5-row sample preview table.
- **Interactive Template Editor**: Compose SMS templates with dynamic `{{colName}}` merge tag chips and real-time rendered previews.
- **Timezone-Aware Scheduling**: Run campaigns as one-time executions or on recurring cron schedules (`node-cron`) pinned to target timezones.
- **Zero Double-Sends (Strict Deduplication)**: MongoDB unique compound index on `(flowId, phoneNumberE164)` guarantees zero duplicate SMS deliveries per flow across repeat runs.
- **E.164 Phone Normalization**: Powered by `libphonenumber-js` to automatically clean, parse, and normalize international contact numbers.
- **Security & AES-256-GCM Encryption**: Google Refresh Tokens and Twilio Auth Tokens are encrypted at rest. Twilio Auth Tokens are masked (`•••• last4`) on GET requests.
- **Twilio Credential Verification**: Built-in "Send Test SMS" modal in the Flow Builder to verify Twilio credentials before saving.
- **Twilio Webhook Callbacks**: Live delivery status tracking (`delivered`, `failed`, `undelivered`).
- **Flow Analytics & Audit Logs**: Detailed dashboard tracking flow statuses (`active`, `paused`, `completed`, `error`), run history, and deduplicated message logs.

---

## Tech Stack

### Backend
- **Runtime**: Node.js & Express (ES Modules)
- **Database**: MongoDB & Mongoose ODM
- **Authentication**: Google OAuth 2.0 & JWT Sessions
- **Encryption**: Node.js `crypto` (AES-256-GCM)
- **APIs & SDKs**: Google Sheets API v4, Google Auth Library, Twilio SDK, `libphonenumber-js`
- **Scheduler**: `node-cron` with timezone support

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router DOM v7
- **Server State**: TanStack React Query v5
- **Icons & Styling**: Lucide React & Modern Glassmorphism CSS Design System
- **Google Picker**: Google Interactive Picker JS API (`https://apis.google.com/js/api.js`)

---

## Project Structure

```text
Automation Message/
├── Backend/
│   ├── Controllers/
│   │   ├── authController.js       # Google OAuth, JWT & Picker token generation
│   │   ├── flowController.js       # Flow CRUD, token masking, test SMS & runs
│   │   ├── sheetsController.js     # Sheet tab listing & row preview endpoints
│   │   └── webhookController.js    # Twilio delivery status webhook listener
│   ├── Middlewares/
│   │   ├── authMiddleware.js       # JWT authorization guard
│   │   ├── errorHandler.js         # Centralized error handler
│   │   ├── internalOnlyMiddleware.js # Internal secret protection for cron runners
│   │   └── rateLimiter.js          # Express rate limiter
│   ├── Model/
│   │   ├── Flow.js                 # Flow metadata, schedule & encrypted keys
│   │   ├── FlowRun.js              # Execution statistics log
│   │   ├── SentRecord.js           # Unique (flowId, phoneNumberE164) message log
│   │   └── User.js                 # User profile & encrypted Google refresh token
│   ├── Routes/
│   │   ├── authRoutes.js
│   │   ├── flowRoutes.js
│   │   ├── sheetsRoutes.js
│   │   └── webhookRoutes.js
│   ├── Utils/
│   │   ├── db.js                   # Mongoose connection & DNS fallback
│   │   ├── encryption.js           # AES-256-GCM encrypt/decrypt & secret mask
│   │   ├── flowRunner.js           # Flow execution engine & batch sender
│   │   ├── googleSheets.js         # Google Sheets API v4 wrapper & token refresh
│   │   ├── phoneValidator.js       # E.164 phone normalization
│   │   ├── scheduler.js            # Timezone-aware cron scheduler worker
│   │   ├── templateRenderer.js     # Variable substitution renderer
│   │   └── twilioSender.js         # Twilio client with exponential backoff
│   ├── .env.example
│   ├── index.js                    # Server entry point
│   └── package.json
│
└── Frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js           # Axios instance with JWT interceptors
    │   ├── components/
    │   │   ├── Header.jsx          # Top navigation & Reconnect Google button
    │   │   ├── ProtectedRoute.jsx  # Auth guard component
    │   │   └── SpreadsheetPicker.jsx # Google Drive Picker dialog wrapper
    │   ├── context/
    │   │   └── AuthContext.jsx     # User authentication state provider
    │   ├── pages/
    │   │   ├── AuthCallback.jsx    # OAuth code exchange handler
    │   │   ├── Dashboard.jsx       # Campaign dashboard & flow controls
    │   │   ├── FlowBuilder.jsx     # 5-step flow creation wizard
    │   │   ├── FlowDetail.jsx      # Flow execution logs & sent message records
    │   │   └── Login.jsx           # Google sign-in landing page
    │   ├── App.jsx                 # Main application routes
    │   └── index.css               # Design system tokens & utility classes
    ├── .env.example
    ├── vite.config.js
    └── package.json
```

---

## Environment Variables

### Backend Configuration (`Backend/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/sms_automation?retryWrites=true&w=majority

# Google OAuth Credentials (Google Cloud Console -> Credentials)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Google API Key (Google Cloud Console -> API Keys for Google Picker API)
GOOGLE_API_KEY=your_google_api_key

# Encryption & JWT Secrets (Generate 64-char hex strings)
JWT_SECRET=your_jwt_secret_min_32_chars
ENCRYPTION_KEY=your_32_byte_encryption_key_64_hex_chars
INTERNAL_API_SECRET=your_internal_api_secret

FRONTEND_URL=http://localhost:5173
```

### Frontend Configuration (`Frontend/.env`)

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_API_KEY=your_google_api_key
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Active MongoDB Atlas cluster or local MongoDB instance
- **Google Cloud Console Project** with:
  - **Google Sheets API** enabled
  - **Google Picker API** enabled
  - OAuth 2.0 Web Application Credentials
- **Twilio Account**: Account SID, Auth Token, and a Twilio From Number

### 2. Google Cloud Setup Checklist
1. Enable **Google Sheets API** and **Google Picker API** under **APIs & Services → Library**.
2. Under **APIs & Services → Credentials → OAuth 2.0 Client IDs**:
   - **Authorized JavaScript origins**: `http://localhost:5173`, `http://localhost:5000`
   - **Authorized redirect URIs**: `http://localhost:5000/auth/google/callback`
3. Under **APIs & Services → Credentials → Create Credentials → API Key**:
   - Create an API Key and restrict it to **Google Picker API** and HTTP referrer `http://localhost:5173/*`.
   - Add this key to `GOOGLE_API_KEY` in `Backend/.env` and `VITE_GOOGLE_API_KEY` in `Frontend/.env`.

### 3. Installation & Local Development

#### Start Backend Server
```bash
cd Backend
npm install
npm run dev
```
*Backend will start on `http://localhost:5000` and connect to MongoDB.*

#### Start Frontend Application
```bash
cd Frontend
npm install
npm run dev
```
*Frontend will start on `http://localhost:5173`.*

---

## API Endpoints Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/auth/google/url` | Generates Google OAuth authorization URL |
| `GET` | `/auth/google/callback` | OAuth code exchange & JWT session issuance |
| `GET` | `/auth/google/picker-token` | Short-lived access token for Google Picker |
| `GET` | `/auth/me` | Fetch authenticated user profile |
| `GET` | `/sheets/:spreadsheetId/tabs` | Fetch tabs in a spreadsheet |
| `GET` | `/sheets/:spreadsheetId/tabs/:sheetName/preview` | Fetch top 10 sample rows for mapping |
| `GET` | `/flows` | List all user flows |
| `POST` | `/flows` | Create new flow |
| `POST` | `/flows/test-sms` | Test Twilio credentials before saving |
| `POST` | `/flows/:id/run` | Manually trigger flow run |
| `PATCH` | `/flows/:id/pause` | Pause active flow |
| `PATCH` | `/flows/:id/resume` | Resume paused flow |
| `GET` | `/flows/:id/runs` | Fetch flow execution run history |
| `GET` | `/flows/:id/records` | Fetch sent message records |
| `POST` | `/webhooks/twilio/status` | Twilio status callback listener |

---

## License

MIT License. Free for commercial and non-commercial use.
