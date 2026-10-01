/**
 * Komut kaydı (registry): her çekirdek komutu için tek bir `KomutTanimi`. Form alanları içerikten (tesis türleri,
 * yöntemler, teknolojiler, birlikler, ekim ürünleri, mallar) ve bölge/oyuncu durumundan türetilir; doğrulama,
 * önizleme ve Türkçe özet aynı kayıttadır. Yeni bir çekirdek komutu (ör. Pazar/Devlet katmanı) eklenince
 * buraya bir `tanim(...)` eklemek yeter; form çizimi (arayuz/komut-govde.ts) ve işçi hattı değişmez.
 * Saf modül: DOM yok.
 */
import { fmt, fmt1 } from "../arayuz/bicim";
import type { Dizin } from "../veri/kare-tipleri";
import { kararTeknolojisi, teknolojiAdi } from "./tablo";
import type { Icerik, MalMiktar } from "./tablo";
import { bolgeAdiId, bolgeIndeksi } from "./tipler";
import type { Alan, Baglam, Girdi, Komut, KomutTanimi, KomutTuru, OnizlemeSatiri, OzetBaglami, Secenek } from "./tipler";

// ---------------------------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------------------------

const para = (mili: number): string => fmt(mili / 1000);
const birim = (mili: number): string => fmt1(mili / 1000);

/** Saat -> "40 dk" / "6 sa" / "2 gün 3 sa". */
export function sureMetni(saat: number): string {
  if (saat < 1) return `${Math.max(1, Math.round(saat * 60))} dk`;
  if (saat < 48) return `${fmt1(saat)} sa`;
  return `${Math.floor(saat / 24)} gün ${Math.round(saat % 24)} sa`;
}

/** Erken oyun hızlandırmasıyla gerçek süre (saat); en az 1 dakika. */
function gercekSure(b: Baglam, saat: number): number {
  return Math.max(1 / 60, (saat * b.ben.sureCarpani) / 1000);
}

function sureSatiri(b: Baglam, saat: number): OnizlemeSatiri {
  const g = gercekSure(b, saat);
  return { metin: b.ben.sureCarpani < 1000 ? `Süre: ~${sureMetni(g)} (erken oyun hızlandırması; normalde ${sureMetni(saat)})` : `Süre: ${sureMetni(saat)}` };
}

const bolgeId = (b: Baglam): string => b.dizin.bolgeler[b.bolge]?.id ?? "";
const ob = (b: Baglam, i = b.bolge) => b.ben.bolgeler[i];
const hazine = (b: Baglam): number => b.kare.hazine[b.ben.idx] ?? 0;
const devletAdi = (d: Dizin, oyuncu: number): string => d.devletler[d.oyuncular[oyuncu]?.devlet ?? -1]?.ad ?? "?";
const oyuncuId = (d: Dizin, i: number): string => d.oyuncular[i]?.id ?? `o${i}`;
const ETIKET: Record<string, string> = { liman: "Liman", dag: "Dağ", dar_gecit: "Dar geçit", kiyi: "Kıyı", ova: "Ova" };

/** Kayıt içeriğinin (id -> mili miktar) mal indeksli listesi. */
function kayitMal(ic: Icerik, r: Record<string, number>): MalMiktar {
  return Object.keys(r)
    .sort()
    .flatMap((id): MalMiktar => (ic.malIdx[id] === undefined ? [] : [[ic.malIdx[id] as number, r[id] as number]]))
    .sort((x, y) => x[0] - y[0]);
}

function olcekle(l: MalMiktar, oran: number, adet = 1): MalMiktar {
  return l.map(([m, q]): [number, number] => [m, Math.round((q * oran * adet) / 1_000_000)]).filter((x) => x[1] > 0);
}

/** Maliyet satırları: para ve her mal için "var / yok" işaretiyle (bölge stoğuna göre). */
export function maliyetSatirlari(b: Baglam, bolge: number, mal: MalMiktar, paraMili: number): OnizlemeSatiri[] {
  const s: OnizlemeSatiri[] = [];
  const h = hazine(b);
  if (paraMili > 0) s.push({ metin: `Para: ${para(paraMili)} (hazine ${fmt(h)})`, durum: h >= paraMili / 1000 ? "iyi" : "kotu" });
  const bk = b.kare.bolgeler[bolge];
  for (const [m, q] of mal) {
    const stok = bk?.stok[m] ?? 0;
    s.push({ metin: `${b.ic.mallar[m]?.ad ?? "?"}: ${birim(q)} (${b.dizin.bolgeler[bolge] ? b.bolgeAd(bolge) : "bölge"} deposunda ${fmt(stok)})`, durum: stok + 0.5 >= q / 1000 ? "iyi" : "kotu" });
  }
  return s;
}

function maliyetYeter(b: Baglam, bolge: number, mal: MalMiktar, paraMili: number): boolean {
  return maliyetSatirlari(b, bolge, mal, paraMili).every((x) => x.durum !== "kotu");
}

const mevcutTesis = (b: Baglam) => ob(b)?.tesisler ?? [];

function tesisEtiketi(b: Baglam, t: { tur: number; yontem: number; aktif: boolean; olcek?: number }): string {
  const olcek = t.olcek !== undefined ? ` ${["S", "M", "L"][t.olcek] ?? ""}` : "";
  return `${b.ic.turler[t.tur]?.ad ?? "?"}${olcek} · ${b.ic.yontemler[t.yontem]?.ad ?? "?"}${t.aktif ? "" : " (pasif)"}`;
}

const secimDegeri = (s: Secenek[], g: Girdi, ad: string): string => {
  const v = g[ad];
  const bulunan = s.find((x) => x.deger === v && x.devre === undefined);
  return bulunan ? bulunan.deger : (s.find((x) => x.devre === undefined) ?? s[0])?.deger ?? "";
};

const sayiAl = (g: Girdi, ad: string): number => Number((g[ad] ?? "").replace(",", "."));
const tamSayi = (g: Girdi, ad: string): number | null => {
  const x = sayiAl(g, ad);
  return Number.isFinite(x) && Number.isInteger(x) ? x : null;
};

function teknolojiVarMi(b: Baglam, id: string | undefined): boolean {
  if (id === undefined) return true;
  const i = b.ic.teknolojiIdx[id];
  return i !== undefined && b.ben.teknolojiler.includes(i);
}

const gerekliTeknoloji = (b: Baglam, id: string | undefined): string | undefined => (teknolojiVarMi(b, id) ? undefined : `Teknoloji gerekli: ${teknolojiAdi(b.ic, id as string)}`);

// ---------------------------------------------------------------------------------------------
// Kayıt oluşturucu (tür ile tipli özet/komut)
// ---------------------------------------------------------------------------------------------

type K<T extends KomutTuru> = Extract<Komut, { tur: T }>;

interface Tanim<T extends KomutTuru> extends Omit<KomutTanimi, "tur" | "komut" | "ozet" | "eylem"> {
  tur: T;
  komut(b: Baglam, g: Girdi): K<T> | string;
  ozet(k: K<T>, o: OzetBaglami): string;
  eylem?(k: K<T>, o: OzetBaglami): string;
}

function tanim<T extends KomutTuru>(t: Tanim<T>): KomutTanimi {
  return t as unknown as KomutTanimi;
}

// ---------------------------------------------------------------------------------------------
// Bölge komutları
// ---------------------------------------------------------------------------------------------

/** Tesis türü bu bölgede kurulamıyorsa nedeni (maliyet hariç). */
function insaNedeni(b: Baglam, ti: number): string | undefined {
  const T = b.ic.turler[ti];
  const bol = b.dizin.bolgeler[b.bolge];
  const o = ob(b);
  if (!T || !bol || !o) return "Bilinmeyen tür";
  const tek = gerekliTeknoloji(b, T.gerekliTeknoloji);
  if (tek) return tek;
  if (T.gerekliEtiket !== undefined && !bol.etiketler.includes(T.gerekliEtiket)) return `Bölgede ${ETIKET[T.gerekliEtiket] ?? T.gerekliEtiket} yok`;
  if (T.gerekliRezerv >= 0 && (o.rezerv[T.gerekliRezerv] ?? 0) <= 0) return `Bölgede ${b.ic.mallar[T.gerekliRezerv]?.ad ?? "ham madde"} rezervi yok`;
  const tavan = b.dizin.tarim?.bolgeler[b.bolge]?.[2];
  if (T.tarimTesisi && tavan !== undefined && o.tarimTesisi >= tavan) return `Tarım tesisi tavanı dolu (${tavan})`;
  return undefined;
}

const tesisInsa = tanim({
  id: "tesis_insa",
  tur: "tesis_insa",
  ad: "Tesis kur",
  kapsam: "bolge",
  aciklama: "Bölgeye yeni bir tesis kurar. Maliyet hemen düşer; inşaat bitince tesis çalışmaya başlar.",
  gonder: "Kur",
  uygun: () => null,
  alanlar(b) {
    const sec: Secenek[] = b.ic.turler.map((T) => {
      const neden = insaNedeni(b, T.indeks);
      if (neden) return { deger: T.id, etiket: `${T.ad} — ${neden}`, devre: neden };
      const yeter = maliyetYeter(b, b.bolge, T.maliyet, T.para);
      return { deger: T.id, etiket: `${T.ad} — ${para(T.para)} para · ${sureMetni(gercekSure(b, T.sureSaat))}${yeter ? "" : " · kaynak yetersiz"}` };
    });
    return [{ tip: "secim", ad: "tesisTuru", etiket: "Tesis türü", secenekler: sec }];
  },
  varsayilan(b) {
    const uygun = b.ic.turler.filter((T) => !insaNedeni(b, T.indeks));
    const secilen = uygun.find((T) => maliyetYeter(b, b.bolge, T.maliyet, T.para)) ?? uygun[0] ?? b.ic.turler[0];
    return { tesisTuru: secilen?.id ?? "" };
  },
  komut(b, g) {
    const T = b.ic.turler[b.ic.turIdx[g["tesisTuru"] ?? ""] ?? -1];
    if (!T) return "Bir tesis türü seçin.";
    return { tur: "tesis_insa", bolge: bolgeId(b), tesisTuru: T.id };
  },
  onizleme(b, g) {
    const T = b.ic.turler[b.ic.turIdx[g["tesisTuru"] ?? ""] ?? -1];
    if (!T) return [];
    const y = b.ic.yontemler[T.yontemler[0] ?? -1];
    const ad = (l: MalMiktar): string => l.map(([m, q]) => `${b.ic.mallar[m]?.ad ?? "?"} ${birim(q)}`).join(", ");
    const s = [...maliyetSatirlari(b, b.bolge, T.maliyet, T.para), sureSatiri(b, T.sureSaat)];
    if (y) {
      if (y.cikti.length) s.push({ metin: `Üretir (tam kadro, birim/sa): ${ad(y.cikti)}` });
      if (y.girdi.length) s.push({ metin: `Tüketir: ${ad(y.girdi)}` });
      if (y.isci > 0) s.push({ metin: `İşçi: ${fmt(y.isci)} kişi` });
    }
    const neden = insaNedeni(b, T.indeks);
    if (neden) s.unshift({ metin: neden, durum: "kotu" });
    return s;
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: ${o.ic.turler[o.ic.turIdx[k.tesisTuru] ?? -1]?.ad ?? k.tesisTuru} inşaatı başladı`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: ${o.ic.turler[o.ic.turIdx[k.tesisTuru] ?? -1]?.ad ?? k.tesisTuru} kur`,
});

const yontemDegistir = tanim({
  id: "yontem_degistir",
  tur: "yontem_degistir",
  ad: "Yöntem değiştir",
  kapsam: "bolge",
  aciklama: "Bir tesisin çalışma yöntemini değiştirir (ör. otomasyon, derin madencilik). Yöntemler teknolojiyle açılır.",
  gonder: "Değiştir",
  uygun: (b) => (mevcutTesis(b).length === 0 ? "Bölgede tesis yok" : null),
  alanlar(b, g) {
    const tesisler = mevcutTesis(b);
    const ts: Secenek[] = tesisler.map((t) => ({ deger: String(t.id), etiket: tesisEtiketi(b, t) }));
    const seciliId = Number(secimDegeri(ts, g, "tesis"));
    const t = tesisler.find((x) => x.id === seciliId);
    const ys: Secenek[] = (b.ic.turler[t?.tur ?? -1]?.yontemler ?? [])
      .filter((yi) => yi !== t?.yontem)
      .map((yi) => {
        const y = b.ic.yontemler[yi];
        const neden = gerekliTeknoloji(b, y?.gerekliTeknoloji);
        return { deger: y?.id ?? "", etiket: neden ? `${y?.ad ?? "?"} — ${neden}` : (y?.ad ?? "?"), ...(neden ? { devre: neden } : {}) };
      });
    return [
      { tip: "secim", ad: "tesis", etiket: "Tesis", secenekler: ts },
      { tip: "secim", ad: "yontem", etiket: ys.length ? "Yeni yöntem" : "Yeni yöntem (bu türde başka yöntem yok)", secenekler: ys },
    ];
  },
  varsayilan: () => ({}),
  komut(b, g) {
    const tesis = Number(g["tesis"]);
    if (!mevcutTesis(b).some((t) => t.id === tesis)) return "Bir tesis seçin.";
    if (!g["yontem"]) return "Bu tesis için seçilebilir başka bir yöntem yok.";
    return { tur: "yontem_degistir", bolge: bolgeId(b), tesis, yontem: g["yontem"] };
  },
  onizleme(b, g) {
    const y = b.ic.yontemler[b.ic.yontemIdx[g["yontem"] ?? ""] ?? -1];
    if (!y) return [];
    const ad = (l: MalMiktar): string => l.map(([m, q]) => `${b.ic.mallar[m]?.ad ?? "?"} ${birim(q)}`).join(", ") || "—";
    return [{ metin: `Üretir: ${ad(y.cikti)}` }, { metin: `Tüketir: ${ad(y.girdi)}` }, { metin: `İşçi: ${fmt(y.isci)} kişi` }];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: tesis yöntemi "${o.ic.yontemler[o.ic.yontemIdx[k.yontem] ?? -1]?.ad ?? k.yontem}" olarak değiştirildi`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: tesis yöntemini "${o.ic.yontemler[o.ic.yontemIdx[k.yontem] ?? -1]?.ad ?? k.yontem}" yap`,
});

const tesisDurum = tanim({
  id: "tesis_durum",
  tur: "tesis_durum",
  ad: "Tesisi durdur / başlat",
  kapsam: "bolge",
  aciklama: "Pasif tesis üretmez ve işçi çalıştırmaz; işletme gideri de ödenmez.",
  gonder: "Uygula",
  uygun: (b) => (mevcutTesis(b).length === 0 ? "Bölgede tesis yok" : null),
  alanlar(b) {
    return [
      { tip: "secim", ad: "tesis", etiket: "Tesis", secenekler: mevcutTesis(b).map((t) => ({ deger: String(t.id), etiket: tesisEtiketi(b, t) })) },
      { tip: "secim", ad: "aktif", etiket: "Durum", secenekler: [{ deger: "1", etiket: "Çalışsın" }, { deger: "0", etiket: "Dursun" }] },
    ];
  },
  varsayilan: (b) => ({ aktif: mevcutTesis(b)[0]?.aktif ? "0" : "1" }),
  komut(b, g) {
    const tesis = Number(g["tesis"]);
    if (!mevcutTesis(b).some((t) => t.id === tesis)) return "Bir tesis seçin.";
    return { tur: "tesis_durum", bolge: bolgeId(b), tesis, aktif: g["aktif"] !== "0" };
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: tesis ${k.aktif ? "çalıştırıldı" : "durduruldu"}`,
});

const OLCEK_AD = ["S", "M", "L"];

function olcekMaliyeti(b: Baglam, tesis: { tur: number; olcek?: number }, hedef: number): { mal: MalMiktar; para: number; saat: number } | null {
  const sn = b.ic.param.sanayi;
  const T = b.ic.turler[tesis.tur];
  const hedefK = sn?.olcekKademeleri[hedef];
  const simdiK = sn?.olcekKademeleri[tesis.olcek ?? 0];
  if (!sn || !T || !hedefK || !simdiK) return null;
  const oran = hedefK.insaPpm - simdiK.insaPpm;
  return { mal: olcekle(T.maliyet, oran), para: Math.round((T.para * oran) / 1_000_000), saat: (T.sureSaat * sn.olcekYukseltmeSureCarpaniPpm) / 1_000_000 };
}

const olcekYukselt = tanim({
  id: "tesis_olcek_yukselt",
  tur: "tesis_olcek_yukselt",
  ad: "Tesis ölçeğini yükselt",
  kapsam: "bolge",
  aciklama: "Tesisi S → M → L ölçeğe büyütür: çıktı, işçi ve bakım gideri artar. L ölçek elektrik ve girdi açlığı riski taşır.",
  gonder: "Yükselt",
  uygun(b) {
    if (!b.ic.sanayi) return "Sanayi katmanı kapalı";
    const adaylar = mevcutTesis(b).filter((t) => (t.olcek ?? 0) < 2 && !b.ben.insaatlar.some((i) => i.tur === "olcek" && i.hedef === t.id));
    return adaylar.length ? null : "Yükseltilecek tesis yok (hepsi L ya da yükseltme sürüyor)";
  },
  alanlar(b, g) {
    const adaylar = mevcutTesis(b).filter((t) => (t.olcek ?? 0) < 2 && !b.ben.insaatlar.some((i) => i.tur === "olcek" && i.hedef === t.id));
    const ts: Secenek[] = adaylar.map((t) => ({ deger: String(t.id), etiket: tesisEtiketi(b, t) }));
    const t = adaylar.find((x) => String(x.id) === secimDegeri(ts, g, "tesis"));
    const os: Secenek[] = [1, 2]
      .filter((k) => k > (t?.olcek ?? 0))
      .map((k) => {
        const neden = gerekliTeknoloji(b, b.ic.param.sanayi?.olcekKademeleri[k]?.gerekliTeknoloji ?? undefined);
        return { deger: String(k), etiket: `${OLCEK_AD[k]} ölçek${neden ? ` — ${neden}` : ""}`, ...(neden ? { devre: neden } : {}) };
      });
    return [
      { tip: "secim", ad: "tesis", etiket: "Tesis", secenekler: ts },
      { tip: "secim", ad: "olcek", etiket: "Hedef ölçek", secenekler: os },
    ];
  },
  varsayilan: () => ({}),
  komut(b, g) {
    const tesis = Number(g["tesis"]);
    const olcek = Number(g["olcek"]);
    if (!mevcutTesis(b).some((t) => t.id === tesis)) return "Bir tesis seçin.";
    if (olcek !== 1 && olcek !== 2) return "Hedef ölçeği seçin.";
    return { tur: "tesis_olcek_yukselt", bolge: bolgeId(b), tesis, olcek };
  },
  onizleme(b, g) {
    const t = mevcutTesis(b).find((x) => String(x.id) === g["tesis"]);
    const m = t ? olcekMaliyeti(b, t, Number(g["olcek"])) : null;
    return m ? [...maliyetSatirlari(b, b.bolge, m.mal, m.para), sureSatiri(b, m.saat)] : [];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: tesis ${OLCEK_AD[k.olcek]} ölçeğe yükseltiliyor`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: bir tesisi ${OLCEK_AD[k.olcek]} ölçeğe yükselt`,
});

const genelOnarim = tanim({
  id: "genel_onarim",
  tur: "genel_onarim",
  ad: "Genel onarım",
  kapsam: "bolge",
  aciklama: "Bölgedeki aşınmış tesislerin tümünü onarır; onarım süresince bu tesisler çalışmaz.",
  gonder: "Onar",
  uygun(b) {
    if (!b.ic.sanayi) return "Sanayi katmanı kapalı";
    if (b.ben.insaatlar.some((i) => i.tur === "onarim" && i.bolge === b.bolge)) return "Onarım sürüyor";
    return mevcutTesis(b).some((t) => (t.asinma ?? 0) > 0) ? null : "Onarılacak aşınma yok";
  },
  alanlar: () => [],
  varsayilan: () => ({}),
  komut: (b) => ({ tur: "genel_onarim", bolge: bolgeId(b) }),
  onizleme(b) {
    const sn = b.ic.param.sanayi;
    if (!sn) return [];
    const asinan = mevcutTesis(b).filter((t) => (t.asinma ?? 0) > 0);
    let p = 0;
    const toplam = new Map<number, number>();
    for (const t of asinan) {
      const T = b.ic.turler[t.tur];
      if (!T) continue;
      const oran = Math.round(((sn.olcekKademeleri[t.olcek ?? 0]?.insaPpm ?? 1_000_000) * sn.bakim.genelOnarimMaliyetPpm) / 1_000_000);
      p += Math.round((T.para * oran) / 1_000_000);
      for (const [m, q] of olcekle(T.maliyet, oran)) toplam.set(m, (toplam.get(m) ?? 0) + q);
    }
    const mal = [...toplam.entries()].sort((x, y) => x[0] - y[0]);
    return [
      { metin: `${asinan.length} tesis aşınmış (en çok %${Math.max(...asinan.map((t) => t.asinma ?? 0))})` },
      ...maliyetSatirlari(b, b.bolge, mal, p),
      { metin: `Durma: ${sureMetni(sn.bakim.genelOnarimDurusSaat)} (bu sürede aşınmış tesisler çalışmaz)` },
    ];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: genel onarım başladı`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: genel onarım yap`,
});

const aramaSondaji = tanim({
  id: "arama_sondaji",
  tur: "arama_sondaji",
  ad: "Arama sondajı",
  kapsam: "bolge",
  aciklama: "Ham madde damarı arar; başarılı olursa bölgenin rezervi büyür. Her mal için sınırlı keşif hakkı vardır.",
  gonder: "Sondaj yap",
  uygun(b) {
    if (!b.ic.sanayi) return "Sanayi katmanı kapalı";
    const o = ob(b);
    return b.ic.mallar.some((m, i) => m.kategori === "ham" && (o?.rezervIlk[i] ?? 0) > 0) ? null : "Bölgede ham madde damarı yok";
  },
  alanlar(b) {
    const o = ob(b);
    const hak = b.ic.param.sanayi?.damar.kesifHakkiBolgeMal ?? 0;
    const sec: Secenek[] = b.ic.mallar.flatMap((m, i): Secenek[] => {
      if (m.kategori !== "ham" || (o?.rezervIlk[i] ?? 0) <= 0) return [];
      const kalan = hak - (o?.kesif[i] ?? 0);
      return [{ deger: m.id, etiket: `${m.ad} — kalan hak ${kalan}`, ...(kalan <= 0 ? { devre: "Keşif hakkı bitti" } : {}) }];
    });
    return [{ tip: "secim", ad: "mal", etiket: "Ham madde", secenekler: sec }];
  },
  varsayilan: () => ({}),
  komut: (b, g) => (g["mal"] ? { tur: "arama_sondaji", bolge: bolgeId(b), mal: g["mal"] } : "Bir ham madde seçin."),
  onizleme(b) {
    const dp = b.ic.param.sanayi?.damar;
    if (!dp) return [];
    return [
      ...maliyetSatirlari(b, b.bolge, kayitMal(b.ic, dp.kesifMaliyetMal), dp.kesifMaliyetPara),
      sureSatiri(b, dp.kesifSureSaat),
      { metin: `Başarı olasılığı: %${Math.round(dp.kesifOlasilikPpm / 10000)}` },
    ];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: ${o.ic.mallar[o.ic.malIdx[k.mal] ?? -1]?.ad ?? k.mal} için arama sondajı başladı`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: ${o.ic.mallar[o.ic.malIdx[k.mal] ?? -1]?.ad ?? k.mal} için arama sondajı yap`,
});

/** Bölgenin tarım tanımı (tarım dışıysa null). */
const tarimBolgesi = (b: Baglam, i = b.bolge): boolean => b.dizin.tarim?.bolgeler[i] != null;

const ekimPlani = tanim({
  id: "ekim_plani",
  tur: "ekim_plani",
  ad: "Ekim planı",
  kapsam: "bolge",
  aciklama: "Ürün paylarını belirler (toplam %100). Buğday çok verir ama toprağı tüketir; baklagil ve nadas toprağı besler (ekim nöbeti).",
  gonder: "Planla",
  uygun: (b) => (!b.ic.tarim ? "Tarım katmanı kapalı" : !tarimBolgesi(b) ? "Bu bölge tarım dışı" : null),
  alanlar: (b) => [{ tip: "paylar", ad: "ekim", etiket: "Ürün payları (%)", kalemler: b.ic.urunler.map((u) => u.ad), toplam: 100 }],
  varsayilan(b) {
    const mevcut = b.kare.bolgeler[b.bolge]?.tarim?.[5] ?? [];
    return Object.fromEntries(b.ic.urunler.map((_, i) => [`ekim.${i}`, String(mevcut[i] ?? 0)]));
  },
  komut(b, g) {
    const paylar = b.ic.urunler.map((_, i) => tamSayi(g, `ekim.${i}`));
    if (paylar.some((p) => p === null || p < 0 || p > 100)) return "Paylar 0 ile 100 arasında tamsayı olmalı.";
    const toplam = (paylar as number[]).reduce((a, c) => a + c, 0);
    if (toplam !== 100) return `Ekim payları toplamı %100 olmalı (şu an %${toplam}).`;
    return { tur: "ekim_plani", bolge: bolgeId(b), ekimPpm: (paylar as number[]).map((p) => p * 10000) };
  },
  onizleme(b, g) {
    const toplam = b.ic.urunler.reduce((a, _, i) => a + (tamSayi(g, `ekim.${i}`) ?? 0), 0);
    return [
      { metin: `Toplam: %${toplam}${toplam === 100 ? "" : " — %100 olmalı"}`, durum: toplam === 100 ? "iyi" : "kotu" },
      ...b.ic.urunler.map((u) => ({ metin: `${u.ad}: çıktı %${u.cikti} · toprak ${u.toprak >= 0 ? "+" : "−"}${fmt1(Math.abs(u.toprak) / 10000)} puan/gün` })),
    ];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: ekim planı güncellendi (${o.ic.urunler.map((u, i) => `${u.ad} %${Math.round((k.ekimPpm[i] ?? 0) / 10000)}`).join(" · ")})`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: ekim planını güncelle (${o.ic.urunler.map((u, i) => `${u.ad} %${Math.round((k.ekimPpm[i] ?? 0) / 10000)}`).join(" · ")})`,
});

const gubreDozu = tanim({
  id: "gubre_dozu",
  tur: "gubre_dozu",
  ad: "Gübre dozu",
  kapsam: "bolge",
  aciklama: "Her doz toprağı besler ve çıktıyı artırır; tarım tesisleri gübre girdisi tüketir (bölgede gübre bulunmalı).",
  gonder: "Ayarla",
  uygun: (b) => (!b.ic.tarim ? "Tarım katmanı kapalı" : !tarimBolgesi(b) ? "Bu bölge tarım dışı" : null),
  alanlar: (b) => [
    { tip: "secim", ad: "doz", etiket: "Doz", secenekler: Array.from({ length: b.ic.azamiGubreDozu + 1 }, (_, i) => ({ deger: String(i), etiket: i === 0 ? "0 — gübre yok" : `${i}` })) },
  ],
  varsayilan: (b) => ({ doz: String(b.kare.bolgeler[b.bolge]?.tarim?.[3] ?? 0) }),
  komut: (b, g) => {
    const doz = tamSayi(g, "doz");
    return doz === null || doz < 0 || doz > b.ic.azamiGubreDozu ? `Doz 0 ile ${b.ic.azamiGubreDozu} arasında olmalı.` : { tur: "gubre_dozu", bolge: bolgeId(b), doz };
  },
  onizleme(b, g) {
    const t = b.ic.param.tarim;
    const doz = tamSayi(g, "doz") ?? 0;
    if (!t) return [];
    const tesis = ob(b)?.tarimTesisi ?? 0;
    return [
      { metin: `Gübre girdisi: ~${birim(t.gubreTuketimiSaat * doz * tesis)} birim/sa (${tesis} tarım tesisi)` },
      { metin: `Çıktı +%${fmt1((t.gubreCiktiEkiPpm * doz) / 10000)} · toprak +${fmt1((t.gubreToprakPpmGun * doz) / 10000)} puan/gün (gübre karşılandıkça)` },
    ];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: gübre dozu ${k.doz}`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: gübre dozunu ${k.doz} yap`,
});

const limanMi = (b: Baglam): boolean => b.dizin.bolgeler[b.bolge]?.etiketler.includes("liman") === true;

const ticaretEmri = tanim({
  id: "ticaret_emri",
  tur: "ticaret_emri",
  ad: "Ticaret emri",
  kapsam: "bolge",
  aciklama: "Limandan sürekli ihracat (satış) ya da ithalat (alış) emri. Oran 0 girilirse emir kaldırılır. Fiyat dünya referansıdır; makas ve liman primi ayrıca düşer.",
  gonder: "Emri ver",
  uygun: (b) => (limanMi(b) ? null : "Yalnızca liman bölgelerinde"),
  alanlar(b) {
    const mallar: Secenek[] = b.ic.mallar.flatMap((m): Secenek[] => (m.depolanabilir ? [{ deger: m.id, etiket: m.ad }] : [])).sort((x, y) => x.etiket.localeCompare(y.etiket, "tr"));
    return [
      { tip: "secim", ad: "mal", etiket: "Mal", secenekler: mallar },
      { tip: "secim", ad: "yon", etiket: "Yön", secenekler: [{ deger: "ihracat", etiket: "İhracat (sat)" }, { deger: "ithalat", etiket: "İthalat (satın al)" }] },
      { tip: "sayi", ad: "oran", etiket: "Oran", min: 0, max: 1_000_000, adim: 1, birim: "birim/sa" },
    ];
  },
  varsayilan(b) {
    const e = ob(b)?.emirler[0];
    return e ? { mal: b.ic.mallar[e[0]]?.id ?? "", yon: e[1] === 0 ? "ihracat" : "ithalat", oran: String(e[2]) } : { mal: b.ic.mallar.find((m) => m.depolanabilir)?.id ?? "", yon: "ihracat", oran: "10" };
  },
  komut(b, g) {
    const oran = sayiAl(g, "oran");
    if (!g["mal"]) return "Bir mal seçin.";
    if (!Number.isFinite(oran) || oran < 0 || oran > 1_000_000) return "Oran 0 ile 1.000.000 birim/sa arasında olmalı (0 emri kaldırır).";
    return { tur: "ticaret_emri", bolge: bolgeId(b), mal: g["mal"], yon: g["yon"] === "ithalat" ? "ithalat" : "ihracat", oranSaat: Math.round(oran * 1000) };
  },
  onizleme(b, g) {
    const mi = b.ic.malIdx[g["mal"] ?? ""];
    const mal = mi === undefined ? undefined : b.ic.mallar[mi];
    if (mi === undefined || !mal) return [];
    const oran = Math.max(0, sayiAl(g, "oran") || 0);
    const fiyat = (mal.taban / 1000) * ((b.kare.fiyat[mi] ?? 1000) / 1000);
    const ihr = g["yon"] !== "ithalat";
    const stok = b.kare.bolgeler[b.bolge]?.stok[mi] ?? 0;
    const hacim = ((ihr ? b.ic.param.pazar.emilimSaat[mal.id] : b.ic.param.pazar.arzSaat[mal.id]) ?? 0) / 1000;
    const s: OnizlemeSatiri[] = [
      { metin: `Dünya fiyatı: ${fmt1(fiyat)} para/birim (taban %${Math.round((b.kare.fiyat[mi] ?? 1000) / 10)}) · Dünya Piyasa Yapıcısı (NPC) makası ayrıca düşer` },
      { metin: `Saatlik değer ≈ ${fmt(oran * fiyat)} para (makas ve prim öncesi)` },
      { metin: `Dünya pazarı en çok ~${fmt(hacim)} birim/sa ${ihr ? "emer" : "sağlar"}` },
    ];
    if (ihr) s.push({ metin: `Bölge stoğu: ${fmt(stok)} birim${oran > 0 ? ` (≈ ${oran > 0 ? fmt1(stok / oran) : "—"} saat yeter)` : ""}`, durum: oran > 0 && stok / oran < 12 ? "uyari" : undefined });
    const var_ = ob(b)?.emirler.find((e) => e[0] === mi && e[1] === (ihr ? 0 : 1));
    if (var_) s.push({ metin: `Mevcut emir: ${fmt1(var_[2])} birim/sa (gerçekleşen ${fmt1(var_[3])})` });
    return s;
  },
  ozet: (k, o) => {
    const mal = o.ic.mallar[o.ic.malIdx[k.mal] ?? -1]?.ad ?? k.mal;
    const yon = k.yon === "ihracat" ? "ihracat" : "ithalat";
    return k.oranSaat === 0 ? `${bolgeAdiId(o, k.bolge)}: ${mal} ${yon} emri kaldırıldı` : `${bolgeAdiId(o, k.bolge)}: ${mal} ${yon} emri ${birim(k.oranSaat)} birim/sa olarak verildi`;
  },
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: ${o.ic.mallar[o.ic.malIdx[k.mal] ?? -1]?.ad ?? k.mal} ${k.yon} emri ver (${birim(k.oranSaat)} birim/sa)`,
});

const birlikUret = tanim({
  id: "birlik_uret",
  tur: "birlik_uret",
  ad: "Birlik üret",
  kapsam: "bolge",
  aciklama: "Bölge deposundaki mallarla birlik üretir; parti süre sonunda orduya katılır. Ordu ikmal ve maaş gideri doğurur.",
  gonder: "Üret",
  uygun: () => null,
  alanlar(b) {
    return [
      {
        tip: "secim",
        ad: "birlik",
        etiket: "Birlik türü",
        secenekler: b.ic.birlikler.map((u) => {
          const neden = gerekliTeknoloji(b, u.gerekliTeknoloji);
          return { deger: u.id, etiket: neden ? `${u.ad} — ${neden}` : `${u.ad} (güç ${u.guc})`, ...(neden ? { devre: neden } : {}) };
        }),
      },
      { tip: "sayi", ad: "adet", etiket: "Adet", min: 1, max: 100, adim: 1 },
    ];
  },
  varsayilan: (b) => ({ birlik: b.ic.birlikler.find((u) => !gerekliTeknoloji(b, u.gerekliTeknoloji))?.id ?? "", adet: "1" }),
  komut(b, g) {
    const adet = tamSayi(g, "adet");
    if (!g["birlik"]) return "Bir birlik türü seçin.";
    if (adet === null || adet < 1 || adet > 100) return "Adet 1 ile 100 arasında olmalı.";
    return { tur: "birlik_uret", bolge: bolgeId(b), birlik: g["birlik"], adet };
  },
  onizleme(b, g) {
    const u = b.ic.birlikler[b.ic.birlikIdx[g["birlik"] ?? ""] ?? -1];
    const adet = tamSayi(g, "adet") ?? 1;
    return u ? [...maliyetSatirlari(b, b.bolge, olcekle(u.maliyet, 1_000_000, adet), 0), sureSatiri(b, u.sureSaat)] : [];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: ${k.adet}× ${o.ic.birlikler[o.ic.birlikIdx[k.birlik] ?? -1]?.ad ?? k.birlik} üretimi başladı`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: ${k.adet}× ${o.ic.birlikler[o.ic.birlikIdx[k.birlik] ?? -1]?.ad ?? k.birlik} üret`,
});

const DURUS = [
  ["normal", "Normal"],
  ["savunma", "Savunma — savunma gücü artar"],
  ["geri_cekil", "Geri çekil — çatışmadan kaçınır"],
] as const;

const savunmaEmri = tanim({
  id: "savunma_emri",
  tur: "savunma_emri",
  ad: "Savunma duruşu",
  kapsam: "bolge",
  aciklama: "Bölgedeki ordunun duruşunu belirler. Duruş, çevrimdışıyken de geçerlidir.",
  gonder: "Ayarla",
  uygun: () => null,
  alanlar: () => [{ tip: "secim", ad: "durus", etiket: "Duruş", secenekler: DURUS.map(([d, e]) => ({ deger: d, etiket: e })) }],
  varsayilan: (b) => ({ durus: DURUS[b.kare.bolgeler[b.bolge]?.durus ?? 0]?.[0] ?? "normal" }),
  komut: (b, g) => ({ tur: "savunma_emri", bolge: bolgeId(b), durus: g["durus"] === "savunma" ? "savunma" : g["durus"] === "geri_cekil" ? "geri_cekil" : "normal" }),
  onizleme(b) {
    const ordu = b.kare.bolgeler[b.bolge]?.ordu ?? [];
    return [
      { metin: ordu.length ? `Ordu: ${ordu.map((o) => `${fmt(o[1])}× ${b.ic.birlikler[o[0]]?.ad ?? "?"}`).join(", ")}` : "Bu bölgede birlik yok; duruşun etkisi olmaz.", ...(ordu.length ? {} : { durum: "uyari" as const }) },
      { metin: `Savunma duruşunda savunma gücü ×${fmt1(b.ic.param.askeri.savunmaDurusuCarpaniPpm / 1_000_000)}` },
    ];
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.bolge)}: duruş "${DURUS.find((d) => d[0] === k.durus)?.[1].split(" — ")[0] ?? k.durus}" yapıldı`,
  eylem: (k, o) => `${bolgeAdiId(o, k.bolge)}: duruşu "${DURUS.find((d) => d[0] === k.durus)?.[1].split(" — ")[0] ?? k.durus}" yap`,
});

/** Seçili bölgeden saldırılabilecek komşu düşman bölgeler: [hedef indeks, devlet (oyuncu) indeksi]. */
function savasHedefleri(b: Baglam, saldiran = b.bolge): number[] {
  const hedefler = new Set<number>();
  for (const e of b.dizin.kenarlar) {
    const diger = e.a === saldiran ? e.b : e.b === saldiran ? e.a : -1;
    if (diger < 0) continue;
    const s = b.kare.bolgeler[diger]?.sahip ?? -1;
    if (s >= 0 && s !== b.ben.idx) hedefler.add(diger);
  }
  return [...hedefler].sort((x, y) => x - y);
}

/** Bir hedefe savaş ilanını engelleyen neden (yoksa undefined). */
export function savasNedeni(b: Baglam, saldiran: number, hedef: number): string | undefined {
  const sahip = b.kare.bolgeler[hedef]?.sahip ?? -1;
  const koruma = b.ben.koruma[sahip] ?? 0;
  if (koruma > b.kare.saat) return `${devletAdi(b.dizin, sahip)} yeni oyuncu korumasında (${sureMetni(koruma - b.kare.saat)} kaldı)`;
  const surenler = b.kare.savaslar.filter((s) => s.evre !== "bitti");
  if (surenler.some((s) => s.hedefBolge === hedef)) return "Hedef bölgede savaş sürüyor";
  if (surenler.some((s) => s.saldiranBolge === saldiran)) return "Bu bölge zaten bir savaşta saldıran";
  if (!(b.kare.bolgeler[saldiran]?.ordu.length ?? 0)) return "Saldıran bölgede birlik yok";
  return undefined;
}

const savasIlan = tanim({
  id: "savas_ilan",
  tur: "savas_ilan",
  ad: "Savaş ilan et",
  kapsam: "bolge",
  aciklama: "Komşu düşman bölgeye savaş ilan eder: hazırlık süresi, ardından savaş penceresi ve çözüm. Kayıp bir tavanla sınırlıdır.",
  gonder: "Savaş ilan et",
  uygun(b) {
    if (!(b.kare.bolgeler[b.bolge]?.ordu.length ?? 0)) return "Bu bölgede birlik yok";
    return savasHedefleri(b).length ? null : "Komşu düşman bölge yok";
  },
  alanlar(b) {
    const sec: Secenek[] = savasHedefleri(b).map((h) => {
      const neden = savasNedeni(b, b.bolge, h);
      const sahip = b.kare.bolgeler[h]?.sahip ?? -1;
      return { deger: b.dizin.bolgeler[h]?.id ?? "", etiket: `${b.bolgeAd(h)} (${devletAdi(b.dizin, sahip)})${neden ? ` — ${neden}` : ""}`, ...(neden ? { devre: neden } : {}) };
    });
    return [{ tip: "secim", ad: "hedef", etiket: "Hedef bölge", secenekler: sec }];
  },
  varsayilan: () => ({}),
  komut: (b, g) => (g["hedef"] ? { tur: "savas_ilan", saldiranBolge: bolgeId(b), hedefBolge: g["hedef"] } : "Savaş ilan edilebilecek bir hedef yok."),
  onizleme(b, g) {
    const a = b.ic.param.askeri;
    const h = bolgeIndeksi(b.dizin, g["hedef"] ?? "");
    const s: OnizlemeSatiri[] = [{ metin: `Hazırlık ${a.ilanHazirlikSaatMin}–${a.ilanHazirlikSaatMax} sa, sonra ${a.pencereSaat} sa savaş penceresi; kayıp tavanı %${Math.round(a.kayipTavaniPpm / 10000)}` }];
    const ben = b.ben.koruma[b.ben.idx] ?? 0;
    if (ben > b.kare.saat) s.push({ metin: `Sizin korumanız ${sureMetni(ben - b.kare.saat)} sürecek; savaş ilan ederseniz koruma biter`, durum: "uyari" });
    if (h >= 0) {
      const ordu = (l: Array<[number, number]>): string => l.map((o) => `${fmt(o[1])}× ${b.ic.birlikler[o[0]]?.ad ?? "?"}`).join(", ") || "yok";
      s.push({ metin: `Sizin ordunuz: ${ordu(b.kare.bolgeler[b.bolge]?.ordu ?? [])}` });
      s.push({ metin: `Hedefteki ordu: ${ordu(b.kare.bolgeler[h]?.ordu ?? [])}` });
    }
    return s;
  },
  ozet: (k, o) => `${bolgeAdiId(o, k.saldiranBolge)} → ${bolgeAdiId(o, k.hedefBolge)}: savaş ilan edildi`,
  eylem: (k, o) => `${bolgeAdiId(o, k.saldiranBolge)} → ${bolgeAdiId(o, k.hedefBolge)}: savaş ilan et`,
});

/** Yolun geliştirilememe nedeni (yoksa null). Darboğaz listesi ve bölge formu ortak kullanır. */
export function kenarNedeni(b: Baglam, k: number): string | null {
  const e = b.dizin.kenarlar[k];
  if (!e) return "Böyle bir yol yok";
  const sa = b.kare.bolgeler[e.a]?.sahip ?? -1;
  const sb = b.kare.bolgeler[e.b]?.sahip ?? -1;
  const ortak = new Set(b.ben.anlasmalar.filter((a) => a.tur === "ortak_altyapi" && a.aktif).map((a) => a.karsi));
  const tamam = (s: number): boolean => s >= 0 && (s === b.ben.idx || ortak.has(s));
  if (!tamam(sa) || !tamam(sb)) return "Yolun iki ucu da sizin (ya da ortak altyapı anlaşmalı bir devletin) olmalı";
  if (sa !== b.ben.idx && sb !== b.ben.idx) return "Yolun en az bir ucu sizin olmalı";
  if (e.tur === "deniz" && !b.ben.kararlar.includes("deniz_kenar_gelistir")) {
    const t = kararTeknolojisi(b.ic, "deniz_kenar_gelistir");
    return `Deniz yolu geliştirme kapalı${t ? ` (önce "${t}" araştırın)` : ""}`;
  }
  if (b.ben.insaatlar.some((i) => i.tur === "kenar" && i.hedef === k)) return "Bu yolda geliştirme sürüyor";
  return null;
}

/** Yol geliştirme maliyeti (maliyet yolun bana ait ilk ucundaki bölge stoğundan düşer). */
export function kenarMaliyeti(b: Baglam, k: number): { uc: number; mal: MalMiktar; para: number; saat: number } | null {
  const e = b.dizin.kenarlar[k];
  if (!e) return null;
  const uc = (b.kare.bolgeler[e.a]?.sahip ?? -1) === b.ben.idx ? e.a : e.b;
  const lp = b.ic.param.lojistik;
  return { uc, mal: kayitMal(b.ic, lp.gelistirmeMaliyeti), para: lp.gelistirmeParasi, saat: lp.gelistirmeSuresiSaat };
}

export function kenarOnizleme(b: Baglam, k: number): OnizlemeSatiri[] {
  const m = kenarMaliyeti(b, k);
  if (!m) return [];
  return [...maliyetSatirlari(b, m.uc, m.mal, m.para), sureSatiri(b, m.saat), { metin: `Kapasite +%${Math.round(b.ic.param.lojistik.gelistirmeArtisPpm / 10000)}` }];
}

const kenarKenari = (b: Baglam): number[] => b.dizin.kenarlar.flatMap((e, i) => (e.a === b.bolge || e.b === b.bolge ? [i] : []));

const kenarGelistir = tanim({
  id: "kenar_gelistir",
  tur: "kenar_gelistir",
  ad: "Yolu geliştir",
  kapsam: "bolge",
  aciklama: "Bölgeye bağlı bir lojistik yolunun kapasitesini artırır (darboğazları açmanın yolu). Maliyet yolun sizin ucundaki depodan düşer.",
  gonder: "Geliştir",
  uygun: (b) => (kenarKenari(b).length ? null : "Bölgenin yolu yok"),
  alanlar(b) {
    const sec: Secenek[] = kenarKenari(b).map((k) => {
      const e = b.dizin.kenarlar[k];
      const c = b.kare.kenarlar[k];
      const neden = kenarNedeni(b, k);
      const diger = e ? (e.a === b.bolge ? e.b : e.a) : 0;
      return { deger: String(k), etiket: `${b.bolgeAd(diger)} (${e?.tur ?? ""}, ${fmt1(c?.[0] ?? 0)}/sa, kullanım %${c && c[0] > 0 ? Math.round((c[1] / c[0]) * 100) : 0})${neden ? ` — ${neden}` : ""}`, ...(neden ? { devre: neden } : {}) };
    });
    return [{ tip: "secim", ad: "kenar", etiket: "Yol", secenekler: sec }];
  },
  varsayilan: () => ({}),
  komut: (_b, g) => (g["kenar"] ? { tur: "kenar_gelistir", kenar: Number(g["kenar"]) } : "Geliştirilebilecek bir yol yok."),
  onizleme: (b, g) => kenarOnizleme(b, Number(g["kenar"])),
  ozet: (k, o) => {
    const e = o.dizin.kenarlar[k.kenar];
    return e ? `${o.bolgeAd(e.a)} — ${o.bolgeAd(e.b)} yolunun geliştirilmesi başladı` : "Yol geliştirme başladı";
  },
  eylem: (k, o) => {
    const e = o.dizin.kenarlar[k.kenar];
    return e ? `${o.bolgeAd(e.a)} — ${o.bolgeAd(e.b)} yolunu geliştir (kapasite artar)` : "Yolu geliştir";
  },
});

// ---------------------------------------------------------------------------------------------
// Devlet komutları
// ---------------------------------------------------------------------------------------------

const vergiAyarla = tanim({
  id: "vergi_ayarla",
  tur: "vergi_ayarla",
  ad: "Vergi oranı",
  kapsam: "devlet",
  aciklama: "Nüfustan alınan vergi geliri. Eşiğin üstündeki vergi nüfus büyümesini keser.",
  gonder: "Ayarla",
  uygun: () => null,
  alanlar: () => [{ tip: "sayi", ad: "oran", etiket: "Vergi", min: 0, max: 100, adim: 1, birim: "%" }],
  varsayilan: (b) => ({ oran: String(Math.round(b.ben.vergiPpm / 10000)) }),
  komut(_b, g) {
    const o = tamSayi(g, "oran");
    return o === null || o < 0 || o > 100 ? "Vergi oranı %0 ile %100 arasında olmalı." : { tur: "vergi_ayarla", oranPpm: o * 10000 };
  },
  onizleme(b, g) {
    const o = tamSayi(g, "oran") ?? 0;
    const esik = Math.round(b.ic.param.ekonomi.vergiBuyumeEsigiPpm / 10000);
    let nufus = 0;
    for (const x of b.kare.bolgeler) if (x.sahip === b.ben.idx) nufus += x.nufus;
    const gelir = (nufus / 1000) * (b.ic.param.ekonomi.vergiTabani1000Saat / 1000) * (o / 100);
    return [
      { metin: `Tahmini vergi geliri: ~${fmt(gelir)} para/sa (${fmt(nufus)} nüfus)` },
      { metin: `Büyüme eşiği %${esik}${o > esik ? " — aştınız: nüfus büyümez" : ""}`, durum: o > esik ? "uyari" : undefined },
    ];
  },
  ozet: (k) => `Vergi oranı %${Math.round(k.oranPpm / 10000)} yapıldı`,
  eylem: (k) => `Vergi oranını %${Math.round(k.oranPpm / 10000)} yap`,
});

const BAKIM = ["Asgari — ucuz, aşınma hızlı", "Normal", "Yüksek — pahalı, aşınma azalır"];

const bakimDuzeyi = tanim({
  id: "bakim_duzeyi",
  tur: "bakim_duzeyi",
  ad: "Bakım düzeyi",
  kapsam: "devlet",
  aciklama: "Tüm tesislerin bakım girdisi ve aşınma hızı. Tasarruf mu, verim mi?",
  gonder: "Ayarla",
  uygun: (b) => (b.ic.sanayi ? null : "Sanayi katmanı kapalı"),
  alanlar(b) {
    const d = b.ic.param.sanayi?.bakim.duzeyler ?? [];
    return [{ tip: "secim", ad: "duzey", etiket: "Düzey", secenekler: BAKIM.map((e, i) => ({ deger: String(i), etiket: `${e}${d[i] ? ` (bakım gideri %${Math.round(d[i].girdiPpm / 10000)})` : ""}` })) }];
  },
  varsayilan: (b) => ({ duzey: String(b.ben.bakim ?? 1) }),
  komut: (_b, g) => {
    const d = tamSayi(g, "duzey");
    return d === 0 || d === 1 || d === 2 ? { tur: "bakim_duzeyi", duzey: d } : "Bir düzey seçin.";
  },
  ozet: (k) => `Bakım düzeyi: ${BAKIM[k.duzey]?.split(" — ")[0]}`,
  eylem: (k) => `Bakım düzeyini "${BAKIM[k.duzey]?.split(" — ")[0]}" yap`,
});

const askeriRezerv = tanim({
  id: "askeri_rezerv",
  tur: "askeri_rezerv",
  ad: "Askeri rezerv",
  kapsam: "devlet",
  aciklama: "Lojistik kapasitesinin askeri mallara (ikmal) ayrılan öncelikli payı. Yüksek rezerv sivil akışı daraltır.",
  gonder: "Ayarla",
  uygun: () => null,
  alanlar: () => [{ tip: "sayi", ad: "oran", etiket: "Rezerv", min: 0, max: 50, adim: 1, birim: "%" }],
  varsayilan: (b) => ({ oran: String(Math.round(b.ben.askeriRezervPpm / 10000)) }),
  komut(_b, g) {
    const o = tamSayi(g, "oran");
    return o === null || o < 0 || o > 50 ? "Askeri rezerv %0 ile %50 arasında olmalı." : { tur: "askeri_rezerv", oranPpm: o * 10000 };
  },
  ozet: (k) => `Askeri rezerv %${Math.round(k.oranPpm / 10000)} yapıldı`,
  eylem: (k) => `Askeri rezervi %${Math.round(k.oranPpm / 10000)} yap`,
});

/** Araştırma maliyeti/süresi (yayılım indirimi ve erken oyun hızlandırması dahil). */
function arastirmaMaliyeti(b: Baglam, ti: number): { para: number; saat: number } {
  const t = b.ic.teknolojiler[ti];
  const y = (b.ben.yayilim[ti] ?? 1000) / 1000;
  return { para: Math.round((t?.maliyet ?? 0) * y), saat: gercekSure(b, (t?.sureGun ?? 0) * 24 * y) };
}

function arastirmaNedeni(b: Baglam, ti: number): string | undefined {
  const t = b.ic.teknolojiler[ti];
  if (!t) return "Bilinmeyen teknoloji";
  if (b.ben.teknolojiler.includes(ti)) return "Zaten açık";
  const eksik = t.onKosullar.find((id) => !teknolojiVarMi(b, id));
  return eksik ? `Önkoşul: ${teknolojiAdi(b.ic, eksik)}` : undefined;
}

const arastir = tanim({
  id: "arastir",
  tur: "arastir",
  ad: "Araştır",
  kapsam: "devlet",
  aciklama: "Teknoloji yüzde artış vermez; yalnızca yeni yöntem, tesis, birlik ya da karar açar. Aynı anda tek araştırma sürer.",
  gonder: "Araştır",
  uygun(b) {
    if (b.ben.arastirma) {
      const t = b.ic.teknolojiler[b.ben.arastirma.teknoloji];
      return `Araştırma sürüyor: ${t?.ad ?? "?"} (${sureMetni(Math.max(0, b.ben.arastirma.bitis - b.kare.saat))} kaldı)`;
    }
    return b.ic.teknolojiler.some((t) => !arastirmaNedeni(b, t.indeks)) ? null : "Araştırılacak teknoloji kalmadı";
  },
  alanlar(b) {
    const sec: Secenek[] = b.ic.teknolojiler
      .filter((t) => !b.ben.teknolojiler.includes(t.indeks))
      .map((t) => {
        const neden = arastirmaNedeni(b, t.indeks);
        const m = arastirmaMaliyeti(b, t.indeks);
        return { deger: t.id, etiket: neden ? `${t.ad} — ${neden}` : `${t.ad} — ${para(m.para)} para · ${sureMetni(m.saat)}`, ...(neden ? { devre: neden } : {}) };
      });
    return [{ tip: "secim", ad: "teknoloji", etiket: "Teknoloji", secenekler: sec }];
  },
  varsayilan: () => ({}),
  komut: (_b, g) => (g["teknoloji"] ? { tur: "arastir", teknoloji: g["teknoloji"] } : "Bir teknoloji seçin."),
  onizleme(b, g) {
    const t = b.ic.teknolojiler[b.ic.teknolojiIdx[g["teknoloji"] ?? ""] ?? -1];
    if (!t) return [];
    const m = arastirmaMaliyeti(b, t.indeks);
    const s: OnizlemeSatiri[] = [{ metin: t.aciklama }, { metin: `Açar: ${t.acar.join(", ") || "—"}` }, { metin: `Para: ${para(m.para)} (hazine ${fmt(hazine(b))})`, durum: hazine(b) >= m.para / 1000 ? "iyi" : "kotu" }, { metin: `Süre: ${sureMetni(m.saat)}` }];
    if ((b.ben.yayilim[t.indeks] ?? 1000) < 1000) s.push({ metin: "Başka devletlerin bildiği teknoloji: maliyet ve süre indirimli" });
    return s;
  },
  ozet: (k, o) => `"${teknolojiAdi(o.ic, k.teknoloji)}" araştırması başladı`,
  eylem: (k, o) => `"${teknolojiAdi(o.ic, k.teknoloji)}" teknolojisini araştır`,
});

// --- Diplomasi ---

const ANLASMA = [
  ["ticaret", "Ticaret anlaşması — pazar makası düşer"],
  ["ortak_altyapi", "Ortak altyapı — birbirinizin yollarını kullanırsınız"],
] as const;

const digerleri = (b: Baglam): number[] => b.dizin.oyuncular.flatMap((_, i) => (i === b.ben.idx ? [] : [i]));
const anlasmaAdi = (t: string): string => ANLASMA.find((a) => a[0] === t)?.[1].split(" — ")[0] ?? t;
const oyuncuIdx = (d: Dizin, id: string): number => d.oyuncular.findIndex((o) => o.id === id);
export const anlasmaDurumu = (b: Baglam, karsi: number, tur: string) => b.ben.anlasmalar.find((a) => a.karsi === karsi && a.tur === tur);

const anlasmaTeklif = tanim({
  id: "anlasma_teklif",
  tur: "anlasma_teklif",
  ad: "Anlaşma teklif et",
  kapsam: "devlet",
  aciklama: "Karşı devlete anlaşma teklif eder; ikisi de teklif edince anlaşma yürürlüğe girer.",
  gonder: "Teklif et",
  uygun: () => null,
  alanlar(b) {
    return [
      { tip: "secim", ad: "karsi", etiket: "Devlet", secenekler: digerleri(b).map((i) => ({ deger: oyuncuId(b.dizin, i), etiket: devletAdi(b.dizin, i) })) },
      { tip: "secim", ad: "anlasma", etiket: "Anlaşma", secenekler: ANLASMA.map((a) => ({ deger: a[0], etiket: a[1] })) },
    ];
  },
  varsayilan: () => ({}),
  komut: (_b, g) => (g["karsi"] ? { tur: "anlasma_teklif", karsi: g["karsi"], anlasma: g["anlasma"] === "ortak_altyapi" ? "ortak_altyapi" : "ticaret" } : "Bir devlet seçin."),
  onizleme(b, g) {
    const a = anlasmaDurumu(b, oyuncuIdx(b.dizin, g["karsi"] ?? ""), g["anlasma"] ?? "ticaret");
    return [{ metin: a ? (a.aktif ? "Bu anlaşma zaten yürürlükte" : a.benTeklif ? "Teklifiniz gönderildi; karşı devlet de teklif edince başlar" : "Karşı devlet teklif etti; siz de teklif ederseniz başlar") : "Henüz teklif yok" }];
  },
  ozet: (k, o) => `${devletAdi(o.dizin, oyuncuIdx(o.dizin, k.karsi))} devletine ${anlasmaAdi(k.anlasma)} teklifi gönderildi`,
});

const anlasmaFeshet = tanim({
  id: "anlasma_feshet",
  tur: "anlasma_feshet",
  ad: "Anlaşmayı feshet",
  kapsam: "devlet",
  aciklama: "Yürürlükteki anlaşmayı ya da bekleyen teklifi geri çeker.",
  gonder: "Feshet",
  uygun: (b) => (b.ben.anlasmalar.length ? null : "Feshedilecek anlaşma ya da teklif yok"),
  alanlar(b) {
    return [
      {
        tip: "secim",
        ad: "anlasmaKarsi",
        etiket: "Anlaşma",
        secenekler: b.ben.anlasmalar.map((a) => ({ deger: `${oyuncuId(b.dizin, a.karsi)}|${a.tur}`, etiket: `${devletAdi(b.dizin, a.karsi)} — ${anlasmaAdi(a.tur)} (${a.aktif ? "yürürlükte" : "teklif aşamasında"})` })),
      },
    ];
  },
  varsayilan: () => ({}),
  komut(_b, g) {
    const [karsi, tur] = (g["anlasmaKarsi"] ?? "").split("|");
    return karsi && (tur === "ticaret" || tur === "ortak_altyapi") ? { tur: "anlasma_feshet", karsi, anlasma: tur } : "Feshedilecek bir anlaşma seçin.";
  },
  ozet: (k, o) => `${devletAdi(o.dizin, oyuncuIdx(o.dizin, k.karsi))} ile ${anlasmaAdi(k.anlasma)} feshedildi`,
});

const yaptirim = tanim({
  id: "yaptirim",
  tur: "yaptirim",
  ad: "Yaptırım",
  kapsam: "devlet",
  aciklama: "Bir devlete yaptırım uygular: o devletin pazar makası genişler. Yaptırımı istediğiniz zaman kaldırabilirsiniz.",
  gonder: "Uygula",
  uygun: () => null,
  alanlar(b) {
    return [
      { tip: "secim", ad: "hedef", etiket: "Devlet", secenekler: digerleri(b).map((i) => ({ deger: oyuncuId(b.dizin, i), etiket: `${devletAdi(b.dizin, i)}${b.ben.yaptirimBen.includes(i) ? " (yaptırımda)" : ""}` })) },
      { tip: "secim", ad: "aktif", etiket: "İşlem", secenekler: [{ deger: "1", etiket: "Yaptırım uygula" }, { deger: "0", etiket: "Yaptırımı kaldır" }] },
    ];
  },
  varsayilan: () => ({ aktif: "1" }),
  komut: (_b, g) => (g["hedef"] ? { tur: "yaptirim", hedef: g["hedef"], aktif: g["aktif"] !== "0" } : "Bir devlet seçin."),
  ozet: (k, o) => `${devletAdi(o.dizin, oyuncuIdx(o.dizin, k.hedef))}: yaptırım ${k.aktif ? "uygulandı" : "kaldırıldı"}`,
});

// ---------------------------------------------------------------------------------------------
// Kayıt
// ---------------------------------------------------------------------------------------------

/**
 * Sıra, arayüzdeki sıradır. `oyuncu_katil` bilinçli olarak yoktur (sistem komutu). Yeni bir çekirdek komutu
 * eklendiğinde buraya `tanim(...)` ekleyin; komut-arayüz eşleme testi eksiği bildirir.
 */
export const KOMUT_KAYDI: readonly KomutTanimi[] = [
  tesisInsa,
  yontemDegistir,
  olcekYukselt,
  genelOnarim,
  tesisDurum,
  aramaSondaji,
  ekimPlani,
  gubreDozu,
  ticaretEmri,
  birlikUret,
  savunmaEmri,
  savasIlan,
  kenarGelistir,
  vergiAyarla,
  bakimDuzeyi,
  askeriRezerv,
  arastir,
  anlasmaTeklif,
  anlasmaFeshet,
  yaptirim,
];

/** Bölge panelinde gösterilen formların sırası ve gruplanması. */
export const BOLGE_GRUPLARI: ReadonlyArray<{ ad: string; formlar: readonly string[] }> = [
  { ad: "İnşa ve üretim", formlar: ["tesis_insa", "yontem_degistir", "tesis_olcek_yukselt", "genel_onarim", "tesis_durum", "arama_sondaji"] },
  { ad: "Tarım", formlar: ["ekim_plani", "gubre_dozu"] },
  { ad: "Ticaret ve lojistik", formlar: ["ticaret_emri", "kenar_gelistir"] },
  { ad: "Ordu", formlar: ["birlik_uret", "savunma_emri", "savas_ilan"] },
];

/** Devlet sekmesinde gösterilen formlar. */
export const DEVLET_GRUPLARI: ReadonlyArray<{ ad: string; formlar: readonly string[] }> = [
  { ad: "Ekonomi", formlar: ["vergi_ayarla", "bakim_duzeyi", "askeri_rezerv"] },
  { ad: "Teknoloji", formlar: ["arastir"] },
  { ad: "Diplomasi", formlar: ["anlasma_teklif", "anlasma_feshet", "yaptirim"] },
];

const TUR_INDEKS = new Map(KOMUT_KAYDI.map((t) => [t.tur, t]));
const ID_INDEKS = new Map(KOMUT_KAYDI.map((t) => [t.id, t]));

export const komutTanimi = (id: string): KomutTanimi | undefined => ID_INDEKS.get(id);

/** Komutun Türkçe tek cümlelik özeti (bildirim metni, geçmiş zaman); kayıtta yoksa tür adı. */
export function komutOzeti(k: Komut, o: OzetBaglami): string {
  return TUR_INDEKS.get(k.tur)?.ozet(k, o) ?? k.tur;
}

/** Önerilen eylem metni (emir kipi: "Çiftlik kur"); `eylem` tanımlı değilse özet. */
export function eylemMetni(k: Komut, o: OzetBaglami): string {
  const t = TUR_INDEKS.get(k.tur);
  return t?.eylem ? t.eylem(k, o) : komutOzeti(k, o);
}

export type { Alan, Girdi };
