# Bölge Stratejisi

Gerçek Dünya haritasında gerçek zamanlı akan bir bölge/devlet yönetimi strateji oyunu. Oyuncu doğrudan bir bölgenin veya devletin yöneticisidir; ekonomi, lojistik, araştırma-teknoloji, politika ve askeri olmak üzere beş ayrı katman ortak veriyle birbirine bağlıdır. Capital Rift'in görünür üretim ve taşıma ağı hissi devlet ölçeğine taşınır. Tur yoktur: zaman gerçek zamanlı, ritim günlüktür; dünya hızı ayarlanabilir bir parametredir.

Proje **kapılarla** ilerler: önce arayüzsüz, deterministik bir simülasyon (**Aşama 2**) yazılır ve yedi hipotez (H1–H7) bot simülasyonlarıyla ölçülür; 2D arayüz hipotezler sınandıktan sonra gelir. Ana tasarım hedefi, 20–25. günde sistemlerin tekrarından doğan sıkılmayı tasarımla önlemektir. Kapılar kanıt sırasıdır, takvim taahhüdü değildir.

Şu an depo, Aşama 2'nin çekirdek simülasyonunu ve ölçüm koşum takımını içerir (arayüz, hesap/giriş, ödeme ve çok oyunculu sunucu henüz kapsam dışıdır). Kalıcı tek dünya modeli benimsenmiştir (sezon yok).

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
| `packages/izleyici` (`@bolge/izleyici`) | Simülasyonu 2D harita, akış animasyonu ve "neresi açık" görünümüyle gösteren tek dosyalık inceleme sayfası üreticisi |

Bağımlılık yönü: `izleyici → olcum → botlar → cekirdek → veri`.

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

Belgeler arasında çelişki olursa simülasyon kuralları için **06** önceliklidir.

## İlkeler

- **Determinizm.** Aynı tohum + aynı komut günlüğü → bit bit aynı dünya (aynı `durumOzeti`). Tüm durum tamsayıdır; çekirdekte `Math.random`, `Date`, `performance` ve transandantal `Math` fonksiyonları yasaktır; rastgelelik yalnızca alt sistem başına ayrı akışlı sfc32 ile üretilir.
- **Türkçe.** Dokümanlar, arayüz metinleri ve içerik Türkçedir; kodda tanımlayıcılar ASCII Türkçedir (ör. `kapasiteSaat`, `calistirKadar`).
- **Pay-to-win yok.** Kritik kararlarda parayla güç satın alınamaz; günlük giriş ödülü yoktur. Gelir modeli prototip kapsamı dışındadır.
- **Kanıta dayalı.** Tasarım hipotezleri ölçülür; eşikler başlangıç önerisidir ve ilk simülasyondan sonra kalibre edilir. Simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz; doğrulanmamış bilgiler belgelerde açıkça işaretlidir.
