# 10 — Önceliklendirilmiş Görev Listesi

> **Güncelleme anı:** 1 Ekim 2026 sabahı. Durum sütunu git geçmişinden (son commit `7284535`), [docs/09](09-sabah-raporu.md) gece günlüğünden ve [06 §11–12](06-simulasyon-spesifikasyonu.md)'den çıkarılmıştır. **"Devam ediyor (sabah)" = çalışma ağacında yazılıyor, commit'siz.** Bu belge kod içermez; sayılar, başka kaynak gösterilmedikçe docs/00–08 ve araştırma raporlarından alınmıştır. Kaynağı olmayan her sayı **(tahmin)** ya da **(hedef)** diye işaretlidir.

> **Güncelleme (1 Ekim akşam): Sprint A0-02.** Güncel durum yalnız [§5A](#5a-sprint-a0-02-alfa-0-yolu-birinci-dalga-1-ekim-akşam) tablosundaki "Durum" sütunundadır. §1.1 sayımları ve §5.0–5.2 öğleden sonranın görüntüsüdür; yeniden sayılmadı.

> **Güncelleme (1 Ekim öğleden sonra): ürün dönüşü.** Sahip oyunun yönünü değiştirdi: baştan paylaşılan kalıcı dünya, ilçede arsa ile başlangıç, bölge → il → ilçe → arsa derinliği, inşa süreci, 3D yürüyüş, sakin görsel ve arka plan lojistik ([00 K23–K35](00-vizyon-ve-kararlar.md), ADR: [11](11-urun-donusu.md)). Bu belgeye **yedi yeni epik (E18–E24)** ve Sprint 1 görevleri (S1–S9, "Devam ediyor") eklendi. Yeni plana göre geçersiz kalan eski görevlerin durumu **"Değişti"** yapıldı ve açıklamalarına "Değişti: docs/11'e bakın" notu düşüldü. Sabahki "Devam ediyor (sabah)" satırları güncellendi: Pazar v1 (E8-G1…G4, `1a7fe08`) ve komut çubuğu (E10-G1, `be830dc`) tamamlandı; v0.3 ölçümü (E12-G1) worktree'de sürüyor. Aşağıdaki sabah özeti tarihsel kayıttır.

## 1. Özet

**1 Ekim öğleden sonra: ürün dönüşü.** Hedef artık en kısa sürede çevrimiçi, hesaplı kapalı alfa **Alfa-0**'dır (Kocaeli + Sakarya + Bursa, ≤200 davetli; döngü: arsa al → yapı kur → üret → sat). Kritik yol: **E18-G1 serileştirici → E20 mülk modeli → E21 istemci entegrasyonu → E24 Alfa-0**. Toplam **207 görevin 32'si tamamlandı, 11'i devam ediyor (Sprint 1'in 10 görevi + v0.3 ölçümü), 31'i "Değişti" (yeni plana göre geçersiz ya da yeni epiğe taşındı), 133'ü yapılacak.** Yeni üç hedef: (1) Sprint 1'i bitir: serileştirici, OSM hiyerarşisi, Gebze karo denemesi, sakin görsel, MapLibre hücre seçimi, mülk sözleşmesi ve parsel fikstürü; (2) Sprint 2'de botları parsel kipine taşı ve mülk modelini istemciye bağla; (3) Alfa-0 kapısını geç ([04 §9.2](04-yol-haritasi.md#92-alfa-0-kapısı-davetlilere-açmadan-önce)).

**1 Ekim sabahı itibarıyla nerede duruyoruz.** Gece planı büyük ölçüde commit'li: gerçek Karadeniz dilimi (53 bölge, 143 kenar, 4 kurgusal devlet) veri hattı, tarayıcıda koşan 3D küre (stilize Dünya, gerçek bölgeler, GPU akış parçacıkları, gezen kamera, kapsam/neden görünümü, tarım ve iklim görselleştirmesi; tek HTML 332 KB gzip, 11–12 çizim çağrısı), **Tarım v1** (E4: iklim takvimi, toprak ve ekim, iklim olayları, gübre, hayvancılık, sulama) ve **Sanayi v1** (E5: elektrik/brownout, ölçek, bakım/aşınma, kirlilik, damar tükenmesi ve sondaj); ölçüm takımı gerçek harita ve iklim takvimi destekliyor. Toplam **136 görevin 27'si tamamlandı, 6'sı sabah işinde, 103'ü yapılacak.** Sabah işleri: **Pazar v1** (E8-G1…G4) çekirdekte yazılıyor, **komut çubuğu/oynanabilirlik** (E10-G1) istemcide yazılıyor, **v0.3 tam ölçüm** (E12-G1: gerçek harita, 3 tohum) koşuyor. Kapı 2 hâlâ **geçilmedi** (H1 ve H7 v0.1'de kalıyor, H2/H3/H6 belirsiz; [05](05-ilk-olcum-raporu.md)) ve yeni üç katmanla ilk tam ölçüm v0.3'ten gelecek. Henüz yok: Devlet, Lojistik, Teknoloji (B4–B6), oynanabilir komut arayüzü ve onboarding, Katman B (yakın plan) ve çok oyunculu sunucu; sınır/ODbL gibi sahip kararları açık.

**Önümüzdeki 3 hedef.**
1. **Oynanabilir 3D küre:** komut çubuğu ve onboarding (E10), gezen kamera üstüne kalan görsel/erişilebilirlik işleri (E1-G7…G9), performansın gerçek cihazda ölçümü (E14-G3…).
2. **Kalan üç katmanın çekirdekte tamamlanması ve ölçülmesi:** Pazar'ı bitir ve ölç (E8), ardından Devlet (E9), Lojistik (E6), Teknoloji (E7); her adımda H1/H2/H7 regresyonu (E12).
3. **Karar kapılarını kapatmak:** sınır/isim politikası, ODbL (yakın plan verisi), teknoloji düğüm sayısı, çok oyunculu zamanlaması (bölüm 4); ardından H4 insan testi ve Katman B spike'ı.

### 1.1 Sayımlar

| Epik | Görev | P0 | P1 | P2 | Tamamlandı | Devam ediyor | Değişti | Yapılacak |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| E1 3D Dünya (A) | 11 | 5 | 4 | 1 | 7 | 1 | 1 | 2 |
| E2 3D Yakın Plan (B) — Değişti | 9 | 0 | 7 | 2 | 0 | 0 | 9 | 0 |
| E3 Veri hattı | 9 | 2 | 3 | 3 | 3 | 0 | 0 | 6 |
| E4 Tarım | 8 | 4 | 3 | 1 | 6 | 0 | 0 | 2 |
| E5 Sanayi | 8 | 4 | 3 | 1 | 6 | 0 | 0 | 2 |
| E6 Lojistik (arka plan) | 7 | 0 | 5 | 2 | 0 | 0 | 2 | 5 |
| E7 Teknoloji | 6 | 0 | 5 | 1 | 0 | 0 | 0 | 6 |
| E8 Pazar | 8 | 2 | 3 | 3 | 4 | 0 | 0 | 4 |
| E9 Devlet | 10 | 2 | 7 | 1 | 0 | 0 | 1 | 9 |
| E10 Komut arayüzü | 8 | 2 | 5 | 1 | 1 | 0 | 3 | 4 |
| E11 Çok oyunculu — Değişti | 8 | 0 | 6 | 2 | 0 | 0 | 8 | 0 |
| E12 Denge ve ölçüm | 13 | 3 | 8 | 1 | 1 | 2 | 4 | 6 |
| E13 Gerçekçilik | 8 | 0 | 4 | 4 | 0 | 0 | 0 | 8 |
| E14 Performans | 8 | 2 | 5 | 1 | 2 | 0 | 1 | 5 |
| E15 Hukuk ve lisans | 7 | 1 | 6 | 0 | 0 | 0 | 2 | 5 |
| E16 Gelir ilkeleri | 3 | 0 | 0 | 3 | 0 | 0 | 0 | 3 |
| E17 Pürüzler | 8 | 1 | 5 | 1 | 2 | 0 | 0 | 6 |
| **E18 Sunucu ve kalıcılık** (yeni) | 9 | 6 | 3 | 0 | 0 | 3 | 0 | 6 |
| **E19 OSM ve arsa ızgarası** (yeni) | 9 | 6 | 2 | 1 | 0 | 2 | 0 | 7 |
| **E20 Mülk modeli** (yeni) | 11 | 8 | 3 | 0 | 0 | 2 | 0 | 9 |
| **E21 Drill-down ve inşa** (yeni) | 12 | 7 | 5 | 0 | 0 | 1 | 0 | 11 |
| **E22 Yürüyüş** (yeni) | 8 | 0 | 7 | 1 | 0 | 0 | 0 | 8 |
| **E23 Yönetişim** (yeni) | 9 | 0 | 7 | 2 | 0 | 0 | 0 | 9 |
| **E24 Alfa operasyonları** (yeni) | 10 | 7 | 3 | 0 | 0 | 0 | 0 | 10 |
| **Toplam (24 epik)** | **207** | **62** | **109** | **32** | **32** | **11** | **31** | **133** |

*Not: yalnız G0 satırlarının (geçmiş iş) önceliği "—" yazılmıştır ve P toplamlarına girmez; sonradan tamamlanan görevler önceliğini korur ve P toplamlarında sayılır. Sayımlar bir betikle satırlardan türetilip doğrulanmıştır. **1 Ekim öğleden sonra:** önceki tablo 136 görev / 27 tamamlandı / 6 devam (sabah) / 103 yapılacak idi; 71 yeni görev eklendi (E18–E24: 68, E1-G10, E12-G11, E12-G12), 31 eski görev "Değişti" oldu, 5 sabah görevi tamamlandı.*

### 1.2 Okuma kılavuzu

| Alan | Değerler |
|---|---|
| **Öncelik** | **P0:** sıradaki işi bloke eden ya da kapı/karar kritiği, ilk sprint adayı. **P1:** prototip v1 için gerekli. **P2:** sonraya bırakılabilir ya da koşullu. |
| **Boyut (tahmin)** | **S** ≤ 2 gün · **M** 3–5 gün · **L** 1–2 hafta · **XL** > 2 hafta (ajan takımı çalışma günü; ölçülmedi, tahmindir). |
| **Durum** | **Tamamlandı** (commit'li ya da doğrulanmış) · **Devam ediyor** (Sprint 1'de bir ajanda yazılıyor ya da worktree'de koşan ölçüm; commit'siz) · **Değişti** (1 Ekim ürün dönüşüyle geçersiz kaldı ya da yeni epiğe taşındı; açıklamada hedef görev yazılı, ayrıntı [11](11-urun-donusu.md)) · **Yapılacak**. |
| **Faz B eşlemesi** | E4 = B1 Tarım · E5 = B2 Sanayi · E8 = B3 Pazar · E9 = B4 Devlet · E6 = B5 Lojistik · E7 = B6 Teknoloji ([08 §7](08-alti-katman.md#7-faz-b-uygulama-sırası)). Uygulama sırası B1→B6'dır; epik numaraları bu sırayı izlemez. |
| **Çekirdek kuralı** | `packages/cekirdek` aynı anda tek uygulayıcı ajanda; sözleşme (tipler.ts) değişiklikleri takım liderinde (gece planı). |
| **Faz eşlemesi (1 Ekim)** | F0 = E1-G10 · F1 = E18 · F2 = E19 · F3 = E20 · F4 = E21 · F5 = E22 · F6 = E23 · F7 = E24 ([11 §5](11-urun-donusu.md#5-fazlar-f0f7)). Sprint 1: S1 = E20-G1 · S2 = E18-G1 · S3 = E20-G2 · S4 = E18-G2 + E18-G3 · S5 = E19-G1 · S6 = E19-G2 · S7 = E1-G10 · S8 = E21-G1 · S9 = E12-G11. |

### 1.3 Altı katman tek bakışta: oyuncuya gelen yinelenen kararlar

Amaç, 20–25. gündeki tekrar sıkıntısını (H2) her katmanda ayrı bir yinelenen kararla kırmaktır. Ayrıntı ve sayılar [08](08-alti-katman.md) içindedir; sayıların hepsi başlangıç varsayımıdır, kalibre edilmemiştir. **1 Ekim durumu:** Tarım ve Sanayi v1'de oyundadır (commit'li); Pazar sabah yazılıyor; Devlet, Lojistik ve Teknoloji yapılacak.

| Katman | Epik | v0.2 başlangıcı (kod) | v1'de eklenen yinelenen kararlar | Bağlandığı katmanlar |
|---|---|---|---|---|
| Tarım | E4 | `ciftlik` + `gida_fabrikasi`, 3 yöntem | toprak yorgunluğu ve ekim karışımı, iklim takvimi (12 ay hasat eğrisi), yayılan iklim olayları, gübre dozu, hayvancılık, sulama | Sanayi (gübre, kirlilik), Lojistik (gıda), Devlet (sübvansiyon), iklim |
| Sanayi | E5 | 17 yöntem, 12 tesis türü, tükenmeyen damarlar | elektrik ve brownout, ölçek S/M/L, bakım ve aşınma, kirlilik, damar tükenmesi ve keşif sondajı | Tarım (gübre), Lojistik (yakıt), Devlet (teşvik, kirlilik) |
| Lojistik | E6 | min-maliyet akış, tek `kapasiteSaat` | filo kapasitesi ≠ yol kapasitesi, taşıma yakıtı, mevsimsel kenar (buz, kapanan geçit), depo | iklim, Sanayi, Pazar, Devlet (seferberlik) |
| Teknoloji | E7 | 6 düğüm, tek kuyruk | ≈ 17 düğüm, sürekli araştırma bütçesi (2 slot), karşılıklı dışlayan dallar, anlaşmalı yayılım | hepsine "yöntem açar" (yüzde vermez) |
| Pazar | E8 | tek küresel NPC pazar, 1,1× / 0,9× çarpan | liman primi (= taşıma maliyeti farkı), açıkça işaretli NPC piyasa yapıcı ve makas, komisyon/tarife, kıtlık cezası | Lojistik (kapsam), Devlet (tarife, vergi) |
| **Devlet** (karma, yönetici) | E9 | nüfus büyümesi, `vergi_ayarla`, anlaşma/yaptırım, savaş | 3 ihtiyaç kademesi, istikrar, göç, 7 bedelli yasa, 3 bütçe kolu, askeri ve diplomasi bağları | **tüm katmanları** yasa ve bütçe kollarıyla yönetir: tarım sübvansiyonu, sanayi teşviki, tarife, araştırma bütçesi, seferberlik, enerji önceliği |

---

## 2. Epik listesi

| Epik | Başlık | Hedef çıktı | Öncelik ağırlığı |
|---|---|---|---|
| **E1** | 3D Dünya: Katman A (stilize küre, three.js) | Dolaşılabilir küre, bölge/akış/kapsam görünümü | P0 |
| **E2** | 3D Yakın Plan: Katman B (MapLibre, PMTiles, binalar, kamyonlar) — **Değişti: docs/11'e bakın** (→ E19, E21, E22) | Bölgeye yaklaşınca yollar, tesisler, konvoylar | P1 |
| **E3** | Gerçek Dünya Veri Hattı ve tüm dünyaya genişleme | Doğrulanmış gerçek dilim, kaynaklı veri, dünya görsel katmanı | P0 |
| **E4** | Tarım (B1) | İklim takvimi, toprak, olaylar, gübre | P0 |
| **E5** | Sanayi (B2) | Elektrik, aşınma, kirlilik, damar tükenmesi | P0 |
| **E6** | Lojistik (B5) — **arka planda, ertelendi (K29)** | Filo, yakıt, iklim kenarı, depo | P1 |
| **E7** | Teknoloji (B6) | ≈ 17 düğüm, bütçe, dışlayan dallar | P1 |
| **E8** | Pazar (B3) | Liman primi, NPC makası, tarife, kıtlık | P0–P1 |
| **E9** | Devlet (B4) — **il hükümetine taşınır (→ E23)** | İhtiyaç, istikrar, göç, yasa, bütçe | P0–P1 |
| **E10** | Oyuncu Etkileşimi ve Komut Arayüzü | 3D istemcide oynanabilirlik, onboarding | P0 |
| **E11** | Çok Oyunculu Sunucu — **Değişti: docs/11'e bakın** (→ E18, E20, E24) | Olay kaynaklı yetkili sunucu, WebSocket, Postgres | P1 |
| **E12** | Denge ve Ölçüm | H1–H7, H4 insan testi, 10 tohum, duyarlılık | P0–P1 |
| **E13** | Gerçekçilik İçerikleri | İklim olayları, damarlar, limanlar, tesisler (açık veri) | P1 |
| **E14** | Performans ve Mobil | Bütçe, cihaz testi, kalite kademeleri | P0–P1 |
| **E15** | Hukuk, Lisans ve Sınır Politikası | Onaylı politika, atıf, ODbL kararı | P0–P1 |
| **E16** | Gelir Modeli İlkeleri (prototip dışı) | İlke belgesi, pay-to-win testi | P2 |
| **E17** | Pürüzler, Teknik Borç ve Belge Bakımı | Commit/CI, bilinen sınırlar, belge tutarlılığı | P0–P1 |
| **E18** | Sunucu ve kalıcılık (F1) — yeni | Serileştirici, ws sunucusu, Postgres günlük + anlık görüntü, ilgi alanı, hesaplar, kural dönemleri | P0 |
| **E19** | OSM hiyerarşi ve arsa ızgarası (F2) — yeni | İl/ilçe ağacı, il→bölge eşlemesi, z20 hücre uygunluğu, PMTiles, ODbL uyumu | P0 |
| **E20** | Mülk modeli (çekirdek) (F3) — yeni | İşletme düğümü, parsel, 18 yapı, inşa süreci, arazi vergisi, hareketsizlik, yeni oyuncu paketi | P0 |
| **E21** | MapLibre drill-down ve inşa modu (F4) — yeni | L1–L3 harita, hücre seçimi ve satın alma, inşa modu, Giriş / Yerleş, socket bağdaştırıcısı | P0 |
| **E22** | Yürüyüş modu (F5) — yeni | three.js sokak sahnesi, kinematik kontrolcü, CC0 karakter, mini harita | P1 |
| **E23** | Yönetişim ve seçimler (F6) — yeni | İl hükümeti, muhtar ve vali seçimi, yasa etkileri, hafif askeri, H5 korumaları | P1 |
| **E24** | Alfa operasyonları (F7) — yeni | Altyapı, yedek ve tatbikat, metrikler, yük testi, yönetici paneli, atıf, davetli kohort | P0–P1 |

---

## 3. Görevler

### E1 — 3D Dünya: Katman A (stilize küre)

> **Güncelleme (1 Ekim, K26, K29).** Küre artık L0 görünüm düzeyidir (bölge renkleri + bölge başına tek rozet). Akış şeritleri ve parçacıklar F0'da kalkar (E1-G10). Ayrıntı: [11](11-urun-donusu.md).

**Yığın:** yalnız three.js (185 KB gzip tam paket, MIT); düşük çokgenli küre, birleştirilmiş bölge ağları, shader ile kayan büyük daire yayları, `InstancedMesh`; **hedef** < 40 çizim çağrısı ([arastirma/3d-teknoloji](arastirma/3d-teknoloji.md) §2). Simülasyon tarayıcıda Web Worker'da koşar. **Sabah durumu:** `packages/istemci` commit'li (`aa1b8ac`, `04d66ef`): küre, gerçek bölge katmanı, GPU akış şeritleri, kamera, panel, worker, tarım/iklim görünümü. Tek HTML 332 KB gzip, 11–12 çizim çağrısı (docs/09). Komut arayüzü yoktur (yalnız "yakında" yer tutucusu; E10-G1 sabah yazılıyor).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E1-G0 | 2D inceleme sayfası | `pnpm izle` tek dosyalık 2D görünüm, hata ayıklama aracı olarak kalır. | `izleyici.html` üretilir | — | M | — | Tamamlandı |
| E1-G1 | Küre MVP | Stilize küre, sahip renkli bölge çokgenleri, shader akış yayları, tıkla-seç paneli, zaman kontrolleri; sim Web Worker'da, botlar oynar. **Tamamlandı: commit `aa1b8ac`; tek HTML 332 KB gzip, 11–12 çizim çağrısı ([09](09-sabah-raporu.md)).** **Not (1 Ekim): akış yayları F0'da kalkar (E1-G10).** | `pnpm dunya` tek HTML üretir; 53 bölge renklenir; bot koşusunda akış yayları görünür; masaüstü ve mobil ekran görüntüsü alınır | E3-G1 | L | P0 | Tamamlandı |
| E1-G2 | Gerçek dilimin istemciye bağlanması | Geçici Natural Earth çokgenleri yerine `gercek-karadeniz-sinirlar.topo.json` (nesne `bolgeler`) ve bölge adları; atıf alanı görünür. **Tamamlandı: commit `aa1b8ac`.** | Haritadaki 53 bölgenin hepsi kimliğiyle eşleşir; sentetik harita da yüklenir | E3-G1, E1-G1 | S | P0 | Tamamlandı |
| E1-G3 | Gezen kamera | Yörünge + serbest uçuş, bölgeye uçuş, dokunmatik; oyuncunun "içinde dolaşması". **Tamamlandı: commit `aa1b8ac` (sürükle, yakınlaş, çift tıkla uç, WASD).** | Masaüstü ve dokunmatikte iki mod çalışır; bölgeye uçuş sırasında çizim çağrısı bütçe içinde (E14-G2) | E1-G1 | M | P0 | Tamamlandı |
| E1-G4 | Kapsam görünümü ("neresi açık ve neden") | 3 boyutta U1–U7: 3–4 durum, kenar genişliği = kapasite, renk = kullanım, neden glifi, tıkla → tek satır neden, darboğaz tırmanışı. **Tamamlandı: istemcide kapsam/neden görünümü var (`aa1b8ac`); B5 neden sınıfları E6-G5'te, H4 senaryoları E12-G6'da eklenecek.** **Not (1 Ekim): F0 ile kenar/akış görünümü kalkar; oyuncuya kapsam ▲ rozeti ve Dikkat paneliyle ulaşır (E1-G10).** | Çekirdeğin neden sınıflarının (`kapasite`, `girdi_eksik`, `mesafe`, `erisim_yok`; B5 sonrası +3) hepsi görünür; renk körü ikinci kanal var; H4 protokolüne hazır 3 senaryo | E1-G1, E12-G6 | L | P0 | Tamamlandı |
| E1-G5 | Görsel dil ve ışık | Gün/gece terminatörü, atmosfer, koyu/açık tema, LOD'lu etiketler, liman ve bölge simgeleri. **Tamamlandı (kodda doğrulandı): gün/gece terminatörü, açık/koyu tema belirteçleri, simgeler (`aa1b8ac`).** | Açık ve koyu temada ekran görüntüleri; etiketler yakınlığa göre açılıp kapanır | E1-G1 | M | P1 | Tamamlandı |
| E1-G6 | İklim takvimi ve olayların görünümü | Aylık kar/buz örtüsü, kuraklık/don/sel uyarı halkası, uyarı süresi sayacı. **Tamamlandı v1: hasat ritmi, iklim olayı simgeleri ve Olaylar sekmesi (`04d66ef`); aylık kar/buz örtüsü yapılmadı (kutup buzulu sabittir).** | Ay değişince örtü değişir; bir olayın uyarı → etki → bitiş evreleri küre üzerinde izlenir | E4-G1, E4-G3 | M | P1 | Tamamlandı |
| E1-G7 | Devlet ve savaş göstergeleri | Göç okları, savaş penceresinde sınır nabzı, anlaşma bağları, ışık yoğunluğu = nüfus ([08 §6.1](08-alti-katman.md)). **Değişti: docs/11'e bakın** (K29 sakin görsel; göç, savaş ve anlaşma bilgisi Devlet merceğinde ve E23-G7 ekranında). | Üç gösterge sim olaylarından beslenir; kapalıyken çizim çağrısı artmaz | E9-G3, E9-G6 | M | P2 | Değişti |
| E1-G8 | Erişilebilirlik ve metin | Renk körü paleti, klavye kontrolü, panel metinleri ekran okuyucuya uygun, tüm metin Türkçe. | Renk körü simülasyonunda durumlar ayırt edilir; tüm panel klavyeyle gezilebilir | E1-G1 | M | P1 | Yapılacak |
| E1-G9 | Yayın ve sürümleme | Tek HTML / artifact yayını, sürüm etiketi ve atıf ekranına bağlantı. | Her yayın sürüm etiketli ve atıf ekranı bağlı | E15-G2 | S | P1 | Yapılacak |
| E1-G10 | F0 sakin görsel, rozetler ve Dikkat paneli (S7) | `kure/sahne.ts` akış şeritlerini ve parçacıkları kurmaz; `Kare.akislar`/`kenarlar` ile `kenar_gelistir`/`askeri_rezerv` formları kalkar; hız düğmeleri hata ayıklama menüsüne, atıf "ⓘ"ye; ▲ ◯ ✓ rozetleri; Darboğaz sekmesinin yerine en çok 5 maddelik Dikkat paneli; tek `tr-TR` sayı biçimleyici. **Yeni (1 Ekim, K29); Sprint 1, istemci ajanı.** | Akış yok; `pnpm kontrol` yeşil; açık/koyu ekran görüntüleri; çizim çağrısı artmıyor | — | M | P0 | Devam ediyor |

### E2 — 3D Yakın Plan: Katman B (MapLibre, PMTiles, binalar, kamyonlar)

> **Değişti: docs/11'e bakın.** Bölge yakın planı (MapLibre küre + three.js özel katmanı + kamyonlar) yerine il → ilçe → arsa kademeleri (**E21**, MapLibre) ve ayrı yürüyüş sahnesi (**E22**) geldi; karo işleri **E19**'a taşındı. Bu epiğin tüm görevleri "Değişti" olarak işaretlidir.

**Yığın önerisi:** MapLibre GL v5+ küre projeksiyonu (285 KB gzip, BSD-3, token yok) + Protomaps PMTiles (pmtiles istemcisi 7,7 KB gzip) + three.js özel katmanı; Cesium, Babylon ve Google 3D Tiles elendi. **Uyarı:** küre modunda özel katmanlar yeni ve az belgelenmiş; Capital Rift'in 3D yığını belgelenmemiş. **Ön koşul:** E15-G3 (ODbL kararı).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E2-G1 | Teknik doğrulama (spike) | MapLibre küre + three.js özel katman + PMTiles tek bölgede; paket boyutu, fps, bellek ölçümü. **Değişti: docs/11'e bakın** (→ E19-G2 Gebze denemesi, E21-G1 MapLibre). | Tek bölgede yakınlaşma çalışır; ilk JS ≤ 2 MB gzip (hedef); ölçüm raporu `docs/olcum/` altında | E1-G1, E15-G3, E14-G1 | M | P1 | Değişti |
| E2-G2 | PMTiles çıkarım hattı | Bölge başına `pmtiles extract` (z0–12 + bina), statik sunum, karo boyutu bütçesi. **Değişti: docs/11'e bakın** (→ E19-G4, E19-G5). | Bir bölgenin karo boyutu ölçülür ve bütçe belgelenir; tembel yükleme | E2-G1 | L | P1 | Değişti |
| E2-G3 | Bina taban alanları | `fill-extrusion` ile bölge ölçeğinde çıkıntılı binalar (sokak ölçeği değil). **Değişti: docs/11'e bakın** (→ E22-G1 yürüyüş sahnesinde bina ekstrüzyonu). | Bir kent bölgesinde bina katmanı 30 fps'in (hedef) altına düşmeden açılır | E2-G2, E15-G3 | L | P2 | Değişti |
| E2-G4 | Tesis model seti | 12 tesis türü için düşük çokgenli özgün model seti (çiftlik, ahır, fabrika, santral, liman...) ve kirlilik/duman göstergesi. **Değişti: docs/11'e bakın** (→ E20-G5 18 yapı içeriği, E22-G6 modeller). | Her tesis türü bir model ve bir durum göstergesi (çalışıyor/duruyor/brownout) ile görünür; varlıklar özgün ya da CC0 | E2-G1, E5-G1 | L | P1 | Değişti |
| E2-G5 | Kamyon ve konvoy akışı | Sim kenar akışından örneklenmiş `InstancedMesh` kamyon/gemi; kare başına örnek tavanı. **Değişti: docs/11'e bakın** (kaldırıldı: lojistik arka planda, kamyon/konvoy görseli yok; K29). | Konvoy sayısı kenarın kullanım değeriyle tutarlı; örnek tavanı aşılınca örnekleme azalır | E2-G1, E6-G1 | L | P1 | Değişti |
| E2-G6 | Küre ↔ yakın plan geçişi | `projectionTransition`, yakınlaştırma eşikleri, bellek temizliği, geri dönüş. **Değişti: docs/11'e bakın** (→ E21-G10 küre L0 ↔ MapLibre L1). | 10 ardışık geçişte bellek sızıntısı yok (Playwright ölçümü) | E2-G1 | M | P1 | Değişti |
| E2-G7 | Yakın planda dolaşma | Yer seviyesine yakın serbest kamera, LOD, görüş alanı kırpması, dokunmatik. **Değişti: docs/11'e bakın** (→ E22 yürüyüş modu). | Kamera modu yakın planda çalışır; çizim çağrısı < 100 (hedef) | E2-G6, E1-G3 | M | P1 | Değişti |
| E2-G8 | Arazi ve yükseklik | Terrarium / Mapterhorn karoları, atıf. **Değişti: docs/11'e bakın** (→ E19-G5 DEM özütü, E22-G2). | Dağ ve geçit bölgelerinde yükseklik görünür; atıf ekranda | E2-G2 | M | P2 | Değişti |
| E2-G9 | Karo ve enterpolasyon işçileri | Karo çözme ve sim enterpolasyonu işçide, paylaşılan `Float32Array`. **Değişti: docs/11'e bakın** (→ E22-G1 worker'da karo çözme). | Ana iş parçacığı kare süresi yakın planda bütçe içinde (E14-G2) | E2-G1 | M | P1 | Değişti |

### E3 — Gerçek Dünya Veri Hattı ve tüm dünyaya genişleme

**Sabah durumu:** `packages/veri-hatti` ve `gercek-karadeniz*.json` commit'li (`42a3b8e`); doğrulama ve tarım alanı türetme tarayıcı için `@bolge/veri/saf` modülüne ayrıldı (`1f03d4c`). Çıktı: 53 bölge, 143 kenar (101 kara, 38 deniz, 4 hava), 4 kurgusal devlet (2 blok), 27 liman etiketli bölge; İstanbul ve Çanakkale dar geçit; Şipka ve Kafkas dağ geçitleri; `DATA_SOURCES.md`. Kaynaklar: Natural Earth v5.1.2 (kamu malı), USGS MRDS (kamu malı). **Dürüstlük notu:** kömür/petrol/tahıl/silis rezervleri elle, genel bilgiyle yazılmış tasarım değeridir; bölgeler arası denge bilerek tasarlanmıştır.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E3-G0 | Gerçek harita veri sözleşmesi | `BolgeTanimi.konum`, `sinirDosyasi`, `atif` alanları. | Şemadan geçer (commit `f018575`) | — | S | — | Tamamlandı |
| E3-G1 | Karadeniz dilimi hattı | Natural Earth admin-1 → 53 oyun bölgesi; komşuluk, deniz kenarları, limanlar, rezerv ve nüfus; deterministik ve sha256 kilitli. **Tamamlandı: commit `42a3b8e`.** | `dogrulaVeriPaketi` geçer; ≥ 2 dar geçit; aynı girdi → bayt bayt aynı çıktı (test); `DATA_SOURCES.md` güncel | E15-G1 | L | P0 | Tamamlandı |
| E3-G2 | Gerçek haritada sim ve ölçüm sağlığı | Gerçek haritada sim + botlar çalışsın; sentetik haritayla yan yana karşılaştırma. **Tamamlandı: `--harita gercek` ve `--iklim hizli|gercek` (`f8fcd45`); bölgesel sapma raporu v0.3 koşusunda (E12-G1).** | `pnpm olcum --hip H1,H2,H7 --tohum 1 --hizli` gerçek haritada çalışır; bölgesel sapmalar (ör. çözüm süresi, israf) raporlanır | E3-G1 | M | P0 | Tamamlandı |
| E3-G3 | Tarım alan verisi | `toprakTabanPpm`, `iklimTipi`, `sulanabilirPpm`, `tarimTesisTavani`: GAEZ (CC BY) + CHELSA (CC0) + SoilGrids (CC BY) zonal istatistik. **Kısmi: alanlar şimdilik `@bolge/veri/saf` yerel türetmesiyle doluyor (`1f03d4c`); GAEZ/CHELSA/SoilGrids zonal istatistiği yapılmadı.** | 53 bölgenin hepsinde alanlar dolu; kaynak ve dönüşüm kuralı DATA_SOURCES'te | E4-G1, E3-G1 | L | P1 | Yapılacak |
| E3-G4 | Liman verisi | `LimanTanimi` (dünya kapısı, dünya mesafesi saat, kapasite sınıfı). NGA WPI bu ortamda HTTP 403 verdi; Natural Earth ports + elle eklenen 5 liman kullanıldı. | 2–4 dünya kapısı; her liman bölgesinde `dunyaMesafeSaat` hesaplı; WPI erişimi çözülürse karşılaştırma | E8-G1 | M | P1 | Yapılacak |
| E3-G5 | Nüfus verisi | Natural Earth `pop_max` ölçekli göstergesi yerine WorldPop veya GHSL (CC BY) zonal toplamı. | Bölge nüfusu raster toplamından gelir; ölçek kuralı belgelenir | E3-G1 | M | P2 | Yapılacak |
| E3-G6 | Kenar iklim profilleri | Dağ geçitleri ve Karadeniz/Marmara için 12 aylık kenar çarpanı (CHELSA + yükseklik). | Profilli kenarlar yalnız kış aylarında kapanma eğilimi gösterir | E6-G3, E3-G1 | M | P2 | Yapılacak |
| E3-G7 | Tüm dünya görsel katmanı | NE admin-1 (4 596 nesne) sadeleştirilip tembel yüklenir; oyun dışı bölgeler soluk; oyun bölgesi ≠ görsel bölge. | Dünya topolojisi ilk JS'ye girmez; yükleme sonrası gzip boyutu ölçülür (hedef 1,5–4 MB, tahmin) | E1-G1 | L | P1 | Yapılacak |
| E3-G8 | İkinci ve sonraki oyun dilimleri | Dilim seçimi (sahip kararı), hat yapılandırması, 3–4 devlet, ≥ 2 dar geçit; çok dilimli dünyada sim ölçeği testi. **Not (1 Ekim): Balkanlar Alfa-1'de il/ilçe düzeyinde açılır (E19-G7, E24-G10).** | Yeni dilim aynı biçimle yüklenir; 100+ bölgede 30 günlük koşu süresi ölçülür (E14-G4) | Karar §4-2, E14-G4 | XL | P2 | Yapılacak |

### E4 — Tarım (Faz B1)

**Spesifikasyon:** [08 §1, B1](08-alti-katman.md#1-tarım) (tamamlandı; kalibre edilmemiş). **Sabah durumu:** B1 çekirdek uygulaması commit'li (`1385465`, kurallar [06 §11](06-simulasyon-spesifikasyonu.md)); G1–G6 tamamlandı, 555 test yeşil, kapalıyken v0.2 ile birebir. Ölçüm ve kalibrasyon (G7, G8) yapılacak.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E4-G1 | İklim takvimi ve olay akışı | `takvimGunu`, 12 ay doğrusal enterpolasyon, `iklim_gunluk` olayı, `gunCarpani`, `olay` PRNG akışı. Takvim sezon değil sürekli zaman eğrisidir (K21). **Tamamlandı: B1 commit `1385465` (G1–G6); kuralları [06 §11](06-simulasyon-spesifikasyonu.md).** | Her eğrinin 365 gün ortalaması PPM ± 1 000; aynı tohum → aynı özet (30 ve 400 gün); uyuyan bölge iklim/toprak tikinde donar | — | M | P0 | Tamamlandı |
| E4-G2 | Toprak verimliliği ve ekim planı | `ekim_plani` (buğday, baklagil, nadas), günlük toprak değişimi. **Tamamlandı: `1385465`.** | 30 günlük 4 botlu koşuda toprak ∈ [300 000, 1 000 000] ppm; regresyon kalkanı (`ekimPpm=[PPM,0,0]` → v0.2 birebir) | E4-G1 | M | P0 | Tamamlandı |
| E4-G3 | Yayılan iklim olayları | Kuraklık, don, sel, kış fırtınası; uyarı süresi; komşu bölgeye deterministik yayılma. **Tamamlandı: `1385465`.** | İki koşu birebir aynı olay listesi; olay olasılığı 0 iken v0.2 birebir | E4-G1 | M | P0 | Tamamlandı |
| E4-G4 | Gübre dozu | `gubre` malı, `gubre_dozu` komutu, toprak ve çıktıya etkisi; fabrika B2'de gelir. **Tamamlandı: `1385465`.** | Doz 0..azami aralığında; gübre stoku tüketilir; doz = 0 iken v0.2 birebir | E4-G2, E5-G6 | M | P1 | Tamamlandı |
| E4-G5 | Hayvancılık | Ahır ve mera tesisleri; gıda ve yem bağı. **Tamamlandı: `1385465`.** | Ahır ve mera tesis tavanı (`tarimTesisTavani`) içinde; gıda zinciri testi | E4-G2 | M | P1 | Tamamlandı |
| E4-G6 | Sulama | `sulama_kanali` tesisi ve `sulama_sistemi` teknolojisi; kuraklık koruması (yakıtla, B2'de elektriğe). **Tamamlandı: `1385465`.** | Sulama açıkken kuraklık kaybı azalır (birim test); teknoloji ağına girer | E4-G3, E7-G1 | M | P1 | Tamamlandı |
| E4-G7 | Tarım ölçümü ve kalibrasyon | 12 ay için `gunCarpani = 12` ve 12 başlangıç ayı koşuları; H2, H1, lavabo/gelir, H5 kontrolü. | H2 tekrar ≤ %60 ve kalıcı sıfır karar günü yok; H1 ilk üç ≤ %70; lavabo/gelir 0,30–0,63; H5 ≤ %25; 30 günlük koşu ≤ v0.2 × 1,15 | E4-G1…G6, E12-G1 | M | P0 | Yapılacak |
| E4-G8 | Tahıl bozulması ve kış depolaması | Tahıl %1/gün bozulur; ambarla kışa kadar depolama mümkün mü? ([08 §8-1](08-alti-katman.md#8-açık-sorular-ve-riskler)). | Ölçüm raporu; gerekirse `bozulmaMallari` çarpanı (v0.1 kalibrasyonunu bozma riski not edilir) | E4-G7 | S | P2 | Yapılacak |

### E5 — Sanayi (Faz B2)

**Spesifikasyon:** [08 §2, B2](08-alti-katman.md#2-sanayi). **Sabah durumu:** G1–G6 commit'li (`ee4ee50`; kurallar ve 08'den sapmalar [06 §12](06-simulasyon-spesifikasyonu.md)); ölçüm (G7) yapılacak. Çekirdeğe giren yeni komutlar: `tesis_olcek_yukselt`, `genel_onarim`, `bakim_duzeyi`, `arama_sondaji`. **Bağımlılık:** B1.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E5-G1 | Elektrik malı ve brownout | `enerji` kategorisi, santral, iki geçişli hesap, enerji önceliği; elektrik stoklanmaz, taşınmaz, bölge içidir. **Tamamlandı: B2 commit `ee4ee50` (G1–G6); kuralları [06 §12](06-simulasyon-spesifikasyonu.md).** | Brownout günü ≤ %5 (bot koşusu); "elektrik stoklanmaz/taşınmaz" invariantı; kapalıyken v0.2 birebir | E4-G1 | L | P0 | Tamamlandı |
| E5-G2 | Çarpan zinciri, bakım ve aşınma | `uretimTabani` (%40) ile birleşik ceza tabanı; bakım düzeyi (asgari/normal/yüksek), genel onarım. **Tamamlandı: `ee4ee50`.** | Aşınma sınırları test; 30. günde toplam ceza tabanının altına inmez | E5-G1 | M | P0 | Tamamlandı |
| E5-G3 | Tesis ölçek kademesi | S/M/L: çıktı, işçi, bakım ve inşa oranları, `gerekliTeknoloji` (L için `otomasyon`). **Tamamlandı: `ee4ee50`.** | Maliyet/işçi/çıktı orantı testi; L ölçekte brownout riski gözlenir | E5-G1 | M | P1 | Tamamlandı |
| E5-G4 | Kirlilik | Emisyon → bölge kirliliği → tarım çıktısı ve istikrar; komşu yayılım. **Tamamlandı: `ee4ee50`.** | Kirlilik dengesi testi; Tarım çarpan zincirine girer | E5-G1, E4-G2 | M | P1 | Tamamlandı |
| E5-G5 | Damar ölçeği, tükenme ve keşif | Damar ölçeği (sentetik `rezervler × 0,4`), görünür tükenme, `arama_sondaji` (07 Ö7). 20–25. gün tekrarını kırması beklenen ana mekanizma. **Tamamlandı: `ee4ee50`.** | Tek tesiste 25. günde %25–45 tükenme (hedef); H2 ≤ %60; H7 168. saat ≥ %50; keşif determinizm testi | E5-G2 | L | P0 | Tamamlandı |
| E5-G6 | Gübre fabrikası ve sulama elektriği | `gubre_fabrikasi` ve `santral` içerikleri; Tarım'daki sulama yakıttan elektriğe geçer. **Tamamlandı: `ee4ee50`.** | Tarım–Sanayi gübre zinciri 30 günlük koşuda çalışır | E5-G1, E4-G4 | S | P1 | Tamamlandı |
| E5-G7 | Sanayi ölçümü ve kalibrasyon | H1/H2/H7 yeniden koşusu, `elektrik_ark` ölü uç kontrolü. | H2 ≤ %60, karar tükenmesi > 0; H1 tür başına en iyi önayar ≥ 4; ark ocağı ≥ 2 bölgede seçilir; H7 [%50, %85]; lavabo/gelir 0,30–0,63 | E5-G1…G5, E12-G1 | M | P0 | Yapılacak |
| E5-G8 | Bölge verim çarpanları (Ö4, koşullu) | Ova ×1,25 tarım, dağ ×1,25 çıkarım, kent ×1,30 işleme; yalnızca H1 hâlâ > %70 ise. | Koşul gerçekleşirse: tür başına en iyi önayar ≥ 4; çarpan ≤ +%30 | E12-G1 | M | P2 | Yapılacak |

### E6 — Lojistik (Faz B5)

> **Değişti: docs/11'e bakın (K29).** Lojistik otomatik ve arka plandadır; oyuncu rota ya da filo kurmaz. MCF yalnız 53 merkez arasında çözülür, il içi havuzlanır (E20-G3). Filo, yakıt ve iklim kenarları Lojistik v1'de **yalnız arka planda** ve Alfa-1 sonrasına ertelendi.

**Spesifikasyon:** [08 §3, B5](08-alti-katman.md#3-lojistik). Derinlik bu katmanda kalır (ana yenilik). Regresyon kalkanı: filo = ∞, iklim çarpanı PPM, yakıt 0 → v0.2 çözümüyle birebir.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E6-G1 | Filo kapasitesi ≠ yol kapasitesi | Oyuncu filo havuzu (kara/deniz/hava konvoy), augment sınırlayıcı, `filo_al`. **Değişti: docs/11'e bakın** (filo otomatik; Garaj yapısı kapasite ekler, E20-G5; `filo_al` oyuncu komutu yok; K29). | Konvoy tavan hesabı ve augment sınırlayıcı testleri; filo = ∞ iken v0.2 birebir; çözüm süresi < v0.2 × 1,2 | E5-G1, E9-G6 | L | P1 | Değişti |
| E6-G2 | Taşıma yakıtı | `yakitKarsilanmaPpm`; yakıt yoksa akış kısılır. | Yakıt kıtlığında akış kısılır (test); kapsam nedeni `yakit_yok` | E6-G1, E5-G1 | M | P1 | Yapılacak |
| E6-G3 | İklim takvimine bağlı kenar çarpanı | Buzlu liman ve kapanan geçit (`iklim_kapali`), kenar profilleri. | `iklim_kapali` yalnız profilli kenarlarda ve kış aylarında görünür | E4-G1, E3-G6 | M | P1 | Yapılacak |
| E6-G4 | Depo ve ara istasyon | Depo yöntemleri: kapasite, tampon, bozulma çarpanı. | Depo etkisi `stok.ts` kapasite/bozulmasına bağlı; test | E6-G1 | M | P2 | Yapılacak |
| E6-G5 | Kapsam neden sınıfları genişlemesi | `filo_yetersiz`, `yakit_yok`, `iklim_kapali` (v1.5: `liman_dolu`) ve arayüz eşlemesi. **Değişti: docs/11'e bakın** (arayüzde kapsam neden sınıfları yerine ▲ rozeti ve Dikkat paneli, E1-G10 ve E21-G8; neden sınıfları çekirdekte iç kullanım). | Neden sınıfı bot koşusunda tutarlı; E1-G4'te glif var | E6-G1…G3, E1-G4 | S | P1 | Değişti |
| E6-G6 | Liman elleçleme kapasitesi (Ö5) | Liman başına hacim tavanı; değer yoğunluğu sırası (v0.3 adayı). | Liman bölgelerinde ihracatçı tema baskınlığı düşer (H1 ölçümü) | E8-G1 | M | P2 | Yapılacak |
| E6-G7 | Lojistik ölçümü | Eşdeğerlik testi ve H3/H7 kontrolü. | Eşdeğerlik geçer; H3 ≥ %10; H7 bandı bozulmaz; lavabo/gelir 0,30–0,63 | E6-G1…G5 | M | P1 | Yapılacak |

### E7 — Teknoloji (Faz B6)

> **Güncelleme (1 Ekim).** Teknoloji v1 (≈ 17 düğüm) Alfa-1 sonrasına ertelendi; Alfa-0'da mevcut 6 düğüm ve Atölye-Lab yapısı kullanılır ([11 §4.1](11-urun-donusu.md#41-özet-tablo)).

**Spesifikasyon:** [08 §4, B6](08-alti-katman.md#4-teknoloji). Bugün 6 düğüm; **öneri ≈ 17** (PDF 5–8; karar bekliyor, bölüm 4-3). İki dışlayan çift: `hassas_tarim` ↔ `organik_rotasyon`, `temiz_enerji` ↔ `termik_verim`.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E7-G1 | Düğüm içeriği (11 yeni düğüm) | Her katmana 2–4 düğüm, derinlik ≤ 4, her düğüm yöntem/tesis/karar açar ve bedeli vardır. | Ölü düğüm yok (her düğümün açtığı yöntem bot koşusunda en az bir kez kullanılır); karar §4-3 onaylı | Karar §4-3, E4–E6 | L | P1 | Yapılacak |
| E7-G2 | Sürekli araştırma bütçesi | 2 slot, `arastirma_payi`, sürümlü bitiş olayı; bütçe `arastirma` kolundan. | Eski `arastir` sonuçlarıyla eşdeğerlik (bütçe sınırsız); toplam ödenen = maliyet × yayılım çarpanı | E9-G5 | L | P1 | Yapılacak |
| E7-G3 | Karşılıklı dışlayan dallar | İki çift, geri dönüşsüz; "pişmanlık" riski arayüzde etiketli; v1.5 `dal_degistir`. | Dışlayan denetimi testi; aynı oyuncu iki dalı da açamaz | E7-G1 | M | P1 | Yapılacak |
| E7-G4 | Ağırlıklı yayılım | Ticaret anlaşmalı oyunculardan teknoloji yayılımı (Victoria 3 esinli). | Yayılım indirimi anlaşma ağırlığıyla orantılı; H6 ≥ %50 korunur | E7-G2, E9-G6 | M | P2 | Yapılacak |
| E7-G5 | Teknoloji ağacı ekranı | Tek ekran ağaç, dal, bedel, bütçe kaydırıcısı (3D istemci). | Tüm düğümler ve bedelleri tek ekranda; bütçe payı komut olarak gönderilir | E7-G2, E10-G1 | M | P1 | Yapılacak |
| E7-G6 | Teknoloji ölçümü | Eşdeğerlik, karar çeşitliliği, ölü düğüm kontrolü. | H2 karar çeşitliliği; H6 ≥ %50 (mevcut %66,7'nin altına düşmez); çalışma süresi ≤ × 1,1 | E7-G1…G3, E12-G1 | M | P1 | Yapılacak |

### E8 — Pazar (Faz B3)

**Spesifikasyon:** [08 §5, B3](08-alti-katman.md#5-pazar). Pazar **açıkça işaretli NPC piyasa yapıcıdır** ("Dünya Piyasa Yapıcısı"); oyuncular arası emir defteri v1.5 kapısına bırakıldı (Capital Rift'in tam oyuncu pazarı modeli az oyuncuda kırılgandır; geliştirici tanıtımına dayanan çıkarım). **Bağımlılık:** B1, B2.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E8-G1 | Liman primi ve dünya kapısı | Fiyat farkı = taşıma maliyeti; 2–4 dünya kapısı; bölgesel fiyat. **Tamamlandı: commit `1a7fe08`.** | Arbitraj yok (özellik testi, 40 tohum); prim = 0 iken v0.2 birebir | E3-G4, E5-G1 | L | P0 | Tamamlandı |
| E8-G2 | NPC piyasa yapıcı ve makas | Açık makas (varsayılan 200 000 ppm = eski 1,1×/0,9×), anlaşma/yaptırım makası. **Tamamlandı: commit `1a7fe08`.** | Makas 200 000, prim/komisyon/tarife 0 → v0.2 birebir; arayüz etiketi "Dünya Piyasa Yapıcısı" | E8-G1 | M | P0 | Tamamlandı |
| E8-G3 | Komisyon, tarife ve ihracat vergisi | `TicaretRejimi`; komisyon hazineye yazılır; komut Devlet'te. **Tamamlandı: commit `1a7fe08`.** | Hazine muhasebesi testi; tarife/vergi hazine gelirine düşer | E8-G2, E9-G4 | M | P1 | Tamamlandı |
| E8-G4 | Kıtlık cezası | 3 kademe eşik/ceza, toparlanma süresi; cezanın tabanı vardır. **Tamamlandı: commit `1a7fe08`.** | Kademe ve toparlanma testi; kıtlık + istikrar çift sayımı kalibrasyonda ayrı ölçülür | E8-G2, E9-G2 | M | P1 | Tamamlandı |
| E8-G5 | Tedarik sözleşmesi (B3.5, isteğe bağlı) | Sabit vadeli tedarik, teminat %20; çok oyunculu ister. | Sözleşme teklif/kabul/fesih komutları; teminat muhasebesi | E11-G2, E7-G1 | L | P2 | Yapılacak |
| E8-G6 | Oyuncular arası emir defteri kararı (v1.5 kapısı) | Kapı koşullarının ([08 §5.4](08-alti-katman.md#54-oyuncular-arası-emir-defteri-ne-zaman-v15-kapısı)) değerlendirilmesi; ek olarak NPC makasının kalıcılığı. | Karar notu: hangi oyuncu sayısında ve hangi hile önlemleriyle açılır | E11-G7 | M | P2 | Yapılacak |
| E8-G7 | Yerel iç pazar geliri (Ö6) | Nüfus tüketimi hazineye gelir yazar; H7 eşitlenme riski var. | Limansız bölgede nakit akışı pozitif; H7 bandı bozulmaz | E8-G2 | M | P2 | Yapılacak |
| E8-G8 | Pazar ölçümü | Eşdeğerlik, H1 (`ihracatci`), H3, H6, H5. | `ihracatci` ilk üç ≤ %60 (mevcut %68,8); H3'te en az bir gösterge ≥ %10; H6 ≥ %50; H5 ≤ %25; lavabo/gelir 0,30–0,63 | E8-G1…G4, E12-G1 | M | P1 | Yapılacak |

### E9 — Devlet (Faz B4): diğerlerini yöneten karma katman

> **Değişti: docs/11'e bakın (K25).** D1–D7 oyuncu düzeyinden **il hükümetine** taşınır; yasa ve bütçeyi seçilmiş vali yönetir (Alfa-0'da NPC vali, varsayılan yasalar). Bu epiğin mekanik görevleri geçerlidir; yönetişim, seçim ve askeri **E23**'tedir.

**Spesifikasyon:** [08 §6, B4](08-alti-katman.md#6-devlet). Devlet = nüfus/toplum ihtiyaçları + politika/yasa/bütçe + askeri/diplomasi. Yasa ve bütçe kolları diğer beş katmanı yönlendirir. **Bağımlılık:** B2, B3. **Tutarsızlık:** gece planı "5 yasa" der, docs/08 **7 yasa** tanımlar (`vergi_rejimi`, `tarim_koruma`, `sanayi_tesviki`, `ticaret_rejimi`, `seferberlik`, `egitim`, `enerji_onceligi`); karar bölüm 4-4.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E9-G1 | İhtiyaç kademeleri | K1 temel (gıda), K2 konfor, K3 hizmet; nüfus modelinin Devlet modülüne taşınması. | Toplam nüfus korunumu testi; kademe karşılanma değerleri bot koşusunda çıkar | E5-G1, E8-G2 | L | P0 | Yapılacak |
| E9-G2 | İstikrar (0–1) | Kademe, vergi, savaş ve kirlilik etkisi; çarpan tabanı; koruma zemini. | `minimum_devlet` botu 30. günde istikrar ≥ %50; tek savaş üretim çarpanını etkilemez (özellik testi, 40 tohum) | E9-G1 | M | P0 | Yapılacak |
| E9-G3 | Göç | Bölgeler arası nüfus akışı (istikrar, konfor, iş ağırlıklı). | Toplam nüfus sabit; günlük tavan uygulanır | E9-G2 | M | P1 | Yapılacak |
| E9-G4 | Yasalar (bedelli) | 7 yasa, `yasa_cikar`, 72 saat bekleme (korumada yok); her yasanın bedeli vardır. | Her yasa için etki + bedel testi; bekleme ve koruma istisnası testi | E9-G2, E8-G3, Karar §4-4 | L | P1 | Yapılacak |
| E9-G5 | Bütçe kolları | Araştırma, kamu hizmeti, bakım (`butce_ayarla`); hazine 0 iken kısılma. | Bütçe toplamı tavanı aşmaz; hazine 0 testi; `bakim_duzeyi` komutu takma ad olur | E5-G2 | M | P1 | Yapılacak |
| E9-G6 | Askeri ve diplomasi bağları | İstikrar ve yasa kancaları; seferberlik → filo/ikmal; anlaşma → makas ve yayılım. | Askeri modül değişmeden yalnız kancalar; H5 yapısal testi genişletilir (stok tavanı + koruma) | E9-G4 | M | P1 | Yapılacak |
| E9-G7 | Yeni oyuncu koruması ve kayıp tavanı (D7) | Korumanın istikrarla ilişkisi; H5 %25 tavanı yapısal kalır. | H5 ≤ %25 ve `degerKaybi24s` ≤ %30 | E9-G2 | S | P1 | Yapılacak |
| E9-G8 | Yetişme mekanizmaları (C6–C9) | İnşa maliyeti indirimi, eşikte erken biten koruma, puan bandı; yalnız H6 düşerse (A7). **Değişti: docs/11'e bakın** (yetişme paketi artık v1 tasarımının parçası, koşullu değil → E20-G8). | H6 ≥ %50 korunur ya da iyileşir | E12-G7 | M | P2 | Değişti |
| E9-G9 | Devlet kolları etki matrisi | Her yasa/bütçe kolunun hedef katmandaki etkisinin ayrı raporu (tarım sübvansiyonu, sanayi teşviki, tarife, araştırma, seferberlik, enerji). | Her kol için raporda ayrı satır: hedef katman göstergesi açık/kapalı farkı | E9-G4, E9-G5 | M | P1 | Yapılacak |
| E9-G10 | Devlet ölçümü | `minimum_devlet` botu ve H2/H6/H7 yeniden koşusu. | H2 ≤ %60; H6 ≥ %50; H7 bandı; çalışma süresi ≤ × 1,1 | E9-G1…G6, E12-G1 | M | P1 | Yapılacak |

### E10 — Oyuncu Etkileşimi ve Komut Arayüzü

> **Güncelleme (1 Ekim).** Komut çubuğu (E10-G1) tamamlandı. Devlet seçimi ekranı kalkar (K25); onboarding Giriş / Yerleş ekranıyla **E21-G6**'ya, savaş komutları **E23-G5**'e taşındı. Parsel ve inşa arayüzü **E21**'dedir.

3D istemci bugün botların oynadığı dünyayı **izler**; temel komutlar "ikinci adım" (gece planı). Hedef: çekirdeğin komut kümesinin tamamı arayüzden gönderilebilir; arayüz yalnız anlık görüntü çizer ve komut yollar (determinizm korunur; [03 §7](03-teknik-mimari.md)).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E10-G1 | Komut çubuğu ve bölge paneli (inşa) | Tesis kur/yükselt, kenar geliştir, politika düzeyinde emir, birlik üretimi; Türkçe ret mesajları. **Tamamlandı: commit `be830dc` (worker komut protokolü, 20 komut formu, önerilen eylemler, Türkçe hata bildirimleri). Değişti: devlet seçimi ekranı Yerleş ekranıyla değişir (E21-G6); `kenar_gelistir`/`askeri_rezerv` formları F0'da kalkar (E1-G10).** | Mevcut çekirdek komut kümesinin tamamı arayüzden gönderilir (komut-arayüz eşleme tablosu); oyuncu botsuz bir bölgeyi yönetir | E1-G1 | L | P0 | Tamamlandı |
| E10-G2 | Ticaret arayüzü | İthalat/ihracat emirleri, fiyat/taban, depo doluluğu uyarısı, "Dünya Piyasa Yapıcısı" etiketi. | Emir verilir, fiyat ve makas görünür; depo %70 uyarısı | E10-G1, E8-G2 | M | P1 | Yapılacak |
| E10-G3 | Devlet arayüzü | Yasa kartları (bedelleri açık), bütçe kaydırıcıları, vergi ve tarife, istikrar ve göstergeler. **Not (1 Ekim): yasa ve bütçe il hükümetine geçer; vali ekranı E23-G7.** | 7 yasa kartı, bedel ve bekleme süresi görünür; bütçe toplamı aşılamaz | E9-G4, E9-G5 | L | P1 | Yapılacak |
| E10-G4 | Savaş ve diplomasi komutları | Savaş ilanı (hazırlık sayacı, 24 saat pencere, %25 kayıp tavanı gösterimi), savunma duruşu, anlaşma/yaptırım. **Değişti: docs/11'e bakın** (→ E23-G5 hafif askeri, Alfa-1). | İlan → hazırlık → pencere → çözüm akışı arayüzden izlenir | E10-G1 | L | P1 | Değişti |
| E10-G5 | Onboarding: ilk 10 dakika | Öğretici akış, ilk saatlerde geri bildirim (zaman kuralı 1), koruma ve "çevrimdışıyken en fazla neyi kaybedersiniz" açıklaması. **Değişti: docs/11'e bakın** (→ E21-G6 Giriş / Yerleş ekranı ve ilk 10 dakika). | Yeni bir oyuncu ilk 10 dakikada ilk tesisini kurar ve akışı görür (5 kişilik gözlem, hedef); çevrimdışı söz metni görünür | E10-G1 | L | P0 | Değişti |
| E10-G6 | "Sen yokken ne oldu" özeti ve bildirimler | Olay günlüğü: iklim olayı, savaş ilanı, brownout, kıtlık, tamamlanan inşa/araştırma. **Not (1 Ekim): gelen kutusu (Bildirimler) olarak E21-G8 ile birleşir; anlık bildirim yalnız oyuncunun kendi eyleminin sonucu içindir.** | Dönüşte son 48 saatin olayları kronolojik listelenir | E10-G1, E4-G3 | M | P1 | Yapılacak |
| E10-G7 | "Ya olursa" önizleme (U7) | Planlanan kenar geliştirmesinin kapsam farkını çekirdeğin klonuyla ön hesapla. **Değişti: docs/11'e bakın** (kaldırıldı: `kenar_gelistir` parsel kipinde yok). | Önizleme gerçek sonuçla aynı kapsam değerlerini verir (test) | E1-G4 | M | P2 | Değişti |
| E10-G8 | Şablonlar ve varsayılanlar | Mikro yönetimi azaltan şablon/varsayılanlar; yeni komutların ([08 §8-10](08-alti-katman.md#8-açık-sorular-ve-riskler)) yükünü H7 ile ölçme. | Şablonlarla ayarla-unut oranı H7 bandında | E12-G8 | M | P1 | Yapılacak |

### E11 — Çok Oyunculu Sunucu

> **Değişti: docs/11'e bakın (K23).** Paylaşılan dünya artık baştandır ve kritik yolun başındadır. Bu epiğin tüm görevleri **E18** (sunucu ve kalıcılık), **E20** (katılım) ve **E24** (alfa operasyonları) epiklerine taşındı ve "Değişti" olarak işaretlidir.

**Model ([03 §8](03-teknik-mimari.md)):** olay kaynaklı yetkili sunucu, durum = tohum + komut günlüğü; PostgreSQL olay deposu; düz WebSocket + JSON/msgpack + Fastify/ws (Colyseus önerilmiyor); komut gelince `runUntil(now)`. Hesap/giriş ve ödeme ilk aşamada kapsam dışı. **Zamanlama kararı bekliyor (bölüm 4-8).**

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E11-G1 | Mimari karar kaydı | ADR: yetkili sunucu, taşıma, depo, ölçek sınırları, çok oyunculuda duraklatma yokluğu. **Değişti: docs/11'e bakın** (ADR = [11](11-urun-donusu.md), §10 teknik mimari). | Yazılı ADR; sahip onayı | Karar §4-8 | S | P1 | Değişti |
| E11-G2 | Yetkili sunucu çekirdeği | Komut günlüğü `(simZamaniMs, oyuncuId, komut)`, doğrulama, `runUntil(now)`. **Değişti: docs/11'e bakın** (→ E18-G1, E18-G3). | Günlükten yeniden oynatma → aynı `durumOzeti` (test); girdi doğrulama (ret nedenleri) | E11-G1 | XL | P1 | Değişti |
| E11-G3 | PostgreSQL olay deposu | Yalnızca-ekleme tablosu, sıralama kısıtı, periyodik anlık görüntü. **Değişti: docs/11'e bakın** (→ E18-G4). | Yeniden başlatmada durum anlık görüntü + günlükten kurulur; özet eşit | E11-G2 | L | P1 | Değişti |
| E11-G4 | WebSocket protokolü ve senkron | Abonelik, anlık görüntü/delta, yeniden bağlanma. **Değişti: docs/11'e bakın** (→ E18-G2, E18-G5). | İki istemci aynı dünyayı görür; kopma sonrası toparlanır | E11-G2, E1-G1 | XL | P1 | Değişti |
| E11-G5 | Katılım, bölge atama ve geç katılım | Minimum oturum kimliği, sahipsiz bölge atama, H6 mekanizmaları; bot yönetimli/uykudaki bölge politikası. **Değişti: docs/11'e bakın** (bölge atama yok; arsa ile başlangıç → E20-G8, E21-G6). | Geç katılan sahipsiz bölgeye başlar; H6 ölçümü sunucu koşusunda tekrarlanır | E11-G2, E9-G7 | L | P1 | Değişti |
| E11-G6 | Çevrimdışı koruma (sunucu tarafı) | Hazır emirler, kayıp tavanı, bildirim. **Değişti: docs/11'e bakın** (→ E23-G6 H5 korumaları). | H5 %25 tavanı sunucuda özellik testi | E11-G2 | M | P1 | Değişti |
| E11-G7 | Ölçek ve yük testi | Tek kalıcı dünya, tek yazar süreç; eşzamanlı oyuncu hedefi sahiple belirlenir (bilinmiyor). **Değişti: docs/11'e bakın** (→ E24-G4). | Yük test raporu: komut/sn ve gecikme | E11-G4 | L | P2 | Değişti |
| E11-G8 | Kötüye kullanım ve geçiş | Komut hız sınırı, çoklu hesap, bot tespiti; tek oyunculu → çok oyunculu geçiş planı. **Değişti: docs/11'e bakın** (→ E18-G8). | Hız sınırı ve tavan testleri; geçiş planı yazılı | E11-G2 | M | P2 | Değişti |

### E12 — Denge ve Ölçüm

> **Güncelleme (1 Ekim).** Hipotezler parsel dünyasına göre yeniden ifade edildi ve H8, H9 eklendi ([11 §8](11-urun-donusu.md#8-ölçüm)). Bölge kipi sonuçları (v0.3) donmuş temel çizgi olur. Ölçümler her zaman sabit commit'ten açılan ayrı bir git worktree'de koşar.

**Durum ([05](05-ilk-olcum-raporu.md)):** v0.1'de H5 geçti; H2 (%56,7), H3 (%46,9 ama gürültü tabanı %40–64), H6 (%66,7) belirsiz; H1 (%75) ve H7 (sınırda) kaldı. H1 düzeneği v0.2 tek tohumla %68,8 (geçti, sınırda; pencereye duyarlılık %62,5–75). Eşikler başlangıç önerisidir; **simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz.**

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E12-G0 | Ölçüm takımı ve ilk raporlar | Bot arketipleri, H1–H3/H5–H7 koşucuları, CLI; v0, v0.1 ve v0.2-düzenek raporları. | `pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-3` rapor üretir | — | XL | — | Tamamlandı |
| E12-G1 | v0.2 veri sonrası yeniden ölçüm | Ö2+Ö3 sonrası tam H paketi; yeni temel satır (gerçek harita ve B1 sonrası tekrar). **Devam: v0.3 bölge kipi ölçümü sabit commit `1a7fe08` worktree'sinde koşuyor; sonuç donmuş temel çizgi olarak arşivlenir (docs/11 §8.3).** | `docs/olcum/v0.3-*` (md+json); `--karsilastir v0.1` özeti; H1 düzeneği ≥ 3 tohumla | E4-G7, E3-G2 | M | P0 | Devam ediyor |
| E12-G2 | H1 düzeneği sağlamlaştırma | Pencere duyarlılığı, depo tavanı 3. günde doluyor, 14–21 günlük alt ölçüm (≥ 4 bölge × 4 tohum). **Değişti: docs/11'e bakın** (bölge kipi H1 düzeneği v0.3'te dondu; yeni H1 ilçe sınıflarında portföy → E12-G11). | 4–7. gün ve 7 günlük toplam aynı yönde; 14–21 gün ölçümü raporda | E5-G5 | M | P1 | Değişti |
| E12-G3 | Faz B sonu kapı raporu | `--tohum 1-10` tam paket + `gunCarpani = 12` ek koşusu ([08 §7](08-alti-katman.md#faz-b-sonunda-tam-kapı-değerlendirmesi)). **Değişti: docs/11'e bakın** (bölge kipi Kapı 2 v0.3'te donmuş temel çizgi; yeni kapılar Alfa-0/Alfa-1, [04 §9](04-yol-haritasi.md#9-güncelleme-1-ekim-ürün-dönüşü), E12-G12). | Kapı 2: H1 ≤ %70, H2 ≤ %60, H3 ≥ %10, H5 ≤ %25, H6 ≥ %50, H7 [%50, %85] | E4…E9 | L | P1 | Değişti |
| E12-G4 | Duyarlılık taraması ve güven aralığı | Tek-tek ya da Sobol; ardından ≥ 200 tohumlu koşular. | Sabit başına duyarlılık tablosu; ≥ 200 tohumda güven aralığı | E12-G3 | XL | P1 | Yapılacak |
| E12-G5 | H3 istatistik gücü | ≥ 10 koşul ve eşli gürültü tabanı; altı katmanla yeniden tanım. | Etki gürültü tabanından ayrışır (göreli fark) | E12-G1 | M | P1 | Yapılacak |
| E12-G6 | H4 insan testi protokolü | 5 kişi, sabit tohumdan 3 önceden bilinen cevaplı durum, 60 sn; 3D istemcide. Karar kuralı: PDF ≥ 4/5 yanıtlayamazsa vazgeç; öneri ≥ 4/5 doğru ve ≤ 60 sn (A5). **Not (1 Ekim): yeni H4 soruları "fabrikam neden yavaş?" ve "hangi yasa beni etkiliyor?"; katı eşik ≥4/5; Alfa-1 kapısında (E24-G8).** | Protokol yazılı; ≥ 2 katılımcı strateji oyunu oynamaz; sonuç raporu | E1-G4, Karar §4-9 | L | P1 | Yapılacak |
| E12-G7 | H6 işletimsel tanımı ve yetişme senaryoları | A6: "yerel ekonominin ilk yarısı" = bölge başına üretim ≥ yerleşik oyuncunun medyanı; onay ve yeni katmanlarla ölçüm. **Değişti: docs/11'e bakın** (yeni H6 tanımı → E12-G11). | Tanım docs/02 §8.4'te sabit; H6 ≥ %50 | Karar §4-10 | S | P1 | Değişti |
| E12-G8 | H7: ayarla-unut "çökmesin" | 7. günde %24–115, 14. günde %29–45; temel gider muafiyeti ya da hazır ticaret emri otomasyonu kararı. | 24/48/72. saat [%50, %85]; 168. saat ≥ %50 | E5-G5, E10-G8 | M | P1 | Yapılacak |
| E12-G9 | İnsan tutma gözlemi (20–25. gün) | İlk oynanabilir sürümle küçük kohort: D1/D7/D30 ve "tekrar" gözlemi; bağımsız tutma verisi henüz yok. | Gözlem planı + ilk veri; sonuç hipotez olarak sunulur | E10-G1, E10-G5 | L | P1 | Yapılacak |
| E12-G10 | Altı katman için yeni hipotezler | Kirlilik/brownout, iklim olayı, yasa ve bütçe kararlarının tekrar kırması için ölçülebilir hipotez ve eşikler (eşikler tahmin). **Değişti: docs/11'e bakın** (H8 arazi yoğunlaşması ve H9 emir dolumu/oy katılımı → E12-G11). | H8+ tanımları 02 §8.4'e eklenir ve sahibe onaya sunulur | E12-G3 | M | P2 | Değişti |
| E12-G11 | H1–H9 yeni tanımları ve sentetik parsel fikstürü (S9) | Hipotezlerin parsel dünyası ifadeleri ([11 §8](11-urun-donusu.md#8-ölçüm)); 8 bot arketipi tanımı; sentetik-50 ve mini-6'dan parsel fikstürü (bölge = 1 il, 2 ilçe, ilçe başına 10×10 hücre; `veri/src/uretici/parsel-fikstur.ts`). **Yeni (1 Ekim); Sprint 1, ölçüm ajanı.** | Fikstür şemadan geçer ve deterministik; tanımlar 02 §8.4'e yazılı | E20-G1 | M | P0 | Devam ediyor |
| E12-G12 | Alfa ölçüm raporları | Alfa-0: H5, H6, H7, H8 (100 bot); Alfa-1: H1–H9, 1k ve 10k bot, 90 gün, 10 tohum, 12 başlangıç ayı; her zaman sabit commit'ten açılan ayrı worktree'de. **Yeni (1 Ekim).** | Raporlar `docs/olcum/` altında; Alfa-0 kapısı A0-8 ve Alfa-1 kapısı A1-4 | E12-G11, E20-G10 | L | P0 | Yapılacak |

### E13 — Gerçekçilik İçerikleri (açık veri lisanslarıyla)

İlke (K22): CC BY/CC0/kamu malı kaynaklar atıfla; FAOSTAT, WorldClim, GADM, UN Comtrade ve izinsiz PortWatch kullanılmaz; OSM türevi ayrı ODbL dosyasında.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E13-G1 | İklim olayı kataloğu | Bölge iklim tipine göre olay olasılıkları (`tipOlasilikCarpaniPpm`), CHELSA (CC0) ile kalibrasyon, Türkçe olay metinleri. | Her iklim tipi × olay türü çifti kaynağıyla yazılı; olay metinleri Türkçe | E4-G3, E3-G3 | M | P1 | Yapılacak |
| E13-G2 | Gerçek damar ve saha doğrulaması | Kömür/petrol/tahıl rezervlerine kaynak: GAEZ, GEM, USGS Commodity Summaries; USGS MRDS doğrulaması genişler; miktarlar tasarım ölçeği olarak kalır. | "Genel bilgi" satırlarının kaynaklı olanı/tasarım değeri etiketi tabloda ayrılır | E3-G1 | L | P1 | Yapılacak |
| E13-G3 | Gerçek limanlar ve boğazlar | Liman adı, sınıf, derinlik (WPI ya da Natural Earth); İstanbul ve Çanakkale boğazları için kamuya açık kapasite bilgisi. | Her liman bölgesinde kaynaklı sınıf; boğaz kenarı belgeli | E3-G4 | M | P1 | Yapılacak |
| E13-G4 | Gerçek üretim tesisleri | GEM demir-çelik, kömür madeni ve santral izleyicileri (CC BY), WRI GPPD (CC BY): bölge başına kapasite, başlangıç tesisleri. | Bölge başına kapasite toplamı; atıf DATA_SOURCES ve oyun içinde | E3-G1, E5-G6 | L | P1 | Yapılacak |
| E13-G5 | Ürün takvimi ve hayvancılık çeşitliliği | MIRCA-OS ekim/hasat ayları (lisans doğrulanmadı); ürün çeşitliliği. | Lisans doğrulanır; yoksa CHELSA/GAEZ türevi | E4-G2, E15-G5 | M | P2 | Yapılacak |
| E13-G6 | Hidro, rüzgâr ve güneş profilleri | 12 aylık akarsu eğrisi, dalgalı elektrik profilleri. | Profiller `hidro.akarsuEgrisiPpm` ve `ruzgar_gunes` yönteminde kullanılır | E5-G1 | M | P2 | Yapılacak |
| E13-G7 | Ticaret ve sektör ağırlıkları | BACI (Etalab, atıf) mal bazlı ticaret ağırlığı; WDI (lisans doğrulanınca) sektör payı. | Pazar taban/ağırlıkları kaynaklı; lisans doğrulanmış | E8-G2 | M | P2 | Yapılacak |
| E13-G8 | İçerik şablon sistemi | K14: yeni olay/tesis/yasa yalnız veriyle eklenir; zod doğrulayıcısı. | Yeni bir olay türü yalnız JSON ile eklenir (test) | E4-G3, E9-G4 | M | P2 | Yapılacak |

### E14 — Performans ve Mobil

**Bütçeler ([3d-teknoloji](arastirma/3d-teknoloji.md) §5, hepsi hedef; hiçbir yığın için yayımlanmış mobil fps ölçümü bulunamadı):** Katman A ilk JS < 400 KB gzip, masaüstü 60 fps, orta mobil 30 fps, < 40 çizim çağrısı; gezen kamera < 100; Katman B ilk JS < 2 MB gzip. Sim hedefi: 30 günlük koşu < 1 sn ([03](03-teknik-mimari.md), ölçülmedi).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E14-G1 | Performans ölçüm donanımı | Playwright: fps, çizim çağrısı, üçgen, CPU ms; masaüstü 1440×900 ve mobil 390×844, açık/koyu ekran görüntüsü. **Tamamlandı: `packages/istemci/scripts/{ekran,olcum}.ts` (`aa1b8ac`).** | Ölçüm betiği tek komutla rapor üretir; raporlar `docs/olcum/` altında | E1-G1 | S | P0 | Tamamlandı |
| E14-G2 | Bütçelerin sabitlenmesi | Hedef tablo + gerçek ilk JS gzip ölçümü (şu an yalnız 1,05 MB ham tek HTML). **Tamamlandı: ölçülen tek HTML 332 KB gzip (< 400 KB hedef), 11–12 çizim çağrısı ([09](09-sabah-raporu.md)); gerçek cihaz E14-G3'te.** | Ölçülmüş gzip boyutu ve bütçe tablosu; aşım durumunda epik önceliği güncellenir | E14-G1 | S | P0 | Tamamlandı |
| E14-G3 | Gerçek cihaz testi | Düşük/orta Android, iOS Safari: fps, ısınma, pil, bellek. | ≥ 3 cihaz sınıfında ölçülmüş fps tablosu | E14-G1 | M | P1 | Yapılacak |
| E14-G4 | Simülasyon ölçek testi | 53 → 150–300 bölgede çözüm süresi, bellek; worker içi. **Değişti: docs/11'e bakın** (bölge sayısı değil işletme düğümü ölçeği: 1k bot 30 gün ölçütü → E20-G3). | 30 günlük koşu süresi ve çözüm süresi raporlanır; hedef < 1 sn aşılırsa önlem listesi | E3-G8 | M | P1 | Değişti |
| E14-G5 | Kalite kademeleri | Piksel oranı, atmosfer/gölge kapatma, örnek tavanı, `prefers-reduced-motion`; otomatik düşürme. | Düşük kademede ölçülen fps artar; kullanıcı kademeyi elle seçebilir | E14-G3 | M | P1 | Yapılacak |
| E14-G6 | Bellek ve pil | GPU bellek bütçesi, karo önbellek tavanı, arka plan sekmesinde duraklatma. | Arka plan sekmesinde CPU ≈ 0; 30 dakikalık koşuda bellek büyümesi sınırlı | E14-G1 | M | P1 | Yapılacak |
| E14-G7 | Mobil arayüz | Dokunmatik kamera, alt panel düzeni, küçük ekranda okunurluk. | 390×844'te tüm komutlar erişilebilir; yatay kaydırma yok | E10-G1 | M | P1 | Yapılacak |
| E14-G8 | Tembel yükleme ve WebGPU (isteğe bağlı) | Kod bölme, dünya seti ve karo önbelleği; özellik algılamalı WebGPU parçacıkları. | İlk JS bütçesi korunur; WebGPU yoksa WebGL2 yoluna düşer | E3-G7 | M | P2 | Yapılacak |

### E15 — Hukuk, Lisans ve Sınır Politikası

> **Güncelleme (1 Ekim, K24, K33, K34).** ODbL kararı kapandı (OSM kabul); ad politikası gerçek il/ilçe adlarıyla değişti (E19-G8); dış hukuki görüş açık alfadan önce zorunlu.

Not: aşağıdakiler hukuki tavsiye değildir; yayın öncesi avukat incelemesi önerilir ([araştırma §4](arastirma/acik-kaynak-ve-veri.md)).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E15-G1 | Sınır ve isim politikasının onayı (A2) | Taslak DATA_SOURCES §6: kurgusal 4 devlet/2 blok, nötr bölge adları, Kırım-Herson-Mykolayiv-Kıbrıs-Kosova vb. dışarıda, güncel çatışma senaryosu yok; yeni dilimler için kontrol listesi. **Taslak commit'li (`42a3b8e`); yalnız sahip onayı bekliyor.** **Değişti: docs/11'e bakın** (K33: gerçek il/ilçe adları, NPC ülke çerçevesi → E19-G8). | Sahip onayı docs/00'a işlenir; hiçbir devlet/blok/bölge adında ülke ya da ittifak adı yok (test) | — | S | P0 | Değişti |
| E15-G2 | Atıf envanteri ve "Hakkında" ekranı | DATA_SOURCES'ten `CREDITS`/oyun içi atıf ekranı; Natural Earth, USGS, GAEZ, CHELSA, GEM, WorldPop vb. | Her kullanılan veri kaynağının lisansı ve atıf metni ekranda | E3-G1 | M | P1 | Yapılacak |
| E15-G3 | ODbL kararı (Katman B verisi) | OSM/Overture/Protomaps altlığı (ODbL, Toplu Veri Tabanı Kılavuzu ile ayrı dosya) mı, Natural Earth + prosedürel bina mı? Gece planı "v1'de OSM türevi yok" dedi. **Değişti: docs/11'e bakın** (K24 ile kapandı: OSM kabul; uyum işi → E19-G6). | Yazılı karar notu; E2 kapsamı buna göre netleşir | Karar §4-6 | S | P1 | Değişti |
| E15-G4 | Hukuki inceleme (A13) | ODbL, atıf sayfası, hedef pazarlarda harita kuralları, GPL/AGPL temiz oda, isim/marka. **Not (1 Ekim): açık alfadan önce zorunlu (K34); E24-G9 ile birlikte.** | Dış incelemeden yazılı görüş; yayın öncesi kapı | E15-G2, E15-G3 | M | P1 | Yapılacak |
| E15-G5 | Bağımlılık ve veri lisans taraması | CI'da paket lisans listesi; "doğrulanmadı" maddeleri (MIRCA-OS, WDI, GLO-90/SRTM, PortWatch izni). | Lisans raporu CI'da; doğrulanmamış kaynak kullanılmaz | E17-G6 | S | P1 | Yapılacak |
| E15-G6 | GPL/AGPL temiz oda kuralı | OpenFrontIO, OpenTTD, Symphony of Empires, Mindustry vb. yalnız tasarım referansı; algoritma yayımlanmış tarifeden yazılır. | Katkı kuralı CONTRIBUTING benzeri belgede; kod incelemesi maddesi | — | S | P1 | Yapılacak |
| E15-G7 | Ürün adı ve Capital Rift ilişkisi | "Capital Rift'in kendi versiyonu" başlangıç fikri; ad, görsel dil ve varlıkların özgün olduğunun teyidi. | Ürün adı/marka kontrolü yapılmış; özgün varlık listesi | Karar §4-14 | S | P1 | Yapılacak |

### E16 — Gelir Modeli İlkeleri (prototip dışı)

İlke (K13, README): kritik kararlarda parayla güç yok; günlük giriş ödülü yok; kolaylık ve kozmetik satılabilir, zaman atlama ve kapasite satılmaz. Capital Rift'in para kazanma yöntemi bulunamadı. **Bu epik prototip kapsamına girmez.**

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E16-G1 | İlke belgesi | Satılabilir/satılamaz listesi, angarya ödülü yasağı, çevrimdışı söz. | Sahip onaylı tek sayfa | Karar §4-7 | S | P2 | Yapılacak |
| E16-G2 | Seçenek analizi | Kozmetik, bölge teması, destekçi paketi, tek seferlik satın alma; hesap/ödeme önkoşulları. | Seçenekler, riskler ve ödeme/hesap önkoşul listesi (tahmin maliyetlerle) | E16-G1 | M | P2 | Yapılacak |
| E16-G3 | Pay-to-win testi | Her ücretli öğe için bot ölçümü: ücretli/ücretsiz skor farkı. | Ücretli öğenin üretim/skor farkı anlamlı eşiğin altında | E12-G4, E16-G2 | S | P2 | Yapılacak |

### E17 — Pürüzler, Teknik Borç ve Belge Bakımı

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E17-G0 | Pürüzler v0.2.1 (A1) | Mühimmat pazarı, fiyata/depoya duyarlı bot ticareti, reddedilmeyen savaş ilanları, güncel ölçüm tanımları. | Mühimmat fiyatı 0,55× → ≈ 1,0×; yakıt israfı 65–84 bin → 0; ret edilen ilan 11–18 → 0 (commit `cdbd0f0`) | — | M | — | Tamamlandı |
| E17-G1 | Gece işlerinin commit'i ve `pnpm kontrol` | Commit'siz: `packages/veri-hatti`, `packages/istemci`, `gercek-karadeniz*.json`, `DATA_SOURCES.md`, `docs/09`, `docs/10`, `package.json`/lock değişiklikleri. **Tamamlandı: gece işleri konu başına commit'lendi (`42a3b8e`, `aa1b8ac`, `1385465`, `1f03d4c`, `f8fcd45`, `04d66ef`, `ee4ee50`, `7284535`); 555 test yeşil. Sabah commit'siz iş: B3 Pazar ve yan değişiklikler.** | `pnpm kontrol` yeşil; commit'ler konu başına ayrık | E1-G1, E3-G1, E4-G1 | S | P0 | Tamamlandı |
| E17-G2 | Belge tutarlılığı | docs/06 başlığı "(v0.1)" güncel değil; docs/00 §4 tablosu 6 düğümlü, docs/08 17 düğümlü; 5 yasa / 7 yasa; README paket tablosu yeni paketleri içermiyor. | Çelişkiler tek kaynağa bağlanmış; README paket tablosu güncel | Karar §4-3, §4-4 | S | P1 | Yapılacak |
| E17-G3 | Elektronik israfı (bilinen sınır) | Limansız üretici bölgede kenar kapasitesi bağlayıcı, ihracat emri yalnız limanda; elektronik emilimi (120) dar ([06 §10.6](06-simulasyon-spesifikasyonu.md)). | Elektronik israfı 42/20/27 bin (tohum 1–3) düşer; aday çözümlerden biri ölçülmüş | E8-G1 | M | P1 | Yapılacak |
| E17-G4 | Depo tavanı ve H1 penceresi | Depo tavanı 3. günde doluyor; 4–7. gün penceresi ihracat yeteneğini ödüllendiriyor; militarist 7 günden önce savaş açmıyor. | Depo/ölçek ayarı kararı; H1 ölçümünde savaş etkisi raporda ayrı | E12-G2 | S | P1 | Yapılacak |
| E17-G5 | Faz B onaylı kuralların 06'ya taşınması | docs/08 "tasarım önerisi"dir; onaylanan kurallar 06'ya taşınır (çelişkide 06 kazanır). **Kısmi: B1 ve B2 için 06 §11–12 yazıldı; B3–B6 ve onay kaldı.** | Her B adımı sonrası 06 güncellenir | E4-G7 | M | P1 | Yapılacak |
| E17-G6 | CI ve determinizm | GitHub Actions'ta `pnpm kontrol`; 400 günlük determinizm; Node sürüm matrisi (öneri, [03 §9](03-teknik-mimari.md)). | CI yeşil; farklı Node sürümlerinde aynı `durumOzeti` | — | M | P1 | Yapılacak |
| E17-G7 | Yerleşik test sayısının izlenmesi | Gece planı 378 test yeşil diyor; tarayıcı ve veri hattı testleri dahil güncel sayım. | Sayı raporda güncel | E17-G1 | S | P2 | Yapılacak |

### E18 — Sunucu ve kalıcılık (F1, F7 parçası)

**Yeni (1 Ekim, K23).** E11'in yerine geçer. Dünya başına tek yazar Node + `ws` süreci; Postgres'te yalnız eklenen komut günlüğü ve anlık görüntü; zaman damgasını sunucu basar. Ayrıntı: [11 §10](11-urun-donusu.md#10-teknik-mimari-özeti), [arastirma/paylasilan-dunya-mimarisi](arastirma/paylasilan-dunya-mimarisi.md). **Sahiplik:** `cekirdek/src/serilestir.ts` çekirdek ajanında; `packages/sunucu/**` ve `packages/protokol/**` sunucu ajanında.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E18-G1 | Serileştirici ve `Simulasyon.yukle` (S2) | `cekirdek/src/serilestir.ts`: kanonik JSON, PRNG durumu ve olay kuyruğu dahil; `Simulasyon.yukle(veri, dunya, gunluk)`; "başarısızları atarak yeniden oynatma" testi. **Sprint 1, çekirdek ajanı.** | 20 rastgele noktada serileştir/yükle sonrası `durumOzeti` eşit; başarısız komutlar atılıp yeniden oynatılınca özet eşit; tüm testler yeşil | — | M | P0 | Devam ediyor |
| E18-G2 | `packages/protokol` (S4) | `istemci/src/isci/protokol.ts` biçimlerinin WebSocket hâli: `komut→komutSonuc` korunur; `baslat`, `hiz`, `duraklat` düşer; `hazir` el sıkışma olur; sunucu itmeleri (`kare`, `zaman`). **Sprint 1, sunucu ajanı.** | Tipler hem istemci hem sunucuda derlenir; şema sürümü alanı var | E18-G1 (taslakla başlar) | S | P0 | Devam ediyor |
| E18-G3 | `packages/sunucu` (S4) | Node + `ws`; sunucunun bastığı `t`; idempotans anahtarı; hesap başına token-kova hız sınırı; bellek içi ve pg günlük/anlık görüntü bağdaştırıcıları; 50–100 ms grup commit, onay commit'ten sonra. **Sprint 1, sunucu ajanı.** | kill -9 → anlık görüntü + kuyruk → aynı özet; iki istemci uçtan uca aynı dünyayı görür | E18-G1, E18-G2 | L | P0 | Devam ediyor |
| E18-G4 | Postgres şeması ve anlık görüntü politikası | `log(seq, t, hesap, komut, kural_sur, sema_sur)`, `snapshots(seq, sim_t, kural_sur, sema_sur, durum_ozeti, blob zstd)`; 1–6 sa ya da N komutta bir, kapanışta ve dağıtım öncesi anlık görüntü; büyük bloblar R2'ye. | Yeniden başlatmada durum anlık görüntü + günlük kuyruğundan kurulur, özet eşit; göç betikleri sürümlü | E18-G3 | M | P0 | Yapılacak |
| E18-G5 | İlgi alanı ve delta eşzamanlama | `kareAl` süzgeci: abone olunan iller + görüş alanı; özel veri yalnız sahibe; stoklar `(miktar, oran, t0)`; revizyonlu varlık deltaları 1–2 sn; yeniden bağlanmada anlık görüntü + `seq`. | Başka oyuncunun stoğu istemciye hiç gitmez (test); delta trafiği ölçülür ve raporlanır | E18-G3, E20-G2 | L | P0 | Yapılacak |
| E18-G6 | Hesaplar ve kimlik | Better Auth: e-posta magic link (SES) + Google OAuth; passkey sonra; anonim hesap ekonomik hesap değildir; oturum ↔ oyuncu kimliği eşlemesi. | Giriş → oyuncu kimliği → komut yetkisi uçtan uca test; oturum süresi ve çıkış çalışır | E18-G3 | M | P0 | Yapılacak |
| E18-G7 | Kural dönemleri | `kural_surumu_gec` sistem komutu (`parametreler.json` özetiyle); kod değişikliği yalnız dönem sınırında (dur → anlık görüntü → dağıt → göç → başlat); komut şeması için yükseltici; dönem başına konteyner imajı. | Dönem geçişinden sonra yeniden oynatma doğru kurallarla özet eşit; göç testi | E18-G4 | M | P1 | Yapılacak |
| E18-G8 | Kötüye kullanım denetimleri | Tik başına küresel komut tavanı, yük boyutu tavanı, yeni hesap ticaret/transfer tavanı, hediye gecikmesi, fiyat bandı denetimi, Turnstile; bağlantı sinyalleri yalnız inceleme için; telafi komutlarıyla geri alma. E11-G8'in yerine. | Hız sınırı ve tavan testleri; telafi komutu özet testi | E18-G3, E18-G6 | M | P1 | Yapılacak |
| E18-G9 | Determinizm kanaryası | Node sürümü pinli; gecelik iş anlık görüntü k → k+1'i farklı Node yamasıyla ayrı makinede yeniden oynatır. | Kanarya CI'da koşar; sapma alarm üretir | E18-G4, E17-G6 | S | P1 | Yapılacak |

### E19 — OSM hiyerarşi ve arsa ızgarası (F2)

**Yeni (1 Ekim, K24, K26, K30).** OSM `admin_level` 4 (il) / 6 (ilçe) ağacı, z20 hücre ızgarası ve uygunluk, PMTiles. E2'nin karo işlerinin ve E15-G3'ün yerine geçer. Ayrıntı: [arastirma/sokak-seviyesi-3d](arastirma/sokak-seviyesi-3d.md) §2, §4, §5. **Sahiplik:** `packages/veri-hatti/src/osm/**`, `packages/veri/haritalar/odbl/**`.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E19-G1 | OSM il/ilçe hiyerarşisi ve il→bölge eşlemesi (S5) | Geofabrik PBF (TR, BG, RO, GR) → osmium ile `admin_level` 4 ve 6; ebeveyn kimlikli ağaç bölge → il → ilçe; her il tek bir oyun bölgesine eşlenir. **Sprint 1, veri ajanı.** | 81 il ve ~973 ilçe (TR); eşleme testi (her il tam bir bölgede); aynı girdi → bayt bayt aynı çıktı | E3-G1 | L | P0 | Devam ediyor |
| E19-G2 | Gebze PMTiles + z20 hücre uygunluk denemesi (S6) | Tek ilçe için Protomaps z15 özütü, z20 hücre ızgarası ve uygunluk kırpması; karo ve dosya boyutu raporu `docs/olcum/` altında. **Sprint 1, veri-2 ajanı.** | Karo boyutu ölçüldü (hedef ilçe başına ≤150 KB); hücre sayısı ve alınamaz pay raporlu | — | M | P0 | Devam ediyor |
| E19-G3 | İl anahatları ve tembel ilçe TopoJSON | İl sınırları tek küçük dosya; ilçeler il başına tembel; mapshaper ile sadeleştirme; boyutlar ölçülür (tahmin: il dosyası birkaç yüz KB, ilçe 20–60 KB). | Boyutlar ölçüldü ve bütçe belgelendi; ilk JS'ye girmez | E19-G1 | M | P0 | Yapılacak |
| E19-G4 | Alfa-0 illeri için hücre ızgarası ve uygunluk | Kocaeli, Sakarya, Bursa: z20 quadkey hücreleri; yol tamponu, su, `landuse=military` ve korunan alanlar alınamaz; arazi sınıfı (kırsal / kasaba / şehir) ve izinli yapı türü `landuse`'dan; tippecanoe → PMTiles; sunucu için hücre → ilçe ve sınıf tablosu. | Bayt bayt determinizm; her hücrenin ilçesi ve sınıfı var; alınamaz hücre testleri | E19-G1, E19-G2 | L | P0 | Kısmen (G3: Gebze, Gemlik, Körfez) |
| E19-G5 | Protomaps ve DEM özütleri, barındırma | Alfa illeri için Protomaps PMTiles (z15) ve Mapterhorn DEM özütü; R2 + CDN; Protomaps derlemelerine doğrudan bağlantı yok; atıf metinleri. | Özütler aralık isteğiyle sunulur; dilim boyutu ölçüldü | E19-G2 | M | P1 | Yapılacak |
| E19-G6 | ODbL uyumu | OSM türevi veri ayrı klasörde (`veri/haritalar/odbl/`); türetilmiş uygunluk verisinin ODbL ile yayımı; sahiplik verisi hücre kimliğiyle ayrı; "© OpenStreetMap katkıcıları" atfı. E15-G3'ün yerine. | Klasör ayrımı testi; atıf metni ekranda (E24-G6); hukuki görüşe hazır not | E19-G1 | S | P0 | Yapılacak |
| E19-G7 | Balkan `admin_level` eşlemesi | BG, RO, GR (sonra RS, GE, UA) için il ve ilçe karşılıkları OSM wiki'den tek tek doğrulanır; geoBoundaries yalnız yedek (lisans ülkeye göre). | Ülke başına eşleme tablosu ve birim sayıları; doğrulanmayanlar işaretli | E19-G1 | M | P1 | Yapılacak |
| E19-G8 | Ad ve sınır politikası v2 (K33) | Gerçek il ve ilçe adları; ülke düzeyi NPC çerçeve; ihtilaflı alan dışlama listesi; DATA_SOURCES §6 güncellemesi. E15-G1'in yerine. | Dışlama listesi yazılı ve testli (dışlanan birim veri setinde yok); sahip bilgilendirildi | E19-G1 | S | P0 | Yapılacak |
| E19-G9 | Dilim boyutu ölçümü | Türkiye + Balkanlar dilimi için karo ve hücre katmanı toplam boyutu (tahmin 2–4 GB); planetiler profili gerekiyor mu kararı. | Ölçülmüş boyut tablosu; karar notu | E19-G5 | S | P2 | Yapılacak |

### E20 — Mülk modeli (çekirdek) (F3)

**Yeni (1 Ekim, K25, K27, K30, K31).** İşletme düğümü = (oyuncu, il) başına bir `BolgeDurumu`; parsel, yapı, inşa, arazi vergisi, hareketsizlik; MCF yalnız 53 merkez arası. Bölge kipi regresyon kalkanıdır (birebir aynı özet). Ayrıntı: [11 §4.3, §7](11-urun-donusu.md#43-koddaki-etkisi-kod-geçiş-keşfinden). **Sahiplik:** `tipler.ts` sözleşmesi takım liderinde; geri kalan `packages/cekirdek/**` çekirdek ajanında (aynı anda tek yazar).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E20-G1 | Mülk sözleşmesi taslağı ve ADR (S1) | `tipler.ts` içinde parsel, hücre, işletme ve yapı tipleri; `parsel_al`, `tesis_insa {hucreler}`, `insaat_iptal` komut biçimleri; [11](11-urun-donusu.md) ADR, docs/00 K23+ ve araştırmaların Türkçe belgeleri. **Sprint 1, takım lideri.** | Tipler derleniyor; belgeler yazılı | — | S | P0 | Devam ediyor |
| E20-G2 | Büyüyebilen düğüm + işletme + `parsel_al` (S3) | `bolgeIndeks`/`komsuKenarlar` → `Dunya`; MCF önbelleği `ic`'den bağımsız; işletme düğümü il merkezine sıfır süreli kenarla; `parsel_al {ilce, hucreler, sinif}` ve `tesis_insa {hucreler}` bayrak arkasında. **Sprint 1, çekirdek ajanı (S2'den sonra).** | Bölge kipi birebir (tüm eski testler yeşil); mini-6 parsel fikstüründe özellik testleri | E20-G1, E18-G1 | XL | P0 | Devam ediyor |
| E20-G3 | Merkez MCF ve il içi havuz | Merkezler `kenarKullanilabilirMi` içinde kamu; MCF yalnız 53 merkez arası; il içi lojistik havuzlanır ve görünmez; liman erişimi il düzeyine. | 1k botla 30 günlük koşu bugünkü 21–22 sn'den yavaş değil (hedef); bölge kipi birebir | E20-G2 | L | P0 | Yapılacak |
| E20-G4 | İnşa süreci | `TesisDurumu.hucreler`; 4 aşama `(şimdi − başlangıç) / süre` ile türetilir; aynı anda 2 kuyruk; `insaat_iptal` %50 iade; ilk 5 yapıda %30 indirim; onboarding hızlandırması. | Kuyruk, iptal ve indirim özellik testleri; aşama türetimi deterministik | E20-G2 | M | P0 | Yapılacak |
| E20-G5 | 18 yapı içeriği ve eşleme | Parsel kipi parametreleri: 18 yapının yuva ve inşa süreleri ([11 §7.3](11-urun-donusu.md#73-yapılar-18-tür)); mevcut tesis ve yöntemlerin eşlenmesi (`ciftlik` → Tarla, maden ocakları → Maden, `santral`/`hidro_santrali` → Santral ...); Ambar, Garaj, Atölye-Lab, Ticaret ofisi, Konut yeni. | Her yapı en az bir yöntemle üretir ya da işlev görür; bot koşusunda ölü yapı yok | E20-G4 | M | P0 | Yapılacak |
| E20-G6 | Arazi fiyatı, sınırlar, vergi ve bakım | Hücre başı taban 1.000 / 2.500 / 6.500 ₺ × (1 + 2·satılmış pay); oyuncu başına ilçede ≤72 hücre ve ≤%25; haftalık %1 arazi vergisi (tembel tahakkuk); büyüklüğe göre artan bakım. | Fiyat ve tavan özellik testleri; vergi tahakkuku tembel ve deterministik | E20-G2 | M | P0 | Yapılacak |
| E20-G7 | Hareketsizlik merdiveni ve tatil modu | 14 gün uyku, 45 gün %2/gün çürüme, 90 gün azalan fiyatlı açık artırma (gelir borç düşülerek eski sahibe), yılda 30 gün tatil. | Merdiven zaman testleri; açık artırma muhasebesi testi | E20-G6 | M | P1 | Yapılacak |
| E20-G8 | Yeni oyuncu paketi (H6) | ₺50.000 hibe; doluluğu düşük ilçede 6 hücrelik bedava yurt; her ilçede hücrelerin %20'si yeni oyunculara ayrılır; 14 günlük kalkan. E11-G5 ve E9-G8'in yerine. | Ayrılmış pay ve kalkan testleri; geç katılan bot yurt alır | E20-G6 | M | P0 | Yapılacak |
| E20-G9 | İlçe gelişim seviyesi ve ortak projeler | Köy → Kasaba (nüfus 5.000 ve ≥10 sahip) → Merkez → Şehir; S/M/L ve yeni türlerin kilidi; ortak projeler (köprü, liman, baraj, demiryolu) Alfa-1. | Seviye atlama testi; kilit açma testi; eşikler kalibrasyon raporunda | E20-G5 | L | P1 | Yapılacak |
| E20-G10 | Botların parsel kipine taşınması | Yeni katılım komutu, hücre seçimi adımı (al → kur), `kenar_gelistir` ve askeri rezerv adaylarının kaldırılması; arketipler [11 §8.2](11-urun-donusu.md#82-bot-arketipleri). **Sprint 2'nin ilk işi.** | 8 arketip parsel kipinde 30 gün koşar; 1k bot ölçütü (E20-G3) | E20-G2, E12-G11 | L | P0 | Yapılacak |
| E20-G11 | Parsel kipinde kalkan ve taşınan komutlar | `kenar_gelistir` ve `askeri_rezerv` parsel kipinde kapalı; `vergi_ayarla` ve D4 yasaları il hükümetine; il nüfus vergisi il hazinesine. | Kapalı komutlar Türkçe ret mesajı döndürür; bölge kipi değişmez | E20-G2 | M | P1 | Yapılacak |

### E21 — MapLibre drill-down ve inşa modu (F4)

**Yeni (1 Ekim, K26, K27).** E2'nin yakın plan işlerinin ve E10-G5 onboarding'in yerine geçer. L1–L3 MapLibre, parsel ve inşa modları, Giriş / Yerleş, socket bağdaştırıcısı. Ayrıntı: [11 §9](11-urun-donusu.md#9-arayüz-v1), [arastirma/arayuz-ux](arastirma/arayuz-ux.md). **Sahiplik:** `istemci/src/harita/**` (yeni); `komut/kayit.ts` F0'dan sonra bu epikte.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E21-G1 | MapLibre kademeli yakınlaşma ve hücre seçimi (S8) | Tembel MapLibre katmanı L1–L3; `fitBounds` geçişleri; hücre seçimi (tık, shift-tık, telefonda "Çoklu seç"); satın alma alt çubuğu; sahte bağdaştırıcıyla. **Sprint 1, harita ajanı.** | Playwright: il → ilçe → hücre seçimi; seçim anlık | E19-G1, E19-G2 (fikstürler) | L | P0 | Devam ediyor |
| E21-G2 | Kırıntı yolu ve arama | `Türkiye › Kocaeli › Gebze › Parsel #…`; telefonda `‹ Gebze`; aksan duyarsız arama (`toLocaleUpperCase('tr')`), il / ilçe / mülklerim grupları. | "golcuk" → Gölcük; "İ/ı" testleri; her parça tıklanır | E21-G1 | S | P1 | Yapılacak |
| E21-G3 | Parsel kartı ve sahiplik renkleri | Senin: mavi dolgu; başkası: gri çizgi + ad; satılık: kesikli; alınamaz: taralı. Kart: arazi kullanımı, komşular, ilçe doluluğu ("Gebze: %62 dolu"). | Renk körü simülasyonunda ayırt edilir (ikinci kanal); kart verisi sunucudan | E21-G1 | S | P0 | Yapılacak |
| E21-G4 | İnşa modu | Yapı paleti; hayalet (mavi geçerli / turuncu taralı geçersiz + kısa neden); R ile döndürme; maliyet kartı "gereken / var"; Taslak modu; 4 parçalı aşama çubuğu ve bitiş saati; 2 kuyruk; telefonda ✓ ↻ ✕. | Geçersiz yerleştirme gönderilmez; aşama çubuğu sunucu zamanıyla tutarlı | E21-G1, E20-G4 | L | P0 | Yapılacak |
| E21-G5 | Socket bağdaştırıcısı ve parsel kapsamı | `sim.worker.ts` yerine WebSocket bağdaştırıcısı; `komut/kayit.ts`'e `kapsam: "parsel"`; komut sonucu ve Türkçe hata metinleri. | Aynı komut formları sahte ve gerçek sunucuyla çalışır | E18-G2, E1-G10 | M | P0 | Yapılacak |
| E21-G6 | Giriş / Yerleş ekranı ve ilk 10 dakika | Oturum açma; 3 önerilen ilçe ve nedeni; yol seçimi (Tarımcı, Sanayici, Tüccar), yol başına 5–7 hedef; rehber hedef kartı; devlet seçimi ekranının yerine. E10-G5'in yerine. | Yeni oyuncu ilk 10 dakikada ilk hücresini alır ve Tarla kurar (5 kişilik gözlem) | E21-G1, E18-G6, E20-G8 | M | P0 | Yapılacak |
| E21-G7 | Mercek çubuğu | 8 mercek (6 katman + Sahiplik + Fiyat), 1–8 tuşları, aynı anda bir; seçili yapı için durağan noktalı lojistik rotası. | Mercek kapalıyken çizim çağrısı artmaz; renk + şekil kanalı | E21-G1 | M | P1 | Yapılacak |
| E21-G8 | Bina paneli ve Dikkat entegrasyonu | Durum, tek rozetin nedeni, üretim, inşa kuyruğu, yükseltme (S→M→L karşılaştırması), iptal; Dikkat maddesinden "Git". | H4 sorusu "fabrikam neden yavaş?" panelden yanıtlanır | E1-G10, E21-G4 | M | P0 | Yapılacak |
| E21-G9 | Telefon düzeni | Üç yükseklikli alt sayfa; alt sekmeler (Harita, İnşa, Dikkat, Pazar, Devlet); yatayda yan sayfa; ≥44 px hedefler. | 390×844'te tüm akış yatay kaydırmasız; Playwright mobil senaryosu | E21-G4 | M | P1 | Yapılacak |
| E21-G10 | Küre L0 ↔ MapLibre L1 geçişi | `fitBounds` 600–900 ms, azaltılmış harekette anında; ortak kamera hedefi; bellek temizliği. E2-G6'nın yerine. | 10 ardışık geçişte bellek sızıntısı yok (Playwright) | E21-G1 | M | P1 | Yapılacak |
| E21-G11 | Uçtan uca F4 kabulü | Playwright: giriş → Yerleş → hücre al → Tarla kur → tamamlanır → satış görünür; masaüstü ve mobil ekran görüntüleri. | Senaryo CI'da yeşil (Alfa-0 kapısı A0-6) | E21-G4…G6, E18-G3 | M | P0 | Yapılacak |
| E21-G12 | Katman ekranları | Pazar, Teknoloji ve Devlet tam ekran sayfaları; her biri kendi merceğiyle açılır; "Dünya Piyasa Yapıcısı" etiketi. | Üç sayfa klavyeyle gezilebilir; Türkçe biçim kuralları | E21-G7, E10-G2 | L | P1 | Yapılacak |

### E22 — Yürüyüş modu (F5)

**Yeni (1 Ekim, K28).** E2'nin yakın planda dolaşma, bina ve arazi işlerinin yerine geçer. Ayrı three.js sahnesi, kayan orijin, kendi kinematik kontrolcümüz, Quaternius CC0 karakter. Alfa-1'de açılır, paralel geliştirilir. Ayrıntı: [arastirma/sokak-seviyesi-3d](arastirma/sokak-seviyesi-3d.md) §2–3, §6–7. **Sahiplik:** `istemci/src/yuru/**` (yeni).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E22-G1 | Karo ve geometri kanıtı | Bir ilçenin Protomaps z15 özütü; worker'da `pmtiles` + `@mapbox/vector-tile` + `pbf` + `earcut` ile ~2×2 km için zemin, yol şeritleri, ekstrüde binalar; aktarılabilir tipli diziler. | Karo başına aktarım ≤150 KB; ≤60 çizim çağrısı; entegre GPU'lu dizüstünde 60 fps (hedef) | E19-G2 | M | P1 | Yapılacak |
| E22-G2 | Sahne, kayan orijin ve arazi | Yerel metre çerçevesi; Mapterhorn DEM çift doğrusal örnekleme; yolların ve binaların zemine oturtulması. | 2×2 km dışına çıkınca orijin kayar, titreme yok; arazi atfı ekranda | E22-G1, E19-G5 | M | P1 | Yapılacak |
| E22-G3 | Kinematik kontrolcü | Tıkla-git (birincil) ve WASD; 2B daire–ayak izi çarpışması, uzamsal karma, duvarda kayma; Rapier yok. | Karakter binaların içinden geçmez (test); kare süresi bütçede | E22-G2 | M | P1 | Yapılacak |
| E22-G4 | Karakter ve kamera | Quaternius Universal Base Characters + Animation Library (CC0); GLB ≤1,5 MB (meshopt/Draco); takip kamerası; örten binaları soldurma, yapıya girince çatı kesme. | Karakter yüklenir ve yürür/durur animasyonu oynar; kamera engelde kaybolmaz | E22-G3 | M | P1 | Yapılacak |
| E22-G5 | Etkileşim ve geçişler | `[E] Fabrikaya gir` hapı (telefonda tek düğme); 120 px mini harita; L3'te "Burada yürü" (~1 sn iniş), **M** ile haritaya dönüş; ortak kamera hedefi. | Haritadan yürüyüşe ve geri geçişte oyuncu yerini kaybetmez (Playwright) | E22-G4, E21-G1 | M | P1 | Yapılacak |
| E22-G6 | Örneklenmiş yapılar ve inşa aşamaları | Yapı türü başına parça başına `InstancedMesh` (≤~1.000 örnek); temel çıkartması, iskele, kırpma düzlemiyle büyüyen gövde, bitmiş ağ; 18 yapı için düşük çokgenli özgün ya da CC0 modeller (E2-G4'ün yerine). | Aşamalar sunucu zamanıyla tutarlı; çizim çağrısı bütçede | E22-G1, E20-G5 | L | P1 | Yapılacak |
| E22-G7 | Telefon kontrolleri ve gerçek cihaz ölçümü | Dokun-git + dinamik joystick; ≥44 px; düşük/orta Android ve iOS Safari'de fps, ısınma, bellek. | Orta telefonda 30+ fps gerçek cihazda ölçüldü (Alfa-1 kapısı A1-2) | E22-G5, E14-G3 | M | P1 | Yapılacak |
| E22-G8 | Diğer oyuncuların görünmesi | İlgi alanındaki oyuncuların seyrek konum güncellemesiyle avatar olarak görünmesi (açık konu Ü14). | Karar notu; uygulanırsa bant genişliği ölçümü | E22-G5, E18-G5 | M | P2 | Yapılacak |

### E23 — Yönetişim ve seçimler (F6)

**Yeni (1 Ekim, K25).** [08](08-alti-katman.md) D1–D7 oyuncu düzeyinden il hükümetine taşınır; muhtar ve vali seçilir; hafif askeri ve H5 korumaları. Alfa-0'da NPC vali, varsayılan yasalar. E9'un mekaniklerini kullanır; E10-G4 ve E11-G6'nın yerine geçer. Ayrıntı: [11 §7.6–7.7](11-urun-donusu.md#76-roller-ve-yönetişim). **Sahiplik:** çekirdek ajanı (F3'ten sonra), arayüz için istemci ajanı.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E23-G1 | İl hükümeti ve NPC vali | D1–D7 (ihtiyaç kademeleri, istikrar, göç, 7 yasa, 3 bütçe kolu) il düzeyinde; il hazinesi; seçim yokken NPC vali varsayılan yasalarla (Alfa-0). | Alfa-0'da yasalar varsayılan, il hazinesi muhasebesi testli; bölge kipi değişmez | E20-G11, E9-G1…G5 | XL | P1 | Yapılacak |
| E23-G2 | İlçe meclisi ve muhtar seçimi | 14 günde bir; oy hakkı son 7 günün ≥3'ünde aktif parsel sahipleri, hesap başına 1 oy; meclis yetkileri: arazi vergisi %0,5–3, imar payları, ortak proje önceliği. | Seçim takvimi ve oy hakkı testleri; yetki sınırları testli | E23-G1, E18-G6 | L | P1 | Yapılacak |
| E23-G3 | Vali seçimi ve yetkileri | Muhtarlar arasından 28 günde bir; 7 yasa (72 sa bekleme), bütçe, savaş, anlaşma; komutlar `aday_ol`, `oy_ver`, `yasa_cikar`, `butce_ayarla`. | Komut yetki testleri; bekleme süresi testi | E23-G2 | L | P1 | Yapılacak |
| E23-G4 | Yasaların parsellere etkisi | `tarim_koruma` ildeki tüm çiftlikler; `sanayi_tesviki` inşa ×0,75 + kirlilik; `enerji_onceligi` kesinti sırası; etki matrisi (E9-G9). | Her yasa için etki + bedel testi; H4 sorusu "hangi yasa beni etkiliyor?" yanıtlanabilir | E23-G3 | M | P1 | Yapılacak |
| E23-G5 | Hafif askeri | Ordugâh (3 yuva, 12 sa); mühimmat + gıda → birlik (6–24 sa partiler); il komutanlığı havuzu; vali ilanı, 12–24 sa hazırlık, 24 sa pencere; savunanın seçtiği 4 sa yoğun saat bandı; kazanım = ilçe kontrolü. E10-G4'ün yerine. | İlan → hazırlık → pencere → çözüm akışı testli; parsel `sahip`'i asla değişmez (test) | E23-G3, E20-G5 | L | P1 | Yapılacak |
| E23-G6 | H5 korumaları | Pencere başına ≤%25 depo stoku; yapıların ≤%10'u devre dışı, yıkılmaz; aynı ilçeye ≥49 sa; 14 gün kalkan; 1:5 servet oranı; 0 parsel kaybı. E11-G6'nın yerine. | Akıncı vs pasif bot koşusunda H5 geçer (Alfa-1 kapısı A1-3) | E23-G5 | M | P1 | Yapılacak |
| E23-G7 | Devlet ve seçim arayüzü | Vali ekranı, yasa kartları (bedel ve bekleme), bütçe kaydırıcıları, aday listesi ve oy pusulası, seçim takvimi. E10-G3'ü kapsar. | 7 yasa kartı görünür; oy verme uçtan uca | E23-G3, E21-G12 | L | P1 | Yapılacak |
| E23-G8 | Şirketler ve loncalar (v1.5) | Ortak hazine, ortak yapı, iç transfer; aklamaya karşı yeni hesap transfer tavanları. | Karar notu ve tasarım taslağı | E23-G3, E18-G8 | L | P2 | Yapılacak |
| E23-G9 | Ülke düzeyi NPC çerçeve | Sabit taban tarifeler; oyuncu il federasyonları v1.5. | Tarifeler parametre dosyasında; tarife hazine muhasebesi testli | E23-G1 | S | P2 | Yapılacak |

### E24 — Alfa operasyonları (F7)

**Yeni (1 Ekim, K32, K34).** Hetzner + Postgres + Cloudflare; yedek ve geri yükleme; metrikler; yük testi; yönetici paneli; atıf; davetli kohort; hukuki görüş. E11-G7'nin yerine geçer. Kapı ölçütleri: [04 §9.2–9.3](04-yol-haritasi.md#92-alfa-0-kapısı-davetlilere-açmadan-önce).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E24-G1 | Altyapı kurulumu | Hetzner CX33 + aynı makinede Postgres; Cloudflare proxy (WebSocket), Turnstile, R2; Node sürümü pinli; dağıtım betiği. | Staging ve üretim ortamı ayakta; WebSocket proxy arkasında çalışıyor (doğrulanacak) | E18-G3 | M | P0 | Yapılacak |
| E24-G2 | Yedek ve geri yükleme tatbikatı | WAL arşivi + gecelik `pg_dump` → R2; aylık tatbikat: geri yükle → kuyruğu oynat → `durumOzeti` karşılaştır. | Tatbikat özet eşitliğiyle geçer (Alfa-0 kapısı A0-3) | E24-G1, E18-G4 | M | P0 | Yapılacak |
| E24-G3 | Metrikler ve uyarılar | Tik gecikmesi, günlük yazma gecikmesi, çözüm süresi, bağlantı sayısı; eşik uyarıları. | Panoda canlı metrikler; uyarı testi | E24-G1 | S | P0 | Yapılacak |
| E24-G4 | Yük testi | Alfa-0 için 100 bot, Alfa-1 için 1k bot; `@bolge/botlar` yük üreteci olarak. E11-G7'nin yerine. | Yük test raporu: komut/sn, gecikme, çözüm süresi (Alfa-0 kapısı A0-4) | E24-G1, E20-G10 | M | P0 | Yapılacak |
| E24-G5 | Yönetici paneli | Davet listesi, hesap yönetimi, telafi komutları (geri alma), kural dönemi tetikleme, duyuru. | Yönetici işlemleri günlüğe sistem komutu olarak yazılır | E24-G1, E18-G7 | M | P0 | Yapılacak |
| E24-G6 | Atıf ekranı | "ⓘ" içinde: © OpenStreetMap katkıcıları, Protomaps, Mapterhorn / Copernicus, Natural Earth, Quaternius ve diğer kaynaklar (E15-G2 envanterinden). | Her kullanılan veri ve varlık kaynağı lisans ve atıf metniyle ekranda (Alfa-0 kapısı A0-7) | E15-G2, E19-G6 | S | P0 | Yapılacak |
| E24-G7 | Kural dönemi provası | Staging'de son 24 sa yeni derlemeyle gölge yeniden oynatma, sapma raporu; dönem geçiş prosedürü yazılı. | Prova yapıldı, rapor arşivde (Alfa-0 kapısı A0-5) | E18-G7, E24-G1 | S | P0 | Yapılacak |
| E24-G8 | Davetli kohort ve gözlem | ≤200 davetli; geri bildirim kanalı; D1/D7/D30 gözlemi; H4 insan testi (5 kişi). E12-G9 ile birlikte. | Gözlem raporu (eşik yok, hipotez olarak); H4 sonucu | E21-G11, E12-G6 | M | P1 | Yapılacak |
| E24-G9 | Hukuki görüş ve metinler | ODbL (Üretilmiş Eser, türetilmiş veri), kişisel veri ve gizlilik metni, kullanım koşulları; açık alfadan önce dış görüş. E15-G4 ile birlikte. | Yazılı görüş (Alfa-1 kapısı A1-6) | E19-G6, E15-G4 | M | P1 | Yapılacak |
| E24-G10 | Kademeli ilçe açılışı ve Balkanlar | Açık ilçeler %70 doluluğu geçince yeni ilçe açılır; Alfa-1'de Balkan illeri; açılış komutu yönetici panelinden ve günlüğe yazılır. | Açılış kuralı testli; açılış sonrası özet deterministik | E24-G5, E19-G7 | S | P1 | Yapılacak |

---

## 4. Sahibin kararını bekleyen konular

> **Güncelleme (1 Ekim).** Şu maddeler kapandı: **1** sınır/isim (K33: gerçek il/ilçe adları, NPC ülke çerçevesi), **5** dolaşma (K28: 3D karakterle yürüyüş), **6** ODbL (K24: OSM kabul), **8** çok oyunculu zamanlaması (K23: baştan), **12** sahipsiz bölgeler (bölge atama kalktı; arsa ile başlangıç, K25). **2** dilim genişletme: Alfa-0 Kocaeli + Sakarya + Bursa, Balkanlar Alfa-1 (K32). **3** teknoloji düğüm sayısı Alfa-1 sonrasına ertelendi. **13** hukuki inceleme açık alfadan önce zorunlu (K34). Ürün dönüşünün yeni açık konuları (Ü1–Ü14): [11 §12](11-urun-donusu.md#12-açık-konular).

| # | Konu | Seçenekler | Önerim (gerekçe) | Etkilenen | Kaynak |
|---|---|---|---|---|---|
| 1 | **Sınır ve isim politikası (A2)** | (a) Taslağı onayla: kurgusal devletler, nötr bölge adları, ihtilaflı alanlar dilim dışı; (b) gerçek ülke adları | **(a).** Balkan/Karadeniz diliminde ihtilaflı bölgeler var; kurgusal devlet + bölge yönetimi hem hassasiyeti hem hukuki riski azaltır. Sahibin "gerçek dünya" beklentisi **coğrafya** ile karşılanır, **siyaset** kurgusaldır | E3, E15 | [00 A2](00-vizyon-ve-kararlar.md), DATA_SOURCES §6 |
| 2 | **Gerçek dilimin genişletilmesi (A1)** | (a) Önce Karadeniz diliminde H4 + ilk insan testi, sonra ikinci dilim; (b) hemen çok dilim/dünya | **(a).** Sim ölçeği ve H1/H2 yeniden ölçümü tek dilimde bile açık; dünya görseli (E3-G7) ise oyun bölgesinden bağımsız hemen yapılabilir. İkinci dilim adayını siz seçin | E3-G8, E14-G4 | [00 A1](00-vizyon-ve-kararlar.md) |
| 3 | **Teknoloji düğüm sayısı (A11)** | PDF 5–8 · öneri ≈ 17 (2–4/katman, derinlik ≤ 4, iki dışlayan çift) | **≈ 17.** Katman başına yinelenen karar için gerekli; ağaç tek ekranda sığ kalır. Ara yol: önce ≈ 11, B6'da 17 | E7, E17-G2 | [00 §4](00-vizyon-ve-kararlar.md), [08 §4](08-alti-katman.md#4-teknoloji) |
| 4 | **6. katmanın (Devlet) kapsamı ve yasa sayısı** | 5 yasa (gece planı) · 7 yasa (docs/08); 3 bütçe kolu; yasa oyuncu düzeyinde | **7 yasa, 3 kol.** "Diğerlerini yöneten" beklentiniz için her katmana en az bir kol gerekir (tarım sübvansiyonu, sanayi teşviki, tarife, araştırma bütçesi, seferberlik, enerji). Sayıyı 5'e düşürmek enerji ve eğitimi dışarıda bırakır | E9, E10-G3 | [08 §6](08-alti-katman.md#6-devlet) |
| 5 | **"Dolaşma" = kamera mı, avatar mı?** | (a) serbest uçuş kamerası; (b) 3D avatar (Capital Rift'te 3D karakterler geçer; tek kaynak) | **(a) önce.** K1 gereği oyuncu yöneticidir; avatar ek içerik/ağ yükü getirir. Avatarı kapı 3 sonrası yeniden tartışın | E1-G3, E2-G7, E14 | [arastirma/3d-teknoloji §4](arastirma/3d-teknoloji.md) |
| 6 | **Yakın plan veri lisansı (ODbL)** | (a) OSM/Overture/Protomaps altlığı + ayrı ODbL dosyası; (b) yalnız Natural Earth + prosedürel bina | **(b) ile başlayıp (a) için hukuki görüş alın.** Gece planı v1'de OSM türevi istemedi; Capital Rift benzeri bina/sokak hissi ise (a) ister | E2, E15-G3 | [araştırma §4](arastirma/acik-kaynak-ve-veri.md) |
| 7 | **Gelir modeli (A4)** | İlkeyi kilitle, modeli sonraya bırak · şimdi seç | **İlke kilitli (pay-to-win yok), model Kapı 3 sonrasına.** Capital Rift'in gelir yöntemi bilinmiyor; prototipte ödeme yok | E16 | [00 A4](00-vizyon-ve-kararlar.md) |
| 8 | **Çok oyunculu sunucu zamanlaması (A8)** | (a) Kapı 2 sonrası paralel başla; (b) H4 insan testinden sonra | **(a) sınırlı:** ADR ve yetkili sunucu çekirdeği (E11-G1/G2) sprint 2–3'te; istemci senkronu (E11-G4) H4'ten sonra. Determinizm zaten hazır, risk düşük; ama tek yazar çekirdek darboğazı var | E11 | [00 A8](00-vizyon-ve-kararlar.md), [03 §8](03-teknik-mimari.md) |
| 9 | **H4 eşiği (A5)** | PDF: ≥ 4/5 yanıtlayamazsa vazgeç · öneri: ≥ 4/5 doğru ve ≤ 60 sn | **Öneri.** PDF ölçütü 5 kişiden 2'si yanıtlasa da geçer; n = 5 kanıt değil, problem bulucudur | E12-G6 | [04 §5](04-yol-haritasi.md) |
| 10 | **H6 tanımı ve yetişme (A6, A7)** | Tanımı onayla; C6–C9'u yalnız H6 düşerse ekle | **Onayla, koşullu tut.** H6 şu an %66,7 (v0.1) | E12-G7, E9-G8 | [00 A6–A7](00-vizyon-ve-kararlar.md) |
| 11 | **Eşik disiplini** | Eşik değişikliği gerekçeli ve sahip/lider onaylı · serbest | **Gerekçeli + lider onaylı** (hedef kaydırmayı önler) | E12 | [04 §3](04-yol-haritasi.md) |
| 12 | **Sahipsiz/boş bölgeler** | Uykuda (üretmez) · bot yönetimli canlı dünya | **Uykuda kalsın (v0.1 kararı, geç katılanı korur);** "canlı dünya" hissi için sonra bot yönetimi değerlendirilsin | E11-G5, E9 | [05 §2](05-ilk-olcum-raporu.md) |
| 13 | **Hukuki inceleme (A13)** | Yayından önce dış görüş · iç değerlendirme | **Dış görüş**, ODbL ve harita kuralları için; bütçe ve zaman sahibe ait | E15-G4 | [00/04 A13](04-yol-haritasi.md) |
| 14 | **Ürün adı ve Capital Rift ilişkisi** | Özgün ürün kimliği · "Capital Rift'in versiyonu" çağrışımı | **Özgün kimlik;** ilham alınan tek şey görünür ağ hissi | E15-G7 | [01](01-rakip-ve-pazar-arastirmasi.md) |
| 15 | **Platform önceliği ve dil** | Masaüstü öncelikli + orta mobil hedefi · mobil birincil; yalnız Türkçe · İngilizce de | **Masaüstü öncelikli, mobil 30 fps hedefi; Türkçe başlangıç, metinler i18n'e hazır** (K11 Türkçe der) | E14, E1-G8 | [00 K11](00-vizyon-ve-kararlar.md) |

Kapanmış kararlar (bilgi): kalıcı dünya ve "sezon" sözcüğünün yasağı (K10, K21); 3D = stilize küre + yakın plan (K17); ilk dilim Türkiye + Balkanlar + Karadeniz (K18); altı katman ve iklim takvimi (K19, K20); GPL/AGPL kod kopyalanmaz (K22).

---

## 5. Sprint 1: ürün dönüşü (1 Ekim)

**Mantık.** Kritik yol tek sıradır: serileştirici → mülk modeli → istemci entegrasyonu → Alfa-0. Çekirdekte aynı anda tek yazar çalışır (S2 → S3). Veri, görsel ve harita işleri paralel yürür. En çok 4–5 ajan aynı anda çalışır. **Sıra:** S1 (takım lideri) ile S2, S5, S6 ve S7 paralel → S3, S4, S8, S9. Ölçümler her zaman sabit commit'ten açılan ayrı bir git worktree'de koşar. Plan ve kabul ölçütleri: [11 §13](11-urun-donusu.md#13-sprint-1-ilk-sprint).

| # | Görev | Görev kimliği | Sahip (dosyalar) | Bağımlılık | Kabul | Durum |
|---|---|---|---|---|---|---|
| S1 | ADR (docs/11), docs/00 K23+, araştırmaların Türkçe belgeleri, mülk sözleşmesi taslağı (`tipler.ts`) | E20-G1 | Takım lideri (`docs/**`, `cekirdek/src/tipler.ts`) | — | Tipler derleniyor | Devam ediyor |
| S2 | Serileştirici + `Simulasyon.yukle` + yeniden oynatma testleri | E18-G1 | Çekirdek ajanı (`cekirdek/src/serilestir.ts`, `motor.ts`) | — | 20 rastgele noktada özet eşit; tüm testler yeşil | Devam ediyor |
| S3 | Büyüyebilen düğüm + işletme + `parsel_al`/`tesis_insa{hucreler}` (bayrak arkasında) | E20-G2 | Çekirdek ajanı, S2'den sonra (`cekirdek/src/mulk/**`, `derle.ts`, `lojistik/akis.ts`) | S1, S2 | Bölge kipi birebir; parsel özellik testleri | Devam ediyor |
| S4 | `packages/protokol` + `packages/sunucu` (ws, günlük ve anlık görüntü, bellek içi + pg bağdaştırıcı, hız sınırı) | E18-G2, E18-G3 | Sunucu ajanı | S2 (önce taslakla) | kill/restore testi; iki istemci uçtan uca | Devam ediyor |
| S5 | OSM il/ilçe hiyerarşisi + il→bölge eşlemesi | E19-G1 | Veri ajanı (`veri-hatti/src/osm/**`) | — | 81 il / ~973 ilçe; determinizm | Devam ediyor |
| S6 | Gebze için PMTiles + z20 hücre uygunluk denemesi; boyut raporu | E19-G2 | Veri-2 ajanı (`veri-hatti/src/osm/izgara*`, `docs/olcum/`) | — | Karo boyutu ölçüldü | Devam ediyor |
| S7 | F0 sakin görsel + Dikkat paneli + rozetler | E1-G10 | İstemci ajanı (`istemci/src/{kure,akis,arayuz}`, `kayit.ts`) | — | Akış yok; ekran görüntüleri | Devam ediyor |
| S8 | MapLibre kademeli yakınlaşma, hücre seçimi, satın alma alt çubuğu (sahte bağdaştırıcıyla) | E21-G1 | Harita ajanı (`istemci/src/harita/**`) | S5/S6 fikstürleri | Playwright: il → ilçe → hücre seçimi | Devam ediyor |
| S9 | H1–H9 yeni tanımları + sentetik parsel fikstürü üreticisi | E12-G11 | Ölçüm ajanı (`veri/src/uretici/**`, `olcum`, docs) | S1 | Fikstür doğrulanıyor | Devam ediyor |

Arka planda: **E12-G1** v0.3 bölge kipi ölçümü (worktree `1a7fe08`) sürüyor; sonucu donmuş temel çizgi olarak arşivlenir.

**Sprint sonu beklenen çıktı:** serileştirici ve sunucu iskeleti (iki istemci uçtan uca), 81 il / ~973 ilçe ağacı ve Gebze karo raporu, akışsız sakin küre, MapLibre'de il → ilçe → hücre seçimi, parsel fikstürü ve H1–H9 tanımları; mülk modeli bayrak arkasında başlamış. S3 iki sprinte taşabilir. **Sprint 2 adayları:** E20-G10 (botların parsel kipine taşınması, ilk iş), E20-G3…G6, E18-G4…G6, E21-G4…G6, E19-G3/G4/G6/G8, E22-G1.

### 5A. Sprint A0-02: Alfa-0 yolu, birinci dalga (1 Ekim akşam)

**Mantık.** Toplantı notu 1 §6'daki yolun 1–3. adımları: istemci kusurları ve yükseltme formu, P4 (ekmek zinciri + dükkân) ve P5 (cam → pencere), gerçek giriş. Askeri 0a sonraki sprintte ([12 §14](12-yon-taslagi.md)). Ar-Ge kodlamadan önce gelir: çekirdek işleri G4 şartnamesi baş lider onayından geçmeden başlamaz. Çekirdekte aynı anda tek yazar (G6 → G7 → G8). Görevler ofis Task Board'unda `SPRINT-A0-02` altında; sonuç raporları `docs/agent-results/`.

| # | Görev | Sahip | Bağımlılık | Kabul | Durum (1 Ekim akşam, P4 sonrası) |
|---|---|---|---|---|---|
| G0 | Windows'ta yeşil temel çizgi (`.gitattributes` LF, dizin fsync, `packageManager`) ve kararların kaydı | Baş lider | — | `pnpm kontrol` 0 kırmızı | Tamamlandı (`a07b30e`) |
| G1 | İstemci kusur turu (toplantı notu §5, 8 madde) ve tek para biçimi `1.234 ₺` | İstemci | G0 | Önce/sonra ekran görüntüleri; e2e yeşil; `dunya.html` ≤ 400 KB | Sürüyor: tek para biçimi, toast ve küre/arsa görseli (T1, T2) P4'te girdi; K1 mantık yığını (G2 dahil) ve kalan T1 dalları P5 kapısında |
| G2 | Ölçek yükseltme formu ek hücre gönderir (`ekHucreler`) | İstemci | G1 | S → M yükseltmesi sunucuda kabul (e2e) | Bekliyor: K1 `g2-olcek` P5 kapısında |
| G3 | Alfa-0 ilçelerinde arsa ızgarası (önce Gemlik, Körfez; sonra 3 il), üretilmiş manifest | Veri | G0 | Boyut raporu; istemci ve sunucu aynı veriyi okur | Ara teslim girdi: Gemlik, Körfez ve Gebze manifestte (aşağıdaki not); sunucunun ızgarayı manifestten okuması (`k2/izgara-yukle`, ilçe nüfusu dahil) ve istemcinin tabloyu manifestten okuması (K1) bekliyor |
| G4 | Ar-Ge: P4/P5 uygulama şartnamesi (yerel pazar kanalı, `dukkan` S, tarifler, komutlar) | Ar-Ge | G0 | Baş lider onayı | Şartname girdi (A3 iki parça, A2 ekonomi; yerel talep kalibrasyonu, `yerelOlcek` 40); G6 şartnameye göre başladı; son düzeltmeler P5 kapısında |
| G5 | Sunucu: e-posta bağlantısıyla giriş (KIMLIK.md, Google yok) | Sunucu | G0 | `--uretim`'de geliştirme kimliği kapalı; uçtan uca giriş testi | Girdi (P4): e-posta bağlantısı, davet listesi (boş liste açılışı durdurur), görünen ad, `sql/006`, deploy ve kontrol listesi 11-12; Postgres doğrulaması şema 6/6 ve testler geçti (`pg.test.ts` yakalanmamış 57P01 hatası için K2 düzeltmesi `k2/pg-57p01` kapı sırasında). Kalan: hesap silme (K2, P5), gerçek e-posta göndericisi yok |
| G6 | Çekirdek P4a: ekmek zinciri (`degirmen` + kepek, `ekmek_firini`) | Çekirdek | G4 | Bot zinciri tamamlar; bölge kipi altınları aynı | Sürüyor: G6-1 (yöntem şeması, kimlik kilidi) ve G6-2a (mülk kipi süzgeci, yöntem komut yolu, `yontemGecersizKilma`) girdi; G6-2b (şebeke) ve G6-4 kanıt testleri P5 kapısında |
| G7 | Çekirdek P4b: yerel pazar kanalı + `dukkan` S | Çekirdek | G6 | Determinizm, serileştirme, para korunumu | Başladı: yerel pazar saf modülü (şartname §6.4-6.6) ve G7-1a veri şeması (V1-V12, ilçe nüfusu alanı) girdi; G7-1b (derle) P5 kapısında |
| G8 | Çekirdek P5: cam → pencere, yapı market | Çekirdek | G7 | Bot zinciri tamamlar | Bekliyor (G7) |
| G9 | İstemci: giriş ekranı ve dükkân paneli | İstemci | G2, G5, G7 | Gerçek tıklamayla e2e | Bekliyor (G2, G7); giriş akışı belgesi (A1), `giris.css` ve dükkân paneli CSS'i (T1) girdi, K1 mantığı (`g9a-giris-mantik`) P5 kapısında |
| G10 | Uçtan uca test (A0-6), dogfood, insan testi kılavuzu | Test | G8, G9 | Masaüstü ve telefon e2e; `docs/toplanti/3/` | Kısmen: insan testi kılavuzu ve pilot paketi (adım betiği, gözlemci formu, ölçüt tablosu) girdi; uçtan uca ve dogfood bekliyor |

**G10 öncesi kontrol listesi.**
- Yerleş'teki üç ilçe de oynanabilir (arsa ızgarası ve manifest); taze hesapla doğrulandı. Kaynak: [ilk-saat-ekran-incelemesi](arastirma/ilk-saat-ekran-incelemesi.md) B1 ve insan testi kılavuzu Ö2. Sahipleri: K1'in izgara-manifest dalı ve K2'nin izgara-yukle dalı.

**G3 notu (O3).** Gemlik ve Körfez z20 ızgarası üretildi; tek kayıt `packages/veri/haritalar/odbl/izgara/manifest.json` (boyutlar: [izgara-boyut-g3](olcum/izgara-boyut-g3.md)). Kalan işler: istemci `IZGARALI_ILCELER` tablosunu manifestten okumalı (K1; yama hazır), yoksa Yerleş ekranı "yakında" demeye devam eder. Sunucu ilçeyi hâlâ parsel fikstürü JSON'uyla alıyor; 3 ilçe 70 MB ve 1,15 GB bellek, 3 ilin ~48 ilçesi bu yolla sığmaz: sunucunun ızgarayı manifestten okuması. Üç ilin kalanı (Kocaeli 10, Sakarya 16, Bursa 16 ilçe) bu sprintte yok. Depo politikası (baş lider): Git'e yalnız BHI1, manifest ve küçük test verisi girer; şerit ve PMTiles gibi büyük dosyalar depoya girmez (LFS yok), dağıtımda veri hattından üretilir ve manifestteki sha256 ile doğrulanır (Gemlik ve Körfez şeritleri ~466 KB bu kez istisna). Barındırma ve CDN açık sahip kararıdır (A-2). Sunucunun BHI1'i manifestten okuması (G3b) bu sprintte K2'nin; istemci yaması K1 üzerinden. Zincir: K3 hücre dizini → K2 ızgara yükleme → K1 ızgara manifesti.

### 5.0 Önceki sprint taslağı (1 Ekim sabahı)

> **Değişti: docs/11'e bakın.** Aşağıdaki 5.1 ve 5.2, ürün dönüşünden önceki taslaktır ve tarihsel kayıt olarak korunur. Adım 1'in Pazar kısmı (E8-G1…G4) ve adım 3'ün komut çubuğu (E10-G1) tamamlandı; adım 2 (Devlet) E23'e, adım 3'ün onboarding'i E21-G6'ya, adım 4 (Lojistik) arka plana, adım 5 (Teknoloji) Alfa-1 sonrasına, adım 6 (kararlar) K23–K35'e, adım 7 (Katman B spike) E19-G2/E21-G1'e taşındı.

**Mantık (1 Ekim sabahı itibarıyla):** gece işi commit'li ve sağlam zemin hazır (küre, gerçek dilim, B1 ve B2). Sıradaki iş, çekirdekte kalan katmanları tek yazarla sırayla bitirip her adımı ölçmek; paralelde istemci komut arayüzü ve onboarding ile oyunu "izlemeden" "oynamaya" geçirmek ve sahip kararlarını kapatmak. Çekirdek tek yazar olduğundan B3→B4→B5→B6 sıralıdır; UI, veri ve ölçüm işleri paralel 3–4 ajanla gider.

### 5.1 Tamamlanan adımlar (önceki sprint taslağı)

| # | Görev(ler) | Durum |
|---|---|---|
| 1 | **E17-G1** gece işlerinin commit'i ve kontrol | Tamamlandı (555 test yeşil) |
| 3 | **E3-G1 + E3-G2** gerçek dilim hattı ve gerçek haritada sim/ölçüm düzeneği | Tamamlandı |
| 4 | **E14-G1 + E14-G2** ölçüm donanımı ve gzip bütçesi | Tamamlandı (332 KB gzip, 11–12 çizim çağrısı) |
| 5 | **E1-G1, G2, G3** küre MVP, gerçek dilim, gezen kamera | Tamamlandı ve yayınlandı |
| 6 | **E4-G1…G3** B1 Tarım çekirdeği (G4–G6 da bitti) | Tamamlandı; ölçüm kısmı (E4-G7) aşağıda 1. adımda |
| 8 | **E1-G4** 3D kapsam görünümü | Tamamlandı |
| 10 | **E5-G1 + E5-G5** B2 Sanayi (G1–G6 bitti) | Tamamlandı; ölçüm kısmı (E5-G7) aşağıda 1. adımda |

Taşınan eski adımlar: eski 2 (**E15-G1/G3** kararlar) yeni 6'ya; eski 7 (**E12-G1** v0.3) yeni 1'e; eski 9 (**E10-G1**) yeni 3'e; eski 11 (**E2-G1**) yeni 7'ye.

### 5.2 Kalan adımlar (yeniden sıralı)

| # | Görev(ler) | Gerekçe | Boyut |
|---|---|---|---|
| 1 | **Pazar v1'i bitir ve ölç:** **E8-G1…G4** (sabah, çekirdekte) → **E8-G8**; **E12-G1** v0.3 sonucunu işle; ölçüm kapanışları **E4-G7**, **E5-G7**; **E17-G5** (B3 kuralları 06'ya) | Üç katman (Tarım, Sanayi, Pazar) tek ölçümde; Kapı 2 hâlâ açık (H1, H2, H7), B4'ten önce yeni temel satır gerekli; elektronik israfı (E17-G3) liman primiyle çözülebilir | L |
| 2 | **Devlet v1 (B4):** **E9-G1, G2** (kademe, istikrar) → **G4, G5** (yasa, bütçe) → **G3, G6, G7, G10**; **E8-G3** komut yüzü | Diğer beş katmanı yasa ve bütçe kollarıyla yöneten karma katman; E7-G2 ve E6-G1 buna bağlı. Başlamadan önce §4-4 (yasa sayısı) onayı | XL |
| 3 | **Komut arayüzü ve onboarding:** **E10-G1** (sabah, bitir) → **E10-G5** onboarding; **E10-G2** ticaret; **E1-G8** erişilebilirlik; **E14-G3, G7** cihaz ve mobil | Oyun "izleme"den "oynama"ya ancak bununla geçer; H4 ve ilk insan gözlemi (E12-G6, E12-G9) buna bağlı. E10-G3 (Devlet arayüzü) adım 2'den sonra | L–XL |
| 4 | **Lojistik v1 (B5):** **E6-G1…G3, G5, G7**; **E3-G6** kenar iklim profilleri | Derinlik bu katmanda; filo, yakıt, mevsimsel kenar. Kapsam neden sınıfları E1-G4 görünümüne bağlanır | XL |
| 5 | **Teknoloji v1 (B6):** **E7-G1…G3, G6**; sonra **E7-G2, G5** | Her katmana yöntem açan düğümler; E7-G2 Devlet bütçesine bağlı. Başlamadan önce §4-3 (düğüm sayısı) onayı | L–XL |
| 6 | **Sınır/isim ve ODbL kararları:** **E15-G1** (taslak commit'li, onay bekliyor), **E15-G3**; ayrıca §4-3 ve §4-4 | Veri yayınını ve Katman B kapsamını bloke eden S boyutlu kararlar; adım 2 ve 5 için karar önkoşulları. Paralel yürür, ilk işlerden biri olarak sahibe sunulur | S |
| 7 | **Katman B spike:** **E2-G1** (yalnız E15-G3 çıkarsa); ardından **E1-G9** yayın ve sürümleme | MapLibre küre + three.js özel katmanı + PMTiles riskini erkenden sınar | M |

**Sprint sonu beklenen çıktı:** Pazar v1 commit'li ve ölçülmüş (yeni H temel satırı), Devlet v1 çekirdekte, oynanabilir komut çubuğu, kapanmış sınır/ODbL kararları; Lojistik, Teknoloji ve Katman B sonraki sprintlere kalır. **Sprint 2 adayları:** E6, E7, E2-G1, E11-G1 (ADR).

---

## 6. Riskler

> **Güncelleme (1 Ekim).** Ürün dönüşünün riskleri (R-Ü1–R-Ü16: serileştirici, düğüm patlaması, determinizm, ODbL, boş dünya, spekülasyon, mobil performans, tek yazar, yedekler, çoklu hesap, kişisel veri vb.) [11 §11](11-urun-donusu.md#11-riskler) içindedir. Aşağıda R2 (sınır) K33 ile, R3 (ODbL) K24 ile azaldı; R11 (düşük nüfus) artık baştan geçerlidir.

Olasılık/etki değerlendirmeleri takım değerlendirmesidir (**tahmin**); ölçülmüş değil.

| # | Risk | Olasılık | Etki | Önlem |
|---|---|---|---|---|
| R1 | **20–25. gün sıkılması yalnız gözlem;** bağımsız tutma verisi yok, altı katmanın çare olduğu hipotezdir | Orta | Yüksek | H2 ölçümü + damar tükenmesi (E5-G5); ilk insan gözlemi (E12-G9); "kanıtlandı" denmez |
| R2 | **Sınır/isim hassasiyeti** (ihtilaflı alanlar, gerçek haritada) | Orta | Yüksek | E15-G1 onayı; kurgusal devletler; yeni dilimde kontrol listesi |
| R3 | **ODbL/OSM lisans bulaşması** (Katman B, bina ve PMTiles) | Orta | Yüksek | E15-G3 kararı; ayrı ODbL dosyası; dış hukuki görüş (E15-G4) |
| R4 | **Mobil performans kanıtsız;** yayımlanmış mobil fps yok, küre modunda özel katmanlar yeni | Yüksek | Orta–Yüksek | E14-G1…G3 erken ölçüm; kalite kademeleri; Katman B isteğe bağlı kalır |
| R5 | **Kapı 2 geçilmedi;** H1 sınırda, H2/H3/H6 belirsiz, H7 sınırda; üstüne altı katman eklemek ölçümü bulandırır | Yüksek | Yüksek | Her B adımında regresyon kalkanı (kapalıyken v0.2 birebir); E12-G1/G3; tek değişken eşli ölçüm |
| R6 | **Çekirdek tek yazar darboğazı;** Faz B sıralı, sözleşme değişiklikleri tek kişide | Yüksek | Orta | UI/veri/3D işleri paralel; sözleşme bloklarının önceden hazır olması (08 §7) |
| R7 | **Kapsam kayması:** 3D + altı katman + gerçek veri + çok oyunculu aynı anda | Yüksek | Yüksek | Kapı sırası kanıt sırasıdır; WIP limiti; bu liste P0/P1/P2; çok oyunculu zamanlaması kararı |
| R8 | **Sayılar kalibre değil;** toplam ceza tabanı, kıtlık + istikrar çift sayımı, mikro yönetim birikimi (11 yeni komut) | Yüksek | Orta | Her adımda bot ölçümü; şablon ve varsayılanlar (E10-G8); H7 ölçümü |
| R9 | **Gerçek veri kalitesi:** rezervler elle/genel bilgi, MRDS eski ve kaba konumlu, NGA WPI erişimi 403, bazı lisanslar "doğrulanmadı" | Orta | Orta | Kaynak etiketleme (E13-G2); "tasarım dengesi" notu açık; E15-G5 lisans taraması |
| R10 | **Rakip bilgisi tek kaynaklı** (Capital Rift: geliştirici TikTok özeti; hesap adı tutarsız; 3D yığını belgesiz) | Yüksek | Düşük–Orta | Çıkarımlar "yön göstergesi" sayılır; ürün kararı rakip iddiasına bağlanmaz |
| R11 | **Çok oyunculuda düşük nüfus:** pazar çökmesi, geç katılan, boş dünya hissi | Orta | Yüksek | NPC piyasa yapıcı (E8-G2); H6 ve yetişme (E9-G8); bot yönetimli bölge kararı (bölüm 4-12) |
| R12 | **Determinizm kaybı** (tarayıcı/Node farkı, yasak API sızması) | Düşük | Yüksek | ESLint yasakları; "aynı tohum → aynı özet" CI; Node matrisi (E17-G6) |
| R13 | **GPL/AGPL bulaşması** (OpenFrontIO, OpenTTD vb.) | Düşük | Yüksek | K22; E15-G6 temiz oda kuralı |
| R14 | **Marka/özgünlük** ("Capital Rift'in kendi versiyonu" çağrışımı) | Düşük–Orta | Orta | E15-G7; özgün ad ve varlıklar |
| R15 | **Gelir modeli yok;** prototip sonrası sürdürülebilirlik belirsiz | Orta | Orta (uzun vade) | İlke kilitli; E16 prototip dışı; Kapı 3 sonrası seçenek analizi |

---

*Bu liste 1 Ekim öğleden sonrası (ürün dönüşü) itibarıyla güncellenmiştir; "Devam ediyor" satırları Sprint 1 işleri commit'lendikçe ve v0.3 ölçümü bitince güncellenir. Ürün dönüşü: [11](11-urun-donusu.md). Kaynaklar: [README](../README.md), docs/00–08, [araştırma raporları](arastirma/), [ölçüm raporları](olcum/), DATA_SOURCES.md, gece planı.*
