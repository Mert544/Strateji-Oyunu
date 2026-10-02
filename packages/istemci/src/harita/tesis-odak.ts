/** Kendi tamamlanmış tesisinin gerçek hücre çerçevesi ve üretim durumu (saf). */
import type { Icerik } from "../komut/tablo";
import type { IlceSahipligi, YapiKaydi } from "./baglanti";
import { cerceveBirlestir } from "./geometri";
import { hucreSiniri, idCoz } from "./hucre";
import type { Sinir } from "./hucre";

function tesisKimligi(y: YapiKaydi, anahtar: string): boolean {
  return /^t(?:0|[1-9]\d*)$/.test(anahtar) && Number.isSafeInteger(Number(anahtar.slice(1)))
    && y.anahtar === anahtar && y.durum === "tesis" && y.id === Number(anahtar.slice(1));
}

/** Özet hücre sayısından veya başka yapılardan çerçeve türetmez; bozuk/eksik ayak izi bilinmiyordur. */
export function tesisOdakCercevesi(s: IlceSahipligi | null, ilce: string, ben: string, anahtar: string): Sinir | null {
  if (!s || s.ilce !== ilce) return null;
  const eslesen = s.yapilar?.filter((y) => y.anahtar === anahtar) ?? [];
  const y = eslesen[0];
  if (eslesen.length !== 1 || !y || y.sahip !== ben || !tesisKimligi(y, anahtar) || y.hucreler.length === 0) return null;
  let sinir: Sinir | null = null;
  const gorulen = new Set<string>();
  for (const id of y.hucreler) {
    const h = s.hucreler.get(id);
    const c = idCoz(id);
    if (!c || id !== `${c.x}:${c.y}` || gorulen.has(id) || h?.sahip !== ben || h.tesis !== y.id) return null;
    gorulen.add(id);
    const b = hucreSiniri(c.x, c.y);
    sinir = sinir ? cerceveBirlestir(sinir, b) : b;
  }
  return sinir;
}

/** Bilinmeyen/başkasının durumunu veya üretimsiz yardımcı yapıyı pasif üretim saymaz. */
export function uretimDurduruldu(y: YapiKaydi, ben: string, ic: Icerik): boolean {
  if (y.sahip !== ben || y.aktif !== false || !tesisKimligi(y, y.anahtar) || y.tur === undefined || y.yontem === undefined) return false;
  const tur = ic.turler[ic.turIdx[y.tur] ?? -1];
  const yontem = ic.yontemler[ic.yontemIdx[y.yontem] ?? -1];
  return tur !== undefined && yontem !== undefined && tur.yontemler.includes(yontem.indeks)
    && yontem.cikti.some(([, miktar]) => miktar > 0);
}
