/**
 * Regresyon kalkanı senaryosu (B2): Tarım v1 (B1) içerik/parametre/harita fikstürü (`fikstur-b1/`, sanayi öncesi veri) ile
 * sabit bir komut dizisi oynatılır ve durum özetleri döndürülür. Sanayi parametresi olmayan veriyle çekirdek, B2'den önceki
 * koddan BİREBİR aynı özetleri vermelidir (`sanayi-regresyon.test.ts` altın değerleri B2 öncesi kodla üretilmiştir).
 * Bu dosya yalnızca çekirdek API'sine bağlıdır; B2 öncesi kod ağacında da aynen çalışır.
 */
import { readFileSync } from "node:fs";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";

function oku(ad: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fikstur-b1/${ad}`, import.meta.url), "utf8")) as unknown;
}

/** B2 öncesi (Tarım v1) veri paketi: tarım açık, sanayi yok, elektrik malı yok. */
export function b1Veri(): VeriPaketi {
  return { harita: oku("mini-6.json"), icerik: oku("icerik.json"), param: oku("parametreler.json") } as VeriPaketi;
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
    { t: 1 * SAAT, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "parca_fabrikasi" } },
    { t: 2 * SAAT, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" } },
    { t: 1 * GUN, oyuncu: "a", komut: { tur: "ekim_plani", bolge: "m_ova", ekimPpm: [500_000, 250_000, 250_000] } },
    { t: 1 * GUN, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_sehir", doz: 2 } },
    { t: 2 * GUN, oyuncu: "a", komut: { tur: "arastir", teknoloji: "derin_madencilik" } },
    { t: 2 * GUN, oyuncu: "a", komut: { tur: "birlik_uret", bolge: "m_dag", birlik: "piyade_tumeni", adet: 1 } },
    { t: 3 * GUN, oyuncu: "a", komut: { tur: "kenar_gelistir", kenar: 4 } },
    { t: 3 * GUN, oyuncu: "b", komut: { tur: "vergi_ayarla", oranPpm: 150_000 } },
    { t: 4 * GUN, oyuncu: "a", komut: { tur: "askeri_rezerv", oranPpm: 100_000 } },
    { t: 5 * GUN, oyuncu: "a", komut: { tur: "ekim_plani", bolge: "m_sehir", ekimPpm: [0, 400_000, 600_000] } },
    { t: 6 * GUN, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_ova", doz: 1 } },
    { t: 7 * GUN, oyuncu: "a", komut: { tur: "savunma_emri", bolge: "m_ova", durus: "savunma" } },
  ];
}

/** Senaryoyu oynatır; 3., 7. ve 12. günlerin sonundaki durum özetlerini döndürür. */
export function senaryoOzetleri(veri: VeriPaketi = b1Veri(), tohum = 5): string[] {
  const s = Simulasyon.olustur(veri, tohum);
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit", "m_dag", "m_sehir"] } });
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_col"] } });
  const hepsi = adimlar();
  const ozetler: string[] = [];
  let i = 0;
  for (const bitis of [3 * GUN + 6 * SAAT, 7 * GUN + 6 * SAAT, 12 * GUN + 6 * SAAT]) {
    while (i < hepsi.length && (hepsi[i] as Adim).t <= bitis) {
      const a = hepsi[i] as Adim;
      const r = s.uygula({ t: a.t, oyuncu: a.oyuncu, komut: a.komut });
      if (!r.tamam) throw new Error(`regresyon senaryosu komutu basarisiz (${a.komut.tur}): ${r.hata}`);
      i++;
    }
    s.calistirKadar(bitis);
    ozetler.push(s.durumOzeti());
  }
  return ozetler;
}
