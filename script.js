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
    let wmaSortField = 'pts';
    let wmaSortOrder = 'desc';
    let db = null;

    // --- State & Initial Loading ---
    let records = [];
    let events = [];
    let athletes = [];
    let countries = [];
    let recordHistory = [];
    let appUsers = [];
    let pendingrecs = []; // NEW: Staging area for Admin submissions
    const recentlyRejected = new Set(JSON.parse(localStorage.getItem('tf_tombstones') || '[]'));
    let isAdmin = false;
    let isSuper = false;

    function saveTombstones() {
        // Tombstones are now handled via Firebase 'tombstones' node
        if (db) {
            db.ref('tombstones').set(Array.from(recentlyRejected));
        }
    }

    // --- Data Protection ---
    let isDataReady = false; // Flag to prevent saving over cloud until sync is verified
    const loadedNodes = new Set();
    const CORE_NODES = ['records', 'athletes', 'events', 'countries', 'history', 'users'];
    let isSuppressingAutoFill = false; // Prevents change events from overwriting edit form data
    let isReadOnlyForm = false; // GLOBAL FLAG for Read-Only Modal Mode
    window.currentYearChartType = 'bar'; // Persistence for Statistics Chart Type

    let isManualUpdateMode = false; // Flag to force archival/filtering on manual Updates (🔄)
    const VERSION = "v2.21.017";
    const LAST_UPDATE = "2026-03-01";

    // v2.20.73: Persistent History Sort State
    window.historySortKey = 'archivedAt';
    window.historySortDir = 'desc';

    function hideInitialOverlay() {
        const overlay = document.getElementById('initial-loading-overlay');
        if (overlay && overlay.style.display !== 'none') {
            console.log("🙈 Hiding initial loading overlay...");
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500);
        }
    }

    window.hideInitialOverlay = hideInitialOverlay;

    function checkReady(force = false) {
        if (isDataReady) return;

        const missing = CORE_NODES.filter(n => !loadedNodes.has(n));
        if (missing.length > 0) {
            console.log("⏳ Waiting for sync:", missing.join(', '));
        }

        const isActuallyReady = (loadedNodes.size >= CORE_NODES.length && missing.length === 0);

        if (isActuallyReady || force) {
            if (force && !isActuallyReady) {
                console.warn("⚠️ Initialization FORCED after timeout. Missing nodes:", missing.join(', '));
            }
            console.log("✅ Data Consensus Reached. System is now READY.");
            isDataReady = true;

            // First time render all components
            rebuildPerformanceIndexes();
            populateEventDropdowns();
            populateAthleteDropdown();
            populateAthleteFilter();
            populateHistoryFilters();
            renderReports();
            renderAthleteList();
            renderEventList();
            renderUserList();
            renderWMAReport();

            hideInitialOverlay();
        }
    }
    window.checkReady = (force) => checkReady(force); // Export for timer

    // --- Fast Pass Removed: System now waits for Firebase consensus ---
    console.log("📡 Initializing Cloud-Only Data Model...");

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
    const newAthleteIsTeam = document.getElementById('newAthleteIsTeam');
    const btndeleteAthlete = document.getElementById('btndeleteAthlete');
    const btnToggleAthleteForm = document.getElementById('btnToggleAthleteForm');
    const newAthleteTeamName = document.getElementById('newAthleteTeamName');
    const athleteListBody = document.getElementById('athleteListBody');
    const btnImportAthletes = document.getElementById('btnImportAthletes');
    const athleteImportFile = document.getElementById('athleteImportFile');

    // Athlete Page Filters
    const filterAthleteLast = document.getElementById('filterAthleteLast');
    const filterAthleteFirst = document.getElementById('filterAthleteFirst');
    const filterAthleteDOB = document.getElementById('filterAthleteDOB');
    const filterAthleteGender = document.getElementById('filterAthleteGender');
    const filterAthleteID = document.getElementById('filterAthleteID');

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
    const restrictAthletesOnEdit = document.getElementById('restrictAthletesOnEdit');

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
    let currentSort = { column: 'default', direction: 'asc' };



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
                records = valToArray(snapshot.val());
                console.log("📋 Records loaded from Firebase. Count:", records.length);

                loadedNodes.add('records');
                checkReady();
                if (isDataReady) {
                    renderAll();
                } else {
                    // Populate the year dropdown immediately with records data
                    // (renderAll requires all nodes ready, but year dropdown only needs records)
                    if (typeof populateYearDropdown === 'function') populateYearDropdown();
                }
            } catch (e) {
                console.error("🔥 Error in Validating/Loading Records:", e);
                alert("Data Sync Error: " + e.message);
            }
        });

        // Diagnostic Helper: Expose a function to manually inspect the Firebase snapshot
        window.traceCloudRecords = async function () {
            if (!db) return console.error("Database not initialized");
            console.log("🕵️ Starting Cloud Trace...");
            const snap = await db.ref('records').get();
            const data = snap.val();
            const arr = valToArray(data);
            console.log(`Cloud contains ${arr.length} records.`);
            const recs2026 = arr.filter(r => String(r.date).includes('2026'));
            console.table(recs2026);
            return recs2026;
        };

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

            if (isDataReady) {
                rebuildPerformanceIndexes(); // Rebuild name map for age calc
                populateAthleteDropdown();
                populateAthleteFilter();
                renderAthleteList();
            }
        });

        // Listen for Events
        db.ref('events').on('value', (snapshot) => {
            events = valToArray(snapshot.val());
            console.log("Events updated from Firebase:", events.length);
            loadedNodes.add('events');
            checkReady();

            if (isDataReady) {
                if (events.length > 0) repairEventMetadata(); // Auto-repair on load
                populateEventDropdowns();
                renderEventList();
            }
        });

        // Listen for Countries
        db.ref('countries').on('value', (snapshot) => {
            countries = valToArray(snapshot.val());
            loadedNodes.add('countries');
            checkReady();

            // Populate dropdown immediately so the form is ready even before full isDataReady
            if (typeof populateCountryDropdown === 'function') populateCountryDropdown();
            if (isDataReady) renderCountryList();
        });

        // Listen for History
        db.ref('history').on('value', (snapshot) => {
            recordHistory = valToArray(snapshot.val());
            console.log("History updated from Firebase:", recordHistory.length);
            loadedNodes.add('history');
            checkReady();

            renderHistoryList();
        });

        // Listen for Pending Records
        db.ref('pendingrecs').on('value', (snapshot) => {
            pendingrecs = valToArray(snapshot.val());
            loadedNodes.add('pendingrecs');
            checkReady();
            renderReports(); // Re-render main report to show pending changes

            // Show popup once for supervisor when pending data arrives.
            // For cloud users: auth arrives after data, so updateUIForAuth drives the popup.
            // For local users: renderAll guard handles it.
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
            if (isDataReady) renderUserList();
        });

        // Listen for Stats
        db.ref('stats').on('value', (snapshot) => {
            const val = snapshot.val();
            if (val && val.data) {
                localStorage.setItem('tf_stats', JSON.stringify(val));
                console.log("📊 Persistent Stats updated from Cloud.");
                if (isDataReady && document.getElementById('view-stats').classList.contains('active-view')) {
                    renderStats();
                }
            }
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

        // v2.21.015: Final check once users are loaded
        if (firebase.auth().currentUser && !isUserAllowed(firebase.auth().currentUser.email)) {
            console.warn("User unauthorized after data load. Signing out.");
            alert(`Access Denied: The email ${firebase.auth().currentUser.email} is not authorized.`);
            firebase.auth().signOut();
            return;
        }

        // v2.20.80: Ensure WMA Stats also refreshes if active
        if (typeof renderWMAReport === 'function') {
            const wmaTab = document.getElementById('stats-wma');
            if (wmaTab && wmaTab.classList.contains('active-view')) {
                renderWMAReport();
            }
        }

        // Also populate sub-feature dropdowns
        if (typeof populateIAAFEventDropdown === 'function') populateIAAFEventDropdown();
        if (typeof populateWMAEventDropdown === 'function') populateWMAEventDropdown();

        // Refresh Statistics Charts
        if (typeof window.renderRecordsByYearChart === 'function') window.renderRecordsByYearChart(window.currentYearChartType);

        // Show pending popup once on first full load for supervisor/admin
        if (!renderAll._pendingPopupShown && (isSuper || isAdmin) && typeof showPendingPopup === 'function') {
            renderAll._pendingPopupShown = true;
            setTimeout(() => showPendingPopup(), 600);
        }
    }

    // Migration logic removed: Always trust the current cloud state
    async function migrateLocalToCloud(db) {
        console.log("📡 System in Cloud-Only mode. Skipping local migrations.");
        return;
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

    function getLastName(fullName) {
        if (!fullName) return "";
        if (fullName.includes(',')) {
            return fullName.split(',')[0].trim();
        }
        return fullName.trim();
    }

    // --- Robust Date Helpers ---
    function parseDateRobust(s) {
        if (!s) return new Date(NaN);
        const str = s.toString().trim();

        // Try raw Excel Serial (e.g., 45430)
        if (/^\d{5}$/.test(str)) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            return new Date(excelEpoch.getTime() + parseInt(str) * 86400000);
        }

        // Try YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);

        // Try dd/mm/yyyy OR dd/mm/yy OR dd.mm.yy OR dd-mm-yyyy
        const euroMatch = str.match(/^(\d{1,2})[/\.-](\d{1,2})[/\.-](\d{2,4})/);
        if (euroMatch) {
            const d = parseInt(euroMatch[1], 10);
            const m = parseInt(euroMatch[2], 10);
            let y = parseInt(euroMatch[3], 10);
            if (y < 100) y += (y < 50 ? 2000 : 1900); // Assume 00-49 is 20xx, 50-99 is 19xx
            return new Date(y, m - 1, d);
        }

        // Fallback
        const dObj = new Date(str);
        if (!isNaN(dObj.getTime())) return dObj;

        // Final attempt: search for 4-digit year blindly
        const yearMatch = str.match(/\b(20\d{2}|19\d{2})\b/);
        if (yearMatch) return new Date(yearMatch[1], 0, 1);

        return new Date(NaN);
    }

    function getYearFromDate(dateStr) {
        if (!dateStr) return "";
        const d = parseDateRobust(dateStr);
        if (!isNaN(d.getTime())) return d.getFullYear().toString();

        // Regex fallback as ultimate secondary
        const match = dateStr.toString().match(/\b(20\d{2}|19\d{2})\b/);
        if (match) return match[1];

        // Try loose 2-digit at the end (e.g. DD/MM/YY) safely
        const endYrMatch = dateStr.toString().match(/\b(\d{2})$/);
        if (endYrMatch) {
            let yr = parseInt(endYrMatch[1], 10);
            return (yr < 50 ? 2000 + yr : 1900 + yr).toString();
        }

        return "";
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
        if (!dobStr || !eventDateStr) return null;

        const dob = parseDateRobust(dobStr);
        const evt = parseDateRobust(eventDateStr);
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

    // --- Normalization Helpers (v2.20.31) ---
    window.normalizeAgeGroup = function (val) {
        if (!val) return '';
        // Extract only digits (handles M40, W40, 40, etc.)
        const match = val.toString().match(/\d+/);
        return match ? match[0] : val.toString().trim();
    };

    window.normalizeGender = function (val) {
        if (!val) return '';
        const lower = val.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // English & Standard
        if (lower === 'male' || lower === 'm') return 'Male';
        if (lower === 'female' || lower === 'f') return 'Female';
        if (lower === 'mixed' || lower === 'x') return 'Mixed';
        // Greek support (v2.20.50 - accent insensitive)
        if (lower.includes('ανδ') || lower === 'α') return 'Male';
        if (lower.includes('γυν') || lower === 'γ') return 'Female';
        return val;
    };

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

            updateAthleteDobBadge(athlete);
        } else {
            console.warn(`Could not match athlete for name: "${rawName}"`);
            updateAthleteDobBadge(null);
        }
    };

    function updateAthleteDobBadge(athlete) {
        let dobBadge = document.getElementById('athleteDobBadge');
        let ageBadge = document.getElementById('athleteAgeBadge');
        const athleteLabel = document.getElementById('athleteLabel');
        const ageGroupLabel = document.getElementById('ageGroupLabel');
        const dobBadgeContainer = athleteLabel ? athleteLabel.querySelector('div') : null;

        // Self-Healing Logic: Athlete DOB Badge
        if (athleteLabel && dobBadgeContainer && !dobBadge) {
            console.warn("⚠️ athleteDobBadge missing, re-creating...");
            dobBadge = document.createElement('span');
            dobBadge.id = 'athleteDobBadge';
            dobBadge.className = 'dob-badge hidden';
            dobBadgeContainer.appendChild(dobBadge);
        }

        // Self-Healing Logic: Age Group Badge
        if (ageGroupLabel && !ageBadge) {
            console.warn("⚠️ athleteAgeBadge missing, re-creating...");
            ageBadge = document.createElement('span');
            ageBadge.id = 'athleteAgeBadge';
            ageBadge.className = 'age-group-badge hidden';
            ageGroupLabel.appendChild(ageBadge);
        }

        if (athlete && athlete.dob) {
            const d = parseDateRobust(athlete.dob);
            if (!isNaN(d.getTime())) {
                // DOB Badge
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                if (dobBadge) {
                    dobBadge.textContent = `Date of Birth: ${day}/${month}/${year}`;
                    dobBadge.classList.remove('hidden');
                }

                // Current Age Group Badge (based on today's date)
                const today = new Date().toISOString().split('T')[0];
                const currentAgeGroup = calculateAgeGroup(athlete.dob, today);
                if (ageBadge) {
                    if (currentAgeGroup) {
                        ageBadge.textContent = `Current: ${currentAgeGroup}`;
                        ageBadge.classList.remove('hidden');
                    } else {
                        ageBadge.classList.add('hidden');
                    }
                }
            } else {
                if (dobBadge) dobBadge.classList.add('hidden');
                if (ageBadge) ageBadge.classList.add('hidden');
            }
        } else {
            if (dobBadge) {
                dobBadge.textContent = '';
                dobBadge.classList.add('hidden');
            }
            if (ageBadge) {
                ageBadge.textContent = '';
                ageBadge.classList.add('hidden');
            }
        }
    }

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

        // v2.21.015: If users data hasn't loaded yet, assume allowed to prevent logout on refresh
        if (!loadedNodes.has('users')) return true;

        return appUsers.some(u => (u.email || '').toLowerCase() === email.toLowerCase());
    }

    function getUserRole(email) {
        if (!email) return 'User';
        const lowerEmail = email.toLowerCase();
        if (lowerEmail === 'cha.kons@gmail.com' || lowerEmail === 'admin@greekmasterathletics.com' || lowerEmail === 'support@greekmasterathletics.com') return 'Supervisor';
        if (lowerEmail === 'harryscons@gmail.com') return 'Admin';
        const user = appUsers.find(u => (u.email || '').toLowerCase() === lowerEmail);
        return user ? user.role : 'User';
    }

    function getCurrentUsername() {
        if (!currentUser) return 'Guest';
        const lowerEmail = (currentUser.email || '').toLowerCase();
        if (!lowerEmail) return currentUser.displayName || 'Guest';
        // Match by email in the appUsers table to get the intended display name/username
        const user = appUsers.find(u => (u.email || '').toLowerCase() === lowerEmail);
        if (user && user.name) return user.name;
        return currentUser.displayName || currentUser.email || 'Admin';
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
                const isAllowed = isUserAllowed(user.email);
                const usersLoaded = loadedNodes.has('users');

                if (!isAllowed && usersLoaded) {
                    console.warn(`User ${user.email} is not in the allowed list.`);
                    alert(`Access Denied: The email ${user.email} is not authorized to edit records.`);
                    auth.signOut();
                    return;
                }

                console.log("User logged in:", user.displayName);
                currentUser = user;
                updateUIForAuth(user);
                loadSettingsFromCloud(); // v2.20.68: Fetch cloud preferences

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

    // --- v2.20.68: Settings Synchronization Core ---

    function syncSettingsToCloud() {
        if (!currentUser || !db || isManualSettingsLoading) return;
        const uid = currentUser.uid;
        if (!uid) return;

        const settings = {
            tf_theme: localStorage.getItem('tf_theme') || 'theme-default',
            tf_hide_notes_symbol: localStorage.getItem('tf_hide_notes_symbol') === 'true',
            tf_show_only_modal: localStorage.getItem('tf_show_only_modal') === 'true',
            tf_edit_history_flag: localStorage.getItem('tf_edit_history_flag') !== 'false',
            tf_restrict_athletes_on_edit: localStorage.getItem('tf_restrict_athletes_on_edit') !== 'false',
            tf_history_old_first: localStorage.getItem('tf_history_old_first') !== 'false',
            tf_disable_pending_popup: localStorage.getItem('tf_disable_pending_popup') === 'true',
            tf_pending_popup_role: localStorage.getItem('tf_pending_popup_role') || 'supervisor',
            lastSync: Date.now()
        };

        db.ref(`usersettings/${uid}`).set(settings)
            .then(() => console.log("Settings synced to cloud successfully."))
            .catch(err => console.error("Error syncing settings:", err));
    }

    let isManualSettingsLoading = false; // Guard for loadSettingsFromCloud

    function loadSettingsFromCloud() {
        if (!currentUser || !db) return;
        const uid = currentUser.uid;
        if (!uid) return;

        isManualSettingsLoading = true;
        db.ref(`usersettings/${uid}`).once('value', (snapshot) => {
            const cloudSettings = snapshot.val();
            if (!cloudSettings) {
                isManualSettingsLoading = false;
                return;
            }

            console.log("Loading user settings from cloud...");

            // Apply Theme
            if (cloudSettings.tf_theme) {
                setTheme(cloudSettings.tf_theme, true); // true = skipSync
            }

            // Apply Hide Notes Symbol
            if (cloudSettings.tf_hide_notes_symbol !== undefined) {
                localStorage.setItem('tf_hide_notes_symbol', cloudSettings.tf_hide_notes_symbol);
                const cb = document.getElementById('hideNotesSymbol');
                if (cb) cb.checked = cloudSettings.tf_hide_notes_symbol;
            }

            // Apply Modal Preference
            if (cloudSettings.tf_show_only_modal !== undefined) {
                localStorage.setItem('tf_show_only_modal', cloudSettings.tf_show_only_modal);
                const cb = document.getElementById('showOnlyModal');
                if (cb) cb.checked = cloudSettings.tf_show_only_modal;
                const recordModalEl = document.getElementById('recordModal');
                if (recordModalEl) {
                    if (cloudSettings.tf_show_only_modal) recordModalEl.classList.add('minimal');
                    else recordModalEl.classList.remove('minimal');
                }
            }

            // Apply Edit History Flag
            if (cloudSettings.tf_edit_history_flag !== undefined) {
                localStorage.setItem('tf_edit_history_flag', cloudSettings.tf_edit_history_flag);
                const cb = document.getElementById('editHistorySetting');
                if (cb) cb.checked = cloudSettings.tf_edit_history_flag;
            }

            // Apply Athlete Restriction
            if (cloudSettings.tf_restrict_athletes_on_edit !== undefined) {
                localStorage.setItem('tf_restrict_athletes_on_edit', cloudSettings.tf_restrict_athletes_on_edit ? 'true' : 'false');
                const cb = document.getElementById('restrictAthletesOnEdit');
                if (cb) cb.checked = cloudSettings.tf_restrict_athletes_on_edit;
            }

            // Apply History Sorting
            if (cloudSettings.tf_history_old_first !== undefined) {
                localStorage.setItem('tf_history_old_first', cloudSettings.tf_history_old_first ? 'true' : 'false');
                const cb = document.getElementById('historyOldestFirst');
                if (cb) cb.checked = cloudSettings.tf_history_old_first;
            }

            // Apply Disable Pending Popup
            if (cloudSettings.tf_disable_pending_popup !== undefined) {
                localStorage.setItem('tf_disable_pending_popup', cloudSettings.tf_disable_pending_popup ? 'true' : 'false');
                const cb = document.getElementById('disablePendingPopup');
                if (cb) cb.checked = cloudSettings.tf_disable_pending_popup;
            }

            // Apply Pending Popup Role
            if (cloudSettings.tf_pending_popup_role !== undefined) {
                localStorage.setItem('tf_pending_popup_role', cloudSettings.tf_pending_popup_role);
                const sel = document.getElementById('pendingPopupRole');
                if (sel) sel.value = cloudSettings.tf_pending_popup_role;
            }

            // Final refreshes to apply logic
            renderReports();
            renderHistoryList();
            isManualSettingsLoading = false;
        });
    }

    function updateUIForAuth(user) {
        const role = user ? getUserRole(user.email) : null;

        // Always treat local environment as having Supervisor/Admin access for UI visibility
        const isLocal = isLocalEnvironment();

        isAdmin = role === 'Admin' || role === 'Supervisor' || isLocal;
        isSuper = role === 'Supervisor' || isLocal;

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

        // Specific Visibility for User Management and Data Management (Supervisor only)
        const userManagementBtn = document.getElementById('subtab-users');
        if (userManagementBtn) {
            if (isSuper) userManagementBtn.classList.remove('hidden');
            else userManagementBtn.classList.add('hidden');
        }
        const dataManagementBtn = document.getElementById('subtab-data');
        if (dataManagementBtn) {
            if (isSuper) dataManagementBtn.classList.remove('hidden');
            else dataManagementBtn.classList.add('hidden');
        }

        // Supervisor-only General Settings rows
        const supervisorSettings = ['settingRowHistory', 'settingRowRestrict', 'settingRowSort', 'settingRowPending', 'settingSectionMaintenance'];
        supervisorSettings.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (isSuper) el.classList.remove('hidden');
                else el.classList.add('hidden');
            }
        });

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

        // Add Record Button Visibility
        const btnNewRecord = document.getElementById('btnNewRecordInline');
        if (btnNewRecord) {
            if (isAdmin) btnNewRecord.classList.remove('hidden');
            else btnNewRecord.classList.add('hidden');
        }

        // Specific Visibility for Inline Import (Supervisor only)
        const btnImportInline = document.getElementById('btnImportRecordsInline');
        if (btnImportInline) {
            if (isSuper) btnImportInline.classList.remove('hidden');
            else btnImportInline.classList.add('hidden');
        }

        // For now, let's just disable the Submit button in Log Record
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) submitBtn.disabled = !isAdmin;

        // Show pending popup for cloud supervisor/admin login
        // (local env is covered by renderAll guard)
        if (!isLocalEnvironment()) {
            const tryTriggerPopup = () => {
                if (isSuper || isAdmin) {
                    setTimeout(() => showPendingPopup(), 1000);
                } else if (!loadedNodes.has('users')) {
                    // Wait for users node to load if it hasn't yet, then retry
                    setTimeout(tryTriggerPopup, 500);
                }
            };
            tryTriggerPopup();
        }
    }

    function showPendingPopup() {
        // Respect the "Disable pending popup" setting
        if (localStorage.getItem('tf_disable_pending_popup') === 'true') return;

        // Respect the role setting: 'supervisor' = only isSuper, 'all' = isAdmin or isSuper
        const roleTarget = localStorage.getItem('tf_pending_popup_role') || 'supervisor';
        if (roleTarget === 'supervisor' && !isSuper) return;
        if (roleTarget === 'all' && !isAdmin && !isSuper) return;

        // Use the dedicated pendingrecs array (separate Firebase node)
        let pending = Array.isArray(pendingrecs) ? [...pendingrecs] : [];

        // v2.21.014: If regular Admin (not Supervisor), only show deletions (Hide Additions)
        if (isAdmin && !isSuper) {
            pending = pending.filter(r => r.isPendingDelete);
        }

        if (pending.length === 0) return;

        const overlay = document.getElementById('pendingPopupOverlay');
        const tbody = document.getElementById('pendingPopupTableBody');
        const subtitle = document.getElementById('pendingPopupSubtitle');
        if (!overlay || !tbody) return;

        // Apply minimal (no-blur) mode consistent with the showOnlyModal setting
        if (localStorage.getItem('tf_show_only_modal') === 'true') {
            overlay.classList.add('minimal');
        } else {
            overlay.classList.remove('minimal');
        }

        subtitle.textContent = `${pending.length} record${pending.length !== 1 ? 's' : ''} awaiting your approval`;

        tbody.innerHTML = pending.map(r => {
            const type = r.isPendingDelete ? '<span style="color:#ef4444;font-weight:700;">🗑 Διαγραφή</span>' : '<span style="color:#16a34a;font-weight:700;">➕ Προσθήκη</span>';
            const athlete = r.athlete || '-';
            const event = r.event || '-';
            const mark = r.mark || '-';
            const date = r.date || '-';
            return `<tr>
                <td style="padding:0.45rem 0.75rem;">${athlete}</td>
                <td style="padding:0.45rem 0.75rem;">${event}</td>
                <td style="padding:0.45rem 0.75rem;font-weight:700;">${mark}</td>
                <td style="padding:0.45rem 0.75rem;">${date}</td>
                <td style="padding:0.45rem 0.75rem;">${type}</td>
            </tr>`;
        }).join('');

        overlay.classList.remove('hidden');
    }


    function loadLocalDataOnly() {
        console.log("Loading data from LocalStorage fallback...");
        isDataReady = true;
        rebuildPerformanceIndexes();
        renderAll();
        hideInitialOverlay(); // v2.20.92: Fix - Ensure overlay hides on fallback
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
                // v2.20.92: Global Initialization Failsafe
                // High-level timeout to ensure app opens even if all internal timers fail
                setTimeout(() => {
                    if (!isDataReady) {
                        console.error("🏁 Global Initialization Failsafe Triggered!");
                        checkReady(true);
                    }
                }, 15000);
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
                rebuildPerformanceIndexes();
                renderAll();
            }
        }, 5000);

        // General Settings Init
        if (hideNotesSymbol) {
            hideNotesSymbol.checked = localStorage.getItem('tf_hide_notes_symbol') === 'true';
            hideNotesSymbol.addEventListener('change', () => {
                localStorage.setItem('tf_hide_notes_symbol', hideNotesSymbol.checked);
                renderReports();
                syncSettingsToCloud();
            });
        }

        const showOnlyModalSetting = document.getElementById('showOnlyModal');
        const recordModalEl = document.getElementById('recordModal');
        if (showOnlyModalSetting && recordModalEl) {
            const isMinimal = localStorage.getItem('tf_show_only_modal') === 'true';
            showOnlyModalSetting.checked = isMinimal;

            // Helper: apply minimal class to all modal overlays
            const applyMinimalToAll = (enabled) => {
                const modals = [recordModalEl, document.getElementById('pendingPopupOverlay')];
                modals.forEach(m => {
                    if (!m) return;
                    if (enabled) m.classList.add('minimal');
                    else m.classList.remove('minimal');
                });
            };

            applyMinimalToAll(isMinimal);

            showOnlyModalSetting.addEventListener('change', () => {
                localStorage.setItem('tf_show_only_modal', showOnlyModalSetting.checked);
                applyMinimalToAll(showOnlyModalSetting.checked);
                syncSettingsToCloud();
            });
        }

        const editHistorySetting = document.getElementById('editHistorySetting');
        if (editHistorySetting) {
            const isEnabled = localStorage.getItem('tf_edit_history_flag') !== 'false'; // Default TRUE
            editHistorySetting.checked = isEnabled;
            editHistorySetting.addEventListener('change', () => {
                localStorage.setItem('tf_edit_history_flag', editHistorySetting.checked);
                syncSettingsToCloud();
            });
        }

        if (restrictAthletesOnEdit) {
            let isRestricted = localStorage.getItem('tf_restrict_athletes_on_edit');
            if (isRestricted === null) {
                isRestricted = 'true'; // Default TRUE v2.20.33
                localStorage.setItem('tf_restrict_athletes_on_edit', 'true');
            }
            restrictAthletesOnEdit.checked = (isRestricted === 'true');
            restrictAthletesOnEdit.addEventListener('change', () => {
                localStorage.setItem('tf_restrict_athletes_on_edit', restrictAthletesOnEdit.checked);
                syncSettingsToCloud();
            });
        }

        const historyOldestFirstBtn = document.getElementById('historyOldestFirst');
        if (historyOldestFirstBtn) {
            const isEnabled = localStorage.getItem('tf_history_old_first') !== 'false'; // Default TRUE
            historyOldestFirstBtn.checked = isEnabled;
            historyOldestFirstBtn.addEventListener('change', () => {
                localStorage.setItem('tf_history_old_first', historyOldestFirstBtn.checked);
                renderHistoryList();
                syncSettingsToCloud();
            });
        }

        // Disable Pending Popup + Role selector
        const disablePendingPopupCb = document.getElementById('disablePendingPopup');
        const pendingPopupRoleSel = document.getElementById('pendingPopupRole');

        const syncPopupDropdownState = () => {
            const label = document.getElementById('pendingPopupRoleLabel');
            if (pendingPopupRoleSel) {
                const disabled = disablePendingPopupCb && disablePendingPopupCb.checked;
                pendingPopupRoleSel.disabled = disabled;
                pendingPopupRoleSel.style.opacity = disabled ? '0.4' : '1';
                pendingPopupRoleSel.style.cursor = disabled ? 'not-allowed' : 'pointer';
                if (label) label.style.opacity = disabled ? '0.4' : '1';
            }
        };

        if (disablePendingPopupCb) {
            disablePendingPopupCb.checked = localStorage.getItem('tf_disable_pending_popup') === 'true';
            syncPopupDropdownState();
            disablePendingPopupCb.addEventListener('change', () => {
                localStorage.setItem('tf_disable_pending_popup', disablePendingPopupCb.checked);
                syncPopupDropdownState();
                syncSettingsToCloud();
            });
        }

        if (pendingPopupRoleSel) {
            pendingPopupRoleSel.value = localStorage.getItem('tf_pending_popup_role') || 'supervisor';
            pendingPopupRoleSel.addEventListener('change', () => {
                localStorage.setItem('tf_pending_popup_role', pendingPopupRoleSel.value);
                syncSettingsToCloud();
            });
        }


        // Pending popup close buttons
        ['closePendingPopup', 'closePendingPopupBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => {
                const overlay = document.getElementById('pendingPopupOverlay');
                if (overlay) overlay.classList.add('hidden');
            });
        });

        const goToLogBtn = document.getElementById('pendingPopupGoToLog');
        if (goToLogBtn) {
            goToLogBtn.addEventListener('click', () => {
                const overlay = document.getElementById('pendingPopupOverlay');
                if (overlay) overlay.classList.add('hidden');
                // Switch to the log/pending tab
                const logTab = document.querySelector('.nav-tab[data-tab="log"]');
                if (logTab) logTab.click();
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
                            // 🛡️ V2.20.30/33: Refresh athlete list during edit if date changes
                            const isRestrictedVal = localStorage.getItem('tf_restrict_athletes_on_edit');
                            const isRestricted = (isRestrictedVal === 'true' || isRestrictedVal === null);

                            if (editingId && !isReadOnlyForm) {
                                const r = records.find(item => String(item.id) === String(editingId));
                                if (r) {
                                    const filterObj = { gender: r.gender, date: dateStr };
                                    if (isUpdateFlow && isRestricted) {
                                        filterObj.ageGroup = r.ageGroup;
                                    }
                                    populateAthleteDropdown(filterObj);
                                }
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

                const newId = generate6DigitId();
                athletes.push({
                    id: newId,
                    idNumber: newId,
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

    function generate6DigitId() {
        if (!athletes || athletes.length === 0) return "100001";

        let maxId = 100000;
        athletes.forEach(a => {
            const currentId = parseInt(a.idNumber || a.id);
            if (!isNaN(currentId) && currentId > maxId && currentId < 1000000) {
                maxId = currentId;
            }
        });
        return (maxId + 1).toString();
    }

    function standardizeAthleteIdsAlpha() {
        if (localStorage.getItem('tf_ids_standardized_v2') === 'true') return;

        console.log("Starting Sequential Alphabetical ID Standardization...");

        // 1. Sort athletes alphabetically by Last Name then First Name
        athletes.sort((a, b) => {
            const lastA = (a.lastName || '').trim().toLowerCase();
            const lastB = (b.lastName || '').trim().toLowerCase();
            if (lastA < lastB) return -1;
            if (lastA > lastB) return 1;

            const firstA = (a.firstName || '').trim().toLowerCase();
            const firstB = (b.firstName || '').trim().toLowerCase();
            if (firstA < firstB) return -1;
            if (firstA > firstB) return 1;
            return 0;
        });

        // 2. Reassign IDs starting from 100001
        athletes.forEach((a, index) => {
            const newId = (100001 + index).toString();
            a.id = newId;
            a.idNumber = newId;
        });

        saveAthletes();
        localStorage.setItem('tf_ids_standardized_v2', 'true');
        console.log(`Reassigned sequential IDs to ${athletes.length} athletes.`);
    }

    function migrateAthleteIds() {
        // v1 migration (legacy random 6-digit)
        if (localStorage.getItem('tf_ids_standardized_v1') === 'true') {
            // If already v1, we still want to run v2
            standardizeAthleteIdsAlpha();
            return;
        }

        console.log("Starting Athlete ID Standardization (random 6-digit)...");
        let migratedCount = 0;

        athletes.forEach(a => {
            const isAlready6Digit = /^\d{6}$/.test(a.id.toString());
            if (!isAlready6Digit) {
                const newId = Math.floor(100000 + Math.random() * 900000).toString();
                a.id = newId;
                a.idNumber = newId;
                migratedCount++;
            } else if (!a.idNumber) {
                a.idNumber = a.id.toString();
            }
        });

        if (migratedCount > 0) {
            console.log(`Standardized IDs for ${migratedCount} athletes.`);
            saveAthletes();
        }

        localStorage.setItem('tf_ids_standardized_v1', 'true');

        // Chain to the new sequential alphabetical migration
        standardizeAthleteIdsAlpha();
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
        const years = new Set();
        const currentYear = new Date().getFullYear();
        years.add(currentYear);

        records.forEach(r => {
            const y = getYearFromDate(r.date);
            if (y) {
                const parsedYear = parseInt(y);
                if (!isNaN(parsedYear)) {
                    years.add(parsedYear);
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


    function populateAthleteDropdown(filterObj = null) {
        let filteredAthletes = [...athletes];

        if (filterObj) {
            filteredAthletes = filteredAthletes.filter(a => {
                // 1. Gender check (Normalized v2.20.31)
                const targetGender = normalizeGender(filterObj.gender);
                const athleteGender = normalizeGender(a.gender);
                if (targetGender && athleteGender !== targetGender) return false;

                // 2. Age Group check (Normalized v2.20.31)
                if (filterObj.ageGroup && filterObj.date) {
                    const targetGroup = normalizeAgeGroup(filterObj.ageGroup);
                    const calculated = calculateAgeGroup(a.dob, filterObj.date);
                    const normalizedCalc = normalizeAgeGroup(calculated);
                    if (normalizedCalc !== targetGroup) return false;
                }

                return true;
            });
            console.log(`Filtered athlete list reduced to ${filteredAthletes.length} matching entries.`);
        }

        filteredAthletes.sort((a, b) => {
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
            filteredAthletes.forEach(a => {
                const opt = document.createElement('option');
                const idText = a.idNumber ? ` (#${a.idNumber})` : '';
                if (a.isTeam) {
                    opt.textContent = `${a.teamName || 'Unnamed Team'}${idText} [TEAM]`;
                    opt.value = a.teamName || '';
                } else {
                    opt.textContent = `${a.lastName}${a.lastName ? ', ' : ''}${a.firstName}${idText}`;
                    opt.value = `${a.lastName}, ${a.firstName}`;
                }
                opt.dataset.id = a.id;
                athleteInput.appendChild(opt);
            });
            if (currentVal) athleteInput.value = currentVal;
        }

        // Also populate relay participant dropdowns with default state
        populateRelayAthletes(genderInput ? genderInput.value : '');
    }

    function populateRelayAthletes(gender) {
        // No guard here, let it populate initially. Interaction is blocked by shield.
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
                bypassAgeValidation = true; // Set bypass flag
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

        if (athleteForm) {
            athleteForm.addEventListener('submit', handleAthleteSubmit);
            // Default requirements for individual athletes
            newAthleteFirstName.required = true;
            newAthleteLastName.required = true;
            // newAthleteDOB is not required to allow custom confirmation flow
            newAthleteDOB.required = false;
        }

        if (btnToggleAthleteForm) {
            btnToggleAthleteForm.addEventListener('click', () => {
                const isHidden = athleteForm.classList.toggle('hidden');
                // Do not change button text to "Hide Form" as per user request
                btnToggleAthleteForm.innerHTML = '<span>➕ Add New Athlete</span>';

                // If opening the form, treat it as "Add New" and reset everything
                if (!isHidden) {
                    editingAthleteId = null;
                    newAthleteID.value = '';
                    newAthleteFirstName.value = '';
                    newAthleteLastName.value = '';
                    if (dobPicker) dobPicker.clear();
                    else newAthleteDOB.value = '';
                    newAthleteGender.value = '';
                    // Hide DOB warning when opening form
                    const dobWarning = document.getElementById('athleteDobWarning');
                    if (dobWarning) dobWarning.classList.add('hidden');

                    if (athleteSubmitBtn) {
                        athleteSubmitBtn.innerHTML = '<span>+ Save Athlete</span>';
                        athleteSubmitBtn.style.background = '';
                    }
                    newAthleteFirstName.focus();
                }
            });
        }

        // Athlete filtering event listeners
        [filterAthleteLast, filterAthleteFirst, filterAthleteDOB, filterAthleteID].forEach(el => {
            if (el) el.addEventListener('input', renderAthleteList);
        });
        if (filterAthleteGender) filterAthleteGender.addEventListener('change', renderAthleteList);

        newAthleteDOB.required = false;
        newAthleteFirstName.required = true;
        newAthleteLastName.required = true;
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

    // 🔒 ROBUST MARK LOCKDOWN (v2.20.27): Character-Scan & Predictive Validation
    window.sanitizeMarkValue = function (val) {
        if (!val) return '';
        let sanitized = val.replace(/[^0-9.,:]/g, '');
        let result = '';
        let colonCount = 0, commaCount = 0, dotCount = 0;
        let lastWasSymbol = false;
        let digitsAfterSymbol = 0;
        let inSubMark = false;

        for (let i = 0; i < sanitized.length; i++) {
            let char = sanitized[i];
            if (/[.,:]/.test(char)) {
                // Prevent consecutive symbols
                if (lastWasSymbol) continue;
                // Enforce maximum counts
                if (char === ':' && colonCount >= 1) continue;
                if (char === ',' && commaCount >= 1) continue;
                if (char === '.' && dotCount >= 3) continue;

                result += char;
                if (char === ':') colonCount++;
                if (char === ',') commaCount++;
                if (char === '.') dotCount++;

                lastWasSymbol = true;
                inSubMark = true;
                digitsAfterSymbol = 0;
            } else {
                // Digit
                if (inSubMark) {
                    if (digitsAfterSymbol < 2) {
                        result += char;
                        digitsAfterSymbol++;
                    }
                } else {
                    result += char;
                }
                lastWasSymbol = false;
            }
        }
        return result;
    };

    document.addEventListener('keydown', (e) => {
        if (!e.target || e.target.id !== 'mark') return;

        // Allow control keys
        if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;

        const key = e.key;
        if (!/[0-9.,:]/.test(key)) {
            e.preventDefault();
            return;
        }

        const input = e.target;
        const val = input.value;
        const start = input.selectionStart;
        const end = input.selectionEnd;

        // --- PREDICTIVE CHECK ---
        const projected = val.substring(0, start) + key + val.substring(end);
        const sanitized = window.sanitizeMarkValue(projected);

        // If the sanitizer rejects the key or truncates the result, block it
        if (sanitized.length < projected.length) {
            e.preventDefault();
            return;
        }
    }, true);

    document.addEventListener('input', (e) => {
        if (!e.target || e.target.id !== 'mark') return;
        const original = e.target.value;
        const sanitized = window.sanitizeMarkValue(original);
        if (original !== sanitized) {
            e.target.value = sanitized;
        }
    }, true);

    document.addEventListener('paste', (e) => {
        if (!e.target || e.target.id !== 'mark') return;
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        const sanitized = window.sanitizeMarkValue(text);

        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const currentVal = e.target.value;

        const nextVal = window.sanitizeMarkValue(currentVal.substring(0, start) + sanitized + currentVal.substring(end));
        e.target.value = nextVal;

        const newPos = start + sanitized.length;
        e.target.setSelectionRange(newPos, newPos);
    }, true);

    document.addEventListener('beforeinput', (e) => {
        if (!e.target || e.target.id !== 'mark') return;
        if (e.data && !/^[0-9.,:]+$/.test(e.data)) e.preventDefault();
    }, true);

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
            const updateBtn = e.target.closest('.update-btn');
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
            if (updateBtn) editRecord(updateBtn.dataset.id, true);
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

    // Event Management Toggling
    const btnNewEvent = document.getElementById('btnNewEvent');
    const btnCancelEvent = document.getElementById('btnCancelEvent');
    if (btnNewEvent) {
        btnNewEvent.addEventListener('click', () => {
            eventForm.style.display = 'block';
            editingEventId = null;
            eventForm.reset();
            if (eventSubmitBtn) eventSubmitBtn.querySelector('span').textContent = '+ Add Event';
            btnNewEvent.style.display = 'none';
        });
    }
    if (btnCancelEvent) {
        btnCancelEvent.addEventListener('click', cancelEventEdit);
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
            if (delBtn) deleteHistory(delBtn.dataset.id);
            if (editBtn) editHistory(editBtn.dataset.id);
        });

        // v2.20.73: History Header Sorting Listeners
        const historyTable = historyListBody.closest('table');
        if (historyTable) {
            historyTable.querySelectorAll('thead th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    const key = th.dataset.sortKey;
                    if (window.historySortKey === key) {
                        window.historySortDir = window.historySortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        window.historySortKey = key;
                        window.historySortDir = 'asc';
                    }
                    renderHistoryList();
                });
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
            else switchStatsSubTab('records-by-year');
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

        if (subTabId === 'records-by-year') renderRecordsByYearChart();
        if (subTabId === 'medals') renderStats();
        if (subTabId === 'wma') {
            loadIAAFData();
            initWMAOfficialData();
            populateWMAReportFilters();
            renderWMAReport();
        }
        if (subTabId === 'rankings') {
            loadIAAFData();
            initWMAOfficialData();
            renderRankings();
        }
    }

    // ─── RECORDS BY YEAR CHART ───────────────────────────────────────────────────
    let recordsByYearChart = null;

    window.renderRecordsByYearChart = function (type = "bar") {
        try {
            window.currentYearChartType = type; // Persist for refreshes
            const canvas = document.getElementById("recordsByYearCanvas");
            if (!canvas) return;
            if (typeof Chart === "undefined") {
                console.warn("📊 Chart.js not loaded yet. Retrying in 1s...");
                setTimeout(() => window.renderRecordsByYearChart(type), 1000);
                return;
            }
            if (recordsByYearChart) recordsByYearChart.destroy();
            const yearCounts = {};
            records.forEach(rec => {
                const year = getYearFromDate(rec.date);
                if (year && !isNaN(year)) yearCounts[year] = (yearCounts[year] || 0) + 1;
            });
            const sortedYears = Object.keys(yearCounts).sort((a, b) => parseInt(a) - parseInt(b));
            const recordData = sortedYears.map(y => yearCounts[y]);
            if (sortedYears.length === 0) return;

            const ctx = canvas.getContext("2d");
            const primaryColor = getComputedStyle(document.body).getPropertyValue("--primary").trim() || "#8b5cf6";
            const accentColor = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#06b6d4";

            // Multi-color palette for bar charts
            const palette = [
                '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
                '#06b6d4', '#ef4444', '#84cc16', '#a855f7', '#f97316'
            ];
            const barColors = sortedYears.map((_, i) => palette[i % palette.length]);

            recordsByYearChart = new Chart(ctx, {
                type: type,
                data: {
                    labels: sortedYears,
                    datasets: [{
                        label: "Number of Records",
                        data: recordData,
                        backgroundColor: type === "bar" ? barColors.map(c => c + "90") : primaryColor + "40",
                        borderColor: type === "bar" ? barColors : primaryColor,
                        borderWidth: 2,
                        pointBackgroundColor: type === "bar" ? barColors : accentColor,
                        pointBorderColor: "#fff",
                        pointRadius: type === "line" ? 5 : 0,
                        tension: 0.3,
                        fill: type === "line"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: "rgba(30, 41, 59, 0.9)",
                            titleColor: "#fff",
                            bodyColor: "#fff",
                            padding: 12,
                            cornerRadius: 8
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "rgba(255,255,255,0.7)", stepSize: 1 },
                            grid: { color: "rgba(255,255,255,0.1)" }
                        },
                        x: {
                            ticks: { color: getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "rgba(255,255,255,0.7)" },
                            grid: { display: false }
                        }
                    }
                }
            });
        } catch (e) {
            console.error("❌ Error rendering Records by Year chart:", e);
        }
    }
    // ─── RANKINGS ───────────────────────────────────────────────────────────────
    let rankingsSortField = 'bestPts';
    let rankingsSortOrder = 'desc';

    window.sortRankings = function (field) {
        if (rankingsSortField === field) {
            rankingsSortOrder = rankingsSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            rankingsSortField = field;
            rankingsSortOrder = field === 'name' ? 'asc' : 'desc';
        }
        renderRankings();
    };

    window.renderRankings = function (retryCount = 0) {
        const tbody = document.getElementById('rankingsTableBody');
        if (!tbody) return;

        // Wait for both WMA and IAAF data to be ready (both load async via script tags)
        const wmaReady = window.WMA_2023_DATA && window.WMA_2023_DATA.length > 0;
        const iaafReady = window.IAAF_SCORING_DATA && window.IAAF_SCORING_DATA.length > 0;
        if ((!wmaReady || !iaafReady) && retryCount < 10) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">⏳ Loading WMA data…</td></tr>';
            setTimeout(() => renderRankings(retryCount + 1), 500);
            return;
        }

        // Ensure WMA official table is initialised before scoring
        initWMAOfficialData();

        tbody.innerHTML = '';

        const archivedIds = new Set(recordHistory.map(h => String(h.originalId)).filter(id => id && id !== 'undefined'));

        // Filter approved, non-relay records with valid WMA points
        const fTrackType = document.getElementById('rankingsFilterTrackType')?.value || 'all';

        const eligible = records.filter(r => {
            const rIdStr = String(r.id);
            if (!r.athlete || !r.mark) return false;
            if (r.approved === false) return false;
            if (archivedIds.has(rIdStr)) return false;

            const ev = events.find(e => e.name === r.event);
            const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));
            if (isRelay) return false;

            if (fTrackType !== 'all') {
                if ((r.trackType || 'Outdoor') !== fTrackType) return false;
            }
            return true;
        }).map(r => calculateRecordWMAStats({ ...r }));

        // Aggregate per athlete
        const agg = {};
        eligible.forEach(r => {
            const pts = parseFloat(r.wmaPoints);
            if (isNaN(pts) || pts <= 0) return;
            if (!agg[r.athlete]) {
                const ath = athleteLookupMap[r.athlete];
                const g = ath ? ath.gender : (r.gender || '');
                agg[r.athlete] = { name: r.athlete, gender: g, ageGroup: '-', bestPtsVal: -1, pts: [], count: 0 };
            }
            agg[r.athlete].pts.push(pts);
            agg[r.athlete].count++;
            // Age group = age group of the record with the highest WMA pts
            if (pts > agg[r.athlete].bestPtsVal) {
                agg[r.athlete].bestPtsVal = pts;
                agg[r.athlete].ageGroup = r.ageGroup || '-';
            }
        });

        let data = Object.values(agg).map(item => ({
            ...item,
            bestPts: Math.max(...item.pts),
            avgPts: item.pts.reduce((s, v) => s + v, 0) / item.pts.length
        }));

        // Populate filters
        const nameEl = document.getElementById('rankingsFilterName');
        const ageEl = document.getElementById('rankingsFilterAgeGroup');
        if (nameEl && nameEl.options.length <= 1) {
            [...new Set(data.map(d => d.name))].sort().forEach(n => {
                const o = document.createElement('option'); o.value = n; o.textContent = n;
                nameEl.appendChild(o);
            });
        }
        if (ageEl && ageEl.options.length <= 1) {
            [...new Set(data.map(d => d.ageGroup).filter(Boolean))]
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach(ag => {
                    const o = document.createElement('option'); o.value = ag; o.textContent = ag;
                    ageEl.appendChild(o);
                });
        }

        // Apply filters
        const fName = nameEl ? nameEl.value : 'all';
        const fGender = document.getElementById('rankingsFilterGender')?.value || 'all';
        const fAge = ageEl ? ageEl.value : 'all';

        if (fName !== 'all') data = data.filter(d => d.name === fName);
        if (fGender !== 'all') data = data.filter(d => d.gender === fGender);
        if (fAge !== 'all') data = data.filter(d => d.ageGroup === fAge);

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No WMA data found for selected filters.</td></tr>';
            return;
        }

        // Sort
        data.sort((a, b) => {
            let vA = a[rankingsSortField], vB = b[rankingsSortField];
            if (rankingsSortField === 'name' || rankingsSortField === 'gender' || rankingsSortField === 'ageGroup') {
                vA = (vA || '').toLowerCase(); vB = (vB || '').toLowerCase();
            } else {
                vA = parseFloat(vA) || 0; vB = parseFloat(vB) || 0;
            }
            if (vA < vB) return rankingsSortOrder === 'asc' ? -1 : 1;
            if (vA > vB) return rankingsSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        const medals = ['🥇', '🥈', '🥉'];

        // Update column headers with sort indicators
        const colDefs = [
            { field: 'rank', label: '#', align: 'center', width: '6%' },
            { field: 'name', label: 'Athlete', align: 'left', width: '' },
            { field: 'gender', label: 'Gender', align: 'left', width: '10%' },
            { field: 'ageGroup', label: 'Age Group', align: 'left', width: '12%' },
            { field: 'bestPts', label: 'Best WMA Pts', align: 'right', width: '13%' },
            { field: 'avgPts', label: 'Avg WMA Pts', align: 'right', width: '13%' },
            { field: 'count', label: 'Records', align: 'right', width: '10%' },
        ];
        const thead = tbody.closest('table').querySelector('thead tr');
        if (thead) {
            thead.innerHTML = colDefs.map(col => {
                const active = col.field === rankingsSortField;
                const alignStyle = col.align === 'right' ? 'text-align:right;' : (col.align === 'center' ? 'text-align:center;' : '');
                const widthStyle = col.width ? `width:${col.width};` : '';
                const activeStyle = active ? 'color:var(--accent);' : '';
                const sortClass = active ? (rankingsSortOrder === 'asc' ? 'sortable asc' : 'sortable desc') : 'sortable';
                return `<th onclick="sortRankings('${col.field}')" class="${sortClass}" style="${widthStyle} ${alignStyle} ${activeStyle}">${col.label}</th>`;
            }).join('');
        }

        data.forEach((item, idx) => {
            const rank = idx + 1;
            const rankDisplay = rank <= 3 ? `${rank} ${medals[rank - 1]}` : rank;
            const genderLabel = item.gender === 'Male' ? 'Άνδρες' : (item.gender === 'Female' ? 'Γυναίκες' : (item.gender || '-'));
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="#">${rankDisplay}</td>
                <td data-label="Athlete" style="font-weight:600;">${item.name}</td>
                <td data-label="Gender">${genderLabel}</td>
                <td data-label="Age Group">${item.ageGroup || '-'}</td>
                <td data-label="Best WMA Pts" style="text-align:right;"><b>${item.bestPts.toFixed(2)}</b></td>
                <td data-label="Avg WMA Pts" style="text-align:right;">${item.avgPts.toFixed(2)}</td>
                <td data-label="Records" style="text-align:right;">${item.count}</td>
            `;
            tbody.appendChild(tr);
        });
    };

    function populateWMAReportFilters() {
        // Current selections
        const selEvent = document.getElementById('wmaReportFilterEvent')?.value || 'all';
        const selAthlete = document.getElementById('wmaReportFilterAthlete')?.value || 'all';
        const selGender = document.getElementById('wmaReportFilterGender')?.value || 'all';
        const selAgeGroup = document.getElementById('wmaReportFilterAgeGroup')?.value || 'all';
        const selYear = document.getElementById('wmaReportFilterYear')?.value || 'all';
        const selTrackType = document.getElementById('wmaReportFilterTrackType')?.value || 'all';

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
                const athleteObj = athleteLookupMap[r.athlete] || findAthleteByNormalizedName(r.athlete);
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
            if (!exclusions.trackType && selTrackType !== 'all') {
                if ((r.trackType || 'Outdoor') !== selTrackType) return false;
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

        // 3. Years List (filtered by Event, Athlete, Gender, Year, AgeGroup)
        const yearsList = [...new Set(baseRecords.filter(r => matches(r, { year: true })).map(r => r.date ? new Date(r.date).getFullYear() : null).filter(y => y))].sort((a, b) => b - a);
        updateSelect('wmaReportFilterYear', yearsList, selYear);

        // 4. Age Groups (Single-pass optimization)
        const relevantGroupsSet = new Set();
        baseRecords.forEach(r => {
            if (!matches(r, { ageGroup: true })) return;
            const athleteObj = athleteLookupMap[r.athlete] || findAthleteByNormalizedName(r.athlete);
            let ageAtEvent = 0;
            if (athleteObj && athleteObj.dob && r.date) {
                ageAtEvent = Math.floor((new Date(r.date) - new Date(athleteObj.dob)) / (1000 * 60 * 60 * 24 * 365.25));
            } else if (r.ageGroup) {
                ageAtEvent = parseInt(r.ageGroup);
            } else {
                return;
            }
            const floorAge = Math.floor(ageAtEvent / 5) * 5;
            if (floorAge >= 35) {
                const gNorm = normalizeGenderLookups(r.gender);
                const prefix = gNorm === 'men' ? 'M' : (gNorm === 'women' ? 'W' : 'X');
                relevantGroupsSet.add(`${prefix}${floorAge}`);
            }
        });
        const relevantGroups = [...relevantGroupsSet].sort((a, b) => {
            const prefixA = a[0], prefixB = b[0];
            if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
            return parseInt(a.slice(1)) - parseInt(b.slice(1));
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

    function getEventHowTo(eventName) {
        if (!eventName) return 'Meters';
        // 1. Check current events (Firestore) for custom formulas
        const ev = events.find(e => e.name === eventName);
        if (ev && ev.formula && ev.formula.trim() !== '') {
            const h = ev.formula.match(/HOWTO:\s*([^;]+)/)?.[1]?.trim();
            if (h) return h;
        }
        // 2. Check static rules
        const r = getEventRule(eventName);
        if (r && r.HOWTO) return r.HOWTO;

        // 3. Fallback heuristic for common track terms if not found
        const lower = eventName.toLowerCase();
        if (lower.includes('\u03bc') || lower.includes('m') || lower.includes('walk') || lower.includes('\u03b2\u03ac\u03b4\u03b7\u03bd') || lower.includes('relay') || lower.includes('\u03c3\u03ba\u03c5\u03c4\u03ac\u03bb\u03b7')) {
            return 'Time';
        }
        return 'Meters';
    }

    function formatSecondsToTime(seconds) {
        if (seconds === null || seconds === undefined || isNaN(parseFloat(seconds))) return '-';
        let totalSeconds = parseFloat(seconds);
        if (totalSeconds <= 0) return '0.00';
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        const ms = Math.round((totalSeconds % 1) * 100);
        let res = "";
        if (h > 0) {
            res += h + ":" + m.toString().padStart(2, '0') + ":" + s.toString().padStart(2, '0');
        } else if (m > 0) {
            res += m + ":" + s.toString().padStart(2, '0');
        } else {
            res += s;
        }
        res += "." + ms.toString().padStart(2, '0');
        return res;
    }

    function calculateRateConv(markStr, eventName) {
        if (!markStr) return 0;
        let s = markStr.toString().trim().replace(/,/g, '.');

        const ruleHowto = getEventHowTo(eventName);
        let ruleText = '';

        const ev = events.find(e => e.name === eventName);
        if (ev && ev.formula && ev.formula.trim() !== '') {
            ruleText = ev.formula.match(/Rule:\s*(.+)$/)?.[1]?.trim() || '';
            if (!ruleText) ruleText = ev.formula.match(/Rule:\s*([^;]+)/)?.[1]?.trim() || '';
        } else {
            const r = getEventRule(eventName);
            if (r) ruleText = r.Rule || (r.RULE1 || '') + (r.RULE2 || '');
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
                    let msStr = parts[3].toString();
                    if (ev && (ev.type === 'Track' || ev.type === 'Road') && msStr.length === 1) msStr += '0';
                    ms = parseFloat(msStr) || 0;
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
                    let msStr = parts[2].toString();
                    if (ev && (ev.type === 'Track' || ev.type === 'Road') && msStr.length === 1) msStr += '0';
                    ms = parseFloat(msStr) || 0;
                } else if (parts.length === 2) {
                    m = parseFloat(parts[0]) || 0;
                    sec = parseFloat(parts[1]) || 0;
                } else {
                    m = parseFloat(parts[0]) || 0;
                }
                return (m * 60) + sec + (ms / 100);
            }
            if (lowerF.includes('seconds')) {
                let sec = 0, ms = 0;
                if (parts.length >= 2) {
                    sec = parseFloat(parts[0]) || 0;
                    let msStr = parts[1].toString();
                    // Refinement: If it's a Track or Road event and only 1 decimal place, treat it as tenths/hundredths (14.9 -> 14.90)
                    if (ev && (ev.type === 'Track' || ev.type === 'Road') && msStr.length === 1) {
                        msStr += '0';
                    }
                    ms = parseFloat(msStr) || 0;
                } else {
                    sec = parseFloat(parts[0]) || 0;
                }
                return sec + (ms / 100);
            }
            return parseFloat(s) || 0;
        }
        return parseFloat(s) || 0;
    }

    // --- Record Comparison Helpers (v2.20.40) ---
    function findBestRecord(eventName, gender, ageGroup, trackType) {
        if (!records || records.length === 0) return null;
        const nEvent = (eventName || '').trim().toLowerCase();
        const nGender = (gender || '').trim().toLowerCase();
        const nAG = (ageGroup || '').trim().toLowerCase().replace(/\+/, '');
        const nTT = (trackType || '').trim().toLowerCase();

        // 1. Filter applicable records
        const matches = records.filter(r => {
            if (r.event.toLowerCase() !== nEvent) return false;
            // Normalize gender check
            const rGen = (r.gender || '').toLowerCase();
            const targetGen = nGender === 'male' || nGender === 'ανδρων' ? 'male' : (nGender === 'female' || nGender === 'γυναικων' ? 'female' : nGender);
            if (rGen !== targetGen) return false;

            if (r.ageGroup && r.ageGroup.replace(/\+/, '').toLowerCase() !== nAG) return false;
            if (nTT && r.trackType && r.trackType.toLowerCase() !== nTT) return false;
            return true;
        });

        if (matches.length === 0) return null;

        // 2. Identify HOWTO for comparison direction
        const howto = getEventHowTo(eventName);

        // 3. Sort to find best
        matches.sort((a, b) => {
            const valA = calculateRateConv(a.mark, a.event);
            const valB = calculateRateConv(b.mark, b.event);
            if (howto === 'Time') return valA - valB; // Lower is better
            return valB - valA; // Higher is better (Meters/Points)
        });

        return matches[0];
    }

    function isMarkBetter(newMark, existingMark, eventName) {
        if (!newMark) return false;
        if (!existingMark) return true;

        const howto = getEventHowTo(eventName);

        const valNew = calculateRateConv(newMark, eventName);
        const valOld = calculateRateConv(existingMark, eventName);

        if (valNew <= 0) return false;

        if (howto === 'Time') {
            return valNew < valOld;
        } else {
            return valNew > valOld;
        }
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
            ageAtEvent = getExactAge(athlete.dob, r.date);
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

    window.renderWMAReport = function (retryCount = 0) {
        const tbody = document.getElementById('wmaReportBody');
        if (!tbody) return;

        // v2.20.80: Wait for async data (IAAF/WMA) before rendering
        const wmaReady = window.WMA_2023_DATA && window.WMA_2023_DATA.length > 0;
        const iaafReady = window.IAAF_SCORING_DATA && window.IAAF_SCORING_DATA.length > 0;
        if ((!wmaReady || !iaafReady) && retryCount < 10) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; color:var(--text-muted);">⏳ Loading WMA data…</td></tr>';
            setTimeout(() => renderWMAReport(retryCount + 1), 500);
            return;
        }

        populateWMAReportFilters(); // Refresh dropdown options based on current selections

        // Update header classes for sorting arrows
        const table = tbody.closest('table');
        if (table) {
            table.querySelectorAll('thead th.sortable').forEach(th => {
                th.classList.remove('asc', 'desc');
                const onclickStr = th.getAttribute('onclick') || '';
                if (onclickStr.includes(`'${wmaSortField}'`)) {
                    th.classList.add(wmaSortOrder === 'asc' ? 'asc' : 'desc');
                }
            });
        }

        tbody.innerHTML = '';

        // Filter and Sort Records
        const fEvent = document.getElementById('wmaReportFilterEvent')?.value || 'all';
        const fAthlete = document.getElementById('wmaReportFilterAthlete')?.value || 'all';
        const fGender = document.getElementById('wmaReportFilterGender')?.value || 'all';
        const fAgeGroup = document.getElementById('wmaReportFilterAgeGroup')?.value || 'all';
        const fYear = document.getElementById('wmaReportFilterYear')?.value || 'all';
        const fTrackType = document.getElementById('wmaReportFilterTrackType')?.value || 'all';

        console.log(`📊 Rendering WMA Report. Year Filter: ${fYear}, Track Filter: ${fTrackType}`);

        let filtered = records.filter(r => {
            const rIdStr = String(r.id);
            const rYear = getYearFromDate(r.date);
            const rTrack = (r.trackType || 'Outdoor').trim();

            // ARCHIVE PROTECTION REMOVED: history unshift/push reuses IDs for edited records.
            // Live records in the records[] array should always be considered for reports.

            // STRICT APPROVAL: Only include approved records in statistics
            if (r.approved === false) {
                if (rYear === '2026') console.log(`🔍 2026 record ${rIdStr} hidden: Not Approved (Explicit false)`);
                return false;
            }

            if (!r.athlete || !r.mark || r.athlete.trim() === '' || r.mark.trim() === '') {
                if (rYear === '2026') console.log(`🔍 2026 record ${rIdStr} hidden: Missing Athlete or Mark`);
                return false;
            }

            if (fEvent !== 'all' && r.event !== fEvent) return false;
            if (fAthlete !== 'all' && r.athlete !== fAthlete) return false;

            if (fGender !== 'all') {
                const g = normalizeGenderLookups(r.gender);
                if (fGender === 'Male' && g !== 'men') return false;
                if (fGender === 'Female' && g !== 'women') return false;
                if (fGender === 'Mixed' && g !== 'mixed') return false;
            }

            if (fYear !== 'all') {
                if (rYear !== fYear) return false;
            }

            if (fAgeGroup !== 'all') {
                const athleteObj = findAthleteByNormalizedName(r.athlete);
                let ageAtEvent = 0;
                if (athleteObj && athleteObj.dob && r.date) {
                    ageAtEvent = getExactAge(athleteObj.dob, r.date);
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

            if (fTrackType !== 'all') {
                // Case-insensitive comparison with 'Outdoor' default
                if (rTrack.toLowerCase() !== fTrackType.toLowerCase()) return false;
            }

            // --- Exclude Relays from WMA Statistics ---
            const ev = events.find(e => e.name === r.event);
            const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));
            if (isRelay) {
                if (rYear === '2026') console.log(`🔍 2026 record ${rIdStr} hidden: Relay`);
                return false;
            }

            if (rYear === '2026') console.log(`✅ 2026 record ${rIdStr} PASSED all filters`);
            return true;
        });

        // Pre-calculate stats for all filtered records so sorting works on calculated fields
        let sortedRecords = filtered.map(r => calculateRecordWMAStats({ ...r }));

        sortedRecords.sort((a, b) => {
            let valA, valB;

            const getNumeric = (val) => {
                if (typeof val === 'number') return val;
                if (!val || val === '-' || val === 'Not Found') return -1;
                const v = val.toString().trim();
                if (v.includes(':')) {
                    const parts = v.split(':');
                    let total = 0;
                    if (parts.length === 3) {
                        total = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
                    } else if (parts.length === 2) {
                        total = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
                    }
                    return isNaN(total) ? -1 : total;
                }
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

            let displayAgeMark = ageMark;
            const isTrackOrRoad = eventDef && (eventDef.type === 'Track' || eventDef.type === 'Road');
            if (isTrackOrRoad && displayAgeMark && displayAgeMark !== '-' && displayAgeMark !== 'Not Found') {
                displayAgeMark = formatSecondsToTime(displayAgeMark);
            }

            const dateDisplay = r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Event">${r.event}</td>
                <td data-label="Athlete" style="font-weight:600;">${r.athlete}</td>
                <td data-label="Gender">${r.gender}</td>
                <td data-label="Age">${r.ageGroup || '-'}</td>
                <td data-label="Mark" style="text-align:center;"><b>${formatTimeMark(r.mark, r.event)}</b></td>
                <td data-label="IDR" style="font-size:0.85em; color:var(--text-muted);">${r.idr || '-'}</td>
                <td data-label="RateConv" style="font-size:0.85em; color:var(--text-muted);">${rateConv || '-'}</td>
                <td data-label="AgeMark" style="font-size:0.85em; color:var(--text-muted);">${displayAgeMark || '-'}</td>
                <td data-label="Pts" style="text-align:right; font-weight:700; color:var(--accent);">${pts || '-'}</td>
                <td data-label="Date">${dateDisplay}</td>
                <td data-label="Race Name" style="font-size:0.85em; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.raceName || ''}">${r.raceName || '-'}</td>
            `;
            tbody.appendChild(tr);
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
                    renderRankings();
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
                renderRankings();
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


    function migrateAgeGroupsToStartAge() {
        let changed = false;
        records.forEach(r => {
            if (r.ageGroup && r.ageGroup.includes('-')) {
                r.ageGroup = r.ageGroup.split('-')[0];
                changed = true;
            }
        });
        recordHistory.forEach(h => {
            if (h.ageGroup && h.ageGroup.includes('-')) {
                h.ageGroup = h.ageGroup.split('-')[0];
                changed = true;
            }
        });
        if (changed) {
            saveRecords();
            localStorage.setItem('tf_history', JSON.stringify(recordHistory));
            console.log("Migrated Age Groups to Start Age format.");
        }
    }

    // --- Athlete CRUD ---
    let isBypassingDob = false;

    function handleAthleteSubmit(e) {
        if (e) e.preventDefault();
        const first = newAthleteFirstName.value.trim();
        const last = newAthleteLastName.value.trim();
        const idNum = newAthleteID.value.trim();

        if (!first || !last) {
            alert('First and Last names are required!');
            if (!first) newAthleteFirstName.focus();
            else newAthleteLastName.focus();
            return;
        }

        // DOB Confirmation Flow
        const dob = newAthleteDOB.value;
        const dobWarning = document.getElementById('athleteDobWarning');

        if (!dob && dobWarning && !isBypassingDob) {
            // Only show warning if it's hidden and we aren't bypassing
            if (dobWarning.classList.contains('hidden')) {
                dobWarning.classList.remove('hidden');
                dobWarning.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return; // Wait for user to click Proceed or Cancel
            }
        }

        // Reset bypass flag after checking
        isBypassingDob = false;

        function propagateAthleteNameChange(oldLF, oldFL, newLF) {
            console.log(`Propagating name change: "${oldLF}" / "${oldFL}" -> "${newLF}"`);
            let count = 0;

            const normalize = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const targetOldLF = normalize(oldLF);
            const targetOldFL = normalize(oldFL);

            const updateRecord = (r) => {
                let changed = false;
                if (normalize(r.athlete) === targetOldLF || normalize(r.athlete) === targetOldFL) {
                    r.athlete = newLF;
                    changed = true;
                }
                // Update Relay Participants
                if (r.relayParticipants && Array.isArray(r.relayParticipants)) {
                    r.relayParticipants = r.relayParticipants.map(rp => {
                        const nrp = normalize(rp);
                        if (nrp === targetOldLF || nrp === targetOldFL) {
                            changed = true;
                            return newLF;
                        }
                        return rp;
                    });
                }
                return changed;
            };

            // 1. Update Main Records
            records.forEach(r => { if (updateRecord(r)) count++; });

            // 2. Update History
            recordHistory.forEach(r => { if (updateRecord(r)) count++; });

            // 3. Update Pending Records
            pendingrecs.forEach(r => { if (updateRecord(r)) count++; });

            console.log(`Name propagation complete. Updated ${count} total items.`);
            return count;
        }

        if (editingAthleteId) {
            // Check for duplicates excluding self
            const exists = athletes.some(a => {
                if (a.id == editingAthleteId) return false;
                return a.firstName.toLowerCase() === first.toLowerCase() &&
                    a.lastName.toLowerCase() === last.toLowerCase();
            }) || (idNum && athletes.some(a => {
                if (a.id == editingAthleteId) return false;
                return a.idNumber === idNum;
            }));

            if (exists) return alert('Another athlete already has this Name or ID!');

            const idx = athletes.findIndex(a => a.id == editingAthleteId);
            if (idx !== -1) {
                const oldNameLF = `${athletes[idx].lastName}, ${athletes[idx].firstName}`;
                const oldNameFL = `${athletes[idx].firstName} ${athletes[idx].lastName}`;

                athletes[idx].idNumber = idNum;
                athletes[idx].firstName = first;
                athletes[idx].lastName = last;
                athletes[idx].dob = newAthleteDOB.value;
                athletes[idx].gender = newAthleteGender.value;

                const newNameLF = `${last}, ${first}`;

                // Propagate Name Update across all data nodes
                propagateAthleteNameChange(oldNameLF, oldNameFL, newNameLF);
            }

            editingAthleteId = null;
            athleteSubmitBtn.innerHTML = '<span>+ Save Athlete</span>';
            athleteSubmitBtn.style.background = '';
        } else {
            const exists = athletes.some(a => {
                return a.firstName.toLowerCase() === first.toLowerCase() &&
                    a.lastName.toLowerCase() === last.toLowerCase();
            }) || (idNum && athletes.some(a => a.idNumber === idNum));

            if (exists) return alert('Athlete already exists (Name or ID match)!');

            const newId = generate6DigitId();
            athletes.push({
                id: newId,
                idNumber: idNum || newId, // Use given ID if exists
                firstName: first,
                lastName: last,
                dob: newAthleteDOB.value,
                gender: newAthleteGender.value
            });
        }

        saveAthletes();
        saveRecords();
        saveHistory();
        savePendingRecs();
        populateAthleteDropdown();
        renderAthleteList();
        renderReports();

        if (athleteForm) {
            athleteForm.classList.add('hidden');
            if (btnToggleAthleteForm) btnToggleAthleteForm.innerHTML = '<span>➕ Add New Athlete</span>';
        }

        newAthleteID.value = '';
        newAthleteFirstName.value = '';
        newAthleteLastName.value = '';
        if (dobPicker) dobPicker.clear();
        else newAthleteDOB.value = '';
        newAthleteGender.value = '';

        // Hide DOB warning after submit
        if (dobWarning) dobWarning.classList.add('hidden');

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

        if (athleteForm) {
            athleteForm.classList.remove('hidden');
            // btnToggleAthleteForm.innerHTML = '<span>➖ Hide Form</span>'; // Removed as per request
        }

        // Hide DOB warning when editing
        const dobWarning = document.getElementById('athleteDobWarning');
        if (dobWarning) dobWarning.classList.add('hidden');

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
            // If the deleted athlete was currently being edited, clear the form
            editingAthleteId = null;
            newAthleteID.value = '';
            newAthleteFirstName.value = '';
            newAthleteLastName.value = '';
            if (dobPicker) dobPicker.clear();
            else newAthleteDOB.value = '';
            newAthleteGender.value = '';
            if (newAthleteIsTeam) {
                newAthleteIsTeam.checked = false;
                newAthleteIsTeam.dispatchEvent(new Event('change'));
            }
            if (athleteSubmitBtn) {
                athleteSubmitBtn.innerHTML = '<span>+ Save Athlete</span>';
                athleteSubmitBtn.style.background = '';
            }
            newAthleteFirstName.focus(); // Focus on first name after clearing
        }
    }

    const btnCancelAthleteForm = document.getElementById('btnCancelAthleteForm');
    if (btnCancelAthleteForm) {
        btnCancelAthleteForm.addEventListener('click', () => {
            if (athleteForm) athleteForm.classList.add('hidden');
            editingAthleteId = null;
            if (athleteForm) athleteForm.reset();
            if (dobPicker) dobPicker.clear();
            if (newAthleteIsTeam) {
                newAthleteIsTeam.checked = false;
                newAthleteIsTeam.dispatchEvent(new Event('change'));
            }
            if (athleteSubmitBtn) {
                athleteSubmitBtn.innerHTML = '<span>+ Save Athlete</span>';
                athleteSubmitBtn.style.background = '';
            }
            // Hide DOB warning on cancel
            const dobWarning = document.getElementById('athleteDobWarning');
            if (dobWarning) dobWarning.classList.add('hidden');
        });
    }

    // DOB Warning Button listeners
    const btnProceedAthleteDob = document.getElementById('btnProceedAthleteDob');
    const btnCancelAthleteDob = document.getElementById('btnCancelAthleteDob');
    if (btnProceedAthleteDob) {
        btnProceedAthleteDob.addEventListener('click', () => {
            const dobWarning = document.getElementById('athleteDobWarning');
            if (dobWarning) dobWarning.classList.add('hidden');
            isBypassingDob = true; // Set flag to bypass validation
            handleAthleteSubmit(); // Re-run submit
        });
    }
    if (btnCancelAthleteDob) {
        btnCancelAthleteDob.addEventListener('click', () => {
            const dobWarning = document.getElementById('athleteDobWarning');
            if (dobWarning) dobWarning.classList.add('hidden');
            newAthleteDOB.focus();
        });
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

        // Update header classes for sorting arrows
        const table = athleteListBody.closest('table');
        if (table) {
            table.querySelectorAll('thead th.sortable').forEach(th => {
                th.classList.remove('asc', 'desc');
                const onclickStr = th.getAttribute('onclick') || '';
                if (onclickStr.includes(`'${athleteSortField}'`)) {
                    th.classList.add(athleteSortOrder === 'asc' ? 'asc' : 'desc');
                }
            });
        }

        athleteListBody.innerHTML = '';

        try {
            const idQ = (filterAthleteID ? filterAthleteID.value : '').toLowerCase();
            const lastQ = (filterAthleteLast ? filterAthleteLast.value : '').toLowerCase();
            const firstQ = (filterAthleteFirst ? filterAthleteFirst.value : '').toLowerCase();
            const dobQ = (filterAthleteDOB ? filterAthleteDOB.value : '').toLowerCase();
            const genderQ = filterAthleteGender ? filterAthleteGender.value : 'all';

            const filtered = athletes.filter(a => {
                const matchID = (a.idNumber || '').toLowerCase().includes(idQ);
                const matchLast = a.lastName.toLowerCase().includes(lastQ);
                const matchFirst = a.firstName.toLowerCase().includes(firstQ);
                const matchDOB = (a.dob || '').toLowerCase().includes(dobQ);
                const matchGender = genderQ === 'all' || a.gender === genderQ;
                return matchID && matchLast && matchFirst && matchDOB && matchGender;
            });

            const sorted = filtered.sort((a, b) => {
                let valA = a[athleteSortField] || '';
                let valB = b[athleteSortField] || '';

                if (athleteSortField === 'dob') {
                    valA = a.dob ? new Date(a.dob).getTime() : 0;
                    valB = b.dob ? new Date(b.dob).getTime() : 0;
                } else {
                    if (typeof valA === 'string') valA = valA.toLowerCase();
                    if (typeof valB === 'string') valB = valB.toLowerCase();
                }

                if (valA < valB) return athleteSortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return athleteSortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            if (sorted && sorted.length > 0) {
                sorted.forEach(a => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td data-label="ID">${a.idNumber || '-'}</td>
                        <td data-label="Last Name" style="font-weight:600;">${a.lastName}</td>
                        <td data-label="First Name">${a.firstName}</td>
                        <td data-label="DOB">${a.dob ? new Date(a.dob).toLocaleDateString('en-GB') : '-'}</td>
                        <td data-label="Gender">${a.gender || '-'}</td>
                        <td class="actions-col" data-label="Actions">
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
        // ALWAYS save to LocalStorage first (Synchronous Backup)
        localStorage.setItem('tf_athletes', JSON.stringify(athletes));
        rebuildPerformanceIndexes();

        if (!isDataReady) {
            console.warn("Cloud Save aborted: System not ready (Synchronization in progress). Local backup saved.");
            return;
        }
        if (db) {
            db.ref('athletes').set(athletes).then(() => {
                updatePersistentStats(); // Stats depend on athlete metadata
            });
        }
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
                <td data-label="Name">${u.name || 'N/A'}</td>
                <td data-label="Role"><span class="badge" style="background:var(--primary); color:white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${u.role || 'User'}</span></td>
                <td data-label="Email">${u.email || 'N/A'}</td>
                <td class="actions-col" data-label="Actions" style="text-align:center;">
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
        // ALWAYS save to LocalStorage first (Synchronous Backup)
        localStorage.setItem('tf_users', JSON.stringify(appUsers));
        renderUserList();

        if (!isDataReady) return;
        console.log("💾 saveUsers: saving to Firebase...", appUsers);
        if (db) db.ref('users').set(appUsers);
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
        cancelEventEdit(); // Hide form and reset UI
        if (newEventName) newEventName.focus();
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

    function cancelEventEdit() {
        if (!eventForm) return;
        eventForm.reset();
        eventForm.style.display = 'none';
        editingEventId = null;
        if (eventSubmitBtn) eventSubmitBtn.querySelector('span').textContent = '+ Add Event';
        const btnNewEvent = document.getElementById('btnNewEvent');
        if (btnNewEvent) btnNewEvent.style.display = 'block';
    }

    function editEvent(id) {
        const ev = events.find(e => e.id == id); // Use == for coercion
        if (!ev) return;

        editingEventId = id;
        if (eventForm) eventForm.style.display = 'block';
        const btnNewEvent = document.getElementById('btnNewEvent');
        if (btnNewEvent) btnNewEvent.style.display = 'none';

        if (newEventName) newEventName.value = ev.name;
        if (newEventIAAF) newEventIAAF.value = ev.iaafEvent || '';
        if (newEventWMA) newEventWMA.value = ev.wmaEvent || '';

        if (newEventSpecs) {
            newEventSpecs.value = ev.specs || '';
            newEventSpecs.disabled = false;
        }
        if (newEventFormula) newEventFormula.value = ev.formula || '';
        if (newEventNotes) {
            newEventNotes.value = ev.notes || '';
            newEventNotes.disabled = false;
        }

        // Set the correct event type radio button
        const eventType = ev.type || (ev.isCombined ? 'Combined' : ev.isRelay ? 'Relay' : 'Track');
        const typeRadio = document.querySelector(`input[name="eventType"][value="${eventType}"]`);
        if (typeRadio) typeRadio.checked = true;

        if (ev.isCombined) {
            if (newEventSubCount) newEventSubCount.disabled = false;
            const subs = ev.subEvents || [];
            if (subs.length > 0 && subEventsContainer) {
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
            if (newEventSubCount) {
                newEventSubCount.disabled = true;
                newEventSubCount.value = '';
            }
            if (subEventsContainer) {
                subEventsContainer.innerHTML = '';
                subEventsContainer.style.display = 'none';
            }
        }

        if (newEventName) newEventName.focus();
        if (eventSubmitBtn) {
            eventSubmitBtn.innerHTML = '<span>Update Event</span>';
            eventSubmitBtn.style.background = 'linear-gradient(135deg, var(--warning), #f59e0b)';
        }
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
                modalFormulaInput.disabled = false;
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
        // ALWAYS save to LocalStorage first (Synchronous Backup)
        localStorage.setItem('tf_countries', JSON.stringify(countries));

        if (!isDataReady) return;
        if (db) db.ref('countries').set(countries);
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

    // 🛡️ v2.20.34: Dynamic placeholder for Select fields
    function syncCountryPlaceholder(isReadOnly, value) {
        if (!countryInput) return;
        const firstOpt = countryInput.options[0];
        if (!firstOpt) return;

        if (isReadOnly && (!value || value === '')) {
            firstOpt.textContent = ''; // Hide "Select Country" text
        } else {
            firstOpt.textContent = 'Select Country'; // Restore for entry/edit
        }
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
        // REMOVED: events.sort((a, b) => a.name.localeCompare(b.name));

        events.forEach((ev, index) => {
            const isUsed = records.some(r => r.event === ev.name) || (pendingrecs && pendingrecs.some(r => r.event === ev.name));
            const tr = document.createElement('tr');
            tr.dataset.id = ev.id;
            tr.draggable = true; // Make row draggable
            tr.classList.add('draggable-row');

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
                <td data-label="Order" style="text-align:center; white-space:nowrap;">
                    <button class="btn-icon move-event-up" data-id="${ev.id}" title="Move Up" ${index === 0 ? 'disabled' : ''}>⬆️</button>
                    <button class="btn-icon move-event-down" data-id="${ev.id}" title="Move Down" ${index === events.length - 1 ? 'disabled' : ''}>⬇️</button>
                </td>
                <td data-label="Event Name" style="font-weight:600;">${ev.name}</td>
                <td data-label="Formula" style="font-size:0.85em; color:var(--text-muted); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${ev.formula || ''}">${ev.formula || '-'}</td>
                <td data-label="Tech Specs" style="font-size:0.9rem; color:var(--text-muted); white-space:pre-wrap;">${ev.specs || '-'}</td>
                <td data-label="Notes" style="font-size:0.9rem; color:var(--text-muted); white-space:pre-wrap;">${ev.notes || '-'}</td>
                <td data-label="IAAF/WMA" style="font-size:0.85rem; color:var(--accent);">${ev.iaafEvent || '-'} / ${ev.wmaEvent || '-'}</td>
                <td data-label="Type">${typeBadge}</td>
                <td class="actions-col" data-label="Actions" style="white-space:nowrap;">
                    <button class="btn-icon edit edit-event-btn" data-id="${ev.id}" title="Edit">✏️</button>
                    <button class="btn-icon delete delete-event-btn" data-id="${ev.id}" 
                        title="${isUsed ? 'In use' : 'Delete'}" ${isUsed ? 'disabled' : ''}>🗑️</button>
                </td>
            `;
            eventListBody.appendChild(tr);
        });
    }

    function saveEvents() {
        // ALWAYS save to LocalStorage first (Synchronous Backup)
        localStorage.setItem('tf_events', JSON.stringify(events));

        if (!isDataReady) return;
        if (db) {
            db.ref('events').set(events).then(() => {
                updatePersistentStats(); // Stats depend on event definitions
            });
        }
    }

    if (eventListBody) {
        eventListBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-event-btn');
            const delBtn = e.target.closest('.delete-event-btn');
            const upBtn = e.target.closest('.move-event-up');
            const downBtn = e.target.closest('.move-event-down');

            if (editBtn) editEvent(editBtn.dataset.id);
            if (delBtn) {
                const id = delBtn.dataset.id;
                const evObj = events.find(e => e.id == id);
                const isUsed = records.some(r => r.event === evObj?.name) || (pendingrecs && pendingrecs.some(r => r.event === evObj?.name));
                if (!isUsed && confirm(`Delete event "${evObj?.name}"?`)) {
                    events = events.filter(ev => ev.id != id);
                    saveEvents();
                    renderEventList();
                    populateEventDropdowns();
                }
            }
            if (upBtn) moveEventUp(upBtn.dataset.id);
            if (downBtn) moveEventDown(downBtn.dataset.id);
        });

        // Drag and Drop implementation
        let draggedId = null;

        eventListBody.addEventListener('dragstart', (e) => {
            const row = e.target.closest('tr');
            if (row) {
                draggedId = row.dataset.id;
                row.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        eventListBody.addEventListener('dragend', (e) => {
            const row = e.target.closest('tr');
            if (row) row.classList.remove('dragging');
            const rows = eventListBody.querySelectorAll('tr');
            rows.forEach(r => r.classList.remove('drag-over'));
        });

        eventListBody.addEventListener('dragover', (e) => {
            e.preventDefault();
            const row = e.target.closest('tr');
            if (row && row.dataset.id !== draggedId) {
                row.classList.add('drag-over');
            }
        });

        eventListBody.addEventListener('dragleave', (e) => {
            const row = e.target.closest('tr');
            if (row) row.classList.remove('drag-over');
        });

        eventListBody.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetRow = e.target.closest('tr');
            if (!targetRow || targetRow.dataset.id === draggedId) return;

            const fromIndex = events.findIndex(ev => ev.id == draggedId);
            const toIndex = events.findIndex(ev => ev.id == targetRow.dataset.id);

            if (fromIndex !== -1 && toIndex !== -1) {
                const [movedItem] = events.splice(fromIndex, 1);
                events.splice(toIndex, 0, movedItem);
                saveEvents();
                renderEventList();
                populateEventDropdowns();
                renderReports();
            }
        });
    }

    function moveEventUp(id) {
        const idx = events.findIndex(ev => ev.id == id);
        if (idx > 0) {
            [events[idx - 1], events[idx]] = [events[idx], events[idx - 1]];
            saveEvents();
            renderEventList();
            populateEventDropdowns();
        }
    }

    function moveEventDown(id) {
        const idx = events.findIndex(ev => ev.id == id);
        if (idx < events.length - 1 && idx !== -1) {
            [events[idx], events[idx + 1]] = [events[idx + 1], events[idx]];
            saveEvents();
            renderEventList();
            populateEventDropdowns();
        }
    }

    // --- Records ---
    function saveHistory() {
        // ALWAYS save to LocalStorage first (Synchronous Backup)
        localStorage.setItem('tf_history', JSON.stringify(recordHistory));

        if (!isDataReady) return;
        // Strip out any accidental 'undefined' properties injected by UI loops before pushing to Firebase
        const sanitizedHistory = JSON.parse(JSON.stringify(recordHistory));
        if (db) db.ref('history').set(sanitizedHistory);
    }

    function savePendingRecs() {
        // ALWAYS save to LocalStorage first (Synchronous Backup)
        localStorage.setItem('tf_pendingrecs', JSON.stringify(pendingrecs));

        if (!isDataReady) return;
        if (db) {
            db.ref('pendingrecs').set(pendingrecs).catch(err => {
                console.error("Firebase Save Failed (Pending):", err);
                alert("Cloud Sync Error: Your proposal was not saved. " + err.message);
            });
        }
    }

    // --- Records ---

    function handleFormSubmit(e) {
        if (e) e.preventDefault();
        try {
            const raceName = raceNameInput ? raceNameInput.value.trim() : '';
            const idr = idrInput ? idrInput.value.trim() : '';

            const ev = evtInput ? events.find(e => e.name === evtInput.value) : null;
            const isRelay = ev ? (ev.eventType === 'Relay' || ev.isRelay === true) : false;
            const selectedAthlete = isRelay ? (relayTeamNameInput ? relayTeamNameInput.value.trim() : '') : (athleteInput ? athleteInput.value : '');
            const selectedAgeGroup = ageGroupInput ? ageGroupInput.value : '';
            const selectedDate = dateInput ? dateInput.value : '';

            if (!isRelay && selectedAthlete && selectedDate) {
                try {
                    const athlete = findAthleteByNormalizedName(selectedAthlete);
                    if (athlete && athlete.dob) {
                        const getYear = (s) => {
                            if (!s) return 0;
                            const str = s.toString().trim();
                            if (str.includes('-')) return parseInt(str.split('-')[0]);
                            if (str.includes('/')) return parseInt(str.split('/').pop());
                            return 0;
                        };
                        const dobYear = getYear(athlete.dob);
                        const eventYear = getYear(selectedDate);
                        const rawAge = eventYear - dobYear;

                        const calculatedGroup = calculateAgeGroup(athlete.dob, selectedDate);
                        const normalizedSelected = String(selectedAgeGroup || "").trim();
                        const normalizedCalculated = String(calculatedGroup || "").trim();

                        if (normalizedSelected !== normalizedCalculated && !bypassAgeValidation) {
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
                                bypassAgeValidation = false; // Reset before returning
                                return;
                            }
                        }
                    } else if (athlete && !athlete.dob && !athlete.isTeam) {
                        console.warn("Athlete has no Date of Birth. Age validation cannot be performed.");
                        const warningDiv = document.getElementById('ageValidationWarning');
                        const messageP = document.getElementById('ageValidationMessage');
                        if (warningDiv && messageP && !bypassAgeValidation) {
                            messageP.innerHTML = `
                                    <strong>Warning:</strong> No Date of Birth found for this athlete.<br>
                                    <br>
                                    Age group validation cannot be performed automatically. Please verify the category manually.
                                `;
                            warningDiv.classList.remove('hidden');
                            warningDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            bypassAgeValidation = false; // Reset before returning
                            return;
                        }
                    }
                    bypassAgeValidation = false; // Reset if it passes or was bypassed
                } catch (err) {
                    console.error("Critical error in age validation check:", err);
                    // We don't return early here, so the update can still proceed if the validation logic specifically failed.
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
                notes: (function () {
                    let finalNotes = notesInput ? notesInput.value.trim() : '';
                    if (isRelay && !finalNotes) {
                        const relayParticipants = [
                            relayAthlete1.value,
                            relayAthlete2.value,
                            relayAthlete3.value,
                            relayAthlete4.value
                        ].filter(p => p !== '');
                        if (relayParticipants.length > 0) {
                            finalNotes = relayParticipants.map(p => getLastName(p)).join('/');
                        }
                    }
                    return finalNotes;
                })(),
                mark: markInput ? markInput.value : '',
                wind: windInput ? windInput.value : '',
                date: dateInput ? dateInput.value : '',
                town: townInput ? townInput.value : '',
                country: countryInput ? countryInput.value : '',
                updatedBy: getCurrentUsername(),
                approvedBy: isSupervisor(currentUser ? currentUser.email : null) ? getCurrentUsername() : null
            };

            // Calculate WMA stats for new record
            calculateRecordWMAStats(newRecord);

            if (editingHistoryId) {
                // Update History Record
                const idToFind = String(editingHistoryId);
                const index = recordHistory.findIndex(r => String(r.id) === idToFind);
                if (index !== -1) {
                    // Keep original archive timestamp and sorting date
                    newRecord.archivedAt = recordHistory[index].archivedAt || new Date().toISOString();
                    newRecord._groupSortDate = recordHistory[index]._groupSortDate || null; // Prevent Firebase 'undefined' crash

                    recordHistory[index] = newRecord;
                    saveHistory();

                    // Force a re-calculation of filters immediately
                    populateHistoryFilters(localStorage.getItem('tf_history_sort_oldest') === 'true');
                    renderHistoryList();
                }
                submitBtn.querySelector('span').textContent = 'History Updated! ✓';
                setTimeout(() => {
                    cancelEdit();

                    // Switch back to History tab and re-render to reflect changes
                    switchTab('history');
                }, 1000);
            } else if (editingId) {
                // Edit Live Record
                const idToFind = String(editingId);
                const index = records.findIndex(r => String(r.id) === idToFind);

                if (index !== -1) {
                    const originalRecord = records[index];
                    const isSup = isSupervisor(currentUser ? currentUser.email : null);

                    if (isSup) {
                        try {
                            // v2.20.52: Archiving during manual "Update" (🔄) is now mandatory
                            const isHistoryEnabled = isManualUpdateMode || (localStorage.getItem('tf_edit_history_flag') !== 'false');

                            if (isHistoryEnabled) {
                                const oldRecordData = { ...originalRecord };
                                oldRecordData.archivedAt = new Date().toISOString();
                                oldRecordData.originalId = String(oldRecordData.id); // Link to original
                                // Attribution for the archive entry matches the current session user
                                oldRecordData.updatedBy = getCurrentUsername();
                                oldRecordData.id = String(Date.now() + '-' + Math.floor(Math.random() * 10000));

                                recordHistory.unshift(oldRecordData);
                                saveHistory();
                            }

                            newRecord.approved = true;
                            newRecord.approvedBy = getCurrentUsername();

                            // Update Live Record in place
                            records[index] = newRecord;
                            saveRecords();

                            // REFRESH UI IMMEDIATELY
                            renderReports();
                            renderEventList();
                            renderAthleteList();
                            populateYearDropdown();

                            submitBtn.querySelector('span').textContent = 'Updated & Archived! ✓';
                        } catch (err) {
                            console.error("Error archiving/updating record:", err);
                            alert("Failed to update record: " + err.message);
                        }
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
                } else {
                    console.error("Record to edit not found in array:", editingId);
                    alert("Error: The record you are trying to edit could not be found.");
                }
                setTimeout(() => cancelEdit(), 1000);
            }
            else {
                // Log New Record
                const isSup = isSupervisor(currentUser ? currentUser.email : null);
                if (isSup) {
                    newRecord.approved = true;
                    newRecord.approvedBy = getCurrentUsername();
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
            }

            populateYearDropdown();
            renderReports();
            renderAthleteList();

            // Auto close modal after successful submit
            setTimeout(() => {
                isManualUpdateMode = false; // lifecycle guard
                closeRecordModal();
            }, 1500);
        } catch (error) {
            console.error("Form Submit Error:", error);
            alert("Error saving record: " + error.message);
        }
    }

    // --- Modal Management ---
    window.openRecordModal = function (id = null, isUpdateFlow = false, isReadOnly = false) {
        isManualUpdateMode = !!isUpdateFlow; // Set global flag for form submit context
        if (!isAdmin && !isReadOnly) {
            alert("Permission Denied: Only Supervisors or Admins can perform this action.");
            return;
        }
        const modal = document.getElementById('recordModal');
        if (!modal) return;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scroll

        if (id) {
            editRecord(id, isUpdateFlow, isReadOnly);
        } else {
            // New Record Mode
            editingId = null;
            if (recordForm) recordForm.reset();
            updateAthleteDobBadge(null);
            const formTitle = document.getElementById('formTitle');
            if (formTitle) formTitle.textContent = 'Log New Record';
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.querySelector('span').textContent = 'Log Record';
            if (cancelBtn) cancelBtn.classList.add('hidden');

            // Set default date
            if (datePicker) {
                datePicker.setDate(new Date());
            } else if (dateInput && dateInput.type === 'date') {
                dateInput.valueAsDate = new Date();
            }

            // 🛡️ v2.20.34: Restore placeholder text for new records
            syncCountryPlaceholder(false, '');
        }
    };

    window.closeRecordModal = function () {
        const modal = document.getElementById('recordModal');
        if (!modal) return;

        modal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore background scroll
        isManualUpdateMode = false; // v2.20.53 reset
        cancelEdit();
    };

    // --- RECORD HISTORY (ARCHIVE) ---

    function populateHistoryFilters(oldestFirst = false) {
        // Current selections
        const selEvent = document.getElementById('historyFilterEvent')?.value || 'all';
        const selAthlete = document.getElementById('historyFilterAthlete')?.value || 'all';
        const selGender = document.getElementById('historyFilterGender')?.value || 'all';
        const selAgeGroup = document.getElementById('historyFilterAgeGroup')?.value || 'all';
        const selYear = document.getElementById('historyFilterYear')?.value || 'all';
        const selArchDate = document.getElementById('historyFilterArchiveDate')?.value || 'all';

        const matches = (r, exclusions = {}) => {
            if (!exclusions.event && selEvent !== 'all' && r.event !== selEvent) return false;
            if (!exclusions.athlete && selAthlete !== 'all' && r.athlete !== selAthlete) return false;
            if (!exclusions.gender && selGender !== 'all') {
                const g = typeof normalizeGenderLookups === 'function' ? normalizeGenderLookups(r.gender) : r.gender;
                if (selGender === 'Male' && g !== 'men') return false;
                if (selGender === 'Female' && g !== 'women') return false;
                if (selGender === 'Mixed' && g !== 'mixed') return false;
            }
            if (!exclusions.year && selYear !== 'all') {
                try {
                    const rDate = oldestFirst ? r.date : (r._groupSortDate || r.date);
                    const y = rDate ? new Date(rDate).getFullYear().toString() : '';
                    if (y !== selYear) return false;
                } catch (e) { return false; }
            }
            if (!exclusions.ageGroup && selAgeGroup !== 'all' && r.ageGroup !== selAgeGroup) return false;
            if (!exclusions.archDate && selArchDate !== 'all') {
                try {
                    const d = r.archivedAt ? new Date(r.archivedAt).toLocaleDateString('en-CA') : '';
                    if (d !== selArchDate) return false;
                } catch (e) { return false; }
            }
            return true;
        };

        const updateSelect = (id, list, currentVal, label) => {
            const el = document.getElementById(id);
            if (!el) return;
            const newListHtml = `<option value="all">All ${label}</option>` +
                list.map(item => `<option value="${item}">${item}</option>`).join('');

            el.innerHTML = newListHtml;
            el.value = currentVal;
            if (el.value !== currentVal) el.value = 'all';
        };

        // Base records - convert to robust array
        const baseRecords = Array.isArray(recordHistory) ? [...recordHistory] : [];
        console.log("📊 populateHistoryFilters: recordHistory size =", baseRecords.length);

        // 1. Events
        const eventsList = [...new Set(baseRecords.filter(r => matches(r, { event: true })).map(r => r.event))].filter(Boolean).sort();
        updateSelect('historyFilterEvent', eventsList, selEvent, 'Events');

        // 2. Athletes
        const athletesList = [...new Set(baseRecords.filter(r => matches(r, { athlete: true })).map(r => r.athlete))].filter(Boolean).sort();
        updateSelect('historyFilterAthlete', athletesList, selAthlete, 'Athletes');

        // 3. Years
        const yearsList = [...new Set(baseRecords.filter(r => matches(r, { year: true })).map(r => {
            const rDate = oldestFirst ? r.date : (r._groupSortDate || r.date);
            const yStr = getYearFromDate(rDate);
            return yStr ? parseInt(yStr) : null;
        }))].filter(y => y !== null && !isNaN(y)).sort((a, b) => b - a).map(String);
        updateSelect('historyFilterYear', yearsList, selYear, 'Years');

        // 4. Age Groups
        const ageList = [...new Set(baseRecords.filter(r => matches(r, { ageGroup: true })).map(r => r.ageGroup))].filter(Boolean).sort();
        updateSelect('historyFilterAgeGroup', ageList, selAgeGroup, 'Ages');

        // 5. Archive Dates
        const dateList = [...new Set(baseRecords.filter(r => matches(r, { archDate: true })).map(r => r.archivedAt ? new Date(r.archivedAt).toLocaleDateString('en-CA') : null))].filter(Boolean).sort((a, b) => b.localeCompare(a));
        updateSelect('historyFilterArchiveDate', dateList, selArchDate, 'Dates');
    }
    window.populateHistoryFilters = populateHistoryFilters;

    function renderHistoryList() {
        try {
            // v2.20.96: Default to Newest First (Grouped)
            const oldestFirst = localStorage.getItem('tf_history_old_first') === 'true';

            // v2.20.100: Pre-calculate _groupSortDate for filters
            if (!oldestFirst && recordHistory.length > 0) {
                const clean = (s) => (s || '').toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const getCatKey = (rec) => {
                    if (!rec) return '';
                    const g = typeof normalizeGender === 'function' ? normalizeGender(rec.gender) : rec.gender;
                    return `${clean(rec.event)}|${clean(g)}|${clean(rec.ageGroup)}|${clean(rec.trackType || 'Outdoor')}`;
                };

                const catSortDates = {};
                recordHistory.forEach(r => {
                    const rKey = getCatKey(r);
                    if (!catSortDates[rKey]) {
                        const live = records.find(curr => getCatKey(curr) === rKey);
                        if (live) catSortDates[rKey] = live.date;
                        else {
                            const versions = recordHistory.filter(h => getCatKey(h) === rKey)
                                .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
                            if (versions.length > 0) catSortDates[rKey] = versions[0].date;
                        }
                    }
                    r._groupSortDate = catSortDates[rKey] || r.date || null;
                });
            }

            populateHistoryFilters(oldestFirst);
            const tbody = document.getElementById('historyListBody');
            const empty = document.getElementById('historyEmptyState');
            if (!tbody) return;

            tbody.innerHTML = '';
            if (recordHistory.length === 0) {
                if (empty) empty.classList.remove('hidden');
                return;
            }
            if (empty) empty.classList.add('hidden');

            if (empty) empty.classList.add('hidden');

            // v2.20.82: Apply UI Filters
            const selEvent = document.getElementById('historyFilterEvent')?.value || 'all';
            const selAthlete = document.getElementById('historyFilterAthlete')?.value || 'all';
            const selGender = document.getElementById('historyFilterGender')?.value || 'all';
            const selAgeGroup = document.getElementById('historyFilterAgeGroup')?.value || 'all';
            const selYear = document.getElementById('historyFilterYear')?.value || 'all';
            const selArchDate = document.getElementById('historyFilterArchiveDate')?.value || 'all';

            let filteredHistory = recordHistory.filter(r => {
                if (selEvent !== 'all' && r.event !== selEvent) return false;
                if (selAthlete !== 'all' && r.athlete !== selAthlete) return false;
                if (selGender !== 'all') {
                    const g = typeof normalizeGenderLookups === 'function' ? normalizeGenderLookups(r.gender) : r.gender;
                    if (selGender === 'Male' && g !== 'men') return false;
                    if (selGender === 'Female' && g !== 'women') return false;
                    if (selGender === 'Mixed' && g !== 'mixed') return false;
                }
                if (selAgeGroup !== 'all' && r.ageGroup !== selAgeGroup) return false;
                try {
                    const rDate = oldestFirst ? r.date : (r._groupSortDate || r.date);
                    if (selYear !== 'all' && (rDate ? new Date(rDate).getFullYear().toString() : '') !== selYear) return false;
                    if (selArchDate !== 'all') {
                        const d = r.archivedAt ? new Date(r.archivedAt).toLocaleDateString('en-CA') : '';
                        if (d !== selArchDate) return false;
                    }
                } catch (e) { return false; }
                return true;
            });

            // v2.20.71: Inclusion of Live records in history view for Newest First
            let displayList = [...filteredHistory];

            const clean = (s) => (s || '').toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const getCatKey = (rec) => {
                if (!rec) return '';
                const g = typeof normalizeGender === 'function' ? normalizeGender(rec.gender) : rec.gender;
                return `${clean(rec.event)}|${clean(g)}|${clean(rec.ageGroup)}|${clean(rec.trackType || 'Outdoor')}`;
            };

            if (oldestFirst) {
                // v2.20.74: Flat List for Oldest First (Traditional Detail)
                displayList = [...filteredHistory];
            } else {
                // v2.20.72: Grouped View for Newest First (Avoids Duplication)
                const categories = [...new Set(filteredHistory.map(h => getCatKey(h)))];
                displayList = [];

                categories.forEach(rKey => {
                    const versions = recordHistory.filter(h => getCatKey(h) === rKey)
                        .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));

                    const live = records.find(curr => getCatKey(curr) === rKey);

                    // v2.20.88: Determine group's sort date (replaced-by date)
                    // Sort by the performance date of the current live record (or newest archive)
                    let groupSortDate = '1900-01-01';
                    if (live) groupSortDate = live.date;
                    else if (versions.length > 0) groupSortDate = versions[0].date;

                    if (live) {
                        displayList.push({ ...live, isLive: true, groupSortDate, archivedAt: '2099-12-31T23:59:59Z', historyBranch: versions });
                    } else if (versions.length > 0) {
                        displayList.push({ ...versions[0], groupSortDate, historyBranch: versions.slice(1) });
                    }
                });
            }

            // v2.20.73: Apply Dynamic Sorting
            const key = window.historySortKey || 'archivedAt';
            const dir = window.historySortDir === 'desc' ? -1 : 1;

            displayList.sort((a, b) => {
                let valA = a[key];
                let valB = b[key];

                // v2.20.100: Use groupSortDate for primary sorting if it's a date-based sort in grouped view
                if (!oldestFirst && (key === 'archivedAt' || key === 'date')) {
                    valA = a.groupSortDate || valA;
                    valB = b.groupSortDate || valB;
                }

                // Robust sorting for specific fields
                if (key === 'date' || key === 'archivedAt') {
                    valA = new Date(valA || 0).getTime();
                    valB = new Date(valB || 0).getTime();
                } else if (key === 'mark') {
                    valA = parseMarkByRule(valA, a.event);
                    valB = parseMarkByRule(valB, b.event);
                } else {
                    valA = (valA || '').toString().toLowerCase();
                    valB = (valB || '').toString().toLowerCase();
                }

                if (valA < valB) return -1 * dir;
                if (valA > valB) return 1 * dir;
                return 0;
            });

            // v2.20.73: Inject Sort Arrows into Headers
            const table = tbody.closest('table');
            if (table) {
                table.querySelectorAll('th.sortable').forEach(th => {
                    th.classList.remove('asc', 'desc');
                    if (th.dataset.sortKey === key) {
                        th.classList.add(window.historySortDir);
                    }
                });
            }

            displayList.forEach(r => {
                const tr = document.createElement('tr');
                if (r.isLive) {
                    tr.style.background = 'rgba(var(--primary-rgb), 0.05)';
                    tr.classList.add('live-record-row');
                }

                const rKey = getCatKey(r);
                const isSup = isSupervisor(currentUser ? currentUser.email : null);

                // Expansion Logic
                let hasExpansion = false;
                let expansionHTML = '';

                if (oldestFirst) {
                    // Pre-existing expansion logic for Oldest First (One step forward)
                    const versions = recordHistory.filter(h => getCatKey(h) === rKey)
                        .sort((a, b) => new Date(a.archivedAt) - new Date(b.archivedAt));
                    const currentIndex = versions.findIndex(v => v.id === r.id);
                    let linkedRec = null;
                    let linkedLabel = '';

                    if (currentIndex !== -1 && currentIndex < versions.length - 1) {
                        linkedRec = versions[currentIndex + 1];
                        linkedLabel = 'REPLACED BY (INTERMEDIATE VERSION)';
                    } else if (currentIndex === versions.length - 1 || currentIndex === -1) {
                        linkedRec = records.find(curr => getCatKey(curr) === rKey);
                        if (linkedRec && linkedRec.id !== r.id) {
                            linkedLabel = 'REPLACED BY (CURRENT LIVE VERSION)';
                        } else {
                            linkedRec = null;
                        }
                    }

                    if (linkedRec) {
                        hasExpansion = true;
                        expansionHTML = `
                        <div style="font-size:0.85em; color:var(--text-muted); margin-bottom:4px; display:flex; justify-content:space-between;">
                            <span><strong>${linkedLabel}</strong></span>
                            <span><strong>By:</strong> ${linkedRec.updatedBy || 'N/A'}</span>
                        </div>
                        <div style="display:flex; gap:1rem; align-items:center;">
                            <span style="font-weight:bold; color:var(--success);">${linkedRec.athlete}</span>
                            <span>${formatTimeMark(linkedRec.mark, r.event)} (${linkedRec.wind || '-'})</span>
                            <span>| ${new Date(linkedRec.date).toLocaleDateString('en-GB')}</span>
                            <span>| Location: ${linkedRec.town || '-'}, ${linkedRec.country || '-'}</span>
                            <span>| Race: ${linkedRec.raceName || '-'}</span>
                            <span>| Notes: ${linkedRec.notes || '-'}</span>
                        </div>
                    `;
                    }
                } else {
                    // Grouped Expansion logic for Newest First (Full lineage)
                    if (r.historyBranch && r.historyBranch.length > 0) {
                        hasExpansion = true;
                        expansionHTML = r.historyBranch.map((h, idx) => `
                        <div style="display:flex; flex-direction:column; gap:4px; margin-bottom: ${idx < r.historyBranch.length - 1 ? '12px' : '0'}; padding-bottom: ${idx < r.historyBranch.length - 1 ? '8px' : '0'}; border-bottom: ${idx < r.historyBranch.length - 1 ? '1px dashed rgba(var(--primary-rgb), 0.1)' : 'none'};">
                            <div style="font-size:0.85em; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
                                <span><strong>REPLACED PREVIOUS VERSION ${idx === 0 ? '(LATEST ARCHIVE)' : '(HISTORICAL)'}</strong></span>
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <span><strong>Archived:</strong> ${new Date(h.archivedAt).toLocaleString('en-GB')} | <strong>By:</strong> ${h.updatedBy || 'N/A'}</span>
                                    <div class="expansion-actions" style="${isSup ? 'display:flex; gap:4px;' : 'display:none;'}">
                                        <button class="btn-icon edit edit-history-btn" data-id="${h.id}" title="Edit Archived" style="padding: 2px; font-size: 0.9em;">✏️</button>
                                        <button class="btn-icon delete delete-history-btn" data-id="${h.id}" title="Delete Permanent" style="padding: 2px; font-size: 0.9em;">🗑️</button>
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex; gap:1rem; align-items:center;">
                                <span style="font-weight:bold; color:var(--success);">${h.athlete}</span>
                                <span>${formatTimeMark(h.mark, r.event)} (${h.wind || '-'})</span>
                                <span>| ${new Date(h.date).toLocaleDateString('en-GB')}</span>
                                <span>| Location: ${h.town || '-'}, ${h.country || '-'}</span>
                                <span>| Race: ${h.raceName || '-'}</span>
                                <span>| Notes: ${h.notes || '-'}</span>
                            </div>
                        </div>
                    `).join('');
                    }
                }

                tr.innerHTML = `
                <td style="text-align:center;">
                    ${hasExpansion ? `<button class="btn-icon expand-btn" data-id="${r.id}" style="font-weight:bold; color:var(--primary); cursor:pointer;">+</button>` : ''}
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
                <td>${r.updatedBy || 'N/A'}</td>
                <td style="font-size:0.85em; color:var(--text-muted);">
                    ${r.isLive ? '<span style="color:var(--success); font-weight:bold;">LIVE RECORD</span>' : new Date(r.archivedAt).toLocaleString('en-GB')}
                </td>
                 <td class="history-actions-col" style="${isSup ? '' : 'display:none;'}">
                    ${r.isLive
                        ? `<button class="btn-icon edit" onclick="editRecord('${r.id}')" title="Edit Live">✏️</button>`
                        : `<button class="btn-icon edit edit-history-btn" data-id="${r.id}" title="Edit Archived">✏️</button>
                           <button class="btn-icon delete delete-history-btn" data-id="${r.id}" title="Delete Permanent">🗑️</button>`
                    }
                </td>
            `;

                tbody.appendChild(tr);

                if (hasExpansion) {
                    const trDetail = document.createElement('tr');
                    trDetail.className = 'detail-row hidden';
                    trDetail.id = `detail-hist-${r.id}`;
                    trDetail.innerHTML = `
                    <td colspan="1" style="border-top:none; background:transparent;"></td>
                    <td colspan="11" style="padding: 10px 12px; border-top:none; background: rgba(var(--primary-rgb), 0.04); border-radius: 0 0 8px 8px;">
                        ${expansionHTML}
                    </td>
                `;
                    tbody.appendChild(trDetail);
                }
            });
        } catch (err) {
            console.error("🔥 Error in renderHistoryList:", err);
        }
    }
    window.renderHistoryList = renderHistoryList;

    function editHistory(id, isReadOnly = false) {
        if (!isSupervisor(currentUser ? currentUser.email : null) && !isReadOnly) {
            alert("Only Supervisors can edit history.");
            return;
        }

        const idStr = String(id);
        const r = recordHistory.find(item => String(item.id) === idStr);
        if (!r) {
            console.error("❌ History Record not found:", id);
            return;
        }

        // 🛡️ v2.20.88: Ensure modal is open and reset BEFORE population
        const modal = document.getElementById('recordModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            if (recordForm) recordForm.reset();
        }

        editingHistoryId = id;
        editingId = null;
        isReadOnlyForm = isReadOnly;

        // Manual population to ensure 100% field coverage
        console.log("✏️ Populating History Edit Form for Record:", r);

        // Helper to set select value more robustly (matches editRecord logic)
        const setSelectValue = (el, val) => {
            if (!el) return;
            const target = String(val || '').trim();
            el.value = target;

            if (el.value !== target) {
                const options = Array.from(el.options);
                const matchingOpt = options.find(o => o.text.trim() === target || o.value.trim() === target);
                if (matchingOpt) {
                    el.value = matchingOpt.value;
                } else if (target) {
                    const newOpt = document.createElement('option');
                    newOpt.value = target;
                    newOpt.textContent = `${target} (Archived)`;
                    el.appendChild(newOpt);
                    el.value = target;
                }
            }
        };

        if (evtInput) setSelectValue(evtInput, r.event);
        if (athleteInput) setSelectValue(athleteInput, r.athlete);
        if (genderInput) setSelectValue(genderInput, normalizeGender(r.gender || ''));
        if (ageGroupInput) setSelectValue(ageGroupInput, r.ageGroup);
        if (trackTypeInput) setSelectValue(trackTypeInput, r.trackType || 'Outdoor');
        if (raceNameInput) raceNameInput.value = r.raceName || '';
        if (markInput) markInput.value = r.mark || '';
        if (windInput) windInput.value = r.wind || '';
        if (idrInput) idrInput.value = r.idr || '';
        if (townInput) townInput.value = r.town || '';
        if (countryInput) setSelectValue(countryInput, r.country || ''); // Use setSelectValue for history safety
        if (notesInput) notesInput.value = r.notes || '';
        if (relayTeamNameInput) relayTeamNameInput.value = r.relayTeamName || '';

        syncCountryPlaceholder(isReadOnly, r.country);
        applyReadOnlyMode(isReadOnly);

        // Lock down core identity fields when editing history
        // The user explicitly requested these not be changeable to preserve historical integrity
        // MUST be called after applyReadOnlyMode to prevent it from resetting them to false
        if (evtInput) evtInput.disabled = true;
        if (athleteInput) athleteInput.disabled = true;
        if (genderInput) genderInput.disabled = true;
        if (ageGroupInput) ageGroupInput.disabled = true;
        if (trackTypeInput) trackTypeInput.disabled = true;

        // Modal Title & UI
        const formTitle = document.getElementById('formTitle');
        if (isReadOnly) {
            if (formTitle) formTitle.textContent = 'View Archived Record (Read-Only)';
        } else {
            if (formTitle) {
                formTitle.textContent = 'Edit Archived Record';
                formTitle.style.color = 'var(--text-muted)';
            }
            if (submitBtn) {
                const span = submitBtn.querySelector('span');
                if (span) span.textContent = 'Update Archive';
                submitBtn.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
            }
            if (cancelBtn) cancelBtn.classList.remove('hidden');
        }

        recordForm.scrollIntoView({ behavior: 'smooth' });
    }

    function applyReadOnlyMode(isReadOnly) {
        if (!recordForm) return;
        isReadOnlyForm = isReadOnly;

        const elements = recordForm.querySelectorAll('input, select, textarea, button');
        elements.forEach(el => {
            if (el.id !== 'cancelBtn') {
                el.disabled = isReadOnly;
                // No need for pointer-events here since shield covers it
            }
        });

        if (isReadOnly) {
            recordForm.classList.add('read-only-lock');
        } else {
            recordForm.classList.remove('read-only-lock');
        }

        const submitBtnContainer = document.getElementById('submitBtn');
        if (submitBtnContainer) {
            if (isReadOnly) submitBtnContainer.style.display = 'none';
            else submitBtnContainer.style.display = '';
        }

        // Handle the Cancel/Close button specifically
        if (isReadOnly && cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.classList.remove('hidden');
            cancelBtn.textContent = 'Close Window';
            // Surgical enablement for CSS-based lock
            cancelBtn.style.pointerEvents = 'auto';
            cancelBtn.style.position = 'relative';
            cancelBtn.style.zIndex = '10001';
        } else if (cancelBtn) {
            cancelBtn.style.zIndex = '';
            cancelBtn.style.pointerEvents = '';
            cancelBtn.textContent = 'Cancel';
        }
    }

    function deleteHistory(id) {
        if (!isSupervisor(currentUser ? currentUser.email : null)) {
            alert("Only Supervisors can delete history records.");
            return;
        }
        if (!confirm('Permanently delete this archived record?')) return;
        const idStr = String(id);
        recordHistory = recordHistory.filter(h => String(h.id) !== idStr);
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
        // No guard here, let it populate initially
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
            if (athleteLabel) {
                const labelText = athleteLabel.querySelector('.label-main-text');
                if (labelText) {
                    labelText.textContent = 'Team Name';
                } else {
                    // Fallback that doesn't wipe other elements (it finds the first text node)
                    let found = false;
                    for (let node of athleteLabel.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            node.textContent = 'Team Name';
                            found = true;
                            break;
                        }
                    }
                    if (!found) athleteLabel.prepend(document.createTextNode('Team Name'));
                }
            }
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
            if (athleteLabel) {
                const labelText = athleteLabel.querySelector('.label-main-text');
                if (labelText) {
                    labelText.textContent = 'Athlete Name';
                } else {
                    // Fallback
                    let found = false;
                    for (let node of athleteLabel.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            node.textContent = 'Athlete Name';
                            found = true;
                            break;
                        }
                    }
                    if (!found) athleteLabel.prepend(document.createTextNode('Athlete Name'));
                }
            }
            if (participantsSection) participantsSection.classList.add('hidden');
        }
    }

    function editRecord(id, isUpdateFlow = false, isReadOnly = false) {
        isManualUpdateMode = !!isUpdateFlow;
        console.log("✏️ editRecord called | ID:", id, "| isUpdateFlow:", isUpdateFlow, "| isManualUpdateMode:", isManualUpdateMode);

        // Instead of switchTab, we just ensure modal is open
        const modal = document.getElementById('recordModal');
        if (modal && modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        // Initialize Read-Only State
        applyReadOnlyMode(isReadOnly);

        const formTitle = document.getElementById('formTitle');
        if (formTitle && isReadOnly) {
            formTitle.textContent = 'View Record Details (Read-Only)';
        }

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
                if (matchingOpt) {
                    el.value = matchingOpt.value;
                } else if (target) {
                    const newOpt = document.createElement('option');
                    newOpt.value = target;
                    newOpt.textContent = `${target} (Archived/Unknown)`;
                    el.appendChild(newOpt);
                    el.value = target;
                }
            }
        };

        // 1. SET ALL BASIC FIELDS FIRST
        // Always keep event. Event is locked for Update flow.
        setSelectValue(evtInput, r.event);
        if (evtInput) evtInput.disabled = (isUpdateFlow || isReadOnly);

        // 🛡️ UNIVERSAL GENDER LOCK (v2.20.33)
        // Gender is ALWAYS displayed and ALWAYS locked for any Edit/Update interaction.
        if (genderInput) {
            setSelectValue(genderInput, normalizeGender(r.gender || ''));
            genderInput.disabled = true;
            genderInput.style.backgroundColor = 'var(--bg-secondary)'; // Visual lock
        }

        if (trackTypeInput) {
            trackTypeInput.value = r.trackType || 'Outdoor';
            trackTypeInput.disabled = (isUpdateFlow || isReadOnly);
        }
        if (raceNameInput) raceNameInput.value = isUpdateFlow ? '' : (r.raceName || '');
        if (notesInput) notesInput.value = isUpdateFlow ? '' : (r.notes || '');
        if (markInput) markInput.value = isUpdateFlow ? '' : (r.mark || '');
        if (windInput) windInput.value = isUpdateFlow ? '' : (r.wind || '');
        if (idrInput) idrInput.value = isUpdateFlow ? '' : (r.idr || '');
        if (townInput) townInput.value = isUpdateFlow ? '' : (r.town || '');
        if (countryInput) countryInput.value = isUpdateFlow ? '' : (r.country || '');

        // 🛡️ v2.20.34: Dynamic country placeholder
        syncCountryPlaceholder(isReadOnly, r.country);

        if (dateInput) {
            const dateToSet = isUpdateFlow ? new Date().toISOString().split('T')[0] : r.date;
            if (datePicker) datePicker.setDate(dateToSet);
            else dateInput.value = dateToSet;
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
            // 🛡️ v2.20.31/33: Form Identity Population
            const isRestrictedValue = localStorage.getItem('tf_restrict_athletes_on_edit');
            const isRestricted = (isRestrictedValue === 'true' || isRestrictedValue === null);

            // Age Group is locked only for UPDATE flow or if it's strictly restricted
            if (isUpdateFlow) {
                setSelectValue(ageGroupInput, normalizeAgeGroup(r.ageGroup));
                if (ageGroupInput) {
                    ageGroupInput.disabled = true;
                    ageGroupInput.style.backgroundColor = 'var(--bg-secondary)';
                }
            } else {
                setSelectValue(ageGroupInput, r.ageGroup);
            }

            // 🛡️ ATHLETE FILTERING BASELINE (v2.20.33)
            // Even if "Restrict" is off, we filter by Gender as a safety layer for ALL edits.
            const filterObj = { gender: r.gender };

            // Layer 2: Strict Restriction adds Age Group & Date sensitivity
            // v2.20.52: If isManualUpdateMode is true, we ALWAYS restrict by Age Group for consistency
            if ((isUpdateFlow && isRestricted) || isManualUpdateMode) {
                filterObj.ageGroup = r.ageGroup;
                filterObj.date = dateInput ? dateInput.value : r.date;
                console.log("🛡️ [DIAGNOSTIC] Forced Update Filter Active:", filterObj);
            } else {
                console.log("🛡️ [DIAGNOSTIC] Baseline Filter (Gender only):", filterObj);
            }

            populateAthleteDropdown(filterObj);
            console.log("🛡️ [DIAGNOSTIC] Dropdown populated for:", r.athlete, "Mode:", isManualUpdateMode ? "UPDATE" : "EDIT");

            if (isRelay) {
                if (relayTeamNameInput) relayTeamNameInput.value = isUpdateFlow ? '' : (r.athlete || '');
                const p = isUpdateFlow ? [] : (r.relayParticipants || []);
                if (relayAthlete1) relayAthlete1.value = p[0] || '';
                if (relayAthlete2) relayAthlete2.value = p[1] || '';
                if (relayAthlete3) relayAthlete3.value = p[2] || '';
                if (relayAthlete4) relayAthlete4.value = p[3] || '';
            } else {
                setSelectValue(athleteInput, isUpdateFlow ? '' : r.athlete);
                const athleteName = isUpdateFlow ? '' : r.athlete;
                const athlete = findAthleteByNormalizedName(athleteName);
                updateAthleteDobBadge(athlete);
            }

            // final sync for age calculation just in case
            if (typeof updateCalculatedAgeGroup === 'function') {
                // We keep it suppressed until the very end
            }

            console.log("Edit form population complete.");
            isSuppressingAutoFill = false; // RE-ENABLE Auto-Calculations

            // Final Lock for Read-Only Mode (to prevent overrides from auto-calculate scripts)
            if (isReadOnly) {
                applyReadOnlyMode(true);
            }
        }, 300); // Increased to 300ms for heavy sync environments

        editingId = id;
        editingHistoryId = null;

        if (!isReadOnly) {
            if (formTitle) formTitle.textContent = isUpdateFlow ? 'Update With New Record' : 'Edit Record (Archives Old)';
            if (submitBtn) {
                const span = submitBtn.querySelector('span');
                if (span) span.textContent = isUpdateFlow ? 'Log New Record' : 'Update & Archive';
                submitBtn.style.background = isUpdateFlow ? '' : 'linear-gradient(135deg, var(--warning), #f59e0b)';
            }
        }
        if (cancelBtn) cancelBtn.classList.remove('hidden');
        if (recordForm) recordForm.scrollIntoView({ behavior: 'smooth' });
    }

    function cancelEdit() {
        isManualUpdateMode = false; // v2.20.53 reset
        editingId = null;
        editingHistoryId = null;
        previousTab = null;
        if (recordForm) {
            recordForm.reset();
            // Re-enable and unlock
            applyReadOnlyMode(false);
            const elements = recordForm.querySelectorAll('input, select, textarea, button');
            elements.forEach(el => {
                el.disabled = false;
                el.style.pointerEvents = '';
            });
        }
        const submitBtnContainer = document.getElementById('submitBtn');
        if (submitBtnContainer) submitBtnContainer.classList.remove('hidden');

        toggleRelayFields(false);
        if (evtInput) evtInput.disabled = false;
        if (genderInput) {
            genderInput.disabled = false;
            genderInput.style.backgroundColor = '';
        }
        if (ageGroupInput) {
            ageGroupInput.disabled = false;
            ageGroupInput.style.backgroundColor = '';
        }
        if (trackTypeInput) trackTypeInput.disabled = false;

        // Reset athlete dropdown to full list
        populateAthleteDropdown();

        if (datePicker) {
            datePicker.setDate(new Date());
        } else if (dateInput && dateInput.type === 'date') {
            dateInput.valueAsDate = new Date();
        }

        if (formTitle) {
            formTitle.textContent = 'Log New Record';
            formTitle.style.color = '';
        }
        if (submitBtn) {
            submitBtn.querySelector('span').textContent = 'Log Record';
            submitBtn.style.background = '';
        }
        if (cancelBtn) cancelBtn.classList.add('hidden');
        isSuppressingAutoFill = false;

        // Hide DOB badge and modal
        updateAthleteDobBadge(null);
        const modal = document.getElementById('recordModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
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
            pendingDeleteRecord.updatedBy = getCurrentUsername();

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
            db.ref('records').set(records).then(() => {
                updatePersistentStats(); // Trigger stats update on record change
            }).catch(err => {
                console.error("Firebase Save Failed (Records):", err);
                alert("Cloud Sync Error: Your changes were reverted. " + err.message);
            });
        }
        populateAthleteFilter();
    }

    async function updatePersistentStats() {
        if (!isAdmin) return;
        console.log("📊 Recalculating Persistent Stats...");

        rebuildPerformanceIndexes();

        // Basic aggregation
        const agg = {};
        records.forEach(r => {
            const ev = events.find(e => e.name === r.event);
            const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));
            if (isRelay) return;
            if (r.approved === false) return;

            if (r.athlete) {
                if (!agg[r.athlete]) agg[r.athlete] = { count: 0, minYear: null, maxYear: null };
                agg[r.athlete].count++;
                if (r.date) {
                    const y = new Date(r.date).getFullYear();
                    if (agg[r.athlete].minYear === null || y < agg[r.athlete].minYear) agg[r.athlete].minYear = y;
                    if (agg[r.athlete].maxYear === null || y > agg[r.athlete].maxYear) agg[r.athlete].maxYear = y;
                }
            }
        });

        // Convert to enrichment objects
        let statsData = Object.keys(agg).map(name => {
            const data = agg[name];
            const athlete = athleteLookupMap[name];
            let ratioVal = 0;
            if (data.minYear !== null && data.maxYear !== null && data.count > 0) {
                const diff = data.maxYear - data.minYear;
                if (diff > 0) ratioVal = (data.count / diff) * 100;
            }

            const item = {
                name: name,
                count: data.count,
                ratio: ratioVal.toFixed(2) + '%',
                gender: athlete ? athlete.gender : '',
                dob: athlete ? athlete.dob : '',
                age: null,
                ageCategory: null
            };

            if (item.dob) {
                const age = getExactAge(item.dob, new Date());
                item.age = age;
                if (age !== null && age >= 35) {
                    const g = normalizeGenderLookups(item.gender);
                    let prefix = g === 'men' ? 'M' : (g === 'women' ? 'W' : 'X');
                    item.ageCategory = prefix + (Math.floor(age / 5) * 5).toString();
                }
            }
            return item;
        });

        // Rankings
        const sortedByCount = [...statsData].sort((a, b) => b.count - a.count);
        sortedByCount.forEach((item, index) => {
            const rank = index + 1;
            item.generalRank = rank.toString();
            if (rank === 1) item.generalRank += ' 🥇';
            else if (rank === 2) item.generalRank += ' 🥈';
            else if (rank === 3) item.generalRank += ' 🥉';
        });

        const contentByAge = {};
        statsData.forEach(item => {
            const cat = item.ageCategory || 'Unknown';
            if (!contentByAge[cat]) contentByAge[cat] = [];
            contentByAge[cat].push(item);
        });

        Object.keys(contentByAge).forEach(cat => {
            const group = contentByAge[cat];
            group.sort((a, b) => b.count - a.count);
            group.forEach((item, index) => {
                item.ageRank = index + 1;
                if (item.ageRank === 1) item.ageMedal = '🥇';
                else if (item.ageRank === 2) item.ageMedal = '🥈';
                else if (item.ageRank === 3) item.ageMedal = '🥉';
                else item.ageMedal = '';
            });
        });

        const statsPackage = {
            updatedAt: new Date().toISOString(),
            data: statsData
        };

        localStorage.setItem('tf_stats', JSON.stringify(statsPackage));
        if (db) {
            try {
                await db.ref('stats').set(statsPackage);
                console.log("✅ Persistent Stats synced to Cloud.");
            } catch (err) {
                console.error("❌ Stats sync failed:", err);
            }
        }
        return statsData;
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

        const archivedIds = new Set(recordHistory.map(h => String(h.originalId)).filter(id => id && id !== 'undefined'));

        // Merge records and pendingrecs for unified display
        const mergedRecords = [...records, ...(pendingrecs || [])];

        const filtered = mergedRecords.filter(r => {
            const rIdStr = String(r.id);
            const isSup = isSupervisor(currentUser ? currentUser.email : null);

            // REJECT PROTECTION (Tombstones)
            if (recentlyRejected.has(rIdStr)) return false;

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
                case 'default': {
                    // 1. Sort by Event Name
                    const idxA = events.findIndex(e => e.name === a.event);
                    const idxB = events.findIndex(e => e.name === b.event);

                    let eventDiff = 0;
                    if (idxA !== -1 && idxB !== -1) {
                        eventDiff = idxA - idxB;
                    } else {
                        eventDiff = (a.event || '').localeCompare(b.event || '');
                    }
                    if (eventDiff !== 0) return eventDiff * direction;

                    // 2. Sort by Gender (Male first)
                    const rankA = a.gender === 'Male' ? 1 : (a.gender === 'Female' ? 2 : 3);
                    const rankB = b.gender === 'Male' ? 1 : (b.gender === 'Female' ? 2 : 3);
                    const genderDiff = rankA - rankB;
                    if (genderDiff !== 0) return genderDiff * direction;

                    // 3. Sort by Age Group
                    const ageA = parseInt(a.ageGroup) || 0;
                    const ageB = parseInt(b.ageGroup) || 0;
                    return (ageA - ageB) * direction;
                }
                case 'date':
                    return (new Date(a.date) - new Date(b.date)) * direction;
                case 'athlete':
                    return a.athlete.localeCompare(b.athlete) * direction;
                case 'event':
                    const idxA = events.findIndex(e => e.name === a.event);
                    const idxB = events.findIndex(e => e.name === b.event);
                    if (idxA !== -1 && idxB !== -1) {
                        return (idxA - idxB) * direction;
                    }
                    return a.event.localeCompare(b.event) * direction;
                case 'mark':
                    // Numeric sort for marks if possible
                    valA = parseFloat(a.mark.replace(/:/g, '')) || 0;
                    valB = parseFloat(b.mark.replace(/:/g, '')) || 0;
                    if (valA !== valB) return (valA - valB) * direction;
                    return a.mark.localeCompare(b.mark, undefined, { numeric: true }) * direction;
                case 'ageGroup':
                    return ((parseInt(a.ageGroup) || 0) - (parseInt(b.ageGroup) || 0)) * direction;
                case 'gender': {
                    const rankA = a.gender === 'Male' ? 1 : (a.gender === 'Female' ? 2 : 3);
                    const rankB = b.gender === 'Male' ? 1 : (b.gender === 'Female' ? 2 : 3);
                    return (rankA - rankB) * direction;
                }
                case 'town':
                    return (a.town || '').localeCompare(b.town || '') * direction;
                case 'raceName':
                    return (a.raceName || '').localeCompare(b.raceName || '') * direction;
                case 'wind':
                    return ((parseFloat(a.wind) || 0) - (parseFloat(b.wind) || 0)) * direction;
                case 'idr':
                    return ((parseInt(a.idr) || 0) - (parseInt(b.idr) || 0)) * direction;
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
                    // New column, default to asc (except date/mark)
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

        const table = document.getElementById('reportTable');
        if (table) {
            // Restriction: Only Admins and Supervisors see the Actions column (v2.20.59)
            const isPrivileged = isAdminOrSupervisor(currentUser ? currentUser.email : null);
            table.classList.toggle('hide-actions', !isPrivileged);
        }

        const filtered = getFilteredRecords();
        const isHideNotesChecked = hideNotesSymbol && hideNotesSymbol.checked;

        if (filtered.length === 0) return;
        // Sort applied in getFilteredRecords

        // --- Dynamic Race Name Width Calculation (v2.20.57) ---
        const raceNames = filtered.map(r => (r.raceName || '').trim());
        const lengths = raceNames.map(n => n.length).sort((a, b) => b - a);
        let targetLength = 0;
        if (lengths.length > 1) {
            targetLength = lengths[1]; // Second largest
        } else if (lengths.length === 1) {
            targetLength = lengths[0]; // Only one
        }
        // Approx 8.5px per character + some padding
        const calculatedWidth = targetLength > 0 ? (targetLength * 8.5) + 15 : 120;
        const raceColWidth = Math.max(100, Math.min(450, calculatedWidth));

        // --- Dynamic Athlete Width Calculation (v2.20.58) ---
        const athleteNames = filtered.map(r => (r.athlete || '').trim());
        const maxAthleteLen = athleteNames.reduce((max, n) => Math.max(max, n.length), 0);
        // v2.20.76: More generous width (9px/char + 45px padding) with Max-Width Guard
        const athleteColWidth = Math.max(160, Math.min(400, (maxAthleteLen * 9) + 45));

        // --- Dynamic Age Group Width Calculation (v2.20.77) ---
        const ageGroups = filtered.map(r => (r.ageGroup || '').trim());
        const maxAgeLen = ageGroups.reduce((max, n) => Math.max(max, n.length), 0);
        const ageColWidth = Math.max(70, Math.min(120, (maxAgeLen * 9) + 30));

        // --- Dynamic IDR & Wind Width Calculation (v2.20.78) ---
        const idrs = filtered.map(r => (r.idr || '').trim());
        const maxIdrLen = idrs.reduce((max, n) => Math.max(max, n.length), 0);
        const idrColWidth = Math.max(60, Math.min(110, (maxIdrLen * 9) + 30));

        const winds = filtered.map(r => (r.wind || '').trim());
        const maxWindLen = winds.reduce((max, n) => Math.max(max, n.length), 0);
        const windColWidth = Math.max(60, Math.min(110, (maxWindLen * 9) + 30));

        // Update header widths dynamically
        if (table) {
            const ageHeader = table.querySelector('th:nth-child(3)');
            if (ageHeader) {
                ageHeader.style.width = `${ageColWidth}px`;
                ageHeader.style.minWidth = `${ageColWidth}px`;
            }
            const athleteHeader = table.querySelector('th:nth-child(4)');
            if (athleteHeader) {
                athleteHeader.style.width = `${athleteColWidth}px`;
                athleteHeader.style.minWidth = `${athleteColWidth}px`;
            }
            const idrHeader = table.querySelector('th:nth-child(7)');
            if (idrHeader) {
                idrHeader.style.width = `${idrColWidth}px`;
                idrHeader.style.minWidth = `${idrColWidth}px`;
            }
            const windHeader = table.querySelector('th:nth-child(8)');
            if (windHeader) {
                windHeader.style.width = `${windColWidth}px`;
                windHeader.style.minWidth = `${windColWidth}px`;
            }
            const raceHeader = table.querySelector('th:nth-child(11)');
            if (raceHeader) {
                raceHeader.style.width = `${raceColWidth}px`;
                raceHeader.style.minWidth = `${raceColWidth}px`;
                raceHeader.style.maxWidth = `${raceColWidth}px`;
                raceHeader.style.overflow = 'hidden';
                raceHeader.style.textOverflow = 'ellipsis';
            }
        }
        // --------------------------------------------------------

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
                    <td class="expand-col" style="text-align:center;" data-label="Notes">
                        ${(isHideNotesChecked && hasNotes) ? `<button class="toggle-notes-btn" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:1.2rem; font-weight:bold; padding:0; width:24px; height:24px; line-height:24px;">+</button>` : ''}
                    </td>
                    <td style="font-weight:600;" data-label="Αγώνισμα">${r.event}</td>
                    <td style="white-space:nowrap;" data-label="Κατηγορία">${ageDisplay}</td>
                    <td style="width:${athleteColWidth}px; min-width:${athleteColWidth}px;" data-label="Αθλητής/τρια">
                        <div style="font-weight:500; display:flex; align-items:center; gap:5px;">
                            ${r.athlete}
                            ${(athlete && athlete.isTeam) ? '<span class="badge" style="background:var(--accent); color:white; font-size:0.7rem; padding: 2px 6px;">TEAM</span>' : ''}
                        </div>
                        ${hasNotes ? `
                            <div class="record-notes ${isHideNotesChecked ? 'hidden' : ''}" style="font-size:0.85em; color:var(--text-muted); font-style:italic; margin-top:2px; white-space:pre-wrap;">${r.notes}</div>
                        ` : ''}
                    </td>
                    <td data-label="Φύλο">${r.gender === 'Male' ? 'Άνδρες' : (r.gender === 'Female' ? 'Γυναίκες' : (r.gender || '-'))}</td>
                    <td style="font-weight:700; color:var(--accent); text-align:center;" data-label="Επίδοση">${formatTimeMark(r.mark, r.event)}</td>
                    <td data-label="IDR">
                        ${r.isPendingDelete ?
                    `<span class="badge-pending" style="background:var(--danger); color:white;">⚠️ Προς Διαγραφή</span>` :
                    (r.isPending ? `<span class="badge-pending">Προς Εγκριση</span>` : (r.idr || '-'))
                }
                    </td>
                    <td data-label="Άνεμος">${r.wind || '-'}</td>
                    <td style="white-space:nowrap;" data-label="Ημερομηνία">${new Date(r.date).toLocaleDateString('en-GB')}</td>
                    <td data-label="Πόλη">${r.town || ''}</td>
                    <td style="width:${raceColWidth}px; max-width:${raceColWidth}px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.raceName || ''}" data-label="Διοργάνωση">${r.raceName || ''}</td>
                    <td class="actions-col" style="white-space:nowrap;" data-label="Ενέργειες">
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
                        if (isSup || isAdm) {
                            return `
                                <button class="btn-icon update-btn" data-id="${r.id}" title="Update With New Record (Archives Old)" style="color:var(--text); margin:0; padding:2px;">🔄</button>
                                <button class="btn-icon edit edit-btn" data-id="${r.id}" title="Edit" style="color:var(--text); margin:0; padding:2px; margin-left:1px;">✏️</button>
                                <button class="btn-icon delete delete-btn" data-id="${r.id}" title="Delete" style="color:var(--text); margin:0; padding:2px; margin-left:1px;">🗑️</button>
                            `;
                        } else if (isAuthor) {
                            return `
                                <button class="btn-icon edit edit-btn" data-id="${r.id}" title="Edit" style="color:var(--text); margin:0; padding:2px;">✏️</button>
                                <button class="btn-icon delete delete-btn" data-id="${r.id}" title="Delete" style="color:var(--text); margin:0; padding:2px; margin-left:1px;">🗑️</button>
                            `;
                        } else {
                            return ''; // Simple users don't see edit/delete on non-authored records
                        }
                    }
                })()}
                    </td>
                `;

            // Add double-click listener for Read-Only view
            tr.style.cursor = 'pointer'; // Visual hint
            tr.title = 'Double-click to view details';
            tr.addEventListener('dblclick', () => {
                openRecordModal(r.id, false, true);
            });

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
        // Enforce STRICT approval check (must be explicitly true)
        const rawData = getFilteredRecords().filter(r => r.approved !== false);

        const sortedData = [...rawData].sort((a, b) => {
            // 1. Age Group (Numerical sort)
            const ageA = parseInt(a.ageGroup) || 0;
            const ageB = parseInt(b.ageGroup) || 0;
            if (ageA !== ageB) return ageA - ageB;

            // 2. Gender (Male first, then Female)
            if (a.gender !== b.gender) {
                if (a.gender === 'Male') return -1;
                if (b.gender === 'Male') return 1;
                return (a.gender || '').localeCompare(b.gender || '');
            }

            // 3. Track Type (Outdoor first, then Indoor)
            if ((a.trackType || 'Outdoor') !== (b.trackType || 'Outdoor')) {
                return (a.trackType || 'Outdoor') === 'Outdoor' ? -1 : 1;
            }

            // 4. Manual Event Order
            const idxA = events.findIndex(e => e.name === a.event);
            const idxB = events.findIndex(e => e.name === b.event);
            if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
                return idxA - idxB;
            }

            // 5. Date (Recency)
            return b.date.localeCompare(a.date);
        });

        return sortedData.map(r => {
            const athlete = findAthleteByNormalizedName(r.athlete);
            let dobDisplay = '-';
            if (athlete && athlete.dob) {
                try {
                    const d = new Date(athlete.dob);
                    if (!isNaN(d)) {
                        dobDisplay = d.toLocaleDateString('en-GB');
                    }
                } catch (e) {
                    dobDisplay = athlete.dob;
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
        const data = getExportData();
        if (!data.length) return alert('No approved data to export!');

        const timestamp = new Date().toLocaleString('el-GR');
        let csv = `Ημερομηνία Εξαγωγής: ${timestamp}\n\n`;

        // Grouping logic
        let currentGroupKey = null;

        data.forEach(r => {
            const genderTitle = r.gender === 'Male' ? 'Άνδρες' : (r.gender === 'Female' ? 'Γυναίκες' : (r.gender || 'Mixed'));
            const trackTypeTitle = (r.trackType || 'Outdoor') === 'Outdoor' ? 'Ανοικτός Στίβος' : 'Κλειστός Στίβος';
            const groupKey = `${r.ageGroup || '-'} - ${genderTitle} - ${trackTypeTitle}`;

            if (groupKey !== currentGroupKey) {
                if (currentGroupKey !== null) csv += '\n'; // Spacer
                csv += `"${groupKey}"\n`;
                csv += 'Αγώνισμα,Κατηγ.,Αθλητής/τρια,Ημ. Γεν.,Επίδοση,IDR,Άνεμος,Ημερομηνία,Πόλη,Διοργάνωση,Σημειώσεις\n';
                currentGroupKey = groupKey;
            }

            csv += `"${r.event}","${r.ageGroup || ''}","${r.athlete}","${r.dob}","${r.mark}","${r.idr || ''}","${r.wind || ''}","${r.formattedDate}","${r.town || ''}","${r.raceName || ''}","${r.notes || ''}"\n`;
        });

        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function exportToHTML() {
        const data = getExportData();
        if (!data.length) return alert('No officially approved data to export!');

        const timestamp = new Date().toLocaleString('el-GR');

        // --- Grouping: Track Type → Gender → Rows ---
        // Build a nested structure: { trackType: { gender: [rows] } }
        const grouped = {};
        const trackTypeOrder = [];
        const genderOrder = {};

        data.forEach(r => {
            const trackTypeTitle = (r.trackType || 'Outdoor') === 'Outdoor' ? 'Ανοικτός Στίβος' : 'Κλειστός Στίβος';
            const genderTitle = r.gender === 'Male' ? 'Άνδρες' : (r.gender === 'Female' ? 'Γυναίκες' : (r.gender || 'Mixed'));

            if (!grouped[trackTypeTitle]) {
                grouped[trackTypeTitle] = {};
                trackTypeOrder.push(trackTypeTitle);
                genderOrder[trackTypeTitle] = [];
            }
            if (!grouped[trackTypeTitle][genderTitle]) {
                grouped[trackTypeTitle][genderTitle] = [];
                genderOrder[trackTypeTitle].push(genderTitle);
            }
            grouped[trackTypeTitle][genderTitle].push(r);
        });

        const tableHeaders = `
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
            </tr>`;

        let htmlTables = '';
        let isFirstSection = true;

        trackTypeOrder.forEach(trackType => {
            // Track Type = main header (h2)
            htmlTables += `<h2 class="track-type-header ${isFirstSection ? 'first-header' : ''}">${trackType}</h2>`;
            isFirstSection = false;

            genderOrder[trackType].forEach(gender => {
                // Gender = subtitle (h3)
                const rows = grouped[trackType][gender];
                let rowsHtml = '';
                rows.forEach(r => {
                    const hasNotes = r.notes && r.notes.trim().length > 0;
                    rowsHtml += `
                        <tr>
                            <td style="font-weight:600;">${r.event}</td>
                            <td>${r.ageGroup || '-'}</td>
                            <td>
                                <div style="font-weight:500;">${r.athlete}</div>
                                ${hasNotes ? `<div style="font-size:0.85em; color:#888; font-style:italic; margin-top:2px;">${r.notes}</div>` : ''}
                            </td>
                            <td>${r.dob}</td>
                            <td style="font-weight:700; color:#5b21b6;">${formatTimeMark(r.mark, r.event)}</td>
                            <td>${r.idr || '-'}</td>
                            <td>${r.wind || '-'}</td>
                            <td>${r.formattedDate}</td>
                            <td>${r.town || ''}</td>
                            <td>${r.raceName || ''}</td>
                        </tr>`;
                });

                htmlTables += `
                    <h3 class="gender-subtitle">${gender}</h3>
                    <table>
                        <thead>${tableHeaders}</thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>`;
            });
        });

        // Greek flag SVG (circular, same as main report header)
        const greekFlagSVG = `<svg width="52" height="52" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"
            style="border-radius:50%; box-shadow: 0 2px 8px rgba(0,91,174,0.4); flex-shrink:0;">
            <rect width="18" height="18" fill="#005BAE"/>
            <g stroke="#fff" stroke-width="2">
                <line x1="0" y1="3" x2="18" y2="3"/>
                <line x1="0" y1="7" x2="18" y2="7"/>
                <line x1="0" y1="11" x2="18" y2="11"/>
                <line x1="0" y1="15" x2="18" y2="15"/>
            </g>
            <rect width="10" height="10" fill="#005BAE"/>
            <g stroke="#fff" stroke-width="2">
                <line x1="5" y1="0" x2="5" y2="10"/>
                <line x1="0" y1="5" x2="10" y2="5"/>
            </g>
        </svg>`;

        const htmlLayout = `<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <title>Πανελλήνια Ρεκόρ Βετεράνων Αθλητών Στίβου</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; background: #fff; }
        .report-header {
            display: flex; align-items: center; gap: 18px;
            border-bottom: 3px solid #005BAE; padding-bottom: 16px; margin-bottom: 8px;
        }
        .report-header-text h1 {
            margin: 0; font-size: 1.4rem; color: #005BAE; font-weight: 700;
        }
        .report-header-text .subtitle {
            font-size: 0.85rem; color: #555; margin-top: 4px;
        }
        .timestamp { font-size: 0.8rem; color: #888; margin-top: 2px; }
        .track-type-header {
            color: #fff; background: #005BAE;
            padding: 8px 16px; border-radius: 6px;
            margin-top: 32px; margin-bottom: 0;
            font-size: 1.15rem; page-break-before: always;
        }
        .track-type-header.first-header { page-break-before: avoid; margin-top: 20px; }
        .gender-subtitle {
            color: #005BAE; border-left: 4px solid #005BAE;
            padding-left: 10px; margin-top: 20px; margin-bottom: 6px;
            font-size: 1rem;
        }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #dde3ed; padding: 8px 7px; text-align: left; font-size: 0.85rem; }
        th { background-color: #eef2f8; font-weight: bold; color: #2c3e6b; }
        tr:nth-child(even) td { background-color: #f7f9fc; }
    </style>
</head>
<body>
    <div class="report-header">
        ${greekFlagSVG}
        <div class="report-header-text">
            <h1>Πανελλήνια Ρεκόρ Βετεράνων Αθλητών Στίβου</h1>
            <div class="subtitle">Greek Master Athletics – Πανελλήνια Ρεκόρ</div>
            <div class="timestamp">Ημερομηνία Εξαγωγής: ${timestamp}</div>
        </div>
    </div>
    ${htmlTables}
</body>
</html>`;

        const blob = new Blob([htmlLayout], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'report.html';
        link.click();
    }


    async function exportToPDF() {
        if (!window.jspdf) return alert('PDF library not loaded.');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');

        if (typeof ROBOTO_BASE64 !== 'undefined') {
            const fontName = 'Roboto-Regular.ttf';
            doc.addFileToVFS(fontName, ROBOTO_BASE64);
            doc.addFont(fontName, 'Roboto', 'normal');
            doc.setFont('Roboto');
        }

        const data = getExportData();
        if (!data.length) return alert('No approved data to export!');

        const timestamp = new Date().toLocaleString('el-GR');

        doc.setFontSize(16);
        doc.text("🇬🇷 Πανελλήνια Ρεκόρ Βετεράνων Αθλητών Στίβου", 14, 15);
        doc.setFontSize(10);
        doc.text(`Ημερομηνία Εξαγωγής: ${timestamp}`, doc.internal.pageSize.getWidth() - 15, 15, { align: 'right' });

        const headers = [['Αγώνισμα', 'Κατηγ.', 'Αθλητής/τρια', 'Ημ. Γεν.', 'Επίδοση', 'IDR', 'Άνεμος', 'Ημερομηνία', 'Πόλη', 'Διοργάνωση']];
        let finalY = 20;

        // Grouping logic for PDF
        const groupedData = {};
        data.forEach(r => {
            const genderTitle = r.gender === 'Male' ? 'Άνδρες' : (r.gender === 'Female' ? 'Γυναίκες' : (r.gender || 'Mixed'));
            const trackTypeTitle = (r.trackType || 'Outdoor') === 'Outdoor' ? 'Ανοικτός Στίβος' : 'Κλειστός Στίβος';
            const groupKey = `${r.ageGroup || '-'} - ${genderTitle} - ${trackTypeTitle}`;
            if (!groupedData[groupKey]) groupedData[groupKey] = [];
            groupedData[groupKey].push([
                r.event,
                r.ageGroup || '-',
                r.notes ? `${r.athlete}\n(Σημ: ${r.notes})` : r.athlete,
                r.dob,
                formatTimeMark(r.mark, r.event),
                r.idr || '-',
                r.wind || '-',
                r.formattedDate,
                r.town || '-',
                r.raceName || '-'
            ]);
        });

        Object.keys(groupedData).forEach((groupTitle, index) => {
            if (index > 0) doc.addPage();

            doc.setFontSize(14);
            doc.text(groupTitle, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });

            doc.autoTable({
                head: headers,
                body: groupedData[groupTitle],
                startY: 30,
                theme: 'grid',
                headStyles: { fillColor: [139, 92, 246] },
                styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 8 },
                columnStyles: {
                    2: { cellWidth: 40 }, // Athlete / Notes
                    4: { halign: 'center', fontStyle: 'bold' } // Performance
                }
            });
        });

        doc.save(`report.pdf`);
    }

    function exportDatabase() {
        const db = {
            version: 6,
            exportedAt: new Date().toISOString(),
            events: events,
            records: records,
            athletes: athletes,
            countries: countries,
            history: history,
            pendingrecs: pendingrecs || [],
            tombstones: Array.from(recentlyRejected || []),
            users: appUsers,
            wma_data: wmaData,
            iaaf_updates: iaafUpdates,
            theme: localStorage.getItem('tf_theme') || 'theme-default',
            seed_version: localStorage.getItem('tf_relays_seed_version') || '0',
            seeded: localStorage.getItem('tf_relays_seeded') || 'false'
        };
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const timestamp = `${yy}${mm}${dd}-${hh}${min}`;

        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `track_data-${timestamp}.json`;
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
        e.target.value = '';
    }

    // New: Handle specialized DOB restoration from JSON
    window.handleDobRestoration = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                const beforeCount = athletes.filter(a => a.dob && a.dob.trim() !== '').length;
                processAthleteData(jsonData);
                const afterCount = athletes.filter(a => a.dob && a.dob.trim() !== '').length;
                const restored = afterCount - beforeCount;

                alert(`Restoration complete! ${restored} Date of Birth entries were recovered.`);
                console.log(`DOB Restoration: ${restored} restored, total with DOB: ${afterCount}`);
            } catch (err) {
                alert('Error processing restoration file: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };

    function processAthleteData(data) {
        try {
            // Support both raw arrays and full DB export objects
            let rows = [];
            if (Array.isArray(data)) {
                rows = data;
            } else if (data && typeof data === 'object' && Array.isArray(data.athletes)) {
                rows = data.athletes;
                console.log("Detected full DB export, extracting 'athletes' array.");
            } else {
                console.warn("processAthleteData: Input is not an array or a DB export with 'athletes' key.");
                return;
            }

            let importedCount = 0;
            rows.forEach(row => {
                // Normalize keys to lowercase for flexible matching
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    const cleanKey = key.toString().toLowerCase().trim().replace(/\s+/g, '');
                    normalizedRow[cleanKey] = row[key];
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

                // Parse DOB (Excel dates are often numbers) - INTERNAL FORMAT IS YYYY-MM-DD for <input type="date"> compatibility
                let dob = '';
                const fmtYYYYMMDD = d => {
                    const y = d.getUTCFullYear();
                    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(d.getUTCDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                };
                if (dobVal) {
                    if (typeof dobVal === 'number') {
                        // Excel serial date
                        dob = fmtYYYYMMDD(new Date(Math.round((dobVal - 25569) * 864e5)));
                    } else {
                        const s = dobVal.toString().trim();
                        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
                            dob = s.split('T')[0];
                        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
                            // Convert DD/MM/YYYY to YYYY-MM-DD
                            const [d, m, y] = s.split('/');
                            dob = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        } else {
                            const parsed = new Date(s);
                            dob = isNaN(parsed) ? s : fmtYYYYMMDD(parsed);
                        }
                    }
                }

                // Check duplicates (by Name + DOB or ID)
                const existingIdx = athletes.findIndex(a =>
                    (idVal && a.id == idVal) ||
                    (a.firstName.toLowerCase() === firstName.toString().toLowerCase() &&
                        a.lastName.toLowerCase() === lastName.toString().toLowerCase())
                );

                if (existingIdx !== -1) {
                    // Update existing if new info is present
                    let updated = false;
                    const a = athletes[existingIdx];
                    if (!a.dob && dob) { a.dob = dob; updated = true; }
                    const idValStr = idVal ? idVal.toString() : '';
                    if (!a.idNumber && idValStr && /^\d{6}$/.test(idValStr)) {
                        a.idNumber = idValStr; updated = true;
                    }
                    if (!a.gender && gender) { a.gender = gender; updated = true; }
                    if (!a.club && normalizedRow['club']) { a.club = normalizedRow['club']; updated = true; }
                    if (updated) importedCount++;
                } else {
                    const newId = (idVal && /^\d{6}$/.test(idVal.toString())) ? idVal.toString() : generate6DigitId();
                    const newAthlete = {
                        id: newId,
                        idNumber: newId,
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
                const workbook = XLSX.read(data, { type: 'array', cellDates: false, cellNF: false, cellText: false });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "", raw: true });

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
            { id: 'firstName', label: 'First Name' },
            { id: 'lastName', label: 'Last Name' },
            { id: 'dob', label: 'Date of Birth' },
            { id: 'gender', label: 'Gender' },
            { id: 'ageGroup', label: 'Age Group' },
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
            { id: 'firstName', label: 'First Name' },
            { id: 'lastName', label: 'Last Name' },
            { id: 'dob', label: 'Date of Birth' },
            { id: 'gender', label: 'Gender' },
            { id: 'ageGroup', label: 'Age Group' },
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

        // Reset filter checkboxes
        const chkU = document.getElementById('chkUnmatched');
        if (chkU) chkU.checked = false;
        const chkN = document.getElementById('chkOnlyNew');
        if (chkN) chkN.checked = false;

        // Build table header
        let theadHtml = '<tr>';
        theadHtml += `<th style="padding:10px 12px; border:1px solid #e2e8f0; text-align:center; background:#f8fafc; width:40px;"><input type="checkbox" id="chkSelectAll" checked onclick="toggleAllImport(this.checked)" style="cursor:pointer; width:16px; height:16px;"></th>`;
        mappedFields.forEach(f => {
            theadHtml += `<th style="padding:10px 12px; border:1px solid #e2e8f0; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; background:#f8fafc; color:#475569; font-weight:700;">${f.label}</th>`;
        });
        theadHtml += `<th style="padding:10px 12px; border:1px solid #e2e8f0; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; background:#eef2ff; color:#4338ca; font-weight:700;">&#9998; Athlete</th>`;
        theadHtml += `<th style="padding:10px 12px; border:1px solid #e2e8f0; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; background:#ecfdf5; color:#059669; font-weight:700;">Compare</th>`;
        theadHtml += '</tr>';

        // Build rows
        let tbodyHtml = '';
        jsonData.forEach((row, idx) => {
            const evVal = (row[mapping['event']] || '').toString().trim();
            const athVal = (row[mapping['athlete']] || '').toString().trim();
            const genVal = (row[mapping['gender']] || '').toString().trim();
            const ttVal = (row[mapping['trackType']] || '').toString().trim();
            const agVal = mapping['ageGroup'] ? (row[mapping['ageGroup']] || '').toString().trim() : '';
            const markVal = mapping['mark'] ? (row[mapping['mark']] || '').toString().trim() : '';

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
                ageGroup: mapping['ageGroup'] ? (agVal && /^[MW]?(3[5-9]|[4-9]\d|100)$/.test(agVal.replace(/\+/, ''))) : null,
            };

            const hasRed = Object.keys(fieldMatch).some(k => fieldMatch[k] === false);

            // Helper: format a raw cell value as dd/mm/yyyy for date fields
            const serialToDdMmYyyy = n => {
                const d = new Date(Math.round((n - 25569) * 86400 * 1000));
                return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
            };
            const fmtCell = (fieldId, rawVal) => {
                if (['date', 'dob'].includes(fieldId)) {
                    if (rawVal !== '' && !isNaN(rawVal) && typeof rawVal === 'number') return serialToDdMmYyyy(rawVal);
                    const s = rawVal.toString().trim();
                    if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const [y, mo, d2] = s.split('T')[0].split('-'); return `${d2}/${mo}/${y}`; }
                    return s; // already dd/mm/yyyy or any other text
                }
                return rawVal.toString().trim();
            };

            tbodyHtml += `<tr data-has-red="${hasRed}">`;
            tbodyHtml += `<td style="padding:8px; border:1px solid #e2e8f0; text-align:center;"><input type="checkbox" class="row-select" data-idx="${idx}" checked style="cursor:pointer; width:16px; height:16px;"></td>`;
            mappedFields.forEach(f => {
                const val = fmtCell(f.id, row[mapping[f.id]] !== undefined ? row[mapping[f.id]] : '');
                let bg = '#ffffff';
                let cursor = 'default';
                let onclick = '';

                if (f.id === 'event') {
                    // Interactive Event Dropdown (v2.20.43)
                    let opts = `<option value="">-- Select Event --</option>`;
                    events.sort((a, b) => a.name.localeCompare(b.name)).forEach(ev => {
                        const sel = ev.name.toLowerCase() === val.toLowerCase() ? 'selected' : '';
                        opts += `<option value="${ev.name}" ${sel}>${ev.name}</option>`;
                    });
                    const isMatched = events.some(e => e.name.toLowerCase() === val.toLowerCase());
                    bg = isMatched ? '#dcfce7' : '#fee2e2';

                    tbodyHtml += `<td id="val_${f.id}_${idx}" style="padding:4px 6px; border:1px solid #e2e8f0; background:${bg};">
                        <select onchange="updateImportEvent(${idx}, this.value)" style="width:100%; border:none; background:transparent; font-family:inherit; font-size:13px; font-weight:500; color:#1e1b4b; cursor:pointer; outline:none;">
                            ${opts}
                        </select>
                    </td>`;
                    return;
                }

                if (f.id === 'trackType') {
                    // Interactive Track Type Dropdown (v2.20.47)
                    const isIndoor = val.toLowerCase().includes('indoor') || val.toLowerCase().includes('κλειστός');
                    const isOutdoor = val.toLowerCase().includes('outdoor') || val.toLowerCase().includes('ανοικτός') || (!isIndoor && val);
                    const normalized = isIndoor ? 'Indoor' : (isOutdoor ? 'Outdoor' : '');

                    bg = normalized ? '#dcfce7' : '#fee2e2';
                    tbodyHtml += `<td id="val_${f.id}_${idx}" style="padding:4px 6px; border:1px solid #e2e8f0; background:${bg};">
                        <select onchange="updateImportTrackType(${idx}, this.value)" style="width:100%; border:none; background:transparent; font-family:inherit; font-size:13px; font-weight:500; color:#1e1b4b; cursor:pointer; outline:none;">
                            <option value="">-- Select --</option>
                            <option value="Outdoor" ${normalized === 'Outdoor' ? 'selected' : ''}>Outdoor</option>
                            <option value="Indoor" ${normalized === 'Indoor' ? 'selected' : ''}>Indoor</option>
                        </select>
                    </td>`;
                    return;
                }

                if (f.id in fieldMatch && fieldMatch[f.id] !== null) {
                    if (fieldMatch[f.id]) {
                        bg = '#dcfce7';
                    } else {
                        bg = '#fee2e2'; // "Instinct color" (red) for unmatched
                        cursor = 'pointer';
                        if (f.id === 'gender') {
                            onclick = `genderAssociatePrompt(${idx}, '${val.replace(/'/g, "\\'")}')`;
                        }
                    }
                }
                tbodyHtml += `<td id="val_${f.id}_${idx}" style="padding:8px 12px; border:1px solid #e2e8f0; color:#334155; background:${bg}; cursor:${cursor};" onclick="${onclick}">${val}</td>`;
            });

            // Athlete dropdown
            let athOpts = `<option value="">-- Skip --</option>`;
            athletes.forEach(a => {
                const sel = (matchedAthlete && String(a.id) === String(matchedAthlete.id)) ? 'selected' : '';
                athOpts += `<option value="${a.id}" ${sel}>${a.lastName}, ${a.firstName}</option>`;
            });
            const showNew = !matchedAthlete && athVal;
            athOpts += `<option value="__new__" ${showNew ? 'selected' : ''}>+ Add New Athlete</option>`;

            // Pre-fill new athlete form: use dedicated columns first, then parse Athlete Name
            let parsedFn = mapping['firstName'] ? (row[mapping['firstName']] || '').toString().trim() : '';
            let parsedLn = mapping['lastName'] ? (row[mapping['lastName']] || '').toString().trim() : '';
            if (!parsedFn && !parsedLn && athVal) {
                if (athVal.includes(',')) {
                    const parts = athVal.split(',');
                    parsedLn = (parts[0] || '').trim();
                    parsedFn = (parts[1] || '').trim();
                } else {
                    const parts = athVal.split(' ');
                    parsedFn = parts[0] || '';
                    parsedLn = parts.slice(1).join(' ');
                }
            }
            const dobRaw = mapping['dob'] ? (row[mapping['dob']] || '').toString().trim() : '';
            let parsedDob = dobRaw;
            if (dobRaw && !isNaN(dobRaw) && !dobRaw.includes('-') && !dobRaw.includes('/')) {
                const d = new Date(Math.round((parseFloat(dobRaw) - 25569) * 86400 * 1000));
                if (!isNaN(d)) {
                    const dd = String(d.getUTCDate()).padStart(2, '0');
                    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const yyyy = d.getUTCFullYear();
                    parsedDob = `${dd}/${mm}/${yyyy}`;
                }
            } else if (dobRaw && dobRaw.includes('-') && !dobRaw.includes('/')) {
                const parts = dobRaw.split('-');
                if (parts.length === 3) parsedDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            tbodyHtml += `<td style="padding:6px 10px; border:1px solid #e2e8f0; background:#f5f3ff; min-width:230px;">
                <select id="ath_sel_${idx}" onchange="toggleNew(${idx}, this.value)" style="width:100%;padding:5px 8px;border-radius:6px;border:1px solid #c7d2fe;font-family:inherit;font-size:0.85rem;">
                    ${athOpts}
                </select>
                <div id="new_form_${idx}" style="display:${showNew ? 'block' : 'none'};margin-top:6px;background:#f0f9ff;padding:8px;border-radius:6px;border:1px solid #bae6fd;">
                    <input id="fn_${idx}"  placeholder="First Name"     value="${parsedFn}"  style="padding:4px 6px;margin:2px;width:88px; border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                    <input id="ln_${idx}"  placeholder="Last Name"      value="${parsedLn}"  style="padding:4px 6px;margin:2px;width:88px; border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                    <input id="dob_${idx}" placeholder="DOB DD/MM/YYYY" value="${parsedDob}" style="padding:4px 6px;margin:2px;width:115px;border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                    <select id="gen_${idx}" style="padding:4px 6px;margin:2px;border-radius:4px;border:1px solid #cbd5e1;font-family:inherit;font-size:0.82rem;">
                        <option value="Male" ${genVal.toLowerCase() === 'male' || genVal.toLowerCase() === 'ανδρων' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${genVal.toLowerCase() === 'female' || genVal.toLowerCase() === 'γυναικων' ? 'selected' : ''}>Female</option>
                    </select>
                </div>
            </td>`;

            // Comparison Column
            tbodyHtml += `<td id="comp_cell_${idx}" style="padding:8px 12px; border:1px solid #e2e8f0; text-align:center;">
                <button class="btn-text" onclick="compareImportRow(${idx})" style="color:var(--primary); font-size:0.8rem; font-weight:700;">Compare</button>
            </td>`;

            tbodyHtml += '</tr>';
        });

        content.innerHTML = `<table style="width:100%; border-collapse:collapse;">
            <thead>${theadHtml}</thead>
            <tbody>${tbodyHtml}</tbody>
        </table>`;

        modal.style.display = 'block';

        // Store data for comparison lookups
        window._currentImportData = jsonData;
        window._currentImportMapping = mapping;

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

    // --- Association Prompts ---
    // --- Association & Update Callbacks (v2.20.43) ---
    window.updateImportEvent = function (idx, newEv) {
        if (!newEv) return;
        window._currentImportData[idx][window._currentImportMapping['event']] = newEv;

        const cell = document.getElementById(`val_event_${idx}`);
        if (cell) {
            cell.style.background = '#dcfce7';
        }

        // Trigger re-comparison for this row
        compareImportRow(idx);
    };

    window.updateImportTrackType = function (idx, newTT) {
        if (!newTT) return;
        window._currentImportData[idx][window._currentImportMapping['trackType']] = newTT;

        const cell = document.getElementById(`val_trackType_${idx}`);
        if (cell) {
            cell.style.background = '#dcfce7';
        }

        // Trigger re-comparison for this row
        compareImportRow(idx);
    };

    window.eventAssociatePrompt = function (idx, rawVal) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '3000';
        modal.innerHTML = `
            <div class="modal-content card" style="max-width:400px; padding:2rem;">
                <h3 style="margin-bottom:0.5rem;">Associate Event</h3>
                <p class="subtitle" style="margin-bottom:1.5rem;">The value "${rawVal}" was not recognized. Select a matching event:</p>
                <div class="form-group">
                    <select id="associate_event_select" style="width:100%; padding:0.75rem; border-radius:12px; border:1px solid var(--border);">
                        <option value="">-- Select Event --</option>
                        ${events.map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cancel</button>
                    <button id="confirmAssociateBtn" class="btn-primary">Associate</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('confirmAssociateBtn').onclick = () => {
            const newEv = document.getElementById('associate_event_select').value;
            if (newEv) {
                // Update raw data and UI
                window._currentImportData[idx][window._currentImportMapping['event']] = newEv;
                const cell = document.getElementById(`val_event_${idx}`);
                if (cell) {
                    cell.textContent = newEv;
                    cell.style.background = '#dcfce7';
                    cell.onclick = null;
                    cell.style.cursor = 'default';
                }
                modal.remove();
            }
        };
    };

    window.genderAssociatePrompt = function (idx, rawVal) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.zIndex = '3000';
        modal.innerHTML = `
            <div class="modal-content card" style="max-width:400px; padding:2rem;">
                <h3 style="margin-bottom:0.5rem;">Associate Gender</h3>
                <p class="subtitle" style="margin-bottom:1.5rem;">The value "${rawVal}" was not recognized.</p>
                <div style="display:flex; gap:1rem;">
                    <button class="btn-primary" style="flex:1;" onclick="associateGen(${idx}, 'Male')">Male</button>
                    <button class="btn-primary" style="flex:1;" onclick="associateGen(${idx}, 'Female')">Female</button>
                </div>
                <button class="btn-secondary" style="width:100%; margin-top:1rem;" onclick="this.parentElement.remove()">Cancel</button>
            </div>
        `;
        window.associateGen = (i, val) => {
            window._currentImportData[i][window._currentImportMapping['gender']] = val;
            const cell = document.getElementById(`val_gender_${i}`);
            if (cell) {
                cell.textContent = val;
                cell.style.background = '#dcfce7';
                cell.onclick = null;
                cell.style.cursor = 'default';
            }
            const genSelect = document.getElementById(`gen_${i}`);
            if (genSelect) genSelect.value = val;
            modal.remove();
        };
        document.body.appendChild(modal);
    };

    window.compareImportRow = function (idx) {
        const row = window._currentImportData[idx];
        const mapping = window._currentImportMapping;
        const cell = document.getElementById(`comp_cell_${idx}`);
        if (!cell) return;

        // Retrieve values (check for <select> from v2.20.43 interactive mapping)
        const evCell = document.getElementById(`val_event_${idx}`);
        const ev = evCell?.querySelector('select')?.value || evCell?.textContent || (row[mapping['event']] || '').toString().trim();

        const genCell = document.getElementById(`val_gender_${idx}`);
        const gen = genCell?.querySelector('select')?.value || genCell?.textContent || (row[mapping['gender']] || '').toString().trim();

        const ag = (row[mapping['ageGroup']] || '').toString().trim();
        const ttCell = document.getElementById(`val_trackType_${idx}`);
        const tt = ttCell?.querySelector('select')?.value || ttCell?.textContent || (row[mapping['trackType']] || '').toString().trim();
        const mark = (row[mapping['mark']] || '').toString().trim();

        if (!ev || !mark) {
            cell.innerHTML = '<span style="color:var(--danger); font-size:0.75rem;">Missing Data</span>';
            return;
        }

        const best = findBestRecord(ev, gen, ag, tt);
        const tr = cell.closest('tr');

        if (!best) {
            cell.innerHTML = '<span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.75rem;">NEW RECORD (Empty Category)</span>';
            if (tr) tr.dataset.isNew = 'true';
            return;
        }

        const isBetter = isMarkBetter(mark, best.mark, ev);
        if (isBetter) {
            cell.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:2px; align-items:center;">
                    <span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.75rem;">NEW RECORD</span>
                    <span style="font-size:0.7rem; color:#64748b;">Prev: ${best.mark}</span>
                </div>
            `;
            if (tr) tr.dataset.isNew = 'true';
        } else {
            cell.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:2px; align-items:center;">
                    <span style="color:#64748b; font-size:0.75rem;">Not a record</span>
                    <span style="font-size:0.7rem; color:#94a3b8;">Best: ${best.mark}</span>
                </div>
            `;
            if (tr) tr.dataset.isNew = 'false';
        }
    };

    // Global helpers for the validation modal (called from inline onchange/onclick)
    window.compareAllImportRows = function () {
        const rows = document.querySelectorAll('#excelValidationContent tbody tr');
        rows.forEach((tr, idx) => {
            compareImportRow(idx);
        });
        filterValidationRows();
    };

    window.toggleAllImport = function (val) {
        document.querySelectorAll('.row-select').forEach(cb => {
            // Only toggle visible rows if we want to be fancy, 
            // but standard "Select All" usually targets all.
            const tr = cb.closest('tr');
            if (tr && tr.style.display !== 'none') {
                cb.checked = val;
            }
        });
    };

    window.toggleAllImport = function (val) {
        document.querySelectorAll('.row-select').forEach(cb => {
            const tr = cb.closest('tr');
            if (tr && tr.style.display !== 'none') {
                cb.checked = val;
            }
        });
    };

    window.filterValidationRows = function () {
        const chkU = document.getElementById('chkUnmatched');
        const chkN = document.getElementById('chkOnlyNew');
        const onlyUnmatched = chkU ? chkU.checked : false;
        const onlyNew = chkN ? chkN.checked : false;

        document.querySelectorAll('#excelValidationContent tbody tr').forEach(tr => {
            let show = true;
            if (onlyUnmatched && tr.dataset.hasRed !== 'true') show = false;
            if (onlyNew && tr.dataset.isNew !== 'true') show = false;
            tr.style.display = show ? '' : 'none';
        });

        // Sync Select All checkbox after filtering
        const chkAll = document.getElementById('chkSelectAll');
        if (chkAll) {
            const visible = Array.from(document.querySelectorAll('.row-select')).filter(cb => cb.closest('tr').style.display !== 'none');
            if (visible.length > 0) {
                chkAll.checked = visible.every(cb => cb.checked);
            }
        }
    };

    window.toggleNew = function (idx, val) {
        const el = document.getElementById('new_form_' + idx);
        if (el) el.style.display = val === '__new__' ? 'block' : 'none';
    };


    window.handleMappedImport = function (jsonData, mapping, athleteOverrides) {
        athleteOverrides = athleteOverrides || {};
        try {
            const selectedIndices = Array.from(document.querySelectorAll('.row-select:checked')).map(cb => parseInt(cb.dataset.idx));
            let importedCount = 0;

            // Iterate over ALL data but only process selected ones (v2.20.49 fix for index bug)
            jsonData.forEach((row, originalIdx) => {
                if (!selectedIndices.includes(originalIdx)) return;

                const eventVal = (row[mapping['event']] || '').toString().trim();
                const markVal = (row[mapping['mark']] || '').toString().trim();
                const rawGenVal = (row[mapping['gender']] || '').toString().trim();
                const genVal = normalizeGender(rawGenVal); // Robust normalization
                const agVal = mapping['ageGroup'] ? (row[mapping['ageGroup']] || '').toString().trim() : '';

                if (!eventVal || !markVal) return;

                // Normalize Track Type
                let ttVal = (row[mapping['trackType']] || '').toString().trim();
                if (ttVal.toLowerCase().includes('indoor') || ttVal.toLowerCase().includes('κλειστός')) ttVal = 'Indoor';
                else ttVal = 'Outdoor';

                // --- ROBUST AUTO-ARCHIVE MATCHING (v2.20.50) ---
                const cleanKey = (s) => (s || '').toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                const normSearchEv = cleanKey(eventVal);
                const normSearchGen = cleanKey(genVal);
                const normSearchAg = cleanKey(agVal);
                const normSearchTT = cleanKey(ttVal);

                const matches = records.filter(r => {
                    const rEv = cleanKey(r.event);
                    const rGen = cleanKey(normalizeGender(r.gender));
                    const rAg = cleanKey(r.ageGroup);
                    const rTT = cleanKey(r.trackType || 'Outdoor');

                    // Match even if approved property is missing (if it's in records array, it's live)
                    const isLive = r.approved !== false;

                    return rEv === normSearchEv &&
                        rGen === normSearchGen &&
                        rAg === normSearchAg &&
                        rTT === normSearchTT &&
                        isLive;
                });

                if (matches.length > 0) {
                    // v2.20.51: Archiving during import is now mandatory to ensure a clean live database
                    matches.forEach(oldRecord => {
                        const historyEntry = { ...oldRecord };
                        historyEntry.archivedAt = new Date().toISOString();
                        historyEntry.originalId = String(oldRecord.id);
                        historyEntry.updatedBy = 'Excel Import';
                        historyEntry.id = String(Date.now() + '-' + Math.floor(Math.random() * 1000000) + '-' + originalIdx);
                        recordHistory.unshift(historyEntry);

                        const idxInLive = records.findIndex(liveR => liveR.id === oldRecord.id);
                        if (idxInLive !== -1) records.splice(idxInLive, 1);
                    });
                }

                // Resolve athlete
                let finalAthleteName = '';
                const override = athleteOverrides[originalIdx]; // Use correct original index

                if (override && override.type === 'existing' && override.id) {
                    const existingAthlete = athletes.find(a => String(a.id) === String(override.id));
                    if (existingAthlete) {
                        finalAthleteName = `${existingAthlete.lastName}, ${existingAthlete.firstName}`;
                    }
                } else if (override && override.type === 'new' && (override.firstName || override.lastName)) {
                    const newAthlete = {
                        id: 'ath_' + Date.now() + '_' + originalIdx,
                        firstName: override.firstName,
                        lastName: override.lastName,
                        dob: override.dob || '',
                        gender: normalizeGender(override.gender || 'Male')
                    };
                    athletes.push(newAthlete);
                    finalAthleteName = `${newAthlete.lastName}, ${newAthlete.firstName}`;
                } else {
                    const rawName = (row[mapping['athlete']] || '').toString().trim();
                    if (rawName) {
                        const ath = findAthleteByName(rawName);
                        finalAthleteName = ath ? `${ath.lastName}, ${ath.firstName}` : rawName;
                    }
                }

                const dateRaw = row[mapping['date']];
                let finalDate = new Date().toISOString().split('T')[0];
                const toYYYYMMDD = (d) => {
                    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                    const dd = String(d.getUTCDate()).padStart(2, '0');
                    return `${d.getUTCFullYear()}-${mm}-${dd}`;
                };
                if (dateRaw && typeof dateRaw === 'number') {
                    finalDate = toYYYYMMDD(new Date(Math.round((dateRaw - 25569) * 86400 * 1000)));
                } else if (dateRaw) {
                    const s = dateRaw.toString().trim();
                    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
                        finalDate = s.split('T')[0];
                    } else if (/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.test(s)) {
                        const [, d2, mo, y] = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                        finalDate = `${y}-${mo.padStart(2, '0')}-${d2.padStart(2, '0')}`;
                    } else {
                        const parsed = new Date(s);
                        finalDate = isNaN(parsed) ? new Date().toISOString().split('T')[0] : toYYYYMMDD(parsed);
                    }
                }

                records.unshift({
                    id: String(Date.now() + '-' + Math.floor(Math.random() * 1000000) + '-' + originalIdx),
                    event: eventVal,
                    athlete: finalAthleteName,
                    gender: genVal,
                    ageGroup: agVal,
                    trackType: ttVal,
                    raceName: (row[mapping['raceName']] || '').toString().trim(),
                    town: (row[mapping['town']] || '').toString().trim(),
                    date: finalDate,
                    mark: markVal,
                    idr: (row[mapping['idr']] || '').toString().trim(),
                    wind: (row[mapping['wind']] || '').toString().trim(),
                    notes: (row[mapping['notes']] || '').toString().trim(),
                    approved: true,
                    updatedAt: new Date().toISOString()
                });

                importedCount++;
            });

            if (importedCount > 0) {
                saveRecords();
                saveAthletes();
                saveHistory();
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
                alert('No valid records were imported. Please check your mapping or selections.');
            }
        } catch (err) {
            console.error('Import processing error:', err);
            alert('Error during import processing: ' + err.message);
        }
    };

    function importDatabase() {
        const file = fileRestore.files[0];
        if (!file) return alert('Please select a JSON file first.');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dbData = JSON.parse(e.target.result);
                if (!Array.isArray(dbData.events) || !Array.isArray(dbData.records)) {
                    throw new Error('Invalid file format. Basic tables missing.');
                }

                const msg = `Found:
            - ${dbData.records.length} records
            - ${dbData.athletes ? dbData.athletes.length : 0} athletes
            - ${dbData.events.length} events
            - ${dbData.history ? dbData.history.length : 0} history entries
            - ${dbData.pendingrecs ? dbData.pendingrecs.length : 0} pending entries
            - ${dbData.users ? dbData.users.length : 0} users

Replace ALL current data with this backup? This action is irreversible.`;

                if (!confirm(msg)) return;

                // Core Tables (LocalStorage)
                localStorage.setItem('tf_records', JSON.stringify(dbData.records));
                localStorage.setItem('tf_events', JSON.stringify(dbData.events));
                localStorage.setItem('tf_athletes', JSON.stringify(dbData.athletes || []));
                localStorage.setItem('tf_countries', JSON.stringify(dbData.countries || []));
                localStorage.setItem('tf_history', JSON.stringify(dbData.history || []));
                localStorage.setItem('tf_users', JSON.stringify(dbData.users || []));
                localStorage.setItem('tf_pendingrecs', JSON.stringify(dbData.pendingrecs || []));
                localStorage.setItem('tf_tombstones', JSON.stringify(dbData.tombstones || []));

                // Scoring Tables
                if (dbData.wma_data) localStorage.setItem('tf_wma_data', JSON.stringify(dbData.wma_data));
                if (dbData.iaaf_updates) localStorage.setItem('tf_iaaf_updates', JSON.stringify(dbData.iaaf_updates));

                // Settings
                if (dbData.theme) localStorage.setItem('tf_theme', dbData.theme);
                if (dbData.seed_version) localStorage.setItem('tf_relays_seed_version', dbData.seed_version);
                if (dbData.seeded) localStorage.setItem('tf_relays_seeded', dbData.seeded);

                // --- Cloud Sync: Push to Firebase if Supervisor ---
                const isSup = isSupervisor(currentUser ? currentUser.email : null);
                if (isSup && db) {
                    console.log("Supervisor detected. Syncing restored data to Cloud...");
                    try {
                        await db.ref('records').set(dbData.records);
                        await db.ref('events').set(dbData.events);
                        await db.ref('athletes').set(dbData.athletes || []);
                        await db.ref('countries').set(dbData.countries || []);
                        await db.ref('history').set(dbData.history || []);
                        await db.ref('users').set(dbData.users || []);
                        await db.ref('pendingrecs').set(dbData.pendingrecs || []);
                        console.log("Cloud sync complete.");
                    } catch (syncErr) {
                        console.error("Cloud sync failed during restore:", syncErr);
                        alert("Restored locally, but Cloud sync failed: " + syncErr.message);
                    }
                }

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

        // Update header classes for sorting arrows
        const table = statsTableBody.closest('table');
        if (table) {
            table.querySelectorAll('thead th.sortable').forEach(th => {
                th.classList.remove('asc', 'desc');
                const onclickStr = th.getAttribute('onclick') || '';
                if (onclickStr.includes(`'${statsSortField}'`)) {
                    th.classList.add(statsSortOrder === 'asc' ? 'asc' : 'desc');
                }
            });
        }

        statsTableBody.innerHTML = '';

        // Prioritize loading from persistent stats
        let statsSource;
        try {
            const cached = JSON.parse(localStorage.getItem('tf_stats'));
            if (cached && cached.data) {
                statsSource = cached.data;
                console.log("📊 Rendering from Persistent Stats...");
            }
        } catch (e) { }

        const trackTypeFilterEl = document.getElementById('statsFilterTrackType');
        const trackTypeFilter = trackTypeFilterEl ? trackTypeFilterEl.value : 'all';

        // Filter values (Read once)
        const genderFilterEl = document.getElementById('statsFilterGender');
        const nameFilterEl = document.getElementById('statsFilterName');
        const catFilterEl = document.getElementById('statsFilterCategory');
        const genderFilter = genderFilterEl ? genderFilterEl.value : 'all';
        const nameFilter = nameFilterEl ? nameFilterEl.value : 'all';
        const catFilter = catFilterEl ? catFilterEl.value : 'all';

        let statsData = [];
        let aggForDropdowns = {}; // Local aggregation for dropdowns if fallback needed

        if (statsSource) {
            // Filter persistent stats
            statsData = statsSource.filter(item => {
                // Name Filter (Exact) - If Name is selected, it overrides Gender filter
                if (nameFilter !== 'all') {
                    if (item.name !== nameFilter) return false;
                } else {
                    // Gender Filter
                    if (genderFilter !== 'all') {
                        if (item.gender !== genderFilter) return false;
                    }
                }

                // Category Filter
                if (catFilter !== 'all' && nameFilter === 'all') {
                    if (!item.ageCategory) return false;
                    let itemCat = item.ageCategory.replace(/^[MW]/, '');
                    if (itemCat !== catFilter) return false;
                }

                return true;
            });

            // Populate Dropdowns from source data
            const nameSelect = document.getElementById('statsFilterName');
            if (nameSelect && nameSelect.options.length <= 1) {
                const allNames = [...new Set(statsSource.map(s => s.name))].sort();
                allNames.forEach(n => {
                    const op = document.createElement('option');
                    op.value = n;
                    op.textContent = n;
                    nameSelect.appendChild(op);
                });
            }

            const catSelect = document.getElementById('statsFilterCategory');
            if (catSelect && catSelect.options.length <= 1) {
                const categories = new Set();
                statsSource.forEach(item => {
                    if (item.ageCategory) {
                        categories.add(item.ageCategory.replace(/^[MW]/, ''));
                    }
                });
                Array.from(categories).sort((a, b) => parseInt(a) - parseInt(b)).forEach(c => {
                    const op = document.createElement('option');
                    op.value = c;
                    op.textContent = c;
                    catSelect.appendChild(op);
                });
            }
        } else {
            // Fallback to on-the-fly calculation (Original Logic)
            const agg = {};
            records.forEach(r => {
                const ev = events.find(e => e.name === r.event);
                const isRelay = ev ? (ev.isRelay || ev.name.includes('4x') || ev.name.includes('Σκυτάλη')) : (r.event && (r.event.includes('4x') || r.event.includes('Σκυτάλη')));
                if (isRelay) return;
                if (r.approved === false) return;
                if (trackTypeFilter !== 'all' && (r.trackType || 'Outdoor') !== trackTypeFilter) return;

                if (r.athlete) {
                    if (!agg[r.athlete]) agg[r.athlete] = { count: 0, minYear: null, maxYear: null };
                    agg[r.athlete].count++;
                    if (r.date) {
                        const y = new Date(r.date).getFullYear();
                        if (agg[r.athlete].minYear === null || y < agg[r.athlete].minYear) agg[r.athlete].minYear = y;
                        if (agg[r.athlete].maxYear === null || y > agg[r.athlete].maxYear) agg[r.athlete].maxYear = y;
                    }
                }
            });

            aggForDropdowns = agg;

            statsData = Object.keys(agg).reduce((acc, name) => {
                const athlete = athleteLookupMap[name];
                if (nameFilter !== 'all') {
                    if (name !== nameFilter) return acc;
                } else {
                    if (genderFilter !== 'all') {
                        if (!athlete || athlete.gender !== genderFilter) return acc;
                    }
                }

                const data = agg[name];
                let ratioVal = 0;
                if (data.minYear !== null && data.maxYear !== null && data.count > 0) {
                    const diff = data.maxYear - data.minYear;
                    if (diff > 0) ratioVal = (data.count / diff) * 100;
                }

                const item = {
                    name: name, count: data.count, ratio: ratioVal.toFixed(2) + '%',
                    age: null, ageCategory: null, gender: athlete ? athlete.gender : ''
                };

                if (athlete && athlete.dob) {
                    const age = getExactAge(athlete.dob, new Date());
                    item.age = age;
                    if (age !== null && age >= 35) {
                        const g = normalizeGenderLookups(item.gender);
                        let prefix = g === 'men' ? 'M' : (g === 'women' ? 'W' : 'X');
                        item.ageCategory = prefix + (Math.floor(age / 5) * 5).toString();
                    }
                }

                if (catFilter !== 'all' && nameFilter === 'all') {
                    if (!item.ageCategory) return acc;
                    let itemCat = item.ageCategory.replace(/^[MW]/, '');
                    if (itemCat !== catFilter) return acc;
                }

                acc.push(item);
                return acc;
            }, []);

            // Rankings for fallback
            const sortedByCount = [...statsData].sort((a, b) => b.count - a.count);
            sortedByCount.forEach((item, index) => {
                item.generalRank = (index + 1).toString();
                if (item.generalRank === "1") item.generalRank += ' 🥇';
                else if (item.generalRank === "2") item.generalRank += ' 🥈';
                else if (item.generalRank === "3") item.generalRank += ' 🥉';
            });
            const contentByAge = {};
            statsData.forEach(item => {
                const cat = item.ageCategory || 'Unknown';
                if (!contentByAge[cat]) contentByAge[cat] = [];
                contentByAge[cat].push(item);
            });
            Object.keys(contentByAge).forEach(cat => {
                const group = contentByAge[cat];
                group.sort((a, b) => b.count - a.count);
                group.forEach((item, index) => {
                    item.ageRank = index + 1;
                    if (item.ageRank === 1) item.ageMedal = '🥇';
                    else if (item.ageRank === 2) item.ageMedal = '🥈';
                    else if (item.ageRank === 3) item.ageMedal = '🥉';
                    else item.ageMedal = '';
                });
            });

            // Populate Dropdowns if fallback
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

            const catSelect = document.getElementById('statsFilterCategory');
            if (catSelect && catSelect.options.length <= 1) {
                const categories = new Set();
                Object.keys(agg).forEach(name => {
                    const athlete = athleteLookupMap[name];
                    if (athlete && athlete.dob) {
                        const age = getExactAge(athlete.dob, new Date());
                        if (age !== null && age >= 35) {
                            categories.add((Math.floor(age / 5) * 5).toString());
                        }
                    }
                });
                Array.from(categories).sort((a, b) => parseInt(a) - parseInt(b)).forEach(c => {
                    const op = document.createElement('option');
                    op.value = c;
                    op.textContent = c;
                    catSelect.appendChild(op);
                });
            }
        }

        // --- Filter by Medal (Post-Ranking) ---
        const medalFilter = document.getElementById('statsFilterMedal') ? document.getElementById('statsFilterMedal').value : 'all';
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
            statsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No records found for selected filters.</td></tr>';
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
                valA = parseInt(valA.toString());
                valB = parseInt(valB.toString());
            }
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return statsSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return statsSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Render
        statsData.forEach((item, index) => {
            const uniqueId = `stats-detail-${index}`;
            // Handle both null and undefined to prevent "Age: undefined"
            let ageDisplay = (item.age !== null && item.age !== undefined) ? `<span style="background-color: var(--success); color: white; padding: 3px 10px; border-radius: 12px; font-size: 0.9em; font-weight: 600; margin-left: 10px; margin-right: 15px;">Age: ${item.age}</span>` : '';

            const athleteRecords = records.filter(r => r.athlete === item.name);
            const years = {};
            athleteRecords.forEach(r => {
                if (r.date) {
                    const y = new Date(r.date).getFullYear();
                    years[y] = (years[y] || 0) + 1;
                }
            });
            const sortedYears = Object.keys(years).sort((a, b) => b - a);

            let yearBadgesHtml = '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-left:5px;">';
            sortedYears.forEach(year => {
                yearBadgesHtml += `<div style="position: relative; background-color: var(--primary); border: none; border-radius: 6px; padding: 4px 10px; font-size: 0.9em; color: white; margin-top: 6px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${year}<div style="position: absolute; top: -10px; right: -10px; background-color: var(--danger); color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 0.75em; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); border: 2px solid var(--bg-card);">${years[year]}</div></div>`;
            });
            yearBadgesHtml += '</div>';

            let ageRankDisplay = item.ageCategory ? `<div style="display:flex; align-items:center; justify-content:flex-end;"><span style="font-weight:bold; margin-right:5px;">${item.ageRank}</span><span style="font-size:2.5em; margin-right:5px;">${item.ageMedal}</span><span style="font-size:0.8em; opacity:0.6;">(${item.ageCategory})</span></div>` : '-';

            let genRankDisplay = item.generalRank;
            if (typeof genRankDisplay === 'string') {
                genRankDisplay = genRankDisplay.replace('🥇', '<span style="font-size:2.5em;">🥇</span>').replace('🥈', '<span style="font-size:2.5em;">🥈</span>').replace('🥉', '<span style="font-size:2.5em;">🥉</span>');
            }

            const athleteRecordsFiltered = athleteRecords.filter(r => trackTypeFilter === 'all' || (r.trackType || 'Outdoor') === trackTypeFilter);
            athleteRecordsFiltered.sort((a, b) => new Date(b.date) - new Date(a.date));

            let detailsHtml = `<div id="${uniqueId}" class="hidden" style="margin-top:12px; border-top:1px solid rgba(6,182,212,0.3); padding-top:8px; background:var(--bg-card); border-radius:8px; padding:10px;"><table style="width:100%; font-size: 0.9em; border-collapse: collapse; background:var(--bg-card);"><thead><tr><th style="padding:6px 4px; text-align:left;">Event</th><th style="padding:6px 4px; text-align:left;">Track Type</th><th style="padding:6px 4px; text-align:left;">Age</th><th style="padding:6px 4px; text-align:left;">Mark</th><th style="padding:6px 4px; text-align:left;">Date</th><th style="padding:6px 4px; text-align:left;">Race</th><th style="padding:6px 4px; text-align:left;">Place</th></tr></thead><tbody>`;
            athleteRecordsFiltered.forEach(r => {
                const ttLabel = (r.trackType || 'Outdoor') === 'Outdoor' ? '🏟️ Outdoor' : '🏠 Indoor';
                const dateDisplay = r.date ? new Date(r.date).toLocaleDateString('en-GB') : '-';
                detailsHtml += `<tr style="cursor:pointer;" ondblclick="openRecordModal('${r.id}', false, true)" title="Double-click to view details"><td style="padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.08);">${r.event}</td><td style="padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.08); font-size:0.85em; color:var(--text-muted);">${ttLabel}</td><td style="padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.08);">${r.ageGroup || '-'}</td><td style="padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.08); text-align:center;"><b>${formatTimeMark(r.mark, r.event)}</b></td><td style="padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.08);">${dateDisplay}</td><td style="padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.08);">${r.raceName || '-'}</td><td style="padding:5px 4px; border-bottom:1px solid rgba(255,255,255,0.08);">${r.town || r.location || '-'}</td></tr>`;
            });
            detailsHtml += `</tbody></table></div>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Gen Rank" style="text-align:center; font-weight:bold; color:var(--text-muted); vertical-align:top; padding-top:12px;">${genRankDisplay}</td>
                <td data-label="Athlete" style="font-weight:600; cursor:pointer; color:var(--text-main);" onclick="toggleStatsDetail('${uniqueId}')"><div style="display:flex; align-items:center;"><span>${item.name} <span style="font-size:0.8em; opacity:0.7; margin-left:4px;">▼</span></span>${ageDisplay}</div>${yearBadgesHtml}${detailsHtml}</td>
                <td data-label="Ratio %" style="text-align:right; vertical-align:top; padding-top:12px;">${item.ratio}</td>
                <td data-label="Age Rank" style="text-align:right; vertical-align:top; padding-top:12px;">${ageRankDisplay}</td>
                <td data-label="Count" style="text-align:right; padding-right:15px; vertical-align:top; padding-top:12px;">${item.count}</td>
            `;
            statsTableBody.appendChild(tr);
        });
    }

    window.toggleStatsDetail = function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('hidden');
        const isOpen = !el.classList.contains('hidden');

        // Scope the row highlight to only: athlete name cell (td[1]) + record count cell (td[4])
        // Remove the row selection colour from gen rank, ratio, age rank cells
        const parentTr = el.closest('tr');
        if (parentTr) {
            const tds = parentTr.querySelectorAll('td');
            const cardBg = 'var(--bg-card)';
            // td[0]=GenRank, td[2]=Ratio%, td[3]=AgeRank, td[4]=Count get card bg when open — only td[1] (name+badges) keeps selection colour
            [0, 2, 3, 4].forEach(i => {
                if (tds[i]) tds[i].style.background = isOpen ? cardBg : '';
            });
        }
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

    function setTheme(themeName, skipSync = false) {
        // v2.20.70: BUG FIX - preserves is-admin / is-supervisor classes
        // 1. Find all theme-related classes
        const classes = Array.from(document.body.classList);
        const themeClasses = classes.filter(c => c.startsWith('theme-'));

        // 2. Remove old themes
        themeClasses.forEach(c => document.body.classList.remove(c));

        // 3. Add new theme
        document.body.classList.add(themeName);

        // Save to localStorage
        localStorage.setItem('tf_theme', themeName);

        // Update selector value if it differs
        if (themeSelect && themeSelect.value !== themeName) {
            themeSelect.value = themeName;
        }

        if (!skipSync) syncSettingsToCloud();
    }


    function initThemes() {
        let savedTheme = localStorage.getItem('tf_theme') || 'theme-default';

        // v2.20.56: Migration from old theme name
        if (savedTheme === 'theme-emacsi-2026') {
            savedTheme = 'theme-championship-slate';
        }

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
                    const isHistoryEnabled = localStorage.getItem('tf_edit_history_flag') !== 'false';

                    if (isHistoryEnabled) {
                        const historyRecord = { ...originalRecord };
                        historyRecord.archivedAt = new Date().toISOString();
                        historyRecord.originalId = String(originalRecord.id);
                        historyRecord.id = String(Date.now() + '-' + Math.floor(Math.random() * 10000));
                        if (!historyRecord.updatedBy) historyRecord.updatedBy = 'Initial Import';

                        recordHistory.unshift(historyRecord);
                        saveHistory();
                    }

                    // Tombstone old ID so it doesn't reappear
                    recentlyRejected.add(replIdStr);
                    saveTombstones();

                    // Clean the pending record
                    delete pendingRecord.replacesId;
                    delete pendingRecord.isPending;
                    pendingRecord.approved = true;
                    pendingRecord.approvedBy = getCurrentUsername();

                    // Swap in the live records array
                    records[originalIndex] = pendingRecord;
                } else {
                    // Failsafe: original record missing, treat as new
                    delete pendingRecord.replacesId;
                    delete pendingRecord.isPending;
                    pendingRecord.approved = true;
                    pendingRecord.approvedBy = getCurrentUsername();
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

});
