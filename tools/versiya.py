#!/usr/bin/env python3
"""Update content-based ?v=HASH query params for data/*.js, styles/*.css, and js/*.js
in index.html and js/app.js, and bump APP_V when any asset changes.
Usage: python3 tools/versiya.py"""
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

# Update lazy asset hashes inside js/app.js first, then update index.html
update_file("js/app.js")
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
    # Re-sync js/app.js hash in index.html after APP_V update
    update_file("index.html")
    print("Updated:", ", ".join(changed))
else:
    print("No changes")
