/**
 * Mülk kipi paneli (harita yığınında; kabuk `arayuz/mulk-paneli.ts` sözleşmesiyle bağlar). Sahip kararı: devlet seçimi yok,
 * oyuncu bir ilçede arsa alarak başlar. Bu kipte panel oyuncunun işletmesini gösterir:
 *   - İşletmem: kimlik (ad ve amblem), yeni oyuncu kalkanı ve ayrılmış hücre hakkı, ilçe ilçe arsalar, yapılar, inşaatlar;
 *   - Hazine: hazine, net akış, arazi değeri ve tahakkuk eden arazi vergisi;
 *   - Mal: stok, üretim ve satış/alış;
 *   - Dikkat: yalnız oyuncunun kendi yapılarından: eksik girdi, boşta, inşaat bitti;
 *   - Olaylar: gerçek tarih ve iklim dönemi (hasat ritmi).
 * Bölge, Devlet ve Savaş sekmeleri yoktur; öneri motoru bölge kipine özgüdür. Onun yerine İşletmem'in sonunda Esnaf Defteri
 * bölümü durur (`defter.ts`: sıradaki adımlar ödül tutarıyla, defterine işlenenler tarihle); bağdaştırıcı defter vermiyorsa
 * "Rehber görevler yakında".
 * Veri bağdaştırıcının `isletme()` özetinden okunur (sunucu karesi ya da sahte bağdaştırıcı); burada hesap yoktur.
 */
import { DUNYA_EPOCH_MS, esc, fmt, gercekTarih, paraIsaretli, paraMili, sureMetni, tamTarihMetni, yuzde } from "../arayuz/bicim";
import type { GovdeDurumu } from "../arayuz/govde";
import type { MulkPaneli } from "../arayuz/mulk-paneli";
import { hasatCubuklari } from "../arayuz/tarim-govde";
import { ikon } from "../tasarim/ikon";
import type { IkonAdi } from "../tasarim/ikon";
import { hasatMetni, takvimDurumu, takvimParametresi } from "../veri/tarim";
import type { IsletmeDurumu, IsletmeYapisi } from "./baglanti";
import type { HaritaGorunumu } from "./gorunum";
import type { Hiyerarsi } from "./veri";
import { ASAMA_ADI, yapiAsamasi } from "./yapi";
import { OLCEK_AD, olcekBuyutulebilir } from "./olcek";
import { mulkMetni } from "./mulk-metin";
import { defterBirlesikMetni, defterHtml, defterUstKarti, ilkSatisBekliyor, kazanimBildirimleri, yeniKazanilanlar } from "./defter";
import { dukkanBolumuHtml, dukkanDikkatMaddeleri, ustKartHtml } from "./dukkan-html";
import { dukkanMetni } from "./dukkan-metin";
import { DEFTER_ATLA_ANAHTARI, IlkSatisIzleyici, ONERI_KAPALI_ANAHTARI, oneriDurumu, rafaKonabilirStok, tarayiciDeposu } from "./dukkan-veri";
import type { DukkanKaynagi } from "./dukkan-veri";
import { dukkanKaynagiKur, referansFiyati } from "./dukkan-kaynak";
import { DukkanPaneli, dukkanPanelParam, panelEylemiOku } from "./dukkan-panel";
import { dukkanTuruMallari } from "./etkin";
import type { Defter } from "@bolge/protokol";
import { bildir } from "../arayuz/bildirim";
import { sebekeBolumuHtml, sebekeFiyatlari, sebekeSatirlari } from "./sebeke-gider";
import { PazarSatPaneli, pazarOrani, pazarSatEylemiOku } from "./pazar-sat";
import { YontemPaneli, yontemEylemiOku } from "./yontem-panel";
import mulkCss from "./mulk-panel.css?inline";
import dukkanCss from "./dukkan-panel.css?inline";

const SAAT = 3_600_000;
/** Biten inşaat Dikkat'te bu kadar sim saati kalır. */
const BITTI_SAAT = 24;
/** Bu verimin altında çalışan tesis "eksik girdi" sayılır. */
const EKSIK_VERIM_PPM = 600_000;

export const MULK_SEKMELERI: ReadonlyArray<{ id: string; ad: string; ikon: IkonAdi }> = [
  { id: "isletme", ad: "İşletmem", ikon: "building" },
  { id: "hazine", ad: "Hazine", ikon: "wallet" },
  { id: "mal", ad: "Mal", ikon: "package" },
  { id: "dikkat", ad: "Dikkat", ikon: "triangle-alert" },
  { id: "olaylar", ad: "Olaylar", ikon: "cloud-sun-rain" },
];

export interface MulkDikkatMaddesi {
  tur: "eksik" | "bosta" | "bitti";
  baslik: string;
  ayrinti: string;
  ilce?: string;
  sira: number;
  /** Madde bir dükkânın hazır olduğunu söylüyorsa "Rafa git" eylemi (dükkânın ayrıntısını İşletmem'de açar). */
  rafaGit?: { dukkan: number; etiket: string };
}

const SIMGE: Record<MulkDikkatMaddesi["tur"], { ikon: IkonAdi; ad: string }> = {
  eksik: { ikon: "triangle", ad: "Eksik girdi" },
  bosta: { ikon: "circle", ad: "Boşta" },
  bitti: { ikon: "check", ad: "İnşaat bitti" },
};
const TUR_SIRA: Record<MulkDikkatMaddesi["tur"], number> = { eksik: 0, bosta: 1, bitti: 2 };

/** Ad kaynakları (içerikten; bilinmeyen kimlik olduğu gibi gösterilir). */
export interface MulkAdlari {
  yapi: (tur: string) => string;
  mal: (mal: string) => string;
  ilce: (ilce: string) => string;
  il: (il: string) => string;
  /** Ayrılmış hücre hakkının süresi (gün; `mulk.yeniOyuncu.ayrilmisGun`, yoksa 14). */
  ayrilmisGun?: number;
  /** İlk yapı indirimi yüzdesi ("%30"; `mulk.yeniOyuncu.ilkYapiIndirimPpm`'den); yoksa metin yüzdesiz. */
  indirimYuzde?: string;
  /** İlçedeki (açık) dükkânın kimliği ("Dükkân hazır" maddesindeki "Rafa git"); dükkân yoksa null. */
  dukkanRafa?: (ilce?: string) => number | null;
  /** Tesis satırında "Büyüt" gösterilsin mi (`olcek.ts` `olcekBuyutulebilir`); tanımsızsa gösterilmez. */
  buyut?: (y: IsletmeYapisi, tumu: readonly IsletmeYapisi[]) => boolean;
  /** Tesis satırı için "Yöntemi değiştir" parçaları (`yontem-panel.ts`: düğme satırın düğmeleri arasında, seçici ve onay satırın altında); tanımsızsa hiçbiri çıkmaz. */
  yontem?: (y: IsletmeYapisi) => { dugme: string; alt: string };
  /** Mal satırının altındaki ek satırın içeriği (`pazar-sat.ts` `satirEki`: emir durumu, "Pazar'da sat", form); boş dizge = ek satır yok; tanımsızsa Mal sekmesi salt okunur. */
  pazar?: (x: IsletmeDurumu["mallar"][number]) => string;
}

const sure = (ms: number): string => sureMetni(Math.max(0, ms) / SAAT);

/**
 * "önce" için geçen süre (Dikkat): ondalıklı saat ("1,6 sa") yok; 1 saatin altı "N dk", üç saate dek "S sa D dk", sonrası "yaklaşık N sa" (24 saatten sonra gün).
 * Çağıran "önce" ekler.
 */
export function gecenSureMetni(ms: number): string {
  const dk = Math.max(1, Math.round(Math.max(0, ms) / 60_000));
  if (dk < 60) return `${dk} dk`;
  if (dk < 180) return dk % 60 === 0 ? `${dk / 60} sa` : `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
  const sa = Math.round(dk / 60);
  return sa < 24 ? `yaklaşık ${sa} sa` : `yaklaşık ${Math.round(sa / 24)} gün`;
}

/** Biten inşaat kaydı (oturum içinde izlenir): tür, ilçe, bitiş (sim ms), büyütme mi. */
export interface BitenInsaatKaydi {
  tur: string;
  ilce?: string;
  bitis: number;
  yukseltme?: boolean;
}

/**
 * "Biten inşaat" cümlesi: Dikkat maddesinin başlığı VE inşa bitişi bildirimi aynı kaynaktan (`dikkat.insaat_bitti` "Gebze: Çiftlik hazır."; dükkânda `dukkan.D4.hazir` "Gebze: Dükkân hazır.").
 * Ton bilgi verici: kutlama ya da ödül sözü yok.
 */
export function insaatBittiMetni(b: Pick<BitenInsaatKaydi, "tur" | "ilce" | "yukseltme">, ad: Pick<MulkAdlari, "yapi" | "ilce">): string {
  if (b.tur === "dukkan" && !b.yukseltme) return `${b.ilce ? `${ad.ilce(b.ilce)}: ` : ""}${dukkanMetni("dukkan.D4.hazir")}`;
  const yapiAd = `${ad.yapi(b.tur)}${b.yukseltme ? " büyütmesi" : ""}`;
  return b.ilce ? mulkMetni("dikkat.insaat_bitti", { ilce: ad.ilce(b.ilce), ad: yapiAd }) : `${yapiAd} hazır.`;
}

/** İnşaatın listeden düşerken bitmiş sayılması için izin verilen saat payı (ms): sunucu dönüşümü ve istemci saat tahmini küçük sapar; iptal (bitişe çok var) bitmiş sayılmaz. */
const BITIS_PAYI_MS = 2 * 60_000;

/** İnşaat izleme durumu (oturum): devam edenler, biten (Dikkat) kayıtları ve bitiş bildirimi yapılmış kimlikler. */
export interface InsaatIzleme {
  insaatlar: Map<string, BitenInsaatKaydi>;
  bitenler: Map<string, BitenInsaatKaydi>;
  duyurulan: Set<string>;
}

/**
 * Oturum içi inşaat geçişi (saf; bir okuma turu): devam eden inşaatlar kaydedilir, listeden düşenlerden bitişi geçmiş olanlar `bitenler`e (Dikkat, bir saat payla) girer. Dönen liste
 * inşa bitişi bildirimi (toast) içindir: yalnız bu oturumda "devam eden" görülüp biten (bitişi geçmiş ya da kısa payla geçmek üzere; iptal edilen dönmez) ve daha önce duyurulmamış
 * yapılar, bitişe göre sıralı. Açılışta zaten bitmiş olanlar hiç "devam eden" görülmediği için dönmez: sayfa yenilenince toast tekrarlanmaz (Dikkat maddesi yerinde kalır).
 */
export function insaatlariIzle(izleme: InsaatIzleme, yapilar: readonly IsletmeYapisi[], t: number): Array<[string, BitenInsaatKaydi]> {
  const simdi = new Set<string>();
  for (const y of yapilar) {
    const id = y.anahtar.slice(1);
    if (y.durum === "insaat") {
      simdi.add(id);
      izleme.insaatlar.set(id, { tur: y.tur, ...(y.ilce ? { ilce: y.ilce } : {}), bitis: y.bitis ?? t, ...(y.yukseltme ? { yukseltme: true } : {}) });
    } else if (y.bitis !== undefined && !izleme.bitenler.has(id) && t - y.bitis <= BITTI_SAAT * SAAT) izleme.bitenler.set(id, { tur: y.tur, ...(y.ilce ? { ilce: y.ilce } : {}), bitis: y.bitis });
  }
  const duyurulacak: Array<[string, BitenInsaatKaydi]> = [];
  for (const [id, x] of izleme.insaatlar) {
    if (simdi.has(id)) continue;
    izleme.insaatlar.delete(id);
    if (x.bitis <= t + SAAT) izleme.bitenler.set(id, { ...x, bitis: Math.min(x.bitis, t) });
    if (x.bitis <= t + BITIS_PAYI_MS && !izleme.duyurulan.has(id)) {
      izleme.duyurulan.add(id);
      duyurulacak.push([id, x]);
    }
  }
  return duyurulacak.sort((p, q) => p[1].bitis - q[1].bitis);
}

/** Dikkat maddeleri (saf): yalnız oyuncunun kendi yapılarından. `bitenler`: bu oturumda biten inşaatlar (anahtar → bitiş). */
export function mulkDikkatMaddeleri(
  d: IsletmeDurumu,
  ad: MulkAdlari,
  bitenler: ReadonlyMap<string, { tur: string; ilce?: string; bitis: number; yukseltme?: boolean }>,
  dukkan: readonly MulkDikkatMaddesi[] = [],
): MulkDikkatMaddesi[] {
  const l: MulkDikkatMaddesi[] = [];
  const t = d.simZamani;
  for (const y of d.yapilar) {
    if (y.durum !== "tesis") continue;
    const yer = y.ilce ? ad.ilce(y.ilce) : y.il ? ad.il(y.il) : "";
    const bas = `${yer ? `${yer}: ` : ""}${ad.yapi(y.tur)}`;
    if (y.aktif === false) l.push({ tur: "bosta", baslik: `${bas} boşta`, ayrinti: "durduruldu", ...(y.ilce ? { ilce: y.ilce } : {}), sira: -1 });
    else if (y.verimPpm !== undefined && y.verimPpm <= 0) l.push({ tur: "bosta", baslik: `${bas} boşta`, ayrinti: "çalışmıyor: girdi ya da işçi yok", ...(y.ilce ? { ilce: y.ilce } : {}), sira: 0 });
    else if (y.verimPpm !== undefined && y.verimPpm < EKSIK_VERIM_PPM)
      l.push({ tur: "eksik", baslik: `${bas}: girdi eksik`, ayrinti: `verim ${yuzde(Math.round(y.verimPpm / 10_000))}`, ...(y.ilce ? { ilce: y.ilce } : {}), sira: y.verimPpm });
  }
  for (const [, b] of bitenler) {
    if (t - b.bitis > BITTI_SAAT * SAAT || t < b.bitis) continue;
    // Biten dükkân inşaatı: "Dükkân hazır." ve raf düzenlemeye giden "Rafa git" (A1 bulgusu: metinler kodda kullanılmıyordu)
    const hazirDukkan = b.tur === "dukkan" && !b.yukseltme ? (ad.dukkanRafa?.(b.ilce) ?? null) : null;
    if (b.tur === "dukkan" && !b.yukseltme) {
      l.push({ tur: "bitti", baslik: insaatBittiMetni(b, ad), ayrinti: t - b.bitis >= SAAT ? `${gecenSureMetni(t - b.bitis)} önce` : "az önce", ...(b.ilce ? { ilce: b.ilce } : {}), sira: -b.bitis, ...(hazirDukkan !== null ? { rafaGit: { dukkan: hazirDukkan, etiket: dukkanMetni("dukkan.D4.dugme_rafa_git") } } : {}) });
      continue;
    }
    l.push({ tur: "bitti", baslik: insaatBittiMetni(b, ad), ayrinti: t - b.bitis >= SAAT ? `${gecenSureMetni(t - b.bitis)} önce` : "az önce", ...(b.ilce ? { ilce: b.ilce } : {}), sira: -b.bitis });
  }
  l.push(...dukkan);
  return l.sort((a, b) => TUR_SIRA[a.tur] - TUR_SIRA[b.tur] || a.sira - b.sira);
}

function gitDugmesi(ilce: string | undefined): string {
  return ilce ? `<button type="button" class="eylem" data-mulk-ilce="${esc(ilce)}" title="Haritada göster">${ikon("map-pin", 15)}Git</button>` : "";
}

/** Hak özeti bloğunun (telefonda) kullanıcı tercihi: açık/kapalı; yok ise masaüstünde açık, telefonda kapalı. Panel yenilenince korunur. */
let korumaAcikTercih: boolean | null = null;

/** ≥ 821 px: masaüstü (özet satırı gizli, liste açık). Tarayıcı dışında (test) false. */
function masaustuMu(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 821px)").matches;
}

export interface KorumaSecenegi {
  /** `details` açık mı (verilmezse kullanıcı tercihi, yoksa masaüstünde açık). */
  acik?: boolean;
  /** İlk yapı indirimi yüzdesi ("%30"; parametreden); verilmezse yüzdesiz metin. */
  indirimYuzde?: string;
}

/**
 * Yeni oyuncu hakları (kalkan, ayrılmış hücre, ilk yapı indirimi; savaş dili yok): `details.mk-ozet` içinde özet satırı ("Yeni oyuncu hakların · 3") ve
 * liste (A6). Telefonda varsayılan kapalı, masaüstünde açık (özet satırı CSS ile gizli). Etkin hak yoksa blok hiç yazılmaz; sayı yalnız etkin olanlar.
 */
export function korumaSatirlari(d: IsletmeDurumu, ilceAdi?: (ilce: string) => string, ayrilmisGun = 14, sec: KorumaSecenegi = {}): string {
  const t = d.simZamani;
  const l: string[] = [];
  if (d.korumaBitis !== null && d.korumaBitis > t) l.push(`<li>${ikon("shield", 15)}<span><b>${esc(mulkMetni("mulk.koruma.kalkan", { sure: sure(d.korumaBitis - t) }))}</b><br><span class="soluk">${esc(mulkMetni("mulk.koruma.kalkan_ayrinti"))}</span></span></li>`);
  if (d.ayrilmisBitis !== null && d.ayrilmisBitis > t) {
    const yer = d.katilimIlcesi ? (ilceAdi?.(d.katilimIlcesi) ?? d.katilimIlcesi) : null;
    const ayrinti = yer ? mulkMetni("mulk.koruma.ayrilmis_ayrinti", { yer, gun: fmt(ayrilmisGun) }) : mulkMetni("mulk.koruma.ayrilmis_ayrinti_yersiz", { gun: fmt(ayrilmisGun) });
    l.push(`<li>${ikon("sprout", 15)}<span><b>${esc(mulkMetni("mulk.koruma.ayrilmis", { sure: sure(d.ayrilmisBitis - t) }))}</b><br><span class="soluk">${esc(ayrinti)}</span></span></li>`);
  }
  if (d.indirimliYapiKalan !== null && d.indirimliYapiKalan > 0) {
    const metin = sec.indirimYuzde ? mulkMetni("mulk.koruma.indirim", { yuzde: sec.indirimYuzde, n: fmt(d.indirimliYapiKalan) }) : mulkMetni("mulk.koruma.indirim_yuzdesiz", { n: fmt(d.indirimliYapiKalan) });
    l.push(`<li>${ikon("hammer", 15)}<span><b>${esc(metin)}</b></span></li>`);
  }
  if (!l.length) return "";
  const acik = sec.acik ?? korumaAcikTercih ?? masaustuMu();
  return `<details class="mk-ozet"${acik ? " open" : ""}><summary>${esc(mulkMetni("mulk.koruma.ozet", { n: l.length }))}</summary><ul class="mulk-koruma">${l.join("")}</ul></details>`;
}

function yapiDurumu(y: IsletmeYapisi, t: number): string {
  if (y.durum === "insaat" && y.yukseltme) return `Ölçek büyütme sürüyor${y.yukseltme.olcek ? ` · ${OLCEK_AD[y.yukseltme.olcek]}` : ""}${y.bitis !== undefined && y.bitis > t ? ` · ${sure(y.bitis - t)} kaldı` : ""}`;
  if (y.durum === "insaat") {
    const a = yapiAsamasi(y, t, SAAT);
    return `İnşa sürüyor · ${ASAMA_ADI[a]}${y.bitis !== undefined && y.bitis > t ? ` · ${sure(y.bitis - t)} kaldı` : ""}`;
  }
  if (y.aktif === false) return "Durdu";
  if (y.verimPpm !== undefined) return y.verimPpm > 0 ? `Çalışıyor · verim ${yuzde(Math.round(y.verimPpm / 10_000))}` : "Boşta";
  return "Tamam";
}

/** İşletmem'e eklenen dükkân parçaları: `ust` kimlik satırının hemen altı (öneri ya da Defter kartı), `dukkan` Yapılar'ın altı (Dükkânlarım). */
export interface IsletmeEki {
  ust?: string;
  dukkan?: string;
}

export function isletmePaneli(d: IsletmeDurumu | null, ben: { ad: string }, ad: MulkAdlari, defterBolumu?: string, ek: IsletmeEki = {}): string {
  if (!d) return `<p class="ipucu-metin">İşletme bilgisi yükleniyor…</p>`;
  const toplam = d.ilceHucre.reduce((s, [, n]) => s + n, 0);
  const ilk = [...ben.ad.trim()][0] ?? "?";
  let s = `<div class="mulk-kimlik"><span class="mulk-amblem" aria-hidden="true">${esc(ilk)}</span><div><b>${esc(ben.ad)}</b><span class="soluk">${toplam ? `${fmt(d.ilceHucre.length)} ilçede ${fmt(toplam)} hücre` : "Henüz arsan yok"}</span></div></div>`;
  s += ek.ust ?? "";
  s += korumaSatirlari(d, ad.ilce, ad.ayrilmisGun ?? 14, ad.indirimYuzde ? { indirimYuzde: ad.indirimYuzde } : {});
  s += `<h3>Arsalarım</h3>`;
  if (!d.ilceHucre.length) s += `<div class="bos-durum">${ikon("map-pin", 28)}<p class="ipucu-metin">Henüz arsan yok. Bir ilçe seç, hazır arsalardan birini al.</p></div>`;
  else {
    s += `<ul class="mulk-liste">`;
    for (const [ilce, n] of d.ilceHucre) {
      const yapi = d.yapilar.filter((y) => y.ilce === ilce).length;
      s += `<li><span class="ml-ad"><b>${esc(ad.ilce(ilce))}</b><span class="soluk">${fmt(n)} hücre${yapi ? `\u00a0· ${fmt(yapi)} yapı` : ""}</span></span>${gitDugmesi(ilce)}</li>`;
    }
    s += `</ul>`;
  }
  s += `<h3>Yapılar</h3>`;
  // Dükkân yalnız Dükkânlarım'da görünür (iki listede yinelenmez)
  const sirali = d.yapilar.filter((y) => y.tur !== "dukkan").sort((a, b) => (a.durum === b.durum ? 0 : a.durum === "insaat" ? -1 : 1) || (a.bitis ?? 0) - (b.bitis ?? 0));
  if (!sirali.length) s += `<p class="ipucu-metin">Henüz yapın yok. Haritada “Yapı kur” ile arsana ilk yapını yerleştir.</p>`;
  else {
    s += `<ul class="mulk-liste">`;
    for (const y of sirali) {
      const yer = y.ilce ? ad.ilce(y.ilce) : y.il ? ad.il(y.il) : "";
      const buyut = ad.buyut?.(y, d.yapilar) ? `<button type="button" class="eylem" data-mulk-buyut="${esc(y.anahtar)}" data-mulk-buyut-ilce="${esc(y.ilce ?? "")}" title="Tesisi bir üst ölçeğe büyüt">${ikon("hammer", 15)}Büyüt</button>` : "";
      const yp = ad.yontem?.(y) ?? { dugme: "", alt: "" };
      s += `<li data-yapi-durum="${y.durum}"><span class="ml-ad"><b>${esc(ad.yapi(y.tur))}</b><span class="soluk">${esc(yapiDurumu(y, d.simZamani))}${yer ? `\u00a0· ${esc(yer)}` : ""}</span></span>${buyut}${yp.dugme}${gitDugmesi(y.ilce)}${yp.alt}</li>`;
    }
    s += `</ul>`;
  }
  s += ek.dukkan ?? "";
  s += defterBolumu ?? `<h3>Rehber</h3><div class="bos-durum">${ikon("compass", 28)}<p class="ipucu-metin">Rehber görevler yakında.</p></div>`;
  return s;
}

export function mulkHazinePaneli(d: IsletmeDurumu | null, sebeke = ""): string {
  if (!d) return `<p class="ipucu-metin">Hazine bilgisi yükleniyor…</p>`;
  const satir = (k: string, v: string, a = ""): string => `<dt>${k}</dt><dd>${v}${a ? `<br><span class="soluk">${a}</span>` : ""}</dd>`;
  let s = `<dl class="mulk-dl">`;
  s += satir("Hazine", d.hazineMili !== null ? `<b data-alan="mulk-hazine">${paraMili(d.hazineMili)}</b>` : "—");
  if (d.hazineOraniMili !== null && d.hazineOraniMili !== 0) s += satir("Net akış", `${paraIsaretli(d.hazineOraniMili)}/sa`, "Gelir ve giderlerin saatlik toplamı.");
  if (d.araziDegeriMili !== null) s += satir("Arazi değeri", paraMili(d.araziDegeriMili), "Arsalarının satın alma bedeli toplamı.");
  if (d.araziVergisiMili !== null) s += satir("Arazi vergisi", paraMili(d.araziVergisiMili, "yukari"), "Tahakkuk eden, henüz ödenmemiş.");
  s += `</dl>`;
  return s + sebeke;
}

export function mulkMalPaneli(d: IsletmeDurumu | null, ad: MulkAdlari): string {
  if (!d) return `<p class="ipucu-metin">Stok bilgisi yükleniyor…</p>`;
  if (!d.mallar.length) return `<div class="bos-durum">${ikon("package", 28)}<p class="ipucu-metin">Deponda henüz mal yok. Yapıların üretmeye başlayınca stok ve satış burada görünür.</p></div>`;
  // B4: stok, üretim ve satış AŞAĞI, alış (ödenen) YUKARI; "en yakın" yok
  const m = (x: number): string => fmt(Math.floor(x / 1000));
  const yukari = (x: number): string => fmt(Math.ceil(x / 1000));
  let s = `<div class="tablo-kap"><table class="mini-tablo"><thead><tr><th>Mal</th><th class="sayi">Stok</th><th class="sayi">Üretim/sa</th><th class="sayi">Satış/sa</th></tr></thead><tbody>`;
  for (const x of d.mallar) {
    s += `<tr><td>${esc(ad.mal(x.mal))}</td><td class="sayi">${m(x.stokMili)}</td><td class="sayi">${x.uretimMili ? m(x.uretimMili) : "—"}</td><td class="sayi">${x.satisMili ? m(x.satisMili) : x.alisMili ? `alış ${yukari(x.alisMili)}` : "—"}</td></tr>`;
    const ek = ad.pazar?.(x);
    if (ek) s += `<tr class="mal-eylem"><td colspan="4">${ek}</td></tr>`;
  }
  return s + `</tbody></table></div><p class="ipucu-metin">Satış: işletme emirlerinin gerçekleşen saatlik miktarı.</p>`;
}

export function mulkDikkatPaneli(l: MulkDikkatMaddesi[]): string {
  let s = `<p class="ipucu-metin">Yapılarında ilgilenmen gerekenler.</p>`;
  if (!l.length) return s + `<div class="bos-durum">${ikon("circle-check", 32)}<p class="ipucu-metin">Şu an ilgilenmen gereken bir şey yok. Bereket versin.</p></div>`;
  s += `<ol class="dikkat-liste">`;
  for (const m of l.slice(0, 5)) {
    const r = SIMGE[m.tur];
    s += `<li class="dikkat-satir" data-tur="${m.tur}"><span class="rozet-simge ${m.tur}" role="img" aria-label="${esc(r.ad)}">${ikon(r.ikon, 15, "kalin")}</span><div class="dikkat-metin"><b>${esc(m.baslik)}</b><br><span class="soluk">${esc(m.ayrinti)}</span></div><div class="dikkat-dugme">${m.rafaGit ? `<button type="button" class="eylem" data-eylem="dukkan-rafa" data-dukkan="${m.rafaGit.dukkan}">${esc(m.rafaGit.etiket)}</button>` : ""}${gitDugmesi(m.ilce)}</div></li>`;
  }
  s += `</ol>`;
  if (l.length > 5) s += `<p class="ipucu-metin">+${l.length - 5} madde daha.</p>`;
  return s;
}

export function mulkOlayPaneli(simSaat: number, g: GovdeDurumu, epochMs?: number): string {
  const tarih = gercekTarih(simSaat, epochMs);
  const t = g.dizin?.tarim;
  let s = `<div class="takvim-kutu"><div class="takvim-baslik"><b>${esc(tamTarihMetni(tarih))}</b>`;
  if (t) {
    const k = takvimDurumu(simSaat, takvimParametresi(t));
    const iklim = k.ay !== tarih.ay ? ` · iklim dönemi ${esc(k.ayAdi)}` : "";
    s += ` <span class="soluk">${iklim} · bu ay hasat ${hasatMetni(t.hasatAylik[k.ay] ?? 1000)}</span></div><div class="hasat-buyuk">${hasatCubuklari(t.hasatAylik, k.ay, true)}</div>`;
    s += `<p class="ipucu-metin">Hasat ritmi: aylık ortalama hasat oranı (yıllık ortalama %100). Vurgulu çubuk içinde bulunduğumuz aydır.</p></div>`;
  } else s += `</div></div>`;
  return s + `<div class="bos-durum">${ikon("cloud-sun-rain", 28)}<p class="ipucu-metin">Şu an ilçelerini etkileyen bir olay yok.</p></div>`;
}

/**
 * Telefonda harita açıkken panel gizlidir: "İşletmem" düğmesi (kırıntının altında) paneli alt sayfa olarak açar ve kapatır.
 * Masaüstünde düğme görünmez (panel zaten sağda).
 */
function isletmeSayfasi(ac: boolean): void {
  document.body.classList.toggle("isletme-acik", ac);
  document.getElementById("isletme-dugme")?.setAttribute("aria-expanded", String(ac));
  if (ac) {
    document.getElementById("panel")?.classList.remove("kapali");
    document.body.classList.remove("panel-kapali");
  }
}

function isletmeDugmesiKur(): void {
  if (document.getElementById("isletme-dugme")) return;
  const d = document.createElement("button");
  d.type = "button";
  d.id = "isletme-dugme";
  d.className = "isletme-dugme";
  d.setAttribute("aria-controls", "panel");
  d.setAttribute("aria-expanded", "false");
  d.innerHTML = `${ikon("building", 16)}İşletmem`;
  d.addEventListener("click", () => isletmeSayfasi(!document.body.classList.contains("isletme-acik")));
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("isletme-acik")) isletmeSayfasi(false);
  });
  document.getElementById("harita-gezgin")?.append(d);
}

export interface MulkPaneliSecenekleri {
  gorunum: HaritaGorunumu;
  hiyerarsi: Hiyerarsi;
  /** İlçeyi haritada açar; harita ilçeye varınca çözülür ("Büyüt" bundan sonra başlar). */
  ilceAc: (ilce: string) => void | Promise<void>;
  /** Dükkân verisi (G7 köprüsü); yoksa dükkân yüzeyleri hiç çıkmaz (Defter kartı yine çalışır). */
  dukkan?: DukkanKaynagi;
}

/** `mulkDinleKur` girdileri (saf: DOM ve zamanlayıcı dışarıdan verilir; sınama sahte verir). */
export interface MulkDinleGirdisi {
  /** Bağdaştırıcının kare/delta dinleyicisi (yoksa tanımsız). */
  bDinle?: (f: () => void) => (() => void) | void;
  /** Defteri okur ve okununca çizimi çağırır. */
  defterOku: (f: () => void) => Promise<void>;
  /** Her zamanlayıcı turunda çizimden önce yapılan iş (Defter imzası, ilk satış bildirimi); Defter'i okurken KORUMALI çizimi (`ciz`) verir. */
  tik: (ciz: () => void) => void;
  /** Açık seçicinin / sayı alanının odağını (imleçle) yakalar; geri yükleyici ya da yoksa null. */
  yakala: () => (() => void) | null | undefined;
  /** Yinelenen zamanlayıcı; döndürdüğü işlev durdurur. */
  zamanla: (f: () => void, ms: number) => () => void;
  /** Yenile bağlantısı (panelin başka eylemleri bu çizimi kullanır). */
  yenileAyarla: (f: (() => void) | null) => void;
}

/**
 * Panelin yeniden çizim yolları (kare/delta, Defter okuma, iki saniyelik tur) TEK korumalı çizimden geçer: çizimden önce odak yakalanır, çizimden hemen sonra (eşzamanlı) geri verilir.
 * Önceden yalnız zamanlayıcı yolu korunuyordu; kare ve Defter yolu `#pz-oran` alanını yeniden kurup yazan oyuncunun odağını düşürüyordu (P13 f4).
 */
export function mulkDinleKur(g: MulkDinleGirdisi, f: () => void): () => void {
  const ciz = (): void => {
    const geri = g.yakala();
    try {
      f();
    } finally {
      geri?.();
    }
  };
  const birak = g.bDinle?.(ciz);
  g.yenileAyarla(ciz);
  void g.defterOku(ciz);
  const durdur = g.zamanla(() => {
    g.tik(ciz);
    ciz();
  }, 2000);
  return () => {
    g.yenileAyarla(null);
    if (typeof birak === "function") birak();
    durdur();
  };
}

/** Kabuğa verilen sağlayıcı. */
export function mulkPaneliKur(s: MulkPaneliSecenekleri): MulkPaneli {
  if (!document.getElementById("mulk-panel-stil")) {
    const st = document.createElement("style");
    st.id = "mulk-panel-stil";
    st.textContent = mulkCss + dukkanCss;
    document.head.append(st);
  }
  isletmeDugmesiKur();
  // Hak özeti `details` açık/kapalı tercihi panel yenilenince korunur (toggle olayı kabarmaz: yakalama aşamasında dinlenir)
  document.addEventListener(
    "toggle",
    (e) => {
      const t = e.target;
      if (t instanceof HTMLDetailsElement && t.classList.contains("mk-ozet")) korumaAcikTercih = t.open;
    },
    true,
  );
  const b = s.gorunum.baglanti;
  const ic = s.gorunum.tablo;
  const katalog = s.gorunum.yapiKatalogu();
  const ad: MulkAdlari = {
    yapi: (tur) => katalog.find((k) => k.id === tur)?.ad ?? ic.turler[ic.turIdx[tur] ?? -1]?.ad ?? (tur || "Yapı"),
    mal: (mal) => ic.mallar[ic.malIdx[mal] ?? -1]?.ad ?? mal,
    ilce: (ilce) => s.hiyerarsi.ilceler.get(ilce)?.ad ?? ilce,
    il: (il) => s.hiyerarsi.iller.get(il)?.ad ?? il,
    ayrilmisGun: ic.param.mulk?.yeniOyuncu.ayrilmisGun ?? 14,
    ...(ic.param.mulk?.yeniOyuncu.ilkYapiIndirimPpm ? { indirimYuzde: yuzde(ic.param.mulk.yeniOyuncu.ilkYapiIndirimPpm / 10_000) } : {}),
    dukkanRafa: (ilce) => dukkanKaynagi?.gorunum()?.dukkanlar.find((x) => x.durum === "acik" && (ilce === undefined || x.ilce === ilce))?.id ?? null,
    ...(b.olcekYukselt ? { buyut: (y: IsletmeYapisi, tumu: readonly IsletmeYapisi[]) => olcekBuyutulebilir(ic, y, tumu) } : {}),
  };
  // Biten inşaatlar: bir inşaat listeden düşünce (ya da bitişi geçince) bu oturumda hatırlanır
  const izleme: InsaatIzleme = { insaatlar: new Map(), bitenler: new Map(), duyurulan: new Set() };
  const bitenler = izleme.bitenler;
  let son: IsletmeDurumu | null = null;
  // Esnaf Defteri: açılışta, yirmi saniyede bir ve yapı/hücre değişince okunur; yeni kazanılan için sakin bildirim
  let defter: Defter | null = null;
  let defterImza = "";
  let defterOkunuyor = false;
  let defterSonT = 0;
  const defterOku = async (f?: () => void): Promise<void> => {
    if (!b.defterAl || defterOkunuyor) return;
    defterOkunuyor = true;
    defterSonT = Date.now();
    try {
      const d = await b.defterAl();
      if (!d) return;
      for (const o of kazanimBildirimleri(yeniKazanilanlar(defter, d), ad.mal)) bildir(o.mesaj, "bilgi", { grup: { ad: "defter", n: 1, deger: o.deger, birlestir: defterBirlesikMetni } });
      defter = d;
      f?.();
    } finally {
      defterOkunuyor = false;
    }
  };
  // Dükkân yüzeyleri (G9): üstte tek kart (D0 öneri ya da B7 Defter kartı), Dükkânlarım bölümü, Dikkat maddeleri, ilk satış bildirimi.
  // Kapatma/atlama tercihi yerel (localStorage; erişilemezse oturum içi). Dükkân kaynağı yoksa yalnız Defter kartı çalışır.
  // Dükkân kaynağı: verilmediyse sunucu bağdaştırıcısının karesinden (K2 köprüsü); sahte bağdaştırıcıda yok (dükkân yüzeyleri çıkmaz)
  const dukkanKaynagi: DukkanKaynagi | undefined =
    s.dukkan ??
    (b.dukkanKaresi
      ? dukkanKaynagiKur({
          kare: () => b.dukkanKaresi?.() ?? null,
          ic,
          katalog,
          hazineMili: () => b.isletme?.()?.hazineMili ?? null,
          stokMili: (mal) => b.isletme?.()?.mallar.find((x) => x.mal === mal)?.stokMili ?? 0,
          indirim: () => s.gorunum.ilkYapiIndirimi(),
        })
      : undefined);
  /** "Dükkân kur" bağlı mı: dükkân verisi var ve harita dükkân kurabiliyor (yoksa D0 kartı hiç çıkmaz). */
  const dukkanKurulabilir = (): boolean => dukkanKaynagi !== undefined && s.gorunum.dukkanKurulabilir();
  const depo = tarayiciDeposu();
  const ilkSatis = new IlkSatisIzleyici(depo);
  let yenile: (() => void) | null = null;
  /** Bir tıklamanın istediği sekme (kabuk `tikla` sonrası okur ve geçer). */
  let sekmeIstegi: string | null = null;
  const ekYapiMi = (tur: string): boolean => katalog.find((k) => k.id === tur)?.ek === true;
  const ustDurum = (d: IsletmeDurumu | null): "dukkan" | "defter" | null => {
    if (!d) return null;
    const g = dukkanKaynagi?.gorunum() ?? null;
    return oneriDurumu({
      yapilar: d.yapilar,
      ekYapiMi,
      dukkan: g,
      stokVar: g ? rafaKonabilirStok(d.mallar, g.satilabilirMallar) : false,
      dukkanKurulabilir: dukkanKurulabilir(),
      oneriKapatildi: depo.oku(ONERI_KAPALI_ANAHTARI) === "1",
      defterAtlandi: depo.oku(DEFTER_ATLA_ANAHTARI) === "1",
      defterSiradaki: defterUstKarti(defter, ad.mal, ilkSatisBekliyor(defter, oku()?.ihracatEmriVar === true)) !== null,
    });
  };
  /** Telefonda alt sayfa kapalıyken İşletmem düğmesindeki öneri noktası ve erişilebilir adı (yalnız dükkân önerisinde; Defter kartı nokta çıkarmaz). */
  const oneriIsareti = (durum: "dukkan" | "defter" | null): void => {
    const dugme = document.getElementById("isletme-dugme");
    if (!dugme) return;
    if (durum === "dukkan") {
      dugme.setAttribute("data-oneri", "1");
      dugme.setAttribute("aria-label", dukkanMetni("dukkan.D0.oneri_isaret_etiket"));
    } else {
      dugme.removeAttribute("data-oneri");
      dugme.removeAttribute("aria-label");
    }
  };
  const dukkanGorunumu = () => dukkanKaynagi?.gorunum() ?? null;
  // Dükkân ayrıntısı (raf, kademe, marka, kaldırma): komutlar bağdaştırıcının `dukkanKomutu` ucundan; kare gelmemişse ya da dükkân kuralı yoksa panel çıkmaz
  const panelParam = dukkanPanelParam(ic);
  const dukkanPaneli: DukkanPaneli | undefined =
    dukkanKaynagi && b.dukkanKomutu && panelParam
      ? new DukkanPaneli({
          gorunum: dukkanGorunumu,
          malAdi: ad.mal,
          simdi: () => b.ozet?.()?.simZamani ?? 0,
          stokMili: (mal) => b.isletme?.()?.mallar.find((x) => x.mal === mal)?.stokMili ?? 0,
          referans: (mal) => referansFiyati(ic, b.dukkanKaresi?.() ?? null)(mal),
          turMallari: (tur) => (tur === null ? [] : dukkanTuruMallari(ic, tur)),
          komut: (k) => b.dukkanKomutu!(k),
          param: panelParam,
          degisti: () => yenile?.(),
          bildir: (metin, tur) => bildir(metin, tur),
          yapiKur: () => {
            isletmeSayfasi(false);
            s.gorunum.yapiMenusuAc();
          },
        })
      : undefined;
  if (dukkanPaneli) {
    // Marka adı yazılırken yalnız sayaç, önizleme ve hata yamalanır (yeniden çizim odağı bozardı); oklarla simge/renk gezinme (roving tabindex)
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || t.id !== "dk-marka-ad") return;
      dukkanPaneli.girdi(t.value);
      const taslak = document.createElement("div");
      taslak.innerHTML = dukkanPaneli.markaFormu();
      for (const sel of ['[data-alan="marka-sayac"]', '[data-alan="marka-onizleme"]', "#dk-marka-hata"]) {
        const yeni = taslak.querySelector(sel);
        const eski = document.querySelector(sel);
        if (yeni && eski && eski.innerHTML !== yeni.innerHTML) eski.innerHTML = yeni.innerHTML;
      }
      if (taslak.querySelector("#dk-marka-hata")?.textContent) t.setAttribute("aria-invalid", "true");
      else t.removeAttribute("aria-invalid");
    });
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || !t.matches(".dk-simge, .dk-renk")) return;
      const adim = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (adim === 0) return;
      e.preventDefault();
      const simge = t.classList.contains("dk-simge");
      const grup = [...document.querySelectorAll<HTMLElement>(simge ? ".dk-simge" : ".dk-renk")];
      const yeni = (grup.indexOf(t) + adim + grup.length) % grup.length;
      const o = simge ? { eylem: "simge", simge: yeni } : { eylem: "renk", renk: yeni };
      void dukkanPaneli.eylem(o).then(() => window.setTimeout(() => document.querySelectorAll<HTMLElement>(simge ? ".dk-simge" : ".dk-renk")[yeni]?.focus(), 0));
    });
  }
  // Yöntem seçici ("Yöntemi değiştir") ve Hazine'de şebeke gideri: komut `yontem_degistir` bağdaştırıcının ucundan; sahte bağdaştırıcıda ve içerik olmadan çıkmaz.
  const sebekeFiyat = sebekeFiyatlari(ic);
  const yenidenCiz = (): void => {
    yenile?.(); // korumalı çizim (`mulkDinleKur`): odak yakalanır ve çizimden hemen sonra geri verilir
  };
  const yontemPaneli: YontemPaneli | undefined = b.yontemDegistir
    ? new YontemPaneli({
        ic,
        yapiAdi: ad.yapi,
        isletme: () => son ?? b.isletme?.() ?? null,
        acikTeknolojiler: () => b.acikTeknolojiler?.() ?? null,
        komut: (i) => b.yontemDegistir!(i),
        degisti: yenidenCiz,
        bildir: (metin, tur) => bildir(metin, tur),
      })
    : undefined;
  if (yontemPaneli) {
    ad.yontem = (y) => yontemPaneli.satirParcalari(y);
    // Yöntem seçici klavyesi (radiogroup, "Yöntemi değiştir" açıkken): oklar/Home/End seçimi ve odağı taşır, Boşluk/Enter seçer; Esc vazgeçer
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || !t.closest(".ym-degistir")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        yontemPaneli.kapat();
        return;
      }
      const kart = t.closest<HTMLElement>(".ym-kart");
      if (!kart) return;
      const id = yontemPaneli.tus(e.key, kart.dataset["yontem"] ?? null);
      if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", " ", "Spacebar", "Enter"].includes(e.key)) return;
      e.preventDefault();
      if (id !== null) void yontemPaneli.eylem({ eylem: "sec", yontem: id }).then(() => window.setTimeout(() => document.querySelector<HTMLElement>(`.ym-degistir .ym-kart[data-yontem="${id.replace(/"/g, "")}"]`)?.focus(), 0));
    });
  }
  // Pazar'da sat (Mal sekmesi): `ticaret_emri` (ihracat; mülk kipinde liman şartı yok) bağdaştırıcının ucundan; sahte bağdaştırıcıda çıkmaz.
  const pazarSat: PazarSatPaneli | undefined = b.ticaretEmri
    ? new PazarSatPaneli({
        ic,
        malAdi: ad.mal,
        isletme: () => son ?? b.isletme?.() ?? null,
        referans: (mal) => referansFiyati(ic, b.dukkanKaresi?.() ?? null)(mal),
        kalkan: () => (son ?? b.isletme?.() ?? null)?.korumaBitis != null,
        ilkSatisOdulu: () => defter?.siradaki.find((k) => k.kavram === "ilk_satis")?.odul?.degerMili ?? null,
        ilkDukkanSatisi: () => dukkanKaynagi?.gorunum()?.ilkSatisT != null,
        komut: (i) => b.ticaretEmri!(i),
        degisti: yenidenCiz,
        bildir: (metin, tur) => bildir(metin, tur),
      })
    : undefined;
  /** Form kapanınca (Esc, Vazgeç, emir verildi) odak satırın "Pazar'da sat" düğmesine döner. */
  const satirDugmesineDon = (mal: string): void => void window.setTimeout(() => document.querySelector<HTMLElement>(`[data-eylem="pazar-ac"][data-mal="${mal.replace(/"/g, "")}"]`)?.focus(), 0);
  if (pazarSat) {
    ad.pazar = (x) => pazarSat.satirEki(x);
    // Sayı alanına yazılırken yalnız özet (fiyat, net, gelir, uyarı) ve "Satış emri ver" kilidi yamalanır (yeniden çizim odağı bozardı); Enter emri verir, Esc vazgeçer
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || t.id !== "pz-oran") return;
      pazarSat.girdi(t.value);
      const mal = pazarSat.durum.acik;
      const ozet = document.querySelector('[data-alan="pazar-ozet"]');
      if (mal !== null && ozet) ozet.innerHTML = pazarSat.ozetHtml(mal);
      const ver = document.querySelector<HTMLElement>('[data-eylem="pazar-ver"]');
      if (ver) {
        if (pazarOrani(t.value) === null) ver.setAttribute("aria-disabled", "true");
        else ver.removeAttribute("aria-disabled");
      }
    });
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || !t.closest(".pz-form")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        const mal = pazarSat.durum.acik;
        pazarSat.kapat();
        if (mal !== null) satirDugmesineDon(mal);
      } else if (e.key === "Enter" && t instanceof HTMLInputElement) {
        e.preventDefault();
        void pazarSat.eylem({ eylem: "ver" });
      }
    });
  }
  const dukkanDikkat = (): MulkDikkatMaddesi[] =>
    dukkanDikkatMaddeleri(dukkanGorunumu(), ad.mal, (mal) => (son?.mallar.find((x) => x.mal === mal)?.stokMili ?? 0) > 0).map((x, i) => ({ tur: x.tur, baslik: x.baslik, ayrinti: "", ...(x.ilce ? { ilce: x.ilce } : {}), sira: i }));
  const epoch = (): number => b.dunyaEpochMs?.() ?? DUNYA_EPOCH_MS;
  const oku = (): IsletmeDurumu | null => {
    const d = b.isletme?.() ?? null;
    if (!d) return son;
    // Biten inşaat: nötr bilgi toast'ı (Dikkat maddesiyle aynı cümle; Defter bildirimi bunun ardından okunur, kuyruk tek tek gösterir)
    for (const [, x] of insaatlariIzle(izleme, d.yapilar, d.simZamani)) bildir(insaatBittiMetni(x, ad), "bilgi");
    son = d;
    return d;
  };
  return {
    sekmeler: MULK_SEKMELERI,
    icerik(sekme, g) {
      const d = oku();
      switch (sekme) {
        case "isletme": {
          const durum = ustDurum(d);
          oneriIsareti(durum);
          // İlk yapı (üretim tesisi) inşadayken D0 kartındaki Defter satırı "İlk yapını kur" demez (D0.defter_adim_insada)
          const ilkYapiInsada = d?.yapilar.some((y) => y.durum === "insaat" && !ekYapiMi(y.tur)) ?? false;
          const satisBekliyor = ilkSatisBekliyor(defter, d?.ihracatEmriVar === true);
          const ust = ustKartHtml(durum, defterUstKarti(defter, ad.mal, satisBekliyor), dukkanKurulabilir(), ilkYapiInsada);
          const dukkan = dukkanBolumuHtml(dukkanGorunumu(), { ilceAdi: ad.ilce, simdi: d?.simZamani ?? 0, secili: dukkanPaneli?.durum.secili ?? null }) + (dukkanPaneli?.html() ?? "");
          return isletmePaneli(d, b.ben, ad, b.defterAl ? defterHtml(defter, ad.mal, epoch(), satisBekliyor) : undefined, { ust, dukkan });
        }
        case "hazine":
          return mulkHazinePaneli(d, sebekeBolumuHtml(sebekeSatirlari(sebekeFiyat, d?.sebeke ?? []), ad.mal));
        case "mal":
          return mulkMalPaneli(d, ad);
        case "dikkat":
          return mulkDikkatPaneli(d ? mulkDikkatMaddeleri(d, ad, bitenler, dukkanDikkat()) : []);
        case "olaylar":
          return mulkOlayPaneli((d?.simZamani ?? b.ozet?.()?.simZamani ?? 0) / SAAT, g, epoch());
      }
      return "";
    },
    sayac(sekme) {
      const d = son;
      return sekme === "dikkat" && d ? Math.min(5, mulkDikkatMaddeleri(d, ad, bitenler, dukkanDikkat()).length) : 0;
    },
    cubuk() {
      const oz = b.ozet?.() ?? null;
      if (!oz) return null;
      const ilk = [...b.ben.ad.trim()][0] ?? "?";
      return {
        html: `<i class="mulk-amblem kucuk" aria-hidden="true">${esc(ilk)}</i><span class="ocad">${esc(b.ben.ad)}</span>${oz.hazineMili !== null ? `<b>${paraMili(oz.hazineMili)}</b>` : ""}`,
        baslik: `${b.ben.ad}${oz.hazineMili !== null ? `: hazine ${paraMili(oz.hazineMili)}` : ""}. İşletmem sekmesini açmak için dokunun.`,
      };
    },
    simSaat() {
      const t = b.ozet?.()?.simZamani;
      return t === undefined ? null : t / SAAT;
    },
    epochMs: epoch,
    sekmeIstegi() {
      const i = sekmeIstegi;
      sekmeIstegi = null;
      return i;
    },
    tikla(t) {
      // Üst kart eylemleri: öneriyi kapat, "Dükkân kur", Defter kartını atla (tercih yerel; kart yeniden çizilir)
      const eylem = t.closest<HTMLElement>("[data-eylem]")?.dataset["eylem"];
      if (eylem === "oneri-kapat" || eylem === "defter-atla") {
        depo.yaz(eylem === "oneri-kapat" ? ONERI_KAPALI_ANAHTARI : DEFTER_ATLA_ANAHTARI, "1");
        yenile?.();
        return true;
      }
      if (eylem === "dukkan-kur") {
        // Telefonda alt sayfa kapanır; oyuncunun ilçesi açılır (Büyüt gibi), sonra yapı yerleşim kipi `dukkan` seçili başlar
        isletmeSayfasi(false);
        const ilce = son?.katilimIlcesi ?? son?.ilceHucre[0]?.[0] ?? null;
        void Promise.resolve(ilce ? s.ilceAc(ilce) : undefined).then(() => {
          if (!s.gorunum.dukkanKurBaslat()) bildir(dukkanMetni("dukkan.D1.kapali"), "bilgi");
        });
        return true;
      }
      const pe = dukkanPaneli ? panelEylemiOku(t) : null;
      if (pe && dukkanPaneli) {
        if (pe.eylem === "dukkan-rafa") sekmeIstegi = "isletme"; // Dikkat'ten "Rafa git": dükkân ayrıntısı İşletmem'dedir
        const rafaGit = pe.eylem === "dukkan-rafa";
        const kok = t.ownerDocument;
        void dukkanPaneli.eylem(pe).then(() => {
          // Kartın "Rafa git" düğmesi: ayrıntı zaten açıksa yeniden çizim sonrası raf görünür alana kaydırılır (açıkken bir şey yapmayan düğme olmasın)
          if (rafaGit) setTimeout(() => kok.querySelector('[data-ekran="d5"]')?.scrollIntoView({ block: "nearest" }), 0);
        });
        return true;
      }
      const pz = pazarSat ? pazarSatEylemiOku(t) : null;
      if (pz && pazarSat) {
        const mal = pazarSat.durum.acik;
        void pazarSat.eylem(pz).then(() => {
          if (pz.eylem === "ac" && pazarSat.durum.acik !== null) window.setTimeout(() => document.getElementById("pz-oran")?.focus(), 0);
          else if (pz.eylem === "oran") window.setTimeout(() => document.getElementById("pz-oran")?.focus(), 0);
          else if (mal !== null && pazarSat.durum.acik === null) satirDugmesineDon(mal); // aç-kapa, Vazgeç, emir verildi/bırakıldı
        });
        return true;
      }
      const ye = yontemPaneli ? yontemEylemiOku(t) : null;
      if (ye && yontemPaneli) {
        void yontemPaneli.eylem(ye);
        return true;
      }
      const bd = t.closest("[data-mulk-buyut]") as HTMLElement | null;
      if (bd) {
        // "Büyüt": telefonda alt sayfa kapanır, harita tesisin ilçesine gider, ek hücre planı ve maliyet kartı açılır
        isletmeSayfasi(false);
        const anahtar = bd.dataset["mulkBuyut"] ?? "";
        void Promise.resolve(s.ilceAc(bd.dataset["mulkBuyutIlce"] ?? "")).then(() => s.gorunum.olcekBaslat(anahtar));
        return true;
      }
      const g = t.closest("[data-mulk-ilce]") as HTMLElement | null;
      if (!g) return false;
      isletmeSayfasi(false); // telefonda alt sayfa kapanır: harita görünsün
      s.ilceAc(g.dataset["mulkIlce"] ?? "");
      return true;
    },
    dinle(f) {
      // Bağdaştırıcı değişince (kare, delta) ve inşaat aşamaları için iki saniyede bir; defter yapı/hücre değişince ya da 20 sn'de bir. Üç yol da `mulkDinleKur`un tek korumalı çiziminden geçer.
      return mulkDinleKur(
        {
          ...(b.dinle ? { bDinle: (cb: () => void) => b.dinle?.(cb) } : {}),
          defterOku,
          yakala: () => yontemPaneli?.odagiYakala(document) ?? pazarSat?.odagiYakala(document), // açık seçicinin / sayı alanının odağı yeniden çizimde düşmesin
          zamanla: (fn, ms) => {
            const z = window.setInterval(fn, ms);
            return () => window.clearInterval(z);
          },
          yenileAyarla: (y) => {
            yenile = y;
          },
          tik: (ciz) => {
            const d = oku();
            // Defter yapı/hücre değişince, ihracat emri açılıp kapanınca ve HER SİM SAATİNDE tazelenir: ödül dedektörü saat ızgarasında çalışır (ilk satış saat sınırında kazanılır), 20 sn'lik döngüyü beklemeden
            // "Çiftliğinin tahılını Pazar'da sat" adımı satıştan hemen sonra düşer (T-6).
            const imza = d ? `${d.yapilar.filter((y) => y.durum === "tesis").length}|${d.yapilar.length}|${d.ilceHucre.map(([i, n]) => `${i}:${n}`).join(",")}|${d.ihracatEmriVar === true ? 1 : 0}|${Math.floor(d.simZamani / 3_600_000)}` : "";
            if (imza !== defterImza || Date.now() - defterSonT > 20_000) {
              defterImza = imza;
              void defterOku(ciz);
            }
            const g = dukkanGorunumu();
            if (g && ilkSatis.kontrol(g.ilkSatisT)) bildir(dukkanMetni("dukkan.D8.ilk_satis"), "bilgi");
          },
        },
        f,
      );
    },
  };
}
