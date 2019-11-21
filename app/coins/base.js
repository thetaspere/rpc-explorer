
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
			}	
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
	
	addProperties(properties) {
		Object.assign(this.properties, properties);
	}
}

module.exports = CoinBase;
