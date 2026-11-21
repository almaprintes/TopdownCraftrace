// DEV design for the future 16-pilot AI championship.
// No experimental Realizador race may change persistent ratings.
export const AI_ELO_PILOTS=Object.freeze([
 {id:'falcon',name:'Álex Falcón',elo:1800,style:'preciso'},
 {id:'comet',name:'Vera Cometa',elo:1730,style:'agresiva'},
 {id:'viper',name:'Nico Viper',elo:1670,style:'táctico'},
 {id:'storm',name:'Lara Storm',elo:1600,style:'constante'},
 {id:'blaze',name:'Kai Blaze',elo:1530,style:'agresivo'},
 {id:'apex',name:'Mara Apex',elo:1480,style:'precisa'},
 {id:'orbit',name:'Leo Órbita',elo:1430,style:'táctico'},
 {id:'sprint',name:'Iris Sprint',elo:1370,style:'rápida'},
 {id:'grip',name:'Dani Grip',elo:1310,style:'constante'},
 {id:'vector',name:'Alma Vector',elo:1260,style:'precisa'},
 {id:'drift',name:'Hugo Drift',elo:1210,style:'agresivo'},
 {id:'pulse',name:'Eva Pulso',elo:1150,style:'táctica'},
 {id:'racer',name:'Omar Racer',elo:1100,style:'rápido'},
 {id:'spark',name:'Nora Spark',elo:1040,style:'arriesgada'},
 {id:'rookie',name:'Teo Rookie',elo:970,style:'constante'},
 {id:'nova',name:'Sira Nova',elo:900,style:'promesa'}
].map(p=>Object.freeze({...p})));
export function eloDieProbabilities(elo){
 const slope=Math.max(-1.85,Math.min(1.85,(Number(elo)-1300)/400));
 const weights=Array.from({length:6},(_,i)=>Math.exp((i-2.5)*slope*.57));
 const total=weights.reduce((a,b)=>a+b,0);
 return weights.map(w=>w/total);
}
export function rollEloAiDie(elo,rng=Math.random){
 const probabilities=eloDieProbabilities(elo);
 const r=Math.max(0,Math.min(.999999999,Number(rng())||0));
 let cumulative=0;
 for(let i=0;i<6;i++){cumulative+=probabilities[i];if(r<cumulative)return i+1;}
 return 6;
}
const expected=(a,b)=>1/(1+10**((b-a)/400));
// Official races: pairwise multiplayer Elo; normalize by opponent count so
// K stays bounded (24 for a 4-car race). No hidden ELO farming from DEV tests.
export function updateAiEloRace(league,finishers,{homologated=false,k=24}={}){
 if(!homologated||!Array.isArray(finishers)||finishers.length<2||
   finishers.some(p=>!p||!p.id||!Number.isFinite(p.elapsedMs)||p.elapsedMs<=0))
  return{updated:false,reason:'unvalidated-race',league};
 const byId=new Map(league.map(p=>[p.id,p]));
 const ids=new Set();
 for(const f of finishers){
  if(ids.has(f.id)||!byId.has(f.id))return{updated:false,reason:'unknown-or-duplicate',league};
  ids.add(f.id);
 }
 const scored=finishers.map(f=>({...f,elo:byId.get(f.id).elo}));
 const delta=new Map(scored.map(p=>[p.id,0]));
 const unit=Math.max(1,Math.min(40,Number(k)||24))/(scored.length-1);
 for(let i=0;i<scored.length;i++)for(let j=i+1;j<scored.length;j++){
  const a=scored[i],b=scored[j];
  const score=a.elapsedMs===b.elapsedMs?.5:(a.elapsedMs<b.elapsedMs?1:0);
  const change=unit*(score-expected(a.elo,b.elo));
  delta.set(a.id,delta.get(a.id)+change);
  delta.set(b.id,delta.get(b.id)-change);
 }
 return{updated:true,delta:Object.fromEntries(delta),league:league.map(p=>
  delta.has(p.id)?{...p,elo:p.elo+delta.get(p.id),races:(p.races||0)+1}:p)};
}
