const request = require('request');

class MarketAPI {
  constructor(config) {
    this.db = config.db;
  }

  getMarket(ticker) {
    ticker = ticker.toLowerCase();
    var url = "https://safe.trade/api/v2/peatio/public/markets/tickers"
    var separater = "";
    var name = "SafeTrade"
    var website = "https://safe.trade/trading/"
    return new Promise((resolve, reject) => {
      request({url : url, json : true}, (error, response, body) => {
        if(error) {
          reject(error);
        } else {
          var pairs = [];
          for(var pair in body) {
            if(pair.startsWith(ticker)) {
              var toTicker = pair.substring(ticker.length + separater.length, pair.length);
              var pairString = `${ticker.toUpperCase()}-${toTicker.toUpperCase()}`;
              var pairInfo = {
                Exchange : name,
                Pair : {
                  id : pairString,
                  website : `${website}${pair}`
                },
                Price : body[pair].ticker.last,
                Change : body[pair].ticker.price_change_percent,
                Volume : `${body[pair].ticker.volume}${toTicker.toUpperCase()} - ${body[pair].ticker.vol}${ticker.toUpperCase()}`
              }
              pairs.push(pairInfo);
            }
          }
          resolve(pairs);
        }
      });
    });
  }

}
module.exports = MarketAPI;
