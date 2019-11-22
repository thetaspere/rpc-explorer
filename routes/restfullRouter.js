var coreApi = require("./../app/api/coreApi.js");
var addressApi = require("./../app/api/addressApi.js");
//var sha256 = require("crypto-js/sha256");
//var hexEnc = require("crypto-js/enc-hex");
var utils = require('./../app/utils.js');

class RestfullRouter {
	constructor(router, apiProperties) {
		var self = this;
		apiProperties.api_map.forEach(api => {
			router.get(`/${api.uri}`, (req, res, next) => {
				var paramValues = [];
				for(var paramIndex in api.params) {
					var param = api.params[paramIndex];
					var paramValue = req.param(param.name);
					paramValue = self.checkAndParseParams(param.type, paramValue);
					paramValues.push(paramValue);
				}
				var method = api.method ? api.method : api.name
				self.triggerApiCall(api.api_source, method, paramValues).then(result => {
					if(result instanceof Object) {
						res.send(result);
					} else {
						res.send(result.toString());
					}
					next();
				}).catch(e => {
					console.err(e);
					res.send("");
					next();
				});
				
				
			});
		})
	}
	
	triggerApiCall(type, apiMethod, paramValues) {
		switch(type) {
		case "core": 
			return coreApi[apiMethod].call(null, paramValues);
		case "address": 
			return addressApi[apiMethod].call(null, paramValues);
		default :
			return this[type](paramValues);
		}
	}
	
	getAddressBalance(addresses) {
		return new Promise((resolve, reject) =>{
			var promises = [];
			for(var index in addresses) {
				promises.push(coreApi.getAddress(addresses[index]));
			}
			Promise.all(promises).then(validatedAddresses => {
				promises = [];
				for(var i in validatedAddresses) {
					promise.push(addressApi.getAddressBalance(addresses[i], validatedAddresses[i].scriptPubKey));
				}
				Promise.all(promises).then(balances => {
					var result = {};
					for(var j in balances) {
						result[addresses[j]] = balances[j];
					}
					resolve(result);
				}).catch(err => {
					utils.logError("23t07ug2wghefud", err);
					resolve({});
				});
			}).catch(err => {
				utils.logError("23t07ug2wghefud", err);
				resolve({});
			});
		});
	}
	
	checkAndParseString(value) {
		if(value && value.trim() !== "") {
			return value.trim().toString();
		}
		return null;
	}
	checkAndParseNumber(value) {
		if(value && value.trim() !== "") {
			var num = Number(value.trim());
			if(num.isNaN()) {
				return null;
			}
			return num;
		}
		return null;
	}
	
	checkAndParseParams(paramType, paramValue) {
		switch(paramType) {
		case "string" : 
			return this.checkAndParseString(paramValue);
			break;
		case "number" : 
			return this.checkAndParseNumber(paramValue);
			break;
		}
	}
}

module.exports = RestfullRouter;