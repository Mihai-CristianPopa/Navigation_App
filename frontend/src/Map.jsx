import { useState, useEffect } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import LeafletControlGeocoder from "./LeafletControlGeocoder.jsx";

const Map = (props) => {
  const { positionInfos } = props;
  // get the location from geolocation
  const [latLng, setLatLng] = useState({
    lat: 0.0,
    lng: 0.0,
    isLoaded: false,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatLng({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            isLoaded: true,
          });
        },
        (error) => {
          alert(error);
        }
      );
    }
  }, [setLatLng]);

  return (
    <MapContainer center={[latLng.lat, latLng.lng]} zoom={13}>
      <TileLayer
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LeafletControlGeocoder positionInfos={positionInfos} />
    </MapContainer>
  );
};

export default Map;