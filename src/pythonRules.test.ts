import {describe,expect,it} from 'vitest';
import {buildTimeline} from './playback';
import {buildPlanes,inferFunctionResultKind,tokensFor} from './planes';
import {calledFunction,entryFunction,type Fn,type Model,type Node} from './analysis';
import {sigils} from './sigils';
import {functionDirection} from './rotation';

const range={start:0,end:1,line:1,endLine:1};
const node=(id:string,kind='call_expression',target?:string,targetId?:string):Node=>({id,kind,target,targetId,label:kind,range,depth:0,family:'general',pointers:0});
const fn=(id:string,name:string,nodes:Node[],returnType?:string):Fn=>({id,name,nodes,returnType,range,order:0,reachable:true});
const model=(functions:Fn[]):Model=>({language:'python',entryId:'module',functions,sourceHash:'a'.repeat(64),semanticHash:'b'.repeat(64),trace:[],diagnostics:[],directives:[]});

describe('Python uses the shared C visualization contract',()=>{
 it('starts in the module, not a main definition that might never be called',()=>{
  const m=model([fn('f','main',[node('ret','return_statement')]),fn('module','模块入口',[node('call','call_expression','main','f')])]);
  expect(entryFunction(m)?.id).toBe('module');
  const timeline=buildTimeline(m);
  expect(timeline.events.map(e=>e.fnId)).toEqual(['module','f']);
  expect(buildPlanes(m).find(p=>p.functions.some(f=>f.id==='module'))?.name).toBe('中环 · 模块入口');
 });
 it('never visits a coincidentally named function for an unresolved dynamic call',()=>{
  const call=node('call','call_expression','worker','');
  const m=model([fn('f','worker',[node('ret','return_statement')]),fn('module','模块入口',[call])]);
  expect(calledFunction(m,call)).toBeUndefined();
  expect(buildTimeline(m).events.every(e=>e.fnId==='module')).toBe(true);
 });
 it('keeps recursively linked functions as independent rings with bounded playback',()=>{
  const recursive=fn('f','binary_split',[node('call','call_expression','binary_split','f')],'tuple[int, int, int]');
  const m=model([recursive,fn('module','模块入口',[node('start','call_expression','binary_split','f')])]);
  expect(buildPlanes(m).flatMap(p=>p.satellites)).toHaveLength(0);
  expect(buildTimeline(m).events).toHaveLength(3);
  expect(inferFunctionResultKind(recursive)).toBe('collection');
 });
 it('uses C-style equivalent glyphs, result seals and feature-driven directions',()=>{
  expect(sigils.and.path).toBe(sigils['&&'].path);
  expect(sigils['//'].path).toBe(sigils['/'].path);
  expect(sigils.def.path).toBe(sigils.bind.path);
  const f=fn('f','test',[{...node('if','if_statement'),sigils:['if','and']}],'bool');
  expect(tokensFor(f.nodes[0])).toEqual(['if','and']);
  expect(inferFunctionResultKind(f)).toBe('decision');
  expect(inferFunctionResultKind({...f,returnType:'str'})).toBe('text');
  expect(functionDirection(f)).toBe(functionDirection({...f,name:'renamed',id:'other'}));
 });
});
