/**
 * İşletme düğümü (S3, docs/11 §3.4): (oyuncu, il) başına bir `BolgeDurumu`, kendi stok defteriyle; il merkezine (harita
 * bölgesi, `il.bolge`) sıfır süreli örtük bağla bağlıdır. Lojistik MCF yalnız merkezler arasında çözülür; aynı merkezdeki
 * işletmeler il içinde havuzlanır (`lojistik/akis.ts`).
 *
 * Düğüm merkezden şunları devralır: devlet, etiketler (liman, ova, dağ... yani ticaret ve yapı izinleri il düzeyinde),
 * harita tanımları (tarım/iklim tipi, liman primi; `dugum.ts` `haritaIndeksi`) ve damar rezervlerinin bir kopyası
 * (yaklaşık: ortak damar F6 sonrası derin ayrımla gelir). Nüfusu 0'dır: vergi tabanı ve nüfus tüketimi yoktur;
 * işgücü il düzeyinde yaklaşık "tam istihdam" sayılır (`ekonomi/uretim.ts`).
 */
import { katmanAlanlariniYaz, stokDizisiKur } from "../kurulum";
import { PPM } from "../tipler";
import type { BolgeDurumu, DerlenmisIcerik, Dunya, KapsamHucresi, OyuncuId } from "../tipler";
import { isletmeKimligi, isletmeKonumu, isletmesiVarMi } from "./durum";

/**
 * (oyuncu, il) işletme düğümünü döndürür; yoksa oluşturur ve bölge indeksini döndürür. Oyuncunun İLK işletmesi
 * `mulk.yeniOyuncu.baslangicStok` (başlangıç kiti) ile başlar, sonrakiler boş stokla. Yeni düğüm `d.bolgeler` ve
 * `d.lojistik.kapsam` sonuna eklenir; işletme kaydı (oyuncu, il) sırasına konur.
 */
export function isletmeAl(d: Dunya, ic: DerlenmisIcerik, oyuncu: OyuncuId, il: string): number {
  const mk = ic.mulk;
  const m = d.mulk;
  if (mk === undefined || m === undefined) throw new Error("isletmeAl: mulk kipi kapali");
  const konum = isletmeKonumu(m, oyuncu, il);
  if (konum >= 0) return (m.isletmeler[konum] as { bolgeIndeksi: number }).bolgeIndeksi;
  const merkez = mk.ilMerkezi.get(il);
  if (merkez === undefined) throw new Error(`isletmeAl: bilinmeyen il: ${il}`);
  const mb = d.bolgeler[merkez] as BolgeDurumu;
  const nm = ic.mallar.length;
  const indeks = d.bolgeler.length;
  const ilk = !isletmesiVarMi(m, oyuncu);
  const sifir = (): number[] => new Array<number>(nm).fill(0);
  const b: BolgeDurumu = {
    indeks,
    id: isletmeKimligi(il, oyuncu),
    devlet: mb.devlet,
    etiketler: [...mb.etiketler],
    sahip: oyuncu,
    nufus: 0,
    stoklar: stokDizisiKur(ic, ilk ? mk.baslangicStok : sifir(), d.zaman),
    israf: sifir(),
    uretimToplam: sifir(),
    uretimOrani: sifir(),
    uretimT0: d.zaman,
    rezervIlk: [...mb.rezervIlk],
    rezervKalan: [...mb.rezervIlk],
    tesisler: [],
    ticaretEmirleri: [],
    birlikler: new Array<number>(ic.birlikler.length).fill(0),
    savunma: { durus: "normal" },
    gidaKarsilanmaPpm: PPM,
    ikmalKarsilanmaPpm: PPM,
    merkez,
  };
  katmanAlanlariniYaz(ic, b, ic.harita.bolgeler[merkez]?.tarim !== undefined, d.zaman);
  d.bolgeler.push(b);
  d.lojistik.kapsam.push(ic.mallar.map((): KapsamHucresi => ({ karsilanmaPpm: 0, enYakinKaynakMs: -1, neden: "yok" })));
  m.isletmeler.splice(-konum - 1, 0, { oyuncu, il, merkezBolge: mb.id, bolgeIndeksi: indeks });
  return indeks;
}
