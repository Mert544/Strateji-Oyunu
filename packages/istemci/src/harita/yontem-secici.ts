/**
 * Yöntem seçici (saf; DOM yok): yapı türünün yöntem listesi İÇERİKTEN okunur (`tesisTurleri[].yontemler`; mülk kipinde süzgeç yok, elle liste yok), kart HTML'i (T1 sözleşmesi
 * L. Ek: `fieldset.ym-secici` > `div.ym-liste[role=radiogroup]` > `button.ym-kart[role=radio]`), klavye (roving tabindex, ok tuşları, Home/End, Boşluk/Enter) ve seçim kuralı.
 *
 * Kurallar (Tasarım + Ar-Ge + Kod lideri):
 *   - Tür tek yöntemliyse seçici HİÇ gösterilmez; yöntem sessizce kullanılır (komuta `yontem` yazılmaz: bugünkü davranış).
 *   - Çok yöntemli türde VARSAYILAN SEÇİM YOK: "Kur" seçim yapılana dek `aria-disabled` ("Bir yöntem seç."). Tek istisna: SEÇİLEBİLİR (teknolojisi açık) yöntem tek ise o
 *     seçili gelir (sessiz varsayılanın gizleyeceği alternatif yok; diğerleri kilitli kartlardır).
 *   - İçerikte etkin her yöntem görünür; teknolojisi açılmamış olanlar soluk (`aria-disabled`) ve nedenli.
 *   - Şebeke gideri kartta TAHMİNİDİR (yöntem girdisi x şebeke birim fiyatı, S ölçek, tam kapasite; `sebeke-gider.ts`).
 */
import { esc, fmt, paraMili } from "../arayuz/bicim";
import { icerikMetni } from "../tasarim/icerik-metin";
import { ikon } from "../tasarim/ikon";
import type { IkonAdi } from "../tasarim/ikon";
import { yontemSimgesi } from "../tasarim/yontem";
import type { Icerik, MalMiktar } from "../komut/tablo";
import { yontemSebekeGideri, yontemSebekeMalliMi } from "./sebeke-gider";
import type { SebekeFiyatlari } from "./sebeke-gider";
import { yontemMetni } from "./yontem-metin";

/** Ekmek zinciri notu (A1 `yontem.secici.zincir_not`) bu yöntemlerde gösterilir; metin ekmeğe özgüdür. */
const ZINCIR_YONTEMLERI: ReadonlySet<string> = new Set(["degirmen", "ekmek_firini"]);

export interface YontemSecenegi {
  id: string;
  ad: string;
  /** Hazır liste: "200 tahıl · 12 elektrik" (girdi miktarı YUKARI yuvarlı; mal adı sözlükten). Girdisizse boş. */
  girdi: string;
  /** Hazır liste: "165 un · 33 kepek" (çıktı AŞAĞI yuvarlı). */
  cikti: string;
  /** Tarım tesisinde çıktı toprağa ve iklime göre değişir (A1 `yontem.secici.degisir`). */
  tarimsal: boolean;
  /** Simge adı (eşlemesi olmayan yöntemde null: `.ym-simge` yazılmaz). */
  simge: string | null;
  /** Gereken teknoloji (kimlik ve ad) ve oyuncuda açık değilse `kilitli`. */
  teknoloji?: { id: string; ad: string };
  kilitli: boolean;
  /** Tahmini şebeke gideri (mili-₺/saat; S ölçek, tam kapasite); şebeke malı girdisi yoksa tanımsız (satır çıkmaz). */
  giderMili?: number;
  /** Girdisinde şebeke malı (elektrik, yakıt) var. */
  sebekeli: boolean;
  aciklama?: string;
  ipucu?: string;
}

export interface SeciciBaglami {
  /** Teknoloji kimliği oyuncuda açık mı (araştırılmış). */
  acik: (teknolojiId: string) => boolean;
  /** Şebeke fiyatları; şebeke yoksa null (gider satırı çıkmaz). */
  sebeke: SebekeFiyatlari | null;
}

function liste(ic: Icerik, kalemler: MalMiktar, yukari: boolean): string {
  return kalemler
    .map(([mi, miktar]) => `${fmt(yukari ? Math.ceil(miktar / 1000) : Math.floor(miktar / 1000))} ${(ic.mallar[mi]?.ad ?? String(mi)).toLocaleLowerCase("tr")}`)
    .join(" · ");
}

/** Yapı türünün yöntemleri (içerikteki sırayla; `tesisTurleri[].yontemler`); tür bilinmiyorsa boş. */
export function yontemSecenekleri(ic: Icerik, turId: string, b: SeciciBaglami): YontemSecenegi[] {
  const tur = ic.turler[ic.turIdx[turId] ?? -1];
  if (!tur) return [];
  const sonuc: YontemSecenegi[] = [];
  for (const yi of tur.yontemler) {
    const y = ic.yontemler[yi];
    if (!y) continue;
    const tk = y.gerekliTeknoloji;
    const m = icerikMetni("yontem", y.id);
    const sebekeli = yontemSebekeMalliMi(ic, b.sebeke, y.id);
    const gider = sebekeli ? yontemSebekeGideri(ic, b.sebeke, y.id) : 0;
    const t: YontemSecenegi = {
      id: y.id,
      ad: y.ad,
      girdi: liste(ic, y.girdi, true),
      cikti: liste(ic, y.cikti, false),
      tarimsal: tur.tarimTesisi,
      simge: yontemSimgesi(y.id),
      kilitli: tk !== undefined && !b.acik(tk),
      sebekeli,
    };
    if (tk !== undefined) t.teknoloji = { id: tk, ad: ic.teknolojiler[ic.teknolojiIdx[tk] ?? -1]?.ad ?? tk };
    if (gider > 0) t.giderMili = gider;
    if (m?.aciklama) t.aciklama = m.aciklama;
    if (m?.ipucu) t.ipucu = m.ipucu;
    sonuc.push(t);
  }
  return sonuc;
}

/** Seçici gösterilir mi: türün BİRDEN ÇOK yöntemi var (tek yöntemli türde hiç gösterilmez). */
export function seciciGorunur(sec: readonly YontemSecenegi[]): boolean {
  return sec.length >= 2;
}

/** Seçici gösteriliyorsa ve seçilebilir (kilitsiz) yöntem TEK ise o; yoksa null (varsayılan seçim yok). */
export function tekSecilebilir(sec: readonly YontemSecenegi[]): YontemSecenegi | null {
  const a = sec.filter((s) => !s.kilitli);
  return seciciGorunur(sec) && a.length === 1 ? (a[0] as YontemSecenegi) : null;
}

/**
 * Komuta yazılacak yöntem: seçici gösterilmiyorsa ya da seçilen TÜR VARSAYILANI ise (içerikteki ilk yöntem; çekirdekte `yontemler[0]`) tanımsız: alan yazılmaz, bugünkü
 * davranış ve sonuç aynıdır. Varsayılandan farklı seçimde (değirmen, fırın...) seçilen kimlik.
 */
export function komutYontemi(sec: readonly YontemSecenegi[], secili: string | null): string | undefined {
  if (!seciciGorunur(sec) || secili === null || secili === sec[0]?.id) return undefined;
  return secili;
}

/** "Kur" açık mı: seçici gösterilmiyorsa evet; gösteriliyorsa seçilmiş ve seçilen kilitsiz olmalı. */
export function yontemSecimiTamam(sec: readonly YontemSecenegi[], secili: string | null): boolean {
  if (!seciciGorunur(sec)) return true;
  const s = sec.find((x) => x.id === secili);
  return s !== undefined && !s.kilitli;
}

/**
 * Yapı kartındaki onay ("... kur") düğmesi açık mı: plan geçerli, YER SABİTLENMİŞ (tıklandı/dokunuldu), gönderim sürmüyor ve yöntem seçimi tamam.
 * Dört koşuldan biri eksikse düğme kapalı kalır; kartın yazdığı neden ayrıca gösterilir (yer sabit değilse "Yeri sabitlemek için tıkla.").
 */
export function onayAcik(k: { gecerli: boolean; sabit: boolean; uygulaniyor: boolean; yontemTamam: boolean }): boolean {
  return k.gecerli && k.sabit && !k.uygulaniyor && k.yontemTamam;
}

export interface SeciciGirdisi {
  /** Yapı türü adı ("Gıda fabrikası"). */
  yapiAd: string;
  secenekler: readonly YontemSecenegi[];
  /** Seçili yöntem kimliği; yok = null. */
  secili: string | null;
  /** "Yöntemi değiştir"de tesisin şimdiki yöntemi (kartta `aria-current`); yapı kurarken tanımsız. */
  mevcut?: string;
  /** Gönderim sürerken ya da onay açıkken seçim kilitli (`aria-disabled`). */
  kilitli?: boolean;
  /** Kimlik eki (aynı sayfada birden çok seçici: `aria-labelledby` çakışmasın). */
  kimlik: string;
  /** Başlık (varsayılan: "{yapi} ne yapsın?"); "Yöntemi değiştir" bunu kendi başlığıyla verir. */
  baslik?: string;
}

function kart(s: YontemSecenegi, g: SeciciGirdisi, tab: string | null): string {
  const secili = g.secili === s.id;
  const durum = secili ? "secili" : s.kilitli ? "kapali" : "acik";
  const ozet = yontemMetni("yontem.secici.ozet", { girdi: s.girdi !== "" ? s.girdi : yontemMetni("yontem.secici.girdisiz"), cikti: s.cikti });
  const kilit = s.kilitli || g.kilitli === true;
  const simge = s.simge !== null ? `<span class="ym-simge">${ikon(s.simge as IkonAdi, 20)}</span>` : "";
  const isaret = secili ? `<span class="ym-isaret">${ikon("check", 14)}${esc(yontemMetni("yontem.secici.secili"))}</span>` : "";
  const gider = s.giderMili !== undefined ? `<span class="ym-satir ym-gider">${esc(yontemMetni("yontem.secici.gider", { gider: paraMili(s.giderMili, "yukari") }))}</span>` : "";
  const neden = s.kilitli ? `<span class="ym-satir ym-neden">${esc(yontemMetni("yontem.secici.teknoloji"))}</span>` : "";
  return `<button type="button" class="ym-kart" role="radio" data-yontem="${esc(s.id)}" data-durum="${durum}" aria-checked="${secili}"${kilit ? ` aria-disabled="true"` : ""}${g.mevcut === s.id ? ` aria-current="true"` : ""} tabindex="${tab === s.id ? 0 : -1}">${simge}<span class="ym-ad">${esc(s.ad)}</span>${isaret}<span class="ym-satir ym-ozet">${esc(ozet)}</span>${gider}${neden}</button>`;
}

/** Seçilen yöntemin altındaki durum satırı: seçim yoksa "Bir yöntem seç."; varsa ipucu (T3), şebeke ve zincir notları, tarım notu; son satır "ücret yok" (alt). */
export function seciciNotu(g: Pick<SeciciGirdisi, "secenekler" | "secili">): string {
  const s = g.secenekler.find((x) => x.id === g.secili);
  const satirlar: string[] = [];
  if (!s) satirlar.push(yontemMetni("yontem.secici.sec"));
  else {
    if (s.ipucu) satirlar.push(s.ipucu);
    if (s.tarimsal) satirlar.push(yontemMetni("yontem.secici.degisir"));
    if (s.sebekeli) satirlar.push(yontemMetni("yontem.secici.sebeke_not"));
    if (ZINCIR_YONTEMLERI.has(s.id)) satirlar.push(yontemMetni("yontem.secici.zincir_not"));
  }
  satirlar.push(yontemMetni("yontem.secici.alt"));
  return satirlar.map(esc).join("<br>");
}

/** Roving tabindex durağı: seçili (kilitsiz) kart, yoksa ilk kilitsiz kart. */
function tabDuragi(sec: readonly YontemSecenegi[], secili: string | null): string | null {
  const s = sec.find((x) => x.id === secili && !x.kilitli);
  return s?.id ?? sec.find((x) => !x.kilitli)?.id ?? null;
}

/** Seçici HTML'i (T1 L.1). Seçici gösterilmiyorsa (tek yöntem) boş dize. */
export function yontemSeciciHtml(g: SeciciGirdisi): string {
  if (!seciciGorunur(g.secenekler)) return "";
  const tab = tabDuragi(g.secenekler, g.secili);
  const baslikId = `ym-baslik-${esc(g.kimlik)}`;
  const baslik = g.baslik ?? yontemMetni("yontem.secici.baslik", { yapi: g.yapiAd });
  return `<fieldset class="ym-secici" data-ym="secici"><legend class="ym-baslik" id="${baslikId}">${esc(baslik)}</legend><div class="ym-liste" role="radiogroup" aria-labelledby="${baslikId}">${g.secenekler.map((s) => kart(s, g, tab)).join("")}</div><p class="ym-not" role="status">${seciciNotu(g)}</p></fieldset>`;
}

/**
 * Klavye (radio davranışı): ← ↑ önceki, → ↓ sonraki (kilitli kart atlanır, uçta başa/sona sarar), Home/End ilk/son kilitsiz, Boşluk/Enter odaktaki kartı seçer.
 * Dönüş: seçilecek (odağın taşınacağı) yöntem kimliği; ilgisiz tuşta ya da seçilebilir kart yoksa null. `odak`: şimdi odakta olan kartın kimliği (yoksa seçili).
 */
export function seciciTusu(tus: string, sec: readonly YontemSecenegi[], odak: string | null): string | null {
  const acik = sec.filter((s) => !s.kilitli);
  if (acik.length === 0) return null;
  const i = acik.findIndex((s) => s.id === odak);
  switch (tus) {
    case "ArrowRight":
    case "ArrowDown":
      return (acik[(i + 1) % acik.length] as YontemSecenegi).id;
    case "ArrowLeft":
    case "ArrowUp":
      return (acik[i <= 0 ? acik.length - 1 : i - 1] as YontemSecenegi).id;
    case "Home":
      return (acik[0] as YontemSecenegi).id;
    case "End":
      return (acik[acik.length - 1] as YontemSecenegi).id;
    case " ":
    case "Spacebar":
    case "Enter":
      return i >= 0 ? (acik[i] as YontemSecenegi).id : null;
    default:
      return null;
  }
}
