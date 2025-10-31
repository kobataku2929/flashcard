// Home stack navigation component

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { HomeStackParamList } from './types';
import FolderViewScreen from '../screens/FolderViewScreen';
import CardDetailScreen from '../screens/CardDetailScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const navigation = useNavigation();

  return (
    <Stack.Navigator
      initialRouteName="FolderView"
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
        name="FolderView"
        component={FolderViewScreen}
        options={({ route }) => ({
          title: route.params?.folderId ? 'フォルダ' : 'ホーム',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings' as never)}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={{
          title: 'カード詳細',
        }}
      />
    </Stack.Navigator>
  );
}