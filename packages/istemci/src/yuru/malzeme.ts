/**
 * Yürüyüş sahnesi gölgelendiricileri. Hepsi `ShaderMaterial` (kabukta zaten var; ışık sınıfı gerekmez):
 * renkler köşe başına palet sınıfı × pişirilmiş gölgeden gelir, sis kamera uzaklığıyla doğrusal karışır.
 * Tema değişince yalnız tekdüzeler güncellenir.
 */
import { DoubleSide, ShaderMaterial } from "three";
import type { Texture } from "three";
import { SINIF_SAYISI } from "./karo-geometri";
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

/** Karo yer katmanı: derinlik testi/yazımı yok, üçgen sırasıyla çizilir (yer düz; üstündeki her şey sonra çizilir). */
export function yerMalzemesi(p: YuruPaleti, s: SisAyari): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uPalet: { value: p.sinif }, ...sisTekduzesi(p, s) },
    vertexShader: /* glsl */ `
      attribute float aSinif;
      attribute float aGolge;
      uniform vec3 uPalet[${SINIF_SAYISI}];
      varying vec3 vRenk;
      ${SIS_V}
      void main() {
        vRenk = uPalet[int(aSinif + 0.5)] * aGolge;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vUzak = length(mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vRenk;
      ${SIS_F}
      void main() { gl_FragColor = vec4(sisli(vRenk), 1.0); }`,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });
}

/**
 * Bina katmanı. Çatı kesme: karakter ile kamera arasındaki dikey "yarık" içindeki parçalar atılır
 * (karakteri bir bina örttüğünde açılır; Capital Rift'teki çatı kesmenin sakin karşılığı).
 */
export function binaMalzemesi(p: YuruPaleti, s: SisAyari): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uPalet: { value: p.sinif },
      uKes: { value: [0, 0, 0, 0] },
      uKesP: { value: [0, 4.2] },
      ...sisTekduzesi(p, s),
    },
    vertexShader: /* glsl */ `
      attribute float aSinif;
      attribute float aGolge;
      uniform vec3 uPalet[${SINIF_SAYISI}];
      varying vec3 vRenk;
      varying vec3 vYer;
      ${SIS_V}
      void main() {
        vRenk = uPalet[int(aSinif + 0.5)] * aGolge;
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

/**
 * Örneklenmiş deri giydirme: kemik matrisleri animasyon dokusundan (`texelFetch`), örnek başına konum + yön
 * (aOrnek), kare indeksleri + karışım (aKare) ve eklem rengi (aRenk; oyuncu rengi). Tüm karakterler tek çizim çağrısı.
 */
export function kalabalikMalzemesi(doku: Texture, govde: Rgb, p: YuruPaleti, s: SisAyari): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uAnim: { value: doku },
      uGovde: { value: [...govde] },
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
        vec3 n = mat3(m) * normal;
        float co = cos(aOrnek.w);
        float si = sin(aOrnek.w);
        vec3 w = vec3(co * p.x + si * p.z, p.y, -si * p.x + co * p.z) + aOrnek.xyz;
        n = normalize(vec3(co * n.x + si * n.z, n.y, -si * n.x + co * n.z));
        float l = 0.6 + 0.3 * max(dot(n, normalize(vec3(-0.45, 0.8, 0.4))), 0.0) + 0.1 * n.y;
        vRenk = mix(uGovde, aRenk, aMalzeme) * l;
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
}
