/**
 * Display formatting shared between the studio and the landing page.
 *
 * Both surfaces quote the same shot price, so they must round it the same way -
 * a landing page promising "263 NIM" next to a checkout charging "262.8 NIM"
 * reads as a bait and switch even when the underlying quote is identical.
 */

/**
 * A NIM amount, at the precision a human needs.
 *
 * Whole numbers once we are into the hundreds - nobody cares about a hundredth
 * of a NIM when it is worth four ten-thousandths of a cent - and decimals below
 * that, where they are the only thing distinguishing two prices.
 */
export function formatNim(nim: number): string {
  if (nim >= 1000) return `${Math.round(nim).toLocaleString()} NIM`
  if (nim >= 100) return `${Math.round(nim).toLocaleString()} NIM`
  return `${nim.toFixed(nim < 10 ? 2 : 1)} NIM`
}
