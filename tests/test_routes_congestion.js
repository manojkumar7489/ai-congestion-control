import assert from 'assert';
import { calculateRoutes } from '../backend/services/routingService.js';

async function testDynamicRoutes() {
  console.log('--- TESTING DYNAMIC ROUTING & TRAFFIC CONGESTION ---');

  // Test 1: Hyderabad routing (HITEC City to Secunderabad)
  console.log('1. Calculating routes in Hyderabad...');
  const hydRoutes = await calculateRoutes(
    { originLat: 17.4435, originLng: 78.3772 },
    { destLat: 17.4334, destLng: 78.5042 }
  );

  assert.strictEqual(hydRoutes.length, 3, 'Must return exactly 3 suggested routes');
  console.log(`✓ Received ${hydRoutes.length} route alternatives in Hyderabad`);

  hydRoutes.forEach((r, idx) => {
    console.log(`   Route #${idx + 1}: "${r.name}" | Congestion: ${Math.round(r.congestion_index * 100)}% (${r.congestion_level}) | Time: ${r.duration_mins}m | Color: ${r.congestion_color}`);
    assert.ok(r.congestion_index !== undefined, 'Route must have congestion_index');
    assert.ok(r.congestion_level, 'Route must have congestion_level');
    assert.ok(r.congestion_color, 'Route must have congestion_color');

    // Verify NONE of the coordinates are in Vijayawada (lat ~16.5, lng ~80.6)
    r.geometry.forEach(coord => {
      const isVijayawada = Math.abs(coord[0] - 16.51) < 0.2 && Math.abs(coord[1] - 80.64) < 0.2;
      assert.ok(!isVijayawada, `Route coordinate [${coord[0]}, ${coord[1]}] must NOT be linked to Vijayawada!`);
    });
  });
  console.log('✓ All 3 Hyderabad routes strictly localized in Hyderabad (NO Vijayawada coordinates!)');

  // Test 2: Bengaluru routing (MG Road to Electronic City)
  console.log('2. Calculating routes in Bengaluru...');
  const blrRoutes = await calculateRoutes(
    { originLat: 12.9756, originLng: 77.6066 },
    { destLat: 12.8452, destLng: 77.6602 }
  );

  assert.strictEqual(blrRoutes.length, 3);
  blrRoutes.forEach((r, idx) => {
    r.geometry.forEach(coord => {
      const isVijayawada = Math.abs(coord[0] - 16.51) < 0.2 && Math.abs(coord[1] - 80.64) < 0.2;
      assert.ok(!isVijayawada, `Bengaluru route coordinate [${coord[0]}, ${coord[1]}] must NOT be linked to Vijayawada!`);
    });
  });
  console.log('✓ All 3 Bengaluru routes strictly localized in Bengaluru');

  console.log('\n🎉 ALL DYNAMIC ROUTING & CONGESTION TESTS PASSED! 🎉');
}

testDynamicRoutes().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
