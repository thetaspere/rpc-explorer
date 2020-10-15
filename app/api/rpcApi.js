var debug = require('debug');

var debugLog = debug("btcexp:rpc");

var async = require("async");

var utils = require("../utils.js");
var config = require("../config.js");
var coins = require("../coins.js");

var activeQueueTasks = 0;

const HAS_COUNT_MAP = {

}

var rpcQueue = async.queue(function(task, callback) {
	activeQueueTasks++;
	//debugLog("activeQueueTasks: " + activeQueueTasks);

	task.rpcCall(function() {
		callback();

		activeQueueTasks--;
		//debugLog("activeQueueTasks: " + activeQueueTasks);
	});

}, config.rpcConcurrency);



function getBlockchainInfo() {
	return getRpcData("getblockchaininfo");
}

function getBlockCount() {
	return getRpcData("getblockcount");
}

function getNetworkInfo() {
	return getRpcData("getnetworkinfo");
}

function getNetTotals() {
	return getRpcData("getnettotals");
}

function getMempoolInfo() {
	return getRpcData("getmempoolinfo");
}

function getMiningInfo() {
	return getRpcData("getmininginfo");
}

function getUptimeSeconds() {
	return getRpcData("uptime");
}

function getPeerInfo() {
	return getRpcData("getpeerinfo");
}

function countRPC(rpcMethod) {
	return new Promise((resolve, reject) => {
		rpcMethod.then(result => {
			if(result) {
				if(result.name && result.name === "RpcError") {
					reject(result.message);
				} else {
					resolve(result);
				}
			} else {
				resolve(0);
			}
		});
	});
}

function getTotalAssetAddresses(assetName) {
	if(HAS_COUNT_MAP.listaddressesbyasset) {
		return getRpcDataWithParams({method:"listaddressesbyasset", parameters:[assetName, true]});
	} else if(HAS_COUNT_MAP.listaddressesbyasset !== undefined) {
		return new Promise((resolve, reject) => {
			countRPC(getRpcDataWithParams({method:"listaddressesbyasset", parameters:[assetName]})).then(result => {
				resolve(result ? Object.keys(result).length : 0);
			}).catch(reject);
		});
	}
	return new Promise((resolve, reject) => {
		getRpcDataWithParams({method:"listaddressesbyasset", parameters:[assetName, true]}).then(result => {
			if(result) {
				if(result.name && result.name === "RpcError") {
					countRPC(getRpcDataWithParams({method:"listaddressesbyasset", parameters:[assetName]})).then(result => {
						HAS_COUNT_MAP.listaddressesbyasset = 0;
						resolve(result ? Object.keys(result).length : 0);
					}).catch(reject);
				} else {
					HAS_COUNT_MAP.listaddressesbyasset = 1;
					resolve(result);
				}
			} else {
				HAS_COUNT_MAP.listaddressesbyasset = 1;
				resolve(0);
			}
		}).catch(reject);
	});
}

function getAssetAddresses(assetName, start, limit) {
	if(HAS_COUNT_MAP.listaddressesbyasset) {
		return getRpcDataWithParams({method:"listaddressesbyasset", parameters:[assetName, false, limit, start]});
	} else {
		return getRpcDataWithParams({method:"listaddressesbyasset", parameters:[assetName]});
	}
}

function getTotalAddressAssetBalances(address) {
	return getRpcDataWithParams({method:"listassetbalancesbyaddress", parameters:[address, true]});
}

function getAddressAssetBalances(address, start, limit) {
	return getRpcDataWithParams({method:"listassetbalancesbyaddress", parameters:[address, false, limit, start]});
}

function getTotalAssetCount(filter) {
	return new Promise((resolve, reject) => {
		filter = filter && filter !== "*" ? `${filter}*` : "*"
		getRpcDataWithParams({method:"listassets", parameters:[filter]}).then(assets => {
			resolve(assets.length);
		}).catch(reject);
	});
}

function queryAssets(searchTerm, start, limit) {
	searchTerm = (searchTerm && searchTerm !== "*") ? `${searchTerm}*` : "*"
	return getRpcDataWithParams({method:"listassets", parameters:[searchTerm, true, limit, start]});
}

function getNetworkHash(height) {
	return getRpcDataWithParams({method:"getnetworkhashps", parameters:[120, height]});
}

function getMempoolTxids(verbose = false) {
	return getRpcDataWithParams({method:"getrawmempool", parameters:[verbose]});
}

function broadcast(req) {
	var rawtxhex = req.query.tx;
	return getRpcDataWithParams({method:"sendrawtransaction", parameters:[rawtxhex]});
}

function getAddressDeltas(address, scriptPubkey, sort, limit, offset, assetName = coins[config.coin].ticker) {
	return new Promise(function(resolve, reject) {
		var assetSupported = coins[config.coin].assetSupported ? true : false;
		var promise;
		if(assetSupported) {
			promise = getRpcDataWithParams({method : "getaddressdeltas", parameters: [{addresses : [address], assetName : assetName}]});
		} else {
			promise = getRpcDataWithParams({method : "getaddressdeltas", parameters: [{addresses : [address]}]});
		}
		promise.then(addressDeltas => {
			if (sort == "desc") {
				addressDeltas.reverse();
			}
			var end = Math.min(addressDeltas.length, limit + offset);
			var result = {
				txCount : addressDeltas.length,
				txids : [],
				blockHeightsByTxid : {}
			}
			addressDeltas = addressDeltas.slice(offset, end);
			for (var i in addressDeltas) {
				result.txids.push(addressDeltas[i].txid);
				result.blockHeightsByTxid[addressDeltas[i].txid] = addressDeltas[i].height;
			}
			//console.log("getAddressDeltas ", result);
			resolve({addressDeltas : result, errors : null});
		}).catch(reject);
	});
}

function getAddressDetails(address, scriptPubkey, sort, limit, offset, assetName = coins[config.coin].ticker) {
	return new Promise(function(resolve, reject) {
		var txidData = null;
		var balanceData = null;
		var assetSupported = coins[config.coin].assetSupported ? true : false;
		// getBlockCount().then(currentHeight => {
		// 	promises.push(getRpcDataWithParams({method : "getaddresstxids", parameters: [{adddresses : [address]}]}));
		// }).catch(reject);
		var promises = [];
		if(assetSupported) {
			promises.push(getRpcDataWithParams({method : "getaddressdeltas", parameters: [{addresses : [address], assetName : assetName}]}));
		} else {
			promises.push(getRpcDataWithParams({method : "getaddressdeltas", parameters: [{addresses : [address]}]}));
		}
		promises.push(getRpcDataWithParams({method : "getaddressbalance", parameters: [{addresses : [address]},assetSupported]}));
		Promise.all(promises).then(function(results) {
			txidData = results[0];
			if (sort == "desc") {
				txidData.reverse();
			}
			var end = Math.min(txidData.length, limit + offset);
			balanceData = results[1];
			var addressDetails = {
				txCount : txidData.length,
				txids : [],
				blockHeightsByTxid : {}
			}
		  txidData = txidData.slice(offset, end);
			for (var i in txidData) {
				addressDetails.txids.push(txidData[i].txid);
				addressDetails.blockHeightsByTxid[txidData[i].txid] = txidData[i].height;
			}
			if(assetSupported) {
				addressDetails.assets = {};
				for(var bIndex in balanceData) {
					var bal = balanceData[bIndex];
					if(bal.assetName === coins[config.coin].ticker) {
						addressDetails.balanceSat = bal.balance;
					} else {
						addressDetails.assets[bal.assetName] = bal.balance;
					}
				}
			} else {
				addressDetails.balanceSat = balanceData.balance;
			}
			resolve({addressDetails : addressDetails, errors : null});
 		}).catch(reject);
	});
}

function getAddressBalance(address, scriptPubkey) {
	var assetSupported = coins[config.coin].assetSupported ? true : false;
	return getRpcDataWithParams({method : "getaddressbalance", parameters: [{addresses : [address]},assetSupported]});
}
function getAddressUTXOs(address, scriptPubkey) {
	//var assetSupported = coins[config.coin].assetSupported ? true : false;
	return getRpcDataWithParams({method : "getaddressutxos", parameters: [{addresses : [address]}]});
}

function getSupply() {
	return new Promise(function(resolve, reject) {
		getRpcData("gettxoutsetinfo").then(txoutinfo => {
			if(txoutinfo) {
				resolve(txoutinfo.total_amount);
			}
		}).catch(reject);
	});
}

function getRawMempool() {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getrawmempool", parameters:[false]}).then(function(txids) {
			var promises = [];

			for (var i = 0; i < txids.length; i++) {
				var txid = txids[i];

				promises.push(getRawMempoolEntry(txid));
			}

			Promise.all(promises).then(function(results) {
				var finalResult = {};

				for (var i = 0; i < results.length; i++) {
					if (results[i] != null) {
						finalResult[results[i].txid] = results[i];
					}
				}

				resolve(finalResult);

			}).catch(function(err) {
				reject(err);
			});

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getRawMempoolEntry(txid) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempoolentry", parameters:[txid]}).then(function(result) {
			result.txid = txid;

			resolve(result);

		}).catch(function(err) {
			resolve(null);
		});
	});
}

function getChainTxStats(blockCount) {
	return getRpcDataWithParams({method:"getchaintxstats", parameters:[blockCount]});
}

function getBlockByHeight(blockHeight) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]}).then(function(blockhash) {
			getBlockByHash(blockhash).then(function(block) {
				resolve(block);

			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlock(blockHeight) {
	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getblockhash", parameters:[blockHeight]}).then(function(blockhash) {
			getRpcDataWithParams({method:"getblock", parameters:[blockhash]}).then(function(block) {
				resolve(block);
			}).catch(reject);
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getBlockByHash(blockHash) {
	debugLog("getBlockByHash: %s", blockHash);

	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getblock", parameters:[blockHash]}).then(function(block) {
			getRawTransaction(block.tx[0]).then(function(tx) {
				block.coinbaseTx = tx;
				block.totalFees = utils.getBlockTotalFeesFromCoinbaseTxAndBlockHeight(tx, block.height);
				block.miner = utils.getMinerFromCoinbaseTx(tx);

				resolve(block);

			}).catch(function(err) {
				reject(err);
			});
		}).catch(function(err) {
			reject(err);
		});
	});
}

function getAddress(address) {
	return getRpcDataWithParams({method:"validateaddress", parameters:[address]});
}

function getRawTransaction(txid) {
	debugLog("getRawTransaction: %s", txid);

	return new Promise(function(resolve, reject) {
		if (coins[config.coin].genesisCoinbaseTransactionId && txid == coins[config.coin].genesisCoinbaseTransactionId) {
			// copy the "confirmations" field from genesis block to the genesis-coinbase tx
			getBlockchainInfo().then(function(blockchainInfoResult) {
				var result = coins[config.coin].genesisCoinbaseTransaction;
				result.confirmations = blockchainInfoResult.blocks;

				resolve(result);

			}).catch(function(err) {
				reject(err);
			});

		} else {
			getRpcDataWithParams({method:"getrawtransaction", parameters:[txid, 1]}).then(function(result) {
				if (result == null || result.code && result.code < 0) {
					reject(result);

					return;
				}

				resolve(result);

			}).catch(function(err) {
				reject(err);
			});
		}
	});
}

function getUtxo(txid, outputIndex) {
	debugLog("getUtxo: %s (%d)", txid, outputIndex);

	return new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"gettxout", parameters:[txid, outputIndex]}).then(function(result) {
			if (result == null) {
				resolve("0");

				return;
			}

			if (result.code && result.code < 0) {
				reject(result);

				return;
			}

			resolve(result);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getMempoolTxDetails(txid) {
	debugLog("getMempoolTxDetails: %s", txid);

	var promises = [];

	var mempoolDetails = {};

	promises.push(new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempoolentry", parameters:[txid]}).then(function(result) {
			mempoolDetails.entry = result;

			resolve();

		}).catch(function(err) {
			reject(err);
		});
	}));

	promises.push(new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempoolancestors", parameters:[txid]}).then(function(result) {
			mempoolDetails.ancestors = result;

			resolve();

		}).catch(function(err) {
			reject(err);
		});
	}));

	promises.push(new Promise(function(resolve, reject) {
		getRpcDataWithParams({method:"getmempooldescendants", parameters:[txid]}).then(function(result) {
			mempoolDetails.descendants = result;

			resolve();

		}).catch(function(err) {
			reject(err);
		});
	}));

	return new Promise(function(resolve, reject) {
		Promise.all(promises).then(function() {
			resolve(mempoolDetails);

		}).catch(function(err) {
			reject(err);
		});
	});
}

function getHelp() {
	return getRpcData("help");
}

function smartnode(command) {
		return masternode(command, smartnode);
}

function masternode(command, masternodeCommand = "masternode") {
	return new Promise((resolve, reject) => {
		var possibleCommand = ["count", "list", "current", "winner", "winners"];
		if(command) {
			command = command.toLowerCase();
		} else {
			resolve({"error" : "no command was given"});
		}
		if(possibleCommand.includes(command)) {
			getRpcDataWithParams({method:masternodeCommand, parameters:[command]}).then(result => {
				resolve(result);
			}).catch(reject);
		} else {
			resolve({"error" : `${command} is an invalid command`});
		}
	});
}

function protx(command, params) {
	return new Promise((resolve, reject) => {
		var possibleCommand = ["list", "info", "diff"];
		if(command) {
			command = command.toLowerCase();
		} else {
			resolve({"error" : "no command was given"});
		}
		if(possibleCommand.includes(command)) {
			var parameters = [command];
			if(command == "info") {
				if(params.protxhash) {
					parameters.push(params.protxhash);
				} else {
					return resolve({"error" : "protxhash was not given for info command"});
				}
			} else if(command == "diff") {
				if(params.baseblock && params.block) {
					parameters.push(params.baseblock);
					parameters.push(params.block);
				} else {
					return resolve({"error" : "baseblock or/and baseblock was not given for diff command"});
				}
			}
			getRpcDataWithParams({method:"protx", parameters:parameters}).then(result => {
				resolve(result);
			}).catch(reject);
		} else {
			resolve({"error" : `${command} is an invalid command`});
		}
	});
}

function quorum(command, params) {
	return new Promise((resolve, reject) => {
		var possibleCommand = ["list", "info", "memberof", "isconflicting"];
		if(command) {
			command = command.toLowerCase();
		} else {
			resolve({"error" : "no command was given"});
		}
		if(possibleCommand.includes(command)) {
			var parameters = [command];
			if(command == "info") {
				if(params.llmqtype && params.quorumhash) {
					parameters.push(params.llmqtype);
					parameters.push(params.quorumhash);
					if(params.skshare) {
						parameters.push(params.skshare);
					}
				} else {
					return resolve({"error" : "quorumhash or/and llmqtype was not given for info command"});
				}
			} else if(command == "memberof") {
				if(params.protxhash) {
					parameters.push(params.protxhash);
					if(params.count) {
						parameters.push(params.count);
					}
				} else {
					return resolve({"error" : "protxhash was not given for memberof command"});
				}
			} else if(command == "isconflicting") {
				if(params.llmqtype && params.id && params.msghash) {
					parameters.push(params.llmqtype);
					parameters.push(params.id);
					parameters.push(params.msghash);
				} else {
					return resolve({"error" : "llmqtype, id, or/and msghash was not given for isconflicting command"});
				}
			}
			getRpcDataWithParams({method:"quorum", parameters:parameters}).then(result => {
				resolve(result);
			}).catch(reject);
		} else {
			resolve({"error" : `${command} is an invalid command`});
		}
	});
}

function getMasternodeReachableCount() {
	var self = this;
	return new Promise((resolve, reject) => {
		masternode("list", global.coinConfig.masternodeCommand).then(async mnList => {
			for(var tx in mnList) {
				var mn = mnList[tx];
				if(mn.status === "ENABLED") {
					var ipPort = mn.address.split(':');
					var isReachable = await utils.isIpPortReachableFromCache(ipPort[0], ipPort[1]);
				}
			}
			var checkResult = await utils.checkIpsAsync();
			console.log(checkResult);
			resolve(checkResult);
		}).catch(reject);
	});
}

function getRpcMethodHelp(methodName) {
	return getRpcDataWithParams({method:"help", parameters:[methodName]});
}

function getRpcData(cmd) {
	return new Promise(function(resolve, reject) {
		debugLog(`RPC: ${cmd}`);

		rpcCall = function(callback) {
			var client = (cmd == "gettxoutsetinfo" ? global.rpcClientNoTimeout : global.rpcClient);

			client.command(cmd, function(err, result, resHeaders) {
				if (err) {
					utils.logError("32euofeege", err, {cmd:cmd});

					reject(err);

					callback();

					return;
				}

				resolve(result);

				callback();
			});
		};

		rpcQueue.push({rpcCall:rpcCall});
	});
}

function getRpcDataWithParams(request) {
	return new Promise(function(resolve, reject) {
		debugLog(`RPC: ${JSON.stringify(request)}`);

		rpcCall = function(callback) {
			global.rpcClient.command([request], function(err, result, resHeaders) {
				if (err != null) {
					utils.logError("38eh39hdee", err, {result:result, headers:resHeaders});

					reject(err);

					callback();

					return;
				}

				resolve(result[0]);

				callback();
			});
		};

		rpcQueue.push({rpcCall:rpcCall});
	});
}

module.exports = {
	getBlockchainInfo: getBlockchainInfo,
	getNetworkInfo: getNetworkInfo,
	getNetTotals: getNetTotals,
	getMempoolInfo: getMempoolInfo,
	getMempoolTxids: getMempoolTxids,
	getMiningInfo: getMiningInfo,
	getBlockByHeight: getBlockByHeight,
	getBlockByHash: getBlockByHash,
	getRawTransaction: getRawTransaction,
	getUtxo: getUtxo,
	getMempoolTxDetails: getMempoolTxDetails,
	getRawMempool: getRawMempool,
	getUptimeSeconds: getUptimeSeconds,
	getHelp: getHelp,
	getRpcMethodHelp: getRpcMethodHelp,
	getAddress: getAddress,
	getPeerInfo: getPeerInfo,
	getChainTxStats: getChainTxStats,
	getBlockCount : getBlockCount,
	getBlock : getBlock,
	getSupply : getSupply,
	broadcast : broadcast,
	getAddressDetails : getAddressDetails,
	getAddressUTXOs : getAddressUTXOs,
	getAddressBalance : getAddressBalance,
	getAddressDeltas : getAddressDeltas,
	getTotalAssetAddresses : getTotalAssetAddresses,
	getAssetAddresses : getAssetAddresses,
	getTotalAddressAssetBalances : getTotalAddressAssetBalances,
	getAddressAssetBalances : getAddressAssetBalances,
	getTotalAssetCount : getTotalAssetCount,
	queryAssets : queryAssets,
	getNetworkHash : getNetworkHash,
	masternode : masternode,
	smartnode : smartnode,
	protx : protx,
	quorum : quorum,
	getMasternodeReachableCount : getMasternodeReachableCount
};
