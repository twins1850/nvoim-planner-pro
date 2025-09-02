import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import FileUploadScreen from '../screens/FileUploadScreen';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import api from '../services/api';

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock route
const mockRoute = {
  params: {
    studentId: 'student123',
    studentName: '김학생',
  },
};

// Mock DocumentPicker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock FileSystem
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  uploadAsync: jest.fn(),
}));

// Mock API
jest.mock('../services/api', () => ({
  uploadLessonRecording: jest.fn(),
}));

describe('FileUploadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with student information', () => {
    render(<FileUploadScreen navigation={mockNavigation} route={mockRoute} />);
    
    expect(screen.getByText(/김학생/)).toBeTruthy();
    expect(screen.getByText('수업 녹화 파일 업로드')).toBeTruthy();
    expect(screen.getByText('파일 선택')).toBeTruthy();
  });

  it('allows selecting a video file', async () => {
    // Mock successful file selection
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      name: 'lesson_recording.mp4',
      uri: 'file:///path/to/lesson_recording.mp4',
      size: 15000000, // 15MB
      mimeType: 'video/mp4',
    });
    
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 15000000,
      isDirectory: false,
    });
    
    render(<FileUploadScreen navigation={mockNavigation} route={mockRoute} />);
    
    // Click the select file button
    fireEvent.press(screen.getByText('파일 선택'));
    
    // Wait for file selection to complete
    await waitFor(() => {
      expect(screen.getByText('lesson_recording.mp4')).toBeTruthy();
      expect(screen.getByText(/15 MB/)).toBeTruthy();
    });
    
    // Upload button should be enabled
    const uploadButton = screen.getByText('업로드');
    expect(uploadButton.props.disabled).toBeFalsy();
  });

  it('shows error for unsupported file types', async () => {
    // Mock selecting an unsupported file
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      name: 'document.pdf',
      uri: 'file:///path/to/document.pdf',
      size: 1000000,
      mimeType: 'application/pdf',
    });
    
    render(<FileUploadScreen navigation={mockNavigation} route={mockRoute} />);
    
    // Click the select file button
    fireEvent.press(screen.getByText('파일 선택'));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/지원되지 않는 파일 형식/)).toBeTruthy();
    });
    
    // Upload button should be disabled
    const uploadButton = screen.getByText('업로드');
    expect(uploadButton.props.disabled).toBeTruthy();
  });

  it('shows error for files exceeding size limit', async () => {
    // Mock selecting a file that's too large
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      name: 'large_video.mp4',
      uri: 'file:///path/to/large_video.mp4',
      size: 1000000000, // 1GB
      mimeType: 'video/mp4',
    });
    
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 1000000000,
      isDirectory: false,
    });
    
    render(<FileUploadScreen navigation={mockNavigation} route={mockRoute} />);
    
    // Click the select file button
    fireEvent.press(screen.getByText('파일 선택'));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/파일 크기가 너무 큽니다/)).toBeTruthy();
    });
    
    // Upload button should be disabled
    const uploadButton = screen.getByText('업로드');
    expect(uploadButton.props.disabled).toBeTruthy();
  });

  it('uploads file successfully', async () => {
    // Mock successful file selection
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      name: 'lesson_recording.mp4',
      uri: 'file:///path/to/lesson_recording.mp4',
      size: 15000000,
      mimeType: 'video/mp4',
    });
    
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 15000000,
      isDirectory: false,
    });
    
    // Mock successful upload
    (api.uploadLessonRecording as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        lessonId: 'lesson123',
        status: 'processing',
      },
    });
    
    render(<FileUploadScreen navigation={mockNavigation} route={mockRoute} />);
    
    // Select file
    fireEvent.press(screen.getByText('파일 선택'));
    
    await waitFor(() => {
      expect(screen.getByText('lesson_recording.mp4')).toBeTruthy();
    });
    
    // Upload file
    fireEvent.press(screen.getByText('업로드'));
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('업로드 중...')).toBeTruthy();
    });
    
    // Should navigate to lesson detail on success
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('LessonDetail', {
        lessonId: 'lesson123',
      });
    });
  });

  it('handles upload errors', async () => {
    // Mock successful file selection
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      name: 'lesson_recording.mp4',
      uri: 'file:///path/to/lesson_recording.mp4',
      size: 15000000,
      mimeType: 'video/mp4',
    });
    
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 15000000,
      isDirectory: false,
    });
    
    // Mock failed upload
    (api.uploadLessonRecording as jest.Mock).mockRejectedValue({
      message: '업로드 실패: 서버 오류',
    });
    
    render(<FileUploadScreen navigation={mockNavigation} route={mockRoute} />);
    
    // Select file
    fireEvent.press(screen.getByText('파일 선택'));
    
    await waitFor(() => {
      expect(screen.getByText('lesson_recording.mp4')).toBeTruthy();
    });
    
    // Upload file
    fireEvent.press(screen.getByText('업로드'));
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/업로드 실패/)).toBeTruthy();
    });
    
    // Should not navigate
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});