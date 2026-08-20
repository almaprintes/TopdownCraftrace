import { MenuScene as CurrentMenuScene } from './MenuCarPreviewFixScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class MenuScene extends CurrentMenuScene {
  _renderGlobalEventCard(){
    super._renderGlobalEventCard();
    if(!this._ui)return;

    let card=null;
    const visit=(node)=>{
      if(!node||card)return;
      if(Array.isArray(node.list)){
        const texts=node.list.filter(child=>typeof child?.text==='string');
        if(texts.some(t=>/^EVENTO(?:\s+COMPLETADO|\s+\d+\/\d+)$/i.test(t.text.trim()))) {
          card=node;
          return;
        }
        for(const child of node.list)visit(child);
      }
    };
    visit(this._ui);
    if(!card)return;

    const texts=card.list
      .filter(child=>typeof child?.text==='string')
      .sort((a,b)=>Number(a.y)-Number(b.y));
    if(texts.length<4)return;

    const stageIndex=texts.findIndex(t=>/^EVENTO(?:\s+COMPLETADO|\s+\d+\/\d+)$/i.test(t.text.trim()));
    if(stageIndex<0)return;

    const title=texts[stageIndex+1];
    const description=texts[stageIndex+2];
    const reward=texts[stageIndex+3];
    if(!title||!description||!reward)return;

    const panelW=clamp(Math.floor(this.scale.width*.145),236,264);
    title.setFontSize?.(18);
    title.setWordWrapWidth?.(panelW-30,true);
    title.setLineSpacing?.(0);

    description.y=Math.max(Number(description.y)||0,(Number(title.y)||0)+(Number(title.height)||0)+7);
    reward.y=Math.max(Number(reward.y)||0,(Number(description.y)||0)+(Number(description.height)||0)+7);
  }

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