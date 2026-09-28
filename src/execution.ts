import type {Model,Range} from './analysis';
import {samplePlayback,type Timeline} from './playback';

export type ExecutionStatus='active'|'waiting';
export type ExecutionHighlight={fnId:string;nodeId:string;range:Range;status:ExecutionStatus};
export type HighlightSpan={start:number;duration:number;status:ExecutionStatus};

/** The instruction being approached, plus the callers held at their call sites. */
export function highlightedNodes(timeline:Timeline,time:number){
 const playback=samplePlayback(timeline,time),event=playback.event||timeline.events.at(-1);
 if(!event)return [];
 const out:{fnId:string;nodeId:string;status:ExecutionStatus}[]=[{fnId:event.fnId,nodeId:event.nodeId,status:event.kind==='wait'&&!playback.ended?'waiting':'active'}];
 for(const fnId of playback.stack){
  if(fnId===event.fnId)continue;
  const nodeId=playback.positions[fnId];if(nodeId)out.push({fnId,nodeId,status:'waiting'});
 }
 return out;
}
export function executionHighlights(model:Model,timeline:Timeline,time:number):ExecutionHighlight[]{
 return highlightedNodes(timeline,time).flatMap(h=>{
  const node=model.functions.find(f=>f.id===h.fnId)?.nodes.find(n=>n.id===h.nodeId);
  return node?[{...h,range:node.range}]:[];
 });
}
export function mergeHighlightSpans(spans:HighlightSpan[]):HighlightSpan[]{
 const merged:HighlightSpan[]=[];
 for(const span of [...spans].sort((a,b)=>a.start-b.start)){
  const last=merged.at(-1);
  if(last&&last.status===span.status&&Math.abs(last.start+last.duration-span.start)<1e-7)last.duration=span.start+span.duration-last.start;
  else merged.push({...span});
 }
 return merged;
}
/** Geometry-space highlighting records; no source text or source ranges. */
export function highlightTracks(timeline:Timeline){
 const tracks=new Map<string,HighlightSpan[]>();
 for(const event of timeline.events){
  const highlights=[{nodeId:event.nodeId,status:event.kind==='wait'?'waiting':'active'} as const];
  for(const fnId of event.stack)if(fnId!==event.fnId&&event.positions[fnId])highlights.push({nodeId:event.positions[fnId],status:'waiting'});
  for(const h of highlights){const track=tracks.get(h.nodeId)||[];track.push({start:event.start,duration:event.duration,status:h.status});tracks.set(h.nodeId,track);}
 }
 return new Map([...tracks].map(([id,spans])=>[id,mergeHighlightSpans(spans)]));
}
export function highlightAt(spans:HighlightSpan[],time:number,duration:number,final?:boolean):ExecutionStatus|null{
 if(time>=duration&&final!==undefined)return final?'active':null;
 let lo=0,hi=spans.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(spans[mid].start<=time)lo=mid+1;else hi=mid;}
 const span=spans[lo-1];if(!span)return null;
 const end=span.start+span.duration;
 if(time<end)return span.status;
 return time>=duration&&Math.abs(end-duration)<1e-7&&span.status==='active'?'active':null;
}
