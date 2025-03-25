# car.py

import uuid
from datetime import datetime


class Car:
    def __init__(self, latitude=0.0, longitude=0.0, speed=0, speed_limit=0, fog_lights=False, lights=False, arrived=False, break_time=0, waypoints=None, instance_id = 0, threshold = 0, timestamp = None, car_id=None):
        self.car_id = car_id or str(uuid.uuid4())
        self.current_latitude = latitude
        self.current_longitude = longitude
        self.current_speed = speed
        self.current_speed_limit = speed_limit
        self.fog_lights = fog_lights
        self.lights = lights
        self.arrived = arrived
        self.break_time = break_time
        self.current_threshold = threshold
        self.waypoints = waypoints or []
        self.timestamp = timestamp
        self.instance_id = instance_id
        
    
    def update_location(self, latitude, longitude, speed_limit):
        self.current_latitude = latitude
        self.current_longitude = longitude
        if(speed_limit == "unlimited"):
            self.current_speed_limit = -1
        else:
            self.current_speed_limit = speed_limit       
        

    def update_speed(self, speed, threshold):
        self.current_speed = speed
        self.current_threshold = threshold

    def update_instance_id(self, instance_id):
        self.instance_id = instance_id

    def update_lights(self, lights):
        self.lights = lights

    def update_fog_lights(self, fog_lights):
        self.fog_lights = fog_lights

    def update_break_time(self, break_time):
        self.break_time = break_time

    def update_waypoints(self, waypoints):
        self.waypoints = waypoints

    def set_arrived(self, arrived):
        self.arrived = arrived

    def get_state(self):
        self.timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        return self.__dict__
