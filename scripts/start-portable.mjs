import { fileURLToPath } from "node:url";
import { loadPortableEnvironment } from "./portable-env.mjs";

loadPortableEnvironment(fileURLToPath(new URL("./", import.meta.url)));
await import("./server.js");
