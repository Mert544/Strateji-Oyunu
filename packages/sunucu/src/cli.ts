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
import { dosyaDeposu, dosyaSaltOkunur } from "./depo/dosya";
import { postgresDeposu } from "./depo/postgres";
import type { Depo } from "./depo/tipler";
import { DavetliListesi } from "./giris/davet";
import { geciciAlanlariYukle } from "./giris/eposta";
import { GirisHizmeti } from "./giris/hizmet";
import { GirisUclari } from "./giris/http";
import { kimlikKipiCoz } from "./giris/kip";
import { DosyaPostaGondericisi, KonsolPostaGondericisi } from "./giris/posta";
import { GelistirmeKimligi, gelistirmeTokeni } from "./kimlik";
import type { KimlikDogrulayici } from "./kimlik";
import { depoyuDok } from "./dok";
import { OturumKaydedici, VARSAYILAN_OTURUM_BOSLUGU_MS } from "./oturum-kaydi";
import { parselDosyasiYukle } from "./parsel-dosya";
import { DuvarSaati, ElleSaat } from "./saat";
import { sunucuBaslat } from "./sunucu";
import { dosyaTestDunyasiSay, dosyaTestDunyasiSil, onekDenetle, pgTestDunyasiSay, pgTestDunyasiSil, silmeyiDenetle, TEST_DUNYA_ONEKI, VARSAYILAN_DOSYA_DIZINI } from "./test-dunya";
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
  --uretim             uretim kipi ($BOLGE_URETIM=1): gelistirme kimligi KAPALI (kimlik = eposta zorunlu), --token kapali, --elle-saat yasak,
                       BOLGE_BILET_SIRRI (>= 32 karakter, ornek deger degil), BOLGE_IZINLI_KOKENLER ve https BOLGE_GENEL_URL zorunlu, konsol postacisi yasak
  --kimlik KIP         gelistirme | eposta (vars. gelistirme; --uretim'de eposta). eposta: e-posta baglantisiyla giris (packages/sunucu/KIMLIK.md):
                       POST /giris/istek, GET|POST /giris/onay, POST /giris/bilet, GET /giris/ben, POST /giris/cikis, POST /giris/cikis-tumu
  --posta TUR          eposta kipinde posta bagdastiricisi: dosya | konsol (vars. dosya; konsol --uretim'de yasak). Gercek SMTP/SES takilabilir arayuzdur
  --posta-dizin YOL    dosya postacisinin dizini (vars. raporlar/posta; git disi)
  --genel-url URL      sunucunun disaridan gorunen adresi (postadaki baglanti taban: <URL>/giris/onay); vars. http://127.0.0.1:<port>
  --giris-baglanti URL postadaki baglantinin tabani (ornegin istemci sayfasi; sonuna ?j=<jeton> eklenir); vars. <genel-url>/giris/onay
  --giris-sonrasi URL  onay sayfasi (form) basarili olunca yonlendirilecek adres (vars. kisa bir sayfa)
  --izinli-kokenler L  virgullu Origin izin listesi (POST uclari ve ws): ornek https://oyun.ornek.org; genel-url koku kendiliginden eklenir
  --tarayici-bagli 0|1 baglanti, istegi yapan tarayiciya bagli olsun (vars. 0)
  --guvenilir-proxy    istemci IP'si X-Forwarded-For'un son ogesidir (ters vekil arkasinda; vars. kapali)
  --gecici-alanlar YOL gecici e-posta alani listesi (JSON { "alanlar": [...] }; vars. packages/sunucu/veri/gecici-eposta-alanlari.json)
  --davetli-liste YOL  kayit kapisi (Alfa-0; vars. KAPALI): satir basina bir e-posta adresi (# aciklama), G5 normallestirmesiyle eslesir. Listede olmayan adrese yanit
                       AYNIDIR ama posta gitmez. Liste kisisel veridir: sunucuda tutulur, depoya girmez (ornek raporlar/davetli.txt). Yok/bozuksa acilis durur;
                       calisirken SIGHUP listeyi yeniden okur (bozuksa eski liste korunur). Yalniz --kimlik eposta ile
  --gelistirme-sirri S gelistirme token imza sirri (vars. $BOLGE_GELISTIRME_SIRRI; yalniz kimlik = gelistirme)
  --oturum-kaydi 0|1   oyun baglantisi oturum olayi kaydi (insan testi; vars. 0): oyuncunun ilk baglantisi acilinca oturum baslar, son baglantisi kapaninca
                       biter; yalniz zaman ve opak oyuncu kimligi (IP/cihaz/e-posta yok). 90 gunden eski ayrinti gun duzeyinde toplu sayiya cevrilir. Giris oturumu degildir
  --oturum-bosluk-dk N kopup yeniden baglanmanin ayni oturum sayildigi bosluk, dakika (vars. 5)
  --test-dunya-sil AD  TEST dunyasini (gunluk, goruntu, yedek, profil, oturum kaydi ve yalniz o dunyanin oyuncularinin hesap/auth satirlari) tek komutla siler ve cikar.
                       Ad "test" (ya da --test-dunya-oneki) ile baslamali; baska dunyada da kullanilan hesap korunur; dunyanin yazari aciksa reddedilir.
                       pg: --depo pg --pg-url; dosya: --depo dosya --dizin (dizin adi da test onekiyle baslamali). Sonuc {"olay":"testDunyaSilindi",...} satiri
  --test-dunya-say AD  ayni tablolarda KALAN satirlari sayar (silmeden sonra toplam 0); --oyuncular a,b: silme raporundaki oyuncu listesi (hesap/oturum sayimi icin)
  --test-dunya-oneki P test dunyasi adi oneki (vars. test; $BOLGE_TEST_DUNYA_ONEKI); en az 3 karakter
  --test-hesap-oneki P hesap kimligi bu onekle baslayan test hesaplari da silinir/sayilir (ornek: otomatik testlerin pgh...); en az 3 karakter
  --evet-sil AD        --uretim ile --test-dunya-sil icin onay: dunya adinin ikinci kez yazilmasi ($BOLGE_TEST_DUNYA_SIL_ONAY=AD). "ana", bu sunucunun --dunya/BOLGE_DUNYA degeri
                       ve varsayilan dosya dizini (raporlar/dunya) hicbir onekle silinemez
  --dok DIZIN          depoyu (--depo pg | dosya; kaynak SALT OKUNUR, kilit alinmaz) gunluk + son goruntu olarak dosya deposu bicimine BOS bir dizine doker ve cikar
                       (cevrimdisi oynatma: pg paketi gerekmez). Kaynak dosya deposu icin --dizin, pg icin --pg-url ve --dunya
  --token OYUNCU       bu oyuncu icin gelistirme token'i yaz ve cik ("sistem" = yonetici); --uretim'de kapali

Ortam degiskenleri: her secenek BOLGE_<AD> ile de verilir (bayrak ortamdan ustundur): BOLGE_PORT, BOLGE_HOST, BOLGE_HARITA,
BOLGE_PARSEL (1), BOLGE_PARSEL_DOSYA, BOLGE_TOHUM, BOLGE_DEPO, BOLGE_DIZIN, BOLGE_PG_URL, BOLGE_DUNYA, BOLGE_HIZ, BOLGE_ELLE_SAAT (1),
BOLGE_BIRIKIMLI (1), BOLGE_DUNYA_EPOCH, BOLGE_GOC (1), BOLGE_GOC_ESNEK (1), BOLGE_GOC_ESKI_TABLO, BOLGE_COMMIT_MS, BOLGE_GORUNTU_SAAT, BOLGE_GORUNTU_ISCI (0|1), BOLGE_ODUL (0|1),
BOLGE_HIZ_SINIRI, BOLGE_BOTLAR, BOLGE_METRIK_PORT, BOLGE_METRIK_HOST, BOLGE_METRIK_TOKEN, BOLGE_URETIM (1), BOLGE_GELISTIRME_SIRRI,
BOLGE_KIMLIK, BOLGE_POSTA, BOLGE_POSTA_DIZIN, BOLGE_GENEL_URL, BOLGE_GIRIS_BAGLANTISI, BOLGE_GIRIS_SONRASI, BOLGE_IZINLI_KOKENLER, BOLGE_TARAYICI_BAGLI (0|1),
BOLGE_GUVENILIR_PROXY (1), BOLGE_GECICI_ALANLAR, BOLGE_DAVETLI_LISTE, BOLGE_OTURUM_KAYDI (0|1), BOLGE_OTURUM_BOSLUK_DK, BOLGE_TEST_DUNYA_ONEKI, BOLGE_TEST_DUNYA_SIL_ONAY. Sirlar YALNIZ ortamdan verilir (surec listesinde gorunmesin): BOLGE_BILET_SIRRI ve rotasyon icin BOLGE_BILET_SIRRI_ESKI.`;

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
      kimlik: { type: "string", ...varsayilan(ev("KIMLIK")) },
      posta: { type: "string", ...varsayilan(ev("POSTA")) },
      "posta-dizin": { type: "string", default: ev("POSTA_DIZIN", "raporlar/posta") as string },
      "genel-url": { type: "string", ...varsayilan(ev("GENEL_URL")) },
      "giris-baglanti": { type: "string", ...varsayilan(ev("GIRIS_BAGLANTISI")) },
      "giris-sonrasi": { type: "string", ...varsayilan(ev("GIRIS_SONRASI")) },
      "izinli-kokenler": { type: "string", ...varsayilan(ev("IZINLI_KOKENLER")) },
      "tarayici-bagli": { type: "string", default: ev("TARAYICI_BAGLI", "0") as string },
      "guvenilir-proxy": { type: "boolean", default: evBool("GUVENILIR_PROXY") },
      "gecici-alanlar": { type: "string", ...varsayilan(ev("GECICI_ALANLAR")) },
      "davetli-liste": { type: "string", ...varsayilan(ev("DAVETLI_LISTE")) },
      "oturum-kaydi": { type: "string", default: ev("OTURUM_KAYDI", "0") as string },
      "oturum-bosluk-dk": { type: "string", default: ev("OTURUM_BOSLUK_DK", String(VARSAYILAN_OTURUM_BOSLUGU_MS / 60_000)) as string },
      "test-dunya-sil": { type: "string" },
      "test-dunya-say": { type: "string" },
      "test-dunya-oneki": { type: "string", default: ev("TEST_DUNYA_ONEKI", TEST_DUNYA_ONEKI) as string },
      "test-hesap-oneki": { type: "string" },
      "evet-sil": { type: "string" },
      oyuncular: { type: "string" },
      dok: { type: "string" },
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
  // Kimlik kipi ve üretim denetimleri (saf işlev: giris/kip.ts). Üretimde `gelistirme` kimliği ve `--token` reddedilir.
  const izinliListe = (a["izinli-kokenler"] ?? "").split(",").map((k) => k.trim()).filter((k) => k !== "");
  const kimlikKipi = kimlikKipiCoz({
    uretim: a.uretim,
    ...(a.kimlik !== undefined ? { kimlik: a.kimlik } : {}),
    ...(ev("BILET_SIRRI") !== undefined ? { biletSirri: ev("BILET_SIRRI") as string } : {}),
    ...(ev("BILET_SIRRI_ESKI") !== undefined ? { biletSirriEski: ev("BILET_SIRRI_ESKI") as string } : {}),
    ...(a.posta !== undefined ? { posta: a.posta } : {}),
    izinliKokenler: izinliListe,
    ...(a["genel-url"] !== undefined ? { genelUrl: a["genel-url"] } : {}),
    tokenKomutu: a.token !== undefined,
    gelistirmeSirriVerildi: a["gelistirme-sirri"] !== undefined || process.env.BOLGE_GELISTIRME_SIRRI !== undefined,
  });
  const sir = a["gelistirme-sirri"] ?? process.env.BOLGE_GELISTIRME_SIRRI ?? "gelistirme-sirri-degistir";
  if (a.token !== undefined) {
    process.stdout.write(gelistirmeTokeni(sir, a.token) + "\n");
    return;
  }
  if (a.uretim) {
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
      yaz("yedektenDon", { dunya: a.dunya, etiket: a["yedekten-don"], seq: g.seq, simZamani: g.simZamani, kuralSurumu: g.kuralSurumu, durumOzeti: g.durumOzeti, temizlenenGoruntu: g.temizlenenGoruntu, gocSonrasiKomut: g.gocSonrasiKomut });
      if (g.gocSonrasiKomut) yaz("uyari", { mesaj: "gocten sonra komut kabul edilmis (gunluk yedegin seq'inden ilerlemis): yeni kural goruntulerine dokunulmadi; eski icerikle acilis reddedilebilir (geri donus yalniz hic komut kabul edilmediyse gecerlidir)" });
    } finally {
      await d.gunluk.kapat();
    }
    return;
  }
  if (a["test-dunya-sil"] !== undefined || a["test-dunya-say"] !== undefined) {
    // Test dunyasi silme/sayim (insan testi I3): dunya acilmaz. Yalniz test oneki tasiyan dunya; paylasilan dunya reddedilir.
    if (a["test-dunya-sil"] !== undefined && a["test-dunya-say"] !== undefined) throw new Error("--test-dunya-sil ve --test-dunya-say birlikte verilemez");
    const silme = a["test-dunya-sil"] !== undefined;
    const dunya = (silme ? a["test-dunya-sil"] : a["test-dunya-say"]) as string;
    const onek = a["test-dunya-oneki"] as string;
    const hesapOneki = a["test-hesap-oneki"];
    // Geri donusu olmayan komut: oneki bos/kisa olamaz; ana, bu sunucunun canli dunyasi ve varsayilan dizin silinemez; --uretim'de adin ikinci kez yazilmasi sart.
    if (silme) {
      silmeyiDenetle({
        dunya,
        onek,
        hesapOneki,
        canliDunya: a.dunya as string,
        ...(a.depo === "dosya" ? { dizin: resolve(a.dizin as string), varsayilanDizin: resolve(VARSAYILAN_DOSYA_DIZINI) } : {}),
        uretim: a.uretim,
        onay: a["evet-sil"] ?? process.env.BOLGE_TEST_DUNYA_SIL_ONAY,
      });
    } else {
      onekDenetle(onek, "dunya oneki");
      if (hesapOneki !== undefined) onekDenetle(hesapOneki, "hesap oneki");
    }
    if (a.depo === "pg") {
      const pgUrl = a["pg-url"] ?? process.env.BOLGE_PG_URL;
      if (!pgUrl) throw new Error("--test-dunya-* icin --pg-url veya BOLGE_PG_URL gerekli");
      if (silme) yaz("testDunyaSilindi", { ...(await pgTestDunyasiSil(pgUrl, { dunya, onek, ...(hesapOneki !== undefined ? { hesapOneki } : {}) })) });
      else {
        const oy = (a.oyuncular ?? "").split(",").map((x) => x.trim()).filter((x) => x !== "");
        yaz("testDunyaSayimi", { ...(await pgTestDunyasiSay(pgUrl, { dunya, oyuncular: oy, ...(hesapOneki !== undefined ? { hesapOneki } : {}) })) });
      }
    } else if (a.depo === "dosya") {
      const dizin = resolve(a.dizin as string);
      if (silme) yaz("testDunyaSilindi", { ...(await dosyaTestDunyasiSil(dizin, { dunya, onek })) });
      else yaz("testDunyaSayimi", { ...(await dosyaTestDunyasiSay(dizin, dunya)) });
    } else throw new Error("--test-dunya-* yalniz --depo pg ya da dosya ile");
    return;
  }
  if (a.dok !== undefined) {
    // Depo dokumu (insan testi I1): kaynak salt okunur (kilitsiz), hedef bos dizin, dosya deposu bicimi.
    let kaynak: Parameters<typeof depoyuDok>[0];
    let kapat: () => Promise<void> = async () => undefined;
    if (a.depo === "pg") {
      const pgUrl = a["pg-url"] ?? process.env.BOLGE_PG_URL;
      if (!pgUrl) throw new Error("--dok icin --pg-url veya BOLGE_PG_URL gerekli");
      const d = await postgresDeposu({ baglanti: pgUrl, dunya: a.dunya as string, semaKur: false, kilitsiz: true });
      kaynak = d;
      kapat = () => d.gunluk.kapat();
    } else if (a.depo === "dosya") kaynak = await dosyaSaltOkunur(resolve(a.dizin as string));
    else throw new Error("--dok yalniz --depo pg ya da dosya ile");
    try {
      const sonuc = await depoyuDok(kaynak, resolve(a.dok));
      yaz("dokuldu", { dunya: a.dunya, hedef: resolve(a.dok), ...sonuc });
    } finally {
      await kapat();
    }
    return;
  }
  // Kayit kapisi (davetli listesi): dunya acilmadan once yuklenir; dosya yok/bozuksa acilis durur (kapi sessizce acik kalmaz).
  let davetli: DavetliListesi | undefined;
  if (a["davetli-liste"] !== undefined) {
    if (kimlikKipi.kip !== "eposta") throw new Error("--davetli-liste yalniz --kimlik eposta ile (gelistirme kimliginde kayit kapisi yoktur)");
    davetli = DavetliListesi.dosyadan(resolve(a["davetli-liste"]));
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
  // Kimlik: geliştirmede `GelistirmeKimligi` (üretimde HİÇ kurulmaz); eposta kipinde ws bileti (`AuthKimligi`) + `/giris/` uçları.
  const port = Math.trunc(sayi("port", a.port));
  let calisanPort = port;
  let kimlik: KimlikDogrulayici;
  let giris: GirisUclari | undefined;
  if (kimlikKipi.kip === "gelistirme") kimlik = new GelistirmeKimligi(sir);
  else {
    if (!depo.hesap) throw new Error("secilen depo hesap deposu sunmuyor (e-posta girisi icin bellek, dosya ya da pg)");
    const genelUrl = a["genel-url"]?.replace(/\/+$/, "");
    const yerelUrl = (): string => `http://127.0.0.1:${calisanPort}`;
    const gecici = geciciAlanlariYukle(a["gecici-alanlar"] !== undefined ? resolve(a["gecici-alanlar"]) : undefined);
    const hizmet = new GirisHizmeti({
      depo: depo.hesap,
      posta: kimlikKipi.posta === "konsol" ? new KonsolPostaGondericisi() : new DosyaPostaGondericisi(resolve(a["posta-dizin"] as string)),
      sirlar: kimlikKipi.sirlar,
      baglantiTabani: () => a["giris-baglanti"] ?? `${genelUrl ?? yerelUrl()}/giris/onay`,
      geciciAlanlar: gecici,
      ...(davetli ? { davetliler: davetli } : {}),
      tarayiciBagli: ["1", "evet", "true"].includes((a["tarayici-bagli"] as string).toLowerCase()),
      // Günlük: yalnız olay adı ve maskelenmiş/anonim alanlar (belirteç, tam adres, IP yok).
      gunluk: (olay, veri) => yaz(olay, veri ?? {}),
    });
    giris = new GirisUclari({
      hizmet,
      izinliKokenler: [...izinliListe, ...(genelUrl !== undefined ? [new URL(genelUrl).origin] : [])],
      cerezGuvenli: a.uretim,
      guvenilirProxy: a["guvenilir-proxy"] as boolean,
      ...(a["giris-sonrasi"] !== undefined ? { girisSonrasiAdres: a["giris-sonrasi"] } : {}),
    });
    kimlik = hizmet.kimlik;
  }
  let oturumKaydi: OturumKaydedici | undefined;
  if (["1", "evet", "true"].includes((a["oturum-kaydi"] as string).toLowerCase())) {
    if (!depo.oyunOturumu) throw new Error("secilen depo oyun oturumu kaydi sunmuyor (--oturum-kaydi: bellek, dosya ya da pg)");
    oturumKaydi = new OturumKaydedici({
      depo: depo.oyunOturumu,
      boslukMs: Math.round(sayi("oturum-bosluk-dk", a["oturum-bosluk-dk"] as string) * 60_000),
      hata: (m) => yaz("uyari", { mesaj: m }),
    });
  }
  const sunucu = await sunucuBaslat({
    yazar,
    kimlik,
    ...(oturumKaydi ? { oturumKaydi } : {}),
    ...(giris ? { giris } : {}),
    port,
    host: a.host as string,
    hizSiniri: { kapasite: kapasite ?? 20, saniyeBasina: saniyeBasina ?? 5 },
    ...(a["metrik-port"] !== undefined ? { metrik: { port: Math.trunc(sayi("metrik-port", a["metrik-port"])), host: a["metrik-host"] as string, ...(a["metrik-token"] !== undefined ? { token: a["metrik-token"] } : {}) } } : {}),
  });
  yazar.uyari((m) => yaz("uyari", { mesaj: m }));
  for (const m of kimlikKipi.uyarilar) yaz("uyari", { mesaj: m });
  calisanPort = sunucu.port;
  // Genel adres verilmediyse (geliştirme) sunucunun kendi adresi de izinli köken olur (onay sayfasının formu buradan POST eder).
  if (giris && a["genel-url"] === undefined) {
    giris.kokenEkle(`http://127.0.0.1:${sunucu.port}`);
    giris.kokenEkle(`http://localhost:${sunucu.port}`);
  }

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
  if (davetli && process.platform !== "win32") {
    // SIGHUP: davetli listesini yeniden oku (sunucuyu yeniden baslatmadan davet eklemek/cikarmak). Bozuk dosyada eski liste korunur; adres yazilmaz.
    process.on("SIGHUP", () => {
      try {
        yaz("davetliListeYenilendi", { adet: (davetli as DavetliListesi).yenile() });
      } catch (e) {
        yaz("uyari", { mesaj: `davetli listesi yenilenemedi, eski liste korunuyor: ${e instanceof Error ? e.message : String(e)}` });
      }
    });
  }
  process.on("SIGINT", () => kapat("SIGINT"));
  process.on("SIGTERM", () => kapat("SIGTERM"));
  // Windows'ta SIGTERM yakalanamaz (süreç zorla biter): IPC kanalıyla başlatılan süreç aynı düzgün kapanışı "kapat" mesajıyla alır.
  process.on("message", (m) => {
    if (m === "kapat") kapat("ipc");
  });
  // `hazir` sinyal işleyicileri kurulduktan SONRA yazılır: hazir görüldükten hemen sonra gelen SIGTERM düzgün kapanışa gider.
  yaz("hazir", { port: sunucu.port, metrikPort: sunucu.metrikPort, kimlik: kimlikKipi.kip, davetli: davetli ? davetli.boyut : null, pid: process.pid, kuralSurumu: yazar.kuralSurumu, kurtarma: yazar.kurtarma });
}

ana().catch((e: unknown) => {
  yaz("olumcul", { hata: e instanceof Error ? (e.stack ?? e.message) : String(e) });
  process.exit(1);
});
