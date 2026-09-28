import {Matrix4,Quaternion,Vector3} from 'three';
import type {CastPose} from './CastRenderer';
import {clamp} from './castingMath';
export type Landmark={x:number;y:number;z:number};
export type Hand={landmarks:Landmark[];world:Landmark[];label:string;score:number};
const palm=[0,5,9,13,17];
const vec=(p:Landmark)=>new Vector3(p.x,-p.y,-p.z);
function solve(a:number[][],b:number[]){
 const n=b.length,m=a.map((row,i)=>[...row,b[i]]);
 for(let k=0;k<n;k++){let pivot=k;for(let j=k+1;j<n;j++)if(Math.abs(m[j][k])>Math.abs(m[pivot][k]))pivot=j;
  if(Math.abs(m[pivot][k])<1e-12)return null;[m[k],m[pivot]]=[m[pivot],m[k]];const d=m[k][k];for(let j=k;j<=n;j++)m[k][j]/=d;
  for(let i=0;i<n;i++)if(i!==k){const d=m[i][k];for(let j=k;j<=n;j++)m[i][j]-=d*m[k][j];}
 }return m.map(r=>r[n]);
}
export function openPalm(hand:Hand){
 const p=hand.world.map(vec);if(p.length!==21)return 0;
 let count=0;
 for(const base of [5,9,13,17]){const a=p[base].clone().sub(p[base+1]).normalize(),b=p[base+2].clone().sub(p[base+1]).normalize();
  if(a.dot(b)<-.8&&p[base+3].distanceTo(p[0])>p[base+1].distanceTo(p[0])*1.08)count++;
 }
 const thumb=p[2].clone().sub(p[3]).normalize().dot(p[4].clone().sub(p[3]).normalize())<-.65;
 return (count+(thumb?.5:0))/4.5;
}
/** Fit hand-relative 3D points to image observations in camera coordinates (Y up, camera -Z). */
export function estimatePalm(hand:Hand,aspect:number,fov:number){
 if(hand.world.length!==21||hand.landmarks.length!==21)return null;
 if(![...hand.world,...hand.landmarks].every(p=>[p.x,p.y,p.z].every(Number.isFinite)))return null;
 const world=hand.world.map(vec),width=world[5].distanceTo(world[17]);if(width<1e-5)return null;
 const center=palm.reduce((a,i)=>a.add(world[i]),new Vector3()).divideScalar(palm.length);
 const points=world.map(p=>p.clone().sub(center).divideScalar(width));
 const image=palm.reduce((a,i)=>({x:a.x+hand.landmarks[i].x/palm.length,y:a.y+hand.landmarks[i].y/palm.length}),{x:0,y:0});
 const fy=.5/Math.tan(fov*Math.PI/360),fx=fy/aspect;
 const imageWidth=Math.hypot((hand.landmarks[5].x-hand.landmarks[17].x)*aspect,hand.landmarks[5].y-hand.landmarks[17].y);
 if(imageWidth<.012)return null;
 const span=points[5].clone().sub(points[17]),depth=clamp(fy*Math.hypot(span.x,span.y)/imageWidth,2,60);
 const t=new Vector3((image.x-.5)*depth/fx,(.5-image.y)*depth/fy,-depth),q=new Quaternion();
 const residual=(rotation:Quaternion,position:Vector3)=>points.flatMap((point,i)=>{const p=point.clone().applyQuaternion(rotation).add(position),z=Math.max(.1,-p.z);return [.5+fx*p.x/z-hand.landmarks[i].x,.5-fy*p.y/z-hand.landmarks[i].y];});
 let r=residual(q,t),cost=r.reduce((s,v)=>s+v*v,0),lambda=.001;
 for(let iter=0;iter<10;iter++){
  const jac=Array.from({length:6},(_,k)=>{const qt=q.clone(),tt=t.clone(),eps=1e-4;if(k<3){const axis=new Vector3().setComponent(k,1);qt.premultiply(new Quaternion().setFromAxisAngle(axis,eps));}else tt.setComponent(k-3,tt.getComponent(k-3)+eps);const next=residual(qt,tt);return next.map((v,i)=>(v-r[i])/eps);});
  const weights=r.map((v,i)=>(palm.includes(Math.floor(i/2))?2:1)*Math.min(1,.025/Math.max(Math.abs(v),1e-6)));
  const a=jac.map((row,i)=>jac.map((other,j)=>row.reduce((s,v,k)=>s+v*other[k]*weights[k],0)+(i===j?lambda:0))),b=jac.map(row=>-row.reduce((s,v,i)=>s+v*r[i]*weights[i],0));
  const delta=solve(a,b);if(!delta)break;const axis=new Vector3(...delta.slice(0,3) as [number,number,number]);const angle=Math.min(axis.length(),.25);
  const nq=q.clone().premultiply(new Quaternion().setFromAxisAngle(axis.normalize(),angle)),nt=t.clone().add(new Vector3(delta[3],delta[4],delta[5]));
  if(nt.z>-.5){lambda*=5;continue;}const nr=residual(nq,nt),nc=nr.reduce((s,v)=>s+v*v,0);
  if(nc<cost){q.copy(nq);t.copy(nt);r=nr;cost=nc;lambda*=.5;}else lambda*=5;
 }
 const rms=Math.sqrt(cost/r.length);if(rms>.065)return null;
 const u=points[5].clone().sub(points[17]).normalize().applyQuaternion(q),v=points[9].clone().sub(points[0]).normalize().applyQuaternion(q);
 if(hand.label==='Left')u.negate();v.addScaledVector(u,-v.dot(u)).normalize();const n=u.clone().cross(v).normalize();if(n.length()<.8)return null;
 const rotation=new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(u,v,n));
 return {position:t,rotation,rms,open:openPalm(hand)};
}
export class CastGesture{
 visible=0;elapsed=0;active=false;private candidate=0;private lastSeen=-Infinity;
 tick(open:number|null,now:number,dt:number){
  if(open!==null){this.lastSeen=now;if(open>.78){this.candidate+=dt;if(!this.active&&this.candidate>=.12){this.active=true;this.elapsed=0;}}else if(open<.55){this.candidate=0;this.active=false;}}
  if(now-this.lastSeen>.2){this.active=false;this.candidate=0;}
  this.visible+=(Number(this.active)-this.visible)*(1-Math.exp(-dt*10));if(this.active)this.elapsed+=dt;
 }
 reset(){this.active=false;this.elapsed=0;this.visible=0;this.candidate=0;this.lastSeen=-Infinity;}
}
export type PalmPose=CastPose&{rms:number;open:number};
