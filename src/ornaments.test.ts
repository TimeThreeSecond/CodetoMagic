import {describe,it,expect} from 'vitest';
import {featureLayout} from './ornaments';
import {orbitalPeriod,layerProjection,inferFunctionResultKind} from './planes';
import type {Node,Fn} from './analysis';
const range={start:0,end:1,line:1,endLine:1};
const node=(i:number):Node=>({id:String(i),kind:'if_statement',label:'if',range,depth:0,family:'general',pointers:0});
describe('ornament and orbit rules',()=>{
 it('uses more vacant space when fewer important nodes are present',()=>{
  const sparse=featureLayout([node(0),node(1),node(2)],300);
  const dense=featureLayout(Array.from({length:12},(_,i)=>node(i)),300);
  expect(sparse[0].size).toBeGreaterThan(dense[0].size);
  for(const fs of [sparse,dense]) for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++){
   expect((fs[i].size+fs[j].size)*36/26).toBeLessThan(Math.hypot(fs[i].x-fs[j].x,fs[i].y-fs[j].y));
  }
 });
 it('clamps revolution to 7–25 seconds, separately from self rotation',()=>{
  for(const base of [-10,7,18,25,100])for(let i=0;i<20;i++){
   expect(orbitalPeriod(base,i)).toBeGreaterThanOrEqual(7);
   expect(orbitalPeriod(base,i)).toBeLessThanOrEqual(25);
  }
  expect(orbitalPeriod(18,0)).toBe(18);
  expect(orbitalPeriod(18,1)).toBe(21);
 });
 it('actually separates planes by the requested depth and removes it in front view',()=>{
  expect(layerProjection(0,2,'stack',.57,420).y-layerProjection(1,2,'stack',.57,420).y).toBe(420);
  expect(layerProjection(0,2,'front',.57,420).y).toBe(0);
 });
 it('uses a function result seal instead of repeating its name',()=>{
  const f:Fn={id:'f',name:'closest_vertex',nodes:[],order:0,range,reachable:true,returnType:'int'};
  expect(inferFunctionResultKind(f)).toBe('number');
  expect(inferFunctionResultKind({...f,name:'print_path',returnType:'void'})).toBe('path');
 });
});
