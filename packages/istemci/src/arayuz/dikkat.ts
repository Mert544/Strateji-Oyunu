/**
 * "Dikkat" paneli (saf: durum -> madde listesi / HTML). Eski "Darboğaz" sekmesinin yerine: en çok
 * DIKKAT_EN_COK eyleme dönük madde. Maddeler rozetlerle aynı kuraldan türer (veri/rozet.ts): savaş, eksik girdi,
 * boşta tesis, biten inşaat. Her maddede "Git" (bölgeye uç) ve uygunsa önerilen komut düğmesi vardır:
 *   - doğrudan komut (ör. durmuş tesisi başlat) -> data-komut;
 *   - ön doldurulmuş form (ör. ithalat emri; oranı oyuncu seçer) -> data-form-ac.
 * Oyuncu kipinde yalnız oyuncunun bölgeleri ve taraf olduğu savaşlar; izleme kipinde sahipli tüm bölgeler.
 */
import type { Komut } from "../komut/tipler";
import type { Icerik } from "../komut/tablo";
import { rozetAlabilir, rozetNedenleri } from "../veri/rozet";
import type { RozetTuru } from "../veri/rozet";
import { esc, sureMetni, yuzde } from "./bicim";
import { NEDEN_KISA, oyuncuAd } from "./govde";
import type { GovdeDurumu } from "./govde";

export const DIKKAT_EN_COK = 5;

/** Önerilen eylem: doğrudan komut ya da ön doldurulmuş form (bölgenin komut bölümünde açılır). */
export interface DikkatEylemi {
  etiket: string;
  komut?: Komut;
  form?: { id: string; degerler: Record<string, string> };
}

export interface DikkatMaddesi {
  tur: RozetTuru;
  bolge: number;
  baslik: string;
  ayrinti: string;
  eylem?: DikkatEylemi;
  /** Aynı türde sıralama (küçük önce). */
  sira: number;
}

/** Rozet simgesi (şekil + metin; renk tek başına anlam taşımaz). */
export const ROZET_SIMGE: Record<RozetTuru, { simge: string; ad: string }> = {
  savas: { simge: "⚔", ad: "Savaş" },
  eksik: { simge: "▲", ad: "Eksik girdi" },
  bosta: { simge: "◯", ad: "Boşta" },
  bitti: { simge: "✓", ad: "İnşaat bitti" },
};

const TUR_SIRA: Record<RozetTuru, number> = { savas: 0, eksik: 1, bosta: 2, bitti: 3 };

const kucuk = (s: string): string => s.toLocaleLowerCase("tr");

/** Bir malı üreten ilk tesis türü (içerikten; teknoloji/etiket uygunluğunu form ayrıca açıklar). */
function ureticiTur(ic: Icerik, malId: string): { id: string; ad: string } | null {
  const m = ic.malIdx[malId];
  if (m === undefined) return null;
  for (const t of ic.turler) {
    if (t.yontemler.some((y) => ic.yontemler[y]?.cikti.some((c) => c[0] === m))) return { id: t.id, ad: t.ad };
  }
  return null;
}

/** Tüm dikkat maddeleri, önem sırasıyla (kırpılmamış). */
export function dikkatMaddeleri(g: GovdeDurumu): DikkatMaddesi[] {
  const { kare, dizin } = g;
  if (!kare || !dizin) return [];
  const ben = g.oyun && kare.oyuncu ? kare.oyuncu.idx : -1;
  const ic = g.oyun?.ic;
  const bitenler = g.bitenler ?? new Map();
  const liste: DikkatMaddesi[] = [];

  // Savaşlar: oyuncunun taraf olduğu (izlemede tümü) etkin savaşlar.
  for (const w of kare.savaslar) {
    if (w.evre === "bitti") continue;
    if (ben >= 0 && w.saldiran !== ben && w.savunan !== ben) continue;
    const savunma = ben >= 0 && w.savunan === ben;
    const kalan = w.evre === "hazirlik" ? (w.pencereBasi ?? w.pencereBitis) - kare.saat : w.pencereBitis - kare.saat;
    liste.push({
      tur: "savas",
      bolge: w.hedefBolge,
      baslik: savunma ? `${g.bolgeAd(w.hedefBolge)}: ${oyuncuAd(dizin, w.saldiran)} saldırıyor` : `Savaş: ${g.bolgeAd(w.saldiranBolge)} → ${g.bolgeAd(w.hedefBolge)}`,
      ayrinti: `${w.evre === "hazirlik" ? "hazırlık" : "savaş penceresi"} · ${w.evre === "hazirlik" && w.pencereBasi !== undefined ? "başlamasına" : "bitişine"} ${sureMetni(Math.max(0, kalan))}`,
      sira: kalan,
    });
  }

  for (let i = 0; i < dizin.bolgeler.length; i++) {
    if (!rozetAlabilir(kare, i, ben)) continue;
    const n = rozetNedenleri(kare, dizin, i, bitenler);
    const ad = g.bolgeAd(i);
    const benim = ben >= 0 && kare.bolgeler[i]?.sahip === ben;
    const liman = dizin.bolgeler[i]?.etiketler.includes("liman") === true;

    // ▲ eksik girdi: en kötü tedarik hücresi ya da gıda kıtlığı (hangisi daha kötüyse)
    const gidaMal = dizin.mallar.findIndex((m) => m.id === "gida");
    const aday: Array<{ mal: number; pct: number; neden: string }> = [];
    if (n.eksik) aday.push({ mal: n.eksik.mal, pct: n.eksik.hucre.pct, neden: NEDEN_KISA[n.eksik.hucre.neden] ?? "" });
    if (n.gida !== null && gidaMal >= 0) aday.push({ mal: gidaMal, pct: n.gida, neden: "kıtlık: nüfus aç" });
    aday.sort((a, b) => a.pct - b.pct);
    const e = aday[0];
    if (e) {
      const mal = dizin.mallar[e.mal];
      let eylem: DikkatEylemi | undefined;
      if (benim && mal && ic) {
        if (liman) eylem = { etiket: "İthalat aç", form: { id: "ticaret_emri", degerler: { mal: mal.id, yon: "ithalat" } } };
        else {
          const t = ureticiTur(ic, mal.id);
          if (t) eylem = { etiket: `${t.ad} kur`, form: { id: "tesis_insa", degerler: { tesisTuru: t.id } } };
        }
      }
      liste.push({ tur: "eksik", bolge: i, baslik: `${ad}: ${kucuk(mal?.ad ?? "?")} ${yuzde(100 - e.pct)} eksik`, ayrinti: e.neden, ...(eylem ? { eylem } : {}), sira: e.pct });
    }

    // ◯ boşta tesis
    if (n.bosta >= 0) {
      const x = kare.bolgeler[i]?.tesis[n.bosta];
      if (x) {
        const tesisAd = dizin.tesisTurleri[x[0]]?.ad ?? "Tesis";
        const durdu = x[2] === 0;
        const id = kare.oyuncu?.bolgeler[i]?.tesisler[n.bosta]?.id;
        const eylem: DikkatEylemi | undefined =
          benim && durdu && id !== undefined ? { etiket: "Başlat", komut: { tur: "tesis_durum", bolge: dizin.bolgeler[i]?.id ?? "", tesis: id, aktif: true } } : undefined;
        liste.push({
          tur: "bosta",
          bolge: i,
          baslik: `${ad}: ${tesisAd} boşta`,
          ayrinti: durdu ? "durduruldu" : `verim ${yuzde(x[3])}${n.eksik ? " · girdi eksik" : ""}`,
          ...(eylem ? { eylem } : {}),
          sira: durdu ? -1 : x[3],
        });
      }
    }

    // ✓ biten inşaat
    if (n.bitti) {
      const tesisAd = n.bitti.tesisTuru >= 0 ? dizin.tesisTurleri[n.bitti.tesisTuru]?.ad : undefined;
      const once = kare.saat - n.bitti.saat;
      liste.push({ tur: "bitti", bolge: i, baslik: `${ad}: ${tesisAd ? `${tesisAd} inşaatı` : "inşaat"} bitti`, ayrinti: once >= 1 ? `${sureMetni(once)} önce` : "az önce", sira: -n.bitti.saat });
    }
  }
  return liste.sort((a, b) => TUR_SIRA[a.tur] - TUR_SIRA[b.tur] || a.sira - b.sira || a.bolge - b.bolge);
}

function eylemHtml(e: DikkatEylemi, bolge: number): string {
  if (e.komut) return `<button type="button" class="eylem birincil" data-komut="${esc(JSON.stringify(e.komut))}">${esc(e.etiket)}</button>`;
  if (e.form) return `<button type="button" class="eylem birincil" data-form-ac="${esc(JSON.stringify({ ...e.form, bolge }))}">${esc(e.etiket)}</button>`;
  return "";
}

/** Rozet şekil göstergesi (panelde ve lejantta). */
export function rozetSimgesi(t: RozetTuru): string {
  const r = ROZET_SIMGE[t];
  return `<span class="rozet-simge ${t}" role="img" aria-label="${esc(r.ad)}">${r.simge}</span>`;
}

export function rozetLejanti(): string {
  return `<div class="gosterge rozet-lejant">${(["eksik", "bosta", "bitti", "savas"] as const).map((t) => `<span class="g-oge">${rozetSimgesi(t)}${esc(ROZET_SIMGE[t].ad)}</span>`).join("")}</div>`;
}

/** "Dikkat" sekmesi. */
export function dikkatPaneli(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  if (!kare || !dizin) return "<p class='ipucu-metin'>Simülasyon başlatılıyor…</p>";
  const tum = dikkatMaddeleri(g);
  const oyuncu = g.oyun !== undefined && kare.oyuncu !== undefined;
  let s = `<p class="ipucu-metin">${oyuncu ? "Bölgelerinizde ilgilenmeniz gerekenler" : "Dünyada dikkat çeken durumlar"} (en çok ${DIKKAT_EN_COK}). Haritadaki rozetler aynı kuralla çizilir; her bölgede en çok bir rozet.</p>`;
  if (!tum.length) s += `<p class="ipucu-metin bos-durum">Şu an dikkat gerektiren bir şey yok.</p>`;
  else {
    s += `<ol class="dikkat-liste">`;
    for (const m of tum.slice(0, DIKKAT_EN_COK)) {
      s += `<li class="dikkat-satir" data-tur="${m.tur}">${rozetSimgesi(m.tur)}<div class="dikkat-metin"><b>${esc(m.baslik)}</b>${m.ayrinti ? `<br><span class="soluk">${esc(m.ayrinti)}</span>` : ""}</div><div class="dikkat-dugme"><button type="button" class="eylem" data-bolge="${m.bolge}" title="Bölgeye git">Git</button>${m.eylem ? eylemHtml(m.eylem, m.bolge) : ""}</div></li>`;
    }
    s += `</ol>`;
    if (tum.length > DIKKAT_EN_COK) s += `<p class="ipucu-metin">+${tum.length - DIKKAT_EN_COK} madde daha; önce yukarıdakileri çözün.</p>`;
  }
  return s + `<h3>Rozetler</h3>` + rozetLejanti();
}
