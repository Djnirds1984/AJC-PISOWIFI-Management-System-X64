import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { NetworkInterface, PPPoEServerConfig, PPPoEUser, PPPoESession, PPPoEProfile, PPPoEBillingProfile } from '../../types';

const PPPoEServer: React.FC = () => {
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
  const [loading, setLoading] = useState(false);
  
  // PPPoE Server State
  const [pppoeServer, setPppoeServer] = useState<Partial<PPPoEServerConfig>>({
    interface: '',
    local_ip: '192.168.100.1',
    dns1: '8.8.8.8',
    dns2: '8.8.4.4',
    service_name: ''
  });
  const [pppoeStatus, setPppoeStatus] = useState<any>(null);
  const [pppoeUsers, setPppoeUsers] = useState<PPPoEUser[]>([]);
  const [pppoeSessions, setPppoeSessions] = useState<PPPoESession[]>([]);
  const [pppoeProfiles, setPppoeProfiles] = useState<PPPoEProfile[]>([]);
  const [pppoeBillingProfiles, setPppoeBillingProfiles] = useState<PPPoEBillingProfile[]>([]);
  const [pppoeLogs, setPppoeLogs] = useState<string[]>([]);
  
  const [newPppoeUser, setNewPppoeUser] = useState({ 
    username: '', 
    password: '', 
    billing_profile_id: '',
    expiration_date: '',
    expiration_action: 'disable',
    expiration_profile_id: '',
    redirect_url: ''
  });
  const [newProfile, setNewProfile] = useState<PPPoEProfile>({ name: '', rate_limit_dl: 5, rate_limit_ul: 5, ip_pool_start: '', ip_pool_end: '' });
  const [newBillingProfile, setNewBillingProfile] = useState<Partial<PPPoEBillingProfile>>({ profile_id: 0, name: '', price: 0 });

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editingBillingProfileId, setEditingBillingProfileId] = useState<number | null>(null);

  useEffect(() => { 
    loadData();
    const logInterval = setInterval(loadLogs, 5000);
    return () => clearInterval(logInterval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ifaces, pppoeS, pppoeU, pppoeSess, profiles, billingProfiles] = await Promise.all([
        apiClient.getInterfaces(),
        apiClient.getPPPoEServerStatus().catch(() => null),
        apiClient.getPPPoEUsers().catch(() => []),
        apiClient.getPPPoESessions().catch(() => []),
        apiClient.getPPPoEProfiles().catch(() => []),
        apiClient.getPPPoEBillingProfiles().catch(() => [])
      ]);
      const detectedIfaces = ifaces.filter(i => !i.isLoopback);
      setInterfaces(detectedIfaces);

      // Auto-select br0 if available and no interface selected
      if (!pppoeServer.interface) {
        const br0 = detectedIfaces.find(i => i.name === 'br0');
        if (br0) {
          setPppoeServer(prev => ({ ...prev, interface: 'br0' }));
        }
      }

      setPppoeStatus(pppoeS);
      setPppoeUsers(Array.isArray(pppoeU) ? pppoeU : []);
      setPppoeSessions(Array.isArray(pppoeSess) ? pppoeSess : []);
      setPppoeProfiles(profiles);
      setPppoeBillingProfiles(billingProfiles);
      loadLogs();
    } catch (err) { 
      console.error('[UI] Data Load Error:', err); 
    }
    finally { setLoading(false); }
  };

  const loadLogs = async () => {
    try {
      const logs = await apiClient.getPPPoELogs();
      setPppoeLogs(logs);
    } catch (e) {}
  };

  // PPPoE Server Functions
  const startPPPoEServerHandler = async () => {
    if (!pppoeServer.interface || !pppoeServer.local_ip) {
      return alert('Please fill all required fields!');
    }
    
    try {
      setLoading(true);
      await apiClient.startPPPoEServer(pppoeServer as PPPoEServerConfig);
      await loadData();
      alert('PPPoE Server started successfully!');
    } catch (e: any) {
      alert(`Failed to start PPPoE Server: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stopPPPoEServerHandler = async () => {
    if (!confirm('Stop PPPoE Server? All active connections will be terminated.')) return;
    
    try {
      setLoading(true);
      await apiClient.stopPPPoEServer(pppoeStatus?.config?.interface || '');
      await loadData();
      alert('PPPoE Server stopped');
    } catch (e: any) {
      alert(`Failed to stop server: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const restartPPPoEServerHandler = async () => {
    try {
      setLoading(true);
      await apiClient.restartPPPoEServer();
      await loadData();
      alert('PPPoE Server restarted successfully!');
    } catch (e: any) {
      alert(`Failed to restart server: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addPPPoEUserHandler = async () => {
    if (!newPppoeUser.username || (!newPppoeUser.password && !editingUserId)) {
      return alert('Username and password required!');
    }
    
    try {
      setLoading(true);
      if (editingUserId) {
        await apiClient.updatePPPoEUser(editingUserId, {
          username: newPppoeUser.username,
          password: newPppoeUser.password || undefined, // Only update password if provided
          billing_profile_id: newPppoeUser.billing_profile_id ? parseInt(newPppoeUser.billing_profile_id) : undefined,
          expiration_date: newPppoeUser.expiration_date || undefined,
          expiration_action: newPppoeUser.expiration_action,
          expiration_profile_id: newPppoeUser.expiration_profile_id ? parseInt(newPppoeUser.expiration_profile_id) : undefined,
          redirect_url: newPppoeUser.redirect_url || undefined
        });
        alert(`User ${newPppoeUser.username} updated!`);
      } else {
        await apiClient.addPPPoEUser(
          newPppoeUser.username, 
          newPppoeUser.password, 
          newPppoeUser.billing_profile_id ? parseInt(newPppoeUser.billing_profile_id) : undefined,
          newPppoeUser.expiration_date || undefined,
          newPppoeUser.expiration_action,
          newPppoeUser.expiration_profile_id ? parseInt(newPppoeUser.expiration_profile_id) : undefined,
          newPppoeUser.redirect_url || undefined
        );
        alert(`User ${newPppoeUser.username} added!`);
      }
      
      cancelEditUser();
      await loadData();
    } catch (e: any) {
      alert(`Failed to ${editingUserId ? 'update' : 'add'} user: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editUser = (user: PPPoEUser) => {
    setNewPppoeUser({
      username: user.username,
      password: '', // Don't show password
      billing_profile_id: user.billing_profile_id ? user.billing_profile_id.toString() : '',
      expiration_date: user.expiration_date || '',
      expiration_action: user.expiration_action || 'disable',
      redirect_url: user.redirect_url || ''
    });
    setEditingUserId(user.id || null);
  };

  const cancelEditUser = () => {
    setNewPppoeUser({ 
      username: '', 
      password: '', 
      billing_profile_id: '',
      expiration_date: '',
      expiration_action: 'disable',
      redirect_url: ''
    });
    setEditingUserId(null);
  };

  const deletePPPoEUserHandler = async (userId: number, username: string) => {
    if (!confirm(`Delete PPPoE user "${username}"?`)) return;
    
    try {
      setLoading(true);
      await apiClient.deletePPPoEUser(userId);
      await loadData();
    } catch (e: any) {
      alert(`Failed to delete user: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addProfileHandler = async () => {
    if (!newProfile.name) return alert('Profile name required!');
    try {
      setLoading(true);
      if (editingProfileId) {
        await apiClient.updatePPPoEProfile(editingProfileId, newProfile);
        alert(`Profile ${newProfile.name} updated!`);
      } else {
        await apiClient.addPPPoEProfile(newProfile);
        alert(`Profile ${newProfile.name} added!`);
      }
      cancelEditProfile();
      await loadData();
    } catch (e: any) {
      alert(`Failed to ${editingProfileId ? 'update' : 'add'} profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editProfile = (profile: PPPoEProfile) => {
    setNewProfile(profile);
    setEditingProfileId(profile.id || null);
  };

  const cancelEditProfile = () => {
    setNewProfile({ name: '', rate_limit_dl: 5, rate_limit_ul: 5, ip_pool_start: '', ip_pool_end: '' });
    setEditingProfileId(null);
  };

  const deleteProfileHandler = async (id: number) => {
    if (!confirm('Delete this profile?')) return;
    try {
      setLoading(true);
      await apiClient.deletePPPoEProfile(id);
      await loadData();
    } catch (e: any) {
      alert(`Failed to delete profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addBillingProfileHandler = async () => {
    if (!newBillingProfile.name || !newBillingProfile.profile_id) return alert('Name and Profile selection required!');
    try {
      setLoading(true);
      if (editingBillingProfileId) {
        await apiClient.updatePPPoEBillingProfile(editingBillingProfileId, newBillingProfile);
        alert(`Billing Profile ${newBillingProfile.name} updated!`);
      } else {
        await apiClient.addPPPoEBillingProfile(newBillingProfile);
        alert(`Billing Profile ${newBillingProfile.name} added!`);
      }
      cancelEditBillingProfile();
      await loadData();
    } catch (e: any) {
      alert(`Failed to ${editingBillingProfileId ? 'update' : 'add'} billing profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const editBillingProfile = (profile: PPPoEBillingProfile) => {
    setNewBillingProfile({
      profile_id: profile.profile_id,
      name: profile.name,
      price: profile.price
    });
    setEditingBillingProfileId(profile.id || null);
  };

  const cancelEditBillingProfile = () => {
    setNewBillingProfile({ profile_id: 0, name: '', price: 0 });
    setEditingBillingProfileId(null);
  };

  const deleteBillingProfileHandler = async (id: number) => {
    if (!confirm('Delete this billing profile?')) return;
    try {
      setLoading(true);
      await apiClient.deletePPPoEBillingProfile(id);
      await loadData();
    } catch (e: any) {
      alert(`Failed to delete billing profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-32 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* PPPoE Server Management */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">PPPoE Server</h3>
            <span className="text-xs bg-slate-900 text-white px-1.5 py-0.5 rounded font-black tracking-tighter">ISP MODE</span>
          </div>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter hidden sm:block">Accept PPPoE client connections</p>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Status and Config (Left) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Status Card */}
            <div className="bg-slate-900 rounded-lg p-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${pppoeStatus?.running ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></div>
                <div>
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Server Status</div>
                  <div className="text-sm font-black uppercase tracking-tight">
                    {pppoeStatus?.running ? `Running on ${pppoeStatus.config?.interface}` : 'Inactive'}
                  </div>
                </div>
              </div>
              {pppoeStatus?.running && (
                <div className="flex gap-2">
                  <button onClick={restartPPPoEServerHandler} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-md text-[11px] font-black uppercase transition-all active:scale-95 disabled:opacity-50">
                    Restart
                  </button>
                  <button onClick={stopPPPoEServerHandler} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-[11px] font-black uppercase transition-all active:scale-95 disabled:opacity-50">
                    Stop Server
                  </button>
                </div>
              )}
            </div>

            {/* Config Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Listen Interface</label>
                    <select 
                      value={pppoeServer.interface}
                      onChange={e => setPppoeServer({...pppoeServer, interface: e.target.value})}
                      disabled={pppoeStatus?.running}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-bold disabled:opacity-50 focus:ring-1 focus:ring-slate-900 outline-none"
                    >
                      <option value="">Select Interface...</option>
                      {interfaces.filter(i => i.type === 'ethernet' || i.type === 'vlan' || i.type === 'bridge').map(i => (
                        <option key={i.name} value={i.name}>
                          {i.name} ({i.type}){i.name === 'br0' ? ' - Recommended' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Local IP</label>
                    <input 
                      type="text" 
                      value={pppoeServer.local_ip} 
                      onChange={e => setPppoeServer({...pppoeServer, local_ip: e.target.value})}
                      disabled={pppoeStatus?.running}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-mono disabled:opacity-50 outline-none" 
                      placeholder="192.168.100.1"
                    />
                  </div>


                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">DNS 1</label>
                      <input 
                        type="text" 
                        value={pppoeServer.dns1} 
                        onChange={e => setPppoeServer({...pppoeServer, dns1: e.target.value})}
                        disabled={pppoeStatus?.running}
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-mono disabled:opacity-50 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">DNS 2</label>
                      <input 
                        type="text" 
                        value={pppoeServer.dns2} 
                        onChange={e => setPppoeServer({...pppoeServer, dns2: e.target.value})}
                        disabled={pppoeStatus?.running}
                        className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-mono disabled:opacity-50 outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Service Name</label>
                    <input 
                      type="text" 
                      value={pppoeServer.service_name} 
                      onChange={e => setPppoeServer({...pppoeServer, service_name: e.target.value})}
                      disabled={pppoeStatus?.running}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm font-bold disabled:opacity-50 outline-none" 
                      placeholder="Leave empty for default"
                    />
                  </div>

                  <div className="pt-2">
                    {!pppoeStatus?.running && (
                      <button 
                        onClick={startPPPoEServerHandler} 
                        disabled={loading} 
                        className="w-full bg-slate-900 text-white py-2.5 rounded-md font-black text-[11px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                      >
                        Launch PPPoE Server
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profiles Management */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PPPoE Profiles */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">PPPoE Profiles</h4>
                  <span className="text-sm font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{pppoeProfiles.length}</span>
                </div>
                <div className="p-3 border-b border-slate-100 bg-slate-50/30">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="Profile Name"
                      value={newProfile.name}
                      onChange={e => setNewProfile({...newProfile, name: e.target.value})}
                      className="col-span-2 w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold outline-none"
                    />
                    <div className="relative">
                      <span className="absolute right-2 top-1 text-sm font-black text-slate-300">DL</span>
                      <input 
                        type="number" 
                        placeholder="DL Mbps"
                        value={newProfile.rate_limit_dl}
                        onChange={e => setNewProfile({...newProfile, rate_limit_dl: parseInt(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono outline-none"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute right-2 top-1 text-sm font-black text-slate-300">UL</span>
                      <input 
                        type="number" 
                        placeholder="UL Mbps"
                        value={newProfile.rate_limit_ul}
                        onChange={e => setNewProfile({...newProfile, rate_limit_ul: parseInt(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="IP Pool Start"
                      value={newProfile.ip_pool_start}
                      onChange={e => setNewProfile({...newProfile, ip_pool_start: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="IP Pool End"
                      value={newProfile.ip_pool_end}
                      onChange={e => setNewProfile({...newProfile, ip_pool_end: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-mono outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={addProfileHandler}
                      className={`flex-1 ${editingProfileId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'} text-white py-1.5 rounded text-sm font-black uppercase tracking-widest transition-all`}
                    >
                      {editingProfileId ? 'Update Profile' : 'Add Profile'}
                    </button>
                    {editingProfileId && (
                      <button 
                        onClick={cancelEditProfile}
                        className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded text-sm font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[150px] overflow-y-auto divide-y divide-slate-100">
                  {pppoeProfiles.map(p => (
                    <div key={p.id} className="px-3 py-2 flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{p.name}</p>
                        <p className="text-sm text-slate-400 font-bold uppercase">{p.rate_limit_dl}M/{p.rate_limit_ul}M Limit</p>
                        {p.ip_pool_start && p.ip_pool_end && (
                          <p className="text-xs text-slate-500 font-mono">{p.ip_pool_start} - {p.ip_pool_end}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => editProfile(p)} className="text-blue-500 hover:text-blue-700 p-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteProfileHandler(p.id!)} className="text-red-500 hover:text-red-700 p-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Billing Profiles */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Billing Profiles</h4>
                  <span className="text-sm font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{pppoeBillingProfiles.length}</span>
                </div>
                <div className="p-3 border-b border-slate-100 bg-slate-50/30">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input 
                      type="text" 
                      placeholder="Billing Name"
                      value={newBillingProfile.name}
                      onChange={e => setNewBillingProfile({...newBillingProfile, name: e.target.value})}
                      className="col-span-2 w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold outline-none"
                    />
                    <select 
                      value={newBillingProfile.profile_id}
                      onChange={e => setNewBillingProfile({...newBillingProfile, profile_id: parseInt(e.target.value)})}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-sm font-bold outline-none"
                    >
                      <option value="0">Select Profile...</option>
                      {pppoeProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="relative">
                      <span className="absolute left-2 top-1 text-sm font-black text-slate-300">₱</span>
                      <input 
                        type="number" 
                        placeholder="Price"
                        value={newBillingProfile.price}
                        onChange={e => setNewBillingProfile({...newBillingProfile, price: parseInt(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded pl-5 pr-2 py-1 text-sm font-mono outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={addBillingProfileHandler}
                      className={`flex-1 ${editingBillingProfileId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-1.5 rounded text-sm font-black uppercase tracking-widest transition-all`}
                    >
                      {editingBillingProfileId ? 'Update Billing' : 'Add Billing'}
                    </button>
                    {editingBillingProfileId && (
                      <button 
                        onClick={cancelEditBillingProfile}
                        className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded text-sm font-black uppercase tracking-widest hover:bg-slate-300 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-[150px] overflow-y-auto divide-y divide-slate-100">
                  {pppoeBillingProfiles.map(bp => (
                    <div key={bp.id} className="px-3 py-2 flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{bp.name}</p>
                        <p className="text-sm text-slate-400 font-bold uppercase">₱{bp.price} • {pppoeProfiles.find(p => p.id === bp.profile_id)?.name || 'Unknown'}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => editBillingProfile(bp)} className="text-blue-500 hover:text-blue-700 p-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => deleteBillingProfileHandler(bp.id!)} className="text-red-500 hover:text-red-700 p-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* User Management (Right) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex-shrink-0">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3">{editingUserId ? 'Edit User' : 'Add User'}</h4>
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={newPppoeUser.username} 
                  onChange={e => setNewPppoeUser({...newPppoeUser, username: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-bold outline-none focus:bg-white" 
                  placeholder="Username"
                />
                <input 
                  type="password" 
                  value={newPppoeUser.password} 
                  onChange={e => setNewPppoeUser({...newPppoeUser, password: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-mono outline-none focus:bg-white" 
                  placeholder={editingUserId ? "Password (Leave empty to keep)" : "Password"}
                />
                <select 
                  value={newPppoeUser.billing_profile_id}
                  onChange={e => setNewPppoeUser({...newPppoeUser, billing_profile_id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-bold outline-none focus:bg-white"
                >
                  <option value="">Select Billing Profile (Optional)...</option>
                  {pppoeBillingProfiles.map(bp => <option key={bp.id} value={bp.id}>{bp.name} (₱{bp.price})</option>)}
                </select>

                <div className="pt-2 border-t border-slate-100 mt-2">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1 block">Expiration (Optional)</label>
                  <input 
                    type="datetime-local" 
                    value={newPppoeUser.expiration_date} 
                    onChange={e => setNewPppoeUser({...newPppoeUser, expiration_date: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-mono outline-none focus:bg-white mb-2" 
                  />
                  
                  {(newPppoeUser.expiration_date || editingUserId) && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <div>
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1 block">Action when Expired</label>
                        <select 
                          value={newPppoeUser.expiration_action}
                          onChange={e => setNewPppoeUser({...newPppoeUser, expiration_action: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-bold outline-none focus:bg-white"
                        >
                          <option value="disable">1. Disable Account</option>
                          <option value="redirect">2. Redirect to URL</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1 block">PPPoE Profile when Expired</label>
                        <select 
                          value={newPppoeUser.expiration_profile_id}
                          onChange={e => setNewPppoeUser({...newPppoeUser, expiration_profile_id: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-bold outline-none focus:bg-white"
                        >
                          <option value="">Select PPPoE Profile (Optional)...</option>
                          {pppoeProfiles.map(profile => (
                            <option key={profile.id} value={profile.id}>{profile.name} ({profile.rate_limit_dl}↓/{profile.rate_limit_ul}↑ Mbps)</option>
                          ))}
                        </select>
                      </div>
                      
                      {newPppoeUser.expiration_action === 'redirect' && (
                        <div>
                          <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1 block">Redirect URL</label>
                          <input 
                            type="text" 
                            value={newPppoeUser.redirect_url} 
                            onChange={e => setNewPppoeUser({...newPppoeUser, redirect_url: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm font-mono outline-none focus:bg-white" 
                            placeholder="http://example.com/expired"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={addPPPoEUserHandler} 
                    disabled={loading}
                    className={`flex-1 ${editingUserId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 rounded font-black text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50`}
                  >
                    {editingUserId ? 'Update User' : 'Create User'}
                  </button>
                  {editingUserId && (
                    <button 
                      onClick={cancelEditUser}
                      disabled={loading}
                      className="bg-slate-200 text-slate-600 px-3 py-2 rounded font-black text-sm uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col flex-grow min-h-[200px]">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">PPPoE Accounts</h4>
                <span className="text-xs font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{pppoeUsers.length}</span>
              </div>
              <div className="overflow-y-auto max-h-[250px] divide-y divide-slate-100">
                {pppoeUsers.length > 0 ? pppoeUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${user.enabled ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-tight">{user.username}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[11px] text-slate-400 uppercase font-black tracking-tighter">
                            ID: {user.id} • {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'NO DATE'}
                          </p>
                          {user.billing_profile_id && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-black">
                              {pppoeBillingProfiles.find(bp => bp.id === user.billing_profile_id)?.name || 'BILLED'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => editUser(user)} 
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Edit User"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                      onClick={() => deletePPPoEUserHandler(user.id!, user.username)} 
                      className="text-red-500 hover:text-red-700 p-1 "
                      title="Delete User"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center">
                    <p className="text-[11px] text-slate-400 uppercase font-black tracking-widest">No accounts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Sessions */}
        {pppoeStatus?.running && pppoeSessions.length > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-indigo-100 bg-indigo-100/50 flex justify-between items-center">
                <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Active Connections</h4>
                <span className="text-xs font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-200">{pppoeSessions.length} ONLINE</span>
              </div>
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {pppoeSessions.map((session, idx) => (
                  <div key={idx} className="bg-white p-2 rounded border border-indigo-200/50 flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-slate-900 truncate">{session.username}</p>
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                      <span>IP: <span className="text-indigo-600 font-mono">{session.ip}</span></span>
                      <span>IF: <span className="text-indigo-600 font-mono">{session.interface}</span></span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-indigo-50">
                      <span className="text-xs text-slate-400">RX: <span className="text-slate-900 font-black">{(session.rx_bytes / 1024 / 1024).toFixed(1)} MB</span></span>
                      <span className="text-xs text-slate-400">TX: <span className="text-slate-900 font-black">{(session.tx_bytes / 1024 / 1024).toFixed(1)} MB</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Debug Logs Output */}
        <div className="px-4 pb-4">
          <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
            <div className="px-3 py-1.5 bg-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Server Logs (Real-time)</h4>
              </div>
              <button onClick={loadLogs} className="text-[11px] text-slate-400 hover:text-white uppercase font-black transition-colors">Refresh</button>
            </div>
            <div className="p-3 font-mono text-[11px] text-slate-300 h-32 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
              {pppoeLogs.length > 0 ? pppoeLogs.map((log, i) => (
                <div key={i} className="border-l border-slate-700 pl-2 py-0.5 hover:bg-slate-800/50 transition-colors">
                  <span className="text-slate-500 mr-2">[{i+1}]</span>
                  {log}
                </div>
              )) : (
                <div className="text-slate-600 italic">Waiting for server logs...</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PPPoEServer;
