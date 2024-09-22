import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';
import ThemeSelector from './ThemeSwitcher'; 

mapboxgl.accessToken = 'pk.eyJ1IjoidGFsaGF3YXFxYXMxNCIsImEiOiJjbHBreHhscWEwMWU4MnFyenU3ODdmeTdsIn0.8IlEgMNGcbx806t363hDJg';

const MapboxMap = ({ layers,zoomid,setZoom,Rasterzoomid}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
 


  const epsg3857toEpsg4326 = (pos) => {
    let [x, y] = pos;
    x = (x * 180) / 20037508.34;
    y = (y * 180) / 20037508.34;
    y = (Math.atan(Math.exp(y * (Math.PI / 180))) * 360) / Math.PI - 90;
    return [x, y];
  };

  const returnEPSG4326 = (coordinates) => {
    if (Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90) {
      return epsg3857toEpsg4326(coordinates);
    }
    return coordinates;
  };

  const transformCoords = (coords) => {
    if (typeof coords[0] === 'number') {
      return returnEPSG4326(coords);
    } else if (Array.isArray(coords[0])) {
      return coords.map(coord => returnEPSG4326(coord));
    }
  };

  const convertGeometry = (geometry) => {
    const geomType = geometry.type;
    if (geomType === 'Point') {
      geometry.coordinates = transformCoords(geometry.coordinates);
    } else if (geomType === 'LineString' || geomType === 'MultiPoint') {
      geometry.coordinates = transformCoords(geometry.coordinates);
    } else if (geomType === 'Polygon' || geomType === 'MultiLineString') {
      geometry.coordinates = geometry.coordinates.map(ring => transformCoords(ring));
    } else if (geomType === 'MultiPolygon') {
      geometry.coordinates = geometry.coordinates.map(polygon => polygon.map(ring => transformCoords(ring)));
    }
    return geometry;
  };

  const convertGeoJSON = (geojsonData) => {
    geojsonData.features.forEach(feature => {
      feature.geometry = convertGeometry(feature.geometry);
    });
    return geojsonData;
  };

  const initializeMap = useCallback(() => {
    if (mapRef.current) return; 

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11', 
      center: [0, 0],
      zoom: 1,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('load', () => {
      setMapLoaded(true); // Map is now loaded
    });

    map.on('resize', () => map.resize()); // Handle map resizing on window resize

    return () => map.remove(); // Clean up the map instance on component unmount
  }, []);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);
   
  useEffect(() => {
    if (!mapLoaded || !zoomid) return;
  
    const map = mapRef.current;
    if (!map) return;
  
    // Find the layer that corresponds to the zoomToLayerId
    const selectedLayer = layers.find(layer => layer.id === zoomid);
  
    if (selectedLayer) {
      const bounds = new mapboxgl.LngLatBounds();
  
      selectedLayer.data.features.forEach(feature => {
        const geometryType = feature.geometry.type;
  
        if (geometryType === 'Point') {
          bounds.extend(feature.geometry.coordinates);
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
          feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
        } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          const coordinates = geometryType === 'Polygon'
            ? feature.geometry.coordinates[0] // Outer boundary of the polygon
            : feature.geometry.coordinates.flat(2); // Flatten coordinates for MultiPolygon
          coordinates.forEach(coord => bounds.extend(coord));
        }

        setZoom(null);

      });
  
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 15,duration: 1 }); // Zoom to fit the layer
      }
    }
  
  
  }, [zoomid]);

  const boundsMapping = {
    '0': [[9.1138091, 48.3772241], [9.1239029, 48.3824140]], // Bounds for raster-layer-1
    '1': [[9.2970292, 47.7158867], [9.3093572, 47.7258356]], // Bounds for raster-layer-2
    '2': [[9.2804, 45.6119], [9.2979, 45.6320]], // Bounds for raster-layer-3
    
  };
  

  useEffect(() => { if (!mapLoaded) return;
  
    const map = mapRef.current;
    if (!map) return;
    const bounds = boundsMapping[Rasterzoomid];
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 10, bottom: 10, left: 10, right: 10 },
        maxZoom: 15,
        duration:1
      });
    }
  }, [Rasterzoomid]); // Runs whenever Rasterzoomid changes
  
  

  const updateMapLayers = useCallback(() => {
    if (!mapLoaded) return;
  
    const map = mapRef.current;
    if (!map) return;
  
    // Remove layers not present in the current state
    const currentLayerIds = new Set(layers.flatMap(layer => [
      `geojson-layer-${layer.id}-points`,
      `geojson-layer-${layer.id}-lines`,
      `geojson-layer-${layer.id}-polygons`,
      `geojson-layer-${layer.id}-border`,
      `raster-layer-${layer.id}` // Add raster layer IDs to this set
    ]));
  
    map.getStyle().layers.forEach(layer => {
      if (layer.id.startsWith('geojson-layer-') && !currentLayerIds.has(layer.id)) {
        map.removeLayer(layer.id);
        map.removeSource(layer.id);
      } else if (layer.id.startsWith('raster-layer-') && !currentLayerIds.has(layer.id)) {
        map.removeLayer(layer.id);
        map.removeSource(layer.id);
      }
    });
  
// Define bounds for specific raster IDs

// Handle raster layers
const rasterLayers = [
  { id: 'raster-layer-1', url: 'mapbox://talhawaqqas14.new' },
  { id: 'raster-layer-2', url: 'mapbox://talhawaqqas14.bigforest1' },
  { id: 'raster-layer-3', url: 'mapbox://talhawaqqas14.forest2' },
  { id: 'raster-layer-4', url: 'mapbox://talhawaqqas14.forest3' },
  { id: 'raster-layer-5', url: 'mapbox://talhawaqqas14.forest4' },
  { id: 'raster-layer-6', url: 'mapbox://talhawaqqas14.auto1' },
  { id: 'raster-layer-7', url: 'mapbox://talhawaqqas14.auto2' },
  { id: 'raster-layer-8', url: 'mapbox://yamamah11.auto_3' },
  { id: 'raster-layer-9', url: 'mapbox://yamamah11.auto_4' },
];

rasterLayers.forEach(layer => {
  const { id, url } = layer;

  // Add source if it doesn't exist
  if (!map.getSource(id)) {
    map.addSource(id, {
      type: 'raster',
      url: url,
      tileSize: 512,
    });
  }

  // Add layer if it doesn't exist
  if (!map.getLayer(id)) {
    map.addLayer({
      id: id,
      type: 'raster',
      source: id,
      layout: {},
      paint: {}
    });
  }
});

// Function to handle zooming based on rasterZoomId prop

    const layersToUpdate = {
      points: [],
      lines: [],
      polygons: []
    };
  
    // Function to get or create a source
    const getOrCreateSource = (sourceId, data) => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: data
        });
      } else {
        map.getSource(sourceId).setData(data);
      }
    };
  
    // Function to get or create a layer
    const getOrCreateLayer = (layerId, layerType, sourceId, paintOptions, visibility) => {
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: layerType,
          source: sourceId,
          paint: paintOptions,
          layout: {
            visibility: visibility ? 'visible' : 'none'
          }
        });
      } else {
        for (const [key, value] of Object.entries(paintOptions)) {
          map.setPaintProperty(layerId, key, value);
        }
        // Update visibility dynamically
        map.setLayoutProperty(layerId, 'visibility', visibility ? 'visible' : 'none');
      }
    };
  
    layers.forEach(layer => {
      const layerIdBase = `geojson-layer-${layer.id}`;
      const convertedGeoJSON = convertGeoJSON(layer.data);
  
      const pointFeatures = {
        type: 'FeatureCollection',
        features: convertedGeoJSON.features.filter(feature => feature.geometry.type === 'Point')
      };
  
      const lineStringFeatures = {
        type: 'FeatureCollection',
        features: convertedGeoJSON.features.filter(feature =>
          feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString')
      };
  
      const polygonFeatures = {
        type: 'FeatureCollection',
        features: convertedGeoJSON.features.filter(feature =>
          feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
      };
  
      const visibility = layer.visible;
  
      // Handle Points
      if (pointFeatures.features.length > 0) {
        const pointLayerId = `${layerIdBase}-points`;
        getOrCreateSource(pointLayerId, pointFeatures);
        getOrCreateLayer(pointLayerId, 'circle', pointLayerId, {
          'circle-color': '#FF0000',
          'circle-radius': 5
        }, visibility);
        layersToUpdate.points.push(pointLayerId);
      }
  
      // Handle LineStrings
      if (lineStringFeatures.features.length > 0) {
        const lineLayerId = `${layerIdBase}-lines`;
        getOrCreateSource(lineLayerId, lineStringFeatures);
        getOrCreateLayer(lineLayerId, 'line', lineLayerId, {
          'line-color': '#0000FF',
          'line-width': 2
        }, visibility);
        layersToUpdate.lines.push(lineLayerId);
      }
  
      // Handle Polygons
      if (polygonFeatures.features.length > 0) {
        const polygonLayerId = `${layerIdBase}-polygons`;
        const borderLayerId = `${layerIdBase}-border`;
  
        getOrCreateSource(polygonLayerId, polygonFeatures);
        getOrCreateLayer(polygonLayerId, 'fill', polygonLayerId, {
          'fill-color': '#00FF00',
          'fill-opacity': 0.35
        }, visibility);
        layersToUpdate.polygons.push(polygonLayerId);
  
        getOrCreateSource(borderLayerId, polygonFeatures);
        getOrCreateLayer(borderLayerId, 'line', borderLayerId, {
          'line-color': '#009900',
          'line-width': 2
        }, visibility);
        layersToUpdate.polygons.push(borderLayerId);
      }
    });
  
    const popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: [0, -10]
    });
  
    const handlePopup = (e) => {
      const feature = e.features[0];
      const coordinates = e.lngLat;
      const area = parseFloat(feature.properties.area);
      const displayArea = isNaN(area) ? "Area's information not available" : `${area.toFixed(2)} m²`;
  
      const popupHTML = `
        <div style="text-align: center;">
          <p><strong>Area:</strong> ${displayArea}</p>
        </div>
      `;
  
      popup
        .setLngLat(coordinates)
        .setHTML(popupHTML)
        .addTo(map);
    };
  
    layersToUpdate.polygons.forEach(polygonLayerId => {
      map.on('click', polygonLayerId, handlePopup);
    });
  
  }, [layers, mapLoaded]);
  
  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);
  

  const handleThemeChange = (newTheme) => {
    if (!mapRef.current) return;
  
    const map = mapRef.current;
  
    // Set the new theme
    map.setStyle(`mapbox://styles/mapbox/${newTheme}`);
  
    // Once the new style is loaded, re-add the layers and sources
    map.once('styledata', () => {
      updateMapLayers(); // Correctly placed inside the callback
    }); // Moved this closing parenthesis to the correct position
  };
  
  return (
    <div className="relative">
      <div ref={mapContainerRef} className="map-container" />
      <ThemeSelector onThemeChange={handleThemeChange} /> {/* Add the ThemeSelector */}
    </div>
  );
}

export default MapboxMap;  