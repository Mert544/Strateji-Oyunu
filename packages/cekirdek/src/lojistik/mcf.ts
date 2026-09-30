/**
 * Tamsayı min-maliyet akış (SAF: Dunya'ya bağımlı değildir).
 *
 * Yöntem: ardışık en kısa yol (successive shortest path, SSP) + SPFA.
 *
 * Model:
 *  - Süper kaynak S ve süper hedef T eklenir: S -> kaynak düğümü (kapasite = arz, maliyet 0),
 *    hedef düğümü -> T (kapasite = talep, maliyet 0).
 *  - Yönsüz kenar i (kapasite c, maliyet w), "iki yön toplamı c" sınırını paylaşan tek kenardır;
 *    net akış f in [-c, +c]. Maliyetler pozitif olduğundan en iyi çözümde bir kenarda ters yönlü
 *    akış asla birlikte bulunmaz (iptal etmek maliyeti düşürür). Bu yüzden her kenar için iki yönlü
 *    (u->v ve v->u, her biri kapasite c, maliyet w) ve her birinin ters artık yayı (maliyet -w)
 *    kurulur; negatif maliyetli artık yaylar SPFA (Bellman-Ford kuyruklu) ile doğru ele alınır.
 *    Net akış f = (u->v akışı) - (v->u akışı).
 *  - Her adımda S -> T en kısa (en ucuz) artık yol bulunur ve darboğaz kadar itilir. SSP her akış
 *    miktarı için minimum maliyeti verir; artırıcı yol kalmayınca akış maksimumdur. Yani önce
 *    maksimum akış, o akış için minimum maliyet elde edilir.
 *
 * Determinizm: yaylar artan indeksle, kuyruk FIFO, yalnızca KESİN iyileşmede güncelleme
 * (eşitlikte ilk bulunan / düşük indeksli yay kalır). Map/Set kullanılmaz.
 *
 * Karmaşıklık: artırım sayısı A için O(A * V * E) en kötü durum (SPFA tipik olarak O(E) civarı);
 * A pratikte kenar sayısıyla orantılıdır (her artırım bir yayı doldurur/bir arzı bitirir).
 */
import { komsulukKur, kenarlariDogrula, type GrafKenari } from "./graf";

/** Düğüm + miktar (arz veya talep). */
export interface DugumMiktar {
  dugum: number;
  miktar: number;
}

/** Yol ayrıştırmasındaki tek bir yol. */
export interface McfYolu {
  kaynak: number;
  hedef: number;
  /** Kaynaktan hedefe sırayla kenar indeksleri; yerel eşleşmede boş. */
  kenarlar: number[];
  miktar: number;
  /** Yol maliyeti toplamı (ms) */
  sureMs: number;
}

export interface McfSonucu {
  /** Taşınan toplam miktar (yerel eşleşmeler dahil) */
  toplamAkis: number;
  /** Toplam maliyet = Σ maliyet_i * |akış_i| (yerel eşleşme maliyeti 0) */
  toplamMaliyet: number;
  /** Kenar başına işaretli akış; u->v yönü pozitif. Uzunluk = kenarlar.length */
  kenarAkisi: number[];
  /** Kenar akışının deterministik yol ayrıştırması */
  yollar: McfYolu[];
}

const SONSUZ = Number.MAX_SAFE_INTEGER;

/** Aynı düğümdeki girdileri toplar; miktarı <= 0 olanları atar; düğüm indeksine göre artan dizi döndürür. */
function dugumeGoreTopla(dugumSayisi: number, girdi: readonly DugumMiktar[], ad: string): number[] {
  const toplam: number[] = new Array<number>(dugumSayisi).fill(0);
  for (const g of girdi) {
    if (!Number.isInteger(g.dugum) || g.dugum < 0 || g.dugum >= dugumSayisi) {
      throw new RangeError(`${ad}: dugum aralik disi (${g.dugum})`);
    }
    if (!Number.isInteger(g.miktar)) throw new RangeError(`${ad}: miktar tamsayi olmali (${g.miktar})`);
    if (g.miktar > 0) toplam[g.dugum]! += g.miktar;
  }
  return toplam;
}

/**
 * Min-maliyet akış. Toplam akış = min(toplam arz, toplam talep, ağın taşıyabildiği).
 *
 * Yerel eşleşme: aynı düğümde hem arz hem talep varsa önce `min(arz, talep)` kadarı yerelde
 * (maliyet 0, boş yol) eşleşir; kalan arz/talep ağa girer. (Değişim argümanıyla bu, toplam akış
 * ve maliyet açısından optimaldir.) Aynı düğümdeki birden çok girdi toplanır.
 */
export function minMaliyetAkis(
  dugumSayisi: number,
  kenarlar: readonly GrafKenari[],
  kaynaklar: readonly DugumMiktar[],
  hedefler: readonly DugumMiktar[],
): McfSonucu {
  kenarlariDogrula(dugumSayisi, kenarlar);
  const m = kenarlar.length;
  const arz = dugumeGoreTopla(dugumSayisi, kaynaklar, "kaynaklar");
  const talep = dugumeGoreTopla(dugumSayisi, hedefler, "hedefler");

  // 1) Yerel eşleşme
  const yerel: number[] = new Array<number>(dugumSayisi).fill(0);
  let toplamAkis = 0;
  for (let v = 0; v < dugumSayisi; v++) {
    const e = Math.min(arz[v]!, talep[v]!);
    if (e > 0) {
      yerel[v] = e;
      arz[v]! -= e;
      talep[v]! -= e;
      toplamAkis += e;
    }
  }

  // 2) Artık ağ: kenar i -> yaylar 4i (u->v), 4i+1 (ters), 4i+2 (v->u), 4i+3 (ters); sonra S/T yayları.
  const S = dugumSayisi;
  const T = dugumSayisi + 1;
  const N = dugumSayisi + 2;
  const yayHedef: number[] = [];
  const yayKap: number[] = [];
  const yayMal: number[] = [];
  const yayKaynak: number[] = [];

  const yayEkle = (a: number, b: number, kap: number, mal: number): number => {
    const id = yayHedef.length;
    yayKaynak.push(a); yayHedef.push(b); yayKap.push(kap); yayMal.push(mal);
    yayKaynak.push(b); yayHedef.push(a); yayKap.push(0); yayMal.push(-mal);
    return id;
  };

  for (let i = 0; i < m; i++) {
    const k = kenarlar[i]!;
    if (k.u === k.v) {
      // Kendi kendine döngü: akış taşımaz; yay düzeni bozulmasın diye kapasitesiz eklenir.
      yayEkle(k.u, k.v, 0, k.maliyet);
      yayEkle(k.v, k.u, 0, k.maliyet);
    } else {
      yayEkle(k.u, k.v, k.kapasite, k.maliyet);
      yayEkle(k.v, k.u, k.kapasite, k.maliyet);
    }
  }
  const kaynakYay: number[] = new Array<number>(dugumSayisi).fill(-1);
  const hedefYay: number[] = new Array<number>(dugumSayisi).fill(-1);
  for (let v = 0; v < dugumSayisi; v++) {
    if (arz[v]! > 0) kaynakYay[v] = yayEkle(S, v, arz[v]!, 0);
  }
  for (let v = 0; v < dugumSayisi; v++) {
    if (talep[v]! > 0) hedefYay[v] = yayEkle(v, T, talep[v]!, 0);
  }

  // Düğüm başına giden yaylar, artan yay indeksiyle
  const cikan: number[][] = [];
  for (let i = 0; i < N; i++) cikan.push([]);
  for (let a = 0; a < yayHedef.length; a++) cikan[yayKaynak[a]!]!.push(a);

  // 3) SSP + SPFA
  const uzak: number[] = new Array<number>(N).fill(SONSUZ);
  const oncekiYay: number[] = new Array<number>(N).fill(-1);
  const kuyrukta: boolean[] = new Array<boolean>(N).fill(false);
  const halka: number[] = new Array<number>(N + 1).fill(0);

  for (;;) {
    uzak.fill(SONSUZ);
    oncekiYay.fill(-1);
    uzak[S] = 0;
    let bas = 0;
    let son = 0; // halka kuyruğu: [bas, son) mod N+1
    halka[son] = S; son = (son + 1) % (N + 1);
    kuyrukta[S] = true;
    while (bas !== son) {
      const x = halka[bas]!;
      bas = (bas + 1) % (N + 1);
      kuyrukta[x] = false;
      const dx = uzak[x]!;
      for (const a of cikan[x]!) {
        if (yayKap[a]! <= 0) continue;
        const y = yayHedef[a]!;
        const nd = dx + yayMal[a]!;
        if (nd < uzak[y]!) {
          uzak[y] = nd;
          oncekiYay[y] = a;
          if (!kuyrukta[y]) {
            kuyrukta[y] = true;
            halka[son] = y; son = (son + 1) % (N + 1);
          }
        }
      }
    }
    if (uzak[T] === SONSUZ) break;
    // Darboğaz
    let itilecek = SONSUZ;
    for (let x = T; x !== S; x = yayKaynak[oncekiYay[x]!]!) {
      const k = yayKap[oncekiYay[x]!]!;
      if (k < itilecek) itilecek = k;
    }
    for (let x = T; x !== S; x = yayKaynak[oncekiYay[x]!]!) {
      const a = oncekiYay[x]!;
      yayKap[a]! -= itilecek;
      yayKap[a ^ 1]! += itilecek;
    }
    toplamAkis += itilecek;
  }

  // 4) Kenar akışları: net f = (u->v akışı) - (v->u akışı); akış = ters yayın kapasitesi.
  const kenarAkisi: number[] = new Array<number>(m).fill(0);
  let toplamMaliyet = 0;
  for (let i = 0; i < m; i++) {
    const f = yayKap[4 * i + 1]! - yayKap[4 * i + 3]!;
    kenarAkisi[i] = f;
    toplamMaliyet += kenarlar[i]!.maliyet * Math.abs(f);
  }

  // Ağa giren arz / ağdan çıkan talep (yerel eşleşme hariç)
  const gonderilen: number[] = new Array<number>(dugumSayisi).fill(0);
  const alinan: number[] = new Array<number>(dugumSayisi).fill(0);
  for (let v = 0; v < dugumSayisi; v++) {
    if (kaynakYay[v]! >= 0) gonderilen[v] = yayKap[kaynakYay[v]! ^ 1]!;
    if (hedefYay[v]! >= 0) alinan[v] = yayKap[hedefYay[v]! ^ 1]!;
  }

  const yollar = yolAyristir(dugumSayisi, kenarlar, kenarAkisi, gonderilen, alinan, yerel);
  return { toplamAkis, toplamMaliyet, kenarAkisi, yollar };
}

/**
 * Kenar akışını deterministik yollara ayrıştırır: düşük indeksli kaynak önce (yerel eşleşme o
 * düğümün yollarından önce), yürüyüşte düşük kenar indeksi önce, ilk ulaşılan talepli düğümde durulur.
 * Akış döngü içeriyorsa (pozitif maliyetlerde optimalde olmaz) döngü çalışma kopyasında iptal edilir.
 */
function yolAyristir(
  dugumSayisi: number,
  kenarlar: readonly GrafKenari[],
  kenarAkisi: readonly number[],
  gonderilen: readonly number[],
  alinan: readonly number[],
  yerel: readonly number[],
): McfYolu[] {
  const yollar: McfYolu[] = [];
  const kom = komsulukKur(dugumSayisi, kenarlar);
  const kalan = kenarAkisi.slice(); // çalışma kopyası (işaretli)
  const kalanGonder = gonderilen.slice();
  const kalanAl = alinan.slice();

  /** x düğümünden kenar i üzerinden çıkan yönlü kalan akış miktarı. */
  const cikanAkis = (x: number, i: number): number => {
    const k = kenarlar[i]!;
    const f = kalan[i]!;
    if (k.u === x) return f > 0 ? f : 0;
    return f < 0 ? -f : 0;
  };

  const konum: number[] = new Array<number>(dugumSayisi).fill(-1);

  for (let s = 0; s < dugumSayisi; s++) {
    if (yerel[s]! > 0) yollar.push({ kaynak: s, hedef: s, kenarlar: [], miktar: yerel[s]!, sureMs: 0 });
    while (kalanGonder[s]! > 0) {
      const yolKenar: number[] = [];
      const yolDugum: number[] = [s]; // yolDugum[j] = j. kenardan önceki düğüm
      konum.fill(-1);
      konum[s] = 0;
      let x = s;
      let bulunan = -1;
      for (;;) {
        if (x !== s && kalanAl[x]! > 0) { bulunan = x; break; }
        let secilen = -1;
        for (const { kenar } of kom[x]!) {
          if (cikanAkis(x, kenar) > 0) { secilen = kenar; break; }
        }
        if (secilen < 0) break; // korunum bozuk: güvenli çıkış
        const k = kenarlar[secilen]!;
        const y = k.u === x ? k.v : k.u;
        if (konum[y]! >= 0) {
          // Döngü: y'den bu yana olan kenarları iptal et, yürüyüşü y'ye geri sar.
          const bas = konum[y]!;
          const dongu = yolKenar.slice(bas);
          dongu.push(secilen);
          let dar = SONSUZ;
          let c = y;
          for (const e of dongu) {
            const a = cikanAkis(c, e);
            if (a < dar) dar = a;
            c = kenarlar[e]!.u === c ? kenarlar[e]!.v : kenarlar[e]!.u;
          }
          c = y;
          for (const e of dongu) {
            kalan[e]! += kenarlar[e]!.u === c ? -dar : dar;
            c = kenarlar[e]!.u === c ? kenarlar[e]!.v : kenarlar[e]!.u;
          }
          for (let j = bas + 1; j < yolDugum.length; j++) konum[yolDugum[j]!] = -1;
          yolKenar.length = bas;
          yolDugum.length = bas + 1;
          x = y;
          continue;
        }
        yolKenar.push(secilen);
        yolDugum.push(y);
        konum[y] = yolDugum.length - 1;
        x = y;
      }
      if (bulunan < 0) break;

      let miktar = Math.min(kalanGonder[s]!, kalanAl[bulunan]!);
      let c = s;
      for (const e of yolKenar) {
        const a = cikanAkis(c, e);
        if (a < miktar) miktar = a;
        c = kenarlar[e]!.u === c ? kenarlar[e]!.v : kenarlar[e]!.u;
      }
      let sure = 0;
      c = s;
      for (const e of yolKenar) {
        kalan[e]! += kenarlar[e]!.u === c ? -miktar : miktar;
        sure += kenarlar[e]!.maliyet;
        c = kenarlar[e]!.u === c ? kenarlar[e]!.v : kenarlar[e]!.u;
      }
      kalanGonder[s]! -= miktar;
      kalanAl[bulunan]! -= miktar;
      yollar.push({ kaynak: s, hedef: bulunan, kenarlar: yolKenar, miktar, sureMs: sure });
    }
  }
  return yollar;
}

/**
 * Sonraki mal için kalan kapasite: her kenarda `max(0, kapasite - |akış|)`
 * (kapasite iki yön toplamı için paylaşıldığından |f| kadar düşülür).
 */
export function kalanKapasite(kenarlar: readonly GrafKenari[], kenarAkisi: readonly number[]): number[] {
  return kenarlar.map((k, i) => Math.max(0, k.kapasite - Math.abs(kenarAkisi[i] ?? 0)));
}
