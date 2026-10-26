import { RouterProvider } from 'react-router-dom';
import router from './app/router.jsx';

export function App() {
  return <RouterProvider router={router} />;
}

export default App;
