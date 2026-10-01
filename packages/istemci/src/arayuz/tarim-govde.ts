/**
 * Tarım ve iklim paneli içerik üreticileri (saf: durum -> HTML dizgisi): bölge tarım bölümü, "Olaylar" sekmesi,
 * "Tarım" görünümü lejantı ve üst çubuktaki hasat ritmi çubukları. Ürünler, olay türleri ve iklim tipleri dizinden gelir.
 */
import type { GovdeDurumu } from "./govde";
import { esc, sinirla, yuzde } from "./bicim";
import { AY_ADLARI, AY_KISA, ekimMetni, hasatMetni, hasatYukseklikleri, iklimTipiAdi, olayEvresi, olaySimgesi, olaylariSirala, sureMetni, takvimDurumu, takvimMetni, takvimParametresi, tarimOzeti, toprakVerimi } from "../veri/tarim";
import type { DizinTarim, OlayKaresi } from "../veri/kare-tipleri";

const cubuk = (p: number): string => `<span class="cubuk-iz"><span style="width:${sinirla(p, 0, 100)}%"></span></span>`;

/** Olay rozeti: türün renginde daire, içinde beyaz simge (küredeki rozetle aynı çizim). */
export function olayRozeti(tur: string, boy: number): string {
  const s = olaySimgesi(tur);
  return `<span class="olay-rozet" style="--oc:var(${s.renkDegiskeni});width:${boy}px;height:${boy}px"><svg viewBox="-10 -10 20 20" width="${Math.round(boy * 0.72)}" height="${Math.round(boy * 0.72)}" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${s.ikon}</svg></span>`;
}

function olayTuru(t: DizinTarim, o: OlayKaresi): string {
  return t.olayTurleri[o.tur] ?? "";
}

/** 12 aylık hasat ritmi çubukları; geçerli ay vurgulu. `etiket`: ay baş harflerini altına yazar. */
export function hasatCubuklari(aylik: readonly number[], ay: number, etiket: boolean): string {
  const h = hasatYukseklikleri(aylik);
  return h
    .map((y, m) => {
      const v = aylik[m] as number;
      const baslik = `${AY_ADLARI[m]}: hasat oranı ${hasatMetni(v)} (yıllık ortalama = %100)`;
      return `<span class="hasat-sutun${m === ay ? " su-an" : ""}" title="${esc(baslik)}"><i style="--y:${(0.06 + y * 0.94).toFixed(3)}"></i>${etiket ? `<em>${esc((AY_KISA[m] ?? "").charAt(0))}</em>` : ""}</span>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------------------------
// Bölge paneli: Tarım bölümü
// ---------------------------------------------------------------------------------------------

/** Ekim karışımı çubuğu: ürün başına bir dilim (desenli; haritadaki ekim desenleriyle aynı). */
function ekimCubugu(ekim: readonly number[], urunler: ReadonlyArray<{ ad: string }>): string {
  const dilimler = ekim
    .map((y, i) => (y > 0 ? `<span class="ekim-dilim ekim-${Math.min(3, i)}" style="flex:${y}" title="${esc(urunler[i]?.ad ?? "")} ${yuzde(y)}"></span>` : ""))
    .join("");
  return `<span class="ekim-cubuk" role="img" aria-label="Ekim karışımı">${dilimler}</span>`;
}

/** Bölge panelinin Tarım bölümü; tarım kapalıysa boş dizgi. */
export function bolgeTarimBolumu(g: GovdeDurumu, i: number): string {
  const { kare, dizin } = g;
  const t = dizin?.tarim;
  if (!kare || !dizin || !t) return "";
  const tanim = t.bolgeler[i];
  const tk = kare.bolgeler[i]?.tarim;
  let s = "<h3>Tarım</h3>";
  if (!tanim || !tk) {
    return s + "<p class='ipucu-metin'>Bu bölge tarım dışı: toprak, iklim ve olay çarpanı uygulanmaz.</p>";
  }
  const [tip, tabanBinde, tavan, sulanabilir] = tanim;
  const [toprak, iklim, kayip, doz, gubreKars, ekim] = tk;
  const verim = toprakVerimi(tabanBinde, toprak);
  s += `<div class="satir"><span class="ad">İklim tipi</span><span>${esc(iklimTipiAdi(t.iklimTipleri[tip] ?? ""))}</span></div>`;
  s += `<div class="satir"><span class="ad">Toprak durumu</span><span class="sayi">${yuzde(Math.round(toprak / 10))} ${cubuk(toprak / 10)}</span></div>`;
  s += `<div class="satir"><span class="ad">Toprak verimliliği</span><span class="sayi">${yuzde(Math.round(verim * 100))} <span class="soluk">(taban ${yuzde(Math.round(tabanBinde / 10))})</span></span></div>`;
  s += `<div class="satir ekim-satir"><span class="ad">Ekim karışımı</span><span class="ekim-sag">${ekimCubugu(ekim, t.urunler)}<span class="soluk ekim-metin">${esc(ekimMetni(ekim, t.urunler))}</span></span></div>`;
  s += `<div class="satir"><span class="ad">Gübre dozu</span><span class="sayi">${doz} / ${t.azamiGubreDozu}${doz > 0 ? ` <span class="soluk">· karşılanma ${yuzde(gubreKars)}</span> ${cubuk(gubreKars)}` : " <span class='soluk'>(gübre yok)</span>"}</span></div>`;
  s += `<div class="satir"><span class="ad">İklim çarpanı</span><span class="sayi">${hasatMetni(iklim)} <span class="soluk">(yıllık ort. %100)</span></span></div>`;
  s += `<div class="satir"><span class="ad">Olay kaybı</span><span class="sayi ${kayip > 0 ? "asagi" : ""}">${kayip > 0 ? "−" : ""}${yuzde(Math.round(kayip / 10))}</span></div>`;
  s += `<div class="satir"><span class="ad">Tarım tesisi tavanı</span><span class="sayi">${tavan} <span class="soluk">· sulanabilir ${yuzde(sulanabilir)}</span></span></div>`;
  // Bu bölgeyi etkileyen (veya yakında etkileyecek) olaylar
  const olaylar = (kare.iklim?.olaylar ?? []).flatMap((o) => {
    const e = o.etki.find((x) => x[0] === i);
    const evre = olayEvresi(o, kare.saat);
    return e && evre !== "bitti" ? [{ o, evre, siddet: e[1] }] : [];
  });
  if (olaylar.length) {
    s += `<div class="olay-ozet">${olaylar
      .map(({ o, evre, siddet }) => {
        const tur = olayTuru(t, o);
        const ad = olaySimgesi(tur).ad;
        return `<span class="olay-cip">${olayRozeti(tur, 16)} <b>${esc(ad)}</b> ${evre === "uyari" ? `uyarı (${sureMetni(o.baslangic - kare.saat)} sonra)` : `etkin · bu bölgede ${yuzde(siddet)}`}</span>`;
      })
      .join("")}</div>`;
  }
  return s;
}

// ---------------------------------------------------------------------------------------------
// Lejant ve özetler
// ---------------------------------------------------------------------------------------------

/** "Tarım" görünümü lejantı: verimlilik rampası, ekim desenleri, iklim tipleri (ritim çizgileriyle). */
export function tarimLejanti(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  const t = dizin?.tarim;
  if (!kare || !dizin || !t) return "";
  const urunler = t.urunler;
  const desenAd = (i: number): string => (i === 0 ? "düz" : i === 1 ? "noktalı" : i === 2 ? "çizgili" : "çapraz");
  let s = `<div class="gosterge"><span class="g-oge">Dolgu: toprak verimliliği</span><span class="soluk">%20</span><span class="rampa toprak-rampa" aria-hidden="true"></span><span class="soluk">%120</span></div>`;
  s += `<div class="gosterge"><span class="g-oge">Desen: baskın ürün (≥ %70)</span></div><div class="gosterge">`;
  urunler.slice(0, 3).forEach((u, i) => {
    s += `<span class="g-oge"><i class="g-kutu g-toprak ekim-${i}"></i>${esc(u.ad)} (${desenAd(i)})</span>`;
  });
  s += `<span class="g-oge"><i class="g-kutu g-toprak ekim-3"></i>Karışık (çapraz)</span><span class="g-oge"><i class="g-kutu" style="background:var(--tarim-disi)"></i>Tarım dışı</span></div>`;
  // İklim tipleri: bölge sayısı ve 12 aylık ritim
  const sayi = new Array<number>(t.iklimTipleri.length).fill(0);
  for (const b of t.bolgeler) if (b) sayi[b[0]] = (sayi[b[0]] ?? 0) + 1;
  const mx = Math.max(1, ...t.hasatTipleri.flat());
  s += `<h3>İklim tipleri</h3><div class="iklim-liste">`;
  t.iklimTipleri.forEach((tip, k) => {
    const egri = t.hasatTipleri[k] ?? [];
    const cizgi = egri.map((v, m) => `<i style="--y:${(0.08 + (v / mx) * 0.92).toFixed(3)}" title="${esc(AY_ADLARI[m] ?? "")}: ${hasatMetni(v)}"></i>`).join("");
    s += `<div class="iklim-satir"><span><b>${esc(iklimTipiAdi(tip))}</b> <span class="soluk">${sayi[k] ?? 0} bölge</span></span><span class="mini-ritim" aria-label="12 aylık hasat ritmi">${cizgi}</span></div>`;
  });
  s += `</div><p class="ipucu-metin">Çubuklar Ocak’tan Aralık’a aylık hasat oranıdır; bölgeye dokununca tipi ve toprağı yan panelde görünür.</p>`;
  return s;
}

/** Haritanın altındaki tek satır: Tarım görünümünün özeti (seçili bölge varsa onun tarım durumu). */
export function tarimNedenSatiri(g: GovdeDurumu): string {
  const { kare, dizin, bolge } = g;
  const t = dizin?.tarim;
  if (!kare || !dizin || !t) return "";
  if (bolge >= 0) {
    const ad = esc(g.bolgeAd(bolge));
    const tk = kare.bolgeler[bolge]?.tarim;
    const tanim = t.bolgeler[bolge];
    if (!tk || !tanim) return `<b>${ad}</b>: tarım dışı bölge.`;
    return `<b>${ad}</b> · toprak verimliliği ${yuzde(Math.round(toprakVerimi(tanim[1], tk[0]) * 100))} · ekim: ${esc(ekimMetni(tk[5], t.urunler))} · iklim hasat ${hasatMetni(tk[1])}${tk[2] > 0 ? ` · olay kaybı ${yuzde(Math.round(tk[2] / 10))}` : ""}`;
  }
  const oz = tarimOzeti(kare, dizin);
  const ol = olaylariSirala(kare.iklim?.olaylar ?? [], kare.saat);
  const aktif = ol.filter((x) => x.evre === "aktif").length;
  const uyari = ol.length - aktif;
  let s = `<b>Tarım görünümü</b>: ${oz.tarimBolgesi} tarım bölgesinde ortalama toprak verimliliği ${yuzde(Math.round(oz.ortVerim * 100))}`;
  if (oz.enDusuk) s += `; en düşük ${esc(g.bolgeAd(oz.enDusuk.bolge))} (${yuzde(Math.round(oz.enDusuk.verim * 100))})`;
  s += `. ${aktif} etkin olay, ${uyari} uyarı.`;
  s += `<div class="seri-lejant"><span class="rampa toprak-rampa" aria-hidden="true"></span><span class="soluk">düşük → yüksek verimlilik · desen = baskın ürün</span></div>`;
  return s;
}

/** Genel görünümün şeridine eklenecek kısa olay özeti (olay yoksa boş). */
export function olayOzeti(g: GovdeDurumu): string {
  const { kare } = g;
  if (!kare?.iklim) return "";
  const ol = olaylariSirala(kare.iklim.olaylar, kare.saat);
  if (!ol.length) return "";
  const aktif = ol.filter((x) => x.evre === "aktif").length;
  return ` · <b>İklim:</b> ${aktif} etkin olay${ol.length > aktif ? `, ${ol.length - aktif} uyarı` : ""} (Olaylar sekmesi)`;
}

// ---------------------------------------------------------------------------------------------
// Olaylar sekmesi
// ---------------------------------------------------------------------------------------------

export function olayPaneli(g: GovdeDurumu): string {
  const { kare, dizin } = g;
  const t = dizin?.tarim;
  if (!kare || !dizin) return "";
  if (!t) return "<p class='ipucu-metin'>Bu veri paketinde tarım ve iklim katmanı kapalı.</p>";
  const takvim = takvimDurumu(kare.saat, takvimParametresi(t));
  const aylikHasat = t.hasatAylik[takvim.ay] ?? 1000;
  let s = `<div class="takvim-kutu"><div class="takvim-baslik"><b>${esc(takvimMetni(takvim))}</b> <span class="soluk">· ${takvim.yil}. yıl · bu ay hasat ${hasatMetni(aylikHasat)}</span></div><div class="hasat-buyuk">${hasatCubuklari(t.hasatAylik, takvim.ay, true)}</div><p class="ipucu-metin">Hasat ritmi: tarım bölgelerinin aylık ortalama hasat oranı (çubuk yüksekliği; yıllık ortalama %100). Vurgulu çubuk içinde bulunduğumuz aydır.</p></div>`;
  const liste = olaylariSirala(kare.iklim?.olaylar ?? [], kare.saat);
  const satir = ({ olay: o, evre }: (typeof liste)[number]): string => {
    const tur = olayTuru(t, o);
    const sim = olaySimgesi(tur);
    const kalan = evre === "aktif" ? o.bitis - kare.saat : o.baslangic - kare.saat;
    const alan = o.etki.length;
    return `<button type="button" class="liste-satir olay-satir" data-bolge="${o.merkez}">
<span class="olay-sol">${olayRozeti(tur, 28)}<span><b>${esc(sim.ad)}</b> — ${esc(g.bolgeAd(o.merkez))}<br><span class="soluk">merkezde ${yuzde(o.siddet)} · ${alan} bölgeye yayılır · ${esc(sim.etki)}</span></span></span>
<span class="olay-sag"><span class="rozet olay-evre ${evre}">${evre === "aktif" ? "ETKİN" : "UYARI"}</span><br><span class="soluk">${evre === "aktif" ? `${sureMetni(kalan)} kaldı` : `${sureMetni(kalan)} sonra başlar`}</span></span></button>`;
  };
  const aktif = liste.filter((x) => x.evre === "aktif");
  const uyari = liste.filter((x) => x.evre === "uyari");
  s += `<h3>Etkin olaylar (${aktif.length})</h3>`;
  s += aktif.length ? `<div class="liste">${aktif.map(satir).join("")}</div>` : "<p class='ipucu-metin'>Şu an etkin iklim olayı yok.</p>";
  s += `<h3>Uyarıdakiler (${uyari.length})</h3>`;
  s += uyari.length ? `<div class="liste">${uyari.map(satir).join("")}</div>` : `<p class='ipucu-metin'>Uyarıda olay yok. Olaylar, başlamadan ${t.uyariSaat} sa önce ilan edilir.</p>`;
  s += `<p class="ipucu-metin">Bir olaya dokunarak merkez bölgeye uçabilirsiniz. Küre üzerinde etkin olay dolu, uyarıdaki olay kesikli nabız halkasıyla görünür.</p>`;
  s += `<h3>Olay türleri</h3><div class="olay-lejant">${t.olayTurleri.map((tur) => `<span class="g-oge">${olayRozeti(tur, 20)}${esc(olaySimgesi(tur).ad)}</span>`).join("")}</div>`;
  return s;
}

/** Olaylar sekmesi etiketindeki sayı (etkin + uyarıdaki). */
export function olaySayisi(g: GovdeDurumu): number {
  const kare = g.kare;
  if (!kare?.iklim) return 0;
  return olaylariSirala(kare.iklim.olaylar, kare.saat).length;
}
