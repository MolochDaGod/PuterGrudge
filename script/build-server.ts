/**
 * Railway / API-only server build (no Vite client).
 * Frontend GrudgeOS ships on Vercel; this is the user backend.
 */
import { build as esbuild } from "esbuild";
import { mkdir, readFile } from "fs/promises";
import path from "path";

const allowlist = [
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "uuid",
  "ws",
  "zod",
  "zod-validation-error",
  "bcryptjs",
  "helmet",
  "dotenv",
];

async function main() {
  await mkdir("dist", { recursive: true });
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  console.log("[build-server] bundling server/index.ts → dist/index.cjs");
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    external: externals,
    logLevel: "info",
    alias: {
      "@shared": path.resolve("shared"),
    },
  });
  console.log("[build-server] ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
