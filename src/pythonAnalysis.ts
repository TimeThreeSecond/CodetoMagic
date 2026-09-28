import type Parser from 'web-tree-sitter';
import {sourceParser} from './parser';
import {hash, calledFunction, type Fn, type Model, type Node, type Range} from './analysis';
import {sigils} from './sigils';

type N = Parser.SyntaxNode;
type Binding = {fn?: Fn; external?: string; classScope?: Scope} | null;
type Scope = {parent?: Scope; prefix: string; bindings: Map<string, Binding>; classScope?: Scope};
type Definition = {node: N; fn: Fn; scope: Scope};
const kinds: Record<string, string> = {
 if_statement: 'if_statement', elif_clause: 'if_statement', conditional_expression: 'if_statement',
 for_statement: 'for_statement', for_in_clause: 'for_statement', while_statement: 'while_statement',
 match_statement: 'switch_statement', case_clause: 'case_statement', if_clause: 'if_statement',
 return_statement: 'return_statement', break_statement: 'break_statement', continue_statement: 'continue_statement',
 call: 'call_expression', class_definition: 'struct_specifier', named_expression: 'declaration',
 import_statement: 'declaration', import_from_statement: 'declaration', future_import_statement: 'declaration',
 global_statement: 'declaration', nonlocal_statement: 'declaration', type_alias_statement: 'declaration',
 try_statement: 'try_statement', except_clause: 'except_clause', finally_clause: 'finally_clause',
 with_statement: 'with_statement', raise_statement: 'raise_statement', assert_statement: 'if_statement',
 yield: 'yield_statement', await: 'await_expression', lambda: 'lambda_expression',
 delete_statement: 'expression_statement', pass_statement: 'expression_statement', interpolation: 'expression_statement', ERROR: 'ERROR'
};
function kind(n: N): string | undefined {
 if(n.type === 'expression_statement') return n.namedChildren[0]?.type === 'assignment' ? 'declaration' : 'expression_statement';
 return kinds[n.type];
}
function range(n: N): Range {
 return {start:n.startIndex, end:n.endIndex, line:n.startPosition.row+1, endLine:n.endPosition.row+1};
}
function unwrap(n: N) {return n.type === 'decorated_definition' ? n.childForFieldName('definition') || n : n;}
function lookup(scope: Scope, name: string): Binding | undefined {
 for(let s: Scope | undefined = scope; s; s = s.parent) if(s.bindings.has(name)) return s.bindings.get(name);
}
function identifiers(n: N | null): string[] {
 if(!n) return [];
 if(n.type === 'identifier') return [n.text];
 // Do not turn obj.attr or xs[i] writes into local variable bindings.
 if(['attribute','subscript'].includes(n.type)) return [];
 return n.namedChildren.flatMap(identifiers);
}
function lexicalSigils(n: N): string[] {
 const out: string[] = [];
 function scan(c: N) {
  if(c !== n && kind(c)) return;
  if(c.type === 'comment' || c.type === 'string') return; // includes f-string text, not interpolated calls
  if(!c.childCount) {if(sigils[c.text] && c.type !== 'identifier') out.push(c.text);}
  else c.children.forEach(scan);
 }
 scan(n);
 return out;
}
function callFamily(name: string): string {
 if(/^(print|input)$/.test(name)) return 'io';
 if(/^open$|^(io|pathlib)\./.test(name)) return 'file';
 if(/^(math|cmath|decimal|fractions|statistics)\.|^(abs|round|sum|min|max|pow|divmod|int|float|complex)$/.test(name)) return 'math';
 if(/^str$|^string\./.test(name)) return 'string';
 return 'general';
}

/** Conservative literal/annotation hints, not execution or Python type checking. */
function inferReturnType(def: Definition): string | undefined {
 const annotation = def.node.childForFieldName('return_type');
 if(annotation) return annotation.text.replace(/^['"]|['"]$/g, '');
 const values = new Map<string, Set<string | undefined>>(), returns: N[] = [];
 const literalTypes: Record<string,string> = {integer:'int', float:'float', true:'bool', false:'bool', string:'str',
  list:'list', list_comprehension:'list', dictionary:'dict', dictionary_comprehension:'dict',
  set:'set', set_comprehension:'set', tuple:'tuple', expression_list:'tuple', none:'None'};
 const literal = (n: N | null): string | undefined => {
  if(!n) return 'None';
  if(literalTypes[n.type]) return literalTypes[n.type];
  if(n.type === 'parenthesized_expression' || n.type === 'unary_operator') return literal(n.namedChildren[0]);
  return undefined;
 };
 function collect(n: N) {
  if(['function_definition','class_definition','lambda'].includes(n.type)) return;
  if(n.type === 'assignment') for(const name of identifiers(n.childForFieldName('left'))) {
   const types = values.get(name) || new Set(); types.add(literal(n.childForFieldName('right'))); values.set(name, types);
  }
  if(n.type === 'return_statement') returns.push(n);
  n.namedChildren.forEach(collect);
 }
 const body = def.node.childForFieldName('body'); if(body) collect(body);
 const types = new Set(returns.map(n=>{
  const value = n.namedChildren[0];
  if(value?.type === 'identifier') {const t = values.get(value.text);return t?.size === 1 ? [...t][0] : undefined;}
  return literal(value);
 }));
 return types.size === 1 && !types.has(undefined) ? [...types][0] : undefined;
}

export async function analyzePythonSource(source: string): Promise<Model> {
 const parser = await sourceParser('python'), tree = parser.parse(source), root = tree.rootNode;
 try {
  const diagnostics: Range[] = [], directives: string[] = [], definitions: Definition[] = [];
  const moduleScope: Scope = {prefix:'', bindings:new Map()};
  const comprehensions = new Set(['list_comprehension','dictionary_comprehension','set_comprehension','generator_expression']);
  function inspect(n: N) {
   if(n.type === 'ERROR' || n.isMissing()) diagnostics.push(range(n));
   if(/^(import_statement|import_from_statement|future_import_statement)$/.test(n.type)) directives.push(n.text);
   n.children.forEach(inspect);
  }
  inspect(root);
  function discover(n: N, scope: Scope) {
   const d = unwrap(n);
   if(d.type === 'function_definition') {
    const name = d.childForFieldName('name')?.text || `function_${definitions.length}`;
    const fn: Fn = {id:`pf${definitions.length}`, name:scope.prefix+name, range:range(n), nodes:[], order:definitions.length, reachable:false};
    scope.bindings.set(name, {fn});
    // Methods do not lexically inherit class attributes; self/cls use a separate lookup.
    const local: Scope = {prefix:fn.name+'.', parent:scope.classScope === scope ? scope.parent : scope,
     bindings:new Map(), classScope:scope.classScope};
    definitions.push({node:d, fn, scope:local});
    const body = d.childForFieldName('body'); if(body) body.namedChildren.forEach(c=>discover(c,local));
    return;
   }
   if(d.type === 'class_definition') {
    const name = d.childForFieldName('name')?.text || 'class';
    const local: Scope = {prefix:scope.prefix+name+'.', parent:scope, bindings:new Map()}; local.classScope = local;
    scope.bindings.set(name, {classScope:local});
    const body = d.childForFieldName('body'); if(body) body.namedChildren.forEach(c=>discover(c,local));
    return;
   }
   d.namedChildren.forEach(c=>discover(c,scope));
  }
  root.namedChildren.forEach(n=>discover(n,moduleScope));

  // Bind imports and obvious local names before resolving calls (Python local scopes
  // apply to the whole function). Unknown/dynamic aliases deliberately stay external.
  function bindings(n: N, scope: Scope) {
   const d = unwrap(n);
   if(['function_definition','class_definition','lambda'].includes(d.type) || comprehensions.has(d.type)) return;
   if(/^(import_statement|import_from_statement|future_import_statement)$/.test(d.type)) {
    const from = d.childForFieldName('module_name')?.text;
    for(const child of d.namedChildren) {
     if(child.id === d.childForFieldName('module_name')?.id || child.type === 'relative_import') continue;
     const name = child.type === 'aliased_import' ? child.childForFieldName('name')?.text : child.text;
     const alias = child.childForFieldName('alias')?.text;
     if(name && name !== '*') scope.bindings.set(alias || (from ? name : name.split('.')[0]), {external:from ? `${from}.${name}` : alias ? name : name.split('.')[0]});
    }
    return;
   }
   if(['assignment','augmented_assignment','named_expression','for_statement','for_in_clause'].includes(d.type)) {
    const left = d.childForFieldName('left') || d.childForFieldName('name');
    identifiers(left).forEach(name=>scope.bindings.set(name,null));
   }
   if(d.type==='as_pattern') identifiers(d.childForFieldName('alias')).forEach(name=>scope.bindings.set(name,null));
   d.namedChildren.forEach(c=>bindings(c,scope));
  }
  bindings(root,moduleScope);
  for(const def of definitions) {
   const params = def.node.childForFieldName('parameters');
   for(const param of params?.namedChildren || []) {
    const name = param.type === 'identifier' ? param : param.childForFieldName('name') || param.namedChildren[0];
    if(name?.type === 'identifier') def.scope.bindings.set(name.text,null);
   }
   const body = def.node.childForFieldName('body'); if(body) bindings(body,def.scope);
   def.fn.returnType = inferReturnType(def);
  }
  function resolve(n: N, scope: Scope): {target: string; targetId: string; family: string} {
   const callable = n.childForFieldName('function'), raw = callable?.text || 'call';
   let binding: Binding | undefined, api = raw;
   if(callable?.type === 'identifier') binding = lookup(scope,raw);
   else if(callable?.type === 'attribute') {
    const object = callable.childForFieldName('object'), attribute = callable.childForFieldName('attribute')?.text;
    if(object && attribute) {
     if(['self','cls'].includes(object.text) && scope.classScope) binding = scope.classScope.bindings.get(attribute);
     else {
      const b = lookup(scope,object.text);
      if(b?.external) api = `${b.external}.${attribute}`;
      // A known class binding is required: a same-named parameter/instance is
      // not proof that a method target is statically known.
      if(b?.classScope) binding = b.classScope.bindings.get(attribute);
     }
    }
   }
   if(binding?.fn) return {target:binding.fn.name, targetId:binding.fn.id, family:'general'};
   if(binding?.external) api = binding.external;
   return {target:raw, targetId:'', family:binding === null ? 'general' : callFamily(api)};
  }
  function walk(n: N, fn: Fn, scope: Scope, depth: number) {
   if(n.type === 'comment') return;
   if(comprehensions.has(n.type)) {
    const local: Scope = {prefix:scope.prefix, parent:scope, bindings:new Map(), classScope:scope.classScope};
    for(const clause of n.namedChildren.filter(c=>c.type==='for_in_clause'))
     identifiers(clause.childForFieldName('left')).forEach(name=>local.bindings.set(name,null));
    n.namedChildren.forEach(c=>walk(c,fn,local,depth)); return;
   }
   const d = unwrap(n);
   // Definitions have their own function rings. Keep the binding, never duplicate bodies.
   if(d.type === 'function_definition') {
    fn.nodes.push({id:`${fn.id}n${fn.nodes.length}`, kind:'declaration', label:`def ${d.childForFieldName('name')?.text || ''}`,
     range:range(n), depth, family:'general', pointers:0, sigils:['def']}); return;
   }
   const selected = kind(n);
   if(selected) {
    const call = n.type === 'call' ? resolve(n,scope) : undefined;
    fn.nodes.push({id:`${fn.id}n${fn.nodes.length}`, kind:selected, label:call?.target || n.type.replaceAll('_',' '),
     range:range(n), depth, family:call?.family || 'general', pointers:0, sigils:lexicalSigils(n), ...call});
   }
   if(n.type === 'class_definition') {
    const bases = n.childForFieldName('superclasses'); if(bases) walk(bases,fn,scope,depth+1); return;
   }
   if(n.type === 'lambda') {
    const local: Scope = {prefix:scope.prefix, parent:scope, bindings:new Map(), classScope:scope.classScope};
    for(const param of n.childForFieldName('parameters')?.namedChildren || []) {
     const name = param.type==='identifier' ? param : param.childForFieldName('name') || param.namedChildren[0];
     if(name?.type==='identifier') local.bindings.set(name.text,null);
    }
    const body=n.childForFieldName('body');if(body) walk(body,fn,local,depth+1);return;
   }
   n.namedChildren.forEach(c=>walk(c,fn,scope,depth+(selected?1:0)));
  }
  for(const def of definitions) {const body = def.node.childForFieldName('body');if(body) walk(body,def.fn,def.scope,0);}
  const functions = definitions.map(d=>d.fn);
  const moduleNodes = root.namedChildren.filter(n=>unwrap(n).type !== 'function_definition' && n.type !== 'comment');
  if(moduleNodes.length) {
   const module: Fn = {id:'module', name:'模块入口', range:{start:0,end:source.length,line:1,endLine:source.split('\n').length},
    nodes:[], order:0, reachable:false};
   moduleNodes.forEach(n=>walk(n,module,moduleScope,0)); functions.push(module);
  }
  const entry = functions.find(f=>f.id === 'module') || functions.find(f=>f.name === 'main') || functions[0];
  const trace: string[] = [], visited = new Set<string>();
  function visit(fn: Fn) {
   if(visited.has(fn.id)) return;
   visited.add(fn.id); fn.reachable = true; fn.order = visited.size;
   for(const n of fn.nodes) {trace.push(n.id);const callee = calledFunction({functions},n);if(callee) visit(callee);}
  }
  if(entry) visit(entry);
  const names = new Map<string,number>();
  function canonical(n: N): unknown {
   if(n.type === 'comment') return null;
   if(n.type === 'identifier') {if(!names.has(n.text)) names.set(n.text,names.size);return [n.type,names.get(n.text)];}
   if(!n.childCount) return [n.type,n.text];
   return [n.type,...n.children.map(canonical).filter(v=>v !== null)];
  }
  return {language:'python', entryId:entry?.id, sourceHash:await hash(source), semanticHash:await hash(JSON.stringify(canonical(root))),
   functions, trace, diagnostics, directives:[...new Set(directives)]};
 } finally {tree.delete();}
}
