import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onScanFailureRef = useRef(onScanFailure);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
    onScanFailureRef.current = onScanFailure;
  });

  useEffect(() => {
    let isMounted = true;
    const scannerId = "qr-reader-video";

    const startCamera = async () => {
      // Small delay to allow the browser to release the camera hardware lock from the previous scan
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!isMounted) return;

      try {
        const qrInstance = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = qrInstance;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        const handleSuccess = (decodedText: string) => {
          if (isMounted) {
            console.log("🎯 Camera auto-detected QR:", decodedText);
            // Let the cleanup function handle stopping the camera to prevent race conditions
            onScanSuccessRef.current(decodedText);
          }
        };

        const handleErr = (err: any) => {
          if (onScanFailureRef.current) onScanFailureRef.current(err);
        };

        try {
          await qrInstance.start({ facingMode: "environment" }, config, handleSuccess, handleErr);
        } catch (camErr) {
          // Fallback to front camera or default camera
          await qrInstance.start({ facingMode: "user" }, config, handleSuccess, handleErr);
        }

        if (isMounted) setIsScanningActive(true);
      } catch (err: any) {
        console.error("Camera access failed:", err);
        if (isMounted) {
          setCameraError(`Camera Error: ${err?.message || err || 'Unknown Error'}. Please close other tabs/apps using the camera and refresh.`);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
              html5QrCodeRef.current?.clear();
            }).catch(console.error);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const qrInstance = html5QrCodeRef.current || new Html5Qrcode("qr-reader-video");
      const decodedText = await qrInstance.scanFile(file, true);
      console.log("🎯 Image File detected QR:", decodedText);
      onScanSuccessRef.current(decodedText);
    } catch (err) {
      alert("⚠️ Could not detect a valid QR code in that photo. Please try another photo or enter code manually.");
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto', backgroundColor: '#0f172a', padding: '1rem', borderRadius: '12px', border: '2px solid var(--color-gold)', textAlign: 'center' }}>
      <div 
        id="qr-reader-video" 
        style={{ 
          width: '100%', 
          minHeight: '260px', 
          backgroundColor: '#020617', 
          borderRadius: '8px', 
          overflow: 'hidden',
          position: 'relative'
        }}
      ></div>

      {cameraError && (
        <div style={{ color: '#f87171', backgroundColor: '#450a0a', padding: '0.8rem', borderRadius: '8px', marginTop: '0.8rem', fontSize: '0.85rem' }}>
          {cameraError}
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          {isScanningActive ? '🟢 Camera active — Point at Checkpoint QR code' : '⏳ Starting camera feed...'}
        </p>

        <label style={{
          backgroundColor: '#334155', color: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '6px',
          cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid #475569', display: 'inline-block', marginTop: '0.3rem'
        }}>
          📁 Upload QR Photo / File
          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
};

export default QRScanner;
