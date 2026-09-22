import {describe,it,expect} from 'vitest';
import {radialPeriod,rotationAt,layerProjection,buildPlanes,mainRadii,tokenLayout,motif,safeLayerSpacing,CORE_PERIOD} from './planes';
import type {Fn,Model,Node} from './analysis';
const range={start:0,end:1,line:1,endLine:1};
const node=(i:number,kind='expression_statement',target?:string):Node=>({id:`n${i}`,kind,target,label:kind,range,depth:0,family:'general',pointers:0});
const fn=(name:string,nodes:Node[]):Fn=>({id:name,name,nodes,range,order:0,reachable:true});
const model=(functions:Fn[]):Model=>({functions,trace:[],diagnostics:[],directives:[],sourceHash:'a'.repeat(64),semanticHash:'b'.repeat(64)});
describe('plane animation contract',()=>{
 it('keeps every radial period in range and same-plane spread within five seconds',()=>{
  for(let base=3;base<=20;base++){
   const periods=Array.from({length:24},(_,i)=>radialPeriod(base,i));
   expect(Math.min(...periods)).toBeGreaterThanOrEqual(3);
   expect(Math.max(...periods)).toBeLessThanOrEqual(20);
   expect(Math.max(...periods)-Math.min(...periods)).toBeLessThanOrEqual(5);
   expect(periods[0]).not.toEqual(periods[5]);
  }
 });
 it('makes a complete revolution in the nominal period',()=>{
  for(let p=3;p<=20;p++) expect(rotationAt(p,p)).toBe(360);
 });
 it('uses the same blueprint without depth displacement for front and solo',()=>{
  for(const mode of ['front','single'] as const)
   expect(layerProjection(2,5,mode,.57,65)).toEqual({y:0,scaleY:1});
 });
 it('embeds only uniquely owned small leaves without losing functions',()=>{
  const helper=fn('helper',[node(0,'for_statement'),node(1,'return_statement')]);
  const root=fn('main',[node(0,'call_expression','helper'),...Array.from({length:8},(_,i)=>node(i+1))]);
  let planes=buildPlanes(model([root,helper]));
  expect(planes).toHaveLength(1);
  expect(planes[0].satellites[0]).toEqual({fn:helper,ownerId:'main'});
  const shared=fn('other',[node(0,'call_expression','helper')]);
  planes=buildPlanes(model([root,helper,shared]));
  expect(planes.flatMap(p=>p.satellites)).toHaveLength(0);
  expect(planes.flatMap(p=>p.functions).map(f=>f.name).sort()).toEqual(['helper','main','other']);
 });
 it('keeps recursive functions independent',()=>{
  const recur=fn('recur',[node(0,'call_expression','recur'),node(1,'return_statement')]);
  const planes=buildPlanes(model([fn('main',[node(0,'call_expression','recur')]),recur]));
  expect(planes.flatMap(p=>p.satellites)).toHaveLength(0);
 });
 it('allocates circumference to actual token counts and preserves safe bands',()=>{
  const sparse=fn('one',[node(0,'for_statement'),node(1)]);
  const dense=fn('two',Array.from({length:30},(_,i)=>({...node(i,'if_statement'),sigils:['int','<','&&','!=','+']})));
  const planes=buildPlanes(model([sparse,dense])),radii=mainRadii(planes);
  expect(radii.get('two')!).toBeGreaterThan(radii.get('one')!);
  expect(radii.get('two')!-radii.get('one')!).toBeGreaterThanOrEqual(64);
  const layout=tokenLayout(dense.nodes,radii.get('two')!);
  expect(Math.min(...layout.map(l=>l.pitch))).toBeGreaterThanOrEqual(17);
  for(const tilt of [.25,.57,1])expect(safeLayerSpacing(planes,radii,tilt,100)).toBeGreaterThan(0);
 });
 it('has distinct control shapes and one shared result period',()=>{
  expect(new Set(['if_statement','for_statement','while_statement','do_statement','switch_statement'].map(k=>motif(k).path)).size).toBe(5);
  expect(CORE_PERIOD).toBe(12);
 });
});
