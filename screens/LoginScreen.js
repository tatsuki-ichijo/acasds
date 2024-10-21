import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    // Check if credentials are already saved in AsyncStorage
    const checkStoredCredentials = async () => {
      try {
        const storedAccessKey = await AsyncStorage.getItem('accessKey');
        const storedSecretKey = await AsyncStorage.getItem('secretKey');

        if (storedAccessKey && storedSecretKey) {
          // If credentials are found, navigate directly to the BucketList
          navigation.navigate('BucketList', { accessKey: storedAccessKey, secretKey: storedSecretKey });
        }
      } catch (error) {
        console.log('Error checking stored credentials', error);
      }
    };

    checkStoredCredentials();
  }, []);


  const handleLogin = async () => {
    // Save credentials in AsyncStorage for future sessions
    try {
      await AsyncStorage.setItem('accessKey', accessKey);
      await AsyncStorage.setItem('secretKey', secretKey);
      navigation.navigate('BucketList', { accessKey, secretKey });
    } catch (error) {
      console.log('Error saving credentials', error);
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Enter AWS Credentials</Text>
      <TextInput
        placeholder="Access Key"
        value={accessKey}
        onChangeText={setAccessKey}
        style={styles.input}
      />
      <TextInput
        placeholder="Secret Key"
        value={secretKey}
        onChangeText={setSecretKey}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Login" style={styles.loginButton} onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 40,
    marginTop: 180,
    marginBottom: 30,
    textAlign: "center"
  },
  input: {
    height: 43,
    fontSize: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 20,
    backgroundColor: '#fafafa',
    borderColor: '#eaeaea',
    paddingLeft: 10,
    marginTop: 5,
    marginBottom: 5,
  },
  loginButton: {
    backgroundColor: "#3897f1",
    borderRadius: 5,
    height: 45,
    marginTop: 10,
    width: 350,
    alignItems: "center",
    fontSize: 26,
    color: "#fff"
  },
})
