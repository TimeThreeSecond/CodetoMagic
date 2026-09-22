from pathlib import Path
import hashlib
from playwright.sync_api import sync_playwright, expect

base=Path(__file__).resolve().parent.parent
destination=base/'outputs'
destination.mkdir(exist_ok=True)
source=base/'examples'/'gcd.c'
fingerprint=hashlib.sha256(source.read_bytes()).hexdigest()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page(viewport={"width":1440,"height":1080},accept_downloads=True)
    page.goto('http://127.0.0.1:5173')
    page.wait_for_load_state('networkidle')
    page.locator('input[type=file]').set_input_files(str(source))
    expect(page.locator('.filebar')).to_contain_text('gcd.c')
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    expect(page.locator('details code')).to_have_text(fingerprint)
    for ext in ['SVG','PNG']:
        with page.expect_download() as result:
            page.get_by_role('button',name='↓ '+ext).click()
        result.value.save_as(destination/('gcd-sigil.'+ext.lower()))
    page.screenshot(path=str(destination/'gcd-workbench.png'),full_page=True)
    browser.close()
print('Exported GCD SVG, PNG and workbench screenshot. SHA-256: '+fingerprint)
