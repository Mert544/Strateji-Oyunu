/**
 * Mülk komutlarının (çekirdek `mulk/komut.ts`) ASCII-Türkçe hata metinlerini oyuncunun diline çevirir (saf).
 * Tanınmayan metin ham hâliyle cümleye gömülür: hiçbir hata sessizce yutulmaz. Bölge kipi çevirisi `komut/hata.ts`'dedir.
 */
import { fmt } from "../arayuz/bicim";
import { ETIKET_ADI } from "./yapi";

const ENGEL: Record<string, string> = { su: "su", yol: "yol tamponu", askeri: "askerî alan", koruma: "korunan alan" };

type Kural = [RegExp, (m: RegExpMatchArray, ad: (id: string) => string) => string];

const KURALLAR: Kural[] = [
  [/^mulk kipi kapali/, () => "Bu dünya mülk kipinde değil."],
  [/^bilinmeyen ilce/, () => "Bu ilçe sunucunun dünyasında yok."],
  [/^gecersiz arsa sinifi/, () => "Geçersiz arsa sınıfı."],
  [/^hucre listesi bos/, () => "Hücre seçilmedi."],
  [/^en cok (\d+) hucre verilebilir/, (m) => `Tek seferde en çok ${m[1]} hücre alınabilir.`],
  [/^gecersiz hucre kimligi/, () => "Geçersiz hücre kimliği."],
  [/^tekrarlanan hucre/, () => "Aynı hücre iki kez seçilmiş."],
  [/^hucre bu ilcede degil/, () => "Hücre bu ilçede değil."],
  [/^hucre satin alinamaz \((\w+)\)/, (m) => `Bu hücre satın alınamaz (${ENGEL[m[1] as string] ?? m[1]}).`],
  [/^hucre sinifi uyusmuyor/, () => "Hücrenin arsa sınıfı komutla uyuşmuyor."],
  [/^hucre zaten sahipli: \S+ \((.+)\)/, (m, ad) => `Bir hücre az önce ${ad(m[1] as string)} tarafından alındı.`],
  [/^ilcede en cok (\d+) hucre \(mevcut (\d+)\)/, (m) => `İlçede en çok ${m[1]} hücren olabilir (şu an ${m[2]}).`],
  [/^ilcenin en cok %(\d+)'i \((\d+) hucre; mevcut (\d+)\)/, (m) => `İlçenin en çok %${m[1]}'i senin olabilir (${m[2]} hücre; şu an ${m[3]}).`],
  [/^ilcede yeterli bos uygun hucre yok/, () => "İlçede yeterli boş hücre kalmadı."],
  [/^yetersiz hazine \(gereken (\d+)\)/, (m) => `Hazinede yeterli para yok (gereken ${fmt(Math.ceil(Number(m[1]) / 1000))} ₺).`],
  [/^yetersiz hazine/, () => "Hazinede yeterli para yok."],
  [/^yetersiz stok: (\S+)/, () => "İşletme deposunda yeterli malzeme yok (çelik ya da makine parçası)."],
  [/^bilinmeyen tesis turu/, () => "Bilinmeyen yapı türü."],
  [/^tesis turu mulk kipinde insa edilemez/, () => "Bu yapı henüz arsa üzerine kurulamıyor."],
  [/^(\S+) (\d+) hucre kaplar \(verilen (\d+)\)/, (m) => `Bu yapı ${m[2]} hücre kaplar (seçilen ${m[3]}).`],
  [/^hucre oyuncunun degil/, () => "Hücre senin değil."],
  [/^hucre bos degil \(yapi ya da insaat var\)/, () => "Hücrede yapı ya da inşaat var: önce o kalkmalı, sonra bırakılabilir."],
  [/^hucre bos degil/, () => "Hücrede zaten yapı ya da inşaat var."],
  [/^hucre yeni oyunculara ayrilmis \(katilimin ilk (\d+) gunu\)/, (m) => `Bu hücre yeni oyunculara ayrılmış (katılımlarının ilk ${m[1]} günü); sonra alınabilir.`],
  [/^yapi hucreleri kenar-bitisik olmali/, () => "Yapı hücreleri kenar kenara bitişik olmalı."],
  [/^ilde en cok (\d+) (.+) \(biten \+ suren\)/, (m) => `Bu ilde en çok ${m[1]} ${m[2]} olabilir (biten + süren).`],
  [/^ilde isletme yok/, () => "Bu ilde henüz işletmen yok (önce arsa almalısın)."],
  [/^tesis turu acik degil: (\S+)/, () => "Bu yapı henüz açılmadı: önce ilgili teknolojiyi araştırmalısın."],
  [/^il etiketi yetersiz: (\S+)/, (m) => `Bu ilde bu yapı kurulamaz: il "${ETIKET_ADI[m[1] as string] ?? m[1]}" özelliği taşımıyor.`],
  [/^gerekli rezerv yok/, () => "Bu ilde bu yapı için gereken ham madde rezervi yok ya da tükendi."],
  [/^ayni anda en cok (\d+) insaat/, (m) => `Aynı anda en çok ${m[1]} inşaat sürebilir; birinin bitmesini bekle.`],
  [/^bilinmeyen oyuncu/, () => "Bu hesap dünyaya henüz katılmamış (yönetici katılımı yapmalı)."],
  [/^oyuncunun suren hucreli insaati yok/, () => "Bu inşaat artık yok."],
];

/** Çekirdek hata metni -> Türkçe cümle. `ad`: sahip kimliğinden görünen ad. */
export function mulkHatasiTurkce(ham: string, ad: (id: string) => string = (x) => x): string {
  for (const [re, f] of KURALLAR) {
    const m = re.exec(ham);
    if (m) return f(m, ad);
  }
  return `Sunucu isteği reddetti: ${ham}`;
}

/** Hücre kimliği ("x:y") ham metinde geçiyorsa çıkarır (hata hücresini işaretlemek için). */
export function hataHucresi(ham: string): string | undefined {
  return /(\d+:\d+)/.exec(ham)?.[1];
}
