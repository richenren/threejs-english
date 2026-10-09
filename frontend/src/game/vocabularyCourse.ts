import type {ContentItem} from '../domain';
export const WORDS_PER_UNIT=10;
export const WORDS_PER_CHAPTER=200;
export interface VocabularyProgress{completedUnits:number[]}
const KEY='kid.vocabulary-library.progress.v1';
export function buildUnits(items:ContentItem[]){
 const ready=items.filter(x=>x.status==='READY');
 const units:ContentItem[][]=[];
 for(let i=0;i<ready.length;i+=WORDS_PER_UNIT)units.push(ready.slice(i,i+WORDS_PER_UNIT));
 return units;
}
export function chapterCount(items:ContentItem[]){return Math.max(1,Math.ceil(items.filter(x=>x.status==='READY').length/WORDS_PER_CHAPTER))}
export function loadVocabularyProgress():VocabularyProgress{try{const raw=localStorage.getItem(KEY);if(!raw)return{completedUnits:[]};const p=JSON.parse(raw);return{completedUnits:Array.isArray(p.completedUnits)?p.completedUnits.filter((x:any)=>Number.isInteger(x)&&x>=0):[]}}catch{return{completedUnits:[]}}}
export function saveVocabularyProgress(p:VocabularyProgress){localStorage.setItem(KEY,JSON.stringify(p))}
export function unitIndexForWord(items:ContentItem[],word:string){
 const ready=items.filter(x=>x.status==='READY');const i=ready.findIndex(x=>x.text.trim().toLowerCase()===word.trim().toLowerCase());
 return i<0?-1:Math.floor(i/WORDS_PER_UNIT);
}
