import { describe, expect, it } from "vitest";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { packagePortable, portableFile } from "../scripts/portable-package.mjs";
import { validatePortableEnvironment } from "../scripts/portable-env.mjs";

const env = {
  DATABASE_URL: "postgresql://user:password@localhost/db",
  NEXTAUTH_URL: "https://app.example.com",
  NEXTAUTH_SECRET: "test-only-secret-not-for-production-123456",
};
describe("portable runtime", () => {
  it("accepts Node 24 and binds only to localhost by default", () => {
    expect(validatePortableEnvironment(env, "24.19.0")).toEqual({ hostname: "127.0.0.1", port: "3000" });
    expect(validatePortableEnvironment({ ...env, PORT: "4000", APP_HOST: "0.0.0.0" }, "22.14.0")).toEqual({ hostname: "0.0.0.0", port: "4000" });
  });
  it("rejects old Node, missing settings, weak secrets and invalid URLs/ports", () => {
    expect(() => validatePortableEnvironment(env, "20.19.0")).toThrow("Node.js 22");
    for (const key of ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"]) {
      expect(() => validatePortableEnvironment({ ...env, [key]: "" })).toThrow(`${key} is required`);
    }
    expect(() => validatePortableEnvironment({ ...env, NEXTAUTH_SECRET: "short" })).toThrow("32 characters");
    expect(() => validatePortableEnvironment({ ...env, NEXTAUTH_SECRET: "replace-with-output-of-openssl-rand-hex-32" })).toThrow("unique secret");
    expect(() => validatePortableEnvironment({ ...env, DATABASE_URL: "invalid" })).toThrow("valid URLs");
    expect(() => validatePortableEnvironment({ ...env, DATABASE_URL: "https://example.com" })).toThrow("PostgreSQL");
    expect(() => validatePortableEnvironment({ ...env, NEXTAUTH_URL: "http://app.example.com" })).toThrow("HTTPS");
    for (const PORT of ["0", "65536", "3000invalid"]) expect(() => validatePortableEnvironment({ ...env, PORT })).toThrow("PORT");
    expect(() => validatePortableEnvironment({ ...env, NEXTAUTH_URL: "http://localhost:3000" })).not.toThrow();
  });
  it("filters secrets, native modules and legacy Prisma binaries", () => {
    for (const name of [".env", ".env.production", ".env.local", "addon.node", "lib.so.1", "lib.dylib", "lib.dll", "libquery_engine-native.node", "schema-engine", "query-engine-native", "sharp", "@img", "swc-darwin-arm64", ".git"]) {
      expect(portableFile(`/app/${name}`)).toBe(false);
    }
    for (const name of ["schema.prisma", "query_compiler_bg.postgresql.wasm", "query_compiler_bg.postgresql.js", "server.js"]) expect(portableFile(`/app/${name}`)).toBe(true);
  });
  it("packages runtime assets and bootstrap scripts without local secrets or binaries", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "vaesen-portable-package-"));
    async function file(name: string, data = "test") {
      await mkdir(path.dirname(path.join(root, name)), { recursive: true });
      await writeFile(path.join(root, name), data);
    }
    try {
      await file(".next/required-server-files.json", JSON.stringify({ config: { images: { unoptimized: true } } }));
      await file("node_modules/.prisma/client/schema.prisma", 'generator client { engineType = "client" }');
      await file("node_modules/bcryptjs/index.js");
      await file(".next/standalone/server.js");
      await file(".next/standalone/.env", "SECRET=must-not-be-copied");
      await file(".next/standalone/node_modules/.prisma/client/query_compiler_bg.postgresql.wasm");
      await file(".next/standalone/node_modules/native.node");
      await file(".next/static/site.css");
      await file("public/icon.svg");
      for (const name of ["prisma/client.js", "prisma/seed.js", "scripts/start-portable.mjs", "scripts/check-portable.mjs", "scripts/portable-env.mjs", "deploy/freebsd.env.example"]) {
        await mkdir(path.dirname(path.join(root, name)), { recursive: true });
        await cp(path.resolve(name), path.join(root, name));
      }
      const destination = await packagePortable(root);
      expect(await readdir(destination)).not.toContain(".env");
      expect(await readdir(path.join(destination, "node_modules"))).not.toContain("native.node");
      expect(await readFile(path.join(destination, ".next/static/site.css"), "utf8")).toBe("test");
      expect(await readFile(path.join(destination, "public/icon.svg"), "utf8")).toBe("test");
      expect(await readFile(path.join(destination, "prisma/client.js"), "utf8")).toContain("PrismaPg");
      expect(await readFile(path.join(destination, "node_modules/bcryptjs/index.js"), "utf8")).toBe("test");
      expect(await readFile(path.join(destination, ".env.example"), "utf8")).not.toContain("must-not-be-copied");
      expect(await readFile(path.join(destination, "check.mjs"), "utf8")).toContain("prisma.user.count");
      expect(await readFile(path.join(destination, "node_modules/.prisma/client/query_compiler_bg.postgresql.wasm"), "utf8")).toBe("test");
      await file(".next/required-server-files.json", JSON.stringify({ config: { images: { unoptimized: false } } }));
      await expect(packagePortable(root)).rejects.toThrow("VAESEN_PORTABLE_BUILD");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
