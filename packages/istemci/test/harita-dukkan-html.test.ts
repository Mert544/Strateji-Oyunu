import { describe, expect, it } from "vitest";
import {
  dakikaSaniye,
  defterKartiHtml,
  dukkanAdi,
  dukkanBolumuHtml,
  dukkanDikkatMaddeleri,
  dukkanMenusuHtml,
  insaatEtiketi,
  kademeHtml,
  markaFormuHtml,
  kaldirOnayHtml,
  maliyetSatirlariHtml,
  oneriKartiHtml,
  ozetHtml,
  rafHtml,
  saatDakika,
  seciciHtml,
  bosaltBeklemesi,
  bosaltOnayHtml,
  turAdi,
  turEtiketi,
  turSecimiHtml,
  retMetni,
  ustKartHtml,
  yuvaDurumu,
} from "../src/harita/dukkan-html";
import { DUKKAN_METIN } from "../src/harita/dukkan-metin";
import type { DukkanGorunumu, DukkanKaydi, DukkanYuvasi } from "../src/harita/dukkan-veri";

const SAAT = 3_600_000;
const malAdi = (m: string): string => ({ gida: "Gıda", ekmek: "Ekmek", tahil: "Tahıl" })[m] ?? m;

function yuva(ek: Partial<DukkanYuvasi> = {}): DukkanYuvasi {
  return { mal: "gida", kademe: 2, etkinKademe: 2, stokVar: true, istekMiliSaat: 12_000, fiyatMili: 2_500, netMiliSaat: 20_000, fiyatT: 0, beklemeSaat: 0, ...ek };
}

function dukkan(ek: Partial<DukkanKaydi> = {}): DukkanKaydi {
  return {
    id: 7,
    tur: "bakkal",
    durum: "acik",
    ilce: "kadikoy",
    markaAd: "",
    yuvalar: [yuva(), yuva({ mal: null, istekMiliSaat: 0 }), yuva({ mal: null }), yuva({ mal: null })],
    kasaPpm: 400_000,
    karsilanmaPpm: 1_000_000,
    gelirMiliSa: 640_000,
    giderMiliSa: 120_000,
    kampanya: { bitis: 0, kalanSaat: 4, kalanGun: 3 },
    ...ek,
  };
}

function gorunum(ek: Partial<DukkanGorunumu> = {}): DukkanGorunumu {
  return { kapali: false, dukkanlar: [], markalar: [], ilkSatisT: null, satilabilirMallar: new Set(["gida", "ekmek"]), kurmaKarsilaniyor: true, kampanyaAcik: true, ...ek };
}

const ilceAdi = (i: string): string => (i === "kadikoy" ? "Kadıköy" : i);

describe("D0 öneri kartı ve B7 Defter kartı", () => {
  it("sabit sayı yok: iade yüzdesi, indirim ve kasa kapasitesi parametreden gelir", () => {
    expect(dukkanMenusuHtml({ id: 8, durum: "insaat" }, true, "%40")).toContain("İptal et (iade %40)");
    expect(kaldirOnayHtml({ id: 8, durum: "insaat" }, "%40")).toContain("%40 kadarı geri gelir");
    expect(rafHtml(dukkan(), { malAdi, simdi: 0, kasaBirimSa: 120 })).toContain("Kasa saatte en çok 120 birim satar.");
    expect(maliyetSatirlariHtml({ tur: "bakkal", hucre: 1, esZamanliInsaat: 2, durum: "uygun", arsaMili: 0, dukkanMili: 1, celikAdet: 1, parcaAdet: 1, sureSaat: 1, toplamMili: 1, hazineMili: 9, indirim: { n: 3, yuzde: "%25" } })).toContain("Kalan 3 yapında %25 indirim var.");
    expect(maliyetSatirlariHtml({ tur: "bakkal", hucre: 1, esZamanliInsaat: 2, durum: "uygun", arsaMili: 0, dukkanMili: 1, celikAdet: 1, parcaAdet: 1, sureSaat: 1, toplamMili: 1, hazineMili: 9 })).not.toContain("indirim var");
    // eksik çelik/parça: yalnız stok-eksik durumunda uyarı, düğme kapalı
    const eksik = maliyetSatirlariHtml({ tur: "bakkal", hucre: 1, esZamanliInsaat: 2, durum: "stok-eksik", arsaMili: 0, dukkanMili: 1, celikAdet: 8, parcaAdet: 2, sureSaat: 1, toplamMili: 1, hazineMili: 9, stokEksik: { ad: "Çelik", var: 3, gereken: 8 } });
    expect(eksik).toContain("Çelik yetmiyor: 3 / 8.");
    expect(eksik).toContain('data-yk="onayla" aria-disabled="true"');
    expect(maliyetSatirlariHtml({ tur: "bakkal", hucre: 1, esZamanliInsaat: 2, durum: "uygun", arsaMili: 0, dukkanMili: 1, celikAdet: 8, parcaAdet: 2, sureSaat: 1, toplamMili: 1, hazineMili: 9, stokEksik: { ad: "Çelik", var: 3, gereken: 8 } })).not.toContain("yetmiyor");
  });

  it("D0: bölge, başlık bağı, kapat yalnız simgeli (aria-label), tek eylem 'Dükkân kur', boş raf notu", () => {
    const h = oneriKartiHtml();
    expect(h).toContain(`class="dk-oneri" role="region" aria-labelledby="dk-oneri-baslik" data-tur="dukkan" data-durum="acik"`);
    expect(h).toContain(`id="dk-oneri-baslik">İlk dükkânın için malzemen hazır`);
    expect(h).toMatch(/class="[^"]*dk-oneri-kapat"[^>]*aria-label="Öneriyi kapat"/);
    expect(h).toContain(`<p class="dk-oneri-not">Başlangıç gıdanı rafın için sakla.</p>`);
    expect(h).toContain(`<button type="button" class="eylem ton" data-eylem="dukkan-kur">Dükkân kur</button>`);
    expect(h).not.toContain("birincil");
    expect(h.replace(/<[^>]*>/g, "")).not.toMatch(/\d/); // metinde sayı ya da tutar yazılmaz
  });

  it("B7: 'Sıradaki adım' başlığı, adım ve ödül, tek eylem 'Atla' (kartta birincil yok)", () => {
    const h = defterKartiHtml("Çiftliğinin tahılını sat.", `<span class="dt-ana">ödül: 10 çelik</span>`);
    expect(h).toContain(`data-tur="defter"`);
    expect(h).toContain(`>Sıradaki adım</h4>`);
    expect(h).toContain("Çiftliğinin tahılını sat.");
    expect(h).toContain(`<span class="dk-oneri-sag"><span class="dt-ana">ödül: 10 çelik</span></span>`);
    expect(h).toContain(`<button type="button" class="mini-dugme" data-eylem="defter-atla" aria-label="Sıradaki adımı atla">Atla</button>`);
    expect(h).not.toContain("birincil");
    expect(defterKartiHtml("x", "")).not.toContain("dk-oneri-sag");
  });

  it("ustKartHtml: öneri önce, Defter ancak yoksa; ikisi birden yazılmaz", () => {
    expect(ustKartHtml("dukkan", { metin: "x", odulHtml: "" })).toContain(`data-tur="dukkan"`);
    expect(ustKartHtml("dukkan", { metin: "x", odulHtml: "" })).not.toContain(`data-tur="defter"`);
    expect(ustKartHtml("defter", { metin: "x", odulHtml: "" })).toContain(`data-tur="defter"`);
    expect(ustKartHtml("defter", null)).toBe("");
    expect(ustKartHtml(null)).toBe("");
  });
});

describe("D-1 Dükkânlarım", () => {
  it("dünya kapalıysa ya da veri yoksa hiç yazılmaz", () => {
    expect(dukkanBolumuHtml(null, { ilceAdi, simdi: 0 })).toBe("");
    expect(dukkanBolumuHtml(gorunum({ kapali: true }), { ilceAdi, simdi: 0 })).toBe("");
  });

  it("boşken Dükkân simgeli boş durum", () => {
    const h = dukkanBolumuHtml(gorunum(), { ilceAdi, simdi: 0 });
    expect(h).toContain(`<section class="dk-bolum" data-ekran="d1"><h3>Dükkânlarım</h3>`);
    expect(h).toContain(`class="bos-durum dk-bos"`);
    expect(h).toContain("Henüz dükkânın yok. Yapı kur → Dükkân");
  });

  it("türü bilinmeyen (null) inşadaki dükkân türsüz çizilir: ad 'Dükkân', genel store simgesi", () => {
    const g = gorunum({ dukkanlar: [dukkan({ id: 3, tur: null, durum: "insaat", bitis: 2 * SAAT, ilce: undefined })] });
    const h = dukkanBolumuHtml(g, { ilceAdi, simdi: 0 });
    expect(h).toContain(`data-dukkan="3" data-durum="insaat"`);
    expect(h).toContain("<b>Dükkân</b>");
    expect(h).toContain(`href="#i-store"`);
    expect(h).toContain("İnşa sürüyor · 2 sa");
    expect(dukkanAdi({ markaAd: "", tur: null })).toBe("Dükkân");
    expect(dukkanAdi({ markaAd: "bereket", tur: null })).toBe("bereket");
  });

  it("satırlar: açık dükkân net/sa ve Git; inşadaki dükkân kalan süre; marka adı yoksa tür adı", () => {
    const g = gorunum({
      dukkanlar: [dukkan(), dukkan({ id: 8, tur: "firin", durum: "insaat", markaAd: "bereket", bitis: 2 * SAAT, ilce: undefined })],
    });
    const h = dukkanBolumuHtml(g, { ilceAdi, simdi: 0.5 * SAAT });
    expect(h).toContain(`<li class="dk-satir" data-dukkan="7" data-durum="acik">`);
    expect(h).toContain("<b>Bakkal · net ≈\u00a0+520\u00a0₺/sa");
    expect(h).toContain(`data-mulk-ilce="kadikoy"`);
    expect(h).toContain(`<li class="dk-satir" data-dukkan="8" data-durum="insaat">`);
    expect(h).toContain("<b>bereket</b>");
    expect(h).toContain("İnşa sürüyor · 1 sa 30 dk");
    // ayrıntı düğmesi: açıkta "Raf", inşadakinde "Daha fazla"; seçili dükkânda aria-expanded
    expect(h).toContain(`data-eylem="dukkan-sec" data-dukkan="7" aria-expanded="false">Raf</button>`);
    expect(h).toContain(`data-eylem="dukkan-sec" data-dukkan="8" aria-expanded="false">Daha fazla</button>`);
    expect(dukkanBolumuHtml(g, { ilceAdi, simdi: 0.5 * SAAT, secili: 7 })).toContain(`data-dukkan="7" aria-expanded="true"`);
    // inşadaki satırda ilçe yoksa Git yok
    expect(h.split(`data-dukkan="8"`)[1]).not.toContain("data-mulk-ilce");
  });
});

describe("D-2 tür seçimi", () => {
  it("tür kartları: aria-pressed, simge, sayı ('bu ilçede 1 / 2'), tür uyumu işareti", () => {
    const h = turSecimiHtml({ hucre: 1, secili: "firin", ilceSayi: 1, ilceSinir: 2, ilSayi: 1, ilSinir: 6, uyum: { bakkal: true, firin: false, sekerci: false } });
    expect(h).toContain(`<button type="button" class="dk-tur" data-tur="firin" aria-pressed="true">`);
    expect(h).toContain(`data-tur="bakkal" aria-pressed="false"`);
    expect(h).toContain("Bakkal · gündelik mallar");
    expect(h).toContain("bu ilçede 1 / 2");
    expect(h).toContain(`data-uyum="var">depondaki malla satabilirsin`);
    expect(h).toContain(`data-uyum="yok">malın yok`);
    expect(h).toContain(`data-uyum="ithal">malın yok; Pazar&#39;dan alabilirsin`);
    expect(h).toContain("Bu ilçede dükkânın: 1 / 2");
    expect(h).toContain("Bu ilde dükkânın: 1 / 6");
    expect(h).toContain(`<p class="dk-neden" id="dk-neden" role="status"></p>`);
  });

  it("ilçe sınırı doluyken kartlar aria-disabled + neden satırı bağlı; ret ayrı satırda role=alert", () => {
    const h = turSecimiHtml({ hucre: 1, secili: null, ilceSayi: 2, ilceSinir: 2, ilSayi: 2, ilSinir: 6, hata: "Dükkân türünü seçmelisin." });
    expect(h.match(/aria-disabled="true" aria-describedby="dk-neden"/g)?.length).toBe(5);
    expect(h).toContain(`role="status">Bu ilçede en çok 2 dükkânın olabilir.</p>`);
    expect(h).toContain(`<p class="dk-hata" role="alert">Dükkân türünü seçmelisin.</p>`);
  });

  it("şekerci kartında ithal gerekir ipucu (tür uyumu yok): diğer türlerde 'malın yok'", () => {
    const h = turSecimiHtml({ hucre: 1, secili: null, ilceSayi: 0, ilceSinir: 2, ilSayi: 0, ilSinir: 6, uyum: { sekerci: false, bakkal: false } });
    expect(h).toContain(`data-uyum="ithal">malın yok; Pazar&#39;dan alabilirsin`);
    expect(h).toContain(`data-uyum="yok">malın yok</span>`);
    // şekerci için yok değeri hiç yazılmaz; stoğu olan şekerci "var" kalır
    expect(h.match(/data-uyum="yok"/g)?.length).toBe(1);
    expect(turSecimiHtml({ hucre: 1, secili: null, ilceSayi: 0, ilceSinir: 2, ilSayi: 0, ilSinir: 6, uyum: { sekerci: true } })).toContain(`data-uyum="var">depondaki malla satabilirsin`);
  });

  it("yapı market etiketi diğer dört tür gibi tek metin: ad + malları ('Yapı market · cam, pencere, çelik, parça'); yer ipucu ve sayaçlar parametreden", () => {
    const h = turSecimiHtml({ hucre: 2, secili: null, ilceSayi: 1, ilceSinir: 3, ilSayi: 2, ilSinir: 7 });
    expect(h).toContain("Yapı market · cam, pencere, çelik, parça");
    expect(h).toContain("Bakkal · gündelik mallar");
    expect(turEtiketi("yapi_market")).toBe("Yapı market · cam, pencere, çelik, parça");
    expect(turAdi("yapi_market")).toBe("Yapı market");
    expect(turAdi("bakkal")).toBe("Bakkal");
    expect(h).toContain("Dükkân 2 hücre kaplar. Sahip olduğun boş bir hücreyi seç.");
    expect(h).toContain("Bu ilçede dükkânın: 1 / 3");
    expect(h).toContain("Bu ilde dükkânın: 2 / 7");
    expect(h).not.toMatch(/\{[a-z_]+\}/);
  });

  it("G8 yoksa yapı market kartı yok", () => {
    const h = turSecimiHtml({ hucre: 1, secili: null, turler: ["bakkal", "firin", "sarkuteri", "sekerci"], ilceSayi: 0, ilceSinir: 2, ilSayi: 0, ilSinir: 6 });
    expect(h).not.toContain(`data-tur="yapi_market"`);
  });
});

describe("D-3 maliyet satırları", () => {
  const temel = { tur: "bakkal" as const, hucre: 1, esZamanliInsaat: 2, durum: "uygun" as const, arsaMili: 0, dukkanMili: 12_000_000, celikAdet: 8, parcaAdet: 2, sureSaat: 1.2, toplamMili: 12_000_001, hazineMili: 50_000_000, indirim: { n: 5, yuzde: "%30" } };

  it("etiket/değer satırları, bedel yukarı yuvarlı, hazine aşağı; birincil 'Dükkânı kur'", () => {
    const h = maliyetSatirlariHtml(temel);
    expect(h).toContain(`data-durum="uygun"`);
    expect(h).toContain("<b>Bakkal · 1 hücre</b>");
    expect(h).toContain("<dt>Arsa</dt><dd>kendi arsan: 0\u00a0₺</dd>");
    expect(h).toContain("<dt>Dükkân</dt><dd>12.000\u00a0₺</dd>");
    expect(h).toContain("<dt>Toplam</dt><dd>12.001\u00a0₺</dd>");
    expect(h).toContain("<dt>Süre</dt><dd>1 sa 12 dk</dd>");
    expect(h).toContain("Kalan 5 yapında %30 indirim var.");
    expect(h).toContain(`<button type="button" class="birincil" data-yk="onayla">Dükkânı kur</button>`);
    expect(h).toContain(`class="dk-tahmin" hidden`);
  });

  it("pencere: yeterse durum 'yeter'; eksikse sayılarla ve Pazar'dan al, hazine yetmiyorsa kapalı birincil", () => {
    const yeter = maliyetSatirlariHtml({ ...temel, pencere: { gereken: 3, var: 5, tutarMili: 900_000 } });
    expect(yeter).toContain(`<dd class="dk-stok" data-durum="yeter">3 · depondaki pencere yetiyor</dd>`);
    const eksik = maliyetSatirlariHtml({ ...temel, durum: "stok-eksik", pencere: { gereken: 3, var: 1, tutarMili: 900_000 } });
    expect(eksik).toContain(`data-durum="eksik">Pencere 3: stokta 1. Pazar&#39;dan alabilirsin (yaklaşık 900\u00a0₺).`);
    expect(eksik).toContain(`data-eylem="pazardan-al"`);
    expect(eksik).toContain(`data-yk="onayla" aria-disabled="true"`);
    const az = maliyetSatirlariHtml({ ...temel, durum: "hazine-yetmiyor" });
    expect(az).toContain(`role="status">Hazinen bu bedeli karşılamıyor (gereken 12.001\u00a0₺, hazine 50.000\u00a0₺).`);
    expect(az).toContain(`data-yk="onayla" aria-disabled="true"`);
  });

  it("G8 açıkken eksik pencere 'üretebilirsin' metniyle (pencere_yok_g8); kapalıyken eski metin", () => {
    const eksik = { ...temel, durum: "stok-eksik" as const, pencere: { gereken: 3, var: 1, tutarMili: 900_000 } };
    expect(maliyetSatirlariHtml({ ...eksik, g8Acik: true })).toContain("Pencere 3: stokta 1. Pazar&#39;dan alabilir ya da üretebilirsin (yaklaşık 900\u00a0₺).");
    expect(maliyetSatirlariHtml(eksik)).toContain("Pazar&#39;dan alabilirsin (yaklaşık 900\u00a0₺).");
    expect(maliyetSatirlariHtml({ ...eksik, g8Acik: true })).not.toMatch(/\{[a-z_]+\}/);
    // yeterliyse G8 durumundan bağımsız aynı metin
    expect(maliyetSatirlariHtml({ ...temel, g8Acik: true, pencere: { gereken: 3, var: 5, tutarMili: 900_000 } })).toContain("depondaki pencere yetiyor");
  });

  it("yatırım tahmini veri varsa görünür (kırsal gün, genel süre); ret ayrı satırda", () => {
    expect(maliyetSatirlariHtml({ ...temel, yatirim: { gun: 9 } })).toContain("kendini yaklaşık 9 günde öder");
    const g = maliyetSatirlariHtml({ ...temel, yatirim: { saat: 30 } });
    expect(g).toContain("kendini yaklaşık 30 sa içinde öder");
    expect(g).not.toContain(" hidden");
    expect(maliyetSatirlariHtml({ ...temel, durum: "ret", hata: "Hazinede yeterli para yok (gereken 1 ₺)." })).toContain(`<p class="dk-hata" role="alert">`);
  });
});

describe("D-4 inşa etiketi", () => {
  it("aşama ve kalan süre", () => {
    expect(insaatEtiketi("İskele", 0.5)).toBe("Dükkân · iskele · 30 dk");
    expect(insaatEtiketi("Gövde", 2)).toBe("Dükkân · gövde · 2 sa");
  });
  it("süre biçimleri", () => {
    expect(saatDakika(3 + 20 / 60)).toBe("3 sa 20 dk");
    expect(saatDakika(0.001)).toBe("1 dk");
    expect(saatDakika(2)).toBe("2 sa");
    expect(dakikaSaniye(291_000)).toBe("4:51");
  });
});

describe("D-5 raf", () => {
  it("yuva durumu önceliği: gönderiyor > stoksuz > kampanya bitti > kasa dolu > karşılanmıyor > sağlıklı", () => {
    const d = { kasaPpm: 400_000, karsilanmaPpm: 1_000_000 };
    expect(yuvaDurumu(d, yuva({ mal: null }))).toBe("bos");
    expect(yuvaDurumu(d, yuva())).toBe("dolu-saglikli");
    expect(yuvaDurumu(d, yuva({ stokVar: false }), true)).toBe("gonderiliyor");
    expect(yuvaDurumu(d, yuva(), false, true)).toBe("yukleniyor");
    expect(yuvaDurumu(d, yuva({ stokVar: false }))).toBe("dolu-stoksuz");
    expect(yuvaDurumu(d, yuva({ kademe: 0, etkinKademe: 2 }))).toBe("dolu-kampanya-bitti");
    expect(yuvaDurumu({ ...d, kasaPpm: 1_000_000 }, yuva())).toBe("dolu-kasa-dolu");
    expect(yuvaDurumu({ ...d, karsilanmaPpm: 500_000 }, yuva())).toBe("dolu-karsilanmiyor");
  });

  it("4 yuva: öznitelikler, kısa neden yuvada, tam cümle title/aria-describedby", () => {
    const d = dukkan({ yuvalar: [yuva(), yuva({ mal: "ekmek", stokVar: false }), yuva({ mal: "tahil", kademe: 0, etkinKademe: 2 }), yuva({ mal: null })] });
    const h = rafHtml(d, { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(h.match(/class="dk-yuva"/g)?.length).toBe(4);
    expect(h).toContain(`data-yuva="0" data-durum="dolu-saglikli" data-mal="gida" data-bekleme="0"`);
    expect(h).toContain("Gıda · Normal · 2,50 ₺".replace("2,50 ₺", "3\u00a0₺") /* para() tam lira yukarı */);
    expect(h).toContain("≈\u00a012 birim/sa");
    expect(h).toContain(`data-yuva="1" data-durum="dolu-stoksuz"`);
    expect(h).toContain(`<span class="dk-yuva-neden">stoğun yok</span>`);
    expect(h).toContain(`title="Ekmek: stoğun yok; stok gelince satış başlar"`);
    expect(h).toContain(`<span class="dk-yuva-neden">kampanya bitti</span>`);
    expect(h).toContain(`title="Kampanya bitti; fiyat normale döndü."`);
    expect(h).toContain(`data-yuva="3" data-durum="bos" data-mal="" data-bekleme="0"`);
    expect(h).toContain("Boş: mal koy");
    expect(h).toContain(`<p class="dk-neden" data-neden=""></p>`);
    expect(h).not.toContain("Rafın boş");
  });

  it("dükkân düzeyi neden satırda; boş rafta uyarı; gönderirken aria-busy ve yuvalar aria-disabled; yükleniyor", () => {
    const kasa = rafHtml(dukkan({ kasaPpm: 1_000_000 }), { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(kasa).toContain(`data-neden="kasa_dolu">Kasa dolu: satış kasa sınırında.`);
    const karsilanmiyor = rafHtml(dukkan({ karsilanmaPpm: 400_000 }), { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(karsilanmiyor).toContain("Stoğun talebi karşılamıyor; satış düşüyor.");
    const bos = rafHtml(dukkan({ yuvalar: [yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null })] }), { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(bos).toContain("Rafın boş: bir yuvaya mal koyunca satış başlar.");
    expect(bos).toContain(`data-neden=""`);
    const g = rafHtml(dukkan(), { malAdi, simdi: 0, kasaBirimSa: 90, gonderiyor: true });
    expect(g).toContain(`class="dk-raf" aria-busy="true"`);
    expect(g.match(/aria-disabled="true"/g)?.length).toBe(4);
    expect(rafHtml(dukkan(), { malAdi, simdi: 0, kasaBirimSa: 90, yukleniyor: true })).toContain(`<div class="dk-yukleniyor">Rafın yükleniyor.</div>`);
  });

  it("bekleme: yuvada KISA süre ve data-bekleme=1", () => {
    const h = rafHtml(dukkan({ yuvalar: [yuva({ beklemeSaat: 3 + 20 / 60 }), yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null })] }), { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(h).toContain(`data-bekleme="1"`);
    expect(h).toContain("değişim: 3 sa 20 dk sonra");
  });

  it("seçici: stoklu mallar seçilebilir, stoksuzlar aria-disabled; hiç stok yoksa yönlendirme ve 'Yapı kur'", () => {
    const h = seciciHtml(
      [
        { mal: "gida", stokMili: 12_000, fiyatMili: 2_000 },
        { mal: "ekmek", stokMili: 0, fiyatMili: 1_000 },
      ],
      malAdi,
      1,
      90,
    );
    expect(h).toContain(`role="dialog"`);
    expect(h).toContain("Gıda · stokta 12 · 2\u00a0₺");
    expect(h).toMatch(/data-mal="ekmek" aria-disabled="true"/);
    expect(h).toContain("stoğun yok; stok gelince satış başlar");
    expect(h).not.toContain("Rafa koyacak malın yok.");
    const yok = seciciHtml([{ mal: "ekmek", stokMili: 0, fiyatMili: 1_000 }], malAdi, 0, 90);
    expect(yok).toContain("Rafa koyacak malın yok. Bu dükkânın sattığı bir malı üret ya da Pazar&#39;dan al.");
    expect(yok).toContain(`<button type="button" class="mini-dugme" data-eylem="yapi-kur">Yapı kur</button>`);
    expect(seciciHtml([], malAdi, 0, 90)).toContain("Bu dükkânda koyabileceğin başka mal kalmadı.");
  });
});

describe("D-6 kademe ve kampanya", () => {
  const kamp = { bitis: 0, kalanSaat: 4, kalanGun: 3 };

  it("4 kademe, seçili aria-pressed; kampanya kapalıysa ilk düğme yok ve data-sutun=3", () => {
    const h = kademeHtml(yuva(), { malAdi, kampanyaAcik: true, kampanya: kamp, simdi: 0 });
    expect(h).toContain(`class="segment" role="group" aria-label="Gıda" data-durum="serbest">`);
    expect([...h.matchAll(/data-kademe="(\d)" aria-pressed="(\w+)"/g)].map((m) => `${m[1]}:${m[2]}`)).toEqual(["0:false", "1:false", "2:true", "3:false"]);
    expect(h).toContain("Normal fiyat, çoğu zaman en iyi dengedir.");
    expect(h).toContain("3\u00a0₺ · ≈\u00a012 birim/sa · net ≈\u00a0+20\u00a0₺/sa");
    const kapali = kademeHtml(yuva(), { malAdi, kampanyaAcik: false, kampanya: kamp, simdi: 0 });
    expect(kapali).toContain(`data-sutun="3"`);
    expect(kapali).not.toContain(`data-kademe="0"`);
    expect(kapali).not.toContain("dk-kampanya");
  });

  it("yüksek kademe uyarısı; bekleme sayacı (saat ve dakika, kısa) ve düğmeler aria-disabled", () => {
    const h = kademeHtml(yuva({ kademe: 3, etkinKademe: 3, beklemeSaat: 2.5 }), { malAdi, kampanyaAcik: true, kampanya: kamp, simdi: 0 });
    expect(h).toContain(DUKKAN_METIN["dukkan.D6.yuksek_uyari"]);
    expect(h).toContain(`data-durum="bekleme"`);
    expect(h).toContain("Fiyatı en erken 2 saat 30 dk sonra değiştirebilirsin.");
    expect(h).toContain(`data-kademe="2" aria-pressed="false" aria-disabled="true"`);
    expect(kademeHtml(yuva({ beklemeSaat: 0.4 }), { malAdi, kampanyaAcik: true, kampanya: kamp, simdi: 0 })).toContain("Fiyatı en erken 24 dk sonra değiştirebilirsin.");
  });

  it("kampanya durumları: hak var, sürüyor, bugün bitti, hafta bitti", () => {
    const hak = kademeHtml(yuva(), { malAdi, kampanyaAcik: true, kampanya: kamp, simdi: 0 });
    expect(hak).toContain("Bugün en çok 4 saat; en geç gün sonunda biter. Bu hafta 3 gün hakkın var.");
    expect(hak).toContain(`data-eylem="kampanya">Kampanya başlat`);
    expect(hak).not.toContain(`data-eylem="kampanya" aria-disabled`);
    const suruyor = kademeHtml(yuva(), { malAdi, kampanyaAcik: true, kampanya: { bitis: 3 * SAAT + 600_000, kalanSaat: 4, kalanGun: 3 }, simdi: 0 });
    expect(suruyor).toContain(`data-durum="kampanya-suruyor"`);
    expect(suruyor).toContain("Kampanya sürüyor: 3 saat 10 dk kaldı");
    expect(suruyor).toContain(`data-eylem="kampanya" aria-disabled="true"`);
    expect(kademeHtml(yuva(), { malAdi, kampanyaAcik: true, kampanya: { bitis: 0, kalanSaat: 0, kalanGun: 3 }, simdi: 0 })).toContain(`data-durum="kampanya-hak-yok-gun">Bugün kampanya hakkın bitti.`);
    expect(kademeHtml(yuva(), { malAdi, kampanyaAcik: true, kampanya: { bitis: 0, kalanSaat: 4, kalanGun: 0 }, simdi: 0 })).toContain(`data-durum="kampanya-hak-yok-hafta">Bu hafta kampanya günlerin bitti.`);
  });

  it("ipuçları: kademe ipucu her zaman; kasa dolu ipucu ≥ %95; esnaf payı ipucu ilçede ≥ 2 dükkân ve payı parametreden", () => {
    const temel = { malAdi, kampanyaAcik: true, kampanya: kamp, simdi: 0 };
    const sade = kademeHtml(yuva(), temel);
    expect(sade).toContain("Üst kademede satış biraz azalır, birim başına gelirin artar.");
    expect(sade).not.toContain(DUKKAN_METIN["dukkan.D6.ipucu_kasa_dolu"]);
    expect(sade).not.toContain("esnafına gider");
    expect(kademeHtml(yuva(), { ...temel, kasaPpm: 949_999 })).not.toContain(DUKKAN_METIN["dukkan.D6.ipucu_kasa_dolu"]);
    expect(kademeHtml(yuva(), { ...temel, kasaPpm: 950_000 })).toContain(DUKKAN_METIN["dukkan.D6.ipucu_kasa_dolu"]);
    const e = kademeHtml(yuva(), { ...temel, ilceDukkanSayisi: 2, esnafPayiYuzde: "%20" });
    expect(e).toContain("Her ilçede talebin en az %20 kadarı ilçenin kendi esnafına gider");
    expect(kademeHtml(yuva(), { ...temel, ilceDukkanSayisi: 1, esnafPayiYuzde: "%20" })).not.toContain("esnafına gider");
    expect(kademeHtml(yuva(), { ...temel, ilceDukkanSayisi: 3 })).not.toContain("esnafına gider");
  });

  it("boş yuva için kademe yok; ret ayrı satırda", () => {
    expect(kademeHtml(yuva({ mal: null }), { malAdi, kampanyaAcik: true, kampanya: kamp, simdi: 0 })).toBe("");
    expect(kademeHtml(yuva(), { malAdi, kampanyaAcik: true, kampanya: kamp, simdi: 0, hata: "Fiyat zaten bu seviyede." })).toContain(`<p class="dk-hata" role="alert">Fiyat zaten bu seviyede.</p>`);
  });
});

describe("D-8 özet ve menü", () => {
  it("özet: dört AYRI satır (satış birim, gelir, gider, net), toplam ayrı kesin satır, kasa dolu", () => {
    const h = ozetHtml(dukkan({ kasaPpm: 1_000_000 }), 600_000);
    expect(h.match(/class="dk-ozet-satir"/g)?.length).toBe(4);
    expect(h).toContain("Tahmini satış ≈\u00a012 birim/sa"); // birim (Σ yuva isteği), para değil
    expect(h).toContain("Gelir ≈\u00a0640\u00a0₺/sa");
    expect(h).toContain("Gider 120\u00a0₺/sa");
    expect(h).toContain("Net ≈\u00a0+520\u00a0₺/sa");
    expect(h).toContain(`<p class="dk-ozet-toplam">Dükkânlardan toplam gelir: 600\u00a0₺/sa</p>`);
    expect(h).toContain(`<p class="dk-kasa" data-yuzde="100">Kasa %100 dolu: satış kasa sınırında</p>`);
    expect(ozetHtml(dukkan(), null)).not.toContain("dk-ozet-toplam");
    expect(ozetHtml(dukkan(), null)).not.toContain("dk-kasa");
  });

  it("satış yoksa 'Henüz satış yok.'; yükleniyor", () => {
    expect(ozetHtml(dukkan({ gelirMiliSa: 0 }), null)).toContain("Henüz satış yok.");
    expect(ozetHtml(dukkan(), null, true)).toContain("Dükkânın bilgisi yükleniyor.");
  });

  it("menü: aria-haspopup/expanded/label, açıkta 'Dükkânı kaldır', inşada 'İptal et (iade %50)'", () => {
    const kapali = dukkanMenusuHtml({ id: 7, durum: "acik" }, false, "%50");
    expect(kapali).toContain(`aria-haspopup="menu" aria-expanded="false" aria-label="Daha fazla"`);
    expect(kapali).not.toContain("role=\"menu\"");
    expect(dukkanMenusuHtml({ id: 7, durum: "acik" }, true, "%50")).toContain(`role="menuitem" class="eylem" data-eylem="dukkan-kaldir" data-dukkan="7">Dükkânı kaldır`);
    expect(dukkanMenusuHtml({ id: 8, durum: "insaat" }, true, "%50")).toContain(`data-eylem="insaat-iptal" data-dukkan="8">İptal et (iade %50)`);
  });

  it("onay: alertdialog, Vazgeç varsayılan odak, tehlikeli onay .tehlike; inşada iptal metni", () => {
    const h = kaldirOnayHtml({ id: 7, durum: "acik" }, "%50");
    expect(h).toContain(`role="alertdialog" aria-modal="true" aria-labelledby="dk-onay-metin"`);
    expect(h).toContain(`data-eylem="onay-vazgec" data-varsayilan-odak="1">Vazgeç`);
    expect(h).toContain(`class="tehlike" data-eylem="dukkan-kaldir-onayla" data-dukkan="7">Dükkânı kaldır`);
    expect(h).toContain("Arsan, depondaki mallar ve markan sende kalır.");
    const i = kaldirOnayHtml({ id: 8, durum: "insaat" }, "%50");
    expect(i).toContain("İnşaatı iptal edersen ödediğin paranın ve malzemenin %50 kadarı geri gelir.");
    expect(i).toContain(`data-eylem="insaat-iptal-onayla"`);
  });
});

describe("dukkan-duzelt: sabit sayı yok, D0 kartında Defter adımı, Dikkat yol göstermesi", () => {
  const temel = { tur: "bakkal" as const, hucre: 1, durum: "insaat-siniri" as const, arsaMili: 0, dukkanMili: 1, celikAdet: 1, parcaAdet: 1, sureSaat: 1, toplamMili: 1, hazineMili: 9 };

  it("inşaat sınırı uyarısı parametreden ('en çok 2'), sabit 3 değil", () => {
    expect(maliyetSatirlariHtml({ ...temel, esZamanliInsaat: 2 })).toContain("Aynı anda en çok 2 inşaat sürebilir; birinin bitmesini bekle.");
    expect(maliyetSatirlariHtml({ ...temel, esZamanliInsaat: 4 })).toContain("Aynı anda en çok 4 inşaat");
  });

  it("D0 kartı Defter'in sıradaki adımını soluk satır olarak taşır; Defter adımı yoksa satır yok", () => {
    const h = ustKartHtml("dukkan", { metin: "Çiftliğinin tahılını sat.", odulHtml: "" });
    expect(h).toContain(`data-tur="dukkan"`);
    expect(h).toContain(`<p class="dk-oneri-defter-satir" data-alan="oneri-defter">Sıradaki adım: Çiftliğinin tahılını sat.</p>`);
    expect(h).not.toContain(`data-tur="defter"`);
    expect(ustKartHtml("dukkan", null)).not.toContain("oneri-defter");
    expect(oneriKartiHtml()).not.toContain("oneri-defter");
  });

  it("Dikkat: inşadaki dükkân stoksuzken D4.dikkat_stoksuz; stok varsa sessiz", () => {
    const g = gorunum({ dukkanlar: [dukkan({ durum: "insaat", bitis: 3_600_000 })] });
    expect(dukkanDikkatMaddeleri(g, malAdi, () => false).map((x) => x.baslik)).toEqual(["Dükkân hazır olunca rafına koyacak bir mal gerekecek."]);
    expect(dukkanDikkatMaddeleri(g, malAdi, () => true)).toEqual([]);
    expect(dukkanDikkatMaddeleri(g, malAdi, () => false)[0]?.tur).toBe("eksik");
  });

  it("Dikkat: açık dükkânın rafı TAMAMEN boşsa stok varken raf önerisi, yoksa boş raf uyarısı; 'başka mal var' yalnız en az bir yuva doluyken", () => {
    const bos = dukkan({ yuvalar: [yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null })] });
    const g = gorunum({ dukkanlar: [bos] });
    expect(dukkanDikkatMaddeleri(g, malAdi, (m) => m === "gida").map((x) => x.baslik)).toEqual(["Rafına mal koy."]);
    expect(dukkanDikkatMaddeleri(g, malAdi, () => false).map((x) => x.baslik)).toEqual(["Rafın boş: bir yuvaya mal koyunca satış başlar."]);
    expect(dukkanDikkatMaddeleri(g, malAdi, (m) => m === "gida").some((x) => x.baslik.includes("başka mal"))).toBe(false);
    const yarim = gorunum({ dukkanlar: [dukkan()] });
    expect(dukkanDikkatMaddeleri(yarim, malAdi, (m) => m === "ekmek").map((x) => x.baslik)).toEqual(["Rafına koyabileceğin başka mal var"]);
  });
});

describe("Dikkat maddeleri", () => {
  it("stoğu biten mal, kasa dolu, kampanya bitti, rafa konabilecek başka mal; inşadaki dükkân ve kapalı dünya sessiz", () => {
    const d = dukkan({ kasaPpm: 1_000_000, yuvalar: [yuva({ stokVar: false }), yuva({ mal: "tahil", kademe: 0, etkinKademe: 2 }), yuva({ mal: null }), yuva({ mal: null })] });
    const l = dukkanDikkatMaddeleri(gorunum({ dukkanlar: [d, dukkan({ id: 9, durum: "insaat" })] }), malAdi, (m) => m === "ekmek");
    expect(l.map((x) => x.baslik)).toEqual(["Rafına koyabileceğin başka mal var", "Gıda stoğun bitti; yuvada satılmıyor", "Kasa dolu: fiyatı yükseltmeyi düşünebilirsin", "Kampanya bitti"]);
    expect(l.every((x) => x.ilce === "kadikoy")).toBe(true);
    expect(dukkanDikkatMaddeleri(gorunum({ kapali: true, dukkanlar: [d] }), malAdi)).toEqual([]);
    expect(dukkanDikkatMaddeleri(null, malAdi)).toEqual([]);
    // rafa konabilir mal yoksa ya da raf doluysa "başka mal var" çıkmaz
    expect(dukkanDikkatMaddeleri(gorunum({ dukkanlar: [dukkan()] }), malAdi, () => false)).toEqual([]);
  });
});

describe("dukkan-duzelt 5-9", () => {
  const bosRaf = (ek: Partial<DukkanKaydi> = {}): DukkanKaydi => dukkan({ yuvalar: [yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null })], ...ek });

  it("5) rafı boş açık dükkân D1'de 'rafı boş' der (net yok); dolu rafta net; D8'de satis_yok yerine boş raf uyarısı", () => {
    const g = gorunum({ dukkanlar: [bosRaf({ gelirMiliSa: 0, giderMiliSa: 132_000 }), dukkan({ id: 8 })] });
    const h = dukkanBolumuHtml(g, { ilceAdi, simdi: 0 });
    expect(h).toContain("<b>Bakkal · rafı boş</b>");
    expect(h.split(`data-dukkan="7"`)[1]?.split("</li>")[0]).not.toContain("net");
    expect(h).toContain("net ≈\u00a0+520\u00a0₺/sa");
    const o = ozetHtml(bosRaf({ gelirMiliSa: 0, giderMiliSa: 132_000 }), null);
    expect(o).toContain("Rafın boş: bir yuvaya mal koyunca satış başlar.");
    expect(o).not.toContain("Henüz satış yok");
    expect(ozetHtml(dukkan({ gelirMiliSa: 0 }), null)).toContain("Henüz satış yok.");
  });

  it("6) dolu yuvaların hepsi stoksuzsa tek satır ve Yapı kur mini düğmesi; biri stoklu ya da raf boşsa yok", () => {
    const hepsi = dukkan({ yuvalar: [yuva({ stokVar: false }), yuva({ mal: "ekmek", stokVar: false }), yuva({ mal: null }), yuva({ mal: null })] });
    const h = rafHtml(hepsi, { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(h).toContain(`data-neden="hepsi_stoksuz">Rafındaki mallar bitti. Üret ya da Pazar&#39;dan al.</p>`);
    expect(h).toContain(`<button type="button" class="mini-dugme" data-eylem="yapi-kur">Yapı kur</button>`);
    const karma = rafHtml(dukkan({ yuvalar: [yuva({ stokVar: false }), yuva(), yuva({ mal: null }), yuva({ mal: null })] }), { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(karma).not.toContain("hepsi_stoksuz");
    expect(rafHtml(bosRaf(), { malAdi, simdi: 0, kasaBirimSa: 90 })).not.toContain("hepsi_stoksuz");
  });

  it("7) seçicide stoklu mallar önce (stok çoktan aza), stoksuzlar sonra", () => {
    const h = seciciHtml(
      [
        { mal: "ekmek", stokMili: 0, fiyatMili: 1_000 },
        { mal: "tahil", stokMili: 3_000, fiyatMili: 1_000 },
        { mal: "gida", stokMili: 12_000, fiyatMili: 2_000 },
      ],
      malAdi,
      0,
      90,
    );
    const sira = [...h.matchAll(/data-mal="(\w+)"/g)].map((x) => x[1]);
    expect(sira).toEqual(["gida", "tahil", "ekmek"]);
  });

  it("8) B7 Defter kartına 'Dükkân kur' yalnız kur eylemi bağlıyken ve adım ilk_dukkan iken; Atla kalır", () => {
    const adim = { metin: "Kendi tezgâhın: bir dükkân kur ve oradan ilk satışını yap.", odulHtml: "", kavram: "ilk_dukkan" };
    const var1 = ustKartHtml("defter", adim, true);
    expect(var1).toContain(`<button type="button" class="eylem" data-eylem="dukkan-kur">Dükkân kur</button>`);
    expect(var1).toContain(`data-eylem="defter-atla"`);
    expect(var1.match(/class="birincil"/g)).toBeNull();
    expect(ustKartHtml("defter", adim, false)).not.toContain("dukkan-kur");
    expect(ustKartHtml("defter", { ...adim, kavram: "ilk_satis" }, true)).not.toContain("dukkan-kur");
    expect(defterKartiHtml("x", "")).not.toContain("dukkan-kur");
  });

  it("9) boş yuvada da geri sayım: 'mal koy' soluk ve aria-disabled; tüm yuvalar bekliyorsa boş raf süreyi söyler", () => {
    const bekleyen = bosRaf({ yuvalar: [yuva({ mal: null, beklemeSaat: 3 + 20 / 60 }), yuva({ mal: null }), yuva({ mal: null }), yuva({ mal: null })] });
    const h = rafHtml(bekleyen, { malAdi, simdi: 0, kasaBirimSa: 90 });
    expect(h).toContain(`data-yuva="0" data-durum="bos" data-mal="" data-bekleme="1" aria-disabled="true"`);
    expect(h).toContain("değişim: 3 sa 20 dk sonra");
    expect(h).toContain(`data-yuva="1" data-durum="bos" data-mal="" data-bekleme="0"><`);
    expect(h).toContain("Rafın boş: bir yuvaya mal koyunca satış başlar."); // bir yuva serbest: normal yönlendirme
    const hepsi = bosRaf({ yuvalar: [yuva({ mal: null, beklemeSaat: 5 }), yuva({ mal: null, beklemeSaat: 2.5 }), yuva({ mal: null, beklemeSaat: 3 }), yuva({ mal: null, beklemeSaat: 4 })] });
    expect(rafHtml(hepsi, { malAdi, simdi: 0, kasaBirimSa: 90 })).toContain("Rafın boş. En erken 2 sa 30 dk sonra bir yuvaya mal koyabilirsin.");
  });

  it("DUK-18 yuva dili: {sure} doldurulur, ham yer tutucu ekrana çıkmaz; bilinmeyen kod null", () => {
    expect(retMetni("DUK-18", { beklemeSaat: 3 + 20 / 60 })).toBe("Bu yuvaya en erken 3 sa 20 dk sonra mal koyabilirsin.");
    for (const kod of ["DUK-18", "DUK-06", "DUK-07", "DUK-22", "DUK-21", "DUK-00", "MRK-12"]) expect(retMetni(kod, { beklemeSaat: 2, n: 4 }), kod).not.toMatch(/\{[a-z_]+\}/);
    expect(retMetni("YOK-99")).toBeNull();
  });

  it("Yuvayı boşalt: yuvada yalnız düğme (uyarı sürekli görünmez); onay adımında uyarı onay düğmesinin üstünde", () => {
    const kamp = { bitis: 0, kalanSaat: 4, kalanGun: 3 };
    const h = kademeHtml(yuva(), { malAdi, kampanyaAcik: false, kampanya: kamp, simdi: 0 });
    expect(h).toContain(`data-eylem="yuva-bosalt">Yuvayı boşalt</button>`);
    expect(h).not.toContain("Boşaltırsan");
    expect(kademeHtml(yuva({ mal: null }), { malAdi, kampanyaAcik: false, kampanya: kamp, simdi: 0 })).toBe("");
    expect(kademeHtml(yuva(), { malAdi, kampanyaAcik: false, kampanya: kamp, simdi: 0, gonderiyor: true })).toContain(`data-eylem="yuva-bosalt" aria-disabled="true"`);
  });

  it("boşaltma beklemesi üç durum: fiyatT 0 → tam pencere; pencere sürüyor → kalan; pencere dolmuş → 0 ve uyarı gizli", () => {
    const P = 6; // fiyatDegisimEnAzSaat (parametreden)
    expect(bosaltBeklemesi(0, 10 * SAAT, P)).toBe(6);
    expect(bosaltBeklemesi(10 * SAAT, 12 * SAAT, P)).toBeCloseTo(4, 9);
    expect(bosaltBeklemesi(10 * SAAT, 16 * SAAT, P)).toBe(0);
    expect(bosaltBeklemesi(10 * SAAT, 20 * SAAT, P)).toBe(0);

    const onay = (fiyatT: number, simdi: number): string => bosaltOnayHtml({ fiyatT }, { simdi, pencereSaat: P, yuva: 2 });
    const a = onay(0, 10 * SAAT);
    expect(a).toContain(`role="alertdialog"`);
    expect(a).toContain("Boşaltırsan bu yuvaya en erken 6 sa sonra mal koyabilirsin.");
    expect(a.indexOf("Boşaltırsan")).toBeLessThan(a.indexOf(`data-eylem="yuva-bosalt-onayla"`)); // uyarı onay düğmesinin üstünde
    expect(a).toContain(`data-eylem="onay-vazgec" data-varsayilan-odak="1">Vazgeç`);
    expect(onay(10 * SAAT, 12 * SAAT)).toContain("en erken 4 sa sonra");
    const dolmus = onay(10 * SAAT, 17 * SAAT);
    expect(dolmus).not.toContain("Boşaltırsan");
    expect(dolmus).toContain(`data-eylem="yuva-bosalt-onayla" data-yuva="2">Yuvayı boşalt</button>`);
    expect(a).not.toMatch(/\{[a-z_]+\}/);
  });
});

describe("D-7 marka formu", () => {
  const f = (k: Partial<Parameters<typeof markaFormuHtml>[0]> = {}): string => markaFormuHtml({ ad: "", simge: 0, renk: 0, ...k });
  it("sunucu ret metni (anahtarsız) hata satırında görünür ve alan geçersiz işaretlenir", () => {
    const h = f({ ad: "yasak", retMetin: "Bu ad kullanılamaz; başka bir ad dene." });
    expect(h).toContain('<p id="dk-marka-hata" class="dk-hata" role="alert">Bu ad kullanılamaz; başka bir ad dene.</p>');
    expect(h).toContain('aria-invalid="true"');
    expect(h).toContain('data-durum="hata"');
  });


  it("iskelet: dialog, alan öznitelikleri, sayaç, açıklama ve uyarı, tek birincil Kaydet, ikincil Şimdilik markasız", () => {
    const h = f({ ad: "Bereket Bakkal" });
    expect(h).toContain(`<div class="dk-marka" role="dialog" aria-modal="true" aria-labelledby="dk-marka-baslik" data-durum="bos">`);
    expect(h).toContain(`<input id="dk-marka-ad" class="dk-girdi" type="text" name="marka" maxlength="24" autocapitalize="off"`);
    expect(h).toContain(`value="Bereket Bakkal"`);
    expect(h).toContain(`data-alan="marka-sayac">14 / 24`);
    expect(h).toContain("Marka yalnızca tabeladır; satışı ya da fiyatı etkilemez.");
    expect(h).toContain("Büyük harf yazabilirsin; ad küçük harfle kaydedilir.");
    expect(h).toContain("Marka adın dünyadaki herkese görünür ve kalıcıdır.");
    expect(h).toContain(`aria-live="polite">Tabelada böyle görünür: bereket bakkal</p>`);
    expect(h.match(/class="birincil"/g)?.length).toBe(1);
    expect(h).toContain(`data-eylem="marka-kaydet">Kaydet</button>`);
    expect(h).toContain(`data-eylem="marka-yok">Şimdilik markasız</button>`);
  });

  it("boş ad: tabela yer tutucusu önizlemede; yazarken hata yok, gönderirken 'Marka adı yazılmalı.'", () => {
    expect(f()).toContain("Tabelada böyle görünür: adsiz marka");
    expect(f()).toContain(`<p id="dk-marka-hata" class="dk-hata" role="alert"></p>`);
    expect(f({ gonder: true })).toContain(`role="alert">Marka adı yazılmalı.</p>`);
  });

  it("canlı hata (izinsiz karakter, çift tırnak, art arda boşluk) ve gönderirken tüm kural; geçersizde önizleme yok", () => {
    const k = f({ ad: "ab@" });
    expect(k).toContain(`aria-invalid="true"`);
    expect(k).toContain("Marka adında yalnız harf, rakam, boşluk, nokta, kesme işareti, tire ve &amp; kullanılabilir.");
    expect(k).toContain(`data-alan="marka-onizleme" aria-live="polite"></p>`);
    expect(f({ ad: 'ab"' })).toContain("Çift tırnak ya da uzun tire yerine");
    expect(f({ ad: "a  b" })).toContain("Art arda boşluk olamaz.");
    expect(f({ ad: "a" })).toContain(`role="alert"></p>`);
    expect(f({ ad: "a", gonder: true })).toContain("Marka adı 2 ile 24 karakter arasında olmalı.");
    expect(f({ ad: "a", gonder: true })).not.toMatch(/\{[a-z_]+\}/);
    expect(f({ ad: "ab ", gonder: true })).toContain("Marka adı boşlukla başlayıp bitemez.");
    expect(f({ ad: "12", gonder: true })).toContain("Marka adında en az bir harf olmalı.");
  });

  it("sunucu reddi (ret anahtarı) ve gönderiyor durumu", () => {
    expect(f({ ad: "ali", ret: "dukkan.D7.ad_yasakli" })).toContain("Bu ad kullanılamaz; başka bir ad dene.");
    const g = f({ ad: "ali", gonderiyor: true });
    expect(g).toContain(`data-durum="gonderiyor"`);
    expect(g).toContain(`data-eylem="marka-kaydet" disabled data-durum="yukleniyor"`);
  });

  it("palet: iki radiogroup, 8 simge ve 12 renk; seçili öğe tabindex=0 (roving), diğerleri -1; etiketler metin tablosundan", () => {
    const h = f({ simge: 2, renk: 11 });
    expect(h.match(/role="radiogroup"/g)?.length).toBe(2);
    expect(h).toContain(`aria-label="Simge"`);
    expect(h).toContain(`aria-label="Renk"`);
    expect(h.match(/class="dk-simge"/g)?.length).toBe(8);
    expect(h.match(/class="dk-renk"/g)?.length).toBe(12);
    expect(h).toContain(`aria-checked="true" tabindex="0" data-simge="2" aria-label="mücevher"`);
    expect(h).toContain(`aria-checked="true" tabindex="0" data-renk="11" style="--renk:var(--oyuncu-11)" aria-label="nar çiçeği"`);
    expect(h.match(/tabindex="0"/g)?.length).toBe(2); // grup başına tek Tab durağı
    expect(h.match(/tabindex="-1"/g)?.length).toBe(18);
    expect(h).toContain(`data-simge="0" aria-label="yaprak"`);
    expect(h).toContain(`data-renk="0" style="--renk:var(--oyuncu-0)" aria-label="gül kurusu"`);
    // sınır dışı indeks modülle döner
    expect(f({ simge: 9, renk: 13 })).toContain(`aria-checked="true" tabindex="0" data-simge="1"`);
  });
});
