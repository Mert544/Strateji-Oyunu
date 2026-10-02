/**
 * Şebeke gideri (saf; DOM yok): şebekeden alınan mal (elektrik, yakıt) için birim fiyat, yöntem başına TAHMİNİ saatlik gider ve işletmenin gerçekleşen şebeke alımının (`kare.ozel.sebeke`) bedeli.
 *
 * - Birim fiyat veride ayrı alan DEĞİL, çekirdekte türetilir (`derle.ts`: `carpBol(carpBol(taban, kamuIthalatCarpaniPpm, PPM), tavanOraniPpm, PPM)`; `kamuIthalatCarpaniPpm` =
 *   `mulk/kamuFiyat.ts`). İstemcide derlenmiş içerik yoktur ve çekirdek derleyicisini içe almak yapı kodunu pakete sürükler; bu yüzden formül BURADA kopyadır ve
 *   `test/harita-yontem-secici.test.ts` gerçek çekirdek derlemesiyle (`Simulasyon.ic.mulk.sebeke`) eşitliği bağlar (sürüklenirse test kırılır).
 * - Yöntem gideri: yöntemin şebeke malı girdileri (saatte, S ölçek) x birim fiyat; "tam kapasite tahmini". Gerçekleşen alım düğüm düzeyindedir (protokolde tesis kırılımı yok): Hazine yalnız toplamı gösterir.
 * - Tutarlar mili-₺; gider maliyettir: ekranda `paraMili(…, "yukari")`.
 */
import { esc, fmt, paraMili } from "../arayuz/bicim";
import type { Icerik } from "../komut/tablo";
import { yontemMetni } from "./yontem-metin";
import { carpBol } from "./olcek";

const PPM = 1_000_000;

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

/** Yöntemin tahmini şebeke gideri (mili-₺/saat; S ölçek, tam kapasite): şebeke malı girdilerinin bedeli toplamı; şebeke malı girdisi yoksa 0 (satır çıkmaz). */
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
 * Hazine sekmesi "Şebeke gideri" bölümü (A1 §3; Tasarım: tesis başına satır YOK, protokolde kırılım yok): elektrik ve yakıt satırları (miktar aşağı, gider YUKARI) ve (birden çok satır varsa) toplam.
 * Alım yoksa boş dize (bölüm gizlenir). `malAdi`: mal kimliği -> ad (elektrik/yakıt dışı şebeke malı için).
 */
export function sebekeBolumuHtml(satirlar: readonly SebekeSatiri[], malAdi: (mal: string) => string): string {
  if (satirlar.length === 0) return "";
  const anahtar = (mal: string): "sebeke.satir_elektrik" | "sebeke.satir_yakit" | "sebeke.satir_mal" => (mal === "elektrik" ? "sebeke.satir_elektrik" : mal === "yakit" ? "sebeke.satir_yakit" : "sebeke.satir_mal");
  let h = `<h3>${esc(yontemMetni("sebeke.baslik"))}</h3><ul class="mulk-liste" data-alan="sebeke">`;
  for (const s of satirlar) {
    h += `<li>${esc(yontemMetni(anahtar(s.mal), { mal: malAdi(s.mal), n: fmt(Math.floor(s.miktarMili / 1000)), gider: paraMili(s.bedelMili, "yukari") }))}</li>`;
  }
  if (satirlar.length > 1) h += `<li><b>${esc(yontemMetni("sebeke.toplam", { gider: paraMili(satirlar.reduce((t, s) => t + s.bedelMili, 0), "yukari") }))}</b></li>`;
  return h + `</ul><p class="ipucu-metin">${esc(yontemMetni("sebeke.not"))}</p>`;
}
