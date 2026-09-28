"""Pointer/glyph/editor and source-free SVG highlight regression; requires dev server."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base = Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    page = browser.new_page(viewport={"width":1500,"height":1100}, accept_downloads=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("http://127.0.0.1:5173")
    page.wait_for_load_state("networkidle")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    assert page.locator(".code-execution").count() > 0
    for sample in ["dijkstra.c", "pi.py"]:
        page.get_by_label("示例代码").select_option(sample)
        expect(page.locator(".filebar")).to_contain_text(sample)
        expect(page.locator(".code-footer")).to_contain_text("已同步")
        events = page.evaluate("""async name=>{
          const {samples}=await import('/src/sample.ts');
          const {analyzeSource,languageForFile}=await import('/src/source.ts');
          const {buildTimeline}=await import('/src/playback.ts');
          const {executionHighlights}=await import('/src/execution.ts');
          const model=await analyzeSource(samples[name],languageForFile(name));
          const timeline=buildTimeline(model);
          window.executionTest={model,timeline};
          return timeline.events.map((e,index)=>({index,time:e.start+.01,stack:e.stack,fnId:e.fnId,nodeId:e.nodeId,
            expected:executionHighlights(model,timeline,e.start+.01).map(h=>({id:h.nodeId,status:h.status,line:h.range.line,text:samples[name].slice(h.range.start,h.range.end)}))}));
        }""", sample)
        nested = next(e for e in events if len(e["stack"]) >= 2)
        deep = next((e for e in events if len(e["stack"]) >= 3), nested)
        for event in [events[0], nested, deep, events[-1]]:
            page.get_by_label("演示进度").fill(str(event["index"]))
            expected = {h["id"]:h["status"] for h in event["expected"]}
            page.wait_for_function("""expected=>{
              const actual={};
              document.querySelectorAll('[data-node]').forEach(e=>actual[e.dataset.node]=e.dataset.execution);
              return Object.entries(expected).every(([id,status])=>actual[id]===status);
            }""", arg=expected)
            for item in event["expected"]:
                # Execution no longer follows source automatically. Reveal each
                # range manually before checking CodeMirror's virtualized DOM.
                page.locator(".cm-scroller").evaluate("(e,line)=>{const h=e.querySelector('.cm-line').getBoundingClientRect().height;e.scrollTop=Math.max(0,(line-4)*h)}", item["line"])
                spans = page.locator(f'.code-execution[data-execution-node="{item["id"]}"]')
                expect(spans.first).to_be_attached()
                page.wait_for_timeout(50)
                actual = "".join(spans.all_text_contents())
                assert actual.replace("\n", "") == item["text"].replace("\n", ""), (sample, item, actual)
                glyph = page.locator(f'[data-node="{item["id"]}"]')
                if glyph.count():
                    expect(glyph).to_have_attribute("data-execution", item["status"])
                    expect(glyph).to_have_attribute("stroke", "#fff3ba" if item["status"] == "active" else "#f3bf78")
            # Export/reimport at current time must preserve highlights, and seeking
            # must replace them rather than freezing the exported frame.
            assert page.evaluate("""async()=>{
              const {recordSvg,readRecording}=await import('/src/svgPlayback.ts');
              const {executionHighlights}=await import('/src/execution.ts');
              const source=document.querySelector('.scene-wrap svg'), {model,timeline}=window.executionTest;
              const time=JSON.parse(source.querySelector('metadata').textContent).time;
              const clip=readRecording(new XMLSerializer().serializeToString(recordSvg(source,timeline,time)));
              for(const t of [time,0,timeline.duration/2,timeline.duration]){
                clip.seek(t);
                const expected=new Map(executionHighlights(model,timeline,t).map(h=>[h.nodeId,h.status]));
                for(const el of clip.svg.querySelectorAll('[data-execution-track]')){
                  const id=el.getAttribute('data-node')||el.getAttribute('data-feature-node');
                  // Aggregated ordinary nodes contain several members; their
                  // baked track is verified by the pure execution unit tests.
                  if(id&&!id.startsWith('group-')&&el.getAttribute('data-execution')!==(expected.get(id)||'none'))return false;
                }
              }
              return true;
            }""")
        page.get_by_label("演示进度").fill(str(nested["index"]))
        page.get_by_role("button", name="▷ 演示", exact=True).click()
        page.wait_for_timeout(150)
        page.get_by_role("button", name="Ⅱ 暂停", exact=True).click()
        before = page.locator(".code-execution").evaluate_all("(es)=>es.map(e=>[e.dataset.executionNode,e.dataset.executionStatus,e.textContent])")
        page.wait_for_timeout(150)
        assert page.locator(".code-execution").evaluate_all("(es)=>es.map(e=>[e.dataset.executionNode,e.dataset.executionStatus,e.textContent])") == before
    # A large function aggregates normal instructions; the entire visible group
    # must light up but only the actual instruction is highlighted in the editor.
    large = "int main(void) {\n" + "\n".join(f"int value{i} = {i};" for i in range(250)) + "\nreturn 0;\n}\n"
    page.get_by_label("导入源码文件").set_input_files({"name":"large.c","mimeType":"text/plain","buffer":large.encode()})
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    expect(page.locator('[data-node^="group-"][data-execution="active"]')).to_have_count(1)
    page.locator(".cm-scroller").evaluate("e=>e.scrollTop=0")
    expect(page.locator(".code-execution-active")).to_contain_text("int value0 = 0;")
    assert "".join(page.locator(".code-execution-active").all_text_contents()) == "int value0 = 0;"
    # Manual selection remains independent while execution advances.
    page.get_by_role("button", name="return statement，第 252 行").click()
    expect(page.locator(".code-highlight")).to_contain_text("return 0;")
    page.get_by_label("演示进度").fill("1")
    page.locator(".cm-scroller").evaluate("e=>e.scrollTop=0")
    expect(page.locator(".code-execution-active")).to_contain_text("int value1 = 1;")
    # CodeMirror virtualizes off-screen rows; scrolling to the current step must
    # not erase the manual mark at the end of the document.
    expect(page.locator(".readout strong")).to_contain_text("return statement")
    page.locator(".cm-scroller").evaluate("e=>e.scrollTop=e.scrollHeight")
    expect(page.locator(".code-highlight")).to_contain_text("return 0;")
    page.get_by_label("示例代码").select_option("pi.py")
    expect(page.locator(".code-footer")).to_contain_text("已同步")
    page.get_by_label("演示进度").fill("14")
    page.screenshot(path=str(base / "test-results" / "execution-highlights.png"), full_page=True)
    assert not errors, errors
    browser.close()
print("PASS: C/Python active+waiting glyph/source highlights, pause, aggregation, manual selection and SVG replay seek")
