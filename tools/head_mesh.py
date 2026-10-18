"""Answer-engine head: a David bust reconstructed in 3D (Magnific hi3d-portrait) from the publication's own pencil
drawing (site/assets/img/art/david.webp — the world edition does not ship it), decimated and packed for the web.

Usage: python tools/head_mesh.py <head.glb>
Writes world/data/head.bin:
  uint32 nVerts, uint32 nTris, float32 scale[3], float32 offset[3]
  int16  positions[nVerts*3]   (quantised; position = q / 32767 * scale + offset), face toward +x, y up, height 1
  uint16 indices[nTris*3]
and world/data/head_shards.json: points on the back of the head where cubes break away (the AI dissolve).
"""
import json, os, struct, sys
import numpy as np
import trimesh
import fast_simplification

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'world')
TARGET_TRIS = 36000

mesh = trimesh.load(sys.argv[1]).to_geometry()
v, f = mesh.vertices.astype(np.float64), mesh.faces
reduction = 1 - TARGET_TRIS / len(f)
v2, f2 = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int64), target_reduction=reduction)
m = trimesh.Trimesh(v2, f2, process=True)
m.remove_unreferenced_vertices()

# orient: the face looks toward -x in the source → mirror x so it looks toward +x (mirror flips winding back)
P = m.vertices.copy()
P[:, 0] *= -1
F = m.faces[:, ::-1].copy()
# normalise: height 1, base at y = 0, centred in x / z on the head (upper 55 % of the bust)
P[:, 1] -= P[:, 1].min()
P /= P[:, 1].max()
head = P[P[:, 1] > 0.45]
P[:, 0] -= (head[:, 0].min() + head[:, 0].max()) / 2
P[:, 2] -= (head[:, 2].min() + head[:, 2].max()) / 2
lo, hi = P.min(0), P.max(0)
scale, offset = (hi - lo) / 2, (hi + lo) / 2
q = np.round((P - offset) / scale * 32767).astype(np.int16)
assert len(P) < 65536, len(P)
with open(os.path.join(ROOT, 'data', 'head.bin'), 'wb') as fh:
    fh.write(struct.pack('<II', len(P), len(F)))
    fh.write(struct.pack('<3f', *scale))
    fh.write(struct.pack('<3f', *offset))
    fh.write(q.tobytes())
    fh.write(F.astype(np.uint16).tobytes())

# shards: surface samples on the back half of the head, where it breaks into cubes
mm = trimesh.Trimesh(P, F, process=False)
pts, _ = trimesh.sample.sample_surface_even(mm, 9000, seed=7)
back = pts[(pts[:, 0] < -0.02) & (pts[:, 1] > 0.42)]
rng = np.random.default_rng(16)
keep = back[rng.random(len(back)) < np.clip((-back[:, 0] - 0.02) / 0.3, 0, 1) ** 1.3]
keep = keep[:900]
json.dump({'note': 'surface samples on the back of the reconstructed David bust (tools/head_mesh.py)',
           'pts': np.round(keep, 4).tolist()}, open(os.path.join(ROOT, 'data', 'head_shards.json'), 'w'), separators=(',', ':'))
print('verts', len(P), 'tris', len(F), 'shards', len(keep), 'bin KB', os.path.getsize(os.path.join(ROOT, 'data', 'head.bin')) // 1024)
