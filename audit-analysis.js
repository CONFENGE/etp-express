const data = require('./github-issues.json');

// Count totals
const total = data.length;
const closed = data.filter(i => i.state === 'CLOSED').length;
const open = data.filter(i => i.state === 'OPEN').length;

console.log('═══════════════════════════════════════════════════');
console.log('🎯 ROADMAP AUDIT - EXECUTIVE SUMMARY');
console.log('═══════════════════════════════════════════════════');
console.log('');
console.log('Audit Date: 2025-11-21');
console.log(`GitHub Issues: ${total} total (${open} open + ${closed} closed)`);
console.log(`ROADMAP Claims: 154 total (61 open + 93 closed)`);
console.log('');

// Calculate discrepancy
const totalDrift = total - 154;
const closedDrift = closed - 93;
const openDrift = open - 61;

console.log('📊 SECTION 1: ISSUE COUNT RECONCILIATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`ROADMAP.md:        154 issues (61 open + 93 closed)`);
console.log(`GitHub (actual):   ${total} issues (${open} open + ${closed} closed)`);
console.log(`Drift:             ${totalDrift > 0 ? '+' : ''}${totalDrift} issues (${((Math.abs(totalDrift)/154)*100).toFixed(1)}%)`);
console.log(`Status:            ${Math.abs(totalDrift) < 8 ? '✅' : '🟡'} ${Math.abs(totalDrift) < 8 ? 'GOOD' : 'WARNING'} (${Math.abs(totalDrift) < 8 ? '<' : '>'}5% drift)`);
console.log('');
console.log('BREAKDOWN:');
console.log(`  Closed: ROADMAP says 93, GitHub has ${closed} (${closedDrift > 0 ? '+' : ''}${closedDrift})`);
console.log(`  Open: ROADMAP says 61, GitHub has ${open} (${openDrift > 0 ? '+' : ''}${openDrift})`);
console.log('');

// Milestone breakdown
console.log('📈 SECTION 2: MILESTONE PROGRESS VALIDATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const milestones = [
  { name: 'M1: Foundation - Testes', roadmap_total: 36, roadmap_closed: 36, roadmap_pct: 100 },
  { name: 'M2: CI/CD Pipeline', roadmap_total: 12, roadmap_closed: 12, roadmap_pct: 100 },
  { name: 'M3: Quality & Security', roadmap_total: 43, roadmap_closed: 34, roadmap_pct: 79 },
  { name: 'M4: Refactoring & Performance', roadmap_total: 31, roadmap_closed: 8, roadmap_pct: 26 },
  { name: 'M5: E2E Testing & Documentation', roadmap_total: 22, roadmap_closed: 2, roadmap_pct: 9 },
  { name: 'M6: Maintenance (Recurring)', roadmap_total: 10, roadmap_closed: 1, roadmap_pct: 10 }
];

console.log('| Milestone | ROADMAP       | GitHub        | Sync | Status |');
console.log('|-----------|---------------|---------------|------|--------|');

milestones.forEach(m => {
  const githubIssues = data.filter(i => i.milestone && i.milestone.title === m.name);
  const githubTotal = githubIssues.length;
  const githubClosed = githubIssues.filter(i => i.state === 'CLOSED').length;
  const githubPct = githubTotal > 0 ? Math.round((githubClosed / githubTotal) * 100) : 0;

  const roadmapStr = `${m.roadmap_closed}/${m.roadmap_total} ${m.roadmap_pct}%`;
  const githubStr = `${githubClosed}/${githubTotal} ${githubPct}%`;
  const sync = (m.roadmap_total === githubTotal && m.roadmap_closed === githubClosed) ? '✅' :
               (Math.abs(m.roadmap_total - githubTotal) > 2 || Math.abs(m.roadmap_closed - githubClosed) > 2) ? '❌' : '⚠️';

  let status = '';
  if (m.roadmap_total !== githubTotal) status += `Total: ${githubTotal-m.roadmap_total > 0 ? '+' : ''}${githubTotal-m.roadmap_total} `;
  if (m.roadmap_closed !== githubClosed) status += `Closed: ${githubClosed-m.roadmap_closed > 0 ? '+' : ''}${githubClosed-m.roadmap_closed}`;
  if (status === '') status = 'Perfect sync';

  console.log(`| ${m.name.substring(0, 9)} | ${roadmapStr.padEnd(13)} | ${githubStr.padEnd(13)} | ${sync}    | ${status} |`);
});

console.log('');
console.log('CRITICAL FINDINGS:');

// M1 discrepancy
const m1Github = data.filter(i => i.milestone && i.milestone.title === 'M1: Foundation - Testes');
if (m1Github.length !== 36) {
  console.log(`❌ M1: ROADMAP claims 36 issues, GitHub has ${m1Github.length} (${m1Github.length - 36})`);
}

// M3 discrepancy
const m3Github = data.filter(i => i.milestone && i.milestone.title === 'M3: Quality & Security');
const m3Closed = m3Github.filter(i => i.state === 'CLOSED').length;
if (m3Closed !== 34) {
  console.log(`⚠️  M3: ROADMAP claims 34 closed, GitHub has ${m3Closed} closed (${m3Closed - 34})`);
}
if (m3Github.length !== 43) {
  console.log(`⚠️  M3: ROADMAP claims 43 total, GitHub has ${m3Github.length} total (${m3Github.length - 43})`);
}

console.log('');

// Find orphan issues (no milestone)
const orphans = data.filter(i => !i.milestone);
console.log('🆕 SECTION 3: ORPHAN ISSUES (No Milestone)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Found: ${orphans.length} orphan issues`);
console.log('');
orphans.forEach(i => {
  console.log(`#${i.number} - ${i.state} - ${i.title.substring(0, 70)}`);
});

console.log('');
console.log('⏱️  SECTION 4: VELOCITY & ETA');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const closedLast7Days = data.filter(i => {
  if (i.state !== 'CLOSED' || !i.closedAt) return false;
  const closedDate = new Date(i.closedAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return closedDate >= sevenDaysAgo;
});

const velocity = (closedLast7Days.length / 7).toFixed(1);
console.log(`Issues closed (last 7 days): ${closedLast7Days.length}`);
console.log(`Average velocity: ${velocity} issues/day`);
console.log(`Remaining issues: ${open}`);
console.log(`ETA to completion: ~${Math.ceil(open / parseFloat(velocity))} days`);
console.log('');

console.log('═══════════════════════════════════════════════════');
console.log('✅ AUDIT COMPLETE');
console.log('═══════════════════════════════════════════════════');
