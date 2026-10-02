/**
 * Yöntem seçici (saf mantık + HTML) GERÇEK içerikle (`veri/icerik`, G8-1 sonrası): yöntem listesi içerikten (tesisTurleri[].yontemler; elle liste yok), çok yöntemli türde VARSAYILAN SEÇİM YOK,
 * tek yöntemli türde seçici hiç çıkmaz, teknoloji kilidi, girdi/çıktı listesi (miktar yönü), tahmini şebeke gideri (çekirdek derlemesiyle eşitlik), radiogroup HTML'i (T1 L. Ek) ve klavye.
 * Beklentiler içerikten türetilir: içerik değişince test kendiliğinden doğru kalır.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "@bolge/cekirdek";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { mulkVerisi } from "../../sunucu/test/yardimci";
import { icerikTablosu } from "../src/komut/tablo";
import { carpBol } from "../src/harita/olcek";
import { sebekeBedeli, sebekeFiyatlari, sebekeSatirlari, sebekeBolumuHtml, yontemSebekeGideri } from "../src/harita/sebeke-gider";
import { komutYontemi, seciciGorunur, seciciNotu, seciciTusu, tekSecilebilir, yontemSecenekleri, yontemSecimiTamam, yontemSeciciHtml } from "../src/harita/yontem-secici";
import type { SeciciBaglami } from "../src/harita/yontem-secici";
import { YONTEM_METIN, YONTEM_RET_KALIPLARI, yontemMetni } from "../src/harita/yontem-metin";
import { yontemHatasiTurkce, mulkHatasiTurkce } from "../src/harita/hata-mulk";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);
const ham = icerikHam as unknown as { yontemler: Array<{ id: string; ad: string; girdiler: Record<string, number>; ciktilar: Record<string, number> }>; tesisTurleri: Array<{ id: string; yontemler: string[] }>; mallar: Array<{ id: string; ad: string }> };
const sebeke = sebekeFiyatlari(ic);
/** Teknolojisi ARAŞTIRILMIŞ oyuncu ve araştırmamış oyuncu. */
const HEPSI_ACIK: SeciciBaglami = { acik: () => true, sebeke };
const HICBIRI_ACIK_DEGIL: SeciciBaglami = { acik: () => false, sebeke };
const malAdi = (id: string): string => (ham.mallar.find((m) => m.id === id)?.ad ?? id).toLocaleLowerCase("tr");

describe("yöntem listesi içerikten", () => {
  it("gıda fabrikasının yöntemleri içerikteki sırayla ve adlarıyla; çok yöntemli -> seçici görünür; her yöntemde girdi/çıktı listesi içerikten (girdi YUKARI, çıktı AŞAĞI)", () => {
    const tur = ham.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!;
    expect(tur.yontemler.length).toBeGreaterThanOrEqual(3);
    const sec = yontemSecenekleri(ic, "gida_fabrikasi", HEPSI_ACIK);
    expect(sec.map((s) => s.id)).toEqual(tur.yontemler);
    expect(seciciGorunur(sec)).toBe(true);
    for (const s of sec) {
      const y = ham.yontemler.find((x) => x.id === s.id)!;
      expect(s.ad).toBe(y.ad);
      const girdi = Object.entries(y.girdiler).map(([m, q]) => `${Math.ceil(q / 1000)} ${malAdi(m)}`);
      const cikti = Object.entries(y.ciktilar).map(([m, q]) => `${Math.floor(q / 1000)} ${malAdi(m)}`);
      expect(new Set(s.girdi.split(" · ").filter(Boolean))).toEqual(new Set(girdi));
      expect(new Set(s.cikti.split(" · "))).toEqual(new Set(cikti));
    }
    expect(sec.map((s) => s.id)).toEqual(expect.arrayContaining(["degirmen", "ekmek_firini"])); // ekmek zinciri oyuncuya açık
  });

  it("tek yöntemli türde seçici HİÇ görünmez ve HTML boş; komuta yöntem yazılmaz; kur her zaman açık", () => {
    const tekler = ham.tesisTurleri.filter((t) => t.yontemler.length === 1);
    expect(tekler.length).toBeGreaterThan(0);
    for (const t of tekler) {
      const sec = yontemSecenekleri(ic, t.id, HEPSI_ACIK);
      expect(sec, t.id).toHaveLength(1);
      expect(seciciGorunur(sec), t.id).toBe(false);
      expect(yontemSeciciHtml({ yapiAd: t.id, secenekler: sec, secili: null, kimlik: "x" })).toBe("");
      expect(komutYontemi(sec, null)).toBeUndefined();
      expect(yontemSecimiTamam(sec, null)).toBe(true);
    }
    expect(yontemSecenekleri(ic, "yok_boyle_tur", HEPSI_ACIK)).toEqual([]);
  });

  it("ahırın süt/kepek yöntemleri de içerikte etkin olduğu için görünür (gizleme listesi yok)", () => {
    const tur = ham.tesisTurleri.find((t) => t.id === "ahir")!;
    expect(yontemSecenekleri(ic, "ahir", HEPSI_ACIK).map((s) => s.id)).toEqual(tur.yontemler);
  });

  it("teknoloji kilidi: gereken teknolojisi açık olmayan yöntem kilitli ve nedenli; araştırılınca açık; bilinmeyen tür boş", () => {
    const kilitliTur = ham.tesisTurleri.find((t) => t.yontemler.some((y) => (icerikHam as unknown as { yontemler: Array<{ id: string; gerekliTeknoloji?: string }> }).yontemler.find((x) => x.id === y)?.gerekliTeknoloji !== undefined))!;
    const kilitsiz = yontemSecenekleri(ic, kilitliTur.id, HEPSI_ACIK);
    const kilitli = yontemSecenekleri(ic, kilitliTur.id, HICBIRI_ACIK_DEGIL);
    expect(kilitsiz.every((s) => !s.kilitli)).toBe(true);
    const k = kilitli.filter((s) => s.kilitli);
    expect(k.length).toBeGreaterThan(0);
    for (const s of k) expect(s.teknoloji?.id).toBeDefined();
  });

  it("çok yöntemli türde hiçbiri seçili gelmez (tekSecilebilir yalnız tek kilitsiz yöntemde); seçilebilir yöntem TEK ise o seçili gelir", () => {
    const gida = yontemSecenekleri(ic, "gida_fabrikasi", HEPSI_ACIK);
    expect(tekSecilebilir(gida)).toBeNull(); // 3 açık yöntem: varsayılan YOK
    const cift = yontemSecenekleri(ic, "ciftlik", HICBIRI_ACIK_DEGIL); // mekanize kilitli, geleneksel tek seçilebilir
    expect(seciciGorunur(cift)).toBe(true);
    expect(tekSecilebilir(cift)?.id).toBe(cift.find((s) => !s.kilitli)!.id);
    const ciftAcik = yontemSecenekleri(ic, "ciftlik", HEPSI_ACIK);
    expect(tekSecilebilir(ciftAcik)).toBeNull();
  });

  it("kur koşulu: seçici varken seçim yoksa kapalı; kilitli yöntem seçilemez; varsayılan (ilk) seçim komuta yazılmaz, diğerleri yazılır", () => {
    const gida = yontemSecenekleri(ic, "gida_fabrikasi", HEPSI_ACIK);
    expect(yontemSecimiTamam(gida, null)).toBe(false);
    expect(yontemSecimiTamam(gida, "yok")).toBe(false);
    for (const s of gida) expect(yontemSecimiTamam(gida, s.id)).toBe(true);
    expect(komutYontemi(gida, null)).toBeUndefined();
    expect(komutYontemi(gida, gida[0]!.id)).toBeUndefined(); // tür varsayılanı: bugünkü davranış
    expect(komutYontemi(gida, "degirmen")).toBe("degirmen");
    expect(komutYontemi(gida, "ekmek_firini")).toBe("ekmek_firini");
    const kilitli = yontemSecenekleri(ic, "ciftlik", HICBIRI_ACIK_DEGIL);
    const kilitliId = kilitli.find((s) => s.kilitli)!.id;
    expect(yontemSecimiTamam(kilitli, kilitliId)).toBe(false);
  });
});

describe("şebeke gideri: birim fiyat çekirdek derlemesiyle AYNI; yöntem gideri tahmini", () => {
  it("istemci fiyatı = çekirdeğin derlenmiş şebeke fiyatı (elektrik ve stoksuz mallar); kopya formül sürüklenirse bu test kırılır", () => {
    const s = Simulasyon.olustur(mulkVerisi(), 3);
    const dsb = s.ic.mulk!.sebeke!;
    expect(sebeke).not.toBeNull();
    const cekirdek = new Map<string, number>();
    if (dsb.elektrik) cekirdek.set(s.ic.mallar[dsb.elektrik.mal]!.id, dsb.elektrik.birimFiyatMili);
    for (const k of dsb.stoksuz) cekirdek.set(s.ic.mallar[k.mal]!.id, k.birimFiyatMili);
    expect(new Map(sebeke!.birim)).toEqual(cekirdek);
    expect(cekirdek.size).toBeGreaterThanOrEqual(2); // elektrik ve yakıt
  });

  it("yöntem gideri: şebeke malı girdileri x fiyat; şebeke malı girdisi olmayan yöntemde gider yok (kart satırı çıkmaz)", () => {
    const sec = yontemSecenekleri(ic, "gida_fabrikasi", HEPSI_ACIK);
    for (const s of sec) {
      const y = ham.yontemler.find((x) => x.id === s.id)!;
      let beklenen = 0;
      for (const [m, q] of Object.entries(y.girdiler)) beklenen += carpBol(q, sebeke!.birim.get(m) ?? 0, 1000);
      expect(yontemSebekeGideri(ic, sebeke, s.id), s.id).toBe(beklenen);
      expect(s.giderMili, s.id).toBe(beklenen > 0 ? beklenen : undefined);
      expect(s.sebekeli, s.id).toBe(Object.keys(y.girdiler).some((m) => sebeke!.birim.has(m)));
    }
    const tarim = yontemSecenekleri(ic, "ciftlik", HEPSI_ACIK).find((s) => !(ham.yontemler.find((x) => x.id === s.id)!.girdiler && Object.keys(ham.yontemler.find((x) => x.id === s.id)!.girdiler).some((m) => sebeke!.birim.has(m))));
    if (tarim) expect(tarim.giderMili).toBeUndefined();
    expect(yontemSebekeGideri(ic, null, "degirmen")).toBe(0); // şebeke yoksa gider yok
  });

  it("gerçekleşen alım bedeli: miktar x fiyat; toplam; fiyatı bilinmeyen mal ve sıfır miktar atlanır; birden çok düğüm toplanır; Hazine bölümü satırları ve toplam (yukarı yuvarlı)", () => {
    const s = sebekeSatirlari(sebeke, [["elektrik", 40_000], ["yakit", 5_000], ["elektrik", 10_000], ["bilinmez", 9_000], ["yakit", 0]]);
    expect(s.map((x) => [x.mal, x.miktarMili])).toEqual([["elektrik", 50_000], ["yakit", 5_000]]);
    expect(s[0]!.bedelMili).toBe(sebekeBedeli(sebeke!, "elektrik", 50_000));
    const h = sebekeBolumuHtml(s, malAdi);
    expect(h).toContain("Şebeke gideri");
    expect(h).toMatch(/Elektrik · 50 birim\/sa · [\d.]+ ₺\/sa/);
    expect(h).toMatch(/Yakıt · 5 birim\/sa/);
    expect(h).toContain("Toplam ≈");
    expect(sebekeBolumuHtml([], malAdi)).toBe(""); // alım yok: bölüm gizlenir
    expect(sebekeBolumuHtml(sebekeSatirlari(sebeke, [["elektrik", 1_000]]), malAdi)).toContain("Toplam ≈"); // tek satırda da toplam yazılır (Tasarım son kararı)
    expect(sebekeSatirlari(null, [["elektrik", 1_000]])).toEqual([]);
  });
});

describe("seçici HTML'i (T1 L. Ek) ve klavye", () => {
  const gida = yontemSecenekleri(ic, "gida_fabrikasi", HEPSI_ACIK);
  const html = (secili: string | null, ek: Partial<Parameters<typeof yontemSeciciHtml>[0]> = {}): string => yontemSeciciHtml({ yapiAd: "Gıda fabrikası", secenekler: gida, secili, kimlik: "yapi", ...ek });

  it("radiogroup: başlık legend'a bağlı, her yöntem bir role=radio kart; HİÇBİRİ seçili değil; roving tabindex tek durak (ilk kart); 'Bir yöntem seç.' notu (role=status)", () => {
    const h = html(null);
    expect(h).toContain('<fieldset class="ym-secici"');
    expect(h).toContain('<legend class="ym-baslik" id="ym-baslik-yapi">Gıda fabrikası ne yapsın?</legend>');
    expect(h).toContain('role="radiogroup" aria-labelledby="ym-baslik-yapi"');
    expect(h.match(/role="radio"/g)).toHaveLength(gida.length);
    expect(h.match(/aria-checked="true"/g)).toBeNull();
    expect(h.match(/aria-checked="false"/g)).toHaveLength(gida.length);
    expect(h.match(/tabindex="0"/g)).toHaveLength(1);
    expect(h).toContain(`data-yontem="${gida[0]!.id}"`);
    expect(h.indexOf('tabindex="0"')).toBeLessThan(h.indexOf('tabindex="-1"'));
    expect(h).toContain('<p class="ym-not" role="status">Bir yöntem seç.');
    expect(h).not.toContain("ym-isaret"); // seçili kart yok -> işaret yok
  });

  it("seçilince: aria-checked, data-durum=secili, renk dışı işaret (simge + 'Seçili') yalnız o kartta, tab durağı seçiliye taşınır; not seçilen yönteme göre (zincir ve şebeke notu)", () => {
    const h = html("degirmen");
    expect(h.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(h).toMatch(/data-yontem="degirmen" data-durum="secili" aria-checked="true" tabindex="0"/);
    expect(h.match(/class="ym-isaret"/g)).toHaveLength(1);
    expect(h).toContain("Seçili");
    expect(h).toContain("Ekmek için bir değirmen ve bir fırın gerekir; ikisi ayrı fabrikadır.");
    expect(h).not.toContain("Bir yöntem seç.");
    expect(h).toContain("Seçimi sonradan değiştirebilirsin; ücret yok.");
    // Şebeke malı girdisi olan yöntem: not + kart gider satırı
    expect(seciciNotu({ secenekler: gida, secili: "ekmek_firini" })).toContain("Elektrik ve yakıt şebekeden gelir; santral kurman gerekmez.");
    expect(h).toMatch(/ym-satir ym-gider">Şebeke gideri ≈ [\d.]+ ₺\/sa</);
  });

  it("kart içeriği: ad, özet 'saatte {girdi} → {çıktı}'; simge yalnız eşlemesi olan yöntemde; girdisiz yöntemde 'girdi istemez'", () => {
    const h = html(null);
    const d = gida.find((s) => s.id === "degirmen")!;
    expect(h).toContain(`<span class="ym-ad">${d.ad}</span>`);
    expect(h).toContain(`saatte ${d.girdi} → ${d.cikti}`);
    expect(h).toMatch(/data-yontem="degirmen"[^>]*><span class="ym-simge"><svg/); // degirmen simgesi (wheat)
    const standart = gida.find((s) => s.simge === null);
    if (standart) expect(h.split(`data-yontem="${standart.id}"`)[1]!.split("</button>")[0]).not.toContain("ym-simge");
    const cift = yontemSecenekleri(ic, "ciftlik", HEPSI_ACIK);
    const girdisiz = cift.find((s) => s.girdi === "");
    if (girdisiz) expect(yontemSeciciHtml({ yapiAd: "Çiftlik", secenekler: cift, secili: null, kimlik: "c" })).toContain("saatte girdi istemez →");
  });

  it("kilitli kart: aria-disabled, data-durum=kapali, nedenli (teknoloji); tab durağı kilitsiz karta; kilitli seçici (gönderim) tüm kartları aria-disabled yapar", () => {
    const cift = yontemSecenekleri(ic, "ciftlik", HICBIRI_ACIK_DEGIL);
    const h = yontemSeciciHtml({ yapiAd: "Çiftlik", secenekler: cift, secili: null, kimlik: "c" });
    const kilitliId = cift.find((s) => s.kilitli)!.id;
    const kart = h.split(`data-yontem="${kilitliId}"`)[1]!.split("</button>")[0]!;
    expect(kart).toContain('data-durum="kapali"');
    expect(kart).toContain('aria-disabled="true"');
    expect(kart).toContain('ym-satir ym-neden">Teknolojisini açman gerekir.');
    expect(h.match(/tabindex="0"/g)).toHaveLength(1);
    expect(h.split(`data-yontem="${cift.find((s) => !s.kilitli)!.id}"`)[1]!.split(">")[0]).toContain('tabindex="0"');
    const kilitSecici = html("degirmen", { kilitli: true });
    expect(kilitSecici.match(/aria-disabled="true"/g)).toHaveLength(gida.length);
  });

  it("'Yöntemi değiştir' kipi: mevcut yöntem aria-current; özel başlık", () => {
    const h = html("ekmek_firini", { mevcut: "degirmen", baslik: "Gıda fabrikası: yöntemi değiştir", kimlik: "t7" });
    expect(h).toContain("Gıda fabrikası: yöntemi değiştir</legend>");
    expect(h).toMatch(/data-yontem="degirmen"[^>]*aria-current="true"/);
    expect(h).toContain('id="ym-baslik-t7"');
  });

  it("klavye: oklar sarar ve kilitliyi atlar, Home/End ilk/son, Boşluk/Enter odaktakini seçer, ilgisiz tuş null", () => {
    const k = [
      { ...gida[0]!, kilitli: false },
      { ...gida[1]!, kilitli: true },
      { ...gida[2]!, kilitli: false },
    ];
    const [a, , c] = [k[0]!.id, k[1]!.id, k[2]!.id];
    expect(seciciTusu("ArrowRight", k, a)).toBe(c); // kilitli atlanır
    expect(seciciTusu("ArrowDown", k, c)).toBe(a); // sarar
    expect(seciciTusu("ArrowLeft", k, a)).toBe(c);
    expect(seciciTusu("ArrowUp", k, c)).toBe(a);
    expect(seciciTusu("Home", k, c)).toBe(a);
    expect(seciciTusu("End", k, a)).toBe(c);
    expect(seciciTusu(" ", k, c)).toBe(c);
    expect(seciciTusu("Enter", k, a)).toBe(a);
    expect(seciciTusu("Enter", k, k[1]!.id)).toBeNull(); // kilitli odak: seçilmez
    expect(seciciTusu("a", k, a)).toBeNull();
    expect(seciciTusu("ArrowRight", k.map((x) => ({ ...x, kilitli: true })), a)).toBeNull();
    expect(seciciTusu("ArrowRight", k, null)).toBe(a); // odak yokken ilk
  });
});

describe("metinler ve ret çevirisi", () => {
  it("büyük harfli sözcük yok; yer tutucu adları ASCII küçük harf; şablonda ₺ yok; yer tutucular doldurulur", () => {
    for (const [a, m] of Object.entries(YONTEM_METIN)) {
      expect(/\b[A-ZÇĞİÖŞÜ]{2,}\b/.test(m), `${a}: ${m}`).toBe(false);
      expect(m.includes("₺"), a).toBe(false);
      for (const y of m.match(/\{[^}]*\}/g) ?? []) expect(y, `${a}: ${y}`).toMatch(/^\{[a-z_]+\}$/);
    }
    expect(yontemMetni("yontem.secici.gider", { gider: "40 ₺" })).toBe("Şebeke gideri ≈ 40 ₺/sa");
    expect(yontemMetni("yontem.degistir.ozet", { eski: "Değirmen", yeni: "Ekmek fırını" })).toBe("Değirmen → Ekmek fırını");
    expect(yontemMetni("yontem.degistir.onay")).toBe("Yöntemi değiştirmek istiyor musun?");
  });

  it("çekirdek ret iletileri A1 metnine çevrilir (yöntem bağlamında altısı; yapı kurarken ortak ikisi genel metinde kalır); tanınmayan metin hâliyle", () => {
    const ornek: Array<[string, string]> = [
      ["yontem yalniz tesis turunde verilebilir: Dükkân", "Bu yapıya yöntem seçilmez."],
      ["bilinmeyen yontem: x", "Bu yöntem bulunamadı."],
      ["yontem bu tesis turunde yok: degirmen", "Bu yapıda bu yöntem kullanılamaz."],
      ["yontem acik degil: mekanize_tarim", "Bu yöntem için teknolojiyi açman gerekir."],
      ["bolgede boyle bir tesis yok: 4", "Bu yapı artık yok."],
      ["bolge oyuncunun degil: x#y", "Bu yapı senin değil."],
      ["bilinmeyen bolge: z", "Bu yapı senin değil."],
    ];
    for (const [ham_, tr] of ornek) expect(yontemHatasiTurkce(ham_), ham_).toBe(tr);
    // Yapı kurarken (genel eşleme): yöntem iletileri çevrilir; ortak ikisi ölçek büyütmeyle aynı genel metin
    for (const [ham_, tr] of ornek.slice(0, 4)) expect(mulkHatasiTurkce(ham_), ham_).toBe(tr);
    expect(mulkHatasiTurkce("bolgede boyle bir tesis yok: 4")).toBe("Bu tesis artık yok.");
    expect(yontemHatasiTurkce("yetersiz hazine")).toBe("Hazinede yeterli para yok.");
    expect(YONTEM_RET_KALIPLARI.length).toBe(6);
    for (const [, a] of YONTEM_RET_KALIPLARI) expect(YONTEM_METIN[a], a).toBeTruthy();
  });
});
