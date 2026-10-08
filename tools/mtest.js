const { chromium } = require("playwright-core");
const CHROME = "C:/Users/yf/.agent-browser/browsers/chrome-155.0.8059.39/chrome.exe";
const URL = "http://127.0.0.1:8766/index.html";
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(1800);
  await p.click("text=按章节练习");
  await p.waitForTimeout(600);
  await p.click('#view-chapter button:has-text("高数 2020年真题")');
  await p.waitForTimeout(900);
  console.log("已进入 高数 2020年真题");
  for (let i = 0; i < 10; i++) { await p.click("#btn-next").catch(()=>{}); await p.waitForTimeout(220); }
  const s1 = await p.evaluate(() => ({
    idx: (document.querySelector("#q-idx")||{}).innerText,
    meta: (document.querySelector("#q-meta")||{}).innerText,
    q: (document.querySelector("#q-text")||{}).innerText.slice(0,70),
    fillVisible: !document.querySelector("#q-fill").classList.contains("hidden"),
    opts: document.querySelectorAll("#q-options .opt").length
  }));
  console.log("[填空]", JSON.stringify(s1));
  await p.fill("#fill-input", "2e^{2x}dx").catch(()=>{});
  await p.click("#btn-submit");
  await p.waitForTimeout(600);
  const r1 = await p.evaluate(() => ({
    head: (document.querySelector("#rb-head")||{}).innerText,
    ans: (document.querySelector("#rb-answer")||{}).innerText.replace(/\n/g," ").slice(0,90)
  }));
  console.log("[填空判题]", JSON.stringify(r1));
  await p.screenshot({ path: "_tmp/shot_fill.png" });
  for (let i = 0; i < 10; i++) { await p.click("#btn-next").catch(()=>{}); await p.waitForTimeout(220); }
  const s2 = await p.evaluate(() => ({
    idx: (document.querySelector("#q-idx")||{}).innerText,
    essayVisible: !document.querySelector("#q-essay").classList.contains("hidden"),
    q: (document.querySelector("#q-text")||{}).innerText.slice(0,70)
  }));
  console.log("[解答]", JSON.stringify(s2));
  await p.click("#btn-submit");
  await p.waitForTimeout(600);
  const r2 = await p.evaluate(() => (document.querySelector("#rb-explain")||{}).innerText.slice(0,150));
  console.log("[解答解析]", (r2||"").replace(/\n/g," "));
  await p.screenshot({ path: "_tmp/shot_essay.png" });
  console.log("错误:", errs.length?errs:"无");
  await b.close();
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
