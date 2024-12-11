document.addEventListener("DOMContentLoaded", function() {
    // Fetch instances from the server
    fetch('/instances')
        .then(response => response.json())
        .then(data => {
            const instance1Select = document.getElementById('instance1');
            const instance2Select = document.getElementById('instance2');
            
            data.forEach(instance => {
                let option = document.createElement('option');
                option.value = instance;
                option.textContent = instance;
                instance1Select.appendChild(option);
                instance2Select.appendChild(option.cloneNode(true));
            });
        });

    // Compare the two selected instances
    document.getElementById('compareButton').addEventListener('click', function() {
        const instance1 = document.getElementById('instance1').value;
        const instance2 = document.getElementById('instance2').value;

        if (!instance1 || !instance2) {
            alert("Please select two instances to compare.");
            return;
        }

        Promise.all([
            fetch(`/data/${instance1}`).then(response => response.json()),
            fetch(`/data/${instance2}`).then(response => response.json())
        ])
        .then(([data1, data2]) => {
            // Process and display comparison
            displayComparisonGraphs(data1, data2);
        })
        .catch(err => {
            console.error("Error fetching data:", err);
        });
    });

    function displayComparisonGraphs(data1, data2) {
        const labels = data1.timestamps;  // Assuming the timestamps are identical for comparison

        const liveSpeedData1 = data1.live_speeds;
        const liveSpeedData2 = data2.live_speeds;
        const temperatureData1 = data1.temperatures;
        const temperatureData2 = data2.temperatures;

        // Chart.js to compare data
        const liveSpeedCtx = document.getElementById('liveSpeedChart').getContext('2d');
        new Chart(liveSpeedCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Instance 1 - Live Speed',
                    data: liveSpeedData1,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false
                }, {
                    label: 'Instance 2 - Live Speed',
                    data: liveSpeedData2,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    fill: false
                }]
            }
        });

        const temperatureCtx = document.getElementById('temperatureChart').getContext('2d');
        new Chart(temperatureCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Instance 1 - Temperature',
                    data: temperatureData1,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false
                }, {
                    label: 'Instance 2 - Temperature',
                    data: temperatureData2,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false
                }]
            }
        });
    }
});
