/**
 * Dükkân paneli iskeleti (G9 B; saf HTML dizgesi üretir, DOM ve kare bilmez): sınıf, `data-*` ve `aria-*` adları sözleşmeyle
 * (SP/takim/t1/g9-sozlesme.md §B ve §D) birebirdir; CSS `dukkan-panel.css` T1'indir (burada sınıf ya da stil satırı eklenmez, renk yoktur).
 * Metin `dukkan-metin.ts` tablosundan; para yalnız `para()`/`paraMili()`/`paraIsaretli()`; yuvarlama: gelir aşağı, maliyet yukarı.
 * Kapalı eylem: `aria-disabled="true"` (odak kalır) + neden satırı `p.dk-neden`; ret toast değil `p.dk-hata[role=alert]`. Her yüzeyde tek birincil.
 *
 * Ekranlar: D-0 öneri kartı, B7 Defter kartı, D-1 Dükkânlarım, D-2 tür seçimi, D-3 maliyet satırları, D-4 inşa satırı, D-5 raf ve seçici,
 * D-6 kademe ve kampanya, D-8 özet, D-8.1 menü ve kaldırma onayı, Dikkat maddeleri. D-7 marka formu ayrı iştir (simge ikonları ve ad kuralı bekler).
 */
import { esc, fmt, paraIsaretli, paraMili } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";
import type { IkonAdi } from "../tasarim/ikon";
import { DUKKAN_RET_ANAHTARI, dukkanMetni } from "./dukkan-metin";
import type { DukkanMetinAnahtari } from "./dukkan-metin";
import { DUKKAN_TURLERI } from "./dukkan-veri";
import type { DukkanGorunumu, DukkanKaydi, DukkanTuru, DukkanYuvasi, Kademe } from "./dukkan-veri";

const PPM = 1_000_000;
/** Kasa doluluğu bu eşikten sonra `D6.ipucu_kasa_dolu` gösterilir (T3 akış okuması 7; tek sabit, A2 doğrular). */
export const KASA_DOLU_IPUCU_ESIGI_PPM = 950_000;
const SAAT_MS = 3_600_000;

/** Tür simgeleri (Tasarım lideri kararı); genel dükkân simgesi `store`. */
export const TUR_IKONU: Readonly<Record<DukkanTuru, IkonAdi>> = { bakkal: "shopping-basket", firin: "croissant", sarkuteri: "ham", sekerci: "candy", yapi_market: "hammer" };

const m = dukkanMetni;
const enc = (a: DukkanMetinAnahtari, yer: Readonly<Record<string, string | number>> = {}): string => esc(dukkanMetni(a, yer));

/** Tür adı ("Bakkal"): `D2.tur_*` satırının "·" öncesi. */
export function turAdi(tur: DukkanTuru): string {
  return (m(`dukkan.D2.tur_${tur}`).split(" · ")[0] ?? tur).trim();
}

/** "3 sa 20 dk" (yukarı yuvarlı dakika; 1 dakikanın altı 1 dk). */
export function saatDakika(saat: number): string {
  const dk = Math.max(1, Math.ceil(saat * 60 - 1e-9));
  const s = Math.floor(dk / 60);
  const d = dk % 60;
  return s > 0 ? (d > 0 ? `${s} sa ${d} dk` : `${s} sa`) : `${d} dk`;
}

/** "m:ss" (geri alma sayacı). */
export function dakikaSaniye(ms: number): string {
  const sn = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sn / 60)}:${String(sn % 60).padStart(2, "0")}`;
}

/** Dükkân adı: marka adı (kanonik küçük harf) ya da tür adı. */
export function dukkanAdi(d: Pick<DukkanKaydi, "markaAd" | "tur">): string {
  return d.markaAd || turAdi(d.tur);
}

// --- D-0 ve B7: üst kart -------------------------------------------------------------------------

/** D-0 ilk dükkân önerisi (toast değil, Dikkat maddesi değil; kalıcı kart). Tek eylem "Dükkân kur" (`.eylem.ton`); kapat yalnız simgeli. */
export function oneriKartiHtml(defterAdimi?: string): string {
  return (
    `<div class="dk-oneri" role="region" aria-labelledby="dk-oneri-baslik" data-tur="dukkan" data-durum="acik">` +
    `<button type="button" class="ikon-dugme dk-oneri-kapat" data-eylem="oneri-kapat" aria-label="${enc("dukkan.D0.oneri_kapat")}">${ikon("x", 18)}</button>` +
    `<h4 id="dk-oneri-baslik">${enc("dukkan.D0.oneri_baslik")}</h4>` +
    `<p>${enc("dukkan.D0.oneri_govde")}</p>` +
    `<p class="dk-oneri-not">${enc("dukkan.D0.oneri_not")}</p>` +
    // Defter'in sıradaki adımı (ör. "Çiftliğinin tahılını sat.") kart varken de görünür kalır: tek soluk satır
    (defterAdimi ? `<p class="dk-oneri-defter-satir" data-alan="oneri-defter">${enc("dukkan.D0.defter_adim", { baslik: m("defter.ust.baslik"), adim: defterAdimi })}</p>` : "") +
    `<button type="button" class="eylem ton" data-eylem="dukkan-kur">${enc("dukkan.D0.oneri_dugme")}</button>` +
    `</div>`
  );
}

/**
 * B7 "sıradaki adım" kartı (D0 kartının ikinci durumu): Defter'in ilk etkin sıradaki adımı ve ödülü; tek eylem "Atla" (`.mini-dugme`; kartta birincil yok).
 * `odulHtml` `odulSutunu` çıktısıdır ("ödül: 10 çelik").
 */
export function defterKartiHtml(siradakiMetin: string, odulHtml: string, dukkanKur = false): string {
  return (
    `<div class="dk-oneri" role="region" aria-labelledby="dk-oneri-baslik" data-tur="defter" data-durum="acik">` +
    `<h4 id="dk-oneri-baslik">${enc("defter.ust.baslik")}</h4>` +
    `<div class="dk-oneri-satir"><p>${esc(siradakiMetin)}</p>${odulHtml ? `<span class="dk-oneri-sag">${odulHtml}</span>` : ""}</div>` +
    // Sıradaki adım "ilk dükkân" iken tek tıkla yönlendirme (D0 koşulu bozulsa da kart eylemsiz kalmaz); yalnız "Dükkân kur" bağlıyken
    (dukkanKur ? `<button type="button" class="eylem" data-eylem="dukkan-kur">${enc("dukkan.D0.oneri_dugme")}</button>` : "") +
    `<button type="button" class="mini-dugme" data-eylem="defter-atla" aria-label="${enc("defter.ust.atla_etiket")}">${enc("defter.ust.atla")}</button>` +
    `</div>`
  );
}

// --- D-1: İşletmem "Dükkânlarım" ------------------------------------------------------------------

export interface DukkanBolumuSecenegi {
  ilceAdi: (ilce: string) => string;
  simdi: number;
}

/** "Git" düğmesi mevcut `data-mulk-ilce` işleyicisini kullanır (yeni anahtar yok: `D1.satir_git`). */
function gitDugmesi(ilce: string | undefined, ilceAdi: (i: string) => string): string {
  return ilce ? `<button type="button" class="eylem" data-mulk-ilce="${esc(ilce)}" title="${esc(ilceAdi(ilce))}">${ikon("map-pin", 15)}${enc("dukkan.D1.satir_git")}</button>` : "";
}

/** D-1 satırı: açıkta tek satır "{dükkân} · net ≈ {net}/sa" (ad şablonun içindedir); inşadaki dükkânda ad ve altında "İnşa sürüyor · {kalan}". */
function satirMetni(d: DukkanKaydi, simdi: number): string {
  if (d.durum === "insaat") return `<b>${esc(dukkanAdi(d))}</b><span class="soluk">${enc("dukkan.D1.satir_insaat", { kalan: saatDakika(Math.max(0, (d.bitis ?? simdi) - simdi) / SAAT_MS) })}</span>`;
  // Rafı tamamen boş yeni dükkân "net −132 ₺/sa" ile açılmasın: neden söylenir (raf boş), zarar gibi görünmez
  if (d.yuvalar.every((y) => y.mal === null)) return `<b>${enc("dukkan.D1.satir_bos_raf", { ad: dukkanAdi(d), dukkan: dukkanAdi(d) })}</b>`;
  return `<b>${enc("dukkan.D1.satir_acik", { ad: dukkanAdi(d), net: paraIsaretli(d.gelirMiliSa - d.giderMiliSa) })}</b>`;
}

/** D-1 İşletmem bölümü; dünyada dükkân kapalıysa (DUK-00) ya da veri yoksa HİÇ yazılmaz. */
export function dukkanBolumuHtml(g: DukkanGorunumu | null, o: DukkanBolumuSecenegi): string {
  if (!g || g.kapali) return "";
  let s = `<section class="dk-bolum" data-ekran="d1"><h3>${enc("dukkan.D1.baslik")}</h3>`;
  if (!g.dukkanlar.length) return s + `<div class="bos-durum dk-bos">${ikon("store", 28)}<p class="ipucu-metin">${enc("dukkan.D1.isletmem_bos")}</p></div></section>`;
  s += `<ul class="mulk-liste">`;
  for (const d of g.dukkanlar)
    s += `<li class="dk-satir" data-dukkan="${d.id}" data-durum="${d.durum}">${ikon(TUR_IKONU[d.tur], 20)}<span class="ml-ad">${satirMetni(d, o.simdi)}</span>${gitDugmesi(d.ilce, o.ilceAdi)}</li>`;
  return s + `</ul></section>`;
}

/** İşletmem panelinin en üstüne (kimlik satırından sonra) gelecek kart: dükkân önerisi, Defter kartı ya da boş. */
export function ustKartHtml(durum: "dukkan" | "defter" | null, defter?: { metin: string; odulHtml: string; kavram?: string } | null, dukkanKur = false): string {
  if (durum === "dukkan") return oneriKartiHtml(defter?.metin);
  if (durum === "defter" && defter) return defterKartiHtml(defter.metin, defter.odulHtml, dukkanKur && defter.kavram === "ilk_dukkan");
  return "";
}

// --- D-2: tür seçimi -----------------------------------------------------------------------------

export interface TurSecimiGirdisi {
  secili: DukkanTuru | null;
  /** Gösterilecek türler (`yapi_market` G8 yoksa yok). */
  turler?: readonly DukkanTuru[];
  /** Bu ilçede / ilde kendi dükkân sayın ve sınırlar. */
  ilceSayi: number;
  ilceSinir: number;
  ilSayi: number;
  ilSinir: number;
  /** Tür başına depoda satabileceği mal var mı (`tur_uyum`); bilinmeyen tür için işaret yazılmaz. */
  uyum?: Partial<Record<DukkanTuru, boolean>>;
  /** Önleme nedeni (`p.dk-neden`) ve ret metni (`p.dk-hata`): hazır metin anahtarı. */
  neden?: DukkanMetinAnahtari;
  nedenYer?: Readonly<Record<string, string | number>>;
  hata?: string;
}

export function turSecimiHtml(g: TurSecimiGirdisi): string {
  const doluIlce = g.ilceSayi >= g.ilceSinir;
  let s = `<h4 class="dk-baslik">${enc("dukkan.D2.baslik")}</h4><p class="dk-ipucu">${enc("dukkan.D2.yer_ipucu")}</p><div class="dk-tur-liste">`;
  for (const t of g.turler ?? DUKKAN_TURLERI) {
    const u = g.uyum?.[t];
    s += `<button type="button" class="dk-tur" data-tur="${t}" aria-pressed="${g.secili === t}"${doluIlce ? ` aria-disabled="true" aria-describedby="dk-neden"` : ""}>${ikon(TUR_IKONU[t], 20)}<span class="dk-tur-ad">${esc(m(`dukkan.D2.tur_${t}`))}</span><span class="dk-tur-sayi">${enc("dukkan.D2.tur_sayi", { n: g.ilceSayi, m: g.ilceSinir })}</span>${u === undefined ? "" : `<span class="dk-tur-uyum soluk" data-uyum="${u ? "var" : t === "sekerci" ? "ithal" : "yok"}">${enc(u ? "dukkan.D2.tur_uyum.var" : t === "sekerci" ? "dukkan.D2.tur_uyum.yok_ithal" : "dukkan.D2.tur_uyum.yok")}</span>`}</button>`;
  }
  s += `</div><p class="dk-sinir">${enc("dukkan.D2.ilce_sayac", { n: g.ilceSayi })}</p><p class="dk-sinir">${enc("dukkan.D2.il_sayac", { n: g.ilSayi })}</p>`;
  const neden = g.neden ?? (doluIlce ? "dukkan.D2.ilce_siniri" : g.ilSayi >= g.ilSinir ? "dukkan.D2.il_siniri" : null);
  const nedenYer = g.nedenYer ?? { n: neden === "dukkan.D2.il_siniri" ? g.ilSinir : g.ilceSinir };
  s += `<p class="dk-neden" id="dk-neden" role="status">${neden ? enc(neden, nedenYer) : ""}</p>`;
  s += `<p class="dk-hata" role="alert">${g.hata ? esc(g.hata) : ""}</p>`;
  return s;
}

// --- D-3: maliyet kartına dükkân satırları -------------------------------------------------------

export type MaliyetDurumu = "tur-secilmedi" | "hazirlaniyor" | "uygun" | "hazine-yetmiyor" | "stok-eksik" | "pencere-bekliyor" | "sinir-dolu" | "insaat-siniri" | "gonderiliyor" | "ret";

export interface MaliyetGirdisi {
  tur: DukkanTuru;
  durum: MaliyetDurumu;
  /** mili-₺ (bedel yukarı yuvarlanır). */
  arsaMili: number;
  dukkanMili: number;
  celikAdet: number;
  parcaAdet: number;
  /** Pencere: gereken adet ve depodaki stok (yoksa satır yazılmaz). */
  pencere?: { gereken: number; var: number; tutarMili: number };
  sureSaat: number;
  toplamMili: number;
  hazineMili: number;
  /** İlk yapı indirimi (parametreden: kaç yapı, yüzde metni); yoksa not yazılmaz. */
  indirim?: { n: number; yuzde: string };
  /** Aynı anda en çok inşaat (`param.mulk.esZamanliInsaat`; sabit yazılmaz). */
  esZamanliInsaat: number;
  /** Yatırım tahmini (veri yoksa gizli): kırsal ilçede gün, genel süre. */
  yatirim?: { gun: number } | { saat: number };
  hata?: string;
}

/** `#yapi-kart` içine eklenecek dükkân satırları (dl.yk-satirlar, notlar, düğmeler). Birincil `Dükkânı kur`; kapalı durumda `aria-disabled`. */
export function maliyetSatirlariHtml(g: MaliyetGirdisi): string {
  const yukari = (x: number): string => paraMili(x, "yukari");
  const kapali = !["uygun", "pencere-bekliyor"].includes(g.durum) && g.durum !== "ret";
  const pencereEksik = g.pencere !== undefined && g.pencere.var < g.pencere.gereken;
  let s = `<div class="dk-maliyet" data-durum="${g.durum}"><div class="yk-baslik"><b>${enc("dukkan.D3.baslik", { tur: turAdi(g.tur) })}</b></div><dl class="yk-satirlar">`;
  // "Çelik · 3" → etiket ve değer (ilk " · " ayırır)
  const sat = (a: DukkanMetinAnahtari, yer: Record<string, string | number>): string => {
    const [et = "", ...dg] = m(a, yer).split(" · ");
    return `<dt>${esc(et)}</dt><dd>${esc(dg.join(" · "))}</dd>`;
  };
  s += sat("dukkan.D3.satir_arsa", { arsa: yukari(g.arsaMili) });
  s += sat("dukkan.D3.satir_dukkan", { n: yukari(g.dukkanMili) });
  s += sat("dukkan.D3.satir_celik", { n: fmt(g.celikAdet) });
  s += sat("dukkan.D3.satir_parca", { n: fmt(g.parcaAdet) });
  if (g.pencere) s += `<dt>Pencere</dt><dd class="dk-stok" data-durum="${pencereEksik ? "eksik" : "yeter"}">${pencereEksik ? enc("dukkan.D3.pencere_yok", { n: g.pencere.gereken, var: g.pencere.var, tutar: yukari(g.pencere.tutarMili) }) : enc("dukkan.D3.pencere_yeter", { n: g.pencere.gereken })}</dd>`;
  s += sat("dukkan.D3.satir_sure", { n: fmt(Math.ceil(g.sureSaat)) });
  s += `<dt>${enc("dukkan.D3.satir_toplam")}</dt><dd>${yukari(g.toplamMili)}</dd><dt>${enc("dukkan.D3.satir_hazine")}</dt><dd>${paraMili(g.hazineMili, "asagi")}</dd></dl>`;
  if (g.indirim) s += `<p class="dk-not">${enc("dukkan.D3.indirim_notu", { n: g.indirim.n, yuzde: g.indirim.yuzde })}</p>`;
  if (g.durum === "pencere-bekliyor") s += `<p class="dk-not">${enc("dukkan.D3.pencere_bekleme")}</p>`;
  if (g.durum === "hazine-yetmiyor") s += `<div class="yk-uyari" role="status">${enc("dukkan.D3.hazine_yetmiyor", { n: yukari(g.toplamMili), m: paraMili(g.hazineMili, "asagi") })}</div>`;
  if (g.durum === "insaat-siniri") s += `<div class="yk-uyari" role="status">${enc("dukkan.D3.insaat_siniri", { n: g.esZamanliInsaat })}</div>`;
  s += `<div class="dk-tahmin"${g.yatirim ? "" : " hidden"}><b>${enc("dukkan.D3.yatirim_baslik")}</b> ${g.yatirim ? ("gun" in g.yatirim ? enc("dukkan.D3.yatirim_kirsal", { n: g.yatirim.gun }) : enc("dukkan.D3.yatirim_genel", { sure: saatDakika(g.yatirim.saat) })) : ""}</div>`;
  if (g.hata) s += `<p class="dk-hata" role="alert">${esc(g.hata)}</p>`;
  s += `<div class="yk-dugmeler">`;
  if (pencereEksik) s += `<button type="button" class="eylem" data-eylem="pazardan-al">${enc("dukkan.D3.dugme_pazar")}</button>`;
  s += `<button type="button" class="eylem" data-yk="vazgec">${enc("dukkan.D3.dugme_vazgec")}</button><button type="button" class="birincil" data-yk="onayla"${kapali ? ` aria-disabled="true"` : ""}>${enc("dukkan.D3.dugme_kur")}</button></div></div>`;
  return s;
}

// --- D-4: inşa ve açılış --------------------------------------------------------------------------

/** D-4 harita etiketi ("Dükkân · iskele · 40 dk"). */
export function insaatEtiketi(asama: string, kalanSaat: number): string {
  return m("dukkan.D4.etiket").replace("{kalan}", saatDakika(kalanSaat)).replace(/iskele/, asama.toLocaleLowerCase("tr"));
}

// --- D-5: raf --------------------------------------------------------------------------------------

export type YuvaDurumu = "yukleniyor" | "bos" | "dolu-saglikli" | "dolu-stoksuz" | "dolu-karsilanmiyor" | "dolu-kasa-dolu" | "dolu-kampanya-bitti" | "gonderiliyor";

/** Yuva durumu: gönderme > yuva düzeyi (stoksuz, kampanya bitti) > dükkân düzeyi (kasa dolu, karşılanmıyor) > sağlıklı. */
export function yuvaDurumu(d: Pick<DukkanKaydi, "kasaPpm" | "karsilanmaPpm">, y: DukkanYuvasi, gonderiyor = false, yukleniyor = false): YuvaDurumu {
  if (yukleniyor) return "yukleniyor";
  if (gonderiyor) return "gonderiliyor";
  if (y.mal === null) return "bos";
  if (!y.stokVar) return "dolu-stoksuz";
  if (y.kademe === 0 && y.etkinKademe !== 0) return "dolu-kampanya-bitti";
  if (d.kasaPpm >= PPM) return "dolu-kasa-dolu";
  if (d.karsilanmaPpm < PPM) return "dolu-karsilanmiyor";
  return "dolu-saglikli";
}

const KADEME_ANAHTARI: Readonly<Record<Kademe, DukkanMetinAnahtari>> = { 0: "dukkan.D6.kademe_kampanya", 1: "dukkan.D6.kademe_uygun", 2: "dukkan.D6.kademe_normal", 3: "dukkan.D6.kademe_yuksek" };

export interface RafSecenegi {
  malAdi: (mal: string) => string;
  /** Şimdiki sim zamanı (ms; değişim bekleme süresi için). */
  simdi: number;
  gonderiyor?: boolean;
  yukleniyor?: boolean;
  /** Seçili yuva (kademe düzenlenen); `aria-pressed` yazılır. */
  seciliYuva?: number;
  /** Kasanın saatlik en çok satış birimi (`D5.bilgi`; parametreden, sabit yazılmaz). */
  kasaBirimSa: number;
}

function yuvaHtml(d: DukkanKaydi, y: DukkanYuvasi, i: number, o: RafSecenegi): string {
  const durum = yuvaDurumu(d, y, o.gonderiyor, o.yukleniyor);
  const mal = y.mal === null ? "" : o.malAdi(y.mal);
  // Yuva içinde KISA neden; tam cümle `title` ve `aria-describedby`
  let kisa = "";
  let uzun = "";
  if (durum === "dolu-stoksuz") {
    kisa = m("dukkan.D5.yuva_stoksuz");
    uzun = m("dukkan.D5.neden_stoksuz").replace("{mal}", mal);
  } else if (durum === "dolu-kampanya-bitti") {
    kisa = m("dukkan.D5.yuva_kampanya_bitti");
    uzun = m("dukkan.D5.neden_kampanya_bitti");
  } else if (y.beklemeSaat > 0) kisa = m("dukkan.D5.yuva_bekleme", { sure: saatDakika(y.beklemeSaat) });
  const neden = kisa ? `<span class="dk-yuva-neden">${esc(kisa)}</span>` : "";
  const nedenKimlik = `dk-yuva-${d.id}-${i}`;
  const icerik =
    y.mal === null
      ? `<span class="dk-yuva-satir">${enc("dukkan.D5.bos_yuva")}</span>`
      : `<span class="dk-yuva-satir"><b>${enc("dukkan.D5.yuva_satiri", { mal, kademe: m(KADEME_ANAHTARI[y.etkinKademe]), fiyat: paraMili(y.fiyatMili, "yukari") })}</b></span><span class="dk-yuva-stok">${enc("dukkan.D5.tahmini_satis", { n: fmt(Math.round(y.istekMiliSaat / 1000)) })}</span>`;
  // Boş yuva pencere sürerken doldurulamaz (boşaltma fiyatT'yi silmez): "mal koy" soluk ve aria-disabled (odak kalır)
  const kapali = o.gonderiyor || o.yukleniyor || (y.mal === null && y.beklemeSaat > 0);
  return `<button type="button" class="dk-yuva" data-yuva="${i}" data-durum="${durum}" data-mal="${esc(y.mal ?? "")}" data-bekleme="${y.beklemeSaat > 0 ? "1" : "0"}"${kapali ? ` aria-disabled="true"` : ""}${uzun ? ` title="${esc(uzun)}" aria-describedby="${nedenKimlik}"` : ""}${o.seciliYuva === i ? ` aria-pressed="true"` : ""}>${icerik}${neden}${uzun ? `<span class="dk-yuva-tam" id="${nedenKimlik}" hidden>${esc(uzun)}</span>` : ""}</button>`;
}

/** D-5 raf: 4 yuva, dükkân düzeyi neden (`p.dk-neden`: karşılanmıyor, kasa dolu) ve boş raf uyarısı. */
export function rafHtml(d: DukkanKaydi, o: RafSecenegi): string {
  if (o.yukleniyor) return `<div class="dk-raf" aria-busy="true" data-ekran="d5"><div class="dk-yukleniyor">${enc("dukkan.D5.yukleniyor")}</div></div>`;
  const bos = d.yuvalar.every((y) => y.mal === null);
  let s = `<h4 class="dk-baslik">${enc("dukkan.D5.baslik")}</h4><div class="dk-raf" aria-busy="${o.gonderiyor ? "true" : "false"}" data-ekran="d5">`;
  d.yuvalar.forEach((y, i) => (s += yuvaHtml(d, y, i, o)));
  s += `</div>`;
  // Dükkân düzeyi neden: yalnız rafta mal varken (boş rafta başka uyarı var)
  let neden: "karsilanmiyor" | "kasa_dolu" | null = null;
  if (!bos) neden = d.kasaPpm >= PPM ? "kasa_dolu" : d.karsilanmaPpm < PPM ? "karsilanmiyor" : null;
  s += `<p class="dk-neden" data-neden="${neden ?? ""}">${neden ? enc(neden === "kasa_dolu" ? "dukkan.D5.neden_kasa_dolu" : "dukkan.D5.neden_karsilanmiyor") : ""}</p>`;
  if (bos) {
    // Rafın bütün yuvaları bekleme penceresindeyse (boşaltma fiyatT'yi silmez) süre söylenir; yoksa mal koyma yönlendirmesi
    const bekleyen = d.yuvalar.filter((y) => y.beklemeSaat > 0).map((y) => y.beklemeSaat);
    if (bekleyen.length === d.yuvalar.length && bekleyen.length > 0) s += `<p class="dk-not">${enc("dukkan.D5.bos_raf_bekleme", { sure: saatDakika(Math.min(...bekleyen)) })}</p>`;
    else s += `<p class="dk-not">${enc("dukkan.D5.bos_raf_uyari")}</p>`;
  }
  // Dolu yuvaların HEPSİ stoksuzsa: nasıl düzeleceği söylenir ("Üret ya da Pazar'dan al") ve yapı paletine tek mini düğme
  const dolu = d.yuvalar.filter((y) => y.mal !== null);
  if (dolu.length > 0 && dolu.every((y) => !y.stokVar)) s += `<p class="dk-not" data-neden="hepsi_stoksuz">${enc("dukkan.D5.raf_hepsi_stoksuz")}</p><button type="button" class="mini-dugme" data-eylem="yapi-kur">${enc("dukkan.D5.secici_stoksuz_yapi")}</button>`;
  return s + `<p class="dk-not soluk">${enc("dukkan.D5.bilgi", { n: fmt(o.kasaBirimSa) })}</p>`;
}

export interface SeciciMali {
  mal: string;
  stokMili: number;
  fiyatMili: number;
}

/** D-5 mal seçici (alt sayfa): rafa konabilir mallar; stoksuzlar soluk. Hiç stok yoksa `secici_stoksuz` + "Yapı kur" (mini düğme, zorlama yok). */
export function seciciHtml(adaylar: readonly SeciciMali[], malAdi: (mal: string) => string, yuva: number, kasaBirimSa: number): string {
  let s = `<div class="dk-secici" role="dialog" aria-modal="true" aria-label="${enc("dukkan.D5.secici_baslik")}" data-yuva="${yuva}"><h4 class="dk-baslik">${enc("dukkan.D5.secici_baslik")}</h4>`;
  if (!adaylar.length) return s + `<p class="dk-not">${enc("dukkan.D5.secici_bos")}</p></div>`;
  const stoklu = adaylar.filter((a) => a.stokMili > 0);
  if (!stoklu.length) s += `<p class="dk-not">${enc("dukkan.D5.secici_stoksuz")}</p><button type="button" class="mini-dugme" data-eylem="yapi-kur">${enc("dukkan.D5.secici_stoksuz_yapi")}</button>`;
  // Stoklu mallar önce (stok çoktan aza), stoksuzlar sonra (kararlı sıra): oyuncunun tek stoklu malı ilk satırda
  const sirali = [...adaylar].sort((x, y) => (y.stokMili > 0 ? 1 : 0) - (x.stokMili > 0 ? 1 : 0) || (x.stokMili > 0 && y.stokMili > 0 ? y.stokMili - x.stokMili : 0));
  for (const a of sirali) {
    const kapali = a.stokMili <= 0;
    s += `<button type="button" class="dk-mal" data-mal="${esc(a.mal)}"${kapali ? ` aria-disabled="true"` : ""}><span>${enc("dukkan.D5.mal_satiri", { mal: malAdi(a.mal), n: fmt(Math.round(Math.max(0, a.stokMili) / 1000)), fiyat: paraMili(a.fiyatMili, "yukari") })}</span>${kapali ? `<span class="soluk">${enc("dukkan.D5.stoksuz_mal")}</span>` : ""}</button>`;
  }
  return s + `<p class="dk-not soluk">${enc("dukkan.D5.bilgi", { n: fmt(kasaBirimSa) })}</p></div>`;
}

/**
 * Ret kodundan metin (`DUKKAN_RET_ANAHTARI`): DUK-18 (fiyat/mal değişim penceresi) `{sure}` ister ("Bu yuvaya en erken 3 sa 20 dk sonra mal koyabilirsin."); `{n}` ya da
 * `{sure}` yer tutucusu ham kalmaz (sunucudan süre gelmediyse genel "yeniden dene" biçimi yerine pencerenin tamamı verilir). Bilinmeyen kod: null.
 */
export function retMetni(kod: string, yer: { beklemeSaat?: number; n?: number } = {}): string | null {
  const a = DUKKAN_RET_ANAHTARI[kod];
  if (a === undefined) return null;
  const metin = dukkanMetni(a, { sure: saatDakika(yer.beklemeSaat ?? 1), n: yer.n ?? 1 });
  return metin;
}

// --- D-6: kademe ve kampanya ------------------------------------------------------------------------

export interface KademeSecenegi {
  malAdi: (mal: string) => string;
  /** Kampanya kuralı açık mı (veri paketinden); kapalıysa kampanya düğmesi ve kademesi yok. */
  kampanyaAcik: boolean;
  kampanya: DukkanKaydi["kampanya"];
  simdi: number;
  gonderiyor?: boolean;
  hata?: string;
  /** Dükkânın kasa doluluğu (ppm; `ipucu_kasa_dolu` eşiği için) ve ilçedeki dükkân sayısı (esnaf payı ipucu ≥ 2). */
  kasaPpm?: number;
  ilceDukkanSayisi?: number;
  /** Esnaf payı ("%20"; `param.mulk.perakende.esnaf.tabanPayPpm`ten `yuzde()`); verilmezse esnaf payı ipucu yazılmaz. */
  esnafPayiYuzde?: string;
  /** Yuvayı boşaltırsa yeniden mal koyabilmek için beklemesi gereken süre (saat; `fiyatDegisimEnAzSaat`). Verilirse "Yuvayı boşalt" ve uyarısı yazılır. */
  bosaltBeklemeSaat?: number;
}

/** D-6 fiyat kademesi ve kampanya satırları (seçili yuva için). */
export function kademeHtml(y: DukkanYuvasi, o: KademeSecenegi): string {
  if (y.mal === null) return "";
  const durum = o.gonderiyor ? "gonderiliyor" : y.beklemeSaat > 0 ? "bekleme" : "serbest";
  const kademeler: Kademe[] = o.kampanyaAcik ? [0, 1, 2, 3] : [1, 2, 3];
  const kapaliDurum = durum !== "serbest";
  let s = `<div class="segment" role="group" aria-label="${esc(o.malAdi(y.mal))}" data-durum="${durum}"${kademeler.length === 3 ? ` data-sutun="3"` : ""}>`;
  for (const k of kademeler) s += `<button type="button" data-kademe="${k}" aria-pressed="${y.kademe === k}"${kapaliDurum ? ` aria-disabled="true"` : ""}>${enc(KADEME_ANAHTARI[k])}</button>`;
  s += `</div>`;
  s += `<p class="dk-fiyat-satiri">${enc("dukkan.D6.birim_fiyat", { fiyat: paraMili(y.fiyatMili, "yukari"), n: fmt(Math.round(y.istekMiliSaat / 1000)), net: paraIsaretli(y.netMiliSaat) })}</p>`;
  s += `<p class="dk-ipucu">${enc("dukkan.D6.ipucu_kademe")}</p>`;
  if (y.kademe === 2) s += `<p class="dk-sinir-sure">${enc("dukkan.D6.ipucu_normal")}</p>`;
  if ((o.kasaPpm ?? 0) >= KASA_DOLU_IPUCU_ESIGI_PPM) s += `<p class="dk-ipucu">${enc("dukkan.D6.ipucu_kasa_dolu")}</p>`;
  if (o.esnafPayiYuzde && (o.ilceDukkanSayisi ?? 0) >= 2) s += `<p class="dk-ipucu">${enc("dukkan.D6.ipucu_esnaf_payi", { esnaf_payi: o.esnafPayiYuzde })}</p>`;
  if (y.kademe === 3) s += `<p class="dk-sinir-sure">${enc("dukkan.D6.yuksek_uyari")}</p>`;
  if (y.beklemeSaat > 0) {
    const dk = Math.max(1, Math.ceil(y.beklemeSaat * 60 - 1e-9));
    const s1 = Math.floor(dk / 60);
    s += `<p class="dk-sinir-sure">${s1 > 0 ? enc("dukkan.D6.bekleme_sayac", { n: s1, m: dk % 60 }) : enc("dukkan.D6.bekleme_kisa", { m: dk })}</p>`;
  }
  if (o.kampanyaAcik) {
    const k = o.kampanya;
    const suruyor = k.bitis > o.simdi;
    const durumK = suruyor ? "kampanya-suruyor" : k.kalanGun <= 0 ? "kampanya-hak-yok-hafta" : k.kalanSaat <= 0 ? "kampanya-hak-yok-gun" : "";
    s += `<p class="dk-kampanya"${durumK ? ` data-durum="${durumK}"` : ""}>`;
    if (suruyor) {
      const dk = Math.max(1, Math.ceil((k.bitis - o.simdi) / 60_000));
      s += enc("dukkan.D6.kampanya_suruyor", { n: Math.floor(dk / 60), m: dk % 60 });
    } else if (k.kalanGun <= 0) s += enc("dukkan.D6.hak_bitti_hafta");
    else if (k.kalanSaat <= 0) s += enc("dukkan.D6.hak_bitti_gun");
    else s += enc("dukkan.D6.kampanya_hak", { n: k.kalanSaat, m: k.kalanGun });
    s += `</p><p class="dk-not">${enc("dukkan.D6.kampanya_uyari")}</p>`;
    const dugmeKapali = suruyor || k.kalanGun <= 0 || k.kalanSaat <= 0 || o.gonderiyor;
    s += `<button type="button" class="eylem" data-eylem="kampanya"${dugmeKapali ? ` aria-disabled="true"` : ""}>${enc("dukkan.D6.kampanya_dugme")}</button>`;
  }
  if (o.bosaltBeklemeSaat !== undefined && o.bosaltBeklemeSaat > 0)
    s += `<p class="dk-not">${enc("dukkan.D5.bosalt_uyari", { sure: saatDakika(o.bosaltBeklemeSaat) })}</p><button type="button" class="eylem" data-eylem="yuva-bosalt"${y.beklemeSaat > 0 || o.gonderiyor ? ` aria-disabled="true"` : ""}>${enc("dukkan.D5.dugme_bosalt")}</button>`;
  if (o.hata) s += `<p class="dk-hata" role="alert">${esc(o.hata)}</p>`;
  return s;
}

// --- D-8: satış özeti ------------------------------------------------------------------------------

/**
 * D-8 özet kartı, dört AYRI satır: satış (BİRİM/sa, Σ yuva isteği), gelir (₺/sa), gider, net; tahminler "≈" ile. Toplam gelir AYRI ve kesin satırdır.
 * `D8.kart_satis` değeri birimdir (para değil). Satış yoksa satır yerine `satis_yok`.
 */
export function ozetHtml(d: DukkanKaydi, toplamGelirMiliSa: number | null, yukleniyor = false): string {
  if (yukleniyor) return `<div class="dk-ozet" aria-busy="true"><p class="dk-ozet-satir">${enc("dukkan.D8.yukleniyor")}</p></div>`;
  const net = d.gelirMiliSa - d.giderMiliSa;
  const birim = Math.round(d.yuvalar.reduce((t, y) => t + (y.mal !== null ? y.istekMiliSaat : 0), 0) / 1000);
  let s = `<div class="dk-ozet">`;
  const bosRaf = d.yuvalar.every((y) => y.mal === null);
  s += birim > 0 && d.gelirMiliSa > 0 ? `<p class="dk-ozet-satir">${enc("dukkan.D8.kart_satis", { n: fmt(birim) })}</p>` : `<p class="dk-ozet-satir">${enc(bosRaf ? "dukkan.D5.bos_raf_uyari" : "dukkan.D8.satis_yok")}</p>`;
  s += `<p class="dk-ozet-satir">${enc("dukkan.D8.kart_gelir", { gelir: paraMili(d.gelirMiliSa) })}</p>`;
  s += `<p class="dk-ozet-satir">${enc("dukkan.D8.kart_gider", { g: paraMili(d.giderMiliSa) })}</p>`;
  s += `<p class="dk-ozet-satir">${enc("dukkan.D8.kart_net", { net: paraIsaretli(net) })}</p>`;
  if (toplamGelirMiliSa !== null) s += `<p class="dk-ozet-toplam">${enc("dukkan.D8.toplam_satis", { n: paraMili(toplamGelirMiliSa) })}</p>`;
  if (d.kasaPpm >= PPM) s += `<p class="dk-kasa" data-yuzde="100">${enc("dukkan.D8.kasa", { n: 100 })}</p>`;
  return s + `</div>`;
}

// --- D-8.1: menü ve kaldırma ------------------------------------------------------------------------

/** "Daha fazla" menüsü: inşada "İptal et (iade %50)", açıkta "Dükkânı kaldır". Menü açılınca ilk öğeye odak ve ok tuşları DOM bağlayıcısındadır. */
export function dukkanMenusuHtml(d: Pick<DukkanKaydi, "id" | "durum">, acik: boolean, iadeYuzde: string): string {
  const oge =
    d.durum === "insaat"
      ? `<button type="button" role="menuitem" class="eylem" data-eylem="insaat-iptal" data-dukkan="${d.id}">${enc("dukkan.D4.dugme_iptal", { yuzde: iadeYuzde })}</button>`
      : `<button type="button" role="menuitem" class="eylem" data-eylem="dukkan-kaldir" data-dukkan="${d.id}">${enc("dukkan.D81.dugme")}</button>`;
  return `<button type="button" class="ikon-dugme dk-menu" aria-haspopup="menu" aria-expanded="${acik}" aria-label="${enc("dukkan.D81.menu")}">${ikon("ellipsis", 18)}</button>${acik ? `<div role="menu" class="dk-menu-liste">${oge}</div>` : ""}`;
}

/** Onay alt sayfası: `.tehlike` (kaldır / iptal onayı) ve `.eylem` Vazgeç (varsayılan odak). */
export function kaldirOnayHtml(d: Pick<DukkanKaydi, "id" | "durum">, iadeYuzde: string): string {
  const insaat = d.durum === "insaat";
  return (
    `<div class="dk-onay" role="alertdialog" aria-modal="true" aria-labelledby="dk-onay-metin" data-dukkan="${d.id}">` +
    `<p id="dk-onay-metin">${enc(insaat ? "dukkan.D4.iptal_onay" : "dukkan.D81.onay", { yuzde: iadeYuzde })}</p>` +
    `<button type="button" class="eylem" data-eylem="onay-vazgec" data-varsayilan-odak="1">${enc("dukkan.D3.dugme_vazgec")}</button>` +
    `<button type="button" class="tehlike" data-eylem="${insaat ? "insaat-iptal-onayla" : "dukkan-kaldir-onayla"}" data-dukkan="${d.id}">${enc(insaat ? "dukkan.D4.dugme_iptal" : "dukkan.D81.dugme_onay", { yuzde: iadeYuzde })}</button>` +
    `</div>`
  );
}

// --- Dikkat -----------------------------------------------------------------------------------------

export interface DukkanDikkati {
  tur: "eksik" | "bosta";
  baslik: string;
  ilce?: string;
}

/**
 * Dükkân Dikkat maddeleri. İnşadaki dükkân: rafa konabilir stok yoksa `D4.dikkat_stoksuz`. Açık dükkân: raf TAMAMEN boşsa stok varken `D4.raf_oneri`, yoksa
 * `D5.bos_raf_uyari` (yol gösterir); `dikkat_mal_var` ("başka mal") yalnız en az bir yuva doluyken. Ayrıca stoğu biten mal, kasa dolu, kampanya bitti.
 * `rafaKonabilir(mal)`: depoda o maldan stok var mı.
 */
export function dukkanDikkatMaddeleri(g: DukkanGorunumu | null, malAdi: (mal: string) => string, rafaKonabilir: (mal: string) => boolean = () => false): DukkanDikkati[] {
  if (!g || g.kapali) return [];
  const l: DukkanDikkati[] = [];
  const stokVar = [...g.satilabilirMallar].some(rafaKonabilir);
  for (const d of g.dukkanlar) {
    const ilce = d.ilce ? { ilce: d.ilce } : {};
    if (d.durum === "insaat") {
      if (!stokVar) l.push({ tur: "eksik", baslik: m("dukkan.D4.dikkat_stoksuz"), ...ilce });
      continue;
    }
    const doluYuva = d.yuvalar.filter((y) => y.mal !== null);
    if (doluYuva.length === 0) l.push({ tur: "bosta", baslik: m(stokVar ? "dukkan.D4.raf_oneri" : "dukkan.D5.bos_raf_uyari"), ...ilce });
    else if (d.yuvalar.some((y) => y.mal === null)) {
      const raftakiler = new Set(doluYuva.map((y) => y.mal));
      if ([...g.satilabilirMallar].some((x) => !raftakiler.has(x) && rafaKonabilir(x))) l.push({ tur: "bosta", baslik: m("dukkan.D8.dikkat_mal_var"), ...ilce });
    }
    for (const y of d.yuvalar) if (y.mal !== null && !y.stokVar) l.push({ tur: "eksik", baslik: m("dukkan.D8.dikkat_stok", { mal: malAdi(y.mal) }), ...ilce });
    if (d.kasaPpm >= PPM) l.push({ tur: "bosta", baslik: m("dukkan.D8.dikkat_kasa"), ...ilce });
    if (d.yuvalar.some((y) => y.kademe === 0 && y.etkinKademe !== 0)) l.push({ tur: "bosta", baslik: m("dukkan.D8.dikkat_kampanya"), ...ilce });
  }
  return l;
}
