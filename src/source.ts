import {analyzeCSource} from './analysis';
import {analyzePythonSource} from './pythonAnalysis';
import type {SourceLanguage} from './parser';

export type {SourceLanguage} from './parser';
export const languageLabel = (language: SourceLanguage) => language === 'python' ? 'Python' : 'C';
export const languageForFile = (name: string): SourceLanguage => /\.py$/i.test(name) ? 'python' : 'c';
export function analyzeSource(source: string, language: SourceLanguage) {
 return language === 'python' ? analyzePythonSource(source) : analyzeCSource(source);
}
