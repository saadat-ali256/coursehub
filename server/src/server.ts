import dotenv from "dotenv";
import express, {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import cors from "cors";
import { Readable } from "node:stream";
import path from "node:path";
import { requestContext } from "@/request-context";
import { routeModules } from "@/route-registry";

// Match Next.js local environment loading so the API server reads server/.env.local.
dotenv.config({ path: [".env.local", ".env"], quiet: true });

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Keep the raw request body so Next-style Request.json()/formData() continue to work.
app.use(express.raw({ type: "*/*", limit: "2gb" }));

app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads")),
);

function headersFromExpress(req: ExpressRequest) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value !== undefined) headers.set(key, value);
  }
  return headers;
}

async function toWebRequest(req: ExpressRequest) {
  const origin = `${req.protocol}://${req.get("host")}`;
  const url = new URL(req.originalUrl || req.url, origin);
  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : Buffer.isBuffer(req.body)
        ? req.body
        : undefined;
  return new Request(url, {
    method,
    headers: headersFromExpress(req),
    body: body as BodyInit | null | undefined,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

async function sendWebResponse(response: Response, res: ExpressResponse) {
  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") res.setHeader(key, value);
  });
  const getSetCookie = (
    response.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  if (getSetCookie) {
    const cookies = getSetCookie.call(response.headers);
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
  } else {
    const cookie = response.headers.get("set-cookie");
    if (cookie) res.setHeader("Set-Cookie", cookie);
  }
  if (!response.body) return res.end();
  Readable.fromWeb(response.body as any).pipe(res);
}

function makeParams(req: ExpressRequest) {
  const params = { ...req.params };
  return Promise.resolve(params);
}

for (const entry of routeModules) {
  const route = entry.module as Record<string, unknown>;
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"] as const) {
    const handler = route[method];
    if (typeof handler !== "function") continue;

    (app as any)[method.toLowerCase()](
      entry.path,
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const webRequest = await toWebRequest(req);
          const context = { params: makeParams(req) };
          const response = await requestContext.run(
            { request: webRequest },
            () => (handler as any)(webRequest, context),
          );
          await sendWebResponse(response, res);
        } catch (error) {
          console.error(`API ${method} ${entry.path} failed`, error);
          if (!res.headersSent)
            res
              .status(500)
              .json({ success: false, message: "Internal server error" });
        }
      },
    );
  }
}

app.get("/health", (_req, res) => {
  res.json({ success: true, service: "coursehub-server", status: "ok" });
});

app.listen(port, () => {
  console.log(`CourseHub server running on http://localhost:${port}`);
});
