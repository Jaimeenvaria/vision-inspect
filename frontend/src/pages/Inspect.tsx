import React, { useEffect, useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Video,
  Info,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import api, { type Product, type ProductionLine, type InspectionDetail } from '../services/api';

export const Inspect: React.FC = () => {
  // Metadata states
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  
  // Selection states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [notes, setNotes] = useState('');
  
  // Uploader / Webcam States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Execution states
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<InspectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const prodList = await api.getProducts();
        const lineList = await api.getProductionLines();
        setProducts(prodList);
        setLines(lineList);
        if (prodList.length > 0) setSelectedProductId(prodList[0].id);
        if (lineList.length > 0) setSelectedLineId(lineList[0].id);
      } catch (err: any) {
        setError('Failed to load products or production lines metadata.');
      }
    };
    fetchMetadata();
  }, []);

  // --- Drag & Drop logic ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      selectFile(files[0]);
    }
  };

  const selectFile = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setWebcamActive(false);
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      selectFile(files[0]);
    }
  };

  // --- Webcam implementation ---
  const startWebcam = async () => {
    setWebcamActive(true);
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Unable to access camera. Check browser permissions.');
        setWebcamActive(false);
      }
    }, 100);
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' });
            setImageFile(capturedFile);
            setImagePreview(URL.createObjectURL(capturedFile));
            stopWebcam();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  // --- Trigger Inspection ---
  const executeScan = async () => {
    if (!imageFile) {
      setError('Please provide a product image or capture one using the webcam.');
      return;
    }
    if (!selectedProductId || !selectedLineId) {
      setError('Please configure the product SKU and production line settings.');
      return;
    }

    setScanning(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('product_id', selectedProductId);
    formData.append('production_line_id', selectedLineId);
    formData.append('shift', selectedShift);
    formData.append('notes', notes);

    try {
      const response = await api.inspectImage(formData);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Inspection pipeline failed. Verify image contents.');
    } finally {
      setScanning(false);
    }
  };

  const resetForm = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setNotes('');
    stopWebcam();
  };

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getStatusBanner = (status: 'pass' | 'rework' | 'reject') => {
    switch (status) {
      case 'pass':
        return {
          color: 'text-status-pass border-status-pass/30 bg-status-pass/5',
          icon: CheckCircle2,
          text: 'PASS: PART WITHIN TOLERANCE LIMITS',
          glow: 'shadow-glow-green border-status-pass'
        };
      case 'rework':
        return {
          color: 'text-status-rework border-status-rework/30 bg-status-rework/5',
          icon: AlertTriangle,
          text: 'REWORK REQUIRED: DEFECT RESOLUTION NEEDED',
          glow: 'shadow-glow-orange border-status-rework'
        };
      case 'reject':
        return {
          color: 'text-status-reject border-status-reject/30 bg-status-reject/5',
          icon: XCircle,
          text: 'REJECT: SCRAP COMPONENT IMMEDIATELY',
          glow: 'shadow-glow-red border-status-reject'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-industry-text tracking-wide uppercase">
          REAL-TIME QUALITY AUDITSCANNER
        </h1>
        <p className="text-sm font-mono text-industry-muted">
          Feed live camera frames or upload components to evaluate with YOLOv8.
        </p>
      </div>

      {/* Main Grid split: settings and uploader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Settings Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 space-y-5 border-l-2 border-l-tesla-red">
            <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider border-b border-industry-border pb-2">
              AUDIT SCAN SETTINGS
            </h3>

            {/* Product SKU */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Target Product SKU
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* Production Line */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Active Production Line
              </label>
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs"
              >
                {lines.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Operating Shift
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as any)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs uppercase"
              >
                <option value="morning">Morning Shift</option>
                <option value="afternoon">Afternoon Shift</option>
                <option value="night">Night Shift</option>
              </select>
            </div>

            {/* Operator Notes */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Audit Log Comments / Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optionally input diagnostic comments..."
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text placeholder-industry-muted/40 focus:outline-none focus:border-tesla-red text-xs resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex space-x-3">
              <button
                onClick={executeScan}
                disabled={scanning || (!imageFile && !webcamActive)}
                className="flex-grow py-2.5 px-4 bg-tesla-red hover:bg-tesla-darkred text-white text-xs font-mono uppercase font-bold tracking-wider rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center space-x-1.5 shadow-glow-red"
              >
                <Cpu className="h-4 w-4" />
                <span>{scanning ? 'Analyzing...' : 'Run Diagnostics'}</span>
              </button>
              
              <button
                onClick={resetForm}
                className="p-2.5 border border-industry-border bg-industry-bg text-industry-muted hover:text-industry-text rounded-lg transition-colors"
                title="Reset Form"
              >
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Viewport (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Diagnostic Console Box */}
          <div className="glass-panel p-6 flex flex-col items-center justify-center min-h-[420px] relative overflow-hidden bg-opacity-70 border-dashed border-2 border-industry-border">
            
            {/* Telemetry Scanning Line Overlay */}
            {scanning && (
              <div className="absolute inset-0 bg-gradient-to-b from-tesla-red/0 via-tesla-red/10 to-tesla-red/0 pointer-events-none z-10 animate-pulse border-y-2 border-tesla-red/30"></div>
            )}

            {/* Standard Uploader Trigger */}
            {!imagePreview && !webcamActive && (
              <div 
                className="w-full max-w-lg p-10 border-2 border-dashed border-industry-border/60 hover:border-tesla-red/50 hover:bg-industry-highlight/10 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center space-y-4"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-industry-muted" />
                <div className="text-center">
                  <p className="text-sm font-medium text-industry-text">Drag and drop quality inspection image</p>
                  <p className="text-xs text-industry-muted font-mono mt-1">PNG, JPG, or JPEG up to 10MB</p>
                </div>
                
                <div className="flex items-center space-x-4 w-full justify-center">
                  <label className="px-4 py-2 border border-industry-border hover:border-tesla-red/30 hover:bg-tesla-red/5 rounded-lg text-xs font-mono font-bold text-industry-muted hover:text-tesla-red cursor-pointer transition-all uppercase tracking-wider">
                    Browse File
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                  
                  <button
                    onClick={startWebcam}
                    className="flex items-center space-x-1.5 px-4 py-2 border border-industry-border hover:border-tesla-red/30 hover:bg-tesla-red/5 rounded-lg text-xs font-mono font-bold text-industry-muted hover:text-tesla-red transition-all uppercase tracking-wider"
                  >
                    <Video className="h-4.5 w-4.5" />
                    <span>Open Webcam</span>
                  </button>
                </div>
              </div>
            )}

            {/* Webcam Live Capture Viewport */}
            {webcamActive && (
              <div className="w-full max-w-xl relative bg-black rounded-lg overflow-hidden border border-industry-border">
                {/* Viewfinder crosshairs overlay */}
                <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 border border-white/20 rounded-full flex items-center justify-center pointer-events-none">
                  <div className="h-4 w-4 border border-white/40 rounded-full"></div>
                </div>
                
                <video ref={videoRef} autoPlay playsInline className="w-full object-cover aspect-video" />
                
                <div className="absolute bottom-4 inset-x-0 flex justify-center space-x-3">
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2.5 bg-tesla-red text-white text-xs font-mono font-bold uppercase rounded-full hover:bg-tesla-darkred tracking-wider shadow-glow-red flex items-center space-x-1.5"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Snap Telemetry</span>
                  </button>
                  <button
                    onClick={stopWebcam}
                    className="px-4 py-2.5 border border-white/30 bg-black/60 text-white text-xs font-mono uppercase rounded-full hover:bg-black/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Image Preview & Output Analysis Viewport */}
            {imagePreview && (
              <div className="w-full max-w-xl flex flex-col items-center justify-center">
                <div className="relative border border-industry-border rounded-lg overflow-hidden">
                  <img
                    src={result ? api.resolveImageUrl(result.image?.annotated_url || '') : imagePreview}
                    alt="Inspect Viewport"
                    className="w-full max-h-[380px] object-contain bg-black"
                  />
                  {scanning && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="flex flex-col items-center space-y-2">
                        <RefreshCw className="h-10 w-10 text-tesla-red animate-spin" />
                        <span className="font-mono text-xs uppercase tracking-widest text-tesla-red font-bold">YOLO ANALYZING...</span>
                      </div>
                    </div>
                  )}
                </div>
                {!scanning && (
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 border border-industry-border hover:border-tesla-red/30 hover:bg-tesla-red/5 text-xs font-mono rounded-lg text-industry-muted hover:text-tesla-red transition-all uppercase"
                    >
                      Clear Scan
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hidden Canvas for Webcam snapping */}
            <canvas ref={canvasRef} className="hidden" />

          </div>
        </div>

      </div>

      {/* Error Callout */}
      {error && (
        <div className="p-4 rounded-lg bg-status-reject/10 border border-status-reject/30 text-status-reject flex items-start space-x-2 text-sm max-w-7xl">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Diagnostic Scan Results Board */}
      {result && (
        <div className="space-y-6">
          
          {/* Banner Status Callout */}
          {(() => {
            const banner = getStatusBanner(result.status);
            const Icon = banner.icon;
            return (
              <div className={`p-5 border-l-4 rounded-lg flex items-center space-x-4 ${banner.color} ${banner.glow}`}>
                <Icon className="h-8 w-8 shrink-0 animate-pulse" />
                <div>
                  <h3 className="font-heading font-extrabold tracking-wide uppercase text-sm">{banner.text}</h3>
                  <p className="text-xs font-mono opacity-80 mt-1">
                    Inspection ID: {result.id} | Scanned: {new Date(result.created_at).toLocaleString()} | Average Defect Confidence: {Math.round(result.avg_confidence * 100)}%
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Detections List & LLM Explanation Summary Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Box Detections List (4 cols) */}
            <div className="lg:col-span-4 glass-panel p-6 space-y-4">
              <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider border-b border-industry-border pb-2">
                DETECTION TELEMETRY LOG
              </h3>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {result.defects.map((def, idx) => (
                  <div key={def.id} className="p-4 bg-industry-bg border border-industry-border rounded-lg relative overflow-hidden">
                    <span className="absolute top-2 right-3 text-[10px] font-mono text-industry-muted">
                      DEF_0{idx+1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                        def.severity === 'high' 
                          ? 'bg-status-reject' 
                          : def.severity === 'medium'
                          ? 'bg-status-rework'
                          : 'bg-yellow-300'
                      }`}></span>
                      <h4 className="font-heading font-bold text-xs uppercase tracking-wide">{def.defect_type}</h4>
                    </div>
                    <div className="mt-2 font-mono text-[10px] text-industry-muted space-y-1">
                      <p>Model Confidence: <span className="text-industry-text">{Math.round(def.confidence * 100)}%</span></p>
                      <p>Impact Severity: <span className={`uppercase font-bold ${
                        def.severity === 'high' ? 'text-status-reject' : def.severity === 'medium' ? 'text-status-rework' : 'text-yellow-300'
                      }`}>{def.severity}</span></p>
                    </div>
                  </div>
                ))}
                
                {result.defects.length === 0 && (
                  <div className="py-6 text-center text-status-pass font-mono text-xs flex flex-col items-center space-y-2">
                    <ShieldCheck className="h-10 w-10 text-status-pass" />
                    <span>0 DEFECTS DETECTED ON COMPONENT.</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Generated Detailed Insights (8 cols) */}
            <div className="lg:col-span-8 glass-panel p-6 space-y-5">
              <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider border-b border-industry-border pb-2 flex items-center space-x-1.5">
                <Info className="h-4.5 w-4.5 text-tesla-red" />
                <span>AI DEFECT DIAGNOSTIC EXPLANATION</span>
              </h3>

              {result.defects.length > 0 ? (
                <div className="space-y-6">
                  {result.defects.map((def, idx) => (
                    <div key={def.id} className="p-5 rounded-lg bg-industry-bg border border-industry-border space-y-4">
                      
                      {/* Title & Index */}
                      <div className="flex justify-between items-center border-b border-industry-border pb-2">
                        <span className="text-xs font-mono font-bold text-tesla-red uppercase tracking-wider">
                          DEFECT ANALYSIS 0{idx+1} : {def.defect_type.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-mono text-industry-muted">
                          CONFIDENCE: {Math.round(def.confidence * 100)}%
                        </span>
                      </div>

                      {/* Explanation */}
                      <div>
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-industry-muted mb-1">
                          Diagnostic Explanation & Potential Cause:
                        </h4>
                        <p className="text-xs text-industry-text font-mono leading-relaxed">
                          {def.explanation || 'Generating detailed AI explanation...'}
                        </p>
                      </div>

                      {/* Suggested Action */}
                      <div className="p-3.5 rounded bg-industry-highlight/30 border border-industry-border/50">
                        <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-tesla-red mb-1">
                          Recommended Corrective Action:
                        </h4>
                        <p className="text-xs text-industry-text font-mono font-bold leading-normal">
                          {def.suggested_action || 'Determining corrective action...'}
                        </p>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-industry-muted flex flex-col items-center justify-center space-y-3">
                  <ShieldCheck className="h-16 w-16 text-status-pass animate-bounce" />
                  <div className="max-w-md">
                    <h4 className="font-heading font-bold text-status-pass uppercase">Component Verified Clean</h4>
                    <p className="text-xs font-mono mt-1 text-industry-muted">
                      YOLOv8 defect identification engine scanned the image frame completely. Bounding boxes evaluated to null. Part is flagged within target specification margins and passed for final sorting assembly lines.
                    </p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Inspect;
