function updateElementValue(id, value, isHTML = false) {
	var element = (id instanceof Object) ? id : $(`#${id}`);
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

function ajaxUpdate(uri, id) {
	updateElementValue(id, `<div class="spinner-border" role="status">
  													<span class="sr-only">Loading...</span>
													</div>`, true);
	$.ajax({url: uri, success: function(html) {
			updateElementValue(id, html, true);
		}
	});
}

function loadLazyContainers() {
	var lazyElements = $(".lazyload");
	for(var i=0; i < lazyElements.length; i++) {
		var ele = $(lazyElements[i]);
		var loadUrl = ele.attr('loadurl');
		var paranetEle = ele.parent();
		console.log("loadUrl=",loadUrl);
		ajaxUpdate(loadUrl, paranetEle);
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
