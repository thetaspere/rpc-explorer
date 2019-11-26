
class CoinBase {
	constructor(name, ticker, priceid) {
		this.name = name;
		this.ticker = ticker;
		this.priceid = priceid;
		this.priceApiUrl = `https://api.coingecko.com/api/v3/coins/${priceid}?localization=false`;
		this.properties = {
			name : this.name,
			ticker : this.ticker,
			feeSatoshiPerByteBucketMaxima: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50, 75, 100, 150],
			exchangeRateData:{
				jsonUrl:this.priceApiUrl,
				responseBodySelectorFunction:this.responseBodySelectorFunction
			},
			api : this.coinApi
		};
	}
	responseBodySelectorFunction(responseBody) {
		var exchangedCurrencies = ["BTC", "USD", "CNY"];

		if (responseBody.market_data) {
			var exchangeRates = {};

			for (var i = 0; i < exchangedCurrencies.length; i++) {
				var currency = exchangedCurrencies[i].toLowerCase();
				if (responseBody.market_data.current_price[currency]) {
					exchangeRates[currency] = responseBody.market_data.current_price[currency];
				}
			}

			return exchangeRates;
		}
		
		return null;
	}
	
	coinApi() {
		return {
			base_uri : "/api/",
			limit : {
				 windowMs: 15 * 60 * 1000, // 15 minutes
				 max: 100, // limit each IP to 100 requests per windowMs
				 message: "Too calls from this IP with 15 mins, please try again after 15 mins"
			},
			api_map : [
				{
					name : "getblockcount",
					uri : "getblockcount",
					api_source : "core",
					method : "getBlockCount",
					description : "Get current block height",
					"return" : "block height as number"
				},
				{
					name : "getblock", 
					uri : "getblock",
					api_source : "core",
					method : "getBlockByHeight",
					params : [{
						name : "height",
						type : "number",
						description : "valid block height"
					}],
					description : "Get block information by height",
					"return" : "Json Object of block info in following format: " +
							"<ul><li>{ 'address' : <br>" +
							"&emsp;{ 'confirmed' : satoshi_amount, <br>" +
							"&emsp;&nbsp;&nbsp;'unconfirmed' : satoshi_amount }<br>}</ul></li>"
				},
				{
					name : "getrawtransaction", 
					uri : "getblock",
					api_source : "core",
					method : "getRawTransaction",
					params : [{
						name : "txid",
						type : "string",
						description : "valid transaction id"
					}],
					description : "Get raw detail of a transaction",
					"return" : "Json Object of transaction info in following format: " +
							"<ul><li>{ 'address' : <br>" +
							"&emsp;{ 'confirmed' : satoshi_amount, <br>" +
							"&emsp;&nbsp;&nbsp;'unconfirmed' : satoshi_amount }<br>}</ul></li>"
				},
				{
					name : "getaddressbalance", 
					uri : "getaddressbalance",
					api_source : "getAddressBalance",
					params : [{
						name : "address",
						type : "string",
						description : "public wallet address"
					}],
					description : "Get current balance for specified address",
					"return" : "Json Object of address balance in following format: " +
							"<ul><li>{ 'address' : <br>" +
							"&emsp;{ 'confirmed' : satoshi_amount, <br>" +
							"&emsp;&nbsp;&nbsp;'unconfirmed' : satoshi_amount }<br>}</ul></li>"
				},
				{
					name : "getaddressutxos", 
					uri : "getaddressutxos",
					api_source : "getAddressUTXOs",
					params : [{
						name : "address",
						type : "string",
						description : "public wallet address"
					}],
					description : "Get list of unspent transactions meta data for specified address",
					"return" : "Json Object of address utxo in following format: " +
							"<ul><li>{ 'address' : <br>" +
							"&emsp;&emsp;[<br>" +
							"&emsp;&emsp;&nbsp;&nbsp;{ 'tx_hash' : txid, <br>" +
							"&emsp;&emsp;&nbsp;&nbsp;&nbsp;&nbsp;'tx_pos' : index, <br>" +
							"&emsp;&emsp;&nbsp;&nbsp;&nbsp;&nbsp;'height' : block_height, <br>" +
							"&emsp;&emsp;&nbsp;&nbsp;&nbsp;&nbsp;'value' : satoshi_amount }, <br>" +
							"&emsp;&emsp;... ]<br>" +
							"}</ul></li>"
				}
			]
		}
	}
	
	addProperties(properties) {
		Object.assign(this.properties, properties);
	}
}

module.exports = CoinBase;
