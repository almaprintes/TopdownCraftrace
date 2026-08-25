export const SEASON_CYCLE=['speed','precision','progression'];

export const INDUCTION_SEASON={
  id:'induction-00',
  family:'induction',
  number:0,
  permanent:true,
  premiumEnabled:false,
  stages:[
    {id:'first-drive',es:'Primeros metros',en:'First Miles',kind:'race'},
    {id:'garage-visit',es:'Conoce tu máquina',en:'Know Your Machine',kind:'garage'},
    {id:'material-start',es:'Primer botín',en:'First Loot',kind:'materials'},
    {id:'first-craft',es:'Manos a la obra',en:'Hands On',kind:'craft'},
    {id:'equip-part',es:'Ajusta el coche',en:'Tune the Car',kind:'equip'},
    {id:'clean-start',es:'Conduce limpio',en:'Drive Clean',kind:'clean'},
    {id:'store-buy',es:'De compras',en:'Shop Visit',kind:'store'},
    {id:'track-tour',es:'Cambia de escenario',en:'Change of Scenery',kind:'tracks'},
    {id:'mode-tour',es:'Prueba algo diferente',en:'Try Something New',kind:'mode'},
    {id:'material-hunt',es:'Coleccionista',en:'Collector',kind:'materials'},
    {id:'clean-rhythm',es:'Coge el ritmo',en:'Find Your Rhythm',kind:'clean'},
    {id:'distance-run',es:'Suma kilómetros',en:'Build Mileage',kind:'laps'},
    {id:'explorer',es:'Explorador',en:'Explorer',kind:'tracks'},
    {id:'induction-final',es:'Piloto completo',en:'Complete Driver',kind:'final'}
  ]
};

export const SEASON_FAMILIES={
  speed:{es:'Velocidad',en:'Speed'},
  precision:{es:'Precisión',en:'Precision'},
  progression:{es:'Progresión',en:'Progression'}
};

export function seasonText(lang='es'){
  const en=lang==='en';
  return {
    season:en?'SEASON':'TEMPORADA',
    induction:en?'INDUCTION':'INDUCCIÓN',
    subtitle:en?'Learn the game by playing':'Aprende el juego jugando',
    free:en?'FREE':'GRATIS',
    premium:en?'PREMIUM PASS':'PASE PREMIUM',
    comingSoon:en?'COMING SOON':'PRÓXIMAMENTE',
    open:en?'OPEN SEASON':'ABRIR TEMPORADA',
    stage:en?'STAGE':'ETAPA',
    current:en?'CURRENT':'ACTUAL',
    complete:en?'COMPLETE':'COMPLETADA',
    locked:en?'LOCKED':'BLOQUEADA',
    freeTrack:en?'FREE REWARDS':'RECOMPENSAS GRATIS',
    premiumTrack:en?'PREMIUM REWARDS':'RECOMPENSAS PREMIUM',
    premiumNote:en?'Premium track is visible by design but disabled for launch.':'La línea Premium está visible por diseño pero desactivada en el lanzamiento.'
  };
}
