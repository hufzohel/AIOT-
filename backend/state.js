// state.js
const data = require("./data_raw.json");

// Parse deep copies so we can mutate them safely
let devices = JSON.parse(JSON.stringify(data.devices));
let systemLogs = JSON.parse(JSON.stringify(data.systemLogs));

module.exports = {
  data,
  devices,
  systemLogs
};