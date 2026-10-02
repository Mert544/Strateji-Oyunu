/**
 * Kısa bildirimler (toast). Kural: toast oyuncunun kendi eyleminin sonucu içindir (komut sonucu, form hatası); tek istisna kendi inşaatının bitişidir
 * (nötr bilgi: "Gebze: Çiftlik hazır.", Dikkat maddesiyle aynı cümle; mulk-panel.ts `insaatBittiMetni`, bir yapı için bir kez). Başka her olay (savaş ilanı,
 * iklim uyarısı) "Bildirimler" gelen kutusuna düşer (arayuz/gelen-kutusu.ts) ve açılır pencere olarak gösterilmez.
 *
 * Aynı anda DOM'da yalnız BİR bildirim vardır (masaüstünde de; A5); gerisi `BildirimKuyrugu`nda bekler, süreleri görünür olunca başlar,
 * hata öne geçer, Defter bildirimleri birleşir (bildirim-kuyrugu.ts). İşi süren işlemin ("… kuruluyor") bildirimi `bilgi` türündedir;
 * başarı simgesi (`tamam`) yalnız biten işin bildirimidir.
 */
import { ikon } from "../tasarim/ikon";
import { bildirimKonumIzle } from "../tasarim/toast-konum";
import { BildirimKuyrugu } from "./bildirim-kuyrugu";
import type { BildirimOgesi, BildirimTuru, Cizici, GrupBilgisi } from "./bildirim-kuyrugu";

export type { BildirimTuru, GrupBilgisi } from "./bildirim-kuyrugu";

export interface BildirimSecenegi {
  /** Aynı gruptan (ör. Defter) yakın zamanda gelenler tek bildirimde birleşir. */
  grup?: GrupBilgisi;
}

/** Süre çarpanı (yalnızca otomatik sınama içindir: yavaş ortamda ekran görüntüsü alınırken bildirim kaybolmasın). */
const carpan = (): number => (window as unknown as { __bildirimCarpan?: number }).__bildirimCarpan ?? 1;

interface Tutamac {
  el: HTMLElement;
  metin: HTMLElement;
}

function bildirimiKur(oge: BildirimOgesi, kapat: () => void): Tutamac {
  const d = document.createElement("div");
  d.className = `bildirim ${oge.tur}`;
  d.setAttribute("role", oge.tur === "hata" ? "alert" : "status");
  const simge = document.createElement("b");
  simge.innerHTML = ikon(oge.tur === "tamam" ? "circle-check" : oge.tur === "hata" ? "circle-alert" : "info", 20);
  simge.setAttribute("aria-hidden", "true");
  const metin = document.createElement("span");
  metin.textContent = oge.mesaj;
  const kapatDugme = document.createElement("button");
  kapatDugme.type = "button";
  kapatDugme.className = "bildirim-kapat";
  kapatDugme.setAttribute("aria-label", "Kapat");
  kapatDugme.innerHTML = ikon("x", 18);
  d.append(simge, metin, kapatDugme);
  // Toast haritadaki fare ve dokunma olaylarını yutmaz (CSS: pointer-events none); yalnız bu düğme tıklanır
  kapatDugme.addEventListener("click", kapat);
  return { el: d, metin };
}

const cizici: Cizici<Tutamac> = {
  goster(oge) {
    const kap = document.getElementById("bildirimler");
    const t = bildirimiKur(oge, () => kuyruk().kapatGorunen());
    if (kap) {
      kap.append(t.el);
      bildirimKonumIzle(kap); // açık kartın/alt çubuğun 12 px üstüne oturur (görsel kimlik §5.3)
    }
    return t;
  },
  guncelle(t, oge) {
    t.metin.textContent = oge.mesaj;
  },
  kapat(t, bitti) {
    t.el.classList.add("gidiyor");
    window.setTimeout(() => {
      t.el.remove();
      bitti();
    }, 220);
  },
};

let ornek: BildirimKuyrugu<Tutamac> | null = null;
function kuyruk(): BildirimKuyrugu<Tutamac> {
  ornek ??= new BildirimKuyrugu<Tutamac>({
    cizici,
    simdi: () => performance.now(),
    zamanla: (f, ms) => {
      const id = window.setTimeout(f, ms);
      return () => window.clearTimeout(id);
    },
    sure: (tur) => (tur === "hata" ? 8000 : 4500) * carpan(),
  });
  return ornek;
}

export function bildir(mesaj: string, tur: BildirimTuru = "bilgi", secenek: BildirimSecenegi = {}): void {
  if (!document.getElementById("bildirimler")) return;
  kuyruk().ekle({ mesaj, tur, ...(secenek.grup ? { grup: secenek.grup } : {}) });
}
