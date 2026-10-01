/**
 * Dosya sistemine bağlı olmayan veri API'si (tarayıcı ve worker için): tipler, şemalar,
 * doğrulayıcılar, tarım alanı türetme ve parsel fikstürü sözleşmesi. Node yükleyicileri için ana giriş (`@bolge/veri`) kullanılır.
 */
export * from "./tipler";
export * from "./dogrula";
export * from "./parsel";
export { HaritaSema, IcerikSema, ParametreSema } from "./sema";
