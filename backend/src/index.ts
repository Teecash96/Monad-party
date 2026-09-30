import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { eligibilityRouter } from "./api/eligibility";
import { merkleRouter } from "./api/merkle";
import { twitterRouter } from "./api/twitter";
import { historyRouter } from "./api/history";
import { adminRouter } from "./api/admin";
import { prisma } from "./db/pool";
import { runtimeReadiness } from "./config/readiness";

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
if (process.env.NODE_ENV !== "production") allowedOrigins.add("http://127.0.0.1:3000");

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json({ limit: "32kb" }));
app.get("/health", async (_request, response) => {
  await prisma.$queryRaw`SELECT 1`;
  response.json({ status: "ok" });
});
app.get("/health/ready", async (_request, response) => {
  const readiness = await runtimeReadiness();
  response.status(readiness.ready ? 200 : 503).json(readiness);
});
app.use("/api/eligibility", eligibilityRouter);
app.use("/api/merkle", merkleRouter);
app.use("/api/twitter", twitterRouter);
app.use("/api/history", historyRouter);
app.use("/api/admin", adminRouter);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Invalid request", detail: error.flatten() });
    return;
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  console.error(error);
  response.status(500).json({ error: message });
});

const server = app.listen(port, () => {
  console.log(`Monad raffle API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
