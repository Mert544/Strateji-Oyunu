/** İlçenin nüfus, hane talebi ve kamu muhasebesi; işletme stoğundan ayrı, salt okunur görünüm. */
import type { IlceKaresi } from "@bolge/protokol";
import { esc, fmt, paraMili, sayi } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";
import type { DukkanKaresi } from "./baglanti";
import { baskinGorunumuHtml } from "./baskin-gorunum";
import "./baskin-gorunum.css";

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
export function ilceYasamHtml(g: IlceYasamGorunumu | null, ad: IlceYasamAdlari): string {
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
  if (g.benimHucre !== undefined) s += `<p class="iy-isletme">${ikon("building", 16)} Senin işletmen bu ilçede ${fmt(g.benimHucre)} hücreye sahip.</p>`;
  return s + "</section>";
}

export interface IlceYasamPanelParam extends IlceYasamAdlari {
  kare: () => DukkanKaresi | null;
  /** Haritada seçilen ilçe; il/bölge görünümünde null. */
  ilce: () => string | null;
}

export class IlceYasamPaneli {
  constructor(private readonly p: IlceYasamPanelParam) {}
  html(): string {
    return ilceYasamHtml(ilceYasamGorunumuKur(this.p.kare(), this.p.ilce()), this.p);
  }
}
