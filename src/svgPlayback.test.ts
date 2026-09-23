import {describe,it,expect} from 'vitest';
import {motionTransform,type Motion} from './svgPlayback';
import {functionDirection,functionFeatures,resultDirection} from './rotation';
import type {Fn} from './analysis';
import {handAngle} from './playback';
describe('portable motion and direction rules',()=>{
 const range={start:0,end:1,line:1,endLine:1};
 const fn:Fn={id:'f0',name:'main',range,order:0,reachable:true,returnType:'int',nodes:[{id:'n',kind:'return_statement',label:'return',range,depth:0,family:'general',pointers:0,sigils:['return','+']}]};
 it('keeps directions independent of names, source locations and layout order',()=>{
  const renamed={...fn,id:'f99',name:'helper',order:99,reachable:false,range:{...range,line:100},nodes:fn.nodes.map(n=>({...n,id:'other',label:'different',range:{...range,start:900}}))};
  expect(functionFeatures(renamed)).toBe(functionFeatures(fn));
  expect(functionDirection(renamed)).toBe(functionDirection(fn));
  expect(functionDirection(renamed,'orbit')).toBe(functionDirection(fn,'orbit'));
 });
 it('permits all spin/orbit combinations and same-direction independent functions',()=>{
  const combinations=new Set<string>();
  const directions:number[]=[];
  for(let depth=0;depth<64;depth++){
   const variant={...fn,nodes:fn.nodes.map(n=>({...n,depth}))};
   combinations.add(`${functionDirection(variant)},${functionDirection(variant,'orbit')}`);
   directions.push(functionDirection(variant));
  }
  expect(combinations.size).toBe(4);
  expect(directions.filter(d=>d===1).length).toBeGreaterThan(1);
  expect(directions.filter(d=>d===-1).length).toBeGreaterThan(1);
  expect(resultDirection('path')).toBe(resultDirection('path'));
 });
 it('travels counterclockwise across zero without reversing or teleporting',()=>{
  expect(handAngle(10,350,.5,-1)).toBe(0);
  expect(handAngle(10,350,1,-1)).toBe(-10);
 });
 it('preserves call waits, resumes, and holds final rune while ring turns',()=>{
  const track:Motion={kind:'hand',rate:-30,direction:-1,segments:[{start:0,duration:1,from:-90,to:-180},{start:4,duration:1,from:-180,to:-270}]};
  expect(motionTransform(track,.5)).toBe('rotate(-150)');
  expect(motionTransform(track,2)).toBe('rotate(-240)');
  expect(motionTransform(track,3)).toBe('rotate(-270)');
  expect(motionTransform(track,4.5)).toBe('rotate(-360)');
  expect(motionTransform(track,6)).toBe('rotate(-450)');
 });
 it('orbits with signed velocity and fixed radius',()=>{
  const t=motionTransform({kind:'orbit',radius:10,phase:0,rate:-90},1);
  const [x,y]=t.slice(10,-1).split(' ').map(Number);
  expect(x).toBeCloseTo(0);expect(y).toBeCloseTo(-10);
 });
});
