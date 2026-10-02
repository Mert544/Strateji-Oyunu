/**
 * F4 sınama sunucusu: GEBZE'yi kapsayan parsel fikstürüyle mülk kipinde sunucu (in-process; sunucu paketine dokunmadan).
 *
 * Neden ayrı: sunucu CLI'si (`pnpm sunucu -- --parsel`) yalnız `mini-6` ve `sentetik-50` fikstürlerini yükler; bunlar kurgusal
 * hücre koordinatları kullanır ve istemcinin Gebze ızgarasıyla (S6, BHI1) eşleşmez. Bu betik Gebze ızgarasından bir fikstür
 * üretir: il `tr_41` -> mini haritanın `m_ova` bölgesi (ova + tahıl rezervi: Çiftlik kurulabilir), ilçe `tr_41_gebze`; mini-6'nın
 * öteki illeri olduğu gibi kalır. Hücre sınıfı istemcinin `arsaSinifi` eşlemesiyle aynıdır (komut sınıfı uyuşsun diye).
 *
 *   tsx scripts/f4-sunucu.ts [--port 8787] [--yurtsuz] [--gercek-saat]
 *     --yurtsuz     bedava yurdu kapat (yurtHucre 0)
 *     --gercek-saat sim saati gerçek zamanda ilerler (varsayılan: elle saat; yönetici zamanIlerlet ile)
 * Çıktı: ws adresi ve ali/veli/ayse için token'lı sayfa adresleri (sayfa: pnpm dunya + yerel HTTP sunucusu).
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { gercekVeriyiYukle, miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { ParselFiksturu, ParselHucreTanimi, ParselIlceTanimi } from "@bolge/veri";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { bellekDeposu } from "../../sunucu/src/depo/bellek";
import { hiyerarsiOku, izgaraGirdisiKur, izgaraManifestiOku, izgaralariYukle, izgarayiVeriyeBagla, varsayilanIzgaraBagimliliklari, varsayilanIzgaraKoku } from "../../sunucu/src/izgara/manifest";
import { GelistirmeKimligi, gelistirmeTokeni } from "../../sunucu/src/kimlik";
import { SunucuIstemcisi } from "../../sunucu/src/istemci";
import { DuvarSaati, ElleSaat } from "../../sunucu/src/saat";
import { sunucuBaslat } from "../../sunucu/src/sunucu";
import type { CalisanSunucu } from "../../sunucu/src/sunucu";
import { DunyaYazari } from "../../sunucu/src/yazar";
import { arsaSinifi } from "../src/harita/fiyat";
import { bhiCoz, Bit } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const SIR = "f4-sinama-sirri-0123456789";
export const GEBZE = "tr_41_gebze";

export function gebzeIzgarasi(): Izgara {
  // Gebze ızgarasının yolu manifestten (tek kaynak; el ile "ornek/..." yolu tutulmaz)
  const odbl = join(DEPO, "packages", "veri", "haritalar", "odbl");
  const manifest = JSON.parse(readFileSync(join(odbl, "izgara", "manifest.json"), "utf8")) as { ilceler: Array<{ kimlik: string; bhi: { yol: string } }> };
  const yol = join(odbl, manifest.ilceler.find((i) => i.kimlik === GEBZE)!.bhi.yol);
  return bhiCoz(new Uint8Array(gunzipSync(readFileSync(yol))));
}

/** Gebze ızgarasından parsel fikstürü: mini-6 + il `tr_41` (bölge `m_ova`) + ilçe `tr_41_gebze`. */
export function gebzeFiksturu(iz: Izgara = gebzeIzgarasi()): ParselFiksturu {
  const taban = parselFiksturuYukle("mini-6");
  const hucreler: ParselHucreTanimi[] = [];
  let uygun = 0;
  let enYuksek = 0;
  const sira = { kirsal: 0, kasaba: 1, sehir: 2 } as const;
  for (let dy = 0; dy < iz.yukseklik; dy++)
    for (let dx = 0; dx < iz.genislik; dx++) {
      const d = iz.durum[dy * iz.genislik + dx]!;
      if (!(d & Bit.ICERIDE)) continue;
      const id = `${iz.x0 + dx}:${iz.y0 + dy}`;
      const sinif = arsaSinifi(d);
      enYuksek = Math.max(enYuksek, sira[sinif]);
      const engel = d & Bit.SU ? "su" : d & Bit.ASKERI ? "askeri" : d & Bit.YOL ? "yol" : undefined;
      if (engel) hucreler.push({ id, sinif, uygun: false, engel });
      else {
        uygun++;
        hucreler.push({ id, sinif, uygun: true });
      }
    }
  const ilceSinifi = (["kirsal", "kasaba", "sehir"] as const)[enYuksek]!;
  const gebze: ParselIlceTanimi = {
    id: GEBZE,
    ad: "Gebze",
    il: "tr_41",
    bolge: "m_ova",
    sinif: ilceSinifi,
    seviye: ilceSinifi === "sehir" ? 3 : ilceSinifi === "kasaba" ? 1 : 0,
    hucreSayisi: hucreler.length,
    uygunHucre: uygun,
    hucreler,
  };
  return {
    ...taban,
    ad: "gebze-mini",
    iller: [...taban.iller.filter((i) => i.id !== "sn_m_ova"), { id: "tr_41", ad: "Kocaeli", bolge: "m_ova" }],
    ilceler: [...taban.ilceler.filter((c) => c.il !== "sn_m_ova"), gebze],
  };
}

export interface F4Sunucu {
  url: string;
  port: number;
  yazar: DunyaYazari;
  saat: ElleSaat | null;
  /** Yönetici bağlantısı (oyuncu_katil, zamanIlerlet). */
  yonetici: SunucuIstemcisi;
  token(oyuncu: string): string;
  /** Oyuncuyu dünyaya katar (yönetici komutu); `ilce` verilirse bedava yurt orada verilir. */
  katil(oyuncu: string, ilce?: string): Promise<void>;
  kapat(): Promise<void>;
}

export interface F4SunucuSecenekleri {
  port?: number;
  yurtsuz?: boolean;
  gercekSaat?: boolean;
  /** Gebze'siz hızlı kipi (testler): mini-6 fikstürü. */
  fikstur?: ParselFiksturu;
  /** Gerçek arsa ızgaraları (Gebze, Gemlik, Körfez): sunucu CLI'siyle aynı kurulum (`izgara/manifest.ts`: manifest → BHI1 → veri); Gebze fikstürü kullanılmaz. */
  manifestIzgara?: boolean;
}

/** CLI'nin `--izgara-manifest` kurulumunun aynısı: gerçek veri paketi + manifestteki bütün ilçeler. */
export function manifestVerisi(): CekirdekVeriPaketi {
  const manifestYolu = join(DEPO, "packages", "veri", "haritalar", "odbl", "izgara", "manifest.json");
  const kok = varsayilanIzgaraKoku(manifestYolu);
  const yuklenen = izgaralariYukle(izgaraManifestiOku(manifestYolu), kok, varsayilanIzgaraBagimliliklari);
  const veri: CekirdekVeriPaketi = gercekVeriyiYukle();
  if (veri.param.mulk === undefined) throw new Error("gercek veri paketinde param.mulk yok");
  izgarayiVeriyeBagla(veri, izgaraGirdisiKur(yuklenen, { ad: "izgara-manifest", harita: veri.harita.ad, hiyerarsi: hiyerarsiOku(join(kok, "hiyerarsi.json")), haritaBolgeleri: new Set(veri.harita.bolgeler.map((b) => b.id)) }));
  return veri;
}

export async function f4SunucuBaslat(s: F4SunucuSecenekleri = {}): Promise<F4Sunucu> {
  const veri: CekirdekVeriPaketi = s.manifestIzgara ? manifestVerisi() : miniVeriyiYukle();
  if (!s.manifestIzgara) veri.parsel = s.fikstur ?? gebzeFiksturu();
  if (s.yurtsuz && veri.param.mulk) veri.param.mulk.yeniOyuncu.yurtHucre = 0;
  // Esnaf Defteri ödül dedektörü açık (CLI varsayılanı gibi): kavramlar sim-saat sınırında saptanır.
  // Gerçek saat: birikimli kip (açıkken akar; kapalıyken durur). Mutlak duvar saati (varsayılan DuvarSaati(1)) kapalı süreyi yetiştirir.
  const saat = s.gercekSaat ? new DuvarSaati(1, { birikimli: true }) : new ElleSaat();
  const yazar = await DunyaYazari.ac({ veri, tohum: 1, depo: bellekDeposu(), saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
  const sunucu: CalisanSunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: s.port ?? 0, host: "127.0.0.1", yayinAraligiMs: 0 });
  const url = `ws://127.0.0.1:${sunucu.port}`;
  const token = (oyuncu: string): string => gelistirmeTokeni(SIR, oyuncu);
  const yonetici = await SunucuIstemcisi.baglan(url, token("sistem"), "f4-yonetici");
  return {
    url,
    port: sunucu.port,
    yazar,
    saat: saat instanceof ElleSaat ? saat : null,
    yonetici,
    token,
    async katil(oyuncu, ilce) {
      const r = await yonetici.komut(`katil-${oyuncu}-${Math.random().toString(36).slice(2, 8)}`, { tur: "oyuncu_katil", oyuncu, bolgeler: [], ...(ilce ? { ilce } : {}) });
      if (r.tur !== "komutSonucu" || !r.sonuc.tamam) throw new Error(`katilim basarisiz (${oyuncu}): ${JSON.stringify(r)}`);
    },
    async kapat() {
      await yonetici.kapat().catch(() => undefined);
      await sunucu.kapat();
    },
  };
}

// --- komut satırı ---------------------------------------------------------------------------------------------------
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const arg = process.argv.slice(2);
  const port = Number(arg[arg.indexOf("--port") + 1]) || 8787;
  void (async () => {
    const t0 = Date.now();
    const ts = await f4SunucuBaslat({ port, yurtsuz: arg.includes("--yurtsuz"), gercekSaat: arg.includes("--gercek-saat") });
    console.log(`F4 sunucusu hazır (${Date.now() - t0} ms): ${ts.url} — Gebze (${GEBZE}), mülk kipi`);
    for (const o of ["ali", "veli", "ayse"]) console.log(`  ${o}: ?sunucu=${encodeURIComponent(ts.url)}&token=${ts.token(o)}`);
    console.log("Oyuncuları dünyaya katmak için yönetici komutu gerekir (oyuncu_katil); sayfa tek başına katılamaz.");
    process.on("SIGINT", () => void ts.kapat().then(() => process.exit(0)));
  })();
}
