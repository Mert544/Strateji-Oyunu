# G1 ekran incelemesi teslim raporu (A1, Ar-Ge)

| Alan | Değer |
|---|---|
| Dal ve taban | `takim/a1/ilk-saat-inceleme`, taban `entegrasyon` (d8114dd) |
| Dosyalar | `docs/arastirma/ilk-saat-ekran-incelemesi.md` (yeni), `docs/agent-results/G1-inceleme-a1.md` |
| Girdi | `SP/takim/ekran/k1`, `SP/takim/tasarim/ekran/t1`, `docs/toplanti/2`; yalnız görüntü ve belge, ağır koşu ve sunucu yok |
| Doğrulama | Belge işi; test koşulmadı. Göreli bağlantılar ve `packages/...` yolları denetlendi (kırık 0); `₺1.234` biçimi yok |

## Özet
- Öncelikli 10 bulgu (B1-B10), her biri adım, görüntü yolu, profil, ciddiyet, etkilenen ölçüt, düzeltme, sahip rol, geri dönüş sınıfı ile.
- **BK karşılaştırması:** BK-1, 3, 4, 5, 6, 8 ve para biçimi kapandı (ayrı dallarda); BK-2 ve BK-7 (T2) kaldı; BK-9 ve BK-10 değerlendirilemedi/kaldı. **K1 ve T1 görüntüleri ayrı dallardan; birleşik durum yok.** T1 setinde il düzeyi etiket çakışması (BK-1) hâlâ görünüyor; T2 setinde `09a` önce = sonra (aynı bayt).
- **Ö1:** kısmen; kapanış kanıtı olarak K1+T1+T2 birleşik yeniden çekim önerildi.
- En önemli yeni bulgular: Yerleş'te 3 ilçeden 2'si oynanamaz (S3); "Hazır arsa: Satın al 10.001 ₺" ayrı adım ve iki "Yapı kur" (hibe 50.000 ₺ taze durumda doğrulandı: `05a`); hazine çipi 39.999 ₺ ↔ kart 40.000 ₺; telefonda 4-5 katman üst üste; haritada inşa kalan süresi yok (Y10); Defter telefonda ilk ekranda yok ve Atla yok (Y2, A0-14); Defter ödül çubuğu "600 ₺ / 8.000 ₺" (DK-5 ihlali, zor).

## Geri dönüşü zor kararlar
ZK-1 Defter ödül çubuğu ve tavan gösterimi; ZK-2 hazır arsa fiyatı ve ayrılmış hücre bedelinin gösterimi; ZK-3 Yerleş'te oynanamayan ilçeyi göstermek.

## Açık sorular
A1 birleşik görüntü seti ne zaman; A2 "Satın al" zorunlu mu; A3 10.001 ₺ kaynağı; A4 "sen yokken" görüntüsü fixture mi; A5 Atla/Kapat G9'da mı; A6 telefon panel kaydırma artefaktı mı.
