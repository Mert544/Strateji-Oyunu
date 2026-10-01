# Yürüyüş istemcisi (F5 ilk dilim): Gebze'de sokak düzeyi L4

> **Özet.** Haritadan (L3 parsel kartındaki "Sokakta yürü", ilçe görünümünde uzun basma ya da **Y**) ayrı bir three.js sahnesine geçiliyor. Sahnede Quaternius mankeniyle (CC0) Gebze'nin gerçek sokaklarında koşulup zıplanıyor. Sahne Protomaps z15 karolarından işçide kuruluyor: yer, kaldırımlı yollar, bina blokları ve kenar çizgileri. Karolar karakterle birlikte akıyor ve kayan orijin kullanılıyor. Kontrolcü kinematik: tıkla-git (yol bulma), WASD, Shift ile depar, Boşluk ile zıplama, telefonda dokun-git, sanal çubuk ve Zıpla düğmesi. Arsa ızgarası, parsel bayrakları, inşaat aşaması yer tutucuları, bağlamsal `[E]` hapı (satın al / yapı kur / yönet / bilgi), mini harita ve ODbL atfı var. **Ölçüm:** 14–19 çizim çağrısı (bütçe ≤60). SwiftShader'da masaüstü 1440×900'de ~19–21 fps, mobil 390×844'te ~60 fps. Tek dosya HTML 373,8 KB gzip. Ayrı `yuru.js` 248,6 KB gzip; bunun ~204 KB'ı karakter.

Ölçüm tarihi 2026-10-01. Kod `packages/istemci/src/yuru/`, testler `test/yuru-*.test.ts`, betikler `scripts/yuru-etkilesim.ts` ve `scripts/yuru-karakter.ts` içinde.

## 1. Mimari

| Parça | Dosya | Not |
|---|---|---|
| Giriş (kabukta) | `giris.ts`, `giris.css`, `three-kopru.ts` | Yığını tembel yükler. Tek dosya kipinde `import(new URL("./yuru.js"))` kullanılır; three yeniden paketlenmez, kabuk köprü nesnesini `globalThis.__bolgeThree` olarak verir |
| Sahne | `sahne.ts` | Ayrı `WebGLRenderer`. Küre zaten askıda, harita altta boşta kalır. Çizim yalnız değişiklikte yapılır; boşta 0 fps |
| Koordinat | `koordinat.ts` | Dünya metresi float64'tür: z20 Mercator hücresi × `k` (oturum enleminde m/hücre). GPU'ya yerel değer gider (dünya − orijin). Orijin karo kenarının katlarına kayar |
| Karo işçisi | `karo.worker.ts`, `mvt.ts`, `karo-geometri.ts`, `geometri-yazici.ts` | PMTiles → kendi MVT çözücümüz (bağımlılıksız) → karo başına 3 birleşik parça (yer, bina, çizgi) + ayak izleri. Tamponlar aktarılabilir olarak gönderilir |
| Karo penceresi | `karo-yonetici.ts` | Karakterin çevresinde 3×3 z15 karo, 25 karoluk önbellek. Karakter karo değiştirince yeni karolar istenir. Sis (320–860 m) pencere kenarını gizler |
| Çarpışma ve yol | `carpisma.ts`, `yol-bulma.ts` | Daire–kenar itmesiyle kayma, alt adımlar (≤ r/2), karo başına kova karması. Görüş yoksa 2 m ızgarada A*, ardından ip çekme |
| Kontrol | `kontrol.ts`, `girdi.ts` | İvmesiz hızlar: koşu 3,8, depar 6,8, çubukla yürüme 1,6 m/s. Zıplama ~0,85 m. Takip kamerası gecikmesiz |
| Karakter | `karakter.ts`, `karakter-veri.ts`, `varlik/karakter.ykr` | Örneklenmiş deri giydirme: kemik matrisleri `DataTexture`'da durur, örnek başına konum, yön, kare ve renk taşınır. **Bütün karakterler tek çizim çağrısında çizilir**; diğer oyuncular `Kalabalik.ekle()` ile eklenecek |
| Arsa | `arsa.ts`, `etkilesim.ts` | Yakın çevrede ızgara (parça başına solma). Sahiplik dolgusu ve kenarı. Bayraklar ve inşaat aşamaları tek örneklenmiş kutu ağında |
| Mini harita | `mini-harita.ts` | 120 px, kuzey yukarı. Binalar, parseller ve karakter oku çizilir. Dokununca haritaya dönülür |

**Çizim çağrıları:** karo başına 3 (yer, bina, kenar), 3×3 pencerede 27 çağrının üst sınırı vardır, ama kamera dışındaki karolar kesildiği için genelde 4–6 karo çizilir. Bunlara karakterler (1), ızgara, sahiplik dolgusu ve kenarı, bayrak + inşaat (1), gölge, halka ve hedef eklenir. Ölçülen değer 14–19.

**Yer katmanı derinlik yazmaz.** Üçgen sırasıyla çizilir (deniz → kara → arazi → su → kaldırım → asfalt), bu yüzden eş düzlemli katmanlarda z-çatışması olmaz. DEM gelince bu varsayım değişir; arayüzde yeri ayrıldı: köşelere `yukseklikAl(x, z)` uygulanacak (Mapterhorn).

## 2. Oyun hissi (sahibin 1 Ekim notu)

| İstek | Karşılık |
|---|---|
| Tepkisel, anında kontrol | İvme yok, kamera yumuşatması yok. WASD hemen koşar, Shift depar atar (1,8×), Boşluk zıplar. Dönüş 16 rad/s. Kamera fareyle sürüklenince serbest döner, tekerlekle yakınlaşır. Telefonda dinamik çubuk (sol yarı), kamera (sağ yarı), iki parmakla yakınlaşma ve Zıpla düğmesi var |
| Serbest dolaşma, duvar hissi yok | Karolar karakterle akar. Playwright 1,5 km öteye geçişte 9 karonun ~1 sn içinde yüklendiğini ve orijinin kaydığını doğruladı. Özüt Gebze bbox'ını kapsar; dışında düz zemin çizilir |
| Okunur, oyunsu görsel | Düz renkler kullanılır: kiremit çatılar, açık duvarlar ve koyu kenar çizgileriyle net bloklar. Gri asfalt ve açık kaldırımlar ayrı katmanlardır. Kamera yüksekçe durur (57°, 44 m). Alan derinliği ve sinematik efekt yok |
| Mülk uzaktan fark edilsin | Kendi parselin oyuncu renginde dolgu ve kenarla çizilir; bitişik parsel başına 9 m'lik direkte oyuncu renginde bayrak durur. Başkalarınınki gri ve küçüktür. Kendi yapının gövdesi oyuncu rengine çalar. Karakterin altında oyuncu renginde halka var |
| Etkileşim | `[E]` hapı bağlama göre değişir: boş hücrede "Satın al · fiyat" (sahte bağdaştırıcıda gerçek `parsel_al`), kendi arsanda "Arsanda yapı kur", kendi yapında "Yapını yönet", başkasının parselinde "Bilgi: ad". Yönet ve yapı kur sonraki dilime kadar devre dışı düğmedir |
| Diğer oyuncular | Karakter çizimi baştan örneklenmiş; bir oyuncu bir `ekle(renk)` ve kare başına bir `guncelle()` demek |

## 3. Ölçümler (2026-10-01, Playwright + SwiftShader, `yuru-olcum.json`)

| | Masaüstü 1440×900 | Mobil 390×844 |
|---|---|---|
| Girişten hazıra (yuru.js + karakter + 9 karo) | ~0,7 sn | ~0,75 sn |
| Çizim çağrısı (giriş, yoğun / ölçüm, seyrek) | 19 / 14 | 16 / 14 |
| Üçgen (görünen) | 55 bin / 24 bin | 51 bin / 24 bin |
| fps, koşarken (SwiftShader, CPU) | ~19–21 | ~59–60 (vsync) |
| JS CPU / kare | 0,4–0,7 ms | 0,3 ms |
| Karo işçisi (MVT → geometri) | ort. ~100 ms, en çok ~140 ms (SwiftShader makinesinde, aralık isteği dahil) | |

fps değerleri SwiftShader'a görelidir: yazılım rasterleştirici piksel sayısıyla ölçeklenir. Gerçek GPU'da dizüstü 60 fps ve telefonda 30+ fps hedefi **gerçek cihazda** doğrulanmalıdır (A1-2).

Boyutlar (`pnpm dunya`):

| Dosya | gzip |
|---|---|
| `istemci/dunya.html` (tek dosya; kabuk + küre + yürüyüş girişi) | **373,8 KB** (bütçe 400 KB; öncesi 371,8 KB) |
| `istemci/harita.js` | 293,2 KB |
| `istemci/yuru.js` (sahne + işçi + karakter satır içi) | **248,6 KB** (karakter ~204 KB, kod ~45 KB) |
| `harita-verisi/karolar/gebze-z15.pmtiles` (önbellekten kopya, repoda değil) | 9,4 MB; aralık istekleriyle ~225 KB / 9 karo |

## 4. Karakter

Quaternius "Universal Animation Library" Standard paketi itch.io'dan indirildi; CC0. Universal Base Characters (122 MB) da erişilebilirdi, ama animasyonlu manken yeterli. `scripts/yuru-karakter.ts`, `UAL1_Standard.glb` dosyasını Node'da three'nin GLTFLoader'ıyla açar. 8.546 köşe birleştirilerek 7.330'a iner (13.744 üçgen, 52 kemik). Beş animasyon kare kare örneklenir ve int16 olarak niceleştirilir: dur (Idle_Loop ilk karesi), yürü, koş (Jog_Fwd_Loop), depar (Sprint_Loop), zıpla (Jump_Loop ilk karesi). Sonuç `karakter.ykr`: 302 KB, gzip 204 KB. Lisans notu `src/yuru/varlik/LISANS.txt` içinde. Çalışma zamanında GLTFLoader, SkinnedMesh ve AnimationMixer yok, çünkü kabuğa ~40 KB eklerlerdi. Dosya yüklenemezse prosedürel kapsül yedeği devreye girer. Boşta animasyon yok: durunca tek kareli poz kalır.

## 5. Açık konular

- **Karakter boyutu:** `yuru.js`'in %80'i karakter. Daha düşük poligonlu bir manken ya da meshopt sıkıştırma ~100 KB kazandırabilir; şimdilik tembel ve tek seferlik.
- **Yönet / yapı kur:** Kart düğmeleri yer tutucu. Bina paneli (ekran 6) ve inşa modu (ekran 4) gelince bağlanacak. İnşaat aşamaları sahte bağdaştırıcıda yok; `insaatlarAl(ilce)` yeteneği eklenene dek örnek veri gösterilir ("(örnek)" diye işaretli).
- **Karo kaynağı:** Varsayılan `harita-verisi/karolar/gebze-z15.pmtiles`. `?yuru-karo=<url>` ya da `?altlik=` ile değiştirilir. Geliştirme sunucusunda bu yol yok; `?yuru-karo=/@fs/<mutlak yol>` kullanılır.
- **Zemin ve DEM:** Zemin düz kabul edildi. Mapterhorn DEM gelince yer katmanı derinlik yazmaya geçmeli ve köşeler yüksekliğe oturtulmalı.
- **Uzun çizgiler:** SwiftShader yakın düzlemi kesen uzun `LINES` çizgilerini tümden düşürüyor. Izgara bu yüzden hücre parçalarıyla çiziliyor; gerçek sürücülerde de güvenli.
- **Varsayılan bina yüksekliği:** Protomaps Gebze'de `height` yok (160/160 bina). Kat sayısı ayak izi alanına ve deterministik tohuma göre seçiliyor (2–5 kat). Okunurluk için alçak tutuldu.
