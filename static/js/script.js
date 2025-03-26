// Initialize maps for both instances
const map1 = L.map('map-1').setView([48.136995, 11.576924], 13);
const map2 = L.map('map-2').setView([48.136995, 11.576924], 13);

// Add OpenStreetMap tiles to both maps
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map1);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map2);

// Store car markers and routes
const carMarkers = {};
const carRoutes = {};

// Function to update car position on map
function updateCarPosition(instanceId, lat, lng) {
    const map = instanceId === 1 ? map1 : map2;

    // Remove previous marker if exists
    if (carMarkers[instanceId]) {
        map.removeLayer(carMarkers[instanceId]);
    }

    // Create custom car icon
    const carIcon = L.icon({
        iconUrl: '/ports/12879/static/images/car-icon.png',
        iconSize: [40, 40],
        iconAnchor: [16, 16]
    });

    // Add new marker
    carMarkers[instanceId] = L.marker([lat, lng], {
        icon: carIcon,
        zIndexOffset: 1000
    }).addTo(map);

    // Add to route if it exists
    if (carRoutes[instanceId]) {
        carRoutes[instanceId].addLatLng([lat, lng]);
    } else {
        carRoutes[instanceId] = L.polyline([[lat, lng]], { color: 'red' }).addTo(map);
    }

    // Center map on new position
    map.setView([lat, lng], 13);
}

// Function to populate dropdown menus
async function loadFiles(dropdownId) {
    const baseUrl = '/ports/12879/data/';
    const response = await fetch(baseUrl);
    const text = await response.text();
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(text, 'text/html');
    const links = htmlDoc.querySelectorAll('a');

    const dropdown = document.getElementById(dropdownId);
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/data/historical_data_')) {
            const option = document.createElement('option');
            option.value = '/ports/12879' + href;
            option.textContent = href.replace('/data/historical_data_', ''); // Remove "/data/" from display
            dropdown.appendChild(option);
        }
    });
}

// Function to extract the unique code from the filename
function extractUniqueCode(filename) {
    const match = filename.match(/\d+/g);
    return match ? match[match.length - 1] : null;
}

// Function to load initial route data and draw the route on the map
async function loadInitialRouteAndDrawMap(map, uniqueCode, instanceId) {
    const initialRouteUrl = `/ports/12879/data/initial_route_${uniqueCode}.json`;
    try {
        const response = await fetch(initialRouteUrl);
        const jsonData = await response.json();

        // Clear ALL existing map layers except base tiles
        map.eachLayer(layer => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        // Clear references
        if (carMarkers[instanceId]) {
            delete carMarkers[instanceId];
        }
        if (carRoutes[instanceId]) {
            delete carRoutes[instanceId];
        }

        // Extract coordinates and draw new route
        const coordinates = jsonData.coordinates.map(coord => [coord[1], coord[0]]);
        L.polyline(coordinates, { color: '#6200ea' }).addTo(map);
        map.fitBounds(L.latLngBounds(coordinates));

        // Initialize new empty route for car tracking
        carRoutes[instanceId] = L.polyline([], { color: 'red' }).addTo(map);
    } catch (error) {
        console.error('Error loading initial route data:', error);
    }
}

// Chart management
const charts = {
    'speedLimit': {
        'chart-1': null,
        'chart-2': null
    },
    'trafficSpeed': {
        'chart-1': null,
        'chart-2': null
    }
};

function createChart(chartType, canvasId, initialData = null) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    // Destroy existing chart if it exists
    if (charts[chartType][canvasId]) {
        charts[chartType][canvasId].destroy();
    }

    const config = {
        type: 'line',
        data: {
            labels: initialData?.timestamps || [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Time' },
                    ticks: { autoSkip: true, maxTicksLimit: 20 }
                },
                y: {
                    display: true,
                    title: { display: true, text: 'Speed (km/h)' }
                }
            }
        }
    };

    if (chartType === 'speedLimit') {
        config.data.datasets = [
            {
                label: 'Current Speed',
                data: initialData?.current_speed || [],
                borderColor: '#6200ea',
                fill: false,
            },
            {
                label: 'Speed Limit',
                data: initialData?.current_speed_limit?.map(speed => speed === -1 ? 140 : speed) || [],
                borderColor: '#ff6384',
                borderDash: [5, 5],
                fill: false,
            },
            {
                label: 'Threshold',
                data: initialData?.threshold_values || [],
                borderColor: '#ffa500',
                borderDash: [3, 3],
                fill: false,
            }
        ];
    } else { // trafficSpeed
        config.data.datasets = [
            {
                label: 'Car Speed',
                data: initialData?.current_speed || [],
                borderColor: '#6200ea',
                fill: false,
            },
            {
                label: 'Traffic Speed',
                data: initialData?.traffic_speed || [],
                borderColor: '#00bcd4',
                fill: false,
            }
        ];
    }

    charts[chartType][canvasId] = new Chart(ctx, config);
    return charts[chartType][canvasId];
}

function updateChart(chartType, chartId, newData) {
    if (charts[chartType][chartId]) {
        const chart = charts[chartType][chartId];

        // Add new data point
        chart.data.labels.push(newData.timestamp);



        if (chartType === 'speedLimit') {
            chart.data.datasets[0].data.push(newData.current_speed);

            // Replace -1 with 140 for speed limit
            const updatedSpeedLimit = newData.current_speed_limit === -1 ? 140 : newData.current_speed_limit;
            chart.data.datasets[1].data.push(updatedSpeedLimit);

            // Add threshold value from car data
            chart.data.datasets[2].data.push(newData.current_threshold);
        } else { // trafficSpeed
            chart.data.datasets[0].data.push(newData.current_speed);
            const trafficSpeed = Array.isArray(newData.traffic_speed) ?
                (newData.traffic_speed.length > 0 ? newData.traffic_speed[0] : null) :
                newData.traffic_speed;
            chart.data.datasets[1].data.push(trafficSpeed);
        }

        // Limit the number of data points to keep the chart readable
        if (chart.data.labels.length > 50) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(dataset => {
                dataset.data.shift();
            });
        }

        chart.update();
    }
}


// Helper function to find closest traffic data by timestamp
function findClosestTrafficData(carTime, trafficData) {
    if (!trafficData || trafficData.length === 0) return null;

    const carTimeParts = carTime.split(':');
    const carSeconds = parseInt(carTimeParts[0]) * 3600 +
        parseInt(carTimeParts[1]) * 60 +
        parseInt(carTimeParts[2]);

    let closest = null;
    let smallestDiff = Infinity;

    trafficData.forEach(traffic => {
        const trafficTime = traffic.timestamps.split(' ')[1];
        const trafficTimeParts = trafficTime.split(':');
        const trafficSeconds = parseInt(trafficTimeParts[0]) * 3600 +
            parseInt(trafficTimeParts[1]) * 60 +
            parseInt(trafficTimeParts[2]);

        const diff = Math.abs(trafficSeconds - carSeconds);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closest = traffic;
        }
    });

    return closest;
}

const lastData = {
    1: { car: null, traffic: null, weather: null },
    2: { car: null, traffic: null, weather: null }
};

// Function to update the SSE connection with the instance_id
function updateSSEConnection(instanceId, uniqueCode) {
    // Close the existing EventSource connection (if any)
    if (window[`eventSource${instanceId}`]) {
        window[`eventSource${instanceId}`].close();
    }

    // Create a new EventSource with the instance_id as a query parameter
    const sseUrl = `https://lehre.bpm.in.tum.de/ports/12879/sse?instance_id=${uniqueCode}`;
    window[`eventSource${instanceId}`] = new EventSource(sseUrl);

    window[`eventSource${instanceId}`].onmessage = function (event) {
        const data = JSON.parse(event.data);
        const now = new Date();
        const timestamp = now.toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Berlin'
        }).replace(',', '');

        const dataChanged =
            JSON.stringify(data.car) !== JSON.stringify(lastData[instanceId].car) ||
            JSON.stringify(data.traffic) !== JSON.stringify(lastData[instanceId].traffic) ||
            JSON.stringify(data.weather) !== JSON.stringify(lastData[instanceId].weather);

        if (!dataChanged) {
            console.log(`Instance ${instanceId}: Data not changed, skipping update`);
            return;
        }

        lastData[instanceId] = {
            car: { ...data.car },
            traffic: { ...data.traffic },
            weather: { ...data.weather }
        };

        // Update weather data
        const weatherOutput = document.getElementById(`weatherOutput-${instanceId}`);
        if (data["weather"]) {
            weatherOutput.textContent = JSON.stringify(data["weather"], null, 2);
        }

        // Update traffic data
        const trafficOutput = document.getElementById(`trafficOutput-${instanceId}`);
        if (data["traffic"]) {
            trafficOutput.textContent = JSON.stringify(data["traffic"], null, 2);
        }

        // Update car data and position
        const carOutput = document.getElementById(`carOutput-${instanceId}`);
        if (data["car"]) {
            carOutput.textContent = JSON.stringify(data["car"], null, 2);

            // Update arrival status
            const arrivalStatus = document.getElementById(`arrivalStatus-${instanceId}`);
            if (data["car"].arrived) {
                arrivalStatus.textContent = "Status: ARRIVED";
                arrivalStatus.style.color = "green";
                arrivalStatus.style.fontWeight = "bold";
            } else {
                arrivalStatus.textContent = "Status: In Transit";
                arrivalStatus.style.color = "";
                arrivalStatus.style.fontWeight = "";
            }

            // Update car position on map
            if (data["car"].current_latitude && data["car"].current_longitude) {
                updateCarPosition(
                    instanceId,
                    data["car"].current_latitude,
                    data["car"].current_longitude
                );
            }

            // Update charts if car hasn't arrived
            if (!data["car"].arrived) {
                // Update speed limit chart
                updateChart('speedLimit', `chart-speed-limit-${instanceId}`, {
                    timestamp: timestamp,
                    current_speed: data["car"].current_speed,
                    current_speed_limit: data["car"].current_speed_limit,
                    current_threshold: data["car"].current_threshold
                });

                // Update traffic comparison chart if we have traffic data
                if (data["traffic"]) {
                    updateChart('trafficSpeed', `chart-traffic-speed-${instanceId}`, {
                        timestamp: timestamp,
                        current_speed: data["car"].current_speed,
                        traffic_speed: data["traffic"].live_speeds
                    });
                }
            }
        }
    };

    // Handle errors
    window[`eventSource${instanceId}`].onerror = function (error) {
        console.error(`Error occurred for instance ${instanceId}:`, error);
        const weatherOutput = document.getElementById(`weatherOutput-${instanceId}`);
        const trafficOutput = document.getElementById(`trafficOutput-${instanceId}`);
        const carOutput = document.getElementById(`carOutput-${instanceId}`);

        weatherOutput.textContent = 'Error occurred while fetching weather data.';
        trafficOutput.textContent = 'Error occurred while fetching traffic data.';
        carOutput.textContent = 'Error occurred while fetching car data.';
    };
}

function findClosestCarData(trafficTime, carData) {
    if (!carData || carData.length === 0) return null;

    const trafficTimeValue = trafficTime.getTime();

    let closest = null;
    let smallestDiff = Infinity;

    carData.forEach(car => {
        const carTime = new Date(car.timestamp).getTime();
        const diff = Math.abs(carTime - trafficTimeValue);
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closest = car;
        }
    });

    return closest;
}

async function loadDataAndUpdateChart(dropdownId, instanceId) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.addEventListener('change', async function () {
        createChart('speedLimit', `chart-speed-limit-${instanceId}`);
        createChart('trafficSpeed', `chart-traffic-speed-${instanceId}`);
        const fileUrl = this.value;
        if (!fileUrl) return;

        try {
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData = await response.json();

            // Use traffic timestamps as the primary time reference
            const trafficTimestamps = jsonData.traffic.map(traffic => {
                const date = new Date(traffic.timestamps);
                return date.toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Berlin'
                }).replace(',', '');
            });

            // Process car data to align with traffic timestamps
            const carSpeeds = [];
            const carSpeedLimits = [];
            const carDataMap = {};

            // Create a map of car data by timestamp
            jsonData.car.forEach(car => {
                const date = new Date(car.timestamp);
                const timeKey = date.toLocaleString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Europe/Berlin'
                });
                carDataMap[timeKey] = {
                    speed: car.current_speed,
                    limit: car.current_speed_limit
                };
            });

            // Match car speeds with traffic timestamps
            jsonData.traffic.forEach(traffic => {
                const trafficTime = new Date(traffic.timestamps);
                const timeKey = trafficTime.toLocaleString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Europe/Berlin'
                });

                if (carDataMap[timeKey]) {
                    carSpeeds.push(carDataMap[timeKey].speed);
                    carSpeedLimits.push(carDataMap[timeKey].limit);
                } else {
                    // If no exact match, find the closest car data
                    const closestCar = findClosestCarData(trafficTime, jsonData.car);
                    carSpeeds.push(closestCar ? closestCar.current_speed : null);
                    carSpeedLimits.push(closestCar ? closestCar.current_speed_limit : null);
                }
            });

            // Get traffic speeds
            const trafficSpeeds = jsonData.traffic.map(traffic => traffic.live_speeds);

            // Initialize both charts with traffic timestamps
            // In the loadDataAndUpdateChart function, update the chart initialization:
            createChart('speedLimit', `chart-speed-limit-${instanceId}`, {
                timestamps: trafficTimestamps,
                current_speed: carSpeeds,
                current_speed_limit: carSpeedLimits.map(limit => limit === -1 ? 140 : limit),
                threshold_values: jsonData.car.map(car => car.current_threshold),
                car: jsonData.car  // Pass car data for threshold initialization
            });

            createChart('trafficSpeed', `chart-traffic-speed-${instanceId}`, {
                timestamps: trafficTimestamps,
                current_speed: carSpeeds,
                traffic_speed: trafficSpeeds
            });

            // Extract unique code (instance_id) from the filename
            const uniqueCode = extractUniqueCode(fileUrl);
            if (uniqueCode) {
                // Load and draw the initial route
                await loadInitialRouteAndDrawMap(
                    instanceId === 1 ? map1 : map2,
                    uniqueCode,
                    instanceId
                );

                // Update the SSE URL with the instance_id
                updateSSEConnection(instanceId, uniqueCode);
            }
        } catch (error) {
            console.error('Error loading JSON data:', error);
        }
    });
}

// Initialize everything when page loads
window.onload = function () {
    if (window.eventSource1) window.eventSource1.close();
    if (window.eventSource2) window.eventSource2.close();

    // Clear existing chart data
    Object.keys(charts.speedLimit).forEach(id => {
        if (charts.speedLimit[id]) charts.speedLimit[id].destroy();
    });
    Object.keys(charts.trafficSpeed).forEach(id => {
        if (charts.trafficSpeed[id]) charts.trafficSpeed[id].destroy();
    });
    loadFiles('file-select-1');
    loadFiles('file-select-2');

    // Initialize empty charts
    createChart('speedLimit', 'chart-speed-limit-1');
    createChart('trafficSpeed', 'chart-traffic-speed-1');
    createChart('speedLimit', 'chart-speed-limit-2');
    createChart('trafficSpeed', 'chart-traffic-speed-2');

    // Set up event listeners
    loadDataAndUpdateChart('file-select-1', 1);
    loadDataAndUpdateChart('file-select-2', 2);
};