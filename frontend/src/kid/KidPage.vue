<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount} from 'vue';import {KitchenScene} from '../game/KitchenScene';import {starterItems,type ContentItem,type AttemptEvent} from '../domain';import {queueAttempt,syncAttempts} from '../offline/db';import {nextHint,type HintLevel} from '../game/rules';import {latestPackage} from '../api';import {db} from '../offline/db';
const container=ref<HTMLElement>();const targets=ref<ContentItem[]>(starterItems);const index=ref(0);const hint=ref<HintLevel>(0);const errors=ref(0);const message=ref('听一听，找到正确的物品');const finished=ref(false);const soundEnabled=ref(true);const sessionId=crypto.randomUUID();let packageVersion='starter-1';let started=performance.now();let kitchen:KitchenScene|undefined;
const current=()=>targets.value[index.value];
function speak(){const item=current();if(!item||!soundEnabled.value)return;speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(item.text);utterance.lang='en-US';utterance.rate=.8;speechSynthesis.speak(utterance)}
function help(){hint.value=nextHint(hint.value);if(hint.value>=4)message.value='提示：'+current().meaningCn;else if(hint.value>=2)message.value='看看这些物品，再试一次';speak()}
async function select(key:string){if(finished.value)return;const item=current();if(key!==item.assetKey){errors.value++;hint.value=nextHint(hint.value);message.value='再听一次，试试看';speak();return}
 const event:AttemptEvent={eventId:crypto.randomUUID(),sessionId,contentItemId:item.id,packageVersion,activityVersion:1,firstTryCorrect:errors.value===0,hintLevel:hint.value,semanticErrors:errors.value,responseMs:Math.round(performance.now()-started),occurredAt:new Date().toISOString(),syncStatus:'PENDING'};
 await queueAttempt(event);message.value='太棒了，找对啦！ ✨';if(index.value===targets.value.length-1){finished.value=true;syncAttempts(localStorage.getItem('kidToken')??'').catch(()=>{});return}index.value++;hint.value=0;errors.value=0;started=performance.now();setTimeout(speak,300)}
onMounted(async()=>{try{const pkg=await latestPackage();await db.packages.put(pkg);const usable=pkg.items.filter(x=>starterItems.some(y=>y.assetKey===x.assetKey));if(usable.length){targets.value=usable;packageVersion=pkg.packageVersion}}catch{const cached=await db.packages.orderBy('publishedAt').last();if(cached){const usable=cached.items.filter(x=>starterItems.some(y=>y.assetKey===x.assetKey));if(usable.length){targets.value=usable;packageVersion=cached.packageVersion}}}if(container.value){kitchen=new KitchenScene(container.value,targets.value);kitchen.onSelect=select}window.addEventListener('online',syncNow);document.addEventListener('visibilitychange',visible)});
onBeforeUnmount(()=>{kitchen?.dispose();speechSynthesis.cancel();window.removeEventListener('online',syncNow);document.removeEventListener('visibilitychange',visible)});
function restart(){window.location.reload()}
function toggleSound(){soundEnabled.value=!soundEnabled.value;if(!soundEnabled.value)speechSynthesis.cancel();}
function syncNow(){syncAttempts(localStorage.getItem('kidToken')??'').catch(()=>{})}function visible(){if(!document.hidden)syncNow()}
</script>
<template>
  <main class="kid">
    <div class="shell">
      <header class="topbar">
        <div class="identity">
          <div class="logo">✦</div>
          <div><span class="eyebrow">LITTLE EXPLORERS · 3D ENGLISH</span><h1>奇妙英语厨房 <span>🍓</span></h1></div>
        </div>
        <div class="header-actions">
          <span class="topic-tag">🏡 我的厨房</span>
          <button class="sound-toggle" @click="toggleSound" :aria-label="soundEnabled?'关闭声音':'打开声音'">{{soundEnabled?'🔊':'🔇'}}</button>
        </div>
      </header>

      <section class="learning">
        <div class="learning-top">
          <div class="chapter">🌟 今日探险 <span>·</span> 第 1 关 <span class="chapter-english">KITCHEN ADVENTURE</span></div>
          <div class="count"><b>{{Math.min(index+1,targets.length)}}</b> / {{targets.length}}</div>
        </div>
        <div class="progress"><div class="progress-fill" :style="{width:((finished?targets.length:index)/targets.length*100)+'%'}"></div></div>
        <div class="prompt">
          <div class="prompt-icon">🎧</div>
          <div class="prompt-copy"><span class="prompt-caption">{{finished?'恭喜你完成挑战！':'听一听 · 找一找 · 点一点'}}</span><h2>{{finished?'你是厨房小达人！':current().text}}</h2><p>{{finished?'今天学得真棒，明天再来探索吧！':message}}</p></div>
          <button v-if="!finished" class="listen-mini" @click="speak">▶ 听发音</button>
        </div>
      </section>

      <section class="stage-wrap">
        <div class="stage-head"><div><span class="stage-dot"></span><strong>3D 魔法厨房</strong><small>点击桌上的物品，找到正确答案</small></div><span class="live-tag">✧ 自由探索</span></div>
        <div ref="container" class="scene" role="application" aria-label="3D 厨房物品选择区"></div>
        <div class="stage-foot"><span>👆 点击物品来回答</span><span>✨ 移动鼠标发现惊喜</span></div>
      </section>

      <footer class="footer">
        <div class="footer-text"><b>每一次尝试，都值得鼓励！</b><span>慢慢来，你一定可以 💛</span></div>
        <div class="actions" v-if="!finished"><button class="repeat" @click="speak">🔊 再听一次</button><button class="hint" @click="help">💡 给我提示</button></div>
        <div class="actions" v-else><button class="repeat" @click="restart">✨ 再玩一次</button></div>
      </footer>
      <p class="dev-note">当前使用浏览器语音朗读 · 学习记录保存于本地设备</p>
    </div>
  </main>
</template>
<style scoped>
.kid{min-height:100vh;background:radial-gradient(ellipse 70% 38% at 85% 0%,#dcf0e7 0%,transparent 78%),linear-gradient(145deg,#fbf8f0,#f6f4eb 60%,#eaf2e9);color:#324a40}
.shell{max-width:1160px;margin:auto;padding:25px 24px 18px}
.topbar,.identity,.header-actions,.learning-top,.stage-head,.stage-head>div,.stage-foot,.footer,.actions{display:flex;align-items:center}
.topbar{justify-content:space-between;margin-bottom:22px;gap:12px}.identity{gap:13px}.logo{width:54px;height:54px;display:grid;place-items:center;background:#78ab8b;color:white;border-radius:18px;font-size:28px;box-shadow:0 8px 25px #8fbc9b66}
.eyebrow,.chapter-english{font-size:10px;font-weight:800;letter-spacing:2px;color:#90a69b}.identity h1{font-size:26px;line-height:1.2;margin:5px 0;font-weight:850;letter-spacing:.5px}
.header-actions{gap:12px}.topic-tag{border:1px solid #d8e8dc;background:#fffef9;border-radius:20px;padding:10px 15px;font-size:13px;color:#6f9480;font-weight:700}.sound-toggle{border:0;background:#fff;border-radius:15px;font-size:20px;height:44px;width:46px;box-shadow:0 3px 14px #355f4112}
.learning{background:#fffefa;border:1px solid #edf0e6;border-radius:23px;padding:18px 25px 18px;box-shadow:0 7px 25px #5264440a;margin-bottom:16px}
.learning-top{justify-content:space-between;margin-bottom:11px}.chapter{font-size:13px;font-weight:750;color:#82a78d}.chapter span{margin:0 7px}.count{font-size:14px;color:#849b8c}.count b{color:#498362;font-size:20px}.progress{height:7px;border-radius:20px;background:#e8f2e7;overflow:hidden}.progress-fill{height:100%;background:linear-gradient(90deg,#8cc99d,#e6c771);border-radius:20px;transition:width .3s}
.prompt{display:flex;gap:18px;align-items:center;padding:18px 1px 2px}.prompt-icon{font-size:35px;background:#eaf4eb;border-radius:18px;width:66px;height:66px;display:grid;place-items:center}.prompt-copy{flex:1}.prompt-caption{font-weight:700;letter-spacing:1px;color:#98a89b;font-size:12px}.prompt h2{font-size:38px;color:#416b52;line-height:1.2;margin:4px 0 3px;letter-spacing:.5px}.prompt p{color:#8a9b8d;font-size:13px;margin:0}.listen-mini{border:0;background:#e4f1e6;color:#578469;font-weight:800;padding:13px 18px;border-radius:14px}
.stage-wrap{background:#fffefb;border:1px solid #e3eae1;border-radius:26px;padding:12px;box-shadow:0 15px 45px #58776418}
.stage-head{justify-content:space-between;padding:8px 12px 15px}.stage-head>div{gap:11px}.stage-dot{width:10px;height:10px;border-radius:50%;background:#7ec29a;box-shadow:0 0 0 5px #dcf1e2}.stage-head strong{font-size:15px}.stage-head small{font-size:12px;color:#9caea2}.live-tag{font-size:12px;font-weight:750;color:#87a38f;background:#edf6ed;border-radius:20px;padding:7px 12px}
.scene{width:100%;height:clamp(360px,48vh,555px);overflow:hidden;border-radius:18px;background:#d5e7df;position:relative}.stage-foot{justify-content:space-between;color:#8da198;font-size:12px;padding:13px 12px 2px}
.footer{justify-content:space-between;gap:15px;margin:22px 4px 6px}.footer-text{display:flex;flex-direction:column;gap:5px}.footer-text b{font-size:14px}.footer-text span{color:#97a79d;font-size:12px}.actions{gap:12px}.actions button{border:0;border-radius:15px;font-size:14px;font-weight:800;padding:15px 24px;min-height:51px;box-shadow:0 5px 16px #4b7e5e16;transition:transform .18s}.actions button:hover,.listen-mini:hover{transform:translateY(-2px)}.repeat{background:#79b895;color:white}.hint{background:#fff0cb;color:#ac8043}.dev-note{text-align:center;color:#abb8aa;font-size:11px;margin-top:18px}
@media(max-width:700px){.shell{padding:12px}.identity h1{font-size:20px}.eyebrow{font-size:8px}.logo{width:43px;height:43px}.topic-tag,.chapter-english,.stage-head small,.live-tag{display:none}.learning{padding:15px}.prompt{gap:12px}.prompt-icon{width:52px;height:52px;font-size:27px}.prompt h2{font-size:31px}.listen-mini{padding:10px;font-size:12px}.scene{height:45vh;min-height:315px}.stage-foot{font-size:10px}.footer{flex-direction:column;align-items:stretch}.actions button{flex:1}.stage-head{padding:7px 9px 11px}}
</style>