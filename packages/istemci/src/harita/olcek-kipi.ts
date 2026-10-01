/**
 * Ölçek büyütme kipi (G2; DOM + MapLibre): İşletmem'de tesis satırındaki "Büyüt" → harita tesisin ilçesine gider, ek hücreler
 * hayalet olarak gösterilir, maliyet kartı (arsa + büyütme bedeli tek toplamda) → onay → tek `tesis_olcek_yukselt` komutu.
 *
 * Plan saf ve otomatiktir (`olcek.ts`): önce oyuncunun BOŞ hücreleri, sonra sahipsiz bitişik hücreler, hepsi tek arsa sınıfında;
 * hayaletteki hücreleri oyuncu elle değiştirmez (bu sprintte yok). Büyütmeye 5 dk geri al yok. Maliyet kartı yapı kartının
 * (`#yapi-kart`) kabını kullanır; yerleşim kipiyle aynı anda yalnız biri açıktır. Klavye: Enter büyüt · Esc vazgeç.
 */
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, Map as MlHarita } from "maplibre-gl";
import { bildir } from "../arayuz/bildirim";
import { esc, fmt, paraMili, para, sureMetni } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import { ikon } from "../tasarim/ikon";
import type { IlceSahipligi, MulkBaglantisi, YapiKaydi } from "./baglanti";
import { hucreSiniri, idCoz } from "./hucre";
import type { Izgara } from "./hucre";
import { olcekHedefleri, olcekPlani, olcekTesisi, OLCEK_AD } from "./olcek";
import type { HedefOlcek, OlcekPlani, OlcekTesisi } from "./olcek";
import type { YapiMalzemesi } from "./yapi";
import { KartDurumu, kapaliDugmeOznitelikleri } from "./kart-durum";
import { SINIF_ADI } from "./fiyat";
import type { AyrilmisHakki } from "./fiyat";

export interface OlcekKipiGirdisi {
  ml: MlHarita;
  /** Maliyet kartının kabı (yapı kartıyla ortak `#yapi-kart`). */
  kart: HTMLElement;
  baglanti: MulkBaglantisi;
  ic: Icerik;
  ilce: () => string | null;
  /** İlçenin üst il kimliği (işletme düğümü `<il>#<oyuncu>`). */
  il: (ilce: string) => string | null;
  izgara: () => Izgara | null;
  sahiplik: () => IlceSahipligi | null;
  ad: (sahip: string) => string;
  /** Yapı türü kimliğinden görünen ad. */
  yapiAdi: (tur: string) => string;
  /** Hücre kamu arsasındaysa Türkçe ret nedeni, değilse null. */
  kamu: (id: string) => string | null;
  /** Sahipliği sunucudan tazeler ve çizer. */
  yenile: () => Promise<void>;
  /** Haritayı hücrelere yaklaştırır (L3). */
  yakinlas: (hucreler: readonly string[]) => void;
  /** Maliyet kartı açıkken alt çubuğu gizle/göster. */
  altGizle: (gizle: boolean) => void;
  /** Yapı yerleşim kipini kapat (aynı anda yalnız biri açık). */
  yerlesimIptal: () => void;
  /** Oyuncunun bu ilçedeki ayrılmış hücre hakkı (bilinmiyorsa tanımsız). */
  ayrilmisHakki?: () => AyrilmisHakki | undefined;
}

const BOS: FeatureCollection = { type: "FeatureCollection", features: [] };
/** Gereken tutar: yukarı yuvarlanır (hazine ise aşağı; `paraMili` varsayılanı). */
const TL = (mili: number): string => paraMili(mili, "yukari");

function renk(ad: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(ad).trim() || "#888";
}

function hucreCokgeni(x: number, y: number, oz: Record<string, unknown>): Feature<Polygon> {
  const [b, g, d, k] = hucreSiniri(x, y);
  return { type: "Feature", properties: oz, geometry: { type: "Polygon", coordinates: [[[b, g], [d, g], [d, k], [b, k], [b, g]]] } };
}

const malzemeSatiri = (l: readonly YapiMalzemesi[]): string => l.map((m) => `${m.ad} ${fmt(m.miktar / 1000)}`).join(" · ");

/** Hayalet özellik türü: 0 büyüyen tesis, 1 kendi boş hücren, 2 satın alınacak (kesikli). */
const TESIS = 0;
const KENDI = 1;
const ALINACAK = 2;

export class OlcekKipi {
  private tesisAnahtari: string | null = null;
  private hedef: HedefOlcek = 1;
  private plan: OlcekPlani | null = null;
  private tesis: OlcekTesisi | null = null;
  private uygulaniyor = false;
  private hazir = false;
  /** Kalıcı neden bölgesi (`role=status`; kart-durum.ts). */
  private readonly nedenBolgesi = new KartDurumu();

  constructor(private g: OlcekKipiGirdisi) {
    g.kart.addEventListener("click", (e) => {
      if (!this.aktif) return;
      const b = (e.target as HTMLElement).closest("button[data-ok]") as HTMLButtonElement | null;
      const ey = b?.dataset["ok"];
      if (b?.getAttribute("aria-disabled") === "true") return; // kapalı onay düğmesi etkisiz (neden bölgede okunur)
      if (ey === "vazgec") this.iptal();
      else if (ey === "onayla") void this.onayla();
      else if (ey === "olcek-1") this.hedefSec(1);
      else if (ey === "olcek-2") this.hedefSec(2);
    });
  }

  get aktif(): boolean {
    return this.tesisAnahtari !== null;
  }

  /** Sınama kancası: şu anki plan. */
  get gecerliPlan(): OlcekPlani | null {
    return this.plan;
  }

  /** Harita stili yüklendikten sonra: hayalet kaynağı ve katmanları. */
  kur(): void {
    const h = this.g.ml;
    if (this.hazir) return;
    h.addSource("olcek-hayalet", { type: "geojson", data: BOS });
    h.addLayer({
      id: "olcek-hayalet-dolgu",
      type: "fill",
      source: "olcek-hayalet",
      paint: { "fill-color": ["match", ["get", "r"], TESIS, renk("--murekkep-3"), renk("--sen")], "fill-opacity": ["match", ["get", "r"], TESIS, 0.12, KENDI, 0.5, 0.28] },
    });
    h.addLayer({
      id: "olcek-hayalet-cizgi",
      type: "line",
      source: "olcek-hayalet",
      filter: ["!=", ["get", "r"], ALINACAK],
      paint: { "line-color": ["match", ["get", "r"], TESIS, renk("--murekkep"), renk("--sen")], "line-width": ["match", ["get", "r"], TESIS, 3, 2.2] },
    });
    h.addLayer({ id: "olcek-hayalet-bos-cizgi", type: "line", source: "olcek-hayalet", filter: ["==", ["get", "r"], ALINACAK], paint: { "line-color": renk("--sen"), "line-width": 2.2, "line-dasharray": [1.6, 1.2] } });
    this.hazir = true;
  }

  temaUygula(): void {
    if (!this.hazir) return;
    const h = this.g.ml;
    h.setPaintProperty("olcek-hayalet-dolgu", "fill-color", ["match", ["get", "r"], TESIS, renk("--murekkep-3"), renk("--sen")]);
    h.setPaintProperty("olcek-hayalet-cizgi", "line-color", ["match", ["get", "r"], TESIS, renk("--murekkep"), renk("--sen")]);
    h.setPaintProperty("olcek-hayalet-bos-cizgi", "line-color", renk("--sen"));
  }

  // --- akış -------------------------------------------------------------------------------------------

  private kayit(): YapiKaydi | undefined {
    return this.g.sahiplik()?.yapilar?.find((y) => y.anahtar === this.tesisAnahtari);
  }

  /** Tesisi büyütme kipine alır (İşletmem'den; harita tesisin ilçesinde ve ızgara yüklü olmalı). Başlayamazsa false. */
  baslat(anahtar: string): boolean {
    const y = this.g.sahiplik()?.yapilar?.find((k) => k.anahtar === anahtar);
    if (!y || !this.g.izgara()) return false;
    const t = olcekTesisi(this.g.ic, y, this.g.yapiAdi);
    if (!t || !this.g.baglanti.olcekYukselt) {
      bildir("Bu yapı büyütülemez.", "hata");
      return false;
    }
    this.g.yerlesimIptal();
    this.tesisAnahtari = anahtar;
    this.tesis = t;
    this.hedef = olcekHedefleri(this.g.ic, t)[0]?.olcek ?? 1;
    this.g.altGizle(true);
    this.g.yakinlas(t.hucreler);
    this.planla();
    return true;
  }

  iptal(): void {
    if (!this.aktif) return;
    this.tesisAnahtari = null;
    this.tesis = null;
    this.plan = null;
    this.g.altGizle(false);
    this.hayaletCiz(null);
    this.g.kart.hidden = true;
  }

  hedefSec(k: HedefOlcek): void {
    if (!this.aktif || this.uygulaniyor) return;
    this.hedef = k;
    this.planla();
  }

  /** Sahiplik, hazine ya da inşaat değişti: planı yeniden hesapla (tesis büyüdüyse ya da kalktıysa kipten çık). */
  tazele(): void {
    if (!this.aktif) return;
    const y = this.kayit();
    const t = y ? olcekTesisi(this.g.ic, y, this.g.yapiAdi) : null;
    if (!t || this.g.sahiplik()?.yapilar?.some((k) => k.yukseltme?.tesis === t.id)) {
      if (!this.uygulaniyor) this.iptal();
      return;
    }
    this.tesis = t;
    if (!olcekHedefleri(this.g.ic, t).some((h) => h.olcek === this.hedef)) this.hedef = olcekHedefleri(this.g.ic, t)[0]?.olcek ?? this.hedef;
    this.planla();
  }

  /** Klavye: Enter büyüt, Esc vazgeç. İşlendiyse true. */
  tus(e: KeyboardEvent): boolean {
    if (!this.aktif) return false;
    if (e.key === "Enter") {
      if (this.plan?.gecerli) void this.onayla();
      return true;
    }
    if (e.key === "Escape") {
      this.iptal();
      return true;
    }
    return false;
  }

  private planla(): void {
    const t = this.tesis;
    const iz = this.g.izgara();
    const sh = this.g.sahiplik();
    if (!t || !iz || !sh) return;
    const oz = this.g.baglanti.ozet?.() ?? null;
    const isl = this.g.baglanti.isletme?.() ?? null;
    const stok = isl ? (mal: string): number | null => isl.mallar.find((m) => m.mal === mal)?.stokMili ?? 0 : undefined;
    this.plan = olcekPlani({
      ic: this.g.ic,
      tesis: t,
      hedef: this.hedef,
      izgara: iz,
      sahiplik: sh,
      ben: this.g.baglanti.ben.id,
      ad: this.g.ad,
      kamu: this.g.kamu,
      ...(this.g.ayrilmisHakki?.() ? { ayrilmisHakki: this.g.ayrilmisHakki() as AyrilmisHakki } : {}),
      hazineMili: oz?.hazineMili ?? null,
      surenInsaat: oz?.surenInsaat ?? 0,
      ...(this.g.ic.param.mulk?.esZamanliInsaat !== undefined ? { esZamanliInsaat: this.g.ic.param.mulk.esZamanliInsaat } : {}),
      ...(stok ? { stok } : {}),
    });
    this.hayaletCiz(this.plan);
    this.kartiYaz();
  }

  private hayaletCiz(p: OlcekPlani | null): void {
    const src = this.g.ml.getSource("olcek-hayalet") as GeoJSONSource | undefined;
    if (!src) return;
    if (!p || !this.tesis) {
      src.setData(BOS);
      return;
    }
    const f: Feature<Polygon>[] = [];
    for (const id of this.tesis.hucreler) {
      const c = idCoz(id);
      if (c) f.push(hucreCokgeni(c.x, c.y, { r: TESIS }));
    }
    for (const id of p.ekHucreler) {
      const c = idCoz(id);
      if (c) f.push(hucreCokgeni(c.x, c.y, { r: p.alinacak.includes(id) ? ALINACAK : KENDI }));
    }
    src.setData({ type: "FeatureCollection", features: f });
  }

  // --- kart -------------------------------------------------------------------------------------------

  private kartiYaz(): void {
    const t = this.tesis;
    const p = this.plan;
    if (!t || !p) {
      this.g.kart.hidden = true;
      return;
    }
    const oz = this.g.baglanti.ozet?.() ?? null;
    const hedefler = olcekHedefleri(this.g.ic, t);
    const baslik = `<div class="yk-baslik"><div><b>${esc(t.ad)} büyüt</b><small>${OLCEK_AD[t.olcek]} ölçek · ${fmt(t.hucreler.length)} hücre</small></div><button type="button" data-ok="vazgec" aria-label="Vazgeç (Esc)" title="Vazgeç (Esc)">${ikon("x", 18)}</button></div>`;
    const olcekSatiri =
      hedefler.length > 1
        ? `<div class="yk-dugmeler" role="group" aria-label="Hedef ölçek">${hedefler.map((h) => `<button type="button" data-ok="olcek-${h.olcek}" aria-pressed="${h.olcek === this.hedef}">${h.ad} ölçek · ${fmt(h.hucre)} hücre</button>`).join("")}</div>`
        : "";
    const h = p.hedef;
    let arsa: string;
    if (p.alinacak.length > 0) arsa = `${fmt(p.alinacak.length)} hücre alınacak${p.sinif ? ` (${esc(SINIF_ADI[p.sinif])})` : ""} · <b>${TL(p.arsaMili)}</b>`;
    else if (p.ekHucreler.length > 0) arsa = `${fmt(p.ekHucreler.length)} hücre kendi arsan · <b>${para(0)}</b>`;
    else arsa = `Ek hücre gerekmiyor · <b>${para(0)}</b>`;
    const malzeme = malzemeSatiri(h.malzeme);
    const sure = `${sureMetni(h.sureSaat)}${h.ilkGunSureSaat < h.sureSaat ? ` <small>(yeni oyuncuya ilk gün ≈ ${sureMetni(h.ilkGunSureSaat)})</small>` : ""}`;
    const ek = p.ekHucreler.length > 0 ? `<dt>Ek hücre</dt><dd data-ok-alan="ek">${fmt(p.ekHucreler.length)} bitişik hücre</dd>` : "";
    const govde = `<dl class="yk-satirlar">
        ${ek}
        <dt>Arsa</dt><dd data-ok-alan="arsa">${arsa}</dd>
        <dt>Büyütme</dt><dd data-ok-alan="yapi"><b>${TL(p.yapiMili)}</b>${malzeme ? ` <small>+ ${esc(malzeme)}</small>` : ""}</dd>
        <dt>Süre</dt><dd data-ok-alan="sure">${sure}</dd>
        <dt class="yk-toplam">Toplam</dt><dd class="yk-toplam" data-ok-alan="toplam"><b>${TL(p.toplamMili)}</b>${oz?.hazineMili != null ? ` <small>Hazine ${paraMili(oz.hazineMili)}</small>` : ""}</dd>
      </dl>
      ${p.neden ? `<span data-yk-neden-yer></span>` : ""}`;
    this.nedenBolgesi.yaz(p.neden);
    const dugme = this.uygulaniyor ? "Büyütülüyor…" : `${h.ad} ölçeğe büyüt`;
    this.g.kart.innerHTML = `${baslik}${olcekSatiri}${govde}<div class="yk-dugmeler"><button type="button" data-ok="vazgec">Vazgeç</button><button type="button" class="birincil" data-ok="onayla" ${kapaliDugmeOznitelikleri(p.gecerli && !this.uygulaniyor, !!p.neden)}>${esc(dugme)}</button></div>`;
    this.nedenBolgesi.yerlestir(this.g.kart);
    this.g.kart.hidden = false;
  }

  private async onayla(): Promise<void> {
    const p = this.plan;
    const t = this.tesis;
    const ilce = this.g.ilce();
    const il = ilce ? this.g.il(ilce) : null;
    if (!p || !t || !p.gecerli || !ilce || !il || this.uygulaniyor || !this.g.baglanti.olcekYukselt) return;
    this.uygulaniyor = true;
    this.kartiYaz();
    const ad = t.ad;
    try {
      const r = await this.g.baglanti.olcekYukselt({ bolge: `${il}#${this.g.baglanti.ben.id}`, tesis: t.id, olcek: p.hedef.olcek, ekHucreler: p.ekHucreler, ...(p.sinif && p.alinacak.length > 0 ? { sinif: p.sinif } : {}) });
      if (r.tamam) {
        const arsa = p.alinacak.length > 0 ? `arsa ${fmt(p.alinacak.length)} hücre, ${TL(p.arsaMili)} + ` : "";
        bildir(`${ad} ${p.hedef.ad} ölçeğe büyütülüyor: ${arsa}büyütme ${TL(p.yapiMili)}.`, "tamam");
        await this.g.yenile();
        this.uygulaniyor = false;
        this.iptal();
        return;
      }
      bildir(`${ad} büyütülemedi: ${/[.!?]$/.test(r.mesaj) ? r.mesaj : `${r.mesaj}.`} Hiçbir şey değişmedi.`, "hata");
      await this.g.yenile();
    } catch (e) {
      bildir(`Olmadı: ${e instanceof Error ? e.message : String(e)}`, "hata");
    } finally {
      this.uygulaniyor = false;
      if (this.aktif) this.tazele();
    }
  }
}
