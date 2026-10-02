/**
 * Yerel pazar (G7-2; sartname docs/arastirma/p4-p5-sartname.md §6) ve dükkân okuma API'si: dünya durumundan K4'ün SAF modülüne (`perakende/yerelPazar.ts`) girdi
 * kurar, sonucu çözüm boyunca taşınan GEÇİCİ `YerelCozum`'e çevirir. Dünya durumuna YAZMAZ (tek istisna: `yerelSatisYaz`, yuva başına `satisOran`; §7.1b).
 *
 * BLOK YOKKEN NO-OP: `ic.mulk.perakende` tanımsızsa, mülk durumu yoksa ya da dünyada hiç `dukkan` ek yapısı yoksa `yerelPazarCoz` `null` döner ve hiçbir tahsis yapmaz;
 * çağıranlar `null`'da eski yolu AYNEN izler (bölge kipi ve dükkânsız mülk dünyası bayt bayt aynı).
 *
 * Sıralama kuralları (§6.4 Adım 0): dükkânlar `d.mulk.isletmeler` sırasıyla (oyuncu, il) ve düğümün `ekYapilar` sırasıyla toplanır; ilçe ve dükkân sıralamasını K4'ün saf modülü
 * kendi içinde AÇIKÇA yapar (girdi sırasından bağımsız). Burada `Map` yalnız geçici ve anahtarla okunur; yineleme sırası sonucu etkilemez.
 */
import { BOS_DUGUMLER, oyuncuDugumleri } from "../dugum";
import { carpBol } from "../sabit";
import { anlikMiktar } from "../stok";
import { takvimAyi } from "../tarim/iklim";
import { icerikTablosu } from "../ekonomi/tablo";
import { SAAT, PPM } from "../tipler";
import type { Baglam, BolgeDurumu, DerlenmisIcerik, DukkanDurumu, Dunya, EkYapiDurumu, Mili, OyuncuId, RafYuvasi, Stok } from "../tipler";
import { etkinKademe, yerelPazarHesapla, yerelTalep } from "../perakende/yerelPazar";
import type { YerelDukkan, YerelIlce, YerelPazarSonucu, YerelSatir, YerelYuva } from "../perakende/yerelPazar";
import { kasaBakiyesi, kasaBul, kasaGirisi } from "./kasa";
import { kamuIlceKimligi } from "./kamu";

/** İlçenin mevcut hane talebi; aynı hesap hem pazar çözümünde hem oyuncu görünümünde kullanılır. */
function ilceHaneTalebi(d: Dunya, ic: DerlenmisIcerik, ilce: string): [string, Mili][] {
  const pk = ic.mulk?.perakende;
  const taban = pk?.talepTaban.get(ilce);
  if (pk === undefined || taban === undefined) return [];
  const ay = takvimAyi(ic, d.zaman);
  const sonuc: [string, Mili][] = [];
  for (let m = 0; m < ic.mallar.length; m++) {
    const tm = taban[m] ?? 0;
    if (tm === 0) continue;
    const g = pk.malGrubu[m] as number;
    const q = yerelTalep(tm, pk.grupTakvim[g] as number[], ay, pk.grupBayram[g] ?? undefined, pk.bayramGunleri, d.zaman);
    if (q > 0) sonuc.push([(ic.mallar[m] as { id: string }).id, q]);
  }
  return sonuc;
}

export interface IlceYasamGorunumu {
  nufus: number;
  nufusKaynak: "kayit" | "esdeger";
  /** Hane talebi, mili-birim/saat. Dükkân satış miktarı veya karşılanma oranı değildir. */
  talep: [string, Mili][];
  /** Son çözümde kayıtlı dükkân satışının mevcut hane talebindeki payı; görünmez esnaf veya toplam hane tüketimi değildir. */
  karsilanma: {
    mal: string;
    talepMiliSaat: Mili;
    satisMiliSaat: Mili;
    /** Talep içindeki kayıtlı dükkân satışı payı (0..PPM). */
    karsilanmaPpm: number;
  }[];
  /** Yalnız gerçek muhasebe kaydı olan ilçe kasası; kayıt yoksa alan yoktur. */
  kamuKasa?: {
    bakiyeMili: Mili;
    vergiToplamMili: Mili;
    girisToplamMili: Mili;
    cikisToplamMili: Mili;
    rezervMili: Mili;
    /** Kayıtlı para sayaçlarına ilgili sürekli akışların işlendiği en eski zaman. */
    muhasebeT: number;
  };
}

/** Saf ilçe okuması: nüfus, hane talebi, kayıtlı dükkân satış payı ve gerçek kamu kasası; dünyayı uzlaştırmaz. */
export function ilceYasamGorunumu(d: Dunya, ic: DerlenmisIcerik, ilce: string): IlceYasamGorunumu | undefined {
  const mk = ic.mulk;
  const tanim = mk?.ilceler.get(ilce);
  const nufus = tanim?.nufus ?? mk?.perakende?.ilceNufus.get(ilce);
  if (tanim === undefined || nufus === undefined || d.mulk === undefined) return undefined;
  const talep = ilceHaneTalebi(d, ic, ilce);
  const satis = new Map<string, Mili>();
  // ekYapilar yalnız tamamlanmış yapıları taşır; inşaatlar ve özel stok/gelir okunmaz.
  for (const k of dukkanlariTopla(d, ic)) {
    if (k.ilce !== ilce) continue;
    for (const y of k.d.raf) {
      if (y.mal === undefined || y.satisOran === undefined) continue;
      satis.set(y.mal, (satis.get(y.mal) ?? 0) + y.satisOran);
    }
  }
  const sonuc: IlceYasamGorunumu = {
    nufus,
    nufusKaynak: tanim.nufus === undefined ? "esdeger" : "kayit",
    talep,
    karsilanma: talep.map(([mal, talepMiliSaat]) => {
      const satisMiliSaat = satis.get(mal) ?? 0;
      return { mal, talepMiliSaat, satisMiliSaat, karsilanmaPpm: Math.min(PPM, carpBol(satisMiliSaat, PPM, talepMiliSaat)) };
    }),
  };
  const para = d.mulk.para;
  const sahip = kamuIlceKimligi(ilce);
  const kasa = para === undefined ? undefined : kasaBul(para, sahip);
  if (kasa !== undefined) {
    let muhasebeT = d.zaman;
    for (const o of d.mulk.oyuncular) {
      const a = o.paraAkisi;
      if (a !== undefined && a.kasa.some((k) => k.sahip === sahip && k.oran > 0)) muhasebeT = Math.min(muhasebeT, a.t0);
    }
    sonuc.kamuKasa = {
      bakiyeMili: kasaBakiyesi(kasa),
      vergiToplamMili: kasa.giris.vergi.n,
      girisToplamMili: kasaGirisi(kasa),
      cikisToplamMili: kasa.cikisOyuncu + kasa.cikisNpc,
      rezervMili: kasa.rezervOyuncu + kasa.rezervNpc,
      muhasebeT,
    };
  }
  return sonuc;
}

/** Çözümde taşınan bir dükkân kaydı: yuva yazımı ve okuma için durum referansı. */
export interface YerelDukkanKaydi {
  /** İşletme düğümünün `bolgeler` indeksi. */
  dugum: number;
  oyuncu: OyuncuId;
  ilce: string;
  e: EkYapiDurumu;
  d: DukkanDurumu;
}

/** Çözümün bir satırı: K4 satırı + mal indeksi. */
export interface YerelSatirKaydi {
  s: YerelSatir;
  /** Mal indeksi (`ic.malIndeks[s.mal]`). */
  m: number;
}

/** Bir çözümün yerel pazar sonucu (GEÇİCİ; dünya durumuna girmez). */
export interface YerelCozum {
  /** K4'ün ham sonucu. */
  sonuc: YerelPazarSonucu;
  /** Düğüm -> mal indeksi -> toplam dükkân satış isteği (mili-birim/saat); yalnız isteği olan düğümler. */
  istek: Map<number, Mili[]>;
  /** Düğüm -> satırlar (`hazineKalemleri` gelirinin ve `yerelSatisYaz`ın girdisi). */
  satirlar: Map<number, YerelSatirKaydi[]>;
  /** Düğüm -> dükkân işletme gideri (mili-₺/saat; TÜM dükkânlar). */
  gider: Map<number, number>;
  /** Çözüme giren tüm dükkânlar (satırı olmayanlar dahil). */
  dukkanlar: YerelDukkanKaydi[];
  /** (düğüm, oyuncu, ekYapi) anahtarıyla dükkân kaydı (yuva yazımı için O(1) erişim). */
  dukkanIndeks: Map<string, YerelDukkanKaydi>;
  /** İlçe -> mal kimliği -> Q (mili-birim/saat); yalnız dükkânı olan ilçeler (okuma API'si için). */
  talep: Map<string, Map<string, number>>;
}

function dukkanAnahtari(dugum: number, oyuncu: OyuncuId, ekYapi: number): string {
  return `${dugum}\u0000${oyuncu}\u0000${ekYapi}`;
}

/** Düğümlerinden birinde malın stoğu, üretimi ya da yoldan gelen akışı var mı (`pazar/piyasa.ts isletmeAgindaMalVarMi` ile AYNI koşul; §6.4 Adım 1). */
function malVarMi(d: Dunya, dugumler: readonly number[], mal: number, t: number): boolean {
  for (const r of dugumler) {
    const b = d.bolgeler[r] as BolgeDurumu;
    if (b.merkez === undefined) continue;
    const s = b.stoklar[mal] as Stok;
    if (anlikMiktar(s, t) > 0 || (b.uretimOrani[mal] as number) > 0 || s.gelenOran > 0) return true;
  }
  return false;
}

/** Çözümdeki dükkânları (işletme sırasıyla) toplar; hiç yoksa boş dizi. Perakende kapalıysa boş. */
function dukkanlariTopla(d: Dunya, ic: DerlenmisIcerik): YerelDukkanKaydi[] {
  const mk = ic.mulk;
  const m = d.mulk;
  const l: YerelDukkanKaydi[] = [];
  if (mk === undefined || m === undefined || mk.perakende === undefined) return l;
  for (const isl of m.isletmeler) {
    const b = d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu;
    if (b.ekYapilar === undefined) continue;
    for (const e of b.ekYapilar) {
      if (e.dukkan === undefined) continue;
      const ilce = mk.hucreler.get(e.hucreler[0] as string)?.ilce;
      if (ilce === undefined) continue;
      l.push({ dugum: isl.bolgeIndeksi, oyuncu: isl.oyuncu, ilce, e, d: e.dukkan });
    }
  }
  return l;
}

/**
 * Yerel pazarı çözer (§6.3, §6.4; çözüm başına BİR geçiş). `null`: perakende kapalı / dünyada dükkân yok (hiçbir tahsis yapılmaz; çağıran eski yolu izler).
 * `sahipli`: oyuncu -> düğümleri (çağıranın zaten hesapladığı; verilmezse hesaplanır).
 */
export function yerelPazarCoz(d: Dunya, ctx: Baglam, sahipli?: ReadonlyMap<OyuncuId, readonly number[]>): YerelCozum | null {
  const ic = ctx.ic;
  const pk = ic.mulk?.perakende;
  if (pk === undefined || d.mulk === undefined) return null;
  const dukkanlar = dukkanlariTopla(d, ic);
  if (dukkanlar.length === 0) return null;
  const p = pk.p;
  const t = d.zaman;
  const tb = icerikTablosu(ic);
  const dugumler = sahipli ?? oyuncuDugumleri(d);
  const mevcutOnbellek = new Map<string, boolean>();
  const mevcut = (oyuncu: OyuncuId, mal: number): boolean => {
    const anahtar = `${oyuncu}\u0000${mal}`;
    let v = mevcutOnbellek.get(anahtar);
    if (v === undefined) {
      v = malVarMi(d, dugumler.get(oyuncu) ?? BOS_DUGUMLER, mal, t);
      mevcutOnbellek.set(anahtar, v);
    }
    return v;
  };
  const ilceDukkan = new Map<string, YerelDukkan[]>();
  const kayitlar: YerelDukkanKaydi[] = [];
  for (const k of dukkanlar) {
    const tur = pk.turler.get(k.d.tur);
    if (tur === undefined) continue; // içerik uyumu (dunyaIcerikUyumu) bunu reddeder; savunma
    const olcek = p.olcekler[k.d.olcek];
    const yuvalar: YerelYuva[] = k.d.raf.map((y) => {
      const ek = etkinKademe(y.fiyat, p.kampanyaKademesi, k.d.kampanya?.bitis, p.varsayilanFiyatKademesi, t);
      const fiyatPpm = p.fiyatKademeleriPpm[ek] as number;
      if (y.mal === undefined) return { mevcut: false, fiyatPpm };
      const mi = ic.malIndeks[y.mal];
      return { mal: y.mal, mevcut: mi !== undefined && tur.malKumesi.has(mi) && mevcut(k.oyuncu, mi), fiyatPpm };
    });
    let l = ilceDukkan.get(k.ilce);
    if (l === undefined) {
      l = [];
      ilceDukkan.set(k.ilce, l);
    }
    l.push({ dugum: k.dugum, oyuncu: k.oyuncu, ekYapi: k.e.id, tamCesit: tur.tamCesit, kasaMiliSaat: olcek.kasaMiliSaat, cekimCarpaniPpm: olcek.cekimCarpaniPpm, giderMiliSaat: olcek.giderMiliSaat, yuvalar });
    kayitlar.push(k);
  }
  if (kayitlar.length === 0) return null;

  // Talep Q (§6.5): ilçe x mal; yalnız dükkânı olan ilçeler. Q = 0 olan mal paylaşıma girmez.
  const talep = new Map<string, Map<string, number>>();
  const ilceler: YerelIlce[] = [];
  for (const [ilce, dk] of ilceDukkan) {
    const haneTalebi = ilceHaneTalebi(d, ic, ilce);
    const tl = haneTalebi.map(([mal, q]) => ({ mal, q }));
    const qHarita = new Map(haneTalebi);
    talep.set(ilce, qHarita);
    ilceler.push({ ilce, talep: tl, dukkanlar: dk });
  }
  const sonuc = yerelPazarHesapla({ cesitKatsayiPpm: p.cesitKatsayiPpm, esnaf: p.esnaf }, ilceler);

  const istek = new Map<number, Mili[]>();
  const satirlar = new Map<number, YerelSatirKaydi[]>();
  for (const s of sonuc.satirlar) {
    const m = ic.malIndeks[s.mal] as number;
    let sl = satirlar.get(s.dugum);
    if (sl === undefined) {
      sl = [];
      satirlar.set(s.dugum, sl);
    }
    sl.push({ s, m });
  }
  for (const di of sonuc.dugumIstek) {
    let a = istek.get(di.dugum);
    if (a === undefined) {
      a = new Array<number>(tb.malSayisi).fill(0);
      istek.set(di.dugum, a);
    }
    a[ic.malIndeks[di.mal] as number] = di.istek;
  }
  const gider = new Map<number, number>();
  for (const g of sonuc.dugumGider) gider.set(g.dugum, g.giderMiliSaat);
  const dukkanIndeks = new Map<string, YerelDukkanKaydi>();
  for (const k of kayitlar) dukkanIndeks.set(dukkanAnahtari(k.dugum, k.oyuncu, k.e.id), k);
  return { sonuc, istek, satirlar, gider, dukkanlar: kayitlar, dukkanIndeks, talep };
}

/**
 * Yuva başına gerçekleşen satış oranını (`RafYuvasi.satisOran`; mili-birim/saat) yazar (§7.1b): her dükkânın TÜM yuvaları taranır; `gercek > 0` ise yazılır, aksi halde alan silinir
 * (eski oran kalmasın). `gercek` = `carpBol(istek, hesaplar[dugum].frD[mal], PPM)` (gelir ifadesiyle AYNI). `satis` sayacını `paraMuhasebesi` tembel biriktirir.
 */
export function yerelSatisYaz(yerel: YerelCozum, frD: (dugum: number, mal: number) => number): void {
  const gercekler = new Map<RafYuvasi, number>();
  for (const [dugum, sl] of yerel.satirlar) {
    for (const { s, m } of sl) {
      const k = yerel.dukkanIndeks.get(dukkanAnahtari(dugum, s.oyuncu, s.ekYapi));
      const y = k?.d.raf[s.yuva];
      if (y === undefined) continue;
      gercekler.set(y, carpBol(s.istek, frD(dugum, m), PPM));
    }
  }
  for (const k of yerel.dukkanlar) {
    for (const y of k.d.raf) {
      const g = gercekler.get(y);
      if (g !== undefined && g > 0) y.satisOran = g;
      else if (y.satisOran !== undefined) delete y.satisOran;
    }
  }
}

/** Oyuncu başına dükkân yuvaları (`paraMuhasebesi` yuva satış sayacı için; yalnız dükkânlı dünyada anlamlı). Dükkân yoksa boş harita. */
export function oyuncuDukkanYuvalari(d: Dunya): Map<OyuncuId, RafYuvasi[]> {
  const m = new Map<OyuncuId, RafYuvasi[]>();
  if (d.mulk === undefined) return m;
  for (const isl of d.mulk.isletmeler) {
    const b = d.bolgeler[isl.bolgeIndeksi] as BolgeDurumu;
    if (b.ekYapilar === undefined) continue;
    for (const e of b.ekYapilar) {
      if (e.dukkan === undefined) continue;
      let l = m.get(isl.oyuncu);
      if (l === undefined) {
        l = [];
        m.set(isl.oyuncu, l);
      }
      for (const y of e.dukkan.raf) l.push(y);
    }
  }
  return m;
}

// ---------------------------------------------------------------------------
// Okuma API'si (§6.8): saf, durumu değiştirmez
// ---------------------------------------------------------------------------

export interface YerelYuvaGorunumu {
  mal?: string;
  fiyatKademesi: number;
  etkinKademe: number;
  /** Malın oyuncunun ağında bulunup bulunmadığı (stok, üretim ya da gelen akış); çekime girip girmediğini söyler. */
  mevcut: boolean;
  /** Kasa kırpmalı istek (mili-birim/saat); satırı yoksa 0. */
  istek: Mili;
  /** İlçedeki bu malın talebi Q (mili-birim/saat); mal yoksa 0. */
  q: Mili;
  /** Bu yuvanın kümülatif satışı (mili-birim, tam kısım; `satis.n`). */
  satisMili: Mili;
}

export interface DukkanGorunumu {
  ekYapi: number;
  dugum: number;
  ilce: string;
  yuvalar: YerelYuvaGorunumu[];
  /** Kasa doluluğu (ppm; Σ istek / kasa kapasitesi; en çok PPM). */
  kasaDolulukPpm: number;
  giderMiliSaat: Mili;
  /** Dükkân toplamı satış (mili-birim; Σ yuva `satis.n`; türetilir, saklanmaz). */
  satisMili: Mili;
  /** Kampanya penceresi: etkinse bitiş ve kalan süre (saat, tavan); değilse tanımsız. */
  kampanya?: { bitis: number; kalanSaat: number };
}

/** Dükkân başına toplam satış (Σ yuva `satis.n`; saklanmaz, türetilir; §7.1b). */
export function dukkanSatisMili(dk: DukkanDurumu): Mili {
  let t = 0;
  for (const y of dk.raf) t += y.satis?.n ?? 0;
  return t;
}

/**
 * Oyuncunun dükkânlarının tahmini satış görünümü: çözümle AYNI çekirdeği (`yerelPazarCoz`) kullanır; durumu DEĞİŞTİRMEZ. `d.zaman` anındaki durum ve stok esas alınır.
 * Perakende kapalı ya da oyuncunun dükkânı yoksa boş dizi.
 */
export function yerelPazarGorunumu(d: Dunya, ctx: Baglam, oyuncu: OyuncuId): DukkanGorunumu[] {
  const yerel = yerelPazarCoz(d, ctx);
  const pk = ctx.ic.mulk?.perakende;
  if (yerel === null || pk === undefined) return [];
  const t = d.zaman;
  const out: DukkanGorunumu[] = [];
  const dugumler = oyuncuDugumleri(d).get(oyuncu) ?? BOS_DUGUMLER;
  const satirAnahtar = new Map<string, number>();
  for (const s of yerel.sonuc.satirlar) satirAnahtar.set(`${s.dugum}\u0000${s.oyuncu}\u0000${s.ekYapi}\u0000${s.yuva}`, s.istek);
  for (const k of yerel.dukkanlar) {
    if (k.oyuncu !== oyuncu) continue;
    const tur = pk.turler.get(k.d.tur);
    const olcek = pk.p.olcekler[k.d.olcek];
    let toplam = 0;
    const yuvalar: YerelYuvaGorunumu[] = k.d.raf.map((y, i) => {
      const ek = etkinKademe(y.fiyat, pk.p.kampanyaKademesi, k.d.kampanya?.bitis, pk.p.varsayilanFiyatKademesi, t);
      const istek = satirAnahtar.get(`${k.dugum}\u0000${k.oyuncu}\u0000${k.e.id}\u0000${i}`) ?? 0;
      toplam += istek;
      const mi = y.mal === undefined ? undefined : ctx.ic.malIndeks[y.mal];
      const v: YerelYuvaGorunumu = {
        fiyatKademesi: y.fiyat,
        etkinKademe: ek,
        mevcut: mi !== undefined && tur !== undefined && tur.malKumesi.has(mi) && malVarMi(d, dugumler, mi, t),
        istek,
        q: y.mal === undefined ? 0 : (yerel.talep.get(k.ilce)?.get(y.mal) ?? 0),
        satisMili: y.satis?.n ?? 0,
      };
      if (y.mal !== undefined) v.mal = y.mal;
      return v;
    });
    const g: DukkanGorunumu = {
      ekYapi: k.e.id,
      dugum: k.dugum,
      ilce: k.ilce,
      yuvalar,
      kasaDolulukPpm: olcek.kasaMiliSaat <= 0 ? 0 : Math.min(PPM, carpBol(toplam, PPM, olcek.kasaMiliSaat)),
      giderMiliSaat: olcek.giderMiliSaat,
      satisMili: dukkanSatisMili(k.d),
    };
    const bitis = k.d.kampanya?.bitis;
    if (bitis !== undefined && bitis > t) g.kampanya = { bitis, kalanSaat: Math.ceil((bitis - t) / SAAT) };
    out.push(g);
  }
  return out;
}
