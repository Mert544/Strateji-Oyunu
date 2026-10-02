/** Sahibinin iç sevk planını ve hedefte uygulanmış gelen hızını ayrı gösteren saf görünüm. */
import { esc, paraMili, sayi, sureMetni, tarihSaatMetni } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";

/** Son çözümün planladığı akış; mal miktarı değil mili-birim/saat hızıdır. */
export interface LojistikAkisGorunumu {
  mal: string;
  kaynak: string;
  hedef: string;
  oranMiliSaat: number;
  /** Kaynaktan hedefe toplam yol süresi; kalan varış süresi değildir. */
  sureMs: number;
  /** Sunucunun bildirdiği tam rota bedeli; kaynak işletmenin mili-para/saat gideri. Yokluk bilinmiyor, 0 bilinen sıfır. */
  tasimaBedeliMiliSaat?: number;
  /** Son planda kullanılan gerçek hatların sırası; [] fiziksel hat gerektirmeyen il içi havuz, yokluk bilinmiyor. */
  yol?: readonly number[];
}

export interface LojistikKenarGorunumu {
  indeks: number;
  a: string;
  b: string;
  tur: "kara" | "deniz" | "hava";
  sureMs: number;
  kapasiteMiliSaat: number;
  /** Sahibinin bütün mallarının son plandaki iki yön yükü; dünya toplamı değildir. */
  kendiYukMiliSaat: number;
}

export interface LojistikPlanGorunumu {
  sonCozum: number;
  /** Yalnız sahibinin kendi kaynak ve hedefleri arasındaki akışlar. */
  akislar: readonly LojistikAkisGorunumu[];
  /** Bütün mallar ve sahipli kaynaklar için doğrulanmış toplam; seçili mal veya işletmenin toplamı değildir. */
  tasimaBedeliMiliSaat?: number;
  kenarlar?: readonly LojistikKenarGorunumu[];
  guncellemeBekliyor?: boolean;
  /** Kapasitenin alındığı gerçek kare zamanı; yükün plan zamanı sonCozum'dur. */
  kapasiteZamani?: number;
}

export interface LojistikBolgeGorunumu {
  id: string;
  ad: string;
  /** İç ağdan hedefe ulaşmış hız; NPC ithalatını içermez. Yokluk bilinmiyor, [] bilinen sıfır. */
  gelenOran?: ReadonlyArray<readonly [mal: string, miliSaat: number]>;
}

export interface LojistikGorunumParam {
  bolgeId: string;
  mal: string;
  bolgeler: readonly LojistikBolgeGorunumu[];
  /** Bütün sahipli kaynakların planı; yokluğu boş plan anlamına gelmez. */
  lojistik?: LojistikPlanGorunumu;
  /** Genel oyun merkezlerinin mevcut adları; işletme veya parsel adı değildir. */
  merkezAdi?: (id: string) => string;
}

const hiz = (miliSaat: number): string => `${sayi(miliSaat / 1000, 3)} birim/saat`;
const HAT_TURU = { kara: "Kara", deniz: "Deniz", hava: "Hava" } as const;

/** Sürekli iç sevk oranlarını gösterir; rota başına varış zamanı veya ilerleme türetmez. */
export function lojistikGorunumuHtml(p: LojistikGorunumParam): string {
  let h = `<section class="lg-panel" aria-label="Seçili malın iç sevkiyatı"><h4>${ikon("truck", 18)} İç sevkiyat</h4>`;
  const secili = p.bolgeler.find((b) => b.id === p.bolgeId);
  if (!secili) return h + '<p class="ipucu-metin">Seçilen işletmenin lojistik bilgisi bulunamadı.</p></section>';
  const adlar = new Map(p.bolgeler.map((b) => [b.id, b.ad]));
  const bolgeAdi = (id: string): string => adlar.get(id) ?? id;
  const kenarlar = p.lojistik?.kenarlar === undefined ? undefined : new Map(p.lojistik.kenarlar.map((k) => [k.indeks, k]));
  const merkezAdi = (id: string): string => {
    const ad = p.merkezAdi?.(id);
    return ad && ad !== id ? ad : "Adı alınmamış merkez";
  };
  const yolHtml = (a: LojistikAkisGorunumu): string => {
    const anahtar = esc(JSON.stringify([a.mal, a.kaynak, a.hedef, a.yol ?? null]));
    let s = `<details class="lg-yol" data-yol="${anahtar}"><summary>Yol ve kapasite</summary>`;
    if (a.yol === undefined) return s + '<p class="lg-bos">Yol bilgisi henüz alınmadı.</p></details>';
    if (a.yol.length === 0) return s + '<p class="ipucu-metin">İl içi ortak havuz aktarımı; fiziksel taşıma hattı kullanılmıyor.</p></details>';
    if (kenarlar === undefined) return s + '<p class="lg-bos">Yolun hat ve kapasite bilgisi henüz alınmadı.</p></details>';
    const plan = p.lojistik!;
    s += `<p class="lg-yol-zaman">Sevk planı: ${esc(tarihSaatMetni(plan.sonCozum / 3_600_000))}. Kapasite bilgisi: ${plan.kapasiteZamani === undefined ? "zamanı alınmadı" : esc(tarihSaatMetni(plan.kapasiteZamani / 3_600_000))}.</p>`;
    if (plan.guncellemeBekliyor) s += '<p class="lg-yol-bekleme">Sevk planı yenilenmeyi bekliyor. Gösterilen yük son plana aittir.</p>';
    s += '<ol class="lg-bacaklar">';
    for (const indeks of a.yol) {
      const k = kenarlar.get(indeks);
      if (k === undefined) { s += '<li><p class="lg-bos">Bu bağlantının bilgisi henüz alınmadı.</p></li>'; continue; }
      s += `<li><p class="lg-hat">${esc(merkezAdi(k.a))} <span aria-label="iki yönlü bağlantı">↔</span> ${esc(merkezAdi(k.b))}</p><p class="lg-hat-tur">${HAT_TURU[k.tur]} · ${esc(sureMetni(k.sureMs / 3_600_000))}</p><dl class="lg-kapasite"><div><dt>Son planda kendi yükün</dt><dd>${esc(hiz(k.kendiYukMiliSaat))}</dd></div><div><dt>Güncel toplam kapasite</dt><dd>${esc(hiz(k.kapasiteMiliSaat))}</dd></div></dl></li>`;
    }
    return s + '</ol><p class="ipucu-metin">Hat kapasitesi iki yönde ortaktır. Kendi yükün bütün malların iki yöndeki sevk toplamıdır; başka oyuncuların kullanımını içermez.</p></details>';
  };
  const gelen = secili.gelenOran?.find(([mal]) => mal === p.mal)?.[1];
  const ulasan = secili.gelenOran === undefined ? undefined : gelen ?? 0;
  const akislar = p.lojistik?.akislar.filter((a) => a.mal === p.mal && a.oranMiliSaat > 0);
  const gelenPlan = akislar?.filter((a) => a.hedef === p.bolgeId);
  const cikanPlan = akislar?.filter((a) => a.kaynak === p.bolgeId);
  const toplam = (liste: readonly LojistikAkisGorunumu[] | undefined): number | undefined => liste?.reduce((t, a) => t + a.oranMiliSaat, 0);
  const ozet = (ad: string, oran: number | undefined, sinif = ""): string => `<div${sinif ? ` class="${sinif}"` : ""}><dt>${ad}</dt><dd>${oran === undefined ? "Bilgi bekleniyor" : esc(hiz(oran))}</dd></div>`;
  h += `<p class="lg-bolge">${ikon("map-pin", 14)} ${esc(secili.ad)} · seçili mal</p><dl class="lg-ozet">`;
  h += ozet("Planlanan gelen sevk", toplam(gelenPlan));
  h += ozet("Ulaşmış gelen hız", ulasan, "lg-ulasan");
  h += ozet("Planlanan çıkan sevk", toplam(cikanPlan)) + "</dl>";
  h += '<p class="ipucu-metin">Planlanan sevk, işletmelerin arasında gönderilen saatlik miktardır. Ulaşmış gelen hız, bu işletmeye iç ağdan ulaşan toplamdır; pazar ithalatı ayrı gösterilir.</p>';
  if (akislar === undefined) return h + '<p class="lg-bos" role="status">İç sevk planı henüz alınmadı.</p></section>';
  const listeHtml = (baslik: string, liste: readonly LojistikAkisGorunumu[]): string => {
    if (!liste.length) return "";
    let s = `<section class="lg-yon"><h5>${baslik}</h5><ul class="lg-akislar">`;
    for (const a of liste) {
      const bedel = a.tasimaBedeliMiliSaat === undefined
        ? '<span class="lg-bedel-bilinmiyor">Bedel bilinmiyor</span>'
        : `${esc(paraMili(a.tasimaBedeliMiliSaat, "yukari"))}/saat`;
      s += `<li><div class="lg-rota"><span>${esc(bolgeAdi(a.kaynak))}</span>${ikon("chevron-right", 14)}<span>${esc(bolgeAdi(a.hedef))}</span></div><dl class="lg-akis-veri"><div><dt>Planlanan sevk</dt><dd>${esc(hiz(a.oranMiliSaat))}</dd></div><div><dt>Toplam yol süresi</dt><dd>${esc(sureMetni(a.sureMs / 3_600_000))}</dd></div><div class="lg-bedel"><dt>Taşıma hizmeti bedeli</dt><dd>${bedel}</dd></div></dl>${yolHtml(a)}</li>`;
    }
    return s + "</ul></section>";
  };
  if (!gelenPlan?.length && !cikanPlan?.length) h += '<p class="lg-bos">Bu mal için bu işletmeye bağlı iç sevk planı yok.</p>';
  h += listeHtml("Planlanan gelen sevkler", gelenPlan ?? []);
  h += listeHtml("Planlanan çıkan sevkler", cikanPlan ?? []);
  if (gelenPlan?.length || cikanPlan?.length) h += '<p class="ipucu-metin">Taşıma bedeli kaynak işletmenin saatlik gideridir. Geçmiş ödeme toplamı değildir; pazar ithalatı ve şebeke gideri ayrıca gösterilir.</p>';
  h += '<p class="ipucu-metin">Yol süresi, güzergâhın toplam taşıma süresidir. Sevk planı değiştiğinde ulaşmış hız gecikmeyle değişebilir; sevk durmuş olsa bile önceki akışın gelişi sürebilir.</p>';
  return h + "</section>";
}
