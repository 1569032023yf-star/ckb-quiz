/* 把「成考刷题」网站的仿真卷数据（data-math/politics/english.js）
   转换为 questions.json 统一格式。
   用法： node tools/sim_to_questions.js  > _tmp/sim.json
   依赖： ../成考刷题/data/data-*.js（原始仿真卷数据）            */
const fs = require("fs");
const path = require("path");

const SRC = "C:/Users/yf/WorkBuddy/学习/成考刷题/data";
const SUBJ_NAME = { math: "高等数学", politics: "政治", english: "英语" };
const CHAPTER = { math: "高数仿真卷", politics: "政治仿真卷", english: "英语仿真卷" };

global.window = {};
for (const f of ["data-math.js", "data-politics.js", "data-english.js"]) {
  eval(fs.readFileSync(path.join(SRC, f), "utf8"));
}
const S = global.window.SUBJECTS;

// 去掉 HTML 标签，保留 LaTeX（$...$）
function plain(html) {
  if (html == null) return "";
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const out = [];
for (const key of ["politics", "english", "math"]) {
  const subj = S[key];
  if (!subj) continue;
  subj.sections.forEach(function (sec) {
    const passages = sec.passages || [];
    sec.questions.forEach(function (q) {
      const base = {
        id: key + "-sim-" + q.no,
        subject: SUBJ_NAME[key],
        chapter: CHAPTER[key],
        question: plain(q.stem),
      };
      // 段落原文（阅读 / 完形 / 对话）
      if (q.passage != null && passages[q.passage]) base.passage = plain(passages[q.passage].text);
      else if (sec.passage && q.passage == null && /Cloze|完形/.test(sec.title)) base.passage = plain(sec.passage);
      else if (sec.dialogue && /Conversation|对话/.test(sec.title)) base.passage = sec.dialogue.join("\n");

      const exp = plain(q.explain || q.model || "");

      if (q.options && q.options.length) {          // 选择题
        out.push(Object.assign(base, {
          type: "single",
          options: q.options.map(function (o) { return { key: o.k, text: plain(o.t) }; }),
          answer: [q.answer],
          explanation: exp || "参考答案：" + q.answer,
        }));
      } else if (q.answers) {                        // 填空题
        out.push(Object.assign(base, {
          type: "fill",
          options: [],
          answer: q.answers.slice(),
          display: q.display || q.answers[0],
          explanation: exp || "参考答案：" + (q.display || q.answers[0]),
        }));
      } else {                                        // 解答 / 简答 / 论述 / 写作
        out.push(Object.assign(base, {
          type: "essay",
          options: [],
          answer: [],
          explanation: exp || "（参考答案见解析）",
        }));
      }
    });
  });
}

fs.writeFileSync(
  path.join(__dirname, "..", "_tmp", "sim.json"),
  JSON.stringify(out, null, 2),
  "utf8"
);
const cnt = {};
out.forEach(function (q) { cnt[q.subject + "/" + q.type] = (cnt[q.subject + "/" + q.type] || 0) + 1; });
console.log("仿真卷转换完成：", out.length, "题");
console.log(cnt);
