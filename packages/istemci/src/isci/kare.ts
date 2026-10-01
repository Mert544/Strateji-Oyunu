/**
 * Anlık görüntü çıkarımı: packages/izleyici/src/disari-aktar.ts'deki `kareAl` ve `dizinKur` mantığının işçiye
 * uyarlanmış kopyası (izleyici paketi node:fs'e bağlı olduğundan tarayıcı işçisine alınamaz). Çekirdeğin
 * genel API'sini kullanır; çekirdek değişmez.
 */
import { MILI, PPM, SAAT, anlikHazine, anlikMiktar, sureCarpaniPpm, tarimTablosu, teknolojiYayilimiPpm } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { NEDEN_KODLARI } from "../veri/kare-tipleri";
import type { BolgeKaresi, Dizin, DizinTarim, Kare, OlayKaresi, OyuncuBolgeKaresi, OyuncuKaresi, SavasKaresi } from "../veri/kare-tipleri";
import { hasatAylikHesapla } from "../veri/tarim";

const DURUS_KODU = { normal: 0, savunma: 1, geri_cekil: 2 } as const;

const onda1 = (mili: number): number => Math.round(mili / 100) / 10;
const tam = (mili: number): number => Math.round(mili / MILI);

/**
 * Tarım katmanının sabit tanımı (içerik + parametrelerden): ürünler, olay türleri ve iklim tipleri içerikten okunur
 * (sabit liste yok). Tarım kapalıysa (parametrelerde `iklim`/`tarim` yoksa) tanımsız döner.
 */
function tarimDizini(sim: Simulasyon): DizinTarim | undefined {
  const tb = tarimTablosu(sim.ic);
  if (tb === null) return undefined;
  const ik = tb.iklim;
  const iklimTipleri = Object.keys(ik.hasatEgrisiPpm);
  const bolgeler: DizinTarim["bolgeler"] = sim.ic.harita.bolgeler.map((b) => {
    const t = b.tarim;
    if (!t) return null;
    return [Math.max(0, iklimTipleri.indexOf(t.iklimTipi)), Math.round(t.toprakTabanPpm / 1000), t.tarimTesisTavani, Math.round((t.sulanabilirPpm * 100) / PPM)];
  });
  const tarimTipleri = sim.ic.harita.bolgeler.flatMap((b) => (b.tarim ? [b.tarim.iklimTipi as string] : []));
  return {
    baslangicGunu: ik.baslangicGunu,
    gunCarpani: ik.gunCarpani,
    ayGunleri: [...ik.ayGunleri],
    uyariSaat: ik.uyariSaat,
    urunler: (sim.ic.icerik.tarimUrunleri ?? []).map((u) => ({ id: u.id, ad: u.ad })),
    olayTurleri: Object.keys(ik.olaylar),
    iklimTipleri,
    hasatAylik: hasatAylikHesapla(ik.hasatEgrisiPpm, tarimTipleri),
    hasatTipleri: iklimTipleri.map((t) => hasatAylikHesapla(ik.hasatEgrisiPpm, [t])),
    gubreMal: tb.gubreMal,
    azamiGubreDozu: tb.tarim.azamiGubreDozu,
    bolgeler,
  };
}

export function dizinKur(sim: Simulasyon, botlar: readonly string[]): Dizin {
  const h = sim.ic.harita;
  const devletIdx = new Map(h.devletler.map((d, i) => [d.id, i]));
  const tarim = tarimDizini(sim);
  return {
    ...(tarim ? { tarim } : {}),
    devletler: h.devletler.map((d) => ({ id: d.id, ad: d.ad, blok: d.blok })),
    mallar: sim.ic.mallar.map((m) => ({ id: m.id, ad: m.ad, kategori: m.kategori, taban: m.tabanFiyat / MILI })),
    bolgeler: h.bolgeler.map((b) => ({
      id: b.id,
      ad: b.ad,
      devlet: devletIdx.get(b.devlet) ?? 0,
      etiketler: [...b.etiketler],
      x: b.x,
      y: b.y,
      nufus0: b.nufus,
    })),
    kenarlar: sim.dunya.kenarlar.map((k) => ({ a: k.a, b: k.b, tur: k.tur, sure: Math.round(k.sureMs / SAAT) })),
    oyuncular: botlar.map((arketip, i) => ({ id: `o${i}`, devlet: i, arketip })),
    tesisTurleri: sim.ic.tesisTurleri.map((t) => ({ id: t.id, ad: t.ad })),
    yontemler: sim.ic.yontemler.map((y) => ({ id: y.id, ad: y.ad })),
    birlikler: sim.ic.birlikler.map((b) => ({ id: b.id, ad: b.ad })),
  };
}

const ONDA2 = (ms: number): number => Math.round((ms / SAAT) * 100) / 100;

/** Komutla yönetilen oyuncunun ek durumu (tesis kimlikleri, rezervler, emirler, inşaatlar, anlaşmalar, koruma...). */
function oyuncuKaresiAl(sim: Simulasyon, oyuncuIdleri: readonly string[], oyuncuId: string): OyuncuKaresi | undefined {
  const d = sim.dunya;
  const o = d.oyuncular.find((x) => x.id === oyuncuId);
  const idx = oyuncuIdleri.indexOf(oyuncuId);
  if (!o || idx < 0) return undefined;
  const tt = tarimTablosu(sim.ic);
  const oyuncuIdx = new Map(oyuncuIdleri.map((id, i) => [id, i]));
  const bolgeler: Record<number, OyuncuBolgeKaresi> = {};
  for (const b of d.bolgeler) {
    if (b.sahip !== oyuncuId) continue;
    let tarimTesisi = 0;
    if (tt !== null && b.tarim !== undefined) {
      for (const x of b.tesisler) if (tt.turTarimTesisi[x.tur] === true) tarimTesisi++;
      for (const i of d.insaatlar) if (i.tur === "tesis" && i.bolge === b.indeks && tt.turTarimTesisi[i.hedef] === true) tarimTesisi++;
    }
    bolgeler[b.indeks] = {
      tesisler: b.tesisler.map((x) => ({
        id: x.id,
        tur: x.tur,
        yontem: x.yontem,
        aktif: x.aktif,
        ...(x.olcek !== undefined ? { olcek: x.olcek } : {}),
        ...(x.asinmaPpm !== undefined ? { asinma: Math.round((x.asinmaPpm * 100) / PPM) } : {}),
        ...(x.onarimBitis !== undefined && x.onarimBitis > d.zaman ? { onarimBitis: ONDA2(x.onarimBitis) } : {}),
      })),
      rezerv: b.rezervKalan.map(tam),
      rezervIlk: b.rezervIlk.map(tam),
      kesif: [...(b.kesifSayisi ?? [])],
      emirler: b.ticaretEmirleri.map((e): [number, number, number, number] => [e.mal, e.yon === "ihracat" ? 0 : 1, onda1(e.oranSaat), onda1(e.gerceklesenSaat)]),
      tarimTesisi,
    };
  }
  const ks: OyuncuKaresi = {
    idx,
    vergiPpm: o.vergiPpm,
    askeriRezervPpm: o.askeriRezervPpm,
    teknolojiler: [...o.teknolojiler],
    arastirma: o.arastirma ? { teknoloji: o.arastirma.teknoloji, bitis: ONDA2(o.arastirma.bitis) } : null,
    kararlar: [...o.kararlar],
    koruma: oyuncuIdleri.map((id) => {
      const x = d.oyuncular.find((y) => y.id === id);
      return x && x.korumaBitis > d.zaman ? Math.ceil(x.korumaBitis / SAAT) : 0;
    }),
    sureCarpani: Math.round(sureCarpaniPpm(d, sim.baglam, oyuncuId) / 1000),
    yayilim: sim.ic.teknolojiler.map((_, ti) => Math.round(teknolojiYayilimiPpm(d, sim.baglam, oyuncuId, ti) / 1000)),
    insaatlar: d.insaatlar
      .filter((i) => i.sahip === oyuncuId)
      .map((i) => ({ id: i.id, tur: i.tur, bolge: i.bolge, hedef: i.hedef, bitis: ONDA2(i.bitis), ...(i.olcek !== undefined ? { olcek: i.olcek } : {}) })),
    partiler: d.partiler.filter((p) => p.sahip === oyuncuId).map((p) => ({ bolge: p.bolge, birlik: p.birlik, adet: p.adet, bitis: ONDA2(p.bitis) })),
    anlasmalar: d.anlasmalar.flatMap((a) => {
      const karsi = a.taraflar[0] === oyuncuId ? a.taraflar[1] : a.taraflar[1] === oyuncuId ? a.taraflar[0] : null;
      const ki = karsi === null ? undefined : oyuncuIdx.get(karsi);
      if (ki === undefined) return [];
      return [{ tur: a.tur, karsi: ki, benTeklif: a.teklifler.includes(oyuncuId), karsiTeklif: a.teklifler.includes(karsi as string), aktif: a.aktif }];
    }),
    yaptirimBen: d.yaptirimlar.filter((y) => y.uygulayan === oyuncuId).map((y) => oyuncuIdx.get(y.hedef) ?? -1),
    yaptirimBana: d.yaptirimlar.filter((y) => y.hedef === oyuncuId).map((y) => oyuncuIdx.get(y.uygulayan) ?? -1),
    bolgeler,
  };
  if (o.bakimDuzeyi !== undefined) ks.bakim = o.bakimDuzeyi;
  return ks;
}

export function kareAl(sim: Simulasyon, oyuncuIdleri: readonly string[], oyuncuId?: string): Kare {
  const d = sim.dunya;
  const t = d.zaman;
  const nm = sim.ic.mallar.length;
  const oyuncuIdx = new Map(oyuncuIdleri.map((id, i) => [id, i]));

  const bolgeler: BolgeKaresi[] = d.bolgeler.map((b) => ({
    sahip: b.sahip === null ? -1 : (oyuncuIdx.get(b.sahip) ?? -1),
    nufus: b.nufus,
    gida: Math.round((b.gidaKarsilanmaPpm * 100) / PPM),
    ikmal: Math.round((b.ikmalKarsilanmaPpm * 100) / PPM),
    stok: b.stoklar.map((s) => tam(anlikMiktar(s, t))),
    uretim: b.uretimOrani.map(onda1),
    tesis: b.tesisler.map((x) => [x.tur, x.yontem, x.aktif ? 1 : 0, Math.round((x.verimPpm * 100) / PPM), Math.round((x.isciPpm * 100) / PPM)]),
    ordu: b.birlikler.flatMap((adet, i): Array<[number, number]> => (adet > 0 ? [[i, adet]] : [])),
    durus: DURUS_KODU[b.savunma.durus],
    ...(b.tarim
      ? {
          tarim: [
            Math.round(b.tarim.toprakPpm / 1000),
            Math.round(b.tarim.iklimPpm / 1000),
            Math.round(b.tarim.olayKaybiPpm / 1000),
            b.tarim.gubreDozu,
            Math.round((b.tarim.gubreKarsilanmaPpm * 100) / PPM),
            b.tarim.ekimPpm.map((x) => Math.round((x * 100) / PPM)),
          ] as NonNullable<BolgeKaresi["tarim"]>,
        }
      : {}),
  }));

  const kenarlar = d.kenarlar.map((k): [number, number, number] => [onda1(k.kapasiteSaat), onda1(k.kullanilanSaat), onda1(k.askeriKullanilanSaat)]);

  const akislar: Kare["akislar"] = [];
  for (const a of d.lojistik.akislar) {
    if (a.oranSaat <= 0 || a.yol.length === 0) continue;
    akislar.push([a.mal, onda1(a.oranSaat), a.kaynak, a.hedef, [...a.yol], oyuncuIdx.get(a.sahip) ?? -1]);
  }

  const kapsam: Kare["kapsam"] = [];
  for (const b of d.bolgeler) {
    if (b.sahip === null) continue;
    const satir = d.lojistik.kapsam[b.indeks] ?? [];
    for (let m = 0; m < nm; m++) {
      const h = satir[m];
      if (!h || h.karsilanmaPpm >= PPM) continue;
      const kod = Math.max(0, NEDEN_KODLARI.indexOf(h.neden));
      kapsam.push([b.indeks, m, Math.floor((h.karsilanmaPpm * 100) / PPM), kod, h.enYakinKaynakMs < 0 ? -1 : Math.round(h.enYakinKaynakMs / SAAT)]);
    }
  }

  const fiyat = sim.ic.mallar.map((mal, i) => Math.round(((d.pazar.fiyat[i] as number) * 1000) / mal.tabanFiyat));

  const savaslar: SavasKaresi[] = d.savaslar.map((s) => ({
    id: s.id,
    saldiran: oyuncuIdx.get(s.saldiran) ?? -1,
    savunan: oyuncuIdx.get(s.savunan) ?? -1,
    saldiranBolge: s.saldiranBolge,
    hedefBolge: s.hedefBolge,
    evre: s.evre,
    ilan: Math.round(s.ilan / SAAT),
    pencereBitis: Math.round(s.pencereBitis / SAAT),
    sonuc: s.sonuc
      ? {
          kazanan: oyuncuIdx.get(s.sonuc.kazanan) ?? -1,
          saldiranGuc: s.sonuc.saldiranGuc,
          savunanGuc: s.sonuc.savunanGuc,
          kayipYuzde: Math.round((s.sonuc.kayipOraniPpm * 100) / PPM),
        }
      : null,
    // Hazırlık sayacı için (yalnız oyuncu kipinde; izleyici biçimine eklenmez).
    ...(oyuncuId !== undefined ? { pencereBasi: Math.round(s.pencereBaslangic / SAAT) } : {}),
  }));

  const hazine = oyuncuIdleri.map((id) => Math.round(anlikHazine(d, id) / MILI));
  const hazineOrani = oyuncuIdleri.map((id) => {
    const o = d.oyuncular.find((x) => x.id === id);
    return o ? Math.round((o.hazine.yerelOran + o.hazine.gelenOran) / MILI) : 0;
  });

  const kare: Kare = { saat: Math.round(t / SAAT), bolgeler, kenarlar, akislar, kapsam, fiyat, savaslar, hazine, hazineOrani };
  const iklim = d.iklim;
  if (iklim) {
    const turler = Object.keys(sim.ic.param.iklim?.olaylar ?? {});
    kare.iklim = {
      olaylar: iklim.olaylar.map(
        (o): OlayKaresi => ({
          id: o.id,
          tur: Math.max(0, turler.indexOf(o.tur)),
          merkez: o.merkez,
          uyari: Math.round(o.uyari / SAAT),
          baslangic: Math.round(o.etkiBaslangic / SAAT),
          bitis: Math.round(o.bitis / SAAT),
          siddet: Math.round((o.siddetPpm * 100) / PPM),
          etki: o.etki.map((e): [number, number] => [e.bolge, Math.round((e.siddetPpm * 100) / PPM)]),
        }),
      ),
    };
  }
  if (oyuncuId !== undefined) {
    const ok = oyuncuKaresiAl(sim, oyuncuIdleri, oyuncuId);
    if (ok) kare.oyuncu = ok;
  }
  return kare;
}
