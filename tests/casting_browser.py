"""Casting UI, real local hand inference, video seek, PNG and camera cleanup.

Run with a local Vite server. Optional fixtures remain in .runtime:
  python tests/casting_browser.py --hand-image .runtime/hand-sample.jpg \
    --video .runtime/hand-video.mp4 --camera-feed .runtime/hand-camera.y4m
"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173')
parser.add_argument('--hand-image')
parser.add_argument('--video')
parser.add_argument('--camera-feed')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
out = root / 'test-results'
out.mkdir(exist_ok=True)

def alpha_area(page):
    return page.locator('.cast-canvas canvas').evaluate('''canvas => {
      const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
      const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;
      let x0=c.width,y0=c.height,x1=0,y1=0,count=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>12){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;}
      return count?(x1-x0)*(y1-y0):0;
    }''')

def alpha_sum(page):
    return page.locator('.cast-canvas canvas').evaluate('''canvas => {
      const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;
      const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);
      const d=ctx.getImageData(0,0,c.width,c.height).data;
      let sum=0;for(let i=3;i<d.length;i+=4)sum+=d[i];return sum;
    }''')

with sync_playwright() as p:
    flags=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']
    if args.camera_feed:
        flags.append('--use-file-for-fake-video-capture='+str(Path(args.camera_feed).resolve()))
    browser=p.chromium.launch(headless=True, executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', args=flags)
    context=browser.new_context(viewport={'width':1450,'height':1050},accept_downloads=True,permissions=['camera'])
    context.add_init_script('''window.__streams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);window.__streams.push(stream);return stream;};''')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(args.url)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('button',name='用于施法',exact=False)).to_be_enabled()
    page.get_by_role('button',name='用于施法',exact=False).click()
    expect(page.locator('.cast-canvas canvas')).to_be_visible()
    expect(page.locator('.cast-hint').first).to_contain_text('2 个空间图层')
    page.wait_for_timeout(1700)
    full=alpha_area(page)
    assert full>1000, full
    page.get_by_role('button',name='重新展开',exact=True).click()
    page.wait_for_timeout(100)
    small=alpha_area(page)
    page.wait_for_timeout(400)
    middle=alpha_area(page)
    page.wait_for_timeout(1000)
    final=alpha_area(page)
    assert small<middle<final, (small,middle,final)
    page.get_by_role('button',name='Ⅱ 暂停法阵',exact=True).click()
    page.wait_for_timeout(200)  # Allow the throttled time readout to catch up.
    frozen=page.get_by_label('法阵时间').input_value()
    page.wait_for_timeout(300)
    assert page.get_by_label('法阵时间').input_value()==frozen
    # Actual GPU pixels: alpha enhancement must exceed the old result, not just
    # brighten RGB; zero opacity must leave no rectangular texture background.
    page.get_by_role('button',name='展开与输出',exact=True).click()
    opacity=page.get_by_label('法阵不透明度',exact=True)
    expect(opacity).to_have_value('100')
    baseline=alpha_sum(page)
    opacity.fill('200')
    page.wait_for_timeout(250)
    enhanced=alpha_sum(page)
    assert enhanced>baseline*1.05, (baseline,enhanced)
    opacity.fill('25')
    page.wait_for_timeout(250)
    reduced=alpha_sum(page)
    assert 0<reduced<baseline*.4, (reduced,baseline)
    opacity.fill('0')
    page.wait_for_timeout(250)
    assert alpha_sum(page)==0
    with page.expect_download() as transparent_download:
        page.get_by_role('button',name='导出当前画面 PNG ↓',exact=True).click()
    transparent_target=out/'casting-zero-opacity.png'
    transparent_download.value.save_as(transparent_target)
    from PIL import Image
    with Image.open(transparent_target) as png:
        assert png.convert('RGB').getextrema()==((9,9),(19,19),(19,19))
    opacity.fill('150')
    page.get_by_role('button',name='空间与透视',exact=True).click()
    page.get_by_label('图层间距',exact=True).fill('1.1')
    page.get_by_label('后移图层 1',exact=True).click()
    assert page.locator('.cast-order').count()==2
    page.get_by_role('link',name='代码炼成',exact=True).click()
    expect(page.locator('.editor-host')).to_be_visible()
    page.get_by_role('link',name='施法合成',exact=True).click()
    page.get_by_role('button',name='展开与输出',exact=True).click()
    expect(page.get_by_label('法阵不透明度',exact=True)).to_have_value('150')
    page.get_by_label('法阵不透明度',exact=True).fill('100')
    page.get_by_role('button',name='空间与透视',exact=True).click()
    expect(page.get_by_label('图层间距',exact=True)).to_have_value('1.1')
    page.get_by_role('button',name='输入与素材',exact=True).click()

    if args.hand_image:
        page.get_by_label('施法媒体文件').set_input_files(args.hand_image)
        expect(page.locator('.cast-hint[role=status]')).to_contain_text('张掌施法',timeout=40000)
        page.get_by_label('显示手部关键点').check()
        expect(page.locator('.hand-debug circle').first).to_be_visible()
        assert page.locator('.hand-debug circle').count()>=21
        page.wait_for_timeout(1500)
        assert alpha_area(page)>1000
        page.get_by_role('button',name='展开与输出',exact=True).click()
        page.get_by_label('镜像画面与法阵').check()
        with page.expect_download() as download:
            page.get_by_role('button',name='导出当前画面 PNG ↓',exact=True).click()
        target=out/'casting-export.png'
        download.value.save_as(target)
        from PIL import Image
        with Image.open(target) as png, Image.open(args.hand_image) as original:
            assert png.size==original.size
        page.screenshot(path=str(out/'casting-photo.png'),full_page=True)
        page.get_by_role('button',name='输入与素材',exact=True).click()

    if args.video:
        page.get_by_label('施法媒体文件').set_input_files(args.video)
        expect(page.locator('.cast-stage video')).to_be_visible()
        page.locator('.cast-stage video').evaluate('(v)=>v.play()')
        expect(page.locator('.cast-hint[role=status]')).to_contain_text('张掌施法',timeout=40000)
        page.locator('.cast-stage video').evaluate('(v)=>{v.pause();v.currentTime=3;}')
        page.wait_for_timeout(700)
        expect(page.get_by_label('法阵时间')).to_have_value('3')
        expect(page.locator('.cast-hint[role=status]')).to_contain_text('张掌施法',timeout=20000)
        assert alpha_area(page)>1000, 'Paused seek must leave a visible spell for PNG export'
        page.locator('.cast-stage video').evaluate('(v)=>{v.currentTime=.5;}')
        page.wait_for_timeout(1000)
        expect(page.get_by_label('法阵时间')).to_have_value('0.5')
        expect(page.locator('.cast-hint[role=status]')).to_contain_text('张掌施法',timeout=20000)
        assert alpha_area(page)>1000

    page.get_by_role('button',name='开启摄像头',exact=True).click()
    expect(page.get_by_role('button',name='关闭摄像头',exact=True)).to_be_visible(timeout=20000)
    page.wait_for_function('window.__streams.length>0 && window.__streams.at(-1).getVideoTracks()[0].readyState==="live"')
    if args.camera_feed:
        expect(page.locator('.cast-hint[role=status]')).to_contain_text('张掌施法',timeout=40000)
    page.get_by_role('link',name='代码炼成',exact=True).click()
    page.wait_for_function('window.__streams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))')
    page.get_by_role('link',name='施法合成',exact=True).click()
    expect(page.get_by_role('button',name='开启摄像头',exact=True)).to_be_visible()
    # Old static SVG fallback and sanitization, without original source code.
    page.evaluate('''()=>{const original=HTMLImageElement.prototype.decode;
      HTMLImageElement.prototype.decode=async function(){await original.call(this);if(!window.__slowDecoded){window.__slowDecoded=true;await new Promise(r=>setTimeout(r,1600));}};}''')
    page.get_by_label('施法 SVG 文件').set_input_files({'name':'legacy.svg','mimeType':'image/svg+xml','buffer':b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><script>window.__svgExecuted=true</script><circle r="40" fill="none" stroke="white" stroke-width="2"/></svg>'})
    expect(page.locator('.cast-hint').first).to_contain_text('单层素材')
    first_area=0
    for _ in range(60):
        first_area=alpha_area(page)
        if first_area>0:
            break
        page.wait_for_timeout(100)
    page.wait_for_timeout(1400)
    assert not page.evaluate('window.__svgExecuted||false')
    assert alpha_area(page)>1000
    assert 0<first_area<alpha_area(page)*.5, 'Slow SVG decoding must not skip unfolding'
    page.screenshot(path=str(out/'casting-final.png'),full_page=True)
    assert not errors, errors
    print('PASS: opacity GPU pixels/export/persistence, unfolding, pagination, local hand inference, PNG, video seek, camera cleanup, static SVG sanitization')
    context.close()
    browser.close()
