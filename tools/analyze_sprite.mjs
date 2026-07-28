#!/usr/bin/env node
// Analyze sprite strip to find body part boundaries in frame 0
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const match = html.match(/const HUMAN_PNG = "([^"]+)"/);
if (!match) { console.log("HUMAN_PNG not found"); process.exit(1); }

const base64 = match[1];
const buf = Buffer.from(base64.replace("data:image/png;base64,",""), "base64");

console.log("Buffer size:", buf.length);

loadImage(buf).then(img => {
  const W = img.width, H = img.height;
  console.log("Image size:", W, "x", H);
  const cv = createCanvas(W, H);
  const ctx = cv.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;

  // Frame 0: 130x233 at (0,0)
  const FW = 130, FH = 233;
  const frame = [];

  // Extract alpha channel to find silhouette
  for (let y = 0; y < FH; y++) {
    const row = [];
    for (let x = 0; x < FW; x++) {
      const i = (y * W + x) * 4;
      row.push(data[i + 3] > 30 ? 1 : 0); // alpha > 30 = solid
    }
    frame.push(row);
  }

  // Find bounding box
  let minX = FW, maxX = 0, minY = FH, maxY = 0;
  for (let y = 0; y < FH; y++)
    for (let x = 0; x < FW; x++)
      if (frame[y][x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

  console.log(`\nFrame 0 bounds: x=${minX}..${maxX}, y=${minY}..${maxY} (${maxX-minX+1}x${maxY-minY+1})`);
  console.log(`Character center: x=${(minX+maxX)/2}, y=${(minY+maxY)/2}`);

  // Horizontal slices: for each Y, count solid pixels
  console.log("\nHorizontal silhouette (solid pixel count per Y):");
  console.log("Y   count  head/body/legs");
  for (let y = minY; y <= maxY; y++) {
    let count = 0;
    let left = FW, right = 0;
    for (let x = minX; x <= maxX; x++) {
      if (frame[y][x]) {
        count++;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    if (count > 0) {
      const label = count < 15 && y < minY + 30 ? "HEAD" :
        y > minY + 30 && y < minY + 50 && count < 20 ? "NECK" :
        y > minY + 50 && y < minY + 110 && count > 25 ? "TORSO" :
        y > minY + 110 && count > 20 ? "LEGS" :
        y > minY + 100 && count > 15 ? "WAIST" : "";
      console.log(`${String(y).padStart(3)}  ${String(count).padStart(3)}   ${label}  (x:${left}..${right})`);
    }
  }

  // Find arm regions (widest part of torso)
  let maxWidth = 0, maxWY = 0;
  for (let y = minY + 40; y < minY + 110 && y <= maxY; y++) {
    let count = 0;
    for (let x = minX; x <= maxX; x++) if (frame[y][x]) count++;
    if (count > maxWidth) { maxWidth = count; maxWY = y; }
  }
  console.log(`\nWidest point: y=${maxWY}, width=${maxWidth}px`);

  // Find neck (narrowest point between head and torso)
  let neckY = minY + 30;
  let minNeckW = 999;
  for (let y = minY + 28; y < minY + 55 && y <= maxY; y++) {
    let left = FW, right = 0, count = 0;
    for (let x = minX; x <= maxX; x++) {
      if (frame[y][x]) { count++; if (x < left) left = x; if (x > right) right = x; }
    }
    if (count > 0 && count < minNeckW && count < 25) {
      minNeckW = count; neckY = y;
    }
  }
  console.log(`Neck: y=${neckY}, width=${minNeckW}px`);

  // Find waist (narrowest between torso and legs)
  let waistY = minY + 100;
  let minWaistW = 999;
  for (let y = minY + 90; y < minY + 120 && y <= maxY; y++) {
    let left = FW, right = 0, count = 0;
    for (let x = minX; x <= maxX; x++) {
      if (frame[y][x]) { count++; if (x < left) left = x; if (x > right) right = x; }
    }
    if (count > 0 && count < minWaistW) {
      minWaistW = count; waistY = y;
    }
  }
  console.log(`Waist: y=${waistY}, width=${minWaistW}px`);

  // Find where legs split (look for two distinct clusters)
  console.log("\nLeg analysis:");
  for (let y = waistY + 10; y <= maxY && y < waistY + 100; y++) {
    let clusters = [], inCluster = false, clusterStart = 0;
    for (let x = minX; x <= maxX; x++) {
      if (frame[y][x] && !inCluster) { clusterStart = x; inCluster = true; }
      else if (!frame[y][x] && inCluster) {
        clusters.push({ start: clusterStart, end: x - 1, center: (clusterStart + x - 1) / 2 });
        inCluster = false;
      }
    }
    if (inCluster) {
      clusters.push({ start: clusterStart, end: maxX, center: (clusterStart + maxX) / 2 });
    }
    if (clusters.length >= 2) {
      const gap = clusters[1].start - clusters[0].end;
      console.log(`  y=${y}: ${clusters.length} clusters, gap=${gap}px  left=${clusters[0].center.toFixed(0)} right=${clusters[1].center.toFixed(0)}`);
    }
  }

  // Find arm positions (side extrusions from torso)
  console.log("\nArm extrusions:");
  for (let y = neckY + 10; y <= waistY - 10 && y <= maxY; y++) {
    let count = 0, leftArm = 0, rightArm = 0;
    for (let x = 0; x < minX; x++) if (frame[y][x] && data[(y * W + x) * 4 + 3] > 30) leftArm = x;
    for (let x = maxX + 1; x < FW; x++) if (frame[y][x] && data[(y * W + x) * 4 + 3] > 30) rightArm = x;
    if (leftArm > 0 || rightArm > 0) {
      console.log(`  y=${y}: leftArm=${leftArm || '-'}  rightArm=${rightArm || '-'}`);
    }
  }

  // Output summary for bone positions
  console.log("\n=== BONE POSITIONS (relative to center) ===");
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Head center (top 30px)
  const headCY = (minY + (minY + 28)) / 2;
  const headCX = cx;
  console.log(`head: [${(headCX - cx).toFixed(1)}, ${-(headCY - cy).toFixed(1)}]  (canvas: ${headCX}, ${headCY})`);

  // Neck
  let neckCX = 0, neckCount = 0;
  for (let x = minX; x <= maxX; x++) if (frame[neckY][x]) { neckCX += x; neckCount++; }
  neckCX /= neckCount;
  console.log(`neck: [${(neckCX - cx).toFixed(1)}, ${-(neckY - cy).toFixed(1)}]`);

  // Torso center
  const torsoCY = (neckY + waistY) / 2;
  let torsoCX = 0, torsoCount = 0;
  for (let y = neckY + 2; y < waistY - 2; y++)
    for (let x = minX; x <= maxX; x++)
      if (frame[y][x]) { torsoCX += x; torsoCount++; }
  torsoCX /= torsoCount;
  console.log(`torso: [${(torsoCX - cx).toFixed(1)}, ${-(torsoCY - cy).toFixed(1)}]`);

  // Hip = waist area center
  const hipCY = waistY + 5;
  console.log(`hip: [0, ${-(hipCY - cy).toFixed(1)}]`);

  // Arms - find average position on left and right sides
  let lArmX = 0, lArmCount = 0, rArmX = 0, rArmCount = 0;
  for (let y = neckY + 5; y < waistY - 5 && y <= maxY; y++) {
    for (let x = 0; x < minX - 2; x++) if (frame[y][x]) { lArmX += x; lArmCount++; }
    for (let x = maxX + 2; x < FW; x++) if (frame[y][x]) { rArmX += x; rArmCount++; }
  }
  if (lArmCount > 0) lArmX /= lArmCount;
  if (rArmCount > 0) rArmX /= rArmCount;
  const armY = (neckY + waistY - 10) / 2;
  console.log(`uArmL: [${(lArmX - cx).toFixed(1)}, ${-(armY - cy).toFixed(1)}]`);
  console.log(`uArmR: [${(rArmX - cx).toFixed(1)}, ${-(armY - cy).toFixed(1)}]`);

  // Legs - find left and right leg cluster centers
  let legSampleY = waistY + 30;
  let lLegX = 0, rLegX = 0;
  for (let y = waistY + 15; y < waistY + 50 && y <= maxY; y++) {
    let clusters = [], inCluster = false, cs = 0;
    for (let x = minX; x <= maxX; x++) {
      if (frame[y][x] && !inCluster) { cs = x; inCluster = true; }
      else if (!frame[y][x] && inCluster) { clusters.push((cs + x - 1) / 2); inCluster = false; }
    }
    if (inCluster) clusters.push((cs + maxX) / 2);
    if (clusters.length >= 2) { lLegX += clusters[0]; rLegX += clusters[1]; }
  }
  const legCount = Math.max(1, waistY + 50 - waistY - 15);
  lLegX /= Math.max(1, (waistY + 50 - waistY - 15));
  rLegX /= Math.max(1, (waistY + 50 - waistY - 15));
  console.log(`uLegL: [${(lLegX - cx).toFixed(1)}, ${-(hipCY + 15 - cy).toFixed(1)}]`);
  console.log(`uLegR: [${(rLegX - cx).toFixed(1)}, ${-(hipCY + 15 - cy).toFixed(1)}]`);

  // Feet
  const footY = maxY;
  let lFootX = 0, lFCount = 0, rFootX = 0, rFCount = 0;
  for (let x = minX; x <= cx; x++) if (frame[footY][x]) { lFootX += x; lFCount++; }
  for (let x = Math.ceil(cx); x <= maxX; x++) if (frame[footY][x]) { rFootX += x; rFCount++; }
  if (lFCount > 0) lFootX /= lFCount;
  if (rFCount > 0) rFootX /= rFCount;
  console.log(`footL: [${(lFootX - cx).toFixed(1)}, ${-(footY - cy).toFixed(1)}]`);
  console.log(`footR: [${(rFootX - cx).toFixed(1)}, ${-(footY - cy).toFixed(1)}]`);

}).catch(e => console.error("Error:", e));
