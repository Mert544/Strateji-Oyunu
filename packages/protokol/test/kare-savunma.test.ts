/** S1: savaşla aynı savunma hesabı, salt okuma ve gerçek komutun sahibine karesi. */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { PPM, savunmaGucuGorunumu } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { hucreSec, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, deltaUygula, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";

const BOLGE = "sn_m_ova#a";
const kare = (s: Simulasyon, o: string | null, baglam = true) => ilgiKaresiCikar(
  baglam ? s : { dunya: s.dunya, ic: s.ic },
  ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {},
);
function kur() {
  const v = mulkVeri((v) => {
    v.icerik.birlikler.find((b) => b.id === "piyade_tumeni")!.guc = 7;
    v.param.askeri.araziSavunmaPpm.kiyi = 500_001;
    v.param.askeri.araziSavunmaPpm.liman = 833_333;
    v.param.askeri.savunmaDurusuCarpaniPpm = 1_300_001;
  });
  const s = mulkSim(["a", "b"], v);
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: hucreSec(parselFiksturuYukle("mini-6"), "sn_m_ova_merkez", "kirsal", 1), sinif: "kirsal" });
  s.calistirKadar(s.dunya.zaman); // Test durumu yazılmadan önce bekleyen gerçek çözümü bitir.
  const b = s.dunya.bolgeler.find((b) => b.id === BOLGE)!;
  b.birlikler.fill(0);
  b.birlikler[s.ic.birlikIndeks["piyade_tumeni"]!] = 1;
  b.etiketler = ["kiyi", "liman"];
  b.ikmalKarsilanmaPpm = 333_333;
  return { s, b };
}

describe("S1 savunma okuması", () => {
  it("ikmal×en büyük tanımlı arazi×duruş önce yuvarlanır; geri çekilme 0'dır ve okuma dünya/RNG değiştirmez", () => {
    const { s, b } = kur();
    for (const [durus, durusPpm, guc] of [["normal", PPM, 1], ["savunma", 1_300_001, 2], ["geri_cekil", 0, 0]] as const) {
      b.savunma.durus = durus;
      const once = structuredClone(s.dunya);
      const g = savunmaGucuGorunumu(s.dunya, s.baglam, b.indeks);
      expect(g).toEqual({ hamGuc: 7, ikmalPpm: 333_333, araziPpm: 833_333, durusPpm, guc });
      // floor(333333×833333/PPM)=277777; savunmada floor(277777×1300001/PPM)=361110;
      // floor(7×361110/PPM)=2. Ham gücü her aşamada yuvarlamak yanlış olarak 1 verir.
      const k = kare(s, "a");
      expect(k.bolgeler.find((x) => x.id === BOLGE)!.ozel!.ordu!.savunma).toEqual(g);
      expect(savunmaGucuGorunumu(s.dunya, s.baglam, b.indeks)).toEqual(g);
      expect(kare(s, "a")).toEqual(k);
      expect(s.dunya.rng).toEqual(once.rng);
      expect(s.dunya).toEqual(once);
    }
    b.savunma.durus = "savunma";
    b.ikmalKarsilanmaPpm = 0;
    expect(savunmaGucuGorunumu(s.dunya, s.baglam, b.indeks)!.guc).toBe(0);
    b.ikmalKarsilanmaPpm = PPM;
    b.savunma.durus = "normal";
    b.etiketler = [];
    expect(savunmaGucuGorunumu(s.dunya, s.baglam, b.indeks)).toEqual({ hamGuc: 7, ikmalPpm: PPM, araziPpm: PPM, durusPpm: PPM, guc: 7 });
    expect(savunmaGucuGorunumu(s.dunya, s.baglam, -1)).toBeUndefined();
  });

  it("gerçek savunma emri owner snapshot ve delta değerini değiştirir; yabancıya ve bağlamsız/eski kareye özel değer gitmez", () => {
    const { s, b } = kur();
    b.ikmalKarsilanmaPpm = PPM;
    const once = kare(s, "a");
    const normal = once.bolgeler.find((x) => x.id === BOLGE)!.ozel!.ordu!.savunma!;
    tamam(s, "a", { tur: "savunma_emri", bolge: BOLGE, durus: "savunma" });
    const sonra = kare(s, "a");
    const savunma = sonra.bolgeler.find((x) => x.id === BOLGE)!.ozel!.ordu!.savunma!;
    expect(savunma).toEqual(savunmaGucuGorunumu(s.dunya, s.baglam, b.indeks));
    expect(savunma.guc).toBeGreaterThan(normal.guc);
    expect(savunma.durusPpm).toBe(1_300_001);
    expect(deltaUygula(once, kareFarki(once, sonra))).toEqual(sonra);
    const ret = ver(s, "b", { tur: "savunma_emri", bolge: BOLGE, durus: "geri_cekil" });
    expect(ret).toMatchObject({ tamam: false, hata: "bolge oyuncunun degil: sn_m_ova#a" });
    expect(b.savunma.durus).toBe("savunma");
    for (const o of ["b", null]) expect(kare(s, o).bolgeler.find((x) => x.id === BOLGE)!.ozel).toBeUndefined();
    expect(kare(s, "a", false).bolgeler.find((x) => x.id === BOLGE)!.ozel!.ordu).not.toHaveProperty("savunma");
    tamam(s, "a", { tur: "savunma_emri", bolge: BOLGE, durus: "geri_cekil" });
    expect(kare(s, "a").bolgeler.find((x) => x.id === BOLGE)!.ozel!.ordu!.savunma).toMatchObject({ hamGuc: 7, durusPpm: 0, guc: 0 });
    const eski = structuredClone(sonra);
    delete eski.bolgeler.find((x) => x.id === BOLGE)!.ozel!.ordu!.savunma;
    expect(IlgiKaresiSemasi.parse(eski)).toEqual(eski);
    expect(IlgiKaresiSemasi.parse(sonra)).toEqual(sonra);
  });
});
