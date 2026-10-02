/**
 * Defter gösterim sırası (sunucu `siradaki`) ve T-6 kök nedeni, GERÇEK sunucu yazarıyla (dedektör açık, sahte duvar saati):
 * - `siradaki` DEFTER_GOSTERIM_SIRASI sırasındadır (çiftlik → Pazar'da sat → dükkân → ham malı işle ...); ödül kazanımı sıradan BAĞIMSIZ: ham malı dükkândan ÖNCE işleyen oyuncu `ilk_isleme`
 *   ödülünü yine alır (aynı tutar), `ilk_dukkan` sıradakide kalır ("kilit yok, seçim var").
 * - T-6 ("çiftliğinin tahılını sat" ilk satıştan sonra da görünüyor"): sunucu `ilk_satis`ı İHRACAT satışı gerçekleşince saat ızgarasında yazar ve `siradaki`den düşürür; ihracat emri YOKSA
 *   (yalnız çiftlik, işleme, dükkânsız) hiç kazanılmaz ve sıradakide kalır: Defter bayatlamaz, kavram "Pazar'da sat" ihracatıdır.
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, odulDegeri } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { DEFTER_GOSTERIM_SIRASI, DEFTER_ODUL_SIRASI } from "@bolge/protokol";
import { bellekDeposu } from "../src/depo/bellek";
import type { Depo } from "../src/depo/tipler";
import { DuvarSaati, VARSAYILAN_DUNYA_EPOCH_MS } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { kamuKumesi, mulkVerisi } from "./yardimci";

const E = VARSAYILAN_DUNYA_EPOCH_MS;
const TOHUM = 4;
const ILCE1 = "sn_m_ova_merkez";
const ILCE2 = "sn_m_ova_tasra";

class SahteDuvar {
  constructor(public ms: number) {}
  readonly oku = (): number => this.ms;
}

function dunyaVerisi() {
  const v = mulkVerisi();
  if (v.param.mulk) {
    v.param.mulk.yeniOyuncu.hibe = 500_000_000;
    v.param.mulk.yeniOyuncu.baslangicStok.parca = 400_000;
  }
  return v;
}

function yazarAc(depo: Depo, duvar: SahteDuvar): Promise<DunyaYazari> {
  return DunyaYazari.ac({ veri: dunyaVerisi(), tohum: TOHUM, depo, saat: new DuvarSaati(1, { duvar: duvar.oku }), commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
}

async function yetis(y: DunyaYazari): Promise<void> {
  let n = 0;
  while (y.yetisiyor) {
    await y.birTur();
    if (++n > 100_000) throw new Error("yetisme bitmiyor");
  }
}

async function komutla(y: DunyaYazari, oyuncu: string, anahtar: string, komut: Komut): Promise<void> {
  const p = y.komutGonder(oyuncu, "test", anahtar, komut);
  await y.birTur();
  const r = await p;
  if (!r.sonuc.tamam) throw new Error(`komut basarisiz (${anahtar}): ${r.sonuc.hata}`);
}

function serbest(y: DunyaYazari, ilce: string): string[] {
  const kamu = kamuKumesi(y.sim, ilce);
  const ay = y.sim.ic.mulk?.ayrilmis ?? new Set<string>();
  return (y.sim.ic.mulk?.fikstur.ilceler.find((c) => c.id === ilce)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id) && !ay.has(h.id)).map((h) => h.id);
}

function bitisikCift(liste: string[]): string[] {
  const k = new Set(liste);
  for (const id of liste) {
    const [x, yy] = id.split(":").map(Number) as [number, number];
    if (k.has(`${x + 1}:${yy}`)) return [id, `${x + 1}:${yy}`];
  }
  throw new Error("bitisik cift yok");
}

async function ilerlet(y: DunyaYazari, duvar: SahteDuvar, dakika: number): Promise<void> {
  for (let i = 0; i < dakika / 15; i++) {
    duvar.ms += 15 * 60_000;
    await y.birTur();
  }
}

/** ali katılır, çiftlik kurar; isteğe bağlı ihracat emri ve ahır (işleme). Dükkân HİÇ kurulmaz. */
async function kur(emir: boolean, ahir: boolean): Promise<{ y: DunyaYazari; duvar: SahteDuvar; emirT: number | null }> {
  const duvar = new SahteDuvar(E + 2 * SAAT);
  const y = await yazarAc(bellekDeposu(), duvar);
  await yetis(y);
  await komutla(y, SISTEM_OYUNCUSU, "k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE1 } as Komut);
  duvar.ms += 3 * SAAT;
  await y.birTur();
  const c1 = bitisikCift(serbest(y, ILCE1));
  await komutla(y, "ali", "p1", { tur: "parsel_al", ilce: ILCE1, hucreler: c1, sinif: "kirsal" });
  await komutla(y, "ali", "ins1", { tur: "tesis_insa_hucre", ilce: ILCE1, tesisTuru: "ciftlik", hucreler: c1 });
  let emirT: number | null = null;
  if (emir) {
    await komutla(y, "ali", "t1", { tur: "ticaret_emri", bolge: "sn_m_ova#ali", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    emirT = y.sim.dunya.zaman;
  }
  if (ahir) {
    const tasra = serbest(y, ILCE2);
    const c2 = bitisikCift(tasra.slice(1));
    await komutla(y, "ali", "p2", { tur: "parsel_al", ilce: ILCE2, hucreler: [tasra[0] as string], sinif: "kirsal" });
    await komutla(y, "ali", "p3", { tur: "parsel_al", ilce: ILCE2, hucreler: c2, sinif: "kirsal" });
    await komutla(y, "ali", "ins2", { tur: "tesis_insa_hucre", ilce: ILCE2, tesisTuru: "ahir", hucreler: c2 }); // işleme
  }
  return { y, duvar, emirT };
}

const kavramlar = (d: Awaited<ReturnType<DunyaYazari["defter"]>>, alan: "kazanilan" | "siradaki"): string[] => (d?.[alan] ?? []).map((k) => k.kavram);

describe("Defter siradaki: gosterim sirasi; odul siradan bagimsiz", () => {
  it("yeni oyuncuda siradaki DEFTER_GOSTERIM_SIRASI sirasinda (tabloda olanlar): dukkan, ham mali isleden once; permutasyon: ayni kavram kumesi", async () => {
    const duvar = new SahteDuvar(E + 2 * SAAT);
    const y = await yazarAc(bellekDeposu(), duvar);
    await yetis(y);
    await komutla(y, SISTEM_OYUNCUSU, "k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE1 } as Komut);
    const d = await y.defter("ali");
    const sira = kavramlar(d, "siradaki");
    expect(sira).toEqual(DEFTER_GOSTERIM_SIRASI.filter((k) => odulDegeri(y.sim.ic, k) !== undefined));
    expect(sira.indexOf("ilk_dukkan")).toBeGreaterThanOrEqual(0);
    expect(sira.indexOf("ilk_dukkan")).toBeLessThan(sira.indexOf("ilk_isleme"));
    expect([...sira].sort()).toEqual([...DEFTER_ODUL_SIRASI.filter((k) => odulDegeri(y.sim.ic, k) !== undefined)].sort()); // eski siranin permutasyonu
    await y.kapat();
  }, 60_000);

  it("kilit yok, secim var: ham mali DUKKANDAN ONCE isleyen oyuncu ilk_isleme odulunu yine alir (ayni tutar); ilk_dukkan siradakide kalir; siradaki yeni sirada", async () => {
    const { y, duvar } = await kur(false, true);
    await ilerlet(y, duvar, 100 * 60);
    const d = await y.defter("ali");
    expect(kavramlar(d, "kazanilan")).toContain("ilk_isleme");
    expect(d?.kazanilan.find((k) => k.kavram === "ilk_isleme")?.odul?.degerMili).toBe(odulDegeri(y.sim.ic, "ilk_isleme")); // tutar degismez
    expect(kavramlar(d, "siradaki")).toContain("ilk_dukkan"); // dukkan hic kurulmadi
    expect(kavramlar(d, "siradaki")).not.toContain("ilk_isleme");
    const sira = kavramlar(d, "siradaki");
    expect(sira).toEqual(DEFTER_GOSTERIM_SIRASI.filter((k) => odulDegeri(y.sim.ic, k) !== undefined && !kavramlar(d, "kazanilan").includes(k)));
    await y.kapat();
  }, 120_000);
});

describe("T-6: ilk_satis kok nedeni (cekirdek ihracat satisi), siradaki'den dusme", () => {
  it("ihracat emri VAR: saat izgarasinda kazanilir (emirden sonraki ilk saat siniri), kazanilanda ve siradaki'den DUSER; emir yokken hic kazanilmaz ve siradakide KALIR", async () => {
    const yok = await kur(false, true);
    await ilerlet(yok.y, yok.duvar, 100 * 60);
    const dYok = await yok.y.defter("ali");
    expect(kavramlar(dYok, "kazanilan")).not.toContain("ilk_satis"); // emir yok: satis yolu yok -> "Pazar'da sat" adimi kalir (dogru, bayat degil)
    expect(kavramlar(dYok, "siradaki")).toContain("ilk_satis");
    await yok.y.kapat();

    const { y, duvar, emirT } = await kur(true, false);
    await ilerlet(y, duvar, 15); // emirden hemen sonra: satis saat sinirinda gerceklesir
    const once = await y.defter("ali");
    expect(kavramlar(once, "siradaki")).toContain("ilk_satis");
    await ilerlet(y, duvar, 3 * 60);
    const sonra = await y.defter("ali");
    const k = sonra?.kazanilan.find((x) => x.kavram === "ilk_satis");
    expect(k, "ilk_satis kazanilmali").toBeDefined();
    expect(k?.tur).toBe("odul");
    expect(k?.odul?.degerMili).toBe(odulDegeri(y.sim.ic, "ilk_satis"));
    expect((k?.t ?? 0) % SAAT).toBe(0); // saat izgarasi
    expect(k?.t ?? 0).toBeGreaterThan(emirT ?? Number.POSITIVE_INFINITY - 1);
    expect(kavramlar(sonra, "siradaki")).not.toContain("ilk_satis"); // sunucu siradaki'den dusurdu: bayatlik istemci tazelemesindedir
    await y.kapat();
  }, 180_000);
});
