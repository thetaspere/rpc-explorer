function displayAPIInfo(id, api) {
	var infoHtml = `<li>${api.description}</li>`;
	if(api.params) {
		infoHtml += "<li> Parameters:<ul>";
		for(var i in api.params) {
			infoHtml += `<li>${api.params[i].name} - ${api.params[i].type}: {api.params[i].description}</li>`;
		}
		infoHtml += "</ul></li>";
	}
	if(api["return"]) {
		infoHtml += `<li>Return: ${api["return"]}</li>`;
	}
	updateElementValue(id, infoHtml, true);
}