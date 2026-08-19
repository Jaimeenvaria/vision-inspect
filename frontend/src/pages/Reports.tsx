import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  ShieldAlert, 
  FileSpreadsheet, 
  Printer,
  RefreshCw,
  Plus
} from 'lucide-react';
import api, { type Report } from '../services/api';

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'daily' | 'monthly' | 'inspection'>('daily');
  const [format, setFormat] = useState<'pdf' | 'csv'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Role check
  const role = localStorage.getItem('fv_role') || 'inspector';
  const canGenerate = ['supervisor', 'admin'].includes(role);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // Default date range: last 7 days
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    setStartDate(lastWeek.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canGenerate) {
      setError('Operator clearance insufficient to initialize document compile.');
      return;
    }
    if (!name || !startDate || !endDate) {
      setError('Please provide a report title and date range.');
      return;
    }

    setSubmitting(true);
    setError(null);

    // Convert local date string to ISO datetime format for backend
    const startIso = new Date(startDate + 'T00:00:00').toISOString();
    const endIso = new Date(endDate + 'T23:59:59').toISOString();

    try {
      await api.generateReport(name, type, format, startIso, endIso);
      setName('');
      fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to compile report document.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFormatIcon = (fmt: string) => {
    return fmt.toLowerCase() === 'csv' 
      ? <FileSpreadsheet className="h-5 w-5 text-green-400" />
      : <Printer className="h-5 w-5 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-industry-text tracking-wide uppercase">
          REPORT COMPILATION CENTER
        </h1>
        <p className="text-sm font-mono text-industry-muted">
          Export production logs and defect analytics summaries to CSV or printable documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Report Generator Form (restricted to Supervisor/Admin) (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {canGenerate ? (
            <form onSubmit={handleGenerate} className="glass-panel p-6 space-y-5 border-t-2 border-t-tesla-red">
              <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider border-b border-industry-border pb-2 flex items-center space-x-1.5">
                <Plus className="h-4.5 w-4.5 text-tesla-red" />
                <span>COMPILE NEW REPORT</span>
              </h3>

              {/* Title */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                  Report Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Daily Yield Audit - Assembly Line A"
                  className="block w-full px-3 py-2.5 bg-industry-bg border border-industry-border rounded-lg text-industry-text placeholder-industry-muted/40 focus:outline-none focus:border-tesla-red text-xs"
                  required
                />
              </div>

              {/* Grid: Type & Format */}
              <div className="grid grid-cols-2 gap-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                    Report Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs"
                  >
                    <option value="daily">Daily Summary</option>
                    <option value="monthly">Monthly Audit</option>
                    <option value="inspection">Inspection Log</option>
                  </select>
                </div>

                {/* Format */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                    Export Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs uppercase"
                  >
                    <option value="csv">CSV Spreadsheet</option>
                    <option value="pdf">Printable HTML (PDF)</option>
                  </select>
                </div>
              </div>

              {/* Grid: Start & End Dates */}
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-industry-muted mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full px-3 py-2 bg-industry-bg border border-industry-border rounded-lg text-industry-text focus:outline-none focus:border-tesla-red font-mono text-xs"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-tesla-red hover:bg-tesla-darkred text-white text-xs font-mono uppercase font-bold tracking-wider rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center space-x-1.5 shadow-glow-red"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Compiling Database...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Compile Report</span>
                  </>
                )}
              </button>

            </form>
          ) : (
            // Inspector Read Only warning card
            <div className="glass-panel p-6 space-y-4 border-l-2 border-l-status-rework">
              <div className="flex items-center space-x-2 text-status-rework">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider">READ-ONLY CLEARANCE</h3>
              </div>
              <p className="text-xs font-mono leading-relaxed text-industry-muted">
                Your operator clearance level (<span className="text-white uppercase font-bold">{role}</span>) is restricted to read-only access for reports. 
                Document compiling triggers are limited to Quality Supervisors and System Administrators. 
                You may query and download already compiled report documents from the list log.
              </p>
            </div>
          )}
        </div>

        {/* Right: Compiled Reports List (7 cols) */}
        <div className="lg:col-span-7">
          <div className="glass-panel p-6">
            <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider border-b border-industry-border pb-2 flex items-center space-x-1.5 mb-4">
              <Calendar className="h-4.5 w-4.5 text-tesla-red" />
              <span>COMPILED EXPORTS ARCHIVE</span>
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2">
                <RefreshCw className="h-8 w-8 text-tesla-red animate-spin" />
                <span className="font-mono text-xs text-industry-muted">Loading archive log index...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-industry-border text-industry-muted">
                      <th className="py-3 px-4">CREATED</th>
                      <th className="py-3 px-4">REPORT NAME</th>
                      <th className="py-3 px-4">FORMAT</th>
                      <th className="py-3 px-4">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((rep) => (
                      <tr key={rep.id} className="border-b border-industry-border/50 hover:bg-industry-highlight/30 transition-colors">
                        <td className="py-3 px-4">{new Date(rep.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-bold text-industry-text">
                          <p className="truncate max-w-[200px]" title={rep.name}>{rep.name}</p>
                          <span className="inline-block text-[9px] uppercase font-mono text-industry-muted font-normal mt-0.5">
                            Type: {rep.report_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            {getFormatIcon(rep.file_format)}
                            <span className="uppercase text-[9px]">{rep.file_format}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <a
                            href={api.resolveImageUrl(rep.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1 border border-industry-border bg-industry-bg text-industry-muted hover:text-tesla-red hover:border-tesla-red/30 rounded transition-colors"
                            title="Download Report"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-industry-muted">
                          No compiled reports archived in system.
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

      {/* Error Message Callout */}
      {error && (
        <div className="p-4 rounded-lg bg-status-reject/10 border border-status-reject/30 text-status-reject flex items-start space-x-2 text-sm max-w-7xl">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
};

export default Reports;
