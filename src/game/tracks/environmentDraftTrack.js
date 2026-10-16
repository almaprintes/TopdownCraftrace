// DEV 1.2.217: unpublished image-native track editable only in Environment Studio.
export const AMERICAS='karting-americas';
export const STORAGE='tdr2:environment-draft-track:karting-americas:v1';
export function readDraft(storage=globalThis.localStorage){
 try{const t=JSON.parse(storage?.getItem?.(STORAGE)||'null');
  return t?.id===AMERICAS&&t?.meta?.imageNative?.availability==='local'&&t.centerline?.length>2?t:null;
 }catch{return null;}
}
export function writeDraft(project,storage=globalThis.localStorage){
 const t=project?.gameTrack,a=project?.imageAsset;
 if(!t?.trackShape?.leftEdge?.length||!t?.trackShape?.rightEdge?.length||!t?.centerline?.length||!a?.imageId)throw Error('Proyecto .tdrtrack incompleto');
 if(t.worldW!==a.width||t.worldH!==a.height||t.worldW!==2862||t.worldH!==3435)throw Error('Se requiere Karting Américas x2.5: 2862 × 3435');
 const out={...t,id:AMERICAS,key:AMERICAS,name:'KARTING AMÉRICAS',
  meta:{...t.meta,renderMode:'image-native',imageNative:{...t.meta?.imageNative,availability:'local',imageId:a.imageId,width:a.width,height:a.height},environmentStudioDraft:true}};
 storage?.setItem?.(STORAGE,JSON.stringify(out));
 return out;
}
