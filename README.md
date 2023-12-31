# Datalix Server Status Monitor

This script is designed to monitor the status of servers managed by the Datalix service. It retrieves server information using the Datalix API and sends status updates to a Discord webhook. The script is written in JavaScript and utilizes the `XMLHttpRequest` library for making HTTP requests.

## Prerequisites

- Node.js (>= 10.0.0) -> install it with
```bash
  curl https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash 
  source ~/.bashrc
  nvm install node
  npm install -g npm@latest
```
- `xhr2` library

## Setup

1. Clone this repository to your local machine.
2. Install the required dependencies using the following command:
```bash
npm install xhr2
```
3. Edit the `index.js` file to provide the necessary information.

## Configuration

Open the `index.js` file and locate the `data` array. This array contains server-specific configuration details:

```javascript
const data = [
 {
 	name: "",
 	token: "", // Datalix API token
 	service: "", // Service ID
 	webhook: "", // Discord webhook
 },
];
```
- `name:` Name that will get logged (not needed if you set 'useIPv4AsName' to true)
- `token:` Your Datalix API token.
- `service:` The service ID of the server you want to monitor.
- `webhook:` The Discord webhook URL where status updates will be sent.
- set a color for every status (hex) or use the predefined ones.
## Running the Script

1. Open a terminal and navigate to the directory containing the `index.js` file.
2. Run the script using the following command:
   
   ```sh
   node index.js
   ```
or
## Create a background service
```bash
username="root" # If u dont use root, you have to edit the path to /home/$username
echo -e "[Unit]
Description=datalixStatus
Wants=network-online.target
After=syslog.target network.target nss-lookup.target network-online.target

[Service]
Environment=\"LD_LIBRARY_PATH=./linux64\"
ExecStart=/$username/.nvm/versions/node/v20.5.1/bin/node /$username/status.js
User=$username
Group=$username
StandardOutput=journal
Restart=never
WorkingDirectory=/$username/

[Install]
WantedBy=multi-user.target">/etc/systemd/system/status.service
sudo systemctl start status
sudo systemctl enable status
```
![KVM-example](https://cdn.discordapp.com/attachments/1023665572539539549/1151219192989757440/image.png)
![Dedi-example](https://cdn.discordapp.com/attachments/1023665572539539549/1151219581780762775/image.png)
## Script Details
- Please note that this script relies on external services (Datalix API and Discord) for proper functionality. Make sure you have valid API tokens and webhook URLs for accurate monitoring and updates.
- Global ratelimit is 120rq/min per ip so you can only add up to 60 services *MAX* (or you need an aditional server/ip for the requests and a second instance of the script)
- For more information about Datalix and their services, visit https://datalix.de / https://apidoc.datalix.de


`idea from https://github.com/AsylCeo/Datalix-Status`
