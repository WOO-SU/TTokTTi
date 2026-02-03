import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import StatusDetailScreen from './src/screens/StatusDetailScreen';

// ── Tab Icon Components ──

function HomeIcon({color}: {color: string}) {
  return (
    <View style={{width: 20, height: 20, justifyContent: 'center', alignItems: 'center'}}>
      <View
        style={{
          width: 16,
          height: 10,
          borderWidth: 2,
          borderColor: color,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          position: 'absolute',
          bottom: 0,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 10,
          borderRightWidth: 10,
          borderBottomWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          position: 'absolute',
          top: 1,
        }}
      />
    </View>
  );
}

function PersonIcon({color}: {color: string}) {
  return (
    <View style={{width: 20, height: 20, justifyContent: 'center', alignItems: 'center'}}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: color,
          marginBottom: 1,
        }}
      />
      <View
        style={{
          width: 14,
          height: 6,
          borderTopLeftRadius: 7,
          borderTopRightRadius: 7,
          borderWidth: 1.5,
          borderColor: color,
          borderBottomWidth: 0,
        }}
      />
    </View>
  );
}

function StarIcon({color}: {color: string}) {
  return (
    <View style={{width: 20, height: 20, justifyContent: 'center', alignItems: 'center'}}>
      <Text style={{fontSize: 16, color}}>☆</Text>
    </View>
  );
}

function SettingIcon({color}: {color: string}) {
  return (
    <View style={{width: 20, height: 20, justifyContent: 'center', alignItems: 'center'}}>
      <View
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: color,
          position: 'absolute',
        }}
      />
    </View>
  );
}

// ── Placeholder Screens ──

function PlaceholderScreen({title}: {title: string}) {
  return (
    <View style={phStyles.container}>
      <Text style={phStyles.text}>{title}</Text>
    </View>
  );
}

const phStyles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF'},
  text: {fontSize: 18, color: '#1F2024', fontWeight: '600'},
});

function PersonalScreen() {
  return <PlaceholderScreen title="Personal" />;
}
function FavoriteScreen() {
  return <PlaceholderScreen title="Favorite" />;
}
function SettingScreen() {
  return <PlaceholderScreen title="Setting" />;
}

// ── Navigation ──

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  StatusDetail: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#006FFD',
        tabBarInactiveTintColor: '#8F9098',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#E0E0E0',
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({color}) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Personal"
        component={PersonalScreen}
        options={{
          tabBarIcon: ({color}) => <PersonIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Favorite"
        component={FavoriteScreen}
        options={{
          tabBarIcon: ({color}) => <StarIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          tabBarIcon: ({color}) => <SettingIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{headerShown: false}}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="StatusDetail" component={StatusDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
