/**
 * G7-1b (sartname §4.6, §9.1, §9.2): `icerikDerle` perakende bağlaması, komut tipleri/alan sözlüğü ve komutların blok yokken ret davranışı (DUK-00). Etkin komut yolları G7-3'tedir.
 */
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { KOMUT_SEMASI, SISTEM_ALAN_TURLERI } from "../src/komutSemasi";
import type { AlanTuru } from "../src/komutSemasi";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import type { CekirdekVeriPaketi, Komut, KomutTuru } from "../src/tipler";
import { perakendeBlogu } from "../../veri/test/perakende-g7-yardimci";
import { mulkSim, mulkVeriTam, ver } from "./mulk-yardimci";
import { miniVeriyiYukle } from "@bolge/veri";

function veri(blok: boolean): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const mulk = v.param.mulk!;
    if (!blok) {
      // G7-4: gerçek parametreler.json blok ve dükkân ek yapısını taşır; "blok yok" kurgusu açıkça silinir
      delete mulk.perakende;
      if (mulk.ekYapilar !== undefined) delete mulk.ekYapilar["dukkan"];
      return;
    }
    mulk.ekYapilar = { ...(mulk.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 6_000_000, insaMaliyeti: { celik: 20_000, parca: 8_000 }, enFazlaIlBasina: 6, olcekHucre: [1, 2, 3] } };
    mulk.perakende = perakendeBlogu();
  });
}

const YENI_OYUNCU_KOMUTLARI: Komut[] = [
  { tur: "dukkan_raf", dukkan: 1, yuva: 0, mal: "ekmek" },
  { tur: "dukkan_raf", dukkan: 1, yuva: 0, mal: null },
  { tur: "dukkan_fiyat", dukkan: 1, yuva: 0, fiyat: 2 },
  { tur: "marka_tanimla", marka: 0, ad: "Firin 1", simge: 0, renk: 0 },
  { tur: "dukkan_marka", dukkan: 1, marka: 0 },
  { tur: "dukkan_yik", dukkan: 1 },
];

describe("icerikDerle: perakende bağlaması", () => {
  it("blok yok: ic.mulk.perakende OLUŞMAZ (bugünkü mülk dünyası aynı); blok var: derlenmiş perakende bağlanır", () => {
    expect(icerikDerle(veri(false)).mulk!.perakende).toBeUndefined();
    const ic = icerikDerle(veri(true));
    expect(ic.mulk!.perakende).toBeDefined();
    expect(ic.mulk!.perakende!.turler.has("bakkal")).toBe(true);
  });

  it("bölge kipinde (parsel yok) perakende okunmaz: ic.mulk tanımsız", () => {
    const v = veri(true);
    delete v.parsel;
    expect(icerikDerle(v).mulk).toBeUndefined();
  });

  it("blok durumu özeti DEĞİŞTİRMEZ: perakende bloğu tanımlı ama kullanılmayan dünya = blok yok dünyası (3 gün)", () => {
    const a = mulkSim(["a"], veri(false));
    const b = mulkSim(["a"], veri(true));
    a.calistirKadar(72 * 3_600_000);
    b.calistirKadar(72 * 3_600_000);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
  });
});

describe("alan sözlüğü (KOMUT_SEMASI): yeni komutlar", () => {
  const yeni: KomutTuru[] = ["dukkan_raf", "dukkan_fiyat", "marka_tanimla", "dukkan_marka", "dukkan_yik", "marka_sifirla"];

  it("alan türleri şartnamedeki gibi; yalnız marka adı `metin`; fiyat bir KADEME indeksidir (secim)", () => {
    expect(KOMUT_SEMASI.dukkan_raf).toEqual({ yol: "oyuncu", alanlar: { dukkan: "kimlik", yuva: "secim", mal: "kimlik" } });
    expect(KOMUT_SEMASI.dukkan_fiyat).toEqual({ yol: "oyuncu", alanlar: { dukkan: "kimlik", yuva: "secim", fiyat: "secim" } });
    expect(KOMUT_SEMASI.marka_tanimla).toEqual({ yol: "oyuncu", alanlar: { marka: "secim", ad: "metin", simge: "secim", renk: "secim" } });
    expect(KOMUT_SEMASI.dukkan_marka).toEqual({ yol: "oyuncu", alanlar: { dukkan: "kimlik", marka: "secim" } });
    expect(KOMUT_SEMASI.dukkan_yik).toEqual({ yol: "oyuncu", alanlar: { dukkan: "kimlik" } });
    expect(KOMUT_SEMASI.marka_sifirla).toEqual({ yol: "sistem", alanlar: { oyuncu: "kimlik", marka: "secim" } });
    expect(KOMUT_SEMASI.tesis_insa_hucre.alanlar).toMatchObject({ dukkanTuru: "kimlik", yontem: "kimlik" });
    expect(KOMUT_SEMASI.yapi_yerlestir.alanlar).toMatchObject({ dukkanTuru: "kimlik", yontem: "kimlik" });
  });

  it("hiçbir yeni alan miktar, oran ya da adet DEĞİLDİR; `metin` sistem yolunda yasaktır (SISTEM_ALAN_TURLERI'nde yok); sistem yolundaki TÜM komutlar izinli türlerde", () => {
    for (const t of yeni) for (const [alan, tur] of Object.entries(KOMUT_SEMASI[t].alanlar as Record<string, AlanTuru>)) expect(["miktar", "oran", "adet"], `${t}.${alan}`).not.toContain(tur);
    expect(SISTEM_ALAN_TURLERI).not.toContain("metin");
    for (const t of Object.keys(KOMUT_SEMASI) as KomutTuru[]) {
      if (KOMUT_SEMASI[t].yol !== "sistem") continue;
      for (const [alan, tur] of Object.entries(KOMUT_SEMASI[t].alanlar as Record<string, AlanTuru>)) expect(SISTEM_ALAN_TURLERI, `${t}.${alan}`).toContain(tur);
    }
    // metin alanı yalnız marka_tanimla.ad
    const metinler: string[] = [];
    for (const t of Object.keys(KOMUT_SEMASI) as KomutTuru[]) for (const [alan, tur] of Object.entries(KOMUT_SEMASI[t].alanlar as Record<string, AlanTuru>)) if (tur === "metin") metinler.push(`${t}.${alan}`);
    expect(metinler).toEqual(["marka_tanimla.ad"]);
  });
});

describe("komutlar: perakende yokken DUK-00; yetkisiz marka_sifirla; bölge kipi", () => {
  it("mülk kipi, blok yok: beş oyuncu komutu `perakende kapali`; durum DEĞİŞMEZ", () => {
    const s = mulkSim(["a"], veri(false));
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    for (const k of YENI_OYUNCU_KOMUTLARI) expect(ver(s, "a", k), k.tur).toEqual({ tamam: false, hata: "perakende kapali" });
    expect(s.durumOzeti()).toBe(once);
  });

  it("blok var, dükkân yok (komut yolu G7-3'te etkin): dükkân komutları `dukkan bulunamadi`; durum DEĞİŞMEZ; marka_tanimla başarılı olur (ayrıntı: perakende-komut, marka-sozdizimi)", () => {
    const s = mulkSim(["a"], veri(true));
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    for (const k of YENI_OYUNCU_KOMUTLARI) {
      if (k.tur === "marka_tanimla") continue;
      const r = ver(s, "a", k);
      expect(r.tamam, k.tur).toBe(false);
      expect((r as { hata: string }).hata, k.tur).toBe("dukkan bulunamadi: 1");
    }
    expect(s.durumOzeti()).toBe(once);
    expect(ver(s, "a", YENI_OYUNCU_KOMUTLARI.find((k) => k.tur === "marka_tanimla") as Komut)).toEqual({ tamam: true });
    expect(s.durumOzeti()).not.toBe(once);
  });

  it("marka_sifirla: oyuncu yolundan SIS-01; sistem yolundan perakende kapali (blok yok); durum değişmez", () => {
    const s = mulkSim(["a"], veri(false));
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    expect(ver(s, "a", { tur: "marka_sifirla", oyuncu: "a", marka: 0 })).toEqual({ tamam: false, hata: "marka_sifirla yalnizca 'sistem' ile verilebilir" });
    expect(ver(s, SISTEM_OYUNCUSU, { tur: "marka_sifirla", oyuncu: "a", marka: 0 })).toEqual({ tamam: false, hata: "perakende kapali" });
    expect(s.durumOzeti()).toBe(once);
  });

  it("bölge kipi: yeni komutlar `mulk kipi kapali` ile reddedilir (alan bölge kipi komutu değildir); durum değişmez", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 3);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    for (const k of YENI_OYUNCU_KOMUTLARI) expect(ver(s, "a", k), k.tur).toEqual({ tamam: false, hata: "mulk kipi kapali" });
    expect(s.durumOzeti()).toBe(once);
  });
});
