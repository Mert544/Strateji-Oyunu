/**
 * Parsel koşucusu (mülk kipi): oyuncu katılımı (`oyuncu_katil {ilce}`), parsel bot kararları ve gözlem geri çağrısıyla bir simülasyonu sürer.
 * `kosucu.ts`'den (bölge kipi) ayrıdır: katılım komutu `ilce` taşır ve veri paketi parsel fikstürü içerir (`CekirdekVeriPaketi`).
 * Zaman tamamen simülasyon zamanıdır; duvar saati yalnızca raporlama içindir (`sureMs`). Deterministiktir.
 *
 * Ölçüm için ek kayıtlar tutar (yalnız okuma; simülasyonu etkilemez): komut günlüğü (kabul edilen ve reddedilen), sermaye harcaması
 * (arsa + yapı bedeli: komuttan önce/sonra hazine farkı) ve katılım kayıtları (ilçe, yurt hücre sayısı).
 */
import { MILI, SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikHazine, yurtPlanla } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, Ms, OyuncuId } from "@bolge/cekirdek";
import type { ParselBotu } from "./parsel";

export interface ParselKosuOyuncusu {
  id: OyuncuId;
  /** Karar veren bot; null = komut vermez (yine de katılır). */
  bot: ParselBotu | null;
  /** Katılma anı (ms, simülasyon zamanı). */
  katilmaMs: Ms;
}

export interface ParselKosuSecenekleri {
  /** Veri paketi; mülk kipi için `parsel` fikstürü içermelidir. */
  veri: CekirdekVeriPaketi;
  tohum: number;
  oyuncular: ParselKosuOyuncusu[];
  /** Mutlak bitiş anı (ms). */
  sureMs: Ms;
  /** Bot karar aralığı (vars. 6 saat); kararlar bu aralığın katlarında ve oyuncunun katılma anında verilir. */
  kararAraligiMs?: Ms;
  /** Gözlem aralığı; verilirse `gozlem` bu aralığın katlarında (ve bitişte) çağrılır. */
  gozlemAraligiMs?: Ms;
  /** Izgara dışı ek gözlem anları (ms; ör. katılım + 10 dk). Izgara ve bu anlar birlikte gözlenir. */
  ekGozlemMs?: readonly Ms[];
  gozlem?: (sim: Simulasyon, t: Ms) => void;
  /** Mevcut bir simülasyondan devam et (verilmezse yeni oluşturulur). */
  sim?: Simulasyon;
  /**
   * Katılım reddedilirse (ör. hiçbir ilçe yurt veremiyor: kalabalık dünya) hata fırlatma; oyuncuyu "katılamadı" olarak kaydet ve
   * koşuyu sürdür (vars. false: hata fırlatır).
   */
  katilimRedDevam?: boolean;
  /**
   * Ölçüm kancası (YALNIZ OKUMA; simülasyonu değiştirmemeli): her bot komutundan ÖNCE çağrılır; bir işlev döndürürse komut uygulanınca
   * sonuçla (`tamam`) çağrılır. Sonucu etkilemez; yalnız ölçüm içindir (ör. bakım harcaması: komut öncesi/sonrası hazine ve stok).
   */
  komutIzle?: (sim: Simulasyon, t: Ms, oyuncu: OyuncuId, komut: Komut) => ((tamam: boolean) => void) | undefined;
}

/** Bot (ya da sistem) komutunun günlük kaydı. */
export interface ParselKomutKaydi {
  t: Ms;
  oyuncu: OyuncuId;
  tur: Komut["tur"];
  /** `yapi_yerlestir` ve `tesis_insa_hucre` için yapı türü. */
  tesisTuru?: string;
  tamam: boolean;
  /** Reddedildiyse (sayılar "#" ile normalleştirilmiş) hata iletisi. */
  hata?: string;
}

export interface ParselSermayeKaydi {
  t: Ms;
  /** Komutla hazineden çıkan tutar (mili-para; arsa + yapı parası; malzeme hazineden değil işletme stoğundan düşer). */
  tutar: number;
  /** Başlatılan yapı inşaatının ÖDENEN parası (indirimli ilk 5 yapıda indirimli; mili-para). Yapı yoksa 0. */
  yapiPara: number;
  /** Başlatılan yapı inşaatında ödenen malzemenin taban fiyatla değeri (mili-para). Yapı yoksa 0. */
  yapiMalDegeri: number;
}

export interface ParselKatilimKaydi {
  t: Ms;
  /** Komutta verilen ilçe (yoksa çekirdeğin seçtiği, yurt hücrelerinden okunur). */
  istenenIlce: string | undefined;
  /** Bot önerisi reddedildi ve ilçesiz yeniden denendi. */
  ilceGeriDusuldu: boolean;
  /** Katılım gerçekleşmedi: `katilimRedDevam` ile çekirdeğin reddi ya da botun "uygun ilçe yok" kararı; nedeni. Katıldıysa tanımsız. */
  reddedildi?: string;
  /** Bot açık ilçe kararında (`ilceKarari`) hiçbir ilçe uygun bulmadı: oyuncu KATILMADI ("uygun ilçe yok"; `reddedildi` neden). */
  uygunIlceYok?: boolean;
  /** Açık ilçe kararının nedeni (yalnız `ilceKarari` olan botlarda). */
  ilceNedeni?: string;
}

export interface ParselKosuSonucu {
  sim: Simulasyon;
  komutSayisi: Record<OyuncuId, number>;
  basarisizSayisi: Record<OyuncuId, number>;
  /** Hata iletisi (sayılar "#" ile normalleştirilmiş) -> adet. */
  basarisizNedenleri: Record<string, number>;
  /** Başarılı komut türü -> adet (tüm oyuncular). */
  komutTurleri: Record<string, number>;
  /** Tüm bot komutları, zaman sırasıyla (katılımlar dahil değildir). */
  komutGunlugu: ParselKomutKaydi[];
  /** Oyuncu -> arsa ve yapı harcamaları (zaman sırasıyla). */
  sermaye: Record<OyuncuId, ParselSermayeKaydi[]>;
  katilimlar: Record<OyuncuId, ParselKatilimKaydi>;
  /** Duvar saati süresi (ms); yalnızca raporlama. */
  sureMs: number;
}

const SERMAYE_KOMUTLARI: ReadonlySet<Komut["tur"]> = new Set<Komut["tur"]>(["parsel_al", "yapi_yerlestir", "tesis_insa_hucre"]);

function sonrakiIzgara(t: Ms, aralik: Ms): Ms {
  return (Math.floor(t / aralik) + 1) * aralik;
}

/**
 * Botun ilçe önerisi yoksa katılım ilçesi: çekirdeğin varsayılan yurt seçimi (`yurtPlanla`; eski davranışla birebir aynı ilçe). Hiçbir ilçe yurt
 * veremiyorsa tanımsız kalır: çekirdek yurt veremeyen bir ilçeyle katılımı reddeder, yurtsuz katılımın katılım ilçesi yoktur (ayrılmış hücre alamaz).
 */
function varsayilanKatilimIlcesi(sim: Simulasyon): string | undefined {
  const plan = yurtPlanla(sim.dunya, sim.ic);
  return plan !== null && typeof plan !== "string" ? plan.ilce : undefined;
}

export function parselKos(secenek: ParselKosuSecenekleri): ParselKosuSonucu {
  const basla = Date.now();
  if (secenek.veri.parsel === undefined) throw new Error("parselKos: veri paketinde parsel fiksturu yok (mulk kipi kapali)");
  const aralik = secenek.kararAraligiMs ?? 6 * SAAT;
  const goz = secenek.gozlemAraligiMs;
  const sim = secenek.sim ?? Simulasyon.olustur(secenek.veri, secenek.tohum);
  if (sim.ic.mulk === undefined) throw new Error("parselKos: mulk kipi kapali (parametreler.mulk yok)");
  const oyuncular = secenek.oyuncular;
  const katildi = new Set<OyuncuId>(sim.dunya.oyuncular.map((o) => o.id));
  const yeniKatilan = new Set<OyuncuId>();
  const ekAnlar = [...new Set(secenek.ekGozlemMs ?? [])].sort((a, b) => a - b);

  const komutSayisi: Record<OyuncuId, number> = {};
  const basarisizSayisi: Record<OyuncuId, number> = {};
  const basarisizNedenleri: Record<string, number> = {};
  const komutTurleri: Record<string, number> = {};
  const komutGunlugu: ParselKomutKaydi[] = [];
  const sermaye: Record<OyuncuId, ParselSermayeKaydi[]> = {};
  const katilimlar: Record<OyuncuId, ParselKatilimKaydi> = {};
  for (const o of oyuncular) {
    komutSayisi[o.id] = 0;
    basarisizSayisi[o.id] = 0;
    sermaye[o.id] = [];
  }

  let t = sim.dunya.zaman;
  for (;;) {
    // 1. Katılımlar (zamanı gelmiş olanlar; katılım sırası dizi sırasıdır)
    for (const o of oyuncular) {
      if (katildi.has(o.id) || o.katilmaMs > t) continue;
      sim.calistirKadar(t);
      const karar = o.bot?.ilceKarari?.(sim);
      if (karar !== undefined && karar.ilce === null) {
        // Açık ilçe kararı: hiçbir ilçe yurt verebilir + açılışa uygun değil; çekirdeğin yedek ilçesine BIRAKILMAZ, oyuncu katılmaz.
        katildi.add(o.id);
        katilimlar[o.id] = { t, istenenIlce: undefined, ilceGeriDusuldu: false, reddedildi: `uygun ilce yok: ${karar.neden}`, uygunIlceYok: true, ilceNedeni: karar.neden };
        continue;
      }
      // Katılım ilçesi HER ZAMAN açık verilir (ayrılmış hücre yalnız katılım ilçesinde satılır; docs/06 §15.1): ilceSec kararı, botun önerisi, yoksa
      // çekirdeğin varsayılan seçimi (yurtPlanla); yurtsuz katılımda ilçe yoktur.
      const ilce = karar !== undefined ? (karar.ilce as string) : (o.bot?.katilimIlcesi(sim) ?? varsayilanKatilimIlcesi(sim));
      let r = sim.uygula({ t, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o.id, bolgeler: [], ...(ilce !== undefined ? { ilce } : {}) } });
      let geriDustu = false;
      if (!r.tamam && ilce !== undefined && karar === undefined) {
        // Bot önerisi yurt veremedi: çekirdeğin seçimine bırak.
        geriDustu = true;
        r = sim.uygula({ t, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o.id, bolgeler: [] } });
      }
      if (!r.tamam) {
        if (secenek.katilimRedDevam !== true) throw new Error(`parselKos: oyuncu katilamadi (${o.id}, t=${t}): ${r.hata}`);
        // Katılamayan oyuncu bir daha denenmez; komut vermez.
        katildi.add(o.id);
        katilimlar[o.id] = { t, istenenIlce: ilce, ilceGeriDusuldu: geriDustu, reddedildi: r.hata, ...(karar !== undefined ? { ilceNedeni: karar.neden } : {}) };
        continue;
      }
      katildi.add(o.id);
      yeniKatilan.add(o.id);
      katilimlar[o.id] = { t, istenenIlce: ilce, ilceGeriDusuldu: geriDustu, ...(karar !== undefined ? { ilceNedeni: karar.neden } : {}) };
    }

    // 2. Bot kararları (bitiş anında karar verilmez; yalnız gözlem yapılır)
    const kararAni = t < secenek.sureMs && (t % aralik === 0 || yeniKatilan.size > 0);
    if (kararAni) {
      sim.calistirKadar(t);
      // İlk hamle avantajını dağıtmak için sıra karar anı indeksine göre döndürülür (bölge kipi koşucusuyla aynı kural).
      const n = oyuncular.length;
      const kayma = n > 0 ? Math.floor(t / aralik) % n : 0;
      const sirali = kayma === 0 ? oyuncular : [...oyuncular.slice(kayma), ...oyuncular.slice(0, kayma)];
      for (const o of sirali) {
        if (!o.bot || !katildi.has(o.id)) continue;
        const zamani = t % aralik === 0 || yeniKatilan.has(o.id);
        if (!zamani) continue;
        for (const komut of o.bot.karar(sim)) {
          const once = SERMAYE_KOMUTLARI.has(komut.tur) ? anlikHazine(sim.dunya, o.id) : 0;
          const izleSonra = secenek.komutIzle?.(sim, t, o.id, komut);
          const r = sim.uygula({ t, oyuncu: o.id, komut });
          izleSonra?.(r.tamam);
          const kayit: ParselKomutKaydi = { t, oyuncu: o.id, tur: komut.tur, tamam: r.tamam };
          if ("tesisTuru" in komut) kayit.tesisTuru = komut.tesisTuru;
          if (r.tamam) {
            komutSayisi[o.id] = (komutSayisi[o.id] ?? 0) + 1;
            komutTurleri[komut.tur] = (komutTurleri[komut.tur] ?? 0) + 1;
            if (SERMAYE_KOMUTLARI.has(komut.tur)) {
              let yapiPara = 0;
              let yapiMalDegeri = 0;
              if (komut.tur !== "parsel_al") {
                // Bu komutla başlayan inşaatın ödenen tutarı (en son kimlik; aynı anda başlayan başka inşaat bu oyuncunun komut sırasındadır).
                let ins: (typeof sim.dunya.insaatlar)[number] | undefined;
                for (const i of sim.dunya.insaatlar) if (i.sahip === o.id && i.baslangic === t && (ins === undefined || i.id > ins.id)) ins = i;
                if (ins !== undefined) {
                  yapiPara = ins.odenenPara ?? 0;
                  for (const [mi, q] of ins.odenenMal ?? []) yapiMalDegeri += Math.floor((q * (sim.ic.mallar[mi]?.tabanFiyat ?? 0)) / MILI);
                }
              }
              (sermaye[o.id] as ParselSermayeKaydi[]).push({ t, tutar: once - anlikHazine(sim.dunya, o.id), yapiPara, yapiMalDegeri });
            }
          } else {
            basarisizSayisi[o.id] = (basarisizSayisi[o.id] ?? 0) + 1;
            const neden = `${komut.tur}: ${r.hata.replace(/-?\d+/g, "#")}`;
            basarisizNedenleri[neden] = (basarisizNedenleri[neden] ?? 0) + 1;
            kayit.hata = r.hata.replace(/-?\d+/g, "#");
          }
          komutGunlugu.push(kayit);
        }
      }
      yeniKatilan.clear();
    }

    // 3. Gözlem (ızgara + ek anlar)
    if (goz !== undefined && secenek.gozlem && (t % goz === 0 || t === secenek.sureMs || ekAnlar.includes(t))) {
      sim.calistirKadar(t);
      secenek.gozlem(sim, t);
    }

    if (t >= secenek.sureMs) break;

    // 4. Sonraki an
    let sonraki = Math.min(sonrakiIzgara(t, aralik), secenek.sureMs);
    if (goz !== undefined) {
      sonraki = Math.min(sonraki, sonrakiIzgara(t, goz));
      for (const a of ekAnlar) if (a > t) sonraki = Math.min(sonraki, a);
    }
    for (const o of oyuncular) if (!katildi.has(o.id) && o.katilmaMs > t) sonraki = Math.min(sonraki, o.katilmaMs);
    sim.calistirKadar(sonraki);
    t = sonraki;
  }
  sim.calistirKadar(secenek.sureMs);
  return { sim, komutSayisi, basarisizSayisi, basarisizNedenleri, komutTurleri, komutGunlugu, sermaye, katilimlar, sureMs: Date.now() - basla };
}
