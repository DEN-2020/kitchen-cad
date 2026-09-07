export type VisualAsset = {
  id:string;
  category:'appliance'|'fixture'|'decor';
  source:'procedural'|'kenney-cc0'|'user';
  modelUrl?:string;
  license:string;
  nominalMm:[number,number,number];
};

// Visual skins never define manufacturing dimensions. The parametric model remains authoritative.
export const VISUAL_ASSETS:Record<string,VisualAsset> = {
  washer:{id:'washer-procedural-v2',category:'appliance',source:'procedural',license:'Project generated geometry',nominalMm:[600,850,600]},
  dishwasher:{id:'dishwasher-procedural-v2',category:'appliance',source:'procedural',license:'Project generated geometry',nominalMm:[600,815,570]},
  oven:{id:'oven-procedural-v2',category:'appliance',source:'procedural',license:'Project generated geometry',nominalMm:[600,600,560]},
  fridge:{id:'fridge-procedural-v2',category:'appliance',source:'procedural',license:'Project generated geometry',nominalMm:[600,1850,650]},
};

export const ASSET_POLICY = {
  preferredExternal:'Kenney CC0',
  rule:'Keep source URL and license snapshot beside every redistributed asset. Never derive cabinet or cut-list dimensions from a visual model.',
};
