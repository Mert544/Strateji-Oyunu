/**
 * Oyun oturumu deposu sözleşmesi (İ2): bellek, dosya ve pg depoları AYNI davranışı verir. Depo dünya başınadır; `ikinciDunya` verilirse (pg) başka bir dünyanın satırlarına
 * dokunulmadığı da denetlenir.
 */
import { expect } from "vitest";
import { OTURUM_GUN_MS, OYUN_OTURUM_OMRU_MS } from "../src/depo/tipler";
import type { OyunOturumDeposu } from "../src/depo/tipler";

const GUN = OTURUM_GUN_MS;

export async function oyunOturumSozlesmesi(depo: OyunOturumDeposu, diger?: OyunOturumDeposu): Promise<void> {
  // --- açma, son oturum, kapanış ---
  expect(await depo.sonOturum("ali")).toBeNull();
  expect(await depo.oku()).toEqual([]);
  const a1 = await depo.ac("ali", 1_000);
  expect(a1).toMatchObject({ oyuncu: "ali", acilis: 1_000, kapanis: null });
  expect(typeof a1.id).toBe("number");
  expect(await depo.sonOturum("ali")).toEqual(a1);
  await depo.kapanisYaz(a1.id, 5_000);
  expect(await depo.sonOturum("ali")).toEqual({ ...a1, kapanis: 5_000 });
  await depo.kapanisYaz(a1.id, null); // yeniden açıldı
  expect((await depo.sonOturum("ali"))?.kapanis).toBeNull();
  await depo.kapanisYaz(a1.id, 6_000);
  await depo.kapanisYaz(999_999, 1); // bilinmeyen kimlik: yok sayılır, hata yok

  // en yeni (acilis) oturum "son"dur; kimlikler artar
  const a2 = await depo.ac("ali", 20_000);
  const v1 = await depo.ac("veli", 10_000);
  expect(a2.id).toBeGreaterThan(a1.id);
  expect((await depo.sonOturum("ali"))?.id).toBe(a2.id);
  expect((await depo.sonOturum("veli"))?.id).toBe(v1.id);
  expect((await depo.oku()).map((o) => `${o.oyuncu}:${o.acilis}`)).toEqual(["ali:1000", "veli:10000", "ali:20000"]); // acilis sırasıyla
  expect((await depo.oku("ali")).map((o) => o.id)).toEqual([a1.id, a2.id]);
  expect(await depo.oku("yok")).toEqual([]);

  // --- toplulaştırma: 90 gün (günün başına yuvarlı) sonrası ayrıntı silinir, günlük toplu sayı kalır ---
  const T0 = 100 * GUN; // yuvarlak bir gün başı
  const eski1 = await depo.ac("ali", T0 + 1_000);
  await depo.kapanisYaz(eski1.id, T0 + 61_000); // 60 sn
  const eski2 = await depo.ac("veli", T0 + 2_000);
  await depo.kapanisYaz(eski2.id, T0 + 32_000); // 30 sn
  const eski3 = await depo.ac("ali", T0 + 3_000); // aynı gün, ikinci oturum, açık kalmış (süre sayılmaz)
  const yeni = await depo.ac("ali", T0 + 50 * GUN);
  expect(eski3.kapanis).toBeNull();
  const simdi = T0 + 91 * GUN; // omur 90 gün: kesim = (simdi - 90g) günün başına yuvarlı = T0 + 1g
  const once = (await depo.oku()).length;
  const silinen = await depo.toplulastir(simdi);
  // ilk üç satır (acilis 1000, 10000, 20000: gün 0) ve T0 günündeki üç satır silinir; T0+50g kalır
  expect(silinen).toBe(once - 1);
  expect((await depo.oku()).map((o) => o.id)).toEqual([yeni.id]);
  const g = await depo.gunlukSayilar();
  expect(g).toEqual([
    { gun: 0, oturum: 3, oyuncu: 2, sureMs: 5_000 + 0 + 0 }, // a1 (1000..6000), a2 ve v1 açık
    { gun: T0, oturum: 3, oyuncu: 2, sureMs: 60_000 + 30_000 },
  ]);
  expect(await depo.toplulastir(simdi)).toBe(0); // idempotent
  expect(await depo.gunlukSayilar()).toEqual(g);
  expect(OYUN_OTURUM_OMRU_MS).toBe(90 * GUN);
  // özel ömürle: yeni satır da toplulaşır
  expect(await depo.toplulastir(T0 + 52 * GUN, 1 * GUN)).toBe(1);
  expect((await depo.gunlukSayilar()).at(-1)).toEqual({ gun: T0 + 50 * GUN, oturum: 1, oyuncu: 1, sureMs: 0 });
  expect(await depo.oku()).toEqual([]);

  // --- dünya silme: yalnız bu dünyanın satırları ---
  await depo.ac("ali", T0 + 60 * GUN);
  if (diger) await diger.ac("ali", 5);
  const rapor = await depo.dunyayiSil();
  expect(rapor.oturum).toBe(1);
  expect(rapor.gunluk).toBeGreaterThanOrEqual(3);
  expect(await depo.oku()).toEqual([]);
  expect(await depo.gunlukSayilar()).toEqual([]);
  expect(await depo.sonOturum("ali")).toBeNull();
  if (diger) expect((await diger.oku()).map((o) => o.acilis)).toEqual([5]); // diğer dünyaya dokunulmaz
  expect(await depo.dunyayiSil()).toEqual({ oturum: 0, gunluk: 0 });
  await depo.esitle();
}
