import { useState, useEffect } from 'react';
import MapboxMap from './Mapbox';
import Sidebar from './Sidebar';
import { db } from './firebase';
import { doc, collection, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import './App.css';
import Topbar from './Topbar';

const MapboxApp = () => {
  const [layers, setLayers] = useState([]);
  const [tiffLayers, setTiffLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [zoomToLayerId, setZoomToLayerId] = useState(null);
  const [Rasterzoomid, setRasterzoomid] = useState(null);
  const [statusMessage, setStatusMessage] = useState(''); // Add status message state
  const [activeSection, setActiveSection] = useState('geojson'); // Define activeSection state


  function handleRasterZoom(id){
setRasterzoomid(id);
  }
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
      const userId = "userId1";
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
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();
 
      if (fileExtension === 'geojson') {
        reader.onload = () => {
          try {
            const geojson = JSON.parse(reader.result);
            const baseName = fileName.split('.').slice(0, -1).join('.');
            handleGeoJsonUpload(geojson, baseName);
          } catch (error) {
            console.error('Error parsing GeoJSON:', error);
          }
        };
        reader.readAsText(file);
      } else if (fileExtension === 'tiff' || fileExtension === 'tif') {
        const CHUNK_SIZE = 1024 * 1024 * 10; // 10 MB per chunk
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedChunks = 0; // Track the uploaded chunks
        setStatusMessage(`Uploading ${fileName} in ${totalChunks} chunks...`);
  
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
  
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', chunkIndex);
          formData.append('totalChunks', totalChunks);
          formData.append('fileName', fileName);
  
          try {
            const response = await fetch('http://37.60.227.174:3009/upload', {
              method: 'POST',
              body: formData,
            });
  
            const result = await response.json();
            if (result.success) {
              uploadedChunks++; // Keep track of successful uploads
              // Update statusMessage only every 5 chunks (adjustable)
              if (chunkIndex % 5 === 0 || chunkIndex + 1 === totalChunks) {
                setStatusMessage(`Uploaded ${uploadedChunks}/${totalChunks} chunks...`);
              }
            } else {
              setStatusMessage(`Failed to upload chunk ${chunkIndex + 1}`);
              return; // Exit early if any chunk fails
            }
  
            // After all chunks are uploaded
            if (chunkIndex + 1 === totalChunks) {
              setStatusMessage('File uploaded and registered successfully with GeoServer!');
  
              const wmsUrl = result.wmsUrl;
              const mapboxUrl = result.mapboxUrl;
              const urlParams = new URLSearchParams(wmsUrl.split('?')[1]);
              const layersParam = urlParams.get('layers');
              const [workspace, layerName] = layersParam.split(':');
  
              const baseName = fileName.split('.').slice(0, -1).join('.');
              const newId = Date.now(); // Unique ID based on timestamp
  
              const tiffLayer = {
                id: newId,
                name: baseName,
                file,
                visible: true,
                wmsUrl,
                workspace,
                layerName,
                boundingBox: result.boundingBox,
                mapboxUrl,
              };
  
              setTiffLayers((prevTiffLayers) => [...prevTiffLayers, tiffLayer]);
            }
  
          } catch (error) {
            console.error('Error processing file:', error);
          }
        }
  
        event.target.value = ''; // Clear file input after upload
      } else {
        setStatusMessage('Unsupported file type. Please upload a GeoJSON or TIFF file.');
      }
    }
  };

  const handleDeleteTiffLayer = async (tiffLayerId, workspace, layerName) => {
    try {
        // Delete the layer (and store) from GeoServer
        const layerResponse = await fetch(`http://localhost:3001/geoserver/layer/${workspace}/${layerName}`, {
            method: 'DELETE',
        });

        if (!layerResponse.ok) {
            const errorResponse = await layerResponse.json();
            throw new Error(`Failed to delete layer from GeoServer: ${errorResponse.message || layerResponse.statusText}`);
        }

        // Remove the TIFF layer from the state (UI)
        setTiffLayers(prevTiffLayers => prevTiffLayers.filter(tiff => tiff.id !== tiffLayerId));

        setStatusMessage(`TIFF layer '${layerName}' and its store deleted successfully.`);
    } catch (error) {
        console.error("Error deleting TIFF layer:", error);
        setStatusMessage(`Failed to delete TIFF layer '${layerName}'.`);
    }
};
  
  useEffect(() => {
    fetchSavedLayers();
  }, []);

  return (
    <>
      <Topbar setActiveSection={setActiveSection} /> {/* Add a prop for setting activeSection */}
      <div className="flex">
        <Sidebar 
          onGeoJsonUpload={handleGeoJsonUpload} 
          layers={layers}
          onToggleLayer={handleToggleLayer}
          onSaveLayer={handleSaveLayer}
          onDeleteLayer={handleDeleteLayer}
          setSelectedLayerId={setSelectedLayerId}
          handleClickZoom={handleClickZoom}
          tiffLayers={tiffLayers}
        
          onFileChange={handleFileChange} // Pass the file change handler
          setTiffLayers={setTiffLayers} // Add this line
          setActiveSection={setActiveSection}
          activeSection={activeSection}
          handleRasterZoom={handleRasterZoom}
          handleDeleteTiffLayer={handleDeleteTiffLayer}  // Pass the handler as a prop

        />
        <MapboxMap layers={layers} zoomid={zoomToLayerId} setZoom={setZoomToLayerId} Rasterzoomid={Rasterzoomid} tiffLayers={tiffLayers} />
      </div>
    </>
  );
};

export default MapboxApp;
