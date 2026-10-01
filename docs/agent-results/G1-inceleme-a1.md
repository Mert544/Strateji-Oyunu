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
- **Lider turu (koddan kapanan sorular):** (1) "Satın al" zorunlu değil: `yapi_yerlestir` kendi hücresini kabul eder, ücretsiz 6 hücrelik yurt Çiftlik'e yeter (`komut.ts:536–566`); istemci varışta yurt dışındaki hazır arsayı seçip "Satın al"ı birincil yapıyor (`gorunum.ts:1161–1175, 781`) → hibenin ≈%20'si gereksiz harcama (B2). (2) 10.001 ₺ ayrılmış hakkın kullanılmadığını göstermez: 10.000,427 ₺ fiyat `ceil` ile 10.001, hazine 39.999,819 ₺ çipte aşağı (39.999), kartta yakın (40.000) yuvarlanıyor (B4, hesapla doğrulandı). Asıl bulgu: istemci ayrılmış hücre kavramını bilmiyor, hazır arsa ve fiyat kartı ayrılmış hücreleri göstermiyor/hedeflemiyor (H6 (i) deneyimde görünmüyor, B3). (3) "Sen yokken" görüntüleri `?donus=ornek` örnek verisinden (`DONUS_ORNEGI`, `donus-ekrani.ts:162–173`), ekranın cümle şablonu gerçek (B9).
- 10 bulgu: B1 Yerleş 2/3 oynanamaz (S3); B2 gereksiz arsa aldıran birincil düğme; B3 ayrılmış hak görünmüyor; B4 üç yuvarlama; B5 telefonda katman yığını; B6 inşa süresi haritada yok; B7 Defter telefonda gizli ve Atla yok; B8 Defter ödül çubuğu (zor); B9 "sen yokken" ilk satır; B10 açılış önerisi çelişkisi. Küre/rozet yığını BK-2 olarak tabloda.

## Geri dönüşü zor kararlar
ZK-1 Defter ödül çubuğu ve tavan gösterimi; ZK-2 hazır arsa fiyatı ve ayrılmış hücre bedelinin gösterimi; ZK-3 Yerleş'te oynanamayan ilçeyi göstermek.

## Açık sorular
A1 birleşik görüntü seti ne zaman; A5 Atla/Kapat G9'da mı; A6 telefon panel kaydırma artefaktı mı. (A2-A4 koddan kapandı.)
