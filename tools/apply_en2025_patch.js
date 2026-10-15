/* eslint-disable */
/**
 * 把 tools/patch_en2025.json 定点应用到 questions.json。
 * 只覆盖 patch 中显式给出的字段（question / options / passage / explanation），
 * 不动 id / subject / chapter / type / answer / no，也不改题目顺序或题量。
 * 用法：node tools/apply_en2025_patch.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const bankPath = path.join(root, "questions.json");
const patchPath = path.join(__dirname, "patch_en2025.json");

const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));
const patch = JSON.parse(fs.readFileSync(patchPath, "utf8"));
const idx = new Map(bank.map((q, i) => [q.id, i]));

const ALLOWED = new Set(["question", "options", "passage", "explanation"]);
let hits = 0, fields = 0;
const missing = [];

for (const [id, upd] of Object.entries(patch)) {
  const i = idx.get(id);
  if (i === undefined) { missing.push(id); continue; }
  const q = bank[i];
  for (const [k, v] of Object.entries(upd)) {
    if (!ALLOWED.has(k)) throw new Error("不允许覆盖字段: " + k);
    q[k] = v;
    fields++;
  }
  hits++;
}

if (missing.length) {
  console.error("!! 题库中找不到这些 id：", missing.join(", "));
  process.exit(1);
}

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 1), "utf-8");
console.log("已应用 patch：命中 " + hits + " 题，覆盖 " + fields + " 个字段");
console.log("题库总题数：" + bank.length);
