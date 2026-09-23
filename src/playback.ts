import type {Model} from './analysis';
export type PlaybackEvent={fnId:string;nodeId:string;fromId:string|null;start:number;duration:number;kind:'move'|'wait';stack:string[];positions:Record<string,string>;clocks:Record<string,number>};
export type Timeline={events:PlaybackEvent[];duration:number;finalPositions:Record<string,string>;finalClocks:Record<string,number>;truncated:boolean};
/** Structural call/return demonstration, not C evaluation. Each call site is
 * replayed; recursive cycles are held briefly rather than expanded forever. */
export function buildTimeline(model:Model):Timeline{
 const events:PlaybackEvent[]=[],positions:Record<string,string>={},clocks:Record<string,number>={};
 let time=0,truncated=false;
 function append(fnId:string,nodeId:string,stack:string[],kind:'move'|'wait'){
  if(events.length>=6000){truncated=true;return false;}
  const duration=kind==='move'?.72:.38;
  events.push({fnId,nodeId,fromId:positions[fnId]||null,start:time,duration,kind,stack:[...stack],positions:{...positions},clocks:{...clocks}});
  positions[fnId]=nodeId;if(kind==='move')clocks[fnId]=(clocks[fnId]||0)+duration;time+=duration;return true;
 }
 function visit(fnId:string,ancestors:string[]){
  const fn=model.functions.find(f=>f.id===fnId)!;const stack=[...ancestors,fnId];
  for(const n of fn.nodes){
   if(!append(fnId,n.id,stack,'move'))return;
   if(n.target){const callee=model.functions.find(f=>f.name===n.target);
    if(callee&&!stack.includes(callee.id)&&stack.length<16)visit(callee.id,stack);
    else if(!append(fnId,n.id,stack,'wait'))return;
   }
   if(truncated)return;
  }
 }
 const entry=model.functions.find(f=>f.name==='main')||model.functions.find(f=>f.id!=='globals');
 if(entry)visit(entry.id,[]);
 return {events,duration:time,finalPositions:{...positions},finalClocks:{...clocks},truncated};
}
export function samplePlayback(timeline:Timeline,time:number){
 const ended=time>=timeline.duration,events=timeline.events;
 if(!events.length||ended)return {event:null,step:Math.max(0,events.length-1),progress:1,activeFn:null,stack:[] as string[],positions:timeline.finalPositions,clocks:timeline.finalClocks,ended:true};
 let lo=0,hi=events.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(events[mid].start<=time)lo=mid;else hi=mid-1;}
 const event=events[lo],progress=Math.max(0,Math.min(1,(time-event.start)/event.duration));
 return {event,step:lo,progress,activeFn:event.fnId,stack:event.stack,positions:event.positions,clocks:{...event.clocks,[event.fnId]:(event.clocks[event.fnId]||0)+(event.kind==='move'?progress*event.duration:0)},ended:false};
}
export function handAngle(from:number,to:number,progress:number,direction=1){
 const turn=direction*((direction*(to-from)%360+360)%360);
 const t=Math.max(0,Math.min(1,progress));const eased=t*t*(3-2*t);
 return from+turn*eased;
}
