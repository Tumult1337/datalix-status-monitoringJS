const XMLHttpRequest = require("xhr2");
const userAgent = "XMLHttpRequest"
const data = [
	{
		token: "", //api token
		service: "", // service id
		webhook: "", // discord webhook
		ipv4: "", // placeholder, will get filled by the script
		lastState: "", // placeholder, will get filled by the script
	},
	{
		token: "", //api token2(can be the same as the first one, only need a different one if you request for another account)
		service: "", // service id2
		webhook: "", // discord webhook2
		ipv4: "", // placeholder, will get filled by the script
		lastState: "", // placeholder, will get filled by the script
	},
];
var rqDelay = data.length || 2; // default 2 sec per service 2 sec delay (ratelimit is 30rq/60sec)
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
};

function getURL(url, index) {
	if (url) {
		return "https://backend.datalix.de/v1/service/" + data[index].service + "/" + url + "?token=" + data[index].token;
	}
	return "https://backend.datalix.de/v1/service/" + data[index].service + "?token=" + data[index].token;
};

function sendEmbed(details, index) {
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
		'color': 0x00FF00,
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
		console.log("Status update for " + data[index].ipv4)
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
			console.log("HTTP error: " + xmlHttp.status);
			return xmlHttp.status;
		}
		response = JSON.parse(xmlHttp.response);	
		if (!response) { 
			console.log("no data returned");
			return "no data";
		}
		if (status == "ip") {
			data[index].ipv4 = response.ipv4[0].ip;
		} else if (!status) {
			var locked = "No"
			if (response.service.locked != 0) {
				locked = "Yes, " + response.service.lockreason || "Not available"
			}
			var state = response.product.status || "No data";
			if (data[index].lastState == state) {
				console.log("Same State, not sending notification");
				return;
			}
			if (!statusDesc[state]) {
				state = "Unknown State"
			}
			data[index].lastState = state;
			if (response.product.trafficlimitreached != 0) {
				var trafficLimit = "Yes"
			}
			//////////////////////////////////////////////////		   
			const details = [
				{name: "IP", value: data[index].ipv4 || "No data"},
				{name: "Status", value: statusDesc[state] || "No data"},				
				{
					name: response.service.productdisplay + " informations",
					value: "**Locked**:	 " + (locked || "No data") + "\n" +
					"**Traffic limit Reached**:	 " + (trafficLimit || "No") + "\n" +
					"**OS**:	 " + (response.product.ostype || "No data") + "\n" +
					"**node**:	 " + (response.product.node || "No data") + "\n" +
					"**Datacenter**:	 " + (response.product.location || "No data") + "\n" +
					"**cluster**:	 " + (response.product.cluster || "No data") + "\n" +					
					"**daysleft**:	 " + (response.service.daysleft || "No data") + "\n" +
					"**API-Time**:	 " + ((Date.now() - startTime) + "ms" || "No data") + "\n"
				}
			]
			sendEmbed(details, index)
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
				setTimeout(getServerStatus, i*900, i, "ip"); //first request ip then the rest
				setTimeout(getServerStatus, i*1000, i);
			}
		}, rqDelay*1000);
	} catch (e) {
		console.log(e);
	}
}
main();
