const supabaseUrl = "https://sgrfbrmesckazfsldnpk.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncmZicm1lc2NrYXpmc2xkbnBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzOTM5NzEsImV4cCI6MjA2ODk2OTk3MX0.BwxSHzvdX7I10PaSAEQbhwbe0tzb-NfKlQYQkTgXyOs";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

var map = new maplibregl.Map({
  container: "map",
  //   style: "https://demotiles.maplibre.org/style.json",
  style: "dark_matter.json",
  center: [-73.97144, 40.70491],
  zoom: 10,
});

map.addControl(new maplibregl.NavigationControl());

async function querySupabase() {
  const { data, error } = await supabaseClient
    .from("public-art-nyc")
    .select("*");

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  // Convert Supabase rows to GeoJSON features (skip if no lat/lng)
  const features = data
    .filter((row) => row.lat && row.lng)
    .map((row) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(row.lng), Number(row.lat)],
      },
      properties: {
        name: row.name,
        from_date: row.from_date,
        to_date: row.to_date,
        artist: row.artist,
        location: row.location,
        description: row.description,
      },
    }));

  const geojson = {
    type: "FeatureCollection",
    features: features,
  };

  // Add to map as a source/layer
  map.on("load", () => {
    if (map.getSource("public-art")) return; // Prevent duplicate source
    map.addSource("public-art", {
      type: "geojson",
      data: geojson,
    });

    map.loadImage("art.png", (error, image) => {
      if (error) {
        console.log("Error loading image:", error);
      }

      map.addImage("art", image);

      map.addLayer({
        id: "public-art-layer",
        type: "symbol",
        source: "public-art",
        layout: {
          "icon-image": "art",
          "icon-size": 0.04,
          "icon-allow-overlap": true,
        },
      });
    });

    // Popup on hover
    map.on("mouseenter", "public-art-layer", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const props = e.features[0].properties;
      const coordinates = e.features[0].geometry.coordinates.slice();
      const html = `
        <strong>${props.name}</strong><br>
        <em>${props.from_date} – ${props.to_date}</em><br>
        <span>${props.artist || ""}</span><br>
        <span>${props.location || ""}</span>
      `;
      new maplibregl.Popup({ closeButton: false, closeOnClick: false })
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(map);
    });

    map.on("mouseleave", "public-art-layer", () => {
      map.getCanvas().style.cursor = "";
      const popups = document.getElementsByClassName("maplibregl-popup");
      while (popups[0]) popups[0].remove();
    });
  });
}

// Call the function after DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  querySupabase();
});

map.on("click", (e) => {
  const point = [e.lngLat.lng, e.lngLat.lat];

  // Remove existing source/layer if present
  if (map.getLayer("public-art-layer")) {
    map.removeLayer("public-art-layer");
  }
  if (map.getSource("public-art")) {
    map.removeSource("public-art");
  }

  // Query nearest points and add them to the map
  queryWithinDistance(point, 100000);
});

async function queryWithinDistance(point, n = 1000) {
  const { data, error } = await supabaseClient.rpc("find_nearest_n_art", {
    lat: point[1],
    lon: point[0],
    n: n,
  });

  if (error) {
    console.error("Error fetching nearest points:", error);
    return;
  }

  console.log("Nearest points data:", data);

  // Convert to GeoJSON
  const features = (data || [])
    .filter((row) => row.lat && row.lng)
    .map((row) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [Number(row.lng), Number(row.lat)],
      },
      properties: {
        name: row.name,
        from_date: row.from_date,
        to_date: row.to_date,
        artist: row.artist,
        location: row.location,
        description: row.description,
      },
    }));

  const geojson = {
    type: "FeatureCollection",
    features: features,
  };

  // Add new source/layer for nearest points
  map.addSource("public-art", {
    type: "geojson",
    data: geojson,
  });

  if (!map.hasImage("art")) {
    map.loadImage("art.png", (error, image) => {
      if (error) {
        console.log("Error loading image:", error);
        return;
      }
      map.addImage("art", image);
      addArtLayer();
    });
  } else {
    addArtLayer();
  }

  function addArtLayer() {
    map.addLayer({
      id: "public-art-layer",
      type: "symbol",
      source: "public-art",
      layout: {
        "icon-image": "art",
        "icon-size": 0.04,
        "icon-allow-overlap": true,
      },
    });

    // Popup on hover
    map.on("mouseenter", "public-art-layer", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const props = e.features[0].properties;
      const coordinates = e.features[0].geometry.coordinates.slice();
      const html = `
      <strong>${props.name}</strong><br>
      <em>${props.from_date} – ${props.to_date}</em><br>
      <span>${props.artist || ""}</span><br>
      <span>${props.location || ""}</span>
    `;
      new maplibregl.Popup({ closeButton: false, closeOnClick: false })
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(map);
    });

    map.on("mouseleave", "public-art-layer", () => {
      map.getCanvas().style.cursor = "";
      const popups = document.getElementsByClassName("maplibregl-popup");
      while (popups[0]) popups[0].remove();
    });
  }
}
