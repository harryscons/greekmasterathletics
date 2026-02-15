// Debug script to check athlete dropdown values
// Run this in browser console after editing a record

console.log('=== Debugging Athlete Dropdown ===');

// Get the record being edited
const editingId = window.editingId; // Assuming this is a global variable
if (!editingId) {
    console.log('No record being edited');
} else {
    const records = JSON.parse(localStorage.getItem('tf_records') || '[]');
    const record = records.find(r => r.id === editingId);

    if (record) {
        console.log('Record athlete value:', record.athlete);

        // Check dropdown options
        const athleteDropdown = document.getElementById('athlete');
        if (athleteDropdown) {
            console.log('Dropdown current value:', athleteDropdown.value);
            console.log('Available options:');
            Array.from(athleteDropdown.options).forEach((opt, i) => {
                console.log(`  [${i}] value="${opt.value}" text="${opt.textContent}"`);
                if (opt.value === record.athlete) {
                    console.log('    ^^^ MATCH FOUND ^^^');
                }
            });
        }
    }
}
