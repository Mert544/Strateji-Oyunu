# 03 — Teknik Mimari

> **Özet.** Çekirdek simülasyon, Node ≥20 ve tarayıcıda ortak çalışacak şekilde **tamamen TypeScript** ile, pnpm monorepo içinde ve Vitest ile test edilerek yazılır. Simülasyon deterministik, tamsayı tabanlı ve sürekli zamanlıdır: olay kuyruğu ve tembel stok birikimi ile "tur" olmadan çalışır; lojistik ağı el yazımı bir min-maliyet akış çözücüsüyle çözülür. Arayüz ve çok oyunculu sunucu için mimari önceden planlanır ama Aşama 2 kapsamında yazılmaz. Kesin kurallar [06 — Simülasyon Spesifikasyonu](06-simulasyon-spesifikasyonu.md)'ndadır.

İlgili belgeler: [00 — Vizyon](00-vizyon-ve-kararlar.md) · [02 — Tasarım Ar-Ge](02-tasarim-arge.md) · [04 — Yol Haritası](04-yol-haritasi.md)

**Not.** Bu belge teknik araştırma önerilerini ve Aşama 2 paket yapısını anlatır. Bazı performans rakamları **hedeftir, ölçülmemiştir** ve öyle işaretlenmiştir. Dosya adları yazım anındaki durumdur; kod sözleşmesi `packages/veri/src/tipler.ts` ve `packages/cekirdek/src/tipler.ts` dosyalarındadır.

---

## 1. Yığın kararı ve gerekçesi

**Karar [Oturum]:** TypeScript pnpm monorepo + Vitest. Çekirdek Node ≥20 ve tarayıcıda ortak (`sim-core` fikri; bizdeki adı `@bolge/cekirdek`).

| Seçenek | Değerlendirme | Sonuç |
|---|---|---|
| **TypeScript her yerde** | Tek dil; aynı çekirdek sunucuda (ileride), CLI ölçüm takımında ve tarayıcıda çalışır; hızlı yineleme | **Seçildi** |
| Rust → WASM | Hızlı; tam belirli tamsayı/float modeli (tek belirsizlik NaN bit desenleri, [WebAssembly issue #619](https://github.com/WebAssembly/design/issues/619)). Ama ~60 bölgelik sim CPU sınırlı değil; WASM derleme zinciri, JS/WASM sınırı ve zor hata ayıklama ekler | Reddedildi (şimdilik) |
| Go | Tarayıcı hikâyesi yok | Reddedildi |

**Monorepo:** pnpm workspaces (katı bağımlılık, `workspace:*`; bkz. [PkgPulse karşılaştırması](https://www.pkgpulse.com/guides/best-npm-workspaces-alternatives-2026); hız iddiaları yalnızca gösterge). **Test:** [Vitest](https://vitest.dev/guide/projects) (proje/workspace desteği). Kalite kapısı: `pnpm kontrol` = tipkontrol + lint + test.

**Dil kuralı [Oturum]:** her şey Türkçe; tanımlayıcılar ASCII Türkçe (`kapasiteSaat`, `calistirKadar`).

## 2. Paket yapısı

```
packages/
  veri/        Şema ve veri: zod şeması, yükleyici/doğrulayıcı
    haritalar/   sentetik-50.json, mini-6.json
    icerik/      icerik.json (mallar, tesisler, yöntemler, teknoloji), parametreler.json
    src/         tipler.ts, yukle.ts, harita-uretici.ts (deterministik harita üreticisi)
  cekirdek/    Simülasyon çekirdeği (DOM/Node'a bağımlı değil)
    sabit-nokta (sabit.ts), prng.ts (sfc32), kuyruk.ts (öncelik kuyruğu),
    motor.ts (Simulasyon), stok.ts (tembel birikim), ozet.ts (durum özeti),
    ekonomi/, lojistik/{graf, mcf, kapsam, cozum}, askeri/, teknoloji.ts, politika.ts
  botlar/      Bot stratejileri: sanayici, tuccar, lojistikci, militarist,
               kur-ve-unut, gec-katilan + politika önayarları
  olcum/       CLI ölçüm koşum takımı: JSON + Markdown rapor
```

**Bağımlılık yönü:** `olcum → botlar → cekirdek → veri`. `veri` hiçbir pakete bağlı değildir; çekirdek yalnızca `@bolge/veri`'ye bağlıdır (`workspace:*`). İleride arayüz yalnızca `cekirdek` (ve `veri`) tüketir.

| Paket | Sorumluluk | Not |
|---|---|---|
| `@bolge/veri` | Veri biçimi, doğrulama, sentetik harita üreticisi | Ondalık sayı veri dosyalarında yasaktır; tüm sayılar tamsayı |
| `@bolge/cekirdek` | Olay motoru, stok, ekonomi, lojistik, askeri, teknoloji, politika | Saf mantık; G/Ç yok |
| `@bolge/botlar` | Deterministik bot stratejileri | Komut üretir; dünyayı yalnızca komutla değiştirir |
| `@bolge/olcum` | `pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10` | Hipotez raporları ([02 §8](02-tasarim-arge.md)) |

**Birim kuralları** (`packages/veri/src/tipler.ts`): miktar mili-birim; oran mili-birim/saat; para mili-para; süre veri dosyalarında saat/gün, çekirdekte ms; yüzdeler ppm (1.000.000 = %100).

## 3. Determinizm kuralları

İlke: **aynı tohum + aynı komut günlüğü → bit bit aynı dünya (aynı `durumOzeti`)** ([06 §1](06-simulasyon-spesifikasyonu.md)). Kaynaklar: [Rune — JS'i deterministik yapmak](https://developers.rune.ai/blog/making-js-deterministic-for-fun-and-glory), [bryc — PRNG'ler](https://github.com/bryc/code/blob/master/jshash/PRNGs.md), [Bugnet — deterministik lockstep desync](https://bugnet.io/blog/how-to-debug-desync-in-deterministic-lockstep-games).

| Tuzak | Kural | Uygulama |
|---|---|---|
| `Math.random` tohumlanamaz | Enjekte edilmiş tohumlu PRNG; **sfc32** (mulberry32, bryc araştırmasına göre 32-bit değerlerin ~üçte birini atlıyor); **alt sistem başına ayrı akış** | `ctx.rastgele(d, akis)`; `Math.random` ESLint ile yasak |
| `Math.sin/cos/pow/exp/log` motorlar ve işletim sistemleri arasında farklı olabilir | Sim durumunda kullanılmaz. `+ − * /` ve `sqrt` IEEE-kesindir | Çekirdekte transandantal `Math` yasak; `Math.sqrt/floor/min/max/abs/trunc` serbest |
| `Date.now`, `performance.now` | Sim içinde okunmaz; zaman enjekte edilen tamsayıdır | `Date`/`performance` ESLint ile yasak; zaman ms tamsayı |
| Float birikim kayması | Tamsayı mili-birim; `a × b / c` için `carpBol` (taşmaya karşı BigInt yedekli, aşağı yuvarlar) | Tüm durum tamsayı; ondalık yok |
| `Map`/`Set` gezinti sırası, nesne anahtarı sırası | Ekleme sırası deterministiktir ama **sıralı dizi gez**; nesne kimliğine anahtar verme; nesne anahtarları gezilecekse önce sırala | Diziler indeksle ve artan sırada gezilir |
| `Array.sort` varsayılanı (metin sıralama) | Açık sayısal karşılaştırıcı | Eşitlik kırma kuralları açık (ör. kimlik sırası) |
| Sıra bağımlılığı (aynı zaman damgasında olaylar) | Olay anahtarı `(t, oncelik, sira)`; `sira` artan sayaç | [§4](#4-olay-motoru-ve-tembel-birikim) |
| Gizli sapma | **Durum özeti** (FNV) + "aynı tohum → aynı özet" CI testi | `ozet.ts`, `durumOzeti` |

## 4. Olay motoru ve tembel birikim

### 4.1 Olay motoru

- **Kuyruk:** `(zaman, öncelik, sıra)` anahtarlı ikili yığın; SimJS gibi kütüphanelerin fikri ([SimJS](https://github.com/BenLauwens/simjs)), ama kendi ~60 satırlık yığınımız (bağımlılık yok, tam kontrol).
- **Ana API** ([06 §2](06-simulasyon-spesifikasyonu.md)): `calistirKadar(t)` kuyruktaki `≤ t` olayları sırayla işler, sonra `dunya.zaman = t`; `uygula(damgaliKomut)` önce `calistirKadar(komut.t)`, sonra komutu ilgili alt sisteme yönlendirir, başarılıysa günlüğe ekler ve `ctx.kirlet(d)` çağırır.
- **Saatlik ekonomi tıkı** (`saatlik_tik`) her tam sim-saatinde çalışır ve bir sonrakini planlar (güvenlik ağı; nüfus, bozulma, vergi, pazar fiyatı tıkı).
- **Dünya hızı yalnızca duvar saati → sim zamanı eşlemesidir** (1x, 6x, 24x). Sim içinde hız kavramı yoktur.
- **Hızlı ileri sarma:** 30 günlük ileri sarma çizimsiz `calistirKadar(t)` çağrısıdır. Performans **hedefi:** 30 günlük koşu < 1 sn (**ölçülecek**).
- **Sunucu faydası:** sim tembel ve sürekli zamanlı olduğu için sunucuda tık döngüsü gerekmez: komut gelince `runUntil(now)`, sonra uygula.

### 4.2 Tembel birikim (stok)

Boşta (idle) oyunların çevrimdışı ilerleme ilkesidir ([Geek Extreme](https://www.geekextreme.com/idle-games-offline-progression-math/)): durum **(miktar, oran, t0)** olarak tutulur, okumada hesaplanır.

```
anlik = miktar + floor((oran × (t − t0) + artik) / SAAT)   // [0, kapasite]'a kelepçeli; taşan israf'a
```

Kurallar ([06 §3](06-simulasyon-spesifikasyonu.md)):

1. **Oran değişince önce uzlaştır** (mevcut anlık miktarı `miktar`'a yaz, `t0`'ı güncelle), sonra yeni oranı ve **sonraki eşik olayını** (boşalma veya dolma zamanı) planla.
2. **Eski eşikler geçersizlenir:** her stokta sürüm sayacı (`surum`) vardır; eşik olayı eşleşmeyen sürümde yok sayılır.
3. **Zincir bağımlılıkları topolojik yayılır:** boşalan stok tüketicileri kısar, dolan stok israfa başlar; bu değişiklikler kirletme ve yeniden çözüm ile yayılır.
4. **Parça-doğrusal rejimler:** olaylar arasında tüm oranlar sabittir; tıklama başına hesap yoktur.
5. Hazine de bir `Stok`'tur (çok büyük kapasite, 0'ın altına inmez).

## 5. Lojistik algoritmaları

### 5.1 Ağ ve akış

Ağ ~60 düğüm ve birkaç yüz kenardır. Aşağıdaki kararlar araştırma önerisidir ve 06 ile uyumludur ([06 §5](06-simulasyon-spesifikasyonu.md)):

| Karar | Gerekçe |
|---|---|
| **El yazımı tamsayı ardışık en kısa yol min-maliyet akışı** (hedef: < 1 ms, **ölçülmedi**) | Hazır npm paketleri (`min-cost-flow`, `js-graph-algorithms`) az bakımlı ve eşitlik kırma kontrolsüz; determinizm için kendimiz yazarız |
| **Çok mallı akış: mal başına ardışık** min-maliyet akışı, sabit öncelik sırasıyla (`lojistikSirasi`), kalan kapasitede | Çok mallı tamsayı akış NP-zordur; sabit öncelik sırası deterministik ve yeterince iyidir |
| Askeri ikmal ve gıda önce; `askeriRezervPpm` kadar kapasite askeri mallara ayrılır, kullanılmayan sivile açılır | Sivil/askeri ortak kapasite ([06 §5](06-simulasyon-spesifikasyonu.md)) |
| **Kapsam = taşıma süresi üzerinde çok kaynaklı Dijkstra** | "Neresi açık" görünümü için en yakın kaynağa süre ve neden sınıfı |
| İleride: adalet/optimalite için **Garg–Könemann FPTAS** ([arXiv 1003.5907](https://arxiv.org/pdf/1003.5907)) | Mal sıralaması adaletsiz bulunursa |
| Ağ simpleksi ([arXiv 2210.02195](https://arxiv.org/pdf/2210.02195)) küçük örneklerde pratikte en hızlı | **Gerekmiyor**; yalnızca not |

**Maliyet:** yol maliyeti taşıma süresidir (parasal tarife yok). **Kenar kapasitesi:** tüm mallar ve iki yönün toplamıdır.

## 6. Lojistik ↔ tembel birikim uzlaşması

Lojistik çözümü stok oranlarını değiştirir; stok tembel birikim kullandığından ikisi arasında bir uzlaşma protokolü gerekir ([06 §2, §5](06-simulasyon-spesifikasyonu.md)):

| Kural | Açıklama |
|---|---|
| **Olay güdümlü yeniden çözüm** | Bir değişim olduğunda `lojistik.kirli = true` işaretlenir; çözüm bir `cozum` olayı olarak planlanır |
| **Aynı zaman damgasında tek çözüm** | Aynı `t` içindeki birden çok kirletme tek çözüme toplanır |
| **Eşik tetikli çözümlerde ≥ 10 sim-dakika aralık** | Eşik ve `oran_delta` kaynaklı kirletmede çözüm en erken `sonCozum + enAzCozumAraligiDakika`'dadır; titreşimi (flapping) önler. Komut, tık ve inşaat kaynaklı kirletme ise aynı `t`'de çözülür |
| **Saatlik ekonomi tıkı güvenlik ağıdır** | Kaçan bir kirletme olsa bile her sim-saatinde durum yeniden uzlaştırılır |
| **Akışlar çözümler arası parça-sabit** | Bir çözüm bir sonrakine kadar sabit akış oranları üretir |
| **Taşıma gecikmesi:** akış kaynakta hemen düşülür; hedefe `t + L`'de `oran_delta(+f)` olayıyla ulaşır | Sonraki çözüm akışı `f'` yaparsa fark `(f' − f)` aynı gecikmeyle planlanır; **yoldaki mal korunur** |
| **Komutlar:** olay kaynaklı günlük | Aynı tohum + aynı günlük = aynı dünya; emir değişimi anında geçerlidir (çözüm aynı `t`'de, `cozum` önceliğiyle) |

**Performans hedefi (ölçülecek):** 10 tohumla tam H paketi < 60 sn. Bu bir hedeftir; ölçüm sonucu ileride ölçüm raporuna (`docs/05-…`, ayrılmıştır) yazılacaktır.

## 7. Arayüz için ileriye dönük mimari (Aşama 3)

**İlke:** arayüz, simülasyon anlık görüntülerinin **saf çizicisidir.** Simülasyon durumunu değiştirmez; yalnızca komut gönderir. Böylece çizim, sim kararlarından ve determinizmden bağımsız kalır.

| Konu | Öneri | Not |
|---|---|---|
| Çizim | **PixiJS v8** (WebGL/WebGPU; [duyuru](https://pixijs.com/blog/pixi-v8-launches)) + **d3-geo** projeksiyonu | Animasyonlu akış parçacıkları, stilize görünüm |
| Gerçek karo haritası istenirse | MapLibre GL özel katmanları ([CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/)) veya [deck.gl](https://deck.gl/docs/whats-new) | Şu an kapsam dışı (gerçek harita karoları) |
| Canvas2D | Prototip için olur; yüzlerce akışta sınıra daha çabuk dayanır | Yedek seçenek |
| Gerçek coğrafya verisi | **Natural Earth** (kamu malı, izin/atıf gerekmez; "Made with Natural Earth" önerilir; 1:10m admin-1 içerir; [kullanım koşulları](https://www.naturalearthdata.com/about/terms-of-use/)) | Uyuşmazlıklı sınırlarda otoriter değildir; sınır/isim politikası açık karar ([00 A2](00-vizyon-ve-kararlar.md)) |
| Bölge üretimi | admin-1 poligonlarını **mapshaper** ile sadeleştirip 30–60 bölgeye birleştirme | Gerçek dilim seçilince; aynı veri biçimine geçilir |

## 8. Çok oyunculu için ileriye dönük mimari

Çok oyunculu sunucu ilk aşamada kapsam dışıdır ([00 A8](00-vizyon-ve-kararlar.md)); ancak olay kaynaklı günlük tasarımı sayesinde mimari buna hazırdır.

| Konu | Öneri |
|---|---|
| Model | **Olay kaynaklı yetkili sunucu:** istemciler komut (niyet) yollar; sunucu doğrular ve `(simZamaniMs, oyuncuId, komut)` günlüğüne ekler. **Durum = tohum + komut günlüğünün saf fonksiyonu** |
| Depo | **PostgreSQL olay deposu:** yalnızca-ekleme tablosu, sıralama için benzersiz kısıt, periyodik anlık görüntü ([örnek](https://github.com/eugene-khyst/postgresql-event-sourcing)) |
| Taşıma | Önce **düz WebSocket + JSON/msgpack + Fastify/ws**. [Colyseus](https://docs.colyseus.io/) oda/eşleştirme verir ama delta senkron şeması kendi durum biçimimizi çoğaltır; bu yüzden şimdilik önerilmiyor |
| Zaman | Sim tembel ve sürekli zamanlı olduğundan sunucuda tık döngüsü gerekmez: komut gelince `runUntil(now)`, sonra uygula |

Kapsam dışı kalan: hesap/giriş, ödeme ([00 §5](00-vizyon-ve-kararlar.md)).

## 9. Riskler

| Risk | Açıklama | Azaltma |
|---|---|---|
| Determinizm kaybı | Kod tabanına gizli belirsizlik (yasak API, sıralama) sızar | ESLint yasakları; "aynı tohum → aynı özet" CI testi; farklı Node sürümlerinde özet karşılaştırması (öneri) |
| Lojistik çözüm maliyeti | Çok sık kirletme çözüm sayısını artırır | ≥10 sim-dakika aralık, aynı `t`'de tek çözüm; ölçüm hedefi < 1 ms/çözüm (ölçülmedi) |
| Mal sırasına bağlı adaletsizlik | Ardışık mal başına akış, önceliksiz mallara kapasite bırakmayabilir | `lojistikSirasi` veri olarak ayarlanabilir; gerekirse Garg–Könemann |
| Tamsayı taşması | Mili-birim × ppm çarpımları büyüyebilir | `carpBol` BigInt yedeği |
| Paket sözleşmesi kayması | Paralel çalışan uygulayıcılar ortak sözleşmeyi değiştirebilir | `tipler.ts` değişiklikleri yalnızca takım lideri onayıyla |
| Performans hedeflerinin tutmaması | < 1 sn/30 gün ve < 60 sn/H paketi henüz ölçülmedi | Ölçüm raporu; gerekirse profil çıkarıp en sıcak döngüleri optimize et |
| WASM'a geçiş ihtiyacı | ~60 bölgenin ötesine büyürse CPU sınırı doğabilir | Şimdilik gerekmez; çekirdek saf ve sınırları net olduğundan ileride taşınabilir (öneri) |
| Kaynak güveni | Bazı performans iddiaları (ör. pnpm hız) gösterge niteliğinde | Kararlar performansa değil katı bağımlılık ve ekosisteme dayanır |
