import Dexie,{type Table} from 'dexie';
import type {AttemptEvent,LearningPackage} from '../domain';
class KidDatabase extends Dexie {
 packages!:Table<LearningPackage,string>;pendingEvents!:Table<AttemptEvent,string>;
 constructor(){super('kids-3d-english');this.version(1).stores({packages:'packageVersion,publishedAt',pendingEvents:'eventId,sessionId,syncStatus'});}
}
export const db=new KidDatabase();
export async function queueAttempt(event:AttemptEvent){await db.pendingEvents.put(event)}
export async function syncAttempts(token:string){
 if(!navigator.onLine||!token)return 0;
 const events=await db.pendingEvents.where('syncStatus').equals('PENDING').toArray();if(!events.length)return 0;
 const r=await fetch('/api/v1/kid/sync/attempts',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({events})});
 if(!r.ok)throw new Error('同步失败');
 const result=await r.json();const ids:string[]=result.data?.acceptedEventIds??[];
 await db.transaction('rw',db.pendingEvents,async()=>{for(const id of ids)await db.pendingEvents.update(id,{syncStatus:'SYNCED'})});return ids.length;
}