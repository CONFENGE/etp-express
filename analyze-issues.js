const fs = require('fs');

const issues = JSON.parse(fs.readFileSync('open-issues.json', 'utf8'));
console.log('Total de issues abertas:', issues.length);
console.log('\n=== ANÁLISE POR PRIORIDADE ===\n');

// Contar por prioridade
const priorities = { P0: [], P1: [], P2: [], P3: [], P4: [], SEM_PRIORIDADE: [] };

issues.forEach(issue => {
  const labels = issue.labels.map(l => l.name);
  const hasP0 = labels.some(l => l.includes('P0') || l === 'priority/P0');
  const hasP1 = labels.some(l => l.includes('P1') || l === 'priority:P1' || l === 'priority/P1');
  const hasP2 = labels.some(l => l.includes('P2') || l === 'priority:P2' || l === 'priority/P2');
  const hasP3 = labels.some(l => l.includes('P3') || l === 'priority:P3' || l === 'priority/P3');
  const hasP4 = labels.some(l => l.includes('P4') || l === 'priority/P4');

  if (hasP0) priorities.P0.push(issue);
  else if (hasP1) priorities.P1.push(issue);
  else if (hasP2) priorities.P2.push(issue);
  else if (hasP3) priorities.P3.push(issue);
  else if (hasP4) priorities.P4.push(issue);
  else priorities.SEM_PRIORIDADE.push(issue);
});

console.log('P0 (BLOCKER):', priorities.P0.length, 'issues');
priorities.P0.forEach(i => console.log('  -', '#' + i.number, '-', i.title));

console.log('\nP1 (HIGH):', priorities.P1.length, 'issues');
priorities.P1.forEach(i => console.log('  -', '#' + i.number, '-', i.title, '| Milestone:', i.milestone?.title || 'N/A'));

console.log('\nP2 (MEDIUM):', priorities.P2.length, 'issues');
priorities.P2.forEach(i => console.log('  -', '#' + i.number, '-', i.title, '| Milestone:', i.milestone?.title || 'N/A'));

console.log('\nP3 (LOW):', priorities.P3.length, 'issues');

console.log('\nP4 (BACKLOG):', priorities.P4.length, 'issues');
priorities.P4.forEach(i => console.log('  -', '#' + i.number, '-', i.title, '| Milestone:', i.milestone?.title || 'N/A'));

console.log('\nSEM PRIORIDADE:', priorities.SEM_PRIORIDADE.length, 'issues');
priorities.SEM_PRIORIDADE.forEach(i => console.log('  -', '#' + i.number, '-', i.title));
