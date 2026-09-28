"""Real Python WASM + UI regression. Run with npm run dev already listening."""
from decimal import Decimal, localcontext
import importlib.util
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("pi_sample", base / "examples" / "pi.py")
pi_sample = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pi_sample)
# Independent Gauss-Legendre verification, not Chudnovsky against itself.
with localcontext() as context:
    context.prec = 1040
    a, b, t, multiplier = Decimal(1), Decimal(1) / Decimal(2).sqrt(), Decimal(1) / 4, Decimal(1)
    for _ in range(12):
        next_a = (a + b) / 2
        b = (a * b).sqrt()
        t -= multiplier * (a - next_a) ** 2
        a, multiplier = next_a, multiplier * 2
    reference = format((a + b) ** 2 / (4 * t), "f")
    for digits in [1, 9, 50, 100, 200, 1000]:
        assert pi_sample.calculate_pi(digits) == reference[:digits + 2]
assert len(pi_sample.calculate_pi(5000)) == 5002
for bad in [0, -1, True, 2.5]:
    try:
        pi_sample.calculate_pi(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"invalid digits accepted: {bad}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    page = browser.new_page(viewport={"width":1500,"height":1100}, accept_downloads=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(os.environ.get("MAGIC_TEST_URL", "http://127.0.0.1:5173"))
    page.wait_for_load_state("networkidle")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    result = page.evaluate(r'''async () => {
      const {analyzePythonSource:parse}=await import('/src/pythonAnalysis.ts');
      const {analyzeCSource,calledFunction}=await import('/src/analysis.ts');
      const {buildTimeline}=await import('/src/playback.ts');
      const {buildPlanes,inferFunctionResultKind}=await import('/src/planes.ts');
      const {samples}=await import('/src/sample.ts');
      const {sigils}=await import('/src/sigils.ts');
      const check=(ok,message)=>{if(!ok)throw new Error(message)};
      const source='def gcd(a: int, b: int) -> int:\n    while b:\n        a, b = b, a % b\n    return a\n\nif __name__ == "__main__":\n    print(gcd(252, 105))\n';
      const m=await parse(source);
      check(JSON.stringify(m)===JSON.stringify(await parse(source)),'deterministic Python');
      const formattedSource='# 中文🌙\n'+source.replaceAll('    ','  ');
      const formatted=await parse(formattedSource);
      check(m.semanticHash===formatted.semanticHash,'format/comment invariance');
      check(m.sourceHash!==formatted.sourceHash,'raw fingerprint');
      const renamed=await parse(source.replace(/\ba\b/g,'left').replace(/\bb\b/g,'right'));
      check(m.semanticHash===renamed.semanticHash,'identifier canonicalization');
      check(m.semanticHash!==(await parse(source.replace('while b:', 'if b:'))).semanticHash,'control mutation');
      check(m.entryId==='module'&&m.functions.every(f=>f.reachable),'entry and reachability');
      check(m.functions.find(f=>f.name==='gcd').nodes.some(n=>n.kind==='while_statement'&&n.sigils.includes('while')),'loop mapping');
      const ret=formatted.functions.find(f=>f.name==='gcd').nodes.find(n=>n.kind==='return_statement');
      check(formattedSource.slice(ret.range.start,ret.range.end)==='return a','Unicode UTF-16');
      const pi=await parse(samples['pi.py']);
      check(!pi.diagnostics.length&&pi.functions.length===4&&pi.functions.every(f=>f.reachable),'pi model');
      const split=pi.functions.find(f=>f.name==='binary_split');
      check(inferFunctionResultKind(split)==='collection','tuple annotation seal');
      check(inferFunctionResultKind(pi.functions.find(f=>f.name==='calculate_pi'))==='text','str annotation seal');
      check(split.nodes.filter(n=>n.target==='binary_split').every(n=>calledFunction(pi,n)===split),'recursion links');
      check(buildTimeline(pi).events.length<6000,'bounded recursion');
      const ids=buildPlanes(pi).flatMap(p=>[...p.functions,...p.satellites.map(s=>s.fn)]).map(f=>f.id);
      check(ids.length===pi.functions.length&&new Set(ids).size===ids.length,'render each function once');
      check(pi.functions.flatMap(f=>f.nodes).find(n=>n.target==='isqrt')?.family==='math','from-import family');
      check(pi.functions.every(f=>f.nodes.every(n=>n.pointers===0)),'no Python C pointers');
      check((await parse('')).functions.length===0,'empty');
      check((await parse('# only comment\n')).functions.length===0,'comment-only');
      check((await parse('def broken(:\n    return\n')).diagnostics.length>0,'syntax diagnostics');
      const script=await parse('x = 1\nfor i in range(3):\n    print(i)\n');
      check(script.functions.length===1&&script.entryId==='module','functionless script');
      const nested=await parse('def outer():\n    def inner():\n        return 1\n    return inner()\nouter()\n');
      check(nested.functions.map(f=>f.name).includes('outer.inner'),'qualified nested functions');
      check(nested.functions.every(f=>f.reachable),'nested lexical call');
      check(nested.functions.find(f=>f.name==='outer').nodes.filter(n=>n.kind==='return_statement').length===1,'nested body not duplicated');
      const shadow=await parse('def helper():\n    return 1\ndef outer(helper):\n    return helper()\nouter(None)\n');
      check(!shadow.functions.find(f=>f.name==='helper').reachable,'shadowed parameter');
      const aliases=await parse('import math as m\nfrom math import sqrt as root\nprint(m.sqrt(9), root(16))\n');
      check(aliases.functions[0].nodes.filter(n=>['m.sqrt','root'].includes(n.target)).every(n=>n.family==='math'),'import aliases');
      const objects=await parse('class Box:\n    def run(self):\n        return self.helper()\n    def helper(self):\n        return 1\nBox.run(None)\n');
      check(objects.functions.find(f=>f.name==='Box.helper').reachable,'literal class / self links');
      const classShadow=await parse('class Box:\n    def helper(self):\n        return 1\ndef invoke(Box):\n    return Box.helper()\ninvoke(None)\n');
      check(!classShadow.functions.find(f=>f.name==='Box.helper').reachable,'class parameter shadow');
      const comprehension=await parse('def helper():\n    return 1\ndef work():\n    values = [helper() for helper in []]\n    return helper()\nwork()\n');
      const localCalls=comprehension.functions.find(f=>f.name==='work').nodes.filter(n=>n.target==='helper');
      check(localCalls[0].targetId===''&&localCalls[1].targetId!=='','comprehension local isolation');
      const anonymous=await parse('def helper():\n    return 1\ndef work():\n    fn = lambda helper: helper()\n    return helper()\nwork()\n');
      const lambdaCalls=anonymous.functions.find(f=>f.name==='work').nodes.filter(n=>n.target==='helper');
      check(lambdaCalls[0].targetId===''&&lambdaCalls[1].targetId!=='','lambda parameter shadow');
      const fstring=await parse('def text(value):\n    return f"value: {value + 1}"\n');
      check(fstring.functions[0].nodes.some(n=>n.sigils.includes('+')),'f-string interpolation operators');
      const special=await parse('async def gather(items):\n    with open("log.txt") as f:\n        try:\n            values = [x ** 2 for x in items if x > 0]\n            await fetch(values)\n        except ValueError:\n            raise\n        finally:\n            pass\n    yield values\n');
      check(!special.diagnostics.length,'special construct syntax');
      const nodes=special.functions[0].nodes;
      for(const k of ['with_statement','try_statement','except_clause','raise_statement','await_expression','yield_statement','for_statement','if_statement'])
        check(nodes.some(n=>n.kind===k),'missing '+k);
      check(nodes.flatMap(n=>n.sigils||[]).every(s=>sigils[s]),'valid glyph dictionary');
      const matched=await parse('def classify(x):\n    match x:\n        case 0:\n            return False\n        case _:\n            return True\n');
      check(matched.functions[0].nodes.some(n=>n.kind==='switch_statement')&&matched.functions[0].nodes.some(n=>n.kind==='case_statement'),'match/case');
      const c=await analyzeCSource(samples['gcd.c']);
      await parse(source);
      check(JSON.stringify(c)===JSON.stringify(await analyzeCSource(samples['gcd.c'])),'C grammar unaffected');
      return {functions:pi.functions.length,events:buildTimeline(pi).events.length};
    }''')
    print("PASS Python parser:", result)
    page.get_by_label("导入源码文件").set_input_files({"name":"unicode.py","mimeType":"text/plain",
        "buffer":"# 中文🌙\ndef answer() -> int:\n    return 42\n\nanswer()\n".encode("utf-8")})
    expect(page.get_by_label("源码语言")).to_have_value("python")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    page.get_by_role("button", name="return statement，第 3 行").click()
    expect(page.locator(".code-highlight")).to_contain_text("return 42")
    page.get_by_label("示例代码").select_option("pi.py")
    expect(page.locator(".filebar")).to_contain_text("pi.py")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    expect(page.locator(".scene-wrap svg")).to_have_attribute("data-language", "python")
    assert page.locator("[data-ring-container]").count() == 4
    assert page.locator("[data-result-core]").count() == 1
    page.get_by_role("button", name="正视重叠", exact=True).click()
    expect(page.locator(".scene-wrap svg")).to_have_attribute("data-view", "front")
    page.get_by_role("button", name="▷ 演示", exact=True).click()
    page.wait_for_timeout(500)
    page.get_by_role("button", name="Ⅱ 暂停", exact=True).click()
    transform = page.locator("[data-function-ring]").first.get_attribute("transform")
    page.wait_for_timeout(150)
    assert page.locator("[data-function-ring]").first.get_attribute("transform") == transform
    page.get_by_label("演示进度").fill("8")
    for ext in ["SVG", "PNG"]:
        with page.expect_download() as pending:
            page.get_by_role("button", name="↓ " + ext, exact=True).click()
        assert pending.value.suggested_filename == "pi-sigil." + ext.lower()
        pending.value.save_as(base / "outputs" / ("pi-sigil." + ext.lower()))
    page.screenshot(path=str(base / "test-results" / "python-pi-workbench.png"), full_page=True)
    page.get_by_label("导入 SVG 动画文件").set_input_files(base / "outputs" / "pi-sigil.svg")
    expect(page.get_by_label("SVG 动画播放器")).to_be_visible()
    page.get_by_role("button", name="回到起点").click()
    before = page.locator("[data-function-ring]").first.get_attribute("transform")
    page.get_by_role("button", name="▷ 播放 SVG").click()
    page.wait_for_timeout(250)
    assert page.locator("[data-function-ring]").first.get_attribute("transform") != before
    page.get_by_role("button", name="Ⅱ 暂停", exact=True).click()
    page.get_by_role("button", name="返回源码工作台").click()
    page.get_by_label("示例代码").select_option("gcd.c")
    expect(page.get_by_label("源码语言")).to_have_value("c")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    page.get_by_label("导入源码文件").set_input_files({"name":"broken.py","mimeType":"text/plain","buffer":b"def broken(:\n    return 1\n"})
    expect(page.locator(".code-footer")).to_contain_text("待检查")
    page.get_by_label("示例代码").select_option("pi.py")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    page.set_viewport_size({"width":390,"height":844})
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "mobile overflow"
    assert not errors, errors
    browser.close()
print("PASS: independent pi checks, Python import/linking, views/animation, SVG+PNG export/replay, C switching, diagnostics, mobile")
