import { GUN, MILI, PPM, SAAT } from "../tipler";
import type { Baglam, BaskinDurumu, DerlenmisIcerik, Dunya, EskiyaGenelGorunumu, EskiyaIlceGorunumu, EskiyaOyuncuGorunumu, EskiyaOyuncuSonucu } from "../tipler";
import { carpBol } from "../sabit";
import { kuyrukSuz } from "../kuyruk";
import { stokEkle, stokUzlastir } from "../stok";
import { icerikTablosu } from "../ekonomi/tablo";
import { askeriUykudaMi } from "./durum";
import { SAPMA_ALT_PPM, SAPMA_UST_PPM, savunmaGucuGorunumu } from "./savas";

function sinirliOlaylar(olaylar: EskiyaGenelGorunumu[]): EskiyaGenelGorunumu[] {
  const gecmis = new Set(olaylar.filter((b) => b.evre === "bitti" || b.evre === "iptal").slice(-10).map((b) => b.id));
  return olaylar.filter((b) => b.evre === "duyuru" || b.evre === "pencere" || gecmis.has(b.id));
}

function genelOlay(b: BaskinDurumu, zaman: number): EskiyaGenelGorunumu | undefined {
  if (!b.duyuruldu || b.evre === "planli" || b.duyuruZamani > zaman) return undefined;
  const g: EskiyaGenelGorunumu = {
    id: b.id, il: b.il, ilce: b.ilce, evre: b.evre,
    duyuruZamani: b.duyuruZamani, pencereBaslangic: b.pencereBaslangic, pencereBitis: b.pencereBitis,
    tahminAltGuc: b.tahminAltGuc, tahminUstGuc: b.tahminUstGuc,
  };
  if (b.sonuc !== null) g.sonuc = { kazandi: b.sonuc.kazandi, baskinGucu: b.sonuc.baskinGucu, savunmaGucu: b.sonuc.savunmaGucu };
  return g;
}

/** Güvenli genel görünüm: planlı kayıt ve sonuçtan önce gerçek güç/boy dışarı çıkmaz. */
export function eskiyaIlceGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, ilce: string): EskiyaIlceGorunumu | undefined {
  const p = ic.param.askeri.eskiya;
  if (p === undefined || ic.mulk === undefined || d.mulk === undefined) return undefined;
  return { etkin: p.etkin, olaylar: sinirliOlaylar((d.baskinlar ?? []).flatMap((b) => {
    const g = b.ilce === ilce ? genelOlay(b, d.zaman) : undefined;
    return g === undefined ? [] : [g];
  })) };
}

/** Güvenli sahibin görünümü; hiçbir yabancı katılımcı veya ödül satırı taşınmaz. */
export function eskiyaOyuncuGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: string): EskiyaOyuncuGorunumu | undefined {
  const p = ic.param.askeri.eskiya;
  if (p === undefined || ic.mulk === undefined || d.mulk === undefined) return undefined;
  const g: EskiyaOyuncuGorunumu = { etkin: p.etkin, olaylar: [], sonuclar: [], revir: [] };
  for (const b of d.baskinlar ?? []) {
    const ilgili = b.hedefler.some((h) => h.oyuncu === oyuncu) || b.katilimcilar.some((k) => k.oyuncu === oyuncu)
      || d.mulk.hucreler.some((h) => h.ilce === b.ilce && h.sahip === oyuncu)
      || d.mulk.isletmeler.some((e) => e.oyuncu === oyuncu && e.il === b.il && d.bolgeler[e.bolgeIndeksi]?.savunma.durus === "savunma");
    const olay = ilgili ? genelOlay(b, d.zaman) : undefined;
    if (olay === undefined) continue;
    g.olaylar.push(olay);
    for (const s of b.sonuc?.oyuncular ?? []) if (s.oyuncu === oyuncu) {
      g.sonuclar.push(structuredClone(s.kayit));
      if (s.revir !== undefined) g.revir.push(structuredClone(s.revir));
    }
  }
  g.olaylar = sinirliOlaylar(g.olaylar);
  const sonKimlikler = new Set(g.sonuclar.map((s) => s.baskin).filter((id, i, a) => a.indexOf(id) === i).slice(-10));
  g.sonuclar = g.sonuclar.filter((s) => sonKimlikler.has(s.baskin));
  g.revir = g.revir.filter((r) => r.evre === "bekliyor" || sonKimlikler.has(r.baskin));
  return g;
}

/** Kurulum/göçte tek günlük olay; kapatmada bitmemiş planlar iptal, revir olayları korunur. */
export function eskiyaTakvimiUyarla(d: Dunya, ctx: Baglam): void {
  if (ctx.ic.mulk === undefined || d.mulk === undefined) return;
  if (ctx.ic.param.askeri.eskiya?.etkin !== true) {
    for (const b of d.baskinlar ?? []) if (b.evre !== "bitti" && b.evre !== "iptal") b.evre = "iptal";
    kuyrukSuz(d.kuyruk, (o) => !["eskiya_gunluk", "eskiya_duyuru", "eskiya_pencere_ac", "eskiya_pencere_kapa"].includes(o.veri.tur));
    if (d.eskiyaTakvim?.etkin === true) { d.eskiyaTakvim.etkin = false; ctx.kirlet(d); }
    return;
  }
  d.baskinlar ??= [];
  d.eskiyaTakvim ??= { sonGun: Math.floor(d.zaman / GUN) - 1, etkin: true };
  if (!d.eskiyaTakvim.etkin) { d.eskiyaTakvim.etkin = true; ctx.kirlet(d); }
  if (!d.kuyruk.some((o) => o.veri.tur === "eskiya_gunluk")) {
    const gun = Math.max(Math.ceil(d.zaman / GUN), d.eskiyaTakvim.sonGun + 1);
    ctx.planla(d, gun * GUN, { tur: "eskiya_gunluk" });
  }
}

function uygunSahip(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: string): boolean {
  const o = d.oyuncular.find((x) => x.id === oyuncu);
  return o !== undefined && o.korumaBitis <= d.zaman && !askeriUykudaMi(d, ic, oyuncu);
}

interface EkonomikYapi { oyuncu: string; dugum: string; ilce: string; id: number; yuva: number; deger: number; tesis: boolean }

/** Konum yalnız kayıtlı bütün hücrelerden çözülür; eksik ya da ilçeler arası yapı başka ilçeye atanmaz. */
function ekonomikYapilar(d: Readonly<Dunya>, ic: DerlenmisIcerik): EkonomikYapi[] {
  if (d.mulk === undefined || ic.mulk === undefined) return [];
  const hucreler = new Map(d.mulk.hucreler.map((h) => [h.id, h]));
  const konum = (ids: readonly string[] | undefined, sahip: string): string | undefined => {
    if (ids === undefined || ids.length === 0) return undefined;
    const ilce = hucreler.get(ids[0]!)?.ilce;
    return ilce !== undefined && ids.every((id) => { const h = hucreler.get(id); return h?.sahip === sahip && h.ilce === ilce; }) ? ilce : undefined;
  };
  const deger = (para: number, mal: ReadonlyArray<readonly [number, number]>, olcek: number): number => {
    const c = ic.param.sanayi?.olcekKademeleri[olcek]?.insaPpm ?? PPM;
    let x = carpBol(para, c, PPM);
    for (const [m, q] of mal) x += carpBol(carpBol(q, c, PPM), ic.mallar[m]!.tabanFiyat, MILI);
    return x;
  };
  const sonuc: EkonomikYapi[] = [];
  const tablo = icerikTablosu(ic);
  for (const e of d.mulk.isletmeler) {
    const b = d.bolgeler[e.bolgeIndeksi];
    if (b?.sahip !== e.oyuncu) continue;
    for (const t of b.tesisler) {
      const ilce = konum(t.hucreler, e.oyuncu);
      const tanim = tablo.tur[t.tur];
      if (ilce !== undefined && tanim !== undefined) sonuc.push({ oyuncu: e.oyuncu, dugum: b.id, ilce, id: t.id, yuva: t.hucreler!.length, deger: deger(tanim.insaParasi, tanim.insaMaliyeti, t.olcek ?? 0), tesis: true });
    }
    for (const y of b.ekYapilar ?? []) {
      if (["ordugah", "karakol", "gozetleme_kulesi"].includes(y.tur)) continue;
      const ilce = konum(y.hucreler, e.oyuncu);
      const yi = ic.mulk.ekYapiIndeks.get(y.tur);
      const tanim = yi === undefined ? undefined : ic.mulk.ekYapilar[yi];
      if (ilce !== undefined && tanim !== undefined) sonuc.push({ oyuncu: e.oyuncu, dugum: b.id, ilce, id: y.id, yuva: y.hucreler.length, deger: deger(tanim.insaParasi, tanim.insaMaliyeti, y.dukkan?.olcek ?? 0), tesis: false });
    }
  }
  return sonuc;
}

function ozelYapiIlcede(d: Readonly<Dunya>, hucreler: readonly string[], ilce: string, sahip: string): boolean {
  return hucreler.length > 0 && hucreler.every((id) => d.mulk?.hucreler.some((h) => h.id === id && h.ilce === ilce && h.sahip === sahip));
}

/** Günlük kanonik plan; olasılık yalnız tüm uygunluk koşulları geçince çekilir. */
export function eskiyaGunluk(d: Dunya, ctx: Baglam): void {
  const p = ctx.ic.param.askeri.eskiya;
  if (p?.etkin !== true || d.mulk === undefined || ctx.ic.mulk === undefined) { eskiyaTakvimiUyarla(d, ctx); return; }
  const gun = Math.floor(d.zaman / GUN);
  d.eskiyaTakvim ??= { sonGun: gun - 1, etkin: true };
  if (d.eskiyaTakvim.sonGun >= gun) return;
  d.eskiyaTakvim.sonGun = gun;
  d.baskinlar ??= [];
  const yapilar = ekonomikYapilar(d, ctx.ic);
  const iller = [...new Set(d.mulk.ilceler.map((i) => i.il))].sort();
  for (const ilce of [...d.mulk.ilceler].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    if (!ctx.ic.mulk.ilceler.has(ilce.id)) continue;
    if (d.baskinlar.some((b) => b.ilce === ilce.id && b.evre !== "bitti" && b.evre !== "iptal")) continue;
    const biten = d.baskinlar.filter((b) => b.ilce === ilce.id && b.evre === "bitti");
    const son = biten[biten.length - 1];
    if (son !== undefined && gun - Math.floor(son.pencereBaslangic / GUN) < p.beklemeGun) continue;
    let servet = 0;
    for (const h of d.mulk.hucreler) if (h.ilce === ilce.id && uygunSahip(d, ctx.ic, h.sahip)) servet += h.degerMili;
    for (const y of yapilar) if (y.ilce === ilce.id && uygunSahip(d, ctx.ic, y.oyuncu)) servet += y.deger;
    if (servet < p.servetEsigiMili || ctx.rastgeleAralik(d, "savas", PPM) >= p.gunlukOlasilikPpm) continue;
    const boy = Math.min(p.enCokBoy, Math.max(1, Math.floor(servet / p.servetAdimiMili)));
    const bant = iller.indexOf(ilce.il) % p.dilimSayisi;
    const baslangic = (gun + p.planlamaOncesiGun) * GUN + (p.bantBaslangicSaat + bant * p.dilimSaat) * SAAT;
    const kule = d.mulk.isletmeler.some((e) => e.il === ilce.il && uygunSahip(d, ctx.ic, e.oyuncu)
      && (d.bolgeler[e.bolgeIndeksi]?.ekYapilar ?? []).some((y) => y.tur === "gozetleme_kulesi" && ozelYapiIlcede(d, y.hucreler, ilce.id, e.oyuncu)));
    const gb = boy * p.boyGucu;
    const b: BaskinDurumu = {
      id: ctx.yeniKimlik(d), il: ilce.il, ilce: ilce.id, boy, gb, bant,
      duyuruZamani: baslangic - (p.duyuruSaat + (kule ? p.kuleEkiSaat : 0)) * SAAT,
      pencereBaslangic: baslangic, pencereBitis: baslangic + p.dilimSaat * SAAT,
      tahminAltGuc: carpBol(gb, kule ? p.kuleTahminAltPpm : p.tahminAltPpm, PPM),
      tahminUstGuc: carpBol(gb, kule ? p.kuleTahminUstPpm : p.tahminUstPpm, PPM),
      evre: "planli", duyuruldu: false, katilimcilar: [], hedefler: [], sonuc: null,
    };
    d.baskinlar.push(b);
    ctx.planla(d, b.duyuruZamani, { tur: "eskiya_duyuru", baskin: b.id });
    ctx.planla(d, b.pencereBaslangic, { tur: "eskiya_pencere_ac", baskin: b.id });
    ctx.planla(d, b.pencereBitis, { tur: "eskiya_pencere_kapa", baskin: b.id });
  }
  if (!d.kuyruk.some((o) => o.veri.tur === "eskiya_gunluk")) ctx.planla(d, (gun + 1) * GUN, { tur: "eskiya_gunluk" });
}

export function eskiyaDuyuru(d: Dunya, ctx: Baglam, id: number): void {
  if (ctx.ic.param.askeri.eskiya?.etkin !== true) { eskiyaTakvimiUyarla(d, ctx); return; }
  const b = d.baskinlar?.find((b) => b.id === id);
  if (b?.evre === "planli") { b.evre = "duyuru"; b.duyuruldu = true; }
}

/** Açılıştaki hedef ve kişisel katkılar kilitlidir; aynı düğüm eşzamanlı iki pencereye katkı vermez. */
export function eskiyaPencereAc(d: Dunya, ctx: Baglam, id: number): void {
  const p = ctx.ic.param.askeri.eskiya;
  if (p?.etkin !== true || d.mulk === undefined) { eskiyaTakvimiUyarla(d, ctx); return; }
  const b = d.baskinlar?.find((b) => b.id === id);
  if (b?.evre !== "duyuru") return;
  const yapilar = ekonomikYapilar(d, ctx.ic);
  const karakollar: { id: number; oyuncu: string; dugum: string }[] = [];
  for (const e of d.mulk.isletmeler) {
    if (e.il !== b.il || !uygunSahip(d, ctx.ic, e.oyuncu)) continue;
    const dugum = d.bolgeler[e.bolgeIndeksi];
    if (dugum?.sahip !== e.oyuncu) continue;
    const kendi = yapilar.filter((y) => y.dugum === dugum.id);
    const hedef = kendi.filter((y) => y.ilce === b.ilce);
    if (d.mulk.hucreler.some((h) => h.ilce === b.ilce && h.sahip === e.oyuncu)) {
      const payda = kendi.reduce((t, y) => t + y.yuva, 0);
      b.hedefler.push({ oyuncu: e.oyuncu, dugum: dugum.id, payPpm: payda > 0 ? carpBol(hedef.reduce((t, y) => t + y.yuva, 0), PPM, payda) : 0,
        tesisler: hedef.filter((y) => y.tesis).map((y) => [y.id, y.yuva]) });
    }
    if (dugum.savunma.durus === "geri_cekil") continue;
    const ilcedeYapi = dugum.tesisler.some((t) => t.hucreler !== undefined && ozelYapiIlcede(d, t.hucreler, b.ilce, e.oyuncu))
      || (dugum.ekYapilar ?? []).some((y) => ozelYapiIlcede(d, y.hucreler, b.ilce, e.oyuncu));
    if (dugum.savunma.durus !== "savunma" && !ilcedeYapi) continue;
    if (d.baskinlar!.some((x) => x.id !== b.id && x.evre === "pencere" && x.katilimcilar.some((k) => k.dugum === dugum.id))) continue;
    let ham = 0;
    const birlikler: [string, number][] = [];
    dugum.birlikler.forEach((adet, i) => { const tanim = ctx.ic.birlikler[i]; if (adet > 0 && tanim !== undefined) { ham += adet * tanim.guc; birlikler.push([tanim.id, adet]); } });
    let guc = carpBol(ham, dugum.ikmalKarsilanmaPpm, PPM);
    if (dugum.savunma.durus === "savunma") guc = carpBol(guc, ctx.ic.param.askeri.savunmaDurusuCarpaniPpm, PPM);
    b.katilimcilar.push({ oyuncu: e.oyuncu, dugum: dugum.id, guc, birlikler });
    for (const y of dugum.ekYapilar ?? []) if (y.tur === "karakol" && ozelYapiIlcede(d, y.hucreler, b.ilce, e.oyuncu)) karakollar.push({ id: y.id, oyuncu: e.oyuncu, dugum: dugum.id });
  }
  karakollar.sort((a, b) => a.id - b.id).slice(0, 2).forEach((y, i) => { const k = b.katilimcilar.find((k) => k.dugum === y.dugum)!; k.guc += p.karakolGuc[i]!; });
  b.evre = "pencere";
}

/** Sabit 24 saat defterinin tek yağma oranı noktası; 0 oran durum oluşturmaz. */
export function yagmaTavaniUygula(d: Dunya, ctx: Baglam, bi: number, oranPpm: number): number {
  if (!Number.isSafeInteger(oranPpm) || oranPpm < 0 || oranPpm > PPM) throw new RangeError("yagmaTavaniUygula: gecersiz oran");
  const b = d.bolgeler[bi];
  if (ctx.ic.mulk === undefined || b?.merkez === undefined) return 0;
  const sure = (ctx.ic.param.askeri.eskiya?.yagmaPenceresiSaat ?? ctx.ic.param.askeri.pencereSaat) * SAAT;
  const suren = b.yagmaPenceresi !== undefined && d.zaman < b.yagmaPenceresi.baslangic + sure ? b.yagmaPenceresi : undefined;
  const kullanilan = suren?.kullanilanPpm ?? 0;
  const f = Math.min(oranPpm, Math.max(0, ctx.ic.param.askeri.kayipTavaniPpm - kullanilan));
  if (f > 0) b.yagmaPenceresi = { baslangic: suren?.baslangic ?? d.zaman, kullanilanPpm: kullanilan + f };
  return f;
}

/** Sonuç tek kez uygulanır; mal/para/parsel yetkileri mevcut çekirdek yollarıyla sınırlıdır. */
export function eskiyaPencereKapa(d: Dunya, ctx: Baglam, id: number): void {
  const p = ctx.ic.param.askeri.eskiya;
  if (p?.etkin !== true || d.mulk === undefined || ctx.ic.mulk === undefined) { eskiyaTakvimiUyarla(d, ctx); return; }
  const b = d.baskinlar?.find((b) => b.id === id);
  if (b?.evre !== "pencere") return;
  const aralik = SAPMA_UST_PPM - SAPMA_ALT_PPM + 1;
  const baskinSapma = SAPMA_ALT_PPM + ctx.rastgeleAralik(d, "savas", aralik);
  const savunmaSapma = SAPMA_ALT_PPM + ctx.rastgeleAralik(d, "savas", aralik);
  const merkez = ctx.ic.mulk.ilMerkezi.get(b.il);
  const arazi = merkez === undefined ? PPM : (savunmaGucuGorunumu(d, ctx, merkez)?.araziPpm ?? PPM);
  const toplam = p.nobetEviGuc + b.katilimcilar.reduce((s, k) => s + k.guc, 0);
  const baskinGucu = carpBol(b.gb, baskinSapma, PPM);
  const savunmaGucu = carpBol(carpBol(toplam, arazi, PPM), savunmaSapma, PPM);
  const kazandi = savunmaGucu >= baskinGucu;
  const sonuc: NonNullable<BaskinDurumu["sonuc"]> = {
    kazandi, baskinGucu, savunmaGucu, kamuGucu: carpBol(carpBol(p.nobetEviGuc, arazi, PPM), savunmaSapma, PPM), ganimetDegeriMili: 0, oyuncular: [],
  };
  const hafta = Math.floor(Math.floor(d.zaman / GUN) / 7);
  let verilenDeger = 0;
  for (const eski of d.baskinlar ?? []) if (eski.ilce === b.ilce && eski.sonuc !== null && Math.floor(Math.floor(eski.pencereBitis / GUN) / 7) === hafta) {
    verilenDeger += eski.sonuc.ganimetDegeriMili;
  }
  const havuz: [string, number][] = Object.keys(p.ganimet).sort().map((mal) => [mal, p.ganimet[mal]! * b.boy]);
  let havuzDegeri = 0;
  for (const [mal, miktar] of havuz) havuzDegeri += carpBol(miktar, ctx.ic.mallar[ctx.ic.malIndeks[mal]!]!.tabanFiyat, MILI);
  const kalan = Math.max(0, p.ilceHaftalikGanimetTavaniMili - verilenDeger);
  const havuzPpm = havuzDegeri <= kalan || havuzDegeri === 0 ? PPM : carpBol(kalan, PPM, havuzDegeri);
  const sahipler = new Map<string, string>();
  for (const h of b.hedefler) sahipler.set(h.dugum, h.oyuncu);
  for (const k of b.katilimcilar) sahipler.set(k.dugum, k.oyuncu);
  for (const [dugumId, oyuncu] of [...sahipler].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) {
    const dugum = d.bolgeler.find((x) => x.id === dugumId);
    if (dugum?.sahip !== oyuncu) continue;
    const k = b.katilimcilar.find((x) => x.dugum === dugumId && x.oyuncu === oyuncu);
    const h = b.hedefler.find((x) => x.dugum === dugumId && x.oyuncu === oyuncu);
    const kayit: EskiyaOyuncuSonucu = {
      baskin: b.id, il: b.il, ilce: b.ilce, dugum: dugumId, zaman: d.zaman, kazandi,
      katkiGuc: k === undefined ? 0 : carpBol(carpBol(k.guc, arazi, PPM), savunmaSapma, PPM),
      birlikKaybi: [], malKaybi: [], ganimet: [], ganimetTasma: [], onarim: [],
    };
    const satir: NonNullable<BaskinDurumu["sonuc"]>["oyuncular"][number] = { oyuncu, kayit };
    const revir: [string, number][] = [];
    for (const [birlik, kilitli] of k?.birlikler ?? []) {
      const i = ctx.ic.birlikIndeks[birlik];
      if (i === undefined) continue;
      const kayip = Math.min(dugum.birlikler[i] ?? 0, carpBol(kilitli, kazandi ? p.galibiyetKayipPpm : p.yenilgiKayipPpm, PPM));
      if (kayip <= 0) continue;
      dugum.birlikler[i] = (dugum.birlikler[i] ?? 0) - kayip;
      kayit.birlikKaybi.push([birlik, kayip]);
      const donus = carpBol(kayip, p.reviriGeriPpm, PPM);
      if (donus > 0) revir.push([birlik, donus]);
    }
    if (revir.length > 0) satir.revir = { baskin: b.id, dugum: dugumId, donusZamani: d.zaman + p.reviriGeriSaat * SAAT, birlikler: revir, evre: "bekliyor" };
    if (!kazandi && h !== undefined && uygunSahip(d, ctx.ic, oyuncu)) {
      const o = d.oyuncular.find((x) => x.id === oyuncu)!;
      const taban = d.zaman < o.korumaBitis + 14 * GUN ? p.kalkanSonrasiYagmaPpm : p.yagmaOraniPpm;
      const oran = yagmaTavaniUygula(d, ctx, dugum.indeks, carpBol(taban, h.payPpm, PPM));
      if (oran > 0) dugum.stoklar.forEach((s, m) => {
        const tanim = ctx.ic.mallar[m]!;
        if (tanim.depolanabilir === false) return;
        stokUzlastir(d, dugum.indeks, m);
        const miktar = carpBol(s.miktar, oran, PPM);
        const gercek = miktar > 0 ? -stokEkle(d, ctx, dugum.indeks, m, -miktar) : 0;
        if (gercek > 0) kayit.malKaybi.push([tanim.id, gercek]);
      });
      let yuvaButcesi = carpBol(h.tesisler.reduce((s, [, yuva]) => s + yuva, 0), p.yapiDevreDisiPpm, PPM);
      for (const [id, yuva] of [...h.tesisler].sort((a, b) => a[0] - b[0])) {
        if (yuva > yuvaButcesi) continue;
        const tesis = dugum.tesisler.find((x) => x.id === id);
        if (tesis === undefined) continue;
        yuvaButcesi -= yuva;
        tesis.onarimBitis = Math.max(tesis.onarimBitis ?? 0, d.zaman + p.yapiDevreDisiSaat * SAAT);
        kayit.onarim.push([tesis.id, tesis.onarimBitis]);
      }
    }
    if (kazandi && k !== undefined && toplam > 0 && carpBol(k.guc, PPM, b.gb) >= p.ganimetKatkiAltPpm) {
      for (const [mal, miktar] of havuz) {
        const q = carpBol(carpBol(miktar, havuzPpm, PPM), k.guc, toplam);
        if (q <= 0) continue;
        const mi = ctx.ic.malIndeks[mal]!;
        const gercek = stokEkle(d, ctx, dugum.indeks, mi, q);
        if (gercek > 0) { kayit.ganimet.push([mal, gercek]); sonuc.ganimetDegeriMili += carpBol(gercek, ctx.ic.mallar[mi]!.tabanFiyat, MILI); }
        if (q > gercek) kayit.ganimetTasma.push([mal, q - gercek]);
      }
    }
    sonuc.oyuncular.push(satir);
  }
  b.sonuc = sonuc;
  b.evre = "bitti";
  if (sonuc.oyuncular.some((s) => s.revir !== undefined)) ctx.planla(d, d.zaman + p.reviriGeriSaat * SAAT, { tur: "eskiya_toparlanma", baskin: b.id });
  ctx.kirlet(d);
}

/** Bayrak kapalıyken de kazanılmış hak tek kez döner; sahip değişmişse hak iptal kaydına dönüşür. */
export function eskiyaToparlanma(d: Dunya, ctx: Baglam, id: number): void {
  const b = d.baskinlar?.find((b) => b.id === id);
  for (const s of b?.sonuc?.oyuncular ?? []) {
    const r = s.revir;
    if (r?.evre !== "bekliyor" || r.donusZamani > d.zaman) continue;
    const dugum = d.bolgeler.find((x) => x.id === r.dugum);
    if (dugum?.sahip !== s.oyuncu) { r.evre = "iptal"; continue; }
    for (const [birlik, adet] of r.birlikler) {
      const i = ctx.ic.birlikIndeks[birlik];
      if (i !== undefined) dugum.birlikler[i] = (dugum.birlikler[i] ?? 0) + adet;
    }
    r.evre = "dondu";
    ctx.kirlet(d);
  }
}
