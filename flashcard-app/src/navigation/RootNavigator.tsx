// Root navigation component

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';
import CardEditorScreen from '../screens/CardEditorScreen';
import ImportTSVScreen from '../screens/ImportTSVScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Main"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6366f1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="CardEditor"
          component={CardEditorScreen}
          options={({ route }) => ({
            title: route.params?.cardId ? 'カードを編集' : '新しいカード',
            presentation: 'modal',
          })}
        />
        <Stack.Screen
          name="ImportTSV"
          component={ImportTSVScreen}
          options={{
            title: 'TSVインポート',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: '設定',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}