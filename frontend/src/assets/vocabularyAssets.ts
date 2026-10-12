import {vocabularyImage as legacyVocabularyImage} from './vocabulary';

export function normalizeVocabularyAssetName(word:string){
  return word.trim().toLowerCase()
    .replace(/[’']/g,'-')
    .replace(/\s+/g,'-')
    .replace(/[^a-z0-9-]/g,'')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
}

export function vocabularyAssetCandidates(word:string,assetKey?:string){
  const name=normalizeVocabularyAssetName(word);
  const result:string[]=[];
  if(name){
    result.push(
      '/vocabulary-assets/'+name+'.webp',
      '/vocabulary-assets/'+name+'.png',
      '/vocabulary-assets/'+name+'.jpg'
    );
  }
  const legacy=assetKey?legacyVocabularyImage(assetKey):undefined;
  if(legacy&&!result.includes(legacy))result.push(legacy);
  return result;
}
