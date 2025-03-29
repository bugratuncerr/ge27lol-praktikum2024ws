# praktikum2024ws
Car Tracking System

A web-based application that tracks car routes, traffic conditions, and weather data in real-time using various APIs.
Features

    Real-time car tracking with route visualization

    Traffic condition monitoring (speed limits, incidents, road closures)

    Weather data integration (temperature, conditions, visibility)

    Multiple car instance management

    Historical data recording

    Server-Sent Events (SSE) for real-time updates

    REST API for data access and control

API Keys Required

This application uses the following services which require API keys:

    TomTom Traffic API

    WeatherAPI

    Geoapify Routing API

Keys should be placed in config.py
Installation

    Clone the repository

    Install required Python packages:
    Copy

    pip install bottle gevent requests

    Configure API keys in config.py

    Run the application:
    Copy

    python app.py

API Endpoints
Car Control

    POST /update_car_speed - Update car speed

    POST /update_car_lights - Toggle headlights

    POST /update_car_fog_lights - Toggle fog lights

    POST /update_instance_id - Create/update car instance

Data Access

    GET /get_car_state - Get current car state

    GET /get_traffic_data - Get traffic data

    GET /get_weather_data - Get weather data

    GET /get_city_coordinates - Get coordinates for cities

    GET /get_route_data - Get route information

Real-time Updates

    GET /sse - Server-Sent Events endpoint

    POST / - CPEE webhook endpoint

Web Interface

    GET /dashboard - Web dashboard

    GET /data - Access recorded data files

Data Storage

All recorded data is stored in the data/ directory, including:

    Historical traffic/weather/car data

    Route coordinates

    Initial route configurations

Dependencies

    Python 3.x

    Bottle web framework

    Gevent for async support

    Requests for API calls