/**
 * Dosya sistemine bağlı olmayan veri API'si (tarayıcı ve worker için): tipler, şemalar,
 * doğrulayıcılar ve tarım alanı türetme. Node yükleyicileri için ana giriş (`@bolge/veri`) kullanılır.
 */
export * from "./tipler";
export * from "./dogrula";
export { HaritaSema, IcerikSema, ParametreSema } from "./sema";
