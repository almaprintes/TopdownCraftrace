import{P as I,C as D,ad as M,r as A,a as $}from"./index-B8qF8G5c.js";function E(P,i,e){return Math.max(i,Math.min(e,P))}let F=class extends I.Scene{constructor(){super("car-editor"),this._carId="stock",this._factory=null,this._saved=null,this._base=null,this._override=null,this._tipTimer=null,this._techOverlayText=null}init(i){this._carId=i?.carId||"stock"}create(){const{width:i,height:e}=this.scale,t=this.add.graphics();t.fillStyle(462887,1),t.fillRect(0,0,i,e),t.fillStyle(8146431,.14),t.fillEllipse(i*.2,e*.22,i*.75,e*.65),t.fillStyle(54527,.1),t.fillEllipse(i*.7,e*.3,i*.9,e*.7),t.fillStyle(16761856,.07),t.fillEllipse(i*.55,e*.12,i*.7,e*.45),t.fillStyle(2883464,.08),t.fillEllipse(i*.55,e*.7,i*.85,e*.7),t.fillStyle(1317683,.18),t.fillRect(0,0,i,e),t.lineStyle(1,16777215,.02);const r=56;for(let o=0;o<=i;o+=r)t.lineBetween(o,0,o,e);for(let o=0;o<=e;o+=r)t.lineBetween(0,o,i,o);this._factory=D[this._carId]||D.stock,this._saved=this._readOverride(this._carId),this._base={...this._factory,...this._saved},this._override=this._readDraft(this._carId),this.add.text(i/2,18,`EDITOR · ${this._base.name||this._carId}`,{fontFamily:"Orbitron, system-ui",fontSize:"22px",fontStyle:"900",color:"#ffffff",stroke:"#0a2a6a",strokeThickness:7}).setOrigin(.5,0),this.add.text(i-16,22,"ADMIN",{fontFamily:"system-ui",fontSize:"14px",color:"#ffffff",stroke:"#0a2a6a",strokeThickness:4}).setOrigin(1,0),this.add.text(16,18,"⬅",{fontFamily:"system-ui",fontSize:"26px",color:"#fff",stroke:"#0a2a6a",strokeThickness:6}).setOrigin(0,0).setInteractive({useHandCursor:!0}).on("pointerdown",()=>{this._override={},this._writeDraft(this._carId,this._override),this._destroyDomPanel(),this.scene.start("GarageScene",{mode:"admin"})}),this._createDomPanel(),this._createTechOverlay(),this._refreshTechOverlay();const s=e-92,a=120,c=this._button(i/2-150,s,a,54,"GUARDAR",()=>{const o={...this._base||{},...this._override||{}},m=this._factory||{},v={};for(const y of Object.keys(m))typeof m[y]=="number"&&typeof o[y]=="number"&&o[y]!==m[y]&&(v[y]=o[y]);const S=m.handlingProfile||m.steeringProfile||"ARCADE",w=o.handlingProfile||o.steeringProfile||S;w!==S&&(v.handlingProfile=w),this._writeOverride(this._carId,v),this._override={},this._writeDraft(this._carId,this._override),this._saved=v,this._base={...this._factory,...v},this._toast("Guardado ✓"),this._refreshDomValues(!0)}),_=this._button(i/2-10,s,a,54,"EXPORT",()=>{try{const o=this._buildExportPayload();this._downloadJson("car-overrides.json",o),this._toast("Export ✓")}catch{this._toast("Export falló")}}),x=this._button(i/2+130,s,a,54,"TEST",()=>{this._writeDraft(this._carId,this._override);const o={...this._base||{},...this._override||{}};this._destroyDomPanel(),this.scene.start("race",{carId:this._carId,testMode:!0,factorySpec:o,useFactorySpec:!0,returnTo:"car-editor"})});this.add.existing(c),this.add.existing(_),this.add.existing(x),this.events.once(I.Scenes.Events.SHUTDOWN,()=>this._destroyDomPanel()),this.events.once(I.Scenes.Events.DESTROY,()=>this._destroyDomPanel())}_lsKey(i){return`tdr2:carSpecs:${i}`}_draftKey(i){return`tdr2:carDraft:${i}`}_sanitizeOverride(i){const e=this._factory||this._base||{},t={};for(const r of Object.keys(e)){if(typeof e[r]!="number")continue;const n=i?.[r],s=Number(n);if(Number.isFinite(s)){if(r==="visualScale"){const a=Math.max(.5,Math.min(2.5,s));t[r]=Math.round(a*10)/10;continue}if(r==="linearDrag"){const a=Math.max(0,Math.min(1,s));t[r]=Math.round(a*1e3)/1e3;continue}if(r.startsWith("grip")){const a=Math.max(0,Math.min(2,s));t[r]=Math.round(a*100)/100;continue}if(r==="dragMult"){const a=Math.max(.1,Math.min(5,s));t[r]=Math.round(a*100)/100;continue}t[r]=Math.abs(s)<1?Math.round(s*1e3)/1e3:Math.round(s*100)/100}}if(typeof i?.handlingProfile=="string"){const r=i.handlingProfile.trim();r&&M[r]&&(t.handlingProfile=r)}return t}_readOverride(i){try{const e=localStorage.getItem(this._lsKey(i));if(!e)return{};const t=JSON.parse(e);return!t||typeof t!="object"?{}:this._sanitizeOverride(t)}catch{return{}}}_writeOverride(i,e){try{const t=this._sanitizeOverride(e||{});localStorage.setItem(this._lsKey(i),JSON.stringify(t))}catch{}}_readDraft(i){try{const e=localStorage.getItem(this._draftKey(i));if(!e)return{};const t=JSON.parse(e);return t&&typeof t=="object"?t:{}}catch{return{}}}_writeDraft(i,e){try{if(!(e&&typeof e=="object"?Object.keys(e):[]).length){localStorage.removeItem(this._draftKey(i));return}localStorage.setItem(this._draftKey(i),JSON.stringify(e||{}))}catch{}}_collectEditableNumberKeys(){const i=this._base||{},e=Object.keys(i).filter(s=>typeof i[s]=="number"),t=new Set(["collectionNo"]),r=e.filter(s=>!t.has(s)),n=["visualScale","dragMult","linearDrag","accel","brakeForce","turnRate","maxFwd","maxRev"];return r.sort((s,a)=>{const c=n.indexOf(s),_=n.indexOf(a);return c===-1&&_===-1?s.localeCompare(a):c===-1?1:_===-1?-1:c-_}),r}_createDomPanel(){const{width:i,height:e}=this.scale,t=72,r=120,n=Math.min(560,i-24),s=Math.max(220,e-t-r),a=this._collectEditableNumberKeys(),c={visualScale:"Tamaño general del coche en pista.",maxFwd:"Velocidad máxima hacia delante.",maxRev:"Velocidad máxima marcha atrás.",accel:"Qué rápido acelera.",brakeForce:"Fuerza de frenado.",engineBrake:"Retención al soltar acelerador.",linearDrag:"Resistencia general al movimiento.",dragMult:"Multiplicador extra de resistencia.",turnRate:"Velocidad de giro.",turnMin:"Giro mínimo a alta velocidad.",gripDrive:"Agarre lateral acelerando.",gripCoast:"Agarre lateral sin acelerar.",gripBrake:"Agarre lateral frenando."},_=a.map(l=>{const h=this._base[l],d=this._override?.[l]??h,p=d-h,b=Math.abs(p)<1e-9?"0":p>0?`+${p}`:`${p}`;let f;return l==="visualScale"?f=.1:l==="linearDrag"?f=.001:l==="dragMult"?f=.05:l.startsWith("grip")||Math.abs(h)<1?f=.01:f=1,`
        <div class="row" data-key="${l}">
          <div class="left">
            <div class="k">
              <span class="kname">${l}</span>
              <button class="infoBtn" type="button" data-act="help" data-key="${l}" aria-label="ayuda">?</button>
            </div>
            <div class="meta">
              <span class="b">base: <b>${h}</b></span>
              <span class="d">Δ: <b>${b}</b></span>
            </div>
          </div>
          <div class="right">
            <button class="btn" data-act="dec" aria-label="decrement">−</button>
            <input class="inp" inputmode="decimal" value="${d}" data-step="${f}" />
            <button class="btn" data-act="inc" aria-label="increment">+</button>
          </div>
        </div>
      `}).join(""),x=`
      <div class="panel">
        <div class="bar">
          <input class="search" placeholder="Buscar parámetro…" />

          <select class="selProfile" aria-label="perfil de dirección">
            ${Object.keys(M).map(l=>`<option value="${l}">${l}</option>`).join("")}
          </select>

          <button class="mini" data-act="resetAll">RESET</button>
          <button class="mini" data-act="factory">FÁBRICA</button>
          <button class="mini" data-act="clear">CLEAR</button>
        </div>
        <div class="list">
          ${_}
        </div>
        <div class="tip" style="display:none;"></div>
      </div>
    `;this._dom=this.add.dom(12,t).createFromHTML(x),this._dom.setDepth(999999),this._dom.setOrigin(0,0),this._dom.x=12,this._dom.y=t;const o=this._dom.node;o.style.width=`${n}px`,o.style.height=`${s}px`;const m=document.createElement("style");m.textContent=`
      .panel{
        width:100%;
        height:100%;
        box-sizing:border-box;
        padding-top:6px;
        background:rgba(20,27,51,0.78);
        border:1px solid rgba(183,192,255,0.18);
        border-radius:14px;
        box-shadow:0 10px 40px rgba(0,0,0,0.35);
        overflow:hidden;
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
        color:#fff;
        -webkit-user-select:none;
        user-select:none;
        position:relative;
      }
      .bar{
        display:flex;
        gap:10px;
        padding:10px;
        background:rgba(11,16,32,0.55);
        border-bottom:1px solid rgba(183,192,255,0.14);
        align-items:center;
      }
      .search{
        flex:1;
        height:34px;
        border-radius:10px;
        border:1px solid rgba(183,192,255,0.18);
        background:rgba(7,16,39,0.65);
        color:#fff;
        padding:0 10px;
        outline:none;
      }
        .selProfile{
        height:34px;
        border-radius:10px;
        border:1px solid rgba(183,192,255,0.18);
        background:rgba(7,16,39,0.65);
        color:#fff;
        padding:0 10px;
        outline:none;
        font-weight:900;
        max-width: 170px;
      }
      .mini{
        height:34px;
        border-radius:10px;
        border:1px solid rgba(43,255,136,0.35);
        background:rgba(20,27,51,0.85);
        color:#fff;
        font-weight:800;
        padding:0 10px;
      }
      .list{
        height:calc(100% - 56px);
        overflow:auto;
        padding:10px;
        -webkit-overflow-scrolling:touch;
      }
      .row{
        display:flex;
        justify-content:space-between;
        gap:10px;
        padding:10px;
        border-radius:12px;
        border:1px solid rgba(183,192,255,0.10);
        background:rgba(7,16,39,0.35);
        margin-bottom:10px;
        align-items:center;
      }
      .k{display:flex; align-items:center; gap:10px;}
      .kname{font-weight:900; font-size:14px;}
      .meta{display:flex; gap:10px; font-size:12px; opacity:0.9;}
      .right{display:flex; gap:8px; align-items:center;}
      .btn{
        width:34px;
        height:34px;
        border-radius:10px;
        border:1px solid rgba(43,255,136,0.35);
        background:rgba(20,27,51,0.85);
        color:#fff;
        font-weight:900;
        font-size:18px;
        line-height:0;
      }
      .inp{
        width:92px;
        height:34px;
        border-radius:10px;
        border:1px solid rgba(183,192,255,0.18);
        background:rgba(7,16,39,0.65);
        color:#fff;
        padding:0 10px;
        outline:none;
        text-align:right;
        font-weight:800;
        -webkit-user-select:text;
        user-select:text;
        font-size:16px; /* iOS: evita zoom al enfocar */
      }
      /* iOS: evitar zoom por doble-tap dentro del panel */
      .panel, .panel *{
        touch-action: manipulation;
        -webkit-text-size-adjust: 100%;
      }
      .btn, .mini, .infoBtn{
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .infoBtn{
        width:28px;
        height:28px;
        border-radius:10px;
        border:1px solid rgba(183,192,255,0.25);
        background:rgba(7,16,39,0.55);
        color:#fff;
        font-weight:900;
        font-size:14px;
        line-height:28px;
        padding:0;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
      }
      .infoBtn:active{ transform: scale(0.96); }
      .tip{
        position:absolute;
        left:12px;
        right:12px;
        bottom:12px;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(11,16,32,0.92);
        border:1px solid rgba(43,255,136,0.30);
        box-shadow:0 10px 30px rgba(0,0,0,0.45);
        color:#fff;
        font-size:13px;
        font-weight:800;
        z-index:9999;
      }
    `,o.prepend(m);const v=()=>{const l={...this._base||{},...this._override||{}};return l.handlingProfile||l.steeringProfile||"ARCADE"},S=o.querySelector(".selProfile");S&&(S.value=v());const w=l=>{const h=o.querySelector(".tip");h&&(h.textContent=l||"",h.style.display=l?"block":"none",clearTimeout(this._tipTimer),this._tipTimer=setTimeout(()=>{try{h.style.display="none"}catch{}},1400))};o.addEventListener("click",l=>{const h=l.target,d=h?.dataset?.act;if(!d)return;if(d==="help"){const g=h.dataset.key,O=c&&g&&c[g]?c[g]:"Sin descripción.";w(O);return}if(d==="resetAll"){this._override={},this._writeDraft(this._carId,this._override),this._refreshDomValues(!0),this._toast("Draft reseteado");const g=o.querySelector(".selProfile");g&&(g.value=this._base.handlingProfile||this._base.steeringProfile||"ARCADE");return}if(d==="factory"){try{localStorage.removeItem(this._lsKey(this._carId))}catch{}this._override={},this._writeDraft(this._carId,this._override),this._saved={},this._base={...this._factory||{}},this._refreshDomValues(!0),this._toast("Datos de fábrica ✓");const g=o.querySelector(".selProfile");g&&(g.value=this._base.handlingProfile||this._base.steeringProfile||"ARCADE");return}if(d==="clear"){this._override={},this._writeDraft(this._carId,this._override),this._destroyDomPanel(),this.scene.start("GarageScene",{mode:"admin"});return}const p=h.closest?.(".row");if(!p)return;const b=p.getAttribute("data-key"),f=p.querySelector(".inp");if(!f)return;const k=Number(f.getAttribute("data-step")||"1")||1,R=this._base[b];let T=String(f.value??"").trim();T=T.replace(",",".");let u=Number(T);if(Number.isFinite(u)||(u=this._override?.[b]??R),d==="inc"&&(u+=k),d==="dec"&&(u-=k),k<1){const g=(String(k).split(".")[1]||"").length||1,O=Math.pow(10,g);u=Math.round(u*O)/O}else u=Math.round(u);b==="visualScale"&&(u=E(u,.5,2.5)),f.value=String(u),this._override[b]=u,this._writeDraft(this._carId,this._override),this._refreshRow(p,b)}),o.addEventListener("input",l=>{const h=l.target;if(!h.classList?.contains("inp"))return;const d=h.closest(".row");if(!d)return;const p=d.getAttribute("data-key");this._base[p];let b=String(h.value??"").trim();b=b.replace(",",".");let f=Number(b);Number.isFinite(f)&&(p==="visualScale"&&(f=E(f,.5,2.5),f=Math.round(f*10)/10),this._override[p]=f,this._writeDraft(this._carId,this._override),this._refreshRow(d,p))}),o.addEventListener("change",l=>{const h=l.target;if(!h?.classList?.contains("selProfile"))return;const d=String(h.value||"").trim();d&&M[d]&&(this._override.handlingProfile=d,this._writeDraft(this._carId,this._override),this._refreshTechOverlay(),this._toast(`Perfil: ${d}`))});const y=o.querySelector(".search");y.addEventListener("input",()=>{const l=(y.value||"").trim().toLowerCase();o.querySelectorAll(".row").forEach(d=>{const p=(d.getAttribute("data-key")||"").toLowerCase();d.style.display=!l||p.includes(l)?"":"none"})})}_refreshRow(i,e){const t=this._base[e],n=(this._override?.[e]??t)-t,s=Math.abs(n)<1e-9?"0":n>0?`+${n}`:`${n}`,a=i.querySelector(".b b"),c=i.querySelector(".d b");a&&(a.textContent=String(t)),c&&(c.textContent=String(s)),this._refreshTechOverlay()}_refreshDomValues(i=!1){if(!this._dom?.node)return;this._dom.node.querySelectorAll(".row").forEach(t=>{const r=t.getAttribute("data-key"),n=this._base[r],s=this._override?.[r]??n,a=t.querySelector(".inp");a&&(i||document.activeElement!==a)&&(a.value=String(s)),this._refreshRow(t,r)}),this._refreshTechOverlay()}_button(i,e,t,r,n,s){const a=this.add.container(i,e),c=this.add.rectangle(0,0,t,r,1317683,.9).setOrigin(0);c.setStrokeStyle(2,2883464,.55);const _=this.add.text(t/2,r/2,n,{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Arial",fontSize:"14px",color:"#ffffff",fontStyle:"bold"}).setOrigin(.5),x=this.add.rectangle(0,0,t,r,0,.001).setOrigin(0).setInteractive({useHandCursor:!0});return x.on("pointerdown",()=>{a.setScale(.98)}),x.on("pointerup",()=>{a.setScale(1),s&&s()}),x.on("pointerout",()=>{a.setScale(1)}),a.add([c,_,x]),a}_toast(i){const{width:e,height:t}=this.scale,r=this.add.text(e/2,t-40,i,{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Arial",fontSize:"14px",color:"#2bff88",fontStyle:"bold",backgroundColor:"rgba(11,16,32,0.85)",padding:{left:12,right:12,top:6,bottom:6}}).setOrigin(.5).setAlpha(0).setDepth(999999);this.tweens.add({targets:r,alpha:1,duration:120,yoyo:!0,hold:900,onComplete:()=>r.destroy()})}_createTechOverlay(){if(this._techOverlayText){try{this._techOverlayText.destroy()}catch{}this._techOverlayText=null}const{width:i}=this.scale,e=i-16,t=52;this._techOverlayText=this.add.text(e,t,"",{fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, Arial",fontSize:"12px",color:"#ffffff",backgroundColor:"rgba(11,16,32,0.70)",padding:{left:10,right:10,top:8,bottom:8},lineSpacing:2}).setOrigin(1,0).setDepth(99999)}_refreshTechOverlay(){if(!this._techOverlayText)return;const i=.1,e={...this._base||{},...this._override||{}},t=(n,s=2)=>Number.isFinite(n)?Number(n).toFixed(s):"—",r=["DATOS TÉCNICOS",`profile: ${e.handlingProfile||e.steeringProfile||"ARCADE"}`,`maxFwd: ${t(e.maxFwd,1)} px/s  ·  ${t(e.maxFwd*i,0)} km/h`,`accel: ${t(e.accel,2)}`,`brakeForce: ${t(e.brakeForce,2)}`,`turnRate: ${t(e.turnRate,2)}`,`turnMin: ${t(e.turnMin,2)}`,`gripDrive: ${t(e.gripDrive,2)}`,`gripCoast: ${t(e.gripCoast,2)}`,`gripBrake: ${t(e.gripBrake,2)}`,`linearDrag: ${t(e.linearDrag,3)}`,`dragMult: ${t(e.dragMult,2)}`];this._techOverlayText.setText(r.join(`
`))}_buildExportPayload(){const i=new Date().toISOString(),e={},t=Object.keys(D||{}).filter(Boolean);for(const r of t){const n=D[r];if(!n||typeof n!="object")continue;if(r===this._carId){const a={...this._base||{},...this._override||{}},c=this._diffNumericVsFactory(n,a);Object.keys(c).length&&(e[r]=c);continue}const s=this._readOverride(r);s&&typeof s=="object"&&Object.keys(s).length&&(e[r]=s)}return{schema_version:1,updated_at:i,cars:e}}_diffNumericVsFactory(i,e){const t={};for(const c of Object.keys(i))typeof i[c]=="number"&&typeof e?.[c]=="number"&&e[c]!==i[c]&&(t[c]=e[c]);const r=i.handlingProfile||i.steeringProfile||"ARCADE",n=e?.handlingProfile||e?.steeringProfile||r;n!==r&&(t.handlingProfile=n);const s=this._factory;this._factory=i;const a=this._sanitizeOverride(t);return this._factory=s,a}_downloadJson(i,e){const t=JSON.stringify(e,null,2),r=new Blob([t],{type:"application/json;charset=utf-8"}),n=URL.createObjectURL(r),s=document.createElement("a");s.href=n,s.download=i,s.rel="noopener",s.click(),setTimeout(()=>URL.revokeObjectURL(n),2500)}_destroyDomPanel(){try{this._dom?.node&&this._dom.node.remove()}catch{}try{this._dom?.destroy&&this._dom.destroy()}catch{}try{this._techOverlayText?.destroy?.()}catch{}this._techOverlayText=null,this._dom=null}};class j extends F{_refreshTechOverlay(){super._refreshTechOverlay();const i=this._techOverlayText;if(!i?.setText||typeof i.text!="string")return;const e={...this._base||{},...this._override||{}},t=A(e),r=Math.round($(t));i.setText(i.text.replace(/maxFwd:[^\n]*/i,`maxFwd: ${Number(e.maxFwd||0).toFixed(1)} px/s · punta real ${r} km/h`))}}export{j as CarEditorScene};
