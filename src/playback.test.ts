import {describe,it,expect} from 'vitest';
import {buildTimeline,samplePlayback,handAngle} from './playback';
import type {Model,Fn,Node} from './analysis';
const range={start:0,end:1,line:1,endLine:1};
const n=(id:string,target?:string):Node=>({id,target,kind:target?'call_expression':'expression_statement',label:id,range,depth:0,family:'general',pointers:0});
const f=(name:string,nodes:Node[]):Fn=>({name,id:name,nodes,range,order:0,reachable:true});
const m=(functions:Fn[]):Model=>({functions,trace:[],sourceHash:'',semanticHash:'',diagnostics:[],directives:[]});
describe('continuous structural call playback',()=>{
 it('holds caller position and local ring clock until nested calls return',()=>{
  const t=buildTimeline(m([f('main',[n('a'),n('call','child'),n('after')]),f('child',[n('c'),n('sub','leaf'),n('end')]),f('leaf',[n('l'),n('l2')])]));
  const nested=t.events.find(e=>e.nodeId==='l')!;
  const a=samplePlayback(t,nested.start+.1),b=samplePlayback(t,nested.start+.5);
  expect(a.stack).toEqual(['main','child','leaf']);
  expect(a.positions.main).toBe('call');expect(a.positions.child).toBe('sub');
  expect(a.clocks.main).toBe(b.clocks.main);expect(a.clocks.child).toBe(b.clocks.child);
  expect(b.clocks.leaf).toBeGreaterThan(a.clocks.leaf);
  expect(samplePlayback(t,t.events.find(e=>e.nodeId==='after')!.start).stack).toEqual(['main']);
  expect(samplePlayback(t,t.duration).stack).toEqual([]);
 });
 it('replays a callee at each call site and bounds recursive cycles',()=>{
  const t=buildTimeline(m([f('main',[n('one','child'),n('two','child')]),f('child',[n('recursive','child')])]));
  expect(t.events.filter(e=>e.nodeId==='recursive'&&e.kind==='move')).toHaveLength(2);
  expect(t.events.filter(e=>e.kind==='wait')).toHaveLength(2);
 });
 it('interpolates clockwise through intermediate angles without a wrap jump',()=>{
  expect(handAngle(350,10,0)).toBe(350);expect(handAngle(350,10,.5)).toBe(360);expect(handAngle(350,10,1)).toBe(370);
  expect(handAngle(0,90,.25)).toBeGreaterThan(0);expect(handAngle(0,90,.25)).toBeLessThan(90);
 });
});
