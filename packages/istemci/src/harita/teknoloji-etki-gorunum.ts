/** Araştırmanın sahibinin gerçek tesislerindeki yöntemlere etkisini gösteren saf görünüm. */
import type { Icerik, MalMiktar, YontemT } from "../komut/tablo";
import type { IsletmeDurumu, IsletmeYapisi } from "./baglanti";
import { esc, sayi } from "../arayuz/bicim";

export interface TeknolojiEtkiGorunumParam {
  teknoloji: string;
  ic: Icerik;
  /** null bilgi alınmadı; bilinen boş yapı listesi uygun tesis yok anlamına gelir. */
  isletme: IsletmeDurumu | null;
  acik: ReadonlySet<string> | null;
  yontemDestegi: boolean;
  tesisAdi?: (tesis: IsletmeYapisi) => string;
  bekliyor?: boolean;
}

/** Miktarlar ham içerikteki S ölçeği / tam kapasite saatlik tarifelerdir. */
export function teknolojiEtkiGorunumuHtml(p: TeknolojiEtkiGorunumParam): string {
  const hedefler = p.ic.yontemler.filter((y) => y.gerekliTeknoloji === p.teknoloji);
  if (!hedefler.length) return "";
  let h = `<details class="te-etki" data-teknoloji-etki="${esc(p.teknoloji)}"><summary>Benim tesislerimde</summary>`;
  if (p.isletme === null) return h + '<p class="te-bilgi">Tesis bilgilerin henüz alınmadı.</p></details>';
  const eslesmeler = p.isletme.yapilar.filter((y) => {
    if (y.yukseltme) return false;
    const tur = p.ic.turler[p.ic.turIdx[y.tur]!];
    return tur?.yontemler.some((indeks) => hedefler.some((hedef) => hedef.indeks === indeks));
  });
  if (!eslesmeler.length) return h + '<p class="te-bilgi">Bu yöntemlere uygun tesisin yok.</p></details>';
  h += '<p class="te-bilgi">Nominal saatlik tarifeler · S ölçeği, tam kapasite. Gösterilen miktarlar gerçek üretim veya tüketim sonucu değildir.</p>';
  const tarife = (baslik: string, mevcut: MalMiktar | undefined, hedef: MalMiktar | undefined): string => {
    const mallar = [...new Set([...(mevcut ?? []).map(([m]) => m), ...(hedef ?? []).map(([m]) => m)])].sort((a, b) => a - b);
    if (!mallar.length) return `<div class="te-tarife"><h6>${baslik}</h6><p class="te-bilgi">${mevcut === undefined || hedef === undefined ? "Tarife bilgisi alınmadı." : "Her iki yöntemde de yok."}</p></div>`;
    const miktar = (liste: MalMiktar | undefined, mal: number): string => liste === undefined ? "Bilinmiyor" : sayi((liste.find(([m]) => m === mal)?.[1] ?? 0) / 1000, 3);
    return `<div class="te-tarife"><h6>${baslik}</h6><table><caption class="te-caption">${baslik}: mevcut yöntem ve açılan yöntem karşılaştırması, birim/saat</caption><thead><tr><th scope="col">Mal</th><th scope="col">Mevcut</th><th scope="col">Açılan</th></tr></thead><tbody>${mallar.map((mal) => `<tr><th scope="row">${esc(p.ic.mallar[mal]?.ad ?? "Mal bilgisi alınmadı")}</th><td>${esc(miktar(mevcut, mal))}</td><td>${esc(miktar(hedef, mal))}</td></tr>`).join("")}</tbody></table></div>`;
  };
  for (const tesis of eslesmeler) {
    const tur = p.ic.turler[p.ic.turIdx[tesis.tur]!]!;
    const adaylar = hedefler.filter((y) => tur.yontemler.includes(y.indeks));
    const bulunan = tesis.yontem === undefined ? undefined : p.ic.yontemler[p.ic.yontemIdx[tesis.yontem]!];
    const mevcut: YontemT | undefined = bulunan && tur.yontemler.includes(bulunan.indeks) ? bulunan : undefined;
    const tesisAdi = p.tesisAdi?.(tesis) || tur.ad;
    for (const hedef of adaylar) {
      h += `<section class="te-tesis"><h5>${esc(tesisAdi)}</h5>`;
      if (tesis.durum === "insaat") {
        h += `<p class="te-durum">İnşa bitince · ${esc(hedef.ad)}</p><p class="te-bilgi">Yöntemleri tesis tamamlandıktan sonra seçebilirsin.</p></section>`;
        continue;
      }
      const zaten = mevcut?.id === hedef.id;
      const durum = zaten ? "Zaten kullanılıyor" : p.acik === null ? "Araştırma durumu alınmadı" : p.acik.has(p.teknoloji) ? "Yöntem açıldı" : "Araştırma tamamlanınca açılır";
      h += `<p class="te-durum">${durum}</p><div class="te-yontemler"><div><span>Mevcut yöntem</span><strong>${esc(mevcut?.ad ?? "Yöntem bilgisi alınmadı")}</strong></div><div><span>Açılan yöntem</span><strong>${esc(hedef.ad)}</strong></div></div>`;
      h += tarife("Girdiler · birim/saat", mevcut?.girdi, hedef.girdi);
      h += tarife("Çıktılar · birim/saat", mevcut?.cikti, hedef.cikti);
      h += tarife("Temel bakım tarifi · birim/saat", mevcut?.bakim, hedef.bakim);
      h += '<p class="te-bilgi">Ölçek ve bakım ayarları gerçek bakım tüketimini değiştirir. Araştırma tesisin yöntemini otomatik değiştirmez.</p>';
      const uygun = p.yontemDestegi && !p.bekliyor && /^t\d+$/.test(tesis.anahtar) && !!tesis.bolge && mevcut !== undefined;
      h += `<button type="button" class="te-git" data-teknoloji-tesis="${esc(tesis.anahtar)}" data-teknoloji-yontem="${esc(hedef.id)}" data-teknoloji="${esc(p.teknoloji)}"${uygun ? "" : " disabled"}>Tesiste yöntemleri gör</button>`;
      if (!uygun) h += `<p class="te-bilgi">${p.bekliyor ? "İşlemin yanıtı bekleniyor." : !p.yontemDestegi ? "Yöntem seçimi bu bağlantıda kullanılamıyor." : "Tesisin yöntem bilgisi tamamlanınca seçici açılabilir."}</p>`;
      h += '</section>';
    }
  }
  return h + '</details>';
}
