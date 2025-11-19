import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Use a dummy DATABASE_URL during build if not set (for prisma generate)
// prisma generate doesn't need a real database connection
const databaseUrl = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
