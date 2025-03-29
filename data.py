# data.py

import requests
from datetime import datetime
from config import TOMTOM_API_KEY, TOMTOM_API_URL_FLOW, WEATHER_API_KEY, WEATHER_API_URL, GEOAPIFY_API_KEY


FILE_PATH = "route_data.json"

#Returns the traffic response from the tomtom api with the given coordinates
def fetch_traffic_data(latitude, longitude,instance_id):
    traffic_url = f'{TOMTOM_API_URL_FLOW}?point={latitude}%2C{longitude}&unit=KMPH&openLr=false&key={TOMTOM_API_KEY}'
    response = requests.get(traffic_url)

    if response.status_code == 200:
        traffic_response = response.json()
        flow_segment_data = traffic_response.get('flowSegmentData', {})
        return {
            'incidents': flow_segment_data.get('incidents', 0),
            'live_speeds': flow_segment_data.get('currentSpeed', 0),
            'free_flow_speeds': flow_segment_data.get('freeFlowSpeed', 0),
            'road_closure': bool(flow_segment_data.get('roadClosure', False)),
            'confidence': flow_segment_data.get('confidence', 0),
            'timestamps': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'instance_id': instance_id
        }

    return {}

#Returns the weather response from the weather api with the given coordinates
def fetch_weather_data(latitude, longitude,instance_id):
    weather_url = f'{WEATHER_API_URL}?key={WEATHER_API_KEY}&q={latitude},{longitude}'
    response = requests.get(weather_url)

    if response.status_code == 200:
        weather_response = response.json()
        current = weather_response.get('current', {})
        return {
            'location': weather_response['location'].get('name', ''),
            'temperatures': current.get('temp_c', 0),
            'weather_conditions': current.get('condition', {}).get('text', ''),
            'last_updated': current.get('last_updated', ''),
            'visibility': current.get('vis_km', 0),
            'timestamps': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'instance_id': instance_id
        }

    return {}

#Returns the coordinates response from the tomtom api with the given city
def fetch_coordinates(city):
    geocode_url = f'https://api.tomtom.com/search/2/geocode/{city}.json?key={TOMTOM_API_KEY}'
    response = requests.get(geocode_url)
    if response.status_code == 200:
        data = response.json()
        if 'results' in data and len(data['results']) > 0:
            return data['results'][0]['position']['lat'], data['results'][0]['position']['lon']
    return None, None  # Return None if city not found


#Returns the coordinates response from the tomtom api with the given city names
def get_coordinates(cities):
    if len(cities) != 2:
        return None, None, "Exactly two city names are required"
    
    lat1, lon1 = fetch_coordinates(cities[0])
    lat2, lon2 = fetch_coordinates(cities[1])

    if lat1 is None or lat2 is None:
        return None, None, "One or both cities not found"
    
    return lat1, lon1, lat2, lon2