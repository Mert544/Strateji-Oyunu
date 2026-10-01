/** Sunucu testlerinin ortak kurulumu: mini harita, bellek deposu, elle saat, rastgele port. */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import type { CekirdekVeriPaketi, Komut } from "@bolge/cekirdek";
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
