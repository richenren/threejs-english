export type ContentType='WORD'|'PHRASE'|'COMMAND'|'SENTENCE';
export interface ContentItem {id:string;text:string;meaningCn:string;type:ContentType;assetKey:string;status:'DRAFT'|'REVIEW'|'READY'|'REJECTED';rejectReason?:string;}
export interface AttemptEvent {eventId:string;sessionId:string;contentItemId:string;packageVersion:string;activityVersion:number;firstTryCorrect:boolean;semanticErrors:number;hintLevel:number;responseMs:number;occurredAt:string;syncStatus:'PENDING'|'SYNCED';worldId?:string;stageId?:string;activityType?:string;}
export interface LearningPackage {packageVersion:string;publishedAt:string;items:ContentItem[];}
export const starterItems:ContentItem[]=[
{id:'apple',text:'apple',meaningCn:'苹果',type:'WORD',assetKey:'food.apple',status:'READY'},
{id:'banana',text:'banana',meaningCn:'香蕉',type:'WORD',assetKey:'food.banana',status:'READY'},
{id:'cup',text:'cup',meaningCn:'杯子',type:'WORD',assetKey:'tableware.cup',status:'READY'},
{id:'plate',text:'plate',meaningCn:'盘子',type:'WORD',assetKey:'tableware.plate',status:'READY'},
{id:'bread',text:'bread',meaningCn:'面包',type:'WORD',assetKey:'food.bread',status:'READY'}];