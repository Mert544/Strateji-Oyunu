/**
 * Giriş yığınının yükleyicisi (kabuk; küçük): giriş ekranları (`baslat.ts` ve altındakiler, `giris.css` dahil) kabuk paketinde (dunya.html)
 * DEĞİL, ayrı `giris.js` dosyasındadır; YALNIZ e-posta kipinde yüklenir (`?token=` geliştirme yolu ve sahte bağdaştırıcı hiç yüklemez).
 * Aynı desen `harita.js`/`yuru.js`: tek dosya derlemesinde (mode "tek") HTML'in yanından, geliştirmede ve çok dosyalı derlemede vite'ın tembel
 * parçası. Sabit koşul derlemede katlanır: tek dosyada `import("./baslat")` dalı paketlenmez.
 */
export type GirisModulu = typeof import("./baslat");

export function girisModulu(): Promise<GirisModulu> {
  if (import.meta.env.MODE === "tek") {
    const url = new URL("./giris.js", location.href).href;
    return (import(/* @vite-ignore */ url) as Promise<GirisModulu>).catch(() => {
      throw new Error("Giriş ekranı (giris.js) yüklenemedi; dunya.html'in yanında olmalı ve sayfa HTTP üzerinden açılmalı.");
    });
  }
  return import("./baslat");
}
