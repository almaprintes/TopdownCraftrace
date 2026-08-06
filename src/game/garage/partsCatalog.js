export const GARAGE_ITEMS = {
  scrap: { id:'scrap', name:'Chatarra', kind:'material', icon:'🔩', tone:0x77818f },
  alloy: { id:'alloy', name:'Aleación', kind:'material', icon:'⬡', tone:0x9fb6c8 },
  rubber: { id:'rubber', name:'Goma', kind:'material', icon:'◉', tone:0x30343a },
  compound: { id:'compound', name:'Compuesto', kind:'material', icon:'◆', tone:0xf3a63b },
  disc: { id:'disc', name:'Disco metálico', kind:'material', icon:'◎', tone:0xb8c2cc },
  spring: { id:'spring', name:'Muelle', kind:'material', icon:'〰', tone:0x73d3ff },
  gear: { id:'gear', name:'Engranaje', kind:'material', icon:'⚙', tone:0xd7bf74 },
  ecu: { id:'ecu', name:'Módulo electrónico', kind:'material', icon:'▣', tone:0x59e0aa },

  brake_pad: { id:'brake_pad', name:'Pastilla deportiva', kind:'component', icon:'▰', tone:0xff8c61 },
  engine_block: { id:'engine_block', name:'Bloque preparado', kind:'component', icon:'▤', tone:0x8ea6bf },

  brakes_street: { id:'brakes_street', name:'Frenos de calle', kind:'part', family:'brakes', tier:1, icon:'◉', tone:0x66c6ff },
  brakes_sport: { id:'brakes_sport', name:'Frenos Sport', kind:'part', family:'brakes', tier:2, icon:'◉', tone:0x4ee1a0 },
  brakes_racing: { id:'brakes_racing', name:'Frenos Racing', kind:'part', family:'brakes', tier:3, icon:'◉', tone:0xbf7cff },
  brakes_prototype: { id:'brakes_prototype', name:'Frenos Prototype', kind:'part', family:'brakes', tier:4, icon:'◉', tone:0xffc64d },

  tires_street: { id:'tires_street', name:'Neumático de calle', kind:'part', family:'tires', tier:1, icon:'⬤', tone:0x66c6ff },
  tires_sport: { id:'tires_sport', name:'Neumático Sport', kind:'part', family:'tires', tier:2, icon:'⬤', tone:0x4ee1a0 },
  tires_racing: { id:'tires_racing', name:'Semi-Slick Racing', kind:'part', family:'tires', tier:3, icon:'⬤', tone:0xbf7cff },
  tires_prototype: { id:'tires_prototype', name:'Slick Prototype', kind:'part', family:'tires', tier:4, icon:'⬤', tone:0xffc64d },

  suspension_street: { id:'suspension_street', name:'Suspensión reforzada', kind:'part', family:'suspension', tier:1, icon:'↕', tone:0x66c6ff },
  suspension_sport: { id:'suspension_sport', name:'Suspensión Sport', kind:'part', family:'suspension', tier:2, icon:'↕', tone:0x4ee1a0 },
  suspension_racing: { id:'suspension_racing', name:'Coilover Racing', kind:'part', family:'suspension', tier:3, icon:'↕', tone:0xbf7cff },
  suspension_prototype: { id:'suspension_prototype', name:'Suspensión Active Prototype', kind:'part', family:'suspension', tier:4, icon:'↕', tone:0xffc64d },

  transmission_street: { id:'transmission_street', name:'Caja reforzada', kind:'part', family:'transmission', tier:1, icon:'⚙', tone:0x66c6ff },
  transmission_sport: { id:'transmission_sport', name:'Caja Sport', kind:'part', family:'transmission', tier:2, icon:'⚙', tone:0x4ee1a0 },
  transmission_racing: { id:'transmission_racing', name:'Caja Racing', kind:'part', family:'transmission', tier:3, icon:'⚙', tone:0xbf7cff },
  transmission_prototype: { id:'transmission_prototype', name:'Sequential Prototype', kind:'part', family:'transmission', tier:4, icon:'⚙', tone:0xffc64d },

  engine_street: { id:'engine_street', name:'Motor preparado', kind:'part', family:'engine', tier:1, icon:'▦', tone:0x66c6ff },
  engine_sport: { id:'engine_sport', name:'Motor Sport', kind:'part', family:'engine', tier:2, icon:'▦', tone:0x4ee1a0 },
  engine_racing: { id:'engine_racing', name:'Motor Racing', kind:'part', family:'engine', tier:3, icon:'▦', tone:0xbf7cff },
  engine_prototype: { id:'engine_prototype', name:'Motor Prototype', kind:'part', family:'engine', tier:4, icon:'▦', tone:0xffc64d }
};

export const GARAGE_RECIPES = [
  { a:'disc', b:'compound', out:'brake_pad' },
  { a:'brake_pad', b:'disc', out:'brakes_street' },
  { a:'rubber', b:'compound', out:'tires_street' },
  { a:'spring', b:'alloy', out:'suspension_street' },
  { a:'gear', b:'alloy', out:'transmission_street' },
  { a:'scrap', b:'alloy', out:'engine_block' },
  { a:'engine_block', b:'ecu', out:'engine_street' }
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
