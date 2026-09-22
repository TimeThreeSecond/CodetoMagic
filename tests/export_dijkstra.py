from pathlib import Path
import hashlib
from playwright.sync_api import sync_playwright, expect

base = Path(__file__).resolve().parent.parent
out = base / 'outputs'
out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page = browser.new_page(viewport={'width':1600,'height':1200}, accept_downloads=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:5173')
    page.wait_for_load_state('networkidle')
    expect(page.locator('.code-footer')).to_contain_text('已同步')
    expect(page.locator('details code')).to_have_text(hashlib.sha256((base/'examples/dijkstra.c').read_bytes()).hexdigest())
    assert page.locator('g[data-layer]').count() == 2
    assert page.locator('[data-satellite="true"]').count() == 2
    assert page.locator('[data-layer]').filter(has=page.locator('[data-function-ring="dijkstra"]')).locator('[data-satellite="true"] [data-function-ring="closest_vertex"]').count() == 1
    assert page.locator('[data-layer]').filter(has=page.locator('[data-function-ring="main"]')).locator('[data-satellite="true"] [data-function-ring="print_path"]').count() == 1
    assert len(set(page.locator('[data-motif]').evaluate_all('(els)=>els.map(e=>e.dataset.motif)'))) >= 2
    assert page.locator('[data-call-edge]').count() == 0
    assert page.locator('[data-result-core="path"]').count() == 1
    assert page.locator('[data-ring-container="main"] text').text_content() == '中环'
    assert page.locator('[data-ring-container="closest_vertex"] [data-frame-kind="number"]').count() == 1
    assert page.locator('[data-ring-container="dijkstra"] [data-frame-kind="path"]').count() == 1
    assert page.locator('[data-contour="primary"]').count() == 4
    radii=page.locator('[data-satellite="false"] [data-radius]').evaluate_all('(els)=>els.map(e=>({name:e.dataset.functionRing,r:+e.dataset.radius}))')
    print('Compact radii:',radii)
    assert max(r['r'] for r in radii) < 330
    assert page.locator('[data-satellite="true"] text').count() == 0
    assert page.locator('[data-ring-container="closest_vertex"] [data-satellite-result="number"]').count() == 1
    assert page.locator('[data-ring-container="print_path"] [data-satellite-result="path"]').count() == 1
    assert min(page.locator('[data-feature-size]').evaluate_all('(els)=>els.map(e=>+e.dataset.featureSize)')) > 18
    page.get_by_label('层间距离').fill('420')
    separation=page.locator('[data-layer]').evaluate_all('(els)=>els.map(e=>e.transform.baseVal.consolidate().matrix.f)')
    assert abs(separation[0]-separation[1]) == 420
    page.get_by_label('层间距离').fill('160')
    for period in ['7','25','18']:
        page.get_by_label('副环公转周期').fill(period)
        orbits=page.locator('[data-orbit-period]').evaluate_all('(els)=>els.map(e=>+e.dataset.orbitPeriod)')
        assert all(7<=p<=25 for p in orbits)
    assert page.locator('[data-sigil="for"]').count() > 0
    assert page.locator('[data-sigil="if"]').count() > 0
    periods = page.locator('g[data-layer]').evaluate_all('(els)=>els.map(e=>+e.dataset.period)')
    assert min(periods) == 3 and max(periods) == 20
    async_metadata = page.locator('.scene-wrap metadata').text_content()
    for mode, label in [('stack','立体叠层'), ('front','正视重叠'), ('single','单层蓝本')]:
        page.get_by_role('button',name=label,exact=True).click()
        if mode == 'single':
            page.locator('.layer-row').filter(has_text='dijkstra').get_by_role('button',name='单独查看').click()
            assert page.locator('g[data-layer]').count() == 1
            assert page.locator('[data-result-core]').count() == 0
        if mode != 'stack':
            assert all(t == 'translate(0 0) scale(1 1)' for t in page.locator('g[data-layer]').evaluate_all('(els)=>els.map(e=>e.getAttribute("transform"))'))
        for ext in ['SVG','PNG']:
            with page.expect_download() as result:
                page.get_by_role('button',name='↓ '+ext).click()
            result.value.save_as(out / f'dijkstra-{mode}.{ext.lower()}')
    page.get_by_role('button',name='立体叠层',exact=True).click()
    count=page.locator('g[data-layer]').count()
    page.locator('.layer-row input').first.uncheck()
    assert page.locator('g[data-layer]').count() == count-1
    page.locator('.layer-row input').first.check()
    ring=page.locator('[data-function-ring]').first
    initial=ring.get_attribute('transform')
    satellite=page.locator('[data-satellite="true"]').first
    initial_orbit=satellite.get_attribute('transform')
    page.get_by_role('button',name='▷ 演示').click()
    page.wait_for_timeout(300)
    assert ring.get_attribute('transform') != initial
    assert satellite.get_attribute('transform') != initial_orbit
    cores=page.locator('[data-result-core]').evaluate_all('(els)=>els.map(e=>({period:e.dataset.innerPeriod,transform:e.getAttribute("transform")}))')
    assert len({c['transform'] for c in cores}) == 1
    assert all(c['period']=='12' for c in cores)
    page.get_by_role('button',name='Ⅱ 暂停').click()
    stopped=ring.get_attribute('transform')
    stopped_orbit=satellite.get_attribute('transform')
    page.wait_for_timeout(150)
    assert ring.get_attribute('transform') == stopped
    assert satellite.get_attribute('transform') == stopped_orbit
    # Each main ring remains locally legible. Freely separated planes may
    # cross in projection, so inter-layer overlaps are intentionally allowed.
    def assert_main_clear():
        collisions=page.locator('[data-satellite="false"] [data-sigil] path').evaluate_all('''els=>{
          const boxes=els.map(e=>e.getBoundingClientRect());let collisions=[];
          for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
            if(els[i].closest('[data-layer]')!==els[j].closest('[data-layer]'))continue;
            const a=boxes[i],b=boxes[j];
            if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5)collisions.push([els[i].parentElement.dataset.sigil,els[j].parentElement.dataset.sigil,els[i].parentElement.dataset.tokenAngle,els[j].parentElement.dataset.tokenAngle]);
          }return collisions;
        }''')
        assert not collisions, collisions
    for tilt in ['0.25','0.57','1']:
        page.get_by_label('透视倾角').fill(tilt)
        assert_main_clear()
    page.get_by_label('透视倾角').fill('0.57')
    page.get_by_role('button',name='▷ 演示').click()
    for _ in range(4):
        page.wait_for_timeout(250)
        assert_main_clear()
    page.get_by_role('button',name='Ⅱ 暂停').click()
    page.get_by_label('最终结果类型').select_option('number')
    assert page.locator('[data-result-core="number"]').count() == 1
    assert page.locator('[data-ring-container="main"] [data-frame-kind="number"]').count() == 1
    assert page.locator('[data-ring-container="dijkstra"] [data-frame-kind="path"]').count() == 1
    page.get_by_label('最终结果类型').select_option('auto')
    page.screenshot(path=str(out/'dijkstra-workbench.png'),full_page=True)
    # Two straight-line functions must share one layer and distinct radii.
    result=page.evaluate('''async()=>{
      const {analyzeCSource}=await import('/src/analysis.ts');
      const {buildPlanes,radialPeriod}=await import('/src/planes.ts');
      const m=await analyzeCSource('int add(int a,int b){return a+b;} int square(int x){return x*x;} int main(void){return add(square(2),3);}');
      return buildPlanes(m).map(p=>({count:p.functions.length,periods:[...p.functions.map((_,i)=>radialPeriod(p.period,i)),radialPeriod(p.period,5)]}));
    }''')
    assert any(p['count']==2 for p in result)
    assert all(max(p['periods'])-min(p['periods'])<=5 for p in result)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
print('PASS: Dijkstra exports, colored layers, front/single projections, visibility, rotation, pause, simple grouping, mobile overflow.')
