/** Test işçisi: gerçek işçiyi `GECIKME_MS` kadar geç yükler (mesajlar kuyrukta bekler); işçi meşgulken görüntü atlama testleri için. */
await new Promise<void>((coz) => setTimeout(coz, Number(process.env.BOLGE_TEST_ISCI_GECIKME_MS ?? 700)));
await import("../src/goruntu-isci");
export {};
