# G9 oyuncu akışı teslim raporu (A1, Ar-Ge)

| Alan | Değer |
|---|---|
| Dal ve taban | `takim/a1/g9-akis`, taban `entegrasyon` (de9959c) |
| Dosyalar | `docs/arastirma/g9-oyuncu-akisi.md` (yeni), `docs/agent-results/G9-akis-a1.md` |
| Girdi | A3 `p4-p5-sartname.md` (4f354c0; §6.8, §7, §9, §10), K2 `G5-k2.md` ve `KIMLIK.md` (`takim/k2/g5-eposta-giris`), A2 `p4-p5-ekonomi.md` §1.9 (`takim/a2/p4-p5-ekonomi`), kendi kılavuz ve ekran incelemem |
| Doğrulama | Yalnız belge; test ve sunucu yok. Göreli bağlantılar denetlendi (kırık 0); `₺1.234` biçimi yok. A3 §6-§10 taslak olduğundan ilgili yerler `[A3-P2]` ile işaretli |

## Özet
- **Giriş 8 ekran (G-1..G-8):** e-posta, "postanı kontrol et", bağlantı onayı, görünen ad, yönlendirme, hata/ret (G5 kodlarıyla), oturum süresi (30/90 gün, sessiz bilet yenileme), çıkış.
- **Dükkân 9 ekran (D-1..D-9):** keşif, tür ve yer, maliyet kartı (pencere kuralı A3 §7.4), inşa ve ilk açılış, raf, fiyat kademesi (0,85/0,95/1,05/1,15) ve kampanya, marka, satış görünümü + Dikkat + "sen yokken", ret tablosu (DUK/MRK kodlarıyla).
- Her ekran: amaç, 30 sn kararı, sayı ve yuvarlama (hazine/gelir aşağı, maliyet yukarı), metin, telefon/masaüstü, ölçüt (A0-11, A0-12, A0-14, S1.1, A0-6), sahip (T1/K1).
- **Bulgular:** (1) görünen ad alanı bugün yok (G-4 önkoşulu); (2) inşa bitince raf boş, satış olmaz: öneri zorunlu parça; (3) dükkân bırakılamaz/yıkılamaz, "yanlış seçim kilitlemez" ile çelişir; (4) kampanya penceresi mekaniği A3 Parça 1'de yok ve A2'ye göre hep net eksi; (5) A0-11 iki ayrı zaman ister (yapı komutu, ilk satış); (6) marka adında akıllı tırnak çekirdekte reddedilir, istemci çevirmeli; (7) G5'te kayıt kapısı (davet) yok.
- **Veri istekleri (K2, lider iletir):** İ-1 görünen ad, İ-2 yuva başına `mevcut` + kasa doluluğu, İ-3 ilçe talebi (`IlceKaresi.talep?`), İ-4 kampanya komutu/durumu, İ-5 dükkân yıkım/iade politikası.

## Düzeltme turu (lider ve baş lider kararları)
- Pencere: dükkân bedeli G7'den itibaren **ithal pencerelidir** (6.000 ₺ + 20 çelik + 8 parça + 4 pencere; gerçek ithalat ≈2.400 ₺, kırılgan emir); "G8'den önce pencere yok" ve "onay bekler" ifadeleri kaldırıldı; D-3'e Pazar'dan al kısayolu ve iptal hatırlatması.
- Kampanya: veride hep 4 kademe; kapalıyken segment gizli (3 seçenek), açıkken başlat ve hak sayaçları (D-6 a/b); komut biçimi `[A3-P2]`. S3 kapandı.
- Kayıt kapısı: davetli listesi (`--davetli-liste`); G-1 ve G-2 metni davetsizi ele vermez. ZG-2 ve S7 kapandı.
- Dükkân kaldırma: inşada %50 iade, tamamlanmışta iadesiz, arsa kalır, raf mallar depoya; yeni D-8.1 ve iadesiz onay metni; komut `[A3-P2]`. ZG-5 ve S1 kapandı.
- Akıllı tırnak: istemci `’` → `'`, sunucu yalnız izinli karakteri kabul eder (D-7).

## Geri dönüşü zor kararlar
ZG-1 görünen ad kuralı (açık); ZG-2 kayıt kapısı (kapandı); ZG-3 marka adı serbest metin ve uyarı; ZG-4 kademeler (kapandı: hep 4); ZG-5 dükkân kaldırma (kapandı); ZG-6 yuvarlama kuralı; ZG-7 kampanya komutu (komut biçimi açık).

## Açık sorular
S2 görünen ad hangi sprintte; S4 birim fiyat ondalık; S5 uygulama içi tarayıcı; S6 KVKK silme yolu; S8 yatırım tahmini verisi; S9 A3 Parça 2 sonrası tablo güncellemesi; S10 `ilk_dukkan` tetiği ile A0-11 zamanı. (S1, S3, S7 kapandı.)
