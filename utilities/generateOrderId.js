let dailyCounter = 1; 
let currentDay = null;

const generateOrderId = () => {
  const now = new Date();

  const DD = String(now.getDate()).padStart(2, "0");
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const YY = String(now.getFullYear()).slice(-2);

  const HH = String(now.getHours()).padStart(2, "0");
  const MI = String(now.getMinutes()).padStart(2, "0");
  const SS = String(now.getSeconds()).padStart(2, "0");

  // Check if day changed
  const today = now.getDate();
  if (today !== currentDay) {
    dailyCounter = 1; // Reset to 1 (01) when day changes
    currentDay = today;
  }

  // Format counter as 2 digits
  const COUNTER = String(dailyCounter).padStart(2, "0");

  // Increment after using current value
  const result = `INV-${DD}${MM}${YY}-${HH}${MI}${SS}-${COUNTER}`;
  dailyCounter++;

  return result;
};

module.exports = { generateOrderId };