"""Product screenshots of Mob Desktop for the site, with made-up conversations.

Needs Mob Desktop's dev server (in ../mob: `npm run dev`, http://localhost:1420), Node and Python
Playwright (`pip install playwright && playwright install chromium`). Run from mob-site:

    python3 tools/screens/shoot.py

Starts three stand-ins for mobd (fake-mobd.mjs), pairs the browser build of Mob Desktop with them,
and writes public/assets/screens/desktop-*.webp. Nothing touches a real mobd.
"""
import io
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "public" / "assets" / "screens"
APP = os.environ.get("MOB_DEV_URL", "http://localhost:1420")
PORTS = {"local": 8091, "office": 8092, "linux": 8093}
NAMES = {"local": "This computer", "office": "Studio Mac", "linux": "Linux box"}
W, H = 1440, 900

# The Studio Mac's screen as the agent left it: Safari on a fare page.
OFFICE_SCREEN = """<html><body style="margin:0;width:1920px;height:1080px;font:15px -apple-system,Helvetica,sans-serif;
background:linear-gradient(160deg,#2c5f7c,#7fa6a3 45%,#d9b98a);position:relative;overflow:hidden">
<div style="height:28px;background:rgba(240,240,245,.85);display:flex;align-items:center;gap:22px;padding:0 18px;font-size:14px">
<b>Safari</b><span>File</span><span>Edit</span><span>View</span><span>History</span><span>Window</span><span style="margin-left:auto">Tue 10:17</span></div>
<div style="position:absolute;left:250px;top:90px;width:1420px;height:880px;background:#fff;border-radius:12px;box-shadow:0 30px 80px rgba(0,0,0,.4);overflow:hidden">
<div style="height:52px;background:#f2f2f4;border-bottom:1px solid #ddd;display:flex;align-items:center;gap:10px;padding:0 18px">
<i style="width:12px;height:12px;border-radius:50%;background:#ff5f57"></i><i style="width:12px;height:12px;border-radius:50%;background:#febc2e"></i><i style="width:12px;height:12px;border-radius:50%;background:#28c840"></i>
<div style="margin:0 auto;width:520px;height:30px;border-radius:8px;background:#e4e4e8;text-align:center;line-height:30px;color:#555">www.ana.co.jp / Booking</div></div>
<div style="padding:34px 48px">
<div style="font-size:30px;font-weight:700;color:#0b2e6b">Tokyo (HND) · Tue, Oct 20</div>
<div style="color:#666;margin-top:6px">Economy · 1 adult · cheapest morning departures</div>
<table style="margin-top:28px;width:100%;border-collapse:collapse;font-size:18px">
<tr style="color:#888;text-align:left"><th style="padding:12px 0">Flight</th><th>Departs</th><th>Arrives</th><th>Fare</th><th></th></tr>
<tr style="border-top:1px solid #eee;background:#eef4ff"><td style="padding:18px 0"><b>NH10</b></td><td>10:25</td><td>14:05 +1</td><td><b>¥84,200</b></td><td style="color:#0b2e6b;font-weight:700">Selected</td></tr>
<tr style="border-top:1px solid #eee"><td style="padding:18px 0">NH12</td><td>11:40</td><td>15:20 +1</td><td>¥91,600</td><td></td></tr>
<tr style="border-top:1px solid #eee"><td style="padding:18px 0">JL5</td><td>09:55</td><td>13:40 +1</td><td>¥96,300</td><td></td></tr>
<tr style="border-top:1px solid #eee"><td style="padding:18px 0">JL7</td><td>11:05</td><td>14:55 +1</td><td>¥102,800</td><td></td></tr></table>
<div style="margin-top:34px;display:flex;gap:24px">
<div style="flex:1;border:1px solid #ddd;border-radius:10px;padding:20px"><div style="color:#888">Passenger</div><div style="margin-top:8px;font-size:18px">Ana Silva · Seat 34K</div></div>
<div style="flex:1;border:1px solid #ddd;border-radius:10px;padding:20px"><div style="color:#888">Payment</div><div style="margin-top:8px;font-size:18px">Visa ending 4421</div></div></div>
<div style="margin-top:30px;text-align:right"><span style="background:#0b2e6b;color:#fff;padding:14px 34px;border-radius:8px;font-size:18px;font-weight:600">Pay ¥84,200</span></div>
</div></div>
<div style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);width:640px;height:64px;border-radius:20px;background:rgba(255,255,255,.35)"></div>
</body></html>"""

# Window buttons where the macOS app draws them, and room for them in the sidebar header.
CHROME_CSS = """aside > div[data-tauri-drag-region]:first-child,
section[aria-label$=" screen"] > div[data-tauri-drag-region] { padding-left: 78px !important; }
#shot-lights { position: fixed; left: 16px; top: 18px; display: flex; gap: 8px; z-index: 100; pointer-events: none; }
#shot-lights i { width: 12px; height: 12px; border-radius: 50%; display: block; }"""
CHROME_JS = """() => { const d = document.createElement('div'); d.id = 'shot-lights';
d.innerHTML = '<i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i>';
document.body.appendChild(d); }"""


def link(which):
    return f"http://127.0.0.1:{PORTS[which]}/pair#v=1&serverId={which}-server{'0' * (64 - len(which) - 7)}&invite=screenshots"


def seed():
    """Saved computers, not yet paired, so each keeps its place and This computer stays This computer."""
    machines = [{
        "id": f"m-{w}", "name": NAMES[w], "serverId": f"{w}-server".ljust(64, "0"), "local": w == "local" or None,
        "addresses": [{"id": f"a-{w}", "url": f"http://127.0.0.1:{PORTS[w]}", "needsPairing": True}],
    } for w in ("local", "office", "linux")]
    state = {"machines": machines, "activeMachineId": "m-local", "savedSessions": {"m-local": "s00000001", "m-office": "s00000001"},
             "collapsed": {}, "sidebarOpen": True, "previewOpen": True, "theme": "dark", "perComputer": 3, "textSize": "default",
             "stepsOpen": True, "notify": {"needs": False, "done": False, "failed": False, "sound": False, "background": True, "computers": {}}}
    return json.dumps({"state": state, "version": 7})


def save(page, name, clip=None):
    """The whole window, or with clip (CSS pixels) a detail for a narrow slot such as the home page."""
    page.wait_for_timeout(900)
    png = page.screenshot(clip=clip) if clip else page.screenshot()
    OUT.mkdir(parents=True, exist_ok=True)
    Image.open(io.BytesIO(png)).save(OUT / f"desktop-{name}.webp", "WEBP", quality=86, method=6)
    print("wrote", OUT / f"desktop-{name}.webp")


def main():
    tmp = Path(tempfile.mkdtemp())
    procs = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-proxy-server"])
        shot = browser.new_page(viewport={"width": 1920, "height": 1080})
        shot.set_content(OFFICE_SCREEN)
        shot.screenshot(path=str(tmp / "office.jpg"), type="jpeg", quality=88)
        shot.close()
        for w, port in PORTS.items():
            screen = [str(tmp / "office.jpg")] if w == "office" else []
            procs[w] = subprocess.Popen(["node", str(HERE / "fake-mobd.mjs"), str(port), w, *screen])
        time.sleep(1)
        try:
            ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, color_scheme="dark")
            ctx.add_init_script(f"localStorage.setItem('mob.app', {json.dumps(seed())});")
            page = ctx.new_page()
            page.on("pageerror", lambda e: print("pageerror:", e, file=sys.stderr))
            page.goto(APP)
            page.wait_for_timeout(1500)
            # Sidebar order is This computer, Studio Mac, Linux box; a paired one loses its button.
            for w in ("local", "office", "linux"):
                page.get_by_role("button", name="Pair again…").first.click()
                page.get_by_placeholder("https://…/pair#v=1&serverId=…&invite=…").fill(link(w))
                page.keyboard.press("Enter")
                page.wait_for_timeout(700)
                page.get_by_role("dialog").get_by_role("button", name="Pair again", exact=True).click()
                page.wait_for_timeout(1500)
            # The Linux box goes offline: it stays listed, folded.
            procs.pop("linux").terminate()
            page.evaluate("() => window.dispatchEvent(new Event('focus'))")
            page.wait_for_timeout(32000)
            page.add_style_tag(content=CHROME_CSS)
            page.evaluate(CHROME_JS)
            page.locator("nav[aria-label=Computers]").get_by_text("Fix the failing build").click()
            page.wait_for_timeout(1500)
            save(page, "conversation")
            page.locator("nav[aria-label=Computers]").get_by_text("Book flights to Tokyo").click()
            page.wait_for_timeout(3000)
            save(page, "screen")
            save(page, "screen-detail", {"x": 272, "y": 0, "width": W - 272, "height": 420})
            page.get_by_role("button", name="Open in the window").first.click()
            page.wait_for_timeout(2500)
            save(page, "screen-expanded")
            page.get_by_role("button", name="Back to the panel").click()
            page.get_by_role("button", name="Needs you").first.click()
            page.wait_for_timeout(2000)
            save(page, "needs-you")
            save(page, "needs-you-detail", {"x": 0, "y": 0, "width": 1240, "height": 440})
            page.keyboard.press("Meta+k")
            page.keyboard.type("report")
            save(page, "search")
            page.keyboard.press("Escape")
            page.keyboard.press("Meta+,")
            page.get_by_role("navigation", name="Settings").get_by_text("Studio Mac").click()
            page.get_by_role("tab", name="Agents").click()
            page.wait_for_timeout(1200)
            save(page, "settings")
            page.keyboard.press("Escape")
        finally:
            for proc in procs.values():
                proc.terminate()
            browser.close()


if __name__ == "__main__":
    main()
