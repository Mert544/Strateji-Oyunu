/**
 * "Sen yokken" dönüş ekranı (docs/arastirma/donus-deneyimi.md §2; en küçük hâl D1). Harita yığınında (harita.js).
 *
 * Sunucu yalnız OLGU gönderir (`@bolge/protokol` `DonusOzeti`: bant, net sonuç, şablon anahtarlı maddeler); metin burada
 * şablondan Türkçe üretilir (LLM yok). Varyant tohumludur: aynı olgu aynı cümleyi verir. İlkeler:
 *   - yargılamaz, sürüklemez, ödüllendirmez; suçlayan ya da acele ettiren dil yok (yasaklı kalıp testi: test/donus.test.ts);
 *   - ilk görünümde en çok 8 satır; tek birincil düğme `Devam` (Enter, Esc ve perdeye tık da kapatır);
 *   - sunucunun kapalı kaldığı süre için ayrı satır yok: o süre yalnız yokluk süresidir;
 *   - hiçbir şey olmadıysa ekran açılmaz, yalnız sakin bir selam bildirimi ("Dünya sakindi.");
 *   - K1 (1–6 sa) kısa kart, K2+ tam kart; K5+ (uzun yokluk) "girmen yeter" satırı.
 * Kapanınca `ozetOkundu` gönderilir (çapa ilerler; aynı özet ikinci kez gösterilmez).
 */
import type { DonusMaddesi, DonusOzeti } from "@bolge/protokol";
import { DONUS_SABLON } from "@bolge/protokol";
import { bildir } from "../arayuz/bildirim";
import { DUNYA_EPOCH_MS, esc, fmt, gercekTarih, paraIsaretli, sureMetni, tamTarihMetni, TURKIYE_OFSETI_MS } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";
import type { HaritaGorunumu } from "./gorunum";
import type { Hiyerarsi } from "./veri";

/** En çok satır (başlık hariç): net sonuç + üretim + maddeler. */
export const DONUS_EN_COK_SATIR = 8;

export interface DonusAdlari {
  yapi: (tur: string) => string;
  mal: (mal: string) => string;
  /** İlçe ya da bölge kimliğinden yer adı ("" olabilir). */
  yer: (kimlik: string) => string;
}

/** Şablon varyantları ({yapi}, {yer}, {adet}, {yerler}). Tohum `mod` varyant sayısı. */
export const DONUS_METINLERI: Readonly<Record<string, readonly string[]>> = {
  [DONUS_SABLON.bittiInsaat]: ["{yer}{yapi} bitti; hayırlı olsun.", "{yer}{yapi} tamamlandı; kolay gelsin.", "{yer}{yapi} hazır; hayırlı olsun."],
  [DONUS_SABLON.bittiInsaatCok]: ["{adet} {yapi} bitti ({yerler}); hayırlı olsun.", "{adet} {yapi} tamamlandı ({yerler}); kolay gelsin."],
  [DONUS_SABLON.gelenSiparis]: ["Yeni bir sipariş geldi.", "Yeni sipariş: ayrıntısı İşletmem'de."],
};

const SELAM = (trtSaat: number): string => (trtSaat >= 5 && trtSaat < 11 ? "Günaydın" : trtSaat >= 11 && trtSaat < 17 ? "İyi günler" : trtSaat >= 17 && trtSaat < 22 ? "İyi akşamlar" : "İyi geceler");

const OZEL_TUR: Record<string, string> = { olcek: "Ölçek büyütme", kenar: "Yol", onarim: "Onarım" };

/** Bir maddenin Türkçe cümlesi (şablon + tohum). */
export function maddeMetni(m: DonusMaddesi, ad: DonusAdlari): string {
  const v = DONUS_METINLERI[m.sablon] ?? ["{yapi}"];
  const sablon = v[(m.tohum >>> 0) % v.length] ?? v[0]!;
  const d = m.degerler.map(String);
  const yapi = (t: string): string => OZEL_TUR[t] ?? ad.yapi(t);
  if (m.sablon === DONUS_SABLON.bittiInsaatCok) {
    const yerler = [d[2], d[3]].filter((x): x is string => !!x).map(ad.yer).filter(Boolean).join(", ");
    return sablon.replace("{adet}", fmt(Number(d[0]) || 0)).replace("{yapi}", yapi(d[1] ?? "")).replace(" ({yerler})", yerler ? ` (${yerler})` : "");
  }
  const yer = d[1] ? ad.yer(d[1]) : "";
  return sablon.replace("{yer}", yer ? `${yer}: ` : "").replace("{yapi}", yapi(d[0] ?? ""));
}

/** Gösterilecek bir şey var mı? (yoksa ekran açılmaz; Dİ-9) */
export function donusBosMu(o: DonusOzeti): boolean {
  return o.net.hazineFarki === 0 && o.net.uretim.length === 0 && o.maddeler.length === 0;
}

/** Satırlar (en çok `DONUS_EN_COK_SATIR`): net sonuç, üretim, önem sırasıyla maddeler. */
export function donusSatirlari(o: DonusOzeti, ad: DonusAdlari): Array<{ html: string; git?: string }> {
  const l: Array<{ html: string; git?: string }> = [];
  const n = o.net;
  if (n.hazineFarki !== 0 || n.kalemler.satis !== 0) {
    const kalem: string[] = [];
    if (n.kalemler.satis) kalem.push(`satış ${paraIsaretli(n.kalemler.satis)}`);
    if (n.kalemler.gider) kalem.push(`gider ${paraIsaretli(n.kalemler.gider)}`);
    if (n.kalemler.diger) kalem.push(`diğer ${paraIsaretli(n.kalemler.diger)}`);
    l.push({ html: `<b class="${n.hazineFarki > 0 ? "dn-arti" : ""}">Net: ${esc(paraIsaretli(n.hazineFarki))}</b>${kalem.length ? ` <span class="soluk">(${esc(kalem.join(", "))})</span>` : ""}` }); // B9: "Net" sözcüğü ilk sayının net olduğunu söyler; kalemler parantezde
  }
  if (n.uretim.length) l.push({ html: `Üretimden çıkanlar: ${esc(n.uretim.map((u) => `${ad.mal(u.mal)} ${fmt(Math.round(u.miktar / 1000))}`).join(" · "))}` });
  const maddeler = [...o.maddeler].sort((a, b) => b.onem - a.onem);
  for (const m of maddeler) {
    if (l.length >= DONUS_EN_COK_SATIR) break;
    const yer = m.sablon === DONUS_SABLON.bittiInsaat ? String(m.degerler[1] ?? "") : m.sablon === DONUS_SABLON.bittiInsaatCok ? String(m.degerler[2] ?? "") : "";
    l.push({ html: esc(maddeMetni(m, ad)), ...(yer ? { git: yer } : {}) });
  }
  return l.slice(0, DONUS_EN_COK_SATIR);
}

/** Kartın HTML'i (saf). `epochMs`: dünya epoch'u; `isletmeIlcesi`: "Git" için ilçe kimliği mi? */
export function donusHtml(o: DonusOzeti, ad: DonusAdlari, epochMs = DUNYA_EPOCH_MS, ilceMi: (k: string) => boolean = () => true): string {
  const bitis = o.aralik.bitisT;
  const trtSaat = Math.floor(((epochMs + bitis + TURKIYE_OFSETI_MS) % 86_400_000) / 3_600_000);
  const tarih = tamTarihMetni(gercekTarih(bitis / 3_600_000, epochMs));
  const yokluk = sureMetni(Math.max(0, bitis - o.aralik.baslangicT) / 3_600_000);
  const uzun = o.bant === "K5" || o.bant === "K6" || o.bant === "K7";
  let s = `<div class="dn-kutu" role="document">`;
  s += `<p class="dn-ust"><span>${SELAM(trtSaat)} · ${esc(tarih)}</span><span class="soluk">${esc(yokluk)} aradan sonra</span></p>`;
  s += `<h2 id="donus-baslik">${uzun ? "Yurdun seni bekliyordu" : "Sen yokken"}</h2>`;
  s += `<ul class="dn-satirlar">`;
  for (const r of donusSatirlari(o, ad))
    s += `<li><span>${r.html}</span>${r.git && ilceMi(r.git) ? `<button type="button" class="eylem" data-dn-git="${esc(r.git)}">${ikon("map-pin", 15)}Git</button>` : ""}</li>`;
  s += `</ul>`;
  if (uzun) s += `<p class="dn-not">Bir şey yapman gerekmiyor; girmen yeter.</p>`;
  s += `<div class="dn-alt"><button type="button" class="birincil" data-dn="devam">Devam</button></div></div>`;
  return s;
}

export interface DonusSecenekleri {
  ozet: DonusOzeti;
  ad: DonusAdlari;
  epochMs: number;
  ilceMi: (k: string) => boolean;
  /** "Git": ilçeye uç (ekran kapanır). */
  git: (ilce: string) => void;
  /** Kapanınca (Devam, Git, Esc): `ozetOkundu` gönderilir. */
  okundu: () => void;
  kap: HTMLElement;
}

/** Ekranı açar; kapanınca çözülür. Boş özet için ekran açılmaz, yalnız sakin selam bildirimi. */
export function donusAc(s: DonusSecenekleri): Promise<void> {
  if (donusBosMu(s.ozet)) {
    bildir("Dünya sakindi; her şey yerinde.", "bilgi");
    s.okundu();
    return Promise.resolve();
  }
  return new Promise((coz) => {
    const kat = document.createElement("div");
    kat.id = "donus";
    kat.className = s.ozet.bant === "K1" ? "kisa" : "";
    kat.setAttribute("role", "dialog");
    kat.setAttribute("aria-modal", "true");
    kat.setAttribute("aria-labelledby", "donus-baslik");
    kat.innerHTML = donusHtml(s.ozet, s.ad, s.epochMs, s.ilceMi);
    let bitti = false;
    const kapat = (ilce?: string): void => {
      if (bitti) return;
      bitti = true;
      window.removeEventListener("keydown", tus);
      kat.remove();
      document.body.classList.remove("donus-acik");
      s.okundu();
      if (ilce) s.git(ilce);
      coz();
    };
    const tus = (e: KeyboardEvent): void => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        kapat();
      }
    };
    kat.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const g = t.closest("[data-dn-git]") as HTMLElement | null;
      if (g) return kapat(g.dataset["dnGit"]);
      if (t.closest("[data-dn='devam']") || t === kat) kapat();
    });
    window.addEventListener("keydown", tus);
    s.kap.append(kat);
    document.body.classList.add("donus-acik");
    (kat.querySelector("[data-dn='devam']") as HTMLElement | null)?.focus();
  });
}

/** Sunucusuz kip için örnek özet (`?donus=ornek`; gösterim ve sınama). Sayılar uydurmadır, yalnız düzen içindir. */
export const DONUS_ORNEGI: DonusOzeti = {
  surum: 1,
  bant: "K2",
  aralik: { baslangicT: 0, bitisT: 14 * 3_600_000 },
  net: { hazineFarki: 1_960_000, kalemler: { satis: 2_140_000, gider: -180_000, diger: 0 }, uretim: [{ mal: "tahil", miktar: 220_000 }, { mal: "gida", miktar: 60_000 }] },
  maddeler: [
    { blok: "B2", sablon: DONUS_SABLON.bittiInsaat, tohum: 7, degerler: ["ahir", "tr_41_gebze"], onem: 600_000 },
    { blok: "B2", sablon: DONUS_SABLON.bittiInsaatCok, tohum: 3, degerler: [2, "ciftlik", "tr_41_gebze", "tr_41_kandira"], onem: 500_000 },
  ],
  oneri: null,
};

export interface DonusGosterSecenekleri {
  gorunum: HaritaGorunumu;
  hiyerarsi: Hiyerarsi;
  kap: HTMLElement;
  ilceAc: (ilce: string) => void;
}

/** Bağdaştırıcıda gösterilmemiş özet varsa ekranı açar ve kapanmasını bekler (yoksa hemen döner). */
export async function donusuGoster(s: DonusGosterSecenekleri): Promise<void> {
  const b = s.gorunum.baglanti;
  const ozet = b.donusOzeti?.() ?? null;
  if (!ozet) return;
  const ic = s.gorunum.tablo;
  const katalog = s.gorunum.yapiKatalogu();
  const h = s.hiyerarsi;
  await donusAc({
    ozet,
    ad: {
      yapi: (t) => katalog.find((k) => k.id === t)?.ad ?? ic.turler[ic.turIdx[t] ?? -1]?.ad ?? t,
      mal: (m) => ic.mallar[ic.malIdx[m] ?? -1]?.ad ?? m,
      yer: (k) => h.ilceler.get(k)?.ad ?? h.iller.get(k.split("#")[0] ?? "")?.ad ?? "",
    },
    epochMs: b.dunyaEpochMs?.() ?? DUNYA_EPOCH_MS,
    ilceMi: (k) => h.ilceler.has(k),
    git: s.ilceAc,
    okundu: () => b.ozetOkundu?.(),
    kap: s.kap,
  });
}
