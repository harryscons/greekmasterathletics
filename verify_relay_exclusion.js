// Verification script for Relay Exclusion in Medal Statistics
console.log('--- Verifying Relay Exclusion ---');

const records = JSON.parse(localStorage.getItem('tf_records') || '[]');
const events = JSON.parse(localStorage.getItem('tf_events') || '[]');

let relayCount = 0;
let individualCount = 0;

records.forEach(r => {
    const ev = events.find(e => e.name === r.event);
    const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));

    if (isRelay) relayCount++;
    else individualCount++;
});

console.log(`Total Records: ${records.length}`);
console.log(`Relay Records detected: ${relayCount}`);
console.log(`Individual Records detected: ${individualCount}`);
console.log('Checking Medal Statistics aggregation logic simulation...');

const agg = {};
records.forEach(r => {
    const ev = events.find(e => e.name === r.event);
    const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));

    if (isRelay) return; // This is what we added

    if (r.athlete) {
        if (!agg[r.athlete]) agg[r.athlete] = { count: 0 };
        agg[r.athlete].count++;
    }
});

const teamNames = Object.keys(agg).filter(name => name.includes('Ομάδα') || name.includes('Team'));
if (teamNames.length === 0) {
    console.log('SUCCESS: No relay teams found in athlete aggregation.');
} else {
    console.warn('WARNING: Relay teams found in athlete aggregation:', teamNames);
}
