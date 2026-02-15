import openpyxl
import json

def inspect():
    wb = openpyxl.load_workbook('/Users/harryscons/Documents/celestial-plasma/Relays.xlsx', data_only=True)
    sheet = wb.active
    rows = []
    cols = [cell.value for cell in sheet[1]]
    for row in sheet.iter_rows(min_row=2, max_row=6, values_only=True):
        if any(row):
            rows.append(dict(zip(cols, row)))
    print(json.dumps(rows, indent=2, default=str))

if __name__ == '__main__':
    inspect()
