const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

class Resonator{
  constructor(sampleRate){
    this.sampleRate=sampleRate;
    this.y1=0;
    this.y2=0;
    this.a1=0;
    this.a2=0;
    this.gain=1;
  }
  tune(freq,decay,gain=1){
    const f=clamp(freq,20,this.sampleRate*.42);
    const r=Math.exp(-1/(Math.max(.004,decay)*this.sampleRate));
    const w=TAU*f/this.sampleRate;
    this.a1=2*r*Math.cos(w);
    this.a2=-(r*r);
    this.gain=gain;
  }
  process(x){
    const y=x+this.a1*this.y1+this.a2*this.y2;
    this.y2=this.y1;
    this.y1=y;
    return y*this.gain;
  }
}

class TdrEngineCombustionProcessor extends AudioWorkletProcessor{
  static get parameterDescriptors(){
    return [
      {name:'rpm',defaultValue:950,minValue:650,maxValue:8500,automationRate:'k-rate'},
      {name:'load',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},
      {name:'coast',defaultValue:0,minValue:0,maxValue:1,automationRate:'k-rate'},
      {name:'level',defaultValue:.7,minValue:0,maxValue:1,automationRate:'k-rate'},
    ];
  }

  constructor(){
    super();
    this.phase=0; // 0..720 crank degrees: one four-stroke cycle.
    this.cycle=0;
    this.seed=0x6d2b79f5;
    this.exhaustEnv=0;
    this.blockEnv=0;
    this.intakeEnv=0;
    this.valveEnv=0;
    this.prevNoise=0;
    this.prevMech=0;
    this.firePhases=[0,180,360,540];
    // I4 firing order 1-3-4-2. Small cylinder-to-cylinder differences stop perfect repetition.
    this.cylinderStrength=[1.000,.968,1.022,.987];
    this.cylinderPan=[-.045,.028,-.025,.042];
    this.blockR=new Resonator(sampleRate);
    this.exhaustLowR=new Resonator(sampleRate);
    this.exhaustHighR=new Resonator(sampleRate);
    this.intakeR=new Resonator(sampleRate);
    this.mechR=new Resonator(sampleRate);
  }

  _rand(){
    let x=this.seed|0;
    x^=x<<13;x^=x>>>17;x^=x<<5;
    this.seed=x|0;
    return ((x>>>0)/4294967295)*2-1;
  }

  _crossed(prev,next,target){
    if(next>=720)return target>prev||target<=next-720;
    return target>prev&&target<=next;
  }

  process(inputs,outputs,parameters){
    const out=outputs[0];
    if(!out?.length)return true;
    const left=out[0];
    const right=out[1]||left;
    const rpm=clamp(parameters.rpm[0]||950,650,8500);
    const load=clamp(parameters.load[0]||0,0,1);
    const coast=clamp(parameters.coast[0]||0,0,1);
    const level=clamp(parameters.level[0]??.7,0,1);
    const rpm01=clamp((rpm-950)/(7200-950),0,1);

    // Resonances are retuned once per render quantum, not per sample.
    // They represent block/cabin, exhaust primary/secondary and intake tract.
    this.blockR.tune(92+rpm01*72,.030-rpm01*.010,.17);
    this.exhaustLowR.tune(138+rpm01*145+load*32,.042-rpm01*.014,.19);
    this.exhaustHighR.tune(390+rpm01*560+load*90,.024-rpm01*.009,.070);
    this.intakeR.tune(620+rpm01*1320,.018-rpm01*.006,.050);
    this.mechR.tune(1450+rpm01*2050,.008,.014);

    const degPerSample=rpm*6/sampleRate;
    const exhaustDecay=Math.exp(-1/(sampleRate*(.0085-rpm01*.0025)));
    const blockDecay=Math.exp(-1/(sampleRate*.014));
    const intakeDecay=Math.exp(-1/(sampleRate*.0065));
    const valveDecay=Math.exp(-1/(sampleRate*.0028));

    for(let i=0;i<left.length;i++){
      const prev=this.phase;
      let next=prev+degPerSample;
      let fireIndex=-1;
      for(let c=0;c<4;c++){
        if(this._crossed(prev,next,this.firePhases[c])){fireIndex=c;break;}
      }
      if(next>=720){next-=720;this.cycle++;}
      this.phase=next;

      let pan=0;
      if(fireIndex>=0){
        const variation=1+this._rand()*.035;
        const cyl=this.cylinderStrength[fireIndex];
        const energy=(.42+load*.72)*(1-coast*.18)*variation*cyl;
        this.exhaustEnv+=energy*(.60+rpm01*.23);
        this.blockEnv+=energy*(.44-rpm01*.12);
        this.intakeEnv+=(load*.58+rpm01*load*.22)*variation;
        this.valveEnv+=(.15+rpm01*.33)*(1+this._rand()*.08);
        pan=this.cylinderPan[fireIndex];
      }

      this.exhaustEnv*=exhaustDecay;
      this.blockEnv*=blockDecay;
      this.intakeEnv*=intakeDecay;
      this.valveEnv*=valveDecay;

      const white=this._rand();
      this.prevNoise=this.prevNoise*.64+white*.36;
      const gritty=this.prevNoise;
      const mechWhite=this._rand();
      this.prevMech=this.prevMech*.18+mechWhite*.82;
      const mech=this.prevMech;

      const combustionImpulse=this.exhaustEnv*(.70+gritty*.18);
      const blockImpulse=this.blockEnv*(.78+gritty*.12);
      const intakeImpulse=this.intakeEnv*(.60+gritty*.30);
      const valveImpulse=this.valveEnv*(.65+mech*.35);

      let y=0;
      y+=this.blockR.process(blockImpulse);
      y+=this.exhaustLowR.process(combustionImpulse);
      y+=this.exhaustHighR.process(combustionImpulse*(.42+load*.34));
      y+=this.intakeR.process(intakeImpulse*(.32+load*.90));
      y+=this.mechR.process(valveImpulse*(.25+rpm01*.80));

      // Continuous gas-flow texture masks mathematical periodicity without hiding firing pulses.
      y+=gritty*(.008+load*.018+rpm01*.009);
      // Closed-throttle overrun: less combustion, more dry mechanical/exhaust texture.
      y+=coast*(rpm01*.020)*(gritty*.72+mech*.28);

      // Soft saturation, preserving transients.
      y=Math.tanh(y*1.42)*level;
      const stereoSpread=.018+rpm01*.012;
      left[i]=y*(1-pan*stereoSpread);
      if(right!==left)right[i]=y*(1+pan*stereoSpread);
    }
    return true;
  }
}

registerProcessor('tdr-engine-combustion',TdrEngineCombustionProcessor);
