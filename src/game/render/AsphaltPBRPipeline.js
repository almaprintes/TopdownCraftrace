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
    float r = mix(0.72, 1.95, aa) / 1024.0;
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
    float r = mix(0.72, 1.80, aa) / 1024.0;
    vec3 s = c * 0.40;
    s += texture2D(uNormalSampler, uv + vec2( r, 0.0)).rgb * 0.15;
    s += texture2D(uNormalSampler, uv + vec2(-r, 0.0)).rgb * 0.15;
    s += texture2D(uNormalSampler, uv + vec2(0.0,  r)).rgb * 0.15;
    s += texture2D(uNormalSampler, uv + vec2(0.0, -r)).rgb * 0.15;
    return mix(c, s, aa);
}

float sampleFilteredScalar(sampler2D tex, vec2 uv, float aa)
{
    float c = texture2D(tex, uv).r;
    float r = mix(0.65, 1.65, aa) / 1024.0;
    float s = c * 0.40;
    s += texture2D(tex, uv + vec2( r, 0.0)).r * 0.15;
    s += texture2D(tex, uv + vec2(-r, 0.0)).r * 0.15;
    s += texture2D(tex, uv + vec2(0.0,  r)).r * 0.15;
    s += texture2D(tex, uv + vec2(0.0, -r)).r * 0.15;
    return mix(c, s, aa);
}

void main ()
{
    // The live iPhone recording showed the worst shimmer at LOW speed, where the camera
    // is closest (~1.5 zoom). Therefore filtering must never drop to zero. We keep a
    // permanent low-pass floor and progressively strengthen it as the camera moves away.
    float farFactor = 1.0 - smoothstep(0.78, 1.18, uCameraZoom);
    float aa = mix(0.34, 1.0, farFactor);

    vec4 baseSample = sampleFilteredBase(outTexCoord, aa);
    vec3 base = baseSample.rgb * outTint.rgb;

    vec3 nSample = sampleFilteredNormal(outTexCoord, aa);
    vec3 n = nSample * 2.0 - 1.0;

    // Close camera still gets tactile relief, but not the previous over-sharp normal map
    // that produced crawling highlights on the fine aggregate while zoom was changing.
    float normalStrength = mix(1.00, 0.52, farFactor);
    n = normalize(vec3(n.xy * normalStrength, max(0.24, n.z)));

    float rough = sampleFilteredScalar(uRoughnessSampler, outTexCoord, aa);
    float height = sampleFilteredScalar(uHeightSampler, outTexCoord, aa);

    vec3 lightDir = normalize(vec3(-0.38, -0.46, 0.80));
    float ndl = max(dot(n, lightDir), 0.0);

    float smoothness = 1.0 - rough;
    float spec = pow(max(dot(n, normalize(lightDir + vec3(0.0, 0.0, 1.0))), 0.0), 8.0);
    spec *= (0.018 + smoothness * 0.10);
    spec *= mix(0.72, 0.38, farFactor);

    float diffuse = 0.82 + ndl * 0.23;
    float heightStrength = mix(0.10, 0.035, farFactor);
    float microRelief = (height - 0.5) * heightStrength;
    float roughTone = (0.5 - rough) * 0.06;

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
