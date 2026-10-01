/**
 * Sunucu komut satırı: `pnpm sunucu -- [seçenekler]` (kök package.json) ya da `tsx packages/sunucu/src/cli.ts`.
 * Olayları stdout'a satır başına bir JSON olarak yazar (`{"olay":"hazir",...}`); SIGINT/SIGTERM'de düzgün kapanır
 * (kuyruk yazılır, kapanış görüntüsü alınır). Seçenekler için `--yardim`.
 */
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { gercekVeriyiYukle, miniVeriyiYukle, parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { ARKETIPLER, botOlustur } from "@bolge/botlar";
import type { ArketipAdi } from "@bolge/botlar";
import { SAAT } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
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
  --goc-esnek          (yalniz gelistirme) gocte araya ekleme/siralama degisimine de izin
  --birikimli          kapaliyken duran eski saat (hiz 1 ile bile); mutlak saat degil
  --dunya-epoch T      yalniz yeni dunyada: duvar saati epoch'u (ISO, ornek 2026-09-30T21:00:00Z, ya da epoch ms);
                       bir Turkiye gece yarisi (UTC+3) olmali (vars. 2026-09-30T21:00:00Z = 1 Ekim 2026 00:00 TRT)
  --elle-saat          saat yalniz yoneticinin zamanIlerlet mesajiyla ilerler (test/gelistirme)
  --commit-ms N        grup commit araligi (vars. 75)
  --goruntu-saat N     anlik goruntu araligi, sim-saat (vars. 6)
  --hiz-siniri K/S     oyuncu basina token-kova: kapasite/saniyede jeton (vars. 20/5)
  --botlar A,B         sunucu botlari (arketip; i. bot haritadaki i. devletin bolgeleriyle katilir)
  --gelistirme-sirri S gelistirme token imza sirri (vars. $BOLGE_GELISTIRME_SIRRI)
  --token OYUNCU       bu oyuncu icin gelistirme token'i yaz ve cik ("sistem" = yonetici)`;

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

async function ana(): Promise<void> {
  // `pnpm sunucu -- --port 0` biçiminde gelen baştaki "--" atılır.
  const argv = process.argv.slice(2);
  if (argv[0] === "--") argv.shift();
  const { values: a } = parseArgs({
    args: argv,
    options: {
      port: { type: "string", default: "8787" },
      host: { type: "string", default: "127.0.0.1" },
      harita: { type: "string", default: "sentetik" },
      parsel: { type: "boolean", default: false },
      "parsel-dosya": { type: "string" },
      tohum: { type: "string", default: "1" },
      depo: { type: "string", default: "dosya" },
      dizin: { type: "string", default: "raporlar/dunya" },
      "pg-url": { type: "string" },
      dunya: { type: "string", default: "ana" },
      hiz: { type: "string", default: "1" },
      "elle-saat": { type: "boolean", default: false },
      birikimli: { type: "boolean", default: false },
      goc: { type: "boolean", default: false },
      "goc-esnek": { type: "boolean", default: false },
      "dunya-epoch": { type: "string" },
      "commit-ms": { type: "string", default: "75" },
      "goruntu-saat": { type: "string", default: "6" },
      botlar: { type: "string", default: "" },
      "hiz-siniri": { type: "string", default: "20/5" },
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
    botlar: botlarKur(veri, a.botlar as string),
    ...(dunyaEpochMs !== undefined ? { dunyaEpochMs } : {}),
    gocIzni: a.goc as boolean,
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
  });
  yazar.uyari((m) => yaz("uyari", { mesaj: m }));
  yaz("hazir", { port: sunucu.port, pid: process.pid, kuralSurumu: yazar.kuralSurumu, kurtarma: yazar.kurtarma });

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
}

ana().catch((e: unknown) => {
  yaz("olumcul", { hata: e instanceof Error ? (e.stack ?? e.message) : String(e) });
  process.exit(1);
});
