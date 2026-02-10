import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import SelectModeScreen from './src/screens/SelectModeScreen';
import CameraScreen from './src/screens/CameraScreen';
import RiskAssessmentScreen from './src/screens/RiskAssessmentScreen';
import EquipmentCameraScreen from './src/screens/EquipmentCameraScreen';
import PersonalScreen from './src/screens/PersonalScreen';
import SettingScreen from './src/screens/SettingScreen';
import {AuthProvider} from './src/context/AuthContext';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  SelectMode: undefined;
  Camera: {mode: 'all' | 'worker'};
  RiskAssessment: undefined;
  EquipmentCamera: {title: string};
};

export type TabParamList = {
  Home: undefined;
  Personal: undefined;
  Favorite: undefined;
  Setting: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/* ──────── Placeholder Screens ──────── */

function PlaceholderScreen({title}: {title: string}) {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>{title}</Text>
    </View>
  );
}


function FavoriteScreen() {
  return <PlaceholderScreen title="Favorite" />;
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2024',
  },
});

/* ──────── Tab Icon Components ──────── */

function HomeTabIcon({focused}: {focused: boolean}) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <View style={[tabIconStyles.homeRoof, {borderBottomColor: color}]} />
      <View style={[tabIconStyles.homeBase, {borderColor: color}]} />
    </View>
  );
}

function PersonTabIcon({focused}: {focused: boolean}) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <View style={[tabIconStyles.personHead, {borderColor: color}]} />
      <View style={[tabIconStyles.personBody, {borderColor: color}]} />
    </View>
  );
}

function StarTabIcon({focused}: {focused: boolean}) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <Text style={[tabIconStyles.starText, {color}]}>☆</Text>
    </View>
  );
}

function SettingTabIcon({focused}: {focused: boolean}) {
  const color = focused ? '#1F2024' : '#71727A';
  return (
    <View style={tabIconStyles.container}>
      <Text style={[tabIconStyles.gearText, {color}]}>⚙</Text>
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

/* ──────── Bottom Tab Navigator ──────── */

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 88,
          paddingTop: 16,
          paddingBottom: 32,
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
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused}) => <HomeTabIcon focused={focused} />,
          tabBarLabelStyle: {
            fontFamily: 'Inter',
            fontWeight: '600',
            fontSize: 10,
            marginTop: 4,
          },
        }}
      />
      <Tab.Screen
        name="Personal"
        component={PersonalScreen}
        options={{
          tabBarIcon: ({focused}) => <PersonTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Favorite"
        component={FavoriteScreen}
        options={{
          tabBarLabel: 'favorite',
          tabBarIcon: ({focused}) => <StarTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          tabBarIcon: ({focused}) => <SettingTabIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

/* ──────── App Root ──────── */

function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{headerShown: false}}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="SelectMode" component={SelectModeScreen} />
            <Stack.Screen name="Camera" component={CameraScreen} />
            <Stack.Screen name="RiskAssessment" component={RiskAssessmentScreen} />
            <Stack.Screen name="EquipmentCamera" component={EquipmentCameraScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

export default App;
