import {sigils,nodeSigil} from './sigils';
import type {Fn,Node} from './analysis';
const widths=new Map<string,number>();
/** Measure the actual SVG alphabet once, not font guesses or source length. */
export function glyphWidth(key:string){
 if(widths.has(key))return widths.get(key)!;
 let width=30;
 if(typeof document!=='undefined'){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.style.cssText='position:absolute;visibility:hidden;width:100px;height:100px;pointer-events:none';
  path.setAttribute('d',sigils[key]?.path||sigils.flow.path);svg.append(path);document.body.append(svg);
  try{const box=path.getBBox();width=Math.max(8,Math.hypot(box.width,box.height));}finally{svg.remove();}
 }
 widths.set(key,width);return width;
}
export function glyphTokens(n:Node){const primary=nodeSigil(n.kind);return [primary,...(n.kind==='group'?[]:n.sigils||[]).filter(s=>s!==primary)];}
export function nodeArc(n:Node,scale=.64){return glyphTokens(n).reduce((sum,key)=>sum+glyphWidth(key)*scale+5,0)+10;}
export function compactRadius(fn:Fn,helpers:Fn[]=[]){
 const arc=fn.nodes.reduce((sum,n)=>sum+nodeArc(n),0);
 const features=fn.nodes.filter(n=>/if_|for_|while_|do_|switch_|return_|call_/.test(n.kind)).length;
 const featureMinimum=features>1?64/(2*.63*Math.sin(Math.PI/features)):80;
 const satelliteMinimum=Math.max(0,...helpers.map(f=>{
  const subArc=f.nodes.reduce((sum,n)=>sum+nodeArc(n,.38),0);
  const subRadius=Math.max(34,subArc/(Math.PI*2));
  return (subRadius+34)/.52;
 }));
 const required=Math.max(90,arc/(2*Math.PI),featureMinimum,satelliteMinimum);
 // Monotonic feasibility search. The upper bound is known feasible, then
 // converge to subpixel precision and round up, never below a constraint.
 let lo=0,hi=Math.max(128,required*2);
 for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(mid>=required)hi=mid;else lo=mid;}
 return {radius:Math.ceil(hi),arcLength:arc,featureMinimum,satelliteMinimum};
}
