# EcoWatt

EcoWatt is a smart electricity management and energy analytics platform built with React, Vite, Express, and SQLite. It provides both consumer and admin experiences for tracking usage, managing appliances, viewing analytics, and generating invoices.

## Key Features

- User registration and login
- Consumer dashboard with appliance management
- Usage tracking and energy analytics
- Billing preview and invoice generation
- Admin portal for consumer management and reporting
- Printable invoices and PDF export support

## Tech Stack

- React 19 + TypeScript
- Vite for frontend development
- Express server with TypeScript
- SQLite database
- Tailwind CSS for styling
- Recharts for charts and dashboards
- jsPDF / html2canvas for print export

## Prerequisites

- Node.js 18+ / 20+
- npm

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Optionally create a `.env` file in the project root to configure a JWT secret:
   ```env
   JWT_SECRET=your-secret-key
   NODE_ENV=development
   ```

   If `JWT_SECRET` is not provided, the server generates a random secret at runtime.

## Running Locally

Start the development environment:

```bash
npm run dev
```

Open the app in your browser at:

- `http://localhost:5173`

## Build and Preview

Build the production frontend and server bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

- `src/` - React application source code
- `server.ts` - Express backend entry point
- `server/db.ts` - Database models and helper functions
- `assets/` - static assets used by the app
- `data/` - application data and seeded content
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration

## API Overview

The backend exposes authenticated routes under `/api`:

- `POST /api/auth/register` - register a new user
- `POST /api/auth/login` - login and receive a session token
- `GET /api/consumer/...` - consumer-specific data endpoints
- `GET /api/admin/...` - admin-only management endpoints

## Notes

- Authentication uses secure session tokens in headers or cookies.
- User roles include `user` and `admin` with separate dashboards.
- The frontend sends `Authorization: Bearer <token>` on protected API calls.

## License

This project is available under the MIT License.
