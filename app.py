#app.py

from gevent import monkey

# Perform the monkey patching at the beginning
monkey.patch_all()

import bottle
from api_routes import update_car_speed, update_car_fog_lights, update_car_lights, get_car_state, get_traffic_data, get_weather_data, get_city_coordinates, get_routes, record, sse, get_last_location,get_instance_id
from bottle import route,Bottle


# Create a Bottle app instance
app = Bottle()

# API Routes
#app.route('/create_car', method='POST', callback=create_car)
#app.route('/update_car_location', method='POST', callback=update_car_location)
#app.route('/car_arrived', method='POST', callback=car_arrived)
#app.route('/update_car_waypoints', method='POST', callback=update_car_waypoints)
app.route('/get_traffic_data', method='GET', callback=get_traffic_data)
app.route('/get_weather_data', method='GET', callback=get_weather_data)
app.route('/get_city_coordinates', method='GET', callback=get_city_coordinates)
app.route('/update_car_speed', method='POST', callback=update_car_speed)
app.route('/update_car_fog_lights', method='POST', callback=update_car_fog_lights)
app.route('/update_car_lights', method='POST', callback=update_car_lights)
app.route('/update_instance_id', method='POST', callback=get_instance_id)
app.route('/get_car_state', method='GET', callback=get_car_state)
app.route('/get_route_data', method='GET', callback=get_routes)
app.route('/last_location', method='GET', callback=get_last_location)
app.route('/', method='POST', callback=record)
app.route('/sse', method='GET', callback=sse)

# Start the server
if __name__ == "__main__":
    bottle.run(app, host='::1', port=12879, server='gevent')
