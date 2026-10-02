/** Bütçeli kamu gıda siparişleri: ilçe ilanı, il ortak deposundan tam paket teslimi. */
import { carpBol } from "../sabit";
import { anlikMiktar, stokEkle } from "../stok";
import { MILI, PPM, SAAT } from "../tipler";
import type { Baglam, DerlenmisIcerik, Dunya, IlceKamuSiparisGorunumu, KamuSiparisi, KamuSiparisIlcesi, KamuTeslimGorunumu, Komut, KomutSonucu } from "../tipler";
import { MULKSUZ_PAKET } from "../mulksuz";
import { kamuIlceKimligi } from "./kamu";
import { kasaBul, kamuAlici, kamuFiyatTavani, kamuOdenekIptal, kamuOdenekOde, kamuOdenekRezerv, paraUzlastir } from "./kasa";

function etkin(d: Readonly<Dunya>, ic: DerlenmisIcerik): boolean {
  return !MULKSUZ_PAKET && d.mulk?.para !== undefined && ic.mulk?.p.kamuSiparis?.etkin === true;
}
function kayit(d: Readonly<Dunya>, ilce: string): KamuSiparisIlcesi | undefined {
  return d.mulk?.kamuSiparis?.ilceler.find((c) => c.ilce === ilce);
}
function paketBedeli(d: Readonly<Dunya>, ic: DerlenmisIcerik, s: KamuSiparisi): number {
  const mal = ic.malIndeks[s.mal];
  if (mal === undefined || ic.mulk === undefined) return 0;
  const fiyat = Math.min(s.ilanBirimFiyatMili, carpBol(d.pazar.fiyat[mal]!, s.fiyatPpm, PPM), kamuFiyatTavani(d, ic, mal));
  return carpBol(s.paketMili, fiyat, MILI);
}

/** Muhasebe uzlaştırmaz; ilan koşulları ve güncel fiyat korumasını açık alanlarla döndürür. */
export function kamuSiparisGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, ilce: string): IlceKamuSiparisGorunumu | undefined {
  if (MULKSUZ_PAKET || d.mulk === undefined || ic.mulk?.ilceler.has(ilce) !== true) return undefined;
  const k = kayit(d, ilce);
  const acik = etkin(d, ic);
  if (!acik && k === undefined) return undefined;
  const v: IlceKamuSiparisGorunumu = { etkin: acik, toplamTeslimMili: k?.toplamTeslimMili ?? 0, toplamOdemeMili: k?.toplamOdemeMili ?? 0 };
  if (k === undefined) return v;
  const s = k.siparis;
  v.siparis = {
    id: s.id, ilce: s.ilce, mal: s.mal, paketMili: s.paketMili, hedefPaket: s.hedefPaket,
    kalanPaket: s.kalanPaket, teslimSirasi: s.teslimSirasi, ilanBirimFiyatMili: s.ilanBirimFiyatMili,
    ilanPaketBedeliMili: s.ilanPaketBedeliMili, guncelPaketBedeliMili: paketBedeli(d, ic, s),
    acilisZamani: s.acilisZamani, bitis: s.bitis, durum: s.durum,
    rezervMili: s.rezervMili, odenenMili: s.odenenMili, serbestMili: s.serbestMili,
  };
  if (s.kapanisZamani !== undefined) v.siparis.kapanisZamani = s.kapanisZamani;
  return v;
}

/** Bütün teslim koşulları salt okuma; ret öncesinde tek bir tembel sayaç bile yazılmaz. */
function teslimEngeli(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: string, s: KamuSiparisi, bolge: string, bedel: number): string | undefined {
  if (!etkin(d, ic)) return "Kamu siparişleri kapalı.";
  if (s.durum !== "acik" || s.kalanPaket <= 0) return "Sipariş kapanmış.";
  if (d.zaman >= s.bitis) return "Siparişin süresi dolmuş.";
  const il = ic.mulk?.ilceler.get(s.ilce)?.il;
  const e = d.mulk?.isletmeler.find((e) => e.oyuncu === oyuncu && e.il === il);
  const b = e === undefined ? undefined : d.bolgeler[e.bolgeIndeksi];
  if (b === undefined || b.id !== bolge || b.sahip !== oyuncu || b.merkez === undefined) return "Aynı ilin kendi işletme deposundan teslim edin.";
  // ilceHucre özetinden yetki türetmek yerine gerçek sahipli parseli doğrular.
  if (d.mulk?.hucreler.some((h) => h.ilce === s.ilce && h.sahip === oyuncu) !== true) return "Bu ilçede size ait en az bir arsa gerekiyor.";
  const mal = ic.malIndeks[s.mal];
  if (mal === undefined || b.stoklar[mal] === undefined || anlikMiktar(b.stoklar[mal]!, d.zaman) < s.paketMili) return "İl ortak deposunda tam paket gıda bulunmuyor.";
  if (!Number.isSafeInteger(bedel) || bedel <= 0) return "Güncel paket bedeli sıfır; teslim yapılamıyor.";
  const o = d.oyuncular.find((o) => o.id === oyuncu);
  if (o === undefined || anlikMiktar(o.hazine, d.zaman) > o.hazine.kapasite - bedel) return "Hazine kapasitesi ödemenin tamamını alamıyor.";
  const para = d.mulk?.para;
  const kasa = para === undefined ? undefined : kasaBul(para, kamuIlceKimligi(s.ilce));
  if (s.rezervMili < s.ilanPaketBedeliMili || kasa === undefined || kasa.rezervOyuncu < s.rezervMili) return "Sipariş ödeneği yetersiz.";
  return undefined;
}

/** Yalnız ilgili ilde oyuncunun kendi düğümlerini/stoğunu gösterir; ilçe arsa koşulunu açıklamaya devam eder. */
export function kamuTeslimGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: string, ilce: string): KamuTeslimGorunumu[] {
  const s = kayit(d, ilce)?.siparis;
  if (s === undefined || !etkin(d, ic) || s.durum !== "acik") return [];
  const il = ic.mulk?.ilceler.get(ilce)?.il;
  const mal = ic.malIndeks[s.mal];
  const bedelMili = paketBedeli(d, ic, s);
  const sonuc: KamuTeslimGorunumu[] = [];
  for (const e of d.mulk?.isletmeler ?? []) {
    if (e.oyuncu !== oyuncu || e.il !== il) continue;
    const b = d.bolgeler[e.bolgeIndeksi];
    if (b === undefined || b.sahip !== oyuncu || b.merkez === undefined) continue;
    const engel = teslimEngeli(d, ic, oyuncu, s, b.id, bedelMili);
    const v: KamuTeslimGorunumu = { siparis: s.id, bolge: b.id, stokMili: mal === undefined ? 0 : anlikMiktar(b.stoklar[mal]!, d.zaman), paketMili: s.paketMili, bedelMili, teslimSirasi: s.teslimSirasi, uygun: engel === undefined };
    if (engel !== undefined) v.engel = engel;
    sonuc.push(v);
  }
  return sonuc;
}

function kapat(d: Dunya, s: KamuSiparisi, durum: "tamamlandi" | "suresi_doldu" | "iptal"): void {
  if (s.rezervMili > 0) {
    const r = kamuOdenekIptal(d, kamuIlceKimligi(s.ilce), s.rezervMili, "oyuncu");
    if (!r.tamam) throw new Error(`kamu siparis rezervi kapatilamadi: ${r.hata}`);
    s.serbestMili += s.rezervMili;
    s.rezervMili = 0;
  }
  s.durum = durum;
  s.kapanisZamani = d.zaman;
}

/** İzinli kural kapatma göçünde mevcut ilanı kapatır; aynı kural yüklemesinde çağrılmaz. */
export function kamuSiparisKuraliUyarla(d: Dunya, ic: DerlenmisIcerik): void {
  if (MULKSUZ_PAKET || etkin(d, ic)) return;
  for (const c of d.mulk?.kamuSiparis?.ilceler ?? []) if (c.siparis.durum === "acik") kapat(d, c.siparis, "iptal");
}

/** Mevcut saatlik olay: vade kapatma her saat; global tam deneme saatlerinde bütçeli açılış. */
export function kamuSiparisSaatlik(d: Dunya, ctx: Baglam): void {
  if (MULKSUZ_PAKET) return;
  const ic = ctx.ic;
  kamuSiparisKuraliUyarla(d, ic);
  if (!etkin(d, ic)) return;
  for (const c of d.mulk?.kamuSiparis?.ilceler ?? []) if (c.siparis.durum === "acik" && d.zaman >= c.siparis.bitis) kapat(d, c.siparis, "suresi_doldu");
  const p = ic.mulk!.p.kamuSiparis!;
  const saat = Math.floor(d.zaman / SAAT);
  if (saat % p.denemeSaat !== 0 || d.mulk!.kamuSiparis?.sonDenemeSaati === saat) return;
  const durum = d.mulk!.kamuSiparis ??= { sonDenemeSaati: saat, ilceler: [] };
  durum.sonDenemeSaati = saat;
  paraUzlastir(d, ic);
  const mal = ic.malIndeks.gida!;
  const fiyat = Math.min(carpBol(d.pazar.fiyat[mal]!, p.fiyatPpm, PPM), kamuFiyatTavani(d, ic, mal));
  const bedel = carpBol(p.paketMili, fiyat, MILI);
  if (bedel <= 0) return;
  const kp = ic.mulk!.p.kasa!;
  for (const ilce of [...ic.mulk!.ilceler.keys()].sort()) {
    const onceki = kayit(d, ilce);
    if (onceki !== undefined && (onceki.siparis.durum === "acik" || d.zaman < onceki.siparis.kapanisZamani! + onceki.siparis.tekrarMs)) continue;
    const kasa = kamuIlceKimligi(ilce);
    const alici = kamuAlici(d, ic, kasa)!;
    const k = kasaBul(d.mulk!.para!, kasa);
    const tavan = Math.min(alici.bakiye, carpBol(alici.bakiye, kp.tekAlimTavaniPpm, PPM), alici.haftalikButce - alici.haftalikKullanilan,
      carpBol(alici.pencereGiris, kp.oyuncuPayiTavaniPpm, PPM) - alici.pencereOyuncu - (k?.rezervOyuncu ?? 0));
    const adet = Math.min(p.azamiPaket, Math.floor(tavan / bedel));
    if (adet <= 0) continue;
    const rezerv = bedel * adet;
    const r = kamuOdenekRezerv(d, ic, kasa, rezerv, "oyuncu");
    if (!r.tamam) continue;
    const s: KamuSiparisi = { id: `kamu:${ctx.yeniKimlik(d)}`, ilce, mal: "gida", paketMili: p.paketMili, hedefPaket: adet, kalanPaket: adet, teslimSirasi: 0,
      ilanBirimFiyatMili: fiyat, ilanPaketBedeliMili: bedel, fiyatPpm: p.fiyatPpm, acilisZamani: d.zaman, bitis: d.zaman + p.sureSaat * SAAT,
      tekrarMs: p.tekrarSaat * SAAT, durum: "acik", rezervMili: rezerv, odenenMili: 0, serbestMili: 0 };
    if (onceki !== undefined) onceki.siparis = s;
    else durum.ilceler.push({ ilce, siparis: s, toplamTeslimMili: 0, toplamOdemeMili: 0 });
  }
  durum.ilceler.sort((a, b) => a.ilce < b.ilce ? -1 : a.ilce > b.ilce ? 1 : 0);
}

/** Bir paket: saf önkontrol tamamlandıktan sonra tam stok ve kasadan tam ödeme birlikte yazılır. */
export function kamuTeslim(d: Dunya, ctx: Baglam, oyuncu: string, komut: Extract<Komut, { tur: "kamu_teslim" }>): KomutSonucu {
  const ret = (hata: string): KomutSonucu => ({ tamam: false, hata });
  if (!etkin(d, ctx.ic)) return ret("Kamu siparişleri kapalı.");
  const k = d.mulk?.kamuSiparis?.ilceler.find((c) => c.siparis.id === komut.siparis);
  if (k === undefined) return ret("Sipariş bulunamadı; ilanı yenileyin.");
  const s = k.siparis;
  if (!Number.isSafeInteger(komut.teslimSirasi) || komut.teslimSirasi !== s.teslimSirasi) return ret("Teslim sırası değişmiş; ilanı yenileyin.");
  const bedel = paketBedeli(d, ctx.ic, s);
  if (!Number.isSafeInteger(komut.bedelMili) || komut.bedelMili <= 0 || komut.bedelMili !== bedel) return ret("Paket bedeli değişmiş; güncel teklifi yenileyin.");
  const engel = teslimEngeli(d, ctx.ic, oyuncu, s, komut.bolge, bedel);
  if (engel !== undefined) return ret(engel);
  const b = d.bolgeler.find((b) => b.id === komut.bolge)!;
  const mal = ctx.ic.malIndeks[s.mal]!;
  const fark = s.ilanPaketBedeliMili - bedel;
  const delta = stokEkle(d, ctx, b.indeks, mal, -s.paketMili);
  if (delta !== -s.paketMili) throw new Error("kamu tesliminde tam paket stok dusmedi");
  const odeme = kamuOdenekOde(d, ctx.ic, kamuIlceKimligi(s.ilce), bedel, "oyuncu", oyuncu);
  if (!odeme.tamam) throw new Error(`kamu teslim odemesi: ${odeme.hata}`);
  if (fark > 0) {
    const r = kamuOdenekIptal(d, kamuIlceKimligi(s.ilce), fark, "oyuncu");
    if (!r.tamam) throw new Error(`kamu teslim rezerv farki: ${r.hata}`);
  }
  s.rezervMili -= s.ilanPaketBedeliMili;
  s.odenenMili += bedel;
  s.serbestMili += fark;
  s.kalanPaket--;
  s.teslimSirasi++;
  k.toplamTeslimMili += s.paketMili;
  k.toplamOdemeMili += bedel;
  if (s.kalanPaket === 0) kapat(d, s, "tamamlandi");
  return { tamam: true };
}
