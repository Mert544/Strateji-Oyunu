/**
 * Koşuyu dışarı aktarma: sentetik-50 haritasında 4 devlet için 4 bot koşturur ve her 6 sim-saatte bir
 * anlık görüntü (Kare) alır. Yalnızca çekirdek, botlar ve veri paketlerinin genel API'lerini kullanır.
 */
import { GUN, MILI, PPM, SAAT, anlikHazine, anlikMiktar } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { ArketipAdi } from "@bolge/botlar";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { NEDEN_KODLARI } from "./tipler";
import type { BolgeKaresi, Dizin, Kare, KosuVerisi, SavasKaresi } from "./tipler";

/** Devlet sırasıyla botlar (olcum paketindeki DORT_BOT ile aynı dizilim). */
export const VARSAYILAN_BOTLAR: readonly ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];

export interface DisariAktarSecenegi {
  /** Koşu süresi (gün, vars. 14). */
  gun?: number;
  /** Simülasyon ve bot tohumu (vars. 1). */
  tohum?: number;
  /** Kareler arası sim-saat (vars. 6). */
  aralikSaat?: number;
  /** Veri paketi (vars. sentetik-50, varsayılan içerik). */
  veri?: VeriPaketi;
  /** Devlet sırasıyla bot arketipleri (vars. sanayici, tüccar, lojistikçi, militarist). */
  botlar?: readonly ArketipAdi[];
  /** İlerleme mesajı (CLI). */
  ilerleme?: (mesaj: string) => void;
}

const DURUS_KODU = { normal: 0, savunma: 1, geri_cekil: 2 } as const;

/** mili-birim -> birim, tek ondalık (oranlar için). */
function onda1(mili: number): number {
  return Math.round(mili / 100) / 10;
}

/** mili-birim -> birim, tamsayı (stoklar için). */
function tam(mili: number): number {
  return Math.round(mili / MILI);
}

function dizinKur(veri: VeriPaketi, sim: Simulasyon, botlar: readonly ArketipAdi[]): Dizin {
  const h = veri.harita;
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
    kenarlar: sim.dunya.kenarlar.map((k) => ({
      a: k.a,
      b: k.b,
      tur: k.tur,
      sure: Math.round(k.sureMs / SAAT),
    })),
    oyuncular: botlar.map((arketip, i) => ({ id: `o${i}`, devlet: i, arketip })),
    tesisTurleri: sim.ic.tesisTurleri.map((t) => ({ id: t.id, ad: t.ad })),
    yontemler: sim.ic.yontemler.map((y) => ({ id: y.id, ad: y.ad })),
    birlikler: sim.ic.birlikler.map((b) => ({ id: b.id, ad: b.ad })),
  };
}

/** Simülasyonun o anki durumundan bir Kare çıkarır (durumu değiştirmez). */
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
    tesis: b.tesisler.map((x) => [
      x.tur,
      x.yontem,
      x.aktif ? 1 : 0,
      Math.round((x.verimPpm * 100) / PPM),
      Math.round((x.isciPpm * 100) / PPM),
    ]),
    ordu: b.birlikler.flatMap((adet, i): Array<[number, number]> => (adet > 0 ? [[i, adet]] : [])),
    durus: DURUS_KODU[b.savunma.durus],
  }));

  const kenarlar = d.kenarlar.map((k): [number, number, number] => [
    onda1(k.kapasiteSaat),
    onda1(k.kullanilanSaat),
    onda1(k.askeriKullanilanSaat),
  ]);

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
      kapsam.push([
        b.indeks,
        m,
        Math.floor((h.karsilanmaPpm * 100) / PPM),
        kod,
        h.enYakinKaynakMs < 0 ? -1 : Math.round(h.enYakinKaynakMs / SAAT),
      ]);
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

/** Koşuyu sürer ve anlık görüntüleri toplar. */
export function kosuyuDisariAktar(secenek: DisariAktarSecenegi = {}): KosuVerisi {
  const gun = secenek.gun ?? 14;
  const tohum = secenek.tohum ?? 1;
  const aralikSaat = secenek.aralikSaat ?? 6;
  const veri = secenek.veri ?? varsayilanVeriyiYukle();
  const botlar = secenek.botlar ?? VARSAYILAN_BOTLAR;
  if (!Number.isInteger(gun) || gun < 1) throw new Error(`gecersiz gun: ${gun}`);
  if (!Number.isInteger(aralikSaat) || aralikSaat < 1) throw new Error(`gecersiz aralik: ${aralikSaat}`);

  const devletBolge = new Map<string, string[]>();
  for (const d of veri.harita.devletler) devletBolge.set(d.id, []);
  for (const b of veri.harita.bolgeler) devletBolge.get(b.devlet)?.push(b.id);
  const devletler = veri.harita.devletler.slice(0, botlar.length);
  if (devletler.length < botlar.length) throw new Error("haritada bot sayisindan az devlet var");

  const oyuncular = devletler.map((d, i) => ({
    id: `o${i}`,
    bolgeler: devletBolge.get(d.id) ?? [],
    bot: botOlustur(botlar[i] as ArketipAdi, `o${i}`, tohum),
    katilmaMs: 0,
  }));
  const idler = oyuncular.map((o) => o.id);

  const kareler: Kare[] = [];
  let dizin: Dizin | null = null;
  const sonuc = kos({
    veri,
    tohum,
    oyuncular,
    sureMs: gun * GUN,
    gozlemAraligiMs: aralikSaat * SAAT,
    gozlem: (sim, t) => {
      dizin ??= dizinKur(veri, sim, botlar);
      kareler.push(kareAl(sim, idler));
      secenek.ilerleme?.(`kare ${kareler.length}: sim-saat ${t / SAAT}`);
    },
  });
  if (dizin === null) throw new Error("koşu hiç kare üretmedi");

  return {
    surum: 1,
    harita: veri.harita.ad,
    tohum,
    gun,
    aralikSaat,
    dizin,
    kareler,
    kosuSureMs: sonuc.sureMs,
  };
}
