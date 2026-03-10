import re

html_file = 'index.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

# For Dolares (oficial, tarjeta, blue, mep, cripto) + euro, real
targets = ['oficial', 'tarjeta', 'blue', 'mep', 'cripto', 'euro', 'real', 'spy']

for target in targets:
    # Find block starting with id="venta-target" or id="precio-target" because spy has precio-spy
    pattern = rf'(id="(?:venta|precio)-{target}".*?)(<div\s+class="flex items-center gap-1[^>]*>)'
    
    def repl(m):
        return m.group(1) + m.group(2).replace('class="', f'id="badge-{target}" class="')
        
    html = re.sub(pattern, repl, html, flags=re.DOTALL)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)
print('Done!')
