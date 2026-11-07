import assert from 'assert';

process.env.PORT = '5002';

async function run() {
  console.log('--- STARTING SMARTROUTE AI IN-PROCESS INTEGRATION TEST ---');
  // Dynamically import server
  const serverModule = await import('../backend/server.js');

  // Allow server to connect to MongoDB and start listening
  const BASE_URL = 'http://127.0.0.1:5002';
  let serverReady = false;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      await new Promise(r => setTimeout(r, 600));
      const res = await fetch(`${BASE_URL}/health`);
      if (res.status === 200) {
        serverReady = true;
        break;
      }
    } catch (e) {}
  }
  assert.ok(serverReady, 'Server must start listening on port 5002 within 6 seconds');

  // 1. Health
  console.log('1. Probing /health...');
  const hRes = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(hRes.status, 200);
  const hData = await hRes.json();
  assert.strictEqual(hData.status, 'healthy');
  console.log('✓ /health OK:', hData.name);

  // 2. Geocoding
  console.log('2. Probing /api/geocoding/search, /reverse, /ip-location...');
  const gRes = await fetch(`${BASE_URL}/api/geocoding/search?q=Benz+Circle`);
  assert.strictEqual(gRes.status, 200);
  const gData = await gRes.json();
  assert.ok(gData.results.length > 0);
  console.log(`✓ Geocoding search OK (${gData.results[0].name})`);

  // Reverse Geocoding
  const revRes = await fetch(`${BASE_URL}/api/geocoding/reverse?lat=17.4435&lng=78.3772`);
  assert.strictEqual(revRes.status, 200);
  const revData = await revRes.json();
  assert.strictEqual(revData.success, true);
  assert.strictEqual(revData.result.lat, 17.4435);
  assert.ok(!revData.result.name.includes('Pandit Nehru Bus Station'));
  console.log(`✓ Reverse geocode preserved user coordinates: (${revData.result.name})`);

  // IP Location
  const ipRes = await fetch(`${BASE_URL}/api/geocoding/ip-location`);
  assert.strictEqual(ipRes.status, 200);
  const ipData = await ipRes.json();
  assert.strictEqual(ipData.success, true);
  assert.ok(ipData.location && ipData.location.lat);
  console.log(`✓ IP location fallback OK: (${ipData.location.name})`);

  // 3. User Registration & Login
  console.log('3. Probing /api/auth/register...');
  const testEmail = `techthon_eval_${Date.now()}@smartroute.ai`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Techthon Evaluator',
      email: testEmail,
      password: 'SecurePassword2026!',
      preferredVehicle: 'sedan'
    })
  });
  assert.strictEqual(regRes.status, 201);
  const regData = await regRes.json();
  assert.ok(regData.token);
  const token = regData.token;
  console.log('✓ Registration & JWT token creation OK');

  // 4. Protected /api/auth/me
  console.log('4. Probing /api/auth/me with Bearer token...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(meRes.status, 200);
  const meData = await meRes.json();
  assert.strictEqual(meData.user.email, testEmail);
  console.log('✓ Protected auth route OK');

  // 5. Multi-Criteria Route Optimization & Navigation Turn-by-Turn Steps
  console.log('5. Probing /api/routes/alternatives...');
  const routeRes = await fetch(`${BASE_URL}/api/routes/alternatives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      origin: { name: 'PNBS', lat: 16.5117, lng: 80.6186 },
      destination: { name: 'Ramavarappadu', lat: 16.5255, lng: 80.6720 },
      vehicleType: 'compact'
    })
  });
  assert.strictEqual(routeRes.status, 200);
  const routeData = await routeRes.json();
  assert.ok(routeData.data.routes.length >= 2, 'Must return multiple route alternatives');
  assert.ok(routeData.data.routes[0].is_recommended);
  assert.ok(routeData.data.routes[0].recommendation_explanation);
  assert.ok(routeData.data.routes[0].fuel_liters > 0);
  assert.ok(Array.isArray(routeData.data.routes[0].steps), 'Route must include turn-by-turn navigation steps');
  assert.ok(routeData.data.routes[0].steps.length > 0, 'Steps array must not be empty');
  assert.ok(routeData.data.routes[0].steps[0].instruction, 'Step must contain readable maneuver instruction');
  console.log(`✓ Smart route ranking & turn-by-turn navigation steps OK (${routeData.data.routes[0].steps.length} steps in route #1)`);
  console.log('   Top Route:', routeData.data.routes[0].name, '| Score:', routeData.data.routes[0].score);
  console.log('   First Maneuver:', routeData.data.routes[0].steps[0].instruction);

  // 6. Complete Ride Summary & MongoDB Persistence (Feature 3 Verification)
  console.log('6. Testing completed ride save and MongoDB retrieval (/api/routes/save-journey & /api/routes/journeys)...');
  const saveRideRes = await fetch(`${BASE_URL}/api/routes/save-journey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      originName: 'Pandit Nehru Bus Station (PNBS)',
      originCoords: [16.5117, 80.6186],
      destinationName: 'Ramavarappadu Ring',
      destinationCoords: [16.5255, 80.6720],
      vehicleType: 'compact',
      chosenRouteName: routeData.data.routes[0].name,
      plannedDistanceKm: routeData.data.routes[0].distance_km,
      actualDistanceKm: 7.42,
      durationMins: 14.5,
      rideDurationSecs: 870,
      fuelLiters: 0.48,
      fuelSavedLiters: 0.22,
      timeSavedMins: 6.0,
      averageSpeedKmh: 31,
      score: routeData.data.routes[0].score,
      rideStatus: 'COMPLETED'
    })
  });
  assert.strictEqual(saveRideRes.status, 200);
  const saveRideData = await saveRideRes.json();
  assert.strictEqual(saveRideData.success, true);
  assert.strictEqual(saveRideData.journey.rideStatus, 'COMPLETED');
  assert.strictEqual(saveRideData.journey.actualDistanceKm, 7.42);

  const getJourneysRes = await fetch(`${BASE_URL}/api/routes/journeys`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(getJourneysRes.status, 200);
  const getJourneysData = await getJourneysRes.json();
  assert.strictEqual(getJourneysData.success, true);
  assert.ok(getJourneysData.journeys.length > 0, 'Journeys list should return saved ride');
  console.log(`✓ Ride summary successfully persisted and verified in database (${getJourneysData.journeys[0].actualDistanceKm} km actual distance, ${getJourneysData.journeys[0].fuelSavedLiters} L saved)`);

  // 7. Traffic Telemetry & Forecast
  console.log('7. Probing /api/traffic/current & /api/traffic/status...');
  const tRes = await fetch(`${BASE_URL}/api/traffic/current`);
  assert.strictEqual(tRes.status, 200);
  const tData = await tRes.json();
  assert.ok(tData.data_mode);
  assert.ok(tData.overview.average_congestion_index >= 0);
  console.log(`✓ Traffic telemetry OK (Mode: ${tData.data_mode}, Health: ${tData.overview.road_network_health})`);

  // 8. Coordinated Simulation
  console.log('8. Probing /api/simulation/run...');
  const simRes = await fetch(`${BASE_URL}/api/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleCount: 300, scenario: 'rush_hour' })
  });
  assert.strictEqual(simRes.status, 200);
  const simData = await simRes.json();
  assert.ok(simData.data.mode_a_independent);
  assert.ok(simData.data.mode_b_coordinated);
  assert.ok(simData.data.impact_comparison.travel_time_improvement_pct >= 0);
  console.log(`✓ Coordinated simulation OK (${simData.data.impact_comparison.conclusion})`);

  // 9. Admin Diagnostics
  console.log('9. Probing /api/admin/system-status...');
  const admRes = await fetch(`${BASE_URL}/api/admin/system-status`);
  assert.strictEqual(admRes.status, 200);
  const admData = await admRes.json();
  assert.strictEqual(admData.system_health, 'OPERATIONAL');
  assert.strictEqual(admData.services.backend.status, 'ONLINE');
  console.log('✓ Admin system status OK');

  console.log('\n======================================================');
  console.log('  ALL BACKEND INTEGRATION ENDPOINTS TESTED & PASSED!  ');
  console.log('======================================================\n');
  process.exit(0);
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
