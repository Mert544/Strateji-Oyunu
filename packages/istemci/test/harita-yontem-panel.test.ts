/**
 * "Yöntemi değiştir" (mülk paneli) mantığı: tesis satırında düğme yalnız çok yöntemli türdeki BİTEN tesiste; inşadaki yapıda soluk satır; seçici satırın altında; seçim mevcuttan
 * farklıysa onay ("{eski} → {yeni}", "Vazgeç" varsayılan odak); komut yalnız onaydan sonra `yontem_degistir {bolge, tesis, yontem}`; başarı bildirir ve kapanır; ret `p.dk-hata[role=alert]`
 * Türkçe; gönderim sürerken kilit. DOM yok: `yontemEylemiOku` sahte öğeyle, panel HTML dizgesiyle sınanır.
 */
import { describe, expect, it } from "vitest";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import type { IsletmeDurumu, IsletmeYapisi, TesisSonucu, YontemDegistirIstegi } from "../src/harita/baglanti";
import { isletmePaneli, mulkHazinePaneli } from "../src/harita/mulk-panel";
import type { MulkAdlari } from "../src/harita/mulk-panel";
import { YontemPaneli, yontemEylemiOku } from "../src/harita/yontem-panel";
import { sebekeBolumuHtml, sebekeFiyatlari, sebekeSatirlari } from "../src/harita/sebeke-gider";
import { UretimAgiPaneli } from "../src/harita/uretim-agi-panel";
import { TedarikPaneli, type TedarikDurumu } from "../src/harita/tedarik-panel";
import { OrduPaneli, type OrduDurumu } from "../src/harita/ordu-panel";
import { kamuTedarikHedefi, kamuTedarikRotasi, type KamuSiparisParam } from "../src/harita/kamu-siparis";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);

const fabrika = (ek: Partial<IsletmeYapisi> = {}): IsletmeYapisi => ({ anahtar: "t12", durum: "tesis", tur: "gida_fabrikasi", il: "sn_m_ova", ilce: "sn_m_ova_merkez", aktif: true, verimPpm: 1_000_000, yontem: "degirmen", bolge: "sn_m_ova#ali", ...ek });
const tek = (): IsletmeYapisi => ({ anahtar: "t13", durum: "tesis", tur: "elektronik_fabrikasi", il: "sn_m_ova", aktif: true, verimPpm: 1_000_000, yontem: "elektronik", bolge: "sn_m_ova#ali" });

function durum(yapilar: IsletmeYapisi[]): IsletmeDurumu {
  return { simZamani: 0, hazineMili: 0, hazineOraniMili: 0, araziDegeriMili: 0, araziVergisiMili: 0, ilceHucre: [], korumaBitis: null, ayrilmisBitis: null, indirimliYapiKalan: null, yapilar, mallar: [] };
}

function kur(yapilar: IsletmeYapisi[], ek: { acik?: ReadonlySet<string> | null; sonuc?: TesisSonucu | Error } = {}) {
  const komutlar: YontemDegistirIstegi[] = [];
  const bildirimler: Array<[string, string]> = [];
  let ciz = 0;
  const p = new YontemPaneli({
    ic,
    yapiAdi: (t) => ic.turler[ic.turIdx[t] ?? -1]?.ad ?? t,
    isletme: () => durum(yapilar),
    acikTeknolojiler: () => (ek.acik === undefined ? null : ek.acik),
    komut: async (i) => {
      komutlar.push(i);
      if (ek.sonuc instanceof Error) throw ek.sonuc;
      return ek.sonuc ?? { tamam: true, t: 1 };
    },
    degisti: () => void ciz++,
    bildir: (m, t) => void bildirimler.push([m, t]),
  });
  return { p, komutlar, bildirimler, cizim: () => ciz };
}

describe("N1 kaynaklı gezinme", () => {
  it("N1 üretim: hedef yöntemin girdisi gerçek kendi depoyu açar; tek yöntem desteklenir, stale/uygunsuz kaynak ve elektrik başka depoya düşmez, komut gönderilmez", () => {
    let isletme = durum([fabrika(), { ...tek(), yontem: "standart_elektronik" }]);
    const bolge = "sn_m_ova#ali";
    const kaynak = (id: string) => ({ id, il: id.split("#")[0]!, ad: id, stoklar: new Map<string, number>(), emirler: [], uygun: true });
    let tedarik: TedarikDurumu = { simZamani: 0, bolgeler: [kaynak("sn_m_liman#ali"), kaynak(bolge)] };
    const u = new UretimAgiPaneli({ ic, isletme: () => isletme, acikTeknolojiler: () => new Set(), tedarikDurumu: () => tedarik, degisti: () => {} });
    const e = { eylem: "tesis-tedarik" as const, tesis: "t12", yontem: "ekmek_firini", mal: "un", bolge };
    expect(u.tesisTedarikiUygunMu(e)).toBe(true); // Mevcut değirmen yerine incelenen fırının unu.
    const tekYontem = ic.yontemler.find((y) => y.id === "standart_elektronik")!;
    const tekGirdi = tekYontem.girdi.find(([mi, q]) => q > 0 && ic.mallar[mi]!.depolanabilir && !ic.param.mulk?.sebeke?.mallar.some((m) => m.mal === ic.mallar[mi]!.id))!;
    expect(u.tesisTedarikiUygunMu({ ...e, tesis: "t13", yontem: tekYontem.id, mal: ic.mallar[tekGirdi[0]]!.id })).toBe(true);
    for (const kotu of [{ ...e, mal: "elektrik" }, { ...e, mal: "gida" }, { ...e, bolge: "sn_m_liman#ali" }, { ...e, tesis: "t999" }]) expect(u.tesisTedarikiUygunMu(kotu)).toBe(false);
    expect(u.tesisTedarikiUygunMu({ ...e, mal: "yakit" })).toBe(false); // Şebeke snapshot'ı bilinmiyor.
    tedarik.bolgeler[1]!.yakitTedariki = { mal: "yakit", tuketimMiliSaat: 0, stokMiliSaat: 0, sebekeMiliSaat: 0 };
    expect(u.tesisTedarikiUygunMu({ ...e, mal: "yakit" })).toBe(true); // Bilinen gerçek sıfır desteklidir.
    const komutlar: unknown[] = [];
    const p = new TedarikPaneli({ ic, durum: () => tedarik, referans: () => undefined, komut: async (k) => { komutlar.push(k); return { tamam: true }; }, degisti: () => {} });
    expect(p.ac({ bolge, mal: e.mal })).toBe(true);
    expect(p.html()).toContain(`value="${bolge}" selected`);
    expect(p.html()).toContain('value="un" selected');
    for (const kotu of [{ bolge: "yok#ali", mal: "un" }, { bolge, mal: "elektrik" }]) expect(p.ac(kotu)).toBe(false);
    expect(p.html()).toContain(`value="${bolge}" selected`);
    expect(p.html()).toContain('value="un" selected');
    tedarik.bolgeler[1]!.uygun = false;
    expect(u.tesisTedarikiUygunMu(e)).toBe(false);
    tedarik = { ...tedarik, bolgeler: [tedarik.bolgeler[0]!] };
    expect(u.tesisTedarikiUygunMu(e)).toBe(false);
    expect(p.ac({ bolge, mal: e.mal })).toBe(false);
    expect(p.html()).toContain("Seçilen işletmenin bilgisi artık bulunamadı");
    isletme = durum([]);
    expect(u.tesisTedarikiUygunMu(e)).toBe(false);
    expect(komutlar).toEqual([]);
  });

  it("N1 Ordu/Kamu: yalnız güncel bilinen eksik mal ve kapalı teknolojiye gider, adet/stok/ilan/depo değişince salt okuma hedefi kapanır", () => {
    const bolge = "sn_m_ova#ali", komutlar: unknown[] = [];
    const birlik = ic.birlikler.find((b) => b.maliyet.some(([mi, q]) => q > 0 && ic.mallar[mi]!.depolanabilir))!;
    const [mi, gereken] = birlik.maliyet.find(([m, q]) => q > 0 && ic.mallar[m]!.depolanabilir)!;
    const mal = ic.mallar[mi]!.id;
    let d: OrduDurumu = { simZamani: 0, erkenOyunPpm: 1_000_000, teknolojiler: new Set(), bolgeler: [{ id: bolge, ad: "Ova", birlikler: new Map(), stoklar: new Map([[mal, 0]]), kapasite: 12, ordugahSayisi: 1, ikmalPpm: 1_000_000, durus: "normal", partiler: [] }] };
    const p = new OrduPaneli({ ic, durum: () => d, komut: async (k) => { komutlar.push(k); return { tamam: true }; }, degisti: () => {} });
    const e = { eylem: "tedarik" as const, bolge, birlik: birlik.id, mal, adet: 1 };
    expect(p.yonlendirme(e)).toEqual({ eylem: "tedarik", bolge, mal });
    for (const kotu of [{ ...e, bolge: "yok#ali" }, { ...e, mal: "elektrik" }, { ...e, adet: 0 }, { ...e, adet: 101 }, { ...e, adet: 2 }]) expect(p.yonlendirme(kotu)).toBeNull();
    for (const stok of [undefined, gereken, Number.NaN, -1]) {
      d.bolgeler[0]!.stoklar = stok === undefined ? new Map() : new Map([[mal, stok]]);
      expect(p.yonlendirme(e)).toBeNull();
    }
    const tekBirlik = ic.birlikler.find((b) => b.gerekliTeknoloji)!;
    const tech = { eylem: "teknoloji" as const, bolge, birlik: tekBirlik.id, teknoloji: tekBirlik.gerekliTeknoloji! };
    expect(p.yonlendirme(tech)).toEqual({ eylem: "teknoloji", teknoloji: tech.teknoloji });
    d = { ...d, teknolojiler: new Set([tech.teknoloji]) };
    expect(p.yonlendirme(tech)).toBeNull();
    d = { ...d, bolgeler: [] };
    expect(p.yonlendirme(e)).toBeNull();

    const kamu: KamuSiparisParam = { ilce: "sn_m_ova_merkez", bekliyor: false, tedarikDestegi: true, malAdi: (m) => m, ilan: { etkin: true, toplamTeslimMili: 0, toplamOdemeMili: 0, siparis: { id: "kamu:1", ilce: "sn_m_ova_merkez", mal: "gida", paketMili: 1000, hedefPaket: 3, kalanPaket: 3, teslimSirasi: 0, ilanBirimFiyatMili: 90_000, ilanPaketBedeliMili: 90_000, guncelPaketBedeliMili: 80_000, acilisZamani: 0, bitis: 86_400_000, durum: "acik", rezervMili: 270_000, odenenMili: 0, serbestMili: 0 } }, kaynaklar: [{ siparis: "kamu:1", bolge, stokMili: 0, paketMili: 1000, bedelMili: 80_000, teslimSirasi: 0, uygun: false }] };
    const kopya = (): KamuSiparisParam => ({ ...kamu, ilan: structuredClone(kamu.ilan), kaynaklar: structuredClone(kamu.kaynaklar) });
    const once = kopya();
    const gorulen = kamuTedarikHedefi(kamu, bolge)!;
    expect(gorulen).toEqual({ ilce: kamu.ilce, siparis: "kamu:1", bolge, mal: "gida", paketMili: 1000 });
    expect(kamuTedarikRotasi(kamu, gorulen)).toEqual({ bolge, mal: "gida" });
    expect(kamu).toEqual(once);
    const kapali = kopya(); kapali.ilan!.siparis!.durum = "suresi_doldu";
    const eskiIlan = kopya(); eskiIlan.kaynaklar![0]!.siparis = "kamu:eski";
    const stokTam = kopya(); stokTam.kaynaklar![0]!.stokMili = 1000;
    const yanlisPaket = kopya(); yanlisPaket.kaynaklar![0]!.paketMili = 2000;
    for (const kotu of [kapali, eskiIlan, stokTam, yanlisPaket, { ...kamu, bekliyor: true }, { ...kamu, kaynaklar: [] }]) {
      expect(kamuTedarikHedefi(kotu, bolge)).toBeNull();
      expect(kamuTedarikRotasi(kotu, gorulen)).toBeNull();
    }
    const baskaMal = kopya(); baskaMal.ilan!.siparis!.mal = "tahil";
    expect(kamuTedarikRotasi(baskaMal, gorulen)).toBeNull();
    expect(kamuTedarikRotasi(kamu, { ...gorulen, ilce: "baska_ilce" })).toBeNull();
    expect(kamuTedarikHedefi(kamu, "yok#ali")).toBeNull();
    expect(komutlar).toEqual([]);
  });
});

describe("tesis satırı", () => {
  it("çok yöntemli türde biten tesiste 'Yöntemi değiştir' düğmesi (aria-expanded, etiket yapı adıyla); tek yöntemli türde ve yöntemi bilinmeyen tesiste HİÇBİR ŞEY", () => {
    const { p } = kur([]);
    const { dugme, alt } = p.satirParcalari(fabrika());
    expect(dugme).toContain('class="eylem mini-dugme"');
    expect(dugme).toContain('data-eylem="yontem-degistir" data-tesis="t12" aria-expanded="false"');
    expect(dugme).toContain('aria-label="Gıda fabrikası yöntemini değiştir"');
    expect(dugme).toContain(">Yöntemi değiştir<");
    expect(alt).toBe("");
    expect(p.satirParcalari(tek())).toEqual({ dugme: "", alt: "" });
    expect(p.satirParcalari(fabrika({ yontem: undefined }))).toEqual({ dugme: "", alt: "" });
    expect(p.satirParcalari(fabrika({ bolge: undefined }))).toEqual({ dugme: "", alt: "" });
  });

  it("inşadaki yapıda düğme yok, soluk 'İnşa bitince yöntemi değiştirebilirsin.'; ölçek büyütme inşaatında ve tek yöntemli türde hiçbir şey", () => {
    const { p } = kur([]);
    const ins = p.satirParcalari({ anahtar: "i4", durum: "insaat", tur: "gida_fabrikasi", il: "x" });
    expect(ins.dugme).toBe("");
    expect(ins.alt).toContain("İnşa bitince yöntemi değiştirebilirsin.");
    expect(p.satirParcalari({ anahtar: "i5", durum: "insaat", tur: "gida_fabrikasi", yukseltme: { tesis: 12 } })).toEqual({ dugme: "", alt: "" });
    expect(p.satirParcalari({ anahtar: "i6", durum: "insaat", tur: "elektronik_fabrikasi" })).toEqual({ dugme: "", alt: "" });
  });

  it("işletme paneli satırında düğme ve açık seçici yerleşir (ad.yontem kancası); kanca yoksa satır eskisi gibi", () => {
    const y = fabrika();
    const { p } = kur([y]);
    const ad: MulkAdlari = { yapi: (t) => ic.turler[ic.turIdx[t] ?? -1]?.ad ?? t, mal: (m) => m, ilce: (i) => i, il: (i) => i };
    const eski = isletmePaneli(durum([y]), { ad: "ali" }, ad);
    expect(eski).not.toContain("yontem-degistir");
    ad.yontem = (x) => p.satirParcalari(x);
    expect(isletmePaneli(durum([y]), { ad: "ali" }, ad)).toContain('data-eylem="yontem-degistir" data-tesis="t12"');
  });
});

describe("açma, seçim, onay, gönderim", () => {
  it("aç: seçici satırın altında, mevcut yöntem seçili (aria-current) ve onay YOK; aynı düğme tekrar kapatır; Esc/Vazgeç kapatır", async () => {
    const y = fabrika();
    const { p } = kur([y]);
    await p.eylem({ eylem: "ac", tesis: "t12" });
    const { dugme, alt } = p.satirParcalari(y);
    expect(dugme).toContain('aria-expanded="true"');
    expect(alt).toContain('<div class="ym-degistir" data-tesis="t12">');
    expect(alt).toContain("Şimdiki yöntem: Değirmen");
    expect(alt).toContain("Gıda fabrikası: yöntemi değiştir</legend>");
    expect(alt).toMatch(/data-yontem="degirmen"[^>]*aria-checked="true"[^>]*aria-current="true"/);
    expect(alt).not.toContain("ym-onay");
    await p.eylem({ eylem: "ac", tesis: "t12" });
    expect(p.durum.acik).toBeNull();
    await p.eylem({ eylem: "ac", tesis: "t12" });
    p.kapat();
    expect(p.durum.acik).toBeNull();
  });

  it("mevcuttan farklı seçim onayı açar: özet '{eski} → {yeni}', 'Ücret yok; stoğun kalır.', Değiştir (birincil) ve Vazgeç (varsayılan odak); seçici kilitlenir; mevcudu seçmek onay açmaz; kilitli yöntem seçilemez", async () => {
    const y = fabrika();
    const { p, komutlar } = kur([y], { acik: new Set() }); // hiçbir teknoloji açık değil
    await p.eylem({ eylem: "ac", tesis: "t12" });
    await p.eylem({ eylem: "sec", yontem: "degirmen" });
    expect(p.durum.onayAcik).toBe(false);
    await p.eylem({ eylem: "sec", yontem: "ekmek_firini" });
    expect(p.durum).toMatchObject({ secili: "ekmek_firini", onayAcik: true });
    const alt = p.satirParcalari(y).alt;
    expect(alt).toContain('role="alertdialog"');
    expect(alt).toContain("Değirmen → Ekmek fırını");
    expect(alt).toContain("Yöntemi değiştirmek istiyor musun? Ücret yok; stoğun kalır.");
    expect(alt).toContain('class="birincil" data-eylem="yontem-onayla"');
    expect(alt).toContain('data-eylem="yontem-vazgec" data-varsayilan-odak="1"');
    expect(alt.match(/aria-disabled="true"/g)).toHaveLength(3); // onay açıkken üç kart kilitli
    expect(komutlar).toHaveLength(0); // komut yalnız onaydan sonra
    p.kapat(); // Vazgeç/Esc: yalnız onay kapanır, seçim mevcuda döner
    expect(p.durum).toMatchObject({ acik: "t12", secili: "degirmen", onayAcik: false });
  });

  it("teknolojisi açılmamış yöntem seçilemez (onay açılmaz); açılınca seçilir", async () => {
    const tur = "ciftlik";
    const y: IsletmeYapisi = { anahtar: "t20", durum: "tesis", tur, aktif: true, verimPpm: 1_000_000, yontem: "geleneksel_tarim", bolge: "sn_m_ova#ali" };
    const kilitli = kur([y], { acik: new Set() });
    await kilitli.p.eylem({ eylem: "ac", tesis: "t20" });
    await kilitli.p.eylem({ eylem: "sec", yontem: "mekanize_tarim" });
    expect(kilitli.p.durum.onayAcik).toBe(false);
    const acik = kur([y], { acik: new Set(["mekanize_tarim"]) });
    await acik.p.eylem({ eylem: "ac", tesis: "t20" });
    await acik.p.eylem({ eylem: "sec", yontem: "mekanize_tarim" });
    expect(acik.p.durum.onayAcik).toBe(true);
  });

  it("onay: yontem_degistir {bolge, tesis, yontem} gider; başarıda bildirim 'Yöntem değişti: …', seçici kapanır; gönderim sırasında düğmeler kilitli", async () => {
    const y = fabrika();
    const { p, komutlar, bildirimler } = kur([y]);
    await p.eylem({ eylem: "ac", tesis: "t12" });
    await p.eylem({ eylem: "sec", yontem: "ekmek_firini" });
    const bekle = p.eylem({ eylem: "onayla" });
    expect(p.durum.gonderiyor).toBe(true);
    expect(p.satirParcalari(y).alt).toContain('data-durum="gonderiliyor"');
    await bekle;
    expect(komutlar).toEqual([{ bolge: "sn_m_ova#ali", tesis: 12, yontem: "ekmek_firini" }]);
    expect(bildirimler).toEqual([["Yöntem değişti: Ekmek fırını.", "bilgi"]]);
    expect(p.durum).toMatchObject({ acik: null, onayAcik: false, gonderiyor: false });
  });

  it("ret: Türkçe nedeni p.dk-hata[role=alert] olarak seçicide kalır, onay kapanır, seçim mevcuda döner; ağ hatası da okunur", async () => {
    const y = fabrika();
    const ret = kur([y], { sonuc: { tamam: false, hata: "sunucu", mesaj: "Bu yöntem için teknolojiyi açman gerekir." } });
    await ret.p.eylem({ eylem: "ac", tesis: "t12" });
    await ret.p.eylem({ eylem: "sec", yontem: "ekmek_firini" });
    await ret.p.eylem({ eylem: "onayla" });
    expect(ret.bildirimler).toEqual([]);
    expect(ret.p.durum).toMatchObject({ acik: "t12", onayAcik: false, secili: "degirmen" });
    expect(ret.p.satirParcalari(y).alt).toContain('<p class="dk-hata" role="alert">Bu yöntem için teknolojiyi açman gerekir.</p>');
    const ag = kur([y], { sonuc: new Error("bağlantı koptu") });
    await ag.p.eylem({ eylem: "ac", tesis: "t12" });
    await ag.p.eylem({ eylem: "sec", yontem: "ekmek_firini" });
    await ag.p.eylem({ eylem: "onayla" });
    expect(ag.p.satirParcalari(y).alt).toContain("bağlantı koptu");
  });

  it("onay olmadan ya da mevcut yöntemle komut gitmez; gönderim sürerken ikinci eylem yutulur", async () => {
    const y = fabrika();
    const { p, komutlar } = kur([y]);
    await p.eylem({ eylem: "onayla" }); // seçici kapalı
    await p.eylem({ eylem: "ac", tesis: "t12" });
    await p.eylem({ eylem: "onayla" }); // seçim yok
    expect(komutlar).toHaveLength(0);
  });

  it("klavye: seçici açıkken oklar bir sonraki seçilebilir yöntemi verir; onay açıkken ve kapalıyken null", async () => {
    const y = fabrika();
    const { p } = kur([y]);
    expect(p.tus("ArrowRight", "degirmen")).toBeNull();
    await p.eylem({ eylem: "ac", tesis: "t12" });
    const sonraki = p.tus("ArrowRight", "degirmen");
    expect(sonraki).not.toBeNull();
    expect(sonraki).not.toBe("degirmen");
    await p.eylem({ eylem: "sec", yontem: sonraki! });
    expect(p.tus("ArrowRight", sonraki)).toBeNull(); // onay açık
  });
});

describe("DOM eylem okuma (sahte öğe)", () => {
  type Sahte = { closest: (s: string) => Sahte | null; dataset: Record<string, string | undefined>; getAttribute: (a: string) => string | null };
  const oge = (dataset: Record<string, string>, eslesen: string[], aria?: string): Sahte => {
    const o: Sahte = { dataset, getAttribute: (a) => (a === "aria-disabled" ? (aria ?? null) : null), closest: (s) => (eslesen.some((e) => s.includes(e)) ? o : null) };
    return o;
  };
  it("düğme, onay, vazgeç ve kart seçimi okunur; aria-disabled yutulur; ilgisiz öğe null", () => {
    const as = (o: Sahte): HTMLElement => o as unknown as HTMLElement;
    expect(yontemEylemiOku(as(oge({ eylem: "yontem-degistir", tesis: "t12" }, ["yontem-degistir"])))).toEqual({ eylem: "ac", tesis: "t12" });
    expect(yontemEylemiOku(as(oge({ eylem: "yontem-onayla" }, ["yontem-onayla"])))).toEqual({ eylem: "onayla" });
    expect(yontemEylemiOku(as(oge({ eylem: "yontem-vazgec" }, ["yontem-vazgec"])))).toEqual({ eylem: "vazgec" });
    expect(yontemEylemiOku(as(oge({ yontem: "degirmen" }, [".ym-kart"])))).toEqual({ eylem: "sec", yontem: "degirmen" });
    expect(yontemEylemiOku(as(oge({ yontem: "degirmen" }, [".ym-kart"], "true")))).toBeNull();
    expect(yontemEylemiOku(as(oge({ eylem: "yontem-degistir", tesis: "t1" }, ["yontem-degistir"], "true")))).toBeNull();
    expect(yontemEylemiOku(as(oge({}, [])))).toBeNull();
  });
});

describe("Hazine sekmesi: şebeke gideri bölümü", () => {
  it("işletme şebeke alımı varsa Hazine paneli bölümü taşır; yoksa panel eskisi gibi", () => {
    const f = sebekeFiyatlari(ic);
    const d = durum([]);
    expect(mulkHazinePaneli(d, "")).not.toContain("Şebeke gideri");
    const bolum = sebekeBolumuHtml(sebekeSatirlari(f, [["elektrik", 30_000], ["yakit", 4_000]]), (m) => m);
    const h = mulkHazinePaneli(d, bolum);
    expect(h).toContain("Şebeke gideri");
    expect(h).toContain("Toplam ≈");
    expect(h.endsWith("</p>")).toBe(true);
  });
});
