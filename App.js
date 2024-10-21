import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import BucketListScreen from './screens/BucketListScreen';
import FolderListScreen from './screens/FolderListScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}}/>
        <Stack.Screen name="BucketList" component={BucketListScreen} />
        <Stack.Screen name="FolderList" component={FolderListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
