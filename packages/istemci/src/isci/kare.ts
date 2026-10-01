/**
 * Anlık görüntü çıkarımı: packages/izleyici/src/disari-aktar.ts'deki `kareAl` ve `dizinKur` mantığının işçiye
 * uyarlanmış kopyası (izleyici paketi node:fs'e bağlı olduğundan tarayıcı işçisine alınamaz). Çekirdeğin
 * genel API'sini kullanır; çekirdek değişmez.
 */
import { MILI, PPM, SAAT, anlikHazine, anlikMiktar } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { NEDEN_KODLARI } from "../veri/kare-tipleri";
import type { BolgeKaresi, Dizin, Kare, SavasKaresi } from "../veri/kare-tipleri";

const DURUS_KODU = { normal: 0, savunma: 1, geri_cekil: 2 } as const;

const onda1 = (mili: number): number => Math.round(mili / 100) / 10;
const tam = (mili: number): number => Math.round(mili / MILI);

export function dizinKur(sim: Simulasyon, botlar: readonly string[]): Dizin {
  const h = sim.ic.harita;
  const devletIdx = new Map(h.devletler.map((d, i) => [d.id, i]));
  return {
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

export function kareAl(sim: Simulasyon, oyuncuIdleri: readonly string[]): Kare {
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
  }));

  const hazine = oyuncuIdleri.map((id) => Math.round(anlikHazine(d, id) / MILI));
  const hazineOrani = oyuncuIdleri.map((id) => {
    const o = d.oyuncular.find((x) => x.id === id);
    return o ? Math.round((o.hazine.yerelOran + o.hazine.gelenOran) / MILI) : 0;
  });

  return { saat: Math.round(t / SAAT), bolgeler, kenarlar, akislar, kapsam, fiyat, savaslar, hazine, hazineOrani };
}
