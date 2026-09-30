/**
 * Politika önayarları (H1 ve H2 için). Her önayar, o anki duruma göre birkaç düzenleme
 * (inşa / yöntem / araştırma / ticaret / vergi / rezerv / birlik) komutu üretir.
 * Önayar sabit bir strateji "teması"dır; ne yapılacağı (hangi bölgede hangi tesis) duruma göre seçilir.
 */
import type { Komut, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { askeriAdaylar, hedefGucKapasiteden } from "./askeri";
import {
  Bakis,
  adayiSec,
  arastirmaAdaylari,
  insaAdaylari,
  kenarAdaylari,
  ticaretAdaylari,
  vergiAdaylari,
  yontemAdaylari,
} from "./planlayici";
import type { Aday } from "./planlayici";

export interface Onayar {
  readonly ad: string;
  readonly aciklama: string;
  /** O anki duruma göre bir düzenleme; durum değiştirmez. */
  uygula(sim: Simulasyon, oyuncu: OyuncuId): Komut[];
}

interface OnayarTanimi {
  ad: string;
  aciklama: string;
  /** İzin verilen tesis türleri (boş/undefined = hiçbiri). */
  turler?: string[];
  /** İzin verilen yöntemler. */
  yontemler?: string[];
  /** İzin verilen teknolojiler. */
  teknolojiler?: string[];
  /** Ticarete konu olabilecek mallar. */
  ticaretMal?: string[];
  ihracatEsigi?: number;
  vergi?: boolean;
  kenar?: boolean;
  askeri?: { oran: number };
  /** Belirtilmişse sivil adayların tümü (dengeli). */
  hepsi?: boolean;
  n?: number;
}

function onayarOlustur(t: OnayarTanimi): Onayar {
  return {
    ad: t.ad,
    aciklama: t.aciklama,
    uygula(sim, oyuncu) {
      if (!sim.dunya.oyuncular.some((o) => o.id === oyuncu)) return [];
      const b = new Bakis(sim, oyuncu);
      if (b.bolgeler.length === 0) return [];
      let adaylar: Aday[] = [];
      const turler = new Set(t.turler ?? []);
      const yontemler = new Set(t.yontemler ?? []);
      const teknolojiler = new Set(t.teknolojiler ?? []);
      const mallar = new Set(t.ticaretMal ?? []);
      if (t.hepsi) {
        adaylar = [
          ...insaAdaylari(b),
          ...yontemAdaylari(b),
          ...arastirmaAdaylari(b),
          ...kenarAdaylari(b),
          ...ticaretAdaylari(b, {}),
          ...vergiAdaylari(b),
        ];
      } else {
        adaylar.push(...insaAdaylari(b, { filtre: (x) => turler.has(x.id) }));
        adaylar.push(...yontemAdaylari(b).filter((a) => yontemler.has(a.konu)));
        adaylar.push(...arastirmaAdaylari(b).filter((a) => teknolojiler.has(a.konu)));
        if (mallar.size > 0) {
          adaylar.push(
            ...ticaretAdaylari(b, { ihracatEsigi: t.ihracatEsigi ?? 0.1, ithalat: false }).filter((a) =>
              [...mallar].some((m) => a.konu.endsWith(`_${m}`)),
            ),
          );
        }
        if (t.vergi) adaylar.push(...vergiAdaylari(b));
        if (t.kenar) adaylar.push(...kenarAdaylari(b));
        if (t.askeri) {
          const hedefGuc = Math.max(600, hedefGucKapasiteden(sim, b, t.askeri.oran));
          adaylar.push(...askeriAdaylar(b, { hedefGuc, rezervPpm: 200_000, savas: false, savunmaDurusu: true }).map((a) => ({ ...a, tahminiFayda: a.tahminiFayda * 50 })));
        }
      }
      return adayiSec(adaylar, b, {
        n: t.n ?? 6,
        kategoriSiniri: { arastir: 1, kenar: 1, vergi: 1, rezerv: 1, ticaret: 3, birlik: 2, savunma: 1 },
      }).map((a) => a.komut);
    },
  };
}

export const ONAYARLAR: readonly Onayar[] = [
  onayarOlustur({
    ad: "gida_odakli",
    aciklama: "Tahıl-gıda zinciri, mekanize tarım, gıda ihracatı, vergi ayarı.",
    turler: ["ciftlik", "gida_fabrikasi"],
    yontemler: ["mekanize_tarim"],
    teknolojiler: ["mekanize_tarim"],
    ticaretMal: ["tahil", "gida"],
    vergi: true,
  }),
  onayarOlustur({
    ad: "agir_sanayi",
    aciklama: "Cevher-kömür-çelik-parça zinciri, derin madencilik, çelik/cevher ihracatı.",
    turler: ["cevher_madeni", "komur_ocagi", "celikhane", "parca_fabrikasi"],
    yontemler: ["derin_cevher", "derin_komur", "elektrik_ark"],
    teknolojiler: ["derin_madencilik", "elektrik_ark_ocagi"],
    ticaretMal: ["cevher", "komur", "celik", "parca"],
  }),
  onayarOlustur({
    ad: "elektronik",
    aciklama: "Bakır-silis-parça-elektronik zinciri, otomasyon, elektronik ihracatı.",
    turler: ["bakir_madeni", "silis_ocagi", "parca_fabrikasi", "elektronik_fabrikasi", "celikhane"],
    yontemler: ["otomatik_hat"],
    teknolojiler: ["mekanize_tarim", "otomasyon"],
    ticaretMal: ["elektronik", "parca", "bakir", "silis"],
  }),
  onayarOlustur({
    ad: "enerji",
    aciklama: "Petrol-rafineri-yakıt, kömür; derin madencilik; yakıt/petrol ihracatı.",
    turler: ["petrol_kuyusu", "rafineri", "komur_ocagi"],
    yontemler: ["derin_komur"],
    teknolojiler: ["derin_madencilik"],
    ticaretMal: ["petrol", "yakit", "komur"],
  }),
  onayarOlustur({
    ad: "ihracatci",
    aciklama: "Ham madde çıkarımı ağırlıklı; limandan düşük eşikle her fazlayı ihraç et.",
    turler: ["ciftlik", "cevher_madeni", "komur_ocagi", "bakir_madeni", "silis_ocagi", "petrol_kuyusu"],
    ticaretMal: ["tahil", "gida", "cevher", "komur", "celik", "bakir", "silis", "parca", "elektronik", "petrol", "yakit"],
    ihracatEsigi: 0.03,
    vergi: true,
  }),
  onayarOlustur({
    ad: "lojistik_yatirimi",
    aciklama: "Kenar kapasite geliştirme, parça fabrikası, otomasyon ve konteyner limanı araştırması.",
    turler: ["parca_fabrikasi"],
    yontemler: ["otomatik_hat", "mekanize_tarim"],
    teknolojiler: ["mekanize_tarim", "otomasyon", "konteyner_limani"],
    kenar: true,
  }),
  onayarOlustur({
    ad: "askeri_hazirlik",
    aciklama: "Mühimmat fabrikası, çelik/rafineri desteği, birlik üretimi, askeri rezerv, savunma duruşu.",
    turler: ["celikhane", "rafineri", "komur_ocagi", "cevher_madeni"],
    teknolojiler: ["derin_madencilik", "elektrik_ark_ocagi"],
    askeri: { oran: 0.2 },
  }),
  onayarOlustur({
    ad: "dengeli",
    aciklama: "Tüm sivil adaylar içinden tahmini faydası en yüksekler (genel amaçlı).",
    hepsi: true,
  }),
];

export function onayarBul(ad: string): Onayar {
  const o = ONAYARLAR.find((x) => x.ad === ad);
  if (!o) throw new Error(`bilinmeyen onayar: ${ad}`);
  return o;
}
