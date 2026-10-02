/** Tesisin görülen çalışma durumunu değiştirmek için saf düğme ve onay görünümü. */
import { esc } from "../arayuz/bicim";

export interface TesisDurumGorunumParam {
  tesis: string;
  bolge: string;
  /** Gerçek tesis adı, konumu ve okunur tesis numarası; controller tarafından çözülür. */
  tesisAdi: string;
  acik: boolean;
  /** Kapalı satırda güncel durum; açık onayda seçilirken görülen önceki durum. */
  aktif: boolean;
  hedefAktif: boolean;
  bekliyor: boolean;
  hata?: string;
  /** Güncel tesis artık görülen durumla eşleşmiyorsa onay uygulanamaz. */
  degisti?: boolean;
}

/** Controller yalnız tamamlanmış, desteklenen, çıktılı üretim tesislerini gönderir. */
export function tesisDurumGorunumuHtml(p: TesisDurumGorunumParam): { dugme: string; alt: string } {
  const bos = { dugme: "", alt: "" };
  if (!/^t(?:0|[1-9]\d*)$/.test(p.tesis) || !Number.isSafeInteger(Number(p.tesis.slice(1))) || !p.bolge || typeof p.aktif !== "boolean" || typeof p.hedefAktif !== "boolean" || p.aktif === p.hedefAktif) return bos;
  const eylem = p.hedefAktif ? "Başlat" : "Durdur";
  const tesis = esc(p.tesis);
  const dugme = `<button type="button" class="tsd-dugme tsd-satir-dugme" data-tesis-durum-eylem="ac" data-tesis="${tesis}" data-bolge="${esc(p.bolge)}" data-aktif="${p.aktif}" data-hedef-aktif="${p.hedefAktif}" aria-haspopup="dialog" aria-expanded="${p.acik}" aria-label="${esc(`${p.tesisAdi}: ${eylem}`)}"${p.bekliyor ? " disabled" : ""}>${eylem}</button>`;
  if (!p.acik) return { dugme, alt: p.hata ? `<p class="tsd-hata" role="alert">${esc(p.hata)}</p>` : "" };
  const baslik = `tsd-onay-baslik-${tesis}`;
  const onay = esc(JSON.stringify({ tesis: p.tesis, bolge: p.bolge, oncekiAktif: p.aktif, aktif: p.hedefAktif }));
  let alt = `<div class="tsd-onay" data-tesis-durum="${tesis}" role="alertdialog" aria-labelledby="${baslik}" aria-busy="${p.bekliyor}"><h5 id="${baslik}">${esc(p.tesisAdi)} · ${eylem}</h5>`;
  alt += `<p class="tsd-aciklama">${p.hedefAktif ? "Tesisin üretimini başlatmak istiyorsun. Üretim, girdi erişimine, onarıma ve verime bağlıdır." : "Üretim ve üretim girdilerinin tüketimi durur. Bakım tüketimi sürer."} Ticaret emirlerin değişmez.</p>`;
  if (p.degisti) alt += '<p class="tsd-hata" role="alert">Tesisin durumu değişmiş veya güncel bilgisi alınamamış. Vazgeçip tesisi yeniden incele.</p>';
  if (p.hata) alt += `<p class="tsd-hata" role="alert">${esc(p.hata)}</p>`;
  if (p.bekliyor) alt += '<p class="tsd-bekliyor" role="status">Sunucu yanıtı bekleniyor.</p>';
  alt += `<div class="tsd-eylemler"><button type="button" class="tsd-dugme" data-tesis-durum-eylem="vazgec" data-tesis="${tesis}" data-tesis-durum-varsayilan-odak="1"${p.bekliyor ? " disabled" : ""}>Vazgeç</button><button type="button" class="tsd-dugme tsd-onayla" data-tesis-durum-eylem="onayla" data-tesis="${tesis}" data-tesis-durum-onayi="${onay}"${p.bekliyor || p.degisti ? " disabled" : ""}>${eylem}</button></div></div>`;
  return { dugme, alt };
}
