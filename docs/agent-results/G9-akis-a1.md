# G9 oyuncu akışı teslim raporu (A1, Ar-Ge)

| Alan | Değer |
|---|---|
| Dal ve taban | `takim/a1/g9-akis`, taban `entegrasyon` (de9959c) |
| Dosyalar | `docs/arastirma/g9-oyuncu-akisi.md` (yeni), `docs/agent-results/G9-akis-a1.md` |
| Girdi | A3 `p4-p5-sartname.md` (795c370, onaylı; §6.8, §7, §9, §10, §15.3), K2 `G5-k2.md` ve `KIMLIK.md` (`takim/k2/g5-eposta-giris`), A2 `p4-p5-ekonomi.md` §1.9 (`takim/a2/p4-p5-ekonomi`), kendi kılavuz ve ekran incelemem |
| Doğrulama | Yalnız belge; test ve sunucu yok. Göreli bağlantılar denetlendi (kırık 0); `₺1.234` biçimi yok. A3 795c370'e göre güncel; açık `[A3-P2]` işareti kalmadı |

## Özet
- **Giriş 8 ekran (G-1..G-8):** e-posta, "postanı kontrol et", bağlantı onayı, görünen ad, yönlendirme, hata/ret (G5 kodlarıyla), oturum süresi (30/90 gün, sessiz bilet yenileme), çıkış.
- **Dükkân 9 ekran (D-1..D-9):** keşif, tür ve yer, maliyet kartı (pencere kuralı A3 §7.4), inşa ve ilk açılış, raf, fiyat kademesi (0,85/0,95/1,05/1,15) ve kampanya, marka, satış görünümü + Dikkat + "sen yokken", ret tablosu (DUK/MRK kodlarıyla).
- Her ekran: amaç, 30 sn kararı, sayı ve yuvarlama (hazine/gelir aşağı, maliyet yukarı), metin, telefon/masaüstü, ölçüt (A0-11, A0-12, A0-14, S1.1, A0-6), sahip (T1/K1).
- **Bulgular:** (1) görünen ad alanı bugün yok (G-4 önkoşulu); (2) inşa bitince raf boş, satış olmaz: öneri zorunlu parça; (3) dükkân bırakılamaz/yıkılamaz, "yanlış seçim kilitlemez" ile çelişir; (4) kampanya penceresi mekaniği A3 Parça 1'de yok ve A2'ye göre hep net eksi; (5) A0-11 iki ayrı zaman ister (yapı komutu, ilk satış); (6) marka adında akıllı tırnak çekirdekte reddedilir, istemci çevirmeli; (7) G5'te kayıt kapısı (davet) yok.
- **Veri istekleri (K2, lider iletir):** İ-1 görünen ad (karar verildi, K2 uygular), İ-3 ilçe talebi (`IlceKaresi.talep?`, açık), **İ-6 raf `fiyatT` (yeni)**. İ-2, İ-4, İ-5 A3 795c370 ile kapandı.

## Düzeltme turu (lider ve baş lider kararları)
- Pencere: dükkân bedeli G7'den itibaren **ithal pencerelidir** (6.000 ₺ + 20 çelik + 8 parça + 4 pencere; gerçek ithalat ≈2.400 ₺, kırılgan emir); "G8'den önce pencere yok" ve "onay bekler" ifadeleri kaldırıldı; D-3'e Pazar'dan al kısayolu ve iptal hatırlatması.
- Kampanya: veride hep 4 kademe; kapalıyken segment gizli (3 seçenek), açıkken başlat ve hak sayaçları (D-6 a/b); komut biçimi `[A3-P2]`. S3 kapandı.
- Kayıt kapısı: davetli listesi (`--davetli-liste`); G-1 ve G-2 metni davetsizi ele vermez. ZG-2 ve S7 kapandı.
- Dükkân kaldırma: inşada %50 iade, tamamlanmışta iadesiz, arsa kalır, raf mallar depoya; yeni D-8.1 ve iadesiz onay metni; komut `[A3-P2]`. ZG-5 ve S1 kapandı.
- Akıllı tırnak: istemci `’` → `'`, sunucu yalnız izinli karakteri kabul eder (D-7).

## A3 795c370 turu (bu commit)
- Tüm `[A3-P2]` işaretleri ve "taslak" ifadeleri kaldırıldı; D-9 A3 §9.3 kesin kodlarıyla yeniden yazıldı (DUK-00…23, MRK-01…14, SIS-01, YON-01; DUK-20/21/22/23 dahil; MRK ret metinleri D-7'den D-9'a taşındı).
- G-4 görünen ad: karar verildi (oyuncu seçer, sunucu küçük harfli ad üretir, günde 1 değişiklik, hesap kimliği sabit); kural marka adıyla ortak (`adSozdizimiHatasi`), yasak liste yalnız sunucuda. İ-1 K2'ye "uygula" olarak kaldı.
- D-5: "neden satmıyor" artık kare alanlarından (`mevcut`, `karsilanmaPpm`, `kasaPpm`, `etkin`); eşleme tablosu eklendi. İ-2 kapandı.
- D-6: kampanya A3 §7.5b'ye göre (ayrı komut yok, kademe 0; günde ≤6 sa, haftada ≤2 gün; tam saat ve gün sonu kesmesi; paylaşılan pencere; otomatik dönüş; erken bitirmede iade yok; sim haftası). İ-4 kapandı.
- D-8.1: `dukkan_yik` (iade yok, arsa kalır, mallar zaten depoda, indirim sayacı geri verilmez, ödül tekrar verilmez); inşada mevcut `insaat_iptal`; DUK-23 iptale yönlendirir. İ-5 kapandı.
- A0-11 üç zaman (`baslangic`, `kurulus`, `ilkSatisT`); S9 ve S10 kapandı.
- **Yeni bulgular:** (1) kare'de `fiyatT` yok: 6 saatlik hız sınırı geri sayımı hesaplanamaz (yeni **İ-6**, K2); (2) `kampanya = [0,0,0]` "kapalı" ile "hak bitti"yi ayırt etmez: açık/kapalı veri paketinden okunur; (3) fırın ve şekerci 2 mal taşır, 4 yuvanın 2'si kalıcı boş: "rafında boş yuva var" uyarısı bu türlerde yanlış alarm olur (Dikkat metni düzeltildi); (4) A3 istemci notu yalnız `’ ‘` çevirir: çift akıllı tırnak ve uzun tire çevrilmez (D-7); (5) "kampanya başlat (6 saat)" düğme metni yanlıştı (pencere tam saat ve gün sonunda biter): düzeltildi.
- Yeni açık sorular: **S11** büyük harf (S-12; A3 önerisi serbest, sahip ve KVKK teyidi), **S12** sim haftası (S-18) ve "bu hafta" ifadesi.

## Geri dönüşü zor kararlar
ZG-1 görünen ad (kapandı; büyük harf S11 açık); ZG-2 kayıt kapısı (kapandı); ZG-3 marka adı serbest metin ve uyarı; ZG-4 kademeler (kapandı: hep 4); ZG-5 dükkân kaldırma (kapandı: `dukkan_yik`); ZG-6 yuvarlama kuralı; ZG-7 kampanya (kapandı: ayrı komut yok, S-18 teyit bekler).

## Açık sorular
S2 görünen ad ucu hangi sprintte; S4 birim fiyat ondalık; S5 uygulama içi tarayıcı; S6 KVKK silme yolu; S8 yatırım tahmini verisi (İ-3); S11 büyük harf (S-12); S12 sim haftası (S-18). (S1, S3, S7, S9, S10 kapandı.)
