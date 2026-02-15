// Diagnostic script to check relay data seeding
console.log('=== RELAY DATA DIAGNOSTIC ===');

// Check if SEED_RELAYS is defined
if (typeof SEED_RELAYS !== 'undefined') {
    console.log('✓ SEED_RELAYS is defined');
    console.log('  Total relay records in seed:', SEED_RELAYS.length);
    console.log('  First relay:', SEED_RELAYS[0]);
} else {
    console.log('✗ SEED_RELAYS is NOT defined - seed_data.js may not be loaded');
}

// Check localStorage
const storedRecords = localStorage.getItem('tf_records');
if (storedRecords) {
    const records = JSON.parse(storedRecords);
    console.log('✓ Records in localStorage:', records.length);
    const relayRecords = records.filter(r => r.isRelay);
    console.log('  Relay records:', relayRecords.length);
    if (relayRecords.length > 0) {
        console.log('  First relay record:', relayRecords[0]);
    }
} else {
    console.log('✗ No records in localStorage');
}

// Check seed version
const seedVersion = localStorage.getItem('tf_relays_seed_version');
console.log('Current seed version:', seedVersion || 'not set');
console.log('Expected seed version: 3');

console.log('=== END DIAGNOSTIC ===');
