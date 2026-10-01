/**
 * Panel içerik üreticileri (saf): anlık görüntü + dizin + durum -> HTML dizgisi.
 * Bilgiler izleyicideki ile aynıdır (bölge ayrıntısı, neden satırı, hazineler, savaşlar) + darboğaz listesi.
 */
import { hucre, kareTuret, darbogazlar, kenarKullanimi } from "../veri/kapsam";
import type { Hucre, KapsamDurumu } from "../veri/kapsam";
import type { Dizin, Kare } from "../veri/kare-tipleri";
import { malRengiHex, sekilKodu } from "../veri/renkler";
import { esc, fmt, fmt1, kisalt, sinirla } from "./bicim";
import { bolgeTarimBolumu, olayOzeti, tarimLejanti, tarimNedenSatiri } from "./tarim-govde";
import { baglamKur, kenarGelistirDugmesi, komutBolumu } from "./komut-govde";
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
  kapasite: "yol var ama kenar dolu (kapasite)",
  girdi_eksik: "girdi yok, hiçbir yerde fazla üretim yok",
  mesafe: "en yakın kaynak çok uzak",
  erisim_yok: "yol yok, kaynağa erişilemiyor",
};
export const NEDEN_KISA: Record<string, string> = {
  kapasite: "kapasite dolu",
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
  mal: number;
  /** "Tarım" harita görünümü açık mı (mal seçimini geçersiz kılar). */
  tarimGorunumu?: boolean;
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
  const s = `${ad}: %${100 - h.pct} eksik — `;
  if (h.neden === "mesafe") return s + "en yakın kaynak çok uzak" + (h.sure >= 0 ? ` (${h.sure} sa)` : "");
  return s + (NEDEN_AD[h.neden] ?? "neden bilinmiyor");
}

// ---------------------------------------------------------------------------------------------
// Bölge
// ---------------------------------------------------------------------------------------------

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
  s += `<div class="satir"><span class="ad">Gıda karşılanma</span><span class="sayi">%${bk.gida} ${cubuk(bk.gida)}</span></div>`;
  if (bk.ordu.length) {
    s += `<div class="satir"><span class="ad">Ordu</span><span class="sayi">${bk.ordu.map((o) => `${fmt(o[1])}× ${esc(dizin.birlikler[o[0]]?.ad ?? "?")}`).join(", ")}</span></div>`;
    s += `<div class="satir"><span class="ad">İkmal karşılanma</span><span class="sayi">%${bk.ikmal} ${cubuk(bk.ikmal)}</span></div>`;
    s += `<div class="satir"><span class="ad">Duruş</span><span>${["normal", "savunma", "geri çekil"][bk.durus] ?? "?"}</span></div>`;
  }
  s += bolgeTarimBolumu(g, i);
  s += `<h3>Mallar</h3><div class="tablo-kap"><table class="mini-tablo"><thead><tr><th>Mal</th><th class="sayi">Stok</th><th class="sayi">Üretim/sa</th><th>Karşılanma</th></tr></thead><tbody>`;
  for (let m = 0; m < nm; m++) {
    const h = hucre(kare, t, i, m);
    const kars =
      h.d === "sahipsiz" || h.d === "ilgisiz" ? "<span class='soluk'>—</span>" : h.d === "karsilanan" ? "<span>✓ %100</span>" : `<span>${DURUM_AD[h.d]} %${h.pct} · ${esc(NEDEN_KISA[h.neden] ?? "")}</span>`;
    const sel = g.mal === m ? " class='secili-satir'" : "";
    s += `<tr${sel}><td>${malIkonu(dizin, m, 11)} ${esc(dizin.mallar[m]?.ad ?? "?")}</td><td class="sayi">${fmt(bk.stok[m] ?? 0)}</td><td class="sayi">${bk.uretim[m] ? fmt1(bk.uretim[m] as number) : "<span class='soluk'>0</span>"}</td><td>${kars}</td></tr>`;
  }
  s += "</tbody></table></div>";
  if (bk.tesis.length) {
    s += `<h3>Tesisler (${bk.tesis.length})</h3><div class="tablo-kap"><table class="mini-tablo"><thead><tr><th>Tesis</th><th>Yöntem</th><th class="sayi">Verim</th><th class="sayi">İşçi</th></tr></thead><tbody>`;
    for (const x of bk.tesis) {
      s += `<tr><td>${esc(dizin.tesisTurleri[x[0]]?.ad ?? "?")}</td><td>${esc(dizin.yontemler[x[1]]?.ad ?? "?")}${x[2] ? "" : " <span class='soluk'>(pasif)</span>"}</td><td class="sayi">%${x[3]}</td><td class="sayi">%${x[4]}</td></tr>`;
    }
    s += "</tbody></table></div>";
  }
  const gel = t.gelen[i] ?? [], gid = t.giden[i] ?? [];
  if (gel.length || gid.length) {
    const topla = (liste: typeof gel): string => {
      const o = new Map<number, number>();
      for (const a of liste) o.set(a[0], (o.get(a[0]) ?? 0) + a[1]);
      return [...o.entries()].map(([m, v]) => `${esc(dizin.mallar[m]?.ad ?? "?")} ${fmt1(v)}`).join(", ");
    };
    s += "<h3>Akışlar (birim/sa)</h3>";
    if (gel.length) s += `<div class="satir"><span class="ad" style="flex:none">Gelen</span><span style="text-align:right;flex:1">${topla(gel)}</span></div>`;
    if (gid.length) s += `<div class="satir"><span class="ad" style="flex:none">Giden</span><span style="text-align:right;flex:1">${topla(gid)}</span></div>`;
  }
  return s + komutBolumu(g, i);
}

// ---------------------------------------------------------------------------------------------
// Mal sekmesi ve "neden" satırı
// ---------------------------------------------------------------------------------------------

export function malPaneli(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  if (!kare || !dizin) return "";
  let s = `<p class="ipucu-metin">Bir görünüm veya mal seçin: bölgeler sahip devlete, seçili malın kapsam durumuna (neresi açık ve neden) ya da tarım verimliliğine boyanır. Akış parçacıkları malın rengindedir.</p>`;
  if (g.tarimGorunumu && dizin.tarim) s += `<h3>Tarım görünümü göstergesi</h3>` + tarimLejanti(g) + `<h3>Görünüm ve mal</h3>`;
  s += `<div class="mal-liste">`;
  s += `<button type="button" class="mal-satir${g.mal < 0 && !g.tarimGorunumu ? " secili" : ""}" data-mal="-1"><span>Hepsi (sahip devlet rengi)</span></button>`;
  if (dizin.tarim) s += `<button type="button" class="mal-satir${g.tarimGorunumu ? " secili" : ""}" data-gorunum="tarim" aria-pressed="${g.tarimGorunumu === true}"><span>${yaprakIkonu(12)} Tarım (toprak verimliliği ve ekim deseni)</span></button>`;
  const MN = 0.3, MX = 2.0;
  const poz = (v: number): number => sinirla((v - MN) / (MX - MN), 0, 1) * 100;
  dizin.mallar.forEach((mal, m) => {
    const v = (kare.fiyat[m] ?? 1000) / 1000;
    const a = poz(1), b = poz(v);
    const yuk = v >= 1;
    s += `<button type="button" class="mal-satir${g.mal === m && !g.tarimGorunumu ? " secili" : ""}" data-mal="${m}" aria-pressed="${g.mal === m && !g.tarimGorunumu}"><span>${malIkonu(dizin, m, 12)} ${esc(mal.ad)}</span><span class="fiyat-iz"><span class="fiyat-dolgu" style="left:${Math.min(a, b)}%;width:${Math.abs(b - a)}%;background:${yuk ? "var(--k-acik)" : "var(--k-karsilanan)"}"></span><span class="fiyat-orta" style="left:${a}%"></span></span><span class="sayi">%${Math.round(v * 100)}</span></button>`;
  });
  s += `</div><p class="ipucu-metin">Fiyat çubuğu: çizgi = taban fiyat (%100); sağa uzayan pahalı (talep &gt; arz), sola uzayan ucuz.</p>`;
  if (g.tarimGorunumu) return s;
  s += `<h3>Gösterge</h3><div class="gosterge">
<span class="g-oge"><i class="g-kutu" style="background:var(--k-karsilanan)"></i>Karşılanan</span>
<span class="g-oge"><i class="g-kutu g-nokta" style="background:var(--k-kismi)"></i>Kısmi (noktalı)</span>
<span class="g-oge"><i class="g-kutu g-cizgi" style="background:var(--k-acik)"></i>Açık (çizgili)</span>
<span class="g-oge"><i class="g-kutu g-capraz" style="background:var(--k-engelli)"></i>Engelli (çapraz)</span>
</div>
<div class="gosterge"><span class="g-oge">Kenar: kalınlık = kapasite · renk = kullanım</span><span class="rampa" aria-hidden="true"></span><span class="soluk">boş → dolu</span></div>
<div class="gosterge"><span class="g-oge">Şekil: ● ham · ◆ ara · ■ tüketim · ▲ askeri</span></div>`;
  return s;
}

/** Haritanın altındaki tek satır "neresi açık ve neden" (U5). HTML döner. */
export function nedenSatiri(g: GovdeDurumu): string {
  const { kare, dizin, mal: m, bolge } = g;
  if (!kare || !dizin) return "";
  if (g.tarimGorunumu && dizin.tarim) return tarimNedenSatiri(g);
  const t = kareTuret(kare, dizin.oyuncular.length);
  const nb = dizin.bolgeler.length, nm = dizin.mallar.length;
  if (bolge >= 0) {
    const ad = esc(g.bolgeAd(bolge));
    if (m >= 0) {
      const h = hucre(kare, t, bolge, m);
      const mad = esc(dizin.mallar[m]?.ad ?? "?");
      if (h.d === "sahipsiz") return `<b>${ad}</b>: sahipsiz bölge; lojistiğe katılmaz.`;
      if (h.d === "karsilanan") return `<b>${mad}</b> — ${ad}: talep karşılanıyor.`;
      if (h.d === "ilgisiz") return `<b>${mad}</b> — ${ad}: bu malın üretimi, stoku veya akışı yok.`;
      return `<b>${ad}</b> · ${esc(nedenMetni(dizin, h, m))}`;
    }
    if ((kare.bolgeler[bolge]?.sahip ?? -1) < 0) return `<b>${ad}</b>: sahipsiz bölge; lojistiğe katılmaz.`;
    const acik: Array<{ m: number; h: Hucre }> = [];
    for (let mm = 0; mm < nm; mm++) {
      const h = hucre(kare, t, bolge, mm);
      if (h.d !== "karsilanan" && h.d !== "ilgisiz" && h.d !== "sahipsiz") acik.push({ m: mm, h });
    }
    if (!acik.length) return `<b>${ad}</b>: tüm mallar karşılanıyor.`;
    return `<b>${ad}</b> · ` + acik.slice(0, 2).map((x) => esc(nedenMetni(dizin, x.h, x.m))).join(" · ") + (acik.length > 2 ? ` · +${acik.length - 2} mal daha` : "");
  }
  if (m >= 0) {
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
    const mad = esc(dizin.mallar[m]?.ad ?? "?");
    return `<b>${mad}</b>: ${top} ilgili bölgenin ` + (kalan === 0 ? "hepsi karşılanıyor." : `${kalan}'i eksik (açık ${say.acik}, kısmi ${say.kismi}, engelli ${say.engelli}) — başlıca neden: ${esc(nn)}.`) + " <span class='soluk'>Ayrıntı için bir bölgeye dokunun.</span>";
  }
  const nn2: Record<string, number> = {};
  for (const c of kare.kapsam) if (c[3] > 0) nn2[["yok", "kapasite", "girdi_eksik", "mesafe", "erisim_yok"][c[3]] ?? "yok"] = (nn2[["yok", "kapasite", "girdi_eksik", "mesafe", "erisim_yok"][c[3]] ?? "yok"] ?? 0) + 1;
  const en = Object.keys(nn2).sort((a, b) => (nn2[b] ?? 0) - (nn2[a] ?? 0)).map((n) => `${NEDEN_KISA[n] ?? n} ${nn2[n]}`).join(", ");
  return `Şu an ${kare.kapsam.length} bölge×mal hücresi tam karşılanmıyor` + (en ? ` (${esc(en)})` : "") + olayOzeti(g) + ". <span class='soluk'>Üstteki çubuktan bir mal seçerek “neresi açık” görünümüne geçin.</span>";
}

// ---------------------------------------------------------------------------------------------
// Hazineler, darboğazlar, savaşlar
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

export function darbogazPaneli(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  if (!kare || !dizin) return "";
  const liste = darbogazlar(kare, 0.9);
  let s = `<p class="ipucu-metin">Kullanımı %90 ve üstü olan lojistik kenarları (kalın ve parlayan şeritler). Birine dokunarak oraya uçabilirsiniz.</p>`;
  if (!liste.length) s += "<p class='ipucu-metin'>Şu an doygun kenar yok.</p>";
  else {
    s += "<div class='liste'>";
    for (const d of liste.slice(0, 12)) {
      const e = dizin.kenarlar[d.kenar];
      if (!e) continue;
      const a = g.bolgeAd(e.a), b = g.bolgeAd(e.b);
      const k = kare.kenarlar[d.kenar] as [number, number, number];
      s += `<div class="liste-kap"><button type="button" class="liste-satir" data-kenar="${d.kenar}"><span><b>${esc(a)} — ${esc(b)}</b><br><span class="soluk">${e.tur} yolu, ${e.sure} sa</span></span><span class="sayi">%${Math.round(d.kullanim * 100)}<br><span class="soluk">${fmt1(k[0])}/sa${k[2] > 0 ? ` · askeri ${fmt1(k[2])}` : ""}</span></span></button>${baglamKur(g) ? `<div class="kenar-eylem">${kenarGelistirDugmesi(g, d.kenar)}</div>` : ""}</div>`;
    }
    s += "</div>";
  }
  // En çok eksik olan bölge x mal hücreleri
  const t = kareTuret(kare, dizin.oyuncular.length);
  const acik: Array<{ b: number; m: number; h: Hucre }> = [];
  for (const c of kare.kapsam) {
    const h = hucre(kare, t, c[0], c[1]);
    if (h.d === "acik" || h.d === "engelli") acik.push({ b: c[0], m: c[1], h });
  }
  acik.sort((x, y) => x.h.pct - y.h.pct);
  s += `<h3>En açık hücreler</h3>`;
  if (!acik.length) s += "<p class='ipucu-metin'>Açık veya engelli hücre yok.</p>";
  else {
    s += "<div class='liste'>";
    for (const x of acik.slice(0, 8)) {
      s += `<button type="button" class="liste-satir" data-bolge="${x.b}" data-mal="${x.m}"><span>${malIkonu(dizin, x.m, 11)} <b>${esc(g.bolgeAd(x.b))}</b><br><span class="soluk">${esc(dizin.mallar[x.m]?.ad ?? "")}: ${esc(NEDEN_KISA[x.h.neden] ?? "")}</span></span><span class="sayi">%${x.h.pct}<br><span class="soluk">${DURUM_AD[x.h.d]}</span></span></button>`;
    }
    s += "</div>";
  }
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
      r += `${sal ? "saldıran kazandı" : "savunan kazandı"}<br><span class="soluk">güç ${fmt(w.sonuc.saldiranGuc)} / ${fmt(w.sonuc.savunanGuc)} · kayıp %${w.sonuc.kayipYuzde}</span>`;
    } else {
      r += `<span class="rozet belirsiz">${ev}</span><br><span class="soluk">bitiş: sa ${w.pencereBitis}</span>`;
    }
    return r + "</span></button>";
  };
  let s = aktif.length ? `<div class="liste">${aktif.map(satir).join("")}</div>` : "<p class='ipucu-metin'>Bu anda aktif savaş yok.</p>";
  if (biten.length) s += `<h3>Son sonuçlar</h3><div class="liste">${biten.map(satir).join("")}</div>`;
  return s;
}

/** Kenar kullanımı ipucu (küre üzerindeki kenar listesinden). */
export function kenarMetni(g: GovdeDurumu, i: number): string {
  const { kare, dizin } = g;
  if (!kare || !dizin) return "";
  const e = dizin.kenarlar[i], c = kare.kenarlar[i];
  if (!e || !c) return "";
  const u = kenarKullanimi(c);
  return `<b>${esc(g.bolgeAd(e.a))} — ${esc(g.bolgeAd(e.b))}</b><br>${e.tur} yolu, ${e.sure} sa<br>Kapasite ${fmt1(c[0])}/sa · kullanım %${Math.round(u * 100)}` + (u >= 0.9 ? "<br><b>Darboğaz: %90 üstü dolu</b>" : "");
}

