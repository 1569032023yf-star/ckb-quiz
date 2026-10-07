# -*- coding: utf-8 -*-
"""
把成考政治真题 PDF 转成 questions.json
用法（需要联网装一次依赖）：
    pip install pymupdf rapidocr-onnxruntime
    python tools/pdf_to_questions.py <PDF文件或目录> <输出的json路径>

说明：
  - PDF 有文字层时直接提取；扫描件自动走本地 OCR（rapidocr，纯离线）
  - 只解析「选择题」（single），简答/论述题因数据模型不含主观题，暂不导入
  - 生成的文件可直接覆盖 questions.json
"""
import sys, os, re, json, glob

FULL = str.maketrans("０１２３４５６７８９ＡＢＣＤ．（）　", "0123456789ABCD.() ")


def norm(s):
    return s.translate(FULL).replace("，", ",").strip()


def read_pdf_text(path, ocr=False):
    import pymupdf
    doc = pymupdf.open(path)
    if not ocr:
        return "\n".join(p.get_text() for p in doc)
    from rapidocr_onnxruntime import RapidOCR
    eng = RapidOCR()
    parts = []
    for pg in doc:
        z = min(1.0, 2600 / max(pg.rect.width, pg.rect.height))
        pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z))
        tmp = path + ".tmp.png"
        pix.save(tmp)
        res, _ = eng(tmp)
        os.remove(tmp)
        items = []
        if res:
            W = pix.width
            for box, txt, score in res:
                cx = sum(p[0] for p in box) / 4
                cy = sum(p[1] for p in box) / 4
                items.append((0 if cx < W / 2 else 1, cy, txt))
            items.sort(key=lambda t: (t[0], t[1]))
        parts.append("\n".join(t[2] for t in items))
        print("  OCR page ok", flush=True)
    return "\n".join(parts)


def parse(text, chapter, subject="政治"):
    lines = [norm(l) for l in text.split("\n")]
    # 切分：答案部分
    ans_start = None
    for i, l in enumerate(lines):
        if "参考答案" in l:
            ans_start = i
            break
    body = lines[:ans_start] if ans_start else lines
    tail = lines[ans_start:] if ans_start else []

    # 解析答案与解析
    answers, explains = {}, {}
    num_head = re.compile(r"^(\d{1,2})\s*[.．、]")
    # ① 形如 "1.【答案】A" + 后续【应试指导】解析
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
    # ② 旧版答案表：PDF 常把 "2." 与 "C" 断行，拼接后再匹配
    if len(answers) < 5:
        tail_text = "".join(tail)
        cut = tail_text.find("二、")       # 简答题答案之后不再解析
        if cut > 0:
            tail_text = tail_text[:cut]
        for m in re.finditer(r"(\d{1,2})\s*[.．、]\s*([A-D])", tail_text):
            answers[int(m.group(1))] = m.group(2)

    qs, cur = [], None
    qnum_re = re.compile(r"^(\d{1,2})\s*[.．、]\s*(.+)$")
    opt_re = re.compile(r"^([A-D])\s*[.．、,，:：]?\s*(.*)$")
    for l in body:
        if not l:
            continue
        m = qnum_re.match(l)
        if m and int(m.group(1)) <= 60:
            if cur:
                qs.append(cur)
            cur = {"no": int(m.group(1)), "q": m.group(2), "opts": {}}
            continue
        m = opt_re.match(l)
        if m and cur is not None and len(m.group(1)) == 1:
            cur["opts"][m.group(1)] = m.group(2).strip()
            continue
        if cur is not None and not opt_re.match(l):
            # 题干续行
            if not cur["opts"]:
                cur["q"] += l
    if cur:
        qs.append(cur)

    out = []
    for item in qs:
        o = item["opts"]
        if len(o) != 4 or set(o.keys()) != set("ABCD"):
            continue  # 选项不全，跳过（多为 OCR 漏行）
        ans = answers.get(item["no"])
        if ans not in ("A", "B", "C", "D"):
            continue  # 没有明确答案，跳过
        qtext = item["q"].strip().rstrip("(（").strip()
        out.append({
            "id": "%s-%02d" % (chapter.replace("年真题", "").replace("年", ""), item["no"]),
            "subject": subject,
            "chapter": chapter,
            "type": "single",
            "question": qtext,
            "options": [{"key": k, "text": o[k]} for k in "ABCD"],
            "answer": [ans],
            "explanation": explains.get(item["no"]) or ("参考答案：%s。%s" % (ans, o[ans]))
        })
    return out


def main():
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else "questions.json"
    files = [src] if os.path.isfile(src) else sorted(glob.glob(os.path.join(src, "*.pdf")))
    all_q = []
    for f in files:
        year = re.search(r"(20\d{2})", os.path.basename(f))
        chapter = (year.group(1) + "年真题") if year else os.path.basename(f)
        print("处理:", os.path.basename(f))
        import pymupdf
        d = pymupdf.open(f)
        has_text = len("".join(p.get_text() for p in d).strip()) > 200
        txt = read_pdf_text(f, ocr=not has_text)
        got = parse(txt, chapter)
        print("  解析出 %d 道选择题" % len(got))
        all_q += got
    json.dump(all_q, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("已写入 %s，共 %d 题" % (dst, len(all_q)))


if __name__ == "__main__":
    main()
