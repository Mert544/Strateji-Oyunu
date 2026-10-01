/**
 * Tembel birikimli stok API'si (spesifikasyon §3).
 *
 * Model: anlik(t) = miktar + floor((oran × (t − t0) + artik) / SAAT), [0, kapasite] aralığına kelepçeli;
 * oran = yerelOran + gelenOran (mili-birim/saat), t ms. Uzlaştırma (`stokUzlastir`) bu birikimi
 * stoğa işler: miktar güncellenir, floor'dan kalan `artik` ([0, SAAT) aralığında, mili-birim×ms)
 * saklanır ve t0 = d.zaman olur. Artik sayesinde uzlaştırmayı küçük aralıklarla yapmak ile tek
 * seferde yapmak AYNI sonucu verir (kayıpsız birikim).
 *
 * Kapasite üstü taşma bolge.israf[mal]'a yazılır; 0'ın altı 0'a kelepçelenir (israf sayılmaz).
 *
 * Oran değiştiren her fonksiyon (stokOranAyarla, stokGelenEkle, stokEkle) şu sırayı izler:
 * uzlaştır -> değiştir -> surum++ -> eşik zamanını hesapla -> ctx.planla(esik). Eşik olayı
 * stoğun boşalacağı (oran < 0, miktar > 0) veya dolacağı (oran > 0, miktar < kapasite) an içindir;
 * `surum` eşleşmezse motor olayı yok sayar. Bu fonksiyonlar lojistiği KİRLETMEZ; kirletmek çağıranın işidir
 * (motor oran_delta ve esik olaylarında kirletir).
 *
 * Optimizasyon: oran/delta değişmiyorsa (aynı yerelOran, delta = 0, uygulanan miktar 0) hiçbir şey
 * yapılmaz: surum artmaz, yeni eşik planlanmaz (mevcut eşik hâlâ geçerlidir).
 */
import { kuyrukSuz } from "./kuyruk";
import { borcSilmeKaydet, paraKaydet } from "./paraSayac";
import type { HazineKalemi } from "./paraSayac";
import { tabanBol } from "./sabit";
import { SAAT } from "./tipler";
import type { Baglam, Dunya, Mili, Ms, OyuncuDurumu, OyuncuId, Stok } from "./tipler";

// ---------------------------------------------------------------------------
// Düşük seviye: tek Stok üzerinde
// ---------------------------------------------------------------------------

/** oran × dt + artik toplamının SAAT'e bölümü: { delta: floor, artik: kalan }. Taşmaya karşı BigInt yedekli. */
function birikim(oran: number, dt: number, artik: number): { delta: number; artik: number } {
  const p = oran * dt;
  const x = p + artik;
  if (Number.isSafeInteger(p) && Number.isSafeInteger(x)) {
    const delta = tabanBol(x, SAAT);
    return { delta, artik: x - delta * SAAT };
  }
  const xb = BigInt(oran) * BigInt(dt) + BigInt(artik);
  const sb = BigInt(SAAT);
  let q = xb / sb;
  if (xb % sb !== 0n && xb < 0n) q -= 1n;
  return { delta: Number(q), artik: Number(xb - q * sb) };
}

/** ceil((a × b + ek) / c), c > 0. */
function tavanBolCarpEk(a: number, b: number, ek: number, c: number): number {
  const p = a * b;
  const x = p + ek;
  if (Number.isSafeInteger(p) && Number.isSafeInteger(x)) return -tabanBol(-x, c);
  const xb = BigInt(a) * BigInt(b) + BigInt(ek);
  const cb = BigInt(c);
  let q = xb / cb;
  if (xb % cb !== 0n && xb > 0n) q += 1n;
  return Number(q);
}

/**
 * Stoğu değiştirmeden t anındaki miktarı döndürür ([0, kapasite]).
 * t < s.t0 ise (geçmişe bakış yok) mevcut miktar döner.
 */
export function anlikMiktar(s: Stok, t: Ms): Mili {
  const oran = s.yerelOran + s.gelenOran;
  let ham = s.miktar;
  if (oran !== 0 && t > s.t0) ham += birikim(oran, t - s.t0, s.artik).delta;
  return ham < 0 ? 0 : ham > s.kapasite ? s.kapasite : ham;
}

/**
 * Tek bir Stok'u t anına uzlaştırır (d/ctx gerektirmez). Kapasiteyi aşan miktarı (israf) döndürür.
 * miktar [0, kapasite]'ye kelepçelenir; artik korunur (kelepçede sıfırlanmaz), bu da parçalı ve tek seferlik
 * uzlaştırmanın aynı miktar/israf/artik vermesini sağlar.
 */
export function stokUzlastirYerel(s: Stok, t: Ms, kelepce?: { miktar: number }): Mili {
  let israf = 0;
  if (t > s.t0) {
    const oran = s.yerelOran + s.gelenOran;
    if (oran !== 0) {
      const b = birikim(oran, t - s.t0, s.artik);
      s.artik = b.artik;
      let m = s.miktar + b.delta;
      if (m > s.kapasite) {
        israf = m - s.kapasite;
        m = s.kapasite;
      } else if (m < 0) {
        if (kelepce !== undefined) kelepce.miktar += -m; // para defteri: kelepçede silinen (ödenmeyen) borç
        m = 0;
      }
      s.miktar = m;
    }
    s.t0 = t;
  }
  return israf;
}

/**
 * Stok için eşik (boşalma/dolma) zamanına uzaklığı döndürür (ms, >= 1); eşik yoksa -1.
 * Döndürülen dt, anlikMiktar'ın sınıra (0 veya kapasite) ilk ulaştığı andır: t0 + dt'de anlik sınıra eşit,
 * t0 + dt − 1'de değildir. Stok t0 = "şimdi" olacak biçimde uzlaştırılmış varsayılır.
 */
export function stokEsikMesafesi(s: Stok): Ms {
  const oran = s.yerelOran + s.gelenOran;
  if (oran < 0 && s.miktar > 0) {
    // floor((oran×dt + artik)/SAAT) <= −miktar  <=>  −oran×dt >= (miktar−1)×SAAT + artik + 1
    return tavanBolCarpEk(s.miktar - 1, SAAT, s.artik + 1, -oran);
  }
  if (oran > 0 && s.miktar < s.kapasite) {
    // floor((oran×dt + artik)/SAAT) >= kapasite − miktar  <=>  oran×dt >= (kapasite−miktar)×SAAT − artik
    return tavanBolCarpEk(s.kapasite - s.miktar, SAAT, -s.artik, oran);
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Bölge stokları
// ---------------------------------------------------------------------------

/** d.zaman'a kadar birikimi uygular; kapasite üstünü bolge.israf'a yazar. */
export function stokUzlastir(d: Dunya, bolge: number, mal: number): void {
  const b = d.bolgeler[bolge];
  const s = b?.stoklar[mal];
  if (!b || !s) throw new RangeError(`stokUzlastir: gecersiz bolge/mal (${bolge}/${mal})`);
  const israf = stokUzlastirYerel(s, d.zaman);
  if (israf > 0) b.israf[mal] = (b.israf[mal] as number) + israf;
}

/**
 * Eşik olayını (yeniden) planlar: boşalma veya dolma için ctx.planla(esik, surum = stok.surum).
 * Stok d.zaman'a uzlaştırılmış olmalıdır. Eşik yoksa bir şey yapmaz.
 */
export function stokEsikPlanla(d: Dunya, ctx: Baglam, bolge: number, mal: number): void {
  const s = (d.bolgeler[bolge] as { stoklar: Stok[] }).stoklar[mal] as Stok;
  const dt = stokEsikMesafesi(s);
  if (dt >= 1) ctx.planla(d, d.zaman + dt, { tur: "esik", bolge, mal, surum: s.surum });
}

/**
 * Eşik budaması anahtarı. YALNIZ kanıt testleri içindir (docs/06 §14.1: budamasız koşu = S2 kodu birebir); üretimde
 * daima açıktır ve kapatılmamalıdır. Dünya durumuna girmez.
 */
export const esikBudamasi = { acik: true };

/**
 * Eskimiş eşik olaylarını kuyruktan atar (docs/06 §14.1). Eşik olayı, stoğun `surum`'u olayınkiyle eşleşmiyorsa
 * eskimiştir: motor onu işlediğinde zaten yok sayar (hiçbir etkisi yoktur). Atılan olay sayısını döndürür.
 * Her bölge stoğunun `surum`'u yalnız bu modülde artar ve her artışta yeni eşik planlanır; bu yüzden budamadan sonra
 * kuyrukta stok başına en çok bir (etkin) eşik kalır. Etkin olayların `sira`'sı ve işlenme sırası değişmez; `sayac.olay`
 * da değişmez (eşikler yine planlanır, yalnız eskiyince atılır).
 */
export function eskimisEsikleriBuda(d: Dunya): number {
  if (!esikBudamasi.acik) return 0;
  const bolgeler = d.bolgeler;
  return kuyrukSuz(d.kuyruk, (o) => {
    const v = o.veri;
    if (v.tur !== "esik") return true;
    const s = bolgeler[v.bolge]?.stoklar[v.mal];
    return s !== undefined && s.surum === v.surum;
  });
}

function bolgeStoku(d: Dunya, bolge: number, mal: number): Stok {
  const s = d.bolgeler[bolge]?.stoklar[mal];
  if (!s) throw new RangeError(`gecersiz bolge/mal (${bolge}/${mal})`);
  return s;
}

/**
 * Yerel oranı (üretim − tüketim − giden akış, mili-birim/saat) ayarlar.
 * uzlaştır -> yerelOran = yeni -> surum++ -> eşik planla. Oran değişmiyorsa hiçbir şey yapmaz.
 */
export function stokOranAyarla(
  d: Dunya,
  ctx: Baglam,
  bolge: number,
  mal: number,
  yeniYerelOran: Mili,
): void {
  const s = bolgeStoku(d, bolge, mal);
  if (s.yerelOran === yeniYerelOran) return;
  stokUzlastir(d, bolge, mal);
  s.yerelOran = yeniYerelOran;
  s.surum++;
  stokEsikPlanla(d, ctx, bolge, mal);
}

/**
 * Gelen akış oranına delta ekler (oran_delta olayının uygulaması; delta negatif olabilir).
 * uzlaştır -> gelenOran += delta -> surum++ -> eşik planla. delta = 0 ise hiçbir şey yapmaz.
 */
export function stokGelenEkle(d: Dunya, ctx: Baglam, bolge: number, mal: number, delta: Mili): void {
  if (delta === 0) return;
  const s = bolgeStoku(d, bolge, mal);
  stokUzlastir(d, bolge, mal);
  s.gelenOran += delta;
  s.surum++;
  stokEsikPlanla(d, ctx, bolge, mal);
}

/**
 * Stoğa anında miktar ekler/çıkarır (mili-birim, negatif olabilir). [0, kapasite] sınırı uygulanır;
 * UYGULANAN miktarı döndürür (işaretli). Kapasiteyi aşan kısım eklenmez ve israf sayılmaz
 * (çağıran isterse `miktar − uygulanan` kadarını israfa yazar).
 * uzlaştır -> miktar değiştir -> surum++ -> eşik planla. Uygulanan 0 ise eşik/sürüm dokunulmaz.
 */
export function stokEkle(d: Dunya, ctx: Baglam, bolge: number, mal: number, miktar: Mili): Mili {
  const s = bolgeStoku(d, bolge, mal);
  stokUzlastir(d, bolge, mal);
  const hedef = s.miktar + miktar;
  const yeni = hedef < 0 ? 0 : hedef > s.kapasite ? s.kapasite : hedef;
  const uygulanan = yeni - s.miktar;
  if (uygulanan === 0) return 0;
  s.miktar = yeni;
  s.surum++;
  stokEsikPlanla(d, ctx, bolge, mal);
  return uygulanan;
}

// ---------------------------------------------------------------------------
// Hazine (oyuncu başına para stoğu; kapasite çok büyük, 0'ın altına inmez)
// ---------------------------------------------------------------------------

/**
 * Oyuncuyu kimliğiyle bulur (d.oyuncular id'ye göre, JS dize sıralamasıyla sıralıdır; ikili arama).
 * Yoksa undefined.
 */
export function oyuncuBul(d: Dunya, oyuncu: OyuncuId): OyuncuDurumu | undefined {
  let lo = 0;
  let hi = d.oyuncular.length - 1;
  while (lo <= hi) {
    const orta = (lo + hi) >> 1;
    const o = d.oyuncular[orta] as OyuncuDurumu;
    if (o.id === oyuncu) return o;
    if (o.id < oyuncu) lo = orta + 1;
    else hi = orta - 1;
  }
  return undefined;
}

/** Oyuncunun d.zaman'daki hazinesi (mili-para). Oyuncu yoksa 0. */
export function anlikHazine(d: Dunya, oyuncu: OyuncuId): Mili {
  const o = oyuncuBul(d, oyuncu);
  return o ? anlikMiktar(o.hazine, d.zaman) : 0;
}

/** Hazine stoğunu d.zaman'a uzlaştırır; para defteri açıksa kelepçede silinen borcu musluk kalemine (`borcSilme`) yazar. */
function hazineIsle(d: Dunya, o: OyuncuDurumu): void {
  if (d.mulk?.para === undefined) {
    stokUzlastirYerel(o.hazine, d.zaman);
    return;
  }
  const k = { miktar: 0 };
  stokUzlastirYerel(o.hazine, d.zaman, k);
  borcSilmeKaydet(d, k.miktar);
}

/** Hazineyi d.zaman'a uzlaştırır. Oyuncu yoksa hiçbir şey yapmaz. */
export function hazineUzlastir(d: Dunya, oyuncu: OyuncuId): void {
  const o = oyuncuBul(d, oyuncu);
  if (o) hazineIsle(d, o);
}

/**
 * Hazinenin saatlik net oranını ayarlar (mili-para/saat; gelir − gider). Önce uzlaştırır.
 * Negatif oranda hazine 0'da kalır (0'ın altına inmez); eşik olayı planlanmaz.
 * Oyuncu yoksa hiçbir şey yapmaz.
 */
export function hazineOranAyarla(d: Dunya, oyuncu: OyuncuId, oran: Mili): void {
  const o = oyuncuBul(d, oyuncu);
  if (!o || o.hazine.yerelOran === oran) return;
  hazineIsle(d, o);
  o.hazine.yerelOran = oran;
  o.hazine.surum++;
}

/**
 * Hazineye anında para ekler/çıkarır (mili-para, negatif = harcama). Önce uzlaştırır.
 * Sonuç negatif olacaksa (veya oyuncu yoksa) hiçbir şeyi değiştirmeden false döner; başarılıysa true.
 * Yeterlilik UZLAŞTIRMADAN ÖNCE anlık miktarla denetlenir: başarısız çağrı hazinenin temsiline (miktar/t0/artik)
 * de dokunmaz. Böylece başarısız komut (ör. "hazine yetersiz") durum özetini değiştirmez ve yalnız başarılı
 * komutları kaydeden günlüğün yeniden oynatılması her an birebir aynı özeti verir (docs/06 §14).
 */
export function hazineEkle(d: Dunya, oyuncu: OyuncuId, delta: Mili, kalem: HazineKalemi = delta < 0 ? "harcama" : "diger"): boolean {
  const o = oyuncuBul(d, oyuncu);
  if (!o) return false;
  if (anlikMiktar(o.hazine, d.zaman) + delta < 0) return false;
  hazineIsle(d, o);
  const yeni = o.hazine.miktar + delta;
  if (yeni < 0) return false;
  o.hazine.miktar = yeni > o.hazine.kapasite ? o.hazine.kapasite : yeni;
  paraKaydet(d, delta, kalem);
  return true;
}

