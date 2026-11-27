import * as THREE from 'three';

// Units: 1 = 12.375 in, the width of an LP jacket.
export const JACKET = { size: 1, depth: 0.012, corner: 0.006 };
export const SLEEVE = { size: 0.965, hole: 0.15 };
export const DISC = { radius: 0.485, half: 0.0036, hole: 0.0115, label: 0.16, grooveIn: 0.165, grooveOut: 0.478 };

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry with UVs remapped to 0–1 across the shape's bounds. */
function withUnitUVs(g: THREE.ShapeGeometry, w: number, h: number): THREE.ShapeGeometry {
  const pos = g.attributes.position!;
  const uv = g.attributes.uv!;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return g;
}

export function jacketFaceGeometry(): THREE.ShapeGeometry {
  const { size, corner } = JACKET;
  return withUnitUVs(new THREE.ShapeGeometry(roundedRectShape(size, size, corner), 6), size, size);
}

export function sleeveGeometry(): THREE.ShapeGeometry {
  const shape = roundedRectShape(SLEEVE.size, SLEEVE.size, 0.004);
  const hole = new THREE.Path();
  hole.absarc(0, 0, SLEEVE.hole, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return withUnitUVs(new THREE.ShapeGeometry(shape, 48), SLEEVE.size, SLEEVE.size);
}

/** The vinyl body: a lathed cross-section with the centre hole and a rounded edge bead. */
export function discBodyGeometry(): THREE.LatheGeometry {
  const { radius: R, half: h, hole } = DISC;
  const pts = [
    new THREE.Vector2(hole, -h),
    new THREE.Vector2(DISC.label + 0.004, -h),
    new THREE.Vector2(DISC.grooveIn, -h * 0.82),
    new THREE.Vector2(R - 0.012, -h * 0.82),
    new THREE.Vector2(R - 0.004, -h * 1.05),
    new THREE.Vector2(R, -h * 0.4),
    new THREE.Vector2(R, h * 0.4),
    new THREE.Vector2(R - 0.004, h * 1.05),
    new THREE.Vector2(R - 0.012, h * 0.82),
    new THREE.Vector2(DISC.grooveIn, h * 0.82),
    new THREE.Vector2(DISC.label + 0.004, h),
    new THREE.Vector2(hole, h),
    new THREE.Vector2(hole, -h),
  ];
  const g = new THREE.LatheGeometry(pts, 128);
  g.rotateX(Math.PI / 2); // lathe axis Y -> Z, so the record faces the camera
  return g;
}
