/* eslint-disable @typescript-eslint/no-require-imports -- Shared by the app and Node CLI scripts. */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

/** @param {string} databaseUrl */
function postgresOptions(databaseUrl) {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must be a PostgreSQL URL");
  }
  const limit = url.searchParams.get("connection_limit");
  const max = limit === null ? 5 : Number(limit);
  if (!Number.isInteger(max) || max < 1 || max > 100) {
    throw new Error("DATABASE_URL connection_limit must be an integer between 1 and 100");
  }
  const schema = url.searchParams.get("schema") || "public";
  // Prisma URL options are not pg options. Pass the schema directly to the adapter.
  url.searchParams.delete("schema");
  url.searchParams.delete("connection_limit");
  return {
    pool: { connectionString: url.toString(), max, connectionTimeoutMillis: 10000 },
    schema,
  };
}

/**
 * @param {string | undefined} [databaseUrl]
 * @returns {import("@prisma/client").PrismaClient}
 */
function createPrismaClient(databaseUrl = process.env.DATABASE_URL) {
  const { pool, schema } = postgresOptions(databaseUrl || "");
  return new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
}

module.exports = { createPrismaClient, postgresOptions };
