/** mapshaper paketinin (tipsiz) kullanılan yüzeyi. */
declare module "mapshaper" {
  const mapshaper: {
    applyCommands(komutlar: string, girdi?: Record<string, string | Uint8Array | object>): Promise<Record<string, string | Uint8Array>>;
  };
  export default mapshaper;
}
