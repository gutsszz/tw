// WmsFetcher.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const WmsFetcher = ({ onFetchWmsUrl }) => {
  useEffect(() => {
    const fetchWmsUrl = async () => {
      try {
        const response = await axios.get('http://localhost:5000/wms-url');
        onFetchWmsUrl(response.data.wmsUrl);
      } catch (error) {
        console.error('Error fetching WMS URL:', error);
      }
    };

    fetchWmsUrl();
  }, [onFetchWmsUrl]);

  return null; // This component doesn't need to render anything
};

export default WmsFetcher;
