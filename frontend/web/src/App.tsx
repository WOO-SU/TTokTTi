import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SignUpScreen from './screens/SignUpScreen';
import SignUpFreeScreen from './screens/SignUpFreeScreen';
import HomeScreen from './screens/HomeScreen';
import SafetyRegulationScreen from './screens/SafetyRegulationScreen';
import ReportScreen from './screens/ReportScreen';
import ProfileScreen from './screens/ProfileScreen';
import EmployeeDetailScreen from './screens/EmployeeDetailScreen';
import WorkerRiskScreen from './screens/WorkerRiskScreen';

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
          <Route path="/safety" element={<ProtectedRoute><SafetyRegulationScreen /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/risk" element={<ProtectedRoute><WorkerRiskScreen /></ProtectedRoute>} />
          <Route path="/employee/:id" element={<ProtectedRoute><EmployeeDetailScreen /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
