import {describe,it,expect} from 'vitest';
import {motionTransform,type Motion} from './svgPlayback';
import {ringDirection} from './rotation';
import {handAngle} from './playback';
describe('portable motion and direction rules',()=>{
 it('alternates main rings and reverses their satellites',()=>{
  expect([0,1,2,3].map(i=>ringDirection(i))).toEqual([1,-1,1,-1]);
  for(let i=0;i<4;i++)expect(ringDirection(i,true)).toBe(-ringDirection(i));
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
