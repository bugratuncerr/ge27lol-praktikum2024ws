#api_routes.py
import json
import time
import bottle
from bottle import request, HTTPResponse, response
from car import Car
from data import fetch_traffic_data, fetch_weather_data, get_coordinates
from route_tracker import RouteTracker
from utils import write_to_json_historical

# Global dictionaries to store multiple instances
cars = {}
trackers = {}
all_data = {}
historical_data = {}

def update_car_speed():
    global cars
    try:
        data = request.forms.decode()
        instance_id = int(data.get("instance_id"))
        new_speed = int(data.get("current_speed", cars[instance_id].current_speed))
        new_threshold = int(data.get("current_threshold", cars[instance_id].current_threshold))

        if cars[instance_id].current_speed == new_speed:
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car speed remains the same.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})

        cars[instance_id].update_speed(new_speed, new_threshold)
        return HTTPResponse(status=200, body=json.dumps({'message': 'Car speed updated successfully.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

def get_instance_id():
    try:
        global cars
        global trackers
        data = request.forms.decode()
        new_instance_id = int(data.get("instance_id"))
        new_waypoints = data.get("waypoints", "").split(",")

        if new_instance_id in cars:
            if cars[new_instance_id].instance_id == new_instance_id:
                return HTTPResponse(status=200, body=json.dumps({'message': 'Instance id remains the same.', 'car': cars[new_instance_id].get_state()}), headers={'content-type': 'application/json'})
        else:
            cars[new_instance_id] = Car(instance_id=new_instance_id)
            trackers[new_instance_id] = RouteTracker(cars[new_instance_id])

        cars[new_instance_id].update_instance_id(new_instance_id)
        cars[new_instance_id].update_waypoints(new_waypoints)
        return HTTPResponse(status=200, body=json.dumps({'message': 'Instance id updated successfully.', 'car': cars[new_instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

def update_car_break_time():
    try:
        data = request.forms.decode()
        instance_id = int(data.get("instance_id"))
        if cars[instance_id].break_time == int(data.get("break_time", cars[instance_id].break_time)):
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car break time remains the same.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
        else:
            cars[instance_id].update_break_time(int(data.get("break_time", cars[instance_id].break_time)))
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car break time updated successfully.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})


def update_car_lights():
    try:
        data = request.forms.decode()
        instance_id = int(data.get("instance_id"))
        if cars[instance_id].lights == bool(data.get("car_lights", cars[instance_id].lights)):
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car lights remains the same', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
        else:
            cars[instance_id].update_lights(bool(data.get("car_lights", cars[instance_id].lights)))
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car lights updated successfully.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

def update_car_fog_lights():
    try:
        data = request.forms.decode()
        instance_id = int(data.get("instance_id"))
        if cars[instance_id].fog_lights == bool(data.get("car_fog_lights", cars[instance_id].fog_lights)):
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car fog lights remains the same', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
        else:
            cars[instance_id].update_fog_lights(bool(data.get("car_fog_lights", cars[instance_id].fog_lights)))
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car fog lights updated successfully.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

def get_car_state():
    try:
        instance_id = int(request.query.get("instance_id"))
        return HTTPResponse(status=200, body=json.dumps({'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

def get_city_coordinates():
    cities = request.query.getall('city')  # Accept multiple cities as query parameters
    lat1, lon1, lat2, lon2 = get_coordinates(cities)

    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return HTTPResponse(status=400, body=json.dumps({'error': lat2}), headers={'content-type': 'application/json'})

    return HTTPResponse(
        status=200,
        body=json.dumps({
            'latitude': lat1,
            'longitude': lon1,
            'arrival_latitude': lat2,
            'arrival_longitude': lon2
        }),
        headers={'content-type': 'application/json'}
    )

def get_routes():
    global cars
    global trackers
    try:
        instance_id = int(request.query.get("instance_id"))
        waypoints = request.query.getall('waypoints')  # Accept multiple cities as query parameters
        
        if instance_id not in cars:
            cars[instance_id] = Car(instance_id=instance_id)
            trackers[instance_id] = RouteTracker(cars[instance_id])

        distance, travel_time, error = trackers[instance_id].fetch_route_data(waypoints)
        
        if distance is None or travel_time is None:
            return HTTPResponse(status=400, body=json.dumps({'error': 'Waypoints are required'}), headers={'content-type': 'application/json'})
        
        if error:
            return HTTPResponse(
                status=500,
                body=json.dumps({'error': error}),
                headers={'content-type': 'application/json'}
            )
        
        # Return the coordinates and steps
        return HTTPResponse(
            status=200,
            body=json.dumps({
                'distance': distance,
                'time': travel_time
            }),
            headers={'content-type': 'application/json'}
        )
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

def get_traffic_data():
    latitude = request.query.latitude
    longitude = request.query.longitude
    instance_id = int(request.query.instance_id)

    if not latitude or not longitude:
        return HTTPResponse(status=400, body=json.dumps({'error': 'Latitude and Longitude are required'}), headers={'content-type': 'application/json'})

    traffic_data = fetch_traffic_data(latitude, longitude, instance_id)
    return HTTPResponse(status=200, body=json.dumps(traffic_data), headers={'content-type': 'application/json'})

def get_weather_data():
    latitude = request.query.latitude
    longitude = request.query.longitude
    instance_id = int(request.query.instance_id)

    if not latitude or not longitude:
        return HTTPResponse(status=400, body=json.dumps({'error': 'Latitude and Longitude are required'}), headers={'content-type': 'application/json'})

    weather_data = fetch_weather_data(latitude, longitude, instance_id)
    return HTTPResponse(status=200, body=json.dumps(weather_data), headers={'content-type': 'application/json'})

def get_last_location():
    try:
        instance_id = int(request.query.get("instance_id"))
        if instance_id in trackers:
            last_location = trackers[instance_id].get_last_location()
            return HTTPResponse(status=200, body=json.dumps({'last_location': last_location}), headers={'content-type': 'application/json'})
        return HTTPResponse(status=404, body=json.dumps({'error': 'RouteTracker instance not found'}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})


def record():
    global all_data
    global historical_data
    global trackers

    body = bottle.request.body.read()
    data = body.decode('utf-8') if isinstance(body, bytes) else body
    parts = [part for part in data.split('--Time_is_an_illusion._Lunchtime_doubly_so.0xriddldata') if part.strip()][3]
    parts = [part for part in parts.split('\r\n\r\n') if part.strip()][1]
    contents = json.loads(parts)['content']



    if 'content' in contents and 'state' in contents['content']:
        state = contents['content']['state']
        instance_id = contents.get('instance')  # Get instance ID from top level
        
        if instance_id in trackers:
            if state in ['stopping', 'stopped']:
                trackers[instance_id].pause_updates()
            elif state == 'running':
                trackers[instance_id].resume_updates()


    filtered_data = {key: value for key, value in contents.items() if 'value' in key}
    if filtered_data:
        final = filtered_data['values']
        
        # Extract instance_id from nested responses (weatherResponse, trafficResponse, or car)
        instance_id = None
        if 'weatherResponse' in final and 'instance_id' in final['weatherResponse']:
            instance_id = final['weatherResponse']['instance_id']
        elif 'trafficResponse' in final and 'instance_id' in final['trafficResponse']:
            instance_id = final['trafficResponse']['instance_id']
        elif 'car' in final and 'instance_id' in final['car']:
            instance_id = final['car']['instance_id']
        
        # If no instance_id is found, default to 0 or handle the error
        if instance_id is None:
            instance_id = 0  # Default value or handle the error as needed



        # Initialize data structures for the instance_id if they don't exist
        if instance_id not in all_data:
            all_data[instance_id] = {}
        if instance_id not in historical_data:
            historical_data[instance_id] = {}

        # Update latest data in all_data
        weather_data = {key: value for key, value in final.items() if 'weatherResponse' in key}
        if weather_data:
            all_data[instance_id]["weather"] = weather_data['weatherResponse'] 
            if "weather" not in historical_data[instance_id]:
                historical_data[instance_id]["weather"] = [] 
            historical_data[instance_id]["weather"].append(weather_data['weatherResponse']) 
        
        traffic_data = {key: value for key, value in final.items() if 'trafficResponse' in key}
        if traffic_data:
            all_data[instance_id]["traffic"] = traffic_data['trafficResponse'] 
            if "traffic" not in historical_data[instance_id]:
                historical_data[instance_id]["traffic"] = []
            historical_data[instance_id]["traffic"].append(traffic_data['trafficResponse'])
        
        car_data = {key: value for key, value in final.items() if 'car' in key}
        if car_data:
            all_data[instance_id]["car"] = car_data['car']
            if "car" not in historical_data[instance_id]:
                historical_data[instance_id]["car"] = [] 
            historical_data[instance_id]["car"].append(car_data['car'])
        
        # Write historical data to a file
        if(instance_id != 0):
            write_to_json_historical(f'historical_data_{str(instance_id)}.json', historical_data[instance_id])


def sse():
    response.content_type = 'text/event-stream'
    response.cache_control = 'no-cache'
    response.set_header('Access-Control-Allow-Origin', '*')

    instance_id = request.query.get('instance_id')
    while True:
        try:
            if instance_id:
                yield 'data: ' + json.dumps(all_data.get(int(instance_id), {})) + '\n\n'
            else:
                yield 'data: ' + json.dumps(all_data) + '\n\n'
            time.sleep(60)
        except GeneratorExit:
            break