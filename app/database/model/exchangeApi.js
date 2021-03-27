var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var ExchangeApiSchema = new Schema({
	name :{ type: String, index:true},
  website : {type : String, default: ""},
	market_api : {type: String, default : ""},
  last_price_field : {type : String, default : "last"},
  volume_field : {type: String, default : "vol"},
  price_change_field : {type: String, default: "price_change_percent"}
});

var ExchangeApi = mongoose.model('ExchangeApi', ExchangeApiSchema);
const EXCHANGE_API_FIELD_MAP = {
		name : "name",
		market_api : "market_api",
    last_price_field : "last_price_field",
    volume_field : "volume_field",
    price_change_field : "price_change_field",
}

module.exports = {ExchangeApi, EXCHANGE_API_FIELD_MAP}
