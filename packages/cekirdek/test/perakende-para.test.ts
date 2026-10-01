/**
 * G7-2 (sartname §6.6, §12, §7.1b, §16.2 `perakende-para`): yerel pazar para defteri.
 *  I1 korunum (musluk `yerelNpc` dahil; tohumlu rastgele koşu, her kontrol noktasında TAM eşitlik); I2 Σ oyuncu `dukkanGeliri` = `musluk.yerelNpc`; I3 hane bütçesi üst sınırı;
 *  I4 kasa girişleri yerel satıştan etkilenmez; I5 `d.pazar` (fiyat, oyuncuArzi, oyuncuTalebi) yerel satıştan etkilenmez; I6 nötrlük (sık/seyrek `paraUzlastir`);
 *  yuva satış sayacı (§7.1b) değişmezleri (i)-(iv); `ilkSatisT`; `yerelKarsilanmaPpm`.
 */
import { describe, expect, it } from "vitest";
import { paraUzlastir } from "../src/mulk/kasa";
import { yerelPazarCoz } from "../src/mulk/perakende";
import { kuyrukBas } from "../src/kuyruk";
import { sayacOlcekli } from "../src/paraSayac";
import { aralik, prngOlustur } from "../src/prng";
import type { Simulasyon } from "../src/motor";
import { DAKIKA, LAVABO_KALEMLERI, MUSLUK_KALEMLERI, PPM, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, ParaDurumu, ParaSayaci } from "../src/tipler";
import { bolgeBul, dukkanEkle, dukkanlar, perakendeVeri } from "./perakende-yardimci";
import { mulkSim, ver } from "./mulk-yardimci";

const OVA = "sn_m_ova_merkez";
const LIMAN = "sn_m_liman_merkez";
const OYUNCULAR = ["a", "b", "c"];

function veri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return perakendeVeri((v, pr) => {
    v.param.mulk!.araziVergisiHaftalikPpm = 100_000;
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 3_000_000, ekmek: 2_000_000, un: 1_500_000, tahil: 200_000 };
    pr.talep.ilceSinifiNufus = { kirsal: 6_000, kasaba: 6_000, sehir: 6_000 }; // dükkân kasasından büyük Q: stok ve kasa sınırı birlikte devrede
    duzenle?.(v);
  });
}

interface Korunum {
  hazine: bigint;
  kasa: bigint;
  lavabo: bigint;
  musluk: bigint;
}

/** Her şeyi d.zaman'a uzlaştırır; SAAT ölçekli kesin toplamlar (`yerelNpc` musluk kalemi dahil). */
function korunumOlc(s: Simulasyon): Korunum {
  const d = s.dunya;
  paraUzlastir(d, s.ic);
  const p = d.mulk!.para as ParaDurumu;
  let hazine = 0n;
  for (const o of d.oyuncular) hazine += BigInt(o.hazine.miktar) * BigInt(SAAT) + BigInt(o.hazine.artik);
  let kasa = 0n;
  for (const k of p.kasalar) {
    for (const kalem of Object.keys(k.giris) as (keyof typeof k.giris)[]) kasa += sayacOlcekli(k.giris[kalem] as ParaSayaci);
    kasa -= BigInt(k.cikisOyuncu + k.cikisNpc) * BigInt(SAAT);
  }
  let lavabo = 0n;
  for (const k of LAVABO_KALEMLERI) lavabo += sayacOlcekli(p.lavabo[k]);
  if (p.lavabo.sebeke !== undefined) lavabo += sayacOlcekli(p.lavabo.sebeke);
  let musluk = 0n;
  for (const k of MUSLUK_KALEMLERI) musluk += sayacOlcekli(p.musluk[k]);
  if (p.musluk.yerelNpc !== undefined) musluk += sayacOlcekli(p.musluk.yerelNpc);
  return { hazine, kasa, lavabo, musluk };
}

function korunumTutar(s: Simulasyon, nerede: string): Korunum {
  const k = korunumOlc(s);
  if (k.hazine + k.kasa + k.lavabo !== k.musluk) throw new Error(`para korunumu bozuldu (${nerede}, t=${s.dunya.zaman}): ${k.hazine} + ${k.kasa} + ${k.lavabo} != ${k.musluk}`);
  return k;
}

const ILCELER = [
  { id: OVA, il: "sn_m_ova" },
  { id: LIMAN, il: "sn_m_liman" },
];
const MALLAR = ["gida", "ekmek", "un", "tahil"];

/** Dünyayı kurar: her oyuncuya ayrı dükkân (iki ilçeye dağılmış, karışık raf ve kademe). `dukkan = false`: dükkânsız karşıt koşu. */
function kur(dukkan: boolean, tohum: number): Simulasyon {
  const s = mulkSim(OYUNCULAR, veri(), tohum);
  if (dukkan) {
    dukkanEkle(s, "a", [{ mal: "gida", fiyat: 1 }, { mal: "ekmek", fiyat: 3 }, { mal: "un", fiyat: 2 }], "bakkal", 0, OVA);
    dukkanEkle(s, "b", [{ mal: "ekmek", fiyat: 2 }, { mal: "gida", fiyat: 2 }], "bakkal", 0, OVA);
    dukkanEkle(s, "c", [{ mal: "ekmek", fiyat: 0 }, { mal: "un", fiyat: 2 }], "firin", 0, LIMAN);
  }
  return s;
}

/**
 * Tohumlu rastgele koşu (komutlar yalnız ticaret emri ve ödül: dükkân durumu komutla değişmez); `kontrol` kontrol noktalarında korunumu denetler.
 * Aynı tohum aynı komut dizisini verir (dükkânlı ve dükkânsız koşu AYNI komutları alır).
 */
function kos(s: Simulasyon, tohum: number, adim: number, kontrol: boolean): void {
  const rng = prngOlustur(tohum, "perakende-para");
  for (let i = 0; i < adim; i++) {
    s.calistirKadar(s.dunya.zaman + (aralik(rng, 90) + 1) * DAKIKA);
    const kontrolMu = aralik(rng, 3) === 0; // her iki koşuda AYNI çekim sayısı (aynı komut dizisi)
    if (kontrol && kontrolMu) korunumTutar(s, `adim ${i}`);
    const o = OYUNCULAR[aralik(rng, OYUNCULAR.length)] as string;
    const secim = aralik(rng, 4);
    const c = ILCELER[aralik(rng, ILCELER.length)] as (typeof ILCELER)[number];
    const mal = MALLAR[aralik(rng, MALLAR.length)] as string;
    const yon = aralik(rng, 2) === 0 ? "ithalat" : "ihracat";
    const oranSaat = (1 + aralik(rng, 40)) * 1000;
    if (secim <= 1) ver(s, o, { tur: "ticaret_emri", bolge: `${c.il}#${o}`, mal, yon, oranSaat });
  }
}

describe("I1 korunum: Σ hazine + Σ kasa + Σ lavabo = Σ musluk (yerelNpc dahil)", () => {
  for (const tohum of [11, 2024, 90210]) {
    it(`tohumlu rastgele koşu (tohum ${tohum}), dükkânlı: her kontrol noktasında tam eşitlik; yerel gelir GERÇEKTEN akar`, () => {
      const s = kur(true, tohum);
      kos(s, tohum, 100, true);
      const son = korunumTutar(s, "son");
      const p = s.dunya.mulk!.para!;
      expect(p.musluk.yerelNpc).toBeDefined();
      expect(sayacOlcekli(p.musluk.yerelNpc!)).toBeGreaterThan(0n);
      expect(son.musluk).toBeGreaterThan(sayacOlcekli(p.musluk.yerelNpc!)); // hibe de var
      expect(p.lavabo.isletme.n).toBeGreaterThan(0); // dükkân gideri isletme lavabosunda
    });
  }

  it("negatif kontrol: korunum toplayıcısı yerelNpc'yi atlasaydı eşitlik BOZULURDU (toplayıcı duyarlı)", () => {
    const s = kur(true, 5);
    kos(s, 5, 40, false);
    paraUzlastir(s.dunya, s.ic);
    const tam = korunumOlc(s);
    const yerel = sayacOlcekli(s.dunya.mulk!.para!.musluk.yerelNpc!);
    expect(yerel).toBeGreaterThan(0n);
    expect(tam.hazine + tam.kasa + tam.lavabo).toBe(tam.musluk);
    expect(tam.hazine + tam.kasa + tam.lavabo).not.toBe(tam.musluk - yerel);
  });
});

describe("I2: Σ oyuncu dukkanGeliri = musluk.yerelNpc (SAAT ölçekli); ilkSatisT", () => {
  it("üç oyuncunun kümülatif dükkân geliri toplamı musluk kalemine eşit; her oyuncunun ilkSatisT ilk gelirden önce/anında yazıldı", () => {
    const s = kur(true, 21);
    kos(s, 21, 60, false);
    paraUzlastir(s.dunya, s.ic);
    const d = s.dunya;
    let toplam = 0n;
    for (const mo of d.mulk!.oyuncular) {
      expect(mo.dukkanGeliri).toBeDefined();
      toplam += sayacOlcekli(mo.dukkanGeliri!);
      expect(mo.ilkSatisT).toBeGreaterThanOrEqual(0);
      expect(mo.ilkSatisT).toBeLessThanOrEqual(d.zaman);
    }
    expect(toplam).toBe(sayacOlcekli(d.mulk!.para!.musluk.yerelNpc!));
    expect(toplam).toBeGreaterThan(0n);
  });

  it("dükkânsız dünyada ne yerelNpc ne dukkanGeliri ne ilkSatisT ne paraAkisi.yerel oluşur", () => {
    const s = kur(false, 21);
    kos(s, 21, 30, false);
    paraUzlastir(s.dunya, s.ic);
    expect(s.dunya.mulk!.para!.musluk.yerelNpc).toBeUndefined();
    for (const mo of s.dunya.mulk!.oyuncular) {
      expect(mo.dukkanGeliri).toBeUndefined();
      expect(mo.ilkSatisT).toBeUndefined();
      expect(mo.paraAkisi?.yerel).toBeUndefined();
    }
  });

  it("ilkSatisT bir kez yazılır: sonraki çözümlerde değişmez; satış oranı tekrar 0'a inip yükselse de ilk anı korur", () => {
    const s = kur(true, 3);
    s.calistirKadar(s.dunya.zaman + 2 * SAAT);
    const ilk = s.dunya.mulk!.oyuncular.find((o) => o.id === "a")!.ilkSatisT!;
    expect(ilk).toBeDefined();
    s.calistirKadar(s.dunya.zaman + 10 * SAAT);
    expect(s.dunya.mulk!.oyuncular.find((o) => o.id === "a")!.ilkSatisT).toBe(ilk);
  });
});

describe("I3: hane bütçesi üst sınırı", () => {
  it("her kontrol noktasında Σ paraAkisi.yerel <= Σ_(ilçe, mal) Q x R x k_max x (1 - esnaf tabanı); Q x R x k_max x 0,75 sınırı bağlayıcıya yakın değil ama aşılmaz", () => {
    const s = kur(true, 8);
    const pk = s.ic.mulk!.perakende!;
    const kmax = Math.max(...pk.p.fiyatKademeleriPpm);
    const taban = pk.p.esnaf.tabanPayPpm;
    let gordu = 0;
    for (let i = 0; i < 30; i++) {
      s.calistirKadar(s.dunya.zaman + 3 * SAAT);
      const y = yerelPazarCoz(s.dunya, s.baglam);
      if (y === null) continue;
      let sinir = 0;
      for (const [, mallar] of y.talep) {
        for (const [mal, q] of mallar) {
          const R = s.dunya.pazar.fiyat[s.ic.malIndeks[mal] as number] as number;
          sinir += Math.floor((Math.floor((Math.floor((q * R) / 1000) * kmax) / PPM) * (PPM - taban)) / PPM);
        }
      }
      let gelir = 0;
      for (const mo of s.dunya.mulk!.oyuncular) gelir += mo.paraAkisi?.yerel ?? 0;
      expect(gelir).toBeLessThanOrEqual(sinir + OYUNCULAR.length * 4); // her satır/ara bölme aşağı yuvarlar: kümülatif sapma <= birkaç mili
      if (gelir > 0) gordu++;
    }
    expect(gordu).toBeGreaterThan(10);
  });
});

describe("I4-I5: kasa girişleri ve dünya pazarı yerel satıştan etkilenmez", () => {
  it("aynı komut dizisi: dükkânlı ve dükkânsız koşuda kasalar[].giris AYNI; d.pazar (fiyat, oyuncuArzi, oyuncuTalebi) AYNI; ama lavabo.isletme ve hazine FARKLI (karşıt kanıt)", () => {
    const a = kur(true, 33);
    const b = kur(false, 33);
    kos(a, 33, 80, false);
    kos(b, 33, 80, false);
    paraUzlastir(a.dunya, a.ic);
    paraUzlastir(b.dunya, b.ic);
    expect(a.dunya.zaman).toBe(b.dunya.zaman);
    expect(JSON.stringify(a.dunya.mulk!.para!.kasalar)).toBe(JSON.stringify(b.dunya.mulk!.para!.kasalar));
    expect(JSON.stringify(a.dunya.pazar)).toBe(JSON.stringify(b.dunya.pazar));
    // karşıt kanıt: koşular gerçekten farklı (aksi halde eşitlik anlamsız)
    expect(sayacOlcekli(a.dunya.mulk!.para!.lavabo.isletme)).toBeGreaterThan(sayacOlcekli(b.dunya.mulk!.para!.lavabo.isletme));
    expect(a.durumOzeti()).not.toBe(b.durumOzeti());
    // ölçüt anlamlı: dünya pazarına oyuncu arzı/talebi GERÇEKTEN giriyor (ticaret emirleri), yalnız yerel satış girmiyor
    expect(a.dunya.pazar.oyuncuArzi.some((x) => x > 0) || a.dunya.pazar.oyuncuTalebi.some((x) => x > 0)).toBe(true);
    // kasa boş değil (ölçüt anlamlı)
    expect(a.dunya.mulk!.para!.kasalar.length).toBeGreaterThan(0);
  });
});

describe("I6: nötrlük (sık/seyrek paraUzlastir)", () => {
  it("kontrol noktalı ve kontrol noktasız koşu AYNI sayaçları, dukkanGeliri'ni ve yuva satış sayaçlarını verir", () => {
    const sikli = kur(true, 77);
    const seyrek = kur(true, 77);
    kos(sikli, 77, 80, true);
    kos(seyrek, 77, 80, false);
    expect(sikli.dunya.zaman).toBe(seyrek.dunya.zaman);
    expect(korunumTutar(sikli, "sikli")).toEqual(korunumTutar(seyrek, "seyrek"));
    const pa = sikli.dunya.mulk!.para!;
    const pb = seyrek.dunya.mulk!.para!;
    expect(sayacOlcekli(pa.musluk.yerelNpc!)).toBe(sayacOlcekli(pb.musluk.yerelNpc!));
    for (const mo of sikli.dunya.mulk!.oyuncular) {
      expect(sayacOlcekli(mo.dukkanGeliri!)).toBe(sayacOlcekli(seyrek.dunya.mulk!.oyuncular.find((x) => x.id === mo.id)!.dukkanGeliri!));
    }
    const yuvalar = (s: Simulasyon) => dukkanlar(s).map((x) => x.e.dukkan!.raf.map((y) => (y.satis === undefined ? null : sayacOlcekli(y.satis))));
    expect(yuvalar(sikli)).toEqual(yuvalar(seyrek));
  });
});

describe("yuva satış sayacı (§7.1b): (i) n azalmaz, (iii) bağımsız referans toplayıcı, (iv) satış > 0 <=> gelir > 0", () => {
  it("(i) saatlik örneklemede her yuvanın satis.n azalmaz; (iii) Σ_yuva satis (n x SAAT + a) = Σ_çözüm Σ_yuva satisOran x dt (olay olay referans toplayıcı)", () => {
    const s = kur(true, 12);
    const T = 40 * SAAT;
    let ref = 0n;
    const onceki = new Map<string, number>();
    while (s.dunya.zaman < T) {
      const bas = kuyrukBas(s.dunya.kuyruk);
      const hedef = Math.min(T, bas?.t ?? T);
      // [zaman, hedef] aralığında geçerli oranlar: çözüm yalnız olay işlenirken yazıldığı için aralık boyunca sabit
      let oran = 0;
      for (const { e } of dukkanlar(s)) for (const y of e.dukkan!.raf) oran += y.satisOran ?? 0;
      ref += BigInt(oran) * BigInt(hedef - s.dunya.zaman);
      s.calistirKadar(hedef);
      if (s.dunya.zaman % SAAT === 0) {
        for (const { e } of dukkanlar(s)) {
          e.dukkan!.raf.forEach((y, i) => {
            const k = `${e.id}|${i}`;
            const n = y.satis?.n ?? 0;
            expect(n).toBeGreaterThanOrEqual(onceki.get(k) ?? 0);
            onceki.set(k, n);
          });
        }
      }
    }
    paraUzlastir(s.dunya, s.ic);
    let toplam = 0n;
    for (const { e } of dukkanlar(s)) for (const y of e.dukkan!.raf) if (y.satis !== undefined) toplam += sayacOlcekli(y.satis);
    expect(ref).toBeGreaterThan(0n);
    expect(toplam).toBe(ref);
    // negatif kontrol: referansın kendisi duyarlı (bir saatlik oranı atlasaydı eşitlik bozulurdu)
    expect(toplam).not.toBe(ref - BigInt(1_000) * BigInt(SAAT));
  });

  it("(iv) tek dükkân ve sabit fiyatta satis > 0 <=> dukkanGeliri > 0; satışsız (mal yok) yuvada alan HİÇ oluşmaz", () => {
    const s = mulkSim(["a"], veri());
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 2 }, { mal: "sut", fiyat: 2 }, {}], "bakkal", 0, OVA); // sut: ağda yok -> satış yok
    s.calistirKadar(s.dunya.zaman + 12 * SAAT);
    paraUzlastir(s.dunya, s.ic);
    const raf = dukkanlar(s)[0]!.e.dukkan!.raf;
    expect(raf[0]!.satis!.n).toBeGreaterThan(0);
    expect(sayacOlcekli(s.dunya.mulk!.oyuncular[0]!.dukkanGeliri!)).toBeGreaterThan(0n);
    expect(raf[1]!.satis).toBeUndefined();
    expect(raf[1]!.satisOran).toBeUndefined();
    expect(raf[2]!.satis).toBeUndefined();
    expect(Object.keys(raf[2]!)).toEqual(["fiyat"]); // boş yuva: yalnız fiyat
    // karşıt: satış hiç olmayan dünyada (mal yok) gelir de yok
    const t = mulkSim(["a"], veri());
    dukkanEkle(t, "a", [{ mal: "sut" }], "bakkal", 0, OVA);
    t.calistirKadar(t.dunya.zaman + 12 * SAAT);
    paraUzlastir(t.dunya, t.ic);
    expect(dukkanlar(t)[0]!.e.dukkan!.raf[0]!.satis).toBeUndefined();
    expect(t.dunya.mulk!.oyuncular[0]!.dukkanGeliri).toBeUndefined();
  });

  it("mal değişince satis SIFIRLANMAZ; yuva boşaltılınca satisOran silinir (sonraki çözümde), satis kalır", () => {
    const s = mulkSim(["a"], veri());
    const e = dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 2 }], "bakkal", 0, OVA);
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    const y = e.dukkan!.raf[0]!;
    paraUzlastir(s.dunya, s.ic);
    const n1 = y.satis!.n;
    expect(n1).toBeGreaterThan(0);
    y.mal = "un"; // komut yolu G7-3'te; durum doğrudan değiştirilir
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    paraUzlastir(s.dunya, s.ic);
    expect(y.satis!.n).toBeGreaterThan(n1); // sıfırlanmadı, birikmeye devam
    delete y.mal;
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(s.dunya.zaman + 2 * SAAT);
    paraUzlastir(s.dunya, s.ic);
    const n2 = y.satis!.n;
    expect(y.satisOran).toBeUndefined();
    s.calistirKadar(s.dunya.zaman + 6 * SAAT);
    paraUzlastir(s.dunya, s.ic);
    expect(y.satis!.n).toBe(n2); // satış durdu, sayaç kaldı
  });
});

describe("yerelKarsilanmaPpm (stok yetmeyince) ve ilk satış anı", () => {
  it("stok kıt: bölgede yerelKarsilanmaPpm < PPM yazılır; stok bol: alan oluşmaz/silinir", () => {
    const kit = mulkSim(["a"], veri((v) => (v.param.mulk!.yeniOyuncu.baslangicStok = { gida: 5_000, ekmek: 5_000, un: 5_000 })));
    dukkanEkle(kit, "a", [{ mal: "ekmek" }, { mal: "gida" }], "bakkal", 0, OVA);
    kit.calistirKadar(kit.dunya.zaman + 6 * SAAT);
    const k = bolgeBul(kit, "a").yerelKarsilanmaPpm;
    expect(k).toBeDefined();
    expect(k!).toBeGreaterThanOrEqual(0);
    expect(k!).toBeLessThan(PPM);
    const bol = mulkSim(["a"], veri((v) => (v.param.mulk!.yeniOyuncu.baslangicStok = { gida: 2_000_000_000, ekmek: 2_000_000_000, un: 2_000_000_000 })));
    dukkanEkle(bol, "a", [{ mal: "ekmek" }, { mal: "gida" }], "bakkal", 0, OVA);
    bol.calistirKadar(bol.dunya.zaman + 6 * SAAT);
    expect(bolgeBul(bol, "a").yerelKarsilanmaPpm).toBeUndefined();
  });
});
