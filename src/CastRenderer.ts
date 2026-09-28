import * as T from 'three';
import type {CastingAsset} from './castingAsset';
import {unfold} from './castingMath';
export type CastPose={position:T.Vector3;rotation:T.Quaternion};
export type CastSettings={size:number;spacing:number;offset:number;fov:number;duration:number;flip:boolean;pitch:number;yaw:number;roll:number;reverse:boolean;solo:number;glow:number;order:number[]};
export class CastRenderer{
 readonly renderer:T.WebGLRenderer;
 readonly camera=new T.PerspectiveCamera(50,1,.05,100);
 private scene=new T.Scene();private root=new T.Group();private meshes:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>[]=[];
 private disposed=false;private pending:Promise<void>|null=null;private observer:ResizeObserver;
 private pose:CastPose={position:new T.Vector3(0,0,-8),rotation:new T.Quaternion()};
 constructor(readonly host:HTMLElement,readonly asset:CastingAsset){
  this.renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0,0);host.append(this.renderer.domElement);
  this.scene.add(this.root);
  this.meshes=asset.layers.map(()=>{const material=new T.MeshBasicMaterial({transparent:true,depthWrite:false,side:T.DoubleSide});const mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);this.root.add(mesh);return mesh;});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 async textures(time:number,resolution=1024){
  if(this.pending)await this.pending;if(this.disposed)return;
  const task=(async()=>{for(let i=0;i<this.meshes.length;i++){
   const url=URL.createObjectURL(new Blob([this.asset.frame(time,i)],{type:'image/svg+xml'}));
   try{const img=new Image();img.src=url;await img.decode();if(this.disposed)return;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=resolution;canvas.getContext('2d')!.drawImage(img,0,0,resolution,resolution);
    const old=this.meshes[i].material.map;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
    this.meshes[i].material.map=texture;this.meshes[i].material.needsUpdate=true;old?.dispose();
   }finally{URL.revokeObjectURL(url);}
  }})();this.pending=task;try{await task;}finally{if(this.pending===task)this.pending=null;}
 }
 draw(settings:CastSettings,pose:CastPose,elapsed:number,visibility:number,dt:number,snap=false){
  if(this.disposed)return;
  const a=snap?1:1-Math.exp(-dt*14);this.pose.position.lerp(pose.position,a);this.pose.rotation.slerp(pose.rotation,a);
  this.root.position.copy(this.pose.position);this.root.quaternion.copy(this.pose.rotation);
  this.root.quaternion.multiply(new T.Quaternion().setFromEuler(new T.Euler(settings.pitch*Math.PI/180,settings.yaw*Math.PI/180,settings.roll*Math.PI/180)));
  if(settings.flip)this.root.rotateY(Math.PI);
  this.camera.fov=settings.fov;this.camera.updateProjectionMatrix();
  this.meshes.forEach((mesh,i)=>{const base=settings.order.indexOf(i)>=0?settings.order.indexOf(i):i,rank=settings.reverse?this.meshes.length-1-base:base,u=unfold(elapsed,settings.duration,rank,this.meshes.length);
   mesh.position.z=settings.offset+rank*settings.spacing;mesh.scale.setScalar(settings.size*2*u.scale);mesh.material.opacity=u.opacity*visibility;
   mesh.material.color.setScalar(1+settings.glow);mesh.visible=settings.solo<0||settings.solo===i;
  });
  // Explicit far-to-near ordering for transparent parallel planes.
  const sorted=[...this.meshes].sort((a,b)=>a.getWorldPosition(new T.Vector3()).z-b.getWorldPosition(new T.Vector3()).z);sorted.forEach((m,i)=>m.renderOrder=i);
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.disposed=true;this.observer.disconnect();for(const mesh of this.meshes){mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();}this.renderer.dispose();this.renderer.domElement.remove();}
}
