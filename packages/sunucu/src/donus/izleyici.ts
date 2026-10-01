/**
 * Özet kayıtları izleyicisi (D3): çekirdek durumundan, adım taneciğinden BAĞIMSIZ kayıtlar türetir; çekirdeğe kanca eklemez
 * (çekirdek durumunu YALNIZ okur).
 *
 * - **İnşaat bitti:** süren inşaatlar kayda alınır (her başarılı komuttan hemen sonra ve her turda taranır; bu yüzden kısa
 *   inşaat bile bitmeden önce görülür). Durumdan kaybolan bir inşaat `bitis ≤ şimdi` ise BİTMİŞTİR ve kaydın zamanı `t = bitis`
 *   (olayın kesin sim zamanı, durumdan okunur; taramanın yapıldığı an DEĞİL); aksi halde iptal edilmiştir ve kayıt yoktur
 *   (başarılı `insaat_iptal` ayrıca bildirilir: aynı t'de iptal/bitiş sıralamasını kesinleştirir).
 * - **Satış toplamı:** her sim-günü sınırında (`t % GUN === 0`; `t = 0` Türkiye gece yarısına hizalıdır) oyuncunun kümülatif
 *   ihracat / gider sayaçları değiştiyse bir kayıt: `[günlükİhracatFarkı, günlükGiderFarkı, kümülatifİhracat, kümülatifGider]`.
 *   Kümülatif değerler kayıtta durduğu için kurtarmada önceki sınır depodan okunur; sınırlar `calistirKadar` adımları sınırda
 *   durdurularak kesin t'de taranır (yazar uygular), böylece canlı koşu, yetişme ve kurtarma yeniden oynatması AYNI kaydı üretir.
 * - İdempotans anahtarı `(oyuncu, tur, t, sira)`; `sira` = inşaat kimliği (satış toplamında 0). Günlük seq'ine bağlı değildir.
 */
import { GUN, SAAT, carpBol } from "@bolge/cekirdek";
import type { DerlenmisIcerik, Dunya } from "@bolge/cekirdek";
import type { OzetKaydi } from "../depo/tipler";

export interface OyuncuKaydi {
  oyuncu: string;
  kayit: OzetKaydi;
}

interface Izlenen {
  sahip: string;
  hedef: string;
  ilce: string;
  bolge: number;
  bitis: number;
}

function tembel(toplam: number, oran: number, t0: number, t: number): number {
  const dt = t - t0;
  return dt > 0 && oran !== 0 ? toplam + carpBol(oran, dt, SAAT) : toplam;
}

export class OzetIzleyici {
  private readonly izlenen = new Map<number, Izlenen>();
  /** Oyuncu başına son yayımlanan satış kümülatifleri `[ihracat, gider]` (kurtarmada depodan yüklenir). */
  private readonly sonSatis = new Map<string, [number, number]>();
  private sonSinirT = Number.NEGATIVE_INFINITY;

  constructor(private readonly ic: DerlenmisIcerik) {}

  /** Kayıt almadan, yüklenen durumdaki süren inşaatları izlemeye başlar ve sonraki gün sınırını hizalar. */
  baslat(d: Readonly<Dunya>): void {
    this.izlenen.clear();
    for (const i of d.insaatlar) this.izlenen.set(i.id, this.tanim(d, i));
    this.sonSinirT = Math.floor(d.zaman / GUN) * GUN;
  }

  /** Depodaki son satış toplamı kaydından (varsa) sınır tabanını yükler. */
  satisTabani(oyuncu: string, ihracat: number, gider: number): void {
    this.sonSatis.set(oyuncu, [ihracat, gider]);
  }

  private tanim(d: Readonly<Dunya>, i: Readonly<Dunya["insaatlar"][number]>): Izlenen {
    let hedef: string;
    if (i.tur === "tesis") hedef = i.ekYapi ?? this.ic.tesisTurleri[i.hedef]?.id ?? "";
    else hedef = i.tur;
    let ilce = "";
    const h0 = i.hucreler?.[0];
    if (h0 !== undefined) ilce = this.ic.mulk?.hucreler.get(h0)?.ilce ?? "";
    if (ilce === "") ilce = d.bolgeler[i.bolge]?.id ?? "";
    return { sahip: i.sahip, hedef, ilce, bolge: i.bolge, bitis: i.bitis };
  }

  /**
   * Süren inşaatları durumla eşler: yeniler izlemeye alınır, kaybolanlar bitmişse kayıt üretir. `iptal`: bu komutla başarıyla iptal
   * edilen inşaat kimliği (bitmiş sayılmaz).
   */
  tara(d: Readonly<Dunya>, iptal?: number): OyuncuKaydi[] {
    const sonuc: OyuncuKaydi[] = [];
    const mevcut = new Set<number>();
    for (const i of d.insaatlar) {
      mevcut.add(i.id);
      if (!this.izlenen.has(i.id)) this.izlenen.set(i.id, this.tanim(d, i));
    }
    for (const [id, k] of this.izlenen) {
      if (mevcut.has(id)) continue;
      this.izlenen.delete(id);
      if (id === iptal || k.bitis > d.zaman) continue; // iptal edildi
      sonuc.push({ oyuncu: k.sahip, kayit: { t: k.bitis, tur: "insaat_bitti", ilce: k.ilce, degerler: [k.hedef, k.bolge], sira: id } });
    }
    return sonuc;
  }

  /** `d.zaman` bir gün sınırıysa ve işlenmediyse: oyuncu başına satış toplamı kayıtları (değişim varsa). */
  gunSiniri(d: Readonly<Dunya>): OyuncuKaydi[] {
    const t = d.zaman;
    if (t % GUN !== 0 || t <= this.sonSinirT) return [];
    this.sonSinirT = t;
    const sonuc: OyuncuKaydi[] = [];
    for (const o of d.oyuncular) {
      const df = o.ticaretDefteri;
      if (!df) continue;
      const ihracat = tembel(df.toplam.brutIhracat, df.oran.brutIhracat, df.t0, t);
      const gider =
        tembel(df.toplam.brutIthalat, df.oran.brutIthalat, df.t0, t) + tembel(df.toplam.komisyon, df.oran.komisyon, df.t0, t) + tembel(df.toplam.prim, df.oran.prim, df.t0, t);
      const onceki = this.sonSatis.get(o.id);
      if (onceki === undefined ? ihracat === 0 && gider === 0 : onceki[0] === ihracat && onceki[1] === gider) continue;
      const [pi, pg] = onceki ?? [0, 0];
      this.sonSatis.set(o.id, [ihracat, gider]);
      sonuc.push({ oyuncu: o.id, kayit: { t, tur: "satis_toplami", ilce: "", degerler: [ihracat - pi, gider - pg, ihracat, gider], sira: 0 } });
    }
    return sonuc;
  }

  /** `t`'den sonraki ilk gün sınırı (kesin; `t` sınırdaysa bir sonraki). */
  static sonrakiSinir(t: number): number {
    return (Math.floor(t / GUN) + 1) * GUN;
  }
}
