var btc = require("./coins/btc.js");
var ltc = require("./coins/ltc.js");

module.exports = {
	"BTC": btc,
	"LTC": ltc,
	"PGN": pgn,

	"coins":["BTC", "LTC", "PGN"]
};