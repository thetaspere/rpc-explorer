var coreApi = require("./../app/api/coreApi.js");
var addressApi = require("./../app/api/addressApi.js");
//var sha256 = require("crypto-js/sha256");
//var hexEnc = require("crypto-js/enc-hex");
var utils = require('./../app/utils.js');
var PageRender = require('./../app/pageRender.js');
var coins = require("./../app/coins.js");
var config = require("./../app/config.js");
var Decimal = require("decimal.js");
var moment = require('moment');

class RestfulRouter {
	constructor(router, apiProperties) {
		var self = this;
		apiProperties.api_map.forEach(api => {
			router.get(`/${api.uri}`, (req, res, next) => {
				var paramValues = [];
				for(var paramIndex in api.params) {
					var param = api.params[paramIndex];
					var paramArray = param.name.split(".");
					var paramValue;
					if(paramArray.length > 1) {
						paramValue = req.query[paramArray[0]];
						paramValue = self.checkAndParseParams(param.type, paramValue, paramArray[1]);
					} else {
					 	paramValue = req.query[param.name];
						paramValue = self.checkAndParseParams(param.type, paramValue);
					}
					if(paramValue || paramValue === 0 || paramValue === '') {
						paramValues.push(paramValue);
					}
				}
				if(req.query.draw || req.query.draw === 0) {
					paramValues.push(req.query.draw);
				}
				paramValues.push(req);
				var method = api.method ? api.method : api.name
				self.triggerApiCall(api.api_source, method, paramValues).then(result => {
					if(result instanceof Object) {
						res.send(JSON.stringify(result, null, 4));
					} else {
						res.send(result.toString());
					}
					next();
				}).catch(e => {
					console.log(e);
					res.send(e + "");
					next();
				});
			});
		});
		var pageRender = new PageRender(router, "/", "api");
		pageRender.prepareRender(this.infoPageContent.bind(this));
	}

	infoPageContent() {
		var api = coins[config.coin].api();
		return {APIS : api.api_map,
				baseUri : api.base_uri};
	}

	triggerApiCall(type, apiMethod, paramValues) {
		switch(type) {
		case "core":
			return coreApi[apiMethod].apply(null, paramValues);
		case "address":
			return addressApi[apiMethod].apply(null, paramValues);
		default :
			return this[type].apply(this, paramValues);
		}
	}

	getAssetAddresses(searchTerm, start, limit, draw) {
		return new Promise((resolve, reject) => {
			var result = {
				data : [],
				draw : draw
			}
			if(!searchTerm || searchTerm.trim() === "") {
				result.recordsTotal = 0;
				result. recordsFiltered = 0;
				resolve(result);
			} else {
				searchTerm = searchTerm.toUpperCase();
				if(start < 0) {
					start = 0;
				}
				coreApi.getTotalAssetAddresses(searchTerm).then( count => {
					if(limit < 0) {
						limit = count;
					}
					result.recordsTotal = count;
					result. recordsFiltered = count;
					if(count > 0) {
						coreApi.getAssetAddresses(searchTerm, start, limit).then(addresses => {
							for(var address in addresses) {
								result.data.push({
									Address : address,
									Balance : addresses[address]
								});
							}
							resolve(result);
						}).catch(reject);
					} else {
						resolve(result);
					}
				}).catch(reject);
			}
		});
	}

	queryAssets(start, limit, searchTerm, draw) {
		return new Promise((resolve, reject) => {
			if(!searchTerm || searchTerm.trim() === "") {
				searchTerm =  "*";
			}
			searchTerm = searchTerm.trim().toUpperCase();
			if(start < 0) {
				start = 0;
			}
			var promises = [coreApi.getTotalAssetCount()];
			if(searchTerm !== "*") {
				promises.push(coreApi.getTotalAssetCount(searchTerm));
			}
			Promise.all(promises).then(totals => {
				if(limit < 0) {
					limit = totals[0];
				}
				coreApi.queryAssets(searchTerm, start, limit).then(assetResult => {
						var assets = [];
						for(var assetName in assetResult) {
							assets.push({
								Name : assetName,
								Amount : assetResult[assetName].amount,
								Units : assetResult[assetName].units,
								Reissuable : assetResult[assetName].reissuable ? true : false,
								"IPFS Hash" : assetResult[assetName].ipfs_hash ? assetResult[assetName].ipfs_hash : "",
								"Block Height" : assetResult[assetName].block_height
							});
						}
						resolve({
							data : assets,
							draw : draw,
							recordsTotal : totals[0],
							recordsFiltered : totals[1] ? totals[1] : totals[0]
						});
				}).catch(reject);
			}).catch(reject);
		});
	}

	getBlocks(start, limit, searchTerm, draw, req) {
		var self = this;
		return new Promise((resolve, reject) => {
			var result = {
				data : [],
				draw : draw,
				recordsTotal : 0,
				recordsFiltered : 0
			}
			if(start < 0) {
				start = 0;
			}
			if(limit < 0) {
				limit = 100;
			}
			var filteredHeights = searchTerm.split("-");
			var lowHeight;
			var maxHeight;
			var defaultLow = false;
			if(filteredHeights.length > 1) {
				maxHeight = filteredHeights[1];
				lowHeight = filteredHeights[0];
			} else if(filteredHeights.length === 1) {
				lowHeight = filteredHeights[0];
			} else {
				lowHeight = 1;
				defaultLow = true;
			}
			if(lowHeight === "*") {
				lowHeight = 1;
			} else {
				lowHeight = self.checkAndParseNumber(lowHeight);
			}
			if(!lowHeight) {
				lowHeight = 1;
				defaultLow = true;
			}
			if(lowHeight) {
				coreApi.getBlockCount().then( currentHeight => {
					if(maxHeight) {
						if(maxHeight === "*") {
							maxHeight = currentHeight;
						}
						maxHeight = self.checkAndParseNumber(maxHeight);
						if(!maxHeight) {
							maxHeight = defaultLow ? currentHeight : lowHeight;
						}
						maxHeight = maxHeight > currentHeight ? currentHeight : maxHeight
					} else if(lowHeight > currentHeight){
						resolve(result);
					} else {
						maxHeight = defaultLow ? currentHeight : lowHeight;
					}
					result.recordsTotal = currentHeight;
					result.recordsFiltered = maxHeight - lowHeight + 1;
					maxHeight = maxHeight - start;
					self.getBlocksInfo(lowHeight, maxHeight, limit, req).then(blockInfo => {
						result.data = blockInfo;
						resolve(result);
					}).catch(reject);
				}).catch(reject);
			} else {
				resolve(result);
			}
		});
	}
	getBlocksInfo(startHeight, endHeight, limit, req) {
		var self = this;
		return new Promise((resolve, reject) => {
			var blockHeights = [];
			var totalBlocks = (endHeight - startHeight + 1);
			if(totalBlocks <= 0) {
				resolve([]);
			} else {
				limit = totalBlocks > limit ? limit : totalBlocks;
				for (var i = 0; i < limit; i++) {
					blockHeights.push(endHeight - i);
				}
				coreApi.getBlocksByHeight(blockHeights).then(blocks => {
					var result = [];
					for(var i in blocks) {
						var blockTime = moment.utc(new Date(parseInt(blocks[i].time) * 1000));
						var currencyValue = new Decimal(blocks[i].totalFees).dividedBy(blocks[i].tx.length);
						var currencyFormatInfo = utils.getCurrencyFormatInfo(req.session.currencyFormatType);
						var value = {
							amount : 0,
							unit : config.coin
						};
						if (currencyValue > 0) {
							var parts = utils.formatCurrencyAmount(currencyValue, req.session.currencyFormatType).split(" ");
							value.amount = parts[0];
							value.unit = parts[1];
							if (currencyFormatInfo.type == "native" && global.exchangeRates) {
								value.tooltip = utils.formatExchangedCurrency(currencyValue, "usd");
							} else if (currencyFormatInfo.type == "exchanged") {
								value.tooltip = utils.formatCurrencyAmount(currencyValue, coins[config.coin].defaultCurrencyUnit.name);
							}
						}
						var fullPercent = new Decimal(100 * blocks[i].weight / coins[config.coin].maxBlockWeight).toDecimalPlaces(1);
						result.push({
							Height : blocks[i].height.toLocaleString(),
							Timestamp : blockTime.format("Y-MM-DD HH:mm:ss"),
							Age : moment.duration(moment.utc(new Date()).diff(blockTime)).format(),
							Miner : blocks[i].miner ? blocks[i].miner : {name : "?"},
							Transactions : blocks[i].tx.length.toLocaleString(),
							"Average Fee" : value,
							"Size (bytes)" : blocks[i].size.toLocaleString(),
							"Weight (wu)" : {
								weight : blocks[i].weight.toLocaleString(),
								percentage : `${fullPercent}%`,
								maxWeight : coins[config.coin].maxBlockWeight
							}
						});
					}
					resolve(result);
				}).catch(reject);
			}
		});
	}
	getLatestTxids(blocks) {
		return new Promise(function(resolve, reject) {
			coreApi.getBlockCount().then(height => {
				var data = [];
				var ids = [];
				if (height) {
					var blockHeights = [];
					for (var i = 0; i < blocks; i++) {
						blockHeights.push(height - i);
					}
					var promises = [];
					promises.push(coreApi.getMempoolTxids());
					promises.push(coreApi.getBlocksByHeight(blockHeights));
					Promise.all(promises).then(results => {
						var latestBlocks = results[1];
						var unconfirmedTxids = results[0];
						for(var i in unconfirmedTxids) {
							data.push({
								TXID : unconfirmedTxids[i],
								Confirmations : 0
							});
							ids.push(unconfirmedTxids[i]);
						}
						for(var j in latestBlocks) {
							var  block = latestBlocks[j];
							for(var z in block.tx) {
								data.push({
									TXID : block.tx[z],
									Confirmations : Number(j) + 1
								});
								ids.push(block.tx[z]);
							}
						}
						resolve(data);
						//resolve({data : ids});
					}).catch(reject);
				} else {
					resolve(data);
				}
			}).catch(reject);
		});
	}

	getAddressUTXOs(addresses) {
		return new Promise((resolve, reject) =>{
			if(!addresses || (addresses instanceof Object && addresses.length === 0)) {
				return resolve({});
			}
			var promises = [];
			if(!(addresses instanceof Object)) {
				addresses = [addresses];
			}
			for(var index in addresses) {
				promises.push(coreApi.getAddress(addresses[index]));
			}
			Promise.all(promises).then(validatedAddresses => {
				promises = [];
				for(var i in validatedAddresses) {
					if(validatedAddresses[i].isvalid) {
						promises.push(addressApi.getAddressUTXOs(addresses[i], config.addressApi === "daemonRPC" ? null : validatedAddresses[i].scriptPubKey));
					}
				}
				if(promises.length > 0) {
					Promise.all(promises).then(utxos => {
						var result = {};
						for(var j in utxos) {
							if(utxos[j].result) {
								result[addresses[j]] = utxos[j].result;
							} else {
								result[addresses[j]] = utxos[j];
							}
						}
						resolve(result);
					}).catch(err => {
						utils.logError("23t07ug2wghefud", err);
						resolve({});
					});
				} else {
					resolve({});
				}
			}).catch(err => {
				utils.logError("23t07ug2wghefud", err);
				resolve({});
			});
		});
	}

	getAddressBalance(addresses) {
		return new Promise((resolve, reject) =>{
			if(!addresses || (addresses instanceof Object && addresses.length === 0)) {
				return resolve({});
			}
			var promises = [];
			if(!(addresses instanceof Object)) {
				addresses = [addresses];
			}
			for(var index in addresses) {
				promises.push(coreApi.getAddress(addresses[index]));
			}
			Promise.all(promises).then(validatedAddresses => {
				promises = [];
				for(var i in validatedAddresses) {
					if(validatedAddresses[i].isvalid) {
						promises.push(addressApi.getAddressBalance(addresses[i], config.addressApi === "daemonRPC" ? null : validatedAddresses[i].scriptPubKey));
					}
				}
				if(promises.length > 0) {
					Promise.all(promises).then(balances => {
						var result = {};
						for(var j in balances) {
							if(balances[j].result) {
								result[addresses[j]] = balances[j].result;
							} else {
								result[addresses[j]] = balances[j];
							}
						}
						resolve(result);
					}).catch(err => {
						utils.logError("23t07ug2wghefud", err);
						resolve({});
					});
				} else {
					resolve({});
				}
			}).catch(err => {
				utils.logError("23t07ug2wghefud", err);
				resolve({});
			});
		});
	}

	checkAndParseString(value) {
		if(value) {
			value = (typeof value) === "string" ? value.trim() : value.toString();
			return value !== "" ? value : null;
		}
		return null;
	}
	checkAndParseNumber(value) {
		if(value) {
			value = (typeof value) === "string" ? value.trim() : value;
			var num = Number(value);
			if(isNaN(num)) {
				return null;
			}
			return num;
		}
		return null;
	}

	checkAndParseParams(paramType, paramValue, key) {
		switch(paramType) {
		case "string" :
			return this.checkAndParseString(paramValue);
			break;
		case "number" :
			return this.checkAndParseNumber(paramValue);
			break;
		case "object" :
			return paramValue ? paramValue[key] : paramValue;
			break;
		}
	}
}

module.exports = RestfulRouter;
