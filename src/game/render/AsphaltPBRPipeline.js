import Phaser from 'phaser';

const FRAG_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform sampler2D uNormalSampler;
uniform sampler2D uRoughnessSampler;
uniform sampler2D uHeightSampler;
uniform float uCameraZoom;

varying vec2 outTexCoord;
varying vec4 outTint;

vec4 sampleFilteredBase(vec2 uv, float aa)
{
    vec4 c = texture2D(uMainSampler, uv);
    if (aa <= 0.001) return c;

    float r = mix(0.45, 1.85, aa) / 1024.0;
    vec4 s = c * 0.36;
    s += texture2D(uMainSampler, uv + vec2( r, 0.0)) * 0.16;
    s += texture2D(uMainSampler, uv + vec2(-r, 0.0)) * 0.16;
    s += texture2D(uMainSampler, uv + vec2(0.0,  r)) * 0.16;
    s += texture2D(uMainSampler, uv + vec2(0.0, -r)) * 0.16;
    return mix(c, s, aa);
}

vec3 sampleFilteredNormal(vec2 uv, float aa)
{
    vec3 c = texture2D(uNormalSampler, uv).rgb;
    if (aa <= 0.001) return c;

    float r = mix(0.45, 1.65, aa) / 1024.0;
    vec3 s = c * 0.40;
    s += texture2D(uNormalSampler, uv + vec2( r, 0.0)).rgb * 0.15;
    s += texture2D(uNormalSampler, uv + vec2(-r, 0.0)).rgb * 0.15;
    s += texture2D(uNormalSampler, uv + vec2(0.0,  r)).rgb * 0.15;
    s += texture2D(uNormalSampler, uv + vec2(0.0, -r)).rgb * 0.15;
    return mix(c, s, aa);
}

void main ()
{
    // Dynamic camera zoom ranges roughly from 0.75 (fast/far) to 1.50 (slow/near).
    // The farther the camera is, the more we low-pass the high-frequency asphalt detail.
    // This prevents the fine aggregate / normal pattern from crossing the pixel grid and
    // producing moving moire while preserving full sharpness when the camera comes close.
    float aa = 1.0 - smoothstep(0.78, 1.08, uCameraZoom);

    vec4 baseSample = sampleFilteredBase(outTexCoord, aa);
    vec3 base = baseSample.rgb * outTint.rgb;

    vec3 nSample = sampleFilteredNormal(outTexCoord, aa);
    vec3 n = nSample * 2.0 - 1.0;

    // Fade micro-normal strength as the camera moves away. High-frequency relief cannot
    // be represented faithfully once its texels become sub-pixel, so attenuating it is
    // both more realistic and much more stable than trying to keep every tiny pebble.
    float normalStrength = mix(1.35, 0.58, aa);
    n = normalize(vec3(n.xy * normalStrength, max(0.22, n.z)));

    float rough = texture2D(uRoughnessSampler, outTexCoord).r;
    float height = texture2D(uHeightSampler, outTexCoord).r;

    vec3 lightDir = normalize(vec3(-0.38, -0.46, 0.80));
    float ndl = max(dot(n, lightDir), 0.0);

    float smoothness = 1.0 - rough;
    float spec = pow(max(dot(n, normalize(lightDir + vec3(0.0, 0.0, 1.0))), 0.0), 8.0);
    spec *= (0.025 + smoothness * 0.16);
    spec *= mix(1.0, 0.45, aa);

    float diffuse = 0.80 + ndl * 0.27;
    float heightStrength = mix(0.16, 0.045, aa);
    float microRelief = (height - 0.5) * heightStrength;
    float roughTone = (0.5 - rough) * 0.08;

    vec3 color = base * (diffuse + microRelief + roughTone);
    color += vec3(spec);
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
        'uHeightSampler',
        'uCameraZoom'
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
    this.set1f('uCameraZoom', 1.0);
  }

  onBind(gameObject) {
    super.onBind(gameObject);
    if (this._normalTexture) this.bindTexture(this._normalTexture, 1);
    if (this._roughnessTexture) this.bindTexture(this._roughnessTexture, 2);
    if (this._heightTexture) this.bindTexture(this._heightTexture, 3);

    const zoom = Number(gameObject?.scene?.cameras?.main?.zoom || 1);
    this.set1f('uCameraZoom', Number.isFinite(zoom) ? zoom : 1.0);
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
