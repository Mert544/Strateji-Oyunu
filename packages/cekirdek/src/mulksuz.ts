/**
 * Derleme zamanı anahtarı (vite `define`; yalnız `vite build`, istemci paketlemesi): `__BOLGE_MULKSUZ__ === true` iken mülk kipi (parsel dünyası, dükkân, yerel pazar) pakete GİRMEZ: bölge kipli tarayıcı
 * simülasyonu parsel dünyası açmaz (`derle.ts mulkDerle` fırlatır). Test, sunucu, ölçüm ve geliştirme sunucusunda sabit tanımsızdır (mülk kipi tam çalışır); davranış ve altınlar değişmez.
 * Kullanım kalıbı: `MULKSUZ_PAKET ? null : mulkYolu(...)` ve `!MULKSUZ_PAKET && ...`: sabit `true` iken derleyici çağrıyı ve yalnız oradan erişilen modülü atar.
 */
declare const __BOLGE_MULKSUZ__: boolean | undefined;
export const MULKSUZ_PAKET: boolean = typeof __BOLGE_MULKSUZ__ !== "undefined" && __BOLGE_MULKSUZ__ === true;
