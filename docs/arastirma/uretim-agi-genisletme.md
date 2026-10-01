# Araştırma — Üretim Ağının Genişletilmesi (Karmaşıklık Bütçesiyle)

> **Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi (Ar-Ge dalgası 4). Bu bir **Ar-Ge önerisidir; kod, veri ve başka belge değiştirilmedi.** Fiyat, oran ve kapasite sayıları başlangıç değeridir, **kalibre edilmemiştir**; `icerik.json` / `parametreler.json` ölçeğine (Tarla = 200 birim/sa tahıl, tahıl ₺30, çelik ₺120, parça ₺180) göre hesaplanmış ve her yöntem için çıktı/girdi değeri betikle sınanmıştır (§3.3). Gerçek Türkiye verisi **yalnız ilham ve yön** içindir; kaynakların çoğu haber ve arama özetidir, birincil TÜİK/Bakanlık tablosu okunmadı: "doğrulanmadı" ibaresi taşır (§12). Oyun birimi gerçek kilogram **değildir**; bu bir oyundur, gerçek dönüşüm oranları yuvarlanır ve ara kademeler birleştirilir. "Sezon" yerine "iklim takvimi/dönem" denir.

**Bu rapor neyi tekrar etmez.** [dikey-zincirler-ve-perakende](dikey-zincirler-ve-perakende.md) 7 zinciri (ekmek, alüminyum→doğrama, cam, çelik→doğrama, süt→şarküteri, pamuk→giyim, fındık→şekerleme), pencere kavşağını, 6 dükkân türünü ve kanal ekonomisini verdi; [argelider-sentez-1](argelider-sentez-1.md) ve [12 §10](../12-yon-taslagi.md) Alfa-0 için **23 malı** (14 mevcut + `un`, `ekmek`, `cam`, `pencere`, `sut`, `sut_urunu`, `findik`, `findik_urunu`, `sekerleme`) kilitledi, `tekstil` → `kumas` + `hazir_giyim`, `sarkuteri` mal kimliği değil dükkân türü. [cesitlilik-uretim-katmanlari](cesitlilik-uretim-katmanlari.md) katalog kademelerini (Tier 1/2/3), [il-imza.json](../../packages/veri/icerik/il-imza.json) `ileride` listesini verdi. Bu rapor **bunların üzerine** hayvancılık, tahıl ve sanayi ağlarını, çıkmaz-mal kuralını, karmaşıklık bütçesini ve atölye→fabrika ölçeklerini kurar.

İlgili: [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md) (§3.3 ihtiyaç kademeleri, §4.1 çekim formülü) · [imza-mekanikleri-ve-yonelimler](imza-mekanikleri-ve-yonelimler.md) (K-5 `NpcAlici`, pazar günü, OSB) · [rehber-gorevler](rehber-gorevler.md) (Defter) · [06 §12](../06-simulasyon-spesifikasyonu.md) (ölçek, bakım, kirlilik) · [11 §7.4](../11-urun-donusu.md) (ilçe seviyesi).

---

## 0. Yönetici özeti (10 madde)

1. **Üç ağ, tek ilke: "bir oyuncunun çıktısı ötekinin girdisi".** Hayvancılık (yem → süt/et/yumurta → deri → ayakkabı), tahıl (buğday/arpa/mısır → un/makarna/yem/nişasta) ve sanayi (kireçtaşı → çimento, bakır/alüminyum → kablo, çelik → inşaat demiri/profil) dikey zincirlerin üstüne **10 yeni zincir hattı** ekler (§4); toplam 17 zincir hattı olur. Ağa **24 yeni tarifli mal** girer (21 yeni kimlik + planlı `misir`, `et`, `yun`; Alfa-0 +1, Alfa-1 +15, sonra +8), **32 yeni yöntem** (+ 2 mevcut tarifin yan ürün satırı), yeni tesis türü yok (tek istisna: önceden öngörülen `hafif_sanayi`, §7.4).
2. **Alfa-0'a tek dokunuş: 24. mal `kepek`.** Değirmen çıktısına yan ürün olarak `kepek` eklenir; kepek ahıra gider, ahırın `gubre`si Tarla'ya döner. Böylece 23 malla **ilk kapalı döngü** (Tarla → değirmen → kepek → ahır → gübre → Tarla) Alfa-0'da kurulur; yeni yapı gerekmez, tek yeni kavram "yan ürün"dür (§5.3, §8.5, §9). Kabul edilmezse `kepek` Alfa-1'e kayar; geri dönüşü zor değildir.
3. **Çıkmaz mal yok kuralı ölçülebilir hâle getirildi** (§2.4): her mal en az **iki farklı tüketici türüne** sahiptir (üretim yöntemi, hane talep kalemi, kamu siparişi, yapı maliyeti, ordu ikmali, `NpcAlici` kaydı). Betikle denetlendi (§5.2): dikey raporun tek-tüketicili beş malı (`boksit`, `alumina`, `findik`, `findik_urunu`, `pamuk`) ve bu raporun dört yan ürünü ikinci tüketiciyle bağlandı. Derleme doğrulayıcısına **yetim ve çıkmaz mal testi** eklenmesi önerilir (UA1).
4. **Kısa yol / uzun yol ilkesi (§2.2): karmaşıklığın asıl kontrolü.** Her zincirin Alfa-0 biçimi **kısa yoldur** (ara kademeler birleşik, düşük katma değer, yan ürün yok ya da tek); Alfa-1 **uzun yolu** ekler (ayrık kademeler: yem fabrikası, mezbaha, tabakhane, haddehane; +%10–25 katma değer, yan ürünler, oyuncular arası uzmanlaşma). Kısa yol hiçbir zaman kaldırılmaz (G8). Oyuncu karmaşıklığa **kendisi** girer; kimse zorlanmaz.
5. **Canlı hayvan mal değildir; sürü tesisin ölçeğidir** (§2.1 S1). Tek istisna `kasaplik` (kasaplık hayvan partisi): besi ile mezbahayı ayırır ve `deri`yi doğurur. Koyun/keçi/inek/manda sütü tek `sut`, kırmızı ve beyaz et tek `et`, pamuk/yün/sentetik ipliği tek `iplik` olur: **cins ayrımı mal sayısını şişirmez, yöntem ve il imzasında yaşar.**
6. **Hayvan refahı yeni mekanik değil, mevcut bakım düzeyinin yeni yüzüdür** (§6): `bakim_duzeyi` (asgari/normal/yüksek) hayvan tesislerinde "Sürü Sağlığı" olarak görünür; sağlık çıktıyı ×0,80–1,08 oynatır, `sure_hastaligi` (şap, kuş gribi) ilçe olayı yalnızca düşük sağlığı vurur. Hayvan ölümü gösterilmez, "üretim aksıyor" denir.
7. **Karmaşıklık bütçesi (§8):** mal sayısı üstten sınırlanmaz (cesitlilik S-1) ama **görünen mal** sınırlanır. Önerilen limitler: tek ekranda **≤ 9 mal çipi**, görünen mal başta **≤ 16**, ilk ay **≤ 24**, Alfa-1 sonunda etkin liste **≤ 36** (cesitlilik S-2'nin 28 tavanı bu ağla 36'ya revize edilir), zincir kartı **≤ 4 kademe / ≤ 6 mal**, oyuncu başına haftada **≤ 3 yeni mal**. Katalog: Alfa-0 **24**, A0-ops **28**, Alfa-1 **47**, sonra **55** mal (bu rapor kapsamındaki Tier 1 ağı; imza malları ayrıdır).
8. **Seviye ya da kilit yok, seçim var (sahip kararı; §2.5, §7).** Atölye (S), imalathane (M), fabrika (L) bir ilerleme merdiveni değil, oyuncunun seçtiği üç iş modelidir: isteyen küçük atölyede kalır, isteyen aynı yerde büyür (`tesis_olcek_yukselt`, mevcut), sermayesi olan doğrudan fabrika kurar (öneri: mülk kipinde `tesis_insa_hucre` ve `yapi_yerlestir` komutlarına `olcek` alanı; bölge kipinde `tesis_insa`). **Ayak izi ölçekle büyür** (baş lider kararı: S yuva, M +1, L +2 bitişik hücre; §7.1.1). Tek kısıtlar: sermaye, uygun arsa ve ayak izi, girdi ve elektrik, işletme gideri, adalet korumaları (≤ 72 hücre / %25). İlçe seviyesi, sicil ve "önce küçük ölçek" **kilit değildir**; küçük ilçede büyük fabrikanın zayıf kalması ekonomik sonuçtur (§7.3, Senaryo 3). Ölçek: çıktı ×1/2,2/3,6, işçi ×1/1,8/2,6 (**işçi başına verim ×1,00/1,22/1,38**), kirlilik doğrusal, bakım ×1/2/3,2, inşa ×1/2,5/4,5. Mandıra, mezbaha, tabakhane, yem fabrikası **bina adları yöntemden gelir** (tek `gida_fabrikasi`/`hafif_sanayi`, `yontem_degistir`).
9. **Türkiye bağları (il imza):** Alfa-0 illerinde Kocaeli (Hereke halısı, Kandıra manda sütü, çimento, ark ocakları), Sakarya (mısır, süt/Abhaz, fındık, otomotiv), Bursa (İnegöl köfte ve mobilya, tekstil, çimento); ülke düzeyinde Konya/Gaziantep (un, makarna, makine halısı), Tuzla/Çorlu/Gerede (deri), Denizli (kablo), Bolu/Balıkesir (kümes), Doğu Anadolu (yün, et, süt), Zonguldak/Karabük/Hatay/Kocaeli (çelik). 4 yeni mal kimliği il imza adayı (`deri`, `ayakkabi`, `makine_halisi`, `kablo`); `sarkuteri` mal olarak yerine `et_urunu` önerilir.
10. **Geri dönüşü zor 14 karar (§10), üç oyuncu senaryosu (§4.4):** en önemlisi ilk `icerik.json` sürümünden önce 24 mal kimliğinin kilidi, `et` ve `iplik` gibi birleşik malların **bölünmemesi**, yöntemlerin hangi tesis türünde doğduğu (taşımak canlı tesisleri bozar) ve `kepek`in Alfa-0 veri imzasına girip girmemesi.

---

## 1. Kapsam, mevcut durum ve birimler

### 1.1 Ne var, ne yok

| Konu | Var | Bu rapor ne ekliyor |
|---|---|---|
| Mal | 14 mevcut; Alfa-0 için 23 kilitli; A0-ops +4 (`cimento`, `boksit`, `alumina`, `aluminyum`); Alfa-1 +4 (`pamuk`, `iplik`, `kumas`, `hazir_giyim`) | +24 mal (§3); `misir`, `et`, `yun` il-imza `ileride` listesinde zaten var, burada tarif ve fiyat kazanır |
| Hayvancılık | `ahir_besi` (tahıl → `gida` + `gubre`), `mera_hayvancilik` (→ `gida` + `gubre`); dikey: `sut_sigirciligi`, `peynir_mandira` | Yem, süt, et, yumurta, deri, yün zinciri; mezbaha; sürü sağlığı |
| Tahıl | `tahil` → `standart_gida_isleme` → `gida`; dikey: `degirmen`, `ekmek_firini` | Mısır, arpa, yem, makarna, bisküvi, nişasta, malt; kepek yan ürünü |
| Madencilik/sanayi | 5 çıkarım, `yuksek_firin`, `elektrik_ark`, parça, elektronik; dikey: boksit, alümina, alüminyum, cam, çimento (silisli), doğrama | Kireçtaşı, çimento (kireçtaşılı), kablo, inşaat demiri, profil |
| Ölçek | `olcekKademeleri` S/M/L (L için `gerekliTeknoloji: otomasyon`), `tesis_olcek_yukselt`, `yontem_degistir` | Atölye/imalathane/fabrika adlandırması, **doğrudan kurulum**, ölçek ekonomisi; "seviye ya da kilit yok, seçim var" (§7.0) |
| Topoloji | "çizgi zincir / ağ zinciri" (dikey §2.1) | Çıkmaz-mal kuralı, yan ürün döngüleri, tüketici denetimi |

### 1.2 Birimler ve okuma

- Miktar mili-birim, para mili-₺ (taban fiyat 30 000 = ₺30). Bu belgede tablolar **birim/sa (S ölçek)** ve **₺** verir. Fiyat sütunu ₺; mili için ×1000.
- "Oran" = Σ çıktı × taban / Σ girdi × taban (elektrik ve yakıt dahil, bakım hariç). Hedef bandı **1,15–1,5** (dikey §2.2); ham çıkarım yöntemleri bandın dışındadır.
- "KD/işçi" = (çıktı değeri − girdi değeri) / işçi, ₺/sa. Mevcut hedef 250–400 ([06 §10.5](../06-simulasyon-spesifikasyonu.md)); işçi sayısı serbest ayar sayılır.
- "Öncelik": **A0** (24 mala çıkan Alfa-0), **A0-ops**, **A1**, **S** (sonra).

---

## 2. Tasarım ilkeleri

### 2.1 Sadeleştirme ilkeleri (S1–S12): "bu bir oyun"

| # | İlke | Örnek (bu raporda) |
|---|---|---|
| **S1** | **Canlı hayvan mal değil; sürü tesistir.** İnek, koyun, tavuk sayısı tutulmaz; ahır/mera/kümes ölçeği sürü büyüklüğüdür. İstisna: `kasaplik` (kasaplık hayvan partisi) | Hayvan satın alma, doğum, yaş, kesim kuyruğu yok |
| **S2** | **Oranlar yuvarlanır; kütle korunmaz.** Fiyat sınıfı kütle oranını taşımaz (dikey: süt → süt ürünü 2,2 : 1, gerçek 7,5–12 : 1) | 100 kasaplik → 58 et + 12 deri + 8 gübre (gerçek karkas ≈ %50–55 [K3b]) |
| **S3** | **Cins birleştirilir.** İnek/manda/koyun/keçi sütü = `sut`; kırmızı ve beyaz et = `et`; yün/kıl/tiftik = `yun`; pamuk/yün/sentetik iplik = `iplik`. Cins farkı yöntem ve il imzasındadır | `kumes_pilic` ve `mezbaha_kesim` aynı `et`i verir |
| **S4** | **Sepet malları.** `gida` hane sepetidir (K1); pide, börek, köfte, hazır yemek **mal değil, yöntem varyantıdır** (§4.2). Ayrı mal ancak mal kapısını geçerse (cesitlilik §3: ayrı fiyat, ayrı bozulma, zincirde ayrı ara kademe) | `makarna` ve `biskuvi` ayrı mal (kuru gıda, ihracat, farklı raf); pide `gida` |
| **S5** | **Kısa yol / uzun yol** (§2.2) | Tahıl → süt (kısa) ↔ yem → süt (uzun) |
| **S6** | **Yöntem başına ≤ 3 girdi çeşidi (elektrik ve yakıt hariç) ve ≤ 3 çıktı satırı.** Aşan tarif bölünür | `besi_yemli`: 1 girdi, 2 çıktı |
| **S7** | **Zincir ≤ 4 işleme kademesi.** Beşinci kademe yok; gerekirse iki zincir kavşakta birleşir (dikey: pencere) | deri: besi → mezbaha → tabakhane → atölye (4) |
| **S8** | **Soyut hammadde.** Soda, kil, alçı, boya, kimyasal, ilaç, tuz ayrı mal olmaz; ilgili yöntemin içinde sayılır | `cimento_kalker`: kil ve alçı soyut |
| **S9** | **İki ucundan girilebilirlik.** Her zincir NPC ithalatıyla ortadan başlatılabilir (×1,10, dikey §2.3); tam entegrasyon zorunlu değildir | Yem ithal ya da yerli |
| **S10** | **Kalite stok kalemi açmaz.** Refah ve imza kalitesi mal başına tek `kalitePpm` (cesitlilik Q5) | Yüksek sürü sağlığı → `sut` kalitesi |
| **S11** | **Alkollü içecek ve tütün kapsam dışı** (öneri; sahip sorusu SS-1) | `malt` yalnız alkolsüz malt içeceğine gider |
| **S12** | **Tanıtım hızı (kilit değil):** öne çıkarılan ya da Fırsat Kartı ile önerilen yeni mal ≤ 3/hafta, yeni zincir ≤ 1/hafta; oyuncu isterse her mala erişir (H4 "haftalık yeni karar türü" ile uyumlu; bkz. [cesitlilik-yonetim-askeri-teknoloji](cesitlilik-yonetim-askeri-teknoloji.md), "haftalık yeni karar türü sayımı") | Görünürlük, §8.3 |

### 2.2 Kısa yol / uzun yol (K/U) ilkesi

Her zincirde **iki biçim bir arada yaşar**:

| | **Kısa yol** (Alfa-0 biçimi) | **Uzun yol** (Alfa-1 biçimi) |
|---|---|---|
| Kademe | Birleşik ("ahır tahılı doğrudan yer") | Ayrık ("yem fabrikası → ahır → mezbaha → tabakhane") |
| Katma değer | Düşük, yan ürün yok ya da tek | +%10–25 (hammadde maliyeti ≈ %20–25 düşük), yan ürün satırı |
| Oyuncu sayısı | Tek oyuncu kapalı zincir | Uzmanlaşma ve sözleşme (P5) mümkün; dükkân çeşidi artar |
| Okunurluk | 2–3 mal | 5–8 mal |
| Kimlik | **Hiç silinmez** (G8): yeni yöntem eklenir, eskisi kalır | Yeni yöntem = yeni `id` |

Örnek (süt; `sut_sigirciligi` kısa yol, `ahir_sut_yemli` uzun yol): kısa yolda 90 tahıl (₺2.700) → 85 süt; uzun yolda 80 yem → 100 süt. Yemin ham maliyeti (mısır/arpa/kepek) süt başına ₺24 iken kısa yolda ₺32'dir; fark yem fabrikasının marjını da doğurur (ikinci oyuncuya yer açar). Kısa yolda kalan oyuncu cezalandırılmaz, yalnız daha az çıktı ve yan ürün alır. **Kısa/uzun yol bir yayın aşamasıdır, oyuncu basamağı değildir:** içerik yayımlandığında her yola erişim serbesttir; "önce kısa yolu bitir" gibi bir kilit yoktur.

### 2.3 Zincir sınırları

- Zincir uzunluğu ≤ 4 işleme kademesi (S7); ağ zincirinde en çok 2 kol birleşir.
- Bir ilde zinciri kapatmak her zaman mümkündür (il içi taşıma bedava); iller arası taşıma gerçek karardır (dikey §1.2).
- Bir yöntemin çıktısı en çok 1 ana + 2 yan ürün; yan ürün yöntemin KD'sinin ≤ %40'ı kadar değer taşır (yan ürün ana ürünü gölgelemesin).

### 2.4 "Çıkmaz mal yok" kuralı ve tüketici tanımı

**Tüketici türleri** (her biri veri kaydıdır, denetlenebilir):

| Kod | Tür | Veri kaynağı |
|---|---|---|
| **Ü** | Üretim yöntemi girdisi | `yontemler[].girdiler` |
| **H** | Hane talep kalemi (K1 temel, K2 giyim ve ev; [canli-dunya §3.3](canli-dunya-simulasyonu.md)) ve dükkân rafı | dükkân türü raf listesi |
| **K** | Kamu siparişi (okul yemeği, yol, şebeke, onarım; sabit fiyatlı v0, tavan = ithalat paritesi) | kamu sipariş türleri |
| **Y** | Yapı maliyeti (yeni yapılar ve ölçek yükseltme; G23: yalnız yeni yapılara) | `insaMaliyeti` |
| **O** | Ordu ikmali | birim `ikmal` |
| **N** | `NpcAlici` kaydı (bütçeli, bayram/dönem dalgalı, kapsamlı: ihracatçı heyeti, hayvan pazarı, gurbetçi, zincir market, çiftçi birliği; [imza K-5](imza-mekanikleri-ve-yonelimler.md)) | `NpcAlici` tablosu |

**Kural.**
1. Her mal **en az iki farklı tür** tüketiciye sahiptir; **ara ve son malların** en az biri **Ü, H, K, Y ya da O** (oyun içi gerçek talep) olur.
2. **Kaynak mallar** (ham maden ve tarım) için ikinci tüketici `N` olabilir (ihracatçı heyeti; bütçeli, makassız para basmaz: K-5).
3. **Yan ürünler** (kepek, gübre, deri, kepekli posa) en az bir Ü tüketicisine ve bir `N` güvence alıcısına sahiptir; güvence alıcı bütçesi küçüktür, fiyatı R'nin %50'sine sabittir (yan ürün çöpe gitmez ama değerlendirmek kazançlıdır).
4. **Derleme doğrulayıcısı:** `mallar[]` içinde bu kurala uymayan mal derleme hatasıdır (§5.2, UA1).

### 2.5 Sahip ilkesi: seviye ya da kilit yok, seçim var

Sahip kararı (Ar-Ge lideri aktardı): **ölçek ve kademeler (üretimhane, atölye, fabrika, S/M/L) bir ilerleme merdiveni değil, oyuncunun seçtiği iş modelleridir.** İsteyen küçük üretimhanede kalır, isteyen aynı yerde büyür, sermayesi olan doğrudan büyük fabrika kurar. Tek kısıtlar: sermaye; uygun arsa ve ayak izi (kullanım türü, arsa nitelikleri, kaynak/damar); girdi ve elektrik; işletme gideri; adalet korumaları (≤ 72 hücre / %25). **Açılış kilidi olarak kullanılmayanlar:** "önce küçük ölçek", "önce X günlük sicil", ilçe seviyesi şartı; teknoloji düğümleri **yöntem** açar, ilerleme fazı gibi sunulmaz. Küçük ilçede büyük fabrikanın zayıf kalması **ekonomik sonuçtur** (§7.3). Bu rapordaki tüm "kademe" sözcükleri **yayın aşamasını** (içeriğin ne zaman eklendiğini) anlatır, oyuncunun basamağını değil. Ayrıntı §7.0; geri dönüşü zor karar K-13.

---

## 3. Mal katalogu ve taban fiyat önerisi

### 3.1 Kimlik ilkeleri ve çakışma denetimi

- ASCII Türkçe, küçük harf, alt çizgi (00 K11); yayımlandıktan sonra kalıcı (G8: dizilere yalnız sona ekleme).
- **Yasak:** `tekstil`, `sarkuteri`. Bu raporun 21 yeni kimliği `docs/` ve `packages/veri` içinde **grep ile çakışmasız** doğrulandı: `kepek`, `arpa`, `yem`, `makarna`, `biskuvi`, `nisasta`, `malt`, `icecek`, `kasaplik`, `yumurta`, `deri`, `islenmis_deri`, `ayakkabi`, `canta`, `mont`, `makine_halisi`, `et_urunu`, `kirectasi`, `kablo`, `insaat_demiri`, `profil` (+ zaten planlı `misir`, `et`, `yun`).
- **Düzeltme önerisi:** il-imza `ileride` ve Tier 2 tablosundaki `sarkuteri` ("Pastırma ve Sucuk", Kayseri, Kastamonu, Afyonkarahisar) → **`et_urunu`**; `et` adı "Et ve Kümes" → "Et" (kümes eti de `et`tir).
- Mevcut `misir` (il-imza: Sakarya imza, Adana aday), `yun` (16 il imza) ve `et` (4 il aday) tarif kazanır, kimlikleri değişmez.

### 3.2 Yeni mallar (24): aile, fiyat, bozulma, pazar derinliği

Kategori sütunu mevcut `kategori` alanına uyar (`ham`, `ara`, `tuketim`). `emilim/arz` birim/sa; oran ≈ 1,4–1,6 (mevcut kalıp). Bozulma ppm/gün; `lojistikOnceligi` taşıma sırası (düşük = önce).

| # | `id` | Ad | Aile | Kategori | Taban ₺ (mili) | Bozulma | Loj. | Emilim/Arz | Öncelik |
|---:|---|---|---|---|---:|---:|---:|---|---|
| 1 | `kepek` | Kepek | Tahıl ve Gıda | ara (yan ürün) | 18 (18 000) | 6 000 | 4 | 120 / 80 | **A0 (öneri)** |
| 2 | `misir` | Mısır | Tahıl ve Gıda | ham | 28 (28 000) | 6 000 | 4 | 220 / 150 | A1 |
| 3 | `arpa` | Arpa | Tahıl ve Gıda | ham | 32 (32 000) | 3 000 | 4 | 200 / 130 | A1 |
| 4 | `yem` | Hayvan Yemi | Hayvancılık | ara | 45 (45 000) | 6 000 | 3 | 220 / 150 | A1 |
| 5 | `makarna` | Makarna | Tahıl ve Gıda | tuketim | 95 (95 000) | 1 500 | 3 | 100 / 65 | A1 |
| 6 | `kasaplik` | Kasaplık Hayvan | Hayvancılık | ham | 70 (70 000) | 40 000 | 1 | 120 / 80 | A1 |
| 7 | `et` | Et | Hayvancılık | tuketim | 110 (110 000) | 60 000 | 1 | 150 / 100 | A1 |
| 8 | `yumurta` | Yumurta | Hayvancılık | tuketim | 50 (50 000) | 40 000 | 1 | 160 / 110 | A1 |
| 9 | `yun` | Yün ve Tiftik | Tekstil ve Deri | ham | 60 (60 000) | 1 000 | 4 | 80 / 55 | A1 |
| 10 | `deri` | Ham Deri | Tekstil ve Deri | ham (yan ürün) | 60 (60 000) | 15 000 | 3 | 60 / 40 | A1 |
| 11 | `islenmis_deri` | İşlenmiş Deri | Tekstil ve Deri | ara | 135 (135 000) | 1 000 | 5 | 80 / 55 | A1 |
| 12 | `ayakkabi` | Ayakkabı | Tekstil ve Deri | tuketim | 300 (300 000) | 1 500 | 7 | 70 / 45 | A1 |
| 13 | `kirectasi` | Kireçtaşı | Yapı ve Maden | ham | 20 (20 000) | 500 | 6 | 220 / 150 | A1 |
| 14 | `kablo` | Kablo | Yapı ve Maden | ara | 120 (120 000) | 1 000 | 5 | 100 / 65 | A1 |
| 15 | `insaat_demiri` | İnşaat Demiri | Yapı ve Maden | ara | 165 (165 000) | 2 000 | 5 | 160 / 110 | A1 |
| 16 | `profil` | Çelik Profil | Yapı ve Maden | ara | 190 (190 000) | 1 500 | 5 | 120 / 80 | A1 |
| 17 | `biskuvi` | Bisküvi | Tahıl ve Gıda | tuketim | 100 (100 000) | 4 000 | 3 | 80 / 50 | S |
| 18 | `nisasta` | Nişasta | Tahıl ve Gıda | ara | 60 (60 000) | 2 000 | 4 | 90 / 60 | S |
| 19 | `malt` | Malt | Tahıl ve Gıda | ara | 70 (70 000) | 3 000 | 4 | 70 / 45 | S |
| 20 | `icecek` | Alkolsüz İçecek | Tahıl ve Gıda | tuketim | 70 (70 000) | 4 000 | 2 | 120 / 80 | S |
| 21 | `canta` | Çanta | Tekstil ve Deri | tuketim | 340 (340 000) | 1 500 | 7 | 40 / 25 | S |
| 22 | `mont` | Deri Mont | Tekstil ve Deri | tuketim | 520 (520 000) | 1 500 | 7 | 40 / 25 | S |
| 23 | `makine_halisi` | Makine Halısı | Tekstil ve Deri | tuketim | 250 (250 000) | 1 500 | 7 | 60 / 40 | S |
| 24 | `et_urunu` | Et Ürünleri | Hayvancılık | ara/tuketim | 190 (190 000) | 8 000 | 3 | 70 / 45 | S |

**Sayım.** Tabloda 24 satır vardır: 21 yeni kimlik + zaten planlı üç kimlik (`misir`, `et`, `yun`; il-imza `ileride`/Tier 1-2 listelerinde). **Kimlik kilidi için bağlayıcı küme bu 24 maldır** (§10 K-1). Öncelik dağılımı: A0 1 (`kepek`), A1 15, S 8.

Fiyat tutarlılığı: `kepek` 18 < `tahil` 30 < `arpa` 32 < `yem` 45 < `un` 50 < `makarna` 95 < `et` 110 < `kablo` 120 sıralaması mevcut kalıpla (`gida` 70, `celik` 120, `parca` 180) uyumludur. `deri` ham yan üründür; fiyatı mezbahayı ana kazanç yapmaz (yan ürün ≤ %40 kuralı).

### 3.3 Yöntem sınaması (betik)

Her yeni yöntem için çıktı/girdi değeri hesaplanmıştır (S ölçek, birim/sa). İşçi sayısı serbest ayardır; KD/işçi hedefi 250–400.

| Yöntem | Tesis | Girdi → çıktı | Oran | İşçi | KD/işçi | Öncelik |
|---|---|---|---:|---:|---:|---|
| `degirmen` (kepekli) | `gida_fabrikasi` | 200 tahıl + 12 elektrik → 150 un + **30 kepek** | 1,31 | 5 | 384 | A0 |
| `sut_sigirciligi` (gübreli) | `ahir` | 90 tahıl + 5 elektrik → 85 süt + **4 gübre** | 1,44 | 6 | 201 | A0 |
| `sut_kepekli` | `ahir` | 50 tahıl + 60 kepek + 5 elektrik → 82 süt + 4 gübre | 1,46 | 5 | 242 | A0 |
| `yem_misirli` | `gida_fabrikasi` | 70 mısır + 30 kepek + 8 elektrik → 85 yem | 1,48 | 4 | 311 | A1 |
| `yem_arpali` | `gida_fabrikasi` | 70 arpa + 30 kepek + 8 elektrik → 82 yem | 1,29 | 3 | 276 | A1 |
| `makarna_hatti` | `gida_fabrikasi` | 100 un + 18 elektrik + 6 yakıt → 90 makarna | 1,48 | 6 | 461 | A1 |
| `ahir_sut_yemli` | `ahir` | 80 yem + 5 elektrik → 100 süt + 6 gübre | 1,33 | 5 | 238 | A1 |
| `besi_yemli` | `ahir` | 120 yem + 6 elektrik → 90 kasaplik + 10 gübre | 1,41 | 5 | 448 | A1 |
| `kumes_yumurta` | `ahir` | 70 yem + 8 elektrik → 80 yumurta + 3 gübre | 1,37 | 4 | 297 | A1 |
| `kumes_pilic` | `ahir` | 100 yem + 8 elektrik → 45 et + 5 gübre | 1,23 | 4 | 267 | A1 |
| `mezbaha_kesim` | `gida_fabrikasi` | 100 kasaplik + 10 elektrik → 55 et + 20 deri + 8 gübre | 1,18 | 4 | 317 | A1 |
| `mera_koyun_yun` | `mera` | — → 40 yün + 30 kasaplik + 3 gübre | ham | 9 | 546 | A1 |
| `mera_sutculuk` (dikey yöntemi, sayıları burada) | `mera` | — → 60 süt + 3 gübre | ham | 9 | 313 | A1 |
| `hamur_isi_firini` | `gida_fabrikasi` | 60 un + 20 süt ürünü + 12 yakıt + 12 elektrik → 125 gıda | 1,30 | 6 | 338 | A1 |
| `hazir_yemek` | `gida_fabrikasi` | 40 un + 25 et + 10 süt ürünü + 10 yakıt + 12 elektrik → 130 gıda | 1,29 | 7 | 290 | A1 |
| `tabaklama` | `hafif_sanayi` | 20 deri + 2 yakıt + 3 elektrik → 14 işlenmiş deri | 1,32 | 2 | 230 | A1 |
| `ayakkabi_atolyesi` | `hafif_sanayi` | 14 işlenmiş deri + 3 petrokimya + 4 elektrik → 11 ayakkabı | 1,40 | 3 | 316 | A1 |
| `yun_egirme` | `hafif_sanayi` | 40 yün + 7 elektrik → 27 iplik | 1,42 | 3 | 346 | A1 |
| `kirectasi_cikarim` | maden ailesi | 5 elektrik → 100 kireçtaşı | ham | 8 | 243 | A1 |
| `cimento_kalker` | `celikhane` | 50 kireçtaşı + 12 kömür + 8 elektrik → 45 çimento | 1,41 | 3 | 195 | A1 |
| `cam_kalkerli` | `celikhane` | 52 silis + 10 kireçtaşı + 18 yakıt + 20 elektrik → 52 cam | 1,41 | 5 | 288 | A1 |
| `kablo_bakir` | `parca_fabrikasi` | 60 bakır + 8 petrokimya + 15 elektrik → 50 kablo | 1,41 | 6 | 288 | A1 |
| `kablo_iletim_al` | `parca_fabrikasi` | 14 alüminyum + 6 çelik + 12 elektrik → 65 kablo | 1,36 | 6 | 343 | A1 |
| `insaat_demiri` | `celikhane` | 100 çelik + 8 yakıt + 20 elektrik → 95 inşaat demiri | 1,21 | 7 | 382 | A1 |
| `profil_haddeleme` | `celikhane` | 100 çelik + 10 yakıt + 25 elektrik → 90 profil | 1,29 | 7 | 550 | A1 |
| `celik_dograma_profilli` | `parca_fabrikasi` | 20 profil + 32 cam + 6 parça + 15 elektrik → 30 pencere | 1,34 | 5 | 546 | A1 |
| `canta_atolyesi` | `hafif_sanayi` | 10 işlenmiş deri + 3 kumaş + 3 elektrik → 8 çanta | 1,37 | 3 | 246 | S |
| `mont_atolyesi` | `hafif_sanayi` | 14 işlenmiş deri + 5 kumaş + 4 elektrik → 8 mont | 1,42 | 4 | 307 | S |
| `makine_halisi_dokuma` | `hafif_sanayi` | 80 iplik + 25 elektrik → 60 makine halısı | 1,41 | 9 | 483 | S |
| `biskuvi_hatti` | `gida_fabrikasi` | 70 un + 10 yumurta + 20 gıda + 8 yakıt + 20 elektrik → 90 bisküvi | 1,41 | 7 | 371 | S |
| `nisasta_degirmeni` | `gida_fabrikasi` | 100 mısır + 15 elektrik → 60 nişasta + 25 kepek | 1,37 | 4 | 275 | S |
| `malt_evi` | `gida_fabrikasi` | 100 arpa + 10 yakıt + 10 elektrik → 80 malt + 10 kepek | 1,34 | 5 | 296 | S |
| `icecek_hatti` | `gida_fabrikasi` | 50 malt + 4 yakıt + 10 elektrik → 80 içecek | 1,40 | 5 | 320 | S |
| `et_isleme` | `gida_fabrikasi` | 60 et + 5 yakıt + 12 elektrik → 50 et ürünü | 1,32 | 7 | 325 | S |
| `sekerleme_nisastali` | `gida_fabrikasi` | 60 nişasta + 20 gıda + 5 yakıt + 12 elektrik → 45 şekerleme | 1,44 | 6 | 413 | S |

Notlar: (a) `degirmen` ve `sut_sigirciligi` **dikey rapordaki kilitli tariflerin yan ürün satırı eklenmiş biçimidir**; G8 gereği mevcut yöntem silinmez: ya yeni satır Alfa-0 verisi yazılmadan önce yöntemin kendisine işlenir (önerilen; veri henüz doğmadı) ya da `_kepekli` adıyla yeni yöntem eklenir (§10 K-4). (b) `ayakkabi_atolyesi` ve `kablo_bakir` `petrokimya` ister ([cesitlilik S-Z2](cesitlilik-uretim-katmanlari.md), Kocaeli imzası); `petrokimya` yoksa NPC ithalatıyla (×1,10) alınır (S9). (c) `cimento_kalker` dikeydeki silisli `cimento_firini`yi **silmez**; Alfa-1'de ek yöntem olur (kimlik ve Alfa-0 verisi korunur). (d) `profil_haddeleme` KD/işçi 550 yüksektir: ağ zincirinin ara kademesi bilerek en kârlı kademedir (dikey §2.2 notu b). (e) Gerçekte 1 t klinker için ≈ 1,52–1,65 t hammadde gerekir [K12]; oyunda kireçtaşı → çimento 1,1 : 1'dir (S2: fiyat sınıfı kütle oranını taşımaz).

### 3.4 Pazar ve yer kapsamı

Önerilen `emilimSaat/arzSaat` (§3.2) tek tesisin ihracatında fiyat/taban ≥ 0,9 hedefini korur. Yeni malların hepsi **il düğümünde stoklanır**; il içi taşıma bedavadır. Canlı/bozulan malların (`kasaplik`, `et`, `yumurta`) aynı ilçe/komşu ilçe kuralı yoktur ama yüksek bozulma ppm'i iller arası taşımayı pahalı yapar (doğal yerellik).

### 3.5 Bu raporun kapsamı dışında kalan, ağa bağlanan Tier 1 malları

`petrokimya` (S-Z2, Alfa-1 ön koşulu: ayakkabı, kablo), `taze` (içecek ve hazır yemek için olası), `kereste`/`mobilya` (deri döşeme, Alfa-1+), `arac` (kablo demeti ve deri koltuk, Sonra), `odun`, `kagit` (nişasta tüketicisi). Bunlar bu rapor tarafından **tanımlanmaz**, yalnız tüketici/üretici olarak anılır.

---

## 4. Zincirler

Her zincir: mal kimlikleri, yapı/yöntem, girdi→çıktı (yuvarlanmış), taban fiyat (§3.2), il imza ilişkisi, öncelik, gerçek dayanak. Yöntem tarifleri §3.3'tedir; burada akış ve ilişki yazılır.

### 4.1 Hayvancılık ağı

**Gerçek dayanak [K2, K3, K4, K11].** 2025'te büyükbaş 17,7 milyon (sığır 17,54 M, manda 0,16 M), küçükbaş 57,9 milyon (koyun 46,7 M, keçi 11,2 M) baş; çiğ süt 21,4 milyon ton (%94,5 inek), kırmızı et 1,885 milyon ton (sığır 1,313 M, koyun 0,468 M); aylık tavuk eti ≈ 232–252 bin ton ve yumurta ≈ 1,6–1,9 milyar adet (2025–2026); karma yem 2025'te 30,7 milyon ton (büyük/küçükbaş 18,2 M, kanatlı 11,2 M; hammaddenin %54'ü ithal). 2025'te kırmızı et −%10,5 ve çiğ süt −%4,9 azalmıştır; şap hastalığı ve fiyat baskısı sebep olarak bildirilmiştir (doğrulanmadı) ve §6'daki sürü sağlığı olayının gerçek dayanağıdır.

```
                         ┌──► sut ──► (mandıra) sut_urunu ──► dükkân / hamur_isi / hazır_yemek
 tahil/misir/arpa/kepek ─► yem ─► ahır ─┼──► kasaplik ──► (mezbaha) et ──┬──► et_urunu / hazır_yemek / dükkân
   (yem fabrikası)                      │                          ├──► deri ──► (tabakhane) islenmis_deri ──► ayakkabi/canta/mont
                                        │                          └──► gubre
                      kümes ◄─ yem ─────┼──► yumurta ──► biskuvi / hamur_isi / dükkân
                                        └──► et (piliç, kesim içeride)
 mera ──► yun ──► (iplik) ──► kumas / makine_halisi ;  mera ──► kasaplik ──► mezbaha
 gubre (hepsi) ──────────────────────────────────────────────────► Tarla (gübre dozu) ──► tahil/misir/arpa
```

#### H1 — Süt ve yem döngüsü (A0 kısa yol, A1 uzun yol)

| Kademe | Yapı (yöntem) | Girdi → çıktı (S, birim/sa) | Oran | Öncelik |
|---|---|---|---:|---|
| Değirmen (yan ürün) | `gida_fabrikasi` (`degirmen`) | 200 tahıl → 150 un + **30 kepek** | 1,31 | A0 |
| Ahır, kısa yol | `ahir` (`sut_sigirciligi`, `sut_kepekli`) | 90 tahıl → 85 süt + 4 gübre / 50 tahıl + 60 kepek → 82 süt + 4 gübre | 1,44–1,46 | A0 |
| Yem fabrikası | `gida_fabrikasi` (`yem_misirli`, `yem_arpali`) | 70 mısır (arpa) + 30 kepek → 85 (82) yem | 1,29–1,48 | A1 |
| Ahır, uzun yol | `ahir` (`ahir_sut_yemli`) | 80 yem → 100 süt + 6 gübre | 1,33 | A1 |
| Mandıra | `gida_fabrikasi` (`peynir_mandira`, dikey) | 150 süt → 68 süt ürünü | 1,34 | A0 |
| Mera (koyun/keçi sütü) | `mera` (`mera_sutculuk`, dikey) | — → 60 süt + 3 gübre | ham | A1 |

- **Mısır mı arpa mı?** `yem_misirli` ve `yem_arpali` bir **bölge kimliği tarif takasıdır** (dikey §2.3 ilke 3): mısır Sakarya/Adana (Çukurova) ve Karadeniz ovası, arpa İç Anadolu. Karma yem (30 kepek) değirmenle bağlanır.
- **Eşleşme.** 1 değirmen (30 kepek) ≈ 1 yem fabrikası (30 kepek) ≈ 1 ahır (80 yem); Anno tipi 1:1:1, ölçek kademeleriyle (S/M/L) oran bulmacası.
- **İl imza ilişkisi:** `sut` (14 il aday: Konya, Yozgat, Erzurum…; Kandıra manda Kocaeli; Abhaz peyniri Sakarya), `sut_urunu` imzası (Kayseri, Kastamonu, Afyonkarahisar), `misir` (Sakarya imza, Adana aday). Alfa-0 illerinde Kocaeli (Kandıra), Sakarya (Arifiye mısır, Abhaz) doğal başlangıçtır.

#### H2 — Et ve deri zinciri (A1 uzun yol)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran |
|---|---|---|---:|
| Besi | `ahir` (`besi_yemli`) | 120 yem → 90 kasaplik + 10 gübre | 1,41 |
| Mera (koyun/keçi) | `mera` (`mera_koyun_yun`) | — → 40 yün + 30 kasaplik + 3 gübre | ham |
| **Mezbaha** | `gida_fabrikasi` (`mezbaha_kesim`) | 100 kasaplik → 55 et + 20 deri + 8 gübre | 1,18 |
| **Tabakhane** | `hafif_sanayi` (`tabaklama`) | 20 deri → 14 işlenmiş deri | 1,32 |
| Atölye | `hafif_sanayi` (`ayakkabi_atolyesi`; sonra `canta_atolyesi`, `mont_atolyesi`) | 14 işlenmiş deri + 3 petrokimya → 11 ayakkabı | 1,40 |
| Et işleme | `gida_fabrikasi` (`et_isleme`, S) | 60 et → 50 et ürünü | 1,32 |

- **Eşleşme 1 : 1 : 1 : 1.** 1 besi S (90 kasaplik) ≈ 1 mezbaha S (100) ≈ 1 tabakhane S (20 deri) ≈ 1 ayakkabı atölyesi S (14 işlenmiş deri): her halka bir öncekinin çıktısıyla ≈ %90 yükte çalışır (Senaryo 2, §4.4).
- **Deri ürünleri üç mal, tek zincir.** `ayakkabi` (A1, K2 giyim talebi, okul açılışı dalgası), `canta` ve `mont` (S): `mont` kış talebine ve `kumas` astarına bağlıdır (kış fırtınası olayı talebi artırır, toplam sabit; K-5). Üçü aynı `islenmis_deri` havuzundan beslenir (ikinci tüketici: mobilya ve araç döşemesi, Sonra).
- **Kasaplık hayvan neden mal?** İstisna S1: mezbaha, besi ve mera arasında **uzmanlaşmayı** (A1 sözleşme P5) ve **deri yan ürününü** mümkün kılar. İkinci tüketici: **hayvan pazarı** `NpcAlici` (haftalık pazar günü; imza mekaniği), bayram haftasında et talebi ×1,6 (toplam sabit, dini bayram yalnız hatırlatma ve talep zamanlaması).
- **Mezbaha kirlilik ve hijyen:** `kirlilikPpmSaat` 50; tabakhane 90 (§7.3). Gerçekte deri işleme **organize sanayi bölgelerine toplanmıştır** (Tuzla Deri OSB: 223 fabrika, günlük 36 000 m³ arıtma, 1992'den beri; Çorlu Deri OSB) [K6]; oyunda `tabaklama` **yalnız Sanayi Adası (OSB) hücresinde ya da arıtma modülüyle M+ ölçekte** kurulur (ağır sanayi komşuluk kuralı; [cesitlilik §5.4](cesitlilik-uretim-katmanlari.md)).
- **İl imza ilişkisi:** `et` (Bitlis, Bolu, Erzurum, Gümüşhane aday), İnegöl köftesi (Bursa, coğrafi işaretli), pastırma/sucuk (Kayseri, Kastamonu, Afyonkarahisar; `et_urunu`); deri: İstanbul (Tuzla), Tekirdağ (Çorlu), Bolu (Gerede) (doğrulanmadı, [K6]); ayakkabı: İstanbul, Gaziantep, İzmir (doğrulanmadı). `deri` ve `ayakkabi` Tier 2 imza adaylarıdır.
- **Gerçek dayanak [K6]:** deri ve deri mamulleri ihracatı 2025'te ≈ 1,8 milyar $ (−%7,6), ayakkabı payı ≈ %55; ham ve işlenmiş deri ihracatı ≈ 185 milyon $ (arama özeti, doğrulanmadı). Ayakkabı ve çanta ihracat malıdır: `NpcAlici` ihracatçı heyeti ikinci tüketicidir.

#### H3 — Kümes: yumurta ve piliç eti (A1)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran |
|---|---|---|---:|
| Kümes (yumurta) | `ahir` (`kumes_yumurta`) | 70 yem → 80 yumurta + 3 gübre | 1,37 |
| Kümes (piliç) | `ahir` (`kumes_pilic`) | 100 yem → 45 et + 5 gübre | 1,23 |

- **Sadeleştirme:** kanatlı kesim kümes yönteminin içindedir (ayrı mezbaha gerekmez; S1/S2); piliç eti doğrudan `et`tir. L ölçekte yoğunluk nedeniyle sağlık tavanı 0,9'dur; modern kümes modülü (satın alınan bir seçim) tavanı 1,0 yapar (§6.1); kilit yoktur.
- **Tüketiciler:** `yumurta` → `biskuvi_hatti`, bakkal/market rafı, okul yemeği (kamu); `et` → et işleme, hazır yemek, kasap/market rafı, hane K1.
- **İl imza:** Bolu (et aday), Balıkesir (Bandırma), Sakarya (doğrulanmadı, [K4, K14]). Yumurta il imzası yok (genel mal).
- **Gerçek:** tavuk eti ve yumurta üretimi 2025–2026'da artıştadır; `kumes_pilic` düşük oranı (1,23) piliç etinin rekabetçi ve düşük marjlı olduğunu yansıtır.

#### H4 — Yün, iplik ve halı (A1; halı S)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran |
|---|---|---|---:|
| Mera | `mera` (`mera_koyun_yun`; koyun/keçi sütü için `mera_sutculuk`) | — → 40 yün + 30 kasaplik / — → 60 süt | ham |
| İplik | `hafif_sanayi` (`yun_egirme`) | 40 yün → 27 iplik | 1,42 |
| Dokuma | `hafif_sanayi` (`kumas_dokuma`, dikey) | 80 iplik → 76 kumaş | 1,43 |
| Makine halısı | `hafif_sanayi` (`makine_halisi_dokuma`, S) | 80 iplik → 60 makine halısı | 1,41 |
| El halısı (zanaat) | usta atölyesi (cesitlilik §5.3) | `ipek` + `yun` → `hali` | 2–4× |

- **İki halı:** `makine_halisi` fabrika ürünüdür (S ölçek tavanı yok; Gaziantep); `hali` Hereke tipi **el halısıdır**, zanaat ailesidir (F5 ₺900, ölçek tavanı S/M, sipariş-bazlı). Bu rapor `hali`yi değiştirmez. Gerçek halı ihracatı 2025'in ilk 9 ayında ≈ 2,0 milyar $ ve makine halısı payı ≈ %75 (Gaziantep'in payı çoğunluk) [K10].
- **İp ve kumaşın iki yünü, bir mal:** `iplik` pamuk (dikey), yün (burada) ve sentetik (Sonra, `petrokimya`) kaynaklarının ortak malıdır (S3); böylece `kumas` ve `makine_halisi` kaynak seçimini taşımaz.
- **İl imza:** `yun` (Ağrı, Ankara/tiftik, Bingöl, Elazığ, Erzincan, Erzurum, Hakkâri, Kars, Muş, Sivas, Tunceli, Van, Bayburt, Şırnak, Ardahan; 16 il imzası), `hali` (Kocaeli/Hereke), `dokuma_zanaat` (Kandıra, Siirt, Bayburt, Tokat), `makine_halisi` (Gaziantep) yeni imza adayı.

### 4.2 Tahıl ağı

**Gerçek dayanak [K1, K5, K11].** 2025'te buğday 17,9 milyon ton (−%13,7), arpa 6,0 milyon ton (−%25,9), mısır 8,5 milyon ton (+%4,9; kuraklık yılı); Türkiye 2005'ten beri dünyanın en büyük un ihracatçısı (≈ %23 pay), makarna ihracatında ikinci; un üretim kapasitesi ≈ 32 milyon ton, kullanım ≈ %45–50 (arama özeti, doğrulanmadı); büyük un fabrikaları İç Anadolu'da (Konya, Eskişehir, Ankara) ve büyük kentlerde (İstanbul, İzmir, Adana, Bursa) kümelidir.

```
 tahil ─► (değirmen) ─┬─► un ─┬─► (ekmek fırını) ─► ekmek ─┬─► dükkân/kamu ; bayat ekmek ─► yem (döngü)
   ▲                  │       ├─► (makarna hattı) ─► makarna ─► dükkân/ihracat/kamu
   │                  │       ├─► (bisküvi hattı) ─► biskuvi ─► dükkân/ihracat
   │                  │       └─► (hamur işi / hazır yemek) ─► gida   [pide, börek, köfte: yöntem varyantı]
   │                  └─► kepek ─► (yem fabrikası) ─► yem ─► ahır/kümes ─► gubre ─┐
 misir ─┬─► (yem fabrikası) ─► yem                                                 │
        └─► (nişasta) ─► nisasta ─► (sekerleme_nisastali) ─► sekerleme / kagit     │
 arpa ──┬─► (yem fabrikası) ─► yem                                                 │
        └─► (malt evi) ─► malt ─► (içecek hattı) ─► icecek                          │
 Tarla ◄───────────────────────────────────────────────────────────────────────────┘
```

#### T1 — Un ve unlu mamuller (A0 un/ekmek; A1 makarna; S bisküvi)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran | Öncelik |
|---|---|---|---:|---|
| Değirmen | `gida_fabrikasi` (`degirmen`) | 200 tahıl → 150 un + 30 kepek | 1,31 | A0 |
| Ekmek fırını | `gida_fabrikasi` (`ekmek_firini`, dikey) | 150 un → 225 ekmek | 1,37 | A0 |
| **Makarna hattı** | `gida_fabrikasi` (`makarna_hatti`) | 100 un → 90 makarna | 1,48 | A1 |
| **Hamur işi / pide** | `gida_fabrikasi` (`hamur_isi_firini`) | 60 un + 20 süt ürünü → 125 gıda | 1,30 | A1 |
| **Hazır yemek** | `gida_fabrikasi` (`hazir_yemek`) | 40 un + 25 et + 10 süt ürünü → 130 gıda | 1,29 | A1 |
| **Bisküvi hattı** | `gida_fabrikasi` (`biskuvi_hatti`) | 70 un + 10 yumurta + 20 gıda → 90 bisküvi | 1,41 | S |

- **Pide neden mal değil?** S4: pide, börek, lahmacun, köfte `gida` sepetidir; zincirin farkı **yöntem adı ve dükkân türüdür** (fırın → "pideci", `firin` tür verisine bayrak). Coğrafi işaretler (Bursa Tahinli Pide, Körfez Mancarlı Pide, Bafra pidesi, İnegöl Köfte) `gida`nın **kalite etiketi** olur (cesitlilik Tier 3b), stok kalemi açmaz. Alfa-0 illerinde üçü de imzalıdır (Bursa ve Kocaeli).
- **Makarna ve bisküvi neden ayrı mal?** Mal kapısı (cesitlilik §3): ayrı fiyat (₺95/₺100 vs `gida` ₺70), kuru gıda bozulma (1 500/4 000 ppm vs `gida` 20 000) ve ihracat (`NpcAlici` ihracatçı heyeti). Makarna Türkiye'nin dünyada 2. ihracatçı olduğu üründür [K5].
- **Un fabrikası ölçekleri:** §7.2 örnek tablosu (Değirmen Atölyesi → Un İmalathanesi → Un Fabrikası).
- **Bayat ekmek döngüsü.** Dikey §3.1: bozulan ekmeğin %30'u yem değeri taşır; burada **yem eşdeğeri (`kepek` stoğu)** olarak dönüşür: ekmek bozulması `kepek`e %30 dönüştürülür (isteğe bağlı küçük döngü; yeni mal ya da yöntem gerektirmez, çekirdek bozulma kuralına eklenir).
- **İl imza ilişkisi:** `un` (Gaziantep, Konya, Uşak, Karaman aday), `tahil` (Konya, Ankara, Eskişehir… 15 il aday), `gida` coğrafi işaretleri (pide ve köfte, Bursa/Kocaeli); makarna için Gaziantep ve Konya yeni imza adaydır (doğrulanmadı).

#### T2 — Mısır, nişasta ve yem (A1; nişasta S)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran | Öncelik |
|---|---|---|---:|---|
| Mısır tarlası | `ciftlik` (ekim ürünü `misir`) | — → mısır (sulama ister) | ham | A1 |
| Yem (mısırlı) | `gida_fabrikasi` (`yem_misirli`) | 70 mısır + 30 kepek → 85 yem | 1,48 | A1 |
| Nişasta | `gida_fabrikasi` (`nisasta_degirmeni`) | 100 mısır → 60 nişasta + 25 kepek | 1,37 | S |
| Nişastalı şekerleme | `gida_fabrikasi` (`sekerleme_nisastali`) | 60 nişasta + 20 gıda → 45 şekerleme | 1,44 | S |

- **Ekim ürünü, mal ve rotasyon.** `tarimUrunleri` (`bugday`, `baklagil`, `nadas`) genişler: **`arpa`** (kuraklığa dayanıklı: `olayDuyarliligiPpm` 800 000; toprak −7 000/gün) ve **`misir`** (yüksek çıktı, sulama bağımlı, `olayDuyarliligiPpm` 1 200 000; toprak −12 000/gün). Rotasyon (buğday → baklagil → mısır) mevcut toprak mekaniğinin üstüne oturur; yeni mekanik yok. `tahil` malı buğdaydır (ad "Tahıl (Buğday)" önerilir; kimlik değişmez).
- **Nişasta tüketicileri:** şekerleme (glikoz şurubu), `kagit` (S-Z5), ihracat. İlk iki Ü, üçüncü N.
- **İl imza:** `misir` Sakarya (imza: ≈ 400 bin ton, Arifiye enstitüsü), Adana (aday); nişasta ve mısır işleme Bursa'da yaygındır (doğrulanmadı). Alfa-0 ilinde Sakarya doğal başlangıçtır.

#### T3 — Arpa, malt ve alkolsüz içecek (S; arpa A1)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran | Öncelik |
|---|---|---|---:|---|
| Arpa tarlası | `ciftlik` (ekim ürünü `arpa`) | — → arpa | ham | A1 |
| Yem (arpalı) | `gida_fabrikasi` (`yem_arpali`) | 70 arpa + 30 kepek → 82 yem | 1,29 | A1 |
| Malt evi | `gida_fabrikasi` (`malt_evi`) | 100 arpa → 80 malt + 10 kepek | 1,34 | S |
| İçecek hattı | `gida_fabrikasi` (`icecek_hatti`) | 50 malt → 80 içecek | 1,40 | S |

- **Alkol kapsam dışıdır (S11):** malt yalnız **alkolsüz malt içeceğine** gider; bira, rakı vb. yoktur (SS-1). Bu, hassas içerik ilkesiyle ve "profesyonel ürün" ile uyumludur; mal yine iki tüketicilidir (içecek hattı + ihracatçı heyeti, ayrıca kepek yan ürünü yem döngüsüne girer).
- **İl imza:** arpa İç Anadolu'da (Konya, Ankara, Eskişehir) yoğundur, malt tesisleri arpa havzalarında kümelenir (doğrulanmadı).

### 4.3 Madencilik ve sanayi ağı

**Gerçek dayanak [K7, K8, K9, K12].** Çimento üretimi 2024'te ≈ 82 milyon ton (dünyada 5.), klinker kapasitesi ≈ 98 milyon ton, 1 t klinker için ≈ 1,52–1,65 t hammadde (kireçtaşı %67–75); ham çelik 2025'te 38,1 milyon ton (dünyada 7.), elektrik ark ocağı ≈ 27,5 milyon ton (≈ %72); kablo ve emaye bobin teli ihracatı 2025'te ≈ 1 milyar $ (Denizli öncü), bakır tel ≈ 0,7 milyar $; boksit Akseki (Antalya), Seydişehir (Konya), İslahiye (Gaziantep), Karaman'da; demir cevheri %80'e yakın Divriği'de (Sivas); bakır Murgul (Artvin), Küre (Kastamonu), Maden (Elazığ), Çayeli (Rize), Ergani (Diyarbakır); taş kömürü Zonguldak, linyit Soma ve Afşin-Elbistan (ikincil kaynaklar, doğrulanmadı).

```
 cevher+komur ─► (yüksek fırın / ark) ─► celik ─┬─► (haddehane) ─► insaat_demiri ─► konut/kamu/yapı/market
                                                ├─► (haddehane) ─► profil ─┬─► celik_dograma_profilli ─► pencere
                                                │                          └─► yapı market / yeni yapılar
                                                ├─► celik_dograma ─► pencere ; parca ; kablo_iletim_al
 kirectasi ─┬─► (çimento fırını) ─► cimento ─► konut/kamu/yapı          silis ──► cam_kalkerli ──► cam
            ├─► cam_kalkerli (flux)                                     bakir ─► kablo_bakir ─► kablo ─► şebeke/yapı/market/L ölçek
            └─► kamu (yol)                       boksit ─► alumina ─► aluminyum ─┬─► aluminyum_dograma ─► pencere
                                                                                  └─► kablo_iletim_al ─► kablo
```

#### M1 — Çimento: kireçtaşından yapıya (A1; dikeyin silisli çimentosu A0-ops)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran | Öncelik |
|---|---|---|---:|---|
| Taş ocağı | maden ailesi (`kirectasi_cikarim`) | 5 elektrik → 100 kireçtaşı | ham | A1 |
| Çimento fırını | `celikhane` (`cimento_kalker`) | 50 kireçtaşı + 12 kömür → 45 çimento | 1,41 | A1 |
| Cam (flux) | `celikhane` (`cam_kalkerli`) | 52 silis + 10 kireçtaşı → 52 cam (+%4 verim) | 1,41 | A1 |

- **Kum → cam** zaten dikeydedir (`silis` = "Silis Kumu"); burada kireçtaşı soda-kireç camının flux bileşenini kazanır (gerçek camda ≈ %26 dolomit/kalker [dikey K6]). `cam_firini` değişmez; `cam_kalkerli` ek yöntemdir (kısa/uzun yol).
- **Kireçtaşı tüketicileri:** `cimento_kalker`, `cam_kalkerli` (Ü), kamu yol malzemesi siparişi (K). Çimento tüketicileri: konut inşaatı ve onarımı (NPC konut, H), kamu (okul, yol, köprü), yeni yapı maliyeti (Y), yapı market rafı.
- **Kireçtaşı ocağı yapısı.** Dikey §9.3'e uygun olarak mülk kipinde **tek "Maden/Taş Ocağı" yapı ailesi**dir (rezerv yöntemde). `kirectasi` rezervi harita verisinde bol bulunur (çimento illerinde ve kalkerli ovalarda); `arama_sondaji` gerekmez.
- **İl imza ilişkisi:** çimento ve kireçtaşı Kocaeli (Hereke/Gebze), Bursa, Ankara, Eskişehir, Adana, Sakarya çevresinde (doğrulanmadı); `cimento` Alfa-0 illerinin ikisinde doğal başlangıçtır.

#### M2 — Kablo: bakırdan şebekeye (A1)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran | Öncelik |
|---|---|---|---:|---|
| Bakır | `bakir_madeni` (`bakir_cikarim`, mevcut) | 6 elektrik → 60 bakır | ham | M |
| Kablo (bakır) | `parca_fabrikasi` (`kablo_bakir`) | 60 bakır + 8 petrokimya → 50 kablo | 1,41 | A1 |
| Kablo (iletim, alüminyum) | `parca_fabrikasi` (`kablo_iletim_al`) | 14 alüminyum + 6 çelik → 65 kablo | 1,36 | A1 |

- **Neden iki tarif?** Alüminyum dikey zincirde tek tüketicili (pencere) kalıyordu; havai iletim kablosu (alüminyum-çelik) ikinci tüketiciyi verir ve bakır/alüminyum arasında **ikame kararı** doğurur (bakır yerleşim kablosu, alüminyum iletim hattı; gerçekte de böyledir, doğrulanmadı).
- **Kablo tüketicileri:** yapı market rafı (hane K2 onarım), **L ölçek yükseltmesinin maliyeti** (fabrikanın elektrik altyapısı; Y), kamu şebeke ve köy elektriği siparişi (K), araç kablo demeti (Sonra). Böylece `kablo` hem hane hem yapı hem kamu tüketir.
- **İl imza:** Denizli (kablo ve bakır tel ihracatı öncü [K9]; `iplik`/`kumas` ile aynı il), Kocaeli ve Bursa sanayisi (doğrulanmadı). Yeni imza adayı: `kablo` (Denizli).
- **Çıkmaz mal güvencesi:** `elektronik` zaten `bakir` tüketir; bakırın tüketicisi artık üç (elektronik, kablo, ihracat).

#### M3 — Demir-çelik ürünleri: inşaat demiri, profil, doğrama (A1)

| Kademe | Yapı (yöntem) | Girdi → çıktı | Oran | Öncelik |
|---|---|---|---:|---|
| Çelik | `celikhane` (`yuksek_firin`/`elektrik_ark`, mevcut) | → 60 çelik | 1,37 | M |
| **Haddehane (inşaat demiri)** | `celikhane` (`insaat_demiri`) | 100 çelik → 95 inşaat demiri | 1,21 | A1 |
| **Haddehane (profil)** | `celikhane` (`profil_haddeleme`) | 100 çelik → 90 profil | 1,29 | A1 |
| Doğrama (çelik, doğrudan) | `parca_fabrikasi` (`celik_dograma`, dikey) | 24 çelik + 32 cam → 27 pencere | 1,36 | A0 |
| **Doğrama (profilli, uzun yol)** | `parca_fabrikasi` (`celik_dograma_profilli`) | 20 profil + 32 cam → 30 pencere | 1,34 | A1 |

- **Kısa/uzun yol örneği:** çelik doğrama (A0) doğrudan çelikten pencere verir (27); profilli (A1) ara kademe ekler ama +%11 pencere verir (30). Alfa-0'daki oyuncu bu yolu değiştirmek zorunda değildir.
- **İnşaat demiri ve profil tüketicileri:** inşaat demiri → NPC konut inşaatı (H), kamu inşaat siparişi (K), yeni yapı maliyeti (Y), yapı market rafı; profil → profilli doğrama (Ü), yapı market rafı ve yeni yapılar (H, Y). Her ikisi de 2+ tüketicilidir.
- **Gerçek:** Türkiye'de ark ocağı çeliği ≈ %72'dir [K8] ve ark ocakları inşaat demiri ağırlıklıdır; oyunda `elektrik_ark` (mevcut ikame kararı) inşaat demiri zincirinin doğal başı olur.
- **İl imza:** Zonguldak (yassı çelik imza), Karabük, Hatay (İskenderun), Kocaeli (Dilovası), Kırıkkale, İzmir (Aliağa, doğrulanmadı): `celik` aday iller; inşaat demiri ve profil bu illerin **zincir kimliği** olur (yeni imza adayları: `insaat_demiri` Hatay/İzmir; `profil` Karabük).
- **Alüminyum doğrama** dikey §3.2'dedir, değişmez; `aluminyum` artık kablo ile iki tüketicilidir.

---

### 4.4 Oyuncu gözünden üç senaryo

Varsayımlar: S ölçek, birim/sa; referans fiyat R = taban fiyat; sözleşme ve dükkân fiyatı ≈ R, NPC pazar 0,891 R; KD ₺/sa **üst sınırdır** (NPC emilimi ve ilçe talebi sınırlar; dikey §1.2); ilk 5 yapıda %30 indirim. Her senaryoda **karar noktası** oyuncunun serbestçe seçtiği yerdir; hiçbir adımda kilit yoktur.

**Senaryo 1: "Hendek'te kapalı döngü" (Alfa-0, 24 mal, tek oyuncu, tarım açılışı).** Ayşe, Sakarya Hendek; hibe ₺50.000, başlangıç kiti 120 çelik / 40 parça.

1. **Katılım ve bedava yurt (gün 1).** Ayşe Sakarya'yı ve Hendek ilçesini seçer; **hücre seçmez** (docs/11: yapı önce yerleşim ve hazır arsalar). Sistem ona **6 hücrelik bedava yurt** verir (kenar-bitişik, ilçe merkezine yakın). Defter "ilk üretim" kavramını gösterir (ödül kavram bazlı; G4).
2. **Evre 1: yapı önce yerleşim, yurda (hibe ₺50.000).** Yapı türünü seçip hayaleti yurda yerleştirir (`yapi_yerlestir`; hücreler bedava, yalnız yapı bedeli): **Tarla A (2 hücre) + Değirmen (2) + Fırın (2)** yurdun 6 hücresini doldurur. İlk 5 yapıda %30 indirim: para (6.000 + 10.000 + 10.000) × 0,7 = **₺18.200**, çelik 105, parça 35; başlangıç kiti (120 çelik / 40 parça) yeter, ithalat gerekmez. Hibeden **₺31.800** kalır.
3. **Fırın gelire geçer (≈ 8 sa; ilk 24 saatte erken oyun hızlandırması ayrıca).** Tarla A: 200 tahıl/sa (Ekim ×1,05; Kasım ×0,8; Aralık ×0,4: karadeniz eğrisi). Değirmen S: 200 tahıl + 12 elektrik → 150 un + **30 kepek**, KD ₺1.920/sa; Fırın S: 150 un + 22 yakıt + 15 elektrik → 225 ekmek, KD ₺3.650/sa. Ekmeği NPC pazarına satar: 225 × ₺60 × 0,891 ≈ **₺12.000/sa üst sınırı** (gerçek emilim sınırlar; yine de ilk saatlerde binlerce ₺).
4. **Evre 2: hazır arsa tek tık (aynı gün, gelirle).** Yurt doldu; **Tarla B + Ahır (4. ve 5. indirimli yapı) + Dükkân (6. yapı, tam fiyat)** için komşu hazır arsadan **5 hücre** alır (4 kırsal × ₺1.000 + 1 ticari ≈ ₺1.500 ≈ ₺5.500; `yapi_yerlestir` arsa + yapıyı atomik alır). Eksik malzeme NPC'den ithal edilir (×1,11).
5. **Dükkân (fırın türü, 4 sa).** Kasa 90 birim/sa: 90 ekmek dükkândan (≈ R), kalan 135 NPC pazarına (0,891 R); toplam ≈ ₺12.600–13.000/sa, hepsini pazara satmaktan ≈ %5–8 fazla.
6. **Karar noktası: ahır.** `sut_kepekli` (₺8.000, 4 sa): 50 tahıl + 60 kepek + 5 elektrik → 82 süt + 4 gübre. Kepek yalnız 30/sa: ahır **%50 yükte** (41 süt + 2 gübre; çıktı değeri ≈ ₺1.920/sa, KD ≈ ₺605). Üç serbest seçenek: **(a)** olduğu gibi bırak (ayarla-unut), **(b)** ikinci değirmen (₺10.000), **(c)** komşunun kepeğini satın al (R ₺18: 30 kepek ≈ ₺540/sa).
7. **Gübre döngüsü.** Ahır 2–4 gübre/sa verir; bir Tarla'nın dozu 4/sa (`gubreTuketimiSaat`): yarım yükte yarım Tarla. Kendi Tarla'na ver ya da sat (R ₺140).
8. **Bilanço: hibeye sığmaz, sıra ve gelirle kurulur.** Dükkân tek başına ₺6.000 + 20 çelik + 8 parça + 4 pencere ≈ ₺11.440 taban değerdir (dikey §5.2). Toplam (taban fiyat; ithalat ×1,11):

| Kalem | Evre 1 (hibe) | Evre 2 (hibe + gelir) | Toplam |
|---|---:|---:|---:|
| Yapı bedeli (para; ilk 5 yapıda %30 indirim, Dükkân tam) | 18.200 | 4.200 + 5.600 + 6.000 = 15.800 | **34.000** |
| Arsa (6 hücre bedava yurt; 5 hücre satın alınır) | 0 | ≈ 5.500 | **≈ 5.500** |
| Çelik / parça (gereken) | 105 / 35 | 69 / 25 | 174 / 60 |
| Başlangıç kiti (çelik / parça) | 120 / 40 (kullanılan 105 / 35) | kalan 15 / 5 | |
| İthal edilen açık (çelik / parça / pencere) | — | 54 / 20 / 4 ≈ 7.200 + 4.000 + 1.600 | **≈ 12.800** |
| **Nakit toplamı** | **18.200** | **≈ 34.100** | **≈ 52.300** |

   Hibe ₺50.000: evre 1'den sonra ₺31.800 kalır, evre 2 ≈ ₺34.100 ister; **≈ ₺2.300 açık fırın gelirinden (≈ 20–30 dakikalık ekmek satışı) kapanır**; yani Tarla B, ahır ve dükkân gelirle kurulur (gün 1 akşamı). Toplam 11 hücre (6 yurt + 5 satın alınan), 6 yapı; zincir katma değeri ≈ ₺6.200/sa (değirmen 1.920 + fırın 3.650 + ahır %50 605). Toplam inşa ≈ 24 saat (iki eşzamanlı inşaatla ≈ 12–14 sa).

**Senaryo 2: "Dört esnafın deri zinciri" (Alfa-1, uzun yol, sözleşme P5).** Bursa çevresi, Sanayi Adası; dört oyuncu, **kimse diğerine zorunlu değil**.

1. **Cemal (değirmenci), Un İmalathanesi (M, ₺25.000):** 440 tahıl → 330 un + **66 kepek**/sa. Kepeği Mehmet'e sözleşmeyle R ₺18'den satar: ₺1.188/sa (Defter: "ilk yan ürün satışı").
2. **Mehmet (çiftçi-besici), ₺47.000:** Tarla (mısır 260/sa; `ciktiPpm` 1,3 öneri) + Yem İmalathanesi (M, `yem_misirli` ×2,2: 154 mısır + 66 kepek + 18 elektrik → **187 yem**) + Besi S (120 yem → **90 kasaplik** + 10 gübre) + Kümes S (67 yem → 77 yumurta + 3 gübre). Satış: kasaplik 90 × ₺70 = **₺6.300/sa** (Elif'e, sözleşme), yumurta 77 × ₺50 = ₺3.850/sa (market). Gübre 13/sa: 4'ü kendi Tarla'sına, 9'u Cemal'in Tarla'sına (₺140).
3. **Elif (mezbaha ve tabakhane), Sanayi Adası, 4 hücre, ₺22.000:** Mezbaha S (%90 yük): 90 kasaplik → **49,5 et + 18 deri + 7 gübre**; et ₺5.445/sa (hal/market), gübre ₺1.008/sa. Tabakhane S (kapasite 20 deri; %90): 18 deri → **12,6 işlenmiş deri**/sa (₺1.701/sa). Net marj ≈ ₺8.154 − 6.300 (kasaplik) − 297 (yakıt, elektrik) ≈ **₺1.557/sa**; 6 işçi → ₺260/işçi.
4. **Can (ayakkabı atölyesi + dükkân), ₺18.000:** Elif'ten 12,6 işlenmiş deri × ₺135 = ₺1.701/sa; petrokimya 2,7 (ithal ₺154 → ₺416); elektrik 3,6. Çıktı **9,9 ayakkabı**/sa × ₺300 = ₺2.970/sa (dükkân ≈ R). Net ≈ **₺817/sa**; 3 işçi → ₺272/işçi.
5. **Döngü.** Cemal'in kepeği Mehmet'in yemine, Mehmet'in gübresi Cemal'in Tarla'sına, Mehmet'in kasaplığı Elif'in mezbahasına, Elif'in derisi Can'ın ayakkabısına gider: **her halkanın girdisi bir başkasının çıktısıdır**. Hepsi sözleşme fiyatı R'de dengelenir; NPC üzerinden gidip gelseydi her halkada ≈ %20 makas yenirdi (dikey §6.2): ara kademe uzmanlığı Alfa-1'de sözleşmeyle kârlı olur.
6. **Karar noktaları (hepsi serbest).** Elif tabakhaneyi atlayıp deriyi güvence alıcıya (R'nin %50'si) satabilir (KD düşer); Mehmet kısa yolda (tahılla besi: `ahir_besi`) kalabilir; Can ayakkabı yerine çanta (S) seçebilir; Can derisini ithal edebilir (×1,10). Zincirin toplam taban yatırımı ₺25.000 + 47.000 + 22.000 + 18.000 = **₺112.000**, dört oyuncuya bölünmüş (ortalama ₺28.000).

**Senaryo 3: "Sermayeyle doğrudan fabrika" (Alfa-1, tek oyuncu, kilit yok).** Zeynep, Kocaeli (Dilovası); 40 gün oynadı, sermayesi ₺140.000, çelik 600, parça 250. Konut inşaatı ve kamu için inşaat demiri talebi yüksek.

1. **İki yol.** **A:** `insaat_demiri` haddehanesi S kurup yükselt. **B:** `yapi_yerlestir` (`olcek: 2`) ile **doğrudan L Haddehane** (mülk kipinde `tesis_insa` işletme düğümünde reddedilir).
2. **B yolunun şartları (hepsi ekonomik).** Sermaye: ₺90.000 + 450 çelik + 180 parça (hibenin ≈ 1,8 katı: yeni oyuncuya pratikte kapalı, kilitli değil). Arsa: **5 bitişik sanayi hücresi** (`celikhane` yuvası 3 + 2; ayak izi baştan alınır), ilçe tavanı 72 hücrenin ≈ %7'si, pay tavanı ≤ %25; yol A'da S (3 hücre) → M (4) → L (5) yükseltmesi her adımda 1 ek bitişik hücre ister (kendi boş hücresi ya da aynı işlemde satın alma; yoksa yükseltme yapılamaz ve doğrudan kurulum başka yerde yapılır). Süre: 10 × (1 + 1) = **20 sa**. İşçi: 7 × 2,6 ≈ **18**. Girdi: **360 çelik + 29 yakıt + 72 elektrik/sa** → **342 inşaat demiri/sa**.
3. **Asıl soru girdi.** Aynı L fabrikanın katma değeri (işletme ve bakım hariç):

| Seçenek | Çelik kaynağı | KD (₺/sa) | KD/işçi |
|---|---|---:|---:|
| **L**, kendi çeliği (maliyet ₺120) | Kendi çelikhanesi | **9.630** | 535 |
| **L**, ithal çelik (₺132) | NPC ithalatı (×1,10) | **5.310** | 295 |
| S, kendi çeliği | Kendi çelikhanesi | 2.675 | 382 |
| S, ithal çelik | NPC ithalatı | 1.475 | 211 |

   L fabrika "büyük olduğu için" zengin değildir: çeliğini ithal ederse marjı ≈ %9,4'e (5.310 / 56.430) düşer; işletme gideri (₺60 × 3,2 = ₺192/sa) ve bakım ayrıca düşülür.
4. **Küçük ilçe sorusu.** Aynı L fabrikayı çelik ve elektrik altyapısı olmayan küçük bir ilçede kursa: yerel talep ≪ 342 demir/sa (fazlası NPC makasıyla ya da taşımayla), şebeke 72 elektrik/sa'i taşımıyorsa brownout çarpanı, işgücü havuzu 18 işçiye yetmiyorsa orantılı düşüş (§7.3). Hiçbiri kilit değildir; hepsi **ekonomik sonuçtur** ve tesis kartında görünür.
5. **Seçim.** Zeynep isterse hibesiyle S kurmuş ilk oyuncu gibi küçük de kalabilir, ya da önce kendi çelikhanesini kurup L haddehaneyi 2 hafta sonra açabilir. **Sıra ve kademe zorunlu değil.**

## 5. Ağ topolojisi, döngü ve çıkmaz-mal denetimi

### 5.1 Ağın şekli

**24 + 31 = 55 malın** (kilitli ve planlı 31 mal + bu raporun 24 malı) üretim grafiği **beş aileye** ayrılır; her aile bir sekme olur (§8.3):

| Aile | Mal sayısı (Alfa-0 → Sonra) | Örnek |
|---|---:|---|
| Tarım ve Gıda | 8 → 15 | `tahil`, `un`, `ekmek`, `kepek`, `gida`, `findik`, `findik_urunu`, `sekerleme`; sonra `misir`, `arpa`, `makarna`, `biskuvi`, `nisasta`, `malt`, `icecek` |
| Hayvancılık | 3 → 8 | `sut`, `sut_urunu`, `gubre`*; sonra `yem`, `kasaplik`, `et`, `yumurta`, `et_urunu` |
| Tekstil ve Deri | 0 → 11 | `pamuk`, `yun`, `iplik`, `kumas`, `deri`, `islenmis_deri`, `hazir_giyim`, `ayakkabi`, `canta`, `mont`, `makine_halisi` |
| Yapı ve Maden | 7 → 15 | `cevher`, `komur`, `silis`, `celik`, `parca`, `cam`, `pencere`; sonra `cimento`, `boksit`, `alumina`, `aluminyum`, `kirectasi`, `kablo`, `insaat_demiri`, `profil` |
| Enerji ve Teknoloji | 6 → 6 | `elektrik`, `yakit`, `petrol`, `bakir`, `elektronik`, `muhimmat` (+ dış zincir `petrokimya`) |

(*`gubre` Tarım ve Gıda ailesinde de görünür: yan ürün döngüsünün bağlantı malıdır; aile bir filtre bayrağıdır, mal tek ailenin sahipliğinde değildir.) Toplam 24 → 55.

### 5.2 Çıkmaz-mal denetimi (betik özeti)

Tüketici türleri §2.4'tedir. Her mal için tüketici sayısı (Ü = üretim yöntemi sayısı; diğerleri tür sayısı):

| Mal | Tüketiciler | Sayı |
|---|---|---:|
| `kepek` | Ü: `sut_kepekli`, `yem_misirli`, `yem_arpali` · N: çiftçi birliği (güvence) · bayat ekmek döngüsü girdisi | 4 |
| `yem` | Ü: `ahir_sut_yemli`, `besi_yemli`, `kumes_yumurta`, `kumes_pilic` · N: hayvancı (güvence) | 5 |
| `misir` | Ü: `yem_misirli`, `nisasta_degirmeni` · H: taze mısır (K1) | 3 |
| `arpa` | Ü: `yem_arpali`, `malt_evi` | 2 |
| `kasaplik` | Ü: `mezbaha_kesim` · N: **hayvan pazarı** (pazar günü) | 2 |
| `et` | Ü: `et_isleme`, `hazir_yemek` · H: kasap/market · K: okul yemeği | 4 |
| `yumurta` | Ü: `biskuvi_hatti` · H: bakkal/market · K: okul yemeği | 3 |
| `deri` | Ü: `tabaklama` · N: ihracatçı heyeti | 2 |
| `islenmis_deri` | Ü: `ayakkabi_atolyesi`, `canta_atolyesi`, `mont_atolyesi` | 3 |
| `ayakkabi`, `canta`, `mont` | H: ayakkabı/deri dükkânı · N: ihracatçı heyeti | 2 |
| `yun` | Ü: `yun_egirme` · zanaat (`dokuma_zanaat`, `hali`) | 2 |
| `makarna`, `biskuvi` | H: bakkal/market · K: okul yemeği · N: ihracat | 3 |
| `nisasta` | Ü: `sekerleme_nisastali` · Ü (dış zincir): `kagit` · N: ihracat | 3 |
| `malt` | Ü: `icecek_hatti` · N: ihracatçı heyeti | 2 |
| `icecek` | H: bakkal/market · N: ihracat | 2 |
| `et_urunu` | H: şarküteri/kasap · N: zincir market | 2 |
| `kirectasi` | Ü: `cimento_kalker`, `cam_kalkerli` · K: yol | 3 |
| `kablo` | H: yapı market · Y: L ölçek maliyeti · K: şebeke | 3 |
| `insaat_demiri` | H: NPC konut inşaatı · K: kamu inşaatı · Y: yeni yapı maliyeti | 3 |
| `profil` | Ü: `celik_dograma_profilli` · H: yapı market · Y | 3 |

**Dikey rapordan devralınan tek-tüketicili mallar (düzeltme):**

| Mal | Dikeydeki durum | Çözüm |
|---|---|---|
| `boksit` | yalnız `alumina_bayer` | + N: ihracatçı heyeti (kaynak mal, K-5 bütçeli) |
| `alumina` | yalnız `aluminyum_ergitme` | + N: ihracatçı heyeti; Sonra: `seramik`/`cini` (Ü) |
| `aluminyum` | yalnız `aluminyum_dograma` | + `kablo_iletim_al` (§4.3 M2) |
| `findik`, `findik_urunu` | yalnız `findik_kavurma` / `findik_ezme_sekerleme` | + N: ihracatçı heyeti (Tier 2 imza, TMO/ihracat); `findik_urunu` + `biskuvi`/lokum tarifi (Sonra) |
| `pamuk` | yalnız `iplik_egirme` | + N: ihracatçı heyeti |
| `hazir_giyim` | yalnız hane K2 | + N: ihracatçı heyeti (hazır giyim ihracatı 2025 Oca–Eyl ≈ 12,7 milyar $, dikey K8b) |
| `sekerleme` | hane K1 (bayram) | + N: gurbetçi sepeti (imza: gurbetçi yaz dönüşü; dikey §3.8) |
| `cimento`, `pencere` | yalnız H/K/Y | zaten ≥ 3 (üretim tüketicisi gerekmez, son mal) |
| `gubre` | Tarla gübre dozu | + Ü: bahçe yöntemleri (`findik_bahcesi` gübre dozu) · N: çiftçi birliği |

**Doğrulayıcı kuralı (UA1):** derleme sırasında `mallar[]` içinden tüketici türü sayısı < 2 olan mal **hata**; yan ürünlerde (`kepek`, `deri`, `gubre`) Ü ≥ 1 ve N ≥ 1 şarttır. İhracatçı heyeti ve diğer `NpcAlici` kayıtları bütçeli ve toplamı sabittir (K-5): bu rapor **yeni para musluğu açmaz**; yalnız kaynağı olan malın alıcısını tanımlar.

### 5.3 Yan ürün döngüleri (tek bakışta)

| Yan ürün | Doğduğu yer | Döndüğü yer | Döngü |
|---|---|---|---|
| **kepek** | `degirmen`, `nisasta_degirmeni`, `malt_evi` | `sut_kepekli` (A0), `yem_*` (A1) | Tarla → değirmen → kepek → ahır/yem → süt → mandıra |
| **gübre** | `ahir`, `mera`, `kumes`, `mezbaha` (her hayvan yöntemi) | Tarla gübre dozu (`gubreTuketimiSaat` 4/sa/Tarla), bahçe | Ahır ↔ Tarla: **1 ahır (4–10 gübre/sa) 1–2 Tarla'yı besler** |
| **deri** | `mezbaha_kesim` | `tabaklama` → `islenmis_deri` | besi → mezbaha → tabakhane → atölye → hane |
| **bayat ekmek** | `ekmek` bozulması | `kepek` stoğu (%30) | fırın → yem |
| **posa/kepek (nişasta, malt)** | `nisasta_degirmeni`, `malt_evi` | yem fabrikası | mısır/arpa işleme → yem |

**Döngü hissi.** Üç oyuncu örneği (A0/A1 karışık): **A** (Tarla + değirmen) kepeği **B**'nin (ahır) ucuz yemine, **B**'nin gübresini kendi komşusu Tarla'ya satar; **C** mandırası **B**'nin sütünü alır, tereyağı/peynirini **A**'nın fırın dükkânına (hamur işi) satar. Her halkada **kendi ihtiyacın bir başkasının çıktısıdır**; ama hiçbir halka zorunlu değildir (S9: NPC ithalatı ve güvence alıcısı var).

### 5.4 Dükkân tarafı: perakende tür ve ölçek güncellemesi

Dikeyin 6 türüne (fırın, bakkal, şarküteri, şekerci, yapı market, giyim) Alfa-1'de **2 tür** eklenir ve **bakkal → market → süpermarket** dükkân ölçeğidir:

| Tür / ölçek | S (4 raf) | M (6 raf) | L (8 raf) | Notlar |
|---|---|---|---|---|
| **bakkal → market → süpermarket** | Bakkal | Market | Süpermarket | Raf listesi: `gida`, `ekmek`, `sut_urunu`, `yumurta`, `makarna`, `sekerleme`; M/L'de `biskuvi`, `icecek`; kasa 90/198/324 |
| **kasap** (A1, yeni) | Kasap | Et Market | — | `et`, `et_urunu`, `yumurta`; soğuk dolap modülü |
| **ayakkabı ve deri** (A1, yeni) | Ayakkabıcı | Ayakkabı ve Deri Mağazası | — | `ayakkabi`, `canta`, `mont` (S) |
| yapı market (dikey) | Yapı Market | Yapı Market M | Yapı Market L | `pencere`, `cimento`, `celik`, + `insaat_demiri`, `profil`, `kablo` |

Raf = çeşit yuvası (S4/M6/L8, dikey). **Çok çeşitli bakkal (A1) rafı 4 yuvaya sığmaz**: bu bilinçli seçimdir (hangi 4 mal?), M ve L ölçek tam çeşide ulaştırır ve **çok tedarikçi** doğurur (dikey §6.4 topoloji ilkesi).

---

## 6. Hayvan refahı ve bakım (oyunsu, sade)

**Amaç.** Hayvancılığa bir "bakım" kararı vermek, ama yeni mekanik açmamak. **Hayvan ölümü, kesim kuyruğu, tek tek hayvan yoktur** (S1); duyarlı içerik: yalnız "üretim aksıyor" dili.

### 6.1 Sürü Sağlığı göstergesi

Hayvan tesislerinde (`ahir`, `mera`, kümes yöntemleri) **Sürü Sağlığı** [0 %, 100 %] bir **görünüm ve etkidir**; veri olarak mevcut `asinmaPpm` ve `bakim_duzeyi` alanlarını yeniden kullanır (sağlık = 100 % − aşınma).

| Girdi | Etki |
|---|---|
| **Yem karşılanması** (yem/girdi stok yeterliliği) | < %90 → günlük sağlık düşüşü (mevcut `kitlikAsinmaPpmGun`) |
| **Bakım düzeyi** (asgari/normal/yüksek; mevcut `bakim_duzeyi`) | Hayvan tesislerinde etiketi "Sürü bakımı"; bakım girdisi `parca` yerine `yem` (takviye rasyon) ya da `gida` |
| **Ölçek yoğunluğu** | L ölçekte yoğunluk nedeniyle sağlık tavanı 0,9; "modern ahır/kümes" modülü (inşa maliyeti olan bir seçim; teknoloji kilidi değil) tavanı 1,0 yapar |
| **Hava ve olay** | Kış fırtınası mera sağlığını düşürür; `sure_hastaligi` olayı (§6.3) |
| **Sağlık taraması** (mevcut `genel_onarim` eşdeğeri) | Aşınmış tesisin sağlığı sıfırlanır; 6 sa durur (`genelOnarimDurusSaat`) |

### 6.2 Etki (çıktı çarpanı ve kalite)

| Sağlık | Çıktı çarpanı | Kalite etiketi (S10) |
|---|---|---|
| ≥ %80 | ×1,00–1,08 | "iyi bakım" (`sut`, `et`, `yumurta` kalitesi K1 primi) |
| %50–80 | ×1,00 | — |
| < %50 | ×0,80–0,95 (en çok −%20) | hastalık olasılığı ×2 |

Bu, mevcut `max(uretimTabaniPpm, PPM − aşınma × %40)` çarpanıyla uyumludur (en çok −%40); hayvan tesislerinde tavan −%20'dir (daha yumuşak). **Kısa yol / uzun yol** burada da korunur: bakım düzeyi seçilmezse varsayılan "normal"dir (ayarla-unut oyuncusu cezalanmaz).

### 6.3 Hastalık olayı: `sure_hastaligi` (A1+, öneri)

Mevcut dört olay (`kuraklik`, `don`, `sel`, `kis_firtinasi`) şablonuyla beşinci olay: **şap ve kuş gribi** gibi ilçe düzeyi hayvan hastalığı. Süre 5–10 gün, şiddet çıktı −%20–40, menzil 1–2 kenar, olasılık yoğun (L, düşük sağlık) bölgede ×2, "yüksek bakım" ×0,5. Hareket kısıtı yoktur (lojistik değişmez), yalnız çıktı yavaşlar. Ön duyuru 24 sa, **opt-in karar yoktur** (zararsız varsayılan); nefes payı ilkesi (ilçede aynı anda ≤ 1 olumsuz olay, iki olay arası ≥ 72 sa; [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md), olay sözleşmesi ve "nefes payı") geçerlidir. Gerçekte 2025'te şap ve fiyat baskısı kırmızı et ve süt üretimini düşürmüştür [K3, K3c] (doğrulanmadı); oyun bunu **yumuşatılmış** biçimde ve hiçbir oyuncuyu yok etmeden taşır.

### 6.4 Okunurluk

Tesis kartında **tek satır**: "Sürü sağlığı %86 · bakım: normal · yem: 1,2 gün". İkon: "kalp-damla". Büyük harf yok. Defter'de olay etiketli satır (ödülsüz, "Takvimden").

---

## 7. Üretimhane → fabrika ölçekleri: atölye / imalathane / fabrika

### 7.0 Sahip ilkesi: seviye ya da kilit yok, seçim var

Atölye (S), imalathane (M) ve fabrika (L) **bir ilerleme merdiveni değil, oyuncunun seçtiği üç iş modelidir:**

| Oyuncu seçimi | Ne demek | Örnek |
|---|---|---|
| **Küçük üretimhanede kalır** | Düşük sermaye, az işçi, az kirlilik, ayarla-unut kolaylığı; ölçek yükseltmek zorunda değildir | Küçük bir fırın ya da değirmen atölyesi sonsuza dek S kalabilir; tasarım bunu cezalandırmaz |
| **Aynı yerde büyür** | `tesis_olcek_yukselt` (mevcut): hedef kademe − mevcut kademe maliyeti, süre ×0,5; tesis çalışmaya devam eder | S değirmen → M imalathane → L fabrika |
| **Doğrudan büyük kurar** | Sermayesi olan, atölyeden geçmeden M ya da L kurar (öneri: mülk kipinde `tesis_insa_hucre` ve `yapi_yerlestir` komutlarına 0, 1 ya da 2 değerli `olcek` alanı; bölge kipinde `tesis_insa`; maliyet = tür inşa maliyeti × ölçek çarpanı, ayak izi o ölçeğin hücre sayısıdır) | Dilovası'nda ilk günden L haddehane (Senaryo 3, §4.4) |

**Tek kısıtlar** (hepsi ekonomiktir, hiçbiri açılış kilidi değildir):

1. **Sermaye:** para + inşa malzemesi (ölçek çarpanı ×1/2,5/4,5; §7.5).
2. **Uygun arsa ve ayak izi:** kullanım türü (tarım, ticari, sanayi/OSB), arsa nitelikleri (ova, dağ, kıyı), kaynak/damar; ayak izi **ölçekle büyür** (baş lider kararı; M ve L ek bitişik hücre ister, §7.1.1).
3. **Girdi ve elektrik:** ölçekle doğrusal büyür; şebeke ve girdi kaynağı büyük tesiste belirleyicidir.
4. **İşletme gideri:** bakım ve işletme ×1/2/3,2.
5. **Adalet korumaları:** ilçe başına ≤ 72 hücre ve bir oyuncu ≤ %25 pay (`mulk.ilceHucreTavani`, `ilcePayTavaniPpm`).

**Açılış kilidi olarak kullanılmayanlar:** "önce küçük ölçek", "önce X günlük sicil", ilçe seviyesi şartı. **Teknoloji düğümleri yöntem açar** (mevcut karar: `mekanize_tarim`, `derin_madencilik`, `elektrik_ark_ocagi`, `otomasyon` hepsi *yöntem*dir); ilerleme fazı gibi sunulmaz.

**Projede bu ilkeyle çelişen iki nokta (baş lider kararıyla kabul edildi):**

| # | Nerede | Bugün | Karar |
|---|---|---|---|
| 1 | `parametreler.json` `sanayi.olcekKademeleri[2].gerekliTeknoloji` | L ölçek `otomasyon` teknolojisine kilitli | **Mülk kipinde L kilidi kalkar** (`tesis_olcek_yukselt` içindeki "olcek icin teknoloji acik degil" denetimi mülk kipinde atlanır); **bölge kipinde değişmez**. `otomasyon` mülk kipinde yalnız `otomatik_hat` yöntemini açar. L'nin caydırıcılığı zaten ×4,5 sermaye ve ×3,6 girdi/elektriktir |
| 2 | [11 §7.4](../11-urun-donusu.md) ilçe gelişim seviyesi | "S/M/L ölçeğin ve yeni yapı türlerinin kilidini açar" (Köy: S; Kasaba: M ve fabrikalar; Merkez: L) | **Geçersiz:** ilçe seviyesi yalnız **kolektif dünya durumudur** (nüfus, hizmet, talep göstergesi); ölçek ve yapı kilidi olmaz. [cesitlilik §7.5](cesitlilik-uretim-katmanlari.md) "Tier 1 ilçe seviyesine göre görünür" kuralı bir **görünürlük süzgecidir**, üretim izni değildir (§8.3) |

### 7.1 Karar: aynı yapı türü, üç ölçek, iki yol (yeni yapı değil)

| Soru | Cevap | Gerekçe |
|---|---|---|
| Ölçek yükseltme mi, yeni yapı mı? | **Aynı yapı türü, üç ölçek; iki yol:** (a) **doğrudan kurulum:** mülk kipinde `tesis_insa_hucre {ilce, tesisTuru, hucreler, olcek}` ve `yapi_yerlestir {ilce, tesisTuru, hucreler, sinif, olcek}` (`olcek` 0, 1, 2; varsayılan 0); bölge kipinde `tesis_insa` (`tesis_insa` mülk kipinde işletme düğümünde reddedilir, 06 §15); (b) **yerinde büyüme:** `tesis_olcek_yukselt` | Veri modeli ve komut var (06 §12); yeni yapı sayısı bütçeyi aşar; tesis durumu, aşınma ve komşu ilişkileri korunur |
| Doğrudan kurulum bedeli | Para + mal = tür inşa maliyeti × ölçek çarpanı (×1/2,5/4,5); süre = tür inşa süresi × (1 + 0,5 × ölçek) (S ×1, M ×1,5, L ×2) | Yükseltmeyle aynı formül; atölyeden geçmenin cezası da ödülü de yoktur (S → L yükseltmesi toplam maliyeti doğrudan L ile eşittir) |
| Adlandırma | **Ölçek + yöntem:** "Değirmen Atölyesi" → "Un İmalathanesi" → "Un Fabrikası" | Ad bir **boyut**u anlatır, bir seviyeyi değil |
| Mandıra, mezbaha, tabakhane, yem fabrikası ayrı yapı mı? | **Hayır: yöntemden gelen bina adı** | `yontem_degistir` (mevcut, anlık) tesisin adını ve modelini yöntemden alır; yapı türü sayısı ≈ sabit kalır |
| Ayak izi | **Ölçekle büyür (baş lider kararı):** S = türün yuvası (`mulk.yapiYuva`), M = yuva + 1, L = yuva + 2; ayrıntı ve Alfa-0 uyumu §7.1.1 | Hücre bedeli (₺1.000–6.500) ve ilçe tavanı (72 hücre, %25) L'yi kilitsiz ama pahalı yapar |
| Yeniden donatım (yöntem değişimi) | Bugün ücretsiz; Alfa-1'de **inşa maliyetinin %20'si ve 6 sa duruş** önerilir | Ücretsiz yöntem değişimi "mandıra ↔ mezbaha" ayrımını anlamsızlaştırır (uzmanlaşma ölür). Kilit değil, bedeldir |

#### 7.1.1 Ayak izi ölçekle büyür (baş lider kararı)

**Karar.** [arsa-ve-insa](arsa-ve-insa-derinlestirme.md) **Z4** ("1–3 hücre biçim kümesi; ölçek yükseltme aynı ayak izinde; sonradan 'L = 4 hücre' gibi büyütme kırıcıdır") bu doğrultuda **güncellenir**: ölçek başına hücre sayısı tür verisinde bir parametredir.

| Konu | Kural |
|---|---|
| **Veri** | Yeni `mulk.olcekHucre[tür] = [S, M, L]`; `mulk.yapiYuva[tür]` S değeri olarak aynen kalır (geriye uyum ve bölge kipi altınları). Genel kural: **M = yuva + 1, L = yuva + 2**; yuvası 1 olan türlerde 1 / 2 / 3 (dükkân, ek yapılar; baş liderin S 1, M 2, L 3 önerisi). Tabloda tür yuvasına uyarlanmış değerler §7.5'tedir (`gida_fabrikasi` 2 / 3 / 4, `mera` ve `celikhane` 3 / 4 / 5) |
| **Doğrudan kurulum** | `yapi_yerlestir`/`tesis_insa_hucre` `hucreler` listesi **o ölçeğin ayak izidir** (baştan alınır); sayı `olcekHucre[tür][olcek]`'e eşit olmalıdır |
| **Yerinde yükseltme** | Gereken ek bitişik hücreler **ya oyuncunun kendi boş hücreleri olmalı ya da aynı atomik işlemde satın alınabilmelidir** (`yapi_yerlestir` kuralları: sahipsiz hücre, artımlı fiyat, ayrılmış hücre). İkisi de değilse **yükseltme yapılamaz** ("bitişik boş hücre yok"); oyuncu başka yerde doğrudan büyük kurar. Bu bir **kilit değil, fiziksel koşuldur** (K-13 ile çelişmez: sicil, seviye, sıra yoktur) |
| **Tavanlar** | İlçe ≤ 72 hücre ve oyuncu ≤ %25 geçerlidir; **kamu hücresi alınamaz** (`hucre kamu arsasi (satilmaz)`): kamu hücresiyle çevrili tesis yerinde büyüyemez |
| **Atomiklik** | Arsa + yapı tek işlem, tek hazine denetimi; denetim başarısızsa hiçbir şey değişmez (yarım sonuç yok: arsa alınıp yükseltme olmaması engellenir) |
| **Komşuluk ve biçim** | Yapı hücreleri kenar-bitişik tek bağlı küme kalır (`kenarBitisikMi`); Z4'ün {1, domino, I3, L3} biçim kümesi **≤ 5 hücre için genel kurala** ("kenar-bitişik tek bağlı küme") genişler; çizim ayak izi sınırlayıcı kutusuna oturur; hazır arsa adaları (4–12 hücre) L'yi (≤ 5) barındırır |
| **Komut uyarlaması (U-2)** | `tesis_olcek_yukselt {bolge, tesis, olcek}` bugün bölge kipindeki sanayi tesisi için yazılmıştır (`cekirdek/src/sanayi/komut.ts`: `sahipliBolge` + `b.tesisler`, bölge kipine özel red yok); mülk kipinde işletme düğümü indeksiyle **çalışması beklenir ama mülk kipi testi yoktur ve ek hücre alanı yoktur: doğrulanmadı / uyarlanmalı**. Mülk kipinde `{bolge, tesis, olcek, ekHucreler}` biçimi önerilir (`ekHucreler` ek bitişik hücreler; `tesis.hucreler` güncellenir), L teknoloji denetimi mülk kipinde atlanır (§7.0 karar 1) |

**Alfa-0'da ayak izi büyüyecek mi?** **Evet; önceki [0, 0, 0] önerisi geri çekildi.** Z4 "sonradan büyütme kırıcıdır" dediği için ayak izi parametresi (`olcekHucre`) **Alfa-0 veri imzasına şimdiden girer**, değerler [yuva, yuva + 1, yuva + 2]. Yeni oyuncu için bir şey değişmez: bedava yurt, ilk yapılar ve S ölçek aynıdır (S = bugünkü yuva; Senaryo 1). M/L (yükseltme ya da doğrudan kurulum) Alfa-0'da da serbesttir; yalnız ek bitişik hücre koşulu ve §7.5 maliyetleri vardır. Alfa-0 komutlarında `olcek` alanı hemen kodlanmazsa bile `olcekHucre` verisi ve `tesis.hucreler` şeması ayak izini taşımaya hazır olmalıdır (şema alanı sonradan eklemek kırıcıdır, değer sonradan değişebilir).

### 7.2 Atölye / imalathane / fabrika: ne değişir?

Mevcut `olcekKademeleri` (docs/06 §12, `parametreler.json`): çıktı ×1/2,2/3,6; işçi ×1/1,8/2,6; bakım ×1/2/3,2; inşa ×1/2,5/4,5. Girdi ve elektrik çıktıyla birlikte ölçeklenir; kirlilik çıktıyla (`kirlilikPpmSaat × verim × ölçek`).

| Boyut | S Atölye | M İmalathane | L Fabrika | Yorum |
|---|---|---|---|---|
| Çıktı | ×1 | ×2,2 | ×3,6 | Mevcut `olcekKademeleri.ciktiPpm` |
| İşçi | ×1 | ×1,8 | ×2,6 | **İşçi başına çıktı ×1,00 / 1,22 / 1,38 (ölçek ekonomisi)** |
| Elektrik ve girdi | ×1 | ×2,2 | ×3,6 | Doğrusal: büyük tesis şebekeye ve girdi kaynağına bağımlıdır |
| Kirlilik | ×1 | ×2,2 | ×3,6 | Komşuya ve OSB'ye yük; L'de arıtma modülü (B6) değerlidir |
| Bakım ve işletme | ×1 | ×2 | ×3,2 | Parça/yem bağımlılığı artar |
| İnşa / yükseltme | ×1 | ×2,5 | ×4,5 | Sermaye kısıtı (§7.5) |
| Ayak izi (baş lider kararı) | yuva | yuva + 1 | yuva + 2 | Arsa kısıtı; yerinde büyümede ek bitişik hücre koşulu (§7.1.1) |

**Örnek: değirmen (`degirmen`, tahıl → un + kepek).**

| Ölçek | Ad | Tahıl | Elektrik | Un | Kepek | İşçi | KD (₺/sa) | KD/işçi | İnşa (para / çelik / parça) | Hücre | Kirlilik (ppm/sa) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| S | Değirmen Atölyesi | 200 | 12 | 150 | 30 | 5 | 1.920 | 384 | ₺10.000 / 60 / 20 | 2 | 20 |
| M | Un İmalathanesi | 440 | 26 | 330 | 66 | 9 | 4.224 | 469 | ₺25.000 / 150 / 50 | 3 | 44 |
| L | Un Fabrikası | 720 | 43 | 540 | 108 | 13 | 6.912 | 532 | ₺45.000 / 270 / 90 | 4 | 72 |

Not: tek tesisin ₺/sa'si kanalın sınırsız emdiği üst sınırdır; gerçek sınır NPC emilimi ve ilçe talebidir (dikey §1.2). Gerçek un fabrikası kapasite verisi (günlük ton) bulunmadı; ölçek **göreli** ve oyun ayarıdır (doğrulanmadı).

### 7.3 Küçük ilçede büyük fabrika: kilit değil, ekonomik sonuç

Aşağıdakiler **kilit değil, fren**dir; oyuncu isterse yine de kurar ve sonucu görür:

| Fren | Nasıl çalışır | Nerede görünür |
|---|---|---|
| **Yerel talep derinliği** | İlçe talebi çıktının küçük bir kesridir (hane gıda tüketimi `nufus.tuketim1000Saat.gida` = 200 mili/1000 kişi/sa; yani 50 bin nüfus ≈ 10 birim/sa); fazlası NPC pazarına (makas ≈ %20) ya da taşımayla gider | L Un Fabrikası (540 un/sa) küçük ilçede **bedelli ihracatçı** olur; KD makasla ≈ %20 erir |
| **Girdi kaynağı** | L haddehane 360 çelik/sa ister; çelik yoksa ithalat (×1,10) marjı eritir (Senaryo 3: KD ₺9.630 → ₺5.310) | Maliyet kartı "gereken / var" |
| **Elektrik** | L çıktıyla doğrusal elektrik ister; şebeke yetmezse mevcut brownout çarpanı verimi orantılı düşürür | Dikkat paneli (brownout) |
| **İşçi havuzu** | L işçi ×2,6; ilçenin işgücü havuzu ([canli-dunya §3.6](canli-dunya-simulasyonu.md)) küçükse çıktı orantılı düşer | Tesis kartı "işçi: 11/18" |
| **Arsa ve ayak izi** | L yuva + 2 bitişik hücre ve sanayi/OSB kullanım türü; küçük ilçede uygun bitişik hücre kıt ve pahalı olabilir; yerinde büyümede bitişik boş hücre yoksa yükseltme yapılamaz, doğrudan kurulum başka yerde mümkündür (§7.1.1) | Hazır arsa ekranı, maliyet kartı |
| **Taşıma** | İller arası akış filo/konvoy ister; stok il düğümündedir | Lojistik paneli |

**Ağır tesislerde arsa niteliği ve ayak izi koşulları** (arsa/kaynak niteliğidir, ilerleme kilidi değil):

| Tesis / yöntem | S Atölye | M İmalathane | L Fabrika | Kirlilik (S, ppm/sa) | Arsa niteliği ve ayak izi |
|---|---|---|---|---:|---|
| `degirmen`, `makarna_hatti`, `ekmek_firini` | Değirmen/Fırın Atölyesi | Un İmalathanesi | Un Fabrikası | 20 | Tarım ya da ticari kullanım; sanayi şart değil |
| `peynir_mandira` | Mandıra | Süt İmalathanesi | Süt Fabrikası | 20 | Soğuk dolap modülü (seçim) |
| `yem_misirli`, `yem_arpali` | Yem Atölyesi | Yem İmalathanesi | Yem Fabrikası | 20 | Ova/tarım yakını; girdi taşıma maliyeti |
| `mezbaha_kesim` | Kasap Atölyesi | Mezbaha | Et Kombinası | 50 | Sanayi kullanım; arıtma modülü bedeli sabit → S'de KD/işçi düşer |
| `tabaklama` | Tabakhane Atölyesi | Tabakhane | Deri Fabrikası | 90 | **Sanayi kullanım türü (OSB/Sanayi Adası) ya da arıtma modülü** (gerçek Tuzla Deri OSB modeli [K6]); S'de de kurulur, ama sabit arıtma gideri KD/işçiyi 230'a çeker |
| `cimento_kalker` | Çimento Atölyesi | Çimento İmalathanesi | Çimento Fabrikası | 120 | **Kireçtaşı damarı bitişikte** ya da taşıma; sanayi kullanım |
| `insaat_demiri`, `profil_haddeleme` | Haddehane Atölyesi | Haddehane | Çelik Haddehanesi | 80 | Sanayi kullanım; `celik` girdisi bitişikte ya da ithal |
| `kablo_bakir`, `kablo_iletim_al` | Kablo Atölyesi | Kablo İmalathanesi | Kablo Fabrikası | 20 | `petrokimya`/alüminyum girdisi |
| `ayakkabi_atolyesi`, `canta_atolyesi`, `mont_atolyesi` | Ayakkabı Atölyesi | İmalathane | Fabrika | 20 | Talep derinliği düşük (emilim 40–70/sa): L ekonomik olarak zayıf, kilit yok |
| Kümes (`kumes_*`) | Kümes | Tavuk Çiftliği | Büyük Çiftlik | 10 | L'de sağlık tavanı 0,9 (modern kümes modülü satın alınırsa 1,0) |

**Ölçek ekonomisi yeterli mi?** M işçi başına +%22, L +%38 verim verir; ama elektrik ve girdi doğrusaldır, kirlilik ve bakım ağırlaşır. L'nin gerçek avantajı yalnız işçi verimidir; bu bilinçlidir ("büyük" otomatik olarak daha kârlı değildir). Önerilen ince ayar (ölçüm sonrası, geri dönüşü kolay): **L fabrikada girdi ×3,4** (çıktı ×3,6; +%6 verim); bu `olcekKademeleri` ek alanıdır, kimlik etkilemez.

### 7.4 Yapı türü yerleşimi: hangi yöntem hangi tesiste doğar? (geri dönüşü zor)

Yöntem `id`'leri değişmez ama **tesis türünün `yontemler[]` listesi** değiştirilirse canlı tesisler (`tesis.tur`, `tesis.yontem`) bozulur; bu yüzden **ilk veri sürümünden önce** yerleşim kararı verilmelidir. Yapı başına yöntem sayısı (Alfa-0 → Sonra) ve öneri:

| Tesis türü | Mevcut + dikey | + Bu rapor | Toplam (Sonra) | Öneri |
|---|---|---|---:|---|
| `gida_fabrikasi` | 6 (`standart_gida_isleme`, `degirmen`, `ekmek_firini`, `peynir_mandira`, `findik_kavurma`, `findik_ezme_sekerleme`) | 12 (`yem_misirli`, `yem_arpali`, `makarna_hatti`, `hamur_isi_firini`, `hazir_yemek`, `mezbaha_kesim`, `biskuvi_hatti`, `nisasta_degirmeni`, `malt_evi`, `icecek_hatti`, `et_isleme`, `sekerleme_nisastali`) | **18** | **Kalabalık.** Alfa-1'de **üç aileli seçici** (Un ve Unlu Mamuller / Süt, Et, Yem / Tatlı ve İçecek) ya da ayrı tesis türü (`et_sut_tesisi`); karar §10 K-7 |
| `ahir` | 2 (`ahir_besi`, `sut_sigirciligi`) | 5 (`sut_kepekli`, `ahir_sut_yemli`, `besi_yemli`, `kumes_yumurta`, `kumes_pilic`) | 7 | Kabul (≤ 10) |
| `mera` | 2 (`mera_hayvancilik`, `mera_sutculuk`) | 1 (`mera_koyun_yun`) | 3 | Kabul |
| `celikhane` | 6 (`yuksek_firin`, `elektrik_ark`, `cam_firini`, `cimento_firini`, `alumina_bayer`, `aluminyum_ergitme`) | 4 (`cimento_kalker`, `cam_kalkerli`, `insaat_demiri`, `profil_haddeleme`) | 10 | Sınırda; ölçüm sonrası "Fırın" (cam, çimento, alümina) ve "Haddehane" ayrımı (§10 K-8) |
| `parca_fabrikasi` | 4 (`standart_parca`, `otomatik_hat`, `celik_dograma`, `aluminyum_dograma`) | 3 (`kablo_bakir`, `kablo_iletim_al`, `celik_dograma_profilli`) | 7 | Kabul; tekstil ve deri yöntemleri `hafif_sanayi`'ye gider |
| **`hafif_sanayi` (önerilen 20. yapı)** | 3 (dikey `iplik_egirme`, `kumas_dokuma`, `konfeksiyon`; henüz doğmadılar, taşınabilir) | 6 (`tabaklama`, `ayakkabi_atolyesi`, `yun_egirme`, `canta_atolyesi`, `mont_atolyesi`, `makine_halisi_dokuma`) | 9 | **Önerilen:** dikey §9.3 ve cesitlilik Q1 "hafif sanayi tesisi"ni 19./20. yapı olarak zaten öngörmüştü; deri ve yün eklenince (A) seçeneği ("parça atölyesi" adı) yanıltıcı olur. **Karar ilk veri sürümünden önce** |

**Kural önerisi: tesis türü başına yöntem ≤ 10** (okunurluk). Seçici listesi **ilçe seviyesiyle değil, oyuncunun elindeki ölçek, sermaye ve açık teknolojiyle** (yöntem kilidi) süzülür; ilçe seviyesi yöntem kilidi değildir (§7.0).

### 7.5 Maliyet ve süre (S / M / L, taban fiyat)

Taban: `icerik.json` inşa maliyeti ve `mulk.yapiInsaSaati`; çarpan ×1/2,5/4,5 (maliyet) ve ×1/1,5/2 (doğrudan kurulum süresi); ayak izi `olcekHucre` = [`yapiYuva`, + 1, + 2] (§7.1.1; yuvası 1 olan türlerde 1 / 2 / 3, örneğin dükkân).

| Tesis türü | Para ₺ (S / M / L) | Çelik (S / M / L) | Parça (S / M / L) | Süre sa (S / M / L) | Hücre (S / M / L) |
|---|---|---|---|---|---|
| `gida_fabrikasi` | 10.000 / 25.000 / 45.000 | 60 / 150 / 270 | 20 / 50 / 90 | 6 / 9 / 12 | 2 / 3 / 4 |
| `ahir` | 8.000 / 20.000 / 36.000 | 40 / 100 / 180 | 15 / 38 / 68 | 4 / 6 / 8 | 2 / 3 / 4 |
| `mera` | 4.000 / 10.000 / 18.000 | 20 / 50 / 90 | 5 / 13 / 23 | 2 / 3 / 4 | 3 / 4 / 5 |
| `celikhane` | 20.000 / 50.000 / 90.000 | 100 / 250 / 450 | 40 / 100 / 180 | 10 / 15 / 20 | 3 / 4 / 5 |
| `parca_fabrikasi` | 15.000 / 37.500 / 67.500 | 80 / 200 / 360 | 30 / 75 / 135 | 8 / 12 / 16 | 2 / 3 / 4 |
| `hafif_sanayi` (öneri) | 12.000 / 30.000 / 54.000 | 70 / 175 / 315 | 25 / 63 / 113 | 8 / 12 / 16 | 2 / 3 / 4 |
| Taş/maden ocağı (`silis_ocagi` kalıbı) | 6.000 / 15.000 / 27.000 | 30 / 75 / 135 | 10 / 25 / 45 | 6 / 9 / 12 | 2 / 3 / 4 |

Not: ilk 24 saatte erken oyun hızlandırması ve ilk 5 yapıda %30 indirim ayrıca uygulanır ([baslangic §5.2](baslangic-ve-ustalik.md)). Yeni oyuncu hibesi ₺50.000'dir: L fabrika (₺45.000–90.000 + yüzlerce çelik) **hibeyle pratikte kapalı ama kilitli değil**; sermaye biriktiren oyuncu doğrudan kurar.

## 8. Karmaşıklık bütçesi

### 8.1 Kademeli açılış (Alfa-0 / Alfa-1 / sonra)

**Kademe = yayın/geliştirme aşaması** (içeriğin ne zaman eklendiği); oyuncunun ilerleme basamağı değildir. Yayımlanan her mala, her ölçeğe ve her yönteme erişim serbesttir (§2.5).

Sayımlar: **mal** = bu raporun ağı (Tier 1 ve zincir ara malları; il imza Tier 2/3 malları ayrıdır). Kilitli Alfa-0 23 mal; A0-ops +4; dikey Alfa-1 +4.

| Kademe | Eklenen mal | **Kümülatif mal** | Eklenen yöntem | **Kümülatif yöntem** | Zincir hattı | Yapı türü | Dükkân türü | Başta görünen mal (üst; süzgeç, kilit değil) | Hedef etkin liste |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **Alfa-0 (kilit 23 + kepek)** | +1 (`kepek`) | **24** | +10 (dikey 9 + `sut_kepekli`) | 34 | 5 (4 dikey + kepek-gübre döngüsü) | 19 (`dukkan` ek yapı) | 5 | 16 | 20 |
| **A0-ops** | +4 | 28 | +5 | 39 | 6 | 19 | 5 | 18 | 24 |
| **Alfa-1** | +19 | **47** | +27 (dikey 5 + bu rapor 22) | 66 | 16 | 20 (`hafif_sanayi`) | 8 | 24 | 36 |
| **Sonra** | +8 | **55** | +9 | 75 | 17 | 20–21 | 8 | 28 | 36 (aile sekmeli) |

Alfa-1'in 19 malı: `misir`, `arpa`, `yem`, `makarna`, `kasaplik`, `et`, `yumurta` (7); `pamuk`, `iplik`, `kumas`, `hazir_giyim` (dikey, 4); `yun`, `deri`, `islenmis_deri`, `ayakkabi` (4); `kirectasi`, `kablo`, `insaat_demiri`, `profil` (4). Sonra'nın 8'i: `biskuvi`, `nisasta`, `malt`, `icecek`, `canta`, `mont`, `makine_halisi`, `et_urunu`.

**Alfa-1 içinde dört dilim** (haftalık yeni kavram sınırı S12): **A1-a** yem ve hayvancılık (6 mal), **A1-b** deri ve tekstil (8 mal, dikeyin pamuk zinciriyle birlikte), **A1-c** yapı ve maden (4 mal), **A1-d** makarna (1 mal). Oyuncu için bir dilim bir "Defter sayfası"dır (rehber-gorevler; yeni zincir = yeni sayfa, ödül kavram bazlı).

**Tier 1 sayımı revizyonu.** [cesitlilik §7.1](cesitlilik-uretim-katmanlari.md) Tier 1'i 29, Alfa-0 çekirdeğini 35, görünen mal tavanını 28 saymıştı. Bu ağla Tier 1 ve zincir ara malları ≈ 55–62'ye çıkar (bu rapor 55 + başka zincirlerin 7'si: `arac`, `petrokimya`, `kereste`, `mobilya`, `kagit`, `odun`, `taze`). **Tablolar güncellenmeli** ("Tier 1 temel" ve "zincir ara malı" ayrı satırlar; zincir ara malı yalnız ilgili zinciri işleten oyuncuya görünür, §8.3).

### 8.2 Sınır tablosu (karmaşıklık bütçesi)

| Sınır | Değer | Gerekçe |
|---|---:|---|
| Tek ekranda mal çipi | **≤ 9** (sekme/aile ile sayfalama) | [arayuz-ux](arayuz-ux.md): "10'dan fazla mal çipi" sorun; 7±2 ilkesi (genel bilgi, doğrulanmadı) |
| Haritada aynı anda gösterilen mal/akış | ≤ 5 | tek mercek açık (gorsel-kimlik) |
| Görünen mal (başta) | ≤ 16 (Alfa-0) | cesitlilik S-2 |
| Görünen mal (ilk ay) | ≤ 24 | cesitlilik §7.5 "bir ayda ≈ 22–28" |
| Etkin liste (Alfa-1 sonu) | **≤ 36** (S-2'nin 28 tavanı revize) | 5 aile × ≤ 8 (aile sekmesi) |
| Zincir kartı | ≤ 4 kademe, ≤ 6 mal | S7; tek bakış |
| Yöntem başına girdi/çıktı | ≤ 3 girdi çeşidi / ≤ 3 çıktı satırı | S6 |
| Tesis türü başına yöntem | ≤ 10 (öneri) | §7.4 |
| Oyuncu başına haftada yeni mal | ≤ 3, yeni zincir ≤ 1 | S12 |
| Aynı anda aktif Fırsat Kartı | ≤ 1/gün (dikey §7.2) | mevcut |
| Defter'de açık zincir sayfası | ≤ 3 eş zamanlı vurgulu | rehber-gorevler "Bugün" sayfası |

### 8.3 Görünürlük kuralı (bağlama duyarlı)

Mal listesi **bağlama göre süzülür**; katalog büyük, ekran küçük (cesitlilik §3). **Süzgeç bir kilit değildir:** "Tüm mallar" her zaman açıktır; oyuncu hiçbir ilçe seviyesi, sicil ya da ölçek şartı olmadan her malı üretir, alır ve satar.

1. **İlgili mal** = stokta olan ∪ işlettiği yöntemlerin girdi/çıktısı ∪ dükkân raflarındaki mallar ∪ açık Fırsat Kartı mallarıdır.
2. **Aile sekmeleri** (5 aile, §5.1) sabittir; sekme başına en çok 8 mal.
3. **Ara mal sessizliği:** zincir ara malı (`yem`, `kasaplik`, `islenmis_deri`, `kepek`, `nisasta`, `malt`, `profil`, `kablo`…) yalnız o zinciri **işleten ya da stoğunda tutan** oyuncuya pazar ekranında görünür; diğerleri "Tüm mallar"ın altındadır. Böylece bir Tarım oyuncusu 55 malı görmez, 12–16 görür.
4. **Ürün Atlası** keşfi ödüllü kılar (cesitlilik §7.5); "ilk yan ürün satışı", "ilk kapalı döngü" yeni Defter kavramlarıdır (ödül tablosu çekirdekte; G4).

### 8.4 Ölçüm hipotezleri (UA1–UA10; kapı değil, izleme)

| # | Gösterge | Hedef |
|---|---|---|
| UA1 | Tüketici türü < 2 olan mal sayısı (derleme testi) | **0** |
| UA2 | Bir oyuncunun tek ekranda gördüğü mal çipi | ≤ 9 |
| UA3 | Yeni oyuncunun ilk gün/hafta/ay görünen malı | ≤ 16 / ≤ 20 / ≤ 24 |
| UA4 | Yan ürün israfı (üretilen yan ürünün stokta çürüyen yüzdesi) | < %15 |
| UA5 | Kapalı döngü oranı (kepek, gübre, deri yan ürününü değerlendiren oyuncu payı) | ≥ %40 (Alfa-1 ortası) |
| UA6 | Kısa yol / uzun yol dağılımı (ör. süt: `sut_sigirciligi` vs `ahir_sut_yemli`) | uzun yol ≥ %25 (Alfa-1 sonu); kısa yol hiçbir zaman çökmez |
| UA7 | Ölçek dağılımı (S/M/L) ve L fabrikanın kirlilik/komşu şikâyeti | L ≤ %15 tesis |
| UA8 | Bot zincir erişilebilirliği (her zinciri bir bot tamamlayabilir mi) | 17/17 |
| UA9 | Sürü sağlığı dağılımı ve hastalık olayı kaybı | ort. ≥ %70; olay kaybı oyuncu başına ≤ %5/hafta |
| UA10 | Ara kademe uzmanlığı (mezbaha/yem/tabakhane tek-başına kârlılık) Alfa-0'da negatif, Alfa-1 sözleşmeyle sıfır-üstü | dikey §6.2 ile aynı eğri |

---

### 8.5 Karmaşıklık puanı (KP; sayısal bütçe, öneri, kalibre edilmedi)

Her yayın dilimine **bilişsel yük puanı** verilir; dilim bütçeyi aşarsa bölünür. Ağırlıklar: yeni mal **1**; yeni yöntem **0,5**; yeni tesis türü **4**; oyuncunun öğrenmesi gereken yeni kavram/gösterge **3–6**; yeni olay türü **4**. **Bütçe: bir dilim ≤ 16 KP; Alfa-0 eki ≤ 5 KP.**

| Dilim | Mal | Yöntem | Tesis | Kavram / olay | **KP** | Bütçe |
|---|---:|---:|---:|---|---:|---|
| Alfa-0 eki (`kepek`, kepek-gübre döngüsü) | 1 | 1 (0,5) | 0 | yan ürün kavramı 3 | **4,5** | ≤ 5 uygun |
| A1-a Yem ve hayvancılık | 6 | 7 (3,5) | 0 | sürü sağlığı göstergesi 6 | **15,5** | ≤ 16 uygun |
| A1-b Deri ve tekstil (bu rapor) | 4 | 4 (2) | 1 (`hafif_sanayi`, 4) | OSB arsa niteliği 0 | **10** | uygun; dikeyin pamuk zinciri (+5,5) ayrı dilim |
| A1-c Yapı ve maden | 4 | 8 (4) | 0 | — | **8** | uygun |
| A1-d Makarna ve hamur işi | 1 | 3 (1,5) | 0 | — | **2,5** | uygun |
| Sonra-a Tahıl uzantıları | 4 (`biskuvi`, `nisasta`, `malt`, `icecek`) | 5 (2,5) | 0 | — | **6,5** | uygun |
| Sonra-b Deri ürünleri ve olay | 4 (`canta`, `mont`, `makine_halisi`, `et_urunu`) | 4 (2) | 0 | `sure_hastaligi` olayı 4 | **10** | uygun |
| **Toplam (bu rapor)** | 24 | 32 (16) | 1 (4) | 13 | **≈ 57** | — |

KP bir **sıralama ve bölme aracıdır**; sayılar ağırlık seçimine duyarlıdır. UA3 ve UA10 ile birlikte okunur (yeni oyuncunun ilk hafta yükü).

## 9. Alfa-0'a dokunuş, Alfa-1 sırası ve öncelik

### 9.1 Alfa-0 (en küçük dokunuş)

| # | İş | Neden | Zorunlu mu? |
|---|---|---|---|
| A0-1 | `kepek` 24. mal (`degirmen` çıktısına satır) | İlk kapalı döngü; yan ürün kavramı | Önerilir; hayırsa Alfa-1'e |
| A0-2 | `sut_sigirciligi` çıktısına 4 `gubre` (+süt 85) ve `sut_kepekli` yöntemi | Gübre → Tarla döngüsü (mevcut `gubre` ve Tarla gübre dozu) | Önerilir |
| A0-3 | Çıkmaz-mal doğrulayıcısı (UA1) taslağı | 23 mal, `boksit`/`findik` ikinci tüketici | Derlemede uyarı olarak |
| A0-4 | `NpcAlici` güvence kayıtları (kepek, gübre) küçük bütçeli | Yan ürün çöpe gitmesin | Opsiyonel |
| A0-5 | Görünürlük: bağlama duyarlı mal listesi (§8.3) | 16 mal sınırı | Alfa-0'da basit sürüm: stokta ∪ zincirde |

**Alfa-0'a girmeyenler:** yem fabrikası, mezbaha, deri, makarna, bisküvi, nişasta, malt, kablo, inşaat demiri, profil, kireçtaşı, hayvan sağlığı göstergesi (A1).

### 9.2 Alfa-1 sırası (öneri)

1. **A1-a Yem ve hayvancılık** (`misir`, `arpa`, `yem`, `kasaplik`, `et`, `yumurta`): ekim ürünü genişlemesi, `yem_*`, `ahir_sut_yemli`, `besi_yemli`, `kumes_*`, `mezbaha_kesim`; sürü sağlığı göstergesi; hayvan pazarı `NpcAlici`.
2. **A1-b Deri ve tekstil** (`yun`, `deri`, `islenmis_deri`, `ayakkabi` + dikey pamuk zinciri): `hafif_sanayi` yapısı (karar §10 K-6), `mera_koyun_yun`, `tabaklama` (OSB şartı), `yun_egirme`, `ayakkabi_atolyesi`.
3. **A1-c Yapı ve maden** (`kirectasi`, `kablo`, `insaat_demiri`, `profil`): `cimento_kalker`, `cam_kalkerli`, `kablo_*`, `insaat_demiri`, `profil_haddeleme`, `celik_dograma_profilli`; L ölçek maliyetine `kablo`.
4. **A1-d Makarna ve hamur işi:** `makarna_hatti`, `hamur_isi_firini`, `hazir_yemek` (mal yok, yöntem).
5. **Sonra:** `biskuvi`, `nisasta`, `malt`, `icecek`, `canta`, `mont`, `makine_halisi`, `et_urunu`; `sure_hastaligi` olayı.

### 9.3 Zincir öncelik ve yatırım tablosu

Yatırım: ilgili zincirin **bu rapora özgü yapıları** (S ölçek, taban fiyat); hücre = `yapiYuva`; süre = Σ `yapiInsaSaati` (ardışık; iki eşzamanlı inşaatla yaklaşık yarısı). Çelik ve parça maliyeti yanında verilir. Taban değer = ₺ + çelik × ₺120 + parça × ₺180.

| Zincir | Hat | Alfa | Yeni mal | Yeni yöntem | Yapılar | Yapı / hücre | Para ₺ | Çelik / parça | Süre (sa) | Taban değer ₺ |
|---|---|---|---:|---:|---|---|---:|---|---:|---:|
| H1 Süt ve yem döngüsü | hayvancılık | **A0 (kısa) / A1 (uzun)** | 1 → 3 | 2 → 5 | Tarla, değirmen, yem, ahır, mandıra | 5 / 10 | 44.000 | 250 / 85 | 24 | 89.300 |
| T1 Un ve unlu mamuller | tahıl | A0 / A1 / S | 0 → 3 | 0 → 6 | Tarla, değirmen, makarna hattı | 3 / 6 | 26.000 | 150 / 50 | 14 | 53.000 |
| M3 Çelik ürünleri | sanayi | A1 | 2 | 3 | Çelikhane, haddehane, doğrama | 3 / 8 | 55.000 | 280 / 110 | 28 | 108.400 |
| M1 Çimento | sanayi | A1 | 1 | 3 | Taş ocağı, çimento fırını | 2 / 5 | 26.000 | 130 / 50 | 16 | 50.600 |
| H2 Et ve deri | hayvancılık | A1 | 4 (+`ayakkabi`) | 6 | Besi, yem, mezbaha, tabakhane, atölye | 5 / 10 | 52.000 | 300 / 105 | 32 | 106.900 |
| H3 Kümes | hayvancılık | A1 | 1 (`yumurta`) | 2 | Yem, kümes | 2 / 4 | 18.000 | 100 / 35 | 10 | 36.300 |
| M2 Kablo | sanayi | A1 | 1 | 3 | Bakır madeni, kablo fabrikası | 2 / 4 | 25.000 | 130 / 50 | 14 | 49.600 |
| H4 Yün ve halı | tekstil | A1 / S | 1 (+1 S) | 2 (+1 S) | Mera, iplik, dokuma, halı | 4 / 9 | 40.000 | 230 / 80 | 26 | 82.000 |
| T2 Mısır ve nişasta | tahıl | A1 / S | 1 (+1 S) | 1 (+2 S) | Tarla, nişasta, şekerleme | 3 / 6 | 26.000 | 150 / 50 | 14 | 53.000 |
| T3 Arpa, malt, içecek | tahıl | A1 / S | 1 (+2 S) | 1 (+2 S) | Tarla, malt evi, içecek hattı | 3 / 6 | 26.000 | 150 / 50 | 14 | 53.000 |

Yorum: yatırımlar dikeyin zincirleriyle (₺32.000–188.000) aynı sıradadır; yeni oyuncu hibesi (₺50.000) tek bir kısa zinciri (T1, T3) ya da H3'ü kurar; H2 ve M3 sermaye biriktirmiş oyuncunun ya da **sözleşmeli ortaklığın** işidir (Senaryo 2). Hiçbiri kilitli değildir.

---

## 10. Geri dönüşü zor kararlar

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| **K-1** | **Kimlik kilidi eki: 21 yeni + 3 planlı = 24 mal** (`kepek` … `et_urunu`; §3.2) | Kimlik yayımlanınca kalıcıdır (G8); `il-imza.json` ve `icerik.json` ilk sürümden önce | İlk `icerik.json` ve `il-imza.json` commit'inden **önce** kilitle; `sarkuteri` → `et_urunu`; `et` adı "Et" |
| **K-2** | **Birleşik mallar bölünmez:** `et` (kırmızı+beyaz), `sut` (inek/koyun/manda), `yun` (yün/kıl/tiftik), `iplik` (pamuk/yün/sentetik), `gida` (pide, köfte, hazır yemek) | Sonradan bölmek stoku, tarifi, imzayı ve il imzasını kırar | Cins farkı yöntem ve imzada; yeni mal ancak mal kapısıyla (cesitlilik §3) |
| **K-3** | **`kasaplik` mal olarak** (canlı hayvan partisi) | Besiden doğrudan `et` (mezbahasız) yolu ucuz ama `deri` ve mezbaha uzmanlığını öldürür; sonradan eklemek tarifleri yeniden yazar | Mal olarak kabul; sınırlı (S1 istisna); hayvan pazarı N tüketicisi |
| **K-4** | **`degirmen` ve `sut_sigirciligi` tarifleri (kepek/gübre satırı)**: yöntemin kendisine mi eklenir, yoksa `_kepekli` yeni yöntem mi? | Veri henüz doğmadı: ilk sürümde eklenirse bedava; sonra eklenirse G8 gereği yeni yöntem + eski yöntem sonsuza dek kalır | **Alfa-0 verisi yazılmadan önce yöntemin kendisine işle** (kepek 24. mal ile birlikte); kabul edilmezse ikisi de Alfa-1'e ve `_kepekli` ek yöntem olur |
| **K-5** | **`kepek` Alfa-0 veri imzasında mı?** | 24. mal; Alfa-0 başta 16 görünen mal sınırını etkilemez (ara mal sessiz) ama değirmen çıktısı veri imzasına girer | Önerilen **evet**; ret hâlinde A1 |
| **K-6** | **Yöntemlerin hangi tesis türünde doğduğu** (özellikle deri/tekstil: `parca_fabrikasi` mi, `hafif_sanayi` mi) | Tesis türünün `yontemler[]` listesi canlı tesislerle bağlıdır; sonradan taşımak göç ister | **`hafif_sanayi`** (20. yapı) ilk veri sürümünde; dikeyin `iplik_egirme`, `kumas_dokuma`, `konfeksiyon` yöntemleri de oraya (henüz doğmadılar) |
| **K-7** | **`gida_fabrikasi` 18 yönteme çıkıyor** (§7.4): tek yapı + görünür ad mı, ayrı `et_sut_tesisi` mi? | Ayrı tesis türü yapı sayısını ve imar eşlemesini büyütür; tek yapı seçici okunurluğunu bozar | **Alfa-0'da tek yapı; seçici 3 aileli;** A1 ölçümünde (UA2) yöntem >10 olursa ayrı yapı (yeni tesis türü eklemek bedava, yöntem taşımak değil) |
| **K-8** | **`celikhane` 10 yöntem** ("Fırın" ve "Haddehane" ayrımı) | Aynı (yöntem taşımak canlı tesisleri bozar) | Ölçüm sonrası; hafif sanayi ilk karar |
| **K-9** | **Ölçek adlandırması: aynı yapı türü, üç ölçek, iki yol** (atölye/imalathane/fabrika) | UI dili ve tesis kimliği; ölçek yeni yapı türü olarak kodlanırsa geri alınmaz | Yerinde yükseltme + doğrudan kurulum (§7.1); ad = ölçek + yöntem; L girdi ×3,4 parametre (kolay geri döner) |
| **K-14** | **Ayak izi ölçekle büyür (baş lider kararı; Z4 revizyonu)**: `mulk.olcekHucre[tür] = [S, M, L]` = [yuva, yuva + 1, yuva + 2] | Z4: "sonradan büyütme kırıcıdır": `tesis.hucreler` şeması, biçim kümesi (≤ 5 hücre), çizim, hazır arsa adaları, yerinde yükseltmede ek hücre edinme ve komut şeması etkilenir; alternatif (aynı ayak izi) seçilirse L'nin bedeli yalnız sermaye, girdi, elektrik, işçi, kirlilik ve bakım olurdu | Karar verildi (baş lider): parametre Alfa-0 veri imzasına girer; yerinde yükseltme ek bitişik hücre ister (fiziksel koşul, kilit değil); kamu hücresi alınamaz; 72/%25 tavanları geçerli; arsa-ve-insa Z4 ve perakende raporu (süpermarket hücresi) bu doğrultuda güncellenmeli |
| **K-10** | **Çıkmaz-mal kuralının doğrulayıcıda hata olması** (UA1) | Sonradan sıkılaştırmak mevcut malları bozar | Derlemede hata; N tüketicisi (bütçeli alıcı) sayılır (K-5 para güvenliği) |
| **K-11** | **Hayvan sağlığı `asinmaPpm` ve `bakim_duzeyi`'ni paylaşır** (yeni alan yok) | Çekirdek alanı iki anlamla yüklenir; sonradan ayırmak göç ister | Paylaş, ama tesis türü etiketiyle ayrıştır; ayrı alan gerekirse A1 başında |
| **K-12** | **Cesitlilik S-2/Tier 1 sayım revizyonu** (29/28 → ≈ 55/36 etkin) | Üst belge sayıları değişir; görünürlük kuralı tüm raporların varsayımıdır | Tier 1 "temel" ve "zincir ara malı" ayrı; görünürlük §8.3 |
| **K-13** | **"Seviye ya da kilit yok, seçim var" (sahip kararı):** ölçek, ilçe seviyesi, sicil ve "önce küçük ölçek" açılış kilidi **olmaz**; teknoloji yalnız yöntem açar | Bir kez kilit koyulup sonra kaldırılırsa oyuncu beklentisi ve ekonomi dengesi kırılır; tersi (kilit eklemek) "zorla" algısı ve veri göçü doğurur | §2.5 ve §7.0: (1) `olcekKademeleri[2].gerekliTeknoloji` mülk kipinde kalkar (baş lider kararı; bölge kipi değişmez); (2) 11 §7.4 ilçe seviyesi kilidi geçersiz, yalnız kolektif dünya durumu (baş lider kararı); (3) `tesis_insa_hucre` ve `yapi_yerlestir` `olcek` alanı; (4) tek kısıtlar: sermaye, arsa ve ayak izi, girdi ve elektrik, işletme gideri, adalet korumaları; (5) küçük ilçede büyük fabrikanın zayıflığı ekonomik fren (§7.3) |

---

## 11. Riskler ve sahip soruları

**Riskler.**

| # | Risk | Olasılık | Etki | Önlem |
|---|---|---|---|---|
| R1 | **Kapsam kayması:** 24 mal, 32 yöntem, 10 yeni zincir hattı tek seferde | Yüksek | Yüksek | A1-a/b/c/d dilimleri; aynı anda tek dilim; her dilim ölçülerek (UA1–UA10) |
| R2 | Yan ürün yığılması (kepek, gübre, deri çürür) | Orta | Orta | Güvence `NpcAlici` (R'nin %50'si); UA4 |
| R3 | Çıkmaz mal derleme kuralının N tüketicisiyle "kandırılması" (her mal ihracatçıya satılabilir) | Orta | Orta | N tüketicisi bütçeli ve küçük; ara/son mal için Ü/H/K/Y/O zorunlu (§2.4 kural 1) |
| R4 | Hayvan sağlığı hesabı kafa karıştırır / duyarlı içerik | Düşük | Orta | Tek satır görünüm; ölüm yok; olay "aksıyor" dili |
| R5 | Tabakhane OSB şartı oyuncuya cezalandırıcı görünür | Orta | Düşük | Arıtma modülü yolu; kısa yolda `deri` ithal edilebilir |
| R6 | Kısa yol uzun yolu gereksiz kılar ya da tersine | Orta | Yüksek | UA6; uzun yol +%10–25 katma değer, kısa yol hiç silinmez |
| R7 | Dikey rapor tarifleriyle çakışma (kepek, çimento, doğrama) | Orta | Orta | K-4 ve §3.3 notları: yeni yöntem eklenir, eskisi kalır |
| R8 | Fiyat dengesi: `deri`, `kablo`, `profil` ara kademede aşırı kârlı | Orta | Düşük | Bot ölçümü; fiyatlar kalibre edilmedi |

**Sahip soruları.**

| # | Soru | Öneri |
|---|---|---|
| SS-1 | Alkollü içecek (bira) ve tütün oyunda **hiç** olmasın mı? (`malt` yalnız alkolsüz içeceğe gider) | Evet: profesyonel ürün ve hassas içerik ilkesi |
| SS-2 | Alfa-0'a 24. mal `kepek` ve gübre döngüsü girsin mi (23 → 24)? | Evet; hayırsa A1 |
| SS-3 | Deri/tabakhane OSB'ye bağlansın mı (gerçek Tuzla modeli) yoksa serbest mi? | OSB ya da arıtma modülü |
| SS-4 | Hayvan sağlığı "ölüm yok, üretim aksıyor" diliyle sunulsun mu? | Evet |
| SS-5 | `et` bayram haftası talebi oyunda hatırlatma ve talep dalgası olarak görünsün mü? (12 §7: dini bayramlar talep eğrisinde ve hatırlatma takvimi) | Evet, talep zamanlaması; toplam sabit |
| SS-6 | L ölçeğin `otomasyon` teknoloji kilidi kaldırılsın mı (K-13)? | **Karar verildi (baş lider):** mülk kipinde kalkar, bölge kipinde değişmez; `otomasyon` yalnız `otomatik_hat` açar |

---

## 12. Gerçek Türkiye verisi ve kaynaklar

Kaynakların çoğu haber ve arama özeti: sayılar **ilham ve yön** içindir; birincil TÜİK/Bakanlık tablosu okunmadı, "doğrulanmadı". Tarih: 1 Ekim 2026'da erişilen en güncel veri.

| # | Konu | Bulgu | Kaynak |
|---|---|---|---|
| K1 | Tahıl üretimi 2025 | Buğday 17,9 M ton (−%13,7), arpa 6,0 M ton (−%25,9), mısır 8,5 M ton (+%4,9) (arama özeti) | [CNN Türk: 2025 bitkisel üretim](https://www.cnnturk.com/ekonomi/turkiye-2025-bitkisel-uretim-rakamlari-aciklandi-2377488) |
| K2 | Hayvan sayısı 2025 | Büyükbaş 17,7 M (sığır 17,54 M, manda 0,16 M), küçükbaş 57,9 M (koyun 46,7 M, keçi 11,2 M) | [AA: hayvan sayısı 2025](https://www.aa.com.tr/tr/ekonomi/buyukbas-hayvan-sayisi-2025te-17-7-milyon-kucukbas-sayisi-yaklasik-57-9-milyon-oldu/3825424) |
| K3 | Kırmızı et ve süt 2025 | Kırmızı et 1,885 M ton (−%10,5; sığır 1,313 M, koyun 0,468 M), çiğ süt 21,38 M ton (−%4,9; %94,5 inek) | [DHA: TÜİK kırmızı et ve süt](https://www.dha.com.tr/yerel-haberler/ankara/tuik-kirmizi-et-ve-cig-sut-uretimi-azaldi-2866904) |
| K3b | Karkas verimi | Gerçek karkas oranı ≈ %50–55 (genel bilgi, doğrulanmadı) | (genel bilgi) |
| K3c | Şap ve fiyat etkisi | Üretim düşüşünde sebep olarak bildirilmiş (doğrulanmadı) | [Taka Gazete](https://www.takagazete.com.tr/kirmizi-et-ve-sut-uretiminde-sert-dusus-sebep-fiyat-ve-sap-hastaligi) |
| K4 | Kümes hayvancılığı | Aylık tavuk eti ≈ 232–252 bin ton, yumurta ≈ 1,6–1,9 milyar adet (2025–2026) | [Medya Gazete: TÜİK Temmuz 2026](https://www.medyagazete.com/haber/tuik-temmuz-2026-kumes-hayvanciligi-verilerini-acikladi-1454763) |
| K5 | Un ve makarna | Un ihracatında 2005'ten beri 1., makarnada 2.; küresel pay ≈ %23; kapasite ≈ 32 M ton, kullanım ≈ %45–50 (arama özeti) | [AA: Yumaklı un ve makarna](https://www.aa.com.tr/tr/ekonomi/bakan-yumakli-turkiye-dunyada-un-ihracatinda-birinci-makarna-ihracatinda-da-ikinci-sirada/3339264) · [Akdeniz Gazetesi](https://www.akdenizgazetesi.com/turkiye-un-ihracatinda-2005ten-bu-yana-zirvede) |
| K6 | Deri | İhracat 2025 ≈ 1,8 milyar $ (−%7,6), ayakkabı payı ≈ %55; Tuzla Deri OSB (1992; ≈ 223 fabrika; arıtma 36 000 m³/gün), Çorlu Deri OSB (arama özeti) | [Ticaret Bakanlığı: Deri sektör raporu](https://ticaret.gov.tr/data/5b87000813b8761450e18d7b/Deri%20ve%20Deri%20Mamulleri%20Sekt%C3%B6r%20Raporu.pdf) · [Capital: deri ve mamulleri](https://www.capital.com.tr/haberler/tum-haberler/10-soruda-deri-ve-deri-mamullerinde-son-tablo) · [Tekstil Bilgi: dericilik](https://tekstilbilgi.net/turkiyede-dericilik-sektoru.html) |
| K7 | Çimento | 2024 ≈ 82 M ton (dünyada 5.); klinker kapasitesi ≈ 98 M ton | [Gedik: çimento sektörü](https://cdn.gedik.com/media/media/zrtfqcfb/gedik_cimentosektoru_sektorguncellemeraporu-24112025.pdf) |
| K8 | Çelik | Ham çelik 2025 38,1 M ton (dünyada 7.), ark ocağı 27,5 M ton (≈ %72) | [KPMG: Çelik Sektörel Bakış 2026](https://kpmg.com/tr/tr/insights/2026/08/celik-sektorel-bakis-2026.html) |
| K9 | Kablo | Kablo ve emaye bobin teli ihracatı 2025 ≈ 1 milyar $ (+%16,4), bakır tel ≈ 0,7 milyar $; Denizli öncü | [Haber Denizli](https://www.haberdenizli.com/denizlinin-kablo-ve-bakir-tel-ihracati-rekora-kosuyor) |
| K10 | Halı | İlk 9 ay 2025 ≈ 2,0 milyar $ (404,7 milyon m²); makine halısı çoğunluk; Gaziantep makine halısı üretiminin ≈ %90'ı | [AA: halı ihracatı](https://www.aa.com.tr/tr/ekonomi/turk-halicilardan-9-ayda-2-milyar-17-milyon-dolarlik-ihracat/3723397) · [Fokus Plus](https://www.fokusplus.com/ekonomi/turkiyede-10-halidan-9u-gaziantepte-uretiliyor) |
| K11 | Karma yem | 2025'te 30,7 M ton (büyük/küçükbaş 18,2 M, kanatlı 11,2 M, balık 0,83 M); hammaddenin %54'ü ithal | [Feed Planet: karma yem 2025](https://feedplanetmagazine.com/tr/blog/turkiye-karma-yem-uretimi-307-milyon-tona-ulasti-5133) |
| K12 | Çimento hammaddesi | 1 t klinker için ≈ 1,52–1,65 t hammadde; kireçtaşı %67–75 | [ÇŞB: çimento MET kılavuzu](https://webdosya.csb.gov.tr/db/ippc/icerikler/ulusal-met-kilavuzu-20180425132410.pdf) |
| K13 | Madenler | Boksit: Akseki, Seydişehir, İslahiye, Karaman; demir: Divriği; bakır: Murgul, Küre, Maden, Çayeli, Ergani; kömür: Zonguldak, Soma, Elbistan (ikincil) | [Bilgi Ustam: Türkiye'de madenler](https://www.bilgiustam.com/turkiyede-madenler/) |
| K14 | Kümes sektör raporu | TEPGE durum-tahmin raporu (okunmadı) | [TEPGE kümes raporu 2025](https://arastirma.tarimorman.gov.tr/tepge/Belgeler/PDF%20Durum-Tahmin%20Raporlar%C4%B1/2025%20Durum-Tahmin%20Raporlar%C4%B1/K%C3%BCmes%20Hayvanc%C4%B1l%C4%B1%C4%9F%C4%B1%20Durum%20Tahmin%20Raporu%202025-427.pdf) |
| K15 | Yem sektör politikası | TAGEM yem sektörü politika belgesi (okunmadı) | [TAGEM yem sektörü](https://www.tarimorman.gov.tr/TAGEM/Belgeler/yayin/yemsekto%CC%88rpolitikabelgesi%20(1).pdf) |

Proje içi dayanaklar: `packages/veri/icerik/icerik.json` (14 mal, 24 yöntem, 18 tesis türü, `tarimUrunleri`), `parametreler.json` (`sanayi.olcekKademeleri`, `mulk.yapiYuva`, `mulk.hucreFiyati`), `il-imza.json` (`ileride`, `imza`, `aday`), `urun-pencere.json`, `packages/cekirdek/src/ekonomi/komut.ts` (`yontem_degistir`, `tesis_olcek_yukselt`).

**Karşılaştırma notu (Capital Rift ve Anno).** Sahibin örnek aldığı zincir oyunlarında yan ürün ve atık döngüleri (Anno'da hayvan yemi ve gübre dönüşümü, Capital Rift'te "her şey geri dönüşür") döngü hissinin kaynağıdır; bu rapor aynı iki ilkeyi (yan ürün ve çok tüketicili ara mal) **kısa/uzun yol** ve **çıkmaz-mal kuralıyla** karmaşıklığa ödünç vermeden taşır. Kaynak: dikey rapor K13 (üçüncü taraf wiki).
