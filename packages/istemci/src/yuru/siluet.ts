/**
 * Üretim yöntemlerinin imza silüeti (G6/G8; saf): bitmiş (Tamam) yapının görünümünü yöntem belirler (görsel kimlik raporu §4.8).
 * Hepsi `asamaKutulari` ile aynı ayak izinde ve örneklenmiş kutu çiziminde (ek çizim çağrısı yok; sürekli animasyon yok).
 * Kutu: [x, y, z, sx, sy, sz, renkNo]; renkNo 0..4 `asamaKutulari` ile aynı, ek olarak
 *   10 sıcak ışık (fırın ağzı, tezgâh, baca parıltısı; palet `camIsik`), 11 çuval/bidon bej, 12 metal (silo, çerçeve, palet),
 *   13 tuğla (baca), 14 toprak/gübre, 15 cam (palet `cam`; koyu temada içeriden ışıklı: `camIsik`). Cephe +z (güney) yüzündedir.
 */
export type SiluetKutusu = [number, number, number, number, number, number, number];

/** Silüet renk numaraları 10'dan başlar (0..7 genel yapı ve dükkân kutularına ayrılmıştır). */
export const SILUET_RENK_ILK = 10;
export const SILUET_RENK = { isik: 10, cuval: 11, metal: 12, tugla: 13, toprak: 14, cam: 15 } as const;

/** Yöntem kimliği (`icerik.yontemler[].id`) -> silüet; kimlik tanımsızsa `null` (genel bitmiş gövde çizilir). */
export const SILUETLI_YONTEMLER = ["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli", "cam_firini", "celik_dograma"] as const;
export type SiluetliYontem = (typeof SILUETLI_YONTEMLER)[number];

export function siluetliMi(y: string | undefined): y is SiluetliYontem {
  return !!y && (SILUETLI_YONTEMLER as readonly string[]).includes(y);
}

/** Bir yöntemin kutuları (hücre kenarı `c`; hücre KB köşesine göre). */
export function siluetKutulari(yontem: SiluetliYontem, c: number): SiluetKutusu[] {
  const m = c * 0.15;
  const w = c * 0.7;
  const x0 = m + 0.6;
  const z0 = m + 0.6;
  const gen = w - 1.2;
  const xe = x0 + gen;
  const ze = z0 + gen;
  const y0 = 0.45;
  const k: SiluetKutusu[] = [[m, 0, m, w, y0, w, 0]]; // temel döşemesi
  /** Gövde + düz çatı (çatı gövdeyi 0,3 m aşar). */
  const govde = (x: number, z: number, sx: number, sz: number, h: number): void => {
    k.push([x, y0, z, sx, h, sz, 3], [x - 0.3, y0 + h, z - 0.3, sx + 0.6, 0.35, sz + 0.6, 4]);
  };
  switch (yontem) {
    case "degirmen": {
      govde(x0, z0, gen * 0.62, gen, 6.5);
      const sx = x0 + gen * 0.66;
      k.push([sx, y0, z0 + gen * 0.12, 4.4, 11, 4.4, SILUET_RENK.metal], [sx - 0.25, y0 + 11, z0 + gen * 0.12 - 0.25, 4.9, 0.45, 4.9, 4]); // silo
      // un çuvalı yığını (cephe önünde piramit: 3 + 2 + 1)
      const bx = x0 + 1.2;
      const bz = ze - 2.2;
      for (let sira = 0; sira < 3; sira++) for (let i = 0; i < 3 - sira; i++) k.push([bx + i * 1.5 + sira * 0.75, y0 + sira * 0.75, bz, 1.4, 0.7, 1.0, SILUET_RENK.cuval]);
      break;
    }
    case "ekmek_firini": {
      govde(x0, z0, gen, gen, 5);
      k.push([x0 + gen * 0.7, y0 + 5.35, z0 + gen * 0.2, 1.6, 6.5, 1.6, SILUET_RENK.tugla], [x0 + gen * 0.7 - 0.2, y0 + 11.85, z0 + gen * 0.2 - 0.2, 2.0, 0.5, 2.0, SILUET_RENK.metal]); // fırın bacası
      k.push([x0 + gen * 0.1, y0, ze, gen * 0.8, 1.0, 0.9, 2]); // tezgâh kenarı
      k.push([x0 + gen * 0.12, y0 + 1.0, ze - 0.05, gen * 0.76, 0.5, 0.2, SILUET_RENK.isik]); // tezgâhın üstünde sıcak ışık şeridi
      break;
    }
    case "kepek_gubresi":
    case "sut_kepekli": {
      govde(x0, z0, gen, gen * 0.8, 3.6);
      k.push([xe - 3.4, y0, z0 + 1, 3.0, 8.5, 3.0, SILUET_RENK.metal], [xe - 3.6, y0 + 8.5, z0 + 0.8, 3.4, 0.4, 3.4, 4]); // yem silosu
      if (yontem === "kepek_gubresi") for (let i = 0; i < 2; i++) k.push([x0 + 1 + i * 2.6, y0, ze - 3.2 + i * 0.6, 3.2 - i * 0.8, 1.1 + i * 0.5, 2.2, SILUET_RENK.toprak]); // gübre yığını
      else for (let i = 0; i < 4; i++) k.push([x0 + 1 + i * 1.2, y0, ze - 2.2, 0.8, 1.2, 0.8, SILUET_RENK.cuval]); // süt bidonları
      break;
    }
    case "cam_firini": {
      govde(x0, z0, gen, gen, 5.5);
      const bx = x0 + gen * 0.2;
      const bz = z0 + gen * 0.3;
      k.push([bx, y0 + 5.85, bz, 2.2, 13, 2.2, SILUET_RENK.tugla], [bx - 0.1, y0 + 18.85, bz - 0.1, 2.4, 0.4, 2.4, SILUET_RENK.isik]); // yüksek baca, ağzında sıcak parıltı
      k.push([x0 + gen * 0.3, y0 + 0.6, ze - 0.05, gen * 0.4, 1.8, 0.25, SILUET_RENK.isik]); // fırın ağzı
      // cam rafı (üretilen cam levhalar): metal taban üzerinde dört dik cam levha (cam yüzey)
      const rx = x0 + gen * 0.62;
      const rz = ze - 3.2;
      k.push([rx - 0.2, y0, rz - 0.2, 4.6, 0.2, 2.2, SILUET_RENK.metal]);
      for (let i = 0; i < 4; i++) k.push([rx + i * 1.1, y0 + 0.2, rz, 0.08, 2.2, 1.8, SILUET_RENK.cam]);
      break;
    }
    case "celik_dograma": {
      govde(x0, z0, gen, gen * 0.75, 6);
      const bx = x0 + 1;
      const bz = ze - 3.4;
      k.push([bx - 0.2, y0, bz - 0.2, 3.4, 0.2, 2.4, SILUET_RENK.metal]); // palet
      // çerçeve yığını: üç düz çerçeve (her biri dört çubuk), üst üste
      for (let f = 0; f < 3; f++) {
        const y = y0 + 0.2 + f * 0.18;
        k.push([bx, y, bz, 3.0, 0.14, 0.25, SILUET_RENK.metal], [bx, y, bz + 1.75, 3.0, 0.14, 0.25, SILUET_RENK.metal], [bx, y, bz, 0.25, 0.14, 2.0, SILUET_RENK.metal], [bx + 2.75, y, bz, 0.25, 0.14, 2.0, SILUET_RENK.metal]);
      }
      k.push([bx + 0.25, y0 + 0.2 + 2 * 0.18 + 0.14, bz + 0.25, 2.5, 0.06, 1.5, SILUET_RENK.cam]); // en üstteki çerçeveye takılı cam: bitmiş pencere
      k.push([x0 + gen * 0.12, y0 + 2.2, z0 + gen * 0.75, gen * 0.76, 1.1, 0.12, SILUET_RENK.cam]); // cephede pencere şeridi
      break;
    }
  }
  return k;
}
