# -*- coding: utf-8 -*-
"""合并所有来源，生成最终 questions.json，并做严格校验。

来源：
  示例题 10            _tmp/demo.json
  政治 2020-2025 真题  _tmp/t{y}.json        （扫描件逐题人工转录 / 文本层重写）
  政治仿真卷 41        _tmp/sim.json
  英语 2020-2025 真题  _tmp/en_ocr.json + _tmp/patch_en_final.json
  英语仿真卷 61        _tmp/sim.json
  高数 2020-2025 真题  _tmp/m{2020..2025}.json （PDF 逐页人工转录 + 官方答案）
  高数仿真卷 18        _tmp/sim.json
"""
import os, json, re, sys
from collections import Counter, OrderedDict

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TMP = os.path.join(HERE, "_tmp")


def load(name):
    p = os.path.join(TMP, name)
    if not os.path.exists(p):
        print("!! 缺少", name)
        return []
    return json.load(open(p, encoding="utf-8"))


def clean(s):
    if not isinstance(s, str):
        return ""
    s = s.replace("\u3000", " ")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def plain_variants(ans):
    """为填空题答案生成若干等价写法（去 $、LaTeX 转文本、分数转 a/b）。"""
    out = []

    def add(x):
        x = (x or "").strip()
        if x and x not in out:
            out.append(x)

    for a in ans:
        add(a)
        t = a.replace("$", "")
        t = t.replace("\\left", " ").replace("\\right", " ")
        t = t.replace("\\dfrac", "\\frac").replace("\\tfrac", "\\frac")
        for _ in range(3):  # \frac{a}{b} -> a/b（反复替换以处理简单嵌套）
            t = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"\1/\2", t)
        t = re.sub(r"\\sqrt\[3\]\{([^{}]*)\}", r"cbrt(\1)", t)
        t = re.sub(r"\\sqrt\{([^{}]*)\}", r"sqrt(\1)", t)
        t = re.sub(r"\\(ln|sin|cos|tan|arctan|arcsin|arccos|log|pi|lim)\b", r"\1", t)
        t = t.replace("\\", "").replace("{", "").replace("}", "")
        t = re.sub(r"\s+", " ", t).strip()
        add(t)
        add(t.replace(" ", ""))
    return out


allq = []
allq += load("demo.json")
for y in (2020, 2021, 2022, 2023, 2024, 2025):
    allq += load(f"t{y}.json")
allq += load("sim.json")
allq += load("en_ocr.json")
allq += load("patch_en_final.json")
allq += load("m2023.json")
# 高数其余 5 年真题：扫描件逐题人工转录（选择/填空/解答）
for y in (2020, 2021, 2022, 2024, 2025):
    allq += load(f"m{y}.json")

# 章节名统一成「科目 + 章节」
CHAP_FIX = {"2020年真题": "政治 2020年真题", "2021年真题": "政治 2021年真题",
            "2022年真题": "政治 2022年真题", "2023年真题": "政治 2023年真题",
            "2024年真题": "政治 2024年真题", "2025年真题": "政治 2025年真题",
            "政治仿真卷": "政治 仿真卷", "英语仿真卷": "英语 仿真卷",
            "高数仿真卷": "高数 仿真卷"}

# 1) 去重（后出现的覆盖先出现的，补丁优先级最高）
bank = OrderedDict()
for q in allq:
    qid = q.get("id")
    if not qid:
        continue
    q["chapter"] = CHAP_FIX.get(q.get("chapter", ""), q.get("chapter", ""))
    q["subject"] = q.get("subject") or q["chapter"].split()[0]
    q["type"] = q.get("type") or "single"
    q["question"] = clean(q.get("question", ""))
    q["explanation"] = clean(q.get("explanation", ""))
    opts = []
    for o in q.get("options", []):
        t = clean(o.get("text", ""))
        if t:
            opts.append({"key": o["key"], "text": t})
    q["options"] = opts
    if isinstance(q.get("passage"), str):
        q["passage"] = clean(q["passage"])
    if q["type"] == "fill":          # 填空题：自动补齐等价写法，方便直接输入
        q["answer"] = plain_variants(q.get("answer") or [])
    bank[qid] = q

# 2) 校验
good, dropped = [], []
seen_stem = {}
for qid, q in bank.items():
    t = q["type"]
    why = None
    if not q["question"]:
        why = "题干为空"
    elif t in ("single", "multiple", "judge"):
        keys = [o["key"] for o in q["options"]]
        ans = [a for a in q.get("answer", []) if a]
        if t == "single" and len(keys) < 4:
            why = f"单选题只有 {len(keys)} 个选项"
        elif t == "judge" and len(keys) < 2:
            why = f"判断题只有 {len(keys)} 个选项"
        elif not ans:
            why = "无答案"
        elif not all(a in keys for a in ans):
            why = f"答案 {ans} 不在选项 {keys} 中"
    elif t == "fill":
        if not q.get("answer"):
            why = "填空题无答案"
    if why:
        dropped.append((qid, why))
        continue
    # 同科同章内题干去重（阅读题用所属文章首句区分，避免不同 passage 的同名题干被误删）
    pas = re.sub(r"\s+", "", q.get("passage", "") or "")[:30]
    sig = (q["subject"], q["chapter"], pas, re.sub(r"\s+", "", q["question"])[:80])
    if sig in seen_stem:
        dropped.append((qid, "与题干重复 " + seen_stem[sig]))
        continue
    seen_stem[sig] = qid
    good.append(q)

# 3) 排序：科目 -> 章节 -> 原题号
SUBJ_ORDER = {"政治": 0, "英语": 1, "高等数学": 2}


def sort_key(q):
    m = re.search(r"(\d+)$", q["id"])
    return (SUBJ_ORDER.get(q["subject"], 9), q["chapter"], int(m.group(1)) if m else 0, q["id"])


good.sort(key=sort_key)
for i, q in enumerate(good, 1):
    q["no"] = i

out = os.path.join(HERE, "questions.json")
json.dump(good, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("=" * 60)
print("合计写入", len(good), "题")
print("-" * 60)
c = Counter((q["subject"], q["chapter"]) for q in good)
cur = None
for (sj, ch), n in sorted(c.items(), key=lambda x: (SUBJ_ORDER.get(x[0][0], 9), x[0][1])):
    if sj != cur:
        print(f"[{sj}]")
        cur = sj
    print(f"   {ch:<20} {n}")
print("-" * 60)
print("题型分布", Counter(q["type"] for q in good))
print("丢弃", len(dropped), "题")
for d in dropped[:40]:
    print("   x", d[0], d[1])
