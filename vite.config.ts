import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";

const rootDir = import.meta.dirname;
const outDir = path.resolve(rootDir, "dist/public");

/**
 * Copy root public/ into dist/public after Vite build.
 * Vite root is client/, so default publicDir only sees client/public.
 * GrudgeOS assets live in public/grudgeos (lib, styles, apps).
 * Heavy optional packs (maps/gapps) are skipped on Vercel to keep deploys lean.
 */
function copyRootPublic(): Plugin {
  const skipDirs = new Set(
    process.env.VERCEL || process.env.SKIP_HEAVY_PUBLIC === "1"
      ? ["maps", "gapps"]
      : [],
  );

  function copyRecursive(src: string, dest: string) {
    if (!existsSync(src)) return;
    mkdirSync(dest, { recursive: true });
    for (const entry of readdirSync(src)) {
      const from = path.join(src, entry);
      const to = path.join(dest, entry);
      const st = statSync(from);
      if (st.isDirectory()) {
        if (skipDirs.has(entry)) {
          console.log(`[copy-root-public] skip heavy dir: ${entry}`);
          continue;
        }
        copyRecursive(from, to);
      } else {
        cpSync(from, to);
      }
    }
  }

  return {
    name: "copy-root-public",
    closeBundle() {
      const publicSrc = path.resolve(rootDir, "public");
      if (!existsSync(publicSrc)) {
        console.warn("[copy-root-public] public/ not found — skipping");
        return;
      }
      console.log("[copy-root-public] merging public/ → dist/public");
      copyRecursive(publicSrc, outDir);
    },
  };
}

// Only import replit plugins in development
const isProduction = process.env.NODE_ENV === "production";
const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig({
  plugins: [
    react(),
    copyRootPublic(),
    // Only include replit plugins in dev mode on Replit
    ...(!isProduction && isReplit
      ? await Promise.all([
        import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default()),
        import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
        import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
      ]).catch(() => [])
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "client", "src"),
      "@shared": path.resolve(rootDir, "shared"),
      "@assets": path.resolve(rootDir, "attached_assets"),
    },
  },
  root: path.resolve(rootDir, "client"),
  // client/public (favicon) + plugin merges root public/
  publicDir: path.resolve(rootDir, "client", "public"),
  build: {
    outDir,
    emptyOutDir: true,
  },
  server: {
    fs: {
      // Allow serving root public during dev
      allow: [rootDir],
      strict: true,
      deny: ["**/.*"],
    },
  },
});
