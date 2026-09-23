/** Stable by radius rank, never by visibility. Positive SVG angles are clockwise. */
export function ringDirection(rank:number,satellite=false):1|-1 {
 const direction=rank%2===0?1:-1;
 return satellite?(direction===1?-1:1):direction;
}
export function spin(time:number,period:number,direction:number){return time/period*360*direction;}
export const directionName=(direction:number)=>direction>0?'顺时针':'逆时针';
