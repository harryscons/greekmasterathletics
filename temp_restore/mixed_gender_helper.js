function handleMixedGenderVisibility(eventName) {
    const genderSelect = document.getElementById('gender');
    const optMixed = document.getElementById('optMixed');
    if (!genderSelect || !optMixed) return;

    // Find event definition
    const ev = events.find(e => e.name === eventName);
    const isRelay = ev ? ev.isRelay : false;

    if (isRelay) {
        optMixed.hidden = false;
        optMixed.disabled = false;
    } else {
        optMixed.hidden = true;
        optMixed.disabled = true;
        // Reset if Mixed was selected
        if (genderSelect.value === 'Mixed') {
            genderSelect.value = '';
        }
    }
}
