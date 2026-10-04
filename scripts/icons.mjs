// Genera los iconos PNG de la app a partir de un SVG (escudo genérico, no oficial).
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const shield = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0b3f91"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <path d="M256 40l176 58v132c0 118-77 192-176 236C157 422 80 348 80 230V98l176-58z" fill="#fff"/>
    <clipPath id="c"><path d="M256 64l152 50v116c0 104-67 168-152 208-85-40-152-104-152-208V114l152-50z"/></clipPath>
    <g clip-path="url(#c)">
      <rect x="80" y="40" width="352" height="420" fill="#0b3f91"/>
      <rect x="168" y="40" width="58" height="420" fill="#fff"/>
      <rect x="286" y="40" width="58" height="420" fill="#fff"/>
    </g>
    <circle cx="256" cy="246" r="64" fill="#f2b705" stroke="#0b3f91" stroke-width="14"/>
    <text x="256" y="268" font-family="Arial, sans-serif" font-weight="900" font-size="64" text-anchor="middle" fill="#0b3f91">F</text>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const out = [
  ["icon-192.png", 192, 24],
  ["icon-512.png", 512, 24],
  ["maskable-512.png", 512, 80],
  ["apple-touch-icon.png", 180, 40],
];
for (const [name, size, pad] of out) {
  await sharp(Buffer.from(shield(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
}
await sharp(Buffer.from(shield(24))).resize(48, 48).png().toFile("src/app/icon.png");
console.log("Iconos generados");
