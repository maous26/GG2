import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Simple debug component to test if React is working
const DebugApp: React.FC = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'blue' }}>Debug: React is Working!</h1>
      <p>If you can see this, React is rendering correctly.</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <DebugApp />
  </React.StrictMode>
);
