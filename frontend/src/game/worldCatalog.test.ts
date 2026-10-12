import {describe,it,expect,vi,beforeEach} from 'vitest';
import {themeWorlds} from './worldCatalog';

describe('theme world catalog',()=>{
 beforeEach(()=>{vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{},removeItem:()=>{}})});
 it('provides three follow-up worlds in sequence',()=>{
  expect(themeWorlds.map(x=>x.id)).toEqual(['home-world','animal-world','school-world']);
  expect(themeWorlds.every(x=>x.stages.length===5)).toBe(true);
 });
 it('keeps eight starter concepts per follow-up world',()=>{
  expect(themeWorlds.every(x=>x.seeds.length===8)).toBe(true);
 });
});
