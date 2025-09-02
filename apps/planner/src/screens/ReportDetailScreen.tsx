import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type ReportDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'ReportDetail'
>;

type ReportDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ReportDetail'
>;

interface ReportDetailScreenProps {
  route: ReportDetailScreenRouteProp;
  navigation: ReportDetailScreenNavigationProp;
}

const ReportDetailScreen = ({ route, navigation }: ReportDetailScreenProps) => {
  const { reportId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>보고서 상세</Text>
      <Text style={styles.subtitle}>보고서 ID: {reportId}</Text>
      <Text style={styles.description}>
        이 화면에서는 보고서의 상세 내용을 확인할 수 있습니다. 차트, 통계, 분석 결과 등이 표시됩니다.
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

export default ReportDetailScreen;