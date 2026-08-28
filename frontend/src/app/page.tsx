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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scans`);
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
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scans/${scanId}`);
          const data = await res.json();
          if (res.ok) {
            setScan(data);
            if (data.status === 'COMPLETED') {
              const findingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scans/${scanId}/findings`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scans`, {
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

  const stopScan = async () => {
    if (!scanId) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scans/${scanId}/cancel`, {
        method: 'POST'
      });
      // The polling will pick up the 'CANCELLED' status
    } catch (e) {
      console.error('Failed to stop scan', e);
    }
  };

  const loadOldScan = async (id: string) => {
    setError(null);
    setScanId(id);
    setSearchTerm('');
    setSeverityFilter('ALL');
    
    const scanRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scans/${id}`);
    if (scanRes.ok) {
      const scanData = await scanRes.json();
      setScan(scanData);
      
      if (scanData.status === 'COMPLETED' || scanData.status === 'CANCELLED') {
        const findingsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scans/${id}/findings`);
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
      case 'CRITICAL': return 'bg-red-950 text-red-500 border border-red-900';
      case 'HIGH': return 'bg-orange-950 text-orange-500 border border-orange-900';
      case 'MEDIUM': return 'bg-yellow-950 text-yellow-500 border border-yellow-900';
      case 'LOW': return 'bg-blue-950 text-blue-500 border border-blue-900';
      case 'INFO': return 'bg-green-950 text-green-500 border border-green-900';
      default: return 'bg-green-950 text-green-500 border border-green-900';
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
    <main className="min-h-screen bg-black font-mono text-green-500 flex font-sans print:bg-white print:text-black">
      {/* Sidebar History - Hidden when printing */}
      <aside className="w-80 bg-[#0a0a0a] border-r border-green-900/50 p-6 flex flex-col hidden md:flex print:hidden">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wider text-green-400">Recent Scans</h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <p className="text-green-700 text-sm">No scans yet.</p>
          ) : (
            history.map(h => (
              <button 
                key={h.id}
                onClick={() => loadOldScan(h.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors border ${
                  scanId === h.id ? 'bg-green-950/30 border-green-500 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'bg-black font-mono border-green-900/50 hover:border-green-700/50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium truncate block max-w-[150px]">{h.target}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    h.status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-400' :
                    h.status === 'FAILED' ? 'bg-red-900 text-red-400' :
                    h.status === 'CANCELLED' ? 'bg-gray-700 text-gray-300' : 'bg-blue-900 text-blue-400'
                  }`}>
                    {h.status}
                  </span>
                </div>
                <div className="text-xs text-green-700">
                  {h.startedAt ? new Date(h.startedAt).toLocaleString() : 'Unknown Date'}
                </div>
                {h.score !== undefined && (
                  <div className="text-xs font-bold text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] mt-1">Score: {h.score}/100</div>
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
              <h1 className="text-4xl font-bold mb-2 uppercase tracking-widest text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] print:text-black">WebGuard</h1>
              <p className="text-green-600 print:hidden">Web Application Security Assessment Platform</p>
            </div>
            
            {(scan?.status === 'COMPLETED' || scan?.status === 'CANCELLED') && (
              <button 
                onClick={() => window.print()}
                className="bg-green-950/30 hover:bg-green-900/50 text-white px-4 py-2 rounded font-semibold print:hidden"
              >
                Export Report PDF
              </button>
            )}
          </div>
          
          {/* Scan Input Card - Hidden when printing */}
          <div className="bg-[#0a0a0a] border border-green-900/50 p-6 rounded-xl shadow-2xl mb-8 print:hidden">
            <form onSubmit={startScan} className="flex gap-4">
              <input 
                type="url" 
                required
                placeholder="https://example.com"
                className="flex-1 bg-black font-mono border border-green-800/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 shadow-[0_0_10px_rgba(74,222,128,0.2)]"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              {scan?.status === 'RUNNING' ? (
                <button 
                  type="button"
                  onClick={stopScan}
                  className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Stop Scan
                </button>
              ) : (
                <button 
                  type="submit"
                  className="bg-green-600 hover:bg-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.4)] px-8 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Scan
                </button>
              )}
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

              <div className="bg-[#0a0a0a] border border-green-900/50 p-6 rounded-xl print:border-gray-300 print:bg-white print:text-black">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Assessment Report</h2>
                    <p className="text-green-600 print:text-gray-600">{scan.target}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold tracking-wider mb-2 print:border print:bg-white print:text-black ${
                      scan.status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-400' :
                      scan.status === 'FAILED' ? 'bg-red-900 text-red-400' :
                      scan.status === 'CANCELLED' ? 'bg-gray-700 text-gray-300' :
                      'bg-blue-900 text-blue-400'
                    }`}>
                      {scan.status}
                    </div>
                    {scan.score !== undefined && (
                      <div className="text-3xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] print:text-black">
                        {scan.score}/100
                      </div>
                    )}
                  </div>
                </div>

                {scan.severitySummary && (
                  <div className="flex gap-4 flex-wrap border-t border-green-900/50 pt-6 print:border-gray-300">
                    {Object.entries(scan.severitySummary).map(([sev, count]) => (
                      <div key={sev} className="flex items-center gap-2 bg-black font-mono px-4 py-2 rounded-lg border border-green-900/50 print:bg-white print:border-gray-300">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(sev).split(' ')[0]}`}></div>
                        <span className="font-semibold text-green-500 print:text-gray-800">{sev}</span>
                        <span className="text-white font-bold print:text-black">{count as number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {scan.crawlerStats && (
                <div className="bg-[#0a0a0a] border border-green-900/50 p-6 rounded-xl mt-6 print:bg-white print:border-gray-300 print:text-black">
                  <h3 className="text-xl font-bold mb-4">Attack Surface Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black font-mono p-4 rounded border border-green-900/50 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] print:text-black">{scan.crawlerStats.pages?.length || 0}</div>
                      <div className="text-sm text-green-600 mt-1 print:text-gray-600">Pages</div>
                    </div>
                    <div className="bg-black font-mono p-4 rounded border border-green-900/50 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] print:text-black">{scan.crawlerStats.endpoints?.length || 0}</div>
                      <div className="text-sm text-green-600 mt-1 print:text-gray-600">Endpoints</div>
                    </div>
                    <div className="bg-black font-mono p-4 rounded border border-green-900/50 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] print:text-black">{scan.crawlerStats.forms?.length || 0}</div>
                      <div className="text-sm text-green-600 mt-1 print:text-gray-600">Forms</div>
                    </div>
                    <div className="bg-black font-mono p-4 rounded border border-green-900/50 text-center print:bg-white print:border-gray-300">
                      <div className="text-3xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] print:text-black">{scan.crawlerStats.parameters?.length || 0}</div>
                      <div className="text-sm text-green-600 mt-1 print:text-gray-600">Parameters</div>
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
                        className="bg-[#0a0a0a] border border-green-800/50 rounded px-3 py-1 text-sm focus:outline-none"
                      />
                      <select 
                        value={severityFilter} 
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="bg-[#0a0a0a] border border-green-800/50 rounded px-3 py-1 text-sm focus:outline-none"
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
                      <div key={finding.id} className="bg-[#0a0a0a] border border-green-900/50 p-6 rounded-xl shadow-lg relative overflow-hidden print:border-gray-300 print:bg-white print:text-black print:break-inside-avoid">
                        <div className={`absolute left-0 top-0 bottom-0 w-2 ${getSeverityColor(finding.severity)} opacity-75 print:hidden`}></div>
                        
                        <div className="flex justify-between items-start mb-2 pl-4 print:pl-0">
                          <h4 className="text-lg font-bold text-green-400 print:text-black">{finding.title}</h4>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold bg-green-950/30 text-green-500 border border-green-800/50 print:border print:bg-white print:text-black`}>
                              {finding.status}
                            </span>
                            <span className={`px-3 py-1 rounded text-xs font-bold ${getSeverityColor(finding.severity)} print:border print:bg-white print:text-black`}>
                              {finding.severity}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-4 pl-4 print:pl-0 text-xs font-medium">
                          <span className="bg-green-950/30 text-green-500 px-2 py-1 rounded print:bg-gray-100 print:text-black">Module: {finding.scannerModule}</span>
                          <span className="bg-green-950/30 text-green-500 px-2 py-1 rounded print:bg-gray-100 print:text-black">Category: {finding.category}</span>
                          {finding.affectedUrl && (
                            <span className="bg-green-950/30 text-green-300 px-2 py-1 rounded print:bg-gray-100 print:text-blue-700">URL: {finding.affectedUrl}</span>
                          )}
                        </div>

                        <p className="text-green-500 mb-4 pl-4 print:pl-0 print:text-gray-800">{finding.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4 pl-4 print:pl-0">
                          <div className="bg-black font-mono p-4 rounded border border-green-900/50 print:bg-gray-50 print:border-gray-300">
                            <strong className="text-green-600 block mb-1 print:text-gray-700">Impact</strong>
                            {finding.impact}
                          </div>
                          <div className="bg-black font-mono p-4 rounded border border-green-900/50 print:bg-gray-50 print:border-gray-300">
                            <strong className="text-green-600 block mb-1 print:text-gray-700">Recommendation</strong>
                            {finding.recommendation}
                          </div>
                          {finding.evidence && (
                             <div className="bg-black font-mono p-4 rounded border border-green-900/50 md:col-span-2 print:bg-gray-50 print:border-gray-300">
                               <strong className="text-green-600 block mb-1 print:text-gray-700">Evidence</strong>
                               <pre className="text-xs text-green-400 overflow-x-auto print:text-gray-900 print:whitespace-pre-wrap">{finding.evidence}</pre>
                             </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {filteredFindings.length === 0 && findings.length > 0 && (
                       <p className="text-green-700 text-center py-8">No findings match your filters.</p>
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
