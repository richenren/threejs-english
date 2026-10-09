/** Bundled, offline-friendly static illustrations indexed by semantic asset key. */
export const vocabularyImage = (assetKey: string): string | undefined => {
  const names: Record<string,string> = {
    'food.apple': 'apple', 'food.banana': 'banana', 'food.bread': 'bread',
    'tableware.cup': 'cup', 'tableware.plate': 'plate'
  };
  const name = names[assetKey];
  return name ? '/vocabulary/' + name + '.svg' : undefined;
};
