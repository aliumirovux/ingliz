#!/usr/bin/env python3
"""data/*.js, styles/*.css yoki js/*.js fayllaridan birini o'zgartirgandan keyin ishga tushiring:
    python3 tools/versiya.py
index.html va js/app.js dagi ?v=HASH versiyalarini fayl mazmuniga qarab yangilaydi
(brauzer va service worker yangi faylni yuklab olishi uchun) va o'zgargan bo'lsa APP_V ni oshiradi."""
import hashlib, os, re, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAT = re.compile(r'(["\'])((?:data|styles|js)/[^"\'?]+\.(?:js|css))\?v=([^"\']+)\1')
changed = []

def update_file(rel_path):
    full = os.path.join(ROOT, rel_path)
    src = open(full, encoding="utf-8", newline="").read()
    local_changed = False

    def sub(m):
        nonlocal local_changed
        q, asset, old = m.group(1), m.group(2), m.group(3)
        asset_path = os.path.join(ROOT, asset)
        if not os.path.exists(asset_path):
            return m.group(0)
        new = hashlib.sha1(open(asset_path, "rb").read()).hexdigest()[:8]
        if new != old:
            local_changed = True
            if asset not in changed:
                changed.append(asset)
        return f"{q}{asset}?v={new}{q}"

    out = PAT.sub(sub, src)
    if local_changed:
        open(full, "w", encoding="utf-8", newline="").write(out)
    return local_changed

# Avval js/app.js ichidagi LAZY_DATA hash'larini yangilaymiz (bu js/app.js hash'iga ta'sir qiladi)
update_file("js/app.js")
# Keyin index.html dagi barcha (data/*, styles/*, js/*) hash'larni yangilaymiz
update_file("index.html")

if changed:
    ver = time.strftime("%Y%m%d%H%M")
    for rel in ("index.html", "js/app.js"):
        full = os.path.join(ROOT, rel)
        src = open(full, encoding="utf-8", newline="").read()
        out = re.sub(r'const APP_V = "\d+";', f'const APP_V = "{ver}";', src, count=1)
        out = re.sub(r'<meta name="app-v" content="\d+">', f'<meta name="app-v" content="{ver}">', out, count=1)
        if out != src:
            open(full, "w", encoding="utf-8", newline="").write(out)
    # APP_V o'zgargani uchun index.html dagi js/app.js hash'ini qayta moslaymiz
    update_file("index.html")
    print("Yangilandi:", ", ".join(changed))
else:
    print("O'zgarish yo'q")
