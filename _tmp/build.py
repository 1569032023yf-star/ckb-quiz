# -*- coding: utf-8 -*-
"""把六年政治真题（文本/OCR）合并生成 questions.json"""
import os, re, json, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
spec = importlib.util.spec_from_file_location("p2q", os.path.join(ROOT, "tools", "pdf_to_questions.py"))
p2q = importlib.util.module_from_spec(spec); spec.loader.exec_module(p2q)
norm = p2q.norm

FIX = [
    ("暂学", "哲学"), ("督学", "哲学"), ("誓学", "哲学"),
    ("舞证法", "辩证法"), ("静证法", "辩证法"), ("辨证法", "辩证法"), ("得证法", "辩证法"),
    ("普追", "普遍"), ("普逼", "普遍"), ("普避", "普遍"),
    ("教出", "救出"), ("传人", "传入"), ("传插", "传播"),
    ("固素", "因素"), ("官俄", "官僚"), ("基断", "垄断"),
    ("帮选择题", "选择题"), ("本一", ""), ("面是", "而是"),
    ("唯 物", "唯物"), ("矛质", "矛盾"), ("阶极", "阶级"),
    ("社会主文", "社会主义"), ("马克恩", "马克思"), ("思格新", "恩格斯"),
    ("实事求事", "实事求是"), ("群 众", "群众"), ("根 据", "根据"),
    ("发 展", "发展"), ("人 民", "人民"), ("制 度", "制度"),
    ("图答", "回答"), ("相至", "相互"), ("特珠", "特殊"),
    ("客案", "答案"), ("考委", "考查"), ("考变", "考查"), ("源别", "派别"),
    ("唯一样准", "唯一标准"), ("样准", "标准"), ("自受", "自觉"),
    ("改遗", "改造"), ("实或", "实践"), ("现点", "观点"), ("观寒", "观察"),
    ("系统观舍", "系统观念"), ("铁样", "铁杵"), ("面存在", "而存在"),
    ("面言", "而言"), ("方 式", "方式"), ("本 质", "本质"),
    ("唯 一", "唯一"), ("基 本", "基本"), ("社 会", "社会"),
]


def fix_text(s):
    for a, b in FIX:
        s = s.replace(a, b)
    return re.sub(r"[ \t]{2,}", " ", s)


def split_blocks(text):
    left, right = [], []
    cur = left
    for line in text.split("\n"):
        if line.startswith("===== PAGE"):
            cur = right if "RIGHT" in line else left
            continue
        cur.append(line)
    return "\n".join(left), "\n".join(right)


def parse_with_merge(text, chapter, subject="政治"):
    if "===== PAGE" in text:
        left_t, right_t = split_blocks(text)
    else:
        left_t, right_t = text, ""
    lines = [norm(l) for l in (left_t + "\n" + right_t).split("\n")]
    ai = next((i for i, l in enumerate(lines) if "参考答案" in l), len(lines))
    body, tail = lines[:ai], lines[ai:]

    qs, cur = [], None
    qnum_re = re.compile(r"^(\d{1,2})\s*[.．、]\s*(.+)$")
    opt_re = re.compile(r"^([A-D])\s*[.．、,，:：]?\s*(.*)$")
    for l in body:
        if not l.strip():
            continue
        m = qnum_re.match(l)
        if m and int(m.group(1)) <= 60:
            if cur:
                qs.append(cur)
            cur = {"no": int(m.group(1)), "q": m.group(2), "opts": {}}
            continue
        m = opt_re.match(l)
        if m and cur is not None:
            cur["opts"][m.group(1)] = m.group(2).strip()
            continue
        if cur is not None and not cur["opts"]:
            cur["q"] += l
    if cur:
        qs.append(cur)

    # 右栏选项流：按出现顺序补齐缺失字母
    if right_t:
        stream = []
        for l in [norm(x) for x in right_t.split("\n")]:
            m = opt_re.match(l)
            if m and len(m.group(1)) == 1:
                stream.append((m.group(1), m.group(2).strip()))
        idx = 0
        for item in qs:
            missing = [k for k in "ABCD" if k not in item["opts"]]
            while missing and idx < len(stream):
                k, v = stream[idx]; idx += 1
                if k in missing:
                    item["opts"][k] = v
                    missing.remove(k)

    answers, explains = {}, {}
    num_head = re.compile(r"^(\d{1,2})\s*[.．、]")
    for i, l in enumerate(tail):
        m = re.match(r"^(\d{1,2})\s*[.．、]\s*【答案】\s*([A-D])", l)
        if m:
            n, a = int(m.group(1)), m.group(2)
            answers[n] = a
            buf = []
            for l2 in tail[i + 1:]:
                if num_head.match(l2):
                    break
                buf.append(re.sub(r"^【(考情点[拨按]|应试指导|解析|答案)】", "", l2))
            exp = re.sub(r"\s+", "", "".join(buf)).strip()
            if exp:
                explains[n] = exp
    if len(answers) < 5:
        tt = "".join(tail)
        cut = tt.find("二、")
        if cut > 0:
            tt = tt[:cut]
        for m in re.finditer(r"(\d{1,2})\s*[.．、]\s*([A-D])", tt):
            answers[int(m.group(1))] = m.group(2)

    out = []
    for item in qs:
        o = item["opts"]
        if set(o.keys()) != set("ABCD"):
            continue
        if any(len(v.strip()) < 2 for v in o.values()):
            continue  # OCR 截断了选项，丢弃
        ans = answers.get(item["no"])
        if not ans or ans not in "ABCD":
            continue
        qtext = item["q"].strip().rstrip("(（").strip()
        exp = explains.get(item["no"]) or ("参考答案：%s。%s" % (ans, o[ans]))
        # 清理解析里串入的卷面杂质
        for mark in ("三、简答题", "四、论述题", "三、辨析题", "评卷人", "得　分"):
            p = exp.find(mark)
            if p > 20:
                exp = exp[:p]
        exp = exp.strip("　 　.")
        out.append({
            "id": "%s-%02d" % (chapter[:4], item["no"]),
            "subject": subject,
            "chapter": chapter,
            "type": "single",
            "question": qtext,
            "options": [{"key": k, "text": o[k]} for k in "ABCD"],
            "answer": [ans],
            "explanation": exp
        })
    return out


demo = json.load(open(os.path.join(HERE, "demo.json"), encoding="utf-8"))
sources = {
    2020: ["2020_blk.txt", "2020_ocr2.txt", "2020_ocr.txt"],
    2021: ["2021_blk.txt", "2021_ocr2.txt", "2021_ocr.txt"],
    2022: ["2022.txt"],
    2023: ["2023.txt"],
    2024: ["2024_blk.txt", "2024_ocr2.txt", "2024_ocr.txt"],
    2025: ["2025_blk.txt", "2025_ocr2.txt", "2025_ocr.txt"],
}
result = []
for y, fns in sorted(sources.items()):
    best = {}
    for fn in fns:
        p = os.path.join(HERE, fn)
        if not os.path.exists(p):
            continue
        txt = fix_text(open(p, encoding="utf-8").read())
        for q in parse_with_merge(txt, "%d年真题" % y):
            old = best.get(q["id"])
            # 取信息更全的一条（题干更长、解析更长）
            score_old = (len(old["question"]) + len(old["explanation"])) if old else -1
            score_new = len(q["question"]) + len(q["explanation"])
            if score_new > score_old:
                best[q["id"]] = q
        print("  ", y, fn, "->", len(best), flush=True)
    got = [best[k] for k in sorted(best)]
    print(y, "解析", len(got), "题")
    result += got

seen = {}
for q in result:
    seen[q["id"]] = q
result = [seen[k] for k in sorted(seen)]
json.dump(demo + result, open(os.path.join(ROOT, "questions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("总计", len(demo) + len(result), "题（示例", len(demo), "+ 真题", len(result), "）")
for y in sorted(sources):
    print(" ", y, len([q for q in result if q["chapter"] == "%d年真题" % y]), "题")
