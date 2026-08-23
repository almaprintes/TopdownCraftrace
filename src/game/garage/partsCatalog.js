const CRAFT_BASE = `${import.meta.env.BASE_URL || './'}assets/crafting/materials/`;
const MATERIAL_ASSET = file => `${CRAFT_BASE}${file}?v=20260812-2`;

export const GARAGE_ITEMS = {
  scrap:{id:'scrap',name:'Chatarra',kind:'material',rarity:'common',icon:'🔩',tone:0x77818f,asset:MATERIAL_ASSET('chatarra.webp')},
  alloy:{id:'alloy',name:'Aleación',kind:'material',rarity:'uncommon',icon:'⬡',tone:0x9fb6c8,asset:MATERIAL_ASSET('aleacion.webp')},
  rubber:{id:'rubber',name:'Goma',kind:'material',rarity:'uncommon',icon:'◉',tone:0x30343a,asset:MATERIAL_ASSET('goma.webp')},
  disc:{id:'disc',name:'Disco metálico',kind:'material',rarity:'uncommon',icon:'◎',tone:0xb8c2cc,asset:MATERIAL_ASSET('disco_metalico.webp')},
  spring:{id:'spring',name:'Muelle',kind:'material',rarity:'uncommon',icon:'〰',tone:0x73d3ff,asset:MATERIAL_ASSET('muelle.webp')},
  gear:{id:'gear',name:'Engranaje',kind:'material',rarity:'uncommon',icon:'⚙',tone:0xd7bf74,asset:MATERIAL_ASSET('engranaje.webp')},
  compound:{id:'compound',name:'Compuesto',kind:'material',rarity:'rare',icon:'◆',tone:0xf3a63b,asset:MATERIAL_ASSET('compuesto.webp')},
  ecu:{id:'ecu',name:'Electrónica',kind:'material',rarity:'epic',icon:'▣',tone:0x59e0aa,asset:MATERIAL_ASSET('electronica.webp')},
  brake_pad:{id:'brake_pad',name:'Pastilla deportiva',kind:'component',icon:'▰',tone:0xff8c61}, engine_block:{id:'engine_block',name:'Bloque preparado',kind:'component',icon:'▤',tone:0x8ea6bf},
};
const families={brakes:['Frenos','◉'],tires:['Neumático','⬤'],suspension:['Suspensión','↕'],transmission:['Caja','⚙'],engine:['Motor','▦']};
const tierNames=['street','sport','racing','prototype'],tones=[0x66c6ff,0x4ee1a0,0xbf7cff,0xffc64d];
for(const [family,[name,icon]] of Object.entries(families)) tierNames.forEach((tier,i)=>{GARAGE_ITEMS[`${family}_${tier}`]={id:`${family}_${tier}`,name:`${name} ${tier[0].toUpperCase()+tier.slice(1)}`,kind:'part',family,tier:i+1,icon,tone:tones[i]};});
GARAGE_ITEMS.tires_racing.name='Semi-Slick Racing'; GARAGE_ITEMS.tires_prototype.name='Slick Prototype'; GARAGE_ITEMS.suspension_racing.name='Coilover Racing'; GARAGE_ITEMS.suspension_prototype.name='Suspensión Active Prototype'; GARAGE_ITEMS.transmission_prototype.name='Sequential Prototype';

// Economy 2.0. Every family in a tier has the same mathematical effort.
// Street remains deliberately accessible. Higher tiers are calibrated around a long-term progression target:
// an advanced player who doubles every race reward with a rewarded ad should still need about 50 active hours
// to complete all five Prototype parts of one car (simulation target ~510 full five-lap reward sessions).
const R=(...pairs)=>pairs.map(([id,qty])=>({id,qty}));
const SECONDARY={engine:'alloy',brakes:'disc',tires:'rubber',suspension:'spring',transmission:'gear'};
const PREV={sport:'street',racing:'sport',prototype:'racing'};
const TIER_COST={
  street:{scrap:8,secondary:2},
  sport:{scrap:185,secondary:160,compound:20},
  racing:{scrap:820,secondary:720,compound:86,ecu:29},
  prototype:{scrap:2400,secondary:2100,compound:250,ecu:84}
};
export const DIRECT_CRAFT_RECIPES={};
for(const family of Object.keys(SECONDARY)){
  for(const tier of tierNames){
    const req=[];
    if(PREV[tier])req.push([`${family}_${PREV[tier]}`,1]);
    const c=TIER_COST[tier];
    req.push(['scrap',c.scrap],[SECONDARY[family],c.secondary]);
    if(c.compound)req.push(['compound',c.compound]);
    if(c.ecu)req.push(['ecu',c.ecu]);
    DIRECT_CRAFT_RECIPES[`${family}_${tier}`]={requires:R(...req)};
  }
}

export const GARAGE_RECIPES=[{a:'disc',b:'compound',out:'brake_pad'},{a:'brake_pad',b:'disc',out:'brakes_street'},{a:'rubber',b:'compound',out:'tires_street'},{a:'spring',b:'alloy',out:'suspension_street'},{a:'gear',b:'alloy',out:'transmission_street'},{a:'scrap',b:'alloy',out:'engine_block'},{a:'engine_block',b:'ecu',out:'engine_street'}];
export const CRAFT_STRIP_RECIPES=[{in:['rubber','compound','alloy'],out:'tires_street'},{in:['disc','compound','alloy'],out:'brakes_street'},{in:['spring','alloy','scrap'],out:'suspension_street'},{in:['gear','alloy','scrap'],out:'transmission_street'},{in:['scrap','alloy','ecu'],out:'engine_street'}];
export const EVOLUTION_CHAIN={brakes_street:'brakes_sport',brakes_sport:'brakes_racing',brakes_racing:'brakes_prototype',tires_street:'tires_sport',tires_sport:'tires_racing',tires_racing:'tires_prototype',suspension_street:'suspension_sport',suspension_sport:'suspension_racing',suspension_racing:'suspension_prototype',transmission_street:'transmission_sport',transmission_sport:'transmission_racing',transmission_racing:'transmission_prototype',engine_street:'engine_sport',engine_sport:'engine_racing',engine_racing:'engine_prototype'};
export const EVOLUTION_COST=10;
export function findRecipe(a,b){return GARAGE_RECIPES.find(r=>(r.a===a&&r.b===b)||(r.a===b&&r.b===a))||null;}
const sorted=ids=>[...ids].sort().join('|');
export function findStripRecipe(ids){if(!Array.isArray(ids)||ids.length!==3)return null;const key=sorted(ids);return CRAFT_STRIP_RECIPES.find(r=>sorted(r.in)===key)||null;}
export function stripRecipeCanAccept(selected,id){const want=[...(selected||[]),id];if(want.length>3)return false;return CRAFT_STRIP_RECIPES.some(r=>{const bag=[...r.in];for(const token of want){const i=bag.indexOf(token);if(i<0)return false;bag.splice(i,1);}return true;});}

// Display balance 2.0: Prototype parts must feel genuinely legendary.
// Stock display stats are rescaled separately to leave room for progression.
// Each T4 has a primary gain of at least +16 while the five-part package preserves car identity.
// All five T4 together add: +28 SPEED, +26 ACCEL, +25 GRIP, +37 CONTROL.
export function statDeltaForPart(item){
  if(!item||item.kind!=='part')return{speed:0,accel:0,grip:0,control:0};
  const t=Math.max(1,Math.min(4,item.tier||1));
  const byTier={
    engine:[null,{speed:5,accel:3,grip:0,control:0},{speed:10,accel:5,grip:0,control:0},{speed:15,accel:8,grip:0,control:0},{speed:20,accel:10,grip:0,control:0}],
    transmission:[null,{speed:2,accel:4,grip:0,control:0},{speed:4,accel:8,grip:0,control:0},{speed:6,accel:12,grip:0,control:0},{speed:8,accel:16,grip:0,control:0}],
    tires:[null,{speed:0,accel:0,grip:4,control:1},{speed:0,accel:0,grip:8,control:2},{speed:0,accel:0,grip:12,control:3},{speed:0,accel:0,grip:16,control:5}],
    suspension:[null,{speed:0,accel:0,grip:1,control:4},{speed:0,accel:0,grip:2,control:8},{speed:0,accel:0,grip:3,control:12},{speed:0,accel:0,grip:5,control:16}],
    brakes:[null,{speed:0,accel:0,grip:1,control:4},{speed:0,accel:0,grip:2,control:8},{speed:0,accel:0,grip:3,control:12},{speed:0,accel:0,grip:4,control:16}]
  };
  return byTier[item.family]?.[t]||{speed:0,accel:0,grip:0,control:0};
}

export function tuningForPart(item){if(!item||item.kind!=='part')return{};const tier=item.tier||1;const map={engine:{accelMult:1+[0,.03,.06,.10,.15][tier],maxFwdAdd:[0,8,18,32,50][tier]},brakes:{brakeMult:1+[0,.04,.08,.13,.19][tier],gripBrakeAdd:[0,.006,.012,.02,.03][tier]},tires:{gripDriveAdd:[0,.012,.025,.04,.06][tier],gripCoastAdd:[0,.010,.020,.034,.05][tier],gripBrakeAdd:[0,.006,.012,.02,.03][tier]},suspension:{turnRateMult:1+[0,.03,.06,.09,.13][tier],turnMinAdd:[0,-.006,-.012,-.02,-.03][tier]},transmission:{accelMult:1+[0,.02,.04,.07,.10][tier]}};return map[item.family]||{};}
