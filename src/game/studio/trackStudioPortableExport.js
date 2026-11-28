// Portable TrackStudio export data. Pure assembly: packaging never requires
// browser transient user activation and never changes the open circuit.
import {packImageProject} from './imageCanvasProject.js';

const slug=value=>String(value||'circuito').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-')
 .replace(/^-+|-+$/g,'').slice(0,48).toLowerCase()||'circuito';
export function buildTrackStudioPortableExport(data,{
 imageBlob=null,imageMeta=null,stamp=Date.now()
}={}){
 if(!data?.editor||!data?.gameTrack)throw Error('No hay circuito válido para exportar');
 const editorGuides=data.editor.aiLineGuides?.points?.length||0;
 const gameGuides=data.gameTrack.aiLineGuides?.points?.length||0;
 if(editorGuides!==gameGuides)throw Error('Las guías IA no coinciden en los datos del circuito');
 const name='trackstudio-'+slug(data.gameTrack.name)+'-'+String(stamp);
 const hasImage=Boolean(data.editor.imageCanvas?.imageId);
 if(hasImage){
  if(!(imageBlob instanceof Blob)||!imageBlob.size)throw Error('No se encuentra la imagen maestra');
  const meta=imageMeta||data.editor.imageCanvas;
  const blob=packImageProject(data,imageBlob,meta);
  return{blob,filename:name+'.tdrtrack',mime:'application/octet-stream',
   imageIncluded:true,guideCount:editorGuides};
 }
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 return{blob,filename:name+'.json',mime:'application/json',
  imageIncluded:false,guideCount:editorGuides};
}
export function buildTrackStudioRescueJson(data,{stamp=Date.now()}={}){
 if(!data?.editor||!data?.gameTrack)throw Error('No hay datos del circuito');
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 return{blob,filename:'trackstudio-respaldo-'+String(stamp)+'.json',
  mime:'application/json',imageIncluded:false,
  guideCount:data.editor.aiLineGuides?.points?.length||0};
}

export function buildTrackStudioAiExport(data,{stamp=Date.now()}={}){
 const {editor,gameTrack}=data||{};
 if(!editor||!gameTrack)throw Error('No hay circuito válido');
 const guides=gameTrack.aiLineGuides,bezier=gameTrack.aiBezierLine;
 if(!(bezier?.nodes?.length>=3))throw Error('Genera primero la trazada Bézier');
 if(JSON.stringify(editor.aiLineGuides||null)!==JSON.stringify(guides||null)||
    JSON.stringify(editor.aiBezierLine)!==JSON.stringify(bezier))
   throw Error('Las guías o la Bézier no coinciden con el editor');
 const {worldW,worldH}=gameTrack;
 if(![worldW,worldH].every(n=>Number.isFinite(n)&&n>0))throw Error('Dimensiones inválidas');
 const payload={format:'TDR_TRACKSTUDIO_AI_LINE',version:1,
  trackId:editor.catalogTrackId||gameTrack.id||gameTrack.key||null,
  name:gameTrack.name,direction:gameTrack.raceDirection||editor.catalogRaceDirection||'forward',
  worldW,worldH,worldScale:gameTrack.meta?.imageNative?.worldScale??1,
  coordinateSpace:'published-world-px',sourceSignature:editor.catalogSourceSignature||null,
  sourceSha256:gameTrack.meta?.sourceSha256||null,
  sourceImageSha256:gameTrack.meta?.sourceImageSha256||null,
  aiLineGuides:guides||null,aiBezierLine:bezier};
 return {blob:new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),
 filename:'trackstudio-ia-'+slug(gameTrack.name)+'-'+stamp+'.json',
 mime:'application/json',imageIncluded:false,guideCount:guides?.points?.length||0};
}
