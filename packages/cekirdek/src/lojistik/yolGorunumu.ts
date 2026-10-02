/** Sahip iç sevkiyatının saf yol/kapasite görünümü; küresel kullanım hiçbir zaman paylaşılmaz. */
import type { DerlenmisIcerik, Dunya, KenarDurumu, LojistikKenarGorunumu, LojistikYolGorunumu } from "../tipler";
import { MULKSUZ_PAKET } from "../mulksuz";

/**
 * Bütün sahip akışları bir kez taranır. Kapasite güncel; yük son planın bütün mal/iki yön toplamıdır.
 * Bir sahip akışının kanıtı eksikse eksik toplam üretmek yerine yeni görünümün tamamı bilinmiyor kalır.
 */
export function lojistikYolGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: string): LojistikYolGorunumu | undefined {
  if (MULKSUZ_PAKET || d.mulk === undefined || ic.mulk === undefined) return undefined;
  const akislar: LojistikYolGorunumu["akislar"] = [];
  const yukler = new Map<number, number>();
  const merkez = (i: number): boolean => {
    const b = d.bolgeler[i];
    return Number.isSafeInteger(i) && i >= 0 && b !== undefined && b.merkez === undefined && ic.harita.bolgeler[i]?.id === b.id;
  };
  const kenar = (i: number): KenarDurumu | undefined => {
    const k = d.kenarlar[i];
    if (!Number.isSafeInteger(i) || i < 0 || k === undefined || k.indeks !== i || !merkez(k.a) || !merkez(k.b) || k.a === k.b) return undefined;
    if (k.tur !== "kara" && k.tur !== "deniz" && k.tur !== "hava") return undefined;
    if (!Number.isSafeInteger(k.sureMs) || k.sureMs < 0 || !Number.isSafeInteger(k.kapasiteSaat) || k.kapasiteSaat < 0) return undefined;
    return k;
  };
  for (const [indeks, a] of d.lojistik.akislar.entries()) {
    if (a.sahip !== oyuncu) continue;
    const kaynak = d.bolgeler[a.kaynak];
    const hedef = d.bolgeler[a.hedef];
    if (kaynak?.sahip !== oyuncu || hedef?.sahip !== oyuncu || kaynak.merkez === undefined || hedef.merkez === undefined) continue;
    // Bu andan sonra akış sahip kapsamındadır: bozuk kayıt sahibi toplamını eksik göstermek için atlanmaz.
    if (!Number.isSafeInteger(a.oranSaat) || a.oranSaat < 0 || !Number.isSafeInteger(a.sureMs) || a.sureMs < 0 || !Array.isArray(a.yol)) return undefined;
    const mal = ic.mallar[a.mal];
    if (!Number.isSafeInteger(a.mal) || mal === undefined || !merkez(kaynak.merkez) || !merkez(hedef.merkez)) return undefined;
    let konum = kaynak.merkez;
    let sure = 0;
    for (const i of a.yol) {
      const k = kenar(i);
      if (k === undefined) return undefined;
      if (k.a === konum) konum = k.b;
      else if (k.b === konum) konum = k.a;
      else return undefined;
      sure += k.sureMs;
      if (!Number.isSafeInteger(sure)) return undefined;
    }
    // Boş yol ancak gerçek aynı-merkez havuzudur. Uç kopması veya süre uyuşmazlığı sahte havuz olmaz.
    if (konum !== hedef.merkez || sure !== a.sureMs) return undefined;
    if (a.oranSaat === 0) continue;
    akislar.push({ indeks, yol: [...a.yol] });
    for (const i of a.yol) {
      const toplam = (yukler.get(i) ?? 0) + a.oranSaat;
      if (!Number.isSafeInteger(toplam)) return undefined;
      yukler.set(i, toplam);
    }
  }
  const kenarlar: LojistikKenarGorunumu[] = [];
  for (const [indeks, kendiYukMiliSaat] of [...yukler.entries()].sort((a, b) => a[0] - b[0])) {
    const k = d.kenarlar[indeks]!;
    kenarlar.push({ indeks, a: d.bolgeler[k.a]!.id, b: d.bolgeler[k.b]!.id, tur: k.tur, sureMs: k.sureMs,
      kapasiteMiliSaat: k.kapasiteSaat, kendiYukMiliSaat });
  }
  return { guncellemeBekliyor: d.lojistik.kirli, akislar, kenarlar };
}
