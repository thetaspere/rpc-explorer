var coreApi = require("./../app/api/coreApi.js");
class Session {
	constructor(req, res, next) {
		this.req = reg;
		this.res = res;
		this.next = next;
	}
	
	isRenderConnect() {
		if (this.req.session.host == null || this.req.session.host.trim() == "") {
			if (this.req.cookies['rpc-host']) {
				this.res.locals.host = this.req.cookies['rpc-host'];
			}

			if (this.req.cookies['rpc-port']) {
				this.res.locals.port = this.req.cookies['rpc-port'];
			}

			if (this.req.cookies['rpc-username']) {
				this.res.locals.username = this.req.cookies['rpc-username'];
			}

			this.res.render("connect");
			this.res.end();
			return true;
		}
		return false;
	}
	
	renderHome() {
		this.res.locals.homepage = true;
		var promises = [];

		promises.push(coreApi.getMempoolInfo());
		promises.push(coreApi.getMiningInfo());
		var self = this;
		coreApi.getBlockchainInfo().then(function(getblockchaininfo) {
			self.res.locals.getblockchaininfo = getblockchaininfo;

			if (getblockchaininfo.chain !== 'regtest') {
				var targetBlocksPerDay = 24 * 60 * 60 / global.coinConfig.targetBlockTimeSeconds;

				promises.push(coreApi.getTxCountStats(targetBlocksPerDay / 4, -targetBlocksPerDay, "latest"));

				var chainTxStatsIntervals = [ targetBlocksPerDay, targetBlocksPerDay * 7, targetBlocksPerDay * 30, targetBlocksPerDay * 365 ]
					.filter(numBlocks => numBlocks <= getblockchaininfo.blocks);

				self.res.locals.chainTxStatsLabels = [ "24 hours", "1 week", "1 month", "1 year" ]
					.slice(0, chainTxStatsIntervals.length)
					.concat("All time");

				for (var i = 0; i < chainTxStatsIntervals.length; i++) {
					promises.push(coreApi.getChainTxStats(chainTxStatsIntervals[i]));
				}
			}

			var blockHeights = [];
			if (getblockchaininfo.blocks) {
				for (var i = 0; i < 10; i++) {
					blockHeights.push(getblockchaininfo.blocks - i);
				}
			}

			if (getblockchaininfo.chain !== 'regtest') {
				promises.push(coreApi.getChainTxStats(getblockchaininfo.blocks - 1));
			}

			coreApi.getBlocksByHeight(blockHeights).then(function(latestBlocks) {
				self.res.locals.latestBlocks = latestBlocks;

				Promise.all(promises).then(function(promiseResults) {
					self.res.locals.mempoolInfo = promiseResults[0];
					self.res.locals.miningInfo = promiseResults[1];

					if (getblockchaininfo.chain !== 'regtest') {
						self.res.locals.txStats = promiseResults[2];

						var chainTxStats = [];
						for (var i = 0; i < self.res.locals.chainTxStatsLabels.length; i++) {
							chainTxStats.push(promiseResults[i + 3]);
						}

						self.res.locals.chainTxStats = chainTxStats;
					}

					self.res.render("index");

					next();
				});
			});
		}).catch(function(err) {
			self.res.locals.userMessage = "Error loading recent blocks: " + err;

			self.res.render("index");

			next();
		});
	}
}

module.exports = Session;