/* eslint-disable */
/** 2025 英语整卷修复验收：真机渲染 + 噪声扫描 */
const { chromium } = require("playwright-core");
const CHROME = "C:/Users/yf/.agent-browser/browsers/chrome-155.0.8059.39/chrome.exe";
const URL = "http://127.0.0.1:8766/index.html";

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  p.on("pageerror", e => errs.push("pageerror: " + e.message));

  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(1600);
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(1800);

  const enter2025 = async () => {
    await p.click('[data-act="chapter"]'); await p.waitForTimeout(500);
    await p.evaluate(() => { const x = document.querySelector('[data-ch="英语 2025年真题"]'); x && x.click(); });
    await p.waitForTimeout(700);
  };
  await enter2025();

  const readQ = async () => await p.evaluate(() => ({
    pos: (document.querySelector("#q-pos") || {}).textContent || "",
    n: parseInt(((document.querySelector("#q-meta") || {}).textContent || "0"), 10),
    text: (document.querySelector("#q-text") || {}).innerText || "",
    opts: [...document.querySelectorAll("#q-options .opt")].map(o => o.innerText.replace(/\s+/g, " ").trim()),
    passage: (document.querySelector("#psg-body") || {}).textContent || "",
  }));

  const GARBAGE = /[a-z]{2,}[.][a-z]{2,}|密封|准考证|签字|统分|全国统一考试|第\d+页/;
  const noisy = [];

  let q = await readQ();
  console.log("[1] 第1题:", q.text.replace(/\n/g, " / "));
  console.log("    选项:", q.opts.join(" | "));

  for (let i = 2; i <= 61; i++) {
    await p.click("#btn-next"); await p.waitForTimeout(105);
    q = await readQ();
    const blob = q.text + " " + q.opts.join(" ") + " " + q.passage;
    if (GARBAGE.test(blob)) noisy.push(q.n + " → " + blob.slice(0, 130).replace(/\n/g, "/"));
    if ([10, 26, 37, 56, 61].includes(i)) {
      console.log("[" + q.n + "] " + q.text.replace(/\n/g, " ⏎ ").slice(0, 90));
      if (q.opts.length) console.log("     选项:", q.opts.join(" | "));
      if (q.passage) console.log("     原文:", q.passage.replace(/\n/g, " ⏎ ").slice(0, 150), "…（共 " + q.passage.length + " 字）");
    }
  }
  console.log("翻到末尾题号:", q.n, "| 分母:", q.pos);
  console.log("含噪声/乱码的题:", noisy.length ? "\n   " + noisy.join("\n   ") : "0 题");

  // 阅读题解析渲染（清进度后重新进入，避免断点续刷落在末题）
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(1600);
  await enter2025();
  for (let i = 1; i < 37; i++) { await p.click("#btn-next"); await p.waitForTimeout(60); }
  q = await readQ();
  await p.click("#btn-psg"); await p.waitForTimeout(250);
  await p.click("#q-options .opt"); await p.waitForTimeout(200);
  await p.click("#btn-submit"); await p.waitForTimeout(600);
  const exp = await p.evaluate(() => document.querySelector("#rb-explain").innerText);
  console.log("[解析] 第" + q.n + "题（" + q.text.slice(0, 40) + "）解析长度:", exp.length, "| 含「故选D」:", /故选\s*D/.test(exp));
  await p.screenshot({ path: "_tmp/fix25/shot_2025_q37.png" });

  // 第 1 题截图
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(1600);
  await enter2025();
  await p.screenshot({ path: "_tmp/fix25/shot_2025_q1.png" });

  console.log("控制台错误:", errs.length ? errs.join(" ; ") : "0");
  await b.close();
})();
