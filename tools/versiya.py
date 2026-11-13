#!/usr/bin/env python3
"""data/*.js fayllaridan birini o'zgartirgandan keyin ishga tushiring:
    python3 tools/versiya.py
index.html dagi <script src="data/x.js?v=..."> versiyalarini fayl mazmuniga qarab yangilaydi
(brauzer va service worker yangi faylni yuklab olishi uchun) va o'zgargan bo'lsa APP_V ni oshiradi."""
import hashlib, os, re, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(ROOT, "index.html")
html = open(path, encoding="utf-8", newline="").read()
changed = []

def sub(m):
    name, old = m.group(1), m.group(2)
    data = open(os.path.join(ROOT, "data", name), "rb").read()
    new = hashlib.sha1(data).hexdigest()[:8]
    if new != old:
        changed.append(name)
    return f'<script src="data/{name}?v={new}">'

html = re.sub(r'<script src="data/([^"?]+\.js)\?v=([^"]+)">', sub, html)
if changed:
    html = re.sub(r'const APP_V = "\d+";', f'const APP_V = "{time.strftime("%Y%m%d%H%M")}";', html, count=1)
    open(path, "w", encoding="utf-8", newline="").write(html)
    print("Yangilandi:", ", ".join(changed))
else:
    print("O'zgarish yo'q")
