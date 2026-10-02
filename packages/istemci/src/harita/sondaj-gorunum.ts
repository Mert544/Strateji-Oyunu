/** Sunucunun kendi sondaj teklifini, işini ve sonucunu gösteren saf görünüm. */
import { esc, paraMili, sayi, sureMetni, tarihSaatMetni, yuzde } from "../arayuz/bicim";
import type { SondajGorunumu, SondajIsGorunumu, SondajTeklifi } from "./baglanti";

export interface SondajGorunumParam {
  mal: string;
  kaynaklar?: readonly { bolge: string; il: string; sondaj?: SondajGorunumu }[];
  isler?: readonly SondajIsGorunumu[];
  onay: Readonly<{ bolge: string; mal: string; gorulenTeklif: SondajTeklifi }> | null;
  bekliyor: boolean;
  destek: boolean;
  degisti: boolean;
  hata?: string;
  sonuc?: string;
  acikDetaylar?: ReadonlySet<string>;
  bolgeAdi?: (bolge: string, il: string) => string;
  malAdi?: (mal: string) => string;
}

/** Mevcut core engelleri kullanıcıya aktarılır; teknik kimlikler gösterilmez. */
export function sondajEngelMetni(raw: string): string {
  if (raw.startsWith("yetersiz stok")) return "Bu ildeki işletme deposunda sondaj malzemesi yetersiz.";
  if (raw.startsWith("yetersiz hazine")) return "Hazinen sondaj bedelini karşılamıyor.";
  if (raw.startsWith("kesif hakki bitti")) return "Bu işletmede bu kaynak için keşif hakların tükenmiş.";
  if (raw.startsWith("bolgede bu malda damar yok")) return "Bu işletmede seçili kaynak için sondaj yapılabilecek damar bulunmuyor.";
  if (raw.startsWith("tarim rezervinde sondaj yapilamaz")) return "Yenilenen tarımsal kaynaklarda sondaj yapılmaz.";
  if (raw.startsWith("sondaj yalniz ham mallarda yapilir")) return "Bu mal için maden sondajı yapılamıyor.";
  if (raw.startsWith("sondaj teklifi degisti")) return "Sondaj teklifi değişmiş. Güncel bedeli ve hakkı yeniden incele.";
  return "Bu işletmede sondaj şu anda başlatılamıyor.";
}

function teklifHtml(t: SondajTeklifi, p: SondajGorunumParam, detayAnahtari: string): string {
  let h = '<dl class="sdj-bedel">';
  h += `<div><dt>Ödeme</dt><dd>${paraMili(t.paraMili, "yukari")}</dd></div>`;
  h += `<div><dt>Kullanılmış keşif hakkı</dt><dd>${esc(sayi(t.kullanilanHak))} / ${esc(sayi(t.hakTavani))}</dd></div>`;
  h += `<div><dt>Güncel süre tahmini</dt><dd>${esc(sureMetni(t.sureMs / 3_600_000))}</dd></div>`;
  h += `<div><dt>Başarı olasılığı</dt><dd>${esc(yuzde(t.olasilikPpm / 10_000, 2))}</dd></div></dl>`;
  h += `<details class="sdj-ayrinti" data-sondaj-detay="${esc(detayAnahtari)}"${p.acikDetaylar?.has(detayAnahtari) ? " open" : ""}><summary>Malzemeler ve keşif koşulları</summary>`;
  if (t.malMaliyeti.length > 0) {
    h += '<ul class="sdj-mallar" aria-label="Depodan kullanılacak sondaj malzemeleri">';
    for (const [mal, miktar] of t.malMaliyeti) h += `<li><span>${esc(p.malAdi?.(mal) ?? mal)}</span><span>${esc(sayi(miktar / 1000, 3))} birim</span></li>`;
    h += '</ul>';
  } else h += '<p class="sdj-bilgi">Bu teklifte sondaj malzemesi gerekmiyor.</p>';
  h += `<p class="sdj-bilgi">Başarı halinde, tamamlanma anındaki başlangıç rezervinin ${esc(yuzde(t.ekMinPpm / 10_000, 2))}–${esc(yuzde(t.ekMaxPpm / 10_000, 2))} oranında rezerv eklenebilir. Miktar garanti değildir; cevher deposuna stok eklenmez.</p>`;
  h += `<p class="sdj-bilgi">Temel süre ${esc(sureMetni(t.temelSureMs / 3_600_000))}. Süre tahmini değişebilir; kesin bitiş sondaj başladıktan sonra gösterilir. Başlatmada ödeme, malzemeler ve bir keşif hakkı kullanılır; başarısızlık ihtimali vardır. Beklerken kurallar değişirse tamamlanma anındaki kurallar uygulanır.</p></details>`;
  return h;
}

function islerHtml(p: SondajGorunumParam): string {
  const detayAnahtari = JSON.stringify(["kayit", p.mal]);
  let h = `<details class="sdj-ayrinti sdj-isler" data-sondaj-detay="${esc(detayAnahtari)}"${p.acikDetaylar?.has(detayAnahtari) ? " open" : ""}><summary>Kayıtlı sondajlar</summary>`;
  if (p.isler === undefined) h += '<p class="sdj-bilgi">Sondaj işlerinin güncel kaydı sunucudan bekleniyor.</p>';
  else {
    const isler = p.isler.filter((i) => i.mal === p.mal);
    if (isler.length === 0) h += '<p class="sdj-bilgi">Bu mal için kayıtlı sondaj bulunmuyor.</p>';
    for (const is of isler) {
      const kaynak = p.kaynaklar?.find((k) => k.bolge === is.bolge);
      const ad = kaynak ? p.bolgeAdi?.(kaynak.bolge, kaynak.il) ?? kaynak.il : "Önceki işletme";
      h += `<article class="sdj-is"><h6>${esc(ad)} · Deneme #${esc(sayi(is.deneme))}</h6>`;
      if (is.evre === "suruyor") h += `<p class="sdj-bilgi">Sondaj sürüyor · Kaydedilen bitiş: ${esc(tarihSaatMetni(is.bitis / 3_600_000))}.</p>`;
      else if (is.sonuc === undefined) h += '<p class="sdj-bilgi">Sondaj tamamlanmış; sonuç kaydı henüz alınmadı.</p>';
      else {
        const sonuc = is.sonuc.neden === "sanayi_kapali" ? "Sondaj tamamlanamadı: sanayi koşulları geçerli değil." : is.sonuc.basarili ? "Keşif başarılı." : "Keşif başarısız.";
        h += `<p class="sdj-sonuc">${sonuc} Kaynağa eklenen rezerv: ${esc(sayi(is.sonuc.ekMili / 1000, 3))} birim.</p>`;
        h += `<p class="sdj-bilgi">Tamamlanma: ${esc(tarihSaatMetni(is.bitis / 3_600_000))}. Bu miktar depo stoğu değildir.</p>`;
      }
      h += '</article>';
    }
  }
  return h + '<p class="sdj-bilgi">Bekleyen kayıtlar ve son tamamlanan işler gösterilir. Eski sondajların sonuç kaydı bulunmayabilir.</p></details>';
}

/** Hedef, maliyet veya sonuç hesaplamaz; yalnız gerçek sunucu kayıtlarını biçimler. */
export function sondajGorunumuHtml(p: SondajGorunumParam): string {
  let h = `<section class="sdj-panel" aria-label="Kendi işletmelerinde kaynak keşfi"><h4>${esc(p.malAdi?.(p.mal) ?? p.mal)} · Keşif sondajı</h4>`;
  if (p.sonuc) h += `<p class="sdj-sonuc" role="status">${esc(p.sonuc)}</p>`;
  if (p.kaynaklar === undefined) h += '<p class="sdj-bilgi">İşletmelerin sondaj teklifleri sunucudan bekleniyor.</p>';
  else if (p.kaynaklar.length === 0) h += '<p class="sdj-bilgi">Henüz kendi il işletmen bulunmuyor.</p>';
  for (const k of p.kaynaklar ?? []) {
    const teklif = k.sondaj?.teklifler.find((x) => x.teklif.mal === p.mal);
    if (k.sondaj !== undefined && teklif === undefined) continue;
    const b = esc(k.bolge), m = esc(p.mal);
    h += `<article class="sdj-kaynak"><h5 data-sondaj-baslik data-bolge="${b}" data-mal="${m}" tabindex="-1">${esc(p.bolgeAdi?.(k.bolge, k.il) ?? k.il)}</h5>`;
    if (teklif === undefined) h += '<p class="sdj-bilgi">Bu işletmenin güncel sondaj bilgisi henüz alınmadı.</p>';
    else {
      h += teklifHtml(teklif.teklif, p, JSON.stringify(["teklif", k.bolge, p.mal]));
      const token = esc(JSON.stringify({ bolge: k.bolge, mal: p.mal, gorulenTeklif: teklif.teklif }));
      const uygun = teklif.uygun && p.destek && !p.bekliyor && p.onay === null;
      h += `<button type="button" class="sdj-dugme" data-sondaj-eylem="ac" data-bolge="${b}" data-mal="${m}" data-sondaj-onayi="${token}" aria-haspopup="dialog"${uygun ? "" : " disabled"}>Sondajı incele</button>`;
      if (teklif.engel) h += `<p class="sdj-bilgi">${esc(sondajEngelMetni(teklif.engel))}</p>`;
      if (!p.destek) h += '<p class="sdj-bilgi">Bu bağlantıda sondaj başlatılamıyor.</p>';
    }
    h += '</article>';
  }
  if (p.onay) {
    const o = p.onay;
    const kaynak = p.kaynaklar?.find((k) => k.bolge === o.bolge);
    const canli = kaynak?.sondaj?.teklifler.find((x) => x.teklif.mal === o.mal);
    const engel = !p.destek || !canli || !canli.uygun || p.degisti || p.mal !== o.mal;
    const ad = kaynak ? p.bolgeAdi?.(kaynak.bolge, kaynak.il) ?? kaynak.il : "İşletme";
    const baslik = `sdj-onay-${encodeURIComponent(o.bolge)}-${encodeURIComponent(o.mal)}`;
    h += `<div class="sdj-onay" data-sondaj-onay data-bolge="${esc(o.bolge)}" data-mal="${esc(o.mal)}" role="alertdialog" aria-labelledby="${esc(baslik)}" aria-busy="${p.bekliyor}"><h5 id="${esc(baslik)}">${esc(ad)} · ${esc(p.malAdi?.(o.mal) ?? o.mal)} sondajını onayla</h5>`;
    h += teklifHtml(o.gorulenTeklif, p, JSON.stringify(["onay", o.bolge, o.mal]));
    h += '<p class="sdj-bilgi">Ödeme hazinenden, malzemeler bu ildeki işletme deposundan alınır. Bir keşif hakkı başlatmada kullanılır.</p>';
    if (p.degisti || p.mal !== o.mal) h += '<p class="sdj-hata" role="alert">Görülen sondaj teklifi veya kaynak seçimi değişmiş. Vazgeçip güncel teklifi incele.</p>';
    else if (engel) h += `<p class="sdj-hata" role="alert">${esc(canli?.engel ? sondajEngelMetni(canli.engel) : "Güncel sondaj uygunluğu alınmadan işlem yapılamıyor.")}</p>`;
    if (p.hata) h += `<p class="sdj-hata" role="alert">${esc(p.hata)}</p>`;
    if (p.bekliyor) h += '<p class="sdj-bilgi" role="status">Sunucu yanıtı bekleniyor.</p>';
    const token = esc(JSON.stringify(o));
    h += `<div class="sdj-eylemler"><button type="button" class="sdj-dugme" data-sondaj-eylem="vazgec" data-bolge="${esc(o.bolge)}" data-mal="${esc(o.mal)}" data-sondaj-varsayilan-odak="1"${p.bekliyor ? " disabled" : ""}>Vazgeç</button><button type="button" class="sdj-dugme sdj-onayla" data-sondaj-eylem="onayla" data-bolge="${esc(o.bolge)}" data-mal="${esc(o.mal)}" data-sondaj-onayi="${token}"${p.bekliyor || engel ? " disabled" : ""}>Sondajı başlat</button></div></div>`;
  } else if (p.hata) h += `<p class="sdj-hata" role="alert">${esc(p.hata)}</p>`;
  return h + islerHtml(p) + '</section>';
}
