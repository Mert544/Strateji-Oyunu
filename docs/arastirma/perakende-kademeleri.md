# Araştırma — Perakende Kademeleri: Bakkal, Market, Süpermarket, Zincir, Toptancı ve Üretici Satış Noktası

> **Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi (2. tur: Ar-Ge lideri incelemesi ve sahip yönergesi işlendi). Bu bir **Ar-Ge önerisidir; kod, veri ve başka belge değiştirilmedi.** Ekonomi sayıları (§3.3, §4.3, §7.5, §9.3, §10) [dikey-zincirler-ve-perakende](dikey-zincirler-ve-perakende.md) §5.6'daki çekim formülüyle yazılmış bir **el hesabı betiğinin** çıktısıdır (betik scratchpad'dedir, depoda yok); mutlak ₺ değil **göreli** sonuçlar esastır. Gerçek dünya rakamları web kaynaklarındandır; "(arama özeti)" ibareli olanlar birincil metinde doğrulanmamıştır. Oyun birimi gerçek metrekare ya da kilogram değildir. "Sezon" yerine "iklim takvimi/dönem" denir.

İlgili ve **tekrar edilmeyen** belgeler: [dikey-zincirler-ve-perakende](dikey-zincirler-ve-perakende.md) (G11 tek `dukkan` ek yapısı + tür verisi, §5.6 çekim formülü, §4 kanal marjları, §5.2 "S/M/L aynı ayak izi" (**dükkân için güncellendi**, §3.6), §5.3 altı tür, §5.4–5.5 raf ve fiyat) · [imza-mekanikleri-ve-yonelimler](imza-mekanikleri-ve-yonelimler.md) §3.6 (N14) · [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md) §4.1–4.2, §7 · [kamu-ve-kamu-arazileri](kamu-ve-kamu-arazileri.md) · [arsa-ve-insa-derinlestirme](arsa-ve-insa-derinlestirme.md) (§8 **Z4** yapı hücre kümesi: **güncellendi, baş lider kararı**; **Z13** atomik `yapi_yerlestir`) · [argelider-sentez-1](argelider-sentez-1.md) (G11, G12) · [12 §7–11](../12-yon-taslagi.md).

---

## 0. Yönetici özeti (10 madde)

1. **Boşluk.** Dikey rapor tek `dukkan` yapısını, altı türü ve S/M/L ölçeğini verdi ama (a) **kademe adı yok**, (b) bakkalın büyük karşısındaki **nişi kural olarak yazılı değil**, (c) **marka ve oyuncu zinciri**, **toptancı**, **üretici satış noktası** ve **oyuncular arası raf tedariki** tanımsız, (d) dükkânın **sunumu** belirtilmemiş, (e) **malların satış çıkışı** denetlenmemiş. Bu rapor bunları G11'e dokunmadan veri ve çarpan olarak ekler.
2. **Seviye ya da kilit yok, seçim var (sahip yönergesi).** Bakkal, market ve süpermarket bir ilerleme merdiveni değil, oyuncunun seçtiği **iş modelleridir**: bakkalda kalmak, aynı yerde büyümek, kendi markasıyla bakkal zinciri kurmak ya da sermayesi varsa **doğrudan süpermarket açmak**. Hiçbir kademenin açılışı ilçe seviyesine ya da sıraya (önce bakkal) bağlı değildir; **ilçe gelişim seviyesi bireysel kilit değil, kolektif dünya durumudur** (docs/11 §7.4'teki "seviye kilit açar" tanımı geçersiz; seviye yalnız NPC talebi `Q`, çeşit çekimi ve ruhsat kotası üzerinden ekonomik etki yaratır). Tek kısıtlar: **sermaye, uygun arsa (kullanım türü, cadde cephesi), işletme gideri, tekelleşme korumaları** (pay tavanı, ilçe başına süpermarket sayısı, N14 ruhsat kotası). Küçük ilçede süpermarketin zayıf kalması **kilit değil ekonomik sonuçtur** (5 bin nüfuslu ilçede L net −₺36/sa, S +₺102/sa; §3.3).
3. **Kademe = ölçek (S/M/L) + tür kimliği:** `bakkal` (S), `market` (M), `supermarket` (L); mal listeleri iç içe. **Yükseltme (`dukkan_yukselt`) yalnız aynı yerde büyümek isteyen için bir seçenektir**; toplam parası doğrudan inşa ile **eşittir** (yapı ₺11.440 + 17.160 + 22.880 = ₺51.480; arsa aynı üç hücre), süresi yalnız +3 sa'dir (§3.5). **Ayak izi ölçekle büyür** (baş lider kararı; Z4 güncellendi): **`olcekHucre = [yuva, yuva+1, yuva+2]`; dükkânın yuvası 1 olduğundan S 1, M 2, L 3 hücre** (yapı biçimi en çok 5 hücre, bağlı kenar-bitişik küme), tür verisinde parametre. Doğrudan kurulumda ayak izi baştan alınır; yerinde yükseltmede ek bitişik hücreler ya oyuncunun kendi boş hücreleri olmalı ya da aynı atomik işlemde satın alınabilmeli, yoksa yükseltme yapılamaz (kilit değil **fiziksel koşul**; §3.6).
4. **Yakınlık Havuzu bakkal kademesine bağlıdır, şube sayısına değil.** Oyuncu havuzunun %15'i yalnız `bakkal` (K1) dükkânlarına açıktır; bakkal zinciri kuran oyuncu bu nişi **şube sayısıyla kaybetmez**, yalnız şubeyi markete çevirince kaybeder (§3.4, §4.3). Bakkal başına etkisi ≈ +%7 satış; N14 İM14.1 için mekanik taban.
5. **Tekelleşme koruması hesapla ayarlandı ve ince dünyaya uyarlandı.** Oyuncu pay tavanı **kademelidir**: ilçedeki perakendeci oyuncu sayısı n için **n=1 yok, n=2 %70, n≥3 %50**; **Alfa-0'da yok** (kasa kapasitesi zaten bağlayıcı: üç oyunculu ince ilçede bile oyuncular hacmin %27'sini alır). Sabit %50 olsaydı ilçedeki tek L+M oyuncusunun neti ₺2.509'dan ₺988'e (−%61) düşerdi (§9.3). Fiyat savaşı betiği: pay tavanındayken fiyatı 0,97→0,80 R'ye indiren zincirin satışı artmıyor, neti ₺988→−₺2.131/sa (§7.5).
6. **Marka ve zincir kimliği birinci sınıftır.** Oyuncu 1–3 **marka** tanımlar ("Yıldız Bakkal", "Çınar Market"); dükkânlar markaya bağlanır; **Zincir Kartı marka başına ve kademe karışımından bağımsız** ≥3/≥6/≥10 dükkânla açılır (bakkal zinciri de süpermarket zinciri de aynı kart). Ödül: ortak şablon, işletme gideri −%3/−%6/−%10, merkezi tedarik; bedel: marka rafı (yuvaların %50'si kilitli), ortak pay tavanı (§4).
7. **Oyuncular arası tedarik Alfa-1'e bağlıdır:** raf tedarik sözleşmesi (günlük teslim, teminat = **1 günlük teslim değerinin %20'si**), marka etiketi (çekimi etkilemez), tedarikçiye satış bilgisi, konsinye (sonra). Sayısal örnek (§10, c): ekmekte NPC makası (₺13,2/birim) ortadan kalkar; 60 birim/sa için ≈₺794/sa kazanç iki tarafa bölünür (§7).
8. **Üretici satış noktası yapı değil modüldür** ("Yerinde Satış"; hücre gerektirmez); **Toptan Deposu** Alfa-1-son ve NPC talebi yaratmaz (§6).
9. **Sunum:** tabela, vitrin, açık/kapalı saat tablosu, kapı önü kuyruk silueti, boş raf, esnaf POI konumu; +0–1 çizim çağrısı, yapay zekâsız. **Dini bayram dükkân açık/kapalı kuralı doğurmaz;** yalnız talep zamanlaması ve hatırlatma takvimidir, toplam sabit (12 §7). Pazar günü tezgâhı geçici kamu izni, kalıcı dükkân sahip olunan arsadır (§8).
10. **Alfa-0 = en küçük dilim:** bakkal (S), fırın, şarküteri, şekerci, yapı market + Açılış Tezgâhı; **bu rapordan Alfa-0'a sıfır yeni kural, komut ve kavram** (§12.3 karmaşıklık bütçesi). Market, kademe çarpanı, Yakınlık Havuzu, süpermarket, zincir kartı, pay tavanı Alfa-1'dedir; **mal × satış kanalı matrisi** (§5.2) beş açık buldu (`elektronik`, `gubre` rafsız; `cam`, `un`, `sut`, `findik_urunu` dikey listelerinde rafsızdı, eklendi) ve 11 malı "yalnız ithal" olarak işaretledi. Üç oyuncu senaryosu §10'da; 13 geri dönüşü zor karar §14'te.

---

## 1. Kapsam, hizalama ve tekrar etmeme sınırı

### 1.1 Üzerine kurulan kilitli kararlar

| Kaynak | Karar | Bu raporda sonucu |
|---|---|---|
| G11 | Tek `dukkan` ek yapısı + tür = veri; raf yuvası `malId` ile; stok il düğümünde | Kademe, tür verisinin bir alanıdır; **yeni yapı yok** |
| G12 | Fiyatı oyuncu belirler, [0,7 ; 1,4] R; hane bütçesi B + η | Band **korunur**; yalnız **kampanya sınırı** eklenir (§7.5) |
| N14 | `z(t)=zMax(1−e^(−t/τ))`, ruhsat kartı, tedarikçi ≤%35, esnaf tabanı %25, toplam talep sabit (K-5) | **Değiştirilmez.** Oyuncu zinciri NPC zinciri değildir; `(1−z)·Q` içinde yarışır (§4.4) |
| canlı-dünya §4.1 | Çekim ağırlığı; unvan/tabela/başarım çekimi **etkilemez** | Marka etiketi de **etkilemez**; kademe için **bir** çarpan eklenir |
| 12 §7 | Dini bayram **yalnız talep eğrisi + hatırlatma takvimi** | Bayrama bağlı açık/kapalı ya da havuz kuralı **yok** |
| Sahip (Ar-Ge dalgası 4) | Strateji, MMORPG değil; yapay zekâ yalnız sunucu kamu ajanı; para alanı taşıyan sistem/ajan komutu yok; **kademeler iş modelidir, seviye/kilit yok** | §2 maddesi, §3.1, §14 karar 2 |
| arsa-ve-insa Z4 (**güncellendi, baş lider kararı**) | "1–3 hücre, {1, domino, I3, L3}; ölçek yükseltme aynı ayak izinde" yerine **`olcekHucre[tür] = [yuva, yuva+1, yuva+2]`**; yapı biçimi **en çok 5 hücre, bağlı kenar-bitişik küme** | Dükkân (`yuva`=1): S 1, M 2, L 3 hücre; §3.6 |
| docs/11 §7.4 ("ilçe seviyesi kilit açar") | **Geçersiz** (baş lider kararı): seviye kolektif dünya durumudur | İlçe seviyesi yalnız `Q`, çeşit çekimi ve ruhsat kotası üzerinden ekonomik etki yaratır (§3.1) |

### 1.2 Bu rapor ne ekliyor

| Konu | Dikey rapor | Bu rapor |
|---|---|---|
| Kademe | S/M/L ölçek (yuva 4/6/8, kasa 90/198/324) | **Ad, çekim çarpanı, çekim alanı, arsa niteliği, ekonomi, doğrudan inşa ↔ yükseltme tutarlılığı** (§3) |
| Bakkal avantajı | N14'te cümle ("yakınlık, çeşit") | **Yakınlık Havuzu** kuralı ve sayısı (§3.4) |
| Zincir | Yok (N14 NPC zinciri) | **Marka + Zincir Kartı** (§4) |
| Tür kataloğu | 6 tür | **13 tür/modül** ve **mal × kanal matrisi** (§5) |
| Oyuncular arası tedarik | "Sözleşme P5" cümleleri | **Raf sözleşmesi, marka, satış bilgisi, konsinye** (§7) |
| Fiyat savaşı | Taban 0,891 R, esnaf tabanı | **Kademeli pay tavanı, kampanya sınırı, sayısal örnek** (§7.5, §9.3) |
| Sunum | Vitrin puanı | **Yürüyüş sahnesi sözleşmesi** (§8) |
| Oyuncu gözü | Rehber akışı | **Üç senaryo, adım adım** (§10) |

---

## 2. Gerçek Türkiye perakende yapısı ve oyuna çevirisi

| Gerçek (Türkiye, gıda perakendesi) | Değer | Kaynak | Oyundaki karşılığı |
|---|---|---|---|
| Organize / geleneksel pay | 2014: %41,8 / %58,2 → **2025: %67,3 / %32,7** | [P2] (arama özeti) | NPC zincir zMax %55 (N14), esnaf tabanı %25 |
| Format payları 2025 | **indirim market %32,2**, süpermarket %28,7, geleneksel %32,0, e-ticaret %2,1; ≈120,2 milyar $ | [P1] (USDA aktarımı) | Üç kademe (S/M/L); iş modeli seçimi |
| Zincir şube sayıları 2025 | BİM 14.576 · A101 13.550 · ŞOK 11.797 · Migros 3.895; ilk 4 zincir satışın %41,4'ü; ≈370 bin gıda satış noktası; ≥5 şubeli 200'den fazla zincir | [P1] | Marka ve Zincir Kartı eşikleri ≥3/≥6/≥10; pay tavanı |
| Bakkal sayısı | on yılda 240 bin → 165 bin (TESK); 2020'lerde 125–130 bin; 2022'de 3.518, 2023'te 5.199 kapanış | [P4] (arama özeti, tutarsız) | Yakınlık Havuzu; İM14.1 |
| Büyük mağaza | **≥400 m² satış alanı** (6585 sayılı Kanun) | [P5] | Süpermarket (L) = "büyük mağaza": N14 ruhsat kartı ve kotası |
| Zincir mağaza | aynı kişi, merkeze bağlı; **≥5 şube (≥1 büyük mağaza) ya da ≥10 şube** | [P5] (özet; doğrulanmadı) | Zincir Kartı ≥3/≥6/≥10 (kademe karışımından bağımsız) |
| Çeşit | BİM ≈700, A101 ≈1.200 çeşit; Migros 40–4.500 m², 1.800–18.000 SKU | [P8] (arama özeti) | `tamCesit` 6 / 9 / 12 |
| Üretici/kooperatif perakende | Tarım Kredi KOOP 2025'te **4.500 satış noktası** (2.500 A, 1.000 B, 1.000 KOOP Bakkal) | [P6] | Üretici modülü; kooperatif bakkalı (sonra) |
| Hal | Rüsum %1 (hal içi) / %2 (dışı); **üreticinin doğrudan perakende satışı muaf** | [P7] (arama özeti) | Hal (N3); üretici modülü |

**Okuma.** Gerçekte organize payın %67'ye çıkması oyunu bakkal aleyhine bitirir; oyun bunu **bilerek yumuşatır** (zMax %55, esnaf %25, Yakınlık %15, pay tavanı) ama yönünü korur. Gerçekçilik sınırı: bu bir oyun; amaç dönüşümü hissettirmek, birebir benzetmek değil. Gerçekte hard-discount mağazalar (BİM, A101, ŞOK) **bakkal boyutunda ama zincirdir**: bu yüzden oyunda "bakkal zinciri" birinci sınıf bir iş modelidir (§4).

---

## 3. Kademe modeli: dört iş modeli

### 3.1 İlke

Kademe, ölçek kademesinin (`olcekKademeleri` S/M/L; çıktı ×1/2,2/3,6, inşa ×1/2,5/4,5; [06 §12](../06-simulasyon-spesifikasyonu.md)) **perakendedeki adıdır**. Üç ad (`bakkal`, `market`, `supermarket`) üç `dukkanTurleri[]` kaydıdır; her birinin tek geçerli ölçeği vardır. **Kademeler bir sıra değildir:**

| Oyuncunun seçtiği iş modeli | Yol |
|---|---|
| **Bakkalda kalmak** | S dükkân; Yakınlık Havuzu; ucuz, hızlı geri ödeme |
| **Aynı yerde büyümek** | `dukkan_yukselt` ile S→M→L (seçenek; §3.5) |
| **Kendi markasıyla bakkal zinciri** | Aynı marka altında çok sayıda S dükkân (§4) |
| **Sermayeyle doğrudan süpermarket** | L'yi doğrudan inşa (madencilik, askeri/koruma işi ya da kaynak satışı geliriyle) |
| Karışık | Marka altında S, M, L bir arada |

**Kilit yok:** açılışı ne ilçe seviyesi, ne "önce bakkal" sırası, ne de başka bir ön koşul kısıtlar. Kısıtlar yalnızca **ekonomiktir** (sermaye, işletme gideri, talep), **fizikseldir** (arsa niteliği, ayak izi için bitişik hücre) ve **koruma kurallarıdır** (pay tavanı, ilçe başına sayı, ruhsat kotası).

**İlçe gelişim seviyesi bireysel açılış kilidi değildir; kolektif dünya durumudur** (docs/11 §7.4'teki tanım geçersiz). Üç yoldan **ekonomik etki** yaratır:
1. **NPC talebi `Q`:** seviye açık ihtiyaç kademelerini (K2 giyim/ev, K3 hareket/teknoloji; [canlı-dünya §3.3](canli-dunya-simulasyonu.md)) belirler. Giyim ya da yapı market dükkânı her ilçede açılabilir; talep (K2) henüz açık değilse satışı küçüktür ve Dikkat panelinde yazar ("Bu ilçede giyim talebi henüz açık değil: K1 karşılanma %74"). **Kilit değil sonuç.**
2. **Çeşit çekimi:** çeşit çarpanının katsayısı seviyeye göre değişir (`cesitKatsayi[seviye]`: Köy 0,15 / Kasaba 0,25 / Merkez 0,30 / Şehir 0,35; **ilk tahmin**): büyük ilçede müşteri çeşide daha çok değer verir. Bu rapordaki tablo sayıları 0,25 ile hesaplandı.
3. **Ruhsat kotası:** büyük mağaza (L) kotası nüfusa bağlıdır (20.000 nüfusa 1; N14).

**Mal listesi ve ilçe seviyesi.** Dükkân türünün mal listesi ilçe seviyesine göre **kısıtlanmaz ve görünürlüğü seviyeye bağlı değildir.** Oyuncunun elindeki (stok) ya da ithal edebildiği her mal, tür listesindeyse rafa konabilir. Tier 1 malların ilçe seviyesine göre açılışı (Köy 12 / Kasaba 22 / Merkez 29; [cesitlilik §7.2](cesitlilik-uretim-katmanlari.md)) dükkân için **uygulanmaz**; **düzeltme önerisi:** Ürün Atlası görünürlüğü ilçe seviyesine değil oyuncunun **keşfine** (stok, üretim, ithalat, sözleşme) bağlanır. Mal bulunamıyorsa raf boş kalır; kilit değil sonuç.

| Neden "tür + ölçek birlikte" | Açıklama |
|---|---|
| Rehber ve arayüz | Oyuncu "bakkalımı markete çevirdim" der; ayrı bir "ölçek" kavramı öğrenmez |
| G11 uyumu | Yapı değişmez; `dukkan` kaydına bir `olcek` alanı, `dukkanTurleri[]`'ne birkaç alan |
| Raf sürekliliği | Mal listeleri **iç içe** (bakkal ⊂ market ⊂ süpermarket); yükseltme `rafYuvasi[]` kayıtlarını geçersiz kılmaz |
| Sayı dengesi | Yuva 4/6/8, kasa 90/198/324 dikey raporda zaten bu üçlüdür |

### 3.2 Kademe tablosu

Maliyet (₺ eşdeğeri): çelik ₺120, parça ₺180, pencere ≈ ₺400 (NPC'den ithal). Hücre ≈ 835 m² ([arsa-ve-insa §8 Z1](arsa-ve-insa-derinlestirme.md)).

| Alan | **K0 Açılış Tezgâhı** | **K1 Bakkal** (S) | **K2 Market** (M) | **K3 Süpermarket** (L) |
|---|---|---|---|---|
| Tür kimliği | `tezgah` | `bakkal` | `market` | `supermarket` |
| Arsa / hücre (**ayak izi ölçekle büyür**, Z4 güncel) | Kamu pazar yeri yuvası; **hücre yok** | **1 hücre**; Konut ○ / Ticari ✓ | **2 bitişik hücre**; Ticari ✓, Konut ✗ | **3 bağlı hücre** (kenar-bitişik küme; 2–3 aralığında 3 öneri, §3.6); Ticari ✓ + **cadde/ana yol cephesi** (A5 bayrağı), Konut ✗, Sanayi ○ ana yol |
| Arsa bedeli (ticari hücre ≈1,3–1,6× taban, artımlı) | — | Kasaba ≈₺3,3–4 bin; şehir sınıfı ≈₺9,4 bin | 2× (≈₺6,5–8 bin / ≈₺18,8 bin) | 3× (≈₺9,8–12 bin / ≈₺28,3 bin) |
| Açılış koşulu | yeni oyuncu; ilk 14 gün | **sermaye + arsa + limitler** (§3.6); ilçe seviyesi/sıra şartı **yok** | aynı | aynı + **N14 ruhsat kartı ve kotası** |
| Raf / çeşit yuvası | 2 | **4** (+2 raf eki) → en çok 6 | **6** (+2×2 modül) → en çok 10 | **8** (+2×3 modül) → en çok 14 |
| `tamCesit` | 2 | **6** | **9** | **12** |
| Kasa kapasitesi (birim/sa, toplam) | 20 | **90** | **198** | **324** (+%25 ikinci kasa modülü) |
| Çekim çarpanı `cekimCarpani` (**yeni**) | 0,6 | **1,0** | **1,6** | **2,4** |
| Çekim alanı (A1 halka; A0 ilçe havuzu) | kamu meydanı | kendi halkası tam, komşu ×0,35 | kendi halka tam, komşu ×0,6 | ilçe geneli ×0,85 |
| Havuz erişimi (§3.4) | ana havuz (pazar günü payı) | **ana + Yakınlık Havuzu** | ana | ana |
| İşletme gideri (₺/sa) | ₺0 (izin ₺30/hafta) | **132** | **204** | **≈330** (ekstrapolasyon) |
| İnşa maliyeti | parasız, anında, bir kez | ₺6.000 + 20 çelik + 8 parça + 4 pencere (≈ **₺11.440**) | ×2,5 ≈ **₺28.600** | ×4,5 ≈ **₺51.480** |
| İnşa süresi (öneri) | anında | 4 sa | 6 sa | 8 sa |
| Yükseltme (**seçenek**) | → K1 ("Kendi tezgâhın" kartı) | → K2: fark **₺17.160** (+₺9.000, +30 çelik, +12 parça, +6 pencere) **+ 1 bitişik hücre** | → K3: fark **₺22.880** (+₺12.000, +40 çelik, +16 parça, +8 pencere) **+ 1 bitişik hücre** | — |
| Mal listesi | 2 mal (kendi seçimi) | `gida`, `ekmek`, `un`, `sut`, `sut_urunu`, `sekerleme`, `findik_urunu`, `yakit` (§5.2) | bakkal ⊂ + `zeytinyagi`, `kuru_meyve`, `bal`, `cay` | market ⊂ + `kagit`, `bakliyat`, `hazir_giyim` (temel), `elektronik` (küçük raf) |

Notlar: (a) Alfa-0'da yalnız birkaç mal gerçekten üretilir; market (9) ve süpermarket (12) çeşit çarpanını tam alamaz: katalog büyüdükçe (kardeş raporlar) üst kademeler anlam kazanır (§5.2); (b) Capitalism Lab'de bir mağaza en çok 12 ürün taşır [G4]; (c) L gideri [06 §12](../06-simulasyon-spesifikasyonu.md) bakım ×3,2 uygulanırsa **≈₺420'ye** çıkabilir (kalibrasyon; Şehir ilçesinde L yine pozitif); (d) M/L inşa süreleri dikey rapordaki S (4 sa) değerinden öneri olarak ölçeklendi; (e) inşa maliyeti **yapı** bedelidir, **arsa** ayrıca satırdadır (ayak izi büyüdükçe artar).

### 3.3 Kademe ekonomisi (betik sonucu)

**(A) Rakipli ilçe.** Düzen: 100 bin nüfus, gıda sepeti `Q`=1.000 birim/sa (gıda 600 + ekmek 300 + süt ürünü 100), ortalama referans ₺72, **N14 gün 30'da z=0,35**, `P = Q·(1−z)·%75 = 487,5`, Yakınlık %15, pay tavanı %50 (n≥3). Formül: dikey §5.6 çekimi × `cekimCarpani`; kasa su-doldurma. "Prim" = (fiyat − 0,891) × R × satış; "net" = prim − işletme gideri.

| Dükkân (sahip) | Kademe | Fiyat (R) | Çeşit | Satış (birim/sa) | Prim | Gider | **Net (₺/sa)** | Geri ödeme (yalnız yapı; arsa hariç) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| A-L | süpermarket | 0,97 | 0,9 | 139 | 792 | 330 | **462** | ≈ 111 sa |
| A-M | market | 0,99 | 0,8 | 87 | 622 | 204 | **418** | ≈ 68 sa |
| B | bakkal | 1,05 | 0,7 | 66 | 755 | 132 | **623** | ≈ 18 sa |
| C | bakkal | 1,08 | 0,7 | 62 | 849 | 132 | **717** | ≈ 16 sa |
| D | bakkal | 1,02 | 0,5 | 67 | 622 | 132 | **490** | ≈ 23 sa |
| **E (yeni oyuncu)** | bakkal | 1,03 | 0,5 | 66 | 657 | 132 | **525** | ≈ **22 sa** |

**(B) Tek oyunculu ilçe, nüfusa göre (kilit değil sonuç).** Aynı betik; fiyat 1,00 R; `z`=0 (5 bin), 0,35 (≥20 bin); rakip yok (n=1: tavan yok); **net, arsa hariç** (5 bin nüfuslu kırsal ilçede L için 3 hücre ≈₺4–5 bin ek).

| İlçe nüfusu (`Q`) | **S bakkal** satış / net | **M market** satış / net | **L süpermarket** satış / net |
|---|---|---|---|
| 5 bin (50) | 29,8 / **₺102** | 35,3 / ₺73 | 37,5 / **−₺36** |
| 20 bin (200) | 77,5 / ₺476 | 91,9 / **₺517** | 97,5 / ₺435 |
| 50 bin (500) | 90 / ₺574 | 198 / ₺1.350 | 243,8 / **₺1.583** |
| 100 bin (1.000) | 90 / ₺574 | 198 / ₺1.350 | 324 / **₺2.213** |

**Okuma.**
1. **Küçük ilçede süpermarket zayıf, açılması serbest.** 5 bin nüfusta L zarar yazar (kasa %12 dolu, gider ₺330); 20 bin nüfusta üç kademe birbirine yakındır (₺435–517): oyuncu bunu **Yatırım Tahmini kartında** görür ve kendi karar verir. 50 bin ve üstünde L belirgin kazanır. Çekirdek hiçbir kademeyi engellemez; N14 ruhsatı (Kapalı ilçe) yalnız siyasi koruma olarak L'ye uygulanır.
2. **Bakkal en hızlı kendini öder** (rakipli ilçede 16–23 sa; ince ilçede ≈13 sa, §10 a1).
3. **Aynı ilçede büyük olmak pay getirmez:** A'nın iki şubesi (L + M) toplam 226 birim/sa alır; E yokken 244 ile pay tavanına (P'nin %50'si = 243,75) oturur. Bir bakkalın net kazancı (₺490–717/sa) A'nın şubelerinin her birinden (₺418–462) yüksektir. Büyümenin yolu **ilçeler arası** ölçektir (zincir, §4).
4. **N14 en kötü durumda (z=0,52) bile** yeni bakkal net ≈ ₺353/sa (geri ödeme ≈ 32 sa).

### 3.4 Çekim: havuzlar ve kademe çarpanı (dikey §5.6 formülüne **eklenen** parçalar; Alfa-1)

Dikey formül aynen: `w[j] = (ref/fiyat[j])² · (1+0,25·çeşit[j]) · bakım[j] · vitrin[j] · konum[j]`. **Eklenenler:**

| Ek | Kural | Neden |
|---|---|---|
| **Kademe çarpanı** | `w[j]` × `cekimCarpani` (1,0 / 1,6 / 2,4; tezgâh 0,6) | Büyük mağaza eşit fiyatta daha çok müşteri alır; kasa oranının (1/2,2/3,6) alt-doğrusal yansıması (3,6^0,8 ≈ 2,8; 2,4 ihtiyatlı) |
| **Havuz bölünmesi** | Oyuncu havuzu `P = Q·(1−z)·%75` → **ana havuz %85** (tüm dükkânlar `w` oranında) + **Yakınlık Havuzu %15** (yalnız `bakkal` kademesi) | Bakkalın zaman ve mesafe nişi |
| **Doğrudan satış havuzu** | P'nin **%10'u** yalnız "Yerinde Satış" modülü olan üretici noktalarına (§6.1) | Üretici noktasının kendi alanı |
| **Pazar günü** | Pazar günü P'nin **%15'i** pazar yeri tezgâhlarına ayrılır; **Yakınlık Havuzu pazar günü de tam** | Tezgâh ↔ dükkân dengesi (§8.3) |
| **Oyuncu pay tavanı** | Bir oyuncunun tüm dükkânları ilçede mal ailesi başına P'nin `tavan(n)` kadarını alır: **n=1 yok, n=2 %70, n≥3 %50**; fazlası su-doldurmayla başkalarına/esnafa; **Alfa-0'da yok** (§9.3) | Tekelleşme ve fiyat savaşı freni; ince dünyada yeni oyuncuyu cezalandırmaz |
| **`n` tanımı** | İlçede son 14 günde perakende satışı olan **farklı sahip** sayısı | Hayalet hesap sayılmaz |

**Yakınlık Havuzu (bakkalın nişi).** Gerçekte bakkal; (i) **yakınlık** (kapı önü), (ii) **uzun saat** (sabah ekmeği, gece geç), (iii) **eksik malzeme** (küçük sepet) ve (iv) **veresiye/sadakat** ile ayakta kalır. Dört etken oyunda tek, anlaşılır sayıya iner: **P'nin %15'i** (sepet bazında ≈73 birim/sa, 100 bin nüfusta) yalnız `bakkal` kademesindeki dükkânlara açıktır; havuz bakkallar arasında yine `w` oranıyla bölünür (fiyat/çeşit rekabeti sürer). Hesap etkisi (§3.3 düzeni, Yakınlık %0 → %15): bakkal başına satış **+4–5 birim/sa (≈ +%7)**, süpermarket ≈ −%7 (149,8 → 139,2). Küçük görünür ama **kapatılamayan taban**dır (esnaf tabanı %25 mantığının oyuncu bakkal karşılığı). **Şube sayısı şart değildir:** erişim, dükkânın **kademesine** bağlıdır; sahibinin kaç dükkânı olduğuna değil (gerekçe §4.3).

**Çekim yarıçapı.** Alfa-0'da ilçe tek havuzdur; **Alfa-1'de halka havuzu** gelir (dikey §5.7): bakkal kendi halkasında tam, komşu halkadan ×0,35; market ×0,6; süpermarket ilçe geneli ×0,85 ama **cadde cephesi** ister. Anno 1800'de pazar yeri "tam menzil" (35 kare) ve "azami menzil" (49 kare) ikilisiyle çalışır [G3].

### 3.5 Doğrudan inşa ↔ yükseltme: tutarlı maliyet, seçenek

`dukkan_yukselt {dukkan}` **yeni bir komuttur.** (`tesis_olcek_yukselt` çekirdekte yalnız sanayi tesisleri içindir: `packages/cekirdek/src/sanayi/komut.ts`, `{bolge, tesis, olcek}`; ek yapılara uygulanmaz.) Yükseltme için `mulk.perakende` kendi kademe maliyet ve süre parametrelerini taşır (sanayi bloğundaki `olcekYukseltmeSureCarpaniPpm` değeri **kopyalanır**, yeniden kullanılmaz).

| Yol | Toplam para | Toplam süre | Not |
|---|---|---|---|
| **Doğrudan L** | yapı **₺51.480** + **3 hücre arsa** | **8 sa** | Ayak izi (3 hücre) **baştan** alınır (`yapi_yerlestir`, atomik); satış bittiğinde başlar |
| **S → M → L (yükseltme)** | yapı 11.440 + 17.160 + 22.880 = **₺51.480** + **aynı 3 hücre** (1 + 1 + 1) | 4 + 3 + 4 = **11 sa** | Yükseltme süresi = hedef inşa süresinin %50'si (M 3 sa, L 4 sa); **her aşamada eski kademe çalışır**, satış kesilmez |
| Yık-yeniden-kur | iade %50 (iptal) → kayıp | uzun | Kötü yol: yükseltme zaten daha iyi |

Sonuç: yükseltme **ucuz kestirme değildir** (yapı ve arsa toplamı eşit; hücre fiyatı artımlı olduğundan yalnız sıra kaynaklı küçük fark) ve **cezalı da değildir** (+3 sa; karşılığında kesintisiz satış ve riski kademeli alma). Oyuncu sermayesi varsa doğrudan L, ihtiyatlıysa S ile başlar. Yükseltme **hiçbir kademe için zorunlu yol değildir.**

**Yükseltmenin fiziksel koşulu (kilit değil).** S→M ve M→L için gereken **ek bitişik hücreler** ya (i) oyuncunun **kendi boş hücreleri** olmalı ya da (ii) **aynı atomik işlemde satın alınabilmeli** (`parsel_al` kuralları: artımlı fiyat, ayrılmış hücre kuralı, **kamu hücresi olamaz**, ilçe ≤%25 ve 72 hücre). İkisi de değilse yükseltme yapılamaz (komut reddedilir, hiçbir şey değişmez); oyuncu **başka yerde doğrudan** büyük kurar. Bu bir sıra ya da seviye kilidi değil, **arsanın fiziksel durumudur.**

- **Raf yuvaları kalır;** yuva sayısı ve `tamCesit` büyür; kayıtlar `malId` ile olduğundan taşınmaz.
- **Küçültme yok;** `parsel_birak` ve yıkım mevcut kurallarla (iade %50/%70).
- **Yatırım Tahmini kartı** (okuma modeli, çekirdek dışı): kademe seçerken ilçe nüfusu, `Q`, rakipler ve `z` ile "tahmini satış / kasa doluluğu / net ₺/sa / geri ödeme" gösterir (§3.3 betiğinin sadeleştirilmiş hâli). Kilit yerine **bilgi** sunar.

### 3.6 Arsa, ayak izi ve sayı sınırları

| Sınır | Değer | Not |
|---|---|---|
| Arsa kullanım türü | bakkal: Konut ○ / Ticari ✓; market: Ticari ✓; süpermarket: Ticari ✓ + **cadde/ana yol cephesi** | Arsa niteliği, seviye değil ([arsa-ve-insa A5](arsa-ve-insa-derinlestirme.md)) |
| Oyuncu başına ilçede dükkân | **≤2** (dikey); süpermarket **≤1** | Tek ilçede kademe şişirme yerine ilçeler arası ölçek |
| Oyuncu başına ilde dükkân | **≤6** (dikey); süpermarket **≤2** | Büyük zincir için ≥2 il (§4.2) |
| Ruhsat (yalnız L) | N14 kartı: "Serbest / Kota (20.000 nüfusa 1 büyük mağaza; **NPC zincir + oyuncu süpermarketi ortak sayılır**) / Kapalı" | S ve M muaf; "Kapalı" ilçede **mevcut L kalır** (geriye dönük kapatma yok) |
| Hücre tavanı | Mevcut ilçe %25 ve 72 hücre | Market 2, süpermarket 3 hücre sayılır |

**Ayak izi ölçekle büyür (baş lider kararı, kesinleşti; Z4 güncellendi).** Kural: **`olcekHucre[tür] = [yuva, yuva+1, yuva+2]`**; yapı biçimi **en çok 5 hücre ve bağlı, kenar-bitişik bir küme** olmalıdır (Z4'ün {1, domino, I3, L3} kümesi bu genel kuralla yer değiştirir). Dükkânın `yuva` değeri 1 olduğundan **S (bakkal) 1, M (market) 2, L (süpermarket) 3 hücre** olur. Dikey §5.2'deki "S/M/L aynı ayak izi" dükkân için geçersizdir. (Bu rapor arsa raporunu değiştirmez; güncelleme baş lider kararıdır ve arsa-ve-insa'ya işlenmelidir: R14.)

**Neden S 1 / M 2 / L 3 (süpermarket için 2–3 aralığında 3).** (i) `olcekHucre = [yuva, yuva+1, yuva+2]` kuralı genel ölçek kuralıdır; dükkân için ek bir istisna gerekmez, kademe ↔ hücre bire bir oturur ve L 3 hücre ≤5 hücre sınırının içindedir. (ii) 6585'e göre büyük mağaza ≥400 m² **satış alanıdır** [P5]; otopark, yükleme ve depo eklenince arsa satış alanının birkaç katıdır (genel bilgi, doğrulanmadı): 3 hücre ≈2.500 m², 2 hücre ≈1.670 m² alt sınırdır. (iii) Kasa 3,6× ölçeği (90→324) yapıya yansır: M 2×, L 3× hücre. (iv) **Süpermarketi 2 hücrede tutmak** istenirse bu, tür verisinde açık bir **istisna** olarak yazılır: `olcekHucre[supermarket] = [1, 2, 2]` (M ve L aynı 2 hücre; M→L yükseltmesi hücresiz olur). Gerekçe: arsa yükünü azaltır, ≥400 m² satış alanı + otopark için ≈1.670 m² alt sınırdır. Öneri **L=3**'tür çünkü L zaten sermayeli iş modelidir ve "büyük arsa" ifadesi yapıya fiziksel yansır; genel kuraldan sapma gerektirmez. Parametre olduğundan sonradan **yeni kurulumlarda** değiştirilebilir; mevcut yapıların hücre sayısı değişmez (geri dönüşü zor, §14 karar 3).

**Doğrudan kurulum.** O ölçeğin ayak izi baştan alınır: `yapi_yerlestir` tüm hücreleri (M 2, L 3; bağlı kenar-bitişik küme) tek atomik komutta satın alır ve inşaata başlar (Z13: bitişiklik, biçim kümesi, kamu hücresi olamaz, ilçe ≤%25 ve 72 hücre; biri başarısızsa hiçbir şey değişmez). Süpermarket doğrudan açılabilir (P-7 ilkesi).

**Yerinde yükseltme (`dukkan_yukselt`).** Gereken **ek bitişik hücre(ler)** ya oyuncunun **kendi boş hücreleri** olmalı ya da **aynı atomik işlemde satın alınabilmeli** (§3.5). Güvenli iki adım: oyuncu önce bitişik hücreyi `parsel_al` ile kendi hücresi yapar, sonra `dukkan_yukselt` yalnız inşadır ve başarısız olamaz (parsel asla zorla el değiştirmez). Hücre alınamıyorsa (alınmış, kamu hücresi, tavan) komut **reddedilir**, dükkân mevcut kademede çalışmaya devam eder, bedel yoktur (hücre ayırma/rezerv yoktur). Yükseltme sürerken `parsel_birak` yükseltmeyi iptal eder (iade %50, `insaatIptalIadePpm`). Bu bir **kilit değil, fiziksel koşuldur**: oyuncu başka yerde doğrudan büyük kurabilir.

---

## 4. Marka ve zincir: oyuncunun kendi kimliği

### 4.1 Marka kimliği (birinci sınıf)

| Alan | Kural |
|---|---|
| **Marka kaydı** | `OyuncuMarka {id, ad, simge (8), renk (12)}`; ad 2–24 karakter; hesap başına **≤3 marka** (parametre) |
| **Bağlantı** | Her dükkân bir markaya bağlıdır (varsayılan: sahibin ilk markası); marka tabela/vitrin/panelde görünür |
| **Karışık kademe** | Aynı marka altında bakkal, market, süpermarket serbesttir ("Yıldız Bakkal" ya da "Yıldız" altında hepsi) |
| **Ad doğrulaması** | **Gerçek marka/zincir adları yasak listesi** ([11 K34](../11-urun-donusu.md)): BİM, A101, ŞOK, Migros ve türevleri; başkasının markasını taklit engellenir |
| **Çekime etkisi** | **Yok** (canlı-dünya "unvan/tabela/başarım çekimi etkilemez") |
| **Sicil** | Hesap bazlıdır (P5); marka yalnız **görünürlük** ve itibar göstergesi |

### 4.2 Zincir Kartı (türetilmiş kart, kademe-bağımsız)

Aynı marka altındaki dükkânlar bir "zincir"dir. Kart `OyuncuDurumu`'ndan **türetilir**; yeni yapı ya da durum değildir. Eşikler **yalnız dükkân sayısıdır**; kademe karışımı fark etmez: on bakkal da, üç süpermarket de, karışık da aynı kartı açar. (Gerçek mevzuattaki ≥5/≥10 eşiği [P5] oyun ölçeğine ≥3/≥6/≥10 diye indirilmiştir.) ≥3 dükkân zaten ilçe başına ≤2 yüzünden ≥2 ilçe, ≥10 dükkân ilde ≤6 yüzünden ≥2 il demektir; ayrı koşul gerekmez.

| Kademe | Eşik | Ödül | Bedel / sınır |
|---|---|---|---|
| **Z1 Küçük Zincir** | ≥3 dükkân | **Ortak şablon** (tek fiyat/raf önayarı tüm şubelere, Dikkat dostu); işletme gideri **−%3**; ortak marka görünürlüğü | **Marka rafı:** her şubenin yuvalarının **%50'si** markanın ortak mal listesine kilitli (±%5 fiyat bandı); ortak pay tavanı |
| **Z2 Zincir** | ≥6 dükkân | Gider **−%6**; **merkezi tedarik paneli** (tek sözleşmeden şubelere dağıtım); yeni şube inşa maliyeti **−%10** | Aynı |
| **Z3 Büyük Zincir** | ≥10 dükkân | Gider **−%10**; marka "tanınırlık" rozeti (**çekimi etkilemez**) | İller arası dağıtım gerçek lojistiktir (bozulan mallar için ayrı üretim) |

- **Gider indirimi yalnız işletme giderindedir** (kasa, bakım). **Tedarikçi fiyatı sıkıştırılamaz:** sözleşme bandı [0,95 ; 1,05] R sabittir; hacim indirimi yok (NPC ithalatında da yok: faucet yok).
- **İndirimler bilerek küçüktür** (S'te −%3 ≈ ₺4/sa/şube): zincirin asıl kazancı **çoklu ilçe ölçeği** (her ilçenin kendi talebi), ortak şablon (Dikkat yükü azalır) ve merkezi tedarik; indirimler parametredir (R11).
- **Marka rafı:** bakkal zincirinin "yerel ürün" rafı yarı yarıya kısıtlanır; bağımsız bakkalın %100 yuvası serbesttir (§9.1).
- **Ortak sicil** iyi yönüyle zincirin güvenilirliği, kötü yönüyle riskidir (bir şubenin teslimat ihlali hesabın sicilini düşürür).

### 4.3 Bakkal zinciri Yakınlık Havuzu'nu ne zaman kaybeder?

**Şube sayısıyla kaybetmez.** Eski öneri ("şube ≤5") kaldırıldı; gerekçe:

| Soru | Cevap |
|---|---|
| Niş neye bağlı? | **Dükkânın kademesine** (`bakkal`: S): mahalledeki küçük dükkân kapı önü, saat ve eksik malzeme ihtiyacını karşılar. Bu fiziksel özellik sahibin kaç dükkânı olduğundan bağımsızdır |
| Kötüye kullanım? | Her şube **kendi ilçesinin** havuzundan pay alır; ilçe başına ≤2 dükkân, ilde ≤6 ve pay tavanı zaten yoğunlaşmayı sınırlar; `Yakınlık` payı yine `w` oranında bölünür |
| Gerçek örnek | BİM, A101, ŞOK bakkal boyutunda **zincirdir** ve yakınlık avantajıyla büyür; oyunda bakkal zinciri bu seçimi **birinci sınıf** yapar |
| **Ne zaman kaybeder?** | (i) **Şubeyi markete/süpermarkete çevirince** (kademe K1 olmaktan çıkar); (ii) başka bir nişi **zincir olmaktan** değil, **marka rafı** nedeniyle kaybeder: yuvaların %50'si kilitli olduğundan "yerel ürün" avantajı (vitrin +%3) ve imza ürün farklılaşması yarıya iner |
| Bedeli ne? | Z1+ pay tavanı hesabı ortaktır; tek oyuncu çok ilçede büyürken yerel (mahalle) kimliğinden marka rafı kadar ödün verir |

Sayısal doğrulama: ilçe başına 2 bakkal (zincir) + 2 bağımsız bakkal, `Q`=1.000, z=0,35: zincirin her şubesi **90 birim/sa** (kasa dolu), net ₺898/sa; Q=500'de 60,9 birim/sa, ₺566/sa. Yakınlık Havuzu zincirin payını bağımsızlara göre **abartmaz** (aynı `w` oranı).

### 4.4 N14 sınırlarına uyum

| N14 kuralı | Oyuncu zinciri/süpermarketi için |
|---|---|
| Talep `D` sabit; zincirin bütçesi bakkalınkinden devralır | **Aynen.** Oyuncu zinciri yeni para yaratmaz (B ve η, G12) |
| `z(t)=zMax(1−e^(−t/τ))`, zMax %55 / Kota %35 / Kapalı 0 | **Değişmez.** Oyuncu zinciri NPC `z`'nin **dışında**, `(1−z)·Q` içinde yarışır |
| Ruhsat kartı (Serbest/Kota/Kapalı), 28 gün kilit, çıkar çatışması bayrağı | **L'ye de uygulanır;** kota NPC ile paylaşılır. S ve M muaf |
| Tedarikçi başına ≤%35 | NPC zincir içindir. Oyuncu zinciri için ölçüt **ZP2**: en büyük tek tedarikçi payı ≤%50 (izlenir) |
| Çoklu hesapla müşteri paylaşımı yok | Pay tavanı **hesap bazlı**; havuz dükkân/kalite başına |
| Genel ad, marka yok | Oyuncu markası serbest ama **gerçek marka yasak listesi** |
| İM14.1 bakkal sayısı 60. günde ≥%40 | Yakınlık Havuzu ve pay tavanı mekanik taban (PK2) |

### 4.5 Ruhsat siyaseti ile oyuncu L'si

Ruhsat kartı ilçe meclisi kararıdır (28 günde bir). Oyuncu süpermarketi **kota doluysa açılamaz**; "Kapalı" ilçede mevcut L kalır. Esnaf-Tüccar grubu "Kota/Kapalı"yı destekler; Hane/İşgücü "Serbest"i. Bakkal sahibinin siyasi aracı (meclis oyu) ile sermayeli oyuncunun ekonomik aracı (L) arasındaki gerilim N14'ün Politika yönüyle birleşir. Bu bir **kilit değil koruma**dır: sıra ya da seviye şartı koymaz, yalnız büyük mağaza sayısını sınırlar.

---

## 5. Tür kataloğu ve mal × satış kanalı matrisi

### 5.1 Tür kataloğu

Dikey raporun altı türü (fırın, bakkal, şarküteri, şekerci, yapı market, giyim) **tekrar edilmez**; kademe alanları ve yeni türler eklenir. **İlçe seviyesi sütunu yoktur (kilit yok; seviye yalnız `Q`, çeşit çekimi ve ruhsat kotası üzerinden etki eder).** `olcekAraligi`: türün geçerli ölçekleri; `aile`: üretici-dükkân / çeşit-dükkân; `talep`: talep kalemi (açık ihtiyaç kademesi talebi belirler, açılışı değil).

| Tür (`id`) | Ölçek | `tamCesit` | Mal listesi (Alfa-1 nihai) | Talep | Aile | Özel kural | Alfa |
|---|---|---:|---|---|---|---|---|
| **bakkal** | S | 6 | §3.2 | K1 | çeşit | Yakınlık Havuzu; uzun saat (06–24) | **A0** |
| **market** | M | 9 | bakkal ⊂ + `zeytinyagi`, `kuru_meyve`, `bal`, `cay` | K1 | çeşit | Raf eki ×2 | A1 |
| **supermarket** | L | 12 | market ⊂ + `kagit`, `bakliyat`, `hazir_giyim`, `elektronik` | K1, K2, K3 | çeşit | Büyük mağaza: ruhsat+kota | A1 |
| **firin** | S–M | 2–3 | `ekmek`, `gida` (hamur işi) | K1 | üretici | Bozulma A; sabah piki (05:30–20:00) | **A0** |
| **sarkuteri** | S–M | 4 | `sut`, `sut_urunu`, `zeytinyagi`, `gida`, `et` | K1 | üretici/çeşit | Soğuk dolap modülü bozulma ×0,5 | **A0** |
| **sekerci** | S | 3 | `sekerleme`, `findik_urunu`, `kuru_meyve` | K1 | üretici | Bayram **talep** artışı (toplam sabit; açık/kapalı kuralı yok) | **A0** |
| **yapi_market** | S–L | 5 → 8 | `pencere`, `celik`, `cimento`, `parca`, `cam`, `kereste` | K2 + oyuncu inşaatı | çeşit | **Oyuncu alıcı** (toplu alım); Sanayi arsası ○; L ruhsat gerektirmez (yapı malzemesi büyük mağaza sayılır mı: **doğrulanmadı**) | **A0** |
| **giyim** | S–L | 2–3 → 6 | `hazir_giyim`, `kumas`, `yun`-ürünü | K2 | üretici/çeşit | Okul açılışı (Eylül) +%20 talep (toplam sabit) | A1 |
| **kasap** | S–M | 3 | `et` | K1 | üretici | Soğuk dolap zorunlu (modülsüz çekim ×0,6); mal: hayvancılık dalgası | A1 (mal bağımlı) |
| **manav** | S–M | 3 | `taze`, `kuru_meyve`, `zeytin` | K1 | çeşit | Hızlı bozulma; hal bağı (N3) | A1 |
| **mobilyaci** | M–L | 4 | `mobilya`, `kereste`, `hali` | K2 | üretici/çeşit | Sipariş-bazlı; Bursa/İnegöl | Sonra |
| **toptan** | S–L | — | tüm Tier 1 (B2B) | — | aracı | **NPC müşteri çekmez** (§6.2) | A1-son |
| **tezgah** | — | 2 | kendi seçimi | — | — | Açılış Tezgâhı (§8.3) | **A0** |

Notlar: (a) `mobilya` bir **mal**, `mobilyaci` bir **tür** kimliğidir; doğrulayıcı kuralı: **tür kimlikleri mal kimlikleriyle kesişmez** (`sarkuteri` dükkân türüdür, [argelider Ö12]); (b) `kasap`, `manav`, `mobilyaci` mal bağımlıdır; zincirleri kardeş raporların konusudur, burada yalnız bağımlılık; (c) giyim talebi K2'ye bağlıdır (kilit değil talep, §3.1).

### 5.2 Mal × satış kanalı matrisi (çıkmaz mal denetimi)

Kural: **her mal en az bir perakende ya da B2B çıkışına bağlı olmalı.** Kanallar: **Raf** (dükkân türü), **B2B** (zincir içi/sözleşme), **Hal** (N3, bozulan), **Kamu** (sabit fiyatlı sipariş v0, ihale), **Pazar** (NPC pazar ihracat/ithalat). ✓ var, ○ planlı (faz), – yok.

**Alfa-0'ın 23 malı** (14 mevcut + 9 yeni; [dikey §9.2](dikey-zincirler-ve-perakende.md)):

| Mal | Üretim | Raf (tür) | B2B | Hal | Kamu | Pazar | Sonuç |
|---|---|---|---|---|---|---|---|
| `tahil` | Tarla | – (ham) | değirmen/ahır; sözleşme A1 | – | taban fiyat alım ○ A1 | ✓ | tamam |
| `cevher` | maden | – (ham) | yüksek fırın | – | – | ✓ | tamam |
| `komur` | maden | – (yakacak: sonra) | fırın, santral | – | – | ✓ | tamam; yakacak rafı **sonra** |
| `bakir` | maden | – | elektronik | – | – | ✓ | tamam |
| `silis` | maden | – | cam, çimento, elektronik (3 tüketici) | – | – | ✓ | tamam |
| `petrol` | kuyu | – | rafineri | – | – | ✓ | tamam |
| `elektrik` | santral | – (depolanamaz) | tesisler | – | – | hane (K1) | tamam |
| `celik` | Çelikhane | yapi_market | doğrama, parça | – | onarım ihalesi | ✓ | tamam |
| `parca` | Parça fab. | yapi_market | bakım, doğrama | – | onarım | ✓ | tamam |
| `elektronik` | Elektronik fab. | **– (hiçbir tür)** | – | – | – | ✓ (yalnız ihracat) | **açık:** K3 talep kalemi var, dükkân yok |
| `gubre` | Gübre fab. | **–** | Tarla girdisi (A0 kapalı, A1 sözleşme) | – | – | ✓ | **açık** (yalnız B2B/pazar) |
| `muhimmat` | Mühimmat fab. | – (bilinçli) | – | – | askeri ikmal | ✓ | tamam (dükkânda satılmaz) |
| `yakit` | Rafineri | bakkal | taşıma, fırın girdisi | – | – | ✓ | tamam |
| `gida` | Gıda fab./ahır | bakkal, market | – | – | okul/hastane | ✓ | tamam |
| `un` | Değirmen | bakkal, market (**dikey bakkal listesine eklendi**); fırın un satmaz (girdi) | fırın (A0 kapalı, A1 sözleşme) | – | – | ✓ | **giderildi** |
| `ekmek` | Fırın | firin, bakkal | – | ✓ günlük | okul/hastane | ✓ | tamam |
| `cam` | Cam fırını | yapi_market (**eklendi**: levha cam) | doğrama (pencere) | – | – | ✓ | **giderildi** |
| `pencere` | Parça fab. | yapi_market | – | – | okul/muhtarlık onarımı | ✓ | tamam (+ inşaat talebi) |
| `sut` | Ahır | bakkal, sarkuteri (**eklendi**: şişe süt) | mandıra | ✓ | okul gıdası | ✓ | **giderildi** |
| `sut_urunu` | Mandıra | sarkuteri, bakkal | – | ✓ | okul | ✓ | tamam |
| `findik` | Bahçe | – (ham); **Yerinde Satış modülü** (çiftlik tezgâhı) | kavurma | – | taban fiyat alım ○ A1 | ✓ | tamam |
| `findik_urunu` | Kavurma | sekerci, bakkal (**bakkala eklendi**) | ezme/şekerleme | – | – | ✓ | **giderildi** |
| `sekerleme` | Ezme | sekerci, bakkal | – | – | – | ✓ | tamam |

**A0-ops ve A1 eklemeleri:** `cimento` (yapi_market ✓, kamu ✓, B2B ✓, pazar ✓); `boksit`, `alumina`, `aluminyum` (rafsız ara; B2B çıkışı var: bir sonraki kademe + pazar); `pamuk`, `iplik` (rafsız; B2B iplik/kumaş; pamuk çiftlik tezgâhında); `kumas` (giyim ✓ ev tekstili); `hazir_giyim` (giyim ✓, supermarket ✓, kamu üniforma ✓, pazar ✓).

**Rafta olup üretim zinciri olmayan mallar ("yalnız ithal"):**

| Mal | Raf (tür) | Üretim durumu | Kanal | Öneri |
|---|---|---|---|---|
| `et` | kasap, sarkuteri | hayvancılık zinciri A1 (kardeş rapor) | hal ✓, pazar ✓ | Zincir gelene dek tür listesinde **ithal** etiketi; kasap A1'e |
| `taze` | manav, bakkal (A1) | sera/bahçe zinciri A1 | hal ✓ | A1'e; Alfa-0 listesinden çıkar |
| `zeytinyagi` | market, sarkuteri | zeytin zinciri A0-ops (Bursa) | pazar ✓ | Zincir yoksa **ithal** etiketi |
| `kuru_meyve`, `bal`, `bakliyat`, `cay` | market, sekerci | imza zincirleri A1 | pazar | A1'e; Alfa-0 listesinden çıkar |
| `kagit` | supermarket (kırtasiye) | A0-ops (Kocaeli) zinciri yok | B2B ambalaj, pazar | Süpermarket A1'de **ithal**; kırtasiye türü sonra |
| `kereste`, `mobilya`, `yun`, `hali` | yapi_market, mobilyaci, giyim | A0-ops/A1 zincirler (kardeş raporlar) | B2B, pazar | A1'e |

**Kurallar ve öneriler (her açık için):**
1. **Mal listesine giriş şartı:** bir mal tür listesine **ancak** (i) üretim zinciri aynı fazda açıksa ya da (ii) NPC pazar kaydı (`emilimSaat/arzSaat`) varsa girer; (ii) durumunda **"İthal" etiketi** ve düşük marj uyarısı (ZP11; ithal ≈ 1,111 R, marj ≈ %3–8) gösterilir. Pazar kaydı olmayan mal rafa **konamaz** (doğrulayıcı).
2. **`elektronik` açığı:** A1'de `supermarket` listesine küçük raf olarak (eklendi, §3.2); sonra `teknoloji_magazasi` türü. A0'da yalnız pazar ihracatı.
3. **`gubre` açığı:** A0'da kapalı zincir + pazar yeterli; **sonra** `tarim_market` (gübre, parça, yakıt; kooperatif bakkalı ile birleşir). Üretici modülü gübreyi satmaz (ham girdi).
4. **`komur` yakacak rafı:** sonra (bakkalda kış mevsimi kalemi); bugünkü K1 talebi `yakit`'tadır.
5. **`cam`, `un`, `sut`, `findik_urunu`:** dikey listelerde rafsızdı; bu raporda bakkal/yapı market listelerine **eklendi**. **Dikey §5.3'e küçük düzeltme önerisi.**
6. **Tüm Alfa-0 malları** artık en az bir çıkışa sahiptir (açık yalnız `elektronik` ve `gubre`; ikisi de pazar çıkışlıdır, perakende çıkışı sonraya bağlanmıştır).

---

## 6. Üretici satış noktası ve toptan

### 6.1 Üretici satış noktası: "Yerinde Satış" modülü

**Çiftlik tezgâhı** ve **fabrika satış mağazası** ayrı yapı değil, üretim tesisine takılan **modüldür** (modül yuvası S 1 / M 2 / L 3; [arsa-ve-insa §3.1](arsa-ve-insa-derinlestirme.md)). Gerekçe: G11 (yeni yapı yok), hücre maliyetsiz, Tarım yönünde **ilk satış noktası**.

| Alan | Çiftlik tezgâhı (`yerinde_satis_ciftlik`) | Fabrika satış mağazası (`yerinde_satis_fabrika`) |
|---|---|---|
| Takıldığı tesis | `ciftlik`, `ahir`, `mera`, `sera` (ileride) | `gida_fabrikasi`, `parca_fabrikasi` |
| Raf yuvası | **2** (yalnız tesisin kendi çıktısı: ham ürünler dahil, ör. `findik`, `sut`, `pamuk`) | **2** (kendi çıktısı) |
| Kasa | ≤40 birim/sa | ≤40 birim/sa |
| Fiyat bandı | [0,95 ; 1,25] R | **[0,85 ; 1,10] R** (outlet) |
| Havuz | **Doğrudan satış havuzu** (P'nin %10'u), yalnız **tesisin ilçesi** | aynı |
| Gider / inşa | ≈₺30/sa; 6 çelik + 2 parça | ≈₺30/sa; 10 çelik + 4 parça |

- **Neden küçük:** hacim ≤40 birim/sa ve havuz %10; üretici asıl zincirini dükkâna/pazara satar. Modül bir **kademe değil**, tamamlayıcı kanaldır.
- **Komisyon/hal rüsumu yok:** gerçek 5957'de üreticinin doğrudan perakende satışı rüsumdan muaftır [P7]; oyunda NPC pazar komisyonu (%1) bu kanalda yoktur.
- **Stok** tesisin il düğümünden çekilir (il içi bedava); ek stok yok.
- **Kooperatif/KOOP bakkal (sonra):** [P6] gibi, N2 kooperatif toplu alımıyla üyelerin ürününü satan **kooperatif bakkalı** `bakkal`ın alt türü olabilir; yalnız kayıt.

### 6.2 Toptancı ve hal (B2B)

NPC **hal toptancısı** (N3; ≈0,94 R) mevcut karardır. Oyuncu toptancısı `toptan` türü (Alfa-1-son):

| Konu | Kural |
|---|---|
| **Alıcı** | Oyuncu dükkânları (raf sözleşmesi), NPC **esnaf siparişi** (N14), hal gün-sonu; **NPC hane müşterisi çekmez** |
| **Değer önerisi** | (a) **Çeşit toplama:** tek sözleşmede ≤6 mal "sepet sözleşmesi"; (b) iller arası dağıtım; (c) vade (7 gün, teminatlı); (d) risk devri |
| **Fiyat** | Tedarikçiden 0,95–1,00 R, dükkâna 1,00–1,05 R; **marj ≤%8** |
| **Faucet** | Yeni para yok (sıfır toplam) |
| **Sınır** | İlçe başına ≤1 toptan; mal başına ilçe tedarik payı ≤%50 |
| **Neden sonra** | P5 sözleşme altyapısına ve ≥2 üretici/≥2 perakendeci ekosistemine bağlı |

Hal (N3) NPC günlük kapanışıdır (bozulan mal çıkışı); oyuncu toptancısı sözleşmeli, sürekli akıştır. İkisi birbirini dışlamaz.

---

## 7. Oyuncular arası tedarik, marka ve fiyat rekabeti

### 7.1 Raf tedarik sözleşmesi (Alfa-1, P5 bağımlı)

| Alan | Kural |
|---|---|
| **Taraflar** | Tedarikçi oyuncu → dükkân sahibi (ya da toptancı) |
| **Konu** | Tek mal, **günlük/saatlik miktar** (birim/sa), teslim: dükkânın **il düğümü** |
| **Fiyat** | [0,95 ; 1,05] R; sabit ya da referansa endeksli |
| **Süre** | ≤14 gün, yenilenebilir; açık sözleşme ≤3 / yuva |
| **Teminat** | **1 günlük teslim değerinin %20'si** (iki taraf; sicile göre ×0,5–×1,5); gecikme/eksik teslim cezası |
| **Teslim** | Aynı il: bedava ve anlık; başka il: lojistik tedarikçinin sorumluluğu (bozulan mal için aynı il şart) |
| **Raf bağı** | Yuva `oncelikliKaynak = sozlesme:<id>`; stok yine dükkân sahibinin il düğümü stokundan çekilir |
| **Kimin kârı** | Dükkân: satış − sözleşme fiyatı; tedarikçi: sözleşme fiyatı − NPC pazar 0,891 R; **her iki taraf NPC pazardan iyi** (NPC makası ortadan kalkar) |

Ne kazandırır: çeşit-dükkânların tek zincirle dolduramadığı rafı tamamlar ve ara kademe uzmanlığını (dikey §6) mümkün kılar: Alfa-0'daki "kapalı zincir" kimliğinden **ağ oyununa** geçiş.

### 7.2 Marka etiketi

- Sözleşmeli yuvada **üretici adı** (marka) görünür; yürüyüşte vitrin etiketinde (≤3 ürün), panelde raf satırında.
- **Çekimi etkilemez** (canlı-dünya §4.1). Kalite ilçe tabanlıdır (dikey karar 12): marka kaliteyi değiştirmez, kimin ürünü olduğunu gösterir.
- Fayda: tedarikçiye görünürlük ("Esnaf Kartı: şu dükkânların rafındayım"), başarım ("İlk Marka Rafı"); dükkâna güvenilirlik.
- Kötüye kullanım: gerçek marka yasak (K34), taklit ad doğrulamasıyla engellenir.

### 7.3 Satış bilgisi (tedarikçiye)

Sözleşmeli raftaki malın **günlük satış, ortalama fiyat ve stok devri** tedarikçiye gösterilir. Çekirdek maliyeti sıfıra yakın (`satisDefteri[dukkan][mal]` okuma yetkisi). Dükkân sahibinin marjı gösterilmez.

### 7.4 Konsinye ("sat-sonra-öde"), Alfa-1-son/sonra

| Alan | Kural |
|---|---|
| **Mantık** | Mülkiyet teslimde dükkâna geçer; ödeme **satılan miktar kadar günlük**; borç = birim × sözleşme fiyatı |
| **Mülkiyet** | Dükkân sahibinin il düğümü stokuna geçer (**çapraz sahip stok okuması yok**) |
| **İade** | 14 günde satılmayan kısım otomatik iade (il içi bedava) |
| **Risk** | Bozulma/stok riski tedarikçide; dükkân sermaye bağlamaz |
| **Faucet** | Yok (ödeme zamanlaması) |
| **Neden sonra** | Borç defteri, iade akışı, sicil entegrasyonu |

### 7.5 Fiyat rekabeti ve fiyat savaşının sınırları

Mevcut bekçiler (dikey): NPC pazar tabanı **0,891 R**, esnaf tabanı %25, band [0,7 ; 1,4] R, ≥6 saat arayla ≤4 değişiklik/gün, esnaf kampanyası (>%60 pay). **Eklenen sınırlar:**

| # | Sınır | Değer | Etki |
|---|---|---|---|
| 1 | **Oyuncu pay tavanı** (kademeli, **Alfa-1**) | n=1 yok, n=2 %70, n≥3 %50 | Fiyat indirip pay genişletme tavanda biter |
| 2 | **Kasa kapasitesi** | S 90 / M 198 / L 324 | Satış kasadan fazla olamaz; **kasa dolu ilçede fiyat kırmak satışı artırmaz** |
| 3 | **Kampanya penceresi** | **0,85 R altı** "kampanya": günde ≤6 saat, haftada ≤2 gün; pencere dışında fiyat 0,85 R'ye sabitlenir; band [0,7 ; 1,4] (G12) korunur | Kalıcı dip engellenir |
| 4 | **Fiyat çıpası uyarısı** | Fiyat <0,891 R ise Dikkat: "NPC pazar daha yüksek ödüyor" | Bilgilendirir |
| 5 | **Yakınlık Havuzu** | Bakkal payı kapatılamaz | Zincirin bakkalı fiyatla süpürmesi mümkün değil |
| 6 | **Esnaf tabanı + 14 gün EMA** | %25 taban | Esnaf payı sıfırlanamaz |
| 7 | **Hane bütçesi B ve η** | Fiyat ↑ → hacim ↓ (K1 η 0,3; K2 0,8) | Sınırsız fiyat artırma yok |

**Sayısal örnek (betik).** 100 bin nüfuslu ilçe, `Q`=1.000, z=0,35, Yakınlık %15, **n=2 (A zinciri L+M, B bakkal) tavan %70**; A 0,97/0,99 R'de, B 1,05 R'de. A **pay tavanındadır** (341,2 birim/sa; net **₺1.596/sa** = 863 + 733). A fiyatını düşürürse:

| | A-L | A-M | A toplam | B (bakkal) |
|---|---:|---:|---:|---|
| Satış, 0,97/0,99 R | 209,7 | 131,5 | **341,2** (tavan) | 90 (net ₺898) |
| Satış, **0,90 R** | 210,0 | 131,2 | **341,2** | 90 (₺898) |
| Satış, **0,80 R** | 210,4 | 130,8 | **341,2** | 90 (₺898) |
| Net (gider sonrası) 0,80 R | −1.709 | −873 | **−2.582/sa** | **+898 (değişmez)** |

Sonuç: **fiyat savaşı bakkala zarar vermez, zincirin kendisine ≈₺4.200/sa'lık fark yazar** (₺1.596 → −₺2.582). Pay tavanı yüzünden pazar payı artmaz; B kasa ve Yakınlık Havuzu yüzünden satışını korur. **Bu düzende fiyat savaşı kârlı değildir:** oyuncuya "stratejik fiyat" sunar ama "yıkma" sunmaz. Küçük ilçede iki bakkal arasındaki fiyat kırma örneği (§10, b1) tavan olmadan da kendini cezalandırır.

**Yan etkiler.** (a) Pay tavanı "başarının cezası" gibi görünebilir (karar 5; PK3); bu yüzden tavan **yalnız n≥2'de** ve ince dünyada gevşektir (§9.3); (b) kampanya sınırı okul açılışı/bayram gibi talep-tarafı olaylarını engellemez (onlar talep zamanlamasıdır, fiyat değişimi değil); (c) ithalatla raf doldurmak (dikey §5.6) meşrudur, ZP11 izler.

---

## 8. Mahalle dokusu ve canlılık

### 8.1 Yürüyüş sahnesinde dükkân

Yürüyüş adaptasyon katmanıdır ([12 §2](../12-yon-taslagi.md)); dükkân yalnız **okunur bir yüzdür**, her işin panelde karşılığı vardır. Bütçe: ≤60 çizim çağrısı, "düz renk, kenar çizgili siluet" ([görsel kimlik §4.8](gorsel-kimlik-ve-arayuz.md)), sunum **çekirdek durumuna yazılmaz**.

| Öğe | Veri kaynağı (çekirdekten, sıralı doğruluk) | Teknik | Çizim çağrısı |
|---|---|---|---|
| **Tabela** | Marka: simge (8) + renk (12); **zincir şubelerinde ortak** | Cephe sprite atlası; ad **yalnız ≤25 m ve seçiliyken** (tek DOM etiketi) | 0 |
| **Vitrin** | İlk **3 raf yuvası** (vitrin ≤3 ürün); marka etiketi | Sprite; boş yuva = boş raf | 0 |
| **Açık/kapalı** | Türün **günlük saat tablosu** (bakkal 06–24, fırın 05:30–20:00, market/süpermarket 08–22, kasap/manav 08–19, yapı market 08–18); pazar günü | Örnek başına öznitelik bayrağı | 0 |
| **Kapı önü kuyruk** | `min(6, ⌈6 · satış/kasaKapasite⌉)` siluet; kasa doluluğu >%80 ise ≥3 | Mevcut NPC kalabalık `InstancedMesh`'ine "kapı önü" konumları (tohum: `dukkanKimligi ⊕ ⌊t/60 sn⌋`) | **0** |
| **Boş raf** | Stok 0 ⇒ vitrin boş; 6 saat sonra çeşitlilikten düşer | Rozet + vitrin | 0 |
| **Çarşı kümesi** | Aynı adada ticari yapı sayısı (+%3 / ≤+%9) | Işık/kalabalık yoğunluğu | 0 |
| **Esnaf dükkânları** | Çekirdek `esnafSayisi`; **OSM nokta adayları** (`shop=convenience|supermarket|bakery|butcher|greengrocer`) | NPC esnaf sprite (≤30/ilgi alanı); **sayı çekirdekten, konum OSM'den** (OSM yoğunluğu **doğrulanmadı**); marka adı gösterilmez (K34) | 0 |

- **Yapay zekâ yok.** Müşteri akışı çekirdekteki **satış hızının** sıralı işaretidir (kıtlık ⇒ boş raf, kalabalık ⇒ kuyruk).
- **Zincir görünürlüğü:** aynı renk+simge mahalle sokaklarında tanıdık görünüm kurar [G4] ama çekimi etkilemez.
- **`[E]` hapı:** kendi dükkânında "Dükkânı yönet" (panel), başkasında "Vitrine bak" (vitrin fiyatı = ilçe fiyat bandının tek örneği; dikey §5.5 A1 kuralı); iç mekân 3B yok.

### 8.2 NPC müşteri akışı ve talep eğrisi

Çekirdek akış (günlük kuantum; saat içi eğri yalnız sunum; [canlı-dünya §2.3](canli-dunya-simulasyonu.md)) değişmez. Sunum saat eğrisi (türe göre): bakkal sabah (07–09) ve akşam (17–21) pikleri; süpermarket hafta sonu öğleden sonra; fırın sabah; yapı market hafta sonu. Eğri yalnız **kuyruk sayısını ve kalabalığı** değiştirir; satış hesabı günlüktür.

**Bayram ve özel günler.** Dini bayram **yalnız talep eğrisi ve hatırlatma takvimidir** ([12 §7](../12-yon-taslagi.md)): `sekerleme` ve benzeri kalemlerin **talep zamanlaması** kayar, **toplam sabit** kalır (bayram sonrası telafi; K-5). **Dükkân açık/kapalı kuralı, havuz payı değişimi ya da kademeye özgü bayram davranışı yoktur.** Saat tabloları (§8.1) her gün aynıdır.

### 8.3 Pazar günü tezgâhı ↔ kalıcı dükkân

| Konu | **Pazar günü tezgâhı** (İ-2) | **Kalıcı dükkân** |
|---|---|---|
| Arsa | Kamu pazar yeri **kullanım izni** (kura, haftalık, ₺30/hafta); **hücre yok** | Sahip olunan hücre |
| Süre | Haftalık; yenileme yok (yeni kura) | Kalıcı |
| Mal | ≤5 mal, fiyat ±%15, kasa ≈60 birim/sa | Yuva 4–14, band [0,7 ; 1,4] |
| Havuz | Pazar günü P'nin **%15'i** | Ana + Yakınlık (bakkal) |
| Stok | **Aynı il düğümü stoğundan** | Aynı |
| Rolü | Sınama/giriş (yeni oyuncu %20 kota), pazar günü stratejisi | Standart kanal |
| Çevrimdışı | Satar (kasiyer %70) | Satar |

**Açılış Tezgâhı (K0)** pazar günü tezgâhından farklıdır: yeni oyuncuya **parasız, anında, bir kez, 14 gün süreli** (öneri), her gün açık, 2 yuva, kasa 20; süre bitince "Kendi tezgâhın → bakkal" kartı çıkar (bakkal bir **seçenektir**, zorunlu sıra değil). Pazar günü kararı **stratejiktir** ve **kaçırma cezası yoktur** (stok kalır, dükkân normal satar).

---

## 9. Denge

### 9.1 Küçük bakkalın hayatta kalma nişi

| Dayanak | Mekanik | Etkisi |
|---|---|---|
| **Yakınlık** | Yakınlık Havuzu (P'nin %15'i), `bakkal` kademesi | Bakkal başına ≈ +%7 satış; kapatılamaz |
| **Saat** | Uzun saat (06–24), sunum | Görünürlük |
| **Yerel ürün** | **Yerel Rozet:** raf malı **aynı ilçede üretildiyse** vitrin puanına +%3 (≤ vitrin tavanı +%10 içinde) | Küçük ama anlamlı; marka rafı kilidi zincirde yarıya indirir |
| **Serbest raf** | Bağımsız bakkalın %100 yuvası serbest | Yerel/imza farklılaşma |
| **Veresiye** (A1-ikinci) | Sadakat +%10, tahsilat riski (N14) | Orta |
| **Pazar günü** | Tezgâh ile birlikte çalışır | Çok kanal |
| **Düşük gider** | S ₺132/sa; geri ödeme 13–23 sa | Düşük risk |
| **Oda/Kooperatif** | N1 +%5 güven, N2 toplu alım | Tedarik gücü |

**Dürüst sınır:** bakkal tavan de yaşar (kasa 90, ilçede ≤2 dükkân); büyümek için **ilçeler arası zincir**, **market**e yükseltme ya da süpermarket seçeneği vardır. Hiçbiri zorunlu değildir; bakkalda kalmak geçerli bir iş modelidir (PK7).

### 9.2 Tekelleşmeye karşı korumalar

| # | Koruma | Sertlik | Kaynak |
|---|---|---|---|
| 1 | Oyuncu perakende pay tavanı (kademeli: n=1 yok, n=2 %70, n≥3 %50; Alfa-1) | **Sert** (su-doldurma) | Bu rapor |
| 2 | İlçe başına ≤2 dükkân, ≤1 süpermarket; ilde ≤6 / ≤2 | **Sert** | Dikey + bu rapor |
| 3 | İlçe pay tavanı (hücre) %25, 72 hücre | Sert (mevcut) | `parametreler.json mulk` |
| 4 | Ruhsat kartı ve kotası (L) | Siyasi | N14 |
| 5 | NPC zincir zMax %55, esnaf tabanı %25 | Sert | N14, canlı-dünya |
| 6 | Yakınlık Havuzu | Sert (bakkal taban) | Bu rapor |
| 7 | Kampanya sınırı (<0,85 R) | Sert | Bu rapor |
| 8 | Zincir gider indirimi tavanı −%10; tedarikçi bandı | Sert | Bu rapor |
| 9 | Esnaf indirim kampanyası (>%60) | Otomatik, yumuşak (§9.3) | Canlı-dünya E14 |
| 10 | Mal başına toptan tedarik payı ≤%50 | Sert | Bu rapor |

Tekelleşme tek mekanizmayla değil, çok küçük frenle çözülür; hiçbiri tek başına oyun bitiren değildir (PK4 izler).

### 9.3 İnce dünyada pay tavanı (Alfa-0: ≈200 oyuncu, 45 ilçe)

Alfa-0'da ilçe başına ≈4–5 oyuncu vardır ve çoğu ilçede 1–3 perakendeci olacaktır. Sabit %50 pay tavanı burada **tek oyuncunun payının yarısını esnafa vermek** olurdu. Betik sonuçları (`Q`=1.000, tüm fiyatlar 1,05 R'ye yakın):

**(A) Alfa-0 dilimi: yalnız S dükkân, z=0 (N14 yok), kademe çarpanı ve Yakınlık yok.**

| Düzen | Oyuncu satışı | Esnafa kalan | Tavan %50 etkisi |
|---|---|---|---|
| n=1, 1 bakkal | 90 (kasa dolu) | 910 (%91) | **yok** |
| n=1, 2 bakkal | 180 | 820 | **yok** |
| n=2, 1+1 bakkal | 90 + 90 | 820 | **yok** |
| n=3, 1+1+1 bakkal | 90+90+90 = 270 | 730 (%73) | **yok** |

**Bulgu:** Alfa-0'da talep değil **kasa** bağlayıcıdır; esnaf tabanı hacmin %73–91'ini tutar. Tavan hiçbir düzende devreye girmez; bu yüzden **Alfa-0'da tavan yoktur** (gereksiz karmaşıklık).

**(B) Alfa-1: L+M zinciri (A), z=0,35, Yakınlık %15.** `P`=487,5.

| Düzen | Tavan yok | Sabit %50 | Kademeli (n=1 yok / n=2 %70 / n≥3 %50) |
|---|---|---|---|
| **n=1** (yalnız A) | A 487 (%100), net **₺2.509** | A 244 (%50), net **₺988** (**−%61**), +244 esnafa | **A 487, net ₺2.509** (tavan yok) |
| **n=2** (A + B bakkal) | A 403 (%83), B 85 | A 244, B 90 | **A 341 (%70), B 90**; A net ₺1.596, B ₺898 |
| **n=3** (A + B + C) | A 346 (%71), B 73, C 69 | A 244, B 90, C 90 | **A 244 (%50), B 90, C 90**; A net ₺988, B ₺898, C ₺1.093 |

**Okuma ve öneri:**
1. **Etkinleşme:** tavan Alfa-0'da **kapalı**; Alfa-1'de **n≥2** perakendeci olduğunda açılır; n=2'de %70 (tek rakibi bile korumak için gevşek), n≥3'te %50. **n=1'de tavan yoktur:** korunacak rakip yok ve esnaf tabanı (T'nin %25'i) zaten üst sınırdır.
2. **Yeni oyuncu cezalandırılmaz:** ince ilçedeki tek ya da iki oyunculu düzende pay esnafa değil oyuncuya kalır; sabit %50, n=1'de neti %61 düşürürdü.
3. **Esnaf kampanyası ile ilişki (canlı-dünya §4.2, E14: >%60 pay → esnaf indirimi, 24 sa / 7 gün):** kampanya **yumuşak, otomatik ve fiyat tabanlıdır**; pay tavanı **sert ve paydır**. Hangisi hangisinin yerine geçer: **n≥3'te tavan (%50) kampanya eşiğinin (%60) altında olduğundan kampanyayı gereksiz kılar** (tetiklenmez); **n=2'de** (tavan %70) kampanya %60–70 bandında devreye girer; **n=1'de** tek fren esnaf tabanı + kampanyadır. Betik notu: esnaf tabanı %25 bağlayıcı olduğu için kampanyanın payı değiştirmesi için esnaf ağırlığının ≈2 katına çıkması gerekir (esnaf fiyatını ref'e indirmek +%25 yeter değil): kampanya bu yüzden pay freni değil **çıpa ve haber** (Dikkat: "Esnaf indirimde") işlevi görür; sert fren **yalnız tavandır**. Öneri: E14'ün eşiği %60'tan **%75'e** (P payı) çıkarılabilir ya da yalnız n≤2'de bırakılabilir (canlı-dünya sahibi kararı).
4. **Hayalet hesap** tavanı gevşetmez: `n` yalnız son 14 günde satışı olan farklı sahiplerdir; alt hesap eklemek tavanı **düşürür**, yükseltmez (çoklu hesapla müşteri paylaşımı kuralı yine geçerli).

### 9.4 Yeni oyuncu için ulaşılabilir ilk dükkân

- **Saat 0:** Açılış Tezgâhı (parasız, anında; 2 yuva, kasa 20; kit `gida` 200 satılır).
- **İlk 24–36 saat:** **Bakkal (S).** İnşa ≈₺11.440 (ilk 5 yapıda %30 indirim ≈₺8.000, nakit ≈₺6.700 + kit stoğu) + arsa (Konut ○: kırsal ≈₺1.000 × 1,3–1,6) ≈ **₺10–12 bin ≈ hibenin %20–24'ü** (₺50.000). Başlangıç kiti çelik 120, parça 40 yeter; 3–4 pencere NPC'den ≈₺1.200–1.600.
- **Geri ödeme:** ince Alfa-0 ilçesinde ≈13 sa; rakipli ilçede ≈22 sa; N14 en kötü durumda ≈32 sa.
- **Tarım yönünde** önce çiftlik tezgâhı (§6.1).
- **Kalkan ve koruma:** 14 gün kalkan + %20 ayrılmış hücre; Yakınlık Havuzu yeni bakkalı korur; Alfa-1 pay tavanı yalnız n≥2'de.
- **ZP1 ile uyum:** ilk dükkân medyan ≤36 saat (PK1).

### 9.5 İlçe seviyesi ile döngü

Dükkânlar **ilçe gelişim puanına katkı verir** (Pazar katmanı; [arsa-ve-insa §5.2](arsa-ve-insa-derinlestirme.md)): perakende ilçeyi büyütür, büyüyen ilçe açık ihtiyaç kademelerini (K2/K3 talebi) genişletir, çeşit çekimi katsayısını artırır ve herkesin `Q`'sunu yükseltir. İlçe seviyesi **kolektif dünya durumudur; bireysel açılış kilidi değildir** (§3.1): yalnız `Q`, çeşit çekimi ve ruhsat kotası üzerinden ekonomik etki yaratır.

---

## 10. Oyuncu gözünden: üç senaryo

Gösterim: **Ekran/kart** (oyuncunun gördüğü), **Karar**, **Sayılar** (₺ ve birim/sa), **Sinyal** (sonraki adımı tetikleyen Fırsat Kartı ya da Dikkat; Fırsat Kartı ≤1/gün, Dikkat ≤5 madde). Sayılar §3–§9 betiğinden; `ekmek` R=₺60, NPC pazar net 0,891 R = ₺53,46; ithal 1,111 R = ₺66,7.

### 10.1 Senaryo (a): yeni oyuncunun iki farklı yolu

#### (a1) Bakkal zinciri (Alfa-0 → Alfa-1), gün 0–30

| # | Zaman | Ekran / kart | Karar | Sayılar | Sinyal ve sonraki adım |
|---|---|---|---|---|---|
| 1 | Gün 0, 00:00 | **Yerleş ekranı** (3 önerilen ilçe) → "İlk yapın" Defter kartı | İlçe seç, **Tarla** kur | Hibe ₺50.000, kit çelik 120 / parça 40 / gıda 200, yurt 6 hücre. Tarla ilk-5 indirimiyle ₺4.200 + 21 çelik + 7 parça; 2 sa × %10 = **12 dk** | Defter: `ilk_yapi` ✓; Kart: "Kit gıdanı sat" |
| 2 | 00:15 | **Açılış Tezgâhı** kartı ("Kendi tezgâhın") | Fiyat önayarı `referans +%5` (1,05 R = ₺73,5) | `gida` 200 birim, kasa 20 birim/sa → 10 sa; gelir ₺14.700 (NPC ₺12.474; **+₺2.226**) | Defter `ilk_satis` ✓; **Dikkat ▲:** "Tahılını NPC'ye 0,891 R satıyorsun: değirmen +%23" |
| 3 | 01:00 | **Zincir halkası** kartları | **Değirmen + Fırın** kur (36 dk'lık inşa) | 2 Gıda fab. = ₺14.000 + 84 çelik + 28 parça; yurt hücreleri biter (2+2+2); kalan çelik 15, parça 5. Çıktı 200 tahıl → 150 un → **225 ekmek/sa**; NPC ₺12.037/sa | **Dikkat ▲:** "Ekmeğini NPC'ye ₺53,5 satıyorsun; kendi bakkalın ₺63 (+%18)" |
| 4 | 04:00 | **Fırsat Kartı:** "Kendi tezgâhın → Bakkal" (`ilk_dukkan`) | **Bakkal (S)**; marka yok henüz; raf: 1 yuva `ekmek`; önayar `referans +%5` | Nakit ≈₺6.700 (+14 çelik, 6 parça kitten; **1 parça NPC'den**) + 3 pencere ithal ≈₺1.200 + arsa ≈₺1.400; 24 dk. Kasa 90: **90 ekmek × ₺63 = ₺5.670/sa**, prim ₺859, gider 132, **net ₺727/sa**, geri ödeme ≈**13 sa** | Defter `ilk_dukkan` ✓; **Dikkat ▲:** "Kasan %100 dolu: 135 ekmek/sa NPC pazara gidiyor (₺53,5; dükkânda ₺63)" |
| 5 | Gün 2 | **Fırsat Kartı #6:** "Komşu ilçede ekmek talebi 300, arz 150" | **İkinci bakkal** (komşu ilçe, **aynı il stoğu**) | 5. indirimli yapı (≈₺6.700 nakit); kasa +90 → toplam 180 ekmek/sa, **net ₺1.454/sa**; NPC'ye giden 45 ekmek/sa | **Dikkat ▲:** "Raf boş (ekmek yetmiyor)" 3. şube için |
| 6 | Gün 6 | **Dikkat:** "Ekmek arzı 225, dükkân kapasitesi 270" | **İkinci Değirmen + Fırın hattı** (≈₺65 bin taban, 7 hücre) **ya da** süt ürünü rafı (Fırsat: ilçe talebi 100, arz 0) | Ekmek 450/sa; **3. bakkal** (₺11.440 + arsa ≈₺1,5–4 bin) | Defter: 3 dükkân |
| 7 | Gün 7 (**Alfa-1**) | **Zincir Kartı Z1** + **Marka ekranı** | Marka "Yıldız Bakkal" (ad, simge, renk); ortak şablon `referans +%5` | 3 dükkân; gider −%3 ≈ ₺4/sa/şube (**sembolik**); raf %50 marka rafı (ekmek + gıda kilitli) | Başarım "İlk Şube"; kart: "Z2'ye 3 dükkân kaldı" |
| 8 | Gün 20–30 | **Zincir Kartı Z2** | 6 bakkal (3 ilçe × 2); **merkezi tedarik paneli** | Şube başı net ≈₺727 (ince ilçe) / ≈₺525–623 (rakipli, z=0,35): toplam **≈₺3.150–4.360/sa**; gider −%6 ≈ ₺8/sa/şube; il limiti 6 doldu | **Dikkat:** "İl limiti 6/6"; Z3 için 2. il = ekmek **kendi fırını** (bozulma %25/gün) → gerçek lojistik kararı |
| (alt.) | Gün 14 | **Fırsat:** "Bakkalını **markete** yükselt" (Alfa-1) | **Seçenek;** zincir yolu yerine **aynı yerde büyü** | S→M +₺17.160 + **1 bitişik hücre** (≈₺1,5–4 bin; kendi boş hücresi ya da atomik satın alma), 2→3 sa; kasa 90→198: **+108 ekmek/sa × ₺9,54 = +₺1.030 − gider farkı 72 = +₺958/sa**, geri ödeme ≈21 sa. İkinci S: +₺727–898/sa için ≈₺13–15 bin (verim ≈ aynı: ₺55–69 per ₺1.000) | Kart yalnız **bilgi;** karar oyuncunun |

**Not:** adım 1–5 **Alfa-0 dilimi** (tezgâh + bakkal + ikinci bakkal); adım 7–8 Zincir Kartı **Alfa-1**. Adım 8'deki sermaye bağlayıcı değildir (ekmek zinciri KD ≈₺9.000/sa); sınırlayıcılar ilçe başına ≤2, ilde ≤6, talep ve ekmek arzıdır.

#### (a2) Madencilikten gelen sermayeyle doğrudan süpermarket (Alfa-1)

Oyuncu önce Sanayi yönünde çelik/cevher satmıştır; gün 18'de **≈₺300.000** biriktirmiş (örnek; kaynak satışı geliri). İlçe: 100 bin nüfuslu; rakipler: A zinciri (L+M, 0,97/0,99 R), üç bakkal; z=0,35.

| # | Ekran / kart | Karar | Sayılar | Sinyal |
|---|---|---|---|---|
| 1 | **Fırsat Kartı** (Sanayi → Ticaret geçişi): "Bu ilçede gıda talebi 1.000/sa; yapı malzemesi ithalatı ₺400" | **Yeni dükkân ekranı:** tür seçimi bakkal/market/**süpermarket**/uzman; oyuncu **süpermarket** seçer | **Seviye ya da sıra şartı yok.** Kart: "Süpermarket: yapı ₺51.480 + 3 hücre arsa; arsa: ticari + cadde cephesi; ruhsat: **Kota** (5 büyük mağazadan 3'ü dolu, 2 yer)" | "Ruhsat uygun" (Kapalı olsaydı: "bu ilçede açılamaz; meclis oyu") |
| 2 | **Yatırım Tahmini kartı** (okuma modeli) | Tahmini görür: rakiplerle satış **104–120 birim/sa (kasa 324'ün %32–37'si)** | Net: ithal rafla **−₺39…−₺1.292/sa**, sözleşmeli rafla **−₺330…+₺789/sa** (fiyat 1,00–1,15 R) | Dikkat ▲: "Kasa doluluğu düşük; raf ürünü tedariki belirleyici" |
| 3 | **`yapi_yerlestir`** (3 bitişik cadde cepheli ticari hücre, bağlı küme biçim önizlemesi) | Onaylar | **Arsa 3 hücre ≈₺28.300** (şehir sınıfı ≈₺9.400 × 3; artımlı fiyat) + ₺27.000 + pencere ₺7.200 (çelik 90, parça 36 kendi stoğundan) ≈ **₺62.500 nakit**; 8 sa; ilçe payı: 3 hücre | Dükkân açılır; Defter `ilk_dukkan` |
| 4 | **Dükkân paneli:** 8 yuva boş | Raf: ithalatla `gida`, `ekmek`, `un`, `sut_urunu`; fiyat 1,15 R | Maliyet 1,111 R, satış 1,15 R: marj **%3,5**; satış ≈104 birim/sa; **net ≈ −₺39/sa**; kasa %32 | **Dikkat ▲:** "Ürünün ithal: marj %3,5 (ZP11)"; **Fırsat Kartı #5:** "Sattığın ekmeğin ithal: yerel üretici var (Yıldız Bakkal fırını, aynı il)" |
| 5 | **Sözleşme panosu** (A1-B) → **(c)** | Ekmek için raf sözleşmesi | 1,00 R: raf net **≈+₺789/sa** (üst sınır: raf tamamen sözleşmeli); geri ödeme (yapı + arsa ≈₺79.800) ≈100 sa | Sonraki: `sut_urunu` sözleşmesi; marka kartı ("Çınar Süper") |

**Ders (a2):** sermaye açılışı sağlar, **kârı tedarik belirler**. Aynı oyuncunun kendi ürünleriyle (çelik, parça, pencere) doğal dükkânı **yapı market**tir; süpermarket seçimi bilinçli bir "gıda perakendecisi olma" kararıdır.

### 10.2 Senaryo (b): aynı ilçede iki oyuncu, biri fiyat kırar

#### (b1) Küçük ilçe, iki bakkal (Alfa-1; 20 bin nüfus, `Q`=200, z=0,35)

A ve B bakkal, ikisi de 1,05 R: **46,7 birim/sa, net ₺314/sa** (R=₺60).

| # | Kim | Ekran / kart | Karar | Sayılar | Sinyal |
|---|---|---|---|---|---|
| 1 | **B** | Dükkân paneli: "İlçe fiyat bandı: min 1,05 · medyan 1,05 · maks 1,08" | Fiyatı **0,95 R'ye** çeker (önayar `esnaf_alti`) | B 52,9 birim/sa (+6,2), net **₺55** (−₺259); A 43,3, ₺281 (−₺33) | Dikkat B: "Fiyat <1,00 R: marj küçülüyor" |
| 2 | **A** | **Dikkat ▲:** "Rakip fiyatı 0,95; payın %50 → %45" | **Tutar** (1,05 R) ya da karşılık verir | Tutarsa: net ₺281 (−₺33). **Karşılık 0,95:** ikisi 48,8 birim/sa, net **₺41** (−₺273 her biri) | A: "NPC pazar 0,891 R öderken fiyat savaşı"; mantıklı karar: **tut** |
| 3 | **B** | Fiyatı 0,80 R'ye ister (**kampanya**) | Kampanya penceresi: **≤6 sa/gün, ≤2 gün/hafta**; pencere dışı **0,85 R**'ye sabitlenir | 0,80 R'de B 61,7 birim/sa, net **−₺469**; 0,85 R'de 58,9, **−₺277**; haftalık ort. ≈ **−₺332**; A tutarsa net ₺210–236 (payı %37–40) | Dikkat B: "Kampanya penceresi 5 sa 40 dk kaldı"; "NPC pazar daha yüksek ödüyor" |
| 4 | Sonuç | Dünya Raporu / Esnaf Kartı | — | **Kazanan yok:** B payı %50→%60–63 ama net **−**; A payı kaybetse de net **+** | Fiyat kırma zararını kendi yazdı |

**Kasa dolu ilçede fiyat kırmak hiçbir şey kazandırmaz:** Alfa-0 ince ilçede (`Q`=1.000) iki bakkal da kasada 90 birim/sa satar; B fiyatını kırsa satışı artmaz, yalnız marjı düşer (Dikkat: "Kasan dolu: fiyatı kırmak satışı artırmaz").

#### (b2) Zincir A ile bakkal B, n=2 (pay tavanı %70 hissi)

| # | Kim | Ekran / kart | Karar | Sayılar | Sinyal |
|---|---|---|---|---|---|
| 1 | **A** | Zincir paneli | Tüm şubelerde fiyatı 0,97→**0,80 R** (ortak şablon) | A satış **341,2'de sabit**; net ₺1.596 → **−₺2.582** | **Dikkat ▲ (A):** "İlçe pay tavanı %70 doldu: fazlası esnafa gidiyor"; "NPC pazar 0,891 R" |
| 2 | **B** | İlçe fiyat bandı: **min 0,80 (kampanya, 5 sa kaldı)** | **Takip etmez** | B 90 birim/sa, net **₺898 (değişmez)**; Yakınlık payı ≈ +4–5 birim/sa | Dikkat B: yok (olumsuz değişiklik yok) |
| 3 | A | Defter: "Kampanya penceresi bitti, fiyat 0,85'e çıktı" | Fiyatı eski düzeye döndürür | Net 1.596'ya döner; kayıp ≈₺4.200/sa'lık fark kampanya süresince | "Tavan ve kasa nedeniyle satış artmadı" |

### 10.3 Senaryo (c): üretici ve perakendeci arasında raf tedarik sözleşmesi (Alfa-1)

Oyuncular: **U** = "Yıldız Fırın" (225 ekmek/sa; kendi bakkalının kasası 90 dolu; 135 ekmek/sa NPC pazara gidiyor); **P** = "Çınar Market" (M, 2 hücre, ekmek yuvası ≈ 60 birim/sa satar; ekmeği şimdi **ithal**, ₺66,7; satış 1,08 R = ₺64,8, **marj −₺1,9/birim = −₺114/sa**).

| # | Kim | Ekran / kart | Karar | Sayılar | Sinyal |
|---|---|---|---|---|---|
| 1 | **U** | **Dikkat ▲:** "135 ekmek/sa NPC pazara gidiyor (₺53,5)" + **Fırsat Kartı:** "Sözleşme panosunda Çınar Market ekmek ilanı: 60/sa, 0,95–1,05 R" | İlanı açar | Fark: NPC ₺53,46 ↔ sözleşme ₺60 = **+₺6,5/birim** | — |
| 2 | **P** | **Fırsat Kartı #5:** "Sattığın ekmek ithal: yerel üretici var (aynı il, bedava teslim)" | Sözleşme **teklifi:** 1,00 R (₺60), **60 birim/sa**, 14 gün; marka etiketi "Yıldız Fırın" **açık** | **Teminat = 1 günlük teslim değerinin %20'si:** 60 × 24 × ₺60 = ₺86.400 → **₺17.280** (her iki taraftan bloke) | U'nun bildirimi: "Teklif geldi" |
| 3 | **U** | **Sözleşme kartı** (tutar, süre, teminat, sicil) | Kabul | Sözleşme aktif; ekmek aynı il düğümünden günlük akar | Defter `ilk_sozlesme` ✓ (ödül çekirdek tablosundan) |
| 4 | İkisi | **Günlük kapanış** (00:00, Dünya Raporu) | — | P → U: **₺86.400/gün** (1.440 birim). **U kazancı** (NPC'ye göre): (60 − 53,46) × 1.440 = **₺9.418/gün (₺392/sa)**; **P kazancı** (ithale göre): (66,7 − 60) × 1.440 = **₺9.648/gün (₺402/sa)**. Toplam ≈ **₺794/sa = NPC makası** (66,7 − 53,46 = ₺13,24/birim × 60) iki tarafa bölünür | P'nin ekmek yuvası −₺114/sa → **+₺288/sa** (satış 64,8 − 60) |
| 5 | **P** (vitrin/raf) | **Raf satırı:** "Ekmek · Yıldız Fırın" etiketi; yürüyüşte vitrinde aynı ad | — | **Çekim değişmez** (etiket çekimi etkilemez) | Başarım "İlk Marka Rafı" |
| 6 | **U** | **Tedarikçi satış bilgisi** kartı | — | "Çınar Market: bugün 1.440 ekmek, ort. 1,08 R, stok devri 0,6 gün" | Fırsat: "Aynı markete `sut_urunu` ya da **toptan**" |
| 7 | Risk | **Dikkat:** eksik teslim | Ceza/teminat işler | Ekmek anlık bozulma (%25/gün) → **aynı il şart** | Sicil düşer (hesap) |

Para korunumu: NPC pazara giden/gelen akış küçülür (makas lavabosu daralır), hane bütçesi B değişmez; sözleşme yeni para yaratmaz.

---

## 11. Karşılaştırma

### 11.1 Oyunlar

| Oyun | Ne alıyoruz | Neyi almıyoruz | Bizdeki karşılığı |
|---|---|---|---|
| **Supermarket Simulator** [G1] | **Mağaza seviyesi lisansla çeşit açar**, genişleme, piyasa değerine göre fiyat. **Ders:** topluluk raporuna göre büyütmenin getirisi **azalıyor** (müşteri ≈60–65/gün yumuşak tavan, gider artınca net düşebilir) [G1b] | Rafı elle doldurma, kasiyerlik, hırsızlık | **Kasa + pay tavanı** büyümenin doğal freni; **kilit yerine bilgi** (Yatırım Tahmini) |
| **Big Ambitions** [G2] | Bina boyu ↔ kapasite (75 m²/15, 225 m²/30, 285 m²/40, 1.000 m²/75 müşteri); **toptan ↔ ithalatçı tedarik**; trafik indeksi; fiyat yöneticisi | Sür-park-tekrarla restok, iç mekân yerleşimi | S/M/L kasa ve yuva; **raf sözleşmesi** (toptan), ithalat; fiyat önayarı; restok yok |
| **Capital Rift** [cr] | NPC müşteri talebi, fiyatı oyuncu belirler, vitrin ≤+%10, "dükkâna gir" | Yürüyerek raf doldurma, kasiyer yerleşimi | Çekim formülü; vitrin puanı; `[E]` panel |
| **Anno 1800** [G3] | Pazar yerinin **tam/azami menzili** (35/49 kare) | Yol bağlantı bulmacası | **Çekim yarıçapı** (tam halka / komşu ×0,35…) |
| **Capitalism Lab** [G4] | Mağaza ≤12 ürün; **zincir etkisi** (trafik, tanınırlık) | AI rakip sürüsü | `tamCesit` 12; **marka + Zincir Kartı** |
| Stardew (Joja ↔ Topluluk) | N14'ün tek seferlik anlatısı | Tek seferlik rota | Dinamik ruhsat, tedarik, pay tavanı |

### 11.2 Gerçek Türkiye (özet; §2)

Organize pay %67,3, indirim marketi %32,2, bakkal sayısı on yılda %31 düştü [P2][P1][P4]. Oyun bunu yumuşatır ama yönünü korur; **hard-discount = bakkal boyutunda zincir** gerçeği bizde **bakkal zinciri** seçimidir. Kooperatif perakende [P6] ve üretici doğrudan satışı [P7] üretici modülü ve kooperatif bakkalı olarak karşılık bulur.

---

## 12. Uygulama

### 12.1 Veri şeması

`mulk.perakende.dukkanTurleri[]` (dikey §5.10) genişletilir; yeni alanlar isteğe bağlı, yalnız sona eklenir (G8):

```
dukkanTurleri[]: {
  id: "bakkal", ad: "Bakkal", aile: "cesit",
  tamCesit: 6,
  mallar: ["gida","ekmek","un","sut","sut_urunu","sekerleme","findik_urunu","yakit"],
  talepKalemi: "K1",
  olcekAraligi: ["S"],                       // kademe = olcek (yeni)
  yukseltmeHedefi: "market",                 // seçenek; zorunlu yol değil (yeni)
  cekimCarpaniPpm: 1000000,                  // 1,0 / 1,6 / 2,4 (yeni)
  havuzErisimi: ["ana","yakinlik"],          // yeni (şube sayısı şartı YOK)
  cekimAlani: { tamHalka: 0, komsuPayPpm: 350000 },  // A1 halka; A0'da yok sayılır (yeni)
  acikSaat: [360, 1440],                     // dakika; sunum (yeni)
  ruhsat: false,                             // supermarket: true (yeni)
  olcekHucre: [1, 2, 3],                     // [yuva, yuva+1, yuva+2]; bakkal 1, market 2, supermarket 3; en çok 5, bağlı küme (supermarket 2 hücre = istisna: [1,2,2])
  arsaIzin: { ticari: true, konut: true, cadde: false },   // supermarket: cadde cephesi şartı (yeni)
  ilceBasinaEnFazla: 2, ilBasinaEnFazla: 6,
  gider: 132000, insaCarpaniPpm: 1000000,    // mili-para/sa; 1,0 / 2,5 / 4,5
  insaSaati: 4                               // 4 / 6 / 8
}
// ilçe seviyesi kilidi (ilceSeviyesi) alanı yoktur (seviye kolektif durumdur). Seviye yalnız Q, çeşit çekimi ve ruhsat kotası etkisi:
mulk.perakende.ilce: { cesitKatsayiPpm: { koy: 150000, kasaba: 250000, merkez: 300000, sehir: 350000 } }  // ilk tahmin
mulk.perakende.marka: { hesapBasinaEnFazla: 3, adMin: 2, adMax: 24, yasakliAdlar: [...] }
mulk.perakende.zincir: { esikler: [3,6,10], giderIndirimPpm: [30000,60000,100000],
                         markaRafiPayiPpm: 500000, sablon: true }
mulk.perakende.havuz: { yakinlikPpm: 150000, dogrudanPpm: 100000, pazarGunuTezgahPpm: 150000,
                        payTavaniPpm: { n1: 1000000, n2: 700000, n3p: 500000 }, tavanAlfa0: false }
mulk.perakende.kampanya: { esikPpm: 850000, gunlukSaat: 6, haftalikGun: 2 }
mulk.perakende.yukseltme: { sureCarpaniPpm: 500000 }   // sanayi bloğundan kopya (ayrı)
mulk.perakende.modulYerindeSatis: { yuva: 2, kasaMiliSaat: 40000, bantPpm: [950000,1250000] }
```

- **Doğrulayıcı kuralları:** (1) `mallar[]` kimlikleri `mallar[]`'da var **ve NPC pazar kaydı (emilim/arz) var** (yoksa rafa konamaz, §5.2); (2) `yukseltmeHedefi` zinciri döngüsüz ve hedefin `mallar` ⊇ kaynağınki; (3) tür kimlikleri mal kimlikleriyle kesişmez; (4) `olcekAraligi` ölçek kademeleriyle tutarlı; (5) `ruhsat: true` için N14 ruhsat kartı tanımlı olmalı; (6) yükseltme toplam maliyeti = doğrudan inşa maliyeti (test).
- **Rafta kayıt:** `rafYuvasi[]: {malId, fiyat, hedefStokGun, oncelikliKaynak, sozlesmeId?, markaRafi?}`; `EkYapiDurumu` genişletmesi: `dukkan?: {tur, olcek, markaId, raf[], kampanyaSayaci, sonFiyatDegisimT}`.
- **Kimlikler (G8, ilk `icerik.json` sürümünden önce):** `tezgah`, `bakkal`, `market`, `supermarket`, `kasap`, `manav`, `mobilyaci`, `toptan`; modül `yerinde_satis_ciftlik`, `yerinde_satis_fabrika`; **kalıcı**.

### 12.2 Çekirdek değişiklikleri (kod yazılmadı)

| # | Değişiklik | Dosya (okundu) | Boyut |
|---|---|---|---|
| 1 | `dukkan` ek yapısı için tür/ölçek/marka/raf alanları (`EkYapiDurumu.dukkan?`); `DerlenmisEkYapi` kademe verisi | `mulk/yapi.ts`, `tipler.ts` | S |
| 2 | **`dukkan_yukselt`** yeni komut (**`tesis_olcek_yukselt` yalnız sanayi tesislerine uygulanır**, `sanayi/komut.ts`); kademe maliyet farkı, süre (%50), eski kademe çalışır; **ek bitişik hücre(ler): oyuncunun kendi boş hücresi ya da aynı atomik işlemde satın alma, yoksa reddet** | `mulk/komut.ts`, `mulk/yapi.ts` | **M** |
| 3 | Perakende çözümleyici (A1): ana havuz + Yakınlık + doğrudan + pazar günü; su-doldurma; **kademeli pay tavanı** (`n`) | yeni `perakende/` (günlük kuantum, deterministik) | **L** |
| 4 | Çekim ağırlığına `cekimCarpani`; halka havuzu (A1) | aynı | S |
| 5 | Marka kaydı + Zincir Kartı (türetilmiş); ortak şablon komutu | `OyuncuDurumu`/özet | S–M |
| 6 | Kampanya sayaçları (günde ≤6 sa, haftada ≤2 gün) | `perakende/` | S |
| 7 | Ruhsat kartı + kota (L); NPC ile paylaşılan sayaç | N14 uygulaması | M (N14 ile) |
| 8 | Raf tedarik sözleşmesi, satış bilgisi okuma | P5 sözleşme | **M** (P5 ile) |
| 9 | Modül "Yerinde Satış" + doğrudan satış havuzu | `mulk/yapi.ts` modül | M |
| 10 | Marka/ad doğrulaması (gerçek marka yasak listesi) | `mulk/komut.ts` + veri | S |
| 11 | Serileştirme (`rafYuvasi`, `kampanya`, `dukkan`; eski görüntü eksik alanı varsayılanla yükler) | `serilestir.ts` | S |
| 12 | Sunum okuma modeli (`dukkanSunum`) ve **Yatırım Tahmini** (okuma modeli): **çekirdek dışı** | `sunucu`/`istemci` | S–M |
| 13 | Doğrulayıcı: mal listesi ↔ pazar kaydı, yükseltme maliyet eşitliği | `veri` doğrulayıcı | S |
| 14 | Ölçüm: bot arketipleri (bakkal, zincir, toptancı, süpermarket) | `botlar/` | M |
| 15 | **Z4 güncellemesi:** `olcekHucre = [yuva, yuva+1, yuva+2]`, en çok 5 hücre, bağlı küme; `yapi_yerlestir` kademe hücre sayısını (1/2/3) tür verisinden alır; `yapiYuva`/hücre tavanı kontrolleri | `mulk/komut.ts`, `mulk/yapi.ts`, `veri` | M |

**Para güvenliği (G4):** perakende fiyatı **oyuncu komutudur**; kamu ajanı perakende fiyat/raf komutu taşımaz; sistem komutları (yükseltme, şablon) para alanı taşımaz.

### 12.3 Alfa dilimleri ve karmaşıklık bütçesi

**En küçük Alfa-0 dilimi:** `dukkan` S: **bakkal, fırın, şarküteri, şekerci, yapı market + Açılış Tezgâhı**. Bu dilim dikey raporun G11 kapsamıdır; **bu rapordan Alfa-0'a yeni kural, komut ve kavram eklenmez.** Market, kademe çarpanı, Yakınlık Havuzu, süpermarket, zincir ve pay tavanı **Alfa-1'dedir.**

**Alfa-0'a neden market/Yakınlık/tavan girmiyor (sayısal gerekçe):**
1. **Yakınlık Havuzu asıl olarak N14 zincir marketine (Alfa-1) karşıdır;** Alfa-0'da N14 yok (z=0) ve ince ilçede (n=1…3) bakkal talep-sınırlı değil kasa-sınırlıdır (90 birim/sa; esnaf hacmin %73–91'ini tutar): Yakınlık %15 fark yaratmaz.
2. **Pay tavanı Alfa-0'da hiç devreye girmez** (§9.3 A).
3. **Market (M) yükseltmesi Alfa-0'da zorunlu değil:** kasa-dolu bakkalın büyümesinin yatay yolu (ikinci S, ilçe/il limitlerine kadar) ≈₺55–69 per ₺1.000 verir; M yükseltmesi ≈₺55–62 per ₺1.000 (+₺1.165/sa / ≈₺18,7–21,2 bin: ₺17.160 + 1 bitişik hücre): **aynı verim, komutsuz**.
4. **Alfa-0 gözlem kapısı:** S dükkânların ≥%50'si 7 gün kasa doluluğu ≥%90 ve ikinci dükkân limitine (ilçe ≤2) dayanmışsa **M erken açılır** (veri + `dukkan_yukselt`).

**Karmaşıklık bütçesi** (yaklaşık sayım; "bu rapordan yeni" sütunları):

| Dilim | İçerik | Yeni kural | Yeni parametre | Yeni komut | Oyuncuya görünen yeni kavram | Çekirdek boyutu |
|---|---|---:|---:|---:|---:|---|
| **Alfa-0** (taban: dikey G11) | S dükkân (5 tür) + Açılış Tezgâhı | **0** (dikey: 4: çekim, çeşit, fiyat bandı, esnaf tabanı) | **0** zorunlu (şema alanları isteğe bağlı) | **0** (dikey: 3: yerleştir, raf, fiyat) | **0** (dükkân, raf yuvası, fiyat önayarı, Açılış Tezgâhı) | S (dikey L) |
| **Alfa-1-A1 Kademe** | Market (M), kademe çarpanı, Yakınlık, kampanya sınırı, doğrudan M/L inşa, ayak izi ölçekle büyür | 5 (çarpan, Yakınlık, kampanya, yükseltme tutarlılığı, ayak izi) | ≈11 (+ `olcekHucre`, `cesitKatsayi`) | **1** (`dukkan_yukselt`) | **3** (kademe adı, Yakınlık rozeti, kampanya etiketi) | M |
| **Alfa-1-A2 Büyük mağaza ve ölçek** | Süpermarket (L), ruhsat+kota, kademeli pay tavanı, marka, Zincir Kartı | 4 (ruhsat, pay tavanı, Zincir Kartı, marka) | ≈14 (tavan[3], zincir 3+3+1, marka limit, ruhsat) | **2** (`marka_tanimla`, `zincir_sablon_uygula`) | **3** (marka, Zincir Kartı, pay tavanı uyarısı) | L (çözümleyici) |
| **Alfa-1-A3 Üretici** | Yerinde Satış modülü, doğrudan satış havuzu | 2 | ≈5 | 1 (modül kurma) | 1 (çiftlik tezgâhı) | M |
| **Alfa-1-B Tedarik** | Raf tedarik sözleşmesi, marka etiketi, satış bilgisi, toptan | 4 | ≈8 | **3** (teklif, kabul, raf kaynağı) | **4** (sözleşmeli raf, marka etiketi, satış bilgisi, toptan) | M (P5 ile) |
| **Sonra** | Konsinye, veresiye, `mobilyaci`, franchise, kooperatif bakkalı | 3 | ≈5 | 2 | 3 | M |

Toplam (A1+Sonra): ≈17 kural, ≈41 parametre, 9 komut, 14 kavram: **yaklaşık 5 küme halinde** yayılır; her kümede oyuncuya en çok **3–4** yeni kavram gelir (rehber kartı başına 1).

---

## 13. Ölçüt önerileri (kapı değil; dikey ZP1–ZP12'ye **ek**)

| # | Ölçüt | Hedef (öneri) | Yöntem |
|---|---|---|---|
| PK1 | **İlk dükkân süresi** (ZP1 ile) | Katılımdan medyan ≤36 sa; bakkal geri ödeme medyanı ≤48 sa | Günlük + bot |
| PK2 | **Bakkal hayatta kalma** (İM14.1) | 60. günde bakkal sayısı başlangıcın ≥%40'ı; z=0,52'de bakkal net/gider ≥1,5 | Defter |
| PK3 | **Pay tavanı etkisi** | Tavanla kesilen satışın zincir cirosuna oranı ≤%15; n=1 ilçelerde kesilme 0 | Defter |
| PK4 | **İlçe yoğunlaşması** | Tek oyuncunun ilçe perakende payı medyan ≤%40; ≥%50 ilçe oranı ≤%10 | Defter |
| PK5 | **Fiyat savaşı** | <0,85 R süresi ≤%5; zararına satışla pay kazanma ≈0 | Defter + bot |
| PK6 | **Kademe karışımı** | Alfa-1'de S:M:L yaklaşık 60:30:10; **doğrudan L oranı** ve L'lerin ilçe nüfusuna göre net/gider dağılımı izlenir (küçük ilçede açılan L oranı alarm >%25) | Sayaç |
| PK7 | **İş modeli çeşitliliği** | Hiçbir iş modeli (bakkalda kalma, yükseltme, bakkal zinciri, doğrudan L) oyuncuların >%60'ını almaz; **yükseltme kullanımı bilgi amaçlı, hedef değil** | Olay günlüğü |
| PK8 | **Çeşit tamlığı** | Market ≥0,6; süpermarket ≥0,5 (katalog büyüdükçe ≥0,8) | Çekirdek sayaç |
| PK9 | **Raf sözleşmesi** (A1) | Çeşit-dükkânların ≥%40'ı en az bir sözleşmeli raf; tek tedarikçi payı ≤%50 (ZP2) | Defter |
| PK10 | **Zincir geçişi** | Z1'e çıkanların dağılımı (bakkal/market/L zinciri); Z2+ oranı ≤%10 oyuncu | Olay günlüğü |
| PK11 | **Çıkmaz mal** | Her mal ≥1 çıkış; "yalnız ithal" mal payı ≤%15 raf yuvası | Doğrulayıcı + sayaç |

---

## 14. Geri dönüşü zor kararlar

| # | Karar | Seçenekler | **Öneri** | Neden geri dönüşü zor | Kapı / güvence |
|---|---|---|---|---|---|
| **1** | **Kademe modeli** | A kademe = ölçek + tür kimliği birlikte · B ayrı eksen · C ayrı yapılar (G11'e aykırı) | **A** (§3.1) | Tür kimlikleri (`bakkal`/`market`/`supermarket`), `olcekAraligi`, yükseltme komutu | İlk `icerik.json`'dan önce |
| **2** | **Seviye ya da kilit yok, seçim var** (sahip ilkesi) | Kilitsiz seçim (öneri) · ilçe seviyesine/sıraya bağlı açılış | **Kilitsiz;** kısıt yalnız sermaye, arsa niteliği, gider, tekelleşme koruması | Sonradan kilit eklemek oyuncu yatırımını geçersiz kılar; sonradan kaldırmak dengeyi bozar. Tür verisinde `ilceSeviyesi` alanı **yoktur**; **ilçe seviyesi kolektif dünya durumudur** (docs/11 §7.4 tanımı geçersiz): yalnız `Q`, çeşit çekimi, ruhsat kotası | Yatırım Tahmini (bilgi); PK6 |
| **3** | **Ayak izi ölçekle büyür** (baş lider kararı; Z4 güncellendi: `olcekHucre = [yuva, yuva+1, yuva+2]`, en çok 5 hücre, bağlı küme) | **S 1 / M 2 / L 3** (öneri) · süpermarket 2 hücre istisnası `[1,2,2]` · sabit 1 hücre | **1 / 2 / 3** | `EkYapiDurumu.hucreler` uzunluğu, bitişiklik, ilçe %25/72 sayımı, arsa fiyatı beklentisi; mevcut yapıların hücre sayısı sonradan değişmez, L'yi 4'e büyütmek kırıcıdır (Z4 uyarısı) | `olcekHucre` tür parametresi; yükseltme fiziksel koşulu (kendi hücresi ya da atomik satın alma); §3.6 |
| **4** | **Yakınlık Havuzu bakkal kademesine bağlı** (şube sayısı şartı yok) | Kademeye bağlı · şube ≤N · sahibe bağlı | **Kademeye bağlı** (%15) | Çekim formülü şeması, bot kalibrasyonu; sonradan kaldırmak bakkalı öldürür | Oran parametre |
| **5** | **Kademeli pay tavanı** (n=1 yok / n=2 %70 / n≥3 %50; Alfa-0 yok) | Kademeli · sabit %50 · yok | **Kademeli** | "Başarının cezası" algısı; ince dünyada sabit tavan yeni oyuncuyu cezalandırır (§9.3); sonradan sıkılaştırma sürpriz | PK3–PK4; oranlar parametre |
| **6** | **Marka birinci sınıf; Zincir Kartı marka başına, kademe-bağımsız, türetilmiş** | Kart (öneri) · "Merkez ofis" yapısı · yok | **Kart** | Yeni yapı = palet, S-4; sonradan yapıya çevirmek yıkım | Eşikler (3/6/10) veri |
| **7** | **Ölçek indirimi yalnız işletme giderinde; tedarikçi fiyatı sıkıştırılamaz** | Yalnız gider · hacim indirimi · ithalat indirimi | **Yalnız gider** | Para musluğu (K-5), tedarikçi baskısı | N14 tedarikçi tavanı |
| **8** | **Ruhsat kotası NPC ile ortak** | Ortak · ayrı · oyuncu L'si muaf | **Ortak** | Siyasi sistem şeması | N14 ile birlikte |
| **9** | **Marka etiketi çekimi etkilemez** | Etkilemez · +%3 | **Etkilemez** | Canlı-dünya kuralı ve K34 | Marka adı doğrulaması |
| **10** | **Üretici satış noktası = modül** | Modül · yapı · tür | **Modül** | G11, modül altyapısı | Modül yuvası |
| **11** | **Toptan Deposu NPC talebi yaratmaz** | Yaratmaz · NPC toptan talebi ekler | **Yaratmaz** | Para arzı (K-5) | Alfa-1-son |
| **12** | **Mal listeleri iç içe; tür kimliği ∩ mal kimliği = ∅; pazar kaydı şartı** | İç içe · bağımsız | **İç içe + pazar kaydı şartı** | Raf serileştirmesi, kimlik çakışması (G8) | Doğrulayıcı |
| **13** | **Yükseltme = doğrudan inşa ile tutarlı maliyet** (para eşit, süre +3 sa) | Eşit · ucuz kestirme · cezalı | **Eşit** | "Yükseltme sürekli kaçış/ceza" algısı, bot dengesi | Test: yükseltme toplamı = doğrudan |

---

## 15. Riskler ve açık sorular

| # | Konu | Not |
|---|---|---|
| R1 | **Kalibrasyon** | `cekimCarpani`, Yakınlık %15, pay tavanı, L gideri: ilk tahmin; hesap tek sepet ve ilçe temsili; `yerelOlcek` ve `emilimSaat` kalibrasyonuyla gözden geçirilmeli |
| R2 | **Tek ilçede L zayıf** | Bilinçli (kilit değil sonuç); Yatırım Tahmini ve PK6 izler; yanlış yönlendirmeye karşı kart zorunlu |
| R3 | **Çeşit değeri içerik büyümesine bağlı** | Alfa-0'da market/süpermarket çeşit çarpanını tam alamaz; `tamCesit` barı arayüzde |
| R4 | **Kasap, manav, mobilyaci mal bağımlı** | Zincirleri kardeş raporlarda; burada yalnız bağımlılık |
| R5 | **Hesap bazlı pay tavanı** | Çoklu hesap; N14 "dükkân/kalite başına havuz", hesap yaşı, davranış izleme |
| R6 | **Gerçek veri doğrulaması** | Format payları [P1], organize/geleneksel [P2], bakkal sayısı [P4] arama özetleri ve tutarsız; 6585 zincir eşiği [P5] özetten |
| R7 | **Bayram** | Dini bayram yalnız talep eğrisi ve hatırlatma takvimidir (12 §7): **dükkân açık/kapalı kuralı yok**; sunumdaki saat tabloları her gün aynıdır |
| R8 | **OSM esnaf noktaları** | POI yoğunluğu ölçülmedi; sayı çekirdekten, konum OSM'den; marka adı gösterilmez (K34) |
| R9 | **`dukkan_yukselt` yeni komut** (kapatıldı) | `tesis_olcek_yukselt` çekirdekte yalnız sanayi tesisleri için (`sanayi/komut.ts`, `{bolge, tesis, olcek}`), ek yapılara uygulanmaz; `dukkan_yukselt` yeni komuttur ve kendi `mulk.perakende.yukseltme` parametresini taşır |
| R10 | **Rehber `ilk_dukkan`** | Alfa-0'da `dukkan` varsa koşul `tesisler[tur ∈ {dukkan, ticaret_ofisi}]` (argelider Ç5). Yeni kartlar (ödül çekirdek tablosundan, burada yazılmadı): `ilk_market` (seçenek), `ilk_sube`, `ilk_sozlesmeli_raf` |
| R11 | **Zincir indirimleri küçük** | S'te −%3 ≈ ₺4/sa/şube; zincirin asıl kazancı çoklu ilçe ölçeği, şablon ve merkezi tedarik; indirimler parametre, PK10 izler |
| R12 | **İlçe seviyesi kolektif durum** | Seviye bireysel açılış kilidi değildir; `Q` (K2/K3 talebi), çeşit çekimi katsayısı ve ruhsat kotası üzerinden ekonomik etki yaratır. `Kasaba ≥10 sahip` ölçütü ince Alfa-0 dünyasında (ilçe başına ≈5 oyuncu) dükkân açılışını **etkilemez**, yalnız K2/K3 talebinin canlanma hızını; nüfus tabanlı GP bileşeni (NPC) bu hızı belirler. docs/11 §7.4 ve cesitlilik §7.2 (Tier 1 mal açılışı seviyeye göre) bu ilkeyle **düzeltilmelidir** |
| R13 | **Betik varsayımları** | Esnaf tabanı bağlayıcıyken kampanya payı değiştirmez; ekmek payı %30 varsayımı; `R` karışımı. Ayrıntılı hesaplar scratchpad'dedir |
| R14 | **Z4 güncellemesi** | Ayak izi ölçekle büyür (S 1 / M 2 / L 3): arsa-ve-insa §8 Z4 ve dikey §5.2 "S/M/L aynı ayak izi" ifadeleri **güncellenmeli**; etki: hücre tavanı (L 3 sayılır), `yapiYuva`, arsa ihtiyacı (S→M→L her aşamada +1 hücre), yükseltmenin fiziksel koşulu |

**Açık sorular (lider/sahip):** (1) Ayak izi S 1 / M 2 / L 3 (öneri) mi, yoksa S 1 / M 1 / L 2 mi? (2) Kademeli pay tavanı (n=1 yok / n=2 %70 / n≥3 %50) kabul mü? (3) Kampanya penceresi (<0,85 R) kabul mü? (4) M erken açılış gözlem kapısı (§12.3) kabul mü? (5) Zincir eşikleri ≥3/≥6/≥10 mu, gerçekçi ≥5/≥10 mu? (6) Esnaf kampanyası (E14) eşiği %60'tan %75'e çıkarılsın mı? (7) Dikey §5.3 bakkal/yapı market listelerine `un`, `sut`, `findik_urunu`, `cam` eklensin mi?

---

## Kaynaklar

- [P1] Türkiye gıda perakendesi 2025 (USDA raporu aktarımı): indirim market %32,2, süpermarket %28,7, geleneksel %32,0, e-ticaret %2,1; BİM 14.576, A101 13.550, ŞOK 11.797, Migros 3.895 mağaza; ilk 4 zincir satışın %41,4'ü; ≈370 bin gıda satış noktası; ≥5 şubeli 200'den fazla zincir: <https://www.tarimturk.com.tr/haber-turkiyede-120-milyar-dolari-asan-gida-perakendeciliginin-rontgeni-5796.html> (sayfa okundu; USDA aktarımı, birincil rapor okunmadı).
- [P2] PwC, "Dönüşürken Büyüyen Türkiye Perakende Sektörü" (organize %41,8 → %67,3, geleneksel %58,2 → %32,7, 2014–2025): <https://www.pwc.com.tr/tr/publications/industrial/retail-consumer/pdf/donusurken-buyuyen-turkiye-perakende-sektoru-raporu.pdf> (arama özeti). MÜSİAD gıda perakendeciliği 2025: <https://www.musiad.org.tr/uploads/press-487/gida-parakendecilig%CC%86i.pdf> (arama özeti).
- [P4] Bakkal sayısı (TESK: 240 bin → 165 bin, 2020'lerde 125–130 bin; 2022'de 3.518, 2023'te 5.199 kapanış): <https://www.milliyet.com.tr/yazarlar/gungor-uras/bakkal-ve-bufe-sayisi-azaliyor-2561592>, <https://www.sozcu.com.tr/bir-yilda-5-binden-fazla-bakkal-kapandi-p17940>, <https://www.aa.com.tr/tr/ekonomi/bakkallar-zincir-market-kulturune-direniyor/3454269> (arama özetleri; rakamlar kaynaklar arasında tutarsız: doğrulanmadı).
- [P5] 6585 sayılı Perakende Ticaretin Düzenlenmesi Hakkında Kanun (büyük mağaza ≥400 m²; zincir mağaza ≥5 şube (≥1 büyük mağaza) ya da ≥10 şube): <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6585.pdf> (PDF metni çıkarılamadı), özet: <https://www.lbfpartners.com/haberler-yayinlar/perakende-ticaretin-duzenlenmesi-hakkinda-kanun-un-getirdikleri> (zincir eşiği bu özetten; doğrulanmadı).
- [P6] Tarım Kredi KOOP Market (2025'te 4.500 satış noktası: 2.500 A, 1.000 B, 1.000 KOOP Bakkal; üreticiden doğrudan tedarik): <https://www.aa.com.tr/tr/ekonomi/tarim-kredinin-market-ve-satis-noktasi-sayisi-4-bin-300e-ulasti/3262690>, <https://www.tarimpusulasi.com/haber/tarim-kredi-koop-market-2025-yatirim-ve-buyume-degerlendirmesini-acikladi-45701> (arama özeti).
- [P7] 5957 sayılı Sebze ve Meyve Ticareti ve Toptancı Halleri Kanunu (hal rüsumu %1 / %2; üreticinin doğrudan perakende satışı rüsumdan muaf): <https://www.lexpera.com.tr/mevzuat/kanunlar/sebze-ve-meyveler-ile-yeterli-arz-ve-talep-derinligi-bulunan-diger-mallarin-ticaretinin-duzenlenmesi> (arama özeti; doğrulanmadı).
- [P8] Zincir çeşit ve boyut (BİM ≈700 çeşit; A101 ≈1.200 çeşit, 250–600 m²; Migros 40–4.500 m², 1.800–18.000 SKU): <https://en.wikipedia.org/wiki/Bim_(company)>, <https://www.worldpuan.gen.tr/a101-kac-metrekare-olmali/>, <https://en.wikipedia.org/wiki/Migros_(Turkey)> (arama özeti; doğrulanmadı).
- [G1] Supermarket Simulator (lisansla ürün çeşidi açma, genişleme, piyasa değerine göre fiyat): <https://store.steampowered.com/app/2670630/Supermarket_Simulator/>. [G1b] Oyuncu tartışması (müşteri tavanı ≈60–65/gün, seviye 40–50 sonrası genişlemenin getirisi azalır; **topluluk görüşü**, doğrulanmadı): <https://steamcommunity.com/app/2670630/discussions/0/7607215003621534800/>.
- [G2] Big Ambitions (bina boyu ↔ müşteri kapasitesi; toptan ↔ ithalatçı tedarik): <https://steamcommunity.com/sharedfiles/filedetails/?id=2947853321>, <https://big-ambitions.fandom.com/wiki/Supermarket>, <https://bigambitionswiki.pro/layouts/> (üçüncü taraf rehber; arama özeti).
- [G3] Anno 1800 pazar yeri (35 kare tam menzil, 49 kare azami): <https://anno1800.fandom.com/wiki/Marketplace>, <https://github.com/AnnoDesigner/anno-designer/issues/3> (arama özeti).
- [G4] Capitalism Lab perakende (mağaza ≤12 ürün; zincir etkisi): <https://www.capitalismlab.com/new-content/retail-simulation-enhancement/>, <https://capitalismlab.fandom.com/wiki/Retail> (arama özeti).
- Depo içi: [cr] [capital-rift-mekanikleri.md](capital-rift-mekanikleri.md); [dikey-zincirler-ve-perakende.md](dikey-zincirler-ve-perakende.md); [canli-dunya-simulasyonu.md](canli-dunya-simulasyonu.md) (§4.2, E14); [imza-mekanikleri-ve-yonelimler.md](imza-mekanikleri-ve-yonelimler.md) (§3.6 N14); [kamu-ve-kamu-arazileri.md](kamu-ve-kamu-arazileri.md); [arsa-ve-insa-derinlestirme.md](arsa-ve-insa-derinlestirme.md) (§5.2 GP; §8 Z1, Z4, Z13); [gorsel-kimlik-ve-arayuz.md](gorsel-kimlik-ve-arayuz.md); [yuru-istemci.md](yuru-istemci.md); `packages/veri/icerik/{icerik,il-imza,parametreler}.json`, `packages/cekirdek/src/mulk/{yapi,komut}.ts`, `packages/cekirdek/src/sanayi/komut.ts`, `tipler.ts`.
