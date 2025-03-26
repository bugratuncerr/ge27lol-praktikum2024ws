#route_tracker.py
import time
from datetime import datetime
import threading
import requests
from config import GEOAPIFY_API_KEY
import json
from utils import write_to_json




class RouteTracker:
    def __init__(self, car):
        self.coordinates = None
        self.routes = None
        self.current_location = {}
        self.car = car
        self.current_speed_limit = 0
        self.paused = False  # Start in running state by default
        self._lock = threading.Lock()
        self._pause_cond = threading.Condition(self._lock)
        self.start_time = None
        self.elapsed_before_pause = 0
        self._tracking_thread = None
        self._shutdown_flag = False

    def get_current_location(self, elapsed_time):
        if not self.coordinates or not self.routes:
            return None
        
        total_time = 0
        for step in self.routes:
            if step is None:
                continue
            if step.get("from_index") == step.get("to_index"):
                return self.coordinates[step["to_index"]]
            
            # Skip steps with missing or invalid time
            if step.get("time") is None or step["time"] <= 0:
                continue

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
    
    def fetch_route_data(self, waypoints):
        if len(waypoints) != 4:
            return None, None, "Invalid waypoints"

        # Stop any existing tracking thread
        self._stop_tracking_thread()

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
                write_to_json("initial_route_"+ str(self.car.instance_id) +".json", coordinates, steps)

                # Reset tracking state
                with self._lock:
                    self.paused = False  # Ensure it starts running
                    self.start_time = time.time()
                    self.elapsed_before_pause = 0
                    self._shutdown_flag = False

                # Start new tracking thread
                self._tracking_thread = threading.Thread(
                    target=self._tracking_loop,
                    daemon=True,
                    name=f"CarTracker-{self.car.instance_id}"
                )
                self._tracking_thread.start()
                print(f"Tracking started for car {self.car.instance_id} (running immediately)")

                return (
                    features[0]['properties']['legs'][0]['distance'], 
                    features[0]['properties']['legs'][0]['time'], 
                    None
                )
        
        except requests.exceptions.RequestException as e:
            return None, None, f"API request failed: {str(e)}"

    def _stop_tracking_thread(self):
        with self._lock:
            if self._tracking_thread and self._tracking_thread.is_alive():
                self._shutdown_flag = True
                self._pause_cond.notify_all()
        
        if self._tracking_thread and self._tracking_thread.is_alive():
            self._tracking_thread.join(timeout=1.0)
            if self._tracking_thread.is_alive():
                print(f"Warning: Tracking thread for car {self.car.instance_id} didn't shut down cleanly")

    def _tracking_loop(self):
        while not self._shutdown_flag:
            with self._lock:
                # Only pause if explicitly told to
                while self.paused and not self._shutdown_flag:
                    print(f"Car {self.car.instance_id} tracking paused")
                    self._pause_cond.wait()
                
                if self._shutdown_flag:
                    break

                current_elapsed = (time.time() - self.start_time) + self.elapsed_before_pause
                
                if self.car.break_time > 0:
                    break_time = self.car.break_time
                    self.car.update_break_time(0)
                    self._lock.release()  # Release lock during sleep
                    time.sleep(break_time)
                    self._lock.acquire()
                    if break_time is not None:
                        self.start_time += break_time
                
                new_location = self.get_current_location(current_elapsed)
                if new_location:
                    self.car.update_location(
                        new_location[1], 
                        new_location[0], 
                        self.current_speed_limit
                    )
                    self.current_location = {
                        "latitude": new_location[1],
                        "longitude": new_location[0]
                    }
                    
                    if new_location == self.coordinates[-1]:
                        self.car.set_arrived(True)
                        break

            time.sleep(1)  # Update interval

        print(f"Tracking stopped for car {self.car.instance_id}")

    def pause_updates(self):
        with self._lock:
            if not self.paused:
                print(f"Pausing updates for car {self.car.instance_id}")
                self.paused = True
                if self.start_time is not None:
                    self.elapsed_before_pause += time.time() - self.start_time
                self._pause_cond.notify_all()

    def resume_updates(self):
        with self._lock:
            if self.paused:
                print(f"Resuming updates for car {self.car.instance_id}")
                self.paused = False
                self.start_time = time.time()
                self._pause_cond.notify_all()




