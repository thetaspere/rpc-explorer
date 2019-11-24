function updateElementValue(id, value, isHTML = false) {
	var element = $(`#${id}`);
	if(element && element.length > 0) {
		if(isHTML) {
			element.html(value);
		} else {
			element.text(value);
		}
	}
}

function updateElementAttr(id, attrName, value) {
	var element = $(`#${id}`);
	if(element && element.length > 0) {
		element.attr(attrName, value);
	}
}

function updateStats() {
	setInterval( function() {
		var checkEle = $("#hashrate");
		console.log("hashrate element %d", checkEle.length);
		if(checkEle && checkEle.length > 0) {
			$.ajax({url: '/ext/summary', success: function(json){
				updateElementValue("hashrate", json.hashrate.rate);
				updateElementAttr("hashUnit", "data-original-title", json.hashrate.unit);
				updateElementValue("txStats", json.txcount);
				updateElementValue("mempoolCount", json.mempool.count + " tx");
				updateElementValue("mempoolSize", json.mempool.size);
				updateElementValue("chainworkNum", json.chainwork.num);
				updateElementValue("chainworkExp", json.chainwork.exp);
				updateElementValue("diffNum", json.diff.num);
				updateElementValue("diffExp", json.diff.exp);
				updateElementValue("chainSize", json.chainSize);
				updateElementValue("price", json.price);
			}});
		}
	}, 180000);
}