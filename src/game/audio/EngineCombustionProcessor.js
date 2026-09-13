const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

class Resonator{
  constructor(sampleRate){this.sampleRate=sampleRate;this.y1=0;this.y2=0;this.a1=0;this.a2=0;this.gain=1;}
  tune(freq,decay,gain=1){const f=clamp(freq,20,this.sampleRate*.42);const r=Math.exp(-1/(Math.max(.004,decay)*this.sampleRate));const w=TAU*f/this.sampleRate;this.a1=2*r*Math.cos(w);this.a2=-(r*r);this.gain=gain;}
  process(x){let y=x+this.a1*this.y1+this.a2*this.y2;if(!Number.isFinite(y)){this.y1=0;this.y2=0;return 0;}y=clamp(y,-12,12);this.y2=this.y1;this.y1=y;return y*this.gain;}
}
function phaseDistance(a,b){let d=Math.abs(a-b)%720;if(d>360)d=720-d;return d;}
function smoothPulse(distance,width){const x=distance/Math.max(1,width);if(x>=1)return 0;const q=1-x*x;return q*q*q;}

class TdrEngineCombustionProcessor extends AudioWorkletProcessor{
  static get parameterDescriptors(){return [{name:'rpm',defaultValue:950,minValue:650,maxValue:8500,automationRate:'k-rate'},{name:'load',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},{name:'coast',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},{name:'level',defaultValue:.7,minValue:0,maxValue:1,automationRate:'k-rate'}];}
  constructor(){
    super();this.phase=0;this.seed=0x6d2b79f5;this.prevNoise=0;this.prevFlow=0;this.prevMech=0;
    this.firePhases=[0,180,360,540];this.cylinderStrength=[1.000,.975,1.018,.988];
    // Four slightly different cylinder/body voices. They share one crank but each
    // contributes a different resonance, avoiding a single thin rising pitch.
    this.cylR=[new Resonator(sampleRate),new Resonator(sampleRate),new Resonator(sampleRate),new Resonator(sampleRate)];
    this.blockR=new Resonator(sampleRate);this.exhaustLowR=new Resonator(sampleRate);this.exhaustMidR=new Resonator(sampleRate);this.exhaustHighR=new Resonator(sampleRate);this.intakeR=new Resonator(sampleRate);this.mechR=new Resonator(sampleRate);
    this.delay=new Float32Array(Math.max(2048,Math.ceil(sampleRate*.05)));this.delayIndex=0;
  }
  _rand(){let x=this.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x|0;return ((x>>>0)/4294967295)*2-1;}
  process(inputs,outputs,parameters){
    const out=outputs[0];if(!out?.length)return true;const left=out[0],right=out[1]||left;
    const rpm=clamp(parameters.rpm[0]||950,650,8500),load=clamp(parameters.load[0]||0,0,1),coast=clamp(parameters.coast[0]||0,0,1),level=clamp(parameters.level[0]??.7,0,1);
    const rpm01=clamp((rpm-950)/(7200-950),0,1);
    // Above the middle of the rev range brightness saturates: more RPM means more
    // combustion density/energy, not an endlessly rising whistle.
    const tone01=Math.min(rpm01,.62)/.62;
    this.cylR[0].tune(104+tone01*48,.040,.030);this.cylR[1].tune(111+tone01*43,.043,.029);this.cylR[2].tune(97+tone01*52,.038,.031);this.cylR[3].tune(117+tone01*39,.041,.028);
    this.blockR.tune(82+tone01*42,.050-tone01*.009,.115);
    this.exhaustLowR.tune(118+tone01*82+load*18,.060-tone01*.010,.132);
    this.exhaustMidR.tune(245+tone01*165+load*30,.044-tone01*.007,.072);
    this.exhaustHighR.tune(520+tone01*310+load*55,.027-tone01*.004,.018);
    this.intakeR.tune(560+tone01*610,.026-tone01*.004,.028);
    this.mechR.tune(1550+tone01*720,.010,.006);
    const degPerSample=rpm*6/sampleRate,pulseWidth=64-rpm01*20,firingMean=4*(pulseWidth/180)*.457,crankOmega=TAU*(rpm/60)/sampleRate;let crankPhase=(this.phase/720)*TAU*2;
    const tap1=Math.max(1,Math.min(this.delay.length-1,Math.round(sampleRate*.0037))),tap2=Math.max(1,Math.min(this.delay.length-1,Math.round(sampleRate*.0074)));
    for(let i=0;i<left.length;i++){
      let pressure=0,cylinderBody=0;
      for(let c=0;c<4;c++){const d=phaseDistance(this.phase,this.firePhases[c]);const pulse=smoothPulse(d,pulseWidth)*this.cylinderStrength[c];pressure+=pulse;cylinderBody+=this.cylR[c].process((pulse-firingMean*.25)*(.62+load*.30));}
      const acPressure=pressure-firingMean;
      const white=this._rand();this.prevNoise=this.prevNoise*.82+white*.18;const grit=this.prevNoise;const flowWhite=this._rand();this.prevFlow=this.prevFlow*.965+flowWhite*.035;const flow=this.prevFlow;const mechWhite=this._rand();this.prevMech=this.prevMech*.35+mechWhite*.65;const mech=this.prevMech;
      const combustionEnergy=.50+load*.82-coast*.16,combustion=acPressure*combustionEnergy*(1+grit*.055);
      const di=this.delayIndex,d1=this.delay[(di-tap1+this.delay.length)%this.delay.length],d2=this.delay[(di-tap2+this.delay.length)%this.delay.length];this.delay[di]=Number.isFinite(combustion)?combustion:0;this.delayIndex=(di+1)%this.delay.length;const exhaustDrive=combustion+d1*(.22+load*.08)-d2*.11;
      const rotational=Math.sin(crankPhase)*(.023-rpm01*.004)+Math.sin(crankPhase*2+.37)*(.011+rpm01*.003);
      const intakeDrive=(acPressure*.24+flow*.17)*(load*(.55+rpm01*.45)),mechDrive=(mech*.22+acPressure*.055)*(.15+rpm01*.85);
      let y=cylinderBody*.78;
      y+=this.blockR.process(combustion*.56+rotational);y+=this.exhaustLowR.process(exhaustDrive*.78);y+=this.exhaustMidR.process(exhaustDrive*(.34+load*.20));y+=this.exhaustHighR.process(exhaustDrive*(.07+load*.10+tone01*.04));y+=this.intakeR.process(intakeDrive);y+=this.mechR.process(mechDrive);
      y+=flow*(.006+load*.015+rpm01*.009);y+=coast*rpm01*(grit*.008+mech*.006);if(!Number.isFinite(y))y=0;y=Math.tanh(y*1.04)*level;
      const side=(flow*.0025+grit*.0015)*(0.4+rpm01*.6);left[i]=y-side;if(right!==left)right[i]=y+side;
      this.phase+=degPerSample;if(this.phase>=720)this.phase-=720;crankPhase+=crankOmega;if(crankPhase>TAU)crankPhase-=TAU;
    }return true;
  }
}
registerProcessor('tdr-engine-combustion',TdrEngineCombustionProcessor);
