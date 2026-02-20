import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SignUpScreen from './screens/SignUpScreen';
import SignUpFreeScreen from './screens/SignUpFreeScreen';
import HomeScreen from './screens/HomeScreen';
import EquipmentCheckScreen from './screens/EquipmentCheckScreen';
import ReportScreen from './screens/ReportScreen';
import ProfileScreen from './screens/ProfileScreen';
import EmployeeDetailScreen from './screens/EmployeeDetailScreen';
import WorkerRiskScreen from './screens/WorkerRiskScreen';
import WorkSessionDetailScreen from './screens/WorkSessionDetailScreen';
import EmployeeListScreen from './screens/EmployeeListScreen';
import AlertLogScreen from './screens/AlertLogScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />
          <Route path="/signup-free" element={<SignUpFreeScreen />} />
          <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
          <Route path="/safety" element={<ProtectedRoute><EquipmentCheckScreen /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/risk" element={<ProtectedRoute><WorkerRiskScreen /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><EmployeeListScreen /></ProtectedRoute>} />
          <Route path="/employee/:id" element={<ProtectedRoute><EmployeeDetailScreen /></ProtectedRoute>} />
          <Route path="/worksession/:id" element={<ProtectedRoute><WorkSessionDetailScreen /></ProtectedRoute>} />
          <Route path="/alert-logs" element={<ProtectedRoute><AlertLogScreen /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
