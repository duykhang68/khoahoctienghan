import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './editor-kit.css';
import './article.css';
import '../../../../src/styles/editorial-tokens.css';
import './studio.css';
createRoot(document.getElementById('root')).render(<App/>);
