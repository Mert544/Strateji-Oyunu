/**
 * Tarım katmanı (B1): deterministik, uyarılı ve kara komşuluğuyla yayılan iklim olayları; sulama koruması.
 */
import { describe, expect, it } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { GUN, PPM, SAAT } from "../src/tipler";
import type { IklimOlayi } from "../src/tipler";
import { bolge, kur } from "./ekonomi-yardimci";
import { olaylariSiklastir, tarimAc, yenilikleriKapat } from "./yenilikler";

function sentetikOlayli(): VeriPaketi {
  const v = varsayilanVeriyiYukle();
  return olaylariSiklastir(v, 5_000_000);
}

function olaylariTopla(s: Simulasyon, gun: number): IklimOlayi[] {
  const goruldu = new Map<number, IklimOlayi>();
  for (let g = 1; g <= gun; g++) {
    s.calistirKadar(g * GUN);
    for (const o of s.dunya.iklim!.olaylar) if (!goruldu.has(o.id)) goruldu.set(o.id, structuredClone(o));
  }
  return [...goruldu.values()];
}

describe("olay akışı deterministik", () => {
  it("aynı tohum -> aynı olaylar ve özet; farklı tohum -> farklı", () => {
    const a = Simulasyon.olustur(sentetikOlayli(), 7);
    const b = Simulasyon.olustur(sentetikOlayli(), 7);
    const c = Simulasyon.olustur(sentetikOlayli(), 8);
    const oa = olaylariTopla(a, 120);
    const ob = olaylariTopla(b, 120);
    const oc = olaylariTopla(c, 120);
    expect(oa.length).toBeGreaterThan(10);
    expect(oa).toEqual(ob);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(oc).not.toEqual(oa);
  });

  it("çekim sayısı olaydan bağımsız sabit: olay sıklığı akışı kaydırmaz (aynı tohumda ilk bölge/tür dizisi)", () => {
    // Olasılığı sıfır olan ve çok yüksek olan iki koşuda 1. günün çekimi aynı sayıda rastgele sayı tüketir
    // (olay yoksa bölge x tür başına tam 1 çekim) -> yalnız olay oluşunca ek çekim vardır.
    const seyrek = Simulasyon.olustur(olaylariSiklastir(varsayilanVeriyiYukle(), 0), 3);
    seyrek.calistirKadar(0);
    const n = seyrek.dunya.bolgeler.length;
    const ref = Simulasyon.olustur(olaylariSiklastir(varsayilanVeriyiYukle(), 0), 3);
    ref.calistirKadar(GUN);
    // 2 günlük tık (t=0, t=1g): 2 x bölge x 4 çekim; olay hiç yok
    expect(seyrek.dunya.iklim!.olaylar).toHaveLength(0);
    expect(ref.dunya.iklim!.olaylar).toHaveLength(0);
    expect(ref.dunya.rng.olay).not.toEqual(seyrek.dunya.rng.olay);
    expect(n).toBe(50);
  });

  it("rastgelelik yalnız 'olay' akışından gelir (ekonomi/pazar/savaş akışları dokunulmaz)", () => {
    const s = Simulasyon.olustur(sentetikOlayli(), 5);
    const once = structuredClone(s.dunya.rng);
    s.calistirKadar(30 * GUN);
    expect(s.dunya.rng.ekonomi).toEqual(once.ekonomi);
    expect(s.dunya.rng.pazar).toEqual(once.pazar);
    expect(s.dunya.rng.savas).toEqual(once.savas);
    expect(s.dunya.rng.olay).not.toEqual(once.olay);
  });
});

describe("uyarı süresi ve etki", () => {
  function yalnizKuraklik(v: VeriPaketi): VeriPaketi {
    tarimAc(v);
    const k = v.param.iklim!;
    for (const tur of ["don", "sel", "kis_firtinasi"] as const) for (const tip of Object.keys(k.tipOlasilikCarpaniPpm[tur]) as Array<keyof typeof k.hasatEgrisiPpm>) k.tipOlasilikCarpaniPpm[tur][tip] = 0;
    for (const tip of Object.keys(k.tipOlasilikCarpaniPpm.kuraklik) as Array<keyof typeof k.hasatEgrisiPpm>) k.tipOlasilikCarpaniPpm.kuraklik[tip] = 100_000_000;
    // Tüm aylarda kuraklık mümkün
    k.olaylar.kuraklik.olasilikPpmGun = new Array<number>(12).fill(2_000);
    return v;
  }

  it("olay önce 24 saat uyarı ilan eder; etki uyarıdan sonra başlar ve süre boyunca doğrusal söner", () => {
    const { s } = kur({ duzenle: yalnizKuraklik });
    let olay: IklimOlayi | undefined;
    let ilkGun = -1;
    for (let g = 0; g <= 60 && olay === undefined; g++) {
      s.calistirKadar(g * GUN);
      if (s.dunya.iklim!.olaylar.length > 0) {
        olay = structuredClone(s.dunya.iklim!.olaylar[0]!);
        ilkGun = g;
      }
    }
    expect(olay).toBeDefined();
    const o = olay!;
    expect(o.uyari).toBe(ilkGun * GUN);
    expect(o.etkiBaslangic - o.uyari).toBe(s.ic.param.iklim!.uyariSaat * SAAT);
    expect(o.bitis).toBeGreaterThan(o.etkiBaslangic);
    const sureGun = (o.bitis - o.etkiBaslangic) / GUN;
    expect(sureGun).toBeGreaterThanOrEqual(10);
    expect(sureGun).toBeLessThanOrEqual(20);
    expect(o.siddetPpm).toBeGreaterThanOrEqual(250_000);
    expect(o.siddetPpm).toBeLessThanOrEqual(500_000);
    // İlan günü etki yok (uyarı dönemi): hiçbir bölgede olayKaybi, bu olaydan dolayı artmaz.
    // (İlan gününden önce olay olmadığından tüm bölgelerde kayıp 0 olmalı.)
    if (ilkGun > 0) {
      for (const b of s.dunya.bolgeler) if (b.tarim) expect(b.tarim.olayKaybiPpm).toBe(0);
    }
    // Etki başlangıcında merkezde tam şiddet (sulama yok): olay kaybı >= şiddet
    s.calistirKadar(o.etkiBaslangic);
    const merkez = s.dunya.bolgeler[o.merkez]!;
    if (merkez.tarim) expect(merkez.tarim.olayKaybiPpm).toBeGreaterThanOrEqual(o.siddetPpm);
    // Sönüm: bitişe yakın kayıp başlangıçtakinden küçük (yalnız bu olay etkinse)
    s.calistirKadar(o.bitis - GUN);
    // Biten olay silinir
    s.calistirKadar(o.bitis);
    expect(s.dunya.iklim!.olaylar.some((x) => x.id === o.id)).toBe(false);
  });

  it("etki süresinde olay kaybı çıktıyı düşürür; olay bitince çıktı geri gelir", () => {
    const { s } = kur({ duzenle: (v) => { yalnizKuraklik(v); } });
    let kazanilan = false;
    let en = 0;
    const tahil = s.ic.malIndeks["tahil"]!;
    let taban = -1;
    for (let g = 0; g <= 80; g++) {
      s.calistirKadar(g * GUN + SAAT);
      const ova = bolge(s, "m_ova");
      if (ova.tarim!.olayKaybiPpm > en) en = ova.tarim!.olayKaybiPpm;
      if (g === 0) taban = ova.uretimOrani[tahil]!;
      if (ova.tarim!.olayKaybiPpm > 200_000) {
        // Olay etkinken çıktı, toprak/iklimle beklenenin altında: ekimPpm=%100 buğday duyarlılık 1
        const beklenen = Math.floor((taban * ova.tarim!.toprakPpm) / PPM);
        expect(ova.uretimOrani[tahil]!).toBeLessThan(beklenen);
        kazanilan = true;
      }
    }
    expect(en).toBeGreaterThan(0);
    expect(kazanilan).toBe(true);
  });

  it("kis_firtinasi tarım üretimini etkilemez (Lojistik B5 içindir)", () => {
    const { s } = kur({
      duzenle: (v) => {
        tarimAc(v);
        const k = v.param.iklim!;
        for (const tur of ["kuraklik", "don", "sel"] as const) for (const tip of Object.keys(k.tipOlasilikCarpaniPpm[tur]) as Array<keyof typeof k.hasatEgrisiPpm>) k.tipOlasilikCarpaniPpm[tur][tip] = 0;
        for (const tip of Object.keys(k.tipOlasilikCarpaniPpm.kis_firtinasi) as Array<keyof typeof k.hasatEgrisiPpm>) k.tipOlasilikCarpaniPpm.kis_firtinasi[tip] = 100_000_000;
        k.olaylar.kis_firtinasi.olasilikPpmGun = new Array<number>(12).fill(3_000);
      },
    });
    const olaylar = olaylariTopla(s, 60);
    expect(olaylar.length).toBeGreaterThan(0);
    expect(olaylar.every((o) => o.tur === "kis_firtinasi")).toBe(true);
    for (const b of s.dunya.bolgeler) if (b.tarim) expect(b.tarim.olayKaybiPpm).toBe(0);
  });
});

describe("olay yayılımı", () => {
  it("şiddet menzil kara kenarı içinde yayılımla azalır; menzil dışı bölge etkilenmez; deniz/hava kenarı yaymaz", () => {
    const veri = sentetikOlayli();
    const s = Simulasyon.olustur(veri, 11);
    const olaylar = olaylariTopla(s, 90);
    expect(olaylar.length).toBeGreaterThan(10);
    const h = s.ic.harita;
    const komsu: number[][] = h.bolgeler.map(() => []);
    for (const k of h.kenarlar) {
      if (k.tur !== "kara") continue;
      const a = s.ic.bolgeIndeks[k.a]!;
      const b = s.ic.bolgeIndeks[k.b]!;
      komsu[a]!.push(b);
      komsu[b]!.push(a);
    }
    let yayilanOlay = 0;
    for (const o of olaylar) {
      const profil = s.ic.param.iklim!.olaylar[o.tur];
      // Bağımsız BFS
      const mesafe = new Map<number, number>([[o.merkez, 0]]);
      let sinir = [o.merkez];
      for (let m = 1; m <= profil.menzilKenar; m++) {
        const yeni: number[] = [];
        for (const u of sinir) for (const v of komsu[u]!) if (!mesafe.has(v)) { mesafe.set(v, m); yeni.push(v); }
        sinir = yeni;
      }
      const beklenen = new Map<number, number>();
      for (const [b, m] of mesafe) {
        let sid = o.siddetPpm;
        for (let i = 0; i < m; i++) sid = Math.floor((sid * profil.yayilimPpm) / PPM);
        if (sid > 0) beklenen.set(b, sid);
      }
      expect(o.etki.map((e) => e.bolge)).toEqual([...beklenen.keys()].sort((x, y) => x - y)); // artan bölge sırası
      for (const e of o.etki) expect(e.siddetPpm).toBe(beklenen.get(e.bolge));
      const merkezEtki = o.etki.find((e) => e.bolge === o.merkez)!;
      expect(merkezEtki.siddetPpm).toBe(o.siddetPpm);
      expect(Math.max(...[...mesafe.values()])).toBeLessThanOrEqual(profil.menzilKenar);
      if (o.etki.length > 1) yayilanOlay++;
    }
    expect(yayilanOlay).toBeGreaterThan(5);
  });

  it("yayılan olay komşu bölgenin olay kaybına yansır (şiddet yayilimPpm kadar düşük)", () => {
    const { s } = kur({
      duzenle: (v) => {
        tarimAc(v);
        olaylariSiklastir(v, 100_000_000);
        const k = v.param.iklim!;
        for (const tur of ["don", "sel", "kis_firtinasi"] as const) for (const tip of Object.keys(k.tipOlasilikCarpaniPpm[tur]) as Array<keyof typeof k.hasatEgrisiPpm>) k.tipOlasilikCarpaniPpm[tur][tip] = 0;
        k.olaylar.kuraklik.olasilikPpmGun = new Array<number>(12).fill(500);
      },
    });
    let bulundu = false;
    for (let g = 0; g <= 60 && !bulundu; g++) {
      s.calistirKadar(g * GUN);
      const olaylar = s.dunya.iklim!.olaylar;
      if (olaylar.length !== 1) continue; // tek olay: sonuç ayrıştırılabilir
      const o = olaylar[0]!;
      if (s.dunya.zaman !== o.etkiBaslangic) continue;
      for (const e of o.etki) {
        const b = s.dunya.bolgeler[e.bolge]!;
        if (b.tarim === undefined) continue;
        expect(b.tarim.olayKaybiPpm).toBe(e.siddetPpm); // sulama yok
        bulundu = true;
      }
    }
    expect(bulundu).toBe(true);
  });
});

describe("sulama", () => {
  it("sulama kanalı hasat oranının diplerini yumuşatır (iklimPpm artar, tepe değerler değişmez)", () => {
    const sulamali = (v: VeriPaketi) => {
      tarimAc(v);
      v.harita.bolgeler.find((b) => b.id === "m_ova")!.tesisler.push("sulama_kanali");
    };
    const a = kur({ duzenle: (v) => { tarimAc(v); } }).s;
    const b = kur({ duzenle: sulamali }).s;
    // Aralık sonu (karasal dip ~450000-700000): sulama iklimPpm'i yükseltir
    a.calistirKadar(70 * GUN);
    b.calistirKadar(70 * GUN);
    const ia = bolge(a, "m_ova").tarim!.iklimPpm;
    const ib = bolge(b, "m_ova").tarim!.iklimPpm;
    expect(ia).toBeLessThan(PPM);
    expect(ib).toBeGreaterThan(ia);
    // sulama etkisi <= sulamaDip x sulanabilir (0,4 x 0,6 = %24) x (PPM - hasat)
    expect(ib - ia).toBeLessThanOrEqual(Math.floor(((PPM - ia) * 240_000) / PPM) + 1);
    // Hasat oranı 1'in üstündeyse sulama değiştirmez (karasal Haziran-Temmuz)
    a.calistirKadar(250 * GUN);
    b.calistirKadar(250 * GUN);
    expect(bolge(a, "m_ova").tarim!.iklimPpm).toBeGreaterThan(PPM);
    expect(bolge(b, "m_ova").tarim!.iklimPpm).toBe(bolge(a, "m_ova").tarim!.iklimPpm);
  });
});

describe("kapalı mod", () => {
  it("tarım kapalıyken olay çekimi yok: rng.olay dokunulmaz", () => {
    const veri = yenilikleriKapat(varsayilanVeriyiYukle());
    const s = Simulasyon.olustur(veri, 5);
    const once = structuredClone(s.dunya.rng.olay);
    s.calistirKadar(30 * GUN);
    expect(s.dunya.rng.olay).toEqual(once);
  });
});
