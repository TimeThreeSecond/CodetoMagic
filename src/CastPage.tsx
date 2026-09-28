import {useEffect,useMemo,useRef,useState} from 'react';
import {Quaternion,Vector3} from 'three';
import {castingAsset} from './castingAsset';
import {CastRenderer,type CastSettings,type CastPose} from './CastRenderer';
export type CastAsset={text:string;name:string};
export type CastSession={settings?:CastSettings;file?:File;kind?:'photo'|'video';time?:number;mirror?:boolean;anchor?:{x:number;y:number;depth:number}};
const defaults:CastSettings={size:2.5,spacing:.5,offset:.5,fov:50,duration:1.2,flip:false,pitch:-20,yaw:25,roll:0,reverse:false,solo:-1,glow:0};
export function CastPage({asset,onAsset,onCurrent,onImported,session}:{asset:CastAsset|null;onAsset:(a:CastAsset)=>void;onCurrent:()=>void;onImported:()=>void;session:CastSession}){
 const [settings,setSettings]=useState(session.settings||defaults),[tab,setTab]=useState('input'),[error,setError]=useState('');
 const [file,setFile]=useState<File|null>(session.file||null),[kind,setKind]=useState<'photo'|'video'>(session.kind||'photo'),[url,setUrl]=useState('');
 const [dimensions,setDimensions]=useState({w:1280,h:720}),[mirror,setMirror]=useState(session.mirror||false),[playing,setPlaying]=useState(true),[time,setTime]=useState(session.time||0);
 const [anchor,setAnchor]=useState(session.anchor||{x:.5,y:.55,depth:8}),[exporting,setExporting]=useState(false);
 const host=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null),photo=useRef<HTMLImageElement>(null),engine=useRef<CastRenderer|null>(null);
 const elapsed=useRef(0),clock=useRef(time),state=useRef({settings,playing,kind,anchor});state.current={settings,playing,kind,anchor};
 const lastPose=useRef<CastPose>({position:new Vector3(0,0,-8),rotation:new Quaternion()});
 const source=useMemo(()=>{try{return asset?{value:castingAsset(asset.text),error:''}:{value:null,error:''};}catch(e){return {value:null,error:String(e)};}},[asset]);
 useEffect(()=>{Object.assign(session,{settings,file:file||undefined,kind,time,mirror,anchor});},[session,settings,file,kind,time,mirror,anchor]);
 useEffect(()=>{if(!file){setUrl('');return;}const next=URL.createObjectURL(file);setUrl(next);return()=>URL.revokeObjectURL(next);},[file]);
 useEffect(()=>{if(!source.value||!host.current)return;let renderer:CastRenderer;try{renderer=new CastRenderer(host.current,source.value);}catch(e){setError(`三维画布无法启动：${e}`);return;}
  engine.current=renderer;let stopped=false,frame=0,last=performance.now(),updated=-1,ui=0,busy=false;elapsed.current=0;
  const loop=(now:number)=>{if(stopped)return;const dt=Math.min(.1,(now-last)/1000);last=now;const s=state.current;
   if(s.kind==='video'&&video.current)clock.current=video.current.currentTime;else if(s.playing)clock.current+=dt;
   if(s.playing)elapsed.current+=dt;
   const t=source.value!.duration?clock.current%source.value!.duration:0;
   if(!busy&&Math.abs(t-updated)>.065){busy=true;updated=t;void renderer.textures(t).catch(e=>{if(!stopped)setError(`法阵纹理更新失败：${e}`);}).finally(()=>busy=false);}
   const height=2*s.anchor.depth*Math.tan(s.settings.fov*Math.PI/360),aspect=renderer.camera.aspect;
   lastPose.current={position:new Vector3((s.anchor.x-.5)*height*aspect,(.5-s.anchor.y)*height,-s.anchor.depth),rotation:new Quaternion()};
   renderer.draw(s.settings,lastPose.current,elapsed.current,1,dt);
   if(now-ui>150){setTime(t);ui=now;}frame=requestAnimationFrame(loop);
  };frame=requestAnimationFrame(loop);return()=>{stopped=true;cancelAnimationFrame(frame);renderer.dispose();engine.current=null;};
 },[source]);
 function update<K extends keyof CastSettings>(key:K,value:CastSettings[K]){setSettings(s=>({...s,[key]:value}));}
 async function loadSvg(file:File){try{if(file.size>20_000_000)throw new Error('SVG 超过 20 MB');const text=await file.text();castingAsset(text);onAsset({text,name:file.name});setError('');}catch(e){setError(String(e));}}
 function loadMedia(file:File){if(!file.type.startsWith('image/')&&!file.type.startsWith('video/')){setError('请选择浏览器支持的图片或视频。');return;}setKind(file.type.startsWith('video/')?'video':'photo');setFile(file);setError('');elapsed.current=0;clock.current=0;}
 async function exportPng(){if(!engine.current||!source.value)return;setExporting(true);setPlaying(false);video.current?.pause();try{
  const renderer=engine.current;await renderer.textures(source.value.duration?clock.current%source.value.duration:0,2048);
  const scale=Math.min(1,4096/Math.max(dimensions.w,dimensions.h)),canvas=document.createElement('canvas');canvas.width=Math.round(dimensions.w*scale);canvas.height=Math.round(dimensions.h*scale);
  const ctx=canvas.getContext('2d')!;if(mirror){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
  const media=kind==='photo'?photo.current:video.current;if(media)ctx.drawImage(media,0,0,canvas.width,canvas.height);else{ctx.fillStyle='#091313';ctx.fillRect(0,0,canvas.width,canvas.height);}
  renderer.draw(state.current.settings,lastPose.current,elapsed.current,1,.016,true);ctx.drawImage(renderer.renderer.domElement,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('无法编码 PNG');const link=document.createElement('a'),u=URL.createObjectURL(blob);link.href=u;link.download='casting-'+(asset?.name.replace(/\.[^.]+$/,'')||'sigil')+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 }catch(e){setError(`导出失败：${e}`);}finally{setExporting(false);}}
 const slider=(key:keyof CastSettings,label:string,min:number,max:number,step:number)=><label className="cast-field">{label}<output>{Number(settings[key]).toFixed(step<1?2:0)}</output><input aria-label={label} type="range" min={min} max={max} step={step} value={Number(settings[key])} onChange={e=>update(key,Number(e.target.value) as never)}/></label>;
 return <main className="cast-page" onDrop={e=>{e.preventDefault();e.stopPropagation();const f=e.dataTransfer.files[0];if(f){if(f.name.endsWith('.svg'))void loadSvg(f);else loadMedia(f);}}}>
  <section className="intro"><div><div className="eyebrow">PALM / PROJECTION / MANIFESTATION</div><h1>让术式，在掌前展开。</h1><p>{asset?asset.name:'选择法阵，然后让光从掌心生长。'}</p></div><button disabled={!source.value||exporting} onClick={()=>void exportPng()}>{exporting?'正在合成…':'导出当前画面 PNG ↓'}</button></section>
  <div className="cast-workspace"><section className="cast-preview"><div className="cast-stage" style={{aspectRatio:`${dimensions.w}/${dimensions.h}`,transform:mirror?'scaleX(-1)':undefined}} onPointerDown={e=>{if((e.target as HTMLElement).tagName==='VIDEO')return;const rect=e.currentTarget.getBoundingClientRect();setAnchor(a=>({...a,x:mirror?1-(e.clientX-rect.left)/rect.width:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height}));}}>
   {url&&(kind==='photo'?<img ref={photo} src={url} alt="施法背景" onLoad={e=>setDimensions({w:e.currentTarget.naturalWidth,h:e.currentTarget.naturalHeight})} onError={()=>setError('图片无法解码，请换用 PNG 或 JPEG。')}/>:<video ref={video} src={url} controls playsInline onLoadedMetadata={e=>{setDimensions({w:e.currentTarget.videoWidth,h:e.currentTarget.videoHeight});e.currentTarget.currentTime=session.time||0;}} onError={()=>setError('视频无法解码，请换用 MP4 / H.264 或 WebM。')}/>)}
   <div ref={host} className="cast-canvas"/>{!url&&<span className="cast-watermark">空间预览 · 点击画面放置掌心锚点</span>}
  </div><div className="transport"><button onClick={()=>{setPlaying(p=>!p);if(kind==='video'&&video.current){if(video.current.paused)void video.current.play().catch(e=>setError(String(e)));else video.current.pause();}}}>{playing?'Ⅱ 暂停法阵':'▷ 播放法阵'}</button><button onClick={()=>{elapsed.current=0;setPlaying(true);}}>重新展开</button><input aria-label="法阵时间" type="range" min="0" max={source.value?.duration||1} step=".01" value={time} onChange={e=>{clock.current=+e.target.value;setTime(+e.target.value);setPlaying(false);if(kind==='video'&&video.current){video.current.pause();video.current.currentTime=+e.target.value;}}}/><output>{time.toFixed(1)}s</output></div><p className="cast-hint">{source.value?.single?'该 SVG 缺少独立层信息，按单层素材显示。':`${source.value?.layers.length||0} 个空间图层 · 副环保留在所属主层`}</p></section>
  <aside className="cast-controls"><div className="view-tabs">{[['input','输入与素材'],['space','空间与透视'],['output','展开与输出']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</div>
   {tab==='input'&&<div className="cast-control-body"><span className="eyebrow">01 / SOURCE</span><label className="file-button">选择照片或视频<input aria-label="施法媒体文件" type="file" accept="image/*,video/*" onChange={e=>{const f=e.target.files?.[0];if(f)loadMedia(f);e.target.value='';}}/></label><p>{file?.name||'可先使用空白舞台调整法阵。'}</p><hr/><span className="eyebrow">02 / SIGIL</span><button onClick={onCurrent}>使用当前代码法阵</button><button onClick={onImported}>使用已导入法阵</button><label className="file-button">导入施法 SVG<input aria-label="施法 SVG 文件" type="file" accept=".svg" onChange={e=>{const f=e.target.files?.[0];if(f)void loadSvg(f);e.target.value='';}}/></label></div>}
   {tab==='space'&&<div className="cast-control-body">{slider('size','法阵半径（掌宽）',.3,6,.1)}{slider('offset','离掌距离',0,3,.05)}{slider('spacing','图层间距',0,3,.05)}{slider('fov','相机视场角',25,100,1)}{slider('pitch','俯仰校正',-85,85,1)}{slider('yaw','偏航校正',-85,85,1)}{slider('roll','平面旋转',-180,180,1)}<label className="cast-field">掌心深度<output>{anchor.depth.toFixed(1)}</output><input aria-label="掌心深度" type="range" min="3" max="25" step=".1" value={anchor.depth} onChange={e=>setAnchor(a=>({...a,depth:+e.target.value}))}/></label><label><input type="checkbox" checked={settings.flip} onChange={e=>update('flip',e.target.checked)}/>翻转施法方向</label><label><input type="checkbox" checked={settings.reverse} onChange={e=>update('reverse',e.target.checked)}/>反转图层顺序</label><label>查看图层<select aria-label="施法图层" value={settings.solo} onChange={e=>update('solo',+e.target.value)}><option value="-1">所有图层</option>{source.value?.layers.map((l,i)=><option key={l.id} value={i}>{l.name}</option>)}</select></label></div>}
   {tab==='output'&&<div className="cast-control-body">{slider('duration','术式展开时长（秒）',.4,5,.1)}{slider('glow','光线强度',0,1,.05)}<label><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/>镜像画面与法阵</label><p>术式由小到大逐层展开，旋转和表针继续按原有轨迹运行。点击「重新展开」可再次观看。</p><p>导出当前画面，长边最多 4096 像素。普通单目输入使用相对掌宽定位。</p></div>}
  </aside></div>{(error||source.error)&&<p className="error" role="alert">{error||source.error}</p>}
 </main>;
}
