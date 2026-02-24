import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  ChangePassword: undefined;
};

export type TabParamList = {
  Personal: undefined;
  Home: undefined;
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

function SettingStackNavigator() {
  return (
    <SettingStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingStack.Screen name="SettingHome" component={SettingScreen} />
      <SettingStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </SettingStack.Navigator>
  );
}

// --- Bottom Tab Navigator ---

/* ──────── Custom Tab Icons ──────── */

function ActiveDot() {
  return <View style={tabIconStyles.activeDot} />;
}

function HomeTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#006FFD' : '#71727A';
  return (
    <View style={tabIconStyles.iconWrapper}>
      <View style={tabIconStyles.container}>
        <View style={[tabIconStyles.homeRoof, { borderBottomColor: color }]} />
        <View style={[tabIconStyles.homeBase, { borderColor: color }]} />
      </View>
    </View>
  );
}

function PersonTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#006FFD' : '#71727A';
  return (
    <View style={tabIconStyles.iconWrapper}>
      <View style={tabIconStyles.container}>
        <View style={[tabIconStyles.personHead, { borderColor: color }]} />
        <View style={[tabIconStyles.personBody, { borderColor: color }]} />
      </View>
    </View>
  );
}

function SettingTabIcon({ focused }: { focused: boolean }) {
  const color = focused ? '#006FFD' : '#71727A';
  return (
    <View style={tabIconStyles.iconWrapper}>
      <View style={tabIconStyles.container}>
        <View style={[tabIconStyles.gearCircle, { borderColor: color }]}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
            <View key={deg} style={[tabIconStyles.gearTooth, { backgroundColor: color, transform: [{ rotate: `${deg}deg` }, { translateY: -8 }] }]} />
          ))}
          <View style={[tabIconStyles.gearInner, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  container: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#006FFD',
  },
  /* Home icon */
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: 2,
  },
  homeBase: {
    width: 15,
    height: 11,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    position: 'absolute',
    bottom: 3,
  },
  /* Person icon */
  personHead: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    position: 'absolute',
    top: 2,
  },
  personBody: {
    width: 16,
    height: 9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    position: 'absolute',
    bottom: 2,
  },
  /* Gear icon (simplified custom) */
  gearCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gearTooth: {
    width: 3.5,
    height: 4,
    borderRadius: 1,
    position: 'absolute',
  },
  gearInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

/* ──────── Custom Floating Tab Bar ──────── */

function FloatingTabBar({ state, descriptors, navigation, insets }: any) {
  const MARGIN_H = 16;
  const HEIGHT = 64;

  // Check if tab bar should be hidden (e.g. on camera screens)
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const tabBarStyle = focusedOptions?.tabBarStyle;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: insets.bottom + 8,
        left: MARGIN_H,
        right: MARGIN_H,
        height: HEIGHT,
        borderRadius: HEIGHT / 2,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        // iOS Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        // Android
        elevation: 10,
        overflow: 'visible',
      }}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const iconColor = isFocused ? '#006FFD' : '#71727A';
        const labelColor = isFocused ? '#006FFD' : '#71727A';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const IconComponent = options.tabBarIcon;

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.7}
            onPress={onPress}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <View style={{ alignItems: 'center', gap: 3 }}>
              {IconComponent ? <IconComponent focused={isFocused} color={iconColor} size={24} /> : null}
              <Text style={{
                fontSize: 10,
                fontWeight: '600',
                color: labelColor,
                textAlign: 'center',
              }}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();

  const baseTabBarStyle: any = {};

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <FloatingTabBar {...props} insets={insets} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#006FFD',
        tabBarInactiveTintColor: '#71727A',
      }}>
      <Tab.Screen
        name="Personal"
        component={PersonalStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <PersonTabIcon focused={focused} />,
          tabBarLabel: '마이',
        }}
      />
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
          const isHidden = hiddenRoutes.includes(routeName);

          return {
            tabBarStyle: isHidden ? { display: 'none' } : baseTabBarStyle,
            tabBarIcon: ({ focused }) => <HomeTabIcon focused={focused} />,
            tabBarLabel: '홈',
          };
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => <SettingTabIcon focused={focused} />,
          tabBarLabel: '설정',
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
