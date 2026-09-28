export const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
/** Quintic easing has zero velocity at both ends: no visible initial jump. */
export function unfold(elapsed:number,duration:number,index:number,count:number){
 const delay=count>1?index/(count-1)*duration*.3:0;
 const t=clamp((elapsed-delay)/(duration*.7));
 const eased=t*t*t*(t*(t*6-15)+10);
 return {scale:.025+.975*eased,opacity:eased};
}
