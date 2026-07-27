#!/usr/bin/env node
// sync-highlights.js
// Run: node sync-highlights.js
// Scans images/highlights/ and updates the highlights array in data/photos.json

const fs   = require('fs');
const path = require('path');

const ROOT          = __dirname;
const HIGHLIGHTS_DIR = path.join(ROOT, 'images', 'highlights');
const JSON_FILE      = path.join(ROOT, 'data', 'photos.json');
const IMAGE_EXTS     = new Set(['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP']);

const files = fs.readdirSync(HIGHLIGHTS_DIR)
  .filter(f => IMAGE_EXTS.has(path.extname(f)))
  .sort();

if (files.length === 0) {
  console.log('No images found in images/highlights/');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

data.highlights = files.map(f => ({
  src:     `images/highlights/${f}`,
  caption: ''
}));

fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));

console.log(`✓ Synced ${files.length} image(s) to photos.json:`);
files.forEach(f => console.log(`  ${f}`));
