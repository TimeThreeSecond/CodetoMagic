import {HandLandmarker} from '@mediapipe/tasks-vision';
import loader from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url';
import binary from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url';
let detector:HandLandmarker|null=null,mode:'IMAGE'|'VIDEO'='VIDEO',last=-1;
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){
   detector=await HandLandmarker.createFromOptions({wasmLoaderPath:new URL(loader,self.location.origin).href,wasmBinaryPath:new URL(binary,self.location.origin).href},{baseOptions:{modelAssetPath:data.model,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5});
   self.postMessage({type:'ready'});return;
  }
  if(!detector)return;
  if(data.type==='frame'){
   try{const next=data.image?'IMAGE':'VIDEO';if(next!==mode||data.time<=last){await detector.setOptions({runningMode:'IMAGE'});if(next==='VIDEO')await detector.setOptions({runningMode:'VIDEO'});mode=next;}
    const result=data.image?detector.detect(data.frame):detector.detectForVideo(data.frame,data.time);last=data.time;
    self.postMessage({type:'result',id:data.id,hands:result.landmarks.map((landmarks,i)=>({landmarks,world:result.worldLandmarks[i],label:result.handedness[i][0]?.categoryName||'',score:result.handedness[i][0]?.score||0}))});
   }finally{data.frame.close();}
  }
 }catch(e){self.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});}
};
