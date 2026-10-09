<script setup lang="ts">
import {ref,onMounted} from 'vue';
import {parentApi} from '../api';import type {ContentItem} from '../domain';import {vocabularyImage} from '../assets/vocabulary';
const items=ref<ContentItem[]>([]);const text=ref('');const meaning=ref('');const assetKey=ref('');const error=ref('');const busy=ref(false);const feedback=ref('');const suggestion=ref('');const key=ref(sessionStorage.getItem('parentAccessKey')||'');
const importState=ref({active:false,total:0,processed:0,created:0,skipped:0,failed:0,errors:[] as string[]});
const assets=['','food.apple','food.banana','food.bread','tableware.cup','tableware.plate'];
function saveKey(){sessionStorage.setItem('parentAccessKey',key.value);refresh()}
async function run(task:()=>Promise<any>,success:string){busy.value=true;error.value='';try{await task();feedback.value=success;await refresh()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function refresh(){try{items.value=await parentApi.list()}catch(e){error.value=(e as Error).message}}
async function create(){if(!text.value.trim())return;await run(async()=>{await parentApi.create({text:text.value,meaningCn:meaning.value,type:'WORD',assetKey:assetKey.value});text.value='';meaning.value='';assetKey.value='';suggestion.value=''},'草稿已保存')}
async function generate(){if(!text.value.trim())return;await run(async()=>{const result=await parentApi.suggest(text.value);meaning.value=result.meaningCn;assetKey.value=result.assetKey;suggestion.value=result.exampleSentence},'AI 建议已填写到草稿，尚未发布；请先人工检查')}
async function transition(item:ContentItem,action:'review'|'approve'){await run(()=>parentApi.transition(item.id,action),action==='review'?'已提交人工审核':'已人工批准')}
async function edit(item:ContentItem){await run(()=>parentApi.update(item.id,{text:item.text,meaningCn:item.meaningCn,type:item.type,assetKey:item.assetKey}),'已保存修改，审核状态重置')}
async function publish(){if(!confirm('将所有已批准词条发布为新的不可变版本，继续吗？'))return;await run(async()=>{const p=await parentApi.publish();feedback.value='发布成功 '+p.packageVersion+'，共 '+p.itemCount+' 条'},'发布成功')}
async function importCsv(e:Event){
 const input=e.target as HTMLInputElement;
 const file=input.files?.[0];if(!file)return;
 const state=importState.value={active:true,total:0,processed:0,created:0,skipped:0,failed:0,errors:[]};
 error.value='';feedback.value='正在读取 '+file.name+' …';busy.value=true;
 try{
  if(!key.value.trim())throw new Error('请先填写家长访问密钥并点击“保存并连接”');
  const lines=(await file.text()).replace(/^\uFEFF/,'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length||lines[0].replace(/\s/g,'').toLowerCase()!=='text,meaningcn')throw new Error('CSV 表头必须是 text,meaningCn');
  const rows=lines.slice(1).map((line,i)=>({line:i+2,parts:line.split(',')})).filter(x=>x.parts[0]?.trim());
  state.total=rows.length;
  const existing=await parentApi.list();
  const seen=new Set(existing.map(x=>x.text.trim().toLowerCase()));
  for(const row of rows){
   const word=row.parts[0].trim(),meaningCn=row.parts.slice(1).join(',').trim();
   if(seen.has(word.toLowerCase())){state.skipped++;state.processed++;continue}
   try{
    await parentApi.create({text:word,meaningCn,type:'WORD',assetKey:''});
    state.created++;seen.add(word.toLowerCase());
   }catch(err){
    const msg=(err as Error).message;
    if(/409|duplicate|conflict/i.test(msg)){state.skipped++;seen.add(word.toLowerCase())}
    else {state.failed++;state.errors.push('第'+row.line+'行 '+word+'：'+msg);if(/401|403|unauthor/i.test(msg))break}
   }
   state.processed++;
  }
  await refresh();
  feedback.value='导入结束：新增 '+state.created+' 条，跳过重复 '+state.skipped+' 条，失败 '+state.failed+' 条';
  if(state.errors.length)error.value=state.errors.slice(0,5).join('；');
 }catch(err){error.value=(err as Error).message;feedback.value='导入未完成'}
 finally{state.active=false;busy.value=false;input.value=''}
}
onMounted(refresh);
</script>
<template><main class="parent"><header class="hero"><div><span class="section-eyebrow">LITTLE EXPLORERS · FAMILY DASHBOARD</span><h1>🌈 家长学习中心</h1><p>给孩子准备每天的小小英语冒险</p></div><router-link class="kid-link" to="/kid">🚀 进入儿童 3D 厨房 →</router-link></header><div class="stats"><div><strong>{{items.length}}</strong><span>词条总数</span></div><div><strong>{{items.filter(x=>x.status==='READY').length}}</strong><span>已批准词条</span></div><div><strong>{{items.filter(x=>x.status==='DRAFT').length}}</strong><span>待完善草稿</span></div></div>
<section><h2>访问密钥</h2><p>服务端需要配置 PARENT_ACCESS_KEY。密钥只保存在当前浏览器会话。</p><input type="password" v-model="key" placeholder="家长管理密钥"/><button @click="saveKey">保存并连接</button></section>
<section><h2>添加学习内容</h2><div class="form"><input v-model="text" placeholder="英语单词，例如 apple"/><input v-model="meaning" placeholder="中文释义"/><select v-model="assetKey"><option v-for="k in assets" :key="k" :value="k">{{k||'未关联 3D 素材'}}</option></select><button :disabled="busy" @click="generate">AI 补全建议</button><button :disabled="busy" @click="create">保存草稿</button></div><p v-if="suggestion">示例句：{{suggestion}}</p><small>AI 输出不会自动加入词库或发布。没有配置模型时仍可手工录入。</small></section>
<section class="import-section"><div class="section-heading"><div><span class="section-eyebrow">IMPORT VOCABULARY</span><h2>📚 批量导入小词库</h2><p>一次导入 200 个单词也没问题，自动跳过重复词条。</p></div><span class="section-emoji">📦</span></div><label class="upload" :class="{disabled:busy}"><span>📄 选择 CSV 词库文件</span><input type="file" accept=".csv,text/csv" :disabled="busy" @change="importCsv" /></label><small>支持 UTF-8 CSV，表头：text,meaningCn；目前不支持带引号的复杂 CSV 字段。</small><div v-if="importState.total" class="import-progress" role="status"><div class="progress-row"><strong>{{importState.active?'正在导入…':'导入结果'}}</strong><span>{{importState.processed}} / {{importState.total}}</span></div><progress :value="importState.processed" :max="importState.total"></progress><p>新增 {{importState.created}} · 跳过重复 {{importState.skipped}} · 失败 {{importState.failed}}</p></div></section>
<section><h2>审核与发布</h2><p>流程：DRAFT → REVIEW → READY → 发布独立快照。</p><div v-for="item in items" :key="item.id" class="item"><img v-if="vocabularyImage(item.assetKey)" :src="vocabularyImage(item.assetKey)" :alt="item.text" class="vocab-preview"/><input v-model="item.text" :disabled="item.status==='READY'"/><input v-model="item.meaningCn" :disabled="item.status==='READY'"/><select v-model="item.assetKey" :disabled="item.status==='READY'"><option v-for="k in assets" :key="k" :value="k">{{k||'未关联素材'}}</option></select><b>{{item.status}}</b><button v-if="item.status!=='READY'" :disabled="busy" @click="edit(item)">保存</button><button v-if="item.status==='DRAFT'" :disabled="busy" @click="transition(item,'review')">送审</button><button v-if="item.status==='REVIEW'" :disabled="busy" @click="transition(item,'approve')">人工批准</button></div><button :disabled="busy||!items.some(x=>x.status==='READY')" @click="publish">发布新的学习包版本</button></section>
<p class="error" role="alert">{{error}}</p><p class="success" role="status">{{feedback}}</p></main></template>
<style scoped>
.parent{max-width:1160px;margin:auto;padding:18px 24px 70px;color:#344b49}
.parent :where(button,input,select){font:inherit}
.hero{background:linear-gradient(105deg,#725cd1,#9e8bef 60%,#c4a8ef);color:#fff;padding:34px 38px;border-radius:30px;display:flex;justify-content:space-between;align-items:center;gap:15px;box-shadow:0 12px 30px #8473c638}.hero h1{font-size:34px;margin:9px 0}.hero p{margin:0;opacity:.9}.section-eyebrow{font-size:11px;font-weight:850;letter-spacing:2px;color:#a793e8}.hero .section-eyebrow{color:#eae4ff}.kid-link{background:#fff;color:#6651be;font-size:15px;font-weight:800;text-decoration:none;border-radius:17px;padding:15px 18px;white-space:nowrap}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:18px 0}.stats>div{display:flex;gap:6px;flex-direction:column;border-radius:22px;background:#fff;padding:18px 24px;box-shadow:0 7px 22px #7688a114}.stats strong{font-size:32px;color:#785dc9}.stats span{color:#87919d;font-size:13px}
.parent section{background:#fff;border-radius:24px;padding:28px;margin:18px 0;box-shadow:0 8px 28px #7688a112}.parent section h2{font-size:23px;margin:0 0 14px}.parent section p{color:#71808a}.form,.item{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.item{padding:13px 0;border-bottom:1px solid #edf0f4}.item b{color:#917ac7;font-size:12px}
.parent input:not([type=file]),.parent select{padding:12px 13px;border:1px solid #dce2ec;border-radius:13px;min-width:140px;background:#fff}.parent input:focus,.parent select:focus{outline:2px solid #bba9ec}
.parent button{padding:12px 18px;background:#806cd3;color:#fff;border:0;border-radius:13px;cursor:pointer;font-weight:750}.parent button:disabled{opacity:.55}.parent small{display:block;margin:10px 0;color:#8a929f}.error{color:#ba3855}.success{color:#378b67}
.vocab-preview{height:68px;width:68px;object-fit:contain;border-radius:14px;background:#f1f6ee;border:1px solid #e7efe5;flex-shrink:0}
.import-section{background:linear-gradient(110deg,#fff,#faf8ff)!important}.section-heading{display:flex;justify-content:space-between;align-items:center}.section-heading p{margin:0 0 22px}.section-emoji{font-size:55px}.upload{display:inline-flex;align-items:center;gap:10px;position:relative;border:2px dashed #b9a4e7;background:#f5f0ff;color:#6550b7;border-radius:18px;padding:18px 25px;cursor:pointer;font-weight:800}.upload input{position:absolute;width:100%;height:100%;inset:0;opacity:0;cursor:pointer}.upload.disabled{opacity:.5;pointer-events:none}
.import-progress{margin-top:20px;border-radius:15px;background:#f4f0fc;padding:16px}.progress-row{display:flex;justify-content:space-between}.import-progress progress{width:100%;height:15px;accent-color:#9076da;margin-top:10px}.import-progress p{margin:5px 0!important}
@media(max-width:680px){.parent{padding:12px}.hero{padding:23px;flex-direction:column;align-items:flex-start}.hero h1{font-size:26px}.stats{gap:7px}.stats>div{padding:12px}.stats strong{font-size:24px}.parent section{padding:20px}.section-emoji{display:none}}
</style>