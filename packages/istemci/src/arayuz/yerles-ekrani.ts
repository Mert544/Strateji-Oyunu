/**
 * Yerleş ekranı (F4, ilk giriş): "Mahallende ya da seçtiğin yerde başla." Üç önerilen ilçe (doluluk, imza ürün uyumu, ayrılmış
 * hücre) ve açılış önerisi (Tarım / Sanayi / Pazar). Açılış bir SINIF DEĞİL, sonradan değiştirilebilir bir öneridir.
 * Seçimden sonra harita ilçeye ve önerilen hazır arsaya uçar (denetçi `git`).
 *
 * Mantık saftır (`harita/yerles.ts`); bu dosya yalnız arayüzdür. Mülk kipinde (sunucu bağlıyken) açılışta gösterilir; eski
 * "Devlet seç" akışı mülk kipinde gösterilmez (bölge kipinde kalır).
 */
import { esc, yuzde } from "./bicim";
import type { MulkBaglantisi } from "../harita/baglanti";
import { acilisMetni, bilinenYaniSatiri, ilceMetni, ilceNedeni, nufusMetni } from "../tasarim/ilce-metin";
import izgaraManifesti from "../../../veri/haritalar/odbl/izgara/manifest.json";
import type { DukkanDuzeyi } from "../tasarim/ilce-metin";
import { ACILIS, ACILIS_SIRASI, ayrilmisDurumu, durumRozeti, YERLES_ADAYLARI, yerlesOner } from "../harita/yerles";
import type { Acilis, AdayDurumu } from "../harita/yerles";
import { izgaraVarMi } from "../harita/veri";
import type { Hiyerarsi } from "../harita/veri";
import { yerlesMetni, yerlesMetniHtml } from "./yerles-metin";

export interface YerlesGirdisi {
  /** Ekranın ekleneceği kap (sahne kabı). */
  kap: HTMLElement;
  baglanti: MulkBaglantisi;
  hiyerarsi: Hiyerarsi;
  /** Seçilen ilçeye git: harita ilçeyi açar; ızgaralıysa önerilen hazır arsaya uçar. */
  git: (ilce: string, acilis: Acilis, oneriYapi: string) => Promise<void>;
  /** Ekran kapandığında. */
  kapandi?: () => void;
  /** Yapının ayak izi (hücre; kataloğdan). Verilmezse 1. */
  yuva?: (yapi: string) => number;
  /** Dükkân düzeyi (G7: dükkân açık, G8: cam ve pencere açık); ilçe sözlüğü metinleri buna göre seçilir. Verilmezse G6 (dükkân yok). */
  dukkanDuzeyi?: () => DukkanDuzeyi;
  /** Mevcut içerik/araştırmadan doğrulanan üretim örnekleri; konumda kurulum garantisi değildir. */
  uretimMetni?: (acilis: Acilis) => string;
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
        ayrilmis: sh?.ayrilmisAdet ?? null,
        ayakIzi: g.yuva?.(ACILIS[aday.acilis].yapi) ?? 1,
        izgara: izgaraVarMi(aday.ilce),
        sunucuda: sh ? true : (b.ilceVarMi?.(aday.ilce) ?? null),
      };
    }),
  );
  return sonuc;
}

/** İlçenin açılış önerisi: sözlükteki öneri (T3), yoksa adayın küratörlü açılışı. */
export const yerlesOnerisi = (d: Pick<AdayDurumu, "aday">): Acilis => ilceMetni(d.aday.ilce)?.oneri ?? d.aday.acilis;

/**
 * İlçe kartı (sözleşme H.1; SAF dizge). Sıra: ad, neden, bilinen yanı, açılış, doluluk, ayrılmış hücre, rozet. Satır yoksa hiç yazılmaz
 * (boş yer yok): sözlükte olmayan ilçede neden ve bilinen yanı, ızgarasız ilçede doluluk, bilinmeyen ayrılmışta ayrılmış satırı.
 */
export function yerlesKartiHtml(d: AdayDurumu, secili: boolean, duzey: DukkanDuzeyi = {}, uretim?: string): string {
  const yog = d.doluluk;
  const neden = ilceNedeni(d.aday.ilce, duzey);
  const bilinen = bilinenYaniSatiri(d.aday.ilce);
  const oneri = yerlesOnerisi(d);
  const nufus = nufusMetni(izgaraManifesti.ilceler.find((i) => i.kimlik === d.aday.ilce)?.nufus);
  const doluluk = !d.izgara
    ? ""
    : yog === null
      ? `<span class="yr-doluluk yok">${esc(yerlesMetni("yerles.kart.doluluk_yok"))}</span>`
      : `<span class="yr-doluluk"><span class="yr-cubuk" aria-hidden="true"><i style="width:${yog > 0 ? Math.max(2, Math.round(yog * 100)) : 0}%"></i></span>${yerlesMetniHtml("yerles.kart.doluluk", { yuzde: `<b>${esc(yuzde(yog * 100, yog < 0.1 ? 1 : 0))}</b>` })}</span>`;
  const ay = ayrilmisDurumu(d);
  const ayrilmis = ay === null ? "" : `<span class="yr-ayrilmis">${esc(yerlesMetni(`yerles.kart.ayrilmis_${ay}`))}</span>`;
  const rozet = durumRozeti(d);
  return `<button type="button" class="yr-kart" role="radio" aria-checked="${secili}" data-ilce="${esc(d.aday.ilce)}">
      <span class="yr-ad">${esc(d.ad)} <small>${esc(d.il)}</small></span>
      ${nufus ? `<span class="yr-neden">${esc(yerlesMetni("yerles.kart.nufus", { n: nufus }))}</span>` : ""}
      ${neden ? `<span class="yr-neden">${esc(neden)}</span>` : ""}
      ${bilinen ? `<span class="yr-imza">${esc(bilinen.etiket)}: ${esc(bilinen.deger)}</span>` : ""}
      <span class="yr-onerilen">${yerlesMetniHtml("yerles.kart.acilis", { ad: `<b>${esc(yerlesMetni(`yerles.acilis.${oneri}`))}</b>` })}</span>
      <span class="yr-onerilen">${esc(uretim ?? acilisMetni(oneri, duzey))}</span>
      ${doluluk}${ayrilmis}
      <span class="yr-durum ${rozet === "hazir" ? "iyi" : "zayif"}">${esc(yerlesMetni(`yerles.kart.${rozet}`))}</span>
    </button>`;
}

export async function yerlesAc(g: YerlesGirdisi): Promise<YerlesEkrani> {
  const kat = document.createElement("div");
  kat.id = "yerles";
  kat.setAttribute("role", "dialog");
  kat.setAttribute("aria-modal", "true");
  kat.setAttribute("aria-labelledby", "yerles-baslik");
  kat.innerHTML = `<div class="yr-kutu gir"><h1 id="yerles-baslik">${esc(yerlesMetni("yerles.baslik"))}</h1><p class="yr-alt">${esc(yerlesMetni("yerles.hazirlaniyor"))}</p></div>`;
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

  const duzey = (): DukkanDuzeyi => g.dukkanDuzeyi?.() ?? {};
  const kartHtml = (d: AdayDurumu): string => yerlesKartiHtml(d, d.aday.ilce === secili, duzey(), g.uretimMetni?.(yerlesOnerisi(d)));

  // Giriş hareketi yalnız "hazırlanıyor" kutusunda (.gir): seçim değişince kutu yeniden çizilir ama yeniden belirmez
  const ciz = (hata = ""): void => {
    const sd = gorunen.find((d) => d.aday.ilce === secili) ?? gorunen[0];
    const hazir = !!sd?.izgara && sd.sunucuda !== false;
    kat.innerHTML = `<div class="yr-kutu">
      <h1 id="yerles-baslik">${esc(yerlesMetni("yerles.baslik"))}</h1>
      <p class="yr-alt">${esc(yerlesMetni("yerles.alt"))}</p>
      <div class="yr-kartlar" role="radiogroup" aria-label="Önerilen ilçeler">${gorunen.map(kartHtml).join("")}</div>
      <fieldset class="yr-acilis">
        <legend>${esc(yerlesMetni("yerles.acilis.baslik"))}</legend>
        <div class="segment" role="group" aria-label="${esc(yerlesMetni("yerles.acilis.baslik"))}">
          ${ACILIS_SIRASI.map((a) => `<button type="button" data-acilis="${a}" aria-pressed="${a === acilis}" title="${esc(g.uretimMetni?.(a) ?? acilisMetni(a, duzey()))}">${esc(yerlesMetni(`yerles.acilis.${a}`))}</button>`).join("")}
        </div>
        <p class="yr-not">${esc(yerlesMetni("yerles.acilis.not"))}</p>
      </fieldset>
      ${hata ? `<p class="yr-hata" role="alert">${esc(hata)}</p>` : ""}
      <div class="yr-alt-satir">
        <button type="button" class="yr-ikincil" data-yr="baska">${esc(yerlesMetni("yerles.dugme.baska"))}</button>
        <button type="button" class="yr-ikincil" data-yr="atla">${esc(yerlesMetni("yerles.dugme.atla"))}</button>
        <button type="button" class="yr-birincil" data-yr="basla" ${mesgul ? "disabled" : ""}>${esc(yerlesMetni(mesgul ? "yerles.dugme.hazirlaniyor" : hazir ? "yerles.dugme.basla" : "yerles.dugme.izgara"))}</button>
      </div>
    </div>`;
  };

  const sec = (ilce: string): void => {
    secili = ilce;
    const d = gorunen.find((x) => x.aday.ilce === ilce);
    if (d) acilis = yerlesOnerisi(d);
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
