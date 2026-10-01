# g8-istemci: Defter etkin kuralı, G8 metinleri, D2/D3 içerikten (K1)

Dal `takim/k1/g8-istemci` (taban `takim/k1/g9c-gorunen-ad` 27e5174; altta K2 defter yığınının kopyaları 7868f5a, f779180, 12b5f38, 028a0a2, 3445ebe: kapıda patch-id ile düşer). Kapı durumu: Playwright ve pnpm dunya koşulmadı. Doğrulama: istemci tsc ve eslint temiz; tek dosya, tek işçi vitest: harita-etkin 6, defter 8, harita-dukkan-html 51, harita-dukkan-veri 11, mulk-panel 8, harita-f4-yapi 17, harita-olcek 33, tasarim-metin 12 geçti.

1. `harita/etkin.ts`: protokol `kavramEtkin`'in girdisi içerik dizininden kurulur (yöntem çıktı mal kimlikleri, dükkân verisi); kavram kimliğine elle bakılmaz. `baglanti.ts` sahte defterin elle yazılmış etkin hesabı kalktı (`defterEtkin` ayarı; verilmezse boş içerik kuralı); `gorunum.ts` içerik dizininden verir.
2. `g8Acik(ic)` = `kavramEtkin(…, "ilk_pencere")` (içerikte pencere üreten yöntem var). D3 maliyet kartı `g8Acik` ile eksik pencerede `pencere_yok_g8` ("Pazar'dan alabilir ya da üretebilirsin").
3. D2 tür uyumu: `turUyumlari(ic, stokta)` ve `satilabilirMallar(ic)` `param.mulk.perakende.dukkanTurleri[].mallar`'dan (yapı market cam, pencere, çelik, parça içerikten; elle liste yok).
4. Defter `ilk_pencere.siradaki` "Çelik ve camdan pencere yap; camı önce silisten üret."
5. "Yuvayı boşalt" (A3 B1 kuralı): yuvada yalnız düğme; uyarı `D5.bosalt_uyari` yalnız onay adımında (`bosaltOnayHtml`), onay düğmesinin üstünde. `bosaltBeklemesi`: fiyatT 0 → tam pencere (`fiyatDegisimEnAzSaat`), sürüyorsa kalan, dolmuşsa 0 ve uyarı gizli (üç durum testli). K3 fiyatT-dongu B1 commit'iyle aynı pakete girmeli.
6. K2 köprüsü için: `DukkanKaydi.tur` `DukkanTuru | null` (inşadaki dükkân türsüz: ad "Dükkân", simge `store`).

Bağlı değil (köprü sonrası bağlama işi): `MulkPaneliSecenekleri.dukkan`, `dukkanKur`, D-7 marka komutu.
