import {useMemo} from 'react';
import type {Model,Node,Fn} from './analysis';
export const colors: Record<string,string> = {general:'#8fddcd',memory:'#e5b977',io:'#9abefa',file:'#bbacf2',string:'#b9d78e',math:'#f1acbd'};
export type Visual = Node & {members?:Node[]};
export function visibleNodes(fn:Fn, expanded:string|null, budget:number):Visual[] {
 const out:Visual[]=[]; let group:Node[]=[];
 function flush(){if(!group.length)return; const id=`group-${group[0].id}`; if(group.length===1||expanded===id)out.push(...group);else out.push({...group[0],id,kind:'group',label:`${group.length} 条顺序语句`,members:group,range:{...group[0].range,end:group.at(-1)!.range.end,endLine:group.at(-1)!.range.endLine}});group=[];}
 const aggregate=fn.nodes.length>budget;
 for(const n of fn.nodes){if(aggregate&&['declaration','expression_statement'].includes(n.kind))group.push(n);else{flush();out.push(n);}}flush();return out;
}
function path(kind:string) {
 if(kind.includes('if')||kind.includes('case')) return 'M0 -8 L7 5 L-7 5 Z M0 -3 V2';
 if(/for_|while_|do_/.test(kind))return 'M0 -9 L5 7 L-8 -3 L8 -3 L-5 7 Z';
 if(kind==='call_expression')return 'M-9 0 Q0 -11 9 0 Q0 11 -9 0 M0 -3 A3 3 0 1 0 0 3 A3 3 0 1 0 0 -3';
 if(kind==='return_statement')return 'M-7 -6 V6 L6 0 Z M9 -5 V5';
 if(kind==='group')return 'M-7 -7 H7 V7 H-7 Z M-4 -3 H4 M-4 0 H4 M-4 3 H4';
 if(kind==='ERROR')return 'M-8 -7 L-1 -1 L-5 3 M8 7 L2 1 L6 -3';
 if(kind.includes('switch')||kind.includes('struct'))return 'M0 -9 L8 -4 V5 L0 9 L-8 5 V-4 Z M-4 0 H4';
 if(kind==='declaration')return 'M0 -8 L7 0 L0 8 L-7 0 Z M0 -4 V4 M-3 0 H3';
 return 'M-6 -6 L6 6 M-6 6 L6 -6 M0 -9 V9 M-9 0 H9';
}
export function Scene({model,time,step,selected,onSelect,onHover,expanded,setExpanded,tilt,zoom,glow,svgRef}: {
 model:Model;time:number;step:number;selected:string|null;onSelect:(n:Node)=>void;onHover:(n:Node|null)=>void;expanded:string|null;setExpanded:(id:string|null)=>void;tilt:number;zoom:number;glow:boolean;svgRef:React.RefObject<SVGSVGElement|null>
}) {
 const layers=useMemo(()=>[...model.functions].sort((a,b)=>Number(a.reachable)-Number(b.reachable)||a.order-b.order),[model]);
 const active=model.trace[step];
 const points=new Map<string,{x:number;y:number;fn:Fn}>();
 const geometry=layers.map((fn,index)=>{
 const radius=215+index*Math.min(32,65/Math.max(1,layers.length-1));
  const y=50-index*Math.min(80,160/Math.max(1,layers.length-1));
  const nodes=visibleNodes(fn,expanded,Math.max(8,Math.floor(220/Math.max(1,layers.length))));
  const rotation=time*0.014*(index%2?1:-1);
  nodes.forEach((n,i)=>{const a=-Math.PI/2-i*2*Math.PI/Math.max(1,nodes.length)+rotation;const pt={x:Math.cos(a)*radius,y:y+Math.sin(a)*radius*tilt,fn}; points.set(n.id,pt);n.members?.forEach(m=>points.set(m.id,pt));});
  return {fn,index,radius,y,nodes,rotation};
 });
 const edgeList: {from:string;to:string;recursive:boolean}[]=[];
 model.functions.forEach(fn=>fn.nodes.forEach(n=>{if(n.target){const target=model.functions.find(f=>f.name===n.target);if(target?.nodes[0])edgeList.push({from:n.id,to:target.nodes[0].id,recursive:target===fn});}}));
 return <svg ref={svgRef} viewBox="-420 -330 840 660" role="img" aria-label="C 源码的同心叠层魔法阵" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
 <metadata>{JSON.stringify({fileHash:model.sourceHash,structureHash:model.semanticHash,version:1,time,step,projection:{tilt,zoom},mode:'static-structural-traversal'})}</metadata>
 <defs><filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><radialGradient id="aura"><stop offset="0" stopColor="#78ead2" stopOpacity=".10"/><stop offset="1" stopColor="#78ead2" stopOpacity="0"/></radialGradient></defs>
 <rect x="-420" y="-330" width="840" height="660" fill="#091313"/>
 <g transform={`scale(${zoom})`}>
 <ellipse rx="345" ry="265" fill="url(#aura)"/>
 <g stroke="#92c7bb" opacity=".22" fill="none" strokeWidth=".6"><circle r="313" strokeDasharray="2 8"/><path d="M-340 0H340 M0 -275V275"/>{[0,90,180,270].map(a=><path key={a} transform={`rotate(${a})`} d="M300 -8 V8 M295 0 H323"/>)}</g>
 {geometry.map(({fn,index,radius,y,nodes,rotation})=><g key={fn.id} opacity={fn.reachable?1:.4}>
  <g transform={`translate(0 ${y}) scale(1 ${tilt}) rotate(${rotation*180/Math.PI})`} fill="none" stroke="#83c9b8" strokeWidth=".8" filter={glow?'url(#glow)':undefined}>
   <circle r={radius-13} opacity=".65"/><circle r={radius+13} opacity=".65"/><circle r={radius+18} opacity=".3"/>
   {Array.from({length:128},(_,i)=>{const a=i*360/128;const size=2+parseInt(model.sourceHash[i%64],16)/2;return <path key={i} transform={`rotate(${a})`} d={`M${radius+20} 0 h${size}`} opacity=".5"/>;})}
   <path d={Array.from({length:Math.max(5,Math.min(17,nodes.length))},(_,i)=>{const n=Math.max(5,Math.min(17,nodes.length));const a=i*2*Math.PI/n-Math.PI/2,b=(i+Math.max(2,Math.floor(n*.4)))*2*Math.PI/n-Math.PI/2;return `M${Math.cos(a)*(radius-24)} ${Math.sin(a)*(radius-24)} L${Math.cos(b)*(radius-24)} ${Math.sin(b)*(radius-24)}`;}).join(' ')} opacity=".18"/>
   <circle r={radius*.36} opacity=".2"/>
  </g>
  <text x={radius+34} y={y+4} fill="#acc9be" fontFamily="monospace" fontSize="10">{String(index+1).padStart(2,'0')} / {fn.name}</text>
  {nodes.map(n=>{const p=points.get(n.id)!;const lit=n.id===active||n.members?.some(m=>m.id===active);const focus=n.id===selected||n.members?.some(m=>m.id===selected);const sub=/if_|for_|while_|do_|switch_/.test(n.kind);return <g key={n.id} transform={`translate(${p.x} ${p.y})`} role="button" tabIndex={0} aria-label={`${n.label}，第 ${n.range.line} 行`} onClick={()=>{if(n.members)setExpanded(expanded===n.id?null:n.id);onSelect(n);}} onKeyDown={e=>{if(e.key==='Enter'){if(n.members)setExpanded(n.id);onSelect(n);}}} onMouseEnter={()=>onHover(n)} onMouseLeave={()=>onHover(null)} style={{cursor:'pointer'}}>
   <circle r="14" fill="#091313" fillOpacity=".85" stroke={focus?'#fff2b6':lit?'#e8fff6':'none'} strokeWidth="1"/>
   {sub&&<><circle r="19" fill="none" stroke="#7fae9e" opacity=".6"/><circle r="22" fill="none" stroke="#7fae9e" opacity=".25"/></>}
   <path d={path(n.kind)} fill="none" stroke={n.kind==='ERROR'?'#f69b86':focus?'#fff2b6':colors[n.family]} strokeWidth={lit?2:1.1} strokeLinecap="round" strokeLinejoin="round" filter={glow?'url(#glow)':undefined}/>
   {n.pointers>0&&<text x="10" y="-10" fill="#e5b977" fontSize="8">{'◦'.repeat(Math.min(4,n.pointers))}</text>}
   {lit&&<circle r={17+Math.sin(time*4)*3} stroke="#d6ffea" fill="none" opacity=".7"/>}
  </g>;})}
 </g>)}
 <g fill="none" strokeWidth="1" stroke="#d4b780" opacity=".55">{edgeList.map((edge,i)=>{const a=points.get(edge.from),b=points.get(edge.to);if(!a||!b)return null;return <path key={i} d={edge.recursive?`M${a.x} ${a.y} c70 -90 -70 -90 0 0`:`M${a.x} ${a.y} Q0 ${Math.min(a.y,b.y)-50} ${b.x} ${b.y}`} strokeDasharray="3 5"/>;})}</g>
 <g fill="none" stroke="#c5e5c9" opacity=".7"><circle r="17"/><circle r="22" strokeDasharray="1 4"/><path d="M0 -12 L10 6 L-10 6 Z M0 12 L10 -6 L-10 -6 Z"/></g>
 </g><text x="-385" y="300" fontFamily="monospace" fontSize="9" fill="#618b7f">SEAL · {model.sourceHash.slice(0,32).toUpperCase()}</text>
 <text x="385" y="300" textAnchor="end" fontFamily="monospace" fontSize="9" fill="#618b7f">STATIC FLOW / v0.1</text>
 </svg>;
}
