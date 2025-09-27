"use client"
import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAccount } from 'wagmi';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const UpiQrScanner = () => {
  const { isConnected } = useAccount();
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [jsonObject, setJsonObject] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Check wallet connection before starting scanner
  useEffect(() => {
    if (isConnected) {
      setIsScanning(true);
    } else {
      setIsScanning(false);
      toast.error('Please connect your wallet first to use QR scanner', {
        duration: 4000,
        position: 'bottom-right',
        style: {
          background: '#dc3545',
          color: 'white',
          fontWeight: 'bold',
        },
      });
    }
  }, [isConnected]);

  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      const scannedText = result[0]?.rawValue || result[0]?.data || result;
      
      try {
        // Parse the UPI URL string into a JSON object
        const url = new URL(scannedText);
        const params = Object.fromEntries(url.searchParams.entries());
        
        // Show success toast and immediately redirect
        toast.success('UPI QR Code scanned! Redirecting to create order...', {
          duration: 1500,
          position: 'bottom-right',
          style: {
            background: '#28a745',
            color: 'white',
            fontWeight: 'bold',
          },
        });

        // Immediate redirect to maker dashboard with UPI data - no intermediate state
        const queryParams = new URLSearchParams({
          upiAddress: params.pa || '',
          payeeName: params.pn || '',
          amount: params.am || '',
          transactionRef: params.tr || '',
          merchantCode: params.mc || ''
        }).toString();
        
        // Redirect immediately without setting any intermediate state
        router.push(`/maker-dashboard?tab=create&${queryParams}`);
        
      } catch (err) {
        // If it's not a URL, try to parse as UPI format
        if (scannedText.toLowerCase().startsWith('upi://')) {
          try {
            const upiUrl = new URL(scannedText);
            const params = Object.fromEntries(upiUrl.searchParams.entries());
            
            // Show success toast and immediately redirect
            toast.success('UPI QR Code scanned! Redirecting to create order...', {
              duration: 1500,
              position: 'bottom-right',
              style: {
                background: '#28a745',
                color: 'white',
                fontWeight: 'bold',
              },
            });

            // Immediate redirect to maker dashboard with UPI data
            const queryParams = new URLSearchParams({
              upiAddress: params.pa || '',
              payeeName: params.pn || '',
              amount: params.am || '',
              transactionRef: params.tr || '',
              merchantCode: params.mc || ''
            }).toString();
            
            // Redirect immediately without setting any intermediate state
            router.push(`/maker-dashboard?tab=create&${queryParams}`);
            
          } catch (upiErr) {
            setError('Invalid UPI QR code format');
            setJsonObject(null);
            toast.error('Invalid UPI QR code format', {
              duration: 3000,
              position: 'bottom-right',
              style: {
                background: '#dc3545',
                color: 'white',
                fontWeight: 'bold',
              },
            });
          }
        } else {
          // For non-UPI QR codes, just show the raw data
          setJsonObject({ rawData: scannedText });
          setError(null);
          setIsScanning(false);
        }
      }
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner Error:', err);
    setError('Error scanning QR code: ' + (err?.message || 'Unknown error'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '90vw',
          },
        }}
      />
      
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
            <span className="text-2xl">📱</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            UPI QR Scanner
          </h1>
          <p className="text-gray-600 text-sm">
            Scan UPI QR codes to process payments
          </p>
        </div>

        {/* Wallet Connection Status */}
        {!isConnected && (
          <div className="bg-blue-50 border-4 border-blue-300 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-blue-800 text-center mb-2">
              Wallet Not Connected
            </h3>
            <p className="text-blue-600 text-center text-sm leading-relaxed">
              Connect your wallet to start scanning UPI QR codes and process payments securely
            </p>
          </div>
        )}

        {/* Camera Scanner */}
        {isConnected && isScanning && !scanResult && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
            {/* Scanner Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-white font-medium">Scanning Active</span>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="px-6 py-4 bg-blue-50 border-b">
              <p className="text-center text-blue-700 font-medium text-sm">
                Point your camera at a UPI QR code
              </p>
            </div>
            
            {/* Scanner Area */}
            <div className="p-4">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  constraints={{
                    facingMode: 'environment'
                  }}
                  styles={{
                    container: {
                      width: '100%',
                      height: '280px',
                    }
                  }}
                  allowMultiple={false}
                  scanDelay={300}
                />
              </div>
              
              {/* Tips */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 mb-2">💡 Tips for better scanning:</p>
                <div className="flex justify-center space-x-4 text-xs text-gray-400">
                  <span>• Good lighting</span>
                  <span>• Steady hands</span>
                  <span>• Clear QR code</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl mr-2">❌</span>
              <span className="text-red-800 font-semibold">Scan Error</span>
            </div>
            <p className="text-red-600 text-center text-sm">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpiQrScanner;