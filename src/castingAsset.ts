import {readRecording} from './svgPlayback';
const NS='http://www.w3.org/2000/svg';
export function castingAsset(text:string){
 const recording=readRecording(text,true),svg=recording.svg;
 const groups=Array.from(svg.querySelectorAll<SVGGElement>('[data-layer]'));
 if(groups.length>64)throw new Error('施法素材最多支持 64 个独立图层，请先减少图层。');
 // Entry core is the nearest layer; keep original order for the remaining layers.
 groups.sort((a,b)=>Number(!!b.querySelector('[data-result-core]'))-Number(!!a.querySelector('[data-result-core]')));
 const box=(svg.getAttribute('viewBox')||'0 0 1000 1000').trim().split(/[ ,]+/).map(Number);
 if(box.length!==4||!box.every(Number.isFinite)||box[2]<=0||box[3]<=0)throw new Error('SVG 画布范围无效');
 const radii=Array.from(svg.querySelectorAll('[data-satellite="false"] [data-radius]')).map(e=>Number(e.getAttribute('data-radius'))).filter(Number.isFinite);
 const bound=radii.length?Math.max(...radii)+120:Math.max(box[2],box[3])/2;
 const layers=(groups.length?groups:[svg]).map((element,i)=>({element,id:element.getAttribute('data-layer')||'single',name:Array.from(element.querySelectorAll('[data-satellite="false"]')).map(e=>e.getAttribute('data-ring-container')).join(' / ')||`图层 ${i+1}`}));
 function frame(time:number,index:number){
  recording.seek(time);
  const root=document.createElementNS(NS,'svg');root.setAttribute('xmlns',NS);
  root.setAttribute('viewBox',groups.length?`${-bound} ${-bound} ${bound*2} ${bound*2}`:box.join(' '));
  root.setAttribute('width','1024');root.setAttribute('height','1024');
  const defs=svg.querySelector('defs');if(defs)root.append(defs.cloneNode(true));
  const node=layers[index].element.cloneNode(true) as Element;
  if(groups.length)node.removeAttribute('transform');
  if(node.localName==='svg'){for(const child of Array.from(node.children))root.append(child);}else root.append(node);
  root.querySelectorAll('metadata,[data-call-edge],title').forEach(e=>e.remove());
  root.querySelectorAll('[fill="#091313"]').forEach(e=>e.setAttribute('fill','none'));
  root.querySelectorAll('[filter]').forEach(e=>e.removeAttribute('filter'));
  return new XMLSerializer().serializeToString(root);
 }
 return {layers,duration:recording.data.duration,start:recording.data.time,single:!groups.length,frame};
}
export type CastingAsset=ReturnType<typeof castingAsset>;
