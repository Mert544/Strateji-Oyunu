/**
 * Hesap deposu sözleşmesi: bellek, dosya ve pg depoları AYNI davranışı verir (hesap başına bir oyuncu, tek kullanımlık ve süreli bağlantı,
 * aynı adresin eski bağlantılarının düşmesi, tarayıcı bağı, oturum, silme). `onek` her çağrıda benzersiz olmalıdır (pg'de tablolar ortaktır).
 */
import { expect } from "vitest";
import { OyuncuCakismasi } from "../src/depo/tipler";
import type { BaglantiKaydi, HesapDeposu, HesapKaydi, OturumKaydi } from "../src/depo/tipler";

export function hesapSozlesmesi(depo: HesapDeposu, onek: string): Promise<void> {
  return sozlesme(depo, onek);
}

async function sozlesme(depo: HesapDeposu, onek: string): Promise<void> {
  const hesap = (ad: string, oyuncu = `o_${ad}`): HesapKaydi => ({ id: `${onek}-h-${ad}`, eposta: `${ad}@ornek.org`, anahtar: `${onek}-${ad}@ornek.org`, oyuncu: `${onek}-${oyuncu}`.slice(0, 32), olusturma: 1_000 });
  const baglanti = (ad: string, ozet: string, bitis: number, tarayiciOzeti: string | null = null): BaglantiKaydi => ({ ozet: `${onek}-${ozet}`, eposta: `${ad}@ornek.org`, anahtar: `${onek}-${ad}@ornek.org`, bitis, tarayiciOzeti, olusturma: 1_000 });
  const oturum = (id: string, h: HesapKaydi, bitis: number, mutlakBitis: number): OturumKaydi => ({ id: `${onek}-${id}`, hesap: h.id, gizliOzet: `gizli-${id}`, olusturma: 1_000, sonKullanim: 1_000, bitis, mutlakBitis });

  // --- hesap: hesap başına bir oyuncu ---
  const ali = hesap("ali");
  expect(await depo.hesapBulAnahtar(ali.anahtar)).toBeNull();
  expect(await depo.hesapBulId(ali.id)).toBeNull();
  expect(await depo.hesapOlustur(ali)).toEqual({ hesap: ali, yeni: true });
  expect(await depo.hesapBulAnahtar(ali.anahtar)).toEqual(ali);
  expect(await depo.hesapBulId(ali.id)).toEqual(ali);
  // Aynı adres ikinci kez: mevcut hesap döner, ikinci bir oyuncu AÇILMAZ (verilen oyuncu yok sayılır).
  const ikinci = await depo.hesapOlustur({ ...ali, id: `${onek}-h-baska`, oyuncu: `${onek}-o_ikinci` });
  expect(ikinci.yeni).toBe(false);
  expect(ikinci.hesap).toEqual(ali);
  expect(await depo.hesapBulId(`${onek}-h-baska`)).toBeNull();
  // Oyuncu kimliği başka hesapta kullanımda: çakışma (çağıran yeni kimlik üretir).
  await expect(depo.hesapOlustur({ ...hesap("veli"), oyuncu: ali.oyuncu })).rejects.toBeInstanceOf(OyuncuCakismasi);
  expect(await depo.hesapBulAnahtar(hesap("veli").anahtar)).toBeNull(); // yarım hesap kalmaz
  const veli = hesap("veli");
  expect((await depo.hesapOlustur(veli)).yeni).toBe(true);
  // Eşzamanlı kayıt yarışı: aynı adres için birden çok hesap denemesinden YALNIZ biri yeni olur; hepsi aynı oyuncuyu görür.
  const yaris = await Promise.all(
    [1, 2, 3, 4].map((i) => depo.hesapOlustur({ id: `${onek}-h-y${i}`, eposta: "yaris@ornek.org", anahtar: `${onek}-yaris@ornek.org`, oyuncu: `${onek}-o_y${i}`, olusturma: 1_000 })),
  );
  expect(yaris.filter((r) => r.yeni)).toHaveLength(1);
  expect(new Set(yaris.map((r) => r.hesap.oyuncu)).size).toBe(1);
  // Dönen kayıt bir kopyadır (dışarıdan değiştirmek depoyu bozmaz).
  const kopya = await depo.hesapBulId(ali.id);
  if (kopya) kopya.oyuncu = "bozuk";
  expect((await depo.hesapBulId(ali.id))?.oyuncu).toBe(ali.oyuncu);

  // --- giriş bağlantısı: tek kullanım, süre, tarayıcı bağı, aynı adresin eskileri düşer ---
  await depo.baglantiEkle(baglanti("ali", "b1", 5_000));
  expect(await depo.baglantiTuket(`${onek}-b1`, 6_000, null)).toEqual({ durum: "yok" }); // süresi dolmuş (bitis <= simdi)
  await depo.baglantiEkle(baglanti("ali", "b2", 5_000));
  const t = await depo.baglantiTuket(`${onek}-b2`, 2_000, null);
  expect(t.durum).toBe("tamam");
  if (t.durum === "tamam") expect(t.kayit).toEqual(baglanti("ali", "b2", 5_000));
  expect(await depo.baglantiTuket(`${onek}-b2`, 2_000, null)).toEqual({ durum: "yok" }); // ikinci kullanım
  expect(await depo.baglantiTuket(`${onek}-yok`, 2_000, null)).toEqual({ durum: "yok" });
  // Yeni bağlantı aynı adresin eskisini düşürür; başka adres etkilenmez.
  await depo.baglantiEkle(baglanti("ali", "b3", 9_000));
  await depo.baglantiEkle(baglanti("veli", "bv", 9_000));
  await depo.baglantiEkle(baglanti("ali", "b4", 9_000));
  expect(await depo.baglantiTuket(`${onek}-b3`, 2_000, null)).toEqual({ durum: "yok" });
  expect((await depo.baglantiTuket(`${onek}-bv`, 2_000, null)).durum).toBe("tamam");
  expect((await depo.baglantiTuket(`${onek}-b4`, 2_000, null)).durum).toBe("tamam");
  // Tarayıcıya bağlı bağlantı: yanlış/eksik tarayıcıda TÜKETİLMEZ, doğrusunda tüketilir.
  await depo.baglantiEkle(baglanti("ali", "b5", 9_000, "tarayici-A"));
  expect(await depo.baglantiTuket(`${onek}-b5`, 2_000, "tarayici-B")).toEqual({ durum: "tarayici" });
  expect(await depo.baglantiTuket(`${onek}-b5`, 2_000, null)).toEqual({ durum: "tarayici" });
  expect((await depo.baglantiTuket(`${onek}-b5`, 2_000, "tarayici-A")).durum).toBe("tamam");
  expect(await depo.baglantiTuket(`${onek}-b5`, 2_000, "tarayici-A")).toEqual({ durum: "yok" });
  // Tarayıcıya bağlı olmayan bağlantı her tarayıcıda açılır.
  await depo.baglantiEkle(baglanti("ali", "b6", 9_000, null));
  expect((await depo.baglantiTuket(`${onek}-b6`, 2_000, "herhangi")).durum).toBe("tamam");

  // --- oturum ---
  const o1 = oturum("o1", ali, 20_000, 90_000);
  expect(await depo.oturumBul(o1.id)).toBeNull();
  await depo.oturumEkle(o1);
  expect(await depo.oturumBul(o1.id)).toEqual(o1);
  await depo.oturumUzat(o1.id, 5_000, 25_000);
  expect(await depo.oturumBul(o1.id)).toEqual({ ...o1, sonKullanim: 5_000, bitis: 25_000 });
  await depo.oturumUzat(`${onek}-yok`, 1, 2); // yok: hata vermez
  expect(await depo.oturumSil(o1.id)).toBe(true);
  expect(await depo.oturumSil(o1.id)).toBe(false);
  expect(await depo.oturumBul(o1.id)).toBeNull();
  // Hesabın bütün oturumları; başka hesabın oturumu kalır.
  await depo.oturumEkle(oturum("o2", ali, 20_000, 90_000));
  await depo.oturumEkle(oturum("o3", ali, 20_000, 90_000));
  await depo.oturumEkle(oturum("ov", veli, 20_000, 90_000));
  expect((await depo.hesabinOturumlariniSil(ali.id)).sort()).toEqual([`${onek}-o2`, `${onek}-o3`]);
  expect(await depo.hesabinOturumlariniSil(ali.id)).toEqual([]);
  expect(await depo.oturumBul(`${onek}-ov`)).not.toBeNull();

  // --- süresi geçenleri sil: bağlantı bitis, oturum bitis ya da mutlakBitis ---
  await depo.baglantiEkle(baglanti("ali", "s1", 3_000));
  await depo.oturumEkle(oturum("s-kayan", ali, 4_000, 90_000)); // kayan süre dolar
  await depo.oturumEkle(oturum("s-mutlak", ali, 90_000, 4_000)); // mutlak sınır dolar
  await depo.oturumEkle(oturum("s-canli", ali, 90_000, 90_000));
  const sil = await depo.sureGecmisleriSil(4_000);
  expect(sil.baglanti).toBeGreaterThanOrEqual(1);
  expect(sil.oturum).toBe(2);
  expect(await depo.oturumBul(`${onek}-s-kayan`)).toBeNull();
  expect(await depo.oturumBul(`${onek}-s-mutlak`)).toBeNull();
  expect(await depo.oturumBul(`${onek}-s-canli`)).not.toBeNull();
  expect(await depo.baglantiTuket(`${onek}-s1`, 1_000, null)).toEqual({ durum: "yok" });

  // --- sayılar (toplu) ---
  const say = await depo.sayilar();
  expect(say.hesap).toBeGreaterThanOrEqual(2);
  expect(say.oturum).toBeGreaterThanOrEqual(2);

  // --- silme (KVKK): hesap, oyuncu eşlemesi, oturumlar ve bekleyen bağlantılar gider; kimlikler döner ---
  await depo.baglantiEkle(baglanti("ali", "son", 90_000));
  const silinen = await depo.hesapSil(ali.id);
  expect((silinen ?? []).sort()).toEqual([`${onek}-s-canli`]);
  expect(await depo.hesapBulId(ali.id)).toBeNull();
  expect(await depo.hesapBulAnahtar(ali.anahtar)).toBeNull();
  expect(await depo.oturumBul(`${onek}-s-canli`)).toBeNull();
  expect(await depo.baglantiTuket(`${onek}-son`, 1_000, null)).toEqual({ durum: "yok" });
  expect(await depo.hesapSil(ali.id)).toBeNull();
  expect(await depo.hesapBulId(veli.id)).toEqual(veli); // başkası etkilenmez
  // Silinen adres yeniden kaydolabilir ve oyuncu kimliği de yeniden kullanılabilir (eşleme silinmişti).
  expect((await depo.hesapOlustur({ ...ali, id: `${onek}-h-ali2` })).yeni).toBe(true);

  // --- görünen ad (İ-1): hesapla birlikte yazılır, sonradan değişir, hesapla birlikte silinir; benzersiz DEĞİL ---
  const ayse = { ...hesap("ayse"), ad: "çalışkan değirmenci 427" };
  expect(await depo.adVarMi("çalışkan değirmenci 427")).toBe(false);
  expect(await depo.hesapOlustur(ayse)).toEqual({ hesap: ayse, yeni: true });
  expect(await depo.hesapBulId(ayse.id)).toEqual(ayse); // adSecildi/adDegisimT yok: otomatik ad
  expect(await depo.hesapBulAnahtar(ayse.anahtar)).toEqual(ayse);
  expect(await depo.adVarMi("çalışkan değirmenci 427")).toBe(true);
  expect(await depo.adVarMi("baska ad 123")).toBe(false);
  // Aynı adres yeniden kaydolmaya kalkarsa mevcut hesap (adıyla) döner; verilen yeni ad yok sayılır.
  expect((await depo.hesapOlustur({ ...ayse, id: `${onek}-h-ayse-baska`, oyuncu: `${onek}-o_ayse2`, ad: "yeni ad 111" })).hesap.ad).toBe("çalışkan değirmenci 427");
  // Ad yazma: seçildi + değişim zamanı; geri alma (null) ve olmayan hesap.
  expect(await depo.adYaz(ayse.id, "sakin balıkçı 100", true, null)).toBe(true);
  expect(await depo.hesapBulId(ayse.id)).toEqual({ ...ayse, ad: "sakin balıkçı 100", adSecildi: true });
  expect(await depo.adYaz(ayse.id, "cesur terzi 200", true, 123_456)).toBe(true);
  expect(await depo.hesapBulId(ayse.id)).toEqual({ ...ayse, ad: "cesur terzi 200", adSecildi: true, adDegisimT: 123_456 });
  expect(await depo.adYaz(`${onek}-yok-hesap`, "x y 1", false, null)).toBe(false);
  expect(await depo.adVarMi("çalışkan değirmenci 427")).toBe(false); // eski ad serbest kaldı
  // Ad benzersiz değildir: iki hesap aynı adı taşıyabilir (seçilen adlarda çakışma serbest).
  expect(await depo.adYaz(veli.id, "cesur terzi 200", true, null)).toBe(true);
  const liste = await depo.adlariListele();
  expect(liste.filter((x) => x.ad === "cesur terzi 200").map((x) => x.hesap).sort()).toEqual([ayse.id, veli.id].sort());
  expect(liste.find((x) => x.hesap === ayse.id)).toEqual({ hesap: ayse.id, oyuncu: ayse.oyuncu, ad: "cesur terzi 200" });
  // Adı olmayan (eski) hesap listede ad: null.
  const eski = hesap("eski");
  await depo.hesapOlustur(eski);
  expect((await depo.adlariListele()).find((x) => x.hesap === eski.id)).toEqual({ hesap: eski.id, oyuncu: eski.oyuncu, ad: null });
  expect((await depo.hesapBulId(eski.id))?.ad).toBeUndefined();
  // Hesap silinince ad da gider.
  expect((await depo.hesapSil(ayse.id)) ?? []).toEqual([]);
  expect((await depo.adlariListele()).some((x) => x.hesap === ayse.id)).toBe(false);
  await depo.esitle();
}
