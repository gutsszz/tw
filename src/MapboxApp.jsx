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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false); // New state for upload status
  const [converted, setConverted] = useState(false); // New state to track upload completion


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
      setProgress(0);           // Reset progress to 0
      setConverted(false);       // Reset conversion status
      setIsUploading(false);     // Ensure uploading state is false initially
      setIsNotificationOpen(true);
        const CHUNK_SIZE = 1024 * 1024 * 10; // 10 MB per chunk
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedChunks = 0;
        
        setStatusMessage(`Uploading ${fileName} in ${totalChunks} chunks...`);
        setIsUploading(true);  // Set isUploading to true
  
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
             const response = await fetch('https://nodeback.duckdns.org:3009/upload', {
              method: 'POST',
              body: formData,
            });
  
            const result = await response.json();
            if (result.success) {
              uploadedChunks++;
              setProgress(Math.round((uploadedChunks / totalChunks) * 100));  // Update progress
  
              if (chunkIndex + 1 === totalChunks) {
                setConverted(true);  // Set upload completion status
                setStatusMessage('File uploaded and registered successfully with GeoServer!');
                setIsUploading(false);  // Set isUploading to false
                
                // Add to tiffLayers
                const mapboxUrl = result.mapboxUrl;
                const boundingBox = result.boundingBox;
                const outputFile = result.outputFile;
                const workspace = "yamama";
                const newId = Date.now();
                const tiffLayer = {
                  id: newId,
                  name: outputFile,
                  file,
                  visible: true,
                  workspace,
                  outputFile,
                  boundingBox,
                  mapboxUrl,
                };
                setTiffLayers((prevTiffLayers) => [...prevTiffLayers, tiffLayer]);
              }
            } else {
              setStatusMessage(`Failed to upload chunk ${chunkIndex + 1}`);
              setIsUploading(false);  // Reset isUploading on failure
              return;
            }
          } catch (error) {
            console.error('Error processing file:', error);
            setIsUploading(false);  // Reset isUploading on error
          }
        }
  
        event.target.value = ''; // Clear file input after upload
      }
    }
  };
  

  const handleDeleteTiffLayer = async (tiffLayerId, workspace, layerName) => {
    try {
        // Send the delete request to the Python backend
        const layerResponse = await fetch(`http://127.0.0.1:5000/delete-layer`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ workspace, layerName })
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
     <Topbar
  isNotificationOpen={isNotificationOpen}
  progress={isUploading ? progress : 0} // Show progress only if uploading
  converted={converted} // Show completion status
  setIsNotificationOpen={setIsNotificationOpen}
  showLoader={isUploading} // Pass the upload status to Topbar
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
