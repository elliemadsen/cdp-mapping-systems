import os
import json
from PIL import Image
import piexif


def dms_to_decimal(dms, ref):
    degrees, minutes, seconds = dms
    decimal = degrees + minutes / 60 + seconds / 3600
    return -decimal if ref in ["S", "W"] else decimal


def extract_metadata(filepath):
    try:
        img = Image.open(filepath)
        exif_data = piexif.load(img.info.get("exif", b""))

        gps = exif_data.get("GPS", {})
        exif = exif_data.get("Exif", {})

        if not gps or 2 not in gps or 4 not in gps:
            return None  # Skip photos without GPS

        lat = dms_to_decimal([v[0] / v[1] for v in gps[2]], gps[1].decode())
        lon = dms_to_decimal([v[0] / v[1] for v in gps[4]], gps[3].decode())

        date = exif.get(36867)  # DateTimeOriginal
        date_str = date.decode() if date else None

        return {
            "filename": os.path.basename(filepath),
            "datetime": date_str,
            "lat": lat,
            "lon": lon,
        }

    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return None


folder = "img"
features = []

for fname in os.listdir(folder):
    if fname.lower().endswith((".jpg", ".jpeg")):
        path = os.path.join(folder, fname)
        data = extract_metadata(path)
        if data:
            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [data["lon"], data["lat"]],
                    },
                    "properties": {
                        "filename": data["filename"],
                        "datetime": data["datetime"],
                    },
                }
            )

geojson = {"type": "FeatureCollection", "features": features}

with open("photos.geojson", "w") as f:
    json.dump(geojson, f, indent=2)

print(f"✅ Saved {len(features)} geotagged photos to photos.geojson")
