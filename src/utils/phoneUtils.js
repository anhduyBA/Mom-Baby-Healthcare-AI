import { MARKET } from "../config/market.vn.js";

/**
 * Chuẩn hóa SĐT Việt Nam → +84xxxxxxxxx (9–10 chữ số sau mã quốc gia).
 */
export function formatPhoneVN(phone) {
  if (!phone) return phone;

  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith(MARKET.phoneCountryCode)) return `+${digits}`;
    return trimmed;
  }

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith(MARKET.phoneCountryCode)) {
    digits = digits.slice(MARKET.phoneCountryCode.length);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 9 || digits.length === 10) {
    return `+${MARKET.phoneCountryCode}${digits}`;
  }

  return `+${MARKET.phoneCountryCode}${digits}`;
}
