import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Database, 
  Eye, 
  X, 
  FileText, 
  Info,
  RefreshCw
} from 'lucide-react';
import api, { type Inspection, type Product, type ProductionLine, type InspectionDetail } from '../services/api';

export const Logs: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  
  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedDefect, setSelectedDefect] = useState('');

  // Selected Detail states
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        status: selectedStatus || undefined,
        product_id: selectedProductId || undefined,
        production_line_id: selectedLineId || undefined,
        shift: selectedShift || undefined,
        defect_type: selectedDefect || undefined
      };
      const data = await api.getInspections(filters);
      setInspections(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const prodList = await api.getProducts();
        const lineList = await api.getProductionLines();
        setProducts(prodList);
        setLines(lineList);
      } catch (err: any) {
        console.error('Failed to load log metadata.');
      }
    };
    fetchMetadata();
    fetchLogs();
  }, []);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleViewDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setShowOriginal(false);
    try {
      const data = await api.getInspectionDetail(id);
      setDetail(data);
    } catch (err) {
      setError('Failed to fetch detailed log metadata.');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedStatus('');
    setSelectedProductId('');
    setSelectedLineId('');
    setSelectedShift('');
    setSelectedDefect('');
    // Trigger list reload after clearing variables in state
    setTimeout(() => {
      fetchLogs();
    }, 50);
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-industry-text tracking-wide uppercase">
          AUDIT LOG HISTORY
        </h1>
        <p className="text-sm font-mono text-industry-muted">
          Browse historical quality inspections and model diagnostic records.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-status-reject/10 border border-status-reject/30 text-status-reject text-xs font-mono">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Filters Panel (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <form onSubmit={handleApplyFilters} className="glass-panel p-6 space-y-5 border-t-2 border-t-industry-muted">
            <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider border-b border-industry-border pb-2 flex items-center space-x-1.5">
              <Filter className="h-4.5 w-4.5 text-tesla-red" />
              <span>SEARCH FILTERS</span>
            </h3>

            {/* Status */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                QC Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs uppercase"
              >
                <option value="">All Statuses</option>
                <option value="pass">Pass</option>
                <option value="rework">Rework</option>
                <option value="reject">Reject</option>
              </select>
            </div>

            {/* Product */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Product SKU
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs"
              >
                <option value="">All SKUs</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku}</option>
                ))}
              </select>
            </div>

            {/* Production Line */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Production Line
              </label>
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs"
              >
                <option value="">All Lines</option>
                {lines.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Working Shift
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs uppercase"
              >
                <option value="">All Shifts</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>

            {/* Defect Type */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                Defect Category
              </label>
              <select
                value={selectedDefect}
                onChange={(e) => setSelectedDefect(e.target.value)}
                className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs uppercase"
              >
                <option value="">All Defects</option>
                <option value="scratch">Scratch</option>
                <option value="dent">Dent</option>
                <option value="crack">Crack</option>
                <option value="paint defect">Paint Defect</option>
                <option value="misalignment">Misalignment</option>
                <option value="missing component">Missing Component</option>
                <option value="rust">Rust</option>
                <option value="anomaly">Anomaly</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-2 bg-tesla-red hover:bg-tesla-darkred text-white text-xs font-mono uppercase font-bold tracking-wider rounded-lg transition-colors flex justify-center items-center space-x-1.5"
              >
                <Search className="h-4 w-4" />
                <span>Search Logs</span>
              </button>
              
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full py-2 border border-industry-border hover:bg-industry-highlight/50 text-industry-muted hover:text-industry-text text-xs font-mono uppercase rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>

          </form>
        </div>

        {/* Logs Table (9 cols) */}
        <div className="lg:col-span-9">
          <div className="glass-panel p-6">
            <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider border-b border-industry-border pb-2 flex items-center space-x-1.5 mb-4">
              <Database className="h-4.5 w-4.5 text-tesla-red" />
              <span>INSPECTION Telemetry Logs</span>
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <RefreshCw className="h-8 w-8 text-tesla-red animate-spin" />
                <span className="font-mono text-xs text-industry-muted">Searching database index...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-industry-border text-industry-muted">
                      <th className="py-3 px-4">TIMESTAMP</th>
                      <th className="py-3 px-4">INSPECTION ID</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4">SHIFT</th>
                      <th className="py-3 px-4">CONFIDENCE</th>
                      <th className="py-3 px-4">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspections.map((item) => (
                      <tr key={item.id} className="border-b border-industry-border/50 hover:bg-industry-highlight/30 transition-colors">
                        <td className="py-3 px-4">{new Date(item.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4 text-industry-muted">{item.id.slice(0, 8)}...</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                            item.status === 'pass' 
                              ? 'bg-status-pass/10 text-status-pass border border-status-pass/30' 
                              : item.status === 'rework'
                              ? 'bg-status-rework/10 text-status-rework border border-status-rework/30'
                              : 'bg-status-reject/10 text-status-reject border border-status-reject/30'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase">{item.shift}</td>
                        <td className="py-3 px-4">{Math.round(item.avg_confidence * 100)}%</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleViewDetail(item.id)}
                            className="p-1 border border-industry-border bg-industry-bg text-industry-muted hover:text-tesla-red hover:border-tesla-red/30 rounded transition-colors"
                            title="Inspect Diagnostics Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inspections.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-industry-muted">
                          No matching logs found in system database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Slide-over detail drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          
          <div className="w-full max-w-xl h-full bg-industry-panel border-l border-industry-border flex flex-col shadow-2xl relative">
            
            {/* Drawer Close */}
            <button
              onClick={() => setSelectedId(null)}
              className="absolute top-4 left-4 p-1.5 border border-industry-border bg-industry-bg text-industry-muted hover:text-white rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {detailLoading || !detail ? (
              <div className="flex-grow flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-10 w-10 text-tesla-red animate-spin" />
                <span className="font-mono text-xs text-industry-muted">Loading telemetry logs details...</span>
              </div>
            ) : (
              <div className="flex-grow flex flex-col h-full overflow-y-auto p-6 pt-16 space-y-6">
                
                {/* Header */}
                <div>
                  <h3 className="text-lg font-heading font-bold text-industry-text flex items-center space-x-2">
                    <FileText className="h-5.5 w-5.5 text-tesla-red" />
                    <span>DIAGNOSTIC TELEMETRY DETAIL</span>
                  </h3>
                  <p className="text-xs font-mono text-industry-muted mt-1 leading-relaxed">
                    ID: {detail.id}<br />
                    Audited: {new Date(detail.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Status Callout Badge */}
                <div className={`p-4 rounded-lg border flex justify-between items-center ${
                  detail.status === 'pass'
                    ? 'bg-status-pass/5 border-status-pass/30 text-status-pass'
                    : detail.status === 'rework'
                    ? 'bg-status-rework/5 border-status-rework/30 text-status-rework'
                    : 'bg-status-reject/5 border-status-reject/30 text-status-reject'
                }`}>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider block text-industry-muted">Inspection Verdict</span>
                    <span className="font-heading font-extrabold uppercase text-sm">{detail.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider block text-industry-muted text-right">Avg Confidence</span>
                    <span className="font-heading font-bold text-right block text-sm">{Math.round(detail.avg_confidence * 100)}%</span>
                  </div>
                </div>

                {/* Meta details list */}
                <div className="grid grid-cols-2 gap-4 bg-industry-bg border border-industry-border p-4 rounded-lg font-mono text-xs">
                  <div>
                    <span className="text-industry-muted block">Product SKU</span>
                    <span className="font-bold text-industry-text">{detail.product.sku}</span>
                  </div>
                  <div>
                    <span className="text-industry-muted block">Product Name</span>
                    <span className="font-bold text-industry-text">{detail.product.name}</span>
                  </div>
                  <div className="pt-2 border-t border-industry-border">
                    <span className="text-industry-muted block">Production Line</span>
                    <span className="font-bold text-industry-text">{detail.production_line.name}</span>
                  </div>
                  <div className="pt-2 border-t border-industry-border">
                    <span className="text-industry-muted block">Inspector</span>
                    <span className="font-bold text-industry-text">{detail.inspector.username} ({detail.shift.toUpperCase()})</span>
                  </div>
                </div>

                {/* Picture Viewport */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center font-mono text-[10px] text-industry-muted">
                    <span>IMAGE TELEMETRY</span>
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="text-tesla-red hover:underline uppercase"
                    >
                      {showOriginal ? 'View Annotated (OpenCV)' : 'View Original Frame'}
                    </button>
                  </div>
                  
                  <div className="border border-industry-border rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                    {detail.image ? (
                      <img
                        src={api.resolveImageUrl(showOriginal ? detail.image.original_url : detail.image.annotated_url)}
                        alt="Audited Component"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-industry-muted">No Image uploaded.</span>
                    )}
                  </div>
                </div>

                {/* AI Explanation / Bounding boxes list */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-industry-text border-b border-industry-border pb-1.5 flex items-center space-x-1.5">
                    <Info className="h-4 w-4 text-tesla-red" />
                    <span>DIAGNOSTIC INSIGHTS ({detail.defects.length})</span>
                  </h4>
                  
                  <div className="space-y-4">
                    {detail.defects.map((def, idx) => (
                      <div key={def.id} className="p-4 bg-industry-bg border border-industry-border rounded-lg space-y-3">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="font-bold text-tesla-red uppercase">0{idx+1} : {def.defect_type}</span>
                          <span className="text-industry-muted">CONF: {Math.round(def.confidence * 100)}% | SEVERITY: <span className="uppercase font-bold text-white">{def.severity}</span></span>
                        </div>
                        <p className="text-xs text-industry-text font-mono leading-relaxed bg-industry-panel/30 p-2.5 rounded border border-industry-border/50">
                          {def.explanation}
                        </p>
                        <p className="text-xs font-bold text-status-rework font-mono bg-status-rework/5 p-2 rounded border border-status-rework/10">
                          {def.suggested_action}
                        </p>
                      </div>
                    ))}
                    
                    {detail.defects.length === 0 && (
                      <div className="p-4 bg-status-pass/5 border border-status-pass/20 rounded-lg text-center text-status-pass font-mono text-xs">
                        No defects found. Part passed QA clearance.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

export default Logs;
