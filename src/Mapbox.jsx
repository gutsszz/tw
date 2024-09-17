import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';
import ThemeSelector from './ThemeSwitcher'; 

mapboxgl.accessToken = 'pk.eyJ1IjoidGFsaGF3YXFxYXMxNCIsImEiOiJjbHBreHhscWEwMWU4MnFyenU3ODdmeTdsIn0.8IlEgMNGcbx806t363hDJg';

const MapboxMap = ({ layers,zoomid,setZoom}) => {
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
  const updateMapLayers = useCallback(() => {
    if (!mapLoaded) return;
  
    const map = mapRef.current;
    if (!map) return;
  
    // Remove layers not present in the current state
    const currentLayerIds = new Set(layers.flatMap(layer => [
      `geojson-layer-${layer.id}-points`,
      `geojson-layer-${layer.id}-lines`,
      `geojson-layer-${layer.id}-polygons`,
      `geojson-layer-${layer.id}-border`
    ]));
  
    map.getStyle().layers.forEach(layer => {
      if (layer.id.startsWith('geojson-layer-') && !currentLayerIds.has(layer.id)) {
        map.removeLayer(layer.id);
        map.removeSource(layer.id);
      }
    });
  
    // Add or update layers based on current state
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
            visibility: visibility ? 'visible' : 'none' // Control visibility here
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
  
      const visibility = layer.visible; // Get visibility from the layer
  
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
  
    
    
  
  }, [layers, mapLoaded]);
  
  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);
  
  

  
  const handleThemeChange = (newTheme) => {
  if (!mapRef.current) return;

  const map = mapRef.current;

  // Save the current layers and sources
  const existingLayers = layers.map(layer => ({
    id: `geojson-layer-${layer.id}`,
    data: layer.data,
    visible: layer.visible
  }));

  // Set the new theme
  map.setStyle(`mapbox://styles/mapbox/${newTheme}`);

  // Once the new style is loaded, re-add the layers and sources
  map.once('styledata', () => {
    existingLayers.forEach(layer => {
      const { id: baseLayerId, data, visible } = layer;

      const pointFeatures = {
        type: "FeatureCollection",
        features: data.features.filter(feature => feature.geometry.type === "Point")
      };

      const lineStringFeatures = {
        type: "FeatureCollection",
        features: data.features.filter(feature =>
          feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString")
      };

      const polygonFeatures = {
        type: "FeatureCollection",
        features: data.features.filter(feature =>
          feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
      };

      // Utility function to add or update a layer
      const addOrUpdateLayer = (layerId, layerType, sourceId, paintOptions) => {
        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: layerType,
            source: sourceId,
            paint: paintOptions
          });
        } else {
          // Update the paint properties if the layer already exists
          Object.entries(paintOptions).forEach(([key, value]) => {
            map.setPaintProperty(layerId, key, value);
          });
        }
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      };

      // Handle Points
      if (pointFeatures.features.length > 0) {
        const pointLayerId = `${baseLayerId}-points`;
        if (!map.getSource(pointLayerId)) {
          map.addSource(pointLayerId, {
            type: 'geojson',
            data: pointFeatures
          });
        } else {
          map.getSource(pointLayerId).setData(pointFeatures);
        }
        addOrUpdateLayer(pointLayerId, 'circle', pointLayerId, {
          'circle-color': '#FF0000',
          'circle-radius': 5
        });
      }

      // Handle LineStrings
      if (lineStringFeatures.features.length > 0) {
        const lineLayerId = `${baseLayerId}-lines`;
        if (!map.getSource(lineLayerId)) {
          map.addSource(lineLayerId, {
            type: 'geojson',
            data: lineStringFeatures
          });
        } else {
          map.getSource(lineLayerId).setData(lineStringFeatures);
        }
        addOrUpdateLayer(lineLayerId, 'line', lineLayerId, {
          'line-color': '#0000FF',
          'line-width': 2
        });
      }

      // Handle Polygons
      if (polygonFeatures.features.length > 0) {
        const polygonLayerId = `${baseLayerId}-polygons`;
        const borderLayerId = `${baseLayerId}-border`;

        // Add or update polygon layer
        if (!map.getSource(polygonLayerId)) {
          map.addSource(polygonLayerId, {
            type: 'geojson',
            data: polygonFeatures
          });
        } else {
          map.getSource(polygonLayerId).setData(polygonFeatures);
        }
        addOrUpdateLayer(polygonLayerId, 'fill', polygonLayerId, {
          'fill-color': '#00FF00',
          'fill-opacity': 0.35
        });

        // Add or update border layer
        if (!map.getSource(borderLayerId)) {
          map.addSource(borderLayerId, {
            type: 'geojson',
            data: polygonFeatures
          });
        } else {
          map.getSource(borderLayerId).setData(polygonFeatures);
        }
        addOrUpdateLayer(borderLayerId, 'line', borderLayerId, {
          'line-color': '#009900', // Darker border color
          'line-width': 2
        });
      }
    });
  });
};

  
  return (
    <div className="relative">
      <div ref={mapContainerRef} className="map-container" />
      <ThemeSelector onThemeChange={handleThemeChange} /> {/* Add the ThemeSelector */}
    </div>
  );
};

export default MapboxMap;
