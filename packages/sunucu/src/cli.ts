/**
 * Sunucu komut satırı: `pnpm sunucu -- [seçenekler]` (kök package.json) ya da `tsx packages/sunucu/src/cli.ts`.
 * Olayları stdout'a satır başına bir JSON olarak yazar (`{"olay":"hazir",...}`); SIGINT/SIGTERM'de düzgün kapanır
 * (kuyruk yazılır, kapanış görüntüsü alınır). Seçenekler için `--yardim`.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { gercekVeriyiYukle, miniVeriyiYukle, parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { ARKETIPLER, botOlustur } from "@bolge/botlar";
import type { ArketipAdi } from "@bolge/botlar";
import { SAAT } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, IcerikKimlikTablosu } from "@bolge/cekirdek";
import { bellekDeposu } from "./depo/bellek";
import { dosyaDeposu } from "./depo/dosya";
import { postgresDeposu } from "./depo/postgres";
import type { Depo } from "./depo/tipler";
import { GelistirmeKimligi, gelistirmeTokeni } from "./kimlik";
import { parselDosyasiYukle } from "./parsel-dosya";
import { DuvarSaati, ElleSaat } from "./saat";
import { sunucuBaslat } from "./sunucu";
import { DunyaYazari } from "./yazar";
import type { SunucuBotu } from "./yazar";

const YARDIM = `Bolge Stratejisi sunucusu
  --port N             dinlenecek port (vars. 8787; 0 = rastgele)
  --host H             (vars. 127.0.0.1)
  --harita AD          mini | sentetik | gercek[:ad] (vars. sentetik)
  --parsel             mulk kipi: haritanin parsel fiksturu (mini -> mini-6, sentetik -> sentetik-50)
  --parsel-dosya YOL   mulk kipi: verilen parsel fiksturu JSON'u (@bolge/veri dogrulayicisindan, harita ile, gecer);
                       --parsel ile birlikte verilmez
  --tohum N            yalniz ilk acilista (vars. 1)
  --depo TUR           bellek | dosya | pg (vars. dosya)
  --dizin YOL          dosya deposu dizini (vars. raporlar/dunya; git disi)
  --pg-url URL         pg deposu (vars. $BOLGE_PG_URL); --dunya AD (vars. ana)
  --hiz X              sim ms / gercek ms (vars. 1 = gercek zaman, MUTLAK saat: t = duvar - dunya-epoch;
                       kapaliyken de akar, acilista yetisilir). 1'den farkli hiz birikimli kiptir
  --goc                icerik gocune izin (varsayilan KAPALI: kural surumu degismisse hata). Yalniz donem sinirinda,
                       goruntuden sonra gunluk kaydi yokken; icerik yalniz SONA eklenebilir. Oncesinde veri dizinini yedekleyin
                       (yeni goruntu ayni seq/zamanda eskisinin uzerine yazilir)
  --goc-eski-tablo YOL zarf SURUM 1 goruntuyu gocururken goruntunun yazildigi icerigin kimlik tablosu (JSON; surum 2 goruntu
                       tablosunu kendisi tasir)
  --goc-esnek          (yalniz gelistirme) gocte araya ekleme/siralama degisimine de izin
  --birikimli          kapaliyken duran eski saat (hiz 1 ile bile); mutlak saat degil
  --dunya-epoch T      yalniz yeni dunyada: duvar saati epoch'u (ISO, ornek 2026-09-30T21:00:00Z, ya da epoch ms);
                       bir Turkiye gece yarisi (UTC+3) olmali (vars. 2026-09-30T21:00:00Z = 1 Ekim 2026 00:00 TRT)
  --elle-saat          saat yalniz yoneticinin zamanIlerlet mesajiyla ilerler (test/gelistirme)
  --commit-ms N        grup commit araligi (vars. 75)
  --goruntu-saat N     anlik goruntu araligi, sim-saat (vars. 6)
  --yedekten-don ETIKET  pg: icerik gocu yedegini ("goc-<eskiKural>"; hazir olayinda kurtarma.goc.yedek ya da SELECT etiket FROM snapshot_yedek) en yeni goruntu yapar
                       ve cikar (sunucu KAPALI olmali: dunya kilidi alinir); sonra eski icerikle (--goc'suz) acin
  --odul 0|1           Esnaf Defteri odul dedektoru: kavram saptaninca sistem_odul gunluge girer (vars. 1; 0 = kapali, odul komutu yok)
  --goruntu-isci 0|1   periyodik goruntu serilestirme/ozet/gzip'i worker_threads isciye tasi (vars. 1; 0 = ana donguda)
  --hiz-siniri K/S     oyuncu basina token-kova: kapasite/saniyede jeton (vars. 20/5)
  --botlar A,B         sunucu botlari (arketip; i. bot haritadaki i. devletin bolgeleriyle katilir)
  --metrik-port N      ayri metrik HTTP portu (/metrik Prometheus metni, /saglik, /hazir); verilmezse metrik ucu kapali.
                       Varsayilan adres 127.0.0.1; loopback disi --metrik-host icin --metrik-token (>= 16 karakter) zorunlu
  --metrik-host H      (vars. 127.0.0.1)
  --metrik-token T     /metrik icin Bearer token ($BOLGE_METRIK_TOKEN)
  --uretim             uretim kipi ($BOLGE_URETIM=1): gelistirme sirri acikca (>= 16 karakter) verilmeli, --elle-saat yasak
  --gelistirme-sirri S gelistirme token imza sirri (vars. $BOLGE_GELISTIRME_SIRRI)
  --token OYUNCU       bu oyuncu icin gelistirme token'i yaz ve cik ("sistem" = yonetici)

Ortam degiskenleri: her secenek BOLGE_<AD> ile de verilir (bayrak ortamdan ustundur): BOLGE_PORT, BOLGE_HOST, BOLGE_HARITA,
BOLGE_PARSEL (1), BOLGE_PARSEL_DOSYA, BOLGE_TOHUM, BOLGE_DEPO, BOLGE_DIZIN, BOLGE_PG_URL, BOLGE_DUNYA, BOLGE_HIZ, BOLGE_ELLE_SAAT (1),
BOLGE_BIRIKIMLI (1), BOLGE_DUNYA_EPOCH, BOLGE_GOC (1), BOLGE_GOC_ESNEK (1), BOLGE_GOC_ESKI_TABLO, BOLGE_COMMIT_MS, BOLGE_GORUNTU_SAAT, BOLGE_GORUNTU_ISCI (0|1), BOLGE_ODUL (0|1),
BOLGE_HIZ_SINIRI, BOLGE_BOTLAR, BOLGE_METRIK_PORT, BOLGE_METRIK_HOST, BOLGE_METRIK_TOKEN, BOLGE_URETIM (1), BOLGE_GELISTIRME_SIRRI.`;

function yaz(olay: string, veri: Record<string, unknown> = {}): void {
  process.stdout.write(JSON.stringify({ olay, ...veri }) + "\n");
}

function veriYukle(ad: string): VeriPaketi {
  if (ad === "mini") return miniVeriyiYukle();
  if (ad === "sentetik") return varsayilanVeriyiYukle();
  if (ad === "gercek") return gercekVeriyiYukle();
  if (ad.startsWith("gercek:")) return gercekVeriyiYukle(ad.slice("gercek:".length));
  throw new Error(`bilinmeyen harita: ${ad}`);
}

function botlarKur(veri: VeriPaketi, liste: string): SunucuBotu[] {
  if (liste.trim() === "") return [];
  const devletBolge = new Map<string, string[]>();
  for (const b of veri.harita.bolgeler) {
    if (!devletBolge.has(b.devlet)) devletBolge.set(b.devlet, []);
    devletBolge.get(b.devlet)?.push(b.id);
  }
  const devletler = [...devletBolge.values()];
  return liste.split(",").map((a, i) => {
    const arketip = a.trim() as ArketipAdi;
    if (!ARKETIPLER.includes(arketip)) throw new Error(`bilinmeyen bot arketipi: ${a}`);
    const bolgeler = devletler[i];
    if (!bolgeler) throw new Error(`haritada ${i + 1}. bot icin devlet yok`);
    return { bot: botOlustur(arketip, `bot${i}`, 1), bolgeler };
  });
}

/** Ortam değişkeni `BOLGE_<AD>` (yoksa varsayılan); bayraklar ortamdan üstündür (parseArgs varsayılanı olarak verilir). */
const ev = (ad: string, d?: string): string | undefined => {
  const v = process.env[`BOLGE_${ad}`];
  return v !== undefined && v !== "" ? v : d;
};
const evBool = (ad: string): boolean => ["1", "true", "evet"].includes((process.env[`BOLGE_${ad}`] ?? "").toLowerCase());
/** Tanımsızsa seçeneğe `default` eklenmez (parseArgs dize varsayılanı ister). */
const varsayilan = (d: string | undefined): { default: string } | Record<string, never> => (d !== undefined ? { default: d } : {});

async function ana(): Promise<void> {
  // `pnpm sunucu -- --port 0` biçiminde gelen baştaki "--" atılır.
  const argv = process.argv.slice(2);
  if (argv[0] === "--") argv.shift();
  const { values: a } = parseArgs({
    args: argv,
    options: {
      port: { type: "string", default: ev("PORT", "8787") as string },
      host: { type: "string", default: ev("HOST", "127.0.0.1") as string },
      harita: { type: "string", default: ev("HARITA", "sentetik") as string },
      parsel: { type: "boolean", default: evBool("PARSEL") },
      "parsel-dosya": { type: "string", ...varsayilan(ev("PARSEL_DOSYA")) },
      tohum: { type: "string", default: ev("TOHUM", "1") as string },
      depo: { type: "string", default: ev("DEPO", "dosya") as string },
      dizin: { type: "string", default: ev("DIZIN", "raporlar/dunya") as string },
      "pg-url": { type: "string" },
      dunya: { type: "string", default: ev("DUNYA", "ana") as string },
      hiz: { type: "string", default: ev("HIZ", "1") as string },
      "elle-saat": { type: "boolean", default: evBool("ELLE_SAAT") },
      birikimli: { type: "boolean", default: evBool("BIRIKIMLI") },
      goc: { type: "boolean", default: evBool("GOC") },
      "goc-esnek": { type: "boolean", default: evBool("GOC_ESNEK") },
      "goc-eski-tablo": { type: "string", ...varsayilan(ev("GOC_ESKI_TABLO")) },
      "dunya-epoch": { type: "string", ...varsayilan(ev("DUNYA_EPOCH")) },
      "commit-ms": { type: "string", default: ev("COMMIT_MS", "75") as string },
      "goruntu-saat": { type: "string", default: ev("GORUNTU_SAAT", "6") as string },
      "goruntu-isci": { type: "string", default: ev("GORUNTU_ISCI", "1") as string },
      odul: { type: "string", default: ev("ODUL", "1") as string },
      "yedekten-don": { type: "string" },
      botlar: { type: "string", default: ev("BOTLAR", "") as string },
      "hiz-siniri": { type: "string", default: ev("HIZ_SINIRI", "20/5") as string },
      "metrik-port": { type: "string", ...varsayilan(ev("METRIK_PORT")) },
      "metrik-host": { type: "string", default: ev("METRIK_HOST", "127.0.0.1") as string },
      "metrik-token": { type: "string", ...varsayilan(ev("METRIK_TOKEN")) },
      uretim: { type: "boolean", default: evBool("URETIM") },
      "gelistirme-sirri": { type: "string" },
      token: { type: "string" },
      yardim: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });
  if (a.yardim) {
    process.stdout.write(YARDIM + "\n");
    return;
  }
  const sir = a["gelistirme-sirri"] ?? process.env.BOLGE_GELISTIRME_SIRRI ?? "gelistirme-sirri-degistir";
  if (a.token !== undefined) {
    process.stdout.write(gelistirmeTokeni(sir, a.token) + "\n");
    return;
  }
  if (a.uretim) {
    if (process.env.BOLGE_GELISTIRME_SIRRI === undefined && a["gelistirme-sirri"] === undefined) throw new Error("uretim kipi: BOLGE_GELISTIRME_SIRRI (ya da --gelistirme-sirri) acikca verilmeli");
    if (sir.length < 16 || sir === "gelistirme-sirri-degistir" || sir.startsWith("degistir")) throw new Error("uretim kipi: gelistirme sirri en az 16 karakter olmali ve varsayilan/ornek ('degistir...') deger olmamali");
    const mt = a["metrik-token"];
    if (mt !== undefined && mt.startsWith("degistir")) throw new Error("uretim kipi: metrik token'i ornek ('degistir...') deger olmamali");
    if (a["elle-saat"]) throw new Error("uretim kipi: --elle-saat yasak");
  }
  if (a["yedekten-don"] !== undefined) {
    // Kural donemi geri donusu (README "Kural donemi provasi"): dunya acilmaz, yalniz yedek en yeni goruntu yapilir.
    if (a.depo !== "pg") throw new Error("--yedekten-don yalniz --depo pg ile");
    const pgUrl = a["pg-url"] ?? process.env.BOLGE_PG_URL;
    if (!pgUrl) throw new Error("--yedekten-don icin --pg-url veya BOLGE_PG_URL gerekli");
    const d = await postgresDeposu({ baglanti: pgUrl, dunya: a.dunya as string, semaKur: false });
    try {
      const g = await d.yedektenDon(a["yedekten-don"]);
      yaz("yedektenDon", { dunya: a.dunya, etiket: a["yedekten-don"], seq: g.seq, simZamani: g.simZamani, kuralSurumu: g.kuralSurumu, durumOzeti: g.durumOzeti });
    } finally {
      await d.gunluk.kapat();
    }
    return;
  }
  const sayi = (ad: string, d: string | undefined): number => {
    const n = Number(d);
    if (!Number.isFinite(n) || n < 0) throw new Error(`--${ad} gecersiz: ${d}`);
    return n;
  };

  const veri: CekirdekVeriPaketi = veriYukle(a.harita as string);
  if (a.parsel) {
    const ad = ({ mini: "mini-6", sentetik: "sentetik-50" } as Record<string, string>)[a.harita as string];
    if (!ad) throw new Error(`--parsel yalniz mini ve sentetik haritayla: ${a.harita}`);
    if ((a.botlar as string).trim() !== "") throw new Error("sunucu botlari mulk kipini henuz oynamiyor (--botlar ile --parsel birlikte olmaz)");
    veri.parsel = parselFiksturuYukle(ad);
  }
  if (a["parsel-dosya"] !== undefined) {
    if (a.parsel) throw new Error("--parsel ve --parsel-dosya birlikte verilemez");
    if ((a.botlar as string).trim() !== "") throw new Error("sunucu botlari mulk kipini henuz oynamiyor (--botlar ile --parsel-dosya birlikte olmaz)");
    veri.parsel = parselDosyasiYukle(resolve(a["parsel-dosya"]), veri);
  }
  let depo: Depo;
  if (a.depo === "bellek") depo = bellekDeposu();
  else if (a.depo === "dosya") depo = await dosyaDeposu(resolve(a.dizin as string));
  else if (a.depo === "pg") {
    const url = a["pg-url"] ?? process.env.BOLGE_PG_URL;
    if (!url) throw new Error("pg deposu icin --pg-url veya BOLGE_PG_URL gerekli");
    depo = await postgresDeposu({ baglanti: url, dunya: a.dunya as string, semaKur: true });
  } else throw new Error(`bilinmeyen depo: ${a.depo}`);

  const saat = a["elle-saat"] ? new ElleSaat() : new DuvarSaati(sayi("hiz", a.hiz), a.birikimli ? { birikimli: true } : {});
  let dunyaEpochMs: number | undefined;
  const epochMetni = a["dunya-epoch"];
  if (epochMetni !== undefined) {
    dunyaEpochMs = /^\d+$/.test(epochMetni) ? Number(epochMetni) : Date.parse(epochMetni);
    if (!Number.isSafeInteger(dunyaEpochMs)) throw new Error(`--dunya-epoch gecersiz: ${epochMetni}`);
  }
  const yazar = await DunyaYazari.ac({
    veri,
    tohum: Math.trunc(sayi("tohum", a.tohum)),
    depo,
    saat,
    commitAraligiMs: sayi("commit-ms", a["commit-ms"]),
    goruntuAraligiMs: Math.round(sayi("goruntu-saat", a["goruntu-saat"]) * SAAT),
    goruntuIsci: !["0", "hayir", "false"].includes((a["goruntu-isci"] as string).toLowerCase()),
    odul: !["0", "hayir", "false"].includes((a["odul"] as string).toLowerCase()),
    botlar: botlarKur(veri, a.botlar as string),
    ...(dunyaEpochMs !== undefined ? { dunyaEpochMs } : {}),
    gocIzni: a.goc as boolean,
    ...(a["goc-eski-tablo"] !== undefined ? { gocEskiTablo: JSON.parse(readFileSync(resolve(a["goc-eski-tablo"]), "utf8")) as IcerikKimlikTablosu } : {}),
    yalnizEkleZorunlu: !(a["goc-esnek"] as boolean),
  });
  yazar.olumculHata((e) => {
    yaz("olumcul", { hata: e.message });
    process.exit(1);
  });
  // Yetisme ilerleme gunlugu: kapali gecen sure isletilirken ~1 sn'de bir (ve bitiste) satir.
  yazar.yetismeDinle((d) => yaz(d.yetisiyor ? "yetisme" : "yetisti", { ...d }));
  const [kapasite, saniyeBasina] = (a["hiz-siniri"] as string).split("/").map((x) => sayi("hiz-siniri", x));
  const sunucu = await sunucuBaslat({
    yazar,
    kimlik: new GelistirmeKimligi(sir),
    port: Math.trunc(sayi("port", a.port)),
    host: a.host as string,
    hizSiniri: { kapasite: kapasite ?? 20, saniyeBasina: saniyeBasina ?? 5 },
    ...(a["metrik-port"] !== undefined ? { metrik: { port: Math.trunc(sayi("metrik-port", a["metrik-port"])), host: a["metrik-host"] as string, ...(a["metrik-token"] !== undefined ? { token: a["metrik-token"] } : {}) } } : {}),
  });
  yazar.uyari((m) => yaz("uyari", { mesaj: m }));

  let kapaniyor = false;
  const kapat = (sinyal: string): void => {
    if (kapaniyor) return;
    kapaniyor = true;
    sunucu
      .kapat()
      .then(() => {
        yaz("kapandi", { sinyal, seq: yazar.seq, simZamani: yazar.sim.dunya.zaman });
        process.exit(0);
      })
      .catch((e: unknown) => {
        yaz("olumcul", { hata: e instanceof Error ? e.message : String(e) });
        process.exit(1);
      });
  };
  process.on("SIGINT", () => kapat("SIGINT"));
  process.on("SIGTERM", () => kapat("SIGTERM"));
  // `hazir` sinyal işleyicileri kurulduktan SONRA yazılır: hazir görüldükten hemen sonra gelen SIGTERM düzgün kapanışa gider.
  yaz("hazir", { port: sunucu.port, metrikPort: sunucu.metrikPort, pid: process.pid, kuralSurumu: yazar.kuralSurumu, kurtarma: yazar.kurtarma });
}

ana().catch((e: unknown) => {
  yaz("olumcul", { hata: e instanceof Error ? (e.stack ?? e.message) : String(e) });
  process.exit(1);
});
