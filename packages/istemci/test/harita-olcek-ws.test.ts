/**
 * Ölçek büyütme (G2) GERÇEK sunucuya karşı (`harita-f4-ws` düzeni): S çiftlik → M, sunucu kabul eder; inşaat bitince tesisin hücre
 * sayısı M ayak izine ve ölçeği 1'e eşit olur; hazine düşüşü önizlemeyle (arsa + yükseltme) birebir aynıdır; ek hücresiz
 * gönderim okunur bir iletiyle reddedilir ve hiçbir şey değişmez.
 */
import { afterEach, describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { TesisDurumu } from "@bolge/cekirdek";
import { kamuKumesi, katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import { icerikTablosu } from "../src/komut/tablo";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { WsBaglanti, tesisOlcegi } from "../src/harita/baglanti-ws";
import type { IlceSahipligi } from "../src/harita/baglanti";
import { Bit } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { mulkHatasiTurkce } from "../src/harita/hata-mulk";
import { olcekPlani, olcekTesisi } from "../src/harita/olcek";

const ILCE = "sn_m_ova_merkez";
const IL = "sn_m_ova";
const fiks = parselFiksturuYukle("mini-6").ilceler.find((c) => c.id === ILCE)!;
const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);

let ts: TestSunucusu | null = null;
const acilanlar: WsBaglanti[] = [];
afterEach(async () => {
  for (const b of acilanlar.splice(0)) b.kapat();
  await ts?.kapat();
  ts = null;
});

async function bekle(kosul: () => boolean, ms = 8000): Promise<void> {
  const son = Date.now() + ms;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("koşul zamanında sağlanmadı");
    await new Promise((c) => setTimeout(c, 10));
  }
}

/** Fikstürden BHI benzeri ızgara (istemcinin planlayıcısı hücre durumunu buradan okur). */
function fiksturIzgarasi(): Izgara {
  const hucreler = fiks.hucreler.map((h) => {
    const [x, y] = h.id.split(":").map(Number) as [number, number];
    return { x, y, h };
  });
  const x0 = Math.min(...hucreler.map((c) => c.x));
  const y0 = Math.min(...hucreler.map((c) => c.y));
  const genislik = Math.max(...hucreler.map((c) => c.x)) - x0 + 1;
  const yukseklik = Math.max(...hucreler.map((c) => c.y)) - y0 + 1;
  const durum = new Uint8Array(genislik * yukseklik);
  const sinifBit = { kirsal: 1 << 5, kasaba: 2 << 5, sehir: 3 << 5 } as const;
  for (const { x, y, h } of hucreler) {
    let d: number = Bit.ICERIDE | sinifBit[h.sinif];
    if (h.engel === "su") d |= Bit.SU;
    else if (h.engel === "askeri") d |= Bit.ASKERI;
    else if (h.engel === "yol") d |= Bit.YOL;
    durum[(y - y0) * genislik + (x - x0)] = d;
  }
  return { x0, y0, genislik, yukseklik, durum };
}

/** Çekirdekte ayrılmış (yeni oyunculara özel) hücreler: bu testin oyuncusu katılım ilçesi olmayan yeni oyuncudur; onlar satılmaz. */
function ayrilmisKume(): Set<string> {
  return (ts!.yazar.sim.ic.mulk as unknown as { ayrilmis: Set<string> }).ayrilmis;
}

/** Tesis kimliğinden çekirdekteki durum (sunucu gerçeği). */
function sunucuTesisi(tesis: number): TesisDurumu | undefined {
  for (const b of ts!.yazar.sim.dunya.bolgeler) {
    const t = b.tesisler.find((x) => x.id === tesis);
    if (t) return t;
  }
  return undefined;
}

/** Yatayda bitişik iki satılabilir kırsal hücre; çevrede en az iki serbest uygun komşu (ek hücre için yer): kamu ve ayrılmış dışı. */
function ciftSec(): [string, string] {
  const kamu = kamuKumesi(ts!.yazar.sim, ILCE);
  const ay = ayrilmisKume();
  const uygun = new Set(fiks.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id) && !ay.has(h.id)).map((h) => h.id));
  for (const id of [...uygun].sort()) {
    const [x, y] = id.split(":").map(Number) as [number, number];
    if (!uygun.has(`${x + 1}:${y}`)) continue;
    const komsu = [`${x - 1}:${y}`, `${x + 2}:${y}`, `${x}:${y - 1}`, `${x}:${y + 1}`, `${x + 1}:${y - 1}`, `${x + 1}:${y + 1}`].filter((k) => uygun.has(k)).length;
    if (komsu >= 2) return [id, `${x + 1}:${y}`];
  }
  throw new Error("uygun hücre çifti yok");
}

/** ali: yurtsuz katılım, çiftlik kurar, inşaat biter. Dönüş: bağlantı, tesis kimliği, hücreler. */
async function kurulum(): Promise<{ a: WsBaglanti; tesis: number; cift: [string, string] }> {
  const v = mulkVerisi();
  ts = await testSunucusu({ veri: v });
  const y = await ts.baglan(SISTEM_OYUNCUSU);
  await katil(y, "ali", []);
  await y.zamanIlerlet(SAAT);
  const a = await WsBaglanti.ac({ url: ts.url, token: token("ali"), istemciKimligi: "t-ali", geriCekilmeMs: { ilk: 30, en: 100 } });
  acilanlar.push(a);
  await a.sahiplikAl(ILCE);
  const cift = ciftSec();
  expect((await a.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: cift, sinif: "kirsal" })).tamam).toBe(true);
  expect((await a.tesisInsa({ tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: cift })).tamam).toBe(true);
  await y.zamanIlerlet(SAAT + 24 * SAAT);
  await bekle(() => a.ozet()!.surenInsaat === 0 && a.ozet()!.simZamani >= 25 * SAAT);
  const sh = (await a.sahiplikAl(ILCE))!;
  const yapi = sh.yapilar!.find((k) => k.durum === "tesis")!;
  expect(yapi).toMatchObject({ tur: "ciftlik", sahip: "ali" });
  return { a, tesis: yapi.id, cift };
}

function planla(sh: IlceSahipligi, tesisKaydi: Parameters<typeof olcekTesisi>[1], hedef: 1 | 2, a: WsBaglanti): ReturnType<typeof olcekPlani> {
  const tesis = olcekTesisi(ic, tesisKaydi, (t) => (t === "ciftlik" ? "Çiftlik" : t))!;
  const kamu = kamuKumesi(ts!.yazar.sim, ILCE);
  const ay = ayrilmisKume();
  return olcekPlani({
    ic,
    tesis,
    hedef,
    izgara: fiksturIzgarasi(),
    sahiplik: sh,
    ben: "ali",
    ad: (s) => a.oyuncuAdi(s),
    kamu: (id) => (kamu.has(id) ? "Kamu arsası" : ay.has(id) ? "Ayrılmış hücre" : null),
    hazineMili: a.ozet()!.hazineMili,
    surenInsaat: a.ozet()!.surenInsaat,
  });
}

describe("ölçek büyütme: gerçek sunucu", () => {
  it("S → M kabul edilir; inşaat bitince hücre sayısı M ayak izi ve ölçek 1; hazine düşüşü önizlemeyle birebir", async () => {
    const { a, tesis, cift } = await kurulum();
    const sh = (await a.sahiplikAl(ILCE))!;
    const kayit = sh.yapilar!.find((k) => k.id === tesis)!;
    expect(sunucuTesisi(tesis)).toMatchObject({ id: tesis });
    expect(sunucuTesisi(tesis)!.olcek ?? 0).toBe(0);
    expect(kayit.hucreler).toEqual([...cift].sort());

    const plan = planla(sh, kayit, 1, a);
    expect(plan.gecerli).toBe(true);
    expect(plan.ekHucreler).toHaveLength(1);
    expect(plan.alinacak).toHaveLength(1);
    expect(plan.sinif).toBe("kirsal");
    expect(plan.yapiMili).toBe(9_000_000);
    expect(plan.toplamMili).toBe(plan.arsaMili + plan.yapiMili);

    const hazineOnce = a.ozet()!.hazineMili!;
    const sunucuHazineOnce = ts!.yazar.sim.dunya.oyuncular.find((o) => o.id === "ali")!.hazine.miktar;
    const r = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis, olcek: 1, ekHucreler: plan.ekHucreler, ...(plan.sinif ? { sinif: plan.sinif } : {}) });
    expect(r).toMatchObject({ tamam: true });
    await bekle(() => a.ozet()!.surenInsaat === 1);

    // Hazine düşüşü = önizleme (arsa + yükseltme parası), hem istemci hem sunucu tarafında; malzeme hazineye girmez
    const hazineSonra = a.ozet()!.hazineMili!;
    expect(hazineOnce - hazineSonra).toBe(plan.toplamMili);
    expect(sunucuHazineOnce - ts!.yazar.sim.dunya.oyuncular.find((o) => o.id === "ali")!.hazine.miktar).toBe(plan.toplamMili);
    // Sunucuda: ek hücre alındı ve işaretlendi; yükseltme inşaatı sürüyor; tesis hâlâ S
    expect(ts!.yazar.sim.dunya.insaatlar.some((i) => i.tur === "olcek" && i.hedef === tesis && i.olcek === 1)).toBe(true);
    expect(sunucuTesisi(tesis)!.olcek ?? 0).toBe(0);

    // Süren büyütme istemcide görünür: işletme satırı ve yapı kaydı (tür tesisten; hedef ölçek bu oturumdan)
    const isl = a.isletme()!;
    const satir = isl.yapilar.find((y) => y.yukseltme !== undefined)!;
    expect(satir).toMatchObject({ durum: "insaat", tur: "ciftlik", ilce: ILCE, yukseltme: { tesis, olcek: 1 } });
    const sh2 = (await a.sahiplikAl(ILCE))!;
    const ins = sh2.yapilar!.find((y) => y.yukseltme !== undefined)!;
    expect(ins).toMatchObject({ durum: "insaat", tur: "ciftlik", hucreler: plan.ekHucreler, yukseltme: { tesis, olcek: 1 } });
    // Süren yükseltme ikinci kez istenemez
    const tekrar = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis, olcek: 2, ekHucreler: [], sinif: "kirsal" });
    expect(tekrar.tamam).toBe(false);

    // İnşaat biter: hücre sayısı M ayak izi (3), ölçek 1
    await ts!.istemciler[0]!.zamanIlerlet(ts!.yazar.sim.dunya.zaman + 24 * SAAT);
    await bekle(() => a.ozet()!.surenInsaat === 0);
    expect(sunucuTesisi(tesis)!.olcek).toBe(1);
    const sunucuHucreler = ts!.yazar.sim.dunya.mulk!.hucreler.filter((h) => h.tesis === tesis).map((h) => h.id);
    expect(sunucuHucreler).toHaveLength(ic.param.mulk!.olcekHucre["ciftlik"]![1]);
    expect(sunucuHucreler).toContain(plan.ekHucreler[0]);
    const sh3 = (await a.sahiplikAl(ILCE))!;
    const bitmis = sh3.yapilar!.find((y) => y.id === tesis)!;
    expect(bitmis).toMatchObject({ durum: "tesis", tur: "ciftlik" });
    expect(bitmis.hucreler).toHaveLength(3);
    expect(bitmis.hucreler).toContain(plan.ekHucreler[0]);
    // Karede ölçek (K2 `kare-olcek`: `tesisOlcek`; hiç M/L tesis yoksa alan yazılmaz → S için tanımsız) ya da yoksa ayak izinden: ikisi de M
    expect([undefined, 0]).toContain(kayit.olcek);
    expect([undefined, 1]).toContain(bitmis.olcek);
    expect(olcekTesisi(ic, bitmis, (t) => t)).toMatchObject({ olcek: 1 });
    expect(a.isletme()!.yapilar.find((y) => y.anahtar === `t${tesis}`)).toMatchObject({ hucre: 3 });
    expect(a.sunucuHatalari).toEqual([]);
  });

  it("ek hücresiz gönderim reddedilir: okunur ileti, hiçbir şey değişmez", async () => {
    const { a, tesis } = await kurulum();
    const hazineOnce = a.ozet()!.hazineMili!;
    const insaatOnce = ts!.yazar.sim.dunya.insaatlar.length;
    const hucreOnce = ts!.yazar.sim.dunya.mulk!.hucreler.length;
    const r = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis, olcek: 1, ekHucreler: [] });
    expect(r).toMatchObject({ tamam: false, hata: "sunucu", mesaj: "Bu büyütme 1 ek bitişik hücre ister; hücreler seçilmedi." });
    // yanlış sayıda ek hücre ve kopuk (bitişik olmayan) hücre
    const sh = (await a.sahiplikAl(ILCE))!;
    const kamu = kamuKumesi(ts!.yazar.sim, ILCE);
    const bosKirsal = fiks.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id) && !ayrilmisKume().has(h.id) && !sh.hucreler.has(h.id));
    const uzakKomsusuz = bosKirsal[bosKirsal.length - 1]!; // yapıdan uzak, bitişik olmayan hücre
    const uzak = bosKirsal[bosKirsal.length - 2]!;
    const kopuk = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis, olcek: 1, ekHucreler: [uzakKomsusuz.id], sinif: "kirsal" });
    expect(kopuk).toMatchObject({ tamam: false, mesaj: "Ek hücreler yapıya kenar kenara bitişik olmalı." });
    const fazla = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis, olcek: 1, ekHucreler: [uzakKomsusuz.id, uzak.id], sinif: "kirsal" });
    expect(fazla).toMatchObject({ tamam: false, mesaj: "Bu büyütme 1 ek hücre ister (seçilen 2)." });
    expect(a.ozet()!.hazineMili).toBe(hazineOnce);
    expect(ts!.yazar.sim.dunya.insaatlar.length).toBe(insaatOnce);
    expect(ts!.yazar.sim.dunya.mulk!.hucreler.length).toBe(hucreOnce);
  });

  it("başkasının hücresi, olmayan tesis ve yanlış işletme: Türkçe reddedilir", async () => {
    const { a, tesis } = await kurulum();
    const kamu = kamuKumesi(ts!.yazar.sim, ILCE);
    const y = ts!.istemciler[0]!;
    await katil(y, "veli", []);
    const v = await WsBaglanti.ac({ url: ts!.url, token: token("veli"), istemciKimligi: "t-veli", geriCekilmeMs: { ilk: 30, en: 100 } });
    acilanlar.push(v);
    // veli ali'nin yanındaki bir hücreyi alır
    const sh = (await a.sahiplikAl(ILCE))!;
    const [x, yy] = [...sh.hucreler.keys()][0]!.split(":").map(Number) as [number, number];
    const komsu = [`${x + 2}:${yy}`, `${x - 1}:${yy}`, `${x}:${yy + 1}`, `${x}:${yy - 1}`].find((id) => fiks.hucreler.some((h) => h.id === id && h.uygun && h.sinif === "kirsal") && !kamu.has(id) && !ayrilmisKume().has(id) && !sh.hucreler.has(id))!;
    expect(komsu).toBeTruthy();
    await v.sahiplikAl(ILCE);
    expect((await v.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: [komsu], sinif: "kirsal" })).tamam).toBe(true);
    await bekle(() => a.kare?.ilceler?.some((c) => c.hucreler.some((h) => h[0] === komsu && h[1] === "veli")) === true);
    const r = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis, olcek: 1, ekHucreler: [komsu], sinif: "kirsal" });
    expect(r).toMatchObject({ tamam: false, mesaj: "Bir hücre az önce veli tarafından alındı." });
    const yok = await a.olcekYukselt({ bolge: `${IL}#ali`, tesis: 9999, olcek: 1, ekHucreler: [] });
    expect(yok).toMatchObject({ tamam: false, mesaj: "Bu tesis artık yok." });
    const yanlis = await a.olcekYukselt({ bolge: `${IL}#veli`, tesis, olcek: 1, ekHucreler: [] });
    expect(yanlis.tamam).toBe(false);
  });
});

describe("hata çevirisi (çekirdek metni → Türkçe)", () => {
  it("ölçek büyütme iletileri", () => {
    const t = (m: string, ad?: (x: string) => string): string => mulkHatasiTurkce(m, ad);
    expect(t("olcek yukseltmesi 2 ek bitisik hucre ister (ekHucreler)")).toBe("Bu büyütme 2 ek bitişik hücre ister; hücreler seçilmedi.");
    expect(t("olcek yukseltmesi 2 ek hucre ister (verilen 1)")).toBe("Bu büyütme 2 ek hücre ister (seçilen 1).");
    expect(t("bu yukseltme ek hucre gerektirmez (ekHucreler bos olmali)")).toBe("Bu büyütme için ek hücre gerekmiyor.");
    expect(t("ek hucreler tesisin hucrelerine kenar-bitisik olmali: 1:1")).toBe("Ek hücreler yapıya kenar kenara bitişik olmalı.");
    expect(t("sahipsiz hucre icin sinif gerekli: 1:1")).toBe("Satın alınacak hücrelerin arsa sınıfı belirtilmedi.");
    expect(t("tesis zaten ayni veya daha buyuk olcekte: 1")).toBe("Tesis zaten bu ölçekte ya da daha büyük.");
    expect(t("tesiste olcek yukseltmesi suruyor: 4")).toBe("Bu tesiste büyütme zaten sürüyor.");
    expect(t("hucre zaten sahipli: 1:2 (veli)", (x) => (x === "veli" ? "Veli" : x))).toBe("Bir hücre az önce Veli tarafından alındı.");
    expect(t("hucre bos degil: 1:2")).toBe("Hücrede zaten yapı ya da inşaat var.");
    expect(t("yetersiz hazine (gereken 12500000)")).toBe("Hazinede yeterli para yok (gereken 12.500\u00a0₺).");
    expect(t("ayni anda en cok 2 insaat")).toBe("Aynı anda en çok 2 inşaat sürebilir; birinin bitmesini bekle.");
    expect(t("bolgede boyle bir tesis yok: 9")).toBe("Bu tesis artık yok.");
    expect(t("tesis turu mulk kipinde olceklenemez")).toBe("Bu yapı büyütülemez.");
  });

  it("karedeki tesis ölçeği: `tesisOlcek` listesi varsa okunur (listede olmayan S), alan yoksa tanımsız (ayak izinden)", () => {
    expect(tesisOlcegi({}, 4)).toBeUndefined();
    expect(tesisOlcegi({ tesisOlcek: [[4, 1], [5, 2]] }, 4)).toBe(1);
    expect(tesisOlcegi({ tesisOlcek: [[4, 1], [5, 2]] }, 5)).toBe(2);
    expect(tesisOlcegi({ tesisOlcek: [[4, 1]] }, 9)).toBe(0);
    expect(tesisOlcegi({ tesisOlcek: [] }, 9)).toBe(0);
    expect(tesisOlcegi({ tesisOlcek: [[4, 7]] }, 4)).toBe(0);
  });
});
