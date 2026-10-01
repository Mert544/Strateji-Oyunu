/**
 * Tarım katmanı (B1): iklim takvimi (dünya saati -> ay), 12 aylık hasat oranı eğrileri ve kapalı-mod regresyonu.
 */
import { describe, expect, it } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { hasatEnterpole, hasatGunlukNormallestir, tarimTablosu } from "../src/tarim";
import { takvimAyi, takvimGunu } from "../src/tarim/iklim";
import { IKLIM_TIPI_SIRASI } from "../src/tarim/tablo";
import { GUN, PPM, SAAT } from "../src/tipler";
import { Simulasyon } from "../src/motor";
import { bolge, kur, simdiyiIsle, verTamam } from "./ekonomi-yardimci";
import { tarimAc } from "./yenilikler";

const iklim = varsayilanVeriyiYukle().param.iklim!;

describe("hasat oranı eğrisi", () => {
  it("12 aylık eğrilerin ortalaması tam PPM (her iklim tipi)", () => {
    for (const tip of IKLIM_TIPI_SIRASI) {
      const egri = iklim.hasatEgrisiPpm[tip];
      expect(egri).toHaveLength(12);
      expect(egri.reduce((t, x) => t + x, 0)).toBe(12 * PPM);
    }
  });

  it("ay ortasında enterpolasyon eğri değerinin kendisidir; ay ortaları arası doğrusal ve monoton", () => {
    const { ayGunleri } = iklim;
    const egri = iklim.hasatEgrisiPpm.karasal;
    let bas = 0;
    const orta: number[] = [];
    for (const g of ayGunleri) {
      orta.push(bas + Math.floor(g / 2));
      bas += g;
    }
    for (let m = 0; m < 12; m++) expect(hasatEnterpole(egri, ayGunleri, orta[m]!)).toBe(egri[m]);
    // Haziran ortasi (1900000) -> Temmuz ortasi (1800000): azalan, aradaki her deger [1800000, 1900000]
    for (let g = orta[5]!; g <= orta[6]!; g++) {
      const v = hasatEnterpole(egri, ayGunleri, g);
      expect(v).toBeLessThanOrEqual(1_900_000);
      expect(v).toBeGreaterThanOrEqual(1_800_000);
    }
    // Yıl sonu dolanır: 31 Aralık ile 1 Ocak komşu ve süreklidir (eğri ~450000 -> 300000 arası)
    const son = hasatEnterpole(egri, ayGunleri, 364);
    const ilk = hasatEnterpole(egri, ayGunleri, 0);
    expect(Math.abs(son - ilk)).toBeLessThan(20_000);
  });

  it("günlük tablo: 365 günün ortalaması tam PPM (yıllık toplam üretim değişmez, yalnız zamanlama)", () => {
    const { s } = kur({ duzenle: tarimAc });
    const tb = tarimTablosu(s.ic)!;
    expect(tb.hasatGunluk).toHaveLength(6);
    for (let i = 0; i < 6; i++) {
      const gun = tb.hasatGunluk[i]!;
      expect(gun).toHaveLength(365);
      expect(gun.reduce((t, x) => t + x, 0)).toBe(365 * PPM);
      expect(Math.min(...gun)).toBeGreaterThanOrEqual(0);
    }
    // Ölçekleme eğriyi bozmaz: günlük değerler ham enterpolasyondan en çok %1 sapar.
    const tip = IKLIM_TIPI_SIRASI.indexOf("dag_yayla");
    for (let g = 0; g < 365; g++) {
      const ham = hasatEnterpole(iklim.hasatEgrisiPpm.dag_yayla, iklim.ayGunleri, g);
      const norm = tb.hasatGunluk[tip]![g]!;
      expect(Math.abs(norm - ham)).toBeLessThanOrEqual(ham * 0.01 + 1);
    }
  });

  it("hasatGunlukNormallestir: toplamı hedefe eşitler, sıfır diziyi bozmaz", () => {
    const y = hasatGunlukNormallestir([1, 2, 3, 4, 5]);
    expect(y.reduce((t, x) => t + x, 0)).toBe(5 * PPM);
    expect(hasatGunlukNormallestir([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("varsayılan parametrelerde gerçek takvim: gunCarpani 1, ay günleri 365, başlangıç 1 Ekim", () => {
    expect(iklim.gunCarpani).toBe(1);
    expect(iklim.ayGunleri.reduce((t, x) => t + x, 0)).toBe(365);
    expect(iklim.baslangicGunu).toBe(273);
    expect(iklim.uyariSaat).toBe(24);
  });
});

describe("iklim takvimi: dünya saati -> ay", () => {
  it("gerçek takvim: 1 Ekim'de başlar, ay geçişleri gerçek günlere denk gelir", () => {
    const { s } = kur({ duzenle: tarimAc });
    const ic = s.ic;
    expect(takvimGunu(ic, 0)).toBe(273);
    expect(takvimAyi(ic, 0)).toBe(9); // Ekim
    expect(takvimAyi(ic, 30 * GUN)).toBe(9); // 31 Ekim
    expect(takvimAyi(ic, 31 * GUN)).toBe(10); // 1 Kasım
    expect(takvimAyi(ic, 61 * GUN)).toBe(11); // 1 Aralık
    expect(takvimAyi(ic, 91 * GUN)).toBe(11); // 31 Aralık
    expect(takvimGunu(ic, 92 * GUN)).toBe(0); // 1 Ocak: yıl dolanır
    expect(takvimAyi(ic, 92 * GUN)).toBe(0);
    expect(takvimAyi(ic, 92 * GUN - 1)).toBe(11); // yıl sonunda son milisaniye
    expect(takvimGunu(ic, 365 * GUN)).toBe(273); // bir yıl sonra aynı gün
  });

  it("başlangıç ayı parametreye bağlı", () => {
    const { s } = kur({ duzenle: (v) => { tarimAc(v); v.param.iklim!.baslangicGunu = 181; } }); // 1 Temmuz
    expect(takvimAyi(s.ic, 0)).toBe(6);
    expect(takvimAyi(s.ic, 31 * GUN)).toBe(7);
  });

  it("ölçüm için gün -> ay hızlandırma çarpanı: gunCarpani 12 iken 1 sim günü = 12 takvim günü", () => {
    const { s } = kur({ duzenle: (v) => { tarimAc(v); v.param.iklim!.gunCarpani = 12; } });
    expect(takvimGunu(s.ic, 0)).toBe(273);
    expect(takvimGunu(s.ic, GUN)).toBe(285);
    expect(takvimAyi(s.ic, 2 * GUN)).toBe(9); // 297 = Ekim
    expect(takvimAyi(s.ic, 3 * GUN)).toBe(10); // 309 = Kasım
    // Bir takvim yılı = 365/12 sim günü: 30 sim günü ~ 360 takvim günü
    expect(takvimGunu(s.ic, 30 * GUN)).toBe((273 + 360) % 365);
  });

  it("tarım kapalıysa takvim null", () => {
    const { s } = kur();
    expect(takvimGunu(s.ic, 0)).toBeNull();
    expect(takvimAyi(s.ic, 0)).toBeNull();
  });

  it("günlük tık: bölgenin iklimPpm'i günlük hasat tablosuyla eşleşir ve ay geçişinde değişir (gunCarpani 12)", () => {
    const { s } = kur({ duzenle: (v) => { tarimAc(v); v.param.iklim!.gunCarpani = 12; } });
    const tb = tarimTablosu(s.ic)!;
    const liman = bolge(s, "m_liman"); // karadeniz, sulama yok
    const tip = IKLIM_TIPI_SIRASI.indexOf("karadeniz");
    const ayGozlenen = new Set<number>();
    let onceki = -1;
    let degisim = 0;
    for (let i = 1; i <= 30 * 12; i++) {
      s.calistirKadar((i * GUN) / 12);
      const gun = takvimGunu(s.ic, s.dunya.zaman)!;
      expect(liman.tarim!.iklimPpm).toBe(tb.hasatGunluk[tip]![gun]);
      ayGozlenen.add(takvimAyi(s.ic, s.dunya.zaman)!);
      if (liman.tarim!.iklimPpm !== onceki) degisim++;
      onceki = liman.tarim!.iklimPpm;
    }
    expect(ayGozlenen.size).toBe(12); // 30 sim günü = ~1 takvim yılı: 12 ayın hepsi görülür
    expect(degisim).toBeGreaterThan(100);
  });

  it("günlük tık sayacı: sonGun her takvim gününde 1 artar", () => {
    const { s } = kur({ duzenle: tarimAc });
    s.calistirKadar(0);
    expect(s.dunya.iklim!.sonGun).toBe(273);
    s.calistirKadar(5 * GUN + 3 * SAAT);
    expect(s.dunya.iklim!.sonGun).toBe(278);
  });
});

describe("tarım kapalı (regresyon kalkanı)", () => {
  it("parametreler yoksa dünyada tarım/iklim alanı, kuyrukta günlük tık ve tarım komutu yoktur", () => {
    const { s } = kur();
    s.calistirKadar(3 * GUN);
    expect(s.dunya.iklim).toBeUndefined();
    for (const b of s.dunya.bolgeler) expect(b.tarim).toBeUndefined();
    expect(s.dunya.kuyruk.some((o) => o.veri.tur === "iklim_gunluk")).toBe(false);
    const r = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "gubre_dozu", bolge: "m_ova", doz: 1 } });
    expect(r.tamam).toBe(false);
    const r2 = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "ekim_plani", bolge: "m_ova", ekimPpm: [PPM, 0, 0] } });
    expect(r2.tamam).toBe(false);
  });

  it("kapalıyken veri alanları etkisizdir: tarimsal bayrakları ve bölge tarım alanı silinse de özet aynı", () => {
    const komutlar = (s: Simulasyon): void => {
      verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
      s.calistirKadar(6 * GUN);
    };
    const a = kur().s;
    komutlar(a);
    const b = kur({
      duzenle: (v) => {
        for (const y of v.icerik.yontemler) delete y.tarimsal;
        for (const bo of v.harita.bolgeler) delete bo.tarim;
      },
    }).s;
    komutlar(b);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
  });

  it("kapalıyken çiftlik rezerv tükenmesi v0.2 gibi sürer; açıkken tahıl rezervi tükenmez", () => {
    const kapali = kur().s;
    const acik = kur({ duzenle: tarimAc }).s;
    kapali.calistirKadar(20 * GUN);
    acik.calistirKadar(20 * GUN);
    const ti = kapali.ic.malIndeks["tahil"]!;
    expect(bolge(kapali, "m_ova").rezervKalan[ti]!).toBeLessThan(bolge(kapali, "m_ova").rezervIlk[ti]!);
    expect(bolge(acik, "m_ova").rezervKalan[ti]!).toBe(bolge(acik, "m_ova").rezervIlk[ti]!);
    simdiyiIsle(acik);
  });
});
