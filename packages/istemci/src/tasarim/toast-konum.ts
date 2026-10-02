/**
 * Toast konumu (görsel kimlik §5.3; B-tost kararı).
 *  - MASAÜSTÜ (> 820 px): toast sabit köşededir: üst çubuğun altında sağda, panelin solunda (CSS: `#bildirimler`). Haritanın
 *    etkileşim alanına ve kartların üstüne inmez; kart izleme yoktur. Yalnız sağ üstteki parsel kartı varsa onun altına iner.
 *  - TELEFON (<= 820 px): toast, açık bir kartın ya da alt çubuğun 12 px ÜSTÜNE oturur; altındakini örtmez. Ölçülen şey kartın
 *    gerçek üst kenarıdır (kart yüksekliği içeriğe göre değişir). Aynı anda tek toast ve tek satır (CSS).
 * Engel yoksa CSS'teki varsayılan konum geçerlidir. Toast metni kısaltılsa da tam metin `title` ve `aria-label`'dadır.
 * Kabuk ile harita yığını ayrı paketlerdir; bu modül ikisinde de kopyalanır ve yalnız DOM'u okur: kendi durumu yoktur,
 * zamanlayıcı kapta tutulur, kopya çalışsa da aynı sonucu verir.
 */

/** Toast ile engel arasındaki boşluk (px). */
export const TOAST_ARALIK = 12;

/**
 * Altına inilmemesi gereken yüzeyler: yapı maliyet kartı, satın alma alt çubuğu, parsel kartı, telefonda açık İşletmem alt
 * sayfası (`body.isletme-acik`; öbür kiplerde panelin kendi konum kuralları vardır, CSS) ve telefonda gezgin sütununun altındaki
 * "geri alma" şeridi (`#yapi-geri`: alt sayfanın peek kenarına yakın durur, toast onun üstüne binmesin; toast şeridin 12 px üstüne oturur).
 */
const ENGELLER = ["#yapi-kart", "#harita-alt", "#parsel-kart", "#yapi-geri", "#panel"];

function gorunur(e: HTMLElement): boolean {
  if (e.hidden) return false;
  const s = getComputedStyle(e);
  return s.display !== "none" && s.visibility !== "hidden";
}

/** Kapsayıcının alt kenarından, en yakın engelin üstüne kadar olan mesafe (px); engel yoksa null. */
export function toastAlt(kap: HTMLElement): number | null {
  if (document.body.classList.contains("yuru-acik") || masaustu()) return null; // yürüyüşün kendi düzeni var (yuru.css); masaüstünde sabit köşe
  const ata = (kap.offsetParent as HTMLElement | null) ?? document.body;
  const a = ata.getBoundingClientRect();
  const k = kap.getBoundingClientRect();
  let ust = Infinity;
  for (const sec of ENGELLER) {
    if (sec === "#panel" && !document.body.classList.contains("isletme-acik")) continue;
    const e = document.querySelector<HTMLElement>(sec);
    if (!e || !gorunur(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.height < 1 || r.width < 1) continue;
    // Yan yana duran (örneğin masaüstünde sağdaki panel) engel toast'ı örtmez
    if (r.right <= k.left || r.left >= k.right) continue;
    // Ekranın dışındaki (kapalı alt sayfa gibi) engel sayılmaz
    if (r.top >= a.bottom - 8) continue;
    ust = Math.min(ust, r.top);
  }
  return Number.isFinite(ust) ? Math.max(0, Math.round(a.bottom - ust + TOAST_ARALIK)) : null;
}

/** Masaüstü düzeni (panel yanda, toast sağ üst köşede); `stil.css` ile aynı eşik. */
export function masaustu(): boolean {
  return window.matchMedia("(min-width: 821px)").matches;
}

/** Masaüstünde sağ üstteki parsel kartı açıksa toast'ın `top` değeri (kartın altı + 12 px); yoksa null (CSS varsayılanı). */
export function toastUst(kap: HTMLElement): number | null {
  if (document.body.classList.contains("yuru-acik") || !masaustu()) return null;
  const e = document.querySelector<HTMLElement>("#parsel-kart");
  if (!e || !gorunur(e)) return null;
  const r = e.getBoundingClientRect();
  const a = ((kap.offsetParent as HTMLElement | null) ?? document.body).getBoundingClientRect();
  return r.height < 1 ? null : Math.max(0, Math.round(r.bottom - a.top + TOAST_ARALIK));
}

/** Kısaltılan (tek satır) toast'ın tam metni `title` ve `aria-label`'da da bulunur. */
function tamMetin(kap: HTMLElement): void {
  for (const t of kap.querySelectorAll<HTMLElement>(".bildirim:not([title])")) {
    const m = t.querySelector("span")?.textContent ?? "";
    t.title = m;
    t.setAttribute("aria-label", m);
  }
}

/** Kapsayıcının `bottom` (telefon) ve `top` (masaüstü, parsel kartı varsa) değerini ayarlar; engel yoksa satır içi değerleri kaldırır. */
export function bildirimKonumla(kap: HTMLElement): void {
  tamMetin(kap);
  const b = toastAlt(kap);
  if (b === null) kap.style.removeProperty("bottom");
  else kap.style.bottom = `${b}px`;
  const u = toastUst(kap);
  if (u === null) kap.style.removeProperty("top");
  else kap.style.top = `${u}px`;
}

/** Toast varken konumu 200 ms'de bir yeniler (kart toast'tan sonra açılıp kapanabilir); toast kalmayınca durur. */
export function bildirimKonumIzle(kap: HTMLElement): void {
  bildirimKonumla(kap);
  if (kap.dataset["konumIzle"]) return;
  kap.dataset["konumIzle"] = "1";
  const z = window.setInterval(() => {
    if (kap.childElementCount === 0) {
      window.clearInterval(z);
      delete kap.dataset["konumIzle"];
      kap.style.removeProperty("bottom");
      kap.style.removeProperty("top");
      return;
    }
    bildirimKonumla(kap);
  }, 200);
}
