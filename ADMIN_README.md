# CourseHub Admin Login

## Environment

`.env.local` contains the admin credentials and MongoDB connection used by this development project.

## Create/update the admin account

Make sure MongoDB is running, then run:

```bash
npm install
npm run seed:admin
npm run dev
```

Open:

```text
http://localhost:3000/login
```

Admin credentials are read from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local`.

After successful admin login, the app redirects automatically to:

```text
http://localhost:3000/admin
```

The admin panel checks the authenticated user's MongoDB `role === "admin"` before displaying the workspace and admin APIs independently enforce the same authorization.
