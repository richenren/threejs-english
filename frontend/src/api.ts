import type {ContentItem,LearningPackage} from './domain';
const parentKey=()=>sessionStorage.getItem('parentAccessKey')||'';
export async function api<T>(url:string,options:RequestInit={},parent=false):Promise<T>{
 const headers:Record<string,string>={'Content-Type':'application/json',...(options.headers as Record<string,string>||{})};
 if(parent)headers['X-Parent-Key']=parentKey();
 const r=await fetch('/api/v1'+url,{...options,headers});let json:any;try{json=await r.json()}catch{throw new Error('网络响应异常 HTTP '+r.status)}
 if(!r.ok)throw new Error(json?.detail||json?.message||'HTTP '+r.status);
 return json.data as T;
}
export type BulkResult={total:number;succeeded:number;skipped:number;failed:number;failures:{id:string;reason:string}[]};
export const parentApi={
 importCsv:async(file:File):Promise<BulkResult>=>{
  const body=new FormData();body.append('file',file);
  const response=await fetch('/api/v1/parent/content/import',{method:'POST',headers:{'X-Parent-Key':parentKey()},body});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.detail||payload?.message||'HTTP '+response.status);
  return payload.data as BulkResult;
 },
 batch:(input:{ids:string[];action:'REVIEW'|'APPROVE'|'REJECT';reason?:string;status?:string;search?:string;allFiltered:boolean})=>
   api<BulkResult>('/parent/content/batch-transition',{method:'POST',body:JSON.stringify(input)},true),
 activateCommon2000:()=>api<{total:number;created:number;approved:number;alreadyReady:number;failed:number;failures:string[]}>('/parent/content/builtin/common-2000/activate',{method:'POST'},true),
 list:()=>api<ContentItem[]>('/parent/content',{},true),
 create:(item:Pick<ContentItem,'text'|'meaningCn'|'type'|'assetKey'>)=>api<ContentItem>('/parent/content',{method:'POST',body:JSON.stringify(item)},true),
 update:(id:string,item:Pick<ContentItem,'text'|'meaningCn'|'type'|'assetKey'>)=>api<ContentItem>('/parent/content/'+id,{method:'PUT',body:JSON.stringify(item)},true),
 transition:(id:string,action:'review'|'approve')=>api<ContentItem>('/parent/content/'+id+'/'+action,{method:'POST'},true),
 publish:()=>api<{packageVersion:string;itemCount:number}>('/parent/packages/publish',{method:'POST'},true),
 suggest:(text:string)=>api<{meaningCn:string;exampleSentence:string;assetKey:string}>('/parent/ai/suggest',{method:'POST',body:JSON.stringify({text})},true)
};
export const latestPackage=()=>api<LearningPackage>('/kid/packages/latest');