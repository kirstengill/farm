/**
 * Hand-crafted SVG farm illustrations rendered as data URIs.
 * Used as guaranteed-offline artwork for farm projects — no external CDN needed.
 */

function svgUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const sky = (top: string, bottom: string) => `
 <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
 </defs>
 <rect width="1200" height="800" fill="url(#sky)"/>`

const sun = (x = 900, y = 180, r = 80) => `
 <circle cx="${x}" cy="${y}" r="${r}" fill="#f2d98c" opacity="0.9"/>
 <circle cx="${x}" cy="${y}" r="${r + 30}" fill="#f2d98c" opacity="0.25"/>`

const hills = (colors: string[]) =>
  colors
    .map(
      (c, i) => `
 <path d="M0 ${520 + i * 70} Q 300 ${440 + i * 70} 600 ${520 + i * 70} T 1200 ${500 + i * 70} V 800 H 0 Z" fill="${c}"/>`
    )
    .join('')

const pigSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  ${sky('#fdf3dc', '#f7d9a8')}
  ${sun()}
  ${hills(['#a8c29b', '#7fa872', '#5c8a54'])}
  <!-- barn -->
 <g transform="translate(160,300)">
    <rect x="0" y="90" width="240" height="160" fill="#8a4b3a"/>
    <path d="M-20 90 L120 0 L260 90 Z" fill="#6e3a2c"/>
    <rect x="95" y="150" width="50" height="100" fill="#3c2318"/>
    <rect x="30" y="120" width="40" height="35" fill="#f4e6c0"/>
    <rect x="170" y="120" width="40" height="35" fill="#f4e6c0"/>
 </g>
  <!-- pigs -->
 <g fill="#e8a4a0">
    <ellipse cx="700" cy="640" rx="90" ry="55"/>
    <circle cx="790" cy="615" r="42"/>
    <ellipse cx="806" cy="628" rx="16" ry="12" fill="#d68f8b"/>
    <path d="M768 585 q10 -25 30 -15" stroke="#d68f8b" stroke-width="8" fill="none" stroke-linecap="round"/>
    <rect x="665" y="680" width="14" height="30" rx="6"/>
    <rect x="735" y="680" width="14" height="30" rx="6"/>
    <ellipse cx="960" cy="690" rx="70" ry="42"/>
    <circle cx="1028" cy="672" r="32"/>
    <ellipse cx="1040" cy="682" rx="12" ry="9" fill="#d68f8b"/>
 </g>
  <!-- fence -->
 <g stroke="#6b5236" stroke-width="12" stroke-linecap="round">
    <line x1="60" y1="700" x2="60" y2="760"/><line x1="220" y1="700" x2="220" y2="760"/>
    <line x1="380" y1="700" x2="380" y2="760"/><line x1="540" y1="700" x2="540" y2="760"/>
    <line x1="30" y1="718" x2="570" y2="718"/><line x1="30" y1="748" x2="570" y2="748"/>
 </g>
</svg>`

const goatSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  ${sky('#e8f0f5', '#fdf6e3')}
  ${sun(260, 160, 70)}
  ${hills(['#c3d3b8', '#93b384', '#6d9660'])}
  <!-- mountains -->
 <path d="M600 340 L780 130 L960 340 Z" fill="#8fa3b0" opacity="0.7"/>
 <path d="M720 340 L880 170 L1040 340 Z" fill="#7a8fa0" opacity="0.8"/>
  <!-- goats -->
 <g>
    <g transform="translate(640,560)">
      <ellipse cx="0" cy="40" rx="85" ry="48" fill="#c9b189"/>
      <circle cx="80" cy="8" r="34" fill="#c9b189"/>
      <path d="M96 -18 q18 -22 34 -8" stroke="#a08659" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M-60 20 L-95 -40" stroke="#a08659" stroke-width="10" stroke-linecap="round"/>
      <rect x="-55" y="75" width="13" height="34" rx="6" fill="#a08659"/>
      <rect x="20" y="78" width="13" height="32" rx="6" fill="#a08659"/>
      <path d="M-85 60 q-16 26 4 44" stroke="#a08659" stroke-width="8" fill="none" stroke-linecap="round"/>
    </g>
    <g transform="translate(880,620) scale(0.72)">
      <ellipse cx="0" cy="40" rx="85" ry="48" fill="#b39b74"/>
      <circle cx="80" cy="8" r="34" fill="#b39b74"/>
      <path d="M96 -18 q18 -22 34 -8" stroke="#8f7749" stroke-width="9" fill="none" stroke-linecap="round"/>
      <rect x="-55" y="75" width="13" height="34" rx="6" fill="#8f7749"/>
      <rect x="20" y="78" width="13" height="32" rx="6" fill="#8f7749"/>
    </g>
 </g>
</svg>`

const pastureSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
  ${sky('#fdf0d5', '#f6d7a7')}
  ${sun(620, 200, 95)}
  ${hills(['#b5cd9f', '#82aa70', '#587f4c'])}
 <g transform="translate(880,420)">
    <rect x="0" y="60" width="180" height="120" fill="#7c4636"/>
    <path d="M-15 60 L90 -10 L195 60 Z" fill="#5f3527"/>
 </g>
 <g stroke="#3d5a35" stroke-width="9" stroke-linecap="round" opacity="0.85">
    <path d="M200 720 q8 -60 -12 -95"/><path d="M200 720 q-14 -55 6 -88"/>
    <path d="M330 740 q8 -70 -14 -110"/><path d="M330 740 q-18 -60 8 -100"/>
    <path d="M470 715 q6 -55 -10 -85"/>
 </g>
</svg>`

export const FARM_ART = {
  pig: svgUri(pigSvg),
  goat: svgUri(goatSvg),
  pasture: svgUri(pastureSvg),
}

/** Pick artwork matching a farm name/category, else generic pasture. */
export function farmArtFor(nameOrCategory: string): string {
  const s = nameOrCategory.toLowerCase()
  if (s.includes('pig') || s.includes('swine')) return FARM_ART.pig
  if (s.includes('goat')) return FARM_ART.goat
  return FARM_ART.pasture
}
