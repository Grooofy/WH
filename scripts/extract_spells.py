"""Rebuild catalog: python scripts/extract_spells.py path/to/book.pdf"""
import json, re, sys
from pathlib import Path
from collections import Counter
import pdfplumber
ROOT = Path(__file__).resolve().parents[1]
header = re.compile(r'^(.+?)\s+([А-ЯЁ]+),\s*(БОЕВОЕ|БЫТОВОЕ),\s*([0-5])\s*$')
spells = []
current = None
collect = False
with pdfplumber.open(sys.argv[1]) as pdf:
    for number in range(106,132):
        page = pdf.pages[number]
        for bounds in [(35,50,296,797),(300,50,563,797)]:
            for line in page.crop(bounds).extract_text_lines(layout=False):
                text = line['text'].strip()
                match = header.match(text)
                if match:
                    name, tradition, kind, rank = match.groups()
                    current = dict(id=f'spell-{len(spells)+1:03}',name=name.capitalize(),tradition=tradition.capitalize(),kind=kind.capitalize(),rank=int(rank),page=number,paragraphs=[])
                    spells.append(current)
                    collect = True
                    continue
                if any(c['size'] > 15 for c in line['chars']):
                    collect = False
                if current and collect:
                    current['paragraphs'].append(text)
for spell in spells:
    spell['description'] = '\n'.join(spell.pop('paragraphs'))
    if not spell['description']: raise ValueError(spell)
(ROOT/'data'/'spells.js').write_text('window.SPELLS = '+json.dumps(spells,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(len(spells),Counter(s['tradition'] for s in spells))

# The source table uses vertically centered row labels; normalize its reading order.
wild = next(s for s in spells if s['name'] == 'Дикая магия')
wild['description'] = wild['description'].split('\nДикая магия\n')[0]
wild['table'] = [
 ['1', '1d6 малых демонов появляются в свободном пространстве внутри области. Они недружелюбны.'],
 ['2–3', 'Каждое существо в области получает 1 Безумия.'],
 ['4–5', 'Каждое существо в области совершает атаки и проверки с 1 помехой на 1 раунд.'],
 ['6–8', 'Каждое существо в области получает 3d6 + 5 урона или половину урона при успешной проверке Силы.'],
 ['9–13', 'Ты восстанавливаешь применение этого заклинания.'],
 ['14–15', 'Каждое существо в области исцеляет 3d6+5 урона.'],
 ['16–17', 'Каждое существо в области совершает атаки и проверки с 1 преимуществом на 1 раунд.'],
 ['18–19', 'Каждое существо в области может совершить один дополнительный ход до конца следующего раунда.'],
 ['20', 'Ты восстанавливаешь применение одного заклинания ранга 3 и ниже.']
]
(ROOT/'data'/'spells.js').write_text('window.SPELLS = '+json.dumps(spells,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
