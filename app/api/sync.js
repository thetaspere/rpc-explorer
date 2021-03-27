const coreApi = require("./coreApi.js");
const rpcApi = require("./rpcApi.js");
const MongoDB = require("../database/mongodb.js");
const Async = require('async');

class BlockchainSync {
  constructor(config) {
    this.db = new MongoDB(config);
    this.syncing = false;
  }

  syncAddressBalance() {
    var self = this;
    return new Promise((resolve, reject) => {
      if(this.syncing) {
        return resolve("Address Syncing")
      }
      Async.waterfall([
  				(cb) => {
  					rpcApi.getBlockCount().then(currentHeight => {
              cb(null, currentHeight);
            });
  				},
          (currentHeight, cb) => {
            self.db.getAddressBalanceLastSyncBlock().then(lastSyncBlock => {
              if(currentHeight <= lastSyncBlock) {
                cb("Address Balance Synced", null);
              } else {
                cb(null, {
                  currentHeight : currentHeight,
                  lastSyncBlock : lastSyncBlock
                });
              }
            });
          },
          (toSync, cb) => {
            var syncPromise = new Promise(async (resolve, reject) => {
              try {
                self.syncing = true;
                for(var i = toSync.lastSyncBlock; i < toSync.currentHeight;) {
                  var endHeight = i + 500;
                  if(endHeight > toSync.currentHeight) {
                    toSync.currentHeight = await rpcApi.getBlockCount();
                    endHeight = toSync.currentHeight;
                  }
                  var wallets = await coreApi.getOutputAddressBalance(i, endHeight);
                  await self.db.saveWallets(wallets, {type : 'block', block : endHeight});
                  i = endHeight;
                }
                self.syncing = false;
                resolve("synced");
              } catch(err) {
                reject(err);
              }
            });
            syncPromise.then(result => {
              cb(null, result);
            }).catch(err => {
              cb(err, null)
            });
          }
        ], (error, result) => {
  				if(error) {
  					reject({error});
  				} else {
  					resolve(result);
  				}
			});
    });
  }
}

module.exports = BlockchainSync;
