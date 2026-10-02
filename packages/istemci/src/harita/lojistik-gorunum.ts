/** Sahibinin iç sevk planını ve hedefte uygulanmış gelen hızını ayrı gösteren saf görünüm. */
import { esc, paraMili, sayi, sureMetni } from "../arayuz/bicim";
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
}

export interface LojistikPlanGorunumu {
  sonCozum: number;
  /** Yalnız sahibinin kendi kaynak ve hedefleri arasındaki akışlar. */
  akislar: readonly LojistikAkisGorunumu[];
  /** Bütün mallar ve sahipli kaynaklar için doğrulanmış toplam; seçili mal veya işletmenin toplamı değildir. */
  tasimaBedeliMiliSaat?: number;
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
}

const hiz = (miliSaat: number): string => `${sayi(miliSaat / 1000, 3)} birim/saat`;

/** Sürekli iç sevk oranlarını gösterir; rota başına varış zamanı veya ilerleme türetmez. */
export function lojistikGorunumuHtml(p: LojistikGorunumParam): string {
  let h = `<section class="lg-panel" aria-label="Seçili malın iç sevkiyatı"><h4>${ikon("truck", 18)} İç sevkiyat</h4>`;
  const secili = p.bolgeler.find((b) => b.id === p.bolgeId);
  if (!secili) return h + '<p class="ipucu-metin">Seçilen işletmenin lojistik bilgisi bulunamadı.</p></section>';
  const adlar = new Map(p.bolgeler.map((b) => [b.id, b.ad]));
  const bolgeAdi = (id: string): string => adlar.get(id) ?? id;
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
      s += `<li><div class="lg-rota"><span>${esc(bolgeAdi(a.kaynak))}</span>${ikon("chevron-right", 14)}<span>${esc(bolgeAdi(a.hedef))}</span></div><dl class="lg-akis-veri"><div><dt>Planlanan sevk</dt><dd>${esc(hiz(a.oranMiliSaat))}</dd></div><div><dt>Toplam yol süresi</dt><dd>${esc(sureMetni(a.sureMs / 3_600_000))}</dd></div><div class="lg-bedel"><dt>Taşıma hizmeti bedeli</dt><dd>${bedel}</dd></div></dl></li>`;
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
