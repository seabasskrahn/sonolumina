"""Verify tagged verses keep the exact BSB words. Usage: python3 tools/check_expression.py Genesis 1
(The Scribe's check.py, paths made relative to this repository: data/bsb and data/expression.)"""
import json,re,sys,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLOWED={'[reverent]','[solemn]','[softly]','[gently]','[warmly]','[calm]','[hushed]','[joyful]','[sorrowful]','[stern]','[fearful]','[ominous]','[slyly]','[short pause]','[long pause]'}
b,ch=sys.argv[1],int(sys.argv[2])
src=json.load(open(os.path.join(ROOT,f'data/bsb/{b}.json')))['c'][ch-1]
m=json.load(open(os.path.join(ROOT,f'data/expression/{b}.{ch}.json')));bad=0
assert len(m)==len(src),'verse count differs'
for i,v in enumerate(src,1):
    t=m[str(i)];tags=re.findall(r'\[[^\]]+\]',t)
    for x in tags:
        if x not in ALLOWED: print(i,'tag not allowed',x);bad+=1
    if re.sub(r' +',' ',re.sub(r'\[[^\]]+\] ?','',t)).strip()!=v.strip(): print(i,'WORDS CHANGED');bad+=1
print(b,ch,'OK' if not bad else f'{bad} problems')
