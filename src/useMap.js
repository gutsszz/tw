
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1IjoidGFsaGF3YXFxYXMxNCIsImEiOiJjbHBreHhscWEwMWU4MnFyenU3ODdmeTdsIn0.8IlEgMNGcbx806t363hDJg';

const useMap = (layers) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (mapContainerRef.current) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [0, 0],
        zoom: 1,
        attributionControl: false 
      });

      mapRef.current = map;

      map.on('load', () => {
        setMapLoaded(true);
      });

      map.on('resize', () => map.resize());

      return () => map.remove();
    }
  }, []);

  useEffect(() => {
    if (!mapLoaded) return;

    const map = mapRef.current;
    if (!map) return;

    const handleError = (error) => {
      console.error('Map error:', error);
    };

    try {
      const existingLayers = map.getStyle().layers.filter(layer => layer.id.startsWith('geojson-layer-'));

      existingLayers.forEach(layer => {
        if (!layers.some(l => `geojson-layer-${l.id}` === layer.id)) {
          map.removeLayer(layer.id);
          map.removeSource(layer.id);
        }
      });

      let bounds = new mapboxgl.LngLatBounds();
      let layersPresent = false;

      layers.forEach((layer) => {
        const layerId = `geojson-layer-${layer.id}`;

        try {
          if (map.getSource(layerId)) {
            map.getSource(layerId).setData(layer.data);
          } else {
            map.addSource(layerId, { type: 'geojson', data: layer.data });
            map.addLayer({
              id: layerId,
              type: 'circle',
              source: layerId,
              paint: { 'circle-color': '#FF0000', 'circle-radius': 5 }
            });
          }

          map.setLayoutProperty(layerId, 'visibility', layer.visible ? 'visible' : 'none');
          layersPresent = true;

          const data = layer.data;
          if (data.features) {
            data.features.forEach(feature => {
              if (feature.geometry.type === 'Point') {
                bounds.extend([feature.geometry.coordinates[0], feature.geometry.coordinates[1]]);
              } else if (feature.geometry.type === 'Polygon') {
                feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
              } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygon =>
                  polygon[0].forEach(coord => bounds.extend(coord))
                );
              }
            });
          }
        } catch (error) {
          handleError(error);
        }
      });

      if (layersPresent) {
        map.fitBounds(bounds, { padding: 20, duration: 1000 });
      } else {
        map.easeTo({ zoom: 1, duration: 1000, easing: t => t });
      }
    } catch (error) {
      handleError(error);
    }
  }, [layers, mapLoaded]);

  return mapContainerRef;
};

export default useMap;
