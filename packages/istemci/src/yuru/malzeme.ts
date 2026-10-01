/**
 * Yürüyüş sahnesi gölgelendiricileri. Hepsi `ShaderMaterial` (kabukta zaten var; ışık sınıfı gerekmez):
 * renkler köşe başına palet sınıfı × pişirilmiş gölgeden gelir, sis kamera uzaklığıyla doğrusal karışır.
 * Tema değişince yalnız tekdüzeler güncellenir.
 */
import { DoubleSide, ShaderMaterial } from "three";
import type { Texture } from "three";
import { S, SINIF_SAYISI } from "./karo-geometri";
import type { Rgb, YuruPaleti } from "./palet";

export interface SisAyari {
  yakin: number;
  uzak: number;
}

/**
 * Çatı kesme ve yakın duvar atma (bina ve kenar çizgileri ortak): kameraya 1 m'den yakın parçalar (kamera bina duvarına
 * çarpınca öne çekilir; bu yalnız son güvence) ve karakteri örten yarık içindeki parçalar atılır. `vYer` dünya (yerel çizim) konumudur.
 */
const KES_F = /* glsl */ `
uniform vec4 uKes;
uniform vec2 uKesP;
varying vec3 vYer;
void kes() {
  if (vYer.y > 0.25 && vUzak < 1.0) discard;
  if (uKesP.x > 0.5 && vYer.y > 0.25) {
    vec2 a = uKes.xy;
    vec2 ab = uKes.zw - a;
    float t = dot(vYer.xz - a, ab) / max(dot(ab, ab), 1e-4);
    if (t > 0.0 && t < 1.0 && length(vYer.xz - (a + ab * t)) < uKesP.y * (0.7 + 0.6 * t)) discard;
  }
}
`;

const SIS_V = /* glsl */ `
varying float vUzak;
`;
const SIS_F = /* glsl */ `
uniform vec3 uSis;
uniform vec2 uSisAralik;
varying float vUzak;
vec3 sisli(vec3 c) { return mix(c, uSis, smoothstep(uSisAralik.x, uSisAralik.y, vUzak)); }
`;

function sisTekduzesi(p: YuruPaleti, s: SisAyari): Record<string, { value: unknown }> {
  return { uSis: { value: [...p.gok] }, uSisAralik: { value: [s.yakin, s.uzak] } };
}

/** Ortak GLSL yardımcıları: karma, değer gürültüsü ve kenar yumuşatmalı bant (fwidth ile; uzakta titreşmez). */
const ARAC_F = /* glsl */ `
// Ucuz karma (sin yok; yazılım GL'de de hafif): Dave Hoskins "hash12"
float karma(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float gurultu(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(karma(i), karma(i + vec2(1.0, 0.0)), f.x), mix(karma(i + vec2(0.0, 1.0)), karma(i + vec2(1.0, 1.0)), f.x), f.y);
}
float bant(float x, float a, float b, float w) { return smoothstep(a - w, a + w, x) - smoothstep(b - w, b + w, x); }
`;

/**
 * Karo yer katmanı: derinlik testi/yazımı yok, üçgen sırasıyla çizilir (yer düz; üstündeki her şey sonra çizilir).
 * Sakin doku çeşitliliği (yakında, uzakta söner): kaldırım taşı derzleri, asfaltta çok hafif gürültü, çimde benek,
 * tarlada sürüm izi. Doku dosyası yok; karo yerel konumundan üretilir.
 */
export function yerMalzemesi(p: YuruPaleti, s: SisAyari): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uPalet: { value: p.sinif }, ...sisTekduzesi(p, s) },
    vertexShader: /* glsl */ `
      attribute float aSinif;
      attribute float aGolge;
      uniform vec3 uPalet[${SINIF_SAYISI}];
      varying vec3 vRenk;
      varying vec2 vP;
      varying vec3 vAgirlik;
      ${SIS_V}
      void main() {
        vRenk = uPalet[int(aSinif + 0.5)] * aGolge;
        vP = position.xz;
        int s = int(aSinif + 0.5);
        // Desen ağırlıkları: x kaldırım/yaya taşı, y çim/orman beneği, z tarla sürüm izi
        vAgirlik = vec3(s == ${S.KALDIRIM} || s == ${S.YAYA} ? 1.0 : 0.0, s == ${S.YESIL} || s == ${S.ORMAN} ? 1.0 : 0.0, s == ${S.TARLA} ? 1.0 : 0.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vUzak = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vRenk;
      varying vec2 vP;
      varying vec3 vAgirlik;
      ${SIS_F}
      void main() {
        vec3 c = vRenk;
        // Dalsız ve ucuz (yazılım GL'de dört pikselli grup tüm dalları öder): sınıf ağırlıkları köşede, desenler sabit genişlikli
        float d = 1.0 - smoothstep(40.0, 110.0, vUzak);
        if (d > 0.0) {
          vec2 g = fract(vP / 0.9);
          float w = 0.04 + vUzak * 0.0012;
          float derz = 1.0 - smoothstep(0.0, w, min(g.x, g.y));
          float yesil = sin(vP.x * 0.31 + sin(vP.y * 0.23) * 1.7) * sin(vP.y * 0.27 - vP.x * 0.11);
          c *= 1.0 - (0.055 * derz * vAgirlik.x - 0.05 * yesil * vAgirlik.y - 0.04 * (0.5 - abs(fract(vP.x * 0.4) - 0.5)) * vAgirlik.z) * d;
        }
        gl_FragColor = vec4(sisli(c), 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
}

/**
 * Bina katmanı (T1 cephe ayrıntısı, gölgelendiricide): cephe tonu bina tohumuyla altı sıcak tondan; kat çizgileri,
 * duvar ortasına hizalı pencere ritmi (denizlikli), apartmanların yaklaşık yarısında giriş katı vitrini + tente,
 * korniş/saçak gölgesi bandı ve tabanda temas koyulaşması. Koyu temada ("akşam") pencerelerin bir kısmı sıcak ışıklı
 * (durağan; titreme yok). Kiremit çatıda yükseklik eş çizgileri kiremit sırası gibi okunur. Ayrıntı uzakta söner.
 * Çatı kesme: karakter ile kamera arasındaki dikey "yarık" içindeki parçalar atılır.
 */
export function binaMalzemesi(p: YuruPaleti, s: SisAyari): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uPalet: { value: p.sinif },
      uFasad: { value: p.fasad },
      uTente: { value: p.tente },
      uCam: { value: [...p.cam] },
      uCamIsik: { value: [...p.camIsik] },
      uIsikOran: { value: p.isikOran },
      uVitrin: { value: [...p.vitrin] },
      uKes: { value: [0, 0, 0, 0] },
      uKesP: { value: [0, 4.2] },
      ...sisTekduzesi(p, s),
    },
    vertexShader: /* glsl */ `
      attribute float aSinif;
      attribute float aGolge;
      attribute vec4 aCephe;
      attribute float aUst;
      uniform vec3 uPalet[${SINIF_SAYISI}];
      uniform vec3 uFasad[6];
      uniform vec3 uTente[4];
      varying vec3 vRenk;
      varying vec3 vTente;
      varying vec3 vYer;
      varying vec4 vCephe;
      varying vec3 vBina;
      ${SIS_V}
      void main() {
        int s = int(aSinif + 0.5);
        // Bina başına sabitler köşede hesaplanır (parça gölgelendiricisi hafif kalsın; yazılım GL'de de)
        float t = floor(aCephe.w * 997.0 + 0.5);
        float tf = t / 997.0;
        float tur = 0.0;
        vec3 r = uPalet[s] * aGolge;
        if (s == ${S.BINA}) {
          r = uFasad[int(clamp(floor(tf * 6.0), 0.0, 5.0))] * (0.97 + 0.06 * fract(tf * 17.0)) * aGolge;
          tur = aCephe.z > 0.5 && aUst >= 3.2 ? 1.0 : 5.0;
        } else if (s == ${S.SANAYI_BINA}) tur = 2.0;
        else if (s == ${S.CATI_KIREMIT} || s == ${S.CATI_KOYU_KIREMIT}) {
          tur = 3.0;
          r *= 0.97 + 0.06 * tf;
        } else if (s == ${S.BINA_CATI} || s == ${S.CATI_ARDUVAZ}) r *= 0.97 + 0.06 * tf;
        vRenk = r;
        vTente = uTente[int(floor(fract(tf * 3.7) * 3.999))] * aGolge;
        // x: tür (0 düz, 1 cephe, 2 sanayi, 3 kiremit, 5 ayrıntısız cephe), y: dükkân katı (1/0), z: tohum (tamsayı)
        // z: bina tohumu küçük tamsayı (0–250; mediump'ta da tam): parçada floor(z + 0.5) ile kesin geri alınır
        vBina = vec3(tur, aUst >= 8.9 && fract(tf * 5.3) < 0.55 ? 1.0 : 0.0, mod(t, 251.0));
        vCephe = vec4(aCephe.xyz, aUst);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vYer = w.xyz;
        vec4 mv = viewMatrix * w;
        vUzak = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCam;
      uniform vec3 uCamIsik;
      uniform float uIsikOran;
      uniform vec3 uVitrin;
      varying vec3 vRenk;
      varying vec3 vTente;
      varying vec4 vCephe;
      varying vec3 vBina;
      ${SIS_F}
      ${KES_F}
      ${ARAC_F}
      vec3 cephe(vec3 f) {
        float y = vYer.y;
        float ust = vCephe.w;
        vec3 r = f * mix(0.84, 1.0, min(y * 0.77, 1.0));
        float detay = 1.0 - smoothstep(170.0, 330.0, vUzak);
        if (detay <= 0.0) return r;
        float u = vCephe.x;
        float aciklik = vCephe.y;
        float aralik = vCephe.z;
        float dukkan = vBina.y;
        float g0 = dukkan * 3.4;
        float fu = u / aralik;
        float fy = (y - g0) / 3.0;
        float wu = fwidth(fu) + 1e-4;
        float wy = fwidth(fy) + 1e-4;
        float kat = floor(fy);
        float ky = fract(fy);
        float px = fract(fu);
        float icerde = step(0.0, u) * step(u, aciklik);
        if (y > g0 && y < ust - 0.65) {
          float bx = bant(px, 0.27, 0.73, wu) * icerde;
          float pen = bx * bant(ky, 0.3, 0.79, wy);
          float den = bant(px, 0.23, 0.77, wu) * icerde * bant(ky, 0.25, 0.3, wy);
          r = mix(r, f * 1.08, den * detay);
          if (pen > 0.0) {
            // Pencere kimliği yalnız tamsayılardan (pencere sırası, kat, bina): parça başına sapma yok → karıncalanma yok
            float pid = karma(vec2(floor(fu) * 1.618 + floor(vBina.z + 0.5) * 0.173, kat * 3.17 + 0.5));
            float isikli = step(1.0 - uIsikOran, fract(pid * 7.13));
            // Işıklı pencere: düz, sıcak dolgu; altta hafif daha parlak dikey degrade. Sönük pencere: pencere başına sabit ton.
            vec3 sonuk = uCam * (0.92 + 0.12 * pid);
            vec3 isik = uCamIsik * mix(1.08, 0.9, clamp((ky - 0.3) / 0.49, 0.0, 1.0));
            vec3 cam = mix(sonuk, isik, isikli);
            cam *= mix(0.82, 1.0, clamp((0.79 - ky) * 11.0, 0.0, 1.0) * (1.0 - isikli) + isikli);
            r = mix(r, cam, pen * detay);
          }
          if (kat >= 1.0 || dukkan > 0.5) r *= 1.0 - 0.07 * (1.0 - smoothstep(0.0, 0.04 + wy, ky)) * detay;
        } else if (dukkan > 0.5 && y < g0) {
          float yw = fwidth(y) + 1e-4;
          float vit = bant(px, 0.07, 0.93, wu) * bant(y, 0.35, 2.68, yw) * icerde;
          float pid = karma(vec2(floor(fu) * 1.618 + floor(vBina.z + 0.5) * 0.173, 0.25));
          vec3 vc = mix(uVitrin * (0.9 + 0.16 * pid), uCamIsik * 0.95, min(1.0, uIsikOran * 1.6));
          r *= 0.93;
          r = mix(r, vc, vit * detay);
          r = mix(r, vTente, bant(y, 2.74, 3.12, yw) * icerde * detay);
          r *= 1.0 - 0.18 * bant(y, 2.62, 2.74, yw) * icerde * detay;
        }
        // Korniş / saçak gölgesi
        r *= 1.0 - 0.11 * step(ust - 0.53, y);
        return r;
      }
      void main() {
        kes();
        float tur = vBina.x;
        vec3 c = vRenk;
        if (tur > 0.5 && tur < 1.5) c = cephe(vRenk);
        else if (tur > 4.5) c *= mix(0.84, 1.0, min(vYer.y * 0.77, 1.0));
        else if (tur > 1.5 && tur < 2.5) {
          float q = vCephe.x / 1.6;
          c *= (1.0 - 0.06 * (1.0 - smoothstep(0.0, 0.06 + fwidth(q), fract(q)))) * mix(0.86, 1.0, min(vYer.y * 0.77, 1.0));
          float ub = bant(vYer.y, vCephe.w - 2.2, vCephe.w - 1.2, fwidth(vYer.y) + 1e-4);
          c = mix(c, uCam * 0.9, ub * 0.85 * (1.0 - smoothstep(170.0, 330.0, vUzak)));
        } else if (tur > 2.5 && tur < 3.5) {
          float q = vYer.y / 0.32;
          c *= 1.0 - 0.09 * (1.0 - smoothstep(0.0, 0.16 + fwidth(q), fract(q))) * (1.0 - smoothstep(120.0, 260.0, vUzak));
        }
        gl_FragColor = vec4(sisli(c), 1.0);
      }`,
  });
}

/**
 * Örneklenmiş deri giydirme: kemik matrisleri animasyon dokusundan (`texelFetch`), örnek başına konum + yön
 * (aOrnek), kare indeksleri + karışım (aKare) ve eklem rengi (aRenk; oyuncu rengi). Tüm karakterler tek çizim çağrısı.
 */
export function kalabalikMalzemesi(doku: Texture, govde: Rgb, p: YuruPaleti, s: SisAyari, olcek = 1): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uAnim: { value: doku },
      uGovde: { value: [...govde] },
      uAlt: { value: [...p.giysiAlt] },
      uTen: { value: [...p.ten] },
      uOlcek: { value: olcek },
      ...sisTekduzesi(p, s),
    },
    vertexShader: /* glsl */ `
      attribute vec4 aKemik;
      attribute vec4 aAgirlik;
      attribute float aMalzeme;
      attribute vec4 aOrnek;
      attribute vec3 aKare;
      attribute vec3 aRenk;
      uniform sampler2D uAnim;
      uniform vec3 uGovde;
      uniform vec3 uAlt;
      uniform vec3 uTen;
      uniform float uOlcek;
      varying vec3 vRenk;
      ${SIS_V}
      mat4 kemik(float b, float f) {
        int x = int(b + 0.5) * 3;
        int y = int(f + 0.5);
        vec4 a = texelFetch(uAnim, ivec2(x, y), 0);
        vec4 c = texelFetch(uAnim, ivec2(x + 1, y), 0);
        vec4 d = texelFetch(uAnim, ivec2(x + 2, y), 0);
        return mat4(a.x, c.x, d.x, 0.0, a.y, c.y, d.y, 0.0, a.z, c.z, d.z, 0.0, a.w, c.w, d.w, 1.0);
      }
      mat4 deri(float f) {
        return kemik(aKemik.x, f) * aAgirlik.x + kemik(aKemik.y, f) * aAgirlik.y + kemik(aKemik.z, f) * aAgirlik.z + kemik(aKemik.w, f) * aAgirlik.w;
      }
      void main() {
        mat4 m = aKare.z > 0.001 ? deri(aKare.x) * (1.0 - aKare.z) + deri(aKare.y) * aKare.z : deri(aKare.x);
        vec4 p = m * vec4(position, 1.0);
        p.xyz *= uOlcek;
        vec3 n = mat3(m) * normal;
        float co = cos(aOrnek.w);
        float si = sin(aOrnek.w);
        vec3 w = vec3(co * p.x + si * p.z, p.y, -si * p.x + co * p.z) + aOrnek.xyz;
        n = normalize(vec3(co * n.x + si * n.z, n.y, -si * n.x + co * n.z));
        float l = 0.62 + 0.3 * max(dot(n, normalize(vec3(-0.5, 0.72, 0.48))), 0.0) + 0.08 * n.y;
        // İki tonlu giysi (bağ pozu T: kollar yatay): üst = oyuncu rengi (sakin), alt = koyu nötr, baş ve eller ten,
        // ayakkabı koyu. Eklem vurgusu (aMalzeme) kemerde ince koyu bant olarak kalır.
        vec3 b = position;
        vec3 ust = mix(aRenk, uGovde, 0.18);
        vec3 r = b.y > 0.98 ? ust : uAlt;
        if (b.y < 0.1) r = uAlt * 0.62;
        if (b.y > 0.93 && b.y < 1.0) r = uAlt * 0.8;
        if (b.y > 1.56 || abs(b.x) > 0.74) r = uTen;
        vRenk = r * l;
        vec4 mv = viewMatrix * modelMatrix * vec4(w, 1.0);
        vUzak = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vRenk;
      ${SIS_F}
      void main() { gl_FragColor = vec4(sisli(vRenk), 1.0); }`,
  });
}

/** Bina kenar çizgileri (net siluet): palet sınıfından düz renk, sisli; kesme tekdüzeleri bina malzemesiyle ortak. */
export function cizgiMalzemesi(p: YuruPaleti, s: SisAyari, bina: ShaderMaterial): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uPalet: { value: p.sinif }, uKes: bina.uniforms["uKes"]!, uKesP: bina.uniforms["uKesP"]!, ...sisTekduzesi(p, s) },
    vertexShader: /* glsl */ `
      attribute float aSinif;
      uniform vec3 uPalet[${SINIF_SAYISI}];
      varying vec3 vRenk;
      varying vec3 vYer;
      ${SIS_V}
      void main() {
        vRenk = uPalet[int(aSinif + 0.5)];
        vec4 w = modelMatrix * vec4(position, 1.0);
        vYer = w.xyz;
        vec4 mv = viewMatrix * w;
        vUzak = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vRenk;
      ${SIS_F}
      ${KES_F}
      void main() {
        kes();
        gl_FragColor = vec4(sisli(vRenk), 1.0);
      }`,
  });
}

/** Düz renkli, köşe renkli (aRenk) ve isteğe bağlı merkez etrafında solan saydam katman (ızgara, sahiplik, işaret). */
export function katmanMalzemesi(alfa: number, solma: [number, number] | null, p: YuruPaleti, s: SisAyari): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uAlfa: { value: alfa },
      uMerkez: { value: [0, 0] },
      uSolma: { value: solma ?? [1e9, 2e9] },
      ...sisTekduzesi(p, s),
    },
    vertexShader: /* glsl */ `
      attribute vec4 aRenk;
      varying vec4 vRenk;
      varying vec2 vYer;
      ${SIS_V}
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vRenk = aRenk;
        vYer = w.xz;
        vec4 mv = viewMatrix * w;
        vUzak = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAlfa;
      uniform vec2 uMerkez;
      uniform vec2 uSolma;
      varying vec4 vRenk;
      varying vec2 vYer;
      ${SIS_F}
      void main() {
        // Solma parça başına: çizgi uçları solma yarıçapının dışında olsa da ortası görünür
        float a = vRenk.a * uAlfa * (1.0 - smoothstep(uSolma.x, uSolma.y, length(vYer - uMerkez)));
        if (a < 0.004) discard;
        gl_FragColor = vec4(sisli(vRenk.rgb), a);
      }`,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

/** Örneklenmiş kutular (inşaat aşamaları): örnek başına ofset, ölçek ve renk; köşe başına pişirilmiş gölge. */
export function kutuMalzemesi(p: YuruPaleti, s: SisAyari): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { ...sisTekduzesi(p, s) },
    vertexShader: /* glsl */ `
      attribute float aGolge;
      attribute vec3 aOfset;
      attribute vec3 aOlcek;
      attribute vec3 aRenk;
      varying vec3 vRenk;
      ${SIS_V}
      void main() {
        vRenk = aRenk * aGolge;
        vec4 w = modelMatrix * vec4(position * aOlcek + aOfset, 1.0);
        vec4 mv = viewMatrix * w;
        vUzak = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vRenk;
      ${SIS_F}
      void main() { gl_FragColor = vec4(sisli(vRenk), 1.0); }`,
    side: DoubleSide,
  });
}

/** Tema değişince sis ve palet tekdüzelerini günceller. */
export function temaGuncelle(m: ShaderMaterial, p: YuruPaleti): void {
  const u = m.uniforms;
  if (u["uSis"]) u["uSis"].value = [...p.gok];
  if (u["uPalet"]) u["uPalet"].value = p.sinif;
  if (u["uFasad"]) u["uFasad"].value = p.fasad;
  if (u["uTente"]) u["uTente"].value = p.tente;
  if (u["uCam"]) u["uCam"].value = [...p.cam];
  if (u["uCamIsik"]) u["uCamIsik"].value = [...p.camIsik];
  if (u["uIsikOran"]) u["uIsikOran"].value = p.isikOran;
  if (u["uVitrin"]) u["uVitrin"].value = [...p.vitrin];
}
