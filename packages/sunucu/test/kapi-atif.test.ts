import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { atifMesajEksikleri, atifYapilandirmaOku } from "../../../scripts/kapi-atif.ts";

const CLAUDE_OTURUMU = "Claude-Session: https://claude.ai/code/session_01YQaN9Xy6JqWQSadMfNhyVn";
// Sentetik test verisi: gerçek üretim oturumu değildir; hiçbir kapı koşusu için kullanılmaz.
const TEST_CODEX_OTURUMU = "Codex-Session: 00000000-0000-4000-8000-000000000001";
const CLAUDE_YAZAR = "Co-Authored-By: Claude Sonnet <noreply@anthropic.com>";
const CODEX_YAZAR = "Co-Authored-By: Codex <codex@openai.com>";
const codex = atifYapilandirmaOku({ KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: TEST_CODEX_OTURUMU });
const claude = atifYapilandirmaOku({});
const mesaj = (oturum: string, yazar: string): string => `Test değişikliği\n\n${oturum}\n${yazar}\n`;

describe("kapı atıf yapılandırması", () => {
  it("iki değişken yoksa tarihsel Claude denetimini korur", () => {
    expect(claude.saglayici).toBe("claude");
    expect(claude.oturumSatiri).toBe(CLAUDE_OTURUMU);
    expect(atifMesajEksikleri(mesaj(CLAUDE_OTURUMU, CLAUDE_YAZAR), claude)).toEqual([]);
  });

  it("açık Codex oturumuyla doğru Codex atfını kabul eder; CRLF commitleri destekler", () => {
    expect(codex.saglayici).toBe("codex");
    expect(codex.oturumSatiri).toBe(TEST_CODEX_OTURUMU);
    expect(atifMesajEksikleri(mesaj(TEST_CODEX_OTURUMU, CODEX_YAZAR).replace(/\n/g, "\r\n"), codex)).toEqual([]);
    expect(atifMesajEksikleri(mesaj(TEST_CODEX_OTURUMU, CODEX_YAZAR.toLowerCase()), codex)).toEqual([]);
  });

  it("eski özel Claude oturumunu açık sağlayıcıyla kabul eder; model adı sabit değildir", () => {
    const oturum = "Claude-Session: test-only-claude-session";
    const yapilandirma = atifYapilandirmaOku({ KAPI_ATIF_SAGLAYICI: "claude", KAPI_OTURUM_SATIRI: oturum });
    expect(atifMesajEksikleri(mesaj(oturum, "co-authored-by: Claude Opus <noreply@anthropic.com>"), yapilandirma)).toEqual([]);
  });

  it.each([
    ["yalnız codex sağlayıcı", { KAPI_ATIF_SAGLAYICI: "codex" }],
    ["yalnız claude sağlayıcı", { KAPI_ATIF_SAGLAYICI: "claude" }],
    ["yalnız Codex oturumu", { KAPI_OTURUM_SATIRI: TEST_CODEX_OTURUMU }],
    ["yalnız eski Claude oturumu", { KAPI_OTURUM_SATIRI: CLAUDE_OTURUMU }],
    ["boş sağlayıcı", { KAPI_ATIF_SAGLAYICI: "", KAPI_OTURUM_SATIRI: TEST_CODEX_OTURUMU }],
    ["whitespace sağlayıcı", { KAPI_ATIF_SAGLAYICI: " \t", KAPI_OTURUM_SATIRI: TEST_CODEX_OTURUMU }],
    ["bilinmeyen sağlayıcı", { KAPI_ATIF_SAGLAYICI: "unknown", KAPI_OTURUM_SATIRI: TEST_CODEX_OTURUMU }],
    ["boş oturum", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: "" }],
    ["whitespace oturum", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: " \t" }],
    ["boş oturum değeri", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: "Codex-Session: " }],
    ["whitespace oturum değeri", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: "Codex-Session: \t " }],
    ["Claude prefix Codex sağlayıcıda", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: CLAUDE_OTURUMU }],
    ["Codex prefix Claude sağlayıcıda", { KAPI_ATIF_SAGLAYICI: "claude", KAPI_OTURUM_SATIRI: TEST_CODEX_OTURUMU }],
    ["etiketsiz oturum", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: "00000000-0000-4000-8000-000000000001" }],
    ["LF injection", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: `${TEST_CODEX_OTURUMU}\n${CODEX_YAZAR}` }],
    ["CRLF injection", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: `${TEST_CODEX_OTURUMU}\r\n${CODEX_YAZAR}` }],
    ["CR injection", { KAPI_ATIF_SAGLAYICI: "codex", KAPI_OTURUM_SATIRI: `${TEST_CODEX_OTURUMU}\r${CODEX_YAZAR}` }],
  ] satisfies [string, Record<string, string | undefined>][])("%s reddedilir", (_ad, ortam) => {
    expect(() => atifYapilandirmaOku(ortam)).toThrow(/KAPI_ATIF_SAGLAYICI|KAPI_OTURUM_SATIRI/);
  });
});

describe("kapı commit atfı", () => {
  it("yanlış veya eksik oturum değerini reddeder", () => {
    expect(atifMesajEksikleri(mesaj(`${TEST_CODEX_OTURUMU}-baska`, CODEX_YAZAR), codex)).toEqual(["Codex-Session"]);
    expect(atifMesajEksikleri(mesaj("", CODEX_YAZAR), codex)).toEqual(["Codex-Session"]);
    expect(atifMesajEksikleri(mesaj(` ${TEST_CODEX_OTURUMU}`, CODEX_YAZAR), codex)).toEqual(["Codex-Session"]);
  });

  it("karşı sağlayıcının ortak yazarını ve yanlış e-posta adresini reddeder", () => {
    expect(atifMesajEksikleri(mesaj(TEST_CODEX_OTURUMU, CLAUDE_YAZAR), codex)).toEqual([CODEX_YAZAR]);
    expect(atifMesajEksikleri(mesaj(CLAUDE_OTURUMU, CODEX_YAZAR), claude)).toEqual([claude.ortakYazarSatiri]);
    expect(atifMesajEksikleri(mesaj(TEST_CODEX_OTURUMU, "Co-Authored-By: Codex <noreply@anthropic.com>"), codex)).toEqual([CODEX_YAZAR]);
    expect(atifMesajEksikleri(mesaj(CLAUDE_OTURUMU, "Co-Authored-By: Claude Sonnet <codex@openai.com>"), claude)).toEqual([claude.ortakYazarSatiri]);
  });

  it("tümü eksikse sağlayıcıya ait iki gerekliliği raporlar", () => {
    expect(atifMesajEksikleri("Test değişikliği", codex)).toEqual(["Codex-Session", CODEX_YAZAR]);
    expect(atifMesajEksikleri("Test değişikliği", claude)).toEqual(["Claude-Session", claude.ortakYazarSatiri]);
  });
});

describe("kapı CLI yapılandırma bağlantısı", () => {
  const betik = fileURLToPath(new URL("../../../scripts/kapi.ts", import.meta.url));
  const tsx = fileURLToPath(new URL("../../../node_modules/tsx/dist/cli.mjs", import.meta.url));
  const [anaSurum = 0, altSurum = 0] = process.versions.node.split(".").map(Number);
  const yerlesikDestek = anaSurum > 22 || (anaSurum === 22 && altSurum >= 18);
  function cli(argumanlar: string[], yerlesik = false): Promise<{ status: number | null; stdout: string; stderr: string }> {
    const ortam: NodeJS.ProcessEnv = { ...process.env, KAPI_ATIF_SAGLAYICI: "codex" };
    delete ortam["KAPI_OTURUM_SATIRI"];
    const calistirici = yerlesik ? ["--experimental-strip-types", "--no-warnings"] : [tsx];
    return new Promise((coz, reddet) => {
      const cocuk = spawn(process.execPath, [...calistirici, betik, ...argumanlar], { env: ortam, stdio: ["ignore", "pipe", "pipe"], timeout: 10_000 });
      let stdout = "";
      let stderr = "";
      cocuk.stdout.setEncoding("utf8").on("data", (veri: string) => { stdout += veri; });
      cocuk.stderr.setEncoding("utf8").on("data", (veri: string) => { stderr += veri; });
      cocuk.once("error", reddet);
      cocuk.once("close", (status) => coz({ status, stdout, stderr }));
    });
  }

  it("eksik Codex oturumunu worktree/ref işlerinden önce kod 2 ile reddeder", async () => {
    const sonuc = await cli(["test-only-dal"]);
    expect(sonuc.status).toBe(2);
    expect(sonuc.stderr).toContain("KAPI_OTURUM_SATIRI");
    expect(sonuc.stderr).not.toContain("worktree'si bulunamadı");
  });

  it("eksik Codex oturumuna rağmen --yardim tsx üzerinden okunur", async () => {
    const sonuc = await cli(["--yardim"]);
    expect(sonuc.status).toBe(0);
    expect(sonuc.stdout).toContain("Kullanım: scripts/kapi.sh");
    expect(sonuc.stderr).toBe("");
  });

  it.skipIf(!yerlesikDestek)("Node 22.18+ yerleşik fallback: config reddi ve yardım çalışır", async () => {
    const eksik = await cli(["test-only-dal"], true);
    expect(eksik.status).toBe(2);
    expect(eksik.stderr).toContain("KAPI_OTURUM_SATIRI");
    expect(eksik.stderr).not.toContain("worktree'si bulunamadı");
    const yardim = await cli(["--yardim"], true);
    expect(yardim.status).toBe(0);
    expect(yardim.stdout).toContain("Kullanım: scripts/kapi.sh");
    expect(yardim.stderr).toBe("");
  });
});
