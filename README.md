# Bölge Stratejisi

Gerçek dünya haritasında, **baştan paylaşılan ve kalıcı** bir parsel ve üretim strateji oyunu. Oyuncu devlet seçmez; gerçek bir **ilçede arsa** alarak başlar (OpenStreetMap il/ilçe sınırları, ~30 m'lik z20 hücreler). Arsasına tarla, maden, fabrika, santral, ambar, ordugâh gibi **yapılar inşa eder**; inşanın aşamaları ve süresi vardır. Üretir, satar ve isterse basit bir 3D karakterle gerçek sokaklarda **yürür**. Harita bölge → il → ilçe → arsa diye derinleşir. Altı katman ortak veriyle bağlıdır: **Tarım, Sanayi, Lojistik** (otomatik, arka planda), **Teknoloji, Pazar, Devlet**. Devlet katmanında yasa ve bütçeyi oyuncuların seçtiği muhtar ve vali yönetir. Tur yoktur: zaman gerçek zamanlıdır, ritim günlüktür; dünya asla sıfırlanmaz.

İlk hedef **Alfa-0**: Kocaeli, Sakarya ve Bursa'da, en çok 200 davetliyle çevrimiçi ve hesaplı bir kapalı alfa. Döngü: arsa al → yapı kur → üret → sat. Yürüyüş, seçimler ve hafif askeri katman **Alfa-1**'de gelir. Proje kapılarla ilerler; kapılar kanıt sırasıdır, takvim taahhüdü değildir. Ana tasarım hedefi, 20–25. günde sistemlerin tekrarından doğan sıkılmayı tasarımla önlemektir. Gerekçe ve plan: [docs/11 — Ürün Dönüşü (ADR)](docs/11-urun-donusu.md).

Şu an depo; deterministik çekirdek simülasyonu (Tarım, Sanayi ve Pazar v1; bölge kipinde), bot ve ölçüm takımını, gerçek Karadeniz verisini (53 bölge) ve three.js küre istemcisini içerir. Sunucu, hesaplar, OSM il/ilçe hiyerarşisi, parsel ve mülk modeli ile MapLibre harita **Sprint 1'de yazılıyor** ([docs/10 §5](docs/10-gorev-listesi.md#5-sprint-1-ürün-dönüşü-1-ekim)). Ödeme ve gelir modeli kapsam dışıdır.

## Hızlı başlangıç

Gereksinimler: Node.js ≥ 20 ve [pnpm](https://pnpm.io/).

```bash
pnpm install          # bağımlılıkları kur
pnpm kontrol          # tip kontrolü + lint + test
pnpm test             # yalnızca testler (Vitest)
pnpm harita:uret      # sentetik harita üreticisini çalıştır
pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10   # hipotez ölçümleri, JSON + Markdown rapor (vars. klasör: raporlar/)
pnpm olcum --hip H2,H5,H7 --tohum 1 --hizli --cikti /tmp/olcum   # hızlı (küçültülmüş) sürüm, başka klasöre
pnpm izle --gun 14 --rapor docs/olcum/v0.1-t1-3.json  # 2D inceleme sayfası: izleyici/izleyici.html
pnpm harita:gercek    # gerçek Karadeniz dilimi veri hattı (Natural Earth + USGS MRDS)
pnpm dunya            # 3D küre istemcisini tek HTML olarak derle
```

Ek komutlar: `pnpm tipkontrol`, `pnpm lint`, `pnpm test:izle`.

`pnpm olcum` seçenekleri: `--hip` (hipotezler), `--tohum` (`1-10`, `1,2,5`), `--cikti` (rapor klasörü), `--hizli` / `--tam` (boyut), `--bolge`, `--odak bolge_liman|bolge`, `--anlamli`, `--pencere-bas`, `--h1-gun` (H1 ayarları), `--ad` (dosya adı soneki ve sürüm etiketi), `--karsilastir önceki.json` (önceki ölçümle yan yana özet). Tam liste: `pnpm olcum --yardim`. Uzun ölçümler (`--tam`, çok tohum) dakikalar sürer; `nice -n 10` ile çalıştırmak makineyi rahat bırakır.

## Paket yapısı

| Paket | Görev |
|---|---|
| `packages/veri` (`@bolge/veri`) | Veri şeması (zod), yükleyici/doğrulayıcı, haritalar (`sentetik-50.json`, `mini-6.json`), içerik ve parametreler, deterministik harita üreticisi |
| `packages/cekirdek` (`@bolge/cekirdek`) | Deterministik simülasyon çekirdeği: sabit nokta, sfc32 PRNG, öncelik kuyruğu, olay motoru, tembel stok birikimi, ekonomi, lojistik (graf, min-maliyet akış, kapsam, çözüm), askeri, teknoloji, politika |
| `packages/botlar` (`@bolge/botlar`) | Bot arketipleri (sanayici, tüccar, lojistikçi, militarist, kur-ve-unut, pasif; geç katılan oyuncu H6'da `katilmaMs` ile katılan sanayicidir), fiyat/depo duyarlı ticaret ve koruma farkında savaş planlayıcısı, politika önayarları (H1 v0.2 kümesi dahil) ve simülasyon koşucusu |
| `packages/olcum` (`@bolge/olcum`) | Ölçüm CLI'ı: H1–H3 ve H5–H7 raporları (JSON + Markdown); işletimsel tanımlar [docs/02 §8.4](docs/02-tasarim-arge.md) |
| `packages/izleyici` (`@bolge/izleyici`) | Simülasyonu 2D harita, akış animasyonu ve "neresi açık" görünümüyle gösteren tek dosyalık inceleme sayfası üreticisi (hata ayıklama aracı) |
| `packages/istemci` (`@bolge/istemci`) | three.js küre istemcisi (L0): gerçek bölgeler, kamera, worker'da simülasyon, komut kaydı ve formları, Türkçe hata metinleri. Planlanan: `src/harita/` (MapLibre il/ilçe/arsa, inşa modu) ve `src/yuru/` (yürüyüş sahnesi) |
| `packages/veri-hatti` (`@bolge/veri-hatti`) | Gerçek dünya veri hattı: Natural Earth + USGS MRDS → `packages/veri/haritalar/gercek-*.json`. Planlanan: `src/osm/` (OSM il/ilçe hiyerarşisi, z20 hücre ızgarası, PMTiles) |
| `packages/protokol` *(planlanan)* | İstemci ↔ sunucu WebSocket mesaj tipleri (worker protokolünün ağ hâli) |
| `packages/sunucu` *(planlanan)* | Tek yazar Node + `ws` sunucusu: sunucu zamanı, Postgres komut günlüğü ve anlık görüntü, hız sınırı, hesaplar |

Bağımlılık yönü: `izleyici → olcum → botlar → cekirdek → veri`; `istemci → botlar, cekirdek, veri`; `veri-hatti → veri`. Planlanan: `sunucu → protokol, cekirdek, veri`; `istemci → protokol`.

## Doküman dizini

| Belge | İçerik |
|---|---|
| [docs/00-vizyon-ve-kararlar.md](docs/00-vizyon-ve-kararlar.md) | Vizyon, kararlar tablosu, zaman modeli, katman derinlikleri, kapsam, açık kararlar |
| [docs/01-rakip-ve-pazar-arastirmasi.md](docs/01-rakip-ve-pazar-arastirmasi.md) | Capital Rift profili, rakip dersleri, tutma verisi, kaynakça |
| [docs/02-tasarim-arge.md](docs/02-tasarim-arge.md) | Tazelik mekanizmaları, v0 ekonomi formülleri, lojistik UX, çevrimdışı koruma, H1–H7 ölçüm tanımları |
| [docs/03-teknik-mimari.md](docs/03-teknik-mimari.md) | Yığın, paketler, determinizm kuralları, olay motoru, lojistik algoritmaları, ileriye dönük mimari |
| [docs/04-yol-haritasi.md](docs/04-yol-haritasi.md) | Aşamalar ve kapılar, Aşama 2 iş kırılımı, Aşama 3 önerisi, açık kararlar |
| [docs/05-ilk-olcum-raporu.md](docs/05-ilk-olcum-raporu.md) | v0 → v0.1 hipotez sonuçları, değişiklikler, kapı kararı, H1 ölçüm düzeneği v0.2 (ham raporlar: `docs/olcum/`) |
| [docs/06-simulasyon-spesifikasyonu.md](docs/06-simulasyon-spesifikasyonu.md) | Çekirdek simülasyon kuralları (uygulama için tek kaynak); §10 kalibrasyon ve veri değişiklikleri (v0.1, v0.2, v0.2.1) |
| [docs/07-tasarim-onerileri.md](docs/07-tasarim-onerileri.md) | H1 teşhisi ve v0.2 tasarım önerileri |
| [docs/08-alti-katman.md](docs/08-alti-katman.md) | Altı katman (Tarım, Sanayi, Lojistik, Teknoloji, Pazar, Devlet): mekanikler, sayılar, Faz B sırası |
| [docs/09-sabah-raporu.md](docs/09-sabah-raporu.md) | Gece çalışma günlüğü ve sabah raporu |
| [docs/10-gorev-listesi.md](docs/10-gorev-listesi.md) | Önceliklendirilmiş görev listesi (24 epik), Sprint 1, riskler |
| [docs/11-urun-donusu.md](docs/11-urun-donusu.md) | **Ürün dönüşü (ADR):** paylaşılan parsel dünyası; kararlar, seçenekler, F0–F7 fazları, Alfa-0/Alfa-1, v1 oyun tasarımı (arsa, 18 yapı, yönetişim), H1–H9, arayüz v1, riskler |

**Araştırma raporları** (`docs/arastirma/`):

| Belge | İçerik |
|---|---|
| [3d-teknoloji.md](docs/arastirma/3d-teknoloji.md) | Hafif 3D gerçek dünya için render yığınları ve bütçeler |
| [acik-kaynak-ve-veri.md](docs/arastirma/acik-kaynak-ve-veri.md) | Açık kaynak referanslar, açık veri, veri hattı ve hukuki notlar |
| [alti-katman-rakipler.md](docs/arastirma/alti-katman-rakipler.md) | Altı katman için rakip ve gerçekçilik araştırması, katman başına v1 önerileri |
| [arayuz-ux.md](docs/arastirma/arayuz-ux.md) | Arayüz ve UX: L0–L4 görünüm düzeyleri, mercekler, rozetler, inşa ve satın alma, onboarding, Türkçe kuralları |
| [oyun-tasarimi-parsel.md](docs/arastirma/oyun-tasarimi-parsel.md) | Parsel dünyası oyun tasarımı: rakip dersleri, roller ve yönetişim, hafif askeri, tazelik, arazi ekonomisi, H1–H9 |
| [sokak-seviyesi-3d.md](docs/arastirma/sokak-seviyesi-3d.md) | Yürünebilir OSM istemcisi: PMTiles, MapLibre, karakter kontrolcüsü, z20 hücre ızgarası, idari sınırlar |
| [paylasilan-dunya-mimarisi.md](docs/arastirma/paylasilan-dunya-mimarisi.md) | Paylaşılan kalıcı dünya: tek yazar sunucu, Postgres günlük + anlık görüntü, kimlik, kötüye kullanım, barındırma maliyeti |

Belgeler arasında çelişki olursa simülasyon kuralları için **06**, ürün yönü ve kapsam için **11** önceliklidir.

## İlkeler

- **Determinizm.** Aynı tohum + aynı komut günlüğü → bit bit aynı dünya (aynı `durumOzeti`). Paylaşılan dünyada zaman damgasını sunucu basar; istemci yalnız niyet gönderir. Tüm durum tamsayıdır; çekirdekte `Math.random`, `Date`, `performance` ve transandantal `Math` fonksiyonları yasaktır; rastgelelik yalnızca alt sistem başına ayrı akışlı sfc32 ile üretilir.
- **Türkçe.** Dokümanlar, arayüz metinleri ve içerik Türkçedir; kodda tanımlayıcılar ASCII Türkçedir (ör. `kapasiteSaat`, `calistirKadar`).
- **Pay-to-win yok.** Kritik kararlarda parayla güç satın alınamaz; günlük giriş ödülü yoktur. Gelir modeli prototip kapsamı dışındadır.
- **Kanıta dayalı.** Tasarım hipotezleri ölçülür; eşikler başlangıç önerisidir ve ilk simülasyondan sonra kalibre edilir. Simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz; doğrulanmamış bilgiler belgelerde açıkça işaretlidir.
