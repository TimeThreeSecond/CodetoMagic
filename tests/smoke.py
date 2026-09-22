"""Run against npm run dev. Uses installed Chrome in headless mode."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright, expect

base = Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page = browser.new_page(viewport={"width":1440,"height":1080}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(os.environ.get('MAGIC_TEST_URL','http://127.0.0.1:5173'))
    page.wait_for_load_state('networkidle')
    expect(page.locator('svg[role="img"]')).to_be_visible(timeout=30000)
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    assert page.locator('svg [role="button"]').count() > 10
    page.locator('svg [role="button"]').first.click()
    expect(page.locator('.code-highlight').first).to_be_visible()
    page.get_by_role('button', name='▷ 演示').click()
    expect(page.get_by_role('button', name='Ⅱ 暂停')).to_be_visible()
    page.wait_for_timeout(900)
    page.get_by_role('button', name='Ⅱ 暂停').click()
    assert not page.locator('.counter').inner_text().startswith('01')
    for ext in ['SVG', 'PNG']:
        with page.expect_download() as result:
            page.get_by_role('button', name='↓ '+ext).click()
        download = result.value
        assert download.failure() is None
        assert download.suggested_filename.endswith('.'+ext.lower())
        assert Path(download.path()).stat().st_size > 1000
    page.get_by_label('示例代码').select_option('recursion.c')
    expect(page.locator('.filebar')).to_contain_text('recursion.c')
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    assert page.locator('svg path[d*="c70 -90"]').count() == 1
    page.locator('input[type=file]').set_input_files({"name":"unicode.c","mimeType":"text/plain","buffer":'// 中文注释\nint main(void) { int x = 1; return x; }'.encode('utf-8')})
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    page.get_by_role('button', name='return statement，第 2 行').click()
    assert 'return x' in page.locator('.code-highlight').all_text_contents()[0]
    page.locator('input[type=file]').set_input_files({"name":"broken.c","mimeType":"text/plain","buffer":b'int main(void) { int x = ; return 0; }'})
    expect(page.locator('.code-footer')).to_contain_text('待检查')
    page.get_by_label('示例代码').select_option('memory.c')
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    page.screenshot(path=str(base/'test-results'/'desktop.png'),full_page=True)
    page.set_viewport_size({"width":390,"height":844})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path=str(base/'test-results'/'mobile.png'),full_page=True)
    assert not errors, errors
    browser.close()
print('PASS: parse, source linking, playback, SVG/PNG, recursion, Unicode, errors, responsive layout')
