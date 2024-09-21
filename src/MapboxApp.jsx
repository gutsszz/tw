import { useState, useEffect } from 'react';
import MapboxMap from './Mapbox';
import Sidebar from './Sidebar';
import { db } from './firebase';
import { doc, collection, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import './App.css';
import Topbar from './Topbar';
import WmsFetcher from './WmsFetcher';


const MapboxApp = () => {
  const [layers, setLayers] = useState([]);
  const [tiffLayers, setTiffLayers] = useState([]);
  const [wmsUrl, setWmsUrl] = useState(null);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [zoomToLayerId, setZoomToLayerId] = useState(null);

  const handleToggleLayer = (id) => {
    setLayers(layers.map(layer =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const handleGeoJsonUpload = (geojson, name) => {
    const existingLayer = layers.find(layer => layer.name === name);
    if (existingLayer) {
      console.error('Layer with this name already exists');
      return;
    }

    const layerId = `layer-${Date.now()}`;
    const newLayer = {
      id: layerId,
      data: geojson,
      name: name,
      visible: true
    };
    
    setLayers(prevLayers => [...prevLayers, newLayer]);
  };

  const handleTiffUpload = (file) => {
    const tiffName = file.name.split('.').slice(0, -1).join('.');
    const existingLayer = tiffLayers.find(layer => layer.name === tiffName);
    if (existingLayer) {
      console.error('Layer with this name already exists');
      return;
    }

    const newTiffLayer = {
      name: tiffName,
      file: file
    };

    setTiffLayers(prev => [...prev, newTiffLayer]);
  };

  const handleSaveLayer = async () => {
    if (!selectedLayerId) {
      console.error("Please select a layer to save.");
      return;
    }

    const selectedLayer = layers.find(layer => layer.id === selectedLayerId);
    if (!selectedLayer) {
      console.error("Selected layer not found.");
      return;
    }

    try {
      const userId = "userId1"; // Replace with the actual user ID
      const userDocRef = doc(db, "users", userId);
      const layerDocRef = doc(userDocRef, "layers", selectedLayer.name);

      await setDoc(layerDocRef, {
        geojson: JSON.stringify(selectedLayer.data)
      });

      console.log("Layer saved successfully!");
    } catch (error) {
      console.error("Error saving layer:", error);
    }
  };


  const handleClickZoom = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      setZoomToLayerId(layerId);
    }
  };


  const handleDeleteLayer = async (id) => {
    try {
      const userId = "userId1";
      const userDocRef = doc(db, "users", userId);
      const layer = layers.find(layer => layer.id === id);
      if (layer) {
        const layerDocRef = doc(userDocRef, "layers", layer.name);
        await deleteDoc(layerDocRef);
        
        setLayers(layers.filter(layer => layer.id !== id));
        console.log("Layer deleted successfully!");
      } else {
        console.error("Layer not found.");
      }
    } catch (error) {
      console.error("Error deleting layer:", error);
    }
  };

  const fetchSavedLayers = async () => {
    try {
      const userId = "userId1";
      const userDocRef = doc(db, "users", userId);
      const userLayersRef = collection(userDocRef, "layers");

      const unsubscribe = onSnapshot(userLayersRef, (snapshot) => {
        const layersData = snapshot.docs.map(doc => ({
          id: doc.id,
          data: JSON.parse(doc.data().geojson),
          name: doc.id,
          visible: true
        }));

        setLayers(layersData);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error fetching saved layers:", error);
    }
  };

  const handleFetchWmsUrl = (url) => {
    setWmsUrl(url);
  };

  useEffect(() => {
    fetchSavedLayers();
  }, []);


  return (
    <>
          <WmsFetcher onFetchWmsUrl={handleFetchWmsUrl} /> {/* Fetch WMS URL */}

      <Topbar/>

    <div className="flex">
      <Sidebar 
        onGeoJsonUpload={handleGeoJsonUpload} 
        layers={layers}
        tiffLayers={tiffLayers}

        onToggleLayer={handleToggleLayer}
        onSaveLayer={handleSaveLayer}
        onDeleteLayer={handleDeleteLayer}
        setSelectedLayerId={setSelectedLayerId}
        handleClickZoom={handleClickZoom}
      />
        <MapboxMap layers={layers} zoomid={zoomToLayerId} setZoom={setZoomToLayerId} wmsUrl={wmsUrl} />
        </div>
    </>
  );
};

export default MapboxApp;
