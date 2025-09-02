import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type HomeworkDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'HomeworkDetail'
>;

type HomeworkDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HomeworkDetail'
>;

interface HomeworkDetailScreenProps {
  route: HomeworkDetailScreenRouteProp;
  navigation: HomeworkDetailScreenNavigationProp;
}

const HomeworkDetailScreen = ({ route, navigation }: HomeworkDetailScreenProps) => {
  const { homeworkId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>숙제 상세 정보</Text>
      <Text style={styles.subtitle}>숙제 ID: {homeworkId}</Text>
      <Text style={styles.description}>
        이 화면은 숙제 상세 정보를 표시합니다. 숙제 내용, 제출 현황, 평가 결과 등을 확인할 수 있습니다.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default HomeworkDetailScreen;