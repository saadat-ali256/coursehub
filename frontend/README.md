# CourseHub Frontend

Next.js frontend. Each website route has its page UI in its own `page.tsx`; backend/API logic lives in the sibling `server` folder.

## Setup

Create `.env.local` if needed:

```env
API_SERVER_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run:

```bash
npm install
npm run dev
```

Run the backend separately in another terminal from `server/` with `npm run dev`.
The frontend proxies `/api/*` to the backend at `http://localhost:5000`; if the
backend is stopped, API requests will fail with `ECONNREFUSED`.

The in-app bell only shows notifications when a course or blog post is
published. Browser push and manual notification broadcasts are disabled.

Open `http://localhost:3000`.

When testing on the same computer, use `localhost` instead of the computer's
LAN IP address. Browsers only treat HTTPS and localhost as secure contexts;
Clerk secure cookies may not work on an HTTP LAN address. Use HTTPS when
accessing the development site from another device.
