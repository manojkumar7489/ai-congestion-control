/**
 * SmartRoute AI - Backend Integration Test Suite
 * Native Node.js test runner (zero external dependencies)
 */
import assert from 'assert';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function runTests() {
  console.log(`Running SmartRoute AI backend integration tests against ${BASE_URL}...`);

  // 1. Health check
  console.log('1. Testing /health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(healthRes.status, 200);
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'healthy');
  console.log('✓ /health OK');

  // 2. Geocoding search
  console.log('2. Testing /api/geocoding/search...');
  const geoRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Benz+Circle`);
  assert.strictEqual(geoRes.status, 200);
  const geoData = await geoRes.json();
  assert.strictEqual(geoData.success, true);
  assert.ok(geoData.results.length > 0);
  console.log(`✓ /api/geocoding/search OK (${geoData.results.length} locations found)`);

  // 3. User Registration & Login
  console.log('3. Testing /api/auth/register & /api/auth/login...');
  const testEmail = `judge_${Date.now()}@smartroute.ai`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Techthon Evaluator',
      email: testEmail,
      password: 'SecurePassword123!',
      preferredVehicle: 'compact'
    })
  });
  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  assert.ok(regData.token, 'Registration should return JWT token');
  const token = regData.token;

  // Me route with token
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, testEmail);
  console.log('✓ Authentication flow OK (JWT token verified)');

  // 4. Route Calculation & Multi-Criteria Optimization
  console.log('4. Testing /api/routes/alternatives...');
  const routeRes = await fetch(`${BASE_URL}/api/routes/alternatives`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      origin: { name: 'PNBS', lat: 16.5117, lng: 80.6186 },
      destination: { name: 'Benz Circle', lat: 16.5015, lng: 80.6508 },
      vehicleType: 'sedan'
    })
  });
  assert.strictEqual(routeRes.status, 200);
  const routeData = await routeRes.json();
  assert.strictEqual(routeData.success, true);
  assert.ok(routeData.data.routes.length > 0, 'Should return multiple route candidates');
  assert.ok(routeData.data.routes[0].is_recommended, 'First ranked route should be recommended');
  assert.ok(routeData.data.routes[0].recommendation_explanation, 'Route explanation should be present');
  console.log(`✓ /api/routes/alternatives OK (${routeData.data.routes.length} candidate corridors evaluated)`);

  // 5. Traffic Telemetry & Forecast
  console.log('5. Testing /api/traffic/current & /api/traffic/forecast...');
  const trafficRes = await fetch(`${BASE_URL}/api/traffic/current`);
  assert.strictEqual(trafficRes.status, 200);
  const trafficData = await trafficRes.json();
  assert.strictEqual(trafficData.success, true);
  assert.ok(trafficData.data_mode, 'Data mode label must be present');

  const fcRes = await fetch(`${BASE_URL}/api/traffic/forecast`);
  assert.strictEqual(fcRes.status, 200);
  const fcData = await fcRes.json();
  assert.ok(fcData.forecast['15m'], '15 minute horizon prediction must exist');
  console.log('✓ Traffic telemetry & 60m forecast OK');

  // 6. Coordinated Traffic Simulation
  console.log('6. Testing /api/simulation/run...');
  const simRes = await fetch(`${BASE_URL}/api/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleCount: 300, scenario: 'rush_hour' })
  });
  assert.strictEqual(simRes.status, 200);
  const simData = await simRes.json();
  assert.strictEqual(simData.success, true);
  assert.ok(simData.data.mode_a_independent, 'Mode A results present');
  assert.ok(simData.data.mode_b_coordinated, 'Mode B results present');
  assert.ok(simData.data.impact_comparison, 'Impact metrics present');
  console.log(`✓ Coordinated simulation OK (-${simData.data.impact_comparison.travel_time_improvement_pct}% travel time reduction)`);

  // 7. Admin System Status
  console.log('7. Testing /api/admin/system-status...');
  const adminRes = await fetch(`${BASE_URL}/api/admin/system-status`);
  assert.strictEqual(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.strictEqual(adminData.system_health, 'OPERATIONAL');
  assert.ok(adminData.services.backend);
  assert.ok(adminData.services.database);
  console.log('✓ Admin system diagnostics OK');

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch(err => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
