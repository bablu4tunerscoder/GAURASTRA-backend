const NodeGeocoder = require("node-geocoder");

const options = { provider: "openstreetmap" };
const geocoder = NodeGeocoder(options);

const getGeolocation = async (address) => {
  try {
    const res = await geocoder.geocode(address);
    if (res.length > 0) {
      return { latitude: res[0].latitude, longitude: res[0].longitude };
    }
    return null;
  } catch (error) {
    console.error("Geolocation Error:", error);
    return null;
  }
};

module.exports = { getGeolocation };
