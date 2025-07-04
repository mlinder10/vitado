import { config } from "dotenv";
config();
import type { Config } from "drizzle-kit";

export default {
  schema: ["src/db/schemas.ts"],
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
