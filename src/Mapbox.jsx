import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import './App.css';
import ThemeSelector from './ThemeSwitcher'; // Import the new component

mapboxgl.accessToken = 'pk.eyJ1IjoidGFsaGF3YXFxYXMxNCIsImEiOiJjbHBreHhscWEwMWU4MnFyenU3ODdmeTdsIn0.8IlEgMNGcbx806t363hDJg';

const MapboxMap = ({ layers }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const initializeMap = useCallback(() => {
    if (mapRef.current) return; // Map is already initialized

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v11', // Default theme
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

  const updateMapLayers = useCallback(() => {
    if (!mapLoaded) return;
  
    const map = mapRef.current;
    if (!map) return;
  
    // Remove layers not present in the current state
    const currentLayerIds = new Set(layers.map(layer => `geojson-layer-${layer.id}`));
    map.getStyle().layers.forEach(layer => {
      if (layer.id.startsWith('geojson-layer-') && !currentLayerIds.has(layer.id)) {
        map.removeLayer(layer.id);
        map.removeSource(layer.id);
      }
    });
  
    // Add or update layers based on current state
    let bounds = new mapboxgl.LngLatBounds();
    let hasVisibleLayers = false;
  
    layers.forEach(layer => {
      const layerIdBase = `geojson-layer-${layer.id}`;
      
      // Filter features by geometry type
      const pointFeatures = {
        type: "FeatureCollection",
        features: layer.data.features.filter(feature => feature.geometry.type === "Point")
      };
  
      const lineStringFeatures = {
        type: "FeatureCollection",
        features: layer.data.features.filter(feature => 
          feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString")
      };
  
      const polygonFeatures = {
        type: "FeatureCollection",
        features: layer.data.features.filter(feature => 
          feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
      };
  
      // Handle Points
      if (pointFeatures.features.length > 0) {
        const pointLayerId = `${layerIdBase}-points`;
        if (!map.getSource(pointLayerId)) {
          map.addSource(pointLayerId, {
            type: 'geojson',
            data: pointFeatures
          });
          map.addLayer({
            id: pointLayerId,
            type: 'circle',
            source: pointLayerId,
            paint: {
              'circle-color': '#FF0000',
              'circle-radius': 5
            }
          });
        } else {
          map.getSource(pointLayerId).setData(pointFeatures);
        }
        map.setLayoutProperty(pointLayerId, 'visibility', layer.visible ? 'visible' : 'none');
      }
  
      // Handle LineStrings
      if (lineStringFeatures.features.length > 0) {
        const lineLayerId = `${layerIdBase}-lines`;
        if (!map.getSource(lineLayerId)) {
          map.addSource(lineLayerId, {
            type: 'geojson',
            data: lineStringFeatures
          });
          map.addLayer({
            id: lineLayerId,
            type: 'line',
            source: lineLayerId,
            paint: {
              'line-color': '#0000FF',
              'line-width': 2
            }
          });
        } else {
          map.getSource(lineLayerId).setData(lineStringFeatures);
        }
        map.setLayoutProperty(lineLayerId, 'visibility', layer.visible ? 'visible' : 'none');
      }
  
      // Handle Polygons
      if (polygonFeatures.features.length > 0) {
        const polygonLayerId = `${layerIdBase}-polygons`;
        if (!map.getSource(polygonLayerId)) {
          map.addSource(polygonLayerId, {
            type: 'geojson',
            data: polygonFeatures
          });
          map.addLayer({
            id: polygonLayerId,
            type: 'fill',
            source: polygonLayerId,
            paint: {
              'fill-color': '#00FF00',
              'fill-opacity': 0.5
            }
          });
        } else {
          map.getSource(polygonLayerId).setData(polygonFeatures);
        }
        map.setLayoutProperty(polygonLayerId, 'visibility', layer.visible ? 'visible' : 'none');
      }
  
      // Extend the bounds for all feature types
      layer.data.features.forEach(feature => {
        const geometryType = feature.geometry.type;
        if (geometryType === 'Point') {
          bounds.extend(feature.geometry.coordinates);
        } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
          feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
        } else if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          const coordinates = geometryType === 'Polygon'
            ? feature.geometry.coordinates[0] // Outer boundary of the polygon
            : feature.geometry.coordinates.flat(2); // MultiPolygon flattened coordinates
          coordinates.forEach(coord => bounds.extend(coord));
        }
      });
  
      hasVisibleLayers = true;
    });
  
    // Apply zoom based on the presence of layers
    if (hasVisibleLayers) {
      map.fitBounds(bounds, { padding: 20, duration: 1000 });
    } else {
      map.easeTo({
        zoom: 1,
        duration: 1000,
        easing: t => t
      });
    }
  }, [layers, mapLoaded]);
  

  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);

  const handleThemeChange = (newTheme) => {
    if (mapRef.current) {
      const map = mapRef.current;
  
      // Save the current layers and sources
      const existingLayers = layers.map(layer => ({
        id: `geojson-layer-${layer.id}`,
        data: layer.data,
        visible: layer.visible
      }));
  
      map.setStyle(`mapbox://styles/mapbox/${newTheme}`); // Set the new theme
  
      // Once the new style is loaded, re-add the layers and sources
      map.once('styledata', () => {
        existingLayers.forEach(layer => {
          const pointFeatures = {
            type: "FeatureCollection",
            features: layer.data.features.filter(feature => feature.geometry.type === "Point")
          };
    
          const lineStringFeatures = {
            type: "FeatureCollection",
            features: layer.data.features.filter(feature => 
              feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString")
          };
    
          const polygonFeatures = {
            type: "FeatureCollection",
            features: layer.data.features.filter(feature => 
              feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
          };
    
          // Handle Points
          if (pointFeatures.features.length > 0) {
            const pointLayerId = `${layer.id}-points`;
            if (!map.getSource(pointLayerId)) {
              map.addSource(pointLayerId, {
                type: 'geojson',
                data: pointFeatures
              });
              map.addLayer({
                id: pointLayerId,
                type: 'circle',
                source: pointLayerId,
                paint: {
                  'circle-color': '#FF0000',
                  'circle-radius': 5
                }
              });
            }
            map.setLayoutProperty(pointLayerId, 'visibility', layer.visible ? 'visible' : 'none');
          }
    
          // Handle LineStrings
          if (lineStringFeatures.features.length > 0) {
            const lineLayerId = `${layer.id}-lines`;
            if (!map.getSource(lineLayerId)) {
              map.addSource(lineLayerId, {
                type: 'geojson',
                data: lineStringFeatures
              });
              map.addLayer({
                id: lineLayerId,
                type: 'line',
                source: lineLayerId,
                paint: {
                  'line-color': '#0000FF',
                  'line-width': 2
                }
              });
            }
            map.setLayoutProperty(lineLayerId, 'visibility', layer.visible ? 'visible' : 'none');
          }
    
          // Handle Polygons
          if (polygonFeatures.features.length > 0) {
            const polygonLayerId = `${layer.id}-polygons`;
            if (!map.getSource(polygonLayerId)) {
              map.addSource(polygonLayerId, {
                type: 'geojson',
                data: polygonFeatures
              });
              map.addLayer({
                id: polygonLayerId,
                type: 'fill',
                source: polygonLayerId,
                paint: {
                  'fill-color': '#00FF00',
                  'fill-opacity': 0.5
                }
              });
            }
            map.setLayoutProperty(polygonLayerId, 'visibility', layer.visible ? 'visible' : 'none');
          }
        });
      });
    }
  };
  
  return (
    <div className="relative">
      <div ref={mapContainerRef} className="map-container" />
      <ThemeSelector onThemeChange={handleThemeChange} /> {/* Add the ThemeSelector */}
    </div>
  );
};

export default MapboxMap;
