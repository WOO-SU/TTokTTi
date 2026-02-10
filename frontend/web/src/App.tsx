import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SignUpScreen from './screens/SignUpScreen';
import SignUpFreeScreen from './screens/SignUpFreeScreen';
import HomeScreen from './screens/HomeScreen';
// Import the new screen
import SafetyRegulationScreen from './screens/SafetyRegulationScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/signup" element={<SignUpScreen />} />
        <Route path="/signup-free" element={<SignUpFreeScreen />} />
        <Route path="/home" element={<HomeScreen />} />
        
        {/* Added connection to the Safety Regulation Screen */}
        <Route path="/safety" element={<SafetyRegulationScreen />} />
        
        {/* Default redirect to login for any unknown paths */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}