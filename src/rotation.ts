import type {Fn} from './analysis';
/** Versioned visual fingerprint, not a claim about program semantics. */
export const ROTATION_RULE='code-features-v1';
export function featureDirection(features:string,channel:string):1|-1 {
 let hash=2166136261;
 for(const c of `${ROTATION_RULE}|${channel}|${features}`){hash=Math.imul(hash^c.charCodeAt(0),16777619);}
 hash^=hash>>>16;hash=Math.imul(hash,0x85ebca6b);hash^=hash>>>13;
 return (hash>>>0)%2===0?1:-1;
}
/** Excludes position, name, ID, reachability, caller and ring geometry. */
export function functionFeatures(fn:Fn){
 return JSON.stringify([fn.returnType?.replace(/\s+/g,' ').trim()||'',fn.nodes.map(n=>[n.kind,n.depth,n.family,n.pointers,n.sigils||[]])]);
}
export function functionDirection(fn:Fn,channel:'spin'|'orbit'='spin'){
 return featureDirection(functionFeatures(fn),channel);
}
/** Identical result types share direction and the existing common period. */
export function resultDirection(kind:string){return featureDirection(kind,'result');}
export function spin(time:number,period:number,direction:number){return time/period*360*direction;}
export const directionName=(direction:number)=>direction>0?'顺时针':'逆时针';
