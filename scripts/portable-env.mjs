import { loadEnvFile } from "node:process";
import path from "node:path";

export function validatePortableEnvironment(env, nodeVersion = process.versions.node) {
  if (Number(nodeVersion.split(".")[0]) < 22) throw new Error("Node.js 22 or later is required");
  for (const key of ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"]) {
    if (!env[key]) throw new Error(`${key} is required in the runtime environment`);
  }
  let database, auth;
  try {
    database = new URL(env.DATABASE_URL);
    auth = new URL(env.NEXTAUTH_URL);
  } catch {
    throw new Error("DATABASE_URL and NEXTAUTH_URL must be valid URLs");
  }
  if (!["postgres:", "postgresql:"].includes(database.protocol)) throw new Error("DATABASE_URL must use PostgreSQL");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(auth.hostname);
  if (auth.protocol !== "https:" && !(local && auth.protocol === "http:")) {
    throw new Error("NEXTAUTH_URL must use HTTPS (HTTP is allowed only for localhost tests)");
  }
  if (env.NEXTAUTH_SECRET.length < 32 || env.NEXTAUTH_SECRET === "replace-with-output-of-openssl-rand-hex-32") {
    throw new Error("NEXTAUTH_SECRET must be a unique secret of at least 32 characters; generate it with openssl rand -hex 32");
  }
  const port = env.PORT || "3000";
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("PORT must be between 1 and 65535");
  return { hostname: env.APP_HOST || "127.0.0.1", port };
}

export function loadPortableEnvironment(root) {
  process.chdir(root);
  try {
    loadEnvFile(path.join(root, ".env"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const { hostname, port } = validatePortableEnvironment(process.env);
  process.env.NODE_ENV = "production";
  // HOSTNAME is often inherited from the shell; APP_HOST is our explicit binding setting.
  process.env.HOSTNAME = hostname;
  process.env.PORT = port;
}
