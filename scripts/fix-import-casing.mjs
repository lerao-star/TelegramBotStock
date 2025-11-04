import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = process.cwd();

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

function findActualPathInsensitive(p) {
  // Walk segments from root of repo
  const abs = path.resolve(p);
  const parts = abs.split(path.sep);
  // handle Windows leading drive
  let cur = parts[0];
  if (!fs.existsSync(cur)) return null;
  for (let i = 1; i < parts.length; i++) {
    const entries = fs.readdirSync(cur);
    const desired = parts[i];
    const match = entries.find(
      (e) => e.toLowerCase() === desired.toLowerCase()
    );
    if (!match) return null;
    cur = path.join(cur, match);
  }
  return cur;
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

const importRegex =
  /(?:import\s.*?from\s*['"](.*?)['"])|(?:require\(['"](.*?)['"]\))/g;
const files = getAllFiles(root);
let changed = 0;

for (const f of files) {
  let src = fs.readFileSync(f, "utf8");
  let m;
  const fixes = [];
  while ((m = importRegex.exec(src))) {
    const imp = m[1] || m[2];
    if (!imp) continue;
    if (!imp.startsWith(".")) continue;
    const dir = path.dirname(f);
    const resolvedCandidates = [
      path.resolve(dir, imp),
      path.resolve(dir, imp + ".js"),
      path.resolve(dir, imp + ".mjs"),
      path.resolve(dir, imp + ".cjs"),
      path.resolve(dir, imp, "index.js"),
    ];
    let actual = null;
    for (const cand of resolvedCandidates) {
      const found = findActualPathInsensitive(cand);
      if (found) {
        actual = found;
        break;
      }
    }
    if (!actual) continue;
    // compute relative path from file dir to actual, using exact casing
    const rel = path.relative(dir, actual);
    let relp = rel.startsWith("..") ? rel : "./" + rel;
    // normalize to posix style in imports
    relp = toPosix(relp);
    // remove .js extension for consistency? keep extension to be exact
    // perform replacement only if different (case or slash)
    if (imp !== relp) {
      fixes.push({ from: imp, to: relp });
    }
  }
  if (fixes.length > 0) {
    for (const { from, to } of fixes) {
      const re = new RegExp(
        `(['\"])${from.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(['\"])`,
        "g"
      );
      src = src.replace(re, `$1${to}$2`);
    }
    fs.writeFileSync(f, src, "utf8");
    changed += fixes.length;
    console.log(`Fixed ${fixes.length} imports in ${path.relative(root, f)}`);
  }
}

console.log(`Done. Total fixes: ${changed}`);
process.exit(0);
