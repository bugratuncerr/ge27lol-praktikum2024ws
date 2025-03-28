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
    const dropdown = document.getElementById(dropdownId);
    
    // Keep the first option (default) and remove others
    while (dropdown.options.length > 1) {
      dropdown.remove(1);
    }
  
    try {
      const response = await fetch('/ports/12879/data/');
      const text = await response.text();
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(text, 'text/html');
      const links = htmlDoc.querySelectorAll('a');
  
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('/data/historical_data_')) {
          const option = new Option(
            href.replace('/data/historical_data_', ''),
            '/ports/12879' + href
          );
          dropdown.add(option);
        }
      });
  
      // Reset to default selection
      dropdown.selectedIndex = 0;
      
    } catch (error) {
      console.error('Error loading files:', error);
      const errorOption = new Option('Error loading files', '');
      dropdown.add(errorOption);
    }
  }

  

  async function reloadFiles(instanceId) {
    const dropdownId = `file-select-${instanceId}`;
    const dropdown = document.getElementById(dropdownId);
    
    // Clear existing options
    while (dropdown.options.length > 1) {
      dropdown.remove(1);
    }
    
    // Reload files
    await loadFiles(dropdownId);
    
    dropdown.selectedIndex = 0;
  }
  
  // Add click handlers to all reload buttons
  document.querySelectorAll('.reload-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const instanceId = button.getAttribute('data-instance');
      button.disabled = true;
      button.textContent = 'Loading...';
      
      await reloadFiles(instanceId);
      
      button.disabled = false;
      button.textContent = 'Reload';
    });
  });

function calculateExactReduction(threshold) {
    // Cap threshold at 50 first
    const cappedThreshold = Math.min(threshold, 50);

    // Calculate exact reduction percentage
    let reduction;
    if (cappedThreshold <= 10) {
        reduction = cappedThreshold * 1.0;
    } else if (cappedThreshold <= 30) {
        reduction = 10 + (cappedThreshold - 10) * 1.5;
    } else {
        reduction = 40 + (cappedThreshold - 30) * 1.0;
    }
    // Convert to percentage (0-100 scale)
    return Math.min(reduction, 60); // Cap at 60% as maximum reduction
}

function updateThresholdInfo(instanceId, currentThreshold) {
    const exactReduction = calculateExactReduction(currentThreshold);

    let intensity = "";
    if (currentThreshold >= 0 && currentThreshold <= 10) {
        intensity = "Minimal";
    } else if (currentThreshold <= 25) {
        intensity = "Moderate";
    } else if (currentThreshold <= 40) {
        intensity = "High";
    } else if (currentThreshold <= 50) {
        intensity = "Maximum";
    } else {
        intensity = "Unknown";
    }

    const thresholdOutput = document.getElementById(`thresholdOutput-${instanceId}`);
    thresholdOutput.innerHTML = [
        `<strong>Speed Reduction Factor:</strong> ${currentThreshold}`,
        `<strong>Intensity:</strong> ${intensity}`,
        `<strong>Calculated Speed Reduction:</strong> ${exactReduction.toFixed(1)}%`
    ].join('\n');
}


function updateWeatherOutput(instanceId, data) {
    const weatherOutput = document.getElementById(`weatherOutput-${instanceId}`);
    weatherOutput.innerHTML = [
        `<strong>Timestamp:</strong> ${data.timestamps}`,
        `<strong>Temperature:</strong> ${data.temperatures}\u00B0C`,
        `<strong>Condition:</strong> ${data.weather_conditions}`,
        `<strong>Visibility:</strong> ${data.visibility} km`,
        `<strong>Location:</strong> ${data.location}`
    ].join('\n');
}

// Update traffic data display
function updateTrafficOutput(instanceId, data) {
    const trafficOutput = document.getElementById(`trafficOutput-${instanceId}`);
    trafficOutput.innerHTML = [
        `<strong>Live Speed:</strong> ${data.live_speeds} km/h`,
        `<strong>Free Flow:</strong> ${data.free_flow_speeds} km/h`,
        `<strong>Confidence:</strong> ${(data.confidence * 100).toFixed(1)}%`,
        `<strong>Road Closure:</strong> ${data.road_closure ? 'Yes' : 'No'}`,
        `<strong>Incidents:</strong> ${data.incidents || 'None'}`
    ].join('\n');
}

// Update car data display (already has bold labels)
function updateCarOutput(instanceId, data) {
    const carOutput = document.getElementById(`carOutput-${instanceId}`);
    carOutput.innerHTML = [
        `<div class="car-data-line"><strong>Speed:</strong> ${data.current_speed} km/h</div>`,
        `<div class="car-data-line"><strong>Limit:</strong> ${data.current_speed_limit === -1 ? 'None' : data.current_speed_limit + ' km/h'}</div>`,
        `<div class="car-data-line"><strong>Headlights:</strong> <span class="light-status ${data.lights ? 'on' : 'off'}">${data.lights ? 'ON' : 'OFF'}</span></div>`,
        `<div class="car-data-line"><strong>Fog Lights:</strong> <span class="light-status ${data.fog_lights ? 'on' : 'off'}">${data.fog_lights ? 'ON' : 'OFF'}</span></div>`
    ].join('');
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
                label: 'Calculated Car Speed',
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
                label: 'Speed Reduction Factor',
                data: initialData?.threshold_values || [],
                borderColor: '#ffa500',
                borderDash: [3, 3],
                fill: false,
            }
        ];
    } else { // trafficSpeed
        config.data.datasets = [
            {
                label: 'Calculated Car Speed',
                data: initialData?.current_speed || [],
                borderColor: '#6200ea',
                fill: false,
            },
            {
                label: 'TomTom Live Speed',
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
            const updatedSpeedLimit = newData.current_speed_limit === -1 ? 140 : newData.current_speed_limit;
            chart.data.datasets[1].data.push(updatedSpeedLimit);
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

const lastData = {
    1: { car: null, traffic: null, weather: null },
    2: { car: null, traffic: null, weather: null }
};

const lastCarPositions = {
    1: { lat: null, lng: null },
    2: { lat: null, lng: null }
};

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

        // Update weather data
        if (data["weather"]) {
            updateWeatherOutput(instanceId, data.weather);
        }

        // Update traffic data
        if (data["traffic"]) {
            updateTrafficOutput(instanceId, data.traffic);
        }

        // Update car data and position
        if (data["car"]) {
            updateCarOutput(instanceId, data.car);
            updateThresholdInfo(instanceId, data.car.current_threshold);

            // Update arrival status
            const arrivalStatus = document.getElementById(`arrivalStatus-${instanceId}`);
            if (data["car"].arrived) {
                arrivalStatus.textContent = "Status: ARRIVED";
                arrivalStatus.style.color = "white";
                arrivalStatus.style.backgroundColor = "#4CAF50";
                arrivalStatus.style.fontWeight = "bold";

            } else {
                arrivalStatus.textContent = "Status: In Transit";
                arrivalStatus.style.color = "";
                arrivalStatus.style.backgroundColor = "";
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
            // 1. Car hasn't arrived AND
            // 2. Position has changed from last known position OR this is the first position
            if (data["car"] && !data["car"].arrived) {
                const currentLat = data["car"].current_latitude;
                const currentLng = data["car"].current_longitude;
                const lastPos = lastCarPositions[instanceId];

                // Check if position has changed (or if it's the first position)
                if (currentLat !== lastPos.lat || currentLng !== lastPos.lng) {
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

                    // Update last known position
                    lastCarPositions[instanceId] = {
                        lat: currentLat,
                        lng: currentLng
                    };
                }
            }


            if (data["weather"] && data["traffic"] && data["car"]) {
                createThresholdRadar(instanceId, {
                    weather: data["weather"],
                    traffic: data["traffic"],
                    car: data["car"]
                });
            }
        }
    };

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

function processHistoricalData(jsonData) {
    const alignedData = [];
    const carDataMap = new Map();

    // Create map of car data by timestamp (milliseconds)
    jsonData.car.forEach(car => {
        const time = new Date(car.timestamp).getTime();
        carDataMap.set(time, {
            speed: car.current_speed,
            limit: car.current_speed_limit,
            threshold: car.current_threshold,
            lat: car.current_latitude,
            lng: car.current_longitude,
            fog_lights: car.fog_lights,
            arrived: car.arrived
        });
    });

    // Process traffic data and align with car data
    jsonData.traffic.forEach(traffic => {
        const trafficTime = new Date(traffic.timestamps).getTime();

        // Find closest car data within 30 seconds
        let closestCar = null;
        let smallestDiff = Infinity;

        carDataMap.forEach((carData, carTime) => {
            const diff = Math.abs(carTime - trafficTime);
            if (diff < smallestDiff && diff <= 30000) {
                smallestDiff = diff;
                closestCar = carData;
            }
        });

        // Find corresponding weather data
        const weather = jsonData.weather.find(w =>
            new Date(w.timestamps).getTime() === trafficTime
        );

        if (closestCar) {
            alignedData.push({
                timestamp: new Date(traffic.timestamps).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Berlin'
                }).replace(',', ''),
                carSpeed: closestCar.speed,
                carSpeedLimit: closestCar.limit,
                carThreshold: closestCar.threshold,
                carLights: closestCar.lights,
                carFogLights: closestCar.fog_lights,
                carArrived: closestCar.arrived,
                trafficSpeed: traffic.live_speeds,
                trafficFreeFlow: traffic.free_flow_speeds,
                trafficConfidence: traffic.confidence,
                roadClosure: traffic.road_closure,
                incidents: traffic.incidents,
                weather: weather ? {
                    temperature: weather.temperatures,
                    condition: weather.weather_conditions,
                    visibility: weather.visibility,
                    location: weather.location
                } : null
            });
        }
    });

    return alignedData;
}

async function loadDataAndUpdateChart(dropdownId, instanceId) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.addEventListener('change', async function () {
        const fileUrl = this.value;
        if (!fileUrl) return;
        try {
            const response = await fetch(fileUrl, {
                cache: 'no-store' //Cache prevention
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const jsonData = await response.json();

            // Process and align all data types
            const processedData = processHistoricalData(jsonData);


            // Update charts with aligned data
            createChart('speedLimit', `chart-speed-limit-${instanceId}`, {
                timestamps: processedData.map(d => d.timestamp),
                current_speed: processedData.map(d => d.carSpeed),
                current_speed_limit: processedData.map(d => d.carSpeedLimit === -1 ? 140 : d.carSpeedLimit),
                threshold_values: processedData.map(d => d.carThreshold)
            });

            createChart('trafficSpeed', `chart-traffic-speed-${instanceId}`, {
                timestamps: processedData.map(d => d.timestamp),
                current_speed: processedData.map(d => d.carSpeed),
                traffic_speed: processedData.map(d => d.trafficSpeed)
            });

            // Update map with initial position
            if (jsonData.car.length > 0) {
                const firstCarData = jsonData.car[0];
                updateCarPosition(
                    instanceId,
                    firstCarData.current_latitude,
                    firstCarData.current_longitude
                );
            }

            // Update info displays with bold labels
            if (jsonData.weather && jsonData.weather.length > 0) {
                const weather = jsonData.weather[jsonData.weather.length - 1];

                document.getElementById(`weatherOutput-${instanceId}`).innerHTML = [
                    `<strong>Timestamp:</strong> ${weather.timestamps}`,
                    `<strong>Temperature:</strong> ${weather.temperatures}\u00B0C`,
                    `<strong>Condition:</strong> ${weather.weather_conditions}`,
                    `<strong>Visibility:</strong> ${weather.visibility} km`,
                    `<strong>Location:</strong> ${weather.location}`
                ].join('\n');
            }

            if (jsonData.traffic && jsonData.traffic.length > 0) {
                const traffic = jsonData.traffic[jsonData.traffic.length - 1];
                document.getElementById(`trafficOutput-${instanceId}`).innerHTML = [
                    `<strong>Live Speed:</strong> ${traffic.live_speeds} km/h`,
                    `<strong>Free Flow:</strong> ${traffic.free_flow_speeds} km/h`,
                    `<strong>Confidence:</strong> ${(traffic.confidence * 100).toFixed(1)}%`,
                    `<strong>Road Closure:</strong> ${traffic.road_closure ? 'Yes' : 'No'}`,
                    `<strong>Incidents:</strong> ${traffic.incidents || 'None'}`
                ].join('\n');
            }

            if (jsonData.car && jsonData.car.length > 0) {
                const car = jsonData.car[jsonData.car.length - 1];
                document.getElementById(`carOutput-${instanceId}`).innerHTML = [
                    `<div class="car-data-line"><strong>Speed:</strong> ${car.current_speed} km/h</div>`,
                    `<div class="car-data-line"><strong>Limit:</strong> ${car.current_speed_limit === -1 ? 'None' : car.current_speed_limit + ' km/h'}</div>`,
                    `<div class="car-data-line"><strong>Headlights:</strong> <span class="light-status ${car.lights ? 'on' : 'off'}">${car.lights ? 'ON' : 'OFF'}</span></div>`,
                    `<div class="car-data-line"><strong>Fog Lights:</strong> <span class="light-status ${car.fog_lights ? 'on' : 'off'}">${car.fog_lights ? 'ON' : 'OFF'}</span></div>`
                ].join('');

                // Update threshold info with bold labels
                updateThresholdInfo(instanceId, car.current_threshold);


                const arrivalStatus = document.getElementById(`arrivalStatus-${instanceId}`);
                if (car.arrived) {
                    arrivalStatus.textContent = "Status: ARRIVED";
                    arrivalStatus.style.color = "white";
                    arrivalStatus.style.backgroundColor = "#4CAF50";
                    arrivalStatus.style.fontWeight = "bold";

                } else {
                    arrivalStatus.textContent = "Status: In Transit";
                    arrivalStatus.style.color = "";
                    arrivalStatus.style.backgroundColor = "";
                    arrivalStatus.style.fontWeight = "";
                }
                // Update map with final position if coordinates exist


                updateThresholdInfo(instanceId, car.current_threshold);
            }

            if (jsonData.weather && jsonData.traffic && jsonData.car) {
                const car = jsonData.car[jsonData.car.length - 1];
                const traffic = jsonData.traffic[jsonData.traffic.length - 1];
                const weather = jsonData.weather[jsonData.weather.length - 1];
                createThresholdRadar(instanceId, {
                    weather: car,
                    traffic: traffic,
                    car: weather
                });
            }


            // Extract unique code and update SSE
            const uniqueCode = extractUniqueCode(fileUrl);
            if (uniqueCode) {
                await loadInitialRouteAndDrawMap(
                    instanceId === 1 ? map1 : map2,
                    uniqueCode,
                    instanceId
                );
                updateSSEConnection(instanceId, uniqueCode);
            }
        } catch (error) {
            console.error('Error loading JSON data:', error);
        }
    });
}

function calculateConfidence(data) {
    const conf = data.traffic.confidence;
    if (conf < 1) return 2;
    return 5;
}

// Helper functions that mirror your backend logic
function calculateTrafficDensityContribution(data) {
    const free_flow = data.traffic.free_flow_speeds;
    const live_speed = data.traffic.live_speeds;
    if (free_flow <= live_speed) return 0;

    const slowdown = ((free_flow - live_speed) / free_flow) * 100;
    if (slowdown <= 10) return 5;
    if (slowdown <= 30) return 10;
    if (slowdown <= 50) return 15;
    return 20;
}

function calculateTimeOfDayContribution() {
    const hour = new Date().getHours();
    return (hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19) ? 5 : 0;
}

function calculateIncidentContribution(data) {
    return Math.min(data.traffic.incidents * 5, 15);
}

function calculateRoadClosureContribution(data) {
    return data.traffic.road_closure ? 20 : 0;
}

function calculateVisibilityContribution(data) {
    const vis = data.weather.visibility;
    const weather = data.weather.weather_conditions;
    if (vis > 5 && vis < 10) return 1;
    if (["Fog", "Mist", "Heavy snow", "Blizzard", "Blowing snow", "Freezing fog"].includes(weather)) return 0;
    if (vis <= 0.5) return 15;
    if (vis <= 1) return 10;
    if (vis <= 3) return 5;
    if (vis <= 5) return 2;
    return 0;
}

function calculatePrecipitationContribution(data) {
    const weather = data.weather.weather_conditions;

    // Extreme Impact
    if (["Blizzard", "Heavy snow", "Blowing snow", "Moderate or heavy freezing rain",
        "Torrential rain shower", "Moderate or heavy rain with thunder",
        "Moderate or heavy snow with thunder"].includes(weather)) return 15;

    // High Impact
    if (["Heavy rain", "Heavy rain at times", "Moderate or heavy sleet",
        "Moderate or heavy sleet showers", "Moderate or heavy showers of ice pellets",
        "Freezing fog", "Heavy freezing drizzle"].includes(weather)) return 10;

    // Moderate Impact
    if (["Fog", "Mist", "Freezing fog", "Moderate rain", "Moderate rain at times",
        "Light freezing rain", "Light sleet", "Patchy heavy snow", "Moderate snow",
        "Ice pellets", "Thundery outbreaks possible"].includes(weather)) return 5;

    // Light Impact
    if (["Light rain", "Light drizzle", "Light snow", "Patchy light rain",
        "Patchy light snow", "Patchy light drizzle"].includes(weather)) return 2;

    return 0;
}

function calculateSpeedReduction(threshold) {
    threshold = Math.min(threshold, 50);
    if (threshold <= 10) return threshold * 0.01;
    if (threshold <= 30) return 0.1 + (threshold - 10) * 0.015;
    return 0.4 + (threshold - 30) * 0.01;
}

function isRushHour() {
    const hour = new Date().getHours();
    return (hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19);
}



function createThresholdRadar(instanceId, data) {
    const ctx = document.getElementById(`thresholdRadarChart-${instanceId}`).getContext('2d');

    if (window[`radarChart${instanceId}`]) {
        window[`radarChart${instanceId}`].destroy();
    }

    const factors = {
        trafficDensity: calculateTrafficDensityContribution(data),
        timeOfDay: calculateTimeOfDayContribution(),
        incidents: calculateIncidentContribution(data),
        roadClosures: calculateRoadClosureContribution(data),
        visibility: calculateVisibilityContribution(data),
        precipitation: calculatePrecipitationContribution(data),
        confidence: calculateConfidence(data)
    };

    const totalThreshold = Object.values(factors).reduce((sum, val) => sum + val, 0);
    const speedReduction = calculateSpeedReduction(totalThreshold);

    document.getElementById(`currentThresholdValue-${instanceId}`).textContent = Math.min(totalThreshold, 50);
    document.getElementById(`speedReductionValue-${instanceId}`).textContent = `${(speedReduction * 100).toFixed(1)}%`;

    const labelColors = [
        '#FF6384', '#36A2EB', '#FFCE56',
        '#4BC0C0', '#9966FF', '#FF9F40',
        '#8AC24A'
    ];

    window[`radarChart${instanceId}`] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: [
                'Traffic Density',
                'Rush Hour',
                'Incidents',
                'Road Closures',
                'Visibility',
                'Weather Conditions',
                'Confidence'
            ],
            datasets: [{
                label: 'SRF Contributors',
                data: Object.values(factors),
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: '#000000', // Black connecting line
                borderWidth: 2, // Line thickness
                pointBackgroundColor: (context) => {
                    // Hide points with value 0
                    return context.dataset.data[context.dataIndex] === 0 ?
                        'rgba(0,0,0,0)' : // Transparent
                        labelColors[context.dataIndex];
                },
                pointBorderColor: '#000000', // Black point borders
                pointRadius: (context) => {
                    // Hide points with value 0
                    return context.dataset.data[context.dataIndex] === 0 ?
                        0 : // No radius
                        5;
                },
                borderWidth: 2,
                pointHoverRadius: (context) => {
                    // Hide hover effect for zero values
                    return context.dataset.data[context.dataIndex] === 0 ?
                        0 : // No hover radius
                        7;
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        display: true,
                        color: 'rgba(200, 200, 200, 0)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 20,
                    ticks: {
                        stepSize: 5,
                        callback: (value) => `${value} pts`,
                        backdropColor: 'rgba(0, 0, 0, 0)'
                    },
                    pointLabels: {
                        color: (context) => labelColors[context.index],
                        font: {
                            weight: 'bold',
                            size: 12
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        labelColor: (context) => ({
                            borderColor: labelColors[context.dataIndex],
                            backgroundColor: labelColors[context.dataIndex],
                            borderWidth: 2
                        }),
                        // Hide tooltips for zero values
                        filter: (context) => {
                            return context.dataset.data[context.dataIndex] !== 0;
                        }
                    }
                }
            }
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

    createThresholdRadar(1, {
        weather: [{ weather_conditions: "Clear", visibility: 10, temperatures: 0 }],
        traffic: [{ live_speeds: 0, free_flow_speeds: 0, confidence: 0, incidents: 0, road_closure: false }],
        car: [{ current_speed: 0, current_speed_limit: 0 }]
    });

    createThresholdRadar(2, {
        weather: [{ weather_conditions: "Clear", visibility: 10, temperatures: 0 }],
        traffic: [{ live_speeds: 0, free_flow_speeds: 0, confidence: 0, incidents: 0, road_closure: false }],
        car: [{ current_speed: 0, current_speed_limit: 0 }]
    });
};