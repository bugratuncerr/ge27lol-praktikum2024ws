import requests
import time
import json
import os
import signal
import sys
from datetime import datetime
from flask import Flask, jsonify, request, render_template
from threading import Thread

app = Flask(__name__)

# Define your API keys and URLs
TOMTOM_API_KEY = 'cjnASo48Fywsyrpwh0HYnq2zs3M3cGKe'
TOMTOM_API_URL_FLOW = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/5/json'
WEATHER_API_KEY = '1ed8f808415c466cb96212020240112'
WEATHER_API_URL = 'http://api.weatherapi.com/v1/current.json'
DATA_DIR = 'data_instances'

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

is_collecting_data = False
current_instance_file = None

# Geocoding API to get coordinates for a given city
def get_coordinates(city):
    geocode_url = f'https://api.tomtom.com/search/2/geocode/{city}.json?key={TOMTOM_API_KEY}'
    response = requests.get(geocode_url)
    if response.status_code == 200:
        data = response.json()
        if 'results' in data and len(data['results']) > 0:
            latitude = data['results'][0]['position']['lat']
            longitude = data['results'][0]['position']['lon']
            return latitude, longitude
    return None, None

# Function to get traffic flow data from TomTom API
def get_traffic_flow_data(latitude, longitude):
    unit = 'KMPH'
    traffic_url = f'{TOMTOM_API_URL_FLOW}?point={latitude}%2C{longitude}&unit={unit}&openLr=false&key={TOMTOM_API_KEY}'
    response = requests.get(traffic_url)
    return response.json() if response.status_code == 200 else None

# Function to get weather data from Weather API
def get_weather_data(city):
    weather_url = f'{WEATHER_API_URL}?key={WEATHER_API_KEY}&q={city}'
    response = requests.get(weather_url)
    return response.json() if response.status_code == 200 else None

# Function to calculate travel time
def calculate_travel_time(distance_km, speed_kmh):
    return distance_km / speed_kmh * 60 if speed_kmh > 0 else 'N/A'

# Function to save data to JSON file
def save_data_to_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

# Function to collect data every 1 minute until manually stopped
def collect_data(city, file_path):
    global is_collecting_data

    latitude, longitude = get_coordinates(city)
    if latitude is None or longitude is None:
        return

    data = {
        'city': city,
        'latitude': latitude,
        'longitude': longitude,
        'start_datetime': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'finish_datetime': '',
        'incidents': [],
        'current_travel_time': [],
        'live_speeds': [],
        'average_speeds': [],
        'temperatures': [],
        'weather_conditions': [],
        'timestamps': []
    }

    while is_collecting_data:
        traffic_flow_data_response = get_traffic_flow_data(latitude, longitude)
        if traffic_flow_data_response and 'flowSegmentData' in traffic_flow_data_response:
            flow_segment_data = traffic_flow_data_response['flowSegmentData']
            live_speed = flow_segment_data['currentSpeed']
            avg_speed = flow_segment_data['freeFlowSpeed']
            incidents_data = flow_segment_data.get('incidents', [])
            travel_time_now_value = calculate_travel_time(10, flow_segment_data['currentSpeed'])
        else:
            live_speed = avg_speed = incidents_data = travel_time_now_value = 'N/A'

        weather_data = get_weather_data(city)
        if weather_data and 'current' in weather_data:
            temperature = weather_data['current']['temp_c']
            condition = weather_data['current']['condition']['text']
        else:
            temperature = 'N/A'
            condition = 'N/A'

        current_time = datetime.now().strftime('%H:%M:%S')

        data['incidents'].append(incidents_data)
        data['current_travel_time'].append(travel_time_now_value)
        data['live_speeds'].append(live_speed)
        data['average_speeds'].append(avg_speed)
        data['temperatures'].append(temperature)
        data['weather_conditions'].append(condition)
        data['timestamps'].append(current_time)

        print(f"Timestamp: {current_time} | Travel time: {travel_time_now_value} mins | Live Speed: {live_speed} km/h | Temp: {temperature}°C | Condition: {condition} | Incidents: {incidents_data}")

        save_data_to_json(file_path, data)
        time.sleep(60)

    data['finish_datetime'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    save_data_to_json(file_path, data)

@app.route('/collect_data', methods=['POST'])
def collect_data_route():
    global is_collecting_data, current_instance_file

    print("Request Form:",request.form)
    # Retrieve the 'city' form data as a string
    city = request.form.get('city')

    # Debug: print the city to check the value
    print(f"City from form data: {city}")

    if is_collecting_data:
        return jsonify({"status": "Data collection is already running."}), 400

    if not city:
        return jsonify({"status": "City data is missing."}), 400


    is_collecting_data = True
    current_instance_file = os.path.join(DATA_DIR, f'data_{city}_{datetime.now().strftime("%Y%m%d%H%M%S")}.json')

    thread = Thread(target=collect_data, args=(city, current_instance_file))
    thread.start()

    return jsonify({"status": "Data collection started."})



@app.route('/stop_collection', methods=['POST'])
def stop_data_collection():
    global is_collecting_data

    if not is_collecting_data:
        return jsonify({"status": "No data collection is running."}), 400

    is_collecting_data = False
    return jsonify({"status": "Data collection stopped."})

@app.route('/instances', methods=['GET'])
def list_instances():
    files = os.listdir(DATA_DIR)
    return jsonify(files)

@app.route('/data/<filename>', methods=['GET'])
def get_instance_data(filename):
    file_path = os.path.join(DATA_DIR, filename)
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            saved_data = json.load(f)
        return jsonify(saved_data)
    else:
        return jsonify({"error": "File not found"}), 404

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='localhost', port=8080)
