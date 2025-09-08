import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Layout } from './a1/Layout';
const App = () => <Layout />;
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
