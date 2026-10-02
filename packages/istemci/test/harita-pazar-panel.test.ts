import { describe, expect, it, vi } from "vitest";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import type { IsletmeDurumu, PazarKaynagi, PazarSatisIstegi, PazarSatisSonucu } from "../src/harita/baglanti";
import { PazarSatPaneli, satisMiktari } from "../src/harita/pazar-sat";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const kaynak = (ek: Partial<PazarKaynagi> = {}): PazarKaynagi => ({ bolge: "il#ali", il: "il", mal: "tahil", stokMili: 12_000, uretimMili: 3000, emirMili: 0, uygun: true, ...ek });
function kur(l = [kaynak()], komut = vi.fn<(i: PazarSatisIstegi) => Promise<PazarSatisSonucu>>().mockResolvedValue({ tamam: true, t: 0 })) {
  const bildir = vi.fn();
  const mallar = (): IsletmeDurumu["mallar"] => [...new Set(l.map((k) => k.mal))].map((mal) => ({ mal, stokMili: 12000, uretimMili: 3000, satisMili: 0, alisMili: 0 }));
  const p = new PazarSatPaneli({ ic, isletme: () => ({ simZamani: 30 * 60_000, hazineMili: 0, hazineOraniMili: 0, araziDegeriMili: 0, araziVergisiMili: 0, ilceHucre: [], korumaBitis: null, ayrilmisBitis: null, indirimliYapiKalan: null, yapilar: [], mallar: mallar(), pazar: l }), malAdi: () => "Tahıl", ilAdi: (il) => il === "il" ? "Kocaeli" : "Bursa", referans: () => undefined, kalkan: () => false, ilkSatisOdulu: () => null, ilkDukkanSatisi: () => false, komut: async (i) => { const r = await komut(i); return r.tamam ? r : { tamam: false, hata: "sunucu", mesaj: r.mesaj }; }, degisti: vi.fn(), bildir });
  const html = (): string => p.satirEki(mallar()[0] ?? { mal: "tahil", stokMili: 0, uretimMili: 0, satisMili: 0, alisMili: 0 });
  return { p, komut, bildir, html };
}

describe("Pazar satış formu: tek Claude controllerında ağ ve çıkış seçimi", () => {
  it("miktar miliye çevrilir; Türkçe virgül, 0 iptal, en çok üç ondalık; boş/negatif/NaN/sınır dışı ret", () => {
    expect(satisMiktari("2,125")).toBe(2125);
    expect(satisMiktari("0")).toBe(0);
    for (const deger of ["", " ", "-1", "NaN", "Infinity", "1e3", "1.0001", "1000001"]) expect(satisMiktari(deger), deger).toBeNull();
  });
  it("açılış üretim miktarını önerir; mal/il/birim ve sonraki işlem metni, tek birincil onay", async () => {
    const { p, html } = kur();
    expect(html()).toContain("Kocaeli");
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    expect(html()).toContain('value="3"');
    expect(html()).toContain("birim/saat");
    expect(html()).toContain("Bir sonraki işlem ≈ 30 dk sonra.");
    expect(html().match(/birincil/g)).toHaveLength(1);
  });
  it("aynı mal için seçilen ikinci il doğru komutla gider", async () => {
    const { p, komut, html } = kur([kaynak(), kaynak({ bolge: "il2#ali", il: "il2", stokMili: 5000, uretimMili: 1000 })]);
    expect(html()).toContain("Bursa");
    await p.eylem({ eylem: "ac", bolge: "il2#ali", mal: "tahil" });
    p.girdi("2,5");
    await p.eylem({ eylem: "ver" });
    expect(komut).toHaveBeenCalledWith({ bolge: "il2#ali", mal: "tahil", oranSaat: 2500 });
    expect(p.durum.acik).toBeNull();
  });
  it("kesin boş ve uygun olmayan kaynakta komut yok; depolanamaz malda satış eylemi yok", async () => {
    for (const k of [kaynak({ stokMili: 0, uretimMili: 0 }), kaynak({ uygun: false })]) {
      const { p, komut, html } = kur([k]);
      expect(html()).toContain('aria-disabled="true"');
      expect(html()).not.toContain(' disabled');
      await p.eylem({ eylem: "ac", bolge: k.bolge, mal: k.mal });
      await p.eylem({ eylem: "ver" });
      expect(komut).not.toHaveBeenCalled();
    }
    expect(kur([kaynak({ stokMili: 0, uretimMili: 0 })]).html()).toContain("Önce üretim bekleniyor.");
    expect(kur([kaynak({ mal: "elektrik" })]).html()).toBe("");
  });
  it("çıkış düğümü boşken ağ stoğu, üretimi veya gelen akışı satışa izin verir", async () => {
    for (const ag of [{ stokMili: 5000, uretimMili: 0, gelenMili: 0 }, { stokMili: 0, uretimMili: 3000, gelenMili: 0 }, { stokMili: 0, uretimMili: 0, gelenMili: 2000 }]) {
      const { p, komut, html } = kur([kaynak({ stokMili: 0, uretimMili: 0, ag })]);
      expect(html()).not.toContain('aria-disabled="true"');
      await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
      p.girdi("1");
      await p.eylem({ eylem: "ver" });
      expect(komut).toHaveBeenCalledWith({ bolge: "il#ali", mal: "tahil", oranSaat: 1000 });
    }
  });
  it("bildirilmeyen gelen akışı sıfır sayıp engellemez; kesin boş ağ engellenir", async () => {
    const { p, komut } = kur([kaynak({ stokMili: 0, uretimMili: 0, ag: { stokMili: 0, uretimMili: 0, gelenMili: null } })]);
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    p.girdi("1");
    await p.eylem({ eylem: "ver" });
    expect(komut).toHaveBeenCalledWith({ bolge: "il#ali", mal: "tahil", oranSaat: 1000 });
    const bos = kur([kaynak({ stokMili: 0, uretimMili: 0, ag: { stokMili: 0, uretimMili: 0, gelenMili: 0 } })]);
    expect(bos.html()).toContain('aria-disabled="true"');
    await bos.p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    await bos.p.eylem({ eylem: "ver" });
    expect(bos.komut).not.toHaveBeenCalled();
  });
  it("boş/negatif miktar role=alert ret; yazılan değer formda korunur", async () => {
    const { p, komut, html } = kur();
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    for (const deger of ["", "-1", "NaN"]) {
      p.girdi(deger);
      await p.eylem({ eylem: "ver" });
      expect(html()).toContain(`value="${deger}"`);
      expect(html()).toContain('role="alert">Geçerli bir saatlik satış miktarı');
    }
    expect(komut).not.toHaveBeenCalled();
  });
  it("sunucu ret değer/formu korur; Vazgeç komut göndermeden kapanır", async () => {
    const komut = vi.fn<(i: PazarSatisIstegi) => Promise<PazarSatisSonucu>>().mockResolvedValue({ tamam: false, mesaj: "Satış emri yerlerin dolu." });
    const { p, html } = kur([kaynak()], komut);
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    p.girdi("4,25");
    await p.eylem({ eylem: "ver" });
    expect(html()).toContain('value="4,25"');
    expect(html()).toContain('role="alert">Satış emri yerlerin dolu.');
    await p.eylem({ eylem: "vazgec" });
    expect(komut).toHaveBeenCalledTimes(1);
    expect(p.durum.acik).toBeNull();
  });
  it("stok0 aktif emir açılır; ayrı iptal/0 aynı komuta gider; kaybolan kaynak kimliğiyle iptal", async () => {
    const l = [kaynak({ stokMili: 0, uretimMili: 0, emirMili: 4000, ag: { stokMili: 0, uretimMili: 0, gelenMili: 0 } })];
    const { p, komut, html } = kur(l);
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    expect(html()).toContain("Satışı bırak");
    await p.eylem({ eylem: "birak" });
    expect(komut).toHaveBeenLastCalledWith({ bolge: "il#ali", mal: "tahil", oranSaat: 0 });
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    p.girdi("0");
    await p.eylem({ eylem: "ver" });
    expect(komut).toHaveBeenCalledTimes(2);
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    l.splice(0);
    expect(html()).not.toContain("Satışı bırak");
    await p.eylem({ eylem: "birak" });
    expect(komut).toHaveBeenLastCalledWith({ bolge: "il#ali", mal: "tahil", oranSaat: 0 });
  });
  it("gönderim sırasında yinelenen eylem tek komuttur", async () => {
    let coz!: (r: PazarSatisSonucu) => void;
    const komut = vi.fn<(i: PazarSatisIstegi) => Promise<PazarSatisSonucu>>(() => new Promise((r) => { coz = r; }));
    const { p, html } = kur([kaynak()], komut);
    await p.eylem({ eylem: "ac", bolge: "il#ali", mal: "tahil" });
    const islem = p.eylem({ eylem: "ver" });
    await p.eylem({ eylem: "ver" });
    p.kapat();
    expect(komut).toHaveBeenCalledTimes(1);
    expect(html()).toContain('data-durum="gonderiliyor"');
    coz({ tamam: true, t: 0 });
    await islem;
    expect(p.durum.acik).toBeNull();
  });
});
