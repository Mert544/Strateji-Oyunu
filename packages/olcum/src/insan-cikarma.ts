/**
 * İnsan testi çıkarması (İ1 + İ4, docs/arastirma/insan-testi-kilavuzu.md §7): sunucunun komut günlüğünü ÇEVRİMDIŞI yeniden oynatır, her satırın
 * kabul/ret sonucunu kaydeder ve test oyuncusu başına H6 (ii), Y1, Y2, Y5, Y6, Y7 ve A0-11 için gereken olguları çıkarır.
 *
 * Neden oynatma: günlük kabul bilgisi taşımaz ve başarısız komutlar da günlüğe girer; kabul edilen ilk yapı komutu yalnız `Simulasyon.uygula`
 * sonucundan bilinir. Oynatma sunucunun kurtarma yoluyla AYNIDIR (sunucu/src/yazar.ts `ac`): anlık görüntü yoksa dünya tohumdan kurulur ve günlük
 * seq 1'den sırayla uygulanır (`calistirKadar` bölünmesi nötrdür; ek zaman adımları sonucu değiştirmez).
 *
 * Çıktı KİŞİSEL VERİ taşımaz: oyuncu kimliği yalnız dışarıdan verilen K1…K5 kodlarına eşlenir (eşleme ayrı bir dosyadır); eşlemede olmayan
 * oyuncular yalnız emsal hesabına girer ve çıktıda görünmez. Çıktı deterministiktir (duvar saati yok): aynı günlük aynı bayt.
 *
 * Gerçek saat (İ4): her sim zamanı `{ tMs, trt }` olarak yazılır; `trt` = `dunyaEpochMs + t` Türkiye saati (+03:00) ISO biçimi (epoch yoksa null).
 *
 * Kapsam sınırları (rapora yazılır, `notlar`a girer): oturum olayları (İ2) yok → `oturumlar: null`; (ii) bağımsız ipucu verisi dışarıdan
 * gelir → `iiBagimsiz: null`; gözlemin bitişi (`bitisTMs`) son günlük kaydı, anlık görüntü zamanı ve verilen `bitisTMs` seçeneğinin en büyüğüdür
 * (pencere bu andan sonrasına uzanıyorsa Y7 ölçülemez).
 */
import { GUN, SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikHazine, kuralSurumuHesapla, mulkOyuncuBul } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, KomutSonucu, Ms, OyuncuId } from "@bolge/cekirdek";
import { ACILIS_ESLEMESI, GEC_ACILISLARI, acilisAyakIzi, ilceAyrilmisBos } from "@bolge/botlar";
import type { GecAcilis } from "@bolge/botlar";
import { tamsayiMedyan, uretenEmsal, y7EmsalDuzeyi } from "./parsel";
import type { Y7EmsalDuzeyi } from "./parsel";
import { EkonomiToplayici, dukkanKurulusuOku } from "./insan-ekonomi";
import type { EkonomiCiktisi } from "./insan-ekonomi";
import { yapiKatmani } from "./parsel/yeni-oyuncu";
import type { YapiKatmani } from "./parsel/yeni-oyuncu";

const DAKIKA = 60_000;
const YAPI_KOMUTLARI: ReadonlySet<string> = new Set(["yapi_yerlestir", "tesis_insa_hucre"]);
/** Sermaye (yatırım) komutları: hazineden çıkan tutar Y7 ve E2 (A2 alfa0-ekonomi-izleme §2) için sermaye sayılır. Ölçek yükseltme ve kenar geliştirme DAHİL (A2 O2-1). */
export const SERMAYE_KOMUTLARI: ReadonlySet<string> = new Set(["parsel_al", "yapi_yerlestir", "tesis_insa_hucre", "tesis_olcek_yukselt", "kenar_gelistir"]);
const YON_KOMUTLARI: ReadonlySet<string> = new Set(["parsel_birak", "insaat_iptal"]);
/** (ii) geniş tanımında üretim yapısı sayılmayan ek yapılar (sunucu `odul/dedektor.ts:8` ile aynı). */
export const URETIM_DISI_YAPILAR: readonly string[] = ["ambar", "ticaret_ofisi"];
/** Dükkân yapısı tür adları (A0-11; çekirdekte henüz yok: tanımlandığında kurulum zamanı çıkar). */
export const DUKKAN_TURLERI: readonly string[] = ["dukkan"];
/** H6 (ii) penceresi: katılımdan sonra 14 gün (336 saat; 14. günün sonu dahil). */
export const II_PENCERE_MS = 14 * GUN;
/** Y7 ölçüm penceresi: katılım + 14 günün son 7 günü. */
export const Y7_PENCERE_MS = 7 * GUN;
/** İlk gerçekleşen satış için dakikalık örnekleme penceresi (emir anından sonra), sonrası saatlik. */
export const SATIS_DAKIKA_PENCERESI_MS = 3 * SAAT;

/** Günlükten gereken alanlar (sunucu `GunlukKaydi`nin altkümesi; yapısal olarak uyumlu). */
export interface CikarmaGunlukKaydi {
  seq: number;
  t: Ms;
  oyuncu: OyuncuId;
  komut: Komut;
}

/** Anlık görüntüden gereken alanlar (sunucu `AnlikGoruntuKaydi`nin altkümesi). */
export interface CikarmaGoruntusu {
  seq: number;
  simZamani: Ms;
  kuralSurumu: string;
  durumOzeti: string;
  metin: string;
  ek?: { tohum?: number; dunyaEpochMs?: number };
}

/** Test oyuncusu: kimlik ve kod dışarıdan (ayrı eşleme dosyası); açılış önerisi (varsa) resmî (ii) ve ayak izi içindir. */
export interface CikarmaOyuncusu {
  id: OyuncuId;
  /** K1…K5 (kişisel veri yok). */
  kod: string;
  /** Cihaz/profil etiketi (serbest metin; kişisel veri değil). */
  profil?: string;
  /** Test dünyasında bu oyuncuya önerilen açılış (resmî (ii) ve (i) ayak izi). Yoksa ilk yapının türünden çıkarılır. */
  acilis?: GecAcilis;
}

export interface CikarmaSecenek {
  veri: CekirdekVeriPaketi;
  gunluk: readonly CikarmaGunlukKaydi[];
  goruntu?: CikarmaGoruntusu | null;
  /** "bastan" (vars., günlük seq 1'den başlıyorsa) ya da "goruntu" (anlık görüntüden; öncesi bilinmez). */
  baslangic?: "bastan" | "goruntu";
  tohum?: number;
  oyuncular: readonly CikarmaOyuncusu[];
  /** Çıktıya yazılan üst veri (sürüm izi): commit ve dünya adı. */
  commit?: string | null;
  dunya?: string | null;
  /** Dünyanın gerçek saat epoch'u (epoch ms; TRT gece yarısı); yoksa anlık görüntüden, o da yoksa TRT alanları null. */
  dunyaEpochMs?: number;
  /** Gözlemin bitişi (sim ms); vars. son günlük kaydı ve anlık görüntü zamanının en büyüğü. */
  bitisTMs?: Ms;
  /** Dükkân yapısı tür adları (vars. `DUKKAN_TURLERI`). */
  dukkanTurleri?: readonly string[];
  /**
   * Alfa-0 ekonomi izleme (A2 alfa0-ekonomi-izleme; E1–E10): açıksa günde bir dünya düzeyi örnek alınır ve çıktıya `ekonomi` bölümü eklenir (bot ve insan ayrı gruplar,
   * oyuncu kimliği yok). Vars. KAPALI: kapalıyken çıktı eskisiyle aynıdır (ek alan yok).
   */
  ekonomi?: boolean;
}

/** Sim zamanı + gerçek saat. */
export interface ZamanDamgasi {
  tMs: Ms;
  trt: string | null;
}

export interface YapiDenemesi {
  tMs: Ms;
  trt: string | null;
  tur: string;
  ilce: string | null;
  kabul: boolean;
  /** Reddedildiyse hata iletisi (sayılar "#"). */
  hata: string | null;
}

export interface KatilimciCikti {
  kod: string;
  profil: string | null;
  katilma: (ZamanDamgasi & { ilce: string | null; kabul: boolean }) | null;
  /** İlk KABUL EDİLEN yapı komutu (herhangi tür). */
  ilkYapi: (ZamanDamgasi & { kabul: true; tur: string; ilce: string | null; gecikmeMs: number; acilisTuru: boolean | null }) | null;
  /** Yapı komutu denemeleri (kabul ve ret), zaman sırasıyla (ilk 20). */
  yapiDenemeleri: YapiDenemesi[];
  insaTamam: (ZamanDamgasi & { durum: "tamam" | "iptal" | "suruyor" }) | null;
  ilkSatis: { emirTMs: Ms; emirTrt: string | null; gerceklesenTMs: Ms | null; gerceklesenTrt: string | null; cozunurlukMs: number | null } | null;
  ikinciYapi: (ZamanDamgasi & { tur: string; katman: YapiKatmani }) | null;
  yonKomutlari: Array<ZamanDamgasi & { tur: string; ilce: string | null }>;
  /** Dükkân KURULUŞU (`DukkanDurumu.kurulus`; A0-11 "kurulma" anlamı, A2 O2-2). Alan çekirdekte yoksa (P5 öncesi) null. */
  dukkan: ZamanDamgasi | null;
  /** Dükkân yapı KOMUTU zamanı (kabul edilen ilk dükkân türü yapı komutu; dükkân türü çekirdekte tanımlı olunca). */
  dukkanKomutu: ZamanDamgasi | null;
  /** İ2 (oturum olayı kaydı) olmadan çıkarılamaz. */
  oturumlar: null;
  y7: { net7gunMili: number; emsalMedyanMili: number | null; emsalDuzeyi: Y7EmsalDuzeyi | null; emsalSayisi: number; uretenEmsalSayisi: number; pencereBasTMs: Ms; pencereBitTMs: Ms } | { olculemez: string };
  h6: {
    /** Bağlayıcı ölçü: (ii) geniş (baş lider kararı); resmî ikincil. */
    baglayici: "genis";
    tabanYeter: boolean | null;
    tabanYeterYurtDahil: boolean | null;
    ayrilmisBosKatilim: number | null;
    ayakIzi: number | null;
    ayakIziYurtHucre: number | null;
    /** (ii) resmî: açılış türünden yapı, 14 günde. */
    ii: boolean | null;
    /** (ii) geniş: herhangi üretim yapısı, 14 günde (ambar ve ticaret ofisi sayılmaz). */
    iiGenis: boolean;
    /** İlk üretim yapısı komutu (geniş tanımın tanığı). */
    iiGenisT: ZamanDamgasi | null;
    /** (ii) bağımsız (ipucu ≤ L2): ipucu verisi dışarıdan; burada çıkarılamaz. */
    iiBagimsiz: null;
    /** Gözlem 14 günü tamamlamadıysa (ii) "belirsiz" okunur. */
    pencereTamam: boolean;
  };
  komutOzeti: { kabul: number; red: number };
}

export interface InsanTestiCikti {
  surum: 1;
  test: {
    commit: string | null;
    kuralSurumu: string;
    dunya: string | null;
    dunyaEpochMs: number | null;
    baslangic: "bastan" | "goruntu";
    kayitSayisi: number;
    sonSeq: number;
    bitisTMs: Ms;
    /** Anlık görüntü varsa: oynatma bu seq'te görüntünün durum özetiyle karşılaştırıldı (aynı simZamani'nda). */
    goruntuDogrulama: { seq: number; simZamani: Ms; durumOzetiAyni: boolean } | null;
  };
  katilimcilar: KatilimciCikti[];
  /** `ekonomi` seçeneği açıksa: A2 E1–E10 (bot ve insan ayrı gruplar). */
  ekonomi?: EkonomiCiktisi;
  notlar: string[];
}

interface Durum {
  oyuncu: CikarmaOyuncusu;
  katilmaMs: Ms | null;
  katilmaIlce: string | null;
  katilmaKabul: boolean;
  /** Katılım öncesi durum (ilçe belliyse): ayrılmış boş ve tür başına ayak izi. */
  ayrilmisBos: number | null;
  ayakIzleri: Partial<Record<GecAcilis, number>>;
  yurtHucre: number | null;
  denemeler: YapiDenemesi[];
  ilkYapi: { t: Ms; tur: string; ilce: string | null } | null;
  ikinciYapi: { t: Ms; tur: string } | null;
  ilkUretim: { t: Ms; tur: string } | null;
  uretimT14: boolean;
  yon: Array<{ t: Ms; tur: string; ilce: string | null }>;
  dukkanT: Ms | null;
  dukkanKurulus: Ms | null;
  insaat: { id: number; bitis: Ms; durum: "tamam" | "iptal" | "suruyor"; t: Ms | null } | null;
  emirT: Ms | null;
  satisT: Ms | null;
  kabul: number;
  red: number;
}

function trtDamga(t: Ms, epoch: number | null): string | null {
  if (epoch === null) return null;
  const d = new Date(epoch + t + 3 * 3_600_000);
  const ms = d.getUTCMilliseconds();
  return `${d.toISOString().slice(0, 19)}${ms === 0 ? "" : `.${String(ms).padStart(3, "0")}`}+03:00`;
}

const normalHata = (h: string): string => h.replace(/-?\d+/g, "#");

/** Günlüğü yeniden oynatır ve test oyuncuları için olguları çıkarır. Saf (girdileri değiştirmez), deterministik. */
export function cikar(s: CikarmaSecenek): InsanTestiCikti {
  const notlar: string[] = [];
  const kuralSurumu = kuralSurumuHesapla(s.veri);
  const g = s.goruntu ?? null;
  const gunluk = [...s.gunluk].sort((a, b) => a.seq - b.seq);
  for (let i = 1; i < gunluk.length; i++) {
    if ((gunluk[i] as CikarmaGunlukKaydi).seq !== (gunluk[i - 1] as CikarmaGunlukKaydi).seq + 1) throw new Error(`gunluk seq boslugu: ${(gunluk[i - 1] as CikarmaGunlukKaydi).seq} -> ${(gunluk[i] as CikarmaGunlukKaydi).seq}`);
  }
  const bastanMumkun = gunluk.length === 0 || (gunluk[0] as CikarmaGunlukKaydi).seq === 1;
  const baslangic: "bastan" | "goruntu" = s.baslangic ?? (bastanMumkun || g === null ? "bastan" : "goruntu");
  if (baslangic === "bastan" && !bastanMumkun) throw new Error(`gunluk seq ${(gunluk[0] as CikarmaGunlukKaydi).seq}'ten basliyor: bastan oynatilamaz (anlik goruntu varsa --baslangic goruntu)`);
  if (g !== null && g.kuralSurumu !== kuralSurumu) throw new Error(`kural surumu uyusmuyor: goruntu ${g.kuralSurumu}, veri ${kuralSurumu} (ayni icerik ve parametrelerle oynatilmali)`);
  let sim: Simulasyon;
  let kayitlar: CikarmaGunlukKaydi[];
  if (baslangic === "goruntu") {
    if (g === null) throw new Error("--baslangic goruntu icin anlik goruntu gerekli");
    sim = Simulasyon.anlikGoruntudenYukle(s.veri, g.metin);
    if (sim.durumOzeti() !== g.durumOzeti) throw new Error(`goruntu ust verisindeki ozet uyusmuyor: ${g.durumOzeti} != ${sim.durumOzeti()}`);
    kayitlar = gunluk.filter((k) => k.seq > g.seq);
    notlar.push(`Oynatma anlik goruntuden (seq ${g.seq}) basladi: goruntu oncesi olaylar (katilim, ilk yapi vb.) bilinmez.`);
  } else {
    const tohum = s.tohum ?? g?.ek?.tohum;
    if (tohum === undefined) notlar.push("Tohum verilmedi ve goruntu yok: dunya tohum 1 ile kuruldu (yalnizca ilk acilis tohumu 1 ise dogru).");
    sim = Simulasyon.olustur(s.veri, tohum ?? 1);
    kayitlar = [...gunluk];
  }
  const epoch = s.dunyaEpochMs ?? g?.ek?.dunyaEpochMs ?? null;
  const trt = (t: Ms): string | null => trtDamga(t, epoch);
  const damga = (t: Ms): ZamanDamgasi => ({ tMs: t, trt: trt(t) });
  const dukkanTurleri = new Set(s.dukkanTurleri ?? DUKKAN_TURLERI);
  const ekYapiDisi = new Set(URETIM_DISI_YAPILAR);

  const kodlar = new Map<OyuncuId, Durum>();
  for (const o of s.oyuncular) {
    if (kodlar.has(o.id)) throw new Error(`oyuncu kimligi tekrar: ${o.kod}`);
    kodlar.set(o.id, { oyuncu: o, katilmaMs: null, katilmaIlce: null, katilmaKabul: false, ayrilmisBos: null, ayakIzleri: {}, yurtHucre: null, denemeler: [], ilkYapi: null, ikinciYapi: null, ilkUretim: null, uretimT14: false, yon: [], dukkanT: null, dukkanKurulus: null, insaat: null, emirT: null, satisT: null, kabul: 0, red: 0 });
  }
  const sistemOyuncusu = SISTEM_OYUNCUSU;
  /** Tüm oyuncuların katılım zamanı (emsal için). */
  const katilmaT = new Map<OyuncuId, Ms>();
  /** Tüm oyuncuların sermaye harcaması kayıtları (Y7 geliri için; hazine farkı). */
  const sermaye = new Map<OyuncuId, Array<{ t: Ms; tutar: number }>>();
  /** Zamanlanmış hazine anları (mutlak sim ms) ve alınan hazine kopyaları. */
  const bekleyenAnlar: Ms[] = [];
  const hazineAn = new Map<Ms, Map<OyuncuId, number>>();
  const zamanla = (t: Ms): void => {
    if (!hazineAn.has(t) && !bekleyenAnlar.includes(t)) {
      bekleyenAnlar.push(t);
      bekleyenAnlar.sort((a, b) => a - b);
    }
  };
  const hazineAl = (t: Ms): void => {
    const m = new Map<OyuncuId, number>();
    for (const o of sim.dunya.oyuncular) m.set(o.id, anlikHazine(sim.dunya, o.id));
    hazineAn.set(t, m);
  };

  const ek: EkonomiToplayici | null = s.ekonomi === true ? new EkonomiToplayici(() => sim, new Set(s.oyuncular.map((o) => o.id)), trt, sermaye) : null;
  if (ek !== null && sim.dunya.zaman % GUN === 0) ek.ornekle(sim.dunya.zaman);

  const dakikaAktif = (t: Ms): boolean => {
    for (const d of kodlar.values()) if (d.emirT !== null && d.satisT === null && t >= d.emirT && t < d.emirT + SATIS_DAKIKA_PENCERESI_MS) return true;
    return false;
  };
  const gozlemle = (t: Ms): void => {
    const dunya = sim.dunya;
    for (const [id, d] of kodlar) {
      if (d.dukkanKurulus === null) d.dukkanKurulus = dukkanKurulusuOku(dunya, id);
      if (d.insaat !== null && d.insaat.durum === "suruyor") {
        const i = dunya.insaatlar.find((x) => x.id === (d.insaat as { id: number }).id);
        if (i !== undefined) d.insaat.bitis = i.bitis;
        else {
          d.insaat.durum = "tamam";
          d.insaat.t = d.insaat.bitis;
        }
      }
      if (d.emirT !== null && d.satisT === null) {
        for (const i of dunya.mulk?.isletmeler ?? []) {
          if (i.oyuncu !== id) continue;
          const b = dunya.bolgeler[i.bolgeIndeksi];
          if (b !== undefined && b.ticaretEmirleri.some((e) => e.yon === "ihracat" && e.gerceklesenSaat > 0)) d.satisT = t;
        }
      }
    }
  };
  /** Dünyayı `hedef`'e ilerletir: dakikalık/saatlik örnekleme ve zamanlanmış hazine anlarında durur (hedefteki hazine anı çağırana kalır). */
  const ilerle = (hedef: Ms): void => {
    for (;;) {
      const t = sim.dunya.zaman;
      if (t >= hedef) break;
      let adim = hedef;
      const izgara = dakikaAktif(t) ? DAKIKA : SAAT;
      adim = Math.min(adim, (Math.floor(t / izgara) + 1) * izgara);
      if (ek !== null) adim = Math.min(adim, (Math.floor(t / GUN) + 1) * GUN);
      for (const z of bekleyenAnlar) if (z > t && z < adim) adim = z;
      sim.calistirKadar(adim);
      gozlemle(adim);
      if (ek !== null) {
        ek.adim(adim);
        if (adim % GUN === 0) ek.ornekle(adim);
      }
      // Hedefe varmadan durulan zamanlanmış anlar burada alınır; hedefe eşit olan, o andaki komutlar işlendikten sonra alınır.
      if (adim < hedef) bekleyenAnlariAl(adim);
    }
  };
  const bekleyenAnlariAl = (t: Ms): void => {
    while (bekleyenAnlar.length > 0 && (bekleyenAnlar[0] as Ms) <= t) {
      const z = bekleyenAnlar.shift() as Ms;
      if (z === sim.dunya.zaman) hazineAl(z);
    }
  };

  let goruntuDogrulama: InsanTestiCikti["test"]["goruntuDogrulama"] = null;
  let sonT = sim.dunya.zaman;
  for (const k of kayitlar) {
    // k.t'den önce kalan zamanlanmış anlar (hazine) ve örneklemeler
    while (bekleyenAnlar.length > 0 && (bekleyenAnlar[0] as Ms) < k.t) {
      const z = bekleyenAnlar[0] as Ms;
      ilerle(z);
      bekleyenAnlariAl(z);
    }
    ilerle(k.t);
    const dunya = sim.dunya;
    const komut = k.komut;
    const d = kodlar.get(komut.tur === "oyuncu_katil" ? komut.oyuncu : k.oyuncu);
    // Katılım öncesi durum (yalnız test oyuncusu ve ilçe belliyse): (i) taban hücre sayımı
    if (komut.tur === "oyuncu_katil" && d !== undefined && komut.ilce !== undefined) {
      d.ayrilmisBos = ilceAyrilmisBos(sim, komut.ilce);
      for (const a of GEC_ACILISLARI) d.ayakIzleri[a] = acilisAyakIzi(sim, a);
      d.yurtHucre = sim.ic.mulk?.p.yeniOyuncu.yurtHucre ?? null;
    }
    const sermayeKomutu = SERMAYE_KOMUTLARI.has(komut.tur) && k.oyuncu !== sistemOyuncusu;
    const hazineOnce = sermayeKomutu ? anlikHazine(dunya, k.oyuncu) : 0;
    const r: KomutSonucu = sim.uygula({ t: k.t, oyuncu: k.oyuncu, komut });
    sonT = Math.max(sonT, k.t);
    if (komut.tur === "oyuncu_katil" && r.tamam) {
      katilmaT.set(komut.oyuncu, k.t);
      if (d !== undefined) {
        d.katilmaMs = k.t;
        d.katilmaKabul = true;
        d.katilmaIlce = komut.ilce ?? mulkOyuncuBul(sim.dunya, komut.oyuncu)?.katilimIlcesi ?? null;
        // 14 günlük pencere ve Y7 pencere uçları
        zamanla(k.t + II_PENCERE_MS - Y7_PENCERE_MS);
        zamanla(k.t + II_PENCERE_MS);
      }
    } else if (komut.tur === "oyuncu_katil" && d !== undefined) {
      d.red++;
    }
    if (sermayeKomutu && r.tamam) {
      const l = sermaye.get(k.oyuncu) ?? [];
      l.push({ t: k.t, tutar: hazineOnce - anlikHazine(sim.dunya, k.oyuncu) });
      sermaye.set(k.oyuncu, l);
    }
    const o = kodlar.get(k.oyuncu);
    if (o !== undefined && komut.tur !== "oyuncu_katil") {
      if (r.tamam) o.kabul++;
      else o.red++;
      if (YAPI_KOMUTLARI.has(komut.tur)) {
        const tur = (komut as { tesisTuru?: string }).tesisTuru ?? "";
        const ilce = (komut as { ilce?: string }).ilce ?? null;
        if (o.denemeler.length < 20) o.denemeler.push({ ...damga(k.t), tur, ilce, kabul: r.tamam, hata: r.tamam ? null : normalHata(r.hata) });
        if (r.tamam) {
          if (o.ilkYapi === null) {
            o.ilkYapi = { t: k.t, tur, ilce };
            // Bu komutla başlayan inşaat: en son kimlik, bu oyuncuya ait, başlangıç = k.t
            let ins: (typeof sim.dunya.insaatlar)[number] | undefined;
            for (const i of sim.dunya.insaatlar) if (i.sahip === k.oyuncu && i.baslangic === k.t && (ins === undefined || i.id > ins.id)) ins = i;
            if (ins !== undefined) o.insaat = { id: ins.id, bitis: ins.bitis, durum: "suruyor", t: null };
          } else if (o.ikinciYapi === null) {
            o.ikinciYapi = { t: k.t, tur };
          }
          if (!ekYapiDisi.has(tur) && o.ilkUretim === null) {
            o.ilkUretim = { t: k.t, tur };
          }
          if (dukkanTurleri.has(tur) && o.dukkanT === null) o.dukkanT = k.t;
        }
      } else if (YON_KOMUTLARI.has(komut.tur) && r.tamam) {
        o.yon.push({ t: k.t, tur: komut.tur, ilce: (komut as { ilce?: string }).ilce ?? null });
        if (komut.tur === "insaat_iptal" && o.insaat !== null && o.insaat.durum === "suruyor" && (komut as { insaat?: number }).insaat === o.insaat.id) {
          o.insaat.durum = "iptal";
          o.insaat.t = k.t;
        }
      } else if (komut.tur === "ticaret_emri" && r.tamam && o.emirT === null && (komut as { yon?: string }).yon === "ihracat" && ((komut as { oranSaat?: number }).oranSaat ?? 0) > 0) {
        o.emirT = k.t;
      }
    }
    gozlemle(k.t);
    if (g !== null && baslangic === "bastan" && k.seq === g.seq) {
      // Oynatma anlık görüntüyle aynı noktada: sunucunun görüntüsü "calistirKadar(simZamani)" noktasında alınır (docs/06 §14).
      const once = sim.dunya.zaman;
      if (once <= g.simZamani) {
        ilerle(g.simZamani);
        goruntuDogrulama = { seq: g.seq, simZamani: g.simZamani, durumOzetiAyni: sim.durumOzeti() === g.durumOzeti };
      }
    }
  }
  // Bitiş: son kayıt, görüntü zamanı ve seçenek
  const bitis = Math.max(sonT, g?.simZamani ?? 0, s.bitisTMs ?? 0, sim.dunya.zaman);
  // Kalan zamanlanmış anlar (bitişe kadar)
  while (bekleyenAnlar.length > 0 && (bekleyenAnlar[0] as Ms) <= bitis) {
    const z = bekleyenAnlar[0] as Ms;
    ilerle(z);
    bekleyenAnlariAl(z);
    if (bekleyenAnlar[0] === z) bekleyenAnlar.shift();
  }
  ilerle(bitis);
  gozlemle(bitis);
  if (g !== null && goruntuDogrulama === null && baslangic === "bastan") notlar.push(`Anlik goruntu (seq ${g.seq}) gunluk icinde bulunamadi ya da zamani gecmisti: durum ozeti dogrulanamadi.`);
  if (goruntuDogrulama !== null && !(goruntuDogrulama as { durumOzetiAyni: boolean }).durumOzetiAyni) notlar.push("UYARI: oynatma anlik goruntunun durum ozetiyle ESLESMEDI (veri/icerik ya da kural surumu farki, ya da gunluk disi bir mudahale).");

  // --- Çıktı ---------------------------------------------------------------------------------------------------------------
  const ilIlce = new Map((sim.dunya.mulk?.ilceler ?? []).map((c) => [c.id, c.il] as const));
  const hucreIlce = (id: OyuncuId): Set<string> => {
    const l = new Set<string>();
    for (const h of sim.dunya.mulk?.hucreler ?? []) if (h.sahip === id) l.add(h.ilce);
    return l;
  };
  const gelirAralik = (id: OyuncuId, bas: Ms, bit: Ms): number | null => {
    const h0 = hazineAn.get(bas)?.get(id);
    const h1 = hazineAn.get(bit)?.get(id);
    if (h0 === undefined || h1 === undefined) return null;
    let sm = 0;
    for (const x of sermaye.get(id) ?? []) if (x.t > bas && x.t <= bit) sm += x.tutar;
    return h1 - h0 + sm;
  };

  const katilimcilar: KatilimciCikti[] = [];
  for (const o of s.oyuncular) {
    const d = kodlar.get(o.id) as Durum;
    const km = d.katilmaMs;
    const acilisTuruIcin = (tur: string, acilis: GecAcilis | undefined): boolean | null => (acilis === undefined ? null : ACILIS_ESLEMESI[acilis].ilkYapiTurleri.includes(tur));
    // Açılış: verilen öneri; yoksa ilk üretim yapısının türünden (hangi açılışın ilk yapı türlerinde geçiyorsa; belirsizse null)
    let acilis: GecAcilis | undefined = o.acilis;
    if (acilis === undefined && d.ilkUretim !== null) {
      const adaylar = GEC_ACILISLARI.filter((a) => ACILIS_ESLEMESI[a].ilkYapiTurleri.includes((d.ilkUretim as { tur: string }).tur));
      if (adaylar.length === 1) acilis = adaylar[0];
    }
    // H6 (ii): 14 günlük pencere
    const pencereTamam = km !== null && km + II_PENCERE_MS <= bitis;
    const pencerede = (t: Ms): boolean => km !== null && t <= km + II_PENCERE_MS;
    const ilkUretimPencerede = d.ilkUretim !== null && pencerede(d.ilkUretim.t);
    let resmi: boolean | null = null;
    if (km !== null && acilis !== undefined) {
      // Resmî: pencerede, açılış türünden herhangi bir KABUL EDİLEN yapı (ilk yapı olmak zorunda değil)
      resmi = false;
      for (const dn of d.denemeler) {
        if (dn.kabul && pencerede(dn.tMs) && ACILIS_ESLEMESI[acilis].ilkYapiTurleri.includes(dn.tur)) resmi = true;
      }
    }
    const ayakIzi = acilis === undefined ? null : (d.ayakIzleri[acilis] ?? null);
    const tabanYeter = d.ayrilmisBos === null || ayakIzi === null ? null : d.ayrilmisBos >= ayakIzi;
    const tabanYurt = d.ayrilmisBos === null || ayakIzi === null || d.yurtHucre === null ? null : d.ayrilmisBos + d.yurtHucre >= ayakIzi;

    // Y7
    let y7: KatilimciCikti["y7"];
    if (km === null) y7 = { olculemez: "katilim kabul edilmedi ya da gunlukte yok" };
    else if (km + II_PENCERE_MS > bitis) y7 = { olculemez: `pencere tamamlanmadi: katilim + 14 gun (${km + II_PENCERE_MS}) gozlem bitisinden (${bitis}) sonra` };
    else {
      const bas = km + II_PENCERE_MS - Y7_PENCERE_MS;
      const bit = km + II_PENCERE_MS;
      const net = gelirAralik(o.id, bas, bit);
      if (net === null) y7 = { olculemez: "pencere ucu hazine olcumu alinamadi" };
      else {
        const ilce = d.katilmaIlce;
        const il = ilce === null ? null : (ilIlce.get(ilce) ?? null);
        const oncekiler = [...katilmaT.entries()].filter(([id, t]) => id !== o.id && t < km);
        const ilceEmsal = oncekiler.filter(([id]) => ilce !== null && hucreIlce(id).has(ilce)).map(([id]) => id);
        const ilEmsal = oncekiler.filter(([id]) => il !== null && [...hucreIlce(id)].some((c) => ilIlce.get(c) === il)).map(([id]) => id);
        const gel = (ids: OyuncuId[]): number[] => ids.map((id) => gelirAralik(id, bas, bit) ?? 0);
        const ilceG = gel(ilceEmsal);
        const ilG = gel(ilEmsal);
        const duzey = y7EmsalDuzeyi({ ilceGelirleri: ilceG, ilGelirleri: ilG });
        const kullanilan = duzey === "ilce" ? ilceG : duzey === "il" ? ilG : [];
        const uretenler = uretenEmsal(kullanilan);
        y7 = { net7gunMili: net, emsalMedyanMili: tamsayiMedyan(uretenler), emsalDuzeyi: duzey, emsalSayisi: kullanilan.length, uretenEmsalSayisi: uretenler.length, pencereBasTMs: bas, pencereBitTMs: bit };
      }
    }

    katilimcilar.push({
      kod: o.kod,
      profil: o.profil ?? null,
      katilma: km === null ? null : { ...damga(km), ilce: d.katilmaIlce, kabul: d.katilmaKabul },
      ilkYapi:
        d.ilkYapi === null || km === null
          ? null
          : { ...damga(d.ilkYapi.t), kabul: true, tur: d.ilkYapi.tur, ilce: d.ilkYapi.ilce, gecikmeMs: d.ilkYapi.t - km, acilisTuru: acilisTuruIcin(d.ilkYapi.tur, acilis) },
      yapiDenemeleri: d.denemeler,
      insaTamam: d.insaat === null || d.insaat.t === null ? (d.insaat === null ? null : { tMs: d.insaat.bitis, trt: trt(d.insaat.bitis), durum: "suruyor" }) : { ...damga(d.insaat.t), durum: d.insaat.durum },
      ilkSatis:
        d.emirT === null
          ? null
          : {
              emirTMs: d.emirT,
              emirTrt: trt(d.emirT),
              gerceklesenTMs: d.satisT,
              gerceklesenTrt: d.satisT === null ? null : trt(d.satisT),
              cozunurlukMs: d.satisT === null ? null : d.satisT - d.emirT <= SATIS_DAKIKA_PENCERESI_MS ? DAKIKA : SAAT,
            },
      ikinciYapi: d.ikinciYapi === null ? null : { ...damga(d.ikinciYapi.t), tur: d.ikinciYapi.tur, katman: yapiKatmani(d.ikinciYapi.tur) },
      yonKomutlari: d.yon.map((y) => ({ ...damga(y.t), tur: y.tur, ilce: y.ilce })),
      dukkan: d.dukkanKurulus === null ? null : damga(d.dukkanKurulus),
      dukkanKomutu: d.dukkanT === null ? null : damga(d.dukkanT),
      oturumlar: null,
      y7,
      h6: {
        baglayici: "genis",
        tabanYeter,
        tabanYeterYurtDahil: tabanYurt,
        ayrilmisBosKatilim: d.ayrilmisBos,
        ayakIzi,
        ayakIziYurtHucre: d.yurtHucre,
        ii: resmi,
        iiGenis: ilkUretimPencerede,
        iiGenisT: d.ilkUretim === null ? null : damga(d.ilkUretim.t),
        iiBagimsiz: null,
        pencereTamam,
      },
      komutOzeti: { kabul: d.kabul, red: d.red },
    });
  }
  notlar.push("Oturum olaylari (i2) kaydi olmadigindan 'oturumlar' ve D1/D7 cikarilamaz; (ii) bagimsiz ipucu verisi disaridan gelir.");
  notlar.push("Gercek saat: trt = dunyaEpochMs + t, Turkiye saati (+03:00); epoch verilmediyse null.");
  return {
    surum: 1,
    test: { commit: s.commit ?? null, kuralSurumu, dunya: s.dunya ?? null, dunyaEpochMs: epoch, baslangic, kayitSayisi: kayitlar.length, sonSeq: kayitlar.at(-1)?.seq ?? g?.seq ?? 0, bitisTMs: bitis, goruntuDogrulama },
    katilimcilar,
    ...(ek === null ? {} : { ekonomi: ek.sonuc() }),
    notlar,
  };
}
