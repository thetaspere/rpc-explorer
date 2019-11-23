
class PageRender {
	contructor(router, pageUri, pageName) {
		this.req = req;
		this.res = res;
		this.next = next;
		this.router = this.router;
		this.pageUri = this.pageUri;
		this.pageName = this.pageName;
	}
	
	prepareRender(generateContent, ...args) {
		this.router.get(this.pageUri, (req, res, next) =>{
			if(generateContent) {
				var contentValues = generateContent.call(null, args);
				res.locals = contentValues;
			}
			res.render(pageName);
		});
	}
}

module.exports = PageRender;