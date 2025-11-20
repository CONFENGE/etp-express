const fs = require('fs');
const githubIssues = require('./github-issues.json');

// Extract issue numbers from ROADMAP.md
const roadmapContent = fs.readFileSync('ROADMAP.md', 'utf-8');
const roadmapIssueMatches = roadmapContent.matchAll(/#(\d+)/g);
const roadmapIssues = new Set();
for (const match of roadmapIssueMatches) {
  roadmapIssues.add(parseInt(match[1]));
}

// Get GitHub issue numbers
const githubIssueNumbers = new Set(githubIssues.map(i => i.number));

// Analysis
const phantomIssues = [...roadmapIssues].filter(n => !githubIssueNumbers.has(n)).sort((a,b) => a-b);
const orphanIssues = githubIssues.filter(i => !roadmapIssues.has(i.number)).sort((a,b) => a.number - b.number);

console.log('═══════════════════════════════════════════════════════');
console.log('🎯 ROADMAP AUDIT - EXECUTIVE SUMMARY');
console.log('═══════════════════════════════════════════════════════\n');
console.log('Audit Date:', new Date().toISOString().split('T')[0]);
console.log('Scope:', githubIssues.length, 'GitHub issues vs ROADMAP.md');

// Issue Count Reconciliation
console.log('\n📊 ISSUE COUNT AUDIT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const roadmapHeader = roadmapContent.match(/Total de Issues:\s*(\d+)\s*issues\s*\((\d+)\s*abertas?\s*\+\s*(\d+)\s*fechadas?\)/i);
const roadmapTotal = roadmapHeader ? parseInt(roadmapHeader[1]) : 'NOT FOUND';
const roadmapOpen = roadmapHeader ? parseInt(roadmapHeader[2]) : 'NOT FOUND';
const roadmapClosed = roadmapHeader ? parseInt(roadmapHeader[3]) : 'NOT FOUND';

const githubTotal = githubIssues.length;
const githubClosed = githubIssues.filter(i => i.state === 'CLOSED').length;
const githubOpen = githubIssues.filter(i => i.state === 'OPEN').length;

console.log('ROADMAP.md:       ', roadmapTotal, 'issues');
console.log('GitHub (actual):  ', githubTotal, 'issues');
if (roadmapTotal !== 'NOT FOUND') {
  const drift = githubTotal - roadmapTotal;
  const driftPct = ((Math.abs(drift) / githubTotal) * 100).toFixed(1);
  console.log('Drift:            ', drift >= 0 ? '+' : '', drift, 'issues (' + driftPct + '%)');
  console.log('Status:           ', driftPct < 5 ? '✅ OK' : driftPct < 10 ? '🟡 WARNING' : '🔴 CRITICAL');
}

console.log('\nBREAKDOWN:');
console.log('  Documented in ROADMAP:', roadmapIssues.size, 'unique issue numbers');
console.log('  Exist in GitHub:      ', githubIssueNumbers.size, 'issues');
console.log('  Phantom (doc only):   ', phantomIssues.length, 'issues');
console.log('  Orphan (GitHub only): ', orphanIssues.length, 'issues');

// Phantom issues
if (phantomIssues.length > 0) {
  console.log('\n👻 PHANTOM REFERENCES AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CRITICAL:', phantomIssues.length, 'phantom issues detected!\n');

  console.log('Phantom issues:', phantomIssues.map(n => '#'+n).join(', '));

  // Check for ranges
  const ranges = [];
  let start = phantomIssues[0];
  let end = start;
  for (let i = 1; i < phantomIssues.length; i++) {
    if (phantomIssues[i] === end + 1) {
      end = phantomIssues[i];
    } else {
      if (end - start >= 2) {
        ranges.push(`#${start}-#${end}`);
      }
      start = phantomIssues[i];
      end = start;
    }
  }
  if (end - start >= 2) {
    ranges.push(`#${start}-#${end}`);
  }

  if (ranges.length > 0) {
    console.log('\nLikely phantom ranges in ROADMAP:', ranges.join(', '));
    console.log('├─ Reality: These issues might be PR numbers or typos');
    console.log('├─ Impact: ROADMAP references non-existent issues');
    console.log('└─ Action: Search ROADMAP for these patterns and verify');
  }
}

// Orphan issues
if (orphanIssues.length > 0) {
  console.log('\n🆕 ORPHAN ISSUES AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FOUND:', orphanIssues.length, 'orphan issues (exist in GitHub, missing in ROADMAP)\n');

  orphanIssues.forEach(i => {
    console.log(`#${i.number} - ${i.title.substring(0, 70)}`);
    console.log(`├─ State: ${i.state.toLowerCase()}`);
    console.log(`├─ Milestone: ${i.milestone?.title || 'None'}`);
    console.log(`└─ Action: ${i.state === 'CLOSED' ? 'Add to ROADMAP and mark as completed' : 'Add to ROADMAP pending section'}\n`);
  });
}

// Milestone validation
console.log('\n📈 MILESTONE PROGRESS AUDIT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const milestones = {
  'M1: Foundation - Testes': { roadmapProgress: '34/34 (100%)', line: 15 },
  'M2: CI/CD Pipeline': { roadmapProgress: '10/10 (100%)', line: 16 },
  'M3: Quality & Security': { roadmapProgress: '9/13 (69%)', line: 17 },
  'M4: Refactoring & Performance': { roadmapProgress: '4/20 (20%)', line: 18 },
  'M5: E2E Testing & Documentation': { roadmapProgress: '1/17 (6%)', line: 19 },
  'M6: Maintenance (Recurring)': { roadmapProgress: '0/2 (0%)', line: 20 }
};

console.log('| Milestone | ROADMAP    | GitHub     | Sync |');
console.log('|-----------|------------|------------|------|');

Object.entries(milestones).forEach(([name, info]) => {
  const issues = githubIssues.filter(i => i.milestone?.title === name);
  const total = issues.length;
  const closed = issues.filter(i => i.state === 'CLOSED').length;
  const pct = total > 0 ? Math.round((closed / total) * 100) : 0;
  const githubProgress = `${closed}/${total} ${pct}%`;
  const sync = info.roadmapProgress.includes(githubProgress.replace(/ /g, '')) ? '✅' : '❌';
  console.log(`| ${name.padEnd(30)} | ${info.roadmapProgress.padEnd(10)} | ${githubProgress.padEnd(10)} | ${sync.padEnd(4)} |`);
});

// State mismatches - check M3 issues mentioned in ROADMAP as closed
console.log('\n🔍 ISSUE STATE AUDIT (Sample)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check specific issues mentioned as completed in ROADMAP
const roadmapClosedPattern = /✅\s*#(\d+)/g;
const roadmapClosedMatches = roadmapContent.matchAll(roadmapClosedPattern);
const roadmapClosedIssues = new Set();
for (const match of roadmapClosedMatches) {
  roadmapClosedIssues.add(parseInt(match[1]));
}

let mismatches = 0;
[...roadmapClosedIssues].sort((a,b) => a-b).forEach(num => {
  const issue = githubIssues.find(i => i.number === num);
  if (issue && issue.state === 'OPEN') {
    console.log(`❌ #${num} - Marked ✅ in ROADMAP, but OPEN in GitHub`);
    console.log(`   └─ Title: ${issue.title.substring(0, 60)}`);
    console.log(`   └─ Milestone: ${issue.milestone?.title || 'None'}`);
    console.log(`   └─ Action: Either close in GitHub OR remove ✅ from ROADMAP\n`);
    mismatches++;
  }
});

if (mismatches === 0) {
  console.log('✅ All issues marked as completed (✅) in ROADMAP are actually CLOSED in GitHub');
}

// Velocity
console.log('\n⏱️  VELOCITY & ETA AUDIT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const now = new Date();
const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
const recentlyClosed = githubIssues.filter(i => {
  if (i.state !== 'CLOSED' || !i.closedAt) return false;
  return new Date(i.closedAt) > sevenDaysAgo;
});

console.log('ACTUAL VELOCITY (Last 7 days):');
console.log('├─ Issues closed:', recentlyClosed.length, 'issues');
console.log('├─ Average:', (recentlyClosed.length / 7).toFixed(1), 'issues/day');
console.log('└─ Trend: Velocity data from last 7 days');

const remainingOpen = githubIssues.filter(i => i.state === 'OPEN').length;
const velocity = recentlyClosed.length / 7;
const daysToComplete = velocity > 0 ? (remainingOpen / velocity).toFixed(1) : 'N/A';
console.log('\nPROJECTED COMPLETION:');
console.log('├─ Remaining issues:', remainingOpen);
console.log('├─ Current velocity:', velocity.toFixed(1), 'issues/day');
console.log('└─ Est. days to complete:', daysToComplete, 'days');

if (daysToComplete !== 'N/A') {
  const completionDate = new Date(now.getTime() + parseFloat(daysToComplete) * 24 * 60 * 60 * 1000);
  console.log('    ETA:', completionDate.toISOString().split('T')[0]);
}

// Summary
console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════════');
