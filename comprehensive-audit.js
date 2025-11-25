const fs = require('fs');

// Load data
const githubIssues = JSON.parse(fs.readFileSync('github-issues.json', 'utf8'));
const githubMilestones = JSON.parse(fs.readFileSync('github-milestones.json', 'utf8'));
const roadmap = fs.readFileSync('ROADMAP.md', 'utf8');

// Section 1: Issue Count Reconciliation
console.log('📊 ISSUE COUNT AUDIT');
console.log('━'.repeat(60));

const totalGithub = githubIssues.length;
const openGithub = githubIssues.filter(i => i.state === 'OPEN').length;
const closedGithub = githubIssues.filter(i => i.state === 'CLOSED').length;

// Extract ROADMAP stated count
const roadmapTotalMatch = roadmap.match(/Total de Issues:\*\* (\d+) issues \((\d+) abertas \+ (\d+) fechadas\)/);
const roadmapTotal = roadmapTotalMatch ? parseInt(roadmapTotalMatch[1]) : 0;
const roadmapOpen = roadmapTotalMatch ? parseInt(roadmapTotalMatch[2]) : 0;
const roadmapClosed = roadmapTotalMatch ? parseInt(roadmapTotalMatch[3]) : 0;

console.log(\`ROADMAP.md:        \${roadmapTotal} issues (\${roadmapOpen} open + \${roadmapClosed} closed)\`);
console.log(\`GitHub (actual):   \${totalGithub} issues (\${openGithub} open + \${closedGithub} closed)\`);

const drift = totalGithub - roadmapTotal;
const driftPercent = ((Math.abs(drift) / totalGithub) * 100).toFixed(1);
const driftStatus = driftPercent > 5 ? '🟡 WARNING' : driftPercent > 2 ? '⚠️  MINOR' : '✅ GOOD';
console.log(\`Drift:             \${drift >= 0 ? '+' : ''}\${drift} issues (\${driftPercent}%)\`);
console.log(\`Status:            \${driftStatus} (\${driftPercent > 5 ? '>5% drift' : '<5% drift'})\`);
console.log();

// Find all issue numbers in GitHub
const githubNumbers = githubIssues.map(i => i.number).sort((a, b) => a - b);
const minIssue = Math.min(...githubNumbers);
const maxIssue = Math.max(...githubNumbers);

// Find gaps in issue sequence
const missingNumbers = [];
for (let i = minIssue; i <= maxIssue; i++) {
  if (!githubNumbers.includes(i)) {
    missingNumbers.push(i);
  }
}

console.log('BREAKDOWN:');
console.log(\`✅ Issues exist in GitHub:    \${totalGithub} issues (#\${minIssue}-#\${maxIssue})\`);
console.log(\`❌ Missing issue numbers:     \${missingNumbers.length} gaps\`);
if (missingNumbers.length > 0) {
  // Group consecutive numbers
  const ranges = [];
  let start = missingNumbers[0];
  let end = start;

  for (let i = 1; i < missingNumbers.length; i++) {
    if (missingNumbers[i] === end + 1) {
      end = missingNumbers[i];
    } else {
      ranges.push(start === end ? \`#\${start}\` : \`#\${start}-#\${end}\`);
      start = missingNumbers[i];
      end = start;
    }
  }
  ranges.push(start === end ? \`#\${start}\` : \`#\${start}-#\${end}\`);

  console.log(\`   Missing: \${ranges.join(', ')}\`);
}
console.log();

// Extract all issue references from ROADMAP
const issueRefs = [];
const refRegex = /#(\d+)/g;
let match;
while ((match = refRegex.exec(roadmap)) !== null) {
  issueRefs.push(parseInt(match[1]));
}

const uniqueRefs = [...new Set(issueRefs)].sort((a, b) => a - b);
const phantoms = uniqueRefs.filter(num => !githubNumbers.includes(num));
const orphans = githubNumbers.filter(num => !issueRefs.includes(num));

console.log('👻 PHANTOM REFERENCES: ' + phantoms.length);
console.log('🆕 ORPHAN ISSUES: ' + orphans.length);
console.log();

// Save results
const results = {
  github: { total: totalGithub, open: openGithub, closed: closedGithub },
  roadmap: { total: roadmapTotal, open: roadmapOpen, closed: roadmapClosed },
  drift: { count: drift, percent: parseFloat(driftPercent) },
  missingNumbers,
  phantoms,
  orphans
};

fs.writeFileSync('audit-results.json', JSON.stringify(results, null, 2));
console.log('📝 Results saved to audit-results.json');
