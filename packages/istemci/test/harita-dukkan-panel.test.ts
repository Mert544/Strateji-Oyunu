/** Dükkân paneli denetleyicisi (saf): durum, komut gönderimi ve ret metni. Gerçek DOM yok; komutlar sahte `dukkanKomutu` ile kaydedilir. */
import { describe, expect, it } from "vitest";
import type { Komut } from "@bolge/cekirdek";
import type { Icerik } from "../src/komut/tablo";
import type { DukkanKomutSonucu } from "../src/harita/baglanti";
import { DukkanPaneli, dukkanPanelParam } from "../src/harita/dukkan-panel";
import type { DukkanPaneliGirdisi } from "../src/harita/dukkan-panel";
import type { DukkanGorunumu, DukkanKaydi, DukkanYuvasi } from "../src/harita/dukkan-veri";

const yuva = (o: Partial<DukkanYuvasi> = {}): DukkanYuvasi => ({ mal: null, kademe: 2, etkinKademe: 2, stokVar: true, istekMiliSaat: 0, fiyatMili: 0, netMiliSaat: 0, fiyatT: 0, beklemeSaat: 0, ...o });
const dukkan = (o: Partial<DukkanKaydi> = {}): DukkanKaydi => ({
  id: 7,
  tur: "bakkal",
  durum: "acik",
  ilce: "a",
  markaAd: "",
  yuvalar: [yuva({ mal: "gida", fiyatMili: 66_000, istekMiliSaat: 5_000, fiyatT: 1 }), yuva(), yuva({ beklemeSaat: 2.5 }), yuva()],
  kasaPpm: 0,
  karsilanmaPpm: 1_000_000,
  gelirMiliSa: 1_000,
  giderMiliSa: 100,
  kampanya: { bitis: 0, kalanSaat: 4, kalanGun: 3 },
  ...o,
});
const gorunum = (d: DukkanKaydi[], markalar: DukkanGorunumu["markalar"] = []): DukkanGorunumu => ({ kapali: false, dukkanlar: d, markalar, ilkSatisT: null, satilabilirMallar: new Set(["gida", "tahil"]), kurmaKarsilaniyor: true, kampanyaAcik: true });

function kur(g: DukkanGorunumu | null, sonuc: (k: Komut) => DukkanKomutSonucu = () => ({ tamam: true, t: 1 })) {
  const komutlar: Komut[] = [];
  const bildirimler: string[] = [];
  let degisti = 0;
  let bekle: (() => void) | null = null;
  const girdi: DukkanPaneliGirdisi = {
    gorunum: () => g,
    malAdi: (m) => ({ gida: "Gıda", tahil: "Tahıl" })[m] ?? m,
    simdi: () => 10 * 3_600_000,
    stokMili: (m) => (m === "tahil" ? 9_000 : 0),
    referans: (m) => ({ mili: m === "tahil" ? 40_000 : 60_000, yaklasik: false }),
    turMallari: () => ["gida", "tahil"],
    komut: async (k) => {
      komutlar.push(k);
      if (bekle !== null) await new Promise<void>((r) => (bekle = r));
      return sonuc(k);
    },
    param: { kasaBirimSa: 100, pencereSaat: 6, iadeYuzde: "%50", esnafPayiYuzde: "%20", normalKademePpm: 1_050_000 },
    degisti: () => degisti++,
    bildir: (m) => bildirimler.push(m),
  };
  return { p: new DukkanPaneli(girdi), komutlar, bildirimler, degisti: () => degisti, tut: () => (bekle = () => undefined) , birak: () => bekle?.() };
}

describe("dukkanPanelParam", () => {
  it("kasa birimi, pencere süresi, iade ve esnaf payı içerikten; dükkân kuralı yoksa tanımsız", () => {
    const ic = { param: { mulk: { insaatIptalIadePpm: 500_000, perakende: { fiyatDegisimEnAzSaat: 6, olcekler: [{ kasaMiliSaat: 100_000, giderMiliSaat: 1 }], esnaf: { tabanPayPpm: 200_000 }, dukkanTurleri: [], fiyatKademeleriPpm: [850_000, 950_000, 1_050_000, 1_150_000], varsayilanFiyatKademesi: 2 } } } } as unknown as Icerik;
    expect(dukkanPanelParam(ic)).toEqual({ kasaBirimSa: 100, pencereSaat: 6, iadeYuzde: "%50", esnafPayiYuzde: "%20", normalKademePpm: 1_050_000 });
    expect(dukkanPanelParam({ param: { mulk: {} } } as unknown as Icerik)).toBeUndefined();
    expect(dukkanPanelParam({ param: {} } as unknown as Icerik)).toBeUndefined();
  });
});

describe("DukkanPaneli: seçim ve raf", () => {
  it("seçilmeden boş; seçince ayrıntı (raf 4 yuva, özet, marka düğmesi); aynı dükkâna yeniden tıklayınca kapanır", async () => {
    const { p } = kur(gorunum([dukkan()]));
    expect(p.html()).toBe("");
    await p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    const h = p.html();
    expect(h).toContain('class="dk-panel" data-dukkan="7"');
    expect(h.match(/class="dk-yuva"/g)).toHaveLength(4);
    expect(h).toContain('data-eylem="marka-ac"');
    await p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    expect(p.html()).toBe("");
  });

  it('marka düğmesi: markasızken "Marka adı ver", markalıyken "Markayı değiştir"', async () => {
    const a = kur(gorunum([dukkan()]));
    await a.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    expect(a.p.html()).toContain('data-eylem="marka-ac">Marka adı ver</button>');
    const b = kur(gorunum([dukkan({ markaAd: "bereket" })]));
    await b.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    expect(b.p.html()).toContain('data-eylem="marka-ac">Markayı değiştir</button>');
  });

  it('"Rafa git" (Dikkat): dükkânı her zaman açar (Raf düğmesi gibi kapatmaz)', async () => {
    const { p } = kur(gorunum([dukkan()]));
    await p.eylem({ eylem: "dukkan-rafa", dukkan: 7 });
    expect(p.durum.secili).toBe(7);
    await p.eylem({ eylem: "dukkan-rafa", dukkan: 7 });
    expect(p.durum.secili).toBe(7);
    expect(p.html()).toContain('class="dk-panel" data-dukkan="7"');
  });

  it("boş yuva: seçici açılır (türün malları, stokluya fiyat); mal seçince dukkan_raf gider ve seçici kapanır", async () => {
    const t = kur(gorunum([dukkan()]));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "yuva", yuva: 1 });
    expect(t.p.durum.secici).toBe(1);
    const h = t.p.html();
    expect(h).toContain("Bu yuvaya hangi malı koyacaksın?");
    expect(h).toMatch(/Tahıl · stokta 9 · 42\s₺/); // referans 40 ₺ x Normal kademe 1,05 (uygulanacak fiyat; taban değil)
    expect(h).not.toContain("Gıda · stokta"); // gida zaten başka yuvada
    await t.p.eylem({ eylem: "mal", mal: "tahil" });
    expect(t.komutlar).toEqual([{ tur: "dukkan_raf", dukkan: 7, yuva: 1, mal: "tahil" }]);
    expect(t.p.durum.secici).toBeNull();
    expect(t.p.durum.yuva).toBe(1);
  });

  it("raf ret: Türkçe ret metni panelde (role=alert); seçici açık kalır", async () => {
    const t = kur(gorunum([dukkan()]), () => ({ tamam: false, mesaj: "Bu dükkânda bu mal satılamaz." }));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "yuva", yuva: 1 });
    await t.p.eylem({ eylem: "mal", mal: "tahil" });
    expect(t.p.durum.secici).toBe(1);
    expect(t.p.html()).toContain('<p class="dk-hata" role="alert">Bu dükkânda bu mal satılamaz.</p>');
  });

  it("bekleme penceresindeki boş yuva: komut gitmez, süre söylenir; kapalı öğe (aria-disabled) hiçbir şey yapmaz", async () => {
    const t = kur(gorunum([dukkan()]));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "yuva", yuva: 2, kapali: true });
    expect(t.komutlar).toHaveLength(0);
    expect(t.p.durum.secici).toBeNull();
    expect(t.p.durum.hata).toBe("Bu yuvaya en erken 2 sa 30 dk sonra mal koyabilirsin.");
    await t.p.eylem({ eylem: "mal", mal: "tahil", kapali: true });
    expect(t.komutlar).toHaveLength(0);
  });
});

describe("DukkanPaneli: kademe, kampanya, boşaltma", () => {
  async function secili() {
    const t = kur(gorunum([dukkan()]));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "yuva", yuva: 0 });
    return t;
  }

  it("dolu yuva seçilince kademe satırları; kademe indeksi gider (tutar değil), kampanya kademe 0", async () => {
    const t = await secili();
    expect(t.p.html()).toContain('data-kademe="3"');
    await t.p.eylem({ eylem: "kademe", kademe: 3 });
    await t.p.eylem({ eylem: "kampanya" });
    expect(t.komutlar).toEqual([
      { tur: "dukkan_fiyat", dukkan: 7, yuva: 0, fiyat: 3 },
      { tur: "dukkan_fiyat", dukkan: 7, yuva: 0, fiyat: 0 },
    ]);
  });

  it("boşalt: önce onay adımı (uyarı onayın üstünde), onayda dukkan_raf mal=null; vazgeçte komut yok", async () => {
    const t = await secili();
    await t.p.eylem({ eylem: "yuva-bosalt" });
    expect(t.p.html()).toContain('data-eylem="yuva-bosalt-onayla"');
    await t.p.eylem({ eylem: "onay-vazgec" });
    expect(t.komutlar).toHaveLength(0);
    expect(t.p.html()).not.toContain("yuva-bosalt-onayla");
    await t.p.eylem({ eylem: "yuva-bosalt" });
    await t.p.eylem({ eylem: "yuva-bosalt-onayla" });
    expect(t.komutlar).toEqual([{ tur: "dukkan_raf", dukkan: 7, yuva: 0, mal: null }]);
    expect(t.p.durum.yuva).toBeNull();
  });

  it("kademe ret: metin panelde, seçili yuva kalır", async () => {
    const t = kur(gorunum([dukkan()]), () => ({ tamam: false, mesaj: "Fiyatı en erken 3 saat sonra değiştirebilirsin." }));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "yuva", yuva: 0 });
    await t.p.eylem({ eylem: "kademe", kademe: 1 });
    expect(t.p.durum.yuva).toBe(0);
    expect(t.p.html()).toContain("Fiyatı en erken 3 saat sonra değiştirebilirsin.");
  });

  it("gönderim sürerken ikinci komut gönderilmez", async () => {
    const t = await secili();
    t.tut();
    const ilk = t.p.eylem({ eylem: "kademe", kademe: 1 });
    await Promise.resolve();
    expect(t.p.durum.gonderiyor).toBe(true);
    await t.p.eylem({ eylem: "kademe", kademe: 3 });
    expect(t.komutlar).toHaveLength(1);
    t.birak();
    await ilk;
    expect(t.p.durum.gonderiyor).toBe(false);
  });
});

describe("DukkanPaneli: kaldırma, iptal, marka", () => {
  it("açık dükkân: kaldır → onay → dukkan_yik; başarıda seçim sıfırlanır ve bilgi bildirimi", async () => {
    const t = kur(gorunum([dukkan()]));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "menu" });
    expect(t.p.html()).toContain('data-eylem="dukkan-kaldir"');
    await t.p.eylem({ eylem: "dukkan-kaldir" });
    expect(t.p.html()).toContain('data-eylem="dukkan-kaldir-onayla"');
    expect(t.komutlar).toHaveLength(0);
    await t.p.eylem({ eylem: "dukkan-kaldir-onayla" });
    expect(t.komutlar).toEqual([{ tur: "dukkan_yik", dukkan: 7 }]);
    expect(t.p.html()).toBe("");
    expect(t.bildirimler).toEqual(["Dükkân kaldırıldı. Arsan ve malların sende."]);
  });

  it("inşadaki dükkân: iptal onayı sonra insaat_iptal {insaat: -id}; ham raf ve marka yok", async () => {
    const insaat = dukkan({ id: -12, durum: "insaat", tur: null, yuvalar: [], bitis: 20 * 3_600_000 });
    const t = kur(gorunum([insaat]));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: -12 });
    expect(t.p.html()).not.toContain("dk-yuva");
    expect(t.p.html()).not.toContain("marka-ac");
    await t.p.eylem({ eylem: "menu" });
    await t.p.eylem({ eylem: "insaat-iptal" });
    await t.p.eylem({ eylem: "insaat-iptal-onayla" });
    expect(t.komutlar).toEqual([{ tur: "insaat_iptal", insaat: 12 }]);
    expect(t.p.durum.secili).toBeNull();
  });

  it("kaldırma ret: onay kapanır, ret metni görünür, dükkân seçili kalır", async () => {
    const t = kur(gorunum([dukkan()]), () => ({ tamam: false, mesaj: "Bu dükkân yok." }));
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "dukkan-kaldir" });
    await t.p.eylem({ eylem: "dukkan-kaldir-onayla" });
    expect(t.p.durum.onay).toBeNull();
    expect(t.p.durum.secili).toBe(7);
    expect(t.p.html()).toContain("Bu dükkân yok.");
  });

  async function markaFormu(sonuc?: (k: Komut) => DukkanKomutSonucu, markalar: DukkanGorunumu["markalar"] = [["a", 0, 0]]) {
    const t = kur(gorunum([dukkan()], markalar), sonuc);
    await t.p.eylem({ eylem: "dukkan-sec", dukkan: 7 });
    await t.p.eylem({ eylem: "marka-ac" });
    return t;
  }

  it("geçersiz ad: komut gitmez, yerel hata gösterilir (gonder)", async () => {
    const t = await markaFormu();
    t.p.girdi("x");
    await t.p.eylem({ eylem: "marka-kaydet" });
    expect(t.komutlar).toHaveLength(0);
    expect(t.p.durum.marka?.gonder).toBe(true);
    expect(t.p.html()).toContain("Marka adı 2 ile 24 karakter arasında olmalı.");
  });

  it("geçerli ad: önce marka_tanimla (yeni dizin = tanımlı sayısı), sonra dukkan_marka; ad olduğu gibi gider (kanonikleştirme sunucuda)", async () => {
    const t = await markaFormu();
    await t.p.eylem({ eylem: "simge", simge: 3 });
    await t.p.eylem({ eylem: "renk", renk: 5 });
    t.p.girdi("Yılmaz Bakkal");
    await t.p.eylem({ eylem: "marka-kaydet" });
    expect(t.komutlar).toEqual([
      { tur: "marka_tanimla", marka: 1, ad: "Yılmaz Bakkal", simge: 3, renk: 5 },
      { tur: "dukkan_marka", dukkan: 7, marka: 1 },
    ]);
    expect(t.p.durum.marka).toBeNull();
  });

  it("marka_tanimla reddi: ikinci komut gitmez, ret form içinde, form açık", async () => {
    const t = await markaFormu(() => ({ tamam: false, mesaj: "Bu ad kullanılamaz; başka bir ad dene." }));
    t.p.girdi("Yasak Ad");
    await t.p.eylem({ eylem: "marka-kaydet" });
    expect(t.komutlar).toHaveLength(1);
    expect(t.p.durum.marka?.ret).toBe("Bu ad kullanılamaz; başka bir ad dene.");
    expect(t.p.html()).toContain('role="alert">Bu ad kullanılamaz; başka bir ad dene.</p>');
    // yazmaya devam edince ret silinir
    t.p.girdi("Yasak Ad 2");
    expect(t.p.durum.marka?.ret).toBeUndefined();
  });

  it("atama reddi: marka tanımlı kalır, form kapanır, ret metni görünür; \"Şimdilik markasız\" formu kapatır", async () => {
    let n = 0;
    const t = await markaFormu(() => (++n === 1 ? { tamam: true, t: 1 } : { tamam: false, mesaj: "Dükkân zaten bu markada." }));
    t.p.girdi("Yeni Marka");
    await t.p.eylem({ eylem: "marka-kaydet" });
    expect(t.p.durum.marka).toBeNull();
    expect(t.p.html()).toContain("Dükkân zaten bu markada.");
    await t.p.eylem({ eylem: "marka-ac" });
    await t.p.eylem({ eylem: "marka-yok" });
    expect(t.p.durum.marka).toBeNull();
  });
});
