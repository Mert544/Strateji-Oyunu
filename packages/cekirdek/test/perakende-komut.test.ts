/**
 * G7-3 (sartname §7.2-§7.9, §9, §16.2 `perakende-komut`): dükkân komutlarının etkin yolu.
 *  - kurulum: `yapi_yerlestir` / `tesis_insa_hucre` `dukkanTuru` (DUK-01…DUK-08), inşaat `dukkanTuru` taşır, tamamlanınca `DukkanDurumu` (baslangic ≤ kurulus), `insaat_iptal` iadesi;
 *  - `dukkan_raf` (DUK-10…DUK-19b, hız sınırı DUK-18), `dukkan_fiyat` (DUK-16, DUK-17, DUK-19c), `dukkan_marka` (MRK-13, MRK-14);
 *  - `dukkan_yik` (§7.9): iade YOK, para korunumu, indirim sayacı geri verilmez, DUK-10/DUK-23, `parsel_birak` sonrası ve yeniden kurulum;
 *  - blok yokken ve bölge kipinde komutlar reddedilir, durum özeti DEĞİŞMEZ (DUK-00 / mülk kipi kapalı);
 *  - reddedilen komut durumu değiştirmez; tohumlu rastgele komut koşusunda para korunumu her adımda TAM eşitlik.
 * Marka sözdizimi `marka-sozdizimi.test.ts`, kampanya `perakende-kampanya.test.ts`'tedir.
 */
import { miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { hucreBul, ilceBul, isletmeBul, mulkOyuncuBul } from "../src/mulk";
import { aralik, prngOlustur } from "../src/prng";
import { anlikHazine, anlikMiktar } from "../src/stok";
import { GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { dukkanlar } from "./perakende-yardimci";
import { DAG, LIMAN, OVA, dukkanKomutu, dukkanKur, dukkanliDunya, ilceHucreleri, komutVeri, korunumTutar, paraMetni, reddedilir } from "./perakende-komut-yardimci";
import { mulkSim, tamam, ver } from "./mulk-yardimci";

const OVA_IL = "sn_m_ova";

describe("kurulum: dukkanTuru ve inşaat (yapi_yerlestir, tesis_insa_hucre)", () => {
  it("yapi_yerlestir: inşaat dukkanTuru taşır; tamamlanınca dükkân durumu: tür, ölçek 0, boş raf varsayılan kademede, markasız, baslangic ≤ kurulus", () => {
    const s = mulkSim(["a"], komutVeri());
    const hucre = ilceHucreleri(OVA)[3] as string;
    const t0 = s.dunya.zaman + 90_000; // komut anı
    tamam(s, "a", dukkanKomutu(OVA, hucre, "firin"), t0);
    expect(s.dunya.insaatlar).toHaveLength(1);
    expect(s.dunya.insaatlar[0]).toMatchObject({ ekYapi: "dukkan", dukkanTuru: "firin", baslangic: t0 });
    expect(dukkanlar(s)).toHaveLength(0); // inşaat sürerken dükkân yok
    const bitis = s.dunya.insaatlar[0]!.bitis;
    s.calistirKadar(bitis);
    expect(s.dunya.insaatlar).toHaveLength(0);
    const e = dukkanlar(s)[0]!.e;
    const pk = s.ic.mulk!.perakende!;
    expect(e.dukkan).toEqual({
      tur: "firin",
      olcek: 0,
      raf: Array.from({ length: pk.p.olcekler[0].rafYuvasi }, () => ({ fiyat: pk.p.varsayilanFiyatKademesi })),
      baslangic: t0,
      kurulus: bitis,
    });
    expect(e.dukkan!.baslangic).toBeLessThanOrEqual(e.dukkan!.kurulus);
    expect(e.dukkan!.marka).toBeUndefined();
    expect(hucreBul(s.dunya, hucre)).toMatchObject({ sahip: "a", tesis: e.id });
  });

  it("tesis_insa_hucre ile aynı sonuç: oyuncunun boş hücresine dükkân (arsa önceden alınmış); sonuç yapi_yerlestir ile aynıdır", () => {
    const hucre = ilceHucreleri(OVA)[3] as string;
    const a = mulkSim(["a"], komutVeri());
    const b = mulkSim(["a"], komutVeri());
    tamam(a, "a", dukkanKomutu(OVA, hucre, "bakkal"));
    tamam(b, "a", { tur: "parsel_al", ilce: OVA, hucreler: [hucre], sinif: "kirsal" });
    tamam(b, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "dukkan", hucreler: [hucre], dukkanTuru: "bakkal" });
    expect(b.dunya.insaatlar[0]).toMatchObject({ ekYapi: "dukkan", dukkanTuru: "bakkal" });
    a.calistirKadar(a.dunya.zaman + 6 * SAAT);
    b.calistirKadar(b.dunya.zaman + 6 * SAAT);
    expect(JSON.stringify(dukkanlar(a).map((x) => x.e.dukkan))).toBe(JSON.stringify(dukkanlar(b).map((x) => x.e.dukkan)));
    expect(dukkanlar(a)[0]!.e.dukkan!.tur).toBe("bakkal");
  });

  it("DUK-01…DUK-05: dukkanTuru gerekli / yalnız dükkânda / bilinen tür / ölçek açık / türün ölçek aralığı; DUK-08 hücre sayısı; hepsi durumu değiştirmez", () => {
    const s = mulkSim(["a"], komutVeri());
    const h = ilceHucreleri(OVA);
    expect(reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, undefined), "dukkan turu gerekli (dukkanTuru)")).toBe("dukkan turu gerekli (dukkanTuru)");
    expect(reddedilir(s, "a", { tur: "yapi_yerlestir", ilce: OVA, tesisTuru: "ciftlik", hucreler: [h[3] as string, h[4] as string], sinif: "kirsal", dukkanTuru: "bakkal" }, "dukkanTuru yalniz dukkan yapisinda verilebilir: ciftlik")).toBe(
      "dukkanTuru yalniz dukkan yapisinda verilebilir: ciftlik",
    );
    reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, "market"), "bilinmeyen dukkan turu: market");
    reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, "bakkal", { olcek: 1 }), "dukkan olcegi henuz acik degil: m");
    reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, "bakkal", { olcek: 2 }), "dukkan olcegi henuz acik degil: l");
    reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, "bakkal", { hucreler: [h[3] as string, h[4] as string] }), "dukkan 1 hucre kaplar (verilen 2)");
    // tesis_insa_hucre yolunda da aynı iletiler
    reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "dukkan", hucreler: [h[3] as string] }, "dukkan turu gerekli (dukkanTuru)");
    reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: [h[3] as string], dukkanTuru: "bakkal" }, "dukkanTuru yalniz dukkan yapisinda verilebilir");
    expect(s.dunya.insaatlar).toHaveLength(0);
    expect(hucreBul(s.dunya, h[3] as string)).toBeUndefined(); // arsa da alınmadı
  });

  it("DUK-05: ölçek açık (acikOlcekler [0, 1]) ama türün aralığında değilse reddedilir; ölçek M dükkân: 2 hücre, raf 12 yuva, bedel ölçek çarpanıyla", () => {
    const v = komutVeri((_, pr) => {
      pr.acikOlcekler = [0, 1];
      pr.dukkanTurleri.find((t) => t.id === "bakkal")!.olcekAraligi = [0, 1];
    });
    const s = mulkSim(["a"], v);
    const h = ilceHucreleri(OVA);
    reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, "firin", { olcek: 1, hucreler: [h[3] as string, h[4] as string] }), "firin dukkani m olceginde kurulamaz");
    reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, "bakkal", { olcek: 2 }), "dukkan olcegi henuz acik degil: l");
    reddedilir(s, "a", dukkanKomutu(OVA, h[3] as string, "bakkal", { olcek: 1 }), "olceginde 2 hucre kaplar");
    const cift = ciftBul(h);
    tamam(s, "a", dukkanKomutu(OVA, cift[0], "bakkal", { olcek: 1, hucreler: cift }));
    expect(s.dunya.insaatlar[0]).toMatchObject({ ekYapi: "dukkan", dukkanTuru: "bakkal", olcek: 1 });
    s.calistirKadar(s.dunya.zaman + 24 * SAAT);
    const dk = dukkanlar(s)[0]!.e.dukkan!;
    expect(dk.olcek).toBe(1);
    expect(dk.raf).toHaveLength(s.ic.mulk!.perakende!.p.olcekler[1].rafYuvasi);
  });

  it("DUK-06: oyuncu başına ilçede en çok ilceBasinaEnFazla dükkân (biten + süren); başka ilçede sınır ayrı; DUK-07 il sınırı mevcut kuralla", () => {
    const s = mulkSim(["a", "b"], komutVeri());
    const h = ilceHucreleri(OVA);
    tamam(s, "a", dukkanKomutu(OVA, h[3] as string, "bakkal"));
    s.calistirKadar(s.dunya.zaman + 6 * SAAT); // biten
    tamam(s, "a", dukkanKomutu(OVA, h[10] as string, "firin")); // süren
    const mesaj = reddedilir(s, "a", dukkanKomutu(OVA, h[20] as string, "bakkal"), "ilcede en cok 2 dukkan (biten + suren)");
    expect(mesaj).toBe("ilcede en cok 2 dukkan (biten + suren)");
    expect(hucreBul(s.dunya, h[20] as string)).toBeUndefined();
    tamam(s, "b", dukkanKomutu(OVA, h[20] as string, "bakkal")); // başka oyuncunun sayacı ayrı
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    // yıkım sayacı düşürür (türetilmiş)
    const a1 = dukkanlar(s).find((x) => x.oyuncu === "a")!;
    tamam(s, "a", { tur: "dukkan_yik", dukkan: a1.e.id });
    tamam(s, "a", dukkanKomutu(OVA, h[30] as string, "bakkal"));

    // il sınırı (DUK-07): enFazlaIlBasina = 1
    const v = komutVeri((v2) => {
      v2.param.mulk!.ekYapilar!["dukkan"]!.enFazlaIlBasina = 1;
    });
    const t = mulkSim(["a"], v);
    tamam(t, "a", dukkanKomutu(OVA, h[3] as string, "bakkal"));
    expect(reddedilir(t, "a", dukkanKomutu(OVA, h[10] as string, "bakkal"), "ilde en cok 1 Dukkan (biten + suren)")).toBe("ilde en cok 1 Dukkan (biten + suren)");
  });

  it("insaat_iptal dükkân inşaatını %50 (para + malzeme) iade eder ve ilk-yapı indirim hakkını geri verir; hücre boşalır, DUK-23 ile yıkım reddedilir", () => {
    const v = komutVeri((v2) => {
      const yo = v2.param.mulk!.yeniOyuncu;
      yo.ilkYapiIndirimPpm = 300_000;
      yo.indirimliYapiSayisi = 5;
    });
    const s = mulkSim(["a"], v);
    const h = ilceHucreleri(OVA)[3] as string;
    tamam(s, "a", dukkanKomutu(OVA, h, "bakkal"));
    const ins = s.dunya.insaatlar[0]!;
    expect(ins.indirimli).toBe(true);
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(1);
    // süren dükkân inşaatının kimliği ile yıkım: DUK-23 (durum değişmez)
    expect(reddedilir(s, "a", { tur: "dukkan_yik", dukkan: ins.id }, "dukkan henuz tamamlanmadi: insaat_iptal kullanin")).toBe(`dukkan henuz tamamlanmadi: insaat_iptal kullanin (${ins.id})`);
    const b = s.dunya.bolgeler[isletmeBul(s.dunya, "a", OVA_IL)!.bolgeIndeksi]!;
    const celik = s.ic.malIndeks["celik"]!;
    const parca = s.ic.malIndeks["parca"]!;
    const hz = anlikHazine(s.dunya, "a");
    const c0 = anlikMiktar(b.stoklar[celik]!, s.dunya.zaman);
    const p0 = anlikMiktar(b.stoklar[parca]!, s.dunya.zaman);
    tamam(s, "a", { tur: "insaat_iptal", insaat: ins.id });
    // 6 000 000 mili-₺ x %70 (indirimli) = 4 200 000; iade %50 = 2 100 000; çelik 20 000 x %70 = 14 000 -> 7 000; parça 8 000 x %70 = 5 600 -> 2 800
    expect(anlikHazine(s.dunya, "a") - hz).toBe(2_100_000);
    expect(anlikMiktar(b.stoklar[celik]!, s.dunya.zaman) - c0).toBe(7_000);
    expect(anlikMiktar(b.stoklar[parca]!, s.dunya.zaman) - p0).toBe(2_800);
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBeUndefined(); // hak geri verildi
    expect(hucreBul(s.dunya, h)!.insaat).toBeUndefined();
    expect(dukkanlar(s)).toHaveLength(0);
  });
});

/** Fikstür sırasından kenar-bitişik kırsal hücre çifti (ilçedeki ilk). */
function ciftBul(h: string[]): [string, string] {
  const kume = new Set(h);
  for (const id of h) {
    const [x, y] = id.split(":").map(Number) as [number, number];
    if (kume.has(`${x + 1}:${y}`)) return [id, `${x + 1}:${y}`];
  }
  throw new Error("bitisik cift yok");
}

describe("dukkan_raf", () => {
  it("başarı: ilk doldurma (fiyatT yazmaz, kademe varsayılan), boşaltma, yeniden doldurma; DUK-10/12/13/14/15/19a/19b", () => {
    const { s, dukkan } = dukkanliDunya(["a", "b"]);
    const id = dukkan["a"]!.id;
    const pk = s.ic.mulk!.perakende!;
    const raf = (): ReturnType<typeof dukkanlar>[number]["e"]["dukkan"] => dukkanlar(s).find((x) => x.e.id === id)!.e.dukkan;
    // başarı yolları
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" });
    expect(raf()!.raf[0]).toMatchObject({ mal: "ekmek", fiyat: pk.p.varsayilanFiyatKademesi });
    expect(raf()!.raf[0]!.fiyatT).toBeUndefined(); // ilk doldurma fiyatT yazmaz
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 1, mal: "gida" });
    // hatalar (durum değişmez)
    expect(reddedilir(s, "a", { tur: "dukkan_raf", dukkan: 999_999, yuva: 0, mal: "ekmek" }, "dukkan bulunamadi: 999999")).toBe("dukkan bulunamadi: 999999");
    reddedilir(s, "b", { tur: "dukkan_raf", dukkan: id, yuva: 2, mal: "ekmek" }, `dukkan bulunamadi: ${id}`); // başkasının dükkânı: bilgi sızdırmaz
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 6, mal: "un" }, "gecersiz yuva: 6 (0..5)");
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: -1, mal: "un" }, "gecersiz yuva: -1 (0..5)");
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 1.5, mal: "un" }, "gecersiz yuva: 1.5");
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 2, mal: "celik" }, "bu mal bu dukkan turunde satilamaz: celik");
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 2, mal: "ekmek" }, "bu mal baska yuvada: ekmek");
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" }, "yuva zaten bu malla dolu: ekmek");
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 2, mal: "yok_mal" }, "bilinmeyen mal: yok_mal");
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 5, mal: null }, "yuva zaten bos");
    // boşaltma: mal ve fiyatT gider, kademe varsayılana döner
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: null });
    expect(raf()!.raf[0]).toMatchObject({ fiyat: pk.p.varsayilanFiyatKademesi });
    expect(raf()!.raf[0]!.mal).toBeUndefined();
    expect(raf()!.raf[0]!.fiyatT).toBeUndefined();
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "un" });
    expect(raf()!.raf[0]!.mal).toBe("un");
  });

  it("hız sınırı (DUK-18): dolu yuvada mal/fiyat değişimi fiyatDegisimEnAzSaat sonra; kalan saat yukarı yuvarlanır; ilk doldurma ve boşaltma muaf", () => {
    const { s, dukkan } = dukkanliDunya(["a"]);
    const id = dukkan["a"]!.id;
    const t0 = s.dunya.zaman;
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" }, t0); // ilk doldurma: fiyatT yok
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "un" }, t0); // ilk değişim: sınır yok (fiyatT yazılır)
    expect(dukkanlar(s)[0]!.e.dukkan!.raf[0]!.fiyatT).toBe(t0);
    expect(reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" }, "fiyat degisimi icin 6 saat beklenmeli")).toBe("fiyat degisimi icin 6 saat beklenmeli");
    s.calistirKadar(t0 + 2 * SAAT + 30 * 60_000);
    expect(reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: 1 }, "fiyat degisimi icin 4 saat beklenmeli")).toBe("fiyat degisimi icin 4 saat beklenmeli"); // 3,5 -> 4
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: null }); // boşaltma muaf
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" }); // boş yuvaya ilk doldurma muaf
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "un" }); // süre doldu
  });
});

describe("dukkan_fiyat", () => {
  it("başarı ve reddedilenler: DUK-16 (kademe aralığı), DUK-17 (boş yuva), DUK-19c (aynı kademe), DUK-12/DUK-10; fiyatT yazılır; mal değişince kademe varsayılana döner", () => {
    const { s, dukkan } = dukkanliDunya(["a", "b"]);
    const id = dukkan["a"]!.id;
    const pk = s.ic.mulk!.perakende!;
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" });
    reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 1, fiyat: 1 }, "bos yuvaya fiyat verilemez");
    reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: pk.p.varsayilanFiyatKademesi }, "fiyat zaten bu kademede");
    reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: 4 }, "gecersiz fiyat kademesi: 4 (0..3)");
    reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: -1 }, "gecersiz fiyat kademesi: -1 (0..3)");
    reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: 1.5 }, "gecersiz fiyat kademesi: 1.5");
    reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 9, fiyat: 1 }, "gecersiz yuva: 9 (0..5)");
    reddedilir(s, "b", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: 1 }, `dukkan bulunamadi: ${id}`);
    const t = s.dunya.zaman;
    tamam(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: 3 });
    expect(dukkanlar(s)[0]!.e.dukkan!.raf[0]).toMatchObject({ mal: "ekmek", fiyat: 3, fiyatT: t });
    // hız sınırı fiyat değişimi için de geçerli
    reddedilir(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: 1 }, "fiyat degisimi icin 6 saat beklenmeli");
    s.calistirKadar(t + 6 * SAAT);
    tamam(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: 1 });
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "un" }); // mal değişimi kademeyi varsayılana çeker
    expect(dukkanlar(s)[0]!.e.dukkan!.raf[0]!.fiyat).toBe(pk.p.varsayilanFiyatKademesi);
  });
});

describe("dukkan_yik (§7.9): iade YOK, para hareketi 0", () => {
  it("başarı: yapı ve dukkan alanı yok, hücre tesis işareti yok, hücre sahibi / arazi değeri / ilçe sayacı aynı; para defteri ve hazine bayt bayt aynı; korunum tam", () => {
    const { s, dukkan } = dukkanliDunya(["a"]);
    const id = dukkan["a"]!.id;
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" });
    tamam(s, "a", { tur: "marka_tanimla", marka: 0, ad: "Firin Bir", simge: 1, renk: 2 });
    tamam(s, "a", { tur: "dukkan_marka", dukkan: id, marka: 0 });
    s.calistirKadar(s.dunya.zaman + 5 * SAAT);
    const hucre = dukkan["a"]!.hucreler[0] as string;
    const b = s.dunya.bolgeler[isletmeBul(s.dunya, "a", OVA_IL)!.bolgeIndeksi]!;
    const arazi = mulkOyuncuBul(s.dunya, "a")!.araziDegeriMili;
    const ilceSay = ilceBul(s.dunya, OVA)!.satilmisHucre;
    korunumTutar(s, "yik oncesi");
    const para0 = paraMetni(s);
    const celik = s.ic.malIndeks["celik"]!;
    const stok0 = b.stoklar[celik]!.miktar;
    tamam(s, "a", { tur: "dukkan_yik", dukkan: id });
    expect(dukkanlar(s)).toHaveLength(0);
    expect((b.ekYapilar ?? []).some((e) => e.id === id)).toBe(false);
    expect(b.ekYapilar).toBeUndefined(); // liste boşalınca alan silinir ("yalnız kullanılınca yazılır")
    expect(hucreBul(s.dunya, hucre)).toMatchObject({ sahip: "a" });
    expect(hucreBul(s.dunya, hucre)!.tesis).toBeUndefined();
    expect(mulkOyuncuBul(s.dunya, "a")!.araziDegeriMili).toBe(arazi);
    expect(ilceBul(s.dunya, OVA)!.satilmisHucre).toBe(ilceSay);
    expect(paraMetni(s)).toBe(para0); // yıkımda para hareketi 0: hazine, musluk, lavabo, kasa aynı
    expect(b.stoklar[celik]!.miktar).toBe(stok0); // stok işlemi yok (raftaki mallar düğüm stoğunda zaten)
    korunumTutar(s, "yik sonrasi");
    // marka tanımı oyuncuda kalır; dükkân bağı gider
    expect(mulkOyuncuBul(s.dunya, "a")!.markalar).toEqual([{ ad: "firin bir", simge: 1, renk: 2 }]);
    // yıkımdan sonra komutlar dükkânı bulamaz; aynı kimlikle ikinci yıkım DUK-10
    reddedilir(s, "a", { tur: "dukkan_yik", dukkan: id }, `dukkan bulunamadi: ${id}`);
    reddedilir(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "un" }, `dukkan bulunamadi: ${id}`);
  });

  it("başkasının dükkânı DUK-10 (durum değişmez); inşaattaki kimlik DUK-23; tamsayı olmayan kimlik DUK-10", () => {
    const { s, dukkan } = dukkanliDunya(["a", "b"]);
    reddedilir(s, "b", { tur: "dukkan_yik", dukkan: dukkan["a"]!.id }, `dukkan bulunamadi: ${dukkan["a"]!.id}`);
    expect(dukkanlar(s)).toHaveLength(2);
    // b'nin süren inşaatı: a o kimlikle yıkım isterse DUK-10 (bilgi sızdırmaz), sahibi isterse DUK-23
    const h = ilceHucreleri(OVA)[40] as string;
    tamam(s, "b", dukkanKomutu(OVA, h, "firin"));
    const insId = s.dunya.insaatlar.find((i) => i.sahip === "b")!.id;
    reddedilir(s, "a", { tur: "dukkan_yik", dukkan: insId }, `dukkan bulunamadi: ${insId}`);
    reddedilir(s, "b", { tur: "dukkan_yik", dukkan: insId }, "dukkan henuz tamamlanmadi");
    reddedilir(s, "a", { tur: "dukkan_yik", dukkan: 1.5 }, "dukkan bulunamadi: 1.5");
    reddedilir(s, "a", { tur: "dukkan_yik", dukkan: "x" as unknown as number }, "dukkan bulunamadi: x");
  });

  it("parsel_birak aynı hücrede başarılı; yıkımdan sonra aynı hücreye yeniden dükkân kurulabilir", () => {
    const { s, dukkan } = dukkanliDunya(["a"]);
    const hucre = dukkan["a"]!.hucreler[0] as string;
    // yapı varken parsel_birak reddedilir
    reddedilir(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: [hucre] }, "hucre bos degil");
    tamam(s, "a", { tur: "dukkan_yik", dukkan: dukkan["a"]!.id });
    const yeni = dukkanKur(s, "a", OVA, hucre, "firin"); // aynı hücre, yeniden kurulum
    expect(yeni.dukkan!.tur).toBe("firin");
    tamam(s, "a", { tur: "dukkan_yik", dukkan: yeni.id });
    tamam(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: [hucre] });
    expect(hucreBul(s.dunya, hucre)).toBeUndefined();
  });

  it("kur-yık döngüsü: indirim sayacı yıkımda GERİ VERİLMEZ; ikinci kurulum indirimsiz bedel; yıkım indirimliYapi alanına dokunmaz", () => {
    const v = komutVeri((v2) => {
      const yo = v2.param.mulk!.yeniOyuncu;
      yo.ilkYapiIndirimPpm = 300_000;
      yo.indirimliYapiSayisi = 1;
    });
    const s = mulkSim(["a"], v);
    const hucre = ilceHucreleri(OVA)[3] as string;
    const harca = (k: () => ReturnType<typeof dukkanKur>): { e: ReturnType<typeof dukkanKur>; para: number } => {
      // Bedel yalnız komut anında (zaman geçmeden) hazineden düşer; inşaatın bitmesi için beklemek hazineyi (vergi, gelir) etkileyebilir.
      const once = anlikHazine(s.dunya, "a");
      tamam(s, "a", dukkanKomutu(OVA, hucre, "bakkal"));
      const para = once - anlikHazine(s.dunya, "a");
      s.calistirKadar(s.dunya.zaman + 6 * SAAT);
      void k;
      return { e: dukkanlar(s)[0]!.e, para };
    };
    const bir = harca(() => dukkanKur(s, "a", OVA, hucre));
    const arsa = hucreBul(s.dunya, hucre)!.degerMili;
    expect(bir.para).toBe(arsa + 4_200_000); // arsa + indirimli bedel (6 000 000 x %70)
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(1);
    tamam(s, "a", { tur: "dukkan_yik", dukkan: bir.e.id });
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(1); // geri verilmedi
    const iki = harca(() => dukkanKur(s, "a", OVA, hucre));
    expect(iki.para).toBe(6_000_000); // arsa oyuncuda kaldı; indirim hakkı yok: tam bedel
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(1);
  });
});

describe("DUK-00 ve bölge kipi: blok yokken komutlar reddedilir, durum özeti DEĞİŞMEZ", () => {
  const KOMUTLAR: Komut[] = [
    { tur: "dukkan_raf", dukkan: 1, yuva: 0, mal: "ekmek" },
    { tur: "dukkan_raf", dukkan: 1, yuva: 0, mal: null },
    { tur: "dukkan_fiyat", dukkan: 1, yuva: 0, fiyat: 2 },
    { tur: "marka_tanimla", marka: 0, ad: "Firin 1", simge: 0, renk: 0 },
    { tur: "dukkan_marka", dukkan: 1, marka: 0 },
    { tur: "dukkan_yik", dukkan: 1 },
  ];

  it("mülk dünyası, perakende bloğu YOK: her komut `perakende kapali`; tesisTuru dukkan da (bilinmeyen tür değil, DUK-00); özet aynı", () => {
    const s = mulkSim(["a"], komutVeri(undefined, false));
    for (const k of KOMUTLAR) reddedilir(s, "a", k, "perakende kapali");
    reddedilir(s, "a", dukkanKomutu(OVA, ilceHucreleri(OVA)[3] as string, "bakkal"), "perakende kapali");
    reddedilir(s, "a", { ...dukkanKomutu(OVA, ilceHucreleri(OVA)[3] as string, "bakkal"), tur: "tesis_insa_hucre" } as Komut, "perakende kapali");
    // sistem yolu: marka_sifirla da DUK-00; oyuncu yolundan SIS-01
    const once = s.durumOzeti();
    const r = s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "marka_sifirla", oyuncu: "a", marka: 0 } });
    expect(r).toEqual({ tamam: false, hata: "perakende kapali" });
    expect(s.durumOzeti()).toBe(once);
    expect(ver(s, "a", { tur: "marka_sifirla", oyuncu: "a", marka: 0 })).toEqual({ tamam: false, hata: "marka_sifirla yalnizca 'sistem' ile verilebilir" });
  });

  it("bölge kipi (parsel yok): komutlar `mulk kipi kapali`, sistem marka_sifirla `perakende kapali`; özet aynı", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 3);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    s.calistirKadar(s.dunya.zaman);
    expect(s.dunya.mulk).toBeUndefined();
    for (const k of [...KOMUTLAR, dukkanKomutu(OVA, "1:1", "bakkal")]) {
      const once = s.durumOzeti();
      expect(ver(s, "a", k), k.tur).toEqual({ tamam: false, hata: "mulk kipi kapali" });
      expect(s.durumOzeti()).toBe(once);
    }
    const once = s.durumOzeti();
    expect(s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "marka_sifirla", oyuncu: "a", marka: 0 } })).toEqual({ tamam: false, hata: "perakende kapali" });
    expect(s.durumOzeti()).toBe(once);
  });

  it("dükkânsız perakendeli mülk dünyası = perakendesiz dünya (3 gün); dükkân + marka komutları durumu GERÇEKTEN değiştirir (negatif kontrol)", () => {
    const a = mulkSim(["a"], komutVeri(undefined, false), 3);
    const b = mulkSim(["a"], komutVeri(), 3);
    a.calistirKadar(3 * GUN);
    b.calistirKadar(3 * GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
    tamam(b, "a", { tur: "marka_tanimla", marka: 0, ad: "Deneme", simge: 0, renk: 0 });
    expect(b.durumOzeti()).not.toBe(a.durumOzeti());
  });
});

describe("para korunumu ve reddedilen komutlar: tohumlu rastgele komut koşusu", () => {
  function rastgeleKosu(tohum: number): { sayi: { tamam: number; red: number }; s: Simulasyon } {
    const v2 = komutVeri((x) => {
      x.param.mulk!.yeniOyuncu.hibe = 3_000_000_000;
    });
    const s = mulkSim(["a", "b", "c"], v2, tohum);
    const rng = prngOlustur(tohum, "perakende-komut-kosu");
    const oyuncular = ["a", "b", "c"];
    const mallar = ["ekmek", "un", "gida", "sut", "ekmek", "un", "celik", "yok_mal"];
    const adlar = ["Firin", "ISIK Gida", "Bakkal & Oglu", "Çiçek 1", "Köşe", "Sütçü", "Kose  Bakkal", "x", "emoji😀"];
    const hucreler = [ilceHucreleri(OVA), ilceHucreleri(LIMAN), ilceHucreleri(DAG)];
    const sayi = { tamam: 0, red: 0 };
    korunumTutar(s, "baslangic");
    // Başlangıç: her oyuncu bir dükkân kurar (koşu dükkânlı dünyada geçsin)
    for (const o of oyuncular) {
      // oyuncunun KENDİ ilk işletmesi (yurdun ili): kurulum kiti orada
      const ilce = `${s.dunya.mulk!.isletmeler.find((x) => x.oyuncu === o)!.il}_merkez`;
      const bos = ilceHucreleri(ilce).filter((h) => hucreBul(s.dunya, h) === undefined);
      tamam(s, o, dukkanKomutu(ilce, bos[5] as string, "bakkal"));
      s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    }
    for (let i = 0; i < 120; i++) {
      s.calistirKadar(s.dunya.zaman + (aralik(rng, 90) + 1) * 60_000);
      const o = oyuncular[aralik(rng, 3)] as string;
      const dk = dukkanlar(s).filter((x) => x.oyuncu === o);
      // %70 geçerli kimlik (kendi dükkânı), kalanı başkasının / bilinmeyen
      const baskasi = dukkanlar(s).filter((x) => x.oyuncu !== o).map((x) => x.e.id);
      const id = aralik(rng, 10) < 7 && dk.length > 0 ? (dk[aralik(rng, dk.length)] as { e: { id: number } }).e.id : ([...baskasi, 77_777, 1][aralik(rng, baskasi.length + 2)] as number);
      const sec = aralik(rng, 12);
      let k: Komut;
      if (sec === 0) {
        const il = aralik(rng, 3);
        const ilce = [OVA, LIMAN, DAG][il] as string;
        k = dukkanKomutu(ilce, hucreler[il]![aralik(rng, 60)] as string, ["bakkal", "firin", "market"][aralik(rng, 3)] as string);
      } else if (sec <= 3) k = { tur: "dukkan_raf", dukkan: id, yuva: aralik(rng, 7), mal: aralik(rng, 6) === 0 ? null : (mallar[aralik(rng, mallar.length)] as string) };
      else if (sec <= 5) k = { tur: "dukkan_fiyat", dukkan: id, yuva: aralik(rng, 7), fiyat: aralik(rng, 5) };
      else if (sec <= 7) k = { tur: "marka_tanimla", marka: aralik(rng, 3), ad: adlar[aralik(rng, adlar.length)] as string, simge: aralik(rng, 9), renk: aralik(rng, 9) };
      else if (sec === 8) k = { tur: "dukkan_marka", dukkan: id, marka: aralik(rng, 3) };
      else if (sec === 9) k = aralik(rng, 4) === 0 ? { tur: "dukkan_yik", dukkan: id } : { tur: "dukkan_fiyat", dukkan: id, yuva: aralik(rng, 6), fiyat: aralik(rng, 4) };
      else if (sec === 10) k = { tur: "insaat_iptal", insaat: s.dunya.insaatlar[0]?.id ?? 0 };
      else k = { tur: "dukkan_raf", dukkan: id, yuva: aralik(rng, 6), mal: mallar[aralik(rng, 4)] as string };
      s.calistirKadar(s.dunya.zaman);
      const hazine = paraMetni(s); // para uzlaştırır (durumu değiştirir): özetten ÖNCE alınmalı
      const once = s.durumOzeti();
      const r = ver(s, o, k);
      if (!r.tamam) {
        sayi.red++;
        expect(s.durumOzeti(), `reddedilen komut durumu degistirdi: ${JSON.stringify(k)} -> ${r.hata}`).toBe(once);
        continue;
      }
      sayi.tamam++;
      // dükkân/marka komutları PARA hareketi yapmaz (kurulum ve iptal harcama/iade yapar: yalnız o ikisi hazineyi değiştirebilir)
      if (k.tur !== "yapi_yerlestir" && k.tur !== "insaat_iptal") expect(paraMetni(s), `${k.tur} para hareketi yapti`).toBe(hazine);
      if (i % 5 === 0) korunumTutar(s, `adim ${i}`);
    }
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    korunumTutar(s, "son");
    return { sayi, s };
  }

  for (const tohum of [11, 12, 13]) {
    it(`tohum ${tohum}: her adımda korunum TAM eşitlik, reddedilen komut durumu değiştirmez, dükkân/marka komutları para hareketi yapmaz; koşu anlamlı (kabul ve ret çok)`, () => {
      const { sayi, s } = rastgeleKosu(tohum);
      expect(sayi.tamam).toBeGreaterThan(10);
      expect(sayi.red).toBeGreaterThan(10);
      // koşu dükkânlı dünyaya GERÇEKTEN ulaştı: en az bir dükkân kuruldu ya da marka tanımlandı
      const marka = s.dunya.mulk!.oyuncular.some((o) => o.markalar !== undefined);
      expect(dukkanlar(s).length > 0 || marka).toBe(true);
    });
  }
});
