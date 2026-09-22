import type {ResultKind} from './planes';
import {memo} from 'react';
export const frameNames:Record<ResultKind,string>={path:'六瓣路径冠',number:'十二齿计量环',text:'双叶卷轴框',collection:'六角蜂巢框',decision:'四向判定冠',unknown:'八瓣未定环'};
// Every radial contour encloses the rune band. Shape is driven solely by
// local result kind, not the layer index or a shared/global center glyph.
export function framePath(kind:ResultKind,radius:number,offset=0){
 const amplitude=Math.max(5,Math.min(18,radius*.075)),base=radius+17+offset;
 const points=Array.from({length:240},(_,i)=>{
  const a=i*Math.PI*2/240;
  let wave=0;
  if(kind==='path')wave=(1+Math.cos(6*a))/2;
  else if(kind==='number')wave=Math.cos(12*a)>.15?1:0;
  else if(kind==='text')wave=(1+Math.cos(2*a))*.4+(1+Math.cos(4*a))*.1;
  else if(kind==='collection')wave=Math.abs(Math.cos(3*a));
  else if(kind==='decision')wave=((1+Math.cos(4*a))/2)**2;
  else wave=(1+Math.cos(8*a))/2;
  const r=base+amplitude*wave;return `${i?'L':'M'}${(r*Math.cos(a)).toFixed(3)} ${(r*Math.sin(a)).toFixed(3)}`;
 });
 return points.join(' ')+' Z';
}
export const RingFrame=memo(function RingFrame({kind,radius,small,hash}:{kind:ResultKind;radius:number;small:boolean;hash:string}){
 const repeats=kind==='number'?12:kind==='decision'?4:kind==='text'?2:kind==='unknown'?8:6;
 return <g data-frame-kind={kind} data-frame-name={frameNames[kind]} strokeWidth=".75">
  <title>{frameNames[kind]}</title>
  <circle r={radius-(small?11:16)} opacity=".6"/>
  <path data-contour="primary" d={framePath(kind,radius)} opacity=".85"/>
  <path data-contour="echo" d={framePath(kind,radius,5)} opacity=".35"/>
  {Array.from({length:repeats},(_,i)=><g key={i} transform={`rotate(${i*360/repeats}) translate(${radius+19} 0)`}><path d={kind==='number'?'M-1 -4 H6 V4 H-1 M3 -7 V7':kind==='path'?'M0 0 L5 -4 L10 0 L5 4 Z':kind==='decision'?'M0 -5 L10 0 L0 5 M10 0 H15':'M0 -6 Q12 0 0 6'} opacity=".85"/></g>)}
  {Array.from({length:small?36:72},(_,i)=><path key={i} transform={`rotate(${i*360/(small?36:72)})`} d={`M${radius-20} 0 h${-(2+parseInt(hash[i%64],16)/5)}`} opacity=".35"/>)}
 </g>;
});
