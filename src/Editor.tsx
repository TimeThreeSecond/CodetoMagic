import {useEffect,useRef} from 'react';
import {EditorView,Decoration,ViewPlugin,ViewUpdate} from '@codemirror/view';
import {StateEffect,StateField} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {cpp} from '@codemirror/lang-cpp';
import {HighlightStyle,syntaxHighlighting} from '@codemirror/language';
import {tags} from '@lezer/highlight';
const syntaxTheme=syntaxHighlighting(HighlightStyle.define([
 {tag:tags.keyword,color:'#c7b995'}, {tag:tags.typeName,color:'#93c7b5'},
 {tag:tags.string,color:'#bdcc91'}, {tag:tags.number,color:'#d3b887'},
 {tag:tags.comment,color:'#678579'}, {tag:tags.variableName,color:'#c6d5c8'},
 {tag:tags.function(tags.variableName),color:'#9ec6d9'}, {tag:tags.operator,color:'#a6ba9b'},
 {tag:tags.meta,color:'#849c8a'}
]));
const mark=StateEffect.define<{from:number;to:number}|null>();
const highlights=StateField.define({create:()=>Decoration.none,update(value,tr){value=value.map(tr.changes);for(const e of tr.effects)if(e.is(mark))value=e.value&&e.value.from<e.value.to?Decoration.set([Decoration.mark({class:'code-highlight'}).range(e.value.from,e.value.to)]):Decoration.none;return value;},provide:f=>EditorView.decorations.from(f)});
export function Editor({source,onChange,onPosition,selection}:{source:string;onChange:(s:string)=>void;onPosition:(p:number)=>void;selection:{start:number;end:number}|null}) {
 const host=useRef<HTMLDivElement>(null),view=useRef<EditorView|null>(null); const callbacks=useRef({onChange,onPosition});callbacks.current={onChange,onPosition};
 useEffect(()=>{const v=new EditorView({doc:source,parent:host.current!,extensions:[basicSetup,cpp(),highlights,EditorView.theme({'&':{height:'100%',backgroundColor:'#0e1818',color:'#b7c9c0'},'.cm-scroller':{fontFamily:'Consolas, monospace',fontSize:'12px'},'.cm-gutters':{backgroundColor:'#0e1818',color:'#4f6f64',border:'none'},'.cm-activeLine':{backgroundColor:'#172a25'},'.cm-activeLineGutter':{backgroundColor:'#172a25'},'&.cm-focused .cm-cursor':{borderLeftColor:'#b9e2bb'},'.cm-selectionBackground, &.cm-focused .cm-selectionBackground':{backgroundColor:'#28473d'},'.code-highlight':{backgroundColor:'#37513c',color:'#e3f1ba'}},{dark:true}),ViewPlugin.fromClass(class{update(u:ViewUpdate){if(u.docChanged)callbacks.current.onChange(u.state.doc.toString());if(u.selectionSet)callbacks.current.onPosition(u.state.selection.main.head);}})]});view.current=v;return()=>v.destroy();},[]);
 useEffect(()=>{const v=view.current;if(v&&v.state.doc.toString()!==source)v.dispatch({changes:{from:0,to:v.state.doc.length,insert:source}});},[source]);
 useEffect(()=>{view.current?.dispatch({effects:StateEffect.appendConfig.of(syntaxTheme)});},[]);
 useEffect(()=>{const v=view.current;if(!v)return;const valid=selection&&selection.end<=v.state.doc.length?{from:selection.start,to:selection.end}:null;v.dispatch({effects:[mark.of(valid),...(valid?[EditorView.scrollIntoView(valid.from,{y:'center'})]:[])]});},[selection]);
 return <div ref={host} className="editor-host"/>;
}
