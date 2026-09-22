import type {Node} from './analysis';
import {motif,resultSeals,type ResultKind} from './planes';
import {sigils,nodeSigil} from './sigils';

export function important(n:Node){return /if_|for_|while_|do_|switch_|return_|call_/.test(n.kind);}
// Uniformly distribute semantic medallions inside the disk, then size them
// against nearest neighbors, the boundary, and the central result seal.
export function featureLayout(nodes:Node[],radius:number){
 const features=nodes.filter(important),orbit=radius*.66;
 return features.map((node,i)=>{
  const angle=-90+i*360/features.length,rad=angle*Math.PI/180;
  const nearest=features.length>1?2*orbit*Math.sin(Math.PI/features.length):radius;
  // Decorative terminals extend to 36/26 of the nominal size.
  const size=Math.max(8,Math.min(radius*.215,nearest*.34,(orbit-radius*.22-12)/1.39,(radius-orbit-28)/1.39));
  return {node,angle,x:Math.cos(rad)*orbit,y:Math.sin(rad)*orbit,size};
 });
}
function polygon(sides:number,r:number,rotation=-90){return Array.from({length:sides},(_,i)=>{const a=(rotation+i*360/sides)*Math.PI/180;return `${Math.cos(a)*r},${Math.sin(a)*r}`;}).join(' ');}
export function Medallion({node,size}:{node:Node;size:number}){
 const key=nodeSigil(node.kind),shape=motif(node.kind);
 const points=node.kind==='return_statement'?6:node.kind==='call_expression'?8:node.kind==='if_statement'?4:node.kind==='for_statement'?4:6;
 return <g data-motif={node.kind==='return_statement'?'result-crown':node.kind==='call_expression'?'invocation-star':shape.name} data-feature-size={size} transform={`scale(${size/26})`} strokeWidth=".7">
  <polygon points={polygon(points,24,node.kind==='for_statement'?-45:-90)} opacity=".85"/>
  <polygon points={polygon(points,20,node.kind==='for_statement'?-45:-90)} opacity=".4"/>
  {Array.from({length:points},(_,i)=><g key={i} transform={`rotate(${i*360/points})`}><path d="M0 -26 l2 -3 l-2 -3 l-2 3 Z M-4 -22 Q0 -16 4 -22" strokeWidth=".65"/><path d="M0 -34 V-36" opacity=".6"/></g>)}
  <path d={shape.path} transform="scale(.67)" opacity=".55"/>
  <path d={sigils[key].path} transform="scale(.95)" strokeWidth=".9"/>
 </g>;
}
export function ResultCrest({kind,radius}:{kind:ResultKind;radius:number}){
 return <g data-crest={kind} transform={`scale(${radius/40})`} strokeWidth=".8">
  <circle r="35" opacity=".65"/><circle r="39" strokeDasharray="1 4" opacity=".55"/>
  <polygon points={polygon(kind==='path'?6:8,29)} opacity=".4"/>
  {Array.from({length:8},(_,i)=><path key={i} transform={`rotate(${i*45})`} d="M0 -33 Q-8 -27 -4 -22 M0 -33 Q8 -27 4 -22 M0 -41 l2 -3 l-2 -3 l-2 3 Z" opacity=".75"/>)}
  <path d={resultSeals[kind].path} transform="scale(.83)" strokeWidth="1.15"/>
 </g>;
}
