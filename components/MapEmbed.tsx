import React from 'react';

interface MapEmbedProps {
  address: string;
}

const MapEmbed: React.FC<MapEmbedProps> = ({ address }) => {
  if (!address) return null;

  const encodedAddress = encodeURIComponent(address);
  // Using the output=embed parameter for a simple iframe map without API key requirement for basic display
  const mapSrc = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="w-full h-full bg-gray-200 rounded-lg overflow-hidden relative">
      <iframe
        title="Map Location"
        width="100%"
        height="100%"
        src={mapSrc}
        frameBorder="0"
        style={{ border: 0, minHeight: '300px' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};

export default MapEmbed;
