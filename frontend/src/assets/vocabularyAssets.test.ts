import {describe,it,expect} from 'vitest';
import {normalizeVocabularyAssetName,vocabularyAssetCandidates} from './vocabularyAssets';

describe('vocabulary asset resolver',()=>{
  it('normalizes words into stable asset filenames',()=>{
    expect(normalizeVocabularyAssetName("We'll")).toBe('we-ll');
    expect(normalizeVocabularyAssetName('ice cream')).toBe('ice-cream');
  });
  it('prefers high quality word assets before legacy semantic assets',()=>{
    const paths=vocabularyAssetCandidates('apple','food.apple');
    expect(paths[0]).toBe('/vocabulary-assets/apple.webp');
    expect(paths).toContain('/vocabulary/apple.svg');
  });
});
