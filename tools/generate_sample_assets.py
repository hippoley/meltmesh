import bpy
import math
import random
from pathlib import Path


OUTPUT = Path(__file__).resolve().parents[1] / "sample-models"
TEXTURES = OUTPUT / "textures"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.meshes, bpy.data.curves):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, metallic=0.0, roughness=0.35, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.68 if metallic < 0.5 else 0.42
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = 0.72 if metallic < 0.5 else 0.45
    if "Coat Weight" in bsdf.inputs and metallic < 0.5:
        bsdf.inputs["Coat Weight"].default_value = 0.28 if roughness < 0.35 else 0.06
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = max(0.03, roughness * 0.45)
    if "Transmission Weight" in bsdf.inputs:
      bsdf.inputs["Transmission Weight"].default_value = transmission
    elif "Transmission" in bsdf.inputs:
      bsdf.inputs["Transmission"].default_value = transmission
    if transmission:
        bsdf.inputs["IOR"].default_value = 1.45
    color_node = nt.nodes.new("ShaderNodeTexImage")
    rough_node = nt.nodes.new("ShaderNodeTexImage")
    color_node.image = make_texture(f"{name}_basecolor", color[0], color[1], color[2])
    rough_node.image = make_roughness_texture(f"{name}_roughness", roughness, metallic)
    color_node.interpolation = "Smart"
    rough_node.interpolation = "Smart"
    color_node.extension = "REPEAT"
    rough_node.extension = "REPEAT"
    color_node.image.colorspace_settings.name = "sRGB"
    rough_node.image.colorspace_settings.name = "Non-Color"
    nt.links.new(color_node.outputs["Color"], bsdf.inputs["Base Color"])
    if "Roughness" in bsdf.inputs:
        nt.links.new(rough_node.outputs["Color"], bsdf.inputs["Roughness"])
    nt.nodes.remove(nt.nodes.get("Material Output")) if False else None
    return mat


def write_texture(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.save()


def make_texture(name, r, g, b, seed=0):
    random.seed(name + str(seed))
    size = 1024
    image = bpy.data.images.new(name, width=size, height=size)
    pixels = []
    for y in range(size):
        for x in range(size):
            u = x / (size - 1)
            v = y / (size - 1)
            lower = name.lower()
            if "wood" in lower:
                rings = 0.5 + 0.5 * math.sin((u * 38.0 + 0.8 * math.sin(v * 18.0)) * math.pi)
                pores = 0.5 + 0.5 * math.sin((u * 130.0 + v * 11.0) * math.pi)
                wave = 0.62 + rings * 0.30 + pores * 0.08
                grain = 0.10 * math.sin((u * 210.0 + v * 17.0 + seed) * 0.23)
            elif "steel" in lower:
                brush = 0.5 + 0.5 * math.sin((u * 180.0 + seed) * math.pi)
                wave = 0.78 + brush * 0.10
                grain = 0.025 * math.sin((v * 420.0 + seed) * 0.17)
            elif "metal" in lower:
                swirl = 0.5 + 0.5 * math.sin((u * 22.0 + v * 31.0) * math.pi)
                wave = 0.86 + swirl * 0.10
                grain = 0.035 * math.cos((u * 70.0 - v * 40.0 + seed) * 0.4)
            elif "plastic" in lower:
                wave = 0.92 + 0.05 * math.sin((u * 11.0 + v * 9.0) * math.pi)
                grain = 0.015 * math.sin((u * 63.0 + v * 41.0 + seed) * 0.5)
            else:
                wave = 0.88 + 0.10 * math.sin((u * 17.0 + v * 11.0 + random.random() * 0.05) * math.pi)
                grain = 0.035 * math.sin((u * 73.0 + v * 19.0 + seed) * 0.5)
            rr = min(1.0, max(0.0, r * wave + grain))
            gg = min(1.0, max(0.0, g * wave + grain * 0.7))
            bb = min(1.0, max(0.0, b * wave + grain * 0.5))
            pixels.extend([rr, gg, bb, 1.0])
    image.pixels.foreach_set(pixels)
    write_texture(image, TEXTURES / f"{name}.png")
    return image


def make_roughness_texture(name, roughness, metallic):
    size = 1024
    image = bpy.data.images.new(name, width=size, height=size)
    pixels = []
    for y in range(size):
        for x in range(size):
            u = x / (size - 1)
            v = y / (size - 1)
            lower = name.lower()
            if "steel" in lower:
                noise = 0.05 * math.sin(u * 240.0 * math.pi) + 0.025 * math.cos(v * 31.0 * math.pi)
            elif "wood" in lower:
                noise = 0.16 * math.sin((u * 58.0 + math.sin(v * 18.0)) * math.pi) + 0.08 * math.cos(v * 19.0 * math.pi)
            elif "plastic" in lower:
                noise = 0.035 * math.sin((u * 23.0 + v * 17.0) * math.pi)
            else:
                noise = 0.10 * math.sin((u * 41.0 + v * 27.0) * math.pi) + 0.07 * math.cos((u * 11.0 - v * 33.0) * math.pi)
            value = min(1.0, max(0.02, roughness + noise + metallic * 0.08))
            pixels.extend([value, value, value, 1.0])
    image.pixels.foreach_set(pixels)
    write_texture(image, TEXTURES / f"{name}.png")
    return image


def smooth(object_):
    if object_.type == "MESH":
        for polygon in object_.data.polygons:
            polygon.use_smooth = True


def export(name):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT / name),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_apply=True,
        export_cameras=False,
        export_lights=False,
    )


def glossy_plastic_sphere():
    reset_scene()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32)
    obj = bpy.context.object
    obj.scale = (0.85, 0.85, 0.85)
    obj.data.materials.append(material("Glossy plastic", (0.95, 0.18, 0.36), roughness=0.18))
    smooth(obj)
    export("PlasticSphere.glb")


def polished_metal_torus():
    reset_scene()
    bpy.ops.mesh.primitive_torus_add(major_radius=0.78, minor_radius=0.24, major_segments=64, minor_segments=24)
    obj = bpy.context.object
    obj.rotation_euler = (math.radians(18), math.radians(-18), math.radians(26))
    obj.data.materials.append(material("Warm polished metal", (0.95, 0.68, 0.32), metallic=1.0, roughness=0.12))
    smooth(obj)
    export("PolishedMetalTorus.glb")


def walnut_wood_block():
    reset_scene()
    bpy.ops.mesh.primitive_cube_add(size=1.25)
    obj = bpy.context.object
    obj.scale = (1.05, 0.55, 0.75)
    obj.rotation_euler = (math.radians(9), math.radians(-18), math.radians(7))
    bevel = obj.modifiers.new("Rounded wood edges", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 5
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(material("Walnut wood", (0.55, 0.30, 0.13), roughness=0.48))
    smooth(obj)
    export("WalnutWoodBlock.glb")


def porcelain_vase():
    reset_scene()
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=0.48, depth=1.25)
    obj = bpy.context.object
    bevel = obj.modifiers.new("Soft contour", "BEVEL")
    bevel.width = 0.17
    bevel.segments = 5
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(material("White glazed porcelain", (0.96, 0.92, 0.84), roughness=0.18))
    smooth(obj)
    export("PorcelainVase.glb")


def brushed_steel_cone():
    reset_scene()
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=0.62, radius2=0.34, depth=1.45)
    obj = bpy.context.object
    obj.rotation_euler = (math.radians(12), math.radians(16), math.radians(8))
    bevel = obj.modifiers.new("Faceted bevel", "BEVEL")
    bevel.width = 0.06
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(material("Brushed steel", (0.72, 0.75, 0.76), metallic=1.0, roughness=0.34))
    smooth(obj)
    export("BrushedSteelCone.glb")


glossy_plastic_sphere()
polished_metal_torus()
walnut_wood_block()
porcelain_vase()
brushed_steel_cone()
