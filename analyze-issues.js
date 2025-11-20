const data = require('./github-issues.json');

console.log('=== ISSUE COUNT ===');
console.log('Total:', data.length);
console.log('Closed:', data.filter(i => i.state === 'CLOSED').length);
console.log('Open:', data.filter(i => i.state === 'OPEN').length);

console.log('\n=== BY MILESTONE ===');
const byMilestone = {};
data.forEach(i => {
  const m = i.milestone?.title || 'No milestone';
  if (!byMilestone[m]) byMilestone[m] = {open: 0, closed: 0, issues: []};
  byMilestone[m][i.state === 'CLOSED' ? 'closed' : 'open']++;
  byMilestone[m].issues.push(i.number);
});

Object.entries(byMilestone).sort().forEach(([m, d]) => {
  const total = d.open + d.closed;
  const pct = Math.round((d.closed / total) * 100);
  console.log(`${m}: ${d.closed}/${total} (${pct}%)`);
  console.log(`  Issues: ${d.issues.sort((a,b) => a-b).slice(0, 30).map(n => '#'+n).join(', ')}${d.issues.length > 30 ? '...' : ''}`);
});

console.log('\n=== ALL ISSUE NUMBERS ===');
const allNumbers = data.map(i => i.number).sort((a,b) => a-b);
console.log(allNumbers.join(', '));

console.log('\n=== RECENTLY CLOSED (last 7 days) ===');
const now = new Date();
const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
const recentlyClosed = data.filter(i => {
  if (i.state !== 'CLOSED' || !i.closedAt) return false;
  return new Date(i.closedAt) > sevenDaysAgo;
}).sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

console.log(`Count: ${recentlyClosed.length} issues`);
recentlyClosed.forEach(i => {
  console.log(`#${i.number} - ${i.title.substring(0, 60)} (${i.closedAt.split('T')[0]})`);
});
