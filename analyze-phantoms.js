const fs = require('fs');

const auditResults = JSON.parse(fs.readFileSync('roadmap-audit-results.json', 'utf8'));
const roadmapContent = fs.readFileSync('ROADMAP.md', 'utf8');

console.log('═══════════════════════════════════════════════════════');
console.log('👻 PHANTOM REFERENCE DEEP ANALYSIS');
console.log('═══════════════════════════════════════════════════════\n');

const phantoms = auditResults.phantoms.map(p => p.number);
console.log(`Total phantom references: ${phantoms.length}\n`);

// Categorize phantoms by context in ROADMAP
const phantomContexts = {};

phantoms.forEach(num => {
  const regex = new RegExp(`(PR)?\\s*#${num}([^\\d]|$)`, 'gi');
  const matches = [];
  let match;

  // Find all occurrences with surrounding context
  const lines = roadmapContent.split('\n');
  lines.forEach((line, idx) => {
    if (regex.test(line)) {
      matches.push({
        lineNumber: idx + 1,
        line: line.trim(),
        isPR: /PR\s*#\d+/i.test(line) || /\*\*PR\s*#\d+/i.test(line)
      });
    }
  });

  phantomContexts[num] = matches;
});

// Separate PR references from issue references
const prReferences = [];
const issueReferences = [];

Object.entries(phantomContexts).forEach(([num, contexts]) => {
  const isPR = contexts.some(c => c.isPR);
  if (isPR) {
    prReferences.push({ number: parseInt(num), contexts });
  } else {
    issueReferences.push({ number: parseInt(num), contexts });
  }
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋 CATEGORIZATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`✅ PR References (OK to keep): ${prReferences.length}`);
console.log(`❌ Issue References (PHANTOMS): ${issueReferences.length}\n`);

if (prReferences.length > 0) {
  console.log('PR References (these are valid, PRs not issues):');
  prReferences.slice(0, 20).forEach(({ number, contexts }) => {
    console.log(`   PR #${number}: ${contexts[0].line.substring(0, 100)}...`);
  });
  if (prReferences.length > 20) {
    console.log(`   ... and ${prReferences.length - 20} more PR references`);
  }
  console.log('');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔴 TRUE PHANTOM ISSUES (Need to remove)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (issueReferences.length > 0) {
  issueReferences.forEach(({ number, contexts }) => {
    console.log(`Issue #${number}:`);
    contexts.forEach(ctx => {
      console.log(`   Line ${ctx.lineNumber}: ${ctx.line}`);
    });
    console.log('');
  });
} else {
  console.log('✅ No true phantom issues! All references are valid PRs.\n');
}

// Check for issue ranges that might be wrong
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 ISSUE RANGE VALIDATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const rangeRegex = /#(\d+)-#(\d+)/g;
let rangeMatch;
const problematicRanges = [];

while ((rangeMatch = rangeRegex.exec(roadmapContent)) !== null) {
  const start = parseInt(rangeMatch[1]);
  const end = parseInt(rangeMatch[2]);
  const range = `#${start}-#${end}`;

  // Check how many issues in this range actually exist
  let existingInRange = 0;
  let phantomInRange = [];

  for (let i = start; i <= end; i++) {
    if (phantoms.includes(i)) {
      phantomInRange.push(i);
    } else {
      existingInRange++;
    }
  }

  if (phantomInRange.length > 0) {
    // Find the line with this range
    const lines = roadmapContent.split('\n');
    let lineNumber = 0;
    let lineContent = '';
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(range)) {
        lineNumber = i + 1;
        lineContent = lines[i].trim();
        break;
      }
    }

    problematicRanges.push({
      range,
      start,
      end,
      total: end - start + 1,
      existing: existingInRange,
      phantom: phantomInRange.length,
      phantomNumbers: phantomInRange,
      lineNumber,
      lineContent
    });
  }
}

if (problematicRanges.length > 0) {
  console.log('⚠️  Ranges with phantom issues:\n');
  problematicRanges.forEach(r => {
    const percentPhantom = ((r.phantom / r.total) * 100).toFixed(0);
    console.log(`${r.range} (${percentPhantom}% phantom)`);
    console.log(`   Line ${r.lineNumber}: ${r.lineContent}`);
    console.log(`   Total in range: ${r.total} | Existing: ${r.existing} | Phantom: ${r.phantom}`);
    if (r.phantom <= 10) {
      console.log(`   Phantom numbers: ${r.phantomNumbers.join(', ')}`);
    }
    console.log('');
  });
} else {
  console.log('✅ All ranges are valid!\n');
}

// Export detailed analysis
const analysis = {
  totalPhantoms: phantoms.length,
  prReferences: prReferences.map(p => p.number),
  issueReferences: issueReferences.map(p => ({
    number: p.number,
    occurrences: p.contexts.length,
    lines: p.contexts.map(c => c.lineNumber)
  })),
  problematicRanges
};

fs.writeFileSync('phantom-analysis.json', JSON.stringify(analysis, null, 2));
console.log('\n═══════════════════════════════════════════════════════');
console.log('📄 Detailed analysis exported to: phantom-analysis.json');
console.log('═══════════════════════════════════════════════════════');
