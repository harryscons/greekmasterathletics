    function parseMarkByRule(markStr, eventName) {
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
            const parts = s.split(/[:.]/);

            // Check for IF-based conditional formatting first
            // 1. Check for IF-based conditional formatting first
            if (rule.RULE2 && rule.RULE2.toLowerCase().includes("if start with")) {
                const ruleParts = rule.RULE2.toLowerCase().split(' ');
                // Extract numbers followed by dots (e.g., "1.", "2.", "3.")
                const triggerParts = ruleParts.filter(p => !isNaN(parseInt(p)));
                const firstPart = parts[0];

                let matched = false;
                for (let tp of triggerParts) {
                    const numOnly = tp.replace(/\./g, '');
                    if (firstPart === numOnly) {
                        matched = true;
                        break;
                    }
                }

                if (matched) {
                    const isSubHours = rule.RULE2.toLowerCase().includes("hours");
                    const isSubMinutes = rule.RULE2.toLowerCase().includes("minutes");

                    if (isSubHours && parts.length >= 3) {
                        let h = parseFloat(parts[0]) || 0;
                        let m = parseFloat(parts[1]) || 0;
                        let sec = parseFloat(parts[2]) || 0;
                        let ms = parts.length >= 4 ? (parseFloat(parts[3]) || 0) : 0;
                        return (h * 3600) + (m * 60) + sec + (ms / 100);
                    } else if (isSubMinutes && parts.length >= 2) {
                        let m = parseFloat(parts[0]) || 0;
                        let sec = parseFloat(parts[1]) || 0;
                        let ms = parts.length >= 3 ? (parseFloat(parts[2]) || 0) : 0;
                        return (m * 60) + sec + (ms / 100);
                    }
                }
            }

            const parts = s.split(/[:.]/);
            const lowerF = finalFormat.toLowerCase();

            if (lowerF.includes('hours')) {
                let h = 0, m = 0, sec = 0, ms = 0;
                if (parts.length >= 4) {
                    h = parseFloat(parts[0]); m = parseFloat(parts[1]); sec = parseFloat(parts[2]); ms = parseFloat(parts[3]);
                } else if (parts.length === 3) {
                    h = parseFloat(parts[0]); m = parseFloat(parts[1]); sec = parseFloat(parts[2]);
                } else if (parts.length === 2) {
                    h = parseFloat(parts[0]); m = parseFloat(parts[1]);
                } else {
                    h = parseFloat(parts[0]);
                }
                return (h * 3600) + (m * 60) + sec + (ms / 100);
            } else if (lowerF.includes('minutes')) {
                let m = 0, sec = 0, ms = 0;
                if (parts.length >= 3) {
                    m = parseFloat(parts[0]); sec = parseFloat(parts[1]); ms = parseFloat(parts[2]);
                } else if (parts.length === 2) {
                    m = parseFloat(parts[0]); sec = parseFloat(parts[1]);
                } else {
                    m = parseFloat(parts[0]);
                }
                return (m * 60) + sec + (ms / 100);
            } else if (lowerF.includes('seconds')) {
                let sec = 0, ms = 0;
                if (parts.length >= 2) {
                    sec = parseFloat(parts[0]); ms = parseFloat(parts[1]);
                } else {
                    sec = parseFloat(parts[0]);
                }
                return sec + (ms / 100);
            }
            return parseFloat(s) || 0;
        }

        // Default for Meters/Points
        return parseFloat(s) || 0;
    }

