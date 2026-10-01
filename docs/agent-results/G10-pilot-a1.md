# G10 pilot paketi teslim raporu (A1, Ar-Ge)

| Alan | Değer |
|---|---|
| Dal ve taban | `takim/a1/pilot-paketi`, taban `entegrasyon` (7553b55) |
| Dosyalar | `docs/arastirma/insan-testi-pilot-paketi.md` (yeni), `docs/agent-results/G10-pilot-a1.md` (bu rapor) |
| Doğrulama | Yalnız belge; test ve sunucu yok. Göreli bağlantılar ve tablo sütunları denetlendi; `₺1.234` biçimi yok; CRLF yok |

## Özet
- **Adım betiği:** S0, S1.1–S1.9 (G6 zincir dalı S1.8a, G7 dükkân dalı S1.8b dahil), S1b, S2.1–S2.7 (S2.7 koşullu dükkân durumu); her adımda beklenen ekran (G9 adları), doğru yol, gözlem noktası, süre, durum ve görüntü slug'ı.
- **Durum işaretleri:** M (mevcut), B:xx (bitmemiş işe bağlı), P (P4/G9 sonrası doğrulanacak); çalışmayan her adım işaretli, uydurma ekran yok.
- **Gözlemci formu:** doldurulabilir başlık, olay satırı, adım özeti, anket tabloları; pilot ek kodlar KM-ZINCIR/DUKKAN/RAF/FIYAT/KALDIR, YA10 (zincir) ve YA11 (dükkân).
- **Ölçüt tablosu:** Y1, Y2 (60 ve 10 dk), Y10 (işlemsel ve ham), A0-11 (üç zaman, süre = `ilkSatisT − katılım`), A0-13, A0-14, H6 (ii) (resmî, geniş, bağımsız); n=5 karşılıkları.
- **Görüntü eşleme:** ad şablonu `NN-ekran-tema-cihaz.png`; adım kodu dosya adında değil, sütunda.

## Bulgular
1. 60 dk içinde dükkân inşası ≈24 dk, pencere ithalatı ≥1 sa: S1'de en çok karar ve maliyet kartı görülür; A0-11 sessiz dönemde ölçülür.
2. Kılavuz §6.2'deki "dükkân kurulum t" ifadesi A3 §15.3 üç zamanıyla değişmeli (lider onayı).
3. Pilotta `?donus=ornek` sabit verisi kullanılmamalı (ilk saat incelemesi B9).

## Açık sorular
Pilot ekleri (H4-1b, YA10, YA11) lider onayı; Y10 tanımı (kılavuz S4); A0-11 süre tanımı.
