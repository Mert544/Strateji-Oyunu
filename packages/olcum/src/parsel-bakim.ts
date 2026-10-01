/**
 * Parsel bakım ve aşınma ölçümü (YALNIZ OKUMA; `--bakim-olc` ile açılır, çekirdeğe ve botlara dokunmaz, koşu sonucunu değiştirmez).
 *
 * Her oyuncu için, saatlik örneklemeyle (gözlem geri çağrısı her tam saatte çalışır):
 * - Aşınma ve verim: tesis-saat ağırlıklı aşınma, aşınmanın verim cezası (1 − `cezaCarpani`; üretim tabanı dahil, kıtlık çarpanı hariç),
 *   genel onarım duruşu (tesis-saat), düğümlerin bakım parçası karşılanma oranı (`bakimKarsilanmaPpm`).
 * - Para akışı kalemleri (mili-₺; çekirdeğin para defterindeki `paraAkisi` saatlik oranları × 1 saat): ihracat, nüfus geliri, ithalat (tüm mal),
 *   ithalatın parça payı, işletme gideri, arazi vergisi. Her iki dönem için de (TOPLAM ve PENCERE) birikir.
 * - Aşınma kaybı (TAHMİN): her saat ihracat geliri × (1 / oyuncunun tesis-ortalama ceza çarpanı − 1). Aşınma olmasaydı gelecek ek ihracat
 *   gelirinin kaba tahminidir (çıktı ağırlığı yok, zincir etkileri yok); kesin ölçü değil.
 * - Genel onarım: komut öncesi/sonrası hazine farkı (para), düğüm stoğunun taban fiyatla değer farkı (malzeme), duruş (tesis-saat).
 * - Ölçüm anları (gün 5, 10, 20, 30, 50, 74 ve ölçüm anı): tesis başına [tür, aşınma, verim, işçi] (ppm), düğüm başına bakım karşılanma,
 *   parça stoğu, hazine ve hazine net oranı.
 * - Eşikler: her tesisin aşınmasının ilk kez %50'ye ve %100'e vardığı saat (sim saati, mutlak) ve tesisin ilk görüldüğü saat.
 * - Günlük parça stoğu (ilk 15 gün) ve parça piyasası (1–30. gün, günlük saatlik ortalama): botların toplam parça ithalat talebi (emir) ve
 *   gerçekleşen, NPC arzı, parça fiyatının tabana oranı.
 *
 * Sınırlar: saat başına bir örnek; oranlar son çözümdekidir (saat içinde komutla değişen oranlar ortalamada bir saat gecikmeli görünür).
 * Parça ithalatı sanayicide yapı malzemesi için de olabilir (ayrılmaz). Kalemlerin toplamı ile Y7 geliri arasındaki fark raporda "uzlaşma farkı"dır.
 */
import { GUN, MILI, PPM, SAAT, anlikHazine, anlikMiktar, bolgeIndeksiBul, cezaCarpani, npcHacimleri, sanayiTablosu } from "@bolge/cekirdek";
import type { Komut, Simulasyon } from "@bolge/cekirdek";
import type { GecAcilis } from "@bolge/botlar";

/** Ölçüm anları (sim günü); ölçüm anı (T) ayrıca eklenir. */
export const BAKIM_OLCUM_GUNLERI: readonly number[] = [5, 10, 20, 30, 50, 74];
/** Parça piyasası gözlem aralığı (gün) ve günlük parça stoğu serisi uzunluğu (gün). */
export const PARCA_PIYASASI_SON_GUN = 30;
export const PARCA_STOK_SERISI_GUN = 15;

/** Para akışı kalemleri (mili-₺, toplam). */
export interface BakimAkisi {
  ihracat: number;
  nufus: number;
  ithalat: number;
  parcaIthalat: number;
  isletme: number;
  vergi: number;
  /** TAHMİN: aşınma olmasaydı gelecek ek ihracat geliri (kaba). */
  asinmaKaybiTahmin: number;
}

export interface BakimOnarimi {
  sayi: number;
  red: number;
  /** Hazineden çıkan para ve düğüm stoğundan çıkan malzemenin taban fiyatla değeri (mili-₺). */
  para: number;
  mal: number;
}

/** Bir dönemin (TOPLAM: katılımdan ölçüm anına; PENCERE: ölçüm anından önceki son 7 gün) toplamları. */
export interface BakimDonemi {
  tesisSaat: number;
  asinmaOrtPpm: number | null;
  uretimKaybiPpm: number | null;
  durusTesisSaat: number;
  bakimKarsilanmaPpm: number | null;
  akis: BakimAkisi;
  onarim: BakimOnarimi;
}

/** Bir ölçüm anındaki tesis: [tür indeksi (`turAdlari`), aşınma, verim, işçi] (ppm). */
export type TesisIzi = [number, number, number, number];

export interface BakimAni {
  gun: number;
  tesisler: TesisIzi[];
  /** Düğüm başına bakım parçası karşılanma (ppm). */
  karsilanma: number[];
  /** Düğümlerdeki parça stoğu toplamı ve hazine (mili) ve hazinenin net saatlik oranı (mili-₺/saat). */
  parcaStok: number;
  hazine: number;
  hazineOran: number;
}

export interface TesisEsigi {
  /** Tesis sahibi, tür indeksi, ilk görüldüğü saat; aşınmanın %50 ve %100'e ilk vardığı saat (varmadıysa null). Hepsi mutlak sim saati. */
  oyuncu: string;
  tur: number;
  dogus: number;
  saat50: number | null;
  saat100: number | null;
}

export interface ParselBakimOyuncu {
  id: string;
  onayar: string;
  acilis: GecAcilis | null;
  katilmaGun: number;
  toplam: BakimDonemi;
  pencere: BakimDonemi;
  anlar: BakimAni[];
  /** Ölçüm anındaki parça stoğu serisi (ilk 15 gün, gün sonu; mili). */
  parcaStokSerisi: Array<{ gun: number; stok: number }>;
  /** Her gün için [parça ithalatı nakit bedeli (mili-₺; o günün saatlik örnekleri), gün sonu parça stoğu (mili)]; indeks = gün − 1 (katılımdan önceki günler [0, 0]). */
  gunluk: Array<[number, number]>;
}

/** Parça piyasası: bir günün saatlik ortalamaları (sim, 1–30. gün). Mili-birim/saat ve ppm. */
export interface ParcaPiyasasiGunu {
  gun: number;
  /** Botların parça ithalat emri toplamı (istenen) ve gerçekleşen; pazarın kaydettiği oyuncu talebi; NPC arzı. */
  istenen: number;
  gerceklesen: number;
  oyuncuTalebi: number;
  npcArz: number;
  /** Parça referans fiyatının taban fiyata oranı (ppm). */
  fiyatTabanPpm: number;
}

export interface ParselBakimOlcumu {
  surum: 1;
  olcumGunu: number;
  pencereGun: number;
  turAdlari: string[];
  oyuncular: ParselBakimOyuncu[];
  esikler: TesisEsigi[];
  parcaPiyasasi: ParcaPiyasasiGunu[];
  /** Başlangıç kitindeki parça (mili) ve parça taban fiyatı (mili-₺). */
  kitParca: number;
}

interface DonemBirikimi {
  tesisSaat: number;
  asinma: number;
  kayip: number;
  durus: number;
  dugumSaat: number;
  karsilanma: number;
  akis: BakimAkisi;
  onarim: BakimOnarimi;
}

function bosAkis(): BakimAkisi {
  return { ihracat: 0, nufus: 0, ithalat: 0, parcaIthalat: 0, isletme: 0, vergi: 0, asinmaKaybiTahmin: 0 };
}

function bos(): DonemBirikimi {
  return { tesisSaat: 0, asinma: 0, kayip: 0, durus: 0, dugumSaat: 0, karsilanma: 0, akis: bosAkis(), onarim: { sayi: 0, red: 0, para: 0, mal: 0 } };
}

function donemeCevir(b: DonemBirikimi): BakimDonemi {
  return {
    tesisSaat: b.tesisSaat,
    asinmaOrtPpm: b.tesisSaat === 0 ? null : Math.floor(b.asinma / b.tesisSaat),
    uretimKaybiPpm: b.tesisSaat === 0 ? null : Math.floor(b.kayip / b.tesisSaat),
    durusTesisSaat: b.durus,
    bakimKarsilanmaPpm: b.dugumSaat === 0 ? null : Math.floor(b.karsilanma / b.dugumSaat),
    akis: { ...b.akis },
    onarim: { ...b.onarim },
  };
}

interface OyuncuIzi {
  id: string;
  onayar: string;
  acilis: GecAcilis | null;
  katilmaGun: number;
  toplam: DonemBirikimi;
  pencere: DonemBirikimi;
  anlar: BakimAni[];
  parcaStokSerisi: Array<{ gun: number; stok: number }>;
  gunlukIthalat: number[];
  gunlukStok: number[];
}

export interface BakimIzleyiciGirdisi {
  oyuncular: ReadonlyArray<{ id: string; onayar: string; acilis: GecAcilis | null; katilmaGun: number }>;
  /** Ölçüm anı (ms) ve pencere uzunluğu (ms). */
  olcumMs: number;
  pencereMs: number;
}

/** Çekirdeğe yalnız bakan ölçüm izleyicisi: `saatlik` gözlem geri çağrısında, `komutIzle` koşucunun komut kancasında çağrılır. */
function gunlukBirlestir(i: { gunlukIthalat: number[]; gunlukStok: number[] }, gunSayisi: number): Array<[number, number]> {
  const s: Array<[number, number]> = [];
  for (let g = 0; g < gunSayisi; g++) s.push([i.gunlukIthalat[g] ?? 0, i.gunlukStok[g] ?? 0]);
  return s;
}

export class BakimIzleyici {
  private readonly iz = new Map<string, OyuncuIzi>();
  private readonly olcumMs: number;
  private readonly pencereMs: number;
  private readonly anGunleri: Set<number>;
  private readonly esikler = new Map<string, TesisEsigi>();
  private readonly piyasaToplam = new Map<number, { n: number; istenen: number; gerceklesen: number; talep: number; npc: number; fiyat: number }>();
  private turAdlari: string[] = [];
  private kitParca = 0;

  constructor(g: BakimIzleyiciGirdisi) {
    this.olcumMs = g.olcumMs;
    this.pencereMs = g.pencereMs;
    this.anGunleri = new Set<number>([...BAKIM_OLCUM_GUNLERI.filter((x) => x * GUN <= g.olcumMs), g.olcumMs / GUN]);
    for (const o of g.oyuncular) {
      this.iz.set(o.id, { id: o.id, onayar: o.onayar, acilis: o.acilis, katilmaGun: o.katilmaGun, toplam: bos(), pencere: bos(), anlar: [], parcaStokSerisi: [], gunlukIthalat: [], gunlukStok: [] });
    }
  }

  private pencerede(t: number): boolean {
    return t > this.olcumMs - this.pencereMs && t <= this.olcumMs;
  }

  /** Gözlem geri çağrısından her çağrıda çalışır; yalnız tam saatlerde (ve ölçüm anında) ve ölçüm anına kadar örnek alır. */
  saatlik(sim: Simulasyon, t: number): void {
    if (t > this.olcumMs || (t % SAAT !== 0 && t !== this.olcumMs)) return;
    const sn = sanayiTablosu(sim.ic);
    if (sn === null) return;
    const d = sim.dunya;
    if (this.turAdlari.length === 0) {
      this.turAdlari = sim.ic.tesisTurleri.map((x) => x.id);
      this.kitParca = sim.ic.mulk?.baslangicStok[sim.ic.malIndeks["parca"] ?? -1] ?? 0;
    }
    const tamSaat = t % SAAT === 0;
    const parcaMal = sim.ic.malIndeks["parca"];
    const gun = t / GUN;
    const gunSonu = t % GUN === 0 && t > 0;
    const anAni = gunSonu && this.anGunleri.has(gun);
    const katilanlar = new Set(d.oyuncular.map((o) => o.id));
    const mulkOyuncu = new Map((d.mulk?.oyuncular ?? []).map((m) => [m.id, m] as const));
    const oyuncuMap = new Map(d.oyuncular.map((x) => [x.id, x] as const));
    const dugumlerOyuncu = new Map<string, number[]>();
    for (const i of d.mulk?.isletmeler ?? []) {
      const l = dugumlerOyuncu.get(i.oyuncu);
      if (l === undefined) dugumlerOyuncu.set(i.oyuncu, [i.bolgeIndeksi]);
      else l.push(i.bolgeIndeksi);
    }
    const pencere = this.pencerede(t);
    // Parça piyasası: tüm oyuncuların parça ithalat emirleri
    let istenenParca = 0;
    let gerceklesenParca = 0;

    for (const iz of this.iz.values()) {
      if (!katilanlar.has(iz.id)) continue;
      let tesis = 0;
      let asinma = 0;
      let kayip = 0;
      let durus = 0;
      let dugum = 0;
      let karsilanma = 0;
      let ceza = 0;
      let parcaStok = 0;
      const tesisIzleri: TesisIzi[] = [];
      const karsilanmalar: number[] = [];
      let ithalatParca = 0;
      const o = oyuncuMap.get(iz.id);
      const dugumIdx = dugumlerOyuncu.get(iz.id) ?? [];
      for (const bolgeIndeksi of dugumIdx) {
        const b = d.bolgeler[bolgeIndeksi];
        if (b === undefined) continue;
        dugum++;
        const k = b.bakimKarsilanmaPpm ?? PPM;
        karsilanma += k;
        karsilanmalar.push(k);
        if (parcaMal !== undefined) {
          const st = b.stoklar[parcaMal];
          if (st !== undefined) parcaStok += anlikMiktar(st, t);
        }
        for (const ts of b.tesisler) {
          const a = ts.asinmaPpm ?? 0;
          const c = cezaCarpani(sn, ts);
          tesis++;
          asinma += a;
          kayip += PPM - c;
          ceza += c;
          if (ts.onarimBitis !== undefined && ts.onarimBitis > t) durus++;
          if (anAni) tesisIzleri.push([ts.tur, a, ts.verimPpm, ts.isciPpm]);
          if (tamSaat) {
            const kimlik = `${bolgeIndeksi}:${ts.id}`;
            let e = this.esikler.get(kimlik);
            if (e === undefined) {
              e = { oyuncu: iz.id, tur: ts.tur, dogus: t / SAAT, saat50: null, saat100: null };
              this.esikler.set(kimlik, e);
            }
            if (e.saat50 === null && a >= 500_000) e.saat50 = t / SAAT;
            if (e.saat100 === null && a >= PPM) e.saat100 = t / SAAT;
          }
        }
        if (parcaMal !== undefined) {
          for (const e of b.ticaretEmirleri) {
            if (e.yon !== "ithalat" || e.mal !== parcaMal) continue;
            istenenParca += e.oranSaat;
            gerceklesenParca += e.gerceklesenSaat;
            ithalatParca += e.gerceklesenSaat;
          }
        }
      }
      if (tamSaat) {
        const pa = mulkOyuncu.get(iz.id)?.paraAkisi;
        // Parça ithalatının nakit payı: ithalat kaleminin, gerçekleşen parça ithalatının toplam ithalattaki hacim-fiyat payı kadarı (ayrıntı: aşağıda).
        let parcaNakit = 0;
        if (pa !== undefined && pa.ithalat > 0 && parcaMal !== undefined && ithalatParca > 0 && o !== undefined) {
          let toplamBrut = 0;
          let parcaBrut = 0;
          for (const bolgeIndeksi of dugumIdx) {
            const b = d.bolgeler[bolgeIndeksi];
            if (b === undefined) continue;
            for (const e of b.ticaretEmirleri) {
              if (e.yon !== "ithalat" || e.gerceklesenSaat <= 0) continue;
              const brut = Math.floor((e.gerceklesenSaat * (d.pazar.fiyat[e.mal] as number)) / MILI);
              toplamBrut += brut;
              if (e.mal === parcaMal) parcaBrut += brut;
            }
          }
          parcaNakit = toplamBrut === 0 ? 0 : Math.floor((pa.ithalat * parcaBrut) / toplamBrut);
        }
        const ortCeza = tesis === 0 ? PPM : Math.floor(ceza / tesis);
        const kayipTahmin = pa === undefined || ortCeza >= PPM || ortCeza <= 0 ? 0 : Math.floor((pa.ihracat * (PPM - ortCeza)) / ortCeza);
        const dnm: DonemBirikimi[] = pencere ? [iz.toplam, iz.pencere] : [iz.toplam];
        for (const bk of dnm) {
          bk.tesisSaat += tesis;
          bk.asinma += asinma;
          bk.kayip += kayip;
          bk.durus += durus;
          bk.dugumSaat += dugum;
          bk.karsilanma += karsilanma;
          if (pa !== undefined) {
            bk.akis.ihracat += pa.ihracat;
            bk.akis.nufus += pa.nufus;
            bk.akis.ithalat += pa.ithalat;
            bk.akis.isletme += pa.isletme;
            bk.akis.vergi += pa.vergi;
          }
          bk.akis.parcaIthalat += parcaNakit;
          bk.akis.asinmaKaybiTahmin += kayipTahmin;
        }
        if (parcaNakit > 0) {
          const gi = Math.ceil(t / GUN) - 1;
          if (gi >= 0) {
            while (iz.gunlukIthalat.length <= gi) iz.gunlukIthalat.push(0);
            iz.gunlukIthalat[gi] = (iz.gunlukIthalat[gi] as number) + parcaNakit;
          }
        }
      }
      if (gunSonu && gun <= PARCA_STOK_SERISI_GUN) iz.parcaStokSerisi.push({ gun, stok: parcaStok });
      if (gunSonu) {
        while (iz.gunlukStok.length < gun - 1) iz.gunlukStok.push(0);
        iz.gunlukStok[gun - 1] = parcaStok;
      }
      if (anAni) {
        iz.anlar.push({ gun, tesisler: tesisIzleri, karsilanma: karsilanmalar, parcaStok, hazine: o === undefined ? 0 : anlikHazine(d, iz.id), hazineOran: o === undefined ? 0 : o.hazine.yerelOran });
      }
    }

    if (tamSaat && parcaMal !== undefined && t > 0 && t <= PARCA_PIYASASI_SON_GUN * GUN) {
      const gunNo = Math.ceil(t / GUN);
      const hac = npcHacimleri(d, sim.baglam);
      const taban = sim.ic.mallar[parcaMal]?.tabanFiyat ?? 0;
      const e = this.piyasaToplam.get(gunNo) ?? { n: 0, istenen: 0, gerceklesen: 0, talep: 0, npc: 0, fiyat: 0 };
      e.n++;
      e.istenen += istenenParca;
      e.gerceklesen += gerceklesenParca;
      e.talep += d.pazar.oyuncuTalebi[parcaMal] ?? 0;
      e.npc += hac.arz[parcaMal] ?? 0;
      e.fiyat += taban > 0 ? Math.floor((((d.pazar.fiyat[parcaMal] as number) * PPM) / taban)) : 0;
      this.piyasaToplam.set(gunNo, e);
    }
  }

  /** Koşucunun komut kancası: genel onarım komutlarının hazine ve stok maliyetini komut öncesi/sonrası farktan okur. */
  komutIzle(sim: Simulasyon, t: number, oyuncu: string, komut: Komut): ((tamam: boolean) => void) | undefined {
    if (komut.tur !== "genel_onarim" || t > this.olcumMs) return undefined;
    const iz = this.iz.get(oyuncu);
    if (iz === undefined) return undefined;
    const d = sim.dunya;
    const bi = bolgeIndeksiBul(d, sim.ic, komut.bolge);
    const b = bi === undefined ? undefined : d.bolgeler[bi];
    const hazine0 = anlikHazine(d, oyuncu);
    const stokDegeri = (): number => {
      let v = 0;
      if (b === undefined) return v;
      for (let m = 0; m < b.stoklar.length; m++) {
        const st = b.stoklar[m];
        if (st !== undefined) v += Math.floor((anlikMiktar(st, d.zaman) * (sim.ic.mallar[m]?.tabanFiyat ?? 0)) / MILI);
      }
      return v;
    };
    const stok0 = stokDegeri();
    return (tamam) => {
      const dnm: DonemBirikimi[] = this.pencerede(t) ? [iz.toplam, iz.pencere] : [iz.toplam];
      for (const k of dnm) {
        if (!tamam) {
          k.onarim.red++;
          continue;
        }
        k.onarim.sayi++;
        k.onarim.para += hazine0 - anlikHazine(d, oyuncu);
        k.onarim.mal += stok0 - stokDegeri();
      }
    };
  }

  sonuc(olcumGunu: number): ParselBakimOlcumu {
    return {
      surum: 1,
      olcumGunu,
      pencereGun: this.pencereMs / GUN,
      turAdlari: this.turAdlari,
      oyuncular: [...this.iz.values()].map((i) => ({ id: i.id, onayar: i.onayar, acilis: i.acilis, katilmaGun: i.katilmaGun, toplam: donemeCevir(i.toplam), pencere: donemeCevir(i.pencere), anlar: i.anlar, parcaStokSerisi: i.parcaStokSerisi, gunluk: gunlukBirlestir(i, this.olcumMs / GUN) })),
      esikler: [...this.esikler.values()],
      parcaPiyasasi: [...this.piyasaToplam.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([gun, e]) => ({ gun, istenen: Math.floor(e.istenen / e.n), gerceklesen: Math.floor(e.gerceklesen / e.n), oyuncuTalebi: Math.floor(e.talep / e.n), npcArz: Math.floor(e.npc / e.n), fiyatTabanPpm: Math.floor(e.fiyat / e.n) })),
      kitParca: this.kitParca,
    };
  }
}
