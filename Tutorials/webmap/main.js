var map = new maplibregl.Map({
  container: "map",
  //   style: "https://demotiles.maplibre.org/style.json",
  style: "dark_matter.json",
  center: [-73.97144, 40.70491],
  zoom: 10,
});

map.addControl(new maplibregl.NavigationControl());

// Fetch pizza restaurant data from the NYC Open Data API
const jsonFeatures = fetch(
  "https://data.cityofnewyork.us/resource/43nn-pn8j.geojson?cuisine_description=Pizza&$limit=10000"
)
  .then((response) => response.json())
  .then((data) => {
    // lat long --> geojson
    data.features.forEach((feature) => {
      feature.geometry = {
        type: "Point",
        coordinates: [
          Number(feature.properties.longitude),
          Number(feature.properties.latitude),
        ],
      };
    });

    console.log(data);

    map.on("load", () => {
      map.addSource("restaurants", {
        type: "geojson",
        data: data,
      });

      map.loadImage("pizza.png", (error, image) => {
        if (error) {
          console.log("Error loading image:", error);
        }

        map.addImage("pizza", image);

        map.addLayer({
          id: "restaurants-layer",
          type: "symbol",
          source: "restaurants",
          layout: {
            "icon-image": "pizza",
            "icon-size": 0.04,
            "icon-allow-overlap": true,
          },
        });
      });
    });
  })
  .catch((error) => console.error("Error fetching data:", error));

map.on("mouseenter", "restaurants-layer", (e) => {
  map.getCanvas().style.cursor = "pointer";
  const coordinates = e.features[0].geometry.coordinates.slice();
  const description = e.features[0].properties.dba;
  new maplibregl.Popup({ closeButton: false, closeOnClick: false })
    .setLngLat(coordinates)
    .setHTML(description)
    .addTo(map);
});

map.on("mouseleave", "restaurants-layer", () => {
  map.getCanvas().style.cursor = "";
  const popups = document.getElementsByClassName("maplibregl-popup");
  while (popups[0]) {
    popups[0].remove();
  }
});
