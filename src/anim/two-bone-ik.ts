// Two-bone IK — the difference between an arm reaching toward a surface and a
// hand gripping a specific point on it.
//
// Written to survive an arbitrary rig. Meshy's bones do not agree with anyone's
// axis convention, so nothing here assumes one: every rotation is derived from
// where a bone's CHILD actually is versus where it should be, converted back
// into the bone's parent space. A rig whose bones point down -Y works the same
// as one pointing +X.
import * as THREE from "three";

const _boneW = new THREE.Vector3();
const _childW = new THREE.Vector3();
const _cur = new THREE.Vector3();
const _want = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();
const _boneQ = new THREE.Quaternion();

/** Rotate `bone` so that `child` ends up pointing at `target` (all world space). */
function aimAt(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3): void {
  bone.getWorldPosition(_boneW);
  child.getWorldPosition(_childW);
  _cur.subVectors(_childW, _boneW);
  _want.subVectors(target, _boneW);
  if (_cur.lengthSq() < 1e-8 || _want.lengthSq() < 1e-8) return;
  _cur.normalize();
  _want.normalize();
  _q.setFromUnitVectors(_cur, _want);              // world-space delta

  bone.getWorldQuaternion(_boneQ);
  _q.multiply(_boneQ);                             // desired world orientation
  if (bone.parent) {
    bone.parent.getWorldQuaternion(_parentQ);
    _q.premultiply(_parentQ.invert());             // back into parent space
  }
  bone.quaternion.copy(_q);
  bone.updateMatrixWorld(true);
}

const _shoulder = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _toTarget = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _bent = new THREE.Vector3();
const _bendQ = new THREE.Quaternion();

/**
 * Put `hand` on `target` by bending a shoulder→elbow→hand chain.
 *
 * `poleHint` decides which way the elbow breaks — without it the solver is free
 * to fold the arm through the body, which is the classic IK tell.
 */
export function solveTwoBone(
  upper: THREE.Object3D,
  lower: THREE.Object3D,
  hand: THREE.Object3D,
  target: THREE.Vector3,
  poleHint: THREE.Vector3,
): void {
  upper.getWorldPosition(_shoulder);
  lower.getWorldPosition(_elbow);
  hand.getWorldPosition(_hand);

  const l1 = _shoulder.distanceTo(_elbow);
  const l2 = _elbow.distanceTo(_hand);
  if (l1 < 1e-4 || l2 < 1e-4) return;

  _toTarget.subVectors(target, _shoulder);
  const reach = l1 + l2;
  // clamp inside the reachable shell — at full extension the solver is singular,
  // and past it there is no answer at all
  const d = THREE.MathUtils.clamp(_toTarget.length(), Math.abs(l1 - l2) + 1e-3, reach - 1e-3);
  if (_toTarget.lengthSq() < 1e-8) return;
  _toTarget.normalize();

  // law of cosines: how far off the straight line the elbow sits
  const cosShoulder = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const shoulderAngle = Math.acos(cosShoulder);

  // bend plane: perpendicular to the reach direction, leaning toward the hint
  _pole.copy(poleHint).sub(_shoulder);
  _axis.crossVectors(_toTarget, _pole);
  if (_axis.lengthSq() < 1e-8) {
    // degenerate hint (pole on the reach line) — any perpendicular will do
    _axis.set(_toTarget.y, -_toTarget.x, 0);
    if (_axis.lengthSq() < 1e-8) _axis.set(0, 0, 1);
  }
  _axis.normalize();

  // where the elbow WANTS to be, then aim the two bones through it
  _bent.copy(_toTarget).multiplyScalar(l1)
    .applyQuaternion(_bendQ.setFromAxisAngle(_axis, shoulderAngle))
    .add(_shoulder);

  aimAt(upper, lower, _bent);
  aimAt(lower, hand, target);
}

/** Find the shoulder/elbow/hand chain on a humanoid rig by name, tolerantly. */
export function findArm(root: THREE.Object3D, side: "l" | "r"): {
  upper: THREE.Object3D; lower: THREE.Object3D; hand: THREE.Object3D;
} | null {
  const sideRe = side === "l" ? /(^|[^a-z])l(eft)?([^a-z]|$)/i : /(^|[^a-z])r(ight)?([^a-z]|$)/i;
  let upper: THREE.Object3D | null = null;
  let lower: THREE.Object3D | null = null;
  let hand: THREE.Object3D | null = null;
  root.traverse((o) => {
    const n = o.name;
    if (!sideRe.test(n)) return;
    const l = n.toLowerCase();
    if (!upper && /upperarm|upper_arm|shoulder|arm(?!.*fore)/.test(l) && !/fore|hand/.test(l)) upper = o;
    else if (!lower && /forearm|fore_arm|lowerarm|elbow/.test(l)) lower = o;
    else if (!hand && /hand|wrist/.test(l)) hand = o;
  });
  // a chain is only usable if all three exist AND are actually nested
  if (!upper || !lower || !hand) return null;
  return { upper, lower, hand };
}
