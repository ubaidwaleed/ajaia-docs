import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Native/wasm-heavy server deps: load them from node_modules instead of bundling.
  serverExternalPackages: ["@electric-sql/pglite", "happy-dom", "mammoth", "pg"],
  // Migration SQL is read at runtime by the PGlite fallback.
  outputFileTracingIncludes: { "/api/**": ["./drizzle/**"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
