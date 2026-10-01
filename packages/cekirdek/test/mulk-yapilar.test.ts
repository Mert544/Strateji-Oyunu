/**
 * Ek yapılar (docs/11 §7.3; `parametreler.mulk.ekYapilar`): Ambar, Ticaret ofisi, Muhtarlık, Konut, Garaj, Atölye-Lab.
 * İçerikte tesis türü değildirler; yalnız mülk kipinde `tesis_insa_hucre` ile kurulurlar.
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle } from "@bolge/veri";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { hucreBul, isletmeBul, mulkOyuncuBul } from "../src/mulk";
import { ekYapiTamamla } from "../src/mulk/yapi";
import { ticaretCarpanlari } from "../src/pazar";
import { dunyaCoz, dunyaSerilestir } from "../src/serilestir";
import { anlikHazine, anlikMiktar, oyuncuBul, stokEkle } from "../src/stok";
import { DAKIKA, GUN, PPM } from "../src/tipler";
import type { BolgeDurumu, CekirdekVeriPaketi, Komut } from "../src/tipler";
import { mulkSim, mulkVeriTam, tamam, ver } from "./mulk-yardimci";

const IL = "sn_m_ova";
const ILCE = "sn_m_ova_merkez";

function bolVeri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 2_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.esZamanliInsaat = 10;
    duzenle?.(v);
  });
}

/** Yurtlu oyuncu `a`; yurt hücreleri ve işletme düğümü. */
function hazir(veri = bolVeri()) {
  const s = mulkSim(["a"], veri);
  const d = s.dunya;
  const hs = d.mulk!.hucreler.filter((h) => h.sahip === "a").map((h) => h.id);
  const b = (): BolgeDurumu => d.bolgeler[isletmeBul(d, "a", IL)!.bolgeIndeksi]!;
  return { s, d, hs, b };
}

function ekle(s: Simulasyon, tur: string, hucre: string): Komut {
  void s;
  return { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: tur, hucreler: [hucre] };
}

describe("ek yapı tanımları", () => {
  it("docs/11'deki 6 yapı + G7 dükkânı (7) parametrede tanımlı; hepsi 1 yuvalı; tesis türleriyle çakışmaz; Ordugâh yok", () => {
    const s = mulkSim([], bolVeri());
    const ids = s.ic.mulk!.ekYapilar.map((y) => y.id);
    expect(ids).toEqual(["ambar", "atolye_lab", "dukkan", "garaj", "konut", "muhtarlik", "ticaret_ofisi"]); // G7-4: dukkan (6 -> 7)
    expect(s.ic.mulk!.ekYapilar.every((y) => y.yuva === 1 && y.insaMaliyeti.length > 0)).toBe(true);
    for (const id of ids) expect(s.ic.tesisTuruIndeks[id]).toBeUndefined();
    expect(ids).not.toContain("ordugah");
  });

  it("icerik.json'a dokunulmaz: tesis türü sayısı aynı; bölge kipinde ek yapı kurulamaz", () => {
    const v = miniVeriyiYukle();
    const s = Simulasyon.olustur(v, 3);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    const r = s.uygula({ t: 0, oyuncu: "a", komut: { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ambar" } });
    expect(r).toEqual({ tamam: false, hata: "bilinmeyen tesis turu: ambar" });
    expect(s.ic.mulk).toBeUndefined();
    expect(v.icerik.tesisTurleri.some((t) => ["ambar", "ticaret_ofisi", "muhtarlik", "konut", "garaj", "atolye_lab"].includes(t.id))).toBe(false);
  });

  it("çakışan kimlik ve bilinmeyen mal derlemede reddedilir", () => {
    expect(() =>
      mulkSim([], bolVeri((v) => {
        v.param.mulk!.ekYapilar!["ciftlik"] = { ...v.param.mulk!.ekYapilar!["ambar"]! };
      })),
    ).toThrow(/cakisiyor/);
    expect(() =>
      mulkSim([], bolVeri((v) => {
        v.param.mulk!.ekYapilar!["ambar"]!.insaMaliyeti = { yok_mal: 1 };
      })),
    ).toThrow(/bilinmeyen mal/);
  });
});

describe("inşaat: hücreli inşaat mekanizması", () => {
  it("6 yapının hepsi kurulur: kayıt düğümde, hücre kimliği yapıya geçer, inşaat kalmaz", () => {
    const { s, d, hs, b } = hazir();
    const turler = ["ambar", "ticaret_ofisi", "muhtarlik", "konut", "garaj", "atolye_lab"];
    turler.forEach((t, i) => tamam(s, "a", ekle(s, t, hs[i]!)));
    expect(d.insaatlar).toHaveLength(6);
    expect(d.insaatlar.every((i) => i.tur === "tesis" && i.hedef === -1 && i.ekYapi !== undefined)).toBe(true);
    expect(hucreBul(d, hs[0]!)!.insaat).toBeDefined();
    s.calistirKadar(d.zaman + 2 * GUN);
    expect(d.insaatlar).toHaveLength(0);
    // Bitiş sırasıyla eklenir (kısa inşaat önce)
    expect(b().ekYapilar!.map((y) => y.tur).sort()).toEqual([...turler].sort());
    expect(b().tesisler).toHaveLength(0); // tesis türleri değildirler
    turler.forEach((t, i) => {
      const y = b().ekYapilar!.find((x) => x.tur === t)!;
      expect(y.hucreler).toEqual([hs[i]]);
      const h = hucreBul(d, hs[i]!)!;
      expect(h.tesis).toBe(y.id);
      expect(h.insaat).toBeUndefined();
    });
    const idler = b().ekYapilar!.map((y) => y.id);
    expect(new Set(idler).size).toBe(6);
  });

  it("süre = insaSaati × erken oyun çarpanı (ambar 3 sa -> 18 dk); maliyet stoktan ve hazineden düşer", () => {
    const { s, d, hs, b } = hazir();
    const ambar = s.ic.mulk!.ekYapilar.find((y) => y.id === "ambar")!;
    const h0 = anlikHazine(d, "a");
    const celik = s.ic.malIndeks["celik"]!;
    const parca = s.ic.malIndeks["parca"]!;
    const c0 = anlikMiktar(b().stoklar[celik]!, d.zaman);
    const p0 = anlikMiktar(b().stoklar[parca]!, d.zaman);
    const t0 = d.zaman;
    tamam(s, "a", ekle(s, "ambar", hs[0]!));
    expect(d.insaatlar[0]!.bitis - t0).toBe(18 * DAKIKA);
    expect(h0 - anlikHazine(d, "a")).toBe(ambar.insaParasi);
    expect(c0 - anlikMiktar(b().stoklar[celik]!, d.zaman)).toBe(ambar.insaMaliyeti.find(([m]) => m === celik)![1]);
    expect(p0 - anlikMiktar(b().stoklar[parca]!, d.zaman)).toBe(ambar.insaMaliyeti.find(([m]) => m === parca)![1]);
  });

  it("denetimler: yuva, sahiplik, doluluk, bilinmeyen tür, eşzamanlı inşaat, ilde en fazla; başarısız komut durumu değiştirmez", () => {
    const { s, d, hs } = hazir(bolVeri((v) => (v.param.mulk!.esZamanliInsaat = 2)));
    s.calistirKadar(0);
    const once = s.durumOzeti();
    expect(ver(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ambar", hucreler: [hs[0]!, hs[1]!] }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ambar", hucreler: ["1:1"] }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ordugah", hucreler: [hs[0]!] })).toEqual({ tamam: false, hata: "bilinmeyen tesis turu: ordugah" });
    expect(s.durumOzeti()).toBe(once);
    tamam(s, "a", ekle(s, "muhtarlik", hs[0]!));
    // aynı hücre dolu
    expect(ver(s, "a", ekle(s, "ambar", hs[0]!)).tamam).toBe(false);
    // ilde en çok 1 muhtarlık (süren dahil)
    const r = ver(s, "a", ekle(s, "muhtarlik", hs[1]!));
    expect((r as { hata: string }).hata).toContain("ilde en cok 1 Muhtarlık");
    tamam(s, "a", ekle(s, "ambar", hs[1]!));
    // eşzamanlı 2 inşaat dolu
    expect((ver(s, "a", ekle(s, "konut", hs[2]!)) as { hata: string }).hata).toContain("ayni anda en cok 2");
    // bitince muhtarlık yine 1 ile sınırlı
    s.calistirKadar(d.zaman + 2 * GUN);
    expect(ver(s, "a", ekle(s, "muhtarlik", hs[2]!)).tamam).toBe(false);
    tamam(s, "a", ekle(s, "konut", hs[2]!));
  });

  it("iptal: ödenenin %50'si iade, hücre boşalır, kayıt oluşmaz; eski insaat_bitti etkisiz", () => {
    const { s, d, hs, b } = hazir();
    const ambar = s.ic.mulk!.ekYapilar.find((y) => y.id === "ambar")!;
    const h0 = anlikHazine(d, "a");
    tamam(s, "a", ekle(s, "ambar", hs[0]!));
    tamam(s, "a", { tur: "insaat_iptal", insaat: d.insaatlar[0]!.id });
    expect(h0 - anlikHazine(d, "a")).toBe(ambar.insaParasi - Math.floor((ambar.insaParasi * 500_000) / PPM));
    expect(hucreBul(d, hs[0]!)!.insaat).toBeUndefined();
    s.calistirKadar(d.zaman + 2 * GUN);
    expect(b().ekYapilar).toBeUndefined();
    expect(hucreBul(d, hs[0]!)!.tesis).toBeUndefined();
  });
});

describe("Ambar: depo kapasitesi", () => {
  it("biten her ambar depolanabilir her malın kapasitesini +5000 birim artırır; elektrik (depolanamaz) değişmez", () => {
    const { s, d, hs, b } = hazir();
    const kap0 = b().stoklar.map((x) => x.kapasite);
    expect(kap0.every((k) => k === s.ic.param.ekonomi.depoKapasitesi)).toBe(true);
    tamam(s, "a", ekle(s, "ambar", hs[0]!));
    // inşaat sürerken kapasite aynı
    expect(b().stoklar.map((x) => x.kapasite)).toEqual(kap0);
    s.calistirKadar(d.zaman + 30 * DAKIKA);
    const eki = s.ic.mulk!.p.ekYapilar!["ambar"]!.depoKapasiteEkiMili!;
    const elektrik = s.ic.malIndeks["elektrik"]!;
    b().stoklar.forEach((st, m) => expect(st.kapasite, `mal ${m}`).toBe(m === elektrik ? kap0[m] : kap0[m]! + eki));
    // ikinci ambar: üst üste biner
    tamam(s, "a", ekle(s, "ambar", hs[1]!));
    s.calistirKadar(d.zaman + 30 * DAKIKA);
    const tahil = s.ic.malIndeks["tahil"]!;
    expect(b().stoklar[tahil]!.kapasite).toBe(kap0[tahil]! + 2 * eki);
    // eski kapasitenin üstüne stok konabilir
    const eklenen = stokEkle(d, s.baglam, b().indeks, tahil, kap0[tahil]! + eki);
    expect(eklenen).toBe(kap0[tahil]! + eki);
    expect(anlikMiktar(b().stoklar[tahil]!, d.zaman)).toBeGreaterThan(kap0[tahil]!);
  });

  it("kapasite artışı tembel birikimi bozmaz: tavana yakın stok, eski tavanı aşacak biçimde yeni tavana kadar birikir", () => {
    const { s, d, hs, b } = hazir();
    const tahil = s.ic.malIndeks["tahil"]!;
    const st = () => b().stoklar[tahil]!;
    const kap = st().kapasite;
    const eki = s.ic.mulk!.p.ekYapilar!["ambar"]!.depoKapasiteEkiMili!;
    // Elle kurulan durum: tavanın 5 birim altında, +10 birim/saat. Lojistik çözümü araya girmesin diye ekYapiTamamla doğrudan çağrılır.
    st().miktar = kap - 5_000;
    st().yerelOran = 10_000;
    st().t0 = d.zaman;
    const sure = d.zaman + 2 * 3_600_000;
    expect(anlikMiktar(st(), sure)).toBe(kap); // ambarsız: tavanda kelepçeli
    const surum0 = st().surum;
    ekYapiTamamla(d, s.baglam, { id: 9999, tur: "tesis", sahip: "a", bolge: b().indeks, hedef: -1, bitis: d.zaman, hucreler: [hs[0]!], ekYapi: "ambar" });
    expect(st().kapasite).toBe(kap + eki);
    expect(st().surum).toBeGreaterThan(surum0); // eski eşik olayı eskir, yenisi planlanır
    expect(st().miktar).toBe(kap - 5_000);
    expect(anlikMiktar(st(), sure)).toBe(kap - 5_000 + 20_000); // yeni tavanın altında: birikim kesilmedi
    expect(b().israf[tahil]).toBe(0);
    expect(b().ekYapilar).toEqual([{ id: expect.any(Number) as number, tur: "ambar", hucreler: [hs[0]] }]);
    expect(hucreBul(d, hs[0]!)!.tesis).toBe(b().ekYapilar![0]!.id);
    // Planlanan eşik, yeni tavana doğrudur: kuyrukta güncel sürümlü bir 'esik' olayı vardır
    expect(d.kuyruk.some((o) => o.veri.tur === "esik" && o.veri.bolge === b().indeks && o.veri.mal === tahil && o.veri.surum === st().surum)).toBe(true);
  });
});

describe("Ticaret ofisi: komisyon ve makas indirimi", () => {
  it("komisyon %25 göreli, makas %15 PPM'e doğru kapanır; ofis sayısıyla artar, PPM ile sınırlı; yalnız o düğümde", () => {
    const { s, d, hs, b } = hazir(bolVeri((v) => {
      v.param.mulk!.ekYapilar!["ticaret_ofisi"]!.enFazlaIlBasina = 5;
    }));
    s.calistirKadar(15 * GUN); // kalkan (komisyonsuz 14 gün) bitsin
    const o = oyuncuBul(d, "a")!;
    const taban = ticaretCarpanlari(d, s.baglam, o, b().merkez!, b());
    expect(taban.komisyonPpm).toBe(s.ic.param.pazar.islemKomisyonuPpm);
    expect(taban.komisyonPpm).toBeGreaterThan(0);
    tamam(s, "a", ekle(s, "ticaret_ofisi", hs[0]!));
    s.calistirKadar(d.zaman + GUN);
    const bir = ticaretCarpanlari(d, s.baglam, o, b().merkez!, b());
    expect(bir.komisyonPpm).toBe(taban.komisyonPpm - Math.floor((taban.komisyonPpm * 250_000) / PPM));
    expect(bir.ihracatMakasPpm).toBe(taban.ihracatMakasPpm + Math.floor(((PPM - taban.ihracatMakasPpm) * 150_000) / PPM));
    expect(bir.ithalatMakasPpm).toBe(taban.ithalatMakasPpm - Math.floor(((taban.ithalatMakasPpm - PPM) * 150_000) / PPM));
    expect(bir.ihracatMakasPpm).toBeGreaterThan(taban.ihracatMakasPpm);
    expect(bir.ithalatMakasPpm).toBeLessThan(taban.ithalatMakasPpm);
    expect(bir.tarifePpm).toBe(taban.tarifePpm);
    // Düğüm verilmeden (liman çağrısı) indirim yok
    expect(ticaretCarpanlari(d, s.baglam, o, b().merkez!)).toEqual(taban);
    // 2 ofis -> daha fazla; 5 ofisle makas indirimi %75, komisyon %100 (PPM tavanı)
    tamam(s, "a", ekle(s, "ticaret_ofisi", hs[1]!));
    tamam(s, "a", ekle(s, "ticaret_ofisi", hs[2]!));
    tamam(s, "a", ekle(s, "ticaret_ofisi", hs[3]!));
    tamam(s, "a", ekle(s, "ticaret_ofisi", hs[4]!));
    s.calistirKadar(d.zaman + GUN);
    expect(b().ekYapilar!.filter((y) => y.tur === "ticaret_ofisi")).toHaveLength(5);
    const bes = ticaretCarpanlari(d, s.baglam, o, b().merkez!, b());
    expect(bes.komisyonPpm).toBe(0); // 5 × %25 = %125 -> PPM ile sınırlı
    expect(bes.ihracatMakasPpm).toBeGreaterThan(bir.ihracatMakasPpm);
  });

  it("ofis gelire yansır: aynı ihracat, ofisli oyuncunun hazinesi daha çok artar", () => {
    const veri = () => bolVeri((v) => {
      v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000, tahil: 9_000_000 };
      v.param.mulk!.ekYapilar!["ticaret_ofisi"]!.insaParasi = 0;
      v.param.mulk!.ekYapilar!["ticaret_ofisi"]!.insaMaliyeti = {};
    });
    const kos = (ofisli: boolean): number => {
      const { s, d, hs } = hazir(veri());
      s.calistirKadar(15 * GUN);
      if (ofisli) {
        tamam(s, "a", ekle(s, "ticaret_ofisi", hs[0]!));
        s.calistirKadar(d.zaman + 2 * SAAT_);
      }
      tamam(s, "a", { tur: "ticaret_emri", bolge: `${IL}#a`, mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
      const h0 = anlikHazine(d, "a");
      s.calistirKadar(d.zaman + 6 * SAAT_);
      return anlikHazine(d, "a") - h0;
    };
    expect(kos(true)).toBeGreaterThan(kos(false));
  });
});

const SAAT_ = 3_600_000;

describe("etkisiz yer tutucular ve serileştirme", () => {
  it("Muhtarlık, Konut, Garaj, Atölye-Lab üretimi ve ticareti etkilemez (yalnız kayıt ve maliyet)", () => {
    const { s, d, hs, b } = hazir();
    const kapasite0 = b().stoklar.map((x) => x.kapasite);
    for (const [i, t] of ["muhtarlik", "konut", "garaj", "atolye_lab"].entries()) tamam(s, "a", ekle(s, t, hs[i]!));
    s.calistirKadar(d.zaman + 2 * GUN);
    expect(b().ekYapilar!.map((y) => y.tur).sort()).toEqual(["atolye_lab", "garaj", "konut", "muhtarlik"]);
    expect(b().stoklar.map((x) => x.kapasite)).toEqual(kapasite0);
    expect(b().nufus).toBe(0);
    expect(b().tesisler).toHaveLength(0);
  });

  it("serileştir -> çöz -> yükle: ek yapı kaydı ve kapasiteler korunur; bozuk kayıt reddedilir", () => {
    const { s, d, hs } = hazir();
    tamam(s, "a", ekle(s, "ambar", hs[0]!));
    tamam(s, "a", ekle(s, "ticaret_ofisi", hs[1]!));
    s.calistirKadar(d.zaman + 2 * GUN);
    tamam(s, "a", ekle(s, "konut", hs[2]!)); // süren inşaat (ekYapi alanı) da serileşir
    const metin = dunyaSerilestir(d);
    const geri = dunyaCoz(metin);
    expect(dunyaSerilestir(geri)).toBe(metin);
    const y = Simulasyon.yukle(bolVeri(), geri);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    // kesintisiz koşu = yüklenip koşan
    s.calistirKadar(d.zaman + 3 * GUN);
    y.calistirKadar(s.dunya.zaman);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    // bozuk: bilinmeyen ek yapı türü
    const boz = JSON.parse(metin) as { bolgeler: { ekYapilar?: { tur: string }[] }[] };
    boz.bolgeler.find((b) => b.ekYapilar !== undefined)!.ekYapilar![0]!.tur = "ordugah";
    expect(() => Simulasyon.yukle(bolVeri(), dunyaCoz(JSON.stringify(boz)))).toThrow(/ek yapi/);
  });

  it("aynı komut dizisi aynı özet (determinizm); mulkOyuncu sayaç yalnız indirimde yazılır", () => {
    const a = hazir();
    const b = hazir();
    for (const x of [a, b]) {
      tamam(x.s, "a", ekle(x.s, "ambar", x.hs[0]!));
      x.s.calistirKadar(x.d.zaman + 2 * GUN);
    }
    expect(a.s.durumOzeti()).toBe(b.s.durumOzeti());
    expect(mulkOyuncuBul(a.d, "a")!.indirimliYapi).toBeUndefined();
  });
});
