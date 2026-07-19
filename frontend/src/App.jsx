import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { 
  BookOpen, 
  FileText, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  LogOut, 
  Globe,
  User, 
  Lock, 
  Share2,
  Mail, 
  FileUp, 
  X, 
  Calendar, 
  Hash, 
  Eye,
  ChevronRight,
  Shield,
  Award,
  Zap,
  FolderOpen,
  Sun,
  Moon
} from 'lucide-react';
import './App.css';

// Fixed subjects config
const SUBJECTS = [
  { code: 'DS', name: 'Data Structures', level: 'Hard' },
  { code: 'DSD', name: 'Digital System Design', level: 'Medium' },
  { code: 'AFL', name: 'Automata & Formal Languages', level: 'Expert' },
  { code: 'PS', name: 'Probability & Statistics', level: 'Medium' },
  { code: 'IND4', name: 'Industry 4.0', level: 'Easy' },
  { code: 'STW', name: 'Software Technology Workshop', level: 'Easy' }
];

// Audio Synthesizer (Web Audio API)
const playCyberSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'success') {
      // Level-up / Upload Complete: Rising electronic chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'triangle';
      osc2.type = 'sine';
      
      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.28); // C6
      
      osc2.frequency.setValueAtTime(261.63, now); // C4
      osc2.frequency.exponentialRampToValueAtTime(523.25, now + 0.12); // C5
      
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } else if (type === 'click') {
      // Short HUD tick chirp
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.04);
      
      gainNode.gain.setValueAtTime(0.04, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (err) {
    console.error('Audio synthesis failed:', err);
  }
};

const formatBytes = (bytes, decimals = 1) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

function App() {
  const { user, token, loading, error: authError, login, signup, logout, API_BASE_URL } = useAuth();
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Navigation & view states
  const [authTab, setAuthTab] = useState('login'); // login | signup
  const [selectedSubject, setSelectedSubject] = useState(null); // subject object or null
  const [activeCategory, setActiveCategory] = useState('Notes'); // Notes | PYQ
  
  // Auth Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupBranch, setSignupBranch] = useState('CSE');
  const [signupSemester, setSignupSemester] = useState('3rd');
  const [formError, setFormError] = useState('');
  
  // Data states
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [stats, setStats] = useState({}); // subjectCode -> { Notes: count, PYQ: count }
  
  // Search, Filters & Sorting
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSort, setGlobalSort] = useState('recent'); // recent | downloads | views
  const [unitFilter, setUnitFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  
  // Modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Notes');
  const [uploadUnitTopic, setUploadUnitTopic] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadIsPersonal, setUploadIsPersonal] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [sharingFile, setSharingFile] = useState(null);
  const [shareEmails, setShareEmails] = useState([]);
  const [shareEmailInput, setShareEmailInput] = useState('');
  const [sharingError, setSharingError] = useState('');
  const [sharingSuccess, setSharingSuccess] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileWhitelist, setProfileWhitelist] = useState(user ? (user.whitelist ? user.whitelist.split(',') : []) : []);
  const [profileWhitelistInput, setProfileWhitelistInput] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileWhitelist(user.whitelist ? user.whitelist.split(',').map(e => e.trim()).filter(Boolean) : []);
    } else {
      setProfileWhitelist([]);
    }
  }, [user]);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch all files metadata
  const fetchFiles = useCallback(async () => {
    if (!token) return;
    setFilesLoading(true);
    try {
      let url = `${API_BASE_URL}/files?sortBy=${globalSort}`;
      if (globalSearch) {
        url += `&search=${encodeURIComponent(globalSearch)}`;
      }
      if (selectedSubject) {
        url += `&subject=${selectedSubject.code}`;
      }
      if (unitFilter) {
        url += `&search=${encodeURIComponent(unitFilter)}`;
      }
      if (yearFilter) {
        url += `&year=${yearFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
        
        // Compute stats for subjects if fetching all files initially
        if (!selectedSubject) {
          const statsMap = {};
          SUBJECTS.forEach(sub => {
            statsMap[sub.code] = { Notes: 0, PYQ: 0 };
          });
          data.forEach(file => {
            if (statsMap[file.subject]) {
              statsMap[file.subject][file.category] = (statsMap[file.subject][file.category] || 0) + 1;
            }
          });
          setStats(statsMap);
        }
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setFilesLoading(false);
    }
  }, [API_BASE_URL, selectedSubject, globalSearch, globalSort, unitFilter, yearFilter]);

  // Load files on dashboard mount or filter updates
  useEffect(() => {
    if (token) {
      fetchFiles();
    }
  }, [fetchFiles, token]);

  // Reset filters when switching subjects
  useEffect(() => {
    setUnitFilter('');
    setYearFilter('');
  }, [selectedSubject]);

  // Theme switch click handler
  const toggleTheme = () => {
    playCyberSound('click');
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    playCyberSound('click');
    setFormError('');
    if (!loginEmail || !loginPassword) {
      setFormError('Please fill in all fields');
      return;
    }
    const res = await login(loginEmail, loginPassword);
    if (res.success) {
      playCyberSound('success');
    } else {
      setFormError(res.message);
    }
  };

  // Handle Signup submission
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    playCyberSound('click');
    setFormError('');
    if (!signupName || !signupEmail || !signupPassword) {
      setFormError('Name, email, and password are required');
      return;
    }
    const res = await signup(signupName, signupEmail, signupPassword, signupBranch, signupSemester);
    if (res.success) {
      playCyberSound('success');
    } else {
      setFormError(res.message);
    }
  };

  // Handle File selection
  const handleFileChange = (e) => {
    playCyberSound('click');
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF schematics are allowed.');
      setUploadFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Schematic file size exceeds 10MB limit.');
      setUploadFile(null);
      return;
    }

    setUploadError('');
    setUploadFile(file);
    if (!uploadTitle) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setUploadTitle(nameWithoutExt);
    }
  };

  // Handle File Upload submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    playCyberSound('click');
    setUploadError('');
    
    if (!uploadFile) {
      setUploadError('Choose a PDF loot package to upload.');
      return;
    }
    if (!uploadTitle) {
      setUploadError('Loot title required.');
      return;
    }
    if (!uploadSubject) {
      setUploadError('Quest area is required.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('subject', uploadSubject);
      formData.append('category', uploadCategory);
      formData.append('unitTopic', uploadUnitTopic);
      formData.append('isPersonal', uploadIsPersonal);
      if (uploadCategory === 'PYQ' && uploadYear) {
        formData.append('year', uploadYear);
      }

      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file');
      }

      // Reset Form & Close Modal
      setUploadTitle('');
      setUploadSubject('');
      setUploadCategory('Notes');
      setUploadUnitTopic('');
      setUploadYear('');
      setUploadFile(null);
      setUploadIsPersonal(false);
      setIsUploadOpen(false);

      // Play level chimes & update files list
      playCyberSound('success');
      fetchFiles();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle File Download
  const handleDownload = (fileId) => {
    playCyberSound('success');
    window.open(`${API_BASE_URL}/files/download/${fileId}?token=${token}`, '_blank');
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, downloadsCount: (f.downloadsCount || 0) + 1 } : f));
  };

  // Handle File Inline View
  const handleView = (fileId) => {
    playCyberSound('click');
    window.open(`${API_BASE_URL}/files/view/${fileId}?token=${token}`, '_blank');
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, viewsCount: (f.viewsCount || 0) + 1 } : f));
  };

  const handleOpenShare = (file) => {
    playCyberSound('click');
    setSharingFile(file);
    setShareEmails(file.sharedWith ? file.sharedWith.split(',').map(e => e.trim()).filter(Boolean) : []);
    setShareEmailInput('');
    setSharingError('');
    setSharingSuccess('');
    setIsShareOpen(true);
  };

  const handleAddShareEmail = async (e) => {
    e.preventDefault();
    setSharingError('');
    setSharingSuccess('');

    const email = shareEmailInput.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSharingError('Invalid email format');
      return;
    }

    if (shareEmails.includes(email)) {
      setSharingError('Email already has access');
      return;
    }

    const updatedEmails = [...shareEmails, email];
    await updateFileSharingList(updatedEmails);
  };

  const handleRemoveShareEmail = async (emailToRemove) => {
    setSharingError('');
    setSharingSuccess('');
    const updatedEmails = shareEmails.filter(e => e !== emailToRemove);
    await updateFileSharingList(updatedEmails);
  };

  const updateFileSharingList = async (updatedEmails) => {
    setSharingLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/files/${sharingFile.id}/share`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sharedWith: updatedEmails.join(',') })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update sharing settings');
      }

      setShareEmails(updatedEmails);
      setShareEmailInput('');
      setSharingSuccess('Sharing list updated');
      setFiles(prev => prev.map(f => f.id === sharingFile.id ? { ...f, sharedWith: updatedEmails.join(',') } : f));
      setSharingFile(prev => ({ ...prev, sharedWith: updatedEmails.join(',') }));
      playCyberSound('success');
    } catch (err) {
      setSharingError(err.message);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleToggleVisibility = async (file) => {
    playCyberSound('click');
    const newIsPersonal = !file.isPersonal;
    try {
      const response = await fetch(`${API_BASE_URL}/files/${file.id}/visibility`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPersonal: newIsPersonal })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update visibility');
      }

      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isPersonal: newIsPersonal } : f));
      playCyberSound('success');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddWhitelistEmail = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    const email = profileWhitelistInput.trim().toLowerCase();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setProfileError('Invalid email format');
      return;
    }

    if (profileWhitelist.includes(email)) {
      setProfileError('Email already whitelisted');
      return;
    }

    const updatedWhitelist = [...profileWhitelist, email];
    await saveUserWhitelist(updatedWhitelist);
  };

  const handleRemoveWhitelistEmail = async (emailToRemove) => {
    setProfileError('');
    setProfileSuccess('');
    const updatedWhitelist = profileWhitelist.filter(e => e !== emailToRemove);
    await saveUserWhitelist(updatedWhitelist);
  };

  const saveUserWhitelist = async (updatedWhitelist) => {
    setProfileLoading(true);
    try {
      const whitelistStr = updatedWhitelist.join(',');
      const response = await fetch(`${API_BASE_URL}/auth/whitelist`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ whitelist: whitelistStr })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update Whitelist');
      }

      setProfileWhitelist(updatedWhitelist);
      setProfileWhitelistInput('');
      setProfileSuccess('Whitelist updated successfully');
      if (user) {
        user.whitelist = whitelistStr;
      }
      playCyberSound('success');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle File Delete
  const handleDelete = async (fileId) => {
    playCyberSound('click');
    if (!window.confirm('Do you want to discard this loot archive? This action cannot be reversed.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        playCyberSound('success');
        fetchFiles();
      } else {
        const data = await response.json();
        alert(data.message || 'Error deleting file');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network transmission error');
    }
  };

  // Check delete authorization
  const canDelete = (file) => {
    if (!user) return false;
    return user.role === 'admin' || file.uploaderId === user.id;
  };

  // RPG Level calculations
  const myUploadsCount = user ? files.filter(f => f.uploaderId === user.id).length : 0;
  const userLevel = user ? (user.role === 'admin' ? 99 : Math.min(10, Math.floor(myUploadsCount / 2) + 1)) : 1;
  const userXP = user ? (user.role === 'admin' ? 100 : (myUploadsCount % 2) * 50) : 0;

  // Filter lists calculations
  const availableYears = Array.from(
    new Set(files.filter(f => f.category === 'PYQ' && f.year).map(f => f.year))
  ).sort((a, b) => b - a);

  const availableUnits = Array.from(
    new Set(files.filter(f => f.category === activeCategory && f.unitTopic).map(f => f.unitTopic))
  ).filter(u => u.trim() !== '');

  const categoryFilteredFiles = files.filter(f => f.category === activeCategory);

  // Initial loader
  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner"></div>
        <p>Initializing Cyber Deck...</p>
      </div>
    );
  }

  // 1. ANONYMOUS ACCESS VIEW
  if (!user) {
    return (
      <div className="app-container">
        <header className="navbar">
          <div className="nav-brand">
            <BookOpen size={22} style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 5px var(--secondary-glow))' }} />
            <span>EduQuest Terminal</span>
          </div>

          <div className="nav-actions">
            {/* Theme Toggle in Login */}
            <button className="btn-icon" onClick={toggleTheme} title="Toggle HUD Theme">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        <main className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h2>User Authorization</h2>
              <p>Authorize connection to download study loot & trial scrolls</p>
            </div>

            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { playCyberSound('click'); setAuthTab('login'); setFormError(''); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${authTab === 'signup' ? 'active' : ''}`}
                onClick={() => { playCyberSound('click'); setAuthTab('signup'); setFormError(''); }}
              >
                Sign Up
              </button>
            </div>

            {authTab === 'login' ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                {formError && <div className="auth-error">{formError}</div>}
                
                <div className="form-group">
                  <label className="form-label">System Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--secondary)' }} />
                    <input 
                      type="email" 
                      className="form-input" 
                      style={{ paddingLeft: '32px' }}
                      placeholder="e.g. pilot@academy.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Encryption Key</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--secondary)' }} />
                    <input 
                      type="password" 
                      className="form-input" 
                      style={{ paddingLeft: '32px' }}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  Establish Link
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleSignupSubmit}>
                {formError && <div className="auth-error">{formError}</div>}

                <div className="form-group">
                  <label className="form-label">Pilot Alias (Name)</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--secondary)' }} />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '32px' }}
                      placeholder="e.g. Marcus Vance"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">System Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--secondary)' }} />
                    <input 
                      type="email" 
                      className="form-input" 
                      style={{ paddingLeft: '32px' }}
                      placeholder="e.g. pilot@academy.edu"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Security Password (Min 6 chars)</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--secondary)' }} />
                    <input 
                      type="password" 
                      className="form-input" 
                      style={{ paddingLeft: '32px' }}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>



                <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  Register Pilot
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    );
  }

  // 2. AUTHORIZED ACCESS VIEW
  return (
    <div className="app-container">
      {/* Navbar HUD */}
      <header className="navbar">
        <div className="nav-brand" onClick={() => { playCyberSound('click'); setSelectedSubject(null); }}>
          <Award size={20} style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 5px var(--secondary-glow))' }} />
          <span>EduQuest Deck</span>
        </div>

        <div className="nav-actions">
          {/* XP Progression HUD */}
          <div className="xp-hud-container">
            <div className="xp-header">
              <span>LVL {userLevel}</span>
              <span>{userXP}/100 XP</span>
            </div>
            <div className="xp-bar-outer" title={`${myUploadsCount} total loot items published`}>
              <div className="xp-bar-inner" style={{ width: `${userXP}%` }}></div>
            </div>
          </div>

          <div className="nav-user" onClick={() => { playCyberSound('click'); setIsProfileOpen(true); }} style={{ cursor: 'pointer' }} title="View system profile & whitelist">
            {user.role === 'admin' && (
              <span className="user-badge admin-badge">
                <Shield size={11} /> Admin GM
              </span>
            )}
            <span style={{ fontWeight: 700, color: 'var(--text-body)', textShadow: '0 0 4px var(--secondary-glow)' }}>
              {user.name}
            </span>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={() => {
              playCyberSound('click');
              if (selectedSubject) {
                setUploadSubject(selectedSubject.code);
              }
              setIsUploadOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Publish Loot</span>
          </button>

          {/* HUD Theme Toggle Switch */}
          <button className="btn-icon" onClick={toggleTheme} title="Toggle HUD Theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button className="btn-icon" onClick={() => { playCyberSound('click'); logout(); }} title="Disconnect Terminal">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Quest Deck */}
      {!selectedSubject ? (
        // DASHBOARD MODE
        <div style={{ flex: 1 }}>
          <section className="hero">
            <h1>Select Your Quest Board</h1>
            <p>
              Transmit schematics, download cognitive data scrolls, and unlock ancient trials.
              Select a target subject module below to claim and review shared loot caches.
            </p>

            <div className="controls-bar">
              <div className="search-wrapper">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Scan directory by loot title, topic, or pilot..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </div>

              <select 
                className="sort-select"
                value={globalSort}
                onChange={(e) => { playCyberSound('click'); setGlobalSort(e.target.value); }}
              >
                <option value="recent">Sort: Most Recent</option>
                <option value="downloads">Sort: Max Downloads</option>
                <option value="views">Sort: Max Views</option>
              </select>
            </div>
          </section>

          <h2 className="dashboard-title">Active Quest Zones</h2>
          
          <div className="subject-board">
            {SUBJECTS.map((subject, index) => {
              const countNotes = stats[subject.code]?.Notes || 0;
              const countPYQ = stats[subject.code]?.PYQ || 0;

              return (
                <div key={subject.code} className="subject-card">
                  <div className="subject-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="subject-code">{subject.code}</span>
                      <span 
                        style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: 800, 
                          color: subject.level === 'Hard' || subject.level === 'Expert' ? 'var(--primary)' : 'var(--secondary)',
                          border: `1px solid ${subject.level === 'Hard' || subject.level === 'Expert' ? 'var(--primary)' : 'var(--secondary)'}`,
                          padding: '0.15rem 0.35rem',
                          borderRadius: '2px',
                          textTransform: 'uppercase'
                        }}
                      >
                        {subject.level}
                      </span>
                    </div>
                    <div className="subject-name" title={subject.name}>{subject.name}</div>
                  </div>

                  <div className="subject-stats">
                    <div className="stat-chip">
                      <span>{countNotes}</span>
                      Scrolls
                    </div>
                    <div className="stat-chip">
                      <span>{countPYQ}</span>
                      Trials
                    </div>
                  </div>

                  <div className="subject-action">
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%' }}
                      onClick={() => { playCyberSound('click'); setSelectedSubject(subject); }}
                    >
                      <span>Explore Zone</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // SUBJECT WORKSPACE MODE
        <main className="files-panel" style={{ flex: 1, padding: '2rem max(2rem, 5vw)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            
            {/* Header/Breadcrumb */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  <span style={{ cursor: 'pointer', color: 'var(--text-primary)' }} onClick={() => { playCyberSound('click'); setSelectedSubject(null); }}>Quest Board</span>
                  <span>/</span>
                  <span style={{ color: 'var(--text-body)' }}>{selectedSubject.code}</span>
                </div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 0 10px rgba(0, 240, 255, 0.15)' }}>
                  {selectedSubject.name}
                </h1>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => { playCyberSound('click'); setSelectedSubject(null); }}
                >
                  Quest Boards
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    playCyberSound('click');
                    setUploadSubject(selectedSubject.code);
                    setIsUploadOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Deposit Loot ({selectedSubject.code})</span>
                </button>
              </div>
            </div>

            {/* 💡 Feature Tip Block */}
            <div style={{
              background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05) 0%, rgba(255, 0, 128, 0.02) 100%)',
              borderLeft: '3px solid var(--secondary)',
              padding: '0.75rem 1rem',
              borderRadius: '4px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={14} style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 2px var(--secondary-glow))' }} />
                <span>
                  <strong>Control Panel Tip:</strong> You can toggle document visibility post-upload on your own file cards. Click your username in the navbar or click the button to manage your <strong>Instagram-style close friends whitelist</strong>.
                </span>
              </div>
              <button 
                onClick={() => { playCyberSound('click'); setIsProfileOpen(true); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-primary)',
                  fontSize: '0.7rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Configure Whitelist
              </button>
            </div>

            {/* Workspace Category Tabs */}
            <div className="tabs-container" style={{ paddingLeft: 0, paddingRight: 0, marginBottom: '1.25rem' }}>
              <div className="tabs-nav">
                <button 
                  className={`tab-btn ${activeCategory === 'Notes' ? 'active' : ''}`}
                  onClick={() => { playCyberSound('click'); setActiveCategory('Notes'); }}
                >
                  Cognitive Scrolls (Notes)
                  <span className="tab-badge">
                    {files.filter(f => f.category === 'Notes').length}
                  </span>
                </button>
                <button 
                  className={`tab-btn ${activeCategory === 'PYQ' ? 'active' : ''}`}
                  onClick={() => { playCyberSound('click'); setActiveCategory('PYQ'); }}
                >
                  Ancient Trials (PYQs)
                  <span className="tab-badge">
                    {files.filter(f => f.category === 'PYQ').length}
                  </span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Sort:</span>
                <select 
                  className="sort-select"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                  value={globalSort}
                  onChange={(e) => { playCyberSound('click'); setGlobalSort(e.target.value); }}
                >
                  <option value="recent">Most Recent</option>
                  <option value="downloads">Downloads</option>
                  <option value="views">Views</option>
                </select>
              </div>
            </div>

            {/* HUD Filtering Area */}
            <div className="workspace-filters" style={{ borderRadius: '4px', marginBottom: '1.25rem' }}>
              <div className="search-wrapper workspace-search">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  className="search-input" 
                  style={{ padding: '0.45rem 0.5rem 0.45rem 2rem', fontSize: '0.8rem' }}
                  placeholder={`Scan active index...`}
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                />
              </div>

              <select 
                className="workspace-select"
                value={unitFilter}
                onChange={(e) => { playCyberSound('click'); setUnitFilter(e.target.value); }}
              >
                <option value="">All Topics/Chapters</option>
                {availableUnits.map((u, index) => (
                  <option key={index} value={u}>{u}</option>
                ))}
              </select>

              {activeCategory === 'PYQ' && (
                <select 
                  className="workspace-select"
                  value={yearFilter}
                  onChange={(e) => { playCyberSound('click'); setYearFilter(e.target.value); }}
                >
                  <option value="">All Trial Years</option>
                  {availableYears.map((y, index) => (
                    <option key={index} value={y}>{y}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Inventory Listing */}
            {filesLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Scanning Database Caches...</p>
              </div>
            ) : categoryFilteredFiles.length === 0 ? (
              <div className="empty-state">
                <FolderOpen className="empty-state-icon" size={44} style={{ color: 'var(--secondary)' }} />
                <h3>No Loot Found</h3>
                <p>This quest area is currently empty. Be the first to deposit study archives here!</p>
              </div>
            ) : (
              <div className="files-grid">
                {categoryFilteredFiles.map(file => (
                  <div key={file.id} className="file-card">
                    <div className="file-top">
                      <div className="file-icon-wrapper">
                        <FileText size={20} />
                      </div>
                      
                      <div className="file-meta-info">
                        <h3 className="file-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {file.title}
                          {file.isPersonal ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Lock size={12} style={{ color: 'var(--primary)', filter: 'drop-shadow(0 0 2px var(--primary))' }} title="Personal Note" />
                              {file.uploaderId === user.id && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleVisibility(file); }} 
                                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                  title="Change to Public visibility"
                                >
                                  Make Public
                                </button>
                              )}
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Globe size={12} style={{ color: 'var(--secondary)', filter: 'drop-shadow(0 0 2px var(--secondary-glow))' }} title="Public Note" />
                              {file.uploaderId === user.id && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleToggleVisibility(file); }} 
                                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.65rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                  title="Change to Personal visibility"
                                >
                                  Make Private
                                </button>
                              )}
                            </span>
                          )}
                        </h3>
                        <div className="file-tags">
                          <span className="file-tag">{formatBytes(file.fileSize)}</span>
                          {file.unitTopic && (
                            <span className="file-tag tag-unit">Chapter: {file.unitTopic}</span>
                          )}
                          {file.year && (
                            <span className="file-tag tag-year">Trial Year: {file.year}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="file-details">
                      <div className="uploader-info">
                        <span className="uploader-name">Pilot: {file.uploaderName}</span>
                        <span className="upload-date">Transmitted {formatDate(file.uploadedAt)}</span>
                      </div>

                      <div className="file-stats">
                        <div className="stat-item" title="Views">
                          <Eye size={12} />
                          <span>{file.viewsCount || 0}</span>
                        </div>
                        <div className="stat-item" title="Downloads">
                          <Download size={12} />
                          <span>{file.downloadsCount || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="file-actions">
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleView(file.id)}
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                      
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => handleDownload(file.id)}
                      >
                        <Download size={13} />
                        <span>Claim Loot</span>
                      </button>

                      {file.isPersonal && file.uploaderId === user.id && (
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                          onClick={() => handleOpenShare(file)}
                          title="Share note access"
                        >
                          <Share2 size={13} />
                          <span>Share</span>
                        </button>
                      )}

                      {canDelete(file) && (
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '0.35rem', border: 'none' }}
                          onClick={() => handleDelete(file.id)}
                          title="Purge schematic archive"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* 3. TRANSMIT SCHEMATIC (UPLOAD) MODAL */}
      {isUploadOpen && (
        <div className="modal-overlay" onClick={() => { playCyberSound('click'); setIsUploadOpen(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transmit Data schematic</h2>
              <button className="modal-close" onClick={() => { playCyberSound('click'); setIsUploadOpen(false); }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="modal-body" style={{ display: 'flex', gap: '1.1rem', flexDirection: 'column' }}>
                {uploadError && <div className="auth-error">{uploadError}</div>}

                {/* Upload drag-n-drop area */}
                <div className="form-group">
                  <label className="form-label">Loot Package (PDF, Max 10MB)</label>
                  {!uploadFile ? (
                    <label className="dropzone-container">
                      <input 
                        type="file" 
                        accept="application/pdf" 
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <FileUp className="dropzone-icon" size={28} />
                      <span className="dropzone-text">Load Document Schematic</span>
                      <span className="dropzone-subtext">Click here to browse PDF archive</span>
                    </label>
                  ) : (
                    <div className="selected-file-banner">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={14} />
                        <span className="selected-file-name">{uploadFile.name}</span>
                      </div>
                      <button 
                        type="button" 
                        className="remove-file-btn" 
                        onClick={() => { playCyberSound('click'); setUploadFile(null); setUploadTitle(''); }}
                      >
                        Discard
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Loot Title / Identifier</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Unit 3 - Multiplexers and Encoders"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Target Zone (Subject)</label>
                    <select 
                      className="form-input"
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                      required
                    >
                      <option value="">Select Subject</option>
                      {SUBJECTS.map(sub => (
                        <option key={sub.code} value={sub.code}>{sub.code} - {sub.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Loot Category</label>
                    <select 
                      className="form-input"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      required
                    >
                      <option value="Notes">Cognitive Scroll (Notes)</option>
                      <option value="PYQ">Trial Scroll (PYQ)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Chapter / Sector (Optional)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Unit-3, Graph Search"
                      value={uploadUnitTopic}
                      onChange={(e) => setUploadUnitTopic(e.target.value)}
                    />
                  </div>

                  {uploadCategory === 'PYQ' && (
                    <div className="form-group">
                      <label className="form-label">Trial Year (Optional)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        min="2000" 
                        max={new Date().getFullYear() + 2}
                        placeholder="e.g. 2024"
                        value={uploadYear}
                        onChange={(e) => setUploadYear(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', display: 'flex', marginTop: '0.25rem' }}>
                  <input 
                    type="checkbox" 
                    id="uploadIsPersonal"
                    checked={uploadIsPersonal}
                    onChange={(e) => { playCyberSound('click'); setUploadIsPersonal(e.target.checked); }}
                    style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                  />
                  <label htmlFor="uploadIsPersonal" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Lock size={12} style={{ color: 'var(--primary)' }} /> Mark as Personal Note (Private)
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { playCyberSound('click'); setIsUploadOpen(false); }}
                    disabled={uploading}
                  >
                    Abort
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                        <span>Transmitting...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        <span>Confirm Transmit</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SHARE NOTE ACCESS MODAL */}
      {isShareOpen && sharingFile && (
        <div className="modal-overlay" onClick={() => { playCyberSound('click'); setIsShareOpen(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Personal Note</h2>
              <button className="modal-close" onClick={() => { playCyberSound('click'); setIsShareOpen(false); }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', gap: '1.1rem', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Sharing Note: <strong style={{ color: 'var(--text-primary)' }}>{sharingFile.title}</strong>
              </div>

              {sharingError && <div className="auth-error">{sharingError}</div>}
              {sharingSuccess && <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', textShadow: '0 0 2px var(--secondary-glow)' }}>{sharingSuccess}</div>}

              <form onSubmit={handleAddShareEmail} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="Enter pilot's email to allow access..."
                  value={shareEmailInput}
                  onChange={(e) => setShareEmailInput(e.target.value)}
                  required
                  disabled={sharingLoading}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }} disabled={sharingLoading}>
                  Allow
                </button>
              </form>

              <div className="allowed-pilots-list">
                <h4 style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Pilots with Access ({shareEmails.length})
                </h4>
                {shareEmails.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Only you have access to this note. Add an email above to share.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    {shareEmails.map(email => (
                      <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.5rem', borderRadius: '2px', fontSize: '0.8rem' }}>
                        <span style={{ fontFamily: 'monospace' }}>{email}</span>
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem' }} 
                          onClick={() => handleRemoveShareEmail(email)}
                          disabled={sharingLoading}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { playCyberSound('click'); setIsShareOpen(false); }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. USER PROFILE & WHITELIST ACCESS MODAL */}
      {isProfileOpen && (
        <div className="modal-overlay" onClick={() => { playCyberSound('click'); setIsProfileOpen(false); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>System Profile & Access</h2>
              <button className="modal-close" onClick={() => { playCyberSound('click'); setIsProfileOpen(false); }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', gap: '1.1rem', flexDirection: 'column' }}>
              {/* User Info Stats Card */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', textShadow: '0 0 5px var(--secondary-glow)', color: 'var(--text-primary)' }}>{user.name}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div><strong style={{ color: 'var(--text-body)' }}>Email:</strong> {user.email}</div>
                  <div><strong style={{ color: 'var(--text-body)' }}>Rank Status:</strong> Level {userLevel} ({userXP}/100 XP)</div>
                </div>
              </div>

              {/* Whitelist Manager */}
              <div>
                <h3 style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Shield size={14} style={{ color: 'var(--secondary)' }} /> Profile Whitelist (Instagram-Style)
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Whitelisted pilots can see **all** of your personal private notes instantly without manual file-by-file shares.
                </p>

                {profileError && <div className="auth-error" style={{ marginBottom: '0.5rem' }}>{profileError}</div>}
                {profileSuccess && <div style={{ color: 'var(--secondary)', fontSize: '0.8rem', textShadow: '0 0 2px var(--secondary-glow)', marginBottom: '0.5rem' }}>{profileSuccess}</div>}

                <form onSubmit={handleAddWhitelistEmail} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="Add friend's email to Whitelist..."
                    value={profileWhitelistInput}
                    onChange={(e) => setProfileWhitelistInput(e.target.value)}
                    required
                    disabled={profileLoading}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.45rem 1rem' }} disabled={profileLoading}>
                    Whitelist
                  </button>
                </form>

                <h4 style={{ textTransform: 'uppercase', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Whitelisted Pilots ({profileWhitelist.length})
                </h4>
                {profileWhitelist.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Your Whitelist is empty. Nobody can see your private notes automatically.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '140px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    {profileWhitelist.map(email => (
                      <div key={email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.5rem', borderRadius: '2px', fontSize: '0.8rem' }}>
                        <span style={{ fontFamily: 'monospace' }}>{email}</span>
                        <button 
                          type="button" 
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem' }} 
                          onClick={() => handleRemoveWhitelistEmail(email)}
                          disabled={profileLoading}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { playCyberSound('click'); setIsProfileOpen(false); }}
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
