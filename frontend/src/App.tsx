import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { useStore } from './store/useStore';

function App() {
  const fetchCountries = useStore((state) => state.fetchCountries);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  return <Layout />;
}

export default App;
