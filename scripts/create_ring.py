import bpy
import bmesh
import math
import os
import mathutils

# Reset
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True

# Collections
ring_col = bpy.data.collections.new("Ring")
scene.collection.children.link(ring_col)

def link(obj):
    ring_col.objects.link(obj)
    return obj

# ── Ring body: curve with bevel ───────────────────────────────────────────────
curve_data = bpy.data.curves.new("RingPath", type='CURVE')
curve_data.dimensions = '3D'
curve_data.bevel_depth = 0.18
curve_data.bevel_resolution = 16
curve_data.fill_mode = 'FULL'
curve_data.resolution_u = 48

# Create almost-full circle with gap at ~60 degrees (2 o'clock)
spline = curve_data.splines.new('BEZIER')
gap_start = math.radians(60)
gap_end = math.radians(360)
total_angle = gap_end - gap_start
n_pts = 64
spline.bezier_points.add(n_pts - 1)
spline.use_cyclic_u = False

for i in range(n_pts):
    t = gap_start + (i / (n_pts - 1)) * total_angle
    x = math.cos(t) * 1.0
    y = math.sin(t) * 1.0
    z = 0
    bp = spline.bezier_points[i]
    bp.co = (x, y, z)
    bp.handle_left_type = 'AUTO'
    bp.handle_right_type = 'AUTO'

ring_obj = bpy.data.objects.new("RingBody", curve_data)
link(ring_obj)

# Material: dark lacquer
mat_body = bpy.data.materials.new("MatDarkLacquer")
mat_body.use_nodes = True
bsdf = mat_body.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.12, 0.13, 0.14, 1)
bsdf.inputs["Roughness"].default_value = 0.42
bsdf.inputs["Metallic"].default_value = 0.35
bsdf.inputs["Specular IOR Level"].default_value = 0.5
bsdf.inputs["Coat Weight"].default_value = 0.4
bsdf.inputs["Coat Roughness"].default_value = 0.3
ring_obj.data.materials.append(mat_body)

# ── Convert curve to mesh for export ──────────────────────────────────────────
bpy.context.view_layer.objects.active = ring_obj
ring_obj.select_set(True)
bpy.ops.object.convert(target='MESH')
ring_obj.select_set(False)

# ── End caps: two gold discs ──────────────────────────────────────────────────
def make_cap(name, angle, location):
    bpy.ops.mesh.primitive_circle_add(radius=0.18, vertices=32, fill_type='NGON', location=location)
    cap = bpy.context.active_object
    cap.name = name
    # Orient: face along tangent direction
    tangent = mathutils.Vector((-math.sin(angle), math.cos(angle), 0))
    # Rotate to face tangent
    cap.rotation_euler = (math.pi/2, 0, angle + math.pi/2)
    link(cap)
    return cap

gap_angle_start = math.radians(60)
gap_angle_end = math.radians(360)

cap_a = make_cap("CapA", gap_angle_start,
    (math.cos(gap_angle_start) * 1.0, math.sin(gap_angle_start) * 1.0, 0))
cap_b = make_cap("CapB", gap_angle_end,
    (math.cos(gap_angle_end) * 1.0, math.sin(gap_angle_end) * 1.0, 0))

# Gold material
mat_gold = bpy.data.materials.new("MatGold")
mat_gold.use_nodes = True
bsdf_g = mat_gold.node_tree.nodes["Principled BSDF"]
bsdf_g.inputs["Base Color"].default_value = (0.76, 0.65, 0.32, 1)
bsdf_g.inputs["Roughness"].default_value = 0.18
bsdf_g.inputs["Metallic"].default_value = 0.85
bsdf_g.inputs["Specular IOR Level"].default_value = 0.6
cap_a.data.materials.append(mat_gold)
cap_b.data.materials.append(mat_gold)

# ── Gap lining: thin gold torus in the gap ───────────────────────────────────
bpy.ops.mesh.primitive_torus_add(
    major_radius=1.0, minor_radius=0.025,
    major_segments=24, minor_segments=8,
    location=(0, 0, 0))
gap_lining = bpy.context.active_object
gap_lining.name = "GapLining"
# Rotate to align with gap, trim with boolean or just place it
# Actually, use a partial torus via curve
gap_curve_data = bpy.data.curves.new("GapPath", type='CURVE')
gap_curve_data.dimensions = '3D'
gap_curve_data.bevel_depth = 0.025
gap_curve_data.bevel_resolution = 6
gap_curve_data.fill_mode = 'FULL'
gap_curve_data.resolution_u = 12

gap_spline = gap_curve_data.splines.new('BEZIER')
gap_spline.bezier_points.add(7)
gap_spline.use_cyclic_u = False

for i in range(8):
    t = gap_start + (i / 7) * (gap_start * 0.3 if i < 4 else -gap_start * 0.3)
    # Small arc around the gap opening
    angle = gap_start + (i - 3.5) / 7 * 0.6
    x = math.cos(angle) * 1.0
    y = math.sin(angle) * 1.0
    bp = gap_spline.bezier_points[i]
    bp.co = (x, y, 0)
    bp.handle_left_type = 'AUTO'
    bp.handle_right_type = 'AUTO'

gap_lining_obj = bpy.data.objects.new("GapLiningActual", gap_curve_data)
gap_lining_obj.location = (0, 0, 0)
link(gap_lining_obj)
gap_lining_obj.data.materials.append(mat_gold)

# Remove the full torus we accidentally created
bpy.data.objects.remove(gap_lining, do_unlink=True)

# ── Lights ────────────────────────────────────────────────────────────────────
# Key: warm, upper right, outside
bpy.ops.object.light_add(type='SPOT', location=(2.5, -2, 2))
key = bpy.context.active_object
key.name = "KeyLight"
key.data.energy = 600
key.data.color = (0.95, 0.82, 0.55)
key.data.spot_size = math.radians(35)
key.data.spot_blend = 0.85
key.rotation_euler = (math.radians(50), 0, math.radians(40))

# Rim: cool, back left
bpy.ops.object.light_add(type='SPOT', location=(-2, 1.5, -1.5))
rim = bpy.context.active_object
rim.name = "RimLight"
rim.data.energy = 150
rim.data.color = (0.55, 0.65, 0.8)
rim.data.spot_size = math.radians(50)
rim.data.spot_blend = 1.0
rim.rotation_euler = (math.radians(-25), 0, math.radians(-130))

# ── Camera ────────────────────────────────────────────────────────────────────
bpy.ops.object.camera_add(location=(2.2, -1.8, 2.0))
cam = bpy.context.active_object
cam.name = "Camera"
# Look at center, slightly above
target = mathutils.Vector((0, 0, 0))
direction = target - cam.location
rot_quat = direction.to_track_quat('-Z', 'Y')
cam.rotation_euler = rot_quat.to_euler()
cam.data.lens = 50
cam.data.clip_end = 100
scene.camera = cam

# ── World ─────────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.015, 0.016, 0.02, 1)
bg.inputs["Strength"].default_value = 0.0

# ── Render settings ───────────────────────────────────────────────────────────
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100

# ── Export GLB ────────────────────────────────────────────────────────────────
export_path = os.path.join(os.path.expanduser("~/OneDrive/Documents/Anonimus/web/public"), "interrupted-ring.glb")
os.makedirs(os.path.dirname(export_path), exist_ok=True)

# Apply modifiers
for obj in ring_col.objects:
    if obj.modifiers:
        for mod in obj.modifiers:
            try:
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except:
                pass

bpy.ops.export_scene.gltf(
    filepath=export_path,
    use_selection=False,
    export_format='GLB',
    export_apply=True,
    export_materials='EXPORT',
    export_yup=True,
)

print(f"Exported to {export_path}")
