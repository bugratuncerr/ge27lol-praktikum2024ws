#utils.py

import os
import csv
import json

DATA_FOLDER = "data"
os.makedirs(DATA_FOLDER, exist_ok=True)

def write_to_csv(filename,content):
    file_path = os.path.join(DATA_FOLDER, filename)
    file_exists = os.path.isfile(file_path)  # Check if the file exists
    with open(file_path, 'a', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=content.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(content)


def write_to_json(filename,coordinates,routes):
    file_path = os.path.join(DATA_FOLDER, filename)
    with open(file_path, 'w', newline='') as file:
        json.dump({'coordinates': coordinates, 'routes': routes}, file)


def write_to_json_historical(filename, data):
    file_path = os.path.join(DATA_FOLDER, filename)
    with open(file_path, 'w') as json_file:
        json.dump(data, json_file, indent=4)