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
