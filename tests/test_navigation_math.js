/**
 * SmartRoute AI - Navigation Math Unit Test Suite
 * Validates off-route threshold detection, turn-by-turn instruction matching,
 * and remaining distance calculations.
 */
import assert from 'assert';
import {
  getDistanceMeters,
  getBearingDegrees,
  findNearestPointOnRoute,
  calculateRemainingRouteDistance,
  getUpcomingManeuver
} from '../frontend/src/utils/navigationMath.js';

console.log('--- TESTING NAVIGATION & GPS GEOMETRY MATH ---');

// 1. Haversine distance test
console.log('1. Testing getDistanceMeters...');
const d1 = getDistanceMeters(16.5117, 80.6186, 16.5015, 80.6508);
assert.ok(d1 > 3500 && d1 < 4200, `Distance should be ~3.8km, got ${d1}`);
console.log(`✓ getDistanceMeters OK (${Math.round(d1)} meters)`);

// 2. Bearing calculation test
console.log('2. Testing getBearingDegrees...');
// Going due east (same lat, greater lon) should be ~90 degrees
const bearingEast = getBearingDegrees(16.5000, 80.6000, 16.5000, 80.7000);
assert.ok(Math.abs(bearingEast - 90) < 2, `East bearing should be ~90 deg, got ${bearingEast}`);
console.log(`✓ getBearingDegrees OK (${Math.round(bearingEast)}°)`);

// 3. Nearest point on route & Off-Route detection
console.log('3. Testing findNearestPointOnRoute & Off-Route threshold (65m)...');
const sampleRoute = [
  [16.5117, 80.6186], // PNBS
  [16.5125, 80.6280], // PCR Junction
  [16.5060, 80.6420], // Labbipet
  [16.5015, 80.6508]  // Benz Circle
];

// Point 1: Directly on the road between PNBS and PCR (~10 meters away)
const onRouteUser = [16.5120, 80.6230];
const nearRes1 = findNearestPointOnRoute(onRouteUser, sampleRoute);
assert.ok(nearRes1.distanceMeters < 50, `User on corridor should have small distance, got ${nearRes1.distanceMeters}m`);
assert.strictEqual(nearRes1.distanceMeters > 65, false, 'User within 50m must NOT be flagged as off-route');
console.log(`✓ On-route detection OK (User is ${nearRes1.distanceMeters}m from centerline)`);

// Point 2: Diverted 500m north into Governorpet alleyway (Off-route)
const offRouteUser = [16.5180, 80.6230];
const nearRes2 = findNearestPointOnRoute(offRouteUser, sampleRoute);
assert.ok(nearRes2.distanceMeters > 65, `Deviated user should exceed 65m threshold, got ${nearRes2.distanceMeters}m`);
console.log(`✓ Off-route detection OK (User deviated by ${nearRes2.distanceMeters}m -> Trigger Off-Route Alert)`);

// 4. Remaining distance test
console.log('4. Testing calculateRemainingRouteDistance...');
const remaining1 = calculateRemainingRouteDistance(onRouteUser, sampleRoute, 0);
assert.ok(remaining1 > 2800 && remaining1 < 3600, `Remaining distance should be ~3.2km, got ${remaining1}`);
console.log(`✓ calculateRemainingRouteDistance OK (${remaining1} meters remaining)`);

// 5. Upcoming maneuver matching
console.log('5. Testing getUpcomingManeuver...');
const sampleSteps = [
  { instruction: 'Head east on Krishna River Road', location: [16.5120, 80.6210], modifier: 'straight' },
  { instruction: 'Turn right onto Bandar Road (MG Road)', location: [16.5125, 80.6280], modifier: 'right' },
  { instruction: 'Proceed through Benz Circle', location: [16.5015, 80.6508], modifier: 'straight' }
];

const maneuverRes = getUpcomingManeuver([16.5117, 80.6186], sampleSteps, remaining1);
assert.ok(maneuverRes.currentStep);
assert.ok(maneuverRes.distanceToTurnMeters > 0);
console.log(`✓ getUpcomingManeuver OK (Next turn: "${maneuverRes.currentStep.instruction}" in ${maneuverRes.distanceToTurnMeters}m)`);

console.log('\n🎉 ALL NAVIGATION MATH UNIT TESTS PASSED! 🎉\n');
