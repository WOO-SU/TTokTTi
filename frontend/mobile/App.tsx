import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import MainHomeScreen from './src/screens/MainHomeScreen';
import SelectModeScreen from './src/screens/SelectModeScreen';
import CameraScreen from './src/screens/CameraScreen';
import SafetyEquipmentCheckScreen from './src/screens/SafetyEquipmentCheckScreen';
import EquipmentCameraScreen from './src/screens/EquipmentCameraScreen';
import RiskAssessmentScreen from './src/screens/RiskAssessmentScreen';
import RiskCheckScreen from './src/screens/RiskCheckScreen';
import RiskResultScreen from './src/screens/RiskResultScreen';
import RiskCameraScreen from './src/screens/RiskCameraScreen';
import PersonalScreen from './src/screens/PersonalScreen';
import SettingScreen from './src/screens/SettingScreen';
import EndWorkScreen from './src/screens/EndWorkScreen';
import FavoriteScreen from './src/screens/FavoriteScreen';
import { AuthProvider } from './src/context/AuthContext';
import { RiskPhotoProvider } from './src/context/RiskPhotoContext';
import { WorkSessionProvider } from './src/context/WorkSessionContext';

// --- Types ---

export type HomeStackParamList = {
  MainHome: undefined;
  WorkMenu: { worksession_id: number };
  SelectMode: undefined;
  SafetyEquipmentCheck: { worksession_id: number; completedTitle?: string };
  EquipmentCamera: { title: string; worksession_id: number };
  RiskAssessment: { worksession_id: number };
  RiskCheck: { worksession_id: number; assessmentId?: number; completedTitle?: string };
  RiskResult: { assessment_id: number; worksession_id: number };
  RiskCamera: { title: string; worksession_id: number; assessmentId?: number };
  CaptureWork: { worksession_id: number };
  EndWork: undefined;
};

export type PersonalStackParamList = {
  PersonalHome: undefined;
  ChangePassword: undefined;
};

export type SettingStackParamList = {
  SettingHome: undefined;
};

export type FavoriteStackParamList = {
  FavoriteHome: undefined;
};

export type TabParamList = {
  Home: undefined;
  Personal: undefined;
  Favorite: undefined;
  Setting: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined; // The Tab Navigator
  Camera: { mode: 'all' | 'worker' }; // Full screen modal
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const PersonalStack = createNativeStackNavigator<PersonalStackParamList>();
const FavoriteStack = createNativeStackNavigator<FavoriteStackParamList>();
const SettingStack = createNativeStackNavigator<SettingStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// --- Stack Navigators ---

import CaptureWorkScreen from './src/screens/CaptureWorkScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="MainHome" component={MainHomeScreen} />
      <HomeStack.Screen name="WorkMenu" component={HomeScreen} />
      <HomeStack.Screen name="SelectMode" component={SelectModeScreen} />
      <HomeStack.Screen name="SafetyEquipmentCheck" component={SafetyEquipmentCheckScreen} />
      <HomeStack.Screen name="EquipmentCamera" component={EquipmentCameraScreen} />
      <HomeStack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
      <HomeStack.Screen name="RiskCheck" component={RiskCheckScreen} />
      <HomeStack.Screen name="RiskResult" component={RiskResultScreen} />
      <HomeStack.Screen name="RiskCamera" component={RiskCameraScreen} />
      <HomeStack.Screen name="CaptureWork" component={CaptureWorkScreen} />
      <HomeStack.Screen name="EndWork" component={EndWorkScreen} />
    </HomeStack.Navigator>
  );
}

function PersonalStackNavigator() {
  return (
    <PersonalStack.Navigator screenOptions={{ headerShown: false }}>
      <PersonalStack.Screen name="PersonalHome" component={PersonalScreen} />
      <PersonalStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </PersonalStack.Navigator>
  );
}

function FavoriteStackNavigator() {
  return (
    <FavoriteStack.Navigator screenOptions={{ headerShown: false }}>
      <FavoriteStack.Screen name="FavoriteHome" component={FavoriteScreen} />
    </FavoriteStack.Navigator>
  );
}

function SettingStackNavigator() {
  return (
    <SettingStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingStack.Screen name="SettingHome" component={SettingScreen} />
    </SettingStack.Navigator>
  );
}

// --- Bottom Tab Navigator ---

function HomeTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <View style={[tabIconStyles.homeRoof, { borderBottomColor: color }]} />
      <View style={[tabIconStyles.homeBase, { borderColor: color }]} />
    </View>
  );
}

function PersonTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <View style={[tabIconStyles.personHead, { borderColor: color }]} />
      <View style={[tabIconStyles.personBody, { borderColor: color }]} />
    </View>
  );
}

function StarTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <Text style={[tabIconStyles.starText, { color }]}>☆</Text>
    </View>
  );
}

function SettingTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <Text style={[tabIconStyles.gearText, { color }]}>⚙</Text>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 0,
  },
  homeBase: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  personHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    position: 'absolute',
    top: 0,
  },
  personBody: {
    width: 14,
    height: 8,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    position: 'absolute',
    bottom: 0,
  },
  starText: {
    fontSize: 20,
    lineHeight: 22,
  },
  gearText: {
    fontSize: 18,
    lineHeight: 20,
  },
});

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          paddingHorizontal: 16,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 10,
          marginTop: 4,
        },
        tabBarActiveTintColor: '#1F2024',
        tabBarInactiveTintColor: '#71727A',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'MainHome';
          const hiddenRoutes = [
            'EquipmentCamera',
            'RiskCamera',
            'CaptureWork',
            'EndWork',
          ];
          const display = hiddenRoutes.includes(routeName) ? 'none' : 'flex';

          return {
            tabBarStyle: {
              display,
              height: 60 + insets.bottom,
              paddingTop: 8,
              paddingBottom: insets.bottom,
              paddingHorizontal: 16,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarIcon: ({ focused }) => <HomeTabIcon focused={focused} />,
            tabBarLabelStyle: {
              fontFamily: 'Inter',
              fontWeight: '600',
              fontSize: 10,
              marginTop: 4,
            },
          };
        }}
      />
      <Tab.Screen
        name="Personal"
        component={PersonalStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <PersonTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Favorite"
        component={FavoriteStackNavigator}
        options={{
          tabBarLabel: 'favorite',
          tabBarIcon: ({ focused }) => <StarTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <SettingTabIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// --- App Root ---

function App() {
  return (
    <AuthProvider>
      <WorkSessionProvider>
        <RiskPhotoProvider>
          <SafeAreaProvider>
            <NavigationContainer>
              <RootStack.Navigator
                initialRouteName="Login"
                screenOptions={{ headerShown: false }}>
                <RootStack.Screen name="Login" component={LoginScreen} />
                <RootStack.Screen name="SignUp" component={SignUpScreen} />
                <RootStack.Screen name="Main" component={MainTabs} />
                <RootStack.Screen name="Camera" component={CameraScreen} />
              </RootStack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </RiskPhotoProvider>
      </WorkSessionProvider>
    </AuthProvider>
  );
}

export default App;
