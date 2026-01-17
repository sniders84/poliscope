// scripts/cleanup-legiscan.js
// Remove LegiScan ZIP + extracted folder after scrapers run

const fs = require('fs');
const path = require('path');

const zipPath = path.join(__dirname, 'legiscan.zip');
const extractPath = path.join(__dirname, 'legiscan');

function cleanup() {
  try {
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log('Removed legiscan.zip');
    }
    if (fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
      console.log('Removed legiscan/ folder');
    }
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  }
}

cleanup();
