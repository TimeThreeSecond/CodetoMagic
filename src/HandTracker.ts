import type {Hand} from './handPose';
export class HandTracker{
 private worker:Worker;private ready=false;private busy=false;private dead=false;private id=0;
 constructor(onResult:(hands:Hand[])=>void,onStatus:(message:string)=>void){
  this.worker=new Worker(new URL('./hand.worker.ts',import.meta.url),{type:'module'});
  this.worker.onmessage=({data})=>{if(this.dead)return;if(data.type==='ready'){this.ready=true;onStatus('识别就绪 · 请张开手掌');}if(data.type==='result'){this.busy=false;if(data.id===this.id)onResult(data.hands);}if(data.type==='error'){this.busy=false;onStatus(`识别失败：${data.message}`);}};
  this.worker.onerror=e=>{this.busy=false;onStatus(`识别模块无法启动：${e.message}`);};
  this.worker.postMessage({type:'init',model:new URL('models/hand_landmarker.task',new URL(import.meta.env.BASE_URL,location.href)).href});onStatus('正在加载本地手部模型…');
 }
 async detect(source:HTMLVideoElement|HTMLImageElement,time:number,image=false){
  if(!this.ready||this.busy||this.dead)return false;this.busy=true;const id=this.id;
  try{const frame=await createImageBitmap(source);if(this.dead||id!==this.id){frame.close();this.busy=false;return false;}this.worker.postMessage({type:'frame',id,frame,time,image},[frame]);return true;}
  catch{this.busy=false;return false;}
 }
 reset(){this.id++;}
 dispose(){this.dead=true;this.worker.terminate();}
}
