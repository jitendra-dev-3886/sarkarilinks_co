import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import './styles.css';
import './experience.css';
import './saas.css';
import './readability.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <main><h1>Something went wrong</h1><a href="/">Return to home</a></main> : this.props.children; }
}
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });
createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><QueryClientProvider client={client}><BrowserRouter><App /></BrowserRouter></QueryClientProvider></ErrorBoundary></React.StrictMode>,
);
