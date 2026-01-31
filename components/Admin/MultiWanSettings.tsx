import React, { useState, useEffect } from 'react';

interface WanInterface {
  interface: string;
  type: 'dhcp' | 'static' | 'pppoe';
  ip?: string;
  netmask?: string;
  gateway?: string;
  username?: string;
  password?: string;
  weight: number;
}

interface MultiWanConfig {
  enabled: boolean;
  mode: 'pcc' | 'ecmp';
  pcc_method: 'both_addresses' | 'both_addresses_ports';
  interfaces: WanInterface[];
}

interface SystemInterface {
    name: string;
    type: string;
    status: string;
    ip: string | null;
    mac: string;
}

const MultiWanSettings: React.FC = () => {
  const [config, setConfig] = useState<MultiWanConfig>({
    enabled: false,
    mode: 'pcc',
    pcc_method: 'both_addresses',
    interfaces: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // System State
  const [availableInterfaces, setAvailableInterfaces] = useState<SystemInterface[]>([]);
  const [currentWanName, setCurrentWanName] = useState<string>('');
  
  // UI State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInterface, setNewInterface] = useState<WanInterface>({ 
      interface: '', 
      type: 'dhcp',
      weight: 1 
  });
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchConfig();
    fetchInterfaces();
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/multiwan/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (e) {
      addLog('Failed to fetch Multi-WAN config: ' + e);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterfaces = async () => {
    try {
      const res = await fetch('/api/system/interfaces');
      const data = await res.json();
      // data = { interfaces: [...], wan: "eth0" }
      if (data.interfaces) {
        setAvailableInterfaces(data.interfaces);
      }
      if (data.wan) {
          setCurrentWanName(data.wan);
      }
    } catch (e) {
      addLog('Failed to fetch system interfaces: ' + e);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/multiwan/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        addLog('Configuration saved successfully.');
      } else {
        addLog('Error saving configuration: ' + data.error);
      }
    } catch (e) {
      addLog('Failed to save config: ' + e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddInterface = () => {
    if (!newInterface.interface) {
      alert('Please select an interface.');
      return;
    }
    
    // Validation
    if (newInterface.type === 'static') {
        if (!newInterface.ip) {
            alert('IP Address is required for Static connection.');
            return;
        }
        if (!newInterface.netmask) {
            alert('Subnet Mask is required for Static connection.');
            return;
        }
        if (!newInterface.gateway) {
            alert('Gateway is required for Static connection.');
            return;
        }
    }
    if (newInterface.type === 'pppoe' && (!newInterface.username || !newInterface.password)) {
        alert('Username and Password are required for PPPoE.');
        return;
    }

    setConfig(prev => ({
      ...prev,
      interfaces: [...prev.interfaces, newInterface]
    }));
    
    // Reset and close
    setNewInterface({ interface: '', type: 'dhcp', weight: 1 });
    setShowAddForm(false);
    addLog(`Added new interface: ${newInterface.interface} (${newInterface.type})`);
  };

  const removeInterface = (idx: number) => {
    const removed = config.interfaces[idx];
    setConfig(prev => ({
      ...prev,
      interfaces: prev.interfaces.filter((_, i) => i !== idx)
    }));
    addLog(`Removed interface: ${removed.interface}`);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Multi-WAN Configuration...</div>;

  const currentWanDetails = availableInterfaces.find(i => i.name === currentWanName);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Multi-WAN Management</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Load Balancing & Failover Control</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={saveConfig}
                disabled={saving}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${saving ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'}`}
            >
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            
            {/* Card 1: Current WAN */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </div>
                <div className="p-6">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Primary WAN Interface
                    </h3>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                {currentWanName || 'Unknown'}
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {currentWanDetails ? `${currentWanDetails.type} • ${currentWanDetails.ip || 'No IP'} • ${currentWanDetails.status}` : 'Offline'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Config List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Secondary WANs</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={config.enabled} onChange={e => setConfig({...config, enabled: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="p-6">
                    {/* List */}
                    <div className="space-y-3 mb-6">
                        {config.interfaces.map((iface, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 group hover:border-blue-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-black text-slate-700 text-sm">{iface.interface}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{iface.type}</span>
                                            {iface.gateway && <span>GW: {iface.gateway}</span>}
                                            {iface.username && <span>User: {iface.username}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => removeInterface(idx)}
                                    className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        ))}
                        {config.interfaces.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                No secondary WANs configured
                            </div>
                        )}
                    </div>

                    {/* Add Button */}
                    {!showAddForm ? (
                        <button 
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-4 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="text-lg">+</span> Add Secondary WAN
                        </button>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-xl border border-blue-200 animate-in zoom-in-95 duration-200">
                            <h4 className="font-black text-slate-700 uppercase tracking-widest text-xs mb-4">Add New WAN Interface</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* Interface Dropdown */}
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hardware Interface</label>
                                    <select 
                                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={newInterface.interface}
                                        onChange={e => setNewInterface({...newInterface, interface: e.target.value})}
                                    >
                                        <option value="">Select Interface...</option>
                                        {availableInterfaces.map(iface => (
                                            <option key={iface.name} value={iface.name}>
                                                {iface.name} ({iface.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Type Dropdown */}
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Connection Type</label>
                                    <select 
                                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={newInterface.type}
                                        onChange={e => setNewInterface({...newInterface, type: e.target.value as any})}
                                    >
                                        <option value="dhcp">DHCP (Automatic)</option>
                                        <option value="static">Static IP</option>
                                        <option value="pppoe">PPPoE Client</option>
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Fields */}
                            <div className="space-y-4 mb-6">
                                {newInterface.type === 'static' && (
                                    <div className="animate-in fade-in slide-in-from-top-1 space-y-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">IP Address</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 192.168.1.100" 
                                                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                                value={newInterface.ip || ''}
                                                onChange={e => setNewInterface({...newInterface, ip: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Subnet Mask</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 255.255.255.0" 
                                                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                                value={newInterface.netmask || ''}
                                                onChange={e => setNewInterface({...newInterface, netmask: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gateway IP</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g. 192.168.1.1" 
                                                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                                value={newInterface.gateway || ''}
                                                onChange={e => setNewInterface({...newInterface, gateway: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                                {newInterface.type === 'pppoe' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PPPoE Username</label>
                                            <input 
                                                type="text" 
                                                placeholder="ISP Username" 
                                                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newInterface.username || ''}
                                                onChange={e => setNewInterface({...newInterface, username: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PPPoE Password</label>
                                            <input 
                                                type="password" 
                                                placeholder="ISP Password" 
                                                className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newInterface.password || ''}
                                                onChange={e => setNewInterface({...newInterface, password: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                     <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Weight (Load Balancing Ratio)</label>
                                     <input 
                                        type="number" 
                                        min="1"
                                        max="100"
                                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newInterface.weight}
                                        onChange={e => setNewInterface({...newInterface, weight: parseInt(e.target.value) || 1})}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={handleAddInterface}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    Add Interface
                                </button>
                                <button 
                                    onClick={() => setShowAddForm(false)}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Logs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">System Logs</h3>
                </div>
                <div className="p-6 bg-slate-900 text-slate-300 font-mono text-xs max-h-48 overflow-y-auto">
                    {logs.length > 0 ? (
                        logs.map((log, i) => (
                            <div key={i} className="mb-1 pb-1 border-b border-slate-800 last:border-0">{log}</div>
                        ))
                    ) : (
                        <div className="text-slate-500 italic">No logs available.</div>
                    )}
                </div>
            </div>

        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-600/10">
                <h3 className="font-black uppercase tracking-widest text-sm mb-4">How it works</h3>
                <div className="space-y-4 text-xs leading-relaxed opacity-90">
                    <p>
                        <strong className="block text-indigo-200 mb-1 uppercase text-[10px]">PCC (Per Connection Classifier)</strong>
                        Divides traffic into multiple streams based on IP addresses or ports.
                    </p>
                    <p>
                        <strong className="block text-indigo-200 mb-1 uppercase text-[10px]">Connection Types</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li><strong>DHCP:</strong> Automatic IP assignment from ISP.</li>
                            <li><strong>Static:</strong> Manual IP configuration.</li>
                            <li><strong>PPPoE:</strong> Dial-up connection requiring Username/Password.</li>
                        </ul>
                    </p>
                </div>
            </div>
            
            {config.enabled && (
                <>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-4">Load Balancing Mode</h3>
                    <div className="space-y-2">
                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${config.mode === 'pcc' ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}>
                            <input 
                                type="radio" 
                                name="mode" 
                                checked={config.mode === 'pcc'} 
                                onChange={() => setConfig({...config, mode: 'pcc'})}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <div className="font-bold text-xs text-slate-700 uppercase">PCC (Failover & Load Balance)</div>
                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Packet marking & routing rules</div>
                            </div>
                        </label>
                        <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${config.mode === 'ecmp' ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-300'}`}>
                            <input 
                                type="radio" 
                                name="mode" 
                                checked={config.mode === 'ecmp'} 
                                onChange={() => setConfig({...config, mode: 'ecmp'})}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <div className="font-bold text-xs text-slate-700 uppercase">ECMP (Round Robin)</div>
                                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Kernel-based multipath routing</div>
                            </div>
                        </label>
                    </div>
                </div>

                {config.mode === 'pcc' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-4">PCC Method</h3>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                            <input 
                                type="radio" 
                                name="pcc_method" 
                                checked={config.pcc_method === 'both_addresses'} 
                                onChange={() => setConfig({...config, pcc_method: 'both_addresses'})}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <div className="font-bold text-xs text-slate-700 uppercase">Both Addresses</div>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-blue-300 transition-colors">
                            <input 
                                type="radio" 
                                name="pcc_method" 
                                checked={config.pcc_method === 'both_addresses_ports'} 
                                onChange={() => setConfig({...config, pcc_method: 'both_addresses_ports'})}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                                <div className="font-bold text-xs text-slate-700 uppercase">Addr & Ports</div>
                            </div>
                        </label>
                        </div>
                </div>
                )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default MultiWanSettings;