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

#Updates the car speed with the given instance id
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

#Gets the car with a given instance_id. If none exists, create a new one
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

#Turns on/off the car headlights
def update_car_lights():
    try:
        data = request.forms.decode()
        instance_id = int(data.get("instance_id"))
        new_car_lights = data.get("car_lights")

        new_car_lights = new_car_lights in ["true", "True", "1"] if new_car_lights is not None else cars[instance_id].lights

        if cars[instance_id].lights == new_car_lights:
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car lights remains the same', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
        else:
            cars[instance_id].update_lights(new_car_lights)
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car lights updated successfully.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

#Turns on/off the car fog lights
def update_car_fog_lights():
    try:
        data = request.forms.decode()
        instance_id = int(data.get("instance_id"))
        new_fog_lights = data.get("car_fog_lights")

        # Convert to boolean explicitly
        new_fog_lights = new_fog_lights in ["true", "True", "1"] if new_fog_lights is not None else cars[instance_id].fog_lights

        if cars[instance_id].fog_lights == new_fog_lights:
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car fog lights remains the same', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
        else:
            cars[instance_id].update_fog_lights(new_fog_lights)
            return HTTPResponse(status=200, body=json.dumps({'message': 'Car fog lights updated successfully.', 'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})

#Gets the car by given instance_id
def get_car_state():
    try:
        instance_id = int(request.query.get("instance_id"))
        return HTTPResponse(status=200, body=json.dumps({'car': cars[instance_id].get_state()}), headers={'content-type': 'application/json'})
    except Exception as e:
        return HTTPResponse(status=500, body=json.dumps({'error': str(e)}), headers={'content-type': 'application/json'})


#Within given city names, return their coordinates
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


#Within the given coordinates, returns the distance and travel time
def get_routes():
    global cars
    global trackers
    try:
        instance_id = int(request.query.get("instance_id"))
        waypoints = request.query.getall('waypoints')  # Accept multiple cities as query parameters
        
        if instance_id not in cars:
            cars[instance_id] = Car(instance_id=instance_id)

        if instance_id not in trackers:
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


#Returns the Traffic api response with the given coordinates
def get_traffic_data():
    latitude = request.query.latitude
    longitude = request.query.longitude
    instance_id = int(request.query.instance_id)

    if not latitude or not longitude:
        return HTTPResponse(status=400, body=json.dumps({'error': 'Latitude and Longitude are required'}), headers={'content-type': 'application/json'})

    traffic_data = fetch_traffic_data(latitude, longitude, instance_id)
    return HTTPResponse(status=200, body=json.dumps(traffic_data), headers={'content-type': 'application/json'})


#Returns the Weather api response with the given coordinates
def get_weather_data():
    latitude = request.query.latitude
    longitude = request.query.longitude
    instance_id = int(request.query.instance_id)

    if not latitude or not longitude:
        return HTTPResponse(status=400, body=json.dumps({'error': 'Latitude and Longitude are required'}), headers={'content-type': 'application/json'})

    weather_data = fetch_weather_data(latitude, longitude, instance_id)
    return HTTPResponse(status=200, body=json.dumps(weather_data), headers={'content-type': 'application/json'})


#Listens the CPEE responses, parses the data and stores them into global variable
def record():
    global all_data
    global historical_data
    global trackers

    body = bottle.request.body.read()
    data = body.decode('utf-8') if isinstance(body, bytes) else body
    parts = [part for part in data.split('--Time_is_an_illusion._Lunchtime_doubly_so.0xriddldata') if part.strip()][3]
    parts = [part for part in parts.split('\r\n\r\n') if part.strip()][1]
    contents = json.loads(parts)

    if 'state' in contents['content']:
        state = contents['content']['state']        
        instance_id = contents.get('instance')  # Get instance ID from top level

        if instance_id in trackers:
            if state in ['stopping', 'stopped']:
                trackers[instance_id].pause_updates()
                if instance_id in all_data:
                    all_data[instance_id]["_paused"] = True
            elif state == 'running':
                trackers[instance_id].resume_updates()
                if instance_id in all_data and "_paused" in all_data[instance_id]:
                    del all_data[instance_id]["_paused"]
            elif state == 'finished':
                # Clean up the tracker for this instance
                trackers[instance_id]._stop_tracking_thread()
                trackers.pop(instance_id, None)  # Remove the tracker from the dictionary
                cars.pop(instance_id, None)  # Remove the tracker from the dictionary
                all_data.pop(instance_id, None)  # Remove from all_data to stop SSE updates
                #historical_data.pop(instance_id, None)  #  clean historical data


    filtered_data = {key: value for key, value in contents['content'].items() if 'value' in key}
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
            historical_data[instance_id]["car"].append(car_data["car"])        

        # Write historical data to a file
        if(instance_id != 0):
            write_to_json_historical(f'historical_data_{str(instance_id)}.json', historical_data[instance_id])

#Server sent event to get last updated data in frontend
def sse():
    response.content_type = 'text/event-stream'
    response.cache_control = 'no-cache'
    response.set_header('Access-Control-Allow-Origin', '*')

    instance_id = request.query.get('instance_id')
    while True:
        try:
            if instance_id:
                instance_id_int = int(instance_id)
                # Only send data if instance exists AND isn't paused
                if instance_id_int in all_data and not all_data[instance_id_int].get("_paused", False):
                    yield 'data: ' + json.dumps(all_data[instance_id_int]) + '\n\n'
            else:
                # Filter out paused instances when sending all data
                active_data = {
                    k: v for k, v in all_data.items() 
                    if not v.get("_paused", False)
                }
                yield 'data: ' + json.dumps(active_data) + '\n\n'
            time.sleep(30)
        except GeneratorExit:
            break