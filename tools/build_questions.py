# -*- coding: utf-8 -*-
"""合并所有来源的题库 → questions.json

来源（缺失的文件会自动跳过）：
  _tmp/politics_real.json   政治六年真题（pdf_to_questions.py 产出）
  _tmp/sim.json             三科仿真卷（sim_to_questions.js 产出）
  _tmp/en_questions.json    英语真题（en_parse.py 产出）
  _tmp/math_questions.json  高数真题（math_parse.py 产出）

用法： python tools/build_questions.py
"""
import os, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
TMP = os.path.join(ROOT, "_tmp")
OUT = os.path.join(ROOT, "questions.json")

VALID_TYPE = {"single", "multiple", "judge", "fill", "essay"}


def load(fn):
    p = os.path.join(TMP, fn)
    if not os.path.exists(p):
        return []
    try:
        return json.load(open(p, encoding="utf-8"))
    except Exception as e:
        print("读取失败", fn, e)
        return []


def clean_text(s):
    s = str(s or "").replace("\r", "")
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def normalize(q, prefix, chapter_fn=None):
    q = dict(q)
    q["id"] = prefix + str(q.get("id"))
    if chapter_fn:
        q["chapter"] = chapter_fn(q.get("chapter", ""))
    q["question"] = clean_text(q.get("question"))
    q["type"] = q.get("type") if q.get("type") in VALID_TYPE else "single"
    q["options"] = [{"key": str(o.get("key", "")).strip(),
                     "text": clean_text(o.get("text"))}
                    for o in (q.get("options") or [])]
    q["answer"] = [str(a).strip() for a in (q.get("answer") or []) if str(a).strip()]
    q["explanation"] = clean_text(q.get("explanation"))
    if q.get("passage"):
        q["passage"] = clean_text(q["passage"])
    if q.get("display"):
        q["display"] = clean_text(q["display"])
    return q


def valid(q):
    if not q.get("id") or not q.get("question"):
        return False
    if len(q["question"]) < 5:
        return False
    if q["type"] in ("single", "multiple", "judge"):
        if len(q["options"]) < 2:
            return False
        keys = [o["key"] for o in q["options"]]
        if any(not k for k in keys) or len(set(keys)) != len(keys):
            return False
        if any(not o["text"] for o in q["options"]):
            return False
        if not q["answer"] or any(a not in keys for a in q["answer"]):
            return False
    elif q["type"] == "fill":
        if not q["answer"]:
            return False
    return True


def main():
    items = []

    # 1) 政治真题
    pol = load("politics_real.json")
    for q in pol:
        items.append(normalize(q, "politics-", lambda ch: "政治 " + ch if ch != "示例题" else "示例题"))

    # 2) 三科仿真卷
    items += [normalize(q, "") for q in load("sim.json")]

    # 3) 英语真题
    items += [normalize(q, "") for q in load("en_questions.json")]

    # 4) 高数真题
    items += [normalize(q, "") for q in load("math_questions.json")]

    # 去重（按 id）+ 过滤
    seen, out = {}, []
    dropped = 0
    for q in items:
        if not valid(q):
            dropped += 1
            continue
        if q["id"] in seen:
            dropped += 1
            continue
        seen[q["id"]] = 1
        out.append(q)

    # 排序：科目 → 章节 → 原题号
    def sort_key(q):
        m = re.search(r"(\d+)", q["id"])
        return (q.get("subject", ""), q.get("chapter", ""), int(m.group(1)) if m else 0, q["id"])
    out.sort(key=sort_key)

    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    from collections import Counter
    print("写入 %d 题（丢弃 %d）-> %s" % (len(out), dropped, OUT))
    print("\n按科目：")
    for k, v in Counter(q["subject"] for q in out).most_common():
        print("  %-8s %4d 题" % (k, v))
    print("\n按章节：")
    for k, v in Counter(q["chapter"] for q in out).most_common():
        print("  %-16s %4d 题" % (k, v))
    print("\n按题型：", dict(Counter(q["type"] for q in out)))


if __name__ == "__main__":
    main()
