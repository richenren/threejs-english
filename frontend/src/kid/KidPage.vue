<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { KitchenScene } from '../game/KitchenScene';
import { starterItems, type AttemptEvent, type ContentItem } from '../domain';
import { db, queueAttempt, syncAttempts } from '../offline/db';
import { latestPackage } from '../api';
import { nextHint, type HintLevel } from '../game/rules';
import { vocabularyImage } from '../assets/vocabulary';

type Phase = 'loading' | 'intro' | 'playing' | 'celebrating' | 'complete';
const sceneHost = ref<HTMLElement>();
const phase = ref<Phase>('loading');
const items = ref<ContentItem[]>([]);
const round = ref(0);
const hint = ref<HintLevel>(0);
const mistakes = ref(0);
const stars = ref(0);
const earned = ref(0);
const message = ref('准备好探险了吗？');
const soundEnabled = ref(true);
const sessionId = crypto.randomUUID();
const canPlay = computed(() => phase.value === 'playing');
const current = computed(() => items.value[round.value]);
const progress = computed(() => items.value.length ? (phase.value === 'complete' ? 100 : round.value / items.value.length * 100) : 0);
let scene: KitchenScene | undefined;
let packageVersion = 'starter-1';
let started = 0;
let advanceTimer: ReturnType<typeof setTimeout> | undefined;
let speakingTimer: ReturnType<typeof setTimeout> | undefined;

function speak(text = current.value?.text ?? '') {
  if (!soundEnabled.value || !text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; utterance.rate = .82; utterance.pitch = 1.07;
  window.speechSynthesis.speak(utterance);
}
function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
  if (!soundEnabled.value) window.speechSynthesis?.cancel();
}
function resetRound() {
  hint.value = 0; mistakes.value = 0; earned.value = 0;
  message.value = '仔细听，点击厨房里对应的物品！';
  started = performance.now();
  phase.value = 'playing';
  speakingTimer = setTimeout(() => speak(), 300);
}
function startAdventure() {
  if (!items.value.length) return;
  stars.value = 0; round.value = 0;
  resetRound();
}
function again() { startAdventure(); }
function help() {
  if (!canPlay.value) return;
  hint.value = nextHint(hint.value);
  message.value = hint.value >= 4
    ? '小提示：它的中文是「' + current.value.meaningCn + '」'
    : hint.value >= 2 ? '仔细看看桌上的物品，再听一次！' : '跟着小伙伴再听一次吧！';
  speak();
}
async function onPick(assetKey: string) {
  if (!canPlay.value || !current.value) return;
  const target = current.value;
  if (assetKey !== target.assetKey) {
    mistakes.value += 1;
    hint.value = nextHint(hint.value);
    message.value = mistakes.value >= 2 ? '没关系，再观察一下，试试别的物品！' : '差一点点！再试一次～';
    speak();
    return;
  }
  phase.value = 'celebrating';
  earned.value = mistakes.value === 0 && hint.value === 0 ? 3 : mistakes.value <= 1 && hint.value <= 2 ? 2 : 1;
  stars.value += earned.value;
  scene?.celebrate(assetKey);
  message.value = earned.value === 3 ? '太厉害啦！一次就找对了！' : '找到了！继续加油！';
  const event: AttemptEvent = {
    eventId: crypto.randomUUID(), sessionId, contentItemId: target.id, packageVersion,
    activityVersion: 2, firstTryCorrect: mistakes.value === 0,
    semanticErrors: mistakes.value, hintLevel: hint.value,
    responseMs: Math.round(performance.now() - started),
    occurredAt: new Date().toISOString(), syncStatus: 'PENDING',
  };
  try { await queueAttempt(event); } catch (e) { console.error('保存学习记录失败', e); }
  advanceTimer = setTimeout(() => {
    if (round.value + 1 === items.value.length) {
      phase.value = 'complete';
      message.value = '全部任务完成！你是今天的探险小明星！';
      syncNow();
    } else {
      round.value += 1;
      resetRound();
    }
  }, 1700);
}
function syncNow() {
  syncAttempts(localStorage.getItem('kidToken') ?? '').catch(() => {});
}
function visible() { if (!document.hidden) syncNow(); }
async function init() {
  let candidates = starterItems;
  try {
    const pkg = await latestPackage();
    await db.packages.put(pkg);
    packageVersion = pkg.packageVersion;
    candidates = pkg.items;
  } catch {
    try {
      const cached = await db.packages.orderBy('publishedAt').last();
      if (cached) { packageVersion = cached.packageVersion; candidates = cached.items; }
    } catch { /* IndexedDB may be disabled; bundled content still works */ }
  }
  const keys = new Set(starterItems.map(item => item.assetKey));
  const used = new Set<string>();
  items.value = candidates.filter(item => {
    if (!keys.has(item.assetKey) || used.has(item.assetKey)) return false;
    used.add(item.assetKey); return true;
  }).slice(0, 5);
  if (!items.value.length) items.value = starterItems;
  await nextTick();
  if (!sceneHost.value) return;
  try {
    scene = new KitchenScene(sceneHost.value, items.value);
    scene.onSelect = onPick;
    phase.value = 'intro';
  } catch (e) {
    console.error('无法加载 Three.js 场景', e);
    message.value = '3D 场景加载失败，请检查浏览器 WebGL 支持';
  }
}
onMounted(() => {
  void init();
  window.addEventListener('online', syncNow);
  document.addEventListener('visibilitychange', visible);
});
onBeforeUnmount(() => {
  if (advanceTimer) clearTimeout(advanceTimer);
  if (speakingTimer) clearTimeout(speakingTimer);
  scene?.dispose(); window.speechSynthesis?.cancel();
  window.removeEventListener('online', syncNow);
  document.removeEventListener('visibilitychange', visible);
});
</script>

<template>
  <main class="adventure">
    <div class="page">
      <header class="game-header">
        <div class="brand"><div class="brand-icon">✨</div><div><small>3D ENGLISH ADVENTURE</small><h1>奇妙英语小世界</h1></div></div>
        <div class="header-tools"><span class="chapter-chip">🏡 第一站 · 魔法厨房</span><button class="icon-button" @click="toggleSound" :aria-label="soundEnabled?'静音':'开启语音'">{{ soundEnabled?'🔊':'🔇' }}</button></div>
      </header>

      <section class="quest-bar" aria-label="关卡进度">
        <div class="quest-label"><span>🗺️ 厨房寻宝大冒险</span><span>⭐ {{ stars }} 星 <b>{{ phase==='complete'?items.length:Math.min(round+1,items.length) }}/{{ items.length }}</b></span></div>
        <div class="progress"><div :style="{width:progress+'%'}"></div></div>
        <div class="map-nodes"><span v-for="(item,i) in items" :key="item.id" :class="{done:i<round||phase==='complete',active:i===round&&phase!=='complete'}">{{ i<round||phase==='complete'?'★':i+1 }}</span></div>
      </section>

      <section class="game-board">
        <div class="stage" ref="sceneHost" role="application" aria-label="三维魔法厨房，点击厨房物品完成关卡"></div>
        <div class="scene-label">✧ 3D 魔法厨房 <span>轻点桌上的物品进行互动</span></div>

        <div v-if="phase==='intro'" class="overlay">
          <div class="overlay-card intro-card"><div class="mascot-face">🐰</div><span class="eyebrow">WELCOME, LITTLE EXPLORER!</span><h2>和乐乐一起寻找宝物！</h2><p>听听英语，看看厨房里藏着什么。点击正确的物品，就能收集小星星！</p><button class="primary" @click="startAdventure">🚀 开始探险</button></div>
        </div>
        <div v-if="phase==='complete'" class="overlay">
          <div class="overlay-card win-card"><div class="confetti">✨ 🎉 ✨</div><h2>闯关成功！</h2><p>你已经找到全部 {{ items.length }} 件宝物啦！</p><div class="big-stars">⭐ {{ stars }} <small>/ {{ items.length*3 }}</small></div><div class="rewards"><span>🏆 厨房小勇士</span><span>🌈 勇敢尝试奖</span></div><button class="primary" @click="again">再挑战一次 ↻</button></div>
        </div>
        <div v-if="phase==='celebrating'" class="celebration" role="status">⭐ +{{ earned }} <span>太棒啦！</span></div>
      </section>

      <section class="coach">
        <div class="coach-avatar">🐰<span>向导乐乐</span></div>
        <div class="speech">
          <span class="eyebrow">{{ phase==='intro'?'HELLO!':phase==='complete'?'YOU DID IT!':'LISTEN & FIND' }}</span>
          <h2>{{ phase==='intro'?'准备好了吗？':phase==='complete'?'今天的探险完成啦！':current?.text }}</h2>
          <p>{{ message }}</p>
        </div>
        <div class="controls" v-if="phase==='playing'">
          <button class="sound-button" @click="speak()">🔊 再听一次</button>
          <button class="hint-button" @click="help">💡 给我提示</button>
        </div>
        <button v-else-if="phase==='celebrating'" class="sound-button" disabled>✨ 正在收集星星…</button>
      </section>

      <div class="bottom-note"><span>🎮 听音找物 · 点击互动 · 通关奖励</span><span>家长提示：此版本使用浏览器英语语音</span></div>
    </div>
  </main>
</template>

<style scoped>
.adventure{min-height:100vh;background:radial-gradient(circle at 13% 6%,#ffeed4 0%,transparent 27%),radial-gradient(circle at 89% 7%,#d2f5f2 0%,transparent 29%),#f1f7ff;color:#304462;font-family:system-ui,"Microsoft YaHei",sans-serif}.page{max-width:1180px;margin:auto;padding:20px 24px 32px}
.game-header,.brand,.header-tools,.quest-label,.map-nodes,.coach,.controls,.bottom-note{display:flex;align-items:center}.game-header{justify-content:space-between;gap:20px;margin-bottom:16px}.brand{gap:13px}.brand-icon{font-size:32px;background:#fff;border-radius:20px;padding:13px;box-shadow:0 5px 0 #dfdfef}.brand small,.eyebrow{font-size:11px;letter-spacing:1.5px;color:#8882c1;font-weight:850}.brand h1{margin:1px 0;font-size:25px;color:#544698}.header-tools{gap:12px}.chapter-chip{background:#fff;padding:12px 16px;border-radius:18px;font-weight:800;color:#6d6ac0}.icon-button{background:#fff;border:0;border-radius:16px;padding:12px;font-size:23px;cursor:pointer}
.quest-bar{background:white;border:3px solid #fff;border-radius:23px;padding:15px 22px;margin-bottom:14px;box-shadow:0 9px 23px #8f9fc528}.quest-label{justify-content:space-between;font-weight:850;font-size:15px;gap:15px}.quest-label b{margin-left:9px;color:#806bd6}.progress{height:12px;background:#e8e8ff;border-radius:20px;margin:12px 0;overflow:hidden}.progress>div{height:100%;border-radius:20px;background:linear-gradient(90deg,#7fdbbb,#f8cb5a);transition:width .5s}.map-nodes{justify-content:space-around;gap:8px}.map-nodes span{background:#ebeff9;color:#8b93ab;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:850}.map-nodes .active{background:#a394ff;color:white;box-shadow:0 0 0 4px #e9e4ff}.map-nodes .done{background:#ffd46e;color:#b76e25}
.game-board{position:relative;overflow:hidden;border:8px solid white;border-radius:30px;box-shadow:0 12px 0 #d6ddef,0 25px 50px #7d8fb34a;background:#d5ece4}.stage{height:clamp(350px,49vh,590px);width:100%}.scene-label{position:absolute;top:17px;left:17px;border-radius:14px;padding:10px 15px;background:#ffffffdb;color:#59778e;font-weight:850;font-size:13px;pointer-events:none}.scene-label span{font-size:11px;margin-left:10px;font-weight:500}.overlay{position:absolute;inset:0;background:#30305b56;display:grid;place-items:center;padding:18px;z-index:2}.overlay-card{width:min(430px,100%);box-sizing:border-box;background:#fffefa;border:5px solid #fff4d1;text-align:center;padding:27px 31px;border-radius:30px;box-shadow:0 12px 0 #d39bc2,0 23px 48px #45436455}.mascot-face{font-size:65px}.overlay h2{font-size:29px;margin:10px 0;color:#6552ab}.overlay p{color:#697489;line-height:1.8;margin:8px 0 19px}.primary{border:0;background:linear-gradient(180deg,#ffc96d,#f49a54);border-bottom:6px solid #d17935;color:#603d20;font-size:20px;font-weight:900;padding:16px 40px;border-radius:21px;cursor:pointer}.confetti{font-size:33px}.big-stars{font-size:38px;font-weight:900;color:#d6903b}.big-stars small{font-size:16px;color:#b1a88d}.rewards{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin:18px 0}.rewards span{background:#fff1c8;padding:10px 13px;border-radius:13px;color:#94662b;font-size:12px;font-weight:800}.celebration{position:absolute;z-index:2;top:30%;left:50%;transform:translateX(-50%);background:#fff6c8;color:#dc8a29;font-size:42px;font-weight:950;padding:15px 30px;border-radius:26px;box-shadow:0 9px 0 #f9c75f;animation:pop .5s ease-out}.celebration span{font-size:20px;display:block;text-align:center}@keyframes pop{from{opacity:0;transform:translate(-50%,30px) scale(.7)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
.coach{gap:18px;margin-top:28px;background:white;border:4px solid #fff;border-radius:26px;padding:17px 21px;box-shadow:0 7px 0 #e1e4f3}.coach-avatar{font-size:55px;display:flex;flex-direction:column;align-items:center;background:#fef1d4;border-radius:19px;padding:10px;min-width:75px}.coach-avatar span{font-size:10px;color:#b78c49;font-weight:800}.speech{flex:1}.speech h2{font-size:31px;margin:2px 0;color:#6551ad}.speech p{font-size:13px;color:#8b93a0;margin:5px 0}.controls{gap:10px;flex-wrap:wrap}.controls button,.coach>button{border:0;border-radius:15px;font-weight:900;font-size:14px;padding:16px;cursor:pointer}.sound-button{background:#8f74e0;color:white;box-shadow:0 5px 0 #6757b7}.hint-button{background:#ffe4a4;color:#9b7137;box-shadow:0 5px 0 #deb879}button:disabled{opacity:.6;cursor:not-allowed}.bottom-note{justify-content:space-between;color:#929bb1;font-size:11px;padding:18px 5px}
@media(max-width:720px){.page{padding:10px 11px 25px}.game-header{margin-bottom:10px}.brand h1{font-size:19px}.brand-icon{font-size:24px;padding:9px}.chapter-chip{display:none}.quest-bar{padding:12px}.quest-label{font-size:12px}.stage{height:clamp(340px,48vh,490px)}.scene-label span{display:none}.coach{gap:9px;padding:12px;margin-top:23px;flex-wrap:wrap}.coach-avatar{font-size:37px;min-width:52px}.speech h2{font-size:24px}.controls{width:100%}.controls button{flex:1}.bottom-note{flex-direction:column;gap:6px}.overlay-card{padding:18px}.overlay h2{font-size:23px}}
</style>