/** Kendi il işletmesinin sunucu onarım teklifi ve ayrı onayı (saf görünüm). */
import { esc, paraMili, sayi, simSaatMetni, sureMetni } from "../arayuz/bicim";
import type { GenelOnarimGorunumu, GenelOnarimTeklifi } from "./baglanti";

export interface OnarimGorunumParam {
  kaynaklar?: readonly { bolge: string; il: string; onarim?: GenelOnarimGorunumu }[];
  onay: Readonly<{ bolge: string; gorulenTeklif: GenelOnarimTeklifi }> | null;
  bekliyor: boolean;
  destek: boolean;
  degisti: boolean;
  hata?: string;
  sonuc?: string;
  bolgeAdi?: (bolge: string, il: string) => string;
  tesisAdi?: (tesis: GenelOnarimTeklifi["tesisler"][number], bolge: string) => string;
  malAdi?: (mal: string) => string;
}

const OLCEK = ["S", "M", "L"] as const;

/** Sunucunun mevcut onarım engelini kullanıcı metnine çevirir. */
export function onarimEngelMetni(raw: string): string {
  if (raw.startsWith("yetersiz stok")) return "Bu ildeki işletme deposunda onarım malzemesi yetersiz.";
  if (raw.startsWith("yetersiz hazine")) return "Hazinen onarım bedelini karşılamıyor.";
  if (raw.startsWith("bolgede onarim suruyor")) return "Bu işletmede onarım zaten sürüyor.";
  if (raw.startsWith("onarilacak asinma yok")) return "Bu işletmede onarılacak aşınma bulunmuyor.";
  return "Bu işletmede genel onarım şu anda başlatılamıyor.";
}

function teklifHtml(t: GenelOnarimTeklifi, bolge: string, p: OnarimGorunumParam): string {
  let h = '<ul class="onr-hedefler" aria-label="Onarılacak tesisler">';
  for (const tesis of t.tesisler) {
    const ad = p.tesisAdi?.(tesis, bolge) ?? tesis.tur;
    h += `<li><span>${esc(ad)}</span><span>Tesis #${esc(tesis.tesis)} · ${esc(OLCEK[tesis.olcek] ?? "Bilinmiyor")}</span></li>`;
  }
  h += '</ul><dl class="onr-bedel">';
  h += `<div><dt>Toplam ödeme</dt><dd>${paraMili(t.paraMili, "yukari")}</dd></div>`;
  h += `<div><dt>Üretim duruşu</dt><dd>${esc(sureMetni(t.durusMs / 3_600_000))}</dd></div></dl>`;
  if (t.mal.length > 0) {
    h += '<ul class="onr-mallar" aria-label="Depodan kullanılacak onarım malzemeleri">';
    for (const [mal, miktar] of t.mal) h += `<li><span>${esc(p.malAdi?.(mal) ?? mal)}</span><span>${esc(sayi(miktar / 1000, 3))} birim</span></li>`;
    h += '</ul>';
  } else h += '<p class="onr-bilgi">Bu teklifte onarım malzemesi gerekmiyor.</p>';
  return h;
}

/** Ücret veya hedef üretmez; yalnız sunucunun teklifi, canlı uygunluğu ve donmuş onayını gösterir. */
export function onarimGorunumuHtml(p: OnarimGorunumParam): string {
  let h = '<section class="onr-panel" aria-label="Kendi işletmelerinin genel onarımı"><h4>Genel onarım</h4><p class="onr-bilgi">Her il işletmesinin aşınmış tesislerinin tamamına uygulanır; üretimi kapalı tesisler de kapsama girer.</p>';
  if (p.sonuc) h += `<p class="onr-sonuc" role="status">${esc(p.sonuc)}</p>`;
  if (p.kaynaklar === undefined) h += '<p class="onr-bilgi">İşletmelerin onarım bilgisi sunucudan bekleniyor.</p>';
  else if (p.kaynaklar.length === 0) h += '<p class="onr-bilgi">Henüz kendi il işletmen bulunmuyor.</p>';
  for (const kaynak of p.kaynaklar ?? []) {
    const b = esc(kaynak.bolge);
    const ad = p.bolgeAdi?.(kaynak.bolge, kaynak.il) ?? kaynak.il;
    const g = kaynak.onarim;
    h += `<article class="onr-kaynak" data-onarim-kaynak="${b}"><h5 data-onarim-baslik data-bolge="${b}" tabindex="-1">${esc(ad)}</h5>`;
    if (g === undefined) h += '<p class="onr-bilgi">Bu işletmenin güncel onarım bilgisi henüz alınmadı.</p>';
    else {
      if (g.suruyor) h += `<p class="onr-durus" role="status">Onarım sürüyor · Kaydedilen bitiş: ${esc(simSaatMetni(g.suruyor.bitis / 3_600_000))}. ${esc(g.suruyor.tesisler.length)} tesis onarımda.</p>`;
      if (g.teklif) {
        h += teklifHtml(g.teklif, kaynak.bolge, p);
        const uygun = g.uygun && !g.suruyor && p.destek && !p.bekliyor && p.onay === null;
        const onay = esc(JSON.stringify({ bolge: kaynak.bolge, gorulenTeklif: g.teklif }));
        h += `<button type="button" class="onr-dugme" data-onarim-eylem="ac" data-bolge="${b}" data-onarim-onayi="${onay}" aria-haspopup="dialog"${uygun ? "" : " disabled"}>Onarımı incele</button>`;
      }
      if (g.engel) h += `<p class="onr-bilgi">${esc(onarimEngelMetni(g.engel))}</p>`;
      else if (!g.teklif && !g.suruyor) h += '<p class="onr-bilgi">Bu işletmede onarım teklifi bulunmuyor.</p>';
      if (!p.destek) h += '<p class="onr-bilgi">Bu bağlantıda onarım başlatılamıyor.</p>';
    }
    h += '</article>';
  }
  if (p.onay) {
    const o = p.onay;
    const kaynak = p.kaynaklar?.find((k) => k.bolge === o.bolge);
    const ad = kaynak ? p.bolgeAdi?.(o.bolge, kaynak.il) ?? kaynak.il : "İşletme";
    const canli = kaynak?.onarim;
    const engel = !p.destek || !canli || !canli.uygun || !!canli.suruyor || p.degisti;
    const baslik = `onr-onay-${encodeURIComponent(o.bolge)}`;
    h += `<div class="onr-onay" data-onarim-onay data-bolge="${esc(o.bolge)}" role="alertdialog" aria-labelledby="${esc(baslik)}" aria-busy="${p.bekliyor}"><h5 id="${esc(baslik)}">${esc(ad)} · Genel onarımı onayla</h5>`;
    h += teklifHtml(o.gorulenTeklif, o.bolge, p);
    h += '<p class="onr-bilgi">Ödeme hazinenden, malzemeler bu ildeki kendi işletme deposundan alınır. Onarım sırasında hedef tesislerin üretimi durur; bakım tüketimi ve üretim tercihi açık tesislerin işletme gideri sürer. Aşınmanın sıfırlanması onarımın bittiği anlamına gelmez.</p>';
    if (p.degisti) h += '<p class="onr-hata" role="alert">Onarım teklifi değişmiş veya güncel bilgi alınamamış. Vazgeçip yeni teklifi incele.</p>';
    else if (engel) h += `<p class="onr-hata" role="alert">${esc(canli?.engel ? onarimEngelMetni(canli.engel) : "Güncel onarım uygunluğu alınmadan işlem yapılamıyor.")}</p>`;
    if (p.hata) h += `<p class="onr-hata" role="alert">${esc(p.hata)}</p>`;
    if (p.bekliyor) h += '<p class="onr-bilgi" role="status">Sunucu yanıtı bekleniyor.</p>';
    const onay = esc(JSON.stringify(o));
    h += `<div class="onr-eylemler"><button type="button" class="onr-dugme" data-onarim-eylem="vazgec" data-bolge="${esc(o.bolge)}" data-onarim-varsayilan-odak="1"${p.bekliyor ? " disabled" : ""}>Vazgeç</button><button type="button" class="onr-dugme onr-onayla" data-onarim-eylem="onayla" data-bolge="${esc(o.bolge)}" data-onarim-onayi="${onay}"${p.bekliyor || engel ? " disabled" : ""}>Genel onarımı başlat</button></div></div>`;
  } else if (p.hata) h += `<p class="onr-hata" role="alert">${esc(p.hata)}</p>`;
  return h + '</section>';
}
