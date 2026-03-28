# FBX Model Pivot Point Fix Request

## Issue Summary
The ceiling light FBX models have incorrect pivot points, causing alignment issues in our 3D scene. The mesh geometry is not centered at the origin (0,0,0) within each FBX file, which prevents proper port-to-port connections between components.

## What Needs to Be Fixed
All FBX models need their mesh geometry centered at the correct pivot point before export. This is a simple fix in Blender/Maya/3ds Max that takes about 5-10 minutes per model.

---

## Files That Need Fixing

Located in: `/public/Ceiling Light Models/`

1. Hub.fbx
2. 18in Light.fbx
3. 36in Light.fbx
4. T Connector.fbx
5. Cross Connector.fbx
6. Y Connector.fbx (or Y.fbx)
7. Left Angle Connector.fbx
8. Right Angle Connector.fbx
9. 45Degree Left.fbx
10. 45Degree Rightt.fbx

---

## Required Fix for Each Model

### General Steps (applies to ALL models):

1. Open the FBX file in your 3D software (Blender/Maya/3ds Max)
2. Select the mesh geometry
3. Move the mesh so the connection point is at world origin (0, 0, 0)
4. Set the object's pivot point to origin
5. Verify the pivot gizmo is at (0, 0, 0)
6. Export with the settings below

---

## Specific Requirements by Model Type

### 1. Hub.fbx
**Pivot Point Location:** Geometric center of the octagonal hub

**Steps:**
- Center the octagonal mesh at world origin (0, 0, 0)
- The hub should extend equally in all directions from the origin
- Ensure the model is oriented horizontally (flat, octagon face pointing up)

**Visual Check:** When you select the object, the pivot gizmo should be at the exact center of the octagon.

---

### 2. Light Bars (18in Light.fbx, 36in Light.fbx)
**Pivot Point Location:** Exact midpoint of the bar's length

**Steps:**
- Center the bar mesh so its midpoint is at world origin (0, 0, 0)
- The bar should extend equally left and right from the origin
- Orient the bar horizontally along the X-axis
- For 18" bar: extends 9" left and 9" right from center
- For 36" bar: extends 18" left and 18" right from center

**Visual Check:** The pivot gizmo should be at the exact center of the bar's length.

---

### 3. T Connector.fbx
**Pivot Point Location:** Junction center where the 3 arms meet

**Steps:**
- Move the mesh so the junction point (where 3 arms converge) is at world origin (0, 0, 0)
- All 3 arms should extend outward from the origin
- Ensure the model is oriented horizontally (flat)

**Visual Check:** The pivot gizmo should be at the junction where all 3 arms meet.

---

### 4. Cross Connector.fbx
**Pivot Point Location:** Junction center where the 4 arms intersect

**Steps:**
- Move the mesh so the junction point (where 4 arms cross) is at world origin (0, 0, 0)
- All 4 arms should extend outward from the origin in a + shape
- Ensure the model is oriented horizontally (flat)

**Visual Check:** The pivot gizmo should be at the center intersection of the cross.

---

### 5. Y Connector.fbx
**Pivot Point Location:** Junction center where the 3 arms converge

**Steps:**
- Move the mesh so the junction point (where 3 arms meet at 120° angles) is at world origin (0, 0, 0)
- All 3 arms should extend outward from the origin
- Ensure the model is oriented horizontally (flat)

**Visual Check:** The pivot gizmo should be at the junction where all 3 arms meet.

---

### 6. Left Angle Connector.fbx & Right Angle Connector.fbx
**Pivot Point Location:** Corner vertex where the 2 arms meet at 90°

**Steps:**
- Move the mesh so the corner (where 2 perpendicular arms meet) is at world origin (0, 0, 0)
- Both arms should extend outward from the origin forming an L-shape
- Ensure the model is oriented horizontally (flat)

**Visual Check:** The pivot gizmo should be at the corner where the two arms meet.

---

### 7. 45Degree Left.fbx & 45Degree Rightt.fbx
**Pivot Point Location:** Vertex where the 2 arms meet at 45°

**Steps:**
- Move the mesh so the vertex (where 2 angled arms meet) is at world origin (0, 0, 0)
- Both arms should extend outward from the origin at a 45° angle
- Ensure the model is oriented horizontally (flat)

**Visual Check:** The pivot gizmo should be at the vertex where the two angled arms meet.

---

## Export Settings (CRITICAL!)

### Blender Export Settings:
```
File → Export → FBX

Scale: 1.0
Apply Scalings: FBX All
Forward: -Z Forward
Up: Y Up
☑ Apply Transform (checked)
☐ Bake Animation (unchecked)
```

### Maya Export Settings:
```
File → Export Selection → FBX

File Type Specific Options → Advanced Options:
- Units: Automatic
- Axis Conversion: Y-up
- FBX File Format: Binary
```

### 3ds Max Export Settings:
```
Export → FBX

- Units: Automatic
- Axis Conversion: Y-up
- Up Axis: Y-axis
```

---

## Verification Checklist

Before sending the files back, please verify each model:

- ☑ Pivot point is at (0, 0, 0) in world space
- ☑ Mesh geometry is centered at the correct connection point
- ☑ Model is oriented horizontally (flat, not standing up)
- ☑ Scale is 1.0 in all axes (X, Y, Z)
- ☑ No rotation applied to object (rotation should be 0°, 0°, 0°)
- ☑ File exported with settings above

---

## Why This Matters

When we position a model at coordinates (X, Y, Z) in our 3D scene, the pivot point determines where the model appears. If the pivot is not at the connection point:
- Components won't align properly
- Port-to-port connections will have visible gaps
- The 2D canvas and 3D view won't match

With correct pivots, all components will snap together perfectly, just like they do in the 2D canvas view.

---

## Questions?

If you need clarification on any model's pivot point location, please ask. I can provide screenshots or more detailed instructions for specific models.

Thank you!
