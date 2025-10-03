# Poliscope Implementation Summary

## What Was Implemented

### 1. State Selection Synchronization
- Created a centralized state selection dropdown that syncs across all tabs
- When a user selects a state, it persists across My Officials, Calendar, and Registration tabs
- The selected state filters officials and displays relevant local information

### 2. My Officials Tab
- Displays all elected officials for the selected state including:
  - Governor
  - Lieutenant Governor
  - US Senators (2)
  - US House Representatives (all districts for that state)
- Shows official photos, party affiliation, office, and links to profiles
- Shows approval ratings where available

### 3. Calendar Tab
- Displays state-specific election dates in card format
- Each card shows:
  - Election title (Primary, General, etc.)
  - Date
  - Direct link to state election authority website
- Covers all 50 states with 2026 election data

### 4. Registration Tab
- Displays four key voting resources as cards:
  - Voter Registration link
  - Check Voter Status link
  - Absentee Voting information link
  - Polling Location finder link
- All links point directly to official state election websites
- Covers all 50 states

### 5. Rankings System
- Implemented dynamic ranking calculation based on:
  1. Primary: Approval rating (highest ranks first)
  2. Tiebreaker 1: Disapproval rating (lowest ranks first)
  3. Tiebreaker 2: Don't Know/No Opinion (lowest ranks first)
- Rankings calculated separately for:
  - Governors
  - Lieutenant Governors
  - Senators
  - House Representatives
- Each ranked official shows their rank number and approval percentage

## Technical Architecture

### Files Created/Modified
1. **script.js** - Complete rewrite with:
   - State management system
   - Tab navigation
   - Data caching
   - Ranking algorithm
   - Card rendering functions

2. **stateResources.js** - New file containing:
   - `stateElectionCalendar` - Election dates for all 50 states
   - `stateVotingInfo` - Voter registration and information resources for all 50 states

3. **index.html** - Updated with:
   - Simplified tab structure
   - State selector prominently placed
   - Clean section organization
   - Proper script loading order

4. **package.json & vite.config.js** - Added for development server support

### Data Sources
- Governors.json - Contains approval ratings with Morning Consult source URLs
- LtGovernors.json - Lieutenant Governor data
- Senate.json - US Senate data
- House.json - US House Representatives data

### Ranking Algorithm
```javascript
// Sort by approval (descending)
// Then by disapproval (ascending)
// Then by don't know (ascending)
```

This ensures ties are broken fairly and consistently.

## User Experience Flow

1. User lands on "My Officials" tab
2. User selects their state from dropdown
3. My Officials tab populates with their state's officials
4. User can switch to Calendar tab to see upcoming elections
5. User can switch to Registration tab to access voting resources
6. User can switch to Rankings tab to see national official rankings
7. State selection persists across My Officials, Calendar, and Registration tabs

## Future Enhancements
- Add polling tab with historical data
- Add bill tracking for officials
- Add contact forms for reaching officials
- Add email/SMS alerts for election dates
- Add comparison tools between officials
