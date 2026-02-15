// Script to check and fix "Ομάδα, Μικτή" in localStorage
// Run this in the browser console

console.log('=== Checking for "Ομάδα, Μικτή" in localStorage ===');

// Check records
const recordsStr = localStorage.getItem('tf_records');
if (recordsStr) {
    const records = JSON.parse(recordsStr);
    const found = records.filter(r => r.athlete === 'Ομάδα, Μικτή');
    console.log(`Found ${found.length} records with "Ομάδα, Μικτή"`);

    if (found.length > 0) {
        console.log('Renaming to "Μικτή Ομάδα"...');
        records.forEach(r => {
            if (r.athlete === 'Ομάδα, Μικτή') {
                r.athlete = 'Μικτή Ομάδα';
            }
        });
        localStorage.setItem('tf_records', JSON.stringify(records));
        console.log(`✓ Renamed ${found.length} records`);
        console.log('Refresh the page to see changes');
    } else {
        console.log('✓ No records need renaming');
    }
} else {
    console.log('No records in localStorage');
}
