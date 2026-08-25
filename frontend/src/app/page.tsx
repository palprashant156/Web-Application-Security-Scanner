'use client';

import { useState, useEffect } from 'react';
import { Scan, Finding } from '@webguard/shared';

export default function Home() {
  const [targetUrl, setTargetUrl] = useState('');
  
  // Current active view
  const [scanId, setScanId] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filters and Search
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // History
  const [history, setHistory] = useState<Scan[]>([]);

  // Fetch scan history on mount
  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/scans');
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Poll for active scan status
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (scanId && (!scan || scan.status === 'RUNNING' || scan.status === 'PENDING')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:3001/api/scans/${scanId}`);
          const data = await res.json();
          if (res.ok) {
            setScan(data);
            if (data.status === 'COMPLETED') {
              const findingsRes = await fetch(`http://localhost:3001/api/scans/${scanId}/findings`);
              if (findingsRes.ok) {
                setFindings(await findingsRes.json());
                fetchHistory(); 
              }
            }
          } else {
            setError(data.error || 'Failed to fetch scan');
          }
        } catch (e: any) {
          setError(e.message);
        }
      }, 1500);
    }

    return () => clearInterval(interval);
  }, [scanId, scan]);

  const startScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setScanId(null);
    setScan(null);
    setFindings([]);
    setSearchTerm('');
    setSeverityFilter('ALL');

    try {
      const res = await fetch('http://localhost:3001/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl })
      });
      const data = await res.json();

      if (res.ok) {
        setScanId(data.id);
        fetchHistory(); 
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const loadOldScan = async (id: string) => {
    setError(null);
    setScanId(id);
    setSearchTerm('');
    setSeverityFilter('ALL');
    
    const scanRes = await fetch(`http://localhost:3001/api/scans/${id}`);
    if (scanRes.ok) {
      const scanData = await scanRes.json();
      setScan(scanData);
      
      if (scanData.status === 'COMPLETED') {
        const findingsRes = await fetch(`http://localhost:3001/api/scans/${id}/findings`);
        if (findingsRes.ok) {
          setFindings(await findingsRes.json());
        }
      } else {
        setFindings([]);
      }
    } else {
      setError('Failed to load past scan');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-purple-600 text-white';
      case 'HIGH': return 'bg-red-600 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-blue-500 text-white';
      case 'INFO': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Filtered findings
  const filteredFindings = findings.filter(f => {
    const matchesSearch = f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || f.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 flex font-sans print:bg-white print:text-black">
      {/* Sidebar History - Hidden when printing */}
      <aside className="w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col hidden md:flex print:hidden">
        <h2 className="text-xl font-bold mb-6 text-slate-100">Recent Scans</h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <p className="text-slate-500 text-sm">No scans yet.</p>
          ) : (
            history.map(h => (
              <button 
                key={h.id}
                onClick={() => loadOldScan(h.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors border ${
                  scanId === h.id ? 'bg-slate-800 border-cyan-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium truncate block max-w-[150px]">{h.target}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    h.status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-400' :
                    h.status === 'FAILED' ? 'bg-red-900 text-red-400' : 'bg-blue-900 text-blue-400'
                  }`}>
                    {h.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {h.startedAt ? new Date(h.startedAt).toLocaleString() : 'Unknown Date'}
                </div>
                {h.score !== undefined && (
                  <div className="text-xs font-bold text-cyan-400 mt-1">Score: {h.score}/100</div>
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-cyan-400 print:text-black">WebGuard</h1>
              <p className="text-slate-400 print:hidden">Web Application Security Assessment Platform</p>
            </div>
            
            {scan?.status === 'COMPLETED' && (
              <button 
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded font-semibold print:hidden"
              >
                Export Report PDF
              </button>
            )}
          </div>
          
          {/* Scan Input Card - Hidden when printing */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl mb-8 print:hidden">
            <form onSubmit={startScan} className="flex gap-4">
              <input 
                type="url" 
                required
                placeholder="https://example.com"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <button 
                type="submit"
                disabled={scan?.status === 'RUNNING'}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {scan?.status === 'RUNNING' ? 'Scanning...' : 'Start Scan'}
              </button>
            </form>
            {error && <p className="text-red-400 mt-4">{error}</p>}
          </div>

          {/* Scan Results Area */}
          {scan && (
            <div className="space-y-6">
              
              {/* Executive Summary for Print */}
              <div className="hidden print:block mb-8">
                 <h2 className="text-3xl font-bold mb-4 border-b pb-2">Executive Summary</h2>
                 <p>This report documents the security assessment conducted on <strong>{scan.target}</strong> by the WebGuard Automated Scanner. The scanner performed a controlled crawl, followed by passive misconfiguration checks and active vulnerability detection (XSS, SQLi, CSRF).</p>
                 <p className="mt-2"><strong>Scan Date:</strong> {new Date(scan.startedAt!).toLocaleString()}</p>
                 <p className="mt-2"><strong>Methodology:</strong> Automated DAST (Dynamic Application Security Testing). Credentials were not supplied. Exploitation was strictly prohibited; findings are limited to detection indicators.</p>
                 <p className="mt-4 text-sm text-gray-600"><em>Disclaimer: Automated tools cannot detect all vulnerabilities. This report does not guarantee the application is secure.</em></p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl print:border-gray-300 print:bg-white print:text-black">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Assessment Report</h2>
                    <p className="text-slate-400 print:text-gray-600">{scan.target}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold tracking-wider mb-2 print:border print:bg-white print:text-black ${
                      scan.status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-400' :
                      scan.status === 'FAILED' ? 'bg-red-900 text-red-400' :
                      'bg-blue-900 text-blue-400'
                    }`}>
                      {scan.status}
                    </div>
                    {scan.score !== undefined && (
                      <div className="text-3xl font-black text-cyan-400 print:text-black">
                        {scan.score}/100
                      </div>
                    )}
                  </div>
                </div>

                {scan.severitySummary && (
                  <div className="flex gap-4 flex-wrap border-t border-slate-800 pt-6 print:border-gray-300">
                    {Object.entries(scan.severitySummary).map(([sev, count]) => (
                      <div key={sev} className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 print:bg-white print:border-gray-300">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(sev).split(' ')[0]}`}></div>
                        <span className="font-semibold text-slate-300 print:text-gray-800">{sev}</span>
                        <span className="text-white font-bold print:text-black">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {scan.crawlerStats && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mt-6 print:bg-white print:border-gray-300 print:text-black">
                  <h3 className="text-xl font-bold mb-4">Attack Surface Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950 p-4 rounded border border-slate-800 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-cyan-400 print:text-black">{scan.crawlerStats.pages?.length || 0}</div>
                      <div className="text-sm text-slate-400 mt-1 print:text-gray-600">Pages</div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded border border-slate-800 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-cyan-400 print:text-black">{scan.crawlerStats.endpoints?.length || 0}</div>
                      <div className="text-sm text-slate-400 mt-1 print:text-gray-600">Endpoints</div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded border border-slate-800 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-cyan-400 print:text-black">{scan.crawlerStats.forms?.length || 0}</div>
                      <div className="text-sm text-slate-400 mt-1 print:text-gray-600">Forms</div>
                    </div>
                    <div className="bg-slate-950 p-4 rounded border border-slate-800 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-cyan-400 print:text-black">{scan.crawlerStats.parameters?.length || 0}</div>
                      <div className="text-sm text-slate-400 mt-1 print:text-gray-600">Parameters</div>
                    </div>
                  </div>
                </div>
              )}

              {scan.error && (
                <div className="bg-red-950 border border-red-900 text-red-300 p-4 rounded-xl">
                  <strong>Error: </strong> {scan.error}
                </div>
              )}

              {findings.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4 mt-8 print:hidden">
                    <h3 className="text-xl font-bold">Detailed Findings</h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Search findings..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm focus:outline-none"
                      />
                      <select 
                        value={severityFilter} 
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm focus:outline-none"
                      >
                        <option value="ALL">All Severities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="INFO">Info</option>
                      </select>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-4 hidden print:block mt-8">Detailed Findings</h3>

                  <div className="grid gap-6">
                    {filteredFindings.map((finding: Finding) => (
                      <div key={finding.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden print:border-gray-300 print:bg-white print:text-black print:break-inside-avoid">
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${getSeverityColor(finding.severity)} opacity-75 print:hidden`}></div>
                        
                        <div className="flex justify-between items-start mb-2 pl-4 print:pl-0">
                          <h4 className="text-lg font-bold text-slate-100 print:text-black">{finding.title}</h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 print:border print:bg-white print:text-black`}>
                              {finding.status}
                            </span>
                            <span className={`px-3 py-1 rounded text-xs font-bold ${getSeverityColor(finding.severity)} print:border print:bg-white print:text-black`}>
                              {finding.severity}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-4 pl-4 print:pl-0 text-xs font-medium">
                          <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded print:bg-gray-100 print:text-black">Module: {finding.scannerModule}</span>
                          <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded print:bg-gray-100 print:text-black">Category: {finding.category}</span>
                          {finding.affectedUrl && (
                            <span className="bg-slate-800 text-cyan-300 px-2 py-1 rounded print:bg-gray-100 print:text-blue-700">URL: {finding.affectedUrl}</span>
                          )}
                        </div>

                        <p className="text-slate-300 mb-4 pl-4 print:pl-0 print:text-gray-800">{finding.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 pl-4 print:pl-0">
                          <div className="bg-slate-950 p-4 rounded border border-slate-800 print:bg-gray-50 print:border-gray-300">
                            <strong className="text-slate-400 block mb-1 print:text-gray-700">Impact</strong>
                            {finding.impact}
                          </div>
                          <div className="bg-slate-950 p-4 rounded border border-slate-800 print:bg-gray-50 print:border-gray-300">
                            <strong className="text-slate-400 block mb-1 print:text-gray-700">Recommendation</strong>
                            {finding.recommendation}
                          </div>
                          {finding.evidence && (
                             <div className="bg-slate-950 p-4 rounded border border-slate-800 md:col-span-2 print:bg-gray-50 print:border-gray-300">
                               <strong className="text-slate-400 block mb-1 print:text-gray-700">Evidence</strong>
                               <pre className="text-xs text-green-400 overflow-x-auto print:text-gray-900 print:whitespace-pre-wrap">{finding.evidence}</pre>
                             </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {filteredFindings.length === 0 && findings.length > 0 && (
                       <p className="text-slate-500 text-center py-8">No findings match your filters.</p>
                    )}
                  </div>
                </div>
              )}

              {scan.status === 'COMPLETED' && findings.length === 0 && (
                <div className="bg-emerald-950 border border-emerald-900 text-emerald-400 p-6 rounded-xl text-center print:border print:border-gray-300 print:bg-white print:text-black">
                  <h3 className="text-xl font-bold mb-2">No vulnerabilities detected!</h3>
                  <p>The automated scanners did not detect any misconfigurations on the discovered attack surface.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
