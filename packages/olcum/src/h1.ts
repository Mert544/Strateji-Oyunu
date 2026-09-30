/**
 * H1 — Bölgeler gerçekten farklı (v0.2 düzeneği: pasif referans, eklenen değer, ortak ham tabanı, bölge+liman odağı,
 * 4-7. gün akış skoru, arka planda militarist). Ayrıntı: docs/07-tasarim-onerileri.md Ö1.
 *
 * İŞLETİMSEL TANIM (tam metin `H1_ISLETIMSEL_TANIM`; rapora yazılır):
 *  1. Dünya: her devletin bölgeleri bir arka plan botuna verilir (sanayici, tuccar, lojistikci, militarist; devlet sırası
 *     tohumla döner). ODAK oyuncu: örneklenen bölge + (liman değilse) haritada en kısa taşıma süresiyle ulaşılan en yakın
 *     liman bölgesi (`odak: "bolge_liman"`, vars.) veya yalnız bölge (`odak: "bolge"`). Bu bölgeler devletlerinin arka plan
 *     botundan çıkarılır. Arka plan her koşuda aynı kurulum ve aynı tohumla başlar (ortak rastgele sayılar).
 *  2. Koşu: 7 gün; odak oyuncu t=0'da ve 24 saatte bir önayarını uygular. Her bölge için ayrıca PASİF referans koşulur
 *     (odak oyuncu hiçbir şey yapmaz).
 *  3. Skor (net değer akışı): pencere içi Δhazine + Δstok (taban fiyat) + yatırım (başlatılan tesis inşaatı ve kenar
 *     geliştirme bedeli, maliyetle, amortismansız). BİRİNCİL pencere 4-7. gün (t = 3. günün sonu .. 7. günün sonu; başlangıç
 *     stoku dönüşümü ve ilk tavan dolumu dışlanır), İKİNCİL pencere 7 günlük toplam (t = 0 .. 7. gün).
 *  4. Eklenen değer = önayar skoru − pasif skoru (aynı bölge, aynı tohum, ortak rastgele sayılar).
 *  5. Anlamlı fark eşiği (bölge başına) θ = max(10 bin para, %3 × |pasif skoru|). Eklenen değeri θ'dan küçük önayar "pasife
 *     eşit"tir ve ilk üçe girmez. İki önayarın eklenen değeri farkı θ'dan küçükse eşit sayılır (eşitlik grubu).
 *  6. Sıra: yalnız anlamlı önayarlar; eşitlik grupları en iyiden aşağı dizilir (grup, en iyi üyesine göre θ içindekileri
 *     toplar), grup üyeleri sıra konumlarını paylaşır (ortalama sıra); ortalama sıra <= 3 ise "anlamlı ilk üç".
 *     Eşitlik nedeniyle ilk üçe giren (kesin sıralamada girmeyecek) önayar-bölge çifti sayısı raporlanır.
 *  7. Verdict (PDF eşiği, bağlayıcı): en yüksek anlamlı ilk-üç bölge oranı > %70 -> KALDI.
 *  8. Bilgi göstergeleri (verdict'e girmez): tek sabit önayarın ortalama regret'i >= %10; normalize entropi >= 0.75;
 *     bölge türü başına en az 4 farklı en iyi önayar.
 * v0.1 ile doğrudan karşılaştırılamaz (skor, önayar kümesi, dünya ve odak kurulumu değişti).
 */
import { GUN } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { H1_ONAYARLARI, PASIF_ONAYAR, botOlustur, kos } from "@bolge/botlar";
import type { ArketipAdi, KosuOyuncusu, Onayar } from "@bolge/botlar";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { BolgeTanimi, HaritaDosyasi, VeriPaketi } from "@bolge/veri";
import { hazinePara, israfDegeri, kenarGelistirmeBedeli, stokDegeri, tesisInsaBedeli } from "./metrik";
import { birlesikOzet, devletBolgeleri, devletSirasi, karsilastir, say, shannon } from "./ortak";
import { genelVerdict } from "./tipler";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H1_ESIK = 0.7;
/** Anlamlı fark: pasif referansın mutlak net değerinin oranı (docs/07 Ö1a: %3). */
export const H1_ANLAMLI_ORAN = 0.03;
/** Anlamlı fark tabanı, para (docs/07 Ö1a: 10 bin). */
export const H1_ANLAMLI_TABAN = 10_000;
/** Birincil skor penceresi: bu günün sonundan (t = 3 gün) koşu sonuna kadar (4-7. gün). */
export const H1_PENCERE_BAS_GUN = 3;
/** Bilgi göstergesi eşikleri (docs/07 §3.2; verdict'e girmez). */
export const H1_BILGI_REGRET = 0.1;
export const H1_BILGI_ENTROPI = 0.75;
export const H1_BILGI_TUR_FARKLI = 4;
/** Sıralamaya girmeyen, yalnızca referans olarak raporlanan önayar. */
export const H1_REFERANS_ONAYAR = "dengeli";
/** Arka plan botları (devlet sırasıyla; devlet sırası tohumla döner). Dördüncü bot militaristtir (H3 dünyasıyla aynı). */
export const H1_ARKA_PLAN_BOTLARI: readonly ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];
/** Varsayılan bölge örneği (devlet başına eşit, 4 devlet x 4); `tam` ile hepsi, `bolgeSayisi` ile ayarlanır. */
export const H1_VARSAYILAN_BOLGE = 16;
export const H1_HIZLI_BOLGE = 4;
const ODAK = "odak";

export type H1OdakModu = "bolge" | "bolge_liman";

/** İşletimsel tanımın tam metni (rapora ve JSON'a yazılır). */
export const H1_ISLETIMSEL_TANIM: readonly string[] = [
  "Dünya: her devletin bölgeleri bir arka plan botuna verilir (sanayici, tuccar, lojistikci, militarist; devlet sırası tohumla döner). Arka plan her koşuda aynı kurulum ve aynı tohumla başlar (ortak rastgele sayılar); yalnızca odak oyuncunun önayarı değişir.",
  "Odak oyuncu: örneklenen bölge + (liman değilse) haritada taşıma süresi toplamı en kısa olan en yakın liman bölgesi (kurulum \"bölge+liman\", varsayılan); yalnız bölge kurulumu (`--odak bolge`, limansız tek bölgeli odak) ayrıca seçilebilir. Odak bölge zaten limansa tek bölgedir. Odak bölgeler devletlerinin arka plan botundan çıkarılır.",
  "Koşu: 7 gün; odak oyuncu t=0'da ve 24 saatte bir önayarını uygular. Her bölge için ayrıca PASİF referans (hiçbir şey yapma) koşulur.",
  "Skor = pencere içi Δhazine + Δstok (taban fiyat) + yatırım (başlatılan tesis inşaatı ve kenar geliştirme bedeli; maliyetle, amortismansız). Birincil: 4-7. gün akışı (t = 3. gün sonu .. 7. gün sonu; başlangıç stoku dönüşümü ve ilk tavan dolumu dışlanır). İkincil: 7 günlük toplam.",
  "Eklenen değer = önayar skoru − pasif skoru (aynı bölge, aynı tohum). Önayar kümesi: ortak yerel-ham tabanı (her önayar bölgenin rezerv kaynaklı ham çıkarım tesislerini ortak aday olarak içerir) + tema; ihracatci yalnızca ticaret temasıdır. Hiçbir önayar diğerinin üst kümesi değildir.",
  "Anlamlı fark eşiği (bölge başına) θ = max(10 bin para, %3 × |pasif skoru|). Eklenen değeri θ'dan küçük önayar pasife eşittir ve ilk üçe girmez. İki önayarın eklenen değeri farkı θ'dan küçükse eşit sayılır.",
  "Eşitlik kuralı: anlamlı önayarlar eklenen değere göre azalan dizilir; bir eşitlik grubu en iyi üyesinden θ'dan az geride kalanları toplar; grup üyeleri sıra konumlarını paylaşır (ortalama sıra); ortalama sıra <= 3 ise önayar o bölgede \"anlamlı ilk üç\"tedir. Eşitlik yüzünden ilk üçe giren (eşitlik toleransı olmadan girmeyecek) önayar-bölge çifti sayısı raporlanır.",
  "Verdict (PDF eşiği, bağlayıcı): en yüksek anlamlı ilk-üç bölge oranı > %70 ise KALDI. Bilgi göstergeleri (verdict'e girmez): en iyi tek sabit önayarın ortalama regret'i >= %10; normalize entropi >= 0.75; bölge türü başına en az 4 farklı en iyi önayar.",
];

export type BolgeTuru = "baskent" | "liman" | "ova_tarim" | "petrol" | "maden_dag" | "maden_kiyi_col" | "diger";
export const BOLGE_TURLERI: readonly BolgeTuru[] = ["baskent", "liman", "ova_tarim", "petrol", "maden_dag", "maden_kiyi_col", "diger"];
export const BOLGE_TURU_ACIKLAMA: Record<BolgeTuru, string> = {
  baskent: "nüfus >= 400 bin (kent)",
  liman: "liman etiketli",
  ova_tarim: "baskın rezerv tahıl",
  petrol: "baskın rezerv petrol (kıyı/çöl)",
  maden_dag: "baskın rezerv cevher/kömür/bakır/silis; dağ veya dar geçit",
  maden_kiyi_col: "baskın rezerv cevher/kömür/bakır/silis; kıyı, ova veya etiketsiz",
  diger: "rezervsiz, limansız",
};

/** Bölge türü: kent > liman > baskın rezerv (tahıl, petrol, maden) > diğer. */
export function bolgeTuru(b: BolgeTanimi): BolgeTuru {
  if (b.nufus >= 400_000) return "baskent";
  if (b.etiketler.includes("liman")) return "liman";
  let baskin = "";
  let en = 0;
  for (const [mal, miktar] of Object.entries(b.rezervler)) {
    if (miktar > en) {
      en = miktar;
      baskin = mal;
    }
  }
  if (baskin === "") return "diger";
  if (baskin === "tahil") return "ova_tarim";
  if (baskin === "petrol") return "petrol";
  return b.etiketler.includes("dag") || b.etiketler.includes("dar_gecit") ? "maden_dag" : "maden_kiyi_col";
}

/**
 * Devlet başına eşit sayıda bölge örneği; sonuç harita sırasındadır. Devlet içinde bölgeler önce türe göre (BOLGE_TURLERI
 * sırası, eşitlikte harita sırası) dizilir ve bu dizilimden eşit aralıklı, devlet sırasına göre kaydırılmış
 * konumlardan seçilir; böylece küçük örnekte de türler karışık temsil edilir. hedef >= toplam ise tüm bölgeler. Kota devletlere eşit bölünür (artan kalan ilk devletlere
 * gider) ve devlet boyutuyla sınırlanır.
 */
export function bolgeOrnekle(harita: HaritaDosyasi, hedef: number): string[] {
  const tum = harita.bolgeler.map((b) => b.id);
  if (hedef >= tum.length) return tum;
  const dev = devletBolgeleri(harita);
  const devIds = harita.devletler.map((d) => d.id).filter((d) => (dev[d] ?? []).length > 0);
  const n = devIds.length;
  const kota = devIds.map((_, i) => Math.floor(hedef / n) + (i < hedef % n ? 1 : 0));
  const secilen = new Set<string>();
  devIds.forEach((d, i) => {
    const tur = (id: string): number => BOLGE_TURLERI.indexOf(bolgeTuru(harita.bolgeler.find((b) => b.id === id) as BolgeTanimi));
    const l = [...(dev[d] as string[])].map((id, k) => ({ id, k, t: tur(id) })).sort((x, y) => x.t - y.t || x.k - y.k).map((x) => x.id);
    const q = Math.min(kota[i] as number, l.length);
    // devlet sırasına göre kaydırılmış eşit aralıklı konumlar: devletler farklı türlerden başlar
    for (let j = 0; j < q; j++) secilen.add(l[Math.floor(((j + (i + 0.5) / n) * l.length) / q)] as string);
  });
  return tum.filter((b) => secilen.has(b));
}


/**
 * Bölgeye taşıma süresi toplamı en kısa olan liman bölgesi (Dijkstra; eşitlikte daha az adım, sonra kimlik sırası).
 * Bölgenin kendisi limansa veya hiçbir liman erişilemezse null.
 */
export function enYakinLiman(harita: HaritaDosyasi, bolge: string): string | null {
  const liman = new Set(harita.bolgeler.filter((b) => b.etiketler.includes("liman")).map((b) => b.id));
  if (liman.has(bolge)) return null;
  const komsu = new Map<string, Array<{ id: string; sure: number }>>();
  for (const b of harita.bolgeler) komsu.set(b.id, []);
  for (const k of harita.kenarlar) {
    komsu.get(k.a)?.push({ id: k.b, sure: k.sureSaat });
    komsu.get(k.b)?.push({ id: k.a, sure: k.sureSaat });
  }
  const sure = new Map<string, number>([[bolge, 0]]);
  const adim = new Map<string, number>([[bolge, 0]]);
  const bitti = new Set<string>();
  for (;;) {
    let en: string | null = null;
    for (const id of sure.keys()) {
      if (bitti.has(id)) continue;
      if (en === null) en = id;
      else {
        const d = (sure.get(id) as number) - (sure.get(en) as number) || (adim.get(id) as number) - (adim.get(en) as number) || karsilastir(id, en);
        if (d < 0) en = id;
      }
    }
    if (en === null) return null;
    if (liman.has(en)) return en;
    bitti.add(en);
    for (const k of komsu.get(en) ?? []) {
      if (bitti.has(k.id)) continue;
      const ns = (sure.get(en) as number) + k.sure;
      const na = (adim.get(en) as number) + 1;
      const s0 = sure.get(k.id);
      if (s0 === undefined || ns < s0 || (ns === s0 && na < (adim.get(k.id) as number))) {
        sure.set(k.id, ns);
        adim.set(k.id, na);
      }
    }
  }
}

/** Odak oyuncunun bölgeleri: [bölge] veya [bölge, en yakın liman]. */
export function odakKumesi(harita: HaritaDosyasi, bolge: string, mod: H1OdakModu): string[] {
  if (mod === "bolge") return [bolge];
  const l = enYakinLiman(harita, bolge);
  return l === null ? [bolge] : [bolge, l];
}

export interface H1Secenek extends HipotezSecenek {
  /** Koşu süresi, gün (vars. 7; kısa: 1). */
  gun?: number;
  /** Önayar adları (vars.: 7 sabit önayar; `dengeli` eklenirse referans olarak koşulur; kısa: ilk 3 sabit + dengeli). */
  onayarlar?: string[];
  veri?: VeriPaketi;
}

/** Bir pencerenin skor bileşenleri (para). Skor = hazine + stok + yatirim. */
export interface SkorBilesenleri {
  hazine: number;
  stok: number;
  yatirim: number;
  /** Bilgi: pencere içinde oluşan israf değeri (skora girmez). */
  israf: number;
}

const skorToplam = (b: SkorBilesenleri): number => b.hazine + b.stok + b.yatirim;
const bilesenFarki = (a: SkorBilesenleri, b: SkorBilesenleri): SkorBilesenleri => ({
  hazine: a.hazine - b.hazine,
  stok: a.stok - b.stok,
  yatirim: a.yatirim - b.yatirim,
  israf: a.israf - b.israf,
});

interface KosuBilgisi {
  /** Gün sonu anlık görüntüleri (indeks = gün, 0..gun); pencereler bunlardan hesaplanır. */
  anliklar: Anlik[];
  komut: number;
  basarisiz: number;
  ozet: string;
}

interface Anlik {
  hazine: number;
  stok: number;
  israf: number;
  /** Gözlem anında, önayar uygulanmadan ÖNCEKİ kümülatif yatırım. */
  yatirim: number;
}

function tekKosu(veri: VeriPaketi, tohum: number, kume: readonly string[], onayar: Onayar, gun: number): KosuBilgisi {
  const dev = devletBolgeleri(veri.harita);
  const devIds = devletSirasi(Object.keys(dev), tohum).filter((d) => (dev[d] ?? []).length > 0);
  const odakKumesiSet = new Set(kume);
  const oyuncular: KosuOyuncusu[] = devIds
    .map((d, i) => ({ id: `g${i}`, bolgeler: (dev[d] as string[]).filter((b) => !odakKumesiSet.has(b)), i }))
    .filter((o) => o.bolgeler.length > 0)
    .map((o) => ({
      id: o.id,
      bolgeler: o.bolgeler,
      bot: botOlustur(H1_ARKA_PLAN_BOTLARI[o.i % H1_ARKA_PLAN_BOTLARI.length] as ArketipAdi, o.id, tohum),
      katilmaMs: 0,
    }));
  oyuncular.push({ id: ODAK, bolgeler: [...kume], bot: null, katilmaMs: 0 });

  const anlik = new Map<number, Anlik>();
  let yatirim = 0;
  let komut = 0;
  let basarisiz = 0;
  const r = kos({
    veri,
    tohum,
    oyuncular,
    sureMs: gun * GUN,
    gozlemAraligiMs: GUN,
    // Gözlem, aynı andaki arka plan kararlarından SONRA çağrılır; odak oyuncu önayarını burada uygular (yatırımı
    // başarılı komutlardan tam olarak sayabilmek için komutlar doğrudan uygulanır). Anlık görüntü uygulamadan önce alınır.
    gozlem: (sim: Simulasyon, t: number) => {
      anlik.set(Math.round(t / GUN), { hazine: hazinePara(sim, ODAK), stok: stokDegeri(sim, kume), israf: israfDegeri(sim, kume), yatirim });
      if (t >= gun * GUN) return;
      for (const k of onayar.uygula(sim, ODAK)) {
        const s = sim.uygula({ t, oyuncu: ODAK, komut: k });
        if (!s.tamam) {
          basarisiz++;
          continue;
        }
        komut++;
        if (k.tur === "tesis_insa") yatirim += tesisInsaBedeli(sim, k.tesisTuru);
        else if (k.tur === "kenar_gelistir") yatirim += kenarGelistirmeBedeli(sim);
      }
    },
  });
  const anliklar = Array.from({ length: gun + 1 }, (_, g) => anlik.get(g) as Anlik);
  return { anliklar, komut, basarisiz, ozet: r.sim.durumOzeti() };
}

/** [bas, bit] gün aralığının skor bileşenleri (para): Δhazine, Δstok, pencere içinde başlatılan yatırım, israf farkı. */
function pencereSkoru(anliklar: readonly Anlik[], bas: number, bit: number): SkorBilesenleri {
  const a = anliklar[bas] as Anlik;
  const b = anliklar[bit] as Anlik;
  return { hazine: b.hazine - a.hazine, stok: b.stok - a.stok, yatirim: b.yatirim - a.yatirim, israf: b.israf - a.israf };
}

/** Ortalama sıra (1 = en iyi; eşitlikte paylaşılır). */
export function ortalamaSira(skorlar: readonly number[]): number[] {
  return skorlar.map((s, i) => {
    let ustte = 0;
    let esit = 0;
    skorlar.forEach((x, j) => {
      if (j === i) return;
      if (x > s) ustte++;
      else if (x === s) esit++;
    });
    return 1 + ustte + esit / 2;
  });
}

/** Anlamlı fark eşiği θ (para): max(taban, oran × |pasif skoru|). */
export function anlamliEsik(pasifSkor: number, oran = H1_ANLAMLI_ORAN, taban = H1_ANLAMLI_TABAN): number {
  return Math.max(taban, oran * Math.abs(pasifSkor));
}

export interface AnlamliSiralama {
  /** Eklenen değer >= θ (pasife göre anlamlı artı değer). */
  anlamli: boolean[];
  /** Anlamlı önayarlar arasında ortalama sıra (eşitlik grupları konum paylaşır); anlamsızda Infinity. */
  sira: number[];
  /** Anlamlı ve ortalama sıra <= 3. */
  ilkUc: boolean[];
  /** Eşitlik toleransı olmadan (yalnız tam eşitler paylaşır) anlamlı ilk üç. */
  kesinIlkUc: boolean[];
  /** Bu bölgede "en iyi" payı (en iyi eşitlik grubunda eşit bölüşülür; anlamlı yoksa hepsi 0). */
  enIyi: number[];
}

/**
 * Bir bölgedeki önayarların sıralaması: `ek` = eklenen değerler, `esik` = θ. Yalnız anlamlı (ek >= θ) önayarlar sıralanır;
 * eşitlik grubu, en iyi üyesinden θ'dan az geride kalanları toplar (zincirleme kaymaz); grup üyeleri sıra konumlarını paylaşır.
 */
export function anlamliSiralama(ek: readonly number[], esik: number): AnlamliSiralama {
  const n = ek.length;
  const anlamli = ek.map((x) => x >= esik);
  const sirali = ek.map((x, i) => ({ x, i })).filter((o) => anlamli[o.i]).sort((a, b) => b.x - a.x || a.i - b.i);
  const grupla = (tol: number): { sira: number[]; enIyi: number[] } => {
    const sira = new Array<number>(n).fill(Infinity);
    const enIyi = new Array<number>(n).fill(0);
    let k = 0;
    let konum = 1;
    while (k < sirali.length) {
      const bas = (sirali[k] as { x: number; i: number }).x;
      let son = k;
      while (son + 1 < sirali.length && (bas - (sirali[son + 1] as { x: number }).x < tol || bas === (sirali[son + 1] as { x: number }).x)) son++;
      const g = son - k + 1;
      for (let m = k; m <= son; m++) {
        const i = (sirali[m] as { i: number }).i;
        sira[i] = konum + (g - 1) / 2;
        if (konum === 1) enIyi[i] = 1 / g;
      }
      konum += g;
      k = son + 1;
    }
    return { sira, enIyi };
  };
  const tolerans = grupla(esik);
  const kesin = grupla(0);
  return {
    anlamli,
    sira: tolerans.sira,
    ilkUc: tolerans.sira.map((r) => r <= 3),
    kesinIlkUc: kesin.sira.map((r) => r <= 3),
    enIyi: tolerans.enIyi,
  };
}

export interface RegretOzeti {
  /** En az bir önayar anlamlı artı değer ürettiyse true (aksi halde regret tanımsız; bölge dışlanır). */
  dahil: boolean;
  /** (en iyi − önayar) / en iyi, [0, 1]'e kırpılmış (pasiften kötü = %100 kayıp). */
  regret: number[];
  /** Kırpmasız (pasiften kötü önayarlar > %100 olabilir). */
  regretKirpilmamis: number[];
}

/** Bir bölgede her önayarın en iyiye göre göreli kaybı; en iyi önayar anlamlı (>= θ) değilse bölge dışlanır. */
export function regretHesapla(ek: readonly number[], esik: number): RegretOzeti {
  const en = Math.max(...ek);
  if (!(en >= esik) || en <= 0) return { dahil: false, regret: ek.map(() => 0), regretKirpilmamis: ek.map(() => 0) };
  const ham = ek.map((x) => (en - x) / en);
  return { dahil: true, regret: ham.map((x) => Math.min(1, Math.max(0, x))), regretKirpilmamis: ham };
}

interface TurOzeti {
  n: number;
  /** Sabit önayar sırasıyla "en iyi" payı (sayım; eşitlikler paylaşılır). */
  pay: number[];
  /** Hiçbir önayarın anlamlı artı değer üretmediği bölge sayısı. */
  hicbiri: number;
}

export function h1Kos(secenek: H1Secenek): HipotezSonucu {
  const basla = Date.now();
  const veri = secenek.veri ?? varsayilanVeriyiYukle();
  const tumBolgeler = veri.harita.bolgeler.map((b) => b.id);
  const devletSayisi = new Set(veri.harita.bolgeler.map((b) => b.devlet)).size;
  const hedefSayi = secenek.tam
    ? tumBolgeler.length
    : (secenek.bolgeSayisi ?? (secenek.kisa ? devletSayisi : secenek.hizli ? H1_HIZLI_BOLGE : H1_VARSAYILAN_BOLGE));
  const bolgeler = bolgeOrnekle(veri.harita, hedefSayi);
  const bolgeTurleri = bolgeler.map((id) => bolgeTuru(veri.harita.bolgeler.find((b) => b.id === id) as BolgeTanimi));
  const odakModu: H1OdakModu = secenek.odak ?? "bolge_liman";
  const kumeler = bolgeler.map((b) => odakKumesi(veri.harita, b, odakModu));
  const gun = secenek.gun ?? secenek.h1Gun ?? (secenek.kisa ? 1 : 7);
  const pencereBas = Math.min(secenek.pencereBasGun ?? (gun > H1_PENCERE_BAS_GUN ? H1_PENCERE_BAS_GUN : 0), gun - 1);
  // Duyarlılık: pencere başlangıç günleri (aynı koşulların anlık görüntülerinden, ek koşu gerekmez)
  const duyBaslar = [...new Set([0, 1, 2, 3, 4, 5, pencereBas].filter((b) => b >= 0 && b < gun))].sort((x, y) => x - y);
  const anlamliOran = secenek.anlamliOran ?? H1_ANLAMLI_ORAN;
  const sabitAdlar = H1_ONAYARLARI.filter((o) => o.ad !== H1_REFERANS_ONAYAR).map((o) => o.ad);
  const secilenSabit = secenek.onayarlar
    ? sabitAdlar.filter((a) => secenek.onayarlar?.includes(a))
    : secenek.kisa
      ? sabitAdlar.slice(0, 3)
      : sabitAdlar;
  // Referans (dengeli) koşu süresini ~%12 artırdığı için yalnız istenirse (`onayarlar`'a eklenirse) veya kısa sürümde koşulur.
  const referansVar = secenek.onayarlar ? secenek.onayarlar.includes(H1_REFERANS_ONAYAR) : secenek.kisa === true;
  // Sütun sırası: sabit önayarlar, sonra (varsa) referans.
  const onayarlar = [...secilenSabit, ...(referansVar ? [H1_REFERANS_ONAYAR] : [])].map((a) => H1_ONAYARLARI.find((o) => o.ad === a) as Onayar);
  const sabit = onayarlar.map((_, i) => i).filter((i) => (onayarlar[i] as Onayar).ad !== H1_REFERANS_ONAYAR);
  const referans = onayarlar.findIndex((o) => o.ad === H1_REFERANS_ONAYAR);
  const sabitAd = sabit.map((i) => (onayarlar[i] as Onayar).ad);
  const ns = sabit.length;
  const ilerleme = secenek.ilerleme ?? (() => {});
  const adla = (d: readonly number[]): Record<string, number> => Object.fromEntries(sabitAd.map((a, i) => [a, say(d[i] as number)]));
  const bilesenOzeti = (b: SkorBilesenleri): Record<string, number> => ({
    hazine: say(b.hazine, 1),
    stok: say(b.stok, 1),
    yatirim: say(b.yatirim, 1),
    skor: say(skorToplam(b), 1),
    israf: say(b.israf, 1),
  });

  const tohumBasina: TohumSonucu[] = [];
  let ilkBolgeTablosu: Array<Record<string, unknown>> = [];
  // Tohum başına toplanan vektörler (sabit önayar sırasıyla)
  const tDuy: Array<Record<number, number[]>> = [];
  const tIlkUc: number[][] = [];
  const tIlkUcToplam: number[][] = [];
  const tEnIyi: number[][] = [];
  const tRegret: number[][] = [];
  const tRegretKirp: number[][] = [];
  const tEk: SkorBilesenleri[][] = []; // [tohum][onayar] bölgeler üzerinden ortalama eklenen değer bileşenleri (akış)
  const tEkToplam: SkorBilesenleri[][] = [];
  const tNormEntropi: number[] = [];
  const tIlkUcBuyukluk: number[] = [];
  const tTasma: number[] = [];
  const tEsitlikleGiren: number[] = [];
  const tAnlamliBolge: number[] = [];
  const tHicbiri: number[] = [];
  const tRefIlkUc: number[] = [];
  const tRefEnIyiyiGecti: number[] = [];
  const tPasifOrtalama: number[] = [];
  const turToplam: Record<string, TurOzeti> = {};
  const bos = (): SkorBilesenleri => ({ hazine: 0, stok: 0, yatirim: 0, israf: 0 });
  const ekle = (a: SkorBilesenleri, b: SkorBilesenleri): void => {
    a.hazine += b.hazine;
    a.stok += b.stok;
    a.yatirim += b.yatirim;
    a.israf += b.israf;
  };
  const bol = (a: SkorBilesenleri, n: number): SkorBilesenleri => ({ hazine: a.hazine / n, stok: a.stok / n, yatirim: a.yatirim / n, israf: a.israf / n });

  for (const tohum of secenek.tohumlar) {
    const nb = bolgeler.length;
    const ilkUcSay = new Array<number>(ns).fill(0);
    const ilkUcToplamSay = new Array<number>(ns).fill(0);
    const enIyiSay = new Array<number>(ns).fill(0);
    const regretTop = new Array<number>(ns).fill(0);
    const regretKirpTop = new Array<number>(ns).fill(0);
    const ekTop = sabit.map(bos);
    const ekToplamTop = sabit.map(bos);
    let regretBolge = 0;
    let anlamliBolge = 0;
    let hicbiri = 0;
    let ilkUcBuyukluk = 0;
    let tasma = 0;
    let esitlikleGiren = 0;
    let pasifTop = 0;
    let refIlkUc = 0;
    let refGecti = 0;
    const ozetler: string[] = [];
    let komutToplam = 0;
    let basarisizToplam = 0;
    let yatirimToplam = 0;
    const tur: Record<string, TurOzeti> = {};
    const duyUc: Record<number, number[]> = {};
    const bolgeSatirlari: Array<Record<string, unknown>> = [];

    bolgeler.forEach((bolge, bi) => {
      const kume = kumeler[bi] as string[];
      const pasif = tekKosu(veri, tohum, kume, PASIF_ONAYAR, gun);
      ozetler.push(pasif.ozet);
      const kosular = onayarlar.map((o) => tekKosu(veri, tohum, kume, o, gun));
      const pasifAkis = pencereSkoru(pasif.anliklar, pencereBas, gun);
      const pasifToplam = pencereSkoru(pasif.anliklar, 0, gun);
      for (const k of kosular) {
        ozetler.push(k.ozet);
        komutToplam += k.komut;
        basarisizToplam += k.basarisiz;
        yatirimToplam += pencereSkoru(k.anliklar, pencereBas, gun).yatirim;
      }
      const ekAkis = kosular.map((k) => bilesenFarki(pencereSkoru(k.anliklar, pencereBas, gun), pasifAkis));
      const ekToplam = kosular.map((k) => bilesenFarki(pencereSkoru(k.anliklar, 0, gun), pasifToplam));
      const pasifSkor = skorToplam(pasifAkis);
      const esik = anlamliEsik(pasifSkor, anlamliOran);
      const esikToplam = anlamliEsik(skorToplam(pasifToplam), anlamliOran);
      for (const b of duyBaslar) {
        const pk = skorToplam(pencereSkoru(pasif.anliklar, b, gun));
        const vv = sabit.map((j) => skorToplam(pencereSkoru((kosular[j] as KosuBilgisi).anliklar, b, gun)) - pk);
        const uc2 = anlamliSiralama(vv, anlamliEsik(pk, anlamliOran)).ilkUc;
        const d = (duyUc[b] ??= new Array<number>(ns).fill(0));
        uc2.forEach((x, i) => {
          if (x) d[i] = (d[i] as number) + 1;
        });
      }
      const v = sabit.map((j) => skorToplam(ekAkis[j] as SkorBilesenleri));
      const vT = sabit.map((j) => skorToplam(ekToplam[j] as SkorBilesenleri));
      const sr = anlamliSiralama(v, esik);
      const srT = anlamliSiralama(vT, esikToplam);
      const rg = regretHesapla(v, esik);
      sr.ilkUc.forEach((x, i) => {
        if (x) ilkUcSay[i] = (ilkUcSay[i] as number) + 1;
        if (x && !sr.kesinIlkUc[i]) esitlikleGiren++;
      });
      srT.ilkUc.forEach((x, i) => {
        if (x) ilkUcToplamSay[i] = (ilkUcToplamSay[i] as number) + 1;
      });
      const uc = sr.ilkUc.filter(Boolean).length;
      ilkUcBuyukluk += uc;
      if (uc > 3) tasma++;
      const enIyiVar = sr.enIyi.some((x) => x > 0);
      sr.enIyi.forEach((x, i) => (enIyiSay[i] = (enIyiSay[i] as number) + x));
      if (sr.anlamli.some(Boolean)) anlamliBolge++;
      else hicbiri++;
      if (rg.dahil) {
        regretBolge++;
        rg.regret.forEach((x, i) => (regretTop[i] = (regretTop[i] as number) + x));
        rg.regretKirpilmamis.forEach((x, i) => (regretKirpTop[i] = (regretKirpTop[i] as number) + x));
      }
      sabit.forEach((j, i) => {
        ekle(ekTop[i] as SkorBilesenleri, ekAkis[j] as SkorBilesenleri);
        ekle(ekToplamTop[i] as SkorBilesenleri, ekToplam[j] as SkorBilesenleri);
      });
      pasifTop += pasifSkor;
      // Referans (dengeli): sabit önayarlarla birlikte aynı kuralla sıralanır
      let refBilgi: Record<string, unknown> | null = null;
      if (referans >= 0) {
        const vr = skorToplam(ekAkis[referans] as SkorBilesenleri);
        const tum = anlamliSiralama([...v, vr], esik);
        const gecti = vr - Math.max(...v) >= esik;
        if (tum.ilkUc[ns]) refIlkUc++;
        if (gecti) refGecti++;
        refBilgi = { ekDeger: say(vr, 1), anlamli: vr >= esik, ilkUc: tum.ilkUc[ns] === true, sabitlerinEniyisiniGecti: gecti };
      }
      const t = bolgeTurleri[bi] as string;
      const o = (tur[t] ??= { n: 0, pay: new Array<number>(ns).fill(0), hicbiri: 0 });
      o.n++;
      if (enIyiVar) sr.enIyi.forEach((x, i) => (o.pay[i] = (o.pay[i] as number) + x));
      else o.hicbiri++;
      bolgeSatirlari.push({
        bolge,
        tur: t,
        kume,
        pasifSkor: say(pasifSkor, 1),
        pasifToplamSkor: say(skorToplam(pasifToplam), 1),
        esik: say(esik, 1),
        ekDegerler: Object.fromEntries(sabitAd.map((a, i) => [a, say(v[i] as number, 1)])),
        ekDegerlerToplam: Object.fromEntries(sabitAd.map((a, i) => [a, say(vT[i] as number, 1)])),
        bilesenler: Object.fromEntries(sabitAd.map((a, i) => [a, bilesenOzeti(ekAkis[sabit[i] as number] as SkorBilesenleri)])),
        anlamli: sabitAd.filter((_, i) => sr.anlamli[i]),
        ilkUc: sabitAd.filter((_, i) => sr.ilkUc[i]),
        enIyi: sabitAd.filter((_, i) => (sr.enIyi[i] as number) > 0).join("=") || "hicbiri",
        referans: refBilgi,
      });
      ilerleme(`H1 tohum ${tohum}: ${bi + 1}/${nb} bolge (${bolge}${kume.length > 1 ? `+${kume[1]}` : ""})`);
    });

    for (const [t, o] of Object.entries(tur)) {
      const a = (turToplam[t] ??= { n: 0, pay: new Array<number>(ns).fill(0), hicbiri: 0 });
      a.n += o.n;
      a.hicbiri += o.hicbiri;
      o.pay.forEach((x, i) => (a.pay[i] = (a.pay[i] as number) + x));
    }
    const ilkUcOran = ilkUcSay.map((x) => x / nb);
    const ilkUcToplamOran = ilkUcToplamSay.map((x) => x / nb);
    const enIyiPay = enIyiSay.map((x) => x / nb);
    const regretOrt = regretTop.map((x) => (regretBolge > 0 ? x / regretBolge : 0));
    const regretKirpOrt = regretKirpTop.map((x) => (regretBolge > 0 ? x / regretBolge : 0));
    const entropi = shannon(enIyiSay);
    const normEntropi = ns > 1 ? entropi / Math.log2(ns) : 0;
    const enYuksek = Math.max(...ilkUcOran);
    const verdict: Verdict = enYuksek > H1_ESIK ? "kaldi" : "gecti";
    const ekOrt = ekTop.map((x) => bol(x, nb));
    const ekToplamOrt = ekToplamTop.map((x) => bol(x, nb));
    tDuy.push(Object.fromEntries(duyBaslar.map((b) => [b, (duyUc[b] as number[]).map((x) => x / nb)])));
    tIlkUc.push(ilkUcOran);
    tIlkUcToplam.push(ilkUcToplamOran);
    tEnIyi.push(enIyiPay);
    tRegret.push(regretOrt);
    tRegretKirp.push(regretKirpOrt);
    tEk.push(ekOrt);
    tEkToplam.push(ekToplamOrt);
    tNormEntropi.push(normEntropi);
    tIlkUcBuyukluk.push(ilkUcBuyukluk / nb);
    tTasma.push(tasma);
    tEsitlikleGiren.push(esitlikleGiren);
    tAnlamliBolge.push(anlamliBolge);
    tHicbiri.push(hicbiri);
    tRefIlkUc.push(refIlkUc / nb);
    tRefEnIyiyiGecti.push(refGecti / nb);
    tPasifOrtalama.push(pasifTop / nb);
    const enIyiRegret = Math.min(...regretOrt);
    tohumBasina.push({
      tohum,
      olcum: say(enYuksek),
      verdict,
      durumOzeti: birlesikOzet(ozetler),
      ozet: {
        enYuksekOnayar: sabitAd[ilkUcOran.indexOf(enYuksek)] as string,
        anlamliIlkUcOrani: adla(ilkUcOran),
        ilkUcOraniToplam7Gun: adla(ilkUcToplamOran),
        enYuksekToplam7Gun: say(Math.max(...ilkUcToplamOran)),
        pencereDuyarliligi: Object.fromEntries(duyBaslar.map((b) => [b, adla((tDuy[tDuy.length - 1] as Record<number, number[]>)[b] as number[])])),
        ilkUcOrtalamaBuyuklugu: say(ilkUcBuyukluk / nb, 2),
        ilkUcTasanBolge: tasma,
        esitlikleIlkUcGirenCift: esitlikleGiren,
        anlamliBolge: anlamliBolge,
        hicbiriAnlamliDegil: hicbiri,
        enIyiOnayarPayi: adla(enIyiPay),
        entropiBit: say(entropi),
        entropiNormalize: say(normEntropi),
        regretBolgeSayisi: regretBolge,
        regretOrtalama: adla(regretOrt),
        regretKirpilmamisOrtalama: adla(regretKirpOrt),
        enIyiTekOnayarRegret: say(enIyiRegret),
        ekDegerBilesenleri: Object.fromEntries(sabitAd.map((a, i) => [a, bilesenOzeti(ekOrt[i] as SkorBilesenleri)])),
        ekDegerBilesenleriToplam7Gun: Object.fromEntries(sabitAd.map((a, i) => [a, bilesenOzeti(ekToplamOrt[i] as SkorBilesenleri)])),
        pasifOrtalamaSkor: say(pasifTop / nb, 1),
        referansIlkUc: referans >= 0 ? say(refIlkUc / nb) : null,
        referansSabitlerinEniyisiniGecti: referans >= 0 ? say(refGecti / nb) : null,
        komut: komutToplam,
        basarisizKomut: basarisizToplam,
        ortalamaYatirim: say(yatirimToplam / (nb * onayarlar.length), 1),
      },
    });
    if (ilkBolgeTablosu.length === 0) ilkBolgeTablosu = bolgeSatirlari;
  }

  const n = tohumBasina.length;
  const ort = (m: readonly number[][], i: number): number => m.reduce((t, r) => t + (r[i] as number), 0) / n;
  const ortSkaler = (d: readonly number[]): number => d.reduce((t, x) => t + x, 0) / n;
  const ilkUcOrt = sabit.map((_, i) => ort(tIlkUc, i));
  const ilkUcToplamOrt = sabit.map((_, i) => ort(tIlkUcToplam, i));
  const enIyiOrt = sabit.map((_, i) => ort(tEnIyi, i));
  const regretOrt = sabit.map((_, i) => ort(tRegret, i));
  const regretKirpOrt = sabit.map((_, i) => ort(tRegretKirp, i));
  const enYuksekOrt = Math.max(...ilkUcOrt);
  const verdict = genelVerdict(tohumBasina.map((t) => t.verdict));
  const ekBilesenOrt = (m: SkorBilesenleri[][]): Record<string, Record<string, number>> =>
    Object.fromEntries(
      sabitAd.map((a, i) => {
        const t = bos();
        for (const r of m) ekle(t, r[i] as SkorBilesenleri);
        return [a, bilesenOzeti(bol(t, n))];
      }),
    );
  const turTablosu = BOLGE_TURLERI.filter((t) => turToplam[t]).map((t) => {
    const o = turToplam[t] as TurOzeti;
    const pay = o.pay.map((x) => x / o.n);
    const enYuksekPay = Math.max(...pay);
    return {
      tur: t,
      aciklama: BOLGE_TURU_ACIKLAMA[t],
      bolgeSayisi: o.n / n,
      enIyi: enYuksekPay > 0 ? sabitAd.filter((_, i) => (pay[i] as number) === enYuksekPay).join("=") : "hicbiri",
      enIyiPay: say(enYuksekPay),
      hicbiriPayi: say(o.hicbiri / o.n),
      dagilim: Object.fromEntries(sabitAd.map((a, i) => [a, say(pay[i] as number)])),
    };
  });
  const turFarkli = new Set(turTablosu.filter((t) => t.enIyi !== "hicbiri").flatMap((t) => t.enIyi.split("="))).size;
  const enIyiTekRegret = Math.min(...regretOrt);
  const normEntropiOrt = ortSkaler(tNormEntropi);
  const esitlikTop = ortSkaler(tEsitlikleGiren);
  const bilgi = {
    regret: { deger: say(enIyiTekRegret), esik: H1_BILGI_REGRET, saglandi: enIyiTekRegret >= H1_BILGI_REGRET, onayar: sabitAd[regretOrt.indexOf(enIyiTekRegret)] as string },
    normalizeEntropi: { deger: say(normEntropiOrt), esik: H1_BILGI_ENTROPI, saglandi: normEntropiOrt >= H1_BILGI_ENTROPI },
    turBasinaFarkliEnIyi: { deger: turFarkli, esik: H1_BILGI_TUR_FARKLI, saglandi: turFarkli >= H1_BILGI_TUR_FARKLI },
  };
  const odakAciklama =
    odakModu === "bolge_liman"
      ? "bölge + en yakın liman (bölge zaten limansa yalnız bölge)"
      : "yalnız odak bölge (limansız tek bölgeli odak; ticaret yalnızca bölge limansa)";
  return {
    kimlik: "H1",
    hipotez: "Bölgeler gerçekten farklı: aynı politika bölgelerin %70'inden fazlasında ilk üçte değil",
    olcum: {
      ad: "En yüksek sabit önayarın anlamlı ilk-üç bölge oranı (v0.2: pasife göre eklenen değer, net değer akışı)",
      deger: say(enYuksekOrt),
      birim: "oran",
      aciklama: `Rekabetli dünyada (arka plan: ${H1_ARKA_PLAN_BOTLARI.join(", ")}) odak oyuncu = ${odakAciklama}; her sabit önayarın (dengeli hariç; t=0 ve 24 saatte bir uygulanan, ${gun} gün) bölge başına eklenen değeri (önayar − pasif; ${pencereBas + 1}-${gun}. gün net değer akışı) anlamlı fark eşiğiyle (θ = max(${H1_ANLAMLI_TABAN / 1000} bin, %${anlamliOran * 100} × |pasif|)) sıralanır; anlamlı ilk üçte olduğu bölge oranının en yükseği.`,
    },
    esik: { aciklama: "En yüksek oran > %70 ise vazgeç (kaldı)", deger: H1_ESIK },
    verdict,
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / n,
    tohumBasina,
    ayrinti: {
      isletimselTanim: [...H1_ISLETIMSEL_TANIM],
      onayarlar: sabit.map((i) => ({ ad: (onayarlar[i] as Onayar).ad, aciklama: (onayarlar[i] as Onayar).aciklama })),
      referans: referans >= 0 ? { ad: H1_REFERANS_ONAYAR, aciklama: (onayarlar[referans] as Onayar).aciklama } : null,
      tohumOrtalamaAnlamliIlkUcOrani: adla(ilkUcOrt),
      tohumOrtalamaIlkUcOraniToplam7Gun: adla(ilkUcToplamOrt),
      tohumOrtalamaEnIyiDagilimi: adla(enIyiOrt),
      tohumOrtalamaRegret: adla(regretOrt),
      tohumOrtalamaRegretKirpilmamis: adla(regretKirpOrt),
      ekDegerBilesenleri: ekBilesenOrt(tEk),
      ekDegerBilesenleriToplam7Gun: ekBilesenOrt(tEkToplam),
      pasifOrtalamaSkor: say(ortSkaler(tPasifOrtalama), 1),
      pencereDuyarliligi: duyBaslar.map((b) => {
        const d = sabit.map((_, i) => tDuy.reduce((t, r) => t + ((r[b] as number[])[i] as number), 0) / n);
        const en = Math.max(...d);
        return { baslangicGunu: b, pencere: `${b + 1}-${gun}. gun`, enYuksek: sabitAd[d.indexOf(en)] as string, enYuksekOran: say(en), oranlar: adla(d), birincil: b === pencereBas };
      }),
      tieOzeti: {
        ilkUcOrtalamaBuyuklugu: say(ortSkaler(tIlkUcBuyukluk), 2),
        ilkUcTasanBolge: say(ortSkaler(tTasma), 2),
        esitlikleIlkUcGirenCift: say(esitlikTop, 2),
        anlamliBolge: say(ortSkaler(tAnlamliBolge), 2),
        hicbiriAnlamliDegil: say(ortSkaler(tHicbiri), 2),
      },
      referansIlkUcOrtalama: referans >= 0 ? say(ortSkaler(tRefIlkUc)) : null,
      referansSabitlerinEniyisiniGectiOrtalama: referans >= 0 ? say(ortSkaler(tRefEnIyiyiGecti)) : null,
      bilgiGostergeleri: bilgi,
      turTablosu,
      bolgeSayisi: bolgeler.length,
      bolgeTurleri: Object.fromEntries(bolgeler.map((b, i) => [b, bolgeTurleri[i]])),
      odakKumeleri: Object.fromEntries(bolgeler.map((b, i) => [b, kumeler[i]])),
      bolgeTablosuIlkTohum: ilkBolgeTablosu,
    },
    parametreler: {
      bolgeSayisi: bolgeler.length,
      tumBolgeSayisi: tumBolgeler.length,
      ornekleme: secenek.tam ? "tam (tum bolgeler)" : "devlet basina esit; devlet icinde ture gore siralanip esit aralikli, devlete gore kaydirilmis konumlar",
      gun,
      pencereAdi: `${pencereBas + 1}-${gun}. gün`,
      skorPenceresi: `birincil ${pencereBas + 1}-${gun}. gun akisi (t=${pencereBas}. gun sonu..${gun}. gun sonu); ikincil ${gun} gunluk toplam`,
      onayarSayisi: sabit.length,
      onayarlar: sabitAd,
      referansOnayar: referans >= 0 ? H1_REFERANS_ONAYAR : "yok",
      pasifReferans: "evet (her bolge/tohum icin ayri kosu; onayar uygulamayan odak oyuncu)",
      uygulamaAraligiSaat: 24,
      odakKurulumu: odakModu === "bolge_liman" ? "bolge+liman" : "bolge",
      odakKumeleri: bolgeler.map((b, i) => ((kumeler[i] as string[]).length > 1 ? `${b}+${(kumeler[i] as string[])[1]}` : b)).join(","),
      dunya: `rekabetli: her devlet bir arka plan botu (${H1_ARKA_PLAN_BOTLARI.join(", ")}; devlet sirasi tohumla doner), odak bolge(ler) devletlerinden cikarilip 'odak' oyuncuya verilir`,
      skor: "eklenen deger = onayar skoru - pasif skoru; skor = Δhazine + Δstok (taban fiyat) + yatirim (baslatilan tesis insaati ve kenar gelistirme bedeli, maliyet bedeliyle, amortismansiz)",
      anlamliFark: `θ = max(${H1_ANLAMLI_TABAN} para, ${anlamliOran} × |pasif skoru|); esit grup en iyi uyeden θ icinde; pasife esit (ek < θ) ilk uce girmez`,
      sira: "yalniz anlamli onayarlar; esit gruplar konum paylasir (ortalama sira); ilk uc = ortalama sira <= 3",
      hizli: secenek.hizli === true,
      tam: secenek.tam === true,
    },
    sureMs: Date.now() - basla,
  };
}
