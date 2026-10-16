import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installTrackStudioGateControls} from '../src/game/studio/trackStudioGateControls.js';

const src=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
assert.ok(src.includes('installTrackStudioGateControls(this)'), 'Always-visible gate controls must be installed');
assert.ok(src.includes("if (this._modeTool === 'start') return this._setTool('start')"), 'Grouped tool menu must support SALIDA');
assert.ok(src.includes("{ key: 'start', label: 'SAL' }"), 'Grouped tool menu must offer SALIDA next to META');
assert.ok(src.includes("this._placeStartLineAt(world.x, world.y)"), 'Viewport taps must invoke start gate placement');
assert.ok(src.includes("this._placeFinishLineAt(world.x, world.y)"), 'Viewport taps must invoke finish gate placement');
assert.ok(src.includes('startLine: this._startLine'), 'Editable project must persist authored start gate');
assert.ok(src.includes('finishLine: this._finishLine'), 'Editable project must persist authored finish gate');
assert.ok(src.includes('if (!this._isClosed && this._raceType === \'stage\' && startLine?.a && startLine?.b)'), 'Rally start spawn must be derived from authored line');
assert.ok(src.includes('    startLine,\n    finishLine,\n    checkpoints,'), 'Both gates must be emitted into gameTrack');

class El {
  constructor(tag){this.tag=tag;this.style={};this.children=[];this.attrs={};this.handlers={};this.dataset={};this.textContent='';this.removed=false;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){this.handlers[k]=fn;}
  appendChild(node){this.children.push(node);}
  remove(){this.removed=true;}
  fire(name){assert.ok(this.handlers[name]);let stopped=false;this.handlers[name]({preventDefault(){},stopPropagation(){stopped=true;}});return stopped;}
}
const oldDoc=globalThis.document,oldWindow=globalThis.window;
const body=new El('body'),listeners={};
globalThis.document={createElement:tag=>new El(tag),body};
globalThis.window={addEventListener:(type,fn)=>listeners[type]=fn,removeEventListener:type=>delete listeners[type]};
try{
  const exits={};
  const scene={
    _viewX:76,_viewY:80,_viewW:564,_viewH:530,_tool:'edit',
    _startLine:null,_finishLine:null,_autosaves:0,
    game:{canvas:{getBoundingClientRect:()=>({left:50,top:100,width:950,height:700})}},
    scale:{width:950,height:700},
    events:{once:(type,fn)=>exits[type]=fn},
    _setTool(t){this._tool=t;},
    _flashMessage(t){this._message=t;},
    _placeStartLineAt(x,y){this._startLine={a:{x,y:y-45},b:{x,y:y+45},normal:{x:1,y:0}};},
    _placeFinishLineAt(x,y){this._finishLine={a:{x,y:y-45},b:{x,y:y+45},normal:{x:1,y:0}};},
    _applyProjectData(d){this._startLine=d.startLine||null;this._finishLine=d.finishLine||null;},
    _newProject(){this._startLine=null;this._finishLine=null;},
    _toggleClosed(){this._isClosed=!this._isClosed;},
    _autosaveRecovery(){this._autosaves++;}
  };
  scene._rightPanelW=280;
  scene._panelActionsY=302;
  scene._nodes=[{x:100,y:200}];
  scene._selectedNode=-1;
  scene._selectedPiano=-1;
  scene._shapeEditing=false;
  scene._deleteSelectedNode=()=>{scene._nodes=[];scene._selectedNode=-1;scene._deleted=true;};
  scene._updatePanel=()=>{};
  const gate=installTrackStudioGateControls(scene);
  assert.ok(gate);
  assert.equal(gate.start.textContent,'SALIDA');
  assert.equal(gate.finish.textContent,'META');
  assert.ok(gate.start.style.cssText.includes('min-height:44px'),'Both gate buttons must have >=44px touch targets');
  assert.ok(body.children.includes(gate.root),'Gate controls need to be visible in actual DOM');
  const canvasLeft=50;
  const viewportRight=canvasLeft+scene._viewX+scene._viewW;
  assert.ok(Number.parseFloat(gate.root.style.left)>=viewportRight,'All drawing tools must be docked outside the map viewport');
  assert.equal(Number.parseFloat(gate.root.style.top),100+scene._panelActionsY+34,'Dock must anchor to ACCIONES in the inspector');
  assert.ok(gate.root.style.cssText.includes('overflow-y:auto'),'Short landscape screens must be able to scroll tools');
  assert.deepEqual(Object.keys(gate.buttons),['edit','pen','start','finish','checkpoint','piano']);
  assert.ok(Object.values(gate.buttons).every(b=>b.style.cssText.includes('min-height:44px')),'All six modes need usable touch targets');
  assert.equal(gate.buttons.pen.textContent,'PLUMA');
  assert.equal(gate.buttons.checkpoint.textContent,'CONTROL');
  gate.buttons.pen.fire('click');
  assert.equal(scene._tool,'pen');
  assert.equal(gate.buttons.pen.attrs['aria-pressed'],'true','Active mode is visible');
  assert.equal(gate.status.textContent,'Toca o arrastra para dibujar');
  gate.buttons.edit.fire('click');
  assert.equal(gate.status.textContent,'Salida —  ·  Meta —');

  assert.equal(gate.start.fire('click'),true);
  assert.equal(scene._tool,'start');
  assert.equal(gate.start.attrs['aria-pressed'],'true');
  assert.match(gate.status.textContent,/Toca la pista para situar SALIDA/);
  scene._placeStartLineAt(120,400);
  assert.ok(scene._startLine?.a);
  assert.equal(scene._finishLine,null,'Placing SALIDA cannot also place META');
  assert.equal(scene._autosaves,1,'Gate must be auto-recovered after placing it');

  gate.finish.fire('click');
  assert.equal(scene._tool,'finish');
  scene._placeFinishLineAt(700,900);
  assert.equal(scene._autosaves,2);
  assert.equal(scene._startLine.a.x,120,'META must never move SALIDA');
  assert.equal(scene._finishLine.a.x,700);
  scene._setTool('edit');
  assert.equal(gate.status.textContent,'Salida ✓  ·  Meta ✓');
  scene._selectedNode=0;
  scene._updatePanel();
  assert.equal(gate.remove.style.display,'block','Delete is contextual, not floating over the road');
  gate.remove.fire('click');
  assert.equal(scene._deleted,true);
  assert.equal(gate.remove.style.display,'none');
  scene._newProject();
  assert.equal(gate.status.textContent,'Salida —  ·  Meta —');

  scene._applyProjectData({startLine:{a:{x:12,y:20},b:{x:12,y:40}},finishLine:{a:{x:500,y:100},b:{x:500,y:200}}});
  assert.equal(gate.status.textContent,'Salida ✓  ·  Meta ✓','Project restoration must update gate status');
  exits.shutdown();
  assert.equal(gate.root.removed,true,'Scene shutdown must remove DOM controls');
  assert.ok(!Object.keys(listeners).length,'Scene shutdown must detach global listeners');
}finally{
 if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
}
console.log('TRACK STUDIO PANEL OK: six labelled 44px tools docked outside map, responsive scrolling, gates, contextual delete, recovery, cleanup.');
