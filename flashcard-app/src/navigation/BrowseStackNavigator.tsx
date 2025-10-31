// Browse stack navigation component

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BrowseStackParamList } from './types';
import SearchScreen from '../screens/SearchScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';

const Stack = createNativeStackNavigator<BrowseStackParamList>();

export default function BrowseStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Search"
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
        name="Search"
        component={SearchScreen}
        options={{
          title: '検索',
        }}
      />
      <Stack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={({ route }) => ({
          title: `"${route.params.query}" の検索結果`,
        })}
      />
    </Stack.Navigator>
  );
}