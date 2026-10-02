# Istemci yontem secici (K2) - takim/k2/yontem-secici

Taban `2103af0` (P10 main). Sorun (A1): istemcide yontem secici yoktu, gida fabrikasi hep `standart_gida_isleme` ile kuruluyordu; degirmen ve firin secilemiyor, ekmek zinciri insana kapaliydi. Yalniz istemci isi (protokol/cekirdek hazirdi).

## Yapilan
1. **Yapi kur kartinda yontem secici** (`yontem-secici.ts`, `yerlesim.ts`): tur yontemleri ICERIKTEN (`tesisTurleri[].yontemler`; elle liste yok). Tek yontemli turde secici HIC cikmaz, komuta yontem yazilmaz. Cok yontemli turde VARSAYILAN SECIM YOK: "Kur" `aria-disabled` + "Bir yontem sec." (Enter de calismaz). Tek istisna: SECILEBILIR (teknolojisi acik) yontem tek ise o secili gelir (cift lik: mekanize kilitli). Kilitli yontem soluk + nedenli. Icerikte etkin her yontem gorunur (ahirin sut/kepek dahil). Komuta `yontem` ancak varsayilandan (ilk yontem) farkli secimde yazilir (varsayilan secimin sonucu zaten ayni).
   Komut yolu: `YerlestirIstegi.yontem` -> `yapi_yerlestir.yontem` (`baglanti-ws.ts`) ve arsasiz `tesis_insa_hucre.yontem` (`zincir.ts`). Yurda kur akisi: cok yontemli turde secim yoksa otomatik kurulmaz, kip acik kalir.
   Erisilebilirlik (T1 L. Ek): `fieldset.ym-secici` > `div.ym-liste[role=radiogroup]` > `button.ym-kart[role=radio]`, roving tabindex, oklar/Home/End/Bosluk/Enter, secili durum renk disinda isaretli, `.ym-not[role=status]`. Klavye olayi haritanin global tuslarina (Enter=kur) kabarmaz.
2. **Mulk panelinde "Yontemi degistir"** (`yontem-panel.ts`, `mulk-panel.ts`): biten tesiste (cok yontemli tur) dugme, satir altinda secici, farkli secimde onay (`.ym-onay[role=alertdialog]`: "{eski} → {yeni}", "Ucret yok; stogun kalir.", Degistir birincil, Vazgec varsayilan odak, Esc), komut `yontem_degistir {bolge, tesis, yontem}` (`WsBaglanti.yontemDegistir`), basari bildirimi, ret `p.dk-hata[role=alert]` Turkce (`yontemHatasiTurkce`; A1 `yontem.ret.*`). Insadaki yapida "Insa bitince yontemi degistirebilirsin." Yeniden cizim odagi dusurmesin: `odagiYakala`.
3. **Sebeke gideri** (`sebeke-gider.ts`): (a) yontem kartinda TAHMINI gider ("Sebeke gideri ≈ X/sa", yontem sebeke mali girdisi x birim fiyat, S olcek, yukari); (b) Hazine sekmesinde TOPLAM bolum (`kare.ozel.sebeke` miktari x fiyat; elektrik/yakit satirlari + toplam; alim yoksa gizli). Tesis basina satir YOK (protokolde tesis kirilimi yok; Tasarim karari).
4. Metinler `yontem-metin.ts` (A1 anahtarlari birebir; A1'de olmayip eklenenler `(ek)`: `yontem.secici.secili`, `yontem.secici.ozet`, `yontem.degistir.ozet`, `yontem.degistir.bedel_yok`, `yontem.degistir.vazgec`, `sebeke.satir_mal`); `yontem.degistir.onay` Tasarim duzeltmesiyle "Yontemi degistirmek istiyor musun?".
5. `isletme()` ekleri (`baglanti-ws.ts`): biten tesiste `yontem` (kare demetindeki yontem indeksi -> dizin) ve `bolge`; `IsletmeDurumu.sebeke`; `acikTeknolojiler()` (oyuncu.teknolojiler -> dizin).

## Sebeke birim fiyati (A1/Ar-Ge sorusu)
Veride ayri alan yok; cekirdek turetir: `carpBol(carpBol(taban, kamuIthalatCarpaniPpm, PPM), tavanOraniPpm, PPM)`, `kamuIthalatCarpaniPpm` = min ithalat carpani, Ticaret ofisi makas indirimiyle PPM'e yaklasir (`mulk/kamuFiyat.ts`). Istemcide derlenmis icerik yok ve cekirdek derleyicisini almak yapi kodunu pakete surukler: formul `sebeke-gider.ts`'te KOPYA; `harita-yontem-secici.test.ts` gercek cekirdek derlemesiyle (`Simulasyon.ic.mulk.sebeke`) ESITLIGI baglar (elektrik ve yakit). Ileride sunucu fiyatlari `hosgeldin`e koyarsa kopya kalkar.

## Karar/uyari
- `ozel.sebeke` dugum duzeyinde: tesis basina dagilim turetilmedi (Tasarim: yalniz toplam).
- Sahte baglantida (acik teknoloji bilgisi yok) teknoloji isteyen yontem temkinli KILITLI sayilir; bu yuzden f4 sahte akisinda ciftlik geleneksel secili gelir (davranis ayni).
- f4-uctan-uca.ts (Playwright; bu dalda KOSMADI, kapi/Operasyon penceresi gerekir): ahir adimi artik yontemi secer (`.ym-kart[data-yontem='ahir_besi']`); ciftlik adimlari degismedi (tek secilebilir yontem secili gelir).
- Istemci boyutu: yeni modullerin kaynak gzip'i 10,7 KB (yorumlu; kucultulmus ~4-5 KB tahmini); `pnpm dunya` OLCULMEDI (kapi kurali: build yok). harita.js'e girer; dunya.html'e girmez (yalniz harita yigininda).

## Dogrulama (tek dosya, tek isci, nice)
- `harita-yontem-secici` 17/17 (icerikten liste, tek yontemde seci yok, varsayilan yok, kilit, miktar yonu, sebeke fiyati ESITLIGI, HTML/aria, klavye, metin ve ret), `harita-yontem-panel` 12/12, **`harita-yontem-ws` 3/3 GERCEK sunucu**: degirmen ve ekmek firini secilip kurulur (komutta yontem), sunucu insaata/tesise yazar, istemci gorur, ekmek uretilir, sebeke gideri gorunur; `yontem_degistir` mulk kipinde istemciden calisir, ucretsiz, retler Turkce; tur varsayilaninda komutta yontem yok; uymayan yontem ve kilitli teknoloji reddi.
- Etkilenebilecek mevcut testler: harita-kare-bag 7/7, mulk-panel 9/9, harita-zincir 7/7, harita-dukkan-zincir 4/4, harita-f4-yapi 17/17, harita-dukkan-kaynak 18/18, harita-olcek 33/33, harita-yurt-ws 1/1, harita-olcek-ws 6/6, harita-f4-ws 6/6.
- istemci tsc (gecici dar tsconfig: `src/harita/*.ts` + yeni testler) temiz.
