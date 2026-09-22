from pathlib import Path
from playwright.sync_api import sync_playwright, expect

base=Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page(viewport={'width':1600,'height':1200})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:5173')
    page.wait_for_load_state('networkidle')
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    assert page.locator('[data-magic-hand="hour"]').count()==1
    assert page.locator('[data-magic-hand="second"]').count()==2
    assert page.locator('[data-magic-hand="minute"]').count()==0
    events=page.evaluate('''async()=>{
      const {analyzeCSource}=await import('/src/analysis.ts');const {buildTimeline}=await import('/src/playback.ts');const {samples}=await import('/src/sample.ts');
      const m=await analyzeCSource(samples['dijkstra.c']);return buildTimeline(m).events.map((e,i)=>({i,name:m.functions.find(f=>f.id===e.fnId).name,kind:e.kind}));
    }''')
    child=next(e['i'] for e in events if e['name']=='dijkstra')
    leaf=next(e['i'] for e in events if e['name']=='closest_vertex')
    after=next(e['i'] for e in events if e['name']=='main' and e['i']>leaf)
    slider=page.get_by_label('演示进度')
    def hand(name): return page.locator(f'[data-hand-function="{name}"]')
    def angle(name): return float(hand(name).get_attribute('data-hand-angle'))
    def ring_angle(name): return page.locator(f'[data-function-ring="{name}"]').get_attribute('transform')
    def relative_angle(name):
        return hand(name).evaluate('''h=>{
          const ring=h.closest('[data-ring-container]').querySelector('[data-function-ring]');
          return +h.dataset.handAngle-parseFloat(ring.getAttribute('transform').slice(7));
        }''')
    slider.fill(str(child))
    assert page.locator('[data-magic-hand="minute"]').count()==1
    main_before=relative_angle('main');main_world_before=angle('main');minute_before=angle('dijkstra')
    main_ring_before=ring_angle('main')
    page.get_by_role('button',name='▷ 演示').click()
    page.wait_for_timeout(250)
    assert abs(relative_angle('main')-main_before)<1e-7
    assert angle('main')!=main_world_before
    assert ring_angle('main')!=main_ring_before
    assert angle('dijkstra')!=minute_before
    page.get_by_role('button',name='Ⅱ 暂停').click()
    held=angle('dijkstra');page.wait_for_timeout(150);assert angle('dijkstra')==held
    slider.fill(str(leaf))
    held_main=relative_angle('main');held_minute=relative_angle('dijkstra');second=angle('closest_vertex')
    minute_ring_before=ring_angle('dijkstra')
    page.get_by_role('button',name='▷ 演示').click()
    samples=page.evaluate('''async()=>{const values=[];for(let i=0;i<10;i++){await new Promise(requestAnimationFrame);values.push(+document.querySelector('[data-hand-function="closest_vertex"]').dataset.handAngle);}return values;}''')
    assert len(set(samples))>=3, samples
    assert all(abs((b-a+180)%360-180)<30 for a,b in zip(samples,samples[1:]))
    assert angle('closest_vertex')!=second
    assert abs(relative_angle('main')-held_main)<1e-7 and abs(relative_angle('dijkstra')-held_minute)<1e-7
    assert ring_angle('dijkstra')!=minute_ring_before
    page.get_by_role('button',name='Ⅱ 暂停').click()
    # The exported pointer pose must match the SVG displayed in the app.
    page.screenshot(path=str(base/'outputs/dijkstra-hands-workbench.png'),full_page=True)
    slider.fill(str(after));assert page.locator('[data-magic-hand="minute"]').count()==0
    assert page.locator('[data-magic-hand="second"]').count()==2
    external_wait=next(e['i'] for e in events if e['name']=='print_path' and e['kind']=='wait')
    slider.fill(str(external_wait));held_second=relative_angle('print_path');second_world_before=angle('print_path')
    second_ring_before=ring_angle('print_path')
    page.get_by_role('button',name='▷ 演示').click();page.wait_for_timeout(100)
    assert abs(relative_angle('print_path')-held_second)<1e-7
    assert angle('print_path')!=second_world_before
    assert ring_angle('print_path')!=second_ring_before
    page.get_by_role('button',name='Ⅱ 暂停').click()
    assert page.locator('[data-node] circle[stroke]:not([stroke="none"])').count()==0
    assert hand('closest_vertex').get_attribute('data-hand-result')=='number'
    assert hand('main').get_attribute('data-hand-result')=='path'
    times=[]
    for speed in ['0.5','2']:
        slider.fill('0');page.get_by_label('演示速度').select_option(speed)
        page.get_by_role('button',name='▷ 演示').click();page.wait_for_timeout(250)
        page.get_by_role('button',name='Ⅱ 暂停').click()
        times.append(page.locator('.scene-wrap metadata').evaluate('(e)=>JSON.parse(e.textContent).time'))
    assert times[1]>times[0]*2
    assert not errors,errors
    browser.close()
print('PASS: resident hour/second hands, scoped minute, call suspension, smooth frame motion, pause, speed, result profiles, no progress circles.')
