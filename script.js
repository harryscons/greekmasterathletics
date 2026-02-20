document.addEventListener('DOMContentLoaded', () => {
    // --- Global Error Handler ---
    window.onerror = function (msg, url, lineNo, columnNo, error) {
        console.error("🚫 Global Runtime Error:", { msg, url, lineNo, columnNo, error });
        return false;
    };

    console.log("🚀 DOMContentLoaded: Starting initialization...");
    // --- Sorting State ---
    let athleteSortField = 'lastName';
    let athleteSortOrder = 'asc';
    let wmaSortField = 'age';
    let wmaSortOrder = 'asc';
    let db = null;

    // --- State & Initial Loading ---
    let records = [];
    let events = [];
    let athletes = [];
    let countries = [];
    let history = [];
    let appUsers = [];
    let pendingrecs = []; // NEW: Staging area for Admin submissions
    const recentlyRejected = new Set(JSON.parse(localStorage.getItem('tf_tombstones') || '[]'));

    function saveTombstones() {
        localStorage.setItem('tf_tombstones', JSON.stringify(Array.from(recentlyRejected)));
    }

    // --- Data Protection ---
    let isDataReady = false; // Flag to prevent saving over cloud until sync is verified
    const loadedNodes = new Set();
    const CORE_NODES = ['records', 'athletes', 'events', 'countries', 'history', 'users'];
    let isSuppressingAutoFill = false; // Prevents change events from overwriting edit form data

    function checkReady() {
        if (isDataReady) return;
        // Verify we have received snapshots for all critical data nodes
        if (loadedNodes.size >= CORE_NODES.length) {
            console.log("✅ Data Consensus Reached. System is now READY.");
            isDataReady = true;
            // Now safe to run migrations and seeding
            if (typeof runPostLoadMaintenance === 'function') {
                runPostLoadMaintenance();
            } else {
                renderAll();
            }
        }
    }

    // Fast Pass: Load immediate cache from LocalStorage for permission checks & initial state
    try {
        records = JSON.parse(localStorage.getItem('tf_records')) || [];
        events = JSON.parse(localStorage.getItem('tf_events')) || [];
        athletes = JSON.parse(localStorage.getItem('tf_athletes')) || [];
        countries = JSON.parse(localStorage.getItem('tf_countries')) || [];
        history = JSON.parse(localStorage.getItem('tf_history')) || [];
        appUsers = JSON.parse(localStorage.getItem('tf_users')) || [];
        pendingrecs = JSON.parse(localStorage.getItem('tf_pendingrecs')) || []; // NEW: Load staging area
        console.log("⚡ Fast Pass: Core state initialized from LocalStorage");
    } catch (e) {
        console.error("❌ Fast Pass failed:", e);
    }

    // --- Performance Indexes ---
    let iaafLookupMap = {}; // Event -> Gender -> [sorted records]
    let wmaLookupMap = {};  // Event -> Gender -> Age -> factor
    let athleteLookupMap = {}; // Name -> object

    // --- Elements ---
    const recordForm = document.getElementById('recordForm');
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Inputs
    const evtInput = document.getElementById('event');
    const genderInput = document.getElementById('gender');
    const ageGroupInput = document.getElementById('ageGroup');
    const trackTypeInput = document.getElementById('trackType');
    const athleteInput = document.getElementById('athlete'); // Select
    const markInput = document.getElementById('mark');
    const windInput = document.getElementById('wind');
    const dateInput = document.getElementById('date');
    let datePicker; // Flatpickr instance
    const locInput = document.getElementById('location');
    const relayTeamNameInput = document.getElementById('relayTeamName');
    const relayParticipantsSection = document.getElementById('relayParticipantsSection');
    const relayAthlete1 = document.getElementById('relayAthlete1');
    const relayAthlete2 = document.getElementById('relayAthlete2');
    const relayAthlete3 = document.getElementById('relayAthlete3');
    const relayAthlete4 = document.getElementById('relayAthlete4');


    // Reports
    const reportTableBody = document.getElementById('reportTableBody');
    const filterEvent = document.getElementById('filterEvent');
    const filterGender = document.getElementById('filterGender');
    const filterAge = document.getElementById('filterAge');
    const filterYear = document.getElementById('filterYear');
    const filterAthlete = document.getElementById('filterAthlete');
    const filterAthleteName = document.getElementById('filterAthleteName');
    const filterAgeMismatch = document.getElementById('filterAgeMismatch');
    const filterTrackType = document.getElementById('filterTrackType');
    const statsTableBody = document.getElementById('statsTableBody');

    // Actions
    const clearAllBtn = document.getElementById('clearAll');
    const btnBackup = document.getElementById('btnBackup');
    const btnRestore = document.getElementById('btnRestore');
    const fileRestore = document.getElementById('fileRestore');

    // Navigation
    const navTabs = document.querySelectorAll('.nav-tab');
    const viewSections = document.querySelectorAll('.view-section');

    console.log("🔍 Elements Found:", {
        recordForm: !!recordForm,
        reportTableBody: !!reportTableBody,
        navTabs: navTabs.length,
        viewSections: viewSections.length
    });

    // Event Manager
    const eventForm = document.getElementById('eventForm');
    const newEventName = document.getElementById('newEventName');
    const newEventIAAF = document.getElementById('newEventIAAF');
    const newEventWMA = document.getElementById('newEventWMA');
    const newEventSpecs = document.getElementById('newEventSpecs');
    const newEventNotes = document.getElementById('newEventNotes');
    const eventTypeField = document.getElementById('eventTypeField');
    const eventTypeTrack = document.getElementById('eventTypeTrack');
    const eventTypeCombined = document.getElementById('eventTypeCombined');
    const eventTypeRelay = document.getElementById('eventTypeRelay');
    const newEventSubCount = document.getElementById('newEventSubCount');
    const subEventsContainer = document.getElementById('subEventsContainer');
    const eventListBody = document.getElementById('eventListBody');
    const newEventFormula = document.getElementById('newEventFormula');
    const eventSubmitBtn = eventForm.querySelector('button[type="submit"]');

    // Athlete Manager
    const athleteForm = document.getElementById('athleteForm');
    const newAthleteID = document.getElementById('newAthleteID');
    const newAthleteFirstName = document.getElementById('newAthleteFirstName');
    const newAthleteLastName = document.getElementById('newAthleteLastName');
    const newAthleteDOB = document.getElementById('newAthleteDOB');
    let dobPicker; // Flatpickr instance
    const newAthleteGender = document.getElementById('newAthleteGender');
    const athleteListBody = document.getElementById('athleteListBody');
    const athleteSubmitBtn = athleteForm.querySelector('button[type="submit"]');
    const btnImportAthletes = document.getElementById('btnImportAthletes');
    const athleteImportFile = document.getElementById('athleteImportFile');

    // WMA Manager
    const wmaAddForm = document.getElementById('wmaAddForm');
    const newWMAAge = document.getElementById('newWMAAge');
    const newWMAFactor = document.getElementById('newWMAFactor');
    const wmaTableBody = document.getElementById('wmaTableBody');
    const wmaFilterGender = document.getElementById('wmaFilterGender');
    const wmaFilterAgeGroup = document.getElementById('wmaFilterAgeGroup');
    const wmaFilterEvent = document.getElementById('wmaFilterEvent');
    const btnLoadOfficialWMA = document.getElementById('btnLoadOfficialWMA');

    // Record Import
    const btnSelectExcel = document.getElementById('btnSelectExcel');
    const btnImportRecords = document.getElementById('btnImportRecords');
    const recordImportFile = document.getElementById('recordImportFile');
    const recordImportFileName = document.getElementById('recordImportFileName');

    const clearRecordsBtn = document.getElementById('clearRecords');
    const clearAthletesBtn = document.getElementById('clearAthletes');

    // Country Manager
    const countryForm = document.getElementById('countryForm');
    const newCountryName = document.getElementById('newCountryName');
    const countryListBody = document.getElementById('countryListBody');
    const countryInput = document.getElementById('country');
    const townInput = document.getElementById('town');
    const raceNameInput = document.getElementById('raceName');
    const idrInput = document.getElementById('idr');
    const notesInput = document.getElementById('notes');

    // User Manager
    const userForm = document.getElementById('userForm');
    const editingUserIdInput = document.getElementById('editingUserId');
    const newUserName = document.getElementById('newUserName');
    const newUserRole = document.getElementById('newUserRole');
    const newUserEmail = document.getElementById('newUserEmail');
    const userListBody = document.getElementById('userListBody');
    const userSubmitBtn = document.getElementById('userSubmitBtn');

    // --- UI/UX Helpers ---
    const themeSelect = document.getElementById('themeSelect');
    const hideNotesSymbol = document.getElementById('hideNotesSymbol');

    // --- Cloud Status Management ---
    const cloudIcon = document.getElementById('cloudIcon');
    const cloudText = document.getElementById('cloudText');

    function isLocalEnvironment() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        return hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.') ||
            protocol === 'file:';
    }

    function updateCloudStatus(status) {
        if (!cloudIcon || !cloudText) return;

        const local = isLocalEnvironment();

        switch (status) {
            case 'connected':
                cloudIcon.style.color = '#10b981'; // Green
                cloudText.textContent = 'Cloud Online';
                cloudIcon.textContent = '●';
                break;
            case 'connecting':
                cloudIcon.style.color = '#f59e0b'; // Amber
                cloudText.textContent = 'Connecting...';
                cloudIcon.textContent = '●';
                break;
            case 'permission_denied':
                cloudIcon.style.color = '#ef4444'; // Red
                cloudText.textContent = 'Permission Denied';
                cloudIcon.title = "Firebase rules are blocking access.";
                cloudIcon.textContent = '●';
                break;
            case 'disconnected':
            default:
                if (local) {
                    cloudIcon.style.color = '#3b82f6'; // Blue
                    cloudText.textContent = 'Local Mode (Supervisor)';
                    cloudIcon.textContent = '🏠';
                } else {
                    cloudIcon.style.color = '#ef4444'; // Red
                    cloudText.textContent = 'Cloud Offline';
                    cloudIcon.textContent = '●';
                }
                break;
        }
    }

    function rebuildPerformanceIndexes() {
        console.log("⚡ Rebuilding performance indexes for O(1) matching...");

        // 1. IAAF Index
        iaafLookupMap = {};
        if (typeof iaafData !== 'undefined' && Array.isArray(iaafData)) {
            iaafData.forEach(d => {
                const g = normalizeGenderLookups(d.gender);
                if (!iaafLookupMap[d.event]) iaafLookupMap[d.event] = {};
                if (!iaafLookupMap[d.event][g]) iaafLookupMap[d.event][g] = [];
                iaafLookupMap[d.event][g].push(d);
            });
            // Sort each IAAF group by mark for faster finding
            for (let ev in iaafLookupMap) {
                for (let g in iaafLookupMap[ev]) {
                    iaafLookupMap[ev][g].sort((a, b) => a.mark - b.mark);
                }
            }
        }

        // 2. WMA Index
        wmaLookupMap = {};
        if (typeof wmaData !== 'undefined' && Array.isArray(wmaData)) {
            wmaData.forEach(d => {
                const g = normalizeGenderLookups(d.gender);
                const age = parseInt(d.age);
                if (!wmaLookupMap[d.event]) wmaLookupMap[d.event] = {};
                if (!wmaLookupMap[d.event][g]) wmaLookupMap[d.event][g] = {};
                wmaLookupMap[d.event][g][age] = d.factor;
            });
        }

        // 3. Athlete Index
        athleteLookupMap = {};
        if (typeof athletes !== 'undefined' && Array.isArray(athletes)) {
            athletes.forEach(a => {
                athleteLookupMap[`${a.lastName}, ${a.firstName}`] = a;
            });
        }

        // 4. Statistics Cache Audit: Ensure stats calculations only use approved data
        // (This is redundant if getters are filtered, but good for O(1) suggested marks)
    }

    // --- State for Sorting ---
    let currentSort = { column: 'date', direction: 'desc' };



    // --- State for Sorting ---
    function loadInitialData(db) {
        console.log("Fetching data from Firebase...");

        const valToArray = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;

            // Convert object to array but PRESERVE existing IDs if present
            return Object.keys(val).map(key => {
                const item = val[key];
                if (typeof item === 'object' && item !== null) {
                    // If the object already has an id, keep it. Otherwise, use the firebase key if it looks like a UUID, or generate one.
                    if (!item.id) {
                        item.id = key.length > 10 ? key : String(Date.now() + '-' + Math.floor(Math.random() * 10000));
                    }
                    return item;
                }
                return item;
            });
        };

        // Listen for Records
        db.ref('records').on('value', (snapshot) => {
            try {
                const serverRecords = valToArray(snapshot.val());
                const localRecords = JSON.parse(localStorage.getItem('tf_records')) || [];

                // ARCHIVE PROTECTION: Identify records that should no longer be live
                // (Records that have been replaced and moved to history)
                const archivedIds = new Set(history.map(h => h.originalId).filter(id => id));

                // SMART MERGE: Combine server and local, prioritizing "advanced" local states
                const uniqueMap = new Map();

                // 1. Start with Server Records (Base Truth)
                serverRecords.forEach(r => {
                    const rIdStr = String(r.id);
                    // Use rIdStr for BOTH sets to ensure type match
                    if (!archivedIds.has(rIdStr) && !recentlyRejected.has(rIdStr)) {
                        uniqueMap.set(rIdStr, r);
                    }
                });

                // 2. Blend in Local Records (Update state if local is "ahead")
                localRecords.forEach(l => {
                    const lIdStr = String(l.id);
                    if (archivedIds.has(lIdStr) || recentlyRejected.has(lIdStr)) return;

                    const existing = uniqueMap.get(lIdStr);
                    if (!existing) {
                        // "Local Only" record (likely a proposal from this device)
                        // STABILITY FIX: Only rescue if it's very recent (e.g., < 2 hours old) or specifically unapproved.
                        const ageInMs = Date.now() - (Number(l.id) || 0);
                        const isRecent = ageInMs < (2 * 60 * 60 * 1000);

                        if (l.approved === false && isRecent) {
                            console.log(`🛡️ Smart Merge: Rescuing recent proposal ${lIdStr}`);
                            uniqueMap.set(lIdStr, l);
                        }
                    } else if (l.approved === true && existing.approved === false) {
                        console.log(`🛡️ Smart Merge: Favoring local approval for record ${lIdStr}`);
                        uniqueMap.set(lIdStr, l);
                    }
                });

                const finalRecords = Array.from(uniqueMap.values());

                // Empty Server Protection (fallback if server is blank but local isn't)
                if (finalRecords.length === 0 && localRecords.length > 0 && serverRecords.length === 0) {
                    console.warn("⚠️ Empty snapshot received. Preserving local state.");
                    records = localRecords.filter(l => !archivedIds.has(l.id));
                } else {
                    records = finalRecords;
                }

                // If we rescued local-only records or approvals, trigger a sync to settle the cloud
                const hasLocalOnly = records.some(r => !serverRecords.some(s => s.id === r.id));
                const hasLocalApproval = records.some(r => r.approved === true && serverRecords.some(s => s.id === r.id && s.approved === false));

                if (hasLocalOnly || hasLocalApproval) {
                    console.log("🔄 Triggering resync to settle cloud with local state...");
                    setTimeout(() => saveRecords(), 2000);
                }

                console.log("Records updated (Smart Merge):", records.length);
                loadedNodes.add('records');
                checkReady();
                renderAll();
            } catch (e) {
                console.error("🔥 Error in Validating/Loading Records:", e);
                alert("Data Sync Error: " + e.message);
            }
        });

        // Listen for Athletes
        db.ref('athletes').on('value', (snapshot) => {
            athletes = valToArray(snapshot.val());
            console.log("Athletes updated from Firebase. Count:", athletes.length);

            // Sync Trace: Verify if DOB is being received correctly
            if (athletes.length > 0) {
                const sample = athletes.find(a => a.dob) || athletes[0];
                console.log(`Sync Trace: Sample athlete ${sample.lastName} has DOB: ${sample.dob || 'MISSING'}`);
            }

            loadedNodes.add('athletes');
            checkReady();

            rebuildPerformanceIndexes(); // Rebuild name map for age calc
            populateAthleteDropdown();
            populateAthleteFilter();
            renderAthleteList();
        });

        // Listen for Events
        db.ref('events').on('value', (snapshot) => {
            events = valToArray(snapshot.val());
            console.log("Events updated from Firebase:", events.length);
            loadedNodes.add('events');
            checkReady();

            if (events.length > 0) repairEventMetadata(); // Auto-repair on load
            populateEventDropdowns();
            renderEventList();
        });

        // Listen for Countries
        db.ref('countries').on('value', (snapshot) => {
            countries = valToArray(snapshot.val());
            console.log("Countries updated from Firebase:", countries.length);
            loadedNodes.add('countries');
            checkReady();

            populateCountryDropdown();
            renderCountryList();
        });

        // Listen for History
        db.ref('history').on('value', (snapshot) => {
            history = valToArray(snapshot.val());
            console.log("History updated from Firebase:", history.length);
            loadedNodes.add('history');
            checkReady();

            renderHistoryList();
        });

        // Listen for Pending Records
        db.ref('pendingrecs').on('value', (snapshot) => {
            pendingrecs = valToArray(snapshot.val());
            console.log("Pending Records updated from Firebase:", pendingrecs.length);
            loadedNodes.add('pendingrecs');
            checkReady();
            renderReports(); // Re-render main report to show pending changes
        });

        // Listen for Users
        db.ref('users').on('value', (snapshot) => {
            const val = snapshot.val();
            if (val) {
                appUsers = Array.isArray(val) ? val : Object.values(val);
            } else {
                appUsers = [];
            }
            console.log("Users updated from Firebase. Count:", appUsers.length);
            loadedNodes.add('users');
            checkReady();
            renderUserList();
        });
    }

    function renderAll() {
        populateAgeSelects();
        populateEventDropdowns();
        populateAthleteDropdown();
        populateCountryDropdown();
        populateYearDropdown();
        populateAthleteFilter();

        renderEventList();
        renderAthleteList();
        renderCountryList();
        renderHistoryList();
        renderReports();
        renderUserList();

        // Also populate sub-feature dropdowns
        if (typeof populateIAAFEventDropdown === 'function') populateIAAFEventDropdown();
        if (typeof populateWMAEventDropdown === 'function') populateWMAEventDropdown();
    }

    // Migration Helper: Push local data to Firebase if Firebase is empty
    async function migrateLocalToCloud(db) {
        const nodes = ['records', 'athletes', 'events', 'countries', 'history', 'users'];
        let cloudIsEmpty = true;

        // 1. Check if cloud has any records at all
        try {
            const sn = await db.ref('records').once('value');
            if (sn.exists()) cloudIsEmpty = false;
        } catch (e) {
            console.error("Cloud check failed", e);
            if (e.code === 'PERMISSION_DENIED') {
                updateCloudStatus('permission_denied');
            }
        }

        if (!cloudIsEmpty) return; // Cloud has data, no migration needed

        console.log("Cloud database empty. Attempting migration/seeding...");

        let migrationSourceFound = false;

        // 2. Try to migrate from LocalStorage first
        for (const node of nodes) {
            try {
                const localData = JSON.parse(localStorage.getItem(`tf_${node === 'history' ? 'history' : node}`)) || [];
                if (localData.length > 0) {
                    console.log(`Pushing ${localData.length} ${node} from localStorage to cloud...`);
                    await db.ref(node).set(localData);
                    migrationSourceFound = true;
                }
            } catch (e) {
                console.error(`Error migrating ${node}:`, e);
            }
        }

        // 3. IF still empty, try to seed from track_data.json (Emergency Fallback)
        if (!migrationSourceFound) {
            console.log("LocalStorage empty. Attempting a seed from track_data.json...");
            try {
                const response = await fetch('track_data.json');
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.records && data.records.length > 0) {
                        console.log("Seeding Cloud from track_data.json...");
                        if (data.records) await db.ref('records').set(data.records);
                        if (data.athletes) await db.ref('athletes').set(data.athletes);
                        if (data.events) await db.ref('events').set(data.events);
                        if (data.countries) await db.ref('countries').set(data.countries);
                        if (data.history) await db.ref('history').set(data.history);
                        console.log("Cloud seeded successfully from file.");
                    }
                }
            } catch (e) {
                console.log("Auto-seed fetch failed or file not found (normal if first run).");
            }
        }
    }

    // Logic to repair missing metadata (IAAF, WMA, Formula)
    async function repairEventMetadata() {
        try {
            const response = await fetch('track_data.json');
            if (!response.ok) return;
            const data = await response.json();
            const refEvents = data.events || [];

            let updatedCount = 0;

            events.forEach(ev => {
                const ref = refEvents.find(e => e.name === ev.name);
                if (ref) {
                    let changed = false;
                    if (!ev.iaafEvent && ref.iaafEvent) { ev.iaafEvent = ref.iaafEvent; changed = true; }
                    if (!ev.wmaEvent && ref.wmaEvent) { ev.wmaEvent = ref.wmaEvent; changed = true; }
                    if (!ev.formula && ref.formula) { ev.formula = ref.formula; changed = true; }

                    if (changed) updatedCount++;
                }
            });

            if (updatedCount > 0) {
                console.log(`Repaired metadata for ${updatedCount} events locally. Saving...`);
                saveEvents(); // Save to local
                if (db && firebase.auth().currentUser) {
                    db.ref('events').set(events); // Sync to cloud if possible
                }
                populateEventDropdowns();
                renderEventList();
            }
        } catch (e) {
            console.error("Error repairing event metadata:", e);
        }
    }

    // --- Core Logic Helpers (Global to DOMContentLoaded Scope) ---
    function normalizeName(s) {
        if (!s) return "";
        // NFD normalization decomposes accented characters, then we strip the diacritics.
        return s.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9\u0370-\u03FF]/g, "")
            .toLowerCase();
    }

    function findAthleteByNormalizedName(rawName) {
        if (!rawName) return null;
        const searchKey = normalizeName(rawName);
        console.log(`Searching for athlete key: "${searchKey}"`);

        const matches = athletes.filter(a => {
            const k1 = normalizeName(`${a.lastName}, ${a.firstName}`);
            const k2 = normalizeName(`${a.firstName} ${a.lastName}`);
            return k1 === searchKey || k2 === searchKey;
        });

        if (matches.length > 0) {
            // Prioritize the one with a Date of Birth
            const sorted = matches.sort((a, b) => {
                const hasA = (a.dob && String(a.dob).trim() !== "") ? 1 : 0;
                const hasB = (b.dob && String(b.dob).trim() !== "") ? 1 : 0;
                return hasB - hasA;
            });
            console.log(`Found ${matches.length} matches. picking: ${sorted[0].lastName}, ${sorted[0].firstName} (Has DoB: ${!!sorted[0].dob})`);
            return sorted[0];
        }
        return null;
    }

    function getExactAge(dobStr, eventDateStr) {
        const dob = new Date(dobStr);
        const evt = new Date(eventDateStr);
        if (isNaN(dob) || isNaN(evt)) return null;
        let age = evt.getFullYear() - dob.getFullYear();
        const m = evt.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && evt.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }

    function calculateAgeGroup(dobStr, eventDateStr) {
        if (!dobStr || !eventDateStr) return null;
        const age = getExactAge(dobStr, eventDateStr);
        if (age === null) return null;

        if (age < 35) return null;
        if (age >= 100) return '100+';
        return (Math.floor(age / 5) * 5).toString();
    }

    // Define globally on window for Flatpickr access
    window.updateCalculatedAgeGroup = function () {
        if (isSuppressingAutoFill) return;
        if (!athleteInput || !dateInput) return;
        const rawName = athleteInput.value || "";
        const selectedDate = (dateInput.value || "").trim();

        console.log(`Auto-selection triggered for: "${rawName}", Date: "${selectedDate}"`);

        if (!rawName) {
            if (ageGroupInput) ageGroupInput.value = '';
            return;
        }

        const athlete = findAthleteByNormalizedName(rawName);

        if (athlete) {
            console.log(`Applying auto-fill for athlete: ${athlete.lastName}, ${athlete.firstName}`);
            if (genderInput && athlete.gender) {
                genderInput.value = athlete.gender;
                // Force triggering gender change if needed (e.g. for relay participant filtering)
                genderInput.dispatchEvent(new Event('change'));
            }

            let calculatedGroup = '';
            if (athlete.dob && selectedDate) {
                calculatedGroup = calculateAgeGroup(athlete.dob, selectedDate) || '';
            }

            if (ageGroupInput) {
                ageGroupInput.value = calculatedGroup;
                console.log(`Applied Age Group: "${calculatedGroup}"`);
            }
        } else {
            console.warn(`Could not match athlete for name: "${rawName}"`);
        }
    };
    const updateCalculatedAgeGroup = window.updateCalculatedAgeGroup;

    // --- Post-Loading Tasks: Seeding & Migration ---
    let recordsUpdated = false;
    const SEED_VERSION = 6; // Increment this to force one-time refresh of relay data
    const lastSeedVersion = parseInt(localStorage.getItem('tf_relays_seed_version') || '0');

    // 1. Programmatic Relay Seeding
    if (typeof SEED_RELAYS !== 'undefined' && Array.isArray(SEED_RELAYS)) {
        if (lastSeedVersion < SEED_VERSION) {
            console.log(`Seeding version ${SEED_VERSION}...`);
            SEED_RELAYS.forEach(sr => {
                // Ensure SEED_RELAYS have trackType
                if (!sr.trackType) sr.trackType = 'Outdoor';

                const existingIndex = records.findIndex(r => String(r.id) === String(sr.id));
                if (existingIndex === -1) {
                    records.push(sr);
                    recordsUpdated = true;
                } else {
                    // Update existing relay records if needed (e.g. they exist but are incomplete)
                    const existing = records[existingIndex];
                    if (existing.isRelay) {
                        // Check if we gained participants
                        const srp = sr.relayParticipants || [];
                        const exp = existing.relayParticipants || [];
                        if (srp.length > exp.length) {
                            records[existingIndex] = { ...existing, ...sr };
                            recordsUpdated = true;
                        }
                    }
                }
            });

            // Extract all relay participants and add them to athletes if missing
            let athletesAdded = 0;
            SEED_RELAYS.forEach(sr => {
                const participants = sr.relayParticipants || [];
                participants.forEach(participantName => {
                    if (!participantName || participantName.trim() === '') return;

                    // Check if athlete already exists
                    const exists = athletes.some(a =>
                        `${a.lastName}, ${a.firstName}` === participantName.trim()
                    );

                    if (!exists) {
                        // Parse "Last Name, First Name" format
                        const parts = participantName.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            // For Mixed relays, don't assign a gender so they appear in all dropdowns
                            // For single-gender relays, use that gender
                            const assignedGender = (sr.gender === 'Mixed' || sr.gender === 'mixed') ? '' : (sr.gender || '');

                            const newAthlete = {
                                id: Date.now() + Math.random(),
                                lastName: parts[0],
                                firstName: parts[1],
                                gender: assignedGender,
                                dob: '',
                                idNumber: '',
                                notes: 'Auto-added from relay import'
                            };
                            athletes.push(newAthlete);
                            athletesAdded++;
                        }
                    }
                });
            });

            if (athletesAdded > 0) {
                localStorage.setItem('tf_athletes', JSON.stringify(athletes));
                console.log(`Added ${athletesAdded} relay participants to athletes database`);
            }

            localStorage.setItem('tf_relays_seed_version', String(SEED_VERSION));
            // Also set the old flag to true just in case any old logic uses it
            localStorage.setItem('tf_relays_seeded', 'true');
            // Force save even if recordsUpdated is false (to ensure version update is reflected)
            if (recordsUpdated) {
                console.log(`Added/updated ${SEED_RELAYS.filter((sr, i) => {
                    const existingIndex = records.findIndex(r => String(r.id) === String(sr.id));
                    return existingIndex !== -1;
                }).length} relay records.`);
            }
        } else {
            // Only add if ABSOLUTELY new (not in records and we haven't seeded version 2+)
            // However, to respect deletions, if SEED_VERSION has already run (lastSeedVersion >= SEED_VERSION),
            // we should NOT re-add missing IDs because they might have been deleted by the user.
        }
    } else {
        console.warn('SEED_RELAYS is not defined - seed_data.js may not be loaded correctly');
    }

    // 2. Migration: Rename Relay Teams (Remove Comma and Swap)
    // This runs on EVERY page load to ensure consistency
    let migrationCount = 0;
    records.forEach(r => {
        const ev = events.find(e => e.name === r.event);
        const eventName = (r.event || "").toLowerCase();
        const isRelayEvent = (ev && (ev.isRelay || ev.name.toLowerCase().includes('4x') || ev.name.toLowerCase().includes('σκυτάλη'))) ||
            eventName.includes('4x') || eventName.includes('σκυτάλη') || eventName.includes('relay');

        const athName = (r.athlete || "");
        const athLower = athName.toLowerCase();
        const containsTeamWord = athLower.includes('ομάδα') || athLower.includes('team') || athLower.includes('εθνική') || athLower.includes('μικτή');

        // Aggressive check for relay-like records with commas
        if ((r.isRelay || isRelayEvent || containsTeamWord) && athName.includes(',')) {
            const parts = athName.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                // Change "Ομάδα, Μικτή" -> "Μικτή Ομάδα"
                r.athlete = `${parts[1]} ${parts[0]}`;
                recordsUpdated = true;
                migrationCount++;
            }
        }
    });

    if (migrationCount > 0) {
        console.log(`Migrated ${migrationCount} relay team names`);
    }

    // 3. Migration: Add Track Type field to all existing records
    let trackTypeMigrationCount = 0;
    records.forEach(r => {
        if (!r.trackType) {
            r.trackType = 'Outdoor';
            recordsUpdated = true;
            trackTypeMigrationCount++;
        }
    });

    if (trackTypeMigrationCount > 0) {
        console.log(`Added Track Type field to ${trackTypeMigrationCount} existing records`);
    }

    // 4. Migration: Trim trailing spaces from athlete names
    let athleteNameTrimCount = 0;
    records.forEach(r => {
        if (r.athlete && r.athlete !== r.athlete.trim()) {
            r.athlete = r.athlete.trim();
            recordsUpdated = true;
            athleteNameTrimCount++;
        }
    });

    if (athleteNameTrimCount > 0) {
        console.log(`Trimmed trailing spaces from ${athleteNameTrimCount} athlete names`);
    }

    // 5. Migration: Remove Legacy Test Data
    const testNamesToRemove = ['Golden Eagles', 'Team, Final', 'Eagles, Golden', 'Test Team', 'Test Athlete'];
    const initialCount = records.length;
    records = records.filter(r => {
        if (!r.athlete) return true;
        const isTest = testNamesToRemove.some(tn => r.athlete.includes(tn));
        return !isTest;
    });
    if (records.length < initialCount) {
        recordsUpdated = true;
        console.log(`Removed ${initialCount - records.length} legacy test records.`);
    }

    if (recordsUpdated) {
        localStorage.setItem('tf_records', JSON.stringify(records));
        console.log("Records updated in localStorage (Seeding/Migration).");
    }

    function migrateEventsToFormulas(forced = false) {
        if (!events || events.length === 0) return;
        let changed = false;
        events.forEach(ev => {
            // Force update if requested or if formula is empty
            if (forced || !ev.formula || ev.formula.trim() === '') {
                const rule = getEventRule(ev.name);
                if (rule) {
                    const parts = [];
                    if (rule.HOWTO) parts.push(`HOWTO: ${rule.HOWTO}`);
                    if (rule.Rule) parts.push(`Rule: ${rule.Rule}`);
                    ev.formula = parts.join('; ');
                    changed = true;
                }
            }
        });
        if (changed) {
            localStorage.setItem('tf_events', JSON.stringify(events));
        }
    }
    migrateEventsToFormulas(false); // Only migrate if formula is empty

    // --- Specific Fixes for 5000m and 10000m Walk ---
    function fixSpecificEventFormulas() {
        let changed = false;
        const fixes = [
            { name: "5000\u03bc", formula: "HOWTO: Time; Rule: IF IN MARK THERE ARE 1 COLON THE FORMAT IS Hours:Minutes.Seconds ELSE FORMAT IS Minutes.Seconds.Hundreds of Second" },
            { name: "10000\u03bc \u0392\u03ac\u03b4\u03b7\u03bd", formula: "HOWTO: Time; Rule: IF IN MARK THERE ARE 1 COLON THE FORMAT IS Hours:Minutes.Seconds ELSE FORMAT IS Minutes.Seconds.Hundreds of Second" }
        ];

        fixes.forEach(fix => {
            const ev = events.find(e => e.name === fix.name);
            if (ev && ev.formula !== fix.formula) {
                ev.formula = fix.formula;
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('tf_events', JSON.stringify(events));
            renderEventList();
        }
    }
    fixSpecificEventFormulas();

    function populateAthleteFilter() {
        if (!filterAthlete) return;
        const currentVal = filterAthlete.value;
        filterAthlete.innerHTML = '<option value="all">All Athletes</option>';

        // Get unique names from records
        const names = [...new Set(records.map(r => r.athlete))].sort();
        names.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            filterAthlete.appendChild(opt);
        });
        filterAthlete.value = currentVal;
    }


    let editingId = null;
    let editingEventId = null;
    let editingAthleteId = null;
    let editingHistoryId = null;
    let previousTab = null; // Track which tab user was on before editing


    // WMA Data State
    let wmaData = [];
    try {
        wmaData = JSON.parse(localStorage.getItem('tf_wma_data')) || [];
    } catch (e) {
        console.error("WMA data corrupted", e);
        wmaData = [];
    }
    let editingWMAId = null;

    // We'll load official data if localStorage is empty when WMA tab is opened
    // and provide a button to reload it.

    // IAAF Data State
    let iaafData = [];
    let iaafUpdates = {};
    let bypassAgeValidation = false; // Flag for "Save Anyway" button
    try {
        iaafUpdates = JSON.parse(localStorage.getItem('tf_iaaf_updates')) || {};
    } catch (e) {
        console.error("IAAF updates corrupted", e);
        iaafUpdates = {};
    }
    let isIAAFDataLoaded = false;

    // Migrate gender labels back to English
    function migrateGenderLabels() {
        let changed = false;

        // Migrate records
        records.forEach(r => {
            if (r.gender === 'Ανδρες') { r.gender = 'Male'; changed = true; }
            if (r.gender === 'Γυναίκες') { r.gender = 'Female'; changed = true; }
        });

        // Migrate athletes
        athletes.forEach(a => {
            if (a.gender === 'Ανδρες') { a.gender = 'Male'; changed = true; }
            if (a.gender === 'Γυναίκες') { a.gender = 'Female'; changed = true; }
        });

        if (changed) {
            localStorage.setItem('tf_records', JSON.stringify(records));
            localStorage.setItem('tf_athletes', JSON.stringify(athletes));
            console.log('Gender labels reverted to English');
        }
    }
    migrateGenderLabels();

    // --- Firebase Authentication ---
    let auth = null;
    let currentUser = null;

    // --- Init ---
    // --- Firebase Synchronization ---
    const firebaseConfig = {
        apiKey: "AIzaSyDbgomknRRWWBjxZaa_wqrf2ldEjsb-ZOg",
        authDomain: "greekmasterathletics.firebaseapp.com",
        databaseURL: "https://greekmasterathletics-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "greekmasterathletics",
        storageBucket: "greekmasterathletics.firebasestorage.app",
        messagingSenderId: "626260410999",
        appId: "1:626260410999:web:1879cb2476995ca84dbc72",
        measurementId: "G-K4T2S7X3X4"
    };

    // --- Auth Configuration ---
    // REPLACE WITH YOUR ALLOWED EMAILS
    const allowedEmails = [
        "harryscons@gmail.com",
        "cha.kons@gmail.com",
        "efimitselou@gmail.com"
    ];

    function isUserAllowed(email) {
        if (!email) return false;
        if (allowedEmails.includes(email)) return true;
        return appUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    }

    function getUserRole(email) {
        if (!email) return 'User';
        const lowerEmail = email.toLowerCase();
        if (lowerEmail === 'cha.kons@gmail.com' || lowerEmail === 'admin@greekmasterathletics.com' || lowerEmail === 'support@greekmasterathletics.com') return 'Supervisor';
        if (lowerEmail === 'harryscons@gmail.com') return 'Admin';
        const user = appUsers.find(u => u.email.toLowerCase() === lowerEmail);
        return user ? user.role : 'User';
    }

    function isSupervisor(email) {
        if (isLocalEnvironment()) return true;
        return getUserRole(email) === 'Supervisor';
    }

    function isAdminOrSupervisor(email) {
        if (isLocalEnvironment()) return true;
        const role = getUserRole(email);
        return role === 'Admin' || role === 'Supervisor';
    }

    function isAdminUser(email) {
        if (isLocalEnvironment()) return true;
        return getUserRole(email) === 'Admin';
    }

    function attemptLocalAdminLogin() {
        // Check if user explicitly logged out
        if (localStorage.getItem('tf_manual_logout') === 'true') {
            console.log("🛑 Local Admin Auto-Login bypassed due to manual logout.");
            return false;
        }

        if (isLocalEnvironment()) {
            console.log("🚧 Local Environment Detected: Auto-logging in as Local Admin");
            const localAdminPayload = {
                email: 'harryscons@gmail.com',
                displayName: 'Harry (Local Admin)',
                uid: 'local_supervisor_offline',
                photoURL: 'https://ui-avatars.com/api/?name=Local+Admin&background=random&color=fff&background=10b981'
            };
            currentUser = localAdminPayload;
            updateUIForAuth(localAdminPayload);

            const btnLogin = document.getElementById('btnLogin');
            const userProfile = document.getElementById('userProfile');
            const userAvatar = document.getElementById('userAvatar');

            if (userProfile && btnLogin) {
                btnLogin.classList.add('hidden');
                userProfile.classList.remove('hidden');
                if (userAvatar) userAvatar.src = localAdminPayload.photoURL;
            }
            // Also ensure cloud status reflects this
            updateCloudStatus('disconnected');
            return true;
        }
        return false;
    }

    // --- Login Handler (Robust) ---
    function handleLoginClick() {
        console.log("🔐 Login Button Clicked");
        // Clear manual logout flag to allow re-login
        localStorage.removeItem('tf_manual_logout');

        const local = isLocalEnvironment();

        // 1. Try Firebase Login if available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const provider = new firebase.auth.GoogleAuthProvider();
            // Force account selection to prevent automatic login as previous user
            provider.setCustomParameters({ prompt: 'select_account' });

            firebase.auth().signInWithPopup(provider).catch((error) => {
                console.error("Cloud Login Failed:", error);
                // Only alert if it's a real error (not user closed popup)
                if (error.code !== 'auth/popup-closed-by-user') {
                    alert("Cloud Login Failed: " + error.message);
                }
            });
        } else if (local) {
            // 2. Local / Offline Fallback
            console.log("⚡ Forcing Local Admin Login...");
            if (attemptLocalAdminLogin()) {
                console.log("✅ Local Login Success");
            } else {
                alert("Local Login Failed.");
            }
        } else {
            alert("Cloud Login is unavailable (Offline).");
        }
    }

    function initAuth() {
        const btnLogin = document.getElementById('btnLogin');
        const btnLogout = document.getElementById('btnLogout');
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar');

        // Note: btnLogin click listener is now handled in init() / setupEventListeners()
        // to ensure it works even if this function crashes or is skipped.

        if (typeof firebase === 'undefined' || !firebase.auth) {
            console.warn("Firebase Auth module not loaded. Skipping Auth listeners.");
            return;
        }

        auth = firebase.auth();


        auth.onAuthStateChanged((user) => {
            if (user) {
                // Check if user is allowed
                if (!isUserAllowed(user.email)) {
                    console.warn(`User ${user.email} is not in the allowed list.`);
                    alert(`Access Denied: The email ${user.email} is not authorized to edit records.`);
                    auth.signOut();
                    return;
                }

                console.log("User logged in:", user.displayName);
                currentUser = user;
                updateUIForAuth(user);

                if (userProfile && btnLogin) {
                    btnLogin.classList.add('hidden');
                    userProfile.classList.remove('hidden');
                    if (userAvatar) userAvatar.src = user.photoURL;
                }
            } else {
                console.log("User logged out (Auth Check)");

                // --- LOCAL ADMIN BYPASS ---
                // ONLY trigger if not a manual logout and in local environment
                if (localStorage.getItem('tf_manual_logout') !== 'true' && isLocalEnvironment()) {
                    if (attemptLocalAdminLogin()) return;
                }

                currentUser = null;
                updateUIForAuth(null);

                if (userProfile && btnLogin) {
                    btnLogin.classList.remove('hidden');
                    userProfile.classList.add('hidden');
                }
            }
        });
    }

    function updateUIForAuth(user) {
        const role = user ? getUserRole(user.email) : null;

        // Always treat local environment as having Supervisor/Admin access for UI visibility
        const isLocal = isLocalEnvironment();

        const isAdmin = role === 'Admin' || role === 'Supervisor' || isLocal;
        const isSuper = role === 'Supervisor' || isLocal;

        document.body.classList.toggle('is-admin', isAdmin);
        document.body.classList.toggle('is-supervisor', isSuper);

        // Toggle Visibility of Admin features
        // Toggle Visibility of Admin features (General Admin)
        const adminElements = document.querySelectorAll('.btn-danger, .btn-warning, .delete-country-btn, .edit-athlete-btn, .delete-athlete-btn, #btnSelectExcel, #btnImportRecords, #recordImportFileName, #btnRestore, #btnBackup, #btnImportAthletes, #clearRecords, #clearAthletes, #clearAll');

        adminElements.forEach(el => {
            if (isAdmin) el.classList.remove('hidden');
            else el.classList.add('hidden');
            if (isAdmin) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });

        // Toggle Visibility of Supervisor features (Critical Actions: History Edit/Delete, User Mgmt)
        const supervisorElements = document.querySelectorAll('.edit-history-btn, .delete-history-btn');
        supervisorElements.forEach(el => {
            if (isSuper) el.classList.remove('hidden');
            else el.classList.add('hidden');
        });

        // Specific Visibility for User Management (Supervisor only)
        const userManagementBtn = document.getElementById('subtab-users');
        if (userManagementBtn) {
            if (isSuper) userManagementBtn.classList.remove('hidden');
            else userManagementBtn.classList.add('hidden');
        }

        // Re-render data tables now that auth state is explicitly known
        // (Solves race condition where data loads faster than auth, leaving conditional buttons out)
        if (typeof renderReports === 'function') {
            renderReports();
        }
        if (typeof renderHistoryList === 'function') {
            renderHistoryList();
        }
        if (typeof renderUserList === 'function') {
            renderUserList();
        }
        // Hide Save Button if not admin
        const navSave = document.getElementById('btnSaveCloud');
        if (navSave) {
            if (isAdmin) navSave.style.display = 'flex';
            else navSave.style.display = 'none';
        }

        // Hide Log Record Tab content or show login prompt? 
        // For now, let's just disable the Submit button in Log Record
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.disabled = !isAdmin;
    }

    function loadLocalDataOnly() {
        console.log("Loading data from LocalStorage fallback...");
        isDataReady = true;
        if (typeof runPostLoadMaintenance === 'function') {
            runPostLoadMaintenance();
        } else {
            renderAll();
        }
    }

    // Initialize Firebase
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE") {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database(); // Use global db variable
            initAuth(); // Initialize Auth

            // Monitor Firebase Connection Status
            db.ref('.info/connected').on('value', (snapshot) => {
                if (snapshot.val() === true) {
                    updateCloudStatus('connected');
                } else {
                    updateCloudStatus('disconnected');
                }
            });

            // Robust Migration + Loading sequence
            migrateLocalToCloud(db).then(() => {
                console.log("Migration check complete. Starting cloud listeners...");
                loadInitialData(db);
            }).catch(err => {
                console.error("Migration/Init failed:", err);
                loadLocalDataOnly();
            });

        } catch (error) {
            console.error("Firebase initialization failed:", error);
            updateCloudStatus('disconnected');
            // Try explicit local fallback for auth too
            if (attemptLocalAdminLogin()) {
                // Attach listener specifically for offline logout/login cycling
                // ensureLoginListener(); // Handled in init now
            }
            loadLocalDataOnly();
        }
    } else {
        console.warn("Firebase not configured. Using localStorage only.");
        updateCloudStatus('disconnected');
        attemptLocalAdminLogin();
        attemptLocalAdminLogin();
        // ensureLoginListener(); // Handled in init now
        loadLocalDataOnly();
    }

    init();

    function init() {
        initThemes();
        populateAgeSelects(); // Immediate static population

        // Critical: Attach Login Listener immediately
        const btnLogin = document.getElementById('btnLogin');
        if (btnLogin) {
            btnLogin.onclick = handleLoginClick; // Robust attachment
        }

        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                localStorage.setItem('tf_manual_logout', 'true');
                if (typeof firebase !== 'undefined' && firebase.auth && auth) {
                    auth.signOut().then(() => {
                        window.location.reload();
                    }).catch((e) => {
                        console.error("Logout error:", e);
                        window.location.reload();
                    });
                } else {
                    // Local Logout
                    currentUser = null;
                    window.location.reload();
                }
            });
        }

        setupEventListeners();
        setupTableSorting(); // Initialize sorting listeners
        renderAll();

        // Safety Timeout: Force Data Ready if Firebase hangs
        setTimeout(() => {
            if (!isDataReady) {
                console.warn("⚠️ Data Sync Timeout: Forcing System Ready state to allow saves.");
                isDataReady = true;
                if (typeof runPostLoadMaintenance === 'function') {
                    runPostLoadMaintenance();
                }
            }
        }, 5000);

        // General Settings Init
        if (hideNotesSymbol) {
            hideNotesSymbol.checked = localStorage.getItem('tf_hide_notes_symbol') === 'true';
            hideNotesSymbol.addEventListener('change', () => {
                localStorage.setItem('tf_hide_notes_symbol', hideNotesSymbol.checked);
                renderReports();
            });
        }

        const btnRecalculateWMA = document.getElementById('btnRecalculateWMA');
        if (btnRecalculateWMA) {
            btnRecalculateWMA.addEventListener('click', recalculateAllWMAStats);
        }

        // Default to Reports
        try { switchTab('reports'); } catch (e) { console.error("switchTab failed", e); }

        // Initial Import Button State
        if (btnImportRecords) {
            btnImportRecords.classList.remove('btn-disabled-style');
            btnImportRecords.disabled = false;
        }


        // Init Flatpickr
        try {
            if (typeof flatpickr !== 'undefined') {
                if (dateInput) {
                    datePicker = flatpickr(dateInput, {
                        dateFormat: "Y-m-d",
                        altInput: true,
                        altFormat: "d/m/Y",
                        allowInput: true,
                        defaultDate: "today",
                        onChange: function (selectedDates, dateStr, instance) {
                            if (typeof updateCalculatedAgeGroup === 'function') {
                                updateCalculatedAgeGroup();
                            }
                        }
                    });
                }
                if (newAthleteDOB) {
                    dobPicker = flatpickr(newAthleteDOB, {
                        dateFormat: "Y-m-d",
                        altInput: true,
                        altFormat: "d/m/Y",
                        allowInput: true
                    });
                }
            } else {
                console.warn('Flatpickr library not loaded.');
            }
        } catch (e) {
            console.error('Flatpickr init failed:', e);
        }

        // Defaults
        if (dateInput) {
            if (datePicker) {
                datePicker.setDate(new Date());
            } else if (dateInput.type === 'date') {
                dateInput.valueAsDate = new Date();
            } else {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }

        console.log("UI Init finished. Waiting for data consensus..."); // DEBUG
    }

    function seedEvents() {
        const defaults = {
            "10000μ": "10,000m", "10000μ Βάδην": "10,000m Race Walk", "100μ": "100m",
            "100μ Εμπόδια": "100m Hurdles", "110μ Εμπόδια": "110m Hurdles", "1500μ": "1,500m",
            "20000μ Βάδην": "20,000m Race Walk", "2000μ ΦΕ": "2,000m Steeplechase", "200μ": "200m",
            "200μ Εμπόδια": "200m Hurdles", "3000μ": "3,000m", "3000μ Βάδην": "3,000m Race Walk",
            "3000μ ΦΕ": "3,000m Steeplechase", "300μ Εμπόδια": "300m Hurdles", "400μ": "400m",
            "400μ Εμπόδια": "400m Hurdles", "4x100": "4x100m Relay", "4x400": "4x400m Relay",
            "5000μ": "5,000m", "5000μ Βάδην": "5,000m Race Walk", "800μ": "800m",
            "80μ Εμπόδια": "80m Hurdles", "Ακόντιο": "Javelin Throw", "Βαλκανική Σκυτάλη": "Balkan Relay",
            "Βαρύ Οργανο": "Weight Throw", "Δέκαθλο": "Decathlon", "Δίσκος": "Discus Throw",
            "Επι Κοντώ": "Pole Vault", "Έπταθλο": "Heptathlon", "Ημιμαραθώνιος": "Half Marathon",
            "Μαραθώνιος": "Marathon", "Μήκος": "Long Jump", "Πένταθλο": "Pentathlon",
            "Πένταθλο Ρίψεων": "Throws Pentathlon", "Σφαίρα": "Shot Put", "Σφύρα": "Hammer Throw",
            "Τριπλούν": "Triple Jump", "Υψος": "High Jump"
        };

        let changed = false;
        Object.entries(defaults).forEach(([name, desc]) => {
            const exists = events.some(e => e.name.trim().toLowerCase() === name.trim().toLowerCase());

            if (!exists) {
                const isRelay = name.includes('4x') || name.includes('Σκυτάλη');
                const isCombined = ["Δέκαθλο", "Έπταθλο", "Πένταθλο", "Πένταθλο Ρίψεων"].includes(name);

                events.push({
                    id: Date.now() + Math.random(),
                    name: name.trim(),
                    descriptionEn: desc,
                    specs: '',
                    notes: '',
                    isCombined: isCombined,
                    isRelay: isRelay
                });
                changed = true;
            }
        });

        // Ensure properties exist
        events.forEach(ev => {
            if (ev.notes === undefined) { ev.notes = ''; changed = true; }
        });

        if (changed) {
            saveEvents();
            console.log("Seeded/Updated events.");
        }
    }

    function seedCountries() {
        if (countries.length === 0 || (countries.length > 0 && countries.includes("USA") && !countries.includes("ΗΠΑ"))) {
            // Seed if empty OR if it looks like the old English list
            countries = [
                'Ελλάδα', 'Κύπρος', 'ΗΠΑ', 'Ηνωμένο Βασίλειο', 'Γερμανία', 'Γαλλία', 'Ιταλία', 'Ισπανία',
                'Τζαμάικα', 'Κένυα', 'Αιθιοπία', 'Καναδάς', 'Αυστραλία', 'Ιαπωνία', 'Κίνα', 'Ρωσία', 'Βραζιλία'
            ].sort();
            saveCountries();
            console.log("Seeded Countries");
        }
    }

    function seedRecords() {
        if (records.length === 0) {
            console.log("Records empty. Starting clean.");
            // records = [...]; // Disabled sample seeding
        }
    }


    function migrateRecordFormat() {
        let changed = false;
        records.forEach(r => {
            if (r.athlete && !r.athlete.includes(',')) {
                const match = athletes.find(a => `${a.firstName} ${a.lastName}`.trim() === r.athlete);
                if (match) {
                    r.athlete = `${match.lastName}, ${match.firstName}`;
                    changed = true;
                } else {
                    const parts = r.athlete.trim().split(' ');
                    if (parts.length >= 2) {
                        const last = parts.pop();
                        const first = parts.join(' ');
                        r.athlete = `${last}, ${first}`;
                        changed = true;
                    }
                }
            }
        });
        if (changed) saveRecords();
    }
    function migrateEvents() {
        if (events.length > 0 && typeof events[0] === 'string') {
            console.log("Migrating Events to Object Schema...");
            events = events.map(name => ({
                id: Date.now() + Math.random(),
                name: name,
                specs: '',
                notes: '',
                isCombined: false,
                isRelay: false
            }));
            saveEvents();
        }

        let changed = false;
        events.forEach(ev => {
            if (!ev.eventType) {
                if (ev.isRelay) ev.eventType = 'Relay';
                else if (ev.isCombined) ev.eventType = 'Combined';
                else ev.eventType = 'Track';
                changed = true;
            }
        });
        if (changed) saveEvents();
    }

    function migrateEventDescriptions() {
        const defaults = {
            "10000μ": "10,000m", "10000μ Βάδην": "10,000m Race Walk", "100μ": "100m",
            "100μ Εμπόδια": "100m Hurdles", "110μ Εμπόδια": "110m Hurdles", "1500μ": "1,500m",
            "20000μ Βάδην": "20,000m Race Walk", "2000μ ΦΕ": "2,000m Steeplechase", "200μ": "200m",
            "200μ Εμπόδια": "200m Hurdles", "3000μ": "3,000m", "3000μ Βάδην": "3,000m Race Walk",
            "3000μ ΦΕ": "3,000m Steeplechase", "300μ Εμπόδια": "300m Hurdles", "400μ": "400m",
            "400μ Εμπόδια": "400m Hurdles", "4x100": "4x100m Relay", "4x400": "4x400m Relay",
            "5000μ": "5,000m", "5000μ Βάδην": "5,000m Race Walk", "800μ": "800m",
            "80μ Εμπόδια": "80m Hurdles", "Ακόντιο": "Javelin Throw", "Βαλκανική Σκυτάλη": "Balkan Relay",
            "Βαρύ Οργανο": "Weight Throw", "Δέκαθλο": "Decathlon", "Δίσκος": "Discus Throw",
            "Επι Κοντώ": "Pole Vault", "Έπταθλο": "Heptathlon", "Ημιμαραθώνιος": "Half Marathon",
            "Μαραθώνιος": "Marathon", "Μήκος": "Long Jump", "Πένταθλο": "Pentathlon",
            "Πένταθλο Ρίψεων": "Throws Pentathlon", "Σφαίρα": "Shot Put", "Σφύρα": "Hammer Throw",
            "Τριπλούν": "Triple Jump", "Υψος": "High Jump"
        };
        let changed = false;
        events.forEach(ev => {
            if (ev.descriptionEn === undefined) {
                // Try to match default
                const key = Object.keys(defaults).find(k => k.toLowerCase() === ev.name.toLowerCase());
                ev.descriptionEn = key ? defaults[key] : '';
                changed = true;
            }
        });
        if (changed) saveEvents();
    }

    // Helper to check for Supervisor role
    // Includes localhost/file checks for testing
    function migrateAthletes() {
        let changed = false;
        records.forEach(r => {
            if (!r.athlete) return;

            const name = r.athlete;
            const isComma = name.includes(',');

            // normalize record name
            let rFirst = '', rLast = '';
            if (isComma) {
                const parts = name.split(',');
                rLast = parts[0].trim();
                rFirst = parts[1] ? parts[1].trim() : '';
            } else {
                const parts = name.trim().split(' ');
                if (parts.length > 1) {
                    rFirst = parts[0];
                    rLast = parts.slice(1).join(' ');
                } else {
                    rLast = name.trim();
                }
            }

            const rFirstLower = rFirst.toLowerCase();
            const rLastLower = rLast.toLowerCase();

            const exists = athletes.some(a => {
                const aFirst = a.firstName.toLowerCase();
                const aLast = a.lastName.toLowerCase();

                // Check exact match
                if (aFirst === rFirstLower && aLast === rLastLower) return true;

                // Check swapped match (Record: "Last First" vs Athlete: "First Last")
                // e.g. Record "Bolt Usain" vs Athlete "Usain Bolt"
                // In my parsing logic above, if record was "Bolt Usain" (no comma), rFirst="Bolt", rLast="Usain"
                // Athlete is First="Usain", Last="Bolt"
                if (aFirst === rLastLower && aLast === rFirstLower) return true;

                // Check concatenated
                const flName = `${a.firstName} ${a.lastName}`.toLowerCase();
                const lfName = `${a.lastName}, ${a.firstName}`.toLowerCase();
                const recNameLower = name.toLowerCase();

                return flName === recNameLower || lfName === recNameLower;
            });

            if (!exists) {
                // Only add if we rely purely on the record's format
                let first = rFirst || 'Unknown';
                let last = rLast || name;

                athletes.push({
                    id: Date.now() + Math.random(),
                    idNumber: '',
                    firstName: first,
                    lastName: last,
                    dob: '',
                    gender: r.gender || ''
                });
                changed = true;
            }
        });

        if (changed) saveAthletes();
    }

    function migrateAthleteNames() {
        let changed = false;

        athletes.forEach(a => {
            if (a.name) {
                const parts = a.name.trim().split(' ');
                a.firstName = parts.shift() || 'Unknown';
                a.lastName = parts.join(' ') || '';
                delete a.name;
                changed = true;
            }
        });
        if (changed) saveAthletes();
    }

    // --- Logic ---
    function populateAgeSelects() {
        const groups = [];
        for (let i = 35; i < 100; i += 5) {
            groups.push(i.toString());
        }
        groups.push('100+');

        if (ageGroupInput) {
            const currentVal = ageGroupInput.value;
            ageGroupInput.innerHTML = '<option value="">Select Age Group</option>';
            groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                ageGroupInput.appendChild(opt);
            });
            if (currentVal) ageGroupInput.value = currentVal;
        }

        if (filterAge) {
            const currentVal = filterAge.value;
            filterAge.innerHTML = '<option value="all">All Age Groups</option>';
            groups.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                filterAge.appendChild(opt);
            });
            if (currentVal) filterAge.value = currentVal;
        }
    }

    function populateYearDropdown() {
        if (!filterYear) return;

        const currentVal = filterYear.value;

        // Extract unique years from records
        const years = new Set();
        const currentYear = new Date().getFullYear();
        years.add(currentYear);

        records.forEach(r => {
            if (r.date) {
                const d = new Date(r.date);
                if (!isNaN(d.getTime())) {
                    years.add(d.getFullYear());
                }
            }
        });

        const sortedYears = Array.from(years).sort((a, b) => b - a);

        filterYear.innerHTML = '<option value="all" style="color:black;">All Years</option>';

        sortedYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y.toString();
            opt.textContent = y.toString();
            opt.style.color = 'black';
            filterYear.appendChild(opt);
        });

        // Restore value if it still exists
        if (Array.from(filterYear.options).some(opt => opt.value === currentVal)) {
            filterYear.value = currentVal;
        } else {
            filterYear.value = 'all';
        }
    }

    function populateEventDropdowns() {
        if (evtInput) {
            const currentVal = evtInput.value;
            evtInput.innerHTML = '<option value="" disabled selected>Select Event</option>';
            events.forEach(ev => {
                const opt = document.createElement('option');
                opt.value = ev.name;
                opt.textContent = ev.name;
                evtInput.appendChild(opt);
            });
            if (currentVal) evtInput.value = currentVal;
        }

        if (filterEvent) {
            const currentVal = filterEvent.value;
            filterEvent.innerHTML = '<option value="all">All Events</option>';
            events.forEach(ev => {
                const opt = document.createElement('option');
                opt.value = ev.name;
                opt.textContent = ev.name;
                filterEvent.appendChild(opt);
            });
            if (currentVal) filterEvent.value = currentVal;
        }
    }

    function populateAthleteDropdown() {
        athletes.sort((a, b) => {
            const lastA = a.lastName || '';
            const lastB = b.lastName || '';
            const firstA = a.firstName || '';
            const firstB = b.firstName || '';

            if (lastA === lastB) return firstA.localeCompare(firstB);
            return lastA.localeCompare(lastB);
        });

        if (athleteInput) {
            const currentVal = athleteInput.value;
            athleteInput.innerHTML = '<option value="" disabled selected>Select Athlete</option>';
            athletes.forEach(a => {
                const opt = document.createElement('option');
                const idText = a.idNumber ? ` (#${a.idNumber})` : '';
                opt.textContent = `${a.lastName}${a.lastName ? ', ' : ''}${a.firstName}${idText}`;
                opt.value = `${a.lastName}, ${a.firstName}`;
                opt.dataset.id = a.id;
                athleteInput.appendChild(opt);
            });
            if (currentVal) athleteInput.value = currentVal;
        }

        // Also populate relay participant dropdowns with default state
        populateRelayAthletes(genderInput ? genderInput.value : '');
    }

    function populateRelayAthletes(gender) {
        const relayDropdowns = [relayAthlete1, relayAthlete2, relayAthlete3, relayAthlete4];
        relayDropdowns.forEach(dd => {
            if (!dd) return;
            const currentVal = dd.value;
            dd.innerHTML = '<option value="">(Empty)</option>';

            // Filter athletes by gender if not "Mixed" or empty
            const filtered = athletes.filter(a => {
                if (!gender || gender === 'Mixed' || gender === 'all') return true;
                return a.gender === gender;
            });

            filtered.forEach(a => {
                const opt = document.createElement('option');
                const idText = a.idNumber ? ` (#${a.idNumber})` : '';
                opt.textContent = `${a.lastName}${a.lastName ? ', ' : ''}${a.firstName}${idText}`;
                opt.value = `${a.lastName}, ${a.firstName}`;
                dd.appendChild(opt);
            });
            console.log(`Populated relay dropdown with ${filtered.length} athletes for gender: ${gender}`);
            dd.value = currentVal;
        });
    }

    function setupEventListeners() {
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        document.querySelectorAll('.sub-tab').forEach(tab => {
            tab.addEventListener('click', () => switchSubTab(tab.dataset.subtab));
        });
        document.querySelectorAll('.stats-sub-tab').forEach(tab => {
            tab.addEventListener('click', () => switchStatsSubTab(tab.dataset.statSubtab));
        });

        if (recordForm) recordForm.addEventListener('submit', handleFormSubmit);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);

        // Inline Age Validation Warning Handlers
        const btnAgeWarningProceed = document.getElementById('btnAgeWarningProceed');
        if (btnAgeWarningProceed) {
            btnAgeWarningProceed.addEventListener('click', () => {
                // bypassAgeValidation = true; // Set bypass flag
                document.getElementById('ageValidationWarning').classList.add('hidden');
                recordForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            });
        }

        const btnAgeWarningCancel = document.getElementById('btnAgeWarningCancel');
        if (btnAgeWarningCancel) {
            btnAgeWarningCancel.addEventListener('click', () => {
                document.getElementById('ageValidationWarning').classList.add('hidden');
            });
        }


        if (athleteInput) {
            athleteInput.addEventListener('change', updateCalculatedAgeGroup);
        }

        if (dateInput) {
            dateInput.addEventListener('change', updateCalculatedAgeGroup);
        }

        if (evtInput) {
            evtInput.addEventListener('change', () => {
                const eventName = evtInput.value;
                handleMixedGenderVisibility(eventName);
                const ev = events.find(e => e.name === eventName);
                // Robust check for relay type
                const isRelay = ev ? (ev.eventType === 'Relay' || ev.isRelay === true) : false;
                toggleRelayFields(isRelay);
            });
        }

        if (genderInput) {
            genderInput.addEventListener('change', () => {
                populateRelayAthletes(genderInput.value);
            });
        }

        if (eventForm) eventForm.addEventListener('submit', handleEventSubmit);
        if (eventListBody) {
            eventListBody.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.delete-event-btn');
                const editBtn = e.target.closest('.edit-event-btn');
                if (delBtn && !delBtn.disabled) deleteEvent(delBtn.dataset.id);
                if (editBtn) editEvent(editBtn.dataset.id);
            });
        }

        if (athleteForm) athleteForm.addEventListener('submit', handleAthleteSubmit);
        if (athleteListBody) {
            athleteListBody.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.delete-athlete-btn');
                const editBtn = e.target.closest('.edit-athlete-btn');
                console.log('AthleteList Click:', e.target, 'EditBtn:', editBtn, 'DelBtn:', delBtn);

                if (delBtn && !delBtn.disabled) deleteAthlete(delBtn.dataset.id);
                if (editBtn) {
                    const idToEdit = delBtn ? delBtn.dataset.id : editBtn.dataset.id;
                    console.log('Editing ID:', idToEdit);
                    editAthlete(idToEdit);
                }
            });
        }

        // Event Type Radio Button Handlers
        const eventTypeRadios = [eventTypeField, eventTypeTrack, eventTypeCombined, eventTypeRelay];
        eventTypeRadios.forEach(radio => {
            if (radio) {
                radio.addEventListener('change', () => {
                    if (eventTypeCombined.checked) {
                        // Combined event - enable Number of Events field
                        newEventSubCount.disabled = false;
                        newEventSubCount.focus();
                    } else {
                        // Other types - disable Number of Events field
                        newEventSubCount.disabled = true;
                        newEventSubCount.value = '';
                        subEventsContainer.innerHTML = '';
                        subEventsContainer.style.display = 'none';
                    }
                });
            }
        });


        if (newEventSubCount) {
            newEventSubCount.addEventListener('input', () => {
                const count = parseInt(newEventSubCount.value) || 0;
                subEventsContainer.innerHTML = '';

                if (count > 0) {
                    subEventsContainer.style.display = 'flex';

                    // Generate Options
                    let options = '<option value="" disabled selected>Select Event</option>';
                    // Filter out Combined and Relay events
                    const availableEvents = events.filter(e => !e.isCombined && !e.isRelay);
                    availableEvents.sort((a, b) => a.name.localeCompare(b.name));

                    availableEvents.forEach(e => {
                        options += `<option value="${e.name}">${e.name}</option>`;
                    });

                    for (let i = 1; i <= count; i++) {
                        const div = document.createElement('div');
                        div.className = 'form-group';
                        div.style.flex = '1 1 45%'; // Responsive-ish
                        div.style.minWidth = '150px';
                        div.innerHTML = `
                            <label style="font-size:0.75rem;">Event ${i}</label>
                            <select class="sub-event-input" required style="width:100%;">
                                ${options}
                            </select>
                        `;
                        subEventsContainer.appendChild(div);
                    }
                } else {
                    subEventsContainer.style.display = 'none';
                }
            });
        }

        if (filterTrackType) filterTrackType.addEventListener('change', renderReports);
        if (filterEvent) filterEvent.addEventListener('change', renderReports);

        if (filterGender) filterGender.addEventListener('change', genderFilterChange);
        if (filterAge) filterAge.addEventListener('change', renderReports);
        if (filterYear) filterYear.addEventListener('change', renderReports);
        if (filterAgeMismatch) filterAgeMismatch.addEventListener('change', renderReports);
        if (filterAthlete) filterAthlete.addEventListener('change', renderReports);
        if (filterAthleteName) filterAthleteName.addEventListener('input', renderReports);

        if (themeSelect) {
            themeSelect.addEventListener('change', () => {
                setTheme(themeSelect.value);
            });
        }

        if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllData);
        if (clearRecordsBtn) {
            clearRecordsBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to DELETE ALL RECORDS? This cannot be undone.')) {
                    records = [];
                    saveRecords();
                    renderReports();
                    renderHistoryList();
                    alert('All records deleted.');
                }
            });
        }

        if (clearAthletesBtn) {
            clearAthletesBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to DELETE ALL ATHLETES? This cannot be undone.')) {
                    athletes = [];
                    saveAthletes();
                    renderAthleteList();
                    populateAthleteDropdown();
                    alert('All athletes deleted.');
                }
            });
        }

        // Import Records button: open file picker, then auto-import on selection
        if (btnImportRecords && recordImportFile) {
            btnImportRecords.addEventListener('click', () => {
                // Always open file picker when this button is clicked
                recordImportFile.value = ''; // reset so same file can be re-selected
                recordImportFile.click();
            });

            recordImportFile.addEventListener('change', () => {
                const file = recordImportFile.files[0];
                if (file) {
                    if (recordImportFileName) {
                        recordImportFileName.textContent = `Selected: ${file.name}`;
                    }
                    importRecordsFromFile(file);
                }
            });
        }

        if (btnImportAthletes) btnImportAthletes.addEventListener('click', () => athleteImportFile.click());
        if (athleteImportFile) athleteImportFile.addEventListener('change', handleAthleteImport);

        if (athleteListBody) {
            athleteListBody.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-athlete-btn');
                const delBtn = e.target.closest('.delete-athlete-btn');
                if (editBtn) editAthlete(editBtn.dataset.id);
                if (delBtn) deleteAthlete(delBtn.dataset.id);
            });
        }

        const btnExcel = document.getElementById('exportExcel');
        if (btnExcel) btnExcel.addEventListener('click', exportToExcel);

        const btnHTML = document.getElementById('exportHTML');
        if (btnHTML) btnHTML.addEventListener('click', exportToHTML);

        const btnPDF = document.getElementById('exportPDF');
        if (btnPDF) btnPDF.addEventListener('click', exportToPDF);

        if (btnBackup) btnBackup.addEventListener('click', exportDatabase);
        if (btnRestore) btnRestore.addEventListener('click', importDatabase);

        if (userForm) userForm.addEventListener('submit', handleUserSubmit);
        if (userListBody) {
            userListBody.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-user-btn');
                const delBtn = e.target.closest('.delete-user-btn');
                if (editBtn) editUser(editBtn.dataset.id);
                if (delBtn) deleteUser(delBtn.dataset.id);
            });
        }

        if (reportTableBody) {
            reportTableBody.addEventListener('click', (e) => {
                const expandBtn = e.target.closest('.expand-btn');
                const editBtn = e.target.closest('.edit-btn');
                const delBtn = e.target.closest('.delete-btn');

                if (expandBtn) {
                    const id = expandBtn.dataset.id;
                    const detailRow = document.getElementById(`detail-${id}`);
                    if (detailRow) {
                        detailRow.classList.toggle('hidden');
                        expandBtn.textContent = detailRow.classList.contains('hidden') ? '+' : '−';
                    }
                }
                if (editBtn) editRecord(editBtn.dataset.id);
                if (delBtn) deleteRecord(delBtn.dataset.id);
            });
        }

        if (countryForm) countryForm.addEventListener('submit', handleCountrySubmit);
        if (countryListBody) {
            countryListBody.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.delete-country-btn');
                if (delBtn) deleteCountry(delBtn.dataset.country);
            });
        }

        const historyListBody = document.getElementById('historyListBody');
        if (historyListBody) {
            historyListBody.addEventListener('click', (e) => {
                const expandBtn = e.target.closest('.expand-btn');
                const delBtn = e.target.closest('.delete-history-btn');
                const editBtn = e.target.closest('.edit-history-btn');

                if (expandBtn) {
                    const id = expandBtn.dataset.id;
                    const detailRow = document.getElementById(`detail-hist-${id}`);
                    if (detailRow) {
                        detailRow.classList.toggle('hidden');
                        expandBtn.textContent = detailRow.classList.contains('hidden') ? '+' : '−';
                    }
                }
                if (delBtn) deleteHistory(Number(delBtn.dataset.id));
                if (editBtn) editHistory(Number(editBtn.dataset.id));
            });
        }
    }

    function switchTab(tabId) {
        console.log("Switching tab to:", tabId);
        // Hide all views by removing active class
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active-view'));

        // Show target view
        const target = document.getElementById('view-' + tabId);
        if (target) {
            target.classList.add('active-view');
        }

        // Update nav buttons
        document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
        const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');

        // Handling specific views
        if (tabId === 'history') renderHistoryList();
        if (tabId === 'stats') {
            const activeSub = document.querySelector('#view-stats .stats-sub-tab.active');
            if (activeSub) switchStatsSubTab(activeSub.dataset.statSubtab);
            else switchStatsSubTab('medals');
        }

        // Settings View Default
        if (tabId === 'settings') {
            const activeSub = document.querySelector('#view-settings .sub-tab.active');
            if (activeSub) {
                switchSubTab(activeSub.dataset.subtab);
            } else {
                switchSubTab('athletes');
            }
        }
    }

    function switchSubTab(subTabId) {
        // Hide all setting sections
        document.querySelectorAll('.setting-section').forEach(el => el.classList.add('hidden'));

        // Show target section
        const target = document.getElementById('setting-' + subTabId);
        if (target) {
            target.classList.remove('hidden');
        }

        // Update sub-tab buttons
        document.querySelectorAll('#view-settings .sub-tab').forEach(el => el.classList.remove('active'));
        const btn = document.querySelector(`#view-settings .sub-tab[data-subtab="${subTabId}"]`);
        if (btn) btn.classList.add('active');

        // Render lists if needed
        try {
            if (subTabId === 'athletes') renderAthleteList();
            if (subTabId === 'events') {
                renderEventList();
                loadIAAFData(); // Load IAAF data to populate the linking dropdown
            }
            if (subTabId === 'countries') renderCountryList();
            if (subTabId === 'iaaf') {
                loadIAAFData();
            }
            if (subTabId === 'wma') {
                renderWMAFilters();
                initWMAOfficialData();
            }
            if (subTabId === 'general') {
                // Any specific initialization for general settings
            }
        } catch (e) {
            // Error rendering list for subTabId
        }
    }

    function switchStatsSubTab(subTabId) {
        document.querySelectorAll('.stats-section').forEach(el => el.classList.remove('active-view'));
        const target = document.getElementById('stats-' + subTabId);
        if (subTabId === 'age') renderAgeStats();
        if (target) target.classList.add('active-view');

        document.querySelectorAll('.stats-sub-tab').forEach(el => el.classList.remove('active'));
        const btn = document.querySelector(`.stats-sub-tab[data-stat-subtab="${subTabId}"]`);
        if (btn) btn.classList.add('active');

        if (subTabId === 'medals') renderStats();
        if (subTabId === 'wma') {
            loadIAAFData();
            initWMAOfficialData();
            populateWMAReportFilters();
            renderWMAReport();
        }
    }

    function populateWMAReportFilters() {
        // Current selections
        const selEvent = document.getElementById('wmaReportFilterEvent')?.value || 'all';
        const selAthlete = document.getElementById('wmaReportFilterAthlete')?.value || 'all';
        const selGender = document.getElementById('wmaReportFilterGender')?.value || 'all';
        const selAgeGroup = document.getElementById('wmaReportFilterAgeGroup')?.value || 'all';
        const selYear = document.getElementById('wmaReportFilterYear')?.value || 'all';

        // Base records (non-empty)
        const baseRecords = records.filter(r => r.athlete && r.mark && r.athlete.trim() !== '' && r.mark.trim() !== '');

        // Standard filter function
        const matches = (r, exclusions = {}) => {
            if (!exclusions.event && selEvent !== 'all' && r.event !== selEvent) return false;
            if (!exclusions.athlete && selAthlete !== 'all' && r.athlete !== selAthlete) return false;
            if (!exclusions.gender && selGender !== 'all') {
                const g = normalizeGenderLookups(r.gender);
                if (selGender === 'Male' && g !== 'men') return false;
                if (selGender === 'Female' && g !== 'women') return false;
                if (selGender === 'Mixed' && g !== 'mixed') return false;
            }
            if (!exclusions.year && selYear !== 'all') {
                const y = r.date ? new Date(r.date).getFullYear().toString() : '';
                if (y !== selYear) return false;
            }
            if (!exclusions.ageGroup && selAgeGroup !== 'all') {
                const athleteObj = athletes.find(a => `${a.lastName}, ${a.firstName}` === r.athlete);
                let ageAtEvent = 0;
                if (athleteObj && athleteObj.dob && r.date) {
                    ageAtEvent = Math.floor((new Date(r.date) - new Date(athleteObj.dob)) / (1000 * 60 * 60 * 24 * 365.25));
                } else if (r.ageGroup) {
                    ageAtEvent = parseInt(r.ageGroup);
                } else {
                    return false;
                }

                const floorAge = Math.floor(ageAtEvent / 5) * 5;
                const g = normalizeGenderLookups(r.gender);
                const prefix = g === 'men' ? 'M' : (g === 'women' ? 'W' : 'X');
                if (`${prefix}${floorAge}` !== selAgeGroup) return false;
            }
            return true;
        };

        const updateSelect = (id, list, currentVal) => {
            const el = document.getElementById(id);
            if (!el) return;

            // Check if this is the active element to minimize disruption
            const isActive = (document.activeElement === el);

            const newListHtml = `<option value="all">All ${id.replace('wmaReportFilter', '')}s</option>` +
                list.map(item => `<option value="${item}">${item}</option>`).join('');

            // Only update if content changed or if it was empty to avoid flicker/lose focus
            if (el.innerHTML !== newListHtml) {
                el.innerHTML = newListHtml;
                el.value = currentVal;
                // If currentVal no longer exists, it will fall back to "all" automatically by browser or we handle it
                if (el.value !== currentVal) el.value = 'all';
            }
        };

        // 1. Events List (filtered by Athlete, Gender, Year, AgeGroup)
        const eventsList = [...new Set(baseRecords.filter(r => matches(r, { event: true })).map(r => r.event))].filter(e => e).sort();
        updateSelect('wmaReportFilterEvent', eventsList, selEvent);

        // 2. Athletes List (filtered by Event, Gender, Year, AgeGroup)
        const athletesList = [...new Set(baseRecords.filter(r => matches(r, { athlete: true })).map(r => r.athlete))].filter(a => a).sort();
        updateSelect('wmaReportFilterAthlete', athletesList, selAthlete);

        // 3. Years List (filtered by Event, Athlete, Gender, AgeGroup)
        const yearsList = [...new Set(baseRecords.filter(r => matches(r, { year: true })).map(r => r.date ? new Date(r.date).getFullYear() : null).filter(y => y))].sort((a, b) => b - a);
        updateSelect('wmaReportFilterYear', yearsList, selYear);

        // 4. Age Groups (filtered by Event, Athlete, Gender, Year)
        // We can either keep a static list or dynamically find which age groups have records
        const allPossibleGroups = ["M35", "M40", "M45", "M50", "M55", "M60", "M65", "M70", "M75", "M80", "M85", "M90",
            "W35", "W40", "W45", "W50", "W55", "W60", "W65", "W70", "W75", "W80", "W85", "W90",
            "X35", "X40", "X45", "X50", "X55", "X60", "X65", "X70", "X75", "X80", "X85", "X90"];
        const relevantGroups = allPossibleGroups.filter(g_loop => {
            return baseRecords.some(r => {
                if (!matches(r, { ageGroup: true })) return false;
                const athleteObj = athletes.find(a => `${a.lastName}, ${a.firstName}` === r.athlete);
                let ageAtEvent = 0;
                if (athleteObj && athleteObj.dob && r.date) {
                    ageAtEvent = Math.floor((new Date(r.date) - new Date(athleteObj.dob)) / (1000 * 60 * 60 * 24 * 365.25));
                } else if (r.ageGroup) {
                    ageAtEvent = parseInt(r.ageGroup);
                } else {
                    return false;
                }
                const floorAge = Math.floor(ageAtEvent / 5) * 5;
                const gNorm = normalizeGenderLookups(r.gender);
                const prefix = gNorm === 'men' ? 'M' : (gNorm === 'women' ? 'W' : 'X');
                return `${prefix}${floorAge}` === g_loop;
            });
        });
        updateSelect('wmaReportFilterAgeGroup', relevantGroups, selAgeGroup);
    }

    // --- WMA / IAAF Calculation Helpers ---

    // --- WMA / IAAF Calculation Helpers (Rule-Based) ---

    function getEventRule(eventName) {
        if (!window.EVENT_RULES || !eventName) return null;
        // Normalize search: some events in tracks might have extra spaces or different Greek forms
        const normalizedSearch = eventName.trim().replace(/\u03bc/g, 'm'); // μ -> m
        return window.EVENT_RULES.find(r => {
            const ruleEvent = r.Event.trim().replace(/\u03bc/g, 'm');
            return ruleEvent === normalizedSearch;
        });
    }

    function formatTimeMark(markStr, eventName) {
        return markStr;
    }

    function calculateRateConv(markStr, eventName) {
        if (!markStr) return 0;
        let s = markStr.toString().trim().replace(/,/g, '.');

        // 1. Resolve rule (Prioritize Event Formula > Static Rules)
        const ev = events.find(e => e.name === eventName);
        let ruleHowto = 'Meters';
        let ruleText = '';

        if (ev && ev.formula && ev.formula.trim() !== '') {
            const f = ev.formula;
            ruleHowto = f.match(/HOWTO:\s*([^;]+)/)?.[1]?.trim() || 'Meters';
            ruleText = f.match(/Rule:\s*(.+)$/)?.[1]?.trim() || '';
            if (!ruleText) ruleText = f.match(/Rule:\s*([^;]+)/)?.[1]?.trim() || '';
        } else {
            const r = getEventRule(eventName);
            if (r) {
                ruleHowto = r.HOWTO || 'Meters';
                ruleText = r.Rule || (r.RULE1 || '') + (r.RULE2 || '');
            }
        }

        if (ruleHowto === 'Points' || ruleHowto === 'Meters') {
            return parseFloat(s) || 0;
        }

        if (ruleHowto === 'Time') {
            const dots = (s.match(/\./g) || []).length;
            const colons = (s.match(/:/g) || []).length;
            const totalSeparators = dots + colons;

            let finalFormat = ruleText;

            // Handle conditional "IF ... THE FORMAT IS ... ELSE FORMAT IS ..."
            if (ruleText.toUpperCase().includes('IF')) {
                // Support DOTS, COLONS, or SEPARATORS
                const match = ruleText.match(/ARE\s+(\d+)\s+(DOTS?|COLONS?|SEPARATORS?)\s+THE\s+FORMAT\s+IS\s+([^;]+)\s+ELSE\s+(?:IT\s+)?FORMAT\s+IS\s+([^;]+)/i);
                if (match) {
                    const reqCount = parseInt(match[1]);
                    const unitType = match[2].toUpperCase();
                    const formatIf = match[3].trim();
                    const formatElse = match[4].trim();

                    let actualCount = 0;
                    if (unitType.startsWith('DOT')) {
                        actualCount = dots;
                    } else if (unitType.startsWith('COLON')) {
                        actualCount = colons;
                    } else {
                        actualCount = totalSeparators;
                    }

                    finalFormat = (actualCount === reqCount) ? formatIf : formatElse;
                }
            } else if (ruleText.toUpperCase().includes('FORMAT IS')) {
                const match = ruleText.match(/FORMAT\s+IS\s+([^;]+)/i);
                if (match) finalFormat = match[1].trim();
            }

            const parts = s.split(/[:.]/);
            const lowerF = finalFormat.toLowerCase();

            if (lowerF.includes('hours')) {
                let h = 0, m = 0, sec = 0, ms = 0;
                if (parts.length >= 4) {
                    h = parseFloat(parts[0]) || 0;
                    m = parseFloat(parts[1]) || 0;
                    sec = parseFloat(parts[2]) || 0;
                    ms = parseFloat(parts[3]) || 0;
                } else if (parts.length === 3) {
                    h = parseFloat(parts[0]) || 0;
                    m = parseFloat(parts[1]) || 0;
                    sec = parseFloat(parts[2]) || 0;
                } else if (parts.length === 2) {
                    h = parseFloat(parts[0]) || 0;
                    m = parseFloat(parts[1]) || 0;
                } else {
                    h = parseFloat(parts[0]) || 0;
                }
                return (h * 3600) + (m * 60) + sec + (ms / 100);
            } else if (lowerF.includes('minutes')) {
                let m = 0, sec = 0, ms = 0;
                if (parts.length >= 3) {
                    m = parseFloat(parts[0]) || 0;
                    sec = parseFloat(parts[1]) || 0;
                    ms = parseFloat(parts[2]) || 0;
                } else if (parts.length === 2) {
                    m = parseFloat(parts[0]) || 0;
                    sec = parseFloat(parts[1]) || 0;
                } else {
                    m = parseFloat(parts[0]) || 0;
                }
                return (m * 60) + sec + (ms / 100);
            } else if (lowerF.includes('seconds')) {
                let sec = 0, ms = 0;
                if (parts.length >= 2) {
                    sec = parseFloat(parts[0]) || 0;
                    ms = parseFloat(parts[1]) || 0;
                } else {
                    sec = parseFloat(parts[0]) || 0;
                }
                return sec + (ms / 100);
            }
            return parseFloat(s) || 0;
        }
        return parseFloat(s) || 0;
    }

    function parseMarkByRule(markStr, eventName) {
        return calculateRateConv(markStr, eventName);
    }
    function normalizeGenderLookups(gender) {
        if (!gender) return 'men';
        const g = gender.toLowerCase();
        if (g === 'male' || g === 'man' || g === 'men' || g === 'm') return 'men';
        if (g === 'female' || g === 'woman' || g === 'women' || g === 'w' || g === 'f') return 'women';
        if (g === 'mixed' || g === 'x') return 'mixed';
        return 'men';
    }

    function getWMAFactorVal(gender, age, wmaEventName) {
        if (!wmaLookupMap || !wmaEventName) return null;
        const g = normalizeGenderLookups(gender);
        const targetAge = parseInt(age);
        if (isNaN(targetAge)) return null;

        const eventGroup = wmaLookupMap[wmaEventName];
        if (!eventGroup || !eventGroup[g]) return null;

        return eventGroup[g][targetAge] || null;
    }

    function getIAAFPointsVal(gender, iaafEventName, markVal) {
        if (!iaafLookupMap || !iaafEventName) return null;
        const g = normalizeGenderLookups(gender);

        const eventGroup = iaafLookupMap[iaafEventName];
        if (!eventGroup || !eventGroup[g]) return null;

        const records = eventGroup[g];
        if (records.length === 0) return null;

        // Use pre-sorted records (already sorted in rebuildPerformanceIndexes)
        const isTime = records[0].points > records[records.length - 1].points;

        let match = null;
        if (isTime) {
            match = records.find(r => r.mark >= markVal - 0.0001);
        } else {
            for (let i = records.length - 1; i >= 0; i--) {
                if (records[i].mark <= markVal + 0.0001) {
                    match = records[i];
                    break;
                }
            }
        }
        return match ? match.points : null;
    }

    function calculateRecordWMAStats(r) {
        const rawMark = calculateRateConv(r.mark, r.event);
        if (!rawMark) return r;

        r.wmaRate = rawMark.toFixed(2);

        // Find linked event definition
        const eventDef = events.find(e => e.name === r.event);

        // Calculate age at event
        let ageAtEvent = 0;
        const athlete = athleteLookupMap[r.athlete];
        if (athlete && athlete.dob && r.date) {
            const eventDate = new Date(r.date);
            const dob = new Date(athlete.dob);
            const diffTime = eventDate - dob;
            ageAtEvent = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
        } else if (r.ageGroup) {
            ageAtEvent = parseInt(r.ageGroup);
        }

        if (eventDef && eventDef.wmaEvent) {
            const factor = getWMAFactorVal(r.gender, ageAtEvent, eventDef.wmaEvent);
            if (factor) {
                const calculatedAgeMark = rawMark * factor;
                r.wmaAgeMark = calculatedAgeMark.toFixed(2);
                if (eventDef.iaafEvent) {
                    const points = getIAAFPointsVal(r.gender, eventDef.iaafEvent, calculatedAgeMark);
                    r.wmaPoints = points !== null ? points.toString() : 'Not Found';
                }
            }
        } else if (eventDef && eventDef.iaafEvent) {
            const points = getIAAFPointsVal(r.gender, eventDef.iaafEvent, rawMark);
            r.wmaPoints = points !== null ? points.toString() : 'Not Found';
        }
        return r;
    }

    window.renderWMAReport = function () {
        populateWMAReportFilters(); // Refresh dropdown options based on current selections
        const tbody = document.getElementById('wmaReportBody');
        tbody.innerHTML = '';

        // Filter and Sort Records
        const fEvent = document.getElementById('wmaReportFilterEvent')?.value || 'all';
        const fAthlete = document.getElementById('wmaReportFilterAthlete')?.value || 'all';
        const fGender = document.getElementById('wmaReportFilterGender')?.value || 'all';
        const fAgeGroup = document.getElementById('wmaReportFilterAgeGroup')?.value || 'all';
        const fYear = document.getElementById('wmaReportFilterYear')?.value || 'all';

        const archivedIds = new Set(history.map(h => h.originalId).filter(id => id));

        let filtered = records.filter(r => {
            // ARCHIVE PROTECTION
            if (archivedIds.has(r.id)) return false;

            // STRICT APPROVAL: Only include approved records in statistics
            if (r.approved !== true) return false;
            if (!r.athlete || !r.mark || r.athlete.trim() === '' || r.mark.trim() === '') return false;

            if (fEvent !== 'all' && r.event !== fEvent) return false;
            if (fAthlete !== 'all' && r.athlete !== fAthlete) return false;

            if (fGender !== 'all') {
                const g = normalizeGenderLookups(r.gender);
                if (fGender === 'Male' && g !== 'men') return false;
                if (fGender === 'Female' && g !== 'women') return false;
                if (fGender === 'Mixed' && g !== 'mixed') return false;
            }

            if (fYear !== 'all') {
                const y = r.date ? new Date(r.date).getFullYear().toString() : '';
                if (y !== fYear) return false;
            }

            if (fAgeGroup !== 'all') {
                const athleteObj = athletes.find(a => `${a.lastName}, ${a.firstName}` === r.athlete);
                let ageAtEvent = 0;
                if (athleteObj && athleteObj.dob && r.date) {
                    ageAtEvent = Math.floor((new Date(r.date) - new Date(athleteObj.dob)) / (1000 * 60 * 60 * 24 * 365.25));
                } else if (r.ageGroup) {
                    ageAtEvent = parseInt(r.ageGroup);
                } else {
                    return false;
                }
                const floorAge = Math.floor(ageAtEvent / 5) * 5;
                const g = normalizeGenderLookups(r.gender);
                const prefix = g === 'men' ? 'M' : (g === 'women' ? 'W' : 'X');
                if (`${prefix}${floorAge}` !== fAgeGroup) return false;
            }

            // --- Exclude Relays from WMA Statistics ---
            const ev = events.find(e => e.name === r.event);
            const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));
            if (isRelay) return false;

            // --- Approval Logic: Exclude Unapproved Records from WMA Stats ---
            if (r.approved === false) return false;

            return true;
        });

        // Pre-calculate stats for all filtered records so sorting works on calculated fields
        let sortedRecords = filtered.map(r => calculateRecordWMAStats({ ...r }));

        sortedRecords.sort((a, b) => {
            let valA, valB;

            const getNumeric = (val) => {
                const n = parseFloat(val);
                return isNaN(n) ? -1 : n;
            };

            switch (wmaSortField) {
                case 'athlete':
                    valA = a.athlete || '';
                    valB = b.athlete || '';
                    break;
                case 'age':
                    const getAge = (r) => {
                        const ath = athletes.find(at => `${at.lastName}, ${at.firstName}` === r.athlete);
                        if (ath && ath.dob && r.date) {
                            return Math.floor((new Date(r.date) - new Date(ath.dob)) / (1000 * 60 * 60 * 24 * 365.25));
                        }
                        return parseInt(r.ageGroup) || 0;
                    };
                    valA = getAge(a);
                    valB = getAge(b);
                    break;
                case 'mark':
                    valA = calculateRateConv(a.mark, a.event);
                    valB = calculateRateConv(b.mark, b.event);
                    break;
                case 'rateConv':
                    valA = getNumeric(a.wmaRate);
                    valB = getNumeric(b.wmaRate);
                    break;
                case 'ageMark':
                    valA = getNumeric(a.wmaAgeMark);
                    valB = getNumeric(b.wmaAgeMark);
                    break;
                case 'pts':
                    valA = getNumeric(a.wmaPoints);
                    valB = getNumeric(b.wmaPoints);
                    break;
                case 'date':
                    valA = a.date ? new Date(a.date).getTime() : 0;
                    valB = b.date ? new Date(b.date).getTime() : 0;
                    break;
                default:
                    valA = a[wmaSortField] || '';
                    valB = b[wmaSortField] || '';
            }

            if (valA < valB) return wmaSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return wmaSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        if (sortedRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;">No records found.</td></tr>';
            return;
        }

        sortedRecords.forEach(r => {
            const athleteName = r.athlete || 'Unknown';
            const gender = r.gender || '-';

            // Find linked event definition
            const eventDef = events.find(e => e.name === r.event);

            // Calculate age at event
            let ageAtEvent = 0;
            const athlete = athletes.find(a => `${a.lastName}, ${a.firstName}` === r.athlete);
            if (athlete && athlete.dob && r.date) {
                const eventDate = new Date(r.date);
                const dob = new Date(athlete.dob);
                const diffTime = eventDate - dob;
                ageAtEvent = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
            } else if (r.ageGroup) {
                ageAtEvent = parseInt(r.ageGroup);
            }

            // --- Use Cached or Calculate On-the-fly ---
            let rateConv = r.wmaRate;
            let ageMark = r.wmaAgeMark;
            let pts = r.wmaPoints;

            if (rateConv === undefined || ageMark === undefined || pts === undefined) {
                const rawMark = calculateRateConv(r.mark, r.event);
                if (rawMark) {
                    rateConv = rawMark.toFixed(2);
                    if (eventDef && eventDef.wmaEvent) {
                        const factor = getWMAFactorVal(gender, ageAtEvent, eventDef.wmaEvent);
                        if (factor) {
                            const calculatedAgeMark = rawMark * factor;
                            ageMark = calculatedAgeMark.toFixed(2);
                            if (eventDef.iaafEvent) {
                                const points = getIAAFPointsVal(gender, eventDef.iaafEvent, calculatedAgeMark);
                                pts = points !== null ? points : 'Not Found';
                            }
                        }
                    } else if (eventDef && eventDef.iaafEvent) {
                        const points = getIAAFPointsVal(gender, eventDef.iaafEvent, rawMark);
                        pts = points !== null ? points : 'Not Found';
                    }
                }
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${r.event}</td>
                <td>${athleteName}</td>
                <td>${gender}</td>
                <td>${ageAtEvent > 0 ? ageAtEvent : '-'}</td>
                <td style="text-align:center;">${formatTimeMark(r.mark, r.event)}</td>
                <td>${r.idr || '-'}</td>
                <td>${rateConv || '-'}</td>
                <td>${ageMark || '-'}</td>
                <td>${pts || '-'}</td>
                <td>${r.date}</td>
                <td>${r.raceName || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async function recalculateAllWMAStats() {
        if (!isAdmin) {
            alert('You must be logged in as an administrator to recalculate and save statistics.');
            return;
        }

        if (!confirm('This will recalculate WMA Statistics for all records and save them to the database. This may take a few moments. Continue?')) return;

        const modal = document.getElementById('recalcModal');
        const progressBar = document.getElementById('recalcProgressBar');
        const statusText = document.getElementById('recalcStatus');
        const progressText = document.getElementById('recalcProgressText');

        if (modal) {
            modal.classList.remove('hidden');
            if (progressBar) progressBar.style.width = '0%';
            if (statusText) statusText.textContent = 'Calculating...';
            if (progressText) progressText.textContent = `0 / ${records.length} records`;
        }

        console.log("Starting global WMA recalculation...");
        let count = 0;
        const total = (records || []).length;

        // Process in batches to keep UI responsive
        const batchSize = 50;
        for (let i = 0; i < total; i++) {
            calculateRecordWMAStats(records[i]);
            count++;

            if (count % batchSize === 0 || count === total) {
                const percent = Math.round((count / total) * 100);
                if (progressBar) progressBar.style.width = percent + '%';
                if (progressText) progressText.textContent = `${count} / ${total} records`;
                // Brief pause to allow browser to render the update
                await new Promise(r => setTimeout(r, 10));
            }
        }

        // Phase 2: Saving
        if (statusText) statusText.textContent = 'Saving to Database...';
        localStorage.setItem('tf_records', JSON.stringify(records));

        if (db) {
            try {
                await db.ref('records').set(records);
                if (statusText) statusText.textContent = 'Success!';
                setTimeout(() => {
                    if (modal) modal.classList.add('hidden');
                    alert(`Successfully recalculated and saved WMA stats for ${count} records.`);
                    renderWMAReport();
                }, 800);
            } catch (err) {
                console.error("Firebase save failed:", err);
                if (modal) modal.classList.add('hidden');
                alert('Recalculation complete locally, but failed to sync with cloud. Check console for details.');
            }
        } else {
            if (statusText) statusText.textContent = 'Success (Local)!';
            setTimeout(() => {
                if (modal) modal.classList.add('hidden');
                alert(`Recalculated stats for ${count} records locally.`);
                renderWMAReport();
            }, 800);
        }
    }

    window.sortWMAReport = function (field) {
        if (wmaSortField === field) {
            wmaSortOrder = wmaSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            wmaSortField = field;
            wmaSortOrder = 'asc'; // Default new sort to ascending
            // Exception for Date and Mark -> Default Descending usually better?
            if (field === 'date' || field === 'mark' || field === 'pts' || field === 'rateConv' || field === 'ageMark') {
                wmaSortOrder = 'desc';
            }
        }
        renderWMAReport();
    };
    function cleanupDuplicateAthletes() {
        const groups = {};

        // Group by normalized name (accent-insensitive)
        athletes.forEach(a => {
            const f = normalizeName(a.firstName);
            const l = normalizeName(a.lastName);

            // Still sorting to be order-agnostic, but using normalized versions
            const key = [f, l].sort().join('|');
            if (!key || key === '|') return; // Skip invalid entries

            if (!groups[key]) groups[key] = [];
            groups[key].push(a);
        });

        let removedCount = 0;
        const newAthletes = [];

        Object.values(groups).forEach(group => {
            if (group.length === 1) {
                newAthletes.push(group[0]);
            } else {
                // Duplicates found: Pick BEST candidate
                // Score: Has DOB (10) > Has Gender (2) > Has IDNumber (1)
                group.sort((a, b) => {
                    const scoreA = (a.dob && a.dob.trim() !== "" ? 10 : 0) +
                        (a.gender ? 2 : 0) +
                        (a.idNumber ? 1 : 0);
                    const scoreB = (b.dob && b.dob.trim() !== "" ? 10 : 0) +
                        (b.gender ? 2 : 0) +
                        (b.idNumber ? 1 : 0);
                    return scoreB - scoreA;
                });

                newAthletes.push(group[0]);
                removedCount += (group.length - 1);
            }
        });

        if (removedCount > 0) {
            athletes = newAthletes;
            saveAthletes();
            console.log(`Cleaned up ${removedCount} duplicate athletes.`);
            alert(`System Maintenance: Removed ${removedCount} duplicate athlete profiles.`);
        }
    }


    function migrateAgeGroupsToStartAge() {
        let changed = false;
        records.forEach(r => {
            if (r.ageGroup && r.ageGroup.includes('-')) {
                r.ageGroup = r.ageGroup.split('-')[0];
                changed = true;
            }
        });
        history.forEach(h => {
            if (h.ageGroup && h.ageGroup.includes('-')) {
                h.ageGroup = h.ageGroup.split('-')[0];
                changed = true;
            }
        });
        if (changed) {
            saveRecords();
            localStorage.setItem('tf_history', JSON.stringify(history));
            console.log("Migrated Age Groups to Start Age format.");
        }
    }

    // --- Athlete CRUD ---
    function handleAthleteSubmit(e) {
        e.preventDefault();
        const first = newAthleteFirstName.value.trim();
        const last = newAthleteLastName.value.trim();
        const idNum = newAthleteID.value.trim();

        if (!first || !last) return;

        if (editingAthleteId) {
            const idx = athletes.findIndex(a => a.id == editingAthleteId);
            if (idx !== -1) {
                const oldNameLF = `${athletes[idx].lastName}, ${athletes[idx].firstName}`;

                athletes[idx].idNumber = idNum;
                athletes[idx].firstName = first;
                athletes[idx].lastName = last;
                athletes[idx].dob = newAthleteDOB.value;
                athletes[idx].gender = newAthleteGender.value;

                const newNameLF = `${last}, ${first}`;

                // Propagate Name Update
                records.forEach(r => {
                    if (r.athlete === oldNameLF) r.athlete = newNameLF;
                    else if (r.athlete === `${athletes[idx].firstName} ${athletes[idx].lastName}`) r.athlete = newNameLF;
                });
            }

            editingAthleteId = null;
            athleteSubmitBtn.innerHTML = '<span>+ Save Athlete</span>';
            athleteSubmitBtn.style.background = '';
        } else {
            const exists = athletes.some(a =>
                (a.firstName.toLowerCase() === first.toLowerCase() &&
                    a.lastName.toLowerCase() === last.toLowerCase()) ||
                (idNum && a.idNumber === idNum)
            );

            if (exists) return alert('Athlete already exists (Name or ID match)!');

            athletes.push({
                id: Date.now(),
                idNumber: idNum,
                firstName: first,
                lastName: last,
                dob: newAthleteDOB.value,
                gender: newAthleteGender.value
            });
        }

        saveAthletes();
        saveRecords();
        populateAthleteDropdown();
        renderAthleteList();
        renderReports();

        newAthleteID.value = '';
        newAthleteFirstName.value = '';
        newAthleteLastName.value = '';
        newAthleteLastName.value = '';
        if (dobPicker) dobPicker.clear();
        else newAthleteDOB.value = '';
        newAthleteGender.value = '';
        newAthleteFirstName.focus();
    }

    function editAthlete(id) {
        console.log('editAthlete called with:', id);
        const athlete = athletes.find(a => a.id == id);
        console.log('Found athlete:', athlete);
        if (!athlete) return;

        newAthleteID.value = athlete.idNumber || '';
        newAthleteFirstName.value = athlete.firstName;
        newAthleteLastName.value = athlete.lastName;

        if (dobPicker) dobPicker.setDate(athlete.dob);
        else newAthleteDOB.value = athlete.dob;

        newAthleteGender.value = athlete.gender;

        editingAthleteId = id;
        athleteSubmitBtn.innerHTML = '<span>Update Athlete</span>';
        athleteSubmitBtn.style.background = 'linear-gradient(135deg, var(--warning), #f59e0b)';

        // Scroll to form so user sees the change
        athleteForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function deleteAthlete(id) {
        const athlete = athletes.find(a => a.id == id);
        if (!athlete) return;

        const fullNameLF = `${athlete.lastName}, ${athlete.firstName}`;
        const fullNameFL = `${athlete.firstName} ${athlete.lastName}`;

        const isUsed = records.some(r => r.athlete === fullNameLF || r.athlete === fullNameFL);
        if (isUsed) return alert(`Cannot delete ${fullNameLF} because they have records.`);

        if (!confirm(`Delete profile for ${fullNameLF}?`)) return;

        athletes = athletes.filter(a => a.id != id);
        saveAthletes();
        populateAthleteDropdown();
        renderAthleteList();

        if (editingAthleteId == id) {
            editingAthleteId = null;
            newAthleteID.value = '';
            newAthleteFirstName.value = '';
            newAthleteLastName.value = '';
            newAthleteLastName.value = '';
            if (dobPicker) dobPicker.clear();
            else newAthleteDOB.value = '';
            newAthleteGender.value = '';
            athleteSubmitBtn.innerHTML = '<span>+ Save Athlete</span>';
            athleteSubmitBtn.style.background = '';
        }
    }


    window.sortAthletes = function (field) {
        if (athleteSortField === field) {
            athleteSortOrder = athleteSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            athleteSortField = field;
            athleteSortOrder = 'asc';
        }
        renderAthleteList();
    };

    function renderAthleteList() {
        if (!athleteListBody) return;
        athleteListBody.innerHTML = '';

        try {
            // Sorting Logic
            if (athletes && athletes.length > 0) {
                athletes.sort((a, b) => {
                    if (!a || !b) return 0;
                    let valA = (a[athleteSortField] || '').toString().toLowerCase();
                    let valB = (b[athleteSortField] || '').toString().toLowerCase();

                    if (athleteSortField === 'dob') {
                        valA = a.dob ? new Date(a.dob).getTime() : 0;
                        valB = b.dob ? new Date(b.dob).getTime() : 0;
                    }

                    if (valA < valB) return athleteSortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return athleteSortOrder === 'asc' ? 1 : -1;
                    return 0;
                });

                athletes.forEach(a => {
                    if (!a) return;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${a.idNumber || '-'}</td>
                        <td style="font-weight:600;">${a.lastName}</td>
                        <td>${a.firstName}</td>
                        <td>${a.dob ? new Date(a.dob).toLocaleDateString('en-GB') : '-'}</td>
                        <td>${a.gender || '-'}</td>
                        <td>
                            <button class="btn-icon edit edit-athlete-btn" data-id="${a.id}" title="Edit">✏️</button>
                            <button class="btn-icon delete delete-athlete-btn" data-id="${a.id}" title="Delete">🗑️</button>
                        </td>
                    `;
                    athleteListBody.appendChild(tr);
                });
            } else {
                athleteListBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No athletes found.</td></tr>';
            }
        } catch (e) {
            console.error("Error rendering athlete list:", e);
            athleteListBody.innerHTML = `<tr><td colspan="6" style="color:red;">Error loading athletes: ${e.message}</td></tr>`;
        }
    }

    function saveAthletes() {
        if (!isDataReady) {
            console.warn("Save aborted: System not ready (Synchronization in progress).");
            return;
        }
        if (db) db.ref('athletes').set(athletes);
        localStorage.setItem('tf_athletes', JSON.stringify(athletes));
        rebuildPerformanceIndexes();
    }


    // --- User Manager ---
    function handleUserSubmit(e) {
        e.preventDefault();
        console.log("🚀 handleUserSubmit called");

        if (!currentUser || !isSupervisor(currentUser.email)) {
            alert("Unauthorized: Only the Supervisor can manage users.");
            return;
        }

        const id = editingUserIdInput.value || Date.now().toString();
        const name = newUserName.value.trim();
        const role = newUserRole.value;
        const email = newUserEmail.value.trim();

        if (!name || !email) return alert("All fields are required.");

        const existingIdx = appUsers.findIndex(u => u.id === id);
        const userObj = { id, name, role, email };

        if (existingIdx !== -1) {
            appUsers[existingIdx] = userObj;
        } else {
            appUsers.push(userObj);
        }

        saveUsers();
        userForm.reset();
        editingUserIdInput.value = '';
        userSubmitBtn.textContent = 'Add';
    }

    function editUser(id) {
        if (!currentUser || !isSupervisor(currentUser.email)) {
            alert("Unauthorized: Only the Supervisor can manage users.");
            return;
        }
        const user = appUsers.find(u => u.id === id);

        editingUserIdInput.value = user.id;
        newUserName.value = user.name;
        newUserRole.value = user.role;
        newUserEmail.value = user.email;
        userSubmitBtn.textContent = 'Update';
        // Scroll to form
        userForm.scrollIntoView({ behavior: 'smooth' });
    }

    function deleteUser(id) {
        if (!isSupervisor(currentUser ? currentUser.email : null)) {
            alert("Only Supervisors can delete users.");
            return;
        }
        if (!confirm('Are you sure you want to delete this user?')) return;
        appUsers = appUsers.filter(u => u.id !== id);
        saveUsers();
    }

    function renderUserList() {
        if (!userListBody) {
            console.error("❌ userListBody element not found in DOM");
            return;
        }

        // Defensive: Ensure appUsers is an array
        let displayUsers = appUsers;
        if (appUsers && typeof appUsers === 'object' && !Array.isArray(appUsers)) {
            console.warn("⚠️ appUsers is an object, converting to array for rendering");
            displayUsers = Object.values(appUsers);
        }

        if (!Array.isArray(displayUsers)) {
            console.error("❌ displayUsers is not an array:", displayUsers);
            userListBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Critical Data Error: User list format invalid</td></tr>';
            return;
        }

        userListBody.innerHTML = '';

        if (displayUsers.length === 0) {
            userListBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding: 2rem;">No users found. Use the form above to add an administrator or supervisor.</td></tr>';
            return;
        }

        const isSuper = currentUser && isSupervisor(currentUser.email);

        displayUsers.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.name || 'N/A'}</td>
                <td><span class="badge" style="background:var(--primary); color:white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${u.role || 'User'}</span></td>
                <td>${u.email || 'N/A'}</td>
                <td style="text-align:center;">
                    ${isSuper ? `
                    <div style="display:flex; gap:0.5rem; justify-content:center;">
                        <button class="edit-user-btn btn-text" data-id="${u.id}" title="Edit">✏️</button>
                        <button class="delete-user-btn btn-text" data-id="${u.id}" title="Delete">🗑️</button>
                    </div>
                    ` : '<span style="color:var(--text-muted); font-size: 0.8rem;">Read Only</span>'}
                </td>
            `;
            userListBody.appendChild(tr);
        });

        // Hide form if not supervisor
        if (userForm) {
            if (isSuper) userForm.classList.remove('hidden');
            else userForm.classList.add('hidden');
        }
        console.log(`✅ Rendered ${displayUsers.length} users in table.`);
    }

    function saveUsers() {
        if (!isDataReady) return;
        console.log("💾 saveUsers: saving to Firebase and LocalStorage...", appUsers);
        if (db) db.ref('users').set(appUsers);
        localStorage.setItem('tf_users', JSON.stringify(appUsers));
        renderUserList();
    }


    // --- Enhanced Events ---
    function handleEventSubmit(e) {
        e.preventDefault();
        const name = newEventName.value.trim();
        const specs = newEventSpecs.value.trim();
        const iaafEvent = newEventIAAF.value;  // Selected IAAF event (or empty string)
        const formula = document.getElementById('newEventFormula').value.trim();
        const notes = newEventNotes.value.trim();

        // Get selected event type from radio buttons
        const eventType = document.querySelector('input[name="eventType"]:checked')?.value || 'Track';
        const isCombined = eventType === 'Combined';
        const isRelay = eventType === 'Relay';

        let subEvents = [];
        if (isCombined) {
            const inputs = subEventsContainer.querySelectorAll('.sub-event-input');
            inputs.forEach(input => {
                if (input.value) subEvents.push(input.value);
            });
        }

        if (editingEventId) {
            const idx = events.findIndex(ev => ev.id == editingEventId);
            if (idx !== -1) {
                const ev = events[idx]; // Define ev here
                const oldName = ev.name;
                if (oldName !== name && events.some(event => event.name === name)) { // Renamed ev to event to avoid conflict
                    return alert('Event Name already exists!');
                }

                ev.name = name;
                ev.specs = specs;
                ev.iaafEvent = iaafEvent;  // IAAF event link
                ev.wmaEvent = newEventWMA.value; // WMA event link
                ev.formula = formula; // Save formula
                ev.notes = notes;
                ev.type = eventType;  // Store event type
                ev.isCombined = isCombined;
                ev.isRelay = isRelay;
                ev.subEvents = subEvents;

                records.forEach(r => {
                    if (r.event === oldName) r.event = name;
                });
            }

            editingEventId = null;
            eventSubmitBtn.innerHTML = '<span>+ Add Event</span>';
            eventSubmitBtn.style.background = '';
        } else {
            // Create New
            if (events.some(ev => ev.name.toLowerCase() === name.toLowerCase())) {
                return alert('Event already exists!');
            }
            events.push({
                id: Date.now(),
                name: name,
                iaafEvent: iaafEvent,  // IAAF event link
                wmaEvent: newEventWMA.value, // WMA event link
                formula: formula, // Save formula
                specs: specs,
                notes: notes,
                type: eventType,  // Store event type
                isCombined: isCombined,
                isRelay: isRelay,
                subEvents: subEvents
            });
        }

        saveEvents();
        saveRecords();
        populateYearDropdown(); // Added this line
        populateEventDropdowns();
        renderEventList();
        renderReports();
        resetEventForm();
        newEventName.focus();
    }

    function resetEventForm() {
        if (newEventName) newEventName.value = '';
        if (newEventFormula) newEventFormula.value = '';
        if (newEventIAAF) newEventIAAF.value = '';
        if (newEventWMA) newEventWMA.value = '';
        if (newEventSpecs) newEventSpecs.value = '';
        if (newEventNotes) newEventNotes.value = '';
        if (eventTypeTrack) eventTypeTrack.checked = true;
        if (newEventSubCount) {
            newEventSubCount.value = '';
            newEventSubCount.disabled = true;
        }
        if (subEventsContainer) {
            subEventsContainer.innerHTML = '';
            subEventsContainer.style.display = 'none';
        }
        if (eventSubmitBtn) {
            eventSubmitBtn.innerHTML = '<span>+ Add Event</span>';
            eventSubmitBtn.style.background = '';
        }
        editingEventId = null;
    }

    function editEvent(id) {
        const ev = events.find(e => e.id == id);
        if (!ev) return;

        newEventName.value = ev.name;
        if (newEventIAAF) newEventIAAF.value = ev.iaafEvent || '';
        if (newEventWMA) newEventWMA.value = ev.wmaEvent || '';
        newEventSpecs.value = ev.specs || '';
        if (newEventFormula) newEventFormula.value = ev.formula || '';
        if (newEventNotes) newEventNotes.value = ev.notes || '';

        // Set the correct event type radio button
        const eventType = ev.type || (ev.isCombined ? 'Combined' : ev.isRelay ? 'Relay' : 'Track');
        document.querySelector(`input[name="eventType"][value="${eventType}"]`).checked = true;

        editingEventId = id; // Set ID early for filter logic

        if (ev.isCombined) {
            newEventSubCount.disabled = false;
            const subs = ev.subEvents || [];
            const count = subs.length;
            if (count > 0) {
                subEventsContainer.style.display = 'flex';
                const availableEvents = events.filter(e => !e.isCombined && !e.isRelay && e.id != editingEventId);
                availableEvents.sort((a, b) => a.name.localeCompare(b.name));

                subEventsContainer.innerHTML = '';
                subs.forEach((subName, i) => {
                    const div = document.createElement('div');
                    div.className = 'form-group';
                    div.style.flex = '1 1 45%';
                    div.style.minWidth = '150px';

                    const select = document.createElement('select');
                    select.className = 'sub-event-input';
                    select.required = true;
                    select.style.width = '100%';

                    const defOpt = document.createElement('option');
                    defOpt.value = "";
                    defOpt.disabled = true;
                    defOpt.textContent = "Select Event";
                    if (!subName) defOpt.selected = true;
                    select.appendChild(defOpt);

                    availableEvents.forEach(ae => {
                        const opt = document.createElement('option');
                        opt.value = ae.name;
                        opt.textContent = ae.name;
                        if (ae.name === subName) opt.selected = true;
                        select.appendChild(opt);
                    });

                    div.innerHTML = `<label style="font-size:0.75rem;">Event ${i + 1}</label>`;
                    div.appendChild(select);
                    subEventsContainer.appendChild(div);
                });
            }
        } else {
            newEventSubCount.disabled = true;
            newEventSubCount.value = '';
            subEventsContainer.innerHTML = '';
            subEventsContainer.style.display = 'none';
        }

        editingEventId = id;
        newEventName.focus();
        eventSubmitBtn.innerHTML = '<span>Update Event</span>';
        eventSubmitBtn.style.background = 'linear-gradient(135deg, var(--warning), #f59e0b)';
    }

    // Modal Logic Initialization
    function initFormulaModal() {
        const openFormulaBtn = document.getElementById('openFormulaBtn');
        const saveFormulaBtn = document.getElementById('saveFormulaBtn');
        const cancelFormulaBtn = document.getElementById('cancelFormulaBtn');
        const formulaModal = document.getElementById('formulaModal');
        const modalFormulaInput = document.getElementById('modalFormulaInput');
        const newEventFormula = document.getElementById('newEventFormula');

        if (openFormulaBtn && formulaModal && modalFormulaInput && newEventFormula) {
            openFormulaBtn.addEventListener('click', () => {
                modalFormulaInput.value = newEventFormula.value;
                formulaModal.classList.remove('hidden');
            });
        }

        if (saveFormulaBtn && formulaModal && modalFormulaInput && newEventFormula) {
            saveFormulaBtn.addEventListener('click', () => {
                newEventFormula.value = modalFormulaInput.value;
                formulaModal.classList.add('hidden');
            });
        }

        if (cancelFormulaBtn && formulaModal) {
            cancelFormulaBtn.addEventListener('click', () => {
                formulaModal.classList.add('hidden');
            });
        }
    }
    initFormulaModal();

    function deleteEvent(id) {
        const ev = events.find(e => e.id == id);
        if (!ev) return;

        const isUsed = records.some(r => r.event === ev.name);
        if (isUsed) return alert(`Cannot delete "${ev.name}" because it has associated records.`);

        if (!confirm(`Delete event "${ev.name}"?`)) return;

        events = events.filter(e => e.id != id);
        saveEvents();
        populateEventDropdowns();
        renderEventList();

        if (editingEventId == id) {
            resetEventForm();
        }
    }

    function saveCountries() {
        if (!isDataReady) return;
        if (db) db.ref('countries').set(countries);
        localStorage.setItem('tf_countries', JSON.stringify(countries));
    }

    function populateCountryDropdown() {
        if (!countryInput) return;
        let html = '<option value="" disabled>Select Country</option>';
        // Sort safely
        const safeCountries = Array.isArray(countries) ? countries : [];
        safeCountries.sort((a, b) => a.localeCompare(b)).forEach(c => {
            const isSelected = c === 'Ελλάδα' ? 'selected' : '';
            html += `<option value="${c}" ${isSelected}>${c}</option>`;
        });
        countryInput.innerHTML = html;
    }

    function handleCountrySubmit(e) {
        e.preventDefault();
        const name = newCountryName.value.trim();
        if (!name) return;

        if (countries.some(c => c.toLowerCase() === name.toLowerCase())) {
            return alert('Country already exists!');
        }

        countries.push(name);
        countries.sort();
        saveCountries();
        renderCountryList();
        populateCountryDropdown();
        newCountryName.value = '';
    }

    function deleteCountry(name) {
        if (!confirm(`Delete ${name}?`)) return;
        countries = countries.filter(c => c !== name);
        saveCountries();
        renderCountryList();
        populateCountryDropdown();
    }

    function renderCountryList() {
        if (!countryListBody) return;
        countryListBody.innerHTML = '';
        const safeCountries = Array.isArray(countries) ? countries : [];
        safeCountries.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${c}</td>
                <td style="text-align:right;">
                    <button class="btn-icon delete delete-country-btn" data-country="${c}" title="Delete">🗑️</button>
                </td>
            `;
            countryListBody.appendChild(tr);
        });
    }

    function renderEventList() {
        if (!eventListBody) return;
        eventListBody.innerHTML = '';
        // Sort by Name
        events.sort((a, b) => a.name.localeCompare(b.name));

        events.forEach(ev => {
            const isUsed = records.some(r => r.event === ev.name);
            const tr = document.createElement('tr');

            // Determine event type and create badge
            const eventType = ev.type || (ev.isCombined ? 'Combined' : ev.isRelay ? 'Relay' : 'Track');
            let typeBadge = '';

            switch (eventType) {
                case 'Field':
                    typeBadge = '<span style="background:#10b981; color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">Field</span>';
                    break;
                case 'Track':
                    typeBadge = '<span style="background:#3b82f6; color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">Track</span>';
                    break;
                case 'Road':
                    typeBadge = '<span style="background:#f59e0b; color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">Road</span>';
                    break;
                case 'Combined':
                    const count = ev.subEvents ? ev.subEvents.length : 0;
                    typeBadge = `<span style="background:var(--accent); color:black; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">Combined (${count})</span>`;
                    break;
                case 'Relay':
                    typeBadge = '<span style="background:var(--primary); color:white; padding:3px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">Relay</span>';
                    break;
            }


            tr.innerHTML = `
                <td style="font-weight:600;">${ev.name}</td>
                <td style="font-size:0.85em; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${ev.formula || ''}">${ev.formula || '-'}</td>
                <td style="font-size:0.9rem; color:var(--text-muted); white-space:pre-wrap;">${ev.specs || '-'}</td>
                <td style="font-size:0.9rem; color:var(--text-muted); white-space:pre-wrap;">${ev.notes || '-'}</td>
            <td style="font-size:0.85rem; color:var(--accent);">${ev.iaafEvent || '-'} / ${ev.wmaEvent || '-'}</td>
            <td>${typeBadge}</td>
                <td>
                    <button class="btn-icon edit edit-event-btn" data-id="${ev.id}" title="Edit">✏️</button>
                    <button class="btn-icon delete delete-event-btn" data-id="${ev.id}" 
                        title="${isUsed ? 'In use' : 'Delete'}" ${isUsed ? 'disabled' : ''}>🗑️</button>
                </td>
            `;
            eventListBody.appendChild(tr);
        });
    }

    function saveEvents() {
        if (!isDataReady) return;
        if (db) db.ref('events').set(events);
        localStorage.setItem('tf_events', JSON.stringify(events));
    }

    // --- Records ---
    function saveHistory() {
        if (!isDataReady) return;
        if (db) db.ref('history').set(history);
        localStorage.setItem('tf_history', JSON.stringify(history));
    }

    function savePendingRecs() {
        if (!isDataReady) return;
        if (db) {
            db.ref('pendingrecs').set(pendingrecs).catch(err => {
                console.error("Firebase Save Failed (Pending):", err);
                alert("Cloud Sync Error: Your proposal was not saved. " + err.message);
            });
        }
        localStorage.setItem('tf_pendingrecs', JSON.stringify(pendingrecs));
    }

    // --- Records ---


    function handleFormSubmit(e) {
        e.preventDefault();
        try {
            const raceName = raceNameInput ? raceNameInput.value.trim() : '';
            const idr = idrInput ? idrInput.value.trim() : '';

            const ev = evtInput ? events.find(e => e.name === evtInput.value) : null;
            const isRelay = ev ? (ev.eventType === 'Relay' || ev.isRelay === true) : false;
            const selectedAthlete = isRelay ? (relayTeamNameInput ? relayTeamNameInput.value.trim() : '') : (athleteInput ? athleteInput.value : '');
            const selectedAgeGroup = ageGroupInput ? ageGroupInput.value : '';
            const selectedDate = dateInput ? dateInput.value : '';

            if (!isRelay && selectedAthlete && selectedDate) {
                const athlete = findAthleteByNormalizedName(selectedAthlete);
                console.log(`Validation: Athlete="${selectedAthlete}", Found=${!!athlete}, DoB="${athlete?.dob}", Date="${selectedDate}"`);

                if (athlete && athlete.dob) {
                    const dobYear = parseInt(athlete.dob.split('-')[0]);
                    const eventYear = parseInt(selectedDate.split('-')[0]);
                    const rawAge = eventYear - dobYear;

                    const calculatedGroup = calculateAgeGroup(athlete.dob, selectedDate);
                    const normalizedSelected = selectedAgeGroup || "";
                    const normalizedCalculated = calculatedGroup || "";
                    console.log(`Validation Check: AthleteAge=${rawAge}, Selected="${normalizedSelected}", Calculated="${normalizedCalculated}"`);

                    if (normalizedSelected !== normalizedCalculated) {
                        // if (!bypassAgeValidation) { // Removed bypassAgeValidation
                        console.log("Validation Failed: Showing warning.");
                        const warningDiv = document.getElementById('ageValidationWarning');
                        const messageP = document.getElementById('ageValidationMessage');
                        if (warningDiv && messageP) {
                            messageP.innerHTML = `
                                    <strong>Athlete Age:</strong> ${rawAge}<br>
                                    <strong>Calculated Category:</strong> ${normalizedCalculated || 'None (Under 35)'}<br>
                                    <strong>Selected Category:</strong> ${normalizedSelected || 'None'}<br>
                                    <br>
                                    The selected category does not match the athlete's age (${rawAge}).
                                `;
                            warningDiv.classList.remove('hidden');
                            warningDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return;
                        }
                        // } else {
                        //     console.log("Validation Bypassed by user.");
                        //     bypassAgeValidation = false;
                        // }
                    }
                } else if (athlete && !athlete.dob) {
                    console.warn("Athlete has no Date of Birth. Age validation cannot be performed.");
                    // if (!bypassAgeValidation) { // Removed bypassAgeValidation
                    const warningDiv = document.getElementById('ageValidationWarning');
                    const messageP = document.getElementById('ageValidationMessage');
                    if (warningDiv && messageP) {
                        messageP.innerHTML = `
                                <strong>Warning:</strong> No Date of Birth found for this athlete.<br>
                                <br>
                                Age group validation cannot be performed automatically. Please verify the category manually.
                            `;
                        warningDiv.classList.remove('hidden');
                        warningDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return;
                    }
                    // } else {
                    //     bypassAgeValidation = false;
                    // }
                }
            }

            const newRecord = {
                id: (editingId || editingHistoryId) ? (editingId || editingHistoryId) : String(Date.now() + '-' + Math.floor(Math.random() * 10000)),
                event: evtInput ? evtInput.value : '',
                gender: genderInput ? genderInput.value : '',
                ageGroup: ageGroupInput ? ageGroupInput.value : '',
                trackType: trackTypeInput ? trackTypeInput.value : 'Outdoor',
                athlete: selectedAthlete,
                isRelay: isRelay,
                // In new architecture, approved flag is largely obsolete for main records, but we keep true for Sup.
                approved: isSupervisor(currentUser ? currentUser.email : null),
                relayParticipants: isRelay ? [
                    relayAthlete1.value,
                    relayAthlete2.value,
                    relayAthlete3.value,
                    relayAthlete4.value
                ].filter(p => p !== '') : [],
                raceName: raceName,
                idr: idr,
                notes: notesInput ? notesInput.value.trim() : '',
                mark: markInput ? markInput.value : '',
                wind: windInput ? windInput.value : '',
                date: dateInput ? dateInput.value : '',
                town: townInput ? townInput.value : '',
                country: countryInput ? countryInput.value : '',
                updatedBy: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'System'
            };

            // Calculate WMA stats for new record
            calculateRecordWMAStats(newRecord);

            if (editingHistoryId) {
                // Update History Record
                const index = history.findIndex(r => r.id === editingHistoryId);
                if (index !== -1) {
                    // Keep original archive timestamp
                    newRecord.archivedAt = history[index].archivedAt;
                    history[index] = newRecord;
                    saveHistory();
                    renderHistoryList();
                }
                submitBtn.querySelector('span').textContent = 'History Updated! ✓';
                setTimeout(() => {
                    cancelEdit();
                    switchTab('history');
                }, 1000);
            } else if (editingId) {
                // Edit Live Record
                const index = records.findIndex(r => r.id === editingId);
                if (index !== -1) {
                    const originalRecord = records[index];
                    const isSup = isSupervisor(currentUser ? currentUser.email : null);

                    if (isSup) {
                        // Supervisor Direct Edit -> Archive Old
                        const oldRecordData = { ...originalRecord };
                        oldRecordData.archivedAt = new Date().toISOString();
                        oldRecordData.originalId = String(oldRecordData.id); // Link to original
                        if (!oldRecordData.updatedBy) oldRecordData.updatedBy = 'System';
                        oldRecordData.id = String(Date.now() + '-' + Math.floor(Math.random() * 10000));

                        history.unshift(oldRecordData);
                        saveHistory();

                        // Update Live Record in place
                        records[index] = newRecord;
                        saveRecords();

                        submitBtn.querySelector('span').textContent = 'Updated & Archived! ✓';
                    } else {
                        // Admin proposing an edit -> Send to Staging (pendingrecs)
                        newRecord.id = String(Date.now() + '-' + Math.floor(Math.random() * 10000)); // Generate unique staging ID
                        newRecord.replacesId = editingId; // Track which original record this targets
                        newRecord.isPending = true;

                        pendingrecs.unshift(newRecord);
                        savePendingRecs();

                        submitBtn.querySelector('span').textContent = 'Edit Proposed! ✓';
                        alert("Your edit has been submitted for Supervisor approval.");
                    }
                }
                setTimeout(() => cancelEdit(), 1000);
            } else {
                // Log New Record
                const isSup = isSupervisor(currentUser ? currentUser.email : null);
                if (isSup) {
                    records.unshift(newRecord);
                    saveRecords();
                    submitBtn.querySelector('span').textContent = 'Logged! ✓';
                } else {
                    newRecord.isPending = true;
                    pendingrecs.unshift(newRecord);
                    savePendingRecs();
                    submitBtn.querySelector('span').textContent = 'Proposed! ✓';
                    alert("Your new record has been submitted for Supervisor approval.");
                }

                setTimeout(() => submitBtn.querySelector('span').textContent = 'Log Record', 1500);
                recordForm.reset();
                if (datePicker) {
                    datePicker.setDate(new Date());
                } else if (dateInput && dateInput.type === 'date') {
                    dateInput.valueAsDate = new Date();
                } else if (dateInput) {
                    dateInput.value = new Date().toISOString().split('T')[0];
                }
            }
            populateYearDropdown();
            renderReports();
            renderAthleteList();
        } catch (error) {
            console.error("Form Submit Error:", error);
            alert("Error saving record: " + error.message);
        }
    }

    function renderHistoryList() {
        const tbody = document.getElementById('historyListBody');
        const empty = document.getElementById('historyEmptyState');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (history.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        history.forEach(r => {
            const tr = document.createElement('tr');
            // Find immediate successor (The record that replaced this one)
            // 1. Get all archived versions of this record
            const versions = history.filter(h => h.originalId === r.originalId).sort((a, b) => new Date(a.archivedAt) - new Date(b.archivedAt));
            const currentIndex = versions.findIndex(v => v.id === r.id);

            let successor = null;
            let successorLabel = '';

            if (currentIndex !== -1 && currentIndex < versions.length - 1) {
                // Formatting: Successor is the NEXT history item (intermediate version)
                successor = versions[currentIndex + 1];
                successorLabel = 'REPLACED BY (INTERMEDIATE VERSION)';
            } else {
                // Successor is the current Live record
                successor = records.find(curr => curr.id === r.originalId);
                successorLabel = 'REPLACED BY (CURRENT LIVE VERSION)';
            }

            // Note: Local Admin is considered Supervisor based on isSupervisor logic
            const isSup = isSupervisor(currentUser ? currentUser.email : null);

            tr.innerHTML = `
                <td style="text-align:center;">
                    ${successor ? `<button class="btn-icon expand-btn" data-id="${r.id}" style="font-weight:bold; color:var(--primary); cursor:pointer;">+</button>` : ''}
                </td>
                <td>${r.event}</td>
                <td style="font-weight:600;">${r.athlete}</td>
                <td>${r.gender || '-'}</td>
                <td>${r.ageGroup || '-'}</td>
                <td style="text-align:center;">${formatTimeMark(r.mark, r.event)}</td>
                <td>${r.idr || '-'}</td>
                <td>${r.wind || '-'}</td>
                <td>${new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td>${r.raceName || '-'}</td>
                <td>${r.updatedBy || 'System'}</td>
                <td style="font-size:0.85em; color:var(--text-muted);">${new Date(r.archivedAt).toLocaleString('en-GB')}</td>
                 <td class="history-actions-col" style="${isSup ? '' : 'display:none;'}">
                    <button class="btn-icon edit edit-history-btn" data-id="${r.id}" title="Edit Archived">✏️</button>
                    <button class="btn-icon delete delete-history-btn" data-id="${r.id}" title="Delete Permanent">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);

            if (successor) {
                const trDetail = document.createElement('tr');
                trDetail.className = 'detail-row hidden';
                trDetail.id = `detail-hist-${r.id}`;
                trDetail.innerHTML = `
                    <td colspan="1" style="border-top:none; background:transparent;"></td>
                    <td colspan="11" style="padding: 8px 10px; border-top:none; background: rgba(16, 185, 129, 0.1);">
                        <div style="display:flex; flex-direction:column; gap:4px;">
                            <div style="font-size:0.85em; color:var(--text-muted); margin-bottom:4px;">
                                <strong>Edited by:</strong> ${r.updatedBy || 'System'}
                            </div>
                            <div style="display:flex; gap:1rem; align-items:center;">
                                <span style="font-weight:bold; color:var(--success);">${successor.athlete}</span>
                                <span>${formatTimeMark(successor.mark, r.event)} (${successor.wind || '-'})</span>
                                <span>| ${new Date(successor.date).toLocaleDateString('en-GB')}</span>
                                <span>| ${successor.raceName || '-'}</span>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(trDetail);
            }
        });
    }

    function editHistory(id) {
        if (!isSupervisor(currentUser ? currentUser.email : null)) {
            alert("Only Supervisors can edit history.");
            return;
        }
        switchTab('log');
        // Use loose equality to handle potential string/number mismatches from DOM
        const r = history.find(item => item.id == id);
        if (!r) return;

        if (evtInput) evtInput.value = r.event;
        if (athleteInput) athleteInput.value = r.athlete;
        if (genderInput) genderInput.value = r.gender || '';
        if (ageGroupInput) ageGroupInput.value = r.ageGroup || '';
        if (raceNameInput) raceNameInput.value = r.raceName || '';
        if (notesInput) notesInput.value = r.notes || '';
        if (markInput) markInput.value = r.mark;
        if (windInput) windInput.value = r.wind || '';

        if (dateInput) {
            if (datePicker) datePicker.setDate(r.date);
            else dateInput.value = r.date;
        }

        if (townInput) townInput.value = r.town || '';
        if (countryInput) countryInput.value = r.country || '';

        editingHistoryId = id;
        editingId = null; // Ensure we are not editing a live record

        formTitle.textContent = 'Edit Archived Record';
        formTitle.style.color = 'var(--text-muted)';
        submitBtn.querySelector('span').textContent = 'Update Archive';
        submitBtn.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)'; // Purple for history
        cancelBtn.classList.remove('hidden');
        recordForm.scrollIntoView({ behavior: 'smooth' });
    }

    function deleteHistory(id) {
        if (!isSupervisor(currentUser ? currentUser.email : null)) {
            alert("Only Supervisors can delete history records.");
            return;
        }
        if (!confirm('Permanently delete this archived record?')) return;
        history = history.filter(h => h.id != id);
        saveHistory();
        renderHistoryList();
    }

    function handleMixedGenderVisibility(eventName) {
        const genderSelect = document.getElementById('gender');
        const optMixed = document.getElementById('optMixed');
        if (!genderSelect || !optMixed) return;

        // Find event definition
        const ev = events.find(e => e.name === eventName);
        const isRelay = ev ? (ev.eventType === 'Relay' || ev.isRelay === true) : false;

        if (isRelay) {
            optMixed.hidden = false;
            optMixed.disabled = false;
        } else {
            optMixed.hidden = true;
            optMixed.disabled = true;
            // Reset if Mixed was selected for non-relay
            if (genderSelect.value === 'Mixed') {
                genderSelect.value = '';
            }
        }
    }

    function toggleRelayFields(isRelay) {
        const athleteSelect = document.getElementById('athlete');
        const teamInput = document.getElementById('relayTeamName');
        const athleteLabel = document.getElementById('athleteLabel');
        const participantsSection = document.getElementById('relayParticipantsSection');

        if (isRelay) {
            if (athleteSelect) {
                athleteSelect.classList.add('hidden');
                athleteSelect.required = false;
            }
            if (teamInput) {
                teamInput.classList.remove('hidden');
                teamInput.required = true;
            }
            if (athleteLabel) athleteLabel.textContent = 'Team Name';
            if (participantsSection) participantsSection.classList.remove('hidden');

            // Only populate if genderInput exists
            if (typeof genderInput !== 'undefined' && genderInput) {
                populateRelayAthletes(genderInput.value);
            }
        } else {
            if (athleteSelect) {
                athleteSelect.classList.remove('hidden');
                athleteSelect.required = true;
            }
            if (teamInput) {
                teamInput.classList.add('hidden');
                teamInput.required = false;
            }
            if (athleteLabel) athleteLabel.textContent = 'Athlete Name';
            if (participantsSection) participantsSection.classList.add('hidden');
        }
    }

    function editRecord(id) {
        console.log("✏️ editRecord called for ID:", id);

        const activeView = document.querySelector('.view-section.active-view');
        if (activeView) {
            previousTab = activeView.id.replace('view-', '');
        }

        switchTab('log');
        const idStr = String(id);
        const r = records.find(item => String(item.id) === idStr);

        if (!r) {
            console.error("❌ Record not found for ID:", id);
            alert("Error: Record not found!");
            return;
        }

        console.log("✅ Record found:", r);

        isSuppressingAutoFill = true; // SILENCE Auto-Calculations

        if (recordForm) recordForm.reset();

        // Helper to set select value more robustly
        const setSelectValue = (el, val) => {
            if (!el) return;
            const target = String(val || '').trim();
            el.value = target;

            if (el.value !== target) {
                const options = Array.from(el.options);
                const matchingOpt = options.find(o => o.text.trim() === target || o.value.trim() === target);
                if (matchingOpt) el.value = matchingOpt.value;
            }
        };

        // 1. SET ALL BASIC FIELDS FIRST
        setSelectValue(evtInput, r.event);
        setSelectValue(genderInput, r.gender);
        if (trackTypeInput) trackTypeInput.value = r.trackType || 'Outdoor';
        if (raceNameInput) raceNameInput.value = r.raceName || '';
        if (notesInput) notesInput.value = r.notes || '';
        if (markInput) markInput.value = r.mark || '';
        if (windInput) windInput.value = r.wind || '';
        if (idrInput) idrInput.value = r.idr || '';
        if (townInput) townInput.value = r.town || '';
        if (countryInput) countryInput.value = r.country || '';

        if (dateInput) {
            if (datePicker) datePicker.setDate(r.date);
            else dateInput.value = r.date;
        }

        const ev = events.find(e => e.name === r.event);
        const isRelay = ev ? (ev.eventType === 'Relay' || ev.isRelay === true) : false;
        toggleRelayFields(isRelay);

        // 2. DISPATCH CHANGE EVENTS ONLY AFTER VALUES ARE SET
        if (evtInput) evtInput.dispatchEvent(new Event('change'));
        if (genderInput) {
            populateRelayAthletes(r.gender || '');
            genderInput.dispatchEvent(new Event('change'));
        }

        // 3. SET DEPENDENT FIELDS (Athlete, Age Group)
        setTimeout(() => {
            setSelectValue(ageGroupInput, r.ageGroup);

            if (isRelay) {
                if (relayTeamNameInput) relayTeamNameInput.value = r.athlete || '';
                const p = r.relayParticipants || [];
                if (relayAthlete1) relayAthlete1.value = p[0] || '';
                if (relayAthlete2) relayAthlete2.value = p[1] || '';
                if (relayAthlete3) relayAthlete3.value = p[2] || '';
                if (relayAthlete4) relayAthlete4.value = p[3] || '';
            } else {
                setSelectValue(athleteInput, r.athlete);
            }

            // final sync for age calculation just in case
            if (typeof updateCalculatedAgeGroup === 'function') {
                // We keep it suppressed until the very end
            }

            console.log("Edit form population complete.");
            isSuppressingAutoFill = false; // RE-ENABLE Auto-Calculations
        }, 300); // Increased to 300ms for heavy sync environments

        editingId = id;
        editingHistoryId = null;

        if (formTitle) formTitle.textContent = 'Edit Record (Archives Old)';
        if (submitBtn) {
            const span = submitBtn.querySelector('span');
            if (span) span.textContent = 'Update & Archive';
            submitBtn.style.background = 'linear-gradient(135deg, var(--warning), #f59e0b)';
        }
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (recordForm) recordForm.scrollIntoView({ behavior: 'smooth' });
    }

    function cancelEdit() {
        const wasEditingHistory = !!editingHistoryId;
        const returnTab = previousTab; // Save before resetting

        editingId = null;
        editingHistoryId = null;
        previousTab = null; // Reset
        recordForm.reset();
        toggleRelayFields(false); // Reset to individual view

        if (datePicker) {
            datePicker.setDate(new Date());
        } else if (dateInput && dateInput.type === 'date') {
            dateInput.valueAsDate = new Date();
        } else if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        formTitle.textContent = 'Log New Record';
        formTitle.style.color = '';
        submitBtn.querySelector('span').textContent = 'Log Record';
        submitBtn.style.background = '';
        cancelBtn.classList.add('hidden');

        // Return to previous tab or history if editing history
        if (wasEditingHistory) {
            switchTab('history');
        } else if (returnTab && returnTab !== 'log') {
            switchTab(returnTab);
        }
    }

    function deleteRecord(id) {
        const isSup = isSupervisor(currentUser ? currentUser.email : null);
        const isAdmin = isAdminUser(currentUser ? currentUser.email : null);

        if (!isSup && !isAdmin) {
            alert("Only Supervisors or Admins can delete records.");
            return;
        }

        if (isSup) {
            if (!confirm('Are you sure you want to PERMANENTLY delete this record?')) return;
            const initialCount = records.length;
            const idStr = String(id);
            records = records.filter(r => String(r.id) !== idStr);
            recentlyRejected.add(idStr); // Tombstone
            saveTombstones(); // Persist

            if (records.length === initialCount) return;
            if (editingId && String(editingId) === idStr) cancelEdit();

            saveRecords();
            console.log(`Supervisor deleted record ${idStr}.`);
        } else {
            // Admin -> Propose Delete
            if (!confirm('Propose this record for DELETION?')) return;
            const record = records.find(r => String(r.id) === String(id));
            if (!record) return;

            const pendingDeleteRecord = { ...record };
            pendingDeleteRecord.id = String(Date.now() + '-' + Math.floor(Math.random() * 10000));
            pendingDeleteRecord.replacesId = record.id; // Track which record we want to delete
            pendingDeleteRecord.isPending = true;
            pendingDeleteRecord.isPendingDelete = true;
            pendingDeleteRecord.updatedBy = (currentUser?.displayName || currentUser?.email || 'Admin');

            pendingrecs.unshift(pendingDeleteRecord);
            savePendingRecs();
            alert("Deletion proposed. A Supervisor must approve this removal.");
        }

        populateYearDropdown();
        renderReports();
        renderEventList();
        renderAthleteList();
    }

    function clearAllData() {
        if (confirm('Are you sure you want to clear ALL data?')) {
            records = [];
            localStorage.clear();
            // Set to current SEED_VERSION to prevent re-seeding empty database on reload
            localStorage.setItem('tf_relays_seed_version', '6');
            location.reload();
        }
    }

    function saveRecords() {
        // ALWAYS save to LocalStorage first (Synchronous Backup)
        try {
            localStorage.setItem('tf_records', JSON.stringify(records));
        } catch (e) {
            console.error("Local Save Failed:", e);
        }

        if (!isDataReady) {
            console.warn("Cloud Save aborted: System not ready (Synchronization in progress). Local backup saved.");
            return;
        }

        if (db) {
            db.ref('records').set(records).catch(err => {
                console.error("Firebase Save Failed (Records):", err);
                alert("Cloud Sync Error: Your changes were reverted. " + err.message);
            });
        }
        populateAthleteFilter();
    }

    function genderFilterChange() { renderReports(); }

    function getFilteredRecords() {
        const eVal = filterEvent ? filterEvent.value : 'all';
        const gVal = filterGender ? filterGender.value : 'all';
        const aVal = filterAge ? filterAge.value : 'all';
        const yVal = filterYear ? filterYear.value : 'all';
        const athleteVal = filterAthlete ? filterAthlete.value : 'all';
        const nameSearch = filterAthleteName ? filterAthleteName.value.toLowerCase().trim() : '';
        const mVal = filterAgeMismatch ? filterAgeMismatch.value : 'all';
        const ttVal = filterTrackType ? filterTrackType.value : 'all';

        const archivedIds = new Set(history.map(h => h.originalId).filter(id => id));

        // Merge records and pendingrecs for unified display
        const mergedRecords = [...records, ...(pendingrecs || [])];

        const filtered = mergedRecords.filter(r => {
            const rIdStr = String(r.id);
            const isSup = isSupervisor(currentUser ? currentUser.email : null);

            // ARCHIVE & REJECT PROTECTION
            if (archivedIds.has(rIdStr) || recentlyRejected.has(rIdStr)) return false;

            // Visibility: Under new architecture, ALL users can see BOTH live records and pending proposals.
            // (No role-based hiding of pending items here).

            const rTrackType = r.trackType || 'Outdoor';
            const matchesTrackType = ttVal === 'all' || rTrackType === ttVal;
            const matchesEvent = eVal === 'all' || r.event === eVal;
            const matchesGender = gVal === 'all' || r.gender === gVal;
            const matchesAge = aVal === 'all' || r.ageGroup === aVal;
            const matchesAthlete = athleteVal === 'all' || r.athlete === athleteVal;
            const matchesSearch = nameSearch === '' || r.athlete.toLowerCase().includes(nameSearch);

            // Year filter
            let matchesYear = true;
            if (yVal !== 'all') {
                const rYear = r.date ? new Date(r.date).getFullYear().toString() : '';
                matchesYear = rYear === yVal;
            }

            // Age Mismatch Filter
            let matchesMismatch = true;
            if (mVal !== 'all') {
                const athlete = findAthleteByNormalizedName(r.athlete);
                let isMismatch = false;
                if (r.ageGroup && athlete && athlete.dob && r.date) {
                    const calculatedGroup = calculateAgeGroup(athlete.dob, r.date);
                    if (String(r.ageGroup).trim() !== String(calculatedGroup).trim()) {
                        isMismatch = true;
                    }
                }

                if (mVal === 'issue') {
                    matchesMismatch = isMismatch;
                } else if (mVal === 'valid') {
                    matchesMismatch = !isMismatch;
                }
            }

            return matchesTrackType && matchesEvent && matchesGender && matchesAge && matchesYear && matchesMismatch && matchesAthlete && matchesSearch;
        });

        // Apply Sorting
        filtered.sort((a, b) => {
            let valA, valB;
            const direction = currentSort.direction === 'asc' ? 1 : -1;

            switch (currentSort.column) {
                case 'date':
                    return (new Date(a.date) - new Date(b.date)) * direction;
                case 'athlete':
                    return a.athlete.localeCompare(b.athlete) * direction;
                case 'event':
                    return a.event.localeCompare(b.event) * direction;
                case 'mark':
                    // Numeric sort for marks if possible
                    valA = parseFloat(a.mark.replace(/:/g, '')) || 0;
                    valB = parseFloat(b.mark.replace(/:/g, '')) || 0;
                    if (valA !== valB) return (valA - valB) * direction;
                    return a.mark.localeCompare(b.mark, undefined, { numeric: true }) * direction;
                case 'ageGroup':
                    return ((parseInt(a.ageGroup) || 0) - (parseInt(b.ageGroup) || 0)) * direction;
                case 'gender':
                    return (a.gender || '').localeCompare(b.gender || '') * direction;
                case 'town':
                    return (a.town || '').localeCompare(b.town || '') * direction;
                case 'raceName':
                    return (a.raceName || '').localeCompare(b.raceName || '') * direction;
                case 'wind':
                    return (parseFloat(a.wind) || 0 - parseFloat(b.wind) || 0) * direction;
                case 'idr':
                    return (parseInt(a.idr) || 0 - parseInt(b.idr) || 0) * direction;
                default:
                    return (new Date(a.date) - new Date(b.date)) * direction;
            }
        });

        return filtered;
    }

    function setupTableSorting() {
        const headers = document.querySelectorAll('th.sortable');
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                if (currentSort.column === column) {
                    // Toggle direction
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    // New column, default to asc (except date/mark maybe?)
                    currentSort.column = column;
                    currentSort.direction = ['date', 'mark'].includes(column) ? 'desc' : 'asc';
                }

                updateSortUI();
                renderReports();
            });
        });
        updateSortUI(); // Set initial state
    }

    function updateSortUI() {
        const headers = document.querySelectorAll('th.sortable');
        headers.forEach(th => {
            th.classList.remove('asc', 'desc');
            if (th.dataset.sort === currentSort.column) {
                th.classList.add(currentSort.direction);
            }
        });

    }


    // Helper to toggle age in-place temporarily
    window.showExactAge = function (el, age) {
        if (el.dataset.isToggled === 'true') return;

        const originalText = el.textContent;

        // Change to Success State
        el.dataset.isToggled = 'true';
        el.textContent = age;
        el.style.backgroundColor = 'var(--success)'; // Green background
        el.style.borderColor = 'var(--success)';
        el.style.color = 'white';
        el.style.transform = 'scale(1.1)';
        el.style.transition = 'all 0.2s';

        setTimeout(() => {
            // Revert
            el.dataset.isToggled = 'false';
            el.textContent = originalText;
            el.style.backgroundColor = '';
            el.style.borderColor = '';
            el.style.color = '';
            el.style.transform = '';
        }, 2000);
    };

    function renderReports() {
        if (!reportTableBody) return;
        console.log("renderReports called");
        reportTableBody.innerHTML = '';

        const filtered = getFilteredRecords();
        const isHideNotesChecked = hideNotesSymbol && hideNotesSymbol.checked;

        if (filtered.length === 0) return;
        // Sort applied in getFilteredRecords

        filtered.forEach(r => {
            const tr = document.createElement('tr');
            const hasNotes = r.notes && r.notes.trim().length > 0;

            // Find athlete for Age Validation using robust helper
            const athlete = findAthleteByNormalizedName(r.athlete);
            let ageDisplay = r.ageGroup || '-';

            if (r.ageGroup && athlete && athlete.dob && r.date) {
                const calculatedGroup = calculateAgeGroup(athlete.dob, r.date);
                if (String(r.ageGroup).trim() !== String(calculatedGroup).trim()) {
                    const exactAge = getExactAge(athlete.dob, r.date);
                    ageDisplay = `<span class="age-indicator" title="Click to see exact age" style="cursor:pointer;" onclick="showExactAge(this, '${exactAge}')">${r.ageGroup}</span>`;
                }
            }

            // Create main row content
            tr.innerHTML = `
                    <td class="expand-col" style="text-align:center;">
                        ${(isHideNotesChecked && hasNotes) ? `<button class="toggle-notes-btn" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:1.2rem; font-weight:bold; padding:0; width:24px; height:24px; line-height:24px;">+</button>` : ''}
                    </td>
                    <td style="font-weight:600;">${r.event}</td>
                    <td style="white-space:nowrap;">${ageDisplay}</td>
                    <td>
                        <div style="font-weight:500; display:flex; align-items:center; gap:5px;">
                            ${r.athlete}
                        </div>
                        ${hasNotes ? `
                            <div class="record-notes ${isHideNotesChecked ? 'hidden' : ''}" style="font-size:0.85em; color:var(--text-muted); font-style:italic; margin-top:2px; white-space:pre-wrap;">${r.notes}</div>
                        ` : ''}
                    </td>
                    <td>${r.gender === 'Male' ? 'Άνδρες' : (r.gender === 'Female' ? 'Γυναίκες' : (r.gender || '-'))}</td>
                    <td style="font-weight:700; color:var(--accent); text-align:center;">${formatTimeMark(r.mark, r.event)}</td>
                    <td>
                        ${r.isPendingDelete ?
                    `<span class="badge-pending" style="background:var(--danger); color:white;">⚠️ Προς Διαγραφή</span>` :
                    (r.isPending ? `<span class="badge-pending">Προς Εγκριση</span>` : (r.idr || '-'))
                }
                    </td>
                    <td>${r.wind || '-'}</td>
                    <td style="white-space:nowrap;">${new Date(r.date).toLocaleDateString('en-GB')}</td>
                    <td>${r.town || ''}</td>
                    <td>${r.raceName || ''}</td>
                    <td class="actions-col" style="white-space:nowrap;">
                        ${(() => {
                    if (r.isPending || r.isPendingDelete) {
                        // Pending Record Logic
                        if (isSupervisor(currentUser ? currentUser.email : null)) {
                            return `
                                        <button class="btn-icon approve-btn" onclick="approveRecord('${r.id}')" title="Approve Record" style="color:var(--success); margin-right:5px;">✅</button>
                                        <button class="btn-icon reject-btn" onclick="rejectRecord('${r.id}')" title="Reject/Cancel Proposal" style="color:var(--danger); margin-right:5px;">❌</button>
                                    `;
                        } else {
                            // Admins can ONLY cancel their own proposals
                            const cEmail = currentUser ? String(currentUser.email).toLowerCase() : '';
                            const ub = r.updatedBy ? String(r.updatedBy).toLowerCase() : '';
                            if (ub === cEmail || ub === 'admin' || (currentUser && ub === String(currentUser.displayName).toLowerCase())) {
                                return `<button class="btn-icon reject-btn" onclick="rejectRecord('${r.id}')" title="Cancel Proposal" style="color:var(--danger);">❌</button>`;
                            }
                            return ''; // Simple users see nothing
                        }
                    } else {
                        // Normal Record Logic: Conditionally render buttons based on Role & Authorship
                        const isSup = isSupervisor(currentUser ? currentUser.email : null);
                        const isAdm = isAdminUser(currentUser ? currentUser.email : null);
                        let isAuthor = false;
                        if (currentUser) {
                            const ub = String(r.updatedBy).toLowerCase();
                            const cEmail = String(currentUser.email).toLowerCase();
                            const cName = String(currentUser.displayName).toLowerCase();
                            if (ub === cEmail || ub === cName || cName === 'local admin') {
                                isAuthor = true; // User authored this record or is a Local Admin
                            }
                        }

                        if (isSup || isAdm || isAuthor) {
                            return `
                                <button class="btn-icon edit edit-btn" data-id="${r.id}" title="Edit" style="color:var(--text); margin-right:5px;">✏️</button>
                                <button class="btn-icon delete delete-btn" data-id="${r.id}" title="Delete" style="color:var(--text); margin-right:5px;">🗑️</button>
                            `;
                        } else {
                            return ''; // Simple users don't see edit/delete on non-authored records
                        }
                    }
                })()}
                    </td>
                `;

            // Add event listener to the toggle button (if present)
            const btn = tr.querySelector('.toggle-notes-btn');
            const notesDiv = tr.querySelector('.record-notes');
            if (btn && notesDiv) {
                btn.addEventListener('click', () => {
                    const isHidden = notesDiv.classList.contains('hidden');
                    if (isHidden) {
                        notesDiv.classList.remove('hidden');
                        btn.textContent = '−';
                        btn.style.color = 'var(--danger)';
                    } else {
                        notesDiv.classList.add('hidden');
                        btn.textContent = '+';
                        btn.style.color = 'var(--primary)';
                    }
                });
            }

            reportTableBody.appendChild(tr);
        });
    }

    function getExportData() {
        // Filter out unapproved staging records from exports
        const rawData = getFilteredRecords().filter(r => !r.isPending && !r.isPendingDelete);
        const categoryOrder = ['Track', 'Road', 'Field', 'Combined', 'Relay'];

        const sortedData = rawData.sort((a, b) => {
            const evA = events.find(e => e.name === a.event);
            const evB = events.find(e => e.name === b.event);

            const catA = evA ? (evA.eventType || evA.type || 'Track') : 'Track';
            const catB = evB ? (evB.eventType || evB.type || 'Track') : 'Track';

            const indexA = categoryOrder.indexOf(catA);
            const indexB = categoryOrder.indexOf(catB);

            if (indexA !== indexB) {
                return indexA - indexB;
            }

            // If both are same category and it's Track, sort by length (User requirement)
            if (catA === 'Track') {
                if (a.event.length !== b.event.length) {
                    return a.event.length - b.event.length;
                }
            }

            // Secondary sort: Event Name
            // (Track events are already prioritized by length above, others handled here)
            const eventSort = a.event.localeCompare(b.event);
            if (eventSort !== 0) return eventSort;

            // Tertiary sort: Gender (Male first)
            if (a.gender !== b.gender) {
                if (a.gender === 'Male') return -1;
                if (b.gender === 'Male') return 1;
                return a.gender.localeCompare(b.gender);
            }

            // Quaternary sort: Age Group (starting from newest/youngest)
            const ageA = parseInt(a.ageGroup) || 0;
            const ageB = parseInt(b.ageGroup) || 0;
            if (ageA !== ageB) return ageA - ageB;

            return b.date.localeCompare(a.date);
        });

        return sortedData.map(r => {
            const athlete = findAthleteByNormalizedName(r.athlete);
            let dobDisplay = '-';
            if (athlete && athlete.dob) {
                // Return YYYY-MM-DD as is or format carefully
                try {
                    const d = new Date(athlete.dob);
                    if (!isNaN(d)) {
                        // Use Intl.DateTimeFormat for consistent DD/MM/YYYY
                        dobDisplay = d.toLocaleDateString('en-GB');
                    }
                } catch (e) {
                    dobDisplay = athlete.dob; // fallback to raw string
                }
            }
            return {
                ...r,
                formattedDate: new Date(r.date).toLocaleDateString('en-GB'),
                dob: dobDisplay
            };
        });
    }

    function exportToExcel() {
        // Enforce STRICT approval check (must be explicitly true)
        const data = getFilteredRecords().filter(r => r.approved === true);
        if (!data.length) return alert('No approved data to export!');

        const timestamp = new Date().toLocaleString('el-GR');
        let csv = `Ημερομηνία Εξαγωγής: ${timestamp}\n\n`;

        const menMixed = data.filter(r => r.gender === 'Male' || r.gender === 'Mixed');
        const women = data.filter(r => r.gender === 'Female');

        if (menMixed.length) {
            csv += 'Ανδρες - Ανοικτός Στίβος\n';
            csv += 'Αγώνισμα,Κατηγ.,Αθλητής/τρια,Ημ. Γεν.,Επίδοση,IDR,Άνεμος,Ημερομηνία,Πόλη,Διοργάνωση,Σημειώσεις\n';
            menMixed.forEach(r => {
                csv += `"${r.event}","${r.ageGroup || ''}","${r.athlete}","${r.dob}","${r.mark}","${r.idr || ''}","${r.wind || ''}","${r.formattedDate}","${r.town || ''}","${r.raceName || ''}","${r.notes || ''}"\n`;
            });
            csv += '\n';
        }

        if (women.length) {
            csv += 'Γυναίκες - Ανοικτός Στίβος\n';
            csv += 'Αγώνισμα,Κατηγ.,Αθλητής/τρια,Ημ. Γεν.,Επίδοση,IDR,Άνεμος,Ημερομηνία,Πόλη,Διοργάνωση,Σημειώσεις\n';
            women.forEach(r => {
                csv += `"${r.event}","${r.ageGroup || ''}","${r.athlete}","${r.dob}","${r.mark}","${r.idr || ''}","${r.wind || ''}","${r.formattedDate}","${r.town || ''}","${r.raceName || ''}","${r.notes || ''}"\n`;
            });
        }
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `track_records.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function exportToHTML() {
        // Enforce STRICT approval check (must be explicitly true)
        // getExportData() already filters approved !== false, but we want strict === true for safety as per request
        // Actually getExportData used to filter !== false. Let's make it strict inside getExportData OR here.
        // User said: "not approved records ... are not exporting"
        // Let's rely on getExportData but refined.

        // HTML Print Export: Strictly filter out staging proposals
        const data = getFilteredRecords().filter(r => !r.isPending && !r.isPendingDelete && r.approved !== false);
        if (!data.length) return alert('No officially approved data to export!');

        const timestamp = new Date().toLocaleString('el-GR');

        const menMixed = data.filter(r => r.gender === 'Male' || r.gender === 'Mixed');
        const women = data.filter(r => r.gender === 'Female');

        const renderTable = (records, title) => {
            if (!records.length) return '';
            let rows = '';
            records.forEach(r => {
                const hasNotes = r.notes && r.notes.trim().length > 0;
                rows += `
                    <tr>
                        <td style="font-weight:600;">${r.event}</td>
                        <td>${r.ageGroup || '-'}</td>
                        <td>
                        <div style="font-weight:500; display:flex; align-items:center; gap:5px;">
                            ${r.athlete}
                            ${r.approved === false ? `<span class="badge-pending">Προς Εγκριση</span>` : ''}
                        </div>
                        ${hasNotes ? `<div style="font-size:0.85em; color:#666; font-style:italic; margin-top:2px;">${r.notes}</div>` : ''}
                        </td>
                        <td>${r.dob}</td>
                        <td style="font-weight:700;">${formatTimeMark(r.mark, r.event)}</td>
                        <td>${r.idr || '-'}</td>
                        <td>${r.wind || '-'}</td>
                        <td>${r.formattedDate}</td>
                        <td>${r.town || ''}</td>
                        <td>${r.raceName || ''}</td>
                    </tr>
                `;
            });

            return `
                <h2 style="text-align:center; color:#5b21b6; margin-top:40px;">${title}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Αγώνισμα</th>
                            <th>Κατηγ.</th>
                            <th>Αθλητής/τρια</th>
                            <th>Ημ. Γεν.</th>
                            <th>Επίδοση</th>
                            <th>IDR</th>
                            <th>Άνεμος</th>
                            <th>Ημερομηνία</th>
                            <th>Πόλη</th>
                            <th>Διοργάνωση</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
        };

        const html = `
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Πανελλήνια Ρεκόρ Βετεράνων Αθλητών Στίβου</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    h1 { color: #5b21b6; margin: 0; }
                    .timestamp { font-size: 0.9em; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; font-size: 0.9em; }
                    th { background-color: #f3f4f6; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9fafb; }
                </style>
            </head>
            <body>
                <div class="header-top">
                    <h1>🇬🇷 Πανελλήνια Ρεκόρ Βετεράνων Αθλητών Στίβου</h1>
                    <div class="timestamp">Ημερομηνία Εξαγωγής: ${timestamp}</div>
                </div>
                ${renderTable(menMixed, 'Ανδρες - Ανοικτός Στίβος')}
                ${renderTable(women, 'Γυναίκες - Ανοικτός Στίβος')}
            </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'report.html';
        link.click();
    }

    async function exportToPDF() {
        if (!window.jspdf) return alert('PDF library not loaded.');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Switch to Landscape for better fit

        // Use embedded Base64 Font (Reliable "Nuclear Option")
        if (typeof ROBOTO_BASE64 !== 'undefined') {
            const fontName = 'Roboto-Regular.ttf';
            doc.addFileToVFS(fontName, ROBOTO_BASE64);
            doc.addFont(fontName, 'Roboto', 'normal');
            doc.setFont('Roboto');
        }

        const timestamp = new Date().toLocaleString('el-GR');
        // Enforce STRICT approval check
        const data = getFilteredRecords().filter(r => r.approved === true);


        const mapper = r => [
            r.event,
            r.ageGroup || '-',
            r.notes ? `${r.athlete}\n(Σημ: ${r.notes})` : r.athlete,
            r.dob,
            r.mark,
            r.idr || '-',
            r.wind || '-',
            r.formattedDate,
            r.town || '-',
            r.raceName || '-'
        ];

        const menMixedData = data.filter(r => r.gender === 'Male' || r.gender === 'Mixed').map(mapper);
        const womenData = data.filter(r => r.gender === 'Female').map(mapper);

        doc.setFontSize(16);
        doc.text("🇬🇷 Πανελλήνια Ρεκόρ Βετεράνων Αθλητών Στίβου", 14, 15);

        doc.setFontSize(10);
        doc.text(`Ημερομηνία Εξαγωγής: ${timestamp}`, doc.internal.pageSize.getWidth() - 15, 15, { align: 'right' });

        const headers = [['Αγώνισμα', 'Κατηγ.', 'Αθλητής/τρια', 'Ημ. Γεν.', 'Επίδοση', 'IDR', 'Άνεμος', 'Ημερομηνία', 'Πόλη', 'Διοργάνωση']];
        let finalY = 20;

        if (menMixedData.length) {
            doc.setFontSize(14);
            doc.text("Ανδρες - Ανοικτός Στίβος", doc.internal.pageSize.getWidth() / 2, finalY + 5, { align: 'center' });
            doc.autoTable({
                head: headers,
                body: menMixedData,
                startY: finalY + 10,
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246] },
                styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 8 }
            });
            finalY = doc.lastAutoTable.finalY + 10;
        }

        if (womenData.length) {
            if (finalY > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                finalY = 15;
            }
            doc.setFontSize(14);
            doc.text("Γυναίκες - Ανοικτός Στίβος", doc.internal.pageSize.getWidth() / 2, finalY + 5, { align: 'center' });
            doc.autoTable({
                head: headers,
                body: womenData,
                startY: finalY + 10,
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246] },
                styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 8 }
            });
        }
        doc.save('track_report.pdf');
    }

    function exportDatabase() {
        const db = {
            version: 5,
            exportedAt: new Date().toISOString(),
            events: events,
            records: records,
            athletes: athletes,
            countries: countries,
            history: history,
            users: appUsers,
            wma_data: wmaData,
            iaaf_updates: iaafUpdates,
            theme: localStorage.getItem('tf_theme') || 'theme-default',
            seed_version: localStorage.getItem('tf_relays_seed_version') || '0',
            seeded: localStorage.getItem('tf_relays_seeded') || 'false'
        };
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'track_data.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    function handleAthleteImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        if (file.name.endsWith('.json')) {
            reader.onload = function (e) {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    processAthleteData(jsonData);
                } catch (err) {
                    alert('Error parsing JSON file: ' + err.message);
                }
            };
            reader.readAsText(file);
        } else {
            reader.onload = function (e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    processAthleteData(jsonData);
                } catch (err) {
                    console.error(err);
                    alert('Error processing Excel file: ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        }

        // Reset input
        athleteImportFile.value = '';
    }

    function processAthleteData(jsonData) {
        try {
            let importedCount = 0;
            jsonData.forEach(row => {
                // Normalize keys to lowercase for flexible matching
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toString().toLowerCase().trim().replace(/\s+/g, '')] = row[key];
                });

                // Map fields
                // Expected: First Name, Last Name, Gender, DOB, Club/Team
                const firstName = normalizedRow['firstname'] || normalizedRow['name'] || normalizedRow['fname'];
                const lastName = normalizedRow['lastname'] || normalizedRow['surname'] || normalizedRow['lname'];
                const genderVal = normalizedRow['gender'] || normalizedRow['sex'];
                const dobVal = normalizedRow['dob'] || normalizedRow['dateofbirth'] || normalizedRow['birthdate'];
                const idVal = normalizedRow['id'] || normalizedRow['code'];

                if (!firstName || !lastName) return; // Skip if no name

                // Parse Gender
                let gender = '';
                if (genderVal) {
                    const g = genderVal.toString().toLowerCase();
                    if (g.startsWith('m') || g === 'andr') gender = 'Male';
                    if (g.startsWith('f') || g === 'gyn') gender = 'Female';
                }

                // Parse DOB (Excel dates are often numbers)
                let dob = '';
                if (dobVal) {
                    if (typeof dobVal === 'number') {
                        // Excel serial date to JS Date
                        const date = new Date(Math.round((dobVal - 25569) * 864e5));
                        dob = date.toISOString().split('T')[0];
                    } else {
                        // Try to parse string
                        const date = new Date(dobVal);
                        if (!isNaN(date)) dob = date.toISOString().split('T')[0];
                    }
                }

                // Check duplicates (by Name + DOB or ID)
                const exists = athletes.some(a =>
                    (idVal && a.id == idVal) ||
                    (a.firstName.toLowerCase() === firstName.toString().toLowerCase() &&
                        a.lastName.toLowerCase() === lastName.toString().toLowerCase() &&
                        (!dob || a.dob === dob))
                );

                if (!exists) {
                    const newAthlete = {
                        id: idVal ? idVal.toString() : Date.now() + Math.floor(Math.random() * 100000),
                        firstName: firstName.toString(),
                        lastName: lastName.toString(),
                        gender: gender,
                        dob: dob,
                        club: normalizedRow['club'] || normalizedRow['team'] || ''
                    };
                    athletes.push(newAthlete);
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                saveAthletes();
                renderAthleteList();
                populateAthleteDropdown();
                alert(`Successfully imported ${importedCount} athletes!`);
            } else {
                alert('No new athletes found or file format not recognized.');
            }
        } catch (err) {
            console.error('Error in processAthleteData:', err);
            alert('Error processing athlete data: ' + err.message);
        }
    }
    function importRecordsFromFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

                if (jsonData.length === 0) {
                    alert('File appears to be empty.');
                    return;
                }

                showExcelMapping(jsonData);

            } catch (err) {
                console.error(err);
                alert('Error processing file: ' + err.message);
            }
            // Reset input
            recordImportFile.value = '';
        };
        reader.readAsArrayBuffer(file);
    }

    function showExcelMapping(jsonData) {
        const modal = document.getElementById('excelMappingModal');
        const content = document.getElementById('excelMappingContent');
        if (!modal || !content) { alert('Modal not found.'); return; }

        const allKeys = new Set();
        jsonData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
        const headers = Array.from(allKeys);

        const targetFields = [
            { id: 'event', label: 'Event' },
            { id: 'athlete', label: 'Athlete Name' },
            { id: 'gender', label: 'Gender' },
            { id: 'trackType', label: 'Track Type' },
            { id: 'raceName', label: 'Race Name' },
            { id: 'town', label: 'Town' },
            { id: 'date', label: 'Date' },
            { id: 'mark', label: 'Mark' },
            { id: 'idr', label: 'IDR' },
            { id: 'wind', label: 'Wind' },
            { id: 'notes', label: 'Notes' }
        ];

        let mappingHtml = '';
        targetFields.forEach(field => {
            let options = `<option value="">-- Skip Field --</option>`;
            headers.forEach(h => {
                const hNorm = h.trim().toLowerCase();
                const selected = hNorm === field.label.toLowerCase() || hNorm === field.id.toLowerCase() ? 'selected' : '';
                options += `<option value="${h}" ${selected}>${h}</option>`;
            });
            mappingHtml += `
                <div style="display:flex; align-items:center; gap:1rem; margin-bottom:0.75rem; background:#fff; padding:0.75rem 1.25rem; border-radius:8px; border:1px solid #e5e7eb;">
                    <span style="flex:1; font-weight:600; color:#4338ca;">${field.label}</span>
                    <i style="color:#9ca3af;">→</i>
                    <select id="map_${field.id}" style="flex:2; padding:0.5rem; border-radius:6px; border:1px solid #d1d5db; font-family:inherit;">
                        ${options}
                    </select>
                </div>`;
        });

        content.innerHTML = mappingHtml;
        modal.style.display = 'block';

        // Wire the Proceed button
        const proceedBtn = document.getElementById('proceedToValidationBtn');
        proceedBtn.onclick = function () {
            const mapping = {};
            targetFields.forEach(f => {
                mapping[f.id] = document.getElementById('map_' + f.id).value;
            });
            modal.style.display = 'none';
            showExcelValidation(jsonData, mapping);
        };
    }

    window.showExcelValidation = function (jsonData, mapping) {
        const modal = document.getElementById('excelValidationModal');
        const content = document.getElementById('excelValidationContent');
        const counter = document.getElementById('valRecordCount');
        if (!modal || !content) { alert('Validation modal not found.'); return; }

        const targetFields = [
            { id: 'event', label: 'Event' },
            { id: 'athlete', label: 'Athlete Name' },
            { id: 'gender', label: 'Gender' },
            { id: 'trackType', label: 'Track Type' },
            { id: 'raceName', label: 'Race Name' },
            { id: 'town', label: 'Town' },
            { id: 'date', label: 'Date' },
            { id: 'mark', label: 'Mark' },
            { id: 'idr', label: 'IDR' },
            { id: 'wind', label: 'Wind' },
            { id: 'notes', label: 'Notes' }
        ];

        const mappedFields = targetFields.filter(f => mapping[f.id]);

        // Update record count label
        if (counter) counter.textContent = `Found ${jsonData.length} records.`;

        // Reset filter checkbox
        const chk = document.getElementById('chkUnmatched');
        if (chk) chk.checked = false;

        // Build table header
        let theadHtml = '<tr>';
        mappedFields.forEach(f => {
            theadHtml += `<th style="padding:10px 12px; border:1px solid #e2e8f0; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; background:#f8fafc; color:#475569; font-weight:700;">${f.label}</th>`;
        });
        theadHtml += `<th style="padding:10px 12px; border:1px solid #e2e8f0; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; background:#eef2ff; color:#4338ca; font-weight:700;">&#9998; Athlete</th>`;
        theadHtml += '</tr>';

        // Build rows
        let tbodyHtml = '';
        jsonData.forEach((row, idx) => {
            const evVal = (row[mapping['event']] || '').toString().trim();
            const athVal = (row[mapping['athlete']] || '').toString().trim();
            const genVal = (row[mapping['gender']] || '').toString().trim();
            const ttVal = (row[mapping['trackType']] || '').toString().trim();

            const matchedAthlete = mapping['athlete'] && athVal ? athletes.find(a => {
                const fl = `${a.firstName} ${a.lastName}`.toLowerCase();
                const lf = `${a.lastName} ${a.firstName}`.toLowerCase();
                const clean = athVal.toLowerCase().replace(/,/g, '');
                return clean === fl || clean === lf;
            }) : null;

            const fieldMatch = {
                event: mapping['event'] ? (evVal && events.some(e => e.name.toLowerCase() === evVal.toLowerCase())) : null,
                athlete: mapping['athlete'] ? (!!matchedAthlete) : null,
                gender: mapping['gender'] ? (genVal && ['male', 'female', 'ανδρων', 'γυναικων'].includes(genVal.toLowerCase())) : null,
                trackType: mapping['trackType'] ? (ttVal && ['outdoor', 'indoor'].includes(ttVal.toLowerCase())) : null,
            };

            const hasRed = Object.keys(fieldMatch).some(k => fieldMatch[k] === false);

            tbodyHtml += `<tr data-has-red="${hasRed}">`;
            mappedFields.forEach(f => {
                const val = (row[mapping[f.id]] || '').toString().trim();
                let bg = '#ffffff';
                if (f.id in fieldMatch && fieldMatch[f.id] !== null) {
                    bg = fieldMatch[f.id] ? '#dcfce7' : '#fee2e2';
                }
                tbodyHtml += `<td style="padding:8px 12px; border:1px solid #e2e8f0; color:#334155; background:${bg};">${val}</td>`;
            });

            // Athlete dropdown
            let athOpts = `<option value="">-- Skip --</option>`;
            athletes.forEach(a => {
                const sel = (matchedAthlete && String(a.id) === String(matchedAthlete.id)) ? 'selected' : '';
                athOpts += `<option value="${a.id}" ${sel}>${a.lastName}, ${a.firstName}</option>`;
            });
            const showNew = !matchedAthlete && athVal;
            athOpts += `<option value="__new__" ${showNew ? 'selected' : ''}>+ Add New Athlete</option>`;

            tbodyHtml += `<td style="padding:6px 10px; border:1px solid #e2e8f0; background:#f5f3ff; min-width:230px;">
                <select id="ath_sel_${idx}" onchange="toggleNew(${idx}, this.value)" style="width:100%;padding:5px 8px;border-radius:6px;border:1px solid #c7d2fe;font-family:inherit;font-size:0.85rem;">
                    ${athOpts}
                </select>
                <div id="new_form_${idx}" style="display:${showNew ? 'block' : 'none'};margin-top:6px;background:#f0f9ff;padding:8px;border-radius:6px;border:1px solid #bae6fd;">
                    <input id="fn_${idx}"  placeholder="First Name"      style="padding:4px 6px;margin:2px;width:88px; border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                    <input id="ln_${idx}"  placeholder="Last Name"       style="padding:4px 6px;margin:2px;width:88px; border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                    <input id="dob_${idx}" placeholder="DOB YYYY-MM-DD"  style="padding:4px 6px;margin:2px;width:115px;border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                    <select id="gen_${idx}" style="padding:4px 6px;margin:2px;border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                        <option value="Male">Male</option><option value="Female">Female</option>
                    </select>
                </div>
            </td>`;
            tbodyHtml += '</tr>';
        });

        content.innerHTML = `<table style="width:100%; border-collapse:collapse;">
            <thead>${theadHtml}</thead>
            <tbody>${tbodyHtml}</tbody>
        </table>`;

        modal.style.display = 'block';

        // Wire Complete Import button
        const importBtn = document.getElementById('completeImportBtn');
        importBtn.onclick = function () {
            if (!confirm(`Confirm import of ${jsonData.length} records?`)) return;

            const athleteOverrides = {};
            for (let i = 0; i < jsonData.length; i++) {
                const sel = document.getElementById('ath_sel_' + i);
                if (!sel) continue;
                if (sel.value === '__new__') {
                    const fn = (document.getElementById('fn_' + i) || {}).value || '';
                    const ln = (document.getElementById('ln_' + i) || {}).value || '';
                    const dob = (document.getElementById('dob_' + i) || {}).value || '';
                    const gen = (document.getElementById('gen_' + i) || {}).value || 'Male';
                    if (fn.trim() || ln.trim()) {
                        athleteOverrides[i] = { type: 'new', firstName: fn.trim(), lastName: ln.trim(), dob: dob.trim(), gender: gen };
                    }
                } else if (sel.value) {
                    athleteOverrides[i] = { type: 'existing', id: sel.value };
                }
            }

            modal.style.display = 'none';
            handleMappedImport(jsonData, mapping, athleteOverrides);
        };
    };

    // Global helpers for the validation modal (called from inline onchange/onclick)
    window.filterValidationRows = function () {
        const chk = document.getElementById('chkUnmatched');
        if (!chk) return;
        const onlyUnmatched = chk.checked;
        document.querySelectorAll('#excelValidationContent tbody tr').forEach(tr => {
            tr.style.display = (onlyUnmatched && tr.dataset.hasRed !== 'true') ? 'none' : '';
        });
    };

    window.toggleNew = function (idx, val) {
        const el = document.getElementById('new_form_' + idx);
        if (el) el.style.display = val === '__new__' ? 'block' : 'none';
    };


    window.handleMappedImport = function (jsonData, mapping, athleteOverrides) {
        athleteOverrides = athleteOverrides || {};
        try {
            let importedCount = 0;
            jsonData.forEach((row, idx) => {
                const eventVal = (row[mapping['event']] || '').toString().trim();
                const markVal = (row[mapping['mark']] || '').toString().trim();

                if (!eventVal || !markVal) return;

                // Resolve athlete from override or smart link
                let finalAthleteName = '';
                const override = athleteOverrides[idx];

                if (override && override.type === 'existing' && override.id) {
                    // Use selected existing athlete
                    const existingAthlete = athletes.find(a => String(a.id) === String(override.id));
                    if (existingAthlete) {
                        finalAthleteName = `${existingAthlete.lastName}, ${existingAthlete.firstName}`;
                    }
                } else if (override && override.type === 'new' && (override.firstName || override.lastName)) {
                    // Create new athlete and add to DB
                    const newAthlete = {
                        id: 'ath_' + Date.now() + '_' + idx,
                        firstName: override.firstName,
                        lastName: override.lastName,
                        dob: override.dob || '',
                        gender: override.gender || 'Male'
                    };
                    athletes.push(newAthlete);
                    finalAthleteName = `${newAthlete.lastName}, ${newAthlete.firstName}`;
                } else {
                    // Fallback: smart link by name from Excel
                    const rawName = (row[mapping['athlete']] || '').toString().trim();
                    finalAthleteName = rawName;
                    if (rawName) {
                        const match = athletes.find(a => {
                            const fl = `${a.firstName} ${a.lastName}`.toLowerCase();
                            const lf = `${a.lastName} ${a.firstName}`.toLowerCase();
                            const cleanVal = rawName.toLowerCase().replace(/,/g, '');
                            return cleanVal === fl || cleanVal === lf;
                        });
                        if (match) finalAthleteName = `${match.lastName}, ${match.firstName}`;
                    }
                }

                const dateRaw = row[mapping['date']];
                let finalDate = '';
                if (dateRaw && !isNaN(dateRaw) && typeof dateRaw === 'number') {
                    const dateObj = new Date(Math.round((dateRaw - 25569) * 86400 * 1000));
                    finalDate = dateObj.toISOString().split('T')[0];
                } else if (dateRaw) {
                    const d = new Date(dateRaw);
                    if (!isNaN(d)) finalDate = d.toISOString().split('T')[0];
                    else finalDate = dateRaw;
                } else {
                    finalDate = new Date().toISOString().split('T')[0];
                }

                records.unshift({
                    id: Date.now() + Math.random(),
                    event: eventVal,
                    athlete: finalAthleteName,
                    gender: (row[mapping['gender']] || '').toString().trim(),
                    ageGroup: '',
                    trackType: (row[mapping['trackType']] || '').toString().trim(),
                    mark: markVal,
                    wind: (row[mapping['wind']] || '').toString().trim(),
                    idr: (row[mapping['idr']] || '').toString().trim(),
                    date: finalDate,
                    country: '',
                    town: (row[mapping['town']] || '').toString().trim(),
                    raceName: (row[mapping['raceName']] || '').toString().trim(),
                    notes: (row[mapping['notes']] || '').toString().trim(),
                    approved: true
                });
                importedCount++;
            });

            if (importedCount > 0) {
                saveRecords();
                saveAthletes();
                saveCountries();

                if (filterEvent) filterEvent.value = 'all';
                if (filterGender) filterGender.value = 'all';
                if (filterAge) filterAge.value = 'all';
                if (filterYear) filterYear.value = 'all';

                populateYearDropdown();
                renderReports();
                renderEventList();
                renderAthleteList();

                alert(`Successfully imported ${importedCount} records.`);
            } else {
                alert('No valid records were imported.');
            }
        } catch (err) {
            console.error('Import processing error:', err);
            alert('Error during import processing: ' + err.message);
        }
    }

    function importDatabase() {
        const file = fileRestore.files[0];
        if (!file) return alert('Please select a JSON file first.');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const db = JSON.parse(e.target.result);
                if (!Array.isArray(db.events) || !Array.isArray(db.records)) {
                    throw new Error('Invalid file format. Basic tables missing.');
                }

                const msg = `Found:
            - ${db.records.length} records
        - ${db.athletes ? db.athletes.length : 0} athletes
        - ${db.events.length} events
        - ${db.history ? db.history.length : 0} history entries
        - ${db.users ? db.users.length : 0} users

Replace ALL current data with this backup ? `;

                if (!confirm(msg)) return;

                // Core Tables
                localStorage.setItem('tf_records', JSON.stringify(db.records));
                localStorage.setItem('tf_events', JSON.stringify(db.events));
                localStorage.setItem('tf_athletes', JSON.stringify(db.athletes || []));
                localStorage.setItem('tf_countries', JSON.stringify(db.countries || []));
                localStorage.setItem('tf_history', JSON.stringify(db.history || []));
                localStorage.setItem('tf_users', JSON.stringify(db.users || []));

                // Scoring Tables
                if (db.wma_data) localStorage.setItem('tf_wma_data', JSON.stringify(db.wma_data));
                if (db.iaaf_updates) localStorage.setItem('tf_iaaf_updates', JSON.stringify(db.iaaf_updates));

                // Settings
                if (db.theme) localStorage.setItem('tf_theme', db.theme);
                if (db.seed_version) localStorage.setItem('tf_relays_seed_version', db.seed_version);
                if (db.seeded) localStorage.setItem('tf_relays_seeded', db.seeded);

                alert('Database restored successfully! The page will now reload.');
                location.reload();
            } catch (err) {
                console.error(err);
                alert('Error parsing database file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }


    // --- Stats Logic ---
    let statsSortField = 'count';
    let statsSortOrder = 'desc';

    window.sortStats = function (field) {
        if (statsSortField === field) {
            statsSortOrder = statsSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            statsSortField = field;
            statsSortOrder = field === 'count' ? 'desc' : 'asc';
        }
        renderStats();
    };

    // Expose renderStats globally for HTML attributes
    window.renderStats = renderStats;

    function renderStats() {
        if (!statsTableBody) return;
        statsTableBody.innerHTML = '';

        // Aggregate
        const agg = {};
        records.forEach(r => {
            const ev = events.find(e => e.name === r.event);
            const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));
            if (isRelay) return;

            // --- Approval Logic: Exclude Unapproved Records from Medal Stats ---
            // STRICT check: must be true. Undefined is NOT enough for stats as per "newly migrated" logic?
            // Actually, migration sets undefined -> true. So this is safe.
            if (r.approved !== true) return;

            if (r.athlete) {
                if (!agg[r.athlete]) agg[r.athlete] = { count: 0, minYear: null, maxYear: null };
                agg[r.athlete].count++;
                if (r.date) {
                    const y = new Date(r.date).getFullYear();
                    const currentMin = agg[r.athlete].minYear;
                    const currentMax = agg[r.athlete].maxYear;
                    if (currentMin === null || y < currentMin) agg[r.athlete].minYear = y;
                    if (currentMax === null || y > currentMax) agg[r.athlete].maxYear = y;
                }
            }
        });

        // Populate Name Filter Dropdown
        const nameSelect = document.getElementById('statsFilterName');
        if (nameSelect && nameSelect.options.length <= 1) {
            const allNames = Object.keys(agg).sort();
            allNames.forEach(n => {
                const op = document.createElement('option');
                op.value = n;
                op.textContent = n;
                nameSelect.appendChild(op);
            });
        }

        // Populate Age Category Dropdown (Unique Categories from all data)
        const catSelect = document.getElementById('statsFilterCategory');
        if (catSelect && catSelect.options.length <= 1) {
            const categories = new Set();
            Object.keys(agg).forEach(name => {
                const athlete = athletes.find(a => `${a.lastName}, ${a.firstName} ` === name);
                if (athlete && athlete.dob) {
                    const age = getExactAge(athlete.dob, new Date());
                    if (age !== null && age >= 35) {
                        const cat = (Math.floor(age / 5) * 5).toString(); // No Gender Prefix
                        categories.add(cat);
                    }
                }
            });
            // Sort numeric
            Array.from(categories).sort((a, b) => {
                return parseInt(a) - parseInt(b);
            }).forEach(c => {
                const op = document.createElement('option');
                op.value = c;
                op.textContent = c;
                catSelect.appendChild(op);
            });
        }

        // Filter values (Read once)
        const genderFilterEl = document.getElementById('statsFilterGender');
        const nameFilterEl = document.getElementById('statsFilterName');
        const catFilterEl = document.getElementById('statsFilterCategory');
        const genderFilter = genderFilterEl ? genderFilterEl.value : 'all';
        const nameFilter = nameFilterEl ? nameFilterEl.value : 'all';
        const catFilter = catFilterEl ? catFilterEl.value : 'all';

        // console.log(`Stats Filter - Name: "${nameFilter}", Gender: "${genderFilter}"`);

        // Convert to Array & Enrich
        let statsData = Object.keys(agg).reduce((acc, name) => {
            const athlete = athletes.find(a => `${a.lastName}, ${a.firstName} ` === name);

            // Name Filter (Exact) - If Name is selected, it overrides Gender filter
            if (nameFilter !== 'all') {
                if (name !== nameFilter) return acc;
            } else {
                // Gender Filter (Only check if Name not selected)
                if (genderFilter !== 'all') {
                    if (!athlete || athlete.gender !== genderFilter) return acc;
                }
            }

            const data = agg[name];
            let ratioVal = 0;
            if (data.minYear !== null && data.maxYear !== null && data.count > 0) {
                const diff = data.maxYear - data.minYear;
                if (diff > 0) {
                    // Formula: RecordCount / (MaxYear - MinYear)
                    ratioVal = (data.count / diff) * 100;
                }
            }

            const item = {
                name: name,
                count: data.count,
                ratio: ratioVal.toFixed(2) + '%',
                age: null,
                ageCategory: null,
                generalRank: null,
                ageRank: null,
                ageMedal: '',
                gender: athlete ? athlete.gender : ''
            };

            // Enrich with Age & Category
            if (athlete && athlete.dob) {
                const age = getExactAge(athlete.dob, new Date());
                item.age = age;
                if (age !== null && age >= 35) {
                    // Category Logic: >=35 = 5-year bucket
                    // Prefix: M or W or X based on gender
                    const g = normalizeGenderLookups(item.gender);
                    let prefix = g === 'men' ? 'M' : (g === 'women' ? 'W' : 'X');
                    item.ageCategory = prefix + (Math.floor(age / 5) * 5).toString();
                }
            }

            // Category Filter (Overrides if Name not selected)
            if (catFilter !== 'all' && nameFilter === 'all') {
                if (!item.ageCategory) return acc;
                let itemCat = item.ageCategory.replace(/^[MW]/, '');
                if (itemCat !== catFilter) return acc;
            }

            acc.push(item);
            return acc;
        }, []);

        if (statsData.length === 0) {
            statsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No records found for selected filters.</td></tr>';
            return;
        }

        // --- Calculate Rankings ---


        // 2. General Rank
        // Sort temp array by count desc
        const sortedByCount = [...statsData].sort((a, b) => b.count - a.count);
        sortedByCount.forEach((item, index) => {
            item.generalRank = index + 1;
            if (item.generalRank === 1) item.generalRank += ' 🥇';
            else if (item.generalRank === 2) item.generalRank += ' 🥈';
            else if (item.generalRank === 3) item.generalRank += ' 🥉';
        });

        // 3. Age Category Rank
        // Group by category
        const contentByAge = {};
        statsData.forEach(item => {
            const cat = item.ageCategory || 'Unknown';
            if (!contentByAge[cat]) contentByAge[cat] = [];
            contentByAge[cat].push(item);
        });

        // Rank within groups
        Object.keys(contentByAge).forEach(cat => {
            const group = contentByAge[cat];
            group.sort((a, b) => b.count - a.count);
            group.forEach((item, index) => {
                item.ageRank = index + 1;
                if (item.ageRank === 1) item.ageMedal = '🥇';
                else if (item.ageRank === 2) item.ageMedal = '🥈';
                else if (item.ageRank === 3) item.ageMedal = '🥉';
            });
        });


        // --- Filter by Medal (Post-Ranking) ---
        const medalFilter = document.getElementById('statsFilterMedal') ? document.getElementById('statsFilterMedal').value : 'all';
        // Only apply Medal Filter if Name Filter is NOT active
        if (medalFilter !== 'all' && nameFilter === 'all') {
            statsData = statsData.filter(item => {
                if (medalFilter === 'gold') return item.ageMedal === '🥇';
                if (medalFilter === 'silver') return item.ageMedal === '🥈';
                if (medalFilter === 'bronze') return item.ageMedal === '🥉';
                if (medalFilter === 'any') return item.ageMedal !== '';
                return true;
            });
        }

        if (statsData.length === 0) {
            let msg = 'No athletes found with selected filters.';
            if (nameFilter !== 'all') msg += ` (Name: "${nameFilter}")`;
            statsTableBody.innerHTML = `< tr > <td colspan="5" style="text-align:center;">${msg}</td></tr > `;
            return;
        }


        // --- User Display Sort ---
        statsData.sort((a, b) => {
            let valA = a[statsSortField];
            let valB = b[statsSortField];

            if (statsSortField === 'ratio') {
                valA = parseFloat(valA.replace('%', ''));
                valB = parseFloat(valB.replace('%', ''));
            } else if (statsSortField === 'generalRank' || statsSortField === 'ageRank') {
                // Clean strings (remove medals/whitespace) and parse int
                // If value is just number, parseInt works.
                // If "1 🥇", parseInt("1 🥇") -> 1.
                valA = parseInt(valA.toString());
                valB = parseInt(valB.toString());
            }

            // Case insensitive for names
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return statsSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return statsSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Render
        statsData.forEach((item, index) => {
            const uniqueId = `stats - detail - ${index} `;

            // Age Badge (Existing Logic reused/adjusted)
            let ageDisplay = '';
            if (item.age !== null) {
                ageDisplay = `<span style="background-color: var(--success); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.9em; font-weight: 600; margin-left: 10px; margin-right: 15px;">Age: ${item.age}</span>`;
            }

            // Calculate Year Badges
            // 1. Get records for athlete
            // (Note: redundant filter here, optimize later if slow, strict validation says no redeclaring 'athleteRecords')
            const athleteRecords = records.filter(r => r.athlete === item.name);

            // 2. Group by Year
            const years = {};
            athleteRecords.forEach(r => {
                if (r.date) {
                    const y = new Date(r.date).getFullYear();
                    years[y] = (years[y] || 0) + 1;
                }
            });

            // 3. Sort Years Descending
            const sortedYears = Object.keys(years).sort((a, b) => b - a);

            // 4. Build HTML
            let yearBadgesHtml = '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-left:5px;">';
            sortedYears.forEach(year => {
                yearBadgesHtml += `
                    <div style="
                        position: relative;
                        background-color: var(--primary); /* Blue */
                        border: none;
                        border-radius: 6px;
                        padding: 4px 10px;
                        font-size: 0.9em;
                        color: white;
                        margin-top: 6px;
                        font-weight: 500;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    ">
                        ${year}
                        <div style="
                            position: absolute;
                            top: -10px;
                            right: -10px;
                            background-color: var(--danger); /* Red */
                            color: white;
                            border-radius: 50%;
                            width: 20px;
                            height: 20px;
                            font-size: 0.75em;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: bold;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                            border: 2px solid var(--bg-card); /* Border to separate from year box */
                        ">${years[year]}</div>
                    </div>
                `;
            });
            yearBadgesHtml += '</div>';

            // Age Rank Display
            let ageRankDisplay = '-';
            if (item.ageCategory) {
                ageRankDisplay = `<div style="display:flex; align-items:center; justify-content:flex-end;">
                    <span style="font-weight:bold; margin-right:5px;">${item.ageRank}</span>
                    <span style="font-size:2.5em; margin-right:5px;">${item.ageMedal}</span>
                    <span style="font-size:0.8em; opacity:0.6;">(${item.ageCategory})</span>
                </div>`;
            }

            // General Rank Display with large medal
            let genRankDisplay = item.generalRank;
            if (typeof item.generalRank === 'string' && item.generalRank.includes('🥇')) {
                genRankDisplay = item.generalRank.replace('🥇', '<span style="font-size:2.5em;">🥇</span>');
            } else if (typeof item.generalRank === 'string' && item.generalRank.includes('🥈')) {
                genRankDisplay = item.generalRank.replace('🥈', '<span style="font-size:2.5em;">🥈</span>');
            } else if (typeof item.generalRank === 'string' && item.generalRank.includes('🥉')) {
                genRankDisplay = item.generalRank.replace('🥉', '<span style="font-size:2.5em;">🥉</span>');
            }


            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:center; font-weight:bold; color:var(--text-muted);">${genRankDisplay}</td>
                <td style="font-weight:600; cursor:pointer; color:var(--text-main);" onclick="toggleStatsDetail('${uniqueId}')">
                    <div style="display:flex; align-items:center;">
                        <span>${item.name} <span style="font-size:0.8em; opacity:0.7; margin-left:4px;">▼</span></span>
                        ${ageDisplay}
                    </div>
                    ${yearBadgesHtml}
                </td>
                <td style="text-align:right;">${item.ratio}</td>
                <td style="text-align:right;">${ageRankDisplay}</td>
                <td style="text-align:right; padding-right:15px;">${item.count}</td>
            `;
            statsTableBody.appendChild(tr);

            // Detail Row
            const trDetail = document.createElement('tr');
            trDetail.id = uniqueId;
            trDetail.className = 'hidden';
            // Light blue background for details (using accent color with low opacity)
            trDetail.style.backgroundColor = 'rgba(6, 182, 212, 0.1)';

            // Get records for this athlete (Already fetched above in athleteRecords)
            // Sort by date desc
            athleteRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

            let detailsHtml = `
                <div style="padding: 10px; margin-left: 20px;">
                    <table style="width:100%; font-size: 0.9em; border-collapse: collapse;">
                        <thead style="background: rgba(6, 182, 212, 0.2);">
                            <tr>
                                <th style="padding:4px; text-align:left;">Event</th>
                                <th style="padding:4px; text-align:left;">Age</th>
                                <th style="padding:4px; text-align:left;">Mark</th>
                                <th style="padding:4px; text-align:left;">Date</th>
                                <th style="padding:4px; text-align:left;">Race</th>
                                <th style="padding:4px; text-align:left;">Place</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            athleteRecords.forEach(r => {
                detailsHtml += `
                    <tr>
                        <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.1);">${r.event}</td>
                        <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.1);">${r.ageGroup || '-'}</td>
                        <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.1); text-align:center;"><b>${formatTimeMark(r.mark, r.event)}</b></td>
                        <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.1);">${r.date}</td>
                        <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.1);">${r.raceName || '-'}</td>
                        <td style="padding:4px; border-bottom:1px solid rgba(255,255,255,0.1);">${r.town || r.location || '-'}</td>
                    </tr>
                `;
            });

            detailsHtml += `
                        </tbody>
                    </table>
                </div>
            `;

            trDetail.innerHTML = `
                <td colspan="2" style="padding:0;">${detailsHtml}</td>
            `;
            statsTableBody.appendChild(trDetail);
        });
    }

    window.toggleStatsDetail = function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden');
    };

    // Fallback if needed
    window.addEventListener('load', () => {
        setTimeout(populateYearDropdown, 500);
    });

    // --- IAAF Scoring Tables Logic ---

    // Populate IAAF Event dropdown in Event Creation form
    function populateIAAFEventDropdown() {
        if (!newEventIAAF || !iaafData || iaafData.length === 0) return;

        // Get unique event names from IAAF data
        const uniqueEvents = [...new Set(iaafData.map(d => d.event))].sort();

        // Keep the "None" option
        newEventIAAF.innerHTML = '<option value="">None (No IAAF link)</option>';

        // Add each unique event
        uniqueEvents.forEach(eventName => {
            const option = document.createElement('option');
            option.value = eventName;
            option.textContent = eventName;
            newEventIAAF.appendChild(option);
        });
    }

    function populateWMAEventDropdown() {
        if (!newEventWMA || !wmaData || wmaData.length === 0) return;

        // Get unique event names from WMA data
        const uniqueEvents = [...new Set(wmaData.map(d => d.event))].sort();

        // Keep the "None" option
        newEventWMA.innerHTML = '<option value="">None (No WMA link)</option>';

        // Add each unique event
        uniqueEvents.forEach(eventName => {
            const option = document.createElement('option');
            option.value = eventName;
            option.textContent = eventName;
            newEventWMA.appendChild(option);
        });
    }

    async function loadIAAFData() {
        if (isIAAFDataLoaded) {
            renderIAAFFilters();
            return;
        }

        const loadingIndicator = document.getElementById('iaafLoading');
        const container = document.getElementById('iaafTableContainer');
        // const emptyState = document.querySelector('#setting-iaaf .empty-state'); 

        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        if (container) container.classList.add('hidden');

        // Check if data is already global (from previous load or pre-load)
        if (window.IAAF_SCORING_DATA) {
            iaafData = window.IAAF_SCORING_DATA;
            isIAAFDataLoaded = true;
            rebuildPerformanceIndexes();
            renderIAAFFilters();
            populateIAAFEventDropdown();  // Populate event creation dropdown
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            if (container) container.classList.remove('hidden');
            return;
        }

        // Dynamic Script Injection (Bypasses CORS on local file://)
        const script = document.createElement('script');
        script.src = 'data/iaaf_data.js';

        script.onload = () => {
            if (window.IAAF_SCORING_DATA) {
                iaafData = window.IAAF_SCORING_DATA;
                isIAAFDataLoaded = true;
                rebuildPerformanceIndexes();
                renderIAAFFilters();
                populateIAAFEventDropdown();  // Populate event creation dropdown
            } else {
                alert('Error: Data loaded but variable not found.');
            }
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            if (container) container.classList.remove('hidden');
        };

        script.onerror = (e) => {
            console.error('Script load error:', e);
            // Fallback or error message
            // Maybe try fetch as backup if script fails? Unlikely if file missing.
            alert('Failed to load IAAF Scoring Tables (data/iaaf_data.js). Please ensure the file exists.');
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
        };

        document.body.appendChild(script);
    }

    // Assign to window for HTML access (or keep local if only called from JS)
    // Actually, onchange="renderIAAFFilters()" in HTML needs it to be global OR attached to window.
    // If inside closure, HTML can't see it unless we explicitly attach to window.
    window.renderIAAFFilters = function () {
        if (!isIAAFDataLoaded) return;

        const gender = document.getElementById('iaafFilterGender').value; // men, women
        const eventSelect = document.getElementById('iaafFilterEvent');

        const availableEvents = [...new Set(iaafData
            .filter(d => d.gender === gender)
            .map(d => d.event)
        )].sort();

        // Save current selection if still valid
        const currentEvent = eventSelect.value;
        eventSelect.innerHTML = '<option value="" disabled selected>Select Event...</option>';

        availableEvents.forEach(evt => {
            const option = document.createElement('option');
            option.value = evt;
            option.textContent = evt;
            eventSelect.appendChild(option);
        });

        if (availableEvents.includes(currentEvent)) {
            eventSelect.value = currentEvent;
        } else {
            document.getElementById('iaafTableBody').innerHTML = '';
        }

        renderIAAFTable();
    };

    window.renderIAAFTable = function () {
        // const category = document.getElementById('iaafFilterCategory').value;
        const gender = document.getElementById('iaafFilterGender').value;
        const eventName = document.getElementById('iaafFilterEvent').value;
        const tbody = document.getElementById('iaafTableBody');
        tbody.innerHTML = '';

        if (!eventName) return;

        const records = iaafData
            .filter(d => d.gender === gender && d.event === eventName)
            .sort((a, b) => b.points - a.points); // Sort by points high to low

        const fragment = document.createDocumentFragment();

        records.forEach(r => {
            let mark = r.mark;
            let points = r.points;

            if (iaafUpdates[r.id]) {
                mark = iaafUpdates[r.id].mark !== undefined ? iaafUpdates[r.id].mark : mark;
                points = iaafUpdates[r.id].points !== undefined ? iaafUpdates[r.id].points : points;
            }

            // Round numeric values to 2 decimal places
            if (typeof mark === 'number') mark = Math.round(mark * 100) / 100;
            if (typeof points === 'number') points = Math.round(points * 100) / 100;

            if (iaafUpdates[r.id] && iaafUpdates[r.id].deleted) return; // Skip deleted rows

            const tr = document.createElement('tr');
            tr.dataset.rowId = r.id;
            tr.innerHTML = `
            <td class="iaaf-mark" data-original="${mark}">${mark}</td>
            <td class="iaaf-points" data-original="${points}">${points}</td>
            <td style="text-align:center;" class="iaaf-actions">
                <button class="btn-icon edit" onclick="window.startIAAFEdit(${r.id})" title="Edit">✏️</button>
                <button class="btn-icon delete" onclick="window.deleteIAAFRow(${r.id})" title="Delete Row">🗑️</button>
                ${iaafUpdates[r.id] && !iaafUpdates[r.id].deleted ? `<button class="btn-icon" onclick="window.revertIAAFEdit(${r.id})" title="Revert Changes" style="color:var(--text-muted);">↺</button>` : ''}
            </td>
        `;
            fragment.appendChild(tr);
        });

        tbody.appendChild(fragment);
    };

    window.handleIAAFEdit = function (id, field, value) {
        if (!iaafUpdates[id]) iaafUpdates[id] = {};
        iaafUpdates[id][field] = value;
        saveIAAFUpdates();
        // Don't re-render entire table to keep focus
        // Maybe show Revert button? 
        // We can find the row and update the actions cell?
        // For now, simplicity: Revert button appears on next render or refresh. 
        // Or we can manually append it.
        const btn = document.querySelector(`button[onclick="window.revertIAAFEdit(${id})"]`);
        if (!btn) {
            // force re-render or just let user refresh?
            // Since "Actions" column is updated, we SHOULD re-render row actions.
            // But simpler to just let it save.
            renderIAAFTable();
        }
    };

    // Start editing a row - make cells editable and show Save/Cancel buttons
    window.startIAAFEdit = function (id) {
        const row = document.querySelector(`tr[data-row-id="${id}"]`);
        if (!row) return;

        const markCell = row.querySelector('.iaaf-mark');
        const pointsCell = row.querySelector('.iaaf-points');
        const actionsCell = row.querySelector('.iaaf-actions');

        // Make cells editable
        markCell.contentEditable = 'true';
        pointsCell.contentEditable = 'true';
        markCell.classList.add('editing');
        pointsCell.classList.add('editing');

        // Store original values
        markCell.dataset.editing = markCell.textContent;
        pointsCell.dataset.editing = pointsCell.textContent;

        // Replace action buttons with Save/Cancel
        actionsCell.innerHTML = `
            <button class="btn-icon save" onclick="window.saveIAAFEdit(${id})" title="Save" style="color:var(--success);">✓</button>
            <button class="btn-icon cancel" onclick="window.cancelIAAFEdit(${id})" title="Cancel" style="color:var(--danger);">✗</button>
        `;

        // Focus first cell
        markCell.focus();
    };

    // Save edited values
    window.saveIAAFEdit = function (id) {
        const row = document.querySelector(`tr[data-row-id="${id}"]`);
        if (!row) return;

        const markCell = row.querySelector('.iaaf-mark');
        const pointsCell = row.querySelector('.iaaf-points');

        // Get values and parse as numbers if possible
        let markValue = markCell.textContent.trim();
        let pointsValue = pointsCell.textContent.trim();

        // Try to parse as numbers and round to 2 decimals
        const markNum = parseFloat(markValue);
        const pointsNum = parseFloat(pointsValue);

        if (!isNaN(markNum)) markValue = Math.round(markNum * 100) / 100;
        if (!isNaN(pointsNum)) pointsValue = Math.round(pointsNum * 100) / 100;

        // Save to iaafUpdates
        if (!iaafUpdates[id]) iaafUpdates[id] = {};
        iaafUpdates[id].mark = markValue;
        iaafUpdates[id].points = pointsValue;
        saveIAAFUpdates();

        // Re-render table to show updated values and restore buttons
        renderIAAFTable();
    };

    // Cancel editing - revert to original values
    window.cancelIAAFEdit = function (id) {
        // Just re-render to restore original state
        renderIAAFTable();
    };

    // Delete a row (mark as deleted)
    window.deleteIAAFRow = function (id) {
        if (confirm('Are you sure you want to delete this row?')) {
            if (!iaafUpdates[id]) iaafUpdates[id] = {};
            iaafUpdates[id].deleted = true;
            saveIAAFUpdates();
            renderIAAFTable();
        }
    };

    window.revertIAAFEdit = function (id) {
        if (confirm('Revert this record to original values?')) {
            delete iaafUpdates[id];
            saveIAAFUpdates();
            renderIAAFTable();
        }
    };

    // --- WMA 2023 Conversion Tables Logic ---

    window.renderWMAFilters = function () {
        if (!wmaFilterGender || !wmaFilterAgeGroup || !wmaFilterEvent) return;

        const gender = wmaFilterGender.value;

        // Get unique age groups for this gender
        const ageGroups = [...new Set(wmaData
            .filter(d => d.gender === gender)
            .map(d => d.ageGroup))].sort();

        const currentAgeGroup = wmaFilterAgeGroup.value;
        wmaFilterAgeGroup.innerHTML = '<option value="" disabled selected>Select Age Group...</option>';
        ageGroups.forEach(ag => {
            const opt = document.createElement('option');
            opt.value = ag;
            opt.textContent = ag;
            if (ag === currentAgeGroup) opt.selected = true;
            wmaFilterAgeGroup.appendChild(opt);
        });

        // Get unique events for this gender
        const wmaEvents = [...new Set(wmaData
            .filter(d => d.gender === gender)
            .map(d => d.event))].sort();

        const currentEvent = wmaFilterEvent.value;
        wmaFilterEvent.innerHTML = '<option value="" disabled selected>Select Event...</option>';
        wmaEvents.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e;
            opt.textContent = e;
            if (e === currentEvent) opt.selected = true;
            wmaFilterEvent.appendChild(opt);
        });

        renderWMATable();
    };

    window.renderWMATable = function () {
        if (!wmaTableBody) return;
        wmaTableBody.innerHTML = '';

        const gender = wmaFilterGender.value;
        const ageGroup = wmaFilterAgeGroup.value;
        const event = wmaFilterEvent.value;

        if (!ageGroup || !event) return;

        const filtered = wmaData.filter(d =>
            d.gender === gender && d.ageGroup === ageGroup && d.event === event
        ).sort((a, b) => a.age - b.age);

        filtered.forEach(d => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-wma-id', d.id);

            const isEditing = editingWMAId === d.id;

            if (isEditing) {
                tr.innerHTML = `
                    <td><input type="number" value="${d.age}" class="edit-age" style="width:60px;"></td>
                    <td><input type="number" value="${d.factor}" step="0.00001" class="edit-factor" style="width:100px;"></td>
                    <td style="text-align:center;">
                        <button class="btn-icon save" onclick="window.saveWMAEdit(${d.id})" title="Save">✅</button>
                        <button class="btn-icon cancel" onclick="window.cancelWMAEdit(${d.id})" title="Cancel">❌</button>
                    </td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${d.age}</td>
                    <td>${d.factor.toFixed(5)}</td>
                    <td style="text-align:center;">
                        <button class="btn-icon edit" onclick="window.startWMAEdit(${d.id})" title="Edit">✏️</button>
                        <button class="btn-icon delete" onclick="window.deleteWMARow(${d.id})" title="Delete">🗑️</button>
                    </td>
                `;
            }
            wmaTableBody.appendChild(tr);
        });
    };

    window.startWMAEdit = function (id) {
        editingWMAId = id;
        renderWMATable();
    };

    window.cancelWMAEdit = function () {
        editingWMAId = null;
        renderWMATable();
    };

    window.saveWMAEdit = function (id) {
        const tr = document.querySelector(`tr[data-wma-id="${id}"]`);
        if (!tr) return;

        const newAge = parseInt(tr.querySelector('.edit-age').value);
        const newFactor = parseFloat(tr.querySelector('.edit-factor').value);

        if (isNaN(newAge) || isNaN(newFactor)) {
            alert('Please enter valid numbers');
            return;
        }

        const idx = wmaData.findIndex(d => d.id === id);
        if (idx !== -1) {
            wmaData[idx].age = newAge;
            wmaData[idx].factor = Math.round(newFactor * 100000) / 100000;
            localStorage.setItem('tf_wma_data', JSON.stringify(wmaData));
            rebuildPerformanceIndexes();
        }

        editingWMAId = null;
        renderWMATable();
    };

    window.deleteWMARow = function (id) {
        if (!confirm('Are you sure you want to delete this factor?')) return;
        wmaData = wmaData.filter(d => d.id !== id);
        localStorage.setItem('tf_wma_data', JSON.stringify(wmaData));
        rebuildPerformanceIndexes();
        renderWMATable();
    };

    if (wmaAddForm) {
        wmaAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const age = parseInt(newWMAAge.value);
            const factor = parseFloat(newWMAFactor.value);
            const gender = wmaFilterGender.value;
            const ageGroup = wmaFilterAgeGroup.value;
            const event = wmaFilterEvent.value;

            if (!ageGroup || !event) {
                alert('Please select Age Group and Event filters first');
                return;
            }

            wmaData.push({
                id: Date.now(),
                gender,
                ageGroup,
                event,
                age,
                factor: Math.round(factor * 100000) / 100000
            });

            localStorage.setItem('tf_wma_data', JSON.stringify(wmaData));
            rebuildPerformanceIndexes();
            newWMAAge.value = '';
            newWMAAge.value = '';
            newWMAFactor.value = '';
            renderWMATable();
        });
    }

    // --- Official WMA 2023 Import Logic ---
    function loadWMAOfficialData() {
        if (window.WMA_2023_DATA) {
            if (confirm('This will replace your current WMA factors with the official WMA 2023 data. Continue?')) {
                wmaData = window.WMA_2023_DATA;
                localStorage.setItem('tf_wma_data', JSON.stringify(wmaData));
                renderWMAFilters();
                populateWMAEventDropdown();
                alert('Official WMA 2023 Tables loaded successfully!');
            }
            return;
        }

        const script = document.createElement('script');
        script.src = 'data/wma_data_2023.js';
        script.onload = () => {
            if (window.WMA_2023_DATA) {
                wmaData = window.WMA_2023_DATA;
                localStorage.setItem('tf_wma_data', JSON.stringify(wmaData));
                rebuildPerformanceIndexes();
                renderWMAFilters();
                populateWMAEventDropdown();
            }
        };
        script.onerror = () => alert('Failed to load official WMA 2023 data (data/wma_data_2023.js).');
        document.body.appendChild(script);
    }

    if (btnLoadOfficialWMA) {
        btnLoadOfficialWMA.addEventListener('click', loadWMAOfficialData);
    }

    // Export function to trigger initial load if empty or sample data detected
    window.initWMAOfficialData = function () {
        if (wmaData.length < 10) {
            // Silently try to load if empty
            if (window.WMA_2023_DATA) {
                wmaData = window.WMA_2023_DATA;
                localStorage.setItem('tf_wma_data', JSON.stringify(wmaData));
                renderWMAFilters();
                populateWMAEventDropdown();
            } else {
                const script = document.createElement('script');
                script.src = 'data/wma_data_2023.js';
                script.onload = () => {
                    if (window.WMA_2023_DATA) {
                        wmaData = window.WMA_2023_DATA;
                        localStorage.setItem('tf_wma_data', JSON.stringify(wmaData));
                        rebuildPerformanceIndexes();
                        renderWMAFilters();
                        populateWMAEventDropdown();
                    }
                };
                document.body.appendChild(script);
            }
        }
    };

    function setTheme(themeName) {
        // Apply theme class directly to body
        document.body.className = themeName;

        // Save to localStorage
        localStorage.setItem('tf_theme', themeName);

        // Update selector value if it differs
        if (themeSelect && themeSelect.value !== themeName) {
            themeSelect.value = themeName;
        }
    }

    function runPostLoadMaintenance() {
        console.log("🛠️ Running Post-Load Maintenance (Migrations & Seeding)...");
        let recordsUpdated = false;

        // 1. Core Data Prep
        rebuildPerformanceIndexes();
        if (typeof repairEventMetadata === 'function') repairEventMetadata();

        // 2. Seeding
        if (typeof seedEvents === 'function') seedEvents();
        if (typeof seedCountries === 'function') seedCountries();
        if (typeof seedRecords === 'function') seedRecords();

        // 3. Migrations
        if (typeof migrateAthletes === 'function') migrateAthletes();
        if (typeof migrateAthleteNames === 'function') migrateAthleteNames();
        if (typeof migrateEvents === 'function') migrateEvents();
        if (typeof migrateRecordFormat === 'function') migrateRecordFormat();
        if (typeof migrateAgeGroupsToStartAge === 'function') migrateAgeGroupsToStartAge();
        if (typeof migrateEventDescriptions === 'function') migrateEventDescriptions();
        if (typeof migrateApprovalStatus === 'function') migrateApprovalStatus();

        // Specific Migration: Normalize age groups (e.g. "50-54" -> "50")
        records.forEach(r => {
            if (r.ageGroup && typeof r.ageGroup === 'string' && r.ageGroup.includes('-') && r.ageGroup !== '100+') {
                const parts = r.ageGroup.split('-');
                const ageNum = parseInt(parts[0]);
                if (!isNaN(ageNum)) {
                    r.ageGroup = ageNum.toString();
                    recordsUpdated = true;
                }
            }
        });

        // 4. Cleanup
        if (typeof cleanupDuplicateAthletes === 'function') cleanupDuplicateAthletes();

        // 5. Rendering & UI Population
        renderAll();

        if (recordsUpdated) {
            console.log("💾 Post-Load Maintenance complete. Changes persisted.");
            saveRecords();
        }

        console.log("🚀 System verified and ready for interaction.");
    }

    function initThemes() {
        const savedTheme = localStorage.getItem('tf_theme') || 'theme-default';
        setTheme(savedTheme);
    }

    window.runDiagnostics = async function () {
        console.log("--- Application Diagnostics ---");
        console.log("Protocol:", window.location.protocol);

        const nodes = ['records', 'athletes', 'events', 'countries'];
        nodes.forEach(n => {
            try {
                const local = JSON.parse(localStorage.getItem(`tf_${n}`)) || [];
                console.log(`LocalStorage ${n}:`, local.length);
            } catch (e) {
                console.log(`LocalStorage ${n}: ERROR PARSING`);
            }
        });

        if (typeof firebase !== 'undefined' && typeof db !== 'undefined') {
            console.log("Firebase App initialized.");
            try {
                const sn = await db.ref('records').once('value');
                console.log("Cloud Access: SUCCESS. Records:", sn.exists() ? Object.keys(sn.val()).length : 0);
            } catch (e) {
                console.error("Cloud Access: FAILED.", e.code, e.message);
                if (e.code === 'PERMISSION_DENIED') {
                    alert("Firebase Permission Denied! Please update your Firebase Realtime Database rules to 'Public' or 'Test Mode' in the Firebase Console.");
                }
            }
        } else {
            console.log("Firebase/Database not initialized or configured.");
        }

        try {
            const res = await fetch('track_data.json');
            console.log("track_data.json access:", res.ok ? "SUCCESS" : "FAILED (" + res.status + ")");
        } catch (e) {
            console.log("track_data.json access: FAILED (Likely restricted by local file protocol).");
            console.log("Tip: If running locally without a server, use the 'Restore' button to manually select track_data.json.");
        }
    };


    function migrateApprovalStatus() {
        let changed = false;
        records.forEach(r => {
            // Only migrate if the field is completely MISSING (undefined).
            // Do NOT touch records that are explicitly false (pending).
            if (typeof r.approved === 'undefined') {
                // For legacy records, we assume they are approved.
                r.approved = true;
                changed = true;
            }
        });
        if (changed) {
            saveRecords();
            console.log("Migrated Approval Status: All legacy records set to approved.");
        }
    }

    window.approveRecord = function (id) {
        try {
            const idStr = String(id);
            if (!confirm('Are you sure you want to approve this action?')) return;

            let pendingIndex = pendingrecs.findIndex(r => String(r.id) === idStr);
            let pendingRecord = null;
            let isLegacy = false;

            if (pendingIndex !== -1) {
                pendingRecord = pendingrecs[pendingIndex];
            } else {
                // BACKWARD COMPATIBILITY: Look for legacy pending records stuck in the main `records` table
                const legacyIndex = records.findIndex(r => String(r.id) === idStr && (r.approved === false || r.pendingDelete === true));
                if (legacyIndex !== -1) {
                    pendingRecord = { ...records[legacyIndex] };
                    pendingIndex = legacyIndex;
                    isLegacy = true;

                    // Map legacy architecture flags to new architecture staging flags
                    if (pendingRecord.pendingDelete) {
                        pendingRecord.isPendingDelete = true;
                    } else {
                        pendingRecord.isPending = true;
                    }
                } else {
                    alert("Error: Record not found. It may have already been processed.");
                    return;
                }
            }

            // CASE 1: Approval of a DELETION
            if (pendingRecord.isPendingDelete) {
                const targetId = isLegacy ? String(pendingRecord.id) : String(pendingRecord.replacesId);

                // PERMANENTLY ERASE target record from `records`
                records = records.filter(r => String(r.id) !== targetId);
                recentlyRejected.add(targetId);
                saveTombstones();

                // Remove from staging
                if (!isLegacy) {
                    pendingrecs.splice(pendingIndex, 1);
                    savePendingRecs();
                }
                saveRecords();
                renderReports();
                console.log(`Approved DELETION for record ${targetId}`);
                return;
            }

            // CASE 2: Approval of an EDIT (Replacement)
            if (pendingRecord.replacesId && !isLegacy) {
                const replIdStr = String(pendingRecord.replacesId);
                const originalIndex = records.findIndex(r => String(r.id) === replIdStr);

                if (originalIndex !== -1) {
                    const originalRecord = records[originalIndex];

                    // Archive Original to History
                    const historyRecord = { ...originalRecord };
                    historyRecord.archivedAt = new Date().toISOString();
                    historyRecord.originalId = String(originalRecord.id);
                    historyRecord.id = String(Date.now() + '-' + Math.floor(Math.random() * 10000));
                    if (!historyRecord.updatedBy) historyRecord.updatedBy = 'System';

                    history.unshift(historyRecord);
                    saveHistory();

                    // Tombstone old ID so it doesn't reappear
                    recentlyRejected.add(replIdStr);
                    saveTombstones();

                    // Clean the pending record
                    delete pendingRecord.replacesId;
                    delete pendingRecord.isPending;

                    pendingRecord.approvedBy = currentUser?.email || 'Supervisor';

                    // Swap in the live records array
                    records[originalIndex] = pendingRecord;
                } else {
                    // Failsafe: original record missing, treat as new
                    delete pendingRecord.replacesId;
                    delete pendingRecord.isPending;
                    pendingRecord.approvedBy = currentUser?.email || 'Supervisor';
                    records.unshift(pendingRecord);
                }
            } else {
                // CASE 3: Standard Approval (New Record or Legacy Record)
                delete pendingRecord.isPending;
                pendingRecord.approved = true; // For legacy
                delete pendingRecord.pendingDelete; // For legacy
                pendingRecord.approvedBy = currentUser?.email || 'Supervisor';

                if (isLegacy) {
                    records[pendingIndex] = pendingRecord; // Update in place
                } else {
                    records.unshift(pendingRecord); // Unshift new record
                }
            }

            // Finalize
            if (!isLegacy) {
                pendingrecs.splice(pendingIndex, 1);
                savePendingRecs();
            }
            saveRecords();
            renderReports();
            calculateRecordWMAStats(pendingRecord);
            console.log(`Approved action for record ${idStr}`);

        } catch (error) {
            console.error(error);
            alert("Approve Error: " + error.message);
        }
    };

    window.rejectRecord = function (id) {
        try {
            const idStr = String(id);
            if (!confirm('Are you sure you want to discard this proposal?')) return;

            let removed = false;

            // Check new architecture
            const initialCount = pendingrecs.length;
            pendingrecs = pendingrecs.filter(r => String(r.id) !== idStr);
            if (pendingrecs.length !== initialCount) {
                savePendingRecs();
                removed = true;
            }

            // Check legacy architecture
            const legacyIndex = records.findIndex(r => String(r.id) === idStr && (r.approved === false || r.pendingDelete === true));
            if (legacyIndex !== -1) {
                records.splice(legacyIndex, 1);
                recentlyRejected.add(idStr); // Tombstone legacy cancel
                saveTombstones();
                saveRecords();
                removed = true;
            }

            if (!removed) {
                alert("Error: Record not found. It may have already been processed.");
                return;
            }

            renderReports();
            console.log(`Discarded pending record ${idStr}.`);
        } catch (error) {
            console.error(error);
            alert("Reject Error: " + error.message);
        }
    };


    function saveIAAFUpdates() {
        localStorage.setItem('tf_iaaf_updates', JSON.stringify(iaafUpdates));
    }

    // Connect to Tab System
    // We need to trigger loadIAAFData when the tab is shown.
    // The tab system uses data-subtab="iaaf".
    // I need to find where tabs are switched.
});
