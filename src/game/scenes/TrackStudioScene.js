import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { createTrack, getTrackKeys } from '../tracks/trackRegistry.js';
import { installTrackStudioImageMode, importImageProjectFile } from '../studio/installImageMode.js';
import { looksLikeImageProject } from '../studio/imageCanvasProject.js';
import { installTrackStudioExitGuard } from '../studio/trackStudioExitGuard.js';
import { installTrackStudioShapeEditor } from '../studio/installTrackShapeEditor.js';
import { trackStudioWidthStep } from '../studio/trackStudioWidthRange.js';
import { EDITOR_CONTROL_PIXELS, worldControlRadius, pickCenterlineControl } from '../studio/trackStudioControlGeometry.js';
import { interpolateRoadWidth } from '../studio/trackShapeGeometry.js';
import { openTrackStudioSourceMenu } from '../studio/trackStudioSourceMenu.js';
import { installTrackStudioGateControls } from '../studio/trackStudioGateControls.js';
import { createPenAnchor, penGestureIsCurve, updatePenAnchorFromDrag } from '../studio/trackStudioPenTool.js';
import {trackStudioToolbarLayout} from '../studio/trackStudioNavigationLayout.js';
import {zoomTrackCameraAt,beginTrackPinch,updateTrackPinch,fitTrackCamera} from '../studio/trackStudioZoom.js';
import '../studio/trackStudioLabChrome.css';
import {mountTrackStudioLabChrome} from '../studio/trackStudioLabChrome.js';

export class TrackStudioScene extends BaseScene {
  constructor() {
    super('TrackStudioScene');
  }

  create() {
    super.create();

    const { width, height } = this.scale;

    // =================================================
    // Layout base
    // =================================================
    const compactH = height < 720;
    this._topBarH = compactH ? 76 : 82;
    // The iPhone landscape Dynamic Island covers the former 70px left rail.
    // Shift navigation right without placing controls above the track itself.
    this._leftBarW = compactH ? (width>=760?110:96) : 88;
    this._rightPanelW = width < 1200 ? 250 : 280;
    this._toolbarLayout=trackStudioToolbarLayout(width,this._rightPanelW);
    if(this._toolbarLayout.twoRows)this._topBarH=Math.max(this._topBarH,76);
    this._bottomPad = 8;

this._viewX = this._leftBarW + 8;
this._viewY = this._topBarH + 8;
this._viewW = width - this._leftBarW - this._rightPanelW - 16;
this._viewH = height - this._topBarH - this._bottomPad - 16;

    // =================================================
    // Estado editor
    // =================================================
    this._editorWorldW = 8000;
    this._editorWorldH = 5000;

    this._nodes = [];
    this._selectedNode = -1;
    this._selectedPart = null;

    this._draggingPart = false;
    this._dragMoved = false;
    this._dragStartScreen = null;
    this._dragStartWorld = null;
    this._penGesture = null; // Temporary preview, committed only on pointerup.

    this._tapCandidate = false;
    this._gestureWasMultiTouch = false;
    this._panLast = null;
    this._pinchLastDist = 0;
      this._mapGesture = null;

    this._editZoomMin = 0.12;
    this._editZoomMax = 2.5;

    this._trackWidth = 140;
    this._widthStep = 5; // Fine editing by default, independent of image resolution.
    this._trackWidthMin = 30;
    this._trackWidthMax = 260;

    this._isClosed = false;
    this._tool = 'edit'; // 'edit' | 'start' | 'finish' | 'checkpoint' | 'piano'
    this._startLine = null;
    this._finishLine = null;
    this._showStartingGrid = true;
    this._checkpoints = [];

    // pianos manuales
    this._pianos = [];
    this._selectedPiano = -1;

    // guía de fondo
    this._guideImage = null;
    this._guideTextureKey = null;
    this._guideVisible = true;
    this._guideAlpha = 0.32;
    this._guideScale = 1;
    this._guideX = null;
    this._guideY = null;
    this._guideLocked = true;
    this._guideDragging = false;
    this._guideDragLast = null;
    this._guideInput = null;
    this._projectInput = null;
    this._raceType = 'circuit';
    this._importedTrackMeta = null;
    this._undoStack = [];
    this._redoStack = [];
    this._historyLimit = 80;

    // nudge
    this._nudgeSteps = [1, 5, 10];
    this._nudgeStepIndex = 2;

    // grupos toolbar
    this._saveTool = 'save';
    this._saveMenu = null;

    this._viewTool = 'zoomIn';
    this._viewMenu = null;

    this._modeTool = 'edit';
    this._modeMenu = null;

    this._trackTool = 'widthUp';
    this._trackMenu = null;

    this._guideTool = 'load';
    this._guideMenu = null;
    // =================================================
    // UI base
    // =================================================
    this.cameras.main.setBackgroundColor('#07121e');

    this.add.rectangle(0, 0, width, this._topBarH, 0x091726).setOrigin(0);
    this.add.rectangle(0,this._topBarH-2,width,2,0x208e83,0.72).setOrigin(0);
    this.add.rectangle(0, this._topBarH, this._leftBarW, height - this._topBarH, 0x0b1c2b).setOrigin(0);
    this.add.rectangle(width - this._rightPanelW, this._topBarH, this._rightPanelW, height - this._topBarH, 0x0a1a29).setOrigin(0);

    this.add.rectangle(this._viewX, this._viewY, this._viewW, this._viewH, 0x0a0d16)
  .setOrigin(0)
  .setStrokeStyle(2, 0x335f70, 0.8);

    this.add.text(22, 9, 'CRAFT RACE  /  CIRCUIT DESIGN', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '9px', color: '#5ce6bd', fontStyle: 'bold'
    });
    this.add.text(21, 27, 'TRACK STUDIO', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: this._toolbarLayout.twoRows?(width<740?'16px':'20px'):'26px',
      color: '#f4fbff', fontStyle: 'bold'
    });

    this._rightTitle = this.add.text(width - this._rightPanelW + 20, this._topBarH + 18, 'PROPIEDADES', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: compactH ? '16px' : '18px',
      color: '#c7d2ff',
      fontStyle: 'bold'
    });

    this.add.rectangle(
      width - this._rightPanelW + 20,
      this._topBarH + 48,
      this._rightPanelW - 40,
      2,
      0x26324a,
      0.85
    ).setOrigin(0, 0.5);

this._panelContentY = this._topBarH + 62;

// Responsive: actions remain reachable even when browser chrome reduces viewport.
// Leave room for the inspector, but reserve the bottom of the sidebar
// for the complete, scrollable tool palette (never cover the canvas).
this._panelActionsY = height < 650
  ? this._topBarH + 162
  : this._topBarH + 216;

this.add.text(
  width - this._rightPanelW + 20,
  this._panelActionsY,
  'ACCIONES',
  {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
    fontSize: compactH ? '13px' : '15px',
    color: '#c7d2ff',
    fontStyle: 'bold'
  }
);

this.add.rectangle(
  width - this._rightPanelW + 20,
  this._panelActionsY + 26,
  this._rightPanelW - 40,
  2,
  0x26324a,
  0.85
).setOrigin(0, 0.5);
    // Selection deletion now lives in the same accessible sidebar palette.
    // Keep the legacy reference null for the shape inspector's optional check.
    this._panelDeleteBtn = null;
    // =========================
// 🎮 CRUCETA (D-PAD)
// =========================
const rightPanelX = width - this._rightPanelW;
const cx = width - 68;
const cy = this._topBarH + (compactH ? 150 : 170);
const size = compactH ? 24 : 28;

const makePadBtn = (dx, dy, label, onClick) => {
  const x = cx + dx * size;
  const y = cy + dy * size;

  const bg = this.add.circle(x, y, compactH ? 15 : 18, 0x1c2540, 1)
    .setStrokeStyle(2, 0x3c4e7a, 0.95)
    .setInteractive({ useHandCursor: true });

  const txt = this.add.text(x, y, label, {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
    fontSize: '18px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  bg.on('pointerup', onClick);

  return { bg, txt };
};

// botones
this._padUp = makePadBtn(0, -1, '↑', () => {
  this._nudgeSelectedNode(0, -this._getNudgeStep());
});

this._padDown = makePadBtn(0, 1, '↓', () => {
  this._nudgeSelectedNode(0, this._getNudgeStep());
});

this._padLeft = makePadBtn(-1, 0, '←', () => {
  this._nudgeSelectedNode(-this._getNudgeStep(), 0);
});

this._padRight = makePadBtn(1, 0, '→', () => {
  this._nudgeSelectedNode(this._getNudgeStep(), 0);
});

// centro (step)
this._padCenter = this.add.circle(cx, cy, 16, 0x243454, 1)
  .setStrokeStyle(2, 0x5a78b0, 0.95)
  .setInteractive({ useHandCursor: true });

this._padCenterTxt = this.add.text(cx, cy, String(this._getNudgeStep()), {
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
  fontSize: '13px',
  color: '#ffffff',
  fontStyle: 'bold'
}).setOrigin(0.5);

this._padCenter.on('pointerup', () => {
  this._cycleNudgeStep();
  this._padCenterTxt.setText(String(this._getNudgeStep()));
});
    const back = this.add.text(width - 38, 18, '←', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '22px',
      color: '#ffffff',
      backgroundColor: '#1c2540',
      padding: { x: 12, y: 8 }
    })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });

    back.on('pointerup', () => this._requestExitTrackStudio?.());

    // =================================================
    // Barra izquierda
    // =================================================
    const leftCX = this._leftBarW - 24;
    const leftY = this._topBarH + 20;

    this.add.text(leftCX, leftY, 'NAV', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '12px',
      color: '#90a4d4',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    this._leftHomeBtn = this._makeIconButton(leftCX, this._topBarH + 76, '⌂', () => {
      this._editCam.centerOn(this._editorWorldW / 2, this._editorWorldH / 2);
      this._updatePanel();
    }, '18px');

    this._leftZoomInBtn = this._makeIconButton(leftCX, this._topBarH + 126, '+', () => {
      this._applyZoomAtViewportCenter(1.15);
    }, '20px');

    this._leftZoomOutBtn = this._makeIconButton(leftCX, this._topBarH + 176, '−', () => {
      this._applyZoomAtViewportCenter(1 / 1.15);
    }, '22px');

    this._leftGuideBtn = this._makeIconButton(leftCX, this._topBarH + 226, 'IMG', () => {
      this._toggleReferencePanel();
    }, '12px');

    // =================================================
    // Barra superior
    // =================================================
    const topLayout=this._toolbarLayout;
    let topToolIndex=0;
    const toolPos=()=>{
      const index=topToolIndex++;
      return [topLayout.x[index],topLayout.y[index],topLayout.width,topLayout.height];
    };

// =================================================
// Guardar / Cargar / Nuevo (directos)
// =================================================

// Guardar
this._btnSave = this._makeTopActionButton(...toolPos(), '▣', 'GUARDAR', () => {
  console.log('CLICK SAVE');
  this._flashMessage('💾 Guardando...');
  this._saveProject?.();
}, '18px');


// Cargar
this._btnLoad = this._makeTopActionButton(...toolPos(), '▤', 'ABRIR', () => {
  console.log('CLICK LOAD');
  this._openProjectSourceMenu?.();
}, '18px');


// Nuevo
this._btnNew = this._makeTopActionButton(...toolPos(), '+', 'NUEVO', () => {
  console.log('CLICK NEW');
  const ok = window.confirm('¿Crear un proyecto nuevo?\n\nEl proyecto actual se sustituirá. Guarda una copia antes si quieres conservarlo.');
  if (!ok) return;
  this._pushHistory();
  this._newProject?.();
  this._autosaveRecovery();
  this._flashMessage('🆕 Proyecto nuevo');
}, '14px');

    // Drawing modes moved to the labelled right-hand tool palette.
    // There is deliberately no second row of cryptic ED/PL/SAL/CP/PI icons.
    // The existing _setTool() state machine and export format are preserved.
    this._loopBtn = this._makeTopActionButton(...toolPos(), this._isClosed ? '🔒' : '🔓', 'CERRAR', () => {
  this._toggleClosed();
  if (this._loopBtn?.txt) {
    this._loopBtn.txt.setText(this._isClosed ? '🔒' : '🔓');
  }
}, '16px');

    // track directo
    this._trackMinusBtn = this._makeTopActionButton(...toolPos(), '−', 'ANCHO', () => {
      this._trackTool = 'widthDown';
      this._changeTrackWidth(-this._trackWidthStep());
      this._updateToolButtons();
    }, '12px');
    

    this._trackPlusBtn = this._makeTopActionButton(...toolPos(), '+', 'ANCHO', () => {
      this._trackTool = 'widthUp';
      this._changeTrackWidth(this._trackWidthStep());
      this._updateToolButtons();
    }, '12px');
    
    this._undoBtn = this._makeTopActionButton(...toolPos(), '↶', 'DESHACER', () => this._undo(), '20px');
    
    this._redoBtn = this._makeTopActionButton(...toolPos(), '↷', 'REHACER', () => this._redo(), '20px');
    



    // =================================================
    // Mundo de edición
    // =================================================
    this._gridGfx = this.add.graphics().setDepth(1);
    this._trackGfx = this.add.graphics().setDepth(6);
    this._curveGfx = this.add.graphics().setDepth(7);
    this._guideGfx = this.add.graphics().setDepth(8);
    this._pianoGfx = this.add.graphics().setDepth(9);
    this._checkpointGfx = this.add.graphics().setDepth(10);
    this._finishGfx = this.add.graphics().setDepth(11);
    this._nodeGfx = this.add.graphics().setDepth(12);
    this._penPreviewGfx = this.add.graphics().setDepth(13);

    this._drawGrid();

    this._centerMark = this.add.graphics().setDepth(2);
    this._centerMark.lineStyle(3, 0x2bff88, 0.8);
    this._centerMark.lineBetween(
      this._editorWorldW / 2 - 30,
      this._editorWorldH / 2,
      this._editorWorldW / 2 + 30,
      this._editorWorldH / 2
    );
    this._centerMark.lineBetween(
      this._editorWorldW / 2,
      this._editorWorldH / 2 - 30,
      this._editorWorldW / 2,
      this._editorWorldH / 2 + 30
    );

    // Informative empty state. No fake project preview or persistent graphics:
    // it disappears as soon as any authored data or guide is present.
    this._emptyHelp = this.add.text(
      this._viewX+this._viewW/2,
      this._viewY+this._viewH/2,
      'LIENZO LISTO PARA DISEÑAR\n\nCarga una fotografía desde ABRIR o IMG\npara empezar a trazar el circuito',
      {fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
       fontSize:'14px',fontStyle:'bold',color:'#9ac2d0',
       align:'center',backgroundColor:'#102130',
       padding:{x:22,y:16}}
    ).setOrigin(0.5).setDepth(28).setScrollFactor(0);

    // =================================================
    // Cámara de edición
    // =================================================
    this._editCam = this.cameras.add(
      this._viewX + 2,
      this._viewY + 2,
      this._viewW - 4,
      this._viewH - 4
    );

    this._editCam.setBackgroundColor('#0a0d16');
    this._editCam.setBounds(0, 0, this._editorWorldW, this._editorWorldH);
    this._editCam.centerOn(this._editorWorldW / 2, this._editorWorldH / 2);
    this._editCam.setZoom(0.28);

    this.cameras.main.ignore([
      this._gridGfx,
      this._centerMark,
      this._trackGfx,
      this._curveGfx,
      this._guideGfx,
      this._pianoGfx,
      this._checkpointGfx,
      this._finishGfx,
      this._nodeGfx,
      this._penPreviewGfx
    ]);

    const worldObjs = [
      this._gridGfx,
      this._centerMark,
      this._trackGfx,
      this._curveGfx,
      this._guideGfx,
      this._pianoGfx,
      this._checkpointGfx,
      this._finishGfx,
      this._nodeGfx,
      this._penPreviewGfx
    ];
    const uiObjs = this.children.list.filter((o) => !worldObjs.includes(o));
    this._editCam.ignore(uiObjs);

    // =================================================
    // Input
    // =================================================
    this.input.addPointer(2);

    this.input.on('pointerdown', (pointer) => {
      if (!this._isPointerInViewMenu(pointer)) this._closeViewMenu();
      if (!this._isPointerInModeMenu(pointer)) this._closeModeMenu();
      if (!this._isPointerInTrackMenu(pointer)) this._closeTrackMenu();
      if (!this._isPointerInGuideMenu(pointer)) this._closeGuideMenu();
      if (!this._isPointerInReferencePanel(pointer)) this._closeReferencePanel();

      if (!this._isPointerInViewport(pointer)) return;

      // Pluma owns only NEW anchors, never the editing of existing ones.
      // Keeping this separate from ED protects current edit/shape gestures.
      if(this._tool==='pen' && !this._shapeEditing){
        const active=this.input.manager.pointers.filter(p=>p.isDown);
        if(active.length!==1){
          this._cancelPenGesture();
          this._gestureWasMultiTouch=true;
          return;
        }
        const world=this._screenToWorld(pointer.x,pointer.y);
        const hit=pickCenterlineControl(this._nodes,this._selectedNode,world,this._editCam?.zoom);
        this._tapCandidate=false;
        this._draggingPart=false;
        this._panLast=null;
        if(hit){
          this._selectedNode=hit.index;
          this._selectedPart=hit;
          this._redrawEditor();
          this._updatePanel();
          return;
        }
        this._gestureWasMultiTouch=false;
        this._penGesture={
          id:pointer.id,
          anchor:{x:world.x,y:world.y},
          startScreen:{x:pointer.x,y:pointer.y},
          currentWorld:{x:world.x,y:world.y},
          curved:false
        };
        this._drawPenPreview();
        return;
      }

      // Mobile shape mode: first tap selects, second gesture moves.
      // Empty-area drags pan the canvas; neither gesture creates centerline nodes.
      if (this._shapeEditing && this._tool === 'edit') {
        const active = this.input.manager.pointers.filter(p => p.isDown && this._isPointerInViewport(p));
        if (active.length > 1) {
          this._gestureWasMultiTouch = true;
          this._tapCandidate = false;
          this._shapeSelectionOnly = false;
          this._draggingPart = false;
          this._shapeDragOffset = null;
          this._panLast = null;
          return;
        }
        this._pushHistory();
        this._tapCandidate = false;
        this._gestureWasMultiTouch = false;
        this._dragMoved = false;
        const world = this._screenToWorld(pointer.x, pointer.y);
        const hit = this._findShapeControlAt(world.x, world.y);
        this._dragStartScreen = { x: pointer.x, y: pointer.y };
        this._dragStartWorld = { x: world.x, y: world.y };
        this._panLast = null;
        this._shapeSelectionOnly = false;
        this._shapeDragOffset = null;
        if (hit) {
          const previous = this._shapeSelected;
          const sameNode = !!previous && previous.side === hit.side && previous.index === hit.index;
          const canDrag = sameNode && (hit.kind === 'node' || hit.kind === 'handle');
          this._shapeSelected = { ...hit };
          this._selectedPart = hit;
          this._selectedNode = -1;
          this._selectedPiano = -1;
          this._draggingPart = canDrag;
          this._shapeSelectionOnly = !canDrag;
          if (canDrag) {
            const node = this._trackShape[hit.side][hit.index];
            const control = hit.part === 'anchor' ? node : node[hit.part];
            this._shapeDragOffset = { x: control.x - world.x, y: control.y - world.y };
          }
          this._updatePanel();
          this._redrawEditor();
          return;
        }
        this._selectedPart = null;
        this._draggingPart = false;
        this._panLast = { x: pointer.x, y: pointer.y };
        return;
      }

      this._pushHistory();
      this._tapCandidate = true;
      this._gestureWasMultiTouch = false;

      if (this._tool === 'start' || this._tool === 'finish' || this._tool === 'checkpoint') {
        this._draggingPart = false;
        this._dragMoved = false;
        this._dragStartScreen = { x: pointer.x, y: pointer.y };
        this._dragStartWorld = this._screenToWorld(pointer.x, pointer.y);
        return;
      }

      const world = this._screenToWorld(pointer.x, pointer.y);
      const hit = this._shapeEditing && this._tool === 'edit'
        ? this._findShapeControlAt(world.x, world.y)
        : this._findControlAt(world.x, world.y);

      if (!hit && this._guideImage && !this._guideLocked && this._tool === 'edit' && !this._shapeEditing) {
        this._guideDragging = true;
        this._guideDragLast = { x: world.x, y: world.y };
        this._tapCandidate = false;
        this._panLast = null;
        return;
      }

      if (hit) {
        this._selectedPart = hit;
        // Keep the touch offset. Moving a node must not jump it underneath
        // the finger when a 25px screen-space target is tapped off-center.
        this._centerlineDragOffset = null;
        if (['node','handleIn','handleOut'].includes(hit.type)) {
          const node=this._nodes[hit.index];
          const control=hit.type==='node'?node:node?.[hit.type];
          if(control)this._centerlineDragOffset={x:control.x-world.x,y:control.y-world.y};
        }
        this._draggingPart = true;
        this._dragMoved = false;
        this._dragStartScreen = { x: pointer.x, y: pointer.y };
        this._dragStartWorld = { x: world.x, y: world.y };

        if (hit.type === 'shape') {
          this._shapeSelected = { ...hit };
          this._selectedNode = -1;
          this._selectedPiano = -1;
        } else if (
          hit.type === 'piano' ||
          hit.type === 'pianoA' ||
          hit.type === 'pianoB'
        ) {
          this._selectedPiano = hit.index;
          this._selectedNode = -1;
        } else {
          this._selectedNode = hit.index;
          this._selectedPiano = -1;
        }

        this._updatePanel();
        this._redrawEditor();
        return;
      }

      this._selectedPart = null;
      this._draggingPart = false;
      this._dragMoved = false;
      this._dragStartScreen = { x: pointer.x, y: pointer.y };
      this._dragStartWorld = { x: world.x, y: world.y };
    });

    this.input.on('pointermove', () => {
      const down = this.input.manager.pointers.filter(
        (p) => p.isDown && this._isPointerInViewport(p)
      );

      // Pluma previews a new anchor/curve without mutating the real project.
      // Two fingers cancel that candidate, then pass through to pinch-to-zoom.
      if(this._penGesture){
        const active=this.input.manager.pointers.filter(p=>p.isDown);
        if(active.length!==1 || down.length!==1){
          this._cancelPenGesture();
          this._gestureWasMultiTouch=true;
        }else{
          const p=down[0],g=this._penGesture;
          if(p.id===g.id){
            g.currentWorld=this._screenToWorld(p.x,p.y);
            g.curved=penGestureIsCurve(g.startScreen,{x:p.x,y:p.y});
            this._drawPenPreview();
          }
          return;
        }
      }

      // A first-touch selection never morphs the curve, even if the finger slips.
      if (this._shapeEditing && this._shapeSelectionOnly && down.length === 1) return;

      if (this._tool === 'edit' && this._draggingPart && down.length === 1 && this._selectedPart) {
        const p = down[0];

        if (this._dragStartScreen) {
          const dist = Phaser.Math.Distance.Between(
            p.x, p.y,
            this._dragStartScreen.x, this._dragStartScreen.y
          );

          if (dist <= 10) return;

          this._dragMoved = true;
        }

const rawWorld = this._screenToWorld(p.x, p.y);
const offset=this._centerlineDragOffset;
const world=offset && ['node','handleIn','handleOut'].includes(this._selectedPart.type)
  ?{x:rawWorld.x+offset.x,y:rawWorld.y+offset.y}:rawWorld;
const idx = this._selectedPart.index;

// --- EDITABLE SHAPE BOUNDARY (centerline stays untouched) ---
if (this._selectedPart.type === 'shape') {
  this._moveShapeControl(this._selectedPart, {
    x: world.x + (this._shapeDragOffset?.x || 0),
    y: world.y + (this._shapeDragOffset?.y || 0)
  });
  return;
}

// --- PIANOS ---
if (
  this._selectedPart.type === 'piano' ||
  this._selectedPart.type === 'pianoA' ||
  this._selectedPart.type === 'pianoB'
) {
  this._updatePianoDrag(this._selectedPart, world);
  this._selectedPiano = idx;
  this._selectedNode = -1;
  this._updatePanel();
  this._redrawEditor();
  return;
}

// --- NODOS ---
if (
  this._selectedPart.type === 'node' ||
  this._selectedPart.type === 'handleIn' ||
  this._selectedPart.type === 'handleOut'
) {
  const node = this._nodes[idx];

  if (this._selectedPart.type === 'node') {
    const dx = world.x - node.x;
    const dy = world.y - node.y;

    node.x = world.x;
    node.y = world.y;

    node.handleIn.x += dx;
    node.handleIn.y += dy;
    node.handleOut.x += dx;
    node.handleOut.y += dy;
  } else if (this._selectedPart.type === 'handleIn') {
    node.handleIn.x = world.x;
    node.handleIn.y = world.y;
  } else if (this._selectedPart.type === 'handleOut') {
    node.handleOut.x = world.x;
    node.handleOut.y = world.y;
  }

  this._selectedNode = idx;
  this._selectedPiano = -1;
  this._updatePanel();
  this._redrawEditor();
  return;
}
      }

      if (down.length === 1 && this._guideDragging && this._guideImage && !this._guideLocked) {
        const p = down[0];
        const world = this._screenToWorld(p.x, p.y);
        if (this._guideDragLast) {
          this._guideImage.x += world.x - this._guideDragLast.x;
          this._guideImage.y += world.y - this._guideDragLast.y;
          this._guideX = this._guideImage.x;
          this._guideY = this._guideImage.y;
        }
        this._guideDragLast = world;
        this._updatePanel();
        return;
      }

      if (down.length === 1) {
        const p = down[0];

        if (this._panLast) {
          const dx = p.x - this._panLast.x;
          const dy = p.y - this._panLast.y;

          this._editCam.scrollX -= dx / this._editCam.zoom;
          this._editCam.scrollY -= dy / this._editCam.zoom;
        }

        this._panLast = { x: p.x, y: p.y };
        this._pinchLastDist = 0;
      this._mapGesture = null;
        return;
      }

      if (down.length >= 2) {
        this._gestureWasMultiTouch = true;
        this._tapCandidate = false;

        const p1 = down[0];
        const p2 = down[1];

        const midX = (p1.x + p2.x) * 0.5;
        const midY = (p1.y + p2.y) * 0.5;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!this._mapGesture) {
          this._mapGesture = beginTrackPinch(this._editCam,p1,p2);
          this._pinchLastDist = dist;
          this._panLast = null;
          this._draggingPart = false;
          return;
        }
        // Phaser centers its camera zoom inside the viewport, whose x/y
        // starts AFTER the left rail. Preserve the true two-finger midpoint.
        updateTrackPinch(this._editCam,this._mapGesture,p1,p2,
          this._editZoomMin,this._editZoomMax);
        this._pinchLastDist = dist;
        // The image tiles remain untouched; redraw only control graphics at
        // a throttled rate while pinching, then exactly once at gesture end.
        const now=performance.now();
        if(now-(this._lastControlZoomRedraw||0)>90){
          this._lastControlZoomRedraw=now;
          this._redrawEditor();
        }
        this._updatePanel();
        return;
      }

      this._panLast = null;
      this._pinchLastDist = 0;
      this._mapGesture = null;
    });

    this.input.on('pointerup', (pointer) => {
  if (this._guideDragging) {
    this._guideDragging = false;
    this._guideDragLast = null;
    this._autosaveRecovery();
  }
  const stillDown = this.input.manager.pointers.filter((p) => p.isDown).length;

  if(this._penGesture && pointer.id===this._penGesture.id){
    const g=this._penGesture;
    this._cancelPenGesture();
    if(!this._gestureWasMultiTouch && this._tool==='pen' && this._isPointerInViewport(pointer)){
      const endWorld=this._screenToWorld(pointer.x,pointer.y);
      const curved=penGestureIsCurve(g.startScreen,{x:pointer.x,y:pointer.y});
      const node=updatePenAnchorFromDrag(createPenAnchor(g.anchor.x,g.anchor.y),g.anchor,endWorld,curved);
      this._pushHistory();
      this._nodes.push(node);
      this._selectedNode=this._nodes.length-1;
      this._selectedPart={type:'node',index:this._selectedNode};
      this._selectedPiano=-1;
      this._redrawEditor();
      this._updatePanel();
      this._autosaveRecovery();
    }
    this._tapCandidate=false;
    this._panLast=null;
    this._dragStartScreen=null;
    this._dragStartWorld=null;
    this._gestureWasMultiTouch=false;
    return;
  }

  if (this._shapeSelectionOnly) {
    this._shapeSelectionOnly = false;
    this._shapeDragOffset = null;
    this._tapCandidate = false;
    if (stillDown === 0) {
      this._dragStartScreen = null;
      this._dragStartWorld = null;
      this._panLast = null;
    }
    return;
  }

  if (this._draggingPart) {
    if (this._dragMoved) this._autosaveRecovery();
    this._centerlineDragOffset = null;
    this._shapeDragOffset = null;
    this._draggingPart = false;
    if (stillDown === 0) {
      this._dragStartScreen = null;
      this._dragStartWorld = null;
      this._tapCandidate = false;
      this._gestureWasMultiTouch = false;
      this._panLast = null;
      this._pinchLastDist = 0;
      this._mapGesture = null;
    }
    return;
  }

  if (this._gestureWasMultiTouch) {
    if (stillDown === 0) {
      this._redrawEditor();
      this._dragStartScreen = null;
      this._dragStartWorld = null;
      this._tapCandidate = false;
      this._gestureWasMultiTouch = false;
      this._panLast = null;
      this._pinchLastDist = 0;
      this._mapGesture = null;
    }
    return;
  }

  let movedTooMuch = false;
  if (this._dragStartScreen) {
    const dist = Phaser.Math.Distance.Between(
      pointer.x,
      pointer.y,
      this._dragStartScreen.x,
      this._dragStartScreen.y
    );
    movedTooMuch = dist > 10;
  }

  if (
    this._tapCandidate &&
    !movedTooMuch &&
    this._isPointerInViewport(pointer)
  ) {
    const world = this._screenToWorld(pointer.x, pointer.y);

    if (this._tool === 'start') {
      this._placeStartLineAt(world.x, world.y);

    } else if (this._tool === 'finish') {
      this._placeFinishLineAt(world.x, world.y);

    } else if (this._tool === 'checkpoint') {
      this._placeCheckpointAt(world.x, world.y);

    } else if (this._tool === 'piano') {
      const hit = this._findNearestCurvePoint(world.x, world.y);

      if (hit) {
        const half = this._trackWidth * 0.5;

        const a = {
          x: hit.point.x + hit.normal.x * half,
          y: hit.point.y + hit.normal.y * half
        };

        const b = {
          x: hit.point.x + hit.normal.x * (half + 28),
          y: hit.point.y + hit.normal.y * (half + 28)
        };

        this._pianos.push({
          a,
          b,
          point: { x: hit.point.x, y: hit.point.y },
          normal: { x: hit.normal.x, y: hit.normal.y },
          tangent: { x: hit.tangent.x, y: hit.tangent.y }
        });

        this._selectedPiano = this._pianos.length - 1;
      }

  } else if (this._shapeEditing) {
    // Empty taps in shape mode never create centerline nodes.
    const hit = this._findShapeControlAt(world.x, world.y);
    this._shapeSelected = hit ? { ...hit } : null;
    this._selectedPart = hit;
    this._selectedNode = -1;
    this._selectedPiano = -1;
  } else {

  // 🔴 1. Primero detectar pianos
  const pianoHit = this._findPianoControl(world.x, world.y);
  if (pianoHit) {
    this._selectedPiano = pianoHit.index;
    this._selectedNode = -1;
    this._selectedPart = pianoHit;
    return;
  }

  // 🔵 2. Luego lo normal (nodos)
  const hit = this._findControlAt(world.x, world.y);

  if (hit) {
    this._selectedNode = hit.index;
    this._selectedPiano = -1;
    this._selectedPart = hit;
  } else {
    const node = this._createNode(world.x, world.y);

        if (this._nodes.length > 0) {
          const prev = this._nodes[this._nodes.length - 1];
          const handleLen = 60;

          let dx = node.x - prev.x;
          let dy = node.y - prev.y;

          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          dx /= len;
          dy /= len;

          prev.handleOut.x = prev.x + dx * handleLen;
          prev.handleOut.y = prev.y + dy * handleLen;
        }

        this._nodes.push(node);
        this._selectedNode = this._nodes.length - 1;
        this._selectedPart = { type: 'node', index: this._selectedNode };
      }
    }

    this._updatePanel();
    this._redrawEditor();
    this._autosaveRecovery();
  }

  if (stillDown === 0) {
    this._dragStartScreen = null;
    this._dragStartWorld = null;
    this._tapCandidate = false;
    this._gestureWasMultiTouch = false;
    this._panLast = null;
    this._pinchLastDist = 0;
      this._mapGesture = null;
  }
});
    this.input.on('pointerupoutside', () => {
      this._cancelPenGesture();
      if (this._guideDragging) this._autosaveRecovery();
      this._guideDragging = false;
      this._guideDragLast = null;
      if (this._draggingPart && this._dragMoved) this._autosaveRecovery();
      this._shapeSelectionOnly = false;
      this._shapeDragOffset = null;
      this._centerlineDragOffset = null;
      this._draggingPart = false;
      this._dragStartScreen = null;
      this._dragStartWorld = null;
      this._tapCandidate = false;
      this._gestureWasMultiTouch = false;
      this._panLast = null;
      this._pinchLastDist = 0;
      this._mapGesture = null;
    });

    this._createGuideInput();
    this._createProjectInput();
    // Leaving via race preview or scene replacement must also clean native
    // pickers/popovers; previously only the Back button performed cleanup.
    this.events.once('shutdown',()=>{
      this._destroyGuideInput?.();
      this._destroyProjectInput?.();
      this._closeSourceMenu?.();
      this._closeReferencePanel?.();
      this._closeViewMenu?.();
      this._closeModeMenu?.();
      this._closeTrackMenu?.();
      this._closeGuideMenu?.();
    });
    installTrackStudioImageMode(this);
    installTrackStudioShapeEditor(this);
    installTrackStudioExitGuard(this);
    const gate=installTrackStudioGateControls(this);
    this._updateLoopButton();
    this._updateToolButtons();
    this._updatePanel();
    this._redrawEditor();
    // Presentation is optional. On failure the original tool controls remain
    // fully functional, and the circuit editor/model is never replaced.
    try{
      this._studioChrome=mountTrackStudioLabChrome(this,gate);
    }catch(err){
      console.warn('[TrackStudio] Premium chrome unavailable, keeping native UI',err);
      this._studioChrome=null;
    }
  }

  // =================================================
  // Guía de fondo
  // =================================================
  _createGuideInput() {
    this._destroyGuideInput();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    input.style.opacity = '0';

    input.addEventListener('change', (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      this._loadGuideImage(file);
      input.value = '';
    });

    document.body.appendChild(input);
    this._guideInput = input;
  }

  _destroyGuideInput() {
    if (this._guideInput && this._guideInput.parentNode) {
      this._guideInput.parentNode.removeChild(this._guideInput);
    }
    this._guideInput = null;
  }

  _openGuidePicker() {
    if (!this._guideInput) this._createGuideInput();
    this._guideInput?.click();
  }

  _loadGuideImage(file) {
    const url = URL.createObjectURL(file);
    const key = `trackstudio-guide-${Date.now()}`;

    this.load.image(key, url);

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      URL.revokeObjectURL(url);

      if (this._guideImage) {
        this._guideImage.destroy();
        this._guideImage = null;
      }

      if (this._guideTextureKey && this.textures.exists(this._guideTextureKey)) {
        this.textures.remove(this._guideTextureKey);
      }

      this._guideTextureKey = key;

      const tex = this.textures.get(key).getSourceImage();
      const imgW = tex.width || 1;
      const imgH = tex.height || 1;

      const fitScale = Math.min(
        (this._editorWorldW * 0.8) / imgW,
        (this._editorWorldH * 0.8) / imgH,
        1
      );

      const gx = Number.isFinite(this._guideX) ? this._guideX : this._editorWorldW / 2;
      const gy = Number.isFinite(this._guideY) ? this._guideY : this._editorWorldH / 2;
      const savedScale = Number.isFinite(this._guideScale) && this._guideScale > 0 ? this._guideScale : 1;
      this._guideImage = this.add.image(gx, gy, key)
        .setDepth(4)
        .setAlpha(this._guideAlpha)
        .setVisible(this._guideVisible)
        .setScale(fitScale * savedScale);
      this._guideX = gx;
      this._guideY = gy;
      this._guideBaseScale = fitScale;

      this.cameras.main.ignore(this._guideImage);
      this._updatePanel();
    });

    this.load.start();
  }

  _toggleGuideVisibility() {
    this._guideVisible = !this._guideVisible;
    if (this._guideImage) {
      this._guideImage.setVisible(this._guideVisible);
    }
    this._updateToolButtons();
    this._updatePanel();
  }

  _changeGuideScale(factor) {
    if (!this._guideImage) return this._flashMessage('Carga primero una imagen');
    if (this._guideLocked) return this._flashMessage('Desbloquea la imagen primero');
    this._pushHistory();
    this._guideScale = Phaser.Math.Clamp((this._guideScale || 1) * factor, 0.05, 20);
    this._guideImage.setScale((this._guideBaseScale || 1) * this._guideScale);
    this._autosaveRecovery();
    this._updatePanel();
  }

  _changeGuideAlpha(delta) {
    this._guideAlpha = Phaser.Math.Clamp(this._guideAlpha + delta, 0.05, 1);

    if (this._guideImage) {
      this._guideImage.setAlpha(this._guideAlpha);
    }

    this._updatePanel();
  }
_flashMessage(txt) {
  if (this._msgText) this._msgText.destroy();

  this._msgText = this.add.text(
    this.scale.width / 2,
    80,
    txt,
    {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 10, y: 6 }
    }
  ).setOrigin(0.5).setDepth(9999);

  this.time.delayedCall(1000, () => {
    this._msgText?.destroy();
    this._msgText = null;
  });
}
  // =================================================
  // UI helpers
  // =================================================
  _makeTopActionButton(cx,cy,width,height,icon,caption,onClick,fontSize='18px'){
    // Real single-card actions: the caption is inside the interactive hit area,
    // never another Text object spaced only 40px apart.
    const w=Math.max(46,width),h=Math.max(30,height);
    const bg=this.add.rectangle(cx,cy,w,h,0x132437,1)
      .setStrokeStyle(1,0x36546d,1)
      .setInteractive({useHandCursor:true});
    const compact=h<40;
    const txt=this.add.text(cx,compact?cy:cy-11,icon,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
      fontSize:compact?'15px':fontSize,color:'#f7fbff',fontStyle:'bold'
    }).setOrigin(0.5);
    const cap=this.add.text(compact?cx+13:cx,compact?cy:cy+13,caption,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
      fontSize:compact?'8px':'9px',color:'#9fc9d9',fontStyle:'bold'
    }).setOrigin(0.5);
    if(compact)txt.setX(cx-13);
    bg.on('pointerup',(_pointer,_lx,_ly,event)=>{
      event?.stopPropagation?.();
      onClick();
    });
    bg.on('pointerover',()=>bg.setStrokeStyle(1,0x31dfba,1));
    bg.on('pointerout',()=>bg.setStrokeStyle(1,0x36546d,1));
    return {bg,txt,cap,x:cx,y:cy};
  }

  _makeIconButton(cx, cy, label, onClick, fontSize = '22px') {
    const bg = this.add.circle(cx, cy, 20, 0x1c2540, 1)
      .setStrokeStyle(2, 0x3c4e7a, 0.95)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(cx, cy, label, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    bg.on('pointerup', onClick);

    return { bg, txt, x: cx, y: cy };
  }

  _makeGroupedMainButton(cx, cy, label, onMainClick, onLongPressClick, fontSize = '14px') {
    const c = this.add.container(cx, cy);
    c.setDepth(70);

    const bg = this.add.graphics();
    bg.fillStyle(0x1c2540, 1);
    bg.lineStyle(2, 0x3c4e7a, 0.95);
    bg.fillRoundedRect(-20, -20, 40, 40, 8);
    bg.strokeRoundedRect(-20, -20, 40, 40, 8);
    c.add(bg);

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    c.add(txt);

    const cornerGfx = this.add.graphics();
    cornerGfx.lineStyle(2, 0xaec6ff, 0.95);
    cornerGfx.beginPath();
    cornerGfx.moveTo(-14, -6);
    cornerGfx.lineTo(-14, -14);
    cornerGfx.lineTo(-6, -14);
    cornerGfx.strokePath();
    c.add(cornerGfx);

    let pressTimer = null;
    let longPressTriggered = false;

    const cancelPress = () => {
      if (pressTimer) {
        pressTimer.remove(false);
        pressTimer = null;
      }
    };

    const zone = this.add.zone(0, 0, 40, 40)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    zone.on('pointerdown', (pointer) => {
      pointer.event?.stopPropagation?.();
      longPressTriggered = false;
      cancelPress();

      pressTimer = this.time.delayedCall(500, () => {
        longPressTriggered = true;
        pressTimer = null;
        onLongPressClick();
      });
    });

    zone.on('pointerup', (pointer) => {
      pointer.event?.stopPropagation?.();

      if (longPressTriggered) {
        longPressTriggered = false;
        cancelPress();
        return;
      }

      cancelPress();
      onMainClick();
    });

    zone.on('pointerout', () => {
      cancelPress();
      longPressTriggered = false;
    });

    c.add(zone);

    c._bg = bg;
    c._txt = txt;
    c._zone = zone;

    return c;
  }

  _makeMenuPanel(baseX, baseY, items, makeBtn) {
    const menu = this.add.container(0, 0);
    menu.setDepth(90);

    const panelX = baseX + 28;
    const panelY = baseY - 20;
    const panelW = items.length * 44 + 12;
    const panelH = 52;

    const panel = this.add.graphics();
    panel.fillStyle(0x101626, 1);
    panel.lineStyle(2, 0x3c4e7a, 0.95);
    panel.fillRoundedRect(panelX - 6, panelY - 6, panelW, panelH, 10);
    panel.strokeRoundedRect(panelX - 6, panelY - 6, panelW, panelH, 10);
    menu.add(panel);

    for (let i = 0; i < items.length; i++) {
      const x = baseX + 48 + (i * 44);
      const y = baseY;
      const btn = makeBtn(items[i], x, y);
      menu.add(btn.bg);
      menu.add(btn.txt);
    }

    menu._x = panelX - 6;
    menu._y = panelY - 6;
    menu._w = panelW;
    menu._h = panelH;

    this._editCam.ignore(menu.list);
    return menu;
  }

  // =================================================
  // Grupo view
  // =================================================
  _getViewToolLabel() {
    if (this._viewTool === 'zoomIn') return '🔍+';
    if (this._viewTool === 'zoomOut') return '🔎-';
    return '◎';
  }

  _runActiveViewTool() {
    if (this._viewTool === 'zoomIn') return this._applyZoomAtViewportCenter(1.15);
    if (this._viewTool === 'zoomOut') return this._applyZoomAtViewportCenter(1 / 1.15);

    this._editCam.centerOn(this._editorWorldW / 2, this._editorWorldH / 2);
    this._editCam.setZoom(0.28);
    this._updatePanel();
  }

  _toggleViewMenu() {
    if (this._viewMenu) return this._closeViewMenu();

    const allItems = [
      { key: 'zoomIn', label: '🔍+' },
      { key: 'zoomOut', label: '🔎-' },
      { key: 'center', label: '◎' }
    ];

    const items = allItems.filter(item => item.key !== this._viewTool);

    this._viewMenu = this._makeMenuPanel(this._viewBtnX, this._viewBtnY, items, (item, x, y) => {
      return this._makeIconButton(x, y, item.label, () => {
        this._viewTool = item.key;
        this._viewMainBtn._txt.setText(this._getViewToolLabel());
        this._closeViewMenu();
        this._runActiveViewTool();
      }, '12px');
    });
  }

  _closeViewMenu() {
    if (!this._viewMenu) return;
    this._viewMenu.destroy(true);
    this._viewMenu = null;
  }

  _isPointerInViewMenu(pointer) {
    if (!this._viewMenu) return false;
    return (
      pointer.x >= this._viewMenu._x &&
      pointer.x <= this._viewMenu._x + this._viewMenu._w &&
      pointer.y >= this._viewMenu._y &&
      pointer.y <= this._viewMenu._y + this._viewMenu._h
    );
  }

  // =================================================
  // Grupo mode
  // =================================================
_getModeToolLabel() {
  if (this._modeTool === 'start') return 'SAL';
  if (this._modeTool === 'finish') return '🏁';
  if (this._modeTool === 'checkpoint') return 'CP';
  if (this._modeTool === 'piano') return 'PI';
  return this._isClosed ? '🔒' : '🔓';
}

_runActiveModeTool() {
  if (this._modeTool === 'start') return this._setTool('start');
  if (this._modeTool === 'finish') return this._setTool('finish');
  if (this._modeTool === 'checkpoint') return this._setTool('checkpoint');
  if (this._modeTool === 'piano') return this._setTool('piano');
  return this._toggleClosed();
}

_toggleModeMenu() {
  if (this._modeMenu) return this._closeModeMenu();

  const allItems = [
    { key: 'edit', label: this._isClosed ? '🔒' : '🔓' },
    { key: 'start', label: 'SAL' },
    { key: 'finish', label: '🏁' },
    { key: 'checkpoint', label: 'CP' },
    { key: 'piano', label: 'PI' }
  ];

  const items = allItems.filter(item => item.key !== this._modeTool);

  this._modeMenu = this._makeMenuPanel(this._modeBtnX, this._modeBtnY, items, (item, x, y) => {
    return this._makeIconButton(
      x,
      y,
      item.label,
      () => {
        this._modeTool = item.key;
        this._modeMainBtn._txt.setText(this._getModeToolLabel());
        this._closeModeMenu();

        if (item.key === 'edit') {
          this._setTool('edit');
        } else {
          this._setTool(item.key);
        }
      },
      item.key === 'checkpoint' ? '12px' : '13px'
    );
  });
}

  _closeModeMenu() {
    if (!this._modeMenu) return;
    this._modeMenu.destroy(true);
    this._modeMenu = null;
  }

  _isPointerInModeMenu(pointer) {
    if (!this._modeMenu) return false;
    return (
      pointer.x >= this._modeMenu._x &&
      pointer.x <= this._modeMenu._x + this._modeMenu._w &&
      pointer.y >= this._modeMenu._y &&
      pointer.y <= this._modeMenu._y + this._modeMenu._h
    );
  }

  // =================================================
  // Grupo track
  // =================================================
  _getTrackToolLabel() {
    return this._trackTool === 'widthDown' ? 'W-' : 'W+';
  }

  _runActiveTrackTool() {
    if (this._trackTool === 'widthDown') return this._changeTrackWidth(-this._trackWidthStep());
    return this._changeTrackWidth(this._trackWidthStep());
  }

  _toggleTrackMenu() {
    if (this._trackMenu) return this._closeTrackMenu();

    const allItems = [
      { key: 'widthDown', label: 'W-' },
      { key: 'widthUp', label: 'W+' }
    ];

    const items = allItems.filter(item => item.key !== this._trackTool);

    this._trackMenu = this._makeMenuPanel(this._trackBtnX, this._trackBtnY, items, (item, x, y) => {
      return this._makeIconButton(x, y, item.label, () => {
        this._trackTool = item.key;
        this._trackMainBtn._txt.setText(this._getTrackToolLabel());
        this._closeTrackMenu();
        this._runActiveTrackTool();
      }, '13px');
    });
  }

  _closeTrackMenu() {
    if (!this._trackMenu) return;
    this._trackMenu.destroy(true);
    this._trackMenu = null;
  }

  _isPointerInTrackMenu(pointer) {
    if (!this._trackMenu) return false;
    return (
      pointer.x >= this._trackMenu._x &&
      pointer.x <= this._trackMenu._x + this._trackMenu._w &&
      pointer.y >= this._trackMenu._y &&
      pointer.y <= this._trackMenu._y + this._trackMenu._h
    );
  }

  _toggleReferencePanel() {
    if (this._referencePanel) return this._closeReferencePanel();

    const x = this._leftBarW + 18;
    const y = this._topBarH + 20;
    const w = Math.min(360, Math.max(300, this._viewW - 30));
    const h = 112;
    const panel = this.add.container(0, 0).setDepth(120);

    const bg = this.add.graphics();
    bg.fillStyle(0x101626, 0.98);
    bg.lineStyle(2, 0x526a9d, 1);
    bg.fillRoundedRect(x, y, w, h, 12);
    bg.strokeRoundedRect(x, y, w, h, 12);
    panel.add(bg);

    panel.add(this.add.text(x + 14, y + 10, 'IMAGEN DE REFERENCIA', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '13px', color: '#c7d2ff', fontStyle: 'bold'
    }));

    const specs = [
      ['Cargar', () => this._openGuidePicker(), 44],
      [this._guideLocked ? '🔒' : '✥', () => {
        if (!this._guideImage) return this._flashMessage('Carga primero una imagen');
        this._guideLocked = !this._guideLocked;
        this._autosaveRecovery();
        this._closeReferencePanel(); this._toggleReferencePanel();
      }, 38],
      ['I−', () => this._changeGuideScale(1 / 1.08), 38],
      ['I+', () => this._changeGuideScale(1.08), 38],
      ['A−', () => { this._changeGuideAlpha(-0.08); this._autosaveRecovery(); }, 38],
      ['A+', () => { this._changeGuideAlpha(0.08); this._autosaveRecovery(); }, 38],
      [this._guideVisible ? '👁' : '◌', () => {
        this._toggleGuideVisibility(); this._autosaveRecovery();
        this._closeReferencePanel(); this._toggleReferencePanel();
      }, 38]
    ];
    let bx = x + 18;
    const by = y + 70;
    specs.forEach(([label, fn, step]) => {
      const b = this._makeIconButton(bx, by, label, fn, label === 'Cargar' ? '10px' : '12px');
      panel.add(b.bg); panel.add(b.txt); bx += step + 6;
    });

    panel._x = x; panel._y = y; panel._w = w; panel._h = h;
    this._editCam.ignore(panel.list);
    this._referencePanel = panel;
  }

  _closeReferencePanel() {
    if (!this._referencePanel) return;
    this._referencePanel.destroy(true);
    this._referencePanel = null;
  }

  _isPointerInReferencePanel(pointer) {
    const p = this._referencePanel;
    return !!p && pointer.x >= p._x && pointer.x <= p._x + p._w &&
      pointer.y >= p._y && pointer.y <= p._y + p._h;
  }

  // =================================================
  // Grupo guide
  // =================================================
  _getGuideToolLabel() {
    return this._guideTool === 'toggle' ? '👁' : 'IMG';
  }

  _runActiveGuideTool() {
    if (this._guideTool === 'toggle') return this._toggleGuideVisibility();
    return this._openGuidePicker();
  }

  _toggleGuideMenu() {
    if (this._guideMenu) return this._closeGuideMenu();

    const allItems = [
      { key: 'load', label: 'IMG' },
      { key: 'toggle', label: '👁' }
    ];

    const items = allItems.filter(item => item.key !== this._guideTool);

    this._guideMenu = this._makeMenuPanel(this._guideBtnX, this._guideBtnY, items, (item, x, y) => {
      return this._makeIconButton(x, y, item.label, () => {
        this._guideTool = item.key;
        this._guideMainBtn._txt.setText(this._getGuideToolLabel());
        this._closeGuideMenu();
        this._runActiveGuideTool();
      }, item.key === 'load' ? '12px' : '16px');
    });
  }

  _closeGuideMenu() {
    if (!this._guideMenu) return;
    this._guideMenu.destroy(true);
    this._guideMenu = null;
  }

  _isPointerInGuideMenu(pointer) {
    if (!this._guideMenu) return false;
    return (
      pointer.x >= this._guideMenu._x &&
      pointer.x <= this._guideMenu._x + this._guideMenu._w &&
      pointer.y >= this._guideMenu._y &&
      pointer.y <= this._guideMenu._y + this._guideMenu._h
    );
  }

  _getNudgeStep() {
    return this._nudgeSteps[this._nudgeStepIndex];
  }

  _cycleNudgeStep() {
    this._nudgeStepIndex = (this._nudgeStepIndex + 1) % this._nudgeSteps.length;
    if (this._nudgeStepBtn?.txt) {
      this._nudgeStepBtn.txt.setText(String(this._getNudgeStep()));
    }
    this._updatePanel();
  }

  _cancelPenGesture() {
    this._penGesture=null;
    this._penPreviewGfx?.clear();
  }

  _drawPenPreview(){
    const g=this._penGesture,layer=this._penPreviewGfx;
    layer?.clear();
    if(!g||!layer)return;
    const candidate=updatePenAnchorFromDrag(createPenAnchor(g.anchor.x,g.anchor.y),
      g.anchor,g.currentWorld,g.curved);
    const zoom=Math.max(.02,this._editCam?.zoom||1);
    if(this._nodes.length){
      const prev=this._nodes[this._nodes.length-1];
      const sampled=this._sampleCubicBezier(prev,prev.handleOut,candidate.handleIn,candidate,24);
      layer.lineStyle(3/zoom,0x78ecff,.95);
      layer.beginPath();
      layer.moveTo(sampled[0].x,sampled[0].y);
      for(let i=1;i<sampled.length;i++)layer.lineTo(sampled[i].x,sampled[i].y);
      layer.strokePath();
    }
    layer.fillStyle(0x091724,.96);
    layer.fillCircle(candidate.x,candidate.y,13/zoom);
    layer.fillStyle(g.curved?0x54ffb2:0xffffff,1);
    layer.fillCircle(candidate.x,candidate.y,10/zoom);
    if(g.curved){
      layer.lineStyle(1.7/zoom,0xffffff,.95);
      layer.lineBetween(candidate.handleIn.x,candidate.handleIn.y,
        candidate.handleOut.x,candidate.handleOut.y);
      layer.fillStyle(0xffcc59,1);
      layer.fillCircle(candidate.handleIn.x,candidate.handleIn.y,7/zoom);
      layer.fillCircle(candidate.handleOut.x,candidate.handleOut.y,7/zoom);
    }
  }

  _setTool(tool) {
    this._cancelPenGesture();
    if(tool==='pen' && this._shapeEditing){
      this._shapeEditing=false;
      this._shapeSelected=null;
    }
    this._tool = tool;
    if (tool === 'start') this._modeTool = 'start';
    if (tool === 'finish') this._modeTool = 'finish';
    if (tool === 'checkpoint') this._modeTool = 'checkpoint';
    if (tool === 'edit' && this._modeTool !== 'edit') this._modeTool = 'edit';
    if (tool === 'pen') this._modeTool = 'pen';
    this._updateToolButtons();
    this._redrawEditor();
    this._updatePanel();
  }

_updateToolButtons() {
  if (this._guideAlphaMinusBtn?.bg) {
    this._guideAlphaMinusBtn.bg.setFillStyle(0x1c2540, 1);
    this._guideAlphaMinusBtn.bg.setStrokeStyle(2, 0x3c4e7a, 0.95);
  }

  if (this._guideAlphaPlusBtn?.bg) {
    this._guideAlphaPlusBtn.bg.setFillStyle(0x1c2540, 1);
    this._guideAlphaPlusBtn.bg.setStrokeStyle(2, 0x3c4e7a, 0.95);
  }

  if (this._nudgeStepBtn?.txt) {
    this._nudgeStepBtn.txt.setText(String(this._getNudgeStep()));
  }

  if (this._saveMainBtn?._txt) {
    this._saveMainBtn._txt.setText(this._getSaveToolLabel());
  }

  const paintCircle = (btn, active = false, fill = 0x1c2540, stroke = 0x3c4e7a) => {
    if (!btn?.bg) return;
    const card=!!btn.cap;
    btn.bg.setFillStyle(active ? fill : card?0x132437:0x1c2540, 1);
    btn.bg.setStrokeStyle(card?1:2,active ? stroke : card?0x36546d:0x3c4e7a, 0.95);
  };

  // modo directo
  paintCircle(this._editBtn, this._tool === 'edit', 0x2a4277, 0x8eb8ff);
  paintCircle(this._penBtn, this._tool === 'pen', 0x1b5b48, 0x70ffc3);
  paintCircle(this._startTopBtn, this._tool === 'start', 0x1f4f2d, 0x8df0a8);
  paintCircle(this._finishTopBtn, this._tool === 'finish', 0x2a4277, 0x8eb8ff);
  paintCircle(this._checkpointTopBtn, this._tool === 'checkpoint', 0x2a4277, 0x8eb8ff);
  paintCircle(this._pianoTopBtn, this._tool === 'piano', 0x2a4277, 0x8eb8ff);

  // track directo
  paintCircle(this._trackMinusBtn, this._trackTool === 'widthDown', 0x2a4277, 0x8eb8ff);
  paintCircle(this._trackPlusBtn, this._trackTool === 'widthUp', 0x2a4277, 0x8eb8ff);

  // guía en nav
  paintCircle(
    this._leftGuideBtn,
    this._guideVisible,
    this._guideVisible ? 0x1f4f2d : 0x2a4277,
    this._guideVisible ? 0x8df0a8 : 0x8eb8ff
  );

  // compatibilidad con botones antiguos que sigan vivos
  if (this._saveMainBtn?._bg) {
    this._saveMainBtn._bg.clear();
    this._saveMainBtn._bg.fillStyle(0x1c2540, 1);
    this._saveMainBtn._bg.lineStyle(2, 0x3c4e7a, 0.95);
    this._saveMainBtn._bg.fillRoundedRect(-20, -20, 40, 40, 8);
    this._saveMainBtn._bg.strokeRoundedRect(-20, -20, 40, 40, 8);
  }
  if (this._loopBtn?.txt) {
    const label=this._isClosed?'🔒':'🔓';
    if(this._loopBtn.txt.text!==label)this._loopBtn.txt.setText(label);
  }
}
  _toggleClosed() {
    this._isClosed = !this._isClosed;
    this._updateToolButtons();
    this._updatePanel();
    this._redrawEditor();
  }

  _updateLoopButton() {
    // ya no usamos loopBtn principal, pero dejamos la helper viva
  }

  _createNode(x, y) {
    const handleLen = 60;

    if (!this._nodes || this._nodes.length === 0) {
      return {
        x,
        y,
        handleIn: { x: x - handleLen, y },
        handleOut: { x: x + handleLen, y }
      };
    }

    const prev = this._nodes[this._nodes.length - 1];

    let dx = x - prev.x;
    let dy = y - prev.y;

    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    dx /= len;
    dy /= len;

    return {
      x,
      y,
      handleIn: {
        x: x - dx * handleLen,
        y: y - dy * handleLen
      },
      handleOut: {
        x: x + dx * handleLen,
        y: y + dy * handleLen
      }
    };
  }
// ==============================
// 🟥 PIANOS SYSTEM
// ==============================

_initPianos() {
  this._pianos = [];
  this._activePiano = null;
}

// Crear piano en punto del track
_createPiano(x, y) {
  const p = {
    x,
    y,
    side: 'left', // o 'right'
    len: 120,
    width: 12,
    angle: 0,
    handleA: { x: x - 40, y },
    handleB: { x: x + 40, y }
  };

  this._pianos.push(p);
  this._activePiano = p;
}

// Detectar si tocas un piano o handlere
_findPianoControl(x, y) {
  const R_CENTER = 20;
  const R_HANDLE = 15;

  for (let i = this._pianos.length - 1; i >= 0; i--) {
    const p = this._pianos[i];
    if (!p || !p.a || !p.b || !p.point) continue;

    // centro lógico del piano
    if (Phaser.Math.Distance.Between(x, y, p.point.x, p.point.y) < R_CENTER) {
      return { type: 'piano', index: i };
    }

    // extremo A
    if (Phaser.Math.Distance.Between(x, y, p.a.x, p.a.y) < R_HANDLE) {
      return { type: 'pianoA', index: i };
    }

    // extremo B
    if (Phaser.Math.Distance.Between(x, y, p.b.x, p.b.y) < R_HANDLE) {
      return { type: 'pianoB', index: i };
    }
  }

  return null;
}
// Dibujar pianos
_drawPianos(g) {
  if (!this._pianos.length) return;

  this._pianos.forEach((p, i) => {
    if (!p || !p.a || !p.b || !p.point) return;

    const selected = i === this._selectedPiano;

    g.lineStyle(selected ? 10 : 8, selected ? 0xffd166 : 0xd92f2f, 0.95);
    g.beginPath();
    g.moveTo(p.a.x, p.a.y);
    g.lineTo(p.b.x, p.b.y);
    g.strokePath();

    g.lineStyle(3, 0xf2f2f2, 0.95);
    g.beginPath();
    g.moveTo(p.a.x, p.a.y);
    g.lineTo(p.b.x, p.b.y);
    g.strokePath();

    g.fillStyle(0xffd166, 1);
    g.fillCircle(p.a.x, p.a.y, 6);
    g.fillCircle(p.b.x, p.b.y, 6);

    g.fillStyle(selected ? 0x2bff88 : 0xffffff, 1);
    g.fillCircle(p.point.x, p.point.y, selected ? 7 : 5);
  });
}

// Update piano mientras arrastras
_updatePianoDrag(part, world) {
  const p = this._pianos[part.index];
  if (!p || !p.a || !p.b || !p.point) return;

  if (part.type === 'piano') {
    const dx = world.x - p.point.x;
    const dy = world.y - p.point.y;

    p.point.x = world.x;
    p.point.y = world.y;

    p.a.x += dx;
    p.a.y += dy;

    p.b.x += dx;
    p.b.y += dy;
    return;
  }

  if (part.type === 'pianoA') {
    p.a.x = world.x;
    p.a.y = world.y;
    return;
  }

  if (part.type === 'pianoB') {
    p.b.x = world.x;
    p.b.y = world.y;
  }
}
_applyZoomAtViewportCenter(multiplier) {
  const cam=this._editCam;
  if(!cam)return false;
  const midpointX=cam.x+cam.width/2;
  const midpointY=cam.y+cam.height/2;
  const changed=zoomTrackCameraAt(cam,midpointX,midpointY,multiplier,
    this._editZoomMin,this._editZoomMax);
  if(changed){
    this._redrawEditor();
    this._updatePanel();
  }
  return changed;
}
  _frameTrackView(){
    const cam=this._editCam;
    if(!cam)return false;
    // Prefer the authored photograph: it is the true playing field in image
    // circuits. Otherwise frame the actual edited nodes, not the whole 8000x5000
    // blank editing world.
    let bounds;
    if(this._imageCanvas?.width&&this._imageCanvas?.height){
      bounds={x:0,y:0,width:this._imageCanvas.width,height:this._imageCanvas.height};
    }else if(this._nodes?.length){
      const x=this._nodes.map(n=>n.x),y=this._nodes.map(n=>n.y);
      const left=Math.min(...x),top=Math.min(...y);
      const width=Math.max(250,Math.max(...x)-left);
      const height=Math.max(250,Math.max(...y)-top);
      const gap=Math.max(100,Math.max(width,height)*.12);
      bounds={x:left-gap,y:top-gap,width:width+2*gap,height:height+2*gap};
    }else{
      bounds={x:0,y:0,width:this._editorWorldW,height:this._editorWorldH};
    }
    if(!fitTrackCamera(cam,bounds,this._editZoomMin,this._editZoomMax))return false;
    this._redrawEditor();
    this._updatePanel();
    return true;
  }
  _moveSelectedNodeOnScreen(dx,dy){
    if(this._selectedNode<0||this._selectedNode>=this._nodes.length)return false;
    const cam=this._editCam;
    if(!cam?.getWorldPoint)return false;
    // Convert screen-space arrow directions through Phaser's actual inverse
    // camera transform. → always maps to screen-right even after pinch/pan.
    const cx=cam.x+cam.width/2,cy=cam.y+cam.height/2;
    const from=cam.getWorldPoint(cx,cy);
    const to=cam.getWorldPoint(cx+dx,cy+dy);
    if(!Number.isFinite(to.x-from.x)||!Number.isFinite(to.y-from.y))return false;
    this._nudgeSelectedNode(to.x-from.x,to.y-from.y);
    return true;
  }
  _trackWidthStep() {
    return trackStudioWidthStep(this._imageCanvas, this._trackWidthMax, this._widthStep);
  }
  _changeTrackWidth(delta) {
    const next=Phaser.Math.Clamp(this._trackWidth+delta,this._trackWidthMin,this._trackWidthMax);
    if(next===this._trackWidth)return;
    this._pushHistory();
    this._trackWidth=next;
    this._autosaveRecovery();
    this._updatePanel();
    this._redrawEditor();
  }

  _nudgeSelectedNode(dx, dy) {
    if (this._selectedNode < 0 || this._selectedNode >= this._nodes.length) return false;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||(dx===0&&dy===0))return false;
    this._pushHistory();
    const node=this._nodes[this._selectedNode];
    node.x+=dx;node.y+=dy;
    node.handleIn.x+=dx;node.handleIn.y+=dy;
    node.handleOut.x+=dx;node.handleOut.y+=dy;
    this._autosaveRecovery();
    this._redrawEditor();
    this._updatePanel();
    return true;
  }

_deleteSelectedNode() {
  if (this._selectedPiano >= 0 && this._selectedPiano < this._pianos.length) {
    this._pianos.splice(this._selectedPiano, 1);
    this._selectedPiano = -1;
    this._selectedPart = null;
    this._updatePanel();
    this._redrawEditor();
    return;
  }

  if (this._selectedNode < 0 || this._selectedNode >= this._nodes.length) return;

  this._nodes.splice(this._selectedNode, 1);

  if (this._nodes.length === 0) {
    this._selectedNode = -1;
    this._selectedPart = null;
  } else {
    this._selectedNode = Math.min(this._selectedNode, this._nodes.length - 1);
    this._selectedPart = { type: 'node', index: this._selectedNode };
  }

  this._updatePanel();
  this._redrawEditor();
}
  _isPointerInViewport(pointer) {
    return (
      pointer.x >= this._viewX &&
      pointer.x <= this._viewX + this._viewW &&
      pointer.y >= this._viewY &&
      pointer.y <= this._viewY + this._viewH
    );
  }

  _screenToWorld(screenX, screenY) {
    return this._editCam.getWorldPoint(screenX, screenY);
  }

_findControlAt(x, y) {
const R_NODE = 18;
const R_HANDLE = 28;
  // Anchors and visible selected handles use screen-space finger targets.
  // Geometry coordinates remain unchanged regardless of zoom.
  const nodeHit=pickCenterlineControl(this._nodes,this._selectedNode,{x,y},this._editCam?.zoom);
  if(nodeHit)return nodeHit;

  // --- PIANOS (modelo actual: a / b / point) ---
  for (let i = this._pianos.length - 1; i >= 0; i--) {
    const p = this._pianos[i];
    if (!p || !p.a || !p.b || !p.point) continue;

    // centro lógico del piano
    if (Phaser.Math.Distance.Between(x, y, p.point.x, p.point.y) < R_NODE) {
  return { type: 'piano', index: i };
}

if (Phaser.Math.Distance.Between(x, y, p.a.x, p.a.y) < R_HANDLE) {
  return { type: 'pianoA', index: i };
}

if (Phaser.Math.Distance.Between(x, y, p.b.x, p.b.y) < R_HANDLE) {
  return { type: 'pianoB', index: i };
}
  }

  return null;
}
  _drawGrid() {
    this._gridGfx.clear();

    this._gridGfx.lineStyle(1, 0x1f2c44, 0.7);
    for (let x = 0; x <= this._editorWorldW; x += 100) {
      this._gridGfx.lineBetween(x, 0, x, this._editorWorldH);
    }
    for (let y = 0; y <= this._editorWorldH; y += 100) {
      this._gridGfx.lineBetween(0, y, this._editorWorldW, y);
    }

    this._gridGfx.lineStyle(2, 0x2d3d5c, 0.9);
    for (let x = 0; x <= this._editorWorldW; x += 500) {
      this._gridGfx.lineBetween(x, 0, x, this._editorWorldH);
    }
    for (let y = 0; y <= this._editorWorldH; y += 500) {
      this._gridGfx.lineBetween(0, y, this._editorWorldW, y);
    }
  }

  _sampleCubicBezier(p0, p1, p2, p3, steps = 24) {
    const pts = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;

      const x =
        mt2 * mt * p0.x +
        3 * mt2 * t * p1.x +
        3 * mt * t2 * p2.x +
        t2 * t * p3.x;

      const y =
        mt2 * mt * p0.y +
        3 * mt2 * t * p1.y +
        3 * mt * t2 * p2.y +
        t2 * t * p3.y;

      pts.push({ x, y });
    }

    return pts;
  }

  _getBezierPoints() {
    const count = this._nodes.length;
    if (count < 2) return this._nodes.map((n) => ({ x: n.x, y: n.y }));

    const pts = [];
    const segCount = this._isClosed ? count : count - 1;
    const variableWidth = this._nodes.some(n=>Number.isFinite(n.width) && n.width>0);
    for (let i = 0; i < segCount; i++) {
      const a = this._nodes[i];
      const b = this._nodes[(i + 1) % count];

      const seg = this._sampleCubicBezier(
        { x: a.x, y: a.y },
        { x: a.handleOut.x, y: a.handleOut.y },
        { x: b.handleIn.x, y: b.handleIn.y },
        { x: b.x, y: b.y },
        28
      );
      if(variableWidth){
        // Width interpolation uses the same Bezier t samples as the editor road.
        seg.forEach((p,k)=>{p.width=interpolateRoadWidth(a,b,k/28,this._trackWidth);});
      }
      if (i > 0 && !(this._isClosed && i === segCount - 1)) {
        seg.shift();
      }

      pts.push(...seg);
    }

    if (this._isClosed && pts.length > 1) {
      const first = pts[0];
      const last = pts[pts.length - 1];

      if (first.x !== last.x || first.y !== last.y) {
        pts.push(first.width===undefined?{ x:first.x,y:first.y }:{ x:first.x,y:first.y,width:first.width });
      }
    }

    return pts;
  }

  _buildTrackStrip(points, width) {
    if (!Array.isArray(points) || points.length < 2) {
      return { left: [], right: [] };
    }

    const left = [];
    const right = [];

    for (let i = 0; i < points.length; i++) {
      const prevIndex = this._isClosed
        ? (i - 1 + points.length) % points.length
        : Math.max(0, i - 1);

      const nextIndex = this._isClosed
        ? (i + 1) % points.length
        : Math.min(points.length - 1, i + 1);

      const pPrev = points[prevIndex];
      const pCurr = points[i];
      const pNext = points[nextIndex];

      let tx = pNext.x - pPrev.x;
      let ty = pNext.y - pPrev.y;

      const tl = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= tl;
      ty /= tl;

      const nx = -ty;
      const ny = tx;
      const half = (Number.isFinite(pCurr.width)&&pCurr.width>0?pCurr.width:width) * 0.5;

      left.push({
        x: pCurr.x - nx * half,
        y: pCurr.y - ny * half
      });

      right.push({
        x: pCurr.x + nx * half,
        y: pCurr.y + ny * half
      });
    }

    return { left, right };
  }

  _findNearestCurvePoint(worldX, worldY) {
    const pts = this._getBezierPoints();
    if (pts.length < 2) return null;

    let bestI = 0;
    let bestD2 = Infinity;

    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - worldX;
      const dy = pts[i].y - worldY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestI = i;
      }
    }

    const prevIndex = this._isClosed
      ? (bestI - 1 + pts.length) % pts.length
      : Math.max(0, bestI - 1);

    const nextIndex = this._isClosed
      ? (bestI + 1) % pts.length
      : Math.min(pts.length - 1, bestI + 1);

    const pPrev = pts[prevIndex];
    const pCurr = pts[bestI];
    const pNext = pts[nextIndex];

    let tx = pNext.x - pPrev.x;
    let ty = pNext.y - pPrev.y;
    const tl = Math.sqrt(tx * tx + ty * ty) || 1;
    tx /= tl;
    ty /= tl;

    const nx = -ty;
    const ny = tx;

    return {
      point: { x: pCurr.x, y: pCurr.y },
      tangent: { x: tx, y: ty },
      normal: { x: nx, y: ny }
    };
  }

  _placeStartLineAt(worldX, worldY) {
    const hit = this._findNearestCurvePoint(worldX, worldY);
    if (!hit) return;
    const half = this._trackWidth * 0.5;
    this._startLine = {
      a: { x: hit.point.x - hit.normal.x * half, y: hit.point.y - hit.normal.y * half },
      b: { x: hit.point.x + hit.normal.x * half, y: hit.point.y + hit.normal.y * half },
      normal: { x: hit.tangent.x, y: hit.tangent.y }
    };
    this._updatePanel();
    this._redrawEditor();
  }

  _placeFinishLineAt(worldX, worldY) {
    const hit = this._findNearestCurvePoint(worldX, worldY);
    if (!hit) return;

    const half = this._trackWidth * 0.5;

    this._finishLine = {
      a: {
        x: hit.point.x - hit.normal.x * half,
        y: hit.point.y - hit.normal.y * half
      },
      b: {
        x: hit.point.x + hit.normal.x * half,
        y: hit.point.y + hit.normal.y * half
      },
      normal: {
        x: hit.tangent.x,
        y: hit.tangent.y
      }
    };

    this._updatePanel();
    this._redrawEditor();
  }

  _placeCheckpointAt(worldX, worldY) {
    const hit = this._findNearestCurvePoint(worldX, worldY);
    if (!hit) return;

    const half = this._trackWidth * 0.5;

    this._checkpoints.push({
      a: {
        x: hit.point.x - hit.normal.x * half,
        y: hit.point.y - hit.normal.y * half
      },
      b: {
        x: hit.point.x + hit.normal.x * half,
        y: hit.point.y + hit.normal.y * half
      },
      normal: {
        x: hit.tangent.x,
        y: hit.tangent.y
      }
    });

    this._updatePanel();
    this._redrawEditor();
  }
  _getVisualGridSlots() {
    if (this._showStartingGrid === false) return [];
    if (!this._isClosed || this._raceType === 'stage') return [];
    if (!this._finishLine?.a || !this._finishLine?.b) return [];

    const pts = this._getBezierPoints();
    if (!Array.isArray(pts) || pts.length < 2) return [];

    const finishMidX = (this._finishLine.a.x + this._finishLine.b.x) * 0.5;
    const finishMidY = (this._finishLine.a.y + this._finishLine.b.y) * 0.5;

    // 1) índice del punto de la centerline más cercano a la meta
    let bestI = 0;
    let bestD2 = Infinity;

    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i].x - finishMidX;
      const dy = pts[i].y - finishMidY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestI = i;
      }
    }

    // 2) acumulado de distancia a lo largo de la centerline
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      cum[i] = cum[i - 1] + Math.hypot(dx, dy);
    }

    const totalLen = cum[cum.length - 1] || 1;
    const finishS = cum[bestI];

    const totalSlots = 20;
    const rowSpacing = 90;
    const colOffset = Math.min(this._trackWidth * 0.22, 70);
    const backOffset = 140;
    const slotLen = 56;
    const slotWid = 24;

    const slots = [];

    const getPointAtS = (targetS) => {
      if (!this._isClosed) {
        targetS = Phaser.Math.Clamp(targetS, 0, totalLen);
      } else {
        while (targetS < 0) targetS += totalLen;
        while (targetS > totalLen) targetS -= totalLen;
      }

      let idx = 0;
      while (idx < cum.length - 1 && cum[idx + 1] < targetS) idx++;

      const a = pts[idx];
      const b = pts[Math.min(idx + 1, pts.length - 1)];
      const s0 = cum[idx];
      const s1 = cum[Math.min(idx + 1, cum.length - 1)];
      const span = Math.max(1e-6, s1 - s0);
      const t = Phaser.Math.Clamp((targetS - s0) / span, 0, 1);

      const x = Phaser.Math.Linear(a.x, b.x, t);
      const y = Phaser.Math.Linear(a.y, b.y, t);

      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;

      const nx = -ty;
      const ny = tx;

      return { x, y, tx, ty, nx, ny };
    };

    for (let i = 0; i < totalSlots; i++) {
      const row = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      const side = isLeft ? -1 : 1;

const lateralFactor = side * 0.5; // izquierda/derecha

const correctedOffset =
  backOffset +
  row * rowSpacing +
  lateralFactor * (rowSpacing * 0.25);

const targetS = finishS - correctedOffset;
      const p = getPointAtS(targetS);
      if (!p) continue;

      const cx = p.x + p.nx * (side * colOffset);
      const cy = p.y + p.ny * (side * colOffset);

      slots.push({
        index: i + 1,
        x: cx,
        y: cy,
        r: Math.atan2(p.ty, p.tx),

        // compat editor
        cx,
        cy,
        tx: p.tx,
        ty: p.ty,
        nx: p.nx,
        ny: p.ny,
        len: slotLen,
        wid: slotWid
      });
    }

    return slots;
  }
  _redrawEditor() {
    this._trackGfx.clear();
    this._curveGfx.clear();
    this._guideGfx.clear();
    this._pianoGfx.clear();
    this._checkpointGfx.clear();
    this._finishGfx.clear();
    this._nodeGfx.clear();
        const gridSlots = this._getVisualGridSlots();

    const bezier = this._getBezierPoints();

    if (bezier.length >= 2) {
      const strip = this._buildTrackStrip(bezier, this._trackWidth);

      if (strip.left.length >= 2 && strip.right.length >= 2) {
        this._trackGfx.fillStyle(0x2f343a, this._imageCanvas ? 0.16 : 0.95);
        this._trackGfx.beginPath();
        this._trackGfx.moveTo(strip.left[0].x, strip.left[0].y);

        for (let i = 1; i < strip.left.length; i++) {
          this._trackGfx.lineTo(strip.left[i].x, strip.left[i].y);
        }

        for (let i = strip.right.length - 1; i >= 0; i--) {
          this._trackGfx.lineTo(strip.right[i].x, strip.right[i].y);
        }

        this._trackGfx.closePath();
        this._trackGfx.fillPath();

        this._trackGfx.lineStyle(4, 0xf2f2f2, 0.9);

        this._trackGfx.beginPath();
        this._trackGfx.moveTo(strip.left[0].x, strip.left[0].y);
        for (let i = 1; i < strip.left.length; i++) {
          this._trackGfx.lineTo(strip.left[i].x, strip.left[i].y);
        }
        if (this._isClosed) this._trackGfx.closePath();
        this._trackGfx.strokePath();

        this._trackGfx.beginPath();
        this._trackGfx.moveTo(strip.right[0].x, strip.right[0].y);
        for (let i = 1; i < strip.right.length; i++) {
          this._trackGfx.lineTo(strip.right[i].x, strip.right[i].y);
        }
        if (this._isClosed) this._trackGfx.closePath();
        this._trackGfx.strokePath();
      }

      this._curveGfx.lineStyle(2, 0x8fd0ff, 0.55);
      this._curveGfx.beginPath();
      this._curveGfx.moveTo(bezier[0].x, bezier[0].y);
      for (let i = 1; i < bezier.length; i++) {
        this._curveGfx.lineTo(bezier[i].x, bezier[i].y);
      }
      if (this._isClosed) this._curveGfx.closePath();
      this._curveGfx.strokePath();
    }

    for (let i = 0; i < this._checkpoints.length; i++) {
      const cp = this._checkpoints[i];

      this._checkpointGfx.lineStyle(8, 0x4db0ff, 0.95);
      this._checkpointGfx.beginPath();
      this._checkpointGfx.moveTo(cp.a.x, cp.a.y);
      this._checkpointGfx.lineTo(cp.b.x, cp.b.y);
      this._checkpointGfx.strokePath();

      const midX = (cp.a.x + cp.b.x) * 0.5;
      const midY = (cp.a.y + cp.b.y) * 0.5;

      this._checkpointGfx.fillStyle(0x4db0ff, 1);
      this._checkpointGfx.fillCircle(midX, midY, 9);

      this._checkpointGfx.lineStyle(2, 0x0b1020, 0.9);
      this._checkpointGfx.strokeCircle(midX, midY, 9);

      this._checkpointGfx.fillStyle(0x0b1020, 1);
      this._checkpointGfx.fillCircle(midX, midY, 3);
    }

    // Pianos manuales placeholder
    for (let i = 0; i < this._pianos.length; i++) {
      const p = this._pianos[i];
      const selected = i === this._selectedPiano;

      if (p?.a && p?.b) {
        this._pianoGfx.lineStyle(selected ? 12 : 10, selected ? 0xffd166 : 0xd92f2f, 0.95);
        this._pianoGfx.beginPath();
        this._pianoGfx.moveTo(p.a.x, p.a.y);
        this._pianoGfx.lineTo(p.b.x, p.b.y);
        this._pianoGfx.strokePath();

        this._pianoGfx.lineStyle(4, 0xf2f2f2, 0.95);
        this._pianoGfx.beginPath();
        this._pianoGfx.moveTo(p.a.x, p.a.y);
        this._pianoGfx.lineTo(p.b.x, p.b.y);
        this._pianoGfx.strokePath();
      }
    }

    if (this._startLine?.a && this._startLine?.b) {
      this._finishGfx.lineStyle(10, 0x2bff88, 0.95);
      this._finishGfx.beginPath();
      this._finishGfx.moveTo(this._startLine.a.x, this._startLine.a.y);
      this._finishGfx.lineTo(this._startLine.b.x, this._startLine.b.y);
      this._finishGfx.strokePath();
      this._finishGfx.fillStyle(0x2bff88, 1);
      this._finishGfx.fillCircle(this._startLine.a.x, this._startLine.a.y, 5);
      this._finishGfx.fillCircle(this._startLine.b.x, this._startLine.b.y, 5);
    }

    if (this._finishLine?.a && this._finishLine?.b) {
      this._finishGfx.lineStyle(10, 0xffffff, 0.95);
      this._finishGfx.beginPath();
      this._finishGfx.moveTo(this._finishLine.a.x, this._finishLine.a.y);
      this._finishGfx.lineTo(this._finishLine.b.x, this._finishLine.b.y);
      this._finishGfx.strokePath();

      this._finishGfx.lineStyle(4, 0x111111, 0.95);
      this._finishGfx.beginPath();
      this._finishGfx.moveTo(this._finishLine.a.x, this._finishLine.a.y);
      this._finishGfx.lineTo(this._finishLine.b.x, this._finishLine.b.y);
      this._finishGfx.strokePath();

      this._finishGfx.fillStyle(0xffd166, 1);
      this._finishGfx.fillCircle(this._finishLine.a.x, this._finishLine.a.y, 5);
      this._finishGfx.fillCircle(this._finishLine.b.x, this._finishLine.b.y, 5);
    }
    if (gridSlots.length > 0) {
      for (const s of gridSlots) {
        const hx = s.tx * (s.len * 0.5);
        const hy = s.ty * (s.len * 0.5);
        const wx = s.nx * (s.wid * 0.5);
        const wy = s.ny * (s.wid * 0.5);

        const p1 = { x: s.cx - hx - wx, y: s.cy - hy - wy };
        const p2 = { x: s.cx + hx - wx, y: s.cy + hy - wy };
        const p3 = { x: s.cx + hx + wx, y: s.cy + hy + wy };
        const p4 = { x: s.cx - hx + wx, y: s.cy - hy + wy };

        this._finishGfx.lineStyle(2, 0xf7f7f7, 0.9);
        this._finishGfx.beginPath();
        this._finishGfx.moveTo(p1.x, p1.y);
        this._finishGfx.lineTo(p2.x, p2.y);
        this._finishGfx.lineTo(p3.x, p3.y);
        this._finishGfx.lineTo(p4.x, p4.y);
        this._finishGfx.closePath();
        this._finishGfx.strokePath();

        this._finishGfx.fillStyle(0xffffff, 0.08);
        this._finishGfx.fillPoints([p1, p2, p3, p4], true);

        this._finishGfx.fillStyle(0xffffff, 0.95);
        this._finishGfx.fillCircle(s.cx, s.cy, 2);
      }
    }
    // Stable-size markers like a vector editor; they do not shrink when the
    // full 6688px photograph is fitted to a small phone display.
    const zoom=Math.max(.02,this._editCam?.zoom||1);
    const radius=px=>worldControlRadius(px,zoom);
    const px=EDITOR_CONTROL_PIXELS;
    for(let i=0;i<this._nodes.length;i++){
      const n=this._nodes[i],selected=i===this._selectedNode;
      if(selected){
        this._guideGfx.lineStyle(radius(1.6),0xf2f7ff,.95);
        this._guideGfx.lineBetween(n.x,n.y,n.handleIn.x,n.handleIn.y);
        this._guideGfx.lineBetween(n.x,n.y,n.handleOut.x,n.handleOut.y);
        this._drawHandleDot(n.handleIn.x,n.handleIn.y,this._selectedPart?.type==='handleIn');
        this._drawHandleDot(n.handleOut.x,n.handleOut.y,this._selectedPart?.type==='handleOut');
      }
      const r=radius(selected?px.selectedNode:px.node);
      this._nodeGfx.fillStyle(0x071626,.93);
      this._nodeGfx.fillCircle(n.x,n.y,r+radius(px.halo));
      this._nodeGfx.fillStyle(selected?0x58ffae:0xffffff,1);
      this._nodeGfx.fillCircle(n.x,n.y,r);
      this._nodeGfx.lineStyle(radius(1.6),selected?0x0b765b:0x314a60,1);
      this._nodeGfx.strokeCircle(n.x,n.y,r);
      this._nodeGfx.fillStyle(0x061a26,1);
      this._nodeGfx.fillCircle(n.x,n.y,radius(selected?3:2));
    }
  }
  _drawHandleDot(x,y,selected=false){
    const zoom=Math.max(.02,this._editCam?.zoom||1),radius=px=>worldControlRadius(px,zoom),px=EDITOR_CONTROL_PIXELS;
    const r=radius(selected?px.selectedHandle:px.handle);
    this._nodeGfx.fillStyle(0x071626,.95);
    this._nodeGfx.fillCircle(x,y,r+radius(px.halo));
    this._nodeGfx.fillStyle(selected?0xffcf54:0xc3e8ff,1);
    this._nodeGfx.fillCircle(x,y,r);
    this._nodeGfx.lineStyle(radius(1.3),0x23394e,1);
    this._nodeGfx.strokeCircle(x,y,r);
  }

  // The display logic is installed as an HTML inspector by
  // installTrackStudioShapeEditor() at the end of create().
  // DO NOT restore Phaser Text.setText here: iPhone WebGL crashes in Frame.updateUVs.
  _updatePanel() {
    // Safe during initialization, before the DOM inspector is installed.
  }

  _getProjectData() {
    return {
      version: 1,
      nodes: this._nodes,
      trackWidth: this._trackWidth,
      isClosed: this._isClosed,
      startLine: this._startLine,
      finishLine: this._finishLine,
      showStartingGrid: this._showStartingGrid !== false,
      checkpoints: this._checkpoints,
      guideAlpha: this._guideAlpha,
      guideVisible: this._guideVisible,
      guideScale: this._guideScale,
      guideX: this._guideImage?.x ?? this._guideX,
      guideY: this._guideImage?.y ?? this._guideY,
      guideLocked: this._guideLocked,
      nudgeStepIndex: this._nudgeStepIndex,
      viewTool: this._viewTool,
      saveTool: this._saveTool,
      modeTool: this._modeTool,
      trackTool: this._trackTool,
      guideTool: this._guideTool,
      raceType: this._raceType,
      importedTrackMeta: this._importedTrackMeta
    };
  }
_exportToGameTrack() {
  const points = this._getBezierPoints();

  if (!Array.isArray(points) || points.length < 2) return null;

  const finishLine = this._finishLine
    ? {
        a: {
          x: Math.round(this._finishLine.a.x),
          y: Math.round(this._finishLine.a.y)
        },
        b: {
          x: Math.round(this._finishLine.b.x),
          y: Math.round(this._finishLine.b.y)
        },
        normal: this._finishLine.normal
          ? {
              x: Number(this._finishLine.normal.x),
              y: Number(this._finishLine.normal.y)
            }
          : undefined
      }
    : null;

  const checkpoints = Array.isArray(this._checkpoints)
    ? this._checkpoints.map((cp) => ({
        a: {
          x: Math.round(cp.a.x),
          y: Math.round(cp.a.y)
        },
        b: {
          x: Math.round(cp.b.x),
          y: Math.round(cp.b.y)
        },
        normal: cp.normal
          ? {
              x: Number(cp.normal.x),
              y: Number(cp.normal.y)
            }
          : undefined
      }))
    : [];

  const startLine = this._startLine
    ? {
        a: { x: Math.round(this._startLine.a.x), y: Math.round(this._startLine.a.y) },
        b: { x: Math.round(this._startLine.b.x), y: Math.round(this._startLine.b.y) },
        normal: this._startLine.normal ? { x: Number(this._startLine.normal.x), y: Number(this._startLine.normal.y) } : undefined
      }
    : null;

  let start = this._nodes[0]
    ? { x: Math.round(this._nodes[0].x), y: Math.round(this._nodes[0].y), r: 0 }
    : { x: 400, y: 400, r: 0 };

  // Open stages use an explicit start line. Spawn is derived behind it,
  // never from the first road node, so the road may extend before SALIDA.
  if (!this._isClosed && this._raceType === 'stage' && startLine?.a && startLine?.b) {
    const mx = (startLine.a.x + startLine.b.x) * 0.5;
    const my = (startLine.a.y + startLine.b.y) * 0.5;
    let tx = Number(startLine.normal?.x) || 0;
    let ty = Number(startLine.normal?.y) || 0;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    const spawnBack = Math.max(70, Math.min(140, this._trackWidth * 0.9));
    start = { x: Math.round(mx - tx * spawnBack), y: Math.round(my - ty * spawnBack), r: Math.atan2(ty, tx) };
  }

  let grid = null;

  if (this._showStartingGrid !== false && this._isClosed && this._raceType !== 'stage' && finishLine?.a && finishLine?.b) {
    const visualSlots = this._getVisualGridSlots();

    const slots = visualSlots.map((s, idx) => ({
      index: idx + 1,
      x: Math.round(s.cx),
      y: Math.round(s.cy),
      r: Math.atan2(s.ty, s.tx)
    }));

    grid = {
      pole: 'left',
      rowSpacing: 90,
      colOffset: Math.min(this._trackWidth * 0.22, 70),
      backOffset: 140,
      slots
    };

    if (slots.length > 0) {
      start = {
        x: slots[0].x,
        y: slots[0].y,
        r: slots[0].r
      };
    }
  }

  return {
    name: 'TrackStudio Export',
    worldW: this._editorWorldW,
    worldH: this._editorWorldH,
    trackWidth: this._trackWidth,
    grassMargin: 120,
    sampleStepPx: 12,
    cellSize: 400,
    shoulderPx: 10,
    closed: this._isClosed !== false,
    raceType: this._isClosed ? (this._raceType || 'circuit') : 'stage',
    ...(this._importedTrackMeta || {}),

    start,

    centerline: points.map((p) => ({
      x: Math.round(p.x),
      y: Math.round(p.y),
      width: Number.isFinite(p.width)&&p.width>0?p.width:this._trackWidth
    })),

    startLine,
    finishLine,
    checkpoints,
    grid
  };
}
// =================================================
// SAVE / LOAD TRACK (localStorage)
// =================================================

_saveTrack() {
  try {
    const data = {
      nodes: this._nodes,
      trackWidth: this._trackWidth,
      isClosed: this._isClosed
    };

    localStorage.setItem('tdr_track', JSON.stringify(data));
    console.log('💾 Track guardado');
  } catch (e) {
    console.error('Error guardando track', e);
  }
}

_loadTrack() {
  try {
    const raw = localStorage.getItem('tdr_track');
    if (!raw) {
      console.warn('No hay track guardado');
      return;
    }

    const data = JSON.parse(raw);

    this._nodes = data.nodes || [];
    this._trackWidth = data.trackWidth || 140;
    this._isClosed = data.isClosed || false;

    // 🔁 reconstruir visual
    this._rebuildFromNodes?.();
    this._redrawAll?.();

    console.log('📂 Track cargado');
  } catch (e) {
    console.error('Error cargando track', e);
  }
}  
  _newTrack() {
  try {
    // limpiar nodos
    this._nodes = [];

    // reset básico
    this._trackWidth = 140;
    this._isClosed = false;

    // limpiar selección
    this._selectedNodeIndex = -1;

    // refrescar vista
    this._rebuildFromNodes?.();
    this._redrawAll?.();

    console.log('🆕 Nuevo track creado');
  } catch (e) {
    console.error('Error creando nuevo track', e);
  }
}
  _applyProjectData(data) {
    this._nodes = data.nodes || [];
    this._trackWidth = data.trackWidth ?? 140;
    this._isClosed = data.isClosed ?? false;
    this._startLine = data.startLine || null;
    this._finishLine = data.finishLine || null;
    this._showStartingGrid = data.showStartingGrid !== false;
    this._checkpoints = data.checkpoints || [];
    this._guideAlpha = data.guideAlpha ?? 0.32;
    this._guideVisible = data.guideVisible ?? true;
    this._guideScale = data.guideScale ?? 1;
    this._guideX = Number.isFinite(data.guideX) ? data.guideX : this._guideX;
    this._guideY = Number.isFinite(data.guideY) ? data.guideY : this._guideY;
    this._guideLocked = data.guideLocked ?? true;
    this._nudgeStepIndex = data.nudgeStepIndex ?? 2;
    this._viewTool = data.viewTool || 'zoomIn';
    this._saveTool = data.saveTool || 'save';
    this._modeTool = data.modeTool || 'edit';
    this._trackTool = data.trackTool || 'widthUp';
    this._guideTool = data.guideTool || 'load';
    this._raceType = this._isClosed ? (data.raceType || 'circuit') : 'stage';
    this._importedTrackMeta = data.importedTrackMeta || null;

    if (this._guideImage) {
      this._guideImage.setAlpha(this._guideAlpha);
      this._guideImage.setVisible(this._guideVisible);
      if (Number.isFinite(this._guideX)) this._guideImage.x = this._guideX;
      if (Number.isFinite(this._guideY)) this._guideImage.y = this._guideY;
      this._guideImage.setScale((this._guideBaseScale || 1) * this._guideScale);
    }

    this._selectedNode = -1;
    this._selectedPart = null;
    this._tool = 'edit';

    this._updateToolButtons();
    this._updatePanel();
    this._redrawEditor();
  }

  _captureHistoryState() {
    return JSON.stringify(this._getProjectData());
  }

  _pushHistory() {
    const snap = this._captureHistoryState();
    if (this._undoStack[this._undoStack.length - 1] === snap) return;
    this._undoStack.push(snap);
    if (this._undoStack.length > this._historyLimit) this._undoStack.shift();
    this._redoStack = [];
  }

  _restoreHistoryState(snap) {
    if (!snap) return;
    this._applyProjectData(JSON.parse(snap));
    this._autosaveRecovery();
  }

  _undo() {
    if (!this._undoStack.length) return this._flashMessage('Nada que deshacer');
    const current = this._captureHistoryState();
    const previous = this._undoStack.pop();
    if (previous === current && this._undoStack.length) {
      this._redoStack.push(current);
      return this._restoreHistoryState(this._undoStack.pop());
    }
    this._redoStack.push(current);
    this._restoreHistoryState(previous);
    this._flashMessage('↶ Deshecho');
  }

  _redo() {
    if (!this._redoStack.length) return this._flashMessage('Nada que rehacer');
    this._undoStack.push(this._captureHistoryState());
    this._restoreHistoryState(this._redoStack.pop());
    this._flashMessage('↷ Rehecho');
  }

  _autosaveRecovery() {
    try {
      const data = { editor: this._getProjectData(), gameTrack: this._exportToGameTrack() };
      localStorage.setItem('trackstudio_recovery', JSON.stringify(data));
    } catch (e) {
      console.warn('No se pudo crear recuperación automática', e);
    }
  }

  _saveProject() {
    try {
const data = {
  editor: this._getProjectData(),
  gameTrack: this._exportToGameTrack()
};
      const serialized = JSON.stringify(data, null, 2);
      const roundTrip = JSON.parse(serialized);
      if (this._startLine && (!roundTrip.editor?.startLine || !roundTrip.gameTrack?.startLine)) {
        throw new Error('La SALIDA no sobrevivió a la serialización del proyecto');
      }
      if (!this._isClosed && roundTrip.gameTrack?.raceType !== 'stage') {
        throw new Error('Un tramo abierto debe exportarse como stage');
      }
      localStorage.setItem('trackstudio_project', serialized);
      localStorage.setItem('trackstudio_recovery', serialized);
      const blob = new Blob([serialized], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trackstudio-${(data.gameTrack?.name || 'project').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this._flashMessage('💾 Guardado + copia JSON');
      console.log('✅ Proyecto guardado + backup JSON');
    } catch (e) {
      console.error('❌ Error guardando proyecto', e);
    }
  }

  _openProjectSourceMenu() {
    openTrackStudioSourceMenu(this);
  }

  _restoreLastTrackStudioRecovery() {
    try {
      const raw = localStorage.getItem('trackstudio_recovery');
      if (!raw) return this._flashMessage('No hay trabajo automático que recuperar');
      const data = JSON.parse(raw);
      const editor = data.editor || data;
      if (!Array.isArray(editor.nodes)) throw new Error('El respaldo no contiene nodos válidos');
      if (!window.confirm('¿Recuperar el último trabajo automático?\n\nSustituirá lo que tienes abierto. Puedes cancelar.')) return;
      this._pushHistory();
      this._applyProjectData(editor);
      this._autosaveRecovery();
      this._flashMessage('Trabajo automático recuperado');
    } catch (err) {
      console.error('[TrackStudio] No se pudo recuperar el trabajo', err);
      this._flashMessage('No se pudo recuperar el trabajo');
    }
  }

  _openGameTrackSourceMenu() {
    const keys=getTrackKeys();
    if(!keys.length){this._flashMessage('❌ No hay circuitos registrados');return;}
    const rows=keys.map((key,i)=>{let name=key;try{name=createTrack(key)?.name||key;}catch{}return `${i+1} · ${name}`;});
    const raw=window.prompt(`CIRCUITOS DEL JUEGO\n\n${rows.join('\n')}\n\nEscribe el número:`,'1');
    if(raw===null)return;
    const n=Number.parseInt(String(raw).trim(),10),key=keys[n-1];
    if(!key){this._flashMessage('❌ Circuito no válido');return;}
    try{
      this._pushHistory();
      this._importProjectOrTrack(createTrack(key));
      this._autosaveRecovery();
      this._flashMessage(`📍 ${createTrack(key)?.name||key} cargado`);
    }catch(e){console.error('❌ No se pudo cargar circuito del juego',key,e);this._flashMessage('❌ Error cargando circuito');}
  }

  _createProjectInput() {
    this._destroyProjectInput();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,.tdrtrack,application/octet-stream';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.addEventListener('change', async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const isBundle = await looksLikeImageProject(file);
        if (isBundle) {
          const result = await importImageProjectFile(this, file);
          this._flashMessage(result.repairedNested
            ? 'Proyecto reparado: imagen y trazado recuperados'
            : 'Imagen y geometría restauradas');
        } else if (file.name.toLowerCase().endsWith('.tdrtrack')) {
          throw new Error('Paquete .tdrtrack incompleto o incorrecto');
        } else {
          let data;
          try { data = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); }
          catch { throw new Error('No es JSON. Usa el archivo .tdrtrack de TrackStudio'); }
          this._importProjectOrTrack(data);
          this._flashMessage('JSON cargado');
        }
      } catch (e) {
        console.error('[TrackStudio] Error al importar archivo', file.name, e);
        this._flashMessage('Error al abrir: ' + String(e?.message || 'archivo no válido').slice(0, 150));
      }
      input.value = '';
    });
    document.body.appendChild(input);
    this._projectInput = input;
  }

  _destroyProjectInput() {
    if (this._projectInput?.parentNode) this._projectInput.parentNode.removeChild(this._projectInput);
    this._projectInput = null;
  }

  _openProjectPicker() {
    if (!this._projectInput) this._createProjectInput();
    this._projectInput?.click();
  }

  _nodesFromCenterline(points) {
    const src = Array.isArray(points) ? points : [];
    // Los tracks del juego ya vienen densamente muestreados (Arafo tiene miles
    // de puntos). Convertir cada muestra en un nodo Bézier crea miles de objetos
    // interactivos y bloquea Track Studio al elegir "1". Reducimos únicamente
    // la representación editable; el JSON integrado no se modifica.
    const maxEditableNodes = 320;
    const step = src.length > maxEditableNodes ? Math.ceil(src.length / maxEditableNodes) : 1;
    const sampled = step > 1
      ? src.filter((_, i) => i === 0 || i === src.length - 1 || i % step === 0)
      : src;
    return sampled.map((p, i) => {
      const prev = sampled[Math.max(0, i - 1)] || p;
      const next = sampled[Math.min(sampled.length - 1, i + 1)] || p;
      let dx = Number(next.x) - Number(prev.x);
      let dy = Number(next.y) - Number(prev.y);
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const h = Math.min(60, Math.max(18, len * 0.22));
      return {
        x: Number(p.x), y: Number(p.y),
        handleIn: { x: Number(p.x) - dx * h, y: Number(p.y) - dy * h },
        handleOut: { x: Number(p.x) + dx * h, y: Number(p.y) + dy * h },
        ...(Number.isFinite(p.width)&&p.width>0?{width:Number(p.width)}:{})
      };
    });
  }

  _importProjectOrTrack(data) {
    if (data?.editor || Array.isArray(data?.nodes)) {
      this._applyProjectData(data.editor || data);
      return;
    }
    if (!Array.isArray(data?.centerline) || data.centerline.length < 2) {
      throw new Error('El JSON no contiene nodes ni centerline');
    }
    this._nodes = this._nodesFromCenterline(data.centerline);
    this._trackWidth = Number(data.trackWidth) || Number(data.centerline[0]?.width) || 140;
    this._isClosed = data.closed !== false;
    this._raceType = this._isClosed ? (data.raceType || 'circuit') : 'stage';
    this._editorWorldW = Number(data.worldW) || this._editorWorldW;
    this._editorWorldH = Number(data.worldH) || this._editorWorldH;
    this._startLine = data.startLine || null;
    this._finishLine = data.finishLine || null;
    this._showStartingGrid = typeof data.showStartingGrid === 'boolean' ? data.showStartingGrid : !!(data.grid?.slots?.length);
    this._checkpoints = Array.isArray(data.checkpoints) ? data.checkpoints : [];
    const { centerline, closed, raceType, trackWidth, worldW, worldH, start, startLine, finishLine, checkpoints, grid, ...rest } = data;
    this._importedTrackMeta = rest;
    this._selectedNode = -1;
    this._selectedPart = null;
    this._tool = 'edit';
    this._editCam?.setBounds(0, 0, this._editorWorldW, this._editorWorldH);
    this._editCam?.centerOn(this._editorWorldW / 2, this._editorWorldH / 2);
    this._updateToolButtons();
    this._updatePanel();
    this._redrawEditor();
  }

  _loadProject() {
    try {
      const raw = localStorage.getItem('trackstudio_project');
      if (!raw) {
        this._flashMessage?.('No hay ningún proyecto guardado en este dispositivo');
        return false;
      }
      const data = JSON.parse(raw);
      if (!Array.isArray((data.editor || data)?.nodes))
        throw Error('El proyecto local no contiene nodos');
      // Never replace the active work without confirmation.
      if (!window.confirm('¿Abrir el proyecto guardado?\\n\\nSustituirá lo que tienes abierto.'))return false;
      this._pushHistory();
      this._applyProjectData(data.editor || data);
      this._autosaveRecovery();
      console.log('📂 Proyecto cargado');
      return true;
    } catch (e) {
      console.error('❌ Error cargando proyecto', e);
      this._flashMessage?.('No se pudo abrir el proyecto guardado');
      return false;
    }
  }

  _newProject() {
    this._nodes = [];
    this._startLine = null;
    this._finishLine = null;
    this._showStartingGrid = true;
    this._checkpoints = [];
    this._isClosed = false;
    this._trackWidth = 140;
    this._selectedNode = -1;
    this._selectedPart = null;
    this._tool = 'edit';
    this._viewTool = 'zoomIn';
    this._saveTool = 'save';
    this._modeTool = 'edit';
    this._trackTool = 'widthUp';
    this._guideTool = 'load';
    this._guideScale = 1;
    this._guideX = null;
    this._guideY = null;
    this._guideLocked = true;
    this._raceType = 'stage';
    this._importedTrackMeta = null;

    this._updateToolButtons();
    this._updatePanel();
    this._redrawEditor();

    console.log('🆕 Nuevo proyecto');
  }
}
