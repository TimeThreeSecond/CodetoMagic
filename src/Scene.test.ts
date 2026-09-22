import {describe,it,expect} from 'vitest';
import {visibleNodes} from './Scene';
import type {Fn,Node} from './analysis';
function node(i:number,kind='declaration'):Node{return {id:`n${i}`,kind,label:kind,range:{start:i*10,end:i*10+9,line:i+1,endLine:i+1},depth:0,family:'general',pointers:0};}
function fn(nodes:Node[]):Fn{return {id:'f',name:'main',range:{start:0,end:1000,line:1,endLine:100},nodes,order:0,reachable:true};}
describe('large-function aggregation',()=>{
 it('preserves branch and call glyphs while grouping ordinary runs',()=>{const f=fn([...Array.from({length:20},(_,i)=>node(i)),node(20,'if_statement'),node(21,'call_expression')]);const result=visibleNodes(f,null,10);expect(result.map(n=>n.kind)).toEqual(['group','if_statement','call_expression']);expect(result[0].members).toHaveLength(20);expect(result[0].range).toEqual({start:0,end:199,line:1,endLine:20});});
 it('expands only the requested group without losing source identities',()=>{const nodes=Array.from({length:20},(_,i)=>node(i));expect(visibleNodes(fn(nodes),'group-n0',10)).toEqual(nodes);});
 it('does not aggregate small functions',()=>{const nodes=[node(0),node(1)];expect(visibleNodes(fn(nodes),null,10)).toEqual(nodes);});
});
