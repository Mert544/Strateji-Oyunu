/** İlçenin nüfusu, kamu muhasebesi ve gerçek siparişlere oyuncunun teslimi. */
import type { IlceKaresi } from "@bolge/protokol";
import type { Komut } from "@bolge/cekirdek";
import { esc, fmt, paraMili, sayi } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";
import type { DukkanKaresi, TesisSonucu } from "./baglanti";
import { baskinGorunumuHtml } from "./baskin-gorunum";
import { kamuSiparisHtml } from "./kamu-siparis";
import "./baskin-gorunum.css";
import "./kamu-siparis.css";

export interface IlceYasamGorunumu {
  id: string;
  il?: string;
  secim: "harita" | "katilim" | "mulk";
  nufus?: number;
  nufusKaynak?: "kayit" | "esdeger";
  talep?: ReadonlyArray<readonly [mal: string, miliSaat: number]>;
  talepKapsami?: "hane" | "raf";
  karsilanma?: NonNullable<IlceKaresi["yasam"]>["karsilanma"];
  kamuHucre?: number;
  dukkanSayisi?: number;
  benimHucre?: number;
  kamuKasa?: NonNullable<IlceKaresi["yasam"]>["kamuKasa"];
  muhasebeT?: number;
  simZamani?: number;
  /** Yalnız seçili ilçenin duyurulmuş genel baskın verisi. */
  pve?: IlceKaresi["pve"];
  kamuSiparis?: IlceKaresi["kamuSiparis"];
}

/** Harita seçimi varsa onu korur; seçilen ilçe henüz karede yoksa başka ilçenin sayılarını göstermez. */
export function ilceYasamGorunumuKur(kare: DukkanKaresi | null, secili: string | null): IlceYasamGorunumu | null {
  const mulk = kare?.oyuncu?.mulk;
  const katilim = mulk?.katilimIlcesi;
  const ilk = mulk?.ilceHucre.find(([, n]) => n > 0)?.[0];
  const id = secili || katilim || ilk;
  if (!id) return null;
  const c = kare?.ilceler?.find((x) => x.id === id);
  const y = c?.yasam;
  const benim = mulk?.ilceHucre.find(([x]) => x === id)?.[1];
  const talep = y?.talep ?? c?.talep;
  const g: IlceYasamGorunumu = { id, secim: secili ? "harita" : katilim ? "katilim" : "mulk" };
  if (kare) g.simZamani = kare.t;
  if (c) {
    g.il = c.il;
    if (c.pve !== undefined) g.pve = c.pve;
    if (c.kamuSiparis !== undefined) g.kamuSiparis = c.kamuSiparis;
    // Çok hücreli dükkân bir kez sayılır. İnşa hâlindeki dükkân sayılmaz.
    g.dukkanSayisi = new Set(c.hucreler.filter((h) => h[3] >= 0 && h[5] === "dukkan").map((h) => h[3])).size;
    if (c.kamuAdet !== undefined) g.kamuHucre = c.kamuAdet;
  }
  if (benim !== undefined) g.benimHucre = benim;
  if (y) {
    g.nufus = y.nufus;
    g.nufusKaynak = y.nufusKaynak;
    if (y.karsilanma !== undefined) g.karsilanma = y.karsilanma;
    if (y.kamuKasa !== undefined) g.kamuKasa = y.kamuKasa;
    if (y.muhasebeT !== undefined) g.muhasebeT = y.muhasebeT;
  }
  if (talep !== undefined) {
    g.talep = talep;
    g.talepKapsami = y ? "hane" : "raf";
  }
  return g;
}

export interface IlceYasamAdlari {
  ilceAdi: (id: string) => string;
  ilAdi: (id: string) => string;
  malAdi: (id: string) => string;
  birlikAdi?: (id: string) => string;
}

function sayiKarti(ad: string, deger: string, aciklama?: string): string {
  return `<div class="iy-sayi"><dt>${esc(ad)}</dt><dd>${deger}${aciklama ? `<small>${esc(aciklama)}</small>` : ""}</dd></div>`;
}

/** Belirsiz değerler sıfırla doldurulmaz; kamu kasası verilmediyse kasa bölümü çıkmaz. */
export function ilceYasamHtml(g: IlceYasamGorunumu | null, ad: IlceYasamAdlari, ek = ""): string {
  if (!g) return `<div class="iy-bos">${ikon("map-pin", 26)}<p>Haritadan bir ilçe seçerek nüfusunu ve yerel pazarını incele.</p></div>`;
  const yer = ad.ilceAdi(g.id);
  const il = g.il ? ad.ilAdi(g.il) : "";
  const kaynak = g.secim === "harita" ? "Haritada seçtiğin ilçe" : g.secim === "katilim" ? "Katılım ilçen" : "Arsanın bulunduğu ilçe";
  let s = `<section class="iy-panel" data-ilce-yasam="${esc(g.id)}"><header class="iy-baslik"><h3>${ikon("map-pin", 18)} ${esc(yer)}</h3><p>${esc(il ? `${il} · ${kaynak}` : kaynak)}</p></header>`;
  s += '<dl class="iy-sayilar">';
  if (g.nufus !== undefined) s += sayiKarti(g.nufusKaynak === "kayit" ? "Kaynak nüfus" : "Oyun nüfusu", `${fmt(g.nufus)} <span>kişi</span>`, g.nufusKaynak === "kayit" ? "İlçe veri kaydından" : "İlçe sınıfına göre nüfus eşdeğeri");
  if (g.dukkanSayisi !== undefined) s += sayiKarti("Dükkân yapısı", fmt(g.dukkanSayisi), "İlçedeki tamamlanmış yapılar");
  if (g.kamuHucre !== undefined) s += sayiKarti("Kamu arazisi", `${fmt(g.kamuHucre)} <span>hücre</span>`, "Satışa kapalı ortak alanlar");
  s += "</dl>";
  if (g.nufus === undefined) s += '<p class="ipucu-metin">İlçe nüfusu sunucudan bekleniyor.</p>';
  s += `<div data-ilce-baskin="${esc(g.id)}">${baskinGorunumuHtml({ gorunum: "ilce", pve: g.pve, ilceAdi: ad.ilceAdi, malAdi: ad.malAdi, birlikAdi: ad.birlikAdi })}</div>`;

  if (g.talep !== undefined) {
    const raf = g.talepKapsami === "raf";
    const satislar = new Map(g.karsilanma?.map((x) => [x.mal, x]));
    s += `<section class="iy-bolum"><h4>${ikon("shopping-basket", 17)} ${raf ? "Raf mallarında yerel ihtiyaç" : "Hanelerin saatlik ihtiyacı"}</h4>`;
    s += `<p class="ipucu-metin">Oyun modelinin hesapladığı ihtiyaç; gerçek tüketim ölçümü değildir.${raf ? " Yalnız senin dükkân raflarındaki malları kapsar." : " Takvim ve dönemler bu miktarları etkiler."}</p>`;
    if (!raf) s += '<p class="ipucu-metin">Satış ve katkı, ilçedeki oyuncu dükkânlarının son çözümde kaydedilen saatlik satışını gösterir. Görünmez esnafı kapsamaz; tüm nüfusun tüketimini veya refahını ölçmez.</p>';
    if (g.talep.length) {
      s += `<div class="iy-tablo-kaydir" role="region" tabindex="0" aria-label="${raf ? "Yerel ihtiyaç tablosu" : "Hane ihtiyacı ve kayıtlı dükkân satış katkısı tablosu"}"><table class="iy-talep${raf ? "" : " iy-talep-katki"}"><caption>${raf ? "Yerel hane ihtiyacı, birim/saat" : "Hane ihtiyacı ve kayıtlı oyuncu dükkânı satışı, birim/saat; katkı, satışın ihtiyaç içindeki payıdır"}</caption><thead><tr><th scope="col">Mal</th><th scope="col">İhtiyaç<br>birim/sa</th>${raf ? "" : '<th scope="col">Kayıtlı satış<br>birim/sa</th><th scope="col">Satış katkısı</th>'}</tr></thead><tbody>`;
      for (const [mal, q] of g.talep) {
        const satis = satislar.get(mal);
        s += `<tr data-ilce-talep-mal="${esc(mal)}"><th scope="row"><button type="button" class="iy-mal" data-mulk-uretim="${esc(mal)}" aria-label="${esc(ad.malAdi(mal))} üretimini incele">${esc(ad.malAdi(mal))}</button></th><td>${sayi(q / 1000, 2)}</td>`;
        if (!raf) {
          if (satis === undefined) s += '<td class="iy-bilinmiyor">Bilinmiyor</td><td class="iy-bilinmiyor">Bilinmiyor</td>';
          else {
            const yuzde = Math.max(0, Math.min(100, satis.karsilanmaPpm / 10_000));
            s += `<td>${sayi(satis.satisMiliSaat / 1000, 2)}</td><td><span class="iy-katki-sayi">%${sayi(yuzde, 2)}</span><span class="iy-katki-cubuk" aria-hidden="true"><span style="width:${yuzde}%"></span></span></td>`;
          }
        }
        s += '</tr>';
      }
      s += "</tbody></table></div>";
      if (!raf && g.karsilanma === undefined) s += '<p class="ipucu-metin">Kayıtlı dükkân satış verisi sunucudan bekleniyor.</p>';
    } else s += '<p class="ipucu-metin">Bu ilçede şu an tanımlı hane ihtiyacı bulunmuyor.</p>';
    s += "</section>";
  }

  const k = g.kamuKasa;
  if (k !== undefined) {
    s += `<section class="iy-bolum"><h4>${ikon("landmark", 17)} İlçe kamu kasası</h4><dl class="iy-sayilar iy-kasa">`;
    s += sayiKarti("Kullanılabilir bakiye", paraMili(k.bakiyeMili));
    s += sayiKarti("Arazi vergisi payı", paraMili(k.vergiToplamMili));
    s += sayiKarti("Toplam giriş", paraMili(k.girisToplamMili));
    s += sayiKarti("Toplam harcama", paraMili(k.cikisToplamMili));
    s += sayiKarti("Ayrılmış ödenek", paraMili(k.rezervMili));
    s += '</dl><p class="ipucu-metin">İlçe kasasının kaydedilmiş muhasebesi. Vergi payı, giriş ve harcama dünya başlangıcından beri biriken tutarlardır; ödenek bakiyeden ayrılmıştır.</p>';
    if (g.muhasebeT !== undefined) s += `<p class="iy-zaman">Tutarlar en az ${sayi(g.muhasebeT / 3_600_000, 2)}. oyun saatine kadar muhasebeleştirilmiş.</p>`;
    s += "</section>";
  }
  s += ek;
  if (g.benimHucre !== undefined) s += `<p class="iy-isletme">${ikon("building", 16)} Senin işletmen bu ilçede ${fmt(g.benimHucre)} hücreye sahip.</p>`;
  return s + "</section>";
}

export interface IlceYasamPanelParam extends IlceYasamAdlari {
  kare: () => DukkanKaresi | null;
  /** Haritada seçilen ilçe; il/bölge görünümünde null. */
  ilce: () => string | null;
  komut?: (komut: Extract<Komut, { tur: "kamu_teslim" }>) => Promise<TesisSonucu>;
  degisti?: () => void;
}

export interface KamuSiparisEylemi {
  ilce: string;
  siparis: string;
  bolge: string;
  bedelMili: number;
  teslimSirasi: number;
}

/** Yalnız oyuncunun gördüğü paket teklifi gönderilir; yeni fiyat sessizce yerine konmaz. */
export function kamuSiparisEylemiOku(hedef: HTMLElement): KamuSiparisEylemi | null {
  const b = hedef.closest<HTMLButtonElement>('button[data-kamu-siparis-eylem="teslim"]');
  if (!b || b.disabled) return null;
  const ilce = b.closest<HTMLElement>("[data-ilce-kamu-siparis]")?.dataset["ilceKamuSiparis"];
  const siparis = b.dataset["siparis"], bolge = b.dataset["bolge"];
  const bedelMili = Number(b.dataset["bedelMili"]), teslimSirasi = Number(b.dataset["teslimSirasi"]);
  if (!ilce || !siparis || !bolge || !Number.isSafeInteger(bedelMili) || bedelMili <= 0 || !Number.isSafeInteger(teslimSirasi) || teslimSirasi < 0) return null;
  return { ilce, siparis, bolge, bedelMili, teslimSirasi };
}

export class IlceYasamPaneli {
  private bekliyor = false;
  private sonuc = "";
  private hata = false;
  private sonucIlce: string | null = null;
  private readonly acikDetaylar = new Set<string>();
  private gorulenTeklif: KamuSiparisEylemi | null = null;
  /** Kabul edilmiş aynı paket teklifi yeni teslim özeti gelene kadar tekrar gönderilmez. */
  private teslimEdilen: KamuSiparisEylemi | null = null;
  constructor(private readonly p: IlceYasamPanelParam) {}

  /** Basma ile click arasındaki canlı fiyat güncellemesi görülen bedeli değiştirmez. */
  teklifYakala(hedef: HTMLElement): void {
    this.gorulenTeklif = kamuSiparisEylemiOku(hedef);
  }

  eylemOku(hedef: HTMLElement): KamuSiparisEylemi | null {
    const simdiki = kamuSiparisEylemiOku(hedef);
    const gorulen = this.gorulenTeklif;
    this.gorulenTeklif = null;
    return simdiki && gorulen && simdiki.ilce === gorulen.ilce && simdiki.siparis === gorulen.siparis && simdiki.bolge === gorulen.bolge ? gorulen : simdiki;
  }

  private kartHtml(g: IlceYasamGorunumu): string {
    const kaynaklar = this.p.kare()?.oyuncu?.kamuTeslim;
    const son = this.teslimEdilen;
    const html = kamuSiparisHtml({
      ilce: g.id,
      ilan: g.kamuSiparis,
      kaynaklar: kaynaklar?.map((k) => son && k.siparis === son.siparis && k.bolge === son.bolge && k.teslimSirasi === son.teslimSirasi
        ? { ...k, uygun: false, engel: "Teslim alındı; güncel paket bilgisi bekleniyor." } : k),
      bekliyor: this.bekliyor,
      sonuc: this.sonucIlce === g.id ? this.sonuc : "",
      hata: this.hata,
      malAdi: this.p.malAdi,
      destek: this.p.komut !== undefined,
    });
    return html.replace(/<details\b([^>]*)>/g, (etiket: string, ozellikler: string) => {
      const d = /data-kamu-siparis-(detay|toplam)="([^"]*)"/.exec(ozellikler);
      return d && this.acikDetaylar.has(`${d[1]}:${d[2]}`) ? etiket.slice(0, -1) + " open>" : etiket;
    });
  }

  html(): string {
    if (typeof document !== "undefined") this.detaylariYakala(document);
    const g = ilceYasamGorunumuKur(this.p.kare(), this.p.ilce());
    return ilceYasamHtml(g, this.p, g ? `<div data-ilce-kamu-siparis="${esc(g.id)}">${this.kartHtml(g)}</div>` : "");
  }

  private bildir(ilce: string, mesaj: string, hata = true): void {
    this.sonucIlce = ilce;
    this.sonuc = mesaj;
    this.hata = hata;
    this.p.degisti?.();
  }

  async eylem(i: KamuSiparisEylemi): Promise<void> {
    if (this.bekliyor) return;
    const kare = this.p.kare();
    const g = ilceYasamGorunumuKur(kare, this.p.ilce());
    if (!g || g.id !== i.ilce) {
      this.bildir(i.ilce, "İlçe seçimi değişti. Görmek istediğin siparişi yeniden aç.");
      return;
    }
    if (!this.p.komut) { this.bildir(g.id, "Bu bağlantıda kamu siparişine teslim yapılamıyor."); return; }
    const ilan = g.kamuSiparis;
    const siparis = ilan?.siparis;
    const kaynak = kare?.oyuncu?.kamuTeslim?.find((k) => k.siparis === i.siparis && k.bolge === i.bolge);
    if (!ilan?.etkin || !siparis || siparis.id !== i.siparis || siparis.ilce !== g.id || siparis.durum !== "acik" || siparis.kalanPaket <= 0) {
      this.bildir(g.id, "Bu sipariş şu an teslim almıyor. Güncel ilanı kontrol et."); return;
    }
    if (!kaynak) { this.bildir(g.id, "İşletmenin güncel teslim teklifi henüz bilinmiyor."); return; }
    if (i.bedelMili !== kaynak.bedelMili || i.teslimSirasi !== kaynak.teslimSirasi || i.bedelMili !== siparis.guncelPaketBedeliMili || i.teslimSirasi !== siparis.teslimSirasi || kaynak.paketMili !== siparis.paketMili) {
      this.bildir(g.id, "Paket bedeli veya kalan miktar değişti. Güncel teklifi inceleyip yeniden teslim et."); return;
    }
    if (!kaynak.uygun) { this.bildir(g.id, kaynak.engel || "Bu işletme şu an teslim yapamıyor."); return; }
    if (kaynak.stokMili < kaynak.paketMili) { this.bildir(g.id, "İlin ortak deposunda bir paket için yeterli stok yok."); return; }
    if (this.teslimEdilen?.siparis === i.siparis && this.teslimEdilen.bolge === i.bolge && this.teslimEdilen.teslimSirasi === i.teslimSirasi) return;
    this.bekliyor = true;
    this.bildir(g.id, "", false);
    try {
      const r = await this.p.komut({ tur: "kamu_teslim", siparis: i.siparis, bolge: i.bolge, bedelMili: i.bedelMili, teslimSirasi: i.teslimSirasi });
      if (r.tamam) this.teslimEdilen = i;
      this.sonucIlce = g.id;
      this.hata = !r.tamam;
      this.sonuc = r.tamam ? "Bir paket teslim edildi; ödeme Hazine’ne geçti." : r.mesaj;
    } catch {
      this.sonucIlce = g.id;
      this.hata = true;
      this.sonuc = "Teslim sonucu alınamadı. İlan, stok ve Hazine’ni kontrol ederek yeniden deneyebilirsin.";
    } finally {
      this.bekliyor = false;
      this.p.degisti?.();
    }
  }

  /** Sipariş kartını dar günceller; diğer İlçe bölümlerini ve seçimi yeniden kurmaz. */
  yamala(kok: ParentNode): boolean {
    const g = ilceYasamGorunumuKur(this.p.kare(), this.p.ilce());
    const slot = kok.querySelector<HTMLElement>("[data-ilce-kamu-siparis]");
    if (!g || !slot || slot.dataset["ilceKamuSiparis"] !== g.id) return false;
    this.detaylariYakala(kok);
    const geriOdak = this.odagiYakala(kok);
    slot.innerHTML = this.kartHtml(g);
    geriOdak?.();
    return true;
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    this.detaylariYakala(kok);
    const aktif = typeof document === "undefined" ? null : document.activeElement;
    if (!(aktif instanceof HTMLElement)) return null;
    const slot = kok.querySelector<HTMLElement>("[data-ilce-kamu-siparis]");
    if (!slot?.contains(aktif)) return null;
    if (aktif.matches("summary")) {
      const detay = aktif.parentElement;
      const tip = detay?.hasAttribute("data-kamu-siparis-detay") ? "detay" : "toplam";
      const id = detay?.getAttribute(`data-kamu-siparis-${tip}`);
      return id === null || id === undefined ? null : () => {
        const d = [...kok.querySelectorAll<HTMLDetailsElement>(`details[data-kamu-siparis-${tip}]`)].find((x) => x.getAttribute(`data-kamu-siparis-${tip}`) === id);
        d?.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
      };
    }
    if (!(aktif instanceof HTMLButtonElement) || !aktif.matches('[data-kamu-siparis-eylem="teslim"]')) return null;
    const ilce = slot.dataset["ilceKamuSiparis"], siparis = aktif.dataset["siparis"], bolge = aktif.dataset["bolge"];
    return () => {
      const yeniSlot = kok.querySelector<HTMLElement>("[data-ilce-kamu-siparis]");
      if (!yeniSlot || yeniSlot.dataset["ilceKamuSiparis"] !== ilce) return;
      const b = [...yeniSlot.querySelectorAll<HTMLButtonElement>('[data-kamu-siparis-eylem="teslim"]')].find((x) => x.dataset["siparis"] === siparis && x.dataset["bolge"] === bolge);
      if (b && !b.disabled) b.focus({ preventScroll: true });
    };
  }

  private detaylariYakala(kok: ParentNode): void {
    for (const d of kok.querySelectorAll<HTMLDetailsElement>("[data-ilce-kamu-siparis] details")) {
      const tip = d.hasAttribute("data-kamu-siparis-detay") ? "detay" : "toplam";
      const id = d.getAttribute(`data-kamu-siparis-${tip}`);
      if (id === null) continue;
      const anahtar = `${tip}:${esc(id)}`;
      if (d.open) this.acikDetaylar.add(anahtar);
      else this.acikDetaylar.delete(anahtar);
    }
  }
}
