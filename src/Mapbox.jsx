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
        map.fitBounds(bounds, { padding: 50, maxZoom: 15,duration: 800 }); // Zoom to fit the layer
      }
    }
  
  
  }, [zoomid]);
  
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

      // Convert GeoJSON data to EPSG:4326 if needed
      const convertedGeoJSON = convertGeoJSON(layer.data);

      // Filter features by geometry type
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

      if (polygonFeatures.features.length > 0) {
        const polygonLayerId = `${layerIdBase}-polygons`;
        const borderLayerId = `${layerIdBase}-border`;
    
        // Add or update polygon layer
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
                    'fill-opacity': 0.35
                }
            });
        } else {
            map.getSource(polygonLayerId).setData(polygonFeatures);
        }
        map.setLayoutProperty(polygonLayerId, 'visibility', layer.visible ? 'visible' : 'none');
    
        // Add or update border layer
        if (!map.getSource(borderLayerId)) {
            map.addSource(borderLayerId, {
                type: 'geojson',
                data: polygonFeatures
            });
            map.addLayer({
                id: borderLayerId,
                type: 'line',
                source: borderLayerId,
                paint: {
                    'line-color': '#009900', // Darker border color
                    'line-width': 2
                }
            });
        } else {
            map.getSource(borderLayerId).setData(polygonFeatures);
        }
        map.setLayoutProperty(borderLayerId, 'visibility', layer.visible ? 'visible' : 'none');
    

                  // Add click event listener for polygons
map.on('click', polygonLayerId, (e) => {
  const feature = e.features[0];
  const coordinates = e.lngLat;

  const area = parseFloat(feature.properties.area);
  const displayArea = isNaN(area) ? "Area's information not available" : `${area.toFixed(2)} m²`;

  const popupHTML = `
    <div style="text-align: center;">
      <p><strong>Area:</strong> ${displayArea}</p>
    </div>
  `;

  new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: true,
    offset: [0, -10]
  })
    .setLngLat(coordinates)
    .setHTML(popupHTML)
    .addTo(map);
});

// Change cursor to pointer on hover
map.on('mouseenter', polygonLayerId, () => {
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', polygonLayerId, () => {
  map.getCanvas().style.cursor = '';
});
      }

      // Extend the bounds for all feature types
      

      hasVisibleLayers = true;
    });
  
   
    
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
    
          if (polygonFeatures.features.length > 0) {
            const polygonLayerId = `${layer.id}-polygons`;
            const borderLayerId = `${layer.id}-border`; // Added border layer ID
        
            // Add or update polygon layer
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
                        'fill-opacity': 0.35
                    }
                });
            } else {
                map.getSource(polygonLayerId).setData(polygonFeatures);
            }
            map.setLayoutProperty(polygonLayerId, 'visibility', layer.visible ? 'visible' : 'none');
        
            // Add or update border layer
            if (!map.getSource(borderLayerId)) {
                map.addSource(borderLayerId, {
                    type: 'geojson',
                    data: polygonFeatures
                });
                map.addLayer({
                    id: borderLayerId,
                    type: 'line',
                    source: borderLayerId,
                    paint: {
                        'line-color': '#009900', // Darker border color
                        'line-width': 2
                    }
                });
            } else {
                map.getSource(borderLayerId).setData(polygonFeatures);
            }
            map.setLayoutProperty(borderLayerId, 'visibility', layer.visible ? 'visible' : 'none');
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
