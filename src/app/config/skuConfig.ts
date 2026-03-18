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