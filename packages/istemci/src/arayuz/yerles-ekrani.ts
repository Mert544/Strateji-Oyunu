/**
 * Yerleş ekranı (F4, ilk giriş): "Mahallende ya da seçtiğin yerde başla." Üç önerilen ilçe (doluluk, imza ürün uyumu, ayrılmış
 * hücre) ve açılış önerisi (Tarım / Sanayi / Pazar). Açılış bir SINIF DEĞİL, sonradan değiştirilebilir bir öneridir.
 * Seçimden sonra harita ilçeye ve önerilen hazır arsaya uçar (denetçi `git`).
 *
 * Mantık saftır (`harita/yerles.ts`); bu dosya yalnız arayüzdür. Mülk kipinde (sunucu bağlıyken) açılışta gösterilir; eski
 * "Devlet seç" akışı mülk kipinde gösterilmez (bölge kipinde kalır).
 */
import { esc, fmt, yuzde } from "./bicim";
import type { MulkBaglantisi } from "../harita/baglanti";
import { ACILIS, ACILIS_SIRASI, YERLES_ADAYLARI, yerlesOner } from "../harita/yerles";
import type { Acilis, AdayDurumu } from "../harita/yerles";
import { izgaraVarMi } from "../harita/veri";
import type { Hiyerarsi } from "../harita/veri";

export interface YerlesGirdisi {
  /** Ekranın ekleneceği kap (sahne kabı). */
  kap: HTMLElement;
  baglanti: MulkBaglantisi;
  hiyerarsi: Hiyerarsi;
  /** Seçilen ilçeye git: harita ilçeyi açar; ızgaralıysa önerilen hazır arsaya uçar. */
  git: (ilce: string, acilis: Acilis, oneriYapi: string) => Promise<void>;
  /** Ekran kapandığında. */
  kapandi?: () => void;
}

export interface YerlesEkrani {
  kapat(): void;
  /** Sınama kancası: görünen adayların ilçe kimlikleri. */
  adaylar(): string[];
}

/** Adayların durumunu sunucudan ve veriden toplar. */
async function durumlariTopla(g: YerlesGirdisi): Promise<AdayDurumu[]> {
  const b = g.baglanti;
  b.ilgi?.("yerles", YERLES_ADAYLARI.map((a) => a.ilce));
  const sonuc = await Promise.all(
    YERLES_ADAYLARI.map(async (aday): Promise<AdayDurumu> => {
      const c = g.hiyerarsi.ilceler.get(aday.ilce);
      const sh = await b.sahiplikAl(aday.ilce).catch(() => null);
      const il = c ? (g.hiyerarsi.iller.get(c.il)?.ad ?? "") : "";
      return {
        aday,
        ad: c?.ad ?? aday.ilce,
        il,
        doluluk: sh && sh.uygun > 0 ? sh.satilmis / sh.uygun : null,
        ayrilmis: sh ? Math.round(sh.uygun * 0.2) : null,
        izgara: izgaraVarMi(aday.ilce),
        sunucuda: sh ? true : (b.ilceVarMi?.(aday.ilce) ?? null),
      };
    }),
  );
  return sonuc;
}

export async function yerlesAc(g: YerlesGirdisi): Promise<YerlesEkrani> {
  const kat = document.createElement("div");
  kat.id = "yerles";
  kat.setAttribute("role", "dialog");
  kat.setAttribute("aria-modal", "true");
  kat.setAttribute("aria-labelledby", "yerles-baslik");
  kat.innerHTML = `<div class="yr-kutu gir"><h1 id="yerles-baslik">Nerede başlamak istersin?</h1><p class="yr-alt">Yerleşim yerleri hazırlanıyor…</p></div>`;
  g.kap.append(kat);
  document.body.classList.add("yerles-acik");

  const durumlar = await durumlariTopla(g);
  let kaydir = 0;
  let secili = "";
  let acilis: Acilis = "tarim";
  let mesgul = false;
  let gorunen: AdayDurumu[] = [];

  const kapat = (): void => {
    kat.remove();
    document.body.classList.remove("yerles-acik");
    g.kapandi?.();
  };

  const kartHtml = (d: AdayDurumu): string => {
    const yog = d.doluluk;
    const doluluk =
      yog === null
        ? `<span class="yr-doluluk yok">Doluluk bilinmiyor</span>`
        : `<span class="yr-doluluk"><span class="yr-cubuk" aria-hidden="true"><i style="width:${Math.max(2, Math.round(yog * 100))}%"></i></span><b>${esc(yuzde(yog * 100, yog < 0.1 ? 1 : 0))}</b> dolu</span>`;
    const ayrilmis = d.ayrilmis === null ? "" : `<span class="yr-ayrilmis">≈ ${fmt(d.ayrilmis)} hücre yeni oyunculara ayrılmış</span>`;
    const durum = !d.izgara ? `<span class="yr-durum zayif">Arsa ızgarası yakında: yalnız gezebilirsin</span>` : d.sunucuda === false ? `<span class="yr-durum zayif">Bu ilçe sunucuda henüz yok</span>` : `<span class="yr-durum iyi">Hazır arsalar var</span>`;
    return `<button type="button" class="yr-kart" role="radio" aria-checked="${d.aday.ilce === secili}" data-ilce="${esc(d.aday.ilce)}">
      <span class="yr-ad">${esc(d.ad)} <small>${esc(d.il)}</small></span>
      <span class="yr-imza">İmza: ${esc(d.aday.imza)}</span>
      ${doluluk}${ayrilmis}
      <span class="yr-neden">${esc(d.aday.neden)}</span>
      <span class="yr-onerilen">Açılış önerisi: <b>${esc(ACILIS[d.aday.acilis].ad)}</b></span>
      ${durum}
    </button>`;
  };

  // Giriş hareketi yalnız "hazırlanıyor" kutusunda (.gir): seçim değişince kutu yeniden çizilir ama yeniden belirmez
  const ciz = (hata = ""): void => {
    const sd = gorunen.find((d) => d.aday.ilce === secili) ?? gorunen[0];
    const hazir = !!sd?.izgara && sd.sunucuda !== false;
    kat.innerHTML = `<div class="yr-kutu">
      <h1 id="yerles-baslik">Nerede başlamak istersin?</h1>
      <p class="yr-alt">Mahallende ya da seçtiğin yerde başla. Sana üç ilçe önerdik: doluluğa, imza ürüne ve ayrılmış hücrelere göre.</p>
      <div class="yr-kartlar" role="radiogroup" aria-label="Önerilen ilçeler">${gorunen.map(kartHtml).join("")}</div>
      <fieldset class="yr-acilis">
        <legend>Açılış önerisi</legend>
        <div class="segment" role="group" aria-label="Açılış önerisi">
          ${ACILIS_SIRASI.map((a) => `<button type="button" data-acilis="${a}" aria-pressed="${a === acilis}" title="${esc(ACILIS[a].ozet)}">${esc(ACILIS[a].ad)}</button>`).join("")}
        </div>
        <p class="yr-not"><b>${esc(ACILIS[acilis].ad)}:</b> ${esc(ACILIS[acilis].ozet)}. Bu bir <b>sınıf değil</b>, yalnızca bir açılış önerisi: istediğin zaman fabrika kurar, ticarete geçer, başka yöne dönersin. Kilit yok; geçişin yalnızca ekonomik bir maliyeti olur.</p>
      </fieldset>
      ${hata ? `<p class="yr-hata" role="alert">${esc(hata)}</p>` : ""}
      <div class="yr-alt-satir">
        <button type="button" class="yr-ikincil" data-yr="baska">Başka ilçe öner</button>
        <button type="button" class="yr-ikincil" data-yr="atla">Şimdilik atla</button>
        <button type="button" class="yr-birincil" data-yr="basla" ${mesgul ? "disabled" : ""}>${mesgul ? "Hazırlanıyor…" : hazir ? "Burada başla" : "İlçeyi gez"}</button>
      </div>
    </div>`;
  };

  const sec = (ilce: string): void => {
    secili = ilce;
    const d = gorunen.find((x) => x.aday.ilce === ilce);
    if (d) acilis = d.aday.acilis;
  };

  const yenile = (): void => {
    gorunen = yerlesOner(durumlar, 3, kaydir);
    if (!gorunen.some((d) => d.aday.ilce === secili)) sec(gorunen[0]!.aday.ilce);
    ciz();
    (kat.querySelector(`.yr-kart[aria-checked="true"]`) as HTMLElement | null)?.focus();
  };

  kat.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const kart = t.closest(".yr-kart") as HTMLElement | null;
    if (kart?.dataset["ilce"]) {
      sec(kart.dataset["ilce"]);
      ciz();
      (kat.querySelector(`.yr-kart[aria-checked="true"]`) as HTMLElement | null)?.focus();
      return;
    }
    const a = t.closest("[data-acilis]") as HTMLElement | null;
    if (a?.dataset["acilis"]) {
      acilis = a.dataset["acilis"] as Acilis;
      ciz();
      return;
    }
    const y = (t.closest("[data-yr]") as HTMLElement | null)?.dataset["yr"];
    if (y === "baska") {
      kaydir++;
      yenile();
    } else if (y === "atla") kapat();
    else if (y === "basla" && !mesgul) void basla();
  });

  async function basla(): Promise<void> {
    mesgul = true;
    ciz();
    try {
      // Hesap dünyaya henüz katılmamışsa katılım (seçilen ilçe yurt için gönderilir); bağdaştırıcı desteklemiyorsa açık hata.
      const b = g.baglanti;
      if (b.ozet && b.ozet() === null) {
        if (!b.katil) throw new Error("Hesabın dünyaya henüz katılmamış; katılım için sunucu desteği gerekiyor.");
        const r = await b.katil(secili);
        if (!r.tamam) throw new Error(r.mesaj ?? "Dünyaya katılınamadı.");
      }
      await g.git(secili, acilis, ACILIS[acilis].yapi);
      kapat();
    } catch (e) {
      mesgul = false;
      ciz(e instanceof Error ? e.message : String(e));
    }
  }

  kat.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (!t.classList.contains("yr-kart")) return;
    const kartlar = [...kat.querySelectorAll<HTMLElement>(".yr-kart")];
    const i = kartlar.indexOf(t);
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const yeni = kartlar[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : kartlar.length - 1)) % kartlar.length];
      if (yeni?.dataset["ilce"]) {
        sec(yeni.dataset["ilce"]);
        ciz();
        (kat.querySelector(`.yr-kart[aria-checked="true"]`) as HTMLElement | null)?.focus();
      }
    }
  });

  yenile();
  return { kapat, adaylar: () => gorunen.map((d) => d.aday.ilce) };
}
