import {describe,it,expect} from 'vitest';
import {buildTimeline} from './playback';
import {executionHighlights,highlightedNodes,highlightTracks,highlightAt,mergeHighlightSpans} from './execution';
import type {Model,Fn,Node} from './analysis';
const range={start:0,end:1,line:1,endLine:1};
const node=(id:string,target?:string):Node=>({id,target,label:id,kind:target?'call_expression':'expression_statement',range,depth:0,family:'general',pointers:0});
const fn=(name:string,nodes:Node[]):Fn=>({id:name,name,nodes,range,reachable:true,order:0});
const model:Model={functions:[fn('main',[node('call','child'),node('after')]),fn('child',[node('sub','leaf'),node('end')]),fn('leaf',[node('value'),node('external','print')])],trace:[],sourceHash:'',semanticHash:'',diagnostics:[],directives:[]};
describe('pointer / glyph / source highlights',()=>{
 const timeline=buildTimeline(model);
 it('highlights the active step and all suspended call sites',()=>{
  const event=timeline.events.find(e=>e.nodeId==='value')!;
  expect(executionHighlights(model,timeline,event.start+.2).map(h=>[h.nodeId,h.status])).toEqual([['value','active'],['call','waiting'],['sub','waiting']]);
 });
 it('drops returned callees and retains the final step',()=>{
  const event=timeline.events.find(e=>e.nodeId==='after')!;
  expect(highlightedNodes(timeline,event.start+.2).map(h=>h.nodeId)).toEqual(['after']);
  expect(highlightedNodes(timeline,timeline.duration).map(h=>h.nodeId)).toEqual(['after']);
 });
 it('keeps external/recursive wait sites highlighted with a waiting state',()=>{
  const event=timeline.events.find(e=>e.nodeId==='external'&&e.kind==='wait')!;
  expect(highlightedNodes(timeline,event.start+.1)[0]).toMatchObject({nodeId:'external',status:'waiting'});
 });
 it('uses the same statuses in source-free SVG tracks at every event boundary and midpoint',()=>{
  const tracks=highlightTracks(timeline);
  for(const event of timeline.events)for(const time of [event.start,event.start+event.duration*.5]){
   const expected=new Map(highlightedNodes(timeline,time).map(h=>[h.nodeId,h.status]));
   for(const [id,spans] of tracks)expect(highlightAt(spans,time,timeline.duration)).toBe(expected.get(id)||null);
  }
  for(const [id,spans] of tracks)expect(highlightAt(spans,timeline.duration,timeline.duration)).toBe(id==='after'?'active':null);
 });
 it('merges adjacent same-status spans without mutating inputs',()=>{
  const spans=[{start:1,duration:1,status:'active' as const},{start:0,duration:1,status:'active' as const}];
  expect(mergeHighlightSpans(spans)).toEqual([{start:0,duration:2,status:'active'}]);
  expect(spans[0].duration).toBe(1);
 });
 it('has no highlights for an empty timeline',()=>{
  expect(executionHighlights({...model,functions:[]},buildTimeline({...model,functions:[]}),0)).toEqual([]);
 });
 it('retains only the last instruction when a program ends with an external wait',()=>{
  const t=buildTimeline({...model,functions:[fn('main',[node('print','print')])]});
  const spans=highlightTracks(t).get('print')!;
  expect(highlightedNodes(t,t.duration)[0]).toMatchObject({nodeId:'print',status:'active'});
  expect(highlightAt(spans,t.duration,t.duration,true)).toBe('active');
  expect(highlightAt(spans,t.duration,t.duration,false)).toBeNull();
 });
});
