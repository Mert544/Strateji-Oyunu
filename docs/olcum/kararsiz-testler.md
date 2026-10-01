# Kararsız testler: kapı kaynaklı kanıt, kök neden tahmini, dayanıklılık önerisi

> **Elle yazılmıştır.** Bu belge YENİ tekrar turu koşmadan, yalnız kapı ve provaların kayıtlı çıktılarından yazıldı (sahip kararı: ilerleme önce, ölçüm yalnız karar için). Kaynak: kapı sonuçları `takim/kapi-sonuclari/*.json` ve günlükleri (taban 8064ded … P5, 1 Ekim 2026 18:28–20:52 UTC), kapı `ozet.log`, PG doğrulayıcı çıktıları `pg-*.json`, O3 provası `fl-1..6.log` (Operasyon lideri notu). Liste yalnız **kapıda ya da provada görülenlerle** sınırlıdır; kapıda görülmeyen eski adaylar (§6) açıkça ayrıdır. **Hiçbir testin atlanması ya da devre dışı bırakılması önerilmez**; yalnız dayanıklılık (bekleme koşulu, bağlantı yaşam döngüsü, çıkış kodu sınıfı) önerilir. Kök nedenler **tahmindir** ("doğrulanmadı") dedikçe işaretlidir.

## 0. Özet

| # | Test | Kapıda görüldü | Sınıf | Durum |
|---|---|---|---|---|
| 1 | `sunucu/test/pg.test.ts` (ve `yedek-geri-yukle.test.ts`): tüm testler geçiyor, **çıkış kodu 1** | 8064ded 1/1; d13ba4a kapı PG adımı 3/3; tek başına 4/6 | gerçek sorun, çıkışı kıran yakalanmamış hata (57P01) | K2 düzeltmesi `takim/k2/pg-57p01` 18e36b0: PG GEÇTİ 77/78 (tek koşu) |
| 2 | `pg.test.ts` hesap deposu sözleşmesi (sema sürüm 4) | 5413811 2/2 kırık (48/49) | kararsız değil, tekrarlanabilir hata | 2819a43 ile düzeldi (PG GEÇTİ 50/50) |
| 3 | `playwright yuru-etkilesim` | ardışık 4 kapı koşusunda kırık (19:17–19:46), üç farklı imza; öncesinde ve sonrasında geçti | yüke ve zamanlamaya duyarlı kontrol | açık; öneri §4 |
| 4 | `playwright f4-uctan-uca` | 2 kırık koşu (K1 yığını: 19:17, 19:34), sonra 4 geçen; P5'te ayrı (deterministik) kırık | ilk ikisi zamanlama/durum; sonuncusu kod değişikliği | açık; öneri §5 |
| 5 | vitest (tam paket) | 6 kapı koşusu, 1800 → 2427 test | kırık YOK, `kararsiz: []` | yok |

## 1. Kapı koşuları (kayıtlı, hepsi tek makine; yük ortalaması 4–10)

| Başlangıç (UTC) | Dal / paket (uç) | vitest | Playwright |
|---|---|---|---|
| 18:28 | o1/kapi-betigi (4872120, taban 8064ded) | 1800/1828 geçti | f4 OK, yuru OK (mobil fark 0,00 rad) |
| 19:00 | p1 (d8114dd) | 1800/1828 geçti | atlandı (yol tetiklemedi) |
| 19:17 (bitiş 19:32) | K1 g1-g2 + O3 g3-izgara + K2 kare-olcek + O2 olcek-suzgec + olcum-temel, 6/6 (9b769d0, taban de9959c) | 1831/1862 geçti | **f4 kırık** (TimeoutError), **yuru kırık** (mobil 0,68 rad) |
| 19:34 | p2-tekrar (9b769d0; yalnız f4 + yuru) | – | **f4 kırık** (TimeoutError), **yuru kırık** (TimeoutError) |
| 19:40 | p2b (7553b55) | – | f4 OK; **yuru kırık** (mobil 0,68 rad) |
| 19:46 | taban-yuru (de9959c, yani K1 yığını YOK) | – | **yuru kırık**: masaüstü koşu/depar 7,0 / 7,0 m/s |
| 19:53 | p3 (5413811), 12/12 | 2008/2049 geçti | f4 OK |
| 20:29 | p4 (d13ba4a) | 2201/2244 geçti | f4 OK, yuru OK (mobil 0,45 rad) |
| 20:52 | p5 (çalışıyor) | 2427/2470 geçti | f4 **HATA** (komut yolu, bkz. §5); yuru çalışmadı |

Atlanan test sayıları (28–43) ortam bayraklı (`BOLGE_AGIR_TEST`, pg) testlerdir ve bu işle ilgisizdir.

## 2. pg.test.ts: çıkış kodu 1, testler geçiyor (57P01)

- **Nerede görüldü:** 8064ded (PG doğrulayıcı: 13/13 test geçti, `kirik=0`, vitest çıkış 1); d13ba4a (PG doğrulayıcı üç koşu: 31/31, 25/25, 25/25 test geçti, çıkış 1; ikinci ve üçüncü koşu aynı sha'da tekrar edildi ve ikisi de kırık: `kararsiz: false`, yani **tutarlı**). Operasyon liderinin tek başına 6 koşusunda çıkış kodları 1, 0, 1, 1, 1, 0 (günlük `fl-1..6.log`; 4/6). 18e36b0 (K2 düzeltmesi): PG GEÇTİ 77/78 (1 koşu; tekrar yok).
- **Kaydedilen imza:** çıkışı kıran yakalanmamış pg hatası `FATAL 57P01` (admin_shutdown), `DROP DATABASE ... FORCE` sırasında hâlâ açık bir bağlantıda dinleyicisiz `error` olayı.
- **Kök neden tahmini:** havuz/istemci bağlantısı üzerinde `error` dinleyicisi yok; `DROP DATABASE ... FORCE` o bağlantıları sunucu tarafında sonlandırır ve `pg` `error` olayı yakalanmazsa süreç `uncaughtException` ile çıkar. Testler assertion düzeyinde geçer, süreç çıkışı kırılır. Kararsızlık (4/6) bağlantının o anki durumuna bağlıdır (boşta mı, sorguda mı), yani zamanlama; yükle değil. Kaynak: `fl-*.log` imzası ve K2'nin `pg-57p01` dalı (doğrulanmadı: kod okunmadı, günlükten çıkarım).
- **Dayanıklılık önerisi (test atlanmadan):** (1) her `pg.Pool` ve `pg.Client` için `error` dinleyicisi (`pool.on("error", …)`, istemcide de) ve `DROP DATABASE` öncesi uygulama bağlantılarının `end()` ile kapatılması; (2) test altyapısında FORCE yerine önce bağlantıları kapat, sonra bırak; (3) kapıda ayrı sınıf: "tüm test geçti ama süreç çıkışı ≠ 0" zaten `kirik=0 cikis=1` ile görünüyor, bunu `kirik_adim: cikis-kodu` olarak adlandırmak kararsızlık ile gerçek test kırığını ayırır; (4) çıkış kodu kontrolünü korumak (test geçse bile yakalanmamış hata kapıyı kırmalı: doğru davranış).
- **Sahip:** K2; düzeltme P6'da.

## 3. pg.test.ts: hesap deposu sözleşmesi (5413811): tekrarlanabilir kırık, kararsız değil

- **Nerede görüldü:** 5413811 üzerinde iki bağımsız PG koşusu (96 sn ve 111 sn, 48/49): "hesap deposu sözleşmesi (bellek ve dosya ile aynı): hesap başına bir oyuncu, tek kullanımlık süreli bağlantı, oturum, silme". Yamalı kopya aynı sha'da 49/49 geçti (`pg-5413811-yamali`).
- **Kök neden (tanılandı, kapı kaydında):** `hesapOlustur` `ON CONFLICT` sonrasında okumayı FARKLI bağlantıyla yapıyordu; havuz doluyken bağlantı beklemesi kilitlenmeye varıyordu. Düzeltme 2819a43 ("AYNI bağlantıyla okur"; havuz kilitlenmesi) ve PG GEÇTİ 50/50.
- **Sınıf:** "bir kez görülen, iki kez tekrarlayan" kırık aynı nedenledir; rastgele değil. Öneri: kapıda PG adımına sabit zaman aşımı (ör. 60 sn) ve kilitlenme olduğunda `pg_stat_activity` (bekleyen bağlantı) dökümünü günlüğe yazmak tanıyı hızlandırır; sözleşme testi kilitlenmeyi yakaladığı için olduğu gibi kalmalı.

## 4. playwright yuru-etkilesim (packages/istemci/scripts/yuru-etkilesim.ts)

Üç ayrı imza, dördüncü bir uyarı:

| İmza | Kontrol (kod) | Kırık koşular (yük 1 dk) | Geçen koşular |
|---|---|---|---|
| a. Mobil "tıkla-git yolunda kamera karakterin arkasına geçti" `fark < 0,5 rad` (`:340-341`) | elle bekleme (1,1 sn) bitince kamera yaw'ı karakter yönünün tersine yakınsamalı | 0,68 rad: 19:17 (yük 5,9), 19:40 (4,3) | 0,00 (18:28), 0,10 (19:46), **0,45 (20:29: eşiğe 0,05 yakın)**; masaüstü her koşuda 0,00 |
| b. Masaüstü "W koşu ~7 m/s, Shift depar ~10 m/s" (`:259`: `hKos` 6–8, `hDepar` 9–11 ve `anim === "depar"`) | Shift ile depara geçiş | 19:46 (yük 8,5; taban dalı de9959c): 7,0 / 7,0 m/s, `anim: kos`, depar hiç devreye girmedi | tüm öteki koşular |
| c. `TimeoutError` (`page.waitForFunction`, 90 sn) | bir sayfa koşulunu bekleme | 19:34 (yük 6,8; masaüstü kontrolleri OK sonrası) | – |

- **Tekrar ve yük:** kapı `kararsiz` kaydı (p2b) bu dosyanın ardışık dört kırık koşusunu birleştiriyor: ilk hata dizgisinde üç farklı imza (0,68 rad iki kez, TimeoutError, 7,0 / 7,0 m/s) ve dört yük örneği (5,9, 6,8, 4,3, 8,5). Yani **aynı testin hatası koşudan koşuya değişiyor**, düşük yükte de (4,3) kırıldı, ama yüksek yük (8,5) ve ağır koşu (179 sn) en kötü imzayı verdi. 19:46 koşusu (b) taban dalında (de9959c) olduğundan **K1 kod değişikliğinden bağımsızdır**: aynı betik tabanın kendisinde kırıldı. Sonrasında (20:29, p4) geçti.
- **Kök neden tahmini (doğrulanmadı):** yazılım GL (SwiftShader, CPU) altında kare hızı düşüyor; (a) kamera yaw yakınsaması kare/sim saatine bağlı, sabit bir bekleme sonrası okunan `fark` yüklü makinede 0,5'in üstünde kalabiliyor (0,45 en iyi koşuda bile eşiğe yakın); (b) Shift'in basılı tutulması ile `anim` güncellemesi arasındaki pencere çok kısa, bir kare kaçınca "kos" okunuyor; (c) sayfa bekleme koşulu 90 sn'lik zaman aşımına çarpıyor (aynı SwiftShader yüküyle).
- **Dayanıklılık önerisi:** (1) sabit süre bekleme yerine **koşula bağlı bekleme**: `page.waitForFunction(() => yaw farkı < eşik, { timeout })` ile yakınsamayı yoklamak, eşiği değiştirmeden (kontrol aynı kalır; 0,5 rad korunur); (2) Shift için `keyboard.down("Shift")` sonrası `anim === "depar"` için ayrı `waitForFunction` (en çok birkaç sn) ve ölçümü ondan sonra almak; (3) 90 sn zaman aşımını artırmak yerine yavaşlığın nedenini görmek için kontrol başına geçen süreyi ve `yuk1dk`'yı hata satırına yazmak (zaten `yuk1dk` var: tek tek kontrol süresi eklenmeli); (4) Playwright adımının yük kapısı: kapı betiği dakikalık yük > 8 iken Playwright'ı başlatmayıp yükü bekleyebilir (testi atlamaz, geciktirir); (5) kamera "arkasına geç" kontrolünü hız/süre yerine **bitiş durumu** ile (kamera yaw'ının yakınsadığı en çok N kare içinde) ifade etmek.
- **Sahip:** K1 (istemci betiği). Kapıda üç imza ayrı sayılmalı ki biri iyileşince öbürü saklanmasın.

## 5. playwright f4-uctan-uca (ve "+5 dk aşama İskele" kontrolü)

- **Kırık koşular 19:17 ve 19:34 (K1 yığını, taban de9959c):** `TimeoutError`: yapı menüsünde "Ahır kur" onay düğmesi (`data-yk="onayla"`) `disabled` kalıyor, "element is not enabled" döngüsü 90 sn sonunda zaman aşımı (112 sn). `+5 dk` satırına hiç gelinmedi (0 satır). Aynı betik sonraki dört koşuda geçti (19:40 p2b, 19:53, 20:29 ve öncesinde 18:28 tabanda): K1 yığınının girdiği uçlarda iki kez, çıkardığımızda yok.
- **Kök neden tahmini (doğrulanmadı):** onay düğmesinin etkinliği hazine/arsa hesabına ve hayalet doğrulamasına bağlı; K1 yığınının yapı önce yerleşim akışı ilk sürümde ahır için arsa/hazine denetimini düğmeye farklı yansıtıyor olabilir (aynı kartın bedel satırı 19:34 koşusunda 2.001 ₺, 20:52 koşusunda 3.501 ₺ gösteriyor: akış sürümler arasında değişmiş). Yani bu iki kırık **kararsız değil, yığının gerçek hatası** olabilir; p2b'de düzeldi. Zamanlama payı: aynı koşuda "element was detached from the DOM, retrying" satırı var (düğme yeniden çiziliyor): yeniden çizim sırasında tıklama bekleyen düğmeye düşebilir.
- **"+5 dk aşama İskele" kontrolü (kapıdaki satır):** `+5 dk: ali kendi çiftliğinde aşama İskele …` satırı geçen koşularda (18:28, 19:40, 19:53, 20:29, 20:52) bulunuyor; **etiket sırası koşudan koşuya değişiyor** (20:29: "Çiftlik · İskele | Ahır · Temel", 20:52: "Ahır · Temel | Çiftlik · İskele"; `etiketler` dizisi ["Çiftlik","Ahır"] ↔ ["Ahır","Çiftlik"]). Kontrol sıra bağımsız yazılmışsa sorun yok; sıraya bağlıysa kararsızlık adayıdır (kodu okumadım: doğrulanmadı). Dayanıklılık: etiketleri sıralı kümeyle karşılaştırmak.
- **20:52 (p5) f4 HATA:** "komut yolu: tek atomik yapi_yerlestir istemci komutları: parsel_al, parsel_al, tesis_insa_hucre": beklenen tek atomik `yapi_yerlestir`, istemci üç komut gönderiyor. Bu **deterministik bir beklenti değişikliği** (K1'in komut yolu ile betiğin beklentisi ayrışmış), kararsızlık değildir; kapı P5 sonucunu verince netleşir.
- **Dayanıklılık önerisi:** (1) düğmeyi tıklamadan önce `waitFor({ state: "attached" })` ve `enabled` yoklaması (yeniden çizim bitince), zaman aşımı hatasında düğmenin `disabled` nedeni (neden metni/hazine/arsa) çıktıya yazılsın; (2) etiket karşılaştırması sıra bağımsız; (3) beklenti değişikliklerinde (20:52 satırı) betik ve istemci AYNI pakette birleşsin (kapı aynı paket kuralı).

## 6. Kapıda görülmeyenler (liste dışı)

İlk görev tanımında adı geçen `yayin-parca`, `metrik` ve `lojistik performans` testleri ile eski tek seferlik pg kırığı **kapının 6 vitest koşusunda (1800 → 2427 test) kırılmadı**; bu belgede kök neden tahmini yazılmadı (kanıt yok) ve tekrar turu koşulmadı (sahip kararı). Biri kapıda kırılırsa bu belgeye aynı biçimle (nerede, kaç kez, yük, tahmin, öneri) eklenir.

## 7. Ortak dayanıklılık ilkeleri (öneri, hiçbir test atlanmaz)

1. **Bekleme koşulu, sabit süre değil** (Playwright): yoklama + anlamlı zaman aşımı; kontrol eşiği değişmez.
2. **Yük bilgisi her hatada:** kapı kaydı zaten `yuk1dk` taşıyor; hata satırına kontrol başına süre ve kare hızı da eklenmeli ki "yük mü, kod mu?" ayrılsın.
3. **Aynı sha'da tekrar = sınıflandırma:** kapının `tekrarlar` ve `kararsiz` alanı (pg-*-ozet.json) tutarlı kırığı (`kararsiz: false`) rastgeleden ayırıyor; Playwright adımında da aynı tek tekrar kuralı (aynı sha, bir kez) yeterli ve ucuz.
4. **Çıkış kodu sınıfı:** "tüm testler geçti, süreç çıkışı ≠ 0" ayrı adla raporlansın (§2).
5. **Bağlantı yaşam döngüsü (pg):** her havuz/istemcide `error` dinleyicisi; `DROP DATABASE` öncesi `end()`.
6. **Beklenti değişikliği ve kod aynı pakette** (kapının "aynı paket" kuralı): betik beklentisi ile istemci komut yolu ayrışırsa kırık deterministiktir ve kararsızlık gibi okunur.
