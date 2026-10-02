/** Sahibinin işletme düğümündeki gerçek birlikleri, üretim partileri ve savunma tercihleri. */
import { carpBol, PPM } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import type { PveOyuncuKaresi } from "@bolge/protokol";
import { esc, fmt, kalanSureMetni, paraMili, sayi, sureMetni, yuzde } from "../arayuz/bicim";
import type { BirlikT, Icerik } from "../komut/tablo";
import { ikon } from "../tasarim/ikon";
import { savunmaGorunumuHtml } from "./ordu-savunma-gorunum";
import "./ordu-savunma-gorunum.css";
import { baskinGorunumuHtml } from "./baskin-gorunum";
import "./baskin-gorunum.css";

const SAAT = 3_600_000;
const EN_COK_ADET = 100;
export type OrduDurusu = "normal" | "savunma" | "geri_cekil";
export interface OrduBolgesi {
  id: string;
  ad: string;
  birlikler: ReadonlyMap<string, number>;
  stoklar: ReadonlyMap<string, number>;
  kapasite: number;
  ordugahSayisi: number;
  ikmalPpm: number;
  /** Sunucunun mevcut duruş için hesapladığı sapma öncesi savunma; yokluğu bilinmiyor. */
  savunma?: { hamGuc: number; ikmalPpm: number; araziPpm: number; durusPpm: number; guc: number };
  /** Sunucunun gerçek ikmal talebi; eski sunucuda bilinmiyorsa yoktur. */
  ikmalSaat?: ReadonlyMap<string, number>;
  durus: OrduDurusu;
  partiler: ReadonlyArray<{ id: number; birlik: string; adet: number; bitis: number }>;
}
export interface OrduDurumu {
  simZamani: number;
  erkenOyunPpm: number;
  teknolojiler: ReadonlySet<string>;
  bolgeler: readonly OrduBolgesi[];
  /** Yalnız sahibinin duyurulmuş ilgisi ve gerçekleşmiş sonuçları; yokluğu bilinmiyor. */
  pve?: PveOyuncuKaresi;
}
export type OrduSonucu = { tamam: true } | { tamam: false; mesaj: string };
export interface OrduPanelParam {
  ic: Icerik;
  durum: () => OrduDurumu | null;
  komut: (komut: Extract<Komut, { tur: "birlik_uret" | "savunma_emri" }>) => Promise<OrduSonucu>;
  degisti: () => void;
  ilceAdi?: (id: string) => string;
}
export type OrduEylemi =
  | { eylem: "uret"; bolge: string; birlik: string; adet: string }
  | { eylem: "durus"; bolge: string; durus: OrduDurusu };
export type OrduYonlendirmeEylemi =
  | { eylem: "tedarik"; bolge: string; birlik: string; mal: string; adet: number }
  | { eylem: "teknoloji"; bolge: string; birlik: string; teknoloji: string };
export type OrduYonlendirmesi =
  | { eylem: "tedarik"; bolge: string; mal: string }
  | { eylem: "teknoloji"; teknoloji: string };

const DURUS_ADI: Record<OrduDurusu, string> = { normal: "Normal", savunma: "Savunmada kal", geri_cekil: "Geri çekil" };
const anahtar = (bolge: string, birlik: string): string => JSON.stringify([bolge, birlik]);

export function birlikAdedi(deger: string): number | null {
  if (!/^\d+$/.test(deger.trim())) return null;
  const n = Number(deger);
  return Number.isSafeInteger(n) && n >= 1 && n <= EN_COK_ADET ? n : null;
}

/** Maliyet adetle çarpılır; parti süresi adetle uzamaz, başlangıçtaki erken oyun hızı uygulanır. */
export function birlikTeklifi(b: BirlikT, adet: number, erkenOyunPpm: number): { maliyet: Array<[number, number]>; sureMs: number } {
  const normal = b.sureSaat * SAAT;
  return { maliyet: b.maliyet.map(([mal, miktar]) => [mal, miktar * adet]), sureMs: Math.max(Math.min(normal, 60_000), carpBol(normal, erkenOyunPpm, PPM)) };
}

export function orduEylemiOku(t: HTMLElement): OrduEylemi | null {
  const b = t.closest<HTMLButtonElement>("button[data-ordu-eylem]");
  if (!b || b.disabled) return null;
  const bolge = b.dataset["bolge"];
  if (!bolge) return null;
  if (b.dataset["orduEylem"] === "uret") {
    const birlik = b.dataset["birlik"];
    const input = b.closest(".ord-uret")?.querySelector<HTMLInputElement>("input[data-ordu-adet]");
    return birlik && input ? { eylem: "uret", bolge, birlik, adet: input.value } : null;
  }
  const durus = b.dataset["durus"];
  return b.dataset["orduEylem"] === "durus" && (durus === "normal" || durus === "savunma" || durus === "geri_cekil") ? { eylem: "durus", bolge, durus } : null;
}

/** Eğitim engeline ait görülen hedef; güncel sahiplik ve eksik stok ayrıca controllerda doğrulanır. */
export function orduYonlendirmeOku(t: HTMLElement): OrduYonlendirmeEylemi | null {
  const b = t.closest<HTMLButtonElement>("button[data-ordu-gecis]");
  if (!b || b.disabled) return null;
  const bolge = b.dataset["bolge"], birlik = b.dataset["birlik"];
  if (!bolge || !birlik) return null;
  if (b.dataset["orduGecis"] === "teknoloji") {
    const teknoloji = b.dataset["teknoloji"];
    return teknoloji ? { eylem: "teknoloji", bolge, birlik, teknoloji } : null;
  }
  const mal = b.dataset["mal"], adet = birlikAdedi(b.dataset["adet"] ?? "");
  return b.dataset["orduGecis"] === "tedarik" && mal && adet !== null ? { eylem: "tedarik", bolge, birlik, mal, adet } : null;
}

export class OrduPaneli {
  private readonly girdiler = new Map<string, string>();
  private gonderiliyor = false;
  private sonuc = "";
  private hata = false;
  private yakalananYonlendirme: OrduYonlendirmeEylemi | null | undefined;

  constructor(private readonly p: OrduPanelParam) {}

  private malAdi(indeks: number): string { return this.p.ic.mallar[indeks]?.ad ?? "Mal"; }
  private birlikAdi(id: string): string { return this.p.ic.birlikler.find((b) => b.id === id)?.ad ?? id; }
  private adetMetni(bolge: string, birlik: string): string { return this.girdiler.get(anahtar(bolge, birlik)) ?? "1"; }
  /** Eski sunucu için yalnız mevcut ham birlik gücü; savunma çarpanları hesaplanmaz. */
  private hamKuvvet(b: OrduBolgesi): number { return this.p.ic.birlikler.reduce((t, birlik) => t + (b.birlikler.get(birlik.id) ?? 0) * birlik.guc, 0); }

  private bekleyenRevir(bolge: string, d: OrduDurumu): number | null {
    if (d.pve === undefined) return null;
    return d.pve.revir.filter((r) => r.dugum === bolge && r.evre === "bekliyor").reduce((t, r) => t + r.birlikler.reduce((n, [, adet]) => n + adet, 0), 0);
  }

  private baskinHtml(d: OrduDurumu): string {
    return baskinGorunumuHtml({
      gorunum: "ordu", pve: d.pve,
      malAdi: (id) => this.p.ic.mallar[this.p.ic.malIdx[id] ?? -1]?.ad ?? id,
      birlikAdi: (id) => this.birlikAdi(id),
      ilceAdi: this.p.ilceAdi,
      dugumAdi: (id) => d.bolgeler.find((b) => b.id === id)?.ad ?? "İşletme",
    });
  }

  private baskinGorunumunuYakala(kok: ParentNode): (() => void) | null {
    const detaylar = [...kok.querySelectorAll<HTMLDetailsElement>("[data-ordu-baskin] details[data-baskin-detay]")];
    if (!detaylar.length) return null;
    const aciklik = new Map(detaylar.map((d) => [d.dataset["baskinDetay"], d.open]));
    const aktif = typeof document === "undefined" ? null : document.activeElement;
    const odak = detaylar.find((d) => d.querySelector("summary") === aktif)?.dataset["baskinDetay"];
    return () => {
      for (const d of kok.querySelectorAll<HTMLDetailsElement>("[data-ordu-baskin] details[data-baskin-detay]")) {
        const id = d.dataset["baskinDetay"];
        if (aciklik.has(id)) d.open = aciklik.get(id)!;
        if (odak !== undefined && id === odak) d.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
      }
    };
  }

  private engel(b: OrduBolgesi, birlik: BirlikT, adet: number | null, d: OrduDurumu): string | null {
    if (b.ordugahSayisi < 1) return "Önce bu işletmenin bulunduğu ilde bir Ordugâh kur.";
    if (birlik.gerekliTeknoloji && !d.teknolojiler.has(birlik.gerekliTeknoloji)) {
      const teknoloji = this.p.ic.teknolojiler.find((t) => t.id === birlik.gerekliTeknoloji)?.ad ?? birlik.gerekliTeknoloji;
      return `Önce ${teknoloji} araştırılmalı.`;
    }
    if (adet === null) return `1–${EN_COK_ADET} arasında tam sayı yaz.`;
    const mevcut = [...b.birlikler.values()].reduce((t, a) => t + a, 0);
    const kuyruk = b.partiler.reduce((t, a) => t + a.adet, 0);
    const revir = this.bekleyenRevir(b.id, d) ?? 0;
    if (mevcut + kuyruk + revir + adet > b.kapasite) return `Kapasite yetersiz: ${fmt(Math.max(0, b.kapasite - mevcut - kuyruk - revir))} boş yer var. Bekleyen revir dönüşleri de yer ayırır; yeni Ordugâh kapasite ekler.`;
    const eksik = birlik.maliyet.filter(([mal, miktar]) => (b.stoklar.get(this.p.ic.mallar[mal]?.id ?? "") ?? 0) < miktar * adet);
    if (eksik.length) return `Bu işletmede gereken stok eksik: ${eksik.map(([mal]) => this.malAdi(mal)).join(", ")}. Bu ildeki işletme stoğunda gereken malları biriktir.`;
    return null;
  }

  /** Yalnız bilinen yerel stoktan gerçekten eksik, depolanabilir eğitim girdileri. */
  private eksikMallari(b: OrduBolgesi, birlik: BirlikT, adet: number): string[] {
    return birlik.maliyet.flatMap(([mi, q]) => {
      const mal = this.p.ic.mallar[mi], gereken = q * adet;
      const stok = mal === undefined ? undefined : b.stoklar.get(mal.id);
      return mal?.depolanabilir === true && Number.isSafeInteger(gereken) && gereken > 0 && stok !== undefined && Number.isSafeInteger(stok) && stok >= 0 && stok < gereken ? [mal.id] : [];
    });
  }

  /** Hiç komut göndermez; eylemin güncel kendi işletmesinde hâlâ aynı eğitim engeli olduğunu doğrular. */
  yonlendirme(e: OrduYonlendirmeEylemi): OrduYonlendirmesi | null {
    if (this.gonderiliyor) return null;
    const d = this.p.durum(), b = d?.bolgeler.find((x) => x.id === e.bolge);
    const birlik = this.p.ic.birlikler.find((x) => x.id === e.birlik);
    if (!d || !b || !birlik || b.ordugahSayisi < 1) return null;
    if (e.eylem === "teknoloji") {
      return birlik.gerekliTeknoloji === e.teknoloji && !d.teknolojiler.has(e.teknoloji) && this.p.ic.teknolojiler.some((t) => t.id === e.teknoloji)
        ? { eylem: "teknoloji", teknoloji: e.teknoloji } : null;
    }
    const adet = birlikAdedi(this.adetMetni(b.id, birlik.id));
    return adet !== null && adet === e.adet && this.eksikMallari(b, birlik, adet).includes(e.mal)
      ? { eylem: "tedarik", bolge: b.id, mal: e.mal } : null;
  }

  /** Pointer/klavye başlangıcında görülen hedef, canlı çizimde başka hedefle değiştirilmez. */
  teklifYakala(t: HTMLElement): boolean {
    this.yakalananYonlendirme = undefined;
    if (!t.closest("button[data-ordu-gecis]")) return false;
    this.yakalananYonlendirme = orduYonlendirmeOku(t);
    return true;
  }

  yonlendirmeOku(t: HTMLElement): OrduYonlendirmeEylemi | null {
    if (!t.closest("button[data-ordu-gecis]")) return null;
    const gorulen = this.yakalananYonlendirme;
    this.yakalananYonlendirme = undefined;
    const simdiki = orduYonlendirmeOku(t);
    return gorulen === undefined ? simdiki : JSON.stringify(gorulen) === JSON.stringify(simdiki) ? gorulen : null;
  }

  private yonlendirmeHtml(b: OrduBolgesi, birlik: BirlikT, d: OrduDurumu, adet: number | null): string {
    const temel = `data-bolge="${esc(b.id)}" data-birlik="${esc(birlik.id)}"${this.gonderiliyor ? " disabled" : ""}`;
    const teknoloji = birlik.gerekliTeknoloji;
    let h = teknoloji !== undefined && !d.teknolojiler.has(teknoloji) && this.p.ic.teknolojiler.some((t) => t.id === teknoloji)
      ? `<button type="button" class="eylem" data-ordu-gecis="teknoloji" data-teknoloji="${esc(teknoloji)}" ${temel}>Araştırmayı gör</button>` : "";
    if (adet !== null) for (const mal of this.eksikMallari(b, birlik, adet)) {
      const ad = this.p.ic.mallar.find((m) => m.id === mal)?.ad ?? mal;
      h += `<button type="button" class="eylem" data-ordu-gecis="tedarik" data-mal="${esc(mal)}" data-adet="${adet}" ${temel}>${esc(ad)} tedarikine git</button>`;
    }
    return h ? `<div class="ord-gecis">${h}</div>` : "";
  }

  private teklifHtml(b: OrduBolgesi, birlik: BirlikT, d: OrduDurumu): string {
    const adet = birlikAdedi(this.adetMetni(b.id, birlik.id));
    const teklif = birlikTeklifi(birlik, adet ?? 1, d.erkenOyunPpm);
    let h = `<p>${adet === null ? "Bir birlik için gereken" : `${fmt(adet)} birlik için gereken`}: <b>${teklif.maliyet.map(([mal, miktar]) => `${esc(this.malAdi(mal))} ${sayi(miktar / 1000, 3)}`).join(" · ")}</b></p>`;
    h += `<p>Parti süresi: ${esc(sureMetni(teklif.sureMs / SAAT))}. Bütün birlikler parti tamamlanınca eklenir.</p>`;
    if (adet !== null) h += `<p>Tamamlandıktan sonra ek maaş: ${paraMili(adet * this.p.ic.param.askeri.birlikMaasiSaat, "yukari")}/sa. İkmal ayrıca tüketilir.</p>`;
    const engel = this.engel(b, birlik, adet, d);
    if (engel) h += `<p class="ord-uyari">${esc(engel)}</p>`;
    return h + this.yonlendirmeHtml(b, birlik, d, adet);
  }

  private ikmalHtml(b: OrduBolgesi): string {
    let h = '<h5>İkmal hazırlığı</h5>';
    if (b.ikmalSaat === undefined) return h + '<p class="ipucu-metin">İkmal kalemleri sunucudan bekleniyor.</p>';
    const kalemler = [...b.ikmalSaat].filter(([, talep]) => talep > 0).map(([mal, talep]) => {
      const stok = b.stoklar.get(mal) ?? 0;
      return { mal, talep, stok, saat: stok / talep };
    }).sort((a, c) => a.saat - c.saat || a.mal.localeCompare(c.mal, "tr"));
    if (!kalemler.length) return h + '<p>Saatlik ikmal: mevcut birlikler için talep yok.</p>';
    h += '<p class="ipucu-metin">Saatlik ikmal: mevcut hazır birliklerin gerçek talebi. Saat karşılığı yalnız yerel stok ÷ saatlik ikmal talebidir; üretim, diğer tüketimler ve kuyruktan gelecek birlikler hesaba katılmaz.</p>';
    h += '<div class="ord-ikmal-kaydir"><table class="ord-ikmal"><caption>Bu işletmenin ikmal malları; stok karşılığı en az olan mal önce gösterilir.</caption><thead><tr><th scope="col">Mal</th><th scope="col">Talep / sa</th><th scope="col">Yerel stok</th><th scope="col">Stok / talep (sa)</th><th scope="col">Tedarik</th></tr></thead><tbody>';
    for (const k of kalemler) {
      const ad = this.p.ic.mallar[this.p.ic.malIdx[k.mal] ?? -1]?.ad ?? k.mal;
      const dusuk = k.saat < 1;
      const saat = k.saat > 0 && k.saat < 0.001 ? "0,001'den az" : sayi(k.saat, 3);
      h += `<tr${dusuk ? ' class="ord-ikmal-dusuk"' : ""}><th scope="row">${esc(ad)}${dusuk ? '<span class="ord-ikmal-etiket">Bir saatlik talebin altında</span>' : ""}</th><td>${sayi(k.talep / 1000, 3)}</td><td>${sayi(k.stok / 1000, 3)}</td><td>${esc(saat)}</td><td><button type="button" class="eylem" data-mulk-tedarik="${esc(k.mal)}" data-bolge="${esc(b.id)}" aria-label="${esc(`${b.ad}: ${ad} tedarikine git`)}">Tedarike git</button></td></tr>`;
    }
    return h + '</tbody></table></div>';
  }

  html(): string {
    const d = this.p.durum();
    if (!d) return '<p class="ipucu-metin">Birlik bilgisi yükleniyor…</p>';
    let h = `<h3>${ikon("shield", 18)} Birliklerim</h3><p class="ipucu-metin">Ordugâh kur, işletmenin stoklarından birlik üret ve savunma duruşunu seç.</p>`;
    h += `<div data-ordu-baskin>${this.baskinHtml(d)}</div>`;
    if (this.sonuc) h += `<p class="ord-sonuc${this.hata ? " ord-hata" : ""}" role="${this.hata ? "alert" : "status"}">${esc(this.sonuc)}</p>`;
    if (!d.bolgeler.length) return h + '<p>Birlik yönetimi için önce arsa edinip bir işletme kur.</p>';
    for (const b of d.bolgeler) {
      const mevcut = [...b.birlikler.values()].reduce((t, a) => t + a, 0);
      const kuyruk = b.partiler.reduce((t, a) => t + a.adet, 0);
      const revir = this.bekleyenRevir(b.id, d);
      const ikmalPpm = b.savunma?.ikmalPpm ?? b.ikmalPpm;
      h += `<section class="ord-bolge" data-ordu-bolge="${esc(b.id)}"><h4>${esc(b.ad)}</h4><dl class="ord-ozet"><div><dt>Hazır birlik</dt><dd>${fmt(mevcut)}</dd></div><div><dt>Üretimde</dt><dd>${fmt(kuyruk)}</dd></div><div><dt>Kapasite</dt><dd data-ordu-kapasite-kullanimi>${fmt(mevcut + kuyruk + (revir ?? 0))} / ${fmt(b.kapasite)}${revir === null ? " · revir bilinmiyor" : ""}</dd></div><div><dt>Revirde ayrılan yer</dt><dd data-ordu-revir-rezerv>${revir === null ? "Bilinmiyor" : fmt(revir)}</dd></div><div><dt>Ordugâh</dt><dd>${fmt(b.ordugahSayisi)}</dd></div><div data-ordu-ham-fallback${b.savunma !== undefined ? " hidden" : ""}><dt>Temel kuvvet (ham)</dt><dd>${b.savunma === undefined ? fmt(this.hamKuvvet(b)) : ""}</dd></div><div><dt>Birlik maaşı</dt><dd>${paraMili(mevcut * this.p.ic.param.askeri.birlikMaasiSaat, "yukari")}/sa</dd></div></dl>`;
      h += `<div data-ordu-savunma>${savunmaGorunumuHtml({ savunma: b.savunma, durus: b.durus })}</div>`;
      h += `<p data-ordu-ikmal-fallback${b.savunma !== undefined || mevcut === 0 ? " hidden" : ""}>İkmal karşılanması: <b>${yuzde(ikmalPpm / 10_000)}</b>.</p>`;
      h += `<div data-ordu-ikmal-uyari>${mevcut > 0 && ikmalPpm < PPM ? '<p class="ord-uyari">İkmal eksik. Bu işletmenin stoklarını ve tedarikini kontrol et; ikmal karşılanması kuvveti etkiler.</p>' : ""}</div>`;
      if (mevcut > 0) {
        h += this.ikmalHtml(b);
      }
      h += '<ul class="ord-envanter">';
      for (const birlik of this.p.ic.birlikler) {
        const adet = b.birlikler.get(birlik.id) ?? 0;
        if (adet > 0) h += `<li><span>${esc(birlik.ad)}</span><b>${fmt(adet)}</b></li>`;
      }
      h += '</ul>';
      if (b.partiler.length) {
        h += '<h5>Üretim kuyruğu</h5><ul class="ord-kuyruk">';
        for (const parti of b.partiler) h += `<li><span>${esc(this.birlikAdi(parti.birlik))} × ${fmt(parti.adet)}</span><span>${parti.bitis > d.simZamani ? `${esc(kalanSureMetni(parti.bitis - d.simZamani))} kaldı` : "Tamamlanma bilgisi bekleniyor…"}</span></li>`;
        h += '</ul><p class="ipucu-metin">Süren partiler kapasiteyi ayırır. Üretimler kendi bitiş saatlerinde tamamlanır.</p>';
      }
      if (b.ordugahSayisi === 0) h += '<p class="ord-uyari">Bu işletmede Ordugâh yok. İnşa menüsündeki Askeri grubundan kurabilirsin; inşaat tamamlanınca birlik kapasitesi açılır.</p>';
      else {
        h += '<h5>Birlik üret</h5><div class="ord-uretimler">';
        for (const birlik of this.p.ic.birlikler) {
          const adet = this.adetMetni(b.id, birlik.id);
          const engel = this.engel(b, birlik, birlikAdedi(adet), d);
          h += `<article class="ord-uret"><h6>${esc(birlik.ad)}</h6><label>Birlik adedi <input type="text" inputmode="numeric" autocomplete="off" data-ordu-adet data-bolge="${esc(b.id)}" data-birlik="${esc(birlik.id)}" value="${esc(adet)}"${this.gonderiliyor ? " readonly" : ""}></label><div data-ordu-teklif aria-live="polite">${this.teklifHtml(b, birlik, d)}</div><button type="button" class="eylem birincil" data-ordu-eylem="uret" data-bolge="${esc(b.id)}" data-birlik="${esc(birlik.id)}"${engel || this.gonderiliyor ? " disabled" : ""}>${this.gonderiliyor ? "İşleniyor…" : "Birlik üret"}</button></article>`;
        }
        h += '</div><p class="ipucu-metin">Gereken mallar başlarken bu işletmenin stoklarından düşer. Başka ildeki stok bu partiye doğrudan harcanmaz.</p>';
      }
      h += '<h5>Savunma duruşu</h5><div class="ord-durus" role="group" aria-label="Savunma duruşu">';
      for (const durus of ["normal", "savunma", "geri_cekil"] as const) h += `<button type="button" class="eylem" data-ordu-eylem="durus" data-bolge="${esc(b.id)}" data-durus="${durus}" aria-pressed="${b.durus === durus}"${this.gonderiliyor || b.durus === durus ? " disabled" : ""}>${esc(DURUS_ADI[durus])}</button>`;
      h += '</div><p class="ipucu-metin">Tercihin çevrimdışıyken de saklanır. Duruş değişikliği ikmal tüketimini artırmaz.</p></section>';
    }
    return h;
  }

  /** Form odağı nedeniyle tam çizim ertelenirken güncel savunma ve eğitim engelleri yenilenir. */
  yamala(kok: ParentNode): boolean {
    const d = this.p.durum();
    if (!d) {
      for (const dugme of kok.querySelectorAll<HTMLButtonElement>("button[data-ordu-gecis]")) dugme.disabled = true;
      return false;
    }
    const yonlendirmeOdaginiGeriKur = this.yonlendirmeOdagiYakala(kok);
    let bulundu = false;
    const baskin = kok.querySelector<HTMLElement>("[data-ordu-baskin]");
    if (baskin) {
      const gorunumuGeriKur = this.baskinGorunumunuYakala(kok);
      baskin.innerHTML = this.baskinHtml(d);
      gorunumuGeriKur?.();
      bulundu = true;
    }
    for (const panel of kok.querySelectorAll<HTMLElement>("[data-ordu-bolge]")) {
      const b = d.bolgeler.find((x) => x.id === panel.dataset["orduBolge"]);
      const slot = panel.querySelector<HTMLElement>("[data-ordu-savunma]");
      if (!slot) continue;
      bulundu = true;
      if (!b) {
        slot.innerHTML = '<p class="ipucu-metin">Bu işletmenin savunma bilgisi artık bulunamadı.</p>';
        for (const dugme of panel.querySelectorAll<HTMLButtonElement>("button[data-ordu-eylem='durus']")) dugme.disabled = true;
        for (const dugme of panel.querySelectorAll<HTMLButtonElement>("button[data-ordu-gecis]")) dugme.disabled = true;
        continue;
      }
      slot.innerHTML = savunmaGorunumuHtml({ savunma: b.savunma, durus: b.durus });
      const ham = panel.querySelector<HTMLElement>("[data-ordu-ham-fallback]");
      if (ham) {
        ham.hidden = b.savunma !== undefined;
        const deger = ham.querySelector<HTMLElement>("dd");
        if (deger) deger.textContent = b.savunma === undefined ? fmt(this.hamKuvvet(b)) : "";
      }
      const mevcut = [...b.birlikler.values()].reduce((t, a) => t + a, 0);
      const revir = this.bekleyenRevir(b.id, d);
      const rezerv = panel.querySelector<HTMLElement>("[data-ordu-revir-rezerv]");
      if (rezerv) rezerv.textContent = revir === null ? "Bilinmiyor" : fmt(revir);
      const kapasite = panel.querySelector<HTMLElement>("[data-ordu-kapasite-kullanimi]");
      if (kapasite) kapasite.textContent = `${fmt(mevcut + b.partiler.reduce((t, a) => t + a.adet, 0) + (revir ?? 0))} / ${fmt(b.kapasite)}${revir === null ? " · revir bilinmiyor" : ""}`;
      const ikmalPpm = b.savunma?.ikmalPpm ?? b.ikmalPpm;
      const ikmal = panel.querySelector<HTMLElement>("[data-ordu-ikmal-fallback]");
      if (ikmal) {
        ikmal.hidden = b.savunma !== undefined || mevcut === 0;
        ikmal.innerHTML = `İkmal karşılanması: <b>${yuzde(ikmalPpm / 10_000)}</b>.`;
      }
      const uyari = panel.querySelector<HTMLElement>("[data-ordu-ikmal-uyari]");
      if (uyari) uyari.innerHTML = mevcut > 0 && ikmalPpm < PPM ? '<p class="ord-uyari">İkmal eksik. Bu işletmenin stoklarını ve tedarikini kontrol et; ikmal karşılanması kuvveti etkiler.</p>' : "";
      for (const dugme of panel.querySelectorAll<HTMLButtonElement>("button[data-ordu-eylem='durus']")) {
        const secili = dugme.dataset["durus"] === b.durus;
        dugme.setAttribute("aria-pressed", String(secili));
        dugme.disabled = this.gonderiliyor || secili;
      }
      for (const kart of panel.querySelectorAll<HTMLElement>(".ord-uret")) {
        const input = kart.querySelector<HTMLInputElement>("input[data-ordu-adet]");
        const birlik = this.p.ic.birlikler.find((x) => x.id === input?.dataset["birlik"]);
        if (!input || !birlik) continue;
        this.girdiler.set(anahtar(b.id, birlik.id), input.value);
        const teklif = kart.querySelector<HTMLElement>("[data-ordu-teklif]");
        if (teklif) teklif.innerHTML = this.teklifHtml(b, birlik, d);
        const uret = kart.querySelector<HTMLButtonElement>("button[data-ordu-eylem='uret']");
        if (uret) uret.disabled = this.gonderiliyor || this.engel(b, birlik, birlikAdedi(input.value), d) !== null;
      }
    }
    yonlendirmeOdaginiGeriKur?.();
    return bulundu;
  }

  /** Yazım sırasında yalnız teklif ve düğme güncellenir; input odağı korunur. */
  girdi(input: HTMLInputElement): boolean {
    if (!input.hasAttribute("data-ordu-adet")) return false;
    const bolge = input.dataset["bolge"], id = input.dataset["birlik"];
    if (!bolge || !id) return false;
    this.girdiler.set(anahtar(bolge, id), input.value);
    const d = this.p.durum();
    const b = d?.bolgeler.find((x) => x.id === bolge);
    const birlik = this.p.ic.birlikler.find((x) => x.id === id);
    const kart = input.closest(".ord-uret");
    if (d && b && birlik && kart) {
      const teklif = kart.querySelector<HTMLElement>("[data-ordu-teklif]");
      if (teklif) teklif.innerHTML = this.teklifHtml(b, birlik, d);
      const dugme = kart.querySelector<HTMLButtonElement>("button[data-ordu-eylem='uret']");
      if (dugme) dugme.disabled = this.gonderiliyor || this.engel(b, birlik, birlikAdedi(input.value), d) !== null;
    }
    return true;
  }

  odagiYakala(kok: ParentNode): (() => void) | null {
    const baskinGorunumunuGeriKur = this.baskinGorunumunuYakala(kok);
    const yonlendirmeOdaginiGeriKur = this.yonlendirmeOdagiYakala(kok);
    const a = typeof document === "undefined" ? null : document.activeElement;
    if (!(a instanceof HTMLInputElement) || !a.hasAttribute("data-ordu-adet")) return yonlendirmeOdaginiGeriKur === null ? baskinGorunumunuGeriKur : () => { baskinGorunumunuGeriKur?.(); yonlendirmeOdaginiGeriKur(); };
    const bolge = a.dataset["bolge"], birlik = a.dataset["birlik"], bas = a.selectionStart, son = a.selectionEnd;
    this.girdiler.set(anahtar(bolge ?? "", birlik ?? ""), a.value);
    return () => {
      baskinGorunumunuGeriKur?.();
      const y = [...kok.querySelectorAll<HTMLInputElement>("input[data-ordu-adet]")].find((i) => i.dataset["bolge"] === bolge && i.dataset["birlik"] === birlik);
      if (!y) return;
      y.focus({ preventScroll: true });
      if (bas !== null && son !== null) y.setSelectionRange(bas, son);
    };
  }

  private yonlendirmeOdagiYakala(kok: ParentNode): (() => void) | null {
    const a = typeof document === "undefined" ? null : document.activeElement;
    if (a === null || !(a instanceof HTMLElement)) return null;
    const b = a.closest<HTMLButtonElement>("button[data-ordu-gecis]");
    if (!b) return null;
    const gorulen = orduYonlendirmeOku(b);
    if (!gorulen) return null;
    return () => {
      const yenisi = [...kok.querySelectorAll<HTMLButtonElement>("button[data-ordu-gecis]")].find((x) => JSON.stringify(orduYonlendirmeOku(x)) === JSON.stringify(gorulen));
      if (yenisi) yenisi.focus({ preventScroll: true });
      else [...kok.querySelectorAll<HTMLInputElement>("input[data-ordu-adet]")].find((x) => x.dataset["bolge"] === gorulen.bolge && x.dataset["birlik"] === gorulen.birlik)?.focus({ preventScroll: true });
    };
  }

  async eylem(e: OrduEylemi): Promise<void> {
    if (e.eylem === "uret") return this.uret(e.bolge, e.birlik, e.adet);
    return this.durus(e.bolge, e.durus);
  }

  async uret(bolge: string, birlikId: string, girdi: string | number): Promise<void> {
    if (this.gonderiliyor) return;
    const d = this.p.durum(), b = d?.bolgeler.find((x) => x.id === bolge);
    const birlik = this.p.ic.birlikler.find((x) => x.id === birlikId);
    const adet = birlikAdedi(String(girdi));
    if (!d || !b || !birlik) return this.reddet("Bu işletmenin birlik bilgisi artık bulunamadı.");
    const engel = this.engel(b, birlik, adet, d);
    if (engel || adet === null) return this.reddet(engel ?? "Geçerli bir birlik adedi yaz.");
    this.girdiler.set(anahtar(bolge, birlikId), String(girdi));
    await this.gonder({ tur: "birlik_uret", bolge, birlik: birlikId, adet }, `${fmt(adet)} ${birlik.ad} üretime alındı. Kuyruk bilgisi sunucudan güncellenecek.`);
  }

  async durus(bolge: string, durus: OrduDurusu): Promise<void> {
    if (this.gonderiliyor) return;
    const b = this.p.durum()?.bolgeler.find((x) => x.id === bolge);
    if (!b) return this.reddet("Bu işletmenin birlik bilgisi artık bulunamadı.");
    if (b.durus === durus) return;
    await this.gonder({ tur: "savunma_emri", bolge, durus }, `${b.ad}: ${DURUS_ADI[durus]} tercihi kaydedildi.`);
  }

  private reddet(mesaj: string): void { this.sonuc = mesaj; this.hata = true; this.p.degisti(); }
  private async gonder(komut: Extract<Komut, { tur: "birlik_uret" | "savunma_emri" }>, basari: string): Promise<void> {
    this.gonderiliyor = true;
    this.sonuc = "";
    this.p.degisti();
    try {
      const r = await this.p.komut(komut);
      this.hata = !r.tamam;
      this.sonuc = r.tamam ? basari : r.mesaj;
    } catch {
      this.hata = true;
      this.sonuc = "Sunucuya ulaşılamadı. Birlik durumunu kontrol edip yeniden deneyebilirsin.";
    } finally {
      this.gonderiliyor = false;
      this.p.degisti();
    }
  }
}
