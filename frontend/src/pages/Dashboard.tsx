import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Line, 
  Bar, 
  Doughnut 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  Database,
  RefreshCw,
  Clock
} from 'lucide-react';
import api, { type DashboardAnalytics, type Inspection } from '../services/api';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export const Dashboard: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [recent, setRecent] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await api.getDashboardAnalytics(days);
      const recentLogs = await api.getInspections({ limit: '5' });
      setData(stats);
      setRecent(recentLogs);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve production statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [days]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="h-12 w-12 text-tesla-red animate-spin" />
        <p className="font-mono text-sm text-industry-muted">Retrieving factory telemetry data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center glass-panel border-tesla-red/30">
        <AlertTriangle className="h-12 w-12 text-status-reject mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">Telemetry Failure</h3>
        <p className="text-sm text-industry-muted mb-4">{error}</p>
        <button 
          onClick={fetchDashboardData} 
          className="px-4 py-2 bg-tesla-red text-white rounded font-mono text-sm hover:bg-tesla-darkred"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = data?.kpis;
  const trends = data?.production_trends || [];
  const defects = data?.defect_distribution || [];
  const lines = data?.line_performance || [];
  const shifts = data?.shift_performance || {};

  // 1. Yield Trend Chart Configuration
  const trendChartData = {
    labels: trends.map(t => t.date),
    datasets: [
      {
        label: 'Total Inspections',
        data: trends.map(t => t.total),
        borderColor: '#9ca3af',
        backgroundColor: 'rgba(156, 163, 175, 0.05)',
        tension: 0.2,
        fill: true,
      },
      {
        label: 'Passed Yield',
        data: trends.map(t => t.passed),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.2,
        fill: true,
      }
    ]
  };

  // 2. Defect Pareto Chart Configuration
  const defectChartData = {
    labels: defects.map(d => d.type.toUpperCase()),
    datasets: [
      {
        label: 'Occurrence Frequency',
        data: defects.map(d => d.count),
        backgroundColor: '#ef4444',
        borderWidth: 0,
        borderRadius: 4,
      }
    ]
  };

  // 3. Line Performance Chart Configuration
  const lineChartData = {
    labels: lines.map(l => l.line_name),
    datasets: [
      {
        label: 'Pass Rate (%)',
        data: lines.map(l => l.pass_rate),
        backgroundColor: 'rgba(16, 185, 129, 0.85)',
        borderRadius: 4,
      },
      {
        label: 'Defect Rate (%)',
        data: lines.map(l => l.fail_rate),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderRadius: 4,
      }
    ]
  };

  // 4. Shift Yield Doughnut Configuration
  const shiftChartData = {
    labels: ['Morning Shift', 'Afternoon Shift', 'Night Shift'],
    datasets: [
      {
        data: [
          shifts.morning?.total || 0,
          shifts.afternoon?.total || 0,
          shifts.night?.total || 0,
        ],
        backgroundColor: ['#22c55e', '#eab308', '#3b82f6'],
        borderWidth: 0,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#9ca3af', font: { family: 'JetBrains Mono', size: 10 } }
      }
    },
    scales: {
      x: { grid: { color: '#1f2430' }, ticks: { color: '#9ca3af', font: { family: 'JetBrains Mono', size: 9 } } },
      y: { grid: { color: '#1f2430' }, ticks: { color: '#9ca3af', font: { family: 'JetBrains Mono', size: 9 } } }
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Date Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-heading font-bold text-industry-text tracking-wide">
            PRODUCTION SYSTEM METRICS
          </h1>
          <p className="text-sm font-mono text-industry-muted">
            Aggregated diagnostics dashboard for quality audit telemetry.
          </p>
        </div>
        
        {/* Toggle Days Buttons */}
        <div className="flex items-center space-x-2 border border-industry-border p-1 bg-industry-panel rounded-lg">
          {[7, 15, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-md font-mono text-xs transition-colors ${
                days === d 
                  ? 'bg-tesla-red text-white font-bold' 
                  : 'text-industry-muted hover:text-industry-text'
              }`}
            >
              L{d} DAYS
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Inspections */}
          <div className="glass-panel p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-industry-muted uppercase tracking-wider">Total Audited</p>
                <h3 className="text-3xl font-bold font-heading mt-2">{kpis.total_inspections}</h3>
              </div>
              <div className="p-3 bg-industry-highlight rounded-lg text-industry-muted">
                <Database className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-industry-muted font-mono">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>Real-time inspection throughput</span>
            </div>
          </div>

          {/* Card 2: Pass Rate */}
          <div className="glass-panel p-6 border-l-4 border-l-status-pass relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-industry-muted uppercase tracking-wider">Yield Pass Rate</p>
                <h3 className="text-3xl font-bold font-heading text-status-pass mt-2">{kpis.pass_rate}%</h3>
              </div>
              <div className="p-3 bg-status-pass/10 text-status-pass rounded-lg pulse-glow">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-status-pass font-mono">
              <TrendingUp className="h-3.5 w-3.5 mr-1 animate-bounce" />
              <span>Yield quality standard target &gt; 90%</span>
            </div>
          </div>

          {/* Card 3: Defect Rate */}
          <div className="glass-panel p-6 border-l-4 border-l-status-reject relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-industry-muted uppercase tracking-wider">Defect Alarm Rate</p>
                <h3 className="text-3xl font-bold font-heading text-status-reject mt-2">{kpis.fail_rate}%</h3>
              </div>
              <div className="p-3 bg-status-reject/10 text-status-reject rounded-lg">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-industry-muted font-mono">
              <span>Rework: {kpis.rework_rate}% | Reject: {kpis.reject_rate}%</span>
            </div>
          </div>

          {/* Card 4: Average Confidence */}
          <div className="glass-panel p-6 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-industry-muted uppercase tracking-wider">AI Model Confidence</p>
                <h3 className="text-3xl font-bold font-heading text-blue-400 mt-2">{Math.round(kpis.avg_confidence * 100)}%</h3>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                <Shield className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-industry-muted font-mono">
              <span>Model threshold bounds verified</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yield & Volume Trend */}
        <div className="glass-panel p-6 lg:col-span-2 flex flex-col h-96">
          <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider mb-4 border-b border-industry-border pb-2">
            DAILY THROUGHPUT & YIELD VOLUMES
          </h3>
          <div className="flex-grow relative">
            <Line data={trendChartData} options={chartOptions} />
          </div>
        </div>

        {/* Shift Doughnut */}
        <div className="glass-panel p-6 flex flex-col h-96">
          <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider mb-4 border-b border-industry-border pb-2">
            SHIFT PRODUCTION DISTRIBUTION
          </h3>
          <div className="flex-grow relative">
            <Doughnut 
              data={shiftChartData} 
              options={{
                ...chartOptions,
                scales: undefined // Doughnut charts do not use scale axes
              }} 
            />
          </div>
        </div>

        {/* Pareto Defect Distribution */}
        <div className="glass-panel p-6 flex flex-col h-96">
          <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider mb-4 border-b border-industry-border pb-2">
            DEFECT FREQUENCY BREAKDOWN
          </h3>
          <div className="flex-grow relative">
            <Bar data={defectChartData} options={chartOptions} />
          </div>
        </div>

        {/* Production Line Yields */}
        <div className="glass-panel p-6 lg:col-span-2 flex flex-col h-96">
          <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider mb-4 border-b border-industry-border pb-2">
            PRODUCTION LINE RELIABILITY RATES
          </h3>
          <div className="flex-grow relative">
            <Bar data={lineChartData} options={{
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                x: { ...chartOptions.scales.x, stacked: true },
                y: { ...chartOptions.scales.y, max: 100 }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Recent Inspections Table */}
      <div className="glass-panel p-6">
        <div className="flex justify-between items-center mb-4 border-b border-industry-border pb-2">
          <h3 className="text-sm font-mono text-industry-text uppercase tracking-wider">
            RECENT INSPECTION TELEMETRY FLOW
          </h3>
          <Link to="/logs" className="text-xs font-mono text-tesla-red hover:underline uppercase">
            View Console History &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-industry-border text-industry-muted">
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">INSPECTION ID</th>
                <th className="py-3 px-4">PRODUCT SKU</th>
                <th className="py-3 px-4">SHIFT</th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id} className="border-b border-industry-border/50 hover:bg-industry-highlight/30 transition-colors">
                  <td className="py-3 px-4">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4 text-industry-muted">{item.id.slice(0, 8)}...</td>
                  <td className="py-3 px-4 font-bold">{item.product_id}</td>
                  <td className="py-3 px-4 uppercase">{item.shift}</td>
                  <td className="py-3 px-4">{Math.round(item.avg_confidence * 100)}%</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
                      item.status === 'pass' 
                        ? 'bg-status-pass/10 text-status-pass border border-status-pass/30' 
                        : item.status === 'rework'
                        ? 'bg-status-rework/10 text-status-rework border border-status-rework/30'
                        : 'bg-status-reject/10 text-status-reject border border-status-reject/30'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-industry-muted">No telemetry logs found. Run quality scanner.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
