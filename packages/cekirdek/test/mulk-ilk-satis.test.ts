/**
 * İlk satış (docs/06 §15): mülk kipinde işletme düğümü, il merkezinin NPC (yerel) pazarına limansız ilde de satabilir;
 * liman primi yalnız limanlı merkezlerde; ticaret emri yuvaları (temel + Ticaret ofisi). Bölge kipinde liman şartı değişmez.
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { isletmeBul } from "../src/mulk";
import { pazarTablosu, ticaretCarpanlari } from "../src/pazar";
import { anlikHazine, oyuncuBul } from "../src/stok";
import { DAKIKA, GUN, SAAT } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { bitisikCift, mulkSim, mulkVeriTam, tamam, ver } from "./mulk-yardimci";

/** Bol malzemeli, bol hazineli, indirimsiz ve ayrılmışsız yeni oyuncu paketi (yurt açık). */
function bolVeri(duzenle?: (m: NonNullable<ReturnType<typeof mulkVeriTam>["param"]["mulk"]>) => void) {
  return mulkVeriTam((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 2_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.esZamanliInsaat = 10;
    duzenle?.(m);
  });
}

const OVA_IL = "sn_m_ova";

describe("ilk satış: yurtta Tarla kur, ürünü yerel pazara sat", () => {
  it("yurt (ova ili, liman yok) -> Tarla -> tahıl ihracat emri kabul edilir; ürün satılır ve hazineye gelir yazılır", () => {
    const s = mulkSim(["a"], bolVeri());
    const d = s.dunya;
    const hs = d.mulk!.hucreler.filter((h) => h.sahip === "a");
    expect(hs[0]!.ilce).toBe("sn_m_ova_merkez");
    const bolge = `${OVA_IL}#a`;
    const b = d.bolgeler[isletmeBul(d, "a", OVA_IL)!.bolgeIndeksi]!;
    expect(b.etiketler).not.toContain("liman");
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler: bitisikCift(hs.map((h) => h.id)) });
    s.calistirKadar(d.zaman + 20 * DAKIKA); // 12 dk'da biter
    expect(b.tesisler).toHaveLength(1);
    tamam(s, "a", { tur: "ticaret_emri", bolge, mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    expect(b.ticaretEmirleri).toHaveLength(1);
    const h0 = anlikHazine(d, "a");
    s.calistirKadar(d.zaman + 2 * GUN);
    const tahil = s.ic.malIndeks["tahil"]!;
    expect(d.pazar.oyuncuArzi[tahil]).toBeGreaterThan(0); // NPC pazar ürünü alıyor
    const emir = b.ticaretEmirleri[0]!;
    expect(emir.gerceklesenSaat).toBeGreaterThan(0);
    expect(anlikHazine(d, "a")).toBeGreaterThan(h0); // gelir, tesis gideri ve arazi vergisinden büyük
  });

  it("bölge kipinde (parsel yok) limansız bölgede ticaret emri hâlâ reddedilir", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 3);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    const r = s.uygula({ t: 0, oyuncu: "a", komut: { tur: "ticaret_emri", bolge: "m_ova", mal: "tahil", yon: "ihracat", oranSaat: 1000 } });
    expect(r).toEqual({ tamam: false, hata: "bolge liman degil: m_ova" });
    // limanlı bölge kabul eder
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_liman"] } });
    expect(s.uygula({ t: 0, oyuncu: "b", komut: { tur: "ticaret_emri", bolge: "m_liman", mal: "tahil", yon: "ihracat", oranSaat: 1000 } }).tamam).toBe(true);
  });

  it("mülk kipinde başkasının işletmesine ve bilinmeyen bölgeye emir verilemez; depolanamaz mal ticarete konu olmaz", () => {
    const s = mulkSim(["a", "b"], bolVeri());
    const bolgeA = `${OVA_IL}#a`;
    expect(ver(s, "b", { tur: "ticaret_emri", bolge: bolgeA, mal: "tahil", yon: "ihracat", oranSaat: 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "ticaret_emri", bolge: "yok#a", mal: "tahil", yon: "ihracat", oranSaat: 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "ticaret_emri", bolge: bolgeA, mal: "elektrik", yon: "ihracat", oranSaat: 1 }).tamam).toBe(false);
    // harita (merkez) bölgesinin sahibi yoktur
    expect(ver(s, "a", { tur: "ticaret_emri", bolge: "m_ova", mal: "tahil", yon: "ihracat", oranSaat: 1 }).tamam).toBe(false);
  });
});

describe("liman primi yalnız limanlı merkezlerde", () => {
  it("limansız il: prim 0 (harita limanı tanımlı olsa bile etiket yoksa); limanlı il: merkezin liman primi uygulanır", () => {
    const veri = bolVeri();
    const bolge = (id: string) => veri.harita.bolgeler.find((b) => b.id === id)!;
    // mini-6'da yalnız dünya kapısı limanlı (prim 0): şehir merkezine uzak bir liman ekle (prim = 20 sa × 2500 = 50 000 ppm).
    bolge("m_sehir").etiketler.push("liman");
    bolge("m_sehir").liman = { dunyaKapisi: false, dunyaMesafeSaat: 20, kapasiteSinifi: 1 };
    // ova: liman tanımı var ama `liman` etiketi yok -> işletme limanlı sayılmaz
    bolge("m_ova").liman = { dunyaKapisi: false, dunyaMesafeSaat: 20, kapasiteSinifi: 1 };
    const s = mulkSim([], veri);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_ova_merkez" } });
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: [], ilce: "sn_m_sehir_merkez" } });
    const d = s.dunya;
    const pz = pazarTablosu(s.ic)!;
    const oa = oyuncuBul(d, "a")!;
    const ob = oyuncuBul(d, "b")!;
    const na = d.bolgeler[isletmeBul(d, "a", OVA_IL)!.bolgeIndeksi]!;
    const nb = d.bolgeler[isletmeBul(d, "b", "sn_m_sehir")!.bolgeIndeksi]!;
    expect(pz.limanPrimPpm[na.merkez!]).toBe(50_000);
    expect(pz.limanPrimPpm[nb.merkez!]).toBe(50_000);
    expect(na.etiketler).not.toContain("liman");
    expect(nb.etiketler).toContain("liman");
    expect(ticaretCarpanlari(d, s.baglam, oa, na.merkez!, na).primPpm).toBe(0);
    expect(ticaretCarpanlari(d, s.baglam, ob, nb.merkez!, nb).primPpm).toBe(50_000);
    // Düğüm verilmeden (eski çağrı biçimi) tablo değeri okunur: davranış değişmez
    expect(ticaretCarpanlari(d, s.baglam, oa, na.merkez!).primPpm).toBe(50_000);
  });
});

describe("ticaret emri yuvası (temelEmirYuvasi + Ticaret ofisi)", () => {
  const mal = ["tahil", "gida", "cevher", "komur", "celik", "bakir"];
  const emir = (bolge: string, m: string, oran = 1000): Komut => ({ tur: "ticaret_emri", bolge, mal: m, yon: "ihracat", oranSaat: oran });

  it("temel yuva 4: 5. yeni emir reddedilir; var olan güncellenir; silinince yuva boşalır", () => {
    const s = mulkSim(["a"], bolVeri());
    const bolge = `${OVA_IL}#a`;
    expect(s.ic.mulk!.p.temelEmirYuvasi).toBe(4);
    for (let i = 0; i < 4; i++) tamam(s, "a", emir(bolge, mal[i]!));
    const r = ver(s, "a", emir(bolge, mal[4]!));
    expect(r.tamam).toBe(false);
    expect((r as { hata: string }).hata).toContain("ticaret emri yuvasi dolu (4)");
    tamam(s, "a", emir(bolge, mal[0]!, 5000)); // güncelleme
    expect(s.dunya.bolgeler[isletmeBul(s.dunya, "a", OVA_IL)!.bolgeIndeksi]!.ticaretEmirleri).toHaveLength(4);
    // aynı malın ters yönü yeni emirdir
    expect(ver(s, "a", { tur: "ticaret_emri", bolge, mal: mal[0]!, yon: "ithalat", oranSaat: 1000 }).tamam).toBe(false);
    tamam(s, "a", emir(bolge, mal[0]!, 0)); // sil
    tamam(s, "a", emir(bolge, mal[4]!));
  });

  it("Ticaret ofisi yuvayı +4 artırır (ofis başına), enFazlaIlBasina sınırlıdır", () => {
    const s = mulkSim(["a"], bolVeri());
    const d = s.dunya;
    const bolge = `${OVA_IL}#a`;
    const hs = d.mulk!.hucreler.filter((h) => h.sahip === "a");
    for (let i = 0; i < 4; i++) tamam(s, "a", emir(bolge, mal[i]!));
    expect(ver(s, "a", emir(bolge, mal[4]!)).tamam).toBe(false);
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: hs[0]!.ilce, tesisTuru: "ticaret_ofisi", hucreler: [hs[0]!.id] });
    s.calistirKadar(d.zaman + 30 * DAKIKA);
    tamam(s, "a", emir(bolge, mal[4]!));
    tamam(s, "a", emir(bolge, mal[5]!));
    expect(d.bolgeler[isletmeBul(d, "a", OVA_IL)!.bolgeIndeksi]!.ticaretEmirleri).toHaveLength(6);
  });

  it("yuva sınırı yalnız mülk kipinde ve parametre varsa uygulanır (temelEmirYuvasi yoksa sınırsız)", () => {
    const s = mulkSim(["a"], bolVeri((m) => delete m.temelEmirYuvasi));
    const bolge = `${OVA_IL}#a`;
    for (const m of mal) tamam(s, "a", emir(bolge, m));
    expect(s.dunya.bolgeler[isletmeBul(s.dunya, "a", OVA_IL)!.bolgeIndeksi]!.ticaretEmirleri).toHaveLength(mal.length);
  });
});

void SAAT;
