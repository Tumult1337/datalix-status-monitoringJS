const XMLHttpRequest = require("xhr2");
const data = [
	{
		token: "", //api token
		service: "", // service id
		webhook: "", // discord webhook
		ipv4: null, // placeholder, will get filled by the script
		lastState: "", // placeholder, will get filled by the script
	},
	{
		token: "", //api token2(can be the same as the first one, only need a different one if you request for another account)
		service: "", // service id2
		webhook: "", // discord webhook2
		ipv4: null,
		lastState: "",
	},
];
const userAgent = "XMLHttpRequest"
const statusDesc = {
	stopping: "Force stoping",
	shutdown: "Shutting down",
	starting: "Starting",
	running: "Online",
	stopped: "Offline",
	installing: "Service is installing",
	backupplanned: "Backup planned",	
	restorebackup: "Restoring from Backup",
	createbackup: "Creating Backup",
	restoreplanned: "Restoring from Backup planned",	
	preorder: "Preorded",
	deletedService: "Service got permanently deleted",
	unk: "No data"
};

var rqDelay = data.length || 2; // default 2 sec per service 2 sec delay (ratelimit is 30rq/60sec)

function getURL(url, index) {
	if (url) {
		return "https://backend.datalix.de/v1/service/" + data[index].service + "/" + url + "?token=" + data[index].token;
	}
	return "https://backend.datalix.de/v1/service/" + data[index].service + "?token=" + data[index].token;
};

function sendEmbed(details, index, color) {	
	const out = {
		'author': {
			name: 'Datalix Server Status',
			icon_url: 'https://cdn.discordapp.com/emojis/1036683357234409473.webp?size=96&quality=lossless',
			url: 'https://datalix.de/cp/service/'+data[index].service,
		},
		thumbnail: {
			url: 'https://cdn.datalix.de/images/header.png',
		},
		'title': "Server Status Update",
		'url': "https://datalix.de/cp/service/"+data[index].service,
		'color': color,
		fields: details,
		timestamp: new Date(),
	}
	////////////////////////////////////////
	const xhr = new XMLHttpRequest();
	xhr.open("POST", data[index].webhook, true);
	xhr.setRequestHeader('Content-type', 'application/json');
	const params = {
		content: "",
		username: "Datalix Server Status Update",
		avatar_url: 'https://cdn.discordapp.com/icons/931996684215521300/b6cc0c8c05dbd8ed912685b8f0a205f9.webp?size=96',
		embeds: [out]
	}
	xhr.onload = function() {
		console.log("Status update for " + data[index].ipv4 || "No data")
	}
	xhr.send(JSON.stringify(params));
}

function getServerStatus(index, status) {
	var xmlHttp = new XMLHttpRequest();
	var response = "";
	const startTime = Date.now()
	xmlHttp.open("GET", getURL(status, index), true);
	xmlHttp.setRequestHeader('User-Agent', userAgent);
	xmlHttp.send();
	xmlHttp.onload = () => {
		if (xmlHttp.status == 429) {
			rqDelay++;
			console.log("Ratlimited, new delay: " + rqDelay);
			return;
		}
		if (xmlHttp.status != 200) {			
			if (JSON.stringify(xmlHttp.response).match("Ihre Dienstleistung wurde unwiederruflich")) {				
				if (data[index].lastState != "deleted") {
					console.log(xmlHttp.response)
					sendEmbed([
						{name: "IP", value: data[index].ipv4 || "No data"},
						{name: "Status", value: statusDesc["deletedService"]}				
					], index, 0xFF0000);
				}				
				data[index].lastState = "deleted"
				return;
			}
			console.log("HTTP error: " + xmlHttp.status);
			console.log(xmlHttp.response);
			return xmlHttp.status;
		}
		response = JSON.parse(xmlHttp.response);	
		if (!response) { 
			console.log("no data returned");
			return "no data";
		}
		if (status == "ip") {
			if (response.ipv4[0] && response.ipv4[0].ip) {
				data[index].ipv4 = response.ipv4[0].ip;
			} 
		} else if (!status) {
			var color = 0x00FF00
			if (response.product.status != "running") {
				color = 0xFFFF00
			}			
			var locked = "No"
			if (response.service.locked != 0) {
				locked = "Yes, " + response.service.lockreason || "Not available"
				color = 0xFF0000
			}
			var state = response.product.status || "No data";

			if (!statusDesc[state]) {
				state = statusDesc["unk"] + "(" + toString(response.product.status) + ")" 
				color = 0x696969			}
			
			if (response.product.trafficlimitreached != 0) {
				var trafficLimit = "Yes"
				color = 0xFF0000
			}
			if (response.service.daysleft < 1) {
				response.service.daysleft = "none"
				color = 0xFF0000
			}
			if (data[index].lastState == state) {
				return;
			}
			data[index].lastState = state;
			//////////////////////////////////////////////////		   
			const details = [
				{name: "IP", value: data[index].ipv4 || "No data"},
				{name: "Status", value: statusDesc[state] || statusDesc["unk"]},				
				{
					name: response.service.productdisplay + " informations",
					value: "**Locked**:	 " + (locked || "No data") + "\n" +
					"**Traffic limit Reached**:	 " + (trafficLimit || "No") + "\n" +
					"**node**:	 " + (response.product.node || "No data") + "\n" +
					"**Datacenter**:	 " + (response.product.location || "No data") + "\n" +
					"**cluster**:	 " + (response.product.cluster || "No data") + "\n" +					
					"**daysleft**:	 " + (response.service.daysleft || "No data") + "\n" +
					"**API-Time**:	 " + ((Date.now() - startTime) + "ms" || "No data") + "\n"
				}
			]
			sendEmbed(details, index, color)
		} else {
			console.log("Unkown status URL:" + status);
			console.log(response);
			return; 
		}
	}
}

function main() {		
	try {	
		setTimeout(function() {
			main();
			for (i = 0; i < data.length; i++) {
				setTimeout(getServerStatus, i*800, i, "ip"); //first request ip then the rest
				setTimeout(getServerStatus, i*1000, i);
			}
		}, rqDelay*1000);
	} catch (e) {
		console.log(e);
	}
}
main();

