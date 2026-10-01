// @ts-check
import tseslint from "typescript-eslint";

// Deterministik simülasyon kuralları: çekirdek içinde duvar saati, rastgelelik
// ve platforma göre farklı sonuç verebilen transandantal fonksiyonlar yasaktır.
const yasakMathOzellikleri = [
  "random", "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "exp", "expm1", "log", "log2", "log10", "log1p", "pow", "cbrt",
  "sinh", "cosh", "tanh", "hypot",
].map((property) => ({
  object: "Math",
  property,
  message: "Çekirdek simülasyonda yasak: deterministik değil. Tamsayı matematiği veya Prng kullanın.",
}));

export default tseslint.config(
  { ignores: ["**/node_modules/**", "raporlar/**", "coverage/**", "istemci/**", "packages/istemci/dist/**", "packages/istemci/dist-tek/**", "**/.onbellek/**"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["packages/cekirdek/src/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "Çekirdekte duvar saati yasak; simülasyon zamanını (dunya.zaman) kullanın." },
        { name: "performance", message: "Çekirdekte duvar saati yasak." },
        { name: "setTimeout", message: "Çekirdekte zamanlayıcı yasak; olay kuyruğunu kullanın." },
        { name: "setInterval", message: "Çekirdekte zamanlayıcı yasak; olay kuyruğunu kullanın." },
      ],
      "no-restricted-properties": ["error", ...yasakMathOzellikleri],
      "no-restricted-syntax": [
        "error",
        { selector: "NewExpression[callee.name='Date']", message: "Çekirdekte Date yasak." },
      ],
    },
  },
  {
    // 3B istemci: tarayıcı/işçi ortamı. Çekirdekteki deterministik yasaklar burada UYGULANMAZ
    // (performance.now, requestAnimationFrame, Math.sin/cos vb. serbest).
    files: ["packages/istemci/**/*.ts"],
    languageOptions: {
      globals: {
        window: "readonly", document: "readonly", navigator: "readonly", location: "readonly", localStorage: "readonly",
        performance: "readonly", requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly", getComputedStyle: "readonly",
        ResizeObserver: "readonly", self: "readonly", Worker: "readonly", HTMLElement: "readonly", HTMLCanvasElement: "readonly",
        URLSearchParams: "readonly", setTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly",
      },
    },
  },
);
