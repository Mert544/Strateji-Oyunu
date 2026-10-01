/**
 * Mülk kipi paneli (harita yığınında; kabuk `arayuz/mulk-paneli.ts` sözleşmesiyle bağlar). Sahip kararı: devlet seçimi yok,
 * oyuncu bir ilçede arsa alarak başlar. Bu kipte panel oyuncunun işletmesini gösterir:
 *   - İşletmem: kimlik (ad ve amblem), yeni oyuncu kalkanı ve ayrılmış hücre hakkı, ilçe ilçe arsalar, yapılar, inşaatlar;
 *   - Hazine: hazine, net akış, arazi değeri ve tahakkuk eden arazi vergisi;
 *   - Mal: stok, üretim ve satış/alış;
 *   - Dikkat: yalnız oyuncunun kendi yapılarından: eksik girdi, boşta, inşaat bitti;
 *   - Olaylar: gerçek tarih ve iklim dönemi (hasat ritmi).
 * Bölge, Devlet ve Savaş sekmeleri yoktur; öneri motoru bölge kipine özgüdür (yerine "Rehber görevler yakında").
 * Veri bağdaştırıcının `isletme()` özetinden okunur (sunucu karesi ya da sahte bağdaştırıcı); burada hesap yoktur.
 */
import { esc, fmt, gercekTarih, sureMetni, tamTarihMetni, yuzde } from "../arayuz/bicim";
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
import mulkCss from "./mulk-panel.css?inline";

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
}

const sure = (ms: number): string => sureMetni(Math.max(0, ms) / SAAT);

/** Dikkat maddeleri (saf): yalnız oyuncunun kendi yapılarından. `bitenler`: bu oturumda biten inşaatlar (anahtar → bitiş). */
export function mulkDikkatMaddeleri(d: IsletmeDurumu, ad: MulkAdlari, bitenler: ReadonlyMap<string, { tur: string; ilce?: string; bitis: number }>): MulkDikkatMaddesi[] {
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
    const yer = b.ilce ? `${ad.ilce(b.ilce)}: ` : "";
    l.push({ tur: "bitti", baslik: `${yer}${ad.yapi(b.tur)} inşaatı bitti`, ayrinti: t - b.bitis >= SAAT ? `${sure(t - b.bitis)} önce` : "az önce", ...(b.ilce ? { ilce: b.ilce } : {}), sira: -b.bitis });
  }
  return l.sort((a, b) => TUR_SIRA[a.tur] - TUR_SIRA[b.tur] || a.sira - b.sira);
}

function gitDugmesi(ilce: string | undefined): string {
  return ilce ? `<button type="button" class="eylem" data-mulk-ilce="${esc(ilce)}" title="Haritada göster">${ikon("map-pin", 15)}Git</button>` : "";
}

/** Kalkan, ayrılmış hücre ve ilk yapı indirimi satırları (savaş dili yok). */
export function korumaSatirlari(d: IsletmeDurumu): string {
  const t = d.simZamani;
  const l: string[] = [];
  if (d.korumaBitis !== null && d.korumaBitis > t) l.push(`<li>${ikon("shield", 15)}<span><b>Yeni oyuncu kalkanı</b> · ${sure(d.korumaBitis - t)} kaldı<br><span class="soluk">Ticarette komisyon, tarife ve ihracat vergisi yok.</span></span></li>`);
  if (d.ayrilmisBitis !== null && d.ayrilmisBitis > t) l.push(`<li>${ikon("sprout", 15)}<span><b>Ayrılmış hücre hakkı</b> · ${sure(d.ayrilmisBitis - t)} kaldı<br><span class="soluk">Yeni oyunculara ayrılmış hücreleri alabilirsin.</span></span></li>`);
  if (d.indirimliYapiKalan !== null && d.indirimliYapiKalan > 0) l.push(`<li>${ikon("hammer", 15)}<span><b>İlk yapı indirimi</b> · ${fmt(d.indirimliYapiKalan)} yapı daha</span></li>`);
  return l.length ? `<ul class="mulk-koruma">${l.join("")}</ul>` : "";
}

function yapiDurumu(y: IsletmeYapisi, t: number): string {
  if (y.durum === "insaat") {
    const a = yapiAsamasi(y, t, SAAT);
    return `İnşaat · ${ASAMA_ADI[a]}${y.bitis !== undefined && y.bitis > t ? ` · ${sure(y.bitis - t)} kaldı` : ""}`;
  }
  if (y.aktif === false) return "Durdu";
  if (y.verimPpm !== undefined) return y.verimPpm > 0 ? `Çalışıyor · verim ${yuzde(Math.round(y.verimPpm / 10_000))}` : "Boşta";
  return "Tamam";
}

export function isletmePaneli(d: IsletmeDurumu | null, ben: { ad: string }, ad: MulkAdlari): string {
  if (!d) return `<p class="ipucu-metin">İşletme bilgisi yükleniyor…</p>`;
  const toplam = d.ilceHucre.reduce((s, [, n]) => s + n, 0);
  const ilk = [...ben.ad.trim()][0] ?? "?";
  let s = `<div class="mulk-kimlik"><span class="mulk-amblem" aria-hidden="true">${esc(ilk)}</span><div><b>${esc(ben.ad)}</b><span class="soluk">${toplam ? `${fmt(d.ilceHucre.length)} ilçede ${fmt(toplam)} hücre` : "Henüz arsan yok"}</span></div></div>`;
  s += korumaSatirlari(d);
  s += `<h3>Arsalarım</h3>`;
  if (!d.ilceHucre.length) s += `<div class="bos-durum">${ikon("map-pin", 28)}<p class="ipucu-metin">Henüz arsan yok. Bir ilçe seç, hazır arsalardan birini al.</p></div>`;
  else {
    s += `<ul class="mulk-liste">`;
    for (const [ilce, n] of d.ilceHucre) {
      const yapi = d.yapilar.filter((y) => y.ilce === ilce).length;
      s += `<li><span class="ml-ad"><b>${esc(ad.ilce(ilce))}</b><span class="soluk">${fmt(n)} hücre${yapi ? ` · ${fmt(yapi)} yapı` : ""}</span></span>${gitDugmesi(ilce)}</li>`;
    }
    s += `</ul>`;
  }
  s += `<h3>Yapılar</h3>`;
  const sirali = [...d.yapilar].sort((a, b) => (a.durum === b.durum ? 0 : a.durum === "insaat" ? -1 : 1) || (a.bitis ?? 0) - (b.bitis ?? 0));
  if (!sirali.length) s += `<p class="ipucu-metin">Henüz yapın yok. Haritada “Yapı kur” ile arsana ilk yapını yerleştir.</p>`;
  else {
    s += `<ul class="mulk-liste">`;
    for (const y of sirali) {
      const yer = y.ilce ? ad.ilce(y.ilce) : y.il ? ad.il(y.il) : "";
      s += `<li data-yapi-durum="${y.durum}"><span class="ml-ad"><b>${esc(ad.yapi(y.tur))}</b><span class="soluk">${esc(yapiDurumu(y, d.simZamani))}${yer ? ` · ${esc(yer)}` : ""}</span></span>${gitDugmesi(y.ilce)}</li>`;
    }
    s += `</ul>`;
  }
  s += `<h3>Rehber</h3><div class="bos-durum">${ikon("compass", 28)}<p class="ipucu-metin">Rehber görevler yakında.</p></div>`;
  return s;
}

const tl = (mili: number): string => `${fmt(Math.floor(mili / 1000))} ₺`;

export function mulkHazinePaneli(d: IsletmeDurumu | null): string {
  if (!d) return `<p class="ipucu-metin">Hazine bilgisi yükleniyor…</p>`;
  const satir = (k: string, v: string, a = ""): string => `<dt>${k}</dt><dd>${v}${a ? `<br><span class="soluk">${a}</span>` : ""}</dd>`;
  let s = `<dl class="mulk-dl">`;
  s += satir("Hazine", d.hazineMili !== null ? `<b data-alan="mulk-hazine">${tl(d.hazineMili)}</b>` : "—");
  if (d.hazineOraniMili !== null && d.hazineOraniMili !== 0) s += satir("Net akış", `${d.hazineOraniMili > 0 ? "+" : "−"}${tl(Math.abs(d.hazineOraniMili))} / sa`, "Gelir ve giderlerin saatlik toplamı.");
  if (d.araziDegeriMili !== null) s += satir("Arazi değeri", tl(d.araziDegeriMili), "Arsalarının satın alma bedeli toplamı.");
  if (d.araziVergisiMili !== null) s += satir("Arazi vergisi", tl(d.araziVergisiMili), "Tahakkuk eden, henüz ödenmemiş.");
  s += `</dl>`;
  return s;
}

export function mulkMalPaneli(d: IsletmeDurumu | null, ad: MulkAdlari): string {
  if (!d) return `<p class="ipucu-metin">Stok bilgisi yükleniyor…</p>`;
  if (!d.mallar.length) return `<div class="bos-durum">${ikon("package", 28)}<p class="ipucu-metin">Deponda henüz mal yok. Yapıların üretmeye başlayınca stok ve satış burada görünür.</p></div>`;
  const m = (x: number): string => fmt(Math.round(x / 1000));
  let s = `<div class="tablo-kap"><table class="mini-tablo"><thead><tr><th>Mal</th><th class="sayi">Stok</th><th class="sayi">Üretim/sa</th><th class="sayi">Satış/sa</th></tr></thead><tbody>`;
  for (const x of d.mallar) s += `<tr><td>${esc(ad.mal(x.mal))}</td><td class="sayi">${m(x.stokMili)}</td><td class="sayi">${x.uretimMili ? m(x.uretimMili) : "—"}</td><td class="sayi">${x.satisMili ? m(x.satisMili) : x.alisMili ? `alış ${m(x.alisMili)}` : "—"}</td></tr>`;
  return s + `</tbody></table></div><p class="ipucu-metin">Satış: işletme emirlerinin gerçekleşen saatlik miktarı.</p>`;
}

export function mulkDikkatPaneli(l: MulkDikkatMaddesi[]): string {
  let s = `<p class="ipucu-metin">Yapılarında ilgilenmen gerekenler.</p>`;
  if (!l.length) return s + `<div class="bos-durum">${ikon("circle-check", 32)}<p class="ipucu-metin">Şu an ilgilenmen gereken bir şey yok. Bereket versin.</p></div>`;
  s += `<ol class="dikkat-liste">`;
  for (const m of l.slice(0, 5)) {
    const r = SIMGE[m.tur];
    s += `<li class="dikkat-satir" data-tur="${m.tur}"><span class="rozet-simge ${m.tur}" role="img" aria-label="${esc(r.ad)}">${ikon(r.ikon, 15, "kalin")}</span><div class="dikkat-metin"><b>${esc(m.baslik)}</b><br><span class="soluk">${esc(m.ayrinti)}</span></div><div class="dikkat-dugme">${gitDugmesi(m.ilce)}</div></li>`;
  }
  s += `</ol>`;
  if (l.length > 5) s += `<p class="ipucu-metin">+${l.length - 5} madde daha.</p>`;
  return s;
}

export function mulkOlayPaneli(simSaat: number, g: GovdeDurumu): string {
  const tarih = gercekTarih(simSaat);
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

export interface MulkPaneliSecenekleri {
  gorunum: HaritaGorunumu;
  hiyerarsi: Hiyerarsi;
  ilceAc: (ilce: string) => void;
}

/** Kabuğa verilen sağlayıcı. */
export function mulkPaneliKur(s: MulkPaneliSecenekleri): MulkPaneli {
  if (!document.getElementById("mulk-panel-stil")) {
    const st = document.createElement("style");
    st.id = "mulk-panel-stil";
    st.textContent = mulkCss;
    document.head.append(st);
  }
  const b = s.gorunum.baglanti;
  const ic = s.gorunum.tablo;
  const katalog = s.gorunum.yapiKatalogu();
  const ad: MulkAdlari = {
    yapi: (tur) => katalog.find((k) => k.id === tur)?.ad ?? ic.turler[ic.turIdx[tur] ?? -1]?.ad ?? (tur || "Yapı"),
    mal: (mal) => ic.mallar[ic.malIdx[mal] ?? -1]?.ad ?? mal,
    ilce: (ilce) => s.hiyerarsi.ilceler.get(ilce)?.ad ?? ilce,
    il: (il) => s.hiyerarsi.iller.get(il)?.ad ?? il,
  };
  // Biten inşaatlar: bir inşaat listeden düşünce (ya da bitişi geçince) bu oturumda hatırlanır
  const insaatlar = new Map<string, { tur: string; ilce?: string; bitis: number }>();
  const bitenler = new Map<string, { tur: string; ilce?: string; bitis: number }>();
  let son: IsletmeDurumu | null = null;
  const oku = (): IsletmeDurumu | null => {
    const d = b.isletme?.() ?? null;
    if (!d) return son;
    const simdi = new Set<string>();
    for (const y of d.yapilar) {
      const id = y.anahtar.slice(1);
      if (y.durum === "insaat") {
        simdi.add(id);
        insaatlar.set(id, { tur: y.tur, ...(y.ilce ? { ilce: y.ilce } : {}), bitis: y.bitis ?? d.simZamani });
      } else if (y.bitis !== undefined && !bitenler.has(id) && d.simZamani - y.bitis <= BITTI_SAAT * SAAT) bitenler.set(id, { tur: y.tur, ...(y.ilce ? { ilce: y.ilce } : {}), bitis: y.bitis });
    }
    for (const [id, x] of insaatlar)
      if (!simdi.has(id)) {
        insaatlar.delete(id);
        if (x.bitis <= d.simZamani + SAAT) bitenler.set(id, { ...x, bitis: Math.min(x.bitis, d.simZamani) });
      }
    son = d;
    return d;
  };
  return {
    sekmeler: MULK_SEKMELERI,
    icerik(sekme, g) {
      const d = oku();
      switch (sekme) {
        case "isletme":
          return isletmePaneli(d, b.ben, ad);
        case "hazine":
          return mulkHazinePaneli(d);
        case "mal":
          return mulkMalPaneli(d, ad);
        case "dikkat":
          return mulkDikkatPaneli(d ? mulkDikkatMaddeleri(d, ad, bitenler) : []);
        case "olaylar":
          return mulkOlayPaneli((d?.simZamani ?? b.ozet?.()?.simZamani ?? 0) / SAAT, g);
      }
      return "";
    },
    sayac(sekme) {
      const d = son;
      return sekme === "dikkat" && d ? Math.min(5, mulkDikkatMaddeleri(d, ad, bitenler).length) : 0;
    },
    cubuk() {
      const oz = b.ozet?.() ?? null;
      if (!oz) return null;
      const ilk = [...b.ben.ad.trim()][0] ?? "?";
      return {
        html: `<i class="mulk-amblem kucuk" aria-hidden="true">${esc(ilk)}</i><span class="ocad">${esc(b.ben.ad)}</span>${oz.hazineMili !== null ? `<b>${tl(oz.hazineMili)}</b>` : ""}`,
        baslik: `${b.ben.ad}${oz.hazineMili !== null ? `: hazine ${tl(oz.hazineMili)}` : ""}. İşletmem sekmesini açmak için dokunun.`,
      };
    },
    simSaat() {
      const t = b.ozet?.()?.simZamani;
      return t === undefined ? null : t / SAAT;
    },
    tikla(t) {
      const g = t.closest("[data-mulk-ilce]") as HTMLElement | null;
      if (!g) return false;
      s.ilceAc(g.dataset["mulkIlce"] ?? "");
      return true;
    },
    dinle(f) {
      // Bağdaştırıcı değişince (kare, delta) ve inşaat aşamaları için iki saniyede bir
      const birak = b.dinle?.(f);
      const z = window.setInterval(f, 2000);
      return () => {
        birak?.();
        window.clearInterval(z);
      };
    },
  };
}
