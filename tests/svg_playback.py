from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page(viewport={'width':1500,'height':1100})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5173')
    page.wait_for_load_state('networkidle')
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    assert set(page.locator('[data-function-ring]').evaluate_all('(es)=>es.map(e=>e.dataset.direction)'))=={'1','-1'}
    # Verify scene -> recording pose equivalence at several points in the call timeline.
    result=page.evaluate('''async()=>{
      const {recordSvg,readRecording}=await import('/src/svgPlayback.ts');
      const {analyzeCSource}=await import('/src/analysis.ts');
      const {buildTimeline}=await import('/src/playback.ts');
      const {samples}=await import('/src/sample.ts');
      const timeline=buildTimeline(await analyzeCSource(samples['dijkstra.c']));
      window.testTimeline=timeline;return {duration:timeline.duration,count:timeline.events.length};
    }''')
    for step in [0,5,15,result['count']-1,-1]:
        page.get_by_label('演示进度').fill(str(max(0,step)))
        if step==-1:
            page.get_by_role('button',name='▷ 演示').click()
            page.wait_for_timeout(250)
            page.get_by_role('button',name='Ⅱ 暂停',exact=True).click()
        checked=page.evaluate('''async()=>{
          const {recordSvg,readRecording}=await import('/src/svgPlayback.ts');
          const source=document.querySelector('.scene-wrap svg');
          const time=JSON.parse(source.querySelector('metadata').textContent).time;
          const svg=recordSvg(source,window.testTimeline,time);
          const recording=readRecording(new XMLSerializer().serializeToString(svg));
          const selectors=['[data-function-ring]','[data-feature-field]','[data-satellite-result]','[data-result-core]','[data-ring-container]','[data-magic-hand]'];
          for(const selector of selectors){
            const a=[...source.querySelectorAll(selector)],b=[...recording.svg.querySelectorAll(selector)];
            if(a.length!==b.length)return false;
            for(let i=0;i<a.length;i++){
              const numbers=e=>(e.getAttribute('transform')||'').match(/-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?/gi)?.map(Number)||[];
              const aa=numbers(a[i]),bb=numbers(b[i]);
              if(aa.some((x,j)=>Math.abs(x-bb[j])>1e-6))return {selector,aa,bb};
            }
          }
          return true;
        }''')
        assert checked is True,checked
    # Export actual UI SVG, then import with no source reconstruction.
    page.get_by_label('演示进度').fill('15')
    with page.expect_download() as pending:
        page.get_by_role('button',name='↓ SVG',exact=True).click()
    exported=base/'outputs'/'dijkstra-replay.svg'
    pending.value.save_as(exported)
    page.get_by_label('导入 SVG 动画文件').set_input_files(exported)
    expect(page.get_by_label('SVG 动画播放器')).to_be_visible()
    page.get_by_role('button',name='回到起点').click()
    ring=page.locator('[data-function-ring]').first
    before=ring.get_attribute('transform')
    page.get_by_role('button',name='▷ 播放 SVG').click()
    page.wait_for_timeout(300)
    assert ring.get_attribute('transform')!=before
    page.get_by_role('button',name='Ⅱ 暂停',exact=True).click()
    held=ring.get_attribute('transform')
    page.wait_for_timeout(120)
    assert ring.get_attribute('transform')==held
    page.get_by_label('SVG 播放速度').select_option('2')
    page.get_by_label('SVG 播放时间').fill('10')
    assert ring.get_attribute('transform')!=held
    page.screenshot(path=str(base/'test-results'/'svg-player.png'),full_page=True)
    # Reject old/malformed versions; strip active/external SVG content before attaching.
    security=page.evaluate('''async()=>{
      const {readRecording}=await import('/src/svgPlayback.ts');
      const original=new XMLSerializer().serializeToString(document.querySelector('.svg-player svg'));
      const doc=new DOMParser().parseFromString(original,'image/svg+xml');
      const ns='http://www.w3.org/2000/svg';
      const script=doc.createElementNS(ns,'script');script.textContent='window.injected=true';doc.documentElement.append(script);
      const image=doc.createElementNS(ns,'image');image.setAttribute('href','https://example.com/track');doc.documentElement.append(image);
      doc.documentElement.setAttribute('onload','window.injected=true');
      const safe=readRecording(new XMLSerializer().serializeToString(doc)).svg;
      let rejected=0;
      for(const bad of ['<svg xmlns="http://www.w3.org/2000/svg"/>','not xml',original.replace('"version":1','"version":99')]){
        try{readRecording(bad);}catch{rejected++;}
      }
      return !safe.querySelector('script,image')&&!safe.hasAttribute('onload')&&rejected===3;
    }''')
    assert security
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'player mobile overflow'
    page.get_by_role('button',name='返回源码工作台').click()
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'workbench mobile overflow'
    assert not errors,errors
    browser.close()
print('PASS: signed directions, export/import pose roundtrip, independent replay, pause, seek, speed, invalid SVG rejection and sanitization')
