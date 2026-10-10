export type HintLevel=0|1|2|3|4;
export function nextHint(level:HintLevel):HintLevel{return Math.min(4,level+1) as HintLevel}
export function masteryDelta(input:{firstTryCorrect:boolean;crossDay?:boolean;contextVaried?:boolean;hintLevel:number;semanticErrors:number}){
 if(input.firstTryCorrect)return input.crossDay||input.contextVaried?4:3;
 if(input.hintLevel===1)return 2;if(input.hintLevel===2)return 1;if(input.hintLevel>=3)return 0;
 return input.semanticErrors>0?-2:0;
}