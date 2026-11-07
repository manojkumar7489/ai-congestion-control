import { callAISimulation } from '../services/aiServiceBridge.js';
import { SimulationResult } from '../models/TrafficModels.js';

let latestSimulation = null;

export const runSimulation = async (req, res) => {
  try {
    const { vehicleCount = 300, scenario = 'rush_hour' } = req.body;
    const simResult = await callAISimulation(vehicleCount, scenario);

    latestSimulation = {
      ...simResult.data,
      executed_at: new Date().toISOString()
    };

    try {
      await SimulationResult.create({
        vehicleCount,
        scenario,
        modeA: simResult.data.mode_a_independent,
        modeB: simResult.data.mode_b_coordinated,
        impact: simResult.data.impact_comparison,
        timestamp: new Date()
      });
    } catch (e) {}

    res.json({
      success: true,
      data: latestSimulation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSimulationResults = async (req, res) => {
  try {
    if (!latestSimulation) {
      // Execute initial baseline simulation
      const initial = await callAISimulation(300, 'rush_hour');
      latestSimulation = {
        ...initial.data,
        executed_at: new Date().toISOString()
      };
    }
    res.json({
      success: true,
      data: latestSimulation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
