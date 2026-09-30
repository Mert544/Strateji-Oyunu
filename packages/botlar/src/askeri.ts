/**
 * Askeri aday üreticileri: mühimmat fabrikası, birlik üretimi, askeri rezerv, savunma duruşu ve savaş ilanı.
 * Militarist bot, tüm botların tepkisel savunması ve H3 müdahalesi (kapasitenin %20'si askeriye) bunları kullanır.
 */
import { MILI, PPM, anlikMiktar } from "@bolge/cekirdek";
import type { BolgeDurumu, Komut, Simulasyon, OyuncuId } from "@bolge/cekirdek";
import { Bakis, insaAdaylari } from "./planlayici";
import type { Aday, AdayMaliyet } from "./planlayici";
import type { BirlikBilgisi, MalMiktar } from "./tablo";

export interface AskeriSecenek {
  /** Hedef toplam savaş gücü (birlik gücü toplamı, üretimdekiler dahil). */
  hedefGuc: number;
  /** Askeri rezerv ppm (vars. 200000). */
  rezervPpm?: number;
  /** Savaş ilanı adayları üretilsin mi. */
  savas?: boolean;
  /** Savaş ilanı için güç oranı eşiği (vars. 1.3). */
  savasEsigi?: number;
  /** Komşu yabancı bölgesi olan bölgelerde savunma duruşu önerilsin mi. */
  savunmaDurusu?: boolean;
}

/** Bölgenin ham savaş gücü (Σ adet × güç). */
export function bolgeGucu(sim: Simulasyon, b: BolgeDurumu): number {
  let t = 0;
  for (let i = 0; i < b.birlikler.length; i++) t += (b.birlikler[i] ?? 0) * (sim.ic.birlikler[i]?.guc ?? 0);
  return t;
}

/** Bir birlik türünün saatlik ikmal değeri (para/saat, taban fiyat). */
function ikmalDegeri(sim: Simulasyon, b: Bakis, bi: number): number {
  const tanim = sim.ic.birlikler[bi];
  if (!tanim) return 0;
  let t = 0;
  for (const id of Object.keys(tanim.ikmal)) {
    const mi = sim.ic.malIndeks[id];
    if (mi !== undefined) t += ((tanim.ikmal[id] as number) / MILI) * (b.tb.taban[mi] as number);
  }
  return t;
}

/** Oyuncunun toplam savaş gücü (üretimdeki partiler dahil). */
export function toplamGuc(sim: Simulasyon, oyuncu: OyuncuId): number {
  let t = 0;
  for (const b of sim.dunya.bolgeler) if (b.sahip === oyuncu) t += bolgeGucu(sim, b);
  for (const p of sim.dunya.partiler) if (p.sahip === oyuncu) t += p.adet * (sim.ic.birlikler[p.birlik]?.guc ?? 0);
  return t;
}

/** Saatlik brüt üretim değeri (para/saat, taban fiyat) — "kapasite" göstergesi. */
export function kapasiteDegeri(b: Bakis): number {
  let t = 0;
  for (let m = 0; m < b.tb.malSayisi; m++) t += ((b.uretimSaat[m] as number) / MILI) * (b.tb.taban[m] as number);
  return t;
}

/** Hedef güç: kapasitenin `oran` kadarının birlik ikmaline gideceği kadar birlik (piyade eşdeğeri). */
export function hedefGucKapasiteden(sim: Simulasyon, b: Bakis, oran: number): number {
  const piyade = sim.ic.birlikIndeks["piyade_tumeni"];
  if (piyade === undefined) return 0;
  const birimDeger = ikmalDegeri(sim, b, piyade);
  if (birimDeger <= 0) return 0;
  const adet = Math.round((oran * kapasiteDegeri(b)) / birimDeger);
  return adet * (sim.ic.birlikler[piyade]?.guc ?? 0);
}

function komsuBolgeler(sim: Simulasyon, b: BolgeDurumu): BolgeDurumu[] {
  const d = sim.dunya;
  const cikti: BolgeDurumu[] = [];
  for (const ki of sim.ic.komsuKenarlar[b.indeks] ?? []) {
    const e = d.kenarlar[ki];
    if (!e) continue;
    const n = d.bolgeler[e.a === b.indeks ? e.b : e.a];
    if (n) cikti.push(n);
  }
  return cikti;
}

function yabanciKomsuVar(sim: Simulasyon, b: BolgeDurumu, oyuncu: OyuncuId): boolean {
  return komsuBolgeler(sim, b).some((n) => n.sahip !== null && n.sahip !== oyuncu);
}

function maliyetOlustur(bolge: number, l: MalMiktar, carpan: number): AdayMaliyet {
  return { para: 0, stok: l.map(([mal, q]) => ({ bolge, mal, miktar: q * carpan })) };
}

/** En iyi (güç / maliyet) açık birlik türü ve bölge stokunun kaldırdığı adet. */
function birlikSec(b: Bakis, r: BolgeDurumu, istenen: number): { birlik: BirlikBilgisi; adet: number } | null {
  let enIyi: { birlik: BirlikBilgisi; adet: number } | null = null;
  let enIyiSkor = -1;
  for (const u of b.tb.birlik) {
    if (u.gerekliTeknoloji !== undefined && !b.teknolojiVar(u.gerekliTeknoloji)) continue;
    let adet = istenen;
    for (const [m, q] of u.maliyet) {
      // Bölge stokunun yarısından fazlasını tek partiye harcama (ikmal/inşa için pay kalsın).
      adet = Math.min(adet, Math.floor((b.stok(r.indeks, m) * 0.5) / q));
    }
    if (adet < 1) continue;
    const skor = u.guc / Math.max(1, u.maliyetDegeri);
    if (skor > enIyiSkor) {
      enIyiSkor = skor;
      enIyi = { birlik: u, adet };
    }
  }
  return enIyi;
}

/** Bölge savunma gücü tahmini (savunma duruşu, arazi ve ikmal dahil), rastgele sapma hariç. */
function savunmaGucuTahmini(sim: Simulasyon, h: BolgeDurumu): number {
  const a = sim.ic.param.askeri;
  if (h.savunma.durus === "geri_cekil") return 0;
  let arazi = PPM;
  let var_ = false;
  for (const e of h.etiketler) {
    const p = a.araziSavunmaPpm[e];
    if (p !== undefined && (!var_ || p > arazi)) {
      arazi = p;
      var_ = true;
    }
  }
  let g = (bolgeGucu(sim, h) * h.ikmalKarsilanmaPpm) / PPM;
  g = (g * arazi) / PPM;
  if (h.savunma.durus === "savunma") g = (g * a.savunmaDurusuCarpaniPpm) / PPM;
  return g;
}

/** Tepkisel savunma: bana savaş ilan edildiyse hedef bölgede savunma duruşu ve (olabilirse) birlik üretimi. */
export function savunmaTepkiAdaylari(b: Bakis): Aday[] {
  const cikti: Aday[] = [];
  const goruldu = new Set<number>();
  for (const s of b.d.savaslar) {
    if (s.evre === "bitti" || s.savunan !== b.oyuncu || goruldu.has(s.hedefBolge)) continue;
    goruldu.add(s.hedefBolge);
    const r = b.d.bolgeler[s.hedefBolge];
    if (!r || r.sahip !== b.oyuncu) continue;
    if (r.savunma.durus !== "savunma") {
      cikti.push({
        anahtar: "savunma_emri:savunma",
        komut: { tur: "savunma_emri", bolge: r.id, durus: "savunma" },
        tahminiFayda: 1e6,
        kategori: "savunma",
        bolge: r.id,
        konu: "savunma",
      });
    }
    const hazirlikKalan = s.pencereBaslangic - b.t;
    const sec = birlikSec(b, r, 10);
    if (sec && hazirlikKalan >= sec.birlik.partiSuresiSaat * 3_600_000) {
      cikti.push({
        anahtar: `birlik_uret:${sec.birlik.id}`,
        komut: { tur: "birlik_uret", bolge: r.id, birlik: sec.birlik.id, adet: sec.adet },
        tahminiFayda: 5e5,
        kategori: "savunma",
        bolge: r.id,
        konu: `tepki_${sec.birlik.id}`,
        maliyet: maliyetOlustur(r.indeks, sec.birlik.maliyet, sec.adet),
      });
    }
  }
  return cikti;
}

/** Askeri adaylar: mühimmat fabrikası, birlik üretimi, rezerv, savunma duruşu, savaş ilanı. */
export function askeriAdaylar(b: Bakis, sec: AskeriSecenek): Aday[] {
  const sim = b.sim;
  const cikti: Aday[] = [];
  const d = b.d;

  // Mühimmat fabrikası (askeri tesis türü): yalnızca kendi türünden devam eden yoksa.
  cikti.push(
    ...insaAdaylari(b, { filtre: (t) => t.askeri, malAgirlik: (m) => (b.tb.askeri[m] ? 2 : b.malAgirlik(m)) }).map((a) => ({
      ...a,
      kategori: "insa" as const,
    })),
  );

  // Birlik üretimi: hedef güce ulaşana kadar; ikmal (mühimmat) taşıyabildiği kadar.
  const mevcutGuc = toplamGuc(sim, b.oyuncu);
  if (mevcutGuc < sec.hedefGuc) {
    const muhimmatSaat = b.uretimSaat[b.tb.muhimmat] as number;
    const piyade = b.tb.birlik[0];
    // Ordunun mühimmat ikmali: üretimle desteklenen birlik sayısı (+ başlangıç payı).
    const ikmalIzni = muhimmatSaat / Math.max(1, sim.ic.birlikler[0]?.ikmal["muhimmat"] ?? 800) + 4;
    // Üretimdeki partiler de sayılır (yoksa aynı anda çok parti verilip ikmal aşılır).
    const toplamBirlik =
      d.bolgeler.filter((x) => x.sahip === b.oyuncu).reduce((t, x) => t + x.birlikler.reduce((s, a) => s + a, 0), 0) +
      d.partiler.filter((p) => p.sahip === b.oyuncu).reduce((t, p) => t + p.adet, 0);
    if (piyade && toplamBirlik < ikmalIzni + 2 && (b.aciklik[b.tb.gida] as number) < 0.15) {
      // Sınır bölgeleri önce, sonra stoğu en çok olanlar.
      const adaylar = b.bolgeler
        .map((r) => ({ r, sinir: yabanciKomsuVar(sim, r, b.oyuncu) ? 1 : 0 }))
        .sort((x, y) => y.sinir - x.sinir || x.r.indeks - y.r.indeks);
      let kalan = Math.ceil((sec.hedefGuc - mevcutGuc) / Math.max(1, piyade.guc));
      for (const { r, sinir } of adaylar) {
        if (kalan < 1) break;
        // İkmali kesilmiş (mühimmat/gıda ulaşmayan) bölgede birlik üretmek boşunadır: orduyu ikmalli bölgelerde büyüt.
        if (r.ikmalKarsilanmaPpm < 800_000 && bolgeGucu(sim, r) > 0) continue;
        const s = birlikSec(b, r, Math.min(10, kalan));
        if (!s) continue;
        cikti.push({
          anahtar: `birlik_uret:${s.birlik.id}`,
          komut: { tur: "birlik_uret", bolge: r.id, birlik: s.birlik.id, adet: s.adet },
          tahminiFayda: s.adet * s.birlik.guc * (sinir ? 1.5 : 1),
          kategori: "birlik",
          bolge: r.id,
          konu: s.birlik.id,
          maliyet: maliyetOlustur(r.indeks, s.birlik.maliyet, s.adet),
        });
        kalan -= s.adet;
      }
    }
  }

  // Askeri rezerv.
  const rezerv = sec.rezervPpm ?? 200_000;
  if (b.o.askeriRezervPpm !== rezerv) {
    cikti.push({
      anahtar: "askeri_rezerv:ayarla",
      komut: { tur: "askeri_rezerv", oranPpm: rezerv },
      tahminiFayda: 400,
      kategori: "rezerv",
      konu: "ayarla",
    });
  }

  // Savunma duruşu (sınır bölgelerinde, birlik varsa).
  if (sec.savunmaDurusu !== false) {
    for (const r of b.bolgeler) {
      if (r.savunma.durus === "savunma") continue;
      if (bolgeGucu(sim, r) <= 0 || !yabanciKomsuVar(sim, r, b.oyuncu)) continue;
      cikti.push({
        anahtar: "savunma_emri:savunma",
        komut: { tur: "savunma_emri", bolge: r.id, durus: "savunma" },
        tahminiFayda: 300,
        kategori: "savunma",
        bolge: r.id,
        konu: "savunma",
      });
    }
  }

  // Savaş ilanı.
  if (sec.savas) cikti.push(...savasAdaylari(b, sec.savasEsigi ?? 1.3));
  return cikti;
}

/** Güç oranı eşiğini aşan, korumada olmayan komşu düşman bölgesine savaş ilanı (en iyi tek aday). */
export function savasAdaylari(b: Bakis, esik: number): Aday[] {
  const sim = b.sim;
  const d = b.d;
  const aktifSavas = d.savaslar.filter((s) => s.evre !== "bitti" && s.saldiran === b.oyuncu).length;
  if (aktifSavas >= 2) return [];
  let enIyi: Aday | null = null;
  for (const r of b.bolgeler) {
    const guc = (bolgeGucu(sim, r) * r.ikmalKarsilanmaPpm) / PPM;
    if (guc <= 0) continue;
    for (const h of komsuBolgeler(sim, r)) {
      if (h.sahip === null || h.sahip === b.oyuncu) continue;
      const hedefOyuncu = d.oyuncular.find((o) => o.id === h.sahip);
      if (!hedefOyuncu || hedefOyuncu.korumaBitis > b.t) continue;
      const suruyor = d.savaslar.some(
        (s) =>
          s.evre !== "bitti" &&
          ((s.saldiranBolge === r.indeks && s.hedefBolge === h.indeks) || (s.saldiranBolge === h.indeks && s.hedefBolge === r.indeks)),
      );
      if (suruyor) continue;
      const sav = savunmaGucuTahmini(sim, h);
      const oran = sav <= 0 ? Number.POSITIVE_INFINITY : guc / sav;
      if (!(oran > esik)) continue;
      // Yağma tahmini: hedef stok değerinin %25'i (tavan).
      let deger = 0;
      for (let m = 0; m < b.tb.malSayisi; m++) deger += (anlikMiktar(h.stoklar[m]!, b.t) / MILI) * (b.tb.taban[m] as number);
      const fayda = 0.25 * deger * Math.min(1, oran / 3);
      const komut: Komut = { tur: "savas_ilan", saldiranBolge: r.id, hedefBolge: h.id };
      if (!enIyi || fayda > enIyi.tahminiFayda) {
        enIyi = { anahtar: "savas_ilan:komsu", komut, tahminiFayda: Math.max(fayda, 1), kategori: "savas", bolge: r.id, konu: h.id };
      }
    }
  }
  return enIyi ? [enIyi] : [];
}
