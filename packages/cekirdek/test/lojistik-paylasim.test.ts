/**
 * Akışların yol dizileri paylaşılmamalı (sunucu S4 bulgusu): MCF önbellek kaydının `yol` dizisi akışa doğrudan verilirse
 * aynı dizi iki akışta (ya da akışta ve önbellekte) bulunur; `dunyaSerilestir` paylaşılan referansı reddeder ve anlık
 * görüntü alınamaz. Bot koşusunun her karar anında ve mülk kipinde bir yolu paylaşan işletmelerde denetlenir.
 */
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { dunyaSerilestir } from "../src/serilestir";
import { GUN } from "../src/tipler";
import type { Dunya } from "../src/tipler";
import { hucreSec, ikinciIlEkle, mulkSim, mulkVeri, tamam } from "./mulk-yardimci";
import { parselFiksturuYukle } from "@bolge/veri";
import { senaryoKos } from "./serilestir-yardimci";

function paylasilanYolSayisi(d: Dunya): number {
  const gorulen = new Set<number[]>();
  let n = 0;
  for (const a of d.lojistik.akislar) {
    if (gorulen.has(a.yol)) n++;
    gorulen.add(a.yol);
  }
  return n;
}

describe("akış yolları paylaşılmaz; dünya her an serileştirilebilir", () => {
  it("sentetik-50, 4 bot + bulanık komutlar, 6 gün: her karar anında paylaşılan yol yok ve dunyaSerilestir hata vermez", () => {
    let denetim = 0;
    senaryoKos({
      veri: varsayilanVeriyiYukle(),
      tohum: 2,
      sureMs: 6 * GUN,
      kararAni: (s) => {
        expect(paylasilanYolSayisi(s.dunya)).toBe(0);
        if (denetim++ % 4 === 0) expect(() => dunyaSerilestir(s.dunya)).not.toThrow();
      },
    });
    expect(denetim).toBeGreaterThan(20);
  }, 120_000);

  it("mülk kipi: bir merkezler arası yolu paylaşan iki işletme (aynı merkezin iki ili) ayrı yol dizileri alır", () => {
    const parsel = parselFiksturuYukle("mini-6");
    ikinciIlEkle(parsel, "sn_m_liman", "sn_m_liman2");
    const v = mulkVeri((x) => {
      x.parsel = parsel;
      x.param.mulk!.yeniOyuncu.hibe = 500_000_000;
    });
    const s = mulkSim(["a"], v);
    tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: hucreSec(parsel, "sn_m_ova_merkez", "kirsal", 4), sinif: "kirsal" });
    tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_liman_merkez", hucreler: hucreSec(parsel, "sn_m_liman_merkez", "kirsal", 1), sinif: "kirsal" });
    tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_liman2_merkez", hucreler: hucreSec(parsel, "sn_m_liman2_merkez", "kirsal", 1), sinif: "kirsal" });
    for (const k of [0, 2]) {
      tamam(s, "a", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler: hucreSec(parsel, "sn_m_ova_merkez", "kirsal", 2, k) });
    }
    tamam(s, "a", { tur: "ticaret_emri", bolge: "sn_m_liman#a", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    tamam(s, "a", { tur: "ticaret_emri", bolge: "sn_m_liman2#a", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    s.calistirKadar(3 * GUN);
    const tahil = s.ic.malIndeks["tahil"] as number;
    const uzak = s.dunya.lojistik.akislar.filter((a) => a.mal === tahil && a.yol.length > 0);
    expect(new Set(uzak.map((a) => a.hedef)).size).toBe(2);
    expect(paylasilanYolSayisi(s.dunya)).toBe(0);
    expect(() => dunyaSerilestir(s.dunya)).not.toThrow();
  });
});
