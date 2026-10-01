# Araştırma — Paylaşılan Kalıcı Dünya: Sunucu, Kalıcılık, Kimlik, Arazi ve Barındırma

> **Özet.** Dünya başına **tek yazar** bir Node süreci çalışsın; mevcut çekirdeğin ruhu değişmesin. Durum Postgres'te **yalnız eklenen bir komut günlüğü ve periyodik anlık görüntüyle** saklansın. Alfa ve betada bir **Hetzner VPS**'in önüne **Cloudflare** (ücretsiz proxy, Turnstile, R2 yedekleri) konsun. Simülasyon için Colyseus, Nakama ya da SpacetimeDB kullanılmasın. Cloudflare Durable Objects ilk hedef değil, sonraki bir seçenek olarak kalsın. **İlk gerçek iş, çekirdekte olmayan serileştiricidir.** Kararlar [11 §10](../11-urun-donusu.md#10-teknik-mimari-özeti) içindedir.

**Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi. Dayanak: [03](../03-teknik-mimari.md), [06](../06-simulasyon-spesifikasyonu.md) (§1–2) ve `packages/cekirdek/src/motor.ts`. `Simulasyon.uygula` yalnız başarılı komutları `gunluk`'e ekler. `yenidenOynat` onları yeniden oynatır. `klonla`, `dunya`'nın `structuredClone`'udur. Fiyatlar Eylül/Ekim 2026 web kaynaklarındandır. Doğrulanamayanlar belirtilmiştir. **"Tahmin"** işaretli sayılar ölçülmemiştir.

**Bu rapordan sonra verilen kararlar.** Rapor parsel kaydı için H3 altıgenleri önerdi. Takım lideri **z20 kare hücreyi** seçti ([11 §3.1](../11-urun-donusu.md#31-arsa-atomu)). Hareketsizlik merdiveni 30/60/90 yerine **14/45/90 gün** oldu ([11 §7.8](../11-urun-donusu.md#78-hareketsizlik)).

İlgili belgeler: [11 — Ürün Dönüşü](../11-urun-donusu.md) · [03 — Teknik Mimari](../03-teknik-mimari.md) · [Oyun tasarımı: parsel dünyası](oyun-tasarimi-parsel.md) · [Sokak seviyesi 3D](sokak-seviyesi-3d.md)

---

## 1. Sunucu mimarisi

**Önce tek yazar.** Çekirdek, küresel bir olay kuyruğu ve küresel bir min-maliyet akış lojistik çözümünden oluşur ([06](../06-simulasyon-spesifikasyonu.md) §5). Lojistik ağları ilçeleri aşar; ilçeye göre parçalamak çözümü bozar. Bütün dilim tek süreçte çalışır.

Neden sığması beklenir (tahmin; güvenmeden önce 10× ölçekte ölçülmeli):
- Tembel oranlı stoklar yüzünden olaylar yalnız oran değişiminde, eşiklerde, inşa bitiminde ve saatlik tikte oluşur.
- Saatlik tikin maliyeti O(varlık), yani önemsizdir.
- Asıl risk lojistik çözümüdür. Kirli bayrakla tetiklenmeli, bağlı bileşen başına çözülmeli ve birleştirilmelidir. `enAzCozumAraligiDakika` mekanizması zaten var.

**Sonraki parçalama.** Yalnız ülke ya da deniz havzası düzeyinde. Parçalar arası sevkiyat ve ticaret eşzamansız mesajdır. Taşıma zaten oyun saatleri sürdüğü için gecikme oyuncuya görünmez.

**Komut yolu.**
1. İstemci WebSocket üzerinden idempotans anahtarlı bir niyet gönderir.
2. **`t`'yi sunucu basar.** İstemci asla `t` göndermez.
3. `uygula`.
4. Günlük grubu Postgres'e yaklaşık 50–100 ms'de bir toplu commit edilir.
5. Onay ve yayın yalnız commit'ten sonra yapılır.

Çökmede en çok onaylanmamış kuyruk kaybolur.

Doğrulanacak bir nokta: başarısız komutlar zamanı ilerletir ama günlüğe yazılmaz. Günlüğü başarısız komutlar olmadan yeniden oynatmanın aynı `durumOzeti`'ni verdiğini sınayan bir CI testi eklenmeli.

**İlgi alanı yönetimi ve eşzamanlama.**
- Her istemci, parseli olduğu ilçelere ve harita görüş alanına abone edilir.
- Özel veri (stok, hazine) yalnız sahibine gider. Genel veri (sahiplik, yapı siluetleri) izleyicilere gider.
- **Değer değil formül durumu gönderilir.** Her stok `(miktar, oran, t0)` olarak gider ve istemci ara değer üretir; delta yalnız oran değişince gönderilir. Bu trafiği keskin biçimde azaltır.
- Revizyon numaralı varlık düzeyi deltalar 1–2 sn'de bir gönderilir.
- Yeniden bağlanmada abone olunan ilçelerin anlık görüntüsü ve günlük `seq`'i (sıra numarası) gönderilir.
- İstemci tahmini gerekmez.

**Karşılaştırma**

| Seçenek | Lisans / durum | Uygunluk |
|---|---|---|
| Düz Node + `ws` ya da [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) | uWS Apache-2, ~9,2k yıldız, v20.71.0; npm kayıt defterinden değil GitHub'dan kurulur | **En iyisi.** Çekirdeği doğrudan kullanır. 10k boşta soket Node için kolaydır (tahmin). `ws` ile başla; ağ geçidini ancak profil gerektirirse uWS'ye taşı |
| [Colyseus](https://github.com/colyseus/colyseus) | MIT, 7,3k yıldız. [Ölçeklenebilirlik belgeleri](https://docs.colyseus.io/scalability) her odanın tek sürece ait olduğunu söyler; çok süreç için Redis gerekir | Oda ve şema eşzamanlama modeli maç odaklıdır; kendi durum eşzamanlamamızı çoğaltır. Değeri düşük |
| [Nakama](https://github.com/heroiclabs/nakama) | Apache-2, 13,5k yıldız; Postgres ya da CockroachDB ister. [TypeScript çalışma zamanı](https://heroiclabs.com/docs/nakama/server-framework/typescript-runtime/) goja üzerinde ES5, tek iş parçacıklı, async/await yok; [bu özete](https://www.blog.brightcoding.dev/2025/09/21/goja-a-pure-go-implementation-of-ecmascript-5-1/) göre goja V8'den ~20× yavaş | Simülasyonumuzu barındıramaz. Yalnız hesap/sohbet yan servisi olur; bu da işletilecek bir Go servisi ekler. Atla |
| [SpacetimeDB](https://github.com/clockworklabs/SpacetimeDB/blob/master/LICENSE.txt) | BSL 1.1, 15 Eylül 2031'de AGPLv3'e döner. Kullanım izni tek üretim örneği verir. [Maincloud](https://spacetimedb.com/pricing): Pro $25/ay, Team $250/ay | Simülasyonu reducer'larla yeniden yazmak ve kilitlenmek demek. Önerilmez |
| [Hathora](https://gameye.com/gameye-vs-hathora/) | Oyun barındırma **5 Mayıs 2026'da kapandı** (Fireworks AI satın aldı) | Ölü. Satıcıya özgü oyun arka uçlarından kaçınma kanıtı |
| [PartyKit](https://blog.partykit.io/posts/partykit-is-joining-cloudflare/) | Nisan 2024'te Cloudflare satın aldı, MIT. `partyserver` DO'lar üzerinde ince bir sarmalayıcı | Yalnız DO'ya gidersek anlamlı |

**Cloudflare Durable Objects**
- [Fiyat sayfasındaki](https://developers.cloudflare.com/durable-objects/platform/pricing/) oranlar:
  - İstekler: ayda 1M dahil, sonra $0,15/M.
  - Süre: 400k GB-s dahil, sonra $12,50/M GB-s.
  - SQLite yazma: ayda 50M satır dahil, sonra $1,00/M satır.
  - Depolama: 5 GB sonrası $0,20/GB-ay.
  - Gelen WebSocket mesajları 20:1 faturalanır; giden mesajlar ücretsiz.
- Sınırlar:
  - [DO başına 10 GB](https://developers.cloudflare.com/durable-objects/platform/limits/).
  - DO başına ~1.000 istek/sn yumuşak sınır.
  - [İzolat başına 128 MB](https://developers.cloudflare.com/workers/platform/limits/).
  - [DO başına 32.768 uyuyan WebSocket](https://community.cloudflare.com/t/durable-object-max-websocket-connections/303138); topluluk kaynaklı bir sayı.
  - Zamanlayıcılar ve alarmlar uykuyu engeller ([WebSockets rehberi](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)). Uyku bellek içi durumu da sıfırlar; simülasyonun her uyanışta yeniden kurulması gerekir.
- Sürekli açık bir dünya DO'su 0,125 GB × 2,59M sn ≈ 324k GB-s/ay kullanır. Bu dahil 400k içinde kalır; süre maliyeti sıfırdır.
- Engeller şunlardır: bütün simülasyon durumu için **128 MB bellek tavanı**, tek iş parçacıklı CPU ve satır yazma faturası. [Bir analiz](https://bex.co/blog/2026/08/22/cloudflare-zero-egress-durable-objects-storage-bill-hetzner), yazma ağırlıklı yüklerin düz bir Hetzner makinesinin ~15 katına mal olduğunu gösteriyor.
- Kullanılırsa DO, durumsuza yakın **ilçe başına ağ geçidi / dağıtım nesnesi** olarak uyar. Günlük satırları toplanır (komut başına değil, saniye grubu başına bir satır); komut başına DO'dan DO'ya çağrıdan kaçınılır.

## 2. Kalıcılık ve sürümleme

**Postgres şeması.**
- `log(seq bigserial, t, hesap, komut jsonb, kural_sur, sema_sur)`.
- `snapshots(seq, sim_t, kural_sur, sema_sur, durum_ozeti, blob zstd)`. Büyük bloblar R2'ye gidebilir.
- Anlık görüntü 1–6 saatte ya da N komutta bir; kapanışta ve dağıtımdan önce her zaman.
- **Çekirdekte henüz serileştirici yok.** `klonla` `structuredClone` kullanıyor. Yığını ve PRNG (sözde rastgele sayı üreteci) durumunu kapsayan açık bir (de)serileştirici eklenmeli; karma olarak `durumOzeti` kullanılmalı.
- Gecelik kanarya işi, farklı Node yama sürümüyle ayrı bir makinede anlık görüntü k'dan k+1'e yeniden oynatıp karmanın eşleştiğini denetler. Bunun dışında Node sürümü pinlenir.

**Kural sürümleme.** Genel uygulama, [olay şema sürümü ile kural sürümünün ayrı alanlar](https://oneuptime.com/blog/post/2026-01-30-event-driven-versioning-strategies/view) olarak anlık görüntü üst verisine basılmasıdır.
- Parametre ve kural değişiklikleri **günlüğe yazılan sistem komutlarıdır** (`kural_surumu_gec`, `parametreler.json` karmasıyla). Böylece yeniden oynatma kuralları günlükteki kesin konumda değiştirir.
- Kod değişiklikleri **dönem sınırlarında** yayımlanır: yazarı durdur, anlık görüntü al, dağıt, anlık görüntü göçünü çalıştır (v_n → v_n+1), yeniden başlat.
- Eski günlük parçalarını denetleyebilmek için dönem başına bir konteyner imajı saklanır.
- Yalnız son anlık görüntüden yeniden oynatma garanti edilir. Dönemler arası başlangıçtan bit bit aynı yeniden oynatma vaat edilmez.
- Komut şeması değişiklikleri için yükseltici (upcaster) kullanılır.
- Her dağıtımdan önce son 24 saat staging'de yeni derlemeyle gölge olarak yeniden oynatılır ve sapma raporu incelenir.

**Alternatif: parça başına SQLite** (DO SQLite, [LiteFS](https://makerstack.co/reviews/litefs-review/), [Turso](https://turso.tech/pricing)). Yalnız Cloudflare seçeneğinde değerlidir. [Bu incelemeye](https://makerstack.co/reviews/litefs-review/) göre LiteFS Cloud kullanımdan kalktı; yedekler size kalır. Tek dünya için düz Postgres daha basit ve ucuzdur. Sürekli açık bir makine için yönetilen Postgres kötü bir değerdir: [Neon](https://selfhost.dev/blog/neon-pricing-cost-of-serverless-postgres/) 1 CU sürekli açık ≈ $77/ay. VPS'te kendin barındır.

**Yedekler.**
- WAL arşivleme + gecelik `pg_dump` → [R2](https://developers.cloudflare.com/r2/pricing/) ($0,015/GB-ay, çıkış ücretsiz).
- Aylık geri yükleme tatbikatı.
- Geri yükleme testi: geri yükle, kuyruğu yeniden oynat, `durumOzeti`'ni karşılaştır.

## 3. Hesaplar, kimlik doğrulama, kötüye kullanım

**Kimlik yığını.**
- [Better Auth](https://github.com/better-auth/better-auth): MIT, 30k yıldız; passkey, magic link, sosyal OAuth ve anonim eklentileri var.
- Passkey için [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn): MIT, etkin.
- E-posta magic link + Google OAuth + passkey ile başla; e-posta için [SES](https://aws.amazon.com/ses/pricing/) (~$0,10/1.000 e-posta).
- Apple ile girişi sonra ekle. Ücretli Apple geliştirici hesabı gerekir; fiyat **doğrulanmadı**.
- Anonim hesaplar ekonomik hesap olarak kullanılmaz.

**Hile önleme çoğunlukla mimaridir.**
- `t`'yi sunucu basar.
- İstemci yalnız niyet gönderir. Simülasyon her alanı zaten `isSafeInteger` ve aralık denetimleriyle doğrular.
- Hesap başına token-kova hız sınırı ve tik başına küresel komut tavanı. İdempotans anahtarları. Komut yük boyutu tavanı.
- Günlük aynı zamanda denetim izidir. Çevrimdışı SQL, sahte işlemler, tekrarlanan küçük transferler ve düzenli aralıklı tıklama gibi anormallikleri işaretleyebilir.

**Çoklu hesap ve botlar.** Teknik bir çözümü yok; yalnız sürtünme + tespit + politika. [Turnstile](https://prosopo.io/tools/cloudflare-turnstile-pricing/) ücretsiz ama çözücü çiftlikleri ~$0,60/1.000 çözüm alıyor; yalnız bir hız tümseğidir. [Torn](https://www.torn.com/rules.php) emsali: kişi başına bir hesap; ekip tespit eder ve yasa dışı kazancı siler. [Politics & War](https://politicsandwar.com/rules/) de kişi başına bir hesap ilkesini uygular, aynı ağdan ticareti otomatik kısıtlar ve ittifak bankaları üzerinden aklamayı yasaklar.

Tasarım denetimleri:
- Yeni hesap ticaret ve transfer tavanları.
- Başka hesaplara hediye vermede gecikme.
- Pazar işlemlerinde fiyat bandı denetimi.
- Yumuşak bağlantı sinyalleri (cihaz çerezi, IP, e-posta alan adı); otomatik yasak için değil inceleme için.
- Kazançların telafi komutlarıyla geri alınması. Günlüğü komut çıkararak yeniden oynatmak mümkün ama pahalı.

## 4. Benzer oyunlar nasıl kurulmuş (kamuya açık bilgi az)

- [Capital Rift](https://capitalrift.com/) ([TikTok açıklaması](https://www.tiktok.com/@niksgames/video/7666487170605026591) üzerinden):
  - Tarayıcı, OpenStreetMap gerçek dünya haritası, tek kalıcı dünya.
  - Her yerde arsa, 35'ten fazla malla tek küresel oyuncu emir defteri, çevrimdışı işçiler.
  - Oyuncular görünür 3D avatar olarak yürür. 15k oyuncu iddiası **doğrulanamadı**.
  - **Kamuya açık mimari bilgisi yok.** Yığını varsayılmasın.
- [OpenFront.io](https://github.com/openfrontio/OpenFrontIO): AGPL-3, TypeScript, 2,8k yıldız. `/src/core` (istemci ve sunucunun paylaştığı deterministik sim) ile `/src/server`'ı ayırır. Bizimkiyle aynı biçim, ama maçları kısa, kalıcı değil. (AGPL: yalnız tasarım referansı, K22.)
- Travian ve OGame: açık kaynak klonların [bu özetine](https://github.com/Shadowss/TravianZ) göre her dünya ayrı bir sunucu ve veritabanıdır. Küresel hesap tabloları, PHP + MySQL, cron tikleri ya da istek anında tembel güncelleme kullanılır. Dünyalar sezonluktur, tek ve sonsuz değil.
- eRepublik, Rival Regions, Politics & War: kamuya açık teknik bilgi bulunamadı.

## 5. Arazi ve parsel modeli (raporun özgün önerisi)

**Parsel kaydı.**
- [H3](https://h3geo.org/docs/core-library/restable/) altıgenleri. Çözünürlük 9 ≈ 0,105 km², çözünürlük 10 ≈ 0,015 km². *(Karar: z20 kare hücre.)*
- Yalnız sahiplenilmiş parselleri somutlaştıran seyrek kayıt.
- Her hücre sınır çokgenleriyle ilçesine eşlenir.
- OpenStreetMap verisi ODbL'dir; atıf ve aynı lisansla paylaşım yükümlülükleri geçerlidir. Yayından önce denetlenmeli.
- Tablolar: `parsel(hucre, ilce, sahip, durum, degerleme, baslangic)` ve bir sahiplik geçmişi tablosu.

**Fiyat.**
- İlçe sınıfı ve yoğunluktan gelen taban fiyat × satılmış paya göre yükselen eğri. Tamsayı matematik.
- İlçe başına toplam parsel ve tek oyuncunun payı için tavanlar.
- Oyuncu sayısı arttıkça parselleri dilim dilim açmak; geç gelenler tamamen sahiplenilmiş bir haritayla karşılaşmasın.

**Elde tutma maliyeti ve hareketsizlik.** Hepsi oran temellidir ve tembel tahakkuka uyar.
- Arazi değer vergisi tembel tahakkuk eder. İsteğe bağlı: sahipler değerini kendisi beyan eder ve o değerden zorunlu satış seçeneği olur (Harberger tipi).
- 30/60/90 gün hareketsizlikte kademeli artış: önce üretim durur, sonra yapılar çürür, sonra azalan fiyatlı (Hollanda) açık artırma.
- Eski sahip, gelirin borç düşülmüş kısmını alacak olarak alır.
- Sınırlı bir tatil modu sunulur.
- Depo tavanları çevrimdışı birikimi zaten sınırlar.

**Yeni oyuncular.**
- Kapasitesi boş bir ilçede başlangıç yurdu.
- Doc 06'da zaten bir koruma durumu var (`korumada`). 7–14 güne uzatılır; satın alma tavanları ve indirimle birlikte.
- Yeni gelenler boş kapasiteli ilçelere yönlendirilir.

[Upland](https://naavik.co/deep-dives/upland-property-tycoon/) ya da [Earth2](https://earth2.io/)'deki çürüme mekanikleri hakkında birincil kanıt az bulundu. Bu bölüm kaynaklı uygulama değil, tasarım sentezidir.

## 6. Barındırma ve aylık maliyet

Hetzner fiyatları Haziran 2026 sonrasıdır ([Northflank](https://northflank.com/blog/hetzner-cloud-server-price-increases), [bitdoze](https://www.bitdoze.com/cloud-cost-optimized-plans/)): CX33 €8,49, CX43 €15,99, CCX13 €42,99. CX33 4 vCPU / 8 GB, CX43 8 vCPU / 16 GB; ikisinde de 20 TB trafik.

10k eşzamanlıda bant genişliği delta oranına göre aylık kabaca 1–13 TB (tahmin); sığar.

| Aşama | A: Cloudflare merkezli (DO + Workers + R2) | B: Hetzner + Postgres, önde Cloudflare ücretsiz CDN/Turnstile |
|---|---|---|
| Alfa, 100 eşzamanlı | ≈ $5–10 (Workers Paid tabanı + dahil kotalar) | ≈ €15–20 (CX33, yedekler, depolama) |
| Beta, 1k eşzamanlı | ≈ $15–60 | ≈ €30–45 (CX43 + bir CX33 veritabanı) |
| Açılış, 10k eşzamanlı | ≈ $100–450; toplanmazsa çoğu satır yazma ve DO isteklerinden | ≈ €100–160 (CCX13 sim, 2 × CX43 ağ geçidi, CX43 veritabanı, yedekler) |

A sütunu tahmindir; B doğrudandır. A'daki 128 MB tavanı erken parçalamaya zorlayabilir.

**Öneri: B.** Node çekirdeğini olduğu gibi kullanır, öngörülebilir maliyet verir, yük testini ve hata ayıklamayı kolaylaştırır. Cloudflare'in ücretsiz proxy'si önde WebSocket için yine çalışır (ayrıca **doğrulanmadı**); R2 yedekleri ve Turnstile da kullanılır.

## 7. Aşamalı plan ve ana riskler

**S0: yerel sunucu prototipi.**
1. `Simulasyon`'u `ws` ile saran Node sunucusu.
2. Sunucunun bastığı `t`, token-kova hız sınırları.
3. Postgres `log` + `snapshots`, simülasyon serileştiricisiyle.
4. Çökme kurtarma testi: kill -9, geri yükle, karma eşleşir.
5. Mevcut arayüze ilgi alanlı delta eşzamanlama.
6. `@bolge/botlar` botları 10× ölçekte yük üreteci olarak; lojistik çözümünü ölçmek için.
7. Parsel kaydı v0.

**S1: alfa çevrimiçi.**
1. Tek VPS, magic link + Google kimliği, Turnstile, temel yönetici paneli.
2. Yedekler + geri yükleme tatbikatı.
3. Metrikler: tik gecikmesi, günlük yazma gecikmesi, çözüm süresi.
4. Kural dönemi dağıtım prosedürü provası.
5. Arazi vergisi/çürüme v1 ve başlangıç yurdu.

Bu aşamalar [11 §5](../11-urun-donusu.md#5-fazlar-f0f7)'te F1 ve F7a olarak yeniden sıralanmıştır.

**Ana riskler**
1. **Sürümler ve Node arası determinizm.** Azaltma: pinli Node, gecelik kanarya, anlık görüntüden kurtarma, dönem sınırları.
2. **Kuralların sıcak değiştirilmesi.** Komut olarak günlüğe yazılmayan her değişiklik yeniden oynatmayı bozar. Parametre değişiklikleri günlüklü komuttur; kod değişiklikleri yalnız dönemlerde yapılır.
3. **Henüz serileştirici ve anlık görüntüden yeniden oynatma yok.** İlk gerçek iş budur.
4. **Ölçekte lojistik çözüm maliyeti.** Erken ölç.
5. **Yedekler.** Yalnız dökümleri değil geri yüklemeleri de sına.
6. **Tek yazar tek hata noktasıdır.** Alfa için kabul edilir. Azaltma: anlık görüntü + günlük kuyruğuyla hızlı yeniden başlatma; günlüğü yeniden oynatan sıcak yedek.
7. **OpenStreetMap ODbL yükümlülükleri ve çoklu hesap kötüye kullanımı.**

Okunan dosyalar: `docs/03-teknik-mimari.md`, `docs/06-simulasyon-spesifikasyonu.md`, `packages/cekirdek/src/motor.ts`.
