/**
 * Mülk komutlarının (çekirdek `mulk/komut.ts`) ASCII-Türkçe hata metinlerini oyuncunun diline çevirir (saf).
 * Tanınmayan metin ham hâliyle cümleye gömülür: hiçbir hata sessizce yutulmaz. Bölge kipi çevirisi `komut/hata.ts`'dedir.
 */
import { paraMili } from "../arayuz/bicim";
import { KAMU_TUR_ADI } from "./kamu";
import type { KamuTuru } from "./kamu";
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
  [/^hucre kamu arsasi \(satilmaz\): \S+ \((\w+)/, (m) => `Bu hücre kamu arsası (${KAMU_TUR_ADI[m[1] as KamuTuru] ?? m[1]}): satılmaz.`],
  [/^\S+ kamu yapisidir/, () => "Bu yapı kamu yapısıdır: oyunculara kapalı."],
  [/^hucre sinifi uyusmuyor/, () => "Hücrenin arsa sınıfı komutla uyuşmuyor."],
  [/^hucre zaten sahipli: \S+ \((.+)\)/, (m, ad) => `Bir hücre az önce ${ad(m[1] as string)} tarafından alındı.`],
  [/^ilcede en cok (\d+) hucre \(mevcut (\d+)\)/, (m) => `İlçede en çok ${m[1]} hücren olabilir (şu an ${m[2]}).`],
  [/^ilcenin en cok %(\d+)'i \((\d+) hucre; mevcut (\d+)\)/, (m) => `İlçenin en çok %${m[1]}'i senin olabilir (${m[2]} hücre; şu an ${m[3]}).`],
  [/^ilcede yeterli bos uygun hucre yok/, () => "İlçede yeterli boş hücre kalmadı."],
  [/^yetersiz hazine \(gereken (\d+)\)/, (m) => `Hazinede yeterli para yok (gereken ${paraMili(Number(m[1]), "yukari")}).`],
  [/^yetersiz hazine/, () => "Hazinede yeterli para yok."],
  [/^yetersiz stok: (\S+)/, () => "İşletme deposunda yeterli malzeme yok (çelik ya da makine parçası)."],
  [/^bilinmeyen tesis turu/, () => "Bilinmeyen yapı türü."],
  [/^tesis turu mulk kipinde insa edilemez/, () => "Bu yapı henüz arsa üzerine kurulamıyor."],
  [/^(\S+) (\d+) hucre kaplar \(verilen (\d+)\)/, (m) => `Bu yapı ${m[2]} hücre kaplar (seçilen ${m[3]}).`],
  [/^hucre oyuncunun degil/, () => "Hücre senin değil."],
  [/^hucre bos degil \(yapi ya da insaat var\)/, () => "Hücrede yapı ya da inşaat var: önce o kalkmalı, sonra bırakılabilir."],
  [/^hucre bos degil/, () => "Hücrede zaten yapı ya da inşaat var."],
  [/^ayrilmis hucre yalniz katilim ilcesinde satilir/, () => "Ayrılmış hücre yalnız katılım ilçende satılır; bu ilçede normal hücre alabilirsin."],
  [/^ilcede gunluk ayrilmis satis tavani asildi: \S+ \(tavan (\d+)/, (m) => `İlçenin bugünkü ayrılmış satış tavanı doldu (${m[1]} hücre); yarın yeniden açılır.`],
  [/^hesap basina en cok (\d+) ayrilmis hucre/, (m) => `Bir hesap en çok ${m[1]} ayrılmış hücre alabilir.`],
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
  // Ölçek büyütme (`tesis_olcek_yukselt`, mülk kipi; docs/06 §15.10)
  [/^olcek yukseltmesi (\d+) ek bitisik hucre ister/, (m) => `Bu büyütme ${m[1]} ek bitişik hücre ister; hücreler seçilmedi.`],
  [/^olcek yukseltmesi (\d+) ek hucre ister \(verilen (\d+)\)/, (m) => `Bu büyütme ${m[1]} ek hücre ister (seçilen ${m[2]}).`],
  [/^bu yukseltme ek hucre gerektirmez/, () => "Bu büyütme için ek hücre gerekmiyor."],
  [/^ek hucreler tesisin hucrelerine kenar-bitisik olmali/, () => "Ek hücreler yapıya kenar kenara bitişik olmalı."],
  [/^sahipsiz hucre icin sinif gerekli/, () => "Satın alınacak hücrelerin arsa sınıfı belirtilmedi."],
  [/^tesis zaten ayni veya daha buyuk olcekte/, () => "Tesis zaten bu ölçekte ya da daha büyük."],
  [/^tesiste olcek yukseltmesi suruyor/, () => "Bu tesiste büyütme zaten sürüyor."],
  [/^bolgede boyle bir tesis yok/, () => "Bu tesis artık yok."],
  [/^bolge oyuncunun degil/, () => "Bu işletme senin değil."],
  [/^bilinmeyen bolge/, () => "Bu işletme sunucuda bulunamadı."],
  [/^gecersiz olcek/, () => "Geçersiz ölçek."],
  [/^tesis turu mulk kipinde olceklenemez/, () => "Bu yapı büyütülemez."],
  [/^tesisin hucresi yok/, () => "Tesisin hücre kaydı bulunamadı."],
  [/^sanayi katmani kapali/, () => "Bu dünyada ölçek büyütme kapalı."],
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
