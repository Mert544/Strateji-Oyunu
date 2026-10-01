/**
 * Kasa girişi ÖDENEN orana bağlıdır (GZ-25, şartname §5.5 "ödenene ölçekle"; A3 para sızıntısı taraması B3).
 * Hazine 0 ve gider > gelir iken oyuncu nominal giderin yalnız `odemeGucuPpm` kadarını öder; kasa girişi (arazi vergisi payı, ithalat makası/komisyonu,
 * şebeke bedeli payı) aynı orana iner, ödenmeyen kısım lavaboda yanar, `borcSilme` aynen kalır. Hazine > 0 iken hiçbir şey değişmez.
 */
import { describe, expect, it } from "vitest";
import type { Simulasyon } from "../src/motor";
import { kasaOranlariOdenene } from "../src/mulk/kasa";
import { sayacOlcekli } from "../src/paraSayac";
import { anlikHazine, hazineEkle } from "../src/stok";
import { PPM, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, ParaDurumu } from "../src/tipler";
import { g6Bolge, g6Dunya, g6KorunumTutar, g6MulkVeri, mulkParam } from "./g6-yardimci";
import { tamam } from "./mulk-yardimci";

const GIRDI_ITHALATI = [
  { mal: "un", oranSaat: 90_000 },
  { mal: "tahil", oranSaat: 100_000 },
];

/** Gelir (≈ 1,1 mili-₺/sa x 10^6) gideri (≈ 2,5 x 10^6) karşılamaz: ödeme gücü ≈ %46. */
const IHRACAT_ORAN_SAAT = 10_000;

/** Vergi kaynağı belirgin (haftalık %10), şebeke ve ithalat açık. */
function veri(sebekeKasaPayiPpm?: number): CekirdekVeriPaketi {
  return g6MulkVeri({}, (v) => {
    v.param.mulk!.araziVergisiHaftalikPpm = 100_000;
    if (sebekeKasaPayiPpm !== undefined) (mulkParam(v)!["sebeke"] as { kasaPayiPpm: number }).kasaPayiPpm = sebekeKasaPayiPpm;
  });
}

interface Olcum {
  /** Kasa girişi toplamları (SAAT ölçekli). */
  kasa: { vergi: bigint; ithalat: bigint; sebeke: bigint };
  /** Kasaya girmeyen (yanan) kısım. */
  lavabo: { vergi: bigint; ithalat: bigint; sebeke: bigint; isletme: bigint };
  borcSilme: bigint;
  /** Σ musluk (borcSilme HARİÇ) - hazine: oyuncunun GERÇEKTEN ödediği toplam (tek oyunculu dünya, kasa çıkışı yok; ≡ lavabo + kasa - borcSilme). */
  odenen: bigint;
}

function olc(s: Simulasyon): Olcum {
  g6KorunumTutar(s, "olc"); // uzlaştırır ve korunumu denetler
  const p = s.dunya.mulk!.para as ParaDurumu;
  const k = { vergi: 0n, ithalat: 0n, sebeke: 0n };
  for (const kasa of p.kasalar) {
    const g = kasa.giris as unknown as Record<string, { n: number; a: number } | undefined>;
    if (g["vergi"] !== undefined) k.vergi += sayacOlcekli(g["vergi"]);
    for (const a of ["ithalatMakas", "ithalatKomisyon"]) if (g[a] !== undefined) k.ithalat += sayacOlcekli(g[a]!);
    if (g["sebeke"] !== undefined) k.sebeke += sayacOlcekli(g["sebeke"]);
  }
  const l = p.lavabo as unknown as Record<string, { n: number; a: number } | undefined>;
  const sc = (a: string): bigint => (l[a] === undefined ? 0n : sayacOlcekli(l[a]!));
  let musluk = 0n;
  for (const kalem of Object.keys(p.musluk)) musluk += sayacOlcekli((p.musluk as unknown as Record<string, { n: number; a: number }>)[kalem]!);
  const h = BigInt(s.dunya.oyuncular[0]!.hazine.miktar) * BigInt(SAAT) + BigInt(s.dunya.oyuncular[0]!.hazine.artik);
  return {
    kasa: k,
    lavabo: { vergi: sc("araziVergisi"), ithalat: sc("ithalatNpc"), sebeke: sc("sebeke"), isletme: sc("isletme") },
    borcSilme: sayacOlcekli(p.musluk.borcSilme),
    odenen: musluk - sayacOlcekli(p.musluk.borcSilme) - h,
  };
}

function sifirHazineKosu(saat: number, sebekeKasaPayiPpm?: number): { s: Simulasyon; baslangic: Olcum; adimlar: Olcum[] } {
  const s = g6Dunya({
    veri: veri(sebekeKasaPayiPpm),
    kur: (y) => {
      y.yerlestir("gida_fabrikasi", "degirmen");
      y.yerlestir("gida_fabrikasi", "ekmek_firini");
    },
    ithalat: GIRDI_ITHALATI,
    bekleMs: 6 * SAAT,
  });
  expect(hazineEkle(s.dunya, "a", -anlikHazine(s.dunya, "a"))).toBe(true);
  tamam(s, "a", { tur: "ticaret_emri", bolge: g6Bolge(s, "a"), mal: "celik", yon: "ihracat", oranSaat: IHRACAT_ORAN_SAAT });
  s.calistirKadar(s.dunya.zaman + SAAT); // boşaltma çözüm tetiklemez: ilk saatlik çözüm yeni hazineyle akışları yeniden yazar; ölçüm ondan sonra başlar
  const baslangic = olc(s);
  const adimlar: Olcum[] = [];
  for (let i = 0; i < saat; i++) {
    s.calistirKadar(s.dunya.zaman + SAAT);
    adimlar.push(olc(s));
  }
  return { s, baslangic, adimlar };
}

describe("saf ölçekleme: kasaOranlariOdenene", () => {
  const oranlar = [
    { sahip: "ilce_a", kalem: "vergi" as const, oran: 1_001 },
    { sahip: "ilce_a", kalem: "sebeke" as const, oran: 7 },
  ];
  it("PPM: dizi AYNEN döner (aynı nesne); < PPM: floor ölçek, sıra ve anahtarlar aynı; 0: tümü 0", () => {
    expect(kasaOranlariOdenene(oranlar, PPM)).toBe(oranlar);
    const yari = kasaOranlariOdenene(oranlar, 500_000);
    expect(yari).toEqual([
      { sahip: "ilce_a", kalem: "vergi", oran: 500 },
      { sahip: "ilce_a", kalem: "sebeke", oran: 3 },
    ]);
    expect(oranlar[0]!.oran).toBe(1_001); // girdi değişmez
    expect(kasaOranlariOdenene(oranlar, 0).every((e) => e.oran === 0)).toBe(true);
  });
});

describe("hazine 0: kasa girişi ödenen orandan fazla olamaz", () => {
  const k = sifirHazineKosu(36);
  const son = k.adimlar[k.adimlar.length - 1]!;

  it("senaryo gerçekten ödeme gücü kısıtlı: borç silinir, vergi ve şebeke kasaya girer", () => {
    expect(son.borcSilme - k.baslangic.borcSilme).toBeGreaterThan(0n);
    expect(son.kasa.vergi - k.baslangic.kasa.vergi).toBeGreaterThan(0n);
    expect(son.kasa.sebeke - k.baslangic.kasa.sebeke).toBeGreaterThan(0n);
  });

  it("toplam: Σ kasa girişi <= Σ ödenen (borcSilme <= lavabo: ödenmeyen kısım kasaya değil lavaboya düşer)", () => {
    for (const [i, a] of k.adimlar.entries()) {
      const kasa = a.kasa.vergi + a.kasa.ithalat + a.kasa.sebeke - (k.baslangic.kasa.vergi + k.baslangic.kasa.ithalat + k.baslangic.kasa.sebeke);
      const odenen = a.odenen - k.baslangic.odenen;
      expect(kasa <= odenen, `saat ${i + 1}: kasa ${kasa} > ödenen ${odenen}`).toBe(true);
    }
  });

  it("kalem başına: kasa payı oranı <= genel ödenen oran (vergi, ithalat, şebeke; 6 saatlik pencerelerde)", () => {
    const pencere = 6;
    for (let i = pencere; i < k.adimlar.length; i += pencere) {
      const a = k.adimlar[i]!;
      const b = k.adimlar[i - pencere]!;
      const nominal = (a.odenen - b.odenen) + (a.borcSilme - b.borcSilme);
      const odenen = a.odenen - b.odenen;
      for (const kalem of ["vergi", "ithalat", "sebeke"] as const) {
        const kasa = a.kasa[kalem] - b.kasa[kalem];
        const lav = a.lavabo[kalem] - b.lavabo[kalem];
        // kasa / (kasa + lavabo) <= odenen / nominal  <=>  kasa * nominal <= (kasa + lavabo) * odenen
        expect(kasa * nominal <= (kasa + lav) * odenen, `pencere ${i}: ${kalem} kasa ${kasa} lavabo ${lav} ödenen ${odenen}/${nominal}`).toBe(true);
      }
    }
  });

  it("kasa payı tam (şebeke bedelinin %100'ü kasaya; ödenen oran kasa payının altında): Σ kasa girişi <= Σ ödenen yine tutar", () => {
    const a = sifirHazineKosu(36, 1_000_000);
    const kasa = (o: Olcum) => o.kasa.vergi + o.kasa.ithalat + o.kasa.sebeke;
    for (const [i, o] of a.adimlar.entries()) {
      const odenen = o.odenen - a.baslangic.odenen;
      const nominal = odenen + (o.borcSilme - a.baslangic.borcSilme);
      expect(odenen < nominal, `saat ${i + 1}: ödeme gücü kısıtlı`).toBe(true);
      expect(kasa(o) - kasa(a.baslangic) <= odenen, `saat ${i + 1}`).toBe(true);
    }
    const son2 = a.adimlar[a.adimlar.length - 1]!;
    expect(son2.borcSilme - a.baslangic.borcSilme).toBeGreaterThan(0n); // ödeme gücü gerçekten kısıtlı
    expect(kasa(son2) - kasa(a.baslangic)).toBeGreaterThan(0n); // ve kasaya yine de para giriyor (ölçek 0 değil)
  });

  it("korunum tam (olc içinde her saat) ve aynı koşu iki kez aynı özet", () => {
    expect(sifirHazineKosu(12).s.durumOzeti()).toBe(sifirHazineKosu(12).s.durumOzeti());
  });
});
