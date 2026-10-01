# G9-a: giriş mantığı (K1)

Dal: `takim/k1/g9a-giris-mantik`. Taban: yurt-once ucu (yığın: tmp/taban-p5 = entegrasyon 2819a43 + T1-G1 + T2-G1 + kare-ayrilmis 63d89ac, üstüne G2 → ayrilmis-fiyat → yurt-once); G5 giriş uçları ve `giris.ts` 2819a43'te. P4 push edilince `git rebase --onto <yeni entegrasyon> 63d89ac` ile taşınır (K2 kare-ayrilmis commit'i düşer).
Kapsam: yalnız mantık ve test (görünüm yok; ekranlar G9-b). Kapı durumu: koşuyordu (ilk bölüm), sonra boş; Playwright ve pnpm dunya koşulmadı (lider kararı: yalnız kapı koşar).

## Dosyalar

| Dosya | İş |
|---|---|
| `packages/istemci/src/giris/api.ts` | `GirisApi` (istek, onayla, bilet, ben, cikis, cikisTumu): `credentials: "include"`, protokol şemasıyla doğrulanmış yanıt, hata kodu/beklemeSn (`Retry-After` yedeği); fırlatmaz. İstemci tarafı kodlar: `ag_hatasi`, `zaman_asimi`, `yanit`. `httpTabani(wsUrl)`, `GirisHatasi`. |
| `src/giris/kip.ts` | `girisKipi(arama, varsayilanSunucu?)`: `sahte` / `gelistirme` (`?token=`, giriş ekranı yok) / `eposta`; `baglantiJetonu` (`?j=`), `jetonsuzAdres` (`history.replaceState` için). |
| `src/giris/eposta.ts` | Kaba denetim (istek gitmeden), `<...>`/`mailto:` temizliği, sayaç anahtarı. Büyük/küçük harf korunur. |
| `src/giris/hata.ts` | Kod → `giris.G6.<kod>` anahtarı (`yontem`, `bulunamadi`, `yanit` → `giris.G6.ic_hata`), ekran eylemi (T1 G-6 tablosu), `hizSiniriDakika` (yukarı yuvarlı). |
| `src/giris/oturum.ts` | `BiletSaglayici`: `bilet` ok işlevi `WsBaglanti.token` olur; her bağlanışta taze bilet, önceden alınan bilet bir kez harcanır, ömür 60 sn − 10 sn marj, bilet `hiz_siniri` (429) SESSİZ yeniden denenir, 401 `oturumYokDinle` dinleyicilerini çağırır. |
| `src/giris/akis.ts` | `GirisAkisi`: ekran durumu makinesi (yukleniyor, g1, g2, g3, g4, g7, oyun), 60 sn yeniden gönder geri sayımı, adres başına gönderim sayacı (yalnız bellek; 3. gönderimden sonra `tekrarSiniri`), hız sınırı geri sayımı, onay/yeni hesap/oyun, oturum bitişi (G-7), çıkış. Zamanlayıcı yok: arayüz `kalanSn(bitis)` ile çizer. |
| `src/harita/baglanti-ws.ts` | `WsSecenekleri.token: string \| (() => Promise<string>)`. İşlev her (yeniden) bağlanmadan hemen önce çağrılır; `oturum_yok` fırlatırsa `reddedildi` (yeniden denenmez); başka hata geri çekilmeyle yeniden denenir; ws kapanış 4003'te önce BİR KEZ sessiz yeni biletle yeniden bağlanır, ikincisinde `reddedildi`. Sabit dizgi (geliştirme kimliği) aynen çalışır. |
| `test/giris-mantik.test.ts` | 42 test: kip/adres, e-posta, hata sunumu, `GirisApi` (sahte fetch), `BiletSaglayici`, `GirisAkisi`. |
| `test/giris-ws.test.ts` | 12 test, GERÇEK sunucu: `GirisUclari`+`GirisHizmeti`+dosya postacısı (`--kimlik eposta` ile aynı bileşenler), enjekte saat, çerez kavanozlu fetch. |

## Gerçek sunucu testlerinin gösterdikleri

- Tam zincir: g1 → g2 → dosya postası → `?j=` → g3 → onay → yeni hesap g4 → oyun; `WsBaglanti` bilet işleviyle bağlanır, `ben.id` = onaydaki opak oyuncu.
- Dönen oyuncu: aynı çerezle açılışta doğrudan oyun; bilet önden alınır ve ws bunu harcar (ikinci bilet yok). Çerezsiz tarayıcı g1.
- Bilet: marj içindeki önbellek bileti atılıp yeni alınır; süresi dolmuş eski bilet sunucuda "Oturum doğrulanamadı" (karşı deneme).
- ws kopunca yeni bilet alınır, oyun sürer.
- "Tüm cihazlardan çık" (başka cihaz): ws 4003 → bir sessiz yeniden deneme → bilet 401 → `reddedildi` ve akış g7 (`giris.G6.oturum_yok`).
- Kullanılmış/bozuk bağlantı: `baglanti_gecersiz`, g3'te kalır, `yeni-baglanti-iste`.
- Sunucu e-posta başına 3/saat sınırı SESSİZDİR (4. istek de 202, posta gitmez): ekran farkı göremez; istemci sayacı 3. gönderimden sonra `tekrarSiniri` açar.
- Geliştirme kimliği (`token("ali")`) değişmedi; `harita-f4-ws` ve `harita-f4-yetisme` geçer.
- Ağ yok: `ag_hatasi`, g1'de yeniden deneme.

## Kararlar ve notlar

- Açılış kararı kip tablosundan verilir, sunucuya sormaz (`GET /giris/ben` yalnız e-posta kipinde). Geliştirme sunucusunda `/giris/*` yoktur (404).
- Giriş bağlantısı `<genel>/?j=<jeton>` (lider notu; T1 sözleşmesindeki `?giris=` yerine). G9-b açılışta `baglantiJetonu(location.search)` okuyup `history.replaceState(null, "", jetonsuzAdres(location.href))` ile ADRESTEN HEMEN siler, sonra `akis.basla(jeton)`.
- Token `localStorage`'a yazılmaz; çerez httpOnly. Jeton yalnız bellekte ve onaydan sonra silinir; `GirisDurumu` jetonu taşımaz.
- Sayaç adres başına, yalnız bellekte, son bir saat (sunucu sınırı saatliktir); adres kaydedilmez.
- G-4 görünen ad: `g4` ekranına geçilir ve `adTamamlandi()` oyuna götürür; `GET /giris/ad-oner`, `POST /giris/ad`, `ad_*` kodları G9-c'de (K2 gorunen-ad dalı). `/giris/ben` ve onay yanıtlarındaki isteğe bağlı `ad`/`adSecildi` G9-c'de okunacak.
- Metinler yok: yalnız anahtar (`giris.G6.<kod>`, `giris.G2.tekrar_siniri`/`destek` bayrağı `tekrarSiniri`). Metin tablosu ve DOM G9-b'de; `{destek_eposta}` ve KVKK adresi metin tablosundaki tek yerde duracak, kodda sabit yok.
- "yeniden bağlanıyoruz" metni (G-5; yalnız uzarsa): `WsBaglanti.durum === "kopuk"` süresini G9-b izler; mantıkta ayrı sayaç eklenmedi.
- istemci paketi `zod`a doğrudan bağlı değildir: `api.ts` protokol şemalarını yapısal `safeParse` arayüzüyle kullanır.

## Doğrulama

`tsc --noEmit` (istemci) temiz; eslint (giris, testler, baglanti-ws) temiz; vitest tek dosya, 1 işçi: giris-mantik 42, giris-ws 12, harita-f4-ws 6, harita-f4-yetisme 4, tasarim geçti. `pnpm dunya` koşulmadı: `src/giris/*` henüz hiçbir yerden içe aktarılmıyor, dunya.html boyutu DEĞİŞMEZ; G9-b içe aktarınca ölçülecek (api+akis+oturum+kip+eposta+hata yaklaşık birkaç KB ham).
