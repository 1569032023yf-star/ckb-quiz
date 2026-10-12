/* 视觉确认：英语词汇题空位 + 补全对话原文 */
const { chromium } = require("playwright-core");
const CHROME = "C:/Users/yf/.agent-browser/browsers/chrome-155.0.8059.39/chrome.exe";

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://127.0.0.1:8766/index.html", { waitUntil: "load" });
  await p.waitForTimeout(1600);
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(1600);

  await p.evaluate(() => { const t = [...document.querySelectorAll(".stab")].find(e => e.innerText.includes("英语")); if (t) t.click(); });
  await p.waitForTimeout(500);
  await p.click('text=按章节练习');
  await p.waitForTimeout(600);
  await p.click('#chapter-list button:has-text("英语 2024年真题")');
  await p.waitForTimeout(700);

  const info = async () => p.evaluate(() => ({
    meta: (document.querySelector("#q-meta") || {}).innerText,
    q: (document.querySelector("#q-text") || {}).innerText.replace(/\n/g, " ").slice(0, 90),
    hasPsg: !!document.querySelector("#q-passage") && !document.querySelector("#q-passage").classList.contains("hidden"),
    opts: [...document.querySelectorAll("#q-options .opt .txt")].map(e => e.innerText.slice(0, 22))
  }));

  for (let i = 0; i < 10; i++) { await p.click("#btn-next"); await p.waitForTimeout(120); }
  console.log("[第11题]", JSON.stringify(await info(), null, 1));
  await p.screenshot({ path: "_tmp/shot_vocab.png" });

  for (let i = 0; i < 45; i++) { await p.click("#btn-next"); await p.waitForTimeout(100); }
  const c = await info();
  console.log("[第56题]", JSON.stringify(c, null, 1));
  if (c.hasPsg) {
    await p.click("#btn-psg"); await p.waitForTimeout(400);
    const psg = await p.evaluate(() => document.querySelector("#psg-body").innerText.replace(/\n/g, " ").slice(0, 170));
    console.log("[对话原文]", psg);
    await p.screenshot({ path: "_tmp/shot_conv.png" });
  }
  console.log("错误:", errs.length ? errs : "无");
  await b.close();
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
