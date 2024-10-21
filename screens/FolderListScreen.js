import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Button, StyleSheet, Alert, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import AWS from 'aws-sdk';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system'; // For file downloading
import * as Sharing from 'expo-sharing'; // For sharing/downloading files
import * as Permissions from 'expo-permissions';
import { Video } from 'expo-av'; // For playing mp4 videos
import Icon from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome icons

export default function FolderListScreen({ route }) {
  const { bucketName, accessKey, secretKey, path = '' } = route.params;
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [filteredData, setFilteredData] = useState([]); // Filtered folders and files
  const [imagePreview, setImagePreview] = useState(null); // To preview images
  const [videoUrl, setVideoUrl] = useState(null); // To play mp4 video
  const [videoUri, setVideoUri] = useState(null); // To play mp4 video
  const navigation = useNavigation();
  const scrollRef = useRef();
  const [loading, setLoading] = useState(false); // For showing the loading spinner
  const [nextMarker, setNextMarker] = useState(null); // For pagination (next batch of items)
  const [isLoadingMore, setIsLoadingMore] = useState(false); // Show loader when fetching more items
  const [hasMore, setHasMore] = useState(true); // Flag to check if more data is available



  const image_files = ["jpg", "jpeg", "png"];
  const binary_files = ["zip"];
  const utf8_files = ["zip", "csv", "txt"]

  useEffect(() => {
    console.log(`Current path is ${path}`)
    // Set the title as the full path
    navigation.setOptions({ title: bucketName });

    const s3 = new AWS.S3({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: 'us-east-1',
    });

    const listObjects = (folderPath) => {
      setLoading(true);
      const params = {
        Bucket: bucketName,
        Prefix: folderPath,
        Delimiter: '/',
        MaxKeys: 200, // Fetch 100 items at a time
      };

      s3.listObjectsV2(params, (err, data) => {
        if (err) {
          console.log('Error fetching folders', err);
          setLoading(false);
        } else {
          console.log(`Fetched ${data.Contents.length} files`)
          const fetchedFolders = data.CommonPrefixes.map((prefix) => prefix.Prefix);
          
          const fetchedFiles = data.Contents.filter((item) => item.Key !== folderPath); // Filter out current folder
  
          setFolders(fetchedFolders);
          setFiles(fetchedFiles);
          setFilteredData([...fetchedFolders, ...fetchedFiles]); 
          console.log(`data.NextContinuationToken is ${data.NextContinuationToken} / data.IsTruncated ${data.IsTruncated}`)
          console.log(`Last data is ${JSON.stringify(filteredData[filteredData.length-1])}`)
          setNextMarker(data.NextContinuationToken || null); // For fetching the next batch
          setHasMore(!!data.IsTruncated); // If there's more data to load
          setLoading(false);
          setIsLoadingMore(false); // Stop the loading indicator for more data
        }
      });
    };

    listObjects(path);
  }, [path]);

  useEffect(() => {
    const filterData = () => {
      const allData = [...folders, ...files];
      const filtered = allData.filter((item) => {
        const itemName = item.Key ? item.Key : item;
        return itemName.toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredData(filtered);
    };

    filterData();
  }, [searchQuery, folders, files]);

  const fetchObjects = (marker = null) => {
    if (!hasMore) return;

    setLoading(true);

    const s3 = new AWS.S3({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: 'us-east-1',
    });

    const params = {
      Bucket: bucketName,
      Prefix: path,
      Delimiter: '/',
      MaxKeys: 200, // Fetch 100 items at a time
      ContinuationToken: marker, // Used for pagination
    };
    console.log(`Fetching ${JSON.stringify(params)}`)

    s3.listObjectsV2(params, (err, data) => {
      if (err) {
        console.log('Error fetching objects', err);
        setLoading(false);
      } else {
        console.log(`Fetched ${data.Contents.length} files`)
        const fetchedFoldersRaw = data.CommonPrefixes.map((prefix) => prefix.Prefix);
        const fetchedFolders = fetchedFoldersRaw.filter(item => !folders.includes(item));
        const fetchedFilteredFolders = fetchedFoldersRaw.filter(item => !filteredData.includes(item));
        const fetchedFiles = data.Contents.filter((item) => item.Key !== path).filter(item => !files.includes(item))

        try {
          setFolders((prev) => [...prev, ...fetchedFolders]);
          setFiles((prev) => [...prev, ...fetchedFiles]);
          setFilteredData((prev) => [...prev, ...fetchedFilteredFolders, ...fetchedFiles]);
        } catch (e) {
          console.error(e);
        }
        console.log("Fetch done")
        setNextMarker(data.NextContinuationToken || null); // For fetching the next batch
        setHasMore(!!data.IsTruncated); // If there's more data to load
        setTimeout(() => {
          console.log("Loading done")
            setLoading(false);
            setIsLoadingMore(false); // Stop the loading indicator for more data
          }, 2000
        )
      }
    });
  };
  const handleFolderClick = (folder) => {
    const newPath = `${folder}`; // Update the path by adding the folder
    console.log(`Getting ${newPath}`)
    // Navigate to a new instance of FolderListScreen with updated path
    setSearchQuery("")
    navigation.navigate('FolderList', {
      bucketName,
      accessKey,
      secretKey,
      path: newPath,  // Pass the new folder path to the next screen

    });  
  };

  const handleFileClick = async (filename) => {
    console.log(`Getting ${filename}`)
    let extension = filename.split(".").pop()
    console.log(`Extension is ${extension}`)
    const s3 = new AWS.S3({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: 'us-east-1',
    });
    
    const params = {
      Bucket: bucketName,
      Key: filename,
    };
    
    const fileUri = FileSystem.documentDirectory + filename.split('/').pop(); // Use the file name from S3 Key
    
    try {
      console.log("Fetching")
      // Fetch the file as a blob
      const metadata = await s3.headObject(params).promise();
      console.log(metadata)
      const fileSizeMB = metadata.ContentLength / 1024 / 1024
      if (fileSizeMB > 5) {
        console.log(`Too heavy ${fileSizeMB}MB`)
      }
      if (metadata.ArchiveStatus === "ARCHIVE_ACCESS") {
        console.log("Archived file")
        Alert.alert('Error', `This file is in S3 Glacier Archive, so you cannot view.`);
        return
      }
      // console.log(fileData)
      console.log("Fetching done")
      // Create a temporary file path
      
      if (image_files.includes(extension)) {
        const fileData = await s3.getObject(params).promise();
        console.log(`${extension} is binary_files`)
        // Save the file to the local filesystem
        const binaryString = Array.from(new Uint8Array(fileData.Body), byte => String.fromCharCode(byte)).join("");
        // console.log(binaryString)
        await FileSystem.writeAsStringAsync(fileUri, fileData.Body.toString('base64'), {
          encoding: FileSystem.EncodingType.Base64,
        });
        setImagePreview(fileUri);
      } else if (binary_files.includes(extension)) {
        const fileData = await s3.getObject(params).promise();
        console.log(`${extension} is binary_files`)
        // Save the file to the local filesystem
        const binaryString = Array.from(new Uint8Array(fileData.Body), byte => String.fromCharCode(byte)).join("");
        // console.log(binaryString)
        await FileSystem.writeAsStringAsync(fileUri, fileData.Body.toString('base64'), {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Sharing.shareAsync(fileUri);      
      }else if (extension === 'mp4') {
        const signedUrlParams = {
          Bucket: bucketName,
          Key: filename,
          Expires: 60 * 10, // The signed URL will be valid for 10 minutes
        };
        const signedUrl = s3.getSignedUrl('getObject', signedUrlParams);
        console.log(`signedUrl is ${signedUrl}`)
        // Set the video URI to play
        setVideoUrl(signedUrl);
        try {
          const downloadResumable = FileSystem.createDownloadResumable(signedUrl, fileUri);
          const { uri } = await downloadResumable.resumeAsync();
          console.log('Finished downloading to ', uri);
          setVideoUri(uri);
        } catch (e) {
          console.error(e);
        }
      } else {
        console.log("Normal file")
        const fileData = await s3.getObject(params).promise();
        // Save the file to the local filesystem
        await FileSystem.writeAsStringAsync(fileUri, fileData.Body.toString('utf-8'), {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await Sharing.shareAsync(fileUri);      
      }

      // Prompt the user to download/share the file
      // await Sharing.shareAsync(fileUri);
      
      // Alert.alert('Success', `File downloaded successfully: ${fileUri}`);
    } catch (err) {
      console.log('Error downloading file', err);
      console.log(JSON.stringify(err))
      if (err.code === "InvalidObjectState") {
        Alert.alert('Error', 'This file is in deep archive.');
      } else {
        Alert.alert('Error', 'Failed to download file.');
      }
    }
  };

  const handleSaveClick = async () => {
    console.log("clicked")
    if (imagePreview) {
      console.log("image desu")
      await Sharing.shareAsync(imagePreview)
    } else if (videoUri) {
      console.log("video desu")
      await Sharing.shareAsync(videoUri)
    }
  }

  const handleBackClick = () => {
    if (path) {
      // Remove the last folder segment from the path
      const newPath = path.substring(0, path.lastIndexOf('/', path.length - 2) + 1);
      
      // Navigate to the previous folder
      navigation.navigate('FolderList', {
        bucketName,
        accessKey,
        secretKey,
        path: newPath,
      });
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && nextMarker) {
      console.log("Fetching more")
      setIsLoadingMore(true);
      fetchObjects(nextMarker); // Fetch the next 100 items
    }
  };


  const getIcon = (item) => {
    const extension = item.split(".").pop();
    let icon;
    switch (extension) {
      case "mp4":
        icon = "🎥"
        break;
      case "jpg":
      case "jpeg":
      case "png":
        icon = "🖼️"
        break;
      default:
        icon = "📄"
        break;
    }
    return icon;
  }


  const renderFolderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleFolderClick(item)}>
      <View style={styles.row}>
        <Text style={styles.emoji}>📁</Text>
        <Text style={styles.cardTitle}>{item.split("/")[item.split("/").length-2] + "/"}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFileItem = ( item ) => (
    <TouchableOpacity style={styles.card} onPress={() => handleFileClick(item)}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{getIcon(item)}</Text>
        <Text style={styles.cardTitle}>{item.split('/').pop()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {path != "" &&
        <View style={styles.header}>
            <TouchableOpacity onPress={handleBackClick} style={styles.backButton}>
              <Icon name="arrow-left" size={24} color="#333" />
            </TouchableOpacity>
          <Text style={styles.pathText}>
            {path}
          </Text>
        </View>
      }

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#888" // Lighter placeholder color
        />
      </View>
      <FlatList
        data={filteredData} // Combine folders and files
        keyExtractor={(item) => (item.Key ? item.Key : item)}
        renderItem={({ item }) => 
          item.Key ? renderFileItem( item.Key ) : renderFolderItem({ item })
        }
        // initialNumToRender={filteredData.length}
        contentContainerStyle={styles.list}
        ref={scrollRef}
        onEndReached={handleLoadMore} // Load more data when reaching the bottom
        onEndReachedThreshold={2} // Trigger load when halfway through the list
        ListFooterComponent={
          isLoadingMore ? <ActivityIndicator size="large" color="#0000ff" /> : null
        } // Show loading spinner at the bottom
      />
      {/* Modal for Image Preview */}
      {imagePreview && (
        <Modal visible={true} transparent={true}>
          <View style={styles.modalView}>
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
            <Button title="Save" onPress={() => handleSaveClick()} />
            <Button title="Close" onPress={() => setImagePreview(null)} />
          </View>
        </Modal>
      )}
      {/* Modal for Video Playback */}
      {videoUrl && (
        <Modal visible={true} transparent={true}>
          <View style={styles.modalView}>
            <Video
              source={{ uri: videoUrl }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="contain"
              shouldPlay
              useNativeControls
              style={styles.videoPlayer}
            />
            <Button title="Save" onPress={() => handleSaveClick()} />
            <Button title="Close" onPress={() => setVideoUrl(null)} />
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 5,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
  },
  list: {
    // justifyContent: 'center',
    // alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  pathText: {
    fontFamily: 'Consolas',
    fontSize: 10,
    marginLeft: 5,
    flexShrink: 1, // Make sure the path text doesn't overflow the screen
    color: '#333',
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
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    width: '90%',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
  },
  emoji: {
    fontSize: 13,
    width: '10%', // Ensure a fixed width for the emoji column
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 5,
  },
  imagePreview: {
    width: "100%",
    height: 500,
    resizeMode: 'contain',
  },
  videoPlayer: {
    width: 320,
    height: 240,
    backgroundColor: 'black',
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
  backButton: {
    marginRight: 10,
    padding: 5, // Adds padding for better touch area
  },
});
