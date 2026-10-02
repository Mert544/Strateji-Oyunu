/** Mülk oyuncusunun mevcut araştırma motoruna erişimi; durum her çizimde sunucudan okunur. */
import { carpBol, PPM } from "@bolge/cekirdek";
import { esc, paraMili, sureMetni } from "../arayuz/bicim";
import type { Icerik, TeknolojiT } from "../komut/tablo";
import { ikon } from "../tasarim/ikon";

const SAAT = 3_600_000;

export interface TeknolojiDurumu {
  simZamani: number;
  acik: ReadonlySet<string>;
  arastirma: { teknoloji: string; bitis: number } | null;
  yayilimPpm?: ReadonlyMap<string, number>;
  erkenOyunPpm: number;
  hazineMili: number;
}
export type ArastirmaSonucu = { tamam: true } | { tamam: false; mesaj: string };
export interface TeknolojiPanelParam {
  ic: Icerik;
  durum: () => TeknolojiDurumu | null;
  komut: (teknoloji: string) => Promise<ArastirmaSonucu>;
  degisti: () => void;
}

/** Yayılım + erken oyun süresi çekirdeğin tamsayı işlemi ve bir dakika tabanıyla aynı sırada. */
export function arastirmaTeklifi(t: TeknolojiT, d: TeknolojiDurumu): { maliyet: number; sureMs: number } | null {
  const yayilim = d.yayilimPpm?.get(t.id);
  if (yayilim === undefined) return null;
  const normal = carpBol(t.sureGun * 24 * SAAT, yayilim, PPM);
  return {
    maliyet: carpBol(t.maliyet, yayilim, PPM),
    sureMs: Math.max(Math.min(normal, 60_000), carpBol(normal, d.erkenOyunPpm, PPM)),
  };
}

export class TeknolojiPaneli {
  private gonderiliyor = false;
  private sonuc = "";
  private hata = false;
  constructor(private readonly p: TeknolojiPanelParam) {}

  /** Yalnız mülk oyununda gerçekten kullanılabilir yöntem/tesis/birlik açan araştırmalar başlatılır. */
  private secenekler(t: TeknolojiT): string[] {
    const ic = this.p.ic;
    const kurulabilir = ic.turler.filter((tur) => (ic.param.mulk?.yapiYuva[tur.id] ?? 0) > 0);
    const kullanilan = new Set(kurulabilir.flatMap((tur) => tur.yontemler));
    return [
      ...ic.yontemler.filter((y) => kullanilan.has(y.indeks) && y.gerekliTeknoloji === t.id).map((y) => y.ad),
      ...kurulabilir.filter((tur) => tur.gerekliTeknoloji === t.id).map((tur) => tur.ad),
      ...((ic.param.mulk?.ekYapilar?.["ordugah"]?.birlikKapasitesi ?? 0) > 0
        ? ic.birlikler.filter((birlik) => birlik.gerekliTeknoloji === t.id).map((birlik) => birlik.ad)
        : []),
    ];
  }

  private engel(t: TeknolojiT, d: TeknolojiDurumu): string | null {
    if (d.acik.has(t.id)) return "Araştırıldı";
    if (d.arastirma) return d.arastirma.teknoloji === t.id ? "Araştırılıyor" : "Önce süren araştırmanın bitmesini bekle.";
    if (!this.secenekler(t).length) return "Mülk oyununda kullanılabilir bir seçeneği henüz yok.";
    const eksik = t.onKosullar.filter((id) => !d.acik.has(id));
    if (eksik.length) return `Önce ${eksik.map((id) => this.p.ic.teknolojiler.find((x) => x.id === id)?.ad ?? id).join(", ")} araştırılmalı.`;
    const teklif = arastirmaTeklifi(t, d);
    if (!teklif) return "Araştırma bedeli sunucudan bekleniyor.";
    if (d.hazineMili < teklif.maliyet) return "Araştırma için hazinen yeterli değil.";
    return null;
  }

  html(): string {
    const d = this.p.durum();
    if (!d) return '<p class="ipucu-metin">Araştırma bilgisi yükleniyor…</p>';
    const etkin = d.arastirma;
    let s = `<h3>${ikon("flask-conical", 18)} Teknoloji</h3><p class="ipucu-metin">Yeni üretim yöntemlerini araştır. Aynı anda bir araştırma yürütülür; tamamlanan yöntemleri tesislerinde seçebilirsin.</p>`;
    if (etkin) {
      const ad = this.p.ic.teknolojiler.find((t) => t.id === etkin.teknoloji)?.ad ?? etkin.teknoloji;
      const kalan = Math.max(0, etkin.bitis - d.simZamani);
      s += `<p class="tk-etkin" role="status"><b>${esc(ad)}</b><span>${kalan > 0 ? `${esc(sureMetni(kalan / SAAT))} kaldı` : "Tamamlanma bilgisi bekleniyor…"}</span></p>`;
    }
    if (this.sonuc) s += `<p class="tk-sonuc${this.hata ? " tk-hata" : ""}" role="${this.hata ? "alert" : "status"}">${esc(this.sonuc)}</p>`;
    s += '<div class="tk-liste">';
    for (const t of this.p.ic.teknolojiler) {
      const acik = d.acik.has(t.id);
      const secenekler = this.secenekler(t);
      const teklif = arastirmaTeklifi(t, d);
      const neden = this.engel(t, d);
      s += `<article class="tk-kart${acik ? " tk-tamam" : ""}"><h4>${esc(t.ad)}${acik ? ` ${ikon("check", 15)}` : ""}</h4>`;
      s += `<p>${esc(secenekler.length ? `Üretim seçenekleri: ${secenekler.join(", ")}.` : "Bu araştırmanın açtığı seçenekler mülk oyununa henüz bağlı değil.")}</p>`;
      if (!acik && secenekler.length && teklif) s += `<dl class="tk-bedel"><div><dt>Şimdi başlatırsan</dt><dd>${paraMili(teklif.maliyet)} · ${esc(sureMetni(teklif.sureMs / SAAT))}</dd></div></dl>`;
      if (neden) s += `<p class="ipucu-metin">${esc(neden)}</p>`;
      if (!acik && secenekler.length) s += `<button type="button" class="eylem" data-teknoloji-baslat="${esc(t.id)}"${neden || this.gonderiliyor ? " disabled" : ""}>${this.gonderiliyor ? "İşleniyor…" : "Araştırmayı başlat"}</button>`;
      s += "</article>";
    }
    return s + '</div><p class="ipucu-metin">Bedel araştırma başlarken alınır. Yayılım ve yeni oyuncu hızı, başlangıçtaki maliyet ve süreyi etkiler.</p>';
  }

  async baslat(id: string): Promise<void> {
    if (this.gonderiliyor) return;
    const d = this.p.durum();
    const t = this.p.ic.teknolojiler.find((x) => x.id === id);
    if (!d || !t) return;
    const neden = this.engel(t, d);
    if (neden) { this.sonuc = neden; this.hata = true; this.p.degisti(); return; }
    this.gonderiliyor = true;
    this.sonuc = "";
    this.p.degisti();
    try {
      const r = await this.p.komut(id);
      this.hata = !r.tamam;
      this.sonuc = r.tamam ? `${t.ad} araştırması başladı.` : r.mesaj;
    } catch {
      this.hata = true;
      this.sonuc = "Sunucuya ulaşılamadı. Araştırma durumunu kontrol edip yeniden deneyebilirsin.";
    } finally {
      this.gonderiliyor = false;
      this.p.degisti();
    }
  }
}
