/**
 * G7-2 (sartname §6.3 "bit-exact no-op kanıtı", §13): dükkân yokken yerel pazar yolu HİÇBİR şey değiştirmez.
 *  (a) mülk dünyası: `mulk.perakende` bloğu var / yok, dükkân yok: AYNI durumOzeti (komut dizisi ve 6 gün); dükkân eklenince FARKLI (negatif kontrol);
 *  (b) katman 4a aritmetiği: `d4a = 0` iken `frD = PPM`, `dukkanGercek = 0`, `h.dukkan = 0`, düğümde `yerelKarsilanmaPpm` yok, `fr1..fr4` paylaşım dalında (stok kıt) hesaplanır;
 *  (c) bölge kipi (parsel yok): hiçbir yerel alan oluşmaz.
 * Bölge kipi ALTINLARI (regresyon/özet testleri) bu dosyada değil, mevcut altın testlerindedir ve DEĞİŞMEDEN yeşildir.
 */
import { miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { bolgeHesapla, bolgeVerimCoz } from "../src/ekonomi/uretim";
import { dunyaSerilestir } from "../src/serilestir";
import { DAKIKA, GUN, PPM } from "../src/tipler";
import type { BolgeDurumu, CekirdekVeriPaketi, Komut } from "../src/tipler";
import { aralik, prngOlustur } from "../src/prng";
import type { Simulasyon } from "../src/motor";
import { dukkanEkle, perakendeVeri } from "./perakende-yardimci";
import { bitisikCift, mulkSim, ver } from "./mulk-yardimci";
import { senaryoKos } from "./serilestir-yardimci";

const OVA = "sn_m_ova_merkez";
const LIMAN = "sn_m_liman_merkez";

/** Mülk dünyası + komut dizisi (parsel, yapı, ticaret); `veriKur`: içerik varyantı. Aynı tohum = aynı komutlar. */
function kos(veri: CekirdekVeriPaketi, dukkan: boolean): Simulasyon {
  const s = mulkSim(["a", "b"], veri, 9);
  if (dukkan) dukkanEkle(s, "a", [{ mal: "gida" }, { mal: "ekmek" }], "bakkal", 0, OVA);
  const rng = prngOlustur(9, "perakende-noop");
  const F = veri.parsel!;
  for (let i = 0; i < 60; i++) {
    s.calistirKadar(s.dunya.zaman + (aralik(rng, 120) + 1) * DAKIKA);
    const o = aralik(rng, 2) === 0 ? "a" : "b";
    const c = aralik(rng, 2) === 0 ? OVA : LIMAN;
    const il = c === OVA ? "sn_m_ova" : "sn_m_liman";
    const secim = aralik(rng, 3);
    let k: Komut | null = null;
    if (secim === 0) {
      const sahip = s.dunya.mulk!.hucreler.filter((h) => h.sahip === o && h.ilce === c).map((h) => h.id);
      if (sahip.length >= 2) {
        try {
          k = { tur: "tesis_insa_hucre", ilce: c, tesisTuru: ["ciftlik", "gida_fabrikasi", "ahir"][aralik(rng, 3)] as string, hucreler: bitisikCift(sahip) };
        } catch {
          k = null;
        }
      }
    } else if (secim === 1) {
      k = { tur: "ticaret_emri", bolge: `${il}#${o}`, mal: ["gida", "tahil", "celik"][aralik(rng, 3)] as string, yon: aralik(rng, 2) === 0 ? "ithalat" : "ihracat", oranSaat: (1 + aralik(rng, 30)) * 1000 };
    } else {
      const h = F.ilceler.find((x) => x.id === c)!.hucreler.filter((x) => x.uygun && x.sinif === "kirsal");
      const bas = aralik(rng, Math.max(1, h.length - 2));
      k = { tur: "parsel_al", ilce: c, hucreler: h.slice(bas, bas + 1 + aralik(rng, 2)).map((x) => x.id), sinif: "kirsal" };
    }
    if (k !== null) ver(s, o, k);
  }
  s.calistirKadar(6 * GUN);
  return s;
}

describe("(a) mülk dünyası: dükkân yokken perakende bloğu durumu DEĞİŞTİRMEZ", () => {
  it("blok yok = blok var (dükkân yok): aynı durumOzeti; koşu anlamlı (komutlar başarılı, yapı kuruldu)", () => {
    const blokVar = kos(perakendeVeri(), false);
    const blokYok = kos(perakendeVeri((v) => delete v.param.mulk!.perakende), false);
    expect(blokVar.durumOzeti()).toBe(blokYok.durumOzeti());
    const metin = dunyaSerilestir(blokVar.dunya);
    expect(blokVar.dunya.mulk!.hucreler.length).toBeGreaterThan(8); // parsel alımı oldu
    expect(metin).not.toMatch(/"(dukkan|satis|satisOran|yerelNpc|dukkanGeliri|ilkSatisT|yerelKarsilanmaPpm|markalar)"/);
    expect(metin).not.toMatch(/"yerel":/); // paraAkisi.yerel
  });

  it("negatif kontrol: aynı koşuya dükkân eklenince özet FARKLI (eşitlik boş değil) ve yerel alanlar OLUŞUR", () => {
    const blokVar = kos(perakendeVeri(), false);
    const dukkanli = kos(perakendeVeri(), true);
    expect(dukkanli.durumOzeti()).not.toBe(blokVar.durumOzeti());
    expect(dunyaSerilestir(dukkanli.dunya)).toContain('"yerelNpc"');
  });
});

describe("(b) katman 4a aritmetiği: d4a = 0", () => {
  it("bölge kipi bot koşusu: her sahipli düğümde h.dukkan 0, frD PPM, dukkanGercek 0 ve fr1..fr4 paylaşım dalında (stok kıt) bile aynı; yerelKarsilanmaPpm yok", () => {
    const sim = senaryoKos({ veri: miniVeriyiYukle(), tohum: 21, sureMs: 3 * GUN, bulanikAdet: 6 }).sim;
    const d = sim.dunya;
    const ctx = sim.baglam;
    const nm = sim.ic.mallar.length;
    let paylasimGordu = 0;
    for (const b of d.bolgeler) {
      if (b.sahip === null) continue;
      // stoku kıtlaştır: paylaşım dalı (acik > 0 ve stok < acik x ufuk) çalışsın
      const kopya = structuredClone(b.stoklar);
      for (const s of b.stoklar) s.miktar = 0;
      const h = bolgeHesapla(d, ctx, b.indeks);
      bolgeVerimCoz(ctx, h, new Array<number>(nm).fill(0));
      expect(h.dukkan.every((x) => x === 0)).toBe(true);
      expect(h.frD.every((x) => x === PPM)).toBe(true);
      expect(h.dukkanGercek.every((x) => x === 0)).toBe(true);
      if (h.fr1.some((x) => x < PPM) || h.fr3.some((x) => x < PPM) || h.fr4.some((x) => x < PPM)) paylasimGordu++;
      b.stoklar.splice(0, b.stoklar.length, ...kopya);
      expect((b as BolgeDurumu).yerelKarsilanmaPpm).toBeUndefined();
    }
    expect(paylasimGordu).toBeGreaterThan(0); // ölçüt anlamlı: paylaşım dalı gerçekten koştu
  });

  it("negatif kontrol: düğümde dükkân isteği varsa frD < PPM olabilir ve yerelKarsilanmaPpm yazılır (mülk dünyası, stok kıt)", () => {
    const s = mulkSim(["a"], perakendeVeri((v) => (v.param.mulk!.yeniOyuncu.baslangicStok = { gida: 3_000, ekmek: 3_000 })), 4);
    dukkanEkle(s, "a", [{ mal: "gida" }, { mal: "ekmek" }], "bakkal", 0, OVA);
    s.calistirKadar(4 * 3_600_000);
    const b = s.dunya.bolgeler.find((x) => x.sahip === "a" && x.merkez !== undefined)!;
    expect(b.yerelKarsilanmaPpm).toBeDefined();
    expect(b.yerelKarsilanmaPpm!).toBeLessThan(PPM);
  });
});

describe("(c) bölge kipi (parsel yok): yerel alan oluşmaz", () => {
  it("bot koşusu özetinde dükkân/yerel alanı yok; mulk durumu yok", () => {
    const sim = senaryoKos({ veri: miniVeriyiYukle(), tohum: 21, sureMs: 3 * GUN, bulanikAdet: 6 }).sim;
    expect(sim.dunya.mulk).toBeUndefined();
    expect(sim.ic.mulk).toBeUndefined();
    expect(dunyaSerilestir(sim.dunya)).not.toMatch(/"(dukkan|satis|satisOran|yerelNpc|dukkanGeliri|ilkSatisT|yerelKarsilanmaPpm|markalar)"/);
  });
});
