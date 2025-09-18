import json

def check(obj, path=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            current_path = f'{path}.{k}' if path else k
            if isinstance(v, dict):
                # Check for empty objects
                if len(v) == 0:
                    print(f'Found empty object at {current_path}')
                    return False
                if not check(v, current_path):
                    return False
            elif not isinstance(v, str):
                print(f'Found {type(v).__name__} at {current_path}: {v}')
                return False
    return True

with open('lang/en.json', 'r') as f:
    data = json.load(f)
    
print('Checking for non-string/non-object values or empty objects...')
if check(data):
    print('All values are valid (strings or non-empty objects)')
else:
    print('Found problematic values!')
