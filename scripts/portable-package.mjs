import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export function portableFile(source) {
  const name = path.basename(source);
  return !name.startsWith(".env") &&
    !/\.(node|so|dylib|dll)(\.|$)/.test(name) &&
    !/^(libquery_engine|query-engine|schema-engine)/.test(name) &&
    ![".git", "@img", "sharp"].includes(name) &&
    !name.startsWith("swc-");
}

export async function packagePortable(root) {
  const manifest = JSON.parse(await readFile(path.join(root, ".next/required-server-files.json"), "utf8"));
  if (!manifest.config.images.unoptimized) {
    throw new Error("Build with VAESEN_PORTABLE_BUILD=1 before creating a portable package");
  }
  const schema = await readFile(path.join(root, "node_modules/.prisma/client/schema.prisma"), "utf8");
  if (!/engineType\s*=\s*"client"/.test(schema)) {
    throw new Error("Generate the engine-free Prisma client before packaging");
  }
  const destination = path.join(root, "build/vaesen-portable");
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  const options = { recursive: true, dereference: true, filter: portableFile };
  await cp(path.join(root, ".next/standalone"), destination, options);
  await cp(path.join(root, ".next/static"), path.join(destination, ".next/static"), options);
  await cp(path.join(root, "public"), path.join(destination, "public"), options);
  // Next bundles bcrypt into app chunks, but the standalone bootstrap script needs the package.
  await cp(path.join(root, "node_modules/bcryptjs"), path.join(destination, "node_modules/bcryptjs"), options);
  await mkdir(path.join(destination, "prisma"), { recursive: true });
  for (const name of ["client.js", "seed.js"]) {
    await cp(path.join(root, "prisma", name), path.join(destination, "prisma", name));
  }
  await cp(path.join(root, "prisma/content"), path.join(destination, "prisma/content"), options);
  for (const [source, target] of [
    ["scripts/start-portable.mjs", "start.mjs"],
    ["scripts/check-portable.mjs", "check.mjs"],
    ["scripts/portable-env.mjs", "portable-env.mjs"],
    ["scripts/seed-academic.mjs", "scripts/seed-academic.mjs"],
    ["scripts/import-equipment.mjs", "scripts/import-equipment.mjs"],
    ["scripts/import-core-reference.mjs", "scripts/import-core-reference.mjs"],
  ]) {
    await mkdir(path.dirname(path.join(destination, target)), { recursive: true });
    await cp(path.join(root, source), path.join(destination, target));
  }
  await cp(path.join(root, "deploy/freebsd.env.example"), path.join(destination, ".env.example"));
  await writeFile(path.join(destination, "DEPLOYMENT.txt"), [
    "Requires Node.js 22+ and PostgreSQL. Keep this folder outside the web document root.",
    "Configure .env using .env.example (never reuse the build machine's environment).",
    "Apply migrations on macOS/Linux against the hosting database before starting.",
    "node --env-file=.env prisma/seed.js  # bootstrap only; password required for a new admin",
    "node check.mjs                     # validates configuration and database connectivity",
    "node start.mjs                     # production server, foreground",
    "Use nohup or a provider-supported supervisor to keep it running after SSH logout.",
    "The provider must proxy the HTTPS app domain to APP_HOST:PORT.",
    "Do NOT run npm install, prisma generate, or prisma migrate on FreeBSD.",
    "FreeBSD runtime compatibility must be verified on the actual host.",
    "",
  ].join("\n"));
  return destination;
}
