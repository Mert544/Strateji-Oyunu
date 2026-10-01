/**
 * Komut arayüzü: komut formu -> Komut dönüşümleri, kayıt kapsamı, hata çevirisi, işçi protokolü ve öneriler.
 * Gerçek harita ve içerikle (4 devlet; oyuncu o0 = Korvan, diğerleri bot) çalışır.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SAAT, Simulasyon } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { ArketipAdi } from "@bolge/botlar";
import { gercekVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { dizinKur, kareAl } from "../src/isci/kare";
import { oyuncuKomutu } from "../src/isci/oyuncu";
import type { IsciMesaji, IsciyeMesaj } from "../src/isci/protokol";
import { hataCevir } from "../src/komut/hata";
import { BOLGE_GRUPLARI, DEVLET_GRUPLARI, GIZLI_KOMUTLAR, HARITA_KOMUTLARI, KOMUT_KAYDI, eylemMetni, komutOzeti, komutTanimi } from "../src/komut/kayit";
import { oneriUret } from "../src/komut/oneri";
import { icerikTablosu } from "../src/komut/tablo";
import type { Baglam, OzetBaglami } from "../src/komut/tipler";
import { baglamKur, devletPaneli, formDegerleri, formHtml, komutBolumu, yeniOyunDurumu } from "../src/arayuz/komut-govde";
import type { GovdeDurumu } from "../src/arayuz/govde";
import { devletKartlari, secimBelirteci, secimCoz } from "../src/arayuz/devlet-sec";

const BOTLAR: ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];
const veri: VeriPaketi = gercekVeriyiYukle();
const ic = icerikTablosu(veri.icerik, veri.param);

/** Oyuncu = devlet 0 (o0, bot yok); `saat` saat ilerletilmiş dünya. */
function dunyaKur(saat: number): { sim: Simulasyon; idler: string[] } {
  const devletler = veri.harita.devletler.slice(0, 4);
  const oyuncular = devletler.map((d, i) => ({
    id: `o${i}`,
    bolgeler: veri.harita.bolgeler.filter((b) => b.devlet === d.id).map((b) => b.id),
    bot: i === 0 ? null : botOlustur(BOTLAR[i] as ArketipAdi, `o${i}`, 1),
    katilmaMs: 0,
  }));
  const sim = Simulasyon.olustur(veri, 1);
  kos({ veri, tohum: 1, oyuncular, sureMs: saat * SAAT, sim });
  return { sim, idler: oyuncular.map((o) => o.id) };
}

function baglam(sim: Simulasyon, idler: string[], bolgeId: string): Baglam {
  const dizin = dizinKur(sim, ["oyuncu", ...BOTLAR.slice(1)]);
  const kare = kareAl(sim, idler, "o0");
  return { ic, dizin, kare, ben: kare.oyuncu!, bolge: dizin.bolgeler.findIndex((b) => b.id === bolgeId), bolgeAd: (i) => dizin.bolgeler[i]?.ad ?? "?" };
}

describe("hata çevirisi", () => {
  const dizin = dizinKur(Simulasyon.olustur(veri, 1), BOTLAR);
  const o: OzetBaglami = { ic, dizin, bolgeAd: (i) => dizin.bolgeler[i]?.ad ?? "?" };
  it("çekirdeğin ASCII-Türkçe metinleri anlaşılır Türkçeye çevrilir", () => {
    expect(hataCevir("yetersiz hazine", o)).toBe("Hazinede yeterli para yok.");
    expect(hataCevir("bolge etiketi yetersiz: liman", o)).toContain("Liman");
    expect(hataCevir("yetersiz stok: budjak (mal indeksi 4)", o)).toMatch(/Bucak Bozkırı deposunda yeterli .+ yok/);
    expect(hataCevir("savunan oyuncu yeni oyuncu korumasinda", o)).toContain("koruma");
    expect(hataCevir("devam eden bir arastirma var", o)).toContain("tek araştırma");
    expect(hataCevir("ekim paylari toplami 1000000 olmali (bulunan 900000)", o)).toBe("Ekim payları toplamı %100 olmalı (şu an %90).");
    expect(hataCevir("bolgeler komsu degil", o)).toContain("komşu");
    expect(hataCevir("izleme kipi", o)).toContain("izliyorsunuz");
  });
  it("içerikten ad ve teknoloji çözülür", () => {
    const kapali = ic.turler.find((t) => t.gerekliTeknoloji !== undefined);
    expect(kapali).toBeDefined();
    const m = hataCevir(`tesis turu acik degil: ${kapali!.id}`, o);
    expect(m).toContain(kapali!.ad);
    expect(m).toContain("teknoloji");
    expect(hataCevir("deniz kenari gelistirme karari acik degil", o)).toContain("Deniz");
  });
  it("tanınmayan metin hâliyle gösterilir (sessizce yutulmaz)", () => {
    expect(hataCevir("beklenmedik bir durum", o)).toBe("Komut reddedildi (beklenmedik bir durum).");
  });
  it("çekirdekteki komut hata metinlerinin hiçbiri ham 'Komut reddedildi'ye düşmez", () => {
    const dosyalar = ["ekonomi/komut.ts", "ekonomi/maliyet.ts", "tarim/komut.ts", "sanayi/komut.ts", "lojistik/cozum.ts", "askeri/savas.ts", "askeri/uretim.ts", "politika.ts", "teknoloji.ts"];
    const eksik: string[] = [];
    let toplam = 0;
    for (const d of dosyalar) {
      const kaynak = readFileSync(new URL(`../../cekirdek/src/${d}`, import.meta.url), "utf8");
      for (const m of kaynak.matchAll(/(?:hata\(|return )`([^`]+)`/g)) {
        const metin = (m[1] as string).replace(/\$\{[^}]*\}/g, "7").trim();
        if (!/^[a-z]/.test(metin)) continue;
        toplam++;
        if (hataCevir(metin, o).includes("Komut reddedildi")) eksik.push(`${d}: ${metin}`);
      }
    }
    expect(toplam).toBeGreaterThan(40);
    expect(eksik).toEqual([]);
  });
});

describe("komut kaydı", () => {
  it("çekirdek Komut birleşimindeki her tür ya kayıtta, ya GIZLI_KOMUTLAR'da ya da HARITA_KOMUTLARI'nda", () => {
    const tipler = readFileSync(new URL("../../cekirdek/src/tipler.ts", import.meta.url), "utf8");
    const birlesim = tipler.slice(tipler.indexOf("export type Komut ="), tipler.indexOf("export type KomutTuru"));
    const turler = [...birlesim.matchAll(/tur: "([a-z_]+)"/g)].map((m) => m[1] as string);
    // Birleşime adıyla katılan alt birleşimler (ör. `| MulkKomutu`) da açılır.
    for (const m of birlesim.matchAll(/\|\s*([A-Z][A-Za-z]*Komutu)\b/g)) {
      const bas = tipler.indexOf(`export type ${m[1]} =`);
      expect(bas, `${m[1]} tanımı`).toBeGreaterThanOrEqual(0);
      const son = tipler.indexOf("\nexport ", bas + 1);
      const govde = tipler.slice(bas, son === -1 ? undefined : son);
      turler.push(...[...govde.matchAll(/tur: "([a-z_]+)"/g)].map((x) => x[1] as string));
    }
    expect(turler.length).toBeGreaterThanOrEqual(20);
    const kayitli = new Set(KOMUT_KAYDI.map((t) => t.tur as string));
    const gizli = new Set<string>([...GIZLI_KOMUTLAR, ...HARITA_KOMUTLARI]);
    const eksik = turler.filter((t) => !gizli.has(t) && !kayitli.has(t));
    // Çekirdeğe yeni bir komut eklendiyse buraya bir form (kayit.ts: tanim) ya da bilinçli olarak GIZLI_KOMUTLAR'a
    // (formsuz) veya HARITA_KOMUTLARI'na (haritadan gönderilir) kayıt gerekir.
    expect(eksik, `formu olmayan komutlar: ${eksik.join(", ")}`).toEqual([]);
    // Listeler yalnız gerçekten var olan ve formu OLMAYAN komutları içerir.
    for (const g of [...GIZLI_KOMUTLAR, ...HARITA_KOMUTLARI]) {
      expect(turler, g).toContain(g);
      expect(kayitli.has(g), `${g} hem gizli hem kayıtlı`).toBe(false);
    }
    expect([...GIZLI_KOMUTLAR].sort()).toEqual(["askeri_rezerv", "kenar_gelistir", "marka_sifirla", "oyuncu_katil", "sistem_odul"]);
    expect([...HARITA_KOMUTLARI].sort()).toEqual(["dukkan_fiyat", "dukkan_marka", "dukkan_raf", "dukkan_yik", "insaat_iptal", "marka_tanimla", "parsel_al", "parsel_birak", "tesis_insa_hucre", "yapi_yerlestir"]);
  });
  it("lojistik formları arayüzde yok (kenar_gelistir, askeri_rezerv; Darboğaz sekmesi kalktı)", () => {
    expect(komutTanimi("kenar_gelistir")).toBeUndefined();
    expect(komutTanimi("askeri_rezerv")).toBeUndefined();
    const gruplar = [...BOLGE_GRUPLARI, ...DEVLET_GRUPLARI].flatMap((g) => g.formlar);
    expect(gruplar).not.toContain("kenar_gelistir");
    expect(gruplar).not.toContain("askeri_rezerv");
    for (const id of gruplar) expect(komutTanimi(id), id).toBeDefined();
  });
  it("kimlikler benzersiz ve her kayıt tam", () => {
    expect(new Set(KOMUT_KAYDI.map((t) => t.id)).size).toBe(KOMUT_KAYDI.length);
    for (const t of KOMUT_KAYDI) {
      expect(t.ad.length).toBeGreaterThan(2);
      expect(t.aciklama.length).toBeGreaterThan(10);
      expect(komutTanimi(t.id)).toBe(t);
    }
  });
});

describe("form -> komut dönüşümleri (gerçek harita, oyuncu Korvan)", () => {
  const { sim, idler } = dunyaKur(30);
  // Korvan: tahıl/petrol zengin, limanlı bir bölge (Varna) ve ovalar.
  const varna = baglam(sim, idler, "varna");
  const siret = baglam(sim, idler, "siret");

  const form = (id: string, b: Baglam, g: Record<string, string> = {}): Komut | string => {
    const t = komutTanimi(id)!;
    return t.komut(b, { ...t.varsayilan(b), ...g });
  };

  it("tesis_insa: varsayılan form uygulanabilir bir komut üretir ve çekirdek kabul eder", () => {
    const k = form("tesis_insa", varna);
    expect(typeof k).toBe("object");
    const kopya = sim.klonla();
    const r = oyuncuKomutu(kopya, "o0", k as Komut);
    expect(r, JSON.stringify(k)).toEqual({ tamam: true });
    expect(kopya.dunya.insaatlar.some((i) => i.sahip === "o0")).toBe(true);
  });
  it("tesis_insa: seçenekler içerikten gelir; etiket/rezerv/teknoloji uygunsuzluğu seçenekte açıklanır", () => {
    const t = komutTanimi("tesis_insa")!;
    const alan = t.alanlar(siret, t.varsayilan(siret))[0]!;
    expect(alan.tip).toBe("secim");
    if (alan.tip !== "secim") return;
    expect(alan.secenekler.length).toBe(ic.turler.length);
    const liman = alan.secenekler.find((s) => s.deger === "petrol_kuyusu");
    expect(liman).toBeDefined();
    expect(alan.secenekler.some((s) => s.devre !== undefined)).toBe(true);
    const onizleme = t.onizleme!(varna, { tesisTuru: "ciftlik" }).map((s) => s.metin).join("|");
    expect(onizleme).toContain("Para:");
    expect(onizleme).toContain("Süre:");
  });
  it("ticaret_emri: birim/sa -> mili dönüşümü; limanda uygun, limansız bölgede kapalı", () => {
    const tahil = ic.mallar.find((m) => m.id === "tahil")!;
    const k = form("ticaret_emri", varna, { mal: tahil.id, yon: "ihracat", oran: "12,5" }) as Komut;
    expect(k).toEqual({ tur: "ticaret_emri", bolge: "varna", mal: "tahil", yon: "ihracat", oranSaat: 12500 });
    expect(komutTanimi("ticaret_emri")!.uygun(siret)).toContain("liman");
    expect(typeof form("ticaret_emri", varna, { oran: "-3" })).toBe("string");
    expect(typeof form("ticaret_emri", varna, { oran: "abc" })).toBe("string");
    const kopya = sim.klonla();
    expect(oyuncuKomutu(kopya, "o0", k)).toEqual({ tamam: true });
  });
  it("ekim_plani / gubre_dozu: paylar yüzdeden ppm'e; toplam %100 değilse hata", () => {
    const ek = komutTanimi("ekim_plani")!;
    if (ek.uygun(siret) !== null) return; // tarım dışı bölge: form kapalı
    const n = ic.urunler.length;
    const g: Record<string, string> = {};
    for (let i = 0; i < n; i++) g[`ekim.${i}`] = i === 0 ? "50" : String(Math.floor(50 / (n - 1)));
    g["ekim.0"] = String(100 - Object.entries(g).filter(([k]) => k !== "ekim.0").reduce((a, [, v]) => a + Number(v), 0));
    const k = ek.komut(siret, g) as Extract<Komut, { tur: "ekim_plani" }>;
    expect(k.ekimPpm.reduce((a, b) => a + b, 0)).toBe(1_000_000);
    expect(typeof ek.komut(siret, { ...g, "ekim.0": "99" })).toBe("string");
    expect(form("gubre_dozu", siret, { doz: "2" })).toEqual({ tur: "gubre_dozu", bolge: "siret", doz: 2 });
    expect(typeof form("gubre_dozu", siret, { doz: "99" })).toBe("string");
  });
  it("vergi, bakım düzeyi, birlik, savunma, araştırma dönüşümleri", () => {
    expect(form("vergi_ayarla", varna, { oran: "25" })).toEqual({ tur: "vergi_ayarla", oranPpm: 250000 });
    expect(typeof form("vergi_ayarla", varna, { oran: "150" })).toBe("string");
    expect(form("bakim_duzeyi", varna, { duzey: "2" })).toEqual({ tur: "bakim_duzeyi", duzey: 2 });
    const bir = ic.birlikler.find((b) => b.gerekliTeknoloji === undefined)!;
    expect(form("birlik_uret", varna, { birlik: bir.id, adet: "3" })).toEqual({ tur: "birlik_uret", bolge: "varna", birlik: bir.id, adet: 3 });
    expect(typeof form("birlik_uret", varna, { birlik: bir.id, adet: "500" })).toBe("string");
    expect(form("savunma_emri", varna, { durus: "savunma" })).toEqual({ tur: "savunma_emri", bolge: "varna", durus: "savunma" });
    const aranan = ic.teknolojiler.find((t) => t.onKosullar.length === 0)!;
    expect(form("arastir", varna, { teknoloji: aranan.id })).toEqual({ tur: "arastir", teknoloji: aranan.id });
  });
  it("diplomasi: anlaşma teklifi, fesih ve yaptırım komutları oyuncu kimliğiyle kurulur", () => {
    expect(form("anlasma_teklif", varna, { karsi: "o1", anlasma: "ticaret" })).toEqual({ tur: "anlasma_teklif", karsi: "o1", anlasma: "ticaret" });
    expect(form("yaptirim", varna, { hedef: "o2", aktif: "0" })).toEqual({ tur: "yaptirim", hedef: "o2", aktif: false });
    expect(komutTanimi("anlasma_feshet")!.uygun(varna)).not.toBeNull(); // henüz anlaşma yok
    const kopya = sim.klonla();
    expect(oyuncuKomutu(kopya, "o0", form("anlasma_teklif", varna, { karsi: "o1", anlasma: "ticaret" }) as Komut)).toEqual({ tamam: true });
  });
  it("savas_ilan: komşu düşman bölge seçenek olur; korumadaki hedef devre dışı ve nedeni yazılı", () => {
    const t = komutTanimi("savas_ilan")!;
    const sinir = baglam(sim, idler, "sipka"); // Korvan'ın Trakya/İsvend sınırındaki dar geçidi
    const neden = t.uygun(sinir);
    // birlik yoksa ya da komşu yoksa form kapalı açıklama ile gelir; aksi hâlde seçenek listesi dolu
    if (neden === null) {
      const a = t.alanlar(sinir, {})[0]!;
      expect(a.tip === "secim" && a.secenekler.length > 0).toBe(true);
    } else expect(neden.length).toBeGreaterThan(5);
  });
  it("özetler: komut Türkçe tek cümleye dökülür (bildirim metni)", () => {
    const o: OzetBaglami = { ic, dizin: varna.dizin, bolgeAd: varna.bolgeAd };
    expect(komutOzeti({ tur: "tesis_insa", bolge: "varna", tesisTuru: "ciftlik" }, o)).toBe("Varna Körfezi: Çiftlik inşaatı başladı");
    expect(komutOzeti({ tur: "vergi_ayarla", oranPpm: 250000 }, o)).toBe("Vergi oranı %25 yapıldı");
    expect(komutOzeti({ tur: "ticaret_emri", bolge: "varna", mal: "tahil", yon: "ithalat", oranSaat: 0 }, o)).toContain("kaldırıldı");
  });
});

describe("tüm formlar (varsayılan değerlerle) çekirdekte denenir", () => {
  const { sim, idler } = dunyaKur(40);
  const oyun = yeniOyunDurumu(ic);
  for (const bolge of ["varna", "siret", "guney_karpatlar", "eflak"]) {
    it(`${bolge}: açık her form ya geçerli komut üretir ya da nedenini söyler; çekirdek reddi Türkçeye çevrilir`, () => {
      const b = baglam(sim, idler, bolge);
      const dizin = b.dizin;
      let tamamSayisi = 0;
      for (const t of KOMUT_KAYDI) {
        if (t.uygun(b) !== null) continue;
        const { g } = formDegerleri(t, b, oyun, "x");
        const k = t.komut(b, g);
        if (typeof k === "string") {
          expect(k.length, `${t.id}: boş hata`).toBeGreaterThan(5);
          continue;
        }
        expect(typeof komutOzeti(k, b)).toBe("string");
        expect(eylemMetni(k, b).length).toBeGreaterThan(5);
        const r = oyuncuKomutu(sim.klonla(), "o0", k);
        if (r.tamam) tamamSayisi++;
        else expect(hataCevir(r.hata, b), `${t.id}: ${r.hata}`).not.toContain("Komut reddedildi");
      }
      expect(tamamSayisi, `${bolge}: hiç form başarılı olmadı`).toBeGreaterThan(2);
      void dizin;
    });
  }
  it("savaş ilanı: koruma bitince komşu düşman bölge seçilir ve çekirdek kabul eder; korumada devre dışı", () => {
    const d = dunyaKur(24);
    const korumada = baglam(d.sim, d.idler, "sipka");
    // Korvan'ın komşu düşman bölgesi bulunur (kara/deniz kenarı).
    const dizin = korumada.dizin;
    const benim = (i: number): boolean => korumada.kare.bolgeler[i]?.sahip === 0;
    const kenar = dizin.kenarlar.find((e) => (benim(e.a) && !benim(e.b) && (korumada.kare.bolgeler[e.b]?.sahip ?? -1) > 0) || (benim(e.b) && !benim(e.a) && (korumada.kare.bolgeler[e.a]?.sahip ?? -1) > 0));
    expect(kenar).toBeDefined();
    const mine = benim(kenar!.a) ? kenar!.a : kenar!.b;
    const dusman = mine === kenar!.a ? kenar!.b : kenar!.a;
    const sav = komutTanimi("savas_ilan")!;
    // 24. saatte düşman 7 günlük korumada: seçenek devre dışı (ya da birlik yoksa form kapalı)
    d.sim.dunya.bolgeler[mine]!.birlikler[0] = 5;
    const b1 = baglam(d.sim, d.idler, dizin.bolgeler[mine]!.id);
    expect(sav.uygun(b1)).toBeNull();
    const a1 = sav.alanlar(b1, {})[0]!;
    expect(a1.tip === "secim" && a1.secenekler.find((x) => x.deger === dizin.bolgeler[dusman]!.id)?.devre).toMatch(/koruma/);
    expect(hataCevir("savunan oyuncu yeni oyuncu korumasinda", b1)).toContain("koruma");
    // koruma bitince
    const g = dunyaKur(8 * 24);
    g.sim.dunya.bolgeler[mine]!.birlikler[0] = 5;
    const b2 = baglam(g.sim, g.idler, dizin.bolgeler[mine]!.id);
    const a2 = sav.alanlar(b2, {})[0]!;
    const secenek = a2.tip === "secim" ? a2.secenekler.find((x) => x.deger === dizin.bolgeler[dusman]!.id) : undefined;
    expect(secenek).toBeDefined();
    expect(secenek!.devre).toBeUndefined();
    const k = sav.komut(b2, { hedef: secenek!.deger });
    expect(k).toEqual({ tur: "savas_ilan", saldiranBolge: dizin.bolgeler[mine]!.id, hedefBolge: secenek!.deger });
    expect(oyuncuKomutu(g.sim, "o0", k as Komut)).toEqual({ tamam: true });
  });
  it("gizli lojistik komutu çekirdekte durur (formu yok): kendi iki uçlu yol hâlâ geliştirilebilir", () => {
    const b = baglam(sim, idler, "varna");
    const benim = (i: number): boolean => b.kare.bolgeler[i]?.sahip === 0;
    const iyi = b.dizin.kenarlar.findIndex((e) => benim(e.a) && benim(e.b) && e.tur !== "deniz");
    expect(iyi).toBeGreaterThanOrEqual(0);
    expect(oyuncuKomutu(sim.klonla(), "o0", { tur: "kenar_gelistir", kenar: iyi })).toEqual({ tamam: true });
  });
});

describe("işçi protokolü ve kare", () => {
  const { sim, idler } = dunyaKur(12);
  it("komut o anki sim zamanında uygulanır; sonuç tamam/hata; kare komutun etkisini taşır", () => {
    const t = sim.dunya.zaman;
    const b = baglam(sim, idler, "varna");
    const k = komutTanimi("tesis_insa")!.komut(b, komutTanimi("tesis_insa")!.varsayilan(b)) as Komut;
    const once = kareAl(sim, idler, "o0").oyuncu!.insaatlar.length;
    const r = oyuncuKomutu(sim, "o0", k);
    expect(r).toEqual({ tamam: true });
    expect(sim.dunya.zaman).toBe(t); // zaman ilerlemez
    const sonra = kareAl(sim, idler, "o0");
    expect(sonra.oyuncu!.insaatlar.length).toBe(once + 1);
    expect(sonra.saat).toBe(Math.round(t / SAAT));
    expect(JSON.parse(JSON.stringify(sonra))).toEqual(sonra);
  });
  it("hata sonucu ham metinle döner ve dünyayı değiştirmez; izleme kipinde komut reddedilir", () => {
    const ozet = sim.durumOzeti();
    const r = oyuncuKomutu(sim, "o0", { tur: "tesis_insa", bolge: "isvend_olmayan", tesisTuru: "ciftlik" });
    expect(r.tamam).toBe(false);
    expect(sim.durumOzeti()).toBe(ozet);
    expect(oyuncuKomutu(sim, null, { tur: "vergi_ayarla", oranPpm: 100000 })).toEqual({ tamam: false, hata: "izleme kipi" });
    // başka devletin bölgesi
    const baska = oyuncuKomutu(sim, "o0", { tur: "tesis_insa", bolge: "istanbul", tesisTuru: "ciftlik" });
    expect(baska.tamam).toBe(false);
    if (!baska.tamam) expect(hataCevir(baska.hata, { ic, dizin: dizinKur(sim, BOTLAR), bolgeAd: () => "x" })).toContain("sizin bölgeniz değil");
  });
  it("mesaj tipleri: komut, komutSonuc, oneriIste, oneriler derlenir ve JSON'a serileştirilir", () => {
    const g: IsciyeMesaj = { tur: "komut", id: 7, komut: { tur: "vergi_ayarla", oranPpm: 200000 } };
    const y: IsciMesaji = { tur: "komutSonuc", id: 7, komut: { tur: "vergi_ayarla", oranPpm: 200000 }, sonuc: { tamam: true }, saat: 12 };
    const o: IsciyeMesaj = { tur: "oneriIste" };
    expect(JSON.parse(JSON.stringify([g, y, o]))).toEqual([g, y, o]);
  });
  it("oyuncu kare alanı yalnız oyuncu kipinde var; izleme karesi değişmez", () => {
    expect(kareAl(sim, idler).oyuncu).toBeUndefined();
    const k = kareAl(sim, idler, "o0");
    expect(k.oyuncu!.idx).toBe(0);
    expect(Object.keys(k.oyuncu!.bolgeler).length).toBe(veri.harita.bolgeler.filter((b) => b.devlet === veri.harita.devletler[0]!.id).length);
    expect(k.oyuncu!.koruma[0]).toBeGreaterThan(k.saat); // yeni oyuncu koruması
  });
});

describe("önerilen eylemler", () => {
  const { sim, idler } = dunyaKur(30);
  it("planlayıcı oyuncu için en çok 5 aday verir; her biri çekirdekte uygulanabilir", () => {
    const liste = oneriUret(sim, "o0");
    expect(liste.length).toBeGreaterThan(0);
    expect(liste.length).toBeLessThanOrEqual(5);
    for (const o of liste) {
      const kopya = sim.klonla();
      expect(oyuncuKomutu(kopya, "o0", o.komut), JSON.stringify(o.komut)).toEqual({ tamam: true });
    }
    expect(JSON.parse(JSON.stringify(liste))).toEqual(liste);
    // Formu olmayan (gizli lojistik) komutlar önerilmez; her önerinin formu vardır.
    for (const o of liste) {
      expect(GIZLI_KOMUTLAR as readonly string[]).not.toContain(o.komut.tur);
      expect(KOMUT_KAYDI.some((t) => t.tur === o.komut.tur), o.komut.tur).toBe(true);
    }
    void idler;
  });
  it("oneriler dünyayı değiştirmez (yalnız okur)", () => {
    const ozet = sim.durumOzeti();
    oneriUret(sim, "o0");
    expect(sim.durumOzeti()).toBe(ozet);
  });
});

describe("komut arayüzü HTML'i", () => {
  const { sim, idler } = dunyaKur(30);
  const dizin = dizinKur(sim, ["oyuncu", ...BOTLAR.slice(1)]);
  const kare = kareAl(sim, idler, "o0");
  const oyun = yeniOyunDurumu(ic);
  const varnaIdx = dizin.bolgeler.findIndex((b) => b.id === "varna");
  const g = (bolge: number): GovdeDurumu => ({ kare, dizin, mal: -1, bolge, bolgeAd: (i) => dizin.bolgeler[i]?.ad ?? "?", hazineGecmisi: [], oyun });

  it("kendi bölgemde tüm bölge formları (içerikten) çizilir; gönder düğmesi vardır", () => {
    const h = komutBolumu(g(varnaIdx), varnaIdx);
    for (const ad of ["Tesis kur", "Yöntem değiştir", "Ticaret emri", "Birlik üret", "Savunma duruşu"]) expect(h, ad).toContain(ad);
    expect(h).not.toContain("Yolu geliştir");
    expect(h).toContain('name="tesisTuru"');
    expect(h).toContain("Çiftlik");
    expect(h).not.toContain("yakında");
  });
  it("devlet sekmesi: vergi, araştırma, diplomasi, koruma ve öneri kutusu", () => {
    const h = devletPaneli({ ...g(-1), oyun: { ...oyun, oneriler: oneriUret(sim, "o0") } });
    for (const s of ["Vergi oranı", "Araştır", "Anlaşma teklif et", "Yaptırım", "Yeni oyuncu koruması", "Önerilen eylemler", "Tek tıkla uygula", "Diplomasi durumu"]) expect(h, s).toContain(s);
  });
  it("başkasının bölgesinde komut yok (açıklama); izleme kipinde devlet seçme çağrısı", () => {
    const istanbul = dizin.bolgeler.findIndex((b) => b.id === "istanbul");
    expect(komutBolumu(g(istanbul), istanbul)).toContain("komut veremezsiniz");
    expect(komutBolumu({ ...g(varnaIdx), oyun: undefined }, varnaIdx)).toContain("data-devlet-sec");
    expect(baglamKur({ ...g(varnaIdx), oyun: undefined })).toBeNull();
  });
  it("form çizimi alan değerlerini ve kullanıcının seçimini korur", () => {
    const b = baglamKur(g(varnaIdx))!;
    const t = komutTanimi("vergi_ayarla")!;
    const o2 = yeniOyunDurumu(ic);
    o2.formlar.set("d:vergi_ayarla:oran", "42");
    expect(formHtml(t, b, o2, "d")).toContain('value="42"');
  });
});

describe("devlet seçimi", () => {
  const kartlar = devletKartlari(veri.harita, veri.icerik);
  it("dört devlet kartı: bölge sayısı, nüfus ve kaynak profili", () => {
    expect(kartlar.length).toBe(4);
    expect(kartlar.reduce((t, k) => t + k.bolgeSayisi, 0)).toBe(veri.harita.bolgeler.length);
    for (const k of kartlar) {
      expect(k.nufus).toBeGreaterThan(0);
      expect(k.kaynaklar.length).toBeGreaterThan(0);
    }
  });
  it("URL belirteci: #korvan / #izle / ?devlet= ve bilinmeyen", () => {
    const idler = veri.harita.devletler.map((d) => d.id);
    expect(secimCoz("#korvan", "", idler)).toBe(0);
    expect(secimCoz("#zephra", "", idler)).toBe(3);
    expect(secimCoz("#izle", "", idler)).toBe(-1);
    expect(secimCoz("", "?devlet=talmera", idler)).toBe(2);
    expect(secimCoz("#baska", "", idler)).toBeNull();
    expect(secimCoz("", "", idler)).toBeNull();
    expect(secimBelirteci(1, idler)).toBe("isvend");
    expect(secimBelirteci(-1, idler)).toBe("izle");
  });
});
