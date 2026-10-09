<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,onMounted,ref} from 'vue';
import {useRouter} from 'vue-router';
import {KitchenScene} from '../game/KitchenScene';
import {starterItems,type AttemptEvent,type ContentItem} from '../domain';
import {db,queueAttempt,syncAttempts} from '../offline/db';
import {latestPackage} from '../api';
import {nextHint,type HintLevel} from '../game/rules';
import {vocabularyImage} from '../assets/vocabulary';
import {KITCHEN_WORLD_ID,kitchenStages,loadKitchenProgress,saveKitchenProgress,type KitchenProgress} from '../game/kitchenWorld';

type Phase='loading'|'intro'|'playing'|'celebrating'|'complete';
const router=useRouter();
const sceneHost=ref<HTMLElement>();const phase=ref<Phase>('loading');const items=ref<ContentItem[]>([]);
const stageIndex=ref(0);const round=ref(0);const hint=ref<HintLevel>(0);const mistakes=ref(0);const stageStars=ref(0);const earned=ref(0);
const message=ref('准备好探险了吗？');const soundEnabled=ref(true);const options=ref<ContentItem[]>([]);const selectedAudioKey=ref('');
const discoveredKeys=ref<string[]>([]);const progressState=ref<KitchenProgress>({unlockedStage:0,bestStars:{},completed:false});
let scene:KitchenScene|undefined;let packageVersion='starter-1';let sessionId=crypto.randomUUID();let started=0;
let advanceTimer:ReturnType<typeof setTimeout>|undefined;let speakingTimer:ReturnType<typeof setTimeout>|undefined;
const stage=computed(()=>kitchenStages[stageIndex.value]);const current=computed(()=>items.value[round.value%Math.max(items.value.length,1)]);
const canPlay=computed(()=>phase.value==='playing');const isCardRound=computed(()=>stage.value.kind==='LISTEN_IMAGE'||(stage.value.kind==='MIXED_CHALLENGE'&&round.value%2===1));
const isAudioMatch=computed(()=>stage.value.kind==='AUDIO_MATCH');const isSceneRound=computed(()=>stage.value.kind==='COMMAND_3D'||(stage.value.kind==='MIXED_CHALLENGE'&&round.value%2===0));
const totalRounds=computed(()=>stage.value.kind==='EXPLORE_3D'?items.value.length:items.value.length);
const stageProgress=computed(()=>stage.value.kind==='EXPLORE_3D'?(discoveredKeys.value.length/Math.max(items.value.length,1))*100:(phase.value==='complete'?100:(round.value/Math.max(totalRounds.value,1))*100));
const worldStars=computed(()=>Object.values(progressState.value.bestStars).reduce((a,b)=>a+b,0));
const maxWorldStars=(kitchenStages.length-1)*items.value.length*3;
function speak(text=current.value?.text??''){if(!soundEnabled.value||!text||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-US';u.rate=.82;u.pitch=1.06;window.speechSynthesis.speak(u)}
function instruction(){const item=current.value;if(!item)return'';return round.value%2===0?'Find the '+item.text+'.':'Touch the '+item.text+'.'}
function speakTask(){speak(isSceneRound.value?instruction():current.value?.text)}
function toggleSound(){soundEnabled.value=!soundEnabled.value;if(!soundEnabled.value)window.speechSynthesis?.cancel()}
function shuffle<T>(values:T[],seed:number){const a=[...values];for(let i=a.length-1;i>0;i--){const j=(seed*17+i*7+round.value*11)% (i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function prepareOptions(){if(!current.value){options.value=[];return}const rest=items.value.filter(x=>x.id!==current.value.id);options.value=shuffle([current.value,...shuffle(rest,stageIndex.value+3).slice(0,2)],stageIndex.value+round.value+5);selectedAudioKey.value=''}
function clearTimers(){if(advanceTimer)clearTimeout(advanceTimer);if(speakingTimer)clearTimeout(speakingTimer)}
function resetRound(){hint.value=0;mistakes.value=0;earned.value=0;started=performance.now();phase.value='playing';prepareOptions();message.value=isAudioMatch.value?'看看图片，试听下面的声音，再选出正确答案。':isSceneRound.value?'听完整指令，再到厨房里完成任务。':'仔细听，从卡片中找到正确图片！';speakingTimer=setTimeout(()=>speakTask(),350)}
function openStage(index:number){if(index>progressState.value.unlockedStage||phase.value==='celebrating')return;clearTimers();stageIndex.value=index;round.value=0;stageStars.value=0;earned.value=0;selectedAudioKey.value='';discoveredKeys.value=[];sessionId=crypto.randomUUID();phase.value='intro';message.value=stage.value.intro}
function beginStage(){sessionId=crypto.randomUUID();stageStars.value=0;round.value=0;discoveredKeys.value=[];if(stage.value.kind==='EXPLORE_3D'){phase.value='playing';message.value='自由点一点厨房里的物品，听听它们叫什么。'}else resetRound()}
function starForRound(){return mistakes.value===0&&hint.value===0?3:mistakes.value<=1&&hint.value<=2?2:1}
async function recordAttempt(target:ContentItem,activityType:string){
 const event:AttemptEvent={eventId:crypto.randomUUID(),sessionId,contentItemId:target.id,packageVersion,activityVersion:stage.value.order,firstTryCorrect:mistakes.value===0,hintLevel:hint.value,semanticErrors:mistakes.value,responseMs:Math.round(performance.now()-started),occurredAt:new Date().toISOString(),syncStatus:'PENDING',worldId:KITCHEN_WORLD_ID,stageId:stage.value.id,activityType};
 try{await queueAttempt(event)}catch(e){console.error('保存学习记录失败',e)}
}
function finishStage(){
 phase.value='complete';message.value=stageIndex.value===4?'魔法厨房全部完成！你已经通过整个厨房世界啦！':'这个阶段完成啦！下一阶段会用新的方式继续练习。';
 const stars=stage.value.kind==='EXPLORE_3D'?0:stageStars.value;
 progressState.value.bestStars[stage.value.id]=Math.max(progressState.value.bestStars[stage.value.id]??0,stars);
 if(stageIndex.value<4)progressState.value.unlockedStage=Math.max(progressState.value.unlockedStage,stageIndex.value+1);else progressState.value.completed=true;
 saveKitchenProgress(progressState.value);syncNow();
}
function nextStage(){if(stageIndex.value<4)openStage(stageIndex.value+1)}
function replayStage(){openStage(stageIndex.value);beginStage()}
function help(){if(!canPlay.value||stage.value.kind==='EXPLORE_3D'||isAudioMatch.value)return;hint.value=nextHint(hint.value);message.value=hint.value>=4?'提示：中文是「'+current.value.meaningCn+'」':hint.value>=2?'缩小范围，再认真听一次。':'跟着乐乐再听一次吧！';speakTask()}
async function submitCorrect(target:ContentItem,activityType:string){
 phase.value='celebrating';earned.value=starForRound();stageStars.value+=earned.value;scene?.celebrate(target.assetKey);message.value=earned.value===3?'太棒啦！一次就答对了！':'答对啦，继续加油！';await recordAttempt(target,activityType);
 advanceTimer=setTimeout(()=>{if(round.value+1>=totalRounds.value)finishStage();else{round.value++;resetRound()}},1250)
}
function wrong(){mistakes.value++;hint.value=nextHint(hint.value);message.value=mistakes.value>=2?'没关系，再观察一下，重新试试！':'差一点，再听一次～';speakTask()}
async function chooseImage(item:ContentItem){if(!canPlay.value||!isCardRound.value)return;if(item.id!==current.value.id){wrong();return}await submitCorrect(current.value,'LISTEN_IMAGE')}
function playAudioChoice(item:ContentItem){selectedAudioKey.value=item.assetKey;speak(item.text)}
async function confirmAudio(){if(!canPlay.value||!isAudioMatch.value)return;if(!selectedAudioKey.value){message.value='先试听一个声音，再告诉乐乐你的答案。';return}if(selectedAudioKey.value!==current.value.assetKey){wrong();selectedAudioKey.value='';return}await submitCorrect(current.value,'AUDIO_MATCH')}
async function onScenePick(assetKey:string){
 if(!canPlay.value)return;
 const picked=items.value.find(x=>x.assetKey===assetKey);if(!picked)return;
 if(stage.value.kind==='EXPLORE_3D'){
  speak(picked.text);scene?.celebrate(assetKey);
  if(!discoveredKeys.value.includes(assetKey))discoveredKeys.value=[...discoveredKeys.value,assetKey];
  message.value='这是 '+picked.text+' · '+picked.meaningCn+'。继续找找其他物品吧！';
  if(discoveredKeys.value.length>=items.value.length)setTimeout(finishStage,850);
  return;
 }
 if(!isSceneRound.value)return;
 if(assetKey!==current.value.assetKey){wrong();return}
 await submitCorrect(current.value,'COMMAND_3D')
}
function syncNow(){syncAttempts(localStorage.getItem('kidToken')??'').catch(()=>{})}
function visible(){if(!document.hidden)syncNow()}
async function init(){
 progressState.value=loadKitchenProgress();let candidates=starterItems;
 try{const pkg=await latestPackage();await db.packages.put(pkg);packageVersion=pkg.packageVersion;candidates=pkg.items}catch{try{const cached=await db.packages.orderBy('publishedAt').last();if(cached){packageVersion=cached.packageVersion;candidates=cached.items}}catch{}}
 const keys=new Set(starterItems.map(x=>x.assetKey));const used=new Set<string>();items.value=candidates.filter(x=>{if(!keys.has(x.assetKey)||used.has(x.assetKey))return false;used.add(x.assetKey);return true}).slice(0,5);if(items.value.length<3)items.value=starterItems;
 await nextTick();if(!sceneHost.value)return;try{scene=new KitchenScene(sceneHost.value,items.value);scene.onSelect=onScenePick;phase.value='intro';message.value=stage.value.intro}catch(e){console.error(e);message.value='3D 场景加载失败，请检查浏览器 WebGL 支持'}
}
onMounted(()=>{void init();window.addEventListener('online',syncNow);document.addEventListener('visibilitychange',visible)});
onBeforeUnmount(()=>{clearTimers();scene?.dispose();window.speechSynthesis?.cancel();window.removeEventListener('online',syncNow);document.removeEventListener('visibilitychange',visible)});
</script>

<template><main class="adventure"><div class="page">
<header class="game-header"><div class="brand"><button class="map-back" @click="router.push('/kid')">← 世界地图</button><div><small>WORLD 1 · KITCHEN WORLD</small><h1>魔法厨房世界</h1></div></div><div class="header-tools"><span class="chapter-chip">⭐ {{worldStars}} / {{maxWorldStars}} 世界星星</span><button class="icon-button" @click="toggleSound">{{soundEnabled?'🔊':'🔇'}}</button></div></header>
<section class="world-map"><button v-for="(s,i) in kitchenStages" :key="s.id" class="stage-node" :class="{active:i===stageIndex,locked:i>progressState.unlockedStage,done:i<progressState.unlockedStage||progressState.completed}" :disabled="i>progressState.unlockedStage" @click="openStage(i)"><span class="node-icon">{{i>progressState.unlockedStage?'🔒':s.icon}}</span><b>{{s.code}}</b><small>{{s.title}}</small><em v-if="progressState.bestStars[s.id]">⭐{{progressState.bestStars[s.id]}}</em></button></section>
<section class="quest-bar"><div class="quest-label"><span>{{stage.icon}} {{stage.code}} · {{stage.title}} <small>{{stage.subtitle}}</small></span><span v-if="stage.kind!=='EXPLORE_3D'">⭐ {{stageStars}} <b>{{Math.min(round+1,totalRounds)}}/{{totalRounds}}</b></span><span v-else>已发现 {{discoveredKeys.length}} / {{items.length}}</span></div><div class="progress"><div :style="{width:stageProgress+'%'}"></div></div></section>
<section class="game-board">
<div ref="sceneHost" class="stage" role="application" aria-label="魔法厨房三维互动场景"></div><div class="scene-label">🏡 Kitchen World <span>{{stage.learningGoal}}</span></div>
<div v-if="phase==='intro'" class="overlay"><div class="overlay-card"><div class="mascot-face">🐰</div><span class="eyebrow">{{stage.code}} · {{stage.title}}</span><h2>{{stage.subtitle}}</h2><p>{{stage.intro}}</p><button class="primary" @click="beginStage">开始这一阶段 🚀</button></div></div>
<div v-if="phase==='complete'" class="overlay"><div class="overlay-card win-card"><div class="confetti">{{stageIndex===4?'🏆 🎉 🏆':'✨ 🎉 ✨'}}</div><span class="eyebrow">{{stage.code}} COMPLETE</span><h2>{{stageIndex===4?'厨房世界通关！':'阶段完成！'}}</h2><p>{{message}}</p><div v-if="stage.kind!=='EXPLORE_3D'" class="big-stars">⭐ {{stageStars}} <small>/ {{items.length*3}}</small></div><div class="complete-actions"><button class="secondary" @click="replayStage">再练一次 ↻</button><button v-if="stageIndex<4" class="primary" @click="nextStage">下一阶段 →</button><button v-else class="primary" @click="router.push('/kid/world/home-world')">进入家庭世界 →</button><button v-if="stageIndex===4" class="secondary" @click="router.push('/kid')">返回世界地图</button></div></div></div>
<div v-if="phase==='celebrating'" class="celebration">⭐ +{{earned}}<span>太棒啦！</span></div>
<div v-if="phase==='playing'&&(isCardRound||isAudioMatch)" class="activity-layer">
 <div class="card-activity">
  <template v-if="isCardRound"><span class="eyebrow">LISTEN & CHOOSE</span><h3>听一听，找到正确的图片</h3><button class="listen-task" @click="speakTask">🔊 再听一次</button><div class="picture-options"><button v-for="item in options" :key="item.id" @click="chooseImage(item)"><img :src="vocabularyImage(item.assetKey)" :alt="item.meaningCn"/><span>?</span></button></div></template>
  <template v-else><span class="eyebrow">LOOK · LISTEN · MATCH</span><h3>这张图片对应哪个英语声音？</h3><img class="target-picture" :src="vocabularyImage(current.assetKey)" :alt="current.meaningCn"/><div class="audio-options"><button v-for="(item,i) in options" :key="item.id" :class="{chosen:selectedAudioKey===item.assetKey}" @click="playAudioChoice(item)">🔊 声音 {{String.fromCharCode(65+i)}}</button></div><button class="confirm" @click="confirmAudio">就是这个 ✓</button></template>
 </div>
</div>
</section>
<section class="coach"><div class="coach-avatar">🐰<span>向导乐乐</span></div><div class="speech"><span class="eyebrow">{{stage.learningGoal}}</span><h2 v-if="phase==='playing'">{{stage.kind==='EXPLORE_3D'?'自由探索':isSceneRound?instruction():isAudioMatch?'听声音配图片':current?.text}}</h2><h2 v-else>{{stage.title}}</h2><p>{{message}}</p></div><div class="controls" v-if="phase==='playing'&&stage.kind!=='EXPLORE_3D'&&!isAudioMatch"><button class="sound-button" @click="speakTask">🔊 再听一次</button><button class="hint-button" @click="help">💡 给我提示</button></div></section>
<div class="bottom-note"><span>学习路径：场景认识 → 听音辨认 → 反向配对 → 指令理解 → 混合挑战</span><span>3D 与卡片共享同一批学习内容</span></div>
</div></main></template>

<style scoped>
.adventure{min-height:100vh;background:radial-gradient(circle at 13% 6%,#ffeed4 0%,transparent 27%),radial-gradient(circle at 89% 7%,#d2f5f2 0%,transparent 29%),#f1f7ff;color:#304462;font-family:system-ui,"Microsoft YaHei",sans-serif}.page{max-width:1180px;margin:auto;padding:20px 24px 32px}.game-header,.brand,.header-tools,.quest-label,.coach,.controls,.bottom-note{display:flex;align-items:center}.game-header{justify-content:space-between;gap:20px;margin-bottom:14px}.brand{gap:13px}.map-back{border:0;background:#fff;border-radius:15px;padding:11px 13px;color:#6552ac;font-weight:850;box-shadow:0 5px 0 #dfdfef}.brand small,.eyebrow{font-size:10px;letter-spacing:1.5px;color:#8882c1;font-weight:900}.brand h1{margin:2px 0;font-size:25px;color:#544698}.header-tools{gap:10px}.chapter-chip{background:#fff;padding:11px 15px;border-radius:17px;font-weight:800;color:#6d6ac0}.icon-button{background:#fff;border:0;border-radius:15px;padding:11px;font-size:22px}
.world-map{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:12px 0}.stage-node{position:relative;border:3px solid white;background:#fff;border-radius:20px;padding:12px 7px;color:#6e7291;box-shadow:0 6px 0 #dfe4f3;cursor:pointer}.stage-node .node-icon{font-size:24px;display:block}.stage-node b{display:block;color:#7261bd}.stage-node small{display:block;margin-top:2px}.stage-node em{position:absolute;right:6px;top:6px;font-style:normal;font-size:10px;color:#b27a24}.stage-node.active{background:#f1edff;border-color:#b5a4f3}.stage-node.done{box-shadow:0 6px 0 #c8ead9}.stage-node.locked{opacity:.55;cursor:not-allowed}
.quest-bar{background:#fff;border-radius:22px;padding:14px 20px;margin-bottom:13px;box-shadow:0 8px 22px #8f9fc526}.quest-label{justify-content:space-between;font-weight:850;gap:12px}.quest-label small{font-weight:500;color:#939bb0;margin-left:7px}.quest-label b{color:#806bd6;margin-left:8px}.progress{height:10px;background:#e9ebf8;border-radius:20px;margin-top:11px;overflow:hidden}.progress>div{height:100%;background:linear-gradient(90deg,#76d7b2,#f8cb5a);border-radius:20px;transition:width .4s}
.game-board{position:relative;overflow:hidden;border:8px solid #fff;border-radius:30px;box-shadow:0 12px 0 #d6ddef,0 25px 50px #7d8fb34a;background:#d5ece4}.stage{height:clamp(360px,49vh,590px);width:100%}.scene-label{position:absolute;top:16px;left:16px;background:#ffffffdf;padding:9px 13px;border-radius:14px;font-size:12px;font-weight:900;pointer-events:none}.scene-label span{font-weight:500;margin-left:7px;color:#7d8799}.overlay{position:absolute;inset:0;background:#30305b59;display:grid;place-items:center;padding:18px;z-index:4}.overlay-card{width:min(440px,100%);box-sizing:border-box;background:#fffefa;border:5px solid #fff2c9;text-align:center;padding:26px 30px;border-radius:30px;box-shadow:0 12px 0 #d39bc2,0 24px 48px #45436455}.mascot-face{font-size:60px}.overlay h2{font-size:28px;color:#6552ab;margin:9px 0}.overlay p{line-height:1.75;color:#697489}.primary,.secondary{border:0;font-weight:900;font-size:17px;padding:14px 25px;border-radius:18px;cursor:pointer}.primary{background:#ffc467;color:#67421e;box-shadow:0 5px 0 #d8853c}.secondary{background:#e9e6f8;color:#6657a8}.complete-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.confetti{font-size:31px}.big-stars{font-size:34px;font-weight:900;color:#d6903b;margin:12px}.big-stars small{font-size:14px;color:#a9a18a}
.activity-layer{position:absolute;inset:0;background:#34455a58;display:grid;place-items:center;padding:20px;z-index:3}.card-activity{width:min(720px,94%);background:#fffdf7;border:5px solid #fff;border-radius:28px;padding:22px;text-align:center;box-shadow:0 12px 0 #c9b8ed}.card-activity h3{margin:5px 0 10px;color:#6551ad;font-size:24px}.listen-task,.confirm{border:0;border-radius:15px;background:#8873da;color:white;font-weight:900;padding:12px 18px;margin-bottom:14px}.picture-options{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.picture-options button{border:4px solid #edf0fa;background:#f7f8ff;border-radius:22px;padding:10px;cursor:pointer}.picture-options img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:16px}.picture-options span{display:block;color:#9a8cc7;font-size:17px;font-weight:900}.target-picture{width:150px;height:150px;object-fit:contain;background:#f3f7ef;border-radius:22px}.audio-options{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin:15px}.audio-options button{border:3px solid #e5e2f5;background:#fff;border-radius:16px;padding:13px 17px;font-weight:850;color:#615a8e}.audio-options button.chosen{background:#ede8ff;border-color:#9c86e1}.confirm{background:#70b98f}
.celebration{position:absolute;z-index:5;top:28%;left:50%;transform:translateX(-50%);background:#fff4bd;color:#d88b27;font-size:40px;font-weight:950;padding:14px 28px;border-radius:25px;box-shadow:0 8px 0 #f7c85f}.celebration span{display:block;font-size:17px;text-align:center}.coach{gap:17px;margin-top:26px;background:#fff;border-radius:25px;padding:16px 20px;box-shadow:0 7px 0 #e1e4f3}.coach-avatar{font-size:50px;display:flex;flex-direction:column;align-items:center;background:#fef1d4;border-radius:18px;padding:9px}.coach-avatar span{font-size:9px;color:#a47c40;font-weight:800}.speech{flex:1}.speech h2{font-size:27px;color:#6551ad;margin:3px 0}.speech p{margin:3px 0;color:#818b9d;font-size:13px}.controls{gap:10px}.controls button{border:0;border-radius:14px;padding:14px;font-weight:900}.sound-button{background:#8e75dc;color:#fff}.hint-button{background:#ffe5a4;color:#956b32}.bottom-note{justify-content:space-between;color:#919aae;font-size:11px;padding:17px 4px}
@media(max-width:720px){.page{padding:10px}.brand h1{font-size:19px}.chapter-chip{display:none}.world-map{gap:5px}.stage-node{padding:8px 2px}.stage-node .node-icon{font-size:19px}.stage-node small{font-size:9px}.quest-label{font-size:11px}.quest-label small,.scene-label span{display:none}.stage{height:46vh;min-height:340px}.picture-options{gap:6px}.card-activity{padding:14px}.coach{flex-wrap:wrap;gap:8px}.coach-avatar{font-size:34px}.speech h2{font-size:21px}.controls{width:100%}.controls button{flex:1}.bottom-note{flex-direction:column;gap:4px}.world-map{overflow-x:auto;grid-template-columns:repeat(5,minmax(80px,1fr))}}
</style>