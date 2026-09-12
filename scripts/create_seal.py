import bpy
import bmesh
import math
import os
import mathutils

# ── Reset ──────────────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Filmic'
scene.view_settings.look = 'None'

# ── Collections ────────────────────────────────────────────────────────────────
seal_col = bpy.data.collections.new("Seal")
scene.collection.children.link(seal_col)

def link(obj):
    seal_col.objects.link(obj)
    return obj

# ── Sphere body ────────────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.0, segments=96, ring_count=48, location=(0, 0, 0))
body = bpy.context.active_object
body.name = "Body"

mat_body = bpy.data.materials.new("MatBody")
mat_body.use_nodes = True
bsdf = mat_body.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.02, 0.022, 0.03, 1)
bsdf.inputs["Roughness"].default_value = 0.18
bsdf.inputs["Metallic"].default_value = 0.0
bsdf.inputs["Specular IOR Level"].default_value = 0.5
# Glass / transmission
bsdf.inputs["Transmission Weight"].default_value = 0.35
bsdf.inputs["Alpha"].default_value = 0.95
# Coat for that glass-clear top layer
bsdf.inputs["Coat Weight"].default_value = 1.0
bsdf.inputs["Coat Roughness"].default_value = 0.05
bsdf.inputs["Coat IOR"].default_value = 1.5
bsdf.inputs["Coat Tint"].default_value = (1, 1, 1, 1)
body.data.materials.append(mat_body)
link(body)

# ── Network: gold curves on surface ────────────────────────────────────────────
def fibonacci_sphere(n, r=1.005):
    pts = []
    phi = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        y = 1 - (i / (n - 1)) * 2
        radius = math.sqrt(1 - y * y)
        theta = phi * i
        x = math.cos(theta) * radius
        z = math.sin(theta) * radius
        pts.append((x * r, y * r, z * r))
    return pts

def connect_neighbors(pts, max_dist=0.72, max_edges=2):
    edges = set()
    for i, a in enumerate(pts):
        dists = []
        for j, b in enumerate(pts):
            if i == j:
                continue
            d = math.sqrt(sum((a[k] - b[k])**2 for k in range(3)))
            if d < max_dist:
                dists.append((d, j))
        dists.sort()
        for _, j in dists[:max_edges]:
            e = (min(i, j), max(i, j))
            if e not in edges:
                edges.add(e)
    return list(edges)

# Nodes (small gold spheres)
node_pts = fibonacci_sphere(26, r=1.006)
node_mesh = bpy.data.meshes.new("NetworkNodes")
node_obj = bpy.data.objects.new("NetworkNodes", node_mesh)
bm = bmesh.new()
for p in node_pts:
    bmesh.ops.create_cone(bm, cap_ends=True, radius1=0.012, radius2=0.0, depth=0.024, segments=8, matrix=mathutils.Matrix.Translation(p))
bm.to_mesh(node_mesh)
bm.free()

mat_gold = bpy.data.materials.new("MatGold")
mat_gold.use_nodes = True
bsdf_g = mat_gold.node_tree.nodes["Principled BSDF"]
bsdf_g.inputs["Base Color"].default_value = (0.76, 0.65, 0.32, 1)
bsdf_g.inputs["Roughness"].default_value = 0.25
bsdf_g.inputs["Metallic"].default_value = 0.9
node_obj.data.materials.append(mat_gold)
link(node_obj)

# Edges (gold lines)
edges = connect_neighbors(node_pts, max_dist=0.72, max_edges=2)
edge_mesh = bpy.data.meshes.new("NetworkEdges")
edge_obj = bpy.data.objects.new("NetworkEdges", edge_mesh)
verts = []
edge_indices = []
vert_map = {}
idx = 0
for i, j in edges:
    for pt_idx in (i, j):
        if pt_idx not in vert_map:
            vert_map[pt_idx] = idx
            verts.append(node_pts[pt_idx])
            idx += 1
    edge_indices.append((vert_map[i], vert_map[j]))

edge_mesh.from_pydata(verts, edge_indices, [])
edge_mesh.update()

# Set skin radii
skin_mod = edge_obj.modifiers.new("Skin", 'SKIN')
edge_obj.data.materials.append(mat_gold)
for v in edge_obj.data.vertices:
    sv = edge_obj.data.skin_vertices[0].data[v.index]
    sv.radius = (0.004, 0.004)

link(edge_obj)

# ── Lock-ring fragments ────────────────────────────────────────────────────────
def make_arc(name, r, angle_start, angle_span, tube_r, location):
    curve_data = bpy.data.curves.new(name, type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = tube_r
    curve_data.bevel_resolution = 6
    spline = curve_data.splines.new('BEZIER')
    n_pts = 16
    spline.bezier_points.add(n_pts - 1)
    for i in range(n_pts):
        t = angle_start + (i / (n_pts - 1)) * angle_span
        x = math.cos(t) * r
        y = math.sin(t) * r
        z = 0
        bp = spline.bezier_points[i]
        bp.co = (x, y, z)
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve_data)
    obj.location = location
    obj.data.materials.append(mat_gold)
    link(obj)
    return obj

# Upper-right fragments, floating off the sphere
frag1 = make_arc("Frag1", 1.18, 0.3, 0.55, 0.012, (0.45, 0.4, 0.25))
frag2 = make_arc("Frag2", 1.22, 0.6, 0.45, 0.009, (0.5, 0.2, 0.2))

# ── Outer orbit ────────────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_circle_add(radius=1.7, vertices=128, fill_type='NOTHING', location=(0, 0, 0))
orbit = bpy.context.active_object
orbit.name = "OuterOrbit"
orbit.rotation_euler = (math.radians(80), math.radians(10), 0)

mat_orbit = bpy.data.materials.new("MatOrbit")
mat_orbit.use_nodes = True
bsdf_o = mat_orbit.node_tree.nodes["Principled BSDF"]
bsdf_o.inputs["Base Color"].default_value = (0.76, 0.65, 0.32, 1)
bsdf_o.inputs["Roughness"].default_value = 0.3
bsdf_o.inputs["Metallic"].default_value = 0.8
# Make it thin wire
orbit.data.materials.append(mat_orbit)

# Add wireframe modifier for thin line
wire_mod = orbit.modifiers.new("Wire", 'WIREFRAME')
wire_mod.thickness = 0.003
wire_mod.use_replace = True
link(orbit)

# ── Lights ─────────────────────────────────────────────────────────────────────
# Key light: warm, upper right, small angle
bpy.ops.object.light_add(type='SPOT', location=(3, -2.5, 2.5))
key = bpy.context.active_object
key.name = "KeyLight"
key.data.energy = 800
key.data.color = (0.95, 0.82, 0.55)
key.data.spot_size = math.radians(35)
key.data.spot_blend = 0.85
key.data.shadow_soft_size = 0.5
key.rotation_euler = (math.radians(55), 0, math.radians(35))

# Rim light: cool, from behind-left
bpy.ops.object.light_add(type='SPOT', location=(-2.5, 2, -2))
rim = bpy.context.active_object
rim.name = "RimLight"
rim.data.energy = 120
rim.data.color = (0.55, 0.65, 0.8)
rim.data.spot_size = math.radians(50)
rim.data.spot_blend = 1.0
rim.rotation_euler = (math.radians(-30), 0, math.radians(-140))

# Subtle fill from below to define bottom rim
bpy.ops.object.light_add(type='AREA', location=(0, 1.5, -1.5))
fill = bpy.context.active_object
fill.name = "FillLight"
fill.data.energy = 15
fill.data.color = (0.6, 0.6, 0.65)
fill.data.size = 2.0
fill.rotation_euler = (math.radians(-50), 0, 0)

# ── Camera ─────────────────────────────────────────────────────────────────────
bpy.ops.object.camera_add(location=(3.2, -2.8, 1.8))
cam = bpy.context.active_object
cam.name = "Camera"
cam.rotation_euler = (math.radians(72), 0, math.radians(42))
cam.data.lens = 65
cam.data.clip_end = 100
scene.camera = cam

# ── World ──────────────────────────────────────────────────────────────────────
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.015, 0.016, 0.02, 1)
bg.inputs["Strength"].default_value = 0.0

# ── Render settings for preview ────────────────────────────────────────────────
scene.render.resolution_x = 1200
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100

# ── Export GLB ─────────────────────────────────────────────────────────────────
export_path = os.path.join(os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.path.expanduser("~/OneDrive/Documents/Anonimus/web/public"), "occluded-seal.glb")
os.makedirs(os.path.dirname(export_path), exist_ok=True)

# Apply modifiers for export
for obj in seal_col.objects:
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
