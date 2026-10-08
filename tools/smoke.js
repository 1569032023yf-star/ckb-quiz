const { chromium } = require("playwright-core");
const CHROME = "C:/Users/yf/.agent-browser/browsers/chrome-155.0.8059.39/chrome.exe";
const URL = "http://127.0.0.1:8766/index.html";

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message));
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(2000);

  const stat = await p.evaluate(() => {
    const t = document.body.innerText;
    return { total: (t.match(/(\d+)总题数/) || [])[1], tabs: [...document.querySelectorAll(".stab")].map(e => e.innerText.replace(/\n/g, " ")) };
  });
  console.log("总题数:", stat.total, "| 科目页签:", stat.tabs.join(" / "));

  // 按章节
  await p.click("text=按章节练习");
  await p.waitForTimeout(600);
  const chaps = await p.$$eval("#view-chapter button, #view-chapter .ch", els => els.map(e => e.innerText.replace(/\n/g, " ")).filter(Boolean));
  console.log("章节数:", chaps.length, "| 前8:", chaps.slice(0, 8).join(" | "));

  // 回首页 -> 顺序练习
  await p.click("#view-chapter button");
  await p.waitForTimeout(500);
  await p.click("text=顺序练习");
  await p.waitForTimeout(800);
  let q1 = await p.evaluate(() => ({
    meta: document.querySelector("#q-meta") && document.querySelector("#q-meta").innerText,
    q: document.querySelector("#q-text") && document.querySelector("#q-text").innerText.slice(0, 120),
    opts: [...document.querySelectorAll("#q-options .opt")].map(e => e.innerText.slice(0, 40)),
    prog: document.querySelector("#q-idx") && document.querySelector("#q-idx").innerText
  }));
  console.log("\n---- 第1题 ----");
  console.log("进度:", q1.prog, "| 标签:", q1.meta);
  console.log("题干:", q1.q.replace(/\n/g, " "));
  console.log("选项:", q1.opts.join(" ; "));

  // 点第一个选项再提交
  await p.click("#q-options .opt");
  await p.click("#btn-submit");
  await p.waitForTimeout(700);
  const res = await p.evaluate(() => ({
    head: document.querySelector("#rb-head") && document.querySelector("#rb-head").innerText,
    ans: document.querySelector("#rb-answer") && document.querySelector("#rb-answer").innerText.slice(0, 120),
    expl: document.querySelector("#rb-explain") && document.querySelector("#rb-explain").innerText.slice(0, 160)
  }));
  console.log("\n判题:", res.head);
  console.log("答案:", (res.ans || "").replace(/\n/g, " "));
  console.log("解析:", (res.expl || "").replace(/\n/g, " "));

  await p.screenshot({ path: "_tmp/shot_quiz.png" });

  // 下一题 x3，确认能连续走
  for (let i = 0; i < 3; i++) { await p.click("#btn-next"); await p.waitForTimeout(350); }
  const q5 = await p.evaluate(() => (document.querySelector("#q-idx") || {}).innerText);
  console.log("\n连点下一题后进度:", q5);

  // 收藏 + 错题本
  await p.click("#btn-fav");
  await p.waitForTimeout(300);
  await p.click("#view-quiz .bar-back");
  await p.waitForTimeout(500);
  const home2 = await p.evaluate(() => document.body.innerText.slice(0, 300));
  console.log("\n返回首页:", home2.replace(/\n+/g, " | ").slice(0, 240));

  console.log("\n控制台错误:", errs.length ? errs : "无");
  await b.close();
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
