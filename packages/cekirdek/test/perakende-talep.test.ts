/**
 * G7-2 (sartname §6.5, §16.2 `perakende-talep`): talep Q'nun DÜNYA üzerinden kurulması: nüfus eşdeğeri (iki yol), hücre sınıfı karışımının etkisizliği, takvim ayı, bayram penceresi
 * sınırları ve toplam-sabit, `talep1000Saat`'in dükkânsız dünyayı değiştirmemesi. Saf formüller (`yerelTalep`, `bayramCarpani`) `yerel-pazar.test.ts`'tedir (K4).
 */
import { describe, expect, it } from "vitest";
import { takvimAyi } from "../src/tarim/iklim";
import { yerelPazarCoz, yerelPazarGorunumu } from "../src/mulk/perakende";
import type { Simulasyon } from "../src/motor";
import { GUN } from "../src/tipler";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { dukkanEkle, perakendeVeri } from "./perakende-yardimci";
import { mulkSim } from "./mulk-yardimci";

const OVA = "sn_m_ova_merkez";
const LIMAN = "sn_m_liman_merkez";

/** Tek mal (ekmek) talebi; takvim nötr, bayram yok; kasa büyük (Q'yu kırpmaz). `duzenle` ile bozulur. */
function veri(duzenle?: (v: CekirdekVeriPaketi, pr: NonNullable<CekirdekVeriPaketi["param"]["mulk"]>["perakende"] & object) => void): CekirdekVeriPaketi {
  return perakendeVeri((v, pr) => {
    pr.talep.yerelOlcek = 10;
    pr.talep.ilceSinifiNufus = { kirsal: 10_000, kasaba: 20_000, sehir: 40_000 };
    pr.talep.talep1000Saat = { ekmek: 60_000 };
    pr.talep.gruplar = { gida: { mallar: ["ekmek"], takvimPpm: Array.from({ length: 12 }, () => 1_000_000) } };
    pr.talep.bayramGunleri = [];
    v.param.mulk!.yeniOyuncu.baslangicStok = { gida: 200_000, ekmek: 50_000_000 };
    duzenle?.(v, pr);
  });
}

function sim(v: CekirdekVeriPaketi, ilce = OVA): Simulasyon {
  const s = mulkSim(["a"], v);
  dukkanEkle(s, "a", [{ mal: "ekmek" }], "firin", 0, ilce);
  return s;
}
const q = (s: Simulasyon, ilce = OVA): number => yerelPazarCoz(s.dunya, s.baglam)!.talep.get(ilce)!.get("ekmek")!;

describe("nüfus eşdeğeri: Q ~ nufus (iki yol)", () => {
  it("fikstürde nufus varsa Q = taban x nufus; nufus ikiye katlanınca Q ikiye katlanır (±1); taban = floor(talep1000Saat x yerelOlcek x nufus / 1000)", () => {
    const q40 = q(sim(veri((v) => ((v.parsel!.ilceler.find((c) => c.id === OVA) as { nufus?: number }).nufus = 40_000))));
    const q80 = q(sim(veri((v) => ((v.parsel!.ilceler.find((c) => c.id === OVA) as { nufus?: number }).nufus = 80_000))));
    expect(q40).toBe(Math.floor((60_000 * 10 * 40_000) / 1000));
    expect(Math.abs(q80 - 2 * q40)).toBeLessThanOrEqual(1);
  });

  it("nufus yoksa eşdeğer = ilceSinifiNufus[sinif]; aynı değer fikstüre nufus olarak yazılırsa Q BİREBİR aynı (tutarlılık); sınıf farklıysa Q farklı", () => {
    const sinifi = (v: CekirdekVeriPaketi): "kirsal" | "kasaba" | "sehir" => v.parsel!.ilceler.find((c) => c.id === OVA)!.sinif;
    const yedek = sim(veri());
    const v0 = veri();
    const sabit = v0.param.mulk!.perakende!.talep.ilceSinifiNufus[sinifi(v0)];
    const acik = sim(veri((v) => ((v.parsel!.ilceler.find((c) => c.id === OVA) as { nufus?: number }).nufus = sabit)));
    expect(q(yedek)).toBe(q(acik));
    expect(q(yedek)).toBe(Math.floor((60_000 * 10 * sabit) / 1000));
    // negatif kontrol: sınıf sabiti değişince (yedek yol) Q değişir
    const baska = sim(veri((v, pr) => (pr.talep.ilceSinifiNufus = { kirsal: 99_000, kasaba: 99_000, sehir: 99_000 })));
    expect(q(baska)).not.toBe(q(yedek));
  });

  it("hücre sınıfı karışımı Q'yu DEĞİŞTİRMEZ: ilçenin tüm hücreleri kırsal da olsa, şehir de olsa (sinif alanı aynı) Q aynı", () => {
    const hepsi = (sinif: "kirsal" | "sehir") => (v: CekirdekVeriPaketi) => {
      for (const h of v.parsel!.ilceler.find((c) => c.id === OVA)!.hucreler) h.sinif = sinif;
    };
    expect(q(sim(veri(hepsi("kirsal"))))).toBe(q(sim(veri(hepsi("sehir")))));
    // negatif kontrol: ilçenin `sinif` ALANI değişince (yedek yol) Q değişir
    const siniflar = (sinif: "kirsal" | "sehir") => (v: CekirdekVeriPaketi) => {
      v.parsel!.ilceler.find((c) => c.id === OVA)!.sinif = sinif;
    };
    expect(q(sim(veri(siniflar("kirsal"))))).not.toBe(q(sim(veri(siniflar("sehir")))));
  });

  it("iki ilçe: her biri kendi nüfus eşdeğeriyle", () => {
    const s = mulkSim(["a"], veri((v) => {
      (v.parsel!.ilceler.find((c) => c.id === OVA) as { nufus?: number }).nufus = 30_000;
      (v.parsel!.ilceler.find((c) => c.id === LIMAN) as { nufus?: number }).nufus = 90_000;
    }));
    dukkanEkle(s, "a", [{ mal: "ekmek" }], "firin", 0, OVA);
    dukkanEkle(s, "a", [{ mal: "ekmek" }], "firin", 0, LIMAN);
    expect(q(s, LIMAN)).toBe(3 * q(s, OVA));
  });
});

describe("takvim ayı ve bayram penceresi (sim günü)", () => {
  /** t anındaki Q (yeni sim; saatlik adımlarla ilerletilir). */
  function qAt(v: CekirdekVeriPaketi, t: number): number {
    const s = sim(v);
    s.calistirKadar(t);
    return q(s);
  }

  it("takvim çarpanı o anın ayına uygulanır (tarım açıkken); tarım kapalıyken takvim YOK (çarpan 1)", () => {
    const nötr = qAt(veri(), 0);
    const ay = takvimAyi(sim(veri()).ic, 0);
    expect(ay).not.toBeNull(); // mini veri paketinde tarım açık
    const agirlikli = veri((_, pr) => {
      const t = Array.from({ length: 12 }, () => 1_000_000);
      t[ay as number] = 1_100_000;
      t[(((ay as number) + 6) % 12)] = 900_000; // toplam 12 000 000
      pr.talep.gruplar["gida"]!.takvimPpm = t;
    });
    expect(qAt(agirlikli, 0)).toBe(Math.floor((nötr * 1_100_000) / 1_000_000));
    // tarım kapalı: takvim uygulanmaz (aynı ağırlıklı takvimle Q nötr Q'ya eşit)
    const tarimsiz = (v: CekirdekVeriPaketi) => {
      delete v.param.tarim;
      delete v.param.iklim;
    };
    const s = sim(veri((v, pr) => {
      tarimsiz(v);
      const t = Array.from({ length: 12 }, () => 1_000_000);
      t[0] = 1_100_000;
      t[6] = 900_000;
      pr.talep.gruplar["gida"]!.takvimPpm = t;
    }));
    expect(takvimAyi(s.ic, 0)).toBeNull();
    expect(q(s)).toBe(nötr);
  });

  it("bayram: [B - Do, B - 1] x oncesi, [B, B + Ds - 1] x sonrasi, dışı 1; bayram günü sonrası penceredir", () => {
    const bayramli = veri((_, pr) => {
      pr.talep.gruplar["gida"]!.bayram = { oncesiGun: 2, oncesiPpm: 1_500_000, sonrasiGun: 2, sonrasiPpm: 500_000 };
      pr.talep.bayramGunleri = [5];
    });
    const taban = qAt(veri(), 0);
    const gun = (g: number): number => qAt(bayramli, g * GUN + 3 * 3_600_000);
    expect([gun(0), gun(1), gun(2)]).toEqual([taban, taban, taban]); // gün 2 < B - Do = 3
    expect(gun(3)).toBe(Math.floor((taban * 1_500_000) / 1_000_000));
    expect(gun(4)).toBe(Math.floor((taban * 1_500_000) / 1_000_000));
    expect(gun(5)).toBe(Math.floor((taban * 500_000) / 1_000_000)); // bayram günü dahil
    expect(gun(6)).toBe(Math.floor((taban * 500_000) / 1_000_000));
    expect(gun(7)).toBe(taban);
    expect(gun(8)).toBe(taban);
  });

  it("toplam-sabit: Do x (Wo - 1) + Ds x (Ws - 1) = 0 olan bir bayram döngüsünde günlük Q toplamı, bayramsız toplama eşit (±gün sayısı)", () => {
    const bayramli = veri((_, pr) => {
      pr.talep.gruplar["gida"]!.bayram = { oncesiGun: 3, oncesiPpm: 1_200_000, sonrasiGun: 3, sonrasiPpm: 800_000 };
      pr.talep.bayramGunleri = [5];
    });
    const s1 = sim(bayramli);
    const s0 = sim(veri());
    let t1 = 0;
    let t0 = 0;
    const gunluk = new Set<number>();
    for (let g = 0; g < 12; g++) {
      s1.calistirKadar(g * GUN + 1);
      s0.calistirKadar(g * GUN + 1);
      t1 += q(s1);
      t0 += q(s0);
      gunluk.add(q(s1));
    }
    expect(Math.abs(t1 - t0)).toBeLessThanOrEqual(12);
    expect(gunluk.size).toBeGreaterThanOrEqual(3); // negatif kontrol: günlük Q sabit DEĞİL (önce, bayram sonrası ve normal günler)
  });
});

describe("talep1000Saat mevcut mülk/bölge davranışını değiştirmez", () => {
  it("dükkânsız dünya: blok yok ile blok var (talep tabloları dolu) AYNI durumOzeti (3 gün)", () => {
    const a = mulkSim(["a"], veri());
    const b = mulkSim(["a"], veri((v) => delete v.param.mulk!.perakende)); // AYNI içerik; yalnız perakende bloğu yok
    a.calistirKadar(3 * GUN);
    b.calistirKadar(3 * GUN);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    // negatif kontrol: dükkân eklenince özet değişir
    const c = sim(veri());
    c.calistirKadar(3 * GUN);
    expect(c.durumOzeti()).not.toBe(b.durumOzeti());
  });

  it("görünüm API'si çözümle aynı Q'yu verir (`q`) ve durumu değiştirmez", () => {
    const s = sim(veri());
    s.calistirKadar(2 * 3_600_000);
    const once = s.durumOzeti();
    const g = yerelPazarGorunumu(s.dunya, s.baglam, "a");
    expect(g).toHaveLength(1);
    expect(g[0]!.yuvalar[0]!.q).toBe(q(s));
    expect(s.durumOzeti()).toBe(once);
  });
});
