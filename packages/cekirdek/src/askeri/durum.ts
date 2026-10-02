import { GUN, SAAT } from "../tipler";
import type { DerlenmisIcerik, Dunya } from "../tipler";

/** Uyku saatlik tık sınırında başlar; bayrak kapalıyken eski askerî ekonomi aynen kalır. */
export function askeriUykudaMi(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: string): boolean {
  if (ic.mulk === undefined || ic.param.askeri.eskiya?.etkin !== true) return false;
  const mo = d.mulk?.oyuncular.find((x) => x.id === oyuncu);
  if (mo === undefined) return false;
  const esik = mo.sonEtkinlik + ic.mulk.p.hareketsizlik.uykuGun * GUN;
  return Math.floor(d.zaman / SAAT) * SAAT >= esik;
}

/** Kazanılmış revir hakkı yeni üretim için kapasite ayırır; dönüş kapasite düşüşüyle silinmez. */
export function revirKapasiteRezervi(d: Readonly<Dunya>, dugum: string, oyuncu: string): number {
  let toplam = 0;
  for (const baskin of d.baskinlar ?? []) for (const s of baskin.sonuc?.oyuncular ?? []) {
    if (s.oyuncu === oyuncu && s.revir?.dugum === dugum && s.revir.evre === "bekliyor") {
      for (const [, adet] of s.revir.birlikler) toplam += adet;
    }
  }
  return toplam;
}
