#!/usr/bin/env python3
import re

# Read the file
with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the old code to replace (using regex to be flexible with whitespace)
old_pattern = r"const confirmMsg = `Age Category Mismatch!\\n\\nAthlete Age: \$\{exactAge\}\\nCalculated Category: \$\{calculatedGroup \|\| 'Under 35'\}\\nSelected Category: \$\{selectedAgeGroup \|\| 'None'\}\\n\\nDo you want to save anyway\?`;\s+if \(!confirm\(confirmMsg\)\) \{\s+return; // User cancelled\s+\}"

# New code to insert
new_code = """// Check if bypass flag is set (from "Save Anyway" button)
                        if (!bypassAgeValidation) {
                            // Show Inline Warning
                            const warningDiv = document.getElementById('ageValidationWarning');
                            const messageP = document.getElementById('ageValidationMessage');
                            
                            if (warningDiv && messageP) {
                                messageP.innerHTML = `
                                    <strong>Athlete Age:</strong> ${exactAge}<br>
                                    <strong>Calculated Category:</strong> ${calculatedGroup || 'Under 35'}<br>
                                    <strong>Selected Category:</strong> ${selectedAgeGroup || 'None'}<br>
                                    <br>
                                    The selected category does not match the athlete's age.
                                `;
                                warningDiv.classList.remove('hidden');
                                // Scroll to warning
                                warningDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                return; // Stop submission
                            }
                        } else {
                            // Reset bypass flag after using it
                            bypassAgeValidation = false;
                        }"""

# Replace
content_new = re.sub(old_pattern, new_code, content, flags=re.MULTILINE | re.DOTALL)

# Write back
with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content_new)

print("Replacement complete!")
