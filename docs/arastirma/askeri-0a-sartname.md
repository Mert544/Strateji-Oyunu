# Askeri 0a uygulama şartnamesi: bayraklı eşkıya PvE hazırlığı (kimlik, şema, düğüm düzeltmesi, yağma defteri)

> **Durum.** 1 Ekim 2026, Ar-Ge görevi "askeri 0a şartnamesi" (A3). Taban: `entegrasyon` = `7553b55`; bütün `dosya:satır` göndermeleri bu tabana göredir (**doğrulandı: kod okuma**). Bu belge **kod yazmaz**; K3'ün (çekirdek ve `packages/veri/src`, tek yazar) **yorum yapmadan** kodlayabileceği kesinlikte yazılmıştır. Biçim ve ilke `docs/arastirma/p4-p5-sartname.md` ile aynıdır.
>
> **Teslim parçaları.** **Parça 1:** §0–§8 (kapsam, kilitler, mevcut kod, kimlikler ve ad kilidi, veri şeması, düğüm düzeltmesi, Ordugâh şartı, ikmal, Nöbet Evi, olay adları). **Parça 2:** yağma defteri durum şeması ve tek nokta, serileştirme ve göç, değişmez tablosu, kanıt planı (negatif kontrollerle), tam test listesi, bot ve ölçüm, sıra, rollere istek, geri dönüşü zor kararlar (GZ) ve açık sorular. **Parça 2** (yağma defteri, serileştirme, değişmez tablosu, kanıt planı, testler, sıra ve roller, GZ, açık sorular): §9–§16 (bu sürümde teslim edildi).
>
> **Girdiler (hepsi okundu).** `docs/arastirma/askeri-katman-v1.md` (**onaylı**; `AK §n` = bu belgenin bölümü; sayılar öneridir, kalibre edilmedi); `docs/12-yon-taslagi.md` §13 (Y-35, Y-36); `docs/arastirma/oyun-tasarim-belgesi-v1.md` (Y-35 satırı `:693`, AÖ-19 `:1076`, AÖ-4 `:1061`); `docs/arastirma/argelider-sentez-2.md` (D4-5 `:280`, D4-6 `:281`, G-K7 `:336`, G-K14 `:348`); `docs/arastirma/kimlik-listesi-v1.md` §2.3; çekirdek `askeri/`, `mulk/`, `dugum.ts`, `tipler.ts`, `serilestir.ts`, `derle.ts`; veri `kimlik-listesi.json`, `parametreler.json`, `veri/src/{tipler,sema,kimlik-listesi}.ts`.
>
> **İşaretler.** `(doğrulanmadı)` = bu belgenin yazımında kanıtlanmamış iddia. `(doğrulandı: yöntem)` = bu çalışmada kod okuma ya da denemeyle doğrulanmış. Ret iletileri küçük harfli ASCII-Türkçe düz dizgidir (çekirdek geleneği). **Bu belge sahip kararı vermez:** kilitli kararlar §1'de ayrı, öneriler ayrı işaretlidir.

## İçindekiler

0. Özet, kapsam, kapsam dışı
1. Kaynaklar ve kilitli kararlar
2. Mevcut kod durumu (`7553b55`) ve doğrulanan bulgular
3. Kimlikler ve ad kilidi
4. Veri şeması ve doğrulayıcı
5. Düğüm düzeltmesi ve mülk kipi kapısı (`birlik_uret`, `savunma_emri`, `savas_ilan`)
6. Ordugâh şartı ve kapasitesi
7. İkmal: çarpan ve ek yapı ikmali
8. Nöbet Evi (kamu hizmet hücresi) ve olay türü adları
9. Yağma defteri
10. Serileştirme ve göç
11. Değişmez tablosu
12. Kanıt planı (kısa)
13. Test listesi
14. Sıra, rollere istek, bot ve ölçüm
15. Geri dönüşü zor kararlar
16. Açık sorular
Ek A. Değişen dosya ve fonksiyonlar (`dosya:satır`)

---

## 0. Özet, kapsam, kapsam dışı

**Ne:** Y-35 ("bayraklı eşkıya PvE", `askeri.eskiya.etkin`) için **0a = hazırlık**: bayrak **kapalıyken** davranışı ve `durumOzeti`'ni bit bit koruyan, K3'ün bir kez yazıp bir daha dokunmayacağı şema, kimlik ve çekirdek altyapısı. Oynanış (baskın planlama ve çözüm, ganimet, uyku muamelesi, protokol, istemci, bot) **0b**'dir ve bu belgede yalnız "sonraki" diye anılır.

**0a'nın çekirdek parçaları** (AK §3.0 `(i)` tablosu, AK §3.7 kalem numaralarıyla):

| AK §3.7 kalem | İş | Bu belgede | Aşama |
|---|---|---|---|
| 1 | `birlik_uret` ve `savunma_emri` işletme düğümünü (`<il>#<oyuncu>`) tanır | §5 | **0a** |
| (yeni) | Mülk kipi kapısı: bayrak kapalıyken üç askeri komut `askeri kapali` ile reddedilir | §5 | **0a** |
| 2 | Ordugâh şartı ve birlik kapasitesi; üç ek yapı kaydı | §3, §4.2, §6 | **0a** |
| 3 | `ikmalCarpaniPpm` (mülk kipi) ve ek yapı ikmali | §7 | **0a** |
| 5 | Yağma defteri (`BolgeDurumu.yagmaPenceresi?`) ve tek nokta | §9 (Parça 2) | **0a** |
| 8 | `askeri.eskiya` parametre bloğu ve veri şeması (`etkin: false`) | §4.1 | **0a** |
| (kimlik) | Ek yapı kimlikleri, `nobet_evi`, olay türü adları, parametre adları: ad kilidi | §3, §8 | **0a** |
| 4 | Uyku muamelesi (ikmal 0, maaş 0, katılım yok) | — | 0b |
| 6, 7 | Baskın durumu, olay işleyicileri, `askeri/eskiya.ts` | — | 0b |
| 9–13 | `askeri_rezerv`, protokol/sunucu, özellik testleri (oynanış), botlar, istemci | — | 0b |

**Kapsam dışı (0b ve sonrası):** baskın planlaması, çözüm, ganimet, revir, yapı devre dışı bırakma; `Dunya.baskinlar` yazımı; olay işleyicileri; `kare` alanı ve sunucu satırları; istemci ve botlar; PvP, koruma sözleşmesi, E1–E3 eğlence artıları; Sur ve Güvenli depo.

**Tek cümlelik kabul:** 0a girince, `askeri.eskiya.etkin = false` iken (ve `eskiya` bloğu hiç yokken) **her bölge kipi altını, her mülk kipi `durumOzeti` değerini ve her mevcut testin sonucunu değiştirmeden** (yalnız ek yapı sayımı gibi veri-sayım beklentileri hariç, §13 Parça 2) şema, doğrulayıcı, kimlik kilidi ve bayrak arkasındaki kod yolları yerindedir.

---

## 1. Kaynaklar ve kilitli kararlar

| # | Karar | Durum | Kaynak |
|---|---|---|---|
| L1 | Alfa-0 askeri kapsamı **bayraklı ve iki aşamalı eşkıya PvE**: 0a hemen (diğer P0'larla paralel), 0b para güvenliği ve Esnaf Defteri P0'dan sonra. Bayrak, kapıdan 3 hafta önce AH1, AH2, AH4 ve parsel H5 (PvE + defter) geçerse açılır; geçmezse yalnız şema kalır | **kilitli** (baş lider) | Y-35 (`oyun-tasarim-belgesi-v1.md:693`), D4-5, docs/12 §13 |
| L2 | PvP yağmada alınanın %60'ı saldırana geçer, %40'ı yok olur; mülk kipinde birlik ikmali ×0,25 | **kilitli yön**; değer ve uygulama zamanı kalibrasyonla | Y-36, D4-6 |
| L3 | Askeri şema ve kimlik kilidi 0a'da, ilk içerik sürümünden önce: ek yapı kimlikleri, `eskiya_*` olay adları, `askeri.eskiya.*` parametre adları, birlik envanterinin yeri (düğüm + il nöbeti), baskın hedef birimi (ilçe), düğüm başına yağma defteri, kayıp kalıcılığı (%60/%40), ganimet mal, yağma iletimi %60 | **kilitli yön**; şema ayrıntısı **öneri** (bu belge) | AÖ-19 (`:1076`), G-K7, G-K14 |
| L4 | "Seviye ya da kilit yok, seçim var": askeri yapı, birlik ve savunma ilerleme merdiveni değildir; açılışı yalnız sermaye, arsa, girdi, işletme gideri ve H5 adalet korumaları sınırlar | **kilitli ilke** | AK K1, docs/12 §12 |
| L5 | Parsel asla el değiştirmez; savaş kontrol kazandırır; hiçbir askeri kod `HucreDurumu.sahip`'e dokunmaz | **kilitli** | docs/12 §7, AK §2.7 |
| L6 | **Para alanı taşıyan sistem ya da ajan komutu yok**; ödüller çekirdek tablosundan; ganimet mal (para değil) | **kilitli** | docs/12 §10 G4, AK K7 |
| L7 | Bölge kipi altınları (`fikstur-b1/b2/kanit`, `fikstur-goc/{bolge,mulk}-v1*`, `icerik-kimlik-kilidi.json`) birebir; yeni alanlar yalnız mülk kipinde, isteğe bağlı ve "tanımsız kalır" kalıbıyla | **kilitli** (proje değişmezi) | docs/06 §14–§15, P3/P4 pratiği |
| L8 | Birlik envanteri düğümde (`BolgeDurumu.birlikler`), komuta ilde ("il nöbeti" duruşu); baskın hedefi ilçe; Ordugâh, Karakol, Gözetleme Kulesi oyuncu ek yapısı; Nöbet Evi kamu yapısı; komutanlık yapı değil | **öneri** (AK K2, K5, K9, K10; AÖ-19 yönü kilitli) | AK §8 |
| L9 | Kayıp %60 kalıcı / %40 revir (yenilgide %15, aşağı yuvarlama); ön duyuru 24 sa (Kule 36); baskın 19:00–23:00 bandı; ilçe başına haftalık tek baskın | **öneri** (0b; bu belge yalnız parametre adlarını kilitler) | AK §3.2–§3.4 |

**AK'den bilinçli sapmalar** (K3'ün "bu belgeyle AK farklı" diye sormaması için; her biri §16'da onay ister):

1. Ek C'deki ek yapı alanları `nobetciGucu` ve `duyuruEkiSaat` **kaldırıldı**: değerlerin tek kaynağı `askeri.eskiya.karakolGuc[]` ve `askeri.eskiya.kuleEkiSaat`'tir (aynı sayının iki yerde durması çelişki doğurur). Ek yapıda yalnız `birlikKapasitesi` ve `ikmal` kalır.
2. Ek C'deki `ganimet: { muhimmatMiliBoyBasina, yakitMiliBoyBasina }` yerine **`ganimet: Record<MalId, number>`** (mal kimliği → mili-birim / boy) kullanılır: çekirdekte sabit mal adı olmaz (mevcut `insaMaliyeti` kalıbı).
3. AK §2.2'deki **arsa türü / komşuluk matrisi** (Ordugâh bahçe/konut/kıyıya kurulmaz, "ada başına ≤1", "konuta bitişik değil") **uygulanamaz**: parsel fikstüründe hücre için yalnız `sinif`, `uygun`, `engel`, `kamu` vardır; kullanım türü ve ada kavramı yoktur (**doğrulandı: kod okuma**, `veri/src/parsel.ts:58-104`). 0a'da yalnız `yuva`, `enFazlaIlBasina` ve mevcut kenar-bitişik kuralı geçerlidir (§4.2).
4. AK §3.7 kalem 3'ün "ikmal ×0,25" **değeri 0a verisinde yazılmaz** (Ar-Ge lideri kararı S-1: değer 0b'de bayrakla gelir); 0a'da yalnız şema ve çekirdek yolu vardır (`ikmalCarpaniPpm` yoksa çarpan 1 000 000). Böylece 0a'da `parametreler.json` bu alanı hiç taşımaz.

---

## 2. Mevcut kod durumu (`7553b55`) ve doğrulanan bulgular

| # | Bulgu | Dosya:satır | 0a sonucu |
|---|---|---|---|
| B1 | `birlik_uret` bölgeyi `ic.bolgeIndeks[k.bolge]` ile arar; işletme düğümü kimliği (`<il>#<oyuncu>`) `ic.bolgeIndeks`'te yoktur ⇒ mülk kipinde `birlik_uret` bugün **hiçbir zaman başarılı olamaz** (`bilinmeyen bolge`) | `askeri/uretim.ts:28` | `bolgeIndeksiBul(d, ic, id)` (§5) |
| B2 | `savunma_emri` aynı kalıp | `askeri/savas.ts:79` | aynı düzeltme |
| B3 | `savas_ilan` harita kenarlarına bakar (`komsuKenarlar`); işletme düğümünün kendi kenarı yoktur; mülk kipinde harita bölgeleri sahipsizdir | `askeri/savas.ts:102-118`; `dugum.ts:44-46` | **değişmez** (PvP Alfa-1); yalnız mülk kapısı eklenir |
| B4 | Düğümü çözen ortak yardımcı hazır: `bolgeIndeksiBul` önce `ic.bolgeIndeks`'e bakar, sonra `<il>#<oyuncu>`'yu `isletmeBul` ile çözer; **bölge kipinde sonuç `ic.bolgeIndeks[id]` ile birebir aynıdır** | `dugum.ts:13-23` | bölge kipi altınları korunur |
| B5 | İşletme düğümü `birlikler` (tür sayısı kadar sıfır), `savunma: { durus: "normal" }`, `ikmalKarsilanmaPpm: PPM` ile doğar; mülk kipinde `oyuncu_katil` bölge atamaz ⇒ **mülk dünyasında başlangıç birliği yoktur** | `mulk/isletme.ts:50-53`; `motor.ts:243-251` | ikmal çarpanı ve kapasite kuralı kapalı bayrak altında erişilemez |
| B6 | `partiBitti` düğümde de çalışır (`bolge.sahip === parti.sahip`); `UretimPartisi.bolge` bölge indeksidir | `askeri/uretim.ts:63-74` | değişmez |
| B7 | `ikmalTalebi(d, ctx, bolge)` bölge indeksiyle çalışır ve çarpansızdır; çağrılar `ekonomi/uretim.ts:354` (`bolgeHesapla`) ve `:627` (`ikmalKarsilanmaPpm` yazımı) | `askeri/uretim.ts:98-110` | §7 |
| B8 | Birlik maaşı saatlik para lavabosudur (`birlik * birlikMaasiSaat`), düğüm başınadır | `lojistik/cozum.ts:162` | değişmez |
| B9 | Ek yapılar `mulk.ekYapilar` anahtarlarıdır; **ek yapı kimlikleri** `kimlik-listesi.json` `yapilar.ekYapilar` bölümünde kilitlidir ve **`ordugah`, `karakol`, `gozetleme_kulesi` listede zaten `A0-ops` aşamasıyla vardır**; `nobet_evi` `yapilar.kamuYapilari` altında `ileride` aşamasıyla vardır | `veri/icerik/kimlik-listesi.json`; `veri/src/kimlik-listesi.ts:37,72-75,115,133-134` | §3: yeni kimlik EKLENMEZ; yalnız `nobet_evi` aşaması güncellenir |
| B10 | `parametreler.json` `mulk.ekYapilar` bugün 6 kayıt (`ambar`, `ticaret_ofisi`, `muhtarlik`, `konut`, `garaj`, `atolye_lab`); `askeri` bloğu: `ilanHazirlikSaatMin/Max`, `pencereSaat`, `kayipTavaniPpm` 250 000, `yagmaOraniPpm` 400 000, `yeniOyuncuKorumasiGun`, `araziSavunmaPpm`, `savunmaDurusuCarpaniPpm`, `birlikMaasiSaat`; **`eskiya` ve `ikmalCarpaniPpm` yok** | `veri/icerik/parametreler.json` | §4 |
| B11 | `MulkEkYapiTanimi` etki alanları: `depoKapasiteEkiMili`, `komisyonIndirimPpm`, `makasIndirimPpm`, `emirYuvasi`; şema `.strict()`; derleme `DerlenmisEkYapi` (`depoKapasiteEkiMili`, `komisyonIndirimPpm`, `makasIndirimPpm`, `emirYuvasi` sıfır varsayılanlı) | `veri/src/tipler.ts:576-598`; `veri/src/sema.ts:364-377`; `cekirdek/src/derle.ts:162-186`; `tipler.ts:124-136` | §4.2 |
| B12 | Düğümdeki biten ek yapı toplamı `ekYapiToplami(ic, b, alan)` alan listesi **kapalı birliktir** (4 sayısal alan); yeni sayısal alan bu listeye eklenmelidir | `mulk/yapi.ts:29-38` | §6 |
| B13 | Ek yapı inşa denetimleri tek yerde: `yapiTuruCoz` (kamu yapısı kapısı `:269`), `yapiPlani` (`enFazlaIlBasina` denetimi `:336`) | `mulk/komut.ts:262-279`, `:321-382` | §5 (ek yapı kapısı) |
| B14 | Olay önceliği tablosu `OLAY_ONCELIGI` ve birlik `OlayVerisi`; serileştirme olay türlerini bu tablodan doğrular | `tipler.ts:570-589` | §8: 0a'da **eklenmez** (ad rezervi) |
| B15 | Kamu `hizmet` hücreleri ilçe merkezi alanındadır, `k:ilce:<id>` sahibiyle dondurulmuş dikdörtgen bloklardır; okuma API'si `kamuBloklari(d, ilce)` sahip ve türe göre sıralı (sonra `(y0, x0)`) döndürür; kamu kuralı kapalıysa boş | `mulk/kamu.ts:514`, `:757-768` | §8 (Nöbet Evi hücresi türetilir; durum alanı yok) |
| B16 | Mülk kipi komut yolu: `birlik_uret`, `savunma_emri`, `savas_ilan` `askeriKomutu`'na yönlenir; mülk komutları `mulkKomutu`'na | `motor.ts:224-233`, `askeri/index.ts:13-24` | §5 |

---

## 3. Kimlikler ve ad kilidi

**Kural:** 0a **yeni makine-kilitli kimlik eklemez**; `kimlik-listesi.json` dosyasında ek yapı kimlikleri zaten kilitlidir (B9). İşler: (a) kimlik listesine yalnız `nobet_evi` aşaması güncellenir, (b) aşağıdaki **ad kilidi tablosu** bu belgede bağlayıcıdır ve K3 testi onu çekirdek ve veri paketine bağlar (§13 Parça 2 `askeri-ad-kilidi`).

### 3.1 Makine-kilitli kimlikler (mevcut mekanizma: `kimlik-listesi.json`, G8 yalnız-ekle)

| Kimlik | Bölüm | Aşama (bugün → 0a) | Yuva (S) | İlde en çok | Not |
|---|---|---|---|---|---|
| `ordugah` | `yapilar.ekYapilar` | `A0-ops` → **değişmez** | 3 | 2 | Bayraklı (Y-35); `A0-ops` = "Alfa-0 isteğe bağlı" tanımına uyar (`kimlik-listesi.ts:22`) |
| `karakol` | `yapilar.ekYapilar` | `A0-ops` → değişmez | 1 | 2 | |
| `gozetleme_kulesi` | `yapilar.ekYapilar` | `A0-ops` → değişmez | 1 | 1 | |
| `nobet_evi` | `yapilar.kamuYapilari` | `ileride` → **`A0-ops`** | — (kamu hücresi) | — | Askeri rapor kimlik vermemişti; kimlik-listesi-v1 §2.3 "öneri `nobet_evi`"; **bu belge kabul önerir** (§16 S-2). Aşama değişimi önek kilidini ihlal etmez (kilit kimliklerin varlığı ve sırasıdır, `asama` meta veridir; **doğrulanmadı: `dogrulaKimlikKilidi` aşamayı denetlemiyor**, `kimlik-listesi.ts:132-136` yalnız üyelik denetler) |

`mulk.ekYapilar` anahtarları `icerik.tesisTurleri` kimlikleriyle çakışamaz (`derle.ts:166`); üç kimlik tesis türü değildir ⇒ çakışma yok (**doğrulandı**: `icerik.json` tesis türü listesi).

### 3.2 Belge kilitli adlar (makine kilidi yok; K3 `askeri-ad-kilidi.test.ts` bağlar)

| Tür | Ad | Yer | 0a'da koda girer mi |
|---|---|---|---|
| Parametre bloğu | `param.askeri.eskiya` (alanlar §4.1) | `veri/src/{tipler,sema,dogrula}.ts` | **evet** (şema + doğrulayıcı; veri `etkin: false`) |
| Parametre | `param.askeri.ikmalCarpaniPpm` | aynı | **evet** |
| Ek yapı alanı | `MulkEkYapiTanimi.birlikKapasitesi`, `.ikmal` | aynı | **evet** |
| Çekirdek sabitleri | `ORDUGAH = "ordugah"`, `KARAKOL = "karakol"`, `GOZETLEME_KULESI = "gozetleme_kulesi"`, `NOBET_EVI = "nobet_evi"` | `cekirdek/src/askeri/kimlik.ts` (yeni) | **evet** |
| Durum alanı | `BolgeDurumu.yagmaPenceresi?: { baslangic: Ms; kullanilanPpm: number }` | `tipler.ts` | **evet** (§9) |
| Durum alanı (rezerv) | `Dunya.baskinlar?: BaskinDurumu[]` | `tipler.ts` | **hayır** (ad ve şekil rezervi; 0b; §9.3) |
| Olay türü (rezerv) | `eskiya_gunluk`, `eskiya_pencere_ac`, `eskiya_pencere_kapa` | `tipler.ts` `OlayVerisi`, `OLAY_ONCELIGI` | **hayır** (§8.2) |
| PvP parametresi (rezerv) | `param.askeri.yagmaIletimPpm` (Y-36: 600 000; yalnız mülk kipi PvP) | — | **hayır** (şemada alan YOK; adı rezerve) |
| Protokol alanı (rezerv) | `kare.baskinlar` | `protokol/src/kare.ts` | **hayır** (0b) |
| Ret iletileri | `askeri kapali`, `askeri kapali: <yapi>`, `ordugah gerekli: <dugum>`, `ordugah kapasitesi yetersiz: <kullanilan> + <adet> > <kapasite>` | `askeri/*.ts`, `mulk/komut.ts` | **evet** (§5, §6) |

---

## 4. Veri şeması ve doğrulayıcı

Sınır (baş lider; P4 ile aynı): **önce K3 şemayı isteğe bağlı/no-op indirir** (`veri/src/{tipler,sema,dogrula}.ts`, testler); **sonra T3 değer yazar** (`parametreler.json`, `kimlik-listesi.json`). `sema.ts` her yerde `.strict()` olduğundan şema değişmeden değer yazılırsa yükleme hata verir. Yeni alanların hepsi **isteğe bağlıdır**; hiçbiri yoksa davranış ve durum özeti bugünküyle aynıdır.

### 4.1 `param.askeri.eskiya` (yeni isteğe bağlı blok; bayrak kapalı)

`veri/src/tipler.ts:501` `askeri` nesnesine iki isteğe bağlı alan; `veri/src/sema.ts:532` `askeri` şemasına (`.strict()`) karşılıkları:

```ts
askeri: {
  // ... mevcut alanlar değişmez ...
  /** Mülk kipinde birlik ikmali çarpanı (ppm; 0 < değer ≤ 1 000 000). Yok = 1 000 000 (kimlik). Bölge kipinde ve harita bölgelerinde UYGULANMAZ (§7). */
  ikmalCarpaniPpm?: number;
  /** Eşkıya PvE (Y-35). Blok yok = özellik yok; `etkin: false` = özellik kapalı (davranış aynı). */
  eskiya?: AskeriEskiyaParametreleri;
};

export interface AskeriEskiyaParametreleri {
  /** Özellik bayrağı. false: mülk kipinde askeri komutlar ve askeri ek yapılar reddedilir (`askeri kapali`). true yapmak veri değişikliğidir (kural dönemi) ve ancak kapı ölçütleriyle (Y-35: AH1, AH2, AH4, parsel H5) yapılır. */
  etkin: boolean;
  // --- baskın büyüklüğü (0b; adları 0a'da kilitlenir) ---
  /** İlçe servet eşiği ve boy adımı (mili-para; ₺250.000 = 250 000 000). boy = min(enCokBoy, ⌊S ÷ servetAdimiMili⌋); S < servetEsigiMili ⇒ baskın yok. */
  servetEsigiMili: number;
  servetAdimiMili: number;
  enCokBoy: number;
  /** 1 boy = bu kadar savunma/baskın gücü (Piyade Tümeni eşdeğeri). */
  boyGucu: number;
  // --- planlama ---
  gunlukOlasilikPpm: number;
  /** Bekleme sayacı (A2 E-2; Ar-Ge lideri): ilçenin SON BASKIN GÜNÜNDEN (baskının gerçekleştiği sim günü) sayılır, planlama gününden DEĞİL. Planlama günü D'de ilçe uygundur ⇔ D − sonBaskınGünü ≥ beklemeGun (hiç baskın görmemişse sınır yok). Ortalama baskın aralığı = planlamaOncesiGun + beklemeGun + 1/gunlukOlasilik − 1 (gün). */
  beklemeGun: number;
  /** Baskın bandı: günün `bantBaslangicSaat` saatinden başlayan `dilimSayisi` ardışık `dilimSaat` saatlik dilim (TRT; sim günü 00:00 TRT, S-18). */
  bantBaslangicSaat: number;
  dilimSayisi: number;
  dilimSaat: number;
  /** Planlama anından en az bu kadar gün sonrasına planlanır. */
  planlamaOncesiGun: number;
  // --- duyuru ---
  duyuruSaat: number;
  kuleEkiSaat: number;
  tahminAltPpm: number; tahminUstPpm: number;
  kuleTahminAltPpm: number; kuleTahminUstPpm: number;
  // --- savunma gücü ---
  nobetEviGuc: number;
  /** İlçede 1. ve 2. Karakol'un gücü (sırasıyla). Üçüncü ve sonrası etkisizdir. */
  karakolGuc: [number, number];
  // --- sonuç (0b) ---
  /** Tek baskında mal başına yağma oranı (ppm; ilçe payıyla çarpılır; defter tavanıyla kelepçelenir). */
  yagmaOraniPpm: number;
  yagmaPenceresiSaat: number;
  yapiDevreDisiPpm: number; yapiDevreDisiSaat: number;
  yenilgiKayipPpm: number; galibiyetKayipPpm: number;
  reviriGeriPpm: number; reviriGeriSaat: number;
  /** Kalkan bittikten sonraki 14 gün (15–28. gün) PvE yağma oranı (ppm; yumuşatma). */
  kalkanSonrasiYagmaPpm: number;
  /** Ganimete katılmak için gereken en az katkı (savunma kazanan baskın gücüne oranı, ppm). */
  ganimetKatkiAltPpm: number;
  /** Ganimet tablosu: mal kimliği → mili-birim / boy (para alanı YOK; L6). */
  ganimet: Record<MalId, number>;
  /** İlçe başına haftalık ganimet tavanı (mili-para, taban değer). */
  ilceHaftalikGanimetTavaniMili: number;
}
```

**Öneri değerleri (AK Ek C; T3 yazar):**

```jsonc
// "ikmalCarpaniPpm": 0a verisinde YOK (S-1; 0b: bayrakla birlikte 250000)
"eskiya": {
  "etkin": false,
  "servetEsigiMili": 250000000, "servetAdimiMili": 500000000, "enCokBoy": 8, "boyGucu": 100,
  "gunlukOlasilikPpm": 250000, "beklemeGun": 3,
  "bantBaslangicSaat": 19, "dilimSayisi": 4, "dilimSaat": 1, "planlamaOncesiGun": 2,
  "duyuruSaat": 24, "kuleEkiSaat": 12,
  "tahminAltPpm": 750000, "tahminUstPpm": 1250000, "kuleTahminAltPpm": 900000, "kuleTahminUstPpm": 1100000,
  "nobetEviGuc": 100, "karakolGuc": [100, 50],
  "yagmaOraniPpm": 250000, "yagmaPenceresiSaat": 24,
  "yapiDevreDisiPpm": 250000, "yapiDevreDisiSaat": 24,
  "yenilgiKayipPpm": 150000, "galibiyetKayipPpm": 0, "reviriGeriPpm": 400000, "reviriGeriSaat": 24,
  "kalkanSonrasiYagmaPpm": 50000, "ganimetKatkiAltPpm": 100000,
  "ganimet": { "muhimmat": 3000, "yakit": 2000 },
  "ilceHaftalikGanimetTavaniMili": 6500000
}
```

**Değerler A2 kalibrasyonundan** (`takim/a2/eskiya-kalibrasyon` `79ea178`, baş lider onaylı; **değerler 0b verisine girer, 0a'da `etkin: false` kalır**): `servetAdimiMili` 500 000 ₺, `gunlukOlasilikPpm` 250 000, `yagmaOraniPpm` ve `yapiDevreDisiPpm` 250 000 (E-4: oran %25, yalnız 0b verisi). **`beklemeGun` notu:** A2'nin `5`i bekleme sayacını **planlamadan** saydı (ortalama aralık 8 gün, ilçe başına haftada 0,88 baskın). Sayaç **baskın gününden** tanımlandığı için (yukarıdaki alan açıklaması) ve baskın planlamadan `planlamaOncesiGun = 2` gün sonra olduğundan eşdeğer değer **3**'tür (`D2 − P1 ≥ 5` ⇔ `D2 − B1 ≥ 3`; ortalama aralık `2 + 3 + 4 − 1 = 8` gün). Örnekte 3 yazılıdır; 5 yazılırsa ortalama aralık 10 gün olur (A2 tablosu geçerli kalmaz). **Karar için Ar-Ge lideri/baş lider onayı: S-10.**

**Doğrulayıcı (Katman 1: `veri/src/sema.ts` zod `.strict()` + `veri/src/dogrula.ts` `dogrulaParametreler` yanına; Node-only değildir, çekirdek paketine girmez):**

| # | Kural | İleti (veri doğrulayıcı) |
|---|---|---|
| VA1 | `askeri.ikmalCarpaniPpm` tamsayı, `0 < v ≤ 1 000 000` | `askeri.ikmalCarpaniPpm: (0, 1000000] araliginda olmali` |
| VA2 | `eskiya` varsa `etkin` mantıksal (zorunlu); aşağıdaki alanların **hepsi zorunludur** (blok ya hiç yok ya tam) | zod: eksik alan |
| VA3 | `servetEsigiMili`, `servetAdimiMili`, `boyGucu`, `enCokBoy`, `dilimSayisi`, `dilimSaat`, `planlamaOncesiGun`, `duyuruSaat`, `yagmaPenceresiSaat`, `yapiDevreDisiSaat`, `reviriGeriSaat` pozitif tamsayı; `beklemeGun`, `kuleEkiSaat`, `nobetEviGuc`, `galibiyetKayipPpm`, `ilceHaftalikGanimetTavaniMili` ≥ 0 | zod |
| VA4 | `gunlukOlasilikPpm ∈ (0, 1 000 000]`; tüm `*Ppm` alanları `[0, 1 000 000]` (tahmin üst sınırları hariç: `tahminUstPpm`, `kuleTahminUstPpm` ≤ 2 000 000) | zod |
| VA5 | `bantBaslangicSaat ∈ [0, 23]` ve `bantBaslangicSaat + dilimSayisi × dilimSaat ≤ 24` | `askeri.eskiya: baskin bandi gune sigmiyor` |
| VA6 | `duyuruSaat + kuleEkiSaat ≤ planlamaOncesiGun × 24` (duyuru planlama anından önce başlayamaz) | `askeri.eskiya: duyuru suresi planlama oncesinden uzun` |
| VA7 | `tahminAltPpm ≤ 1 000 000 ≤ tahminUstPpm`; `tahminAltPpm ≤ kuleTahminAltPpm ≤ 1 000 000 ≤ kuleTahminUstPpm ≤ tahminUstPpm` (Kule tahmini daraltır) | `askeri.eskiya: kule tahmin araligi genel araligin icinde olmali` |
| VA8 | `karakolGuc` iki elemanlı, her biri ≥ 0, `karakolGuc[1] ≤ karakolGuc[0]` | `askeri.eskiya.karakolGuc: [birinci, ikinci] azalan olmali` |
| VA9 | `ganimet` anahtarları `icerik.mallar` kimlikleri, her mal **depolanabilir** (`depolanabilir !== false`) ve kategorisi fark etmeksizin değer > 0 tamsayı; para alanı yok (`ganimet` yalnız mal) | `askeri.eskiya.ganimet: bilinmeyen ya da depolanamaz mal: <id>` |
| VA10 | `yenilgiKayipPpm`, `reviriGeriPpm` ≤ 1 000 000; `kalkanSonrasiYagmaPpm ≤ yagmaOraniPpm` | zod + `askeri.eskiya: kalkan sonrasi yagma genel yagmadan buyuk olamaz` |
| VA11 | `etkin = true` iken `mulk` bloğu tanımlı ve `ekYapilar` `ordugah` kaydını içermeli (Ordugâh şartı uygulanabilir olsun) | `askeri.eskiya.etkin: mulk.ekYapilar.ordugah tanimsiz` |

`VA9` mal-kimliği denetimi içerik gerektirdiğinden `dogrulaParametreler` (içerik bağlamlı katman, `dogrula.ts:558` yanı) içindedir; zod katmanı yalnız biçimi denetler.

### 4.2 `mulk.ekYapilar`: üç yeni kayıt ve iki yeni isteğe bağlı alan

**Şema (`veri/src/tipler.ts:576-598` `MulkEkYapiTanimi`; `veri/src/sema.ts:364-377` `mulkEkYapiSema`):**

```ts
/** Askeri (Ordugâh): biten her yapı, düğümün birlik kapasitesine bu kadar ekler (adet; tüm birlik türlerinin TOPLAMI sınırlanır). Yok = 0. */
birlikKapasitesi?: number;                    // negatifOlmayan (tamsayı)
/** Askeri (Karakol): biten her yapının sürekli ikmali: mal kimliği → mili-birim/saat; düğümün `ikmalTalebi`ne EKLENİR (§7). Yok = boş. */
ikmal?: Record<MalId, number>;                // kayit (değerler pozitif tamsayı)
```

**Veri (T3; AK Ek C, iki alan farkıyla: §1 sapma 1):**

```jsonc
"ordugah":          { "ad": "Ordugâh", "yuva": 3, "insaSaati": 12, "insaParasi": 20000000,
                      "insaMaliyeti": { "celik": 80000, "parca": 30000 }, "enFazlaIlBasina": 2, "birlikKapasitesi": 12 },
"karakol":          { "ad": "Karakol", "yuva": 1, "insaSaati": 4, "insaParasi": 4000000,
                      "insaMaliyeti": { "celik": 20000, "parca": 8000 }, "enFazlaIlBasina": 2, "ikmal": { "gida": 100 } },
"gozetleme_kulesi": { "ad": "Gözetleme Kulesi", "yuva": 1, "insaSaati": 3, "insaParasi": 2000000,
                      "insaMaliyeti": { "celik": 10000, "parca": 5000 }, "enFazlaIlBasina": 1 }
```

(Mili-para: ₺1 = 1 000; `insaMaliyeti` mili-birim: çelik 80 birim = 80 000; **doğrulandı**: mevcut `ambar` kaydı `insaParasi: 3000000`, `insaMaliyeti: { celik: 15000, parca: 5000 }`.)

**Derleme (`derle.ts:162-186` `mulkDerle`; `tipler.ts:124-136` `DerlenmisEkYapi`):**

```ts
export interface DerlenmisEkYapi {
  // ... mevcut alanlar ...
  birlikKapasitesi: number;            // t.birlikKapasitesi ?? 0
  ikmal: [number, Mili][];             // mal indeksi artan; t.ikmal ?? {}; bilinmeyen mal: Error `icerikDerle: mulk.ekYapilar.<id>.ikmal bilinmeyen mal: <mal>` (insaMaliyeti kalıbı, derle.ts:171-175)
}
```

**Doğrulayıcı (`dogrula.ts:537-551` ek yapı kuralları yanı):**

| # | Kural | İleti |
|---|---|---|
| VE1 | `ikmal` mal kimlikleri içerikte ve depolanabilir; değerler pozitif tamsayı | `mulk.ekYapilar.<id>.ikmal: bilinmeyen ya da depolanamaz mal: <mal>` |
| VE2 | `birlikKapasitesi > 0` ise yapının `yuva`'sı ≥ 1 ve `enFazlaIlBasina` tanımlı (sınırsız kapasite yok) | `mulk.ekYapilar.<id>: birlikKapasitesi icin enFazlaIlBasina gerekli` |
| VE3 | Askeri üç kimlik (`ordugah`, `karakol`, `gozetleme_kulesi`) `oyuncuyaKapaliYapilar` listesinde **olamaz** (oyuncu yapısıdır; kamu yapısı değil) | `mulk.kamu.oyuncuyaKapaliYapilar: askeri ek yapi kapatilamaz: <id>` |
| VE4 | **Kilitsizlik taraması (A0-17 kalıbı):** `ekYapilar.<askeri>` kaydında seviye/teknoloji/önkoşul/sıra anahtarı yok (`.strict()` zaten reddeder); `gerekliTeknoloji` benzeri alan **eklenemez** | zod `.strict()` |

**Uygulanamayan kurallar (§1 sapma 3):** arsa türü ve komşuluk matrisi, "ada başına ≤1": 0a'da **yoktur**; yapı yerleşimi yalnız `yuva` hücrelik kenar-bitişik küme, hücre `uygun` ve sahiplik kurallarına tabidir (`mulk/komut.ts:321-382`).

### 4.3 `kimlik-listesi.json`

Tek değişiklik: `yapilar.kamuYapilari[0]` (`nobet_evi`) `asama`: `"ileride"` → `"A0-ops"`. Başka kayıt eklenmez; `dogrulaKimlikKilidi` önek denetimi etkilenmez (§3.1).

---

## 5. Düğüm düzeltmesi ve mülk kipi kapısı

### 5.1 Yeni dosya `cekirdek/src/askeri/kimlik.ts` ve kapı işlevi

```ts
/** Askeri ek yapı ve kamu yapısı kimlikleri (kimlik-listesi.json ile kilitli; yeniden adlandırılamaz). */
export const ORDUGAH = "ordugah";
export const KARAKOL = "karakol";
export const GOZETLEME_KULESI = "gozetleme_kulesi";
export const NOBET_EVI = "nobet_evi";
export const ASKERI_EK_YAPILAR: readonly string[] = [ORDUGAH, KARAKOL, GOZETLEME_KULESI];

/** Mülk kipinde askeri özellik açık mı? Bölge kipinde (ic.mulk tanımsız) HER ZAMAN true: davranış bugünküyle aynıdır. */
export function askeriMulkAcikMi(ic: DerlenmisIcerik): boolean {
  return ic.mulk === undefined || ic.param.askeri.eskiya?.etkin === true;
}
```

**Kapı (üç komutta, işlevin İLK satırı; durum değiştirmeden önce):**

```ts
if (!askeriMulkAcikMi(ctx.ic)) return hata("askeri kapali");
```

Uygulandığı yerler: `askeri/uretim.ts:21` `birlikUret` (`:27`'den önce), `askeri/savas.ts:73` `savunmaEmri` (`:78`'den önce), `askeri/savas.ts:95` `savasIlan` (`:101`'den önce). **Bölge kipinde** `askeriMulkAcikMi` `true` döner ⇒ kod yolu bugünkü gibi çalışır (iletiler dahil birebir). **Mülk kipinde** bayrak kapalıyken (blok yok ya da `etkin: false`) üç komut da `askeri kapali` ile reddedilir; **bugünkü davranıştan farkı yalnız ret iletisidir** (bugün düğüm kimliği `bilinmeyen bolge`, harita bölgesi `bolge oyuncunun degil` ya da `hedef bolge sahipsiz` verir; hiçbiri başarılı olamaz: B1–B3, B5). **Başarısız komut durumu değiştirmez** (kapı ilk satırdır).

### 5.2 `birlik_uret` ve `savunma_emri` düğüm düzeltmesi (AK kalem 1)

`askeri/uretim.ts:28` ve `askeri/savas.ts:79`:

```ts
// ESKİ: const bi = ic.bolgeIndeks[k.bolge];            (savunmaEmri: ctx.ic.bolgeIndeks[k.bolge])
// YENİ:
const bi = bolgeIndeksiBul(d, ic, k.bolge);              // import { bolgeIndeksiBul } from "../dugum";
```

Gerisi aynı kalır (`bolge === undefined` ⇒ `bilinmeyen bolge`; `bolge.sahip !== oyuncu` ⇒ `bolge oyuncunun degil`). `bolgeIndeksiBul` önce `ic.bolgeIndeks[id]`'ye baktığı için **bölge kipinde ve harita bölgeleri için sonuç birebir aynıdır** (B4). `savasIlan` (`:102-103`) **değişmez** (harita-yalnız; PvP Alfa-1: yalnız kapı eklenir). Test (§13 Parça 2): bölge kipi `askeri-uretim.test.ts` ve `askeri-savas.test.ts` **değişmeden** geçer; mülk kipinde bayrak AÇIK sentetik veride `birlik_uret`/`savunma_emri` `<il>#<oyuncu>` kabul eder.

### 5.3 Askeri ek yapı inşa kapısı

`mulk/komut.ts:262-279` `yapiTuruCoz`, kamu yapısı kapısının (`:269`) hemen sonrasına:

```ts
if (ek !== undefined && ASKERI_EK_YAPILAR.includes(ek.id) && !askeriMulkAcikMi(ctx.ic)) return `askeri kapali: ${ek.id}`;   // import { ASKERI_EK_YAPILAR, askeriMulkAcikMi } from "../askeri/kimlik";
```

Ek yapı `tesis_insa_hucre` ve `yapi_yerlestir` komutlarının ikisi de `yapiTuruCoz`'dan geçtiği için tek satır ikisini kapsar (**doğrulandı: kod okuma**, `mulk/komut.ts:468-495` `yapiUygula`, `:497-` `mulkKomutu`). Bayrak açıkken ek yapı **mevcut yolla** kurulur (`enFazlaIlBasina`, `yuva`, bitişiklik, maliyet); özel kural eklenmez. `derle.ts:166` kimlik çakışma denetimi ve `serilestir.ts:699-700` (`icerikte olmayan ek yapi`) üç yeni tür kimliğini otomatik tanır.

**Bayrak sonradan kapatılırsa:** kurulmuş askeri yapılar durumda kalır (ek yapı kaydı silinmez); yeni inşa reddedilir; birlik ve savunma komutları reddedilir; `ikmalTalebi` mevcut birlikler için çalışmaya devam eder (§7: çarpan kuralı bayraktan bağımsızdır). Bu, "kapı kapanınca oyuncu mülkü yok olmaz" ilkesidir (kural dönemi göçü gerekmez).

---

## 6. Ordugâh şartı ve kapasitesi (AK kalem 2)

**Kural (yalnız mülk kipi işletme düğümünde ve bayrak açıkken):** `birlik_uret` için düğümde **en az bir biten Ordugâh** bulunur ve `Σ birlikler + Σ üretimdeki partiler + k.adet ≤ Σ biten Ordugâh.birlikKapasitesi`.

**`mulk/yapi.ts:29` `ekYapiToplami` alan birliğine `"birlikKapasitesi"` eklenir** (B12); `DerlenmisEkYapi.birlikKapasitesi` (§4.2) toplanır. Yeni işlevler `askeri/uretim.ts`:

```ts
/** Düğümdeki toplam birlik: biten birlikler + üretimdeki partilerin adetleri. */
export function birlikKullanimi(d: Dunya, bi: number): number {
  const b = d.bolgeler[bi] as BolgeDurumu;
  let t = 0;
  for (const a of b.birlikler) t += a;
  for (const p of d.partiler) if (p.bolge === bi) t += p.adet;
  return t;
}
```

`birlikUret` içinde, `k.adet` aralık denetiminden (`:44-46`) **sonra**, stok denetiminden (`:49`) **önce**:

```ts
if (bolge.merkez !== undefined && ic.mulk !== undefined) {                      // işletme düğümü; bölge kipinde bu blok hiç çalışmaz
  const kapasite = ekYapiToplami(ic, bolge, "birlikKapasitesi");
  if (kapasite <= 0) return hata(`ordugah gerekli: ${k.bolge}`);
  const kullanilan = birlikKullanimi(d, bi);
  if (kullanilan + k.adet > kapasite) return hata(`ordugah kapasitesi yetersiz: ${kullanilan} + ${k.adet} > ${kapasite}`);
}
```

- **Sıra:** `askeri kapali` → bölge → sahiplik → birlik → `birlik acik degil` → adet → **Ordugâh şartı** → stok/maliyet (atomik; durum yalnız hepsi geçince değişir).
- Üretimdeki parti sayılır (aksi halde tek komutla kapasite aşılırdı); inşası süren Ordugâh sayılmaz (yalnız `b.ekYapilar` = biten).
- Yapı sayısı sınırı `enFazlaIlBasina = 2` ⇒ düğüm kapasitesi ≤ 24 birim (AK Ö3 varsayılan: yeterli; ölçüme göre).
- **Kapasite azalırsa** (ek yapı yıkımı bu işte yoktur) mevcut birlik kalır; yalnız yeni üretim reddedilir.
- `bolge.merkez !== undefined` koşulu harita bölgelerinde (mülk kipi harita bölgeleri sahipsizdir) ve bölge kipinde (merkez hiç yok) bloğu **atlar**: bölge kipi `birlik_uret` bugünkü gibidir.

Ret iletileri (§3.2): `ordugah gerekli: <dugum>` (OR-01), `ordugah kapasitesi yetersiz: <kullanilan> + <adet> > <kapasite>` (OR-02).

---

## 7. İkmal: çarpan ve ek yapı ikmali (AK kalem 3)

`askeri/uretim.ts:98-110` `ikmalTalebi(d, ctx, bolge)`:

```ts
export function ikmalTalebi(d: Dunya, ctx: Baglam, bolge: number): Mili[] {
  const ic = ctx.ic;
  const sonuc = new Array<number>(ic.mallar.length).fill(0);
  const b = d.bolgeler[bolge];
  if (!b) return sonuc;
  const mulkDugumu = ic.mulk !== undefined && b.merkez !== undefined;
  const c = mulkDugumu ? (ic.param.askeri.ikmalCarpaniPpm ?? PPM) : PPM;       // yalnız mülk işletme düğümü
  const tablo = ikmalTablosu(ic);
  for (let bi = 0; bi < b.birlikler.length; bi++) {
    const adet = b.birlikler[bi] ?? 0;
    if (adet <= 0) continue;
    for (const [mal, miktar] of tablo[bi] ?? []) {
      const x = adet * miktar;
      sonuc[mal] = (sonuc[mal] as number) + (c === PPM ? x : carpBol(x, c, PPM));    // (birlik türü, mal) başına bir kez yuvarlanır; sıra: birlik indeksi, tablo sırası
    }
  }
  if (mulkDugumu && b.ekYapilar !== undefined) {                                // Karakol nöbetçi ikmali: çarpana TABİ DEĞİL (zaten nihai değer)
    const mk = ic.mulk as DerlenmisMulk;
    for (const y of b.ekYapilar) {
      const i = mk.ekYapiIndeks.get(y.tur);
      if (i === undefined) continue;
      for (const [mal, miktar] of (mk.ekYapilar[i] as DerlenmisEkYapi).ikmal) sonuc[mal] = (sonuc[mal] as number) + miktar;
    }
  }
  return sonuc;
}
```

- **Bölge kipinde ve harita bölgelerinde** `c = PPM` ve `ekYapilar` yok ⇒ fonksiyon bugünkü sonucu verir (aynı tamsayılar, aynı sıra; bölge kipi altınları).
- **Mülk kipinde mevcut dünyalarda** hiçbir düğümde birlik ya da Karakol olamaz (B5; kapı §5): fonksiyon `0` dizisi döndürür. **Ar-Ge lideri kararı (S-1):** `ikmalCarpaniPpm` 0a verisinde **yazılmaz**; 0b'de bayrakla birlikte 250 000 yazılır. Bu yüzden 0a'da çarpan her yerde `PPM`'dir ve `ikmalTalebi` bugünkü sonucu verir (bölge kipi altınları ve mülk özetleri kesin korunur; çarpan yolu yalnız sentetik test verisinde sınanır).
- Çarpan **bayraktan bağımsızdır**: bayrak sonradan kapatılırsa mevcut birlikler aynı ikmali ister (§5.3 sonu).
- `ikmalKarsilanmaPpm` (`ekonomi/uretim.ts:627-628`) ve talep birleşimi (`:354`) **değişmez**; birlik maaşı (`lojistik/cozum.ts:162`) çarpana tabi değildir (para lavabosu, AK §3.6 madde 1).
- `ikmalTablosu` önbelleği (`WeakMap<DerlenmisIcerik>`) içerik başınadır ve çarpan `ic.param`'dan okunduğu için etkilenmez.

---

## 8. Nöbet Evi ve olay türü adları

### 8.1 Nöbet Evi: durum alanı yok, türetilmiş konum

Nöbet Evi **kamu yapısıdır** (ilçe merkezindeki `hizmet` kamu hücresi; `k:ilce:<id>`; oyuncuya kapalı; maliyet sıfır). **Yeni kamu bileşeni, durum alanı ya da dünya durumu yoktur** (B15). 0a işi yalnız konum okuma API'sidir (`cekirdek/src/askeri/nobet.ts`, yeni):

```ts
/**
 * İlçenin Nöbet Evi hücresi: ilçe merkezindeki `hizmet` kamu hücre bloklarından, `k:ilce:<ilce>` sahipli ilk bloğun (kanonik sıra:
 * `kamuBloklari`: (sahip, tür) sonra (y0, x0)) sol-üst hücresi `${x0}:${y0}`. Kamu kuralı kapalıysa ya da ilçede hizmet bloğu yoksa undefined.
 * Savunma gücü (nobetEviGuc) hücre varlığından BAĞIMSIZ olarak her ilçeye uygulanır (0b): hücre yalnız ikon konumudur.
 */
export function nobetEviHucresi(d: Dunya, ilce: string): HucreId | undefined {
  const sahip = kamuIlceKimligi(ilce);
  for (const k of kamuBloklari(d, ilce)) if (k.tur === "hizmet" && k.sahip === sahip) return `${k.x0}:${k.y0}`;
  return undefined;
}
```

(`HucreId` biçimi `"x:y"`; **doğrulandı**: `mulk/durum.ts` `hucreXY`, mini-6 hücre kimlikleri `"604804:381804"`.) Dondurulmuş kamu kümesi parametre değişse de kaymaz (`kamu.ts` dosya başı), dolayısıyla konum kalıcıdır. Okuma API'si `cekirdek/src/askeri/index.ts` ve `cekirdek/src/index.ts`'ten dışa açılır (istemci ikonu 0b).

### 8.2 Olay türü adları (rezerv; kod 0b)

Üç olay türü adı **bu belgeyle kilitlenir**, **0a'da `tipler.ts`'e eklenmez** (ekleme `motor.ts` yönlendirme ve işleyici gerektirir ve 0a'da hiçbir şey bunları planlamaz): `eskiya_gunluk` (günlük planlama, TRT 00:00), `eskiya_pencere_ac`, `eskiya_pencere_kapa`. Öncelikler 0b'de `OLAY_ONCELIGI`'ne: `eskiya_gunluk: 5` (`iklim_gunluk` ile aynı), `eskiya_pencere_ac/kapa: 4` (`savas_pencere_*` ile aynı) önerilir. **Geç eklemenin güvenliği:** olay türleri yalnız planlanınca serileştirilir; bayrak kapalıyken hiçbir görüntü bu türleri içermez, bu yüzden adı şimdi koda sokmak ya da 0b'de eklemek göç farkı yaratmaz (yalnız-ekle). Adlar yeniden adlandırılamaz.

**Bayrak açılış tohumu (0b sorusu, §16 S-5):** ilk `eskiya_gunluk` olayını kimin planladığı (dünya kurulumunda mı, `kuralSurumu` geçişinde mi) 0b'nin tasarım konusudur; 0a bunu **bilerek açık bırakır** ve bayrak kapalıyken hiçbir olay planlanmaz.

---

## 9. Yağma defteri (AK kalem 5; K8)

**Amaç:** H5 "yağma ≤%25 / pencere" kuralını PvE (0b) ve PvP (Alfa-1) için **tek bir düğüm başına defterden** uygulamak; bugünkü savaş başına kural (`kayipTavaniUygula`, ilan kuralları (a)(b)(c)) bölge kipinde **aynen kalır**. 0a **durum alanını, tek noktayı ve doğrulayıcıyı** getirir; çağıran yoktur (ilk çağıran 0b `askeri/eskiya.ts`), bu yüzden hiçbir mevcut dünyada alan yazılmaz.

### 9.1 Durum alanı

`tipler.ts:299` `BolgeDurumu.ekYapilar?` alanından sonra:

```ts
/**
 * Yağma defteri (askeri 0a; H5): bu düğümün son yağma penceresi. Pencere ilk yağmayla açılır ve `yagmaPencereMs` sürer; süre dolduktan sonraki ilk yağma
 * yeni pencere açar. `kullanilanPpm`: pencerede yağmalarda uygulanmış TOPLAM oran (ppm; üst sınır `askeri.kayipTavaniPpm`). Yalnız işletme düğümlerinde,
 * ilk yağmada oluşur; harita bölgelerinde ve bölge kipinde TANIMSIZDIR (özet değişmez).
 */
yagmaPenceresi?: { baslangic: Ms; kullanilanPpm: number };
```

**Pencere tipi (kayan değil, sabit):** pencere **ilk yağma anında açılır** ve `yagmaPencereMs` sonra kapanır (örtüşen pencere yok). Gerekçe: durum iki sayıdır, kayan pencere her yağmayı listelemeyi gerektirirdi; H5 payda tanımıyla uyumlu kalır (toplam kayıp ≤ %25 × pencere içi en yüksek stok, çünkü `Σ oran ≤ %25` ve her yağma anlık stoğun oranını alır: `Σ oran_i × S_i ≤ %25 × max S_i`; **doğrulandı: aritmetik**). AK §2.6 "24 sa kayan" ifadesi bu anlamda okunur (S-7 onay).

`yagmaPencereMs` = `(ic.param.askeri.eskiya?.yagmaPenceresiSaat ?? ic.param.askeri.pencereSaat) × SAAT` (ikisi de bugün 24).

### 9.2 Tek nokta `yagmaTavaniUygula`

Yeni dosya `cekirdek/src/askeri/yagma.ts`; `askeri/index.ts` ve `src/index.ts`'ten dışa açılır:

```ts
/**
 * Bu yağma olayına tanınan oran (ppm) ve defter yazımı. Çağıran, dönen oranı düğümün HER malına `kayipTavaniUygula(anlik, donen, PPM)` ile uygular:
 * yağma yolundaki başka hiçbir kod tavanı kendisi uygulamaz. `oranPpm` zaten ilçe payıyla çarpılmış olay oranıdır (0b); [0, PPM].
 */
export function yagmaTavaniUygula(d: Dunya, ctx: Baglam, bi: number, oranPpm: number): number {
  const ic = ctx.ic;
  const b = d.bolgeler[bi] as BolgeDurumu;
  if (b.merkez === undefined || ic.mulk === undefined) return 0;                  // yalnız mülk işletme düğümü: bölge kipinde ve harita bölgesinde defter YOKTUR
  const tavan = ic.param.askeri.kayipTavaniPpm;
  const sure = (ic.param.askeri.eskiya?.yagmaPenceresiSaat ?? ic.param.askeri.pencereSaat) * SAAT;
  const w = b.yagmaPenceresi;
  const suren = w !== undefined && d.zaman < w.baslangic + sure ? w : undefined;   // süren pencere (yoksa yeni pencere açılır)
  const baslangic = suren !== undefined ? suren.baslangic : d.zaman;
  const kullanilan = suren !== undefined ? suren.kullanilanPpm : 0;
  const kalan = tavan > kullanilan ? tavan - kullanilan : 0;
  const f = oranPpm < kalan ? oranPpm : kalan;                                     // oranPpm < 0 çağıranın hatasıdır (Error); burada [0, PPM] varsayılır
  if (f > 0) b.yagmaPenceresi = { baslangic, kullanilanPpm: kullanilan + f };      // YENİ nesne (paylaşım yok); f = 0 ise yazılmaz
  return f;
}
```

- **Kurallar:** (1) süren pencerede `kullanilanPpm + f ≤ kayipTavaniPpm` her zaman; (2) pencere süresi dolunca eski kayıt değişmeden durur ve ilk `f > 0` yağmada **tek atamayla** yenilenir (kanonik özet için eski kaydı silmeye gerek yok: aynı girdi aynı durum); (3) `f = 0` ise durum **yazılmaz** (başarısız/boş yağma izi bırakmaz); (4) deterministiktir (zaman `d.zaman`, aritmetik tamsayı, PRNG yok).
- **Sıra sözleşmesi (0b için):** önce `oranPpm = carpBol(carpBol(olayOrani, ilcePayPpm, PPM), …)`, sonra `f = yagmaTavaniUygula(...)`, sonra her mal için `al = kayipTavaniUygula(anlik, f, PPM)` (bugünkü işlev, **değişmez**: `askeri/savas.ts:183-190`). PvP (Alfa-1) aynı üç adımı kullanır; bölge kipi PvP'si (`savasPencereKapa`, yağma `:263-282`) **bu işlevi çağırmaz** ve değişmez.
- `kayipTavaniUygula` ve ilan kuralları (a)(b)(c) (`savas.ts:129-141`) **0a'da değişmez**.

### 9.3 Rezerv: `Dunya.baskinlar` (ad ve şekil; kod 0b)

Aşağıdaki biçim bu belgeyle **ad olarak** kilitlenir, 0a'da koda **girmez** (S-6): `Dunya.baskinlar?: BaskinDurumu[]` (`DUNYA_ISTEGE_BAGLI` birliğine `"baskinlar"` 0b'de eklenir, `serilestir.ts:244`).

```ts
interface BaskinDurumu {            // AK §3.7 kalem 6; alt alanlar 0b'de kesinleşir, üst düzey adlar kilitlidir
  id: number; ilce: string; il: string;
  boy: number; gb: number;          // baskın boyu ve gücü (tamsayı)
  bant: number;                     // il dilimi indeksi [0, dilimSayisi)
  duyuruZamani: Ms; pencereBaslangic: Ms; pencereBitis: Ms;
  evre: "duyuru" | "pencere" | "bitti";
  sonuc: null | { /* 0b */ };
  katilimcilar: { oyuncu: string; dugum: number; guc: number }[];   // pencere açılışında kilitlenen anlık görüntü
}
```

---

## 10. Serileştirme ve göç

| Alan | Konum | Ne zaman yazılır | Doğrulayıcı (`serilestir.ts`) |
|---|---|---|---|
| `BolgeDurumu.yagmaPenceresi?` | `tipler.ts:299` yanı | ilk `f > 0` yağmada (0b) | bölge döngüsünde (`:327-337` `ekYapilar` bloğunun hemen sonrası): `if (b.yagmaPenceresi !== undefined) { if (b.merkez === undefined) hata(`${y}.yagmaPenceresi`, "yagma defteri yalniz isletme dugumunde olabilir"); const yp = nesne(b.yagmaPenceresi, ...); alanlar(yp, ..., ["baslangic", "kullanilanPpm"]); tamsayi(yp.baslangic, ..., 0); tamsayi(yp.kullanilanPpm, ..., 0, 1_000_000); }` |
| `mulk.ekYapilar` içerikte yeni türler | `ekYapilar[j].tur` | oyuncu yapınca (bayrak açık) | **değişmez**: `serilestir.ts:699-700` (`icerikte olmayan ek yapi`) üç yeni tür kimliğini `mulk.ekYapilar` kayıtlarından otomatik tanır |

- `Dunya` üst düzeyine alan **eklenmez** (0a). `paraDurumuKur`, `isletmeAl` ve diğer kurucular yeni alanı **yaratmaz** (tembel: yağma olmadıkça yok).
- **`fikstur-goc/{bolge-v1,mulk-v1,mulk-v2-g6oncesi}.json` yüklenmeye devam eder** ve yüklenen dünyanın özeti, göç anındaki meşru farklar (kural sürümü değişirse bir ek çözüm) dışında değişmez; yeni alanların hepsi isteğe bağlıdır. `kuralSurumu` 0a veri commit'inde değişir (veri); bölge kipi altınları değişmez.
- **Bayrak açık → kapalı:** `yagmaPenceresi` ve kurulmuş askeri ek yapılar durumda kalır; yeni askeri komut ve inşa reddedilir (§5.3).
- **Boyut:** düğüm başına ≤ 2 sayı (yalnız yağma görmüş düğümlerde); ihmal edilebilir (**doğrulanmadı**: ölçülmedi).

---

## 11. Değişmez tablosu

| Değişmez | 0a'da nasıl sağlanır | Test (§13) |
|---|---|---|
| Deterministik çekirdek (tamsayı/PPM; `Math.random`/`Date`/kayan nokta yok) | `yagmaTavaniUygula` ve ikmal tamsayıdır (`carpBol`); PRNG kullanılmaz | `askeri-yagma-defteri` (aynı girdi iki kez aynı durum) |
| Bölge kipi altınları birebir | `askeriMulkAcikMi` bölge kipinde `true`; `ikmalTalebi` çarpanı/ek yapı yolu `merkez` koşulunda; defter `merkez` koşulunda | K-A1 (§12) |
| Bayrak kapalıyken no-op | blok yok ya da `etkin: false` ⇒ mülk kipinde üç komut `askeri kapali`, askeri ek yapı inşası reddedilir, hiçbir yeni durum alanı yazılmaz; mülk özetleri değişmez | K-A2 (§12) |
| Başarısız komut durumu değiştirmez | kapı her komutun ilk satırıdır; Ordugâh şartı stok denetiminden önce | `askeri-dugum` (özet aynı) |
| Parsel asla el değiştirmez | hiçbir askeri kod `d.mulk.hucreler`'e yazmaz (0a'da yeni yazma yolu yok) | K-A3 (§12) |
| Para korunumu | 0a yeni para akışı **yaratmaz** (ikmal mal tüketimi, maaş mevcut lavabo); korunum eşitliği askeri komutlu mülk koşusunda tam | `askeri-dugum` korunum |
| Tutar taşıyan komut yok | yeni komut yok; mevcut `birlik_uret` (`adet`), `savunma_emri` (`durus` secim) alanları değişmez | `para-guvenligi` komut sözlüğü (değişmez) |
| Protokolde yalnız ekleme | 0a'da protokol/`kare` değişikliği **yok** (`kare.baskinlar` 0b) | `protokol` testleri değişmez |
| Kilitsizlik (L4) | ek yapı şemasında seviye/teknoloji/önkoşul alanı yok (VE4); Ordugâh şartı yalnız sermaye/arsa/girdi | `askeri-eskiya-dogrulama` kilitsizlik taraması |
| Yalnız-ekle / kimlik kalıcılığı | ek yapı kimlikleri `kimlik-listesi.json`'da kilitli; `nobet_evi` yalnız aşama güncellemesi | `kimlik-listesi.test`, `askeri-ad-kilidi` |

---

## 12. Kanıt planı (kısa; baş lider: "ilerleyiş önce")

Bayrak **kapalıyken** davranışın korunduğunun üç kanıtı; her birinin farkı yakalayabildiği tek satırda belirtilir (şartname ilkesi; ek iş değildir). Hepsi yeni dosya `cekirdek/test/askeri-0a-kanit.test.ts` içindedir; "0a öncesi içerik" yardımcısı `askeri0aOncesi(veri)` güncel veriden `askeri.eskiya`, `askeri.ikmalCarpaniPpm` ve üç askeri ek yapı kaydını çıkarır (başka değişiklik yok; kimlik listesi eklenmez).

| Kanıt | Düzenek | Negatif kontrol |
|---|---|---|
| **K-A1 bölge kipi** | mini-6, 4 bot (militarist dahil) + bulanık komut, tohum 3, 6 gün; `askeri0aOncesi` ↔ güncel içerik, **12 kontrol noktasında tam `durumOzeti`** (`kanitKaydi`/`esitNoktalar` kalıbı; bulanık komutlar iki dünyada AYNI içerikten: `ortakKomutluKos` kalıbı). Ek: `fikstur-b1/b2/kanit` ve `fikstur-goc/{bolge,mulk}-v1*` dosyalarında `git diff --exit-code` (O1) | aynı koşuda `askeri.birlikMaasiSaat` iki katına çıkarılırsa özet FARKLI (militarist bot birlik üretir: karşılaştırma askeri değişikliği görür) |
| **K-A2 mülk kipi, bayrak kapalı** | mülk tohumlu koşu (`g6MulkKosusu` kalıbı: 3 oyuncu, rastgele ticaret/yapı/araştırma + her birine `birlik_uret`, `savunma_emri`, askeri ek yapı denemesi), 12 noktada `askeri0aOncesi` ↔ güncel (`etkin: false`) **aynı özet**; her askeri komut `askeri kapali`/`askeri kapali: <yapi>` ile reddedilir ve durum değişmez | aynı koşuda `etkin: true` (sentetik) ile Ordugâh + birlik kurulunca özet FARKLI |
| **K-A3 parsel el değiştirmez** | `etkin: true` sentetik veri, 30 sim günü rastgele akış (Ordugâh/Karakol/Kule inşası, `birlik_uret`, `savunma_emri`, `parsel_al`): `d.mulk.hucreler[].sahip` yalnız oyuncunun kendi `parsel_al`/`parsel_birak` komutlarıyla değişir; askeri komut sonrası sahip listesi aynı | akışa bir `parsel_birak` eklenince sahip listesi FARKLI (test duyarlı) |

**Kanıt dışı (mekanik, kapıda):** `pnpm typecheck`, tam vitest, `dunya.html` gzip ≤ 400 KB (0a payı < 0,3 KB: şema + üç sabit + iki küçük işlev; K3 ölçer, **doğrulanmadı**).

---

## 13. Test listesi (K3 yazar; hepsi hedefli, atlanmaz)

| Test (dosya) | Ne sınar |
|---|---|
| `veri/test/askeri-eskiya-dogrulama.test.ts` (yeni) | blok yok geçerli; VA1–VA11 ret (bozuk bant, duyuru > planlama, tahmin aralığı, `karakolGuc` azalan değil, ganimet depolanamaz/bilinmeyen mal, `etkin: true` iken `ordugah` tanımsız); VE1–VE3; **kilitsizlik taraması** (ek yapı kaydında seviye/teknoloji/önkoşul anahtarı `.strict()` ile reddedilir); `ikmalCarpaniPpm` aralığı |
| `veri/test/kimlik-listesi.test.ts` (güncel) | `nobet_evi` aşaması `A0-ops`; `ordugah`, `karakol`, `gozetleme_kulesi` `yapilar.ekYapilar` içinde; `mulk.ekYapilar` anahtarları listede; `dogrulaKimlikKilidi` geçer |
| `cekirdek/test/askeri-dugum.test.ts` (yeni) | §5: bölge kipinde üç komutun iletileri **eskisiyle birebir** (mevcut `askeri-uretim`/`askeri-savas` testleri değişmeden geçer); mülk kipi bayrak kapalı: `askeri kapali` (üç komut + `askeri kapali: ordugah/karakol/gozetleme_kulesi`), durum değişmez; bayrak açık (sentetik): `<il>#<oyuncu>` ile `birlik_uret`/`savunma_emri` kabul, `bilinmeyen bolge` hâlâ bilinmeyende; **§6:** Ordugâh yokken `ordugah gerekli`; inşa süren Ordugâh sayılmaz; kapasite 12 (tek yapı), 24 (iki yapı), üretimdeki parti sayılır, `ordugah kapasitesi yetersiz: <k> + <a> > <kap>`; `partiBitti` düğümde birlik ekler; **§7:** çarpan `0,25` ile talep `carpBol(adet × miktar, 250000, PPM)`, çarpansız `PPM` bugünkü; Karakol ikmali eklenir ve çarpana tabi değil; bölge kipi talebi değişmez; **para korunumu** (askeri komutlu mülk koşusunda eşitlik tam) |
| `cekirdek/test/askeri-yagma-defteri.test.ts` (yeni) | §9: pencere ilk yağmada açılır; süren pencerede `kullanilanPpm` birikir ve `kayipTavaniPpm`'i aşmaz (ardışık iki yağma toplamı ≤ %25); süre dolunca yenilenir; `f = 0` durum yazmaz; bölge/harita bölgesinde 0 döner ve yazmaz; determinizm; serileştirme gidiş-dönüş ve bozuk değer ret (negatif, > PPM, harita bölgesinde alan) |
| `cekirdek/test/askeri-nobet.test.ts` (yeni) | `nobetEviHucresi`: kamu açık mini-6 ilçesinde `hizmet` bloğunun sol-üst hücresi, kamu kapalıyken `undefined`, sonuç tekrarlanabilir ve parametre değişse de aynı (dondurulmuş) |
| `cekirdek/test/askeri-ad-kilidi.test.ts` (yeni) | `ORDUGAH`, `KARAKOL`, `GOZETLEME_KULESI`, `NOBET_EVI` sabitleri `kimlik-listesi.json` kimlikleriyle eşit; `AskeriEskiyaParametreleri` alan kümesi bu belgenin §4.1 listesiyle birebir (anahtar kümesi sabitlenir); `OLAY_ONCELIGI` anahtarlarında `eskiya_*` YOK (0a) |
| `cekirdek/test/askeri-0a-kanit.test.ts` (yeni) | K-A1, K-A2, K-A3 (§12) |
| uyarlama: `mulk-yapilar.test.ts:50-60` | ek yapı listesi 6 → 9 (`ordugah`, `karakol`, `gozetleme_kulesi` eklenir); başka mülk testlerinde ek yapı sayımı varsa güncellenir (**doğrulanmadı: tam liste**, K3 koşarak belirler) |
| uyarlama: `veri/test/dogrulama.test.ts` | ek yapı sayısı ve `askeri` blok anahtar kümesi |

Kural: testler **atlanmaz** (`skip`/`todo` yasak); yalnız kendi paketinin hedefli testleri koşulur, tam kapı O1'indir.

---

## 14. Sıra, rollere istek ve bot/ölçüm

**Not (baş lider):** askeri 0a **bu sprintte koda dönüşmez**; depoya yalnız belge olarak girer. K3 ve T3'e **bu sprintte istek yoktur**; aşağıdaki sıra ve rol tablosu 0a kodlanacağı sprint içindir.

**Sıra (Ar-Ge lideri: "bir sonraki sprintte P5'ten sonra"; K3 tek yazar):** P4/P5 (G6–G8) kapısı yeşil → **0a-1** şema (K3: `veri/src/{tipler,sema,dogrula}.ts`, `MulkEkYapiTanimi`, `askeri.eskiya`; **hiçbir JSON değişmez**; altınlar aynı) → **0a-2** çekirdek (`askeri/{kimlik,nobet,yagma}.ts`, `birlikUret`/`savunmaEmri`/`savasIlan` kapı + düğüm, Ordugâh şartı, `ikmalTalebi`, `ekYapiToplami`, `yapiTuruCoz` kapısı, `serilestir.ts` doğrulayıcı, `derle.ts` iki alan; blok yokken no-op) → **0a-3** veri (T3 tek commit: `askeri.eskiya` `etkin: false`, üç ek yapı kaydı, `nobet_evi` aşaması; `kuralSurumu` ARTAR; mülk altınları gerekiyorsa TEK commit'te eski/yeni raporlu; bölge altınları BİREBİR) → **0a-4** kanıtlar ve test uyarlamaları. **Birleştirme çatışması:** `sema.ts`, `tipler.ts`, `derle.ts`, `serilestir.ts`, `parametreler.json` P4/P5 ile aynı dosyalardır; K3 sırayla yazar, 0a önceki dilimin kapısı yeşilken başlar.

| Rol | İstek |
|---|---|
| **K3** | §4–§10 ve Ek A'daki değişiklikler; blok yokken no-op her yerde; testler §13; `askeri0aOncesi` yardımcısı; `veri-importu` kuralı (çekirdek `@bolge/veri` çalışma zamanı importu yok) korunur |
| **T3** | **0a-3 tek commit:** `parametreler.json` `askeri.eskiya` (§4.1 değerleri; `etkin: false`; **`ikmalCarpaniPpm` YOK**) ve `mulk.ekYapilar.{ordugah,karakol,gozetleme_kulesi}` (§4.2); `kimlik-listesi.json` `nobet_evi` aşaması `A0-ops`. **K3'ün 0a-1 şeması birleşmeden önce yazma.** |
| **O1** | 0a teslim kapısı + K-A1 dondurulmuş altın `git diff --exit-code` listesi |
| **K1, K2, O2, O3** | **0a'da istek yok** (protokol/istemci/bot/ölçüm 0b) |

**Bot ve ölçüm:** 0a'da botlar ve `olcum` **değişmez** (bayrak kapalı; mülk botları askeri komut vermez). H3/H5 parsel koşullarının Ordugâh şartıyla güncellenmesi, AH1–AH11 ve `komutan`/`tedarikci`/`askeri_yok` önayarları **0b**'dir (AK Ek B, §3.7 kalem 12).

**0a teslim kapısı (O1):** tam kapı yeşil; `dunya.html` gzip ≤ 400 KB; bölge kipi altınları birebir (K-A1); mülk kipi bayrak kapalıyken özet aynı (K-A2); eski mülk görüntüleri yüklenir.

---

## 15. Geri dönüşü zor kararlar

"Zor": canlı durumda ya da protokolde kalıcı iz bırakır, kimlikle bağlanır ya da yayımlanınca değiştirilemez. **Kolay geri dönüşlüler** (kilitlemeyin): `askeri.eskiya.*` sayı değerleri ve `etkin` bayrağı, `ikmalCarpaniPpm`, `karakolGuc`, ganimet tablosu (veri; kural sürümü dönemi).

| # | Karar | Neden zor | Durum |
|---|---|---|---|
| GZ-A1 | **`askeri.eskiya` blok adı ve alan adları** (§4.1; tam küme) | parametre anahtarı yayımlanınca veri paketleri ve ölçüm betikleri ona bağlanır; alan adı değiştirmek veri göçüdür | önerilen (AÖ-19 yönü kilitli) |
| GZ-A2 | **Ek yapı şeması alanları** `birlikKapasitesi`, `ikmal` (ve `nobetciGucu`/`duyuruEkiSaat` ALINMADI) | `MulkEkYapiTanimi` `.strict()` ve `DerlenmisEkYapi`; alan çıkarmak/yeniden adlandırmak göç ister | önerilen |
| GZ-A3 | **`BolgeDurumu.yagmaPenceresi` şekli ve sabit pencere semantiği** (`{baslangic, kullanilanPpm}`, ilk yağmada açılır) | durum şemasına yazılır (K8); kayan pencereye geçmek durumu listeye çevirir | önerilen (S-7) |
| GZ-A4 | **Mülk kipi kapısı** (`askeri kapali`) ve bayrak semantiği: bayrak = yeni komut/inşa kapısı, kurulmuş yapı kalır | oyuncu mülkü ile bayrak ilişkisi; sonradan "kapanınca yapılar silinir" demek oyuncuyu cezalandırır | baş lider (S-3 kapandı) |
| GZ-A5 | **Ordugâh kapasitesi = tüm birlik türlerinin adet TOPLAMI** (tür ağırlığı yok), üretimdeki parti dahil | birlik envanteri ve bot/ölçüm bu sayıya göre kurulur; ağırlık eklemek kapasite anlamını değiştirir | önerilen |
| GZ-A6 | **İkmal çarpanının yeri** (`ikmalTalebi`, yalnız mülk işletme düğümü; ek yapı ikmali çarpansız) | talep kimliği; çarpan bayraktan bağımsız (kurulmuş birlik aynı ikmali ister) | önerilen (değer 0b: S-1) |
| GZ-A7 | **`nobet_evi` kimliği ve konum türetme kuralı** (ilk `hizmet` bloğunun sol-üst hücresi) | kimlik kilidi; istemci ikonu ve 0b savunma toplamı bu konuma bağlanır | baş lider (S-2 kapandı) |
| GZ-A8 | **Olay adları** `eskiya_gunluk`, `eskiya_pencere_ac`, `eskiya_pencere_kapa` ve **`Dunya.baskinlar` adı/üst düzey şekli** | kuyrukta ve görüntüde serileştirilince kalıcı | önerilen (S-6) |
| GZ-A9 | **`param.askeri.yagmaIletimPpm` adı** (Y-36; rezerv, şemada alan YOK) | PvP ekonomisinin kalıcı tanımı (K3 AK); alan çıkarmak değil adı bağlamak | kilitli yön (Y-36) |

---

## 16. Açık sorular

| # | Soru | Varsayılan (K3 bunu uygular) | Kime |
|---|---|---|---|
| S-1 | ~~İkmal ×0,25 verisi 0a'da mı~~ **KAPANDI (Ar-Ge lideri):** değer 0b'de bayrakla gelir; 0a'da veri yok, yalnız şema ve çekirdek yolu | alan verisi yok | kapandı |
| S-2 | ~~`nobet_evi` aşaması~~ **KAPANDI:** `A0-ops` | `A0-ops` | kapandı |
| S-3 | ~~`savas_ilan` da mülk kapısından geçsin mi~~ **KAPANDI:** evet, aynı `askeri kapali` | evet | kapandı |
| S-4 | ~~AK §2.2 arsa türü/komşuluk matrisi~~ **KAPANDI (baş lider):** fikstürde karşılıksız, 0a'da uygulanmaz (O3 ileride kullanım türü eklerse ayrı iş) | uygulanmaz | kapandı |
| S-5 | ~~Bayrak açılış tohumu~~ **KAPANDI (0b):** ilk `eskiya_gunluk` olayını kimin planladığı 0b tasarımıdır | 0a'da olay planlanmaz | kapandı (0b) |
| S-6 | ~~`Dunya.baskinlar` şeması 0a'ya mı 0b'ye mi~~ **KAPANDI (baş lider):** 0b (0a'da yalnız ad ve şekil rezervi) | 0b | kapandı |
| S-7 | ~~Yağma penceresi sabit mi kayan mı~~ **KAPANDI (baş lider):** sabit (ilk yağmada açılır; §9.1) | sabit | kapandı |
| S-8 | ~~PvP yağma iletimi %60 ve `yagmaIletimPpm` adı~~ **KAPANDI (baş lider):** şemada alan 0a'da YOK, yalnız ad rezerve; uygulama Alfa-1 | rezerv | kapandı |
| S-9 | ~~AK'den sapmalar~~ **KAPANDI (baş lider):** (1) ek yapıda `nobetciGucu`/`duyuruEkiSaat` yok (tek kaynak `eskiya.*`), (2) `ganimet` mal-kimlikli `Record`, (3) arsa matrisi yok | kabul | kapandı |
| S-10 | Bekleme sayacı baskın gününden sayılıyor (A2 E-2): A2'nin `beklemeGun: 5`i planlamadan sayılan değerdir; eşdeğeri baskın gününden **3**'tür (§4.1). Örnek 3 yazıldı; 5 istenirse ortalama aralık 8 → 10 gün | `beklemeGun: 3` | Ar-Ge lideri, baş lider |

### 16b. 0b açık soruları (0a'yı bloke etmez; 0b tasarımında karara bağlanır)

| # | Soru | Not | Kime |
|---|---|---|---|
| 0b-1 | **Bedava binici:** Karakol ve Nöbet Evi kamu malıdır (ilçedeki herkesin savunmasına katkı); yalnız kuranlar öder | Baş lider önerisi: **ilçe kamu kasasından katkı**, mevcut kasa düzenine bağlansın (kasa yalnız yanan paradan beslenir; ödenek/kamu NPC alıcısı kalıbı); **yeni musluk açılmaz** (L6, para korunumu) | 0b tasarımı (A2 + A3) |
| 0b-2 | **Büyük boyda savunma ödemiyor (boy ≥ 6, A2 kalibrasyonu):** savunma maliyeti beklenen yağma kaybını aşıyor | Ya **boya göre yağma oranı** (`yagmaOraniPpm` ölçeğe bağlı) ya da **savunma bedeli kademesi** gerekir; seçim A2 ölçümüyle (AH3) | A2, baş lider |
| 0b-3 | E-4: yağma ve yapı devre dışı oranı %25 (yalnız 0b verisi, 0a'da `etkin: false`) | **KAPANDI (baş lider)**: onaylandı | kapandı |

## Ek A. Değişen dosya ve fonksiyonlar (Parça 1; `dosya:satır`, taban `7553b55`)

| Dosya:satır | Sahip | Değişiklik |
|---|---|---|
| `veri/src/tipler.ts:501` `askeri` | K3 | `ikmalCarpaniPpm?`, `eskiya?: AskeriEskiyaParametreleri` (§4.1) |
| `veri/src/tipler.ts:576-598` `MulkEkYapiTanimi` | K3 | `birlikKapasitesi?`, `ikmal?` |
| `veri/src/sema.ts:532` (`askeri`), `:364-377` (`mulkEkYapiSema`) | K3 | şema karşılıkları (`.strict()`) |
| `veri/src/dogrula.ts` (`dogrulaParametreler`, `:537-565` yanı) | K3 | VA1–VA11, VE1–VE3 |
| `veri/icerik/parametreler.json` | **T3** | `askeri.eskiya` (`etkin: false`) (`ikmalCarpaniPpm` YOK: S-1), `mulk.ekYapilar.{ordugah,karakol,gozetleme_kulesi}` (§4) |
| `veri/icerik/kimlik-listesi.json` | **T3** | `nobet_evi` aşaması `A0-ops` |
| `cekirdek/src/tipler.ts:124-136` `DerlenmisEkYapi` | K3 | `birlikKapasitesi`, `ikmal` |
| `cekirdek/src/derle.ts:162-186` `mulkDerle` | K3 | iki alan (`ikmal` mal indeksine çevrilir) |
| `cekirdek/src/askeri/kimlik.ts` (YENİ) | K3 | sabitler, `askeriMulkAcikMi` |
| `cekirdek/src/askeri/uretim.ts:21-60` `birlikUret` | K3 | kapı, `bolgeIndeksiBul`, Ordugâh şartı, `birlikKullanimi` |
| `cekirdek/src/askeri/uretim.ts:98-110` `ikmalTalebi` | K3 | çarpan ve ek yapı ikmali |
| `cekirdek/src/askeri/savas.ts:73-89` `savunmaEmri`, `:95-101` `savasIlan` | K3 | kapı; `savunmaEmri` `bolgeIndeksiBul` |
| `cekirdek/src/askeri/nobet.ts` (YENİ), `askeri/index.ts`, `src/index.ts` | K3 | `nobetEviHucresi` ve dışa açma |
| `cekirdek/src/mulk/yapi.ts:29` `ekYapiToplami` | K3 | alan birliğine `"birlikKapasitesi"` |
| `cekirdek/src/mulk/komut.ts:262-279` `yapiTuruCoz` | K3 | askeri ek yapı kapısı (§5.3) |
| `cekirdek/src/tipler.ts:299` `BolgeDurumu` | K3 | `yagmaPenceresi?: { baslangic: Ms; kullanilanPpm: number }` (§9.1) |
| `cekirdek/src/askeri/yagma.ts` (YENİ), `askeri/index.ts`, `src/index.ts` | K3 | `yagmaTavaniUygula` (§9.2; çağıran yok: 0b) |
| `cekirdek/src/serilestir.ts:327-337` (bölge döngüsü, `ekYapilar` bloğundan sonra) | K3 | `yagmaPenceresi` doğrulayıcısı (§10) |
| `cekirdek/test/askeri-*.test.ts`, `veri/test/askeri-eskiya-dogrulama.test.ts` (YENİ) | K3 | §13 |
