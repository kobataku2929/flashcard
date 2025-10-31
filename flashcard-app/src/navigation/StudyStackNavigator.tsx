import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StudyStackParamList } from './types';

// Import screens
import StudyModeScreen from '../screens/StudyModeScreen';
import StudySessionScreen from '../screens/StudySessionScreen';
import StudyResultScreen from '../screens/StudyResultScreen';

const Stack = createNativeStackNavigator<StudyStackParamList>();

export default function StudyStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="StudyMode"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196F3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="StudyMode"
        component={StudyModeScreen}
        options={{
          title: '学習モード',
          headerBackTitle: '戻る',
        }}
      />
      <Stack.Screen
        name="StudySession"
        component={StudySessionScreen}
        options={{
          title: '学習中',
          headerBackTitle: '戻る',
          gestureEnabled: false, // Prevent swipe back during study
        }}
      />
      <Stack.Screen
        name="StudyResult"
        component={StudyResultScreen}
        options={{
          title: '学習結果',
          headerBackTitle: '戻る',
          gestureEnabled: false, // Prevent swipe back from results
        }}
      />
    </Stack.Navigator>
  );
}