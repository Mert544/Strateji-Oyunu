/** S1: iki gerçek sondaj, eski kimliksiz kuyruk ve içerik göçü aynı ekonomik sonucu korur. */
import { expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { SAAT, sondajGorunumu, sondajOyuncuGorunumu } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Dunya, Komut, Simulasyon as SimT } from "@bolge/cekirdek";
import { Simulasyon } from "../../cekirdek/src/motor";
import { durumOzeti } from "../../cekirdek/src/ozet";
import { anlikGoruntuOlustur, dunyaSerilestir, kuralSurumuHesapla } from "../../cekirdek/src/serilestir";
import { anlikHazine, anlikMiktar } from "../../cekirdek/src/stok";
import { hucreSec, mulkSim, mulkVeri, tamam, ver } from "../../cekirdek/test/mulk-yardimci";
import { icerikGenislet } from "../../cekirdek/test/goc-yardimci";
import { IlgiKaresiSemasi, KomutSemasi, ilgiAlaniKur, ilgiKaresiCikar } from "../src/index";

const TOHUM = 3, ILCE = "sn_m_col_merkez", BOLGE = "sn_m_col#a", MAL = "silis";
const dugum = (s: SimT) => s.dunya.bolgeler.find((b) => b.id === BOLGE)!;
const miktar = (s: SimT, m: string) => anlikMiktar(dugum(s).stoklar[s.ic.malIndeks[m]!]!, s.dunya.zaman);
const gorunum = (s: SimT) => sondajGorunumu(s.dunya, s.ic, "a", BOLGE)!;
const teklif = (s: SimT) => gorunum(s).teklifler.find((x) => x.teklif.mal === MAL)!.teklif;
const kare = (s: SimT, o: string | null) => ilgiKaresiCikar(s, ilgiAlaniKur(s, s.dunya.bolgeler.map((_, i) => i), o), o, [], {});

function kur() {
  const v = mulkVeri((v) => {
    delete v.param.tarim;
    delete v.param.iklim;
    v.param.mulk!.yeniOyuncu.baslangicStok = { parca: 200_000, gida: 2_000_000 };
    v.param.mulk!.kamuSiparis!.etkin = false;
  });
  const s = mulkSim(["a", "b"], v, TOHUM);
  tamam(s, "a", { tur: "parsel_al", ilce: ILCE, sinif: "kirsal", hucreler: hucreSec(parselFiksturuYukle("mini-6"), ILCE, "kirsal", 1) });
  s.calistirKadar(s.dunya.zaman);
  return { s, v };
}

function retDegismez(s: SimT, o: string, k: Komut, neden?: RegExp) {
  s.calistirKadar(s.dunya.zaman);
  const once = dunyaSerilestir(s.dunya), gunluk = structuredClone(s.gunluk);
  const r = ver(s, o, k);
  expect(r.tamam).toBe(false);
  if (!r.tamam && neden) expect(r.hata).toMatch(neden);
  expect(dunyaSerilestir(s.dunya)).toBe(once);
  expect(s.gunluk).toEqual(gunluk);
}

function kopyala(s: SimT, v: CekirdekVeriPaketi) {
  const y = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
  expect(y.durumOzeti()).toBe(s.durumOzeti());
  expect(y.dunya.kuyruk).toEqual(s.dunya.kuyruk);
  return y;
}

it("S1 sondaj: iki ücretli iş doğal başarısız/başarılı sonucu ayırır; saf stale ret, legacy RNG, pending save/replay ve string kimlik göçü korunur", () => {
  const { s, v } = kur(), ilk = dugum(s).rezervIlk[s.ic.malIndeks[MAL]!]!;
  const once = dunyaSerilestir(s.dunya), q0 = teklif(s);
  expect(dunyaSerilestir(s.dunya)).toBe(once);
  expect(q0).toMatchObject({ mal: MAL, kullanilanHak: 0, hakTavani: 2, paraMili: 8_000_000, malMaliyeti: [["parca", 20_000]], olasilikPpm: 400_000 });
  const k: Komut = { tur: "arama_sondaji", bolge: BOLGE, mal: MAL, gorulenTeklif: q0 };
  expect(KomutSemasi.parse(k)).toEqual(k);
  retDegismez(s, "b", k);
  retDegismez(s, "a", { ...k, gorulenTeklif: { ...q0, paraMili: q0.paraMili + 1 } }, /sondaj teklifi degisti/);
  const bozuk = { ...k, gorulenTeklif: { ...q0, kullanilanHak: -1 } } as unknown as Komut;
  expect(KomutSemasi.safeParse(bozuk).success).toBe(false);
  retDegismez(s, "a", bozuk, /gecersiz sondaj teklifi/);
  const komutLegacy = kopyala(s, v);
  for (const y of [s, komutLegacy]) {
    for (let deneme = 1; deneme <= 2; deneme++) {
      const q = teklif(y), h = anlikHazine(y.dunya, "a"), st = q.malMaliyeti.map(([m]) => [m, miktar(y, m)] as const);
      // Süre tahmini donmuş guard'ın dışında; actual süre sunucudan gelir.
      tamam(y, "a", y === s ? { tur: "arama_sondaji", bolge: BOLGE, mal: MAL, gorulenTeklif: { ...q, sureMs: q.sureMs + 1 } } : { tur: "arama_sondaji", bolge: BOLGE, mal: MAL });
      expect(h - anlikHazine(y.dunya, "a")).toBe(q.paraMili);
      for (const [m, stok] of st) expect(stok - miktar(y, m)).toBe(q.malMaliyeti.find(([id]) => id === m)![1]);
      expect(dugum(y).kesifSayisi![y.ic.malIndeks[MAL]!]).toBe(deneme);
    }
    y.calistirKadar(y.dunya.zaman);
  }
  expect(komutLegacy.durumOzeti()).toBe(s.durumOzeti());
  retDegismez(s, "a", k, /sondaj teklifi degisti|kesif hakki bitti/);
  const isler = gorunum(s).isler;
  expect(isler).toHaveLength(2);
  expect(new Set(isler.map((i) => i.id)).size).toBe(2);
  for (const i of isler) {
    expect(i.id).toBe(JSON.stringify(["sondaj", BOLGE, MAL, i.deneme]));
    expect(i).toMatchObject({ sahip: "a", bolge: BOLGE, mal: MAL, evre: "suruyor" });
    expect(i.bitis - i.baslangic).toBe(i.odenenTeklif.sureMs);
    expect(i.sonuc).toBeUndefined();
  }
  const a = kare(s, "a");
  expect(a.bolgeler.find((b) => b.id === BOLGE)!.ozel!.sondaj).toEqual(gorunum(s));
  expect(a.oyuncu!.sondaj).toEqual(sondajOyuncuGorunumu(s.dunya, s.ic, "a"));
  for (const o of ["b", null]) {
    const c = kare(s, o);
    expect(c.bolgeler.find((b) => b.id === BOLGE)!.ozel).toBeUndefined();
    expect(c.oyuncu?.sondaj?.isler ?? []).toEqual([]);
  }
  const bitis = Math.max(...isler.map((i) => i.bitis));
  s.calistirKadar(Math.min(SAAT, bitis - 1));
  const yuklenen = kopyala(s, v), metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(v));
  // Eski kayıt fikstürü: ekonomik alanlara dokunmadan yalnız yeni iş metadata'sını kaldır.
  const eski = JSON.parse(metin) as { dunya: Dunya; durumOzeti: string };
  delete eski.dunya.sondajlar;
  for (const o of eski.dunya.kuyruk) if (o.veri.tur === "sondaj_bitti") delete o.veri.sondaj;
  eski.durumOzeti = durumOzeti(eski.dunya);
  const kimliksiz = Simulasyon.anlikGoruntudenYukle(v, JSON.stringify(eski));
  expect(sondajOyuncuGorunumu(kimliksiz.dunya, kimliksiz.ic, "a")!.isler).toEqual([]);
  const genis = icerikGenislet(v, "araya");
  const goc = Simulasyon.anlikGoruntudenYukleSonuclu(genis, metin, [], { gocIzni: true });
  expect(goc.goc.yenidenIndekslendi).toBe(true);
  expect(goc.sim.dunya.sondajlar).toEqual(s.dunya.sondajlar);
  for (const o of goc.sim.dunya.kuyruk) if (o.veri.tur === "sondaj_bitti") {
    expect(goc.sim.ic.mallar[o.veri.mal]!.id).toBe(MAL);
    expect(goc.sim.dunya.bolgeler[o.veri.bolge]!.id).toBe(BOLGE);
  }
  for (const y of [s, yuklenen, komutLegacy, kimliksiz, goc.sim]) y.calistirKadar(bitis);
  const sonuclar = gorunum(s).isler.sort((a, b) => a.deneme - b.deneme);
  expect(sonuclar[0]!.sonuc).toEqual({ basarili: false, ekMili: 0 });
  expect(sonuclar[1]!.sonuc!.basarili).toBe(true);
  expect(sonuclar[1]!.sonuc!.ekMili).toBeGreaterThan(0);
  const ek = sonuclar[1]!.sonuc!.ekMili;
  for (const y of [s, yuklenen, komutLegacy, kimliksiz, goc.sim]) {
    expect(dugum(y).rezervIlk[y.ic.malIndeks[MAL]!]).toBe(ilk + ek);
    expect(dugum(y).rezervKalan[y.ic.malIndeks[MAL]!]).toBe(ilk + ek);
    expect(y.dunya.rng.olay).toEqual(s.dunya.rng.olay);
    expect(anlikHazine(y.dunya, "a")).toBe(anlikHazine(s.dunya, "a"));
    expect(miktar(y, "parca")).toBe(miktar(s, "parca"));
  }
  expect(yuklenen.durumOzeti()).toBe(s.durumOzeti());
  expect(komutLegacy.durumOzeti()).toBe(s.durumOzeti());
  expect(goc.sim.dunya.sondajlar).toEqual(s.dunya.sondajlar);
  expect(sondajOyuncuGorunumu(kimliksiz.dunya, kimliksiz.ic, "a")!.isler).toEqual([]);
  const ekonomik = structuredClone(s.dunya); delete ekonomik.sondajlar;
  expect(dunyaSerilestir(kimliksiz.dunya)).toBe(dunyaSerilestir(ekonomik));
  const replay = Simulasyon.yenidenOynat(v, TOHUM, s.gunluk); replay.calistirKadar(bitis);
  expect(replay.durumOzeti()).toBe(s.durumOzeti());
  expect(IlgiKaresiSemasi.parse(kare(s, "a"))).toEqual(kare(s, "a"));
});
