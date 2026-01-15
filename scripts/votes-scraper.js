// ... (keep the rest of the file the same)

async function parseVoteCounts(url, senatorMap) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return { yea: [], nay: [], notVoting: [] };

  const xml = await res.text();
  const parsed = await xml2js(xml, { trim: true, explicitArray: false });
  const members = parsed.vote?.members?.member || [];

  const yea = [];
  const nay = [];
  const notVoting = [];
  const rawLastNames = []; // Debug
  const matchedNames = []; // Debug

  members.forEach((m, index) => {
    let xmlLast = (m.last_name || '').trim().toLowerCase();
    const voteCast = m.vote_cast?.trim();

    if (index < 5) rawLastNames.push(`${xmlLast} (${voteCast})`); // Log first 5 raw

    let matched = false;
    for (const [senName, senInfo] of senatorMap) {
      const senLast = senInfo.lastName.toLowerCase();
      if (xmlLast === senLast || xmlLast.includes(senLast) || senLast.includes(xmlLast)) {
        if (voteCast === 'Yea') yea.push(senName);
        if (voteCast === 'Nay') nay.push(senName);
        if (voteCast === 'Not Voting') notVoting.push(senName);
        matched = true;
        matchedNames.push(`${senName} matched to ${xmlLast}`);
        break;
      }
    }

    if (!matched && voteCast) {
      unmatched.push(`${xmlLast} (${voteCast})`);
    }
  });

  console.log(`Vote ${url.split('/').pop()}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);
  if (rawLastNames.length > 0) {
    console.log(`Raw last_names (first 5): ${rawLastNames.join(', ')}`);
  }
  if (matchedNames.length > 0) {
    console.log(`Matched examples: ${matchedNames.slice(0, 5).join(', ')}`);
  }
  if (unmatched.length > 0) {
    console.log(`Unmatched: ${unmatched.slice(0, 5).join(', ')}...`);
  }

  return { yea, nay, notVoting };
}
