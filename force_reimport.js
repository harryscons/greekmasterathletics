// One-time fix: Clear seed version and force re-import with corrected team names
(function () {
    console.log('=== FORCING RE-IMPORT OF RELAY DATA ===');

    // Clear seed version to force re-import
    localStorage.removeItem('tf_relays_seed_version');
    localStorage.removeItem('tf_relays_seeded');

    console.log('✓ Cleared seed version flags');
    console.log('Refreshing page to trigger re-import with corrected team names...');

    // Refresh after a short delay
    setTimeout(() => {
        location.reload();
    }, 500);
})();
