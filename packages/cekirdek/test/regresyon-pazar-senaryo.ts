/**
 * Pazar (B3) regresyon kalkanı senaryosu: B3 öncesi (Sanayi v1) içerik/parametre/harita fikstürü (`fikstur-b2/`: pazar v1
 * alanları, liman tanımı ve kıtlık yok) ile sabit bir komut dizisi oynatılır ve durum özetleri döndürülür. Pazar parametreleri
 * olmayan veriyle çekirdek, B3'ten önceki koddan BİREBİR aynı özetleri vermelidir (`pazar-regresyon.test.ts` altın değerleri
 * B3 öncesi kodla üretilmiştir). Senaryo ticaret emirlerini, ticaret anlaşmasını ve yaptırımı (üç makas kümesi) kapsar.
 * Bu dosya yalnızca çekirdek API'sine bağlıdır; B3 öncesi kod ağacında da aynen çalışır.
 */
import { readFileSync } from "node:fs";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";

function oku(ad: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fikstur-b2/${ad}`, import.meta.url), "utf8")) as unknown;
}

/** B3 öncesi (Sanayi v1) veri paketi, mini-6 haritasıyla: tarım ve sanayi açık, pazar v1 yok. `zengin`: hazine bol (komutlar reddedilmez). */
export function b2Veri(zengin = true): VeriPaketi {
  const v = { harita: oku("mini-6.json"), icerik: oku("icerik.json"), param: oku("parametreler.json") } as VeriPaketi;
  if (zengin) v.param.baslangic.hazine = 5_000_000_000;
  return v;
}

/** B3 öncesi veri paketi, sentetik-50 haritasıyla (bot koşuları için). */
export function b2SentetikVeri(): VeriPaketi {
  return { harita: oku("sentetik-50.json"), icerik: oku("icerik.json"), param: oku("parametreler.json") } as VeriPaketi;
}

interface Adim {
  t: number;
  oyuncu: string;
  komut: Komut;
}

function adimlar(): Adim[] {
  return [
    { t: 0, oyuncu: "a", komut: { tur: "vergi_ayarla", oranPpm: 250_000 } },
    { t: 0, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 60_000 } },
    { t: 0, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "gubre", yon: "ithalat", oranSaat: 20_000 } },
    { t: 0, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "petrol", yon: "ithalat", oranSaat: 30_000 } },
    { t: 1 * SAAT, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "parca_fabrikasi" } },
    { t: 2 * SAAT, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" } },
    { t: 1 * GUN, oyuncu: "a", komut: { tur: "ekim_plani", bolge: "m_ova", ekimPpm: [500_000, 250_000, 250_000] } },
    { t: 1 * GUN, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_sehir", doz: 2 } },
    { t: 2 * GUN, oyuncu: "a", komut: { tur: "arastir", teknoloji: "derin_madencilik" } },
    { t: 2 * GUN, oyuncu: "a", komut: { tur: "birlik_uret", bolge: "m_dag", birlik: "piyade_tumeni", adet: 1 } },
    { t: 3 * GUN, oyuncu: "a", komut: { tur: "kenar_gelistir", kenar: 4 } },
    { t: 3 * GUN, oyuncu: "b", komut: { tur: "vergi_ayarla", oranPpm: 150_000 } },
    // Makas kümesi 2: ticaret anlaşması (iki taraf teklif edince aktif).
    { t: 4 * GUN, oyuncu: "a", komut: { tur: "anlasma_teklif", karsi: "b", anlasma: "ticaret" } },
    { t: 4 * GUN, oyuncu: "b", komut: { tur: "anlasma_teklif", karsi: "a", anlasma: "ticaret" } },
    { t: 4 * GUN, oyuncu: "a", komut: { tur: "askeri_rezerv", oranPpm: 100_000 } },
    { t: 5 * GUN, oyuncu: "a", komut: { tur: "ekim_plani", bolge: "m_sehir", ekimPpm: [0, 400_000, 600_000] } },
    { t: 5 * GUN, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "celik", yon: "ihracat", oranSaat: 40_000 } },
    // Makas kümesi 3: yaptırım (anlaşmadan öncelikli).
    { t: 6 * GUN, oyuncu: "b", komut: { tur: "yaptirim", hedef: "a", aktif: true } },
    { t: 6 * GUN, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_ova", doz: 1 } },
    { t: 7 * GUN, oyuncu: "a", komut: { tur: "savunma_emri", bolge: "m_ova", durus: "savunma" } },
    { t: 9 * GUN, oyuncu: "b", komut: { tur: "yaptirim", hedef: "a", aktif: false } },
    { t: 10 * GUN, oyuncu: "a", komut: { tur: "anlasma_feshet", karsi: "b", anlasma: "ticaret" } },
    { t: 10 * GUN, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "elektronik", yon: "ihracat", oranSaat: 20_000 } },
    { t: 11 * GUN, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 120_000 } },
  ];
}

/** Senaryoyu oynatır; 3., 7., 12. ve 16. günlerin sonundaki durum özetlerini döndürür. */
export function pazarSenaryoOzetleri(veri: VeriPaketi = b2Veri(), tohum = 5, sert = true, sim?: (s: Simulasyon) => void): string[] {
  const s = Simulasyon.olustur(veri, tohum);
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit", "m_dag", "m_sehir"] } });
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_col"] } });
  const hepsi = adimlar();
  const ozetler: string[] = [];
  let i = 0;
  for (const bitis of [3 * GUN + 6 * SAAT, 7 * GUN + 6 * SAAT, 12 * GUN + 6 * SAAT, 16 * GUN + 6 * SAAT]) {
    while (i < hepsi.length && (hepsi[i] as Adim).t <= bitis) {
      const a = hepsi[i] as Adim;
      const r = s.uygula({ t: a.t, oyuncu: a.oyuncu, komut: a.komut });
      // sert = false: yoksul hazine varyantı (ithalat kısıtlama ve ödeme gücü yolları); reddedilen komutlar da deterministiktir.
      if (!r.tamam && sert) throw new Error(`pazar regresyon senaryosu komutu basarisiz (${a.komut.tur}): ${r.hata}`);
      i++;
    }
    s.calistirKadar(bitis);
    ozetler.push(s.durumOzeti());
  }
  sim?.(s);
  return ozetler;
}
