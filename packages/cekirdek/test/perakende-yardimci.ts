/**
 * G7-2 test yardımcıları: mülk kipi + (bellekte) `mulk.perakende` bloğu ve `ekYapilar.dukkan`; dükkân DURUM olarak doğrudan dünyaya yazılır (kurma komutu G7-3'tedir; burada yalnız
 * çözüm/para/serileştirme yolu sınanır). JSON DEĞİŞMEZ.
 */
import type { MulkPerakendeParametreleri } from "@bolge/veri";
import { perakendeBlogu } from "../../veri/test/perakende-g7-yardimci";
import type { Simulasyon } from "../src/motor";
import type { BolgeDurumu, CekirdekVeriPaketi, DukkanDurumu, EkYapiDurumu, RafYuvasi } from "../src/tipler";
import { mulkSim, mulkVeriTam } from "./mulk-yardimci";

/** Mülk dünyası (yeni oyuncu paketi açık: yurt + işletme düğümü) + perakende bloğu + `ekYapilar.dukkan`; bol hibe. `blok = false`: blok ve ek yapı hiç yok (karşıt kanıt). */
export function perakendeVeri(duzenle?: (v: CekirdekVeriPaketi, pr: MulkPerakendeParametreleri) => void, blok = true): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const mulk = v.param.mulk!;
    mulk.yeniOyuncu.hibe = 5_000_000_000;
    mulk.yeniOyuncu.indirimliYapiSayisi = 0;
    mulk.yeniOyuncu.ayrilmisHucrePpm = 0;
    // G7-4: gerçek parametreler.json `perakende` ve `ekYapilar.dukkan` taşır: "blok yok" kurgusu bloğu AÇIKÇA siler (G7-4 öncesi JSON'da hiç yoktu).
    if (!blok) {
      delete mulk.perakende;
      if (mulk.ekYapilar !== undefined) delete mulk.ekYapilar["dukkan"];
      return void duzenle?.(v, undefined as unknown as MulkPerakendeParametreleri);
    }
    mulk.ekYapilar = { ...(mulk.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 6_000_000, insaMaliyeti: { celik: 20_000, parca: 8_000 }, enFazlaIlBasina: 6, olcekHucre: [1, 2, 3] } };
    mulk.perakende = perakendeBlogu();
    duzenle?.(v, mulk.perakende);
  });
}

export const bolgeBul = (s: Simulasyon, oyuncu: string): BolgeDurumu => s.dunya.bolgeler.find((b) => b.merkez !== undefined && b.sahip === oyuncu)!;

/** Dükkânın ilçesini belirleyen hücre: `ilce` verilirse o ilçenin ilk hücresi (sahiplik gerekmez; çözüm yalnız hücrenin ilçesine bakar), yoksa oyuncunun ilk hücresi. */
function dukkanHucresi(s: Simulasyon, oyuncu: string, ilce?: string): string {
  if (ilce !== undefined) return s.ic.mulk!.fikstur.ilceler.find((c) => c.id === ilce)!.hucreler[0]!.id;
  return s.dunya.mulk!.hucreler.find((h) => h.sahip === oyuncu)!.id;
}

/**
 * `oyuncu`nun işletme düğümüne dükkân DURUMU ekler ve çözümü kirletir. `raf`: yuva başına mal kimliği ve kademe (varsayılan kademe: `varsayilanFiyatKademesi`). Yuva sayısı `olcek` için
 * tanımlı raf yuvası sayısına tamamlanır (boş yuva). Döner: ek yapı kaydı.
 */
export function dukkanEkle(s: Simulasyon, oyuncu: string, raf: { mal?: string; fiyat?: number }[], tur = "bakkal", olcek: 0 | 1 | 2 = 0, ilce?: string): EkYapiDurumu {
  const pk = s.ic.mulk!.perakende!;
  const yuvaSayisi = pk.p.olcekler[olcek].rafYuvasi;
  const yuvalar: RafYuvasi[] = Array.from({ length: yuvaSayisi }, (_, i) => {
    const r = raf[i];
    const y: RafYuvasi = { fiyat: r?.fiyat ?? pk.p.varsayilanFiyatKademesi };
    if (r?.mal !== undefined) y.mal = r.mal;
    return y;
  });
  const dukkan: DukkanDurumu = { tur, olcek, raf: yuvalar, baslangic: s.dunya.zaman, kurulus: s.dunya.zaman };
  const e: EkYapiDurumu = { id: 9_000_001 + dukkanlar(s).length, tur: "dukkan", hucreler: [dukkanHucresi(s, oyuncu, ilce)], dukkan };
  (bolgeBul(s, oyuncu).ekYapilar ??= []).push(e);
  s.baglam.kirlet(s.dunya);
  return e;
}

/** Dünyadaki tüm dükkânları siler (ek yapı kaydıyla birlikte) ve çözümü kirletir. */
export function dukkanlariSil(s: Simulasyon): void {
  for (const b of s.dunya.bolgeler) {
    if (b.ekYapilar === undefined) continue;
    b.ekYapilar = b.ekYapilar.filter((e) => e.dukkan === undefined);
    if (b.ekYapilar.length === 0) delete b.ekYapilar;
  }
  s.baglam.kirlet(s.dunya);
}

/** Tüm dükkânların ek yapı kayıtları (işletme sırasıyla). */
export function dukkanlar(s: Simulasyon): { oyuncu: string; e: EkYapiDurumu }[] {
  const l: { oyuncu: string; e: EkYapiDurumu }[] = [];
  for (const isl of s.dunya.mulk!.isletmeler) for (const e of s.dunya.bolgeler[isl.bolgeIndeksi]!.ekYapilar ?? []) if (e.dukkan !== undefined) l.push({ oyuncu: isl.oyuncu, e });
  return l;
}

/** `mulkSim(["a"...])` + dükkân(lar): kısa yol. */
export function dukkanliSim(oyuncular: readonly string[], v: CekirdekVeriPaketi = perakendeVeri()): Simulasyon {
  return mulkSim(oyuncular, v);
}
