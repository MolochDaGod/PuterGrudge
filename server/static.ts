import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Prefer Vite build output; fall back to public/ (GrudgeOS)
  const candidates = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(__dirname, "public"),
    path.resolve(process.cwd(), "public"),
  ];
  const distPath = candidates.find((p) => fs.existsSync(p));
  if (!distPath) {
    console.warn("[static] no public dir — API-only mode");
    return;
  }

  app.use(express.static(distPath));

  const spa =
    [
      path.resolve(distPath, "grudgeos", "desktop.html"),
      path.resolve(distPath, "index.html"),
    ].find((p) => fs.existsSync(p)) || path.resolve(distPath, "index.html");

  app.use("*", (_req, res) => {
    if (fs.existsSync(spa)) {
      res.sendFile(spa);
    } else {
      res.status(404).json({ error: "not_found" });
    }
  });
}

