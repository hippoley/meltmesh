import bpy
import bmesh
from array import array
import json
import math
import struct
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def sanitize_glb(source, output):
    data = source.read_bytes()
    if data[:4] != b"glTF" or len(data) < 20:
        raise ValueError("不是有效的 GLB 2.0 文件")
    json_length, json_type = struct.unpack_from("<II", data, 12)
    if json_type != 0x4E4F534A:
        raise ValueError("GLB 缺少 JSON chunk")
    document = json.loads(data[20:20 + json_length].decode("utf-8").rstrip(" \x00"))
    for material in document.get("materials", []):
        volume = material.get("extensions", {}).get("KHR_materials_volume")
        if volume and volume.get("attenuationDistance") is None:
            volume.pop("attenuationDistance", None)
    encoded = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    encoded += b" " * ((4 - len(encoded) % 4) % 4)
    remaining = data[20 + json_length:]
    rebuilt = bytearray(data[:12])
    rebuilt.extend(struct.pack("<II", len(encoded), 0x4E4F534A))
    rebuilt.extend(encoded)
    rebuilt.extend(remaining)
    struct.pack_into("<I", rebuilt, 8, len(rebuilt))
    output.write_bytes(rebuilt)


def generate_sdf(scene, output, resolution=64):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    vertices, polygons, triangle_materials = [], [], []
    image_cache = {}
    for obj in scene.objects:
        if obj.type != "MESH" or obj.hide_render:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            topology = bmesh.new()
            topology.from_mesh(mesh)
            is_closed = bool(topology.faces) and all(len(edge.link_faces) == 2 for edge in topology.edges)
            topology.free()
            base = len(vertices)
            world_vertices = [obj.matrix_world @ vertex.co for vertex in mesh.vertices]
            vertices.extend(world_vertices)
            uv_layer = mesh.uv_layers.active.data if mesh.uv_layers.active else None
            for triangle in mesh.loop_triangles:
                indices = tuple(base + index for index in triangle.vertices)
                polygons.append(indices)
                polygon = mesh.polygons[triangle.polygon_index]
                material = obj.material_slots[polygon.material_index].material if polygon.material_index < len(obj.material_slots) else None
                color, roughness, metallic, alpha, emission, transmission, image_data = [0.75, 0.75, 0.75], 0.45, 0.0, 1.0, 0.0, 0.0, None
                if material:
                    color = list(material.diffuse_color[:3])
                    alpha = float(material.diffuse_color[3])
                    if material.use_nodes:
                        principled = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
                        if principled:
                            color = list(principled.inputs["Base Color"].default_value[:3])
                            roughness = float(principled.inputs["Roughness"].default_value)
                            metallic = float(principled.inputs["Metallic"].default_value)
                            alpha = float(principled.inputs["Alpha"].default_value)
                            emission_input = principled.inputs.get("Emission Color") or principled.inputs.get("Emission")
                            emission_strength = principled.inputs.get("Emission Strength")
                            if emission_input:
                                emission_color = emission_input.default_value[:3]
                                emission = max(emission_color) * (float(emission_strength.default_value) if emission_strength else 1.0)
                            transmission_input = principled.inputs.get("Transmission Weight") or principled.inputs.get("Transmission")
                            if transmission_input:
                                transmission = float(transmission_input.default_value)
                            base_input = principled.inputs["Base Color"]
                            texture = base_input.links[0].from_node if base_input.is_linked else None
                            if texture and texture.type == "TEX_IMAGE" and texture.image:
                                key = texture.image.as_pointer()
                                if key not in image_cache:
                                    image_cache[key] = (list(texture.image.pixels[:]), texture.image.size[0], texture.image.size[1])
                                image_data = image_cache[key]
                    else:
                        roughness = float(material.roughness)
                        metallic = float(material.metallic)
                uvs = [tuple(uv_layer[loop].uv) for loop in triangle.loops] if uv_layer else None
                world_triangle = [world_vertices[index] for index in triangle.vertices]
                triangle_materials.append((color, roughness, metallic, alpha, emission, transmission, image_data, uvs, world_triangle, is_closed))
        finally:
            evaluated.to_mesh_clear()
    if not vertices or not polygons:
        raise ValueError("GLB 中没有可转换的网格")

    tree = BVHTree.FromPolygons(vertices, polygons, all_triangles=True)
    mins = [min(vertex[axis] for vertex in vertices) for axis in range(3)]
    maxs = [max(vertex[axis] for vertex in vertices) for axis in range(3)]
    center = [(mins[axis] + maxs[axis]) * 0.5 for axis in range(3)]
    max_dimension = max(maxs[axis] - mins[axis] for axis in range(3))
    normalize_scale = 2.6 / max(max_dimension, 1e-6)
    half = [max((maxs[axis] - mins[axis]) * 0.58, max_dimension * 0.04) for axis in range(3)]
    values, materials, material_features = array("f"), bytearray(), bytearray()
    for z in range(resolution):
        for y in range(resolution):
            for x in range(resolution):
                fractions = (x / (resolution - 1), y / (resolution - 1), z / (resolution - 1))
                point = Vector(tuple(center[axis] + (fractions[axis] * 2 - 1) * half[axis] for axis in range(3)))
                nearest, normal, triangle_index, distance = tree.find_nearest(point)
                if nearest is None:
                    values.append(max_dimension * normalize_scale)
                    materials.extend((191, 191, 191, 115))
                    material_features.extend((0, 255, 0, 0))
                else:
                    color, roughness, metallic, alpha, emission, transmission, image_data, uvs, world_triangle, is_closed = triangle_materials[triangle_index]
                    if is_closed:
                        signed_distance = distance * (-1.0 if (point - nearest).dot(normal) < 0 else 1.0)
                    else:
                        signed_distance = distance - max_dimension / resolution * 1.25
                    values.append(signed_distance * normalize_scale)
                    sampled = color
                    if image_data and uvs:
                        a, b, c = world_triangle
                        v0, v1, v2 = b - a, c - a, nearest - a
                        d00, d01, d11 = v0.dot(v0), v0.dot(v1), v1.dot(v1)
                        d20, d21 = v2.dot(v0), v2.dot(v1)
                        denominator = d00 * d11 - d01 * d01
                        if abs(denominator) > 1e-12:
                            weight_b = (d11 * d20 - d01 * d21) / denominator
                            weight_c = (d00 * d21 - d01 * d20) / denominator
                            weight_a = 1.0 - weight_b - weight_c
                            u = (uvs[0][0] * weight_a + uvs[1][0] * weight_b + uvs[2][0] * weight_c) % 1.0
                            v = (uvs[0][1] * weight_a + uvs[1][1] * weight_b + uvs[2][1] * weight_c) % 1.0
                            pixels, width, height = image_data
                            pixel = (min(int(v * height), height - 1) * width + min(int(u * width), width - 1)) * 4
                            sampled = [color[channel] * pixels[pixel + channel] for channel in range(3)]
                    materials.extend(max(0, min(255, round(value * 255))) for value in (*sampled, roughness))
                    material_features.extend(max(0, min(255, round(value * 255))) for value in (metallic, alpha, min(emission, 1.0), transmission))
    (output / "mesh-sdf.bin").write_bytes(values.tobytes())
    (output / "mesh-material.bin").write_bytes(materials)
    (output / "mesh-material-features.bin").write_bytes(material_features)
    return {
        "url": "mesh-sdf.bin",
        "materialUrl": "mesh-material.bin",
        "materialFeaturesUrl": "mesh-material-features.bin",
        "resolution": resolution,
        "bounds": [round(value * normalize_scale, 6) for value in half],
    }


def main():
    separator = sys.argv.index("--")
    source = Path(sys.argv[separator + 1])
    output = Path(sys.argv[separator + 2])
    sanitized = output / "sanitized.glb"
    sanitize_glb(source, sanitized)
    bpy.ops.import_scene.gltf(filepath=str(sanitized))
    scene = bpy.context.scene
    animated = bool(bpy.data.actions)
    start = int(scene.frame_start)
    action_end = max((action.frame_range[1] for action in bpy.data.actions), default=scene.frame_end)
    end = math.ceil(action_end) if animated else start
    scene.frame_set(start)
    sdf = generate_sdf(scene, output)
    source_frames = list(range(start, end + 1))
    if len(source_frames) > 48:
        step = (len(source_frames) - 1) / 47
        source_frames = sorted({round(start + index * step) for index in range(48)})

    frames = []
    for index, frame in enumerate(source_frames):
        scene.frame_set(frame)
        name = f"frame_{index:04d}.stl"
        bpy.ops.wm.stl_export(
            filepath=str(output / name),
            export_selected_objects=False,
            apply_modifiers=True,
            ascii_format=False,
        )
        frames.append(name)

    source_fps = scene.render.fps / scene.render.fps_base
    duration = max((end - start) / source_fps, 1 / source_fps)
    fps = max((len(frames) - 1) / duration, 1)
    manifest = {
        "frames": frames,
        "fps": round(fps, 3),
        "animated": animated and len(frames) > 1,
        "sourceFrameStart": start,
        "sourceFrameEnd": end,
        "sdf": sdf,
    }
    (output / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")


if __name__ == "__main__":
    main()
