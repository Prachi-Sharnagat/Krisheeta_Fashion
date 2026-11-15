import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { FileText, Download, Search, Calendar, Filter, RefreshCw } from 'lucide-react';
import { getToken } from '../utils/auth';
import { formatINR } from '../utils/formatters';
import { exportToCSV } from '../utils/csvExporter';

type ReportType = 'sales' | 'production' | 'inventory' | 'procurement' | 'quality' | 'finance' | 'attendance' | 'maintenance';

export const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (activeReport === 'sales') endpoint = 'orders';
      else if (activeReport === 'production') endpoint = 'production-orders';
      else if (activeReport === 'inventory') endpoint = 'materials';
      else if (activeReport === 'procurement') endpoint = 'purchase-orders';
      else if (activeReport === 'quality') endpoint = 'inspections';
      else if (activeReport === 'finance') endpoint = 'invoices';
      else if (activeReport === 'attendance') endpoint = 'hr/attendance';
      else if (activeReport === 'maintenance') endpoint = 'maintenance';

      const res = await fetch(`http://localhost:5000/api/${endpoint}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const filteredData = reportData.filter(item => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(q);
  });

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert('No data to export');
      return;
    }

    // Flatten object data for clean CSV columns
    const exportRows = filteredData.map(item => {
      if (activeReport === 'sales') {
        return {
          'Order Number': item.orderNumber,
          'Customer': item.customer?.name || '-',
          'Order Date': item.orderDate ? new Date(item.orderDate).toLocaleDateString() : '-',
          'Total Amount': item.totalAmount,
          'Priority': item.priority,
          'Status': item.status
        };
      } else if (activeReport === 'production') {
        return {
          'Order Number': item.orderNumber,
          'Product': item.product?.name || '-',
          'Target Qty': item.targetQuantity,
          'Completed Qty': item.completedQuantity,
          'Status': item.status,
          'Start Date': item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'
        };
      } else if (activeReport === 'inventory') {
        return {
          'Material Code': item.materialCode || '-',
          'Material Name': item.name,
          'Category': item.category || 'General',
          'Current Stock': item.currentStock,
          'Minimum Level': item.minimumStockLevel,
          'Unit': item.unit,
          'Status': item.status
        };
      } else if (activeReport === 'procurement') {
        return {
          'PO Number': item.orderNumber,
          'Supplier': item.supplier?.name || '-',
          'Order Date': item.orderDate ? new Date(item.orderDate).toLocaleDateString() : '-',
          'Status': item.status,
          'Priority': item.priority
        };
      } else if (activeReport === 'quality') {
        return {
          'Inspection Number': item.inspectionNumber,
          'Type': item.inspectionType,
          'Sample Size': item.sampleSize,
          'Passed': item.passedQuantity,
          'Rejected': item.rejectedQuantity,
          'Rework': item.reworkQuantity,
          'Defect Type': item.defectType || 'None',
          'Result': item.result
        };
      } else if (activeReport === 'finance') {
        return {
          'Invoice Number': item.invoiceNumber,
          'Customer': item.customer?.name || '-',
          'Invoice Date': item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString() : '-',
          'Due Date': item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-',
          'Total Amount': item.totalAmount,
          'Paid Amount': item.paidAmount,
          'Balance Amount': item.balanceAmount,
          'Status': item.status
        };
      }
      return item;
    });

    exportToCSV(`GarmentERP_${activeReport.toUpperCase()}_Report`, exportRows);
  };

  const reportsList: { id: ReportType; label: string }[] = [
    { id: 'sales', label: 'Sales Report' },
    { id: 'production', label: 'Production Report' },
    { id: 'inventory', label: 'Inventory Report' },
    { id: 'procurement', label: 'Procurement Report' },
    { id: 'quality', label: 'Quality Report' },
    { id: 'finance', label: 'Finance Report' },
    { id: 'attendance', label: 'Attendance Report' },
    { id: 'maintenance', label: 'Maintenance Report' }
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Enterprise Reports Center" 
          description="Generate, filter, inspect, and export tabular reports across all ERP departments." 
        />
        <button onClick={handleExportCSV} className="btn-primary flex items-center shadow-sm self-start sm:self-auto">
          <Download className="mr-2 h-4 w-4" /> Export CSV Report
        </button>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {reportsList.map(r => (
          <button
            key={r.id}
            onClick={() => {
              setActiveReport(r.id);
              setSearchTerm('');
            }}
            className={`px-4 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 ${
              activeReport === r.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> {r.label}
          </button>
        ))}
      </div>

      {/* Search & Filter Options */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center flex-1 bg-slate-50 p-2 rounded-lg border border-slate-200 w-full">
            <Search className="h-5 w-5 text-slate-400 ml-2" />
            <input 
              type="text" 
              placeholder={`Search in ${activeReport.toUpperCase()} report...`} 
              className="w-full bg-transparent px-3 py-1 outline-none text-sm text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button onClick={fetchReport} className="btn-secondary text-xs flex items-center">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
      </Card>

      {/* Report Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              {activeReport === 'sales' && (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                </tr>
              )}

              {activeReport === 'production' && (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Product</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Target Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Completed Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                </tr>
              )}

              {activeReport === 'inventory' && (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Material Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Current Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Minimum Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                </tr>
              )}

              {activeReport === 'procurement' && (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">PO #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Order Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                </tr>
              )}

              {activeReport === 'quality' && (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Inspection #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Sample Size</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Passed</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Rejected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Result</th>
                </tr>
              )}

              {activeReport === 'finance' && (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Invoice Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Paid</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                </tr>
              )}

              {['attendance', 'maintenance'].includes(activeReport) && (
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">ID / Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Status</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">Loading report data...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500 italic">No records found for this report.</td>
                </tr>
              ) : (
                filteredData.map((row: any, idx: number) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                    {activeReport === 'sales' && (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-primary-600">{row.orderNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.customer?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.orderDate ? new Date(row.orderDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatINR(row.totalAmount)}</td>
                        <td className="px-4 py-3 text-xs font-semibold">{row.priority}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status === 'COMPLETED' ? 'success' : 'info'}>{row.status}</StatusBadge></td>
                      </>
                    )}

                    {activeReport === 'production' && (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.orderNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.product?.name || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{row.targetQuantity} pcs</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{row.completedQuantity} pcs</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status === 'COMPLETED' ? 'success' : 'info'}>{row.status}</StatusBadge></td>
                      </>
                    )}

                    {activeReport === 'inventory' && (
                      <>
                        <td className="px-4 py-3 font-mono text-slate-700">{row.materialCode || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.category}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{row.currentStock} {row.unit}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.minimumStockLevel} {row.unit}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.currentStock <= row.minimumStockLevel ? 'warning' : 'success'}>{row.status}</StatusBadge></td>
                      </>
                    )}

                    {activeReport === 'procurement' && (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.orderNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.supplier?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{row.orderDate ? new Date(row.orderDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-xs font-semibold">{row.priority}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status === 'RECEIVED' ? 'success' : 'info'}>{row.status}</StatusBadge></td>
                      </>
                    )}

                    {activeReport === 'quality' && (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.inspectionNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.inspectionType}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.sampleSize}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{row.passedQuantity}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">{row.rejectedQuantity}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.result === 'PASS' ? 'success' : 'danger'}>{row.result}</StatusBadge></td>
                      </>
                    )}

                    {activeReport === 'finance' && (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-primary-600">{row.invoiceNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.customer?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatINR(row.totalAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-600">{formatINR(row.paidAmount)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{formatINR(row.balanceAmount)}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status === 'PAID' ? 'success' : 'warning'}>{row.status}</StatusBadge></td>
                      </>
                    )}

                    {['attendance', 'maintenance'].includes(activeReport) && (
                      <>
                        <td className="px-4 py-3 font-mono text-slate-900">{row.employeeCode || row.machineCode || row.id}</td>
                        <td className="px-4 py-3 text-slate-800">{row.description || row.remarks || row.employee?.name || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{row.date || row.scheduledDate ? new Date(row.date || row.scheduledDate).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3"><StatusBadge status={row.status === 'PRESENT' || row.status === 'COMPLETED' ? 'success' : 'info'}>{row.status}</StatusBadge></td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
