# sunucu-varsayilan (K1, P9): ?sunucu yoksa sayfanın kendi kökenine bağlan

Dal `takim/k1/sunucu-varsayilan`, taban 7568929, tek commit.

## Kural (`giris/kip.ts` `kokenSunucusu`)
`?sunucu=` yokken: https sayfa → `wss://<host>`, http sayfa → `ws://<host>` (port korunur). Yol bugünkü varsayılanla aynı: kök (`/`); sunucu ws'yi belirli bir yola bağlamıyor (`WebSocketServer({ server })`), yol eklenmez.
Kendi köken UYGULANMAZ: `?sunucu=` var (boş değer dahil; geliştirme önceliklidir ve davranışı aynen eskisi gibi), `?yerles=1`, yeni `?sahte=1`, http/https dışı (`file:`), yerel adres (localhost, 127.x, ::1).
Bağlama noktaları: `main.ts` (giriş kipi ve mülk kipi), `harita/denetci.ts` (bağlantı + durum yazısı), `harita/baglanti-kur.ts` → `sunucuSecenekleri(arama, varsayilan)`. Giriş HTTP kökü aynı kökenden türer (`httpTabani`); `?token=` ile geliştirme kipi kendi kökende de çalışır.
Davet bağlantısı: istemcide `?sunucu` ekleyen bir yer yok (posta bağlantısı sunucuda `<genel>/?j=<jeton>`); yapılacak bir şey kalmadı.

## Karar (lider onayı gerek)
Yerel adreste (localhost/127.0.0.1) kendi köken varsayılanı kapalı: bugünkü sahte bağdaştırıcı akışları (bölge/devlet izleme, `?yerles=1`, ölçüm ve ekran betikleri hep `http://127.0.0.1:...` ya da `file://`, `?sunucu` olmadan) bozulmasın diye. Barındırılan her adres (alan adı, IP) kendi kökene bağlanır. Yerelde sunucuya `?sunucu=` ile bağlanılır (zaten öyle). İstenirse yerel istisna kaldırılır; o zaman betiklere `?sahte=1` eklemek gerekir.

## Dağıtım notu (O3)
Caddy aynı kökende hem statik istemciyi hem WebSocket'i sunmalı: ws yükseltme isteği (`Connection: Upgrade`, `Upgrade: websocket`) kök yolda sunucuya (`reverse_proxy`) iletilmeli; `/giris/*` (POST) zaten sunucuya gider. Statik dosyalar yalnız ws olmayan isteklerde Caddy'den. Örnek: `@ws header Connection *Upgrade*` + `reverse_proxy @ws sunucu:PORT`. Sunucu `izinliKokenler` (CSWSH) listesinde sayfanın kökeni (`https://<host>`) olmalı.

## Testler (tek dosya)
`giris-mantik` 54 (kendi köken: https → wss, http → ws, port, yol kök; istisnalar; `sunucuSecenekleri` öncelik ve geçersiz parametre), `harita-f4-yerles` 9; istemci tsc ve eslint temiz. Gerçek tarayıcı koşusu yok (kapı).

## Kapı durumu
Yalnız tek dosya vitest, tsc, eslint; tam vitest/Playwright/dunya koşmadı. giris.js: `kip.ts` +~0,3 KB.
