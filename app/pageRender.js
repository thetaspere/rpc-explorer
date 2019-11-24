
class PageRender {
	contructor(router, pageUri, pageName) {
		this.router = router;
		this.pageUri = pageUri;
		this.pageName = pageName;
	}
	
	prepareRender(generateContent, ...args) {
		this.router.get(this.pageUri, (req, res, next) =>{
			if(generateContent) {
				var contentValues = generateContent.call(null, args);
				res.locals = contentValues;
			}
			res.render(this.pageName);
		});
	}
}

module.exports = PageRender;