import Parser from 'web-tree-sitter';
import {sourceParser, type SourceLanguage} from './parser';
import {sigils} from './sigils';

type N = Parser.SyntaxNode;
export type Range = {start: number; end: number; line: number; endLine: number};
export type Node = {id: string; kind: string; label: string; range: Range; depth: number; family: string; target?: string; targetId?: string; pointers: number; sigils?:string[]};
export type Fn = {id: string; name: string; range: Range; nodes: Node[]; order: number; reachable: boolean; returnType?:string};
export type Model = {sourceHash: string; semanticHash: string; functions: Fn[]; trace: string[]; diagnostics: Range[]; directives: string[]; language?: SourceLanguage; entryId?: string};
export function entryFunction(model: Model) {
 return model.functions.find(f=>f.id===model.entryId)||model.functions.find(f=>f.name==='main')||model.functions.find(f=>f.id!=='globals');
}
/** Python's empty targetId explicitly denotes an unresolved dynamic call. */
export function calledFunction(model: Pick<Model,'functions'>, node: Node) {
 return node.targetId !== undefined ? model.functions.find(f=>f.id===node.targetId) : model.functions.find(f=>f.name===node.target);
}
export function family(name: string) {
 if (/^(malloc|calloc|realloc|free|memcpy|memset|memmove)$/.test(name)) return 'memory';
 if (/^(fopen|fclose|fread|fwrite|fseek|fprintf|fscanf)$/.test(name)) return 'file';
 if (/^(printf|scanf|puts|putchar|getchar|fgets)$/.test(name)) return 'io';
 if (/^(strlen|strcmp|strcpy|strcat|strstr|strncmp|strncpy)$/.test(name)) return 'string';
 if (/^(sin|cos|tan|sqrt|pow|exp|log|fabs|floor|ceil)$/.test(name)) return 'math';
 return 'general';
}
const meaningful = new Set(['declaration','expression_statement','if_statement','switch_statement','case_statement','for_statement','while_statement','do_statement','call_expression','return_statement','break_statement','continue_statement','goto_statement','struct_specifier']);
function countPointers(n:N):number {return (n.type==='pointer_declarator'?1:0)+n.namedChildren.reduce((sum,c)=>sum+countPointers(c),0);}
function lexicalSigils(n:N):string[]{const out:string[]=[];function scan(c:N){if(c!==n&&meaningful.has(c.type))return;if(!c.childCount){if(sigils[c.text]&&!['identifier','field_identifier','string_content','comment'].includes(c.type))out.push(c.text);}else c.children.forEach(scan);}scan(n);return out;}
function declaredName(n: N | null): string {if (!n) return ''; if(n.type === 'identifier') return n.text; return declaredName(n.childForFieldName('declarator'));}
export async function hash(s: string) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function analyzeCSource(source: string): Promise<Model> {
 const p = await sourceParser('c'); const tree = p.parse(source); const root = tree.rootNode;
 const range = (n: N): Range => ({start:n.startIndex,end:n.endIndex,line:n.startPosition.row+1,endLine:n.endPosition.row+1});
 const diagnostics: Range[]=[]; const directives:string[]=[];
 function inspect(n:N) {if(n.type==='ERROR'||n.isMissing()) diagnostics.push(range(n)); if(n.type.startsWith('preproc_')) directives.push(n.text.split('\n')[0]); n.children.forEach(inspect);}
 inspect(root);
 const defs = root.namedChildren.filter(n=>n.type==='function_definition');
 const functions: Fn[] = defs.map((f,i)=>{
  const fn:Fn={id:`f${i}`,name:declaredName(f.childForFieldName('declarator'))||`function_${i}`,returnType:f.childForFieldName('type')?.text,range:range(f),nodes:[],order:i,reachable:false};
  function walk(n:N,depth:number) {
   const selected=meaningful.has(n.type)||n.type==='ERROR';
   if(selected){const target=n.type==='call_expression'?n.childForFieldName('function')?.text:undefined;
    fn.nodes.push({id:`f${i}n${fn.nodes.length}`,kind:n.type,label:target||n.type.replaceAll('_',' '),range:range(n),depth,family:target?family(target):'general',target,pointers:n.type==='declaration'?countPointers(n):0,sigils:lexicalSigils(n)});}
   n.namedChildren.forEach(child=>walk(child,depth+(selected?1:0)));
  }
  const body=f.childForFieldName('body'); if(body) walk(body,0); return fn;
 });
 const globals = root.namedChildren.filter(n=>n.type!=='function_definition'&&!n.type.startsWith('preproc_')&&n.type!=='comment');
 if(globals.length) functions.push({id:'globals',name:'全局声明',range:{start:0,end:source.length,line:1,endLine:source.split('\n').length},order:0,reachable:false,nodes:globals.map((n,i)=>({id:`gn${i}`,kind:n.type,label:n.type,range:range(n),depth:0,family:'general',pointers:0}))});
 const trace:string[]=[]; const visited=new Set<string>();
 function visit(fn:Fn){if(visited.has(fn.id))return;visited.add(fn.id);fn.reachable=true;fn.order=visited.size; for(const n of fn.nodes){trace.push(n.id); if(n.target){const callee=functions.find(f=>f.name===n.target);if(callee)visit(callee);}}}
 const entry=functions.find(f=>f.name==='main')||functions.find(f=>f.id!=='globals'); if(entry)visit(entry);
 // Canonical identifier bindings preserve relationships while ignoring spelling.
 const names=new Map<string,number>();
 function canonical(n:N):unknown {
  if(n.type==='comment')return null;
  if(n.type==='identifier'||n.type==='field_identifier'||n.type==='type_identifier') {if(!names.has(n.text))names.set(n.text,names.size);return [n.type,names.get(n.text)];}
  if(!n.childCount)return [n.type,n.text];
  return [n.type,...n.children.map(canonical).filter(v=>v!==null)];
 }
 const canonicalText=JSON.stringify(canonical(root)); tree.delete();
 return {sourceHash:await hash(source),semanticHash:await hash(canonicalText),functions,trace,diagnostics,directives:[...new Set(directives)]};
}
