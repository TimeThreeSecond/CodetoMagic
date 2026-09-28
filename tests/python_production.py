"""Production-bundle smoke. Start: npx vite preview --host 127.0.0.1 --port 5174"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    page = browser.new_page(viewport={"width":1440,"height":1080}, accept_downloads=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(os.environ.get("MAGIC_PRODUCTION_URL", "http://127.0.0.1:5174"))
    page.wait_for_load_state("networkidle")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    expect(page.locator(".scene-wrap svg")).to_have_attribute("data-language", "c")
    page.get_by_label("导入源码文件").set_input_files(base / "examples" / "pi.py")
    expect(page.get_by_label("源码语言")).to_have_value("python")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    expect(page.locator(".scene-wrap svg")).to_have_attribute("data-language", "python")
    assert page.locator("[data-ring-container]").count() == 4
    page.get_by_role("button", name="▷ 演示", exact=True).click()
    page.wait_for_timeout(500)
    page.get_by_role("button", name="Ⅱ 暂停", exact=True).click()
    with page.expect_download() as pending:
        page.get_by_role("button", name="↓ SVG", exact=True).click()
    assert pending.value.suggested_filename == "pi-sigil.svg"
    exported = base / "test-results" / "pi-production.svg"
    pending.value.save_as(exported)
    page.get_by_label("导入 SVG 动画文件").set_input_files(exported)
    expect(page.get_by_label("SVG 动画播放器")).to_be_visible()
    page.get_by_role("button", name="▷ 播放 SVG").click()
    page.wait_for_timeout(200)
    page.get_by_role("button", name="返回源码工作台").click()
    page.get_by_label("示例代码").select_option("gcd.c")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    expect(page.locator(".scene-wrap svg")).to_have_attribute("data-language", "c")
    # Paste-mode language change must retain the exact editor text.
    before = page.locator(".cm-content").inner_text()
    page.get_by_label("源码语言").select_option("python")
    expect(page.locator(".filebar")).to_contain_text("gcd.py")
    assert page.locator(".cm-content").inner_text() == before
    page.get_by_label("示例代码").select_option("pi.py")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    assert not errors, errors
    browser.close()
print("PASS production bundle: C/Python WASM loading, import, animation, SVG replay, language switching without text loss")
