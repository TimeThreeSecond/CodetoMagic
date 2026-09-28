"""Run against the local dev server: execution changes must never scroll the UI."""
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    page = browser.new_page(viewport={"width":1200,"height":800})
    page.goto("http://127.0.0.1:5173")
    page.wait_for_load_state("networkidle")
    for sample in ["dijkstra.c", "pi.py"]:
        page.get_by_label("示例代码").select_option(sample)
        expect(page.locator(".filebar")).to_contain_text(sample)
        expect(page.locator(".code-footer")).to_contain_text("已同步")
        slider = page.get_by_label("演示进度")
        slider.scroll_into_view_if_needed()
        page.locator(".cm-scroller").evaluate("e=>{e.scrollTop=120;e.scrollLeft=15}")
        page.wait_for_timeout(100)
        position = page.evaluate("() => {const e=document.querySelector('.cm-scroller');return [window.scrollX,window.scrollY,e.scrollLeft,e.scrollTop]}")
        # Direct input events avoid Playwright auto-scrolling a locator into view.
        for step in [8, 15, 0]:
            page.get_by_label("演示进度").evaluate("(e,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,String(value));e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}", step)
            page.wait_for_timeout(100)
            assert page.evaluate("() => {const e=document.querySelector('.cm-scroller');return [window.scrollX,window.scrollY,e.scrollLeft,e.scrollTop]}") == position
            assert page.locator('[data-node][data-execution="active"]').count() > 0
        page.get_by_role("button", name="▷ 演示", exact=True).evaluate("e=>e.click()")
        page.wait_for_timeout(1800)
        page.get_by_role("button", name="Ⅱ 暂停", exact=True).evaluate("e=>e.click()")
        assert page.evaluate("() => {const e=document.querySelector('.cm-scroller');return [window.scrollX,window.scrollY,e.scrollLeft,e.scrollTop]}") == position
        # Manual rune clicks still locate their source code.
        page.locator('svg [data-node]').last.evaluate("e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true}))")
        expect(page.locator(".code-highlight").first).to_be_attached()
    browser.close()
print("PASS: C/Python playback and seeking keep page/editor scroll positions fixed; highlighting and manual source locating remain")
