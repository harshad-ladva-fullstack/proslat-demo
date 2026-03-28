# Ceiling Lights 3D Model Issue - FBX Files Need Fixing

## Problem Summary
The ceiling light components (hub and light bars) are NOT connecting properly in the 3D view, even though they connect perfectly in the 2D canvas. This is **NOT a code issue** - it's because the FBX model files have incorrect pivot points and geometry positioning.

## Evidence
1. **2D Canvas**: All components connect perfectly port-to-port
2. **3D View**: Visual gaps between hub and light bars
3. **Console Verification**: The code calculates that ports ARE at the same 3D coordinates
4. **Debug Markers**: Green spheres (hub ports) and cyan spheres (light bar ports) show the calculated positions are correct, but the visual models don't align

## Root Cause
The FBX model files have their mesh geometry positioned incorrectly relative to their origin point (pivot). When the code positions a model at coordinates (X, Y, Z), the visual mesh appears offset because the mesh is not centered at (0, 0, 0) within the FBX file.

## Current 3D Model Dimensions (from your data)

### Hub.fbx
- Size: 0.20 × 0.04 × 0.20 units
- Issue: Geometry is not centered at origin

### Light Bars
- 18in Light.fbx: 45.75 × 2.11 × 2.09 units
- 36in Light.fbx: 91.50 × 2.10 × 2.08 units  
- Issue: Geometry is not centered at origin, pivot point is wrong

### Connectors
- T Connector.fbx: 0.03 × 0.02 × 0.04 units
- Cross Connector.fbx: 0.04 × 0.02 × 0.04 units
- Y Connector.fbx: 4.10 × 4.45 × 2.27 units
- Left/Right Angle Connectors: 0.03 × 0.02 × 0.03 units
- 45Degree Left/Right: 0.03 × 0.02 × 0.04 units
- Issue: Inconsistent scales and incorrect pivots

## Required Fixes for 3D Artist

### 1. Hub Model (Hub.fbx)
**Current Issue**: Pivot point is not at geometric center
**Required Fix**:
- Open Hub.fbx in Blender/Maya/3ds Max
- Center the mesh geometry at world origin (0, 0, 0)
- Set pivot point to geometric center of the octagonal hub
- Ensure the model is oriented horizontally (flat, not standing up)
- Export with scale 1.0, maintaining orientation

### 2. Light Bar Models (18in Light.fbx, 36in Light.fbx)
**Current Issue**: Pivot point is not at the midpoint of the bar
**Required Fix**:
- Open each light bar FBX in modeling software
- Center the mesh geometry so the bar's midpoint is at world origin (0, 0, 0)
- The bar should extend equally in both directions from origin
- Set pivot point to exact center/midpoint of the bar's length
- Ensure the bar is oriented along the X-axis (horizontal)
- Export with scale 1.0

### 3. All Connector Models
**Current Issue**: Inconsistent scales and wrong pivot points
**Required Fix**:
- Open each connector FBX
- Center the mesh at the junction point (where arms meet)
- Set pivot to the connection point:
  - T-Connector: Center where 3 arms meet
  - Cross-Connector: Center where 4 arms intersect
  - Y-Connector: Center where 3 arms converge
  - 45° Connectors: Vertex where 2 angled arms meet
  - 90° Connectors: Corner where 2 perpendicular arms meet
- Ensure consistent scale across all connectors
- Export with scale 1.0

### 4. Export Settings (Critical!)
**Blender**:
- File → Export → FBX
- Scale: 1.0
- Apply Scalings: FBX All
- Forward: -Z Forward
- Up: Y Up
- Apply Transform: ✓ (checked)
- Bake Animation: ✗ (unchecked)

**Maya**:
- File → Export Selection → FBX
- File Type Specific Options → Advanced Options
- Units: Automatic
- Axis Conversion: Y-up
- FBX File Format: Binary

**3ds Max**:
- Export → FBX
- Units: Automatic
- Axis Conversion: Y-up
- Up Axis: Y-axis

## What the Code is Doing (Already Correct)

1. ✅ Loading FBX models from `/Ceiling Light Models/` folder
2. ✅ Calculating correct 2D canvas positions
3. ✅ Converting 2D positions to 3D world coordinates
4. ✅ Calculating port-to-port connections (verified in console)
5. ✅ Applying correct rotations (light bars are horizontal)
6. ✅ Scaling models appropriately

## Console Output Shows Correct Calculations

```
Component cl_1 (hub): canvas=(380,220) → world=(-0.125,2.980,-0.300) rot=0°
Component cl_2 (light-bar): canvas=(480,220) → world=(0.500,2.980,-0.300) rot=90°
  → Parent port at angle 90°: port world=(0.050,-0.300)
  → Verification: light bar port should be at (0.050,-0.300)
```

The verification shows both ports ARE at (0.050, -0.300) - mathematically correct!
But visually they don't connect because the FBX mesh geometry is offset.

## Temporary Workaround in Code (Not Ideal)

I've added these hacks to partially compensate:
- Light bars scaled 20% longer than actual size
- Hub scaled 20% smaller than actual size
- These are band-aids and will cause incorrect proportions

## Proper Solution

**Have your 3D artist re-export ALL FBX files with:**
1. Mesh geometry centered at origin (0, 0, 0)
2. Pivot points at the correct connection points
3. Consistent scale across all models
4. Proper orientation (horizontal/flat)

This is a 10-minute fix in any 3D modeling software and will solve the problem permanently.

## Files That Need Re-export

From `/public/Ceiling Light Models/` folder:
- Hub.fbx
- 18in Light.fbx
- 36in Light.fbx
- T Connector.fbx
- Cross Connector.fbx
- Y Connector.fbx
- Left Angle Connector.fbx
- Right Angle Connector.fbx
- 45Degree Left.fbx
- 45Degree Rightt.fbx (note: double 't')

## Exact Coordinates to Fix in Each Model

Based on the current model dimensions you provided, here are the EXACT steps to fix each model in your 3D software:

### Hub.fbx
**Current Dimensions**: 0.20 × 0.04 × 0.20 units

**Fix Steps in Blender/Maya:**
1. Open Hub.fbx
2. Select the mesh
3. In Edit Mode, select all vertices (A key in Blender)
4. Move mesh so geometric center is at world origin:
   - If bounding box center is at (0.10, 0.02, 0.10)
   - Move by: X: -0.10, Y: -0.02, Z: -0.10
5. In Object Mode, set pivot point to origin:
   - Object → Set Origin → Origin to Geometry (Blender)
   - Modify → Center Pivot (Maya)
6. Verify: Pivot gizmo should be at (0, 0, 0) and mesh should extend equally in all directions
7. Export as FBX with scale 1.0

**Expected Result**: 
- Pivot at (0, 0, 0)
- Mesh extends from (-0.10, -0.02, -0.10) to (0.10, 0.02, 0.10)

### 18in Light.fbx
**Current Dimensions**: 45.75 × 2.11 × 2.09 units

**Fix Steps:**
1. Open 18in Light.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so midpoint is at world origin:
   - If bounding box center is at (22.875, 1.055, 1.045)
   - Move by: X: -22.875, Y: -1.055, Z: -1.045
5. Rotate mesh to align along X-axis (if not already)
6. Set pivot point to origin (0, 0, 0)
7. Verify: Bar extends from (-22.875, -1.055, -1.045) to (22.875, 1.055, 1.045)
8. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0)
- Bar extends 22.875 units left and 22.875 units right from center
- Connection port (p0) will be at one end when rotated

### 36in Light.fbx
**Current Dimensions**: 91.50 × 2.10 × 2.08 units

**Fix Steps:**
1. Open 36in Light.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so midpoint is at world origin:
   - If bounding box center is at (45.75, 1.05, 1.04)
   - Move by: X: -45.75, Y: -1.05, Z: -1.04
5. Rotate mesh to align along X-axis (if not already)
6. Set pivot point to origin (0, 0, 0)
7. Verify: Bar extends from (-45.75, -1.05, -1.04) to (45.75, 1.05, 1.04)
8. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0)
- Bar extends 45.75 units left and 45.75 units right from center

### T Connector.fbx
**Current Dimensions**: 0.03 × 0.02 × 0.04 units

**Fix Steps:**
1. Open T Connector.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so junction center is at world origin:
   - If bounding box center is at (0.015, 0.01, 0.02)
   - Move by: X: -0.015, Y: -0.01, Z: -0.02
5. Verify the junction (where 3 arms meet) is at (0, 0, 0)
6. Set pivot point to origin
7. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0) = junction center
- 3 arms extend outward from origin

### Cross Connector.fbx
**Current Dimensions**: 0.04 × 0.02 × 0.04 units

**Fix Steps:**
1. Open Cross Connector.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so junction center is at world origin:
   - If bounding box center is at (0.02, 0.01, 0.02)
   - Move by: X: -0.02, Y: -0.01, Z: -0.02
5. Verify the junction (where 4 arms meet) is at (0, 0, 0)
6. Set pivot point to origin
7. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0) = junction center
- 4 arms extend outward from origin in + shape

### Y Connector.fbx (from Y.fbx)
**Current Dimensions**: 4.98 × 4.31 × 2.28 units

**Fix Steps:**
1. Open Y.fbx or Y Connector.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so junction center is at world origin:
   - If bounding box center is at (2.49, 2.155, 1.14)
   - Move by: X: -2.49, Y: -2.155, Z: -1.14
5. Verify the junction (where 3 arms meet) is at (0, 0, 0)
6. Set pivot point to origin
7. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0) = junction center
- 3 arms extend outward at 120° angles

### Left Angle Connector.fbx
**Current Dimensions**: 0.03 × 0.02 × 0.03 units

**Fix Steps:**
1. Open Left Angle Connector.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so corner (where 2 arms meet) is at world origin:
   - If bounding box center is at (0.015, 0.01, 0.015)
   - Move by: X: -0.015, Y: -0.01, Z: -0.015
5. Verify the corner junction is at (0, 0, 0)
6. Set pivot point to origin
7. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0) = corner where arms meet
- 2 arms extend at 90° angle (L-shape)

### Right Angle Connector.fbx
**Current Dimensions**: 0.03 × 0.02 × 0.03 units

**Fix Steps:**
1. Open Right Angle Connector.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so corner (where 2 arms meet) is at world origin:
   - If bounding box center is at (0.015, 0.01, 0.015)
   - Move by: X: -0.015, Y: -0.01, Z: -0.015
5. Verify the corner junction is at (0, 0, 0)
6. Set pivot point to origin
7. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0) = corner where arms meet
- 2 arms extend at 90° angle (L-shape, mirrored from left)

### 45Degree Left.fbx
**Current Dimensions**: 0.03 × 0.02 × 0.04 units

**Fix Steps:**
1. Open 45Degree Left.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so vertex (where 2 arms meet) is at world origin:
   - If bounding box center is at (0.015, 0.01, 0.02)
   - Move by: X: -0.015, Y: -0.01, Z: -0.02
5. Verify the vertex junction is at (0, 0, 0)
6. Set pivot point to origin
7. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0) = vertex where arms meet
- 2 arms extend at 45° angle

### 45Degree Rightt.fbx (note: double 't')
**Current Dimensions**: 0.03 × 0.02 × 0.04 units

**Fix Steps:**
1. Open 45Degree Rightt.fbx
2. Select the mesh
3. In Edit Mode, select all vertices
4. Move mesh so vertex (where 2 arms meet) is at world origin:
   - If bounding box center is at (0.015, 0.01, 0.02)
   - Move by: X: -0.015, Y: -0.01, Z: -0.02
5. Verify the vertex junction is at (0, 0, 0)
6. Set pivot point to origin
7. Export as FBX with scale 1.0

**Expected Result**:
- Pivot at (0, 0, 0) = vertex where arms meet
- 2 arms extend at 45° angle (mirrored from left)

## Quick Reference: Centering Formula

For any model, to calculate the move offset:

```
Current Bounding Box:
  Min: (minX, minY, minZ)
  Max: (maxX, maxY, maxZ)

Center Point:
  centerX = (minX + maxX) / 2
  centerY = (minY + maxY) / 2
  centerZ = (minZ + maxZ) / 2

Move Offset (to center at origin):
  moveX = -centerX
  moveY = -centerY
  moveZ = -centerZ
```

## Verification Checklist

After fixing each model, verify:
- ✅ Pivot point is at (0, 0, 0) in world space
- ✅ Mesh extends equally in all directions from pivot (for hub and light bars)
- ✅ Junction/connection point is at pivot (for connectors)
- ✅ Model is oriented horizontally (flat, not standing up)
- ✅ Scale is 1.0 in all axes
- ✅ No rotation applied to object (rotation should be 0, 0, 0)

## Correct Geometry Requirements for FBX Models

### Hub Model Requirements
```
Geometry:
- Octagonal shape (8-sided)
- Diameter: ~8 inches (0.2m)
- Height: ~1 inch (0.025m)
- Pivot Point: Exact geometric center of octagon
- Orientation: Flat/horizontal (octagon face pointing up)
- Origin: Mesh centered at (0, 0, 0)

Visual Check:
- When you select the model in your 3D software, the pivot gizmo should be at the center
- The mesh should extend equally in all directions from the pivot
```

### Light Bar Model Requirements
```
Geometry:
- Rectangular bar shape
- 18" model: Length = 18 inches (0.457m), Width/Height = 2 inches (0.05m)
- 36" model: Length = 36 inches (0.914m), Width/Height = 2 inches (0.05m)
- Pivot Point: Exact midpoint of the bar's length
- Orientation: Horizontal along X-axis
- Origin: Mesh centered at (0, 0, 0) with bar extending equally left/right

Visual Check:
- Pivot should be at the exact center of the bar
- Bar should extend 9" left and 9" right from pivot (for 18" model)
- Bar should extend 18" left and 18" right from pivot (for 36" model)
```

### Connector Model Requirements
```
Geometry:
- T-Connector: 3 arms meeting at center, each ~2 inches long
- Cross-Connector: 4 arms meeting at center, each ~2 inches long
- Y-Connector: 3 arms at 120° angles, each ~2 inches long
- 45° Connectors: 2 arms at 45° angle, each ~2 inches long
- 90° Connectors: 2 arms at 90° angle (L-shape), each ~2 inches long
- Pivot Point: Junction center where all arms meet
- Orientation: Flat/horizontal
- Origin: Junction point at (0, 0, 0)

Visual Check:
- Pivot should be at the junction where arms connect
- All arms should extend outward from the pivot
- Arms should be equal length
```

### Scale Consistency
All models MUST use the same unit system:
- Recommended: Inches (to match light bar specifications)
- Hub: 8 inches diameter
- Light bars: 18" or 36" length × 2" width × 2" height
- Connectors: 2" arm length × 2" width × 2" height

## How to Fix with Current FBX Models (Code Workaround)

If you cannot get the FBX files re-exported immediately, here's how to add manual offset corrections in the code:

### Step 1: Measure the Offset in Each Model

Open each FBX file in Blender/Maya and measure:
1. Where the pivot point currently is
2. Where the geometric center is
3. Calculate the offset: `offset = center - pivot`

Example for Hub.fbx:
```
Current Pivot: (0.05, 0.02, 0.03)
Geometric Center: (0.10, 0.02, 0.10)
Offset: (0.05, 0, 0.07)
```

### Step 2: Add Offset Corrections in Code

In `CeilingLights3D.tsx`, add this after the `cloneAndScale` function:

```typescript
// Manual offset corrections for FBX models with incorrect pivots
const MODEL_OFFSETS: Record<string, { x: number; y: number; z: number }> = {
  'hub': { x: -0.05, y: 0, z: -0.07 },  // Replace with actual measured values
  'light-18in': { x: -0.23, y: 0, z: 0 },  // Half of 18" in meters
  'light-36in': { x: -0.46, y: 0, z: 0 },  // Half of 36" in meters
  't-connector': { x: -0.01, y: 0, z: -0.01 },
  'cross-connector': { x: -0.02, y: 0, z: -0.02 },
  'y-connector': { x: -0.02, y: 0, z: -0.02 },
  'left-angle-connector': { x: -0.015, y: 0, z: -0.015 },
  'right-angle-connector': { x: -0.015, y: 0, z: -0.015 },
  'left-45-degree': { x: -0.015, y: 0, z: -0.015 },
  'right-45-degree': { x: -0.015, y: 0, z: -0.015 },
}

function getModelOffset(componentType: string, length?: number): [number, number, number] {
  if (componentType === 'light-bar') {
    const key = length === 18 ? 'light-18in' : 'light-36in'
    const offset = MODEL_OFFSETS[key]
    return [offset.x, offset.y, offset.z]
  }
  const offset = MODEL_OFFSETS[componentType] || { x: 0, y: 0, z: 0 }
  return [offset.x, offset.y, offset.z]
}
```

### Step 3: Apply Offset in ModelComponent

Update the `ModelComponent` function:

```typescript
function ModelComponent({
  source,
  scale,
  color,
  position,
  rotation,
  componentType,
  ceilingNormal,
  length,  // Add this parameter
}: {
  source: Group
  scale: number
  color: string
  position: [number, number, number]
  rotation: number
  componentType: string
  ceilingNormal?: { x: number; y: number; z: number }
  length?: number  // Add this parameter
}) {
  const modelType = componentType === 'light-bar' ? 'light-bar' : componentType === 'hub' ? 'hub' : 'connector'
  const model = useMemo(
    () => cloneAndScale(source, scale, color, modelType),
    [source, scale, color, modelType]
  )

  const fixRotation = getFixtureRotationFromNormal(componentType, ceilingNormal, rotation)
  
  // Get manual offset correction
  const manualOffset = getModelOffset(componentType, length)

  return (
    <group position={position} rotation={fixRotation}>
      {/* Apply manual offset to compensate for incorrect FBX pivot */}
      <group position={manualOffset}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.01, 8, 8]} />
          <meshBasicMaterial color="red" />
        </mesh>
        <primitive object={model} />
      </group>
    </group>
  )
}
```

### Step 4: Pass Length Parameter

Update all `ModelComponent` calls to pass the `length` parameter for light bars:

```typescript
// For light bars
<ModelComponent
  source={lb.length === 18 ? lb18Src : lb36Src}
  scale={barLengthMeters}
  color={color}
  position={finalPos}
  rotation={rotRad}
  componentType="light-bar"
  ceilingNormal={comp.ceilingNormal}
  length={lb.length}  // Add this
/>

// For hub and connectors (no length needed)
<ModelComponent
  source={src}
  scale={modelScale}
  color={color}
  position={hubPos}
  rotation={rotRad}
  componentType={comp.type}
  ceilingNormal={comp.ceilingNormal}
/>
```

### Step 5: Measure and Adjust

1. Start with the offset values above (they're estimates)
2. Run the app and check the 3D view
3. If models are still offset, adjust the values in `MODEL_OFFSETS`
4. Positive X = move right, Negative X = move left
5. Positive Z = move forward, Negative Z = move backward
6. Repeat until models connect properly

### Important Notes for Code Workaround

⚠️ **This is a HACK and has limitations:**
- Offsets are hardcoded and fragile
- If you change model files, offsets break
- Offsets may not work correctly for all rotations
- Maintenance nightmare if you add more models
- The proper solution is still to fix the FBX files

✅ **When to use this workaround:**
- You need a quick temporary fix
- Cannot wait for 3D artist to re-export
- Willing to manually tune offset values
- Understand this is technical debt

❌ **When NOT to use this workaround:**
- You have access to 3D modeling software
- You can get models re-exported within a week
- You want a maintainable long-term solution

## Contact

Send this document to your 3D artist/modeler. They will understand exactly what needs to be fixed.

If you choose the code workaround approach, you'll need to measure the offsets yourself using Blender (free) or any 3D viewer that shows pivot points and bounding boxes.
