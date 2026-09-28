import type {Model,Fn,Node} from './analysis';
import {calledFunction,entryFunction} from './analysis';
import {nodeSigil} from './sigils';
import {compactRadius,nodeArc,glyphWidth} from './compactLayout';
export type ViewMode='stack'|'front'|'single';
export type Satellite={fn:Fn;ownerId:string};
export type Plane={id:string;name:string;functions:Fn[];satellites:Satellite[];color:string;period:number};
export const CORE_PERIOD=12;
export function layerColor(index:number){return ['#81e4cf','#edbd79','#9ebcff','#e6a0c6','#bade84','#bdabf1'][index]||`hsl(${(index*137.508)%360} 65% 72%)`;}
export function isSimple(fn:Fn,model:Model){return fn.id!=='globals'&&fn.nodes.length<=12&&!fn.nodes.some(n=>/if_|switch_|case_|for_|while_|do_|goto_|try_|except_/.test(n.kind)||calledFunction(model,n));}
export function buildPlanes(model:Model):Plane[]{
 const ordered=[...model.functions].sort((a,b)=>Number(a.reachable)-Number(b.reachable)||a.order-b.order);
 // Small, uniquely-owned leaf helpers become satellites. Shared callees and
 // recursion stay independent; every source node is retained exactly once.
 const owners=new Map<string,string>(),entry=entryFunction(model);
 for(const fn of ordered){
  const callers=ordered.filter(f=>f.nodes.some(n=>calledFunction(model,n)?.id===fn.id));
  const internal=fn.nodes.some(n=>calledFunction(model,n));
  if(fn.id!=='globals'&&fn.id!==entry?.id&&!isSimple(fn,model)&&!internal&&callers.length===1&&callers[0]!==fn&&fn.nodes.length<=18&&fn.nodes.length<callers[0].nodes.length*.85)owners.set(fn.id,callers[0].id);
 }
 const roots=ordered.filter(f=>!owners.has(f.id)),simple=roots.filter(f=>isSimple(f,model));
 const planes:Plane[]=[];let added=false;
 for(const fn of roots){
  if(simple.includes(fn)&&added)continue;
  const functions=simple.includes(fn)?simple:[fn];if(simple.includes(fn))added=true;
  planes.push({id:simple.includes(fn)?'simple':fn.id,name:functions.length>1?'简单函数共面':fn.id===entry?.id?`中环 · ${fn.name}`:fn.name,functions,satellites:ordered.filter(f=>functions.some(root=>root.id===owners.get(f.id))).map(f=>({fn:f,ownerId:owners.get(f.id)!})),color:'',period:12});
 }
 return planes.map((p,i)=>({...p,color:layerColor(i),period:planes.length===1?12:3+Math.round(i*17/(planes.length-1))}));
}
export function radialPeriod(base:number,index:number){const p=Math.min(20,Math.max(3,base));return p>15?p-index%6:p+index%6;}
export function rotationAt(time:number,period:number){return time/Math.max(3,period)*360;}
export function layerProjection(index:number,count:number,mode:ViewMode,tilt:number,spacing:number){return {y:mode==='stack'?((count-1)/2-index)*Math.max(0,Math.min(420,spacing)):0,scaleY:mode==='stack'?tilt:1};}
export function orbitalPeriod(base:number,index:number){return Math.min(25,Math.max(7,base+index*3));}
export function inferFunctionResultKind(fn:Fn):ResultKind{
 if(/path|dijkstra|shortest/i.test(fn.name))return 'path';
 if(/bool|_Bool/.test(fn.returnType||''))return 'decision';
 if(/\bstr\b/.test(fn.returnType||''))return 'text';
 if(/\b(list|tuple|dict|set|Sequence|Iterable|Iterator)\b/.test(fn.returnType||''))return 'collection';
 if(/int|float|double|long|short|size_t/.test(fn.returnType||''))return 'number';
 if(fn.nodes.some(n=>n.family==='string'||n.family==='io'))return 'text';
 return 'unknown';
}
export function tokensFor(n:Node){const primary=nodeSigil(n.kind);return [primary,...(n.kind==='group'?[]:n.sigils||[]).filter(s=>s!==primary)];}
export function tokenLayout<T extends Node>(nodes:T[],radius:number,minimumPitch=17){
 const weights=nodes.map(n=>nodeArc(n));
 const total=weights.reduce((a,b)=>a+b,0)||1;let cursor=0;
 return nodes.map((n,i)=>{const width=weights[i]/total*360,start=-90+cursor/total*360;cursor+=weights[i];const tokens=tokensFor(n);let used=5;return {node:n,angle:start+width/2,tokens:tokens.map(token=>{const cell=glyphWidth(token)*.64+5,angle=start+(used+cell/2)/total*360;used+=cell;return {token,angle};}),pitch:2*Math.PI*radius/total*minimumPitch};});
}
export function preferredRadius(fn:Fn){return compactRadius(fn).radius;}
export function mainRadii(planes:Plane[]){
 const functions=planes.flatMap(p=>p.functions).sort((a,b)=>preferredRadius(a)-preferredRadius(b)||a.order-b.order);
 const result=new Map<string,number>();let previous=0;
 for(const fn of functions){const helpers=planes.flatMap(p=>p.satellites.filter(s=>s.ownerId===fn.id).map(s=>s.fn));const fitted=compactRadius(fn,helpers);const radius=Math.ceil(Math.max(fitted.radius,previous?previous+64:0));result.set(fn.id,radius);previous=radius;}
 return result;
}
export function safeLayerSpacing(planes:Plane[],radii:Map<string,number>,tilt:number,requested:number){
 let limit=requested;
 const bands=planes.flatMap((p,index)=>p.functions.map(f=>({index,r:radii.get(f.id)!,control:f.nodes.some(n=>/if_|for_|while_|do_|switch_/.test(n.kind))})));
 for(const a of bands)for(const b of bands){
  if(a.index===b.index)continue;
  const gaps=[Math.abs(a.r-b.r)-40];
  if(a.control)gaps.push(Math.abs(a.r*.82-b.r)-44);
  if(b.control)gaps.push(Math.abs(a.r-b.r*.82)-44);
  limit=Math.min(limit,Math.max(0,Math.min(...gaps))*.7*tilt/Math.abs(a.index-b.index));
 }
 return limit;
}
export type ResultKind='path'|'number'|'text'|'collection'|'decision'|'unknown';
export const resultSeals:Record<ResultKind,{label:string;path:string}>={
 path:{label:'路径 / 距离',path:'M-18 12 L-7 -10 L7 7 L19 -13 M-21 9 l6 0 l0 6 l-6 0 Z M-10 -13 h6 v6 h-6 Z M4 4 h6 v6 h-6 Z M16 -16 h6 v6 h-6 Z'},
 number:{label:'数值',path:'M0 -20 V20 M-12 -13 H12 M-17 -5 H17 M-17 5 H17 M-12 13 H12'},
 text:{label:'文本',path:'M-17 -17 H17 M-17 -17 V17 H17 M-9 -7 H11 M-9 1 H16 M-9 9 H6'},
 collection:{label:'序列 / 集合',path:'M-19 -15 H-13 V15 H-19 M19 -15 H13 V15 H19 M-8 -8 H-1 V-1 H-8 Z M3 3 H10 V10 H3 Z M3 -8 H10 V-1 H3 Z M-8 3 H-1 V10 H-8 Z'},
 decision:{label:'判定',path:'M0 -22 L21 0 L0 22 L-21 0 Z M-11 0 L-3 8 L12 -9'},
 unknown:{label:'未分类',path:'M0 -20 L17 -10 V10 L0 20 L-17 10 V-10 Z M0 -10 V4 M0 10 V12'}
};
export function inferResultKind(model:Model):ResultKind{
 if(model.functions.some(f=>/dijkstra|shortest|print_path|find_path/i.test(f.name)))return 'path';
 if(model.functions.some(f=>f.nodes.some(n=>n.family==='string')))return 'text';
 if(model.functions.some(f=>/gcd|sum|factorial|count/i.test(f.name)))return 'number';
 if(model.language==='python'){const entry=entryFunction(model);if(entry)return inferFunctionResultKind(entry);}
 return 'unknown';
}
export function motif(kind:string){
 if(kind==='if_statement')return {name:'branch-diamond',path:'M0 -18 L19 0 L0 18 L-19 0 Z'};
 if(kind==='switch_statement')return {name:'selection-hexagon',path:'M-10 -18 H10 L21 0 L10 18 H-10 L-21 0 Z'};
 if(kind==='for_statement')return {name:'counted-square',path:'M-17 -17 H17 V17 H-17 Z M-21 -9 V-21 H-9 M9 21 H21 V9'};
 if(kind==='while_statement')return {name:'conditional-lens',path:'M0 -21 Q33 0 0 21 Q-33 0 0 -21 Z'};
 return {name:'postcondition-triangle',path:'M0 -21 L21 16 H-21 Z'};
}
