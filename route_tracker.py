#route_tracker.py
import time
from datetime import datetime
import threading
import requests
from config import GEOAPIFY_API_KEY
import json
from utils import write_to_json

class RouteTracker:
    def __init__(self,car):
        self.coordinates = None
        self.routes = None
        self.current_location = {}
        self.car = car
        self.current_speed_limit = 0
        self.paused = False  # Changed from running to paused
        self._lock = threading.Lock()
        self._pause_cond = threading.Condition(threading.Lock())  # For pausing/resuming
        self.start_time = None
        self.elapsed_before_pause = 0  # Track elapsed time during pauses


    def fetch_route_data(self, waypoints):
        if len(waypoints) != 4:
            return None, None, "Invalid waypoints"
        
        waypoints_str = f"{waypoints[0]},{waypoints[1]}|{waypoints[2]},{waypoints[3]}"
        url = f"https://api.geoapify.com/v1/routing?waypoints={waypoints_str}&mode=drive&details=route_details&apiKey={GEOAPIFY_API_KEY}"
        
        try:
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                features = data.get('features', [])
                if not features:
                    return None, None, "No route data found"
                
                geometry = features[0].get('geometry', {})
                coordinates = geometry.get('coordinates', [])[0]
                steps = features[0].get('properties', {}).get('legs', [])[0].get('steps', [])

                if not coordinates or not steps:
                    return None, None, "Incomplete route data"

                self.coordinates = coordinates
                self.routes = steps
                # Save data to file

                write_to_json("initial_route_"+ str(self.car.instance_id) +".json",coordinates,steps)

                thread = threading.Thread(target=self.fetch_current_location_and_update, daemon=True)
                thread.start()
                time.sleep(1)  # Ensure the thread starts properly

                return features[0]['properties']['legs'][0]['distance'], features[0]['properties']['legs'][0]['time'], None
        
        except requests.exceptions.RequestException as e:
            return None, None, f"API request failed: {str(e)}"
        
    def get_current_location(self, elapsed_time):
        if not self.coordinates or not self.routes:
            return None
        
        total_time = 0
        for step in self.routes:
            total_time += step["time"]
            if elapsed_time <= total_time:
                from_idx = step["from_index"]
                to_idx = step["to_index"]
                if from_idx == to_idx:
                    return self.coordinates[to_idx]  # Return the final position
                
                position_idx = min(from_idx + int((elapsed_time / total_time) * (to_idx - from_idx)), to_idx)
                self.current_speed_limit = step["speed_limit"]
                return self.coordinates[min(position_idx, len(self.coordinates)-1)]
        
        return self.coordinates[-1] 

    def fetch_current_location_and_update(self):
        with self._lock:
            self.paused = False
            self.start_time = time.time()
            self.elapsed_before_pause = 0
        
        while True:  # Keep thread alive forever
            with self._pause_cond:
                while self.paused:  # Wait while paused
                    self._pause_cond.wait()
            
            try:
                # Calculate elapsed time (including before pause)
                current_elapsed = (time.time() - self.start_time) + self.elapsed_before_pause
                
                # Handle break time
                if self.car.break_time > 0:
                    time.sleep(self.car.break_time)
                    self.start_time += self.car.break_time  # Adjust time accounting
                    self.car.update_break_time(0)
                
                # Get and update location
                new_location = self.get_current_location(current_elapsed)
                if new_location:
                    self.car.update_location(new_location[1], new_location[0], self.current_speed_limit)
                    self.current_location = {
                        "latitude": new_location[1],
                        "longitude": new_location[0]
                    }
                    
                    if new_location == self.coordinates[-1]:
                        self.car.set_arrived(True)
                        break
                
                time.sleep(60)  # Normal update interval
            
            except Exception as e:
                print(f"Update error: {e}")
                break
                

    def pause_updates(self):
        with self._lock:
            if not self.paused:
                self.paused = True
                self.elapsed_before_pause += time.time() - self.start_time

    def resume_updates(self):
        with self._lock:
            if self.paused:
                self.paused = False
                self.start_time = time.time()  # Reset start time
                with self._pause_cond:
                    self._pause_cond.notify()  # Wake up the thread


    def get_last_location(self):
        if self.current_location:
            return self.current_location
        return {"latitude": None, "longitude": None} 
    
    def get_last_speed_limit(self):
        if self.current_speed_limit:
            return self.current_speed_limit
        return 0