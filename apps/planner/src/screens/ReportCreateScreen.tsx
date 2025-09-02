import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

type ReportCreateScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ReportCreate'
>;

interface ReportCreateScreenProps {
  navigation: ReportCreateScreenNavigationProp;
}

const ReportCreateScreen = ({ navigation }: ReportCreateScreenProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>보고서 생성</Text>
      <Text style={styles.description}>
        이 화면에서는 새로운 보고서를 생성할 수 있습니다. 보고서 유형, 기간, 포함할 데이터 등을 선택할 수 있습니다.
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
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default ReportCreateScreen;