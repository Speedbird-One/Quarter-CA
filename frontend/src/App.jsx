import React, { useState, useRef, useEffect, useMemo } from "react";

// --- Main App Component ---
// This component now manages all state and renders the
// persistent sidebar and main content area.
//
// --- CHANGELOG (User Request 19 - Logout Button) ---
// 1. Removed "Sign In" from Sidebar Nav: The main navigation list no longer
//    shows the "Sign In" option.
// 2. Added Conditional Logout Button: A "Logout" button now appears at the
//    bottom of the sidebar *only* when `isAuthenticated` is true.
// 3. Implemented Logout Functionality: Added `handleLogout` function in `App`
//    to reset state (`isAuthenticated`, `jobId`, `result`, `currentView`)
//    and passed it down to the `Sidebar` component.
// ---

export default function App() {
  // --- Core State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [dark, setDark] = useState(true);
  const [currentView, setCurrentView] = useState("signin"); // 'signin', 'upload', 'analysis', 'benchmark', 'whatif'

  // --- State Lifted from DashboardPage ---
  const [status, setStatus] = useState("idle"); // idle, analyzing, done, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // --- Event Handlers (passed down) ---

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setCurrentView("upload");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setJobId(null);
    setResult(null);
    setStatus("idle");
    setCurrentView("signin");
  };

  const handleAnalysisStart = () => {
    setStatus("analyzing");
    setError(null);
    setResult(null);
    setProgress(0); // Reset progress
    setCurrentView("analysis"); // Switch view to analysis page
  };

  const handleAnalysisComplete = (data) => {
    setResult(data);
    setStatus("done");
    setProgress(100);
    // Keep view on 'analysis'
  };

  const handleAnalysisError = (errorMessage) => {
    setError(errorMessage);
    setStatus("error");
    // Keep view on 'analysis'
  };
  
  const handleNavClick = (view) => {
    if (view === 'upload') {
      // Reset state if user clicks "New Analysis"
      setStatus("idle");
      setResult(null);
      setError(null);
      setJobId(null);
    }
    // Allow navigation to analysis only if there is a result or error
    if (view === 'analysis' && status === 'idle') {
      return; // Don't navigate to empty dashboard
    }
    setCurrentView(view);
  };

  // --- Main Render Logic ---

  const renderView = () => {
    switch (currentView) {
      case "signin":
        return <SignInPage onLoginSuccess={handleLoginSuccess} />;
      case "upload":
        return (
          <FileUploadPage
            onAnalyzeStart={handleAnalysisStart}
            onAnalyzeComplete={handleAnalysisComplete}
            onError={handleAnalysisError}
          />
        );
      case "analysis":
        return (
          <DashboardPage
            status={status}
            result={result}
            error={error}
            progress={progress}
          />
        );
      case "benchmark":
        return <PlaceholderPage title="Benchmark Analysis" />;
      case "whatif":
        return <PlaceholderPage title="What-If Scenarios" />;
      default:
        return <SignInPage onLoginSuccess={handleLoginSuccess} />;
    }
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex h-screen w-full bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        {/* Sidebar */}
        {isAuthenticated && (
          <Sidebar 
            currentView={currentView} 
            onNavClick={handleNavClick} 
            onLogout={handleLogout}
            analysisActive={status !== 'idle'} // Used to enable dashboard nav
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <Header 
            onToggleDark={() => setDark(!dark)} 
            isDark={dark}
            isAuthenticated={isAuthenticated}
          />
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Components ---

function Header({ onToggleDark, isDark, isAuthenticated }) {
  // A simple header bar, only shows toggle if logged in
  if (!isAuthenticated) return null;
  
  return (
    <header className="flex-shrink-0 bg-white dark:bg-gray-800 h-16 shadow-md flex items-center justify-end px-8">
      <button onClick={onToggleDark} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
        {isDark ? <IconSun /> : <IconMoon />}
      </button>
    </header>
  );
}


function Sidebar({ currentView, onNavClick, onLogout, analysisActive }) {
  const navItems = [
    { id: "upload", name: "New Analysis", icon: IconUpload, disabled: false },
    { id: "analysis", name: "Dashboard", icon: IconChart, disabled: !analysisActive },
    { id: "benchmark", name: "Benchmark", icon: IconScale, disabled: false },
    { id: "whatif", name: "What-If", icon: IconWand, disabled: false },
  ];

  return (
    <aside className="w-16 md:w-64 bg-white dark:bg-gray-800 flex flex-col shadow-lg">
      <div className="flex items-center justify-center h-16 shadow-md flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          <span className="hidden md:inline">Quarter CA</span>
          <span className="md:hidden">FA</span>
        </h1>
      </div>
      <nav className="flex-1 mt-4 overflow-y-auto">
        <ul>
          {navItems.map((item) => (
            <SidebarItem
              key={item.id}
              text={item.name}
              Icon={item.icon}
              active={currentView === item.id}
              disabled={item.disabled}
              onClick={() => onNavClick(item.id)}
            />
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center md:justify-start p-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <div className="w-6 h-6"><IconLogout /></div>
          <span className="hidden md:inline ml-4">Logout</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({ Icon, text, active, disabled, onClick }) {
  return (
    <li className="my-1 px-4">
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
        className={`flex items-center justify-center md:justify-start p-3 rounded-lg
          ${active
            ? "bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300"
            : disabled
            ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
      >
        <div className="w-6 h-6"><Icon /></div>
        <span className="hidden md:inline ml-4">{text}</span>
      </a>
    </li>
  );
}

// --- MODIFIED SIGN IN PAGE ---
function SignInPage({ onLoginSuccess }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
        <h2 className="text-3xl font-bold text-center">Welcome Back</h2>
        <p className="text-center text-gray-600 dark:text-gray-400">Sign in to access your financial dashboard.</p>
        
        {/* NEW: Username and Password fields */}
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLoginSuccess(); }}>
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Username
            </label>
            <div className="mt-1">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Your username"
              />
            </div>
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <button
            type="submit" // Button triggers form onSubmit
            className="w-full px-4 py-3 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Sign In (Demo)
          </button>
        </form>
        {/* END NEW FIELDS */}

      </div>
    </div>
  );
}
// --- END OF MODIFICATION ---

// --- MODIFIED FILE UPLOAD PAGE ---
function FileUploadPage({ onAnalyzeStart, onAnalyzeComplete, onError }) {
  // State to hold multiple files
  const [files, setFiles] = useState([]); // Use an array for multiple files
  const [isDrag, setIsDrag] = useState(false);
  
  // --- REMOVED: fiscalYear state and years useMemo ---
  const fileInputRef = useRef(null);

  const resetFiles = () => {
    setFiles([]); // Clear the array
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // Clear the input
    }
  };

  const handleRemoveFile = (nameToRemove) => {
    setFiles(prevFiles => prevFiles.filter(f => f.name !== nameToRemove));
    // If we remove the last file, clear the input ref
    if (files.length === 1) {
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    
    if (files.length + newFiles.length > 5) {
      onError("You can upload a maximum of 5 files.");
      return;
    }
    
    const validFiles = newFiles.filter(f => 
      f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    if (validFiles.length !== newFiles.length) {
      onError("Invalid file type. Only .xlsx files are accepted.");
    }
    
    // Add only valid files, avoiding duplicates by name
    setFiles(prevFiles => [
      ...prevFiles, 
      ...validFiles.filter(vf => !prevFiles.some(pf => pf.name === vf.name))
    ]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDrag(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDrag(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDrag(false);
    const newFiles = Array.from(e.dataTransfer.files);
    
    if (files.length + newFiles.length > 5) {
      onError("You can upload a maximum of 5 files.");
      return;
    }
    
    const validFiles = newFiles.filter(f => 
      f.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    if (validFiles.length !== newFiles.length) {
      onError("Invalid file type. Only .xlsx files are accepted.");
    }
    
    // Add only valid files, avoiding duplicates by name
    setFiles(prevFiles => [
      ...prevFiles, 
      ...validFiles.filter(vf => !prevFiles.some(pf => pf.name === vf.name))
    ]);
  };

  // --- MODIFIED: To send only files ---
  const handleSubmit = async () => {
    if (files.length === 0) {
      onError("Please select at least one .xlsx file.");
      return;
    }
    
    // --- REMOVED: Fiscal year validation ---

    onAnalyzeStart(); // Tell App component to start analysis

    const formData = new FormData();
    // Append each file with the same key 'file'
    files.forEach((f) => {
      formData.append("file", f);
    });
    // --- REMOVED: formData.append("fiscalYear", ...) ---

    try {
      // Connect to the Flask backend
      const response = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        body: formData,
        // No 'Content-Type' header needed; browser sets it
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle HTTP errors (e.g., 400, 500)
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      // Handle business logic errors
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Success!
      onAnalyzeComplete(data);

    } catch (e) {
      console.error("Analysis failed:", e);
      onError(e.message);
    }
  };


  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Start a New Analysis</h2>
      <div
        className={`relative w-full p-8 border-4 border-dashed rounded-lg text-center transition-colors
          ${isDrag ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900" :
            "border-gray-300 dark:border-gray-600"}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="w-24 h-24 mx-auto text-gray-400 dark:text-gray-500">
          <IconCloudUpload />
        </div>

        {/* --- MODIFIED: Show list of files or "No files" message --- */}
        {files.length === 0 ? (
          <>
            <p className="mt-4 text-xl font-semibold">No files chosen</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Drag & drop your .xlsx file(s) here (Up to 5)
            </p>
          </>
        ) : (
          <div className="mt-4 w-full max-w-md mx-auto">
            <p className="text-lg font-semibold mb-2">Selected Files:</p>
            <ul className="text-left space-y-1">
              {files.map(f => (
                <li key={f.name} className="flex justify-between items-center text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <span className="truncate" title={f.name}>{f.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRemoveFile(f.name); }} 
                    className="p-1 ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                    title="Remove file"
                  >
                    <IconX />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* --- END OF FILE LIST --- */}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          // --- MODIFIED: Accept only .xlsx ---
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple // --- ADDED: Allow multiple file selection ---
        />
        <p className="my-4 text-gray-400 dark:text-gray-500">- or -</p>
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          className="px-6 py-2 font-medium text-indigo-600 bg-indigo-100 rounded-lg dark:bg-indigo-800 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-700"
        >
          Browse Files
        </button>
        
        {/* --- MODIFIED: Button clears all files --- */}
        {files.length > 0 && (
          <button
            onClick={resetFiles}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-500"
            title="Remove all files"
          >
            <IconX />
          </button>
        )}
      </div>

      {/* --- REMOVED: FISCAL YEAR DROPDOWN --- */}
      
      <button
        onClick={handleSubmit}
        // --- MODIFIED: Disable if no files ---
        disabled={files.length === 0}
        className="mt-8 px-10 py-4 text-lg font-bold text-white bg-indigo-600 rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        Analyze Now
      </button>
    </div>
  );
}
// --- END OF MODIFICATION ---

function DashboardPage({ status, result, error, progress }) {
  if (status === "analyzing") {
    return <AnalysisLoading progress={progress} />;
  }
  if (status === "error") {
    return <AnalysisError error={error} />;
  }
  if (status === "done" && result) {
    return <AnalysisResult result={result} />;
  }
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Welcome</h2>
        <p className="text-gray-500 dark:text-gray-400">Please upload a file to begin a new analysis.</p>
      </div>
    </div>
  );
}

function AnalysisLoading({ progress }) {
  const [fakeProgress, setFakeProgress] = useState(0);

  useEffect(() => {
    // Simulate progress
    if (fakeProgress < 90) {
      const timer = setTimeout(() => {
        setFakeProgress(p => p + Math.random() * 10);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [fakeProgress]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-32 h-32 relative">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="10"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
          />
          <circle
            className="text-indigo-600 dark:text-indigo-500"
            strokeWidth="10"
            strokeDasharray="251.2"
            strokeDashoffset={`calc(251.2 - (251.2 * ${fakeProgress}) / 100)`}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="40"
            cx="50"
            cy="50"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          />
        </svg>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold">
          {Math.min(Math.floor(fakeProgress), 100)}%
        </span>
      </div>
      <p className="mt-4 text-xl">Analyzing your financials...</p>
      <p className="text-gray-500 dark:text-gray-400">This may take a moment.</p>
    </div>
  );
}

function AnalysisError({ error }) {
  return (
    <div className="p-8 max-w-2xl mx-auto bg-red-100 dark:bg-red-800 border border-red-400 dark:border-red-700 rounded-lg text-center">
      <div className="w-16 h-16 mx-auto text-red-600 dark:text-red-300"><IconAlert /></div>
      <h2 className="text-3xl font-bold text-red-800 dark:text-red-200 mt-4">Analysis Failed</h2>
      <p className="mt-4 text-lg text-red-700 dark:text-red-300">
        An error occurred:
      </p>
      <pre className="mt-2 p-4 bg-white dark:bg-gray-700 rounded text-left text-sm text-red-600 dark:text-red-200 whitespace-pre-wrap">
        {error}
      </pre>
    </div>
  );
}

function AnalysisResult({ result }) {
  return (
    <div className="max-w-7xl mx-auto">
      {/* --- NEW: Show the auto-detected fiscal year --- */}
      <h2 className="text-3xl font-bold mb-2">Analysis Dashboard</h2>
      {result.detected_fiscal_year && (
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Showing analysis for latest detected fiscal year: <strong>{result.detected_fiscal_year}</strong>
        </p>
      )}
      {/* --- END NEW --- */}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Overall Score */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col items-center justify-center">
            <h3 className="text-xl font-semibold mb-2">Overall Score</h3>
            <p className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">
              {result.overall_score ? result.overall_score.toFixed(2) : 'N/A'}
              <span className="text-3xl text-gray-500">/100</span>
            </p>
        </div>
        
        {/* Sub-Scores */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Component Scores</h3>
           <ul className="space-y-3">
            {result.sub_scores ? Object.entries(result.sub_scores).map(([key, value]) => (
              <li key={key} className="flex justify-between items-center py-1">
                <span className="font-medium">{key}:</span>
                <span className="text-lg font-bold">{value.toFixed(2)}</span>
              </li>
            )) : <li>No scores available.</li>}
          </ul>
        </div>

        {/* Ratios */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Key Ratios (for {result.detected_fiscal_year || 'N/A'})</h3>
          <ul className="space-y-2">
            {result.ratios ? Object.entries(result.ratios).map(([key, value]) => (
              <li key={key} className="flex justify-between py-1 border-b dark:border-gray-700">
                <span>{key}:</span>
                <span className="font-medium">{value.toFixed(2)}</span>
              </li>
            )) : <li>No ratios available.</li>}
          </ul>
        </div>
        
        {/* Trends */}
        <div className="lg:col-span-3 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Trend Data</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="py-2 pr-4">Metric</th>
                  {/* Dynamically create headers from the first trend item */}
                  {result.trends && result.trends.length > 0 &&
                    Object.keys(result.trends[0]).filter(k => k !== 'Metric').map(year => (
                      <th key={year} className="py-2 px-4 text-right">{year}</th>
                    ))
                  }
                </tr>
              </thead>
              <tbody>
                {result.trends && result.trends.length > 0 ? (
                  result.trends.map((row, index) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="py-2 pr-4 font-medium">{row.Metric}</td>
                      {Object.keys(row).filter(k => k !== 'Metric').map(year => (
                        <td key={year} className="py-2 px-4 text-right font-mono">
                          {typeof row[year] === 'number' ? row[year].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : row[year]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="py-4 text-center">No trend data available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        
        {/* AI Insights */}
        <div className="lg:col-span-3 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">🤖 AI-Powered Suggestions</h3>
          <AiInsights text={result.ai_insights} />
        </div>

      </div>
    </div>
  );
}

// --- HELPER FUNCTIONS FOR MARKDOWN RENDERING ---

// Helper function to parse **bold** text within a line
function parseBold(line, lineKey) {
  const parts = line.split('**');
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      // Render odd parts as <strong>
      <strong key={`${lineKey}-${i}`}>{part}</strong>
    ) : (
      // Render even parts as regular text
      <span key={`${lineKey}-${i}`}>{part}</span>
    )
  );
}

// Helper component to render the AI insights with simple markdown
function AiInsights({ text }) {
  if (!text) {
    // Changed from text-sm to text-base
    return <p className="text-base">No insights generated.</p>;
  }

  const lines = text.split('\n');

  return (
    // Changed from text-sm to text-base. Controls base text size.
    <div className="text-base space-y-3">
      {lines.map((line, i) => {
        
        // Handle Sub-Headings
        if (line.startsWith('#### ')) {
          const content = parseBold(line.substring(5), i); // Get text after '#### '
          return (
            // Changed from text-md to text-lg
            <h5 key={i} className="text-lg font-semibold pt-2">
              {content}
            </h5>
          );
        }

        // Handle Headings
        if (line.startsWith('### ')) {
          const content = parseBold(line.substring(4), i); // Get text after '### '
          return (
            // Changed from text-lg to text-xl
            <h4 key={i} className="text-xl font-semibold pt-2">
              {content}
            </h4>
          );
        }
        
        // Skip empty lines
        if (line.trim() === '') {
          return null;
        }

        // Handle regular paragraphs
        const content = parseBold(line, i);
        return (
          <p key={i}>
            {content}
          </p>
        );
      })}
    </div>
  );
}

// --- END OF HELPER FUNCTIONS ---


function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">This feature is coming soon.</p>
      </div>
    </div>
  );
}


// --- SVG Icons ---

function IconSun() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-15.66l-.707.707M4.05 19.95l-.707.707M21 12h-1M4 12H3m15.66 8.66l-.707-.707M4.05 4.05l-.707-.707M12 18a6 6 0 100-12 6 6 0 000 12z" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
function IconCloudUpload() {
  return (
    <svg className="w-full h-full" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
function IconScale() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0 0l-6 2m6-2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5m6 2v2a2 2 0 002 2h2a2 2 0 002-2V5m-6 2h.01M12 3v1m0 16v1" />
    </svg>
  );
}
function IconWand() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 17.657L19.778 19.778m-1.414-1.414L17.657 17.657m1.414-1.414L19.778 15.242m-1.414 1.414L17.657 17.657m-5.657-5.657L13.414 10.586m-1.414 1.414L10.586 13.414m1.414-1.414L13.414 10.586m-1.414 1.414L10.586 13.414M6.343 6.343L4.222 4.222m1.414 1.414L6.343 6.343m-1.414-1.414L4.222 8.464m1.414-1.414L6.343 6.343m5.657 5.657L10.586 10.586m1.414 1.414L13.414 13.414m-1.414-1.414L10.586 10.586m1.414 1.414L13.414 13.414" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
