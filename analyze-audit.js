const fs = require('fs');
const issues = JSON.parse(fs.readFileSync('github-issues.json'));

const closed = issues.filter(i => i.state === 'CLOSED').length;
const open = issues.filter(i => i.state === 'OPEN').length;

console.log('=== GITHUB ISSUES ===');
console.log(`Total: ${issues.length}`);
console.log(`Closed: ${closed}`);
console.log(`Open: ${open}`);

const numbers = issues.map(i => i.number).sort((a,b) => a-b);
console.log(`\nRange: #${numbers[0]} to #${numbers[numbers.length-1]}`);
console.log(`\nOpen issues by number: ${numbers.filter(n => {
  const issue = issues.find(i => i.number === n);
  return issue && issue.state === 'OPEN';
}).join(', ')}`);

// Check milestones
const byMilestone = {};
issues.forEach(i => {
  const m = i.milestone ? i.milestone.title : 'NONE';
  if (!byMilestone[m]) byMilestone[m] = [];
  byMilestone[m].push({number: i.number, state: i.state});
});

console.log('\n=== BY MILESTONE ===');
Object.keys(byMilestone).sort().forEach(m => {
  const total = byMilestone[m].length;
  const closedCount = byMilestone[m].filter(x => x.state === 'CLOSED').length;
  console.log(`${m}: ${closedCount}/${total}`);
});
