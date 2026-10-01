# P4/P5 ekonomi sayıları ve bakım/aşınma kalibrasyonu (A2, G4 girdisi)

> **Durum.** 1 Ekim 2026, Sprint A0-02, görev G4 (sayılar). Bu belge **öneridir; karar vermez.** Kod, veri (`packages/veri/icerik/*`) ve başka belge değiştirilmedi. Bölüm 1 A3'ün şartnamesine girdidir (G6/G7/G8); bölüm 2 O2'nin ölçümüne bağlı ve henüz **(doğrulanmadı)** işaretlidir.
>
> **Uygulanan baş lider kararları (bu sürüm).** (a) Santral zorunluluğu yoktur: elektrik ve yakıt kamu şebekesinden otomatik gelir, fiyat kamu fiyat tavanı kuralıdır (elektrik 10,35 ₺, yakıt 103,5 ₺), ödeme kamuya (lavabo), santral isteğe bağlıdır. (b) Yeni yöntemler yalnız mülk kipinde (`mulkKipi: true`); bölge kipi altınları değişmez. (c) Cam fırınının ev sahibi `parca_fabrikasi`'dır (A3 seçti); kamu siparişi v0, `kasaPayiPpm` ve yedek düğme önerileri baş liderin son yönlendirmesine göredir.
>
> **Okunanlar.** docs/14; docs/10 §5A; docs/12 §13–§14; oyun-tasarim-belgesi-v1 (§3A, §3B, §6); uretim-agi-genisletme (§2–§5, §7–§10); perakende-kademeleri (§3, §5, §9, §12, §14); dikey-zincirler-ve-perakende (§2–§5, §9); kimlik-listesi-v1; canli-dunya-simulasyonu (§3.3–§3.4, §4.1–§4.2); `icerik.json`, `parametreler.json`, `kimlik-listesi.json`; docs/06 §12, §13, §15.1–§15.10; docs/olcum/parsel-v1-bulgular §3a; çekirdek kodu (`sanayi/`, `ekonomi/uretim.ts`, `lojistik/cozum.ts`, `erkenOyun.ts`, `mulk/kasa.ts`, `mulk/kamuFiyat.ts`) ve `botlar/src/parsel.ts` (yalnız okundu); T3 taslağı (`takim/t3/p4-p5-icerik`, §7.2 karşılaştırma tablosu).
>
> **Tekrar etmeme.** Üretim ağı, perakende kademeleri ve dikey zincir raporlarının tarifleri, kademe tabloları ve kanal matrisi burada yeniden anlatılmaz; bölüm numarasıyla anılır ve **farkları** verilir. Burada yeni olan: (i) enerjinin kamu şebekesinden gelmesi ve santralin gerçek ekonomisi, (ii) mevcut `standart_gida_isleme`'ye karşı ekmek zinciri (üç tabanda), (iii) NPC pazar derinliği, (iv) tamsayı yerel pazar modeli, ilçe sınıfı taban talebi, takvim ve bayram, (v) fiyat kademeleri, (vi) `yerelNpc` musluğu ve şebeke lavabosu, (vii) zincir kurulum süresi, (viii) kamu siparişi v0 önerisi, (ix) bakım için kaldıraç analizi ve parametre önerisi.
>
> **Yeniden üretim.** Bütün tablolar `docs/arastirma/p4-p5-ekonomi-hesap.mjs` betiğinden gelir (`node docs/arastirma/p4-p5-ekonomi-hesap.mjs`; çıktısı `p4-p5-ekonomi-hesap-cikti.md`, depoda). Betik yalnız `packages/veri/icerik/*.json` okur, rastgelelik ve tarih kullanmaz (art arda iki koşu bayt bayt aynı, `cmp` ile doğrulandı). Bu bir kâğıt modeldir (kayan nokta, saatlik adım, NPC fiyat dinamiği yok); çekirdek koşulmadı. Para biçimi `1.234 ₺`; kod birimi mili (`₺ × 1000`, `birim × 1000`).

## 0. Bir sayfalık özet

1. **Enerji şebekeden; santral ekonomik zorunluluk değil, vaat düzeltildi (baş lider kararı: O5).** Şebeke fiyatı kamu tavan kuralından (1,035 R) türediği için elektrik 10,35 ₺, yakıt 103,5 ₺'dir; KD'ye etkisi çoğu yöntemde %2'nin altında (en çok cam fırını −%4,2). Kömür santrali ithal kömürle tam yükte birim maliyeti 9,7–9,8 ₺'dir: şebekeye göre ancak **%5–6** avantaj; başabaş yük %59–67 (küçük oyuncunun yükü %10–25), yakıt jeneratörü hiçbir yükte kazanmaz (28 ₺/birim), yalnız hidro (dağ etiketi) %12–14 yükte kazanır. "Santral kur, ucuz elektrik al" vaadi kömür ve jeneratörde tutmaz; **karar (baş lider): O5, vaat "bağımsızlık ve büyük ölçek" olarak düzeltilir**, santral isteğe bağlı kalır. Şebeke satış çarpanı 1,25–1,50 R (O1/O2) ve kömür girdisi ×0,75 (O3) değerlendirildi, seçilmedi (§1.3-B1).
2. **Ekmek zinciri `standart_gida_isleme`'yi yalnız tahıl tabanında yener.** Tahıl başına net: zincir (öneri tarifleri, fırın 240) +%21,2 (rapor tarifleriyle −%3,3); tesis, işçi ve hücre tabanlarında zincir %35–40 **geridedir** ve tek başına hiçbir kademe standardı geçmez. Erken oyunun bağlayıcı kısıtı tahıl ya da sermaye değil **NPC pazar derinliğidir** (kişi başı gıda dilimi 75 birim/sa, ekmek 62,5); tek ürünle standart yol %61 önde kalır, ama ikinci havuz olarak zincir tamamlayıcıdır (A+ ve B+ birlikte 8.309 ₺/sa, ikinci standart tesis −3.175). Öneri: **güçlendirme zorunlu değil, kapatma gereksiz**; tesis tabanı da kural yapılırsa en az yan etkili yol G2 (mülk kipinde `standart_gida_isleme` ×0,75), tetik M < %30. **Tarif: fırın 240 ekmek** (zincir +%21,2 = K/U ilkesinin içinde; fırın oranı 1,385; M beklentisi ≥ %50 değişmez çünkü ikinci tesis kararı B+ − D ≈ 6.360 ₺/sa'te kalır; betikte tek parametre `FIRIN_EKMEK`) (§1.3-B2). Bu belgenin bütün tabloları 240 ile hesaplıdır.
3. **NPC pazar derinliği zincir sayısını sınırlar.** NPC emilimi oyuncuyla büyür (`max(4, n)/4`); 200 oyuncuda `ekmek` emilimi 12.500 birim/sa (kişi başı 62,5). Bir S fırın 240/sa üretir. Dünya yerel kanalla birlikte 21.278 birim/sa emer: **oyuncuların ancak %44'ü (≈85 fırın) ekmek zinciri kurarsa fiyat düşmez**; hepsi kurarsa arz/emilim 2,26 (§1.3-B3).
4. **Kamu fiyat tavanı kodda 1,035 R'dir** (`mulk/kasa.ts:415-424`, `mulk/kamuFiyat.ts:18-22`, `derle.ts:193`); GDD'deki 1,10 R üst sınırdır. İthalat maliyeti 1,100–1,111 R: NPC'den alıp kamuya satmak marj bırakmaz, para korunumu ile çelişki yok. **Kamu siparişi v0 önerisi:** ekmek, gıda, pencere, çelik, parça; fiyat 1,03 R; boyutlar 100/50/10/30/20 birim; ilçe başına haftada ≤ 5 sipariş (§1.9).
5. **Dükkân S.** Taban fiyatla 11.280 ₺ (GDD'nin 11.440 ₺'si pencereyi ithal fiyatıyla sayar). Kırsal ilçede tek dükkânın neti ≈ gideri karşılar (32 ₺/sa); kasabada 17–21 sa, şehirde 12–15 sa'de geri öder; kasabada 3 dükkânla 56 sa'e uzar (hedef ≤ 48). Fiyat `secim` kademesi önerisi: **4 kademe** (0,85 kampanya, 0,95, **1,05 varsayılan**, 1,15); 0,85 R'de dört senaryonun hepsinde net eksidir (fiyat savaşı kendini cezalandırır) (§1.9).
6. **Yerel talep** tamsayı/PPM: `Q = taban[sınıf][mal] × takvim[grup][ay] × bayram[grup]`. 13 mal, 3 ilçe sınıfı, 4 takvim grubu (her biri 12 aylık, toplamı tam 12.000.000 ppm), bayram dalgası toplam sabit. Gıda sepeti 200 birim/1000 kişi/sa sabit (gıda 90 + ekmek 60 + un 10 + süt 20 + süt ürünü 20); T3'ün listesinde olmayan yedi malın (un, süt, fındık ürünü, yakıt, çelik, parça, cam) talebi ve gerekçesi §1.9'da.
7. **`yerelNpc` musluğu.** İlçe başına haftalık: kırsal 0,18 M ₺ (1 dükkân), kasaba 0,73–0,97 M ₺, şehir 0,95 M ₺ ile 2,91 M ₺ (5 dükkân). Alfa-0 ölçeğinde 92,9 M ₺/hafta; **ek** para yalnız perakende primidir (14,1 M ₺/hafta). ZP8 payı %45 (sınır %50). **Şebeke lavabosu:** 200 P4 oyuncusunda elektrik 10,0 M ₺/hafta + yakıt 69,6 M ₺/hafta kamuya gider (yakıt eskiden NPC ithalatı lavabosundaydı) (§1.10).
8. **Zincir kurulum süresi (santralsiz).** Erken oyun çarpanı ve ≤2 eşzamanlı inşaatla ekmek zinciri **1,0 sa**; cam → pencere 1,2 sa; 7. günden sonra 10,0 / 12,0 sa. İsteğe bağlı santral her zincire +0,4 sa ve ≈ +35.000 ₺ ekler (§1.8).
9. **Kepek.** P0'da iki tüketici: NPC pazar kaydı (kepek 16,0 ₺) ve **`kepek_gubresi`** (kepeğe 21,9 ₺ öder, NPC'nin %37 üstü). `sut_kepekli` P1'e kalır. İsteğe bağlı güvence alıcı bütçesi ≈ 1,06 M ₺/hafta (Alfa-0, 50 değirmen) ve musluk kalemi yeni değil (§1.6).
10. **Cam/doğrama tarifleri dikeyden sapar.** Üst bant tarifleri dikey raporu aşar (cam 16 yakıt + 18 elektrik, doğrama 5 parça → 28 pencere; rapor 18/20 ve 6 parça → 27). Rapor değerleriyle de KD > 0'dır; sapmanın gerekçesi uzman marjı ve bant ilkesidir (§1.4). Ev sahibi `parca_fabrikasi`: cam fırını mevcut `standart_parca`'yı +%13 geçer, `otomatik_hat`'ın (teknoloji kilidi arkasında) %20 altında kalır (§1.12). T3 §7.2 tablosuyla sapmalar §1.14'te.
11. **Bakım ve aşınma.** Aşınma cezası **çıktıya** uygulanır, girdiye değil (`ekonomi/uretim.ts:212,446`); ince marjlı işleme yöntemlerinde bu KD kaybını çıktı kaybının 3–6 katına çıkarır ve bugünkü parametrelerle değirmen, fırın, doğrama KD'si **35–40. günde negatife** döner. O2 ölçümü bunu zincir bileşik etkisiyle açıkladı (çiftçi zinciri Tarla → ahır: çarpan² → ×2,78; ölçülen ×2,79); sanayici arketipinde bakım bugün bile başabaş altı (1,45 < 1,50). Öneri (mülk kipine özel, bölge altınına dokunmaz): **aşınma hızı ×0,50 (kıtlık 10.000 ppm/gün), tavan %25**; zincirde gün 14 %10, gün 45 %30 (§2). Parametre değerleri R3/R4 koşusuna kadar doğrulanmadı.

## 1. G4'ün sayısal tarafı

### 1.1 Kapsam, birimler ve bayrak

- Kod birimi: miktar mili-birim/sa, para mili-₺, oran ve çarpan ppm (1.000.000 = 1). Tablolarda ₺ ve birim yanında yazılır. Ölçek: çıktı, girdi ve elektrik ×1/2,2/3,6; işçi ×1/1,8/2,6; bakım ×1/2/3,2 (`parametreler.sanayi.olcekKademeleri`).
- **Çevrim.** Üretim sürekli akıştır; saatlik tik, kesikli parti yok. Tabloda "çevrim" sütunu yoktur çünkü tek değer 1 sa'tir. İşçi mülk kipinde bağlayıcı değildir (`kalanIsci` sınırsız, `ekonomi/uretim.ts:265`): KD/işçi yalnız mevcut yöntemlerle tutarlılık göstergesidir.
- **Mülk kipi bayrağı.** Baş liderin kararı (yeni yöntemler yalnız mülk kipinde): her yeni yöntem kaydına `mulkKipi: true`; derleyici bölge kipinde bu yöntemleri tesis türünün `yontemler[]` listesinden ve botların seçim uzayından çıkarır. Böylece bölge kipi altınları ve `durumOzeti` değişmez. Test: bölge kipi altın özetleri önce/sonra aynı (K3). Dizi kuralı: yöntemler `yontemler[]` sonuna, tesis türü listelerinin sonuna eklenir (G8).
- Bütün formüller tamsayı/PPM; `Math.pow`, `Math.sqrt` yok. Kare iki bölmeyle alınır (§1.9). Çarpımlar `carpBol` ile (ara çarpım 2^53'e yaklaşabilir: Q ≈ 1e9 mili × ağırlık ≈ 1,1e6 = 1,1e15 < 9e15 sınır; çekirdekte BigInt yedeği var).

### 1.2 Girdi denetimi

| Denetim | Sonuç |
|---|---|
| Taban fiyat: `kimlik-listesi.json` ↔ `icerik.json` (un 50, ekmek 60, cam 95, pencere 360, kepek 18, + sut 40, sut_urunu 120, findik 85, findik_urunu 240, sekerleme 180) | 24 malın hepsi eşit; fark yok. **Fiyat değişikliği önerilmiyor.** |
| Dükkân bedeli | Taban fiyatla 6.000 ₺ + 20 çelik (2.400) + 8 parça (1.440) + 4 pencere (1.440) = **11.280 ₺**; GDD ve perakende raporunun "≈11.440 ₺"u pencereyi ithal fiyatıyla (≈400 ₺) sayar; ithal değerle 11.866 ₺. |
| Kamu fiyat tavanı | 1,035 R (derleme zamanı; `mulk/kasa.ts:415-424`, `mulk/kamuFiyat.ts:18-22`, `derle.ts:193`), GDD "1,10 R" üst sınır (§1.9) |
| Mülk `yapiInsaSaati` | ciftlik 2, gida_fabrikasi 6, ahir 4, celikhane 10, parca_fabrikasi 8, santral 10 (icerik.json'daki `insaSuresiSaat` değil; mülk kipi `mulk.yapiInsaSaati`'ni okur) |
| Hücre | gida_fabrikasi 2/3/4, celikhane 3/4/5, parca_fabrikasi 2/3/4, ahir 2/3/4, santral 3/4/5; dükkân `[1, 2, 3]` (`mulk.olcekHucre`) |

### 1.3 Üç yapısal bulgu

#### B1. Enerji: kamu şebekesi, santral isteğe bağlı

**Olgu (koddan).** Mülk işletme düğümünün nüfusu 0'dır ve kit santral içermez. Aynı düğümde santral yoksa elektrik girdili her tesis **sıfır** üretir (`sanayi/elektrik.ts:40-66`, `ekonomi/uretim.ts:381-410`); sanayici botu bu yüzden hidro santralle açılır (`botlar/src/parsel.ts:106`). **Baş lider kararı:** santral zorunluluğu yok; elektrik ve yakıt kamu şebekesinden otomatik gelir, fiyat kamu fiyat tavanı kuralıdır, ödeme kamuya (lavabo), santral isteğe bağlıdır, fazlası satılamaz.

| Kalem | Taban ₺ | Şebeke fiyatı ₺ (1,035 R) | Kod birimi (mili/birim) | NPC ithalat (komisyonlu) ₺ | Not |
|---|---|---|---|---|---|
| elektrik | 10,00 | 10,350 | 10.350 | - | pazara girmez (depolanamaz); tek tedarik yolu şebeke ya da santral |
| yakıt | 100,0 | 103,50 | 103.500 | 111,1 | şebeke fiyatı NPC ithalatının %6,8 altındadır; emir yuvası harcamaz |

Kural, `kamuFiyatTavani`'nın dünyadaki **canlı referans fiyatı** (`d.pazar.fiyat[mal]`) çarptığı biçimdedir (`mulk/kasa.ts:415-424`); yani şebeke fiyatı yakıtta NPC referansıyla birlikte oynar, elektrikte (NPC kaydı yok) tabanda kalır **(doğrulanmadı: elektrik için `pazar.fiyat` dinamiği çekirdekte koşulmadı)**. Aşağıdaki hesaplar taban referansla yapılmıştır.

**KD etkisi (S ölçek).** Şebeke fiyatı tabandan %3,5 yüksek olduğu için KD hafif düşer; yöntem oranları (taban fiyatla) değişmez, KD sütunu şebeke fiyatıyladır:

| Yöntem | KD taban ₺/sa | KD şebeke ₺/sa | Değişim |
|---|---|---|---|
| degirmen | 2.724 | 2.720 | −0,15% |
| ekmek_firini | 4.000 | 3.925 | −1,88% |
| kepek_gubresi | 670 | 668 | −0,26% |
| sut_kepekli | 1.210 | 1.208 | −0,14% |
| cam_firini | 1.470 | 1.408 | −4,24% |
| celik_dograma | 3.110 | 3.105 | −0,17% |
| standart_gida_isleme (mevcut) | 5.100 | 5.097 | −0,07% |
| yuksek_firin (mevcut) | 1.950 | 1.941 | −0,45% |
| standart_parca (mevcut) | 1.280 | 1.241 | −3,06% |

**Santralin gerçek ekonomisi (A3 uyarısı: "tam yükte avantaj yalnız ≈ %6").** Yük = oyuncunun elektrik talebi / santral teslim kapasitesi (iletim kaybı %5 sonrası). Kömür santrali kömürü NPC'den alır (33,3 ₺); jeneratör yakıtı şebekeden (103,5 ₺); hidro yakıtsızdır ve çıktısı akarsu eğrisiyle 0,4–2,4 arası oynar (tablo yıllık ortalama 1). Yatırım = ithal malzeme + hücre.

| Tür | Ölçek | Kapasite (elektrik/sa) | Bakım ₺/sa | Yatırım ₺ | Tasarruf ₺/sa @%25 | @%100 | Birim maliyet ₺ @%100 (şebeke 10,35) | Başabaş yük | Geri ödeme @%100 (sa) |
|---|---|---|---|---|---|---|---|---|---|
| komur_santrali | S | 228 | 240 | 34.832 | −150 | 120 | 9,82 | %67 | 290 |
| komur_santrali | M | 502 | 480 | 78.330 | −282 | 312 | 9,73 | %61 | 251 |
| komur_santrali | L | 821 | 768 | 135.493 | −444 | 528 | 9,71 | %59 | 257 |
| yakit_jeneratoru | S / M / L | 152 / 334 / 547 | 160 / 320 / 512 | 34.832 / 78.330 / 135.493 | −802 / −1.732 / −2.822 | −2.727 / −5.967 / −9.752 | 28,3 / 28,2 / 28,2 | hiç | hiç |
| hidro_santrali | S | 285 | 400 | 41.498 | 337 | 2.550 | 1,40 | %14 | 16 |
| hidro_santrali | M | 627 | 800 | 94.995 | 822 | 5.690 | 1,28 | %12 | 17 |
| hidro_santrali | L | 1.026 | 1.280 | 165.490 | 1.375 | 9.339 | 1,25 | %12 | 18 |

Okuma: (i) P4 oyuncusunun elektrik talebi 28,65 birim/sa'tir (12 + 15 + `kepek_gubresi` 5 × %33); S kömür santralinde yük %13 → tasarruf **−195 ₺/sa** (hiç geri ödemez); P4 + P5 (61,65 birim/sa) yük %27 → −143 ₺/sa. Kömür santralinin başabaş talebi ≈ 152 birim/sa (S) ve tam yükte avantajı %5–6'dır. (ii) Hidro yükü %100'e çıkarmak için 285 birim/sa gerekir (≈ 10 S yöntem); gerçekçi yük P4 + P5'te %22 (tasarruf ≈ 238 ₺/sa, geri ödeme 174 sa). (iii) Kendi kömür ocağıyla (kömürün fırsat maliyeti 26,7 ₺) kömür santralinin tam yük birim maliyeti 8,09 ₺'ye iner (tasarruf 516 ₺/sa) — ama bu ek bir madencilik yatırımıdır. **Sonuç: santral Alfa-0'da ekonomik zorunluluk değil, bağımsızlık ve büyük ölçek (M/L, hidro) tercihidir; "kendi elektriğin ucuz" vaadi kömür ve jeneratörde tutmaz.**

**Vaat tutmuyorsa seçenekler (karar: O5; O0–O4 değerlendirildi, seçilmedi).** Başabaş yük üç kaldıraçla (S ölçek, yük %):

| Seçenek | Şebeke fiyatı ₺/birim | Kömür S başabaş | M | L | Jeneratör S | Hidro S | P4 oyuncusu şebeke gideri ₺/hafta | Not |
|---|---|---|---|---|---|---|---|---|
| O0 — bugünkü (kural 1,035 R) | 10,35 | %67 | %61 | %59 | hiç | %14 | 49.817 | vaat yalnız hidroda tutar |
| O1 — şebeke satış çarpanı 1,25 R (tavan kuralı yalnız kamu ALIMINA uygulanır) | 12,50 | %28 | %26 | %25 | hiç | %11 | 60.165 | satış fiyatı arbitraj açmaz; G4 metninden sapar |
| O2 — şebeke satış çarpanı 1,50 R | 15,00 | %17 | %15 | %15 | hiç | %9 | 72.198 | oyuncu şebeke gideri +%45 |
| O3 — santral kömür girdisi ×0,75 (mülk kipi; 60 → 45) | 10,35 | %28 | %25 | %25 | hiç | %14 | 49.817 | bölge kipi `komur_santrali` aynı; mülk veri geçersiz kılma (K3) |
| O4 — O3 + şebeke 1,25 R | 12,50 | %18 | %16 | %16 | hiç | %11 | 60.165 | - |
| **O5 — vaadi düzelt (KARAR)** | 10,35 | - | - | - | - | - | 49.817 | santral "bağımsızlık ve büyük ölçek" tercihi; Yatırım Tahmini kartı tasarrufu açık yazar |

O1–O2 oyuncu gideri artışı KD'nin ≤ %3'ü kadardır; O3 yalnız veri geçersiz kılma ister. **Karar (baş lider): O5.** Şebeke kuralı aynı kalır, santral vaadi "bağımsızlık ve büyük ölçek" olarak düzeltilir; O1–O4 değerlendirildi, seçilmedi. O3 yalnız bilgi olarak durur (küçük bir veri bayrağıyla kömür santralini %25–28 yükte anlamlı yapardı); ayrı soru §4'te.

**Şebeke ödemesi: haftalık tutar ve para arzı.**

| Oyuncu | Elektrik birim/sa | Yakıt birim/sa | Elektrik ₺/hafta | Yakıt ₺/hafta | Toplam ₺/hafta |
|---|---|---|---|---|---|
| P4 (ekmek zinciri + kepek_gubresi) | 28,65 | 20 | 49.817 | 347.760 | 397.577 |
| P4 + P5 (cam → pencere) | 61,65 | 36 | 107.197 | 625.968 | 733.165 |

Dünya (200 P4 oyuncusu): elektrik 9.963.324, yakıt 69.552.000 ₺/hafta; karşılaştırma: `yerelNpc` 92.910.226 + `ihracatNpc` 112.266.000 = 205.176.226 ₺/hafta musluk. **Yeni lavabo kalemi `sebeke`** (yanar); yakıt eskiden NPC ithalatı olarak lavabodaydı, şimdi şebekeye geçer ve %6,8 ucuzlar. **Muhasebe (baş lider kararı): şebeke bedelinin `kasaPayiPpm` payı ilçe kamu kasasına gider, kalanı lavaboya (`sebeke`) yanar.** Öneri **`kasaPayiPpm = 120.000` (%12)**: tek P4 oyuncusu olan en ince ilçede bile kamu siparişi v0 çekirdeğini (23.381 ₺/hafta) 1,1× karşılar; kalabalık ilçede kasa kapasitesi 4–10× olur ve sipariş sayısı (≤ 5/hafta) bağlayıcıdır. Tamsayı kuralı: kasa = ⌊ödeme × kasaPayiPpm / 1.000.000⌋, lavabo = ödeme − kasa; korunum her tikte tam kapanır (§1.9). Kasa yalnız zaten yanan paradan beslenir (pay lavabonun parçasıdır); sink payı %88 kalır.

**Öneri (şebeke yöntem tasarımı).** Yöntemlerde yakıt/elektrik girdileri tarifte kalır (üretim hattı değişmez); eksik stok **şebekeden otomatik** tamamlanır (blok ve anahtar adları A3 şartnamesindedir). Yöntem `yakit: e/10` ikamesi (önceki Y varyantı) artık gereksizdir (arşiv: betik §2.2).

#### B2. `standart_gida_isleme` ve ekmek zinciri: üç tabanda karşılaştırma

Mevcut yöntem tek tesiste 200 tahıl → 160 gıda (₺70) verir: oran **1,84**, işçi başına KD 849 ₺, bant (1,16–1,48) dışında. Bölge kipi altınlarının parçası olduğundan değiştirilemez. İki yöntem de aynı `gida_fabrikasi`'nda çalışır (bedel, hücre, işçi aynı); oyuncu tesis başına yöntem seçer. KD şebeke fiyatıyla; "NPC net" = satış ×0,891, dış girdi şebeke/ithalat ×1,111, bakım ve işletme dahil, tahıl fırsat maliyeti ihracat paritesi.

| Taban | `standart_gida_isleme` (1 tesis) | zincir (değirmen + fırın, 2 tesis) | Zincir / standart | Okuma |
|---|---|---|---|---|
| tahıl başına KD (200 tahıl/sa) | 5.097 ₺/sa | 6.645 ₺/sa | +30,4% | tahıl kısıtlıysa zincir kazanır |
| tahıl başına NPC net (komisyonlu) | 4.310 ₺/sa | 5.224 ₺/sa | **+21,2%** | aynı; rapor tarifleriyle 4.167 (**−3,3%**) |
| tesis başına KD | 5.097 ₺ | 3.322 ₺ (değirmen 2.720, fırın 3.925) | −34,8% | **tesis kısıtlıysa standart kazanır**; tek kademe tek başına standardı geçemez |
| işçi başına KD | 849 ₺ | 511 ₺ | −39,8% | işçi mülk kipinde bağlayıcı değil (`kalanIsci` sınırsız); Alfa-1 işgücü havuzunda bağlayıcı olabilir |
| hücre başına KD (her tesis 2 hücre) | 2.548 ₺ | 1.661 ₺ | −34,8% | tesis tabanıyla aynı |
| sermaye başına KD/sa (S taban değer 20.800 ₺/tesis) | 245 ‰ | 160 ‰ | −34,8% | saatlik getiri binde |

Rapor tarifleri (150/225) bandın alt yarısındadır ve kapalı zinciri standardın %3,3 altına iter; öneri tarifleri (165/33; fırın 240) +%21,2 verir (K/U ilkesi, uretim §2.2: +%10–25). Aşağıdaki duyarlılık tablosu 230–250 aralığını gösterir (250: +%33,6, ilkenin üstü). **Fırın çıktısı duyarlılığı** (165 un + 20 yakıt + 15 elektrik → x ekmek):

| Fırın çıktısı (ekmek/sa) | Fırın oranı | Fırın KD ₺/sa (şebeke) | Zincir net, tahıl tabanı ₺/sa | Zincir / standart | Fırın uzmanı net ₺/sa | B+ (pazar dilimi) ₺/sa | C = A+ ve B+ ₺/sa | B+ − D ₺/sa |
|---|---|---|---|---|---|---|---|---|
| 250 | 1,442 | 4.525 | 5.759 | +33,6% | 1.754 | 3.342 | 8.465 | 6.516 |
| 245 | 1,413 | 4.225 | 5.492 | +27,4% | 1.487 | 3.265 | 8.389 | 6.440 |
| 243 | 1,402 | 4.105 | 5.385 | +24,9% | 1.380 | 3.233 | 8.357 | 6.408 |
| **240 (öneri; bu belgenin tabanı)** | **1,385** | 3.925 | **5.224** | **+21,2%** | 1.219 | 3.185 | 8.309 | 6.360 |
| 235 | 1,356 | 3.625 | 4.957 | +15,0% | 952 | 3.101 | 8.225 | 6.276 |
| 230 | 1,327 | 3.325 | 4.690 | +8,8% | 685 | 3.014 | 8.138 | 6.189 |

**Tarif: fırın 240 ekmek** (K/U ilkesinin ortası, +%21,2; fırın oranı 1,385 bandın içinde; fırın uzmanı ithalatla başlasa da +1.219 ₺/sa kazanır). **G2 tetiğiyle birlikte:** pazar dilimi bağlayıcıyken fırın tesisi yaklaşık %50 yükle çalıştığı için çıktıyı 250 → 240'a indirmek stratejiyi pek etkilemez: ikinci tesisi zincire çevirmenin getirisi B+ − D = 6.516 → 6.360 ₺/sa (−%2,4), C 8.465 → 8.309; yani **M beklentisi (≥ %50) ve X = %30 eşiği değişmez**. Çıktı değişimi yalnız tahıl tabanında (tam yük) zincirin üstünlüğünü etkiler. Baş lider 250 derse betikte `FIRIN_EKMEK = 250` yapılıp tablolar yeniden üretilir (250'de S1 gün 3 net 285.229 ₺, gün 7 sonu hazine 1.999.456 ₺).

**Erken oyunda (0–7 gün) bağlayıcı kısıt: tahıl değil, tesis sermayesi değil; NPC pazar derinliği.**

| Kısıt | Değer | Bağlayıcı mı? |
|---|---|---|
| Sermaye (santralsiz S1: hazine ≥ 4 yapının tamamı) | saat 2'de 41.494 ₺ (en düşük), saat 8'de 109.337 ₺ | hayır: 2 saat sonra |
| Tahıl | Tarla 6.000 ₺ (indirimli 4.200 ₺), 12 dk inşa, 200 tahıl/sa; bir Tarla bir standart tesisi ya da zinciri besler | hayır |
| Eşzamanlı inşaat | 2; ilk 24 saatte 4 yapı 1,0 sa | yalnız ilk saatte |
| Hücre / ilçe tavanı | yurt 6 + satın alma; ≤ 72 hücre/ilçe, ≤ %25 pay | hayır (S1 7 hücre) |
| Emir yuvası | temel 4 (+4 Ticaret ofisi): ekmek ihracat, parça ithalat, çelik/silis ithalat, kepek ihracat; yakıt ve elektrik şebekeden (yuva harcamaz) | P5'te sınırda |
| **NPC pazar derinliği (oyuncu dilimi)** | n ≥ 4 için kişi başı gıda 75, ekmek 62,5 birim/sa | **evet** (bir S standart tesis 160, bir S fırın 250 üretir) |

**Pazar dilimli oyuncu karşılaştırması** (n = 200, şehir ilçesi, ilçede 4 dükkân, 1,05 R; NPC dilimi gıda 75, ekmek 62,5 birim/sa; ₺/sa, tahıl fırsat maliyeti dahil):

| Strateji | Yük | Net ₺/sa | Not |
|---|---|---|---|
| A: yalnız `standart_gida_isleme`, NPC dilimi (dükkânsız) | %47 | 1.903 | 75 birim/sa sat |
| A+: standart + bakkal dükkânı (gıda rafı) | %100 | 5.124 | dükkân 85,0 birim/sa |
| B: yalnız ekmek zinciri, NPC dilimi (dükkânsız) | %26 | 1.035 | 2 tesis sabit gideri; düşük yük |
| B+: ekmek zinciri + fırın dükkânı | %55 | 3.185 | dükkân 68,8 birim/sa |
| **C: A+ ve B+ birlikte (iki tahıl hattı, iki dükkân; ilçe ≤ 2)** | - | **8.309** | iki pazar havuzu: tamamlayıcılık |
| D: ikinci standart tesis (gıda havuzu zaten doluyken) | - | −3.175 | doymuş havuza ikinci tesis kâr etmez |

Okuma: tek ürünle standart yol %61 önde kalır (gıda ₺70 ve oran 1,84'ün sonucu); ama oyuncu dilimi tek mal havuzunu doldurur ve **ikinci tesis marjinal olarak değersizdir (D)**: asıl karar "ikinci standart mı, zincir mi" ise zincir 3.185 ₺/sa kazandırır. Standart ve zincir ikame değil **tamamlayıcıdır** (C). **Dürüst sınır:** oyuncu yalnız tek mala bağlı kalırsa tesis ve pazar-dilimi tabanlarında standart önde; zincirin erken oyundaki değeri yeni ekmek havuzu ve tahıl tabanıdır.

**Tesis tabanını yine de garanti etmek istenirse** (bant içinde; yan etkiler):

| Seçenek | Değişiklik | Standart KD | Değirmen KD | Fırın KD | Kademe başına > standart? | Yan etki |
|---|---|---|---|---|---|---|
| 0 — olduğu gibi | - | 5.097 | 2.720 | 3.925 | hayır | pazar dilimi kısıtında tamamlayıcı |
| G1 — zincir yoğunluğu ×2 | değirmen 400 tahıl → 330 un + 66 kepek; fırın 330 un + 40 yakıt + 30 elektrik → 500 ekmek | 5.097 | 5.440 | 9.050 | **evet** | Tarla:değirmen 2:1; fırın 500/sa pazar dilimini 2× aşar; doyumu hızlandırır, önerilmez |
| **G2 — `standart_gida_isleme` mülk kipinde ×0,75** (160 → 120 gıda; oran 1,38) | mülk veri geçersiz kılma (bölge kipi aynı) | 2.297 | 2.720 | 3.925 | **evet** | K3 işi; çiftçi botu gıda fabrikası kurmaz: ölçüm temel çizgisi aynı |
| G3 — (i) `standart_gida_isleme` mülk kipinde kapat | `yalnizBolge: true` | - | 2.720 | 3.925 | n/a | yeni oyuncunun tek basit gıda işleme yolu kalkar; G6 kapsamı büyür |

Bant içinde başka güçlendirme yok: ekmek tabanını %10 artırmak fırın oranını 1,59'a (bant dışı), fırında yakıtı 20 → 15 yapmak 1,52'ye çıkarır; değirmenin tek başına 5.097 KD'ye ulaşması 6.120 girdide 0,83 oran (bant üstü) gerektirir. **Karar önerisi:** (ii) güçlendirme zorunlu değil, (i) kapatma gereksiz; baş lider tesis tabanını da kural yaparsa G2 en az yan etkili yoldur.

**Baş lider kararı ve yedek düğme.** Öneri tarifleri kabul (çarpan yok). Yedek parametre: `standart_gida_isleme` mülk kipinde ×0,75 (G2), **varsayılan kapalı**. Tetik ölçütü (öneri değer, parametre):

| Öğe | Öneri |
|---|---|
| Ölçüt | **M = (ilk 7 günde en az 24 saat `degirmen` yönteminde çalışan tesisi olan bot) / (ilk 7 günde en az bir `gida_fabrikasi` kurmuş bot)** |
| Tetik eşiği | **X = %30:** A0-11 bot ölçümünde M < %30 ise G2 açılır; şart: tohum medyanında ve ≥ 8/10 tohumda eşiğin altında **ve** gıda arzının ≥ %85'i `standart_gida_isleme`'den geliyor (zincirin ekmek havuzu boş) |
| Hedef (G2 sonrası) | M ≥ %50 (tekrar ölçüm) |
| Pencere | katılımdan ilk 7 sim-günü (168 sa; erken oyun çarpanı dahil) |
| Örneklem | tohum 1–10 (O2'nin mevcut tohum kümesi), tohum başına 100 bot (A0-4 ölçeği) = 1.000 bot-kaydı |
| Bot dağılımı | yalnız yeni oyuncular (gün 0 katılım); arketipler çiftçi / sanayici / tüccar 1/3'er (`botlar/src/parsel.ts` planları); yerleşik ve geç katılan botlar bu ölçüte girmez |

Gerekçe: (i) rasyonel oyuncunun tek `gida_fabrikasi`'nda standart önde (A+ 5.124 ↔ B+ 3.185 ₺/sa), ikinci tesiste ise standart marjinal olarak değersizdir (D −3.175) ve zincir 3.185 ₺/sa kazandırır; yani **bir fabrikadan fazlasını kuran her bot ikincisini zincire çevirmelidir**. (ii) Sermaye bağlayıcı değildir (S1: saat 8'de hazine 109.337 ₺, bir `gida_fabrikasi` 10.000 ₺), ilk 7 günde botların en az yarısı ≥ 2 fabrika kurar: beklenen M ≥ %50. (iii) Eşik beklenenin %60'ı (%30) seçildi: M için örneklem standart hatası ≤ %1,6 (p = 0,5; n = 1.000), yani %30 yaklaşık 12σ alt sınırdır; asıl belirsizlik bot politikasıdır (mülk botlarında `degirmen` yöntemi bugün yok; bot yöntem seçicisi ancak K3'te yazılır). **(doğrulanmadı):** M, botun yöntem seçme kuralına bağlıdır; kural "marjinal net" ise yukarıdaki beklenti geçerlidir, "varsayılan yöntem" ise M ≈ %0 çıkar ve ölçüt bot ayarı hatasını ekonomik hatadan ayıramaz. Bu yüzden ölçüm yalnız yöntem seçen botlarla (A2 tablosundaki marjinal net kuralı) yapılmalıdır.

#### B3. NPC pazar derinliği

`npcHacimleri`: emilim ve arz `max(npcLikiditeTabanOyuncu=4, oyuncu)/4` ile büyür. Alfa-0'da (200 oyuncu) ölçek ×50. `ekmek` emilimi 250 × 50 = 12.500 birim/sa (kişi başı 62,5); `pencere` 100 × 50 = 5.000; `kepek` 120 × 50 = 6.000.

| Büyüklük (200 oyuncu, 45 ilçe) | Değer |
|---|---|
| Yerel kanal (k≈4,4 fırın dükkânı/ilçe, 1,05 R) | 8.778 birim/sa |
| NPC emilimi (ekmek) | 12.500 birim/sa |
| Fiyat düşmeden emilen | 21.278 birim/sa (≈ 85 S fırın) |
| Herkes ekmek zinciri kurarsa arz | 48.000 birim/sa; **arz/emilim 2,26** |
| Fiyat düşmeden zincir kurabilen oyuncu payı | **≤ %44** |

Fiyat formülü (Vic3 türevi, e = 0,75; docs/06 §13) arz emilimin 2 katını aştığında çarpanı tabana (×0,25) iter. Bu bir kabul ölçütü bilgisidir: Alfa-0'ın dört zinciri (ekmek, cam → pencere, süt, fındık) oyuncuları dağıtınca doyum dağılır; bot koşusunda (A0-4, 100 bot) tek zincire yığılmama izlenmeli. Pencere hattı için aynı sorun yok: 28 pencere/sa'e karşı emilim 5.000.

### 1.4 Yeni yöntemlerin tam satırları (S ölçek)

A2 önerisi, kod birimi (mili). Barındıran tesis, bakım ve kirlilik dahil. Çevrim 1 sa (sürekli). Hepsi `mulkKipi: true`. Elektrik ve yakıt kamu şebekesinden gelir (§1.3-B1); tarifte kalırlar. Fırın çıktısı 240.000 mili (§1.3-B2; betikte `FIRIN_EKMEK`).

| Yöntem | Tesis | Girdiler (mili/sa) | Çıktılar (mili/sa) | İşçi (mili) | Bakım (parça, mili/sa) | Kirlilik (ppm/sa) |
|---|---|---|---|---|---|---|
| `degirmen` | gida_fabrikasi | tahil 200.000, elektrik 12.000 | un 165.000, kepek 33.000 | 5.000 | 800 | 20 |
| `ekmek_firini` | gida_fabrikasi | un 165.000, yakit 20.000, elektrik 15.000 | ekmek 240.000 | 8.000 | 800 | 20 |
| `kepek_gubresi` | ahir | kepek 100.000, elektrik 5.000 | gubre 18.000 | 3.000 | 500 | 10 |
| `sut_kepekli` (P1) | ahir | tahil 50.000, kepek 60.000, elektrik 5.000 | sut 82.000, gubre 4.000 | 5.000 | 500 | 10 |
| `cam_firini` | parca_fabrikasi (A3) | silis 60.000, yakit 16.000, elektrik 18.000 | cam 50.000 | 5.000 | 1.000 | 60 |
| `celik_dograma` | parca_fabrikasi | celik 24.000, cam 32.000, parca 5.000, elektrik 15.000 | pencere 28.000 | 7.000 | 1.000 | 20 |

Aynı satırlar ₺ olarak (taban fiyat; oran bandı 1,16–1,48 hedefi; KD şebeke fiyatıyla):

| Yöntem | Girdi ₺/sa | Çıktı ₺/sa | **Oran** | KD ₺/sa (taban / şebeke) | KD/işçi (şebeke) ₺ | Rapor (dikey) oran / KD | Bant |
|---|---|---|---|---|---|---|---|
| `degirmen` | 6.120 | 8.844 | **1,445** | 2.724 / 2.720 | 544 | 1,314 / 1.920 | içinde |
| `ekmek_firini` | 10.400 | 14.400 | **1,385** | 4.000 / 3.925 | 491 | 1,371 / 3.650 | içinde |
| `kepek_gubresi` | 1.850 | 2.520 | **1,362** | 670 / 668 | 223 | yeni | içinde |
| `sut_kepekli` | 2.630 | 3.840 | **1,460** | 1.210 / 1.208 | 242 | 1,460 / 1.210 | içinde |
| `cam_firini` | 3.280 | 4.750 | **1,448** | 1.470 / 1.408 | 282 | 1,357 / 1.250 | içinde |
| `celik_dograma` | 6.970 | 10.080 | **1,446** | 3.110 / 3.105 | 444 | 1,359 / 2.570 | içinde |

Kepek `değirmen` çıktısının %28'i KD'dir (yan ürün ≤ %40 kuralı, uretim §2.3). Mevcut yöntemlerin çoğu bandın dışındadır (`standart_gida_isleme` 1,84, `ahir_besi` 1,83, `standart_elektronik` 2,35, madenler > 4); bant yeni yöntemler içindir.

**Dikeyden sapma (işaretli).** Beş yöntemde A2 önerisi dikey raporun (§2.2/§3) rakamlarından farklıdır:

| Yöntem | Dikey rapor | A2 önerisi | Oran (rapor → öneri) | Uzman net ₺/sa (şebeke; ithalatla başla) | Gerekçe |
|---|---|---|---|---|---|
| `degirmen` | 150 un + 30 kepek | 165 un + 33 kepek | 1,314 → 1,445 | 153 → 870 | `standart_gida_isleme`'yi tahıl tabanında geçmek (§1.3-B2); rapor tarifiyle zincir −%3,3 |
| `ekmek_firini` | 150 un + 22 yakıt + 15 elektrik → 225 | 165 un + 20 yakıt + 15 elektrik → **240** | 1,371 → 1,385 | 1.044 → 1.219 | aynı |
| `cam_firini` | 60 silis + 18 yakıt + 20 elektrik → 50 | 60 silis + **16 yakıt + 18 elektrik** → 50 | 1,357 → 1,448 | 236 → 463 | uzman kademe ithalatla başlarken zarar etmesin (satış/girdi 1,206); K/U ilkesi |
| `celik_dograma` | 24 çelik + 32 cam + 6 parça + 15 elektrik → 27 | 24 çelik + 32 cam + **5 parça** + 15 elektrik → **28** | 1,359 → 1,446 | 468 → 989 | aynı; doğrama için kısa yol yok, sapma isteğe bağlı |
| `kepek_gubresi` | yok | 100 kepek + 5 elektrik → 18 gübre | - | 34 | kepeğin ikinci tüketicisi (§1.6) |

Cam ve doğrama için mevcut tesis tabanı karşılaştırması (§1.12) rapor tarifleriyle de KD > 0 gösterir; sapma zorunlu değil, **A3'ün seçeceği bir üst bant tercihidir** ("dikeyden sapma" olarak işaretlendi). `sut_kepekli` rapor ile aynıdır.

Ölçek örneği (değirmen; çıktı ×2,2/×3,6, işçi ×1,8/×2,6): M tahıl 440, elektrik 26,4, un 363, kepek 72,6, işçi 9, KD 5.993 ₺/sa; L tahıl 720, elektrik 43,2, un 594, kepek 118,8, işçi 13, KD 9.806 ₺/sa. Fırın M: ekmek 550, L: 900. Kirlilik çıktıyla doğrusaldır.

### 1.5 Zincir ekonomisi: kısa/uzun yol, uzmanlık, ithalatla başlamak

**Kısa/uzun yol:** §1.3-B2'de. **Uzman ve "ithalatla ortadan başlamak"** (komisyonlu, bütün girdi NPC'den ×1,111, elektrik ve yakıt şebeke fiyatıyla, satış ×0,891):

| Kademe | Satış ₺/sa | Girdi ₺/sa | Bakım+işletme | **Net ₺/sa** | Satış/girdi |
|---|---|---|---|---|---|
| değirmen uzmanı (öneri) | 7.880 | 6.790 | 220 | **870** | 1,160 |
| değirmen uzmanı (rapor) | 7.164 | 6.790 | 220 | 153 | 1,055 |
| fırın uzmanı (öneri) | 12.830 | 11.391 | 220 | **1.219** | 1,126 |
| fırın uzmanı (rapor) | 12.029 | 10.765 | 220 | 1.044 | 1,117 |
| cam fırını uzmanı (öneri) | 4.232 | 3.509 | 260 | 463 | 1,206 |
| cam fırını uzmanı (rapor) | - | - | - | 236 | - |
| doğrama uzmanı (öneri; çelik, cam, parça ithal) | 8.981 | 7.732 | 260 | 989 | 1,162 |
| doğrama uzmanı (rapor) | - | - | - | 468 | - |
| `kepek_gubresi` uzmanı (kepek ithal 20 ₺) | 2.245 | 2.052 | 160 | 34 | 1,094 |

Okuma: NPC'den alıp NPC'ye satan bir kademenin marjı yaklaşık `oran × 0,802 − 1`'dir; bant 1,16–1,48 için −%7…+%19. Şebeke yakıt/elektriği ithalattan %6,8 ucuz olduğu için öneri tariflerinde her kademe pozitiftir. Kapalı zincir yine de belirgin önde: 200 tahıl/sa'lık kapalı zincir 5.224 ₺/sa, aynı iki tesisin ayrı ayrı uzman olarak toplamı 2.089 ₺/sa. Kepek tüketicisi (+34) sıfıra yakındır: Alfa-0'da ara kademe uzmanlığı yok kararıyla (G13) uyumludur. NPC makası altında **kapalı zincir kârlıdır** ve iki ucundan girilebilir.

### 1.6 Kepeğin iki tüketicisi (ahır, komisyonlu) ve güvence alıcı bütçesi

| Yol | Kepeğin birim değeri | NPC kepek alımına göre | Ahır yükü (33 kepek/sa) | Ahır net ₺/sa |
|---|---|---|---|---|
| NPC pazar kepek alımı (0,891 R) | 16,0 ₺ | - | - | 0 (yapı gerekmez) |
| **`kepek_gubresi`** (100 kepek + 5 elektrik → 18 gübre) | **21,9 ₺** | **+%37** | %33 | 35 |
| `sut_kepekli` (50 tahıl + 60 kepek → 82 süt + 4 gübre) | 33,9 ₺ (tahıl ikamesi dahil) | - | %55 | 429 |
| karşılaştırma: `ahir_besi` (mevcut) | - | - | %100 | **2.495** |

**Öneri (en sade, A3 ile):** P0'da kepeğin iki tüketicisi **(a) NPC pazar kaydı (zaten var: emilim 120, arz 80) ve (b) `kepek_gubresi`** (tek girdi, tek çıktı, yeni mal yok, ahır tesisi; Tarla gübre dozuna döner: ilk kapalı döngü). `sut_kepekli`, ahır saatinde `ahir_besi`nin gerisinde kaldığından (§1.3-B2) yalnız süt zinciri ile anlam kazanır: **P1'e bırakılır**; isterse veri satırı P0'da bulunur, oynanışa etkisi küçüktür. Kepek bozulması 6.000 ppm/gün (%0,6) olduğundan pazara satış kepeği çöpe göndermez. Not: kimse yalnız kepek için ahır kurmaz; `kepek_gubresi` ahırı zaten tahılla besi için kuran oyuncunun kepeği değerlendirmesidir.

**Güvence alıcı bütçesi** (isteğe bağlı `NpcAlici { tur: "guvence" }`; fiyat R × %50). NPC pazarı kepeği 120 × ölçek = 6.000 birim/sa emer ve fiyatı ancak doyunca ×0,25'e (4,5 ₺) iner; güvence alıcı bu tabanı 9 ₺'de tutar.

| Kalem (Alfa-0 varsayımı: 50 değirmen) | Üretim (birim/hafta) | Güvence hacmi (üretimin %25'i) | Fiyat | Tutar ₺/hafta |
|---|---|---|---|---|
| kepek | 277.200 | 69.300 | 9 ₺ (R × %50) | 623.700 |
| gübre (`kepek_gubresi`) | 24.948 | 6.237 | 70 ₺ | 436.590 |
| **Toplam** | - | - | - | **1.060.290** |

Bütçe NPC faucet'ın %1'inin altındadır. Muhasebe: NPC'nin oyuncuya ödemesi mevcut `musluk.ihracatNpc` kalemine yazılır (yeni kalem yok); bütçe toplamı sabittir (K-5). Kodda `NpcAlici` yalnız `tur: "kamu"`'dur; güvence türü bir ek olur. **"Gerekmez" diyorsanız:** NPC pazarı zaten kepek ve gübreyi ≥ 0,25 R ile alır; çöpe gitme riski yoktur, güvence yalnız taban fiyatı yükseltir ve çıkmaz-mal doğrulayıcısı için N türünü sağlar (§1.11).

### 1.7 Yapı bedelleri, süreler ve indirim etkileşimi

Doğrudan kurulum; ölçek çarpanı para ve malzemede ×1/2,5/4,5, süre ×1/1,5/2, hücre `mulk.olcekHucre`. Taban değer: para + malzeme × taban fiyat; ithal değer: malzemeler ×1,111.

| Yapı | S para | S çelik / parça | S hücre | S süre (sa) | M para | L para | M süre | L süre | S taban değer |
|---|---|---|---|---|---|---|---|---|---|
| `ciftlik` | 6.000 ₺ | 30 / 10 | 2 | 2 | 15.000 ₺ | 27.000 ₺ | 3 | 4 | 11.400 ₺ |
| `gida_fabrikasi` | 10.000 ₺ | 60 / 20 | 2 | 6 | 25.000 ₺ | 45.000 ₺ | 9 | 12 | 20.800 ₺ |
| `ahir` | 8.000 ₺ | 40 / 15 | 2 | 4 | 20.000 ₺ | 36.000 ₺ | 6 | 8 | 15.500 ₺ |
| `celikhane` | 20.000 ₺ | 100 / 40 | 3 | 10 | 50.000 ₺ | 90.000 ₺ | 15 | 20 | 39.200 ₺ |
| `parca_fabrikasi` | 15.000 ₺ | 80 / 30 | 2 | 8 | 37.500 ₺ | 67.500 ₺ | 12 | 16 | 30.000 ₺ |
| `santral` | 12.000 ₺ | 70 / 30 | 3 | 10 | 30.000 ₺ | 54.000 ₺ | 15 | 20 | 25.800 ₺ |
| `dukkan` (öneri, P-İthal) | 6.000 ₺ | 20 / 8 (+4 pencere) | 1 | 4 | 15.000 ₺ | 27.000 ₺ | 6 | 8 | 11.280 ₺ |

M ve L için ayak izi `mulk.olcekHucre`'dendir (gida 3/4, celikhane 4/5, parca_fabrikasi 3/4, dükkân 2/3).

**İlk-5 indirimi (%30) ve erken oyun çarpanı (ilk 24 sa süre ×0,1, sonra 168. saate doğrusal ×1).**
- İndirim para ve malzemeye **sabit tutar** olarak uygulanır (S tabanından; `docs/06 §15.10`) ve ek yapıları sayar: P4'te Tarla, değirmen, fırın, dükkân ve (gün 2) ahır indirimlidir. İsteğe bağlı santral kurulursa beşinci haktan birini yer ve ahır indirimsiz kalır.
- Hak sırayla tüketilir; oyuncunun hangi yapıya harcayacağı seçimi yoktur. Ucuz yapıyla başlamak hakkı israf eder (Tarla'da kazanç 1.800 ₺, dükkânda 3.384 ₺); sıra baskı kurmaz, yalnız fark eder.
- Süre erken çarpanla kısalır: dükkân 4 sa → 24 dk, gida_fabrikasi 6 sa → 36 dk, ciftlik 12 dk (katılım anında). Çarpan işin başladığı anda bir kez uygulanır (`erkenOyun.ts:41`).

**Pencere seçenekleri (A3 seçecek).**

| Seçenek | Veri (kod birimi) | İndirimsiz ek nakit | İlk-5 indirimiyle | Not |
|---|---|---|---|---|
| **P-İthal**: dükkân bedelinde 4 pencere (G7) | `insaParasi 6000000; insaMaliyeti { celik 20000, parca 8000, pencere 4000 }` | 6.000 ₺ + **1.600 ₺** pencere ithalatı (4 × 400 ₺) + 20 çelik + 8 parça | 4.200 ₺ + **1.109 ₺** (2,8 pencere × 396 ₺, korumada) + 14 çelik + 5,6 parça | `pencere` mal ve NPC pazar kaydı (emilim 100, arz 60) zaten var; ithalat emri 1 yuva ve ≈1 sa ister; ithalatın makasının %20'si ilçe kasasına gider |
| **P-Yok**: pencere dükkân bedelinde yok, para eşdeğeri, G8'de eklenir | `insaParasi 7440000` (taban 360 ₺; 7.600.000 ithal parite 400 ₺, GDD'nin 11.440 ₺'siyle aynı); `insaMaliyeti { celik 20000, parca 8000 }` | 7.440 ₺ + 20 çelik + 8 parça | 5.208 ₺ + 14 çelik + 5,6 parça | ithalat emri yok; `pencere`nin Y tüketicisi (yapı maliyeti) G8'e kalır; G8'de `insaMaliyeti.pencere` eklemek yalnız veri değişikliğidir, ödenmiş dükkânlar etkilenmez |

Bedel farkı küçüktür (P-İthal'de ek 1.109–1.600 ₺ nakit, P-Yok'ta 1.440 ₺ para). Kod maliyeti: P-İthal G7'de kod gerektirmez ama ilk dükkân akışına bir ithalat adımı katar ve bot/rehberin yuvasını harcar; P-Yok akışı kısaltır. **Sayıca öneri P-Yok'tur** (kısa ilk dükkân akışı, A0-11 "ilk dükkân ≤ 36 sa" için sürtünme azalır); P-İthal pencere talebini erken dünyaya taşır.

### 1.8 Zincir kurulum süresi (≤2 eşzamanlı inşaat, erken oyun çarpanı)

Katılımdan `t0` saat sonra başlatılan zincirin tamamlanma süresi (sa; üretimin ilk akışı ≈ +1 sa; görev sırası listedeki gibi, iki yuva). Santral yoktur (şebeke); isteğe bağlı santral satırları ayrıdır.

| Zincir | t0=0 | 12 | 24 | 48 | 72 | 96 | 168 |
|---|---|---|---|---|---|---|---|
| Ekmek (Tarla, değirmen, fırın, dükkân) | **1,00** | 1,00 | 1,02 | 2,54 | 4,06 | 5,58 | 10,00 |
| Ekmek + isteğe bağlı santral | 1,40 | 1,40 | 1,44 | 3,59 | 5,75 | 7,91 | 14,00 |
| Cam → pencere (cam fırını, doğrama, yapı market) | 1,20 | 1,20 | 1,22 | 3,05 | 4,88 | 6,71 | 12,00 |
| Cam → pencere + isteğe bağlı santral | 1,60 | 1,60 | 1,64 | 4,10 | 6,56 | 9,02 | 16,00 |

Süre değil **nakit ve emir yuvası** bağlayıcıdır: hibe 50.000 ₺ + kit gıdası satışı 12.600 ₺ ekmek zincirini ilk 2 saatte karşılar (S1: saat 2'de hazine 41.494 ₺); isteğe bağlı santral hücre ve ithal malzeme nedeniyle ≈ +35.000 ₺ ister. Eşzamanlı inşaat 2 olduğundan ilk iki saatte Tarla + değirmen, sonra fırın + dükkân sırası zorunludur. **Bot hedefi önerisi:** ekmek zinciri (4 yapı + ilk ekmek satışı) katılımdan ≤ 3 sim-saat; cam → pencere (gün 3 sonrası) ≤ 6 sim-saat; 7. günden sonra başlayan oyuncuya ≤ 14 sim-saat. Süre baskısı olmadığı için hedefi nakit bozar: bot hazinesi < gerekli iken beklemeli.

### 1.9 Dükkân S ve yerel pazar kanalı

**Sabitler (perakende §3.2, dikey §5.4; tür verisi):** raf 4 yuva; kasa 90 birim/sa; gider 132 ₺/sa; fiyat bandı [0,7; 1,4] R. Ek yapılar bugün işletme gideri taşımaz (`b.tesisler`'e girmez, docs/06 §15.3): **para-yalnız gider** önerisi `giderMiliSaat = [132000, 204000, 330000]` (S/M/L), parça tüketimi ve aşınma yok; lavabo kalemi `isletme`. Bu G7'nin tek yeni gider yoludur.

**Tamsayı çekim formülü** (`Math.pow/sqrt` yok; ppm):

```
ters(p)        = floor(1e12 / p)                      // 1/p
kare(x)        = floor(x * x / 1e6)
agirlik(p, c)  = floor(kare(ters(p)) * (1e6 + floor(250000 * c / 1e6)) / 1e6)   // c = dolu raf / tamCesit (ppm)
esnafAgirlik   = kare(ters(1_120_000))                // 797 193
pay(i)         = floor(kalanQ * w[i] / (Σ w[açık] + esnafAgirlik))
```

Su-doldurma: kasası dolan dükkân kasa değerine çekilir, kalan Q açık dükkânlara ve esnafa yeniden dağıtılır (en çok 32 tur); sonunda oyuncu toplamı `Q − floor(Q × 250000 / 1e6)`'yı (esnaf %25 tabanı) aşamaz, aşarsa orantılı kısılır. Hepsi ppm çarpım/bölme; sonuç mili-birim/sa.

**Satış hızı** (fırın, ekmek, çeşit 0,5, 1,05 R, ilçede tek oyuncu; Q = talep × nüfus × 50):

| Nüfus | Q ekmek (birim/sa) | Satış | Kasa doluluğu | Net ₺/sa | ZP3 (fiyat / 0,891 R) |
|---|---|---|---|---|---|
| 5.000 | 15 | 8,4 | %9 | −52 | 1,178 |
| 20.000 | 60 | 33,7 | %37 | 189 | 1,178 |
| 50.000 | 150 | 84,2 | %94 | 671 | 1,178 |
| 100.000 | 300 | 90,0 (kasa) | %100 | 727 | 1,178 |

Kalabalık (100 bin nüfus, hepsi 1,05 R): k = 1, 2 dükkânda hepsi kasa dolu (net 727 ₺/sa); k = 3'te 75'er (583 ₺/sa, esnaf %25 tabanında); k = 5'te 45'er (297 ₺/sa); k = 10'da 22,5'er (83 ₺/sa, geri ödeme 144 sa). **Ucuz ilçede ikinci dükkân marjinal olarak faydasızdır** (ilçe ≤2 dükkân koruması gerçekte tavandır).

**Geri ödeme (ilk dükkân, 1,05 R).** Nakit yatırım (kit stoğu varken) indirimli 8.945 ₺ / indirimsiz 11.225 ₺; tam ithal 11.931 / 15.491 ₺.

| İlçe sınıfı / k | Net ₺/sa | Geri ödeme sa (nakit, indirimli / indirimsiz) | Hedef ≤ 48 |
|---|---|---|---|
| kırsal / 1 | 32 | 281 / 352 | **tutmaz** |
| kasaba / 1 | 524 | 17 / 21 | evet |
| şehir / 1 | 727 | 12 / 15 | evet |
| şehir / 5 | 393 | 23 / 29 | evet |
| kasaba / 3 | 160 | 56 / 70 | **tutmaz** |

Kırsal ve kalabalık kasaba dükkânı hedefi tutturmaz: bu "kilit değil sonuç"tur (docs/12 §12) ve Yatırım Tahmini kartında yazar. Alfa-0 ilçeleri ağırlıkla şehir sınıfıdır (ortalama ≈145 bin nüfus), medyan ≤ 36 sa ve ≤ 48 sa hedefleri şehirde sağlanır.

**Fiyat kademeleri (`secim`, tutar yok).** Ekmek, net ₺/sa (komisyonlu; gider 132 dahil):

| Kademe | Kod | R çarpanı (ppm) | ZP3 | şehir, 1 dükkân (kasa bağl.) | kasaba, 1 dükkân | şehir, 5 dükkân (4 rakip 1,05) | kasaba, 3 dükkân |
|---|---|---|---|---|---|---|---|
| kampanya (yalnız kampanya penceresi) | 0 | 850.000 | 0,954 | **−353** | **−327** | **−315** | **−228** |
| uygun | 1 | 950.000 | 1,066 | 187 | 127 | 92 | −11 |
| **normal (varsayılan)** | 2 | 1.050.000 | 1,178 | 727 | 511 | 383 | 154 |
| yüksek | 3 | 1.150.000 | 1,291 | 1.267 | 831 | 592 | 279 |

- **Fiyat savaşı kendini cezalandırır:** dükkân 0,891 R'nin altında sattığında aynı birimi NPC'ye satmaktan daha az alır; 0,85 R'de dört senaryonun hepsinde net eksidir ve satışı (kasa bağlayıcıyken) artırmaz; 0,70 R'de −1.163 ₺/sa'e iner. Kampanya kademesi bu yüzden yalnız perakende raporunun kampanya penceresinde (günde ≤ 6 sa, haftada ≤ 2 gün) seçilebilir; yoksa UI'da hiç sunulmaz. Seçenek: kampanya kademesini hiç koymamak (üç kademe: 0,95/1,05/1,15).
- **Fiyat arttıkça net her senaryoda artıyor** (1,40 R'de 2.617 ₺/sa): kasa bağlayıcıyken hacim kaybı olmaz, talep bağlayıcıyken NPC tabanı marj tabanını yükselttiği için gelir sabit, prim artar. Bu **rasyonel oyuncunun üst kademeye yığılacağı** demektir; ZP3 (perakende primi 1,05–1,20; alarm > 1,30) bu yüzden üst kademede kesilmelidir. Önerilen üst sınır 1,15 R (ZP3 1,291, alarm eşiğinin altında); bant [0,7; 1,4] parametre olarak kalır ama kademeler bandın içinden seçilir. Esnaf fiyatı (1,12 R) üstünde pay kaybı küçüktür (şehir 5 dükkânda 1,40 R'de satış 54 → 33).

**Kamu fiyat tavanıyla ilişki** (ekmek, R = 60 ₺):

| Kanal | ₺/birim | R |
|---|---|---|
| NPC ihracat (korumada / sonra) | 54,0 / 53,5 | 0,900 / 0,891 |
| Dükkân kademeleri | 51,0 / 57,0 / 63,0 / 69,0 | 0,85 / 0,95 / 1,05 / 1,15 |
| Esnaf | 67,2 | 1,120 |
| **Kamu siparişi tavanı** | **62,1** | **1,035** |
| NPC ithalat maliyeti (korumada / sonra) | 66,0 / 66,7 | 1,100 / 1,111 |

Kamu tavanı ithalat maliyetinin altındadır (marj ≤ 0, docs/06 §15.7 madde 5) ve NPC ihracatının %16,2 üstünde öder; dükkân fiyatı 1,035 R'nin altında kaldığında kamu siparişi dükkândan iyidir, üstünde dükkân kazanır. **Dükkân perakende fiyatına kamu tavanı uygulanmaz**; tek üst sınır banttır ve ithalat arbitrajı eşiği 1,111 R'dir (ZP11: ithal alıp perakende satış payı ≤ %15). Fiyat kademesi komutu (`dukkan_fiyat { dukkan, raf, kademe }`) `secim` türündedir: tutar taşımaz, oyuncu yolundadır, para güvenliği tablosunda çelişki yoktur.

**Kamu fiyat tavanının kod atfı.** Tavan `kamuFiyatTavani(d, ic, mal) = d.pazar.fiyat[mal] × ic.mulk.kamuIthalatCarpaniPpm` (`packages/cekirdek/src/mulk/kasa.ts:415-424`). Çarpan derleme zamanında `kamuIthalatCarpaniHesapla` ile bulunur (`mulk/kamuFiyat.ts:18-22`; `derle.ts:193`): `min(ithalatCarpaniPpm 1,10; anlasmaIthalatCarpaniPpm 1,05; yaptirimIthalatCarpaniPpm 1,30) = 1,05`; iki Ticaret ofisi makas indirimi (`makasIndirimPpm × enFazlaIlBasina`, toplam %30) farkı kapatır: **1,035**. GDD ve toplantı notundaki "≤ 1,10 R" üst sınırdır; uygulanan 1,035 R'dir. Şebeke fiyatı (§1.3-B1) aynı kuralı kullanır.

**Kamu siparişi v0: mal listesi, fiyat ve hacim önerisi.** Mal listesi: `ekmek` (okul/hastane), `gida`, `pencere` (okul/muhtarlık onarımı), `celik`, `parca` (yol malzemesi).

| Mal | R ₺ | Tavan 1,035 R (kod, mili) | **Öneri 1,03 R (kod, mili)** | Sipariş boyutu (birim) | Sipariş tutarı ₺ | Vade | Rakip kanal: NPC ihracat 0,891 R ₺ |
|---|---|---|---|---|---|---|---|
| ekmek | 60 | 62,10 (62.100) | **61,80 (61.800)** | 100 | 6.180 | 3 gün | 53,5 |
| gida | 70 | 72,45 (72.450) | **72,10 (72.100)** | 50 | 3.605 | 3 gün | 62,4 |
| pencere | 360 | 372,60 (372.600) | **370,80 (370.800)** | 10 | 3.708 | 3 gün | 320,8 |
| celik | 120 | 124,20 (124.200) | **123,60 (123.600)** | 30 | 3.708 | 3 gün | 106,9 |
| parca | 180 | 186,30 (186.300) | **185,40 (185.400)** | 20 | 3.708 | 3 gün | 160,4 |

Öneri fiyat 1,03 R: NPC ihracatının %15,6 üstü, ithalat maliyetinin (1,10–1,111 R) altı, dükkân normal kademesinin (1,05 R) altı; tavanın altında kaldığı için doğrulayıcıyı geçer. Hacim sınırı kasa kurallarından gelir (`mulk.kasa`): tek alım ≤ bakiyenin %40, haftalık bütçe ≤ 28 günlük girişin %25'i, oyuncuya giden ≤ girişin %50'i.

**Kasa girişi ve `kasaPayiPpm` (baş lider kararı: şebeke bedelinin bir payı ilçe kasasına, kalanı lavaboya).** Kasa kuralları (`mulk.kasa`): oyuncuya giden ≤ girişin %50'si (28 günlük pencere), haftalık bütçe ≤ 28 günlük girişin %25'i, tek alım ≤ bakiyenin %40'ı; sürekli rejimde haftalık sipariş kapasitesi = 0,5 × haftalık giriş. v0 hacmi (ilçe başına haftada ≤ 5 sipariş, 1,03 R): **çekirdek (ekmek 2 + gıda 1 + pencere 1 + çelik 1) 23.381 ₺/hafta**, parça yedeği dahil 27.089 ₺/hafta; gerekli haftalık giriş 46.762 / 54.178 ₺. Giriş = oyuncu sayısı × (mevcut kaynaklar 1.588 ₺ + `kasaPayiPpm` × şebeke ödemesi 397.577 ₺/hafta/P4 oyuncusu).

| İlçedeki P4 oyuncusu | Asgari `kasaPayiPpm` (çekirdek) | Asgari (parça yedekli) |
|---|---|---|
| 1 | %11,4 | %13,2 |
| 2 | %5,5 | %6,4 |
| 4,4 | %2,3 | %2,7 |
| 10 | %0,8 | %1,0 |

| `kasaPayiPpm` | Oyuncu/ilçe | Haftalık kasa girişi ₺ | Sipariş kapasitesi ₺/hafta (giriş × %50) | v0 çekirdeği karşılanır mı | Lavaboya yanan ₺/hafta |
|---|---|---|---|---|---|
| 50.000 | 1 / 4,4 / 10 | 21.466 / 94.452 / 214.664 | 10.733 / 47.226 / 107.332 | hayır (0,46×) / evet (2,0×) / evet (4,6×) | 377.698 / 1.661.870 / 3.776.978 |
| 100.000 | 1 / 4,4 / 10 | 41.345 / 181.919 / 413.453 | 20.673 / 90.960 / 206.726 | hayır (0,88×) / evet (3,9×) / evet (8,8×) | 357.819 / 1.574.403 / 3.578.190 |
| **120.000 (öneri)** | 1 / 4,4 / 10 | **49.297** / 216.906 / 492.968 | **24.648** / 108.453 / 246.484 | **evet (1,1×)** / evet (4,6×) / evet (10,5×) | 349.867 / 1.539.417 / 3.498.674 |
| 150.000 | 1 / 4,4 / 10 | 61.224 / 269.386 / 612.241 | 30.612 / 134.693 / 306.120 | evet (1,3×) / evet (5,8×) / evet (13,1×) | 337.940 / 1.486.937 / 3.379.401 |
| 200.000 | 1 / 4,4 / 10 | 81.103 / 356.853 / 811.029 | 40.551 / 178.426 / 405.515 | evet (1,7×) / evet (7,6×) / evet (17,3×) | 318.061 / 1.399.470 / 3.180.613 |

**Öneri `kasaPayiPpm = 120.000` (%12):** en ince ilçede (tek P4 oyuncusu) çekirdek hacmi 1,1× karşılar; kalabalık ilçede kasa kapasitesi 4–10× olur ve sipariş sayısı bağlayıcıdır. **Tamsayı korunum:** kasa = ⌊ödeme × 120.000 / 1.000.000⌋, lavabo `sebeke` = ödeme − kasa. Örnek (bir P4 oyuncusu, bir hafta): ödeme 397.576.620 mili; kasa 47.709.194 mili; lavabo 349.867.426 mili; toplam 397.576.620 (**fark 0**). Böylece `Σ hazine + Σ kasa + Σ lavabo = Σ musluk` her tikte tam eşit kalır; kasadan oyuncuya sipariş bedeli kasa → hazine devridir. Dünya (200 P4 oyuncusu, 45 ilçe): şebeke ödemesi 79.515.324 ₺/hafta; kasaya 9.541.839, lavaboya 69.973.485 ₺/hafta; v0 en çok 1.052.145 ₺/hafta harcar (45 × 23.381), geri kalanı kasa bakiyesinde birikir (tek alım ve haftalık bütçe tavanları geçerli) ve para arzını **büyütmez**; kasadan oyuncuya akan para sink'i en çok %6 azaltır. Mevcut kaynaklarla (şebekesiz) kasa girişi yalnız 1.588 ₺/hafta/oyuncudur: v0 olmadan sembolik kalırdı (GDD ≈ 2.200 ₺/hafta).

**Öneri v0 hacmi:** ilçe başına haftada en çok 5 sipariş (ekmek 2, gıda 1, pencere 1, çelik 1; parça yedek), ilk kabul eden alır. Kamu siparişi içindeki ekmek ve pencere satış kanalı yerel kanaldan ayrı bir musluk açmaz (kasa zaten yanan paradan beslenir). Dükkân kamu siparişi vermez.

**Yerel talep modeli (ilçe sınıfı × taban × takvim × bayram).** İlçe sınıfı = ilçenin baskın hücre sınıfı (kırsal/kasaba/şehir; eşitlikte büyük); nüfus eşdeğeri 10.000 / 40.000 / 120.000. `Q[mal] = floor(floor(taban[sınıf][mal] × takvim[grup][ay] / 1e6) × bayram[grup] / 1e6)`; `taban = talep1000Saat × nüfusEşdeğeri × yerelOlcek / 1000` (mili-birim/sa, `yerelOlcek` 50, kalibre edilmedi). K1 sepeti sabit tutuldu: gıda 90 + ekmek 60 + un 10 + süt 20 + süt ürünü 20 = 200 (= bölge kipi `nufus.tuketim1000Saat.gida`; o blok değişmez).

| Mal | talep1000Saat (mili) | Takvim grubu | Kırsal taban (mili/sa) | Kasaba | Şehir | Şehir birim/sa |
|---|---|---|---|---|---|---|
| gida | 90 | gida | 45.000 | 180.000 | 540.000 | 540 |
| **ekmek** | 60 | gida | 30.000 | 120.000 | 360.000 | 360 |
| **un** | 10 | gida | 5.000 | 20.000 | 60.000 | 60 |
| sut | 20 | gida | 10.000 | 40.000 | 120.000 | 120 |
| sut_urunu | 20 | gida | 10.000 | 40.000 | 120.000 | 120 |
| sekerleme | 6 | tatli | 3.000 | 12.000 | 36.000 | 36 |
| findik_urunu | 3 | tatli | 1.500 | 6.000 | 18.000 | 18 |
| yakit | 15 | yakit | 7.500 | 30.000 | 90.000 | 90 |
| **pencere** | 8 | yapi | 4.000 | 16.000 | 48.000 | 48 |
| **cam** | 4 | yapi | 2.000 | 8.000 | 24.000 | 24 |
| celik | 6 | yapi | 3.000 | 12.000 | 36.000 | 36 |
| parca | 5 | yapi | 2.500 | 10.000 | 30.000 | 30 |
| cimento (A0-ops) | 6 | yapi | 3.000 | 12.000 | 36.000 | 36 |

İklim takvimi çarpanları (ppm, Ocak … Aralık; her satırın toplamı tam 12.000.000, yıllık ortalama 1):

| Grup | Mallar | Oca | Şub | Mar | Nis | May | Haz | Tem | Ağu | Eyl | Eki | Kas | Ara |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| gida | gida, ekmek, un, sut, sut_urunu | 1.030.000 | 1.020.000 | 1.010.000 | 1.000.000 | 990.000 | 970.000 | 960.000 | 970.000 | 1.000.000 | 1.020.000 | 1.020.000 | 1.010.000 |
| tatli | sekerleme, findik_urunu | 1.100.000 | 1.050.000 | 980.000 | 950.000 | 900.000 | 850.000 | 820.000 | 850.000 | 950.000 | 1.100.000 | 1.200.000 | 1.250.000 |
| yakit | yakit | 1.400.000 | 1.400.000 | 1.200.000 | 950.000 | 750.000 | 650.000 | 600.000 | 600.000 | 750.000 | 950.000 | 1.300.000 | 1.450.000 |
| yapi | pencere, cam, celik, parca, cimento | 650.000 | 650.000 | 900.000 | 1.150.000 | 1.300.000 | 1.250.000 | 1.200.000 | 1.200.000 | 1.200.000 | 1.100.000 | 800.000 | 600.000 |

Gerekçe: gıda sepeti hafif mevsimseldir (kışın +%3, yazın −%4); tatlı ve kuruyemiş serin dönemde yüksek; yakıt kışın ×1,40–1,45; yapı malzemesi, cam ve pencere bahar–yaz onarım–inşaat sezonunda yüksek, kışın düşük. Kış fırtınası olayı (cam/pencere ×1,5, canlı-dünya §5) takvimden bağımsız, tavanlı olarak üstüne gelir.

**Bayram dalgası** (ayrı parametre; toplam sabit, yalnız zamanlama; `Ws = 1.000.000 − ⌈Do·(Wo − 1.000.000)/Ds⌉`):

| Grup | Do (gün) | Wo (ppm) | Ds (gün) | Ws (ppm) | Toplam sapma (gün·ppm) | Mallar |
|---|---|---|---|---|---|---|
| tatli | 7 | 1.800.000 | 28 | 800.000 | 0 | sekerleme, findik_urunu |
| gida | 5 | 1.250.000 | 10 | 875.000 | 0 | gida, ekmek, un, sut, sut_urunu |

Yapı ve yakıt grupları bayramdan etkilenmez; dükkân açık/kapalı kuralı yoktur (docs/12 §7); tarihler takvim paketinden gelir. Örnek (şehir, birim/sa): ekmek Ocak 370,8, Temmuz 345,6, bayram öncesi 5 günde 463,5; şekerleme normal 36,0, bayram öncesi 64,8, sonrası 28,8.

**Yedi malın `talep1000Saat` değeri (gerekçe).** T3 taslağı bu yedi mali kapsam dışı bırakmıştı (§11 soru 10); A2 sayıları aşağıdadır. Gıda sepeti (gıda + ekmek + un + süt + süt ürünü) **200 birim/1000 kişi/sa sabit** tutuldu (= bölge kipi `nufus.tuketim1000Saat.gida`, o blok değişmez): önceki gıda 120 sepeti ekmek 60 + un 10 + süt 20 + süt ürünü 20 ile paylaştırıldı, gıdaya 90 kaldı. Tatlı ve yapı sepetleri ayrı gruplardır.

| Mal | `talep1000Saat` (mili) | Gerekçe |
|---|---|---|
| un | 10 | ev ekmeği ve fırıncı olmayan hane; bakkal rafında kalıcı; gıda sepetinin %5'i |
| süt | 20 | içme sütü; süt ürünü (peynir, yoğurt) ayrı 20; bozulma yüksek olduğundan bakkal + şarküteri rafı |
| findik_urunu | 3 | kuruyemiş; şekerlemenin yarısı (6); tatlı takvim grubu (kışın yüksek) |
| yakit | 15 | ısınma ve ulaşım; yakıt takvimi kışın ×1,40–1,45, yazın ×0,60; benzin/akaryakıt dükkânı yoksa pazarda satılır |
| celik | 6 | küçük onarım ve inşaat; yapı takvimi (bahar–yaz yüksek) |
| parca | 5 | yedek parça ve tamirci; yapı takvimi |
| cam | 4 | pencere camı, tamir; yapı takvimi; pencere 8'in yarısı |

**Kapsam (gıda 120 → 90):** `mulk.perakende.talep1000Saat` **yalnız yeni yerel pazar kanalının** (dükkân hane talebi, `Q = taban × takvim × bayram`) girdisidir. Mevcut mülk kipi NPC gıda talebi (`pazar` emilim kayıtları, `npcHacimleri`) bu bloktan okunmaz; bölge kipinin `nufus.tuketim1000Saat` (gıda 200, yakıt 30, elektronik 8, elektrik 150) yalnız nüfusu olan düğümlerde tüketimdir (`ekonomi/tablo.ts:99`) ve mülk işletme düğümünde nüfus 0'dır; o blok değişmez. Sonuç: bugünkü botların 7 günlük geliri ve ölçüm temel çizgisi **değişmez** (çiftçi 296.727 → 829.041 ₺ ve tüccar 129.359 → 395.139 ₺ [yönetimsiz → yönetimli], O2 gec60: önce ve sonra aynı; çekirdekte yerel pazar kanalı henüz yoktur ve `botlar/src/parsel.ts` dükkân kurmaz: yerel kanala hiç satış yok). Etki yalnız dükkân kuran oyuncuda doğar. 90 değerinin nedeni, gıda sepetini (gıda + ekmek + un + süt + süt ürünü) bölge kipinin `tuketim1000Saat.gida = 200` toplamına eşit tutmaktır; T3'ün 120'si ekmek, un, süt ve süt ürününü ayrı mal olarak eklemeden önceki sepetti. **(doğrulanmadı: çekirdek koşulmadı; kod okuması.)**

Mal başına kalibrasyon yoktur: `yerelOlcek` 50 gibi bu sayılar **parametre, öneri değer**'dir; ZP8 payı (%45, sınır %50) ve çıkmaz-mal denetimi ile izlenir; ilçe nüfusu verisi geldiğinde yeniden kalibre edilir (§4).

### 1.10 `yerelNpc` para musluğu ve para arzı

Hane bütçesi B = Σ Q·R·1,12 (dikey §5.9); oyuncuya akabilecek tavan `B × (1 − %25)`. Esnaf payı defterde yoktur (NPC kesesi modellenmez). Haftalık = oyuncu yerel satışı × 168.

| İlçe sınıfı | B ₺/sa (13 mal, Ekim) | Oyuncu tavanı ₺/hafta | 1 fırın dükkânı ₺/hafta | Tavanın payı |
|---|---|---|---|---|
| kırsal | 12.848 | 1.618.788 | 181.812 | %11,2 |
| kasaba | 51.390 | 6.475.150 | 727.280 | %11,2 |
| şehir | 154.170 | 19.425.450 | 952.560 | %4,9 |

**İnce dünya ve kalabalık: ilçe başına haftalık `yerelNpc` (fırın dükkânları, 1,05 R)**

| Sınıf | k = 1 | k = 3 | k = 5 | k = 10 | Esnafa kalan Q |
|---|---|---|---|---|---|
| kırsal | 181.812 | 242.903 | 242.903 | 242.903 | %44 → %25 |
| kasaba | 727.280 | 971.611 | 971.611 | 971.611 | %44 → %25 |
| şehir | 952.560 | 2.857.680 | 2.914.834 | 2.914.834 | %75 → %25 |

Doyma: oyuncu toplamı `(1 − %25) Q`'da durur (kırsal/kasabada k = 3'ten itibaren, şehirde k = 5'ten itibaren); fazla dükkân yalnız payı böler. Prim kısmı (NPC ihracatına göre ek para) haftada: kırsal 27.532 → 36.782 ₺, kasaba 110.131 → 147.130 ₺, şehir 144.245 → 441.389 ₺.

**Dünya ölçeği (200 oyuncu, 45 ilçe; ilçelerin %10 kırsal, %30 kasaba, %60 şehir olduğu varsayımıyla, k ≈ 4,4).**

| Kalem | ₺/hafta |
|---|---|
| `yerelNpc` (oyuncu yerel satışı) | 92.910.226 |
| · bunun primi (NPC ihracatına göre **ek** para) | 14.069.263 |
| `ihracatNpc` (ekmek, emilimle sınırlı: 12.500 birim/sa × 0,891 R) | 112.266.000 |
| `yerelNpc` payı (ZP8: ≤ %50) | **%45,3** |
| `hibe` (tek seferlik) / `odul` tavanı (tek seferlik) | 10.000.000 / 1.600.000 |

Para arzı etkisi: ihracat musluğunun yerine geçtiği ölçüde para arzı **büyümez**; ek para yalnız primdir (ihracatNpc'nin %12,5'i) ve kanal doyunca fazla arzı emerek fiyat çöküşünü azaltır. ZP8 payı %45'te: Alfa-0'da %50'ye yaklaşırsa alarm. **Para defteri:** yeni musluk kalemi `yerelNpc`. `Dunya.mulk.para` doğrulayıcısı bugün tüm musluk kalemlerinin varlığını ve bilinmeyenin yokluğunu ister (docs/06 §15.7 madde 7); kalem yalnız `mulk.perakende` bloğu açıkken yazılır ve doğrulayıcıda "blok açıksa var, değilse yok" olur. **Yeni lavabo kalemleri:** `sebeke` (elektrik ve yakıt şebeke ödemesi; §1.3-B1; yakıt eskiden `ithalatNpc` lavabosundaydı) ve dükkân gideri için mevcut `isletme`; yapı bedeli `harcama`, ithal pencerenin NPC payı `ithalatNpc` olarak kalır. Korunum `Σ hazine + Σ kasa + Σ lavabo = Σ musluk` değişmez; yalnız musluk tarafına `yerelNpc`, lavabo tarafına `sebeke` girer. Dükkân satışı komisyonsuzdur (yerel kanalda liman primi ve işlem komisyonu yok, canlı-dünya §4.1); NPC güvence alıcıları (kepek, gübre) bütçeli ve toplamı sabittir, yeni musluk açmaz (K-5). Şebeke ödemesinin %20'si ilçe kasasına yönlendirilirse bu pay lavabodan ayrılır; kasa yalnız zaten yanan paradan beslenir (G4).

### 1.11 Çıkmaz mal denetimi (24 mal; tüketici türü sayısı)

Türler (uretim §2.4): Ü üretim yöntemi, H hane/raf, K kamu siparişi, Y yapı maliyeti, O ordu, P NPC pazar kaydı, N güvence alıcı. Kural: ≥ 2 tür; yan ürün için Ü ≥ 1 ve N ≥ 1. Tam tablo betik çıktısında §9. Öneri tariflerle sonuç:

- **Tamam (≥ 2 tür): 23 mal.** Yeni mallar: `un` (Ü fırın, H bakkal, P) 3; `ekmek` (H fırın+bakkal, K, P) 3; `cam` (Ü doğrama, H yapı market, K onarım, P) 4; `pencere` (H yapı market, K onarım, Y dükkân [P-İthal], P) 4 (P-Yok'ta Y G8'e kadar yok: 3); `sut` (H bakkal+şarküteri, P; Ü mandıra P1) 2→3; `sut_urunu` 3; `sekerleme` (H şekerci+bakkal, P) 2; `kepek` (**Ü `kepek_gubresi` + `sut_kepekli`, P, N**) 3; `gubre` (Ü Tarla gübre dozu, P, N) 3.
- **Açık: `findik`** (P0'da yalnız P; Ü `findik_kavurma` P1'de gelir: "P1'de tamam"). Çıkmaz-mal doğrulayıcısı bu mal için P0'da uyarı (hata değil) verir (uretim A0-3).
- `elektrik` depolanamaz altyapı malıdır: şebeke ya da santralden tüketilir, pazar kaydı yoktur; tüketicisi yalnız Ü (+ santral) olduğundan kuraldan muaf tutulması gerekir (not).
- **K türü artık somut:** kamu siparişi v0 mal listesi `ekmek, gida, pencere, celik, parca` (§1.9). `ekmek`, `pencere`, `gida`, `celik`, `parca` için K sayılır; listeye bağlanana kadar doğrulayıcı bu satırları "öneri" saymalıdır.

### 1.12 Senaryolar (kâğıt model; hasat 1,0, NPC fiyat dinamiği ve toprak yok)

Varsayımlar: ilçe nüfusu 50.000 (ilçede tek oyuncu), dükkân 1,05 R, yalnız ekmek rafı, korumada NPC (komisyonsuz, ihracat ×0,90, ithalat ×1,10), hücre 6 yurt + kasaba 2.500 ₺ (dükkân ×1,45), ödüller çekirdek tablosundan (`ilk_satis` 500 ₺, `zincir_kapandi` 700 ₺, mal ödülleri stoğa), ithal girdi (çelik, parça, silis) otomatik ve fiyatıyla, **elektrik ve yakıt kamu şebekesinden** (10,35 ve 103,5 ₺), kit gıdası t=0'da satılır.

**Senaryo 1 (santralsiz): Tarla → değirmen → fırın → dükkân; ahır gün 2.** Saat 0'da Tarla + değirmen (12 dk, 36 dk), saat 1'de fırın + dükkân; saat 26'da ahır (kepek → gübre).

| Saat | Hazine ₺ | Önceki satıra göre ₺ | Ekmek (yerel + NPC) birikimli ₺ |
|---|---|---|---|
| 1 | 51.850 | +1.850 | 0 |
| 2 | 41.494 | −10.355 | 5.942 |
| 3 | 52.801 | +11.307 | 19.660 |
| 4 | 64.108 | +11.307 | 33.378 |
| 6 | 86.723 | +22.614 | 60.813 |
| 8 | 109.337 | +22.614 | 88.249 |
| 12 | 154.565 | +45.228 | 143.121 |
| 18 | 222.408 | +67.843 | 225.428 |
| 24 | 290.250 | +67.843 | 307.735 |
| 48 | 548.253 | +68.067 /6 sa | 636.965 |
| 72 | 820.523 | +272.269 /gün | 966.194 |
| 168 | 1.909.600 | +272.269 /gün | 2.283.112 |

Gün özeti (24 saatlik fark):

| Kalem | Gün 1 | Gün 3 | Gün 7 |
|---|---|---|---|
| yapı bedeli (4 yapı indirimli) | −22.400 | - | - |
| hücre alımı (1 ticari hücre) | −3.625 | - | - |
| inşaat malzemesi ithalatı | −1.228 | - | - |
| şebeke yakıt (kamu) | −46.368 | −49.680 | −49.680 |
| şebeke elektrik (kamu) | −6.384 | −7.117 | −7.117 |
| bakım parçası | −9.611 | −12.355 | −12.355 |
| işletme gideri (4 tesis + dükkân) | −4.176 | −5.760 | −5.760 |
| kit gıdası satışı | 12.600 | - | - |
| ödüller (`ilk_satis`, `zincir_kapandi`) | 1.200 | - | - |
| ekmek yerel satış (dükkân) | 122.020 | 127.326 | 127.326 |
| ekmek NPC ihracatı | 185.715 | 201.904 | 201.904 |
| kepek NPC ihracatı (gün 1) / gübre NPC ihracatı (ahırdan sonra) | 12.510 | 17.963 | 17.963 |
| arazi vergisi | −3 | −11 | −11 |
| **Net** | **240.250** | **272.269** | **272.269** |
| **Gün sonu hazine** | 290.250 | 820.523 | 1.909.600 |

**İsteğe bağlı santralli varyant** (kömür santrali; yakıt şebekeden): saat 0'da Tarla + santral; 1'de değirmen + fırın; 2'de dükkân (ahır indirimsiz). En düşük hazine 30.025 ₺ (saat 3), gün 1 net 213.419 ₺; gün 3 ve gün 7 net 267.702 ₺; gün sonu hazine 263.419 / 778.883 / 1.849.690 ₺. Santralsize göre gün 1'de −26.831 ₺, gün 3+ −4.567 ₺/gün (santral kömürü 5.971 ve bakım 5.703 > şebeke elektrik tasarrufu 7.117): **santral nakit akışını kötüleştirir**, kararlı hâlde bile kazandırmaz (§1.3-B1).

Okumalar: (i) Gün 3 ve gün 7 aynıdır çünkü kararlı hâle varılmıştır (hasat ve fiyat dinamiği modelde yok). (ii) **Ekonomi hızı:** 50.000 ₺ hibe ≈ 5 saatlik net akıştır; P4'ün tamamı 2–4 saatte kendini öder. Bu bir tek oyunculu, fiyat dinamiksiz sonuçtur: §1.3-B3'e göre dünya doyumu bunu gerçek hayatta bastırır; mutlak ₺ kalibre değildir (dikey R1). (iii) Emir yuvası: ekmek ihracat, kepek ihracat, parça ithalat, çelik/silis ithalat temel dört yuvayı doldurur; **yakıt ve elektrik şebekeden gelir ve yuva harcamaz**; pencere ithalatı (P-İthal) beşinci yuva ister (Ticaret ofisi +4). (iv) Ahır gün 2'de indirimli alınabilir (santralsiz), santrallide değil.

**Senaryo 2: cam → pencere (gün 3 sonunda; santralsiz).** Cam fırını ve doğrama ikisi de `parca_fabrikasi` (A3 seçimi; S 15.000 ₺ + 80 çelik + 30 parça, 2 hücre, 8 sa → gün 3'te ×0,4 = 3,2 sa). Altıncı ve yedinci yapı, indirim yok. Yatırım: yapı 30.000 ₺ + hücre 10.000 ₺ + malzeme ithalatı 33.000 ₺ = **73.000 ₺**.

| Kalem (24 saatlik) | 72–96 sa | 96–120 sa | 120–144 sa | 144–168 sa |
|---|---|---|---|---|
| yapı bedeli (para) | −30.000 | - | - | - |
| hücre alımı | −10.000 | - | - | - |
| inşaat malzemesi ithalatı | −33.000 | - | - | - |
| silis / çelik / parça ithalatı | −120.806 | −139.392 | −139.392 | −139.392 |
| şebeke yakıt (ekmek + cam) | −84.125 | −89.424 | −89.424 | −89.424 |
| şebeke elektrik (kamu) | −14.221 | −15.314 | −15.314 | −15.314 |
| bakım parçası | −20.592 | −21.859 | −21.859 | −21.859 |
| işletme gideri | −8.256 | −8.640 | −8.640 | −8.640 |
| ekmek hattı geliri (yerel 127.326 + NPC 201.904 + gübre 17.963) | 347.193 | 347.193 | 347.193 | 347.193 |
| pencere NPC ihracatı | 188.698 | 217.728 | 217.728 | 217.728 |
| cam NPC ihracatı (fazla) | 29.275 | 36.936 | 36.936 | 36.936 |
| arazi vergisi | −25 | −25 | −25 | −25 |
| **Net (ekmek hattı dahil)** | **244.140** | **327.202** | **327.202** | **327.202** |

Pencere hattının artımlı katkısı 72→168 sa **+136.668 ₺** (yatırım dahil; ekmek hattının aynı pencerede neti 1.089.077 ₺). Kararlı hâl marjı (komisyonlu, S ölçek): (a) yalnız doğrama, bütün girdi ithal **1.013 ₺/sa**; (b) cam fırını + doğrama **2.052 ₺/sa** (yatırım ≈ 73.000 ₺; geri ödeme ≈ 36 sa); (c) + kendi silis ocağı 2.158 ₺/sa (silis damarı ister). **Pencere hattı ekmek hattının ≈ %18'i kadar kazandırır** (2.052 ↔ 11.345 ₺/sa); P5'in "kendi pencere mağazan" vaadi zincir marjından değil yapı market perakendesinden ve kamu/yapı talebinden gelmelidir.

**Cam fırınının ev sahibi ve tesis tabanı** (A3 seçti: `parca_fabrikasi`). KD şebeke fiyatıyla:

| Ev sahibi | Yöntem | Oran | KD ₺/sa | KD/işçi | Not |
|---|---|---|---|---|---|
| celikhane | yuksek_firin | 1,371 | 1.941 | 277 | mevcut |
| celikhane | elektrik_ark | 1,643 | 2.872 | 287 | mevcut; teknoloji `elektrik_ark_ocagi` ister |
| parca_fabrikasi | standart_parca | 1,216 | 1.241 | 226 | mevcut, varsayılan |
| parca_fabrikasi | otomatik_hat | 1,250 | 1.758 | 586 | mevcut; teknoloji `otomasyon` + elektronik ister |
| **parca_fabrikasi** | **cam_firini (öneri)** | 1,448 | **1.408** | 282 | yeni; standart_parca'yı +%13 geçer, otomatik_hat'ın %20 altında |
| parca_fabrikasi | celik_dograma (öneri) | 1,446 | 3.105 | 444 | yeni; iki mevcut yöntemi de geçer |

Okuma: `cam_firini` varsayılan `standart_parca`'yı (1.241) geçer; `otomatik_hat` (1.758) teknoloji ve elektronik kilidi arkasındadır, bu yüzden ev sahibi tabanı olarak varsayılan `standart_parca` alınır; cam fırını `otomatik_hat` seviyesine de çıkarılmak istenirse tarif +%25 olur (bant üstü). Tesis tabanında cam fırını ve doğrama ev sahibi içindeki mevcut yöntemleri yenmeyi ya da bandın içinde kalmayı **başarır**; `celikhane` olsaydı cam `yuksek_firin`'ın (1.941) %27 altında kalırdı. `parca_fabrikasi` ayrıca 5.000 ₺ + 20 çelik + 10 parça ve 1 hücre ucuzdur (S 15.000 ₺ + 80/30, 2 hücre, 8 sa; ithal değer −9.666 ₺). Tesis türü `yontemler[]` taşınamaz (uretim K-8): geri dönüşü zor (§3).

### 1.13 A3 için veri taslağı (kod birimi; `icerik.json` ve `parametreler.json` alanları)

Yöntemler (`yontemler[]` sonuna; hepsi `mulkKipi: true`; elektrik/yakıt şebekeden otomatik, tarifte kalır):

```json
{ "id": "degirmen", "ad": "Değirmen", "girdiler": { "tahil": 200000, "elektrik": 12000 }, "ciktilar": { "un": 165000, "kepek": 33000 }, "isci": 5000, "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20, "mulkKipi": true },
{ "id": "ekmek_firini", "ad": "Ekmek Fırını", "girdiler": { "un": 165000, "yakit": 20000, "elektrik": 15000 }, "ciktilar": { "ekmek": 240000 }, "isci": 8000, "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20, "mulkKipi": true },
{ "id": "kepek_gubresi", "ad": "Kepekten Gübre", "girdiler": { "kepek": 100000, "elektrik": 5000 }, "ciktilar": { "gubre": 18000 }, "isci": 3000, "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10, "mulkKipi": true },
{ "id": "sut_kepekli", "ad": "Kepekli Süt Besisi", "girdiler": { "tahil": 50000, "kepek": 60000, "elektrik": 5000 }, "ciktilar": { "sut": 82000, "gubre": 4000 }, "isci": 5000, "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10, "mulkKipi": true },
{ "id": "cam_firini", "ad": "Cam Fırını", "girdiler": { "silis": 60000, "yakit": 16000, "elektrik": 18000 }, "ciktilar": { "cam": 50000 }, "isci": 5000, "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 60, "mulkKipi": true },
{ "id": "celik_dograma", "ad": "Çelik Doğrama", "girdiler": { "celik": 24000, "cam": 32000, "parca": 5000, "elektrik": 15000 }, "ciktilar": { "pencere": 28000 }, "isci": 7000, "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 20, "mulkKipi": true }
```

Tesis türü `yontemler[]` sonları: `gida_fabrikasi += [degirmen, ekmek_firini]`, `ahir += [kepek_gubresi, sut_kepekli]`, `parca_fabrikasi += [celik_dograma, cam_firini]` (A3 seçimi). Dikeyden sapan satırlar (cam, doğrama; üst bant) §1.4'te işaretlidir; rapor (dikey) değerleri alternatif olarak geçerlidir (cam `yakit 18000, elektrik 20000`; doğrama `parca 6000 → pencere 27000`).

**V15 istisnası: `cam_firini` ve `celik_dograma` (G8 değerleri, baş lider ve Kod lideri kararı).** Bu bölümdeki JSON G4 teslim değerleridir (`celik_dograma` 28 pencere, `cam_firini` 16 yakıt). Baş lider kararıyla (zincir kârlılık, `alfa0-zincir-karlilik.md`) yürürlükteki G8 değerleri **`celik_dograma` 28 → 30 pencere/sa** ve **`cam_firini` yakıt 16 → 12** (32/50 cam, çelik, parça, elektrik değişmez). Bu değerlerde değer oranı (çıktı değeri / girdi değeri, taban fiyat) V15 bandı [1,16; 1,48]'in dışına çıkar:

| Yöntem | Eski oran | Yeni oran (taban fiyat) | Yeni oran (şebeke fiyatı) | **V15 üst sınırı (yöntem başına)** |
|---|---|---|---|---|
| `cam_firini` | 1,448 | **1,649** (4.750 / 2.880 ₺) | 1,622 | **1,70** |
| `celik_dograma` | 1,446 | **1,549** (10.800 / 6.970 ₺) | 1,548 | **1,60** |

**Gerekçe (kendi rakamlarımla).** Oran taban fiyatla ve şebekesiz hesaplanır; iki şeyi görmez: (1) **Şebeke payı.** Elektrik ve yakıt tabanın 1,035 katıdır (10,35 ₺ ve 103,5 ₺) ve pencere zincirinde şebeke ödemesi 1.584 ₺/sa'tir (elektrik 33, yakıt 12 birim/sa; ödemenin %12'si ilçe kasasına, kalanı lavaboya yanar); şebeke fiyatıyla oran 1,622 / 1,548'e iner ve zincir net'i bunu zaten çıkarır. (2) **Pazar makası ve doyumu.** Uzman kademe (girdi NPC'den ×1,111, satış ×0,891) satış/girdi oranı denge fiyatında cam fırını **1,368**, doğrama **1,244**'tür; NPC doyma fiyatında (×0,625) **0,855 ve 0,778**, yani zarar. Eski değerlerde bu oranlar 1,206 / 1,162 (denge) ve 0,754 / 0,726 (doyma) idi: pencere zinciri değerleri düşük olduğu için yapı + malzeme ithalatına bağlı kalıyordu. Zincir düzeyinde eski net 2.335 ₺/sa, geri ödeme **37,9 sa** (ekmek 11,1, süt 12,6); yeni net 3.390 ₺/sa, geri ödeme **26,1 sa**: oran bandı dışına çıkmak pencere zincirini baskın yapmaz (ekmeğin 2,3 katı geri ödeme sürer). Yani bant bu iki yöntemde kârlılığı değil, ölçülmeyen şebeke ve pazar maliyetlerini yanlış temsil ediyordu.

**Biçim ve emsal olmama.** İstisna **yöntem başına üst sınırdır** (`cam_firini` 1,70, `celik_dograma` 1,60); **bant genişlemez**, diğer tüm yöntemlerde [1,16; 1,48] aynen geçerlidir (bkz. §1.4 tablosu; `degirmen` 1,445, `ekmek_firini` 1,385, `kepek_gubresi` 1,362, `sut_kepekli` 1,460). V15 doğrulayıcısı bu iki kimlik için ayrı üst sınır haritası okur, geri kalanı uyarı olarak aynı bandı denetler. **Bu istisna başka yöntemler için emsal değildir:** "şebeke payı ve pazar doyumu taban oranda görünmüyor" gerekçesiyle bandı aşan yeni bir yöntem (örneğin süt ve fındık tarifleri) kendi rakamlı gerekçesi ve onayıyla gelmelidir; bu iki sınır başka bir kimliğe taşınmaz ve G8 değerleri (30 / 12) değişirse yeniden sınanır. Geri dönüşü zor: yöntem kimliği ve çıktı miktarı yayımlandığında O2 ölçüm temel çizgileri ve bot ön ayarları bu değerlere bağlanır (`alfa0-zincir-karlilik.md` Z-1).

`mulk.ekYapilar.dukkan`: `{ ad, yuva: 1, insaSaati: 4, insaParasi: 6000000 (P-İthal) | 7440000 (P-Yok), insaMaliyeti: { celik: 20000, parca: 8000, pencere: 4000 (P-İthal) }, enFazlaIlBasina: 6, enFazlaIlcedeBasina: 2 }`; `mulk.olcekHucre.dukkan = [1, 2, 3]`.

**Şema A3 şartnamesindedir; A2'nin verdiği değerler** (alan adları yalnız öneridir; A3 hangi blok ve anahtar adını seçerse o geçerlidir):

| Konu | A2 değeri |
|---|---|
| Şebeke kapsamı | elektrik + yakıt |
| Şebeke fiyat tavanı oranı | `1.000.000` ppm (kamu fiyat tavanı kuralının kendisi: referans × `kamuIthalatCarpaniPpm` = 1,035; ek çarpan yok) |
| Kasa payı (`kasaPayiPpm`) | `120.000` ppm (şebeke bedelinin %12'si ilçe kamu kasasına, kalanı lavabo `sebeke`; tamsayı kuralı: kasa = ⌊ödeme × pay / 1.000.000⌋, lavabo = kalan) |
| Kamu siparişi v0 | fiyat referans × `1.030.000` ppm; boyutlar (mili-birim) ekmek 100.000, gida 50.000, pencere 10.000, celik 30.000, parca 20.000; ilçede haftada en çok 5 sipariş; vade 3 gün |
| Yedek düğme (G2) | `standart_gida_isleme` çıktı çarpanı `1.000.000` (kapalı); yedek `750.000` |

`mulk.perakende` taslağı (blok adı `perakende`/`yerelPazar` ve anahtarlar öneridir; A3'ün seçtiği ad geçerlidir, A2'nin işi değerlerdir):

```
giderMiliSaat: [132000, 204000, 330000]       kasaMiliSaat: [90000, 198000, 324000]       rafYuvasi: [4, 6, 8]
cesitKatsayiPpm: 250000        esnafFiyatPpm: 1120000        esnafTabaniPpm: 250000       yerelOlcek: 50
fiyatKademeleriPpm: [850000, 950000, 1050000, 1150000]     varsayilanKademe: 2           kampanyaKademesi: 0   // günde ≤ 6 sa, haftada ≤ 2 gün
fiyatBandiPpm: [700000, 1400000]
ilceSinifiNufus: { kirsal: 10000, kasaba: 40000, sehir: 120000 }
talep1000Saat: { gida: 90, ekmek: 60, un: 10, sut: 20, sut_urunu: 20, sekerleme: 6, findik_urunu: 3, yakit: 15, pencere: 8, cam: 4, celik: 6, parca: 5, cimento: 6 }
takvimPpm: { gida: [...12], tatli: [...12], yakit: [...12], yapi: [...12] }   // §1.9, her satır toplamı 12.000.000
bayram: { tatli: { oncesiGun: 7, oncesiPpm: 1800000, sonrasiGun: 28, sonrasiPpm: 800000 }, gida: { oncesiGun: 5, oncesiPpm: 1250000, sonrasiGun: 10, sonrasiPpm: 875000 } }
```

Para defteri: `musluk.yerelNpc`, `lavabo.sebeke`. Doğrulayıcılar: takvim satır toplamı = 12.000.000, `Ws` formülü, `fiyatKademeleriPpm` bant içinde ve artan, yöntem oranı bandı (uyarı), her yöntem ya `mulkKipi` ya bölge listesinde, `kasaPayiPpm ≤ 1.000.000`, `kamuSiparisi.malFiyatPpm ≤ kamuIthalatCarpaniPpm`.

### 1.14 T3 taslağı §7.2 yan yana tablosuyla karşılaştırma (sapmalar)

T3'ün `p4-p5-icerik-taslagi.md` §7.2 tablosu A2'nin **ön** önerisini yansıtır. Satır satır kontrol (A2'nin bu belgedeki son değerleriyle):

| Konu | T3 §7.2 yazıyor | A2 son değer | Sapma / not |
|---|---|---|---|
| `degirmen`, `kepek_gubresi` | A2 ön önerisi | aynı (165/33; 100 kepek → 18 gübre) | yok |
| **`ekmek_firini`** | A2 ön önerisi: 165 un + 20 yakıt + 15 elektrik → **250** | → **240** ekmek (zincir +%33,6 → +%21,2; K/U ilkesi) | **sapma** (A2'nin kendi ön önerisi güncellendi; §1.3-B2) |
| `sut_kepekli` | rapor = A2 | aynı | yok |
| **`cam_firini`** | "rapor = A2": 60 silis + **18 yakıt + 20 elektrik** → 50 | 60 silis + **16 yakıt + 18 elektrik** → 50 | **sapma** (üst bant; dikeyden sapma işaretli, §1.4) |
| **`celik_dograma`** | "rapor = A2": 24 çelik + 32 cam + **6 parça** + 15 elektrik → **27** | 24 çelik + 32 cam + **5 parça** + 15 elektrik → **28** | **sapma** (üst bant; §1.4) |
| `talep1000Saat` | gıda **120**; un, süt, fındık ürünü, yakıt, çelik, parça, cam yok | gıda **90**; ekmek 60, un 10, süt 20, süt ürünü 20 (sepet 200 sabit); yedi malın değeri §1.9 | **sapma** (gıda 120 → 90 çünkü sepet 200 sabit; yedi mal eklendi) |
| Dükkân S bedeli, gider, kasa, raf | P-İthal (ana); 132/204/330; 90/198/324; 4/6/8 | aynı sayılar; P-Yok seçeneği 7.440 ₺ (sayıca öneri P-Yok) | tercih farkı: T3 P-İthal ana, A2 sayıca P-Yok; karar A3 |
| Enerji | "yakıt mülk kipinde yalnız ithalatla gelir"; santral yatırımı ilk gün (T3 §3.3: P4 + santral 90.080 ₺, nakit en düşük ≈ 30,6 bin ₺) | **şebeke** (baş lider kararı); santral isteğe bağlı; santralli varyantta en düşük nakit 30.781 ₺ (t = 3 sa), santralsiz 41.710 ₺ (t = 2 sa) | **sapma** (karardan kaynaklı); T3 notları güncellenmeli |
| Kamu tavanı | uygulanan 1,035 R; GDD ≤ 1,10 R üst sınır | aynı (kod atfı §1.9) | yok |
| Çıkmaz mal | K türü planlı; `findik` P1'de tamam | aynı; K v0 listesi `ekmek, gida, pencere, celik, parca` | yok |
| `yerelOlcek`, fiyat bandı, esnaf tabanı | 50; [0,7; 1,4]; %25; 1,12 R | aynı | yok |
| Tesis tabanı | zincir tek tesisten üstün (K/U ilkesi) | zincir yalnız tahıl tabanında üstün; tesis/işçi/hücre tabanında geride (§1.3-B2) | **not eklenmeli** (T3 §3.2 madde 2 yalnız tahıl tabanını söylüyor) |

## 2. Bakım ve aşınma kalibrasyonu önerisi (O2 iki tur ölçümüyle sınandı: C doğrulandı; sanayici için parça miktarı önerisi eklendi)

> **Durum.** O2'nin ham ölçümü geldi (`takim/o2/olcum-temel` 0ab6957, `docs/olcum/bakim-asinma-temel.md`): gec60 (tohum 1–10) ve kisa (tohum 1–3), yönetim kapalı/açık. Bu bölüm o veriyle yeniden yazıldı. **İki sonuç önceki taslağı değiştirdi:** (i) Y7'nin ×2,2…×2,79 sıçraması **zincir bileşik etkisidir** (aşınma çarpanı tesis zincirinde üslenir); ödeme gücü sarmalı (H2) gerekmez. (ii) Hedef aralıklar tek tesis yerine **zincir düzeyinde** tanımlanmalı; önceki öneri (A: 11.000 ppm/gün, %30) zincirde fazla sert kalıyor, yeni öneri **C: 10.000 ppm/gün, %25**. Öneri parametreleri kâğıt modeldir: R3/R4 koşusuyla doğrulanana kadar **(doğrulanmadı)**.

### 2.1 Mekanizma (koddan; dosya:satır)

- **Düzey ve günlük aşınma.** `bakim_duzeyi {duzey 0|1|2}` oyuncu düzeyindedir, varsayılan 1 (`sanayi/komut.ts:50-56`). `sanayiGunluk` her sim-günü başında (`ekonomi/index.ts:27`) sahipli bölgenin aktif tesislerine `düzey.asinmaPpmGun` ekler: asgari +20.000, normal 0, yüksek −15.000 ppm/gün (`parametreler.json:159-170`; `sanayi/gunluk.ts:34-55`). **Kıtlık yedeği:** bakım girdisi karşılanma oranı `bakimKarsilanmaPpm < kitlikEsigiPpm (950.000)` ise günlük aşınma en az `kitlikAsinmaPpmGun (20.000) × (1 − karşılanma)` olur (`sanayi/gunluk.ts:44-52`). Parça stoğu bitince karşılanma 0 ⇒ +%2/gün; yani **asgari düzey, "parça hiç yok" ile aynı hızda aşındırır**.
- **Bakım talebi.** Her tesis, yöntemin `bakim` girdisini (parça, mili/sa; ölçek ×2/×3,2, düzey ×0,5/1/1,5) aktif olsun olmasın tüketir (`ekonomi/uretim.ts:333-335`); karşılanma `bakimKarsilanmaPpm`'e yazılır (`:596-612`). Stok yoksa ithalat emri gerekir (bot: `botlar/src/parsel.ts:622-660`, eşik: stok 24 sa altında).
- **Ceza.** `cezaCarpani = max(uretimTabani, 1 − aşınma × asinmaVerimKaybiTavani/1e6)`; tavan 400.000 ⇒ çıktı en çok ×0,6 (`sanayi/carpan.ts:21-27`). **Çıktıya uygulanır**: `ciktiCarpaniHesapla` (`ekonomi/uretim.ts:204-222`, ceza `:212`) → `ciktiGercek = ciktiOlcekle(q, v, carpan)` (`:446`); **girdi ve bakım `verim` ile ölçeklenir, çarpana bakmaz**. Santralde elektrik kapasitesini de aşınma kısar (`:319`).
- **Onarım.** `genel_onarim`: aşınmış tesislerin inşa bedelinin %20'si (ölçek dahil) + 6 sa duruş, aşınma sıfırlanır (`sanayi/komut.ts:113-149`; parametre `genelOnarimMaliyetPpm 200.000`, `genelOnarimDurusSaat 6`).
- **Gider.** İşletme gideri ölçek × düzey çarpanıyla değişir (`lojistik/cozum.ts:162-176`).

Bu bloklar **mülk ve bölge kipinde ortaktır** (`parametreler.sanayi.bakim`). Bölge kipi altınları aşınma/bakım parametrelerine bağlıdır: değer değişirse altın özet değişir. Bu yüzden önerinin tamamı **mülk kipine özel yeni bir `parametreler.mulk.bakim` bloğu** olarak yazılır ve yalnız `d.mulk` varken okunur; bölge kipi değişmez.

**O2 doğrulaması (gec60, yönetimsiz).** Kıtlık aşınması +%2/gün ölçüldü: aşınma %50'ye 26. günde, %100'e 51. günde varıyor (üç arketipte aynı); bakım karşılanma medyanı her gün %0. Mülk kipi botları `bakim_duzeyi` komutu vermiyor (oyuncu `bakimDuzeyi = 1` ile açılır); başlangıç kitindeki 40 parça yapı inşaatında harcanıyor, 2. günün sonunda stok 0 (O2 §7).

### 2.2 Y7 iyimserliğinin kaynağı (O2 ölçümüyle)

O2 ham sayıları (gec60, tohum 1–10; Y7 payı her koşuda %100):

| Ölçü | temel (yönetimsiz) | bakım AÇIK | Oran |
|---|---|---|---|
| Geç çiftçi / emsal | %385 | %163 | - |
| Geç sanayici / emsal | %218 | %358 | - |
| Geç pazar / emsal | %171 | %60 | - |
| Yerleşik çiftçi, 7 günlük net ₺ | 296.727 | 829.041 | **×2,79** |
| Yerleşik çiftçi, brüt çıktı ₺ | 325.833 | 857.561 | ×2,63 |
| Yerleşik sanayici, 7 günlük net ₺ | 403.974 | 267.344 | **×0,66** |
| Yerleşik tüccar, 7 günlük net ₺ | 129.359 | 395.139 | ×3,05 |
| Ahır `verimPpm` (çiftçi), 74. gün | %59,5 | %99,2 | 0,60 |

**Mekanizma (zincir bileşik etkisi).** Aşınma cezası çıktıyı `1 − aşınma × tavan` ile çarpar. Çiftçinin zinciri Tarla (çiftlik) → ahırdır: çiftliğin tahıl çıktısı çarpanla kısılır, ahır o tahılla beslendiği için `verimPpm` de çarpana iner (O2: 59,5/99,2 = 0,60 = çıktı çarpanı) ve ahırın kendi çıktısı bir kez daha çarpanla kısılır: ahır çıktısı çarpan² = 0,36, yani 1/0,36 = **×2,78**; ölçülen net ×2,79, brüt ×2,63 (çiftliğin doğrudan satılan tahılı yalnız ×1,67). Tek tesis çarpanı yalnız ×1,667 (1/0,6) verirdi; önceki taslaktaki "×2,2 − ×1,67 = açıklanamayan fark" bu yüzden **zincir derinliğidir**. Üç aşamalı ekmek zinciri (Tarla → değirmen → fırın) bugünkü parametrelerle tavanda ×4,63'e (çıktı kaybı %78) varır (§2.4 tablosu). Ödeme gücü sarmalı (H2) ölçümde gerekmedi; kaldırıldı.

**Ters yön: sanayici.** Bakım açık sanayicide brüt çıktı 424.063 → 596.600 ₺ artarken parça ithalatı 291.839 ₺/7 gün eklenir; net 403.974 → 267.344. Bakımın karşılığını verme koşulu (tavanda): `çıktı/parça maliyeti ≥ (1 − T)/T` (T = tavan). Sanayici oranı 424.063/291.839 = 1,45; eşik bugün 1,50 (T %40): **bakım sanayici arketipinde bugün bile başabaş altında**; T %30'da eşik 2,33, %25'te 3,00 (betik §10.2c). Yani tavanı düşürmek zincirli çiftçiyi rahatlatır, ama maden ve santral gibi çıktı değeri parça girdisine göre düşük tesislerde bakımı net negatif yapar. Bu tesisler için çözüm tavan değil bakım parçası miktarıdır (açık soru, §4).

**Y7 ölçüsünün sınırı.** Y7 geliri satış − girdi − işletme − vergi akışıdır; parça gideri yalnız ithalat anında düşer. O2'de bakım açık çiftçi ve tüccarda son 7 günde parça ithalatı **0**, ama katılımdan 74 güne toplam 918.473 / 515.545 ₺: ithalat stoklu ve kümelidir; 7 günlük penceredeki yönetimli net bu yüzden bakım giderini görmez (bakım parçası tüketimi çiftçide ≈ 1,5 parça/sa × 200 ₺ × 168 ≈ 50.400 ₺ = netin %6'sı). **(doğrulanmadı):** ithalat zamanlaması ölçülmedi; Y7 yönetimli temelinde parça tüketimi tüketim anında yazılmalıdır.

**Sonuç.** Y7 "geç katılan emsalini geçer" sonucunun büyük kısmı yerleşik botların bakım yapmamasından ve zincir derinliğinin aşınmayı üslemesinden gelir; mekanik yönetimsiz yerleşiği gerçek bir oyuncuya göre abartılı cezalandırır. İki yönlü etki: (i) Y7 emsal medyanı yapay olarak düşük kalır, geç katılan oranı şişer (%385); (ii) ayarla-unut oyuncusunun zinciri 40. günde çıktısının %60–80'ini kaybeder.

### 2.3 Hedef aralıklar (zincir düzeyi)

| # | Hedef | Aralık |
|---|---|---|
| H-B1 | Yönetimsiz (parça hiç yok) zincir çıktı kaybı; k = tesis zinciri uzunluğu (Tarla → ahır k = 2; ekmek zinciri k = 3); yokluk bantları K5 14–45 gün uyku, K6 45–90 gün çürüme (GDD §3C.1a) | k = 3: gün 14 ≤ %10, gün 45 ≤ %30, tavan ≤ %60; k = 1: gün 14 ≤ %4, gün 45 ≤ %12 |
| H-B2 | Tek aşamalı yöntemlerde KD ≥ 0 (T ≤ 1 − 1/oran); bugün değirmen, fırın, doğrama 35.–40. günde negatif | T ≤ %25 (yeni yöntemlerin sınırı %27–31; mevcut `standart_parca` %18 tavanda negatif kalır) |
| H-B3 | Bakımın net getirisi (60 gün ort., parça ithal fiyatıyla): kayıp/maliyet; sanayici arketipi için başabaş eşiği | tek aşama ≥ 1,5; sanayici: oran ≥ (1 − T)/T tutmuyorsa parça miktarı ayrı ele alınır (§4) |
| H-B4 | Bakımlı/bakımsız gelir oranı (Y7 penceresi, gün 70; bugün k = 2 için 2,78) | k = 2: 1,3–1,6; k = 3 ≤ 2,0; k = 1 ≤ 1,3 |
| H-B5 | Yeni oyuncu ilk 14 gün | zincir çıktı kaybı ≤ %10 |
| H-B6 | Y7 oyuncu payı | bakım yönetimli ve yönetimsiz her iki temelde GEÇTİ; eşik tamponu ≥ 1,2× (geç çiftçi/emsal tahmini %385 → ≈ %240; geç pazar %171 → ≈ %107) |

### 2.4 Parametre önerisi (mülk kipine özel; doğrulanmadı)

`parametreler.mulk.bakim` (yeni blok; yalnız `d.mulk` varken okunur; bölge altınına dokunmaz):

| Parametre | Bugün (`sanayi.bakim`) | Öneri (mülk) | Gerekçe |
|---|---|---|---|
| `asinmaHizCarpaniPpm` (düzey `asinmaPpmGun` ve `kitlikAsinmaPpmGun`'a çarpan) | 1.000.000 (yok) | **500.000** | Kıtlık aşınması 20.000 → 10.000 ppm/gün (%1/gün): zincirde gün 14 %10, gün 45 %30 (H-B1); tavana 100 günde ulaşır. Düzeyler: asgari +10.000, normal 0, yüksek −7.500 |
| `asinmaVerimKaybiTavaniPpm` | 400.000 | **250.000** | Tek aşama tavan kaybı %25 (bakımlı/bakımsız 1,33), k = 2 için 1,78, k = 3 için 2,37; yeni yöntemlerde KD ≥ 0 |
| `genelOnarimMaliyetPpm`, `genelOnarimDurusSaat` | 200.000; 6 | aynı | Onarım yolu hiç koşulmadı (O2): maliyet etkinliği ölçülmeli (R8) |
| Yeni oyuncu muafiyeti | yok | **gerekmez** | C ile gün 14 zincir kaybı %10,1 (k = 3), %6,9 (k = 2), %3,5 (k = 1): H-B5 sınırında |

**Zincir derinliğine göre yönetimsiz yörünge (çıktı kaybı) ve bakımlı/bakımsız oranı** (betik §10.2b; sütun "gün 70" Y7 penceresi):

| Parametre | k | gün 14 | gün 45 | gün 70 | tavan | oran gün 70 | oran 60 g ort. | oran tavan |
|---|---|---|---|---|---|---|---|---|
| mevcut (20.000; %40) | 1 | %11,2 | %36,0 | %40,0 | %40,0 | 1,67 | 1,30 | 1,67 |
| mevcut (20.000; %40) | 2 | %21,1 | %59,0 | %64,0 | %64,0 | **2,78** | 1,65 | 2,78 |
| mevcut (20.000; %40) | 3 | %30,0 | %73,8 | %78,4 | %78,4 | 4,63 | 2,04 | 4,63 |
| A (11.000; %30) | 2 | %9,0 | %27,5 | %40,9 | %51,0 | 1,69 | 1,23 | 2,04 |
| A (11.000; %30) | 3 | %13,2 | %38,3 | %54,5 | %65,7 | 2,20 | 1,35 | 2,92 |
| **C (10.000; %25), öneri** | 1 | %3,5 | %11,3 | %17,5 | %25,0 | 1,21 | 1,08 | 1,33 |
| **C (10.000; %25), öneri** | 2 | %6,9 | %21,2 | %31,9 | %43,8 | **1,47** | 1,17 | 1,78 |
| **C (10.000; %25), öneri** | 3 | %10,1 | %30,1 | %43,8 | %57,8 | 1,78 | 1,26 | 2,37 |
| E (8.000; %25), daha yumuşak | 2 | %5,5 | %17,2 | %26,0 | %43,8 | 1,35 | 1,13 | 1,78 |
| E (8.000; %25), daha yumuşak | 3 | %8,2 | %24,6 | %36,4 | %57,8 | 1,57 | 1,20 | 2,37 |

C, H-B1 (k = 3: %10 / %30 / %58), H-B4 (k = 2 için 1,47) ve H-B5'i karşılar; A bileşik etki yüzünden k = 3'te gün 45'te %38 ile hedefi aşar. E bir hedefi daha rahat tutar (k = 3 gün 45 %24,6) ama bakımın değerini azaltır (k = 1 oranı 1,16). **Yedek düğme:** O2 R3 koşusunda ekmek zinciri gün 45 kaybı %30'u aşarsa C'den E'ye inilir.

**Tek aşamalı yöntemlerde bakımın net getirisi (60 gün ortalaması; ₺/sa; parça fiyatı ithal; bileşik etki hariç, yani alt sınır):**

| Yöntem | Bakım parçası ₺/sa | KD ≥ 0 en yüksek tavan | Bugün (çıktıya) | **C (çıktıya)** | E |
|---|---|---|---|---|---|
| geleneksel_tarim | 100 | yok | 1.300 | 350 | 260 |
| standart_gida_isleme | 160 | %46 | 2.453 | 680 | 512 |
| ahir_besi | 100 | %45 | 1.435 | 394 | 295 |
| yuksek_firin | 300 | %27 | 1.380 | 240 | 132 |
| standart_parca | 200 | %18 | 1.480 | 340 | 232 |
| degirmen | 160 | %31 | 1.904 | 503 | 371 |
| ekmek_firini | 160 | %28 | 3.200 | 920 | 704 |
| cam_firini | 200 | %31 | 908 | 156 | 85 |
| celik_dograma | 200 | %31 | 2.152 | 556 | 405 |
| kepek_gubresi | 100 | %27 | 488 | 89 | 51 |

C altında hepsi pozitif (kayıp/maliyet ≥ 1,8: cam fırını 356/200, kepek gübresi 189/100); zincirli kullanımda bileşik etki bu getiriyi katlar. Alternatif "aşınmayı verime uygula (girdi de kısılır)" önerilmez: KD negatife inmez ama ince marjlı yöntemlerde bakım net negatif olur (betik §10.1b); çıktıya uygulama korunur.

**Beklenen Y7 etkisi (kâğıt tahmin; R3/R4 ile doğrulanacak).** Yönetimsiz çiftçi (k = 2, gün 70) çıktı çarpanı 0,36 → 0,68; yerleşik emsal geliri ×1,89 (191.425 → ≈ 362.000 ₺); geç çiftçi (gün 14, k = 2) 0,79 → 0,93 (×1,18); geç çiftçi/emsal %385 → ≈ %240; yönetimli bakım koşusu aynı kalır (%163); fark ×2,36 → ×1,5. Geç pazar/emsal %171 → ≈ %107 (bakım koşusu %60). Y7 payı hâlâ %100 olmalı.

**Diğer öneriler.** (1) **Başlangıç kiti parçası:** O2 doğruladı: 40 parça inşaatta harcanıyor, 2. günün sonunda stok 0 (çiftçi 0,08 parça 1. gün sonu); dört P4 yapısı indirimli bile ≈ 40,6 parça ister. Kit 40 → 60 parça (taban değer +3.600 ₺) ve gün-1 bakım kartı (Esnaf Defteri) önerilir. (2) **Bakım otomatiği (özellik, kod):** `bakim_duzeyi` komutuna `otomatikParca: bayrak` (para taşımaz); açıkken bakım parçası açığı NPC'den otomatik ithal edilir ve bir emir yuvası harcamaz; mülk botları şu an `bakim_duzeyi` vermiyor (O2 §7), Y7 temelini "yönetimli" yapar. K3 işidir, yalnız öneridir. (3) **Ölçüt kaydı (geri dönüşü zor):** Y7 emsali "yönetimli yerleşik" olarak da raporlanmalı; yönetimsiz ve yönetimli iki temel paralel sürmeli. (4) **Y7 parça gideri:** yönetimli temelde parça tüketimi tüketim anında yazılmalı (ithalat zamanından bağımsız).

### 2.5 Mülk kipi mi, bölge kipi altınları mı

| Öneri | Etki alanı |
|---|---|
| `mulk.bakim.*` (yeni blok) | **Yalnız mülk kipi.** `sanayi.bakim` (bölge) aynı kalır; bölge kipi altınları değişmez. |
| Yeni yöntemler (`mulkKipi: true`) | Yalnız mülk kipi. Bölge kipinde tesis listesine girmez. |
| `mulk.perakende.*`, `yerelNpc`, dükkân | Yalnız mülk kipi. |
| `bakim_duzeyi.otomatikParca` | Komut alanı eklemesi; protokolde yalnız ekleme, bölge kipinde yok sayılır. |

### 2.6 O2 koşu listesi: sonuçlar ve sıradaki koşular

| # | Koşu | Durum | Sonuç / beklenen yön |
|---|---|---|---|
| R1 | Aşınma yörüngesi ve gelir ayrışması (gec60 temel/bakım) | **Geldi** | %50 gün 26, %100 gün 51; ×2,79 net / ×2,63 brüt; ahır verimi 59,5 ↔ 99,2: zincir bileşik etkisi (§2.2) |
| R2 | Parça piyasası | **Geldi** | talep olan gün payı %30,8; en yüksek günlük istenen NPC arzının %37'si; fiyat/taban medyan %113, en çok %134: sorun parça kıtlığı değil yönetimsizliktir |
| R3 | **C parametreleri, yönetim kapalı** | **Geldi** (bakim-c, 77efe55) | Ahır verimi %80,9, yerleşik çiftçi emsal 331.302 ₺, geç çiftçi/emsal %235,9, geç pazar %96,9; Y7 %100 (§2.7) |
| R4 | C, yönetim açık | **Geldi** | Bakımlı çiftçi 601.601 ₺ (aşınma 0); bakımlı/bakımsız çiftçi 1,455, tüccar 1,504 (model 1,47); geç çiftçi %157,1 |
| R5 | Kısa vade (24 gün) | **Geldi** | geç çiftçi/emsal %189 → %158 (bakım), geç sanayici %118 → %108, geç pazar %84 → %66: temel ↔ bakım farkı ≈ %20 (beklenen ≤ %10'un üstünde; çiftçi zinciri k = 2, bugün gün 14 kaybı %21) |
| R6 | Duyarlılık (kıtlık × tavan; 32 koşu, tohum 1–3) | **Geldi** | Sanayici bakımlı/bakımsız 0,50–0,68 hiçbir hücrede ≥ 1; çiftçi/tüccar oranı aşınmayla monoton (§2.7) |
| R7 | Mülk kipi bot davranışı | **Geldi** | botlar `bakim_duzeyi` vermiyor; kit 40 parça 2. günde bitiyor |
| R8 | Genel onarım maliyet etkinliği (parça ithalatı yok + onarım açık) | **Geldi** (yalnız onarım yönetimi) | Onarım bakımın %89–146'sı kadar kazandırır, maliyeti ≈ 1/40 (§2.7); **ek koşu gerekmez** |
| R9 | Sanayici tesis türü başına parça ve çıktı | **Geldi** | Tam kapasiteli R 8–67, ama gerçek (pazar sınırlı) çıktı/parça 1,45: bakım başabaş altı (§2.7) |
| R10 | Y7 parça gideri zamanlaması | **Geldi** | Ortalama haftalık ithalat Y7 netinin çiftçide %10,5, tüccarda %11,2, sanayicide %87,7; ithalat 7–10 günde bir kümelenmiş (§2.7) |

### 2.7 O2 ikinci tur (bakim-c, 77efe55): C sınaması, onarım ve sanayici

**C (kıtlık 10.000 ppm/gün, tavan %25) ölçümle doğrulandı.**

| Ölçü | A2 tahmini (§2.4) | O2 ölçümü | Not |
|---|---|---|---|
| Ahır `verimPpm`, 74. gün (bakımsız) | "≈ %68" | %80,9 (p10–p90 %43,1–%100) | **Tahmin eşlemesi hatalıydı:** `verimPpm` girdi karşılanmasıdır = çiftlik çıktı çarpanı c = 1 − 0,737 × 0,25 ≈ 0,816 (ölçülen 0,809 ile tutarlı); %68 ahırın **çıktı** çarpanıydı (c² ≈ 0,66). Model doğru, sütun etiketim yanlış |
| Yerleşik çiftçi emsal geliri (7 g) | ≈ 362 bin ₺ | 331.302 ₺ | −%8,5 |
| Geç çiftçi / emsal | ≈ %240 | %235,9 | −%1,7 |
| Geç pazar / emsal | ≈ %107 | %96,9 | −%9 (eşik %50: tampon 1,9×) |
| Bakımlı / bakımsız, yerleşik çiftçi (gün 70) | 1,47 (k = 2) | 601.601 / 413.371 = **1,455** | H-B4 aralığı 1,3–1,6 içinde |
| Bakımlı / bakımsız, yerleşik tüccar | ≈ 1,5 | 395.129 / 262.691 = **1,504** | içinde |
| Bakımlı / bakımsız, yerleşik sanayici | < 1 (öngörülmüştü) | 267.186 / 502.984 = **0,531** | **net negatif** |
| Y7 oyuncu payı | %100 | %100 (tüm O2 koşularında) | GEÇTİ |

Bugünkü parametreler (20.000; %40) için aynı düzenin ölçümü: bakımlı/bakımsız çiftçi %291, tüccar %305 (k = 2 modeli: 2,78): **bileşik etki mekanizması bu veriyle de doğrulandı**.

**R6 ızgarası (bakımlı/bakımsız, yerleşik 7 günlük gelir; sanayici sütunu bakım için negatif):**

| Kıtlık / tavan | Çiftçi | Tüccar | Sanayici | Geç çiftçi/emsal (bakımsız) | Geç pazar/emsal (bakımsız) |
|---|---|---|---|---|---|
| 8.000 / 250.000 (E) | 1,337 | 1,376 | 0,515 | %229 | %89 |
| **10.000 / 250.000 (C)** | **1,455** | **1,504** | **0,531** | **%247** | **%96** |
| 10.000 / 300.000 | 1,594 | 1,652 | 0,549 | %267 | %105 |
| 15.000 / 250.000 | 1,771 | 1,851 | 0,569 | %293 | %115 |
| 20.000 / 400.000 (bugün) | 2,913 | 3,055 | 0,661 | %433 | %171 |

C, H-B4 aralığında (çiftçi 1,3–1,6) ve en büyük aşınma/tavan çiftinde değil; E hedefin alt ucunda (1,34); `10.000 / 300.000` üst uçta (1,59–1,65). **Karar: C kalır.** Bakımsız yerleşik çiftçi geliri bugünkü parametrelere göre iki katına çıkar (206.544 → 413.371 ₺), tüccar 129.349 → 262.691 ₺; Y7 payı hiçbir hücrede %100'ün altına inmez.

**R10 düzeltmesi (Y7 ölçüsünün sınırı kesinleşti).** Bakım açık koşuda parça ithalatı 7–10 günde bir ve kümelidir (çiftçi 8 ithalat günü: ilk gün 1, son gün 66; haftalık ortalama ithalatın Y7 netine oranı çiftçide %10,5, tüccarda %11,2, sanayicide %87,7). Son 7 günlük pencerede (gün 67–74) çiftçi ve tüccar için ithalat 0'dır; yani yönetimli net **%10–11 fazla görünür**. Düzeltilmiş oranlar (C): çiftçi 601.601 × (1 − 0,105) / 413.371 = **1,30**; tüccar 395.129 × (1 − 0,112) / 262.691 = **1,34**: H-B4 aralığının alt ucunda, yine "anlamlı biçimde iyi" (≈ +%30–34). Y7 yönetimli temelinde parça gideri tüketim anında yazılmalıdır (öneri 2.4-(4) geçerli).

**R8: genel onarım bakımın ucuz ve güçlü bir ikamesi** (bugünkü parametreler; 3 tohum, katılımdan 74. güne):

| Yönetim | Çiftçi son 7 gün net | Sanayici | Tüccar | Parça/onarım gideri (çiftçi, toplam) | Ortalama aşınma |
|---|---|---|---|---|---|
| hiçbiri | 206.544 ₺ | 403.973 ₺ | 129.349 ₺ | 0 | %65,6 |
| yalnız genel onarım (3 onarım, 54 tesis-saat duruş) | **545.134 ₺** | **578.410 ₺** | **350.173 ₺** | 12.000 ₺ para + 10.980 ₺ malzeme (+ 25.835 ₺ parça) | %18,8 |
| tam bakım (parça ithalatı) | 601.601 ₺ | 267.186 ₺ | 395.129 ₺ | **918.473 ₺** | %0 |

Yalnız onarım, bakımın çiftçide %91'ini, tüccarda %89'unu verir ve sanayicide ondan **2,2 kat** iyidir; maliyeti bakım parçası giderinin ≈ %2,5'i (ithal onarım malzemesi dahil %5). Yani "bakım yapmamak felaket olmasın" ölçüde sağlanıyor: onarım yapan oyuncu bakım yapmayana göre +%164 (çiftçi) / +%171 (tüccar), bakım yapan onarımcıya göre yalnız +%10–13. **O2'nin sorusu ("parça ithalatı kapalı + onarım açık" koşusu) R8'in "yalnız onarım" kolunun kendisidir: ek koşu gerekmez.** C parametreleriyle onarım eşiği (%40, `parsel.ts:613`) 40. güne uzar (kıtlık %1/gün) ve onarım daha da seyrekleşir; yön aynı, 3 tohum × 7 gün bu aralığı göremez, kâğıt hesapla yeterlidir.

**Sanayici: bakımın net negatife düşmesi kabul edilemez; çözüm parça miktarında.** R9: tam kapasite varsayımıyla R (katma değer / parça maliyeti) maden 19,2, hidro 8,3 (eşik (1 − T)/T = 1,5), ama ölçülen sanayici çıktısı **pazar sınırlıdır** (tam kapasitenin çok altında; oran ölçülmedi, doğrulanmadı): gerçek çıktı/parça maliyeti 424.063 / 291.839 = **1,45**; C'de eşik 3,0. R6'daki 16 hücrenin hiçbirinde sanayici bakımlı/bakımsız ≥ 1 değildir (0,50–0,68): **ayar tavan/hızla çözülemez**. Parça çarpanı f ile bakımlı net = 267.186 + (1 − f) × 291.839; bakımsız 502.984 (C) ⇒ başabaş **f = 0,19**, %+5 için f = 0,10 (parça ithalatı zamanlaması yüzünden bu tahmin muhafazakârdır; bakımlı sanayicide maden `verimPpm` %55,8 < bakımsız %67,4: ödeme gücü kısıtının izi, **(doğrulanmadı)**).

| Tesis türü (yöntem) | Bugün bakım parçası (parça/sa) | Öneri (mülk kipi) | Etki (C, sanayici) |
|---|---|---|---|
| `cevher_madeni` (`yuzey_cevher`) | 1,0 | **0,2** | bakımlı net ≈ 267.186 + 0,8 × 291.839 ≈ 500.500 ≈ bakımsız 502.984 (başabaş) |
| `hidro_santrali` | 2,0 | **0,4** | aynı |

Bu değerler yalnız ölçülen iki sanayici türü içindir (**doğrulanmadı**: `yuksek_firin`, `standart_parca` gibi diğer sanayi yöntemleri pazar sınırlı çıktıyla ölçülmedi; kural: gerçek çıktı/parça maliyeti ≥ (1 − T)/T = 3 olmayan türde parça miktarı bu orana indirilir). Sonuç: C ile sanayicide bakım yapan ≈ yapmayan (−%0…+%5); "anlamlı iyi" hedefi sanayici için sağlanamaz çünkü gerçek çıktısı pazar sınırlıdır (serbest parçayla bile en çok +%15), ama net negatif olmaz.

## 3. Geri dönüşü zor kararlar (A2)

| # | Karar | Neden geri dönüşü zor | Öneri |
|---|---|---|---|
| ZA-1 | **Enerji şebekeden** ve fiyat kuralı (kamu tavanı çarpanı) | Yöntem tarifleri elektrik/yakıt girdisini şebekeyle dengeledi; şebeke fiyat kuralı sonradan değişirse bütün KD ve oran bandı kayar; lavabo kalem adı (`sebeke`) ve `kasaPayiPpm` anlamı para defteri şemasına girer | Kural `kamuFiyatTavani` ile aynı kalsın; santral vaadi O5 (bağımsızlık/büyük ölçek) ya da O3 (kömür ×0,75); fiyat çarpanı parametre |
| ZA-2 | **Tarif sayıları** (değirmen 165/33, fırın 240, cam 50, doğrama 28; cam/doğrama dikeyden sapma) | Yayımlandıktan sonra sayı değişimi canlı ekonomiyi ve bot dengesini kırar; kimlik kilidi yalnız id'yi korur; yöntem yalnız eklenir | Üst-bant tarifler (§1.4); A0-11 ölçümünden önce; cam/doğrama için rapor değerleri geçerli alternatif |
| ZA-3 | **Cam fırınının ev sahibi** (`parca_fabrikasi`, A3 seçti) | Tesis türü `yontemler[]` taşınamaz (uretim K-8); canlı tesisler `tur`/`yontem` ile bağlı | Sayısal olarak doğru (−9.666 ₺, −1 hücre, `standart_parca`'yı geçer) |
| ZA-4 | **`yerelNpc` musluk kalemi, `lavabo.sebeke` ve para defteri sürümü** | Para arzı bir kez yanlış yazılırsa geri sarılamaz; doğrulayıcı şeması | Kalemler yalnız blok açıkken; ZP8 sayacı; tamsayı kasa/lavabo bölme kuralı |
| ZA-5 | **Yerel talep modeli kimliği** (ilçe sınıfı tanımı, `yerelOlcek`, takvim grupları, bayram biçimi, sepet 200 sabit) | Arsa fiyat beklentileri ve dükkân kararları buna dayanır (canlı dünya k10, AÖ-2) | Sayılar parametre, grup adları ve formül biçimi kalıcı; `ilceSinifi` hücre sınıfından türetilir |
| ZA-6 | **Fiyat `secim` kademe sayısı ve indeks anlamı** | Kayıtlı dükkân fiyatları indeksle saklanır; araya kademe eklemek anlamı kaydırır | 4 kademe, yalnız sona eklenir; değerler parametre (üst sınır 1,15) |
| ZA-7 | **`mulkKipi` yöntem bayrağı** ve yöntem sırası | Bölge kipi altınları `yontemler[]` indekslerine ve bot seçimine bağlı | Derleyici süzmesi + altın testi (K3); yalnız sona ekleme |
| ZA-8 | **Bakım blok sınırı** (mülk-yalnız) ve **Y7 temel çizgisi** | `sanayi.bakim` bölge altınlarının parçası; temel çizgi değişince önceki raporlar karşılaştırılamaz | `mulk.bakim` ayrı blok; Y7 hem yönetimsiz hem yönetimli emsalle raporlanır |
| ZA-12 | **Genel onarımın bakıma ucuz ikame olması** (maliyet %20 inşa bedeli + 6 sa duruş) | Onarım yan etkisi: bakım yapmamak felaket değil (+%164 onarımcı), ama bakım parçası değerini düşürür; maliyet/duruş sonradan artırılırsa canlı oyuncunun alışkanlığı kırılır | Parametre aynı kalsın (`genelOnarimMaliyetPpm` 200.000, 6 sa); bakım avantajı yalnız çiftçide %10–13, sanayicide yok: bilinçli kabul |
| ZA-13 | **Sanayici tesis türlerinde bakım parçası miktarı** (`yuzey_cevher` 0,2, `hidro_santrali` 0,4) | Yöntem verisidir (kural dönemi); mülk kipine özel geçersiz kılma ister | Mülk kipi veri geçersiz kılma; bölge kipi aynı |
| ZA-9 | **Dükkân bedelinde pencere** (P-İthal ↔ P-Yok) | Yalnız veri; ama ilk dükkân akışı ve rehber adımı buna bağlı | A3 seçer; sayıca öneri P-Yok |
| ZA-10 | **`standart_gida_isleme` mülk kipinde ×0,75 yedek düğmesi** ve tetik ölçütü | Oyuncular yönteme bağlanır; canlı dünyada çıktı değişimi tesis tabanını yeniden dengeler; yeni oyuncunun tek basit gıda yolu etkilenir | Varsayılan kapalı; tetik M < %30 (§1.3-B2); açılırsa yalnız yeni oyuncuya, canlı tesislere değil |
| ZA-11 | **Kamu siparişi v0 mal listesi, fiyat (1,03 R) ve `kasaPayiPpm` (%12)** | Sipariş kayıtları mal indeksine ve fiyata bağlı; kasa payı para defterine girer | Liste yalnız sona eklenir; fiyat ve pay parametre; korunum testi (tamsayı) |

## 4. Açık sorular

1. **(Baş lider, yeni, kısa)** Santral vaadi O5 ile kapandı. Bilgi sorusu: ileride "santral kur" kararının gerçek bir tercih olması istenirse O3 (kömür girdisi ×0,75, mülk kipi veri geçersiz kılma) bir sonraki sprint adayı olsun mu?
2. **(Baş lider/A3)** Fırın çıktısı: tek öneri 240 ekmek (zincir +%21,2; K/U ilkesinin içinde; M beklentisi değişmez). Kabul mü, yoksa 250 (+%33,6, ilkenin üstü) mü?
3. **(Baş lider)** `standart_gida_isleme` yedek düğmesi (G2) tetik eşiği X = %30 ve ölçüm koşulu (§1.3-B2) kabul mü? Mülk botlarına yöntem seçici (marjinal net) eklenecek mi (K3)? Bu olmadan M ölçülemez.
4. **(A3/T3)** Cam/doğrama tarifleri dikeyden sapıyor (§1.4): üst bant mı rapor değerleri mi? Dükkân bedeli P-İthal (T3 ana) mı P-Yok (A2 sayıca) mı?
5. **(Baş lider)** `kasaPayiPpm = %12` ve kamu siparişi v0 listesi/fiyatı (1,03 R; 100/50/10/30/20 birim; ≤ 5 sipariş/ilçe/hafta) kabul mü? (Kasa payının uygulandığı taban elektrik + yakıt, yani şebeke bedelinin tamamıdır; baş lider kararıyla kapandı.)
6. **(K3)** Şebeke fiyatı canlı referans (`d.pazar.fiyat`) mı yoksa taban mı çarpılacak? Elektrik için `pazar.fiyat` dinamiği çekirdekte koşuldu mu (doğrulanmadı).
7. **(Baş lider/Operasyon)** `yerelOlcek` 50 ve yedi malın `talep1000Saat` değerleri kalibre değil; ilçe nüfusu verisi geldiğinde yeniden kalibre edilmeli. ZP8 payı %45'te: eşik %50 doğru mu?
8. **(Baş lider)** Fiyat kademelerinde üst sınır 1,15 R ve "kampanya" kademesi (yalnız pencerede) kabul mü, yoksa üç kademe mi? Kamu tavan metninde GDD'deki "1,10 R" 1,035 ile düzeltilsin mi?
9. **(O2)** §2.6: R1–R10 işlendi. Ek koşu gerekmez (R8 onarım kolu soruyu karşılıyor); isteğe bağlı: sanayici parça çarpanı (0,2) ile tek tohum doğrulaması (3 tohum × 7 gün, kapı boşken).
10. **(K3)** `bakim_duzeyi.otomatikParca` ve `mulk.bakim` bloğu çekirdek işi G6–G8'e girer mi yoksa sonraki sprinte mi?
11. **(Baş lider)** Sanayicide bakım net negatife düşmesin: mülk kipi `cevher_madeni` (`yuzey_cevher`) bakım parçası 1,0 → 0,2 ve `hidro_santrali` 2,0 → 0,4 (parça miktarı; yön onaylı). Diğer sanayi yöntemleri için aynı kural uygulanacak mı (ölçülmedi)?
12. **(Operasyon/A1)** İlk dükkân zamanı ölçütü (≤ 36 sa) nakit değil emir yuvası ve inşaat sırası tarafından belirleniyor; insan testinde bu adımlar ayrı ölçülsün.

## Ek A. Betik ve çıktı

`docs/arastirma/p4-p5-ekonomi-hesap.mjs` (Node 22, bağımlılık yok) → `docs/arastirma/p4-p5-ekonomi-hesap-cikti.md`. Bölümler: 0 sabitler, 1 mevcut yöntemler, 2 yeni yöntemler (2.3 kısa/uzun yol, 2.4 uzman, 2.5 kepek + güvence), 3 yapı bedeli, 3.2 enerji ve santral (3.2.1–3.2.5), 4 kanallar, 4.1 kamu siparişi v0, 4.2 kasa payı, 5 dükkân (5.1–5.8: üç tabanlı zincir karşılaştırması 5.7, ev sahibi tesis 5.8), 6 musluk, 7 senaryo 1 (7.1 santralsiz, 7.2 santralli), 8 senaryo 2 (8.1 marj, 8.2 kurulum süresi), 9 çıkmaz mal, 10 bakım. Çıktı deterministiktir (iki koşu `cmp` ile aynı). Raporun §1.x numaraları betiğin bölüm numaralarından farklıdır; tablolar adıyla eşleşir.
