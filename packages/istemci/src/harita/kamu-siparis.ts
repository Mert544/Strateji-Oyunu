/** İlçe kamu siparişi ve sahibinin teslim teklifi; komut/fiyat hesabı yapmayan saf görünüm. */
import { esc, paraMili, sayi, tarihSaatMetni } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";

export interface KamuSiparisGorunumu {
  id: string;
  ilce: string;
  mal: string;
  paketMili: number;
  hedefPaket: number;
  kalanPaket: number;
  teslimSirasi: number;
  ilanBirimFiyatMili: number;
  ilanPaketBedeliMili: number;
  guncelPaketBedeliMili: number;
  acilisZamani: number;
  bitis: number;
  kapanisZamani?: number;
  durum: "acik" | "tamamlandi" | "suresi_doldu" | "iptal";
  rezervMili: number;
  odenenMili: number;
  serbestMili: number;
}

export interface IlceKamuSiparisGorunumu {
  etkin: boolean;
  siparis?: KamuSiparisGorunumu;
  toplamTeslimMili: number;
  toplamOdemeMili: number;
}

/** Yalnız sahibinin il işletmesi stoğu ve sunucunun bu sipariş için verdiği teklif. */
export interface KamuTeslimGorunumu {
  siparis: string;
  bolge: string;
  stokMili: number;
  paketMili: number;
  bedelMili: number;
  teslimSirasi: number;
  uygun: boolean;
  engel?: string;
}

export interface KamuSiparisParam {
  ilce: string;
  ilan?: IlceKamuSiparisGorunumu;
  kaynaklar?: readonly KamuTeslimGorunumu[];
  bekliyor: boolean;
  sonuc?: string;
  hata?: boolean;
  malAdi: (id: string) => string;
  /** Gerçek komut bağlantısı varlığını entegrasyon katmanı bildirir. */
  destek?: boolean;
}

const miktar = (mili: number): string => `${sayi(mili / 1000, 3)} birim`;
const zaman = (ms: number): string => tarihSaatMetni(ms / 3_600_000);
const durumMetni: Record<KamuSiparisGorunumu["durum"], string> = {
  acik: "Teslimata açık",
  tamamlandi: "Tamamlandı",
  suresi_doldu: "Süresi doldu",
  iptal: "İptal edildi",
};
const satir = (ad: string, deger: string, sinif = ""): string => `<div${sinif ? ` class="${sinif}"` : ""}><dt>${esc(ad)}</dt><dd>${esc(deger)}</dd></div>`;

/** Bedel, sıra, stok ve uygunluk sunucudan gelir; düğme olayını A3'ün panel katmanı yönetir. */
export function kamuSiparisHtml(p: KamuSiparisParam): string {
  let h = `<section class="ks-panel" aria-label="İlçe kamu gıda siparişi"><h4>${ikon("package", 18)} Kamu gıda siparişi</h4>`;
  if (p.sonuc) h += `<p class="ks-sonuc${p.hata ? " ks-hata" : ""}" role="${p.hata ? "alert" : "status"}">${esc(p.sonuc)}</p>`;
  const ilan = p.ilan;
  if (ilan === undefined) return h + '<p class="ks-bos">Kamu siparişi bilgisi henüz alınmadı.</p></section>';
  if (!ilan.etkin) h += '<p class="ks-bos">Kamu gıda siparişleri şu an kapalı.</p>';
  const s = ilan.siparis;
  if (s?.ilce !== p.ilce) {
    if (ilan.etkin) h += '<p class="ks-bos">Bu ilçede şu an açık gıda siparişi yok.</p>';
  } else {
    const kaynak = p.kaynaklar?.find((k) => k.siparis === s.id);
    const bedel = kaynak?.bedelMili ?? s.guncelPaketBedeliMili;
    let neden: string | undefined;
    if (!ilan.etkin) neden = "Kamu siparişleri kapalı.";
    else if (s.durum !== "acik") neden = "Bu sipariş teslimata kapandı.";
    else if (p.bekliyor) neden = "Teslim sonucu bekleniyor.";
    else if (p.destek !== true) neden = "Teslim için oyun sunucusuna bağlan.";
    else if (!kaynak) neden = p.kaynaklar === undefined
      ? "İşletme stoğu ve teslim bilgisi henüz alınmadı."
      : "Teslim için bu ilçede parselin bulunmalı. Gıda, aynı ildeki ortak işletme stoğundan alınır.";
    else if (kaynak.teslimSirasi !== s.teslimSirasi || kaynak.paketMili !== s.paketMili || kaynak.bedelMili !== s.guncelPaketBedeliMili)
      neden = "Siparişin güncel bedeli ve teslim bilgisi bekleniyor.";
    else if (!Number.isSafeInteger(kaynak.bedelMili) || kaynak.bedelMili <= 0 || !Number.isSafeInteger(kaynak.teslimSirasi) || kaynak.teslimSirasi < 0)
      neden = "Güncel teslim teklifi henüz hazır değil.";
    else if (!kaynak.uygun) neden = kaynak.engel || "Bu stoktan şu an teslim yapılamıyor.";
    const teslimEdilen = s.hedefPaket - s.kalanPaket;
    h += `<article class="ks-ilan"><header class="ks-baslik"><h5>${esc(p.malAdi(s.mal))} · ${esc(miktar(s.paketMili))} / paket</h5><span class="ks-durum">${durumMetni[s.durum]}</span></header>`;
    h += `<p class="ks-vade">Son teslim: ${esc(zaman(s.bitis))}</p><dl class="ks-miktarlar">`;
    // Sunucudaki paket adetleri, yalnız gösterim için mal birimine çevrilir.
    h += satir("Toplam sipariş", miktar(s.hedefPaket * s.paketMili));
    h += satir("Kamuya teslim edildi", miktar(teslimEdilen * s.paketMili), "ks-teslim-edilen");
    h += satir("Kalan", miktar(s.kalanPaket * s.paketMili)) + "</dl>";
    if (s.durum === "acik") {
      h += '<dl class="ks-kaynak">';
      h += satir("İldeki ortak stoğun", kaynak === undefined ? "Bilgi alınmadı" : miktar(kaynak.stokMili));
      h += satir("Güncel paket bedeli", paraMili(bedel), "ks-bedel") + "</dl>";
      const attr = kaynak ? ` data-siparis="${esc(s.id)}" data-bolge="${esc(kaynak.bolge)}" data-bedel-mili="${esc(kaynak.bedelMili)}" data-teslim-sirasi="${esc(kaynak.teslimSirasi)}"` : "";
      h += `<button type="button" class="ks-teslim" data-kamu-siparis-eylem="teslim"${attr}${neden ? ' disabled aria-disabled="true"' : ""}>${p.bekliyor ? "Teslim bekleniyor…" : `1 paket teslim et · ${esc(paraMili(bedel))}`}</button>`;
      if (neden) h += `<p class="ks-neden">${esc(neden)}</p>`;
      h += '<p class="ipucu-metin">Her teslim bir pakettir. Gösterilen bedel veya sipariş değişirse işlem durur; yeniden inceleyerek teslim et.</p>';
    }
    h += `<details class="ks-detay" data-kamu-siparis-detay="${esc(s.id)}"><summary>İlan ve ödeme kaydı</summary><dl>`;
    h += satir("İlanın paket üst bedeli", paraMili(s.ilanPaketBedeliMili));
    h += satir("Kalan ayrılmış ödenek", paraMili(s.rezervMili));
    h += satir("Bu siparişte ödenen", paraMili(s.odenenMili));
    h += satir("Serbest kalan ödenek", paraMili(s.serbestMili)) + "</dl>";
    h += `<p class="ipucu-metin">İlan: ${esc(zaman(s.acilisZamani))}${s.kapanisZamani === undefined ? "" : ` · Kapanış: ${esc(zaman(s.kapanisZamani))}`}. Paket bedeli, ilan üst bedelini aşmadan güncellenebilir.</p></details></article>`;
  }
  h += `<details class="ks-detay" data-kamu-siparis-toplam="${esc(p.ilce)}"><summary>İlçenin kayıtlı kamu teslimleri</summary><dl>`;
  h += satir("Toplam dağıtıma teslim", miktar(ilan.toplamTeslimMili));
  h += satir("Toplam tedarikçi ödemesi", paraMili(ilan.toplamOdemeMili)) + "</dl>";
  h += '<p class="ipucu-metin">Kamu dağıtımına teslim edilen gıda ve yapılan ödemelerin kaydıdır.</p></details></section>';
  return h;
}
