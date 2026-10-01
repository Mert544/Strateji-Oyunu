/** GLSL kaynakları (three ShaderMaterial; GLSL ES 3.0'a three otomatik dönüştürür). Renkler sRGB değerleriyle çalışır. */

/** Ortak ışıklandırma: gece/gündüz terminatörü, yüzey kabartısı, kenar ışığı. */
export const ISIK = /* glsl */ `
uniform vec3 uGunes;
uniform float uGece;
uniform float uAksam;
uniform vec3 uKenarIsik;
vec3 isiklandir(vec3 renk, vec3 n, vec3 nr, vec3 gorus) {
  float ndl = dot(nr, uGunes);
  float gun = smoothstep(-0.10, 0.28, ndl);
  float yuz = clamp(dot(n, uGunes), 0.0, 1.0);
  float isik = mix(uGece, 0.84 + 0.18 * yuz, gun);
  vec3 c = renk * isik;
  c += vec3(1.0, 0.55, 0.25) * exp(-pow(ndl / 0.09, 2.0)) * 0.12 * uAksam;
  float rim = pow(1.0 - clamp(dot(nr, gorus), 0.0, 1.0), 3.0);
  c += uKenarIsik * rim * 0.12 * mix(0.35, 1.0, gun);
  return c;
}
`;

export const OKYANUS_VS = /* glsl */ `
varying vec3 vPoz;
void main() {
  vPoz = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const OKYANUS_FS = /* glsl */ `
${ISIK}
uniform vec3 uOkyanus;
uniform vec3 uOkyanusDerin;
varying vec3 vPoz;
void main() {
  vec3 nr = normalize(vPoz);
  vec3 gorus = normalize(cameraPosition - vPoz);
  float ndv = clamp(dot(nr, gorus), 0.0, 1.0);
  vec3 renk = mix(uOkyanusDerin, uOkyanus, pow(ndv, 0.55));
  renk = isiklandir(renk, nr, nr, gorus);
  vec3 yans = reflect(-uGunes, nr);
  float ozel = pow(max(dot(yans, gorus), 0.0), 70.0) * 0.14 * smoothstep(0.0, 0.3, dot(nr, uGunes));
  renk += vec3(1.0, 0.95, 0.85) * ozel;
  gl_FragColor = vec4(renk, 1.0);
}
`;

export const KARA_VS = /* glsl */ `
attribute float aTon;
attribute float aKutup;
varying vec3 vPoz;
varying float vTon;
varying float vKutup;
void main() {
  vPoz = position;
  vTon = aTon;
  vKutup = aKutup;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const KARA_FS = /* glsl */ `
${ISIK}
uniform vec3 uKara;
uniform vec3 uKara2;
uniform vec3 uKutup;
varying vec3 vPoz;
varying float vTon;
varying float vKutup;
void main() {
  vec3 nr = normalize(vPoz);
  vec3 nf = normalize(cross(dFdx(vPoz), dFdy(vPoz)));
  nf *= sign(dot(nf, nr));
  vec3 n = normalize(mix(nr, nf, 0.45));
  vec3 gorus = normalize(cameraPosition - vPoz);
  vec3 renk = mix(uKara, uKara2, vTon);
  renk = mix(renk, uKutup, vKutup);
  renk = isiklandir(renk, n, nr, gorus);
  gl_FragColor = vec4(renk, 1.0);
}
`;

export const BOLGE_VS = /* glsl */ `
attribute vec3 renk;
attribute float desen;
varying vec3 vPoz;
varying vec3 vRenk;
varying float vDesen;
void main() {
  vPoz = position;
  vRenk = renk;
  vDesen = desen;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const BOLGE_FS = /* glsl */ `
${ISIK}
uniform vec3 uDesenRenk;
uniform float uPikselOran;
varying vec3 vPoz;
varying vec3 vRenk;
varying float vDesen;
void main() {
  vec3 nr = normalize(vPoz);
  vec3 gorus = normalize(cameraPosition - vPoz);
  vec3 renk = vRenk;
  vec2 p = gl_FragCoord.xy / uPikselOran;
  float h = 0.0;
  if (vDesen > 0.5 && vDesen < 1.5) {
    vec2 g = fract(p / 6.0) - 0.5;
    h = 1.0 - smoothstep(0.17, 0.25, length(g));
  } else if (vDesen >= 1.5 && vDesen < 2.5) {
    h = 1.0 - smoothstep(0.30, 0.38, fract((p.x + p.y) / 7.0));
  } else if (vDesen >= 2.5) {
    float a = 1.0 - smoothstep(0.20, 0.28, fract((p.x + p.y) / 7.0));
    float b = 1.0 - smoothstep(0.20, 0.28, fract((p.x - p.y) / 7.0));
    h = max(a, b);
  }
  renk = mix(renk, uDesenRenk, h * 0.85);
  renk = isiklandir(renk, nr, nr, gorus);
  gl_FragColor = vec4(renk, 1.0);
}
`;

export const CIZGI_VS = /* glsl */ `
attribute float aKalin;
varying vec3 vPoz;
varying float vKalin;
void main() {
  vPoz = position;
  vKalin = aKalin;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const CIZGI_FS = /* glsl */ `
${ISIK}
uniform vec4 uRenkA;
uniform vec4 uRenkB;
varying vec3 vPoz;
varying float vKalin;
void main() {
  vec3 nr = normalize(vPoz);
  vec3 gorus = normalize(cameraPosition - vPoz);
  vec4 c = mix(uRenkA, uRenkB, vKalin);
  vec3 renk = isiklandir(c.rgb, nr, nr, gorus);
  gl_FragColor = vec4(renk, c.a);
}
`;

export const ATMOSFER_VS = /* glsl */ `
varying vec3 vPoz;
void main() {
  vPoz = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ATMOSFER_FS = /* glsl */ `
uniform vec3 uGunes;
uniform vec3 uAtmosfer;
uniform float uAtmosferGuc;
varying vec3 vPoz;
void main() {
  vec3 nr = normalize(vPoz);
  vec3 gorus = normalize(cameraPosition - vPoz);
  float k = dot(nr, gorus);
  float yogun = pow(clamp(0.72 - k, 0.0, 2.0), 4.0) * (1.0 - smoothstep(-0.12, 0.0, k));
  float gun = smoothstep(-0.45, 0.45, dot(nr, uGunes));
  float a = yogun * uAtmosferGuc * 0.42 * (0.25 + 0.75 * gun);
  gl_FragColor = vec4(uAtmosfer * a, a);
}
`;

export const YILDIZ_VS = /* glsl */ `
attribute float aParlak;
varying float vParlak;
uniform float uPikselOran;
void main() {
  vParlak = aParlak;
  vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.99999, p.w);
  gl_PointSize = (1.0 + aParlak * 1.4) * uPikselOran;
}
`;

export const YILDIZ_FS = /* glsl */ `
uniform float uYildizAlfa;
varying float vParlak;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float a = (1.0 - smoothstep(0.25, 0.5, length(d))) * (0.35 + 0.65 * vParlak) * uYildizAlfa;
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
}
`;

/** Simgeler: ekrana dönük, sabit piksel boyutlu SDF glifleri (liman, dar geçit, durum rozetleri, iklim olayları, seçim halkası). */
export const SIMGE_VS = /* glsl */ `
attribute vec2 kose;
attribute vec3 aKonum;
attribute float aTur;
attribute vec3 aRenk;
attribute float aBoyut;
attribute float aAlfa;
attribute float aNabiz;
uniform vec2 uEkran;
uniform float uZaman;
uniform float uYakin;
varying vec2 vK;
varying float vTur;
varying vec3 vRenk;
varying float vAlfa;
void main() {
  vec4 c = projectionMatrix * modelViewMatrix * vec4(aKonum, 1.0);
  float boy = aBoyut;
  float a = aAlfa;
  if (aTur < 1.5) { boy *= uYakin; a *= uYakin; }
  // Sakin görsel: sürekli animasyon yok. Rozet yalnız gelişinde tek kısa nabız (0,6 sn) atar.
  float nt = uZaman - aNabiz;
  if (nt >= 0.0 && nt < 0.6) boy *= 1.0 + 0.35 * sin(nt / 0.6 * 3.14159265);
  vec2 off = kose * boy / uEkran;
  // Durum rozetleri (6 savaş, 17-19) merkezin 16 px üstüne kayar (liman simgesi ve ad etiketiyle çakışmasın).
  if (aTur > 16.5 || (aTur > 5.5 && aTur < 6.5)) off.y += 32.0 / uEkran.y;
  c.xy += off * c.w;
  gl_Position = c;
  vK = kose;
  vTur = aTur;
  vRenk = aRenk;
  vAlfa = a;
}
`;

export const SIMGE_FS = /* glsl */ `
uniform vec3 uPanel;
uniform vec3 uMurekkep;
uniform float uZaman;
varying vec2 vK;
varying float vTur;
varying vec3 vRenk;
varying float vAlfa;
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
// Kutupsal tekrar: q'yu n eşit dilimden birine katlar (güneş ışınları, kar tanesi kolları).
vec2 dilim(vec2 q, float n) {
  float k = 6.2831853 / n;
  float aa = mod(atan(q.y, q.x) + 0.5 * k, k) - 0.5 * k;
  return length(q) * vec2(cos(aa), sin(aa));
}
// Eşkenar üçgen (yukarı bakan) işaretli uzaklığı.
float ucgen(vec2 p, float r) {
  const float k = 1.7320508;
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}
float glif(vec2 q, float t) {
  float d = 10.0;
  if (t < 0.5) {
    // liman: çapa
    d = min(d, seg(q, vec2(0.0, -0.50), vec2(0.0, 0.42)));
    d = min(d, seg(q, vec2(-0.30, 0.14), vec2(0.30, 0.14)));
    d = min(d, seg(q, vec2(-0.48, -0.16), vec2(0.0, -0.52)));
    d = min(d, seg(q, vec2(0.48, -0.16), vec2(0.0, -0.52)));
    d = min(d, abs(length(q - vec2(0.0, 0.55)) - 0.13));
  } else if (t < 1.5) {
    // dar geçit: iki ok birbirine doğru (→ ←)
    d = min(d, seg(q, vec2(-0.62, 0.0), vec2(-0.12, 0.0)));
    d = min(d, seg(q, vec2(-0.42, 0.30), vec2(-0.12, 0.0)));
    d = min(d, seg(q, vec2(-0.42, -0.30), vec2(-0.12, 0.0)));
    d = min(d, seg(q, vec2(0.62, 0.0), vec2(0.12, 0.0)));
    d = min(d, seg(q, vec2(0.42, 0.30), vec2(0.12, 0.0)));
    d = min(d, seg(q, vec2(0.42, -0.30), vec2(0.12, 0.0)));
  } else if (t < 6.5) {
    // savaş: çapraz kılıçlar
    d = min(d, seg(q, vec2(-0.52, -0.52), vec2(0.52, 0.52)));
    d = min(d, seg(q, vec2(-0.52, 0.52), vec2(0.52, -0.52)));
  } else if (t < 8.5) {
    // kuraklık: güneş (halka + 8 ışın)
    d = min(d, abs(length(q) - 0.20));
    d = min(d, seg(dilim(q, 8.0), vec2(0.36, 0.0), vec2(0.56, 0.0)));
  } else if (t < 9.5) {
    // don: kar tanesi (6 kol, her kolda iki tüy)
    vec2 p = dilim(q, 6.0);
    d = min(d, seg(p, vec2(0.0, 0.0), vec2(0.58, 0.0)));
    d = min(d, seg(p, vec2(0.34, 0.0), vec2(0.48, 0.15)));
    d = min(d, seg(p, vec2(0.34, 0.0), vec2(0.48, -0.15)));
  } else if (t < 10.5) {
    // sel: iki dalga çizgisi
    float dx = max(0.0, abs(q.x) - 0.58) * 3.0;
    float s = 0.09 * sin(q.x * 9.0);
    d = min(abs(q.y - 0.22 - s), abs(q.y + 0.14 - s)) + dx;
  } else if (t < 11.5) {
    // kış fırtınası: yıldırım
    d = min(d, seg(q, vec2(0.16, 0.58), vec2(-0.16, 0.04)));
    d = min(d, seg(q, vec2(-0.16, 0.04), vec2(0.14, 0.04)));
    d = min(d, seg(q, vec2(0.14, 0.04), vec2(-0.16, -0.58)));
  } else {
    // bilinmeyen olay: ünlem
    d = min(d, seg(q, vec2(0.0, 0.52), vec2(0.0, -0.08)));
    d = min(d, length(q - vec2(0.0, -0.42)));
  }
  return d;
}
void main() {
  float r = length(vK);
  if (r > 1.0) discard;
  if (vTur > 16.5) {
    // Durum rozetleri: 17 ▲ eksik (dolu üçgen), 18 ◯ boşta (halka), 19 ✓ bitti (dolu daire + onay). Panel renginde dış çerçeve.
    float d = vTur < 17.5 ? ucgen(vec2(vK.x, vK.y + 0.10), 0.74) : r - 0.70;
    float dis = 1.0 - smoothstep(0.12, 0.18, d);
    if (dis < 0.01) discard;
    vec3 renk = mix(uPanel, vRenk, 1.0 - smoothstep(-0.03, 0.03, d));
    if (vTur > 17.5 && vTur < 18.5) {
      renk = mix(renk, uPanel, 1.0 - smoothstep(0.30, 0.36, r));
    } else if (vTur > 18.5) {
      float c = min(seg(vK, vec2(-0.36, 0.02), vec2(-0.10, -0.26)), seg(vK, vec2(-0.10, -0.26), vec2(0.38, 0.28)));
      renk = mix(renk, vec3(1.0), 1.0 - smoothstep(0.08, 0.14, c));
    }
    gl_FragColor = vec4(renk, dis * vAlfa);
    return;
  }
  if (vTur > 14.5) {
    // olay halkaları (sabit): 15 etkin / yayılım (dolu ince halka), 16 uyarı (kesikli)
    float ra = smoothstep(0.78, 0.84, r) * (1.0 - smoothstep(0.95, 1.0, r));
    if (vTur > 15.5) ra *= step(0.4, fract(atan(vK.y, vK.x) * 2.546479));
    if (ra < 0.01) discard;
    gl_FragColor = vec4(vRenk, ra * vAlfa);
    return;
  }
  if (vTur > 6.5 && vTur < 7.5) {
    float a = smoothstep(0.80, 0.86, r) * (1.0 - smoothstep(0.94, 1.0, r));
    if (a < 0.01) discard;
    gl_FragColor = vec4(vRenk, a * vAlfa);
    return;
  }
  bool dolu = vTur > 5.5;
  vec3 zemin = dolu ? vRenk : uPanel;
  vec3 glifRenk = dolu ? vec3(1.0) : uMurekkep;
  float halka = smoothstep(0.80, 0.90, r);
  vec3 renk = mix(zemin, dolu ? uPanel : uMurekkep, halka * (dolu ? 0.0 : 0.55));
  // olay simgesi: beyaz çerçeve (her arka planda seçilir)
  if (vTur > 7.5) renk = mix(renk, vec3(1.0), smoothstep(0.78, 0.86, r));
  float d = glif(vK, vTur);
  float g = 1.0 - smoothstep(0.10, 0.17, d);
  if (vTur > 7.5) g *= 1.0 - smoothstep(0.80, 0.86, r);
  renk = mix(renk, glifRenk, g);
  float a = (1.0 - smoothstep(0.93, 1.0, r)) * vAlfa;
  gl_FragColor = vec4(renk, a);
}
`;
