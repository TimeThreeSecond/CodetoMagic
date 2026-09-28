import {useEffect,useRef,useState} from 'react';
import {readRecording} from './svgPlayback';

export function SvgPlayer({recording,name,onClose,active=true}:{recording:ReturnType<typeof readRecording>;name:string;onClose:()=>void;active?:boolean}){
 const host=useRef<HTMLDivElement>(null);
 const [time,setTime]=useState(recording.data.time),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
 useEffect(()=>{if(!active)setPlaying(false);},[active]);
 useEffect(()=>{host.current?.replaceChildren(recording.svg);return()=>recording.svg.remove();},[recording]);
 useEffect(()=>recording.seek(time),[recording,time]);
 useEffect(()=>{
  if(!playing)return;
  let frame=0,last=0;
  const tick=(now:number)=>{if(last)setTime(t=>Math.min(recording.data.duration,t+Math.min(.08,(now-last)/1000)*speed));last=now;frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[playing,speed,recording]);
 useEffect(()=>{if(time>=recording.data.duration)setPlaying(false);},[time,recording]);
 return <section className="visual-panel svg-player" aria-label="SVG 动画播放器">
  <div className="panel-title"><span>SVG 法阵档案 · {name}</span><button onClick={onClose}>返回源码工作台</button></div>
  <p>独立播放已保存的图形与表针轨迹，无需 C / Python 源码。保留导出时的视图、可见图层和相位。</p>
  <div ref={host} className="scene-wrap" style={{height:'70vh'}}/>
  <div className="transport">
   <button disabled={!recording.data.duration} onClick={()=>{if(time>=recording.data.duration)setTime(0);setPlaying(p=>!p);}}>{playing?'Ⅱ 暂停':'▷ 播放 SVG'}</button>
   <button onClick={()=>{setPlaying(false);setTime(0);}}>回到起点</button>
   <input aria-label="SVG 播放时间" type="range" min="0" max={recording.data.duration} step=".01" value={time} onChange={e=>{setPlaying(false);setTime(+e.target.value);}}/>
   <output>{time.toFixed(2)} / {recording.data.duration.toFixed(2)}s</output>
   <select aria-label="SVG 播放速度" value={speed} onChange={e=>setSpeed(+e.target.value)}>{[.5,1,2].map(s=><option key={s} value={s}>{s}×</option>)}</select>
  </div>
 </section>;
}
