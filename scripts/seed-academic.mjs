import { loadEnvFile } from "node:process";
import { createRequire } from "node:module";
import { createPrismaClient } from "../prisma/client.js";
const { installAcademicTemplate } = createRequire(import.meta.url)("../prisma/content/academic.js");
try { loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (process.argv.slice(2).some(arg => !["--apply", "--replace"].includes(arg))) throw new Error("Usage: npm run db:content:academic -- [--apply] [--replace]");
const prisma = createPrismaClient();
try {
  const result = await installAcademicTemplate(prisma, { apply: process.argv.includes("--apply"), replace: process.argv.includes("--replace") });
  console.log(result.applied ? "Academic reference content installed." : result.changes.length ? "Preview only; use --apply after backing up the database." : "Academic reference content is already installed; nothing changed.");
  for (const change of result.changes) console.log(`- ${change}`);
  console.log("Existing characters, inventory, accounts and unrelated content are preserved.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
