// cleanHouse.js — parses and sanitizes House.json, stores globally as window.cleanedHouse

(async () => {
  try {
    const res = await fetch('House.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    let text = await res.text();

    // Sanitize smart quotes and invisible control characters
    text = text
      .replace(/[\u201C\u201D]/g, '"') // smart double quotes
      .replace(/[\u2018\u2019]/g, "'") // smart single quotes
      .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, ''); // invisible control chars

    // Parse and store
    const data = JSON.parse(text);
    console.log('✅ Cleaned and parsed:', data.length, 'entries');
    window.cleanedHouse = data;
  } catch (err) {
    console.error('❌ Error in cleanHouse.js:', err);
  }
})();
