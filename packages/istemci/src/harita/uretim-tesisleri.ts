/** İçerikteki bir yöntem ile sahibinin gerçek tesislerini eşleyen saf veri yardımcısı. */
import type { Icerik, YontemT } from "../komut/tablo";
import type { IsletmeDurumu, IsletmeYapisi } from "./baglanti";

export interface UretimTesisi {
  readonly yapi: Readonly<IsletmeYapisi>;
  readonly hedef: Readonly<YontemT>;
  readonly mevcut?: Readonly<YontemT>;
  readonly durum: "insaat" | "bilgi_eksik" | "kullaniyor" | "uygun";
  /** Yalnız mevcut yöntem seçicisine geçiştir; yöntem açıklığı veya üretim garantisi değildir. */
  readonly gecis: boolean;
  readonly engel?: string;
}

/** null henüz alınmamış işletme bilgisi; [] bilinen, eşleşmeyen tesis listesidir. */
export function uretimTesisleri(ic: Icerik, isletme: IsletmeDurumu | null, hedefYontem: string): UretimTesisi[] | null {
  if (isletme === null) return null;
  const hedef = ic.yontemler.find((y) => y.id === hedefYontem);
  if (hedef === undefined) return [];
  const sonuc: UretimTesisi[] = [];
  const gorulen = new Set<string>();
  for (const yapi of isletme.yapilar) {
    // Büyütülen tesis zaten tamamlanmış tesis satırında bulunur.
    if (yapi.durum === "insaat" && yapi.yukseltme !== undefined) continue;
    const tur = ic.turler.find((t) => t.id === yapi.tur);
    if (tur === undefined || !tur.yontemler.includes(hedef.indeks)) continue;
    const anahtar = JSON.stringify([yapi.anahtar, yapi.bolge ?? null]);
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    const bulunan = ic.yontemler.find((y) => y.id === yapi.yontem);
    const mevcut = bulunan !== undefined && tur.yontemler.includes(bulunan.indeks) ? bulunan : undefined;
    const temel = { yapi, hedef, ...(mevcut === undefined ? {} : { mevcut }) };
    if (yapi.durum === "insaat") {
      sonuc.push({ ...temel, durum: "insaat", gecis: false, engel: "İnşa bitince yöntemleri inceleyebilirsin." });
      continue;
    }
    const kimlik = /^t(?:0|[1-9]\d*)$/.test(yapi.anahtar) && Number.isSafeInteger(Number(yapi.anahtar.slice(1)));
    if (!kimlik || !yapi.bolge || mevcut === undefined) {
      sonuc.push({ ...temel, durum: "bilgi_eksik", gecis: false, engel: "Tesisin kimlik, işletme düğümü veya mevcut yöntem bilgisi alınmadı." });
      continue;
    }
    const yontemSayisi = new Set(tur.yontemler.filter((i) => ic.yontemler.some((y) => y.indeks === i))).size;
    const gecis = yontemSayisi > 1;
    sonuc.push({ ...temel, durum: mevcut.id === hedef.id ? "kullaniyor" : "uygun", gecis,
      ...(gecis ? {} : { engel: "Bu tesis türünün yalnız bir yöntemi var; yöntem seçicisi bulunmuyor." }) });
  }
  return sonuc;
}
