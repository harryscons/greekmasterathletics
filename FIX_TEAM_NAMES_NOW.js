// Direct fix for team names in localStorage
// Copy and paste this entire script into your browser console (F12 -> Console)

console.log('=== FIXING TEAM NAMES IN LOCALSTORAGE ===\n');

// Fix records
const recordsStr = localStorage.getItem('tf_records');
if (recordsStr) {
    const records = JSON.parse(recordsStr);
    let fixedCount = 0;

    records.forEach(r => {
        if (r.athlete === 'Ομάδα, Μικτή') {
            r.athlete = 'Μικτή Ομάδα';
            fixedCount++;
        }
    });

    if (fixedCount > 0) {
        localStorage.setItem('tf_records', JSON.stringify(records));
        console.log(`✓ Fixed ${fixedCount} records`);
    } else {
        console.log('✓ No records needed fixing');
    }
}

// Fix history
const historyStr = localStorage.getItem('tf_history');
if (historyStr) {
    const history = JSON.parse(historyStr);
    let fixedCount = 0;

    history.forEach(h => {
        if (h.athlete === 'Ομάδα, Μικτή') {
            h.athlete = 'Μικτή Ομάδα';
            fixedCount++;
        }
    });

    if (fixedCount > 0) {
        localStorage.setItem('tf_history', JSON.stringify(history));
        console.log(`✓ Fixed ${fixedCount} history records`);
    } else {
        console.log('✓ No history records needed fixing');
    }
}

console.log('\n✓ Done! Refreshing page...');
setTimeout(() => location.reload(), 500);
