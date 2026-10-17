"""Generate the storybook narration with Piper (Cori voice).

Usage: python make_story_audio.py <index.html> <piper binary> <voice.onnx> <output dir>
Reads the pages of <ol id="book-pages"> so the audio always matches the text.

Setup: pip install piper-tts, then download en_GB-cori-high.onnx (+ .onnx.json) from
https://huggingface.co/rhasspy/piper-voices. On macOS the piper-tts 1.8 wheel can look for
its espeak-ng data in the wrong place; if so, copy the package's espeak-ng-data folder
somewhere, add a symlink inside it named espeak-ng-data pointing to ".", and set
ESPEAK_DATA_PATH to that folder before running this script.
"""
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

index_html, piper, voice, out_dir = sys.argv[1:5]


class Pages(HTMLParser):
    """Collects the spoken text of each <li class="page"> in #book-pages."""

    def __init__(self):
        super().__init__()
        self.in_book = False
        self.pages = []
        self.capture = False
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'ol' and attrs.get('id') == 'book-pages':
            self.in_book = True
        elif self.in_book and tag == 'li':
            self.pages.append([])
        elif self.in_book and tag in ('h3', 'p') and 'page-zzz' not in (attrs.get('class') or ''):
            self.capture = True
            self.pages[-1].append('')

    def handle_endtag(self, tag):
        if tag == 'ol' and self.in_book:
            self.in_book = False
        if tag in ('h3', 'p'):
            self.capture = False

    def handle_data(self, data):
        if self.capture:
            self.pages[-1][-1] += data


parser = Pages()
parser.feed(Path(index_html).read_text(encoding='utf-8'))
out = Path(out_dir)
out.mkdir(parents=True, exist_ok=True)

for number, parts in enumerate(parser.pages):
    lines = []
    for part in parts:
        text = ' '.join(part.split()).replace('(', '').replace(')', '')
        if text and not re.search(r'[.!?…"”]$', text):
            text += '.'  # a pause after titles and bylines
        lines.append(text)
    script = ' '.join(lines)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'page.wav'
        subprocess.run(
            [piper, '-m', voice, '-f', str(wav),
             '--length-scale', '1.18',     # a little slower, for bedtime
             '--noise-scale', '0.6',
             '--noise-w-scale', '0.7',
             '--sentence-silence', '0.55',
             '--volume', '0.8'],        # softer, and no clipping
            input=script.encode('utf-8'), check=True, capture_output=True)
        m4a = out / f'page-{number}.m4a'
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '56000', '-c', '1', str(wav), str(m4a)],
                       check=True, capture_output=True)
    print(f'page-{number}.m4a  {m4a.stat().st_size // 1024} KB  "{script}"')
