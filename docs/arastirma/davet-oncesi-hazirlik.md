# Davet gitmeden önce hazır olması gerekenler (ilk ~20 davet; A1)

> Yalnız belge. Durum işaretleri: **hazır** (kanıt var), **P13** (paket sırada), **P14** (üç ilçe dilimi paketi), **sahip kararı** (sahipte), **kanıt yok** (kuyrukta, depoda ya da belgede kanıt bulunamadı; tahmin yazılmadı). Kaynaklar: `docs/15-sabah-raporu-2.md` §5, `SP/takim/kuyruk.md` (satır numaraları çakışık; **dal adıyla** anılır), `uc-ilce-p14-paketleri.md` (5afd984), `docs/alfa0-isletim.md`. Davet metni P13 (Pazar'da sat) sonrası gider (kuyruk 143).

## Ürün

| Konu | Sahip | Durum | Kanıt |
|---|---|---|---|
| **Pazar'da sat** (Mal sekmesinde satış, mülk kipinde liman koşulu kalkar): ilk satışın ekrandan yapılabilmesi | K3 `takim/k3/pazarda-sat` | **P13** (kod hazır, push bekliyor) | Dal adıyla: `2cbc65e` (Mal sekmesinde "Pazar'da sat", mülk kipinde liman koşulu kalktı) ve `4a27a11` (gerçek sunucu ws testi + f4 ilk satış adımı); metin tablosu SP `pazarda-sat-metin.md`, T1 önerisi SP `pazar-sat-oneri.md`. (İlk sürümde commit'leri göremedim: yerel ref'e değil dal adına bakmalıydım) |
| **İnşa bitiş bildirimi** (çiftlik ve dükkân bittiğinde toast) | K1 | **P13** (karar var, kod henüz yok) | Karar: Kod lideri, K1'in P13 listesinde (sıra: easeTo, T-3, T-4, sonra toast); Tasarım kuralları: metin Dikkat maddesiyle aynı kaynaktan, ödül dili yok, yenilemede tekrar etmez; P13'e yetişmezse P14'ün ilk işi. Bugün bitiş yalnız Dikkat sekmesinde (toast yok: T3 `pilot-ekran-ipuclari.md`); P12b `c5ab821` Dikkat metnini "Gebze: Çiftlik hazır." yapıyor |
| **Üç ilçe `f4 --uretim`** (gerçek harita + ızgara, yurtlu, 3 ilçe × masaüstü/mobil) geçti mi | K4 `takim/k4/f4-uretim` (P14-1, P14-9 kapı: O1) | **henüz koşulmadı** | Kuyruk 140: tarayıcı (Playwright) koşusu yok, ilk `--uretim` koşusu P13 push sonrası Ops penceresinde. **Geçen:** sunucu testleri (ba9c2ed): yurtlu katılım 20 ardışık, ret 0, en çok 33 ms; kamu reddi 3/3; kilitsizlik 3/3 |
| P12b: dükkân ekran düzeltmeleri (haritada ad, tek uyarı, boş rafta zarar rakamı gizli, telefon kartı), yürüyüşte gerçek yapılar, aşınma görünür | K1 `takim/k1/p-sonraki` | kapıda (main'de değil) | Kuyruk 141 (uç 1d71565, 18 commit) |
| Yuva rakamı ("katkı"/"net") ve negatif net metni; Defter sırası (T-7: satıştan sonra dükkân kartı) | K2 `takim/k2/yuva-net`, `takim/k2/defter-sira`; T1 `takim/t1/yuva-css` | **P13** | Kuyruk 139 (T1 CSS), 140 (K4 benzetimi anıyor); K2 dallarının kapı satırı **kanıt yok** |
| Yerleş kartı: dükkân düzeyi, nüfus satırı, ilçe metinleri (açılış cümlesi, Körfez) | K1 (P14-4), T3 (P14-3) | **P14** | `uc-ilce-p14-paketleri.md`; kod kanıtı yok |

## İşletim

| Konu | Sahip | Durum | Kanıt |
|---|---|---|---|
| **Site adresi ve barındırma** (sağlayıcı, alan adı, `SITE_ADRESI`) | sahip (A-2) | **sahip kararı** | `docs/15` §5; README'de `SITE_ADRESI` zorunlu (9308807). Caddy gerçek makinede **denenmedi** (`docs/15` §4.7) |
| Pilot dünyası ve açılış kanıtı (`test_<ad>`, gerçek harita + manifest, botsuz) | O3 (P14-7) | kısmen hazır | Yerel açılış kanıtı: `izgara ilce=3`, `/hazir` 200, 3,2 sn (`izgara-varsayilan-o3.md`, 45ac5b0). Docker imajı, pg ve `--uretim` açılışı: **kanıt yok** (bu ortamda Docker yok; sahip kararı/ortam) |
| **Yedek** (günde bir, 7 yedek) ve geri yükleme tatbikatı | O3 | tanımlı, **tatbikat kanıtı yok** | `alfa0-isletim.md` §4 (compose `yedek` servisi, kontrol listesi adım 14, tatbikat adım 5); gerçek makinede çalıştığına dair kanıt bulunamadı |
| **İzleme** (ekonomi metrikleri, `/metrik`) | O3 + A2 | kısmen hazır | `bc6087c` (K2-1…K2-6 gauge'ları, `METRIK_TOKEN`); A2 canlı izleme listesi `alfa0-ekonomi-izleme.md` (10 metrik); `/metrik`'te oyuncu ve ilçe etiketi yok (ilçe kararı O2 oynatmasından, `uc-ilce-pilot-davet.md` §3); O3 `metrik-baglanti` 831d4e2 (P12b). **Kim izleyecek ve kırmızıda kime haber gidecek: kanıt yok** |
| E-posta sağlayıcısı (SMTP/SES) | sahip | **sahip kararı** | `docs/15` §5; giriş postasının gerçek sağlayıcıyla gittiğine dair kanıt yok |
| **Davet listesi** (en çok 200, ilk dalga ~20) | sahip | **sahip kararı** | `docs/15` §5; denetim kontrol listesi adım 12 |

## Hukuk

| Konu | Sahip | Durum | Kanıt |
|---|---|---|---|
| **KVKK rıza/aydınlatma metni ve veri sorumlusu** | sahip | **sahip kararı** | `docs/15` §5; istemci `giris.kvkk_url` **boş** (`giris-metin.ts`), ekranda veri kullanımı bağlantısı görünmez |
| **Destek e-postası** | sahip | **sahip kararı** | `giris.destek_eposta` **boş**; "gelmedi mi" ve hesap satırları görünmez; davet metninde `{destek_eposta}` yer tutucu (893a189) |
| **Hesap silme**: akış hazır, **süre ve veri kapsamı metni** yok | sahip (metin), K2/K1 (akış) | akış **hazır**, metin **sahip kararı** | Ayarlar "Hesabı sil" ve onay bağlantısı (`akis.ts:335`, 45ac5b0); gerçek pg denemesi (`df0a728`); süre/kapsam: `docs/15` §5 |
| **Gizlilik sözü** ("adres yalnız giriş için kullanılır") | sahip | **sahip kararı** | Giriş ekranında mevcut ("Adresin yalnız giriş için kullanılır…", `giris.G1.kucuk_yazi`) ve davet metninde; sahip listesinde, onay bekliyor |
| Günlük maskesinin hukuki teyidi (Ö13) | sahip | **sahip kararı** | `docs/15` §5; teknik taraf: günlükte e-postanın hiçbir parçası yok (`docs/15` §2) |
| Geçici e-posta alanı listesi ve TÜİK nüfus verisi lisansı | sahip | **sahip kararı** | `docs/15` §5 |

## Pilot

| Konu | Sahip | Durum | Kanıt |
|---|---|---|---|
| **Gözlemci(ler)**: oturumları kim yürütecek | sahip (S1) | **sahip kararı** | `docs/15` §5 |
| **Gözlem formu** (zaman damgalı olaylar, takılma/soru/kilit algısı, 5 soru, ekran işaretleri) | A1 | **hazır** | `takim/a1/pilot-gozlem-formu` 1b4a95d (kuyruk 142) |
| Pilot paketi (adım betiği S0–S2, ölçüt tablosu) | A1 | **hazır** | `takim/a1/pilot-paketi` 080f670 (kuyruk 43; entegrasyonda değil, **kanıt: kuyruk satırı**) |
| **Davet metni** | A1 → sahip | taslak, **sahip onayı** | `takim/a1/davet-metni` 893a189 (kuyruk 143); P13 sonrası gider |
| **Oturum takvimi** (tarih, saat, kişi başına süre, ilçe dağılımı 2/2/1) | sahip + A1 | **kanıt yok** | Dağılım ve ölçüt `uc-ilce-pilot-davet.md` (99912ca); tarih ya da saat içeren belge bulunamadı |
| Pilot ancak ekranlar düzeldikten sonra | O3, K1 | **P14** | P14-8 bağımlılığı: P14-1, P14-3, P14-4, P14-7 (`uc-ilce-p14-paketleri.md`) |

**Davet gitmeden kırmızı çizgiler (kanıt satırlarından):** Pazar'da sat (P13; kod hazır, push bekliyor), inşa bitiş toast'ı (P13 listesinde, kod yok; yetişmezse P14'ün ilk işi), üç ilçe `f4 --uretim` koşusu, KVKK rıza metni + destek e-postası (ikisi şu an boş), barındırma/site adresi ve e-posta sağlayıcısı, bir gözlemci ve oturum takvimi. Yedek tatbikatı ve izleme sorumlusu için kanıt yok.
