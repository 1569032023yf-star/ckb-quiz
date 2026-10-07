# -*- coding: utf-8 -*-
"""英语真题 → questions.json 条目
用法: python tools/en_parse.py
输入: _tmp/en{YYYY}.txt（文本层） 或 _tmp/en{YYYY}_blk.txt（OCR）
输出: _tmp/en_questions.json
"""
import os, re, json, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
TMP = os.path.join(ROOT, "_tmp")

FULL2HALF = {ord("０"): "0", ord("１"): "1", ord("２"): "2", ord("３"): "3", ord("４"): "4",
             ord("５"): "5", ord("６"): "6", ord("７"): "7", ord("８"): "8", ord("９"): "9",
             ord("．"): ".", ord("，"): ",", ord("？"): "?", ord("！"): "!",
             ord("（"): "(", ord("）"): ")", ord("％"): "%", ord("～"): "~",
             ord("Ａ"): "A", ord("Ｂ"): "B", ord("Ｃ"): "C", ord("Ｄ"): "D", ord("Ｅ"): "E",
             ord("Ｇ"): "G", ord("Ｈ"): "H", ord("ａ"): "a", ord("ｂ"): "b", ord("ｃ"): "c", ord("ｄ"): "d"}


def norm(s):
    s = s.translate(FULL2HALF)
    s = s.replace("　", " ").replace("\u3000", " ")
    s = re.sub(r"[ \t]+", " ", s)
    return s.strip()


def is_ascii_word(w):
    return all(ord(c) < 128 for c in w)


try:
    import wordninja
    _WN = wordninja
except Exception:
    _WN = None

RE_LONGWORD = re.compile(r"^[A-Za-z][A-Za-z'’\-]{11,}$")


def fix_spacing(s):
    """修复 PDF 丢空格导致的英文粘连：Thisisatest -> This is a test"""
    if not _WN or not s:
        return s
    out = []
    for w in s.split(" "):
        if RE_LONGWORD.match(w):
            out.append(" ".join(_WN.split(w)))
        else:
            out.append(w)
    return " ".join(out)


NOISE = re.compile(r"(评卷人|得分|Directions?:|Answer\s*Sheet|blacken|共\s*\d+\s*页|成人高等学校)")


def clean_q(s):
    s = fix_spacing(s)
    s = NOISE.sub(" ", s)
    s = re.sub(r"\s{2,}", " ", s).strip(" .")
    return s


def page_lines_from_words(pg):
    """用字符坐标重建文本行：字符间按水平间距补空格（修复 PDF 空格丢失）"""
    out = []
    for block in pg.get_text("rawdict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            parts = []
            for span in line["spans"]:
                size = span.get("size", 10) or 10
                thr = size * 0.20
                prev_x1, prev_a = None, False
                for ch in span["chars"]:
                    c = ch["c"]
                    x0, x1 = ch["bbox"][0], ch["bbox"][2]
                    a = ord(c) < 128 and not c.isspace()
                    if prev_x1 is not None and a and prev_a and (x0 - prev_x1) > thr:
                        parts.append(" ")
                    parts.append(c)
                    prev_x1, prev_a = x1, a
            s = norm("".join(parts))
            if s:
                out.append(s)
    return out


def load_text_year(y):
    """返回该年真题的文本行列表"""
    import pymupdf
    base = r"C:\Users\yf\Desktop\成考（专升本）考前资料-理工经管&药学类\【1】2020-2025年真题卷\成考（专升本）历年真题-英语"
    pdf = os.path.join(base, "%d年专升本真题及答案解析（英语）.pdf" % y)
    if os.path.exists(pdf):
        d = pymupdf.open(pdf)
        total = sum(len(pg.get_text().strip()) for pg in d)
        if total > 3000:
            lines = []
            for pg in d:
                lines += page_lines_from_words(pg)
            return lines, "text"
    blk = os.path.join(TMP, "en%d_blk.txt" % y)
    if os.path.exists(blk):
        raw = open(blk, encoding="utf-8").read()
        return [norm(l) for l in raw.split("\n") if norm(l)], "ocr"
    return [], "none"


RE_QNUM = re.compile(r"^(\d{1,2})[.．、]\s*(.*)$")
RE_OPT = re.compile(r"^([A-H])[.．、,，:：]?\s*(.*)$")


def parse_year(y):
    lines, src = load_text_year(y)
    if not lines:
        return [], src
    # 1) 找答案区：优先找 "1~5 DACBD" 这类范围行（取靠后的），否则找最后出现的"参考答案"
    RE_RANGE = re.compile(r"^(\d{1,2})\s*[~～\-—]\s*(\d{1,2})\s*([A-H]{2,})$")
    cands = [i for i, l in enumerate(lines) if RE_RANGE.match(l) and i > len(lines) * 0.3]
    if cands:
        ans_start = cands[0] - 3
    else:
        cands2 = [i for i, l in enumerate(lines) if "参考答案" in l or "答案及解析" in l]
        ans_start = cands2[-1] if cands2 else None
    tail = lines[ans_start:] if ans_start else []
    body = lines[:ans_start] if ans_start else lines

    # 2) 解析答案："1~5 DACBD" / "6~10 ABDCB" / "56~60 ACHED"
    answers = {}
    for l in tail:
        l = norm(l)
        m = re.match(r"^(\d{1,2})\s*[~～\-—]\s*(\d{1,2})\s*([A-H]{2,})$", l)
        if m:
            a, b, letters = int(m.group(1)), int(m.group(2)), m.group(3)
            if b - a + 1 == len(letters):
                for k, ch in enumerate(letters):
                    answers[a + k] = ch
            continue
        # 逐题式："36. A 37. B"
        for mm in re.finditer(r"(\d{1,2})\s*[.．、]\s*([A-H])(?![A-Za-z])", l):
            answers[int(mm.group(1))] = mm.group(2)

    # 3) 解析题目
    OPT_SPLIT = re.compile(r"(?=(?<![A-Za-z0-9])[A-H][.．、,，:：])")
    RE_OPT_EMPTY = re.compile(r"^([A-H])[.．、,，:：]\s*$")
    qs, cur = [], None
    cur_passage = None
    pending = None      # 形如 "A." 单独成行，文本在下一行
    for l in body:
        if re.match(r"^(Passage\s*(One|Two|Three|Four|Five|[1-5]))\b", l, re.I):
            cur_passage = []
            continue
        if pending and cur is not None and not RE_OPT.match(l) and not RE_QNUM.match(l):
            cur["opts"][pending] = l.strip()
            pending = None
            continue
        me = RE_OPT_EMPTY.match(l)
        if me and cur is not None:
            pending = me.group(1)
            continue
        m = RE_QNUM.match(l)
        if m and 1 <= int(m.group(1)) <= 60:
            if cur:
                qs.append(cur)
            pending = None
            cur = {"no": int(m.group(1)), "q": "", "opts": {}, "passage": cur_passage}
            cur_passage = None
            segs = [s.strip() for s in OPT_SPLIT.split(m.group(2)) if s.strip()]
            for seg in segs:
                mo = RE_OPT.match(seg)
                if mo:
                    cur["opts"][mo.group(1)] = mo.group(2).strip()
                else:
                    cur["q"] = (cur["q"] + " " + seg).strip()
            continue
        if cur is not None:
            segs = [s.strip() for s in OPT_SPLIT.split(l) if s.strip()]
            if segs and RE_OPT.match(segs[0]):
                for seg in segs:
                    mo = RE_OPT.match(seg)
                    if mo and mo.group(2).strip():
                        cur["opts"][mo.group(1)] = mo.group(2).strip()
                continue
            if re.search(r"^第\s*\d+\s*页", l) or "成人高等学校" in l or "Directions" in l:
                continue
            if len(l) > 1 and not re.match(r"^[Ⅰ-Ⅵ]", l):
                cur["q"] = (cur["q"] + " " + l).strip()
                if cur_passage is not None:
                    cur_passage.append(l)
    if cur:
        qs.append(cur)

    # 4) 组装
    out = []
    for item in qs:
        no = item["no"]
        ans = answers.get(no)
        if not ans:
            continue
        opts = item["opts"]
        keys = sorted(opts.keys())
        if no <= 5:                       # 语音
            need = "ABCD"
            qtext = "选出划线部分读音不同的单词：" + " / ".join(opts.get(k, "") for k in "ABCD" if opts.get(k))
        elif no <= 20:                    # 词汇语法
            need = "ABCD"
            qtext = item["q"]
        elif no <= 35:                    # 完形
            need = "ABCD"
            qtext = item["q"] or "（完形填空第 %d 空）" % no
        elif no <= 55:                    # 阅读
            need = "ABCD"
            qtext = item["q"]
        else:                             # 补全对话
            need = "ABCDEFG"
            qtext = item["q"] or "（补全对话第 %d 空）" % no
        if not all(opts.get(k, "").strip() for k in need):
            continue
        qtext = clean_q(qtext)
        if len(qtext) < 6:
            continue
        entry = {
            "id": "en%d-%d" % (y, no),
            "subject": "英语",
            "chapter": "英语 %d年真题" % y,
            "type": "single",
            "question": qtext,
            "options": [{"key": k, "text": clean_q(opts[k])} for k in sorted(opts.keys())],
            "answer": [ans],
            "explanation": "参考答案：%s" % ans,
        }
        if no <= 5:
            entry["question"] = "下列四个单词中，划线部分读音与其他三个不同的是：" + \
                " / ".join(clean_q(opts.get(k, "")) for k in "ABCD" if opts.get(k))
        if item.get("passage"):
            entry["passage"] = " ".join(item["passage"])
        out.append(entry)
    return out, src


if __name__ == "__main__":
    allq = []
    for y in range(2020, 2026):
        qs, src = parse_year(y)
        ans_cnt = len(qs)
        print("%d [%s] 解析 %d 题" % (y, src, ans_cnt))
        allq += qs
    json.dump(allq, open(os.path.join(TMP, "en_questions.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print("英语真题合计", len(allq))
