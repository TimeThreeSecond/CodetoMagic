import {describe,it,expect} from 'vitest';
import {Euler,Quaternion,Vector3} from 'three';
import {unfold} from './castingMath';
import {CastGesture,estimatePalm,openPalm,type Hand} from './handPose';

function synthetic(){
 const points=Array.from({length:21},()=>new Vector3());points[0].set(0,-1,0);
 [5,9,13,17].forEach((base,j)=>{for(let k=0;k<4;k++)points[base+k].set(.5-j/3,k*.4+(j===1?.1:0),.025*k*k);});
 for(let i=1;i<=4;i++)points[i].set(.45+i*.2,-.7+i*.3,0);
 const width=points[5].distanceTo(points[17]),rotation=new Quaternion().setFromEuler(new Euler(.3,-.35,.15)),position=new Vector3(.7,-.2,-8),fy=.5/Math.tan(50*Math.PI/360),fx=fy/(16/9);
 const hand:Hand={world:points.map(p=>({x:p.x*.08,y:-p.y*.08,z:-p.z*.08})),landmarks:points.map(p=>{const q=p.clone().divideScalar(width).applyQuaternion(rotation).add(position);return {x:.5+fx*q.x/-q.z,y:.5-fy*q.y/-q.z,z:0};}),label:'Right',score:1};
 return {hand,rotation};
}
describe('casting geometry and gesture lifecycle',()=>{
 it('unfolds smoothly and monotonically with delayed outer layers',()=>{
  expect(unfold(0,1.2,0,3).opacity).toBe(0);expect(unfold(.1,1.2,2,3).opacity).toBe(0);
  let last=0;for(let t=0;t<1.3;t+=.01){const p=unfold(t,1.2,1,3);expect(p.scale).toBeGreaterThanOrEqual(last);last=p.scale;}
  expect(unfold(1.2,1.2,2,3)).toEqual({scale:1,opacity:1});
  expect(unfold(.001,1.2,0,3).scale).toBeLessThan(.026);
 });
 it('recovers a known perspective pose from 3D/2D correspondences',()=>{
  const {hand,rotation}=synthetic(),pose=estimatePalm(hand,16/9,50);expect(pose).not.toBeNull();expect(pose!.rms).toBeLessThan(.002);
  const expected=new Vector3(0,0,1).applyQuaternion(rotation),actual=new Vector3(0,0,1).applyQuaternion(pose!.rotation);expect(actual.dot(expected)).toBeGreaterThan(.97);
  expect(pose!.position.z).toBeLessThan(-7);expect(pose!.position.z).toBeGreaterThan(-9);
 });
 it('rejects degenerate or nonfinite hands',()=>{
  const {hand}=synthetic();hand.world=hand.world.map(()=>({x:0,y:0,z:0}));expect(estimatePalm(hand,1,50)).toBeNull();hand.world[5].x=NaN;expect(estimatePalm(hand,1,50)).toBeNull();
 });
 it('distinguishes straight fingers from folded fingers',()=>{
  const {hand}=synthetic();expect(openPalm(hand)).toBeGreaterThan(.78);
  for(const base of [5,9,13,17]){hand.world[base+2]={...hand.world[base]};hand.world[base+3]={...hand.world[0]};}
  expect(openPalm(hand)).toBeLessThan(.55);
 });
 it('holds through a short dropout and unfolds again after a real release',()=>{
  const g=new CastGesture();for(let t=0;t<.6;t+=.02)g.tick(1,t,.02);expect(g.active).toBe(true);const elapsed=g.elapsed;
  g.tick(null,.65,.05);expect(g.active).toBe(true);expect(g.elapsed).toBeGreaterThan(elapsed);
  g.tick(null,.95,.05);expect(g.active).toBe(false);
  for(let t=1;t<1.2;t+=.02)g.tick(1,t,.02);expect(g.active).toBe(true);expect(g.elapsed).toBeLessThan(.2);
  g.tick(0,1.21,.02);expect(g.active).toBe(false);
 });
});
