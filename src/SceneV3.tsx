import type {Model,Node} from './analysis';
import {sigils} from './sigils';
import {visibleNodes} from './Scene';
import {buildPlanes,layerProjection,radialPeriod,rotationAt,mainRadii,preferredRadius,tokenLayout,orbitalPeriod,inferFunctionResultKind,CORE_PERIOD,resultSeals,type ResultKind,type ViewMode} from './planes';
import {featureLayout,Medallion,ResultCrest} from './ornaments';
import {RingFrame} from './RingFrame';
import {compactRadius} from './compactLayout';
import {samplePlayback,handAngle,type Timeline} from './playback';
import {MagicHand,type HandKind} from './MagicHand';
type Props={model:Model;timeline:Timeline;time:number;step:number;selected:string|null;onSelect:(n:Node)=>void;onHover:(n:Node|null)=>void;expanded:string|null;setExpanded:(id:string|null)=>void;tilt:number;zoom:number;glow:boolean;svgRef:React.RefObject<SVGSVGElement|null>;mode:ViewMode;hidden:string[];solo:string|null;spacing:number;resultKind:ResultKind;orbit:number};
const polar=(angle:number,radius:number)=>({x:Math.cos(angle*Math.PI/180)*radius,y:Math.sin(angle*Math.PI/180)*radius});
export function Scene({model,timeline,time,step,selected,onSelect,onHover,expanded,setExpanded,tilt,zoom,glow,svgRef,mode,hidden,solo,spacing,resultKind,orbit}:Props){
 const all=buildPlanes(model),radii=mainRadii(all),playback=samplePlayback(timeline,time),active=playback.event?.nodeId;
 const safeSpacing=spacing;
 const centerOwner=model.functions.find(f=>f.name==='main')||all[0]?.functions[0];
 const kindFor=(fn:typeof model.functions[number])=>fn.id===centerOwner?.id?resultKind:inferFunctionResultKind(fn);
 const projections=all.map((plane,index)=>({...plane,index,...layerProjection(index,all.length,mode,tilt,safeSpacing)}));
 const layers=projections.filter(l=>mode==='single'?l.id===(solo||all[0]?.id):!hidden.includes(l.id));
 const horizontal=Math.max(260,...Array.from(radii.values(),r=>r+60));
 const vertical=Math.max(220,...projections.map(l=>Math.abs(l.y)+(Math.max(...l.functions.map(f=>radii.get(f.id)!))+55)*l.scaleY+30));
 const boundY=Math.max(vertical,horizontal*730/840),boundX=boundY*840/730;
 const positions=new Map<string,{x:number;y:number}>();
 const rings=layers.flatMap(l=>{
  const main=l.functions.map((fn,index)=>({fn,radius:radii.get(fn.id)!,cx:0,cy:0,period:radialPeriod(l.period,index),satellite:false,ownerId:fn.id,orbitPeriod:0,resultType:kindFor(fn)}));
  const sub=l.satellites.map((s,index)=>{
   const ownerRadius=radii.get(s.ownerId)!,siblings=l.satellites.filter(c=>c.ownerId===s.ownerId),i=siblings.indexOf(s);
   const radius=Math.min(96,preferredRadius(s.fn)*.55,ownerRadius*.24,ownerRadius*.5*Math.sin(Math.PI/Math.max(2,siblings.length))*.8);
   const orbitPeriod=orbitalPeriod(orbit,l.index+index);
   const center=polar(25+l.index*137.508+i*360/siblings.length+rotationAt(time,orbitPeriod),ownerRadius*.48);
   return {fn:s.fn,radius,cx:center.x,cy:center.y,period:radialPeriod(l.period,index+1),satellite:true,ownerId:s.ownerId,orbitPeriod,resultType:inferFunctionResultKind(s.fn)};
  });
  return [...main,...sub].map(r=>{
   const nodes=visibleNodes(r.fn,expanded,Math.max(8,Math.floor(220/model.functions.length)));
   const layout=tokenLayout(nodes,r.radius),angle=rotationAt(time,r.period);
   layout.forEach(({node,angle:a})=>{const p=polar(a+angle,r.radius),pos={x:r.cx+p.x,y:l.y+(r.cy+p.y)*l.scaleY};positions.set(node.id,pos);node.members?.forEach(m=>positions.set(m.id,pos));});
   const angles=new Map<string,number>();layout.forEach(p=>{angles.set(p.node.id,p.angle);p.node.members?.forEach(n=>angles.set(n.id,p.angle));});
   const current=playback.event?.fnId===r.fn.id?playback.event:null;
   const held=angles.get(playback.positions[r.fn.id])??-90;
   const localAngle=current&&current.kind==='move'?handAngle(angles.get(current.fromId||'')??-90,angles.get(current.nodeId)??held,playback.progress):held;
   const handKind:HandKind=r.satellite?'second':r.fn.id===centerOwner?.id?'hour':'minute';
   const showHand=handKind!=='minute'||playback.stack.includes(r.fn.id);
   const waiting=playback.stack.includes(r.fn.id)&&(playback.activeFn!==r.fn.id||current?.kind==='wait');
   // Hold the current rune in ring-local coordinates during a call; the
   // shared ring rotation carries both the rune and its hand together.
   return {...r,plane:l,layout,angle,features:featureLayout(nodes,r.radius),handKind,showHand,waiting,handAngle:localAngle+angle};
  });
 });
 const seal=resultSeals[resultKind];
 return <svg ref={svgRef} data-view={mode} viewBox={`${-boundX} ${-boundY} ${boundX*2} ${boundY*2}`} role="img" aria-label="C 源码的主副环魔法阵" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
 <metadata>{JSON.stringify({fileHash:model.sourceHash,structureHash:model.semanticHash,version:6,time,step,mode,hidden,solo,playback:{event:playback.step,stack:playback.stack,progress:playback.progress,ended:playback.ended},result:{kind:resultKind,period:CORE_PERIOD,owner:centerOwner?.id},layout:{solver:'measured-glyph-compact-v1',functions:all.flatMap(l=>l.functions.map(f=>({name:f.name,...compactRadius(f,l.satellites.filter(s=>s.ownerId===f.id).map(s=>s.fn)),placedRadius:radii.get(f.id)})))},projection:{tilt,zoom,spacing,effectiveSpacing:safeSpacing},layers:all.map(l=>({name:l.name,color:l.color,period:l.period,functions:l.functions.map((f,i)=>({name:f.name,radius:radii.get(f.id),resultType:kindFor(f),period:radialPeriod(l.period,i)})),satellites:l.satellites.map((s,i)=>({name:s.fn.name,owner:s.ownerId,period:radialPeriod(l.period,i+1),orbitPeriod:orbitalPeriod(orbit,all.indexOf(l)+i),resultType:inferFunctionResultKind(s.fn)}))}))})}</metadata>
 <defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
 <rect x={-boundX} y={-boundY} width={boundX*2} height={boundY*2} fill="#091313"/>
 <g transform={`scale(${zoom})`}>
 {layers.map(l=><g key={l.id} data-layer={l.id} data-color={l.color} data-period={l.period} data-plane-transform={`translate(0 ${l.y}) scale(1 ${l.scaleY})`} transform={`translate(0 ${l.y}) scale(1 ${l.scaleY})`} stroke={l.color} fill="none" strokeLinecap="round" strokeLinejoin="round">
 {rings.filter(r=>r.plane.id===l.id).map(r=><g key={r.fn.id} transform={`translate(${r.cx} ${r.cy})`} data-ring-container={r.fn.name} data-owner={r.ownerId} data-satellite={r.satellite} data-orbit-period={r.orbitPeriod||undefined}>
  <title>{r.fn.name} · {r.satellite?`副环结果：${resultSeals[r.resultType].label}（启发式） · 公转 ${r.orbitPeriod}s`:`主环 · ${r.period}s`}</title>
  {r.satellite&&<circle r={r.radius+18} fill="#091313" fillOpacity=".92" stroke="none"/>}
  <g data-function-ring={r.fn.name} data-radius={r.radius} data-period={r.period} transform={`rotate(${r.angle})`} opacity={r.fn.reachable?1:.55}>
   <g filter={glow?'url(#glow)':undefined}><RingFrame kind={r.resultType} radius={r.radius} small={r.satellite} hash={model.sourceHash}/></g>
   {r.layout.map(({node:n,angle,tokens,pitch})=>{
    const p=polar(angle,r.radius),lit=n.id===active||n.members?.some(m=>m.id===active),focus=n.id===selected||n.members?.some(m=>m.id===selected);
    const scale=(r.satellite?.38:.62)*Math.min(1,pitch/17);
    return <g key={n.id} data-node={n.id} role="button" tabIndex={0} aria-label={`${n.label}，第 ${n.range.line} 行`} onClick={()=>{if(n.members)setExpanded(expanded===n.id?null:n.id);onSelect(n);}} onKeyDown={e=>{if(e.key==='Enter'){if(n.members)setExpanded(n.id);onSelect(n);}}} onMouseEnter={()=>onHover(n)} onMouseLeave={()=>onHover(null)} style={{cursor:'pointer'}}>
     <circle cx={p.x} cy={p.y} r={r.satellite?11:18} fill="#091313" fillOpacity=".01" stroke="none"/>
     {tokens.map(({token,angle:a},j)=>{const p=polar(a,r.radius);return <g key={j} data-sigil={token} data-token-angle={a} transform={`translate(${p.x} ${p.y}) rotate(${a+90}) scale(${scale})`}><title>{token} · {sigils[token]?.meaning}</title><path d={sigils[token]?.path||sigils.flow.path} stroke={n.kind==='ERROR'?'#f1988b':focus?'#fff5d4':l.color} strokeWidth="1.4" filter={glow?'url(#glow)':undefined}/></g>;})}


    </g>;
   })}
  </g>
  {!r.satellite&&<g data-feature-field={r.fn.name} transform={`rotate(${r.angle})`}>{r.features.map(f=><g key={f.node.id} data-feature-node={f.node.id} transform={`translate(${f.x} ${f.y})`} onClick={()=>onSelect(f.node)} onMouseEnter={()=>onHover(f.node)} onMouseLeave={()=>onHover(null)} style={{cursor:'pointer'}}><title>{f.node.label} · 第 {f.node.range.line} 行</title><Medallion node={f.node} size={f.size}/></g>)}</g>}
  {!r.satellite&&<text x="0" y={-(r.radius+38)} textAnchor="middle" stroke="none" fill={l.color} fontFamily="monospace" fontSize="11">{r.fn.name==='main'?'中环':r.fn.name}</text>}
  {r.satellite&&<g data-satellite-result={r.resultType} data-inner-period={CORE_PERIOD} transform={`rotate(${rotationAt(time,CORE_PERIOD)})`}><ResultCrest kind={r.resultType} radius={r.radius*.58}/></g>}
  {r.showHand&&<MagicHand kind={r.handKind} result={r.resultType} radius={r.radius} coreRadius={r.satellite?r.radius*.58:Math.min(85,Math.min(...l.functions.map(f=>radii.get(f.id)!))*.22)} length={r.radius*(r.handKind==='minute'?.72:r.handKind==='hour'?.46:.55)} angle={r.handAngle} fnName={r.fn.name} waiting={r.waiting}/>}
 </g>)}
 {l.functions.some(f=>f.id===centerOwner?.id)&&<g data-result-core={resultKind} data-inner-period={CORE_PERIOD} transform={`rotate(${rotationAt(time,CORE_PERIOD)})`} opacity=".9" strokeWidth="1"><ResultCrest kind={resultKind} radius={Math.min(85,Math.min(...l.functions.map(f=>radii.get(f.id)!))*.22)}/><title>统一结果印：{seal.label} · {CORE_PERIOD}s</title></g>}
 </g>)}
 <g fill="none" strokeWidth=".8" opacity=".45" pointerEvents="none">{rings.flatMap(r=>r.fn.nodes.map(n=>{const target=model.functions.find(f=>f.name===n.target),a=positions.get(n.id),b=target?.nodes[0]?positions.get(target.nodes[0].id):null;if(!a||!b||(target!==r.fn&&n.id!==selected))return null;return <path key={n.id} data-call-edge="true" stroke={r.plane.color} strokeDasharray="3 5" d={target===r.fn?`M${a.x} ${a.y} c70 -90 -70 -90 0 0`:`M${a.x} ${a.y} Q0 ${Math.min(a.y,b.y)-30} ${b.x} ${b.y}`}/>;}))}</g>
 {!layers.length&&<text textAnchor="middle" fill="#a3b9a6" fontSize="14">所有图层已隐藏，请在图层面板中开启。</text>}
 </g><text x={-boundX+25} y={boundY-18} fontFamily="monospace" fontSize="9" fill="#789a85">SEAL · {model.sourceHash.slice(0,32).toUpperCase()}</text><text x={boundX-25} y={boundY-18} textAnchor="end" fontFamily="monospace" fontSize="9" fill="#789a85">{mode.toUpperCase()} / C SIGILS v0.6</text>
 </svg>;
}
