/**
 * Esnaf Defteri (harita yığınında; mülk kipi, İşletmem sekmesinin "Defter" bölümü). Sunucu `defterIste` → `defter` yanıtında
 * yalnız kavram ve şablon anahtarı (`defter.kavram.<kavram>`) ile ödül tutarlarını gönderir; metin burada Türkçe üretilir
 * (docs/arastirma/rehber-gorevler.md §3.1, baslangic-ve-ustalik.md Esnaf Defteri, donus-deneyimi.md §3.2 damga).
 *
 * Ton: esnaf defteri; sakin, kısa, yargısız ("kolay gelsin", "hayırlı olsun"). Defter zorunlu değildir: sıra serbest, kilit yok.
 * Kazanılanlar tarih ve ödülle (damga = para/mal taşımayan kayıt), sıradakiler ödül tutarıyla; `etkin: false` yer tutucular
 * gösterilmez. Ödül çubuğu ve tavan YOKTUR (ZK-1; sıradaki adımlarda "ödül: ..."; toplam yalnız "Defterine işlenen ödüller: ≈ ... değerinde"
 * satırı). Yeni kazanılan ödül için sakin bir bildirim (`yeniKazanilanlar`); yakın zamandaki Defter bildirimleri tek bildirimde birleşir.
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
  "defter.kavram.ilk_satis": { kazanildi: "İlk satışın yapıldı; bereketli olsun.", siradaki: "Çiftliğinin tahılını Pazar'da sat." },
  "defter.kavram.ilk_isleme": { kazanildi: "Ham malı işledin; ilk işlenmiş ürünün hayırlı olsun.", siradaki: "Ham malı işle (ör. tahılı gıdaya çevir)" },
  "defter.kavram.ilk_ekmek": { kazanildi: "İlk ekmeğin fırından çıktı; sıcağı sıcağına.", siradaki: "Unu fırında ekmeğe çevir." },
  "defter.kavram.zincir_kapandi": { kazanildi: "Zincir kapandı: bir yapının çıktısı öbürünün girdisi oldu.", siradaki: "Zinciri kapat: bir yapının çıktısını öbürüne girdi yap" },
  "defter.kavram.ilk_dukkan": { kazanildi: "İlk satışını dükkânından yaptın.", siradaki: "Kendi tezgâhın: bir dükkân kur ve oradan ilk satışını yap." },
  "defter.kavram.ilk_pencere": { kazanildi: "İlk pencerenin hazır; çelik, cam ve emek.", siradaki: "Çelik ve camdan pencere yap; camı önce silisten üret." },
  "defter.kavram.ilk_sozlesme": { kazanildi: "İlk sözleşmen imzalandı; hayırlı olsun.", siradaki: "İlk sözleşmeni yap" },
  "defter.kavram.ikinci_ilce": { kazanildi: "Komşu ilçeye selam: ikinci ilçende de yerin var.", siradaki: "Komşu bir ilçede yer edin" },
  "defter.kavram.ilk_arastirma": { kazanildi: "İlk araştırman tamamlandı.", siradaki: "İlk araştırmanı yap" },
  "defter.kavram.ilk_parsel": { kazanildi: "İlk arsan; hayırlı olsun.", siradaki: "İlk arsanı al." },
  "defter.kavram.ilk_uretim": { kazanildi: "İlk ürün depoda; hayırlı olsun.", siradaki: "İlk ürününü al." },
  "defter.kavram.ilk_raf": { kazanildi: "Rafına ilk malını koydun; kolay gelsin.", siradaki: "Dükkânının rafına mal koy." },
  "defter.kavram.ilk_cam": { kazanildi: "İlk cam fırından çıktı; ışık girsin.", siradaki: "Cam fırınında ilk camını üret." },
  "defter.kavram.ilk_donus": { kazanildi: "Sen yokken de dünya işledi; döndüğünde defter seni bekliyordu.", siradaki: "Bir süre ara ver, sonra dön." },
};

export function defterMetni(sablon: string, kavram: string): DefterMetni {
  return DEFTER_METINLERI[sablon] ?? { kazanildi: `${kavram.replace(/_/g, " ")}: tamamlandı.`, siradaki: kavram.replace(/_/g, " ") };
}

/** Defter çerçeve metinleri (T1 tablosu: `defter.odul`, `defter.islenen`, `defter.bildirim.birlesik`, `defter.bildirim.birlesik_tutarsiz`). Yer tutucu `{ad}`. */
export const DEFTER_CERCEVE = {
  "defter.odul": "ödül: {odul}",
  "defter.islenen": "Defterine işlenen ödüller: ≈ {tutar} değerinde",
  "defter.bildirim.birlesik": "Defterine {n} satır işlendi · ≈ {tutar} değerinde",
  "defter.bildirim.birlesik_tutarsiz": "Defterine {n} satır işlendi",
} as const;

/** "≈ {tutar}" kalıbında "≈" ile sayı bölünmez boşlukla birleşir (satır sonunda "≈" yalnız kalmasın). */
function cerceve(anahtar: keyof typeof DEFTER_CERCEVE, yer: Readonly<Record<string, string | number>>): string {
  return DEFTER_CERCEVE[anahtar].replace(/≈ /g, "≈\u00a0").replace(/\{([a-z_]+)\}/g, (tum, ad: string) => (ad in yer ? String(yer[ad]) : tum));
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
  // "ödül: {odul}" öneki ilk parçanın önündedir (para ya da mal); değer satırı altında kalır
  const ana = [p.para, p.mal].filter(Boolean);
  const satirlar = [
    ...ana.map((x, i) => `<span class="dt-ana">${esc(i === 0 ? cerceve("defter.odul", { odul: x }) : x)}</span>`),
    p.deger && `<span class="dt-deger soluk">${esc(p.deger)} değerinde</span>`,
  ].filter(Boolean);
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

/**
 * Kazanım bildirimleri: her kazanım kendi cümlesiyle ve ödül değeriyle (mili-₺) döner; aynı pencerede (2 sn) gelenlerin birleşmesi bildirim
 * kuyruğundadır (`bildirim-kuyrugu.ts` grup birleştirme: `defterBirlesikMetni`).
 */
export function kazanimBildirimleri(yeni: readonly DefterKazanilan[], malAdi: (m: string) => string): Array<{ mesaj: string; deger: number }> {
  return yeni.map((k) => ({ mesaj: kazanimBildirimi(k, malAdi), deger: k.odul?.degerMili ?? 0 }));
}

/** Birleşik Defter bildirimi: "Defterine 2 satır işlendi · ≈ 600 ₺ değerinde" (değer yoksa tutarsız biçim; tutar aşağı yuvarlı). */
export function defterBirlesikMetni(n: number, degerMili: number): string {
  return degerMili > 0 ? cerceve("defter.bildirim.birlesik", { n: fmt(n), tutar: paraMili(degerMili, "asagi") }) : cerceve("defter.bildirim.birlesik_tutarsiz", { n: fmt(n) });
}

/** B7 "sıradaki adım" kartı için ilk etkin sıradaki adım (metin ve ödül sütunu); yoksa null. */
export function defterUstKarti(d: Defter | null, malAdi: (m: string) => string): { metin: string; odulHtml: string; kavram: string } | null {
  const x = d?.siradaki.find((y) => y.etkin);
  return x ? { metin: defterMetni(x.sablon, x.kavram).siradaki, odulHtml: odulSutunu(x.odul, malAdi), kavram: x.kavram } : null;
}

/** "Defter" bölümü (İşletmem'de). `epochMs`: tarihleri gerçek takvime çevirmek için. */
export function defterHtml(d: Defter | null, malAdi: (m: string) => string, epochMs = DUNYA_EPOCH_MS): string {
  let s = `<h3>Defter</h3>`;
  if (!d) return s + `<p class="ipucu-metin">Defter yükleniyor…</p>`;
  // Ödül çubuğu ve tavan yok (ZK-1); toplam yalnız tek satır: işlenen ödüllerin değeri (çoğu mal olduğu için "değerinde")
  if (d.toplamOdulMili > 0) s += `<p class="defter-islenen soluk" data-alan="defter-islenen">${esc(cerceve("defter.islenen", { tutar: paraMili(d.toplamOdulMili, "asagi") }))}</p>`;
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
