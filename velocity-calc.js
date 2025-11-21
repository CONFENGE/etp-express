const data = require('./github-issues.json');

const closedLast7Days = data.filter(i => {
  if (i.state !== 'CLOSED' || !i.closedAt) return false;
  const closedDate = new Date(i.closedAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return closedDate >= sevenDaysAgo;
});

console.log('Issues closed in last 7 days:', closedLast7Days.length);
console.log('Average velocity:', (closedLast7Days.length / 7).toFixed(1), 'issues/day');

// List them
console.log('\nClosed issues (last 7 days):');
closedLast7Days
  .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
  .forEach(i => {
    const date = new Date(i.closedAt).toISOString().split('T')[0];
    console.log(`  #${i.number} - ${date} - ${i.title.substring(0, 60)}`);
  });
