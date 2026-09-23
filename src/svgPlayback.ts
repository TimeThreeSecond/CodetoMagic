import {handAngle,type Timeline} from './playback';

export type Segment={start:number;duration:number;from:number;to:number};
export type Motion={kind:'rotate';rate:number}|{kind:'orbit';rate:number;radius:number;phase:number}|{kind:'hand';rate:number;direction:number;segments:Segment[]};
export type Recording={format:'code-to-magic-motion';version:1;duration:number;time:number};
const NS='http://www.w3.org/2000/svg';

/** Embed geometry-space tracks, not C source, AST or executable script. */
export function recordSvg(svg:SVGSVGElement,timeline:Timeline,time:number){
 const clone=svg.cloneNode(true) as SVGSVGElement;
 clone.setAttribute('width','1680');clone.setAttribute('height','1460');clone.removeAttribute('style');
 const meta=document.createElementNS(NS,'metadata');meta.id='magic-playback';
 meta.textContent=JSON.stringify({format:'code-to-magic-motion',version:1,duration:timeline.duration,time} satisfies Recording);
 clone.append(meta);
 for(const container of clone.querySelectorAll('[data-ring-container]')){
  const id=container.getAttribute('data-function-id');
  const angles=JSON.parse(container.getAttribute('data-node-angles')||'{}') as Record<string,number>;
  const ring=container.querySelector('[data-function-ring]')!;
  const direction=Number(container.getAttribute('data-direction'));
  const rate=direction*360/Number(ring.getAttribute('data-period'));
  const segments=timeline.events.filter(e=>e.fnId===id&&e.kind==='move').map(e=>({start:e.start,duration:e.duration,from:angles[e.fromId||'']??-90,to:angles[e.nodeId]??-90}));
  container.querySelector('[data-magic-hand]')?.setAttribute('data-motion',JSON.stringify({kind:'hand',rate,direction,segments} satisfies Motion));
  container.removeAttribute('data-node-angles');
 }
 // Selection edges are transient editor UI, not part of a portable recording.
 clone.querySelectorAll('[data-call-edge]').forEach(e=>e.remove());
 clone.querySelectorAll('[tabindex],[role="button"]').forEach(e=>{e.removeAttribute('tabindex');e.removeAttribute('role');});
 return clone;
}

export function motionTransform(m:Motion,time:number){
 if(m.kind==='orbit'){
  const a=(m.phase+time*m.rate)*Math.PI/180;
  return `translate(${Math.cos(a)*m.radius} ${Math.sin(a)*m.radius})`;
 }
 let angle=time*m.rate;
 if(m.kind==='hand'){
  let lo=0,hi=m.segments.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(m.segments[mid].start<=time)lo=mid+1;else hi=mid;}
  const s=m.segments[lo-1];
  angle+=s?handAngle(s.from,s.to,(time-s.start)/s.duration,m.direction):-90;
 }
 return `rotate(${angle})`;
}

function validateMotion(value:unknown):Motion {
 const m=value as Motion;
 const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<1e9;
 if(!m||!finite(m.rate))throw new Error('无效的旋转轨迹');
 if(m.kind==='rotate')return m;
 if(m.kind==='orbit'&&finite(m.radius)&&m.radius>=0&&finite(m.phase))return m;
 if(m.kind==='hand'&&(m.direction===1||m.direction===-1)&&Array.isArray(m.segments)&&m.segments.length<=6000){
  let end=0;
  for(const s of m.segments){
   if(!s||![s.start,s.duration,s.from,s.to].every(finite)||s.start<end||s.duration<=0)throw new Error('无效的表针时间轨迹');
   end=s.start+s.duration;
  }
  return m;
 }
 throw new Error('不支持的动画轨迹');
}

// Rebuild a restricted SVG tree. Never inject untrusted SVG HTML or run its scripts.
const elements=new Set('svg g path circle ellipse rect line polyline polygon text title desc metadata defs filter feGaussianBlur feMerge feMergeNode'.split(' '));
const attributes=new Set('id viewBox width height x y x1 x2 y1 y2 cx cy r rx ry d points transform fill fill-opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray opacity font-family font-size text-anchor pointer-events vector-effect filter stdDeviation result in'.split(' '));
export function readRecording(text:string){
 if(text.length>20_000_000)throw new Error('SVG 超过 20 MB');
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg'||doc.documentElement.namespaceURI!==NS)throw new Error('不是有效的 SVG 文件');
 const raw=doc.querySelector('metadata[id="magic-playback"]')?.textContent;
 if(!raw)throw new Error('这个 SVG 没有播放轨迹。旧版静态 SVG 需要从 C 文件重新导出。');
 const data=JSON.parse(raw) as Recording;
 if(data.format!=='code-to-magic-motion'||data.version!==1)throw new Error('不支持的 SVG 播放格式版本');
 if(!Number.isFinite(data.duration)||data.duration<0||data.duration>10000||!Number.isFinite(data.time)||data.time<0||data.time>data.duration)throw new Error('无效的播放时长');
 const tracks:{element:Element;motion:Motion}[]=[];
 let count=0,segments=0;
 function copy(el:Element):Element|null {
  if(++count>100000)throw new Error('SVG 节点数量过多');
  if(!elements.has(el.localName)||el.namespaceURI!==NS)return null;
  const out=document.createElementNS(NS,el.localName);
  for(const a of el.attributes){
   if(!(attributes.has(a.name)||a.name.startsWith('data-')))continue;
   if(a.name==='data-motion')continue;
   if(a.name==='filter'&&!/^url\(#[\w-]+\)$/.test(a.value))continue;
   if(/url\s*\(/i.test(a.value)&&a.name!=='filter')continue;
   out.setAttribute(a.name,a.value);
  }
  const rawMotion=el.getAttribute('data-motion');
  if(rawMotion){
   const motion=validateMotion(JSON.parse(rawMotion));
   segments+=motion.kind==='hand'?motion.segments.length:0;
   if(segments>6000)throw new Error('播放事件过多');
   tracks.push({element:out,motion});out.setAttribute('data-motion',JSON.stringify(motion));
  }
  for(const child of el.childNodes){
   if(child.nodeType===Node.ELEMENT_NODE){const c=copy(child as Element);if(c)out.append(c);}
   else if(child.nodeType===Node.TEXT_NODE)out.append(document.createTextNode(child.textContent||''));
  }
  return out;
 }
 const svg=copy(doc.documentElement) as SVGSVGElement;
 if(!tracks.length)throw new Error('SVG 中没有可播放的图形轨迹');
 svg.style.width='100%';svg.style.height='100%';
 svg.setAttribute('role','img');svg.setAttribute('aria-label','导入的魔法阵动画');
 const seek=(time:number)=>{
  const t=Math.max(0,Math.min(data.duration,time));
  for(const {element,motion} of tracks)element.setAttribute('transform',motionTransform(motion,t));
 };
 seek(data.time);
 return {svg,data,seek};
}
