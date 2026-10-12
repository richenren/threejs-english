export type KitchenStageKind='EXPLORE_3D'|'LISTEN_IMAGE'|'AUDIO_MATCH'|'COMMAND_3D'|'MIXED_CHALLENGE';
export interface KitchenStage {
  id:string;
  order:number;
  code:string;
  title:string;
  subtitle:string;
  kind:KitchenStageKind;
  icon:string;
  intro:string;
  learningGoal:string;
}
export const KITCHEN_WORLD_ID='kitchen-world';
export const kitchenStages:KitchenStage[]=[
  {id:'kitchen-1-1',order:1,code:'1-1',title:'厨房探索',subtitle:'认识新朋友',kind:'EXPLORE_3D',icon:'🔎',intro:'在厨房里自由探索，点一点桌上的物品，听听它们的英文名字。',learningGoal:'建立英语声音与真实场景物品的第一次关联'},
  {id:'kitchen-1-2',order:2,code:'1-2',title:'听音找卡片',subtitle:'离开固定位置也能认出来',kind:'LISTEN_IMAGE',icon:'🃏',intro:'听到一个单词后，从卡片里找到正确的图片。',learningGoal:'验证儿童是否脱离3D位置线索仍能理解词义'},
  {id:'kitchen-1-3',order:3,code:'1-3',title:'声音配对',subtitle:'看图片，找对声音',kind:'AUDIO_MATCH',icon:'🎧',intro:'先看图片，再试听不同声音，选出和图片对应的英文。',learningGoal:'建立图片到英语声音的反向映射，巩固词义'},
  {id:'kitchen-1-4',order:4,code:'1-4',title:'听指令行动',subtitle:'把单词放进简单指令里',kind:'COMMAND_3D',icon:'👉',intro:'听乐乐说完整的小指令，再到3D厨房里完成任务。',learningGoal:'从孤立单词过渡到简单英语指令理解'},
  {id:'kitchen-1-5',order:5,code:'1-5',title:'厨房大挑战',subtitle:'3D与卡片混合复习',kind:'MIXED_CHALLENGE',icon:'🏆',intro:'最后一关会混合出现3D找物和图片卡片，看看你是不是真的学会啦！',learningGoal:'跨表现形式检查理解，降低位置记忆与题型记忆'}
];
export interface KitchenProgress {unlockedStage:number;bestStars:Record<string,number>;completed:boolean}
export const initialKitchenProgress=():KitchenProgress=>({unlockedStage:0,bestStars:{},completed:false});
export function loadKitchenProgress():KitchenProgress{
  try{
    const raw=localStorage.getItem('kid.kitchen-world.progress.v1');
    if(!raw)return initialKitchenProgress();
    const parsed=JSON.parse(raw) as Partial<KitchenProgress>;
    return {unlockedStage:Math.min(4,Math.max(0,parsed.unlockedStage??0)),bestStars:parsed.bestStars??{},completed:Boolean(parsed.completed)};
  }catch{return initialKitchenProgress()}
}
export function saveKitchenProgress(progress:KitchenProgress){localStorage.setItem('kid.kitchen-world.progress.v1',JSON.stringify(progress))}
