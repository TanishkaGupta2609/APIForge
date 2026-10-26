import { RouterProvider } from 'react-router-dom';
import router from './app/router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
