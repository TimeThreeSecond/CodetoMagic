export type CastAsset={text:string;name:string};
export function CastPage({asset}:{asset:CastAsset|null}){
 return <main><section className="intro"><div><div className="eyebrow">PALM / PROJECTION / MANIFESTATION</div><h1>让术式，在掌前展开。</h1><p>{asset?`已选法阵：${asset.name}`:'先在代码炼成或法阵播放页面选择「用于施法」。'}</p></div></section></main>;
}
