import { build, context } from "esbuild";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const isWatchMode = process.argv.includes("--watch");
const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");

async function copyStaticAssets() {
  await mkdir(distDir, { recursive: true });
  await cp(path.join(projectRoot, "public"), distDir, { recursive: true });
}

const sharedConfig = {
  entryPoints: {
    content: path.join(projectRoot, "src/content/index.ts"),
    background: path.join(projectRoot, "src/background/index.ts")
  },
  bundle: true,
  outdir: distDir,
  format: "iife",
  target: "chrome120",
  sourcemap: true,
  logLevel: "info"
};

await copyStaticAssets();

if (isWatchMode) {
  const ctx = await context(sharedConfig);
  await ctx.watch();
  console.log("Watching MindLens extension files...");
} else {
  await build(sharedConfig);
  console.log("Built MindLens extension into dist/");
}
