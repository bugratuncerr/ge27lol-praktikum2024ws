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

## Installation

1. **Clone the repository**:
   ```sh
   git clone https://github.com/bugratuncerr/praktikum2024ws.git
   cd praktikum2024ws

2. **Install required Python packages**:
   ```sh
    pip install bottle gevent requests

3. **Configure API keys in config.py.**

4. **Run the application**:
    ```sh
   python3 app.py

5. **The program will run on the 12879 port by default**
6. **To access the website, use the link**:
   ```sh
   https://lehre.bpm.in.tum.de/ports/12879/dashboard
