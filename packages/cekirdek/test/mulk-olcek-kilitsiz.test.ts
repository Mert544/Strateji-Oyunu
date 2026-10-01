/**
 * Mülk kipinde ÖLÇEK: KİLİT YOK, AYAK İZİ ÖLÇEKLE BÜYÜR (docs/06 §15.10; docs/arastirma/uretim-agi-genisletme.md §7.1.1, §7.5).
 * Veri tablosu ve doğrulayıcı, doğrudan M/L kurulum (hücre sayısı, biçim, bedel, süre), kilitlerin kalkması (yalnız mülk kipi),
 * yerinde yükseltme (ek hücre: boş, satın alınabilir, kamu, başkasının, tavan), atomiklik ve ARBİTRAJ YOK kanıtı.
 */
import { dogrulaParametreler, parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { carpliSure } from "../src/erkenOyun";
import { Simulasyon } from "../src/motor";
import { hucreBul, hucreFiyatiMili, ilceBul, isletmeBul, mulkOyuncuBul } from "../src/mulk";
import { dunyaCoz, dunyaSerilestir } from "../src/serilestir";
import { anlikHazine, anlikMiktar } from "../src/stok";
import { PPM, SAAT } from "../src/tipler";
import type { ArsaSinifi, CekirdekVeriPaketi, Komut, TesisDurumu } from "../src/tipler";
import { verTamam } from "./ekonomi-yardimci";
import { KAMU_KUCUK, kamuVeri } from "./kamu-yardimci";
import { mulkSim, mulkVeri, tamam, ver } from "./mulk-yardimci";
import { kurSanayi, tesisBul } from "./sanayi-yardimci";

const F = parselFiksturuYukle("mini-6");
const DAG = "sn_m_dag_merkez";
const GEC_T = 200 * SAAT; // erken oyun hızlandırması bitmiş (168 saat)

/** Yurtsuz, indirimsiz; bol hazine ve malzeme. `indirim` açık verilirse ilk 5 yapıda %30 indirim. */
function veri(duzenle?: (v: CekirdekVeriPaketi) => void, indirim = false): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 5_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 50_000_000, parca: 50_000_000, gida: 200_000 };
    if (indirim) {
      m.yeniOyuncu.ilkYapiIndirimPpm = 300_000;
      m.yeniOyuncu.indirimliYapiSayisi = 5;
    }
    duzenle?.(v);
  });
}

/** Fikstürde ilçenin uygun kırsal hücrelerinde, `ofsetler` biçiminde (başlangıç hücresine göre) kume. yerleşim; yerleşimler birbirinden ayrık sayılır. */
function sekil(ofsetler: readonly (readonly [number, number])[], kume = 0, ilce = DAG): string[] {
  const c = F.ilceler.find((x) => x.id === ilce)!;
  const uygun = new Set(c.hucreler.filter((h) => h.uygun && h.sinif === "kirsal").map((h) => h.id));
  const kullanildi = new Set<string>();
  let sayac = 0;
  for (const h of c.hucreler) {
    if (!uygun.has(h.id)) continue;
    const [x, y] = h.id.split(":").map(Number) as [number, number];
    const g = ofsetler.map(([dx, dy]) => `${x + dx}:${y + dy}`);
    if (!g.every((id) => uygun.has(id) && !kullanildi.has(id))) continue;
    for (const id of g) kullanildi.add(id);
    if (sayac++ === kume) return g;
  }
  throw new Error("uygun sekil yok");
}

const I5 = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] as const; // doğru
const L5 = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] as const; // L
const T5 = [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] as const; // T
const I4 = [[0, 0], [1, 0], [2, 0], [3, 0]] as const;

const al = (hucreler: string[], sinif: ArsaSinifi = "kirsal"): Komut => ({ tur: "parsel_al", ilce: DAG, hucreler, sinif });
const kur = (hucreler: string[], olcek?: 0 | 1 | 2): Komut => ({ tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", hucreler, ...(olcek === undefined ? {} : { olcek }) });
const yerlestir = (hucreler: string[], olcek?: 0 | 1 | 2): Komut => ({ tur: "yapi_yerlestir", ilce: DAG, tesisTuru: "mera", hucreler, sinif: "kirsal", ...(olcek === undefined ? {} : { olcek }) });
const yukselt = (s: Simulasyon, tesis: number, olcek: 1 | 2, ek?: string[], sinif?: ArsaSinifi): Komut => ({
  tur: "tesis_olcek_yukselt",
  bolge: dugumAdi(s),
  tesis,
  olcek,
  ...(ek === undefined ? {} : { ekHucreler: ek }),
  ...(sinif === undefined ? {} : { sinif }),
});

function dugumAdi(s: Simulasyon, oyuncu = "a"): string {
  const isl = isletmeBul(s.dunya, oyuncu, ilceBul(s.dunya, DAG)!.il)!;
  return s.dunya.bolgeler[isl.bolgeIndeksi]!.id;
}
function dugum(s: Simulasyon, oyuncu = "a") {
  return s.dunya.bolgeler[isletmeBul(s.dunya, oyuncu, ilceBul(s.dunya, DAG)!.il)!.bolgeIndeksi]!;
}
function tesisler(s: Simulasyon, oyuncu = "a"): TesisDurumu[] {
  return dugum(s, oyuncu).tesisler;
}
/** Hazine ve malzeme (çelik, parça) anlık görüntüsü: aynı anda komut öncesi/sonrası farkı bedeli verir. */
function bakiye(s: Simulasyon, oyuncu = "a"): { hazine: number; celik: number; parca: number } {
  const isl = isletmeBul(s.dunya, oyuncu, ilceBul(s.dunya, DAG)!.il);
  if (isl === undefined) {
    // işletme henüz yok: ilk işletme açılışta başlangıç kitini (depo kapasitesiyle sınırlı) alır
    const kap = s.ic.param.ekonomi.depoKapasitesi;
    const kit = (m: string) => Math.min(s.ic.mulk!.baslangicStok[s.ic.malIndeks[m]!]!, kap);
    return { hazine: anlikHazine(s.dunya, oyuncu), celik: kit("celik"), parca: kit("parca") };
  }
  const b = s.dunya.bolgeler[isl.bolgeIndeksi]!;
  const t = s.dunya.zaman;
  return { hazine: anlikHazine(s.dunya, oyuncu), celik: anlikMiktar(b.stoklar[s.ic.malIndeks["celik"]!]!, t), parca: anlikMiktar(b.stoklar[s.ic.malIndeks["parca"]!]!, t) };
}
function maliyet(s: Simulasyon, oyuncu: string, komut: Komut, t = s.dunya.zaman): { hazine: number; celik: number; parca: number } {
  const once = bakiye(s, oyuncu);
  tamam(s, oyuncu, komut, t);
  const sonra = bakiye(s, oyuncu);
  return { hazine: once.hazine - sonra.hazine, celik: once.celik - sonra.celik, parca: once.parca - sonra.parca };
}
function reddedilir(s: Simulasyon, oyuncu: string, k: Komut, parca: string): void {
  s.calistirKadar(s.dunya.zaman);
  const once = s.durumOzeti();
  const r = ver(s, oyuncu, k);
  expect(r.tamam, `${k.tur} reddedilmeliydi`).toBe(false);
  expect((r as { hata: string }).hata).toContain(parca);
  expect(s.durumOzeti()).toBe(once);
}
const topla = (x: { hazine: number; celik: number; parca: number }, y: { hazine: number; celik: number; parca: number }) => ({ hazine: x.hazine + y.hazine, celik: x.celik + y.celik, parca: x.parca + y.parca });

describe("veri: mulk.olcekHucre ve doğrulayıcı", () => {
  type Ham = { mulk: Record<string, Record<string, unknown> | unknown[]> } & Record<string, unknown>;
  const ham = () => structuredClone(varsayilanVeriyiYukle().param) as unknown as Ham;
  it("depodaki tablo geçerli: S = yapiYuva, M >= S, L >= M, en çok 5; örnekler 2/3/4, 3/4/5, 1/2/3", () => {
    const p = varsayilanVeriyiYukle().param.mulk!;
    for (const [tur, yuva] of Object.entries(p.yapiYuva)) {
      const o = p.olcekHucre[tur]!;
      expect(o, tur).toEqual([yuva, yuva + 1, yuva + 2]);
    }
    expect(p.olcekHucre["gida_fabrikasi"]).toEqual([2, 3, 4]);
    expect(p.olcekHucre["mera"]).toEqual([3, 4, 5]);
    expect(p.olcekHucre["celikhane"]).toEqual([3, 4, 5]);
    expect(p.olcekHucre["petrol_kuyusu"]).toEqual([1, 2, 3]);
    expect(p.olcekInsaSureCarpaniPpm).toEqual([1_000_000, 1_500_000, 2_000_000]);
    expect(dogrulaParametreler(ham()).gecerli).toBe(true);
  });
  it("doğrulayıcı: S yuvadan farklı, M < S, L < M, eksik tür, fazla tür, 5'ten büyük ve süre çarpanı hataları yakalanır", () => {
    const dene = (duzenle: (m: Ham["mulk"]) => void): string => {
      const p = ham();
      duzenle(p.mulk);
      const r = dogrulaParametreler(p);
      return r.gecerli ? "" : r.hatalar.join("\n");
    };
    expect(dene((m) => ((m.olcekHucre as Record<string, unknown>)["mera"] = [2, 3, 4]))).toContain("S ayak izi yapiYuva");
    expect(dene((m) => ((m.olcekHucre as Record<string, unknown>)["mera"] = [3, 2, 5]))).toContain("M ayak izi S'den");
    expect(dene((m) => ((m.olcekHucre as Record<string, unknown>)["mera"] = [3, 4, 3]))).toContain("L ayak izi M'den");
    expect(dene((m) => delete (m.olcekHucre as Record<string, unknown>)["mera"])).toContain("mulk.olcekHucre.mera");
    expect(dene((m) => ((m.olcekHucre as Record<string, unknown>)["yok_tur"] = [1, 2, 3]))).toContain("yapiYuva'da olmayan");
    expect(dene((m) => ((m.olcekHucre as Record<string, unknown>)["mera"] = [3, 4, 6]))).toContain("en fazla 5");
    expect(dene((m) => (m["olcekInsaSureCarpaniPpm"] = [1_000_000, 2_000_000, 1_500_000]))).toContain("azalamaz");
    expect(dene((m) => (m["olcekInsaSureCarpaniPpm"] = [900_000, 1_500_000, 2_000_000]))).toContain("S carpani");
    // M = S, L = M (sabit ayak izi) geçerlidir
    expect(dene((m) => ((m.olcekHucre as Record<string, unknown>)["mera"] = [3, 3, 3]))).toBe("");
  });
});

describe("doğrudan kurulum: kilit yok, ayak izi ve biçim", () => {
  it("teknolojisiz yeni oyuncu doğrudan L kurar (yalnız para ve hücre sınırı); tamamlanınca tesis L ve 5 hücreli", () => {
    const s = mulkSim(["a"], veri());
    expect(s.dunya.oyuncular.find((o) => o.id === "a")!.teknolojiler).toEqual([]);
    // İlçe seviyesi kilit değildir: seviye 0 ilçede de L kurulur.
    ilceBul(s.dunya, DAG)!.seviye = 0;
    const g = sekil(I5);
    tamam(s, "a", yerlestir(g, 2));
    const ins = s.dunya.insaatlar[0]!;
    expect(ins.olcek).toBe(2);
    expect(ins.hucreler).toEqual([...g].sort());
    s.calistirKadar(s.dunya.zaman + 10 * SAAT);
    const ts = tesisler(s)[0]!;
    expect(ts.olcek).toBe(2);
    expect(ts.hucreler).toEqual([...g].sort());
    for (const id of g) expect(hucreBul(s.dunya, id)!.tesis).toBe(ts.id);
  });
  it("S kurulumda inşaatta olcek alanı yazılmaz (olcek yok, 0 ve açık 0 aynı dünya)", () => {
    const g = sekil(I5).slice(0, 3);
    const durum = (komut: Komut): string => {
      const s = mulkSim(["a"], veri());
      tamam(s, "a", al(g));
      tamam(s, "a", komut);
      expect("olcek" in s.dunya.insaatlar[0]!).toBe(false);
      s.calistirKadar(s.dunya.zaman + 10 * SAAT);
      return s.durumOzeti();
    };
    expect(durum(kur(g))).toBe(durum(kur(g, 0)));
  });
  it("hücre sayısı olcekHucre'ye eşit olmalı; en çok 5; iletiler ölçeği söyler", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    tamam(s, "a", al(g));
    reddedilir(s, "a", kur(g.slice(0, 3), 1), "mera M olceginde 4 hucre kaplar (verilen 3)");
    reddedilir(s, "a", kur(g.slice(0, 4), 2), "mera L olceginde 5 hucre kaplar (verilen 4)");
    reddedilir(s, "a", kur(g, 1), "mera M olceginde 4 hucre kaplar (verilen 5)");
    reddedilir(s, "a", kur(g.slice(0, 2), 0), "mera 3 hucre kaplar (verilen 2)");
    reddedilir(s, "a", kur(g.slice(0, 4), 0), "en cok 3 hucre");
    reddedilir(s, "a", kur([...g, "999:999"], 2), "en cok 5 hucre");
    reddedilir(s, "a", kur(g, 0), "en cok 3 hucre");
  });
  it("olcek geçersiz değerler: 3, -1, 'M', null, 1.5 reddedilir", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    tamam(s, "a", al(g));
    for (const o of [3, -1, "M", null, 1.5]) reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", hucreler: g.slice(0, 4), olcek: o as unknown as 1 }, "gecersiz olcek");
  });
  it("biçim: bağlı I, L, T (5 hücre) kabul; çapraz, kopuk ve iki parçalı reddedilir", () => {
    for (const bicim of [I5, L5, T5]) {
      const s = mulkSim(["a"], veri());
      const g = sekil(bicim);
      tamam(s, "a", al(g));
      tamam(s, "a", kur(g, 2));
      expect(s.dunya.insaatlar).toHaveLength(1);
    }
    const s = mulkSim(["a"], veri());
    const g = sekil(I4);
    const [x, y] = g[0]!.split(":").map(Number) as [number, number];
    const capraz = [`${x}:${y}`, `${x + 1}:${y + 1}`, `${x + 2}:${y + 2}`, `${x + 3}:${y + 3}`].filter((id) => hucreBulFiks(id));
    tamam(s, "a", al(sekil(I5)));
    // 4 hücre: iki bitişik + iki bitişik ama aralarında boşluk (I5'in 0,1,3,4. hücresi) -> kopuk
    const i5 = sekil(I5);
    reddedilir(s, "a", kur([i5[0]!, i5[1]!, i5[3]!, i5[4]!], 1), "kenar-bitisik");
    if (capraz.length === 4) reddedilir(s, "a", kur(capraz, 1), "kenar-bitisik");
  });
  it("ek yapı (ambar) ölçeklenmez; M/L yalnız tesis türleri için", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    tamam(s, "a", al(g));
    reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "ambar", hucreler: g.slice(0, 2), olcek: 1 }, "ek yapi olceklenemez");
  });
});

function hucreBulFiks(id: string): boolean {
  return F.ilceler.find((c) => c.id === DAG)!.hucreler.some((h) => h.id === id && h.uygun);
}

describe("doğrudan kurulum: bedel ve süre", () => {
  const g = sekil(I5);
  /** Aynı hücrelerle S/M/L kurar; (bedel, süre) döndürür. `t`: komut anı. */
  function bedelVeSure(olcek: 0 | 1 | 2, indirim: boolean, t: number): { b: ReturnType<typeof bakiye>; sure: number; ins: number } {
    const s = mulkSim(["a"], veri(undefined, indirim));
    const n = [3, 4, 5][olcek]!;
    tamam(s, "a", al(g.slice(0, n)), t);
    const once = bakiye(s);
    tamam(s, "a", kur(g.slice(0, n), olcek), t);
    const sonra = bakiye(s);
    const i = s.dunya.insaatlar[0]!;
    return { b: { hazine: once.hazine - sonra.hazine, celik: once.celik - sonra.celik, parca: once.parca - sonra.parca }, sure: i.bitis - i.baslangic!, ins: i.id };
  }
  it("indirimsiz: para ve malzeme tür bedeli x 1 / 2,5 / 4,5 (olcekKademeleri.insaPpm); süre x 1 / 1,5 / 2 (erken oyun bitmiş)", () => {
    const v = veri();
    const tur = v.icerik.tesisTurleri.find((x) => x.id === "mera")!;
    const kademe = v.param.sanayi!.olcekKademeleri;
    const saat = v.param.mulk!.yapiInsaSaati!["mera"]!;
    const carp = [1_000_000, 2_500_000, 4_500_000];
    expect(kademe.map((k) => k.insaPpm)).toEqual(carp);
    for (const o of [0, 1, 2] as const) {
      const r = bedelVeSure(o, false, GEC_T);
      expect(r.b.hazine).toBe(Math.floor((tur.insaParasi * carp[o]!) / PPM));
      expect(r.b.celik).toBe(Math.floor((tur.insaMaliyeti["celik"]! * carp[o]!) / PPM));
      expect(r.b.parca).toBe(Math.floor((tur.insaMaliyeti["parca"]! * carp[o]!) / PPM));
      // hazine farkı yalnız bedeldir (arsa ayrı komutta alındı)
      expect(r.sure).toBe(Math.floor((saat * SAAT * [1_000_000, 1_500_000, 2_000_000][o]!) / PPM));
    }
  });
  it("erken oyun hızlandırması süreye ölçekten SONRA, bir kez uygulanır; para ve malzemeye uygulanmaz", () => {
    const s0 = bedelVeSure(0, false, 0);
    const s1 = bedelVeSure(1, false, 0);
    const s2 = bedelVeSure(2, false, 0);
    const saat = veri().param.mulk!.yapiInsaSaati!["mera"]!;
    expect(s0.sure).toBe(carpliSure(saat * SAAT, 100_000)); // t = 0: %10
    expect(s1.sure).toBe(carpliSure(Math.floor(saat * SAAT * 1.5), 100_000));
    expect(s2.sure).toBe(carpliSure(saat * SAAT * 2, 100_000));
    expect(s1.sure * 2).toBe(s0.sure * 3);
    expect(s2.sure).toBe(s0.sure * 2);
    // bedel erken oyunla değişmez
    expect(bedelVeSure(2, false, 0).b).toEqual(bedelVeSure(2, false, GEC_T).b);
  });
  it("ilk-yapı indirimi ÖLÇEKTEN BAĞIMSIZ sabit tutardır (S tabanından): M/L bedeli = ölçekli bedel - (S bedeli - indirimli S bedeli); 1 indirim hakkı harcar", () => {
    const v = veri();
    const tur = v.icerik.tesisTurleri.find((x) => x.id === "mera")!;
    const carp = [1_000_000, 2_500_000, 4_500_000];
    for (const o of [0, 1, 2] as const) {
      const r = bedelVeSure(o, true, GEC_T);
      const paraS = tur.insaParasi;
      const indirimTutari = paraS - Math.floor((paraS * 700_000) / PPM);
      expect(r.b.hazine).toBe(Math.floor((paraS * carp[o]!) / PPM) - indirimTutari);
      const celikS = tur.insaMaliyeti["celik"]!;
      expect(r.b.celik).toBe(Math.floor((celikS * carp[o]!) / PPM) - (celikS - Math.floor((celikS * 700_000) / PPM)));
    }
    const s = mulkSim(["a"], veri(undefined, true));
    const gg = sekil(I5);
    tamam(s, "a", al(gg));
    tamam(s, "a", kur(gg, 2));
    expect(s.dunya.insaatlar[0]!.indirimli).toBe(true);
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBe(1);
    // iptal: ödenenin %50'si iade, indirim hakkı geri
    const once = bakiye(s);
    tamam(s, "a", { tur: "insaat_iptal", insaat: s.dunya.insaatlar[0]!.id });
    expect(bakiye(s).hazine - once.hazine).toBe(Math.floor((s.ic.mulk!.p.insaatIptalIadePpm * (Math.floor((tur.insaParasi * 4_500_000) / PPM) - (tur.insaParasi - Math.floor((tur.insaParasi * 700_000) / PPM)))) / PPM));
    expect(mulkOyuncuBul(s.dunya, "a")!.indirimliYapi).toBeUndefined();
  });
  it("yapi_yerlestir: M/L arsa + yapı atomik; hücre sayısı artınca arsa bedeli artımlı fiyatla büyür; yetersiz hazinede hiçbir şey değişmez", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(L5);
    const ilce = ilceBul(s.dunya, DAG)!;
    const fiyat = [0, 1, 2, 3, 4].reduce((t, k) => t + hucreFiyatiMili(s.ic, ilce, "kirsal", k), 0);
    const once = bakiye(s);
    const tur = s.ic.tesisTurleri.find((x) => x.id === "mera")!;
    tamam(s, "a", yerlestir(g, 2));
    expect(once.hazine - bakiye(s).hazine).toBe(fiyat + Math.floor((tur.insaParasi * 4_500_000) / PPM));
    // hazine yetmezse: komut reddedilir, hücreler alınmaz
    const z = mulkSim(["a"], veri((x) => (x.param.mulk!.yeniOyuncu.hibe = 10_000_000)));
    const gz = sekil(L5);
    reddedilir(z, "a", yerlestir(gz, 2), "yetersiz");
    expect(hucreBul(z.dunya, gz[0]!)).toBeUndefined();
  });
});

/** S kur + tamamla; (S komutları toplamı, tesis, sim) döndürür. */
function sKur(s: Simulasyon, g: string[], olcek: 0 | 1 = 0) {
  const n = olcek === 0 ? 3 : 4;
  const arsa = maliyet(s, "a", al(g.slice(0, n)), GEC_T);
  const insa = maliyet(s, "a", kur(g.slice(0, n), olcek), GEC_T);
  s.calistirKadar(s.dunya.zaman + 30 * SAAT);
  return { toplam: topla(arsa, insa), ts: tesisler(s)[0]! };
}

describe("yerinde yükseltme (mülk): ek hücre ve arbitraj", () => {
  it("ARBİTRAJ YOK: 'S kur + yükselt' toplamı (arsa + para + malzeme) 'doğrudan M/L'ye birebir eşit; indirimli de; M üzerinden S->M->L de", () => {
    for (const indirim of [false, true]) {
      const g = sekil(I5);
      const dogrudan = (olcek: 1 | 2) => {
        const s = mulkSim(["a"], veri(undefined, indirim));
        const n = olcek === 1 ? 4 : 5;
        return maliyet(s, "a", yerlestir(g.slice(0, n), olcek), GEC_T);
      };
      // S -> M
      {
        const s = mulkSim(["a"], veri(undefined, indirim));
        const { toplam, ts } = sKur(s, g);
        const yuk = maliyet(s, "a", yukselt(s, ts.id, 1, [g[3]!], "kirsal"));
        expect(topla(toplam, yuk)).toEqual(dogrudan(1));
      }
      // S -> L
      {
        const s = mulkSim(["a"], veri(undefined, indirim));
        const { toplam, ts } = sKur(s, g);
        const yuk = maliyet(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!], "kirsal"));
        expect(topla(toplam, yuk)).toEqual(dogrudan(2));
      }
      // S -> M -> L
      {
        const s = mulkSim(["a"], veri(undefined, indirim));
        const { toplam, ts } = sKur(s, g);
        const y1 = maliyet(s, "a", yukselt(s, ts.id, 1, [g[3]!], "kirsal"));
        s.calistirKadar(s.dunya.zaman + 30 * SAAT);
        expect(ts.olcek).toBe(1);
        const y2 = maliyet(s, "a", yukselt(s, ts.id, 2, [g[4]!], "kirsal"));
        expect(topla(topla(toplam, y1), y2)).toEqual(dogrudan(2));
      }
    }
  });
  it("kasıtlı fark (belgelenmiş): yükseltme süresi ölçekten bağımsız yarım inşa süresidir; doğrudan kurulum süresi x1,5 / x2 (docs/06 §15.10)", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    tamam(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!], "kirsal"), GEC_T + 100 * SAAT);
    const i = s.dunya.insaatlar.find((x) => x.tur === "olcek")!;
    expect(i.bitis - i.baslangic!).toBe(s.ic.tesisTurleri.find((x) => x.id === "mera")!.insaSuresiSaat * SAAT * 0.5);
  });
  it("kendi BOŞ hücreleri: satın alma olmaz; inşaat sürerken hücreler işaretli, bitince tesisin ayak izine katılır", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    tamam(s, "a", al(g)); // hepsi önceden alındı
    tamam(s, "a", kur(g.slice(0, 3)));
    s.calistirKadar(s.dunya.zaman + 30 * SAAT);
    const ts = tesisler(s)[0]!;
    const once = bakiye(s);
    const mo = mulkOyuncuBul(s.dunya, "a")!;
    const arazi = mo.araziDegeriMili;
    tamam(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!])); // sinif gerekmez
    expect(mo.araziDegeriMili).toBe(arazi);
    const tur = s.ic.tesisTurleri.find((x) => x.id === "mera")!;
    expect(once.hazine - bakiye(s).hazine).toBe(Math.floor((tur.insaParasi * 3_500_000) / PPM));
    const ins = s.dunya.insaatlar.find((x) => x.tur === "olcek")!;
    expect(ins.hucreler).toEqual([g[3], g[4]].sort());
    expect(hucreBul(s.dunya, g[3]!)!.insaat).toBe(ins.id);
    // işaretli hücre başka işe verilemez
    reddedilir(s, "a", { tur: "parsel_birak", ilce: DAG, hucreler: [g[3]!] }, "bos degil");
    s.calistirKadar(ins.bitis);
    expect(s.dunya.insaatlar).toHaveLength(0);
    expect(ts.olcek).toBe(2);
    expect(ts.hucreler).toEqual([...g].sort());
    for (const id of g) {
      expect(hucreBul(s.dunya, id)!.tesis).toBe(ts.id);
      expect(hucreBul(s.dunya, id)!.insaat).toBeUndefined();
    }
  });
  it("SAHİPSİZ hücre atomik satın alınır (artımlı fiyat, sinif şart); arsa + yükseltme tek hazine denetiminden geçer", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    const ilce = ilceBul(s.dunya, DAG)!;
    const arsa = hucreFiyatiMili(s.ic, ilce, "kirsal", 0) + hucreFiyatiMili(s.ic, ilce, "kirsal", 1);
    const tur = s.ic.tesisTurleri.find((x) => x.id === "mera")!;
    const komut = yukselt(s, ts.id, 2, [g[3]!, g[4]!], "kirsal");
    // sinif yok -> ret
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!]), "sinif gerekli");
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!], "yok" as ArsaSinifi), "gecersiz arsa sinifi");
    const once = bakiye(s);
    const satilmis = ilce.satilmisHucre;
    tamam(s, "a", komut);
    expect(once.hazine - bakiye(s).hazine).toBe(arsa + Math.floor((tur.insaParasi * 3_500_000) / PPM));
    expect(ilce.satilmisHucre).toBe(satilmis + 2);
    expect(hucreBul(s.dunya, g[3]!)!.sahip).toBe("a");
  });
  it("hazine yetmezse atomik: arsa alınıp yükseltme olmaması engellenir (hücreler sahipsiz kalır, özet aynı); malzeme eksikse de aynı", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    const ilce = ilceBul(s.dunya, DAG)!;
    const arsa = hucreFiyatiMili(s.ic, ilce, "kirsal", 0) + hucreFiyatiMili(s.ic, ilce, "kirsal", 1);
    const para = Math.floor((s.ic.tesisTurleri.find((x) => x.id === "mera")!.insaParasi * 3_500_000) / PPM);
    // hazineyi arsa + para - 1'e indir (arsa tek başına karşılanır, birlikte karşılanamaz)
    const fazla = anlikHazine(s.dunya, "a") - (arsa + para - 1);
    expect(fazla).toBeGreaterThan(0);
    expect(s.ic.mulk).toBeDefined();
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    o.hazine.miktar -= fazla;
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!], "kirsal"), "yetersiz hazine");
    expect(hucreBul(s.dunya, g[3]!)).toBeUndefined();
    expect(hucreBul(s.dunya, g[4]!)).toBeUndefined();
    // malzeme eksik: çeliği boşalt
    o.hazine.miktar += fazla;
    dugum(s).stoklar[s.ic.malIndeks["celik"]!]!.miktar = 0;
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!], "kirsal"), "yetersiz stok");
    expect(hucreBul(s.dunya, g[3]!)).toBeUndefined();
  });
  it("reddedilenler: sayı yanlış, bitişik değil (çapraz/kopuk), başkasının hücresi, dolu hücre, başka ilçe; her biri dünyayı değiştirmez", () => {
    const s = mulkSim(["a", "b"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    const [x, y] = g[0]!.split(":").map(Number) as [number, number];
    reddedilir(s, "a", yukselt(s, ts.id, 1), "1 ek bitisik hucre ister");
    reddedilir(s, "a", yukselt(s, ts.id, 1, [g[3]!, g[4]!], "kirsal"), "1 ek hucre ister (verilen 2)");
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[3]!], "kirsal"), "2 ek hucre ister (verilen 1)");
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[3]!], "kirsal"), "tekrarlanan hucre");
    reddedilir(s, "a", yukselt(s, ts.id, 1, [g[4]!], "kirsal"), "kenar-bitisik"); // g[3] atlandı
    // çaprazdan: (x+2, y+1)'in köşegeninde (x+3,y+1) değil; (x+3, y+1) g[2]'ye köşegen, g[3]'e bitişik olabilir; gerçek çapraz: (x+3,y-1)? g[2]=(x+2,y) -> (x+3,y+1) çapraz ama g[3]=(x+3,y) var; bu yüzden S kümesine göre çaprazı tek hücreli S ile sınarız
    // dolu hücre: tesisin kendi hücresi
    reddedilir(s, "a", yukselt(s, ts.id, 1, [g[2]!], "kirsal"), "bos degil");
    // başkasının hücresi
    tamam(s, "b", al([g[3]!]), s.dunya.zaman);
    reddedilir(s, "a", yukselt(s, ts.id, 1, [g[3]!], "kirsal"), "hucre zaten sahipli");
    // olmayan hücre (fikstürde yok): satın alma planı reddeder
    reddedilir(s, "a", yukselt(s, ts.id, 1, [`${x + 3}:${y - 500}`], "kirsal"), "kenar-bitisik");
    // geçersiz kimlik
    reddedilir(s, "a", yukselt(s, ts.id, 1, ["abc"], "kirsal"), "gecersiz hucre kimligi");
  });
  it("çapraz komşu hücre ek olamaz: ek hücre, tesis hücrelerinden birine yalnız köşegenden değiyorsa reddedilir", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    const [x, y] = g[2]!.split(":").map(Number) as [number, number];
    reddedilir(s, "a", yukselt(s, ts.id, 1, [`${x + 1}:${y + 1}`], "kirsal"), "kenar-bitisik");
    reddedilir(s, "a", yukselt(s, ts.id, 1, [`${x + 1}:${y - 1}`], "kirsal"), "kenar-bitisik");
  });
  it("ayak izi tesisin GERÇEK hücre sayısından: M (4 hücre) -> L yalnız 1 ek hücre ister", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g, 1);
    expect(ts.olcek).toBe(1);
    expect(ts.hucreler).toHaveLength(4);
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[4]!, "1:1"], "kirsal"), "1 ek hucre ister (verilen 2)");
    tamam(s, "a", yukselt(s, ts.id, 2, [g[4]!], "kirsal"));
    s.calistirKadar(s.dunya.zaman + 30 * SAAT);
    expect(ts.olcek).toBe(2);
    expect(ts.hucreler).toHaveLength(5);
  });
  it("tavanlar: 72 hücre ve %25 sınırı yükseltmedeki SATIN ALMAYA da uygulanır; kendi boş hücresi saymaz", () => {
    // ilçe başına en çok 3 hücre: S (3 hücre) sonrası satın alınacak ek hücre reddedilir
    const s = mulkSim(["a"], veri((v) => (v.param.mulk!.ilceHucreTavani = 3)));
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    reddedilir(s, "a", yukselt(s, ts.id, 1, [g[3]!], "kirsal"), "ilcede en cok 3 hucre");
    // %25 sınırı: pay tavanı 3 hücreye indirilir (uygun 90 hücrenin %4'ü); S 3 hücreyle sınırdadır, ek satın alma reddedilir
    const z = mulkSim(["a"], veri((v) => (v.param.mulk!.ilcePayTavaniPpm = 40_000)));
    const { ts: tz } = sKur(z, g);
    expect(Math.floor((ilceBul(z.dunya, DAG)!.uygunHucre * 40_000) / PPM)).toBe(3);
    reddedilir(z, "a", yukselt(z, tz.id, 1, [g[3]!], "kirsal"), "ilcenin en cok");
    // kendi boş hücresi tavana yeni hücre eklemez: önceden alınmış (tavan içinde) hücreyle yükseltme geçer
    const y = mulkSim(["a"], veri((v) => (v.param.mulk!.ilceHucreTavani = 4)));
    tamam(y, "a", al(g.slice(0, 4)));
    tamam(y, "a", kur(g.slice(0, 3)));
    y.calistirKadar(y.dunya.zaman + 30 * SAAT);
    tamam(y, "a", yukselt(y, tesisler(y)[0]!.id, 1, [g[3]!]));
  });
  it("kamu arsası ek hücre olamaz (satılmaz); reddedilince dünya değişmez", () => {
    const s = mulkSim(["a"], kamuVeri(KAMU_KUCUK, (v) => {
      const m = v.param.mulk!;
      m.yeniOyuncu.hibe = 5_000_000_000;
      m.yeniOyuncu.baslangicStok = { celik: 50_000_000, parca: 50_000_000, gida: 200_000 };
      m.yeniOyuncu.yurtHucre = 0;
      m.yeniOyuncu.ilkYapiIndirimPpm = 0;
      m.yeniOyuncu.indirimliYapiSayisi = 0;
      m.yeniOyuncu.ayrilmisHucrePpm = 0;
    }));
    // Kamu hücresi K'ye bitişik, kamu olmayan, bağlı 3 hücre bul (ilçe: dağ merkezi ya da başka; ilk bulunan)
    let bulundu: { ilce: string; s3: string[]; kamu: string } | undefined;
    for (const ilce of s.ic.mulk!.fikstur.ilceler) {
      const kamuKumesi = new Set(s.dunya.mulk!.kamu!.find((k) => k.ilce === ilce.id)!.gruplar.length === 0 ? [] : kamuIdleri(s, ilce.id));
      const serbest = new Set(ilce.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamuKumesi.has(h.id)).map((h) => h.id));
      for (const k of kamuKumesi) {
        const [x, y] = k.split(":").map(Number) as [number, number];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n1 = `${x + dx}:${y + dy}`;
          if (!serbest.has(n1)) continue;
          const [a, b] = n1.split(":").map(Number) as [number, number];
          const komsu = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ex, ey]) => `${a + ex!}:${b + ey!}`).filter((id) => serbest.has(id) && id !== k);
          for (const n2 of komsu) {
            const [c, d] = n2.split(":").map(Number) as [number, number];
            const ucuncu = [...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ex, ey]) => `${a + ex!}:${b + ey!}`), ...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ex, ey]) => `${c + ex!}:${d + ey!}`)].find((id) => serbest.has(id) && id !== k && id !== n1 && id !== n2);
            if (ucuncu !== undefined) {
              bulundu = { ilce: ilce.id, s3: [n1, n2, ucuncu], kamu: k };
              break;
            }
          }
          if (bulundu) break;
        }
        if (bulundu) break;
      }
      if (bulundu) break;
    }
    expect(bulundu, "kamuya bitisik 3 serbest hucre bulunamadi").toBeDefined();
    const { ilce, s3, kamu } = bulundu!;
    const il = ilceBul(s.dunya, ilce)!.il;
    // 'mera' dağ etiketi ister; ilçe fark etmez: etiket yoksa 'gida_fabrikasi' (S 2 hücre) ile dene
    const kamuS: Komut = { tur: "yapi_yerlestir", ilce, tesisTuru: "gida_fabrikasi", hucreler: s3.slice(0, 2).sort(), sinif: "kirsal" };
    // 2 hücrelik S, kamu hücresine bitişik olması şart değil; ek hücre olarak KAMU hücresi verilir (bitişik olan hücreyle)
    const bit = (a: string, b: string) => {
      const [p, q] = a.split(":").map(Number) as [number, number];
      const [r, t] = b.split(":").map(Number) as [number, number];
      return Math.abs(p - r) + Math.abs(q - t) === 1;
    };
    const komsuS = s3.find((id) => bit(id, kamu))!;
    const digeri = s3.find((id) => id !== komsuS && bit(id, komsuS))!;
    tamam(s, "a", { ...kamuS, hucreler: [komsuS, digeri].sort() });
    s.calistirKadar(s.dunya.zaman + 30 * SAAT);
    const isl = isletmeBul(s.dunya, "a", il)!;
    const ts = s.dunya.bolgeler[isl.bolgeIndeksi]!.tesisler[0]!;
    expect(ts.hucreler).toHaveLength(2);
    reddedilir(s, "a", { tur: "tesis_olcek_yukselt", bolge: s.dunya.bolgeler[isl.bolgeIndeksi]!.id, tesis: ts.id, olcek: 1, ekHucreler: [kamu], sinif: "kirsal" }, "kamu arsasi");
  });
  it("eşzamanlı inşaat sınırı yükseltmeye de uygulanır (esZamanliInsaat = 2): iki süren hücreli inşaat varken yükseltme reddedilir", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    const iki = sekil(I5, 1);
    const uc = sekil(I5, 2);
    tamam(s, "a", al([...iki, ...uc]));
    tamam(s, "a", kur(iki.slice(0, 3)));
    tamam(s, "a", kur(uc.slice(0, 3)));
    reddedilir(s, "a", yukselt(s, ts.id, 1, [g[3]!], "kirsal"), "ayni anda en cok 2 insaat");
  });
  it("yükseltme iptali: ödenenin %50'si iade, hücre işareti kalkar, arsa kalır, tesis ölçeği değişmez; devam eden yükseltme ikinci kez başlatılamaz", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    tamam(s, "a", yukselt(s, ts.id, 1, [g[3]!], "kirsal"));
    reddedilir(s, "a", yukselt(s, ts.id, 2, [g[4]!], "kirsal"), "olcek yukseltmesi suruyor");
    const ins = s.dunya.insaatlar.find((x) => x.tur === "olcek")!;
    const once = bakiye(s);
    tamam(s, "a", { tur: "insaat_iptal", insaat: ins.id });
    const tur = s.ic.tesisTurleri.find((x) => x.id === "mera")!;
    expect(bakiye(s).hazine - once.hazine).toBe(Math.floor((Math.floor((tur.insaParasi * 1_500_000) / PPM) * s.ic.mulk!.p.insaatIptalIadePpm) / PPM));
    expect(hucreBul(s.dunya, g[3]!)!.sahip).toBe("a");
    expect(hucreBul(s.dunya, g[3]!)!.insaat).toBeUndefined();
    s.calistirKadar(ins.bitis + SAAT);
    expect(ts.olcek ?? 0).toBe(0);
    expect(ts.hucreler).toHaveLength(3);
  });
  it("süren yükseltme serileştirilir ve yüklenince aynı özet; tamamlanma yüklenen dünyada da aynı sonucu verir", () => {
    const s = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts } = sKur(s, g);
    tamam(s, "a", yukselt(s, ts.id, 2, [g[3]!, g[4]!], "kirsal"));
    const y = Simulasyon.yukle(veri(), dunyaCoz(dunyaSerilestir(s.dunya)));
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    s.calistirKadar(s.dunya.zaman + 30 * SAAT);
    y.calistirKadar(y.dunya.zaman + 30 * SAAT);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    expect(tesisler(y)[0]!.hucreler).toHaveLength(5);
  });
});

/** Dünyadaki kamu hücre kimlikleri (ilçe). */
function kamuIdleri(s: Simulasyon, ilce: string): string[] {
  const k = s.dunya.mulk!.kamu!.find((x) => x.ilce === ilce)!;
  const ids: string[] = [];
  const f = s.ic.mulk!.fikstur.ilceler.find((c) => c.id === ilce)!;
  for (const h of f.hucreler) if (h.uygun && kamuMu(s, ilce, h.id)) ids.push(h.id);
  void k;
  return ids;
}
import { kamuHucreMi } from "../src/mulk";
function kamuMu(s: Simulasyon, ilce: string, id: string): boolean {
  return kamuHucreMi(s.dunya, ilce, id);
}

describe("bölge kipi aynen: kilitler ve alanlar", () => {
  it("bölge kipinde L yükseltme hâlâ 'otomasyon' ister (hata iletisi aynı); ekHucreler / sinif bölge kipinde reddedilir; mülk kipinde teknoloji gerekmez", () => {
    // Mülk kipi: teknolojisiz L yükseltme (ek hücrelerle) başarılı
    const m = mulkSim(["a"], veri());
    const g = sekil(I5);
    const { ts: mts } = sKur(m, g);
    expect(m.dunya.oyuncular.find((o) => o.id === "a")!.teknolojiler).toEqual([]);
    tamam(m, "a", yukselt(m, mts.id, 2, [g[3]!, g[4]!], "kirsal"));
    // Bölge kipi: teknoloji şart
    const { s } = kurSanayi({
      oyuncular: { a: ["m_col"] },
      duzenle: (v) => {
        const b = v.harita.bolgeler.find((x) => x.id === "m_col")!;
        b.tesisler = ["santral", "silis_ocagi"];
        v.param.baslangic.hazine = 5_000_000_000;
      },
    });
    expect(s.ic.mulk).toBeUndefined();
    const ts = tesisBul(s, "m_col", "silis_ocagi");
    s.calistirKadar(s.dunya.zaman);
    const once = s.durumOzeti();
    const r = ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 2 });
    expect(r).toEqual({ tamam: false, hata: "olcek icin teknoloji acik degil: otomasyon" });
    const r2 = ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 1, ekHucreler: ["1:1"] });
    expect(r2).toEqual({ tamam: false, hata: "ekHucreler ve sinif yalniz mulk kipinde verilebilir" });
    expect(s.durumOzeti()).toBe(once);
    // olcek: 1 (teknolojisiz) bölge kipinde başarılıdır ve inşaatta mülk alanları yazılmaz
    verTamam(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 1 });
    const ins = s.dunya.insaatlar.find((i) => i.tur === "olcek")!;
    expect(Object.keys(ins).sort()).toEqual(["bitis", "bolge", "hedef", "id", "olcek", "sahip", "tur"]);
  });
});
