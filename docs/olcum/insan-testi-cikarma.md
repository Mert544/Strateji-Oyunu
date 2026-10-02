# İnsan testi: günlük oynatma ve çıkarma (İ1 + İ4)

> **Elle yazılmıştır.** Kaynak istek: insan testi kılavuzu §7.2 İ1 ve İ4 (`takim/a1/insan-testi`, `docs/arastirma/insan-testi-kilavuzu.md`). Kod: `packages/olcum/src/insan-cikarma.ts` (çıkarma), `insan-cikarma-depo.ts` (dosya deposu okuyucusu), `insan-cikarma-cli.ts` (komut). Test: `packages/olcum/test/insan-cikarma.test.ts`.

## Ne yapar

Sunucunun dosya deposundaki komut günlüğünü (`gunluk.jsonl`) ve anlık görüntüyü okur, günlüğü `Simulasyon.uygula` ile **çevrimdışı yeniden oynatır** ve her test oyuncusu için H6 (ii), Y1, Y2, Y5, Y6, Y7 ve A0-11 olgularını çıkarır. Günlük **kabul bilgisi taşımaz ve başarısız komutlar da günlüktedir**; kabul edilen ilk yapı komutu ancak oynatma sonucundan bilinir.

- Oynatma sunucunun kurtarma yoluyla aynıdır (`sunucu/src/yazar.ts` `ac`): anlık görüntü yoksa dünya tohumdan kurulur ve günlük seq 1'den sırayla uygulanır. Anlık görüntü varsa, oynatma görüntünün seq'ine gelince görüntü zamanına ilerler ve **durum özetini görüntününkiyle karşılaştırır** (`test.goruntuDogrulama`; eşleşmezse `notlar`ta UYARI).
- Dosya deposu **yalnız okunur**: kilit alınmaz, sondaki yarım satır kesilmez (atılır ve bildirilir). Postgres için K2'nin depoyu dosya biçimine döken aracı (`--dok`) kullanılacak; bu okuyucu yalnız dosya biçimini bilir.
- Çıktı **deterministiktir** (duvar saati yok): aynı günlük, aynı veri paketi ve aynı seçeneklerle bayt bayt aynı. Çıktıda ad ya da e-posta yoktur: oyuncu kimliği yalnız dışarıdan verilen **K1…K5** kodlarına eşlenir; eşlemede olmayan oyuncular (botlar, yerleşikler) yalnız emsal hesabına girer.

## Komut

```
pnpm olcum --kip cikarma --depo <dizin> --oyuncular <eslesme.json> --cikti <cikti.json> \
  [--harita mini|sentetik|gercek[:ad]] [--parsel mini|sentetik | --parsel-dosya <yol>] \
  [--tohum N] [--commit SHA] [--dunya AD] [--epoch MS] [--bitis-t MS | --bitis-trt ISO] [--baslangic bastan|goruntu]
```

- **Sunucuyla aynı veri paketi** verilmeli (`--harita`, `--parsel` ya da `--parsel-dosya`; sunucu CLI'sindeki seçeneklerle aynı). Kural sürümü (içerik + parametreler) görüntününkiyle eşleşmezse çıkarma durur.
- `--oyuncular` eşleme dosyası **repoda tutulmaz**: `[{ "id": "<oyuncu kimliği>", "kod": "K1", "profil": "strateji-masaustu-windows", "acilis": "ciftci" }]`. `acilis` (ciftci | sanayici | pazar) o ilçede oyuncuya önerilen açılıştır; resmî (ii) ve (i) ayak izi için kullanılır, yoksa ilk üretim yapısının türünden çıkarılır (belirsizse null).
- `--bitis-t`/`--bitis-trt`: gözlemin bittiği an. Son komuttan sonra komut gelmediyse (sakin dünya) katılım + 14 günlük pencereyi kapatmak için **verilmelidir**; yoksa son günlük kaydı ve görüntü zamanı kullanılır ve pencere tamamlanmamış sayılır (Y7 "ölçülemez", `pencereTamam: false`).
- `--epoch` (ya da görüntüdeki `dunyaEpochMs`): `trt` alanları için; yoksa `trt` null. `--commit` yoksa `git rev-parse HEAD`.

## Çıktı (kılavuz §7.3 biçimi; ek alanlar işaretli)

Her zaman `{ tMs, trt }` biçimindedir (**İ4**): `trt` = `dunyaEpochMs + t`, Türkiye saati (`+03:00`) ISO.

| Alan | Anlam |
|---|---|
| `test` | `commit`, `kuralSurumu` (içerik + parametre özeti), `dunya`, `dunyaEpochMs`, `baslangic`, `kayitSayisi`, `sonSeq`, `bitisTMs`, `goruntuDogrulama`. Oluşturma tarihi YOKTUR (determinizm) |
| `katilimcilar[].kod`, `profil` | K1…K5, serbest profil etiketi |
| `katilma` | kabul edilen `oyuncu_katil` zamanı, ilçe |
| `ilkYapi` | ilk KABUL EDİLEN `yapi_yerlestir`/`tesis_insa_hucre`: tür, ilçe, `gecikmeMs` (katılımdan), `acilisTuru` |
| `yapiDenemeleri` (ek) | yapı komutu denemeleri, kabul ve ret, hata iletisiyle (ilk 20): gözlemcinin "denedi, kurulmadı" notuyla karşılaştırmak için |
| `insaTamam` | ilk yapının inşa bitişi (inşaat kaydındaki `bitis`, tam ms); `durum` tamam / iptal / suruyor |
| `ilkSatis` | ilk kabul edilen ihracat `ticaret_emri` zamanı ve ilk **gerçekleşen** satış (`gerceklesenSaat > 0`); örnekleme emirden sonraki ilk 3 saatte dakikalık, sonra saatlik (`cozunurlukMs`: 60000 ya da 3600000) |
| `ikinciYapi` | ikinci kabul edilen yapı komutu: tür ve Y5 katmanı (`yapiKatmani`) |
| `yonKomutlari` | kabul edilen `parsel_birak` ve `insaat_iptal` (Y6) |
| `dukkan` | dükkân KURULUŞU: `DukkanDurumu.kurulus` (A0-11 "kurulma"; A2 O2-2; alan çekirdekte `EkYapiDurumu.dukkan.kurulus` olarak vardır; dükkân henüz kurulmamışsa null) |
| `dukkanKomutu` (ek) | dükkân türü yapının kabul edilen ilk yapı komutu zamanı (dükkân türü çekirdekte tanımlı olunca) |
| `oturumlar` | **null** (İ2 oturum olayı kaydı olmadan çıkarılamaz) |
| `y7` | katılım + 14 günün son 7 günü: `net7gunMili` = hazine(T) − hazine(T−7g) + (T−7g, T] arası sermaye harcaması (arsa + yapı parası; botlardaki Y7 tanımı), `emsalMedyanMili`, `emsalDuzeyi` (ilçe, yoksa il), `emsalSayisi`, `uretenEmsalSayisi`; pencere dolmadıysa `{ olculemez }`. Emsal: oyuncudan önce katılmış, ilçede hücresi olan tüm diğer oyuncular; yalnız geliri > 0 olanlar medyana girer |
| `h6` | `baglayici: "genis"` (baş lider kararı). `tabanYeter`/`tabanYeterYurtDahil` (i), katılım komutundan HEMEN ÖNCEKİ durumda ayrılmış boş hücre ≥ açılış ayak izi; `iiGenis` (bağlayıcı): katılımdan 14 gün içinde kabul edilen herhangi üretim yapısı (ambar ve ticaret ofisi sayılmaz; dedektör ile aynı); `ii` (resmî, ikincil): açılış türünden yapı; `iiBagimsiz`: null (ipucu verisi dışarıdan); `pencereTamam` |
| `komutOzeti` (ek) | oyuncunun kabul ve ret sayısı |

## Doğrulama (kabul ölçütleri)

- Aynı günlük iki kez oynatılınca bayt bayt aynı çıktı (test).
- Çıktıda oyuncu kimliği ya da ad yok (test: kimlik dizesi çıktıda aranır).
- Sürüm izi: `commit` ve `kuralSurumu`.
- Sunucunun gerçek `DosyaGunlukDeposu` ve `DosyaGoruntuDeposu` çıktısı okunur ve çıkarma aynı sonucu verir (test).
- Fikstürde (başarısız komutlu sentetik günlük) bağımsız beklentiyle eşleşir: ilk kabul edilen yapı zamanı, inşaat bitişi, TRT, Y7 (emsal ali dahil).
- **Pilotta doğrulanacak:** gözlemcinin elle yazdığı yapı onay zamanıyla ≤ 10 sn fark (kılavuz §5.7). Bu belge yalnız yazılımı teslim eder.

## Sınırlar

- Oturum olayları (İ2) yok: D1/D7 ve giriş sayısı çıkarılamaz.
- Ölçüm dışı oyuncuların günlüğe giren tüm komutları oynatılır (dünya tek ve ortaktır); eşlemede olmayanlar çıktıya girmez.
- `ilkSatis.gerceklesenTMs` örnekleme çözünürlüğündedir (ilk 3 saat 1 dk, sonra 1 sa); satış "emrin gerçekleşmesi"dir (ticaret defteri toplamının artışı değil).
- Dünya içerik göçü geçirdiyse (görüntü ile günlük farklı kural sürümlü) bastan oynatılamaz; `--baslangic goruntu` görüntü öncesini bilmez.
- Gözlem bitişi `--bitis-t` ile verilmezse son komuta kadardır.

## Alfa-0 ekonomi izleme (`--ekonomi`; A2 alfa0-ekonomi-izleme §0, §8.2)

Seçenek açıksa (`cikar({ ekonomi: true })`, komutta `--ekonomi`) oynatma **günde bir** dünya düzeyi örnek alır ve çıktıya `ekonomi` bölümü eklenir; kapalıyken çıktı eskisiyle aynıdır. Yalnız okur, çekirdeğe dokunmaz, deterministiktir; **çıktıda oyuncu kimliği ya da kişisel veri yoktur**: oyuncu düzeyi ölçüler yalnız grup toplamı olarak yazılır. Gruplar (A2 O2-3): `insan` (eşleme dosyasındaki test oyuncuları) ve `diger` (dünyadaki bütün ötekiler: botlar, yerleşikler).

- `ekonomi.gunluk[]`: gün sınırlarında (t = k × 1 gün; komutlardan ÖNCE) oyuncu sayısı (insan, diğer), para defteri sayaçları (musluk ve lavabo kalemleri, kasa girişi ve bakiyesi; kümülatif mili-₺), fiyatı tabana göre sınırda olan mallar (≤ 0,26 ya da ≥ 1,74), yöntem dağılımı.
- `ekonomi.metrikler.E1…E10`: değer, `durum` (yesil | sari | kirmizi | olculmedi) ve nedenli not. Eşikler A2'nin **ilk tahminidir** (doğrulanmadı) ve çıktıda `ekonomi.esikler` olarak yazılır (kod: `EKONOMI_ESIKLERI`). Örneklem koşulu: dünyada/grupta < 5 oyuncu ya da < 3 olay ise durum `olculmedi` (değer yine yazılır).
  - **E1 R** = lavabo / (ihracat − ithalat), 7 günlük sayaç farkı (lavabo = isletme + sebeke + araziVergisi + harcama + arsa; ihracat = ihracatNpc + yerelNpc; ithalat = ithalatNpc); `Rkasa` bilgi olarak (kasa girişi lavaboya eklenir). **E3 ZP8** = yerelNpc / (yerelNpc + ihracatNpc); kırmızı iki ardışık 7 günlük pencerede > %50. `yerelNpc` (musluk) ve `sebeke` (lavabo) kalemleri çekirdekte vardır (G6-2b, G7-2); dükkân/şebeke kullanılmayan dünyada 0.
  - **E2 r** = yatırım / net kâr, oyuncu başına 7 gün (net kâr = hazine farkı + sermaye komutu tutarı; yatırım = `SERMAYE_KOMUTLARI` tutarları: `parsel_al`, `yapi_yerlestir`, `tesis_insa_hucre`, `tesis_olcek_yukselt`, `kenar_gelistir`; `genel_onarim` yatırım değildir), grup medyanı.
  - **E4 ilk dükkân** (kuruluş − katılım medyanı, ≥ 3 kuran; 48 sa sonrası kuran payı) ve **E6 M** (katılımdan 7 gün içinde ≥ 24 sa `degirmen` tesisi olan / ≥ 1 `gida_fabrikasi` kuran; saatlik gözlem) grup bazlıdır; G4 tetik M'si botta yalnız SEÇİCİ botlardan hesaplanır (burada gruplar bot/insan ayrımıdır).
  - **E7(b)** kamu kasası birikimi (Σ bakiye / 28 günlük Σ musluk; 28 günlük örnek yoksa ölçülmedi); **E8** fiyat sınırındaki mal sayısı ve en uzun kesintisiz süre (günlük çözünürlük); **E9** oyuncu yaşının 14. ve 45. gününde tesis aşınma medyanından k = 3 zincir çıktı kaybı (grup); **E10** oyuncu başına ortalama ödül (musluk.odul / oyuncu sayısı).
  - **Ölçülemeyenler (nedenli):** E5 geri ödeme (dükkân satış miktarı sayacı yok: A2 K2-8), E7(a) kamu kapasite karşılama (sipariş hacmi okunamaz), E10 reddedilen ödül sayacı (dünya durumunda yok; sunucu /metrik).
- Sınır: günlük çözünürlük; E8 "48 sa kesintisiz" günlük örneklerle (×24 sa) yaklaşık.

## Alfa-0 izleme: kim, neye, ne sıklıkla, nereden (tek tablo)

Kaynaklar: sunucu README ("Sağlık ve metrik": önerilen alarmlar, `/metrik` portu ve token), A2 [`alfa0-ekonomi-izleme.md`](../arastirma/alfa0-ekonomi-izleme.md) (§0 eşikler, §9 çizelge) ve [`alfa0-metrik-okuma.md`](../arastirma/alfa0-metrik-okuma.md) (gauge sorguları), bu belgenin günlük oynatması. **"Kim" ve "alarm kanalı" sütunlarında "sahip" yazan hücre sahip kararıdır; belgede kimse ve kanal tanımlı değildir, isim ya da kanal uydurulmadı.** Eşikler A2'nin ilk tahminidir (doğrulanmadı); 5'ten az oyuncuda renk verilmez ("ölçülmedi").

| # | Kim | Neye bakar | Alarm eşiği | Ne sıklıkla | Nereden | Alarm kanalı |
|---|---|---|---|---|---|---|
| 1 | sahip | **Sunucu sağlığı**: `bolge_olumcul`, `bolge_olay_dongusu_gecikme_p99_ms`, `bolge_commit_gecikme_ms{quantile="0.95"}`, `bolge_son_goruntu_yasi_saniye`, `bolge_goruntu_hata_toplam`, `bolge_goruntu_isci_hata_toplam` | `bolge_olumcul == 1`; olay döngüsü p99 > 250 ms; commit p95 > 1000 ms; son görüntü yaşı > 2 saat; iki hata sayacında artış (README "Önerilen alarmlar") | sürekli; kazıma aralığı: sahip kararı (A2 gauge'lar için 60 sn önerir, sunucu ölçümü en çok 10 sn'de bir yeniler) | `/metrik`, ayrı port (`BOLGE_METRIK_PORT`; compose'ta 127.0.0.1:9464), `Authorization: Bearer $METRIK_TOKEN`; sunucu makinesinden ya da compose ağından, dışarı açılmaz | sahip |
| 2 | sahip | **Canlılık**: `/saglik` (503 = `olumcul`/`kapaniyor`; 200 `yetisiyor` ölümcül değildir) ve `/hazir` (yalnız `durum:"ok"` iken 200) | `/saglik` 503; `/hazir` 200 olmuyor | sahip kararı (README yalnız ters vekil/yük dengeleyici kabul testi için der) | ana oyuncu portu, kimlik doğrulamasız, kişisel veri yok; compose'ta Caddy arkasında, sunucu makinesinde `127.0.0.1` | sahip |
| 3 | sahip | **Sunucu günlüğü olayları**: `{"olay":"olumcul",...}`, açılışta `izgara` olayı (`ilce` 3 olmalı) ve `hazir.kurtarma` (`kalanBasarisiz` 0) | `olumcul` olayı; `izgara.ilce` ≠ 3 (görünmezse DURUN, işletim kılavuzu §1); `kalanBasarisiz` > 0 | her açılışta ve her `olumcul`da; sürekli çalışırken günlük kuyruğu sahip kararı | `$D logs sunucu` (sunucu makinesi, compose) | sahip |
| 4 | sahip | **Ekonomi gauge'ları, dünya toplamı** (A2 metrik-okuma §2): E1 R, E2 r, E3 ZP8, E7 kamu kasaları, E8 fiyat sınırı, E9 aşınma, E10 ödül, E11 perakende primi; kaynak `bolge_para_*_mili`, `bolge_kasa_*`, `bolge_pazar_*`, `bolge_tesis_asinma_*`, `bolge_dukkan_kademe_*`, `bolge_odul_*` | ZP8 > %50 iki ardışık 7 günlük pencerede; E8 sınırdaki mal ≥ 3 (kırmızı), 48 sa kesintisiz sınırda olan mal; E10 `increase(bolge_odul_reddedilen_toplam[1h]) > 0`; E11 1,15 payı ≥ 0,6 ve prim ≥ 1,25; E1/E2/E7/E9 eşikleri [ekonomi izleme §0](../arastirma/alfa0-ekonomi-izleme.md) ("kırmızıda ilk ayar" orada) | kazıma 60 sn (A2 önerisi); karar çizelgesi (A2 §9): gün 1 (E10, E4 kısmi, E8), gün 3 (E4, E6, E8), gün 7 (E1, E2, E3, E5, E7, E9, E11), gün 14 (E9, E1), sonra haftalık; yeniden başlamadan sonraki ilk 10 dk ve ilk 24 saat R atlanır | aynı `/metrik` (satır 1); ekonomi alanları entegrasyona girene kadar yok (A2 metrik-okuma kapsam notu) | sahip |
| 5 | sahip | **Oyuncu ve ilçe kırılımı** (gauge'da etiket yok): E2 oyuncu medyanı, E4 ilk dükkân, E5 geri ödeme, E6 M (oyuncu başına, ilk 7 gün, tetikte yalnız seçici bot), E9 bakımlı/bakımsız oranı, E7(a) ilçe başı kapasite karşılama, E3/E11 ilçe kırılımı | A2 eşikleri (çıktıda `ekonomi.esikler`); örneklem koşulu: < 5 oyuncu ya da < 3 olay ⇒ `olculmedi` | günde bir oynatma (çıktının günlük örneği 1 gün; A2 çizelgesindeki günlerde okunur: 1, 3, 7, 14, haftalık) | bu belgenin günlük oynatması: `--ekonomi` (yukarıdaki komut); sunucu günlüğü ve görüntüsüne erişim gerekir (sunucu makinesi; dökümün nasıl alınacağı sahip kararı, bkz. sunucu README "Test dünyası ve döküm araçları"). Çıktıda oyuncu kimliği yoktur | sahip |
| 6 | sahip | **Yedek**: günlük yedeğin alındığı ve 7 yedeğin kaldığı | yedek servisi çalışmıyor ya da yedek yok | günde bir (compose `yedek` servisi); denetim sıklığı sahip kararı | `$D ps yedek`; kontrol listesi adım 14; yedek dizini ayrıca başka diske kopyalanır | sahip |

Notlar:
- **Kırmızıda parametreye kendiniz dokunmayın**: tablodaki ilk ayarı ve yönünü geliştiriciye iletin; parametre değişimi kural dönemi göçüdür (işletim kılavuzu §6-7).
- Satır 4'teki gauge'lar dünya toplamıdır; bot ve insan paydada karışır (insan ayrımı satır 5'teki oynatmadadır).
- Tabloda olmayan ve **ölçülemeyen** kalemler (nedenli): E5 geri ödeme satış miktarı sayacı yoksa yaklaşıktır (A2 K2-8), E7(a) kamu sipariş hacmi, E10 reddedilen ödül sayacı dünya durumunda yok (satır 4'te sunucu sayacı `bolge_odul_reddedilen_toplam` kullanılır).
