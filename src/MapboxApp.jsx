import { useState, useEffect } from 'react';
import MapboxMap from './Mapbox';
import Sidebar from './Sidebar';
import { db } from './firebase';
import { doc, collection, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import './App.css';
import Topbar from './Topbar';

const MapboxApp = () => {
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [zoomToLayerId, setZoomToLayerId] = useState(null);
  const [Rasterzoomid, setRasterzoomid] = useState(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [converted, setConverted] = useState(false);



  const geoJsonFiles = {
    '1': '/Forsteinrichtung_Current.geojson',
  };

  const loadGeoJson = async (filePath) => {
    try {
      const response = await fetch(filePath);
      const geojson = await response.json();
      
      // Open the notification and start loading
      setIsNotificationOpen(true);
      setProgress(0);
      setConverted(false);

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setConverted(true); // Indicate completion
            return 100; // Ensure progress is capped at 100
          }
          return prev + 10; // Increment progress
        });
      }, 1000);

      await new Promise((resolve) => setTimeout(resolve, 10000));
      handleGeoJsonUpload(geojson, filePath); // Handle the upload
    } catch (error) {
      console.error("Error loading GeoJSON:", error);
      setIsNotificationOpen(false); // Close on error
    }
  };
  
  const handleToggleLayer = (id) => {
    setLayers(layers.map(layer =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  };



function getairequest(id){

    const geojsonFile = geoJsonFiles[id];
    if (geojsonFile) {
      loadGeoJson(geojsonFile);
      console.log("geojson id" + id);
      
    } else {
      console.log("No corresponding GeoJSON file found for this layerId");
    }

  }


  

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
    setConverted(true); // Indicate completion
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


 function handleRasterZoom(id) {
setRasterzoomid(id);
 }


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

  useEffect(() => {
    fetchSavedLayers();
  }, []);

  return (
    <>
      <Topbar
        isNotificationOpen={isNotificationOpen}
        progress={progress}
        converted={converted}
        setIsNotificationOpen={setIsNotificationOpen}
      />
      <div className="flex">
        <Sidebar 
          onGeoJsonUpload={handleGeoJsonUpload} 
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onSaveLayer={handleSaveLayer}
          onDeleteLayer={handleDeleteLayer}
          setSelectedLayerId={setSelectedLayerId}
          handleClickZoom={handleClickZoom}
          handleRasterZoom={handleRasterZoom}
        />
        <MapboxMap layers={layers} zoomid={zoomToLayerId} setZoom={setZoomToLayerId} Rasterzoomid={Rasterzoomid} getairequest={getairequest} setRasterzoomid={setRasterzoomid} />
      </div>
    </>
  );
};

export default MapboxApp;
