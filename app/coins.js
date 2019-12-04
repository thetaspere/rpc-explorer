var btc = require("./coins/btc.js");
var ltc = require("./coins/ltc.js");
var pgn = require("./coins/pgn.js");
var pgn = require("./coins/rtm.js");

module.exports = {
	"BTC": btc,
	"LTC": ltc,
	"PGN": pgn,
	"RTM": rtm,

	"coins":["BTC", "LTC", "PGN", "RTM"]
};
