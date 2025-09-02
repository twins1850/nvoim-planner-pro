import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type FileUploadScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'FileUpload'
>;

interface UploadFile {
  name: string;
  size: number;
  type: string;
  uri: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

const FileUploadScreen = () => {
  const navigation = useNavigation<FileUploadScreenNavigationProp>();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilePick = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.video],
        allowMultiSelection: true,
      });
      
      const newFiles = results.map((file: DocumentPickerResponse) => ({
        name: file.name || 'Unknown',
        size: file.size || 0,
        type: file.type || 'video/mp4',
        uri: file.uri,
        progress: 0,
        status: 'pending' as const,
      }));
      
      setFiles([...files, ...newFiles]);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
      } else {
        Alert.alert('Error', '파일을 선택하는 중 오류가 발생했습니다.');
      }
    }
  };

  const handleDrop = () => {
    // This would be implemented for web or desktop platforms
    // For mobile, we use DocumentPicker instead
    Alert.alert('알림', '모바일에서는 파일 선택 버튼을 사용해주세요.');
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      Alert.alert('알림', '업로드할 파일을 선택해주세요.');
      return;
    }

    setIsUploading(true);

    // Simulate file upload with progress
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'completed') {
        // Update file status to uploading
        const updatedFiles = [...files];
        updatedFiles[i] = { ...updatedFiles[i], status: 'uploading' };
        setFiles(updatedFiles);

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          const progressFiles = [...files];
          progressFiles[i] = { 
            ...progressFiles[i], 
            progress: progress / 100,
            status: progress < 100 ? 'uploading' : 'processing'
          };
          setFiles(progressFiles);
        }

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mark as completed
        const completedFiles = [...files];
        completedFiles[i] = { 
          ...completedFiles[i], 
          status: 'completed' 
        };
        setFiles(completedFiles);
      }
    }

    setIsUploading(false);
    
    // Show success message
    Alert.alert(
      '업로드 완료',
      '모든 파일이 성공적으로 업로드되었습니다. 음성 추출 및 분석이 진행됩니다.',
      [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'uploading':
        return '#3498db';
      case 'processing':
        return '#9b59b6';
      case 'completed':
        return '#2ecc71';
      case 'failed':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기 중';
      case 'uploading':
        return '업로드 중';
      case 'processing':
        return '처리 중';
      case 'completed':
        return '완료';
      case 'failed':
        return '실패';
      default:
        return '알 수 없음';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.dropZoneContainer}>
          <TouchableOpacity
            style={styles.dropZone}
            onPress={handleFilePick}
            disabled={isUploading}
          >
            <Icon name="upload" size={48} color="#4a6da7" />
            <Text style={styles.dropZoneText}>
              MP4 파일을 선택하거나 드래그하세요
            </Text>
            <Text style={styles.dropZoneSubtext}>
              최대 파일 크기: 90MB
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={handleFilePick}
              disabled={isUploading}
            >
              <Text style={styles.selectButtonText}>파일 선택</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {files.length > 0 && (
          <View style={styles.filesContainer}>
            <Text style={styles.sectionTitle}>선택된 파일</Text>
            {files.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Icon name="file-video" size={24} color="#4a6da7" />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                  </View>
                </View>
                <View style={styles.fileActions}>
                  {file.status !== 'completed' && file.status !== 'uploading' && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <Icon name="close" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                  <View style={styles.statusContainer}>
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(file.status) },
                      ]}
                    >
                      {getStatusText(file.status)}
                    </Text>
                  </View>
                </View>
                {(file.status === 'uploading' || file.status === 'processing') && (
                  <View style={styles.progressContainer}>
                    <Progress.Bar
                      progress={file.progress}
                      width={null}
                      color={getStatusColor(file.status)}
                      unfilledColor="#e0e0e0"
                      borderWidth={0}
                      height={4}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (files.length === 0 || isUploading) && styles.disabledButton,
          ]}
          onPress={uploadFiles}
          disabled={files.length === 0 || isUploading}
        >
          <Text style={styles.uploadButtonText}>
            {isUploading ? '업로드 중...' : '업로드 시작'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  dropZoneContainer: {
    padding: 16,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: '#4a6da7',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
  },
  dropZoneText: {
    fontSize: 16,
    color: '#333333',
    marginTop: 16,
    textAlign: 'center',
  },
  dropZoneSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: '#4a6da7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginTop: 16,
  },
  selectButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  filesContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  fileItem: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 12,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  fileSize: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  fileActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f8f9fa',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  uploadButton: {
    backgroundColor: '#4a6da7',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
});

export default FileUploadScreen;