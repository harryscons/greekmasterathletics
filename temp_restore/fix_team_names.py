#!/usr/bin/env python3
"""
Fix team names in seed data files
"""

import json

print('=== Fixing team names in seed data ===\n')

# 1. Fix imported_relays.json
print('1. Checking imported_relays.json...')
with open('imported_relays.json', 'r', encoding='utf-8') as f:
    relays = json.load(f)

renamed_count = 0
for record in relays:
    if record.get('athlete') == 'Ομάδα, Μικτή':
        record['athlete'] = 'Μικτή Ομάδα'
        renamed_count += 1

if renamed_count > 0:
    with open('imported_relays.json', 'w', encoding='utf-8') as f:
        json.dump(relays, f, ensure_ascii=False, indent=2)
    print(f'   ✓ Renamed {renamed_count} records in imported_relays.json')
else:
    print(f'   ✓ No changes needed in imported_relays.json')

# 2. Regenerate seed_data.js
print('\n2. Regenerating seed_data.js...')
with open('seed_data.js', 'w', encoding='utf-8') as f:
    f.write('// Auto-generated relay seed data\n')
    f.write('// This file is generated from imported_relays.json\n')
    f.write('// Last updated: 2026-02-13\n\n')
    f.write('const SEED_RELAYS = ')
    json.dump(relays, f, ensure_ascii=False, indent=2)
    f.write(';\n')

print('   ✓ Regenerated seed_data.js')

# 3. Count final state
final_old = sum(1 for r in relays if r.get('athlete') == 'Ομάδα, Μικτή')
final_new = sum(1 for r in relays if r.get('athlete') == 'Μικτή Ομάδα')

print(f'\n=== Final State ===')
print(f'Total relay records: {len(relays)}')
print(f'Records with "Ομάδα, Μικτή": {final_old}')
print(f'Records with "Μικτή Ομάδα": {final_new}')
print(f'\n✓ Done! Now clear localStorage seed version and refresh the page.')
