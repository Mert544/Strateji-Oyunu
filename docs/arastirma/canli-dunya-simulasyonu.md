# Araştırma — Canlı Dünya Simülasyonu: NPC Nüfus, Esnaf, Olaylar, Haber ve Gerçek Zaman (Sistem Düzeyi Tasarım)

> **Özet.** "Dünya oyuncu yokken de yaşıyor" hissi üç şeyin tutarlılığından doğar: **tek bir gerçek saat ve takvim**, **nüfusa bağlı bir NPC talebi** ve **olgulara dayanan bir anlatı**. Çekirdekte bunların hiçbiri bugün mülk kipinde yoktur: ilçenin nüfusu yok, NPC hane talebi yok, tüketim yok. Bu rapor, bunları **ilçe düzeyinde toplu (agrega), tamsayı, günlük kuantumlu** bir modelle kurar; sunum katmanını (haber, kalabalık, ışık) çekirdekten ayırır; zaman oranını **1:1 ve tek takvim** olarak önerir; NPC'nin mülk sahibi **rakip firma** olmamasını, haberin **şablon + olgu defteri** ile üretilmesini önerir. En pahalı hata, sonradan değiştirilemeyecek **olgu şeması, PRNG akışları, zaman ızgarası ve talep modelinin kimliğidir**; bunlar kodlanmadan önce karara bağlanmalıdır (§10).

| Alan | Değer |
|---|---|
| **Durum** | Ar-Ge önerisi; karar değildir (1 Ekim 2026). Sahip yönü: "Canlı dünya akışı güzel, detaylandırılabilir. Çok oyunculu tek dünya, gerçek zaman akışı." |
| **Ne için** | [12 §5](../12-yon-taslagi.md) "canlı dünya akışı detaylandırılır" işi; [çeşitlilik raporu §8](cesitlilik-yonetim-askeri-teknoloji.md) ve [Capital Rift raporu](capital-rift-mekanikleri.md) üzerine **derinleştirme** |
| **Tekrar edilmeyenler** | Gün-gece/hafta ritmi tablosu, tatil listesi, "Sen yokken" kartı iskeleti, gazete tablosu, toplanma anları, iklim olay kataloğu ([çeşitlilik §8.1–8.5](cesitlilik-yonetim-askeri-teknoloji.md)); NPC müşteri çıpası ([Capital Rift §3–4](capital-rift-mekanikleri.md)). Burada yalnız **nasıl çalıştığı, nereye oturduğu ve nerede kırılacağı** ele alınır |
| **Dayanak (kod)** | `packages/cekirdek/src/{ekonomi/nufus.ts, ekonomi/uretim.ts, pazar/*, tarim/iklim.ts, mulk/isletme.ts, lojistik/cozum.ts, motor.ts, tipler.ts}`, `packages/veri/icerik/parametreler.json`, `packages/veri/src/parsel.ts`, `packages/sunucu/src/saat.ts` |
| **Güvenilirlik** | Web kaynakları §12'de URL ile. Bazı Paradox forum sayfaları ve Fandom sayfaları açılmadı; o oyunlar için arama özetleri kullanıldı ve **(arama özeti)** diye işaretlidir. Tüm sayısal parametreler **öneridir**; ölçülmemiştir. TÜİK ve takvim verileri arama sonuçlarındaki haber özetlerinden alınmıştır; yayından önce birincil kaynaktan doğrulanmalıdır |
| **Kapsam dışı** | Kod, başka belge, commit |

**Dil notu.** "Sezon" kullanılmaz; "iklim takvimi / dönem" kullanılır (K21). Oyun strateji tabanlıdır; hiçbir NPC "karakter ilerlemesi" ya da sınıf taşımaz.

---

## Yönetici özeti (10 madde)

1. **Bulgu: mülk kipinde canlı dünyanın veri katmanı yok.** `IlceDurumu` yalnız `seviye`, `uygunHucre`, `satilmisHucre` taşır; işletme düğümünün nüfusu `0`'dır; sahipsiz harita bölgesi "uyku" hesabına girer (`nufus.ts`: `sahip === null → continue`); mülk kipinde nüfus vergisi ve hane tüketimi hiç işlemez. Tek NPC talebi, **dünya** düzeyindeki sabit `emilimSaat/arzSaat` tablosudur ve oyuncu sayısı arttıkça büyür (`npcLikiditeOlcekPpm`). Yani "NPC müşteri ilçeye girer, rafı boşaltır" bugün çekirdekte yoktur (§1.2).
2. **Üç katman ilkesi:** parayı, stoku, üretimi ya da oyuncu kararını etkileyen her şey **çekirdekte** (deterministik, günlükte); haber metni, özet kartı, bülten, söylenti **sunucu sunum katmanında** (çekirdek durumunu yalnız okur, tohumla yeniden üretilebilir, `durumOzeti`'ni değiştirmez); kalabalık, trafik, ışık, ses **istemcide** (§1.4). Sınama: sunum katmanını kapatınca `durumOzeti` aynı kalmalı.
3. **Zaman: 1:1 ve tek takvim.** Dünyanın bütün takvim türevleri (iklim eğrisi, bayram, okul, gün-gece) gerçek tarihe bağlanır; iklim takvimini hızlandırmak (`gunCarpani = 6`) bayram ve okul olaylarıyla aynı anda "Haziran iklimi + Kasım okulu" çelişkisi doğurur. Q2'nin asıl derdi (30 günde hasat görünmemesi) hızlandırmayla değil **Takvim Önizleme paneli, yıl boyu etkin imza ürünler ve sosyal takvimin sıklığıyla** çözülür (§2.1).
4. **Çekirdek zamanı mutlaktır:** `t = duvar saati − dünya epoch'u`; sunucu kapalıyken dünya durmaz, açılışta yetişir. Bugünkü tasarım ("kapalıyken dünya durur", `sunucu-tasarimi.md` §9.2) takvim tabanlı bir dünyada kalıcı ofset üretir. Ayrıca `t = 0` bir **Türkiye gece yarısına** hizalanmalıdır; yoksa günlük tik gece yarısı değil kurulum saatinde çalışır (§2.2).
5. **Günlük kuantum:** NPC talep oranları günde bir (00:00 TRT, `ilce_gunluk`) güncellenir; saat içi eğri **yalnız sunumdur**. Böylece lojistik çözücü (asıl maliyet) ritimle sürekli kirlenmez. Dünya düzeyi olay açılışları 4 sabit pencerede (08, 12, 17, 20) toplanır; hedef: dünya kaynaklı çözüm tetiği ≤ 6/gün (§2.3, §8).
6. **NPC nüfus modeli:** ilçe başına **tek kohort** + gelir endeksi + 4 ihtiyaç kademesi (Temel, Giyim ve Ev, Hareket ve Teknoloji, Hizmet ve Eğlence); göç komşu ilçeler ve ulusal havuz arasında **çekicilik farkıyla** (Victoria 3 ve Cities: Skylines'tan); tüketim konut kapasitesine göre düzgünleştirilir (Anno). Durum ilçe başına ≈ 40 tamsayı: Türkiye'nin 973 ilçesi için ≈ 0,3 MB; birey ajan gerekmez (§3).
7. **NPC mülk sahibi rakip firma yoktur.** Boş ilçeyi dolduran şey; OSM'deki mevcut yapılaşma, **NPC esnaf** (bakkal, kahvehane, berber; rozetli, talep çıpası) ve **NPC arz agregası**dır. Oyuncu geldikçe çekilen NPC arzıdır; **talep çekilmez** (§4.4). Parsel sahipliği, ilçe payı tavanı (%25) ve "parsel asla el değiştirmez" ilkesi bu kararla korunur.
8. **Olay sistemi "karar fırsatı" sözleşmesiyle çalışır:** her olayın bir ön duyurusu, bir varsayılan (hiçbir şey yapmamak zararsız) ve 2–3 seçenekli bir karar kalıbı vardır; RimWorld tipi bir **anlatıcı** (olay bütçesi, nefes payı, zarar sonrası toparlanma kalkanı) tempoyu yönetir. Ekonomik ve sosyal olaylar kendi PRNG akışlarını kullanır; mevcut `olay` akışı (iklim) bozulmaz (§5).
9. **Haber: olgu defteri + şablon; LLM yalnız çevrimdışı yazım yardımcısı.** Maliyet bağlayıcı değildir (bülten başına ≈ $0,001–0,004; tüm Türkiye için ayda ≈ $27–110, §6.5); **risk** bağlayıcıdır: uydurma, KVKK (takma ad anonimleştirme değildir), enjeksiyon, determinizm. Saklanan şey **olgu**dur, metin değil; böylece ad anma izni geri alınınca arşiv anında anonimleşir (§6).
10. **Geri dönüşü zor 10 karar** (§10): zaman oranı ve mutlak saat; NPC rakip firma; nüfus birimi ve kohort; olgu şeması ve haber yöntemi; para döngüsü (açık kese + sayaç); PRNG akışı listesi; zaman ızgarası; "olay = opt-in karar fırsatı" sözleşmesi; hassas içerik politikası (varsayılan hariç); **talep modelinin kimliği (yerel nüfus talebi)**: arsa fiyat beklentileri buna dayanacağı için Alfa-1 satışından önce kilitlenmelidir.

---

## 1. Çerçeve: bugün ne var, ne eksik, bu rapor ne ekliyor

### 1.1 Kilitli sınırlar (kısa)

| Kaynak | Sınır | Bu rapordaki sonucu |
|---|---|---|
| Sahip (1 Ekim) | Çok oyunculu **tek dünya, gerçek zaman akışı**; strateji, MMORPG değil | §2: tek saat, 1:1 |
| [00 K21](../00-vizyon-ve-kararlar.md) | Dünya sıfırlanmaz, dönem kapanışı yok | Takvim sonsuz çalışır; yıl yıl yeni takvim paketi |
| K13 | Günlük giriş ödülü yok, parayla güç yok | "Sen yokken" kartında ödül yok; olay kaçırmanın cezası yok |
| K29 / "sakin" ilke | Akış çizgisi, parçacık yok | §7: kalabalık ve trafik sade silüettir |
| [11 §7.7–7.8](../11-urun-donusu.md) | H5 korumaları; hareketsizlik 14/45/90 | Olay yağma yapmaz; çevrimdışı adalet (§2.5) |
| [11 §7.10](../11-urun-donusu.md) | "NPC derinliği = max(0, hedef − kayan oyuncu hacmi)" | §4.4: **arz** çekilir, **talep** çekilmez; kodla çelişki §1.2'de |
| [sunucu-tasarimi §9.2](sunucu-tasarimi.md) | "Sunucu kapalıyken dünya durur" (ürün kararı bekliyor) | §2.2: mutlak saat önerilir |

### 1.2 Çekirdek bugün ne yapıyor (kod bulguları)

| # | Bulgu | Kanıt | Sonuç |
|---|---|---|---|
| B1 | Mülk kipinde ilçenin nüfusu, geliri, ihtiyaç karşılanması yoktur | `tipler.ts` `IlceDurumu {id, il, seviye, uygunHucre, satilmisHucre}` | NPC müşteri, göç, memnuniyet için **durum yok** |
| B2 | İşletme düğümü nüfus taşımaz: vergi tabanı 0, hane tüketimi 0, işgücü "tam istihdam" | `mulk/isletme.ts` (`nufus: 0`), `ekonomi/uretim.ts` (`kalanIsci = MAX_SAFE_INTEGER`) | Mülk kipinde **vergi gelirinin kaynağı da yok**; oyuncunun tek geliri NPC pazarına ihracattır |
| B3 | Harita bölgeleri sahipsizdir ve uyur; nüfus büyümesi yalnız sahipli bölgede | `ekonomi/nufus.ts`, `lojistik/cozum.ts` (`bolgeUykuHesapla`) | Mülk kipinde `nufusTik` fiilen hiçbir şey yapmaz |
| B4 | NPC talebi dünya düzeyinde sabit tablodur: `emilimSaat` (örn. gıda 300 birim/sa), `arzSaat` | `parametreler.json` `pazar`, `pazar/piyasa.ts` `npcHacimleri` | Konum ve ilçe ayrımı yok; "konum rekabeti" (Capital Rift dersi) kurulamaz |
| B5 | NPC likiditesi **oyuncu sayısıyla büyür**: `olcek = oyuncu / npcLikiditeTabanOyuncu` (taban 4) | `pazar/tablo.ts` `npcLikiditeOlcekPpm` | 11 §7.10 ("oyuncular likidite sağladıkça NPC çekilir") ile **ters yönlüdür**; fiilen nüfusun yerine konmuş bir vekildir |
| B6 | Ölçek uyumsuzluğu: bir gıda işleme tesisi 160 birim/sa üretir, 6 bin işçi ister; kişi başı gıda tüketimi 0,2 birim/sa/1000 kişi. 100 bin nüfuslu ilçenin tüm gıda talebi 20 birim/sa = **tek tesisin %12'si** | `icerik.json` `standart_gida_isleme`, `parametreler.json` `nufus.tuketim1000Saat` | Gerçek kişi başı tüketimle ilçe talebi anlamsız küçük kalır; **oyun ölçeği çarpanı** gerekir (kalibrasyon sabiti, gerçekçilik değil) |
| B7 | İklim takvimi: `iklim_gunluk` olayı `t = j × GUN / gunCarpani` anında çalışır; 365 günlük sabit yıl; `baslangicGunu = 273` (1 Ekim) | `tarim/iklim.ts` | `t = 0` gerçek gece yarısına hizalı değil; artık yıl yok: tarihe bağlı olaylar (bayram, okul) `gün mod 365` ile aranamaz |
| B8 | PRNG yalnız 4 akış: `ekonomi, pazar, savas, olay`; iklim `olay` akışını kullanır; `Dunya.rng` kaydı özete girer | `tipler.ts` `PrngAkisi` | Yeni olay ailesi `olay` akışından çekerse **iklimin sonuçları kayar**; yeni akış eklemek `Dunya` biçimini ve özeti değiştirir |
| B9 | Doğal nüfus artışı bölge kipinde %0,1/gün, küçülme %0,3/gün (`buyumePpmGun = 1000`, `kuculmePpmGun = 3000`) | `parametreler.json` | Gerçek hızın (TÜİK 2025: binde 5/yıl, [18]) ≈ 70 katı: bölge kipi hızlı sim için ayarlı; ilçe modelinde yeniden tanımlanmalı |
| B10 | Çekirdekte `Date`/`Intl`/transandantal `Math` yasak | `06 §1` | Takvim ve gün-gece **tamsayı tablolarıyla**; güneş açısı gibi kayan nokta yalnız sunumda |
| B11 | Sunucu saati `DuvarSaati`: `simdi = baslangic + (duvar − duvar0) × hiz`; kurtarmada kurtarılan zamandan başlar | `sunucu/src/saat.ts` | Kesintide sim zamanı gerçek zamandan **geriye kalır** |
| B12 | `OyuncuDurumu.ticaretDefteri {toplam, oran, t0}` kalemleri tembel tutuyor | `pazar/tablo.ts`, `lojistik/cozum.ts` | "Sen yokken" gelir farkı **O(1)** hesaplanabilir (§6.3) |

### 1.3 Önceki raporlardan ne değişiyor

| Önceki rapor | Orada | Bu raporda derinleşen |
|---|---|---|
| Çeşitlilik §8.1.1 | NPC müşteri akış eğrisi "günlük toplamı değiştirmez" | **Günlük kuantum** ve çekirdek–sunum ayrımı; çözücü maliyeti hesabı (§2.3) |
| Çeşitlilik §8.3 | "Nüfus: S0 (mevcut)", "Esnaf NPC: görsel ve talep çıpası" | Mevcut olmadığı gösterildi (B1–B3); durum alanları, kademeler, göç formülü, ölçek (§3) |
| Capital Rift §3–4 | NPC müşteri talebi = nüfus × saat × vitrin puanı | Çekim ağırlığı formülü, esnaf payı, rekabet ve çekilme kuralları (§4) |
| Çeşitlilik §8.4 | Haber LLM'siz, ~8 şablon × ~6 varyant | Olgu şeması, nedensellik zinciri, KVKK ve arşiv, AI/şablon maliyet–risk tablosu, çevrimdışı AI-yardımlı yazım (§6) |
| Çeşitlilik §8.1.4 | İklim olay kataloğu | Ekonomik ve sosyal olaylar, anlatıcı, zincir, karar kalıbı, hassasiyet, PRNG yalıtımı (§5) |
| Üretim katmanları Q2 | İklim hızı açık soru | Karar ve gerekçe (§2.1) |
| Sunucu tasarımı §9.2 | Kapalıyken dünya durur (açık konu) | Mutlak saat, kesinti adaleti (§2.2) |

### 1.4 Üç katman ilkesi ve sınır testi

```
 ÇEKİRDEK (deterministik, günlükte, durumOzeti'ne girer)
   nüfus, göç, talep oranları, esnaf kapasitesi, olay etkileri, ihaleler, takvim paketi
        │  emit: Olgu (yan kanal, durumOzeti'ne GİRMEZ, Postgres'e idempotent yazılır)
        ▼
 SUNUCU SUNUM (okur, yazmaz; tohumla yeniden üretilebilir; ayrı worker)
   olgu defteri → bülten/gazete/“Sen yokken” → JSON (CDN'de önbellekli)
        │  kare/delta + statik JSON
        ▼
 İSTEMCİ (görsel; sunucuda durumu yok)
   kalabalık, trafik silueti, açık/kapalı dükkân, gece ışığı, ses
```

| Sınıf | Kural | Örnek |
|---|---|---|
| Çekirdek | Para, stok, üretim, fiyat, oyuncu seçeneği, olayın **etkisi** değişiyorsa | Pazar günü talep çarpanı, kıtlıktan göç, ihale sonucu |
| Sunum (sunucu) | Yalnız **anlatım** ya da **toplama** | Bülten metni, manşet seçimi, "Sen yokken" kartı, çevrimiçi sayacı |
| İstemci | Yalnız **görüntü** | Sokaktaki NPC sayısı, lamba yanması, araç silueti |
| **Sınır testi (CI)** | Sunum ve istemci katmanları kapatılınca (ya da farklı tohumla çalışınca) aynı komut günlüğü **aynı `durumOzeti`**'ni vermeli | `sunum-kapali.test` |
| **Doğruluk sözleşmesi** | Sunum "yalan söylemez": görsel yoğunluk çekirdek değerlerle **sıralı olarak** uyumlu (nüfus ↑ ⇒ kalabalık ↑; kıtlık ⇒ kapalı raf) | `gorsel-tutarlilik.test` |

---

## 2. Gerçek zaman akışı

### 2.1 Zaman oranı: 1:1 mi, hızlandırılmış mı

| Seçenek | Tanım | 30. günde oyuncunun gördüğü iklim ayı | Takvim tutarlılığı | Kural karmaşıklığı | Geri dönüş |
|---|---|---|---|---|---|
| **A: 1:1, tek takvim (öneri)** | Her şey gerçek tarih; `gunCarpani = 1` | 1 (Ekim → Kasım) | Tam: iklim, bayram, okul, gün-gece aynı gün | Düşük | Orta |
| B: iklim ×6 (Q2-B) | İklim takvimi 6× hızlı, geri kalan 1:1 | ≈ 6 (Ekim → Mart) | **Kırık:** Ekim'de okul açılışı ile Mart iklimi aynı anda | İki takvim; olay süreleri ve ön duyuru ayrışır (`takvimMs`) | Zor |
| C: tüm dünya hızlı | 1 gün = N saat | Yıl birkaç haftada | Tutarsız: gerçek bayramlarla eşleşme **imkânsız** | Tüm süre ve dengeler yeniden yazılır | Çok zor |

**Öneri: A.** Gerekçeler:

1. **Gerçek takvim eşlemesi sahibin canlılık vaadinin kendisidir** ("bu hafta pazar salı", bayram alışverişi). İklimi hızlandırmak bu eşlemeyi yalnız iklim için bozar; çelişki canlılık hissini öldürür (ekranda kar yağarken NPC "yaz tatili" kutlar).
2. **Paylaşılan tek dünya:** herkes aynı Kasım'dadır. Hızlı takvim, aynı hafta içinde farklı dönemlerin ritmini herkese dayatır ve olay sıklığını (ön duyuru, kapanış) 6× artırır.
3. Referanslar ikiye ayrılır: **Animal Crossing** gerçek saatle çalışır ve dükkân saatleri, mevsim etkinlikleri buna bağlıdır; hile yolu da istemci saatini oynatmaktır [10]. Biz saati **sunucudan** alırız (`t`'yi sunucu basar). **Stardew** 28 günlük sıkıştırılmış mevsim kullanır [11], ama tek oyunculu ve paylaşımsızdır; sabit takvim günlerinin tadı oradadır, sıkıştırma bizim paylaşılan dünyamıza taşınmaz. **Eco** dünyayı 24/7 gerçek zamanda çalıştırır [12].
4. B ve C **geri alınamaz**: bozulma ve inşa süreleri saat bazlı; dünya yıllar boyu sürer (K21).

**Q2'nin asıl derdini (30 günde hasat görünmemesi) A içinde çözmek:**

| Önlem | Etki | Maliyet |
|---|---|---|
| **Takvim Önizleme paneli:** 12 aylık şerit (hasat penceresi, bayram, okul, düğün sezonu, kış hazırlığı); her ürün için "sonraki tepe: 142 gün" | Oyuncu **gelecek dönem için** bugün karar verir (depo, bahçe dikimi, çeşit); 30 günde bile "uzun ufuk" kararı vardır | S (sunum + paket verisi) |
| Her ilde **yıl boyu etkin imza ürün** + ürün `yogunlukPpm` 0,1–0,3 ([üretim katmanları §4.5](cesitlilik-uretim-katmanlari.md)) | Hasat dönemi dışında da akış vardır | S (veri) |
| **Sosyal takvimin sıklığı:** okul, bayram, ara tatil, düğün sezonu, kış hazırlığı iklimden çok daha sık değişir (§5.2) | İlk ayda 4–6 ayrı ritim yaşanır | M |
| Ölçüm takımı `gunCarpani = 12` ile koşmaya devam eder | Hasat dinamikleri hızlı testte doğrulanır; üretim 1'dir | Var |
| İleride isteğe bağlı **"Hızlı Dünya"** ayrı bir dünya olarak (sahip kararı) | Yerinde hız değişimi değil, ayrı örnek | L (sonra) |

### 2.2 Tek saat: mutlak duvar saati, Türkiye saati, hizalama

| Konu | Bugün | Öneri | Gerekçe |
|---|---|---|---|
| Saat dilimi | Belgelerde Europe/Istanbul | **Çekirdekte sabit +03:00 ofset** ([Türkiye kalıcı UTC+3, 2016/9154 sayılı karar](https://tr.wikipedia.org/wiki/T%C3%BCrkiye'de_yaz_saati_uygulamas%C4%B1) [26]); `Intl`/`Date` yok | Çekirdekte `Date` yasak; DST olmadığı için gün sınırı `(t + 3 sa) mod 24 sa`. Balkan genişlemesinde ülke başına ofset tablosu takvim paketinde |
| `t = 0` | Kurulum anı; `baslangicGunu = 273` | `dunyaEpochMs` parametresi: **2026-09-30T21:00Z = 1 Ekim 2026 00:00 TRT** (alfa açılışından önceki bir gece yarısı) | Aksi halde `iklim_gunluk` ve `ilce_gunluk` kurulum saatinde çalışır (B7); "00:00 bülten kapanışı" anlamsızlaşır |
| Tarih hesabı | `gün mod 365` (artık yıl yok) | **Epoch gününden tamsayı sivil tarih**: `(yıl, ay, gün)` ve `haftaGünü = (epochGünü + 4) mod 7` (1 Ocak 1970 Perşembe); iklim eğrisi eski 365 günlük yıl indeksini korur | 2028 artık yılında bayram, okul, tatil aramaları kaymasın; hasat eğrisi 1 gün kaymasa da yavaş sürüklenir (zararsız) |
| Sim zamanı | Birikimli, kesintide durur (`saat.ts`, `sunucu-tasarimi` §9.2) | **Mutlak:** `t = duvar − epoch`; açılışta `calistirKadar(şimdi)` (tur başına en çok +6 sa, mevcut sınır) | Aksi halde her kesinti kalıcı ofset bırakır; takvim paketi (bayram) gerçek tarihten ayrılır. Tembel stok sayesinde yetişme ucuzdur; asıl iş saatlik tik ve olaylardır |
| Planlı bakım | — | **04:00–05:00 TRT** penceresi | En düşük etkinlik (tahmin; ölçülecek) |
| Kesinti adaleti | — | Kesinti > 15 dk ise **rastgele olumsuz olayların ön duyuru→etki geçişi kesinti kadar ötelenir**; takvim olayları (bayram, okul) ötelenmez. Komut kabul edilmediği için kimse bu sürede adaletsiz hareket etmiş sayılmaz | Oyuncu görmediği ön duyurunun cezasını çekmesin |
| Güvenilir saat | İstemci saati | İstemci saati yalnız tanı; `zamanIste` ile NTP benzeri eşitleme (var) | Animal Crossing'in saat oynama sorunu [10] |

### 2.3 Zaman ızgarası: günlük kuantum ve olay pencereleri

**İlke.** Çekirdeğin pahalı yeri lojistik çözücüdür (1k oyuncuda çözüm başına 35 ms, günde ≈ 140–250 çözüm; `06 §15`). NPC talebini saatlik değiştirmek, günde 24 ek `kirlet` demektir. Bu yüzden:

| Zaman (TRT) | Çekirdek olayı | Ne yapar | Kirletme |
|---|---|---|---|
| Her saat | `saatlik_tik` (var) | Mevcut işler; **NPC talebine dokunmaz** | Mevcut |
| 00:00 | `iklim_gunluk` (var) + `ilce_gunluk` (yeni) | Nüfus, göç, memnuniyet, esnaf kapasitesi, talep oranları (takvim × hafta × olay çarpanı), ihale kapanışı; **olgu** yaz | **1** |
| 08:00, 12:00, 17:00, 20:00 | `dunya_olay_penceresi` (yeni) | Ön duyurusu dolmuş olayların **etki başlangıcı** ve bitenlerin kapanışı | ≤ 4 |
| Pazartesi 00:00 | Haftalık işler | İhale ilanı yenileme, arazi vergisi muhasebesi (tembel; yalnız defter) | 0 (aynı 00:00'ın içinde) |

Sonuç: dünya kaynaklı çözüm tetiği **≤ 5–6/gün**. Saat içi eğri (öğleden sonra kalabalık, gece sakin) çekirdeğe girmez; istemci ve sunucu sunumu tabloyla çizer. Günlük kuantumun bedeli: gece yarısında talep sıçraması; **kelepçe** (bir günde en çok ±%15) ve tüm değişikliklerin ≥ 24 sa önceden bilinmesi (takvim deterministik) bu sıçramayı bilgi asimetrisinden arındırır.

### 2.4 Günlük ritim (Türkiye saati): çekirdek ve sunum ayrımı

[Çeşitlilik §8.1.1](cesitlilik-yonetim-askeri-teknoloji.md) ritim çizelgesini verdi; burada hangi ritmin nerede yaşadığı:

| Ritim | Katman | Not |
|---|---|---|
| Gün sınırı 00:00 | Çekirdek | Günlük defter kapanışı; olgu üretimi |
| Pazar günü, hafta sonu, bayram tatili çarpanları | Çekirdek (gün düzeyi) | Pazar günü 07–17 ×1,25 penceresi, günlük toplamda yaklaşık **×1,10** olarak çekirdeğe girer; saat içi dağılım sunumdur |
| Esnaf açık/kapalı saatleri | Sunum + istemci | Çekirdekte yalnız **günlük kapasite** (kapalı gün: 0) |
| Gün–gece, lamba | İstemci | Güneş doğuş/batışı kayan noktalı hesap; çekirdek dışı |
| 06:00 bülten, Pazar 09:00 gazete | Sunum | Girdi: 00:00'da kapanan olgu defteri |
| 20:00–22:00 akşam penceresi | Sunum + (açık artırma: çekirdek komutu) | Birinci-gelen yarışı **yalnız** açıkça ilan edilmiş pencerede |
| Olay açılış saatleri | Çekirdek | Yalnız 08:00–22:00 TRT (uyanık saatler) |

### 2.5 Çevrimdışı oyuncu adaleti

Bugün var olanlar: H5 yağma tavanı, kalkan 14 gün, depo tavanı, hareketsizlik 14/45/90 ve tatil modu 30 gün/yıl ([11 §7.7–7.8](../11-urun-donusu.md)). Bu rapor **canlı dünya kaynaklı** adalet sorunlarını ekler:

| # | Risk | Mekanizma | Durum |
|---|---|---|---|
| F1 | Olay gece yarısı çevrimdışı oyuncuyu vurur | Olay açılışı 08:00–22:00; ≥ 24 sa ön duyuru; olay **yağma yapmaz**, gelir/zamanlama değiştirir | Ön duyuru var; saat penceresi **yeni** |
| F2 | 24/7 oyuncu olayı kaçırmaz, diğeri kaçırır | **Genel Talimat** (en çok 5 kalıcı kural: "stok < X ise ithal et", "don öncesi depo doldur", "fiyat bandı") çevrimdışı çalışır | Yeni; Anno/EVE emir mantığı |
| F3 | Çevrimiçi olan tezgâh daha çok müşteri alır | NPC müşteri çekimi **çevrimiçilikten bağımsızdır** (§4.1 formülünde yok); satış otomatik | Yeni kural |
| F4 | Yarış avantajı | Birinci-gelen yarışı yok; istisna: 20:00 açık artırma (sunucu zaman damgası, 1 alım/gece, yeni oyuncu 10 dk önceliği) | [Çeşitlilik §8.5](cesitlilik-yonetim-askeri-teknoloji.md) |
| F5 | Kesinti (bakım) adaletsizliği | §2.2 ötelenme | Yeni |
| F6 | Takvim talebi kaçıran kayıp yaşar | Satış tembel orandır; talep ±%15 kelepçeli; "kasiyer" ya da Genel Talimat | Var/yeni |
| F7 | Uzun yokluk sonrası "dünyayı yeniden öğren" | 14 gün sonra uyku kartı (3 kart) | [Çeşitlilik §8.2](cesitlilik-yonetim-askeri-teknoloji.md) |
| F8 | Zaman dilimi (Avrupa'daki oyuncu TRT−1/−2) | Tek TRT; pencereler 20:00–22:00 (Avrupa'da 18:00–21:00 yerel) | Kabul |

**Ölçüt (H-C5).** 24 sa çevrimdışı kalan botun **olay kaynaklı** net kaybı, günlük gelirinin ≤ %3'ü; 24/7 çevrimiçi bot ile fark ≤ %5 (bot arketipleriyle koşulur).

---

## 3. NPC nüfus modeli

### 3.1 Birim ve kohort

| Seçenek | Durum sayısı (Türkiye) | Ne verir | Ne yitirir | Öneri |
|---|---|---|---|---|
| Birey ajan | 86 milyon | Gerçek hikâye | Çekirdekte imkânsız; S3 "kaçınılır" | Hayır |
| Mahalle düzeyi | ≈ 32 bin mahalle (+köy) | Muhtarlık ile birebir | Durum 33×; oyun kararı vermez | Hayır (**sunum bölümü** olarak) |
| **İlçe düzeyi, tek kohort (öneri)** | **973 ilçe** (Alfa-0: 45; Bursa 17, Kocaeli 12, Sakarya 16 [30]) | Ucuz, tamsayı, kimlikli | Sınıf eşitsizliği yok | **Evet** |
| İlçe × 3 gelir sınıfı | 2 900 | Gelire göre farklı sepet | 3× durum, 3× kalibrasyon | Alan yeri bırak (`kohort[]` sürümlü uzantı) |

Mahalle, **yalnız sunumdur**: ilçe nüfusunun sabit paylara bölünmüş hâli (TÜİK ADNKS mahalle nüfusu [18]) muhtarlık seçimi ve tabela için; çekirdekte durum taşımaz. Alfa-0 nüfusu: Bursa 3.263.011 + Kocaeli 2.161.171 + Sakarya 1.123.693 = **6.547.875** [18]; ilçe başı ortalama ≈ 145 bin.

### 3.2 İlçe durum alanları (çekirdek, hepsi tamsayı)

| Alan | Birim | Başlangıç | Güncelleme |
|---|---|---|---|
| `nufus` | kişi | TÜİK ADNKS / WorldPop ([08 §6.5](../08-alti-katman.md)) | Günlük (göç + doğal artış) |
| `nufusEma` | kişi | = `nufus` | Günlük, 14 günlük üssel ortalama; **talep bunu kullanır** |
| `konutKapasite` | kişi | `nufus × 1,05` | Konut yapısı, imece, yavaş NPC inşaat (günde ≤ %0,02, doluluk > %97 ise) |
| `gelirEndeksi` | ppm (1,0 = ulusal ortanca) | Sınıfa göre: kırsal 0,75; kasaba 0,95; şehir 1,15 (öneri) | Günlük: `G0 × (0,8 + 0,4 × istihdamOrani)` |
| `karsilanma[4]` | ppm | PPM | Günlük (lojistik çözümünden; mevcut `gidaKarsilanmaPpm` genellemesi) |
| `memnuniyet` | ppm | 0,6 × PPM | Günlük; 7 günlük ortalama |
| `istihdamOrani`, `issizlik` | ppm | Sınıfa göre | Günlük (oyuncu tesis işçisi ÷ işgücü) |
| `gocBakiyesi` | kişi/hafta | 0 | Günlük |
| `esnafKapasite[tür]` | gün-birimi | Yoğunluk × nüfus | Günlük; çekilme kuralı §4.4 |
| `olayBayraklari` | bit | 0 | Olay açma/kapama |

≈ 40 tamsayı × 973 ilçe ≈ 0,3 MB: anlık görüntüye ihmal edilebilir.

### 3.3 İhtiyaç kademeleri

Anno'da temel ihtiyaçlar evleri doldurur, lüks ihtiyaçlar katman atlatır; tüketim **evin azami kapasitesine göre** hesaplanır, mevcut sakin sayısına göre değil [4]. Victoria 3'te her pop ücretini, karşılayabildiği en yüksek yaşam standardını veren mal kümesine harcar; yaşam standardı doğum/ölüm oranını ve sadakati belirler [1][2]. İkisinin sade melezi:

| Kademe | Kapsam | Mallar | TÜİK 2024 pay referansı [20] | Açılış koşulu | Memnuniyet ağırlığı |
|---|---|---|---|---|---|
| **K1 Temel** | Gıda, ısınma, aydınlatma | `gida`, `yakit`, `elektrik` | Gıda ve alkolsüz içecek %18,1 | Her zaman | 0,50 |
| **K2 Giyim ve Ev** | Giyim, ev eşyası, onarım | `tekstil` (planlı, A0-ops; yoksa `parca`, `celik`) | Giyim ve ayakkabı %5,1 | K1 karşılanma ≥ %90 | 0,25 |
| **K3 Hareket ve Teknoloji** | Ulaşım, araç bakımı, elektronik | `yakit`, `parca`, `elektronik` | Ulaştırma %21,6 | K2 ≥ %80 ve `gelirEndeksi` ≥ 0,85 | 0,15 |
| **K4 Hizmet ve Eğlence** | Esnaf hizmeti, sağlık/eğitim binası, meydan, çay ocağı | **Mal değil:** ortak proje ve kamu yapısı kapasitesi | Eğlence, spor, kültür %2,3 | K3 ≥ %70 | 0,10 |
| (Konut) | Barınma | `konutKapasite` (yapı) | Konut ve kira %26,0 | — | Çekicilik formülünde ceza |

- **Giyim ve eğlence** bizde mal değil **kapasite**dir: ev eşyası ve giyim tekstil zincirine bağlanır (tekstil [üretim katmanları S-Z7](cesitlilik-uretim-katmanlari.md) ile gelir; gelene kadar K2 `parca` ve `celik` sepetiyle kurulur); **K4 oyuncuya imece ve muhtarlık üzerinden dokunur** (okul, pazar çatısı, sağlık noktası): ortak projeler canlı dünyanın "lüks ihtiyacı" olur ve nüfus çekicilik farkına dönüşür. Bu, [imece imzasına](oyun-kimligi-harman.md) stratejik bir sonuç verir.
- **Konut** %26'lık en büyük gider kalemidir ama mal akışı değildir; modelde **kapasite ve doluluk** olarak yaşar ([11 §7.3](../11-urun-donusu.md) "Konut: +nüfus tavanı"). Doluluk > %97 ise çekicilik cezası ve konut talebi (`celik`, `parca`) doğar.
- **Engel yasası.** Kademe payları gelire göre değişir: gelir arttıkça K1 payı küçülür (3 noktalı doğrusal tablo: `gelirEndeksi` 0,6 / 1,0 / 1,4).
- **İlçe gelişim seviyesi (Köy → Şehir) buna bağlanmalıdır.** [11 §7.4](../11-urun-donusu.md) "Kasaba: nüfus 5.000 ve ≥ 10 sahip" der; Alfa-0 ilçelerinin ortalama nüfusu ≈ 145 bin, yani eşik ilk günden aşılmıştır. Öneri: seviye = **açık ihtiyaç kademesi** (Köy: K1; Kasaba: K2; Merkez: K3; Şehir: K4 yeterli) + sahip sayısı. Bu, Anno'nun "evler dolunca katman atlar" modelidir [4].
- **Talep yumuşatma.** Talep `nufusEma`'ya (14 gün) dayanır; göç dalgası fiyatı sallamasın (Anno'nun kapasite ilkesinin karşılığı).

### 3.4 Gelir ve harcama: açık kese + sayaç

Her ilçe için hane harcaması **mal talebi**dir; NPC'nin "parası" modellenmez.

```
Q[i,m] = nufusEma[i]/1000 · tuketim1000Saat[m] · yerelOlcek · Pay_k(m)(G_i) · R[i,d] · (fiyat/ref)^(−η_k)
R[i,d] = takvim · haftaGunu · olay çarpanlarının çarpımı ,  [0,6 ; 1,5] aralığına kelepçeli
η_k   : K1 0,3 · K2 0,8 · K3 0,8 (yakıt 0,4) · K4 1,2          (öneri)
```

- **Para yönü:** NPC alımı oyuncu hazinesine para **yazar** (faucet). Bu mevcut NPC piyasa yapıcının yerel hâlidir; kapalı hane-geliri döngüsü kurulmaz (§10, karar 5). Ama EVE'nin dersi uygulanır: faucet **ölçülür** ve haftalık dünya raporuna girer [7]; EVE'de ödül faucet'ı CCP'nin Aylık Ekonomi Raporu'nda izlenir ve sistem etkinliğine göre kayan bir çarpanla (günler–haftalar) yavaşça ayarlanır [7].
- **Sönümleyici:** fiyat esnekliği (yüksek fiyat → hacim düşer) ve oyuncu satışı artınca **yerel fiyat** düşer (§4.1); ek bir EVE tipi çarpan **gerekmez**.
- **Ölçek (B6):** `yerelOlcek` oyun sabitidir. Kalibrasyon hedefi: Alfa-0 ortalama ilçesinde (≈ 4–5 oyuncu) toplam NPC talebi, ilçedeki oyuncu perakende arz potansiyelinin **%60–120'si** olsun. İlk tahmin: kişi başı değerlerin **40–60 katı** (100 bin nüfuslu ilçede gıda ≈ 800–1200 birim/sa ≈ 5–7 gıda tesisi). Ölçümle ayarlanır; geri dönüşü kolay parametre.

### 3.5 Göç (ilçeler arası, köy–kent)

Victoria 3'te her eyaletin göç çekicilik skoru vardır; insanlar düşük yaşam standardı ve iş yokluğundan yüksek standart ve iş olan yere akar [1][3 (arama özeti)]. Cities: Skylines'ta işsizlik konut talebini, konut talebi işyeri talebini doğurur; **"sıfır talep" sağlıklıdır** [8]. Bizde:

```
A[i]  = 0,35·memnuniyet[i] + 0,25·istihdamFirsati[i] + 0,20·gelirNorm[i] + 0,10·kentCekimi[i] − 0,10·konutBaskisi[i]       (0..PPM)
akis(i←j) = clamp( gocKatsayisi · (A[i] − A[j]) · min(nufus[i], nufus[j]) / PPM ,  ± günlükTavan ),   yalnız |A[i] − A[j]| > ölüBant
```

| Öğe | Değer (öneri) | Neden |
|---|---|---|
| Çiftler | Komşu ilçeler (≤ 8) + **ulusal havuz** (sabit çekicilik 0,5; kaynak/lavabo) | O(ilçe × komşu); korunum: havuz dışı toplam nüfus korunur |
| `gocKatsayisi` | ΔA = 0,05 için ≈ %0,025/gün | Gerçek referans: iller arası göç oranı 2025'te **%2,87** (yıllık brüt); Antalya net hızı **binde 10,3**/yıl ≈ **28 ppm/gün** [19]. Oyun ≈ 10× hızlıdır ki "bu hafta +120 / −40" tabelası görünsün; ayrı bir **göç çarpanı**dır, zaman hızı değil |
| `günlükTavan` | %0,15 | Tek günde sıçrama olmasın |
| `ölüBant` | 0,05 | Histerezis; gürültü göçü yok |
| Köy–kent | `kentCekimi`: şehir sınıfı +, kırsal 0; **ama** konut baskısı kenti caydırır | TÜİK 2025'te İstanbul net **veren** il oldu (371 bin verdi, 330 bin aldı) [19]; "kent hep çeker" varsayımı yanlıştır; skor her iki yönü doğurur |
| Nüfus tabanı/tavanı | Taban başlangıcın %60'ı; tavan `konutKapasite` | Ölüm spirali koruması (kıtlık → göç → talep kaybı → ...) |
| Doğal artış | Gerçek hız (binde 5/yıl ≈ 14 ppm/gün) | B9: bölge kipi parametresi 70× hızlı; ilçe kipinde gerçek |

**Oyuncu etkisi (karar bağı).** Oyuncu tesis açarsa `istihdamFirsati` yükselir (ilçenin "en büyük işvereni" unvanı gerçek bir etki taşır); kıtlık `memnuniyet`'i düşürür; imece K4'ü yükseltir. Hiçbiri doğrudan "nüfus ver" düğmesi değildir.

### 3.6 İşgücü havuzu

Bugün mülk kipinde işgücü "tam istihdam" sayılır (B2). Öneri: `isGucu = nufusEma × isgucuPpm` (mevcut %50); ilçedeki tüm oyuncu tesislerinin işçi talebi toplamı `istihdamOrani`'nı verir.

| `istihdamOrani` | Etki | Bağ |
|---|---|---|
| ≤ %70 | Serbest; işsizlik göç çıkışına ve grev eşiğine gider | `issizlik` |
| %70–85 | Normal | — |
| > %85 | **Doygunluk:** yeni tesisin işgücü karşılanma oranı düşer (mevcut `isciPpm` zinciri); ücret baskısı = tesis işletme gideri +%x | Azalan getiri ([çeşitlilik §10](cesitlilik-yonetim-askeri-teknoloji.md)); çekirdekte `isciPpm` zaten var |

Grev kuralı mevcut: istikrar ≥ %60 iken grev yok. İşgücü doygunluğu "ilçeye ikinci fabrika açmak" kararını gerçek bir bedele bağlar: öteki ilçeye açmak, komşu işgücüne uzanmak (yürüyüş mesafeli komşu ilçelerden günlük **işgücü yayılımı**, A1).

### 3.7 Mevcut çekirdekle bağlantı

| Mevcut öğe | Değişim | Risk |
|---|---|---|
| `nufusTik` (bölge kipi) | **Korunur**; ilçe modeli mülk kipi içindir. `tuketim1000Saat` tablosuna kademe payları veri olarak eklenir | Altın özetler aynı kalır (bayrakla) |
| `IlceDurumu` | §3.2 alanları eklenir (`IlceDurumu` zaten serileştiricide) | Şema sürümü +1; göç betiği |
| `ilce_gunluk` olayı | Yeni olay türü (`Olay` birliğine); `iklim_gunluk` ile aynı anda | Olay sırası `(t, öncelik, sıra)`; öncelik tanımlanmalı |
| Yerel talep → pazar | §4.1: ilçe kanalı; `pazarEmirleriniGerceklestir` `hacim`'i **ilçe başına** ayrı paylaştırır | `paylastir` mantığı yeniden kullanılır |
| `npcLikiditeOlcekPpm` (B5) | Yerel kanal devreye girince **ihracat kanalı** oyuncu sayısından bağımsız sabit tabana döner; ölçek kaldırılır | **Çift sayım** olmaması için aynı sürümde |
| Kıtlık cezası (P4, bölge başına) | Mülk kipinde `karsilanma[]` ilçeyi besler; oyuncuya **doğrudan çıktı cezası yok**, ceza dolaylı (göç, grev) | Mevcut ölçüm altınları etkilenmez (bölge kipi) |
| Vergi (`vergiTabani1000Saat`) | İlçe nüfus vergisi il hazinesine ([11 §7.6](../11-urun-donusu.md)); **B4 Devlet'e bağlıdır** | Bağımlılık |
| Arazi vergisi | Bugün saf lavabo; ilçe hazinesine yönlendirilirse **kapalı kamu döngüsü** (§4.5) | B4'e bağlı |

### 3.8 Maliyet ve determinizm

| Konu | Değer |
|---|---|
| Günlük iş | O(ilçe × (kademe × mal + komşu)) ≈ 973 × ~80 ≈ 80 bin işlem; 1 olay |
| Durum | ≈ 0,3 MB (Türkiye) |
| Rastgelelik | **Yok** (göç, talep, nüfus saf formül). Gürültü yalnız sunumda |
| Yeniden oynatma | Aynı günlük + aynı veri → aynı sonuç; `ilce_gunluk` içinde ilçeler **kimlik sırasıyla** gezilir (nesne anahtarı sıralaması kuralı) |
| Taşma | `carpBol` (BigInt yedekli), ppm tamsayı |

---

## 4. NPC ekonomik aktörler

### 4.1 Yerel pazar kanalı: NPC müşteri nasıl çekilir

Capital Rift'te dükkânlara NPC müşteriler girip raflardan alır; arz oyuncudan, talebin tabanı NPC'dendir [Capital Rift raporu §1]. Bizde bu **ilçe düzeyinde bir pazar kanalıdır**:

| Kanal | Alıcı | Fiyat | Hacim | Prim |
|---|---|---|---|---|
| **Dünya pazarı** (mevcut) | NPC piyasa yapıcı | Referans ± makas, liman primi | `emilimSaat` (sabit) | Liman primi + komisyon |
| **Yerel pazar** (yeni) | İlçe hanesi + esnaf | Yerel fiyat = referans × `[0,7 ; 1,4]` bandında, talep/arz oranından | `Q[i,m]` (§3.4) | **Yok** (liman gerekmez); yalnız satış noktası gerekir (Ticaret ofisi/tezgâh) |

**Çekim ağırlığı** (ilçede satış noktası `j`, mal `m`):

```
w[j] = (ref / fiyat[j])^2  ·  (1 + 0,25·çeşitlilik[j])  ·  bakım[j]  ·  vitrin[j]   (vitrin ≤ +%10)
pay[j] = w[j] / (Σ w + w_esnaf);   satış[j] = min( Q · pay[j] , arz[j] );  artan talep kalan noktalara taşar
```

- **Unvan, tabela ve başarım müşteri çekimini etkilemez** (çeşitlilik §8.1.2 kuralı) ve **çevrimiçilik de etkilemez** (F3).
- Ağırlıklar **yalnız fiyat/emir/bakım değişince** yeniden hesaplanır (komut anı + günlük kuantum); nokta sırası `(oyuncu kimliği, düğüm)`; mevcut `paylastir` ile aynı su-doldurma yöntemi.
- Satış, `ihracat` emri gibi tembel orandır: **oyuncu orada olmak zorunda değildir.**

### 4.2 Esnaf: arka plan dükkânlar

Esnaf tek tek ajan değil, **tür başına kapasite ve görünüm sayısıdır**: ilçe nüfusu × tür yoğunluğu.

| Tür | Yoğunluk (öneri) | Çekirdekteki işlev | Sunumdaki işlev |
|---|---|---|---|
| Bakkal / market | ≈ 1,9 / 1000 kişi (TESK: bakkal sayısı ≈ 162 bin, 86 milyon nüfusa oran [29][18]; yıl belirtilmemiş haber) | K1 perakende payının **tabanı**; `w_esnaf` (fiyat = ref × 1,12) | Açık/kapalı, tabela |
| Fırın, kasap, manav | Gıdanın alt kalemi | K1 çeşitliliği (`çeşitlilik` çarpanı) | Sokak dokusu |
| **Kahvehane / çay ocağı** | Mahalle başına 1 | K4 kapasitesi; **söylenti panosu** ([imza İ-4](oyun-kimligi-harman.md)) | Oturma, çay bardağı simgesi |
| Berber, tamirci, kırtasiye | Mahalle başına | K4 hizmet kapasitesi; **okul açılışında kırtasiye +** | Görsel |

- **Esnaf çekilmez ama küçülür:** esnaf payı `max(%25, hedef − oyuncu payı)`; "mahalle bakkalı hiç kapanmaz" hem kültürel hem de mekanik tabandır ([11 §7.10](../11-urun-donusu.md) ilkesinin esnafa uyarlaması).
- **Fiyat tavanı:** esnaf fiyatı referans +%12; oyuncu altından satarak pay alır (rekabet).
- **İstismar:** pompala-boşalt ile esnaf payını sıfırlamak; önlem: 14 günlük kayan pencere (EVE'nin dinamik ödül çarpanı da günler-haftalarda hareket eder [7]), taban %25, yerel fiyat bandı, tek oyuncunun ilçede >%60 pay alması halinde esnaf **indirim kampanyası** (otomatik). *(güncellendi: perakende-kademeleri §9.3: >%60 eşiği kademeli pay tavanıyla birlikte %75 önerisi)*
- Kalabalık sınırı: görünür esnaf ≤ 30 sprite/ilgi alanı ([Capital Rift Ç3](capital-rift-mekanikleri.md)).

### 4.3 NPC tüccar tipleri

| Tip | Ne zaman | Kural | İstismar önlemi |
|---|---|---|---|
| **Gezgin tüccar** (var) | İlçe başına haftada bir (tohumlu gün) | Takas teklifi, nadir mal; fiyat piyasa referanslı | Haftalık tek; NPC rozeti |
| **Hal toptancısı** | Her gün, ilçe merkezi | Büyük partiyi **toptan** alır (hacim çarpanı, fiyat −%8); hal fiyatı referans | Günlük tavan; yerel pazarı doldurmaz |
| **Fuar alıcı heyeti** | Fuar günü | İmza ürün kalite eşiği ölçümle, toplu sipariş ([oyun kimliği §3.5](oyun-kimligi-harman.md)) | Stand başına 1/hesap |
| **Kamu alım kurumu** (taban fiyat) | Hasat dönemi, hububat ve benzeri | **Taban fiyat** alıcısı (kamu politikası); il yasa kartıyla açılır | Kota; **fiyat çıpası**, faucet tavanı |
| **Kervan/komisyoncu** | Sürekli, yalnız bilgi | Spot arbitraj **yok** (ithalat ≥ referans ≥ ihracat zaten garantili, `pazar-arbitraj` testi) | — |

### 4.4 NPC rakip firma var mı

Bu **geri dönüşü zor** bir karardır (§10, karar 2).

| Seçenek | Artı | Eksi | Sonuç |
|---|---|---|---|
| **A: NPC mülk sahibi firma** (hesap/parsel/yapı sahibi) | "Dolu dünya", ölçek hissi | Parsel arzını yer; ilçe payı tavanı (%25) ve ilk gelen avantajı bozulur; ayrı bir bot programı (üretim kalitesinde); **gerçek oyuncular için sahte rakip** (Capital Rift'te de talep NPC'dir, **rakip** oyuncudur); günlükte `npc:*` hesapları; sonradan **kaldırmak** parsel el değiştirmesidir ("parsel asla el değiştirmez") | **Hayır** |
| **B: Yalnız NPC arz agregası + esnaf (öneri)** | Mülkiyet temiz; `kaynak: "npc"` rozetli; arz **çekilir** | "Rakip yüz" yok | **Evet** |
| C: Görsel NPC bina (satın alınamaz) | OSM'deki yapılaşma zaten var | — | **Evet** (sunum) |

**Çekilme kuralı (B):**

```
npcArzPayi[i,m]  =  max( taban_m , hedef_m − oyuncuPayi14g[i,m] )      // oyuncu payı 14 günlük kayan ortalama, EMA
```

- **Talep çekilmez** (nüfus tüketimidir); yalnız esnaf/NPC arzı çekilir. Hem [11 §7.10](../11-urun-donusu.md) hem [çeşitlilik §8.3](cesitlilik-yonetim-askeri-teknoloji.md) bunu zaten söylüyordu; B5 bulgusu (kodda NPC likiditesi oyuncuyla **büyür**) bununla düzelir.
- **Boş ilçeyi doldurma:** oyuncu yokken ilçede yalnız esnaf arzı vardır; ürünler referans +%12'dir. "Dolu" hissi esnaf, OSM yapıları ve nüfus kalabalığından gelir; yeni oyuncu hücre aldığında rekabet etmesi gereken bir NPC firma yoktur, **fırsat** vardır.
- **Referanslar:** Travian'da NPC fraksiyonu **Natarlar** hesap rakibi değil, dünya içinde **hedef nesnelerin** (harikalar, eserler) koruyucusudur; haritanın %10'u vahadır ve hayvanlarla doludur [14]. Capitalism Lab'de 50'ye kadar AI rakip vardır ve şehir bile kurarlar [15]; bu ayrı bir ürün (iş simülasyonu) ve ayrı bir AI bütçesidir. Bizim farkımız: dünyayı doldurmak için **rakip** değil **doku** kullanmak.
- **Sonradan eklemek** mümkündür (NPC hesap türü, rozetli); **kaldırmak** mümkün değildir. Bu asimetri varsayılanı "yok" yapar.

### 4.5 Kamu: belediye ihaleleri ve kamu döngüsü

Gerçekte kamu ihalesi 4734 sayılı Kanun'a bağlıdır: açık ihalede ilan süresi 40 gün, EKAP ile 28 güne iner [23]. Oyunda aynı **hissi** (açık eksiltme, en uygun teklif) ve **kısa süreyi** kurarız:

| Konu | Kural (öneri) |
|---|---|
| Tür | **İlçe ihalesi:** belediye (NPC Muhtar), mal + miktar + teslim vadesi (3–10 gün) + teminat + fiyat tavanı (referans +%15); örnek: yol onarımı (`celik`, `parca`), kış yakıtı, okul açılışı ihtiyacı *(güncellendi: docs/12 §10: kazanan kuralı tek ihale motoru, profil M; fiyat tavanı ithalat paritesi 1,10 R. Not: "NPC Muhtar" adı K-4 kararına göre (docs/12 §13, Y-39) ilçe düzeyinde İlçe Başkanlığı)* |
| İlan | 3–7 gün (gerçek 28–40 gün oyun için ölçeklenir); aynı anda ilçe başına ≤ 3 açık; ilanlar **deterministik** (ilçe bütçesi + ihtiyaç + takvim) |
| Teklif | `ihale_teklif {fiyat, teslimGunu}`; kazanan: en düşük fiyat, eşitlikte ilk teklif; hesap başına ≤ 2 açık teklif |
| Ödeme | Teslimde; teminat kaybı yalnız teslim etmemekte |
| Takvim | **Resmî tatilde ve kamu idari izninde ilan duraklar.** 2026 Kurban Bayramı kamuda **9 gün** idari izinle uzatıldı; özel sektörde yasal 4,5 gün [27]. Takvim paketi **yasal tatil** ve **kamu idari izni** ayrı alanlardır |
| Kaynak | **Kamu döngüsü:** arazi vergisi + NPC nüfus vergisi → ilçe/il hazinesi → ihale. Bugün arazi vergisi saf lavabodur (§3.7); ilçe hazinesine bağlanırsa para dolaşır, lavabo/faucet dengesi iyileşir. **B4 Devlet'e bağlıdır** |
| Hata modu | Çoklu hesapla ihale kıran → hesap başına açık teklif ve aynı ağdan teklif kısıtı ([mimari §3](paylasilan-dunya-mimarisi.md)) |
| Esnaf siparişi (pano) ile farkı | Esnaf siparişi (≤ 3, ödül piyasa +%5–15, [Capital Rift #4](capital-rift-mekanikleri.md)) tek oyuncuya bireysel işidir; ihale **yarışmalı** ve ilçe bütçesine bağlıdır |

Albion'un Kara Borsası benzer bir örnektir: NPC alıcı **bir kaynakla finanse edilir** ve eksik malı daha pahalı alarak satıcıyı çeker [13]. Bizim ihaleler aynı mantıkla bütçe-finanse ve kıtlık-duyarlıdır; sınırsız faucet değildir.

### 4.6 Faucet–lavabo ölçümü ("Haftalık Dünya Raporu")

| Gösterge | Kaynak | Kullanım |
|---|---|---|
| NPC faucet toplamı (yerel + dünya + ihale + kamu alımı) | Defter kalemleri (`ticaretDefteri` genişletilir) | **Dahili MER** panosu; ihale ve kamu alımı faucet'ı için haftalık tavan |
| Lavabolar (makas, komisyon, işletme gideri, arazi vergisi, bakım) | Mevcut | Hedef: lavabo/(vergi+ihracat−ithalat) ≈ 0,35–0,50 (B3 ölçümü) |
| NPC talep payı (oyuncu satış gelirinde) | Hesaplanır | H-C2 |
| Aynı veriden **İl Gazetesi** "ekonomi köşesi" | Sunum | Şeffaflık = içerik; EVE oyuncuları MER'i okur [7] |

---

## 5. Olay sistemi

### 5.1 Olay anatomisi (veri güdümlü)

| Alan | Açıklama |
|---|---|
| `id`, `aile` | `takvim`, `iklim`, `ekonomi`, `sosyal`, `kamu`, `zincir` |
| `tetik` | `takvim` (paket günü), `agirlik` (PRNG, ilçe/mal başına **sabit çekim sayısı**), `esik` (koşul: kıtlık, nüfus, doygunluk) |
| `kapsam` | İlçe / il / dünya; yayılım (iklimde var) |
| `onDuyuruSaat` | ≥ 24 (takvim: günler–haftalar) |
| `sure`, `acilisPenceresi` | Süre; açılış yalnız 08/12/17/20 pencerelerinde |
| `etki[]` | Talep çarpanı (kademe/mal), kapasite, işgücü, fiyat; **tavan:** takvim ±%15, rastgele ±%30 ve ≤ 10 gün; **yağma yok** |
| `karar` | Karar kalıbı (§5.6): seçenekler, bedel/fayda, **varsayılan = hiçbir şey** |
| `zincir[]` | `{sonraki, koşul, gecikme}` |
| `hassas` | `dini`, `afet`, `siyasi`, `anma`; hassas olayın metni ve sunumu inceleme kapısından geçer |
| `olgu` | Olgu şeması anahtarı (§6.1) |

### 5.2 Gerçek takvim ve takvim paketi (Ekim 2026 – Eylül 2027)

Takvim paketi **sürümlü ve günlüğe komutla yazılan** bir veridir (`takvim_paketi_yukle {karma}`, [çeşitlilik §8.1.3](cesitlilik-yonetim-askeri-teknoloji.md) kuralı). Bu rapor iki alan ekler: **yasal tatil** ile **kamu idari izni** ayrı; ve paket güncellemesi en az 24 sa sonrası için yapılır (idari izin kararları bayramdan günler önce çıkar [27]).

| Tarih (TRT) | Gün | Olay | Not |
|---|---|---|---|
| 14 Eyl 2026 | Pzt | Okullar açıldı (geçmişte; ritim: 7–11 Eyl uyum) | MEB 2026–27 takvimi [16] |
| **28 Eki 13:00 – 29 Eki 2026** | Çar–Per | Cumhuriyet Bayramı | 2429 sayılı Kanun [31] |
| 16–20 Kas 2026 | Pzt–Cum | Birinci dönem ara tatili | [16] |
| 1 Oca 2027 | Cum | Yılbaşı: "Yılın Gazetesi" | |
| 22 Oca / 25 Oca–5 Şub 2027 | Cum / Pzt–Cum | Karne / yarıyıl tatili | [16] |
| ≈ 8 Şub – 8 Mar 2027 | | Ramazan ayı (≈; bayramdan geri hesap, **doğrulanmadı**) | Hassas; yalnız talep eğrisi ve **sahip onayı** |
| 8–12 Mar 2027 | Pzt–Cum | İkinci dönem ara tatili | [16] |
| **8 Mar 13:00 (arife) – 11 Mar 2027** | Pzt–Per | **Ramazan Bayramı** (9–11 Mar) | Diyanet [17] |
| 23 Nis / 1 May / 19 May | Cum / Cmt / Çar | Resmî günler | |
| **15 May (arife) – 19 May 2027** | Cmt–Çar | **Kurban Bayramı** (16–19 May) | Diyanet [17] |
| 25 Haz 2027 | Cum | Karne, yaz tatili başlangıcı | [16] |
| Haz–Eyl | | **Düğün sezonu** (TÜİK 2025: Temmuz 67.120, **Ağustos 71.285**, Eylül 60.738 evlenme [21]) | Hafta sonu ağırlıklı |
| 15 Tem / 30 Ağu | Per / Pzt | Resmî günler | 15 Temmuz sahip kararı |
| 17 Ağu, 6 Şub, 10 Kas | | **Sessiz gün** (öneri, §5.7) | Sahip kararı |
| Eyl 2027 | | Yeni eğitim yılı (tarih Haziranda MEB'den; **doğrulanmadı**) | |

**Gözlem.** Alfa-0 Ekim 2026'da açılırsa **ilk dini bayram 9 Mart 2027'dir**; ilk 5 ay bayramsızdır. Hassasiyet incelemesi (§5.7) için bu bir süre tanır; Kurban Bayramı (16 Mayıs 2027) ise ikinci sınavdır.

### 5.3 Olay kataloğu (karar fırsatı sütunuyla)

[Çeşitlilik §8.1.4](cesitlilik-yonetim-askeri-teknoloji.md) iklim ve sosyal kataloğu verdi. Burada **ekonomik, takvim-sosyal ve kamu** olayları karar fırsatı ve hassasiyetle eklenir (mevcut 4 iklim olayı değişmez).

| # | Olay | Aile | Kapsam | Ön duyuru / süre | Çekirdek etkisi | Karar fırsatı | Hassasiyet | Aşama |
|---|---|---|---|---|---|---|---|---|
| E1 | **Okul açılışı dönemi** | takvim | Dünya | 14 gün / 7 gün | K2 (giyim, kırtasiye) ×1,12; sabah ulaşım K3 ×1,05 | Stok ve üretim kaydır; kırtasiye/tekstil ihtiyaç ihalesi | Düşük | A0 |
| E2 | **Kış hazırlığı** | takvim + iklim | İlçe (iklim tipine göre) | 21 gün / Eki–Kas | K1 `yakit` ×(1 + derece-gün eğrisi) | Yakıt stoku/ithalat; İlçe ihalesi (kış yakıtı) | Düşük | A0 |
| E3 | **Bayram alışverişi** | takvim | Dünya | 14 gün / 7 gün | K1 `gida` ×1,10–1,15; K2 ×1,10 | Üretim kaydır; Genel Talimat | Orta | A1 |
| E4 | **Bayram tatili** | takvim | Dünya | 14 gün / 3,5–4,5 gün | Talep ×0,85 (tatilde NPC trafiği); kamu ihale ilanı **duraklar** | İlan/teklif takvimini planla | Orta | A1 |
| E5 | **Düğün sezonu** | takvim + sosyal | Dünya (kırsal ağırlıklı) | Sezon / Haz–Eyl | K2 tekstil ×1,08; K4 hizmet ×1,08; hafta sonu tepe | Tekstil/gıda stoku; fuarla eşleşme | Düşük | A1 |
| E6 | **Yazlık nüfus** (kıyı ilçeleri) | takvim | Kıyı ilçe | 14 gün / Haz–Ağu | **Geçici nüfus** +%x (göç değil; talep ve K4) | Esnaf/tezgâh yatırımı | Düşük | A1 |
| E7 | **Kış turizmi (Uludağ)** | takvim + yerel | Bursa | Aralık–Mart | Dağ ilçelerinde K4 ve yakıt/gıda talebi | Kısa vadeli üretim | Düşük | A1 |
| E8 | **Cumhuriyet/23 Nisan/19 Mayıs/30 Ağustos** | takvim | Dünya | Hafta önce / 1,5 gün | Meydan süsü; talep ×0,95 | Kozmetik; şenlik kartı yarı maliyet | Düşük–orta | A0 (süs) |
| E9 | **Dünya fiyat şoku** | ekonomi | Dünya, mal başına | 24 sa / 3–10 gün | `emilim` veya `arz` ×1,2–1,4; mal başına ≥ 14 gün ara | Stok tut / sat; üretim yönelimi | Düşük | A1 |
| E10 | **Talep patlaması** (toplu sipariş) | ekonomi | İlçe | 24 sa / 2–4 gün | Bir malın `Q` ×1,25 | Fırsat: fiyat yükselt, çevre ilçeden getir | Düşük | A1 |
| E11 | **Liman yoğunluğu** | ekonomi | Liman | 24 sa / 3 gün | Liman primi +%x (tavan sınırı) | İhracat kaydır, kuyruğa karşı Garaj | Düşük | A1 |
| E12 | **İhale dalgası** | kamu | İlçe | 3–7 gün | İhale ilanı sayısı ↑ | Teklif ver | Düşük | A1 |
| E13 | **Hasat şenliği** | sosyal | İlçe imza | 72 sa / 2 gün | Satış +%10; K4 + | Fuar standı | Düşük | A1 |
| E14 | **Esnaf kampanyası** | ekonomi | İlçe | 24 sa / 7 gün | Tek oyuncu >%60 pay → esnaf indirimi | Çeşitlendir/fiyat kır | Düşük | A1 *(güncellendi: perakende-kademeleri §9.3, sentez-2 Ö4-9: kademeli pay tavanıyla birlikte eşik %75 önerisi)* |
| E15 | **Konut sıkışması** | zincir | İlçe | — / süren | Doluluk > %97 → çekicilik −; konut talebi | Konut yapısı, imece | Düşük | A1 |
| E16 | **Hayat pahalılığı** | zincir | İlçe | — / süren | K1 karşılanma < %80 7 gün → `memnuniyet` düşer, göç çıkışı | İhale, ithalat, esnaf desteği | Orta | A1 |
| E17 | **Sessiz gün** | takvim | Dünya | — / 1 gün | Şenlik/fuar/promosyon açılmaz | — | **Yüksek** | A0 |
| — | Kuraklık, don, sel, kış fırtınası (mevcut) | iklim | Bölge+2 | 24 sa / 3–20 gün | Çıktı/kapasite; **can kaybı yok** | Hazırlık | Orta | Var |
| — | **Deprem** | — | — | — | **Yapılmaz** (§5.7) | — | — | — |

Her olay için **≥ 1 oyuncu eylemi** gerekir (tabloda "Karar fırsatı" sütunu boş olamaz); boşsa o olay yalnız bülten malzemesidir (kozmetik).

### 5.4 Anlatıcı: tempo, bütçe, adalet

RimWorld'de anlatıcı olayları servet, nüfus, yakın zarar ve son büyük olaydan beri geçen süreye göre seçer; **uyum (adaptation)** puanı refahta büyür, zarar görünce sıfırlanır; ayrıca servetten bağımsız, zamana bağlı sabit eğri kipi vardır [5]. Dwarf Fortress simülasyonun kendi ürettiği hikâyeyi sunarken RimWorld **küratörlüğe** dayanır; simülasyon günlüklerinin önem filtresi gerekir [6]. Bizim uyarlamamız (hepsi çekirdekte, deterministik):

| Mekanizma | Kural (öneri) |
|---|---|
| **Olay bütçesi** | İlçe başına haftalık puan (servet eğrisi: eşik altı 0, üstü artan, tavan; [eşkıya kuralıyla](cesitlilik-yonetim-askeri-teknoloji.md) aynı eğri); olumsuz olay puan harcar |
| **Nefes payı** | İlçede aynı anda ≤ 1 olumsuz olay; iki olumsuz arası ≥ 72 sa |
| **Toparlanma kalkanı** | Zarar sonrası 72 sa yeni olumsuz olay yok (RimWorld uyum sıfırlaması) |
| **Fırsat dengesi** | Olumsuz olay sonrası ≥ 1 fırsat olayı (talep patlaması, ihale) 7 gün içinde (Phoebe tipi) |
| **Yeni oyuncu** | İlk 14 gün **sabit eğri** (zamana bağlı); servetten bağımsız (RimWorld'ün "servetten bağımsız ilerleme" kipi) |
| **Tohumlu** | Aynı tohum + aynı günlük = aynı olay dizisi; her ilçe × olay türü için **tam bir çekim** (iklimle aynı kalıp, `iklim.ts`), olay çıkmasa da |

CK3'te "mahkeme olayları" opt-in'dir ve süre dolunca nötr bir varsayılan seçilir; olay zincirleri büyük ya da küçük sayılır [9 (arama özeti)]. Aynı ilke: **olay oyuncuyu bekletmez, varsayılan zararsızdır** (§5.6).

### 5.5 Olay zincirleri ve sonuçları (üç örnek)

| Zincir | Adımlar | Karar noktaları |
|---|---|---|
| **Kuraklık → hasat → fiyat → memnuniyet** | İklim: kuraklık (24 sa duyuru) → tarım çıktısı ↓ → `gida` arzı ↓ → yerel fiyat ↑ → K1 karşılanma < %80 (7 gün) → E16 hayat pahalılığı → göç çıkışı | Sulama/depo (öncesi); fiyatı yükselt ya da sat (sırasında); ihale ve esnaf desteği (sonra) |
| **Okul açılışı → giyim talebi → tekstil kıtlığı** | E1 (14 gün önce) → K2 ×1,12 → tekstil/parça arzı yetersiz → fiyat ↑ → ihale ilanı (kırtasiye) | Üretimi öne çek; ithalat; ihaleye teklif |
| **Fabrika açılışı → istihdam → göç → konut** | Oyuncu tesis → `istihdamFirsati` ↑ → komşu ilçeden göç → doluluk > %97 → E15 → konut talebi (`celik`, `parca`) → imece "Konut" önerisi | Konut yapısı; ortak proje; başka ilçeye yayılma |

### 5.6 Olay → karar: beş kalıp ve arayüz sözleşmesi

| Kalıp | Olay örneği | Oyuncunun seçenekleri | Bedel |
|---|---|---|---|
| **Hazırlık** | Don uyarısı, kış hazırlığı | Depo / ithalat / sigorta / Genel Talimat | Para, depo |
| **Fırsat** | Talep patlaması, bayram alışverişi | Üret/yükselt/getir | Üretim kaydırma, fiyat riski |
| **Müdahale** | Sel sonrası | Yardım noktası, onarım ihalesi | Para ve işgücü |
| **Koordinasyon** | Konut sıkışması, ortak proje | İmece payı | Malzeme |
| **Siyasi** | Vergi/ihale kuralı | Meclis kartı, oy | Siyasi sermaye |

**Sözleşme (güven ilkesi):** (1) her olay **opt-in**'dir; hiçbir şey yapmamak zararsız ve açıkça "varsayılan" gösterilir; (2) kaçırmanın cezası yoktur; (3) ön duyuru **herkese aynı anda**, sunucu zaman damgasıyla; (4) bir olayın "sonucu" Defter'de **olay etiketli** satırlarla izlenir (Sen yokken kartı, §6.3); (5) karar kartı yalnız **eylemleri** gösterir, tavsiye etmez.

### 5.7 Hassasiyet politikası (deprem, dini, siyasi, gerçek felaketler)

Kural: **dahil etmek kolay, çıkarmak zordur**; varsayılan hariçtir.

| Konu | Politika | Gerekçe |
|---|---|---|
| **Deprem** | Rastgele olay **yapılmaz**; "deprem" kartı, afet teması, kayıp metni yok. Yapı güvenliği/afet hazırlığı ancak **sahip ve lider onayıyla**, olay değil **bilgi/eğitim** olarak | 17 Ağustos 1999 Marmara depremi Kocaeli ve Sakarya'yı en çok vuran afettir ([çeşitlilik raporu §8.1.4](cesitlilik-yonetim-askeri-teknoloji.md)); 6 Şubat 2023 Kahramanmaraş depremlerinde AFAD'a göre **50.096** kişi yaşamını yitirdi, 11 il yıkımla karşılaştı [28]. Alfa-0 illerinde oyuncular bu hafızayı taşır |
| **Gerçek felaket adı/yer/tarih** | Olay metni **gerçek bir afeti, yeri ve tarihi** anmaz; iklim olayı adları genel (sel, yangın) | Uydurma "haber" riski |
| **İnsan zararı** | Hiçbir olay **can kaybı, yaralanma, mağduriyet** metni üretmez; olaylar yalnız **ekonomik** (kapasite, talep, süre) | Sakin ton; ciddi içerik bildirimi |
| **Dini bayram** | Yalnız **talep eğrisi + nötr kozmetik** (meydan süsü, tebrik kartı). Ritüel, kıyafet, mekân ya da figür yok. Bayram adı Diyanet takvimindeki **resmî ad** | [çeşitlilik §8.1.3](cesitlilik-yonetim-askeri-teknoloji.md) tonu korunur |
| **Kurban** | "Kurban/kurbanlık" sözcükleri ve kesim görseli **yok**; talep tepesi "bayram öncesi hayvancılık ve et ürünleri talebi" diye adlandırılır | Hassas; ekonomik gerçek korunur |
| **Ramazan ayı** | Sonra; yalnız akşam talep kayması + gıda; **sahip onayı** | Dini ay; yanlış ton marka riski |
| **Siyasi günler** (15 Temmuz, 1 Mayıs) | Yalnız tatil ritmi; mesaj yok. **Sahip kararı** | Siyasi hassasiyet |
| **Anma günleri** (17 Ağustos, 6 Şubat, 10 Kasım) | **Sessiz gün** önerisi: o gün şenlik, fuar, promosyon açılmaz; bülten tonu sade. Zorunlu değil, **sahip onayı** | Ton |
| **Gerçek kişi/parti/seçim** | Yok (mevcut kural) | — |

### 5.8 PRNG akışları, olay paketi ve sürümleme

| Konu | Karar |
|---|---|
| **Akış yalıtımı** | Her olay ailesi **kendi akışını** kullanır: `dunya` (ekonomik şok), `sosyal`, `esnaf`, `anlatici`. **Mevcut `olay` yalnız iklime kalır.** Gerekçe: B8; yeni olay `olay`'dan çekerse aynı tohumla **iklim sonuçları değişir** |
| **Neden şimdi** | `Dunya.rng` kaydı özete girer; akış eklemek şema sürümü ve görüntü göçü ister. Alfa-0 kilidinden **önce** 4 yeni akış rezerve edilmeli (kullanılmasa da) |
| **Olay paketi** | Olay kataloğu **veri paketi**dir: `olay_paketi_yukle {karma, gecerlilik: t ≥ ...}` komutu günlüğe yazılır; paketler `paketler` tablosunda karma ile saklanır (yeniden oynatma için). Haftalık içerik güncellemesi **kural dönemi** (dağıtım) gerektirmez |
| **Çekim sayısı sabit** | İklimde olduğu gibi, her ilçe × tür için olay çıksın çıkmasın **tam bir çekim**; yoksa bir olayın eklenmesi sonraki bütün çekimleri kaydırır |
| **Çözücü** | Olay açılış/kapanışları 4 pencerede toplanır (§2.3); aynı `t`'deki olaylar tek `kirlet`'e düşer |

---

## 6. Haber ve anlatı

### 6.1 Olgu şeması: haberin kaynağı

Çekirdek bir olay/eşik olduğunda **olgu** (fact) yayar: yapılandırılmış, küçük, tamsayılı bir kayıt. Olgu **yan kanaldır**: `Dunya` durumuna ve `durumOzeti`'ne girmez, ama sunucu tarafından Postgres'e **idempotent** yazılır (`(seq, t, tür, sıra)` anahtarıyla); yeniden oynatma aynı olguları üretir (determinizm), anlık görüntü sonrası kaybolanlar kuyruk oynatmasıyla yeniden doğar.

| Alan | Örnek |
|---|---|
| `t`, `tur`, `ilce`, `il` | `ihale_kapandi`, `nufus_esigi`, `fiyat_rekoru`, `ilk_ihracat`, `unvan_degisti`, `olay_basladi` |
| `deger[]`, `yon`, `mal` | `[1450, +%18]`, `gida` |
| `onem` | Medyana göre mutlak Δ × kapsam × yenilik (0..PPM) |
| `aktor` | `oyuncuId` (varsa); **adı değil** kimliği; ad anma rızası render zamanı çözülür |
| `hassas` | Olayın hassasiyet bayrağı |

### 6.2 Yayınlar: günlük defter kapanışı ve yayın akışı

[Çeşitlilik §8.4](cesitlilik-yonetim-askeri-teknoloji.md) tabloyu verdi. Bu rapor **zinciri** ekler:

| Adım | Zaman | Ne |
|---|---|---|
| 1 | 00:00 | `ilce_gunluk` olguları yazar (günlük defter kapanışı) |
| 2 | 00:05 | Sunum worker'ı olguları **önem sırası** ile seçer (editörlük: günde ≤ 3 başlık + hava/yol + esnaf köşesi) |
| 3 | 06:00 | Şablon + varyant ile **İlçe Bülteni** metnini üretir; statik JSON/HTML (≈ 5–10 KB), CDN'de önbellekli |
| 4 | Pazar 09:00 | İl Gazetesi (haftanın manşeti + **Haftalık Dünya Raporu**: nüfus, göç, fiyat, faucet) |
| 5 | Sürekli | "Sen yokken" özeti (§6.3); Çay ocağı söylentisi: yalnız **doğrulanmış ve yaklaşan** olay ipuçları (uydurma söylenti yok) |

DF dersi: simülasyon günlüğü ham hâlde hikâye değildir; **filtre** gerekir [6]. Filtre = önem puanı + günlük kota + tür çeşitliliği (aynı gün 3 başlıktan en çok 1'i aynı tür).

### 6.3 "Sen yokken": nedensellik ve net etki

Kartın yeni değeri **neden** bilgisidir; ödül yok (K13):

| Bölüm | İçerik | Kaynak |
|---|---|---|
| **Net sonuç** | Para ve stok farkı: `defter(şimdi) − defter(sonGörülen)` (O(1); `ticaretDefteri {toplam, oran, t0}` zaten tembel) | Mevcut alanlar |
| **Neden** (3 renk) | **Olay kaynaklı** (kuraklık −%18, düğün sezonu +%8), **piyasa kaynaklı** (fiyat), **senin kararın** (Genel Talimat, ihale) | Olay etiketli defter satırları |
| **Hemen karar** | ≤ 3 madde: kapanan ihale, yaklaşan olay, kapasite uyarısı | Olgu + olay kuyruğu |
| **Haberler** | İlçe Bülteni'nden 3 başlık | Aynı olgu defteri |

`sonGorulen` oyuncu başına birkaç tamsayı (çıkış anında defter anlık görüntüsü): 10 bin oyuncuda ihmal edilebilir. **Suçlu hissettirme yok:** "sen buradayken şunu yapardın" karşı-olgusu yoktur.

### 6.4 Başarı haberleşmesi, KVKK ve arşiv

| Konu | Kural |
|---|---|
| Varsayılan | Haberde oyuncu **adı yok**: "bir Ticaret ofisi sahibi", "ilçenin en büyük işvereni" |
| Ad anma | **Açık rıza (opt-in)**, ayarlardan geri alınabilir; yalnız tabela adı (2–24 karakter) |
| KVKK | Takma ad, kullanıcının sistemde kime ait olduğu biliniyorsa **kişisel veri** olabilir; **takma adlaştırma anonimleştirme değildir**, veri hâlâ KVKK kapsamındadır [24]. Kurul geniş katılımlı çevrim içi bir oyunun Türkiye dağıtıcısına ilişkin 28/09/2023 tarihli kararında oyun verilerinin işlenmesini değerlendirmiştir [24] |
| Saklama | **Olgu saklanır, metin değil:** haber render anında ad anma rızasına göre üretilir; rıza geri alınınca **arşiv anında anonimleşir**. Üretilmiş (LLM) metin saklanırsa bu silme zorlaşır |
| Başarım haberi | "İlk" başarımlar ve durum unvanı değişimleri (el değiştiren unvan: "İlçenin En Büyük İşvereni değişti") olgu olarak; unvan avantaj vermez |
| Hesap silme | Kimlik bağı kopar; olgudaki `aktor` → anonim |
| Açık alfa öncesi | Hukuki görüş ([çeşitlilik §8.6](cesitlilik-yonetim-askeri-teknoloji.md), K34) |

### 6.5 AI üretimi mi, şablon mu: maliyet ve risk

**Maliyet.** Bir bülten ≈ 600 token girdi + 250 token çıktı varsayımı; Türkçe için belirteç sayısı ×2 de denendi (Claude 4.7 ve sonrası tokenizer ≈ %30 fazla belirteç üretir). Fiyatlar [25]: Haiku 4.5 **$1 / $5** (Batch **$0,50 / $2,50**), Sonnet 5.5 **$2 / $10** (Batch **$1 / $5**) milyon belirteç başına.

| Senaryo (30 gün) | Bülten sayısı | Haiku 4.5 Batch | Sonnet 5.5 Batch | Sonnet 5.5 standart |
|---|---|---|---|---|
| Alfa-0 (45 ilçe) | 1.350 | **$1,3–2,5** | $2,5–5,0 | $5,0–10 |
| 1k oyuncu (≈ 150 aktif ilçe) | 4.500 | $4,2–8,3 | $8,3–17 | $17–33 |
| 10k oyuncu (≈ 600 aktif ilçe) | 18.000 | **$17–33** | $33–67 | $67–133 |
| Türkiye tamamı (973 ilçe) | 29.190 | **$27–54** | $54–108 | $108–216 |

→ **Token maliyeti bağlayıcı değildir.** Bağlayıcı olanlar:

| Ölçüt | Şablon + varyant | Çalışma zamanında LLM | **Hibrit (öneri):** LLM çevrimdışı yazar, insan onaylar, sistem seçer |
|---|---|---|---|
| **Uydurma (halüsinasyon)** | Yok | Gerçek yer/kişi/olayda yanlış "haber" riski; olgu dışı ayrıntı | Yok (onaylı havuz) |
| **Determinizm / tekrar** | Tohumla seçim: aynı olgu aynı metin | Aynı olgu iki farklı metin; **saklamak zorunlu** | Tohumla seçim |
| **KVKK / silme** | Render anında; saklanan olgu | Üretilmiş metin ad içerebilir; arşivden **silmek** zor | Render anında |
| **Enjeksiyon** | Oyuncu metni şablona **değer** olarak girer | Oyuncu metni (tabela, ad) istemde ⇒ **istem enjeksiyonu** | Yok |
| **Hassas içerik** | İnceleme **bir kez** (şablon) | Her çıktı için inceleme gerekir | İnceleme **bir kez** |
| **Gecikme/süreklilik** | Anlık | Asenkron batch; 06:00 yayını için sıkışık; kesinti riski | Anlık |
| **Dil kalitesi** | Tekdüze riski | İyi | İyi (LLM yazar) |
| **Bakım** | Şablon yazımı emek | Düşük emek, yüksek denetim | Havuz genişletme emeği AI ile düşer |
| **Çeşitlilik** | Şablon × varyant | Yüksek | Şablon × **çok** varyant |

**Tekrar matematiği.** Bir olgu cümlesi = giriş (8) × olgu cümlesi (12) × bağlam kuyruğu (6) = **576** kombinasyon/tür; 30 olgu türünde 17.280. Aynı oyuncunun 30 günde aynı (tür, varyant) ≥ 2 kez görme oranı hedefi ≤ %10 (H-C8). LLM'e bu havuzu **çevrimdışı** genişlettirmek (insan onaylı, hassas tür filtreli) çalışma zamanı riski olmadan çeşitlilik verir. **Öneri: şablon + olgu defteri; LLM yalnız build-time yazım yardımcısı.** Çalışma zamanı LLM'i yalnız oyuncu-izinli "kişisel özet cümlesi" gibi dar bir alanda, ayrı onayla ve oyuncu metni içermeden düşünülür (sonra).

---

## 7. Görünürlük: haritada ve sokakta canlılık

**Bütçe.** ≤ 60 çizim çağrısı ([A1-2](../11-urun-donusu.md), [sokak seviyesi 3D P0](sokak-seviyesi-3d.md)); sakin görsel ilkesi: parçacık yok, akış çizgisi yok, "hareketi azalt" ayarı. Yürüyüş istemcisi bütün karakterleri **tek çizim çağrısında** çizmeyi zaten yapar ([yürü-istemci](yuru-istemci.md)); örnekleme tekniği aynı kalır.

| Öğe | Veri kaynağı (çekirdekten) | Teknik | Çizim çağrısı | Sakin ilke |
|---|---|---|---|---|
| **NPC kalabalık** | `nufusEma`, hafta günü, saat tablosu, olay bayrağı | Tek `InstancedMesh`; konumlar `ilceKimligi ⊕ ⌊t/60 sn⌋` tohumundan (sunucuda NPC durumu yok); ≤ 40 örnek/ilgi alanı | **+1** | Siluet, düz renk; hareketi azalt ⇒ donuk |
| **Araç trafiği silueti** | **Kenar yükü** (`kullanilanSaat / kapasite`, mevcut lojistik): araç sayısı gerçek akışla orantılı | Yol çizgisi boyunca köşe gölgelendiricisi (zaman uniformu); CPU maliyeti ≈ 0 | **+1** | Düz, yavaş |
| **Açık/kapalı dükkân** | Esnaf türü saat tablosu; pazar günü; bayram (kapalı) | Örnek başına öznitelik bayrağı (emissive); mevcut sprite atlası | **0** | — |
| **Gece ışıkları** | Güneş batışı (istemci hesaplar; **çekirdek dışı**); ilçe nüfusu → pencere yoğunluğu | Gölgelendirici `geceKatsayisi` + pencere dokusu atlası | **0** | Yumuşak; titreme yok |
| **Harita ısısı** | `memnuniyet`, `nufus` | Veri güdümlü renk rampası (MapLibre ifadesi), çokgen katmanı | **0** (mevcut katman) | Sakin palet |
| **İlçe nabzı** | `gocBakiyesi` işareti | Küçük sembol (+/−), animasyon yok | **0** | — |
| **Hava durumu tonu** | Aktif iklim olayı | Ton/ışık, parçacık yok | **0–1** | — |
| **Pazar günü tezgâh** | Hafta günü | Sprite atlası, instancing | **+1** | — |

**Toplam ek: ≈ +3–5 çağrı** (60'ın içinde). 100 bin örnek tek çağrıda ≈ 6,8 ms ölçülmüştür ([3D teknoloji](3d-teknoloji.md)); 40 örnek ihmal edilebilir.

**Doğruluk sözleşmesi (§1.4).** Yoğunluk çekirdek değerinin **sıralı** işaretidir; kıtlık ⇒ boş raf; nüfus ↑ ⇒ kalabalık ↑; kenar yükü ↑ ⇒ trafik ↑. İki istemci aynı anı farklı gösterebilir (tohumlu konum 60 sn kuantumlu), ama **aynı yoğunluk sırasını** göstermelidir. Kozmetik rastlantı (kimin yürüdüğü) çekirdek durumuna **yazılmaz**.

---

## 8. Sunucu maliyeti ve determinizm (1k–10k oyuncu)

### 8.1 Hangi süreç nerede

| Süreç | Katman | Maliyet etiketi | Neden |
|---|---|---|---|
| Nüfus, göç, memnuniyet, talep oranları | Çekirdek | S1 (günde 1 olay) | Ekonomiyi etkiler |
| Yerel pazar çekim ağırlığı | Çekirdek | S1 (komut/günlük) | Para akışı |
| Esnaf kapasitesi ve çekilme | Çekirdek | S1 | Arz |
| Olay açma/kapama, etkiler | Çekirdek | S1 (≤ 4 pencere) | Ekonomi |
| İhale ilanı/teklif/kapanış | Çekirdek | S1 | Para |
| Takvim paketi | Çekirdek (komutla yazılır) | S0 | Tarih |
| Olgu üretimi | Çekirdek yan kanal | S1 | Haberin kaynağı |
| Bülten/gazete metni, manşet seçimi, "Sen yokken" | **Sunum worker** | S1 | Okur, yazmaz |
| Çay ocağı söylentisi | Sunum | S0 | Olay kuyruğundan |
| Çevrimiçi sayaç, sohbet | Sunum | S2 | Mevcut plan |
| Kalabalık, trafik, ışık, ses | İstemci | B1 | Görsel |

### 8.2 Maliyet ve ölçek

| Ölçek | Aktif ilçe | Ek dünya çözümü/gün | Olgu/gün | Özet kaydı | Bülten | Not |
|---|---|---|---|---|---|---|
| Alfa-0, 200 oyuncu | 45 | ≤ 6 | ≈ 1–2 bin | 8 bin/gün ≈ 0,8 MB | 45 | NPC talep payı ≥ %70 (H-C2) |
| 1k oyuncu | ≈ 150–250 | ≤ 6 (mevcut 140–250 üstüne **+≤ %4**) | ≈ 10 bin | 40 bin/gün ≈ 4 MB | ≈ 150–250 | Çözüm başına ≈ 35 ms (mevcut ölçüm) |
| 10k oyuncu | ≈ 600 | ≤ 6 (kuantum sayesinde) | ≈ 100 bin | 400 bin/gün ≈ **40 MB**/gün (Postgres; **bellekte değil**) | ≈ 600 | NPC talep payı %15–25'e düşer (tahmin); oyuncu pazarı (v1.5) devreye girer |

- **Özet kaydı depolama:** önceki tahmin (≈ 20 KB/oyuncu bellek, [çeşitlilik §8.2](cesitlilik-yonetim-askeri-teknoloji.md)) 10k oyuncuda ≈ 200 MB'a çıkar; **bellekte ≤ 64 kayıt**, kalanı Postgres `ozet` tablosunda 30 gün TTL (yeniden üretilebilir sunum verisi: kaybı ölümcül değil).
- **Yazar süreci (tek yazar) yükü:** `ilce_gunluk` ≈ 80 bin işlem + 1 çözüm; **bülten ve gazete yazarda üretilmez**, ayrı worker'da, olgu tablosundan.
- **Dağıtım:** statik JSON CDN'de önbellekli (bülten ilçe başına 5–10 KB); WebSocket yalnız kişisel kareyi taşır.
- **Çözücü riski:** asıl risk **olay sayısıdır**; kuantum ve olay pencereleri çözücüyü korur. İlçe ihalesi/olgu sayısı çekirdek çözümünü tetiklemez (para yalnız teslimde).

### 8.3 Determinizm sözleşmeleri

1. `ilce_gunluk` içinde ilçeler **kimlik sırasıyla**; nesne anahtarı gezintisi sıralıdır.
2. Olay çekimleri **sabit sayıda** (§5.8); yeni olay ailesi yalnız **kendi akışından**.
3. Sunum katmanı çekirdek durumunu **yalnız okur**; test: `sunum-kapali.test` (aynı günlük → aynı `durumOzeti`).
4. Takvim paketi, olay paketi ve talep parametreleri **günlüğe komutla** girer ([mimari §2](paylasilan-dunya-mimarisi.md) kural sürümleme).
5. Olgu üretimi çekirdekte **yan kanal**: durumu değiştirmez; `olgu-yeniden-uretim.test`: aynı günlük → aynı olgu dizisi.
6. Çekirdekte `Date`/`Intl` yok; tarih tamsayı sivil takvimle (§2.2).

---

## 9. Ölçüm: hipotezler ve kabul ölçütleri (öneri)

| Kod | Hipotez | Ölçüt | Yöntem |
|---|---|---|---|
| **H-C1** | "Dünya yaşıyor" algısı | 5 testçi: 10 dk oyna, ertesi gün dön; "dünya devam etti mi" ≥ 4/5 evet ve ≥ 3 olguyu doğru anımsama | İnsan testi |
| **H-C2** | NPC talebi boş dünya riskini (R-Ü6) kapatır, oyuncuyu ezmez | NPC yerel talep payı (oyuncu satış gelirinde): 200 oyuncuda ≥ %70, 1k'da %40–60, 10k'da ≥ %15 | Bot ölçümü |
| **H-C3** | Faucet–lavabo dengesi | lavabo/(vergi+ihracat−ithalat) 0,35–0,50 (mevcut B3 aralığı); NPC faucet haftalık değişimi ≤ %10 | Dahili MER |
| **H-C4** | Olay karar fırsatına dönüşür | Ön duyurulu olayların ≥ %30'u için ≥ 1 ilgili komut ön duyuru penceresinde | Bot/insan |
| **H-C5** | Çevrimdışı adalet (§2.5) | 24 sa çevrimdışı botun olay kaynaklı net kaybı ≤ günlük gelirin %3; 24/7 çevrimiçi ile fark ≤ %5 | Bot arketipleri |
| **H-C6** | Sunum çekirdeği etkilemez | `sunum-kapali.test` yeşil; 100 koşuda `durumOzeti` aynı | CI |
| **H-C7** | Görsel bütçe | Ek ≤ 5 çizim çağrısı; 60 fps (entegre GPU) | Tarayıcı profili |
| **H-C8** | Bülten tekrarı | 30 günde aynı manşet metni ≤ %10; aynı (tür, varyant) ≥ 2 kez ≤ %10 | Üretim istatistiği |
| **H-C9** | Göç kararlılığı | 30 günde hiçbir ilçe nüfusu ±%15'ten fazla değişmez; iki ardışık gün işaret değiştirme oranı < %20 | Bot koşusu |
| **H-C10** | Olay zinciri okunabilir | Karar kartı "neden" etiketi ≥ %90 olayda dolu | Test |

---

## 10. Geri dönüşü zor kararlar ve öneri

| # | Karar | Seçenekler | **Öneri** | Neden geri dönüşü zor | Kapı / güvence |
|---|---|---|---|---|---|
| **1** | **Zaman oranı ve mutlak saat** | A: 1:1 tek takvim · B: iklim ×6 · C: tüm dünya hızlı · sim zamanı birikimli mi mutlak mı | **A + mutlak duvar saati**; `t = 0` TRT gece yarısına hizalı; artık yıl destekli tamsayı tarih | Süreler saat bazlı; dünya yıllarca sürer; oyuncu yatırımları ve beklentisi; tarihe bağlı içerik. Birikimli saatte her kesinti **kalıcı ofset** bırakır | Yerinde hız değişimi yok; hız ihtiyacı **ayrı dünya** (sonra) |
| **2** | **NPC mülk sahibi rakip firma** | Var / yok / yalnız agrega | **Yok** (mülk sahibi); NPC arz agregası + esnaf, rozetli | Eklemek kolay, **kaldırmak parsel el değiştirmesidir**; günlük şeması (`npc:*` hesap); ilçe payı tavanları | Sonra eklenebilir (rozetli, agrega) |
| **3** | **Nüfus birimi ve kohort** | Birey / mahalle / ilçe tek kohort / ilçe × sınıf | **İlçe tek kohort**; mahalle sunum; `kohort[]` için sürümlü yer | Durum şeması, göç ve bütün denge; "muhtarlık = mahalle" vaadi | `IlceDurumu` şema sürümü; uzantı noktası |
| **4** | **Olgu şeması ve haber yöntemi** | Olgu defteri + şablon · çalışma zamanı LLM · metin saklama | **Olgu defteri + şablon + çevrimdışı AI-yardımlı havuz** | Olgu şeması en geç değişen şeydir (haber, "Sen yokken", başarım, rapor hepsi ona bağlı); metin saklamak KVKK silmeyi zorlaştırır; arşiv biçimi | Olgu sürümlü; render fonksiyonu değişebilir |
| **5** | **Para döngüsü** | Açık kese (faucet + sayaç) · kapalı hane-geliri döngüsü | **Açık kese + MER sayacı + (B4 ile) kamu döngüsü** | Tüm ekonomi dengesi ve enflasyon; kapalı döngüye geçmek Vic3 karmaşıklığı | Parametre ve çarpanlar ayarlanabilir; kapalı döngü ayrı sürüm |
| **6** | **PRNG akışı listesi** | Mevcut 4 · yeni akışlar | **4 yeni akış** (`dunya`, `sosyal`, `esnaf`, `anlatici`) Alfa-0 kilidinden önce | `Dunya.rng` özete girer; akış eklemek **şema ve görüntü göçü**; `olay` paylaşılırsa iklim kayar | Kural sürümü; boş akış maliyeti 0 |
| **7** | **Zaman ızgarası ve kuantum** | Saatlik talep · günlük kuantum + 4 pencere | **Günlük kuantum + 08/12/17/20 pencereleri** | Çözücü maliyeti ve olay semantiği; sonradan sıklaştırmak performans ve adalet dengesini bozar | Pencere listesi parametre |
| **8** | **"Olay = opt-in karar fırsatı" sözleşmesi** | Zorunlu/cezalı olaylar · opt-in, varsayılan zararsız | **Opt-in, ceza yok, ön duyuru ≥ 24 sa, açılış 08–22** | Oyuncu güveni; sonradan cezalı olaya geçmek güven kırar | Arayüz kartı sözleşmesi |
| **9** | **Hassas içerik** (deprem, dini, siyasi) | Dahil · hariç | **Varsayılan hariç**; deprem yok; dini bayram yalnız talep eğrisi + nötr kozmetik | Dahil etmek kolay, **çıkarmak zor** (oyuncu gördü, haber çıktı); marka ve ton | `hassas` bayrağı + inceleme kapısı; sahip onayı |
| **10** | **Talep modelinin kimliği** (yerel nüfus talebi) | Yalnız dünya pazarı (bugün) · yerel nüfus kanalı | **Yerel nüfus kanalı** (§4.1); dünya kanalı sabit tabana iner | **Arsa fiyat ve konum beklentileri** talebe dayanır; Alfa-1'de arsa satışı başlayınca "konum rekabeti" vaadi kurulur ve sonradan değişirse piyasa değeri değişir | Alfa-1 arsa satışından **önce** kilitle; B5 çift sayım düzeltmesi aynı sürümde |

**Sıra önerisi.** 1, 6, 7 (çekirdek altyapısı, Alfa-0 kilidinden önce) → 3, 10 (veri ve talep) → 4 (olgu şeması, haber ilk yayından önce) → 5, 8, 9 (politika) → 2 (zaten "yok", yazılı karar).

---

## 11. Aşamalı yol haritası ve açık sorular

| Aşama | Kapsam | Etiket | Bağımlılık |
|---|---|---|---|
| **A0-1 (altyapı)** | `dunyaEpochMs` + TRT hizası; tamsayı sivil takvim; 4 yeni PRNG akışı (boş); `ilce_gunluk` olayı; `IlceDurumu` alanları (yalnız `nufus`, `nufusEma`, `karsilanma[0]`); olgu yan kanalı | M | Serileştirici sürümü; mimari §2 |
| **A0-2 (talep)** | K1 + K2 yerel pazar kanalı; esnaf payı; `yerelOlcek` kalibrasyonu; B5 düzeltmesi; Takvim Önizleme (veri) | M | A0-1; ölçüm takımı |
| **A0-3 (anlatı)** | Olgu → İlçe Bülteni (şablon, ~8×6); "Sen yokken" net etki; Genel Talimat (3 kural) | M | A0-1 |
| **A1-1** | Göç + işgücü doygunluğu; K3; ihale; olay anlatıcısı + E1–E5; NPC tüccar tipleri | L | B4 Devlet (vergi/hazine) |
| **A1-2** | K4 (imece bağı); bayram paketi (sahip onayıyla); İl Gazetesi + Haftalık Dünya Raporu; görsel kalabalık/trafik | L | Hassasiyet incelemesi |
| **Sonra** | Yazlık nüfus, kış turizmi; ilçe × sınıf kohort; çevrimdışı AI havuz genişletme; "Hızlı Dünya" ayrı örnek | L | Ölçüm |

**Sahip/lider kararı gereken açık noktalar.**
1. Zaman: A (1:1) onayı; "Hızlı Dünya" ayrı örnek olarak gündemde kalsın mı?
2. **Sunucu kapalıyken yetişme** (mutlak saat) kabul mü? Bakım penceresi 04:00–05:00 TRT uygun mu?
3. Mülk kipi için **ilçe nüfusu** başlangıç verisi: TÜİK ADNKS ilçe nüfusu mu, WorldPop türevi mi?
4. NPC mülk sahibi rakip firma **yok** kararı yazılsın mı?
5. Ramazan ayı, Kurban terminolojisi ve **sessiz gün** (17 Ağustos, 6 Şubat, 10 Kasım) politikası: sahip onayı.
6. Ad anma rızası (varsayılan kapalı) ve KVKK hukuki görüşü zamanlaması (açık alfadan önce).
7. İlçe gelişim seviyesi eşiği: nüfus yerine **ihtiyaç kademesi** (§3.3)?
8. `yerelOlcek` hedefi: NPC talep payı H-C2 aralığı (≥ %70 / %40–60 / ≥ %15) uygun mu?
9. Genel Talimat (en çok 5 kalıcı kural) çevrimdışı adalet için kabul mü, yoksa "otomasyon" teknolojisine mi bağlansın?

---

## 12. Kaynaklar

**Oyunlar ve tasarım**

- [1] Victoria 3 Dev Diary #13, Standard of Living: https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-13-standard-of-living.1489327/ (arama özeti: doğum/ölüm oranları ve sadakat yaşam standardına bağlı; pop ücretini karşılayabildiği en yüksek standart kümeye harcar)
- [2] Victoria 3 Wiki, Pops: https://vic3.paradoxwikis.com/Pops (arama özeti; sayfa açılmadı)
- [3] Victoria 3 Dev Diary #17, Migration: https://steamcommunity.com/games/529340/announcements/detail/2883983628171339202 (arama özeti: göç çekicilik skoru eyaletin yaşam standardına ve iş fırsatına bağlıdır; sayfa içeriği açılmadı)
- [4] Anno 1800 Wiki, Population: https://anno1800.fandom.com/wiki/Population; tüketim hızı: https://steamcommunity.com/app/916440/discussions/0/4699034922680754359/ (arama özeti: tüketim evin azami kapasitesine göre hesaplanır; evler dolunca katman atlanır)
- [5] RimWorld Wiki, AI Storytellers: https://rimworldwiki.com/wiki/AI_Storytellers
- [6] Game Developer, Dwarf Fortress vs RimWorld hikâye anlatımı: https://www.gamedeveloper.com/design/dwarf-fortress-and-rimworld-tell-very-different-stories
- [7] EVE Online, Dinamik Ödül Sistemi: https://www.eveonline.com/news/view/concord-introduces-the-dynamic-bounty-system; Aylık Ekonomi Raporu özetleri: https://tagn.wordpress.com/2025/11/14/the-october-2025-eve-online-monthly-economic-report/
- [8] Cities: Skylines, talep: https://skylines.fandom.com/wiki/Zoning (arama özeti)
- [9] Crusader Kings 3 Dev Diary #30 (olay yazımı): https://forum.paradoxplaza.com/forum/developer-diary/crusader-kings-3-dev-diary-30-event-scripting.1397140/ ; #75 (mahkeme olayları): https://forum.paradoxplaza.com/forum/threads/crusader-kings-3-dev-diary-75-in-the-event-of-court-events.1492792/ (sayfalar açılmadı; arama özeti)
- [10] Animal Crossing: New Horizons gerçek zaman ve zaman oynama: https://www.nintendolife.com/guides/animal-crossing-new-horizons-how-to-time-travel-what-happens-when-you-time-travel ; https://www.howtogeek.com/664199/how-to-time-travel-in-animal-crossing-new-horizons/
- [11] Stardew Valley Wiki, Seasons (28 günlük mevsim): https://stardewvalleywiki.com/Seasons
- [12] Eco (dünya 24/7 simüle edilir, seçilmiş hükümet ve yasalar): https://store.steampowered.com/app/382310/Eco/ ; https://supercraft.host/wiki/eco/government_guide/
- [13] Albion Online Kara Borsa (NPC alıcı, ödenek kaynağıyla finanse edilir): https://albiononline.com/news/video-black-market-feature ; https://www.albioncodex.com/guides/albion-online-black-market-crafting
- [14] Travian Natarlar ve vahalar: https://support.travian.com/en/articles/225-natars-villages-troops-and-game-progress ; https://support.travian.com/en/articles/48-oasis
- [15] Capitalism Lab, gelişmiş AI rakipler: https://www.capitalismlab.com/improvements/improved-ai/

**Türkiye verileri**

- [16] MEB 2026–2027 eğitim öğretim yılı takvimi: https://www.meb.gov.tr/2026-2027-egitim-ogretim-yili-takvimi-aciklandi/haber/41057/tr ; https://www.aa.com.tr/tr/gundem/meb-2026-2027-egitim-ogretim-yili-takvimini-belirledi/3966122
- [17] Diyanet 2026–2027 dini günler: https://www.milligazete.com.tr/diyanet-2026-2027-dini-gunler-takvimi-uc-aylar-hangi-gun-kandiller-ne-zaman-ilk-oruc-ne-zaman-bayram-hangi-tarihte (Ramazan Bayramı 9–11 Mart 2027; Kurban Bayramı 16–19 Mayıs 2027)
- [18] TÜİK ADNKS 2025 (Türkiye 86.092.168; Bursa 3.263.011; Kocaeli 2.161.171; Sakarya 1.123.693): https://www.aa.com.tr/tr/gundem/adrese-dayali-nufus-kayit-sistemi-sonuclari-9-subatta-aciklanacak/3821047 ; https://x.com/tuikbilgi/status/2020755729003479459
- [19] TÜİK 2025 iç göç (2.475.019 kişi, iller arası göç oranı %2,87; İstanbul 329.912 aldı / 371.258 verdi; Antalya net hızı binde 10,3): https://www.sabah.com.tr/ekonomi/2025te-24-milyon-kisi-tasindi-7622551 ; https://www.takvim.com.tr/guncel/2026/07/14/tuik-acikladi-25-milyon-kisi-il-degistirdi
- [20] TÜİK 2024 hanehalkı tüketim harcaması payları (konut ve kira %26,0; ulaştırma %21,6; gıda %18,1; giyim %5,1; eğlence, spor ve kültür %2,3): https://www.alomaliye.com/2025/06/02/hanehalki-tuketim-harcamasi-2024/
- [21] TÜİK evlenme istatistikleri (2025: Temmuz 67.120, Ağustos 71.285, Eylül 60.738): https://dugun.com/isortagim/pazarlama-fikirleri/tuik-evlenme-istatistiklerini-acikladi/30 (arama özeti)
- [22] Pazar Yerleri Hakkında Yönetmelik (kuruluş günü belediye encümenince): https://www.resmigazete.gov.tr/eskiler/2012/07/20120712-13.htm
- [23] Kamu İhale Kanunu 4734, ilan süreleri (açık ihale 40 gün; EKAP ile 28 gün): https://dosyalar.kik.gov.tr/yardim/dokumanlar/2026_Ihale_Ilan_Sureleri_ve_Kurallari.pdf
- [24] KVKK, geniş katılımlı çevrim içi oyun kararı (28/09/2023, 2023/1645): https://www.kvkk.gov.tr/Icerik/7765/2023-1645 ; takma adlaştırma ve anonimleştirme: https://www.nesilteknoloji.com/kisisel-verilerin-anonim-hale-getirilmesi/
- [25] Claude fiyatlandırması: https://platform.claude.com/docs/en/about-claude/pricing
- [26] Türkiye'de yaz saati uygulaması (2016/9154: kalıcı UTC+3): https://tr.wikipedia.org/wiki/T%C3%BCrkiye'de_yaz_saati_uygulamas%C4%B1
- [27] 2026 Kurban Bayramı kamuda 9 gün idari izin; özel sektörde 4,5 gün: https://www.turkiyegazetesi.com.tr/haberler/kurban-bayrami-9-gun-mu-bayram-tatili-ne-zaman-basliyor-bayram-oncesi-15-gunu-idari-i-1790563 ; https://www.memurlar.net/haber/1166565/9-gunluk-kurban-bayrami-tatilinden-kimler-yararlanamayacak.html
- [28] AFAD ve resmî rakamlar, 6 Şubat 2023 (50.096 can kaybı, 11 il): https://www.aa.com.tr/tr/asrin-felaketi/kahramanmaras-merkezli-depremlerde-hayatini-kaybedenlerin-sayisi-50-bin-96-oldu/2850716
- [29] Bakkal sayısı (7 yılda 240 binden 162 bine; tarih haberde belirtilmemiş): https://www.hurriyet.com.tr/ekonomi/bakkal-sayisi-7-yilda-80-bin-azaldi-40869495 (arama özeti)
- [30] İlçe sayıları (Bursa 17, Kocaeli 12, Sakarya 16): https://www.milliyet.com.tr/egitim/haritalar/bursa-haritasi-bursa-ilceleri-nelerdir-bursa-ilinin-nufusu-kactir-kac-ilcesi-vardir-6311230 ; https://www.milliyet.com.tr/egitim/haritalar/sakarya-haritasi-sakarya-ilceleri-nelerdir-sakarya-ilinin-nufusu-kactir-kac-ilcesi-vardir-6306596
- [31] 2429 sayılı Kanun (ulusal ve resmî bayramlar): https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2429.pdf

**Proje içi dayanaklar:** [12 — Yön Taslağı](../12-yon-taslagi.md) · [11 — Ürün Dönüşü](../11-urun-donusu.md) · [06 — Simülasyon spesifikasyonu](../06-simulasyon-spesifikasyonu.md) (§1–2, §11, §13–15) · [Çeşitlilik: yönetim, askeri, teknoloji (§8)](cesitlilik-yonetim-askeri-teknoloji.md) · [Çeşitlilik: üretim katmanları (Q2)](cesitlilik-uretim-katmanlari.md) · [Capital Rift mekanikleri](capital-rift-mekanikleri.md) · [Oyun kimliği ve harman](oyun-kimligi-harman.md) · [Paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md) · [Sunucu tasarımı](sunucu-tasarimi.md) · çekirdek: `packages/cekirdek/src/{ekonomi/nufus.ts, ekonomi/uretim.ts, pazar/, tarim/iklim.ts, mulk/isletme.ts, lojistik/cozum.ts, motor.ts, tipler.ts}`, `packages/veri/icerik/{parametreler.json, icerik.json}`, `packages/veri/src/parsel.ts`, `packages/sunucu/src/saat.ts`.

**Doğrulanmayanlar ve sınırlar.** Ramazan ayı başlangıcı (≈ 8 Şubat 2027) bayramdan geri hesaptır; 2027–28 okul açılış tarihi henüz yayımlanmamıştır. Bakkal sayısı haberinin yılı belirtilmemiştir. Victoria 3, CK3 ve Anno sayfalarının bir kısmı açılmadı; arama özetleri kullanıldı. Tüm sayısal parametreler (çarpanlar, eşikler, `yerelOlcek`, göç katsayısı, olay bütçeleri) **öneridir** ve ölçülmemiştir. Çekirdek bulguları (B1–B12) kod okumasına dayanır; testle doğrulanmamıştır.
