/**
 * Mal ve yapı kimlik kilidi (docs/06 §15.8; icerik/kimlik-listesi.json): şema, listenin kendi tutarlılığı ve içeriğin listeye karşı kilidi.
 * (a) üyelik, (b) önek (yalnız sona ekleme), (c) yasaklılar, (d) mal/dükkân türü ad alanı, (e) kimlik biçimi, (f) taban fiyat: her biri için ret testi.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dogrulaKimlikKilidi, dogrulaVeriPaketi, kimlikKilidiHatalari, kimlikListesiHatalari, KIMLIK_BICIMI, miniVeriyiYukle, MINI_HARITA_SECENEKLERI, varsayilanVeriyiYukle, yontemSayisiUyarilari } from "../src";
import type { KimlikKilidiGirdisi, KimlikListesi } from "../src";
import { ilImzaVerisiniYukle } from "../src";

function listeOku(): KimlikListesi {
  return JSON.parse(readFileSync(new URL("../icerik/kimlik-listesi.json", import.meta.url), "utf8")) as KimlikListesi;
}

/** Varsayılan içeriğin kilit girdisi. */
function girdi(): { liste: KimlikListesi; g: { mallar: { id: string; tabanFiyat: number }[]; tesisTurleri: string[]; ekYapilar: string[]; dukkanTurleri?: string[] } } {
  const v = varsayilanVeriyiYukle();
  return {
    liste: listeOku(),
    g: {
      mallar: v.icerik.mallar.map((m) => ({ id: m.id, tabanFiyat: m.tabanFiyat })),
      tesisTurleri: v.icerik.tesisTurleri.map((t) => t.id),
      ekYapilar: Object.keys(v.param.mulk?.ekYapilar ?? {}),
    },
  };
}

const kilit = (liste: unknown, g: KimlikKilidiGirdisi): string => kimlikKilidiHatalari(liste, g).join("\n");

describe("kimlik-listesi.json: kendi tutarlılığı", () => {
  it("geçerlidir; 110 mal (14 mevcut + 10 A0 + 4 A0-ops + 4 A1 dikey + 23 üretim ağı + 55 ileride), aşama sırası A0, A0-ops, A1, S, ileride", () => {
    const l = listeOku();
    expect(kimlikListesiHatalari(l)).toEqual([]);
    expect(l.mallar).toHaveLength(110);
    const say = (a: string) => l.mallar.filter((m) => m.asama === a).length;
    expect([say("A0"), say("A0-ops"), say("A1"), say("S"), say("ileride")]).toEqual([24, 4, 4 + 15, 8, 55]);
    // aşama sırası monoton (önce A0, sonra A0-ops, A1, S, ileride)
    const sira = ["A0", "A0-ops", "A1", "S", "ileride"];
    for (let i = 1; i < l.mallar.length; i++) expect(sira.indexOf(l.mallar[i]!.asama)).toBeGreaterThanOrEqual(sira.indexOf(l.mallar[i - 1]!.asama));
    // Alfa-0'ın 10 yeni malı tablo sırasıyla 14'ten hemen sonra
    expect(l.mallar.slice(14, 24).map((m) => m.id)).toEqual(["un", "ekmek", "cam", "pencere", "sut", "sut_urunu", "findik", "findik_urunu", "sekerleme", "kepek"]);
    expect(l.mallar.find((m) => m.id === "findik_urunu")!.taban).toBe(240);
  });

  it("yapılar: 18 tesis türü + hafif_sanayi (A1); ek yapılar + dukkan, ordugah, karakol, gozetleme_kulesi; nobet_evi kamu yapısı (oyuncuya kapalı, uygulama yok); 13 dükkân türü", () => {
    const l = listeOku();
    expect(l.yapilar.tesisTurleri).toHaveLength(19);
    expect(l.yapilar.tesisTurleri[18]).toEqual({ id: "hafif_sanayi", asama: "A1" });
    expect(l.yapilar.ekYapilar.map((y) => y.id)).toEqual(["ambar", "ticaret_ofisi", "muhtarlik", "konut", "garaj", "atolye_lab", "dukkan", "ordugah", "karakol", "gozetleme_kulesi"]);
    expect(l.yapilar.kamuYapilari).toEqual([{ id: "nobet_evi", asama: "ileride" }]);
    expect(l.dukkanTurleri.map((d) => d.id)).toEqual(["tezgah", "bakkal", "firin", "sarkuteri", "sekerci", "yapi_market", "market", "supermarket", "giyim", "kasap", "manav", "toptan", "mobilyaci"]);
    expect(l.yasakli.mallar.map((y) => y.id)).toEqual(["tekstil", "sarkuteri"]);
  });

  it("(d) mal ve dükkân türü ad alanları kesişmez; sarkuteri yalnız dükkân türüdür", () => {
    const l = listeOku();
    const mal = new Set(l.mallar.map((m) => m.id));
    for (const d of l.dukkanTurleri) expect(mal.has(d.id), d.id).toBe(false);
    expect(mal.has("sarkuteri")).toBe(false);
    expect(mal.has("tekstil")).toBe(false);
  });

  it("il-imza 'ileride' kimliklerinin tümü listede mal olarak vardır (ileride ya da içerik aşamasında); listedeki ilk 24 mal içeriktir", () => {
    const l = listeOku();
    const ids = new Set(l.mallar.map((m) => m.id));
    for (const m of ilImzaVerisiniYukle().ilImza.ileride) expect(ids.has(m.malId), m.malId).toBe(true);
    expect(l.mallar.slice(0, 24).map((m) => m.id)).toEqual(varsayilanVeriyiYukle().icerik.mallar.map((m) => m.id));
  });

  it("içerik listeye uyar: kilit boş hata verir; yükleyiciler listeyi pakete ekler ve yüklemede dogrulaKimlikKilidi uygular", () => {
    const { liste, g } = girdi();
    expect(kimlikKilidiHatalari(liste, g)).toEqual([]);
    const v = varsayilanVeriyiYukle();
    expect(v.kimlikListesi).toEqual(liste);
    expect(dogrulaKimlikKilidi(v)).toEqual({ gecerli: true });
    expect(dogrulaVeriPaketi(v)).toEqual({ gecerli: true });
    const m = miniVeriyiYukle();
    expect(m.kimlikListesi).toBeDefined();
    expect(dogrulaKimlikKilidi(m)).toEqual({ gecerli: true });
    expect(dogrulaVeriPaketi(m, MINI_HARITA_SECENEKLERI)).toEqual({ gecerli: true });
  });

  it("(e) biçim: büyük harf, Türkçe harf, tire, boşluk, baştaki rakam ve çift alt çizgi reddedilir; geçerli örnekler kabul", () => {
    for (const ok of ["un", "sut_urunu", "hafif_sanayi", "t1", "a_b_c"]) expect(KIMLIK_BICIMI.test(ok), ok).toBe(true);
    for (const kotu of ["Un", "süt", "sut-urunu", "sut urunu", "1un", "_un", "un_", "sut__urunu", "ÇAY", ""]) expect(KIMLIK_BICIMI.test(kotu), kotu).toBe(false);
  });
});

describe("(a) listede olmayan kimlik içeriğe giremez", () => {
  it("mal", () => {
    const { liste, g } = girdi();
    g.mallar.push({ id: "uydurma_mal", tabanFiyat: 1000 });
    expect(kilit(liste, g)).toMatch(/icerik\.mallar: kimlik listede yok .*: uydurma_mal/);
  });
  it("tesis türü", () => {
    const { liste, g } = girdi();
    g.tesisTurleri.push("uydurma_tesis");
    expect(kilit(liste, g)).toMatch(/icerik\.tesisTurleri: kimlik listede yok .*: uydurma_tesis/);
  });
  it("ek yapı (mulk.ekYapilar anahtarı)", () => {
    const { liste, g } = girdi();
    g.ekYapilar.push("uydurma_yapi");
    expect(kilit(liste, g)).toMatch(/mulk\.ekYapilar: kimlik listede yok .*: uydurma_yapi/);
    // listedeki yeni yapı (dukkan) kabul edilir
    const { liste: l2, g: g2 } = girdi();
    g2.ekYapilar.push("dukkan");
    expect(kimlikKilidiHatalari(l2, g2)).toEqual([]);
  });
  it("dükkân türü", () => {
    const { liste, g } = girdi();
    g.dukkanTurleri = ["bakkal", "uydurma_tur"];
    expect(kilit(liste, g)).toMatch(/dukkanTurleri: kimlik listede yok .*: uydurma_tur/);
    g.dukkanTurleri = ["bakkal", "firin"];
    expect(kimlikKilidiHatalari(liste, g)).toEqual([]);
  });
  it("listedeki (ileride aşamalı) kimlik içeriğe SONA eklenirse kabul edilir; aşama atlamak yasak değildir", () => {
    const { liste, g } = girdi();
    g.mallar.push({ id: "cimento", tabanFiyat: 45000 });
    expect(kimlikKilidiHatalari(liste, g)).toEqual([]);
  });
});

describe("(b) içerik sırası liste sırasının önekidir: yalnız sona ekleme", () => {
  it("araya ekleme (listedeki bir kimlik yanlış yere)", () => {
    const { liste, g } = girdi();
    g.mallar.splice(3, 0, { id: "cimento", tabanFiyat: 45000 });
    expect(kilit(liste, g)).toMatch(/icerik\.mallar\[3\]: onek ihlali: icerikte "cimento", listede "komur"/);
  });
  it("yeniden sıralama", () => {
    const { liste, g } = girdi();
    [g.mallar[0], g.mallar[1]] = [g.mallar[1]!, g.mallar[0]!];
    expect(kilit(liste, g)).toMatch(/icerik\.mallar\[0\]: onek ihlali: icerikte "gida", listede "tahil"/);
  });
  it("silme (sonrakiler kayar)", () => {
    const { liste, g } = girdi();
    g.mallar.splice(4, 1); // celik silindi
    expect(kilit(liste, g)).toMatch(/icerik\.mallar\[4\]: onek ihlali: icerikte "bakir", listede "celik"/);
  });
  it("tesis türleri için de önek", () => {
    const { liste, g } = girdi();
    g.tesisTurleri.splice(1, 0, "hafif_sanayi");
    expect(kilit(liste, g)).toMatch(/icerik\.tesisTurleri\[1\]: onek ihlali/);
    const { liste: l2, g: g2 } = girdi();
    g2.tesisTurleri.push("hafif_sanayi"); // sona ekleme kabul
    expect(kimlikKilidiHatalari(l2, g2)).toEqual([]);
    const { liste: l3, g: g3 } = girdi();
    g3.tesisTurleri.reverse();
    expect(kilit(l3, g3)).toMatch(/icerik\.tesisTurleri\[0\]: onek ihlali/);
  });
  it("listenin başka sırada tutulması (liste kaydı değişirse içerik reddedilir)", () => {
    const { liste, g } = girdi();
    [liste.mallar[0], liste.mallar[1]] = [liste.mallar[1]!, liste.mallar[0]!];
    expect(kilit(liste, g)).toMatch(/onek ihlali/);
  });
});

describe("(c) yasaklı kimlikler mallar[] içinde reddedilir", () => {
  it("tekstil", () => {
    const { liste, g } = girdi();
    g.mallar.push({ id: "tekstil", tabanFiyat: 1000 });
    const h = kilit(liste, g);
    expect(h).toMatch(/yasakli mal kimligi: tekstil \(yerine: kumas, hazir_giyim;/);
    expect(h).not.toMatch(/listede yok/); // yasaklı kimlik için tek ve açık ileti
  });
  it("sarkuteri (mal olarak; dükkân türü olarak serbest)", () => {
    const { liste, g } = girdi();
    g.mallar.push({ id: "sarkuteri", tabanFiyat: 1000 });
    expect(kilit(liste, g)).toMatch(/yasakli mal kimligi: sarkuteri \(yerine: et_urunu;/);
    const { liste: l2, g: g2 } = girdi();
    g2.dukkanTurleri = ["sarkuteri"];
    expect(kimlikKilidiHatalari(l2, g2)).toEqual([]);
  });
  it("yasaklı kimliği mal listesine yazmak listenin kendisini bozar", () => {
    const l = listeOku();
    l.mallar.push({ id: "tekstil", asama: "S" });
    expect(kimlikListesiHatalari(l).join("\n")).toMatch(/yasakli kimlik mal olamaz: tekstil/);
  });
});

describe("(d) mal ve dükkân türü ad alanları kesişmez", () => {
  it("içerikte dükkân türü bir mal kimliğiyle aynıysa reddedilir", () => {
    const { liste, g } = girdi();
    g.dukkanTurleri = ["un"];
    expect(kilit(liste, g)).toMatch(/icerik: mal ve dukkan turu ad alanlari kesisiyor: un/);
  });
  it("listede bir mal kimliği dükkân türüyle aynıysa liste geçersizdir (mobilyaci mal olamaz; mobilya ayrı kimliktir)", () => {
    const l = listeOku();
    l.mallar.push({ id: "mobilyaci", asama: "S" });
    expect(kimlikListesiHatalari(l).join("\n")).toMatch(/mal ve dukkan turu ad alanlari kesisiyor: mobilyaci/);
    // mobilya (mal) ve mobilyaci (tür) kesişmez
    const ok = listeOku();
    expect(ok.mallar.some((m) => m.id === "mobilya")).toBe(true);
    expect(ok.dukkanTurleri.some((m) => m.id === "mobilyaci")).toBe(true);
    expect(kimlikListesiHatalari(ok)).toEqual([]);
  });
  it("mal ve yapı kimlikleri de kesişmez", () => {
    const l = listeOku();
    l.yapilar.ekYapilar.push({ id: "tahil", asama: "S" });
    expect(kimlikListesiHatalari(l).join("\n")).toMatch(/mal ve yapi kimlikleri kesisiyor: tahil/);
  });
});

describe("(e) kimlik biçimi: ASCII, küçük harf, alt çizgi", () => {
  it("içerikte biçimi bozuk kimlik reddedilir (mal, tesis, ek yapı, dükkân türü)", () => {
    const { liste, g } = girdi();
    g.mallar.push({ id: "Sut", tabanFiyat: 1 });
    g.tesisTurleri.push("hafif-sanayi");
    g.ekYapilar.push("dükkan");
    g.dukkanTurleri = ["Bakkal"];
    const h = kilit(liste, g);
    expect(h).toMatch(/icerik\.mallar: gecersiz kimlik bicimi .*"Sut"/);
    expect(h).toMatch(/icerik\.tesisTurleri: gecersiz kimlik bicimi: "hafif-sanayi"/);
    expect(h).toMatch(/mulk\.ekYapilar: gecersiz kimlik bicimi: "dükkan"/);
    expect(h).toMatch(/dukkanTurleri: gecersiz kimlik bicimi: "Bakkal"/);
  });
  it("listede biçimi bozuk ya da tekrarlanan kimlik liste hatasıdır; şema ek alanı reddeder", () => {
    const l = listeOku();
    l.mallar.push({ id: "Hali", asama: "S" });
    l.mallar.push({ id: "tahil", asama: "S" });
    const h = kimlikListesiHatalari(l).join("\n");
    expect(h).toMatch(/mallar: gecersiz kimlik bicimi .*"Hali"/);
    expect(h).toMatch(/mallar: tekrarlanan kimlik: tahil/);
    const k = listeOku() as unknown as { mallar: Record<string, unknown>[] };
    k.mallar[0]!["fazla"] = 1;
    expect(kimlikListesiHatalari(k).length).toBeGreaterThan(0);
    const a = listeOku();
    (a.mallar[0] as { asama: string }).asama = "Z9";
    expect(kimlikListesiHatalari(a).length).toBeGreaterThan(0);
  });
});

describe("(f) taban fiyat listeyle tutarlı", () => {
  it("içerikteki tabanFiyat listedeki taban ₺ × 1000 ile aynı olmalı (findik_urunu 240: katalogdaki 190 değil)", () => {
    const { liste, g } = girdi();
    g.mallar.find((m) => m.id === "findik_urunu")!.tabanFiyat = 190_000;
    expect(kilit(liste, g)).toMatch(/icerik\.mallar\.findik_urunu: tabanFiyat 190000 listedeki taban 240 TL/);
  });
});

describe("dogrulaKimlikKilidi (yükleyicilerin uyguladığı paket denetimi) listeyi uygular", () => {
  it("içeriğe listede olmayan mal eklenen paket reddedilir; liste yoksa kilit uygulanmaz (dondurulmuş eski fikstürler)", () => {
    const v = varsayilanVeriyiYukle();
    v.icerik.mallar.push({ id: "uydurma_mal", ad: "U", kategori: "ara", tabanFiyat: 1000, lojistikOnceligi: 5, bozulmaPpmGun: 0 });
    v.param.pazar.emilimSaat["uydurma_mal"] = 1000;
    v.param.pazar.arzSaat["uydurma_mal"] = 1000;
    const r = dogrulaKimlikKilidi(v);
    expect(r.gecerli).toBe(false);
    expect(r.gecerli === false && r.hatalar.join("\n")).toMatch(/\[kimlik-listesi\] icerik\.mallar: kimlik listede yok .*: uydurma_mal/);
    delete v.kimlikListesi;
    expect(dogrulaKimlikKilidi(v)).toEqual({ gecerli: true });
  });
  it("içerik sırası bozulan paket reddedilir", () => {
    const v = varsayilanVeriyiYukle();
    v.icerik.mallar.reverse();
    const r = dogrulaKimlikKilidi(v);
    expect(r.gecerli === false && r.hatalar.join("\n")).toMatch(/\[kimlik-listesi\] icerik\.mallar\[0\]: onek ihlali/);
  });
  it("bozuk liste paket doğrulamasında kendi hatalarıyla görünür", () => {
    const v = varsayilanVeriyiYukle();
    (v.kimlikListesi as KimlikListesi).mallar.push({ id: "tekstil", asama: "S" });
    const r = dogrulaKimlikKilidi(v);
    expect(r.gecerli === false && r.hatalar.join("\n")).toMatch(/\[kimlik-listesi\] kimlik-listesi\.mallar: yasakli kimlik mal olamaz: tekstil/);
  });
});

// ---------------------------------------------------------------------------
// Yöntem kilidi (sartname §3.5; Y1-Y8): listede isteğe bağlı `yontemler` bölümü
// ---------------------------------------------------------------------------

/** Varsayılan içeriğin yöntemleri liste biçiminde (T3'ün ilk 24 kaydı: hepsi A0, yöntemi barındıran tür ev sahibi). */
function yontemGirdisi(): { liste: KimlikListesi; g: KimlikKilidiGirdisi; v: ReturnType<typeof varsayilanVeriyiYukle> } {
  const v = varsayilanVeriyiYukle();
  const evSahibi = new Map<string, string>();
  for (const t of v.icerik.tesisTurleri) for (const y of t.yontemler) if (!evSahibi.has(y)) evSahibi.set(y, t.id);
  const liste = listeOku(); // G6-3: `yontemler` bölümü kimlik-listesi.json'dadır (içerik sırasıyla)
  const g: KimlikKilidiGirdisi = {
    mallar: v.icerik.mallar.map((m) => ({ id: m.id, tabanFiyat: m.tabanFiyat })),
    tesisTurleri: v.icerik.tesisTurleri.map((t) => t.id),
    ekYapilar: Object.keys(v.param.mulk?.ekYapilar ?? {}),
    yontemler: v.icerik.yontemler.map((y) => ({ id: y.id, evSahibi: evSahibi.get(y.id), mulkKipi: y.mulkKipi === true })),
  };
  return { liste, g, v };
}

describe("yöntem kilidi (Y1-Y8)", () => {
  it("bugünkü 30 yöntem listeyle uyumlu: hata yok (hidro_santrali hem tür hem yöntem: istisna); liste içerikle aynı sırada ve G6'nın dört + G8'in iki yeni yöntemi mulkKipi", () => {
    const { liste, g, v } = yontemGirdisi();
    expect(v.icerik.yontemler).toHaveLength(30);
    expect(liste.yontemler!.map((y) => y.id)).toEqual(v.icerik.yontemler.map((y) => y.id));
    expect(liste.yontemler!.filter((y) => y.mulkKipi === true).map((y) => y.id)).toEqual(["degirmen", "ekmek_firini", "kepek_gubresi", "sut_kepekli", "cam_firini", "celik_dograma"]);
    expect(kimlikListesiHatalari(liste)).toEqual([]);
    expect(kilit(liste, g)).toBe("");
    expect(v.icerik.tesisTurleri.some((t) => t.id === "hidro_santrali")).toBe(true);
    expect(v.icerik.yontemler.some((y) => y.id === "hidro_santrali")).toBe(true);
  });

  it("yontemler alanı YOKKEN yöntem kilidi uygulanmaz (eski liste biçimi; içeriğe sahte yöntem eklense de hata yok)", () => {
    const { g } = yontemGirdisi();
    const liste = listeOku();
    delete liste.yontemler; // G6-3 ile liste artık bölümü taşır; yokluk durumu (eski listeler) bellekte sınanır
    expect(liste.yontemler).toBeUndefined();
    expect(kilit(liste, { ...g, yontemler: [...(g.yontemler ?? []), { id: "sahte_yontem", evSahibi: "ciftlik", mulkKipi: false }] })).toBe("");
  });

  it("Y1: yöntem kimliği biçimi ve tekrar liste hatasıdır; şema ek alanı ve geçersiz aşamayı reddeder", () => {
    const { liste } = yontemGirdisi();
    const bozuk = structuredClone(liste);
    bozuk.yontemler![0]!.id = "Bozuk-Kimlik";
    expect(kimlikListesiHatalari(bozuk).join("\n")).toMatch(/kimlik-listesi\.yontemler: gecersiz kimlik bicimi.*"Bozuk-Kimlik"/);
    const tekrar = structuredClone(liste);
    tekrar.yontemler!.push({ ...tekrar.yontemler![3]! });
    expect(kimlikListesiHatalari(tekrar).join("\n")).toMatch(/kimlik-listesi\.yontemler: tekrarlanan kimlik: /);
    const fazla = structuredClone(liste) as unknown as { yontemler: Record<string, unknown>[] };
    fazla.yontemler[0]!["ek"] = 1;
    expect(kimlikListesiHatalari(fazla)).not.toEqual([]);
    const asama = structuredClone(liste) as unknown as { yontemler: Record<string, unknown>[] };
    asama.yontemler[0]!["asama"] = "B9";
    expect(kimlikListesiHatalari(asama)).not.toEqual([]);
    const mk = structuredClone(liste) as unknown as { yontemler: Record<string, unknown>[] };
    mk.yontemler[0]!["mulkKipi"] = false; // yalnız literal true
    expect(kimlikListesiHatalari(mk)).not.toEqual([]);
  });

  it("Y2: evSahibi yapilar.tesisTurleri üyesi olmalı", () => {
    const { liste } = yontemGirdisi();
    liste.yontemler![5]!.evSahibi = "yok_boyle_tur";
    expect(kimlikListesiHatalari(liste).join("\n")).toMatch(new RegExp(`kimlik-listesi\\.yontemler\\.${liste.yontemler![5]!.id}: evSahibi listede yok: yok_boyle_tur`));
  });

  it("Y3: ad alanı: yöntem kimliği mal, ek yapı, dükkân türü ve tesis türü kimlikleriyle kesişemez; hidro_santrali istisnası", () => {
    const { liste } = yontemGirdisi();
    const dene = (id: string): string => {
      const l = structuredClone(liste);
      l.yontemler!.push({ id, evSahibi: "ciftlik", asama: "A1" });
      return kimlikListesiHatalari(l).join("\n");
    };
    expect(dene("un")).toMatch(/kimlik-listesi: yontem ve mal ad alanlari kesisiyor: un/);
    expect(dene("ambar")).toMatch(/kimlik-listesi: yontem ve yapi ad alanlari kesisiyor: ambar/);
    expect(dene("nobet_evi")).toMatch(/kimlik-listesi: yontem ve yapi ad alanlari kesisiyor: nobet_evi/);
    expect(dene("bakkal")).toMatch(/kimlik-listesi: yontem ve dukkan turu ad alanlari kesisiyor: bakkal/);
    expect(dene("ahir")).toMatch(/kimlik-listesi: yontem ve yapi ad alanlari kesisiyor: ahir/);
    expect(dene("yeni_yontem_ok")).toBe("");
    // istisna: bugünkü hidro_santrali (hem tür hem yöntem) hata vermiyor (üstteki test); başka tür kimliği yöntem olamaz
    expect(liste.yontemler!.some((y) => y.id === "hidro_santrali")).toBe(true);
  });

  it("Y4: içerikte olup listede olmayan yöntem reddedilir (önce listeye eklenmeli)", () => {
    const { liste, g } = yontemGirdisi();
    expect(kilit(liste, { ...g, yontemler: [...g.yontemler!, { id: "yeni_yontem", evSahibi: "ciftlik", mulkKipi: false }] })).toMatch(/icerik\.yontemler: kimlik listede yok \(kimlik-listesi\.json'a once eklenmeli\): yeni_yontem/);
  });

  it("Y5: yalnız sona ekleme: araya ekleme, yeniden sıralama ve silme önek ihlalidir; sona ekleme (listede de varsa) geçer", () => {
    const { liste, g } = yontemGirdisi();
    const y = g.yontemler!;
    // araya ekleme (listedeki bir kimlik içerikte yanlış yerde)
    const araya = [...y.slice(0, 5), y[22]!, ...y.slice(5, 22), ...y.slice(23)];
    expect(kilit(liste, { ...g, yontemler: araya })).toMatch(/icerik\.yontemler\[5\]: onek ihlali/);
    // yeniden sıralama
    expect(kilit(liste, { ...g, yontemler: [...y].reverse() })).toMatch(/icerik\.yontemler\[0\]: onek ihlali/);
    // silme (sonrakiler kayar)
    expect(kilit(liste, { ...g, yontemler: [...y.slice(0, 2), ...y.slice(3)] })).toMatch(/icerik\.yontemler\[2\]: onek ihlali/);
    // sona ekleme: listeye de eklenmişse geçer
    const uzun = structuredClone(liste);
    uzun.yontemler!.push({ id: "yeni_yontem", evSahibi: "ciftlik", asama: "A0" });
    expect(kilit(uzun, { ...g, yontemler: [...y, { id: "yeni_yontem", evSahibi: "ciftlik", mulkKipi: false }] })).toBe("");
  });

  it("Y6: ev sahibi değişmezliği: içerikte yöntemi barındıran tür listedekiyle aynı olmalı (hiçbir türde değilse de ihlal)", () => {
    const { liste, g } = yontemGirdisi();
    const y = g.yontemler!.map((k) => ({ ...k }));
    const i = y.findIndex((k) => k.id === "standart_parca");
    const eski = y[i]!.evSahibi;
    y[i]!.evSahibi = "celikhane";
    expect(kilit(liste, { ...g, yontemler: y })).toMatch(new RegExp(`icerik\\.yontemler\\.standart_parca: ev sahibi degisti: icerikte celikhane, listede ${eski}`));
    y[i]!.evSahibi = undefined;
    expect(kilit(liste, { ...g, yontemler: y })).toMatch(/icerik\.yontemler\.standart_parca: ev sahibi degisti: icerikte \(yok\), listede /);
  });

  it("Y7: mulkKipi eşitliği: içerik ve liste bayrağı aynı olmalı (iki yönde)", () => {
    const { liste, g } = yontemGirdisi();
    const y = g.yontemler!.map((k) => ({ ...k }));
    y[1]!.mulkKipi = true; // içerikte var, listede yok
    expect(kilit(liste, { ...g, yontemler: y })).toMatch(new RegExp(`icerik\\.yontemler\\.${y[1]!.id}: mulkKipi listeyle ayni degil`));
    const l2 = structuredClone(liste);
    l2.yontemler![2]!.mulkKipi = true; // listede var, içerikte yok
    expect(kilit(l2, g)).toMatch(new RegExp(`icerik\\.yontemler\\.${l2.yontemler![2]!.id}: mulkKipi listeyle ayni degil`));
    const l3 = structuredClone(liste);
    l3.yontemler![3]!.mulkKipi = true;
    const y3 = g.yontemler!.map((k) => ({ ...k }));
    y3[3]!.mulkKipi = true;
    expect(kilit(l3, { ...g, yontemler: y3 })).toBe(""); // ikisi de var: geçer
  });

  it("Y8: tür başına 10'dan fazla yöntem UYARIDIR (hata değil)", () => {
    expect(yontemSayisiUyarilari([{ id: "a", yontemler: Array.from({ length: 10 }, (_, i) => `y${i}`) }])).toEqual([]);
    expect(yontemSayisiUyarilari([{ id: "a", yontemler: Array.from({ length: 11 }, (_, i) => `y${i}`) }])).toEqual(["icerik.tesisTurleri.a: yontem sayisi > 10 (11)"]);
    const { v } = yontemGirdisi();
    expect(yontemSayisiUyarilari(v.icerik.tesisTurleri)).toEqual([]);
  });

  it("dogrulaKimlikKilidi: paketten kurulur (ev sahibi türden, mulkKipi içerikten) ve aynı çağrıda dükkân türleri geçer", () => {
    const { liste, v } = yontemGirdisi();
    v.kimlikListesi = liste;
    expect(dogrulaKimlikKilidi(v)).toEqual({ gecerli: true });
    // bozulmuş ev sahibi (listede): paket denetimi yakalar
    v.kimlikListesi = structuredClone(liste);
    v.kimlikListesi.yontemler!.find((y) => y.id === "standart_parca")!.evSahibi = "celikhane";
    const r = dogrulaKimlikKilidi(v);
    expect(r.gecerli === false && r.hatalar.join("\n")).toMatch(/\[kimlik-listesi\] icerik\.yontemler\.standart_parca: ev sahibi degisti/);
    // dükkân türleri aynı çağrıda: listede olmayan dükkân türü reddedilir, olan geçer (perakende bloğu G7'de şemaya girer; yapısal okunur)
    v.kimlikListesi = liste;
    (v.param.mulk as unknown as { perakende: unknown }).perakende = { dukkanTurleri: [{ id: "bakkal" }] };
    expect(dogrulaKimlikKilidi(v)).toEqual({ gecerli: true });
    (v.param.mulk as unknown as { perakende: unknown }).perakende = { dukkanTurleri: [{ id: "bakkal" }, { id: "olmayan_dukkan" }] };
    const r2 = dogrulaKimlikKilidi(v);
    expect(r2.gecerli === false && r2.hatalar.join("\n")).toMatch(/mulk\.perakende\.dukkanTurleri: kimlik listede yok .*: olmayan_dukkan/);
  });
});
