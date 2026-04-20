export const SKU_CONFIG = {
  prefix: 'LP',
  numberDigits: 5,
  sizeMinDigits: 2,
  sizeMaxDigits: 4,
  versionMinDigits: 2,
  versionMaxDigits: 4,
} as const;

// Regex generado desde config
export function buildSkuRegex(): RegExp {
  const { prefix, numberDigits, sizeMinDigits, sizeMaxDigits, versionMinDigits, versionMaxDigits } = SKU_CONFIG;
  return new RegExp(
    `^${prefix}-\\d{${numberDigits}}-\\d{${sizeMinDigits},${sizeMaxDigits}}-\\d{${versionMinDigits},${versionMaxDigits}}$`
  );
}

export function buildSkuPlaceholder(): string {
  return `${SKU_CONFIG.prefix}-00001-25-01`;
}

// ─── Helpers para SKU de variantes ────────────────────────────────────────────

/**
 * Extrae el prefijo base del SKU padre: "LP-00003-01-01" → "LP-00003"
 */
export function getSkuBase(parentSku: string): string {
  const parts = parentSku.split('-');
  return parts.slice(0, 2).join('-');
}

/**
 * Convierte una talla a su código para el SKU.
 *   "25"   → "25"
 *   "25.5" → "255"
 *   "7"    → "07"
 *   ""     → "01"   (genérico / sin talla)
 */
export function sizeToSkuCode(size?: string): string {
  if (!size || !size.trim()) return '01';
  const cleaned = size.replace(/[^0-9.]/g, '');
  if (!cleaned) return '01';
  const code = cleaned.replace('.', '');
  return code.padStart(SKU_CONFIG.sizeMinDigits, '0');
}

/**
 * Construye un SKU de variante a partir del SKU padre, la talla y el número de versión.
 *   buildVariantSku("LP-00003-01-01", "25", 1)  → "LP-00003-25-01"
 *   buildVariantSku("LP-00003-01-01", "25.5", 2) → "LP-00003-255-02"
 *   buildVariantSku("LP-00003-01-01", undefined, 3) → "LP-00003-01-03"
 */
export function buildVariantSku(parentSku: string, size?: string, versionNum?: number): string {
  const base = getSkuBase(parentSku);
  const sizeCode = sizeToSkuCode(size);
  const version = String(versionNum ?? 1).padStart(SKU_CONFIG.versionMinDigits, '0');
  return `${base}-${sizeCode}-${version}`;
}

/**
 * Dado un SKU de variante existente, reemplaza solo la porción de talla
 * manteniendo la versión intacta.
 *   replaceSkuSize("LP-00003-01-02", "25") → "LP-00003-25-02"
 */
export function replaceSkuSize(currentSku: string, parentSku: string, newSize?: string): string {
  const base = getSkuBase(parentSku);
  const parts = currentSku.split('-');
  const currentVersion = parts.length >= 4 ? parts[parts.length - 1] : '01';
  const sizeCode = sizeToSkuCode(newSize);
  return `${base}-${sizeCode}-${currentVersion}`;
}