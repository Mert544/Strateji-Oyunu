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
  float isik = mix(uGece, 0.78 + 0.32 * yuz, gun);
  vec3 c = renk * isik;
  c += vec3(1.0, 0.55, 0.25) * exp(-pow(ndl / 0.09, 2.0)) * 0.12 * uAksam;
  float rim = pow(1.0 - clamp(dot(nr, gorus), 0.0, 1.0), 3.0);
  c += uKenarIsik * rim * 0.30 * mix(0.35, 1.0, gun);
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
  float ozel = pow(max(dot(yans, gorus), 0.0), 70.0) * 0.30 * smoothstep(0.0, 0.3, dot(nr, uGunes));
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

/** Lojistik şeritleri ve savaş yayları (yüzeye paralel şerit; genişlik ve kullanım öznitelikle güncellenir). */
export const SERIT_VS = /* glsl */ `
attribute vec3 aMerkez;
attribute vec3 aYan;
attribute float aT;
attribute float aGenislik;
attribute float aKullanim;
attribute float aTur;
attribute float aUzun;
attribute float aSoluk;
attribute float aCapraz;
uniform float uGenislikOlcek;
varying float vCapraz;
varying float vT;
varying float vKullanim;
varying float vTur;
varying float vUzun;
varying float vSoluk;
varying vec3 vPoz;
void main() {
  vec3 p = aMerkez + aYan * aGenislik * uGenislikOlcek * 0.5;
  vPoz = p;
  vT = aT;
  vCapraz = aCapraz;
  vKullanim = aKullanim;
  vTur = aTur;
  vUzun = aUzun;
  vSoluk = aSoluk;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const SERIT_FS = /* glsl */ `
${ISIK}
uniform vec3 uRampa[5];
uniform float uZaman;
uniform vec3 uSavasRenk;
uniform float uSavas;
uniform vec3 uSeritKontur;
varying float vCapraz;
varying float vT;
varying float vKullanim;
varying float vTur;
varying float vUzun;
varying float vSoluk;
varying vec3 vPoz;
vec3 rampa(float u) {
  float t = clamp(u, 0.0, 1.0) * 4.0;
  int i = int(min(3.0, floor(t)));
  float f = t - float(i);
  return mix(uRampa[i], uRampa[i + 1], f);
}
void main() {
  float yol = vT * vUzun;
  float alfa = vSoluk;
  vec3 renk;
  if (uSavas > 0.5) {
    float nabiz = 0.55 + 0.45 * sin(uZaman * 7.0);
    float kesik = step(0.35, fract(yol * 9.0 - uZaman * 1.5));
    renk = uSavasRenk;
    alfa *= nabiz * (0.55 + 0.45 * kesik);
  } else {
    renk = rampa(vKullanim);
    if (vTur > 0.5 && vTur < 1.5) {
      if (fract(yol * 26.0) > 0.45) discard;
    } else if (vTur >= 1.5) {
      if (fract(yol * 12.0) > 0.68) discard;
    }
    if (vKullanim >= 0.9) {
      float parilti = smoothstep(0.55, 1.0, sin(yol * 34.0 - uZaman * 6.0));
      renk = mix(renk, vec3(1.0), parilti * 0.55);
    }
  }
  float kenar = smoothstep(0.55, 0.95, abs(vCapraz));
  renk = mix(renk, uSeritKontur, kenar * 0.75);
  vec3 nr = normalize(vPoz);
  vec3 gorus = normalize(cameraPosition - vPoz);
  renk = mix(renk, isiklandir(renk, nr, nr, gorus), 0.5);
  gl_FragColor = vec4(renk, alfa);
}
`;

/** Akış parçacıkları: yay boyunca GPU'da hareket; şekil SDF ile (daire / eşkenar dörtgen / kare / üçgen). */
export const PARCACIK_VS = /* glsl */ `
attribute vec3 aA;
attribute vec3 aB;
attribute float aOmega;
attribute float aYukseklik;
attribute float aFaz;
attribute float aHizKat;
attribute vec3 aRenk;
attribute float aBoyut;
attribute float aSekil;
attribute float aAlfa;
uniform float uZaman;
uniform float uAcisalHiz;
uniform float uPikselOran;
uniform float uYukseklik;
uniform float uOdak;
varying vec3 vRenk;
varying float vSekil;
varying float vAlfa;
const float PI = 3.14159265;
void main() {
  float u = fract(aFaz + uZaman * uAcisalHiz * aHizKat / max(aOmega, 0.03));
  float sw = sin(aOmega);
  vec3 p;
  if (aOmega < 1e-4) p = mix(aA, aB, u);
  else p = (sin((1.0 - u) * aOmega) * aA + sin(u * aOmega) * aB) / sw;
  p = normalize(p) * (1.0 + aYukseklik * sin(PI * u) + uYukseklik);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float boy = aBoyut * 0.010 * uOdak / max(0.05, -mv.z);
  gl_PointSize = clamp(boy, 2.4 * uPikselOran, 17.0 * uPikselOran);
  vRenk = aRenk;
  vSekil = aSekil;
  float uzak = 1.0 - 0.45 * smoothstep(2.0, 4.0, -mv.z);
  vAlfa = aAlfa * uzak * smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.94, 1.0, u));
}
`;

export const PARCACIK_FS = /* glsl */ `
uniform vec3 uKontur;
varying vec3 vRenk;
varying float vSekil;
varying float vAlfa;
void main() {
  vec2 q = (gl_PointCoord - 0.5) * 2.0;
  float d;
  if (vSekil < 0.5) d = length(q);
  else if (vSekil < 1.5) d = (abs(q.x) + abs(q.y)) * 0.9;
  else if (vSekil < 2.5) d = max(abs(q.x), abs(q.y)) * 1.05;
  else { float y = -q.y + 0.3125; d = max(abs(q.x) * 0.866 + y * 0.5, -y) * 1.6; }
  if (d > 1.0) discard;
  vec3 renk = d > 0.72 ? uKontur : vRenk;
  gl_FragColor = vec4(renk, vAlfa);
}
`;

/** Simgeler: ekrana dönük, sabit piksel boyutlu SDF glifleri (liman, dar geçit, neden, savaş, seçim halkası). */
export const SIMGE_VS = /* glsl */ `
attribute vec2 kose;
attribute vec3 aKonum;
attribute float aTur;
attribute vec3 aRenk;
attribute float aBoyut;
attribute float aAlfa;
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
  float tohum = fract(dot(aKonum, vec3(12.9898, 78.233, 37.719)) * 43.0);
  if (aTur < 1.5) { boy *= uYakin; a *= uYakin; }
  if (aTur > 5.5 && aTur < 6.5) boy *= 0.85 + 0.25 * sin(uZaman * 7.0);
  if (aTur > 6.5 && aTur < 7.5) boy *= 1.0 + 0.06 * sin(uZaman * 4.0);
  // İklim olayı: simge hafif atar; uyarı ve etki halkaları yayılarak sönen nabız gibi genişler.
  if (aTur > 7.5 && aTur < 12.5) boy *= 1.0 + 0.07 * sin(uZaman * 5.0 + tohum * 6.2831853);
  if (aTur > 12.5 && aTur < 14.5) {
    float faz = fract(uZaman * (aTur < 13.5 ? 0.35 : 0.65) + tohum);
    boy *= 0.45 + 0.75 * faz;
    a *= (1.0 - faz) * min(1.0, faz * 8.0);
  }
  if (aTur > 14.5 && aTur < 15.5) a *= 0.75 + 0.25 * sin(uZaman * 2.0 + tohum * 6.2831853);
  vec2 off = kose * boy / uEkran;
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
  } else if (t < 2.5) {
    // kapasite: kum saati
    d = min(d, seg(q, vec2(-0.45, 0.50), vec2(0.45, 0.50)));
    d = min(d, seg(q, vec2(-0.45, -0.50), vec2(0.45, -0.50)));
    d = min(d, seg(q, vec2(-0.45, 0.50), vec2(0.45, -0.50)));
    d = min(d, seg(q, vec2(0.45, 0.50), vec2(-0.45, -0.50)));
  } else if (t < 3.5) {
    // girdi eksik: boş kutu
    d = min(d, seg(q, vec2(-0.42, -0.42), vec2(0.42, -0.42)));
    d = min(d, seg(q, vec2(0.42, -0.42), vec2(0.42, 0.42)));
    d = min(d, seg(q, vec2(0.42, 0.42), vec2(-0.42, 0.42)));
    d = min(d, seg(q, vec2(-0.42, 0.42), vec2(-0.42, -0.42)));
  } else if (t < 4.5) {
    // mesafe: çift ok
    d = min(d, seg(q, vec2(-0.62, 0.0), vec2(0.62, 0.0)));
    d = min(d, seg(q, vec2(-0.62, 0.0), vec2(-0.34, 0.26)));
    d = min(d, seg(q, vec2(-0.62, 0.0), vec2(-0.34, -0.26)));
    d = min(d, seg(q, vec2(0.62, 0.0), vec2(0.34, 0.26)));
    d = min(d, seg(q, vec2(0.62, 0.0), vec2(0.34, -0.26)));
  } else if (t < 5.5) {
    // erişim yok: çarpı
    d = min(d, seg(q, vec2(-0.45, -0.45), vec2(0.45, 0.45)));
    d = min(d, seg(q, vec2(-0.45, 0.45), vec2(0.45, -0.45)));
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
  if (vTur > 12.5) {
    // olay halkaları: 13 uyarı (kesikli, dönen, nabız), 14 etkin (dolu halka + hafif dolgu, nabız), 15 yayılım (ince halka),
    // 16 uyarı (kesikli, sabit boyut)
    float ra;
    if (vTur < 13.5 || vTur > 15.5) {
      float dilimNo = fract(atan(vK.y, vK.x) * 2.546479 + uZaman * 0.25);
      ra = smoothstep(0.80, 0.86, r) * (1.0 - smoothstep(0.94, 1.0, r)) * step(0.4, dilimNo);
    } else if (vTur < 14.5) {
      ra = max(smoothstep(0.72, 0.80, r) * (1.0 - smoothstep(0.94, 1.0, r)), 0.14 * (1.0 - smoothstep(0.70, 0.80, r)));
    } else {
      ra = smoothstep(0.78, 0.84, r) * (1.0 - smoothstep(0.95, 1.0, r));
    }
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
