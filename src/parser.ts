import Parser from 'web-tree-sitter';
import runtimeUrl from 'web-tree-sitter/tree-sitter.wasm?url';
import cUrl from 'tree-sitter-wasms/out/tree-sitter-c.wasm?url';
import pythonUrl from 'tree-sitter-wasms/out/tree-sitter-python.wasm?url';

export type SourceLanguage = 'c' | 'python';
let runtime: Promise<void> | undefined;
const parsers: Partial<Record<SourceLanguage, Promise<Parser>>> = {};

/** One WASM runtime, separate cached grammars; parsing itself is synchronous. */
export function sourceParser(language: SourceLanguage): Promise<Parser> {
 return parsers[language] ??= (async () => {
  await (runtime ??= Parser.init({locateFile: () => runtimeUrl}));
  const parser = new Parser();
  parser.setLanguage(await Parser.Language.load(language === 'c' ? cUrl : pythonUrl));
  return parser;
 })();
}
