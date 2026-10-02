# Pilot gözlemci brifi ve oturum takvimi şablonu (P14-8; A1)

> Yalnız belge; tekrar yok, bağlantı var. Ana kurallar: insan testi kılavuzu `insan-testi-kilavuzu.md` (§ numaralarıyla anılır); adım betiği pilot paketi `insan-testi-pilot-paketi.md` (080f670, dal `takim/a1/pilot-paketi`); **gözlem formu** `pilot-gozlem-formu.md` (1b4a95d, dal `takim/a1/pilot-gozlem-formu`); pilot planı A3 `uc-ilce-pilot-davet.md` (cdaaacd, dal `takim/a3/sonraki-dilim`: Gemlik 2, Körfez 2, Gebze 1).

## 1. Gözlemci ne yapar, ne yapmaz

Gözlemci **sessizdir**: forma yazar, kronometreyi tutar, katılımcıyla göz teması kurmaz, konuşmaz (kılavuz §4.1). Konuşan yöneticidir; tek kişi varsa yönetici gözlemcidir ve **kayıt zorunludur** (kayıt kapalıysa oturum yapılmaz).

| Yapar | Yapmaz |
|---|---|
| Olayları `dd:ss` ile forma yazar (form §2); sözleri **aynen** yazar | Yorum, öneri, övgü ya da yargı söylemez ("harikasınız", "zor değil ki") |
| Katılımcının sorduğu soruyu **birebir** forma yazar (`SO`) | Ekran ögesi adlandırmaz ("Defter'e bakın", "Yapı kur'a tıklayın", "sağdaki panelde…"); cevap verip öğretmez |
| "Kilit" sözlerini ("buna izin yok", "açılması lazım") **aynen** kutuya yazar; yalnız katılımcı kendisi söylerse | Kilit olup olmadığını doğrulamaz, yalanlamaz, açıklamaz; sormaz, ima etmez |
| İpucu verildiyse düzeyini ve zamanını yazar (`IP-L#`, kılavuz §4.6) | Kendiliğinden ipucu vermez (ipucu kararı yöneticidedir) |

## 2. Soruya nasıl karşılık verilir

Katılımcı bir şey sorarsa (kılavuz §4.5): soru forma yazılır ve **yalnız** şu söylenir: "Şimdi cevap veremem; oyunda bulabilir misiniz diye bakın, sonunda konuşuruz." İzinli söyleyişler: "Ne düşünüyorsunuz?", "Biraz daha anlatır mısınız?", "Devam edin, sizi dinliyorum.", "Şu an ne yapmaya çalışıyorsunuz?", "O konuya sonda döneceğiz." Sessizlikte merdiven L1–L5 (kılavuz §4.6; 45 sn, 90 sn, 2,5 dk, 4 dk), kararı yönetici verir.

## 3. Ne zaman müdahale edilir (yalnız hata ve gerçek tıkanma)

Kılavuz §4.7: **teknik arıza** (hata iletisi, kopma, düğmenin çalışmaması, kartın kapanmaması, tekrarlayan ret): `TE` kodu ve zaman yazılır, katılımcıya "bu oyunun hatası, sizin değil" denir, yeniden yükleme/yeniden bağlanma yardımı verilir (ipucu sayılmaz; saat durdurulmaz, arıza süresi forma yazılır). **Duygusal sıkıntı**: oturum durdurulur ("Ara verelim mi? Bu oyunun sorunu, sizin değil."), devam isteği katılımcıdan gelir. Başka hiçbir durumda müdahale yoktur: "izin yok" demek **gözlemdir**, arıza değildir.

## 4. Oturum öncesi kontrol (her katılımcı için; ☐ işaretle)

- ☐ **Hesap ve giriş:** davet adresi doğru; e-posta girişi **bugün elle iletilen bağlantıyla** çalışır (bağlantılar `/veri/posta` dosyasına düşer; gerçek posta P14, `davet-oncesi-hazirlik.md`). Bağlantı **10 dakika geçerli ve tek kullanımlıktır** (`giris.G2.govde`): oturumdan hemen önce istenir ve iletilir.
- ☐ **Atanan ilçe** (takvim tablosu) ve davet metninin önerisi; seçim serbesttir, öneri bağlayıcı değildir.
- ☐ **Cihaz:** masaüstü ya da katılımcının kendi telefonu (kılavuz §2.4); telefonda bağlantının uygulama içi tarayıcıda açılması gözlem noktasıdır (pilot paketi S1.1); web kamerası kapalı.
- ☐ **Sürüm commit'i** ve dünya (`test_<ad>`, botsuz; kılavuz §2.3; P14-7) forma yazıldı; sunucu `/hazir` 200.
- ☐ **Kayıt ve saat:** ses ve ekran kaydı hazır; sunucu `t`, duvar saati ve ofset forma yazıldı (kılavuz §2.4).
- ☐ Form (1b4a95d), kronometre, rıza kâğıdı hazır; katılımcı kodu verildi, ad forma yazılmaz.

## 5. KVKK rızasının alınma anı

**Kayıt başlamadan önce** (kılavuz §8.3 ve §8.6): rıza metni okunur ve bir kopyası verilir; veri sorumlusu ve veri kullanımı bağlantısı **{kvkk_url}** (sahip metni gelene kadar boş; metin gelmeden oturum yapılmaz). **R1–R7 ayrı ayrı** işaretlenir (paket rıza yoktur); **R1, R2 (ses), R3 (ekran) ve R4 (14 gün davranış kaydı) reddedilirse katılım olmaz**; R5, R6, R7 reddedilirse yalnız ilgili parça (G15 görüşmesi, anonim alıntı, davet) yapılmaz. Kayıt, rıza işaretlendikten **sonra** açılır; "kayıtlıyız" denmeden önce hiçbir şey kaydedilmez. Katılımcı oturum sırasında rızasını geri çekebilir (kılavuz §8.6).

## 6. Oturum takvimi şablonu (5 kişi; A3 planı: Gemlik 2, Körfez 2, Gebze 1)

Tarih ve saat sütunlarını **sahip** doldurur. Cihazı ve gözlemciyi sahip atar (kılavuz §2.4: en az iki oturum masaüstü). Oturum süresi ve S1b/S2/G15 sıralaması pilot paketinde ve kılavuz §3.1'dedir (tekrar yazılmadı).

| Katılımcı kodu | İlçe (davet atamasından) | Cihaz | Gözlemci | Yönetici | Tarih | Saat | Durum (rıza ☐ / oturum ☐ / form ☐) |
|---|---|---|---|---|---|---|---|
| K1 | Gemlik | | | | sahip | sahip | |
| K2 | Gemlik | | | | sahip | sahip | |
| K3 | Körfez | | | | sahip | sahip | |
| K4 | Körfez | | | | sahip | sahip | |
| K5 | Gebze | | | | sahip | sahip | |

Not: katılımcı **tek kullanımlıktır** (kılavuz §1.4); yedek katılımcı davet listesinde ayrıca tutulur (A3: Gemlik +2 yedek). Oturumlar P13 (Pazar'da sat) ve P14-4 (ekran düzeltmeleri) sonrasına planlanır (P14-8 bağımlılığı).
