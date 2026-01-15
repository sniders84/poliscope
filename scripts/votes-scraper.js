async function parseVoteCounts(parsed, senatorMap, voteId) {
  const members = parsed?.roll_call_vote?.members?.member || [];
  const yea = [];
  const nay = [];
  const notVoting = [];
  const unmatched = [];

  members.forEach(m => {
    const voteCast = m.vote_cast?.trim() || 'Unknown';
    let fullName = (m.member_full || '').trim().toLowerCase();
    const state = (m.state || '').trim().toUpperCase();
    const party = (m.party || '').trim().toUpperCase();

    // Clean fullName: remove party-state part
    fullName = fullName.replace(/\s*\([d,r,i]-\w{2}\)\s*/i, '').trim();

    let matched = false;

    for (const senInfo of senatorMap.values()) {
      const senNameLower = senInfo.name.toLowerCase();
      const senState = senInfo.state?.toUpperCase() || '';
      const senParty = senInfo.party?.toUpperCase() || '';
      const senLast = senNameLower.split(' ').pop(); // last name (handles "blunt rochester" → "rochester")

      // Match if:
      // - last name is in XML fullName
      // - state matches (if present)
      // - party matches (if present)
      if (fullName.includes(senLast) &&
          (!senState || senState === state) &&
          (!senParty || senParty === party)) {
        if (voteCast === 'Yea') yea.push(senInfo.name);
        if (voteCast === 'Nay') nay.push(senInfo.name);
        if (voteCast === 'Not Voting') notVoting.push(senInfo.name);
        matched = true;
        break;
      }
    }

    if (!matched && voteCast !== 'Unknown') {
      unmatched.push(`${m.member_full} (${state}-${party}, ${voteCast})`);
    }
  });

  console.log(`Vote ${voteId}: ${yea.length} Yea, ${nay.length} Nay, ${notVoting.length} Not Voting`);
  if (unmatched.length > 0) {
    console.log(`Unmatched in ${voteId}: ${unmatched.slice(0, 5).join(', ')}...`);
  }

  return { yea, nay, notVoting };
}
