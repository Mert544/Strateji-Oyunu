/** Duyurulmuş baskınların genel görünümü ile sahibinin gerçekleşmiş sonuçlarını ayırır. */
import { esc, fmt, sayi, tarihSaatMetni } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";

export interface BaskinOlayGorunumu {
  id: number;
  il: string;
  ilce: string;
  evre: "duyuru" | "pencere" | "bitti" | "iptal";
  duyuruZamani: number;
  pencereBaslangic: number;
  pencereBitis: number;
  tahminAltGuc: number;
  tahminUstGuc: number;
  sonuc?: { kazandi: boolean; baskinGucu: number; savunmaGucu: number };
}

export interface BaskinSonucGorunumu {
  baskin: number;
  il: string;
  ilce: string;
  dugum: string;
  zaman: number;
  kazandi: boolean;
  katkiGuc: number;
  birlikKaybi: ReadonlyArray<readonly [birlik: string, adet: number]>;
  malKaybi: ReadonlyArray<readonly [mal: string, miktarMili: number]>;
  ganimet: ReadonlyArray<readonly [mal: string, miktarMili: number]>;
  ganimetTasma: ReadonlyArray<readonly [mal: string, miktarMili: number]>;
  onarim: ReadonlyArray<readonly [tesis: number, bitis: number]>;
}

export interface BaskinRevirGorunumu {
  baskin: number;
  dugum: string;
  donusZamani: number;
  birlikler: ReadonlyArray<readonly [birlik: string, adet: number]>;
  evre: "bekliyor" | "dondu" | "iptal";
}

export interface BaskinIlceGorunumu {
  etkin: boolean;
  /** Duyurudan önceki planlar bu görünüme verilmez. */
  olaylar: readonly BaskinOlayGorunumu[];
}

export interface BaskinOrduGorunumu extends BaskinIlceGorunumu {
  /** Yalnız sahibine uygulanmış kayıp/ödül kayıtları. */
  sonuclar: readonly BaskinSonucGorunumu[];
  revir: readonly BaskinRevirGorunumu[];
}

interface BaskinGorunumAdlari {
  ilceAdi?: (id: string) => string;
  malAdi?: (id: string) => string;
  birlikAdi?: (id: string) => string;
  dugumAdi?: (id: string) => string;
  zamanMetni?: (simMs: number) => string;
}

export type BaskinGorunumParam = BaskinGorunumAdlari & (
  | { gorunum: "ilce"; pve?: BaskinIlceGorunumu }
  | { gorunum: "ordu"; pve?: BaskinOrduGorunumu }
);

const EVRE_ADI: Record<BaskinOlayGorunumu["evre"], string> = {
  duyuru: "Duyuruldu",
  pencere: "Baskın penceresi açık",
  bitti: "Tamamlandı",
  iptal: "İptal edildi",
};

const sonucAdi = (kazandi: boolean): string => kazandi ? "Savunma başarılı" : "Baskın savunmayı aştı";

/** Salt okunur kartlar; sonuçlardan ödül, kayıp, kuvvet veya revir hakkı hesaplamaz. */
export function baskinGorunumuHtml(p: BaskinGorunumParam): string {
  const ilceAdi = p.ilceAdi ?? ((id: string) => id);
  const malAdi = p.malAdi ?? ((id: string) => id);
  const birlikAdi = p.birlikAdi ?? ((id: string) => id);
  const zamanMetni = p.zamanMetni ?? ((ms: number) => tarihSaatMetni(ms / 3_600_000));
  const sayiSatiri = (ad: string, deger: string): string => `<div><dt>${ad}</dt><dd>${deger}</dd></div>`;
  const zamanSatiri = (ad: string, ms: number): string => sayiSatiri(ad, esc(zamanMetni(ms)));
  const olayHtml = (b: BaskinOlayGorunumu): string => {
    const renk = b.evre === "bitti" && b.sonuc ? (b.sonuc.kazandi ? " bk-kazandi" : " bk-kaybetti") : "";
    let h = `<article class="bk-kart bk-${b.evre === "bitti" ? "sonuc" : b.evre}${renk}"><header><h5>${ikon("shield", 16)} ${esc(ilceAdi(b.ilce))}</h5><span class="bk-evre">${EVRE_ADI[b.evre]}</span></header><dl class="bk-zamanlar">`;
    h += zamanSatiri("Duyuru", b.duyuruZamani);
    h += zamanSatiri("Baskın başlangıcı", b.pencereBaslangic);
    h += zamanSatiri("Baskın bitişi", b.pencereBitis) + "</dl>";
    if (b.evre === "duyuru" || b.evre === "pencere") {
      h += `<p>Tahmini baskın gücü: <b>${esc(fmt(b.tahminAltGuc))}–${esc(fmt(b.tahminUstGuc))}</b>.</p><p class="ipucu-metin">Bu aralık bir tahmindir; gerçekleşen baskın ve savunma güçleri sonuçta görünür.</p>`;
    } else if (b.evre === "bitti") {
      if (b.sonuc) {
        h += `<p><b>${sonucAdi(b.sonuc.kazandi)}</b></p><dl class="bk-sayilar">`;
        h += sayiSatiri("Gerçekleşen baskın gücü", esc(fmt(b.sonuc.baskinGucu)));
        h += sayiSatiri("Gerçekleşen savunma gücü", esc(fmt(b.sonuc.savunmaGucu))) + "</dl>";
      } else h += '<p class="bk-bilinmiyor">Sonuç bilgisi henüz alınmadı.</p>';
    } else h += '<p class="bk-bos">Bu baskın iptal edildi.</p>';
    return h + "</article>";
  };

  let h = `<section class="bk-panel" aria-label="${p.gorunum === "ordu" ? "Baskınlar ve senin sonuçların" : "İlçe baskınları"}"><h4>${ikon("shield", 18)} İlçe baskınları</h4>`;
  if (p.pve === undefined) return h + '<p class="bk-bilinmiyor">Baskın bilgisi henüz alınmadı.</p></section>';
  if (!p.pve.etkin) h += '<p class="bk-bos">Baskın sistemi şu an kapalı.</p>';
  // Bayrak kapalıyken yalnız geçmiş sonuç/iptal görünür; devam eden ilan gösterilmez.
  const olaylar = p.pve.olaylar.filter((b) => p.pve?.etkin || b.evre === "bitti" || b.evre === "iptal");
  if (p.gorunum === "ilce") {
    if (p.pve.etkin && !olaylar.length) h += '<p class="bk-bos">Bu ilçede duyurulmuş baskın yok.</p>';
    return h + olaylar.map(olayHtml).join("") + "</section>";
  }

  const ozel = p.pve;
  const ilanlar = olaylar.filter((b) => b.evre !== "bitti" || !ozel.sonuclar.some((s) => s.baskin === b.id));
  if (ozel.etkin && !ilanlar.length && !ozel.sonuclar.length) h += '<p class="bk-bos">İşletmelerinin bulunduğu ilçelerde duyurulmuş baskın yok.</p>';
  h += ilanlar.map(olayHtml).join("");

  const birlikDokumu = (kalemler: ReadonlyArray<readonly [string, number]>, bos: string): string => {
    const kayitlar = kalemler.filter(([, q]) => q > 0);
    return kayitlar.length ? `<ul class="bk-dokum">${kayitlar.map(([id, q]) => `<li><span>${esc(birlikAdi(id))}</span><b>${esc(fmt(q))} birlik</b></li>`).join("")}</ul>` : `<p class="bk-bos">${bos}</p>`;
  };
  const malDokumu = (kalemler: ReadonlyArray<readonly [string, number]>, bos: string): string => {
    const kayitlar = kalemler.filter(([, q]) => q > 0);
    return kayitlar.length ? `<ul class="bk-dokum">${kayitlar.map(([id, q]) => `<li><span>${esc(malAdi(id))}</span><b>${esc(sayi(q / 1000, 3))} birim</b></li>`).join("")}</ul>` : `<p class="bk-bos">${bos}</p>`;
  };
  if (ozel.sonuclar.length) h += '<h4>Senin baskın sonuçların</h4>';
  for (const s of ozel.sonuclar) {
    const dugum = p.dugumAdi ? ` · ${p.dugumAdi(s.dugum)}` : "";
    h += `<article class="bk-kart bk-sonuc ${s.kazandi ? "bk-kazandi" : "bk-kaybetti"}"><header><h5>${esc(ilceAdi(s.ilce) + dugum)}</h5><span class="bk-evre">${sonucAdi(s.kazandi)}</span></header><p class="ipucu-metin">Sonuç zamanı: ${esc(zamanMetni(s.zaman))}</p><dl class="bk-sayilar">`;
    h += sayiSatiri("Savunmaya katkın", esc(fmt(s.katkiGuc)));
    h += sayiSatiri("Birlik kaybın", esc(fmt(s.birlikKaybi.reduce((t, [, q]) => t + q, 0)))) + "</dl>";
    const detayId = esc(JSON.stringify([s.baskin, s.dugum]));
    h += `<details class="bk-ozel-detay" data-baskin-detay="${detayId}"><summary>${ikon("chevron-right", 16)} Kayıp, ganimet ve onarım ayrıntıları</summary>`;
    h += '<h6 class="bk-detay-baslik">Birlik kaybı</h6>' + birlikDokumu(s.birlikKaybi, "Kaydedilen birlik kaybı yok.");
    h += '<h6 class="bk-detay-baslik">Mal kaybı</h6>' + malDokumu(s.malKaybi, "Kaydedilen mal kaybı yok.");
    h += '<h6 class="bk-detay-baslik">Depoya eklenen ganimet</h6>' + malDokumu(s.ganimet, "Bu sonuçta depoya eklenen ganimet yok.");
    h += '<h6 class="bk-detay-baslik">Depoya sığmayan ganimet</h6>' + malDokumu(s.ganimetTasma, "Depoya sığmayan ganimet yok.");
    h += '<h6 class="bk-detay-baslik">Tesis onarımı</h6>';
    if (s.onarim.length) {
      const bitisler = new Map<number, number>();
      for (const [, bitis] of s.onarim) bitisler.set(bitis, (bitisler.get(bitis) ?? 0) + 1);
      h += `<ul class="bk-dokum">${[...bitisler].map(([bitis, adet]) => `<li><span>${esc(fmt(adet))} tesis</span><span>Kaydedilen onarım bitişi: ${esc(zamanMetni(bitis))}</span></li>`).join("")}</ul>`;
    } else h += '<p class="bk-bos">Bu sonuçta onarıma alınan tesis yok.</p>';
    h += '<p class="ipucu-metin">Döküm, sana uygulanmış kayıp ve verilen malları gösterir. Depoya sığmayan ganimet nakde çevrilmez.</p></details></article>';
  }

  if (ozel.revir.length) h += `<h4>${ikon("house", 16)} Revir kayıtların</h4>`;
  for (const r of ozel.revir) {
    const ad = p.dugumAdi ? p.dugumAdi(r.dugum) : "İşletmendeki birlikler";
    const evre = r.evre === "bekliyor" ? "Dönüş bekleniyor" : r.evre === "dondu" ? "Dönüş tamamlandı" : "Dönüş iptal edildi";
    h += `<article class="bk-kart"><header><h5>${esc(ad)}</h5><span class="bk-evre">${evre}</span></header><p class="bk-revir">Kaydedilen dönüş zamanı: ${esc(zamanMetni(r.donusZamani))}</p>`;
    h += birlikDokumu(r.birlikler, "Bu revir kaydında birlik yok.") + "</article>";
  }
  return h + "</section>";
}
