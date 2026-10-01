/** Sunucu testlerinin ortak kurulumu: mini harita, bellek deposu, elle saat, rastgele port. */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { kamuHucreleri } from "@bolge/cekirdek";
import type { ArsaSinifi, CekirdekVeriPaketi, Komut, Simulasyon } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import type { HizSiniriSecenekleri } from "../src/hiz-siniri";
import { GelistirmeKimligi, gelistirmeTokeni } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { ElleSaat } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import type { SunucuMesaji } from "@bolge/protokol";

export const SIR = "test-sirri-0123456789";
export const KUZEY = ["m_ova", "m_liman", "m_gecit"];
export const GUNEY = ["m_dag", "m_col", "m_sehir"];
export const TUM_BOLGELER = [...KUZEY, ...GUNEY];

let veriOnbellek: VeriPaketi | null = null;
export function veri(): VeriPaketi {
  veriOnbellek ??= miniVeriyiYukle();
  return structuredClone(veriOnbellek);
}

/** Mülk kipi: mini harita + mini-6 parsel fikstürü. */
export function mulkVerisi(): CekirdekVeriPaketi {
  const v: CekirdekVeriPaketi = veri();
  v.parsel = parselFiksturuYukle("mini-6");
  // Bedava yurt kapalı: testler katılan oyuncunun hücresiz başladığını varsayar.
  if (v.param.mulk) v.param.mulk.yeniOyuncu.yurtHucre = 0;
  return v;
}

export function token(oyuncu: string): string {
  return gelistirmeTokeni(SIR, oyuncu);
}

export interface TestSunucusu {
  url: string;
  yazar: DunyaYazari;
  saat: ElleSaat;
  depo: ReturnType<typeof bellekDeposu>;
  sunucu: CalisanSunucu;
  istemciler: SunucuIstemcisi[];
  baglan(oyuncu: string, istemciKimligi?: string): Promise<SunucuIstemcisi>;
  kapat(): Promise<void>;
}

export async function testSunucusu(s: { hizSiniri?: HizSiniriSecenekleri; tohum?: number; veri?: CekirdekVeriPaketi } = {}): Promise<TestSunucusu> {
  const depo = bellekDeposu();
  const saat = new ElleSaat();
  const yazar = await DunyaYazari.ac({ veri: s.veri ?? veri(), tohum: s.tohum ?? 1, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
  const sunucu = await sunucuBaslat({
    yazar,
    kimlik: new GelistirmeKimligi(SIR),
    port: 0,
    yayinAraligiMs: 0,
    ...(s.hizSiniri ? { hizSiniri: s.hizSiniri } : {}),
  });
  const url = `ws://127.0.0.1:${sunucu.port}`;
  const istemciler: SunucuIstemcisi[] = [];
  return {
    url,
    yazar,
    saat,
    depo,
    sunucu,
    istemciler,
    async baglan(oyuncu, istemciKimligi = `istemci-${oyuncu}`) {
      const i = await SunucuIstemcisi.baglan(url, token(oyuncu), istemciKimligi);
      istemciler.push(i);
      return i;
    },
    async kapat() {
      for (const i of istemciler) await i.kapat();
      await sunucu.kapat();
    },
  };
}

/** Yönetici olarak oyuncuyu bölgeleriyle katar. */
export async function katil(yonetici: SunucuIstemcisi, oyuncu: string, bolgeler: string[]): Promise<void> {
  const r = await yonetici.komut(`katil-${oyuncu}`, { tur: "oyuncu_katil", oyuncu, bolgeler } satisfies Komut);
  if (r.tur !== "komutSonucu" || !r.sonuc.tamam) throw new Error(`katilim basarisiz: ${JSON.stringify(r)}`);
}

/** İstemcinin karesi koşulu sağlayana kadar bekler (kare/delta geldikçe denetler). */
export async function kareBekle(ist: SunucuIstemcisi, kosul: () => boolean, zamanAsimiMs = 10_000): Promise<void> {
  if (kosul()) return;
  await ist.bekle((m: SunucuMesaji) => (m.tur === "kare" || m.tur === "delta") && kosul(), zamanAsimiMs);
}

/** Kamu arsası (satılmaz) hücreleri: çekirdeğin `kamuHucreleri` API'si (iç yapıya bağlanmaz); kural kapalıysa boş. */
export function kamuKumesi(sim: Pick<Simulasyon, "dunya">, ilce: string): Set<string> {
  return new Set(kamuHucreleri(sim.dunya, ilce).flatMap((g) => g.hucreler));
}

/** İlçede yatayda bitişik, uygun, `sinif` sınıfında ve kamu olmayan iki hücre (satın alınır, birlikte yapı kurulur). */
export function bitisikSatilabilir(sim: Pick<Simulasyon, "dunya" | "ic">, ilce: string, sinif: ArsaSinifi = "kirsal"): [string, string] {
  const kamu = kamuKumesi(sim, ilce);
  const uygun = new Set((sim.ic.mulk?.fikstur.ilceler.find((c) => c.id === ilce)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === sinif && !kamu.has(h.id)).map((h) => h.id));
  for (const id of uygun) {
    const [x, y] = id.split(":").map(Number) as [number, number];
    const komsu = `${x + 1}:${y}`;
    if (uygun.has(komsu)) return [id, komsu];
  }
  throw new Error(`bitisik satilabilir hucre cifti yok: ${ilce}`);
}
