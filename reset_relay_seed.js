// Reset Relay Seed Version Script
// This script clears the relay seed version flag to force re-seeding

console.log('=== RESETTING RELAY SEED VERSION ===');

// Clear the seed version flag
localStorage.removeItem('tf_relays_seed_version');
localStorage.removeItem('tf_relays_seeded');

console.log('✓ Cleared tf_relays_seed_version');
console.log('✓ Cleared tf_relays_seeded');
console.log('');
console.log('Now refreshing the page to trigger re-seeding...');

// Refresh the page after a short delay
setTimeout(() => {
    location.reload();
}, 1000);
