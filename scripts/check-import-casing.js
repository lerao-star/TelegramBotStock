#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Emulate __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllFiles(dir, exts = [".js", ".mjs", ".cjs", ".ts"]) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(full, exts));
    } else {
      if (exts.includes(path.extname(full))) results.push(full);
    }
  });
  return results;
}

function listDirNames(dir) {
  return fs.readdirSync(dir);
}

// Check path exists with exact casing by walking segments and comparing against actual dir entries
function existsCaseSensitive(p) {
  const parts = path.resolve(p).split(path.sep);
  if (!fs.existsSync(parts[0])) return false;
  let cur = parts[0];
  for (let i = 1; i < parts.length; i++) {
    try {
      const entries = fs.readdirSync(cur);
      const matched = entries.find((e) => e === parts[i]);
      if (!matched) return false;
      cur = path.join(cur, matched);
    } catch (err) {
      return false;
    }
  }
  return true;
}

function resolveImport(fromFile, importPath) {
  if (!importPath.startsWith(".")) return null; // ignore external modules
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, importPath);
  const candidates = [
    resolved,
    resolved + ".js",
    resolved + ".mjs",
    resolved + ".cjs",
    path.join(resolved, "index.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

// Use repo root (script should be run from project root). If not, resolve relative to script.
const root = process.cwd() || __dirname;
const files = getAllFiles(root);
let problems = [];

const importRegex =
  /(?:import\s.*?from\s*['\"](.*?)['\"])|(?:require\(['\"](.*?)['\"]\))/g;

files.forEach((f) => {
  const src = fs.readFileSync(f, "utf8");
  let m;
  while ((m = importRegex.exec(src))) {
    const imp = m[1] || m[2];
    if (!imp) continue;
    if (!imp.startsWith(".")) continue;
    const target = resolveImport(f, imp);
    if (!target) continue;
    if (!existsCaseSensitive(target)) {
      problems.push({ file: f, import: imp, resolved: target });
    }
  }
});

if (problems.length === 0) {
  console.log("No casing problems found.");
  process.exit(0);
}

console.log("Found import casing problems:");
problems.forEach((p) => {
  console.log(`- ${p.file} -> ${p.import} (resolved ${p.resolved})`);
});
process.exit(2);
