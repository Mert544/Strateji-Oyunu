/** Kısa bildirimler (toast): komut sonucu gibi geçici iletiler. */
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
  simge.textContent = tur === "tamam" ? "✓" : tur === "hata" ? "!" : "i";
  simge.setAttribute("aria-hidden", "true");
  const metin = document.createElement("span");
  metin.textContent = mesaj;
  d.append(simge, metin);
  const kapat = (): void => {
    d.classList.add("gidiyor");
    window.setTimeout(() => d.remove(), 220);
  };
  d.addEventListener("click", kapat);
  kap.append(d);
  while (kap.childElementCount > EN_COK) kap.firstElementChild?.remove();
  window.setTimeout(kapat, (tur === "hata" ? 8000 : 4500) * carpan());
}
