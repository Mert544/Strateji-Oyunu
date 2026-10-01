/**
 * Esnaf Defteri (harita yığınında; mülk kipi, İşletmem sekmesinin "Defter" bölümü). Sunucu `defterIste` → `defter` yanıtında
 * yalnız kavram ve şablon anahtarı (`defter.kavram.<kavram>`) ile ödül tutarlarını gönderir; metin burada Türkçe üretilir
 * (docs/arastirma/rehber-gorevler.md §3.1, baslangic-ve-ustalik.md Esnaf Defteri, donus-deneyimi.md §3.2 damga).
 *
 * Ton: esnaf defteri; sakin, kısa, yargısız ("kolay gelsin", "hayırlı olsun"). Defter zorunlu değildir: sıra serbest, kilit yok.
 * Kazanılanlar tarih ve ödülle (damga = para/mal taşımayan kayıt), sıradakiler ödül tutarıyla; `etkin: false` yer tutucular
 * gösterilmez. Toplam ödül ve tavan tek ilerleme çubuğunda (kavram sayısı ya da yüzde yazılmaz). Yeni kazanılan ödül için
 * sakin bir bildirim (`yeniKazanilanlar`).
 */
import type { Defter, DefterKazanilan, DefterOdulu } from "@bolge/protokol";
import { DUNYA_EPOCH_MS, esc, fmt, gercekTarih, paraMili, tarihMetni } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";

export interface DefterMetni {
  /** Kazanılınca (defter satırı). */
  kazanildi: string;
  /** Sıradaki adım (yapılacak hâli). */
  siradaki: string;
}

/** `defter.kavram.<kavram>` şablonları. */
export const DEFTER_METINLERI: Readonly<Record<string, DefterMetni>> = {
  "defter.kavram.ilk_yapi": { kazanildi: "İlk yapın kuruldu; kolay gelsin.", siradaki: "İlk yapını kur" },
  "defter.kavram.ilk_satis": { kazanildi: "İlk satışın yapıldı; bereketli olsun.", siradaki: "İlk satışını yap" },
  "defter.kavram.ilk_isleme": { kazanildi: "Ham malı işledin; ilk işlenmiş ürünün hayırlı olsun.", siradaki: "Ham malı işle (ör. tahılı gıdaya çevir)" },
  "defter.kavram.zincir_kapandi": { kazanildi: "Zincir kapandı: bir yapının çıktısı öbürünün girdisi oldu.", siradaki: "Zinciri kapat: bir yapının çıktısını öbürüne girdi yap" },
  "defter.kavram.ilk_dukkan": { kazanildi: "İlk dükkânın açıldı; siftahın bereketli olsun.", siradaki: "İlk dükkânını aç" },
  "defter.kavram.ilk_sozlesme": { kazanildi: "İlk sözleşmen imzalandı; hayırlı olsun.", siradaki: "İlk sözleşmeni yap" },
  "defter.kavram.ikinci_ilce": { kazanildi: "Komşu ilçeye selam: ikinci ilçende de yerin var.", siradaki: "Komşu bir ilçede yer edin" },
  "defter.kavram.ilk_arastirma": { kazanildi: "İlk araştırman tamamlandı.", siradaki: "İlk araştırmanı yap" },
  "defter.kavram.ilk_parsel": { kazanildi: "İlk arsan; hayırlı olsun.", siradaki: "İlk arsanı al" },
  "defter.kavram.ilk_uretim": { kazanildi: "İlk ürün depoda; hayırlı olsun.", siradaki: "İlk ürününü al" },
  "defter.kavram.ilk_donus": { kazanildi: "Sen yokken de dünya işledi; döndüğünde defter seni bekliyordu.", siradaki: "Bir süre ara ver, sonra dön" },
};

export function defterMetni(sablon: string, kavram: string): DefterMetni {
  return DEFTER_METINLERI[sablon] ?? { kazanildi: `${kavram.replace(/_/g, " ")}: tamamlandı.`, siradaki: kavram.replace(/_/g, " ") };
}

/** "≈" ile sayı arası bölünmez boşluk: "(≈\u00a0900\u00a0₺ değerinde)" satır sonunda "≈" yalnız kalmaz. */
const YAKLASIK = "≈\u00a0";

/** Ödülün parçaları: para, mal listesi (ad sırasıyla) ve yalnız mal ise değeri. Liste ve cümle aynı parçalardan kurulur. */
export function odulParcalari(o: DefterOdulu | undefined, malAdi: (m: string) => string): { para: string; mal: string; deger: string } {
  if (!o) return { para: "", mal: "", deger: "" };
  const mal = Object.entries(o.mal ?? {})
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([m, mili]) => `${fmt(Math.round(mili / 1000))} ${malAdi(m).toLocaleLowerCase("tr")}`)
    .join(" ve ");
  return { para: o.paraMili ? paraMili(o.paraMili) : "", mal, deger: !o.paraMili && o.degerMili > 0 ? `${YAKLASIK}${paraMili(o.degerMili)}` : "" };
}

/** Ödül metni (cümle): "500 ₺", "5 çelik", "500 ₺ ve 5 çelik"; yalnız mal ise yanına "(≈ 600 ₺ değerinde)". */
export function odulMetni(o: DefterOdulu | undefined, malAdi: (m: string) => string): string {
  const p = odulParcalari(o, malAdi);
  const metin = [p.para, p.mal].filter(Boolean).join(" ve ");
  return p.deger ? `${metin} (${p.deger} değerinde)` : metin;
}

/**
 * Sıradaki adımın sağ sütunu: her parça kendi satırında ve bölünmez (`.defter-tutar` nowrap); uzun ödül ("5 makine parçası
 * (≈ 900 ₺ değerinde)") iki düzgün satıra ayrılır: üstte ne, altta değeri. Açıklama sütunu kırılır, tutar kırılmaz.
 */
export function odulSutunu(o: DefterOdulu | undefined, malAdi: (m: string) => string): string {
  const p = odulParcalari(o, malAdi);
  const satirlar = [p.para && `<span class="dt-ana">${esc(p.para)}</span>`, p.mal && `<span class="dt-ana">${esc(p.mal)}</span>`, p.deger && `<span class="dt-deger soluk">${esc(p.deger)} değerinde</span>`].filter(Boolean);
  return satirlar.join("");
}

/** Önceki defterde olmayan kazanılanlar (bildirim için; ilk okumada boş). */
export function yeniKazanilanlar(onceki: Defter | null, simdi: Defter): DefterKazanilan[] {
  if (!onceki) return [];
  const eski = new Set(onceki.kazanilan.map((k) => k.kavram));
  return simdi.kazanilan.filter((k) => !eski.has(k.kavram));
}

/** Bildirim cümlesi. */
export function kazanimBildirimi(k: DefterKazanilan, malAdi: (m: string) => string): string {
  const odul = odulMetni(k.odul, malAdi);
  return `Defter: ${defterMetni(k.sablon, k.kavram).kazanildi}${odul ? ` Ödül: ${odul}.` : ""}`;
}

/** Aynı anda birden çok kazanım tek bildirimde toplanır (sakin: art arda kart yığılmasın). */
export function kazanimBildirimleri(yeni: readonly DefterKazanilan[], malAdi: (m: string) => string): string[] {
  if (yeni.length <= 1) return yeni.map((k) => kazanimBildirimi(k, malAdi));
  const deger = yeni.reduce((t, k) => t + (k.odul?.degerMili ?? 0), 0);
  return [`Defterine ${fmt(yeni.length)} yeni satır işlendi${deger > 0 ? `; ödüllerin toplamı ${YAKLASIK}${paraMili(deger)}` : ""}. Ayrıntı İşletmem'de.`];
}

/** "Defter" bölümü (İşletmem'de). `epochMs`: tarihleri gerçek takvime çevirmek için. */
export function defterHtml(d: Defter | null, malAdi: (m: string) => string, epochMs = DUNYA_EPOCH_MS): string {
  let s = `<h3>Defter</h3>`;
  if (!d) return s + `<p class="ipucu-metin">Defter yükleniyor…</p>`;
  const tavan = Math.max(1, d.tavanMili);
  const oran = Math.min(1, Math.max(0, d.toplamOdulMili / tavan));
  s += `<div class="defter-odul" data-alan="defter-odul"><div class="defter-odul-satir"><span>Defter ödülleri</span><b>${paraMili(d.toplamOdulMili)} <span class="soluk">/ ${paraMili(d.tavanMili)}</span></b></div>`;
  s += `<span class="defter-cubuk" role="img" aria-label="Defter ödülleri: ${paraMili(d.toplamOdulMili)}, tavan ${paraMili(d.tavanMili)}"><i style="width:${(oran * 100).toFixed(1)}%"></i></span></div>`;
  const siradaki = d.siradaki.filter((x) => x.etkin);
  if (siradaki.length) {
    s += `<p class="defter-baslik">Sıradaki adımlar</p><ul class="mulk-liste defter-liste">`;
    for (const x of siradaki)
      s += `<li data-kavram="${esc(x.kavram)}"><span class="ml-ad"><b>${esc(defterMetni(x.sablon, x.kavram).siradaki)}</b></span><span class="defter-tutar">${odulSutunu(x.odul, malAdi)}</span></li>`;
    s += `</ul>`;
  }
  if (d.kazanilan.length) {
    s += `<p class="defter-baslik">Defterine işlenenler</p><ul class="mulk-liste defter-liste">`;
    const sirali = [...d.kazanilan].sort((a, b) => (b.t ?? -1) - (a.t ?? -1));
    for (const k of sirali) {
      const tarih = k.t !== undefined ? tarihMetni(gercekTarih(k.t / 3_600_000, epochMs)) : "";
      const odul = k.tur === "odul" ? odulMetni(k.odul, malAdi) : "damga";
      s += `<li data-kavram="${esc(k.kavram)}" data-tur="${k.tur}"><span class="defter-damga" aria-hidden="true">${ikon(k.tur === "damga" ? "sparkles" : "check", 14)}</span><span class="ml-ad"><b>${esc(defterMetni(k.sablon, k.kavram).kazanildi)}</b><span class="soluk">${esc([tarih, odul].filter(Boolean).join(" · "))}</span></span></li>`;
    }
    s += `</ul>`;
  } else s += `<p class="ipucu-metin">Defterin henüz boş: ilk adımların burada tarihleriyle birikir.</p>`;
  return s;
}
