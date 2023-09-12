const XMLHttpRequest = require("xhr2");
const useIPv4AsName = false;
/*
	if set it to true this will log the first IPv4 address instead of the name (so you will know wich service it is exactly)
	if set to false the log will only log the name you have entered in the data array
*/
const data = [
    {
		name: "",
		token: "",          
		service: "",
		webhook: "",		
		lastState: "", // placeholder, will get filled by the script
		ipv4: null,
	},
    {
		name: "",
		token: "",          
		service: "",
		webhook: "",		
		lastState: "", // placeholder, will get filled by the script
		ipv4: null,
	},
];
const colors = {
	green: 0x00FF00,
	yellow: 0xFFFF00,
	orange: 0xFFAA00,
	red: 0xFF0000,
	gray: 0x696969,
	blue: 0x0000FF,
	lightblue: 0x00ffff,
	violet: 0x6900FF
}
const apiStateDesc = {
	stopping: {
		desc: "Force stoping",
		color: colors.orange
	},
	shutdown: {
		desc: "Shutting down",
		color: colors.yellow
	},
	starting: {
		desc: "Starting",
		color: colors.lightblue
	},
	running: {
		desc: "Online",
		color: colors.green
	},
	stopped: {
		desc: "Offline",
		color: colors.red
	},
	installing: {
		desc: "Service is installing",
		color: colors.lightblue
	},
	backupplanned: {
		desc: "Backup planned",
		color: colors.violet
	},
	restorebackup: {
		desc:"Restoring from Backup",
		color: colors.violet
	},
	createbackup: {
		desc:"Creating Backup",
		color: colors.violet
	},
	restoreplanned: {
		desc:"Restoring from Backup planned",
		color: colors.violet
	},
	preorder: {
		desc: "Preorded",
		color: colors.blue
	},
	deletedService: {
		desc:"Service got permanently deleted",
		color: colors.red
	},
	unk: {
		desc: "No data",
		color: colors.gray
	}
};

const userAgent = "XMLHttpRequest";
var rqDelay = data.length+1 || 2; // default 2 sec per service 2 sec delay (ratelimit is 30rq/60sec)


const sleep = ms => new Promise(r => setTimeout(r, ms));
function getURL(index, url) {
	if (url) return "https://backend.datalix.de/v1/service/" + data[index].service + "/" + url + "?token=" + data[index].token;
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
	xhr.onload = function() {
		console.log("Status update for " + data[index].name || "Service " + data[index].service)
	}
	const params = JSON.stringify({
		content: "",
		username: "Datalix Server Status Update",
		avatar_url: 'https://cdn.discordapp.com/icons/931996684215521300/b6cc0c8c05dbd8ed912685b8f0a205f9.webp?size=96',
		embeds: [out]
	});
	xhr.send(params);
}

function getServiceIP(index) {
	var xmlHttp = new XMLHttpRequest();
	var response = "";
	xmlHttp.open("GET", getURL(index, "ip"), true);
	xmlHttp.setRequestHeader('User-Agent', userAgent);
	xmlHttp.send();
	xmlHttp.onload = function() {
		response = JSON.parse(xmlHttp.response);
		if (!response || xmlHttp.status != 200 || (!response.ipv4[0] || !response.ipv4[0].ip)) {
			if (data[index].ipv4 == null) data[index].ipv4 = "Error getting IPv4 address.";
			data[index].name = "Error getting IPv4 address.";
			return;
		}
		data[index].ipv4 = response.ipv4[0].ip;
		data[index].name = data[index].ipv4;
	}
}

async function getServerStatus(index) {
	try {
		if (useIPv4AsName && (!data[index].ipv4 || data[index].ipv4 == "Error getting IPv4 address.")) {
			getServiceIP(index);
			sleep(269); // wait until api responded
		}
		var xmlHttp = new XMLHttpRequest();
		var response = "";
		const startTime = Date.now()
		xmlHttp.open("GET", getURL(index), true);
		xmlHttp.setRequestHeader('User-Agent', userAgent);
		xmlHttp.send();
		xmlHttp.onload = function() {
			try {
				if (xmlHttp.status == 429) {
					console.log("Ratelimited, new delay: " + rqDelay + " | " + xmlHttp.response);
					rqDelay++;
					return;
				}
				if (xmlHttp.status == 403) {
					if (!JSON.stringify(xmlHttp.response).match("Ihre Dienstleistung wurde unwiederruflich")) {
						console.log("Forbidden: " + xmlHttp.status + " | " + xmlHttp.response)
						return;
					}
					if (data[index].lastState == "deleted") return;
					const embedData = [
						{ name: "Service", value: data[index].name },
						{ name: "Status", value: apiStateDesc["deletedService"].desc }
					];
					sendEmbed(embedData, index, apiStateDesc["deletedService"].color);
					data[index].lastState = "deleted"
					return;
				}
				if (xmlHttp.status != 200) {
					console.log("HTTP error: " + xmlHttp.status);
					console.log(xmlHttp.response);
					return xmlHttp.status;
				}
				response = JSON.parse(xmlHttp.response);
				if (!response) {
					console.log("No data returned");
					return;
				}
				var additionalDetails = "";
				var locked = "No";
				var trafficLimit = "No";
				var state = {
					name: response.product.status,
					color: apiStateDesc["unk"].color
				}; 
				if (response.service.daysleft < 1) response.service.daysleft = "none";
				if (response.service.locked != 0) locked = "Yes, " + response.service.lockreason || "no info";
				if (!response.product.trafficlimitreached != 0) trafficLimit = "Yes"; // only available on KVMs

				if (!apiStateDesc[response.product.status]) {
					state.name = apiStateDesc["unk"].desc + "(" + toString(response.product.status) + ")";
					// dont need to set color as default is already the unk color
				} else {
					state.name = apiStateDesc[response.product.status].desc;
					state.color = apiStateDesc[response.product.status].color;
				}
				if (data[index].lastState == response.product.status) return;
				data[index].lastState = response.product.status;

				// some stuff isnt available on dedicated servers -> additional checks so it wont log node etc as there will never be any data
				if (response.product.node) additionalDetails += "> **node**: " + response.product.node + "\n"
				if (response.product.location) additionalDetails += "> **datacenter**: " + response.product.location + "\n"
				if (response.product.cluster) additionalDetails += "> **cluster**: " + response.product.cluster + "\n"
				if (response.product.trafficlimitreached) additionalDetails += "> **Traffic Limit Reached**: " + trafficLimit + "\n"
				additionalDetails += "> **Locked**: " + locked + "\n"
				additionalDetails += "> **Days left**: " + (response.service.daysleft || "No data") + " | **Price**: " + response.service.price + "€\n"
				additionalDetails += "> **API-Time**: " + (Date.now() - startTime) + "ms" || "No data" + "\n"

				const details = [
					{name: "Service", value: data[index].name || "No data"},
					{name: "Status", value: state.name},
					{name: response.service.productdisplay + " informations", value: additionalDetails}
				];
				sendEmbed(details, index, state.color)
			} catch (rushEsukabljat) {
				console.log(rushEsukabljat);
			}
		}
	} catch (rushEsuka) {
		console.log(rushEsuka);
	}
}

function main() {
	try {
		setTimeout(function() {
			main();
			for (i = 0; i < data.length; i++) {
				getServerStatus(i);
			}
		}, rqDelay*1000);
	} catch (e) {
		console.log(e);
	}
}
main();
