import { fileURLToPath } from "node:url";
import { loadPortableEnvironment } from "./portable-env.mjs";
import { createPrismaClient } from "./prisma/client.js";

loadPortableEnvironment(fileURLToPath(new URL("./", import.meta.url)));
const prisma = createPrismaClient();
try {
  await prisma.$queryRaw`SELECT 1`;
  await prisma.user.count();
  console.log(`Runtime and database check passed on ${process.platform}/${process.arch}; application tables are reachable.`);
} catch {
  console.error("Database check failed. Verify DATABASE_URL, database permissions/TLS, network access and deployed migrations.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
