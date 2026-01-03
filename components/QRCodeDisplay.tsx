
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 180 }) => {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center">
      <QRCodeSVG value={value} size={size} level="H" includeMargin={true} />
    </div>
  );
};

export default QRCodeDisplay;
