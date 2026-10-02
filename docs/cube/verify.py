# Replays solve.json on a sticker-model cube and checks every stage. Run: python3 verify.py
# Axes: x = R, y = U, z = F. A face turn is clockwise as seen looking at that face.
import json, itertools, os
AX={'R':(0,1),'L':(0,-1),'U':(1,1),'D':(1,-1),'F':(2,1),'B':(2,-1)}
NORM={'R':(1,0,0),'L':(-1,0,0),'U':(0,1,0),'D':(0,-1,0),'F':(0,0,1),'B':(0,0,-1)}
COL={'U':'Y','D':'W','F':'G','B':'B','R':'R','L':'O'}
def rot(v,a,s):
    x,y,z=v
    return (x,-s*z,s*y) if a==0 else (s*z,y,-s*x) if a==1 else (-s*y,s*x,z)
def solved():
    return {((x,y,z),n):COL[f] for x,y,z in itertools.product((-1,0,1),repeat=3) for f,n in NORM.items()
            if any((x,y,z)[i]==n[i]!=0 for i in range(3))}
def move(st,m):
    a,side=AX[m[0]]
    for _ in range({'':1,"'":3,'2':2}[m[1:]]):
        st={((rot(p,a,-side),rot(n,a,-side)) if p[a]==side else (p,n)):c for (p,n),c in st.items()}
    return st
def apply(st,seq):
    for m in seq.split(): st=move(st,m)
    return st
S0=solved()
ok=lambda st,ps: all(st[k]==S0[k] for k in S0 if k[0] in ps)
CROSS=[(0,-1,1),(1,-1,0),(0,-1,-1),(-1,-1,0)]
SLOT={'FR':[(1,-1,1),(1,0,1)],'RB':[(1,-1,-1),(1,0,-1)],'BL':[(-1,-1,-1),(-1,0,-1)],'LF':[(-1,-1,1),(-1,0,1)]}
assert apply(S0,"R U R' U' "*6)==S0 and apply(S0,"R")[((1,1,1),(0,1,0))]=='G'
d=json.load(open(os.path.join(os.path.dirname(__file__) or '.','solve.json')))
st=apply(S0,d['scramble']); done=[]
assert not ok(st,CROSS)
for i,s in enumerate(d['stages']):
    st=apply(st,s['moves']); c=s['caption']
    assert ok(st,CROSS), c
    if c.startswith('pair'): done.append(d['slot_order'][int(c[-1])-1])
    for k,v in SLOT.items(): assert ok(st,v)==(k in done or i>4), (c,k)
    if c=='top face': assert all(st[k]=='Y' for k in st if k[1]==(0,1,0))
    print(f"{c:10s} ok  ({s['count']} moves)")
assert st==S0; print("solved ok,", d['total_moves'], "moves")
