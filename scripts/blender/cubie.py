# The stickerless cubie for the site's cube: a 1-unit cube with softly rounded
# edges, exported as public/models/cubie.glb. No materials — the site colours
# each face in its shader (src/gl/cube-view.js).
#
# Run inside Blender (Scripting tab, or `blender -b -P scripts/blender/cubie.py`).
# It builds in a throwaway scene and removes it again, so it's safe to run with
# any file open.
import bpy, bmesh, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "models", "cubie.glb")

prev = bpy.context.window.scene if bpy.context.window else bpy.context.scene
scn = bpy.data.scenes.new("tmp_stickerless")
if bpy.context.window:
    bpy.context.window.scene = scn

mesh = bpy.data.meshes.new("stickerless_cubie")
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
bm.to_mesh(mesh)
bm.free()
obj = bpy.data.objects.new("stickerless_cubie", mesh)
scn.collection.objects.link(obj)
for o in scn.objects:
    o.select_set(False)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)

# rounded edges: a 6-segment round bevel, 8.5% of the edge
bev = obj.modifiers.new("bevel", "BEVEL")
bev.width = 0.085
bev.segments = 6
bev.profile = 0.5
bev.limit_method = "NONE"
bpy.ops.object.modifier_apply(modifier="bevel")

# smooth the rounds, keep the faces dead flat
bpy.ops.object.shade_smooth()
wn = obj.modifiers.new("wn", "WEIGHTED_NORMAL")
wn.keep_sharp = True
wn.weight = 100
bpy.ops.object.modifier_apply(modifier="wn")

bpy.ops.export_scene.gltf(
    filepath=os.path.normpath(OUT), export_format="GLB", use_selection=True, use_active_scene=True,
    export_normals=True, export_materials="NONE", export_texcoords=False, export_yup=True, export_apply=True,
)

if bpy.context.window:
    bpy.context.window.scene = prev
bpy.data.objects.remove(obj, do_unlink=True)
bpy.data.meshes.remove(mesh)
bpy.data.scenes.remove(scn)
