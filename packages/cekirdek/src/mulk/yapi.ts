/**
 * Ek yapılar (docs/11 §7.3; `parametreler.mulk.ekYapilar`): Ambar, Ticaret ofisi, Muhtarlık, Konut, Garaj, Atölye-Lab.
 *
 * `icerik.json`'da tesis türü değillerdir (üretim yapmazlar; bölge kipi içeriği ve durum özeti etkilenmez). İnşaat, hücreli
 * inşaat mekanizmasını (`tesis_insa_hucre`) kullanır; bitince işletme düğümünün `ekYapilar` listesine bir `EkYapiDurumu`
 * eklenir ve kapladığı hücrelerin `tesis` alanı onun (dünya genelinde benzersiz) kimliğidir.
 *
 * Etkiler (yalnız tanımda ilgili alan varsa):
 * - Ambar `depoKapasiteEkiMili`: biten her yapı, işletmenin depolanabilir her malının stok kapasitesini bu kadar artırır.
 * - Ticaret ofisi: `komisyonIndirimPpm` (komisyonun göreli azalması), `makasIndirimPpm` (makasın PPM'e doğru kapanan payı) ve
 *   `emirYuvasi` (ticaret emri yuvası); yapı başına toplanır, indirimler PPM ile sınırlanır.
 * - Muhtarlık, Konut, Garaj, Atölye-Lab: şimdilik yer tutucu (kayıt; etkisiz).
 */
import { icerikTablosu } from "../ekonomi/tablo";
import { carpBol } from "../sabit";
import { stokEsikPlanla, stokUzlastir } from "../stok";
import { PPM } from "../tipler";
import type { Baglam, BolgeDurumu, DerlenmisEkYapi, DerlenmisIcerik, Dunya, EkYapiDurumu, InsaatDurumu } from "../tipler";
import { MULKSUZ_PAKET } from "../mulksuz";
import { dukkanVarsayilani } from "./dukkanKomut";
import { hucreBul } from "./durum";

/** Düğümde biten ek yapı sayısı (türe göre). */
export function ekYapiSayisi(b: BolgeDurumu, tur: string): number {
  let n = 0;
  for (const y of b.ekYapilar ?? []) if (y.tur === tur) n++;
  return n;
}

/** Ek yapı tanımındaki sayısal etki alanlarını düğümdeki biten yapılar üzerinden toplar. */
export function ekYapiToplami(ic: DerlenmisIcerik, b: BolgeDurumu, alan: "komisyonIndirimPpm" | "makasIndirimPpm" | "emirYuvasi" | "depoKapasiteEkiMili" | "birlikKapasitesi"): number {
  const mk = ic.mulk;
  if (mk === undefined || b.ekYapilar === undefined) return 0;
  let t = 0;
  for (const y of b.ekYapilar) {
    const i = mk.ekYapiIndeks.get(y.tur);
    if (i !== undefined) t += (mk.ekYapilar[i] as DerlenmisEkYapi)[alan];
  }
  return t;
}

/** İşletme düğümünün ticaret emri yuvası: temel + Ticaret ofisi ekleri. Parametre yoksa sınırsız (Number.MAX_SAFE_INTEGER). */
export function ticaretEmirYuvasi(ic: DerlenmisIcerik, b: BolgeDurumu): number {
  const mk = ic.mulk;
  if (mk === undefined || b.merkez === undefined || mk.p.temelEmirYuvasi === undefined) return Number.MAX_SAFE_INTEGER;
  return mk.p.temelEmirYuvasi + ekYapiToplami(ic, b, "emirYuvasi");
}

/** Yeni bir ticaret emri için işletmenin yuvası dolu mu? Doluysa hata iletisi, değilse null. */
export function ticaretEmirYuvasiHatasi(ic: DerlenmisIcerik, b: BolgeDurumu): string | null {
  const yuva = ticaretEmirYuvasi(ic, b);
  return b.ticaretEmirleri.length >= yuva ? `ticaret emri yuvasi dolu (${yuva}); Ticaret ofisi yuva ekler` : null;
}

/** Biten ek yapı tamamlanır: kayıt, hücrelerin geçişi ve etkiler. `insaat.ekYapi` ve `insaat.hucreler` tanımlı olmalı. */
export function ekYapiTamamla(d: Dunya, ctx: Baglam, insaat: InsaatDurumu): void {
  const mk = ctx.ic.mulk;
  const b = d.bolgeler[insaat.bolge];
  const tur = insaat.ekYapi;
  const hucreler = insaat.hucreler;
  if (mk === undefined || b === undefined || tur === undefined || hucreler === undefined) return;
  const i = mk.ekYapiIndeks.get(tur);
  if (i === undefined) return;
  const tanim = mk.ekYapilar[i] as DerlenmisEkYapi;
  const id = ctx.yeniKimlik(d);
  const yeniYapi: EkYapiDurumu = { id, tur, hucreler: [...hucreler] };
  if (!MULKSUZ_PAKET && tur === "dukkan") {
    // Dükkân (G7; sartname §7.1, §7.2): boş raf, markasız; `baslangic` = yapı komutunun anı, `kurulus` = tamamlanma anı (bir kez yazılır).
    const dk = dukkanVarsayilani(mk, insaat.dukkanTuru, insaat.olcek ?? 0, insaat.baslangic ?? d.zaman, d.zaman);
    if (dk !== undefined) yeniYapi.dukkan = dk;
  }
  (b.ekYapilar ??= []).push(yeniYapi);
  for (const hid of hucreler) {
    const h = hucreBul(d, hid);
    if (h === undefined) continue;
    delete h.insaat;
    h.tesis = id;
  }
  if (tanim.depoKapasiteEkiMili > 0) {
    const tb = icerikTablosu(ctx.ic);
    for (let m = 0; m < tb.malSayisi; m++) {
      if (tb.depolanamaz[m] === true) continue;
      // uzlaştır (eski kapasiteyle) -> kapasite artır -> sürüm++ -> eşik yeniden planlanır (dolma anı değişir)
      stokUzlastir(d, b.indeks, m);
      const s = b.stoklar[m]!;
      s.kapasite += tanim.depoKapasiteEkiMili;
      s.surum++;
      stokEsikPlanla(d, ctx, b.indeks, m);
    }
  }
}

/** Ticaret çarpanlarının yapı etkisi (Ticaret ofisi): komisyon ve makas indirimi. */
export interface TicaretIndirimi {
  komisyonIndirimPpm: number;
  makasIndirimPpm: number;
}

/** İşletme düğümünün Ticaret ofisi indirimleri (her biri [0, PPM]). Düğümde yapı yoksa ikisi de 0. */
export function ticaretIndirimi(ic: DerlenmisIcerik, b: BolgeDurumu): TicaretIndirimi {
  const k = ekYapiToplami(ic, b, "komisyonIndirimPpm");
  const m = ekYapiToplami(ic, b, "makasIndirimPpm");
  return { komisyonIndirimPpm: k > PPM ? PPM : k, makasIndirimPpm: m > PPM ? PPM : m };
}

/** `deger`'i `hedef`'e doğru `oranPpm` kadar yaklaştırır (aşağı yuvarlanan pay hedefe doğru eklenir). */
export function hedefeYaklastir(deger: number, hedef: number, oranPpm: number): number {
  if (oranPpm <= 0 || deger === hedef) return deger;
  const fark = deger > hedef ? deger - hedef : hedef - deger;
  const pay = carpBol(fark, oranPpm, PPM);
  return deger > hedef ? deger - pay : deger + pay;
}
