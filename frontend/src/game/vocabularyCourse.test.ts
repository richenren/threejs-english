import {describe,it,expect} from 'vitest';
import {buildUnits,chapterCount,unitIndexForWord} from './vocabularyCourse';
import type {ContentItem} from '../domain';
const items=(n:number)=>Array.from({length:n},(_,i)=>({id:String(i),text:'word'+i,meaningCn:'词'+i,type:'WORD',assetKey:'',status:'READY'} as ContentItem));
describe('vocabulary course',()=>{
 it('splits published vocabulary into ten-word units',()=>{expect(buildUnits(items(25)).map(x=>x.length)).toEqual([10,10,5])});
 it('uses two hundred words per chapter',()=>expect(chapterCount(items(2000))).toBe(10));
 it('can locate a word unit',()=>expect(unitIndexForWord(items(25),'word17')).toBe(1));
});
