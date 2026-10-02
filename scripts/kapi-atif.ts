/** Kapının sağlayıcı/oturum yapılandırması ve yan etkisiz commit mesajı denetimi. */
export interface AtifYapilandirma {
  saglayici: "claude" | "codex";
  oturumSatiri: string;
  ortakYazarSatiri: string;
}

const TARIHSEL_CLAUDE_OTURUMU = "Claude-Session: https://claude.ai/code/session_01YQaN9Xy6JqWQSadMfNhyVn";
const ORTAK_YAZAR = {
  claude: { satir: "Co-Authored-By: Claude <model> <noreply@anthropic.com>", desen: /^Co-Authored-By: Claude\b.*<noreply@anthropic\.com>$/i },
  codex: { satir: "Co-Authored-By: Codex <codex@openai.com>", desen: /^Co-Authored-By: Codex <codex@openai\.com>$/i },
};

/** Yalnız iki değişken de yoksa tarihsel varsayılan kullanılır; açık yapılandırma eksiksiz olmalıdır. */
export function atifYapilandirmaOku(ortam: Record<string, string | undefined>): AtifYapilandirma {
  let saglayici = ortam["KAPI_ATIF_SAGLAYICI"];
  let oturumSatiri = ortam["KAPI_OTURUM_SATIRI"];
  if (saglayici === undefined && oturumSatiri === undefined) {
    saglayici = "claude";
    oturumSatiri = TARIHSEL_CLAUDE_OTURUMU;
  }
  if (saglayici !== "claude" && saglayici !== "codex") {
    throw new Error("KAPI_ATIF_SAGLAYICI açık yapılandırmada claude ya da codex olmalı (eksik/boş değer kabul edilmez)");
  }
  const etiket = saglayici === "claude" ? "Claude-Session" : "Codex-Session";
  const deger = oturumSatiri?.slice(etiket.length + 2);
  if (oturumSatiri === undefined || !oturumSatiri.startsWith(`${etiket}: `) || /[\r\n]/.test(oturumSatiri) || !deger || deger !== deger.trim()) {
    throw new Error(`KAPI_OTURUM_SATIRI tek satırlık "${etiket}: <gerçek-oturum-kimliği-veya-URL>" olmalı; eksik/boş değer ve başka sağlayıcı kabul edilmez`);
  }
  return { saglayici, oturumSatiri, ortakYazarSatiri: ORTAK_YAZAR[saglayici].satir };
}

/** Oturum satırı tam eşleşir; ortak yazar adı ve adresi seçilen sağlayıcıya ait olmalıdır. */
export function atifMesajEksikleri(mesaj: string, yapilandirma: AtifYapilandirma): string[] {
  const satirlar = mesaj.split(/\r?\n/).map((l) => l.trimEnd());
  const eksik: string[] = [];
  if (!satirlar.includes(yapilandirma.oturumSatiri)) eksik.push(yapilandirma.saglayici === "claude" ? "Claude-Session" : "Codex-Session");
  if (!satirlar.some((l) => ORTAK_YAZAR[yapilandirma.saglayici].desen.test(l))) eksik.push(yapilandirma.ortakYazarSatiri);
  return eksik;
}
