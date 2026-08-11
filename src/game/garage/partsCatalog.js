export const GARAGE_ITEMS = {
  scrap: { id:'scrap', name:'Chatarra', kind:'material', icon:'🔩', tone:0x77818f },
  alloy: { id:'alloy', name:'Aleación', kind:'material', icon:'⬡', tone:0x9fb6c8 },
  rubber: { id:'rubber', name:'Goma', kind:'material', icon:'◉', tone:0x30343a },
  compound: { id:'compound', name:'Compuesto', kind:'material', icon:'◆', tone:0xf3a63b },
  disc: { id:'disc', name:'Disco metálico', kind:'material', icon:'◎', tone:0xb8c2cc },
  spring: { id:'spring', name:'Muelle', kind:'material', icon:'〰', tone:0x73d3ff },
  gear: { id:'gear', name:'Engranaje', kind:'material', icon:'⚙', tone:0xd7bf74 },
  ecu: { id:'ecu', name:'Electrónica', kind:'material', icon:'▣', tone:0x59e0aa },

  brake_pad: { id:'brake_pad', name:'Pastilla deportiva', kind:'component', icon:'▰', tone:0xff8c61 },
  engine_block: { id:'engine_block', name:'Bloque preparado', kind:'component', icon:'▤', tone:0x8ea6bf },

  brakes_street: { id:'brakes_street', name:'Frenos Street', kind:'part', family:'brakes', tier:1, icon:'◉', tone:0x66c6ff },
  brakes_sport: { id:'brakes_sport', name:'Frenos Sport', kind:'part', family:'brakes', tier:2, icon:'◉', tone:0x4ee1a0 },
  brakes_racing: { id:'brakes_racing', name:'Frenos Racing', kind:'part', family:'brakes', tier:3, icon:'◉', tone:0xbf7cff },
  brakes_prototype: { id:'brakes_prototype', name:'Frenos Prototype', kind:'part', family:'brakes', tier:4, icon:'◉', tone:0xffc64d },

  tires_street: { id:'tires_street', name:'Neumático Street', kind:'part', family:'tires', tier:1, icon:'⬤', tone:0x66c6ff },
  tires_sport: { id:'tires_sport', name:'Neumático Sport', kind:'part', family:'tires', tier:2, icon:'⬤', tone:0x4ee1a0 },
  tires_racing: { id:'tires_racing', name:'Semi-Slick Racing', kind:'part', family:'tires', tier:3, icon:'⬤', tone:0xbf7cff },
  tires_prototype: { id:'tires_prototype', name:'Slick Prototype', kind:'part', family:'tires', tier:4, icon:'⬤', tone:0xffc64d },

  suspension_street: { id:'suspension_street', name:'Suspensión Street', kind:'part', family:'suspension', tier:1, icon:'↕', tone:0x66c6ff },
  suspension_sport: { id:'suspension_sport', name:'Suspensión Sport', kind:'part', family:'suspension', tier:2, icon:'↕', tone:0x4ee1a0 },
  suspension_racing: { id:'suspension_racing', name:'Coilover Racing', kind:'part', family:'suspension', tier:3, icon:'↕', tone:0xbf7cff },
  suspension_prototype: { id:'suspension_prototype', name:'Suspensión Active Prototype', kind:'part', family:'suspension', tier:4, icon:'↕', tone:0xffc64d },

  transmission_street: { id:'transmission_street', name:'Caja Street', kind:'part', family:'transmission', tier:1, icon:'⚙', tone:0x66c6ff },
  transmission_sport: { id:'transmission_sport', name:'Caja Sport', kind:'part', family:'transmission', tier:2, icon:'⚙', tone:0x4ee1a0 },
  transmission_racing: { id:'transmission_racing', name:'Caja Racing', kind:'part', family:'transmission', tier:3, icon:'⚙', tone:0xbf7cff },
  transmission_prototype: { id:'transmission_prototype', name:'Sequential Prototype', kind:'part', family:'transmission', tier:4, icon:'⚙', tone:0xffc64d },

  engine_street: { id:'engine_street', name:'Motor Street', kind:'part', family:'engine', tier:1, icon:'▦', tone:0x66c6ff },
  engine_sport: { id:'engine_sport', name:'Motor Sport', kind:'part', family:'engine', tier:2, icon:'▦', tone:0x4ee1a0 },
  engine_racing: { id:'engine_racing', name:'Motor Racing', kind:'part', family:'engine', tier:3, icon:'▦', tone:0xbf7cff },
  engine_prototype: { id:'engine_prototype', name:'Motor Prototype', kind:'part', family:'engine', tier:4, icon:'▦', tone:0xffc64d }
};

// Legacy two-item recipes are kept for save/backward compatibility.
export const GARAGE_RECIPES = [
  { a:'disc', b:'compound', out:'brake_pad' },
  { a:'brake_pad', b:'disc', out:'brakes_street' },
  { a:'rubber', b:'compound', out:'tires_street' },
  { a:'spring', b:'alloy', out:'suspension_street' },
  { a:'gear', b:'alloy', out:'transmission_street' },
  { a:'scrap', b:'alloy', out:'engine_block' },
  { a:'engine_block', b:'ecu', out:'engine_street' }
];

// CRAFT STRIP: always three large slots. Recipes are order-independent.
export const CRAFT_STRIP_RECIPES = [
  { in:['rubber','compound','alloy'], out:'tires_street' },
  { in:['disc','compound','alloy'], out:'brakes_street' },
  { in:['spring','alloy','scrap'], out:'suspension_street' },
  { in:['gear','alloy','scrap'], out:'transmission_street' },
  { in:['scrap','alloy','ecu'], out:'engine_street' },

  { in:['tires_street','rubber','compound'], out:'tires_sport' },
  { in:['tires_sport','rubber','alloy'], out:'tires_racing' },
  { in:['tires_racing','compound','ecu'], out:'tires_prototype' },

  { in:['brakes_street','disc','compound'], out:'brakes_sport' },
  { in:['brakes_sport','disc','alloy'], out:'brakes_racing' },
  { in:['brakes_racing','compound','ecu'], out:'brakes_prototype' },

  { in:['suspension_street','spring','alloy'], out:'suspension_sport' },
  { in:['suspension_sport','spring','scrap'], out:'suspension_racing' },
  { in:['suspension_racing','alloy','ecu'], out:'suspension_prototype' },

  { in:['transmission_street','gear','alloy'], out:'transmission_sport' },
  { in:['transmission_sport','gear','scrap'], out:'transmission_racing' },
  { in:['transmission_racing','alloy','ecu'], out:'transmission_prototype' },

  { in:['engine_street','scrap','ecu'], out:'engine_sport' },
  { in:['engine_sport','alloy','ecu'], out:'engine_racing' },
  { in:['engine_racing','compound','ecu'], out:'engine_prototype' }
];

export const EVOLUTION_CHAIN = {
  brakes_street:'brakes_sport', brakes_sport:'brakes_racing', brakes_racing:'brakes_prototype',
  tires_street:'tires_sport', tires_sport:'tires_racing', tires_racing:'tires_prototype',
  suspension_street:'suspension_sport', suspension_sport:'suspension_racing', suspension_racing:'suspension_prototype',
  transmission_street:'transmission_sport', transmission_sport:'transmission_racing', transmission_racing:'transmission_prototype',
  engine_street:'engine_sport', engine_sport:'engine_racing', engine_racing:'engine_prototype'
};

export const EVOLUTION_COST = 10;

export function findRecipe(a,b){
  return GARAGE_RECIPES.find(r => (r.a===a && r.b===b) || (r.a===b && r.b===a)) || null;
}

const sorted = ids => [...ids].sort().join('|');
export function findStripRecipe(ids){
  if(!Array.isArray(ids) || ids.length !== 3) return null;
  const key=sorted(ids);
  return CRAFT_STRIP_RECIPES.find(r=>sorted(r.in)===key) || null;
}

export function stripRecipeCanAccept(selected,id){
  const want=[...(selected||[]),id];
  if(want.length>3) return false;
  return CRAFT_STRIP_RECIPES.some(r=>{
    const bag=[...r.in];
    for(const token of want){
      const i=bag.indexOf(token);
      if(i<0) return false;
      bag.splice(i,1);
    }
    return true;
  });
}

export function statDeltaForPart(item){
  if(!item || item.kind!=='part') return { speed:0, accel:0, grip:0, control:0 };
  const t=Math.max(1,Math.min(4,item.tier||1));
  const byTier={
    engine:[null,{speed:3,accel:4,grip:0,control:0},{speed:6,accel:8,grip:0,control:0},{speed:10,accel:13,grip:0,control:0},{speed:15,accel:19,grip:0,control:0}],
    brakes:[null,{speed:0,accel:0,grip:1,control:3},{speed:0,accel:0,grip:2,control:6},{speed:0,accel:0,grip:4,control:10},{speed:0,accel:0,grip:6,control:14}],
    tires:[null,{speed:0,accel:0,grip:4,control:2},{speed:0,accel:0,grip:8,control:4},{speed:0,accel:0,grip:13,control:7},{speed:0,accel:0,grip:19,control:10}],
    suspension:[null,{speed:0,accel:0,grip:2,control:4},{speed:0,accel:0,grip:4,control:8},{speed:0,accel:0,grip:6,control:12},{speed:0,accel:0,grip:9,control:17}],
    transmission:[null,{speed:1,accel:2,grip:0,control:0},{speed:2,accel:4,grip:0,control:0},{speed:4,accel:7,grip:0,control:0},{speed:6,accel:10,grip:0,control:0}]
  };
  return byTier[item.family]?.[t] || { speed:0, accel:0, grip:0, control:0 };
}

export function tuningForPart(item){
  if (!item || item.kind !== 'part') return {};
  const tier = item.tier || 1;
  const map = {
    engine: { accelMult: 1 + [0,.03,.06,.10,.15][tier], maxFwdAdd: [0,8,18,32,50][tier] },
    brakes: { brakeMult: 1 + [0,.04,.08,.13,.19][tier], gripBrakeAdd:[0,.006,.012,.02,.03][tier] },
    tires: { gripDriveAdd:[0,.012,.025,.04,.06][tier], gripCoastAdd:[0,.010,.020,.034,.05][tier], gripBrakeAdd:[0,.006,.012,.02,.03][tier] },
    suspension: { turnRateMult:1+[0,.03,.06,.09,.13][tier], turnMinAdd:[0,-.006,-.012,-.02,-.03][tier] },
    transmission: { accelMult:1+[0,.02,.04,.07,.10][tier] }
  };
  return map[item.family] || {};
}
