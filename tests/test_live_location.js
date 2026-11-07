/**
 * Verification test for Live Location and Geocoding
 */
import assert from 'assert';
import { reverseGeocode, searchLocations } from '../backend/services/geocodingService.js';

async function runTests() {
  console.log('--- TESTING LIVE USER LOCATION & REVERSE GEOCODING ---');

  // Test 1: Real-world GPS coordinates far from PNBS (e.g. Hyderabad Hitec City: 17.4435, 78.3772)
  console.log('1. Testing reverse geocoding for external coordinates...');
  const externalResult = await reverseGeocode(17.4435, 78.3772);
  console.log('   Result:', externalResult);
  assert(externalResult.lat === 17.4435, 'Latitude must match input');
  assert(externalResult.lng === 78.3772, 'Longitude must match input');
  assert(
    !externalResult.name.includes('Pandit Nehru Bus Station'),
    'External location MUST NOT be overwritten with Pandit Nehru Bus Station fallback!'
  );
  console.log('✓ External coordinates preserved without false landmark attribution');

  // Test 2: Coordinates near Vijayawada Junction Railway Station (16.5183, 80.6200)
  console.log('2. Testing reverse geocoding for known landmark POI...');
  const stationResult = await reverseGeocode(16.5185, 80.6202);
  console.log('   Result:', stationResult);
  assert(stationResult.name.includes('Vijayawada Junction Railway Station'), 'Must identify nearby POI');
  console.log('✓ Nearby POI successfully recognized');

  // Test 3: Coordinates near Benz Circle (16.5015, 80.6508)
  console.log('3. Testing reverse geocoding near Benz Circle...');
  const benzResult = await reverseGeocode(16.5016, 80.6507);
  console.log('   Result:', benzResult);
  assert(benzResult.name.includes('Benz Circle'), 'Must identify Benz Circle');
  console.log('✓ Benz Circle recognized');

  // Test 4: Coordinate-based fallback format
  console.log('4. Testing coordinate string formatting...');
  const bangaloreResult = await reverseGeocode(12.9716, 77.5946);
  console.log('   Result:', bangaloreResult);
  assert(bangaloreResult.lat === 12.9716, 'Latitude must match');
  assert(bangaloreResult.lng === 77.5946, 'Longitude must match');
  assert(!bangaloreResult.name.includes('PNBS'), 'Must not default to PNBS');
  console.log('✓ Coordinate fallback formatting verified');

  console.log('\n🎉 ALL LIVE LOCATION & GEOCODING TESTS PASSED! 🎉');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
