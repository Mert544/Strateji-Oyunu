/**
 * Şebeke gideri (saf; DOM yok): nominal yöntem tahminleri ve sunucunun gerçekleşen şebeke alımı/gideri ayrı tutulur.
 *
 * - Birim fiyat veride ayrı alan DEĞİL, çekirdekte türetilir (`derle.ts`: `carpBol(carpBol(taban, kamuIthalatCarpaniPpm, PPM), tavanOraniPpm, PPM)`; `kamuIthalatCarpaniPpm` =
 *   `mulk/kamuFiyat.ts`). İstemcide derlenmiş içerik yoktur ve çekirdek derleyicisini içe almak yapı kodunu pakete sürükler; bu yüzden formül BURADA kopyadır ve
 *   `test/harita-yontem-secici.test.ts` gerçek çekirdek derlemesiyle (`Simulasyon.ic.mulk.sebeke`) eşitliği bağlar (sürüklenirse test kırılır).
 * - Yöntem gideri: yöntemin şebeke malı girdileri (saatte, S ölçek) x birim fiyat; "tam kapasite tahmini".
 * - Hazine gerçek gideri: `sebekeGiderleri` sunucuda düğüm başına yuvarlanıp toplanmıştır; renderer yeniden fiyatla çarpmaz. Tesis kırılımı yoktur.
 * - Tutarlar mili-₺; gider maliyettir: ekranda `paraMili(…, "yukari")`.
 */
import { esc, fmt, paraMili, sayi } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import type { YakitTedarikiGorunumu } from "@bolge/protokol";
import type { IsletmeDurumu } from "./baglanti";
import { yontemMetni } from "./yontem-metin";
import { carpBol } from "./olcek";
export type { YakitTedarikiGorunumu } from "@bolge/protokol";

const PPM = 1_000_000;

/** Yalnız depolanabilir yakıt bu kuralda fiziksel tedarike öncelik verir. */
export function yakitStokOncelikliMi(ic: Icerik, mal: string): boolean {
  return mal === "yakit" && ic.mallar[ic.malIdx[mal] ?? -1]?.depolanabilir === true
    && ic.param.mulk?.sebeke?.mallar.some((m) => m.mal === mal && m.stokOncelikli === true) === true;
}

export function yakitTedarikiHtml(p: {
  mal: string;
  tedarik: YakitTedarikiGorunumu | undefined;
  giderler: readonly { mal: string; bedelMiliSaat: number; miktarMiliSaat?: number; birimFiyatMili?: number }[] | undefined;
  malAdi: (mal: string) => string;
}): string {
  let h = '<section class="tdr-akis yakit-tedariki"><h5>Sanayi yakıtının gerçek kaynakları</h5>';
  const t = p.tedarik;
  const miktar = (n: number): string => `${sayi(n / 1000, 3)} birim/saat`;
  const gider = p.giderler?.find((g) => g.mal === p.mal);
  const bedel = p.giderler === undefined ? "Bilinmiyor" : `${paraMili(gider?.bedelMiliSaat ?? 0, "yukari")}/saat`;
  const fiyatSatiri = gider?.birimFiyatMili === undefined ? "" : `<div><dt>Şebeke birim fiyatı</dt><dd>${paraMili(gider.birimFiyatMili, "yukari")}/birim</dd></div>`;
  if (!t || t.mal !== p.mal) {
    h += '<p class="ipucu-metin">Kaynak payları bilinmiyor; sunucu yakıt dökümü bildirmiyor. Eski veya kapalı kuralda tesis yakıtı otomatik ücretli şebekeden alınır ve stok bu gideri azaltmaz.</p><dl class="tdr-gider">';
    if (p.giderler !== undefined) h += `<div><dt>Şebekeden alınan</dt><dd>${gider === undefined ? miktar(0) : gider.miktarMiliSaat === undefined ? "Bilinmiyor" : miktar(gider.miktarMiliSaat)}</dd></div>`;
    return h + `${fiyatSatiri}<div><dt>Gerçek şebeke gideri</dt><dd>${bedel}</dd></div></dl><p class="ipucu-metin">Şebeke dökümü kaynak paylarından ayrıdır; son sunucu çözümünün saatlik alımı ve gideridir, geçmiş ödeme değildir.</p></section>`;
  }
  h += `<p>${esc(p.malAdi(t.mal))} · son gerçekleşen sanayi tüketimi</p><dl class="tdr-gider"><div><dt>Toplam tüketim</dt><dd>${miktar(t.tuketimMiliSaat)}</dd></div><div><dt>Depo ve ulaşmış tedarikten</dt><dd>${miktar(t.stokMiliSaat)}</dd></div><div><dt>Şebekeden tamamlanan açık</dt><dd>${miktar(t.sebekeMiliSaat)}</dd></div>`;
  h += `${fiyatSatiri}<div><dt>Gerçek şebeke gideri</dt><dd>${bedel}</dd></div></dl>`;
  h += '<p class="ipucu-metin">Depo, yerli üretim, ithalat ve hedefe ulaşmış akışın sanayiye ayrılan payı birlikte gösterilir. Yoldaki mal henüz kullanılmaz. Yalnız kalan açık için şebeke bedeli alınır; ithalat bedeli ayrıdır. Bunlar son çözümün saatlik hızlarıdır, stok miktarı veya geçmiş ödeme değildir.</p>';
  return h + '<p class="ipucu-metin">Birliklerin ikmali gerçek yakıt stoğu ve ulaşmış tedarik gerektirir; sanayinin şebeke alımı ordu açığını kapatmaz.</p></section>';
}

export interface SebekeFiyatlari {
  /** Mal kimliği -> birim fiyat (mili-₺ / birim; miktar mili-birimle `carpBol(miktar, fiyat, 1000)`). */
  birim: ReadonlyMap<string, number>;
  /** Sıralı mal kimlikleri (elektrik önce, sonra veri sırası). */
  mallar: readonly string[];
}

/** `deger`'i `hedef`'e doğru `oranPpm` kadar yaklaştırır (çekirdek `mulk/yapi.ts` `hedefeYaklastir` ile aynı). */
function hedefeYaklastir(deger: number, hedef: number, oranPpm: number): number {
  if (oranPpm <= 0 || deger === hedef) return deger;
  const fark = deger > hedef ? deger - hedef : hedef - deger;
  const pay = carpBol(fark, oranPpm, PPM);
  return deger > hedef ? deger - pay : deger + pay;
}

/** Kamu/şebeke ithalat çarpanı (ppm; çekirdek `kamuIthalatCarpaniHesapla`): en düşük ithalat çarpanı, Ticaret ofisi makas indirimiyle PPM'e doğru kapanır (en çok tüm ofislerle). */
export function kamuIthalatCarpaniPpm(ic: Icerik): number {
  const p = ic.param.pazar;
  const c = Math.min(p.ithalatCarpaniPpm, p.anlasmaIthalatCarpaniPpm, p.yaptirimIthalatCarpaniPpm);
  let indirim = 0;
  for (const t of Object.values(ic.param.mulk?.ekYapilar ?? {})) indirim += (t.makasIndirimPpm ?? 0) * (t.enFazlaIlBasina ?? Number.MAX_SAFE_INTEGER);
  return hedefeYaklastir(c, PPM, indirim > PPM ? PPM : indirim);
}

/** Şebeke birim fiyatları (`param.mulk.sebeke` yoksa ya da mal içerikte yoksa null: şebeke yok, gider satırı çıkmaz). */
export function sebekeFiyatlari(ic: Icerik): SebekeFiyatlari | null {
  const sb = ic.param.mulk?.sebeke;
  if (sb === undefined) return null;
  const kamu = kamuIthalatCarpaniPpm(ic);
  const birim = new Map<string, number>();
  const sirali = [...sb.mallar].sort((a, b) => (a.mal === "elektrik" ? -1 : b.mal === "elektrik" ? 1 : 0));
  for (const m of sirali) {
    const taban = ic.mallar[ic.malIdx[m.mal] ?? -1]?.taban;
    if (taban === undefined) continue;
    birim.set(m.mal, carpBol(carpBol(taban, kamu, PPM), m.tavanOraniPpm, PPM));
  }
  return birim.size === 0 ? null : { birim, mallar: [...birim.keys()] };
}

/** Şebeke malı için saatlik bedel (mili-₺/saat): `miktarMili` mili-birim/saat. Fiyatı olmayan mal 0. */
export function sebekeBedeli(f: SebekeFiyatlari, mal: string, miktarMili: number): number {
  const fiyat = f.birim.get(mal);
  return fiyat === undefined || miktarMili <= 0 ? 0 : carpBol(miktarMili, fiyat, 1000);
}

/** Bütün şebeke girdileri dışarıdan alınırsa tam kapasite gider tahmini; stok öncelikli yakıtta gerçek gider daha düşük olabilir. */
export function yontemSebekeGideri(ic: Icerik, f: SebekeFiyatlari | null, yontemId: string): number {
  if (f === null) return 0;
  const y = ic.yontemler[ic.yontemIdx[yontemId] ?? -1];
  if (!y) return 0;
  let t = 0;
  for (const [mi, miktar] of y.girdi) {
    const id = ic.mallar[mi]?.id;
    if (id !== undefined) t += sebekeBedeli(f, id, miktar);
  }
  return t;
}

/** Yöntemin girdisinde şebeke malı (elektrik, yakıt) var mı (`yontem.secici.sebeke_not` ve gider satırı koşulu). */
export function yontemSebekeMalliMi(ic: Icerik, f: SebekeFiyatlari | null, yontemId: string): boolean {
  if (f === null) return false;
  const y = ic.yontemler[ic.yontemIdx[yontemId] ?? -1];
  return y !== undefined && y.girdi.some(([mi]) => f.birim.has(ic.mallar[mi]?.id ?? ""));
}

export interface SebekeSatiri {
  mal: string;
  /** mili-birim/saat (gerçekleşen alım, son çözüm). */
  miktarMili: number;
  /** mili-₺/saat. */
  bedelMili: number;
}

/**
 * Gerçekleşen şebeke alımı (`kare.ozel.sebeke`: `[mal, mili-birim/saat]`, düğüm düzeyi) bedelle: fiyatı bilinmeyen mal atlanır; `> 0` olanlar. Birden çok düğümün alımı mal başına toplanır.
 */
export function sebekeSatirlari(f: SebekeFiyatlari | null, alimlar: ReadonlyArray<readonly [mal: string, miliSaat: number]>): SebekeSatiri[] {
  if (f === null) return [];
  const toplam = new Map<string, number>();
  for (const [mal, m] of alimlar) if (m > 0 && f.birim.has(mal)) toplam.set(mal, (toplam.get(mal) ?? 0) + m);
  const sira = (m: string): number => f.mallar.indexOf(m);
  return [...toplam.entries()].sort((a, b) => sira(a[0]) - sira(b[0])).map(([mal, miktarMili]) => ({ mal, miktarMili, bedelMili: sebekeBedeli(f, mal, miktarMili) }));
}

/**
 * Hazine sekmesi "Şebeke gideri" bölümü (A1 §3; Tasarım: tesis başına satır YOK, protokolde kırılım yok): elektrik ve yakıt satırları (miktar aşağı, gider YUKARI) ve HER ZAMAN toplam (tek satırda da; Tasarım son kararı). TESİS kırılımı yok.
 * Alım yoksa boş dize (bölüm gizlenir). `malAdi`: mal kimliği -> ad (elektrik/yakıt dışı şebeke malı için).
 */
export function sebekeBolumuHtml(satirlar: readonly SebekeSatiri[], malAdi: (mal: string) => string): string {
  if (satirlar.length === 0) return "";
  const anahtar = (mal: string): "sebeke.satir_elektrik" | "sebeke.satir_yakit" | "sebeke.satir_mal" => (mal === "elektrik" ? "sebeke.satir_elektrik" : mal === "yakit" ? "sebeke.satir_yakit" : "sebeke.satir_mal");
  let h = `<h3>${esc(yontemMetni("sebeke.baslik"))}</h3><ul class="mulk-liste" data-alan="sebeke">`;
  for (const s of satirlar) {
    h += `<li>${esc(yontemMetni(anahtar(s.mal), { mal: malAdi(s.mal), n: fmt(Math.floor(s.miktarMili / 1000)), gider: paraMili(s.bedelMili, "yukari") }))}</li>`;
  }
  h += `<li><b>${esc(yontemMetni("sebeke.toplam", { gider: paraMili(satirlar.reduce((t, s) => t + s.bedelMili, 0), "yukari") }))}</b></li>`;
  return h + '</ul><p class="ipucu-metin">Şebekeden alınan miktarın tahmini bedeli; depo veya ulaşmış tedarikten karşılanan yakıta ayrıca şebeke bedeli eklenmez.</p>';
}

/** Sahibinin bütün işletmelerine ait, sunucudan gelen gerçekleşen saatlik miktar ve bedel. */
export type SebekeGercekSatiri = NonNullable<IsletmeDurumu["sebekeGiderleri"]>[number];

/**
 * Hazine gerçek şebeke dökümü. Bedelleri yeniden fiyatlamadan toplar; miktarları fiyatla çarpmak düğüm başına yuvarlamayı kaybettirir.
 * `undefined`: bütün işletmelerin bedeli bilinmiyor; `[]`: sunucunun doğruladığı sıfır alım/gider.
 */
export function sebekeGercekBolumuHtml(satirlar: readonly SebekeGercekSatiri[] | undefined, malAdi: (mal: string) => string): string {
  let h = `<section aria-label="Şebeke gideri"><h3>${esc(yontemMetni("sebeke.baslik"))}</h3>`;
  if (satirlar === undefined) return h + '<p class="ipucu-metin" role="status">Şebeke gideri bilinmiyor; tüm işletmelere ait gider dökümü henüz alınmadı.</p></section>';
  h += '<ul class="mulk-liste" data-alan="sebeke">';
  if (satirlar.length === 0) h += `<li>${esc(yontemMetni("sebeke.yok"))}</li>`;
  let toplamMili = 0;
  for (const s of satirlar) {
    toplamMili += s.bedelMiliSaat;
    h += `<li>${esc(malAdi(s.mal))} · ${esc(sayi(s.miktarMiliSaat / 1000, 3))} birim/saat · ${esc(paraMili(s.bedelMiliSaat, "yukari"))}/saat</li>`;
  }
  h += `<li><b>Toplam şebeke gideri: ${esc(paraMili(toplamMili, "yukari"))}/saat</b></li></ul>`;
  return h + '<p class="ipucu-metin">Son sunucu özeti: bütün sahipli işletmelerin gerçekleşen şebeke alımı ve buna ait saatlik gider. Bu oranlar stok miktarı veya birikmiş ödeme değildir.</p></section>';
}
