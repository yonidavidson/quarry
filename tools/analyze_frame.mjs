import { readFileSync } from 'fs';
import pngjs from 'pngjs';

const html = readFileSync('index.html', 'utf8');
const m = html.match(/const HUMAN_PNG = "([^"]+)"/);
if (!m) { console.log('HUMAN_PNG not found'); process.exit(1); }

const base64 = m[1].replace('data:image/png;base64,', '');
const buf = Buffer.from(base64, 'base64');
const png = pngjs.PNG.sync.read(buf);
const { width, height, data } = png;
// 65 slices per row in 2 rows
const FW = Math.floor(width / 65), FH = Math.floor(height / 2);
console.log(`Frame dimensions: ${FW}x${FH}`);

console.log(`Image: ${width}x${height}, Frame: ${FW}x${FH}`);

// Analyze frame 0 pixels
let minX = FW, maxX = 0, minY = FH, maxY = 0;
for (let y = 0; y < FH; y++) {
  for (let x = 0; x < FW; x++) {
    const alpha = data[(y * width + x) * 4 + 3];
    if (alpha > 30) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
console.log(`\nBounds: x=${minX}..${maxX} y=${minY}..${maxY}`);
console.log(`Center: ${cx.toFixed(1)}, ${cy.toFixed(1)}`);
console.log(`Dimensions: ${maxX - minX + 1}x${maxY - minY + 1}`);

// Per-row pixel count
console.log('\nPer-row silhouette:');
for (let y = minY; y <= maxY; y++) {
  let count = 0, left = FW, right = 0;
  for (let x = 0; x < FW; x++) {
    if (data[(y * width + x) * 4 + 3] > 30) {
      count++;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (count > 0) {
    let label = '';
    if (y < minY + 28) label = 'HEAD';
    else if (y < minY + 48 && count < 20) label = 'NECK';
    else if (y < minY + 110 && count > 22) label = 'TORSO';
    else if (y < minY + 115 && count < 22) label = 'WAIST';
    else label = 'LEGS';

    // Arms
    let lArm = 0, rArm = 0;
    for (let x = 0; x < minX; x++) if (data[(y*width+x)*4+3] > 30) lArm = x;
    for (let x = maxX+1; x < FW; x++) if (data[(y*width+x)*4+3] > 30) rArm = x;

    // Leg clusters
    let legInfo = '';
    if (label === 'LEGS' && count > 5) {
      const clusters = []; let inC = false, cs = 0;
      for (let x = minX; x <= maxX; x++) {
        const a = data[(y*width+x)*4+3] > 30;
        if (a && !inC) { cs = x; inC = true; }
        else if (!a && inC) { clusters.push((cs + x - 1) / 2); inC = false; }
      }
      if (inC) clusters.push((cs + maxX) / 2);
      if (clusters.length >= 2) legInfo = ` [L:${clusters[0].toFixed(0)} R:${clusters[1].toFixed(0)}]`;
    }

    const armStr = (lArm ? ` Larm:${lArm}` : '') + (rArm ? ` Rarm:${rArm}` : '');
    process.stdout.write(`y=${String(y).padStart(3)} px=${String(count).padStart(2)} x=${left}..${right}  ${label}${armStr}${legInfo}\n`);
  }
}

// Find precise body landmarks
// Head
let headBotVal = minY;
for (let y = minY; y <= maxY && y < minY + 40; y++) {
  let cnt = 0; for (let x = minX; x <= maxX; x++) if (data[(y*width+x)*4+3] > 30) cnt++;
  if (cnt > 0 && cnt < 13) headBotVal = y;
}

// Neck
let neckY = minY + 30;
for (let y = headBotVal + 1; y < minY + 60; y++) {
  let cnt = 0; for (let x = minX; x <= maxX; x++) if (data[(y*width+x)*4+3] > 30) cnt++;
  if (cnt > 0 && cnt <= 20) { neckY = y; break; }
}

// Torso waist
let waistY = minY + 100;
for (let y = neckY + 40; y < minY + 130; y++) {
  let cnt = 0; for (let x = minX; x <= maxX; x++) if (data[(y*width+x)*4+3] > 30) cnt++;
  if (cnt < 20 && cnt > 0) { waistY = y; break; }
}

const torsoY = (neckY + waistY) / 2;

// Arms
let lArm = 0, rArm = 0, aCnt = 0, aCnt2 = 0;
for (let y = neckY + 5; y < waistY - 10; y++) {
  for (let x = 0; x < minX; x++) if (data[(y*width+x)*4+3] > 30) { lArm += x; aCnt++; }
  for (let x = maxX+1; x < FW; x++) if (data[(y*width+x)*4+3] > 30) { rArm += x; aCnt2++; }
}
if (aCnt > 0) lArm /= aCnt;
if (aCnt2 > 0) rArm /= aCnt2;

// Legs
let lLeg = 0, rLeg = 0, lCnt = 0;
for (let y = waistY + 10; y < waistY + 55 && y <= maxY; y++) {
  const clusters = []; let inC = false, cs = 0;
  for (let x = minX; x <= maxX; x++) {
    if (data[(y*width+x)*4+3] > 30 && !inC) { cs = x; inC = true; }
    else if (data[(y*width+x)*4+3] <= 30 && inC) { clusters.push((cs + x - 1) / 2); inC = false; }
  }
  if (inC) clusters.push((cs + maxX) / 2);
  if (clusters.length >= 2) { lLeg += clusters[0]; rLeg += clusters[1]; lCnt++; }
}
if (lCnt > 0) { lLeg /= lCnt; rLeg /= lCnt; }

console.log(`\n========== BODY LANDMARKS ==========`);
console.log(`Frame center: cx=${cx.toFixed(1)}, cy=${cy.toFixed(1)}`);
console.log(`Head top: y=${minY}, bottom: y=${headBotVal}`);
console.log(`Neck: y=${neckY}`);
console.log(`Torso: y=${torsoY.toFixed(1)} (neck ${neckY} -> waist ${waistY})`);
console.log(`Waist: y=${waistY}`);
console.log(`Left arm center: x=${lArm.toFixed(1)}`);
console.log(`Right arm center: x=${rArm.toFixed(1)}`);
console.log(`Left leg center: x=${lLeg.toFixed(1)}`);
console.log(`Right leg center: x=${rLeg.toFixed(1)}`);
console.log(`Feet bottom: y=${maxY}`);

console.log(`\n========== POSITIONS RELATIVE TO CENTER (y-up) ==========`);
const rel = (x, y) => `[${(x - cx).toFixed(1)}, ${-(y - cy).toFixed(1)}]`;
console.log(`head:    ${rel(cx, (minY + headBotVal)/2)}`);
console.log(`neck:    ${rel(cx, neckY)}`);
console.log(`torso:   ${rel(cx, torsoY)}`);
console.log(`hip:     ${rel(cx, waistY + 5)}`);
console.log(`uArmL:   ${rel(lArm, torsoY - 8)}`);
console.log(`fArmL:   ${rel(lArm - 12, torsoY + 9)}`);
console.log(`handL:   ${rel(lArm - 18, torsoY + 25)}`);
console.log(`uArmR:   ${rel(rArm, torsoY - 8)}`);
console.log(`fArmR:   ${rel(rArm + 12, torsoY + 9)}`);
console.log(`handR:   ${rel(rArm + 18, torsoY + 25)}`);
console.log(`uLegL:   ${rel(lLeg, waistY + 17)}`);
console.log(`lLegL:   ${rel(lLeg, waistY + 45)}`);
console.log(`footL:   ${rel(lLeg - 3, maxY)}`);
console.log(`uLegR:   ${rel(rLeg, waistY + 17)}`);
console.log(`lLegR:   ${rel(rLeg, waistY + 45)}`);
console.log(`footR:   ${rel(rLeg + 3, maxY)}`);
