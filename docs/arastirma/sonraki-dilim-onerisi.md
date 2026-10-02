# Sonraki oynanış dilimi önerisi (P13 sonrası)

> **Durum.** Yalnız belge; kod ve veri değişmedi. Taban `entegrasyon` 5c8e704 (dal `takim/a3/sonraki-dilim`). İstek: Ar-Ge lideri (baş lider adına), ≤40 dk. Ölçüt numaraları `oyun-tasarim-belgesi-v1.md` §6.5 (A0-1…A0-18); durumlar `alfa0-kabul-tablosu.md` ve `15-sabah-raporu-2.md` (§4, §6) okunarak yazıldı. Okunmayan ya da ölçülmeyen her şey "(doğrulanmadı)" işaretlidir.

## 1. Öneri (tek paragraf)

**Seçilen dilim: "Üç ilçe, tek oyun": Gemlik ve Körfez'in, bugün oynanan Gebze ile AYNI tam Alfa-0 oyununu (çiftlik, ilk satış, ekmek zinciri, cam → pencere, dükkân) gerçek Karadeniz dünyasında ve gerçek arsa ızgarasıyla oynatması; ilçe başına ölçülmesi.** Yeni mekanik, yeni içerik türü ve yeni kilit yoktur: oyuncunun yerleş ekranında seçtiği ilçe "sınıf" değil açılış seçimidir ("kilit yok, seçim var" aynen korunur: üç ilçede de aynı yapı ve yöntem kümesi açıktır; ilçeleri ayıran yalnız veridir: yerel talep (nüfus: Gebze 414 960, Körfez 183 077, Gemlik 124 400; `veri-hatti/yapilandirma/ilce-nufus.json`, ikincil derleme, doğrulanmadı), arsa sınıfı karışımı ve imza metni). Dilimin işi üç parçadır: (a) sunucunun Alfa-0 dünyasını gerçek harita + üç ilçenin ızgarasıyla açmak (sabah raporu §4.10'da kararlaştırıldı: bugünkü compose sentetik harita ve ızgarasız başlıyor, kartta "henüz açık değil" çıkıyor); (b) Gemlik ve Körfez'de tam akışın (yurt → çiftlik → tahıl satışı → dükkân → ekmek zinciri → pencere) gerçek sunucuda uçtan uca geçtiğini kanıtlamak; (c) ilk davet dalgasının (~20 oyuncu) dağılımını ve her ilçenin ekonomisini (ilk dükkân süresi, geri ödeme) ilçe başına okunur kılmak. Alfa-0 yolundan çıkmaz: bu, ilk gerçek oyuncunun ilk saatinde "seçtiğim ilçede oyun var mı" sorusunun cevabıdır ve davet açılışından önce kapanması gereken tek oynanış boşluğudur.

## 2. Neden bu (gerekçe)

1. **Alfa-0'ın ilk günündeki tek doğrudan oyuncu kırılması budur.** Yerleş ekranı üç ilçe sunuyor, ama belgelenmiş kurulum bugün sunucuyu sentetik haritayla ve ızgarasız açıyor; oyuncu Gemlik ya da Körfez'i seçince kartta "henüz açık değil" görür (sabah raporu §4.10). Yerleş ekranı üç ilçeyi eşit sunduğu için ilk dalganın önemli bir kısmı bu iki ilçeyi seçebilir (oran bilinmiyor; doğrulanmadı); seçen oyuncuda ilk saat kopar.
2. **Kalabalık riskini bu dilim azaltır.** Kâğıtta tek ilçede 23+ oyuncuda geri ödeme 48 saati aşıyor (sabah raporu §4.6; `alfa0-zincir-karlilik.md` k ≥ 3 dükkân satırları). Üç ilçe açıksa ilk dalganın (~20) tek ilçede 23'ü aşma ihtimali yoktur; yalnız Gebze açıksa ilk dalga sınırdadır.
3. **A0 kapısının üç ölçütü ilçe başına kanıt ister:** A0-6 (uçtan uca Playwright, "giriş → Yerleş → hücre al → Tarla kur → tamamlanır → satış görünür"; yalnız Gebze'de koşan senaryo bugün kapıyı kısmen kanıtlar), A0-11 (zincirler ve ilk dükkân/geri ödeme medyanı; ilçe nüfusuna duyarlı) ve A0-9 (kamu arsası reddi; gerçek ızgarada, ilçe başına). Bu dilim üçünü birlikte kapatır.
4. **Yön kaymaz.** Ek içerik ya da kural değişikliği yoktur: çekirdek, `kuralSurumu` ve altınlar dokunulmaz (A0-2 kapıda kendiliğinden korunur). Alfa-0 kapsamı (ekmek + cam → pencere + dükkân) değişmez; süt ve fındık Alfa-0 sonrası kalır.

## 3. Kabul ölçütleri (ölçülebilir; A0 numaralarına bağlı)

| # | Ölçüt | Yöntem | Eşik | A0 bağı | Sahip |
|---|---|---|---|---|---|
| K1 | Üç ilçenin her biri gerçek sunucuda (gerçek Karadeniz haritası + ızgara) yerleşilebilir: kartta "henüz açık değil" yok; katılım, yurt (6 bitişik hücre, ücretsiz), arsa + Çiftlik tek işlem | `f4-uctan-uca` her ilçe için, masaüstü ve mobil | 3 ilçe × 2 görünüm = **6/6 geçer** (bugün: Gebze geçer, Gemlik yerleşme adımı geçti, Körfez ve mobil seti doğrulanmadı) | A0-6 | O1, K1, T2 |
| K2 | Tam akış her ilçede tamamlanır: çiftlik → ilk tahıl satışı → ilk dükkân + raf + ilk dükkân satışı → değirmen + fırın ile ekmek → cam fırını + çelik doğrama ile pencere | bot koşusu, ilçe başına n ≥ 5 bot, 7 sim günü; her zincir için "uçtan uca tamamlandı" sayacı | her ilçede her zincir ≥ 1 bot tarafından **tamamlanır**; çıkmaz mal 0 | A0-11 | O2 |
| K3 | İlk dükkân ve geri ödeme medyanı ilçe başına tutar | aynı koşu; E4 ve E5 (`alfa0-ekonomi-izleme.md`): `ilkSatisT − katılım`, bedel / ek net | ilk dükkân medyan **≤ 36 sa**, geri ödeme medyanı **≤ 48 sa**, n < 5 olan ilçede renk verilmez ("ölçülmedi") | A0-11, A0-12 | O2, A2 |
| K4 | Kamu arsası gerçek ızgarada her ilçede reddedilir ve ≤ 72 / %25 tavanına sayılmaz | özellik testi: `parsel_al` ve `yapi_yerlestir` kamu hücresi; yeniden oynatma | **3/3 ilçe** reddeder, oynatma özeti eşit | A0-9 | K3, K4 |
| K5 | Kilitsizlik ilçe başına: üç ilçede açık yapı, yöntem ve dükkân kademesi kümesi aynıdır; ilçeye bağlı tek ret nedeni fiziksel şarttır (il etiketi, rezerv, boş uygun hücre) | derleme/veri doğrulayıcı testi + her ilçede çiftlik kurulabilirliği (yurt ≥ 6 bitişik hücre, `ova` etiketi; il bazlı etiket (doğrulanmadı)) | sıra/seviye/ilçe şartı **0**; çiftlik 3/3 ilçede kurulur | A0-17 | K3 |
| K6 | 100 bot, üç ilçe, gerçek ızgara: çözüm süresi | O2 yük koşusu (bugün yalnız 20 oyunculu ölçüm var) | tik/çözüm **p95 ≤ 300 ms** (sabah raporu §3: dükkânlı kötü senaryoda 22 ms), raporlu | A0-4 | O2 |
| K7 | İnsan testi: ilk saatte ilk satış, ilçe başına | A1 pilotu (n ≥ 3); en az bir oturum Gemlik'te, bir oturum Körfez'de | ilk satış **≥ %70** (≤ 1 sa), kart atlama ≤ %30 | A0-14 | A1 |
| K8 | Regresyon kalkanı | `pnpm kontrol`, bölge kipi altınları, mülk `durumOzeti` | **yeşil, altın farkı 0** (veri ve kod değişmez) | A0-2 | O1 |

**Gözlem (kabul değil):** ilk dalgada ilçe yerleşim payı; hiçbir ilçe > %60 olmamalı, tek ilçede ≥ 23 oyuncu geri ödeme alarmıdır (E5). Pay > %60 ise öneri kartı "başka ilçe öner" sıralamasını değiştirir (yetki/kilit değil, öneri).

## 4. Riskler ve sınırlar

- Gerçek haritada il bazlı etiket ve rezerv Gebze (Kocaeli) ile Gemlik (Bursa) için aynı olmayabilir; çiftliğin `ova` etiketi şartı ilçe başına doğrulanmalıdır (K5; **doğrulanmadı**: il merkezi etiketleri okunmadı).
- Nüfus verisi ikincil derlemedir ve hukuk teyidi sahip listesindedir (`ilce-nufus.json`); sayılar K3 eşiklerini değiştirmez ama talep tabanını belirler.
- Körfez imzası "sanayi" (rafineri, petrokimya; `alfa0-zincir-karlilik.md` §0 tablosu) bir **öneri** açılışıdır, kilit değildir; oyuncu isterse Körfez'de ekmek zinciri kurar. İçerik ya da kural bu dilimde eklenmez.
- Barındırma (A-2), KVKK metni ve davet listesi sahip kararlarıdır (sabah raporu §5): dilimin K1–K6'sı bunlardan bağımsız yerel/CI ortamında kanıtlanır; K7 davet listesine değil pilot oturumlarına bağlıdır.

## 5. Diğer adaylar (sıra; bir satır)

| Sıra | Aday | Neden bu sırada |
|---|---|---|
| 2 (paralel enstrüman) | Ekonomi metrikleri K2-8…K2-9 + O2-1…O2-3 | Oynanış değil enstrüman; K2-1…K2-7 girdi (bc6087c). Alfa-0 haftasından önce E4/E5/E11 ilçe başına okunmalı: K3'ün ölçüm yolu budur |
| 3 (paralel kanıt) | Kabul tablosundaki ölçülmemiş A0 maddeleri (A0-1, 3, 5, 7, 9, 15, 16, 17) | Çoğunun testi kapıda zaten var (örn. `mulk-kamu`, `yedek-geri-yukle`, `zaman-yayini`, `harita-f4-yetisme`); iş kanıtı A0 numarasına eşlemektir (A0-9, A0-17 bu dilimde ilçe başına kapanır); sahipleri O1/O3 |
| 4 | Süt ve fındık | Baş lider kararıyla Alfa-0 sonrası; A0-11 kapsamı ekmek + cam → pencere; `findik` P1'de çıkmaz-mal uyarısı |
| 5 (tetikli) | Alfa-1 fiyat esnekliği | Ölçüm koşullu. **Onaylı tetik (baş lider; `alfa1-talep-esnekligi.md` 2e4ea27, `alfa0-ekonomi-izleme.md` 28b1537):** E11 pratik alarmı (1,15 payı ≥ %60 ve prim ≥ 1,25) iki ardışık pencerede sürer ve çok rakipli ilçelerde görülürse `fiyatUssu` kararı baş liderdedir; yalnız az rakipli ilçede görülürse değişiklik yok. Canlı veri olmadan ayar yok |
| 6 (tetikli) | Seyrek oyuncu için koşullu yapı emri | A2 kâğıdı uçurum görmüyor (gün 14 servet %81, gün 30 %92; parametre önerisi yok); yeni bir "ben yokken" yetki katmanı "kilit yok" ilkesine yük bindirir; tetik: canlıda gün 14 servet oranı < %80 **(öneri, karar yok: A3 önerisi; onaylı tetik değil)** |
| 7 | Askeri 0b (bayraklı eşkıya) | 0a belgesi kabul edildi; 0b Alfa-0 sonrası, bayrak kapısı A0-18 (AH1/AH2/AH4/H5) kapıdan 3 hafta önce karar ister |

## 6. Sonuç

Bir sonraki dilim "Üç ilçe, tek oyun" olsun: yeni şey eklemeden, bugün oynanan oyunu davet edilen oyuncunun seçebileceği her ilçede çalışır, ölçülür ve kanıtlı hâle getirir (A0-2, A0-4, A0-6, A0-9, A0-11, A0-12, A0-14, A0-17). Yönetilen sapma sıfırdır: kod, veri ve kural sürümü dilimin kendisinde değişmez; yalnız dünya ayarı, kanıt ve ölçüm eklenir.
