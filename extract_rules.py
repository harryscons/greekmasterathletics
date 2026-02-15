import openpyxl
import json
import os

def extract_rules(file_path):
    if not os.path.exists(file_path):
        return {"error": f"File {file_path} not found"}
    
    wb = openpyxl.load_workbook(file_path)
    sheet = wb.active
    
    headers = [cell.value for cell in sheet[1]]
    data = []
    
    for row in sheet.iter_rows(min_row=2, values_only=True):
        row_dict = dict(zip(headers, row))
        data.append(row_dict)
    
    return data

if __name__ == "__main__":
    rules = extract_rules('Events Rules.xlsx')
    
    # Save as JSON
    with open('data/event_rules.json', 'w') as f:
        json.dump(rules, f, indent=2)
    print("Extracted rules to data/event_rules.json")
    
    # Save as JS
    with open('data/event_rules.js', 'w') as f:
        f.write("window.EVENT_RULES = ")
        json.dump(rules, f, indent=2)
        f.write(";")
    print("Extracted rules to data/event_rules.js")
