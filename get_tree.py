import os

exclude={'node_modules', '__pycache__', '.git', 'venv', '.venv', 'dist', 'build'}

def get_tree(dir_path, prefix=''):
    contents = sorted([d for d in os.listdir(dir_path) if d not in exclude])
    pointers = ['├── '] * (len(contents) - 1) + ['└── ']
    res = []
    
    for pointer, path in zip(pointers, contents):
        full_path = os.path.join(dir_path, path)
        res.append(prefix + pointer + path)
        if os.path.isdir(full_path):
            extension = '│   ' if pointer == '├── ' else '    '
            res.extend(get_tree(full_path, prefix + extension))
    return res

tree_lines = get_tree('.')
with open('tree.txt', 'w', encoding='utf-8') as f:
    f.write('finance-assistant/\n')
    f.write('\n'.join(tree_lines))
