/**
 * Dünya yazarı: paylaşılan dünyanın TEK YAZARI (ağdan bağımsız; WebSocket katmanı `sunucu.ts`'te).
 *
 * Komut yolu (yazma-önce-günlük):
 * 1. `komutGonder`: idempotans tablosuna bakılır (aynı (oyuncu, istemci, anahtar) ikinci kez kuyruğa girmez); yeni
 *    komut sunucu zamanıyla DAMGALANIR (`t = max(saat, son damga, dünya zamanı)`; istemci zamanı yok sayılır) ve
 *    bekleyenler kuyruğuna girer.
 * 2. Her tur (`commitAraligiMs`, 50–100 ms): bekleyenler seq alır, günlüğe TOPLU yazılır (`ekle` = fsync/commit),
 *    ANCAK SONRA sırayla `sim.uygula` edilir; sonuç idempotans tablosuna yazılır ve bekleyen yanıtlar çözülür.
 *    Günlük yazılamazsa hiçbir komut uygulanmamıştır: yazar durur (fail-stop), bellek ve günlük tutarlı kalır.
 * 3. Dünya `calistirKadar(min(saat, ilk bekleyen t))` ile ilerletilir (bekleyen komutun zamanını asla geçmez).
 * 4. Sunucu botları karar anlarında komut üretir (aynı yoldan: damga + günlük).
 * 5. Gerekirse anlık görüntü (her `goruntuAraligiMs` sim süresinde veya `goruntuKomutAraligi` komutta; açılışta
 *    görüntü yoksa ve kapanışta her zaman).
 * 6. Dinleyicilere (yayın) haber verilir.
 *
 * Başarısız komutlar da günlüğe girer (uygulamadan önce yazıldıkları için sonuç bilinmez). Çekirdek sözleşmesi
 * (docs/06 §14: başarısız komut durumu değiştirmez) ve determinizm sayesinde yeniden oynatmada aynı sonucu verirler;
 * kurtarma bu yüzden kalan günlüğü `Simulasyon.anlikGoruntudenYukle`'nin kuyruğu yerine tek tek `uygula` ile oynatır.
 *
 * Kurtarma: son anlık görüntü (`anlikGoruntudenYukle`: kural sürümü + zarf özeti denetimi; ek olarak üst verideki
 * özet karşılaştırılır) + görüntüden sonraki günlük kayıtları. Kurtarılan dünyanın zamanı, son kaydın `t`'si ile
 * görüntü zamanının büyüğüdür; canlı dünyayla karşılaştırma AYNI t'de yapılmalıdır (`calistirKadar(t)`, docs/06 §14).
 */
import { SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikGoruntuOlustur, kuralSurumuHesapla } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, KomutSonucu, Ms, OyuncuId } from "@bolge/cekirdek";
import type { Bot } from "@bolge/botlar";
import type { Dizin } from "@bolge/protokol";
import { SEMA_SURUMU } from "./depo/tipler";
import type { AnlikGoruntuKaydi, Depo, GunlukKaydi, IdempotansGirdisi } from "./depo/tipler";
import type { Saat } from "./saat";

export interface YazarSecenekleri {
  /** İçerik + parametre + harita; mülk kipi için `parsel` fikstürü de (çekirdek `param.mulk` + `parsel` ile açar). */
  veri: CekirdekVeriPaketi;
  /** Yalnız ilk açılışta (depoda görüntü yokken) kullanılır. */
  tohum: number;
  depo: Depo;
  saat: Saat;
  /** Grup commit aralığı (ms, duvar saati). Varsayılan 75. */
  commitAraligiMs?: number;
  /** Bir turda günlüğe yazılacak en çok komut (küresel tavan). Varsayılan 2000. */
  enCokToplu?: number;
  /** Anlık görüntü aralığı (sim ms). Varsayılan 6 sim-saat. */
  goruntuAraligiMs?: Ms;
  /** Bu kadar komutta bir de anlık görüntü. Varsayılan 10 000. */
  goruntuKomutAraligi?: number;
  /** Bir turda dünyanın en çok ilerleyeceği sim süresi (geride kalınca döngüyü kilitlememek için). Varsayılan 6 sim-saat. */
  enCokAdimMs?: Ms;
  /** İdempotans tablosunun en çok girdisi (eskiler atılır). Varsayılan 20 000. */
  idempotansTavani?: number;
  /** Sunucu botları (yük üreteci / NPC oyuncu). Katılmamışsa bölgeleriyle katılır. */
  botlar?: SunucuBotu[];
  /** Bot karar aralığı (sim ms). Varsayılan 6 sim-saat. */
  botKararAraligiMs?: Ms;
}

export interface SunucuBotu {
  bot: Bot;
  bolgeler: string[];
}

export interface KomutYaniti {
  seq: number;
  t: Ms;
  komut: Komut;
  sonuc: KomutSonucu;
  /** Anahtar daha önce işlenmişti; ilk sonuç döndü. */
  tekrar: boolean;
}

export interface KurtarmaRaporu {
  /** Kullanılan görüntünün seq'i (görüntü yoksa null). */
  goruntuSeq: number | null;
  goruntuZamani: Ms | null;
  /** Görüntüden sonra yeniden oynatılan günlük kaydı sayısı ve bunların başarısız olanları. */
  kalanKayit: number;
  kalanBasarisiz: number;
  seq: number;
  simZamani: Ms;
  durumOzeti: string;
  sureMs: number;
}

export interface TurOlayi {
  /** Bu turda uygulanan komut sayısı (başarılı + başarısız) ve başarılı olanlar. */
  uygulanan: number;
  basarili: number;
  /** Dünya zamanı ilerledi mi. */
  ilerledi: boolean;
}

interface Bekleyen {
  t: Ms;
  oyuncu: OyuncuId;
  istemci: string;
  anahtar: string;
  komut: Komut;
  girdi: IdempotansKaydi;
}

interface IdempotansKaydi {
  oyuncu: OyuncuId;
  istemci: string;
  anahtar: string;
  seq: number;
  t: Ms;
  komut: Komut;
  sonuc: KomutSonucu | null;
  bekleyenler: Array<{ coz: (y: KomutYaniti) => void; reddet: (e: Error) => void }>;
}

interface BotDurumu {
  b: SunucuBotu;
  katildi: boolean;
  sonIzgara: number;
}

function idempotansAnahtari(oyuncu: string, istemci: string, anahtar: string): string {
  return `${oyuncu}\u0000${istemci}\u0000${anahtar}`;
}

function uyku(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class DunyaYazari {
  readonly kuralSurumu: string;
  readonly commitAraligiMs: number;
  private readonly enCokToplu: number;
  private readonly goruntuAraligiMs: Ms;
  private readonly goruntuKomutAraligi: number;
  private readonly enCokAdimMs: Ms;
  private readonly idempotansTavani: number;
  private readonly botKararAraligiMs: Ms;

  /** Son uygulanan (= son günlüğe yazılan) seq. */
  private seqDegeri = 0;
  private sonDamga: Ms = 0;
  private bekleyenler: Bekleyen[] = [];
  private readonly idempotans = new Map<string, IdempotansKaydi>();
  private sonGoruntuZamani: Ms = 0;
  private sonGoruntuSeq = 0;
  private readonly botlar: BotDurumu[] = [];
  private botAnahtarSayaci = 0;
  private readonly dinleyiciler: Array<(o: TurOlayi) => void> = [];
  private durgunlukBekleyenleri: Array<{ t: Ms; coz: () => void }> = [];
  private calisiyor = false;
  private dongu: Promise<void> | null = null;
  private olumcul: Error | null = null;
  private olumculDinleyici: ((e: Error) => void) | null = null;
  private uyariDinleyici: ((m: string) => void) | null = null;
  /** Son başarısız anlık görüntü denemesinin hatası (başarılı görüntüde temizlenir). */
  sonGoruntuHatasi: string | null = null;

  private constructor(
    readonly sim: Simulasyon,
    private readonly s: YazarSecenekleri,
    readonly kurtarma: KurtarmaRaporu,
  ) {
    this.kuralSurumu = kuralSurumuHesapla(s.veri);
    this.commitAraligiMs = s.commitAraligiMs ?? 75;
    this.enCokToplu = s.enCokToplu ?? 2000;
    this.goruntuAraligiMs = s.goruntuAraligiMs ?? 6 * SAAT;
    this.goruntuKomutAraligi = s.goruntuKomutAraligi ?? 10_000;
    this.enCokAdimMs = s.enCokAdimMs ?? 6 * SAAT;
    this.idempotansTavani = s.idempotansTavani ?? 20_000;
    this.botKararAraligiMs = s.botKararAraligiMs ?? 6 * SAAT;
  }

  /** Depodan kurtarır (görüntü + kalan günlük) ya da yeni dünya kurar; saati dünyanın zamanından başlatır. */
  static async ac(s: YazarSecenekleri): Promise<DunyaYazari> {
    const bas = performance.now();
    const kuralSurumu = kuralSurumuHesapla(s.veri);
    const g = await s.depo.goruntu.sonuncu();
    let sim: Simulasyon;
    let seq = 0;
    let idempotansGirdileri: IdempotansGirdisi[] = [];
    if (g) {
      if (g.kuralSurumu !== kuralSurumu) {
        throw new Error(`kural surumu uyusmuyor: goruntu ${g.kuralSurumu}, veri ${kuralSurumu} (donem sinirinda goc gerekir)`);
      }
      if (g.semaSurumu !== SEMA_SURUMU) throw new Error(`desteklenmeyen goruntu sema surumu: ${g.semaSurumu}`);
      sim = Simulasyon.anlikGoruntudenYukle(s.veri, g.metin);
      const ozet = sim.durumOzeti();
      if (ozet !== g.durumOzeti) throw new Error(`goruntu ust verisindeki ozet uyusmuyor: ${g.durumOzeti} != ${ozet}`);
      seq = g.seq;
      idempotansGirdileri = g.ek.idempotans;
    } else {
      sim = Simulasyon.olustur(s.veri, s.tohum);
    }
    const kalan = await s.depo.gunluk.oku(seq);
    const y = new DunyaYazari(sim, s, {
      goruntuSeq: g ? g.seq : null,
      goruntuZamani: g ? g.simZamani : null,
      kalanKayit: kalan.length,
      kalanBasarisiz: 0,
      seq: 0,
      simZamani: 0,
      durumOzeti: "",
      sureMs: 0,
    });
    for (const e of idempotansGirdileri) {
      y.idempotans.set(idempotansAnahtari(e.oyuncu, e.istemci, e.anahtar), { oyuncu: e.oyuncu, istemci: e.istemci, anahtar: e.anahtar, seq: e.seq, t: e.t, komut: e.komut, sonuc: e.tamam ? { tamam: true } : { tamam: false, hata: e.hata ?? "" }, bekleyenler: [] });
    }
    y.seqDegeri = seq;
    for (const k of kalan) {
      if (k.seq !== y.seqDegeri + 1) throw new Error(`gunluk seq boslugu: ${y.seqDegeri} -> ${k.seq}`);
      if (k.kuralSurumu !== kuralSurumu) throw new Error(`gunluk kaydi ${k.seq} farkli kural surumuyle yazilmis: ${k.kuralSurumu}`);
      const r = sim.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
      if (!r.tamam) y.kurtarma.kalanBasarisiz++;
      y.seqDegeri = k.seq;
      y.idempotansYaz(idempotansAnahtari(k.oyuncu, k.istemci, k.anahtar), { oyuncu: k.oyuncu, istemci: k.istemci, anahtar: k.anahtar, seq: k.seq, t: k.t, komut: k.komut, sonuc: r, bekleyenler: [] });
    }
    y.yerlestir();
    y.sonDamga = sim.dunya.zaman;
    y.sonGoruntuZamani = g ? g.simZamani : sim.dunya.zaman;
    y.sonGoruntuSeq = g ? g.seq : 0;
    s.saat.baslat(sim.dunya.zaman);
    for (const b of s.botlar ?? []) {
      const katildi = sim.dunya.oyuncular.some((o) => o.id === b.bot.oyuncu);
      y.botlar.push({ b, katildi, sonIzgara: Math.floor(sim.dunya.zaman / y.botKararAraligiMs) });
      if (!katildi) {
        y.komutGonder(SISTEM_OYUNCUSU, "sunucu", `katil:${b.bot.oyuncu}`, { tur: "oyuncu_katil", oyuncu: b.bot.oyuncu, bolgeler: b.bolgeler }).catch(() => undefined);
      }
    }
    // Görüntü yoksa hemen al: tohum ve başlangıç durumu kalıcı olsun (sonraki açılışlar tohuma bağlı kalmaz).
    if (!g) await y.goruntuAl();
    Object.assign(y.kurtarma, { seq: y.seqDegeri, simZamani: sim.dunya.zaman, durumOzeti: sim.durumOzeti(), sureMs: Math.round(performance.now() - bas) });
    return y;
  }

  get seq(): number {
    return this.seqDegeri;
  }

  get bekleyenSayisi(): number {
    return this.bekleyenler.length;
  }

  get saat(): Saat {
    return this.s.saat;
  }

  dizin(): Dizin {
    const ic = this.sim.ic;
    return {
      bolgeler: this.sim.dunya.bolgeler.map((b) => b.id),
      mallar: ic.mallar.map((m) => m.id),
      tesisTurleri: ic.tesisTurleri.map((t) => t.id),
      yontemler: ic.yontemler.map((y) => y.id),
      birlikler: ic.birlikler.map((b) => b.id),
      teknolojiler: ic.teknolojiler.map((t) => t.id),
    };
  }

  /** Bu anahtar daha önce görüldü mü (bekliyor ya da bitti). Ağ katmanı hız sınırını yalnız yeni komutlara uygular. */
  anahtarVarMi(oyuncu: OyuncuId, istemci: string, anahtar: string): boolean {
    return this.idempotans.has(idempotansAnahtari(oyuncu, istemci, anahtar));
  }

  /**
   * Komutu damgalar ve kuyruğa alır; yanıt, komut günlüğe yazılıp uygulandıktan sonra çözülür. Aynı anahtar daha
   * önce görüldüyse yeniden kuyruğa girmez: ilk sonuç `tekrar: true` ile döner (bekliyorsa uygulanınca).
   */
  komutGonder(oyuncu: OyuncuId, istemci: string, anahtar: string, komut: Komut): Promise<KomutYaniti> {
    if (this.olumcul) return Promise.reject(this.olumcul);
    const ia = idempotansAnahtari(oyuncu, istemci, anahtar);
    const var_ = this.idempotans.get(ia);
    if (var_) {
      if (var_.sonuc) return Promise.resolve({ seq: var_.seq, t: var_.t, komut: var_.komut, sonuc: var_.sonuc, tekrar: true });
      return new Promise((coz, reddet) => var_.bekleyenler.push({ coz: (y) => coz({ ...y, tekrar: true }), reddet }));
    }
    const t = Math.max(this.s.saat.simdi(), this.sonDamga, this.sim.dunya.zaman);
    this.sonDamga = t;
    const girdi: IdempotansKaydi = { oyuncu, istemci, anahtar, seq: 0, t, komut: structuredClone(komut), sonuc: null, bekleyenler: [] };
    this.idempotansYaz(ia, girdi);
    this.bekleyenler.push({ t, oyuncu, istemci, anahtar, komut: girdi.komut, girdi });
    return new Promise((coz, reddet) => girdi.bekleyenler.push({ coz, reddet }));
  }

  private idempotansYaz(ia: string, g: IdempotansKaydi): void {
    this.idempotans.delete(ia);
    this.idempotans.set(ia, g);
    if (this.idempotans.size <= this.idempotansTavani) return;
    // En eski BİTMİŞ girdileri at (bekleyenler atılmaz).
    for (const [k, v] of this.idempotans) {
      if (this.idempotans.size <= this.idempotansTavani) break;
      if (v.sonuc) this.idempotans.delete(k);
    }
  }

  /** Tur sonu dinleyicisi (yayın için). */
  dinle(f: (o: TurOlayi) => void): void {
    this.dinleyiciler.push(f);
  }

  /** Ölümcül hata (günlük yazılamadı vb.) dinleyicisi; yazar bundan sonra komut kabul etmez. */
  olumculHata(f: (e: Error) => void): void {
    this.olumculDinleyici = f;
  }

  /**
   * Dünya `t`'ye (verilmezse saatin şimdisine) ulaşıp kuyruk boşalınca çözülür. Elle saatte zamanIlerlet'in yanıtı ve
   * testler için "her şey uygulandı" noktasıdır.
   */
  durgunlukBekle(t?: Ms): Promise<void> {
    return new Promise((coz) => this.durgunlukBekleyenleri.push({ t: t ?? this.s.saat.simdi(), coz }));
  }

  /**
   * Dünyayı şu anki zamanına yerleştirir: `calistirKadar(zaman)`, yani aynı t'de bekleyen olayları (komutun planladığı
   * `cozum` gibi) işler. Değer korur: o t'de gelecek her komut `uygula` içinde zaten önce bunu yapar; yalnız özet ve
   * görüntünün "aynı t'de calistirKadar(t)" noktasında alınmasını sağlar (docs/06 §14).
   */
  private yerlestir(): void {
    this.sim.calistirKadar(this.sim.dunya.zaman);
  }

  /** O anki (tutarlı, t'ye yerleşmiş) durumun özeti: tur arasında çağrılır; `seq`'e kadar her komut uygulanmıştır. */
  ozet(): { t: Ms; seq: number; durumOzeti: string } {
    this.yerlestir();
    return { t: this.sim.dunya.zaman, seq: this.seqDegeri, durumOzeti: this.sim.durumOzeti() };
  }

  baslat(): void {
    if (this.calisiyor) return;
    this.calisiyor = true;
    this.dongu = (async () => {
      while (this.calisiyor) {
        const bas = performance.now();
        await this.birTur();
        if (this.olumcul) break;
        await uyku(Math.max(1, this.commitAraligiMs - (performance.now() - bas)));
      }
    })();
  }

  /** Döngüyü durdurur, kuyruğu son kez yazar ve uygular, kapanış görüntüsünü alır, depoyu kapatır. */
  async kapat(): Promise<void> {
    this.calisiyor = false;
    await this.dongu;
    this.dongu = null;
    if (!this.olumcul) {
      while (this.bekleyenler.length > 0) await this.birTur(false);
      await this.goruntuDene();
    }
    await this.s.depo.gunluk.kapat();
    await this.s.depo.goruntu.kapat();
  }

  /** Bir grup commit turu (döngü dışında testlerden de çağrılabilir). */
  async birTur(ilerlet = true): Promise<void> {
    if (this.olumcul) return;
    const zaman0 = this.sim.dunya.zaman;
    let uygulanan = 0;
    let basarili = 0;
    // 1. Günlüğe yaz (önce), sonra uygula.
    const toplu = this.bekleyenler.splice(0, this.enCokToplu);
    if (toplu.length > 0) {
      const kayitlar: GunlukKaydi[] = toplu.map((b, i) => ({
        seq: this.seqDegeri + 1 + i,
        t: b.t,
        oyuncu: b.oyuncu,
        komut: b.komut,
        istemci: b.istemci,
        anahtar: b.anahtar,
        kuralSurumu: this.kuralSurumu,
        semaSurumu: SEMA_SURUMU,
      }));
      try {
        await this.s.depo.gunluk.ekle(kayitlar);
      } catch (e) {
        this.olumculYap(e instanceof Error ? e : new Error(String(e)), toplu);
        return;
      }
      for (let i = 0; i < toplu.length; i++) {
        const b = toplu[i] as Bekleyen;
        const k = kayitlar[i] as GunlukKaydi;
        const sonuc = this.sim.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
        this.seqDegeri = k.seq;
        uygulanan++;
        if (sonuc.tamam) basarili++;
        b.girdi.seq = k.seq;
        b.girdi.sonuc = sonuc;
        const yanit: KomutYaniti = { seq: k.seq, t: k.t, komut: k.komut, sonuc, tekrar: false };
        for (const w of b.girdi.bekleyenler.splice(0)) w.coz(yanit);
      }
    }
    // 2. Dünyayı ilerlet (bekleyen bir komutun zamanını geçmeden).
    if (ilerlet) {
      let hedef = this.s.saat.simdi();
      const ilk = this.bekleyenler[0];
      if (ilk) hedef = Math.min(hedef, ilk.t);
      hedef = Math.min(hedef, this.sim.dunya.zaman + this.enCokAdimMs);
      // `>=`: zaman ilerlemese bile aynı t'deki bekleyen olaylar (ör. son komutun planladığı `cozum`) işlenir; tur
      // sonundaki dünya her zaman "t'ye yerleşmiş" durumdur (docs/06 §14: karşılaştırma aynı t'de calistirKadar(t)).
      if (hedef >= this.sim.dunya.zaman) this.sim.calistirKadar(hedef);
    } else {
      this.yerlestir();
    }
    // 3. Sunucu botları.
    this.botTuru();
    // 4. Anlık görüntü.
    if (
      this.sim.dunya.zaman - this.sonGoruntuZamani >= this.goruntuAraligiMs ||
      this.seqDegeri - this.sonGoruntuSeq >= this.goruntuKomutAraligi
    ) {
      await this.goruntuDene();
    }
    // 5. Durgunluk bekleyenleri.
    if (this.bekleyenler.length === 0 && this.durgunlukBekleyenleri.length > 0) {
      const z = this.sim.dunya.zaman;
      const kalan: typeof this.durgunlukBekleyenleri = [];
      for (const w of this.durgunlukBekleyenleri) {
        if (z >= w.t) w.coz();
        else kalan.push(w);
      }
      this.durgunlukBekleyenleri = kalan;
    }
    // 6. Yayın.
    const olay: TurOlayi = { uygulanan, basarili, ilerledi: this.sim.dunya.zaman > zaman0 };
    for (const f of this.dinleyiciler) f(olay);
  }

  private botTuru(): void {
    const z = this.sim.dunya.zaman;
    const izgara = Math.floor(z / this.botKararAraligiMs);
    for (const d of this.botlar) {
      let karar = false;
      if (!d.katildi) {
        if (!this.sim.dunya.oyuncular.some((o) => o.id === d.b.bot.oyuncu)) continue;
        d.katildi = true;
        karar = true;
      } else if (izgara > d.sonIzgara) {
        karar = true;
      }
      if (!karar) continue;
      d.sonIzgara = izgara;
      for (const komut of d.b.bot.karar(this.sim)) {
        // Bot yanıtını bekleyen yok; sonuç idempotans tablosunda ve günlükte kalır.
        this.komutGonder(d.b.bot.oyuncu, "sunucu-bot", `bot:${z}:${this.botAnahtarSayaci++}`, komut).catch(() => undefined);
      }
    }
  }

  /** Uyarı dinleyicisi (ör. anlık görüntü alınamadı; dünya ve günlük etkilenmez). */
  uyari(f: (m: string) => void): void {
    this.uyariDinleyici = f;
  }

  /**
   * Görüntü almayı dener; başarısızlık döngüyü durdurmaz (günlük sağlamdır, kurtarma daha eski görüntü + daha uzun
   * kuyrukla yapılır). Bir sonraki deneme bir görüntü aralığı sonradır.
   */
  private async goruntuDene(): Promise<void> {
    try {
      await this.goruntuAl();
      this.sonGoruntuHatasi = null;
    } catch (e) {
      this.sonGoruntuHatasi = e instanceof Error ? e.message : String(e);
      this.sonGoruntuZamani = this.sim.dunya.zaman;
      this.sonGoruntuSeq = this.seqDegeri;
      this.uyariDinleyici?.(`anlik goruntu alinamadi: ${this.sonGoruntuHatasi}`);
    }
  }

  /**
   * GEÇİCİ (çekirdek hatası): `lojistik/akis.ts` MCF önbellek kaydının `yol` dizisini akışa doğrudan koyuyor
   * (`yol: y.yol`); önbellek isabetinde iki akış (ve modül önbelleği) aynı diziyi paylaşıyor ve `dunyaSerilestir`
   * paylaşılan referansı reddediyor. Çekirdek bu dizileri hiç değiştirmediği için kopyalamak değer korur (özet aynı)
   * ve canlı dünyayı JSON'dan kurtarılan dünyayla yapısal olarak aynı yapar. Çekirdek düzeltilince kaldırılmalı.
   */
  private paylasimiKir(): void {
    for (const a of this.sim.dunya.lojistik.akislar) a.yol = a.yol.slice();
  }

  /** Anlık görüntü alır ve kaydeder (bekleyen, henüz günlüğe yazılmamış komut görüntüye girmez; hepsi uygulanmamıştır). */
  async goruntuAl(): Promise<AnlikGoruntuKaydi> {
    this.yerlestir();
    this.paylasimiKir();
    const metin = anlikGoruntuOlustur(this.sim, this.kuralSurumu);
    // Zarf kanonik JSON'dur ve `durumOzeti` dünyadan SONRA gelir: son geçiş zarfınkidir (dünyayı ikinci kez özetlemeyiz).
    const ozetIndeksi = metin.lastIndexOf('"durumOzeti":"');
    const durumOzeti = metin.slice(ozetIndeksi + 14, ozetIndeksi + 30);
    if (!/^[0-9a-f]{16}$/.test(durumOzeti)) throw new Error("anlik goruntu zarfinda durumOzeti bulunamadi");
    const idempotans: IdempotansGirdisi[] = [];
    for (const v of this.idempotans.values()) {
      if (!v.sonuc) continue;
      const ortak = { oyuncu: v.oyuncu, istemci: v.istemci, anahtar: v.anahtar, seq: v.seq, t: v.t, komut: v.komut };
      idempotans.push(v.sonuc.tamam ? { ...ortak, tamam: true } : { ...ortak, tamam: false, hata: v.sonuc.hata });
    }
    const g: AnlikGoruntuKaydi = {
      seq: this.seqDegeri,
      simZamani: this.sim.dunya.zaman,
      kuralSurumu: this.kuralSurumu,
      semaSurumu: SEMA_SURUMU,
      durumOzeti,
      metin,
      ek: { tohum: this.sim.dunya.tohum, idempotans },
    };
    await this.s.depo.goruntu.kaydet(g);
    this.sonGoruntuZamani = g.simZamani;
    this.sonGoruntuSeq = g.seq;
    return g;
  }

  private olumculYap(e: Error, toplu: Bekleyen[]): void {
    this.olumcul = new Error(`gunluk yazilamadi; yazar durdu: ${e.message}`);
    this.calisiyor = false;
    for (const b of [...toplu, ...this.bekleyenler]) for (const w of b.girdi.bekleyenler.splice(0)) w.reddet(this.olumcul);
    this.bekleyenler = [];
    this.olumculDinleyici?.(this.olumcul);
  }
}
