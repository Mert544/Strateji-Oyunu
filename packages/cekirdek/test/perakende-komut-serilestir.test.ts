/**
 * G7-3 (sartname §7.2, §11.1-§11.2, §16.2 `perakende-serilestir` / `perakende-determinizm`): KOMUTLA doğan durumun serileştirmesi ve doğrulayıcıları.
 *  - süren dükkân inşaatı `dukkanTuru` taşır: gidiş-dönüş, anlık görüntüden yükleyip devam; bozuk değer ret; `dunyaIcerikUyumu`: yalnız `ekYapi === "dukkan"` inşaatında ve bilinen türde;
 *  - marka sınırları (`marka.hesapBasinaEnFazla`, simge/renk sayısı; perakende yokken marka olamaz);
 *  - determinizm: aynı tohum + günlük = aynı özet (canlı = yenidenOynat = görüntüden devam); bağımsız komutların sırası sonucu değiştirmez.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { anlikGoruntuOlustur, dunyaCoz, dunyaIcerikUyumu, dunyaSerilestir, kuralSurumuHesapla, SerilestirmeHatasi } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { Dunya, Komut } from "../src/tipler";
import { dukkanlar } from "./perakende-yardimci";
import { OVA, dukkanKomutu, dukkanKur, dukkanliDunya, ilceHucreleri, komutVeri } from "./perakende-komut-yardimci";
import { mulkSim, tamam } from "./mulk-yardimci";

function hata(f: () => unknown): SerilestirmeHatasi {
  try {
    f();
  } catch (e) {
    if (e instanceof SerilestirmeHatasi) return e;
    throw e;
  }
  throw new Error("hata bekleniyordu");
}

/** İnşaatı SÜREN dükkânlı dünya (komutla). */
function suren(): { s: Simulasyon; d: Dunya } {
  const s = mulkSim(["a"], komutVeri(), 4);
  tamam(s, "a", dukkanKomutu(OVA, ilceHucreleri(OVA)[3] as string, "firin"));
  s.calistirKadar(s.dunya.zaman + 10 * 60_000); // ilk 24 saatte süre %10: 24 dk; inşaat sürüyor
  return { s, d: s.dunya };
}

function kopyaBozulmus(d: Dunya, duzenle: (x: Dunya) => void): string {
  const kopya = JSON.parse(dunyaSerilestir(d)) as Dunya;
  duzenle(kopya);
  return hata(() => dunyaCoz(JSON.stringify(kopya))).message;
}

describe("dukkanTuru (süren inşaat): gidiş-dönüş, doğrulayıcı, içerik uyumu", () => {
  it("inşaat dukkanTuru taşır; metin ve özet aynı gidiş-dönüş; içerik uyumu geçer; anlık görüntüden yükleyip devam = devam eden dünya", () => {
    const { s, d } = suren();
    expect(d.insaatlar[0]).toMatchObject({ ekYapi: "dukkan", dukkanTuru: "firin" });
    const metin = dunyaSerilestir(d);
    expect(metin).toContain('"dukkanTuru":"firin"');
    const geri = dunyaCoz(metin);
    expect(dunyaSerilestir(geri)).toBe(metin);
    dunyaIcerikUyumu(s.ic, geri);
    const v = komutVeri();
    const yuklu = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
    expect(yuklu.durumOzeti()).toBe(s.durumOzeti());
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    yuklu.calistirKadar(yuklu.dunya.zaman + 6 * SAAT);
    expect(yuklu.durumOzeti()).toBe(s.durumOzeti());
    expect(dukkanlar(yuklu)[0]!.e.dukkan!.tur).toBe("firin"); // inşaat bitince tür durumda
  });

  it("bozuk değer ret: dize olmayan dukkanTuru; yalnız `ekYapi === dukkan` inşaatında; bilinmeyen tür; perakende tanımsızken (negatif kontrol: bozulmamış geçer)", () => {
    const { s, d } = suren();
    expect(kopyaBozulmus(d, (x) => ((x.insaatlar[0] as unknown as { dukkanTuru: unknown }).dukkanTuru = 5))).toMatch(/dukkanTuru/);
    const uyum = (duzenle: (x: Dunya) => void, ic = s.ic): string => {
      const kopya = dunyaCoz(dunyaSerilestir(d));
      duzenle(kopya);
      return hata(() => dunyaIcerikUyumu(ic, kopya)).message;
    };
    expect(uyum((x) => (x.insaatlar[0]!.ekYapi = "ambar"))).toMatch(/yalniz dukkan yapisi insaatinda/);
    expect(uyum((x) => delete x.insaatlar[0]!.ekYapi)).toMatch(/yalniz dukkan yapisi insaatinda/);
    expect(uyum((x) => (x.insaatlar[0]!.dukkanTuru = "market"))).toMatch(/icerikte olmayan dukkan turu: market/);
    const sBlokYok = mulkSim(["a"], komutVeri(undefined, false), 4);
    expect(uyum(() => undefined, sBlokYok.ic)).toMatch(/perakende|icerikte olmayan/);
    expect(() => dunyaIcerikUyumu(s.ic, dunyaCoz(dunyaSerilestir(d)))).not.toThrow();
  });
});

describe("marka sınırları (dunyaIcerikUyumu)", () => {
  function markali(): { s: Simulasyon; d: Dunya } {
    const s = mulkSim(["a"], komutVeri(), 4);
    tamam(s, "a", { tur: "marka_tanimla", marka: 0, ad: "Firin A", simge: 7, renk: 7 });
    tamam(s, "a", { tur: "marka_tanimla", marka: 1, ad: "Bakkal B", simge: 0, renk: 0 });
    return { s, d: s.dunya };
  }
  const uyum = (s: Simulasyon, d: Dunya, duzenle: (x: Dunya) => void, ic = s.ic): string => {
    const kopya = dunyaCoz(dunyaSerilestir(d));
    duzenle(kopya);
    return hata(() => dunyaIcerikUyumu(ic, kopya)).message;
  };

  it("sayı <= hesapBasinaEnFazla (2), simge < 8, renk < 8; perakende yokken marka olamaz; sınır değerleri (simge 7, renk 7, 2 marka) geçer", () => {
    const { s, d } = markali();
    expect(() => dunyaIcerikUyumu(s.ic, dunyaCoz(dunyaSerilestir(d)))).not.toThrow(); // sınırda
    expect(uyum(s, d, (x) => x.mulk!.oyuncular[0]!.markalar!.push({ ad: "uc", simge: 0, renk: 0 }))).toMatch(/marka sayisi 3, hesap basina en cok 2/);
    expect(uyum(s, d, (x) => (x.mulk!.oyuncular[0]!.markalar![0]!.simge = 8))).toMatch(/simge 8, simge sayisi 8/);
    expect(uyum(s, d, (x) => (x.mulk!.oyuncular[0]!.markalar![1]!.renk = 8))).toMatch(/renk 8, renk sayisi 8/);
    const sBlokYok = mulkSim(["a"], komutVeri(undefined, false), 4);
    expect(uyum(s, d, () => undefined, sBlokYok.ic)).toMatch(/marka var ama perakende/);
  });
});

describe("determinizm: canlı = yenidenOynat = görüntüden devam; bağımsız komut sırası", () => {
  /** Komutlarla (kur, raf, fiyat, marka, yık, yeniden kur) dünya; döner: sim ve başarılı günlük. */
  function senaryo(): Simulasyon {
    const { s, dukkan } = dukkanliDunya(["a", "b"], komutVeri(), 8);
    const a = dukkan["a"]!.id;
    const b = dukkan["b"]!.id;
    const kom: Komut[] = [
      { tur: "dukkan_raf", dukkan: a, yuva: 0, mal: "ekmek" },
      { tur: "marka_tanimla", marka: 0, ad: "İSTANBUL Fırını", simge: 1, renk: 2 },
      { tur: "dukkan_marka", dukkan: a, marka: 0 },
    ];
    for (const k of kom) tamam(s, "a", k);
    tamam(s, "b", { tur: "dukkan_raf", dukkan: b, yuva: 0, mal: "gida" });
    s.calistirKadar(s.dunya.zaman + 8 * SAAT);
    tamam(s, "a", { tur: "dukkan_fiyat", dukkan: a, yuva: 0, fiyat: 1 });
    tamam(s, "b", { tur: "dukkan_yik", dukkan: b });
    s.calistirKadar(s.dunya.zaman + GUN);
    dukkanKur(s, "b", OVA, dukkan["b"]!.hucreler[0] as string, "firin");
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    return s;
  }

  it("aynı tohum ve komutlar iki kez aynı özet; yenidenOynat(günlük) aynı; ortadan anlık görüntüden yükleyip devam aynı", () => {
    const x = senaryo();
    const y = senaryo();
    expect(y.durumOzeti()).toBe(x.durumOzeti());
    const oynat = Simulasyon.yenidenOynat(komutVeri(), 8, x.gunluk);
    oynat.calistirKadar(x.dunya.zaman);
    expect(oynat.durumOzeti()).toBe(x.durumOzeti());
    // ortadan görüntü: ilk yarıyı koş, görüntüle, yükle, devam
    const v = komutVeri();
    const yarim = mulkSim(["a", "b"], komutVeri(), 8);
    const h = ilceHucreleri(OVA);
    tamam(yarim, "a", dukkanKomutu(OVA, h[3] as string, "bakkal"));
    tamam(yarim, "b", dukkanKomutu(OVA, h[10] as string, "firin"));
    yarim.calistirKadar(yarim.dunya.zaman + 2 * SAAT); // inşaatlar sürüyor
    const yuklu = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(yarim, kuralSurumuHesapla(v)));
    expect(yuklu.durumOzeti()).toBe(yarim.durumOzeti());
    yarim.calistirKadar(yarim.dunya.zaman + 3 * GUN);
    yuklu.calistirKadar(yuklu.dunya.zaman + 3 * GUN);
    expect(yuklu.durumOzeti()).toBe(yarim.durumOzeti());
    expect(dukkanlar(yarim)).toHaveLength(2);
  });

  it("aynı anda verilen BAĞIMSIZ komutların sırası (a ve b'nin raf/marka komutları) dükkân ve marka durumunu değiştirmez (olay kuyruğunun iç yığın düzeni sıraya bağlıdır: özet değil durum karşılaştırılır); negatif kontrol: farklı komut farklı durum", () => {
    const kur = (ters: boolean): Simulasyon => {
      const { s, dukkan } = dukkanliDunya(["a", "b"], komutVeri(), 6);
      const ka: Komut[] = [{ tur: "dukkan_raf", dukkan: dukkan["a"]!.id, yuva: 0, mal: "ekmek" }, { tur: "marka_tanimla", marka: 0, ad: "Ka", simge: 0, renk: 0 }];
      const kb: Komut[] = [{ tur: "dukkan_raf", dukkan: dukkan["b"]!.id, yuva: 0, mal: "un" }, { tur: "marka_tanimla", marka: 0, ad: "Kb", simge: 1, renk: 1 }];
      const sira: [string, Komut][] = [...ka.map((k) => ["a", k] as [string, Komut]), ...kb.map((k) => ["b", k] as [string, Komut])];
      if (ters) sira.reverse();
      for (const [o, k] of sira) tamam(s, o, k);
      s.calistirKadar(s.dunya.zaman + 2 * GUN);
      return s;
    };
    // Durum: mülk durumu (hücreler, markalar, ...) ve dükkânlar (raf, kademe, satış sayaçları, gelir); iç olay kuyruğu hariç.
    // Anahtar sırası komut sırasına bağlı olabilir (örn. `markalar` ile `ilkSatisT`'nin ekleniş sırası): kanonik (anahtarları sıralı) metin karşılaştırılır.
    const sirali = (v: unknown): unknown => (Array.isArray(v) ? v.map(sirali) : v !== null && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sirali((v as Record<string, unknown>)[k])])) : v);
    const durum = (x: Simulasyon): string => JSON.stringify(sirali([x.dunya.mulk!.hucreler, x.dunya.mulk!.oyuncular, dukkanlar(x).map((d) => [d.oyuncu, d.e]), x.dunya.oyuncular.map((o) => o.hazine.miktar)]));
    const duz = kur(false);
    expect(durum(kur(true))).toBe(durum(duz));
    expect(durum(dukkanliDunya(["a", "b"], komutVeri(), 6).s)).not.toBe(durum(duz));
  });
});
