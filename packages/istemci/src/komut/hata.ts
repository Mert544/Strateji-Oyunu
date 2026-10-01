/**
 * Çekirdeğin ASCII-Türkçe hata metinlerini oyuncunun diline çevirir. Tanınmayan metin, ham hâliyle
 * "Komut reddedildi" cümlesine gömülür (hiçbir hata sessizce yutulmaz). Saf modül.
 */
import { kararTeknolojisi, teknolojiAdi } from "./tablo";
import type { Icerik } from "./tablo";
import { bolgeAdiId } from "./tipler";
import type { OzetBaglami } from "./tipler";

const ETIKET: Record<string, string> = { liman: "Liman", dag: "Dağ", dar_gecit: "Dar geçit", kiyi: "Kıyı", ova: "Ova" };

const malAdi = (ic: Icerik, id: string): string => ic.mallar[ic.malIdx[id] ?? -1]?.ad ?? id;
const turAdi = (ic: Icerik, id: string): string => ic.turler[ic.turIdx[id] ?? -1]?.ad ?? id;
const birlikAdi = (ic: Icerik, id: string): string => ic.birlikler[ic.birlikIdx[id] ?? -1]?.ad ?? id;
const yontemAdi = (ic: Icerik, id: string): string => ic.yontemler[ic.yontemIdx[id] ?? -1]?.ad ?? id;
const gerek = (ic: Icerik, id: string | undefined): string => (id === undefined ? "" : ` (gereken teknoloji: ${teknolojiAdi(ic, id)})`);

type Kural = [RegExp, (m: RegExpMatchArray, o: OzetBaglami) => string];

const KURALLAR: Kural[] = [
  [/^izleme kipi/, () => "Yalnızca izliyorsunuz: komut vermek için bir devlet seçin."],
  [/^yetersiz hazine/, () => "Hazinede yeterli para yok."],
  [/^hazine yetersiz/, () => "Hazinede yeterli para yok."],
  [/^yetersiz stok: (\S+) \(mal indeksi (\d+)\)/, (m, o) => `${bolgeAdiId(o, m[1] as string)} deposunda yeterli ${o.ic.mallar[Number(m[2])]?.ad ?? "malzeme"} yok.`],
  [/^stok yetersiz: (\S+)/, (m, o) => `Bölge deposunda yeterli ${malAdi(o.ic, m[1] as string)} yok.`],
  [/^bolge oyuncunun degil: (\S+)/, (m, o) => `${bolgeAdiId(o, m[1] as string)} sizin bölgeniz değil.`],
  [/^saldiran bolge oyuncunun degil: (\S+)/, (m, o) => `${bolgeAdiId(o, m[1] as string)} sizin bölgeniz değil; saldırı kendi bölgenizden yapılır.`],
  [/^bilinmeyen bolge: (\S+)/, (m) => `Bilinmeyen bölge: ${m[1]}.`],
  [/^bilinmeyen tesis turu/, () => "Bilinmeyen tesis türü."],
  [/^bolge etiketi yetersiz: (\S+)/, (m) => `Bu bölgede gerekli özellik yok: ${ETIKET[m[1] as string] ?? m[1]} (tesis yalnızca uygun bölgede kurulur).`],
  [/^gerekli rezerv yok/, () => "Bölgede bu tesis için gereken ham madde rezervi yok ya da tükendi."],
  [/^tesis turu acik degil: (\S+)/, (m, o) => `${turAdi(o.ic, m[1] as string)} henüz açılmadı${gerek(o.ic, o.ic.turler[o.ic.turIdx[m[1] as string] ?? -1]?.gerekliTeknoloji)}.`],
  [/^yontem acik degil: (\S+)/, (m, o) => `${yontemAdi(o.ic, m[1] as string)} yöntemi henüz açılmadı${gerek(o.ic, o.ic.yontemler[o.ic.yontemIdx[m[1] as string] ?? -1]?.gerekliTeknoloji)}.`],
  [/^yontem bu tesis turunde yok: (\S+)/, (m, o) => `${yontemAdi(o.ic, m[1] as string)} yöntemi bu tesis türünde kullanılamaz.`],
  [/^bolgenin tarim tesisi tavani dolu: (\d+)/, (m) => `Bu bölgede en çok ${m[1]} tarım tesisi (çiftlik, ahır, mera) olabilir; tavan dolu.`],
  [/^bolgede boyle bir tesis yok/, () => "Bölgede böyle bir tesis yok (henüz bitmemiş ya da yıkılmış olabilir)."],
  [/^bolge liman degil/, () => "Ticaret emri yalnızca liman bölgelerinde verilebilir."],
  [/^depolanamaz mal ticarete konu olamaz/, () => "Bu mal depolanamadığı için ticarete konu olamaz."],
  [/^gecersiz oran: (-?\d+)/, () => "Geçersiz oran: sıfır (emri kaldırır) ya da pozitif bir değer girin."],
  [/^bilinmeyen mal: (\S+)/, (m) => `Bilinmeyen mal: ${m[1]}.`],
  [/^gecersiz vergi orani/, () => "Vergi oranı %0 ile %100 arasında olmalı."],
  [/^gecersiz askeri rezerv/, () => "Askeri rezerv %0 ile %50 arasında olmalı."],
  [/^ekim paylari toplami (\d+) olmali \(bulunan (-?\d+)\)/, (m) => `Ekim payları toplamı %${Math.round(Number(m[1]) / 10000)} olmalı (şu an %${Math.round(Number(m[2]) / 10000)}).`],
  [/^ekim plani (\d+) urun/, (m) => `Ekim planı ${m[1]} ürünün payını içermeli.`],
  [/^gecersiz ekim payi/, () => "Ekim payları %0 ile %100 arasında olmalı."],
  [/^gecersiz gubre dozu: \S+ \(0\.\.(\d+)\)/, (m) => `Gübre dozu 0 ile ${m[1]} arasında olmalı.`],
  [/^bolgenin tarim alani yok/, () => "Bu bölge tarım dışı; ekim planı ve gübre uygulanamaz."],
  [/^tarim katmani kapali/, () => "Bu dünyada tarım katmanı kapalı."],
  [/^sanayi katmani kapali/, () => "Bu dünyada sanayi katmanı kapalı."],
  [/^gecersiz bakim duzeyi/, () => "Bakım düzeyi asgari, normal ya da yüksek olmalı."],
  [/^tesis zaten ayni veya daha buyuk olcekte/, () => "Tesis zaten bu ölçekte ya da daha büyük."],
  [/^tesiste olcek yukseltmesi suruyor/, () => "Bu tesiste ölçek yükseltmesi zaten sürüyor."],
  [/^olcek icin teknoloji acik degil: (\S*)/, (m, o) => `Bu ölçek için gereken teknoloji araştırılmadı${m[1] ? `: ${teknolojiAdi(o.ic, m[1])}` : ""}.`],
  [/^bolgede onarim suruyor/, () => "Bu bölgede genel onarım zaten sürüyor."],
  [/^onarilacak asinma yok/, () => "Onarılacak aşınma yok; tesisler sağlam."],
  [/^sondaj yalniz ham mallarda yapilir/, () => "Arama sondajı yalnızca ham mallarda yapılır."],
  [/^tarim rezervinde sondaj yapilamaz/, () => "Tarım rezervinde sondaj yapılamaz."],
  [/^bolgede bu malda damar yok/, () => "Bölgede bu malın damarı yok."],
  [/^kesif hakki bitti/, () => "Bu bölgede bu mal için keşif hakkı bitti."],
  [/^bilinmeyen kenar/, () => "Böyle bir yol yok."],
  [/^kenar kullanilamaz/, () => "Bu yol kullanılamaz: iki ucu da sizin (ya da ortak altyapı anlaşmalı bir devletin) olmalı."],
  [/^deniz kenari gelistirme karari acik degil/, (_m, o) => {
    const t = kararTeknolojisi(o.ic, "deniz_kenar_gelistir");
    return `Deniz yollarını geliştirmek henüz açılmadı${t ? ` (önce "${t}" araştırın)` : ""}.`;
  }],
  [/^kenarda gelistirme suruyor/, () => "Bu yolda geliştirme zaten sürüyor."],
  [/^kenarin ucu oyuncunun degil/, () => "Yolun en az bir ucu sizin olmalı."],
  [/^gecersiz durus/, () => "Geçersiz savunma duruşu."],
  [/^hedef bolge sahipsiz/, () => "Hedef bölge sahipsiz; savaş ilan edilemez."],
  [/^hedef bolge kendi bolgeniz/, () => "Hedef bölge zaten sizin."],
  [/^bolgeler komsu degil/, () => "Bölgeler komşu değil; savaş yalnızca komşu bölgeye ilan edilir."],
  [/^savunan oyuncu yeni oyuncu korumasinda/, () => "Savunan devlet yeni oyuncu korumasında; koruma bitene kadar saldırılamaz."],
  [/^bu iki bolge arasinda bitmemis bir savas var/, () => "Bu iki bölge arasında zaten bitmemiş bir savaş var."],
  [/^hedef bolgede bitmemis bir savas var/, () => "Hedef bölgede zaten bitmemiş bir savaş var."],
  [/^saldiran bolge baska bir bitmemis savasta/, () => "Saldıran bölge zaten başka bir savaşta; bitmesini bekleyin."],
  [/^hedef bolge yakin zamanda yagmalandi \(yagma sonrasi (\d+) saat/, (m) => `Hedef bölge yakın zamanda yağmalandı; ${m[1]} saat boyunca yeniden savaş ilan edilemez.`],
  [/^saldiran bolgede birlik yok/, () => "Saldıran bölgede birlik yok; önce birlik üretin."],
  [/^birlik acik degil: (\S+)/, (m, o) => `${birlikAdi(o.ic, m[1] as string)} henüz açılmadı${gerek(o.ic, o.ic.birlikler[o.ic.birlikIdx[m[1] as string] ?? -1]?.gerekliTeknoloji)}.`],
  [/^bilinmeyen birlik/, () => "Bilinmeyen birlik türü."],
  [/^gecersiz adet: \S+ \(1\.\.(\d+)\)/, (m) => `Adet 1 ile ${m[1]} arasında olmalı.`],
  [/^kendinizle anlasma/, () => "Kendinizle anlaşma yapılamaz."],
  [/^kendinize yaptirim/, () => "Kendinize yaptırım uygulanamaz."],
  [/^boyle bir anlasma veya teklif yok/, () => "Böyle bir anlaşma ya da teklif yok."],
  [/^bilinmeyen oyuncu/, () => "Bilinmeyen devlet."],
  [/^gecersiz anlasma turu/, () => "Geçersiz anlaşma türü."],
  [/^teknoloji zaten acik/, () => "Bu teknoloji zaten açık."],
  [/^devam eden bir arastirma var/, () => "Zaten bir araştırma sürüyor; aynı anda tek araştırma yapılabilir."],
  [/^on kosul eksik: (\S+)/, (m, o) => `Ön koşul eksik: önce "${teknolojiAdi(o.ic, m[1] as string)}" araştırılmalı.`],
  [/^bilinmeyen teknoloji/, () => "Bilinmeyen teknoloji."],
  [/^bilinmeyen yontem/, () => "Bilinmeyen yöntem."],
  [/^gecersiz (aktif degeri|yon|olcek|oyuncu)/, () => "Geçersiz değer girildi; formu yeniden doldurun."],
  [/bilmiyor: |komutu degil|^bilinmeyen komut/, () => "Bu komut bu sürümde desteklenmiyor."],
  [/^birlik maliyetinde bilinmeyen mal/, () => "Birlik maliyetinde tanımsız bir mal var; içerik hatası."],
  [/^komut gecmiste/, () => "Komut geçmiş bir ana denk geldi; yeniden deneyin."],
  [/^komut zamani cok ileride/, () => "Komut zamanı geçersiz."],
];

/** Çekirdek hata metnini Türkçeye çevirir; tanınmayan metin ham hâliyle gösterilir. */
export function hataCevir(hata: string, o: OzetBaglami): string {
  for (const [re, f] of KURALLAR) {
    const m = hata.match(re);
    if (m) return f(m, o);
  }
  return `Komut reddedildi (${hata}).`;
}
