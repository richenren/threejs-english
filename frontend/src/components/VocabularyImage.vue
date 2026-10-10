<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {vocabularyAssetCandidates} from '../assets/vocabularyAssets';

const props=withDefaults(defineProps<{
  word:string;
  alt?:string;
  assetKey?:string;
  fallbackEmoji?:string;
  size?:'small'|'card'|'large';
}>(),{alt:'',assetKey:'',fallbackEmoji:'',size:'card'});

const index=ref(0);
const candidates=computed(()=>vocabularyAssetCandidates(props.word,props.assetKey));
const src=computed(()=>candidates.value[index.value]);
const hasImage=computed(()=>Boolean(src.value));
const fallbackLabel=computed(()=>props.fallbackEmoji||props.word.trim().charAt(0).toUpperCase()||'?');

watch([()=>props.word,()=>props.assetKey],()=>{index.value=0});
function nextCandidate(){index.value++}
</script>

<template>
  <div class="vocab-art" :class="'size-'+size">
    <img v-if="hasImage" :src="src" :alt="alt||word" loading="lazy" decoding="async" @error="nextCandidate"/>
    <div v-else class="fallback" :class="{emoji:Boolean(fallbackEmoji)}">{{fallbackLabel}}</div>
  </div>
</template>

<style scoped>
.vocab-art{position:relative;display:grid;place-items:center;overflow:hidden;flex:0 0 auto;background:linear-gradient(145deg,#fffdf9,#f2f4fb);border:1px solid #ebeaf0;box-shadow:0 10px 25px #5d648319}
.vocab-art img{width:100%;height:100%;object-fit:cover;display:block}
.size-small{width:68px;height:68px;border-radius:15px}
.size-card{width:100%;aspect-ratio:1;border-radius:22px}
.size-large{width:min(300px,72vw);aspect-ratio:1;border-radius:28px}
.fallback{width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(145deg,#ffe8ad,#f5c777);color:#9a6127;font-weight:950;font-size:clamp(34px,12cqw,82px)}
.fallback.emoji{background:linear-gradient(145deg,#fff9ef,#edf6ff);font-size:clamp(36px,13cqw,88px)}
@media(max-width:640px){.size-large{width:min(250px,76vw)}}
</style>
