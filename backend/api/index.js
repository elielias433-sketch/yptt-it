/**
 * Vercel serverless adapter for the YPTT TI Tracker Express gateway.
 * Exports the Express app as a serverless function handler.
 */

const { buildApp } = require('../src/server');

const app = buildApp();

module.exports = (req, res) => app(req, res);
