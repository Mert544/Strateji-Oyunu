/**
 * Kısa bildirimler (toast). Kural: toast YALNIZ oyuncunun kendi eyleminin sonucu içindir (komut sonucu, form
 * hatası). Başka her olay (savaş ilanı, biten inşaat, iklim uyarısı) "Bildirimler" gelen kutusuna düşer
 * (arayuz/gelen-kutusu.ts) ve açılır pencere olarak gösterilmez.
 */
import { ikon } from "../tasarim/ikon";
import { bildirimKonumIzle } from "../tasarim/toast-konum";

export type BildirimTuru = "tamam" | "hata" | "bilgi";

const EN_COK = 4;

/** Süre çarpanı (yalnızca otomatik sınama içindir: yavaş ortamda ekran görüntüsü alınırken bildirim kaybolmasın). */
const carpan = (): number => (window as unknown as { __bildirimCarpan?: number }).__bildirimCarpan ?? 1;

export function bildir(mesaj: string, tur: BildirimTuru = "bilgi"): void {
  const kap = document.getElementById("bildirimler");
  if (!kap) return;
  const d = document.createElement("div");
  d.className = `bildirim ${tur}`;
  d.setAttribute("role", tur === "hata" ? "alert" : "status");
  const simge = document.createElement("b");
  simge.innerHTML = ikon(tur === "tamam" ? "circle-check" : tur === "hata" ? "circle-alert" : "info", 20);
  simge.setAttribute("aria-hidden", "true");
  const metin = document.createElement("span");
  metin.textContent = mesaj;
  const kapatDugme = document.createElement("button");
  kapatDugme.type = "button";
  kapatDugme.className = "bildirim-kapat";
  kapatDugme.setAttribute("aria-label", "Kapat");
  kapatDugme.innerHTML = ikon("x", 18);
  d.append(simge, metin, kapatDugme);
  const kapat = (): void => {
    d.classList.add("gidiyor");
    window.setTimeout(() => d.remove(), 220);
  };
  // Toast haritadaki fare ve dokunma olaylarını yutmaz (CSS: pointer-events none); yalnız bu düğme tıklanır
  kapatDugme.addEventListener("click", kapat);
  kap.append(d);
  bildirimKonumIzle(kap); // açık kartın/alt çubuğun 12 px üstüne oturur (görsel kimlik §5.3)
  while (kap.childElementCount > EN_COK) kap.firstElementChild?.remove();
  window.setTimeout(kapat, (tur === "hata" ? 8000 : 4500) * carpan());
}
