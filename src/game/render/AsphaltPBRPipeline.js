import Phaser from 'phaser';

const FRAG_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform sampler2D uNormalSampler;
uniform sampler2D uRoughnessSampler;
uniform sampler2D uHeightSampler;

varying vec2 outTexCoord;
varying vec4 outTint;

void main ()
{
    vec4 baseSample = texture2D(uMainSampler, outTexCoord);
    vec3 base = baseSample.rgb * outTint.rgb;

    vec3 n = texture2D(uNormalSampler, outTexCoord).rgb * 2.0 - 1.0;
    n = normalize(vec3(n.xy * 1.35, max(0.18, n.z)));

    float rough = texture2D(uRoughnessSampler, outTexCoord).r;
    float height = texture2D(uHeightSampler, outTexCoord).r;

    // Fixed, soft sky/sun direction. This is intentionally subtle enough to feel like
    // outdoor daylight, but strong enough to make the normal/roughness maps readable
    // at the gameplay camera distance on a phone.
    vec3 lightDir = normalize(vec3(-0.38, -0.46, 0.80));
    float ndl = max(dot(n, lightDir), 0.0);

    // Rough asphalt has broad, weak highlights. Slightly smoother rubbered/mineral areas
    // get a little more response without looking wet or metallic.
    float smoothness = 1.0 - rough;
    float spec = pow(max(dot(n, normalize(lightDir + vec3(0.0, 0.0, 1.0))), 0.0), 8.0);
    spec *= (0.025 + smoothness * 0.16);

    float diffuse = 0.78 + ndl * 0.30;
    float microRelief = (height - 0.5) * 0.18;
    float roughTone = (0.5 - rough) * 0.10;

    vec3 color = base * (diffuse + microRelief + roughTone);
    color += vec3(spec);

    // Keep the photographic albedo dominant; avoid crushed blacks and HDR-looking road.
    color = clamp(color, vec3(0.0), vec3(1.0));
    gl_FragColor = vec4(color, baseSample.a * outTint.a);
}
`;

export class AsphaltPBRPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  constructor(game) {
    super({
      game,
      fragShader: FRAG_SHADER,
      uniforms: [
        'uProjectionMatrix',
        'uMainSampler',
        'uNormalSampler',
        'uRoughnessSampler',
        'uHeightSampler'
      ]
    });
    this._normalTexture = null;
    this._roughnessTexture = null;
    this._heightTexture = null;
  }

  onBoot() {
    const textures = this.game.textures;
    this._normalTexture = textures.get('asphaltNormal')?.source?.[0]?.glTexture || null;
    this._roughnessTexture = textures.get('asphaltRoughness')?.source?.[0]?.glTexture || null;
    this._heightTexture = textures.get('asphaltHeight')?.source?.[0]?.glTexture || null;

    this.set1i('uMainSampler', 0);
    this.set1i('uNormalSampler', 1);
    this.set1i('uRoughnessSampler', 2);
    this.set1i('uHeightSampler', 3);
  }

  onBind(gameObject) {
    super.onBind(gameObject);
    if (this._normalTexture) this.bindTexture(this._normalTexture, 1);
    if (this._roughnessTexture) this.bindTexture(this._roughnessTexture, 2);
    if (this._heightTexture) this.bindTexture(this._heightTexture, 3);
    return this;
  }
}

export function ensureAsphaltPBRPipeline(scene) {
  const renderer = scene?.game?.renderer;
  const pipelines = renderer?.pipelines;
  if (!pipelines || !Phaser.Renderer?.WebGL?.Pipelines?.SinglePipeline) return null;
  if (renderer.type !== Phaser.WEBGL) return null;

  const key = 'TDRAsphaltPBR';
  let pipeline = pipelines.get?.(key);
  if (!pipeline) {
    pipeline = pipelines.add(key, new AsphaltPBRPipeline(scene.game));
  }
  return pipeline || null;
}
