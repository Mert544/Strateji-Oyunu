/**
 * Mülk kipi (S3) determinizm, serileştirme, yükleme ve yeniden oynatma: tohumlu rastgele mülk komut dizisi (çoğu geçerli,
 * bir kısmı geçersiz: sahipli/uygunsuz hücre, sınır aşımı, yanlış yuva, yabancı inşaat iptali...) 3 oyuncu, 6 gün.
 */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { aralik, prngOlustur } from "../src/prng";
import { anlikGoruntuOlustur, anlikGoruntuOlusturOzetli, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla, SerilestirmeHatasi } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { ArsaSinifi, CekirdekVeriPaketi, DamgaliKomut, Komut, Ms, PrngDurumu } from "../src/tipler";
import { mulkVeri } from "./mulk-yardimci";

const OYUNCULAR = ["a", "b", "c"];
const YAPILAR = ["ciftlik", "ahir", "mera", "sulama_kanali", "gida_fabrikasi", "santral", "komur_ocagi", "rafineri"];

function sec<T>(r: PrngDurumu, l: readonly T[]): T {
  return l[aralik(r, l.length)] as T;
}

/** `baslangic` hücresinden başlayıp `adet` kenar-bitişik hücreye kadar büyüyen küme (bulunamazsa daha küçük kalır: geçersiz komut da senaryonun parçasıdır). */
function komsuKume(hucreler: readonly string[], baslangic: string, adet: number): string[] {
  const kume = [baslangic];
  while (kume.length < adet) {
    const komsu = hucreler.find((h) => !kume.includes(h) && kume.some((k) => {
      const [x, y] = k.split(":").map(Number) as [number, number];
      const [hx, hy] = h.split(":").map(Number) as [number, number];
      return Math.abs(x - hx) + Math.abs(y - hy) === 1;
    }));
    if (komsu === undefined) break;
    kume.push(komsu);
  }
  return kume;
}

/** Senaryonun komut dizisi (zaman artan); geçerlilik uygulamada belirlenir. Sim'e bakarak (hücre sahipliği) üretilir. */
function sonrakiKomut(r: PrngDurumu, veri: CekirdekVeriPaketi, s: Simulasyon, oyuncu: string): Komut {
  const f = veri.parsel!;
  const ilce = sec(r, f.ilceler);
  const zar = aralik(r, 10);
  const benimHucreler = s.dunya.mulk!.hucreler.filter((h) => h.sahip === oyuncu && h.tesis === undefined && h.insaat === undefined);
  if (zar < 4) {
    const adet = 1 + aralik(r, aralik(r, 8) === 0 ? 30 : 4);
    const bas = aralik(r, ilce.hucreler.length);
    const hucreler = ilce.hucreler.slice(bas, bas + adet).map((h) => h.id);
    const sinif: ArsaSinifi = aralik(r, 6) === 0 ? sec(r, ["kirsal", "kasaba", "sehir"] as const) : (ilce.hucreler[bas]?.sinif ?? "kirsal");
    return { tur: "parsel_al", ilce: aralik(r, 12) === 0 ? "yok_ilce" : ilce.id, hucreler, sinif };
  }
  if (zar < 7 && benimHucreler.length > 0) {
    const h0 = sec(r, benimHucreler);
    const ayni = benimHucreler.filter((h) => h.ilce === h0.ilce).map((h) => h.id);
    const yapi = sec(r, YAPILAR);
    const adet = aralik(r, 4) === 0 ? 1 + aralik(r, 3) : (veri.param.mulk!.yapiYuva[yapi] ?? 1);
    const bas = aralik(r, ayni.length);
    return { tur: "tesis_insa_hucre", ilce: h0.ilce, tesisTuru: yapi, hucreler: komsuKume(ayni, ayni[bas] as string, adet) };
  }
  if (zar === 7) return { tur: "insaat_iptal", insaat: s.dunya.insaatlar.length > 0 && aralik(r, 2) === 0 ? sec(r, s.dunya.insaatlar).id : 999_999 };
  if (zar === 8) {
    const isl = s.dunya.mulk!.isletmeler.filter((x) => x.oyuncu === oyuncu);
    if (isl.length > 0) {
      const x = sec(r, isl);
      return { tur: "ticaret_emri", bolge: `${x.il}#${oyuncu}`, mal: sec(r, ["tahil", "gida", "celik"]), yon: aralik(r, 2) === 0 ? "ihracat" : "ithalat", oranSaat: 20_000 * (1 + aralik(r, 5)) };
    }
  }
  return { tur: "ekim_plani", bolge: `${sec(r, f.iller).id}#${oyuncu}`, ekimPpm: [600_000, 200_000, 200_000] };
}

interface Kayit {
  sim: Simulasyon;
  komutlar: { k: DamgaliKomut; tamam: boolean }[];
  /** Her başarısız komutta özet değişmedi mi? */
  yanEtkiler: string[];
}

/** Senaryoyu koşar; `kararAni` her karar anında (komutlardan önce) çağrılır. */
function kos(veri: CekirdekVeriPaketi, tohum: number, gun: number, kararAni?: (s: Simulasyon, t: Ms) => void): Kayit {
  const s = Simulasyon.olustur(veri, tohum);
  const r = prngOlustur(tohum, "mulk-test");
  const komutlar: Kayit["komutlar"] = [];
  const yanEtkiler: string[] = [];
  const uygula = (k: DamgaliKomut): void => {
    s.calistirKadar(k.t);
    const once = s.durumOzeti();
    const sonuc = s.uygula(k);
    if (!sonuc.tamam && s.durumOzeti() !== once) yanEtkiler.push(`${k.t} ${k.komut.tur}: ${sonuc.hata}`);
    komutlar.push({ k: structuredClone(k), tamam: sonuc.tamam });
  };
  for (const o of OYUNCULAR) uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [] } });
  for (let t = 0; t < gun * GUN; t += 3 * SAAT) {
    s.calistirKadar(t);
    kararAni?.(s, t);
    const zamanlar = Array.from({ length: aralik(r, 7) }, () => t + aralik(r, 3 * SAAT)).sort((x, y) => x - y);
    for (const zt of zamanlar) {
      const o = sec(r, OYUNCULAR);
      const k = sonrakiKomut(r, veri, s, o);
      uygula({ t: zt, oyuncu: o, komut: k });
      // Yeni hücreli inşaatın bir kısmı hemen iptal edilir (erken oyunda inşaatlar dakikalar sürer).
      const son = s.dunya.insaatlar[s.dunya.insaatlar.length - 1];
      if (k.tur === "tesis_insa_hucre" && komutlar[komutlar.length - 1]?.tamam && son && aralik(r, 2) === 0) {
        uygula({ t: zt, oyuncu: o, komut: { tur: "insaat_iptal", insaat: son.id } });
      }
    }
  }
  s.calistirKadar(gun * GUN);
  return { sim: s, komutlar, yanEtkiler };
}

describe("mülk kipi: determinizm ve yeniden oynatma", () => {
  const veri = (): CekirdekVeriPaketi => mulkVeri((v) => (v.param.mulk!.yeniOyuncu.hibe = 200_000_000));

  it("aynı tohum aynı özet; senaryo hem başarılı hem başarısız mülk komutlarını kapsar", () => {
    // Tohum 15: mülk kipinde limansız işletme emirleri artık kabul edildiği, kalkan 14 gün olduğu ve yapılar kenar-bitişik
    // hücre istediği için senaryonun yolu değişti (eski tohum 11 artık her komut türünü iki sonuçla kapsamıyor).
    const a = kos(veri(), 15, 6);
    const b = kos(veri(), 15, 6);
    expect(a.sim.durumOzeti()).toBe(b.sim.durumOzeti());
    const turler = (tamamMi: boolean) => new Set(a.komutlar.filter((x) => x.tamam === tamamMi).map((x) => x.k.komut.tur));
    for (const tur of ["parsel_al", "tesis_insa_hucre", "insaat_iptal"] as const) {
      expect(turler(true).has(tur), `basarili ${tur}`).toBe(true);
      expect(turler(false).has(tur), `basarisiz ${tur}`).toBe(true);
    }
    const m = a.sim.dunya.mulk!;
    expect(m.hucreler.length).toBeGreaterThan(20);
    expect(m.isletmeler.length).toBeGreaterThan(3);
    expect(a.sim.dunya.bolgeler.some((b2) => b2.tesisler.some((t) => t.hucreler !== undefined))).toBe(true);
    expect(kos(veri(), 12, 6).sim.durumOzeti()).not.toBe(a.sim.durumOzeti());
  }, 60_000);

  it("başarısız mülk komutu yan etkisizdir; yalnız başarılıların yeniden oynatılması aynı özeti verir", () => {
    const a = kos(veri(), 21, 6);
    expect(a.yanEtkiler).toEqual([]);
    const basarili = a.komutlar.filter((x) => x.tamam).map((x) => x.k);
    const y = Simulasyon.yenidenOynat(veri(), 21, basarili);
    y.calistirKadar(6 * GUN);
    expect(y.durumOzeti()).toBe(a.sim.durumOzeti());
    expect(a.sim.gunluk.length).toBe(basarili.length);
  }, 60_000);
});

describe("mülk kipi: serileştir -> çöz -> yükle", () => {
  const veri = (): CekirdekVeriPaketi => mulkVeri((v) => (v.param.mulk!.yeniOyuncu.hibe = 200_000_000));

  it("10 karar anında: serileştirilip yüklenen dünya, kalan başarılı komutlarla kesintisiz koşuyla aynı sona varır", () => {
    const tohum = 31;
    const gun = 5;
    const goruntuler: { t: Ms; metin: string; komutSayisi: number }[] = [];
    const noktalar = new Set([3, 9, 14, 18, 22, 25, 29, 33, 36, 39].map((i) => i * 3 * SAAT));
    let s0: Simulasyon | null = null;
    const a = kos(veri(), tohum, gun, (s, t) => {
      s0 = s;
      if (noktalar.has(t)) goruntuler.push({ t, metin: dunyaSerilestir(s.dunya), komutSayisi: s.gunluk.length });
    });
    expect(s0).not.toBeNull();
    expect(goruntuler.length).toBe(10);
    const son = a.sim.durumOzeti();
    const basarili = a.sim.gunluk;
    for (const g of goruntuler) {
      const d = dunyaCoz(g.metin);
      expect(d.mulk).toBeDefined();
      const s = Simulasyon.yukle(veri(), d);
      expect(dunyaSerilestir(s.dunya)).toBe(g.metin);
      for (const k of basarili.slice(g.komutSayisi)) {
        const r = s.uygula(k);
        expect(r.tamam).toBe(true);
      }
      s.calistirKadar(gun * GUN);
      expect(s.durumOzeti(), `t=${g.t}`).toBe(son);
    }
  }, 120_000);

  it("anlık görüntü zarfı ve kurtarma (anlikGoruntudenYukle) mülk kipinde çalışır", () => {
    const v = veri();
    const kural = kuralSurumuHesapla(v);
    let goruntu = "";
    let sayi = 0;
    const a = kos(v, 41, 4, (s, t) => {
      if (t === 2 * GUN) {
        goruntu = anlikGoruntuOlustur(s, kural);
        sayi = s.gunluk.length;
      }
    });
    const s = Simulasyon.anlikGoruntudenYukle(veri(), goruntu, a.sim.gunluk.slice(sayi));
    s.calistirKadar(4 * GUN);
    expect(s.durumOzeti()).toBe(a.sim.durumOzeti());
  }, 60_000);

  it("anlikGoruntuOlusturOzetli: aynı metin + özet; kurtarma başarısız kayıtları içeren günlükle (basarisizlaraIzin) aynı sona varır", () => {
    const v = veri();
    const kural = kuralSurumuHesapla(v);
    let z: { metin: string; durumOzeti: string } | null = null;
    let basarili = 0;
    const a = kos(v, 43, 4, (s, t) => {
      if (t === 2 * GUN) {
        z = anlikGoruntuOlusturOzetli(s, kural);
        expect(z.metin).toBe(anlikGoruntuOlustur(s, kural));
        expect(z.durumOzeti).toBe(s.durumOzeti());
        basarili = s.gunluk.length;
      }
    });
    const zz = z as unknown as { metin: string; durumOzeti: string };
    // Görüntü 2. gün karar anında komutlardan önce alındı: kalan = zamanı >= 2 gün olan tüm kayıtlar (başarısızlar dahil).
    const tum = a.komutlar.findIndex((x) => x.k.t >= 2 * GUN);
    const kalanTum = a.komutlar.slice(tum).map((x) => x.k);
    expect(kalanTum.length).toBeGreaterThan(a.sim.gunluk.length - basarili);
    // Varsayılan: başarısız kayıtta hata
    expect(() => Simulasyon.anlikGoruntudenYukle(veri(), zz.metin, kalanTum)).toThrow(/uygulanamadi/);
    const { sim, sonuclar } = Simulasyon.anlikGoruntudenYukleSonuclu(veri(), zz.metin, kalanTum, { basarisizlaraIzin: true });
    expect(sonuclar.map((x) => x.tamam)).toEqual(a.komutlar.slice(tum).map((x) => x.tamam));
    sim.calistirKadar(4 * GUN);
    expect(sim.durumOzeti()).toBe(a.sim.durumOzeti());
    expect(sim.gunluk.length).toBe(a.sim.gunluk.length - basarili);
    const s2 = Simulasyon.anlikGoruntudenYukle(veri(), zz.metin, kalanTum, { basarisizlaraIzin: true });
    s2.calistirKadar(4 * GUN);
    expect(s2.durumOzeti()).toBe(a.sim.durumOzeti());
  }, 60_000);

  it("bozuk mülk durumu ve içerik uyumsuzluğu reddedilir", () => {
    const a = kos(veri(), 51, 2);
    const metin = dunyaSerilestir(a.sim.dunya);
    const boz = (f: (d: { mulk: Record<string, unknown[]>; bolgeler: Record<string, unknown>[] }) => void): string => {
      const d = JSON.parse(metin) as { mulk: Record<string, unknown[]>; bolgeler: Record<string, unknown>[] };
      f(d);
      return JSON.stringify(d);
    };
    const yol = (f: () => unknown): string => {
      try {
        f();
      } catch (e) {
        if (e instanceof SerilestirmeHatasi) return e.yol;
        throw e;
      }
      return "hata yok";
    };
    expect(yol(() => dunyaCoz(boz((d) => d.mulk.hucreler!.reverse())))).toMatch(/^\$\.mulk\.hucreler\[\d+\]$/);
    expect(yol(() => dunyaCoz(boz((d) => ((d.mulk.hucreler![0] as Record<string, unknown>).sinif = "saray"))))).toBe("$.mulk.hucreler[0].sinif");
    expect(yol(() => dunyaCoz(boz((d) => d.mulk.isletmeler!.pop())))).toBe("$.mulk.isletmeler");
    expect(yol(() => dunyaCoz(boz((d) => delete d.bolgeler[d.bolgeler.length - 1]!.merkez)))).toMatch(/^\$\.mulk\.isletmeler/);
    // içerik uyumu: mülk dünyası bölge kipi verisiyle (fikstürsüz) yüklenemez; bölge dünyası mülk verisiyle yüklenemez
    expect(yol(() => Simulasyon.yukle(miniVeriyiYukle(), dunyaCoz(metin)))).toBe("$.mulk");
    const bolgeDunyasi = Simulasyon.olustur(miniVeriyiYukle(), 3);
    expect(yol(() => Simulasyon.yukle({ ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") }, dunyaCoz(dunyaSerilestir(bolgeDunyasi.dunya))))).toBe("$.mulk");
  }, 60_000);
});
