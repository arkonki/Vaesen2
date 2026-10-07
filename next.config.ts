import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.prisma/client/**"],
  },
  // Portable bundles cannot use sharp's build-machine-specific native library.
  images: { unoptimized: process.env.VAESEN_PORTABLE_BUILD === "1" },
};

export default nextConfig;
