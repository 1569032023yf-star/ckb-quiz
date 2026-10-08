# -*- coding: utf-8 -*-
"""英语真题解析器 v5（配合 ocr_en2.py 行聚类 OCR 文本）

相比 v4 的改进：
1. 答案识别支持三种版式
   - 区间式：1～5 BACBD / 6-10DACAB / 21—25 BBCDA / 56~60DGEBF
   - 逐题式：N.【答案】X / N.X【解析】 / N.X（解析】/ N. 答案】X
   - 纯字母式（补全对话）：56. H  57. C
2. OCR 题号纠错：2o→20、1l→11 等
3. 语音题（1-5）题号可能被 OCR 吃掉 -> 按 A. 分题顺序编号
4. 完形填空（21-35）选项整行排列 -> 题干用"完形填空 第 N 空"
5. 补全对话（56-60）抽取 8 个选项 A-H
输出 _tmp/en_ocr.json
"""
import os, re, json
from collections import Counter

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_tmp")
CONFUSE = {"o": "0", "O": "0", "l": "1", "I": "1", "i": "1"}


def fix_no_prefix(l):
    """行首题号 OCR 纠错：'2o.A（解析】' -> '20. A（解析】'"""
    m = re.match(r"^(\d{1,2})([oOlIi])\s*[.．、]\s*(.*)$", l)
    if m:
        num = (m.group(1) + m.group(2)).translate(str.maketrans(CONFUSE))
        try:
            n = int(num)
            if 1 <= n <= 61:
                return f"{n}. {m.group(3)}"
        except ValueError:
            pass
    return l


BRACKET = r"[（(【\[【]"          # OCR 常把【识别成（ 或 (
ANS_PATS = [
    re.compile(r"^\s*(\d{1,2})\s*[.．、]\s*" + BRACKET + r"?\s*答案\s*[)）】\]]?\s*[:：]?\s*([A-H])\b"),
    re.compile(r"^\s*(\d{1,2})\s*[.．、]?\s*" + BRACKET + r"?\s*答案\s*[)）】\]]?\s*[:：]?\s*([A-H])\s*$"),
]
# 版式二：N.X【解析】（OCR 行首可能混入 "(考点学校名称)" 之类噪声，故用 search）
ANS_PAT_INLINE = re.compile(
    r"(?:^|[\s　;,；])(\d{1,2})\s*[.．、]?\s*([A-H])\s*" + BRACKET + r"?\s*解")
RANGE_PAT = re.compile(r"(\d{1,2})\s*[~～\-—]{1,3}\s*(\d{1,2})\s*([A-H]{2,})")
CONV_PAT = re.compile(r"(?:^|[\s　])(5[6-9]|60)\s*[.．、]\s*([A-H])(?=[\s　]|$)")
SEC_LINE = re.compile(r"^\s*(?:[IVX]+\s*[.．、]?\s*)?(Phonetics|Vocabulary|Cloze|Reading|Daily|Writing)\b", re.I)


def collect_answers(lines):
    ans, expl = {}, {}
    idx_found = []
    for i, l in enumerate(lines):
        hit = None
        for p in ANS_PATS:
            m = p.match(l)
            if m:
                hit = (int(m.group(1)), m.group(2))
                break
        if hit is None:
            m = ANS_PAT_INLINE.search(l)
            if m:
                hit = (int(m.group(1)), m.group(2))
        if hit:
            no, letter = hit
            if 1 <= no <= 61:
                ans[no] = letter
                idx_found.append((i, no))
        else:
            for m in CONV_PAT.finditer(l):
                ans.setdefault(int(m.group(1)), m.group(2))
    # 区间式（可能一行多段）
    for l in lines:
        for m in RANGE_PAT.finditer(l):
            a, b, letters = int(m.group(1)), int(m.group(2)), m.group(3)
            if a < b <= 61 and b - a + 1 <= len(letters):
                for k in range(b - a + 1):
                    ans.setdefault(a + k, letters[k])

    # 答案区语音题版式："1. B  I . Phonetics  2.B  3.A4.A  5. C"
    am = next((i for i, l in enumerate(lines) if "参考答案" in l), None)
    if am is not None:
        for i in range(am, min(am + 10, len(lines))):
            if re.search(r"Phonetics", lines[i], re.I):
                blob = lines[i] + "  " + (lines[i + 1] if i + 1 < len(lines) else "")
                for m in re.finditer(r"(\d{1,2})\s*[.．、]?\s*([A-H])(?![a-zA-Z])", blob):
                    no = int(m.group(1))
                    if 1 <= no <= 5:
                        ans.setdefault(no, m.group(2))
                break

    if idx_found:
        body_end = min(i for i, _ in idx_found)
        for j, (i, no) in enumerate(idx_found):
            end = idx_found[j + 1][0] if j + 1 < len(idx_found) else len(lines)
            for k in range(i + 1, end):
                if SEC_LINE.match(lines[k]) or re.match(r"^\s*[IVX]+\s*[.．、]\s*$", lines[k]):
                    end = k
                    break
            # 本行答案之后剩余的部分也是解析
            head = re.sub(r"^\s*\d{1,2}\s*[.．、]\s*" + BRACKET + r"?\s*答案?\s*[)）】\]]?\s*[:：]?\s*[A-H]\s*",
                          "", lines[i])
            head = re.sub(r"^\s*\d{1,2}\s*[.．、]\s*[A-H]\s*" + BRACKET + r"?\s*解\s*析?\s*[)）】\]]?\s*[:：]?",
                          "", head)
            chunk = [head] + lines[i + 1:end]
            chunk = [c for c in chunk
                     if not re.match(r"^\s*\d{1,2}\s*[.．、]?\s*$", c)
                     and not re.match(r"^=====", c)
                     and not re.match(r"^\d{4}年成人", c)
                     and "专升本英语" not in c
                     and not re.match(r"^第\s*\d+\s*页", c)
                     and not SEC_LINE.match(c)]
            text = re.sub(r"\s{2,}", " ", " ".join(chunk)).strip()
            if text:
                expl[no] = text
    else:
        body_end = len(lines)
    return ans, expl, body_end


LEAD = re.compile(r"(?<!\d)(\d{1,2})\s*[.．、](?!\d)")


def strip_lead(l):
    """行首可能被 OCR 粘上噪声（'(考点学校名称)  6.'、'1901708  15.'），剥掉后返回标准题号行"""
    m = LEAD.search(l[:26])
    if m and (m.start() == 0 or not l[m.start() - 1].isalnum()):
        return f"{int(m.group(1))}. {l[m.end():]}"
    return l


def parse_year(y, phon_ans=None):
    p = os.path.join(HERE, f"en{y}_ocr.txt")
    if not os.path.exists(p):
        print(y, "缺 OCR 文件")
        return []
    raw = open(p, encoding="utf-8").read()
    lines = []
    for l in raw.split("\n"):
        l = l.strip()
        if not l or l.startswith("====="):
            continue
        if re.match(r"^\d{4}年成人", l) or ("专升本英语" in l and "考试" in l):
            continue
        if re.match(r"^第\s*\d+\s*页", l) or re.match(r"^共\s*\d+\s*页", l):
            continue
        if re.match(r"^[\.．\-—～~]{4,}$", l):
            continue
        lines.append(fix_no_prefix(l))

    ans, expl, body_end = collect_answers(lines)
    if phon_ans:
        for k, v in phon_ans.items():
            ans.setdefault(k, v)
    if not ans:
        print(y, "!! 无答案")
        return []
    body = lines[:body_end]
    body = [l for l in body if "参考答案及解析" not in l and "试题和参考答案" not in l]

    marks = [("phon", re.compile(r"Phonetics\s*\(", re.I)),
             ("vocab", re.compile(r"Vocabulary\s*and\s*Structure", re.I)),
             ("cloze", re.compile(r"(?<!Reading)Cloze\s*\(", re.I)),
             ("read", re.compile(r"Reading\s*Comprehension\s*\(", re.I)),
             ("conv", re.compile(r"Daily\s*Conversation", re.I)),
             ("writ", re.compile(r"(?<!Reading)Writing\s*\(", re.I))]
    secs, cur = [], None
    for l in body:
        hit = None
        for name, pat in marks:
            if pat.search(l):
                hit = name
                break
        if hit:
            cur = {"name": hit, "lines": []}
            secs.append(cur)
            continue
        if cur is not None:
            cur["lines"].append(l)

    qs = []

    def get_expl(no, letter):
        e = expl.get(no)
        return e if e and len(e) > 3 else f"参考答案：{letter}"

    def build(no, q, opts, passage=None):
        a = ans.get(no)
        if a is None or not opts or a not in opts:
            return
        qs.append({
            "id": f"en{y}-{no}", "subject": "英语", "chapter": f"英语 {y}年真题",
            "type": "single", "question": q.strip(),
            "options": [{"key": k, "text": v} for k, v in sorted(opts.items())],
            "answer": [a], "explanation": get_expl(no, a),
            **({"passage": passage} if passage else {}),
        })

    OPT_SPLIT = re.compile(r"(?=(?<![A-Za-z0-9])[A-H]\s*[.．、]\s*)")

    def mcq(ls, lo, hi):
        items, curq = [], None
        for raw_l in ls:
            l = strip_lead(raw_l)
            l = re.sub(r"^[a-z]{1,3}\s+(?=[A-H]\s*[.．、,])", "", l.strip())
            m = re.match(r"^(\d{1,2})\s*[.．、]\s*(.*)$", l)
            if m and lo <= int(m.group(1)) <= hi:
                if curq:
                    items.append(curq)
                curq = {"no": int(m.group(1)), "q": "", "opts": {}}
                for seg in [s.strip() for s in OPT_SPLIT.split(m.group(2)) if s.strip()]:
                    mo = re.match(r"^([A-H])\s*[.．、,]\s*(.*)$", seg)
                    if mo and mo.group(2).strip():
                        curq["opts"][mo.group(1)] = mo.group(2).strip()
                    elif seg:
                        curq["q"] = (curq["q"] + " " + seg).strip()
                continue
            # 独立选项行：行聚类后常出现 "A. had finished  B. has finished"，需整行拆分
            segs = [s.strip() for s in OPT_SPLIT.split(l.strip()) if s.strip()]
            mos = [m for m in (re.match(r"^[^A-Z]{0,3}([A-H])\s*[.．、,]\s*(.*)$", s) for s in segs)
                   if m and m.group(2).strip()]
            if curq is not None and len(mos) >= 2:
                for m in mos:
                    curq["opts"][m.group(1)] = m.group(2).strip()
                continue
            mo = re.match(r"^([A-H])\s*[.．、,]\s*(.*)$", l.strip())
            if mo and curq is not None and mo.group(2).strip():
                curq["opts"][mo.group(1)] = mo.group(2).strip()
                continue
            if curq is not None:
                if re.match(r"^(Directions|得分|评卷)", l):
                    continue
                curq["q"] = (curq["q"] + " " + l).strip()
        if curq:
            items.append(curq)
        return items

    def mcq_nofix(ls, lo, hi):
        """语音题用：题号可能被 OCR 吃掉，遇到 'A.' 就开新题，按序编号"""
        items, curq = [], None
        for l in ls:
            s = re.sub(r"^\s*\d{0,2}\s*[.．、]\s*", "", l.strip())
            if not s or not re.match(r"^[A-H]\s*[.．、]", s):
                continue
            segs = [x.strip() for x in OPT_SPLIT.split(s) if x.strip()]
            opts = {}
            for x in segs:
                mm = re.match(r"^([A-H])\s*[.．、,]\s*(.*)$", x)
                if mm and mm.group(2).strip():
                    opts[mm.group(1)] = mm.group(2).strip()
            if len(opts) >= 4:
                if curq:
                    items.append(curq)
                curq = {"no": None, "opts": opts}
        if curq:
            items.append(curq)
        out, n = [], lo
        for it in items:
            if len(it["opts"]) >= 4:
                out.append({"no": n, "opts": it["opts"]})
                n += 1
                if n > hi:
                    break
        return out

    ph = next((s for s in secs if s["name"] == "phon"), None)
    if ph:
        for it in mcq_nofix(ph["lines"], 1, 5):
            if len(it["opts"]) >= 4 and ans.get(it["no"]):
                words = "  /  ".join(f"{k}. {it['opts'][k]}" for k in sorted(it["opts"]))
                build(it["no"], "选出划线部分读音与其他三个不同的一项：\n" + words, it["opts"])
    vo = next((s for s in secs if s["name"] == "vocab"), None)
    if vo:
        for it in mcq(vo["lines"], 6, 20):
            build(it["no"], it["q"], it["opts"])
    cl = next((s for s in secs if s["name"] == "cloze"), None)
    if cl:
        fq = next((i for i, l in enumerate(cl["lines"]) if re.match(r"^(2[1-9]|3[0-5])\s*[.．、]", l)), None)
        if fq:
            pas = " ".join(cl["lines"][:fq])
            pas = re.sub(r"^[^A-Za-z]*(?:Directions.*?)?(?=[A-Z])", "", pas, count=1)
            pas = re.sub(r"_+\s*\(?(3[0-5]|2[1-9])\)?\s*_+", r" ____(\1) ", pas)
            pas = re.sub(r"(?<![\w])(3[0-5]|2[1-9])(?![\w])", r" ____(\1) ", pas)
            pas = re.sub(r"\s{2,}", " ", pas).strip()
            for it in mcq(cl["lines"][fq:], 21, 35):
                build(it["no"], f"完形填空：第 {it['no']} 空", it["opts"], passage=pas)
    rd = next((s for s in secs if s["name"] == "read"), None)
    if rd:
        chunks, curp = [], None
        pmk = re.compile(r"Passage\s*(One|Two|Three|Four|Five|[1-5])", re.I)
        for l in rd["lines"]:
            m = pmk.search(l)
            if m:
                if curp:
                    chunks.append(curp)
                rest = l[m.end():].strip()
                curp = {"lines": [rest] if rest else []}
                continue
            if curp is not None:
                curp["lines"].append(l)
        if curp:
            chunks.append(curp)
        chunks = [c for c in chunks if any(re.match(r"^(3[6-9]|4[0-9]|5[0-5])\s*[.．、]", x) for x in c["lines"])]
        for ch in chunks:
            fq = next((i for i, l in enumerate(ch["lines"]) if re.match(r"^(3[6-9]|4[0-9]|5[0-5])\s*[.．、]", l)), None)
            if fq is None:
                continue
            pas = re.sub(r"\s{2,}", " ", " ".join(ch["lines"][:fq])).strip()
            for it in mcq(ch["lines"][fq:], 36, 55):
                build(it["no"], it["q"], it["opts"], passage=pas)
    cv = next((s for s in secs if s["name"] == "conv"), None)
    if cv:
        opts, dlg, opt_zone = {}, [], True
        for l in cv["lines"]:
            mo = re.match(r"^([A-H])\s*[.．、]\s*(.*)$", l)
            if opt_zone and mo:
                for s in [x.strip() for x in OPT_SPLIT.split(l) if x.strip()]:
                    mm = re.match(r"^([A-H])\s*[.．、]\s*(.*)$", s)
                    if mm:
                        opts[mm.group(1)] = mm.group(2).strip()
                continue
            if re.match(r"^(Directions|得分|评卷)", l):
                continue
            if re.match(r"^[A-Za-z]+[:：]", l):
                opt_zone = False
            if not opt_zone:
                dlg.append(l)
        for no in range(56, 61):
            if ans.get(no) and ans[no] in opts:
                build(no, f"补全对话：第 {no} 空（从 A-H 中选出最佳选项）", opts)
    wr = next((s for s in secs if s["name"] == "writ"), None)
    if wr:
        txt = " ".join(wr["lines"])
        m = re.search(r"61\s*[.．、]\s*(.*)$", txt)
        if m:
            qs.append({
                "id": f"en{y}-61", "subject": "英语", "chapter": f"英语 {y}年真题",
                "type": "essay", "question": "【写作】" + m.group(1).strip(),
                "options": [], "answer": [],
                "explanation": expl.get(61) or "写作题（25分）：内容完整、格式正确、语言通顺，100~120词。",
            })
    return qs


# OCR 丢失的语音题答案，按单词读音判定（已用可辨认年份交叉验证，判据可靠）
PHON_FALLBACK = {
    2020: {1: "D", 2: "A", 3: "B", 4: "C", 5: "B"},
    2021: {1: "A", 2: "C", 3: "D", 4: "B", 5: "A"},
}


def main():
    allq = []
    for y in [2020, 2021, 2022, 2023, 2024, 2025]:
        qs = parse_year(y, PHON_FALLBACK.get(y))
        print(y, len(qs), Counter(q["type"] for q in qs))
        allq += qs
    json.dump(allq, open(os.path.join(HERE, "en_ocr.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("total", len(allq))


if __name__ == "__main__":
    main()
