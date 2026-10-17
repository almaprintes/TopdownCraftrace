// Build-time ONLY. Derive a locally warped photograph of the Narrow-70 test
// circuit; no Canvas/WebGL image processing is added to the runtime.
// Preserve original WebP and original Track Studio project untouched.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {buildOwnerKartingCanarias} from './install-karting-canarias-source.mjs';
import {narrowCanariasTrack,NARROW_RATIO} from '../src/game/tracks/kartingCanariasNarrow70.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=path.join(root,'public/assets/tracks/karting-canarias/karting-canarias-new.webp');
const output=path.join(root,'public/assets/tracks/karting-canarias-narrow70');
const project=path.join(root,'src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json');
const target=path.join(root,'src/game/tracks/library/karting-canarias-narrow70/track.json');
const GRID=8,CELL=110;
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const key=(x,y)=>x+':'+y;
function lineIndex(nodes,w,h){
  const bins=new Map(),segments=[];
  const len=nodes.length;
  for(let i=0;i<len;i++){
    const a=nodes[i],b=nodes[(i+1)%len],vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;
    if(l2<.1)continue;
    const maxW=Math.max(Number(a.width)||105,Number(b.width)||105),expand=maxW*1.9+90;
    const s={ax:a.x,ay:a.y,vx,vy,l2,wa:a.width,wb:b.width};
    segments.push(s);const id=segments.length-1;
    const left=clamp(Math.floor((Math.min(a.x,b.x)-expand)/CELL),0,Math.floor(w/CELL));
    const right=clamp(Math.floor((Math.max(a.x,b.x)+expand)/CELL),0,Math.floor(w/CELL));
    const top=clamp(Math.floor((Math.min(a.y,b.y)-expand)/CELL),0,Math.floor(h/CELL));
    const bottom=clamp(Math.floor((Math.max(a.y,b.y)+expand)/CELL),0,Math.floor(h/CELL));
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
      const k=key(x,y),current=bins.get(k);
      if(current)current.push(id);else bins.set(k,[id]);
    }
  }
  return {bins,segments};
}
export function warpPoint(x,y,index){
  const nearby=index.bins.get(key(Math.floor(x/CELL),Math.floor(y/CELL)));
  if(!nearby)return [x,y];
  let min=Infinity,best=null;
  for(const id of nearby){
    const s=index.segments[id],t=clamp(((x-s.ax)*s.vx+(y-s.ay)*s.vy)/s.l2,0,1);
    const cx=s.ax+s.vx*t,cy=s.ay+s.vy*t,dx=x-cx,dy=y-cy,d2=dx*dx+dy*dy;
    if(d2<min){min=d2;best={s,t,dx,dy};}
  }
  if(!best||min<1e-6)return [x,y];
  const d=Math.sqrt(min);
  const {s,t,dx,dy}=best;
  const w=Number(s.wa||105)*(1-t)+Number(s.wb||105)*t;
  // Existing photographed edges are near w/2 but manually offset by editor;
  // this warp changes pixels around the same centerline, not image dimensions.
  const oldHalf=w*.5,newHalf=oldHalf*NARROW_RATIO;
  const outer=oldHalf+Math.max(75,oldHalf);
  if(d>=outer)return [x,y];
  const srcDistance=d<=newHalf?d/NARROW_RATIO
    :oldHalf+(d-newHalf)*(outer-oldHalf)/(outer-newHalf);
  const shift=(srcDistance-d)/d;
  return [x+dx*shift,y+dy*shift];
}
export function warpRawPhoto(inputPixels,w,h,track){
  if(inputPixels.length!==w*h*4)throw Error('Narrow-70 requires RGBA source');
  const index=lineIndex(track.centerline,w,h);
  const columns=Math.ceil(w/GRID)+1,rows=Math.ceil(h/GRID)+1;
  const warpX=new Float32Array(columns*rows),warpY=new Float32Array(columns*rows);
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
    const px=Math.min(w-1,x*GRID),py=Math.min(h-1,y*GRID);
    const uv=warpPoint(px,py,index),i=y*columns+x;
    warpX[i]=uv[0]-px;warpY[i]=uv[1]-py;
  }
  const out=Buffer.allocUnsafe(inputPixels.length);
  for(let y=0;y<h;y++){
    const gy=Math.floor(y/GRID),ty=(y%GRID)/GRID;
    for(let x=0;x<w;x++){
      const gx=Math.floor(x/GRID),tx=(x%GRID)/GRID;
      const a=gy*columns+gx,b=a+1,c=a+columns,d=c+1;
      const l0=(1-tx)*(1-ty),l1=tx*(1-ty),l2=(1-tx)*ty,l3=tx*ty;
      const u=clamp(x+warpX[a]*l0+warpX[b]*l1+warpX[c]*l2+warpX[d]*l3,0,w-1.00001);
      const v=clamp(y+warpY[a]*l0+warpY[b]*l1+warpY[c]*l2+warpY[d]*l3,0,h-1.00001);
      const X=Math.floor(u),Y=Math.floor(v),fx=u-X,fy=v-Y,ii=(Y*w+X)*4;
      const target=(y*w+x)*4,aa=(1-fx)*(1-fy),bb=fx*(1-fy),cc=(1-fx)*fy,dd=fx*fy;
      for(let z=0;z<4;z++)out[target+z]=Math.round(
        inputPixels[ii+z]*aa+inputPixels[ii+4+z]*bb+
        inputPixels[ii+w*4+z]*cc+inputPixels[ii+w*4+4+z]*dd);
    }
  }
  return out;
}
export async function installNarrow70(){
  const j=JSON.parse(fs.readFileSync(project,'utf8'));
  const original=buildOwnerKartingCanarias();
  const variant=narrowCanariasTrack(original,j.editor);
  const img=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(img.info.width!==2048||img.info.height!==3072||img.info.channels!==4)
    throw Error('Karting Canarias original WebP source is not 2048x3072 RGBA');
  const pixels=warpRawPhoto(img.data,2048,3072,j.gameTrack);
  const rgba={raw:{width:2048,height:3072,channels:4}};
  fs.mkdirSync(output,{recursive:true});
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const master=path.join(output,'narrow70-master.webp');
  await sharp(pixels,rgba).webp({quality:90,effort:3}).toFile(master);
  for(let row=0;row<2;row++)for(let col=0;col<2;col++)
    await sharp(pixels,rgba).extract({left:col*1024,top:row*1536,width:1024,height:1536})
      .webp({quality:90,effort:3}).toFile(path.join(output,'photo-'+row+'-'+col+'.webp'));
  fs.writeFileSync(target,JSON.stringify(variant,null,2)+'\n');
  return {variant:variant.meta.id,width:variant.trackWidth,world:[variant.worldW,variant.worldH],
    tiles:variant.meta.imageNative.tiles.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  console.log('[karting-canarias] DEV NARROW70 PHOTO + WORLD INSTALLED',await installNarrow70());
