# -*- coding: utf-8 -*-
"""生成英语词汇题(6-20)题干修复补丁：
  1) 剥离混入题干的页脚/签名栏噪声
  2) 从 OCR 的连续空格信号恢复被吞掉的空位符 ______
  3) 修掉 "don' t" 这类被空格拆开的撇号
仅处理 2020-2024（2025 年扫描件 OCR 严重损坏，另行重跑，不在此列）。
输出：tools/patch_en_stem.json  （id -> 新的 question）
"""
import sys, os, re, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import en_parse5 as P

YEARS = (2020, 2021, 2022, 2023, 2024)
BLANK = "______"

# 只有这些题需要人工指定（OCR 没留下可用的空位信号 / 原卷本身有笔误）
# 说明：
#   en2020-20 原卷印的是 "John, Helen"（答案解析里写成 Johnson 才是笔误），OCR 把逗号读成了句号
#   en2023-20 原卷把 parties 误印成 panics（已放大扫描图确认），按语义纠正为 parties
MANUAL = {
    "en2020-11": "Modern science and technology has shortened the distance between people and brought us ______ closer.",
    "en2022-10": "The writer's first book is ______ popular than his second one.",
    "en2022-16": "Your brother Frank doesn't eat cheese, ______?",
    "en2020-17": "______, the issue doesn't seem to be difficult at all.",
    "en2020-20": "Whenever I was free, I would chat with John, Helen and a few ______ friends.",
    "en2023-12": "The university's academic board will ______ this issue first before coming to a decision.",
    "en2023-20": "My elder sister says I can borrow her newly-bought dress for parties ______ I like.",
    # 该题来自人工补丁文件（不在 OCR 解析结果里），一并修正
    "en2021-7": "By the time he retires, Carl ______ president for 15 years at the university.",
}

SENT = "\x00"          # 噪声标记占位，避免它旁边的空格被误判成空位


def strip_noise(s):
    # 签名栏文字夹在正文中间，用占位符吃掉，事后再换回单空格
    s = re.sub(r"\s*诚信承诺\s*[：:]\s*", SENT, s)
    s = re.sub(r"\s*承诺人\s*[：:]\s*", SENT, s)
    s = re.sub(r"[\u4e00-\u9fff]{0,16}招生全国统一考试.*$", "", s)   # 页脚
    s = re.sub(r"[\u4e00-\u9fff]{0,10}第\s*\d+\s*页.*$", "", s)       # 页码
    s = re.sub(r"[\u4e00-\u9fff]{0,12}(?:密封线|不要答题).*$", "", s)
    return s.strip()


def fix_apostrophe(s):
    return re.sub(r"(?<=[A-Za-z])' (?=[A-Za-z])", "'", s)


def fix_blanks(s):
    if BLANK in s:
        return s
    if re.search(r"\S  +\S", s):                      # 中段连续空格 = 空位
        return re.sub(r"\s{2,}", " " + BLANK + " ", s)
    if re.match(r"^[,;:.!?]", s):                     # 空位在句首标点前
        return BLANK + s
    if re.match(r"^[a-z]", s):                        # 空位在句首
        return BLANK + " " + s
    if not re.search(r"[.?!:;,\"')\]]$", s):          # 空位在句尾
        return s + " " + BLANK
    return s


def fix_stem(raw):
    s = strip_noise(raw)
    s = fix_apostrophe(s)
    s = fix_blanks(s)
    s = s.replace(SENT, " ")
    s = re.sub(r"\s+([,;:.!?])", r"\1", s)            # 空位后紧跟标点时不留空格
    s = re.sub(r",(?=[A-Za-z])", ", ", s)             # 逗号后补空格
    s = re.sub(r"(?<=[a-z])\.(?=[A-Z])", ". ", s)     # 句号后补空格
    s = re.sub(r"\.{2,}$", ".", s)                    # 收尾连续句号
    s = re.sub(r":$", ".", s)                         # 句尾误用的冒号
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s


patch, unresolved = {}, []
for y in YEARS:
    for q in P.parse_year(y):
        if q["type"] != "single":
            continue
        n = int(q["id"].split("-")[-1])
        if not (6 <= n <= 20):
            continue
        new = MANUAL.get(q["id"]) or fix_stem(q["question"])
        if BLANK not in new:
            unresolved.append((q["id"], new))
        patch[q["id"]] = new

for k, v in MANUAL.items():          # 覆盖不在 OCR 解析结果里的题（来自人工补丁文件）
    patch.setdefault(k, v)

json.dump(patch, open(os.path.join(HERE, "patch_en_stem.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

print("生成补丁", len(patch), "条 | 仍未含空位:", len(unresolved), unresolved)
print("=" * 100)
for k in sorted(patch):
    print(k, "|", patch[k])
