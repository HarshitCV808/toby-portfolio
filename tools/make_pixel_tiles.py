"""Chaos mode's pixel-art wallpapers: pixel stars at night, pixel clouds by day.

Usage: python3 tools/make_pixel_tiles.py
Each sprite is drawn as text below ('.' is see-through, each letter is a colour).
The script turns them into small SVG tiles made of square pixels, scaled up with
crisp edges, and prints them as CSS url(...) values. Paste them into styles.css:
NIGHT goes in the chaos-mode body rule (and the chaos 3D stage), DAY in the
chaos-mode lights-on body rule.
"""

def sprite_runs(rows, ox, oy):
    """Yield (char, x, y, length) for each horizontal run of one colour."""
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch == '.':
                x += 1
                continue
            start = x
            while x < len(row) and row[x] == ch:
                x += 1
            yield ch, ox + start, oy + y, x - start

def tile(width, height, scale, placements, colours):
    paths = {}
    for rows, ox, oy in placements:
        for ch, x, y, n in sprite_runs(rows, ox, oy):
            paths.setdefault(ch, []).append(f'M{x} {y}h{n}v1h-{n}z')
    body = ''.join(f"<path fill='{colours[ch]}' d='{''.join(d)}'/>" for ch, d in paths.items())
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='{width * scale}' height='{height * scale}' "
           f"viewBox='0 0 {width} {height}' shape-rendering='crispEdges'>{body}</svg>")
    return 'url("data:image/svg+xml,' + svg.replace('<', '%3C').replace('>', '%3E').replace('#', '%23') + '")'

SPARKLE = ['..Y..', '..Y..', 'YYCYY', '..Y..', '..Y..']
PLUS = ['.P.', 'PPP', '.P.']
DOT_W, DOT_B, DOT_Y, DOT_L = ['W'], ['B'], ['Y'], ['L']

night = tile(20, 20, 3, [
    (SPARKLE, 2, 2), (PLUS, 13, 11), (DOT_W, 15, 3), (DOT_B, 8, 16), (DOT_W, 2, 15), (DOT_Y, 17, 18), (DOT_L, 10, 7),
], {'Y': '#ffe600', 'C': '#fff7b0', 'P': '#ff9ec4', 'W': '#ffffff', 'B': '#66ffff', 'L': '#b9a3e3'})

BIG_CLOUD = [
    '........WWWW..........',
    '.....WWWWWWWWW........',
    '....WWWWWWWWWWW.WWW...',
    '..WWWWWWWWWWWWWWWWWWW.',
    '.WWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWWWW',
    'SSSSSSSSSSSSSSSSSSSSSS',
    '.SSSSSSSSSSSSSSSSSSSS.',
]
SMALL_CLOUD = [
    '.....WWWW.......',
    '...WWWWWWWW.WW..',
    '.WWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'SSSSSSSSSSSSSSSS',
    '.SSSSSSSSSSSSSS.',
]
SUN_STAR = ['..Y..', '.YYY.', 'YYCYY', '.YYY.', '..Y..']
day = tile(64, 40, 4, [
    (BIG_CLOUD, 3, 5), (SMALL_CLOUD, 38, 25), (SUN_STAR, 52, 6),
], {'W': '#ffffff', 'S': '#cfe6ff', 'Y': '#ffe600', 'C': '#fff7b0'})

print('NIGHT:', night)
print()
print('DAY:', day)
