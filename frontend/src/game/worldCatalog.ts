import type {ContentItem} from '../domain';

export type ThemeActivity='DISCOVER_CARDS'|'LISTEN_IMAGE'|'AUDIO_MATCH'|'COMMAND_IMAGE'|'MIXED_CHALLENGE';
export interface ThemeSeed {text:string;meaningCn:string;emoji:string}
export interface ThemeWorld {
 id:string;order:number;code:string;title:string;englishTitle:string;icon:string;description:string;
 stages:{id:string;code:string;title:string;subtitle:string;kind:ThemeActivity;goal:string}[];
 seeds:ThemeSeed[];
}
const stageSet=(prefix:string,worldNo:number)=>[
 {id:prefix+'-1',code:worldNo+'-1',title:'主题探索',subtitle:'先认识这些新朋友',kind:'DISCOVER_CARDS' as const,goal:'建立声音与主题视觉的第一次关联'},
 {id:prefix+'-2',code:worldNo+'-2',title:'听音找图',subtitle:'听到英语，找到正确图片',kind:'LISTEN_IMAGE' as const,goal:'从英语声音辨认词义'},
 {id:prefix+'-3',code:worldNo+'-3',title:'声音配对',subtitle:'看图片，找到正确声音',kind:'AUDIO_MATCH' as const,goal:'建立图片到英语声音的反向映射'},
 {id:prefix+'-4',code:worldNo+'-4',title:'听指令行动',subtitle:'听完整指令再选择',kind:'COMMAND_IMAGE' as const,goal:'把单词放进简单指令中理解'},
 {id:prefix+'-5',code:worldNo+'-5',title:'主题大挑战',subtitle:'混合方式完成复习',kind:'MIXED_CHALLENGE' as const,goal:'跨题型检查是否真正理解'}
];
export const themeWorlds:ThemeWorld[]=[
 {id:'home-world',order:2,code:'WORLD 2',title:'温馨家庭',englishTitle:'HOME WORLD',icon:'🏠',description:'在熟悉的家里认识家具和生活物品。',stages:stageSet('home-2',2),seeds:[
  {text:'bed',meaningCn:'床',emoji:'🛏️'},{text:'chair',meaningCn:'椅子',emoji:'🪑'},{text:'table',meaningCn:'桌子',emoji:'🛋️'},{text:'lamp',meaningCn:'灯',emoji:'💡'},{text:'door',meaningCn:'门',emoji:'🚪'},{text:'window',meaningCn:'窗户',emoji:'🪟'},{text:'clock',meaningCn:'钟',emoji:'🕒'},{text:'book',meaningCn:'书',emoji:'📘'}
 ]},
 {id:'animal-world',order:3,code:'WORLD 3',title:'动物乐园',englishTitle:'ANIMAL WORLD',icon:'🐾',description:'和各种小动物交朋友，反复听、认、用。',stages:stageSet('animal-3',3),seeds:[
  {text:'cat',meaningCn:'猫',emoji:'🐱'},{text:'dog',meaningCn:'狗',emoji:'🐶'},{text:'rabbit',meaningCn:'兔子',emoji:'🐰'},{text:'duck',meaningCn:'鸭子',emoji:'🦆'},{text:'bird',meaningCn:'鸟',emoji:'🐦'},{text:'fish',meaningCn:'鱼',emoji:'🐟'},{text:'monkey',meaningCn:'猴子',emoji:'🐵'},{text:'elephant',meaningCn:'大象',emoji:'🐘'}
 ]},
 {id:'school-world',order:4,code:'WORLD 4',title:'快乐学校',englishTitle:'SCHOOL WORLD',icon:'🎒',description:'把孩子每天都会看到的学习用品变成英语任务。',stages:stageSet('school-4',4),seeds:[
  {text:'pencil',meaningCn:'铅笔',emoji:'✏️'},{text:'ruler',meaningCn:'尺子',emoji:'📏'},{text:'eraser',meaningCn:'橡皮',emoji:'🧽'},{text:'bag',meaningCn:'书包',emoji:'🎒'},{text:'desk',meaningCn:'课桌',emoji:'🪑'},{text:'book',meaningCn:'书',emoji:'📗'},{text:'teacher',meaningCn:'老师',emoji:'🧑‍🏫'},{text:'classroom',meaningCn:'教室',emoji:'🏫'}
 ]}
];
export interface ThemeProgress{unlockedStage:number;bestStars:Record<string,number>;completed:boolean}
const key=(id:string)=>'kid.theme-world.progress.v1:'+id;
export function loadThemeProgress(id:string):ThemeProgress{try{const raw=localStorage.getItem(key(id));if(!raw)return{unlockedStage:0,bestStars:{},completed:false};const p=JSON.parse(raw);return{unlockedStage:Math.min(4,Math.max(0,p.unlockedStage??0)),bestStars:p.bestStars??{},completed:Boolean(p.completed)}}catch{return{unlockedStage:0,bestStars:{},completed:false}}}
export function saveThemeProgress(id:string,p:ThemeProgress){localStorage.setItem(key(id),JSON.stringify(p))}
export function themeSeedItems(world:ThemeWorld,published:ContentItem[]):ContentItem[]{
 const byText=new Map(published.filter(x=>x.status==='READY').map(x=>[x.text.trim().toLowerCase(),x]));
 return world.seeds.map(seed=>byText.get(seed.text)||{id:'builtin-'+world.id+'-'+seed.text,text:seed.text,meaningCn:seed.meaningCn,type:'WORD',assetKey:'',status:'READY'});
}
export function emojiFor(world:ThemeWorld,text:string){return world.seeds.find(x=>x.text===text.toLowerCase())?.emoji??'✨'}
