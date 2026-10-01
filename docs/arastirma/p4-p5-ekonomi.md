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

1. **Enerji şebekeden; santral ekonomik zorunluluk değil, vaat de tutmuyor.** Şebeke fiyatı kamu tavan kuralından (1,035 R) türediği için elektrik 10,35 ₺, yakıt 103,5 ₺'dir; KD'ye etkisi çoğu yöntemde %2'nin altında (en çok cam fırını −%4,2). Kömür santrali ithal kömürle tam yükte birim maliyeti 9,7–9,8 ₺'dir: şebekeye göre ancak **%5–6** avantaj; başabaş yük %59–67 (küçük oyuncunun yükü %10–25), yakıt jeneratörü hiçbir yükte kazanmaz (28 ₺/birim), yalnız hidro (dağ etiketi) %12–14 yükte kazanır. "Santral kur, ucuz elektrik al" vaadi kömür ve jeneratörde tutmaz; seçenekler §1.3-B1'de (şebeke satış çarpanı 1,25–1,50 R, kömür girdisi ×0,75, ya da vaadi "bağımsızlık ve büyük ölçek" olarak düzeltmek). Karar baş liderindir.
2. **Ekmek zinciri `standart_gida_isleme`'yi yalnız tahıl tabanında yener.** Tahıl başına net: zincir (öneri tarifleri) +%33,6 (rapor tarifleriyle −%3,3); tesis, işçi ve hücre tabanlarında zincir %29–34 **geridedir** ve tek başına hiçbir kademe standardı geçmez. Erken oyunun bağlayıcı kısıtı tahıl ya da sermaye değil **NPC pazar derinliğidir** (kişi başı gıda dilimi 75 birim/sa, ekmek 62,5); tek ürünle standart yol %53 önde kalır, ama ikinci havuz olarak zincir tamamlayıcıdır (A+ ve B+ birlikte 8.465 ₺/sa, ikinci standart tesis −3.175). Öneri: **güçlendirme zorunlu değil, kapatma gereksiz**; tesis tabanı da kural yapılırsa en az yan etkili yol G2 (mülk kipinde `standart_gida_isleme` ×0,75) (§1.3-B2).
3. **NPC pazar derinliği zincir sayısını sınırlar.** NPC emilimi oyuncuyla büyür (`max(4, n)/4`); 200 oyuncuda `ekmek` emilimi 12.500 birim/sa (kişi başı 62,5). Bir S fırın 250/sa üretir. Dünya yerel kanalla birlikte 21.278 birim/sa emer: **oyuncuların ancak %43'ü (≈85 fırın) ekmek zinciri kurarsa fiyat düşmez**; hepsi kurarsa arz/emilim 2,35 (§1.3-B3).
4. **Kamu fiyat tavanı kodda 1,035 R'dir** (`mulk/kasa.ts:415-424`, `mulk/kamuFiyat.ts:18-22`, `derle.ts:193`); GDD'deki 1,10 R üst sınırdır. İthalat maliyeti 1,100–1,111 R: NPC'den alıp kamuya satmak marj bırakmaz, para korunumu ile çelişki yok. **Kamu siparişi v0 önerisi:** ekmek, gıda, pencere, çelik, parça; fiyat 1,03 R; boyutlar 100/50/10/30/20 birim; ilçe başına haftada ≤ 5 sipariş (§1.9).
5. **Dükkân S.** Taban fiyatla 11.280 ₺ (GDD'nin 11.440 ₺'si pencereyi ithal fiyatıyla sayar). Kırsal ilçede tek dükkânın neti ≈ gideri karşılar (32 ₺/sa); kasabada 17–21 sa, şehirde 12–15 sa'de geri öder; kasabada 3 dükkânla 56 sa'e uzar (hedef ≤ 48). Fiyat `secim` kademesi önerisi: **4 kademe** (0,85 kampanya, 0,95, **1,05 varsayılan**, 1,15); 0,85 R'de dört senaryonun hepsinde net eksidir (fiyat savaşı kendini cezalandırır) (§1.9).
6. **Yerel talep** tamsayı/PPM: `Q = taban[sınıf][mal] × takvim[grup][ay] × bayram[grup]`. 13 mal, 3 ilçe sınıfı, 4 takvim grubu (her biri 12 aylık, toplamı tam 12.000.000 ppm), bayram dalgası toplam sabit. Gıda sepeti 200 birim/1000 kişi/sa sabit (gıda 90 + ekmek 60 + un 10 + süt 20 + süt ürünü 20); T3'ün listesinde olmayan yedi malın (un, süt, fındık ürünü, yakıt, çelik, parça, cam) talebi ve gerekçesi §1.9'da.
7. **`yerelNpc` musluğu.** İlçe başına haftalık: kırsal 0,18 M ₺ (1 dükkân), kasaba 0,73–0,97 M ₺, şehir 0,95 M ₺ ile 2,91 M ₺ (5 dükkân). Alfa-0 ölçeğinde 92,9 M ₺/hafta; **ek** para yalnız perakende primidir (14,1 M ₺/hafta). ZP8 payı %45 (sınır %50). **Şebeke lavabosu:** 200 P4 oyuncusunda elektrik 10,0 M ₺/hafta + yakıt 69,6 M ₺/hafta kamuya gider (yakıt eskiden NPC ithalatı lavabosundaydı) (§1.10).
8. **Zincir kurulum süresi (santralsiz).** Erken oyun çarpanı ve ≤2 eşzamanlı inşaatla ekmek zinciri **1,0 sa**; cam → pencere 1,2 sa; 7. günden sonra 10,0 / 12,0 sa. İsteğe bağlı santral her zincire +0,4 sa ve ≈ +35.000 ₺ ekler (§1.8).
9. **Kepek.** P0'da iki tüketici: NPC pazar kaydı (kepek 16,0 ₺) ve **`kepek_gubresi`** (kepeğe 21,9 ₺ öder, NPC'nin %37 üstü). `sut_kepekli` P1'e kalır. İsteğe bağlı güvence alıcı bütçesi ≈ 1,06 M ₺/hafta (Alfa-0, 50 değirmen) ve musluk kalemi yeni değil (§1.6).
10. **Cam/doğrama tarifleri dikeyden sapar.** Üst bant tarifleri dikey raporu aşar (cam 16 yakıt + 18 elektrik, doğrama 5 parça → 28 pencere; rapor 18/20 ve 6 parça → 27). Rapor değerleriyle de KD > 0'dır; sapmanın gerekçesi uzman marjı ve bant ilkesidir (§1.4). Ev sahibi `parca_fabrikasi`: cam fırını mevcut `standart_parca`'yı +%13 geçer, `otomatik_hat`'ın (teknoloji kilidi arkasında) %20 altında kalır (§1.12). T3 §7.2 tablosuyla sapmalar §1.14'te.
11. **Bakım ve aşınma.** Aşınma cezası **çıktıya** uygulanır, girdiye değil (`ekonomi/uretim.ts:212,446`); ince marjlı işleme yöntemlerinde bu KD kaybını çıktı kaybının 3–6 katına çıkarır ve bugünkü parametrelerle değirmen, fırın, doğrama KD'si **35–40. günde negatife** döner. Öneri (mülk kipine özel, bölge altınına dokunmaz): **aşınma hızı ×0,55, tavan %30** (§2). Doğrulanmadı.

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
| ekmek_firini | 4.600 | 4.525 | −1,64% |
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

**Vaat tutmuyorsa seçenekler (karar baş liderin).** Başabaş yük üç kaldıraçla (S ölçek, yük %):

| Seçenek | Şebeke fiyatı ₺/birim | Kömür S başabaş | M | L | Jeneratör S | Hidro S | P4 oyuncusu şebeke gideri ₺/hafta | Not |
|---|---|---|---|---|---|---|---|---|
| O0 — bugünkü (kural 1,035 R) | 10,35 | %67 | %61 | %59 | hiç | %14 | 49.817 | vaat yalnız hidroda tutar |
| O1 — şebeke satış çarpanı 1,25 R (tavan kuralı yalnız kamu ALIMINA uygulanır) | 12,50 | %28 | %26 | %25 | hiç | %11 | 60.165 | satış fiyatı arbitraj açmaz; G4 metninden sapar |
| O2 — şebeke satış çarpanı 1,50 R | 15,00 | %17 | %15 | %15 | hiç | %9 | 72.198 | oyuncu şebeke gideri +%45 |
| O3 — santral kömür girdisi ×0,75 (mülk kipi; 60 → 45) | 10,35 | %28 | %25 | %25 | hiç | %14 | 49.817 | bölge kipi `komur_santrali` aynı; mülk veri geçersiz kılma (K3) |
| O4 — O3 + şebeke 1,25 R | 12,50 | %18 | %16 | %16 | hiç | %11 | 60.165 | - |
| O5 — vaadi düzelt | 10,35 | - | - | - | - | - | 49.817 | santral "bağımsızlık ve büyük ölçek" tercihi; Yatırım Tahmini kartı tasarrufu açık yazar |

O1–O2 oyuncu gideri artışı KD'nin ≤ %3'ü kadardır; O3 yalnız veri geçersiz kılma ister. **Sayısal öneri O5 (+ gerekirse O3):** şebeke kuralı baş liderin kararıyla aynı kalır, santral vaadi düzeltilir; O3 küçük bir veri bayrağıyla kömür santralini orta yükte (%25–28) anlamlı yapar ve gerçek bir "santral kur" kararı doğurur. Bu bir öneridir.

**Şebeke ödemesi: haftalık tutar ve para arzı.**

| Oyuncu | Elektrik birim/sa | Yakıt birim/sa | Elektrik ₺/hafta | Yakıt ₺/hafta | Toplam ₺/hafta |
|---|---|---|---|---|---|
| P4 (ekmek zinciri + kepek_gubresi) | 28,65 | 20 | 49.817 | 347.760 | 397.577 |
| P4 + P5 (cam → pencere) | 61,65 | 36 | 107.197 | 625.968 | 733.165 |

Dünya (200 P4 oyuncusu): elektrik 9.963.324, yakıt 69.552.000 ₺/hafta; karşılaştırma: `yerelNpc` 92.910.226 + `ihracatNpc` 112.266.000 = 205.176.226 ₺/hafta musluk. **Yeni lavabo kalemi `sebeke`** (yanar); yakıt eskiden NPC ithalatı olarak lavabodaydı, şimdi şebekeye geçer ve %6,8 ucuzlar. **Muhasebe (baş lider kararı): şebeke bedelinin `kasaPayiPpm` payı ilçe kamu kasasına gider, kalanı lavaboya (`sebeke`) yanar.** Öneri **`kasaPayiPpm = 120.000` (%12)**: tek P4 oyuncusu olan en ince ilçede bile kamu siparişi v0 çekirdeğini (23.381 ₺/hafta) 1,1× karşılar; kalabalık ilçede kasa kapasitesi 4–10× olur ve sipariş sayısı (≤ 5/hafta) bağlayıcıdır. Tamsayı kuralı: kasa = ⌊ödeme × kasaPayiPpm / 1.000.000⌋, lavabo = ödeme − kasa; korunum her tikte tam kapanır (§1.9). Kasa yalnız zaten yanan paradan beslenir (pay lavabonun parçasıdır); sink payı %88 kalır.

**Öneri (şebeke yöntem tasarımı).** Yöntemlerde yakıt/elektrik girdileri tarifte kalır (üretim hattı değişmez); eksik stok **şebekeden otomatik** tamamlanır: `mulk.sebeke { acik: true; elektrik: bayrak; yakit: bayrak }`. Yöntem `yakit: e/10` ikamesi (önceki Y varyantı) artık gereksizdir (arşiv: betik §2.2).

#### B2. `standart_gida_isleme` ve ekmek zinciri: üç tabanda karşılaştırma

Mevcut yöntem tek tesiste 200 tahıl → 160 gıda (₺70) verir: oran **1,84**, işçi başına KD 849 ₺, bant (1,16–1,48) dışında. Bölge kipi altınlarının parçası olduğundan değiştirilemez. İki yöntem de aynı `gida_fabrikasi`'nda çalışır (bedel, hücre, işçi aynı); oyuncu tesis başına yöntem seçer. KD şebeke fiyatıyla; "NPC net" = satış ×0,891, dış girdi şebeke/ithalat ×1,111, bakım ve işletme dahil, tahıl fırsat maliyeti ihracat paritesi.

| Taban | `standart_gida_isleme` (1 tesis) | zincir (değirmen + fırın, 2 tesis) | Zincir / standart | Okuma |
|---|---|---|---|---|
| tahıl başına KD (200 tahıl/sa) | 5.097 ₺/sa | 7.245 ₺/sa | +42,1% | tahıl kısıtlıysa zincir kazanır |
| tahıl başına NPC net (komisyonlu) | 4.310 ₺/sa | 5.759 ₺/sa | **+33,6%** | aynı; rapor tarifleriyle 4.167 (**−3,3%**) |
| tesis başına KD | 5.097 ₺ | 3.622 ₺ (değirmen 2.720, fırın 4.525) | −28,9% | **tesis kısıtlıysa standart kazanır**; tek kademe tek başına standardı geçemez |
| işçi başına KD | 849 ₺ | 557 ₺ | −34,4% | işçi mülk kipinde bağlayıcı değil (`kalanIsci` sınırsız); Alfa-1 işgücü havuzunda bağlayıcı olabilir |
| hücre başına KD (her tesis 2 hücre) | 2.548 ₺ | 1.811 ₺ | −28,9% | tesis tabanıyla aynı |
| sermaye başına KD/sa (S taban değer 20.800 ₺/tesis) | 245 ‰ | 174 ‰ | −28,9% | saatlik getiri binde |

Rapor tarifleri (150/225) bandın alt yarısındadır ve kapalı zinciri standardın %3,3 altına iter; öneri tarifleri (165/33; 250) +%33,6 verir. K/U ilkesi (uretim §2.2: +%10–25) aşılmış olur; fırın çıktısı 243 ekmeğe indirilirse +%25'e oturur (her 5 ekmek ≈ 267 ₺/sa). Seçim A3'ündür; 250 tarifi üst uçtadır ve A0-11 "bot zinciri tamamlar" ölçütünü güvenceye alır.

**Erken oyunda (0–7 gün) bağlayıcı kısıt: tahıl değil, tesis sermayesi değil; NPC pazar derinliği.**

| Kısıt | Değer | Bağlayıcı mı? |
|---|---|---|
| Sermaye (santralsiz S1: hazine ≥ 4 yapının tamamı) | saat 2'de 41.710 ₺ (en düşük), saat 8'de 112.793 ₺ | hayır: 2 saat sonra |
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
| B: yalnız ekmek zinciri, NPC dilimi (dükkânsız) | %25 | 1.110 | 2 tesis sabit gideri; düşük yük |
| B+: ekmek zinciri + fırın dükkânı | %53 | 3.342 | dükkân 68,8 birim/sa |
| **C: A+ ve B+ birlikte (iki tahıl hattı, iki dükkân; ilçe ≤ 2)** | - | **8.465** | iki pazar havuzu: tamamlayıcılık |
| D: ikinci standart tesis (gıda havuzu zaten doluyken) | - | −3.175 | doymuş havuza ikinci tesis kâr etmez |

Okuma: tek ürünle standart yol %53 önde kalır (gıda ₺70 ve oran 1,84'ün sonucu); ama oyuncu dilimi tek mal havuzunu doldurur ve **ikinci tesis marjinal olarak değersizdir (D)**: asıl karar "ikinci standart mı, zincir mi" ise zincir 3.342 ₺/sa kazandırır. Standart ve zincir ikame değil **tamamlayıcıdır** (C). **Dürüst sınır:** oyuncu yalnız tek mala bağlı kalırsa tesis ve pazar-dilimi tabanlarında standart önde; zincirin erken oyundaki değeri yeni ekmek havuzu ve tahıl tabanıdır.

**Tesis tabanını yine de garanti etmek istenirse** (bant içinde; yan etkiler):

| Seçenek | Değişiklik | Standart KD | Değirmen KD | Fırın KD | Kademe başına > standart? | Yan etki |
|---|---|---|---|---|---|---|
| 0 — olduğu gibi | - | 5.097 | 2.720 | 4.525 | hayır | pazar dilimi kısıtında tamamlayıcı |
| G1 — zincir yoğunluğu ×2 | değirmen 400 tahıl → 330 un + 66 kepek; fırın 330 un + 40 yakıt + 30 elektrik → 500 ekmek | 5.097 | 5.440 | 9.050 | **evet** | Tarla:değirmen 2:1; fırın 500/sa pazar dilimini 2× aşar; doyumu hızlandırır, önerilmez |
| **G2 — `standart_gida_isleme` mülk kipinde ×0,75** (160 → 120 gıda; oran 1,38) | mülk veri geçersiz kılma (bölge kipi aynı) | 2.297 | 2.720 | 4.525 | **evet** | K3 işi; çiftçi botu gıda fabrikası kurmaz: ölçüm temel çizgisi aynı |
| G3 — (i) `standart_gida_isleme` mülk kipinde kapat | `yalnizBolge: true` | - | 2.720 | 4.525 | n/a | yeni oyuncunun tek basit gıda işleme yolu kalkar; G6 kapsamı büyür |

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

Gerekçe: (i) rasyonel oyuncunun tek `gida_fabrikasi`'nda standart önde (A+ 5.124 ↔ B+ 3.342 ₺/sa), ikinci tesiste ise standart marjinal olarak değersizdir (D −3.175) ve zincir 3.342 ₺/sa kazandırır; yani **bir fabrikadan fazlasını kuran her bot ikincisini zincire çevirmelidir**. (ii) Sermaye bağlayıcı değildir (S1: saat 8'de hazine 112.793 ₺, bir `gida_fabrikasi` 10.000 ₺), ilk 7 günde botların en az yarısı ≥ 2 fabrika kurar: beklenen M ≥ %50. (iii) Eşik beklenenin %60'ı (%30) seçildi: M için örneklem standart hatası ≤ %1,6 (p = 0,5; n = 1.000), yani %30 yaklaşık 12σ alt sınırdır; asıl belirsizlik bot politikasıdır (mülk botlarında `degirmen` yöntemi bugün yok; bot yöntem seçicisi ancak K3'te yazılır). **(doğrulanmadı):** M, botun yöntem seçme kuralına bağlıdır; kural "marjinal net" ise yukarıdaki beklenti geçerlidir, "varsayılan yöntem" ise M ≈ %0 çıkar ve ölçüt bot ayarı hatasını ekonomik hatadan ayıramaz. Bu yüzden ölçüm yalnız yöntem seçen botlarla (A2 tablosundaki marjinal net kuralı) yapılmalıdır.

#### B3. NPC pazar derinliği

`npcHacimleri`: emilim ve arz `max(npcLikiditeTabanOyuncu=4, oyuncu)/4` ile büyür. Alfa-0'da (200 oyuncu) ölçek ×50. `ekmek` emilimi 250 × 50 = 12.500 birim/sa (kişi başı 62,5); `pencere` 100 × 50 = 5.000; `kepek` 120 × 50 = 6.000.

| Büyüklük (200 oyuncu, 45 ilçe) | Değer |
|---|---|
| Yerel kanal (k≈4,4 fırın dükkânı/ilçe, 1,05 R) | 8.778 birim/sa |
| NPC emilimi (ekmek) | 12.500 birim/sa |
| Fiyat düşmeden emilen | 21.278 birim/sa (≈ 85 S fırın) |
| Herkes ekmek zinciri kurarsa arz | 50.000 birim/sa; **arz/emilim 2,35** |
| Fiyat düşmeden zincir kurabilen oyuncu payı | **≤ %43** |

Fiyat formülü (Vic3 türevi, e = 0,75; docs/06 §13) arz emilimin 2 katını aştığında çarpanı tabana (×0,25) iter. Bu bir kabul ölçütü bilgisidir: Alfa-0'ın dört zinciri (ekmek, cam → pencere, süt, fındık) oyuncuları dağıtınca doyum dağılır; bot koşusunda (A0-4, 100 bot) tek zincire yığılmama izlenmeli. Pencere hattı için aynı sorun yok: 28 pencere/sa'e karşı emilim 5.000.

### 1.4 Yeni yöntemlerin tam satırları (S ölçek)

A2 önerisi, kod birimi (mili). Barındıran tesis, bakım ve kirlilik dahil. Çevrim 1 sa (sürekli). Hepsi `mulkKipi: true`. Elektrik ve yakıt kamu şebekesinden gelir (§1.3-B1); tarifte kalırlar.

| Yöntem | Tesis | Girdiler (mili/sa) | Çıktılar (mili/sa) | İşçi (mili) | Bakım (parça, mili/sa) | Kirlilik (ppm/sa) |
|---|---|---|---|---|---|---|
| `degirmen` | gida_fabrikasi | tahil 200.000, elektrik 12.000 | un 165.000, kepek 33.000 | 5.000 | 800 | 20 |
| `ekmek_firini` | gida_fabrikasi | un 165.000, yakit 20.000, elektrik 15.000 | ekmek 250.000 | 8.000 | 800 | 20 |
| `kepek_gubresi` | ahir | kepek 100.000, elektrik 5.000 | gubre 18.000 | 3.000 | 500 | 10 |
| `sut_kepekli` (P1) | ahir | tahil 50.000, kepek 60.000, elektrik 5.000 | sut 82.000, gubre 4.000 | 5.000 | 500 | 10 |
| `cam_firini` | parca_fabrikasi (A3) | silis 60.000, yakit 16.000, elektrik 18.000 | cam 50.000 | 5.000 | 1.000 | 60 |
| `celik_dograma` | parca_fabrikasi | celik 24.000, cam 32.000, parca 5.000, elektrik 15.000 | pencere 28.000 | 7.000 | 1.000 | 20 |

Aynı satırlar ₺ olarak (taban fiyat; oran bandı 1,16–1,48 hedefi; KD şebeke fiyatıyla):

| Yöntem | Girdi ₺/sa | Çıktı ₺/sa | **Oran** | KD ₺/sa (taban / şebeke) | KD/işçi (şebeke) ₺ | Rapor (dikey) oran / KD | Bant |
|---|---|---|---|---|---|---|---|
| `degirmen` | 6.120 | 8.844 | **1,445** | 2.724 / 2.720 | 544 | 1,314 / 1.920 | içinde |
| `ekmek_firini` | 10.400 | 15.000 | **1,442** | 4.600 / 4.525 | 566 | 1,371 / 3.650 | içinde |
| `kepek_gubresi` | 1.850 | 2.520 | **1,362** | 670 / 668 | 223 | yeni | içinde |
| `sut_kepekli` | 2.630 | 3.840 | **1,460** | 1.210 / 1.208 | 242 | 1,460 / 1.210 | içinde |
| `cam_firini` | 3.280 | 4.750 | **1,448** | 1.470 / 1.408 | 282 | 1,357 / 1.250 | içinde |
| `celik_dograma` | 6.970 | 10.080 | **1,446** | 3.110 / 3.105 | 444 | 1,359 / 2.570 | içinde |

Kepek `değirmen` çıktısının %28'i KD'dir (yan ürün ≤ %40 kuralı, uretim §2.3). Mevcut yöntemlerin çoğu bandın dışındadır (`standart_gida_isleme` 1,84, `ahir_besi` 1,83, `standart_elektronik` 2,35, madenler > 4); bant yeni yöntemler içindir.

**Dikeyden sapma (işaretli).** Beş yöntemde A2 önerisi dikey raporun (§2.2/§3) rakamlarından farklıdır:

| Yöntem | Dikey rapor | A2 önerisi | Oran (rapor → öneri) | Uzman net ₺/sa (şebeke; ithalatla başla) | Gerekçe |
|---|---|---|---|---|---|
| `degirmen` | 150 un + 30 kepek | 165 un + 33 kepek | 1,314 → 1,445 | 153 → 870 | `standart_gida_isleme`'yi tahıl tabanında geçmek (§1.3-B2); rapor tarifiyle zincir −%3,3 |
| `ekmek_firini` | 150 un + 22 yakıt + 15 elektrik → 225 | 165 un + 20 yakıt + 15 elektrik → 250 | 1,371 → 1,442 | 1.044 → 1.754 | aynı |
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
| fırın uzmanı (öneri) | 13.365 | 11.391 | 220 | **1.754** | 1,173 |
| fırın uzmanı (rapor) | 12.029 | 10.765 | 220 | 1.044 | 1,117 |
| cam fırını uzmanı (öneri) | 4.232 | 3.509 | 260 | 463 | 1,206 |
| cam fırını uzmanı (rapor) | - | - | - | 236 | - |
| doğrama uzmanı (öneri; çelik, cam, parça ithal) | 8.981 | 7.732 | 260 | 989 | 1,162 |
| doğrama uzmanı (rapor) | - | - | - | 468 | - |
| `kepek_gubresi` uzmanı (kepek ithal 20 ₺) | 2.245 | 2.052 | 160 | 34 | 1,094 |

Okuma: NPC'den alıp NPC'ye satan bir kademenin marjı yaklaşık `oran × 0,802 − 1`'dir; bant 1,16–1,48 için −%7…+%19. Şebeke yakıt/elektriği ithalattan %6,8 ucuz olduğu için öneri tariflerinde her kademe pozitiftir. Kapalı zincir yine de belirgin önde: 200 tahıl/sa'lık kapalı zincir 5.759 ₺/sa, aynı iki tesisin ayrı ayrı uzman olarak toplamı 2.624 ₺/sa. Kepek tüketicisi (+34) sıfıra yakındır: Alfa-0'da ara kademe uzmanlığı yok kararıyla (G13) uyumludur. NPC makası altında **kapalı zincir kârlıdır** ve iki ucundan girilebilir.

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

Süre değil **nakit ve emir yuvası** bağlayıcıdır: hibe 50.000 ₺ + kit gıdası satışı 12.600 ₺ ekmek zincirini ilk 2 saatte karşılar (S1: saat 2'de hazine 41.710 ₺); isteğe bağlı santral hücre ve ithal malzeme nedeniyle ≈ +35.000 ₺ ister. Eşzamanlı inşaat 2 olduğundan ilk iki saatte Tarla + değirmen, sonra fırın + dükkân sırası zorunludur. **Bot hedefi önerisi:** ekmek zinciri (4 yapı + ilk ekmek satışı) katılımdan ≤ 3 sim-saat; cam → pencere (gün 3 sonrası) ≤ 6 sim-saat; 7. günden sonra başlayan oyuncuya ≤ 14 sim-saat. Süre baskısı olmadığı için hedefi nakit bozar: bot hazinesi < gerekli iken beklemeli.

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
| 2 | 41.710 | −10.139 | 6.158 |
| 3 | 53.557 | +11.847 | 20.416 |
| 4 | 65.404 | +11.847 | 34.674 |
| 6 | 89.099 | +23.694 | 63.189 |
| 8 | 112.793 | +23.694 | 91.705 |
| 12 | 160.181 | +47.388 | 148.737 |
| 18 | 231.264 | +71.083 | 234.284 |
| 24 | 302.346 | +71.083 | 319.831 |
| 48 | 573.309 | +71.307 /6 sa | 662.021 |
| 72 | 858.539 | +285.229 /gün | 1.004.210 |
| 168 | 1.999.456 | +285.229 /gün | 2.372.968 |

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
| ekmek NPC ihracatı | 197.811 | 214.864 | 214.864 |
| kepek NPC ihracatı (gün 1) / gübre NPC ihracatı (ahırdan sonra) | 12.510 | 17.963 | 17.963 |
| arazi vergisi | −3 | −11 | −11 |
| **Net** | **252.346** | **285.229** | **285.229** |
| **Gün sonu hazine** | 302.346 | 858.539 | 1.999.456 |

**İsteğe bağlı santralli varyant** (kömür santrali; yakıt şebekeden): saat 0'da Tarla + santral; 1'de değirmen + fırın; 2'de dükkân (ahır indirimsiz). En düşük hazine 30.781 ₺ (saat 3), gün 1 net 225.515 ₺; gün 3 ve gün 7 net 280.662 ₺; gün sonu hazine 275.515 / 816.899 / 1.939.546 ₺. Santralsize göre gün 1'de −26.831 ₺, gün 3+ −4.567 ₺/gün (santral kömürü 5.971 ve bakım 5.703 > şebeke elektrik tasarrufu 7.117): **santral nakit akışını kötüleştirir**, kararlı hâlde bile kazandırmaz (§1.3-B1).

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
| ekmek hattı geliri (yerel 127.326 + NPC 214.864 + gübre 17.963) | 360.153 | 360.153 | 360.153 | 360.153 |
| pencere NPC ihracatı | 188.698 | 217.728 | 217.728 | 217.728 |
| cam NPC ihracatı (fazla) | 29.275 | 36.936 | 36.936 | 36.936 |
| arazi vergisi | −25 | −25 | −25 | −25 |
| **Net (ekmek hattı dahil)** | **257.100** | **340.162** | **340.162** | **340.162** |

Pencere hattının artımlı katkısı 72→168 sa **+136.668 ₺** (yatırım dahil; ekmek hattının aynı pencerede neti 1.140.917 ₺). Kararlı hâl marjı (komisyonlu, S ölçek): (a) yalnız doğrama, bütün girdi ithal **1.013 ₺/sa**; (b) cam fırını + doğrama **2.052 ₺/sa** (yatırım ≈ 73.000 ₺; geri ödeme ≈ 36 sa); (c) + kendi silis ocağı 2.158 ₺/sa (silis damarı ister). **Pencere hattı ekmek hattının ≈ %20'si kadar kazandırır**; P5'in "kendi pencere mağazan" vaadi zincir marjından değil yapı market perakendesinden ve kamu/yapı talebinden gelmelidir.

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
{ "id": "ekmek_firini", "ad": "Ekmek Fırını", "girdiler": { "un": 165000, "yakit": 20000, "elektrik": 15000 }, "ciktilar": { "ekmek": 250000 }, "isci": 8000, "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20, "mulkKipi": true },
{ "id": "kepek_gubresi", "ad": "Kepekten Gübre", "girdiler": { "kepek": 100000, "elektrik": 5000 }, "ciktilar": { "gubre": 18000 }, "isci": 3000, "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10, "mulkKipi": true },
{ "id": "sut_kepekli", "ad": "Kepekli Süt Besisi", "girdiler": { "tahil": 50000, "kepek": 60000, "elektrik": 5000 }, "ciktilar": { "sut": 82000, "gubre": 4000 }, "isci": 5000, "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10, "mulkKipi": true },
{ "id": "cam_firini", "ad": "Cam Fırını", "girdiler": { "silis": 60000, "yakit": 16000, "elektrik": 18000 }, "ciktilar": { "cam": 50000 }, "isci": 5000, "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 60, "mulkKipi": true },
{ "id": "celik_dograma", "ad": "Çelik Doğrama", "girdiler": { "celik": 24000, "cam": 32000, "parca": 5000, "elektrik": 15000 }, "ciktilar": { "pencere": 28000 }, "isci": 7000, "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 20, "mulkKipi": true }
```

Tesis türü `yontemler[]` sonları: `gida_fabrikasi += [degirmen, ekmek_firini]`, `ahir += [kepek_gubresi, sut_kepekli]`, `parca_fabrikasi += [celik_dograma, cam_firini]` (A3 seçimi). Dikeyden sapan satırlar (cam, doğrama; üst bant) §1.4'te işaretlidir; rapor (dikey) değerleri alternatif olarak geçerlidir (cam `yakit 18000, elektrik 20000`; doğrama `parca 6000 → pencere 27000`).

`mulk.ekYapilar.dukkan`: `{ ad, yuva: 1, insaSaati: 4, insaParasi: 6000000 (P-İthal) | 7440000 (P-Yok), insaMaliyeti: { celik: 20000, parca: 8000, pencere: 4000 (P-İthal) }, enFazlaIlBasina: 6, enFazlaIlcedeBasina: 2 }`; `mulk.olcekHucre.dukkan = [1, 2, 3]`.

`mulk.sebeke` (yeni; yalnız mülk kipi) ve ilgili öneriler:

```
sebeke:   { elektrik: true, yakit: true, fiyatKaynagi: "kamuFiyatTavani" /* referans × kamuIthalatCarpaniPpm = 1,035 */, lavaboKalemi: "sebeke",
            kasaPayiPpm: 120000 /* ödemenin %12'si ilçe kamu kasasına, kalanı lavabo */ }
kamuSiparisi: { malFiyatPpm: 1030000 /* referans × 1,03 */, boyutMili: { ekmek: 100000, gida: 50000, pencere: 10000, celik: 30000, parca: 20000 },
                ilcedeHaftalikEnFazla: 5, vadeGun: 3 }                 // öneri (§1.9); parça yedek
yontemGecersizKilma: { standart_gida_isleme: { ciktiPpm: 1000000 /* kapalı; yedek G2: 750000 */ } }   // §1.3-B2 tetik ölçütü
```

`mulk.perakende` taslağı:

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
| `degirmen`, `ekmek_firini`, `kepek_gubresi` | A2 ön önerisi | aynı (165/33; 165 + 20 yakıt + 15 elektrik → 250; 100 kepek → 18 gübre) | yok |
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

## 2. Bakım ve aşınma kalibrasyonu önerisi (doğrulanmadı; O2 bekleniyor)

### 2.1 Mekanizma (koddan; dosya:satır)

- **Düzey ve günlük aşınma.** `bakim_duzeyi {duzey 0|1|2}` oyuncu düzeyindedir, varsayılan 1 (`sanayi/komut.ts:50-56`). `sanayiGunluk` her sim-günü başında (`ekonomi/index.ts:27`) sahipli bölgenin aktif tesislerine `düzey.asinmaPpmGun` ekler: asgari +20.000, normal 0, yüksek −15.000 ppm/gün (`parametreler.json:159-170`; `sanayi/gunluk.ts:34-55`). **Kıtlık yedeği:** bakım girdisi karşılanma oranı `bakimKarsilanmaPpm < kitlikEsigiPpm (950.000)` ise günlük aşınma en az `kitlikAsinmaPpmGun (20.000) × (1 − karşılanma)` olur (`sanayi/gunluk.ts:44-52`). Parça stoğu bitince karşılanma 0 ⇒ +%2/gün; yani **asgari düzey, "parça hiç yok" ile aynı hızda aşındırır**.
- **Bakım talebi.** Her tesis, yöntemin `bakim` girdisini (parça, mili/sa; ölçek ×2/×3,2, düzey ×0,5/1/1,5) aktif olsun olmasın tüketir (`ekonomi/uretim.ts:333-335`); karşılanma `bakimKarsilanmaPpm`'e yazılır (`:596-612`). Stok yoksa ithalat emri gerekir (bot: `botlar/src/parsel.ts:622-660`, eşik: stok 24 sa altında).
- **Ceza.** `cezaCarpani = max(uretimTabani, 1 − aşınma × asinmaVerimKaybiTavani/1e6)`; tavan 400.000 ⇒ çıktı en çok ×0,6 (`sanayi/carpan.ts:21-27`). **Çıktıya uygulanır**: `ciktiCarpaniHesapla` (`ekonomi/uretim.ts:204-222`, ceza `:212`) → `ciktiGercek = ciktiOlcekle(q, v, carpan)` (`:446`); **girdi ve bakım `verim` ile ölçeklenir, çarpana bakmaz**. Santralde elektrik kapasitesini de aşınma kısar (`:319`).
- **Onarım.** `genel_onarim`: aşınmış tesislerin inşa bedelinin %20'si (ölçek dahil) + 6 sa duruş, aşınma sıfırlanır (`sanayi/komut.ts:113-149`; parametre `genelOnarimMaliyetPpm 200.000`, `genelOnarimDurusSaat 6`).
- **Gider.** İşletme gideri ölçek × düzey çarpanıyla değişir (`lojistik/cozum.ts:162-176`).

Bu bloklar **mülk ve bölge kipinde ortaktır** (`parametreler.sanayi.bakim`). Bölge kipi altınları aşınma/bakım parametrelerine bağlıdır: değer değişirse altın özet değişir. Bu yüzden önerinin tamamı **mülk kipine özel yeni bir `parametreler.mulk.bakim` bloğu** olarak yazılır ve yalnız `d.mulk` varken okunur; bölge kipi değişmez.

### 2.2 Y7 iyimserliğinin kaynağı

parsel-v1-bulgular §3a'ya göre bakım yönetimi yerleşik çiftçinin 7 günlük net üretim gelir medyanını 191 bin → 417 bin ₺ (×2,2), yerleşik tüccarınkini 213 bin → 612 bin ₺ çıkarıyor; geç çiftçi/emsal %385 → %163, geç pazar/emsal %171 → %60. Kod bu yönü açıklar ama büyüklüğü açıklamaz:

1. **Kodun saf aşınma kanalı en çok ×1,667 verir** (çıktı ×0,6). Ölçülen ×2,2, kalan ×1,3'ü başka bir mekanizmadan alır **(doğrulanmadı)**.
2. **Kaldıraç.** Ceza çıktıyı çarpar, girdiyi değil: işleme yöntemlerinde KD kaybı = çıktı kaybı × (çıktı değeri/KD). Çıktı/KD: `degirmen` 3,2, `ekmek_firini` 3,3, `celik_dograma` 3,8, `yuksek_firin` 3,7, `standart_parca` 5,6, `cam_firini` 3,8 (girdisiz Tarla 1,0). **Bugünkü parametrelerle tavanda (%40) bütün bu yöntemlerin KD'si negatiftir**: KD = 0 olduğu aşınma `(1 − 1/oran)/0,4` kadardır: değirmen %77, fırın %77, doğrama %66, cam %66, `yuksek_firin` %68, `standart_parca` %44. Yönetimsiz bir zincirin KD'si gün 30'da değirmen 601 ₺/sa (normal 2.724), fırın 1.000 (4.600); **gün 45'te negatif** (değirmen −460, fırın −800, doğrama −519, cam −240) olur. Bu, parça ithal etmeyen bir yerleşiğin 36–40. günde zararına çalışması demektir.
3. **Hipotez H2 (ödeme gücü sarmalı, doğrulanmadı).** Net oran negatif ve hazine 0 iken tesis verimi `odemePpm` ile kısılır (`ekonomi/uretim.ts:301-303`); negatif KD'li yönetimsiz tesis hazineyi tüketir, verim ikinci kez düşer. ×2,2 > ×1,67 için olası ikinci kaynaktır.
4. **Y7 ölçüsü hazine akışıdır** ("satış − girdi − bakım − arazi vergisi", `olcum/parsel/h8.ts:129`, `yeni-oyuncu.ts:285-324`): yönetimli koşuda bakım parça ithalatı **gider** olarak girer, yönetimsizde girmez; yönetimsizin geliri bakımsızlığın kaybını yansıtırken parça bedelini yansıtmaz.
5. **Çiftçi arketipi** (`CIFTCI`: ciftlik, mera, ahir, ciftlik, mera, `parsel.ts:102`) kısmen kaldıraçlıdır: `ahir_besi` oran 1,83 (çıktı/KD 2,2), Tarla ve Mera girdisizdir. Bu karışımın tahmini bakım kazancı ×1,6–1,8'dir (modelden, doğrulanmadı); ×2,2 için H2 ve zaman penceresi (iklim "hizli", 7 günlük pencere ≈ 84 iklim günü) etkisi gerekir.

Sonuç: Y7'nin "geç katılan emsalini geçer" sonucunun büyük kısmı yerleşik botların bakım yapmamasından gelir (O2 temel ölçümüyle birlikte dört koşuda aynı), ve **bu mekanik yönetimsiz yerleşiği gerçek bir oyuncuya göre abartılı biçimde cezalandırıyor**. İki yönlü etki: (i) Y7 emsal medyanı yapay olarak düşük kalıp geç katılan oranı şişiyor; (ii) ayarla-unut oyuncusu 35–40. günde zincirini zararla çalıştırıyor.

### 2.3 Hedef aralıklar

| # | Hedef | Aralık |
|---|---|---|
| H-B1 | Yönetimsiz (parça hiç yok) çıktı kaybı, yokluk bantlarına göre (docs arastirma GDD §3C.1a: K5 14–45 gün uyku, K6 45–90 gün çürüme) | gün 14 ≤ %5; gün 45 ≤ %15; tavana (≈ K6 sonu) 90 günde ulaşır; tavan ≤ %30 |
| H-B2 | Yönetimsizin KD'si negatife dönmez en az 45. güne kadar, bütün yeni ve mevcut işleme yöntemlerinde | KD ≥ 0 ⇔ tavan ≤ `1 − 1/oran`: en kısıtlı yöntem `standart_parca` (%18) tavanda eksiye gider ama ancak 54. günde; hedef tutar |
| H-B3 | Bakım yapan her tesis türü yapmayandan anlamlı iyi (60 gün ortalaması, parça ithal fiyatıyla) | önlenen kayıp / bakım maliyeti ≥ 2,0 her yöntemde; net getiri > 0 |
| H-B4 | Bakımlı/bakımsız gelir oranı | 60 gün: 1,10–1,35; tavanda ≤ 1,45 (bugün 1,30 → 1,67; ölçülen çiftçide 2,2) |
| H-B5 | Yeni oyuncu ilk 14 gün | çıktı kaybı ≤ %5 (parça kiti inşaata bile yetmediği için ilk gün stok yok, §2.4) |
| H-B6 | Y7 oyuncu payı | bakım yönetimli ve yönetimsiz her iki yerleşik temelde GEÇTİ; eşik tamponu ≥ 1,2× |

### 2.4 Parametre önerisi (mülk kipine özel; doğrulanmadı)

`parametreler.mulk.bakim` (yeni blok; yalnız `d.mulk` varken okunur; bölge altınına dokunmaz):

| Parametre | Bugün (`sanayi.bakim`) | Öneri (mülk) | Gerekçe |
|---|---|---|---|
| `asinmaHizCarpaniPpm` (düzey `asinmaPpmGun` ve `kitlikAsinmaPpmGun`'a çarpan) | 1.000.000 (yok) | **550.000** | Kıtlık aşınması 20.000 → 11.000 ppm/gün (%1,1/gün): tavana 91 günde ulaşır (K6 sonu). asgari 11.000, yüksek −8.250 (tüm hız ×0,55) |
| `asinmaVerimKaybiTavaniPpm` | 400.000 | **300.000** | Çıktı en çok ×0,70; bakımlı/bakımsız tavan oranı 1,43 (bugün 1,67); chain yöntemleri (oran 1,36–1,45) tavanda KD ≥ 0'a yakın (+45…+100 ₺/sa) |
| `genelOnarimMaliyetPpm` | 200.000 | 200.000 (aynı) | Onarım 6 sa duruş (≈ 4,6 saatlik KD) + %20 inşa bedeli; mevcut oran makul. Onar kararı K6'da ana kart (GDD §3C.1a) |
| `genelOnarimDurusSaat` | 6 | 6 (aynı) | - |
| Yeni oyuncu muafiyeti | yok | **gerekmez** | A parametreleriyle gün 14 kaybı −%4,6 (H-B5 tutar) |

**Yönetimsiz yörünge (çıktı değişimi; 60 günlük ortalama ve oran):**

| Parametre | Gün 7 | 14 | 30 | 45 | 60 | 60 g ort. | Tavana varış | Bakımlı/bakımsız (60 g) | (tavan) |
|---|---|---|---|---|---|---|---|---|---|
| mevcut (20.000; %40) | −%5,6 | −%11,2 | −%24,0 | −%36,0 | −%40,0 | −%23,3 | 50 g | 1,304 | 1,667 |
| **A: 11.000; %30** | **−%2,3** | **−%4,6** | **−%9,9** | **−%14,8** | **−%19,8** | −%9,9 | 91 g | 1,110 | 1,429 |
| B: 15.000; %30 | −%3,1 | −%6,3 | −%13,5 | −%20,3 | −%27,0 | −%13,5 | 67 g | 1,156 | 1,429 |
| C: 10.000; %25 | −%1,7 | −%3,5 | −%7,5 | −%11,3 | −%15,0 | −%7,5 | 100 g | 1,081 | 1,333 |

A hedefleri H-B1'i karşılar (gün 14 −%4,6, gün 45 −%14,8, tavan gün 91). B gün 45'te %20'yi aşar ve K6'dan önce tavana varır; C bakımlı/bakımsız oranını 1,08'e indirir (bakım değeri küçük).

**Bakımın net getirisi (₺/sa; 60 gün ortalaması − bakım parçası maliyeti):**

| Yöntem | Bakım parçası ₺/sa | KD ≥ 0 en yüksek tavan | Bugün (çıktıya) | **A (çıktıya)** | A, parça ×1,33 | A + verime uygula |
|---|---|---|---|---|---|---|
| geleneksel_tarim | 100 | yok | 1.300 | 494 | 461 | 494 |
| standart_gida_isleme | 160 | %46 | 2.453 | 949 | 896 | 345 |
| ahir_besi | 100 | %45 | 1.435 | 551 | 518 | 195 |
| yuksek_firin | 300 | %27 | 1.380 | 413 | 314 | **−107** |
| standart_parca | 200 | %18 | 1.480 | 513 | 447 | **−73** |
| degirmen | 160 | %31 | 1.904 | 716 | 663 | 110 |
| ekmek_firini | 160 | %31 | 3.340 | 1.325 | 1.272 | 295 |
| cam_firini | 200 | %31 | 908 | 270 | 204 | **−54** |
| celik_dograma | 200 | %31 | 2.152 | 798 | 732 | 108 |
| kepek_gubresi | 100 | %27 | 488 | 149 | 116 | **−34** |

A (çıktıya uygulama korunur) bütün yöntemlerde net getiriyi pozitif tutar (≥ 149 ₺/sa; kayıp/maliyet ≥ 2,3; en düşük cam fırını 270 + 200 = 470 ↔ 200). **Alternatif B2 "aşınmayı verime uygula (girdi de kısılır)" önerilmez:** KD hiç negatife inmez ama bakım ince marjlı yöntemlerde (`yuksek_firin`, `standart_parca`, `cam_firini`, `kepek_gubresi`) **net negatif** olur; bu H-B3'ü bozar ve O2'nin sanayicide gördüğü yönü (bakım net geliri düşürüyor) kalıcılaştırır. Önerim: çıktıya uygulamayı koru, hızı ve tavanı düşür.

**Diğer öneriler.** (1) **Başlangıç kiti parçası:** dört P4 yapısı indirimli bile ≈ 40,6 parça ister, kit 40; bakıma kalan yok (+5 parça `ilk_isleme` ödülü ≈ 2 sa). Parça kiti ya da ödülün artırılması kod/para etkisi küçüktür ama gün-1 bakım kartı (Esnaf Defteri) gereklidir; bu bir parametre önerisidir (kit 40 → 60 parça, yeni oyuncu kit değeri +3.600 ₺ taban). (2) **Bakım otomatiği (özellik, kod):** `bakim_duzeyi` komutuna `otomatikParca: bayrak` alanı (para taşımaz); açıkken bakım parçası açığı NPC'den otomatik ithal edilir ve bir emir yuvası harcamaz. Parametre önerisinden bağımsızdır ve Y7 temel çizgisini "yönetimli" yapar; K3 işidir, yalnız öneridir. (3) **Ölçüt kaydı (geri dönüşü zor):** Y7 emsali "yönetimli yerleşik" olarak da raporlanmalı; iki temel (yönetimsiz ve yönetimli) paralel sürmeli.

### 2.5 Mülk kipi mi, bölge kipi altınları mı

| Öneri | Etki alanı |
|---|---|
| `mulk.bakim.*` (yeni blok) | **Yalnız mülk kipi.** `sanayi.bakim` (bölge) aynı kalır; bölge kipi altınları değişmez. |
| Yeni yöntemler (`mulkKipi: true`) | Yalnız mülk kipi. Bölge kipinde tesis listesine girmez. |
| `mulk.perakende.*`, `yerelNpc`, dükkân | Yalnız mülk kipi. |
| `bakim_duzeyi.otomatikParca` | Komut alanı eklemesi; protokolde yalnız ekleme, bölge kipinde yok sayılır. |

### 2.6 O2 koşu listesi ve beklenen yön (Operasyon liderine iletilecek)

Durum: istek Ar-Ge lideri → Operasyon liderine iletildi; 1, 2, 3 ve 5. maddeler O2'nin gec60 bakım temel ölçümüyle gelecek, 4. madde kuyruk boşalınca. **Sonuçlar gelene kadar §2.2–§2.4 (doğrulanmadı).**

| # | Koşu | Bayraklar / veri kopyası | Tohum | Beklenen yön |
|---|---|---|---|---|
| R1 | Aşınma yörüngesi ve gelir ayrışması | var olan gec60-temel ve gec60-bakim JSON'larından; yeni koşu gerekmez | 1–10 | Tesis türü başına aşınma gün 5/10/20/30/50/74: tavana ≈ 50. günde varır; 7 günlük net gelir brüt çıktı / aşınma kaybı / işletme / parça ithalatı / onarım ayrışır; ×2,2'nin ×1,67 üstü kısmı H2 (ödeme gücü) ile açıklanır mı? |
| R2 | Parça piyasası | aynı koşular | 1–10 | Bot parça ithalat talebi / NPC arzı (170/sa × ölçek) ≪ 1 ise sorun parça kıtlığı değil bakım yönetimsizliğidir; parça fiyatı/taban medyanı 1,25–1,33 civarı |
| R3 | **A parametreleri, bakım yönetimi kapalı** | `--kip parsel --agir --ad v2-bakimA-temel`, veri kopyası: `sanayi.bakim.kitlikAsinmaPpmGun=11000`, düzeyler `asinmaPpmGun` ×0,55 (asgari 11000, yüksek −8250), `asinmaVerimKaybiTavaniPpm=300000` | 1–10 (bot tohumu 7) | Yerleşik çiftçi 7 günlük gelir medyanı 191 bin → ≈ 220–240 bin (+%15–25); geç çiftçi/emsal %385 → ≈ %310–330; Y7 GEÇTİ; yerleşik sanayicide daha büyük artış (kaldıraç) |
| R4 | A parametreleri, bakım yönetimi açık | aynı + `--bakim-yonetimi` | 1–10 | Yerleşik gelir ≈ 417 bin (değişmez; aşınma yok); bakımlı/bakımsız oranı 2,2 → ≈ 1,6–1,9 (yalnız aşınma kanalı 1,30 → 1,11'e inerse); H2 varsa daha çok düşer |
| R5 | Kısa vade | `--kisa` (24 gün) temel ve bakım | 1–3 | Fark ≤ %10 (aşınma henüz küçük); H-B5 |
| R6 | Tek değişken tarama (isteğe bağlı) | (kitlik, tavan) ∈ {(20000; 400000) taban, (11000; 300000), (15000; 300000), (10000; 250000)} | 1–3 | §2.4 tablosundaki sıra: bakımlı/bakımsız oranı 1,67 → 1,43 → 1,43 → 1,33; Y7 tamponu 1,2× altına inmemeli |
| R7 | Mülk kipi bot davranışı | yalnız kod okuma / rapor | - | Botlar mülk kipinde `bakim_duzeyi` komutu veriyor mu, yoksa varsayılan 1 ile mi koşuyor? Kit 40 parça Tarla bakımına (0,5/sa) 80 saat yeter; üç yapıda 19 saat, P4 zincirinde 0 saat (inşaata gidiyor) |

## 3. Geri dönüşü zor kararlar (A2)

| # | Karar | Neden geri dönüşü zor | Öneri |
|---|---|---|---|
| ZA-1 | **Enerji şebekeden** ve fiyat kuralı (kamu tavanı çarpanı) | Yöntem tarifleri elektrik/yakıt girdisini şebekeyle dengeledi; şebeke fiyat kuralı sonradan değişirse bütün KD ve oran bandı kayar; lavabo kalem adı (`sebeke`) ve `kasaPayiPpm` anlamı para defteri şemasına girer | Kural `kamuFiyatTavani` ile aynı kalsın; santral vaadi O5 (bağımsızlık/büyük ölçek) ya da O3 (kömür ×0,75); fiyat çarpanı parametre |
| ZA-2 | **Tarif sayıları** (değirmen 165/33, fırın 250, cam 50, doğrama 28; cam/doğrama dikeyden sapma) | Yayımlandıktan sonra sayı değişimi canlı ekonomiyi ve bot dengesini kırar; kimlik kilidi yalnız id'yi korur; yöntem yalnız eklenir | Üst-bant tarifler (§1.4); A0-11 ölçümünden önce; cam/doğrama için rapor değerleri geçerli alternatif |
| ZA-3 | **Cam fırınının ev sahibi** (`parca_fabrikasi`, A3 seçti) | Tesis türü `yontemler[]` taşınamaz (uretim K-8); canlı tesisler `tur`/`yontem` ile bağlı | Sayısal olarak doğru (−9.666 ₺, −1 hücre, `standart_parca`'yı geçer) |
| ZA-4 | **`yerelNpc` musluk kalemi, `lavabo.sebeke` ve para defteri sürümü** | Para arzı bir kez yanlış yazılırsa geri sarılamaz; doğrulayıcı şeması | Kalemler yalnız blok açıkken; ZP8 sayacı; tamsayı kasa/lavabo bölme kuralı |
| ZA-5 | **Yerel talep modeli kimliği** (ilçe sınıfı tanımı, `yerelOlcek`, takvim grupları, bayram biçimi, sepet 200 sabit) | Arsa fiyat beklentileri ve dükkân kararları buna dayanır (canlı dünya k10, AÖ-2) | Sayılar parametre, grup adları ve formül biçimi kalıcı; `ilceSinifi` hücre sınıfından türetilir |
| ZA-6 | **Fiyat `secim` kademe sayısı ve indeks anlamı** | Kayıtlı dükkân fiyatları indeksle saklanır; araya kademe eklemek anlamı kaydırır | 4 kademe, yalnız sona eklenir; değerler parametre (üst sınır 1,15) |
| ZA-7 | **`mulkKipi` yöntem bayrağı** ve yöntem sırası | Bölge kipi altınları `yontemler[]` indekslerine ve bot seçimine bağlı | Derleyici süzmesi + altın testi (K3); yalnız sona ekleme |
| ZA-8 | **Bakım blok sınırı** (mülk-yalnız) ve **Y7 temel çizgisi** | `sanayi.bakim` bölge altınlarının parçası; temel çizgi değişince önceki raporlar karşılaştırılamaz | `mulk.bakim` ayrı blok; Y7 hem yönetimsiz hem yönetimli emsalle raporlanır |
| ZA-9 | **Dükkân bedelinde pencere** (P-İthal ↔ P-Yok) | Yalnız veri; ama ilk dükkân akışı ve rehber adımı buna bağlı | A3 seçer; sayıca öneri P-Yok |
| ZA-10 | **`standart_gida_isleme` mülk kipinde ×0,75 yedek düğmesi** ve tetik ölçütü | Oyuncular yönteme bağlanır; canlı dünyada çıktı değişimi tesis tabanını yeniden dengeler; yeni oyuncunun tek basit gıda yolu etkilenir | Varsayılan kapalı; tetik M < %30 (§1.3-B2); açılırsa yalnız yeni oyuncuya, canlı tesislere değil |
| ZA-11 | **Kamu siparişi v0 mal listesi, fiyat (1,03 R) ve `kasaPayiPpm` (%12)** | Sipariş kayıtları mal indeksine ve fiyata bağlı; kasa payı para defterine girer | Liste yalnız sona eklenir; fiyat ve pay parametre; korunum testi (tamsayı) |

## 4. Açık sorular

1. **(Baş lider)** Santral vaadi: O5 (düzelt) mi, O3 (kömür girdisi ×0,75, mülk veri geçersiz kılma) mı, O1/O2 (şebeke satış çarpanı 1,25–1,50 R; G4 metninden sapar) mı? Sayısal öneri O5 + gerekirse O3 (§1.3-B1).
2. **(Baş lider/A3)** Ekmek zinciri +%33,6 K/U ilkesinin (+%10–25) üstündedir; fırın çıktısı 243 ekmekle +%25'e oturur. 250 (A0-11 güvencesi) ile 243 (ilkeye uyum) arasında tercih.
3. **(Baş lider)** `standart_gida_isleme` yedek düğmesi (G2) tetik eşiği X = %30 ve ölçüm koşulu (§1.3-B2) kabul mü? Mülk botlarına yöntem seçici (marjinal net) eklenecek mi (K3)? Bu olmadan M ölçülemez.
4. **(A3/T3)** Cam/doğrama tarifleri dikeyden sapıyor (§1.4): üst bant mı rapor değerleri mi? Dükkân bedeli P-İthal (T3 ana) mı P-Yok (A2 sayıca) mı?
5. **(Baş lider)** `kasaPayiPpm = %12` ve kamu siparişi v0 listesi/fiyatı (1,03 R; 100/50/10/30/20 birim; ≤ 5 sipariş/ilçe/hafta) kabul mü? Şebeke kasa payı yalnız elektrik mi, elektrik + yakıt mı?
6. **(K3)** Şebeke fiyatı canlı referans (`d.pazar.fiyat`) mı yoksa taban mı çarpılacak? Elektrik için `pazar.fiyat` dinamiği çekirdekte koşuldu mu (doğrulanmadı).
7. **(Baş lider/Operasyon)** `yerelOlcek` 50 ve yedi malın `talep1000Saat` değerleri kalibre değil; ilçe nüfusu verisi geldiğinde yeniden kalibre edilmeli. ZP8 payı %45'te: eşik %50 doğru mu?
8. **(Baş lider)** Fiyat kademelerinde üst sınır 1,15 R ve "kampanya" kademesi (yalnız pencerede) kabul mü, yoksa üç kademe mi? Kamu tavan metninde GDD'deki "1,10 R" 1,035 ile düzeltilsin mi?
9. **(O2)** §2.6 R1–R7 sonuçları işlendi (bkz. §2.7); açık kalan: 4. madde duyarlılık taraması, genel onarım koşusu (O2'nin sorusu).
10. **(K3)** `bakim_duzeyi.otomatikParca` ve `mulk.bakim` bloğu çekirdek işi G6–G8'e girer mi yoksa sonraki sprinte mi?
11. **(Operasyon/A1)** İlk dükkân zamanı ölçütü (≤ 36 sa) nakit değil emir yuvası ve inşaat sırası tarafından belirleniyor; insan testinde bu adımlar ayrı ölçülsün.

## Ek A. Betik ve çıktı

`docs/arastirma/p4-p5-ekonomi-hesap.mjs` (Node 22, bağımlılık yok) → `docs/arastirma/p4-p5-ekonomi-hesap-cikti.md`. Bölümler: 0 sabitler, 1 mevcut yöntemler, 2 yeni yöntemler (2.3 kısa/uzun yol, 2.4 uzman, 2.5 kepek + güvence), 3 yapı bedeli, 3.2 enerji ve santral (3.2.1–3.2.5), 4 kanallar, 4.1 kamu siparişi v0, 4.2 kasa payı, 5 dükkân (5.1–5.8: üç tabanlı zincir karşılaştırması 5.7, ev sahibi tesis 5.8), 6 musluk, 7 senaryo 1 (7.1 santralsiz, 7.2 santralli), 8 senaryo 2 (8.1 marj, 8.2 kurulum süresi), 9 çıkmaz mal, 10 bakım. Çıktı deterministiktir (iki koşu `cmp` ile aynı). Raporun §1.x numaraları betiğin bölüm numaralarından farklıdır; tablolar adıyla eşleşir.
