const rateLimit = require("express-rate-limit");
var coreApi = require("./../app/api/coreApi.js");
var addressApi = require("./../app/api/addressApi.js");

class RestfullRouter {
	constructor(expressApp, apiProperties) {
		var limiter = rateLimit(apiProperties.limit);
		expressApp.use(apiProperties.base_uri, limiter);
		var self = this;
		apiProperties.api_map.foreach(api => {
			expressApp.use(`${apiProperties.base_uri}${api.uri}`, (req, res, next) => {
				var paramValues = [];
				for(var paramIndex in api.params) {
					var param = api.params[paramIndex];
					var paramValue = req.param(param.name);
					paramValue = self.checkAndParseParams(param.type, paramValue);
					paramValues.push(paramValue);
				}
				var method = api.method ? api.method : api.name
				var result = self.triggerApiCall(api.api_source, method, paramValues);
				res.send(result);
			});
		})
	}
	
	triggerApiCall(type, apiMethod, paramValues) {
		switch(type) {
		case "core": 
			return coreApi[method].call(null, paramValues);
		case "address": 
			return addressApi[method].call(null, paramValues);
		}
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