import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { packagePortable } from "./portable-package.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!["darwin", "linux"].includes(process.platform)) {
  throw new Error("Build on macOS or Linux, then upload the portable package to FreeBSD");
}
function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root, stdio: "inherit", env: { ...process.env, VAESEN_PORTABLE_BUILD: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run("node", ["node_modules/prisma/build/index.js", "generate"]);
run("npm", ["run", "build"]);
const destination = await packagePortable(root);
run("tar", ["-czf", "build/vaesen-portable.tar.gz", "-C", "build", path.basename(destination)]);
console.log("Portable package: build/vaesen-portable.tar.gz (no local .env or native binaries)");
