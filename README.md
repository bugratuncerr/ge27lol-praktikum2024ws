# Route Analysis and Runtime Process Visualization - praktikum2024ws

A web-based application that tracks car routes, traffic conditions, and weather data in real-time using various APIs.

## Features

- Real-time car tracking with route visualization
- Traffic condition monitoring (speed limits, incidents, road closures)
- Weather data integration (temperature, conditions, visibility)
- Multiple car instance management
- Historical data recording
- Server-Sent Events (SSE) for real-time updates
- REST API for data access and control

## API Keys Required

This application uses the following services, which require API keys:

- **TomTom Traffic API**
- **WeatherAPI**
- **Geoapify Routing API**

Keys should be placed in `config.py`.

## Dependencies

- **Python 3.x**
- **Bottle web framework**
- **Gevent for async support**

## Installation and How to Run

1. **Clone the repository**:
   ```sh
   git clone https://github.com/bugratuncerr/praktikum2024ws.git
   cd praktikum2024ws

2. **Install required Python packages**:
   ```sh
    pip install bottle gevent requests

3. **Run the application**:
    ```sh
   python3 app.py

4. **The program will run on the 12879 port by default**

5. **Open the CPEE model page**

6. **Load the given testset**

7. **Set waypoints(eg: Munich,Salzburg) and instance_id(with the current process instance id) fields in Data Elements section**

8. **Press start from the Execution section**

9. **To access the website, use the link**:
   ```sh
   https://lehre.bpm.in.tum.de/ports/12879/dashboard
   ```
10. **To being able see the historical data and real time data updates, select the file with the given instance_id**




