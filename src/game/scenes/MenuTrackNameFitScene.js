import { MenuScene as CurrentMenuScene } from './MenuCarPreviewFixScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class MenuScene extends CurrentMenuScene {
  _renderTrackCard(x,y,w,h,track,key){
    super._renderTrackCard(x,y,w,h,track,key);

    const expected=String(track?.name||this._trackTitle?.(key)||'').toUpperCase();
    if(!expected||!this._ui)return;

    let title=null;
    const visit=(node)=>{
      if(!node||title)return;
      if(typeof node.text==='string'&&node.text.trim().toUpperCase()===expected){
        title=node;
        return;
      }
      if(Array.isArray(node.list)){
        for(let i=node.list.length-1;i>=0&&!title;i--)visit(node.list[i]);
      }
    };
    visit(this._ui);
    if(!title)return;

    const panelW=clamp(Math.floor(this.scale.width*.145),236,264);
    const maxTitleW=panelW-28;
    title.setWordWrapWidth?.(maxTitleW,true);

    let fontSize=19;
    title.setFontSize?.(fontSize);
    const oneLineHeight=26;
    while(fontSize>14&&Number(title.height)>oneLineHeight){
      fontSize-=1;
      title.setFontSize?.(fontSize);
    }

    // Último recurso para nombres excepcionalmente largos: priorizamos
    // una sola línea limpia frente a invadir la preview del circuito.
    if(Number(title.height)>oneLineHeight){
      title.setFontSize?.(14);
      title.setWordWrapWidth?.(maxTitleW+18,true);
    }
  }
}
