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
| `dukkan` | dükkân yapısı kurulum zamanı (A0-11; çekirdekte henüz yok: null) |
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
