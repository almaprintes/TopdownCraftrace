import { RaceScene as BakedRaceScene } from './RaceBakedAsphaltScene.js';

// Última capa de materiales: garantiza que nadie posterior vuelva a sustituir
// grass/asphalt por procedurales. Las fuentes reference ya vienen precargadas
// por RaceMaterialScene dentro de la cadena heredada.
export class RaceScene extends BakedRaceScene {
  _replaceTextureFromReference(key, refKey, size = 1024) {
    const source = this.textures.get(refKey)?.getSourceImage?.();
    if (!source) return false;

    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(source, 0, 0, size, size);
    tex.refresh();
    return true;
  }

  ensureBgTexture() {
    if (!this._replaceTextureFromReference('grass', 'grassMaterialRef', 1024)) {
      super.ensureBgTexture();
    }
  }

  ensureAsphaltTexture() {
    if (!this._replaceTextureFromReference('asphalt', 'asphaltMaterialRef', 1024)) {
      super.ensureAsphaltTexture();
    }
  }
}
