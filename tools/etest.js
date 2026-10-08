/* 主观题错题本行为测试 */
const { chromium } = require("playwright-core");
const CHROME = "C:/Users/yf/.agent-browser/browsers/chrome-155.0.8059.39/chrome.exe";
const URL = "http://127.0.0.1:8766/index.html";

(async () => {
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = [];
  p.on("pageerror", e => errs.push(e.message));

  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem("ckb_app_v1") || "{}"));
  const W = async () => ((await db()).wrong || []);

  await p.goto(URL, { waitUntil: "load" });
  await p.waitForTimeout(1500);
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(1800);

  console.log("[入口文案]", (await p.evaluate(() =>
    document.querySelector('[data-act="essay"] .mi-text').innerText.replace(/\n/g, " "))));

  await p.click('[data-act="essay"]');
  await p.waitForTimeout(800);
  console.log("[进入专练]", JSON.stringify(await p.evaluate(() => ({
    meta: document.querySelector("#q-meta").innerText,
    pos: document.querySelector("#q-pos").innerText,
    essayVisible: !document.querySelector("#q-essay").classList.contains("hidden"),
    btn: document.querySelector("#btn-submit").innerText.trim(),
    stem: document.querySelector("#q-text").innerText.slice(0, 34)
  }))));

  console.log("[初始 wrong]", (await W()).length);

  // A：什么都不做，直接下一题
  await p.click("#btn-next"); await p.waitForTimeout(700);
  let w = await W();
  console.log("[A 未作答直接下一题] wrong =", w.length, "| toast:", await p.evaluate(() => document.querySelector("#toast").innerText));

  // B：上一题，看参考答案后不评，直接下一题
  await p.click("#btn-prev"); await p.waitForTimeout(600);
  await p.click("#btn-submit"); await p.waitForTimeout(500);
  console.log("[B 参考答案页提示]", (await p.evaluate(() => document.querySelector("#rb-answer").innerText)).slice(0, 60));
  await p.screenshot({ path: "_tmp/shot_essay_ans.png" });
  await p.click("#btn-next"); await p.waitForTimeout(700);
  console.log("[B 看答案不自评→下一题] wrong =", (await W()).length);

  // C：上一题，看答案后点「会了」→ 应移出错题本
  await p.click("#btn-prev"); await p.waitForTimeout(600);
  await p.click("#btn-submit"); await p.waitForTimeout(400);
  console.log("[C 自评按钮可见]", await p.evaluate(() => !document.querySelector("#q-self").classList.contains("hidden")));
  await p.click('#q-self [data-self="1"]'); await p.waitForTimeout(600);
  w = await W();
  console.log("[C 点「会了」] wrong =", w.length, "| answered =", Object.keys((await db()).answered || {}).length);

  // D：回到该题点「没答好」→ 应重新进错题本
  await p.click("#btn-next"); await p.waitForTimeout(500);
  await p.click("#btn-prev"); await p.waitForTimeout(500);
  await p.click("#btn-submit"); await p.waitForTimeout(400);
  await p.click('#q-self [data-self="0"]'); await p.waitForTimeout(600);
  console.log("[D 点「没答好」] wrong =", (await W()).length);

  // E：错题本里能看到主观题
  await p.click("#view-quiz .bar-back"); await p.waitForTimeout(700);
  const home = await p.evaluate(() => ({
    wrong: document.querySelector("#st-wrong").innerText,
    essay: document.querySelector("#m-essay").innerText,
    mw: document.querySelector("#m-wrong").innerText
  }));
  console.log("[首页]", JSON.stringify(home));
  await p.click('[data-act="wrong"]'); await p.waitForTimeout(800);
  console.log("[错题本首题]", (await p.evaluate(() => document.querySelector("#q-meta").innerText + " | " + document.querySelector("#q-source").innerText)));
  await p.screenshot({ path: "_tmp/shot_essay_flow.png" });

  // F：清空后进专练，不答题直接点左上角返回，也应兜底入错题本
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(1700);
  await p.click('[data-act="essay"]'); await p.waitForTimeout(700);
  console.log("[F 清空后]", "wrong =", (await W()).length, "| 已答 =", Object.keys((await db()).answered || {}).length);
  await p.click("#view-quiz .bar-back"); await p.waitForTimeout(700);
  console.log("[F 未作答点「返回」] wrong =", (await W()).length,
    "| toast:", await p.evaluate(() => document.querySelector("#toast").innerText),
    "| 已答 =", Object.keys((await db()).answered || {}).length);

  console.log("错误:", errs.length ? errs : "无");
  await b.close();
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
