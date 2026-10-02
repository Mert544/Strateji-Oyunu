/** L1: şebeke ve gerçekleşen ithalatın gerçek çözümden gelen özel gider dökümleri. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { carpBol, ithalatKirilimi, MILI, mulkOyuncuBul, SAAT, ticaretCarpanlari } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { g6Dunya, g6MulkVeri, G6Yerlestirici } from "../../cekirdek/test/g6-yardimci";
import { bitisikGrup, mulkSim, tamam } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const kare = (s: Simulasyon, o: string | null, baglam = true) => ilgiKaresiCikar(
  baglam ? s : { dunya: s.dunya, ic: s.ic },
  ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {},
);
const isletmeler = (s: Simulasyon, o: string) => kare(s, o).bolgeler.filter((b) => b.ozel?.isletme !== undefined);

describe("L1 özel gider dökümleri", () => {
  it("gerçek tesis çözümünün şebeke gideri ve ithalat kırılımı çekirdeğin ayrı para akışlarıyla eşleşir", () => {
    const s = g6Dunya({
      kur: (y) => { y.yerlestir("gida_fabrikasi", "degirmen"); y.yerlestir("gida_fabrikasi", "ekmek_firini"); },
      ithalat: [{ mal: "tahil", oranSaat: 1003 }],
    });
    const k = kare(s, "a");
    const b = isletmeler(s, "a")[0]!;
    const d = s.dunya.bolgeler[b.i]!;
    const oz = b.ozel!;
    const para = mulkOyuncuBul(s.dunya, "a")!.paraAkisi!;
    expect(oz.sebekeGiderleri!.map((g) => g.mal)).toEqual(["elektrik", "yakit"]);
    expect(oz.sebekeGiderleri!.reduce((n, g) => n + g.bedelMiliSaat, 0)).toBe(para.sebeke);
    expect(para.sebeke).toBeGreaterThan(0);
    const sb = s.ic.mulk!.sebeke!;
    for (const g of oz.sebekeGiderleri!) {
      const fiyat = g.mal === "elektrik" ? sb.elektrik!.birimFiyatMili : sb.stoksuz.find((x) => s.ic.mallar[x.mal]!.id === g.mal)!.birimFiyatMili;
      expect(g.birimFiyatMili).toBe(fiyat);
      expect(g.miktarMiliSaat).toBe(g.mal === "elektrik" ? d.elektrik!.sebekeMili : d.sebekeTuketim![g.mal]);
      expect(g.bedelMiliSaat).toBe(carpBol(g.miktarMiliSaat, fiyat, MILI));
    }
    expect(oz.ithalatGiderleri).toHaveLength(1);
    const g = oz.ithalatGiderleri![0]!;
    const emir = d.ticaretEmirleri.find((e) => e.yon === "ithalat")!;
    const sahip = s.dunya.oyuncular.find((o) => o.id === "a")!;
    const carp = ticaretCarpanlari(s.dunya, s.baglam, sahip, d.merkez!, d);
    const brut = carpBol(emir.gerceklesenSaat, s.dunya.pazar.fiyat[emir.mal]!, MILI);
    const kr = ithalatKirilimi(brut, carp);
    expect(g).toEqual({
      mal: "tahil", miktarMiliSaat: emir.gerceklesenSaat, birimFiyatMili: s.dunya.pazar.fiyat[emir.mal],
      malBedeliMiliSaat: brut, makasMiliSaat: kr.makas, limanPrimiMiliSaat: kr.prim,
      komisyonMiliSaat: kr.komisyon, vergiMiliSaat: kr.vergi, netBedelMiliSaat: kr.nakit,
    });
    expect(g.netBedelMiliSaat).toBe(para.ithalat);
    expect(g.komisyonMiliSaat).toBeGreaterThan(0); // G6 yardımcısında yeni oyuncu kalkanı kapalı.
    expect(g.netBedelMiliSaat).toBe(g.malBedeliMiliSaat + g.makasMiliSaat + g.limanPrimiMiliSaat + g.komisyonMiliSaat);
    expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
  });

  it("iki gerçek işletmedeki küçük tüketimler düğümde yuvarlanır; miktarları önce toplamak aynı gideri vermez", () => {
    const v = g6MulkVeri({}, (v) => {
      // Küçük gerçek tarifeyi çözücüye ver: düğüm bazındaki floor farkı görünür olsun.
      const y = v.icerik.yontemler.find((x) => x.id === "ekmek_firini")!;
      y.girdiler = { elektrik: 13, yakit: 1 };
      y.isci = 1;
      y.bakim = {};
      // İkinci işletme başlangıç kiti almaz; bu vaka yalnız tüketim yuvarlamasını sınar.
      v.icerik.tesisTurleri.find((x) => x.id === "gida_fabrikasi")!.insaMaliyeti = {};
    });
    const s = mulkSim(["a", "b"], v);
    new G6Yerlestirici(s, "a").yerlestir("gida_fabrikasi", "ekmek_firini");
    const f = parselFiksturuYukle("mini-6");
    tamam(s, "a", { tur: "yapi_yerlestir", ilce: "sn_m_liman_merkez", tesisTuru: "gida_fabrikasi", yontem: "ekmek_firini", hucreler: bitisikGrup(f, "sn_m_liman_merkez", "kirsal", 2), sinif: "kirsal" });
    s.calistirKadar(Math.max(...s.dunya.insaatlar.map((x) => x.bitis)) + 2 * SAAT);
    const dugumler = isletmeler(s, "a");
    expect(dugumler).toHaveLength(2);
    const giderler = dugumler.flatMap((b) => b.ozel!.sebekeGiderleri!);
    const toplam = giderler.reduce((n, g) => n + g.bedelMiliSaat, 0);
    expect(toplam).toBe(mulkOyuncuBul(s.dunya, "a")!.paraAkisi!.sebeke);
    const yakitlar = giderler.filter((g) => g.mal === "yakit");
    expect(yakitlar).toHaveLength(2);
    expect(yakitlar.map((g) => g.miktarMiliSaat)).toEqual([1, 1]);
    const ayri = yakitlar.reduce((n, g) => n + g.bedelMiliSaat, 0);
    const birlikte = carpBol(yakitlar.reduce((n, g) => n + g.miktarMiliSaat, 0), yakitlar[0]!.birimFiyatMili, MILI);
    expect(ayri).toBeLessThan(birlikte);
  });

  it("dökümler yalnız sahibine gider; bilinen sıfır [] ile bağlamsız ithalat ve eski sunucu alan yokluğu ayrılır", () => {
    const s = g6Dunya({ oyuncular: ["a", "b"], kur: (y, o) => { if (o === "a") y.yerlestir("gida_fabrikasi", "ekmek_firini"); } });
    const sahip = kare(s, "a");
    const a = isletmeler(s, "a")[0]!;
    for (const o of ["b", null]) expect(kare(s, o).bolgeler.find((b) => b.i === a.i)!.ozel).toBeUndefined();
    const bos = isletmeler(s, "b")[0]!.ozel!;
    expect(bos.sebekeGiderleri).toEqual([]);
    expect(bos.ithalatGiderleri).toEqual([]);
    const baglamsiz = kare(s, "a", false).bolgeler.find((b) => b.i === a.i)!.ozel!;
    expect(baglamsiz.sebekeGiderleri).toEqual(a.ozel!.sebekeGiderleri);
    expect(baglamsiz).not.toHaveProperty("ithalatGiderleri");
    const kapali = g6Dunya({ veri: g6MulkVeri({ sebeke: false }) });
    expect(isletmeler(kapali, "a")[0]!.ozel!.sebekeGiderleri).toEqual([]);
    const eski = structuredClone(sahip);
    for (const b of eski.bolgeler) if (b.ozel) { delete b.ozel.sebekeGiderleri; delete b.ozel.ithalatGiderleri; }
    expect(IlgiKaresiSemasi.parse(eski)).toEqual(eski);
    const eskiOzel = IlgiKaresiSemasi.shape.bolgeler.element.shape.ozel.unwrap().omit({ sebekeGiderleri: true, ithalatGiderleri: true });
    expect(eskiOzel.safeParse(a.ozel).success).toBe(true);
    expect(eskiOzel.parse(a.ozel)).not.toHaveProperty("sebekeGiderleri");
    expect(eskiOzel.parse(a.ozel)).not.toHaveProperty("ithalatGiderleri");
  });
});
