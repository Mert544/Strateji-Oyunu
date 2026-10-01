/**
 * Mal ekleme kanıtı (P3, docs/06 §14.3 ve §15.8): içeriğe Alfa-0'ın 10 yeni malı SONA eklendi (14 → 24). Mal indeksli diziler uzadığı için gerçek
 * içerikli dünyaların tam özeti değişir; davranış eşitliği "ilk 14 malın izdüşümü" ile kanıtlanır. Dondurulmuş fikstürlü altınlar (b1/b2) ve
 * esik-budama-kanit.test.ts değişmedi.
 *
 * 1. P3 ÖNCESİ içerikle (14 mal) ve güncel içerikle (24 mal) aynı koşu: 12 kontrol noktasında güncel dünyanın 14 mal izdüşümü eski dünyayla BİREBİR aynı
 *    (durum, etkin kuyruk, işlenen olay dizisi, olay sayacı; botlar ve PRNG dahil).
 * 2. İzdüşüm yardımcısı yeni malların etkisizliğini DENETLER: yeni mala talep (ithalat emri), ihracat/stok ya da üretim varsa ihlal olarak yakalar
 *    (bölge kipinde yeni malın tek etki yolu oyuncu ithalatıdır).
 * 3. YÜKSELTME YOLU: P3 öncesi içerikle yazılmış anlık görüntü, güncel içerikle `gocIzni + yalnizEkleZorunlu` ile yüklenir: ihlal 0, eklenen 10 mal; göçten
 *    sonraki ileri koşuda 14 malın görünümü göç edilmemiş koşuyla aynıdır.
 */
import { miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikKimlikTablosuOlustur } from "../src/goc";
import type { IcerikKimlikTablosu } from "../src/goc";
import { Simulasyon } from "../src/motor";
import { kanonikSerilestir } from "../src/ozet";
import { anlikGoruntuOlustur, anlikGoruntuUyarla, anlikGoruntuCoz, kuralSurumuHesapla, SerilestirmeHatasi } from "../src/serilestir";
import { stokEkle } from "../src/stok";
import { GUN } from "../src/tipler";
import { REFERANS_MAL_SAYISI, esitNoktalar, kanitKaydi, NOKTA_SAYISI } from "./esik-budama-kanit";
import { kimlikliGorunum } from "./goc-yardimci";
import type { Veri } from "./goc-yardimci";
import { malIzdusumu } from "./mal-izdusumu";
import { mulkSim, mulkVeriTam, tamam } from "./mulk-yardimci";
import { senaryoKos } from "./serilestir-yardimci";

/**
 * Göç sonrası karşılaştırma görünümü: kimlikli görünüm (yalnız eski malların kimlikleri) + göçün MEŞRU iki farkı çıkarılmış: göç lojistiği kirli işaretler
 * (bir ek çözüm: `lojistik.cozumSayisi` +1) ve bu yüzden olay sıra numaraları (`kuyruk[].sira`) +1 kayar. Başka hiçbir alan (stok, pazar, hazine, akış,
 * savaş, inşaat, üretim, tarım...) farklı olamaz.
 */
function gocGorunumu(sim: Simulasyon, tablo: IcerikKimlikTablosu): string {
  const g = kimlikliGorunum(sim.dunya, sim.ic, tablo) as { lojistik: Record<string, unknown>; kuyruk: Record<string, unknown>[] };
  delete g.lojistik["cozumSayisi"];
  g.kuyruk = g.kuyruk.map((o) => {
    const { sira: _sira, ...diger } = o;
    void _sira;
    return diger;
  });
  return kanonikSerilestir(g);
}

const YENI_MALLAR = ["un", "ekmek", "cam", "pencere", "sut", "sut_urunu", "findik", "findik_urunu", "sekerleme", "kepek"];

/**
 * P3 ÖNCESİ içerik: güncel veriden P3'ün iki değişikliği geri alınır: `icerik.mallar` ilk 14 mala kısaltılır ve `pazar.emilimSaat/arzSaat` yeni malların
 * girdileri silinir (başka hiçbir içerik/parametre P3'te değişmedi). Kimlik listesi eklenmez (dondurulmuş eski paket).
 */
export function p3Oncesi(v: Veri): Veri {
  const c = structuredClone(v);
  delete c.kimlikListesi;
  expect(c.icerik.mallar.slice(REFERANS_MAL_SAYISI).map((m) => m.id)).toEqual(YENI_MALLAR);
  c.icerik.mallar = c.icerik.mallar.slice(0, REFERANS_MAL_SAYISI);
  for (const id of YENI_MALLAR) {
    delete c.param.pazar.emilimSaat[id];
    delete c.param.pazar.arzSaat[id];
  }
  // G7-4: gerçek içerik yeni oyuncu başlangıç stoğuna `pencere` (yeni mal) ekler; 14 mallı içerikte yeni mal yoktur (yalnız bu YARDIMCI değişir, iddialar aynı).
  const yo = (c.param.mulk as { yeniOyuncu?: { baslangicStok?: Record<string, number> } } | undefined)?.yeniOyuncu;
  if (yo?.baslangicStok !== undefined) for (const id of YENI_MALLAR) delete yo.baslangicStok[id];
  // G7-4: dükkân (`mulk.perakende`, `ekYapilar.dukkan`) yeni mallara (pencere, un, ekmek...) başvurur: 14 mallı (P3 öncesi) içerikte yoktur.
  const mulk = c.param.mulk as { perakende?: unknown; ekYapilar?: Record<string, unknown> } | undefined;
  if (mulk !== undefined) {
    delete mulk.perakende;
    if (mulk.ekYapilar !== undefined) delete mulk.ekYapilar["dukkan"];
  }
  return c;
}

describe("1. izdüşüm eşitliği: güncel (24 mal) dünyanın ilk 14 malı, P3 öncesi (14 mal) dünyayla birebir aynı", () => {
  const senaryolar: { ad: string; son: number; veri: () => Veri; tohum: number; gun: number }[] = [
    { ad: "mini-6, 4 bot + bulanık komut, tohum 3", son: 6 * GUN, veri: miniVeriyiYukle, tohum: 3, gun: 6 },
  ];
  for (const s of senaryolar) {
    it(`${s.ad}: ${NOKTA_SAYISI} kontrol noktasında durum, etkin kuyruk, işlenen olaylar ve olay sayacı aynı`, () => {
      const kos = (veri: Veri) => kanitKaydi(esitNoktalar(s.son, NOKTA_SAYISI), () => void senaryoKos({ veri, tohum: s.tohum, sureMs: s.gun * GUN }));
      const eski = kos(p3Oncesi(s.veri()));
      const yeni = kos(s.veri());
      expect(yeni.noktalar).toHaveLength(NOKTA_SAYISI);
      yeni.noktalar.forEach((n, i) => expect({ i, ...n }).toEqual({ i, ...eski.noktalar[i]! }));
      // Tam özet (mal dizileri dahil) KAÇINILMAZ olarak farklıdır: bu kanıtın nedeni
      expect(yeni.sonOzet).not.toBe(eski.sonOzet);
      expect(yeni.kuyruk - yeni.eskimis).toBe(eski.kuyruk - eski.eskimis);
    }, 120_000);
  }

  it("P3 öncesi içerik gerçekten 14 mallı ve kural sürümü farklıdır (24 mallı güncel içerikten)", () => {
    const eski = p3Oncesi(miniVeriyiYukle());
    expect(eski.icerik.mallar).toHaveLength(14);
    expect(Simulasyon.olustur(eski, 1).ic.mallar).toHaveLength(14);
    expect(kuralSurumuHesapla(eski)).not.toBe(kuralSurumuHesapla(miniVeriyiYukle()));
  });
});

describe("2. izdüşüm yardımcısı yeni malların etkisizliğini denetler (ihlali yakalar)", () => {
  /** m_liman'a katılan oyuncu: ticaret emri verilebilir. */
  function sim(veri = miniVeriyiYukle()): Simulasyon {
    const s = Simulasyon.olustur(veri, 5);
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_liman", "m_ova"] } });
    return s;
  }
  const un = (s: Simulasyon) => s.ic.malIndeks["un"]!;

  it("kontrol: yeni mala dokunulmayan dünya izdüşüme geçer; yeni mal dizileri sıfır", () => {
    const s = sim();
    s.calistirKadar(2 * GUN);
    const iz = malIzdusumu(s.dunya, s.ic, REFERANS_MAL_SAYISI);
    expect(iz.pazar.fiyat).toHaveLength(14);
    expect(iz.bolgeler[0]!.stoklar).toHaveLength(14);
    for (const b of s.dunya.bolgeler) for (const m of YENI_MALLAR) expect(b.stoklar[s.ic.malIndeks[m]!]!.miktar).toBe(0);
  });

  it("İTHALAT emri (bölge kipinde yeni malın tek etki yolu): talep > 0 olunca izdüşüm bunu ihlal olarak yakalar", () => {
    const s = sim();
    tamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "un", yon: "ithalat", oranSaat: 10_000 });
    s.calistirKadar(2 * GUN);
    expect(s.dunya.pazar.oyuncuTalebi[un(s)]).toBeGreaterThan(0);
    expect(() => malIzdusumu(s.dunya, s.ic, REFERANS_MAL_SAYISI)).toThrow(/yeni mal etkisiz degil/); // talep, stok (ithal edilen mal depoya girer) ve emir ayrı ayrı ihlaldir
  });

  it("emir verildi ama hazine yok / emir silindi: etki yoksa izdüşüm geçer (emrin kendisi değil gerçekleşen talep denetlenir); emir kalırsa ticaret emri ihlali", () => {
    const s = sim();
    tamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "un", yon: "ithalat", oranSaat: 10_000 });
    // emir dünyada duruyor: izdüşüm, emrin yeni mala başvurduğunu yakalar (bölge listesi 14 mallıya kısaltılamaz)
    expect(() => malIzdusumu(s.dunya, s.ic, REFERANS_MAL_SAYISI)).toThrow(/yeni mal etkisiz degil: bolge \d+ ticaret emri mal 14/);
    tamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "un", yon: "ithalat", oranSaat: 0 }); // emri sil
    s.calistirKadar(GUN);
    expect(() => malIzdusumu(s.dunya, s.ic, REFERANS_MAL_SAYISI)).not.toThrow();
  });

  it("İHRACAT: yeni mal stoğu varsa (stok miktarı) ve ihracat gerçekleşirse (arz) ihlal olarak yakalanır", () => {
    const s = sim();
    const liman = s.dunya.bolgeler[s.ic.bolgeIndeks["m_liman"]!]!;
    stokEkle(s.dunya, s.baglam, liman.indeks, un(s), 5_000_000);
    expect(() => malIzdusumu(s.dunya, s.ic, REFERANS_MAL_SAYISI)).toThrow(/yeni mal etkisiz degil: bolge \d+ stok 14/);
    tamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "un", yon: "ihracat", oranSaat: 10_000 });
    s.calistirKadar(2 * 3_600_000);
    expect(s.dunya.pazar.oyuncuArzi[un(s)]).toBeGreaterThan(0);
    expect(() => malIzdusumu(s.dunya, s.ic, REFERANS_MAL_SAYISI)).toThrow(/yeni mal etkisiz degil/);
  });

  it("mülk kipinde de: işletme düğümündeki yeni mal ithalat emri talep yaratır ve yakalanır", () => {
    const s = mulkSim(["a"], mulkVeriTam((v) => {
      v.param.mulk!.yeniOyuncu.hibe = 5_000_000_000;
    }), 3);
    const il = s.dunya.mulk!.isletmeler.find((e) => e.oyuncu === "a")!;
    const dugum = s.dunya.bolgeler[il.bolgeIndeksi]!;
    tamam(s, "a", { tur: "ticaret_emri", bolge: dugum.id, mal: "ekmek", yon: "ithalat", oranSaat: 10_000 });
    s.calistirKadar(2 * GUN);
    expect(() => malIzdusumu(s.dunya, s.ic, REFERANS_MAL_SAYISI)).toThrow(/yeni mal etkisiz degil/);
  });

  it("mal sayısı izdüşümle aynıysa izdüşüm kimliktir (kopya yok)", () => {
    const eski = Simulasyon.olustur(p3Oncesi(miniVeriyiYukle()), 1);
    expect(malIzdusumu(eski.dunya, eski.ic, 14)).toBe(eski.dunya);
  });
});

describe("3. yükseltme yolu: P3 öncesi (14 mal) anlık görüntü, güncel içerikle gocIzni + yalnizEkleZorunlu ile yüklenir", () => {
  /** P3 öncesi içerikle yazılmış bot koşusu dünyası (lojistik akışları, oran_delta, ticaret emirleri) + anlık görüntü. */
  function eskiDunya(): { s: Simulasyon; metin: string; eskiVeri: Veri } {
    const eskiVeri = p3Oncesi(miniVeriyiYukle());
    const s = senaryoKos({ veri: eskiVeri, tohum: 21, sureMs: 3 * GUN, bulanikAdet: 6 }).sim;
    return { s, metin: anlikGoruntuOlustur(s, kuralSurumuHesapla(eskiVeri)), eskiVeri };
  }

  it("yüklenir: ihlal 0, yalnızEkle, eklenen tam olarak 10 mal (diğer uzaylar boş); sürüm farkı gocIzni ister", () => {
    const { s, metin } = eskiDunya();
    const veri = miniVeriyiYukle();
    // izin yoksa kural sürümü hatası (davranış değişmedi)
    expect(() => Simulasyon.anlikGoruntudenYukle(veri, metin, [])).toThrow(/kural surumu uyusmuyor/);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(veri, metin, [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(r.goc.kuralDegisti).toBe(true);
    expect(r.goc.yenidenIndekslendi).toBe(true); // tablo uzadı (indeksler kayma olmadan: yalnız sona ekleme)
    expect(r.goc.yalnizEkle).toBe(true);
    expect(r.goc.ihlaller).toEqual([]);
    expect(r.goc.eklenen).toEqual({ birlikler: [], mallar: YENI_MALLAR, tarimUrunleri: [], teknolojiler: [], tesisTurleri: [], yontemler: [] });
    // yeni mallar varsayılanla dolu: stok 0, fiyat = göç anında dünya kuruluşundaki pazar fiyatı; başlangıç kiti yeni mala verilmez
    for (const b of r.sim.dunya.bolgeler) {
      expect(b.stoklar).toHaveLength(24);
      for (const m of YENI_MALLAR) expect(b.stoklar[r.sim.ic.malIndeks[m]!]!.miktar).toBe(0);
    }
    expect(r.sim.ic.mallar).toHaveLength(24);
    expect(r.sim.dunya.zaman).toBe(s.dunya.zaman);
    // göç eski dünyanın özetini yazıldığı haliyle doğruladı; yeni özet dizi uzunluğu yüzünden farklı
    expect(r.goc.eskiDurumOzeti).toBe(anlikGoruntuCoz(metin).durumOzeti);
    expect(r.sim.durumOzeti()).not.toBe(r.goc.eskiDurumOzeti);
  }, 120_000);

  it("göç sonrası ileri koşu: 14 malın görünümü (stok, pazar, hazine, tüm kimlikli alanlar) göç edilmemiş koşuyla aynı; yeni mallar sıfır kalır", () => {
    const { s, metin } = eskiDunya();
    const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
    expect(eskiTablo.mallar).toHaveLength(14);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(miniVeriyiYukle(), metin, [], { gocIzni: true, yalnizEkleZorunlu: true });
    const hedef = s.dunya.zaman + 3 * GUN;
    s.calistirKadar(hedef);
    r.sim.calistirKadar(hedef);
    // yeni malların etkisizliği (denetimli izdüşüm hata vermemeli) ve izdüşüm
    expect(() => malIzdusumu(r.sim.dunya, r.sim.ic, REFERANS_MAL_SAYISI)).not.toThrow();
    expect(gocGorunumu(r.sim, eskiTablo)).toBe(gocGorunumu(s, eskiTablo));
    expect(r.sim.dunya.lojistik.cozumSayisi).toBe(s.dunya.lojistik.cozumSayisi + 1); // göçün tek meşru farkı: kirli işaretli bir ek çözüm
    for (const o of s.dunya.oyuncular) {
      expect(r.sim.dunya.oyuncular.find((x) => x.id === o.id)!.hazine).toEqual(o.hazine);
    }
  }, 120_000);

  it("mülk kipi: P3 öncesi mülk dünyası (kamu, kasa, ek yapılar) güncel içerikle göçer; ihlal 0; ileri koşu aynı", () => {
    const eskiVeri = p3Oncesi(mulkVeriTam());
    const s = mulkSim(["a", "b"], eskiVeri, 7);
    const hs = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a");
    tamam(s, "a", { tur: "ticaret_emri", bolge: `${hs[0]!.ilce.replace(/_merkez$|_tasra$/, "")}#a`, mal: "tahil", yon: "ihracat", oranSaat: 5_000 });
    s.calistirKadar(2 * GUN);
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(eskiVeri));
    const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(mulkVeriTam(), metin, [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(r.goc.ihlaller).toEqual([]);
    expect(r.goc.eklenen.mallar).toEqual(YENI_MALLAR);
    const hedef = s.dunya.zaman + 3 * GUN;
    s.calistirKadar(hedef);
    r.sim.calistirKadar(hedef);
    expect(gocGorunumu(r.sim, eskiTablo)).toBe(gocGorunumu(s, eskiTablo));
    expect(() => malIzdusumu(r.sim.dunya, r.sim.ic, REFERANS_MAL_SAYISI)).not.toThrow();
  }, 120_000);

  it("yükseltme yalnız SONA eklemedir: 24 mallı görüntü 14 mallı içerikle yüklenemez (kaldırılmış kimlik)", () => {
    const s = senaryoKos({ veri: miniVeriyiYukle(), tohum: 21, sureMs: GUN, bulanikAdet: 3 }).sim;
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(miniVeriyiYukle()));
    const g = anlikGoruntuCoz(metin);
    const eski = Simulasyon.olustur(p3Oncesi(miniVeriyiYukle()), 1);
    try {
      anlikGoruntuUyarla(g, eski.ic, kuralSurumuHesapla(p3Oncesi(miniVeriyiYukle())), { gocIzni: true });
      throw new Error("hata bekleniyordu");
    } catch (e) {
      expect(e).toBeInstanceOf(SerilestirmeHatasi);
      expect((e as SerilestirmeHatasi).message).toMatch(/kaldirilmis kimlik: un/);
    }
  }, 120_000);
});
