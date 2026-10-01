/**
 * Komut arayüzünün içerik üreticileri (saf: durum -> HTML dizgisi). Formlar komut kaydından (komut/kayit.ts)
 * türetilir; burada yalnızca genel çizim vardır, komuta özgü bilgi yoktur.
 */
import { BOLGE_GRUPLARI, DEVLET_GRUPLARI, anlasmaDurumu, eylemMetni, kenarNedeni, kenarOnizleme, komutTanimi, sureMetni } from "../komut/kayit";
import { oneriNedeni } from "../komut/oneri-metin";
import type { Icerik } from "../komut/tablo";
import type { Alan, Baglam, Girdi, KomutTanimi } from "../komut/tipler";
import type { Oneri } from "../isci/protokol";
import { esc, fmt, kisalt } from "./bicim";
import type { GovdeDurumu } from "./govde";

/** Arayüzün komutlara ilişkin tuttuğu durum (form değerleri, açık bölümler, öneriler). */
export interface OyunDurumu {
  ic: Icerik;
  /** "kapsam:formId:alan" -> metin (kullanıcının yazdığı değerler; yeniden çizimde korunur). */
  formlar: Map<string, string>;
  /** Açık tutulan form bölümleri (form kimliği). */
  acik: Set<string>;
  oneriler: Oneri[] | null;
}

export function yeniOyunDurumu(ic: Icerik): OyunDurumu {
  return { ic, formlar: new Map(), acik: new Set(["tesis_insa"]), oneriler: null };
}

/** Komut formları için bağlam; oyuncu kipinde değilse veya kare henüz yoksa null. */
export function baglamKur(g: GovdeDurumu): Baglam | null {
  const { kare, dizin, oyun } = g;
  if (!kare?.oyuncu || !dizin || !oyun) return null;
  return { ic: oyun.ic, dizin, kare, ben: kare.oyuncu, bolge: g.bolge, bolgeAd: g.bolgeAd };
}

const devletAd = (b: Baglam, oyuncu: number): string => b.dizin.devletler[b.dizin.oyuncular[oyuncu]?.devlet ?? -1]?.ad ?? "?";

// ---------------------------------------------------------------------------------------------
// Form çizimi
// ---------------------------------------------------------------------------------------------

function alanAdlari(alanlar: Alan[]): string[] {
  return alanlar.flatMap((a) => (a.tip === "paylar" ? a.kalemler.map((_, i) => `${a.ad}.${i}`) : [a.ad]));
}

/** Varsayılan + kullanıcı değerleri; seçim alanlarında geçersiz değer ilk uygun seçeneğe döner. */
export function formDegerleri(t: KomutTanimi, b: Baglam, oyun: OyunDurumu, kapsam: string, ek: Girdi = {}): { g: Girdi; alanlar: Alan[] } {
  const oku = (g: Girdi, alanlar: Alan[]): Girdi => {
    const y: Girdi = { ...g };
    for (const ad of alanAdlari(alanlar)) {
      const v = oyun.formlar.get(`${kapsam}:${t.id}:${ad}`);
      if (v !== undefined) y[ad] = v;
    }
    return y;
  };
  let g: Girdi = { ...t.varsayilan(b), ...ek };
  // İkinci tur: seçenekler önceki alanların değerine bağlı olabilir (ör. tesis -> yöntem).
  for (let tur = 0; tur < 2; tur++) {
    const alanlar = t.alanlar(b, g);
    g = oku(g, alanlar);
    for (const a of alanlar) {
      if (a.tip !== "secim") continue;
      if (!a.secenekler.some((s) => s.deger === g[a.ad] && s.devre === undefined)) {
        const ilk = a.secenekler.find((s) => s.devre === undefined);
        if (ilk) g[a.ad] = ilk.deger;
        else delete g[a.ad];
      }
    }
  }
  return { g, alanlar: t.alanlar(b, g) };
}

function alanHtml(a: Alan, g: Girdi, id: string): string {
  if (a.tip === "secim") {
    const bos = a.secenekler.every((s) => s.devre !== undefined);
    const op = a.secenekler.map((s) => `<option value="${esc(s.deger)}"${s.deger === g[a.ad] ? " selected" : ""}${s.devre !== undefined ? " disabled" : ""}>${esc(s.etiket)}</option>`).join("");
    return `<label class="alan"><span>${esc(a.etiket)}</span><select name="${esc(a.ad)}" id="${id}-${esc(a.ad)}"${bos ? " disabled" : ""}>${op}</select></label>`;
  }
  if (a.tip === "sayi") {
    const aralik = a.max - a.min <= 100 && a.adim === 1 && a.birim === "%";
    const deger = g[a.ad] ?? "";
    if (aralik) {
      return `<label class="alan"><span>${esc(a.etiket)}</span><span class="aralik"><input type="range" name="${esc(a.ad)}" min="${a.min}" max="${a.max}" step="${a.adim}" value="${esc(deger)}"><output>%${esc(deger)}</output></span></label>`;
    }
    return `<label class="alan"><span>${esc(a.etiket)}</span><span class="sayi-kutu"><input type="number" inputmode="decimal" name="${esc(a.ad)}" min="${a.min}" max="${a.max}" step="${a.adim}" value="${esc(deger)}">${a.birim ? `<small class="soluk">${esc(a.birim)}</small>` : ""}</span></label>`;
  }
  const satir = a.kalemler.map((k, i) => `<label class="pay"><span>${esc(k)}</span><input type="number" inputmode="numeric" name="${esc(a.ad)}.${i}" min="0" max="${a.toplam}" step="1" value="${esc(g[`${a.ad}.${i}`] ?? "0")}"></label>`).join("");
  return `<fieldset class="paylar"><legend>${esc(a.etiket)}</legend>${satir}</fieldset>`;
}

/** Tek bir komut formu (açılır bölüm). `kapsam`: bölge indeksi ya da "d" (devlet). */
export function formHtml(t: KomutTanimi, b: Baglam, oyun: OyunDurumu, kapsam: string, ek: Girdi = {}): string {
  const neden = t.uygun(b);
  if (neden) return `<div class="komut kapali"><span>${esc(t.ad)}</span><span class="soluk">${esc(neden)}</span></div>`;
  const { g, alanlar } = formDegerleri(t, b, oyun, kapsam, ek);
  const id = `f-${kapsam}-${t.id}`;
  const onizleme = (t.onizleme?.(b, g) ?? []).map((s) => `<li${s.durum ? ` class="${s.durum}"` : ""}>${esc(s.metin)}</li>`).join("");
  const bosSecim = alanlar.some((a) => a.tip === "secim" && a.secenekler.every((s) => s.devre !== undefined));
  return `<details class="komut" data-ac="${esc(t.id)}"${oyun.acik.has(t.id) ? " open" : ""}><summary>${esc(t.ad)}</summary>
<form class="komut-form" data-form="${esc(t.id)}" data-kapsam="${esc(kapsam)}" autocomplete="off" novalidate>
<p class="ipucu-metin">${esc(t.aciklama)}</p>${alanlar.map((a) => alanHtml(a, g, id)).join("")}${onizleme ? `<ul class="onizleme">${onizleme}</ul>` : ""}
<button type="submit" class="komut-gonder"${bosSecim ? " disabled" : ""}>${esc(t.gonder)}</button></form></details>`;
}

function grupHtml(grup: { ad: string; formlar: readonly string[] }, b: Baglam, oyun: OyunDurumu, kapsam: string, ek: Girdi = {}): string {
  const h = grup.formlar.map((id) => komutTanimi(id)).flatMap((t) => (t ? [formHtml(t, b, oyun, kapsam, ek)] : []));
  return h.length ? `<h3>${esc(grup.ad)}</h3>${h.join("")}` : "";
}

// ---------------------------------------------------------------------------------------------
// Devam eden işler, öneriler, devlet paneli
// ---------------------------------------------------------------------------------------------

/** Devam eden inşaat, üretim ve araştırmalar. `bolge` >= 0 ise yalnız o bölgenin işleri. */
export function islerHtml(b: Baglam, bolge: number): string {
  const kalan = (bitis: number): string => sureMetni(Math.max(0, bitis - b.kare.saat));
  const satirlar: string[] = [];
  for (const i of b.ben.insaatlar) {
    if (bolge >= 0 && i.bolge !== bolge) continue;
    let ad = "";
    if (i.tur === "tesis") ad = `${b.ic.turler[i.hedef]?.ad ?? "Tesis"} inşaatı`;
    else if (i.tur === "kenar") {
      const e = b.dizin.kenarlar[i.hedef];
      ad = `Yol geliştirme: ${e ? `${b.bolgeAd(e.a)} — ${b.bolgeAd(e.b)}` : ""}`;
    } else if (i.tur === "olcek") ad = `Tesis ölçek yükseltme (${["S", "M", "L"][i.olcek ?? 1]})`;
    else ad = "Genel onarım (tesisler durur)";
    satirlar.push(`<div class="satir is-satir"><span>${esc(ad)}${bolge < 0 ? ` <span class="soluk">· ${esc(b.bolgeAd(i.bolge))}</span>` : ""}</span><span class="sayi">${kalan(i.bitis)} kaldı</span></div>`);
  }
  for (const p of b.ben.partiler) {
    if (bolge >= 0 && p.bolge !== bolge) continue;
    satirlar.push(`<div class="satir is-satir"><span>${p.adet}× ${esc(b.ic.birlikler[p.birlik]?.ad ?? "Birlik")} üretimi${bolge < 0 ? ` <span class="soluk">· ${esc(b.bolgeAd(p.bolge))}</span>` : ""}</span><span class="sayi">${kalan(p.bitis)} kaldı</span></div>`);
  }
  if (bolge < 0 && b.ben.arastirma) satirlar.push(`<div class="satir is-satir"><span>Araştırma: ${esc(b.ic.teknolojiler[b.ben.arastirma.teknoloji]?.ad ?? "?")}</span><span class="sayi">${kalan(b.ben.arastirma.bitis)} kaldı</span></div>`);
  return satirlar.length ? `<h3>Devam eden işler</h3><div class="isler">${satirlar.join("")}</div>` : "";
}

/** "Önerilen eylemler" kutusu: planlayıcının en iyi adayları, tek tıkla uygulanabilir. */
export function oneriKutusu(g: GovdeDurumu): string {
  const b = baglamKur(g);
  if (!b || !g.oyun) return "";
  const liste = g.oyun.oneriler;
  let s = `<section class="oneri" aria-label="Önerilen eylemler"><div class="oneri-baslik"><h3>Önerilen eylemler</h3><button type="button" class="mini-dugme" data-oneri-yenile title="Önerileri yeniden hesapla">Yenile</button></div>`;
  if (liste === null) s += `<p class="ipucu-metin">Öneriler hesaplanıyor…</p>`;
  else if (!liste.length) s += `<p class="ipucu-metin">Şu an önerilecek bir eylem yok (hazine ya da bölge stokları yetersiz olabilir). Zaman ilerleyince yeniden bakın.</p>`;
  else {
    s += `<p class="ipucu-metin">Botların kullandığı planlayıcı, durumunuza göre en yararlı hamleleri seçer. Yeni başlıyorsanız yukarıdan başlayın.</p><ol class="oneri-liste">`;
    liste.forEach((o, i) => {
      s += `<li class="oneri-satir"><div><b>${esc(eylemMetni(o.komut, b))}</b><br><span class="soluk">${esc(oneriNedeni(o))}</span></div><div class="oneri-dugme"><button type="button" class="eylem birincil" data-oneri="${i}">Tek tıkla uygula</button>${o.bolge >= 0 ? `<button type="button" class="eylem" data-bolge="${o.bolge}" title="Bölgeye git">Göster</button>` : ""}</div></li>`;
    });
    s += "</ol>";
  }
  return s + "</section>";
}

/** Diplomasi durumu: her diğer devlet için anlaşma ve yaptırım özeti. */
function diplomasiHtml(b: Baglam): string {
  const satirlar = b.dizin.oyuncular.flatMap((_, i) => {
    if (i === b.ben.idx) return [];
    const durum = (tur: string): string => {
      const a = anlasmaDurumu(b, i, tur);
      return !a ? "—" : a.aktif ? "yürürlükte" : a.benTeklif ? "teklifiniz bekliyor" : "karşı teklif etti";
    };
    const y = [b.ben.yaptirimBen.includes(i) ? "uyguluyorsunuz" : "", b.ben.yaptirimBana.includes(i) ? "size uyguluyor" : ""].filter(Boolean).join(", ") || "—";
    return [`<tr><td><span class="nokta" style="background:var(--d${(b.dizin.oyuncular[i]?.devlet ?? 0) % 4})"></span> ${esc(devletAd(b, i))}</td><td>${durum("ticaret")}</td><td>${durum("ortak_altyapi")}</td><td>${y}</td></tr>`];
  });
  return `<h3>Diplomasi durumu</h3><div class="tablo-kap"><table class="mini-tablo"><thead><tr><th>Devlet</th><th>Ticaret</th><th>Ortak altyapı</th><th>Yaptırım</th></tr></thead><tbody>${satirlar.join("")}</tbody></table></div>`;
}

function izleNotu(): string {
  return `<h3>Komutlar</h3><p class="ipucu-metin">Şu an dünyayı izliyorsunuz: dört bot oynuyor. Komut vermek için bir devlet seçin; o devletin botu devre dışı kalır, diğer üçü oynamaya devam eder.</p><button type="button" class="eylem birincil" data-devlet-sec>Devlet seç</button>`;
}

/** "Devlet" sekmesi: özet, devam eden işler, öneriler, devlet geneli komutlar ve diplomasi. */
export function devletPaneli(g: GovdeDurumu): string {
  const b = baglamKur(g);
  const oyun = g.oyun;
  if (!b || !oyun) return g.oyun ? `<p class="ipucu-metin">Simülasyon başlatılıyor…</p>` : izleNotu();
  const ben = b.ben;
  const hazine = b.kare.hazine[ben.idx] ?? 0;
  const oran = b.kare.hazineOrani[ben.idx] ?? 0;
  const bolgeSayisi = b.kare.bolgeler.filter((x) => x.sahip === ben.idx).length;
  let s = `<div class="ayrinti-baslik"><b><span class="nokta" style="background:var(--d${(b.dizin.oyuncular[ben.idx]?.devlet ?? 0) % 4})"></span> ${esc(devletAd(b, ben.idx))}</b><span class="soluk">${bolgeSayisi} bölge</span></div>`;
  s += `<div class="satir"><span class="ad">Hazine</span><span class="sayi">${kisalt(hazine)} para <span class="${oran >= 0 ? "yukari" : "asagi"}">${oran >= 0 ? "▲ +" : "▼ "}${fmt(oran)}/sa</span></span></div>`;
  const koruma = ben.koruma[ben.idx] ?? 0;
  if (koruma > b.kare.saat) {
    s += `<div class="satir"><span class="ad">Yeni oyuncu koruması</span><span class="sayi">${sureMetni(koruma - b.kare.saat)} kaldı</span></div><p class="ipucu-metin">Bu sürede kimse size savaş ilan edemez. Siz savaş ilan ederseniz koruma erken biter.</p>`;
  } else {
    s += `<div class="satir"><span class="ad">Yeni oyuncu koruması</span><span class="sayi soluk">bitti</span></div>`;
  }
  s += islerHtml(b, -1) + oneriKutusu(g);
  for (const grup of DEVLET_GRUPLARI) s += grupHtml(grup, b, oyun, "d");
  return s + diplomasiHtml(b);
}

// ---------------------------------------------------------------------------------------------
// Bölge paneli komut bölümü
// ---------------------------------------------------------------------------------------------

/** Bölge ayrıntısının altındaki komut bölümü (bölge seçili değilken bölge: -1). */
export function komutBolumu(g: GovdeDurumu, i: number): string {
  const oyun = g.oyun;
  if (!oyun) return izleNotu();
  const b = baglamKur(g);
  if (!b) return "";
  if (i < 0) return oneriKutusu(g) + `<p class="ipucu-metin">Komut vermek için kendi bölgelerinizden birini seçin (küre üzerinde ya da etiketlerden).</p>`;
  const bk = b.kare.bolgeler[i];
  if (!bk) return "";
  if (bk.sahip === b.ben.idx) {
    let s = `<h2 class="komut-baslik">Komutlar</h2>` + islerHtml(b, i);
    const emirler = b.ben.bolgeler[i]?.emirler ?? [];
    if (emirler.length) {
      s += `<h3>Ticaret emirleri</h3><div class="isler">${emirler
        .map((e) => {
          const mal = b.ic.mallar[e[0]];
          const k = { tur: "ticaret_emri", bolge: b.dizin.bolgeler[i]?.id ?? "", mal: mal?.id ?? "", yon: e[1] === 0 ? "ihracat" : "ithalat", oranSaat: 0 };
          return `<div class="satir is-satir"><span>${esc(mal?.ad ?? "?")} ${e[1] === 0 ? "ihracat" : "ithalat"}: ${fmt(e[2])}/sa <span class="soluk">(gerçekleşen ${fmt(e[3])})</span></span><button type="button" class="mini-dugme" data-komut="${esc(JSON.stringify(k))}">Kaldır</button></div>`;
        })
        .join("")}</div>`;
    }
    for (const grup of BOLGE_GRUPLARI) s += grupHtml(grup, b, oyun, String(i));
    return s;
  }
  // Başkasının (ya da sahipsiz) bölgesi: komşu bölgelerimden saldırı formu.
  const sahip = bk.sahip;
  let s = `<h2 class="komut-baslik">Komutlar</h2><p class="ipucu-metin">Bu bölge ${sahip >= 0 ? `${esc(devletAd(b, sahip))} devletinin` : "sahipsiz"}; komut veremezsiniz.</p>`;
  const savas = komutTanimi("savas_ilan");
  if (savas && sahip >= 0) {
    const komsular = new Set<number>();
    for (const e of b.dizin.kenarlar) {
      const j = e.a === i ? e.b : e.b === i ? e.a : -1;
      if (j >= 0 && b.kare.bolgeler[j]?.sahip === b.ben.idx && (b.kare.bolgeler[j]?.ordu.length ?? 0) > 0) komsular.add(j);
    }
    const hedefId = b.dizin.bolgeler[i]?.id ?? "";
    for (const j of [...komsular].sort((x, y) => x - y)) {
      s += `<h3>Saldırı: ${esc(g.bolgeAd(j))} bölgenizden</h3>` + formHtml(savas, { ...b, bolge: j }, oyun, String(j), { hedef: hedefId });
    }
  }
  return s;
}

/** Darboğaz listesindeki bir yol için "Kenarı geliştir" düğmesi (oyuncu kipinde). */
export function kenarGelistirDugmesi(g: GovdeDurumu, kenar: number): string {
  const b = baglamKur(g);
  if (!b) return "";
  const neden = kenarNedeni(b, kenar);
  if (neden) return `<span class="kenar-not soluk">${esc(neden)}</span>`;
  const onizleme = kenarOnizleme(b, kenar).map((x) => x.metin).join(" · ");
  return `<button type="button" class="mini-dugme" data-komut='${esc(JSON.stringify({ tur: "kenar_gelistir", kenar }))}' title="${esc(onizleme)}">Kenarı geliştir</button><span class="kenar-not soluk">${esc(onizleme)}</span>`;
}
