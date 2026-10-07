import pymupdf, os, re
base = r"C:/Users/yf/Desktop/成考（专升本）考前资料-理工经管&药学类/【1】2020-2025年真题卷/成考（专升本）历年真题-政治"
out = r"C:/Users/yf/WorkBuddy/学习/成考刷题App/_tmp"
for y in range(2020, 2026):
    p = os.path.join(base, f"{y}年专升本真题及答案解析（政治）.pdf")
    d = pymupdf.open(p)
    txt = "\n".join(pg.get_text() for pg in d)
    open(os.path.join(out, f"{y}.txt"), "w", encoding="utf-8").write(txt)
    print(y, "pages", len(d), "chars", len(txt))
