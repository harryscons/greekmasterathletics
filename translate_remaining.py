#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Greek Translation Script for Track & Field Records Application
Translates remaining UI elements in index.html and script.js
"""

import re

# Translation mappings
TRANSLATIONS = {
    # History section
    "Record History": "Ιστορικό Ρεκόρ",
    "Archived Records": "Αρχειοθετημένα Ρεκόρ",
    "Archived": "Αρχειοθετημένο",
    
    # Statistics sections
    "Athlete Statistics": "Στατιστικά Αθλητών",
    "Medal Statistics": "Στατιστικά Μεταλλίων",
    "WMA Report": "Αναφορά WMA",
    
    # Settings sub-tabs
    "Athletes Management": "Διαχείριση Αθλητών",
    "Events Management": "Διαχείριση Αγωνισμάτων",
    "Countries Management": "Διαχείριση Χωρών",
    "Data Management": "Διαχείριση Δεδομένων",
    "WMA Conversion Tables": "Πίνακες Μετατροπής WMA",
    "IAAF Scoring Tables": "Πίνακες Βαθμολογίας IAAF",
    
    # Table headers (additional)
    "First Name": "Όνομα",
    "Last Name": "Επώνυμο",
    "DOB": "Ημ/νία Γέννησης",
    "Records": "Ρεκόρ",
    "Type": "Τύπος",
    "Description": "Περιγραφή",
    "Code": "Κωδικός",
    "Greek Name": "Ελληνική Ονομασία",
    "English Name": "Αγγλική Ονομασία",
    "Category": "Κατηγορία",
    "Points": "Πόντοι",
    "Factor": "Συντελεστής",
    "Score": "Βαθμολογία",
    "Ratio": "Συχνότητα",
    "Gen Rank": "Γεν. Κατάταξη",
    "Age Rank": "Κατάταξη Ηλικίας",
    
    # Buttons (additional)
    "Add Athlete": "Προσθήκη Αθλητή",
    "Add Event": "Προσθήκη Αγωνίσματος",
    "Add Country": "Προσθήκη Χώρας",
    "Import Records": "Εισαγωγή Ρεκόρ",
    "Clear All Data": "Διαγραφή Όλων των Δεδομένων",
    "Export to PDF": "Εξαγωγή σε PDF",
    "Export to Excel": "Εξαγωγή σε Excel",
    "Save": "Αποθήκευση",
    "Delete": "Διαγραφή",
    "Edit": "Επεξεργασία",
    "Revert": "Επαναφορά",
    
    # Messages
    "Logged!": "Καταγράφηκε!",
    "Updated!": "Ενημερώθηκε!",
    "History Updated!": "Το Ιστορικό Ενημερώθηκε!",
    "Updated & Archived!": "Ενημερώθηκε & Αρχειοθετήθηκε!",
    "Edit Record": "Επεξεργασία Ρεκόρ",
    "Update Record": "Ενημέρωση Ρεκόρ",
    
    # Age validation messages (for JavaScript)
    "Athlete Age:": "Ηλικία Αθλητή:",
    "Calculated Category:": "Υπολογιζόμενη Κατηγορία:",
    "Selected Category:": "Επιλεγμένη Κατηγορία:",
    "The selected category does not match the athlete's age": "Η επιλεγμένη κατηγορία δεν ταιριάζει με την ηλικία του αθλητή",
    
    # Table actions/placeholders
    "Select Event": "Επιλέξτε Αγώνισμα",
    "No data available": "Δεν υπάρχουν διαθέσιμα δεδομένα",
    "Loading...": "Φόρτωση...",
}

def translate_html(filename):
    """Translate remaining elements in index.html"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Apply translations
    for english, greek in TRANSLATIONS.items():
        # Match whole words/phrases in HTML tags
        content = re.sub(
            rf'(>|\s)({re.escape(english)})(<|</)',
            lambda m: m.group(1) + greek + m.group(3),
            content
        )
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Translated {filename}")

def translate_js_messages(filename):
    """Translate JavaScript string messages in script.js"""
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Translate specific messages in JavaScript strings
    js_translations = {
        r"'Logged! ✓'": "'Καταγράφηκε! ✓'",
        r'"Logged! ✓"': '"Καταγράφηκε! ✓"',
        r"'Updated & Archived! ✓'": "'Ενημερώθηκε & Αρχειοθετήθηκε! ✓'",
        r'"Updated & Archived! ✓"': '"Ενημερώθηκε & Αρχειοθετήθηκε! ✓"',
        r"'History Updated! ✓'": "'Το Ιστορικό Ενημερώθηκε! ✓'",
        r'"History Updated! ✓"': '"Το Ιστορικό Ενημερώθηκε! ✓"',
        r"'Log Record'": "'Καταγραφή Ρεκόρ'",
        r'"Log Record"': '"Καταγραφή Ρεκόρ"',
        r"'Edit Record'": "'Επεξεργασία Ρεκόρ'",
        r'"Edit Record"': '"Επεξεργασία Ρεκόρ"',
        r'<strong>Athlete Age:</strong>': '<strong>Ηλικία Αθλητή:</strong>',
        r'<strong>Calculated Category:</strong>': '<strong>Υπολογιζόμενη Κατηγορία:</strong>',
        r'<strong>Selected Category:</strong>': '<strong>Επιλεγμένη Κατηγορία:</strong>',
        r'The selected category does not match the athlete\'s age': 'Η επιλεγμένη κατηγορία δεν ταιριάζει με την ηλικία του αθλητή',
    }
    
    for english_pattern, greek_replacement in js_translations.items():
        content = re.sub(english_pattern, greek_replacement, content)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Translated {filename}")

if __name__ == "__main__":
    translate_html('index.html')
    translate_js_messages('script.js')
    print("\n✅ Greek translation completed!")
