# Toplantı notu 1 — sahip ve baş lider (taslak, 1 Ekim 2026)

Amaç: Sprint 2–3 sonunda durumu tek sayfada görmek, sahibin vermesi gereken kararları ayırmak, sonraki fazı onaylatmak.

## 1. Bitenler (GitHub'da, `claude/brave-hawking-flv1y0`)

| Alan | Ne oldu | Commit |
|---|---|---|
| Ar-Ge dalga 4 | Üretim ağı, perakende kademeleri, dönüş deneyimi, askeri katman v1; oyun tasarım belgesi v1 (tek doğruluk kaynağı, Y-01…Y-39); sentez-2; birleşik kimlik listesi | 7e5b4b9, f1d6987, 9e3d02f |
| Kamu arsası | Çekirdekte zorunlu kural: mahalle paketi, %4 hazine, ilçe merkezi, kıyı; dikdörtgen bloklar. Gebze: ~0,6 sn, 54 KB (ilk tasarım 100 sn'yi aşıyordu). Sunucu kamu bloklarını yayımlıyor | f4723fa, 43f881a |
| Ölçüm | Parsel-v1 raporları; geç katılan için ilçe seçimi (geç çiftçi artık yapı kuruyor) | 234ff7f, 48ea528 |
| Görsel kimlik "Kâğıt ve Çini" | Renk belirteçleri, Inter + Lucide, iki tema, paneller, harita, küre; sokakta pencere, vitrin, kiremit çatı; karakter %18 büyük | f571b33 |
| Para güvenliği (P2) | Komutlar tutar taşımaz; ödül tablosu; para korunumu tam eşitlikle testli; kamu kasaları ve kamu alıcısı; kamu fiyat tavanı ithalat arbitrajını kapatır (1,035); ayrılmış hücre hesap başına 12 | c463f83 (push sırada) |
| "Sen yokken" + pg + işletim | Dönüş özeti sunucuda (kapalı kalıp yetişen = kesintisiz, testli); Postgres şema/göç/profil; Docker, sağlık/metrik ucu, yedek-geri yükleme tatbikatı | d7f0812 (push sırada) |

Ekran görüntüleri: `docs/toplanti/1/` (önce/sonra arsa, il haritası, koyu sokak, mobil Yerleş, maliyet kartı).

## 2. Baş liderin verdiği kararlar (itiraz edersen geri alınır)
- **Y-35/Y-36 askeri:** Alfa-0'da bayraklı eşkıya PvE; yağma %60 saldırana, %40 yok olur; mülk kipinde ikmal ×0,25.
- **Y-37:** `kepek` 24. mal; yerel pazar ve "sen yokken" en küçük dilimi Alfa-0'a girdi.
- **Y-38:** kamu arsası dikdörtgen adalar; halka halka açılış Alfa-1.
- **Y-39 adlar:** Muhtar = mahalle, İlçe Başkanı = ilçe, Vali = il; "NPC Kaymakam" yalnız makam boşken; devralma = kayyum.
- **Kamu fiyat tavanı:** sabit 1,10 yerine oyunda ulaşılabilecek en düşük ithalat çarpanı (bugün 1,035).
- **Y7 emsali:** ilçede üreten yoksa il düzeyine bakılır.

## 3. Senin kararını bekleyenler
| # | Soru | Öneri |
|---|---|---|
| S4-2 | Askeri birim adı: "müfreze/bölük" mü, "tümen/alay" mı? | Müfreze/bölük |
| S4-3 | Askeri sonuçta ses (varsayılan kapalı) | Evet, kapalı |
| S4-4 | Süpermarket 3 hücre mi 2 mi? | 3 |
| S4-5 | Hareketsizlik uyarı e-postası varsayılan açık mı? (hukuki görüş) | Açık, kapatılabilir |
| S4-6 | Günlük selam şeridi | Alfa-1 |
| S4-7 | Kaçırılan etkinlik için yılda bir "arşiv hakkı" | Evet |
| S4-8 | Bayram haftasında et/şekerleme talep dalgası (yalnız zamanlama) | Evet |
| S4-9 | Yürüyüş Alfa-0'da isteğe bağlı, kabul kapısı dışında | Evet |
| S4-10 | Oyun tasarım belgesi tek kaynak, bakımı baş liderde | Evet |
| T-1 | Para biçimi: `1.234 ₺` (bugünkü) mi `₺1.234` mü? | `1.234 ₺` |
| T-2 | Sokak altlığı (Protomaps) için Türkiye çıkarımı ve barındırma | Alfa-0'da yalnız alfa illeri |
| A-1 | Giriş: e-posta bağlantısı + Google; tasarım notu hazırlanıyor | Onay |
| A-2 | Barındırma (Hetzner + Cloudflare, ~€20/ay) ve ODbL için hukuki görüş | Alfa-0 öncesi başlat |

## 4. Riskler ve açık bulgular
- **H6 (geç katılan yetişebiliyor mu) hâlâ kalıyor.** Ucuz hücre payı doygun dünyada sıfıra iniyor; ayrılmış hücre fiyatı P2 ile korunuyor, yeniden ölçülecek.
- **Yük:** 100 botta komut p95 1,6–2 sn (CPU değil, olay döngüsü duraklaması). Performans işi başladı, hedef ≤300 ms.
- **İstemci bütçesi:** tek dosya HTML 397/400 KB; yeni kabuk kodu harita.js'e gitmeli.
- **Kabuk tutarsızlığı:** harita parsel dünyasında ama sağ panel hâlâ eski bölge/devlet oyununu gösteriyor (devlet adı, savaş sekmesi). Düzeltme sırada.
- **Docker imajı bu ortamda derlenmedi** (daemon yok); ilk gerçek makinede denenecek.

## 5. Sonraki faz (Alfa-0'a giden yol)
1. P3 mal kimlik kilidi ve 10 yeni mal → P4a ölçek kilitleri kalkar → P4 ekmek zinciri + dükkân → P5 cam → pencere.
2. İstemci: kamu arsası sunucu verisiyle, gerçek tarihli takvim, mülk kipi kabuğu, "sen yokken" ekranı.
3. Askeri 0a (şema) → para güvenliği + Esnaf Defteri P0 sonrası 0b (bayraklı eşkıya).
4. Sunucu: performans, gerçek giriş, Alfa-0 kurulumu (yük testi + geri yükleme tatbikatı).
5. Ölçüm: P2 sonrası spekülatör/ayrılmış yeniden koşusu, Y7 il emsali, bakım/aşınma kalibrasyonu.
