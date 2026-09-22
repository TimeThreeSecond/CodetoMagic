from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page()
    page.goto('http://127.0.0.1:5173')
    page.wait_for_load_state('networkidle')
    results=page.evaluate('''async () => {
      const {analyzeCSource}=await import('/src/analysis.ts');
      const check=(x,m)=>{if(!x)throw new Error(m)};
      const source='int gcd(int a,int b){while(b){int r=a%b;a=b;b=r;}return a;} int main(){return gcd(252,105);}';
      const a=await analyzeCSource(source),b=await analyzeCSource(source);
      check(JSON.stringify(a)===JSON.stringify(b),'deterministic analysis');
      const formatted=await analyzeCSource('// note\\n'+source.replaceAll(';',';\\n'));
      check(a.semanticHash===formatted.semanticHash,'format semantic stability');
      check(a.sourceHash!==formatted.sourceHash,'format fingerprint changes');
      const renamed=await analyzeCSource(source.replaceAll(/\\ba\\b/g,'left').replaceAll(/\\bb\\b/g,'right'));
      check(a.semanticHash===renamed.semanticHash,'rename structure stability');
      const changed=await analyzeCSource(source.replace('while(b)','if(b)'));
      check(a.semanticHash!==changed.semanticHash,'control mutation changes structure');
      check(a.functions.find(f=>f.name==='gcd').nodes.some(n=>n.kind==='while_statement'),'loop detected');
      check(a.functions.every(f=>f.reachable),'call reachability');
      const dead=await analyzeCSource('int dead(){return 9;} int main(){return 0;}');
      check(!dead.functions.find(f=>f.name==='dead').reachable,'unvisited function');
      const recursive=await analyzeCSource('int f(int n){if(n)return f(n-1);return 1;}');
      check(recursive.trace.length<30,'recursive traversal bounded');
      const broken=await analyzeCSource('int main(){int x = ; return 0;}');
      check(broken.diagnostics.length>0,'partial error diagnostics');
      const unicode='// 中文🌙\\nint main(){return 42;}';
      const u=await analyzeCSource(unicode);const ret=u.functions[0].nodes.find(n=>n.kind==='return_statement');
      check(unicode.slice(ret.range.start,ret.range.end)==='return 42;','UTF-16 range');
      const ptr=await analyzeCSource('int main(){int product=2*3;int **pointer;return product;}');
      const decls=ptr.functions[0].nodes.filter(n=>n.kind==='declaration');
      check(decls[0].pointers===0 && decls[1].pointers===2,'declarator pointer levels');
      const empty=await analyzeCSource('');check(empty.functions.length===0,'empty input');
      return 'PASS: deterministic analysis, formatting, renaming, control changes, reachability, recursion, diagnostics, Unicode, empty input';
    }''')
    print(results)
    browser.close()
