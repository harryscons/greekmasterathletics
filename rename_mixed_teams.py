#!/usr/bin/env python3
"""
Script to rename "Ομάδα, Μικτή" to "Μικτή Ομάδα" in all relay records
"""

import json

# Load the relay records
with open('imported_relays.json', 'r', encoding='utf-8') as f:
    relays = json.load(f)

# Count and rename
renamed_count = 0
for record in relays:
    if record.get('athlete') == 'Ομάδα, Μικτή':
        record['athlete'] = 'Μικτή Ομάδα'
        renamed_count += 1

print(f'Renamed {renamed_count} relay records')

# Save back to file
with open('imported_relays.json', 'w', encoding='utf-8') as f:
    json.dump(relays, f, ensure_ascii=False, indent=2)

print('Updated imported_relays.json')

# Now regenerate seed_data.js
print('\nRegenerating seed_data.js...')
with open('seed_data.js', 'w', encoding='utf-8') as f:
    f.write('// Auto-generated relay seed data\n')
    f.write('// This file is generated from imported_relays.json\n\n')
    f.write('const SEED_RELAYS = ')
    json.dump(relays, f, ensure_ascii=False, indent=2)
    f.write(';\n')

print('Updated seed_data.js')
print(f'\nTotal records processed: {len(relays)}')
print(f'Records renamed: {renamed_count}')
