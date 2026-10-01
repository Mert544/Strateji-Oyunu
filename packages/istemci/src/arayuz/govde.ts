/**
 * Panel içerik üreticileri (saf): anlık görüntü + dizin + durum -> HTML dizgisi.
 * Bölge ayrıntısı (tedarik satırı dahil), mal/mercek listesi, neden şeridi, hazineler, savaşlar.
 * Lojistik ağı gösterilmez; seçili bölgenin tedarik durumu yalnız istek üzerine (bölge panelinde) okunur.
 */
import { hucre, kareTuret, tedarikOzeti } from "../veri/kapsam";
import type { Hucre, KapsamDurumu } from "../veri/kapsam";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { MERCEKLER, mercekAdi } from "../veri/mercek";
import type { Mercek } from "../veri/mercek";
import { malRengiHex, sekilKodu } from "../veri/renkler";
import type { BitenInsaat } from "../veri/rozet";
import { esc, fmt, fmt1, kisalt, sinirla, yuzde } from "./bicim";
import { bolgeTarimBolumu, olayOzeti, tarimLejanti, tarimNedenSatiri } from "./tarim-govde";
import { komutBolumu } from "./komut-govde";
import type { OyunDurumu } from "./komut-govde";

export const DURUM_AD: Record<KapsamDurumu, string> = {
  karsilanan: "Karşılanan",
  kismi: "Kısmi",
  acik: "Açık",
  engelli: "Engelli",
  ilgisiz: "Talep yok",
  sahipsiz: "Sahipsiz",
};
export const NEDEN_AD: Record<string, string> = {
  kapasite: "taşıma kapasitesi yetmiyor",
  girdi_eksik: "girdi yok, hiçbir yerde fazla üretim yok",
  mesafe: "en yakın kaynak çok uzak",
  erisim_yok: "yol yok, kaynağa erişilemiyor",
};
export const NEDEN_KISA: Record<string, string> = {
  kapasite: "taşıma yetmiyor",
  girdi_eksik: "girdi yok",
  mesafe: "kaynak uzak",
  erisim_yok: "yol yok",
};
export const ETIKET_AD: Record<string, string> = { liman: "Liman", dag: "Dağ", dar_gecit: "Dar geçit", kiyi: "Kıyı", ova: "Ova" };

const SEKIL_YOL = [
  "M-2.8 0 A2.8 2.8 0 1 0 2.8 0 A2.8 2.8 0 1 0 -2.8 0 Z",
  "M0 -3.6 L3.6 0 L0 3.6 L-3.6 0 Z",
  "M-2.6 -2.6 H2.6 V2.6 H-2.6 Z",
  "M0 -3.6 L3.4 2.8 H-3.4 Z",
];

export interface GovdeDurumu {
  kare: Kare | null;
  dizin: Dizin | null;
  /** "mal" merceğinde seçili mal (diğer merceklerde -1). */
  mal: number;
  /** Etkin harita merceği (varsayılan "genel"; tek mercek etkin). */
  mercek?: Mercek;
  /** Son BITTI_SURESI sim-saatte biten inşaatlar (bölge -> bitiş). */
  bitenler?: ReadonlyMap<number, BitenInsaat>;
  /** Seçili bölge indeksi (-1: yok). */
  bolge: number;
  /** Bölge adı (geçici/gerçek haritadan; dizinden farklı olabilir). */
  bolgeAd: (i: number) => string;
  /** Hazine geçmişi: oyuncu -> son değerler. */
  hazineGecmisi: number[][];
  /** Komut arayüzü durumu; yalnızca oyuncu kipinde (izleme kipinde tanımsız... ya da komutsuz). */
  oyun?: OyunDurumu;
}

/** Tarım görünümü ikonu (yaprak). */
export function yaprakIkonu(boy: number): string {
  return `<svg width="${boy}" height="${boy}" viewBox="-5 -5 10 10" aria-hidden="true"><path d="M-3.6 3.6C-4 -1 -1 -3.8 3.8 -3.8C3.8 0.8 1 3.8 -3.6 3.6ZM-3.6 3.6L1 -1" fill="var(--t3)" stroke="var(--ink2)" stroke-width="0.6" stroke-linejoin="round"/></svg>`;
}

export function malIkonu(d: Dizin, m: number, boy: number): string {
  const mal = d.mallar[m];
  if (!mal) return "";
  const yol = SEKIL_YOL[sekilKodu(mal.kategori)] as string;
  return `<svg width="${boy}" height="${boy}" viewBox="-5 -5 10 10" aria-hidden="true"><path d="${yol}" fill="${malRengiHex(mal.id)}" stroke="var(--ink2)" stroke-width="0.6"/></svg>`;
}

function cubuk(p: number): string {
  return `<span class="cubuk-iz"><span style="width:${sinirla(p, 0, 100)}%"></span></span>`;
}

function devletAd(d: Dizin, i: number): string {
  return d.devletler[i]?.ad ?? "?";
}
export function oyuncuAd(d: Dizin, o: number): string {
  if (o < 0) return "Sahipsiz";
  const oy = d.oyuncular[o];
  return oy ? devletAd(d, oy.devlet) : "?";
}

export function nedenMetni(d: Dizin, h: Hucre, m: number): string {
  const ad = d.mallar[m]?.ad ?? "?";
  const s = `${ad}: ${yuzde(100 - h.pct)} eksik — `;
  if (h.neden === "mesafe") return s + "en yakın kaynak çok uzak" + (h.sure >= 0 ? ` (${h.sure} sa)` : "");
  return s + (NEDEN_AD[h.neden] ?? "neden bilinmiyor");
}

// ---------------------------------------------------------------------------------------------
// Bölge
// ---------------------------------------------------------------------------------------------

/** Seçili bölgenin "Tedarik" satırı: ilgili mallarda ortalama karşılanma ve en kötü malın nedeni (haritada çizgi yok). */
export function tedarikSatiri(kare: Kare, dizin: Dizin, t: ReturnType<typeof kareTuret>, i: number): string {
  const o = tedarikOzeti(kare, t, i);
  if (!o) return "";
  const neden = o.enKotu ? `${dizin.mallar[o.enKotu.mal]?.ad ?? "?"} ${yuzde(o.enKotu.hucre.pct)} · ${NEDEN_KISA[o.enKotu.hucre.neden] ?? "neden bilinmiyor"}` : o.ilgili ? "tümü karşılanıyor" : "talep yok";
  return `<div class="satir tedarik-satir"><span class="ad">Tedarik</span><span class="sayi">${yuzde(o.yuzde)} ${cubuk(o.yuzde)}<br><span class="soluk">${esc(neden)}</span></span></div>`;
}

export function bolgePaneli(g: GovdeDurumu): string {
  const { kare, dizin, bolge: i } = g;
  if (!kare || !dizin) return "<p class='ipucu-metin'>Simülasyon başlatılıyor…</p>";
  if (i < 0) {
    return "<p class='ipucu-metin'>Küre üzerinde bir bölgeye dokunun veya tıklayın: stoklar, tesisler, üretim, tarım ve karşılanma burada görünür. Çift tıklama/dokunma bölgeye uçar.</p>" + komutBolumu(g, -1);
  }
  const bk = kare.bolgeler[i];
  const b = dizin.bolgeler[i];
  if (!bk || !b) return "";
  const t = kareTuret(kare, dizin.oyuncular.length);
  const nm = dizin.mallar.length;
  let s = `<div class="ayrinti-baslik"><b>${esc(g.bolgeAd(i))}</b><span class="soluk">${esc(devletAd(dizin, b.devlet))}</span></div>`;
  s += `<div>${b.etiketler.map((e) => `<span class="etiket-cip">${esc(ETIKET_AD[e] ?? e)}</span>`).join("")}</div>`;
  const sahip = dizin.oyuncular[bk.sahip];
  s += `<div class="satir"><span class="ad">Sahip</span><span>${esc(oyuncuAd(dizin, bk.sahip))}${sahip ? ` <span class="soluk">(${esc(sahip.arketip)})</span>` : ""}</span></div>`;
  s += `<div class="satir"><span class="ad">Nüfus</span><span class="sayi">${fmt(bk.nufus)} <span class="soluk">(başlangıç ${fmt(b.nufus0)})</span></span></div>`;
  s += `<div class="satir"><span class="ad">Gıda karşılanma</span><span class="sayi">${yuzde(bk.gida)} ${cubuk(bk.gida)}</span></div>`;
  s += tedarikSatiri(kare, dizin, t, i);
  if (bk.ordu.length) {
    s += `<div class="satir"><span class="ad">Ordu</span><span class="sayi">${bk.ordu.map((o) => `${fmt(o[1])}× ${esc(dizin.birlikler[o[0]]?.ad ?? "?")}`).join(", ")}</span></div>`;
    s += `<div class="satir"><span class="ad">İkmal karşılanma</span><span class="sayi">${yuzde(bk.ikmal)} ${cubuk(bk.ikmal)}</span></div>`;
    s += `<div class="satir"><span class="ad">Duruş</span><span>${["normal", "savunma", "geri çekil"][bk.durus] ?? "?"}</span></div>`;
  }
  s += bolgeTarimBolumu(g, i);
  s += `<h3>Mallar</h3><div class="tablo-kap"><table class="mini-tablo"><thead><tr><th>Mal</th><th class="sayi">Stok</th><th class="sayi">Üretim/sa</th><th>Karşılanma</th></tr></thead><tbody>`;
  for (let m = 0; m < nm; m++) {
    const h = hucre(kare, t, i, m);
    const kars =
      h.d === "sahipsiz" || h.d === "ilgisiz" ? "<span class='soluk'>—</span>" : h.d === "karsilanan" ? "<span>✓ %100</span>" : `<span>${DURUM_AD[h.d]} ${yuzde(h.pct)} · ${esc(NEDEN_KISA[h.neden] ?? "")}</span>`;
    const sel = g.mal === m ? " class='secili-satir'" : "";
    s += `<tr${sel}><td>${malIkonu(dizin, m, 11)} ${esc(dizin.mallar[m]?.ad ?? "?")}</td><td class="sayi">${fmt(bk.stok[m] ?? 0)}</td><td class="sayi">${bk.uretim[m] ? fmt1(bk.uretim[m] as number) : "<span class='soluk'>0</span>"}</td><td>${kars}</td></tr>`;
  }
  s += "</tbody></table></div>";
  if (bk.tesis.length) {
    s += `<h3>Tesisler (${bk.tesis.length})</h3><div class="tablo-kap"><table class="mini-tablo"><thead><tr><th>Tesis</th><th>Yöntem</th><th class="sayi">Verim</th><th class="sayi">İşçi</th></tr></thead><tbody>`;
    for (const x of bk.tesis) {
      s += `<tr><td>${esc(dizin.tesisTurleri[x[0]]?.ad ?? "?")}</td><td>${esc(dizin.yontemler[x[1]]?.ad ?? "?")}${x[2] ? "" : " <span class='soluk'>(pasif)</span>"}</td><td class="sayi">${yuzde(x[3])}</td><td class="sayi">${yuzde(x[4])}</td></tr>`;
    }
    s += "</tbody></table></div>";
  }
  return s + komutBolumu(g, i);
}

// ---------------------------------------------------------------------------------------------
// Mal sekmesi ve "neden" satırı
// ---------------------------------------------------------------------------------------------

/** "Mal" sekmesi: mercek listesi (tek mercek etkin) ve fiyatlı mal seçici. */
export function malPaneli(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  if (!kare || !dizin) return "";
  const mercek = g.mercek ?? "genel";
  let s = `<p class="ipucu-metin">Bir görünüm (mercek) seçin; aynı anda tek mercek etkindir. Bir mal seçince bölgeler o malın tedarik durumuna (neresi açık ve neden) boyanır.</p>`;
  s += `<h3>Görünüm</h3><div class="mal-liste">`;
  for (const m of MERCEKLER) {
    if (m.id === "tarim" && !dizin.tarim) continue;
    const secili = mercek === m.id;
    s += `<button type="button" class="mal-satir${secili ? " secili" : ""}" data-mercek="${m.id}" aria-pressed="${secili}"><span><b>${esc(m.ad)}</b> <span class="soluk">· ${esc(m.aciklama)}</span></span></button>`;
  }
  s += `</div>`;
  if (mercek === "tarim" && dizin.tarim) s += `<h3>Tarım görünümü göstergesi</h3>` + tarimLejanti(g);
  s += `<h3>Mallar ve dünya fiyatı</h3><div class="mal-liste">`;
  const MN = 0.3, MX = 2.0;
  const poz = (v: number): number => sinirla((v - MN) / (MX - MN), 0, 1) * 100;
  dizin.mallar.forEach((mal, m) => {
    const v = (kare.fiyat[m] ?? 1000) / 1000;
    const a = poz(1), b = poz(v);
    const yuk = v >= 1;
    const secili = mercek === "mal" && g.mal === m;
    s += `<button type="button" class="mal-satir${secili ? " secili" : ""}" data-mal="${m}" aria-pressed="${secili}"><span>${malIkonu(dizin, m, 12)} ${esc(mal.ad)}</span><span class="fiyat-iz"><span class="fiyat-dolgu" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%;background:${yuk ? "var(--k-acik)" : "var(--k-karsilanan)"}"></span><span class="fiyat-orta" style="left:${a}%"></span></span><span class="sayi">${yuzde(Math.round(v * 100))}</span></button>`;
  });
  s += `</div><p class="ipucu-metin">Fiyat çubuğu: çizgi = taban fiyat (%100); sağa uzayan pahalı (talep &gt; arz), sola uzayan ucuz.</p>`;
  if (mercek === "mal") s += `<h3>Gösterge</h3>` + kapsamLejanti();
  return s;
}

/** Mal merceği göstergesi: tedarik durumları (renk + desen). */
export function kapsamLejanti(): string {
  return `<div class="gosterge">
<span class="g-oge"><i class="g-kutu" style="background:var(--k-karsilanan)"></i>Karşılanan</span>
<span class="g-oge"><i class="g-kutu g-nokta" style="background:var(--k-kismi)"></i>Kısmi (noktalı)</span>
<span class="g-oge"><i class="g-kutu g-cizgi" style="background:var(--k-acik)"></i>Açık (çizgili)</span>
<span class="g-oge"><i class="g-kutu g-capraz" style="background:var(--k-engelli)"></i>Engelli (çapraz)</span>
</div>`;
}

/** Sıralı mercek (sanayi/pazar) için şeritteki kısa gösterge. */
function rampaLejanti(degisken: string, sol: string, sag: string): string {
  return `<div class="seri-lejant"><span class="rampa" style="background:linear-gradient(90deg, var(--${degisken}0), var(--${degisken}1), var(--${degisken}2), var(--${degisken}3), var(--${degisken}4))" aria-hidden="true"></span><span class="soluk">${sol} → ${sag}</span></div>`;
}

/**
 * Haritanın altındaki tek satır (U5): yalnız "Genel" dışı bir mercekte ya da iklim olayı varken görünür
 * (Genel merceği sakindir: seçili bölgenin ayrıntısı zaten panelde). HTML döner.
 */
export function nedenSatiri(g: GovdeDurumu): string {
  const { kare, dizin, mal: m, bolge } = g;
  if (!kare || !dizin) return "";
  const mercek = g.mercek ?? "genel";
  if (mercek === "tarim" && dizin.tarim) return tarimNedenSatiri(g);
  if (mercek === "sanayi") return `<b>Sanayi görünümü</b>: tarım dışı, çalışan tesislerin verimle ağırlıklı toplamı.` + rampaLejanti("s", "az", "çok");
  if (mercek === "pazar") return `<b>Pazar görünümü</b>: bölge stoklarının bugünkü dünya fiyatıyla değeri.` + rampaLejanti("p", "düşük", "yüksek");
  if (mercek !== "mal" || m < 0) {
    const ol = olayOzeti(g);
    return ol ? `<b>${esc(mercekAdi(mercek, dizin, m))}</b>${ol}.` : "";
  }
  const t = kareTuret(kare, dizin.oyuncular.length);
  const nb = dizin.bolgeler.length;
  const mad = esc(dizin.mallar[m]?.ad ?? "?");
  if (bolge >= 0) {
    const ad = esc(g.bolgeAd(bolge));
    const h = hucre(kare, t, bolge, m);
    if (h.d === "sahipsiz") return `<b>${ad}</b>: sahipsiz bölge.`;
    if (h.d === "karsilanan") return `<b>${mad}</b> — ${ad}: talep karşılanıyor.`;
    if (h.d === "ilgisiz") return `<b>${mad}</b> — ${ad}: bu malın üretimi ya da stoku yok.`;
    return `<b>${ad}</b> · ${esc(nedenMetni(dizin, h, m))}`;
  }
  const say = { karsilanan: 0, kismi: 0, acik: 0, engelli: 0 };
  const nd: Record<string, number> = {};
  let top = 0;
  for (let i = 0; i < nb; i++) {
    const h = hucre(kare, t, i, m);
    if (h.d === "sahipsiz" || h.d === "ilgisiz") continue;
    top++;
    say[h.d]++;
    if (h.d !== "karsilanan") nd[h.neden] = (nd[h.neden] ?? 0) + 1;
  }
  const kalan = say.kismi + say.acik + say.engelli;
  const nn = Object.keys(nd).sort((a, b) => (nd[b] ?? 0) - (nd[a] ?? 0)).map((n) => `${NEDEN_KISA[n] ?? n} ${nd[n]}`).join(", ");
  return `<b>${mad}</b>: ${top} ilgili bölgenin ` + (kalan === 0 ? "hepsi karşılanıyor." : `${kalan}'i eksik (açık ${say.acik}, kısmi ${say.kismi}, engelli ${say.engelli}) — başlıca neden: ${esc(nn)}.`) + " <span class='soluk'>Ayrıntı için bir bölgeye dokunun.</span>";
}

// ---------------------------------------------------------------------------------------------
// Hazineler ve savaşlar
// ---------------------------------------------------------------------------------------------

function mini(gecmis: number[], renkVar: string): string {
  if (gecmis.length < 2) return "";
  const mx = Math.max(...gecmis, 1), mn = Math.min(...gecmis, 0);
  const pts = gecmis.map((v, j) => `${((j / (gecmis.length - 1)) * 100).toFixed(1)},${(22 - ((v - mn) / Math.max(1, mx - mn)) * 20).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 100 24" width="100%" height="26" preserveAspectRatio="none" role="img" aria-label="Hazine geçmişi" style="margin-top:4px"><polyline points="${pts}" fill="none" stroke="${renkVar}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}

export function hazinePaneli(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  if (!kare || !dizin) return "";
  const t = kareTuret(kare, dizin.oyuncular.length);
  let s = "";
  dizin.oyuncular.forEach((o, i) => {
    const h = kare.hazine[i] ?? 0, or = kare.hazineOrani[i] ?? 0;
    let ordu = 0;
    for (const b of kare.bolgeler) if (b.sahip === i) for (const x of b.ordu) ordu += x[1];
    const renkVar = `var(--d${o.devlet % 4})`;
    s += `<div class="oyuncu"><div class="oyuncu-ust"><span class="nokta" style="background:${renkVar}"></span><span class="ad">${esc(devletAd(dizin, o.devlet))}</span><span class="soluk">${esc(o.arketip)}</span></div>
<div class="oyuncu-alt"><span>Hazine <b>${kisalt(h)}</b></span><span class="${or >= 0 ? "yukari" : "asagi"}">${or >= 0 ? "▲ +" : "▼ "}${fmt(or)}/sa</span><span>Bölge <b>${t.sahipSayisi[i] ?? 0}</b></span><span>Ordu <b>${fmt(ordu)}</b></span></div>${mini(g.hazineGecmisi[i] ?? [], renkVar)}</div>`;
  });
  return s;
}

export function savasPaneli(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  if (!kare || !dizin) return "";
  const aktif = kare.savaslar.filter((x) => x.evre !== "bitti");
  const biten = kare.savaslar.filter((x) => x.evre === "bitti").slice(-5).reverse();
  const satir = (w: Kare["savaslar"][number]): string => {
    const ev = w.evre === "hazirlik" ? "hazırlık" : w.evre === "pencere" ? "savaş penceresi" : "bitti";
    let r = `<button type="button" class="liste-satir" data-bolge="${w.hedefBolge}"><span><b>${esc(oyuncuAd(dizin, w.saldiran))}</b> → ${esc(oyuncuAd(dizin, w.savunan))}<br><span class="soluk">${esc(g.bolgeAd(w.saldiranBolge))} → ${esc(g.bolgeAd(w.hedefBolge))}</span></span><span style="text-align:right">`;
    if (w.evre === "bitti" && w.sonuc) {
      const sal = w.sonuc.kazanan === w.saldiran;
      r += `${sal ? "saldıran kazandı" : "savunan kazandı"}<br><span class="soluk">güç ${fmt(w.sonuc.saldiranGuc)} / ${fmt(w.sonuc.savunanGuc)} · kayıp ${yuzde(w.sonuc.kayipYuzde)}</span>`;
    } else {
      r += `<span class="rozet belirsiz">${ev}</span><br><span class="soluk">bitiş: sa ${w.pencereBitis}</span>`;
    }
    return r + "</span></button>";
  };
  let s = aktif.length ? `<div class="liste">${aktif.map(satir).join("")}</div>` : "<p class='ipucu-metin'>Bu anda aktif savaş yok.</p>";
  if (biten.length) s += `<h3>Son sonuçlar</h3><div class="liste">${biten.map(satir).join("")}</div>`;
  return s;
}
