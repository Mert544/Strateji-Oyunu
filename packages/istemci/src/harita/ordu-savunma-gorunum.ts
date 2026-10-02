/** Sunucunun savunma dökümünü gösterir; kuvvet çarpanlarından istemcide toplam üretmez. */
import { esc, fmt, sayi, yuzde } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";

export interface SavunmaGorunumVerisi {
  hamGuc: number;
  ikmalPpm: number;
  araziPpm: number;
  durusPpm: number;
  /** Sunucunun sıralı yuvarlamayla hesapladığı mevcut savunma gücü. */
  guc: number;
}

export interface SavunmaGorunumParam {
  /** Alanın yokluğu sıfır güç anlamına gelmez. */
  savunma?: SavunmaGorunumVerisi;
  durus: "normal" | "savunma" | "geri_cekil";
}

const DURUS_ADI: Record<SavunmaGorunumParam["durus"], string> = {
  normal: "Normal",
  savunma: "Savunmada kal",
  geri_cekil: "Geri çekil",
};

/** Mevcut bölgenin temel kuvveti, etkileri ve sunucudan gelen toplamı; eylem/DOM bağı yoktur. */
export function savunmaGorunumuHtml(p: SavunmaGorunumParam): string {
  let h = `<section class="sv-panel" aria-label="Mevcut savunma gücü"><h5>${ikon("shield", 18)} Savunma gücü</h5><p class="sv-durus">Duruş: <b>${esc(DURUS_ADI[p.durus])}</b></p>`;
  const s = p.savunma;
  if (s === undefined) {
    h += '<p class="sv-bilinmiyor" role="status">Mevcut savunma gücü ve etkileri bilinmiyor; sunucudan savunma dökümü henüz alınmadı.</p>';
  } else {
    h += `<div class="sv-akis"><dl class="sv-temel"><dt>Temel kuvvet</dt><dd>${esc(fmt(s.hamGuc))}</dd></dl><span class="sv-ok" aria-hidden="true">${ikon("chevron-right", 18)}</span><dl class="sv-etkiler">`;
    h += `<div${s.ikmalPpm < 1_000_000 ? ' class="sv-eksik"' : ""}><dt>${ikon("package", 14)} İkmal karşılama</dt><dd>${esc(yuzde(s.ikmalPpm / 10_000, 2))}</dd></div>`;
    h += `<div><dt>${ikon("mountain", 14)} Bölgesel savunma etkisi</dt><dd>×${esc(sayi(s.araziPpm / 1_000_000, 3))}</dd></div>`;
    h += `<div><dt>${ikon("shield", 14)} Duruş etkisi</dt><dd>×${esc(sayi(s.durusPpm / 1_000_000, 3))}</dd></div></dl><span class="sv-ok" aria-hidden="true">${ikon("chevron-right", 18)}</span><dl class="sv-toplam"><dt>Mevcut savunma gücü</dt><dd>${esc(fmt(s.guc))}</dd></dl></div>`;
    h += '<p class="ipucu-metin">Temel kuvvet, hazır birliklerin toplamıdır; ikmal ve savunma etkileri mevcut gücü değiştirir. Bölgesel savunma etkisi, bulunduğun oyun bölgesinin arazi özelliklerine göre uygulanır; parselinin ölçümü değildir.</p>';
  }
  if (p.durus === "geri_cekil") h += '<p class="sv-geri-cekil">Geri çekil duruşunda birlikler savunmaya katılmaz ve savunma gücü 0 olur. İkmal ve maaş sürer; bu duruş stokların yağmalanmasını engellemez.</p>';
  return h + "</section>";
}
