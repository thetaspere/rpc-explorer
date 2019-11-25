function displayAPIInfo(id, api, baseUrl) {
	if(!(api instanceof Object)) {
		api = JSON.parse(api);
	}
	var url = `${window.location.origin}${baseUrl}${api.uri}`;
	var infoHtml = `
	<li>Description: ${api.description}</li>
	`;
	if(api.params) {
		infoHtml += "<li> Parameters:<ul>";
		for(var i in api.params) {
			infoHtml += `<li>${api.params[i].name} - ${api.params[i].type}: ${api.params[i].description}</li>`;
			url += i == 0 ?`?${api.params[i].name}=x` : `&${api.params[i].name}=x`;
		}
		infoHtml += "</ul></li>";
	}
	if(api["return"]) {
		infoHtml += `<li>Return: ${api["return"]}</li>`;
	}
	updateElementValue(id, `<li>${url}</li>` + infoHtml, true);
}