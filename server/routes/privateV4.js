/** RFC1918 / CGNAT / link-local / loopback IPv4 octet checks. */

export function isPrivateV4(a, b) {
  return a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127);
}
