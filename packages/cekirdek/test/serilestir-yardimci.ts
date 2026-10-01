/**
 * Serileştirme / yeniden oynatma testlerinin ortak senaryosu: 4 bot (sanayici, tüccar, lojistikçi, militarist) +
 * her karar anında rastgele "bulanık" komutlar (çoğu başarısız: bilinmeyen bölge, yetersiz para, geçersiz alan,
 * yabancı bölge...). Bot paketi çekirdeğe bağımlı olduğundan (döngü olmasın diye) göreli yolla içe aktarılır;
 * yalnız testlerde kullanılır.
 */
import type { VeriPaketi } from "@bolge/veri";
import { botOlustur } from "../../botlar/src/api";
import type { ArketipAdi, Bot } from "../../botlar/src/api";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { aralik, prngOlustur } from "../src/prng";
import { SAAT } from "../src/tipler";
import type { DamgaliKomut, Komut, Ms, PrngDurumu } from "../src/tipler";

export const DORT_BOT: readonly ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];

/** Haritadaki ilk dört devletin bölgeleri (harita sırasıyla). */
export function devletBolgeleri(veri: VeriPaketi): { devlet: string; bolgeler: string[] }[] {
  const sira: string[] = [];
  const bolgeler: Record<string, string[]> = {};
  for (const b of veri.harita.bolgeler) {
    if (!(b.devlet in bolgeler)) {
      bolgeler[b.devlet] = [];
      sira.push(b.devlet);
    }
    (bolgeler[b.devlet] as string[]).push(b.id);
  }
  return sira.slice(0, 4).map((d) => ({ devlet: d, bolgeler: bolgeler[d] as string[] }));
}

function sec<T>(r: PrngDurumu, dizi: readonly T[]): T {
  return dizi[aralik(r, dizi.length)] as T;
}

/** Her tür komuttan rastgele (çoğunlukla geçersiz/başarısız) bir komut; bazen geçersiz kimlik, bazen sınır dışı sayı. */
export function bulanikKomut(r: PrngDurumu, veri: VeriPaketi, oyuncular: readonly string[], oyuncu: string): Komut {
  const bolge = aralik(r, 10) === 0 ? "yok_bolge" : sec(r, veri.harita.bolgeler).id;
  const mal = aralik(r, 10) === 0 ? "yok_mal" : sec(r, veri.icerik.mallar).id;
  const diger = aralik(r, 8) === 0 ? "yabanci" : sec(r, oyuncular);
  const sayi = (n: number): number => (aralik(r, 12) === 0 ? -1 - aralik(r, 5) : aralik(r, n));
  const urunSayisi = veri.icerik.tarimUrunleri?.length ?? 3;
  const komutlar: Komut[] = [
    { tur: "tesis_insa", bolge, tesisTuru: sec(r, veri.icerik.tesisTurleri).id },
    { tur: "yontem_degistir", bolge, tesis: sayi(6), yontem: sec(r, veri.icerik.yontemler).id },
    { tur: "tesis_durum", bolge, tesis: sayi(6), aktif: aralik(r, 2) === 0 },
    { tur: "ticaret_emri", bolge, mal, yon: aralik(r, 2) === 0 ? "ihracat" : "ithalat", oranSaat: sayi(80_000) },
    { tur: "vergi_ayarla", oranPpm: sayi(1_200_000) },
    { tur: "ekim_plani", bolge, ekimPpm: Array.from({ length: urunSayisi }, () => aralik(r, 600_000)) },
    { tur: "gubre_dozu", bolge, doz: sayi(5) },
    { tur: "tesis_olcek_yukselt", bolge, tesis: sayi(6), olcek: aralik(r, 2) === 0 ? 1 : 2 },
    { tur: "genel_onarim", bolge },
    { tur: "bakim_duzeyi", duzey: sec(r, [0, 1, 2] as const) },
    { tur: "arama_sondaji", bolge, mal },
    { tur: "kenar_gelistir", kenar: sayi(veri.harita.kenarlar.length + 3) },
    { tur: "askeri_rezerv", oranPpm: sayi(700_000) },
    { tur: "birlik_uret", bolge, birlik: sec(r, veri.icerik.birlikler).id, adet: sayi(120) },
    { tur: "savas_ilan", saldiranBolge: bolge, hedefBolge: sec(r, veri.harita.bolgeler).id },
    { tur: "savunma_emri", bolge, durus: sec(r, ["normal", "savunma", "geri_cekil"] as const) },
    { tur: "arastir", teknoloji: aralik(r, 6) === 0 ? "yok_tek" : sec(r, veri.icerik.teknolojiler).id },
    { tur: "anlasma_teklif", karsi: diger, anlasma: aralik(r, 2) === 0 ? "ticaret" : "ortak_altyapi" },
    { tur: "anlasma_feshet", karsi: diger, anlasma: aralik(r, 2) === 0 ? "ticaret" : "ortak_altyapi" },
    { tur: "yaptirim", hedef: diger, aktif: aralik(r, 2) === 0 },
    { tur: "oyuncu_katil", oyuncu, bolgeler: [bolge] },
  ];
  return sec(r, komutlar);
}

export interface Adim {
  /** Komut (başarılı/başarısız ayrımı uygulama sonucundan). */
  k: DamgaliKomut;
  tamam: boolean;
}

export interface SenaryoSecenek {
  veri: VeriPaketi;
  tohum: number;
  /** Bitiş anı (ms). */
  sureMs: Ms;
  /** Karar aralığı (vars. 6 saat). */
  kararAraligiMs?: Ms;
  /** Karar anı başına bulanık komut sayısı (vars. 4). */
  bulanikAdet?: number;
  /** Karar anında (komutlardan önce) çağrılır. */
  kararAni?: (sim: Simulasyon, t: Ms) => void;
  /**
   * Başarısız komutun yan etkisizliği denetimi: geçerli zamanlı her komuttan önce calistirKadar(k.t) + özet alınır;
   * komut başarısızsa özet değişmemiş olmalıdır (aksi halde `yanEtkiler`e yazılır). Pahalıdır (komut başına iki özet).
   */
  yanEtkiDenetimi?: boolean;
}

export interface SenaryoSonucu {
  sim: Simulasyon;
  /** Uygulanan tüm komutlar (başarılı + başarısız), uygulama sırasıyla. */
  adimlar: Adim[];
  basarili: number;
  basarisiz: number;
  /** yanEtkiDenetimi açıkken: başarısız olduğu halde durum özetini değiştiren komutlar. */
  yanEtkiler: string[];
  /** yanEtkiDenetimi açıkken: denetlenen başarısız komut sayısı. */
  denetlenen: number;
}

/**
 * Bot koşusu: oyuncular t=0'da katılır; her karar anında (aralık katları) sırası dönen 4 bot + bulanık komutlar
 * uygulanır. Bulanık komutların zamanı karar anı + [0, aralık) arasında rastgele (zamanı da ilerletir).
 */
export function senaryoKos(s: SenaryoSecenek): SenaryoSonucu {
  const aralikMs = s.kararAraligiMs ?? 6 * SAAT;
  const bulanikAdet = s.bulanikAdet ?? 4;
  const sim = Simulasyon.olustur(s.veri, s.tohum);
  const devletler = devletBolgeleri(s.veri);
  const oyuncular = devletler.map((_, i) => `o${i}`);
  const botlar: Bot[] = oyuncular.map((o, i) => botOlustur(DORT_BOT[i % 4] as ArketipAdi, o, s.tohum + i));
  const r = prngOlustur(s.tohum, "bulanik-test");
  const adimlar: Adim[] = [];
  const yanEtkiler: string[] = [];
  let denetlenen = 0;
  const uygula = (k: DamgaliKomut): void => {
    let once: string | null = null;
    if (s.yanEtkiDenetimi && Number.isSafeInteger(k.t) && k.t >= sim.dunya.zaman) {
      sim.calistirKadar(k.t);
      once = sim.durumOzeti();
    }
    const sonuc = sim.uygula(k);
    if (!sonuc.tamam && once !== null) {
      denetlenen++;
      if (sim.durumOzeti() !== once) yanEtkiler.push(`t=${k.t} ${k.oyuncu} ${k.komut.tur}: ${sonuc.hata}`);
    }
    adimlar.push({ k: structuredClone(k), tamam: sonuc.tamam });
  };
  devletler.forEach((d, i) => uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: oyuncular[i] as string, bolgeler: d.bolgeler } }));
  // Başarısız sistem komutu da (tekrar katılım, bilinmeyen bölge)
  uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "o0", bolgeler: ["yok_bolge"] } });

  for (let t = 0; t < s.sureMs; t += aralikMs) {
    sim.calistirKadar(Math.max(t, sim.dunya.zaman));
    const tk = sim.dunya.zaman;
    s.kararAni?.(sim, tk);
    const n = botlar.length;
    const kayma = n > 0 ? Math.floor(t / aralikMs) % n : 0;
    for (let j = 0; j < n; j++) {
      const bot = botlar[(j + kayma) % n] as Bot;
      for (const komut of bot.karar(sim)) uygula({ t: tk, oyuncu: bot.oyuncu, komut });
    }
    // Bulanık komutlar: artan zamanlarla (karar anı .. sonraki karar anı)
    const zamanlar = Array.from({ length: bulanikAdet }, () => tk + aralik(r, aralikMs)).sort((a, b) => a - b);
    for (const zt of zamanlar) {
      if (zt >= s.sureMs) break;
      const oyuncu = aralik(r, 15) === 0 ? sec(r, [SISTEM_OYUNCUSU, "yabanci"]) : sec(r, oyuncular);
      uygula({ t: zt, oyuncu, komut: bulanikKomut(r, s.veri, oyuncular, oyuncu) });
    }
  }
  sim.calistirKadar(s.sureMs);
  const basarili = adimlar.filter((a) => a.tamam).length;
  return { sim, adimlar, basarili, basarisiz: adimlar.length - basarili, yanEtkiler, denetlenen };
}
