// Viewport-only positioning for the DOM ghost controls; never read race camera zoom.
export function ghostPanelViewportRect({canvasRect,viewportWidth,viewportHeight,ghostLayout,panelWidth,panelHeight}={}){
  const vw=Number(viewportWidth),vh=Number(viewportHeight);
  const cw=Number(canvasRect?.width),ch=Number(canvasRect?.height);
  const px=Number(ghostLayout?.x),width=Number(ghostLayout?.controlWidth);
  const top=Number(ghostLayout?.topY),panelW=Number(panelWidth),panelH=Number(panelHeight);
  if(![vw,vh,cw,ch,px,width,top,panelW,panelH,Number(canvasRect?.left),Number(canvasRect?.top)].every(Number.isFinite)||
    vw<=0||vh<=0||cw<=0||ch<=0||width<=0||panelW<=0||panelH<=0)return null;
  // Align the right edge with the original Ghost controls; the wider 3-row
  // overlay must not extend off-screen. Inverse tracks use the identical layout.
  const right=px+width/2;
  const left=Math.max(0,right-panelW);
  return {
    left:Number(canvasRect.left)+(left/vw)*cw,
    top:Number(canvasRect.top)+(top/vh)*ch,
    width:(Math.min(panelW,right)/vw)*cw,
    height:(panelH/vh)*ch,
    fontPx:Math.max(9,Math.min(15,12*cw/vw))
  };
}
