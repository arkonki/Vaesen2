import { describe, expect, it } from "vitest";
import { createPrismaClient, postgresOptions } from "../prisma/client";

describe("engine-free PostgreSQL configuration", () => {
  it("preserves the schema and uses a shared-hosting-sized connection pool", () => {
    const { pool, schema } = postgresOptions("postgresql://user:pass@localhost/db?schema=campaign&sslmode=require");
    expect(schema).toBe("campaign");
    expect(pool.max).toBe(5);
    expect(pool.connectionTimeoutMillis).toBe(10000);
    const url = new URL(pool.connectionString);
    expect(url.searchParams.has("schema")).toBe(false);
    expect(url.searchParams.get("sslmode")).toBe("require");
  });
  it("honors an explicit connection limit and URL-encoded credentials", () => {
    const { pool, schema } = postgresOptions("postgres://user:p%40ss@localhost/db?connection_limit=2");
    expect(schema).toBe("public");
    expect(pool.max).toBe(2);
    expect(new URL(pool.connectionString).password).toBe("p%40ss");
    expect(new URL(pool.connectionString).searchParams.has("connection_limit")).toBe(false);
  });
  it("rejects missing/invalid configuration without printing credentials", () => {
    expect(() => postgresOptions("")).toThrow("DATABASE_URL is required");
    expect(() => postgresOptions("password-without-a-url")).toThrow("valid PostgreSQL URL");
    expect(() => postgresOptions("https://user:secret@example.com/db")).toThrow("PostgreSQL URL");
    for (const limit of ["0", "-1", "101", "1.5", "invalid", ""]) {
      expect(() => postgresOptions(`postgresql://localhost/db?connection_limit=${limit}`)).toThrow("connection_limit");
    }
  });
  it("constructs and disconnects a client without a native query engine", async () => {
    const client = createPrismaClient("postgresql://test-only@127.0.0.1:1/not_configured_test");
    await expect(client.$disconnect()).resolves.toBeUndefined();
  });
});

describe.skipIf(!process.env.TEST_DATABASE_URL)("PostgreSQL adapter schema routing", () => {
  it("queries a non-public schema rather than silently falling back to public", async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL!;
    if (!new URL(databaseUrl).pathname.endsWith("_test")) throw new Error("Use an isolated test database");
    const schema = `adapter_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = createPrismaClient(databaseUrl);
    const url = new URL(databaseUrl);
    url.searchParams.set("schema", schema);
    const scoped = createPrismaClient(url.toString());
    try {
      await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
      await admin.$executeRawUnsafe(`CREATE TABLE "${schema}"."User" ("id" text PRIMARY KEY, "email" text)`);
      await admin.$executeRawUnsafe(`INSERT INTO "${schema}"."User" VALUES ('adapter-test', 'schema-routing@test.local')`);
      expect(await scoped.user.findMany({ select: { id: true, email: true } })).toEqual([
        { id: "adapter-test", email: "schema-routing@test.local" },
      ]);
    } finally {
      await scoped.$disconnect();
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.$disconnect();
    }
  });
});
