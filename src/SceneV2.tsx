import type {Model,Node} from './analysis';
import {sigils,nodeSigil} from './sigils';
import {visibleNodes} from './Scene';
import {buildPlanes,layerProjection,radialPeriod,rotationAt,type ViewMode} from './planes';
type Props={model:Model;time:number;step:number;selected:string|null;onSelect:(n:Node)=>void;onHover:(n:Node|null)=>void;expanded:string|null;setExpanded:(id:string|null)=>void;tilt:number;zoom:number;glow:boolean;svgRef:React.RefObject<SVGSVGElement|null>;mode:ViewMode;hidden:string[];solo:string|null;spacing:number};
export function Scene({model,time,step,selected,onSelect,onHover,expanded,setExpanded,tilt,zoom,glow,svgRef,mode,hidden,solo,spacing}:Props){
 const all=buildPlanes(model),active=model.trace[step];
 const layers=all.map((plane,index)=>({...plane,index,...layerProjection(index,all.length,mode,tilt,spacing)})).filter(l=>mode==='single'?l.id===(solo||all[0]?.id):!hidden.includes(l.id));
 const positions=new Map<string,{x:number;y:number}>();
 const rings=layers.flatMap(l=>l.functions.map((fn,index)=>{
  const radius=l.functions.length===1?205+l.index*Math.min(32,55/Math.max(1,all.length-1)):90+(index+1)*180/l.functions.length;
  const nodes=visibleNodes(fn,expanded,Math.max(8,Math.floor(220/model.functions.length)));
  const period=radialPeriod(l.period,index),angle=rotationAt(time,period),rotation=angle*Math.PI/180;
  nodes.forEach((n,i)=>{const a=-Math.PI/2-i*Math.PI*2/nodes.length+rotation;const p={x:Math.cos(a)*radius,y:l.y+Math.sin(a)*radius*l.scaleY};positions.set(n.id,p);n.members?.forEach(m=>positions.set(m.id,p));});
  return {plane:l,fn,radius,nodes,angle,period,index};
 }));
 return <svg ref={svgRef} data-view={mode} viewBox="-420 -365 840 730" role="img" aria-label="C 源码的同心叠层魔法阵" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
 <metadata>{JSON.stringify({fileHash:model.sourceHash,structureHash:model.semanticHash,version:2,time,step,mode,hidden,solo,projection:{tilt,zoom,spacing},layers:all.map(l=>({name:l.name,color:l.color,period:l.period,functions:l.functions.map((f,i)=>({name:f.name,period:radialPeriod(l.period,i)}))}))})}</metadata>
 <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
 <rect x="-420" y="-365" width="840" height="730" fill="#091313"/>
 <g transform={`scale(${zoom})`}>
 <g fill="none" stroke="#90bba6" strokeWidth=".6" opacity=".2"><circle r="318" strokeDasharray="2 8"/><path d="M-340 0H340 M0 -330V330"/></g>
 {layers.map(l=><g key={l.id} data-layer={l.id} data-color={l.color} data-period={l.period} data-plane-transform={`translate(0 ${l.y}) scale(1 ${l.scaleY})`} transform={`translate(0 ${l.y}) scale(1 ${l.scaleY})`} stroke={l.color} fill="none" strokeLinecap="round" strokeLinejoin="round">
 {rings.filter(r=>r.plane.id===l.id).map(r=><g key={r.fn.id} data-function-ring={r.fn.name} data-period={r.period} transform={`rotate(${r.angle})`} opacity={r.fn.reachable?1:.6}>
  <g strokeWidth=".8" filter={glow?'url(#glow)':undefined}>
   <circle r={r.radius-20} opacity=".8"/><circle r={r.radius+20} opacity=".8"/><circle r={r.radius+25} opacity=".35"/>
   {Array.from({length:96},(_,i)=><path key={i} transform={`rotate(${i*360/96})`} d={`M${r.radius+26} 0 h${2+parseInt(model.sourceHash[(i+l.index*7)%64],16)/2}`} opacity=".5"/>)}
   {l.functions.length===1&&Array.from({length:Math.max(5,Math.min(17,r.nodes.length))},(_,i)=>{const count=Math.max(5,Math.min(17,r.nodes.length)),a=i*2*Math.PI/count,b=(i+Math.floor(count*.4))*2*Math.PI/count,rad=r.radius-30;return <path key={i} d={`M${Math.cos(a)*rad} ${Math.sin(a)*rad} L${Math.cos(b)*rad} ${Math.sin(b)*rad}`} opacity=".22"/>;})}
  </g>
  {r.nodes.map((n,i)=>{const angle=-90-i*360/Math.max(1,r.nodes.length),a=angle*Math.PI/180,x=Math.cos(a)*r.radius,y=Math.sin(a)*r.radius;const lit=n.id===active||n.members?.some(m=>m.id===active),focus=n.id===selected||n.members?.some(m=>m.id===selected);const primary=nodeSigil(n.kind),tokens=[primary,...(n.kind==='group'?[]:n.sigils||[]).filter(s=>s!==primary)],count=tokens.length,spread=Math.min(42,360/Math.max(1,r.nodes.length)*.8);
   return <g key={n.id} data-node={n.id} role="button" tabIndex={0} aria-label={`${n.label}，第 ${n.range.line} 行`} onClick={()=>{if(n.members)setExpanded(expanded===n.id?null:n.id);onSelect(n);}} onKeyDown={e=>{if(e.key==='Enter'){if(n.members)setExpanded(n.id);onSelect(n);}}} onMouseEnter={()=>onHover(n)} onMouseLeave={()=>onHover(null)} style={{cursor:'pointer'}}>
    <circle cx={x} cy={y} r="20" fill="#091313" fillOpacity=".1" stroke={focus?'#fff5d4':lit?l.color:'none'}/>
    {tokens.map((s,j)=>{const tokenAngle=angle+(j-(count-1)/2)*Math.min(9,spread/count),radius=r.radius+(j%2?4:-3),rad=tokenAngle*Math.PI/180;return <g key={j} data-sigil={s} transform={`translate(${Math.cos(rad)*radius} ${Math.sin(rad)*radius}) rotate(${tokenAngle+90}) scale(${j===0?.85:.6})`}><title>{s} · {sigils[s]?.meaning}</title><path d={sigils[s]?.path||sigils.flow.path} stroke={n.kind==='ERROR'?'#f1988b':focus?'#fff5d4':l.color} strokeWidth={lit?1.9:1.35} filter={glow?'url(#glow)':undefined}/></g>;})}
    {/if_|for_|while_|do_|switch_/.test(n.kind)&&l.functions.length===1&&<g transform={`translate(${x*.70} ${y*.70})`} strokeWidth=".7"><path d={`M0 0 L${x*.23} ${y*.23}`} opacity=".5"/><circle r="18"/><circle r="21" opacity=".4"/><path d={sigils[primary].path} transform="scale(.8)"/></g>}
    {lit&&<circle cx={x} cy={y} r={22+Math.sin(time*4)*2} opacity=".65"/>}
   </g>;
  })}
 </g>)}
 <g data-inner-period={radialPeriod(l.period,5)} transform={`rotate(${rotationAt(time,radialPeriod(l.period,5))})`} opacity=".6"><circle r="40"/><circle r="44" strokeDasharray="1 5"/><path d={sigils.call.path} transform="scale(2.3)"/></g>
 {rings.filter(r=>r.plane.id===l.id).map(r=><text key={r.fn.id} x="0" y={-(r.radius-37)} textAnchor="middle" stroke="none" fill={l.color} fontFamily="monospace" fontSize="10">{r.fn.name} · {r.period}s</text>)}
 </g>)}
 <g fill="none" strokeWidth=".8" opacity=".5" pointerEvents="none">{rings.flatMap(r=>r.fn.nodes.map(n=>{const target=model.functions.find(f=>f.name===n.target),a=positions.get(n.id),b=target?.nodes[0]?positions.get(target.nodes[0].id):null;if(!a||!b)return null;return <path key={n.id} data-call-edge="true" stroke={r.plane.color} strokeDasharray="3 5" d={target===r.fn?`M${a.x} ${a.y} c70 -90 -70 -90 0 0`:`M${a.x} ${a.y} Q0 ${Math.min(a.y,b.y)-30} ${b.x} ${b.y}`}/>;}))}</g>
 {!layers.length&&<text textAnchor="middle" fill="#a3b9a6" fontSize="14">所有图层已隐藏，请在图层面板中开启。</text>}
 </g><text x="-390" y="345" fontFamily="monospace" fontSize="9" fill="#789a85">SEAL · {model.sourceHash.slice(0,32).toUpperCase()}</text><text x="390" y="345" textAnchor="end" fontFamily="monospace" fontSize="9" fill="#789a85">{mode.toUpperCase()} / C SIGILS v0.2</text>
 </svg>;
}
