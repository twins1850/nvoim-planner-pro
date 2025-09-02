import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type FeedbackReviewScreenRouteProp = RouteProp<
  RootStackParamList,
  'FeedbackReview'
>;

type FeedbackReviewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'FeedbackReview'
>;

interface FeedbackReviewScreenProps {
  route: FeedbackReviewScreenRouteProp;
  navigation: FeedbackReviewScreenNavigationProp;
}

const FeedbackReviewScreen = ({ route, navigation }: FeedbackReviewScreenProps) => {
  const { submissionId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>피드백 검토</Text>
      <Text style={styles.subtitle}>제출 ID: {submissionId}</Text>
      <Text style={styles.description}>
        이 화면에서는 학생의 숙제 제출물에 대한 AI 평가 결과를 검토하고 최종 피드백을 제공할 수 있습니다.
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

export default FeedbackReviewScreen;