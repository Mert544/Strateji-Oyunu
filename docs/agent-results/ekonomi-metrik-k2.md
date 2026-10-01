# ekonomi-metrik (K2)

Dal `takim/k2/ekonomi-metrik`, taban entegrasyon `d13ba4a`. Kaynak: A2 `docs/arastirma/alfa0-ekonomi-izleme.md` §8.2 (K2-1..K2-6) ve K2-7 yerine sermaye hazine farki (Ar-Ge 49400f4). `/metrik`'te OYUNCU ETIKETI YOK; cekirdek ve para defteri degismez.

## Yeni
- `packages/sunucu/src/ekonomi-metrik.ts`: `ekonomiOlcumu(dunya, ic)` (saf okuma) ve `SermayeSayaci`.
- `metrik.ts`: `MetrikGirdisi.ekonomi?` / `.sermaye?` (isteğe bagli) ve aile satirlari; `YazarMetrikleri.sermaye`.
- `sunucu.ts`: `metrikMetniUret` olcumu ekler. `yazar.ts`: `kaydiUygula` ve kurtarma oynatmasinda sermaye komutu oncesi/sonrasi hazine (komut zamanina kadar ilerletme cekirdekte notrdur; geçmis/cok ileri komutta ilerletilmez).
- Metrikler: `bolge_para_musluk_mili{kalem}`, `bolge_para_lavabo_mili{kalem}`, `bolge_odul_musluk_mili`, `bolge_kasa_sayisi`, `bolge_kasa_bakiye_mili`, `bolge_kasa_giris_mili{kalem}`, `bolge_kasa_cikis_mili{hedef}`, `bolge_pazar_fiyat_taban_orani{mal}`, `bolge_pazar_sinirda_mal{sinir}`, `bolge_tesis_yontem{tur,yontem}`, `bolge_tesis_asinma_ppm{tur,ceyrek}`, `bolge_tesis_asinma_adet{tur}`, `bolge_sermaye_komut_toplam{komut,kaynak}`, `bolge_sermaye_hazine_farki_mili{komut,kaynak}`, `bolge_sermaye_insan_oyuncu_sayisi`, `bolge_sermaye_insan_oyuncu_mili{ceyrek}`.
- Para defteri kalemleri sabit listeden DEGIL `Object.keys`ten okunur: G6-2b'nin isteğe bagli `lavabo.sebeke` / `kasa.giris.sebeke` (ve `musluk.yerelNpc`) kalemleri geldiginde kendiliginden gauge satiri olur.

## Test (`test/ekonomi-metrik.test.ts`, 11)
Isteğe bagli kalem varken satir cikiyor (yokken yok, bozuk girdi atlaniyor, siralama deterministik); bolge kipinde para/kasa yok; pazar fiyat/taban ve sinirdaki mal; yontem dagilimi (bagimsiz sayimla ayni, degisim); asinma ceyrekleri (bagimsiz hesapla ayni); oyuncu kimligi yok; saf okuma; SermayeSayaci; yazar: gercek hazine farki, basarisiz/sermaye olmayan komut sayilmaz, gunlugun sifirdan oynatilmasi canli ozetle ayni; kurtarma oynatmasi sayiliyor; sunucu `/metrik` metni gecerli.
Sonuc: ekonomi-metrik 11 + metrik 11 test gecti; sunucu paketi tsc ve eslint temiz.
