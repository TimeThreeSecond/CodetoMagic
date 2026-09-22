import type {ResultKind} from './planes';
export type HandKind='hour'|'minute'|'second';
const profiles:Record<ResultKind,string>={
 path:'M-8 0 H67 L61 -5 L76 0 L61 5 L67 0 M24 -3 L29 0 L24 3 L19 0 Z M43 0 L50 -5 L57 0 L50 5 Z',
 number:'M-8 0 H76 M67 -4 L76 0 L67 4 M20 -4 V4 M29 -6 V6 M38 -4 V4 M47 -6 V6 M56 -4 V4',
 text:'M-8 0 Q30 -4 76 0 Q42 12 14 0 M21 0 Q30 -12 37 -2 M35 0 Q45 -10 51 -1 M50 0 Q61 -7 68 0',
 collection:'M-8 0 H76 M66 -5 L76 0 L66 5 M17 -4 H25 V4 H17 Z M35 -4 H43 V4 H35 Z M53 -4 H61 V4 H53 Z',
 decision:'M-8 0 H76 M15 0 L26 -6 L37 0 L26 6 Z M46 0 L57 -6 L68 0 L57 6 Z M68 -3 L76 0 L68 3',
 unknown:'M-8 0 H76 M17 0 L24 -4 L31 0 L24 4 Z M43 0 L50 -4 L57 0 L50 4 Z M66 -4 L76 0 L66 4'
};
export function MagicHand({kind,result,length,angle,fnName,waiting}:{kind:HandKind;result:ResultKind;length:number;angle:number;fnName:string;waiting:boolean}){
 const width=kind==='hour'?1.9:kind==='minute'?1.3:.9;
 return <g data-magic-hand={kind} data-hand-result={result} data-hand-function={fnName} data-hand-angle={angle} data-hand-waiting={waiting} transform={`rotate(${angle})`} pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
  <title>{kind==='hour'?'短时针':kind==='minute'?'中分针':'短秒针'} · {fnName}{waiting?' · 等待调用返回':''}</title>
  <path d={profiles[result]} transform={`scale(${length/76})`} strokeWidth={width} vectorEffect="non-scaling-stroke"/>
  {kind==='hour'&&<path d="M-6 -3 L0 -7 L6 -3 L6 3 L0 7 L-6 3 Z" strokeWidth="1.2"/>}
  {kind==='minute'&&<path d="M-4 -4 H4 V4 H-4 Z" strokeWidth="1"/>}
  {kind==='second'&&<path d="M-5 0 L0 -4 L5 0 L0 4 Z" strokeWidth=".8"/>}
 </g>;
}
