// cubeLogic.js

export const SOLVED_STATE = [
  2, 2, 2, 2, 2, 2, 2, 2, 2, 
  5, 5, 5, 4, 4, 4, 0, 0, 0, 
  3, 3, 3, 5, 5, 5, 4, 4, 4, 
  0, 0, 0, 3, 3, 3, 5, 5, 5, 
  4, 4, 4, 0, 0, 0, 3, 3, 3, 
  1, 1, 1, 1, 1, 1, 1, 1, 1
];

// Use WS protocol for WebSockets, port 81 is standard for ESP32 WebSocketsServer
const ESP32_WS_URL = "ws://192.168.68.112:81"; 
let espSocket = null;

export const initWebSocket = () => {
  espSocket = new WebSocket(ESP32_WS_URL);
  
  espSocket.onopen = () => console.log("🟢 Connected to ESP32 Cube!");
  espSocket.onclose = () => {
      console.log("🔴 Disconnected. Retrying in 2s...");
      setTimeout(initWebSocket, 2000);
  };
  espSocket.onerror = (err) => console.error("WebSocket Error:", err);
};

export const sendStateToESP32 = (stateArray) => {
  if (espSocket && espSocket.readyState === WebSocket.OPEN) {
      const payload = {
          command: "UPDATE",
          state: stateArray
      };
      espSocket.send(JSON.stringify(payload));
  } else {
      console.warn("WebSocket not connected. State not sent.");
  }
};

// Master rotation controller remains exactly as you wrote it
export const calculateNewState = (currentState, action) => {
  let newState = [...currentState];

  switch(action) {
    case 'BLUE_CW':
      newState[51] = currentState[53]; newState[50] = currentState[52];
      newState[45] = currentState[51]; newState[46] = currentState[50];
      newState[47] = currentState[45]; newState[48] = currentState[46];
      newState[53] = currentState[47]; newState[52] = currentState[48];
      
      newState[35] = currentState[44]; newState[36] = currentState[33];
      newState[37] = currentState[34]; newState[38] = currentState[35];
      newState[39] = currentState[36]; newState[40] = currentState[37];
      newState[41] = currentState[38]; newState[42] = currentState[39];
      newState[43] = currentState[40]; newState[44] = currentState[41];
      newState[33] = currentState[42]; newState[34] = currentState[43];
      break;

    case 'BLUE_CCW':
      newState[51] = currentState[45]; newState[52] = currentState[50]; newState[53] = currentState[51];
      newState[48] = currentState[52]; newState[47] = currentState[53]; newState[46] = currentState[48];
      newState[45] = currentState[47]; newState[50] = currentState[46];
      
      newState[41] = currentState[44]; newState[40] = currentState[43]; newState[39] = currentState[42];
      newState[38] = currentState[41]; newState[37] = currentState[40]; newState[36] = currentState[39];
      newState[35] = currentState[38]; newState[34] = currentState[37]; newState[33] = currentState[36];
      newState[44] = currentState[35]; newState[43] = currentState[34]; newState[42] = currentState[33];
      break;

    case 'WHITE_CW':
      newState[42] = currentState[44]; newState[30] = currentState[43]; newState[18] = currentState[42];
      newState[19] = currentState[30]; newState[20] = currentState[18]; newState[32] = currentState[19];
      newState[44] = currentState[20]; newState[43] = currentState[32];
      
      newState[45] = currentState[9];  newState[50] = currentState[21]; newState[51] = currentState[33];
      newState[41] = currentState[45]; newState[29] = currentState[50]; newState[17] = currentState[51];
      newState[6]  = currentState[41]; newState[7]  = currentState[29]; newState[8]  = currentState[17];
      newState[9]  = currentState[6];  newState[21] = currentState[7];  newState[33] = currentState[8];
      break;

    case 'WHITE_CCW':
      newState[44] = currentState[42]; newState[32] = currentState[43]; newState[20] = currentState[44];
      newState[19] = currentState[32]; newState[18] = currentState[20]; newState[30] = currentState[19];
      newState[42] = currentState[18]; newState[43] = currentState[30];
      
      newState[45] = currentState[41]; newState[50] = currentState[29]; newState[51] = currentState[17];
      newState[41] = currentState[6];  newState[29] = currentState[7];  newState[17] = currentState[8];
      newState[6]  = currentState[9];  newState[7]  = currentState[21]; newState[8]  = currentState[33];
      newState[9]  = currentState[45]; newState[21] = currentState[50]; newState[33] = currentState[51];
      break;

    case 'PURPLE_CW':
      newState[33] = currentState[35]; newState[21] = currentState[34]; newState[9]  = currentState[33];
      newState[10] = currentState[21]; newState[11] = currentState[9];  newState[23] = currentState[10];
      newState[35] = currentState[11]; newState[34] = currentState[23];
      
      newState[36] = currentState[2];  newState[47] = currentState[12]; newState[46] = currentState[24];
      newState[45] = currentState[36]; newState[44] = currentState[47]; newState[32] = currentState[46];
      newState[20] = currentState[45]; newState[8]  = currentState[44]; newState[3]  = currentState[32];
      newState[2]  = currentState[20]; newState[12] = currentState[8];  newState[24] = currentState[3];
      break;

    case 'PURPLE_CCW':
      newState[35] = currentState[33]; newState[23] = currentState[34]; newState[11] = currentState[35];
      newState[10] = currentState[23]; newState[9]  = currentState[11]; newState[21] = currentState[10];
      newState[33] = currentState[9];  newState[34] = currentState[21];
      
      newState[36] = currentState[45]; newState[24] = currentState[46]; newState[12] = currentState[47];
      newState[2]  = currentState[36]; newState[3]  = currentState[24]; newState[8]  = currentState[12];
      newState[20] = currentState[2];  newState[32] = currentState[3];  newState[44] = currentState[8];
      newState[45] = currentState[20]; newState[46] = currentState[32]; newState[47] = currentState[44];
      break;

    case 'YELLOW_CW':
      newState[38] = currentState[14]; newState[37] = currentState[26]; newState[36] = currentState[38];
      newState[24] = currentState[37]; newState[12] = currentState[36]; newState[13] = currentState[24];
      newState[14] = currentState[12]; newState[26] = currentState[13];
      
      newState[39] = currentState[0];  newState[53] = currentState[15]; newState[48] = currentState[27];
      newState[47] = currentState[39]; newState[35] = currentState[53]; newState[23] = currentState[48];
      newState[11] = currentState[47]; newState[2]  = currentState[35]; newState[1]  = currentState[23];
      newState[0]  = currentState[11]; newState[15] = currentState[2];  newState[27] = currentState[1];
      break;

    case 'YELLOW_CCW':
      newState[38] = currentState[36]; newState[26] = currentState[37]; newState[14] = currentState[38];
      newState[13] = currentState[26]; newState[12] = currentState[14]; newState[24] = currentState[13];
      newState[36] = currentState[12]; newState[37] = currentState[24];
      
      newState[39] = currentState[47]; newState[27] = currentState[48]; newState[15] = currentState[53];
      newState[0]  = currentState[39]; newState[1]  = currentState[27]; newState[2]  = currentState[15];
      newState[11] = currentState[0];  newState[23] = currentState[1];  newState[35] = currentState[2];
      newState[47] = currentState[11]; newState[48] = currentState[23]; newState[53] = currentState[35];
      break;

    case 'RED_CW':
      newState[39] = currentState[41]; newState[27] = currentState[40]; newState[15] = currentState[39];
      newState[16] = currentState[27]; newState[17] = currentState[15]; newState[29] = currentState[16];
      newState[41] = currentState[17]; newState[40] = currentState[29];
      
      newState[53] = currentState[42]; newState[38] = currentState[51]; newState[26] = currentState[52];
      newState[14] = currentState[53]; newState[0]  = currentState[38]; newState[5]  = currentState[26];
      newState[6]  = currentState[14]; newState[18] = currentState[0];  newState[30] = currentState[5];
      newState[42] = currentState[6];  newState[51] = currentState[18]; newState[52] = currentState[30];
      break;

    case 'RED_CCW':
      newState[41] = currentState[39]; newState[29] = currentState[40]; newState[17] = currentState[41];
      newState[16] = currentState[29]; newState[15] = currentState[17]; newState[27] = currentState[16];
      newState[39] = currentState[15]; newState[40] = currentState[27];
      
      newState[42] = currentState[53]; newState[30] = currentState[52]; newState[18] = currentState[51];
      newState[6]  = currentState[42]; newState[5]  = currentState[30]; newState[0]  = currentState[18];
      newState[14] = currentState[6];  newState[26] = currentState[5];  newState[38] = currentState[0];
      newState[53] = currentState[14]; newState[52] = currentState[26]; newState[51] = currentState[38];
      break;

    case 'GREEN_CW':
      newState[2] = currentState[0]; newState[3] = currentState[1]; newState[8] = currentState[2];
      newState[7] = currentState[3]; newState[6] = currentState[8]; newState[5] = currentState[7];
      newState[0] = currentState[6]; newState[1] = currentState[5];
      
      newState[17] = currentState[20]; newState[16] = currentState[19]; newState[15] = currentState[18];
      newState[14] = currentState[17]; newState[13] = currentState[16]; newState[12] = currentState[15];
      newState[11] = currentState[14]; newState[10] = currentState[13]; newState[9]  = currentState[12];
      newState[20] = currentState[11]; newState[19] = currentState[10]; newState[18] = currentState[9];
      break;

    case 'GREEN_CCW':
      newState[0] = currentState[2]; newState[5] = currentState[1]; newState[6] = currentState[0];
      newState[7] = currentState[5]; newState[8] = currentState[6]; newState[3] = currentState[7];
      newState[2] = currentState[8]; newState[1] = currentState[3];
      
      newState[12] = currentState[9];  newState[13] = currentState[10]; newState[14] = currentState[11];
      newState[15] = currentState[12]; newState[16] = currentState[13]; newState[17] = currentState[14];
      newState[18] = currentState[15]; newState[19] = currentState[16]; newState[20] = currentState[17];
      newState[9]  = currentState[18]; newState[10] = currentState[19]; newState[11] = currentState[20];
      break;

    default:
      console.warn("Unknown rotation action:", action);
  }

  return newState;
};
