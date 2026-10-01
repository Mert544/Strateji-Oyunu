/**
 * Toast konumu (görsel kimlik §5.3): bildirim, açık bir kartın ya da alt çubuğun 12 px ÜSTÜNE oturur; altındakini örtmez.
 * Ölçülen şey kartın gerçek üst kenarıdır (kart yüksekliği içeriğe göre değişir; sabit `bottom` değeri maliyet kartında
 * "Arsa" satırını örtüyordu). Engel yoksa CSS'teki varsayılan konum geçerlidir (`#bildirimler { bottom }`).
 * Kabuk ile harita yığını ayrı paketlerdir; bu modül ikisinde de kopyalanır ve yalnız DOM'u okur: kendi durumu yoktur,
 * zamanlayıcı kapta tutulur, kopya çalışsa da aynı sonucu verir.
 */

/** Toast ile engel arasındaki boşluk (px). */
export const TOAST_ARALIK = 12;

/**
 * Altına inilmemesi gereken yüzeyler: yapı maliyet kartı, satın alma alt çubuğu, parsel kartı ve telefonda açık İşletmem alt
 * sayfası (`body.isletme-acik`; öbür kiplerde panelin kendi konum kuralları vardır, CSS).
 */
const ENGELLER = ["#yapi-kart", "#harita-alt", "#parsel-kart", "#panel"];

function gorunur(e: HTMLElement): boolean {
  if (e.hidden) return false;
  const s = getComputedStyle(e);
  return s.display !== "none" && s.visibility !== "hidden";
}

/** Kapsayıcının alt kenarından, en yakın engelin üstüne kadar olan mesafe (px); engel yoksa null. */
export function toastAlt(kap: HTMLElement): number | null {
  if (document.body.classList.contains("yuru-acik")) return null; // yürüyüşün kendi düzeni var (yuru.css)
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

/** Kapsayıcının `bottom` değerini engele göre ayarlar (engel yoksa satır içi değeri kaldırır). */
export function bildirimKonumla(kap: HTMLElement): void {
  const b = toastAlt(kap);
  if (b === null) kap.style.removeProperty("bottom");
  else kap.style.bottom = `${b}px`;
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
      return;
    }
    bildirimKonumla(kap);
  }, 200);
}
