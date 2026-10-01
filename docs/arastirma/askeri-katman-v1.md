# Araştırma: Askeri Katman v1 — Arsa Dünyasına Oturtma ve Oynanabilir Askeri Rutin

> **Özet.** Sahip: "Askeri rutini veya askeri katmanımızı biraz unutmaya başladık." Bu rapor askeri ayağı (docs/11 ek karar: savaş toprağı değil **kontrolü** kazandırır, parsel asla el değiştirmez) üç şeyle somutlaştırır: (1) oyuncunun **5 dakika / 1 saat / 1 gün / 1 hafta** ritminde ne yaptığı, hiçbir "uğramazsan kaybedersin" baskısı olmadan; (2) askeri nesnelerin **arsa dünyasındaki** yeri (Ordugâh, Karakol, Gözetleme Kulesi hücreli oyuncu yapısıdır; Nöbet Evi kamu yapısıdır; birlik oyuncunun işletme düğümünde durur, komuta ilde olur; savaş ilçeyi hedefler, kontrol hakkı ilçe kaydıdır); (3) **Alfa-0 PvE dilimi** (NPC eşkıya baskını) ve en küçük çekirdek değişiklik listesi. Para korunumu dürüstçe hesaplandı: **askeri sektör net bir para lavabosudur**; tek musluk, tavanlı ve küçük bir mal ganimetidir; yağma oyuncudan oyuncuya yok olma payı olan bir aktarımdır; koruma hizmeti tavanlı, alıcının başlattığı bir aktarımdır. İki sayısal senaryo (Alfa-0 eşkıya savunması, Alfa-1 il kontrolü) formülden hesaplanmıştır.

| Alan | Değer |
|---|---|
| **Durum** | Ar-Ge önerisi; karar değildir (1 Ekim 2026). Sayılar öneridir, kalibre edilmemiştir |
| **Ne için** | [11 — Ürün dönüşü](../11-urun-donusu.md) "Ek karar: askeri güç ana eğlence ayaklarından biri" ve §7.7; [12 §10–11](../12-yon-taslagi.md); sahibin 1 Ekim yönergesi ("askeri yöne ağırlık versek iyi olur") ve Ar-Ge liderinin ilkesi: **seviye ya da kilit yok, seçim var** |
| **Tekrar edilmeyenler** | Birlik üçgeni ve çözüm formülü, savunma yapısı tablosu, il kontrol savaşı akışı, adalet paketi, abluka/paralı/ittifak kuralları ([cesitlilik-yonetim-askeri-teknoloji §5](cesitlilik-yonetim-askeri-teknoloji.md)); donanım/doktrin/destek, 36 askeri düğüm, göreli ×1,5 tavan, savunma sanayii kümesi, 3 yeni mal ([bilim-teknoloji-askeri §5–6](bilim-teknoloji-askeri.md)); Tarım→Askeri geçiş maliyeti ([imza §4.3.4](imza-mekanikleri-ve-yonelimler.md)). Burada yalnız **bunların arsa dünyasına nasıl oturduğu**, rutin, para korunumu, PvE dilimi ve kod farkları |
| **Güvenilirlik** | Kod ve veri `packages/cekirdek`, `packages/veri/icerik`, `docs/olcum` okunarak doğrulandı. Oyun bilgileri §10'daki bağlantılardan; sayfası okunamayan (HTTP 402) yerler **(arama özeti)** diye işaretli. Parametre değerleri **(öneri)** |
| **Kapsam dışı** | Kod, başka belge, commit. Kamu ajanı ve yapay zekâ: bu katmanda **hiç gerekmez** (PRNG + servet eğrisi); ajan Alfa-0 kritik yolunda değildir |

---

## Yönetici özeti (12 madde)

1. **Çekirdeğin askeri modülü işletme düğümüne neredeyse hazır.** `isletmeAl` her (oyuncu, il) düğümüne `birlikler`, `savunma` ve `ikmalKarsilanmaPpm` verir; `ikmalTalebi` ve birlik maaşı lavabosu zaten düğüm indeksiyle çalışır. `birlik_uret` ve `savunma_emri` yalnız `ic.bolgeIndeks[...]` aradığı için `<il>#<oyuncu>` kimliğini reddeder; `dugum.ts` `bolgeIndeksiBul` bunu çözer. **Birlik ve savunma emri için çekirdek değişikliği iki satırdır**; asıl iş **Ordugâh yapısı** (kapasite ve şart), **eşkıya baskını** ve **ortak yağma defteri**dir (§3.7).
2. **Seviye ya da kilit yok, seçim var.** Askeri yapı, birlik ve savunma bir merdiven değil, **dört iş modelidir**: kendini savunan, koruma hizmeti veren, savunma tedarikçisi, il kontrolüne talip. Açılışı yalnız sermaye, uygun arsa, girdi, işletme gideri ve H5 adalet korumaları sınırlar; **ilçe gelişim seviyesi ya da "önce şu düzeye gel" kilidi konmaz** (§0.2).
3. **Birlik nerede durur: envanter oyuncuda, komuta ilde.** Birlik oyuncunun işletme düğümünde durur (ikmal, maaş ve kayıp sahibine ait); savunma katkısı il düzeyinde **"il nöbeti"** duruşuyla verilir. Konumlu birlik (ilçeye gönderme) ve il havuzu (ortak envanter) elendi (§2.3).
4. **Yapılar:** Ordugâh (3 yuva), Karakol (1), Gözetleme Kulesi (1) **oyuncu ek yapısıdır** (hücreli, ilde sayı sınırlı, kimliği kilitlenir). **Nöbet Evi ilçe merkezindeki kamu hizmet hücresidir**, her ilçede vardır, oyuncuya kapalıdır, maliyeti sıfırdır. **İl komutanlığı yapı değil, kural ve görünümdür** (§2.4).
5. **Baskın hedefi ilçedir.** Büyüklük, ilçenin **kalkansız aktif oyuncu servetiyle** hesaplanır (RimWorld eğrisi): `boy = min(8, ⌊servet / 250.000 ₺⌋)`, güç `100 × boy`; servet eşiğin altındaysa baskın yoktur. Yeni oyuncu ilçesi baskın görmez. Ön duyuru **24 saat** (Kule ile 36); baskın günde 19:00–23:00 bandında bir saatlik dilimde (§3.2).
6. **H5 kuralları düğümlere şöyle iner:** yağma ≤%25 için düğüme **kayan 24 saatlik yağma defteri** (PvE ve PvP ortak; mevcut `kayipTavaniUygula` tek noktası korunur); yapı ≤%10 için mevcut **`onarimBitis`** alanı (yeni durum alanı gerekmez) ve `⌊%10 × tesis yuvası⌋` bütçesi; ≥49 saat için ilçe bekleme sayacı; parsel el değiştirmez için hiçbir askeri kod `HucreDurumu.sahip`'e dokunmaz ve bu özellik testiyle denetlenir (§2.6–2.7).
7. **Para korunumu (Ar-Ge liderinin sorusu).** (a) **NPC ganimeti bir muslukur, ama küçüktür:** baskın başına ≤ ₺5.200 taban değerli mal, çekirdek tablosundan, ilçe başına haftada tek baskın; ilçenin haftalık üretiminin ≈%0,15–0,3'ü. (b) **PvE yenilgi yağması mal lavabosudur** (oyuncudan NPC'ye, malın yok olması). (c) **PvP yağma negatif toplamlıdır:** alınanın %60'ı saldırana geçer, %40'ı yok olur (aklamayı ve çiftçiliği kârsız kılar). (d) **Koruma ücreti** alıcının başlattığı, tavanlı, iptal edilebilir bir oyuncu-oyuncu aktarımıdır; haraç yapısı yoktur (§3.6).
8. **Askeri gelir meşru ama ikincil bir sermaye kaynağıdır, tek başına büyütmez.** Bugünkü ikmal parametreleriyle bir Piyade Tümeni günde ≈₺6.432 (ikmal + maaş, taban fiyat) yer; oysa parsel ölçümünde (bot, iyimser) oyuncu geliri günde ≈₺50–130 bin. Koruma hizmeti ancak çok büyük ilçelerde kendini öder. **Öneri:** mülk kipinde birlik ikmalini `×0,25` kalibre etmek (tümen/gün ≈₺1.752); o zaman kendini savunmanın maliyeti ≈ beklenen yağma kaybı olur ("sigorta paritesi"), koruma hizmeti ≈ başabaş çalışır, tedarikçi marjı ≈%14 olur (§3.6, Ek A).
9. **Rutin angarya değildir.** Aktif komutan için zorunlu karar günde 0'dır; öneri ≤3'tür. Birlik ikmal bitince **yok olmaz, güç orantılı düşer**; baskın otomatik çözülür, çevrimdışı hazır duruş geçerlidir; günlük giriş ödülü, geri sayım kırmızısı, "saldırıya uğradın" bildirimi, intikam penceresi yoktur (§1.8).
10. **Alfa-0 önce PvE.** Nedenleri: PvP vali ve meclis (Alfa-1 yönetişim) ister; PvE sunucudaki determinizmle ölçülür (H3, H5, yeni AH1–AH11); ekonomiye talep yaratmak için rakip oyuncuya gerek yoktur; yanlış kalibrasyon yalnız NPC'ye karşı kaybettirir. Alfa-1'de aynı hesap defteri ve savunma toplamı üzerine il kontrol savaşı ve ittifak gelir (§3.9). **Alfa-0 kapsamı baş lider kararıdır (§3.0):** önerim, bayraklı ve iki aşamalı PvE dilimi (0a hazırlık, 0b oynanış); bayrak kapalıyken yalnız çekirdek ve şema hazırlığına iner.
11. **Görünürlük sakin kalır:** haritada zeytin yeşili `shield` katmanı ve kehribar kesikli "baskın bandı" halkası; sokakta çit, ışıklı kulübe ve silahsız nöbetçi figürleri; baskın sırasında **çatışma görseli yoktur**; "Sen yokken"de nötr şablonlar ("ambarından %7 eksildi, 1 yapı 14:20'ye kadar bakımda"). Esnaf Defteri'nde **Savunma** sayfası 9 görev taşır (7'si Alfa-0), hepsi ödülsüz ve sırasızdır (§4.4). **Sakin sönük değildir:** her baskın bir gerilim eğrisi, soyut yaklaşma çizgisi, tur kartları, zarf açılışında bir "sonuç anı", kitabe/unvan/güvenlik şeridi karşılığı ve haftada 6–14 isteğe bağlı karar sunar (§4A).
12. **Geri dönüşü zor 12 karar** §8'dedir; en ağırları: birlik envanterinin yeri, yapı kimlikleri (G8 yalnız-ekle kilidi), PvE ganimetinin mal olması, yağma iletim oranı, kayıp kalıcılığı (%60 kalıcı / %40 revir), baskın hedef biriminin ilçe olması, **"seviye ya da kilit yok, seçim var" ilkesi**.

---

## 0. Çerçeve

### 0.1 Kilitli kararlar ve bu raporun sonuçları

| Kaynak | Kural | Bu rapordaki sonucu |
|---|---|---|
| [11 Ek karar](../11-urun-donusu.md) | Askeri güç beşinci ayak; parsel el değiştirmez; savaş **kontrol** kazandırır; Alfa-0: Ordugâh + birlik + savunma + NPC eşkıya; Alfa-1: oyuncular arası il savaşı ve ittifak; mevcut modül işletme düğümlerine taşınarak yeniden kullanılır | §3 (PvE dilimi), §3.7 (taşıma listesi) |
| [11 §7.7](../11-urun-donusu.md) | Yağma ≤%25; yapı ≤%10 devre dışı, yıkılmaz; ≥49 sa ara; 14 gün kalkan; servet oranı 1:5; parsel kaybı 0; savunanın 4 saatlik bandı | §2.6 |
| [11 §7.6, §7.8](../11-urun-donusu.md) | Savaşı yalnız vali ilan eder; hareketsiz oyuncu 14 gün uyku | §3.9; §5 |
| [12 §10](../12-yon-taslagi.md) | Kamu arsası çekirdekte zorunlu, `k:ilce:` sahipli; **para alanı taşıyan sistem ya da ajan komutu yok** (ödüller çekirdek tablosundan); Alfa-0'da NPC vali | Nöbet Evi kamu hücresidir; ganimet tabloda (§3.4) |
| [12 §11](../12-yon-taslagi.md) | Oyun, gerçekçilik değil oynanabilirlik; odak (üret, işle, sat, genişle, yönet/rekabet) kaymaz | Askeri talep = üretim zinciri talebi (§3.5) |
| [bilim-teknoloji-askeri](bilim-teknoloji-askeri.md) | Teknoloji **birlik modeli ve yöntem açar**; göreli ×1,5 tavan; Alfa-0'da yalnız Piyade Model II; Topçu ve Zırhlı II Alfa-0'a girmez | Bu raporda teknolojiyi **"ilerleme fazı"** diye sunmuyoruz (§0.2) |
| Ar-Ge lideri (1 Ekim) | **Seviye ya da kilit yok, seçim var**; sahibe göre askeri gelir de meşru sermayedir; para korunumu dürüst hesaplanmalı | §0.2, §3.6, §8 K1 |

### 0.2 İlke: seviye ya da kilit yok, seçim var (dört iş modeli)

Askeri yapılar, birlikler ve savunma **oyuncu ilerleme merdiveni değildir**; oyuncunun seçtiği iş modelleridir. Açılışı yalnız beş şey sınırlar: **sermaye, uygun arsa, girdi (mühimmat, gıda, çelik, parça), işletme gideri ve H5 adalet korumaları**. Bu raporun hiçbir kuralı "Ordugâh için ilçe Kasaba olmalı", "Karakol için X gün oyna", "birlik için rütbe" biçiminde bir koşul koymaz. Teknoloji (ör. `mekanize_ordu`) **birlik türü** açar (mevcut karar); bunu bir ilerleme basamağı gibi sunmayız, ağaç ekranında "yeni seçenek" olarak görünür.

| # | İş modeli (seçim) | Ne yapar | Asgari yatırım (taban fiyat) | Sürekli gider | Gelir ya da değer | Alfa |
|---|---|---|---|---|---|---|
| **M1** | **Kendini savunan** | Kendi tesislerini ve ambarını korur: Karakol ± birkaç tümen | Karakol ₺7.840; ± Ordugâh ₺35.000 + 2 tümen ₺17.400 | Karakol ikmali ≈₺168/gün; tümen ≈₺1.752/gün (öneri kalibrasyon) | Önlenen yağma ve bakım durması; ganimet payı | A0 |
| **M2** | **Koruma hizmeti** (güvenlik hizmeti işi) | Ordusunu ilçedeki başkalarının yapılarını koruyacak biçimde taahhüt eder; haftalık ücret alır | Ordugâh + ≥4 tümen ≈ ₺69.800 | 4 tümen ≈₺7.008/gün | Alıcı ücretleri (tavanlı), ganimet payı; kâr küçüktür (§3.6) | A1 |
| **M3** | **Savunma tedarikçisi** | Ordu kurmadan mühimmat, çelik, gıda, yakıt sözleşmesiyle ordugâhlara tedarik eder (imza §4.3.4 "ikmal tedarikçisi") | Mühimmat hattı ≈₺30.000 (yapı) + zincir girdileri | Tesis işletme gideri | Sözleşme makası (≈%14 marj; NPC makasından kaçış) | A0 |
| **M4** | **İl kontrolüne talip** | İttifak ve sefer katkısıyla il kontrol savaşına katılır; vali ya da komutan olabilir | Ordugâh + ordu (tavan: ≤24 birim/işletme) | Ordu gideri | Kontrol hakkı (aday kontenjanı, kasa payı, ihale önceliği), pay yağmanın %60'ı | A1 |
| M0 | **Askeri yapmayan** | Nöbet Evi'ne ve komşularının savunmasına güvenir; isterse Karakol ya da koruma sözleşmesi alır | 0 ya da ₺7.840 | 0 ya da ₺168/gün | Hiçbir askeri zorunluluk yoktur | A0 |

Hepsi aynı anda ve herhangi bir sırayla başlanabilir; yön değiştirmek yalnız ekonomik maliyetledir (imza §4, kilitsiz yön). M0 eşit derecede meşrudur: askeri ayak **isteğe bağlı eğlence ayağıdır**, sivil oyuncu ağırlıkla kayıp ya da angarya görmez (§5).

### 0.3 Koddan okunan gerçekler

| # | Gerçek | Dosya | Sonuç |
|---|---|---|---|
| G1 | İşletme düğümü `birlikler` (tür sayısı kadar), `savunma: {durus: "normal"}`, `ikmalKarsilanmaPpm: PPM` ile doğar | `mulk/isletme.ts` | Birlik ve duruş için yeni durum alanı gerekmez |
| G2 | `birlik_uret` ve `savunma_emri` bölgeyi `ctx.ic.bolgeIndeks[k.bolge]` ile arar; diğer katmanlar (`ekonomi`, `sanayi`, `tarim`) `bolgeIndeksiBul(d, ic, id)` kullanır | `askeri/uretim.ts:28`, `askeri/savas.ts:79`; `dugum.ts` | Düzeltme: iki yerde aynı yardımcıya geçmek |
| G3 | `savas_ilan` harita bölgelerinin `komsuKenarlar`'ına bakar; işletme düğümünün kendi kenarı yoktur | `askeri/savas.ts:102–118`; `dugum.ts` | Bölge kipi `savas_ilan` aynen kalır (altın özetler); PvP için ilçe hedefli **yeni komut** gerekir |
| G4 | `ikmalTalebi(d, ctx, bolge)` indeks alır, mal başına mili-birim/saat döndürür; talep çözümde `h.talep`'e girer, `ikmalKarsilanmaPpm` = ikmal mallarının en düşük karşılanma oranı | `askeri/uretim.ts`; `ekonomi/uretim.ts:354, 627` | Ordu talebi **zaten üretim zinciri talebidir**; ek mekanik gerekmez |
| G5 | Birlik maaşı saatlik para lavabosu (`birlikMaasiSaat` 8.000 mili = ₺8/sa) düğüm başına çalışır | `lojistik/cozum.ts:132` | Maaş lavabosu işletme düğümünde hazır |
| G6 | Ordugâh yok: `tesisTurleri`, `mulk.yapiYuva`, `mulk.ekYapilar` içinde tanımlı değil; docs/06 §15.3 "Ordugâh bu işte yoktur" | `icerik.json`, `parametreler.json` | Ordugâh `ek yapı` olarak eklenir (gerekçe §8 K10) |
| G7 | Yağma ve kayıp tavanı tek noktada: `kayipTavaniUygula(anlik, yagmaOrani, kayipTavani)`; param: `yagmaOraniPpm` 400.000, `kayipTavaniPpm` 250.000; ilan kuralları (a)(b)(c) ardışık yağmayı önler | `askeri/savas.ts` | Çok kaynaklı (PvE + PvP) tavan için **düğüm başına defter** gerekir (§2.6) |
| G8 | `TesisDurumu.onarimBitis`: "bu ana kadar tesis çalışmaz" | `tipler.ts` (`TesisDurumu`) | Yapı ≤%10 devre dışı **mevcut alanla** uygulanır |
| G9 | `HucreDurumu.ilce` var; hücre → tesis/ek yapı `tesis` kimliği; ilçe başına servet hesabı türetilebilir (`hucre.degerMili`, yapı bedeli) | `tipler.ts` (`HucreDurumu`) | Baskın hedef birimi ilçe olabilir |
| G10 | PRNG akışları: `ekonomi`, `pazar`, `savas`, `olay`; mülk kipinde PvP çözümü yok, `savas` akışı Alfa-0'da boştur | `tipler.ts:586`, `prng.ts` | Eşkıya `savas` akışını kullanır: yeni akış (serileştirme göçü) gerekmez |
| G11 | Olay türleri: `savas_pencere_ac/kapa`, `parti_bitti`, `iklim_gunluk`, `saatlik_tik`… | `tipler.ts:556` | Eşkıya için 3 yeni olay (günlük planlama, pencere açılış, pencere kapanış) |
| G12 | Kamu kümesi bileşenleri: `meydan, pazar, park, hizmet, kiyi, hazine, sanayi_rezervi`; `hizmet` ilçe merkezi alanındadır (8–12 hücre) | `mulk/kamu.ts` | Nöbet Evi için yeni kamu bileşeni **gerekmez** |
| G13 | Mülk yeni oyuncu: hibe ₺50.000, başlangıç stoğu çelik 120 / parça 40 / gıda 200 birim (**mühimmat yok**), kalkan 14 gün; ek yapılar için `enFazlaIlBasina`, ilk 5 yapıda %30 indirim | `parametreler.json mulk.yeniOyuncu` | Yeni oyuncu mühimmat olmadan birlik üretemez: Tarım→Askeri geçişinin zorluğu zaten kodda |
| G14 | `askeri_rezerv` lojistik kapasitesinin payını askeri mallara ayırır (≤%50) | `lojistik/cozum.ts:304` | docs/11 F0 formunu kaldırıyor; mülk kipinde otomatik öncelik (§3.7 madde 9) |
| G15 | Ölçüm: parsel H5 (`olcum/src/parsel/h5.ts`): 48 sa çevrimdışı, parsel kaybı 0, depo kaybı ≤%25 (payda pencere içi en yüksek stok) | `olcum/src/parsel/h5.ts` | Defter bu paydayla uyumludur (§2.6) |

**Ölçek notu (önemli).** Bugünkü ikmal tablosu bölge kipi için yazıldı. Parsel ölçümünde (bot, kısa koşu, "taze toprak" nedeniyle iyimser; [parsel-v0-bulgular](../olcum/parsel-v0-bulgular.md) bulgu 4) oyuncu başına 7 günlük net üretim geliri ≈₺350–910 bin, yani **günde ≈₺50–130 bin**. Bir Piyade Tümeni (ikmal gıda 2 birim/sa, mühimmat 0,8 birim/sa, maaş ₺8/sa; taban fiyatla) günde:

| Hesap | Gıda | Mühimmat | Maaş | **Toplam/gün** | Gelirin payı (₺50–130 bin/gün) |
|---|---:|---:|---:|---:|---|
| **A: bugünkü tablo** | ₺3.360 | ₺2.880 | ₺192 | **₺6.432** | %5–13 (tümen başına) |
| **B: ikmal ×0,25 (öneri)** | ₺840 | ₺720 | ₺192 | **₺1.752** | %1,3–3,5 |

Hesap A'da 4 tümen günlük gelirin %20–50'sini yer; bir "seçim" olarak kendini savunmak bile ağır bir yüke dönüşür. Bu rapor **Hesap B**'yi önerir (`askeri.ikmalCarpaniPpm`, yalnız mülk kipi, §3.7 madde 3) ve sayıları iki hesapla gösterir. Ekonomi kalibre edildiğinde (ölçüm raporu) çarpan yeniden ayarlanır; hükümler **oransaldır**.

### 0.4 Önceki belgelerle tutarsızlıklar ve düzeltme önerileri

| # | Tutarsızlık | Öneri |
|---|---|---|
| T1 | [çeşitlilik §5.3](cesitlilik-yonetim-askeri-teknoloji.md): eşkıya ön duyurusu **≥6 sa** (Kule ile 12 sa); [canlı dünya F1](canli-dunya-simulasyonu.md): olay ön duyurusu ≥24 sa; [imza K1](imza-mekanikleri-ve-yonelimler.md): erken haber +6 sa | Baskın yağma yaptığı için **24 sa** (Kule: +12 sa = 36 sa; mahalle K1 aynı +6 sa ile ayrı ve en büyük sayılır). Çevrimdışı oyuncuya gece yarısı baskın kapanır |
| T2 | [11 §6](../11-urun-donusu.md): Ordugâh Alfa-1; Ek karar: Alfa-0 | Ek karar esas (çeşitlilik §1'deki aynı bildirim) |
| T3 | "İl komutanlığında havuzlanır" [11 §7.7](../11-urun-donusu.md) | **Envanter oyuncuda; komuta ilde** (§2.3). UI adı "İl savunma düzeni"; **"komutanlık"** gerçek kurum adlarıyla karışır (§6) |
| T4 | [11 §7.7](../11-urun-donusu.md) ve [rehber §2.5](rehber-gorevler.md): Savunma sayfası "yapı kümesi gelince" | **Alfa-0'da açılır** (Ordugâh/Karakol Alfa-0'dadır); sayfa kilitsizdir (§4.4) |
| T5 | [çeşitlilik §5.3](cesitlilik-yonetim-askeri-teknoloji.md): "PvE yağması ≤%10" ve "ortak ≤%25 pencere tavanı" | İkisi birlikte: PvE tek baskın oranı ≤%10 **ilçe payıyla ölçeklenir**; ortak ≤%25 defter tavanıdır (§2.6) |
| T6 | Mevcut `yeniOyuncuKorumasiGun` 7, mülk kalkanı 14 | Mülk kipinde **14 gün** esas (kodda zaten böyle) |

---

## 1. Askeri rutin (oyuncu gözünden)

### 1.1 Aynı rutin, dört iş modeli: ne farklı

İlkeler: (1) **sıkıcı bakım yok**; (2) **"uğramazsan kaybedersin" yok** (§1.8); (3) askeri rol sivil ekonomiye bağlıdır: **ordunun her ihtiyacı üretim zincirinde bir mal ya da yapıdır**; (4) her adımın bir ekran düğmesi vardır, zorunlu yürüyüş ve taşıma yoktur; (5) bir adım atlandığında en kötü sonuç **fırsat**tır, kayıp değil.

### 1.2 Döngü tablosu: M1 / M4 komutanı (ordu işleten oyuncu)

Not: hepsi **seçenektir**; "Zorunlu" sütunu 0'dır. Süreler oyuncu başına tahmindir (insan testiyle doğrulanacak).

| Ritim | Ekranda ne olur | Oyuncu ne yapabilir | Süre | Zorunlu mu? | Atlanırsa ne olur |
|---|---|---|---:|---|---|
| **5 dakika** (oturum açılışı) | **Sen yokken** ≤8 satırda askeri maddeler (§4.3). **Dikkat paneli** (≤5 madde): "Yaklaşan baskın", "İkmal yetersiz ▲", "Kapasite dolu", "Parti bitti". Ordugâh kartında **İkmal Kartı**: gıda, mühimmat, yakıt, (parça) için kapsam günü | (1) "Yaklaşan baskın" kartında tahmini boyu ve savunma durumunu (✓ yeterli / ◯ sınırda / ▲ yetersiz) oku; (2) duruşu **Kendi yapılarım / İl nöbeti / Dışarıda** arasında seç (tek tık); (3) biten parti varsa "Aynı partiyi tekrarla" | 1–5 dk | Hayır | Hazır duruş geçerlidir; baskın otomatik çözülür; en kötü sonuç stoğun ≤%10'u × ilçe payı kadar eksilmesidir (§3.4) |
| **1 saat** (oturum içi planlama) | Ordugâh: parti kuyruğu, kapasite (12 birim/ordugâh), bitiş saati ("bitiş 14:20") | Yeni parti ver (Piyade: çelik 30, mühimmat 20, gıda 30 birim, 12 sa); ikmal kaynağını seç: **kendi üretimim / sözleşme / pazar** (§1.4); Genel Talimat kuralı: "mühimmat < 40 birim ise ithal et" (≤5 kalıcı kural, [canlı F2](canli-dunya-simulasyonu.md)); Karakol/Kule yerleştir (hücre seç) | 5–20 dk | Hayır | Parti yoksa ordu büyümez; hiçbir şey eksilmez |
| **1 gün** | Akşam 19:00–23:00 baskın bandı: bir ilçeye bir saatlik dilim. Gün sonu **Akşam Defteri** satırı ([donus-deneyimi](donus-deneyimi.md) DB-1). Sabah **Sen yokken**: baskın sonucu, revir, onarım | İsteğe bağlı (Alfa-1, yürüyüş): **nöbet turu** (Karakol/Kule yanında "Mevzi hazırla": 24 sa savunma +%3, yapı başına günde 1, toplam ≤%5; [capital-rift §4.2–4.3 madde 11](capital-rift-mekanikleri.md)); devre dışı kalan yapıyı izle (24 sa bakım bitiş saati yazılı); ganimeti stoğa al (otomatik) | 0–10 dk | Hayır | Yok |
| **1 hafta** | **İl savunma defteri** (haftada bir): baskın sayısı, katkı payın, ganimet, ordunun haftalık gideri, "önlenen tahmini kayıp" | Ordu büyüklüğünü gözden geçir (maliyet / önlenen kayıp); tedarik sözleşmelerini yenile; Karakol/Kule ekle; **teknoloji seç** (Piyade II, `mekanize_ordu` → Zırhlı), ittifaka katıl; Alfa-1: savaş ilanı/sefer kapanışı (§3.9) | 15–40 dk | Hayır | Hafta içi değişiklik yoksa ordu aynı kalır |

### 1.3 Ordugâh işletmek

- **Yapı:** Ordugâh 3 yuva (bitişik), 12 sa inşa, ilde ≤2; birlik kapasitesi **12 adet/ordugâh** (üretimdeki partiler dahil). Düğümde ≥1 biten Ordugâh olmadan `birlik_uret` reddedilir (mülk kipinde).
- **Parti:** `birlik_uret {bolge: "<il>#<oyuncu>", birlik, adet}` (mevcut komut; 1–100 adet; kapasite sınırı yeni). Maliyet anında düşer, birlikler `partiSuresiSaat` sonra eklenir. **Piyade Tümeni:** çelik 30, mühimmat 20, gıda 30 birim = **₺8.700** malzeme, 12 sa. **Zırhlı Tümen** (`mekanize_ordu` teknolojisiyle açılır): çelik 80, parça 30, yakıt 20 = ₺17.000, 18 sa. Birlik kaydı eklenirse (Topçu vb. [bilim-teknoloji §5.4](bilim-teknoloji-askeri.md)) aynı akıştır.
- **Birlik büyüklüğü sınırı:** işletme başına en çok 2 Ordugâh = 24 birim. Bu tavan hem ittifaksız devleşmeyi hem de maaş/ikmal gideriyle (Hesap B: 24 tümen ≈ ₺42 bin/gün) doğal bir üst sınırı birlikte kurar.
- **Duruş (üç seçenek, mevcut `savunma_emri`):** `normal` ("Kendi yapılarım": yalnız yapısı olan ilçelerdeki baskınlara katılır), `savunma` ("İl nöbeti": ildeki tüm baskınlara katılır, güç ×1,3), `geri_cekil` ("Dışarıda": katılmaz, birlik kaybı 0, ama yağma tavanı geçerlidir). **Duruş çevrimdışıyken de geçerlidir** (mevcut).

### 1.4 İkmal zincirini kurmak: ordunun gerçek talebi

Birlik başına ikmal tablosu (mili-birim/saat): Piyade gıda 2.000 + mühimmat 800; Zırhlı yakıt 3.000 + mühimmat 1.200 + parça 500. Hesap B'de ×0,25.

| Hesap | 1 mühimmat hattı (`standart_muhimmat`, 40 birim/sa = 960/gün) kaç Piyade Tümeninin ikmalini besler | 1 gıda fabrikası (`standart_gida_isleme`, 160 birim/sa) |
|---|---|---|
| A | **50 tümen** (0,8 birim/sa/tümen) | 80 tümen (2 birim/sa/tümen) |
| B | **200 tümen** | 320 tümen |

Yani **bir mühimmat hattı bütün bir ilin ordusunu besler**; Alfa-0'ın 45 ilçesi için 4 tümen/ilçe (180 tümen) toplam mühimmat talebi Hesap A'da 144 birim/sa (≈3,6 hat), Hesap B'de 36 birim/sa (≈0,9 hat). Birlik üretimi tek seferlik talep sıçraması yaratır (180 tümen × 20 = 3.600 mühimmat ≈ bir hattın 3,75 günü). **Askeri talep küçük ama keskindir:** çelik, mühimmat, gıda, yakıt (ve Zırhlı için parça) tedarikçilerine yönelir.

| Seçenek | Nasıl | Artı | Eksi |
|---|---|---|---|
| **Kapalı zincir (M1/M4)** | Çelikhane + mühimmat fabrikası + gıda zinciri kendi ilinde | NPC makasından (ithalat ×1,10) kurtulur; talep kendi stokundan | Sermaye ve dikkat yükü (Tarım→Askeri en zor geçiş, imza §4.1) |
| **Tedarik sözleşmesi** (A1; Alfa-0'da NPC panosu) | Bir tedarikçiyle haftalık ya da sürekli teslim | Kapalı zincir kurmaz | Karşı taraf riski; sözleşme makası |
| **Pazar (NPC ithalatı)** | Genel Talimat: "stok < X → ithal et" (emir yuvası tüketir; Ticaret ofisi +4) | Sıfır dikkat | ≈%10 prim (ithalat çarpanı 1,10) |

**İkmal Kartı (arayüz).** Ordugâh yapısına tıklayınca üç satır: *Gıda 9 gün yeter · Mühimmat 3 gün yeter ▲ · Yakıt –*; her satırda kaynak etiketi (kendi tesisin / sözleşme / pazar) ve tek düğme ("Tedarik et": mevcut ticaret emri formu). İkmal bitince birlik **kaybolmaz**; `ikmalKarsilanmaPpm` düşer, güç orantılı düşer (mevcut çözüm). Ana gösterge "kaç gün yeter" (kırmızı geri sayım yok).

### 1.5 Nöbet ve devriye (adaptasyon katmanı; Alfa-1)

Yürüyüş stratejinin yerine geçmez ([11 ek karar](../11-urun-donusu.md)). Karakol/Gözetleme Kulesi yanında **"Mevzi hazırla"** tek tık: 24 sa o düğümün savunma gücü +%3; yapı başına günde 1; toplam yürüyüş etkisi ≤%5 ([oyun-kimliği A2](oyun-kimligi-harman.md)). Panelden eşdeğeri vardır: "Mevzi hazırla" düğmesi aynı etkiyi verir, **yürümek zorunlu değildir**. Etki küçüktür; amaç dünyayı hissettirmek ve çevrimiçi/çevrimdışı farkını yaratmamaktır (hazır savunma emri zaten geçerlidir).

### 1.6 Eşkıya baskını döngüsü (Alfa-0): saat saat

| Zaman | Olay | Oyuncu görür | Oyuncu seçebilir |
|---|---|---|---|
| T−24 sa (Kule varsa T−36) | Duyuru: ilçe, bant, **tahmini boy** (±%25; Kule ile ±%10) | Dikkat paneli "Yaklaşan baskın"; takvimde işaret; İkmal Kartı yanında "savunma yeterli mi?" | Parti ver, duruşu "İl nöbeti" yap, Karakol kur (4 sa) |
| T−4 sa | Hazırlık penceresi kapanmadan son hatırlatma (tek, bildirim değil Dikkat maddesi) | Aynı kart | — |
| T (örn. 19:00) | Pencere açılır: katılımcı listesi ve güçler **kilitlenir** (anlık görüntü) | Haritada kehribar kesikli halka "nöbet" | — |
| T+1 sa | Otomatik çözüm | Sonuç kartı (nötr): "Savunuldu" ya da "Savunma yetmedi" | — |
| T+1 sa … T+24 sa | Revir ve onarım: kaybın %40'ı 24 sa içinde döner; devre dışı yapı bitiş saatinde açılır | Sen yokken satırı | Onarımı beklemek ya da ilgili parti vermek |
| T+4 gün | Bekleme biter (aynı ilçeye ≥96 sa, ≥49 sa kuralının üstünde) | — | — |

### 1.7 İl nöbeti, ittifak seferi ve savaş penceresine hazırlık

- **İl nöbeti (A0):** `savunma` duruşu: ildeki tüm baskınlara katılırsın; kendi ilçende olmasan da katkına göre ganimet payı alırsın (kamu malı ama ödüllü; bedava binici de korunur, çünkü H5 koruması herkese geçerlidir).
- **İttifak seferi (A1):** ittifak, aynı hedefe birlik katkısı verir: `sefer_katil {savas, oranPpm}` (birlik envanterinin ppm oranı, T−4 sa'te kapanır; katılan birlik pencere + 1 sa kilitlenir). Kalkanlı hesap katılamaz; ittifak tavanları [cesitlilik §5.5](cesitlilik-yonetim-askeri-teknoloji.md) aynen.
- **Savaş penceresine hazırlık (A1):** ilanı gören savunan oyuncular için **12–24 sa önceden** Dikkat maddesi ve takvim işareti; "hazır savunma emri" (durum + il nöbeti) çevrimdışı geçerlidir; intikam penceresi ve "saldırıya uğradın" bildirimi yoktur ([donus-deneyimi U8](donus-deneyimi.md)).

### 1.8 "Uğramazsan kaybedersin" denetim listesi (rutin angarya testi)

| # | Soru | Cevap (tasarım) |
|---|---|---|
| 1 | Ordu için günlük giriş ya da tekrar eden bakım var mı? | Hayır. Maaş ve ikmal **otomatik** (stoktan ve hazineden düşer), kuyruk oyuncu girmeden çalışır |
| 2 | İkmal stoku biterse birlik gider mi? | Hayır. `ikmalKarsilanmaPpm` düşer, **güç orantılı düşer**; birlik sayısı değişmez |
| 3 | Baskın sırasında çevrimdışı olmak ceza mı? | Hayır. Hazır duruş geçerli; kayıp ≤%10 stok × ilçe payı, yapı ≤%10 yuva 24 sa; parsel 0 |
| 4 | Aynı ilçeye art arda baskın olur mu? | Hayır: bekleme 4 gün (≥96 sa) ve ≥49 sa ortak kural |
| 5 | Günlük giriş ödülü, seri, geri sayım kırmızısı? | Hayır ([donus-deneyimi §1.3](donus-deneyimi.md)) |
| 6 | Savaş ilanına yanıt süresi kısa mı? | PvE'de ilan yok; PvP'de ilan ≥20 sa önceden, hazır emir geçerli |
| 7 | Ordu büyütmeyi zorlayan kademe baskısı var mı? | Hayır; ilçe ve işletme başına servet eşiği altında baskın yoktur, M0 oyuncusunun kaybı tavanlıdır (§5) |
| 8 | Uzun yokluk (14 gün+) ordu için ne yapar? | **Uyku:** ikmal talebi ve maaş donar, birlik savunmaya katılmaz, hedef alınmaz, yağma ödülsüzdür; dönüşte "Ordun uyandı" tek satır (yargı yok) |

---

## 2. Arsa dünyasına oturtma

### 2.1 Eşleme tablosu

| Askeri kavram | Arsa dünyasındaki nesne | Birim | Sahibi | Durum alanı | Değişir mi |
|---|---|---|---|---|---|
| **Ordugâh** | Hücreli ek yapı (3 bitişik hücre) | İşletme düğümü (il) | Oyuncu | `BolgeDurumu.ekYapilar` (mevcut) | Yeni tür kimliği |
| **Karakol** | Hücreli ek yapı (1 hücre) | İlçe | Oyuncu | `ekYapilar` | Yeni tür |
| **Gözetleme Kulesi** | Hücreli ek yapı (1 hücre) | İlçe | Oyuncu | `ekYapilar` | Yeni tür |
| **Sur/Barikat** (A1/sonra) | Hücreli ek yapı | İlçe | Oyuncu | `ekYapilar` | Yeni tür |
| **Mühimmat fabrikası** | Mevcut tesis türü (2 yuva) | İşletme | Oyuncu | `tesisler` | Değişmez |
| **Nöbet Evi** | Kamu hizmet hücresi (ilçe merkezi) | İlçe | `k:ilce:<id>` (kamu) | Yok (parametre) | Değişmez (kamu bileşeni var) |
| **Birlik** | `BolgeDurumu.birlikler[tür]` | İşletme düğümü | Oyuncu | Mevcut | Değişmez |
| **Savunma duruşu** | `BolgeDurumu.savunma.durus` | İşletme düğümü | Oyuncu | Mevcut | Değişmez |
| **İl savunma düzeni** | Soyut: ildeki işletme düğümleri + valinin kuralları | İl | Vali (A1) / NPC vali (A0) | Yok | Yalnız görünüm (A0) |
| **Baskın** | `Dunya.baskinlar[]` (yeni) | İlçe | NPC | Yeni | Yeni |
| **Yağma defteri** | `BolgeDurumu.yagmaPenceresi?` (yeni, isteğe bağlı) | İşletme düğümü | Oyuncu | Yeni | Yeni (A0'da PvE, A1'de PvP) |
| **Kontrol hakkı** (A1) | `Dunya.ilceKontrol[]` (yeni) | İlçe → il | İl | Yeni | Yeni |
| **Abluka** (A1) | Kenar kapasite çarpanı + bitiş | Merkez kenarı | — | Yeni | Yeni |

### 2.2 Askeri yapı kataloğu ve hücre kuralları (öneri)

Hepsi mevcut `mulk.ekYapilar` biçimindedir ([06 §15.3](../06-simulasyon-spesifikasyonu.md)): `ad, yuva, insaSaati, insaParasi, insaMaliyeti, enFazlaIlBasina` + etki alanı. **İlçe gelişim seviyesi şartı yoktur.**

| Yapı | Yuva | İnşa | Para + malzeme | Toplam (taban) | İlde en çok | Etki | Sürekli gider |
|---|---:|---:|---|---:|---:|---|---|
| **Ordugâh** | 3 | 12 sa | ₺20.000 + çelik 80 + parça 30 | **₺35.000** | 2 | Birlik kapasitesi **12**/yapı; `birlik_uret` şartı | Yok (birlik başına maaş/ikmal ayrı) |
| **Karakol** | 1 | 4 sa | ₺4.000 + çelik 20 + parça 8 | **₺7.840** | 2 | İlçe savunmasına nöbetçi gücü: ilçede 1. Karakol **+100**, 2. **+50** (ilçede ≤2 etkili); **sahibine** o gücün ganimet payı | Nöbetçi ikmali: gıda 100 mili/sa (≈₺168/gün) |
| **Gözetleme Kulesi** | 1 | 3 sa | ₺2.000 + çelik 10 + parça 5 | **₺4.100** | 1 | İlçe geneli: duyuru **+12 sa** (24 → 36) ve tahmin ±%25 → ±%10; sahibin Dikkat panelinde "Yaklaşan baskın" 36 sa önce | Yok |
| **Sur/Barikat** (A1/sonra) | 1–2 | 6 sa | [cesitlilik §5.2](cesitlilik-yonetim-askeri-teknoloji.md) | — | — | Savunan çarpanı +%10; toplam savunma bonusu ≤+%35 | — |
| Güvenli depo (modül, sonra) | — | — | [arsa-ve-insa §3.3](arsa-ve-insa-derinlestirme.md) | — | — | Mühimmat olay kaybı −%70 | — |

**Hücre ve arsa kuralları (arsa-ve-insa §2.2 izin matrisine ek):**

| Yapı | Tarla | Bahçe | Sanayi | Ticari | Konut | Kıyı | Orman | Ada başına | Komşuluk |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|---|
| Ordugâh | ○ | ✗ | ○ | ✗ | ✗ | ✗ | ○ | ≤1 | Rol K (hafif): konuta bitişik değil (komşu ada olabilir) |
| Karakol | ✓ | ○ | ✓ | ✓ | ○ (arsa başı 1) | ✓ | ○ | ≤1 | Yok |
| Gözetleme Kulesi | ✓ | ○ | ✓ | ✓ | ✗ | ✓ | ✓ | ≤1 (ilçede etkili ≤1) | Yok |
| Mühimmat fabrikası | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ○ | — | **Ada izolasyonu** (hassas komşu aranmaz) |

○: arsa başına 1 adet, ya da ilçe imar kartı. **Satın alınamaz hücre:** yol, su, korunan alan, `landuse=military` ([11 §7.2](../11-urun-donusu.md)); bu hücreler haritada **yalnız nötr "engel"** olarak gri gösterilir (adı, türü, kurumu yazılmaz; §6).

Ek yapı yuvası 1'den büyük olabilir (Ordugâh 3): `mulk/komut.ts` yuvayı ek yapı tanımından okur (1–3 hücre, kenar-bitişik) ve `ekYapiTamamla` `hucreler` listesini döngüyle işler; yani Ordugâh için kod değişikliği yalnız parametre ve kapasite alanıdır (okunarak doğrulandı).

### 2.3 Birlikler nerede durur? (Karar K1)

| Seçenek | Anlatım | Artı | Eksi | Karar |
|---|---|---|---|---|
| **(a) İşletme düğümü** (mevcut) | Birlik oyuncunun (oyuncu, il) düğümünde; ikmal ve maaş orada | Kod hazır (G1, G4, G5); sahiplik net; ikmal talebi doğal; kayıp ve ganimet kişiye ait | İlçeye bağlı değil: ilçe savunması için katılım kuralı gerekir | **Evet (envanter)** |
| (b) İl havuzu (ortak envanter) | Birlik ilin (vali) emrinde | "İl komutanlığı" metnine uyar | İkmal ve maaş kime ait? Vali dikta; Alfa-0'da NPC vali; kayıp ve ganimet bölüşümü yok; M1 oyuncusu hiçbir şeye sahip değil | **Hayır** |
| (c) Konumlu (ilçeye/hücreye gönder) | Birlik haritada bir yerde durur, gönderilir | Strateji hissi (HoI4) | Hareket, rota, zaman; mikro yönetim ve angarya (Foxhole dersi); yürüyüşle karışır; durum şeması şişer | **Hayır** |
| **(d) Karma: envanter (a) + il nöbeti** | Envanter düğümde; katkı duruşla il düzeyine verilir | (a)'nın tüm artıları; il savunması toplanır; "il komutanlığı" **komuta** olarak yaşar | Duruş anlamı (üç seçenek) öğretilmeli | **Evet (önerilen)** |

"Komuta ilde" demek: ildeki baskına **kimin katılacağı** kuralı (duruş) ve ilde görünen **il savunma defteri**; birlik fiziksel olarak ildeki Ordugâh ilçesinde sembolik görünür (harita ikonu), taşınmaz.

### 2.4 Askeri yapı: kamu mu, oyuncu mu? (Karar K10)

| Yapı | Karar | Gerekçe |
|---|---|---|
| Ordugâh, Karakol, Gözetleme Kulesi, Sur | **Oyuncu ek yapısı** | Yatırım ve seçim askeri ayağın eğlencesidir; M1–M4'ü yapı sahipliğiyle kurar; kamu yapısı olsaydı "kimin için" sorusu ve vali bağımlılığı doğardı; Alfa-0'da NPC vali var |
| **Nöbet Evi** | **Kamu yapısı** (ilçe merkezi `hizmet` hücresi, `k:ilce:<id>`) | Her ilçede taban savunma ve baskın panosu: savunmasız ilçe olmaz, M0 oyuncusu bir şey kurmak zorunda kalmaz. NPC arsa sahibi değil kamu sahibidir ([12 §10 G1](../12-yon-taslagi.md)). Maliyet **sıfır** (parametre: `nobetEviGuc` 100; istemcide hizmet hücresine ikon) |
| **İlçe/il komutanlığı** | **Yapı değil** | İlçede Nöbet Evi; ilde "il savunma düzeni" (kural + görünüm). Alfa-1'de il merkezindeki kamu hizmet hücresi "Savunma Kurulu" ikonuyla; vali yetkisi doktrin/ilan (yönetişim). Envanter taşımaz |
| Muhtarlık | Kamu (mevcut karar) | Dokunulmaz |

**Nöbet Evi'nin yaptıkları (A0):** (1) ilçe savunmasına **100 güç** (1 tümen eşdeğeri) ekler; (2) baskın duyurusunu ilçe panosuna yazar ("Çay ocağı" kanalının askeri karşılığı, [imza İ-4](imza-mekanikleri-ve-yonelimler.md)); (3) baskın sonrası tek satır bülten ("Gün batımında nöbet bitti"). Para ve mal akışı yoktur.

### 2.5 Savaşın neyi etkilediği (A1; PvP ve ilçe kontrol savaşı)

Ek karar: savaş **kontrolü** kazandırır. Arsa dünyasına eşleme:

| Etki | Çekirdek nesnesi | Süre / tavan | Para kaynağı | Not |
|---|---|---|---|---|
| **İl kontrol hakkı** (aday kontenjanı) | `ilceKontrol {ilce, il, bitis}`; ilçe muhtar/başkan seçiminde bir aday kontenjanı (halk yine oy verir) | 14 gün; yenilenemez, yeni ilan gerekir | Yok | Seçim paraya satın alınamaz kuralları aynen ([cesitlilik §4.2](cesitlilik-yonetim-askeri-teknoloji.md)) |
| **Vergi bandı** (ilçe kasası payı) | İlçe kasasından ≤%15 pay (haraç değil, açık defterde "kontrol payı") | 14 gün | **Kamu → il hazinesi** aktarımı (yanan paradan); ilçe kasası ≈₺2.200/hafta olduğundan 14 günde ≈₺660: **gelir değil hak simgesi** ([kamu §4](kamu-ve-kamu-arazileri.md)) | Para yaratmaz |
| **İhale önceliği** | Kamu ihale puanında (Profil Y: fiyat %70 / süre %20 / yerellik %10) hak sahibi ilin üyeleri için **yerellik kalemi tam puan**; eşit puanda öncelik | 14 gün | Kamu kasası (mevcut ihale harcaması) | Kazananı yine kural seçer ([12 §10](../12-yon-taslagi.md)); kayırma yok |
| **Geçiş ücreti payı** (liman/geçit) | Liman primi akışından ≤%15 pay il hazinesine | 14 gün | Kamu → il hazinesi; prim zaten yanan paradandır | Miktar ölçülecek (**doğrulanmadı**: bugün `limanPrimTavaniPpm` %15) |
| **Abluka** | Merkez kenarı kapasite çarpanı (≥%50 kalır), gıda ve elektrik koridoru muaf | ≤72 sa; aynı kenarda 7 gün ara | Yok | Birincil ekonomik savaş aracı; 12 sa önceden duyuru ([cesitlilik §5.5](cesitlilik-yonetim-askeri-teknoloji.md)) |
| **Ortak kaynak payı** (damar, su, hat) | Mülk kipinde damar işletme başına kopyadır (docs/06 §15): payı **F6 sonrası** | — | — | Alfa-1'e girmez |
| **Sınırlı yağma** | Savunan düğümlerin stoku, ≤%25 defter tavanı, **%60 iletim** | Pencere başına | Oyuncu → oyuncu (negatif toplamlı) | §3.6 |
| **Yapı devre dışı** | ≤%10 yuva, 24 sa, `onarimBitis` | — | Yok | Yıkım yok |

### 2.6 H5 kuralları işletme düğümlerine uygulanışı

| H5 kuralı | Bölge kipi (bugün) | İşletme düğümü / ilçe (öneri) |
|---|---|---|
| **Yağma ≤%25 / pencere** | `kayipTavaniUygula` tek nokta; ardışık yağmayı ilan kuralları (a)(b)(c) engeller | Tek nokta korunur; **düğüm başına yağma defteri** `yagmaPenceresi {baslangic, kullanilanPpm}` (24 sa kayan): her yağmada `kalan = 250.000 − kullanilanPpm`; mal başına uygulanan oran `min(olay oranı × ilçe payı, kalan)`; PvE ve PvP **aynı defteri** tüketir. Parsel H5 paydasıyla uyumlu: kayıp ≤ %25 × pencere içi en yüksek stok (G15) |
| **İlçe payı** | — | `pay = (düğümün hedef ilçedeki biten tesis ve ek yapı yuvası) ÷ (düğümün toplam biten tesis ve ek yapı yuvası)`; yağma oranı bununla çarpılır: portföyü yayılmış oyuncu daha hafif etkilenir |
| **Yapı ≤%10 devre dışı** | Yok (bölge kipinde yapı hücresi yok) | Bütçe `⌊%10 × düğümün toplam biten tesis yuvası⌋`; hedef ilçedeki **üretim tesisleri** arasından PRNG sırasıyla seçilir; seçilen tesis `onarimBitis = max(mevcut, t + 24 sa)`; yuvası bütçeye sığmayan tesis atlanır. Yan etki (tasarım): ilk ≈10 yuvaya kadar olan küçük işletme bu kuraldan **etkilenmez**; Karakol, Ordugâh, Kule ve diğer ek yapılar devre dışı bırakılmaz (ölüm sarmalı yok) |
| **≥49 sa ara** | İlan kuralı (b): yağma sonrası pencereSaat boyunca ilan yok | İlçe bekleme: baskın sonrası **4 gün (≥96 sa)**; PvP'de kontrol savaşı için ≥49 sa ve il başına ≤1 ilan/hafta ([cesitlilik §5.4](cesitlilik-yonetim-askeri-teknoloji.md)) |
| **14 gün kalkan** | `korumaBitis` | Kalkanlı oyuncunun yapısı ve stoku **hedef dışı**; ilçe servetine sayılmaz; birlik katkısı veremez |
| **Hareketsiz hedef** | — | Uyku (14 gün, tatil modu dahil): ilçe servetine sayılmaz, hedef dışı, yağma ödülsüz, birlik katılmaz |
| **Parsel kaybı 0** | `sahip` değişmez | Hiçbir askeri komut ya da olay `HucreDurumu.sahip`'i ya da hücre listesini değiştirmez; **özellik testi**: rastgele baskın/savaş akışından sonra tüm hücre sahipleri aynıdır (§5.5) |
| **Servet oranı 1:5** | — | PvP: ilan eden ilin aktif servet toplamı ÷ hedef ilin aktif servet toplamı ∈ [0,2 ; 5]. **Servet** = hücre değerleri + yapı bedeli + stok (taban fiyat); hazine ve birlik dışı |

### 2.7 Parsel asla el değiştirmez: invaryant

Hiçbir `askeri/*` fonksiyonu `d.mulk.hucreler`'e yazmaz; `HucreDurumu.sahip`, `tesis`, `degerMili` salt okunur olarak kullanılır. Savaş sonucu yalnız şunlara yazar: stok (yağma), `birlikler`, `onarimBitis`, `ilceKontrol` (A1), `yagmaPenceresi`. Özellik testi (§3.7 madde 11): rastgele tohumla 90 gün + eşkıya + (A1) savaş; sonunda her hücrenin sahibi başlangıçtakiyle aynıdır.

---

## 3. Alfa-0 askeri dilimi: PvE ve en küçük çekirdek değişikliği

### 3.0 Karar kutusu (baş lider): askeri katman Alfa-0'a girsin mi?

**Çelişki.** Sahip ek kararı ([11 Ek karar](../11-urun-donusu.md)): "Alfa-0'da Ordugâh + birlik üretimi + savunma + NPC eşkıya baskınları (PvE)". Karşı: [11 karar tablosu madde 10 / K32](../11-urun-donusu.md) ("Askeri, seçimler ve yürüyüş Alfa-1'e kalır"), [11 §6](../11-urun-donusu.md) ("Yapılar: Ordugâh dışındaki 17'si"), [11](../11-urun-donusu.md) "elenen seçenekler"de "Alfa-0'da yönetişim, askeri ve yürüyüşü de açmak: kritik yolu uzatır" ve risk R-Ü14 (kapsam kayması; en çok 4–5 eşzamanlı ajan). Ek karar sonraki ve özeldir; K32'yi **daraltır**. Karar baş liderindir.

| | **(i) Alfa-0 PvE dilimi** | **(ii) Alfa-0'da yalnız çekirdek ve şema hazırlığı** |
|---|---|---|
| **Ne** | §3.7'nin 13 kalemi; iki aşama: **0a hazırlık** (kalem 1, 2, 3, 5, 8 + kimlik kilidi) ve **0b oynanış** (kalem 4, 6, 7, 9–13). Özellik bayrağı `askeri.eskiya.etkin` (bayrak kapalıysa mülk kipinde askeri komutlar "askeri kapali" ile reddedilir) | Yalnız: 2 satırlık düğüm düzeltmesi (kalem 1), `yagmaPenceresi` şeması (kalem 5), 3 ek yapı kaydı ve kimlik kilidi, bayrak **kapalı**. Oynanış Alfa-1'de |
| **Boy** | 0a ≈ **S–M** (3–5 gün); 0b ≈ **M** (1–1,5 hafta); toplam **≈M–L** (1,5–2 hafta, tek geliştirici + istemci) | ≈ **S–M** (3–5 gün) |
| **Artı** | Sahibin ek kararını karşılar; Alfa-0 davetlilerinden **ilk gerçek askeri veri** (H3, H5, AH1–AH4, AH11) toplanır; PvE kalibrasyonu PvP'den ayrı ve erken yapılır; ekonomiye askeri talep (mühimmat, çelik) görünür; "askeri unutuldu" algısı kapanır; bayrakla **kademeli** açılır | Kritik yola etkisi sıfıra yakın; serileştirme ve kimlik kilidi maliyeti bir kez ödenir; K32 ve docs/11 §6 ile çelişmez |
| **Eksi** | Kapsam kayması riski (R-Ü14); test, denge ve ölçüm yükü; `tipler.ts` ve `serilestir.ts` üzerinde başka P0 işlerle birleştirme çatışması; Alfa-0 ≤200 davetlide baskın örneklemi küçüktür (eşik üstü ilçe az, ilk baskın en erken kalkan sonrası 14. gün) | Alfa-0 davetlileri askeri ayağı hiç görmez; sahibin ek kararıyla çelişir; PvE kalibrasyonu Alfa-1'de PvP ile **aynı anda** yapılır (risk); H3 yalnız botlarla ölçülür; "askeri unutuldu" şikâyeti sürer |
| **Kritik yola etkisi** | **Yok, ama sıra şartı var:** 0a hemen ve diğer P0'larla **paralel** (askeri/ ve `tipler` alanları); 0b şu P0'lardan **sonra**: **para güvenliği (ödül tablosu, ganimet buna dayanır)** ve **Esnaf Defteri P0 (Savunma sayfası, Dikkat paneli)**; ekmek, cam, pencere zincirleri ve dükkânla **bağımsızdır** (paralel yürür). Mal kimlik kilidi (G8) ek yapı kimliklerinden **önce** kapanmalı | Yok |
| **Geri alınabilirlik** | Yüksek: bayrak kapalı yayınlanınca (ii)'ye iner; yatırım kaybı olmaz | — |

**Önerim: (i), bayrakla ve iki aşamalı.** Gerekçe: bayrak kapalıyken sonuç (ii)'ye eşit olur; yani (i) **(ii)'yi içerir ve ondan daha kötü bir durum yaratmaz**; açma kararı ölçüme bağlanır. **Kapı kuralı (öneri):** Alfa-0 kapısına (docs/11 §6.1) bir madde eklenir: *A0-9: askeri bayrak yalnız AH1, AH2, AH4 ve parsel H5 (PvE+defter) geçerse açılır; aksi hâlde kapalı yayınlanır.* Açma kararı kapıdan **3 hafta önce** verilir. (ii) ancak P0 sırası kayarsa ve 0b için iki hafta ayrılamıyorsa seçilir.

**Karmaşıklık bütçesi ("en küçük Alfa-0 dilimi").** Sayılar bu rapordaki öneriden sayıldı:

| Boyut | **(ii) hazırlık** | **(i) PvE dilimi (0a + 0b)** | **E eğlence artısı** (isteğe bağlı, (i)'ye ek; §4A.6) |
|---|---:|---:|---:|
| **Yeni oyuncu görünür kural** | 0 | **11:** Ordugâh şartı ve kapasitesi; servet → boy; günlük planlama (p, bekleme, dilim); savunma toplamı (duruş katılımı, Nöbet Evi, Karakol); çözüm (Gs ≥ Gb); yağma ≤%10 × ilçe payı + defter; yapı ≤%10 yuva devre dışı; kayıp %15 + revir %40; ganimet; uyku muamelesi; ikmal ×0,25 kalibrasyonu | **+1** (hazır emir: Mevzi/Yedek) **+2 türev** (güvenlik şeridi, unvan; durum değiştirmez) |
| **Yeni parametre (skaler)** | ≈22 (3 ek yapı kaydı ≈21 + `etkin`) | **≈54** (`askeri.eskiya` ≈32 + `ikmalCarpaniPpm` 1 + 3 ek yapı kaydı ≈21) | **+7** (mevzi çarpanı, mevzi mühimmatı, yedek gücü, yedek kaybı, şerit uzunluğu, unvan eşiği: sayı/gün/pay) |
| **Yeni komut** | 0 | **0** (mevcut `birlik_uret`, `savunma_emri`, `tesis_insa_hucre`) | **0** (`savunma_emri`'ne isteğe bağlı `emir` alanı = 1 alan) |
| **Yeni olay türü** | 0 | **3** (`eskiya_gunluk`, `eskiya_pencere_ac`, `eskiya_pencere_kapa`) | 0 |
| **Yeni durum alanı** | 1 (`yagmaPenceresi`) | **2** (`yagmaPenceresi`, `Dunya.baskinlar`) + 3 derlenmiş alan (`birlikKapasitesi`, `nobetciGucu`, `duyuruEkiSaat`) | **+3** (`savunma.emir`, `sonuc.kalemler[]`, ilçe başına son 8 baskın) |
| **Oyuncunun öğreneceği kavram** | 0 | **9:** Ordugâh, Karakol, Gözetleme Kulesi, Nöbet Evi, baskın ve boy, duruş (3 ad), İkmal Kartı, ganimet, revir | **+4** (hazır emir, tur kartı, güvenlik şeridi, Nöbetçi unvanı) |
| **Çekirdek kalem sayısı / boy** | 3 kalem / S–M | **13 kalem / M–L** | **3 kalem (E1–E3) / S–M** |
| **Özellik testi** | 2 (şema yuvarlama, bölge altınları) | **6** (§3.7 madde 11) | +2 (emir kilidi, şerit türevi) |
| **Kritik yola etkisi** | Sıfır | Sıfır (paralel; 0b iki P0'dan sonra) | Sıfır |

**Karmaşıklık değerlendirmesi.** (i) yeni komut eklemez ve oyuncuya yeni **karar yüzeyi** (komut) açmaz; karmaşıklığın çoğu **sunucu içi kural ve parametredir** (11 kural, ≈54 değer); oyuncu tarafı yük **9 kavram**dır (Alfa-0 başlangıç yönelimleri 3–4 kavramla başlar, imza §4). E artısı bütçeyi ≈%15 artırır ve eğlence ile karar çeşitliliğine en çok katkı veren kalemdir.

### 3.1 Kapsam

| Dahil (A0) | Hariç (A1 ve sonrası) |
|---|---|
| Ordugâh, Karakol, Gözetleme Kulesi (ek yapı); Nöbet Evi (kamu, parametre) | Sur, Güvenli depo, yürüyüş "Mevzi hazırla" |
| Piyade Tümeni; Zırhlı (`mekanize_ordu` varsa); duruş; ikmal | Topçu/İkmal Birliği, birlik modeli II–III (Alfa-0'da yalnız Piyade Model II içerik olarak olabilir, bilim-teknoloji §8.3) |
| NPC eşkıya baskını (ilçe), il nöbeti, ganimet, revir, onarım | Korsan, kaçakçı, hava keşfi (çeşitlilik §5.3) |
| Yağma defteri (yalnız PvE tüketir) | PvP il kontrol savaşı, ittifak, abluka, koruma sözleşmesi, paralı |
| Baskın kartı, İkmal Kartı, Sen yokken satırları, Savunma sayfası | Doktrin, PvP emir kartları, savunma sanayii kümesi şartı (PvE hazır emir E1 isteğe bağlı artıdır: §4A.6) |
| Hareketsiz oyuncu muamelesi (uyku) | Savaş yorgunluğu, ilan bedeli |

### 3.2 Baskın modeli

**Planlama (günlük tik, TRT 00:00; olay `eskiya_gunluk`):** Mülk kipindeki her ilçe (kimliğe göre sıralı) için:

1. **Uygunluk:** ilçe bekleme sayacı bitmiş (son baskından ≥4 gün) ve ilçe serveti `S ≥ 250.000 ₺`.
2. **Servet `S`** = ilçedeki **kalkansız ve uykuda olmayan** oyuncuların hücre değerleri + yapı bedelleri (taban fiyat; stok hariç, stokla şişirme/boşaltma kaçışı yok).
3. **Olasılık:** `p = 1/3` günlük (4 gün bekleme + ortalama 3 gün → ortalama aralık **≈7 gün**; [çeşitlilik §5.3](cesitlilik-yonetim-askeri-teknoloji.md) "5–9 günde bir" ile uyumlu). PRNG akışı `savas` (G10).
4. **Boy:** `boy = min(8, ⌊S ÷ 250.000⌋)`; **baskın gücü `Gb = 100 × boy`** (1 boy = bir Piyade Tümeni eşdeğeri). Çözümde ±%10 sapma (mevcut aralık).
5. **Yuva:** il başına günde **4 dilim** (19:00, 20:00, 21:00, 22:00; her biri 1 sa). Çekim sırasında dolu dilimlerden sonraki ilk boş dilim seçilir, gün dolarsa ertesi gün. **Bir ilde aynı anda ≤1 baskın** olur (birlik çoklanması olmaz). Planlama tikinden **2 gün sonrası** seçilir (duyuru için yer açar).
6. **Duyuru:** T−24 sa; ilçede Gözetleme Kulesi varsa T−36 sa. Tahmini boy aralığı: Kulesiz `[0,75 × boy ; 1,25 × boy]`, Kuleli `[0,9 × boy ; 1,1 × boy]` (tamsayıya yuvarlanır).

| `S` (₺) | Boy | `Gb` | Not |
|---:|---:|---:|---|
| <250.000 | 0 | — | Baskın yok (tek yeni oyuncu ilçesi, kalkanlı oyuncular sayılmaz) |
| 250.000–499.999 | 1 | 100 | Nöbet Evi tek başına tutar (eşitlik savunana) |
| 500.000–999.999 | 2–3 | 200–300 | Nöbet Evi + 1 Karakol + 1 tümen |
| 1.000.000–1.749.999 | 4–6 | 400–600 | Birkaç oyuncunun ortak savunması gerekir |
| 1.750.000–1.999.999 | 7 | 700 | |
| ≥2.000.000 | 8 (tavan) | 800 | Tavan; ilçe başına bir baskın yine haftada ≈1 |

**Neden servet eğrisi, neden ilçe:** RimWorld baskın puanı koloni servetinin eğrisidir ([çeşitlilik §5.3](cesitlilik-yonetim-askeri-teknoloji.md), [S6]); ilçe, hücre sahipliği, Nöbet Evi, Karakol, seçim ve kamu kasasının **ortak birimidir** (G9). **Bilinen sınırlama:** oyuncu servetini ilçelere yayarak her ilçeyi eşiğin altında tutabilir; bu "risk dağıtımı"dır ve izlenir (AH1: baskın alan ilçe oranı).

### 3.3 Savunma toplamı ve çözüm

**Katılımcılar (pencere açılışında anlık görüntü):** hedef ilçede yapısı olan, kalkansız, uykuda olmayan her oyuncu düğümü ve ildeki `savunma` duruşlu tüm düğümler. Duruşa göre:

| Duruş | Katılır mı | Birim gücü çarpanı | Birlik kaybı | Yapı/stok tavanı |
|---|---|---|---|---|
| `normal` ("Kendi yapılarım") | Yalnız yapısı olan ilçelerde | ×1,0 | Tanımlı (aşağı) | Geçerli |
| `savunma` ("İl nöbeti") | İldeki tüm baskınlarda | ×1,3 | Tanımlı | Geçerli |
| `geri_cekil` ("Dışarıda") | Hayır | — | **0** | Geçerli (defter tavanı) |

**Savunma gücü:**

```
Gs = arazi × [ Nobet Evi (100)
             + Σ_ilçedeki Karakol (1.: 100, 2.: 50; sahibine yazılır)
             + Σ_katılımcı (adet_i × güç_i × ikmalKarşılanma_p × duruşÇarpanı_p) ]
Gs_etkin = Gs × sapma_s ;  Gb_etkin = Gb × sapma_b ;  sapma ∈ [0,90 ; 1,10] (ayrı çekimler, mevcut PRNG sırası)
Savunma kazanır ⇔ Gs_etkin ≥ Gb_etkin   (eşitlik savunana)
```

`arazi` = ilin etiketlerindeki `araziSavunmaPpm`'in en büyüğü (mevcut; ova/kıyı 1,0; liman 1,1; dağ 1,5; dar geçit 1,8; işletme düğümü etiketleri merkezden devralır). **Eşkıya NPC'sinde üçgen çarpanı yoktur (U = 1)**; Topçu/Zırhlı üçgeni yalnız oyuncular arasında çalışır (A1).

### 3.4 Kayıp ve ödül

| Sonuç | Birlik kaybı | Yağma (stok) | Yapı | Ödül |
|---|---|---|---|---|
| **Savunma kazanır** | **0** | **0** | Dokunulmaz | **Ganimet** (aşağı): çekirdek tablosundan, katkı payına göre; "Eşkıya Avcısı" ilk başarım damgası (avantajsız) |
| **Savunma kaybeder** | Katılımcı birlik %15, **aşağı yuvarlama** (küçük ordu kayıpsız; PvP'deki tavan yuvarlama yok); kaybın %40'ı 24 sa içinde revirden döner (yuvarlama normal) | Düğüm başına, mal başına: `min(%10 × ilçePayı, defterKalan)`; mal **yok olur** | ≤%10 yuva, 24 sa (`onarimBitis`) | Ganimet yok; Dikkat panelinde "toparlanma" kartı |

**Ganimet tablosu (çekirdek parametresi, para alanı yok):** boy `k` için **mühimmat `3k` + yakıt `2k` birim** (mili: `3.000k` ve `2.000k`); örnekler: boy 1 ≈ ₺650, boy 4 = mühimmat 12 + yakıt 8 = ₺2.600, boy 8 = mühimmat 24 + yakıt 16 = ₺5.200 (taban fiyat). Katılımcılar arasında **katkı gücü oranında** bölünür (Nöbet Evi payı yanar: kamu sahibi mal almaz); katkısı baskın gücünün %10'undan azsa pay almaz (toz önleme); **ilçe başına haftalık ganimet tavanı** ₺6.500 taban değer (tek ilçede ardışık düşük boylar için emniyet, bekleme sayacı zaten haftada ≈1 baskın verir). Ganimet düğüm stoğuna girer; sığmayan kısım israf olur (mevcut davranış).

**Neden ödül mal, neden küçük:** [12 §10 G4](../12-yon-taslagi.md) "para alanı taşıyan komut yok, ödüller çekirdek tablosundan". Mal ganimeti askeri girdi ve talep döngüsünü besler (mühimmat ve yakıt ordunun kendi ihtiyacıdır) ama **kendi başına maaş çıkarmaz** (Senaryo A'da boy 4 baskının ganimetinden Deniz'in payı ₺2.035'tir: Hesap B'de bir günlük ordu giderinin %55'i, haftada bir). Ganimet bir "kâr" değil **iyi savunmanın hatırası**dır; kâr üretici ve tedarikçi tarafındadır (§3.6).

### 3.5 Ekonomiye askeri talep nasıl yaratılır (H3'e bağ)

| Kanal | Mal | Büyüklük (Hesap B) | Süreklilik |
|---|---|---|---|
| Birlik üretimi | çelik 30, mühimmat 20, gıda 30 / Piyade | 180 tümen için ≈ mühimmat 3.600, çelik 5.400, gıda 5.400 birim (ilk kurulum) | Sıçrama |
| Ordu ikmali | gıda 0,5, mühimmat 0,2 birim/sa/Piyade; Zırhlı: yakıt 0,75, mühimmat 0,3, parça 0,125 | 180 tümen için ≈ gıda 90, mühimmat 36 birim/sa | Sürekli |
| Ordugâh/Karakol/Kule inşası | çelik, parça (+ para) | Ordugâh çelik 80 + parça 30; Karakol 20 + 8; Kule 10 + 5 | Tek seferlik |
| Karakol nöbetçi ikmali | gıda 0,1 birim/sa | Karakol başına ≈₺168/gün | Sürekli |
| Kayıp yenileme | Birlik partileri | Savunma kaybında %15 × (60% kalıcı) | Düşük |
| Maaş | para (₺8/sa/birlik) | Para lavabosu | Sürekli |

**H3 ile ilişki:** H3 ([11 §8](../11-urun-donusu.md); `olcum/src/parsel/h3.ts`) kapasitenin %20'si askeriyeye kayınca bir fiyat ya da kapsamın ≥%10 değişmesini ister; botlar **kapasiteye orantılı ordu** kurar (`hedefGucKapasiteden`), yani birim ikmali ×0,25 olması testi gevşetmez, **ordu sayısı** artar. Bu rapor Alfa-0'da gerçek talebin **bir mühimmat hattı mertebesinde** olduğunu hesaplar (§1.4); H3'ün anlamı "askeri kayma ekonomiyi oynatır" olduğundan bu doğru ölçektir. İlk koşu hedef: mühimmat/çelik/yakıt kapsamı ≥%10 oynar mı (Ek B).

### 3.6 Para korunumu: musluk, lavabo, aktarım (Ar-Ge liderinin üç sorusu)

Çekirdekte para yaratımı: NPC pazara ihracat/kamu alımı (musluk); yok oluşu: tesis işletme gideri, birlik maaşı, vergi, ithalat, inşa parası, komisyon (lavabo). Askeri akışlar:

| # | Akış | Tür | Büyüklük | Para korunumu |
|---|---|---|---|---|
| 1 | Birlik maaşı | **Para lavabosu** | ₺8/sa/birlik (₺192/gün) | Para yanar |
| 2 | Ordu ikmal tüketimi | **Mal lavabosu** (tüketim) | Hesap B: ₺1.560/gün/Piyade (gıda + mühimmat) | Mal yok olur; üreticiye ödeme **aktarımdır** |
| 3 | Ordugâh/Karakol/Kule inşası | Para + mal lavabosu | ₺35.000 / ₺7.840 / ₺4.100 | Yanar |
| 4 | **NPC eşkıya yağması (savunma kaybı)** | **Mal lavabosu** (oyuncudan NPC'ye, mal yok olur) | Ör. boy 4, 5 oyuncu: oyuncu başına ≈₺6–18 bin | **Aktarım değildir**; kimse kazanmaz |
| 5 | **NPC eşkıya ganimeti** | **Mal musluğu** (tek ve küçük) | Boy 4: ₺2.600 taban değer/baskın; boy 8: ₺5.200; ilçe haftalık tavan ₺6.500 | Mal yaratımı; **ilçenin haftalık net üretiminin ≈%0,15–0,3'ü** (ilçe başına ≥1 oyuncu, tek oyuncunun haftalık geliri ≈₺350–910 bin); ölçüt AH4: ≤%1 |
| 6 | PvP yağma (A1) | **Aktarım ve lavabo** | Alınanın %60'ı saldırana, **%40'ı yok olur** (parametre `yagmaIletimPpm` 600.000) | Negatif toplamlı; sahte hesapla aklama ve "yağma çiftliği" %40 sürtünmeyle kârsız |
| 7 | **Koruma ücreti** (A1, M2) | **Oyuncu→oyuncu aktarımı** | Tavan `₺1.000 × boy / hafta` (boy 4: ≤₺4.000; boy 8: ≤₺8.000); işlem komisyonu %1 yanar | Para korunur; musluk yok |
| 8 | Kontrol payları (A1) | **Kamu→il hazinesi aktarımı** | İlçe kasası payı ≈₺660/14 gün; liman primi payı ölçülecek | Yanan paradan; yeni para yok |
| 9 | Kamu savunma siparişi (A1) | **Kamu kasası harcaması** | Yalnız yanan paradan beslenen kasa ([kamu §4](kamu-ve-kamu-arazileri.md)) | Para yaratmaz |
| 10 | Tedarik sözleşmesi (mühimmat, gıda, yakıt) | **Oyuncu→oyuncu aktarımı** | Sözleşme makası (NPC pazar 0,891 R / 1,10 R arası) | Para korunur; NPC makası kadar ihraç/ithalat paradan kaçış |

**Cevaplar.**

1. **NPC eşkıya baskını ödülü bir musluk mu?** **Evet, ama tek ve küçük:** mal olarak, çekirdek tablosundan, ilçe-hafta tavanlı (₺6.500 taban değer). Aynı baskının savunma kaybı yağması mal **lavabosudur**; aralarındaki net akış askeri sektör için **lavabo yönündedir**: bir ilçede boy 4 baskın başarılı savunulursa ganimet ₺2.600; savunma kaybedilirse 5 oyuncunun toplam stok kaybı ≈₺30–90 bin (+ devre dışı yapı üretim kaybı). Ordu gideri ayrıca lavabodur. **Kural:** ganimet yaratımı, askeri tüketim ve yağma lavabosunun toplamının **%10'unu** aşmamalıdır (ölçüt AH4).
2. **Yağma iki oyuncu arasında bir transfer mi?** **Kısmen:** mevcut çekirdek, yağmayı tam aktarım yapar (yalnız depo taşması israf olur). Bu rapor **`yagmaIletimPpm` = %60** önerir (alınanın %40'ı "savaş zayiatı" olarak yok olur): saldıran kazancı ≤%15 stok, savunan kaybı ≤%25 stok; alt hesap aracılığıyla para aktarma, "yağma çiftliği" ve karşılıklı yağma (wash) %40 sürtünmeyle kârsızlaşır. **Savaşın asıl ödülü kontrol hakkıdır**, yağma yan etkidir.
3. **Koruma ücreti nasıl çalışır?** (M2, A1) Komut `koruma_sozlesmesi {alici, hafta, gucTaahhudu}` **yalnız alıcının kabulüyle** kurulur (komutan ücret önerir, alıcı kabul eder; tek taraflı dayatma ve serbest metin yoktur). Etki: komutanın birlikleri alıcının yapısı olan ilçelerdeki baskınlara **otomatik katılır** (duruş geçersiz kılınır); alıcının kayıp oranı `× (1 − min(%50, taahhüt ÷ Gb))` düşer; ücret haftalık otomatik tahsil edilir (alıcı yetersizse sözleşme **askıya** alınır, borç doğmaz); alıcı **72 sa önceden bildirerek** iptal eder; komutan başına **≤6 aktif sözleşme**; ücret tavanı `₺1.000 × boy`. **Haraç engeli:** baskın PRNG ile ve servete göre gelir, komutan tarafından tetiklenemez; PvP'de komutanın il/ittifakı alıcıya savaş ilan ederse sözleşme **askıya alınır** ve ücret kesilir; sözleşme çiftleri arasında aynı cihaz/IP ve yeni hesap transfer tavanı kuralları ([cesitlilik §5.5](cesitlilik-yonetim-askeri-teknoloji.md) paralı kuralları gibi). Ücret **bir oyuncu komutudur** (ticaret emri fiyatı gibi); sistem ve ajan komutlarında para alanı yoktur ([12 §10 G4](../12-yon-taslagi.md)).

**Askeri gelir meşru sermaye midir? Dürüst hesap (Hesap B, taban fiyat, haftalık):**

| İş modeli | Gider | Gelir | Net | Yorum |
|---|---:|---:|---:|---|
| M1: 2 tümen + Karakol | ₺24.528 + ₺1.176 = **₺25.704** | Önlenen kayıp ≈ ₺18–28 bin (boy 4 baskın başına yağma + devre dışı; haftada ≈1) + ganimet ≈₺2 bin | **≈ başabaş** (sigorta paritesi) | Seçim: savunma kendini ödemez, **kayıbı önler** |
| M2: 4 tümen, 6 alıcı | **₺49.056** | Boy 4: 6 × ₺4.000 = ₺23.760 (−%1) + ganimet payı ₺1,5 bin | **−₺23,8 bin** | Boy 8 ilçelerde 6 × ₺8.000 = ₺47.520: **başabaş**. **Tek başına kâr yok** |
| M2: 4 tümen, boy 8, 6 alıcı, **ücret ₺8.000** | ₺49.056 | ₺47.520 + ganimet ₺3,5 bin | **≈ +₺2 bin** | Çok büyük ilçelerde kendini öder |
| M3: tedarikçi (1 mühimmat hattı) | Girdi: çelik 30 (₺3.600) + yakıt 10 (₺1.000) + elektrik 15 (₺150) = ₺4.750/saat (40 birim) + bakım ₺180 + işletme ₺60 | Sözleşme 0,97 R (öneri fiyat; NPC alış 0,891 R ile ithalat 1,10 R arasında) = ₺145,5/birim × 40 = ₺5.820 | **≈ +₺830/saat (bakım ve işletme dahil) ≈ %14 gelir marjı** | **Askeri talep varsa en sağlam gelir**; talep küçük (§1.4: Alfa-0 toplamı ≈1 hat) |
| Hesap A (ikmal ×1): M1 2 tümen | ₺90.048 + ₺1.176 | Önlenen ≈₺18–28 bin | **≈ −₺61–71 bin** | Savunma aşırı pahalı: **Hesap B şart** |

**Sonuç.** Askeri gelir (ganimet, koruma ücreti, tedarik marjı, kontrol payı) **meşru ama ikincil** bir sermaye kaynağıdır; üretim, ticaret ve perakende marjlarına yetişmez. Bir **süpermarket** (K3 ≈₺51.480 + hücre, [perakende-kademeleri §3](perakende-kademeleri.md)) için pratik yol: askeri gelirden **doğrudan** değil, tedarikçi (M3) ya da hibrit (üretici + savunan) marjı ve önlenen kayıp tasarrufu birikimiyle varılır: M3 için bir hattın talebi sürekli dolarsa ≈₺830 × 24 saat ≈ ₺20 bin/gün **teorik üst sınır**; gerçekte ilçe ordu talebi 1 hat civarıdır (düşük). Bu bilinçlidir ([imza §4.3.4](imza-mekanikleri-ve-yonelimler.md): "askeri ayağın ekonomik getirisi küçük bilinçlidir"; eğlence değeri büyük).

### 3.7 En küçük çekirdek değişiklik listesi (mevcut askeri modülün işletme düğümlerine taşınması)

Sıra, bağımlılık sırasıdır. **Bölge kipi altın özetleri ve testleri aynen kalır** (yeni alanlar yalnız mülk kipinde ve isteğe bağlıdır, "tanımsız kalır" kalıbı).

| # | Değişiklik | Dosya | İş | Boy |
|---|---|---|---|---|
| 1 | `ic.bolgeIndeks[k.bolge]` → `bolgeIndeksiBul(d, ic, k.bolge)` (iki yer) | `askeri/uretim.ts:28`, `askeri/savas.ts:79` | Test: mülk kipinde `birlik_uret` ve `savunma_emri` `<il>#<oyuncu>` kabul eder | **S** |
| 2 | Ordugâh şartı ve kapasitesi: mülk kipinde `birlik_uret`, düğümde ≥1 biten Ordugâh ister; `Σ birlik + üretimdeki + adet ≤ 12 × Ordugâh sayısı`. `DerlenmisEkYapi.birlikKapasitesi` (varsayılan 0), `ekYapiToplami` alan listesi, `parametreler.mulk.ekYapilar.ordugah/karakol/gozetleme_kulesi` (JSON), `tipler` + doğrulayıcı | `askeri/uretim.ts`, `mulk/yapi.ts`, `mulk/` türetme, `veri` şema | Bölge kipinde (`merkez` yok) davranış değişmez | **S–M** |
| 3 | `ikmalTalebi`: mülk kipinde `askeri.ikmalCarpaniPpm` (öneri 250.000) ve ek yapı ikmali (Karakol gıda 100 mili/sa) | `askeri/uretim.ts` | Bölge kipinde çarpan 1.000.000 | **S** |
| 4 | Uyku: uykudaki oyuncunun düğümünde ikmal talebi 0, birlik maaşı 0, katılım yok | `askeri/uretim.ts`, `lojistik/cozum.ts`, `askeri/eskiya.ts` | `mulk.hareketsizlik` verisi mevcut | **S** |
| 5 | **Yağma defteri:** `BolgeDurumu.yagmaPenceresi?: {baslangic: Ms, kullanilanPpm: number}`; tek nokta `yagmaTavaniUygula(d, bolge, oranPpm)` (`kayipTavaniUygula`'yı sarar) | `tipler.ts`, `serilestir.ts`, `askeri/savas.ts` | PvP'de de aynı nokta (A1) | **S–M** |
| 6 | **Baskın durumu:** `Dunya.baskinlar?: BaskinDurumu[]` `{id, ilce, il, boy, gb, bant, duyuruZamani, pencereBaslangic, pencereBitis, evre, sonuc, katilimcilar[]}`; `OlayVerisi`: `eskiya_gunluk`, `eskiya_pencere_ac`, `eskiya_pencere_kapa`; `motor.ts` yönlendirme; `serilestir.ts` doğrulayıcı; `ozet.ts` (mülk kipinde yazılır) | `tipler.ts`, `motor.ts`, `serilestir.ts`, `ozet.ts` | Bölge kipi: alan hiç yazılmaz | **M** |
| 7 | **`askeri/eskiya.ts` (yeni, ≈250 satır):** ilçe servetinden boy (tamsayı); günlük planlama (bekleme, p=1/3, il dilimi); pencere açılışta katılımcı kilidi; çözüm (§3.3); yağma (§2.6 defter + ilçe payı); `onarimBitis` yapı bütçesi; kayıp ve revir; ganimet tablosu; hepsi tamsayı ve `savas` PRNG akışı | yeni | Birim testleri: tavan invaryantları, determinizm | **M** |
| 8 | `parametreler.json` `askeri.eskiya` bloğu (§3.8 Ek C) ve `veri` şeması; ganimet tablosu | `veri/icerik`, `veri/src` | Alan eklemesi | **S** |
| 9 | `askeri_rezerv`: mülk kipinde istemci formu yok (docs/11 F0); askeri mallar lojistik çözüm sırasında zaten ilk işlenir (`lojistikOnceligi: 0`, artan sıra); komut bölge kipi için kalır | istemci, `lojistik` | Davranış değişmez | **S** |
| 10 | Protokol/sunucu: `kare` alanı `baskinlar` (ilçe, bant, tahmin aralığı, evre); olgu defteri satırı `eskiya_sonuc`; yalnız ekleme | `protokol`, `sunucu` | Geriye uyumlu | **M** |
| 11 | Özellik testleri: (a) parsel el değiştirmez (90 gün, rastgele tohum); (b) yağma defteri: iki ardışık baskın ≤%25; (c) yapı ≤%10 yuva; (d) determinizm (aynı tohum aynı baskınlar); (e) bölge kipi altınları aynı; (f) kalkanlı ve uykulu oyuncu hedef dışı | `cekirdek/test` | | **M** |
| 12 | Ölçüm botları: `komutan` (kendini savunan), `tedarikci`, `askeri_yok` (M0) önayarları; H3 ve H5 parsel koşulları Ordugâh şartıyla güncellenir; AH1–AH11 | `botlar`, `olcum` | | **M** |
| 13 | İstemci: Ordugâh/Karakol/Kule yerleşimi (mevcut ek yapı akışı), İkmal Kartı, baskın kartı ve harita katmanı, Savunma sayfası (§4) | `istemci` | | **M** |

**Toplam çekirdek: ≈M–L (1,5–2 hafta, tek geliştirici); Alfa-0 kritik yolunu uzatmaz** (ekmek zinciri, dükkân, Esnaf Defteri P0 sonrası bağımsız bir dilimdir). Kimlik kilidi: `ordugah`, `karakol`, `gozetleme_kulesi` ek yapı kimlikleri, `eskiya_*` olay türleri ve `askeri.eskiya.*` parametre adları **ilk içerik sürümünden önce** kilitlenmelidir (G8 yalnız-ekle kuralı; ek yapıların kimlik tablosuna dahil olup olmadığı **doğrulanmadı**).

### 3.8 Senaryo A: Alfa-0 eşkıya savunması (adım adım, oyuncu gözünden)

**Kişi.** Deniz, Sakarya, Alfa-0 24. gün. Askeri iş modeli seçimi: **M1 (kendini savunan)** + Sanayi tedarikçisi (mühimmat fabrikası var).

**Durum (örnek veri; ₺ taban fiyat).**
- Serdivan'da 15, Adapazarı'nda 6 yuva biten tesis (toplam 21 yuva): Çiftlik ×2 (4), Gıda fabrikası (2), Çelikhane (3), Mühimmat fabrikası (2), Parça atölyesi (2), Santral (3), Maden ocağı (2), Mera (3). Ek yapılar: Ambar, **Ordugâh (Serdivan, kapasite 12)**, **Karakol (Serdivan)**.
- Stok (Sakarya düğümü): gıda 1.200, mühimmat 300, çelik 600, parça 150, yakıt 100, tahıl 400 birim (değer ₺250.000). Hazine ₺180.000.
- Birlik: **0**. Duruş: normal.
- Serdivan'da 5 kalkansız oyuncu: Deniz ₺293.000, Murat ₺240.000, Zeynep ₺180.000, Can ₺230.000, Ela ₺160.000 (hücre + yapı) → **S = ₺1.103.000**, **boy = ⌊1.103.000 ÷ 250.000⌋ = 4**, **Gb = 400**. Murat'ın 1 Piyade'si var (duruş normal). Serdivan'da Gözetleme Kulesi yok. Ordugâh sayısı: Deniz'in 1.

**Adımlar (Salı 19:00 duyuru):**

| # | Saat | Oyuncu ne yapar / ne görür | Hesap |
|---|---|---|---|
| 1 | Salı 19:10 | Oyunu açar. **Sen yokken** satırı: "Çarşamba 19:00–20:00 diliminde Serdivan'a baskın bekleniyor (tahmini 3–5 tümen eşdeğeri)". Dikkat paneli: **"Yaklaşan baskın ▲ savunma yetersiz"** | Kulesiz aralık `[0,75×4 ; 1,25×4] = 3–5` boy |
| 2 | 19:11 | Karta tıklar: ilçe panosu **Güvenlik**: Nöbet Evi 100, Karakol (Deniz) 100, Murat 100 (normal) = **300**; tahmini baskın 300–500. Sonuç: **sınırda ▲** | Gs = 100 + 100 + 100 = 300 vs Gb ∈ [300 ; 500] (sapma ile 270–550) |
| 3 | 19:12 | Ordugâh kartı: kapasite 0/12. Stok yeterli (çelik 600, mühimmat 300, gıda 1.200). **2 Piyade Tümeni** partisi verir: çelik 60, mühimmat 40, gıda 60 birim. | Malzeme **₺17.400**; parti süresi 12 sa → **Çarşamba 07:12** bitiş |
| 4 | 19:13 | Duruşu **"İl nöbeti"** (`savunma`) yapar. | 2 tümen × 100 × 1,3 = 260 (parti bitince) |
| 5 | 19:14 | Karta geri döner: tahmini savunma = 100 + 100 + 260 + 100 = **560** → **✓ yeterli** (kart yeşil). Toplam süre ≈4 dakika. Oyundan çıkar | Gs = **560**; Gb_etkin ∈ [360 ; 440]; Gs_etkin ∈ [504 ; 616] → **en kötü durumda bile savunma kazanır** (504 > 440) |
| 6 | Çarşamba 07:12 | (Sen yokken) "Parti bitti: 2 Piyade Tümeni hazır." | Kapasite 2/12 |
| 7 | Çarşamba 19:00–20:00 | Dilim açılır; katılımcılar kilitlenir: Nöbet Evi, Karakol (Deniz), Deniz (2 tümen, ikmal %100), Murat (1 tümen). Haritada Serdivan'da kehribar kesikli halka. Deniz çevrimdışı. | |
| 8 | 20:00 | Otomatik çözüm: baskın örneği sapma ×1,03 → 412; savunma ×0,97 → 543; **savunma kazanır**. Birlik kaybı **0**; yağma **0**; yapı dokunulmaz | |
| 9 | 20:00 | **Ganimet** (boy 4): mühimmat 12 + yakıt 8 birim = ₺2.600. Katkılar (Nöbet Evi hariç): Deniz 100 (Karakol) + 260 = **360**, Murat **100**; toplam 460 → Deniz **%78,3** = mühimmat 9,39 + yakıt 6,26 birim (≈₺2.035), Murat %21,7 = mühimmat 2,61 + yakıt 1,74 (≈₺565) | Her ikisi de ≥%10 şartını geçer |
| 10 | Perşembe 08:00 | **Sen yokken:** "Serdivan'a gelen baskın akşam 20:00'de dağıldı. Katkın: 2 tümen, 1 Karakol. Azalma yok. Ganimet: mühimmat 9,4 ve yakıt 6,3 birim stoğuna eklendi." Defter: **"İlk savunma"** damgası (ödülsüz). | |

**Maliyet ve günlük gider (Hesap B):** 2 tümen ₺1.752×2 = ₺3.504/gün + Karakol ₺168 = **₺3.672/gün** (günlük gelirin ≈%3–7'si); haftalık ₺25.704. Parti ve Ordugâh bir kerelik: ₺17.400 + (daha önce) ₺35.000.

**Alternatif dal: Deniz hiçbir şey yapmasaydı** (birlik 0, duruş normal): Gs = Nöbet Evi 100 + Karakol 100 + Murat 100 = **300**; sapmayla ∈ [270 ; 330] ≤ Gb_etkin ∈ [360 ; 440] → **savunma kaybeder**. Sonuç:
- Yağma: ilçe payı `15 ÷ 21 = %71,4`; oran `%10 × 0,714 = %7,14`; Deniz'in stoğundan gıda 85,7 (₺6.000), mühimmat 21,4 (₺3.214), çelik 42,9 (₺5.143), parça 10,7 (₺1.929), yakıt 7,1 (₺714), tahıl 28,6 (₺857) → **toplam ≈₺17.857** (stok değeri ₺250.000'in %7,1'i; defter kalan %17,9'a düşer).
- Yapı: `⌊%10 × 21⌋ = 2` yuva bütçesi; PRNG bir Çiftlik'i (2 yuva) seçer: **24 sa durur** (Deniz'in bu tesisin 24 saatlik üretimi; günlük üretiminin yaklaşık %10'u).
- Birlik kaybı: 0 (birlik yok). Ordugâh ve Karakol dokunulmaz. Parsel 0.
- Sen yokken: "Serdivan'daki savunma yetmedi. Ambarından %7 eksildi (gıda 86, mühimmat 21, çelik 43, …). 1 Çiftlik Perşembe 19:00'a kadar bakımda."
- **Karşılaştırma:** savunmanın haftalık gideri ₺25.704, tek yenilgi maliyeti ≈₺18 bin stok + ≈₺10 bin üretim ≈₺28 bin: **savunma ≈ sigorta paritesi** (AH3 ölçütü).

**Zırhlı seçeneği:** Deniz `mekanize_ordu` araştırırsa (₺40 bin, 5 gün) Zırhlı Tümen açılır (260 güç, ₺17.000 malzeme, ₺3.612/gün Hesap B); bu bir **seçenektir**, Piyade'yle de savunma yeterlidir.

### 3.9 Alfa-1: oyuncular arası il kontrol savaşı ve ittifaklar (PvE'ye eklenenler)

Akış [cesitlilik §5.4](cesitlilik-yonetim-askeri-teknoloji.md)'tedir; burada yalnız **arsa dünyası deltaları**.

| Konu | Karar |
|---|---|
| **Komut** | Bölge kipi `savas_ilan` değişmez (altın özetler). Yeni komut `kontrol_savasi_ilan {hedefIlce}` (vali; il meclisi 6 sa onayı; il başına ≤1 ilan/hafta); `sefer_katil {savas, oranPpm}`; `bant_sec`; `koruma_sozlesmesi`; `sozlesme_iptal` |
| **Hedef** | **İlçe** (savaş hedefi önceden duyurulur ve değişmez: {kontrol hakkı, liman geçiş payı, abluka kırma}). İller komşuluğu **merkez kenarlarından** türer |
| **Katılımcılar** | Saldıran: ittifak/il üyelerinin sefer katkıları (T−4 sa kapanış; kalkanlı katkı veremez). Savunan: hedef ilçede yapısı olan kalkansız oyuncular + il nöbeti duruşlular + Nöbet Evi + Karakoller |
| **Çözüm** | Mevcut formül + üçgen `U` ([cesitlilik §5.1](cesitlilik-yonetim-askeri-teknoloji.md)) ve göreli teknoloji tavanı ([bilim-teknoloji §5.6](bilim-teknoloji-askeri.md)); 4 tur × 1 sa; ≥3 tur kazanan galip |
| **Yağma** | Savunan katılımcı düğümleri; oran `%25 × ilçePayı`; ortak defter; **%60 iletim**; saldırana katkı gücü oranında |
| **Kayıp** | Kazanan %10, kaybeden %30 (tavan yuvarlama, mevcut); **revir %40** (yuvarlama normal); bunun %60'ı kalıcı |
| **Kontrol hakkı** | `ilceKontrol` kaydı 14 gün (§2.5) |
| **Ittifak** | Lonca (v1.5 "şirketler ve loncalar"): üye ≤min(60, aktifin %15), katılım ≤40 hesap, ilk 20 tam / 21–40 ×0,7 / 41+ ×0,4 ([cesitlilik §5.5](cesitlilik-yonetim-askeri-teknoloji.md)); ittifak **sefer** verir, savaşı vali ilan eder |
| **Savunma bandı** | Savunanın 4 saatlik standing bandı (08:00–24:00 içinden; değişiklik 96 sa sonra) |
| **Hazır savunma emri** | Duruş + il nöbeti çevrimdışı geçerli |

### 3.10 Senaryo B: Alfa-1 il kontrolü (adım adım)

**Kişiler.** **Bora**: Sakarya valisi (seçilmiş), saldıran il. **Aylin**: Kocaeli valisi, savunan il. Hedef: **Körfez** ilçesi (Kocaeli; liman etiketli, arazi çarpanı 1,1). Sakarya aktif servet toplamı ₺38,4 milyon, Kocaeli ₺52,1 milyon (örnek) → oran `38,4 ÷ 52,1 = 0,74` ∈ [0,2 ; 5] ✓. İki ilin merkezleri komşu ✓. Körfez'de Nöbet Evi (100) + 2 Karakol (100 + 50 = 150). Savunan katılımcı: 9 kalkansız oyuncu: **12 Piyade, 3 Topçu, 2 Zırhlı** (hepsi "İl nöbeti"). Saldıran sefer katkısı (6 oyuncu): **12 Piyade, 7 Topçu, 6 Zırhlı**. Birim gücü: Piyade 100, Topçu 160, Zırhlı 260 (Model I; [bilim-teknoloji §5.4](bilim-teknoloji-askeri.md)).

| # | Zaman | Adım | Sayı |
|---|---|---|---|
| 1 | Pazartesi 18:00 | Bora **ilan** eder: hedef Körfez, savaş hedefi {kontrol hakkı}; ilan bedeli il hazinesinden **₺5.000** (öneri; yanar). Kocaeli'nde Dikkat maddesi ve takvim işareti; **ilan sonrası hedef değişmez** | |
| 2 | 18:00–24:00 | Sakarya il meclisi onayı (6 sa): 11 muhtardan 7 evet → 00:05'te onaylandı | Onay süresi içinde yoksa düşer |
| 3 | Salı 00:05 | **Hazırlık** başlar; en erken çarpışma = onay + **20 sa**; Kocaeli'nin standing bandı **20:00–24:00** → ilk bant **Salı 20:00** | 24 sa toplam ≈ 26 sa |
| 4 | Salı, gün boyu | Aylin: savunma emri; üyeler "İl nöbeti"; ikmal kartında 9 oyuncunun %100 ikmal; Bora: ittifak "Kuzey Hattı" seferi toplar | Savunan çevrimdışı 3 oyuncu: hazır emir geçerli |
| 5 | Salı 16:00 (T−4 sa) | **Sefer katkısı kapanır**; katılan birlikler pencere + 1 sa kilitlenir. Saldıran toplam: 12P + 7T + 6Z = ham güç **3.880** (1.200 + 1.120 + 1.560) | Kalkanlı hesap katkı veremez |
| 6 | Salı 20:00–24:00 | **Çarpışma:** 4 tur × 1 sa. **Savunan** ham güç: 12P + 3T + 2Z = 2.200; duruş ×1,3 = 2.860; + Nöbet Evi 100 + Karakoller 150 = 3.110; ×arazi 1,1 = **3.421** | |
| 7 | | **Üçgen çarpanı** (`1 + 0,25 × ustun(A,B) − 0,20 × ustun(B,A)`, tavan 0,75–1,25): saldıran güç payları P 0,309, T 0,289, Z 0,402; savunan P 0,545, T 0,218, Z 0,236: `U_saldıran = 1,0251`, `U_savunan = 1,0086` | |
| 8 | | **Etkin güçler:** saldıran `3.880 × 1,0251 = 3.977`; savunan `3.421 × 1,0086 = 3.450`; oran **1,153**. Her tur ayrı ±%10 sapma (örnek çekimler): tur 1 (×1,04 ; ×0,96): 4.136 – 3.312 **S**; tur 2 (×0,91 ; ×1,05): 3.619 – 3.623 **V**; tur 3 (×1,03 ; ×1,00): 4.096 – 3.450 **S**; tur 4 (×0,99 ; ×0,97): 3.937 – 3.347 **S** | **3–1 saldıran** |
| 9 | 24:00 | **Sonuç:** saldıran kazanır. **Birlik kaybı:** saldıran %10 (tavan yuvarlama): Piyade ⌈1,2⌉=2, Topçu ⌈0,7⌉=1, Zırhlı ⌈0,6⌉=1 = 4 birim (₺17.400 + ₺13.800 + ₺17.000 = ₺48.200); savunan %30: Piyade ⌈3,6⌉=4, Topçu ⌈0,9⌉=1, Zırhlı ⌈0,6⌉=1 = 6 birim (₺34.800 + ₺13.800 + ₺17.000 = ₺65.600). **Revir %40 (24 sa içinde):** saldıran 1 Piyade geri (₺8.700), savunan 2 Piyade geri (₺17.400). Net kalıcı kayıp: saldıran ₺39.500, savunan ₺48.200 | |
| 10 | 24:00 | **Yağma:** savunan 9 düğüm, stok ort. ₺90.000, ilçe payı ort. %70 → oran `%25 × 0,70 = %17,5` (her biri ₺15.750; toplam **₺141.750**); defter tavanı (%25) aşılmaz. **%60 iletim:** saldıran toplam **₺85.050**; **₺56.700 yok olur**. Saldıran net: ₺85.050 − ₺39.500 = **+₺45.550** (6 oyuncuya katkı gücü oranında, ortalama ≈₺7.600). **Yapı:** savunan düğümlerin her biri ≤%10 yuva, 24 sa. | Parsel **0** |
| 11 | Çarşamba 00:00 | **Kontrol hakkı** Sakarya'ya 14 gün: Körfez muhtar/başkan seçiminde 1 aday kontenjanı; ilçe kasasından ≤%15 pay (≈₺660/14 gün); kamu ihalelerinde yerellik kalemi tam puan; liman geçiş payı ≤%15. Parsel, yapı, üretim, oy hakkı kimseye geçmez | |
| 12 | Çarşamba 00:00 → | **Soğuma:** aynı ilçeye ≥49 sa; il başına ≤1 ilan/hafta; 7 gün savaş yorgunluğu (istikrar etkisi; [08 D2](../08-alti-katman.md)); savunan il yeniden meydan okuyabilir | |
| 13 | Çarşamba 08:00 | **Sen yokken** (savunan oyuncu): "Körfez'de pencere kapandı: kontrol hakkı bu kez Sakarya'da. Katkın 2 Piyade; 1 Piyade yaralı, 1 Piyade 24 sa içinde geri döner; ambarından %17 eksildi (gıda 78, mühimmat 18, …); 1 yapın 14:20'ye kadar bakımda." Nötr dil, intikam kartı yok | |

**Para dökümü (savunan 9 oyuncu + saldıran 6 oyuncu):** yok olan toplam ≈ ₺56.700 (yağma payı) + maaş/ikmal; oyuncular arası net aktarım ₺85.050; kamu→il hazinesi ≈ ₺660; **yeni para yaratımı 0**; ganimet musluğu yok (PvP). Saldıranın asıl ödülü **kontrol hakkı**dır; ₺7.600/kişi yağma yan etkidir.

---

## 4. Görünürlük ve adaptasyon

### 4.1 Harita (L1–L3)

[gorsel-kimlik §3.6](gorsel-kimlik-ve-arayuz.md): Askeri katman rengi zeytin (`solid` açık `#4B6121`, koyu `#79884A`; `tint` `#E8F0DE` / `#282C1E`), ikon `shield`. İlkeler: sakin, düz renk, akış çizgisi/parçacık yok (K29), hata rengi soluk kiremit, bayrak/millî sembol yok.

| Öğe | Gösterim | Not |
|---|---|---|
| **Ordugâh** | Zeytin ikon; yanında birlik sayısı rozeti (örn. "6") | Birlik karışımı görünmez (yalnız İstihbarat doktrini, A1) |
| **Karakol / Gözetleme Kulesi** | Küçük ikon; ilçe yakınlaştırmasında | Kule: tepe lambası çizgisi |
| **Nöbet Evi** | İlçe merkezi hizmet hücresinde ikon; ilçe kartında "Nöbet Evi" satırı | Kamu (gri-zeytin) |
| **Baskın duyurusu** | İlçe konturunda **kehribar kesikli halka** + saat etiketi ("Çar 19:00") + "ⓘ" | Takvim işareti de vardır; pulse/yanıp sönme yok |
| **Baskın penceresi** | Aynı halka düz ve dolu; **soyut kehribar noktalar ince kesikli yaklaşma çizgisinde** ilerler, zeytin kalkan simgeleri savunur (§4A.2) | Çatışma animasyonu, patlama, kırmızı, yanıp sönme yok |
| **Sonuç izi** | 24 sa solan nokta + tek satır ipucu ("Savunuldu" / "Savunma yetmedi") | Yaralı/ölü ifadesi yok |
| **Devre dışı yapı** | Yapı ikonunda "bakım iskelesi" rozeti + bitiş saati | Yıkık görüntü yok |
| **Kontrol hakkı** (A1) | Kazanan ilin amblemi, ilçe konturunda 14 gün | Bayrak yok (geometrik/bitkisel amblem kataloğu) |
| **Abluka** (A1) | Kenarda dolu/kesikli ince çizgi + "Kapasite %50" | Gıda/elektrik koridoru etiketi |

### 4.2 Sokak sahnesi (L4, yürüyüş)

Adaptasyon bütçesi: yeni mini oyun yok, ≤60 çizim çağrısı ([oyun-kimliği A4–A6](oyun-kimligi-harman.md)). Askeri varlık **sembolik** kalır:

- **Ordugâh:** düşük çokgen çit, talim sahası zemini, ambar çatısı, ikmal kamyonu silueti (Garaj filosundan örneklenir); birlikler **sayı rozeti ve "nöbet" lambaları** ile gösterilir, bireysel asker modeli yoktur.
- **Karakol:** ışıklı küçük kulübe, çit, iki **silahsız** nöbetçi figürü (el feneri, defter); duruş `savunma` iken 3 figür, `geri_cekil` iken kapı kapalı.
- **Gözetleme Kulesi:** ahşap/metal kule, tepe lambası; 36 sa duyuruda lamba yanar (dil: "Fener yandı").
- **Baskın penceresi:** ilçe sokağında akşam ışığı bir ton gri-mor, nöbetçiler kapıda; **çatışma, silah sesi, kan, patlama, duman yok**. Sonuç ertesi sabah: devre dışı yapıda bakım iskelesi ve "24 sa bakımda" tabelası.
- **Yürüyüş etkileşimi (A1):** Karakol yanında `[E] Mevzi hazırla` (§1.5); Nöbet Evi'nde `[E] Panoya bak` (ilçe güvenlik panosu açılır); hepsi panelden de yapılır.
- **Araç silueti:** silah taşıyan ya da markalı araç yoktur; "ikmal kamyonu", "nöbet bisikleti/aracı" jenerik.

### 4.3 "Sen yokken" ve gelen kutusunda askeri olaylar

[donus-deneyimi §2.3](donus-deneyimi.md) blokları: **B2** biten işler (parti, revir, onarım), **B3** gelenler (baskın duyurusu, savaş ilanı), **B6 Komşular katman 1** (savaş ilanı/sonuç özet satırı; ad etkileşim tarafıdır). Şablon aileleri (**9 şablon**, 7'si Alfa-0; `sablon`, `degerler`; metin değil olgu; LLM yok). Sonuç anı kartının tur ve kitabe satırları ayrı bileşendir (§4A.2–4A.3), bu sayıya dahil değildir:

| Şablon | Blok | Örnek metin (değerlerle) | Yasak |
|---|---|---|---|
| `donus.eskiya.duyuru` | B3 | "Çarşamba 19:00–20:00 diliminde Serdivan'a baskın bekleniyor (tahmini 3–5 tümen eşdeğeri)." | Geri sayım kırmızısı, "acele et" |
| `donus.eskiya.savunuldu` | B2 | "Serdivan'a gelen baskın akşam 20:00'de dağıldı. Katkın: 2 tümen. Ganimet: mühimmat 9,4, yakıt 6,3." | — |
| `donus.eskiya.yenildi` | B2 | "Serdivan'daki savunma yetmedi. Ambarından %7 eksildi (gıda 86, mühimmat 21). 1 Çiftlik Perşembe 19:00'a kadar bakımda." | "Yağmalandın", "saldırıya uğradın" |
| `donus.parti.bitti` | B2 | "Parti bitti: 2 Piyade Tümeni hazır." | — |
| `donus.revir.geri` | B2 | "Revirden 2 tümen geri döndü." | Yaralı/ölü sözleri |
| `donus.ikmal.dusuk` | B2 (uyarı) | "Mühimmat ikmalin 3 gün yeter." | Kırmızı alarm |
| `donus.kontrol.ilan` (A1) | B3 | "Sakarya, Körfez için kontrol hakkı ilanı verdi. Savunma bandı Salı 20:00–24:00." | İntikam penceresi |
| `donus.kontrol.sonuc` (A1) | B6 | "Körfez'de pencere kapandı: kontrol hakkı Sakarya'da (14 gün)." | Ad anma yalnız etkileşim tarafına |
| `donus.uyku.ordu` | uyku kartı | "Ordun uyandı: ikmal ve maaş yeniden başladı." | Yargı |

**Kural:** askeri maddeler özetin ≤3 satırını geçmez (kota); **aynı tür en çok 1** ([canlı §6.2](canli-dunya-simulasyonu.md) DF dersi). "Saldırıya uğradın" bildirimi ve intikam penceresi **yoktur** (U8). Bildirim kanalı: yalnız Dikkat paneli; push/e-posta "sonra, açık izinle".

### 4.4 Esnaf Defteri: Savunma sayfası (askeri açılış görevleri)

[rehber §2.5](rehber-gorevler.md) "Savunma" sayfasını tanımlar; burada Alfa-0 içeriği. **9 görev (S1–S9; 7'si Alfa-0: S1–S6 ve S9; S7 ve S8 Alfa-1).** **Sıra serbest, kilit yok, hepsi ödülsüz** (askeri güç ekonomiden doğar; ödül avantaj sayılır). Durum oyun durumundan **türetilir**; tetik: ilgili ilk yapı ya da Fırsat Kartı kabulü ("Yaklaşan baskın: Karakol ve birkaç tümen önerilir", imza §4.2).

| # | Görev (kavram) | Koşul alanı | Ödül | Alfa |
|---|---|---|---|---|
| S1 | "Nöbet Evi'ne bak" (`gozlem_nobet`) | Baskın duyuru kartı bir kez açıldı (gözlem) | Yok | A0 |
| S2 | "İlk Karakol" (`ilk_karakol`) | `ekYapilar[tur=karakol]` ≥1 | Yok (Defter damgası) | A0 |
| S3 | "İlk Ordugâh" (`ilk_ordugah`) | `ekYapilar[tur=ordugah]` ≥1 | Yok | A0 |
| S4 | "İlk müfreze" (`ilk_birlik`) | `birlikler` toplamı >0 | Yok | A0 |
| S5 | "İkmal güvencesi" (`ilk_ikmal_guvencesi`) | ≥1 birlik ∧ `ikmalKarsilanmaPpm = PPM` 24 sa sürekli | Yok | A0 |
| S6 | "İlk savunma" (`ilk_savunma`) | `baskinlar[].sonuc.kazanan=savunma` ∧ katkı>0 | Yok (damga + kitabe) | A0 |
| S7 | "Tedarik sözü" (`ilk_tedarik`) | İlk mühimmat/gıda/yakıt sözleşmesi teslimi ([P5 sözleşme](dikey-zincirler-ve-perakende.md)) | Yok | A1 |
| S8 | "Bir koruma sözü" (`ilk_koruma`) | `koruma_sozlesmesi` aktif | Yok | A1 |
| S9 | "Savunma tutanağı" (`bilgi_savunma`) | Bilgi kartı: "Savunma neden yetmedi?" (oyun durumundan türetilen nedenler) | Yok | A0 |

Fırsat Kartı (günde ≤1, kalabalık sönümlü): "Yaklaşan baskın: boy 4, savunma yetersiz. Karakol (₺7.840) ya da 2 tümen (₺17.400) yeterli olur." Karta "neden" cümlesi eklenir; kapatılabilir; push değil. **Tarım→Askeri geçişi** için Defter yön sayfası: "Savunma" sayfası Dikkat panelinde "Yeni sayfa" olarak belirir ve **kilit yoktur**.

### 4.5 Takvim

Baskın penceresi **takvimde isteğe bağlı kişisel işaret** (iklim takvimi/dönem ile aynı dil). Kontrol hakkı bitişi ve savaş soğuması tarih olarak yazılır, geri sayım yok. Anma günlerinde ([canlı §5.7](canli-dunya-simulasyonu.md) "sessiz gün" önerisi) baskın duyurusu ve savaş penceresi **planlanmaz** (öneri; 17 Ağustos, 6 Şubat, 10 Kasım).

---

## 4A. Askeri katman neden eğlencelidir

Sahip çıtası: askeri güç **beşinci eğlence ayağıdır**. §1–§4 katmanı güvenli, adil ve angaryasız kurdu; bu bölüm onun **dram, karar ve karşılık** ürettiğini gösterir. İlke: **sakin ≠ sönük.** Sakinlik palet, tempo ve yasaklardır (kırmızı yok, yanıp sönme yok, kan, patlama ve insan zararı dili yok; [gorsel-kimlik](gorsel-kimlik-ve-arayuz.md) K29). Sönüklük ise "hiçbir şey olmuyor" hissidir ve ayrıca ele alınır (§4A.2 tablo). Dram şunlardan gelir: **belirsizlik** (tahmin aralığı, ±%10 sapma), **hazırlık kararının sonucunu görmek**, tasarlanmış bir **an** (zarf açılışı) ve **toplumsal karşılık** (komşular, kitabe, unvan). Soyut ama dramatik sunum örnekleri: Mini Metro ve Mini Motorways (sakin palet, soyut öğeler; [gorsel-kimlik](gorsel-kimlik-ve-arayuz.md) rakip tablosu), CoC savunma kaydı (olay özeti; [S5]), EVE'de savunanın penceresinin sosyal bir buluşma anı olması ([S7]).

Her öğe iki türden biridir: **sunum** (kural yok, türetilmiş veri) ya da **karar katmanı** (E1–E3, §4A.6; yeni kural/alan; **isteğe bağlı eğlence artısı**, §3.0 karmaşıklık bütçesinde ayrı satırdır).

### 4A.1 Gerilim eğrisi: evre evre karar, süre ve his

**Alfa-0 PvE (ilçeye eşkıya baskını):**

| Evre | Süre | Oyuncunun verdiği anlamlı karar | Hissettiği | Ekranda |
|---|---|---|---|---|
| **1 Ön duyuru** | T−24 sa (Kule ile T−36); ilk bakış 1–3 dk | "Bu bana yetiyor mu?": boy aralığını (±%25; Kule ile ±%10) ilçe savunma çubuğuyla karşılaştır; **ele al ya da bırak** (M0 oyuncusu için bırakmak meşrudur); Kule kurmuşsa karar süresi 12 sa uzar | Merak, hafif gerilim ("Fener yandı") | Dikkat kartı; ilçe **savunma çubuğu** (kalem kalem: Nöbet Evi, Karakol, birlikler, tahmin bandı); haritada halka |
| **2 Hazırlık** | T−24 → T−1 sa; aktif karar 5–20 dk | **Parti** (12 sa süre; kartta "son parti saati" T−12 sa), **ikmal güvencesi** (kaynak seçimi), **duruş** (Kendi yapılarım / İl nöbeti / Dışarıda), **Karakol** (4 sa) ya da Kule ekleme; **komşularla dengeleme** (çubukta "kim ne kadar" adsız); [E1] hazır emir: Normal / Mevzi / Yedek | Planlama keyfi: "hesabım tutuyor mu?"; toplumsal: çubuğun komşu katkılarıyla dolduğunu izlemek | Çubuk ✓ ◯ ▲; "Hazır" kartı; parti bitiş saati |
| **3 Baskın anı** | T → T+1 sa (60 dk) | Girdiler **kilitlidir** (anlık görüntü): karar anı hazırlıktır, pencere sonucun açıldığı andır. Çevrimiçi izleyen **Nöbet ekranını** açabilir | "Tutacak mı?" heyecanı; belirsizlik (sapma) hâlâ canlıdır | Yaklaşma çizgisi ve kalkan simgeleri (§4A.2); tek tonluk sese bağlı bir "fener" sesi |
| **4 Sonuç anı** | T+1 sa; 8–15 sn | Karar yok; **izlemek** (Atla her an etkin). Okuduğunda bir sonraki hamle seçeneği belirir | Gerilimin boşalması: rahatlama ya da "bir dahaki sefere" merakı | **Zarf açılışı** + 3 tur kartı + sonuç satırı |
| **5 Toparlanma** | T+1 sa → T+4 gün | **Savunma tutanağı** ("neden yetmedi / neden tuttu"): Karakol, parti ya da duruş **yeniden yatırım** kararı; ganimeti stoğa almak (otomatik); komşunun ortak savunma ya da koruma talebi (A1) | Gurur ya da öğrenme; "sonraki baskına hazırım" duygusu | Sen yokken, kitabe, güvenlik şeridi, revir ve onarım bitiş saatleri |

**Alfa-1 il kontrolü (PvP):**

| Evre | Süre | Anlamlı karar | Hissettiği | Ekranda |
|---|---|---|---|---|
| **1 İlan** | Anında + il meclisi onayı 6 sa | **Vali:** hangi ilçe, hangi savaş hedefi (kontrol hakkı / liman geçiş payı / abluka kırma), ilan bedeli ₺5.000; **meclis:** onay oyu (siyasi pazarlık); **savunan taraf:** ilanı görür | Siyasi gerilim, "kim taraf olacak" | Dikkat maddesi, takvim işareti, ilçe konturunda halka |
| **2 Hazırlık** | ≥20 sa | **Sefer katılımı** ve karışım (Piyade/Topçu/Zırhlı üçgeni; karşı karışım belirsiz), ikmal, ittifak çağrısı; savunanda: il nöbeti çağrısı, hazır savunma emri, **koruma sözleşmesi** aktifleştirmek | Koordinasyon, kimin katıldığını izleme, kâğıt üstünde hesap | Savunma/sefer çubuğu (adsız toplam), ittifak paneli |
| **3 Kapanış (T−4 sa)** | Tek an | **"Ne kadarını katarım?"** (`oranPpm`); katılan birlik kilitlenir; geri dönüş yok | Karar anının ağırlığı | Kapanış kartı ve sayaçsız saat işareti |
| **4 Çarpışma** | 4 saat, 4 tur | Tur öncesi **emir kartı** (Taarruz / Savunma / Geri çek / İkmal öncelik, [cesitlilik A7](cesitlilik-yonetim-askeri-teknoloji.md); hazır emir varsayılan, çevrimdışı geçerli) | Tur tur dalgalanma; "bu tur bende" | Yaklaşma çizgisi, tur kartları canlı (her saat başı) |
| **5 Sonuç** | Anında | Karar yok; **izlemek** | Töreni andıran sonuç | **Zarf açılışı** (4 tur kartı), kontrol hakkı amblemi ilçeye geçer |
| **6 Toparlanma/soğuma** | ≥49 sa; 7 gün | Revir, onarım, yeniden meydan okuma (savunan), yeni ilan (≥49 sa sonra), ittifak içi pay tartışması (yağma %60 iletimi) | Gurur/öğrenme, "yeniden" merakı | Sen yokken, kitabe |

### 4A.2 Baskın ya da savaş anının sunumu (şiddetsiz ama dramatik)

**Yasaklar korunur:** şiddet, kan, patlama, çatışma animasyonu, silah sesi, insan zararı dili, kırmızı, yanıp sönme, kamera sarsıntısı. **Eklenenler** aşağıdadır; hepsi **sunum katmanıdır** (kural değiştirmez), türetilmiş veriden çalışır.

**1) Harita: soyut birlik simgeleri ve yaklaşma çizgisi** (L2 ilçe ölçeği). Pencere açıkken: baskın tarafı **kehribar noktalar** (sayı = boy, en çok 8) ilçe sınırındaki en yakın yol ucundan merkeze **ince kesikli çizgi** üzerinde ilerler; savunma tarafı **zeytin yeşili kalkan simgeleri** (Nöbet Evi, Karakol, katılan oyuncu sayısı rozeti, adsız). İlerleme gerçek zaman oranına bağlıdır: `ilerleme = (şimdi − T) ÷ 60 dk`; her 10 sn'de bir **320 ms `ease-cikis`** ile güncellenir; sonuç bilgisi taşımaz (spoiler yok). PvP'de noktalar saldıran ilin **geometrik amblemiyle**, komşu il kenarından gelir. Halka (kehribar kesikli kontur) pencere **öncesi ve sonrası** bilgi katmanıdır (ne zaman, nerede); yaklaşma çizgisi **pencere sırasında** olay katmanıdır: ikisi birbirini ikame etmez, **yan yana** durur.

**2) Tur tur çözüm kartları.** PvE'de çözüm tek karşılaştırmadır (§3.3); kartlar bunun **deterministik anlatımıdır** (yeni rastgelelik yok): etkin baskın gücü `Gb_etkin` **ardışık üç eşit parçaya** bölünür; her parça savunma kalemlerinden sırayla karşılanır: **sabit hat** (Nöbet Evi, Karakol) → **katılımcı birlikler (büyükten küçüğe)** → **yedek**. Parçayı karşılayan kalemler kartta adlandırılır. `Gs_etkin ≥ Gb_etkin` ise baskın üçüncü parçada biter; değilse savunma kalemleri tükenir ve kalan parça ambara yönelir (yenilgi). PvP'de **gerçek 4 tur** kartı vardır (§3.10 adım 8). Kartlarda yalnız yapı ve birlik adları geçer (başkasının adı geçmez: "bir komşunun tümeni"); insan, yaralı, ölü yoktur.

PvE örneği (§3.8, savunma kazanır; `Gb_etkin` = 412, parça 137; kalemler ×0,97: Nöbet Evi 97, Karakol 97, senin 2 tümenin 252, komşunun tümeni 97):

```
Serdivan nöbeti · Çarşamba 19:00–20:00
1. tur  Nöbet Evi ve Karakol ilk hattı tuttu.             baskın 412 → 275
2. tur  Karakol ve senin tümenlerin ana dalgayı karşıladı.   275 → 138
3. tur  Senin tümenlerin dalgayı dağıttı. Komşunun tümeni yedekte kaldı.   138 → 0
Sonuç: Savunuldu · azalma yok · ganimet: mühimmat 9,4, yakıt 6,3
```

Hazırlıksız dalda (Gs = 300 × 0,97 = 291): "1. tur: Nöbet Evi ve Karakol ilk hattı tuttu (412 → 275). 2. tur: Karakol ve bir komşunun tümeni karşıladı (275 → 138). 3. tur: Hat geri çekildi; dalganın kalan 121'i ambara yöneldi. Sonuç: Savunma yetmedi · ambarından %7 eksildi · 1 Çiftlik 24 sa bakımda."

PvP örneği (§3.10; sayılar etkin güçlerdir):

```
Körfez nöbeti · Salı 20:00–24:00
1. tur  Sakarya hattı ilk baskıyı yaptı.            4.136 – 3.312
2. tur  Körfez savunması karşı koydu.               3.619 – 3.623
3. tur  Sakarya yeniden öne geçti.                  4.096 – 3.450
4. tur  Sakarya kontrolü sağlamlaştırdı.            3.937 – 3.347
Sonuç: Kontrol hakkı Sakarya'da (3–1) · 14 gün
```

**3) Sonuç anı: zarf açılışı.** [donus-deneyimi §2.7](donus-deneyimi.md) ritmiyle (kâğıt örtü, kart yukarıdan 16 px, gorsel §5.6 token'ları): kapak 320 ms `ease-cikis`; tur kartları sırayla **320 ms** ile belirir, aralarında **400 ms** (3 tur ≈1,5 sn, PvP 4 tur ≈2 sn); sonuç satırı 200 ms; toplam **≤2,5 sn**, ardından özet satırları. **Atla** ve **Devam** 0. ms'de etkindir; çevrimdışı oyuncuda aynı kart "Sen yokken" blokunun başında kapalı gelir ve oyuncu açar. Azaltılmış hareket: hareket 0, yalnız 80 ms opaklık; ekran okuyucu için kartın metin eşdeğeri vardır.

**4) Ses.** Üç kısa efekt (≤600 ms, düşük ses): duyuruda **"fener"** (tek yumuşak ahşap/çini dokunuşu), her tur kartında **ahşap tık** (80 ms), sonuçta **iki notalı çini tonu** (savunuldu) ya da **alçak tek nota** (yetmedi; nötr, buruk değil). Siren, silah, patlama, kalabalık sesi yok. **Varsayılan kapalı, ayarlardan açılır**; her ses bir görsel eşdeğere sahiptir. Belgelerde ses politikası bulunamadı: **sahip kararı** (Ö10).

**5) "Sakin" ile "sönük" ayrımı:**

| | **Sakin (korunur)** | **Sönük (kaçınılır) → önlem** |
|---|---|---|
| Renk | Zeytin, kehribar, soluk kiremit; kırmızı yok | Hiç renk değişimi olmaması → pencere sırasında halka dolar, nokta renkli |
| Hareket | 320–700 ms yumuşak, yanıp sönme ve sarsıntı yok | Hareketsiz ekran → yaklaşma çizgisi, tur kartı |
| Ses | Kısa, nötr, opsiyonel | Sessiz sonuç → üç imza ses |
| Dil | Nötr ("savunma yetmedi") | "Bir şey oldu" belirsizliği → **adlandırılmış kalemler** ("Karakol tuttu") |
| Zaman | Zorunlu geri sayım yok | "Hiçbir şey olmuyor" → **bir an** (zarf), **bir sosyal ortam** (çubuk, kitabe) |
| Sonuç | Şiddetsiz | İz bırakmayan sonuç → kitabe, şerit, unvan, ganimet (§4A.3) |

### 4A.3 Zaferin görünür karşılığı (avantajsız) ve ekonomik etkisi

Hiçbiri oyun avantajı vermez (oy, yetki, güç yok); hepsi **türetilmiş** ve **kozmetik/bilgi**dir ([oyun-kimliği A1–A2](oyun-kimligi-harman.md)).

| Karşılık | Ne | Nasıl türetilir | Gösterildiği yer |
|---|---|---|---|
| **İlçe güvenlik şeridi** | Son 4 baskının sonucu: ●●●● "Sağlam", ●●●○ "Güvenli", ●●○○ "Dalgalı", ≤1 dolu "Savunmasız" (nötr ton, kırmızı yok) | `baskinlar` kaydından son 4 sonuç (E3) | İlçe kartı, Yerleş ekranının ilçe önerisi, ilçe paneli |
| **Mahallede kitabe satırı** | "{ilçe}, {tarih} akşamı baskına karşı duruldu: {hat} hat, {tümen} tümen." İlk savunma, her 10. savunma, 4'lü kesintisiz seride yazılır | Olgu defterinden şablon; ad anma rızasına bağlı (`gorunurKimlikRef`) | Nöbet Evi panosu, Karakol parselinde plaket (kozmetik) |
| **Türetilmiş unvan** | "**Hendek'in Nöbetçisi**" gibi: son 90 günde ≥5 savunmada katkı payı ≥%25 olan oyuncu; dönem 28 gün; ilçe başına en yüksek katkı | Katkı kayıtları (E3) | Profil, Karakol plaketi. **Yetki, oy, güç vermez**; rütbe değil unvandır |
| **Ganimet** | Mal (§3.4) | Çekirdek tablosu | Stok |
| **Komşunun koruma talebi (A1)** | "Bir komşun 4 hafta, ₺3.200/hafta koruma önerdi" | `koruma_sozlesmesi` teklifi (tavan ₺1.000 × boy) | Gelenler (B3) |
| **İlçe saygınlığı** | "Bu ilçe son 28 günde 4 baskıyı tuttu" bülten satırı | Olgu → şablon | İlçe Bülteni |

**Ekonomik etki (avantajsız ama gerçek):** savunmasız bir boy 4 ilçede Deniz boyutunda bir işletmenin beklenen haftalık kaybı ≈₺18–28 bin (stok + üretim, §3.8), haftalık net gelirin **≈%3–8'i** (₺350–910 bin); "Sağlam" ilçede beklenen kayıp ≈0'dır. Bu fark (1) Yerleş ekranının 3 ilçe önerisinde **bilgi** olarak görünür, (2) yatırım kararını etkiler, (3) mevcut hücre fiyat çarpanı `1 + 2 × satılmış pay` ile **doluluk arttıkça fiyata yansır**. Yani güvenli ilçenin yatırım için seçilmesi **dolaylı ve ölçülebilir** bir sonuçtur; hiçbir kural güvenli ilçeye bonus vermez (ölçüt AH10). Savunma kaybında utandırma yoktur: şerit nötrdür, "Savunma tutanağı" bir sonraki hamleyi önerir.

### 4A.4 Haftalık karar sayısı ve çeşitliliği

**Zorunlu karar 0'dır** (§1.8). **İlginç karar** = oyuncunun ≥2 anlamlı seçenek arasında seçtiği ve sonucu bir sonraki baskında ya da seferde görünen isteğe bağlı eylem. Sayılar insan testiyle doğrulanacak tahmindir (ölçüt AH11).

| Model | Haftalık isteğe bağlı karar (tipik) | Karar türleri (örnek) | Çeşitlilik kaynağı |
|---|---:|---|---|
| **M1 kendini savunan** (A0) | **6–10** | İkmal planı (kaynak seçimi, Genel Talimat) 1–2; duruş (3 seçenek) 1; parti (tür, adet) 1–2; [E1] hazır emir (baskın başına) 1; Karakol/Kule ekleme ve konumu 0–1; **Kule ile ön duyuruyu uzatma** 0–1; komşuyla savunma dengesi (çubuk) 1; yeniden yatırım (tutanaktan) 0–1; teknoloji (Piyade II, `mekanize_ordu`) 0–1 | Boy, tahmin aralığı, dilim, komşu katkıları, ikmal fiyatı her hafta farklıdır |
| **M2 koruma hizmeti** (A1) | **9–14** | M1'in kararları + **koruma sözleşmesi pazarlığı** (ücret, süre, alıcı seçimi) 2–3; taahhüt gücü dağıtımı 1; yenileme/iptal 0–1 | Alıcı portföyü (≤6), ilçe boyları |
| **M3 tedarikçi** (A0/A1) | **5–8** | Tedarik fiyatı ve miktarı 2–3; hat yöntemi/ölçek 0–1; müşteri ordugâh portföyü 1; sözleşme ↔ NPC makası kararı 1; stok tamponu 1; yeni askeri mal (Özel Çelik vb.) 0–1 | Ordu talebinin dalgası, fiyat |
| **M4 il kontrolüne talip** (A1) | **sakin hafta 4–6; savaş haftası 8–14** | **İttifak seçimi/katılım** 0–1; sefer katkı oranı 1 (kapanış anı); karışım (üçgen) 1–2; ikmal 1–2; bant/ilan hedefi (vali) 0–2; **emir kartı (4 tur)** 4; teknoloji/doktrin 0–1 | Rakip karışımı belirsizliği, tur dalgalanması |
| **M0 askeri yapmayan** | **1–2** | Karakol alıp almama; koruma önerisini kabul; Nöbet panosuna bakmak | — |

Çeşitlilik ölçütü: aktif komutanın (M1–M4) haftalık karar türü ≥3; tek bir karar türünün payı ≤%40 (aksi hâlde "tek tuşa basma" oyunu).

### 4A.5 Senaryo A ekranlarla: Deniz'in akşamı (§3.8'in genişletilmesi)

Sayılar §3.8'in aynısıdır (S = ₺1.103.000, boy 4, Gb = 400, hazırlıklı Gs = 560). Fark: Deniz akşam çevrimiçidir ve pencereyi izler.

**Salı 19:10 · Dikkat kartı:**
```
Yaklaşan baskın · Çarşamba 19:00–20:00 · Serdivan
Tahmini boy: 3–5 tümen eşdeğeri
Savunma çubuğu  ▮▮▮▯▯▯▯▯   300      ▲ yetersiz
Nöbet Evi 100 · Karakol 100 · komşular 100 · sen 0
                     [Hazırlan]   [Sonra]
```
Karar 1: **bırak ya da ele al** (M0 olsaydı "Sonra" meşrudur). Deniz **Hazırlan**'a basar.

**19:11 · Ordugâh ve parti kartı:**
```
Ordugâh · kapasite 0/12 · stok: çelik, mühimmat, gıda yeterli ✓
Parti: Piyade Tümeni × 2   çelik 60 · mühimmat 40 · gıda 60   ₺17.400
Bitiş Çarşamba 07:12 · son parti saati Çarşamba 07:00
Hazır emir: (•) Normal  ( ) Mevzi [+%5; mühimmat 2 birim]  ( ) Yedek [güç ×0,8; yenilgide kayıp 0]    ← E1
                     [Parti ver]
```
Karar 2: **kaç tümen** (1–2–3), Karar 3: **duruş** → İl nöbeti, Karar 4: emir (varsayılan Normal). Deniz 2 tümen verir, "İl nöbeti" seçer.

**19:14 · Çubuk güncellenir:**
```
Savunma çubuğu  ▮▮▮▮▮▮▯▯   560     ✓ yeterli   (tahmin 300–500; parti 07:12'de biter)
Nöbet Evi 100 · Karakol 100 · komşular 100 · sen 260
```
Çıkış, 4 dakika sonra. Çarşamba 07:12'de bildirim yok; Dikkat panelinde "Parti bitti".

**Çarşamba 19:00 · Nöbet ekranı** (Deniz çevrimiçi, haritada Serdivan): kehribar 4 nokta ilçe kenarındaki yoldan merkeze doğru ince kesikli çizgide ilerler; ilçe merkezinde 4 kalkan simgesi (Nöbet Evi, Karakol, 2 oyuncu rozeti); başlıkta "Nöbet sürüyor · %35". Ses açıksa tek fener sesi. **Karar yok**; Deniz yalnız izler. 19:42'de %70.

**20:00 · Sonuç anı:** kâğıt örtü, zarf kapağı açılır; tur kartları sırayla (yukarıdaki PvE örneği), ses açıksa üç ahşap tık ve iki notalı çini tonu. **"Savunuldu · azalma yok · ganimet: mühimmat 9,4, yakıt 6,3."** `[Devam]`.

**Sonuç sonrası (20:01):** ilçe şeridi ●●●● **"Sağlam"** olur; Karakol parselinde "Bu akşam üç hat bir arada tuttu" plaketi (kozmetik); Savunma sayfasında "İlk savunma" damgası (ödülsüz). **Komşu Murat**'tan Gelenler'e (A1): "4 hafta koruma önerisi, ₺3.200/hafta" (tavan ₺4.000). Karar 5: kabul/ret/sonra.

**Perşembe 08:00 · Sen yokken** (Deniz'e sonuç hâlâ yeni): "Serdivan'a gelen baskın dün akşam dağıldı. Katkın: 2 tümen, 1 Karakol. Ganimet stoğuna eklendi." + "Serdivan'da son 4 baskının 4'ü savunuldu."

**Hazırlıksız dal (Deniz hiçbir şey yapmasaydı):** aynı akış, çubuk **▲ 300**; sonuç kartı: *"Savunma yetmedi · ambarından %7 eksildi · 1 Çiftlik Perşembe 19:00'a kadar bakımda."* **Savunma tutanağı:** "Baskın 412, savunma 291. İl nöbetinde 1 tümen daha olsaydı savunma 417'ye çıkar ve tutardı." Karar: **yeniden yatırım** (parti verme önerisi tek tık). Şerit ●●●○ "Güvenli" kalır (utandırma yok).

### 4A.6 Eğlence artısı kalemleri (isteğe bağlı; §3.0'da ayrı bütçe)

| # | Kalem | Ne | Kural? | Boy |
|---|---|---|---|---|
| **E1** | **Hazır emir** (PvE): Normal / **Mevzi** (savunma ×1,05; katılan birlik başına 1 birim mühimmat sarfiyatı ≈₺150, ticaret ve üretim talebi) / **Yedek** (güç ×0,8; yenilgide birlik kaybı 0) | Pencere T'de **kilitlenir**; T−1 sa'e kadar değiştirilebilir (çevrimiçi/çevrimdışı eşit; çevrimdışı avantaj/dezavantaj yok). `savunma_emri`'ne isteğe bağlı `emir` alanı | 1 kural, 1 alan, 0 komut | S–M |
| **E2** | **Tur dökümü** | `BaskinDurumu.sonuc.kalemler[]` {kalem türü, etkin güç}: tur kartları **buradan türetilir** (rastgelelik yok) | 0 kural, 1 alan (≤katılımcı sayısı) | S |
| **E3** | **Güvenlik şeridi, kitabe, unvan** | Son 8 baskın ilçe başına tutulur (`ilceBaskinGecmisi`, bounded); şerit, kitabe ve unvan **türev** | 0 kural (türev), 1 bounded kayıt | S–M |

Bu üç kalem olmadan da §3 dilimi çalışır; **sunum katmanı** (harita çizgisi, kartlar, ses) E2'ye bağlıdır, E1 yalnız karar çeşitliliğini artırır.

## 5. Denge ve adalet

### 5.1 Mekanizmalar

| Konu | Kural | Kaynak/not |
|---|---|---|
| **Yeni oyuncu kalkanı** | 14 gün: yapı ve stok hedef dışı; ilçe servetine sayılmaz; birlik katkısı veremez; **15–28. gün PvE yağma oranı %5** (yumuşatma, öneri) | [11 §7.7](../11-urun-donusu.md); [cesitlilik §5.7](cesitlilik-yonetim-askeri-teknoloji.md) |
| **Hareketsiz oyuncu** | 14 gün **uyku**: ikmal ve maaş donar, savunmaya katılmaz, hedef dışı, yağma ödülsüz (PvP'de yağma 0, kontrol hakkı hesaplanmaz); tatil modu (≤30 gün/yıl) aynı | [11 §7.8](../11-urun-donusu.md) |
| **İttifak tavanı** | Üye ≤min(60, aktifin %15); katılım ≤40 hesap; 21–40 ×0,7, 41+ ×0,4; 7/3 gün bekleme; savaşı vali ilan eder | [cesitlilik §5.5](cesitlilik-yonetim-askeri-teknoloji.md) |
| **Teknoloji tavanı** | Göreli ×1,5 tek noktada; destek ≤+%10, doktrin ≤+%15; Model II/III ≈ +%16/+%12 | [bilim-teknoloji §5.6, §6](bilim-teknoloji-askeri.md). PvE'de teknoloji çarpanı yalnız **birim `guc`**tur; tavan yok çünkü NPC'nin ikinci tarafı yoktur |
| **Servet oranı** | Servet = hücre değeri + yapı bedeli + stok (taban fiyat); hazine/birlik dışı. PvP: ilan eden ilin aktif servet toplamı ÷ hedef ilin ∈ [0,2 ; 5]. PvE: ilçe eşiği ₺250.000 | OGame esinli; [11 §7.7](../11-urun-donusu.md) |
| **Yağma tavanı** | ≤%25 defter (PvE+PvP ortak); PvE tek baskın ≤%10 × ilçe payı; PvP ≤%25 × ilçe payı; %60 iletim (A1) | §2.6 |
| **Yapı** | ≤%10 yuva, 24 sa, yıkım yok; ek yapılar ve askeri yapılar devre dışı bırakılmaz | §2.6 |
| **Soğuma** | PvE: 4 gün; PvP: ≥49 sa; il başına ≤1 ilan/hafta; savaş yorgunluğu 7 gün | [cesitlilik §5.4](cesitlilik-yonetim-askeri-teknoloji.md) |
| **Bant** | PvE: 19:00–23:00 (il başına 4 dilim); PvP: savunanın 4 sa bandı (08:00–24:00), 96 sa değişim | Çevrimdışı güvenlik |
| **M0 oyuncusu** | Askeri hiçbir şey yapmayan oyuncunun kaybı tavanlı; **ölçüt AH2** | §5.4 |

### 5.2 Kötüye kullanım senaryoları ve önlemler

| # | Senaryo | Önlem |
|---|---|---|
| 1 | **Sürekli taciz** (aynı hedefe art arda baskın/ilan) | PvE: 4 gün bekleme, ≥49 sa; PvP: il başına ≤1 ilan/hafta, aynı ilçeye ≥49 sa, 7 gün yorgunluk; kalkanlı/uykulu hedef yok |
| 2 | **İkinci hesap: ganimet çiftliği** (sahte oyuncularla ilçe servetini şişirip boy yükseltmek ve ganimet toplamak) | Servete yalnız **kalkansız** (14 gün sonrası) ve uykuda olmayan oyuncu girer; ganimet **ilçe haftalık ₺6.500 tavanlı**; her ilçe kendi eşiğini ister; katkı ≥%10 şartı; alt hesabın yapı yatırımı gerçek sermaye ister |
| 3 | **İkinci hesap: yağma çiftliği** (kendini yağmalatıp para aktarmak) | %40 sürtünme; yağma ≤%25 × ilçe payı; yeni hesap transfer tavanı; aynı cihaz/IP kontrolü (R-Ü11) |
| 4 | **İkinci hesap: kalkan sömürüsü** | Kalkanlı hesap birlik katkısı veremez ve ilçe servetine sayılmaz; kalkan sonrası 15–28. gün %50 yağma |
| 5 | **Koruma haracı** (kendi baskınını tetikleyip "korurum" demek) | Baskın PRNG ve servetle belirlenir, tetiklenemez; sözleşme yalnız alıcı kabulüyle; PvP'de komutan alıcıya savaş açarsa sözleşme askıya; ücret tavanı; 72 sa iptal; serbest metin yok |
| 6 | **Stok boşaltma** (baskın öncesi stoku başkasına devretmek) | Defter yalnız oranı sınırlar; ilçe serveti **stoku saymaz**; yeni hesap transfer tavanları; stok tutmamak zaten üretim/ticaret seçimidir (kayıp ≤%10 × ilçe payı) |
| 7 | **Bedavacı** (kimse savunmaz, herkes başkasından bekler) | Nöbet Evi 100 ve Karakol tabanı; ganimet payı katkıya orantılı (savunanı ödüllendirir); AH6 katılım izlenir; kayıp tavanlıdır, çöküş yok |
| 8 | **Küçük işletmeyi ezme** | Yapı ≤%10 yuva (küçük işletme ≈10 yuvaya kadar dokunulmaz); kalkan; servet eşiği; Karakol ₺7.840 ile tabana çıkar |
| 9 | **Ordu şişirme** (24 üstü) | Ordugâh ≤2, kapasite 12/yapı; maaş + ikmal; ittifak tavanı |
| 10 | **Servet yayarak baskından kaçmak** | Bilinen sınırlama; AH1 izler; baskın boy eşiği ilçeye göre; ordu/gözetleme ihtiyacı doğmaması bilinçli kabul (asıl hedef: servet yoğun ilçeler) |
| 11 | **Abluka ile ilçeyi aç bırakmak** (A1) | Kapasite ≥%50, gıda/elektrik insani koridoru, ≤72 sa, 7 gün ara |
| 12 | **Paralı sahte sözleşme** (A1) | ≤%30 paralı tavanı, bağlılık, emanet ([cesitlilik §5.5](cesitlilik-yonetim-askeri-teknoloji.md)) |
| 13 | **Kule bilgisini istismar** (duyuru önceden sızdırma) | Kule yalnız tahmin aralığını daraltır, hedef/kader belirsizdir; tahmin herkese açık ilçe bilgisi (Çay ocağı kuralı) |
| 14 | **Hata: sonsuz düzeltme** (aynı tick çok baskın) | İl başına bir pencere, planlama sıralı; `savas` PRNG akışı, deterministik |

### 5.3 Güç ve ekonomi dengesi (özet)

Ordu, **ekonomiden doğar** ve ekonomiden yer: 4 tümen günlük gelirin ≈%5–14'ünü yer (Hesap B ₺7.008/gün); karşılığında kontrol ve kayıp önleme. Teknoloji tavanları (göreli ×1,5, destek ≤+%10, doktrin ≤+%15) PvP'de ezmeyi sınırlar. Askeri gelirin meşruluğu **para korunumu dürüstlüğüyle** (§3.6) sağlanır: askeri sektör net lavabodur, gelir ikincildir.

### 5.4 Ölçütler (yeni: AH1–AH11; H3 ve H5 ile birlikte)

| # | Hipotez | Gösterge | Eşik |
|---|---|---|---|
| **H3** (mevcut) | Askeri üretim ekonomiyi oynatır | Kapasitenin %20'si ordugâha kayınca o ilde ve komşularında fiyat ya da arz | ≥%10 (eşli koşu; `olcum/parsel/h3.ts` Ordugâh şartıyla güncellenir) |
| **H5** (mevcut, parsel) | Çevrimdışı kayıp sınırlı | 48 sa çevrimdışı oyuncu: parsel kaybı **0**; depo kaybı / pencere içi en yüksek stok | ≤%25 (PvE+PvP birlikte); yapı ≤%10 yuva |
| **AH1** | Baskın yükü dengeli | İlçe başına haftalık baskın (eşik üstü ilçelerde); boy dağılımı; **baskın alan ilçe payı** | 0,8–1,4 / hafta; ilçelerin ≥%60'ı (yayma kaçışı kontrolü) |
| **AH2** | Çevrimdışı adalet (M0) | 48 sa çevrimdışı, Karakolsuz ve birliksiz oyuncunun 7 günlük baskın kaybı / 7 günlük net gelir | ≤%8; savunmalı ≤%1 |
| **AH3** | Sigorta paritesi | Kendini savunma haftalık gideri ÷ beklenen haftalık yağma kaybı | 0,5–1,5 |
| **AH4** | Askeri musluk | Ganimet değeri ÷ ilçe haftalık net üretim; ganimet ÷ (askeri tüketim + yağma lavabosu) | ≤%1; ≤%10 |
| **AH5** | Talep gerçek | Mühimmat, çelik, gıda, yakıt toplam talebinde askeri pay; en az bir malda kapsam ≥%10 oynama (H3) | Pay %2–15 |
| **AH6** | Savunma katılımı | Eşik üstü ilçelerde savunmaya katkı yapan oyuncu payı | %30–70 |
| **AH7** | Rutin yükü | Aktif askeri oyuncunun zorunlu karar sayısı/gün; 7 gün hiç girmeyen oyuncunun net askeri kaybı | 0 zorunlu; kayıp ≤%3 gelir |
| **AH8** | PvP dengesi (A1) | Saldıran kazanma oranı; kontrol savaşı sonrası üretim kaybı; servet oranı dışı ilan reddi | %40–60; üretim kaybı ≤%10 yuva 24 sa; reddedilen ≥%95 |
| **AH9** | Kötüye kullanım | Alt hesap ganimet/yağma kârı; aklama simülasyonu | Kâr ≤0 (%40 sürtünme + tavan) |
| **AH10** | Güvenlik dolaylı çeker (§4A.3) | "Sağlam" şeritli ilçelerde 28 günlük yeni işletme açılışı payı ÷ "Savunmasız" ilçelerde | ≥1,2 (kuralla bonus yok; yalnız bilgi ve beklenen kayıp) |
| **AH11** | Karar çeşitliliği (§4A.4) | Aktif M1–M4 oyuncunun haftalık isteğe bağlı karar sayısı ve türü | ≥4/hafta; tür ≥3; tek türün payı ≤%40; zorunlu karar 0 |

Yeni bot önayarları: `komutan` (M1), `koruma` (M2, A1), `tedarikci` (M3), `askeri_yok` (M0, referans), `ittifak_sefer` (M4, A1); ölçüm kalibrasyonu: ikmal çarpanı (×1 ve ×0,25) iki koşu.

---

## 6. Hassasiyet

Kural: **dahil etmek kolay, çıkarmak zordur; varsayılan hariçtir** ([canlı §5.7](canli-dunya-simulasyonu.md)). Türkiye'de askerlik toplumsal olarak yüksek duyarlılıklı bir alandır; oyun **jenerik ve ekonomik** bir "savunma" soyutlamasıdır.

| Konu | Politika | Doğrulama |
|---|---|---|
| **Gerçek ordu ve kurum adları** | Hiçbir gerçek kuvvet, komutanlık, teşkilat, kurum, jandarma/polis/istihbarat adı ya da kısaltması yok. "İl komutanlığı" UI'da **"İl savunma düzeni"**; "Nöbet Evi", "Karakol" (jandarma/polis sözcükleriyle birlikte kullanılmaz), "Ordugâh", "Gözetleme Kulesi", "Savunma Kurulu" jenerik adlardır | K34 hukuki görüş listesine "askeri tema" eklenmeli (**doğrulanmadı**) |
| **Birlik adları** | Gerçek birim numarası, tarihî alay/tümen adı, marş/ünvan/rütbe yok. "Tümen/Alay" boyut sözcüğü jeneriktir; istenirse görünen ad "Müfreze/Bölük" yapılabilir (yalnız görüntü, ikincil karar) | Sahip kararı (Ö2) |
| **Silah ve araç markaları** | Gerçek silah, araç, savunma sanayii ürünü ve **firma adı** (kamu ya da özel) yok; il imza ürünlerinde "savunma sanayii kimliği" yalnız `muhimmat` genel malı ([cesitlilik-üretim S11](cesitlilik-uretim-katmanlari.md)) | Veri incelemesi |
| **Güncel çatışma** | Gerçek çatışma, ülke, kriz, tarih, saldırı anması yok; baskın metinlerinde yer/tarih yok (yalnız oyun ilçesi) | Şablon listesi |
| **İnsan zararı dili** | Ölü, yaralı, şehit, gazi, aile sözleri **hiç kullanılmaz**; "azaldı", "geri döndü", "toparlanıyor", "bakımda" | §4.3 şablon yasakları |
| **Şiddet görseli** | Kan, patlama, çatışma animasyonu, silah sesi yok; nöbetçiler silahsız | §4.2 |
| **Bayrak ve millî semboller** | Bayrak, ay-yıldız, Atatürk görseli, millî marş, dinî motif yok; ittifak ve il amblemi katalogu geometrik/bitkisel ([oyun-kimliği §4.4](oyun-kimligi-harman.md)) | Mevcut kural |
| **Eşkıya NPC'si** | Tarihî halk figürü olarak jenerik "Eşkıya"; adlı kişi, bölge/etnik/mezhep/siyasi ima, "terör" ya da gerçek örgüt yok | Metin listesi |
| **Askeri alan hücreleri** | `landuse=military` hücreler satın alınamaz; haritada **yalnız gri "engel"**, ad/tür/kurum yok | [arsa-ve-insa §2.2](arsa-ve-insa-derinlestirme.md) |
| **Anma günleri** | Baskın/savaş penceresi 17 Ağustos, 6 Şubat, 10 Kasım'da planlanmaz (öneri) | Sahip onayı |
| **Mizah/parodi** | Askeri mizah ya da orduyu küçük düşüren/yücelten dil yok | Metin incelemesi |

---

## 7. Karşılaştırma: ne alıyoruz, ne almıyoruz

| Oyun | Mekanik | **Alıyoruz** | **Almıyoruz** | Kaynak |
|---|---|---|---|---|
| **Travian** | Başlangıçta vahalar vahşi hayvanlarla doludur; hayvan öldürmek kahramana kaynak ödülü verir; yeni oyuncu koruması iki yönlüdür; ittifak ≤60 | **PvE'nin üretim kaynağıyla bağlanması** (ganimet mal); ödülün, saldırı kaybında bile değil **savunmanın başarısından** doğması; kalkanın iki yönlü olması (kalkanlı katkı veremez) | Günlük vaha/farm listesi tekrarı (angarya); kahraman XP'si | [S1] [S2] |
| **Rise of Kingdoms** | Barbarlar seviyeli; saldırı 50 eylem puanı harcar; kale tek denemede yıkılmazsa yenilenir; ödül hasara göre | **Katkıya göre ödül payı**; PvE'nin ölçeklenmesi; üçgen ±%25 (A1) | Eylem puanı (AP) ekonomisi ve zorunlu giriş; "tek denemede yık" baskısı; komutan XP'si | [S3] [S4] |
| **Clash of Clans** | Yağma, TH seviyesine göre %20'ye kadar; ≥%30 yağmada kalkan; savunma kaydı | **Yağma tavanı ve büyük kayıptan sonra koruma** (≤%25, 4 gün/≥49 sa bekleme); savunma özeti | Kupa sıralaması, intikam penceresi, hedef seçme (matchmaking); saldırı için "uygun yağma" avcılığı | [S5] |
| **Hearts of Iron 4** | Fabrikalar ekipman üretir; ikmal merkez depolardan altyapıyla dağıtılır; birim hareketi | **Ordunun gücü üretime ve ikmale bağlı** (fabrika kapasitesi = ordu kapasitesi, ikmal kapsama oranı gücü ölçekler: bizde `ikmalKarsilanmaPpm`) | Birim hareketi, cephe çizgisi, emir/plan mikro yönetimi, ülke diplomasisi | [S6] |
| **EVE Online** | Savunan 4 saatlik savunmasızlık penceresi seçer, değişim 96 sa sonra; paralı sözleşme savaş boyu bağlı | Savunanın bandı, 96 sa değişim, paralı bağlılığı (A1); savaş hedefi ilanda sabit | Karşılıklı savaş sınırsızlığı, fraksiyon savaşı, parayla güç | [S7] [S8] |
| **Foxhole** | Lojistik omurga; lojistik oyuncular angarya yüzünden 49 gün grevde | İkmalin görünür ama **otomatik** olması (talep = zincir); İkmal Kartı | Elle taşıma, kamyon sürme, kaynak toplama angaryası | [S9] |
| **Albion Online** | Bölge savaşı ilandan ≥20 sa sonra yoğun saatte; lonca ≤300 | Hazırlık alt sınırı 20 sa; ittifak beklemeleri | Açık dünyada her şeyi kaybet PvP; lonca devleşmesi | [S10] |
| **Capital Rift** | Gerçek harita üzerinde oyuncu işletmeli ekonomi; askeri/savaş yönü **bulunamadı** | Görünür üretim ağı hissi: ordu talebi üretim ağında görünür; "kimse satmıyorsa yoktur" dersi (tedarikçi) | — (askeri örnek yok) | [S11] **(tek kaynak, doğrulanmadı)** |
| **RimWorld** | Baskın büyüklüğü koloni servetinin eğrisi | **Servet eğrisi ve eşik** (boy) | Sonsuz ölçek | [S6] |
| **Rival Regions** | Savaşa meclis karar verir | Vali ilanı + il meclisi onayı (A1) | Parayla oy | [S12] |

**Ortak çıkarım.** (1) PvE ödülü küçük, mal ve katkıya göre; (2) askerî rol sivil ekonomiden beslenir (HoI4/Foxhole), ama elle taşıma yok; (3) kalkan ve tavan şart (CoC, Travian); (4) savunan penceresini seçer (EVE, Albion); (5) angarya yok (Foxhole grevi dersi).

---

## 8. Geri dönüşü zor kararlar ve ölçütler

**Sıralama ölçütü.** Geri dönüş maliyeti: *Yüksek* = veri biçimi, kayıt ya da oyuncu davranışı değişir; *Orta* = içerik ve dengeyle düzeltilir; *Düşük* = parametre.

| # | Karar | Seçenekler | **Önerim** | Neden geri dönmesi zor | Maliyet |
|---|---|---|---|---|---|
| **K1** | **"Seviye ya da kilit yok, seçim var"** (Ar-Ge lideri/sahip ilkesi) | (a) Kademeli açılış (ilçe seviyesi, rütbe, "önce şu görev") · (b) **Yalnız sermaye, arsa, girdi, gider, H5** | **(b).** Askeri yapı, birlik, savunma bir ilerleme merdiveni değil, dört iş modelidir (M1–M4). Teknoloji birlik türü açar, ilerleme fazı değildir | (a) bir kez konursa oyuncu yatırımları ve sıra beklentileri oluşur; kaldırmak "adaletsiz" algısı yaratır. Sonradan kilit koymak (ör. Ordugâh'a Kasaba şartı) yatırımı olan oyuncuları cezalandırır | Yüksek |
| **K2** | **Birlik nerede durur** | (a) İşletme düğümü · (b) İl havuzu · (c) Konumlu · **(d) Envanter düğümde + il nöbeti** | **(d)** | (b)'ye geçmek ikmal/maaş/kayıp sahipliğini ve durum şemasını değiştirir; (c)'ye geçmek konum, hareket ve zaman durumu ekler; anlık görüntü ve oyuncu beklentisi bozulur | Yüksek |
| **K3** | **Savaşın ödülü** | (a) Yağma ağırlıklı · (b) **Kontrol hakkı ağırlıklı, yağma yan etki** | **(b)** + **yağma iletim %60** (PvP) | (a) "zengini yağmala" oyununa kayar, parsel ilkesiyle ve H5 ile gerilir; iletim oranı sonradan düşürülürse ekonomiyi (aklama kârı) yeniden tanımlar | Orta–Yüksek |
| **K4** | **PvE mi PvP mi önce** | (a) PvP önce · (b) **PvE önce (A0), PvP (A1)** · (c) İkisi aynı anda | **(b)** | (a)(c) vali/meclis (yönetişim) ve adalet paketinin tamamını Alfa-0 kritik yoluna sokar; ölçüm ve kalibrasyon PvP'de bot ile kısıtlıdır. PvE sonradan eklenirse savunma toplamı ve defter yeniden yazılır | Orta |
| **K5** | **Askeri yapı kamu mu, oyuncu mu** | (a) Hepsi kamu · (b) Hepsi oyuncu · **(c) Ordugâh/Karakol/Kule oyuncu; Nöbet Evi kamu; komutanlık yapı değil** | **(c)** | Kamu/oyuncu ayrımı kimlik, yetki ve arsa bütçesine (`k:` sahipler) yazılır; Nöbet Evi'ni oyuncu yapısına çevirmek kamu arsası dondurulmuş kümesini bozar | Orta–Yüksek |
| **K6** | **Kayıpların kalıcılığı** | (a) Tam kalıcı · (b) Geçici (yaralı, 24 sa) · **(c) %60 kalıcı + %40 revir (24 sa)** | **(c)**; PvE'de yalnız yenilgide %15, yuvarlama aşağı | (a) talebi şişirir ama yeni oyuncuyu eler; (b) H3 talebini öldürür. Oyuncular birliklerin kalıcılığına göre yatırım yapar; değiştirmek davranışı bozar | Orta |
| **K7** | **PvE ganimeti: mal mı, para mı** | (a) Para (b) **Mal, çekirdek tablosu, tavanlı** | **(b)** | Para alanı taşıyan sistem komutu yasak ([12 §10 G4](../12-yon-taslagi.md)); para musluğu enflasyonu geri dönülmez biçimde etkiler | Yüksek |
| **K8** | **Yağma defteri şekli** | (a) Savaş başına kural (mevcut ilan kuralları) · (b) **Düğüm başına kayan defter** | **(b)** | Kayıt şekli `BolgeDurumu`'na yazılır; PvE+PvP ortak tavan için tek doğru yol; sonradan eklemek serileştirme göçü ister | Orta–Yüksek |
| **K9** | **Baskın hedef birimi** | (a) Düğüm (oyuncu, il) · (b) **İlçe** · (c) İl | **(b)** | Şerit/servet/duyuru/seçim/Nöbet Evi hepsi ilçe; hedefi değiştirmek `baskinlar` şemasını, duyuru ve istemci katmanını yeniden yazar | Orta |
| **K10** | **Ordugâh: ek yapı mı, tesis türü mü** | (a) `icerik.json` tesis türü · (b) **`mulk.ekYapilar`** | **(b)** (docs/06 §15.3 yöntemi) | Tesis türü kimliği `icerik.json`'a girerse G8 kimlik kilidi ve bölge kipi altınları etkilenir; sonradan taşımak içerik kimliğini değiştirir | Yüksek |
| **K11** | **Baskın ön duyurusu** | (a) 6 sa (çeşitlilik) · (b) **24 sa** (Kule 36) | **(b)** | Kısa duyuru çevrimdışı oyuncuyu cezalandırır; uzatmak sonradan kolay ama eski sürümle replay farkı doğar | Düşük–Orta |
| **K12** | **Koruma hizmeti: alıcı onaylı, tavanlı** | (a) Serbest piyasa ücreti · (b) **Alıcı kabulü, tavan `₺1.000 × boy`, 72 sa iptal, askıya alma** | **(b)** | "Haraç" yapısı bir kez oluşursa kötü kültür yerleşir; kuralı sonradan sıkmak kullanıcıları kızdırır | Orta |

**Karar sırası (kod öncesi):** K10 (yapı kimlikleri, G8) → K9 + K8 (şema) → K2 + K6 (durum) → K7 + K3 → K1/K5/K11/K12 (içerik ve denge; K1 ilke olarak şimdi kilitlenmeli).

---

## 9. Açık sorular (sahip ve lider)

| # | Soru | Önerilen varsayılan |
|---|---|---|
| Ö1 | İkmal kalibrasyonu: mülk kipinde birlik ikmali ×0,25 mi? | Evet (Hesap B); ölçüm raporuyla yeniden |
| Ö2 | Görünen birlik adı "Tümen" mi "Müfreze/Bölük" mü? | Ad değişimi yalnız görüntü; sahip kararı |
| Ö3 | Ordugâh kapasitesi 12/yapı, ≤2 yapı: işletme tavanı 24 birim yeterli mi? | Evet; ölçüme göre |
| Ö4 | Baskın bandı 19:00–23:00 sabit mi, vali/meclis seçimi mi (A1)? | A0 sabit; A1'de vali seçer (08:00–24:00) |
| Ö5 | Karakol ilçede yalnız 2 etkili: "kamu faydası" ilçe geneli mi, yalnız sahibi mi? | İlçe geneli (imece benzeri); sahibine ganimet payı |
| Ö6 | Anma günlerinde baskın/savaş planlanmaması | Evet (sahip onayı) |
| Ö7 | Yağma iletim oranı %60 mı? | %60; AH9 ölçümüyle |
| Ö8 | Yapı ≤%10 yuva kuralının küçük işletmeyi koruması istenen mi? | Evet (bilinçli) |
| Ö9 | Koruma hizmeti A1'e mi, A0'a mı? | A1 (PvE'de gerek yoksa; alıcı/satıcı ekonomisi) |
| Ö10 | Ses politikası (askeri sonuç anı sesleri): varsayılan kapalı, opt-in mi? Belgelerde ses politikası yok | Kapalı, ayarlardan açılır; her sese görsel eşdeğer |
| Ö11 | E eğlence artısı (hazır emir, tur dökümü, şerit/kitabe/unvan) Alfa-0 0b ile birlikte mi, sonra mı? | E2 (tur dökümü) 0b ile; E1 ve E3 0b sonrası ilk iyileştirme dilimi |

---

## 10. Kaynaklar

Erişim tarihi: 1 Ekim 2026. **(arama özeti)** = sayfa doğrudan okunamadı (HTTP 402) ya da bilgi arama sonucundan alındı. İç belgeler satır içi bağlantıdır.

- [S1] Travian, Oasis: <https://support.travian.com/en/articles/48-oasis>; Early Game Oasis Farming: <https://support.travian.com/en/articles/190-early-game-oasis-farming> (hayvan öldürme ödülü, başlangıç koruması: arama özeti)
- [S2] Travian, yeni oyuncu koruması: <https://unofficialtravian.com/2025/10/beginners-protection/>
- [S3] Rise of Kingdoms, Barbarians: <https://riseofkingdoms.fandom.com/wiki/Barbarians> (arama özeti; sayfa HTTP 402)
- [S4] Rise of Kingdoms, Barbarian Fort Rules: <https://riseofkingdoms.fandom.com/wiki/Barbarians/Fort/Rules> (arama özeti; sayfa HTTP 402); birlik üçgeni: <https://riseofkingdoms.fandom.com/wiki/Troop_Counters>
- [S5] Clash of Clans, Multiplayer Battles (yağma yüzdeleri, Magic Shield): <https://clashofclans.fandom.com/wiki/Multiplayer_Battles> (arama özeti; sayfa HTTP 402); Revenge: <https://www.sportskeeda.com/mobile-games/how-new-revenge-feature-works-clash-clans>
- [S6] Hearts of Iron 4, Logistics: <https://hoi4.paradoxwikis.com/Logistics> (arama özeti); RimWorld, Raid points: <https://rimworldwiki.com/wiki/Raid_points>
- [S7] EVE University, Vulnerability: <https://wiki.eveuniversity.org/Vulnerability>
- [S8] EVE Support, Mutual War: <https://support.eveonline.com/hc/en-us/articles/360005659379-Mutual-War>
- [S9] NME, Foxhole logistics union strike: <https://www.nme.com/news/gaming-news/foxhole-logistics-union-ends-49-day-strike-after-demands-met-3173270>
- [S10] Albion Online Wiki, Territory: <https://wiki.albiononline.com/wiki/Territory>; Open-World Territory Battles (arama özeti)
- [S11] Capital Rift (geliştirici açıklaması, tek kaynak): <https://www.tiktok.com/@niksgames/video/7666487170605026591> **(doğrulanmadı)**
- [S12] Rival Regions, Wars: <https://wiki.rivalregions.com/Wars> (arama özeti; [11 §7.7](../11-urun-donusu.md))
- Kod: `packages/cekirdek/src/askeri/{uretim,savas}.ts`, `mulk/{isletme,yapi,durum,kamu}.ts`, `dugum.ts`, `tipler.ts`, `lojistik/cozum.ts`, `ekonomi/uretim.ts`; veri: `packages/veri/icerik/{icerik,parametreler}.json`; ölçüm: `packages/olcum/src/parsel/{h3,h5}.ts`, [parsel-v0-bulgular](../olcum/parsel-v0-bulgular.md)
- İç: [11](../11-urun-donusu.md) · [12](../12-yon-taslagi.md) · [06 §15](../06-simulasyon-spesifikasyonu.md) · [cesitlilik-yonetim-askeri-teknoloji](cesitlilik-yonetim-askeri-teknoloji.md) · [bilim-teknoloji-askeri](bilim-teknoloji-askeri.md) · [imza-mekanikleri-ve-yonelimler](imza-mekanikleri-ve-yonelimler.md) · [arsa-ve-insa-derinlestirme](arsa-ve-insa-derinlestirme.md) · [kamu-ve-kamu-arazileri](kamu-ve-kamu-arazileri.md) · [rehber-gorevler](rehber-gorevler.md) · [donus-deneyimi](donus-deneyimi.md) · [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md) · [gorsel-kimlik-ve-arayuz](gorsel-kimlik-ve-arayuz.md) · [oyun-kimligi-harman](oyun-kimligi-harman.md) · [perakende-kademeleri](perakende-kademeleri.md) · [capital-rift-mekanikleri](capital-rift-mekanikleri.md) · [argelider-sentez-1](argelider-sentez-1.md)

---

## Ek A: Hesap tabloları (taban fiyat; betikle doğrulandı)

Fiyatlar (₺/birim): gıda 70, çelik 120, parça 180, mühimmat 150, yakıt 100, tahıl 30, elektrik 10. Birlik maaşı ₺8/sa.

| Kalem | Hesap | Sonuç |
|---|---|---|
| Piyade partisi (1) | 30×120 + 20×150 + 30×70 | ₺8.700 |
| Zırhlı partisi (1) | 80×120 + 30×180 + 20×100 | ₺17.000 |
| Topçu partisi (1; öneri girdi) | 50×120 + 40×150 + 10×180 | ₺13.800 |
| Piyade günlük (A) | (2×70 + 0,8×150)×24 + 8×24 | ₺6.432 |
| Piyade günlük (B, ikmal ×0,25) | (2×70 + 0,8×150)×24×0,25 + 192 | ₺1.752 |
| Zırhlı günlük (A / B) | (3×100 + 1,2×150 + 0,5×180)×24 (+192) | ₺13.872 / ₺3.612 |
| Ordugâh | ₺20.000 + 80×120 + 30×180 | ₺35.000 |
| Karakol | ₺4.000 + 20×120 + 8×180 | ₺7.840 |
| Gözetleme Kulesi | ₺2.000 + 10×120 + 5×180 | ₺4.100 |
| 1 mühimmat hattı | 40 birim/sa × 24 | 960/gün (ikmal A: 50 tümen; B: 200 tümen) |
| Tedarik marjı | girdi ₺4.750/40 = ₺118,75; bakım ₺4,5; satış ₺145,5 | ≈ ₺22/birim ≈ %15 (≈%14 işletme dahil) |
| Ganimet (boy k) | 3k mühimmat + 2k yakıt | ₺650×k |

## Ek B: H3 ve H5 parsel koşullarının güncellenmesi (ölçüm notu)

1. `olcum/src/parsel/h3.ts`: `birlik_uret` komutundan önce Ordugâh inşası (35.000 ₺) eklenmeli; hedef güç `hedefGucKapasiteden` ile kapasiteden türetildiği için çarpan değişimi testi gevşetmez, ancak **kurulum maliyeti** botlarda hazine denetiminden geçmeli.
2. `olcum/src/parsel/h5.ts`: akıncı bot yerine **eşkıya baskını** (PvE) ve yağma defteri; paydalar aynı; yeni gösterge "yapı devre dışı ≤%10 yuva".
3. Yeni koşular (AH1–AH11) ve iki ikmal kalibrasyonu (×1,0 ve ×0,25). Beklenti: Hesap A'da M1 savunma haftalık gideri/önlenen kayıp ≈3–5 (AH3 başarısız), Hesap B'de ≈0,9–1,4.

## Ek C: `parametreler.json` `askeri.eskiya` bloğu (öneri)

```jsonc
"askeri": {
  // mevcut alanlar değişmez
  "ikmalCarpaniPpm": 250000,               // yalnız mülk kipi (bölge kipinde 1.000.000)
  "eskiya": {
    "etkin": false,                          // özellik bayrağı (§3.0); kapalıysa mülk kipinde askeri komutlar reddedilir
    "servetEsigiMili": 250000000,            // ₺250.000 (mili-para: ₺1 = 1.000)
    "servetAdimiMili": 250000000,
    "enCokBoy": 8,
    "boyGucu": 100,
    "gunlukOlasilikPpm": 333333,
    "beklemeGun": 4,
    "bantBaslangicSaat": 19, "dilimSayisi": 4, "dilimSaat": 1,
    "planlamaOncesiGun": 2,
    "duyuruSaat": 24, "kuleEkiSaat": 12,
    "tahminAltPpm": 750000, "tahminUstPpm": 1250000,
    "kuleTahminAltPpm": 900000, "kuleTahminUstPpm": 1100000,
    "nobetEviGuc": 100,
    "karakolGuc": [100, 50],
    "yagmaOraniPpm": 100000,               // tek baskın, ilçe payıyla çarpılır
    "yagmaPenceresiSaat": 24,
    "yapiDevreDisiPpm": 100000, "yapiDevreDisiSaat": 24,
    "yenilgiKayipPpm": 150000, "galibiyetKayipPpm": 0,
    "reviriGeriPpm": 400000, "reviriGeriSaat": 24,
    "kalkanSonrasiYagmaPpm": 50000,        // 15–28. gün
    "ganimetKatkiAltPpm": 100000,
    "ganimet": { "muhimmatMiliBoyBasina": 3000, "yakitMiliBoyBasina": 2000 },
    "ilceHaftalikGanimetTavaniMili": 6500000       // ₺6.500 taban değer (mili-para)
  }
},
"mulk": { "ekYapilar": {
  "ordugah": { "ad": "Ordugâh", "yuva": 3, "insaSaati": 12, "insaParasi": 20000000,
              "insaMaliyeti": { "celik": 80000, "parca": 30000 }, "enFazlaIlBasina": 2, "birlikKapasitesi": 12 },
  "karakol": { "ad": "Karakol", "yuva": 1, "insaSaati": 4, "insaParasi": 4000000,
              "insaMaliyeti": { "celik": 20000, "parca": 8000 }, "enFazlaIlBasina": 2, "nobetciGucu": 100,
              "ikmal": { "gida": 100 } },
  "gozetleme_kulesi": { "ad": "Gözetleme Kulesi", "yuva": 1, "insaSaati": 3, "insaParasi": 2000000,
              "insaMaliyeti": { "celik": 10000, "parca": 5000 }, "enFazlaIlBasina": 1, "duyuruEkiSaat": 12 }
}}
```

(Mili-para: ₺1 = 1.000 mili-para; mevcut `insaParasi: 6000000` = ₺6.000 (Çiftlik). Değerler öneridir; `veri` şeması ve doğrulayıcı alan adlarıyla birlikte son hâle getirilir.)
