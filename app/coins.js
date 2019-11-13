var btc = require("./coins/btc.js");
var ltc = require("./coins/ltc.js");
var pgn = require("./coins/pgn.js");

module.exports = {
	"BTC": btc,
	"LTC": ltc,
	"PGN": pgn,

	"coins":["BTC", "LTC", "PGN"]
};