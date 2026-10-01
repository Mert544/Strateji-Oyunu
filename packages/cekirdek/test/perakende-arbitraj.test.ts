/**
 * G7-3 (sartname §12.6, §16.2 `perakende-arbitraj`): RİSKSİZ SINIRSIZ ARBİTRAJ YOK.
 *  NPC'den ithal edip rafa koymak meşru ticaret yönüdür; marj sınırlıdır: dükkân satış fiyatı en çok en yüksek kademe (1,15 R), ithalatın nakit çarpanı en az `mulk.kamuIthalatCarpaniPpm`
 *  (en iyi durumda 1,035 R civarı) ve satış hacmi talep/kasa ile sınırlıdır. Saatlik net marj `<= (1,15 - c) x R x hacim`.
 *  Burada ölçülen: (1) birim başına gelir hiçbir koşuda en yüksek kademe x R'yi aşmaz (komutla seçilen en yüksek kademede bile); (2) c >= 1,035; (3) buradan türeyen net marj sınırı;
 *  (4) kademe seçimi (komut) gelirin biriminde artış sağlar ama tavanı aşmaz (dükkân komutları fiyatı yalnız kademe olarak taşır: tutar alanı yok).
 */
import { describe, expect, it } from "vitest";
import { paraUzlastir } from "../src/mulk/kasa";
import { sayacOlcekli } from "../src/paraSayac";
import { mulkOyuncuBul } from "../src/mulk";
import { GUN, PPM, SAAT } from "../src/tipler";
import { dukkanlar } from "./perakende-yardimci";
import { dukkanliDunya, komutVeri } from "./perakende-komut-yardimci";
import { tamam } from "./mulk-yardimci";

function kos(kademe: number): { gelir: bigint; satis: bigint; rMax: number; c: number; kademePpm: number; kademeler: number[] } {
  const { s, dukkan } = dukkanliDunya(["a"], komutVeri((v) => {
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 3_000_000, ekmek: 9_000_000, un: 1_500_000, sut: 1_000_000 };
  }));
  const id = dukkan["a"]!.id;
  tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" });
  if (kademe !== 2) tamam(s, "a", { tur: "dukkan_fiyat", dukkan: id, yuva: 0, fiyat: kademe });
  const mi = s.ic.malIndeks["ekmek"]!;
  let rMax = 0;
  for (let h = 0; h < 48; h++) {
    s.calistirKadar(s.dunya.zaman + SAAT);
    rMax = Math.max(rMax, s.dunya.pazar.fiyat[mi] as number);
  }
  paraUzlastir(s.dunya, s.ic); // gelir ve yuva satış sayacını AYNI ana getirir (ikisi de tembel birikir)
  const mo = mulkOyuncuBul(s.dunya, "a")!;
  const pk = s.ic.mulk!.perakende!;
  const yuva = dukkanlar(s)[0]!.e.dukkan!.raf[0]!;
  return {
    gelir: mo.dukkanGeliri === undefined ? 0n : sayacOlcekli(mo.dukkanGeliri),
    satis: yuva.satis === undefined ? 0n : sayacOlcekli(yuva.satis),
    rMax,
    c: s.ic.mulk!.kamuIthalatCarpaniPpm,
    // kampanya kademesi (0) yalnız günde en çok 6 saat etkindir; kalan süre varsayılan kademe: tavan ikisinin büyüğüdür
    kademePpm: Math.max(pk.p.fiyatKademeleriPpm[kademe] as number, kademe === pk.p.kampanyaKademesi ? (pk.p.fiyatKademeleriPpm[pk.p.varsayilanFiyatKademesi] as number) : 0),
    kademeler: pk.p.fiyatKademeleriPpm,
  };
}

describe("arbitraj: dükkân satış fiyatı en çok en yüksek kademe x R; ithalat çarpanı en az 1,035", () => {
  it("birim gelir <= kademe x R (her kademede, 2 gün); en yüksek kademe 1,15; ithalatın nakit çarpanı c >= 1,035; net marj <= (1,15 - c) x R x hacim", () => {
    const sonuclar = [0, 1, 2, 3].map((k) => ({ k, ...kos(k) }));
    const SAAT_B = BigInt(SAAT);
    for (const r of sonuclar) {
      expect(r.satis, `kademe ${r.k}: satış oldu (ölçüt anlamlı)`).toBeGreaterThan(0n);
      // gelir (mili-₺ x SAAT ölçekli) <= satış (mili-birim x SAAT ölçekli) x R x kademe / (PPM x 1000)
      const ust = (r.satis * BigInt(r.rMax) * BigInt(r.kademePpm)) / (BigInt(PPM) * 1000n);
      expect(r.gelir <= ust, `kademe ${r.k}: gelir ${r.gelir / SAAT_B} > tavan ${ust / SAAT_B}`).toBe(true);
      expect(r.gelir, `kademe ${r.k}: gelir > 0`).toBeGreaterThan(0n);
    }
    const enYuksek = Math.max(...sonuclar[0]!.kademeler);
    expect(enYuksek).toBe(1_150_000);
    const c = sonuclar[0]!.c;
    expect(c).toBeGreaterThanOrEqual(1_035_000); // en iyi durum (anlaşma + ticaret ofisi): şartname §12.6
    // net marj üst sınırı: gelir - c x R x hacim <= (1,15 - c) x R x hacim
    const r3 = sonuclar[3]!;
    const hacimR = (r3.satis * BigInt(r3.rMax)) / 1000n;
    const marj = r3.gelir - (hacimR * BigInt(c)) / BigInt(PPM);
    const marjUst = (hacimR * BigInt(enYuksek - c)) / BigInt(PPM);
    expect(marj <= marjUst).toBe(true);
    expect(marjUst).toBeLessThanOrEqual((hacimR * 115_000n) / BigInt(PPM)); // <= 0,115 R x hacim
    // kademe geliri sıralı (yüksek kademe birim başına daha çok), ama hiçbiri tavanı aşmadı
    const birim = (r: (typeof sonuclar)[number]): number => Number((r.gelir * 1_000_000n) / (r.satis === 0n ? 1n : r.satis));
    expect(birim(sonuclar[3]!)).toBeGreaterThan(birim(sonuclar[0]!));
    void GUN;
  });
});
