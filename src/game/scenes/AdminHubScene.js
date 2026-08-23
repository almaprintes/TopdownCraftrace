import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage, saveGarage } from '../garage/garageStore.js';

const PART_IDS=Object.keys(GARAGE_ITEMS).filter(id=>GARAGE_ITEMS[id]?.kind==='part');

export class AdminHubScene extends BaseScene {
  constructor() {
    super('admin-hub');
  }

  create() {
    super.create();
    const { width } = this.scale;

    this.cameras.main.setBackgroundColor('#0b1020');

    this.add.text(width / 2, 60, 'ADMIN HUB', {
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
      fontSize: '24px',
      color: '#2bff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const makeBtn = (y, label, cb, accent=0x2bff88) => {
      const w = 280;
      const h = 48;
      const x = width / 2 - w / 2;

      const bg = this.add.rectangle(x, y, w, h, 0x141b33, 0.9)
        .setOrigin(0)
        .setStrokeStyle(2, accent, 0.6)
        .setInteractive({ useHandCursor: true });

      this.add.text(width / 2, y + h / 2, label, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      bg.on('pointerup', () => cb?.());
    };

    makeBtn(118, 'Editar coches', () => {
      this.scene.start('GarageScene', { mode: 'admin' });
    });

    makeBtn(176, 'Editar pistas', () => {
      this.scene.start('TrackEditorScene');
    });

    makeBtn(234, 'Track Studio', () => {
      this.scene.start('TrackStudioScene');
    });

    makeBtn(292, 'Environment Builder', () => {
      this.scene.start('EnvironmentBuilderScene');
    }, 0xe1b33b);

    makeBtn(350, 'KIT HOMOLOGACIÓN', () => {
      const garage=loadGarage();
      if(!garage.inventory||typeof garage.inventory!=='object')garage.inventory={};
      let added=0;
      for(const id of PART_IDS){
        if(Number(garage.inventory[id]||0)<1){garage.inventory[id]=1;added++;}
      }
      saveGarage(garage);
      const msg=added>0?`KIT HOMOLOGACIÓN · ${added} PIEZAS AÑADIDAS`:`KIT HOMOLOGACIÓN · ${PART_IDS.length}/${PART_IDS.length} YA DISPONIBLES`;
      const toast=this.add.text(width/2,416,msg,{
        fontFamily:'system-ui, -apple-system, Segoe UI, Roboto, Arial',fontSize:'12px',fontStyle:'bold',color:'#ffcf63',backgroundColor:'#0b1020',padding:{x:10,y:7}
      }).setOrigin(.5).setDepth(1000);
      this.time.delayedCall(1800,()=>toast?.destroy?.());
    }, 0xffa63c);

    makeBtn(434, 'Salir ADMIN', () => {
      this.scene.start('menu', { forcePlayer: true });
    }, 0x5c718e);
  }
}
