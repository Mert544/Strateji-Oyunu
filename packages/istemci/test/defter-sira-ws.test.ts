/**
 * Defter sırası ve "satışın yolda" GERÇEK sunucuya karşı (bellek deposu, elle saat): sunucunun `siradaki` sırası = DEFTER_GOSTERIM_SIRASI = istemcinin YEREL yolu (SahteBaglanti) sırası;
 * T-6: ihracat emri verilince `isletme().ihracatEmriVar` ve "satışın yolda" (Defter dükkânı sıraya alır), ilk satış gerçekleşince `defterAl` ilk_satis'ı kazanılana alır ve sıradakiden düşürür
 * (istemci Defter'i tazelerse bayat kalmaz); emir 0'a çekilince "yolda" kalkar.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, odulDegeri } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { DEFTER_GOSTERIM_SIRASI } from "@bolge/protokol";
import { katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import { bitisikCiftler } from "../../sunucu/test/yontem-yardimci";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { SahteBaglanti } from "../src/harita/baglanti";
import { Bit } from "../src/harita/hucre";
import { defterHtml, defterUstKarti, gosterilecekSiradaki, ilkSatisBekliyor } from "../src/harita/defter";

const ILCE = "sn_m_ova_merkez";
let ts: TestSunucusu | null = null;
const acilanlar: WsBaglanti[] = [];
afterEach(async () => {
  for (const b of acilanlar.splice(0)) b.kapat();
  await ts?.kapat();
  ts = null;
});

async function bekle(kosul: () => boolean, ms = 8000): Promise<void> {
  const son = Date.now() + ms;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("koşul zamanında sağlanmadı");
    await new Promise((c) => setTimeout(c, 10));
  }
}

function veri(): ReturnType<typeof mulkVerisi> {
  const v = mulkVerisi();
  const m = v.param.mulk!;
  m.yeniOyuncu.yurtHucre = 0;
  m.yeniOyuncu.hibe = 5_000_000_000;
  m.yeniOyuncu.indirimliYapiSayisi = 0;
  m.yeniOyuncu.ayrilmisHucrePpm = 0;
  m.yeniOyuncu.baslangicStok = { ...m.yeniOyuncu.baslangicStok, celik: 50_000_000, parca: 50_000_000, tahil: 50_000_000 };
  m.esZamanliInsaat = 10;
  return v;
}

async function oyuncu(): Promise<{ a: WsBaglanti; y: Awaited<ReturnType<TestSunucusu["baglan"]>> }> {
  ts = await testSunucusu({ veri: veri(), odul: true }); // Defter ödül dedektörü açık
  const y = await ts.baglan(SISTEM_OYUNCUSU);
  await katil(y, "ali", []);
  await y.zamanIlerlet(SAAT);
  const a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "t-ali", geriCekilmeMs: { ilk: 30, en: 100 } });
  acilanlar.push(a);
  await a.sahiplikAl(ILCE);
  await bekle(() => a.ozet() !== null);
  return { a, y };
}

/** Defter'i tazeleyerek koşul sağlanana dek bekler (dedektör saat ızgarasında ve yazar turunda çalışır). */
async function defterBekle(a: WsBaglanti, kosul: (d: NonNullable<Awaited<ReturnType<WsBaglanti["defterAl"]>>>) => boolean, ms = 8000): Promise<NonNullable<Awaited<ReturnType<WsBaglanti["defterAl"]>>>> {
  const son = Date.now() + ms;
  for (;;) {
    const d = await a.defterAl();
    if (d && kosul(d)) return d;
    if (Date.now() > son) throw new Error("defter koşulu zamanında sağlanmadı");
    await new Promise((c) => setTimeout(c, 25));
  }
}

async function sunucuKomut(anahtar: string, komut: Komut): Promise<void> {
  const r = await ts!.yazar.komutGonder("ali", "test", anahtar, komut);
  if (!r.sonuc.tamam) throw new Error(`komut başarısız (${anahtar}): ${r.sonuc.hata}`);
}

describe("Defter sırası: sunucu = yerel yol", () => {
  it("yeni oyuncuda sunucu siradaki sırası DEFTER_GOSTERIM_SIRASI'dır ve istemcinin yerel yolu (SahteBaglanti) AYNI sırayı verir; Defter listesi siradaki sırasıyla çizilir", async () => {
    const { a } = await oyuncu();
    const d = (await a.defterAl())!;
    const tablo = ts!.yazar.sim.ic.param.odul!;
    const beklenen = DEFTER_GOSTERIM_SIRASI.filter((k) => odulDegeri(ts!.yazar.sim.ic, k) !== undefined);
    expect(d.siradaki.map((s) => s.kavram)).toEqual(beklenen);
    const G = 20;
    const iz = { x0: 1000, y0: 2000, genislik: G, yukseklik: G, durum: new Uint8Array(G * G).fill(Bit.ICERIDE | (1 << 5)) };
    const yerel = await new SahteBaglanti({ izgaraAl: async () => iz, komsular: false, saat: () => 1, defterOdulleri: { tavanMili: tablo.tavanMili, kavramlar: tablo.kavramlar as never } }).defterAl();
    // Yerel yolda ilk_yapi bu örnek durumda kazanılmış sayılmaz (insaat yok): aynı kavram kümesi ve aynı sıra
    expect(yerel!.siradaki.map((s) => s.kavram)).toEqual(beklenen);
    // Defter listesi (etkin olanlar) siradaki sırasıyla: ilk_dukkan satırı ilk_isleme satırından ÖNCE
    const html = defterHtml(d, (m) => m);
    const sirali = [...html.matchAll(/data-kavram="(\w+)"/g)].map((m) => m[1]);
    expect(sirali).toEqual(d.siradaki.filter((s) => s.etkin).slice(0, 2).map((s) => s.kavram));
    expect(sirali).toContain("ilk_dukkan");
    expect(sirali).not.toContain("ilk_isleme"); // en çok iki öneri
  }, 30_000);
});

describe("T-6: ihracat emri, 'satışın yolda' ve ilk satış (gerçek sunucu)", () => {
  it("emir yokken yolda DEĞİL; emir verilince isletme().ihracatEmriVar ve Defter dükkânı öne alır (ilk_satis 'Satışın yolda...'); satış gerçekleşince defterAl ilk_satis'ı kazanılana alır, siradaki'den düşer; emir 0'a çekilince yolda kalkar", async () => {
    const { a, y } = await oyuncu();
    const [c1] = bitisikCiftler(ts!.yazar.sim, ILCE, 1) as [string[]];
    await sunucuKomut("p1", { tur: "parsel_al", ilce: ILCE, hucreler: c1, sinif: "kirsal" });
    await sunucuKomut("ins1", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: c1 });
    let t = SAAT;
    await y.zamanIlerlet((t += 2 * SAAT)); // çiftlik biter
    await bekle(() => a.isletme() !== null && a.ozet()!.simZamani >= t);
    const d0 = await defterBekle(a, (d) => d.kazanilan.some((k) => k.kavram === "ilk_yapi")); // çiftlik bitti: ilk_yapi kazanıldı
    expect(ilkSatisBekliyor(d0, a.isletme()?.ihracatEmriVar === true)).toBe(false); // emir yok
    expect(d0.siradaki.map((s) => s.kavram)).toContain("ilk_satis");
    expect(a.isletme()?.ihracatEmriVar).toBeUndefined();

    // Emir verilir (oran > 0): satış henüz gerçekleşmedi (saat sınırı beklenir)
    await sunucuKomut("t1", { tur: "ticaret_emri", bolge: "sn_m_ova#ali", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    await bekle(() => a.isletme()?.ihracatEmriVar === true);
    const d1 = (await a.defterAl())!;
    expect(d1.siradaki.map((s) => s.kavram)).toContain("ilk_satis"); // satış saat sınırında gerçekleşir: şimdilik sıradakide
    {
      expect(ilkSatisBekliyor(d1, true)).toBe(true);
      const sira = gosterilecekSiradaki(d1, true).map((s) => s.kavram);
      expect(sira.indexOf("ilk_dukkan")).toBe(sira.indexOf("ilk_satis") - 1); // ilk_satis dükkânın hemen arkasında
      expect(defterUstKarti(d1, (m) => m, true)?.kavram).toBe("ilk_dukkan");
      expect(defterUstKarti(d1, (m) => m, true)?.metin).toBe("Kendi tezgâhın: bir dükkân kur ve rafından satış yap.");
      expect(defterHtml(d1, (m) => m, undefined, true)).toContain("Satışın yolda; beklerken dükkânını kur.");
      // Emir 0'a çekildi: yolda kalkar (normal metin, sıra değişmez)
      await sunucuKomut("t0", { tur: "ticaret_emri", bolge: "sn_m_ova#ali", mal: "tahil", yon: "ihracat", oranSaat: 0 });
      await bekle(() => a.isletme()?.ihracatEmriVar === undefined);
      expect(ilkSatisBekliyor(d1, a.isletme()?.ihracatEmriVar === true)).toBe(false);
      await sunucuKomut("t2", { tur: "ticaret_emri", bolge: "sn_m_ova#ali", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
      await bekle(() => a.isletme()?.ihracatEmriVar === true);
    }

    // Satış gerçekleşir (saat sınırı): sunucu ilk_satis'ı yazar, istemci tazelerse sıradakiden düşer
    await y.zamanIlerlet((t += 3 * SAAT));
    await bekle(() => a.ozet()!.simZamani >= t);
    const d2 = await defterBekle(a, (d) => d.kazanilan.some((k) => k.kavram === "ilk_satis"));
    expect(d2.kazanilan.map((k) => k.kavram)).toContain("ilk_satis");
    expect(d2.siradaki.map((s) => s.kavram)).not.toContain("ilk_satis");
    expect(ilkSatisBekliyor(d2, a.isletme()?.ihracatEmriVar === true)).toBe(false); // kazanıldı: "yolda" kalkar, normal akış
  }, 60_000);
});

describe("defter.ts saf: 'satışın yolda' dört vaka", () => {
  const siradaki = (liste: string[]) => liste.map((k) => ({ kavram: k, sablon: `defter.kavram.${k}`, etkin: true, odul: { paraMili: 1, degerMili: 1 } }));
  const defter = (liste: string[]) => ({ kazanilan: [], siradaki: siradaki(liste), toplamOdulMili: 0, tavanMili: 1 });

  it("emir yok: yolda değil, sıra ve metin normal; emir var + ilk_satis sıradakide: yolda, ilk_dukkan öne, bekleme metni; emir 0'a çekildi: normal; ilk_satis kazanıldı: emir olsa da normal", () => {
    const d = defter(["ilk_yapi", "ilk_satis", "ilk_dukkan", "ilk_isleme"]);
    expect(ilkSatisBekliyor(d, false)).toBe(false); // emir yok ya da 0'a çekildi (ihracatEmriVar false)
    expect(gosterilecekSiradaki(d, false).map((x) => x.kavram)).toEqual(["ilk_yapi", "ilk_satis", "ilk_dukkan", "ilk_isleme"]);
    expect(defterUstKarti(d, (m) => m, false)?.kavram).toBe("ilk_yapi");
    expect(ilkSatisBekliyor(d, true)).toBe(true);
    expect(gosterilecekSiradaki(d, true).map((x) => x.kavram)).toEqual(["ilk_yapi", "ilk_dukkan", "ilk_satis", "ilk_isleme"]);
    // ilk yapı kazanıldı: ilk etkin adım dükkân olur
    const d2 = defter(["ilk_satis", "ilk_dukkan", "ilk_isleme"]);
    expect(defterUstKarti(d2, (m) => m, true)?.kavram).toBe("ilk_dukkan");
    expect(defterUstKarti(d2, (m) => m, true)?.metin).toBe("Kendi tezgâhın: bir dükkân kur ve rafından satış yap.");
    expect(defterHtml(d2, (m) => m, undefined, true)).toContain("Satışın yolda; beklerken dükkânını kur.");
    expect(defterHtml(d2, (m) => m, undefined, false)).not.toContain("Satışın yolda");
    expect(defterHtml(d2, (m) => m, undefined, false)).toContain("Çiftliğinin tahılını Pazar&#39;da sat.");
    // ilk_satis kazanıldı (sıradakide yok): emir olsa da yolda değil
    expect(ilkSatisBekliyor(defter(["ilk_dukkan", "ilk_isleme"]), true)).toBe(false);
    // dükkân etkin değilse sıra değişmez (bekleme metni yine yazılır)
    const dkYok = { ...defter(["ilk_satis", "ilk_dukkan"]), siradaki: siradaki(["ilk_satis", "ilk_dukkan"]).map((x) => ({ ...x, etkin: x.kavram !== "ilk_dukkan" })) };
    expect(gosterilecekSiradaki(dkYok, true).map((x) => x.kavram)).toEqual(["ilk_satis"]);
    expect(ilkSatisBekliyor(null, true)).toBe(false);
  });
});
