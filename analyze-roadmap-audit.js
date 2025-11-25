const fs = require('fs');

// Read the GitHub issues JSON
const issues = JSON.parse(fs.readFileSync('github-issues.json', 'utf8'));

// Calculate basic stats
const totalIssues = issues.length;
const openIssues = issues.filter(i => i.state === 'OPEN').length;
const closedIssues = issues.filter(i => i.state === 'CLOSED').length;

console.log(`📊 GITHUB STATISTICS\n${'='.repeat(60)}`);
console.log(`Total issues: ${totalIssues}`);
console.log(`Open issues: ${openIssues}`);
console.log(`Closed issues: ${closedIssues}`);
console.log(`\n${'='.repeat(60)}\n`);

// Group by milestone
const milestones = {};
issues.forEach(issue => {
  const milestone = issue.milestone?.title || 'No Milestone';
  if (!milestones[milestone]) {
    milestones[milestone] = { open: 0, closed: 0, issues: [] };
  }
  if (issue.state === 'OPEN') {
    milestones[milestone].open++;
  } else {
    milestones[milestone].closed++;
  }
  milestones[milestone].issues.push(issue.number);
});

console.log('📈 MILESTONES BREAKDOWN\n');
Object.entries(milestones).sort().forEach(([name, data]) => {
  const total = data.open + data.closed;
  const pct = total > 0 ? Math.round((data.closed / total) * 100) : 0;
  console.log(`${name}:`);
  console.log(`  Total: ${total} | Open: ${data.open} | Closed: ${data.closed} | ${pct}%`);
  console.log(`  Issue range: #${Math.min(...data.issues)}-#${Math.max(...data.issues)}`);
  console.log('');
});

// List all issue numbers (sorted)
const allNumbers = issues.map(i => i.number).sort((a, b) => a - b);
console.log('\n📋 ALL ISSUE NUMBERS:\n');
console.log(allNumbers.join(', '));

// Find gaps in issue sequence
console.log('\n\n🔍 ISSUE SEQUENCE GAPS:\n');
const gaps = [];
for (let i = 1; i < allNumbers.length; i++) {
  if (allNumbers[i] - allNumbers[i - 1] > 1) {
    for (let j = allNumbers[i - 1] + 1; j < allNumbers[i]; j++) {
      gaps.push(j);
    }
  }
}
if (gaps.length > 0) {
  console.log(`Missing issue numbers: ${gaps.join(', ')}`);
  console.log(`Total gaps: ${gaps.length}`);
} else {
  console.log('No gaps in sequence');
}

// Export structured data for further analysis
const output = {
  totalIssues,
  openIssues,
  closedIssues,
  milestones,
  allNumbers,
  gaps,
  issuesByNumber: issues.reduce((acc, issue) => {
    acc[issue.number] = {
      title: issue.title,
      state: issue.state,
      milestone: issue.milestone?.title || null,
      closedAt: issue.closedAt,
      labels: issue.labels.map(l => l.name)
    };
    return acc;
  }, {})
};

fs.writeFileSync('roadmap-audit-data.json', JSON.stringify(output, null, 2));
console.log('\n✅ Detailed data exported to roadmap-audit-data.json');
