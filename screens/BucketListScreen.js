import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import AWS from 'aws-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome icons

const Tab = createMaterialTopTabNavigator();

export default function BucketListScreen({ route, navigation }) {
  const { accessKey, secretKey } = route.params;
  const [buckets, setBuckets] = useState([]);
  const [favorites, setFavorites] = useState([]); // To store favorite buckets
  const [recentlyOpened, setRecentlyOpened] = useState([]); // To store recently opened buckets
  const [searchQuery, setSearchQuery] = useState(''); // Search query

  useEffect(() => {
    const s3 = new AWS.S3({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: 'us-east-1',
    });

    s3.listBuckets((err, data) => {
      if (err) {
        console.log('Error fetching buckets', err);
      } else {
        setBuckets(data.Buckets);
        console.log(data.Buckets)
      }
    });
    loadFavoriteBuckets(); // Load favorites from AsyncStorage
    loadRecentlyOpenedBuckets(); // Load recently opened from AsyncStorage
  }, []);

  const handleBucketClick = (bucket) => {
    setRecentlyOpened((prev) => {
      if (prev.includes(bucket)) return prev; // Avoid duplicates
      return [bucket, ...prev.slice(0, 4)]; // Keep max 5 recent buckets
    });
    navigation.navigate('FolderList', {
      bucketName: bucket.Name,
      accessKey,
      secretKey,
    });
  };

  const saveFavoriteBuckets = async (buckets) => {
    try {
      await AsyncStorage.setItem('favoriteBuckets', JSON.stringify(buckets));
    } catch (err) {
      console.error('Failed to save favorite buckets to storage', err);
    }
  };

  // Load favorites from AsyncStorage
  const loadFavoriteBuckets = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favoriteBuckets');
      if (storedFavorites !== null) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (err) {
      console.error('Failed to load favorite buckets from storage', err);
    }
  };

  // Save recently opened buckets to AsyncStorage
  const saveRecentlyOpenedBuckets = async (buckets) => {
    try {
      await AsyncStorage.setItem('recentlyOpenedBuckets', JSON.stringify(buckets));
    } catch (err) {
      console.error('Failed to save recently opened buckets to storage', err);
    }
  };

  // Load recently opened buckets from AsyncStorage
  const loadRecentlyOpenedBuckets = async () => {
    try {
      const storedRecentlyOpened = await AsyncStorage.getItem('recentlyOpenedBuckets');
      if (storedRecentlyOpened !== null) {
        setRecentlyOpened(JSON.parse(storedRecentlyOpened));
      }
    } catch (err) {
      console.error('Failed to load recently opened buckets from storage', err);
    }
  };
  const toggleFavorite = (bucket) => {
    setFavorites((prev) => {
      const updatedFavorites = prev.includes(bucket)
        ? prev.filter((fav) => fav !== bucket)
        : [...prev, bucket];
      saveFavoriteBuckets(updatedFavorites); // Save to storage
      return updatedFavorites;
    });
  };



  const renderBucketItem = ({ item }) => (
    <View style={styles.bucketItem}>
      <TouchableOpacity onPress={() => handleBucketClick(item)}>
        <Text style={styles.bucketName}>{item.Name}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => toggleFavorite(item)}>
        <Icon
          name={favorites.some((fav) => fav.Name === item.Name) ? 'star' : 'star-o'} // Filled star if favorite, outlined otherwise
          size={24}
          color={favorites.some((fav) => fav.Name === item.Name) ? 'gold' : 'gray'} // Gold for favorite, gray otherwise
        />
      </TouchableOpacity>
    </View>
  );

  const renderBuckets = (bucketsToRender) => (
    <FlatList
      data={bucketsToRender}
      keyExtractor={(item) => item.Name}
      renderItem={renderBucketItem}
    />
  );


  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search buckets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#888" // Lighter placeholder color
        />
      </View>

      <Tab.Navigator>
        {/* All Buckets Tab */}
        <Tab.Screen name="All Buckets">
          {() => renderBuckets(
            buckets.filter((bucket) => bucket.Name.toLowerCase().includes(searchQuery.toLowerCase()))
          )}
        </Tab.Screen>

        {/* Recently Opened Buckets Tab */}
        <Tab.Screen name="Recent">
          {() => renderBuckets(recentlyOpened)}
        </Tab.Screen>

        {/* Favorite Buckets Tab */}
        <Tab.Screen name="Favorites">
          {() => renderBuckets(favorites)}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: '#f0f0f0',
    },
    list: {
      justifyContent: '',
    //   alignItems: '',
    },
    card: {
      backgroundColor: '#fff',
      padding: 20,
      marginVertical: 10,
      width: '100%',
      borderRadius: 10,
      elevation: 5,
      alignItems: '',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
    },
    bucketItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: '#fff',
      borderRadius: 5,
      marginVertical: 5,
    },
    bucketName: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 3, // Shadow for Android
      marginBottom: 10,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: '#333',
    },  
  });
  